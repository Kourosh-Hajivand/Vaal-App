/**
 * Log Storage - ذخیره‌سازی بهینه لاگ‌ها در AsyncStorage
 * بهینه‌سازی شده برای دستگاه‌های با RAM محدود (1GB)
 */

import AsyncStorage from "@react-native-async-storage/async-storage";
import type { LogEntry, LogStats } from "@/src/types/logging.types";

const LOG_STORAGE_KEY = "@device_logs";
const LOG_STATS_KEY = "@device_logs_stats";
const LOG_RETENTION_DAYS = 30; // نگه‌داری لاگ‌ها به مدت 30 روز
const MAX_BATCH_SIZE = 50; // حداکثر تعداد لاگ در هر بچ
const MAX_STORAGE_SIZE = 5 * 1024 * 1024; // حداکثر 5MB برای لاگ‌ها

/**
 * تولید ID یکتا برای لاگ
 */
const generateLogId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * محاسبه اندازه تقریبی یک لاگ (به بایت)
 */
const estimateLogSize = (log: LogEntry): number => {
    try {
        return JSON.stringify(log).length;
    } catch {
        return 500; // تخمین پیش‌فرض
    }
};

/**
 * فشرده‌سازی لاگ با حذف فیلدهای تکراری
 */
const compressLog = (log: LogEntry): LogEntry => {
    // حذف فیلدهای اختیاری خالی
    const compressed = { ...log };

    // حذف فیلدهای undefined
    Object.keys(compressed).forEach((key) => {
        if (compressed[key as keyof LogEntry] === undefined) {
            delete compressed[key as keyof LogEntry];
        }
    });

    return compressed;
};

/**
 * ذخیره لاگ‌ها در AsyncStorage
 */
class LogStorage {
    private cache: LogEntry[] = [];
    private cacheSize: number = 0;
    private lastFlushTime: number = Date.now();
    private readonly FLUSH_INTERVAL = 5 * 1000; // هر 5 ثانیه flush کن
    private readonly MAX_CACHE_SIZE = 100; // حداکثر تعداد لاگ در cache

    /**
     * اضافه کردن لاگ جدید
     */
    async addLog(log: Omit<LogEntry, "id" | "timestamp">): Promise<void> {
        try {
            const fullLog: LogEntry = {
                ...log,
                id: generateLogId(),
                timestamp: Date.now(),
            } as LogEntry;

            // فشرده‌سازی
            const compressedLog = compressLog(fullLog);

            // اضافه به cache
            this.cache.push(compressedLog);
            this.cacheSize += estimateLogSize(compressedLog);

            // اگر cache پر شد یا زمان flush رسیده، ذخیره کن
            if (this.cache.length >= this.MAX_CACHE_SIZE || Date.now() - this.lastFlushTime >= this.FLUSH_INTERVAL) {
                await this.flush();
            }
        } catch (error) {
            console.error("[LogStorage] Error adding log:", error);
        }
    }

