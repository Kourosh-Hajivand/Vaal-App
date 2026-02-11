/**
 * Hook پیش‌بینی آب‌وهوا — OpenWeather، لوکیشن ثابت تهران
 * امروز + ۴ روز بعد
 */
import { useQuery } from "@tanstack/react-query";
import { weatherForecastService } from "@/src/services/weatherForecast.service";

const QUERY_KEY = ["weather", "forecast"] as const;

const TEHRAN_LAT = 35.6892;
const TEHRAN_LON = 51.3890;

export interface UseWeatherForecastOptions {
    enabled?: boolean;
    staleTimeMs?: number;
}

export const useWeatherForecast = (options: UseWeatherForecastOptions = {}) => {
    const { enabled = true, staleTimeMs = 60 * 60 * 1000 } = options;

    const query = useQuery({
        queryKey: QUERY_KEY,
        queryFn: async () => {
            try {
                const data = await weatherForecastService.getForecast(TEHRAN_LAT, TEHRAN_LON);
                console.log("[useWeatherForecast] ✅ موفق:", data?.length, "روز");
                return data;
            } catch (e) {
                console.warn("[useWeatherForecast] ❌ خطا در queryFn:", e);
                throw e;
            }
        },
        enabled,
        staleTime: staleTimeMs,
        gcTime: 24 * 60 * 60 * 1000,
        retry: 2,
        retryDelay: (i) => Math.min(1000 * 2 ** i, 10000),
    });

    return {
        ...query,
        forecast: query.data ?? [],
    };
};
