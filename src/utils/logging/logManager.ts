/**
 * Log Manager - مدیریت مرکزی لاگ‌ها
 * رابط ساده برای لاگ‌گیری در تمام بخش‌های اپلیکیشن
 */

import { logStorage } from "./logStorage";
import type { LogEntry, ContentPlayLog, ContentDownloadLog, ContentAddedLog, DeviceStateLog, NetworkChangeLog, SensorActivationLog, SensorPresenceLog, ErrorLog, PlaylistChangeLog, ManifestChangeLog, EmergencyLog, LogStats, ContentLogSummary, SensorLogSummary } from "@/src/types/logging.types";

class LogManager {
    private deviceId: string | null = null;
    private lastDeviceState: "on" | "off" | "sleep" | "wake" = "on";
    private lastNetworkState: "online" | "offline" = "online";
    private lastSensorState: "connected" | "disconnected" = "disconnected";
    private lastPresenceState: "detected" | "not_detected" = "not_detected";
    private throttleMap: Map<string, number> = new Map();
    private readonly THROTTLE_INTERVAL = 1000; // حداقل 1 ثانیه بین لاگ‌های مشابه

    /**
     * تنظیم device ID
     */
    setDeviceId(deviceId: string): void {
        this.deviceId = deviceId;
    }

    /**
     * بررسی throttle - جلوگیری از لاگ‌های تکراری زیاد
     */
    private shouldThrottle(key: string): boolean {
        const lastTime = this.throttleMap.get(key) || 0;
        const now = Date.now();

        if (now - lastTime < this.THROTTLE_INTERVAL) {
            return true; // باید throttle شود
        }

        this.throttleMap.set(key, now);
        return false;
    }

    /**
     * لاگ پخش محتوا
     */
    async logContentPlay(
        contentId: string,
        options: {
            title?: string;
            type: "video" | "image";
            durationSec?: number;
            playCount?: number;
            position?: number;
        },
    ): Promise<void> {
        if (this.shouldThrottle(`content_play_${contentId}`)) return;

        await logStorage.addLog({
            type: "content_play",
            device_id: this.deviceId,
            content_id: contentId,
            content_title: options.title,
            content_type: options.type,
            duration_sec: options.durationSec,
            play_count: options.playCount,
            position: options.position,
        } as ContentPlayLog);
    }

    /**
     * لاگ pause محتوا
     */
    async logContentPause(
        contentId: string,
        options: {
            title?: string;
            type: "video" | "image";
            position?: number;
        },
    ): Promise<void> {
        await logStorage.addLog({
            type: "content_pause",
            device_id: this.deviceId,
            content_id: contentId,
            content_title: options.title,
            content_type: options.type,
            position: options.position,
        } as ContentPlayLog);
    }

    /**
     * لاگ پایان پخش محتوا
     */
    async logContentEnd(
        contentId: string,
        options: {
            title?: string;
            type: "video" | "image";
            playCount?: number;
        },
    ): Promise<void> {
        await logStorage.addLog({
            type: "content_end",
            device_id: this.deviceId,
            content_id: contentId,
            content_title: options.title,
            content_type: options.type,
            play_count: options.playCount,
        } as ContentPlayLog);
    }

    /**
     * لاگ دانلود محتوا
     */
    async logContentDownload(
        contentId: string,
        options: {
            title?: string;
            type: "video" | "image";
            fileUrl: string;
            status: "started" | "completed" | "failed";
            progress?: number;
            errorMessage?: string;
        },
    ): Promise<void> {
        await logStorage.addLog({
            type: "content_download",
            device_id: this.deviceId,
            content_id: contentId,
            content_title: options.title,
            content_type: options.type,
            file_url: options.fileUrl,
            download_status: options.status,
            download_progress: options.progress,
            error_message: options.errorMessage,
        } as ContentDownloadLog);
    }

