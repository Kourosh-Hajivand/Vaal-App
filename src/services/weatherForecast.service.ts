/**
 * سرویس پیش‌بینی آب‌وهوا — OpenWeather 5-day Forecast
 * https://openweathermap.org/forecast5
 */

import type { OpenWeatherForecastResponse, DayForecast, WeatherCodeCategory } from "@/src/types/weather.types";
import { getIranTime } from "@/src/utils/time/iranTime";

const OPENWEATHER_BASE_URL = "https://api.openweathermap.org/data/2.5";
const OPENWEATHER_API_KEY = (typeof process !== "undefined" && (process.env?.EXPO_PUBLIC_OPENWEATHER_API_KEY ?? process.env?.NEXT_PUBLIC_OPENWEATHER_API_KEY)) || "148a3d8d6c7e28f686f6e9fff23eea94";

const DEFAULT_LAT = 35.6892;
const DEFAULT_LON = 51.389;

const PERSIAN_DAY_NAMES = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنجشنبه", "جمعه", "شنبه"];

/** تبدیل کد وضعیت OpenWeather به WMO (برای آیکون یکسان با قبل) */
function openWeatherIdToWmo(id: number): number {
    if (id === 800) return 0; // clear
    if (id === 801) return 1;
    if (id === 802) return 2;
    if (id === 803 || id === 804) return 3;
    if (id >= 200 && id < 300) return 95; // thunderstorm
    if (id >= 300 && id < 400) return 53; // drizzle
    if (id >= 500 && id < 600) return 61; // rain
    if (id >= 600 && id < 700) return 71; // snow
    if (id >= 700 && id < 800) return 45; // fog/atmosphere
    return 3; // cloudy
}

export interface CurrentWeather {
    temp: number;
    weathercode: number;
    description: string;
}

export const weatherForecastService = {
    /**
     * آب‌وهوای لحظه‌ای امروز از OpenWeather Current Weather API
     */
    async getCurrentWeather(lat: number = DEFAULT_LAT, lon: number = DEFAULT_LON): Promise<CurrentWeather | null> {
        const url = new URL(`${OPENWEATHER_BASE_URL}/weather`);
        url.searchParams.set("lat", String(lat));
        url.searchParams.set("lon", String(lon));
        url.searchParams.set("appid", OPENWEATHER_API_KEY);
        url.searchParams.set("units", "metric");
        url.searchParams.set("lang", "fa");

        try {
            const res = await fetch(url.toString());
            if (!res.ok) return null;
            const data = await res.json();
            if (data.cod !== 200) return null;
            const weather = data.weather?.[0];
            return {
                temp: Math.round(data.main?.temp ?? 0),
                weathercode: openWeatherIdToWmo(weather?.id ?? 800),
                description: weather?.description ?? "",
            };
        } catch (err) {
            if (__DEV__) console.warn("[weatherForecast] getCurrentWeather failed:", err);
            return null;
        }
    },

    /**
     * پیش‌بینی ۵ روز (امروز + ۴ روز بعد) از OpenWeather
     */
    async getForecast(lat: number = DEFAULT_LAT, lon: number = DEFAULT_LON): Promise<DayForecast[]> {
        const url = new URL(`${OPENWEATHER_BASE_URL}/forecast`);
        url.searchParams.set("lat", String(lat));
        url.searchParams.set("lon", String(lon));
        url.searchParams.set("appid", OPENWEATHER_API_KEY);
        url.searchParams.set("units", "metric");
        url.searchParams.set("lang", "fa");

        try {
            if (__DEV__) console.log("[weatherForecast] درخواست OpenWeather:", url.toString().replace(OPENWEATHER_API_KEY, "***"));
            const res = await fetch(url.toString());
            if (!res.ok) {
                const body = await res.text();
                console.warn("[weatherForecast] پاسخ خطا:", res.status, res.statusText, body?.slice(0, 300));
                throw new Error(`Weather API error: ${res.status} ${res.statusText}`);
            }
            const data = (await res.json()) as OpenWeatherForecastResponse;
            if (data.cod !== "200" || !Array.isArray(data.list) || !data.list.length) {
                if (__DEV__) console.warn("[weatherForecast] پاسخ بدون list:", data);
                return [];
            }

            const daily = groupByDay(data.list);
            const labels = getDayLabels(daily.map((d) => d.date));

            return daily.map((day, i) => ({
                date: day.date,
                label: labels[i] ?? formatDayName(day.date),
                weathercode: openWeatherIdToWmo(day.weatherId),
                tempMax: day.tempMax,
                tempMin: day.tempMin,
            }));
        } catch (err) {
            if (__DEV__) console.warn("[weatherForecast] getForecast failed:", err instanceof Error ? err.message : err, err);
            throw err;
        }
    },
};

