/**
 * Announcement List Component
 * نمایش لیست اطلاعیه‌ها با format زیبا
 */
import React, { useMemo, useState, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import { CustomText } from "../shared/CustomText";
import { ThemedView } from "../shared/ThemedView";
import { useDeviceAnnouncements } from "@/src/hooks/announcement/useDeviceAnnouncements";
import { getIranTime, formatRelativeTime, formatPersianDateShort } from "@/src/utils/time/iranTime";
import { useOnlineStatus } from "@/src/hooks/use-online-status";
import { useTheme } from "@/src/contexts/ThemeContext";
import Svg, { Path, Defs, LinearGradient, Stop } from "react-native-svg";

export const AnnouncementList: React.FC = () => {
    const { data: announcements, isLoading, dataUpdatedAt, isFetching, isRefetching } = useDeviceAnnouncements();
    const { isOnline } = useOnlineStatus();
    const { colors } = useTheme();
    const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
    const lastFetchTimeRef = useRef<number | null>(null);
    const previousIsOnlineRef = useRef<boolean>(true);
    const wasRefetchingRef = useRef<boolean>(false);

    // Track آخرین fetch time - فقط وقتی online است و fetch واقعی انجام شده
    useEffect(() => {
        // اگر lastFetchTime نداریم و dataUpdatedAt داریم، آن را set کن (اولین بار)
        if (!lastFetchTimeRef.current && dataUpdatedAt) {
            setLastFetchTime(dataUpdatedAt);
            lastFetchTimeRef.current = dataUpdatedAt;
            return;
        }

        // Track کردن isRefetching یا isFetching برای تشخیص fetch واقعی
        if (isRefetching || isFetching) {
            wasRefetchingRef.current = true;
        }

        // فقط وقتی online است و fetch واقعی انجام شده، lastFetchTime رو به‌روز کن
        if (isOnline && dataUpdatedAt && !isFetching && !isRefetching) {
            if (wasRefetchingRef.current) {
                if (!lastFetchTimeRef.current || dataUpdatedAt > lastFetchTimeRef.current) {
                    setLastFetchTime(dataUpdatedAt);
                    lastFetchTimeRef.current = dataUpdatedAt;
                }
                wasRefetchingRef.current = false;
            }
        }
    }, [dataUpdatedAt, isOnline, isFetching, isRefetching]);

    // وقتی از online به offline می‌رود، lastFetchTime رو نگه دار
    useEffect(() => {
        if (!isOnline && previousIsOnlineRef.current) {
            if (dataUpdatedAt && (!lastFetchTimeRef.current || dataUpdatedAt > lastFetchTimeRef.current)) {
                setLastFetchTime(dataUpdatedAt);
                lastFetchTimeRef.current = dataUpdatedAt;
            }
        }
        previousIsOnlineRef.current = isOnline;
    }, [isOnline, dataUpdatedAt]);

    // فیلتر و مرتب‌سازی announcements
    const filteredAnnouncements = useMemo(() => {
        if (!announcements || announcements.length === 0) return [];

        const now = getIranTime();

        return announcements
            .filter((announcement) => {
                // فقط active announcements
                if (announcement.status !== "active") return false;

                // بررسی start_date
                if (announcement.start_date) {
                    const startDate = new Date(announcement.start_date);
                    if (isNaN(startDate.getTime())) return false;
                    if (now < startDate) return false;
                }

                // بررسی end_date
                if (announcement.end_date) {
                    const endDate = new Date(announcement.end_date);
                    if (isNaN(endDate.getTime())) return true;
                    if (now > endDate) return false;
                }

                return true;
            })
            .sort((a, b) => {
                const dateA = new Date(a.created_at).getTime();
                const dateB = new Date(b.created_at).getTime();
                return dateB - dateA; // جدیدترین اول
            })
            .slice(0, 4); // حداکثر 4 تا
    }, [announcements]);

    // به‌روزرسانی خودکار زمان نسبی هر 10 ثانیه
    const [updateTrigger, setUpdateTrigger] = useState(0);
    useEffect(() => {
        const interval = setInterval(() => {
            setUpdateTrigger((prev) => prev + 1);
        }, 10000); // هر 10 ثانیه

        return () => clearInterval(interval);
    }, []);

    // آخرین به‌روزرسانی - زمان نسبی
    const lastUpdate = useMemo(() => {
        if (lastFetchTime) {
            const relativeTime = formatRelativeTime(new Date(lastFetchTime).toISOString());
            return isOnline ? relativeTime : `${relativeTime} (آفلاین)`;
        }

        if (isOnline && dataUpdatedAt) {
            return formatRelativeTime(new Date(dataUpdatedAt).toISOString());
        }

        if (filteredAnnouncements && filteredAnnouncements.length > 0) {
            const latest = filteredAnnouncements[0];
            return formatRelativeTime(latest.created_at);
        }

        return "به تازگی";
    }, [filteredAnnouncements, dataUpdatedAt, lastFetchTime, isOnline, updateTrigger]);

    // اگر announcement نداریم، چیزی نمایش نده
    if (!filteredAnnouncements || filteredAnnouncements.length === 0) {
        return null;
    }

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <CustomText fontType="YekanBakh" weight="Regular" size={8} applyThemeColor={false} style={[styles.lastUpdateText, { color: colors.text }]}>
                    آخرین به‌روزرسانی: {lastUpdate}
                </CustomText>

                <View style={styles.headerRight}>
                    <CustomText fontType="YekanBakh" weight="Regular" size={13} applyThemeColor={true}>
                        اطلاعیه ها
                    </CustomText>

                    {/* Bell Icon SVG */}
                    <Svg width={20} height={20} viewBox="0 0 15 15" fill="none">
                        <Path d="M11.1526 10.5654V5.57613C11.1526 3.30688 9.31304 1.46729 7.04378 1.46729C4.77453 1.46729 2.93494 3.30688 2.93494 5.57613V10.5654" fill="url(#paint0_linear_78_228)" />
                        <Path d="M12.0331 10.5654H2.05444" stroke="#FD5C02" strokeWidth="0.621506" strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M8.80623 10.8574C8.80623 11.8308 8.01708 12.62 7.04368 12.62M7.04368 12.62C6.07028 12.62 5.28113 11.8308 5.28113 10.8574M7.04368 12.62V10.8574" stroke="#FD5C02" strokeWidth="0.621506" strokeLinejoin="round" />
                        <Defs>
                            <LinearGradient id="paint0_linear_78_228" x1="7.04378" y1="1.46729" x2="7.04378" y2="10.5654" gradientUnits="userSpaceOnUse">
                                <Stop stopColor="#FFA06A" />
                                <Stop offset="1" stopColor="#FD5C02" />
                            </LinearGradient>
                        </Defs>
                    </Svg>
                </View>
            </View>

            {/* Announcements List */}
            <View style={styles.list}>
                {filteredAnnouncements.map((announcement) => (
                    <View key={announcement.id} style={[styles.announcementItem, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                        {/* Content */}
                        <View style={styles.announcementContent}>
                            {/* Text Container - flex: 1 */}
                            <View style={styles.textContainer}>
                                {/* Row 1: Title + Date در یک خط */}
                                <View style={styles.titleRow}>
                                    <CustomText fontType="YekanBakh" weight="Regular" size={9} applyThemeColor={false} style={{ color: colors.text, opacity: 0.5 }}>
                                        {formatPersianDateShort(announcement.created_at)}
                                    </CustomText>

                                    <CustomText fontType="YekanBakh" weight="SemiBold" size={11} applyThemeColor={true}>
                                        {announcement.title}
                                    </CustomText>
                                </View>

                                {/* Row 2: Message (اگر داشته باشه) */}
                                {announcement.message && (
                                    <CustomText fontType="YekanBakh" weight="Regular" size={12} applyThemeColor={false} style={{ color: colors.text, opacity: 0.8, textAlign: "right" }}>
                                        {announcement.message}
                                    </CustomText>
                                )}
                            </View>

                            {/* Warning Icon - سمت راست */}
                            <View style={[styles.iconContainer, { backgroundColor: colors.warning }]}>
                                <Svg width={12} height={14} viewBox="0 0 12 11" fill="none">
                                    <Path
                                        d="M6.59188 9.75142H4.58982C2.18166 9.75142 0.977585 9.75142 0.533866 8.96814C0.0901463 8.18491 0.706009 7.14659 1.93774 5.07L2.93878 3.38228C4.12196 1.38752 4.71354 0.390137 5.59085 0.390137C6.46816 0.390137 7.05974 1.38751 8.2429 3.38227L9.24398 5.07C10.4757 7.14659 11.0915 8.18491 10.6478 8.96814C10.2041 9.75142 9.00002 9.75142 6.59188 9.75142Z"
                                        stroke="#FD5C02"
                                        strokeWidth="0.780107"
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                    />
                                    <Path d="M5.59119 2.80957V6.32005" stroke="#FD5C02" strokeWidth="0.780107" strokeLinecap="round" strokeLinejoin="round" />
                                    <Path d="M5.59119 7.83887V7.84702" stroke="#FD5C02" strokeWidth="0.936128" strokeLinecap="round" strokeLinejoin="round" />
                                </Svg>
                            </View>
                        </View>
                    </View>
                ))}
            </View>
        </ThemedView>
    );
};

const styles = StyleSheet.create({
    container: {
        width: "100%",
        marginTop: 14,
        zIndex: 10,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
        marginBottom: 12,
    },
    lastUpdateText: {
        opacity: 0.9,
    },
    headerRight: {
        flexDirection: "row",
        alignItems: "center",
        gap: 4,
    },
    headerTitle: {
        // color از theme
    },
    list: {
        flexDirection: "column",
        gap: 8,
    },
    announcementItem: {
        // backgroundColor و borderColor dynamic از theme
        borderRadius: 16,
        paddingVertical: 8,
        paddingHorizontal: 8,
        borderWidth: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-end",
        gap: 12,
    },

    announcementContent: {
        flex: 1,
        flexDirection: "row",
        alignItems: "flex-start",
        justifyContent: "flex-end",
        gap: 8,
    },
    textContainer: {
        flex: 1,
        alignItems: "flex-end",
    },
    titleRow: {
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
    },
    titleText: {
        textAlign: "right",
    },
    messageText: {
        textAlign: "right",
    },
    iconContainer: {
        width: 18,
        height: 18,
        // backgroundColor dynamic از theme (warning color با 20% opacity)
        borderRadius: 12,
        alignItems: "center",
        justifyContent: "center",
    },
});
