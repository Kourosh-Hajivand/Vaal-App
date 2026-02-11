/**
 * آیکون‌های وضعیت آب‌وهوا — پشتیبانی از تم دارک و لایت
 * آیکون‌ها با الگوی {category}_{theme}.png نام‌گذاری شده‌اند
 */

import type { ImageSourcePropType } from "react-native";
import type { WeatherCodeCategory } from "@/src/types/weather.types";

/** منبع تصویر هر دسته */
export type WeatherIconSources = Partial<Record<WeatherCodeCategory, ImageSourcePropType>>;

/**
 * همه آیکون‌ها (dark + light) — require شده
 */
const WEATHER_ICONS = {
    // Dark theme
    clear_dark: require("../../assets/weather/clear_dark.png"),
    "partly-cloudy_dark": require("../../assets/weather/partly_cloudy_dark.png"),
    cloudy_dark: require("../../assets/weather/cloudy_dark.png"),
    fog_dark: require("../../assets/weather/fog_dark.png"),
    drizzle_dark: require("../../assets/weather/drizzle_dark.png"),
    rain_dark: require("../../assets/weather/rain_dark.png"),
    snow_dark: require("../../assets/weather/snow_dark.png"),
    thunderstorm_dark: require("../../assets/weather/thunderstorm_dark.png"),
    unknown_dark: require("../../assets/weather/unknown_dark.png"),

    // Light theme
    clear_light: require("../../assets/weather/clear_light.png"),
    "partly-cloudy_light": require("../../assets/weather/partly_cloudy_light.png"),
    cloudy_light: require("../../assets/weather/cloudy_light.png"),
    fog_light: require("../../assets/weather/fog_light.png"),
    drizzle_light: require("../../assets/weather/drizzle_light.png"),
    rain_light: require("../../assets/weather/rain_light.png"),
    snow_light: require("../../assets/weather/snow_light.png"),
    thunderstorm_light: require("../../assets/weather/thunderstorm_light.png"),
    unknown_light: require("../../assets/weather/unknown_light.png"),
} as const;

/**
 * دریافت آیکون آب‌وهوا بر اساس دسته و تم
 */
export function getWeatherIcon(category: WeatherCodeCategory, isDark: boolean): ImageSourcePropType | null {
    const theme = isDark ? "light" : "dark";
    const key = `${category}_${theme}` as keyof typeof WEATHER_ICONS;
    return WEATHER_ICONS[key] ?? null;
}

/**
 * آیکون‌های پیش‌بینی — برای backward compatibility (از تم فعلی استفاده می‌کنه)
 * @deprecated استفاده از getWeatherIcon با isDark توصیه می‌شه
 */
export const weatherIconSources: WeatherIconSources = {
    clear: WEATHER_ICONS.clear_light,
    "partly-cloudy": WEATHER_ICONS["partly-cloudy_light"],
    cloudy: WEATHER_ICONS.cloudy_light,
    fog: WEATHER_ICONS.fog_light,
    drizzle: WEATHER_ICONS.drizzle_light,
    rain: WEATHER_ICONS.rain_light,
    snow: WEATHER_ICONS.snow_light,
    thunderstorm: WEATHER_ICONS.thunderstorm_light,
    unknown: WEATHER_ICONS.unknown_light,
};