/** امروز به‌صورت YYYY-MM-DD در زمان تهران */
function getTodayTehranDateString(): string {
    const d = getIranTime();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
}

/** گروه‌بندی آیتم‌های ۳ ساعته به روز — فقط ۴ روز بعد از امروز (بدون امروز)، مرتب‌سازی بر اساس تاریخ */
function groupByDay(list: OpenWeatherForecastResponse["list"]): { date: string; tempMin: number; tempMax: number; weatherId: number }[] {
    const byDate: Record<string, { tempMin: number; tempMax: number; weatherIds: number[] }> = {};

    for (const item of list) {
        const dateStr = item.dt_txt.slice(0, 10); // YYYY-MM-DD از API
        if (!byDate[dateStr]) {
            byDate[dateStr] = { tempMin: item.main.temp_min, tempMax: item.main.temp_max, weatherIds: [] };
        } else {
            byDate[dateStr].tempMin = Math.min(byDate[dateStr].tempMin, item.main.temp_min);
            byDate[dateStr].tempMax = Math.max(byDate[dateStr].tempMax, item.main.temp_max);
        }
        const id = item.weather?.[0]?.id ?? 800;
        byDate[dateStr].weatherIds.push(id);
    }

    const todayTehran = getTodayTehranDateString();
    const entries = Object.entries(byDate).filter(([date]) => date > todayTehran);
    const sorted = entries.sort(([a], [b]) => a.localeCompare(b));
    const nextFourDays = sorted.slice(0, 4);

    return nextFourDays.map(([date, v]) => {
        const mid = Math.floor(v.weatherIds.length / 2);
        const weatherId = v.weatherIds[mid] ?? v.weatherIds[0] ?? 800;
        return { date, tempMin: v.tempMin, tempMax: v.tempMax, weatherId };
    });
}

/** برچسب برای ۴ روز بعد از امروز: فردا، سپس نام روزها (یکشنبه، دوشنبه، …) */
function getDayLabels(dates: string[]): string[] {
    return dates.map((d, i) => (i === 0 ? "فردا" : formatDayName(d)));
}

function formatDayName(isoDate: string): string {
    const d = new Date(isoDate + "T12:00:00");
    const day = d.getDay();
    return PERSIAN_DAY_NAMES[day] ?? isoDate;
}

/**
 * تبدیل کد وضعیت (WMO یا مشابه) به دسته برای انتخاب آیکون
 */
export function weatherCodeToCategory(code: number): WeatherCodeCategory {
    if (code === 0) return "clear";
    if (code >= 1 && code <= 3) return "partly-cloudy";
    if (code === 45 || code === 48) return "fog";
    if (code >= 51 && code <= 57) return "drizzle";
    if (code >= 51 && code <= 67) return "rain";
    if (code >= 71 && code <= 77) return "snow";
    if (code >= 80 && code <= 82) return "rain";
    if (code >= 85 && code <= 86) return "snow";
    if (code >= 95 && code <= 99) return "thunderstorm";
    return "cloudy";
}
