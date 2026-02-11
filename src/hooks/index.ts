/**
 * Export تمام hooks
 */

// Device hooks
export { useRegisterDevice, useActivateDevice, useDeviceAuth, useResetDevice, useDeviceManifest, useDeviceWeather, useUpdateDevice, useDeviceEmergency, useDeviceCategories, deviceKeys } from "./device/use-device";

// Device hooks (separated for better organization)
export { useDeviceInfo, useRandomSnippet } from "./device/useDeviceInfo";
export { useDeviceContacts } from "./device/useDeviceContacts";

// Announcement hooks
export { useAnnouncement, announcementKeys } from "./announcement/use-announcement";
export { useDeviceAnnouncements } from "./announcement/useDeviceAnnouncements";

// Content hooks
export { useContent, contentKeys } from "./content/use-content";

// Playlist hooks
export { usePlaylist, playlistKeys } from "./playlist/use-playlist";

// Device Token hook
export { useDeviceToken } from "./use-device-token";

// Online Status hook
export { useOnlineStatus } from "./use-online-status";

// Update hooks — OTA (JS) + Native (APK)
export { useOTAUpdate } from "./useOTAUpdate";
export { useAppUpdate } from "./useAppUpdate";

// Weather forecast (OpenWeather, رایگان)
export { useWeatherForecast } from "./useWeatherForecast";
export { useCurrentWeather } from "./useCurrentWeather";

// ⚠️ Manager hooks حذف شدن چون این app فقط device است (React Native)
// Manager hooks فقط برای web dashboard (Next.js) لازم هستن
