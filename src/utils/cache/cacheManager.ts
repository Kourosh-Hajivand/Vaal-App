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

            // 2. لود metadata از AsyncStorage
            const stored = await AsyncStorage.getItem(METADATA_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                this.metadata = new Map(Object.entries(parsed));
                console.log(`[Cache] Loaded ${this.metadata.size} entries from metadata`);
            }

            // 3. Verify تمام cached files
            await this.verifyCache();

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
     * Save metadata to AsyncStorage
     */
    private async saveMetadata(): Promise<void> {
        try {
            const obj = Object.fromEntries(this.metadata);
            await AsyncStorage.setItem(METADATA_KEY, JSON.stringify(obj));
            console.log(`[Cache] Metadata saved (${this.metadata.size} entries)`);
        } catch (error) {
            console.error('[Cache] Error saving metadata:', error);
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

            const result = await download.promise;

            if (result.statusCode === 200) {
                // Get file size
                let fileSize = 0;
                try {
                    const stat = await RNFS.stat(localPath);
                    fileSize = parseInt(String(stat.size || 0));
                } catch (statError) {
                    console.warn('[Cache] Could not get file size:', statError);
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
                throw new Error(`Download failed with status: ${result.statusCode}`);
            }
        } catch (error) {
            console.error(`[Cache] Error downloading ${url}:`, error);
            throw error;
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
}

export const cacheManager = new CacheManager();
