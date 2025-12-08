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
        const response = await axiosInstance.post<DeviceRegisterResponse>(routes.devices.register(), data);
        return response.data;
    },

    /**
     * Activate device and get token
     */
    activate: async (data: ActivateDeviceRequest) => {
        const response = await axiosInstance.post<DeviceActivateResponse>(routes.devices.activate(), data);
        return response.data;
    },

    /**
     * Authenticate device with token
     */
    auth: async () => {
        const response = await axiosInstance.post<DeviceAuthResponse>(routes.devices.auth());
        return response.data;
    },

    /**
     * Reset a device
     */
    reset: async () => {
        const response = await axiosInstance.post<{ message?: string }>(routes.devices.reset());
        return response.data;
    },
};
