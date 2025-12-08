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
        try {
            const token = await tokenStorage.get();

            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            console.error("Error getting token in interceptor:", error);
        }

        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    },
);

// Response Interceptor - برای handle کردن refresh token
axiosInstance.interceptors.response.use(
    (response: any) => response,
    async (error: AxiosError) => {
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
