/**
 * تمام route های API در این فایل تعریف میشن
 * هر route یک function هست که path رو برمی‌گردونه
 */

export const routes = {
    devices: {
        register: () => "/api/devices/register",
        activate: () => "/api/devices/activate",
        auth: () => "/api/devices/auth",
        reset: () => "/api/devices/reset",
        update: () => "/api/devices/update",
        announcements: () => "/api/devices/announcements",
        manifest: () => "/api/devices/manifest",
        weather: () => "/api/devices/weather",
        emergency: () => "/api/devices/emergency",
        snippetsRandom: () => "/api/devices/snippets/random",
        categories: () => "/api/devices/categories",
        contacts: () => "/api/devices/contacts",
    },
    manager: {
        login: () => "/api/manager/login",
        devices: () => "/api/manager/devices",
        device: (id: string) => `/api/manager/devices/${id}`,
        deviceAnnouncements: (deviceId: string) => `/api/manager/devices/${deviceId}/announcements`,
        deviceAnnouncement: (deviceId: string, announcementId: string) => `/api/manager/devices/${deviceId}/announcements/${announcementId}`,
        deviceContacts: (deviceId: string) => `/api/manager/devices/${deviceId}/contacts`,
        categories: () => "/api/manager/categories",
    },
    announcements: {
        getById: (id: string) => `/api/announcements/${id}`,
    },
    content: {
        getById: (id: string) => `/api/content/${id}`,
    },
    playlists: {
        getById: (id: string) => `/api/playlists/${id}`,
    },
} as const;
