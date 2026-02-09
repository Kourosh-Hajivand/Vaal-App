/**
 * Announcement List — Stable Dynamic Window (Fixed Logic)
 *
 * ✅ NO SCROLL
 * ✅ فقط کارت‌های کامل (بدون peek زیرشون)
 * ✅ فاصله عمودی ثابت ۱۰px بین کارت‌ها
 * ✅ تخمین ارتفاع محافظه‌کار بر اساس طول متن (همیشه کمی بزرگ‌تر از واقعی)
 * ✅ اگر متن خیلی بلند باشد (مثل پیام ۴)، تنها همان کارت در صفحه نمایش داده می‌شود
 * ✅ head همیشه به اندازه تعداد کارت‌های همان صفحه جلو می‌رود (بدون overlap / پرش)
 * ✅ متن تا سقف ارتفاع استک (۴۲۵px) نمایش داده می‌شود
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import Animated, { useAnimatedStyle, withTiming, useSharedValue, Easing, FadeIn, Keyframe } from "react-native-reanimated";
import { CustomText } from "../shared/CustomText";
import { ThemedView } from "../shared/ThemedView";
import { useDeviceAnnouncements } from "@/src/hooks/announcement/useDeviceAnnouncements";
import { getIranTime, formatRelativeTime, formatPersianDateShort } from "@/src/utils/time/iranTime";
import { useOnlineStatus } from "@/src/hooks/use-online-status";
import { useTheme } from "@/src/contexts/ThemeContext";
import Svg, { Path, Defs, LinearGradient, Stop, Circle } from "react-native-svg";

// ─── Type Config ─────────────────
const getTypeConfig = (isDark: boolean): Record<string, { bg: string; color: string; icon: string }> => ({
    success: { bg: isDark ? "#0E3B0F" : "#DCFFDC", color: "#00D900", icon: "success" },
    info: { bg: isDark ? "#3E3616" : "#FFF8DC", color: "#ECBD00", icon: "info" },
    warning: { bg: isDark ? "#513A2E" : "#FFE8DC", color: "#FD5C02", icon: "warning" },
    urgent: { bg: isDark ? "#3B0E0E" : "#FFE1E1", color: "#FF3B30", icon: "urgent" },
    emergency: { bg: isDark ? "#3B0E0E" : "#FFE1E1", color: "#FF3B30", icon: "urgent" },
    maintenance: { bg: isDark ? "#3E3616" : "#FFF8DC", color: "#ECBD00", icon: "info" },
});

// ─── Icons ───────────────────────
const SuccessIcon = ({ c }: { c: string }) => (
    <Svg width={14} height={14} viewBox="0 0 10 10" fill="none">
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
    <Svg width={16} height={16} viewBox="0 0 14 14" fill="none">
        <Circle cx="7" cy="7" r="6" stroke={c} strokeWidth="1.2" />
        <Path d="M7 4V7.5M7 10H7.01" stroke={c} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
);

const AIcon = ({ type, isDark }: { type: string; isDark: boolean }) => {
    const cfg = getTypeConfig(isDark);
    const t = cfg[type] || cfg.info;
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
const DUR = 420;
const EXIT_DUR = 240;
const EASE = Easing.bezier(0.4, 0, 0.2, 1);
const TIMING = { duration: DUR, easing: EASE };

const ExitAnimation = new Keyframe({
    0: { opacity: 1, transform: [{ scale: 1 }, { translateY: 0 }] },
    40: { opacity: 0.35, transform: [{ scale: 0.93 }, { translateY: -10 }] },
    100: { opacity: 0, transform: [{ scale: 0.88 }, { translateY: -30 }] },
}).duration(EXIT_DUR);

// ─── Layout Budget ───────────────
const STACK_HEIGHT = 425; // کل فضای نمایش کارت‌ها
const MAIN_GAP = 10; // فاصله‌ی بین کارت‌ها
const MAX_CHARS = 1320;

// ─── Helpers ─────────────────────
const clamp = (min: number, v: number, max: number) => Math.max(min, Math.min(max, v));

const truncateMessage = (text: string, maxLength: number) => {
    const t = String(text ?? "");
    if (!t) return "";
    if (t.length <= maxLength) return t;
    return `${t.slice(0, maxLength - 1)}…`;
};

// مدت زمان خواندن متن
const estimateReadingMs = (msg: string) => {
    const text = String(msg ?? "");
    if (!text) return 0;
    const chars = text.length;
    const words = chars / 5;
    const seconds = words / 3.3;
    const ms = 2000 + seconds * 1000;
    return clamp(3500, ms, 14000);
};

/**
 * تخمین ارتفاع کارت بر اساس طول متن (محافظه‌کار)
 * ایده: عمداً کمی بیشتر از واقعیت حساب می‌کنیم تا
 * هیچ‌وقت آیتم اضافه در همان صفحه نچپونیم که نصفش دیده بشه.
 */
