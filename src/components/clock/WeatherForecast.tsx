/**
 * پیش‌بینی آب‌وهوا — امروز + ۴ روز بعد
 * آیکون‌ها: customIcons (ReactNode) یا iconSources (تصویر) — هر دو اختیاری
 */
import React from "react";
import { View, StyleSheet, ActivityIndicator, ImageSourcePropType } from "react-native";
import { Image } from "expo-image";
import { CustomText } from "../shared/CustomText";
import { useWeatherForecast } from "@/src/hooks/useWeatherForecast";
import { weatherCodeToCategory } from "@/src/services/weatherForecast.service";
import { getWeatherIcon } from "@/src/constants/weatherIcons";
import { useTheme } from "@/src/contexts/ThemeContext";
import type { DayForecast } from "@/src/types/weather.types";
import type { WeatherCodeCategory } from "@/src/types/weather.types";

/** کلیدهای وضعیت هوا برای ست کردن آیکون (همین نام‌ها را به iconSources یا customIcons بده) */
export const WEATHER_ICON_KEYS: WeatherCodeCategory[] = ["clear", "partly-cloudy", "cloudy", "fog", "drizzle", "rain", "snow", "thunderstorm", "unknown"];

const DEFAULT_ICONS: Record<WeatherCodeCategory, string> = {
    clear: "☀️",
    "partly-cloudy": "⛅",
    cloudy: "☁️",
    fog: "🌫️",
    drizzle: "🌧️",
    rain: "🌧️",
    snow: "❄️",
    thunderstorm: "⛈️",
    unknown: "🌤️",
};

/** توضیح وضعیت هوا به فارسی — مطابق Figma Vaal (۲۶۶۶-۷۹۴) */
const WEATHER_DESCRIPTION_FA: Record<WeatherCodeCategory, string> = {
    clear: "آفتابی",
    "partly-cloudy": "ابری آفتابی",
    cloudy: "ابری",
    fog: "مه",
    drizzle: "نم‌نم باران",
    rain: "بارانی",
    snow: "برفی",
    thunderstorm: "رعد و برق",
    unknown: "متغیر",
};

export interface WeatherForecastProps {
    /** آیکون سفارشی (کامپوننت) به‌ازای هر دسته */
    customIcons?: Partial<Record<WeatherCodeCategory, React.ReactNode>>;
    /** آیکون به‌صورت تصویر: منبع هر دسته (require یا { uri }) — اولویت بعد از customIcons */
    iconSources?: Partial<Record<WeatherCodeCategory, ImageSourcePropType>>;
    /** عرض هر کارت روز (اختیاری) */
    itemStyle?: object;
    /** غیرفعال کردن fetch */
    enabled?: boolean;
    /** اندازهٔ آیکون تصویری (عرض و ارتفاع) */
    iconSize?: number;
}

/** مطابق Figma Vaal — Frame 773/780/787/794 */
const DEFAULT_ICON_SIZE = 35;

