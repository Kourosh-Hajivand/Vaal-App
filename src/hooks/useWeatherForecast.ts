/**
 * Hook پیش‌بینی آب‌وهوا — OpenWeather، لوکیشن ثابت تهران
 * امروز + ۴ روز بعد — با persistent cache برای آفلاین
 */
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { weatherForecastService } from "@/src/services/weatherForecast.service";
import { saveWeatherForecast, loadWeatherForecast } from "@/src/utils/storage/weatherStorage";
import { useOnlineStatus } from "./use-online-status";

const QUERY_KEY = ["weather", "forecast"] as const;

const TEHRAN_LAT = 35.6892;
const TEHRAN_LON = 51.3890;

export interface UseWeatherForecastOptions {
    enabled?: boolean;
    staleTimeMs?: number;
}

export const useWeatherForecast = (options: UseWeatherForecastOptions = {}) => {
    const { enabled = true, staleTimeMs = 60 * 60 * 1000 } = options;
    const { isOnline } = useOnlineStatus();
    const cachedDataRef = useRef<Awaited<ReturnType<typeof weatherForecastService.getForecast>> | null>(null);
    const [cacheLoaded, setCacheLoaded] = useState(false);

    // بلافاصله cached data رو لود کن
    useEffect(() => {
        const init = async () => {
            const cached = await loadWeatherForecast();
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
            try {
                const data = await weatherForecastService.getForecast(TEHRAN_LAT, TEHRAN_LON);
                console.log("[useWeatherForecast] ✅ موفق:", data?.length, "روز");
                // ذخیره در persistent cache
                if (data.length > 0) {
                    await saveWeatherForecast(data);
                    cachedDataRef.current = data;
                }
                return data;
            } catch (e) {
                console.warn("[useWeatherForecast] ❌ خطا در queryFn:", e);
                throw e;
            }
        },
        enabled: enabled && cacheLoaded,
        staleTime: staleTimeMs,
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        retry: 2,
        retryDelay: (i) => Math.min(1000 * 2 ** i, 10000),
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
        forecast: query.data ?? cachedDataRef.current ?? [],
    };
};
