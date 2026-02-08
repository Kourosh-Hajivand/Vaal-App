/**
 * Clock Component
 * Displays current Iran time, day of week, and weather
 * Shows Emergency component if emergency mode is enabled
 */
import React, { useEffect, useState, useMemo } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { Image } from 'expo-image';
import { CustomText } from '../shared/CustomText';
import { ThemedView } from '../shared/ThemedView';
import { Weather } from './Weather';
import { AnnouncementList } from './AnnouncementList';
import { ContactsBar } from './ContactsBar';
import { Emergency } from './Emergency';
import { useDeviceInfo, useRandomSnippet } from '@/src/hooks/device/useDeviceInfo';
import { formatIranTime, getIranTime, getPersianDayOfMonth, getPersianDayOfWeek, getPersianMonthName, isDayTime } from '@/src/utils/time/iranTime';

export const Clock: React.FC = () => {
    const [time, setTime] = useState<Date>(getIranTime());
    const [imageError, setImageError] = useState(false);

    const { data: device, isLoading } = useDeviceInfo();
    const { data: randomSnippet, isLoading: isLoadingSnippet } = useRandomSnippet();

    // Update time every second
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
        return (
            <Emergency
                emergencyText={emergency?.text || device?.emergency_text}
                textColor={emergency?.text_color || device?.emergency_text_color}
                bgColor={emergency?.bg_color || device?.emergency_bg_color}
            />
        );
    }

    // Loading state
    if (isLoading) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#2962FF" />
            </View>
        );
    }

    return (
        <ThemedView style={styles.container}>
            {/* Background image */}
            {backgroundImage && !imageError && (
                <View style={styles.backgroundContainer}>
                    <Image
                        source={{ uri: backgroundImage }}
                        style={styles.backgroundImage}
                        contentFit="cover"
                        transition={300}
                        cachePolicy="memory-disk"
                        onError={() => setImageError(true)}
                        priority="normal"
                    />
                </View>
            )}

            {/* Gradient fallback */}
            {(!backgroundImage || imageError) && <View style={styles.gradientFallback} />}

            {/* Header: Building info */}
            <View style={styles.header}>
                <CustomText fontType="YekanBakh" weight="Regular" size={16} style={styles.headerText}>
                    {device?.building?.manager_name ? `مدیریت ${device.building.manager_name}` : ''}
                </CustomText>
                <CustomText fontType="YekanBakh" weight="Regular" size={16} style={styles.headerText}>
                    {device?.building?.name ? `ساختمان ${device.building.name}` : ''}
                </CustomText>
            </View>

            {/* Main content */}
            <View style={styles.mainContent}>
                {/* Time */}
                <CustomText fontType="Michroma" weight="Regular" size={38}>
                    {formatIranTime(time)}
                </CustomText>

                {/* Date & Weather */}
                <View style={styles.dateWeather}>
                    <Weather />
                    <View style={styles.dateContainer}>
                        <View style={styles.dateRow}>
                            <CustomText fontType="YekanBakh" weight="Regular" size={18}>
                                {getPersianMonthName(time)}
                            </CustomText>
                            <CustomText fontType="Michroma" weight="Regular" size={18} style={{ marginTop: -4 }}>
                                {getPersianDayOfMonth(time)}
                            </CustomText>
                        </View>
                        <CustomText fontType="YekanBakh" weight="Regular" size={16}>
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
                            <CustomText fontType="YekanBakh" weight="Regular" size={14} style={styles.snippetText}>
                                {randomSnippet.body || randomSnippet.text || ''}
                            </CustomText>
                        </View>
                    </View>
                )}
            </View>

            {/* Footer: Contacts */}
            <ContactsBar />
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: '#DADADA',
        paddingVertical: 24,
        paddingHorizontal: 28,
        overflow: 'hidden',
        minHeight: 400,
    },
    backgroundContainer: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        borderRadius: 16,
        overflow: 'hidden',
    },
    backgroundImage: {
        width: '100%',
        height: '100%',
    },
    gradientFallback: {
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: '#FFF5E6',
    },
    loadingContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        width: '100%',
        zIndex: 10,
    },
    headerText: {
        opacity: 0.5,
    },
    mainContent: {
        flex: 1,
        alignItems: 'center',
        gap: 8,
        marginTop: 40,
        width: '100%',
        zIndex: 10,
    },
    dateWeather: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 16,
    },
    dateContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
    },
    dateRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
    },
    snippetContainer: {
        width: '100%',
        alignItems: 'flex-end',
        marginTop: 16,
    },
    snippetBubble: {
        backgroundColor: '#FD5C02',
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 12,
        maxWidth: '80%',
    },
    snippetText: {
        color: '#FFF5E6',
        textAlign: 'right',
    },
});
