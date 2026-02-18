/**
 * Hook برای مانیتورینگ real-time سیستم (RAM، CPU، FPS، Cache، Network)
 * به‌روزرسانی هر ۱ ثانیه
 * استفاده از react-native-performance-stats برای دقت بیشتر
 */
import { useEffect, useState, useRef, useCallback } from "react";
import { performanceMonitor } from "@/src/utils/performanceMonitor";
import type { MemoryUsage } from "@/src/utils/performanceMonitor";
import { cacheManager } from "@/src/utils/cache/cacheManager";
import { useOnlineStatus } from "@/src/hooks/use-online-status";

const UPDATE_INTERVAL_MS = 1000;

export interface CacheStats {
    totalFiles: number;
    videoCount: number;
    imageCount: number;
    totalSize: number;
    totalSizeFormatted: string;
}

export interface SystemMonitorSnapshot {
    memory: MemoryUsage | null;
    cpuPercent: number | null;
    fps: number;
    cache: CacheStats | null;
    isOnline: boolean;
    connectionType: string;
}

export function useSystemMonitor(enabled: boolean = true) {
    const { isOnline, connectionType } = useOnlineStatus();
    const [snapshot, setSnapshot] = useState<SystemMonitorSnapshot>({
        memory: null,
        cpuPercent: null,
        fps: 0,
        cache: null,
        isOnline,
        connectionType,
    });
    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    const tick = useCallback(async () => {
        const memory = performanceMonitor.getMemoryUsage();
        const cpuPercent = performanceMonitor.getCpuUsage();
        const fps = performanceMonitor.getFps();

        let cache: CacheStats | null = null;
        try {
            const stats = await cacheManager.getStats();
            cache = {
                totalFiles: stats.totalFiles,
                videoCount: stats.videoCount,
                imageCount: stats.imageCount,
                totalSize: stats.totalSize,
                totalSizeFormatted: stats.totalSizeFormatted,
            };
        } catch {
            // ignore
        }

        setSnapshot({
            memory,
            cpuPercent,
            fps,
            cache,
            isOnline,
            connectionType,
        });
    }, [isOnline, connectionType]);

    useEffect(() => {
        if (!enabled) {
            // Stop monitoring when disabled
            performanceMonitor.stop();
            return;
        }

        // Start native performance monitoring (with CPU tracking)
        performanceMonitor.start(true);

        // Initial tick
        tick();

        // Update every second
        intervalRef.current = setInterval(tick, UPDATE_INTERVAL_MS);

        return () => {
            if (intervalRef.current !== null) {
                clearInterval(intervalRef.current);
                intervalRef.current = null;
            }
            // Stop monitoring when component unmounts or disabled
            performanceMonitor.stop();
        };
    }, [enabled, tick]);

    return snapshot;
}
