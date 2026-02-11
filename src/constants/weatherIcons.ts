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
 * استفاده از asset index برای اطمینان از bundle شدن در production
 */
import { weatherIcons as WEATHER_ICONS_ASSETS } from "../assets";

const WEATHER_ICONS = WEATHER_ICONS_ASSETS as {
    clear_dark: any;
    "partly-cloudy_dark": any;
    cloudy_dark: any;
    fog_dark: any;
    drizzle_dark: any;
    rain_dark: any;
    snow_dark: any;
    thunderstorm_dark: any;
    unknown_dark: any;
    clear_light: any;
    "partly-cloudy_light": any;
    cloudy_light: any;
    fog_light: any;
    drizzle_light: any;
    rain_light: any;
    snow_light: any;
    thunderstorm_light: any;
    unknown_light: any;
};

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
