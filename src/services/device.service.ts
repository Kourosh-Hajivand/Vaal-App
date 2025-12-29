import { axiosInstance } from "@/src/utils/axios-instance";
import { routes } from "@/src/routes/routes";
import type { RegisterDeviceRequest, ActivateDeviceRequest, DeviceRegisterResponse, DeviceActivateResponse, DeviceAuthResponse, AnnouncementsListResponse, ManifestResponse, Weather } from "@/src/types/api.types";

/**
 * Device Service
 * تمام API calls مربوط به devices
 */

export const deviceService = {
    /**
     * Register a new device
     */
    register: async (data: RegisterDeviceRequest) => {
        const url = routes.devices.register();
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔵 [SERVICE] deviceService.register()");
        console.log("🔵 [SERVICE] URL:", url);
        console.log("🔵 [SERVICE] Request:", JSON.stringify(data, null, 2));
        const response = await axiosInstance.post<DeviceRegisterResponse>(url, data);
        console.log("🔵 [SERVICE] Response:", JSON.stringify(response.data, null, 2));
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return response.data;
    },

    /**
     * Activate device and get token
     */
    activate: async (data: ActivateDeviceRequest) => {
        const url = routes.devices.activate();
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🟢 [SERVICE] deviceService.activate()");
        console.log("🟢 [SERVICE] URL:", url);
        console.log("🟢 [SERVICE] Request:", JSON.stringify(data, null, 2));
        const response = await axiosInstance.post<DeviceActivateResponse>(url, data);
        console.log("🟢 [SERVICE] Response:", JSON.stringify(response.data, null, 2));
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return response.data;
    },

    /**
     * Authenticate device with token
     */
    auth: async () => {
        const url = routes.devices.auth();
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🟡 [SERVICE] deviceService.auth()");
        console.log("🟡 [SERVICE] URL:", url);
        console.log("🟡 [SERVICE] Request: (no body)");
        const response = await axiosInstance.post<DeviceAuthResponse>(url);
        console.log("🟡 [SERVICE] Response:", JSON.stringify(response.data, null, 2));
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return response.data;
    },

    /**
     * Reset a device
     */
    reset: async () => {
        const url = routes.devices.reset();
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        console.log("🔴 [SERVICE] deviceService.reset()");
        console.log("🔴 [SERVICE] URL:", url);
        console.log("🔴 [SERVICE] Request: (no body)");
        const response = await axiosInstance.post<{ message?: string }>(url);
        console.log("🔴 [SERVICE] Response:", JSON.stringify(response.data, null, 2));
        console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
        return response.data;
    },
};
