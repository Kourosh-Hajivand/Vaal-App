/**
 * Announcement List Component
 * نمایش اطلاعیه‌ها با auto-scroll
 */
import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, ScrollView, Animated } from 'react-native';
import { CustomText } from '../shared/CustomText';
import { useQuery } from '@tanstack/react-query';
import { deviceService } from '@/src/services/device.service';

export const AnnouncementList: React.FC = () => {
    const scrollX = useRef(new Animated.Value(0)).current;
    const scrollViewRef = useRef<ScrollView>(null);

    const { data: announcementsData } = useQuery({
        queryKey: ['announcements'],
        queryFn: deviceService.getAnnouncements,
        staleTime: 5 * 60 * 1000, // 5 minutes
    });

    const announcements = announcementsData?.data || [];

    // Auto-scroll effect
    useEffect(() => {
        if (announcements.length <= 1) return;

        const scrollInterval = setInterval(() => {
            scrollViewRef.current?.scrollTo({
                x: scrollX._value + 200,
                animated: true,
            });
        }, 3000);

        return () => clearInterval(scrollInterval);
    }, [announcements, scrollX]);

    if (!announcements.length) return null;

    return (
        <View style={styles.container}>
            <ScrollView
                ref={scrollViewRef}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
                onScroll={Animated.event([{ nativeEvent: { contentOffset: { x: scrollX } } }], { useNativeDriver: false })}
                scrollEventThrottle={16}
            >
                {announcements.map((announcement, index) => (
                    <View key={`${announcement.id}-${index}`} style={styles.announcementItem}>
                        <View style={[styles.badge, { backgroundColor: announcement.bg_color || '#2962FF' }]}>
                            <CustomText fontType="YekanBakh" weight="Regular" size={12} style={{ color: announcement.text_color || '#FFF' }}>
                                {announcement.title}
                            </CustomText>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        width: '100%',
        marginTop: 16,
    },
    scrollContent: {
        paddingHorizontal: 16,
        gap: 8,
    },
    announcementItem: {
        marginRight: 8,
    },
    badge: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
});
