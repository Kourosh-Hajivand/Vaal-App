/**
 * Clock Component
 * Displays current Iran time, day of week, and weather
 * Shows Emergency component if emergency mode is enabled
 */
import React, { useEffect, useState, useMemo } from "react";
import { View, StyleSheet, ActivityIndicator } from "react-native";
import { Image } from "expo-image";
import { CustomText } from "../shared/CustomText";
import { ThemedView } from "../shared/ThemedView";
import { Weather } from "./Weather";
import { AnnouncementList } from "./AnnouncementList";
import { ContactsBar } from "./ContactsBar";
import CloudLayer from "./CloudLayer";
import { Emergency } from "./Emergency";
import { useDeviceInfo, useRandomSnippet } from "@/src/hooks/device/useDeviceInfo";
import { getIranTime, getPersianDayOfMonth, getPersianDayOfWeek, getPersianMonthName, isDayTime } from "@/src/utils/time/iranTime";
import { useTheme } from "@/src/contexts/ThemeContext";
import Svg, { Path } from "react-native-svg";
import { BlurView } from "expo-blur";

const formatTimeWithoutSeconds = (date: Date): string => {
    let hours = date.getHours();
    const minutes = date.getMinutes().toString().padStart(2, "0");
    const ampm = hours >= 12 ? "PM" : "AM";

    hours = hours % 12;
    hours = hours ? hours : 12;

    const hoursStr = hours.toString().padStart(2, "0");
    return `${hoursStr}:${minutes} ${ampm}`;
};

