/**
 * App Native Update Hook
 * چک و دانلود APK جدید از سرور
 *
 * فرق با useOTAUpdate:
 * - useOTAUpdate → آپدیت JS bundle (بیشتر تغییرات)
 * - useAppUpdate → آپدیت APK native (وقتی پکیج native جدید اضافه میشه)
 */
import { useEffect, useCallback, useRef, useState } from "react";
import { appUpdateService, type AppVersionResponse } from "@/src/services/appUpdateService";

interface AppUpdateState {
    /** آیا در حال چک ورژنه؟ */
    isChecking: boolean;
    /** آیا در حال دانلود APK هست؟ */
    isDownloading: boolean;
    /** درصد پیشرفت دانلود (0-100) */
    downloadProgress: number;
    /** آیا آپدیت native موجوده؟ */
    updateAvailable: boolean;
    /** اطلاعات آپدیت از سرور */
    updateInfo: AppVersionResponse | null;
    /** ورژن فعلی اپ */
    currentVersion: string;
    /** آخرین خطا */
    error: string | null;
}

interface UseAppUpdateOptions {
    /** فاصله زمانی چک (میلی‌ثانیه) — پیش‌فرض: 30 دقیقه */
    checkInterval?: number;
    /** آیا بعد از دانلود اتوماتیک نصب کنه؟ — پیش‌فرض: true */
    autoInstall?: boolean;
    /** فعال/غیرفعال — پیش‌فرض: true */
    enabled?: boolean;
}

const DEFAULT_CHECK_INTERVAL = 30 * 60 * 1000; // 30 دقیقه

export const useAppUpdate = (options: UseAppUpdateOptions = {}) => {
    const {
        checkInterval = DEFAULT_CHECK_INTERVAL,
        autoInstall = true,
        enabled = true,
    } = options;

    const [state, setState] = useState<AppUpdateState>({
        isChecking: false,
        isDownloading: false,
        downloadProgress: 0,
        updateAvailable: false,
        updateInfo: null,
        currentVersion: "1.0.0",
        error: null,
    });

    const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    /**
     * چک ورژن + دانلود + نصب
     */
    const checkAndUpdate = useCallback(async () => {
        try {
            setState((prev) => ({ ...prev, isChecking: true, error: null }));
            console.log("[AppUpdate] 🔍 Checking for native update...");

            const result = await appUpdateService.isUpdateAvailable();

            setState((prev) => ({
                ...prev,
                isChecking: false,
                currentVersion: result.currentVersion,
                updateAvailable: result.available,
                updateInfo: result.data,
            }));

            if (!result.available || !result.data) {
                console.log("[AppUpdate] ✅ Native app is up to date (v" + result.currentVersion + ")");
                return;
            }

            console.log(
                `[AppUpdate] 🆕 Native update available: v${result.currentVersion} → v${result.data.version}`
            );

            // دانلود APK
            setState((prev) => ({ ...prev, isDownloading: true, downloadProgress: 0 }));

            const filePath = await appUpdateService.downloadApk(
                result.data.download_url,
                (progress) => {
                    setState((prev) => ({ ...prev, downloadProgress: progress }));
                }
            );

            setState((prev) => ({ ...prev, isDownloading: false, downloadProgress: 100 }));

            // نصب اتوماتیک
            if (autoInstall) {
                console.log("[AppUpdate] 📦 Auto-installing APK...");
                await appUpdateService.installApk(filePath);
            }
        } catch (error: any) {
            const errorMessage = error?.message || "Unknown error";
            console.error("[AppUpdate] ❌ Native update failed:", errorMessage);
            setState((prev) => ({
                ...prev,
                isChecking: false,
                isDownloading: false,
                error: errorMessage,
            }));
        }
    }, [autoInstall]);

    /**
     * دانلود و نصب دستی
     */
    const downloadAndInstall = useCallback(async () => {
        if (!state.updateInfo?.download_url) return;

        try {
            setState((prev) => ({ ...prev, isDownloading: true, downloadProgress: 0 }));

            const filePath = await appUpdateService.downloadApk(
                state.updateInfo.download_url,
                (progress) => {
                    setState((prev) => ({ ...prev, downloadProgress: progress }));
                }
            );

            setState((prev) => ({ ...prev, isDownloading: false, downloadProgress: 100 }));
            await appUpdateService.installApk(filePath);
        } catch (error: any) {
            setState((prev) => ({
                ...prev,
                isDownloading: false,
                error: error?.message || "Download failed",
            }));
        }
    }, [state.updateInfo]);

    // چک دوره‌ای
    useEffect(() => {
        if (!enabled) return;

        // چک اولیه بعد از 30 ثانیه
        const initialTimeout = setTimeout(() => {
            checkAndUpdate();
        }, 30 * 1000);

        // چک دوره‌ای
        intervalRef.current = setInterval(() => {
            checkAndUpdate();
        }, checkInterval);

        return () => {
            clearTimeout(initialTimeout);
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [enabled, checkInterval, checkAndUpdate]);

    return {
        ...state,
        /** چک دستی */
        checkForUpdate: checkAndUpdate,
        /** دانلود و نصب دستی */
        downloadAndInstall,
    };
};
