/**
 * Device Info Hooks
 * دریافت اطلاعات device، contacts، snippets با cache support
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { deviceService } from "@/src/services/device.service";
import { useDeviceToken } from "@/src/hooks/use-device-token";
import { useOnlineStatus } from "@/src/hooks/use-online-status";
import { loadLastDeviceData, saveLastDeviceData } from "@/src/utils/storage/playlistStorage";
import type { ContactResource, DeviceAuthResponse } from "@/src/types/api.types";

export const useDeviceInfo = () => {
    const { hasToken } = useDeviceToken(); // استفاده از reactive hook
    const { isOnline } = useOnlineStatus(); // برای چک کردن online بودن
    const cachedDataRef = useRef<DeviceAuthResponse | null>(null);
    const [cacheLoaded, setCacheLoaded] = useState(false);

    // بلافاصله cached data رو لود کن (فقط یکبار)
    useEffect(() => {
        const init = async () => {
            console.log("[useDeviceInfo] 📂 Loading cached device data...");
            const cached = await loadLastDeviceData();
            if (cached) {
                console.log("[useDeviceInfo] ✅ Cached device data found");
                cachedDataRef.current = cached;
            } else {
                console.log("[useDeviceInfo] ⚠️ No cached device data");
            }
            setCacheLoaded(true);
        };

        init();
    }, []);

    const query = useQuery({
        queryKey: ["device", "auth"],
        queryFn: async () => {
            console.log("[useDeviceInfo] 🔄 Fetching device data from server...");
            const data = await deviceService.auth();
            console.log("[useDeviceInfo] ✅ Got fresh device data from server");
            return data;
        },
        enabled: hasToken && cacheLoaded,
        staleTime: 5 * 1000, // همیشه 5 ثانیه
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // فقط برای اولین render از cache استفاده کن
        placeholderData: () => {
            return cachedDataRef.current || undefined;
        },
        // همیشه هر 5 ثانیه refetch کن (در دیباگ و production)
        refetchInterval: hasToken && isOnline ? 5 * 1000 : false,
        refetchIntervalInBackground: false,
        // وقتی آنلاین شد، refetch کن
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
    });

    // Save to cache when new data arrives از server
    useEffect(() => {
        if (query.data && !query.isPlaceholderData) {
            console.log("[useDeviceInfo] 💾 Saving FRESH device data to cache");
            saveLastDeviceData(query.data);
            cachedDataRef.current = query.data;
        }
    }, [query.data, query.isPlaceholderData]);

    // CRITICAL: اولویت با query.data (آخرین دیتا از server)
    const deviceData = query.data || cachedDataRef.current || null;

    return {
        ...query,
        data: deviceData,
        isLoadingCache: !cacheLoaded,
    };
};

// Note: useDeviceContacts moved to src/hooks/device/useDeviceContacts.ts

export const useRandomSnippet = (): { data: any; isLoading: boolean } => {
    const { hasToken } = useDeviceToken(); // استفاده از reactive hook
    const { isOnline } = useOnlineStatus(); // برای چک کردن online بودن

    const query = useQuery({
        queryKey: ["device", "snippet", "random"],
        queryFn: async () => {
            console.log("[useRandomSnippet] 🔄 Fetching random snippet...");
            const data = await deviceService.getRandomSnippet();
            console.log("[useRandomSnippet] ✅ Got random snippet");
            return data;
        },
        enabled: hasToken,
        staleTime: 5 * 1000, // همیشه 5 ثانیه
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        retry: 1,
        // همیشه هر 5 ثانیه refetch کن (در دیباگ و production)
        refetchInterval: hasToken && isOnline ? 5 * 1000 : false,
        refetchIntervalInBackground: false,
    });

    return {
        data: query.data || null,
        isLoading: query.isLoading,
    };
};
