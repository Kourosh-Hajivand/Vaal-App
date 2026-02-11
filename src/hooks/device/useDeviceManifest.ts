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
import { tokenStorage } from "@/src/utils/token-storage";
import { loadLastManifest, saveLastManifest } from "@/src/utils/storage/playlistStorage";
import type { ManifestResponse } from "@/src/types/api.types";

export const useDeviceManifest = () => {
    const [hasToken, setHasToken] = useState(false);
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

            // چک کردن token
            const token = await tokenStorage.get();
            setHasToken(!!token);
            console.log("[useDeviceManifest] 🔑 Token:", token ? "EXISTS" : "NOT FOUND");
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
        staleTime: 10 * 1000, // 10 seconds
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // فقط برای اولین render از cache استفاده کن
        placeholderData: () => {
            // فقط اگر هنوز query.data نداریم، از cache استفاده کن
            return cachedManifestRef.current || undefined;
        },
        // هر 10 ثانیه refetch کن
        refetchInterval: 10 * 1000,
        refetchIntervalInBackground: true,
    });

    // Save to cache when new data arrives از server
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
    useEffect(() => {
        if (manifest) {
            console.log("[useDeviceManifest] 📊 Current manifest:", {
                playlistId: manifest.playlist?.id,
                itemsCount: manifest.playlist?.items?.length || 0,
                source: query.data ? "SERVER" : "CACHE",
            });
        }
    }, [manifest?.playlist?.id, query.data]);

    return {
        ...query,
        data: manifest,
        playlist: manifest?.playlist,
        weather: manifest?.weather,
        isLoadingCache: !cacheLoaded,
    };
};
