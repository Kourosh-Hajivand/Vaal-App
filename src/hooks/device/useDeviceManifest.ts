/**
 * useDeviceManifest Hook
 * Offline-First Strategy:
 * 1. بلافاصله cached manifest رو برمی‌گردونه
 * 2. در background manifest جدید رو fetch می‌کنه
 * 3. آخرین response از server همیشه اولویت داره
 */
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { deviceService } from "@/src/services/device.service";
import { loadLastManifest, saveLastManifest } from "@/src/utils/storage/playlistStorage";
import { useDeviceToken } from "@/src/hooks/use-device-token";
import { useOnlineStatus } from "@/src/hooks/use-online-status";
import type { ManifestResponse } from "@/src/types/api.types";

export const useDeviceManifest = () => {
    const { hasToken } = useDeviceToken(); // استفاده از reactive hook
    const { isOnline } = useOnlineStatus(); // برای چک کردن online بودن
    const cachedManifestRef = useRef<ManifestResponse | null>(null);
    const [cacheLoaded, setCacheLoaded] = useState(false);

    // بلافاصله cached manifest رو لود کن (فقط یکبار)
    useEffect(() => {
        const init = async () => {
            console.log("[useDeviceManifest] 📂 Loading cached manifest...");
            const cached = await loadLastManifest();
            if (cached) {
                console.log("[useDeviceManifest] ✅ Cached manifest found");
                cachedManifestRef.current = cached;
            } else {
                console.log("[useDeviceManifest] ⚠️ No cached manifest");
            }
            setCacheLoaded(true);
        };

        init();
    }, []);

    const query = useQuery({
        queryKey: ["device", "manifest"],
        queryFn: async () => {
            console.log("[useDeviceManifest] 🔄 Fetching manifest from server...");
            const data = await deviceService.getManifest();
            console.log("[useDeviceManifest] ✅ Got fresh manifest from server");
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
            // فقط اگر هنوز query.data نداریم، از cache استفاده کن
            return cachedManifestRef.current || undefined;
        },
        // همیشه هر 5 ثانیه refetch کن (در دیباگ و production)
        refetchInterval: hasToken && isOnline ? 5 * 1000 : false,
        refetchIntervalInBackground: false,
        // وقتی آنلاین شد، refetch کن
        refetchOnReconnect: true,
        refetchOnWindowFocus: false,
    });

    useEffect(() => {
        if (query.data && !query.isPlaceholderData) {
            console.log("[useDeviceManifest] 💾 Saving FRESH manifest to cache");
            saveLastManifest(query.data);
            cachedManifestRef.current = query.data;
        }
    }, [query.data, query.isPlaceholderData]);

    // CRITICAL: اولویت با query.data (آخرین دیتا از server)
    // فقط اگر query.data نداریم و هنوز cache load نشده، null برگردون
    const manifest = query.data || cachedManifestRef.current || null;

    // Log هر وقت manifest تغییر کرد

    // Log برای refetch status
    useEffect(() => {
        if (query.isFetching) {
            console.log("[useDeviceManifest] 🔄 Fetching manifest...");
        }
        if (query.isRefetching) {
            console.log("[useDeviceManifest] 🔄 Refetching manifest...");
        }
    }, [query.isFetching, query.isRefetching]);

    return {
        ...query,
        data: manifest,
        playlist: manifest?.playlist,
        weather: manifest?.weather,
        isLoadingCache: !cacheLoaded,
    };
};