export const WeatherForecast: React.FC<WeatherForecastProps> = ({ customIcons, iconSources, itemStyle, enabled = true, iconSize = DEFAULT_ICON_SIZE }) => {
    const { isDark } = useTheme();
    const { forecast, isLoading, isError, error } = useWeatherForecast({
        enabled,
        staleTimeMs: 60 * 60 * 1000,
    });

    if (!enabled) return null;

    if (isLoading) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="small" color="rgba(255,255,255,0.8)" />
                <CustomText fontType="YekanBakh" weight="Regular" size={11} style={styles.loadingText}>
                    در حال بارگذاری پیش‌بینی آب‌وهوا…
                </CustomText>
            </View>
        );
    }

    if (isError || !forecast.length) {
        // لاگ برای دیباگ: علت نمایش پیام خطا
        const errMsg = error instanceof Error ? error.message : String(error);
        const errStack = error instanceof Error ? error.stack : undefined;
        console.warn("[WeatherForecast] خطا یا دیتای خالی:", {
            isError,
            forecastLength: forecast?.length ?? 0,
            errorMessage: errMsg,
            ...(errStack && { stack: errStack }),
        });
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <CustomText fontType="YekanBakh" weight="Regular" size={11} style={styles.errorText}>
                    امکان بارگذاری پیش‌بینی آب‌وهوا نیست
                </CustomText>
            </View>
        );
    }

    const getIcon = (code: number): React.ReactNode => {
        const category = weatherCodeToCategory(code);
        const customNode = customIcons?.[category];
        if (customNode != null) return customNode;
        const source = iconSources?.[category] ?? getWeatherIcon(category, isDark);
        if (source != null) return <Image source={source} style={[styles.customIcon, { width: iconSize, height: iconSize }]} contentFit="contain" cachePolicy="memory-disk" />;
        return (
            <CustomText fontType="YekanBakh" weight="Regular" size={16} style={styles.emoji}>
                {DEFAULT_ICONS[category] ?? DEFAULT_ICONS.unknown}
            </CustomText>
        );
    };

    const displayDays = [...forecast.slice(0, 4)].reverse();

    const getDescription = (code: number) => WEATHER_DESCRIPTION_FA[weatherCodeToCategory(code)] ?? WEATHER_DESCRIPTION_FA.unknown;

    return (
        <View style={styles.container}>
            {displayDays.map((day) => (
                <DayItem key={day.date} day={day} getIcon={getIcon} getDescription={getDescription} itemStyle={itemStyle} />
            ))}
        </View>
    );
};

const DayItem: React.FC<{
    day: DayForecast;
    getIcon: (code: number) => React.ReactNode;
    getDescription: (code: number) => string;
    itemStyle?: object;
}> = ({ day, getIcon, getDescription, itemStyle }) => {
    const { isDark } = useTheme();
    return (
        <View style={[styles.dayItem, itemStyle, { backgroundColor: isDark ? "rgba(0, 0, 0, 0.20)" : "#EBEBEB" }]}>
            <View style={[styles.iconCircle, { backgroundColor: isDark ? "rgba(0, 0, 0, 0.30)" : "#FFFFFF" }]}>{getIcon(day.weathercode)}</View>
            <CustomText fontType="YekanBakh" weight="Regular" size={10} style={[styles.dayLabel, { color: isDark ? "white" : "black" }]} numberOfLines={1}>
                {day.label}
            </CustomText>
            <CustomText fontType="YekanBakh" weight="SemiBold" size={10} style={[styles.weatherDesc, { color: isDark ? "white" : "black" }]} numberOfLines={1}>
                {getDescription(day.weathercode)}
            </CustomText>
            <CustomText fontType="Michroma" weight="Regular" size={11} style={[styles.temp, { color: isDark ? "white" : "black" }]}>
                {Math.round(day.tempMax)}°
            </CustomText>
        </View>
    );
};

const styles = StyleSheet.create({
    emoji: {
        color: "#fff",
    },
    customIcon: {
        resizeMode: "contain",
    },
    loadingText: {
        color: "rgba(255,255,255,0.9)",
        marginTop: 6,
    },
    errorText: {
        color: "rgba(255,255,255,0.75)",
    },
    loadingContainer: {
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },
    container: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        marginTop: 12,
        padding: 12,
        gap: 8,
    },
    dayItem: {
        flex: 1,
        alignItems: "center",
        justifyContent: "center",

        borderRadius: 99,
        padding: 12,
        height: 142,
    },
    iconCircle: {
        width: 45,
        height: 45,
        borderRadius: 99,
        backgroundColor: "rgba(0, 0, 0, 0.30)",
        alignItems: "center",
        justifyContent: "center",
        marginBottom: 6,
    },
    dayLabel: {
        color: "white",
        marginBottom: 2,
    },
    weatherDesc: {
        color: "white",
        marginBottom: 4,
        fontSize: 11,
    },
    temp: {
        color: "white",
        fontWeight: "500",
    },
});
