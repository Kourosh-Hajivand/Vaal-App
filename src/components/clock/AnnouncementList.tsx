/**
 * Announcement List — iOS Notification Stack
 * Single-phase animation: همه همزمان animate میشن
 */
import React, { useMemo, useState, useEffect, useRef } from "react";
import { View, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, withTiming, useSharedValue, Layout, Easing, FadeIn, Keyframe } from "react-native-reanimated";
import { CustomText } from "../shared/CustomText";
import { ThemedView } from "../shared/ThemedView";
import { useDeviceAnnouncements } from "@/src/hooks/announcement/useDeviceAnnouncements";
import { getIranTime, formatRelativeTime, formatPersianDateShort } from "@/src/utils/time/iranTime";
import { useOnlineStatus } from "@/src/hooks/use-online-status";
import { useTheme } from "@/src/contexts/ThemeContext";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";

// ─── Type Config ─────────────────
const TYPE_CONFIG: Record<string, { bg: string; color: string; icon: string }> = {
    success: { bg: "#DCFFDC", color: "#00D900", icon: "success" },
    info: { bg: "#FFF8DC", color: "#ECBD00", icon: "info" },
    warning: { bg: "#FFE8DC", color: "#FD5C02", icon: "warning" },
    urgent: { bg: "#FFE1E1", color: "#FF3B30", icon: "urgent" },
    emergency: { bg: "#FFE1E1", color: "#FF3B30", icon: "urgent" },
    maintenance: { bg: "#FFF8DC", color: "#ECBD00", icon: "info" },
};

// ─── Icons ───────────────────────
const SuccessIcon = ({ c }: { c: string }) => (
    <Svg width={10} height={10} viewBox="0 0 10 10" fill="none">
        <Path
            d="M3.5 5.375L4.625 6.5L6.5 3.875M9.5 5C9.5 5.59095 9.3836 6.17611 9.15746 6.72208C8.93131 7.26804 8.59984 7.76412 8.18198 8.18198C7.76412 8.59984 7.26804 8.93131 6.72208 9.15746C6.17611 9.3836 5.59095 9.5 5 9.5C4.40905 9.5 3.82389 9.3836 3.27792 9.15746C2.73196 8.93131 2.23588 8.59984 1.81802 8.18198C1.40016 7.76412 1.06869 7.26804 0.842542 6.72208C0.616396 6.17611 0.5 5.59095 0.5 5C0.5 3.80653 0.974106 2.66193 1.81802 1.81802C2.66193 0.974106 3.80653 0.5 5 0.5C6.19347 0.5 7.33807 0.974106 8.18198 1.81802C9.02589 2.66193 9.5 3.80653 9.5 5Z"
            stroke={c}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);
const InfoIcon = ({ c }: { c: string }) => (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
        <Path
            d="M7 3.5V7H9.625M12.25 7C12.25 7.68944 12.1142 8.37213 11.8504 9.00909C11.5865 9.64605 11.1998 10.2248 10.7123 10.7123C10.2248 11.1998 9.64605 11.5865 9.00909 11.8504C8.37213 12.1142 7.68944 12.25 7 12.25C6.31056 12.25 5.62787 12.1142 4.99091 11.8504C4.35395 11.5865 3.7752 11.1998 3.28769 10.7123C2.80018 10.2248 2.41347 9.64605 2.14963 9.00909C1.8858 8.37213 1.75 7.68944 1.75 7C1.75 5.60761 2.30312 4.27226 3.28769 3.28769C4.27226 2.30312 5.60761 1.75 7 1.75C8.39239 1.75 9.72774 2.30312 10.7123 3.28769C11.6969 4.27226 12.25 5.60761 12.25 7Z"
            stroke={c}
            strokeLinecap="round"
            strokeLinejoin="round"
        />
    </Svg>
);
const WarningIcon = ({ c }: { c: string }) => (
    <Svg width={14} height={14} viewBox="0 0 12 11" fill="none">
        <Path
            d="M6.59188 9.75142H4.58982C2.18166 9.75142 0.977585 9.75142 0.533866 8.96814C0.0901463 8.18491 0.706009 7.14659 1.93774 5.07L2.93878 3.38228C4.12196 1.38752 4.71354 0.390137 5.59085 0.390137C6.46816 0.390137 7.05974 1.38751 8.2429 3.38227L9.24398 5.07C10.4757 7.14659 11.0915 8.18491 10.6478 8.96814C10.2041 9.75142 9.00002 9.75142 6.59188 9.75142Z"
            stroke={c}
            strokeWidth="0.780107"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <Path d="M5.59119 2.80957V6.32005" stroke={c} strokeWidth="0.780107" strokeLinecap="round" strokeLinejoin="round" />
        <Path d="M5.59119 7.83887V7.84702" stroke={c} strokeWidth="0.936128" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);
