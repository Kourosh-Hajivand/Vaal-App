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
}

const DEFAULT_CHECK_INTERVAL = 5 * 60 * 1000; // 5 دقیقه

export const useOTAUpdate = (options: UseOTAUpdateOptions = {}) => {
    const {
        checkInterval = DEFAULT_CHECK_INTERVAL,
        autoApply = true,
        enabled = true,
    } = options;

    const [state, setState] = useState<OTAUpdateState>({
        isChecking: false,
        isDownloading: false,
        error: null,
        lastCheckTime: null,
        updateAvailable: false,
    });

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /**
     * چک کردن آپدیت جدید + دانلود + اعمال
     */
    const checkAndApplyUpdate = useCallback(async () => {
        // در development mode آپدیت کار نمی‌کنه
        if (__DEV__) {
            console.log("[OTA] ⚠️ Skipping update check in development mode");
            return;
        }

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
                    // کمی صبر کن تا state آپدیت بشه
                    setTimeout(async () => {
                        await Updates.reloadAsync();
                    }, 1000);
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
        }
    }, [autoApply]);

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

        // چک اولیه با 10 ثانیه تاخیر (اپ باید اول لود بشه)
        const initialTimeout = setTimeout(() => {
            checkAndApplyUpdate();
        }, 10 * 1000);

        // چک دوره‌ای
        intervalRef.current = setInterval(() => {
            checkAndApplyUpdate();
        }, checkInterval);

        return () => {
            clearTimeout(initialTimeout);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [enabled, checkInterval, checkAndApplyUpdate]);

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
