/**
 * Type definitions برای API requests و responses
 */

// Base API Response
export interface ApiResponse<T = unknown> {
    data: T;
    message?: string;
    status?: string;
    success?: boolean;
}

// Error Response
export interface ApiError {
    message: string;
    errors?: Record<string, string[]>;
    statusCode?: number;
}

// Pagination
export interface PaginationParams {
    page?: number;
    limit?: number;
}

export interface PaginatedResponse<T> {
    data: T[];
    pagination: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
    };
}

// ==================== Device Types ====================

export interface RegisterDeviceRequest {
    serial: string;
    app_version?: string | null;
    ip_address?: string | null;
}

export interface ActivateDeviceRequest {
    pair_code: string;
}

export interface Location {
    lat?: number | null;
    lng?: number | null;
}

export interface Contact {
    label?: string | null;
    phone?: string | null;
    description?: string | null;
}

// Contact types based on OpenAPI
export interface ContactResource {
    name: string;
    phone: string;
    role: string;
}

export interface ContactInput {
    name: string;
    phone: string;
    role: string;
}

export interface BuildingResource {
    id: string;
    name: string;
    manager_name?: string | null;
    manager_phone?: string | null;
    contacts?: Contact[] | ContactResource[];
    location?: Location | null;
    floors_count?: number | null;
    units_count?: number | null;
    address?: string | null;
    devices_count: number;
    devices?: DeviceResource[];
    created_at: string;
    updated_at: string;
}

export type DeviceStatus = "pending" | "active" | "inactive" | "offline" | "error";

export interface EmergencyInfo {
    enabled: boolean;
    text?: string | null;
    text_color?: string | null;
    bg_color?: string | null;
}

export interface DeviceResource {
    id: string;
    name?: string | null;
    serial: string;
    status: DeviceStatus;
    app_version?: string | null;
    ip_address?: string | null;
    last_seen_at?: string | null;
    building_id?: string | null;
    building?: BuildingResource | null;
    contacts?: Contact[] | ContactResource[];
    text_categories?: TextCategoryResource[];
    pair_code?: string; // Only visible when status is pending
    pair_expires_at?: string; // Only visible when status is pending
    token?: string; // Authentication token (only returned on activation/auth)
    theme?: "classic" | "modern" | "cyber" | "minimal" | "elegant";
    // پشتیبانی از هر دو ساختار: emergency object یا فیلدهای مستقیم (برای backward compatibility)
    emergency?: EmergencyInfo;
    emergency_enabled?: boolean;
    emergency_text?: string;
    emergency_text_color?: string;
    emergency_bg_color?: string;
    background_url?: string | null;
    night_background_url?: string | null;
    created_at: string;
    updated_at: string;
}

export interface DeviceRegisterResponse extends DeviceResource {
    message: string;
}

export interface DeviceActivateResponse extends DeviceResource {
    message: string;
}

export interface DeviceAuthResponse extends DeviceResource {
    message: string;
}

// ==================== Announcement Types ====================

export type AnnouncementType = "info" | "warning" | "urgent" | "success" | "emergency" | "maintenance";
export type AnnouncementPriority = "low" | "medium" | "high" | "critical" | "urgent";
export type AnnouncementStatus = "active" | "inactive" | "scheduled" | "expired" | "archived";

export interface AnnouncementDevice {
    id: string;
    name?: string | null;
    serial?: string | null;
    building_id?: string | null;
}

export interface AnnouncementResource {
    id: string;
    title: string;
    message?: string | null;
    type: AnnouncementType;
    priority: AnnouncementPriority | string | number; // می‌تواند "high" | "medium" | "low" یا number باشد
    device_id?: string | null;
    device?: AnnouncementDevice | null;
    building_id?: string | null;
    building?: BuildingResource | null;
    duration_sec: number;
    display_count: number;
    is_scrolling: boolean;
    start_date?: string | null;
    end_date?: string | null;
    active_hours?: Record<string, unknown> | null;
    days_of_week?: number[] | null;
    status: AnnouncementStatus | string;
    metadata?: Record<string, unknown> | null;
    created_at: string;
}

export interface AnnouncementsListResponse {
    data: AnnouncementResource[];
    message: string;
}

export interface AnnouncementDetailResponse {
    data: AnnouncementResource;
}

// ==================== Content Types ====================

export interface ContentCreator {
    id?: string | null;
    name?: string | null;
}

export interface ContentItemResource {
    id: string;
    title: string;
    type: string;
    file_url: string;
    duration_sec: number;
    resolution?: string | null;
    aspect_ratio?: string | null;
    metadata?: Record<string, unknown> | null;
    status: string;
    expires_at?: string | null;
    is_expired: boolean;
    creator: ContentCreator;
    created_at: string;
    updated_at: string;
}

