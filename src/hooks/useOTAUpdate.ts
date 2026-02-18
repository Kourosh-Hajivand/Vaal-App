/**
 * OTA Update Hook
 * چک و اعمال آپدیت‌های Over-The-Air از EAS Update
 * 
 * - هر interval ثانیه چک می‌کنه آپدیت جدید هست؟
 * - اگه آپدیت بود، دانلود و اعمال می‌کنه
 * - بعد از اعمال، اپ ری‌لود میشه
 * - مناسب برای مانیتورهایی که دسترسی فیزیکی نداری
 */
import { useEffect, useCallback, useRef, useState } from "react";
import { AppState, type AppStateStatus, Platform } from "react-native";
import * as Updates from "expo-updates";

interface OTAUpdateState {
    /** آیا در حال چک کردن آپدیته؟ */
    isChecking: boolean;
    /** آیا در حال دانلود آپدیته؟ */
    isDownloading: boolean;
    /** آخرین خطا */
    error: string | null;
    /** آخرین باری که چک شد */
    lastCheckTime: Date | null;
    /** آیا آپدیت جدید پیدا شد؟ */
    updateAvailable: boolean;
}

interface UseOTAUpdateOptions {
    /** فاصله زمانی چک (میلی‌ثانیه) — پیش‌فرض: 5 دقیقه */
    checkInterval?: number;
    /** آیا بلافاصله بعد از دانلود اعمال بشه؟ — پیش‌فرض: true */
    autoApply?: boolean;
    /** فعال/غیرفعال — پیش‌فرض: true */
    enabled?: boolean;
    /** تاخیر چک اولیه بعد از بالا آمدن اپ (ms) — پیش‌فرض: 10 ثانیه */
    checkOnStartDelayMs?: number;
    /** هر بار که اپ به Foreground می‌آید هم چک کند؟ — پیش‌فرض: true */
    checkOnForeground?: boolean;
    /** حداقل فاصله بین دو چک (ms) برای جلوگیری از spam — پیش‌فرض: 60 ثانیه */
    minTimeBetweenChecksMs?: number;
}

const DEFAULT_CHECK_INTERVAL = 5 * 60 * 1000; // 5 دقیقه
const DEFAULT_START_DELAY_MS = 10 * 1000;
const DEFAULT_MIN_TIME_BETWEEN_CHECKS_MS = 60 * 1000;

export const useOTAUpdate = (options: UseOTAUpdateOptions = {}) => {
    const {
        checkInterval = DEFAULT_CHECK_INTERVAL,
        autoApply = true,
        enabled = true,
        checkOnStartDelayMs = DEFAULT_START_DELAY_MS,
        checkOnForeground = true,
        minTimeBetweenChecksMs = DEFAULT_MIN_TIME_BETWEEN_CHECKS_MS,
    } = options;

    const [state, setState] = useState<OTAUpdateState>({
        isChecking: false,
        isDownloading: false,
        error: null,
        lastCheckTime: null,
        updateAvailable: false,
    });

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const busyRef = useRef(false);
    const lastRunAtRef = useRef(0);

    /**
     * چک کردن آپدیت جدید + دانلود + اعمال
     */
    const checkAndApplyUpdate = useCallback(async () => {
        if (Platform.OS === "web") return;
        // در development mode آپدیت کار نمی‌کنه
        if (__DEV__) {
            console.log("[OTA] ⚠️ Skipping update check in development mode");
            return;
        }

        if (!Updates.isEnabled) {
            return;
        }

        const now = Date.now();
        if (now - lastRunAtRef.current < minTimeBetweenChecksMs) {
            return;
        }
        if (busyRef.current) {
            return;
        }

        busyRef.current = true;
        lastRunAtRef.current = now;

        try {
            setState((prev) => ({ ...prev, isChecking: true, error: null }));
            console.log("[OTA] 🔍 Checking for updates...");

            const checkResult = await Updates.checkForUpdateAsync();

            setState((prev) => ({
                ...prev,
                isChecking: false,
                lastCheckTime: new Date(),
                updateAvailable: checkResult.isAvailable,
            }));

            if (!checkResult.isAvailable) {
                console.log("[OTA] ✅ App is up to date");
                return;
            }

            // آپدیت جدید پیدا شد!
            console.log("[OTA] 🆕 Update available! Downloading...");
            setState((prev) => ({ ...prev, isDownloading: true }));

            const fetchResult = await Updates.fetchUpdateAsync();

            setState((prev) => ({ ...prev, isDownloading: false }));

            if (fetchResult.isNew) {
                console.log("[OTA] ✅ Update downloaded successfully");

                if (autoApply) {
                    console.log("[OTA] 🔄 Applying update and reloading...");
                    // درجا reload
                    await Updates.reloadAsync();
                }
            }
        } catch (error: any) {
            const errorMessage = error?.message || "Unknown error";
            console.error("[OTA] ❌ Update check failed:", errorMessage);
            setState((prev) => ({
                ...prev,
                isChecking: false,
                isDownloading: false,
                error: errorMessage,
                lastCheckTime: new Date(),
            }));
        } finally {
            busyRef.current = false;
        }
    }, [autoApply, minTimeBetweenChecksMs]);

    /**
     * اعمال دستی آپدیت (اگه autoApply غیرفعال باشه)
     */
    const applyUpdate = useCallback(async () => {
        if (__DEV__) return;
        try {
            await Updates.reloadAsync();
        } catch (error: any) {
            console.error("[OTA] ❌ Failed to apply update:", error?.message);
        }
    }, []);

    // چک اولیه + interval
    useEffect(() => {
        if (!enabled || __DEV__) return;

        // چک اولیه (قابل تنظیم برای "درجا")
        const initialTimeout = setTimeout(() => {
            checkAndApplyUpdate();
        }, Math.max(0, checkOnStartDelayMs));

        // چک دوره‌ای
        intervalRef.current = setInterval(() => {
            checkAndApplyUpdate();
        }, checkInterval);

        // هر بار برگشت به Foreground هم چک کن (برای مانیتورهای بدون دسترسی)
        const subscription = checkOnForeground
            ? AppState.addEventListener("change", (next: AppStateStatus) => {
                  if (next === "active") {
                      checkAndApplyUpdate();
                  }
              })
            : null;

        return () => {
            clearTimeout(initialTimeout);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
            subscription?.remove?.();
        };
    }, [enabled, checkInterval, checkAndApplyUpdate, checkOnStartDelayMs, checkOnForeground]);

    return {
        ...state,
        /** چک دستی آپدیت */
        checkForUpdate: checkAndApplyUpdate,
        /** اعمال دستی آپدیت */
        applyUpdate,
        /** اطلاعات آپدیت فعلی */
        currentUpdateId: Updates.updateId,
        /** channel فعلی */
        channel: Updates.channel,
        /** runtime version */
        runtimeVersion: Updates.runtimeVersion,
    };
};
