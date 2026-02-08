/**
 * Export تمام hooks
 */

// Device hooks
export {
    useRegisterDevice,
    useActivateDevice,
    useDeviceAuth,
    useResetDevice,
    useDeviceAnnouncements,
    useDeviceManifest,
    useDeviceWeather,
    useDeviceInfo,
    useUpdateDevice,
    useDeviceEmergency,
    useRandomSnippet,
    useDeviceCategories,
    useDeviceContacts,
    deviceKeys,
} from "./device/use-device";

// Announcement hooks
export { useAnnouncement, announcementKeys } from "./announcement/use-announcement";

// Content hooks
export { useContent, contentKeys } from "./content/use-content";

// Playlist hooks
export { usePlaylist, playlistKeys } from "./playlist/use-playlist";

// Device Token hook
export { useDeviceToken } from "./use-device-token";

// Online Status hook
export { useOnlineStatus } from "./use-online-status";

// ⚠️ Manager hooks حذف شدن چون این app فقط device است (React Native)
// Manager hooks فقط برای web dashboard (Next.js) لازم هستن
