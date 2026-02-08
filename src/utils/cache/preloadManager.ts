/**
 * Preload Manager
 * مدیریت preload کردن playlist items در background
 */
import { cacheManager } from "./cacheManager";
import type { ContentItemResource } from "@/src/types/api.types";

export interface PreloadProgress {
    total: number;
    completed: number;
    current: string | null;
    percentage: number;
    failed: number;
}

class PreloadManager {
    private isPreloading = false;
    private progress: PreloadProgress = {
        total: 0,
        completed: 0,
        current: null,
        percentage: 0,
        failed: 0,
    };
    private onProgressCallbacks: Array<(progress: PreloadProgress) => void> = [];

    /**
     * Start preloading all playlist items
     */
    async preloadPlaylist(items: ContentItemResource[]): Promise<void> {
        if (this.isPreloading) {
            console.log("[Preload] Already preloading");
            return;
        }

        this.isPreloading = true;
        this.progress = {
            total: items.length,
            completed: 0,
            current: null,
            percentage: 0,
            failed: 0,
        };

        console.log(`[Preload] Starting preload of ${items.length} items`);

        for (let i = 0; i < items.length; i++) {
            const item = items[i];
            this.progress.current = item.title || `Item ${i + 1}`;
            this.notifyProgress();

            try {
                // Get URL from file_url
                const url = item.file_url;
                if (!url) {
                    console.warn(`[Preload] No URL for ${item.title}, skipping`);
                    this.progress.failed++;
                    this.progress.completed++;
                    continue;
                }

                // Check if needs update
                const needsUpdate = cacheManager.needsUpdate(url, item.updated_at);

                if (needsUpdate) {
                    console.log(`[Preload] Downloading: ${item.title} (${item.type})`);
                    await cacheManager.cacheFile(url, item.type === "video" ? "video" : "image", item.id.toString(), item.updated_at);
                } else {
                    console.log(`[Preload] Skipping (cached): ${item.title}`);
                }

                this.progress.completed++;
            } catch (error) {
                console.error(`[Preload] Error preloading ${item.title}:`, error);
                this.progress.failed++;
                this.progress.completed++;
            }

            this.progress.percentage = (this.progress.completed / this.progress.total) * 100;
            this.notifyProgress();
        }

        this.progress.current = null;
        this.isPreloading = false;
        console.log(`[Preload] Complete: ${this.progress.completed}/${this.progress.total} (${this.progress.failed} failed)`);
    }

    /**
     * Subscribe to progress updates
     */
    onProgress(callback: (progress: PreloadProgress) => void): () => void {
        this.onProgressCallbacks.push(callback);

        // Return unsubscribe function
        return () => {
            this.onProgressCallbacks = this.onProgressCallbacks.filter((cb) => cb !== callback);
        };
    }

    /**
     * Notify all subscribers of progress
     */
    private notifyProgress(): void {
        this.onProgressCallbacks.forEach((cb) => cb({ ...this.progress }));
    }

    /**
     * Get current progress
     */
    getProgress(): PreloadProgress {
        return { ...this.progress };
    }

    /**
     * Check if currently preloading
     */
    isActive(): boolean {
        return this.isPreloading;
    }
}

export const preloadManager = new PreloadManager();
