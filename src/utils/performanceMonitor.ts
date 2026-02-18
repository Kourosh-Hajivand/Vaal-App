import { Platform } from "react-native";
import * as Device from "expo-device";
import PerformanceStats, { type PerformanceStatsData } from "react-native-performance-stats";

export interface MemoryUsage {
    usedMB: number;
    totalMB: number;
    limitMB: number;
    usedStr: string;
    totalStr: string;
    limitStr: string;
    /** 0–100 percentage of limit used */
    percentOfLimit: number;
}

export interface CpuSample {
    usagePercent: number | null;
}

class PerformanceMonitor {
    private logs: Array<{ timestamp: number; message: string; data?: unknown }> = [];
    private statsListener: { remove: () => void } | null = null;
    private currentStats: PerformanceStatsData | null = null;
    private isStarted = false;

    log(message: string, data?: unknown) {
        const log = {
            timestamp: Date.now(),
            message,
            data,
        };
        this.logs.push(log);
        console.log(`[PERF] ${message}`, data ?? "");

        if (this.logs.length > 100) {
            this.logs.shift();
        }
    }

    /**
     * Start performance monitoring (using react-native-performance-stats)
     * @param trackCpu - اگر true باشد، CPU هم track می‌شود (کمی overhead دارد)
     */
    start(trackCpu: boolean = true) {
        if (this.isStarted) return;

        try {
            // Start native performance stats
            PerformanceStats.start(trackCpu);

            // Listen to stats updates
            this.statsListener = PerformanceStats.addListener((stats: PerformanceStatsData) => {
                this.currentStats = stats;
            });

            this.isStarted = true;
            this.log("Performance monitoring started", { trackCpu });
        } catch (error) {
            console.warn("[PERF] Failed to start performance stats:", error);
            // Fallback to manual methods if package not available
        }
    }

    stop() {
        if (!this.isStarted) return;

        try {
            if (this.statsListener) {
                this.statsListener.remove();
                this.statsListener = null;
            }
            PerformanceStats.stop();
            this.isStarted = false;
            this.currentStats = null;
            this.log("Performance monitoring stopped");
        } catch (error) {
            console.warn("[PERF] Failed to stop performance stats:", error);
        }
    }

    /**
     * مقدار limit واقعی دستگاه را برمی‌گرداند (MB).
     * اولویت: totalMemory (expo-device) > jsHeapSizeLimit (V8) > fallback
     */
    private getDeviceMemoryLimitMB(): number | null {
        // کل RAM دستگاه (واقعی از expo-device)
        if (Device.totalMemory != null && Device.totalMemory > 0) {
            return Device.totalMemory / 1048576;
        }
        // Fallback: jsHeapSizeLimit فقط روی Android در دسترس است
        if (Platform.OS === "android" && (global as unknown as { performance?: { memory?: { jsHeapSizeLimit: number } } }).performance?.memory) {
            const jsMemory = (global as unknown as { performance: { memory: { jsHeapSizeLimit: number } } }).performance.memory;
            return jsMemory.jsHeapSizeLimit / 1048576;
        }
        return null;
    }

    /**
     * Memory usage از native stats (دقیق‌تر) یا JS heap.
     * limit = کل RAM واقعی دستگاه (expo-device) یا heap limit.
     */
    getMemoryUsage(): MemoryUsage | null {
        const limitMB = this.getDeviceMemoryLimitMB() ?? null;

        // اول از native stats استفاده کن (usedRam = PSS از native)
        if (this.currentStats?.usedRam !== undefined) {
            const usedMB = this.currentStats.usedRam;
            const effectiveLimitMB = limitMB ?? usedMB; // اگر limit نداشتیم، همان used برای جلوگیری از خطا
            const percentOfLimit = effectiveLimitMB > 0 ? Math.min(100, (usedMB / effectiveLimitMB) * 100) : 0;
            return {
                usedMB,
                totalMB: limitMB ?? usedMB,
                limitMB: effectiveLimitMB,
                usedStr: usedMB.toFixed(2) + " MB",
                totalStr: (limitMB ?? usedMB).toFixed(2) + " MB",
                limitStr: effectiveLimitMB.toFixed(2) + " MB",
                percentOfLimit,
            };
        }

        // Fallback به JS heap (Android)
        if (Platform.OS === "android" && (global as unknown as { performance?: { memory?: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } } }).performance?.memory) {
            const memory = (global as unknown as { performance: { memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number } } }).performance.memory;
            const usedMB = memory.usedJSHeapSize / 1048576;
            const totalMB = memory.totalJSHeapSize / 1048576;
            const effectiveLimitMB = limitMB ?? memory.jsHeapSizeLimit / 1048576;
            const percentOfLimit = effectiveLimitMB > 0 ? Math.min(100, (usedMB / effectiveLimitMB) * 100) : 0;
            return {
                usedMB,
                totalMB,
                limitMB: effectiveLimitMB,
                usedStr: usedMB.toFixed(2) + " MB",
                totalStr: totalMB.toFixed(2) + " MB",
                limitStr: effectiveLimitMB.toFixed(2) + " MB",
                percentOfLimit,
            };
        }
        return null;
    }

    logMemoryUsage(context: string) {
        const memory = this.getMemoryUsage();
        if (memory) {
            this.log(`Memory Usage [${context}]`, { used: memory.usedStr, total: memory.totalStr, limit: memory.limitStr });
        }
    }

    /**
     * Get FPS from native stats (UI Thread FPS - دقیق‌تر)
     */
    getFps(): number {
        if (!this.currentStats) return 0;
        // استفاده از UI FPS از native stats (دقیق‌تر)
        if (this.currentStats.uiFps !== undefined) {
            return Math.round(this.currentStats.uiFps);
        }
        // Fallback به JS FPS
        if (this.currentStats.jsFps !== undefined) {
            return Math.round(this.currentStats.jsFps);
        }
        return 0;
    }

    /**
     * استفادهٔ CPU از native (همان عدد واقعی دستگاه).
     * روی چندهسته می‌تواند >100 باشد (مثلاً ۲۶۰٪ = ۲.۶ هسته).
     */
    getCpuUsage(): number | null {
        if (this.currentStats?.usedCpu !== undefined) {
            return Math.max(0, Math.round(this.currentStats.usedCpu));
        }
        return null;
    }

    /**
     * Legacy methods (kept for compatibility)
     */
    recordFrame() {
        // No-op - native stats handles this
    }

    startCpuSampling() {
        // No-op - handled by start()
    }

    stopCpuSampling() {
        // No-op - handled by stop()
    }

    getLogs() {
        return this.logs;
    }
}

export const performanceMonitor = new PerformanceMonitor();
