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

export interface BuildingResource {
  id: string;
  name: string;
  manager_name?: string | null;
  manager_phone?: string | null;
  location?: Location | null;
  floors_count?: number | null;
  units_count?: number | null;
  address?: string | null;
  devices_count: number;
  devices?: DeviceResource[];
  created_at: string;
  updated_at: string;
}

export type DeviceStatus = 'pending' | 'active' | 'inactive';

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
  pair_code?: string; // Only visible when status is pending
  pair_expires_at?: string; // Only visible when status is pending
  token?: string; // Authentication token (only returned on activation/auth)
  created_at: string;
  updated_at: string;
}

export interface DeviceRegisterResponse {
  data: DeviceResource;
  status: string;
  message: string;
}

export interface DeviceActivateResponse {
  data: DeviceResource;
  status: string;
  message: string;
}

export interface DeviceAuthResponse {
  data: DeviceResource;
  status: string;
  message: string;
}

// ==================== Announcement Types ====================

export interface AnnouncementResource {
  id: string;
  title: string;
  message?: string | null;
  type: string;
  priority: number;
  duration_sec: number;
  display_count: number;
  is_scrolling: boolean;
  start_date?: string | null;
  end_date?: string | null;
  active_hours?: Record<string, unknown> | null;
  days_of_week?: number[] | null;
  status: string;
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