const UrgentIcon = ({ c }: { c: string }) => (
    <Svg width={14} height={14} viewBox="0 0 14 14" fill="none">
        <Circle cx="7" cy="7" r="6" stroke={c} strokeWidth="1.2" />
        <Path d="M7 4V7.5M7 10H7.01" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const AIcon = ({ type }: { type: string }) => {
    const t = TYPE_CONFIG[type] || TYPE_CONFIG.info;
    switch (t.icon) {
        case "success":
            return <SuccessIcon c={t.color} />;
        case "warning":
            return <WarningIcon c={t.color} />;
        case "urgent":
            return <UrgentIcon c={t.color} />;
        default:
            return <InfoIcon c={t.color} />;
    }
};

// ─── Animation Config ────────────
const DUR = 400;
const EXIT_DUR = 250; // exit سریع‌تر

// Custom exit: scale down + slide up + fade out (سریع)
const ExitAnimation = new Keyframe({
    0: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
    30: { opacity: 0.3, transform: [{ scale: 0.9 }, { translateY: -10 }] },
    70: { opacity: 0, transform: [{ scale: 0.85 }, { translateY: -25 }] },
    100: { opacity: 0, transform: [{ scale: 0.85 }, { translateY: -30 }] },
}).duration(EXIT_DUR);
const EASE = Easing.bezier(0.4, 0, 0.2, 1);
const TIMING = { duration: DUR, easing: EASE };

// slot → scale/opacity برای stacked items
const SLOT_STYLE = [
    { scale: 1, opacity: 1 }, // 0 main
    { scale: 1, opacity: 1 }, // 1 main
    { scale: 1, opacity: 1 }, // 2 main
    { scale: 0.97, opacity: 1 }, // 3 stacked 1 — opacity کامل
    { scale: 0.94, opacity: 1 }, // 4 stacked 2 — opacity کامل
];

// ─── Main ────────────────────────
export const AnnouncementList: React.FC = () => {
    const { data: announcements, dataUpdatedAt, isFetching, isRefetching } = useDeviceAnnouncements();
    const { isOnline } = useOnlineStatus();
    const { colors } = useTheme();
    const [items, setItems] = useState<any[]>([]);
    const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
    const lastFetchTimeRef = useRef<number | null>(null);
    const previousIsOnlineRef = useRef<boolean>(true);
    const wasRefetchingRef = useRef<boolean>(false);
    const headRef = useRef(0);

    // Track last fetch
    useEffect(() => {
        if (!lastFetchTimeRef.current && dataUpdatedAt) {
            setLastFetchTime(dataUpdatedAt);
            lastFetchTimeRef.current = dataUpdatedAt;
            return;
        }
        if (isRefetching || isFetching) wasRefetchingRef.current = true;
        if (isOnline && dataUpdatedAt && !isFetching && !isRefetching && wasRefetchingRef.current) {
            if (!lastFetchTimeRef.current || dataUpdatedAt > lastFetchTimeRef.current) {
                setLastFetchTime(dataUpdatedAt);
                lastFetchTimeRef.current = dataUpdatedAt;
            }
            wasRefetchingRef.current = false;
        }
    }, [dataUpdatedAt, isOnline, isFetching, isRefetching]);
    useEffect(() => {
        if (!isOnline && previousIsOnlineRef.current && dataUpdatedAt && (!lastFetchTimeRef.current || dataUpdatedAt > lastFetchTimeRef.current)) {
            setLastFetchTime(dataUpdatedAt);
            lastFetchTimeRef.current = dataUpdatedAt;
        }
        previousIsOnlineRef.current = isOnline;
    }, [isOnline, dataUpdatedAt]);

    // Filter
    const filtered = useMemo(() => {
        if (!announcements?.length) return [];
        const now = getIranTime();
        return announcements
            .filter((a) => {
                if (a.status !== "active") return false;
                if (a.start_date) {
                    const d = new Date(a.start_date);
                    if (isNaN(d.getTime()) || now < d) return false;
                }
                if (a.end_date) {
                    const d = new Date(a.end_date);
                    if (!isNaN(d.getTime()) && now > d) return false;
                }
                return true;
            })
            .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }, [announcements]);

    const hasStack = filtered.length > 3;

    // Init
    useEffect(() => {
        if (!filtered.length) return;
        setItems(filtered.slice(0, Math.min(hasStack ? 5 : 3, filtered.length)));
        headRef.current = 0;
    }, [filtered.length]);

    // ─── Single-phase rotate ─────
    // فقط یک setItems — Reanimated بقیه رو handle میکنه
    useEffect(() => {
        if (filtered.length <= 3) return;
        const timer = setInterval(() => {
            headRef.current = (headRef.current + 1) % filtered.length;
            setItems((prev) => {
                const [, ...rest] = prev;
                const tailIdx = (headRef.current + Math.min(4, filtered.length - 1)) % filtered.length;
                return [...rest, filtered[tailIdx]];
            });
        }, 5000);
        return () => clearInterval(timer);
    }, [filtered]);

    // Relative time
    const [tick, setTick] = useState(0);
    useEffect(() => {
        const t = setInterval(() => setTick((p) => p + 1), 10000);
        return () => clearInterval(t);
    }, []);
    const lastUpdate = useMemo(() => {
        if (lastFetchTime) {
            const r = formatRelativeTime(new Date(lastFetchTime).toISOString());
            return isOnline ? r : `${r} (آفلاین)`;
        }
        if (isOnline && dataUpdatedAt) return formatRelativeTime(new Date(dataUpdatedAt).toISOString());
        if (filtered.length) return formatRelativeTime(filtered[0].created_at);
        return "به تازگی";
    }, [filtered, dataUpdatedAt, lastFetchTime, isOnline, tick]);

    if (!filtered.length) return null;

    return (
        <ThemedView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <CustomText fontType="YekanBakh" weight="Regular" size={8} applyThemeColor={false} style={{ color: colors.text, opacity: 0.9 }}>
                    آخرین به‌روزرسانی: {lastUpdate}
                </CustomText>
                <View style={styles.headerRight}>
                    <CustomText fontType="YekanBakh" weight="Regular" size={13} applyThemeColor={true}>
                        اطلاعیه ها
                    </CustomText>
                    <Svg width={20} height={20} viewBox="0 0 15 15" fill="none">
                        <Path d="M11.1526 10.5654V5.57613C11.1526 3.30688 9.31304 1.46729 7.04378 1.46729C4.77453 1.46729 2.93494 3.30688 2.93494 5.57613V10.5654" fill="url(#bellGrad)" />
                        <Path d="M12.0331 10.5654H2.05444" stroke="#FD5C02" strokeWidth="0.621506" strokeLinecap="round" strokeLinejoin="round" />
                        <Path d="M8.80623 10.8574C8.80623 11.8308 8.01708 12.62 7.04368 12.62M7.04368 12.62C6.07028 12.62 5.28113 11.8308 5.28113 10.8574M7.04368 12.62V10.8574" stroke="#FD5C02" strokeWidth="0.621506" strokeLinejoin="round" />
                        <Defs>
                            <LinearGradient id="bellGrad" x1="7.04378" y1="1.46729" x2="7.04378" y2="10.5654" gradientUnits="userSpaceOnUse">
                                <Stop stopColor="#FFA06A" />
                                <Stop offset="1" stopColor="#FD5C02" />
                            </LinearGradient>
                        </Defs>
                    </Svg>
                </View>
            </View>

            {/* Stack */}
            <View style={styles.stack}>
                {items.map((a, i) => (
                    <StackItem key={a.id} data={a} slot={i} colors={colors} />
                ))}
            </View>
        </ThemedView>
    );
};

// ─── Stack Item ──────────────────
interface StackItemProps {
    data: any;
    slot: number;
    colors: any;
}

const StackItem: React.FC<StackItemProps> = ({ data, slot, colors }) => {
    const cfg = TYPE_CONFIG[data.type] || TYPE_CONFIG.info;
    const isStacked = slot >= 3;
    const target = SLOT_STYLE[slot] || SLOT_STYLE[4];

    // Animated scale + opacity
    const scale = useSharedValue(target.scale);
    const itemOpacity = useSharedValue(target.opacity);

    useEffect(() => {
        scale.value = withTiming(target.scale, TIMING);
        itemOpacity.value = withTiming(target.opacity, TIMING);
    }, [slot]);

    const innerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: itemOpacity.value,
    }));

    // Margin style بر اساس slot (static — Layout handles transition)
    const slotMargin = isStacked ? { marginTop: slot === 3 ? -35 : -36, marginHorizontal: slot === 3 ? 8 : 16 } : { marginTop: slot === 0 ? 0 : 8, marginHorizontal: 0 };

    return (
        // Outer: Layout transition + entering/exiting
        <Animated.View
            style={[slotMargin, { zIndex: 10 - slot }]}
            layout={Layout.duration(DUR).easing(EASE)}
            exiting={ExitAnimation}
            entering={FadeIn.duration(DUR)}
        >
            {/* Inner: scale + opacity animation */}
            <Animated.View style={innerStyle}>
                <View style={[styles.card, { backgroundColor: colors.cardBackground, borderColor: colors.border }]}>
                    <View style={styles.row}>
                        <View style={styles.textArea}>
                            <View style={styles.titleRow}>
                                <CustomText fontType="YekanBakh" weight="Regular" size={9} applyThemeColor={false} style={{ color: colors.text, opacity: 0.5 }}>
                                    {formatPersianDateShort(data.created_at)}
                                </CustomText>
                                <CustomText fontType="YekanBakh" weight="SemiBold" size={12} applyThemeColor={false} style={{ color: colors.text }}>
                                    {data.title}
                                </CustomText>
                            </View>
                            {!isStacked && data.message && (
                                <CustomText fontType="YekanBakh" weight="Regular" size={10} applyThemeColor={false} style={{ color: colors.text, opacity: 0.8, textAlign: "right" }}>
                                    {data.message}
                                </CustomText>
                            )}
                        </View>
                        <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
                            <AIcon type={data.type} />
                        </View>
                    </View>
                </View>
            </Animated.View>
        </Animated.View>
    );
};

// ─── Styles ──────────────────────
const styles = StyleSheet.create({
    container: { width: "100%", marginTop: 14, zIndex: 10 },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 12 },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },
    stack: { width: "100%", paddingBottom: 8 },
    card: { borderRadius: 16, paddingVertical: 10, paddingHorizontal: 12, borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.06, shadowRadius: 3, elevation: 1 },
    row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "flex-end", gap: 10 },
    textArea: { flex: 1, alignItems: "flex-end", gap: 4 },
    titleRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    iconCircle: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
