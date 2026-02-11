/**
 * Cache Manager
 * مدیریت cache فایل‌های media (video/image) به صورت persistent
 * حتی بعد از 1 هفته offline، cache باقی می‌ماند
 */
import RNFS from 'react-native-fs';
import AsyncStorage from '@react-native-async-storage/async-storage';

// استفاده از DocumentDirectory برای persistent storage (نه CacheDirectory)
const CACHE_ROOT = RNFS.DocumentDirectoryPath + '/media-cache';
const METADATA_KEY = '@media_cache_metadata';
const BACKUP_METADATA_KEY = '@media_cache_metadata_backup';

// Cache size limits
const MAX_CACHE_SIZE = 5 * 1024 * 1024 * 1024; // 5GB
const WARNING_CACHE_SIZE = 4 * 1024 * 1024 * 1024; // 4GB - شروع cleanup
const MIN_FREE_SPACE = 500 * 1024 * 1024; // 500MB minimum free space

// Download timeout (5 minutes)
const DOWNLOAD_TIMEOUT = 5 * 60 * 1000;

export interface CacheEntry {
    url: string;
    localPath: string;
    type: 'video' | 'image';
    updated_at: string;
    cached_at: number;
    size: number;
    contentId: string;
    verified: boolean;
}

export interface DownloadProgress {
    bytesWritten: number;
    contentLength: number;
    percentage: number;
}

class CacheManager {
    private metadata: Map<string, CacheEntry> = new Map();
    private isInitialized = false;
    private activeDownloads: Map<string, { jobId: number; startTime: number }> = new Map();

    /**
     * Initialize cache system
     * - ساخت directories
     * - لود metadata از AsyncStorage
     * - Verify تمام cached files
     */
    async initialize(): Promise<void> {
        if (this.isInitialized) {
            console.log('[Cache] Already initialized');
            return;
        }

        console.log('[Cache] Initializing...');

        try {
            // 1. ساخت cache directories
            const exists = await RNFS.exists(CACHE_ROOT);
            if (!exists) {
                console.log('[Cache] Creating cache directories...');
                await RNFS.mkdir(CACHE_ROOT);
                await RNFS.mkdir(`${CACHE_ROOT}/videos`);
                await RNFS.mkdir(`${CACHE_ROOT}/images`);
            }

            // 2. لود metadata از AsyncStorage با recovery mechanism
            const stored = await AsyncStorage.getItem(METADATA_KEY);
            if (stored) {
                try {
                    const parsed = JSON.parse(stored);
                    // Validate metadata structure
                    if (parsed && typeof parsed === 'object') {
                        this.metadata = new Map(Object.entries(parsed));
                        console.log(`[Cache] Loaded ${this.metadata.size} entries from metadata`);
                        // Backup metadata
                        await AsyncStorage.setItem(BACKUP_METADATA_KEY, stored);
                    } else {
                        throw new Error('Invalid metadata structure');
                    }
                } catch (parseError) {
                    console.error('[Cache] Metadata corrupted, trying backup...', parseError);
                    // Try backup
                    const backup = await AsyncStorage.getItem(BACKUP_METADATA_KEY);
                    if (backup) {
                        try {
                            const parsed = JSON.parse(backup);
                            this.metadata = new Map(Object.entries(parsed));
                            console.log(`[Cache] Loaded ${this.metadata.size} entries from backup`);
                            // Restore from backup
                            await AsyncStorage.setItem(METADATA_KEY, backup);
                        } catch (backupError) {
                            console.error('[Cache] Backup also corrupted, resetting metadata', backupError);
                            this.metadata = new Map();
                            await this.saveMetadata();
                        }
                    } else {
                        console.error('[Cache] No backup available, resetting metadata');
                        this.metadata = new Map();
                        await this.saveMetadata();
                    }
                }
            }

            // 3. Verify تمام cached files
            await this.verifyCache();

            // 4. Check cache size و cleanup اگر لازم باشه
            await this.ensureCacheSize();

            this.isInitialized = true;
            console.log('[Cache] Initialization complete');
        } catch (error) {
            console.error('[Cache] Initialization error:', error);
            throw error;
        }
    }

