/**
 * Weather Widget
 * نمایش آب و هوا
 */
import React from "react";
import { View, StyleSheet } from "react-native";
import { Image } from "expo-image";
import { CustomText } from "../shared/CustomText";
import { useDeviceManifest } from "@/src/hooks/device/useDeviceManifest";
import { useTheme } from "@/src/contexts/ThemeContext";

export const Weather: React.FC = () => {
    const { data: manifest } = useDeviceManifest();
    const { colors } = useTheme();
    const weather = manifest?.weather;

    if (!weather) return null;

    // Get weather icon URL
    const getWeatherIcon = (icon: string): string => {
        return `https://openweathermap.org/img/wn/${icon}@4x.png`;
    };

    return (
        <View style={styles.container}>
            {weather.icon && (
                <View style={[styles.iconContainer, { backgroundColor: "red" }]}>
                    <Image source={{ uri: getWeatherIcon(weather.icon) }} style={styles.icon} contentFit="contain" cachePolicy="memory-disk" />
                </View>
            )}
            <CustomText fontType="Michroma" weight="Regular" size={16} applyThemeColor={true}>
                {weather.temperature}°
            </CustomText>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    iconContainer: {
        width: 24,
        height: 24,
        // backgroundColor dynamic از theme
        borderRadius: 12,
        overflow: "hidden",
        alignItems: "center",
        justifyContent: "center",
    },
    icon: {
        width: 24,
        height: 24,
    },
    temperatureText: {
        // color dynamic از theme
    },
});
