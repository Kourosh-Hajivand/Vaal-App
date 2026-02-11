/**
 * Hook آب‌وهوای لحظه‌ای امروز — OpenWeather Current Weather
 * با persistent cache برای آفلاین
 */
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { weatherForecastService } from "@/src/services/weatherForecast.service";
import { saveCurrentWeather, loadCurrentWeather } from "@/src/utils/storage/weatherStorage";
import { useOnlineStatus } from "./use-online-status";

const QUERY_KEY = ["weather", "current"] as const;
const TEHRAN_LAT = 35.6892;
const TEHRAN_LON = 51.3890;

export const useCurrentWeather = (options: { enabled?: boolean; staleTimeMs?: number } = {}) => {
    const { enabled = true, staleTimeMs = 10 * 60 * 1000 } = options; // 10 دقیقه
    const { isOnline } = useOnlineStatus();
    const cachedDataRef = useRef<Awaited<ReturnType<typeof weatherForecastService.getCurrentWeather>> | null>(null);
    const [cacheLoaded, setCacheLoaded] = useState(false);

    // بلافاصله cached data رو لود کن
    useEffect(() => {
        const init = async () => {
            const cached = await loadCurrentWeather();
            if (cached) {
                cachedDataRef.current = cached;
            }
            setCacheLoaded(true);
        };
        init();
    }, []);

    const query = useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            const data = await weatherForecastService.getCurrentWeather(TEHRAN_LAT, TEHRAN_LON);
            // ذخیره در persistent cache
            if (data) {
                await saveCurrentWeather(data);
                cachedDataRef.current = data;
            }
            return data;
        },
        enabled: enabled && cacheLoaded,
        staleTime: staleTimeMs,
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        retry: 1,
        placeholderData: cachedDataRef.current || undefined, // حذف function wrapper
        // غیرفعال کردن refetch خودکار - فقط manual refetch
        refetchOnReconnect: false,
        refetchOnWindowFocus: false,
        refetchInterval: false,
    });

    // حذف useEffect برای refetch - فقط از refetchOnReconnect استفاده می‌کنیم
    // این باعث میشه که query خودش وقتی online شد refetch کنه

    return {
        ...query,
        data: query.data ?? cachedDataRef.current,
    };
};
