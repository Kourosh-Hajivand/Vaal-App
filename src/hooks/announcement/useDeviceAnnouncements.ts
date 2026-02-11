/**
 * Device Announcements Hook
 * دریافت لیست اطلاعیه‌های دستگاه با cache support
 */
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { deviceService } from "@/src/services/device.service";
import { tokenStorage } from "@/src/utils/token-storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { AnnouncementResource } from "@/src/types/api.types";

const CACHE_KEY = "@device_announcements";

// Helper functions برای cache
const loadCachedAnnouncements = async (): Promise<AnnouncementResource[] | null> => {
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
        return null;
    } catch (error) {
        console.error("[useDeviceAnnouncements] Error loading cache:", error);
        return null;
    }
};

const saveCachedAnnouncements = async (data: AnnouncementResource[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("[useDeviceAnnouncements] Error saving cache:", error);
    }
};

export const useDeviceAnnouncements = () => {
    const [hasToken, setHasToken] = useState(false);
    const cachedDataRef = useRef<AnnouncementResource[] | null>(null);
    const [cacheLoaded, setCacheLoaded] = useState(false);

    // بلافاصله cached data رو لود کن (فقط یکبار)
    useEffect(() => {
        const init = async () => {
            console.log("[useDeviceAnnouncements] 📂 Loading cached announcements...");
            const cached = await loadCachedAnnouncements();
            if (cached) {
                console.log("[useDeviceAnnouncements] ✅ Cached announcements found:", cached.length);
                cachedDataRef.current = cached;
            } else {
                console.log("[useDeviceAnnouncements] ⚠️ No cached announcements");
            }
            setCacheLoaded(true);

            // چک کردن token
            const token = await tokenStorage.get();
            setHasToken(!!token);
            console.log("[useDeviceAnnouncements] 🔑 Token:", token ? "EXISTS" : "NOT FOUND");
        };

        init();
    }, []);

    const query = useQuery({
        queryKey: ["device", "announcements"],
        queryFn: async () => {
            console.log("[useDeviceAnnouncements] 🔄 Fetching announcements from server...");
            const response = await deviceService.getAnnouncements();
            const announcements = response.data || [];
            console.log("[useDeviceAnnouncements] ✅ Got announcements from server:", announcements.length);
            return announcements;
        },
        enabled: hasToken && cacheLoaded,
        staleTime: 10 * 1000, // 10 seconds
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // فقط برای اولین render از cache استفاده کن
        placeholderData: () => {
            return cachedDataRef.current || undefined;
        },
        // هر 30 ثانیه refetch کن
        refetchInterval: 30 * 1000,
        refetchIntervalInBackground: true,
        // وقتی آنلاین شد، refetch کن
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
    });

    // Save to cache when new data arrives از server
    useEffect(() => {
        if (query.data && !query.isPlaceholderData) {
            console.log("[useDeviceAnnouncements] 💾 Saving announcements to cache");
            saveCachedAnnouncements(query.data);
            cachedDataRef.current = query.data;
        }
    }, [query.data, query.isPlaceholderData]);

    // CRITICAL: اولویت با query.data (آخرین دیتا از server)
    const announcements = query.data || cachedDataRef.current || [];

    return {
        ...query,
        data: announcements,
        isLoadingCache: !cacheLoaded,
    };
};