    /**
     * لاگ اضافه شدن محتوا به لیست
     */
    async logContentAdded(
        contentId: string,
        options: {
            title?: string;
            type: "video" | "image";
            playlistId?: string;
            manifestId?: string;
        },
    ): Promise<void> {
        await logStorage.addLog({
            type: "content_added",
            device_id: this.deviceId,
            content_id: contentId,
            content_title: options.title,
            content_type: options.type,
            playlist_id: options.playlistId,
            manifest_id: options.manifestId,
        } as ContentAddedLog);
    }

    /**
     * لاگ تغییر وضعیت دستگاه
     */
    async logDeviceStateChange(state: "on" | "off" | "sleep" | "wake", appState?: "active" | "background" | "inactive"): Promise<void> {
        if (state === this.lastDeviceState) return; // فقط اگر تغییر کرده باشد

        await logStorage.addLog({
            type: "device_state_change",
            device_id: this.deviceId,
            state,
            previous_state: this.lastDeviceState,
            app_state: appState,
        } as DeviceStateLog);

        this.lastDeviceState = state;
    }

    /**
     * لاگ تغییر وضعیت شبکه
     */
    async logNetworkChange(state: "online" | "offline", connectionType?: string): Promise<void> {
        if (state === this.lastNetworkState) return;

        await logStorage.addLog({
            type: "network_change",
            device_id: this.deviceId,
            state,
            previous_state: this.lastNetworkState,
            connection_type: connectionType,
        } as NetworkChangeLog);

        this.lastNetworkState = state;
    }

    /**
     * لاگ فعال شدن سنسور
     */
    async logSensorActivation(state: "connected" | "disconnected"): Promise<void> {
        if (state === this.lastSensorState) return;

        await logStorage.addLog({
            type: "sensor_activation",
            device_id: this.deviceId,
            sensor_state: state,
            previous_state: this.lastSensorState,
        } as SensorActivationLog);

        this.lastSensorState = state;
    }

    /**
     * لاگ تغییر وضعیت حضور
     */
    async logSensorPresence(
        state: "detected" | "not_detected",
        options?: {
            distance?: number;
            durationSec?: number;
        },
    ): Promise<void> {
        await logStorage.addLog({
            type: "sensor_presence_change",
            device_id: this.deviceId,
            presence_state: state,
            previous_state: this.lastPresenceState,
            distance: options?.distance,
            duration_sec: options?.durationSec,
        } as SensorPresenceLog);

        this.lastPresenceState = state;
    }

    /**
     * لاگ خطا
     */
    async logError(errorType: "download" | "playback" | "sensor" | "network" | "other", errorMessage: string, errorStack?: string, context?: Record<string, unknown>): Promise<void> {
        await logStorage.addLog({
            type: "error",
            device_id: this.deviceId,
            error_type: errorType,
            error_message: errorMessage,
            error_stack: errorStack,
            context,
        } as ErrorLog);
    }

    /**
     * لاگ تغییر playlist
     */
    async logPlaylistChange(
        action: "loaded" | "updated" | "cleared",
        options?: {
            playlistId?: string;
            itemsCount?: number;
        },
    ): Promise<void> {
        await logStorage.addLog({
            type: "playlist_change",
            device_id: this.deviceId,
            playlist_id: options?.playlistId,
            action,
            items_count: options?.itemsCount,
        } as PlaylistChangeLog);
    }

    /**
     * لاگ تغییر manifest
     */
    async logManifestChange(
        action: "loaded" | "updated",
        options?: {
            manifestId?: string;
            contentCount?: number;
        },
    ): Promise<void> {
        await logStorage.addLog({
            type: "manifest_change",
            device_id: this.deviceId,
            manifest_id: options?.manifestId,
            action,
            content_count: options?.contentCount,
        } as ManifestChangeLog);
    }

    /**
     * دریافت آمار لاگ‌ها
     */
    async getStats(): Promise<LogStats | null> {
        return await logStorage.getStats();
    }

