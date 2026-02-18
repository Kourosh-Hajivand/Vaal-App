import axios, { AxiosError, AxiosInstance, AxiosRequestConfig, AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { tokenStorage } from "./token-storage";
import { pairCodeService } from "@/src/services/pairCodeService";

// Base URL - باید از env variable استفاده بشه
const BASE_URL = process.env.NEXT_PUBLIC_API_URL || process.env.EXPO_PUBLIC_API_URL || "https://api-vaal.pixlink.ir";

// ایجاد axios instance
export const axiosInstance: AxiosInstance = axios.create({
    baseURL: BASE_URL,
    timeout: 30000,
    headers: {
        "Content-Type": "application/json",
    },
});

// ============================================================================
// Logging Helpers
// ============================================================================

const formatRequestForLog = (config: AxiosRequestConfig) => {
    const method = (config.method || "GET").toUpperCase();
    const url = config.url || "";
    const fullUrl = config.baseURL && config.url ? `${config.baseURL}${config.url}` : config.url || "Unknown";

    let requestBody = null;
    if (config.data) {
        if (config.data instanceof FormData) {
            requestBody = "[FormData - Multipart]";
        } else if (typeof config.data === "string") {
            try {
                requestBody = JSON.parse(config.data);
            } catch {
                requestBody = config.data;
            }
        } else {
            requestBody = config.data;
        }
    }

    return {
        method,
        url: fullUrl,
        endpoint: url,
        headers: config.headers,
        params: config.params,
        body: requestBody,
    };
};

const formatResponseForLog = (response: AxiosResponse) => {
    const method = (response.config?.method || "GET").toUpperCase();
    const url = response.config?.url || "";
    const fullUrl = response.config?.baseURL && response.config?.url ? `${response.config.baseURL}${response.config.url}` : response.config?.url || "Unknown";

    return {
        method,
        url: fullUrl,
        endpoint: url,
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
        data: response.data,
    };
};

const formatErrorForLog = (error: AxiosError) => {
    const method = (error.config?.method || "GET").toUpperCase();
    const url = error.config?.url || "";
    const fullUrl = error.config?.baseURL ? `${error.config.baseURL}${url}` : url;

    if (error.response) {
        interface ErrorResponseData {
            message?: string;
            exception?: string;
            [key: string]: unknown;
        }
        const response = error.response;
        const responseData = response.data as ErrorResponseData | undefined;
        return {
            method,
            url: fullUrl,
            endpoint: url,
            status: response.status,
            statusText: response.statusText,
            headers: response.headers,
            data: response.data,
            message: responseData?.message || responseData?.exception || error.message,
        };
    } else if (error.request) {
        return {
            method,
            url: fullUrl,
            endpoint: url,
            error: "No Response",
            message: error.message,
        };
    } else {
        return {
            method,
            url: fullUrl,
            endpoint: url,
            error: "Request Setup Error",
            message: error.message,
        };
    }
};

// ============================================================================
// Request Interceptor
// ============================================================================

axiosInstance.interceptors.request.use(
    async (config: InternalAxiosRequestConfig) => {
        try {
            // دریافت token از tokenStorage (SecureStore / AsyncStorage)
            const token = await tokenStorage.get();

            if (token && config.headers) {
                config.headers.Authorization = `Bearer ${token}`;
            }
        } catch (error) {
            // console.error("Error getting token in interceptor:", error);
        }

        // Log request - TEMPORARILY COMMENTED FOR VIDEO DEBUGGING
        // if (__DEV__) {
        //     const requestInfo = formatRequestForLog(config);
        //     console.group(`🌐 [${requestInfo.method}] ${requestInfo.endpoint}`);
        //     console.log("📍 Full URL:", requestInfo.url);
        //     console.log("📤 Request Headers:", requestInfo.headers);
        //     if (requestInfo.params) {
        //         console.log("🔗 Query Params:", requestInfo.params);
        //     }
        //     if (requestInfo.body) {
        //         console.log("📦 Request Body:", requestInfo.body);
        //     }
        //     console.groupEnd();
        // }

        return config;
    },
    (error: AxiosError) => {
        return Promise.reject(error);
    },
);

// ============================================================================
// Response Interceptor
// ============================================================================

axiosInstance.interceptors.response.use(
    (response) => {
        // Log response - TEMPORARILY COMMENTED FOR VIDEO DEBUGGING
        if (__DEV__) {
            const responseInfo = formatResponseForLog(response);
            const statusColor = responseInfo.status >= 200 && responseInfo.status < 300 ? "✅" : responseInfo.status >= 300 && responseInfo.status < 400 ? "⚠️" : "❌";

            console.group(`${statusColor} [${responseInfo.method}] ${responseInfo.endpoint} - ${responseInfo.status} ${responseInfo.statusText}`);
            console.log("📍 Full URL:", responseInfo.url);
            console.log("📥 Response Data:", responseInfo.data);
            console.groupEnd();
        }

        return response;
    },
    async (error: AxiosError) => {
        const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

        // Log error - TEMPORARILY COMMENTED FOR VIDEO DEBUGGING
        if (__DEV__) {
            const errorInfo = formatErrorForLog(error);
            console.group(`❌ [${errorInfo.method}] ${errorInfo.endpoint} - Error`);
            console.log("📍 Full URL:", errorInfo.url);
            if (error.response) {
                console.log("📥 Status:", errorInfo.status, errorInfo.statusText);
                console.log("📥 Response Data:", errorInfo.data);
                console.log("💬 Error Message:", errorInfo.message);
            } else if (error.request) {
                console.log("⚠️ No Response Received");
                console.log("💬 Error Message:", errorInfo.message);
            } else {
                console.log("⚠️ Request Setup Error");
                console.log("💬 Error Message:", errorInfo.message);
            }
            console.groupEnd();
        }

        // اگر 401 بود - توکن و pair code رو پاک کن و reject کن
        if (error.response?.status === 401) {
            console.log("❌ [Axios] 401 Unauthorized - Removing token and pair code...");
            // Token و pair code رو حذف می‌کنیم (async - بدون await برای جلوگیری از blocking)
            tokenStorage.remove().catch(() => {});
            pairCodeService.remove().catch(() => {});
            return Promise.reject(error);
        }

        // Handle server errors (500, 503, 504) - retry با exponential backoff
        const status = error.response?.status;
        if (status !== undefined && status >= 500 && status < 600) {
            const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

            if (!originalRequest._retry) {
                originalRequest._retry = true;
                originalRequest._retryCount = 0;
            }

            originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

            // Max 3 retries برای server errors
            if (originalRequest._retryCount <= 3) {
                const delay = Math.min(1000 * Math.pow(2, originalRequest._retryCount - 1), 10000); // Exponential backoff, max 10s
                console.warn(`[Axios] Server error ${status}, retrying in ${delay}ms (attempt ${originalRequest._retryCount}/3)`);

                await new Promise((resolve) => setTimeout(resolve, delay));
                return axiosInstance(originalRequest);
            }
        }

        // Handle network errors (timeout, no connection)
        if (!error.response && error.request) {
            const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean; _retryCount?: number };

            if (!originalRequest._retry) {
                originalRequest._retry = true;
                originalRequest._retryCount = 0;
            }

            originalRequest._retryCount = (originalRequest._retryCount || 0) + 1;

            // Max 2 retries برای network errors
            if (originalRequest._retryCount <= 2) {
                const delay = 2000 * originalRequest._retryCount; // Linear backoff: 2s, 4s
                console.warn(`[Axios] Network error, retrying in ${delay}ms (attempt ${originalRequest._retryCount}/2)`);

                await new Promise((resolve) => setTimeout(resolve, delay));
                return axiosInstance(originalRequest);
            }
        }

        return Promise.reject(error);
    },
);