const estimateCardHeight = (title: string, message: string): number => {
    const msg = truncateMessage(String(message ?? ""), MAX_CHARS);
    const chars = msg.length;

    // هر ~40 کاراکتر ≈ یک خط
    const charsPerLine = 40;
    const lineH = 20; // کمی بزرگ‌تر از واقعی برای over-estimate
    const base = 60; // عنوان + پدینگ‌ها

    const lines = Math.max(1, Math.ceil(chars / charsPerLine));
    const h = base + lines * lineH;

    // هر کارت نهایتاً به اندازه‌ی کل استک
    return clamp(70, h, STACK_HEIGHT);
};

type AnnItem = any & {
    __y?: number;
    __maxH?: number;
    __idx?: number;
};

// محاسبه‌ی پنجره‌ی قابل نمایش براساس تخمین ارتفاع
const computeWindow = (filtered: any[], head: number): AnnItem[] => {
    if (!filtered.length) return [];

    const out: AnnItem[] = [];
    let usedHeight = 0;

    for (let k = 0; k < filtered.length; k++) {
        const a = filtered[(head + k) % filtered.length];

        const estH = estimateCardHeight(a.title, a.message);
        const gap = out.length === 0 ? 0 : MAIN_GAP;
        const top = out.length === 0 ? 0 : usedHeight + gap;
        const bottom = top + estH;

        // اگه این کارت جا نشه، تموم — دیگه کارت بعدی نمی‌ذاریم
        if (bottom > STACK_HEIGHT) {
            // اگر هیچ کارتی اضافه نشده، حداقل همین رو با max ارتفاع نشون بده
            if (!out.length) {
                out.push({
                    ...a,
                    __y: 0,
                    __maxH: STACK_HEIGHT,
                    __idx: 0,
                });
            }
            break;
        }

        out.push({
            ...a,
            __y: top,
            __maxH: estH,
            __idx: out.length,
        });

        usedHeight = bottom;
    }

    if (!out.length && filtered.length) {
        const a = filtered[head];
        out.push({
            ...a,
            __y: 0,
            __maxH: STACK_HEIGHT,
            __idx: 0,
        });
    }

    return out;
};

const getVisibleCount = (win: AnnItem[]) => Math.max(1, win.length);

// ─── Main Component ──────────────
export const AnnouncementList: React.FC = () => {
    const { data: announcements, dataUpdatedAt, isFetching, isRefetching } = useDeviceAnnouncements();
    const { isOnline } = useOnlineStatus();
    const { colors, isDark } = useTheme();

    const [items, setItems] = useState<AnnItem[]>([]);
    const headRef = useRef(0);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // آخرین فچ
    const [lastFetchTime, setLastFetchTime] = useState<number | null>(null);
    const lastFetchTimeRef = useRef<number | null>(null);
    const previousIsOnlineRef = useRef<boolean>(true);
    const wasRefetchingRef = useRef<boolean>(false);

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

    const filteredSig = useMemo(() => filtered.map((x) => x.id).join("|"), [filtered]);

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

    const computeDurationForWindow = useCallback((win: AnnItem[]) => {
        const sum = win.reduce((acc, x) => {
            const msg = truncateMessage(String(x.message ?? ""), MAX_CHARS);
            return acc + estimateReadingMs(msg);
        }, 0);
        const overhead = 800 + win.length * 250;
        return clamp(4500, sum + overhead, 22000);
    }, []);

    const scheduleFromWindow = useCallback(
        (win: AnnItem[]) => {
            clearTimer();
            if (filtered.length <= 1) return;

            const dur = computeDurationForWindow(win);
            const step = getVisibleCount(win);

            timerRef.current = setTimeout(() => {
                headRef.current = (headRef.current + step) % filtered.length;
                const next = computeWindow(filtered, headRef.current);
                setItems(next);
                scheduleFromWindow(next);
            }, dur);
        },
        [clearTimer, filtered, computeDurationForWindow],
    );

    // init / restart on data change
    useEffect(() => {
        clearTimer();

        if (!filtered.length) {
            setItems([]);
            return;
        }

        headRef.current = 0;
        const win = computeWindow(filtered, headRef.current);
        setItems(win);
        scheduleFromWindow(win);

        return () => clearTimer();
    }, [filteredSig, clearTimer, scheduleFromWindow]);

    useEffect(() => () => clearTimer(), [clearTimer]);

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
            <View
                style={[
                    styles.stack,
                    {
                        backgroundColor: isDark ? "#0B1721" : "rgba(255,255,255,0)",
                    },
                ]}
            >
                {items.map((a, i) => (
                    <StackItem key={`${a.id}-${a.__idx ?? i}`} data={a} colors={colors} zIndex={100 - i} />
                ))}
            </View>
        </ThemedView>
    );
};