    /**
     * Verify cached files exist on disk
     * حذف entries برای فایل‌هایی که دیگر وجود ندارند
     */
    private async verifyCache(): Promise<void> {
        const toRemove: string[] = [];

        for (const [url, entry] of this.metadata) {
            const exists = await RNFS.exists(entry.localPath);
            if (!exists) {
                console.log(`[Cache] File missing: ${entry.localPath}`);
                toRemove.push(url);
            } else {
                entry.verified = true;
            }
        }

        // Remove missing entries
        if (toRemove.length > 0) {
            console.log(`[Cache] Removing ${toRemove.length} missing entries`);
            toRemove.forEach((url) => this.metadata.delete(url));
            await this.saveMetadata();
        }
    }

    /**
     * Save metadata to AsyncStorage با error handling
     */
    private async saveMetadata(): Promise<void> {
        try {
            const obj = Object.fromEntries(this.metadata);
            const serialized = JSON.stringify(obj);
            
            // Check AsyncStorage size (rough estimate)
            const sizeEstimate = serialized.length;
            if (sizeEstimate > 2 * 1024 * 1024) { // بیش از 2MB
                console.warn('[Cache] Metadata size is large, consider cleanup');
            }
            
            // Save main metadata
            await AsyncStorage.setItem(METADATA_KEY, serialized);
            
            // Save backup
            try {
                await AsyncStorage.setItem(BACKUP_METADATA_KEY, serialized);
            } catch (backupError) {
                console.warn('[Cache] Could not save backup metadata:', backupError);
            }
            
            console.log(`[Cache] Metadata saved (${this.metadata.size} entries)`);
        } catch (error: any) {
            // اگر storage full باشه
            if (error?.message?.includes('quota') || error?.message?.includes('full')) {
                console.error('[Cache] Storage full, cleaning up old cache...');
                await this.cleanupOldCache(0.3); // حذف 30% قدیمی‌ترین فایل‌ها
                // Retry
                try {
                    const obj = Object.fromEntries(this.metadata);
                    await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(obj));
                } catch (retryError) {
                    console.error('[Cache] Still cannot save metadata after cleanup:', retryError);
                }
            } else {
                console.error('[Cache] Error saving metadata:', error);
            }
        }
    }

    /**
     * Download and cache a file
     */
    async cacheFile(url: string, type: 'video' | 'image', contentId: string, updated_at?: string, onProgress?: (progress: DownloadProgress) => void): Promise<string> {
        updated_at = updated_at || new Date().toISOString();
        if (!this.isInitialized) {
            await this.initialize();
        }

        // Check if already cached and up-to-date
        const existing = this.metadata.get(url);
        if (existing && existing.updated_at === updated_at && existing.verified) {
            console.log(`[Cache] File already cached: ${contentId}`);
            return existing.localPath;
        }

        console.log(`[Cache] Downloading: ${url}`);

        // Generate local path
        const extension = this.getFileExtension(url);
        const timestamp = Date.now();
        const filename = `${contentId}_${timestamp}.${extension}`;
        const localPath = `${CACHE_ROOT}/${type}s/${filename}`;

        // Check available space قبل از دانلود
        try {
            const freeSpace = await this.getFreeSpace();
            if (freeSpace < MIN_FREE_SPACE) {
                console.warn('[Cache] Low free space, cleaning up cache...');
                await this.ensureCacheSize();
            }
        } catch (spaceError) {
            console.warn('[Cache] Could not check free space:', spaceError);
        }

        // Create timeout promise
        const timeoutPromise = new Promise<never>((_, reject) => {
            setTimeout(() => {
                reject(new Error(`Download timeout after ${DOWNLOAD_TIMEOUT}ms`));
            }, DOWNLOAD_TIMEOUT);
        });

        try {
            // Download file with progress
            const download = RNFS.downloadFile({
                fromUrl: url,
                toFile: localPath,
                progress: (res) => {
                    const percentage = res.contentLength > 0 ? (res.bytesWritten / res.contentLength) * 100 : 0;

                    onProgress?.({
                        bytesWritten: res.bytesWritten,
                        contentLength: res.contentLength,
                        percentage,
                    });
                },
                progressInterval: 500,
            });

            // Track active download
            const downloadStartTime = Date.now();
            this.activeDownloads.set(url, { jobId: download.jobId, startTime: downloadStartTime });

            // Race between download and timeout
            const result = await Promise.race([download.promise, timeoutPromise]);
            
            // Remove from active downloads
            this.activeDownloads.delete(url);

            if (result.statusCode === 200) {
                // Get file size
                let fileSize = 0;
                try {
                    const stat = await RNFS.stat(localPath);
                    fileSize = parseInt(String(stat.size || 0));
                } catch (statError) {
                    console.warn('[Cache] Could not get file size:', statError);
                }

                // Check if adding this file would exceed cache limit
                const currentSize = await this.getCacheSize();
                if (currentSize + fileSize > MAX_CACHE_SIZE) {
                    console.warn('[Cache] Cache size limit reached, cleaning up...');
                    const spaceNeeded = currentSize + fileSize - MAX_CACHE_SIZE;
                    await this.cleanupOldCache(spaceNeeded);
                }

                // Save to metadata
                const entry: CacheEntry = {
                    url,
                    localPath,
                    type,
                    updated_at,
                    cached_at: Date.now(),
                    size: fileSize,
                    contentId,
                    verified: true,
                };

                this.metadata.set(url, entry);
                await this.saveMetadata();

                // Clean up old version if exists
                if (existing && existing.localPath && existing.localPath !== localPath) {
                    await RNFS.unlink(existing.localPath).catch(() => {
                        console.log('[Cache] Old file already deleted or missing');
                    });
                }

                console.log(`[Cache] Downloaded: ${filename} (${this.formatBytes(fileSize)})`);
                return localPath;
            } else {
                // Clean up failed download file
                await RNFS.unlink(localPath).catch(() => {});
                throw new Error(`Download failed with status: ${result.statusCode}`);
            }
        } catch (error: any) {
            // Clean up failed download file
            await RNFS.unlink(localPath).catch(() => {});
            this.activeDownloads.delete(url);
            
            // Handle specific errors
            if (error?.message?.includes('timeout')) {
                console.error(`[Cache] Download timeout for ${url}`);
                throw new Error(`Download timeout: ${url}`);
            } else if (error?.message?.includes('ENOSPC') || error?.message?.includes('No space')) {
                console.error(`[Cache] Storage full, cleaning up...`);
                await this.ensureCacheSize();
                throw new Error(`Storage full: ${url}`);
            } else {
                console.error(`[Cache] Error downloading ${url}:`, error);
                throw error;
            }
        }
    }

    /**
     * Get cached file path
     */
    getCachedPath(url: string): string | null {
        const entry = this.metadata.get(url);
        return entry?.verified ? entry.localPath : null;
    }

    /**
     * Check if file needs update
     */
    needsUpdate(url: string, updated_at: string): boolean {
        const entry = this.metadata.get(url);
        if (!entry || !entry.verified) return true;
        return entry.updated_at !== updated_at;
    }

    /**
     * Get total cache size
     */
    async getCacheSize(): Promise<number> {
        let totalSize = 0;
        for (const entry of this.metadata.values()) {
            totalSize += entry.size;
        }
        return totalSize;
    }

    /**
     * Clear all cache
     */
    async clearCache(): Promise<void> {
        console.log('[Cache] Clearing cache...');

        try {
            // Delete cache directory
            await RNFS.unlink(CACHE_ROOT).catch(() => {
                console.log('[Cache] Cache directory not found or already deleted');
            });

            // Recreate directories
            await RNFS.mkdir(CACHE_ROOT);
            await RNFS.mkdir(`${CACHE_ROOT}/videos`);
            await RNFS.mkdir(`${CACHE_ROOT}/images`);

            // Clear metadata
            this.metadata.clear();
            await this.saveMetadata();

            console.log('[Cache] Cache cleared successfully');
        } catch (error) {
            console.error('[Cache] Error clearing cache:', error);
            throw error;
        }
    }

    /**
     * Get file extension from URL
     */
    private getFileExtension(url: string): string {
        const extension = url.split('.').pop()?.split('?')[0] || 'bin';
        return extension;
    }

    /**
     * Format bytes to human readable
     */
    private formatBytes(bytes: number): string {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
    }

    /**
     * Get cache statistics
     */
    async getStats() {
        const totalSize = await this.getCacheSize();
        const totalFiles = this.metadata.size;
        let videoCount = 0;
        let imageCount = 0;

        for (const entry of this.metadata.values()) {
            if (entry.type === 'video') videoCount++;
            else imageCount++;
        }

        return {
            totalFiles,
            videoCount,
            imageCount,
            totalSize,
            totalSizeFormatted: this.formatBytes(totalSize),
        };
    }

    /**
     * Get free space on device
     */
    private async getFreeSpace(): Promise<number> {
        try {
            // react-native-fs ممکنه getFSInfo نداشته باشه، پس try-catch میکنیم
            if (typeof RNFS.getFSInfo === 'function') {
                const stat = await RNFS.getFSInfo();
                return stat?.freeSpace || 0;
            } else {
                // Fallback: اگر getFSInfo موجود نیست، از cache size استفاده کن
                const currentSize = await this.getCacheSize();
                // Assume we have at least 1GB free if cache is less than 4GB
                return currentSize < 4 * 1024 * 1024 * 1024 ? 1024 * 1024 * 1024 : 0;
            }
        } catch (error) {
            console.warn('[Cache] Could not get free space:', error);
            // Fallback: check cache size
            try {
                const currentSize = await this.getCacheSize();
                return currentSize < 4 * 1024 * 1024 * 1024 ? 1024 * 1024 * 1024 : 0;
            } catch {
                return Infinity; // Assume enough space if we can't check
            }
        }
    }

    /**
     * Cleanup old cache entries (LRU - Least Recently Used)
     * @param spaceNeeded - فضای مورد نیاز به بایت (اگر 0 باشه، تا warning size cleanup میکنه)
     */
    private async cleanupOldCache(spaceNeeded: number = 0): Promise<void> {
        console.log(`[Cache] Starting cleanup, space needed: ${this.formatBytes(spaceNeeded)}`);
        
        // Sort entries by cached_at (oldest first)
        const entries = Array.from(this.metadata.entries())
            .map(([url, entry]) => ({ url, entry }))
            .sort((a, b) => a.entry.cached_at - b.entry.cached_at);

        let freedSpace = 0;
        const targetSpace = spaceNeeded > 0 ? spaceNeeded : (await this.getCacheSize()) - WARNING_CACHE_SIZE;
        const toRemove: string[] = [];

        for (const { url, entry } of entries) {
            if (freedSpace >= targetSpace) break;

            try {
                // Delete file
                await RNFS.unlink(entry.localPath);
                freedSpace += entry.size;
                toRemove.push(url);
                console.log(`[Cache] Removed old file: ${entry.contentId} (${this.formatBytes(entry.size)})`);
            } catch (error) {
                console.warn(`[Cache] Could not remove file ${entry.localPath}:`, error);
                // Still remove from metadata
                toRemove.push(url);
            }
        }

        // Remove from metadata
        toRemove.forEach((url) => this.metadata.delete(url));
        
        if (toRemove.length > 0) {
            await this.saveMetadata();
            console.log(`[Cache] Cleanup complete: removed ${toRemove.length} files, freed ${this.formatBytes(freedSpace)}`);
        }
    }

    /**
     * Ensure cache size is within limits
     */
    private async ensureCacheSize(): Promise<void> {
        const currentSize = await this.getCacheSize();
        
        if (currentSize > WARNING_CACHE_SIZE) {
            console.log(`[Cache] Cache size (${this.formatBytes(currentSize)}) exceeds warning threshold, cleaning up...`);
            await this.cleanupOldCache();
        }
    }

    /**
     * Cancel active download
     */
    async cancelDownload(url: string): Promise<void> {
        const active = this.activeDownloads.get(url);
        if (active) {
            try {
                await RNFS.stopDownload(active.jobId);
                this.activeDownloads.delete(url);
                console.log(`[Cache] Cancelled download: ${url}`);
            } catch (error) {
                console.warn(`[Cache] Could not cancel download: ${url}`, error);
            }
        }
    }
}

export const cacheManager = new CacheManager();
