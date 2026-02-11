import * as React from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { deviceService } from "@/src/services/device.service";
import { tokenStorage } from "@/src/utils/token-storage";
import { useDeviceToken } from "../use-device-token";
import { useOnlineStatus } from "../use-online-status";
import { getGcTime, getStaleTime } from "@/src/utils/cache-config";
import type { RegisterDeviceRequest, ActivateDeviceRequest, UpdateDeviceRequest } from "@/src/types/api.types";

/**
 * Query Keys برای device
 */
export const deviceKeys = {
    all: ["device"] as const,
    info: () => [...deviceKeys.all, "info"] as const,
    announcements: () => [...deviceKeys.all, "announcements"] as const,
    manifest: () => [...deviceKeys.all, "manifest"] as const,
    weather: () => [...deviceKeys.all, "weather"] as const,
    emergency: () => [...deviceKeys.all, "emergency"] as const,
    snippet: () => [...deviceKeys.all, "snippet"] as const,
    categories: () => [...deviceKeys.all, "categories"] as const,
    contacts: () => [...deviceKeys.all, "contacts"] as const,
} as const;

/**
 * Hook برای register کردن device
 */
export const useRegisterDevice = () => {
    return useMutation({
        mutationFn: async (data: RegisterDeviceRequest) => {
            return await deviceService.register(data);
        },
    });
};

/**
 * Hook برای activate کردن device
 */
export const useActivateDevice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: ActivateDeviceRequest) => {
            const response = await deviceService.activate(data);
            // ذخیره token بعد از activate
            if (response.token) {
                await tokenStorage.save(response.token);
            }
            return response;
        },
        onSuccess: () => {
            // بعد از activate، manifest رو invalidate کن
            queryClient.invalidateQueries({ queryKey: deviceKeys.manifest() });
        },
    });
};

/**
 * Hook برای authenticate کردن device
 */
export const useDeviceAuth = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await deviceService.auth();
            // ذخیره token بعد از auth (اگر جدید باشه)
            if (response.token) {
                await tokenStorage.save(response.token);
            }
            return response;
        },
        onSuccess: () => {
            // بعد از auth، queries رو invalidate کن
            queryClient.invalidateQueries({ queryKey: deviceKeys.all });
        },
    });
};

/**
 * Hook برای reset کردن device
 */
export const useResetDevice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async () => {
            const response = await deviceService.reset();
            // حذف token بعد از reset
            await tokenStorage.remove();
            return response;
        },
        onSuccess: () => {
            // بعد از reset، همه queries رو clear کن
            queryClient.clear();
        },
    });
};

/**
 * Hook برای دریافت announcements
 */
export const useDeviceAnnouncements = (enabled: boolean = true) => {
    const { hasToken } = useDeviceToken();

    return useQuery({
        queryKey: deviceKeys.announcements(),
        queryFn: async () => {
            const response = await deviceService.getAnnouncements();
            return response.data;
        },
        enabled: enabled && hasToken,
        retry: (failureCount, error: any) => {
            if (typeof navigator !== "undefined" && !navigator.onLine) {
                return false;
            }
            if (error?.response?.status === 401 || error?.response?.status === 403) {
                return false;
            }
            return failureCount < 5;
        },
        staleTime: 10 * 1000, // 10 seconds - باید کمتر از refetchInterval باشه
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        placeholderData: (previousData) => previousData,
        throwOnError: false,
        // غیرفعال کردن refetchInterval - فقط از staleTime استفاده می‌کنیم
        refetchInterval: false, // کاملاً غیرفعال برای جلوگیری از infinite loop
        refetchIntervalInBackground: false,
    });
};

/**
 * Hook برای دریافت manifest
 * فقط وقتی token موجود است، query رو فعال می‌کنه
 */
