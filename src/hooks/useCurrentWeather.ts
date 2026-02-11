/**
 * Hook آب‌وهوای لحظه‌ای امروز — OpenWeather Current Weather
 */
import { useQuery } from "@tanstack/react-query";
import { weatherForecastService } from "@/src/services/weatherForecast.service";

const QUERY_KEY = ["weather", "current"] as const;
const TEHRAN_LAT = 35.6892;
const TEHRAN_LON = 51.3890;

export const useCurrentWeather = (options: { enabled?: boolean; staleTimeMs?: number } = {}) => {
    const { enabled = true, staleTimeMs = 10 * 60 * 1000 } = options; // 10 دقیقه

    const query = useQuery({
        queryKey: QUERY_KEY,
        queryFn: () => weatherForecastService.getCurrentWeather(TEHRAN_LAT, TEHRAN_LON),
        enabled,
        staleTime: staleTimeMs,
        gcTime: 30 * 60 * 1000,
        retry: 1,
    });

    return query;
};
