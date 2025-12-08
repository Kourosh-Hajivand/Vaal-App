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
    },
} as const;