// ─── Stack Item ──────────────────
const StackItem = React.memo(function StackItem({ data, colors, zIndex }: { data: AnnItem; colors: any; zIndex: number }) {
    const { isDark } = useTheme();
    const typeConfig = getTypeConfig(isDark);
    const cfg = typeConfig[data.type] || typeConfig.info;

    const targetY = data.__y ?? 0;
    const maxH = data.__maxH ?? STACK_HEIGHT;

    const y = useSharedValue(targetY);
    const o = useSharedValue(1);

    useEffect(() => {
        y.value = withTiming(targetY, TIMING);
        o.value = withTiming(1, TIMING);
    }, [targetY]);

    const animStyle = useAnimatedStyle(() => ({
        transform: [{ translateY: y.value }],
        opacity: o.value,
    }));

    const msg = truncateMessage(String(data.message ?? ""), MAX_CHARS);

    return (
        <Animated.View entering={FadeIn.duration(DUR)} exiting={ExitAnimation} style={[styles.absItem, { zIndex }, animStyle]}>
            <View
                style={[
                    styles.card,
                    {
                        maxHeight: maxH,
                        borderColor: isDark ? "#394753" : colors.border,
                        backgroundColor: isDark ? "#192634" : "rgba(255,255,255,1)",
                        overflow: "hidden",
                    },
                ]}
            >
                <View style={styles.row}>
                    <View style={{ flex: 1, gap: 4, paddingHorizontal: 10 }}>
                        <View style={{ flexDirection: "row", gap: 10, alignContent: "center", alignItems: "center" }}>
                            <View style={styles.textArea}>
                                <View style={styles.titleRow}>
                                    <CustomText fontType="YekanBakh" weight="Regular" size={9} applyThemeColor={false} style={{ color: colors.text, opacity: 0.5 }}>
                                        {formatPersianDateShort(data.created_at)}
                                    </CustomText>
                                    <CustomText fontType="YekanBakh" weight="SemiBold" size={12} applyThemeColor={false} style={{ color: colors.text }}>
                                        {data.title}
                                    </CustomText>
                                </View>
                            </View>

                            <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
                                <AIcon type={data.type} isDark={isDark} />
                            </View>
                        </View>

                        {!!msg && (
                            <View style={{ maxHeight: Math.max(0, maxH - 52), overflow: "hidden" }}>
                                <CustomText fontType="YekanBakh" weight="Regular" size={11} applyThemeColor={false} style={{ color: colors.text, opacity: 0.85, textAlign: "right", paddingHorizontal: 8 }}>
                                    {msg}
                                </CustomText>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </Animated.View>
    );
});

// ─── Styles ──────────────────────
const styles = StyleSheet.create({
    container: { width: "100%", marginTop: 14, zIndex: 10, overflow: "hidden" },
    header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", width: "100%", marginBottom: 12 },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 4 },

    stack: {
        width: "100%",
        height: STACK_HEIGHT,
        overflow: "hidden",
        position: "relative",
    },

    absItem: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
    },

    card: { borderRadius: 16, paddingVertical: 8, paddingHorizontal: 12, borderWidth: 0.382 },
    row: { flexDirection: "row", alignItems: "flex-start", justifyContent: "flex-end", gap: 10 },
    textArea: { flex: 1, alignItems: "flex-end", gap: 4 },
    titleRow: { width: "100%", flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
    iconCircle: { width: 24, height: 24, borderRadius: 12, alignItems: "center", justifyContent: "center" },
});
