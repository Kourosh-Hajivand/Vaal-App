import { axiosInstance } from "@/src/utils/axios-instance";
import { routes } from "@/src/routes/routes";
import type {
    ApiResponse,
    DeviceResource,
    RegisterDeviceRequest,
    ActivateDeviceRequest,
    DeviceRegisterResponse,
    DeviceActivateResponse,
    DeviceAuthResponse,
    AnnouncementsListResponse,
    ManifestResponse,
    Weather,
    UpdateDeviceRequest,
    UpdateDeviceResponse,
    EmergencyResponse,
    TextSnippetResource,
    TextCategoryResource,
    ContactResource,
} from "@/src/types/api.types";

/**
 * Device Service
 * تمام API calls مربوط به devices
 *
 * توجه: چک کردن token توسط React Query hooks (با enabled: hasToken) انجام میشه
 * Service layer فقط HTTP calls رو انجام میده
 */

export const deviceService = {
    /**
     * Register a new device
     * API returns { data: DeviceResource, message, status } — برمی‌گردونیم data تا pair_code در دسترس باشه
     */
    register: async (data: RegisterDeviceRequest): Promise<DeviceResource> => {
        const response = await axiosInstance.post<ApiResponse<DeviceResource>>(routes.devices.register(), data);
        const apiResponse = response.data as ApiResponse<DeviceResource>;
        if (apiResponse?.data) {
            return apiResponse.data;
        }
        return response.data as unknown as DeviceResource;
    },

    /**
     * Activate device and get token
     * API returns { data: DeviceResource (با token), message, status } — برمی‌گردونیم data
     */
    activate: async (data: ActivateDeviceRequest): Promise<DeviceResource> => {
        const response = await axiosInstance.post<ApiResponse<DeviceResource>>(routes.devices.activate(), data);
        const apiResponse = response.data as ApiResponse<DeviceResource>;
        if (apiResponse?.data) {
            return apiResponse.data;
        }
        return response.data as unknown as DeviceResource;
    },

    /**
     * Authenticate device with token
     */
    auth: async () => {
        const response = await axiosInstance.post<ApiResponse<DeviceAuthResponse>>(routes.devices.auth());
        const apiResponse = response.data as ApiResponse<DeviceAuthResponse>;
        if (apiResponse?.data) {
            return apiResponse.data;
        }
        return response.data as unknown as DeviceAuthResponse;
    },

    /**
     * Reset a device
     */
    reset: async () => {
        const response = await axiosInstance.post<{ message?: string }>(routes.devices.reset());
        return response.data;
    },

    /**
     * Get active announcements for the authenticated device
     */
    getAnnouncements: async () => {
        const response = await axiosInstance.get<AnnouncementsListResponse>(routes.devices.announcements());
        return response.data;
    },

    /**
     * Get the current manifest for the authenticated device
     */
    getManifest: async () => {
        const response = await axiosInstance.get<ApiResponse<ManifestResponse>>(routes.devices.manifest());
        const apiResponse = response.data as ApiResponse<ManifestResponse>;
        if (apiResponse?.data) {
            return apiResponse.data;
        }
        return response.data as unknown as ManifestResponse;
    },

    /**
     * Get the current weather for the device's location
     */
    getWeather: async () => {
        const response = await axiosInstance.get<Weather>(routes.devices.weather());
        return response.data;
    },

    /**
     * Update device settings (name, theme, background, night_background)
     */
    update: async (data: UpdateDeviceRequest) => {
        const formData = new FormData();

        if (data.name) {
            formData.append("name", data.name);
        }
        if (data.theme) {
            formData.append("theme", data.theme);
        }
        if (data.background_file) {
            formData.append("background_file", data.background_file);
        }
        if (data.night_background) {
            formData.append("night_background", data.night_background);
        }

        const response = await axiosInstance.post<UpdateDeviceResponse>(routes.devices.update(), formData, {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        });
        return response.data;
    },

    /**
     * Get emergency mode configuration
     */
    getEmergency: async () => {
        const response = await axiosInstance.get<EmergencyResponse>(routes.devices.emergency());
        return response.data;
    },

    /**
     * Get a random text snippet
     */
    getRandomSnippet: async (): Promise<TextSnippetResource> => {
        const response = await axiosInstance.get<ApiResponse<TextSnippetResource>>(routes.devices.snippetsRandom());
        const apiResponse = response.data as ApiResponse<TextSnippetResource>;
        if (apiResponse?.data) {
            return apiResponse.data;
        }
        throw new Error("Failed to get random snippet");
    },

    /**
     * Get list of text categories
     */
    getCategories: async (): Promise<TextCategoryResource[]> => {
        const response = await axiosInstance.get<ApiResponse<TextCategoryResource[]>>(routes.devices.categories());
        const apiResponse = response.data as ApiResponse<TextCategoryResource[]>;
        if (apiResponse?.data) {
            return apiResponse.data;
        }
        return [];
    },

    /**
     * Get device contacts
     */
    getContacts: async (): Promise<ContactResource[]> => {
        const response = await axiosInstance.get(routes.devices.contacts());
        const apiResponse = response.data as ApiResponse<{ contacts: ContactResource[] }>;
        if (apiResponse?.data?.contacts) {
            return apiResponse.data.contacts;
        }
        if (Array.isArray(apiResponse?.data)) {
            return apiResponse.data as ContactResource[];
        }
        return [];
    },
};
