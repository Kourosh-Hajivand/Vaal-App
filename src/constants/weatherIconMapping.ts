/**
 * مپینگ آیکون‌های آب‌وهوا — تشخیص خودکار بر اساس نام فایل
 * آیکون‌های خود را در assets/weather بگذار و اینجا mapping را تنظیم کن
 */

import type { ImageSourcePropType } from "react-native";
import type { WeatherCodeCategory } from "@/src/types/weather.types";

/** کلیدواژه‌های احتمالی در نام فایل برای هر حالت */
const ICON_KEYWORDS: Record<WeatherCodeCategory, string[]> = {
    clear: ["clear", "sunny", "sun", "آفتابی", "آفتاب"],
    "partly-cloudy": ["partly", "partly-cloudy", "partly_cloudy", "partlycloudy", "نیمه", "نیمه-ابری", "ابری-آفتابی"],
    cloudy: ["cloudy", "cloud", "clouds", "ابری", "ابری"],
    fog: ["fog", "mist", "haze", "مه", "غبار"],
    drizzle: ["drizzle", "light-rain", "light_rain", "نم-نم", "نم‌نم"],
    rain: ["rain", "raining", "باران", "بارانی"],
    snow: ["snow", "snowy", "snowing", "برف", "برفی"],
    thunderstorm: ["thunder", "storm", "thunderstorm", "lightning", "رعد", "رعد-برق", "طوفان"],
    unknown: ["unknown", "default", "متغیر", "نامشخص"],
};

/**
 * تشخیص خودکار حالت آب‌وهوا بر اساس نام فایل
 */
export function detectWeatherCategory(filename: string): WeatherCodeCategory {
    const lower = filename.toLowerCase().replace(/[._-]/g, " ");
    for (const [category, keywords] of Object.entries(ICON_KEYWORDS)) {
        if (keywords.some((kw) => lower.includes(kw.toLowerCase()))) {
            return category as WeatherCodeCategory;
        }
    }
    return "unknown";
}

/**
 * ساخت mapping از یک object با نام فایل‌ها
 * مثال:
 *   const icons = {
 *     "sunny-day.png": require('...'),
 *     "rainy.png": require('...'),
 *   };
 *   const mapping = buildIconMapping(icons);
 */
export function buildIconMapping(
    iconFiles: Record<string, ImageSourcePropType>
): Partial<Record<WeatherCodeCategory, ImageSourcePropType>> {
    const mapping: Partial<Record<WeatherCodeCategory, ImageSourcePropType>> = {};
    for (const [filename, source] of Object.entries(iconFiles)) {
        const category = detectWeatherCategory(filename);
        if (!mapping[category]) {
            mapping[category] = source;
        }
    }
    return mapping;
}
