import { Platform } from "react-native";

class PerformanceMonitor {
    private logs: Array<{ timestamp: number; message: string; data?: any }> = [];

    log(message: string, data?: any) {
        const log = {
            timestamp: Date.now(),
            message,
            data,
        };
        this.logs.push(log);
        console.log(`[PERF] ${message}`, data || "");

        // Keep only last 100 logs
        if (this.logs.length > 100) {
            this.logs.shift();
        }
    }

    getMemoryUsage() {
        if (Platform.OS === "android" && (global as any).performance?.memory) {
            const memory = (global as any).performance.memory;
            return {
                used: (memory.usedJSHeapSize / 1048576).toFixed(2) + " MB",
                total: (memory.totalJSHeapSize / 1048576).toFixed(2) + " MB",
                limit: (memory.jsHeapSizeLimit / 1048576).toFixed(2) + " MB",
            };
        }
        return null;
    }

    logMemoryUsage(context: string) {
        const memory = this.getMemoryUsage();
        if (memory) {
            this.log(`Memory Usage [${context}]`, memory);
        }
    }

    getLogs() {
        return this.logs;
    }
}

export const performanceMonitor = new PerformanceMonitor();
