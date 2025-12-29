import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { tokenStorage } from "./token-storage";

// Base URL - باید از env variable استفاده بشه
// برای development: http://localhost:8000
// برای staging: https://api-vaal.pixlink.co
const BASE_URL = process.env.EXPO_PUBLIC_API_URL || "https://api-vaal.pixlink.co";

// ایجاد axios instance
export const axiosInstance: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 10000,
    headers: {
        "Content-Type": "application/json",
    },
});

// Request Interceptor - برای اضافه کردن token
axiosInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        const fullUrl = `${config.baseURL}${config.url}`;
        console.log(`📤 [HTTP] ${config.method?.toUpperCase()} ${fullUrl}`);
        if (config.data) {
            console.log("📤 [HTTP] Request Body:", JSON.stringify(config.data, null, 2));
        }

        try {
            const token = await tokenStorage.get();
            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
                console.log("🔑 [HTTP] Authorization header added");
            }
        } catch (error) {
            console.error("❌ [AXIOS] Error getting token in interceptor:", error);
        }

        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    },
);

// Response Interceptor - برای handle کردن refresh token
axiosInstance.interceptors.response.use(
    (response: any) => {
        const fullUrl = `${response.config?.baseURL}${response.config?.url}`;
        console.log(`✅ [HTTP] ${response.config?.method?.toUpperCase()} ${fullUrl} - Status: ${response.status}`);
        console.log("📥 [HTTP] Response:", JSON.stringify(response.data, null, 2));
        return response;
    },
    async (error: AxiosError) => {
        const fullUrl = `${error.config?.baseURL}${error.config?.url}`;
        const status = error.response?.status || "NO STATUS";
        console.error(`❌ [HTTP] ${error.config?.method?.toUpperCase()} ${fullUrl} - Status: ${status}`);
        if (error.response?.data) {
            console.error("❌ [HTTP] Error Response:", JSON.stringify(error.response.data, null, 2));
        } else {
            console.error("❌ [HTTP] Error Message:", error.message);
        }

        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // اگر 401 بود و قبلاً retry نکردیم
        if (error.response?.status === 401 && !originalRequest._retry) {
            originalRequest._retry = true;

            try {
                // TODO: refresh token logic
                // const newToken = await refreshToken();
                // await saveTokenToStorage(newToken);

                // retry original request
                if (originalRequest.headers) {
                    // originalRequest.headers.Authorization = `Bearer ${newToken}`;
                }

                return axiosInstance(originalRequest);
            } catch (refreshError) {
                // TODO: logout user
                return Promise.reject(refreshError);
            }
        }

        return Promise.reject(error);
    },
);