    /**
     * دریافت خلاصه لاگ‌های محتوا
     */
    async getContentLogSummary(contentId: string): Promise<ContentLogSummary | null> {
        try {
            const allLogs = await logStorage.getAllLogs();
            const contentLogs = allLogs.filter((log) => (log.type === "content_play" || log.type === "content_end" || log.type === "content_download") && (log as ContentPlayLog | ContentDownloadLog).content_id === contentId);

            if (contentLogs.length === 0) return null;

            const playLogs = contentLogs.filter((log) => log.type === "content_play" || log.type === "content_end") as ContentPlayLog[];
            const downloadLogs = contentLogs.filter((log) => log.type === "content_download") as ContentDownloadLog[];

            // play_count = تعداد پخش کامل (فقط content_end - هر end = یک پخش تمام‌شده)
            const playCount = contentLogs.filter((log) => log.type === "content_end").length;
            const lastPlayed = playLogs.length > 0 ? Math.max(...playLogs.map((l) => l.timestamp)) : undefined;

            const totalDuration = playLogs.reduce((sum, log) => sum + (log.duration_sec || 0), 0);

            const downloadCount = downloadLogs.filter((log) => log.download_status === "completed").length;

            const lastDownloaded = downloadLogs.length > 0 ? Math.max(...downloadLogs.map((l) => l.timestamp)) : undefined;

            return {
                content_id: contentId,
                content_title: playLogs[0]?.content_title,
                play_count: playCount,
                last_played_at: lastPlayed,
                total_play_duration_sec: totalDuration,
                download_count: downloadCount,
                last_downloaded_at: lastDownloaded,
            };
        } catch (error) {
            console.error("[LogManager] Error getting content summary:", error);
            return null;
        }
    }

    /**
     * دریافت خلاصه لاگ‌های سنسور برای یک روز
     */
    async getSensorLogSummary(date: string): Promise<SensorLogSummary | null> {
        try {
            const allLogs = await logStorage.getAllLogs();
            const startOfDay = new Date(date).setHours(0, 0, 0, 0);
            const endOfDay = new Date(date).setHours(23, 59, 59, 999);

            const dayLogs = allLogs.filter((log) => log.timestamp >= startOfDay && log.timestamp <= endOfDay);

            const activationLogs = dayLogs.filter((log) => log.type === "sensor_activation") as SensorActivationLog[];

            const presenceLogs = dayLogs.filter((log) => log.type === "sensor_presence_change") as SensorPresenceLog[];

            const activationCount = activationLogs.filter((log) => log.sensor_state === "connected").length;

            const presenceDetections = presenceLogs.filter((log) => log.presence_state === "detected").length;

            const totalDuration = presenceLogs.reduce((sum, log) => sum + (log.duration_sec || 0), 0);

            const distances = presenceLogs.filter((log) => log.distance !== undefined).map((log) => log.distance!);

            const averageDistance = distances.length > 0 ? distances.reduce((sum, d) => sum + d, 0) / distances.length : undefined;

            return {
                date,
                activation_count: activationCount,
                total_presence_duration_sec: totalDuration,
                presence_detections: presenceDetections,
                average_distance: averageDistance,
            };
        } catch (error) {
            console.error("[LogManager] Error getting sensor summary:", error);
            return null;
        }
    }

    /**
     * لاگ اضطراری - برای مشکلات بحرانی که نیاز به پشتیبانی دارند
     */
    async logEmergency(
        emergencyType: "video_playback_failed" | "sensor_disconnected" | "device_malfunction",
        message: string,
        options?: {
            contentId?: string;
            contentTitle?: string;
            sensorState?: "connected" | "disconnected";
            retryCount?: number;
            context?: Record<string, unknown>;
        },
    ): Promise<void> {
        await logStorage.addLog({
            type: "emergency",
            device_id: this.deviceId,
            emergency_type: emergencyType,
            message,
            content_id: options?.contentId,
            content_title: options?.contentTitle,
            sensor_state: options?.sensorState,
            retry_count: options?.retryCount,
            context: options?.context,
        } as EmergencyLog);
    }

    /**
     * Force flush - برای استفاده قبل از بستن اپ
     */
    async flush(): Promise<void> {
        await logStorage.forceFlush();
    }
}

export const logManager = new LogManager();
