/**
 * Hook برای استفاده از سیستم لاگ‌گیری
 * رابط ساده برای لاگ‌گیری در کامپوننت‌ها
 */

import { useEffect, useCallback } from "react";
import { AppState, AppStateStatus } from "react-native";
import { logManager } from "@/src/utils/logging/logManager";
import { logStorage } from "@/src/utils/logging/logStorage";
import { useDeviceInfo } from "@/src/hooks/device/useDeviceInfo";
import { useOnlineStatus } from "@/src/hooks/use-online-status";
import type { LogStats, ContentLogSummary, SensorLogSummary } from "@/src/types/logging.types";

export const useLogging = () => {
    const { data: deviceData } = useDeviceInfo();
    const { isOnline, connectionType } = useOnlineStatus();

    // تنظیم device ID وقتی device data لود شد
    useEffect(() => {
        if (deviceData?.id) {
            logManager.setDeviceId(deviceData.id);
        }
    }, [deviceData?.id]);

    // لاگ تغییرات وضعیت اپ (active/background/inactive)
    useEffect(() => {
        const subscription = AppState.addEventListener("change", (nextAppState: AppStateStatus) => {
            if (nextAppState === "active") {
                logManager.logDeviceStateChange("on", "active");
            } else if (nextAppState === "background") {
                logManager.logDeviceStateChange("sleep", "background");
            } else if (nextAppState === "inactive") {
                logManager.logDeviceStateChange("sleep", "inactive");
            }
        });

        return () => {
            subscription.remove();
        };
    }, []);

    // لاگ تغییرات شبکه
    useEffect(() => {
        logManager.logNetworkChange(isOnline ? "online" : "offline", connectionType);
    }, [isOnline, connectionType]);

    // Helper functions برای لاگ‌گیری محتوا
    const logContentPlay = useCallback(
        (
            contentId: string,
            options: {
                title?: string;
                type: "video" | "image";
                durationSec?: number;
                playCount?: number;
                position?: number;
            },
        ) => {
            logManager.logContentPlay(contentId, options);
        },
        [],
    );

    const logContentPause = useCallback(
        (
            contentId: string,
            options: {
                title?: string;
                type: "video" | "image";
                position?: number;
            },
        ) => {
            logManager.logContentPause(contentId, options);
        },
        [],
    );

    const logContentEnd = useCallback(
        (
            contentId: string,
            options: {
                title?: string;
                type: "video" | "image";
                playCount?: number;
            },
        ) => {
            logManager.logContentEnd(contentId, options);
        },
        [],
    );

    const logContentDownload = useCallback(
        (
            contentId: string,
            options: {
                title?: string;
                type: "video" | "image";
                fileUrl: string;
                status: "started" | "completed" | "failed";
                progress?: number;
                errorMessage?: string;
            },
        ) => {
            logManager.logContentDownload(contentId, options);
        },
        [],
    );

    const logContentAdded = useCallback(
        (
            contentId: string,
            options: {
                title?: string;
                type: "video" | "image";
                playlistId?: string;
                manifestId?: string;
            },
        ) => {
            logManager.logContentAdded(contentId, options);
        },
        [],
    );

    // Helper functions برای لاگ‌گیری سنسور
    const logSensorActivation = useCallback((state: "connected" | "disconnected") => {
        logManager.logSensorActivation(state);
    }, []);

    const logSensorPresence = useCallback(
        (
            state: "detected" | "not_detected",
            options?: {
                distance?: number;
                durationSec?: number;
            },
        ) => {
            logManager.logSensorPresence(state, options);
        },
        [],
    );

    // Helper functions برای لاگ‌گیری خطا
    const logError = useCallback((errorType: "download" | "playback" | "sensor" | "network" | "other", errorMessage: string, errorStack?: string, context?: Record<string, unknown>) => {
        logManager.logError(errorType, errorMessage, errorStack, context);
    }, []);

    // Helper functions برای لاگ‌گیری playlist/manifest
    const logPlaylistChange = useCallback(
        (
            action: "loaded" | "updated" | "cleared",
            options?: {
                playlistId?: string;
                itemsCount?: number;
            },
        ) => {
            logManager.logPlaylistChange(action, options);
        },
        [],
    );

    const logManifestChange = useCallback(
        (
            action: "loaded" | "updated",
            options?: {
                manifestId?: string;
                contentCount?: number;
            },
        ) => {
            logManager.logManifestChange(action, options);
        },
        [],
    );

    // Helper functions برای دریافت آمار
    const getStats = useCallback(async (): Promise<LogStats | null> => {
        return await logManager.getStats();
    }, []);

    const getContentLogSummary = useCallback(async (contentId: string): Promise<ContentLogSummary | null> => {
        return await logManager.getContentLogSummary(contentId);
    }, []);

    const getSensorLogSummary = useCallback(async (date: string): Promise<SensorLogSummary | null> => {
        return await logManager.getSensorLogSummary(date);
    }, []);

    const clearAllLogs = useCallback(async (): Promise<void> => {
        await logStorage.clearAllLogs();
    }, []);

    return {
        // Logging functions
        logContentPlay,
        logContentPause,
        logContentEnd,
        logContentDownload,
        logContentAdded,
        logSensorActivation,
        logSensorPresence,
        logError,
        logPlaylistChange,
        logManifestChange,
        // Stats functions
        getStats,
        getContentLogSummary,
        getSensorLogSummary,
        clearAllLogs,
    };
};
