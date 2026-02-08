/**
 * Device Info Hooks
 * دریافت اطلاعات device، contacts، snippets با cache support
 */
import { useState, useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { deviceService } from "@/src/services/device.service";
import { tokenStorage } from "@/src/utils/token-storage";
import { loadLastDeviceData, saveLastDeviceData } from "@/src/utils/storage/playlistStorage";
import type { ContactResource, DeviceAuthResponse } from "@/src/types/api.types";

export const useDeviceInfo = () => {
    const [hasToken, setHasToken] = useState(false);
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

            // چک کردن token
            const token = await tokenStorage.get();
            setHasToken(!!token);
            console.log("[useDeviceInfo] 🔑 Token:", token ? "EXISTS" : "NOT FOUND");
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
        staleTime: 10 * 1000, // 10 seconds
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // فقط برای اولین render از cache استفاده کن
        placeholderData: () => {
            return cachedDataRef.current || undefined;
        },
        // هر 10 ثانیه refetch کن
        refetchInterval: 10 * 1000,
        refetchIntervalInBackground: true,
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
    const [hasToken, setHasToken] = useState(false);

    // چک کردن token
    useEffect(() => {
        tokenStorage.get().then((token) => setHasToken(!!token));
    }, []);

    const query = useQuery({
        queryKey: ["device", "snippet", "random"],
        queryFn: async () => {
            console.log("[useRandomSnippet] 🔄 Fetching random snippet...");
            const data = await deviceService.getRandomSnippet();
            console.log("[useRandomSnippet] ✅ Got random snippet");
            return data;
        },
        enabled: hasToken,
        staleTime: 10 * 1000, // 10 seconds
        retry: 1,
        // هر 5 دقیقه refetch کن برای snippet جدید
        refetchInterval: 5 * 60 * 1000,
    });

    return {
        data: query.data || null,
        isLoading: query.isLoading,
    };
};
