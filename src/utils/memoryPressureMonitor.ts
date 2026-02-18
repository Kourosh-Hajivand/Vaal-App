/**
 * Memory Pressure Monitor
 * برای دستگاه‌های با RAM کم: لاگ به بک‌اند، خالی کردن کش، و در صورت نیاز ریستارت نرم
 * تا قبل از OOM کشنده، خودمان ریستارت کنیم و لاگ بفرستیم (شناسایی مانیتور مشکل‌دار)
 */

import { Platform } from "react-native";
import { performanceMonitor } from "./performanceMonitor";
import { logManager } from "./logging/logManager";
import { clearAllCaches } from "./cache/clearAllCaches";

const MEMORY_CRITICAL_PERCENT = 85; // بالای این درصد = بحرانی
const MEMORY_SOFT_RESTART_PERCENT = 92; // بالای این = ریستارت نرم
const CHECK_INTERVAL_MS = 30 * 1000; // هر ۳۰ ثانیه چک
const LOG_THROTTLE_MS = 5 * 60 * 1000; // حداکثر یک لاگ memory_critical هر ۵ دقیقه
const RESTART_COOLDOWN_MS = 10 * 60 * 1000; // حداکثر یک ریستارت نرم هر ۱۰ دقیقه

let intervalId: ReturnType<typeof setInterval> | null = null;
let lastCriticalLogTime = 0;
let lastRestartTime = 0;

function isMonitorStarted(): boolean {
    try {
        const mem = performanceMonitor.getMemoryUsage();
        return mem != null;
    } catch {
        return false;
    }
}

/**
 * یک بار چک حافظه: اگر بحرانی بود لاگ بفرست، کش خالی کن، در صورت نیاز ریستارت نرم
 */
async function checkMemory(): Promise<void> {
    if (Platform.OS === "web") return;

    try {
        if (!isMonitorStarted()) return;

        const mem = performanceMonitor.getMemoryUsage();
        if (!mem || mem.percentOfLimit < MEMORY_CRITICAL_PERCENT) return;

        const now = Date.now();

        // لاگ به بک‌اند تا بدانی کدام مانیتور مشکل داشته (با device_id)
        if (now - lastCriticalLogTime >= LOG_THROTTLE_MS) {
            lastCriticalLogTime = now;
            performanceMonitor.log("Memory critical - logging to backend", {
                usedMB: mem.usedMB,
                percentOfLimit: mem.percentOfLimit,
            });
            await logManager
                .logError(
                    "other",
                    "memory_critical",
                    undefined,
                    {
                        reason: "memory_critical",
                        usedMB: mem.usedMB,
                        limitMB: mem.limitMB,
                        percentOfLimit: mem.percentOfLimit,
                    }
                )
                .catch(() => {});
            await logManager.flush().catch(() => {});
        }

        // کش را خالی کن تا فشار کم شود
        await clearAllCaches().catch(() => {});

        // اگر هنوز خیلی بالا بود و مدتی از آخرین ریستارت گذشته، ریستارت نرم
        const memAfter = performanceMonitor.getMemoryUsage();
        if (
            memAfter &&
            memAfter.percentOfLimit >= MEMORY_SOFT_RESTART_PERCENT &&
            now - lastRestartTime >= RESTART_COOLDOWN_MS
        ) {
            lastRestartTime = now;
            await logManager
                .logError("other", "memory_soft_restart_before_oom", undefined, {
                    reason: "memory_soft_restart",
                    percentOfLimit: memAfter.percentOfLimit,
                })
                .catch(() => {});
            await logManager.flush().catch(() => {});

            try {
                const RNRestart = require("react-native-restart").default;
                RNRestart.restart();
            } catch (e) {
                console.warn("[MemoryPressure] Restart failed:", e);
            }
        }
    } catch (e) {
        console.warn("[MemoryPressure] Check failed:", e);
    }
}

/**
 * شروع مانیتورینگ فشار حافظه (فقط وقتی اپ آنلاین/توکن دارد صدا بزن)
 */
export function startMemoryPressureMonitor(): void {
    if (Platform.OS === "web") return;
    if (intervalId != null) return;

    try {
        performanceMonitor.start(true);
    } catch (e) {
        console.warn("[MemoryPressure] performanceMonitor.start failed:", e);
    }

    intervalId = setInterval(checkMemory, CHECK_INTERVAL_MS);
    // یک بار بلافاصله
    checkMemory();
}

/**
 * توقف مانیتورینگ
 */
export function stopMemoryPressureMonitor(): void {
    if (intervalId != null) {
        clearInterval(intervalId);
        intervalId = null;
    }
}
