/**
 * Announcement List — Stable Dynamic Window (NO SCROLL + MAX FILL + NO TEXT CUT)
 *
 * ✅ NO SCROLL
 * ✅ تا جای ممکن تعداد کارت‌ها را پر می‌کند (maximize packing)
 * ✅ فاصله عمودی ثابت ۱۰px بین کارت‌ها
 * ✅ اگر متن خیلی بلند باشد → همان پیام به چند «صفحه» تقسیم می‌شود (Page 1/3, 2/3, ...)
 * ✅ هیچ متنی truncate نمی‌شود
 * ✅ زمان چرخش بر اساس حجم متن هر «صفحه» محاسبه می‌شود (+ احترام به duration_sec)
 * ✅ head به اندازه تعداد کارت‌های همان window جلو می‌رود (بدون overlap / پرش)
 * ✅ تصمیم‌گیری نمایش تعداد کارت‌ها بر اساس HEIGHT واقعی کارت‌هاست (نه تخمین)
 */

import React, { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { View, StyleSheet, LayoutChangeEvent } from "react-native";
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
const STACK_HEIGHT = 465;
const MAIN_GAP = 10;

// fallback ها تا وقتی measure انجام نشده
const FALLBACK_CHROME_H = 52;
const FALLBACK_LINE_H = 20;

const clamp = (min: number, v: number, max: number) => Math.max(min, Math.min(max, v));

const estimateReadingMs = (msg: string, durationSec?: number) => {
    const base = durationSec ? durationSec * 1000 : 0;
    const text = String(msg ?? "").trim();
    if (!text) return clamp(2500, base || 0, 16000);

    const words = text.length / 5;
    const seconds = words / 3.3;
    const autoMs = 1800 + seconds * 1000;

    return clamp(3500, Math.max(base, autoMs), 16000);
};

type AnnItem = any & {
    __y?: number;
    __maxH?: number;
    __idx?: number;

    __page?: number;
    __pages?: number;

    __wKey?: string; // unique key per virtual page
};

type TextMeasureMap = Record<string, { lines: string[]; measuredAt: number }>;
type HeightMap = Record<string, { h: number; measuredAt: number }>;

const getVisibleCount = (win: AnnItem[]) => Math.max(1, win.length);

// ─── Main Component ──────────────
export const AnnouncementList: React.FC = () => {
    const { data: announcements, dataUpdatedAt, isFetching, isRefetching } = useDeviceAnnouncements();
    const { isOnline } = useOnlineStatus();
    const { colors } = useTheme();

    const [items, setItems] = useState<AnnItem[]>([]);
    const headRef = useRef(0);

    // stack width برای wrap دقیق
    const [stackW, setStackW] = useState(0);

    // chromeHeight واقعی + lineHeight واقعی
    const [chromeH, setChromeH] = useState(FALLBACK_CHROME_H);
    const chromeHRef = useRef(FALLBACK_CHROME_H);

    const [lineH, setLineH] = useState(FALLBACK_LINE_H);
    const lineHRef = useRef(FALLBACK_LINE_H);

    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const clearTimer = useCallback(() => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    }, []);

    // ─── آخرین فچ ──────────────────
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

    // ─── Filter ────────────────────
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

    // ─── Text measurement (lines per full message) ───────────────
    const [textMeasureVersion, setTextMeasureVersion] = useState(0);
    const textMapRef = useRef<TextMeasureMap>({});
    const [, setTextMapState] = useState<TextMeasureMap>({}); // فقط برای re-render

    const bumpTextMeasure = useCallback(() => setTextMeasureVersion((x) => x + 1), []);

    const onMeasuredLines = useCallback(
        (id: string, lines: string[], maybeLineH?: number) => {
            if (!id) return;
            if (!lines?.length) return;

            const prev = textMapRef.current[id]?.lines;
            if (!prev || prev.length !== lines.length) {
                const next = {
                    ...textMapRef.current,
                    [id]: { lines, measuredAt: Date.now() },
                };
                textMapRef.current = next;
                setTextMapState(next);
                bumpTextMeasure();
            }

            if (maybeLineH && maybeLineH > 8) {
                const lh = Math.ceil(maybeLineH);
                if (Math.abs(lh - lineHRef.current) >= 1) {
                    lineHRef.current = lh;
                    setLineH(lh);
                }
            }
        },
        [bumpTextMeasure],
    );

    const onMeasuredChrome = useCallback((h: number) => {
        const hh = Math.max(0, Math.ceil(h));
        if (!hh) return;
        if (Math.abs(hh - chromeHRef.current) < 2) return;
        chromeHRef.current = hh;
        setChromeH(hh);
    }, []);

    const TEXT_MAX_HEIGHT = Math.max(0, STACK_HEIGHT - chromeH);
    const MAX_LINES_PER_CARD = Math.max(1, Math.floor(TEXT_MAX_HEIGHT / (lineH || FALLBACK_LINE_H)));

    // ─── Build virtual items (split into pages) ──────────────────
    const virtualItems = useMemo<AnnItem[]>(() => {
        if (!filtered.length) return [];
        if (!stackW) return [];

        const out: AnnItem[] = [];

        for (const a of filtered) {
            const key = a.id;
            const lines = textMapRef.current[key]?.lines;

            // هنوز اندازه‌گیری نشده → موقتاً یک صفحه (ولی همزمان measurer اجرا میشه)
            if (!lines || !lines.length) {
                out.push({
                    ...a,
                    __page: 1,
                    __pages: 1,
                    __wKey: `${a.id}:u`,
                });
                continue;
            }

            const pages = Math.max(1, Math.ceil(lines.length / MAX_LINES_PER_CARD));
            for (let p = 0; p < pages; p++) {
                const start = p * MAX_LINES_PER_CARD;
                const end = start + MAX_LINES_PER_CARD;
                const chunkText = lines.slice(start, end).join("");

                out.push({
                    ...a,
                    message: chunkText,
                    __page: p + 1,
                    __pages: pages,
                    __wKey: `${a.id}:p${p + 1}/${pages}`,
                });
            }
        }

        return out;
    }, [filtered, stackW, textMeasureVersion, MAX_LINES_PER_CARD]);

    // ─── Measure HEIGHT واقعی هر virtual card (کل کارت با همین متن) ─────────
    const [heightVersion, setHeightVersion] = useState(0);
    const heightMapRef = useRef<HeightMap>({});
    const [, setHeightMapState] = useState<HeightMap>({}); // فقط برای re-render

    const onMeasuredCardHeight = useCallback((wKey: string, h: number) => {
        if (!wKey) return;
        const hh = Math.max(0, Math.ceil(h));
        if (!hh) return;

        const prev = heightMapRef.current[wKey]?.h;
        // جلوگیری از re-render های ریز
        if (prev && Math.abs(prev - hh) < 2) return;

        const next = {
            ...heightMapRef.current,
            [wKey]: { h: hh, measuredAt: Date.now() },
        };
        heightMapRef.current = next;
        setHeightMapState(next);
        setHeightVersion((x) => x + 1);
    }, []);

    // ─── computeWindow بر اساس HEIGHT واقعی (maximize fill) ───────
    const computeWindow = useCallback((arr: AnnItem[], head: number): AnnItem[] => {
        if (!arr.length) return [];

        const out: AnnItem[] = [];
        let used = 0;

        for (let k = 0; k < arr.length; k++) {
            const a = arr[(head + k) % arr.length];

            const key = a.__wKey ?? `${a.id}:${k}`;
            // ✅ height واقعی اگر موجود بود، وگرنه fallback کوچک/کم‌محافظه‌کار
            const measuredH = heightMapRef.current[key]?.h;
            const h = clamp(70, measuredH ?? 120, STACK_HEIGHT);

            const gap = out.length === 0 ? 0 : MAIN_GAP;
            const top = out.length === 0 ? 0 : used + gap;
            const bottom = top + h;

            if (bottom > STACK_HEIGHT) {
                if (!out.length) {
                    // اگر حتی خودش جا نشد (نباید با paging رخ بده)، یک‌تایی نمایش بده
                    out.push({ ...a, __y: 0, __maxH: STACK_HEIGHT, __idx: 0 });
                }
                break;
            }

            out.push({ ...a, __y: top, __maxH: h, __idx: out.length });
            used = bottom;
        }

        if (!out.length && arr.length) {
            out.push({ ...arr[head], __y: 0, __maxH: STACK_HEIGHT, __idx: 0 });
        }

        return out;
    }, []);

    // ─── signatures برای restart صحیح ───────────────────────────
    const virtualSig = useMemo(() => {
        // وقتی heightVersion هم تغییر کند، packing بهتر می‌شود → scheduler refresh
        return virtualItems.map((x) => `${x.id}:${x.__wKey ?? ""}:${x.created_at ?? ""}`).join("|") + `::h${heightVersion}::c${chromeH}::l${lineH}`;
    }, [virtualItems, heightVersion, chromeH, lineH]);

    // ─── Relative time tick ─────────
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
        const sum = win.reduce((acc, x) => acc + estimateReadingMs(String(x.message ?? ""), x.duration_sec), 0);
        const overhead = 700 + win.length * 220;
        return clamp(4200, sum + overhead, 24000);
    }, []);

    // ─── Scheduler ─────────────────
    const showWindowAndScheduleNext = useCallback(
        (startHead: number) => {
            clearTimer();

            if (!virtualItems.length) {
                setItems([]);
                return;
            }

            headRef.current = ((startHead % virtualItems.length) + virtualItems.length) % virtualItems.length;

            const win = computeWindow(virtualItems, headRef.current);
            setItems(win);

            if (virtualItems.length <= 1) return;

            const step = getVisibleCount(win);
            const dur = computeDurationForWindow(win);

            timerRef.current = setTimeout(() => {
                const nextHead = (headRef.current + step) % virtualItems.length;
                showWindowAndScheduleNext(nextHead);
            }, dur);
        },
        [virtualItems, clearTimer, computeWindow, computeDurationForWindow],
    );

    useEffect(() => {
        showWindowAndScheduleNext(0);
        return () => clearTimer();
    }, [virtualSig, showWindowAndScheduleNext, clearTimer]);

    useEffect(() => () => clearTimer(), [clearTimer]);

    const onStackLayout = useCallback(
        (e: LayoutChangeEvent) => {
            const w = Math.floor(e.nativeEvent.layout.width);
            if (w && w !== stackW) setStackW(w);
        },
        [stackW],
    );

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

            {/* OFFSCREEN MEASURERS */}
            {!!stackW && (
                <View pointerEvents="none" style={[styles.measurerWrap, { width: stackW }]}>
                    {/* Chrome height measurer (یک بار) */}
                    <View style={[styles.card, { borderWidth: 0 }]} onLayout={(e) => onMeasuredChrome(e.nativeEvent.layout.height)}>
                        <View style={styles.row}>
                            <View style={{ flex: 1, gap: 4, paddingHorizontal: 10 }}>
                                <View style={{ flexDirection: "row", gap: 10, alignContent: "center", alignItems: "center" }}>
                                    <View style={styles.textArea}>
                                        <View style={styles.titleRow}>
                                            <CustomText fontType="YekanBakh" weight="Regular" size={9} applyThemeColor={false} style={{ opacity: 0 }}>
                                                ۱۴۰۴/۰۱/۰۱
                                            </CustomText>
                                            <CustomText fontType="YekanBakh" weight="SemiBold" size={12} applyThemeColor={false} style={{ opacity: 0 }}>
                                                عنوان تست
                                            </CustomText>
                                        </View>
                                    </View>
                                    <View style={{ width: 24, height: 24, opacity: 0 }} />
                                </View>
                            </View>
                        </View>
                    </View>

                    {/* Measure full-message lines (برای page بندی) */}
                    {filtered.map((a) => {
                        const key = a.id;
                        const already = !!textMapRef.current[key]?.lines?.length;
                        if (already) return null;

                        return (
                            <View key={`t-${key}`} style={[styles.card, { borderWidth: 0 }]}>
                                <View style={styles.row}>
                                    <View style={{ flex: 1, gap: 4, paddingHorizontal: 10 }}>
                                        <View style={{ flexDirection: "row", gap: 10, alignContent: "center", alignItems: "center" }}>
                                            <View style={styles.textArea}>
                                                <View style={styles.titleRow}>
                                                    <CustomText fontType="YekanBakh" weight="Regular" size={9} applyThemeColor={false} style={{ opacity: 0 }}>
                                                        {formatPersianDateShort(a.created_at)}
                                                    </CustomText>
                                                    <CustomText fontType="YekanBakh" weight="SemiBold" size={12} applyThemeColor={false} style={{ opacity: 0 }}>
                                                        {a.title}
                                                    </CustomText>
                                                </View>
                                            </View>
                                            <View style={{ width: 24, height: 24, opacity: 0 }} />
                                        </View>

                                        <CustomText
                                            fontType="YekanBakh"
                                            weight="Regular"
                                            size={11}
                                            applyThemeColor={false}
                                            style={{ opacity: 0, textAlign: "right", paddingHorizontal: 8 }}
                                            onTextLayout={(e) => {
                                                const lines = e.nativeEvent.lines?.map((l) => l.text) ?? [];
                                                const lh = e.nativeEvent.lines?.[0]?.height;
                                                onMeasuredLines(key, lines, lh);
                                            }}
                                        >
                                            {String(a.message ?? "")}
                                        </CustomText>
                                    </View>
                                </View>
                            </View>
                        );
                    })}

                    {/* Measure REAL HEIGHT for each virtual card/page (برای packing دقیق) */}
                    {virtualItems.map((v) => {
                        const wKey = v.__wKey!;
                        if (!wKey) return null;

                        const already = !!heightMapRef.current[wKey]?.h;
                        if (already) return null;

                        return <MeasureCard key={`h-${wKey}`} data={v} stackW={stackW} onMeasured={(h) => onMeasuredCardHeight(wKey, h)} chromeH={chromeH} />;
                    })}
                </View>
            )}

            {/* Stack */}
            <View style={styles.stack} onLayout={onStackLayout}>
                {items.map((a, i) => (
                    <StackItem key={`${a.id}-${a.__wKey ?? a.__idx ?? i}`} data={a} colors={colors} zIndex={100 - i} chromeH={chromeH} />
                ))}
            </View>
        </ThemedView>
    );
};

