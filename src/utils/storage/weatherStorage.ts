/**
 * Weather Storage — Persistent cache برای آب‌وهوا
 * کش کردن پیش‌بینی و آب‌وهوای امروز برای استفاده آفلاین
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { DayForecast } from "@/src/types/weather.types";
import type { CurrentWeather } from "@/src/services/weatherForecast.service";

const WEATHER_FORECAST_KEY = "@weather_forecast_cache";
const WEATHER_CURRENT_KEY = "@weather_current_cache";
const CACHE_TIMESTAMP_KEY = "@weather_cache_timestamp";

interface CachedForecast {
    data: DayForecast[];
    timestamp: number;
}

interface CachedCurrent {
    data: CurrentWeather;
    timestamp: number;
}

/**
 * ذخیره پیش‌بینی ۴ روزه در AsyncStorage
 */
export const saveWeatherForecast = async (forecast: DayForecast[]): Promise<void> => {
    try {
        const cached: CachedForecast = {
            data: forecast,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(WEATHER_FORECAST_KEY, JSON.stringify(cached));
        await AsyncStorage.setItem(CACHE_TIMESTAMP_KEY, String(Date.now()));
        console.log("[WeatherStorage] 💾 Forecast cached:", forecast.length, "روز");
    } catch (error) {
        console.error("[WeatherStorage] Error saving forecast:", error);
    }
};

/**
 * بارگذاری پیش‌بینی از cache
 */
export const loadWeatherForecast = async (): Promise<DayForecast[] | null> => {
    try {
        const stored = await AsyncStorage.getItem(WEATHER_FORECAST_KEY);
        if (!stored) return null;
        const cached: CachedForecast = JSON.parse(stored);
        // اگر cache قدیمی‌تر از ۲۴ ساعت باشه، null برگردون
        const age = Date.now() - cached.timestamp;
        if (age > 24 * 60 * 60 * 1000) {
            console.log("[WeatherStorage] ⚠️ Forecast cache expired");
            return null;
        }
        console.log("[WeatherStorage] ✅ Forecast loaded from cache:", cached.data.length, "روز");
        return cached.data;
    } catch (error) {
        console.error("[WeatherStorage] Error loading forecast:", error);
        return null;
    }
};

/**
 * ذخیره آب‌وهوای امروز در AsyncStorage
 */
export const saveCurrentWeather = async (current: CurrentWeather): Promise<void> => {
    try {
        const cached: CachedCurrent = {
            data: current,
            timestamp: Date.now(),
        };
        await AsyncStorage.setItem(WEATHER_CURRENT_KEY, JSON.stringify(cached));
        console.log("[WeatherStorage] 💾 Current weather cached:", current.temp, "°");
    } catch (error) {
        console.error("[WeatherStorage] Error saving current weather:", error);
    }
};

/**
 * بارگذاری آب‌وهوای امروز از cache
 */
export const loadCurrentWeather = async (): Promise<CurrentWeather | null> => {
    try {
        const stored = await AsyncStorage.getItem(WEATHER_CURRENT_KEY);
        if (!stored) return null;
        const cached: CachedCurrent = JSON.parse(stored);
        // اگر cache قدیمی‌تر از ۲ ساعت باشه، null برگردون
        const age = Date.now() - cached.timestamp;
        if (age > 2 * 60 * 60 * 1000) {
            console.log("[WeatherStorage] ⚠️ Current weather cache expired");
            return null;
        }
        console.log("[WeatherStorage] ✅ Current weather loaded from cache:", cached.data.temp, "°");
        return cached.data;
    } catch (error) {
        console.error("[WeatherStorage] Error loading current weather:", error);
        return null;
    }
};