    /**
     * ذخیره cache در AsyncStorage
     */
    private async flush(): Promise<void> {
        if (this.cache.length === 0) return;

        try {
            const existingLogs = await this.getStoredLogs();
            const allLogs = [...existingLogs, ...this.cache];

            // پاکسازی لاگ‌های قدیمی
            const cleanedLogs = this.cleanOldLogs(allLogs);

            // بررسی اندازه کل
            const totalSize = cleanedLogs.reduce((sum, log) => sum + estimateLogSize(log), 0);

            // اگر اندازه بیش از حد بود، قدیمی‌ترین لاگ‌ها را حذف کن
            let finalLogs = cleanedLogs;
            if (totalSize > MAX_STORAGE_SIZE) {
                finalLogs = this.trimLogsBySize(cleanedLogs, MAX_STORAGE_SIZE);
            }

            // ذخیره در AsyncStorage
            await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(finalLogs));

            // Reset cache
            this.cache = [];
            this.cacheSize = 0;
            this.lastFlushTime = Date.now();

            // Update stats
            await this.updateStats(finalLogs);
        } catch (error) {
            console.error("[LogStorage] Error flushing logs:", error);
            // در صورت خطا، cache را نگه دار تا بعداً دوباره تلاش کنیم
        }
    }

    /**
     * دریافت لاگ‌های ذخیره‌شده از AsyncStorage (بدون cache)
     */
    private async getStoredLogs(): Promise<LogEntry[]> {
        try {
            const stored = await AsyncStorage.getItem(LOG_STORAGE_KEY);
            if (!stored) return [];
            const logs: LogEntry[] = JSON.parse(stored);
            return this.cleanOldLogs(logs);
        } catch (error) {
            console.error("[LogStorage] Error getting stored logs:", error);
            return [];
        }
    }

    /**
     * دریافت تمام لاگ‌ها (شامل cache در حافظه)
     */
    async getAllLogs(): Promise<LogEntry[]> {
        try {
            const stored = await this.getStoredLogs();
            const merged = [...stored, ...this.cache];
            return this.cleanOldLogs(merged);
        } catch (error) {
            console.error("[LogStorage] Error getting logs:", error);
            return [];
        }
    }

    /**
     * دریافت لاگ‌های pending برای sync
     */
    async getPendingLogs(limit: number = MAX_BATCH_SIZE): Promise<LogEntry[]> {
        try {
            const allLogs = await this.getAllLogs();
            // لاگ‌هایی که sync نشده‌اند (flag sync_sent ندارند)
            const pending = allLogs.filter((log) => !(log as any).sync_sent).slice(0, limit);

            return pending;
        } catch (error) {
            console.error("[LogStorage] Error getting pending logs:", error);
            return [];
        }
    }

    /**
     * علامت‌گذاری لاگ‌ها به عنوان sync شده
     */
    async markLogsAsSynced(logIds: string[]): Promise<void> {
        try {
            const storedLogs = await this.getStoredLogs();
            const updatedStored = storedLogs.map((log) => (logIds.includes(log.id) ? ({ ...log, sync_sent: true } as LogEntry) : log));
            this.cache = this.cache.map((log) => (logIds.includes(log.id) ? ({ ...log, sync_sent: true } as LogEntry) : log));
            await AsyncStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(updatedStored));
        } catch (error) {
            console.error("[LogStorage] Error marking logs as synced:", error);
        }
    }

    /**
     * حذف لاگ‌های قدیمی (بیشتر از 30 روز)
     */
    private cleanOldLogs(logs: LogEntry[]): LogEntry[] {
        const cutoffTime = Date.now() - LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;
        return logs.filter((log) => log.timestamp >= cutoffTime);
    }

    /**
     * حذف لاگ‌ها بر اساس اندازه
     */
    private trimLogsBySize(logs: LogEntry[], maxSize: number): LogEntry[] {
        let currentSize = 0;
        const result: LogEntry[] = [];

        // مرتب‌سازی بر اساس timestamp (جدیدترین اول)
        const sorted = [...logs].sort((a, b) => b.timestamp - a.timestamp);

        for (const log of sorted) {
            const logSize = estimateLogSize(log);
            if (currentSize + logSize <= maxSize) {
                result.push(log);
                currentSize += logSize;
            } else {
                break;
            }
        }

        // مرتب‌سازی مجدد بر اساس timestamp (قدیمی‌ترین اول)
        return result.sort((a, b) => a.timestamp - b.timestamp);
    }

    /**
     * به‌روزرسانی آمار
     */
    private async updateStats(logs: LogEntry[]): Promise<void> {
        try {
            const stats: LogStats = {
                total_logs: logs.length,
                total_plays: logs.filter((l) => l.type === "content_end").length,
                logs_by_type: {} as Record<string, number>,
                oldest_log_timestamp: logs.length > 0 ? Math.min(...logs.map((l) => l.timestamp)) : Date.now(),
                newest_log_timestamp: logs.length > 0 ? Math.max(...logs.map((l) => l.timestamp)) : Date.now(),
                pending_sync_count: logs.filter((l) => !(l as any).sync_sent).length,
            };

            // شمارش بر اساس نوع
            logs.forEach((log) => {
                stats.logs_by_type[log.type] = (stats.logs_by_type[log.type] || 0) + 1;
            });

            await AsyncStorage.setItem(LOG_STATS_KEY, JSON.stringify(stats));
        } catch (error) {
            console.error("[LogStorage] Error updating stats:", error);
        }
    }

    /**
     * دریافت آمار - محاسبه بر اساس لاگ‌های واقعی (شامل cache)
     */
    async getStats(): Promise<LogStats | null> {
        try {
            const logs = await this.getAllLogs();
            const stats: LogStats = {
                total_logs: logs.length,
                total_plays: logs.filter((l) => l.type === "content_end").length,
                logs_by_type: {} as Record<string, number>,
                oldest_log_timestamp: logs.length > 0 ? Math.min(...logs.map((l) => l.timestamp)) : Date.now(),
                newest_log_timestamp: logs.length > 0 ? Math.max(...logs.map((l) => l.timestamp)) : Date.now(),
                pending_sync_count: logs.filter((l) => !(l as any).sync_sent).length,
            };
            logs.forEach((log) => {
                stats.logs_by_type[log.type] = (stats.logs_by_type[log.type] || 0) + 1;
            });
            return stats;
        } catch (error) {
            console.error("[LogStorage] Error getting stats:", error);
            return null;
        }
    }

    /**
     * پاک کردن تمام لاگ‌ها
     */
    async clearAllLogs(): Promise<void> {
        try {
            await AsyncStorage.removeItem(LOG_STORAGE_KEY);
            await AsyncStorage.removeItem(LOG_STATS_KEY);
            this.cache = [];
            this.cacheSize = 0;
        } catch (error) {
            console.error("[LogStorage] Error clearing logs:", error);
        }
    }

    /**
     * Force flush - برای استفاده قبل از بستن اپ
     */
    async forceFlush(): Promise<void> {
        await this.flush();
    }
}

export const logStorage = new LogStorage();