// ─── Offscreen Card Measurer (REAL HEIGHT) ───────────────────────
const MeasureCard = React.memo(function MeasureCard({ data, onMeasured, chromeH }: { data: AnnItem; stackW: number; onMeasured: (h: number) => void; chromeH: number }) {
    const { colors, isDark } = useTheme();
    const typeConfig = getTypeConfig(isDark);
    const cfg = typeConfig[data.type] || typeConfig.info;

    const msg = String(data.message ?? "");

    return (
        <View
            style={[
                styles.absMeasure,
                {
                    width: "100%",
                },
            ]}
            onLayout={(e) => onMeasured(e.nativeEvent.layout.height)}
        >
            <View
                style={[
                    styles.card,
                    {
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

                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        {data.__pages && data.__pages > 1 && (
                                            <CustomText fontType="YekanBakh" weight="Regular" size={9} applyThemeColor={false} style={{ color: colors.text, opacity: 0.55 }}>
                                                {data.__page}/{data.__pages}
                                            </CustomText>
                                        )}
                                        <CustomText fontType="YekanBakh" weight="SemiBold" size={12} applyThemeColor={false} style={{ color: colors.text }}>
                                            {data.title}
                                        </CustomText>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
                                <AIcon type={data.type} isDark={isDark} />
                            </View>
                        </View>

                        {!!msg && (
                            <View style={{ maxHeight: Math.max(0, STACK_HEIGHT - chromeH) }}>
                                <CustomText fontType="YekanBakh" weight="Regular" size={11} applyThemeColor={false} style={{ color: colors.text, opacity: 0.85, textAlign: "right", paddingHorizontal: 8 }}>
                                    {msg}
                                </CustomText>
                            </View>
                        )}
                    </View>
                </View>
            </View>
        </View>
    );
});

// ─── Stack Item ──────────────────
const StackItem = React.memo(function StackItem({ data, colors, zIndex, chromeH }: { data: AnnItem; colors: any; zIndex: number; chromeH: number }) {
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

    const msg = String(data.message ?? "");

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

                                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                                        {data.__pages && data.__pages > 1 && (
                                            <CustomText fontType="YekanBakh" weight="Regular" size={9} applyThemeColor={false} style={{ color: colors.text, opacity: 0.55 }}>
                                                {data.__page}/{data.__pages}
                                            </CustomText>
                                        )}
                                        <CustomText fontType="YekanBakh" weight="SemiBold" size={12} applyThemeColor={false} style={{ color: colors.text }}>
                                            {data.title}
                                        </CustomText>
                                    </View>
                                </View>
                            </View>

                            <View style={[styles.iconCircle, { backgroundColor: cfg.bg }]}>
                                <AIcon type={data.type} isDark={isDark} />
                            </View>
                        </View>

                        {!!msg && (
                            <View style={{ maxHeight: Math.max(0, maxH - chromeH) }}>
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

    measurerWrap: {
        position: "absolute",
        left: -9999,
        top: -9999,
        opacity: 0,
    },

    // برای اندازه‌گیری کارت‌ها: absolute داخل measurerWrap
    absMeasure: {
        position: "relative",
    },
});