export const useDeviceManifest = () => {
    const { hasToken } = useDeviceToken();
    const { isOnline } = useOnlineStatus();
    const queryClient = useQueryClient();

    // Force refetch وقتی hasToken تغییر کرد (fallback)
    React.useEffect(() => {
        if (hasToken) {
            console.log("[useDeviceManifest] hasToken changed to true, forcing refetch");
            const timer = setTimeout(() => {
                queryClient.refetchQueries({ queryKey: deviceKeys.manifest() });
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [hasToken, queryClient]);

    return useQuery({
        queryKey: deviceKeys.manifest(),
        queryFn: async () => {
            console.log("[useDeviceManifest] 🔄 Fetching manifest from server...");
            const data = await deviceService.getManifest();
            console.log("[useDeviceManifest] ✅ Got fresh manifest from server");
            return data;
        },
        enabled: hasToken,
        retry: (failureCount, error: any) => {
            if (typeof navigator !== "undefined" && !navigator.onLine) {
                return false;
            }
            if (error?.response?.status === 401 || error?.response?.status === 403) {
                return false;
            }
            return failureCount < 5;
        },
        staleTime: 5 * 1000, // همیشه 5 ثانیه
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        refetchOnWindowFocus: false,
        refetchOnReconnect: true,
        // حذف placeholderData تا data جدید همیشه نمایش داده بشه
        throwOnError: false,
        // همیشه هر 5 ثانیه refetch کن (در دیباگ و production)
        refetchInterval: hasToken && isOnline ? 5 * 1000 : false,
        refetchIntervalInBackground: false,
    });
};

/**
 * Hook برای دریافت weather
 */
export const useDeviceWeather = () => {
    const { hasToken } = useDeviceToken();

    return useQuery({
        queryKey: deviceKeys.weather(),
        queryFn: async () => {
            return await deviceService.getWeather();
        },
        enabled: hasToken,
        retry: 5,
        staleTime: 60 * 1000,
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        // غیرفعال کردن refetchInterval - فقط از staleTime استفاده می‌کنیم
        refetchInterval: false, // کاملاً غیرفعال برای جلوگیری از infinite loop
    });
};

/**
 * Hook برای دریافت اطلاعات device (به صورت query)
 * @param enabled - اگر false باشد، query call نمی‌شود
 */
export const useDeviceInfo = (enabled: boolean = true) => {
    const { hasToken } = useDeviceToken();

    return useQuery({
        queryKey: deviceKeys.info(),
        queryFn: async () => {
            return await deviceService.auth();
        },
        enabled: enabled && hasToken,
        retry: (failureCount, error: any) => {
            if (error?.response?.status === 401) {
                return false;
            }
            return failureCount < 5;
        },
        staleTime: 60 * 1000,
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        placeholderData: (previousData) => previousData,
        throwOnError: false,
        // غیرفعال کردن refetchInterval - فقط از staleTime استفاده می‌کنیم
        refetchInterval: false, // کاملاً غیرفعال برای جلوگیری از infinite loop
    });
};

/**
 * Hook برای آپدیت کردن device
 */
export const useUpdateDevice = () => {
    const queryClient = useQueryClient();

    return useMutation({
        mutationFn: async (data: UpdateDeviceRequest) => {
            return await deviceService.update(data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: deviceKeys.all });
        },
    });
};

/**
 * Hook برای دریافت emergency configuration
 */
export const useDeviceEmergency = () => {
    const { hasToken } = useDeviceToken();

    return useQuery({
        queryKey: deviceKeys.emergency(),
        queryFn: async () => {
            return await deviceService.getEmergency();
        },
        enabled: hasToken,
        retry: 5,
        staleTime: 5 * 60 * 1000,
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        // غیرفعال کردن refetchInterval - فقط از staleTime استفاده می‌کنیم
        refetchInterval: false, // کاملاً غیرفعال برای جلوگیری از infinite loop
    });
};

/**
 * Hook برای دریافت random text snippet
 * @param enabled - اگر false باشد، query call نمی‌شود
 */
export const useRandomSnippet = (enabled: boolean = true) => {
    const { hasToken } = useDeviceToken();

    return useQuery({
        queryKey: deviceKeys.snippet(),
        queryFn: async () => {
            return await deviceService.getRandomSnippet();
        },
        enabled: enabled && hasToken,
        retry: (failureCount, error: any) => {
            if (error?.response?.status === 401) {
                return false;
            }
            return failureCount < 3;
        },
        staleTime: 5 * 60 * 1000, // 5 minutes
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        // غیرفعال کردن refetchInterval - فقط از staleTime استفاده می‌کنیم
        refetchInterval: false, // کاملاً غیرفعال برای جلوگیری از infinite loop
    });
};

/**
 * Hook برای دریافت لیست categories
 */
export const useDeviceCategories = () => {
    const { hasToken } = useDeviceToken();

    return useQuery({
        queryKey: deviceKeys.categories(),
        queryFn: async () => {
            return await deviceService.getCategories();
        },
        enabled: hasToken,
        retry: 3,
        staleTime: 5 * 60 * 1000,
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        // غیرفعال کردن refetchInterval - فقط از staleTime استفاده می‌کنیم
        refetchInterval: false, // کاملاً غیرفعال برای جلوگیری از infinite loop
    });
};

/**
 * Hook برای دریافت contacts دستگاه
 * @param enabled - اگر false باشد، query call نمی‌شود
 */
export const useDeviceContacts = (enabled: boolean = true) => {
    const { hasToken } = useDeviceToken();

    return useQuery({
        queryKey: deviceKeys.contacts(),
        queryFn: async () => {
            return await deviceService.getContacts();
        },
        enabled: enabled && hasToken,
        retry: (failureCount, error: any) => {
            if (error?.response?.status === 401) {
                return false;
            }
            return failureCount < 3;
        },
        staleTime: 2 * 60 * 1000,
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        // غیرفعال کردن refetchInterval - فقط از staleTime استفاده می‌کنیم
        refetchInterval: false, // کاملاً غیرفعال برای جلوگیری از infinite loop
    });
};