export const Clock: React.FC = () => {
    const [time, setTime] = useState<Date>(getIranTime());
    const [imageError, setImageError] = useState(false);
    const [contentWidth, setContentWidth] = useState(0);
    const { colors, isDark } = useTheme();

    const { data: device, isLoading } = useDeviceInfo();
    const { data: randomSnippet, isLoading: isLoadingSnippet } = useRandomSnippet();

    useEffect(() => {
        const timer = setInterval(() => {
            setTime(getIranTime());
        }, 1000);

        return () => clearInterval(timer);
    }, []);

    // Emergency mode
    const emergency = device?.emergency;
    const emergencyEnabled = emergency?.enabled ?? device?.emergency_enabled ?? false;

    // Background images
    const backgroundUrl = device?.background_url;
    const nightBackgroundUrl = device?.night_background_url;
    const isDay = isDayTime(time);

    const backgroundImage = useMemo(() => {
        if (isDay && backgroundUrl) return backgroundUrl;
        if (!isDay && nightBackgroundUrl) return nightBackgroundUrl;
        return backgroundUrl || nightBackgroundUrl || null;
    }, [isDay, backgroundUrl, nightBackgroundUrl]);

    // If emergency mode is enabled
    if (emergencyEnabled) {
        return <Emergency emergencyText={emergency?.text || device?.emergency_text} textColor={emergency?.text_color || device?.emergency_text_color} bgColor={emergency?.bg_color || device?.emergency_bg_color} />;
    }

    // Loading state
    if (isLoading) {
        return (
            <View style={[styles.loadingContainer, { backgroundColor: colors.cardBackground }]}>
                <ActivityIndicator size="large" color={colors.info || "#2962FF"} />
            </View>
        );
    }

    return (
        <ThemedView style={[styles.container, { borderColor: colors.border }]}>
            {/* Background image */}
            {backgroundImage && !imageError && (
                <View style={styles.backgroundContainer}>
                    <Image source={{ uri: backgroundImage }} style={styles.backgroundImage} contentFit="cover" transition={300} cachePolicy="memory-disk" onError={() => setImageError(true)} priority="normal" />
                </View>
            )}

            {/* Gradient fallback - رنگ بر اساس theme */}
            {(!backgroundImage || imageError) && <View style={[styles.gradientFallback, { backgroundColor: "transparent" }]} />}

            {/* Content Container */}
            <View style={styles.contentContainer} onLayout={(e) => setContentWidth(e.nativeEvent.layout.width)}>
                {contentWidth > 0 && <CloudLayer contentWidth={contentWidth} />}
                {/* Header: Building info */}
                <View style={styles.header}>
                    <CustomText fontType="YekanBakh" weight="Regular" size={12} style={{ color: "white" }}>
                        {device?.building?.manager_name ? `مدیریت ${device.building.manager_name}` : ""}
                    </CustomText>
                    <CustomText fontType="YekanBakh" weight="Regular" size={12} style={{ color: "white" }}>
                        {device?.building?.name ? `ساختمان ${device.building.name}` : ""}
                    </CustomText>
                </View>

                {/* Main content */}
                <View style={styles.mainContent}>
                    {/* Time - بدون ثانیه */}
                    <CustomText fontType="Michroma" weight="Regular" size={33}>
                        {formatTimeWithoutSeconds(time)}
                    </CustomText>

                    {/* Date & Weather */}

                    <View style={[styles.dateWeather, { backgroundColor: isDark ? "#192634" : "#F8F8F8" }]}>
                        <Weather />
                        <View style={styles.dateContainer}>
                            <View style={styles.dateRow}>
                                <CustomText fontType="YekanBakh" weight="Regular" size={12}>
                                    {getPersianMonthName(time)}
                                </CustomText>
                                <CustomText fontType="Michroma" weight="Regular" size={12} style={{ bottom: 3 }}>
                                    {getPersianDayOfMonth(time)}
                                </CustomText>
                            </View>
                            <CustomText fontType="YekanBakh" weight="Regular" size={12}>
                                {getPersianDayOfWeek(time)}
                            </CustomText>
                        </View>
                    </View>

                    {/* Announcements */}
                    <AnnouncementList />

                    {/* Random snippet */}
                    {!isLoadingSnippet && randomSnippet && (randomSnippet.body || randomSnippet.text) && (
                        <View style={styles.snippetContainer}>
                            <View style={styles.snippetBubble}>
                                <CustomText fontType="YekanBakh" weight="Regular" size={10} style={styles.snippetText}>
                                    {randomSnippet.body || randomSnippet.text || ""}
                                </CustomText>
                                {/* Tail SVG */}
                                <View style={styles.snippetTail}>
                                    <Svg width={9} height={11} viewBox="0 0 9 11" fill="none">
                                        <Path d="M4.91406 5.27637C5.4467 6.84091 6.34858 8.31835 7.83594 9.9209C8.04831 10.15 7.89036 10.5287 7.57812 10.5215C5.48083 10.4707 2.43355 10.1705 0.230469 8.59668C0.169557 8.55309 0.12924 8.49193 0.108398 8.4248H0V0H4.91406V5.27637Z" fill="#FD5C02" />
                                    </Svg>
                                </View>
                            </View>
                        </View>
                    )}
                </View>

                {/* Footer: Contacts */}
                <ContactsBar />
            </View>
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 14,
        borderWidth: 1,
        overflow: "hidden",
        minHeight: 400,
    },
    backgroundContainer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 14,
        overflow: "hidden",
    },
    backgroundImage: {
        width: "100%",
        height: "100%",
        borderRadius: 14,
        overflow: "hidden",
    },
    gradientFallback: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
    },
    contentContainer: {
        flex: 1,
        paddingVertical: 24,

        paddingHorizontal: 14,
        justifyContent: "space-between",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        width: "100%",
        zIndex: 10,
    },

    mainContent: {
        flex: 1,
        alignItems: "center",
        gap: 0,
        marginTop: 0,
        width: "100%",
        zIndex: 10,
    },
    dateWeather: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        gap: 9,
        borderRadius: 99,
        paddingRight: 10,
        // paddingLeft: 2,
        overflow: "hidden",
        paddingLeft: 10,
        paddingVertical: 2,
    },
    dateContainer: {
        flexDirection: "row",
        alignItems: "center",
        gap: 8,
    },
    dateRow: {
        flexDirection: "row",
        alignItems: "center",
        gap: 3,
    },
    snippetContainer: {
        width: "100%",
        alignItems: "flex-end",
        marginTop: 12,
    },
    snippetBubble: {
        backgroundColor: "#FD5C02",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        maxWidth: "90%",
        position: "relative",
    },
    snippetText: {
        color: "#FFF5E6",
        textAlign: "right",
    },
    snippetTail: {
        position: "absolute",
        right: -3.2,
        bottom: -1,
    },
});