export interface ContentDetailResponse {
    data: ContentItemResource;
}

// ==================== Playlist Types ====================

export interface PlaylistItemResource {
    id: string;
    content_item_id: string;
    order: number;
    duration?: number | null;
    duration_override?: number | null;
    content: ContentItemResource;
}

export interface PlaylistResource {
    id: string;
    name: string;
    description?: string | null;
    repeat: boolean;
    items: PlaylistItemResource[];
    created_at: string;
    updated_at: string;
}

export interface PlaylistDetailResponse {
    data: PlaylistResource;
}

// ==================== Weather Types ====================

export interface Weather {
    temperature: number;
    windspeed: number;
    winddirection: number;
    weathercode: number;
    is_day: number;
    time: string;
}

// ==================== Manifest Types ====================

export interface ManifestResponse {
    device_id: string;
    layout?: Record<string, unknown> | null;
    playlist?: PlaylistResource | null;
    weather?: Weather | null;
}

// ==================== Manager Types ====================

export interface ManagerLoginRequest {
    phone: string;
    password: string;
}

export interface BuildingManagerResource {
    id: string;
    name: string;
    phone: string;
    email?: string | null;
    created_at: string;
}

export interface ManagerLoginResponse {
    status: string;
    message: string;
    data: {
        token: string;
        manager: BuildingManagerResource;
    };
}

export interface ManagerDevicesResponse {
    status: string;
    message: string;
    data: DeviceResource[];
}

export interface ManagerDeviceResponse {
    status: string;
    data: DeviceResource;
}

export interface ManagerUpdateAnnouncementRequest {
    title?: string;
    message?: string;
    type?: "info" | "warning" | "emergency" | "maintenance";
    priority?: "low" | "medium" | "high" | "urgent";
    duration_sec?: number;
    display_count?: number;
    is_scrolling?: boolean;
    start_date?: string;
    end_date?: string | null;
    active_hours?: {
        start?: string;
        end?: string;
    } | null;
    days_of_week?: number[] | null;
    recurrence_rules?: Array<Record<string, unknown>> | null;
    exception_dates?: string[] | null;
    status?: "active" | "inactive" | "archived";
    metadata?: Record<string, unknown> | null;
}

export interface ManagerAnnouncementRequest {
    title: string;
    message: string;
    type?: AnnouncementType;
    priority?: AnnouncementPriority;
    duration_sec?: number;
    display_count?: number;
    is_scrolling?: boolean;
    start_date: string;
    end_date?: string | null;
    active_hours?: {
        start?: string;
        end?: string;
    } | null;
    days_of_week?: number[] | null;
    recurrence_rules?: Array<Record<string, unknown>> | null;
    exception_dates?: string[] | null;
    status?: AnnouncementStatus;
    metadata?: Record<string, unknown> | null;
}

export interface ManagerAnnouncementResponse {
    status: string;
    message: string;
    data: AnnouncementResource;
}

export interface ManagerUpdateDeviceRequest {
    name?: string;
    theme?: "classic" | "modern" | "cyber" | "minimal" | "elegant";
    emergency_enabled?: boolean;
    emergency_text?: string;
    emergency_text_color?: string;
    emergency_bg_color?: string;
    text_category_ids?: string[];
}

// ==================== Device Update Types ====================

export interface UpdateDeviceRequest {
    name?: string;
    theme?: "classic" | "modern" | "cyber" | "minimal" | "elegant";
    background_file?: File;
    night_background?: File;
}

export interface UpdateDeviceResponse {
    status: string;
    message: string;
    data: DeviceResource;
}

// ==================== Emergency Types ====================

export interface EmergencyResponse {
    enabled: boolean;
    text?: string | null;
    text_color?: string | null;
    bg_color?: string | null;
}

// ==================== Text Snippet Types ====================

export interface TextCategoryResource {
    id: string;
    name: string;
    description?: string | null;
    created_at: string;
    updated_at: string;
}

export interface TextSnippetResource {
    id: string;
    text?: string | null;
    body?: string | null;
    text_category_id?: string | null;
    category_name?: string | null;
    category?: TextCategoryResource | null;
    title?: string | null;
    author?: string | null;
    source?: string | null;
    is_active?: boolean;
    status?: "active" | "inactive";
    created_at?: string;
    updated_at?: string;
}

export interface TextSnippetResponse {
    data: TextSnippetResource;
}

// ==================== Contacts Response Types ====================

export interface ContactsResponse {
    status: string;
    data: {
        contacts: ContactResource[];
    };
}
