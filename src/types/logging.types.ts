/**
 * Type definitions برای سیستم لاگ
 */

export type LogType = "content_play" | "content_pause" | "content_end" | "content_download" | "content_added" | "device_state_change" | "sensor_activation" | "sensor_presence_change" | "network_change" | "error" | "playlist_change" | "manifest_change" | "emergency";

export type DeviceState = "on" | "off" | "sleep" | "wake";
export type NetworkState = "online" | "offline";
export type SensorState = "connected" | "disconnected";
export type PresenceState = "detected" | "not_detected";

/**
 * لاگ پایه - تمام لاگ‌ها این ساختار را دارند
 */
export interface BaseLog {
    id: string; // UUID یا timestamp-based ID
    type: LogType;
    timestamp: number; // Unix timestamp در میلی‌ثانیه
    device_id?: string; // ID دستگاه (اختیاری)
}

/**
 * لاگ پخش محتوا
 */
export interface ContentPlayLog extends BaseLog {
    type: "content_play" | "content_pause" | "content_end";
    content_id: string;
    content_title?: string;
    content_type: "video" | "image";
    duration_sec?: number;
    play_count?: number; // تعداد دفعات پخش این محتوا
    position?: number; // موقعیت در playlist
}

/**
 * لاگ دانلود محتوا
 */
export interface ContentDownloadLog extends BaseLog {
    type: "content_download";
    content_id: string;
    content_title?: string;
    content_type: "video" | "image";
    file_url: string;
    download_status: "started" | "completed" | "failed";
    download_progress?: number; // درصد (0-100)
    error_message?: string;
}

/**
 * لاگ اضافه شدن محتوا به لیست
 */
export interface ContentAddedLog extends BaseLog {
    type: "content_added";
    content_id: string;
    content_title?: string;
    content_type: "video" | "image";
    playlist_id?: string;
    manifest_id?: string;
}

/**
 * لاگ تغییر وضعیت دستگاه
 */
export interface DeviceStateLog extends BaseLog {
    type: "device_state_change";
    state: DeviceState;
    previous_state?: DeviceState;
    app_state?: "active" | "background" | "inactive";
}

/**
 * لاگ تغییر وضعیت شبکه
 */
export interface NetworkChangeLog extends BaseLog {
    type: "network_change";
    state: NetworkState;
    previous_state?: NetworkState;
    connection_type?: string; // wifi, cellular, etc.
}

/**
 * لاگ فعال شدن سنسور
 */
export interface SensorActivationLog extends BaseLog {
    type: "sensor_activation";
    sensor_state: SensorState;
    previous_state?: SensorState;
}

/**
 * لاگ تغییر وضعیت حضور
 */
export interface SensorPresenceLog extends BaseLog {
    type: "sensor_presence_change";
    presence_state: PresenceState;
    previous_state?: PresenceState;
    distance?: number; // فاصله به سانتی‌متر
    duration_sec?: number; // مدت زمان حضور (برای لاگ‌های پایان)
}

/**
 * لاگ خطا
 */
export interface ErrorLog extends BaseLog {
    type: "error";
    error_type: "download" | "playback" | "sensor" | "network" | "other";
    error_message: string;
    error_stack?: string;
    context?: Record<string, unknown>; // اطلاعات اضافی
}

/**
 * لاگ تغییر playlist
 */
export interface PlaylistChangeLog extends BaseLog {
    type: "playlist_change";
    playlist_id?: string;
    action: "loaded" | "updated" | "cleared";
    items_count?: number;
}

/**
 * لاگ تغییر manifest
 */
export interface ManifestChangeLog extends BaseLog {
    type: "manifest_change";
    manifest_id?: string;
    action: "loaded" | "updated";
    content_count?: number;
}

/**
 * لاگ اضطراری - برای مشکلات بحرانی که نیاز به پشتیبانی دارند
 */
export interface EmergencyLog extends BaseLog {
    type: "emergency";
    emergency_type: "video_playback_failed" | "sensor_disconnected" | "device_malfunction";
    message: string; // پیام توضیحی برای بک‌اند
    device_id?: string;
    content_id?: string; // در صورت مربوط بودن به محتوا
    content_title?: string;
    sensor_state?: SensorState;
    retry_count?: number; // تعداد تلاش‌های انجام شده
    context?: Record<string, unknown>; // اطلاعات اضافی
}

/**
 * Union type برای تمام لاگ‌ها
 */
export type LogEntry = ContentPlayLog | ContentDownloadLog | ContentAddedLog | DeviceStateLog | NetworkChangeLog | SensorActivationLog | SensorPresenceLog | ErrorLog | PlaylistChangeLog | ManifestChangeLog | EmergencyLog;

/**
 * بچ لاگ‌ها برای ارسال به سرور
 */
export interface LogBatch {
    device_id?: string;
    logs: LogEntry[];
    batch_id: string;
    created_at: number;
}

/**
 * پاسخ سرور برای ارسال لاگ
 */
export interface LogBatchResponse {
    success: boolean;
    message?: string;
    received_count: number;
    failed_logs?: string[]; // IDs لاگ‌های ناموفق
}

/**
 * آمار لاگ‌ها برای نمایش در حالت توسعه
 */
export interface LogStats {
    total_logs: number;
    /** تعداد کل پخش کامل (فقط content_end) - با هر پخش ۱ واحد اضافه میشه */
    total_plays: number;
    logs_by_type: Record<LogType, number>;
    oldest_log_timestamp: number;
    newest_log_timestamp: number;
    pending_sync_count: number;
    last_sync_timestamp?: number;
}

/**
 * خلاصه لاگ محتوا برای نمایش
 */
export interface ContentLogSummary {
    content_id: string;
    content_title?: string;
    play_count: number;
    last_played_at?: number;
    total_play_duration_sec: number;
    download_count: number;
    last_downloaded_at?: number;
}

/**
 * خلاصه لاگ سنسور برای نمایش
 */
export interface SensorLogSummary {
    date: string; // YYYY-MM-DD
    activation_count: number;
    total_presence_duration_sec: number;
    presence_detections: number;
    average_distance?: number;
}
