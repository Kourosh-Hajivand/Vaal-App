/**
 * CloudLayer — بهینه برای پرفورمنس
 * - بدون useAnimatedReaction (لوپ با withRepeat)
 * - بدون انیمیشن pulse (opacity ثابت)
 * - تعداد ابر کمتر، محاسبات ساده‌تر
 */

import React, { memo, useCallback, useMemo, useState } from "react";
import { View, StyleSheet, LayoutChangeEvent, Platform } from "react-native";
import { Image } from "expo-image";
import Animated, {
    Easing,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming,
} from "react-native-reanimated";

type CloudSource = number;
type CloudConfig = {
    id: string;
    source: CloudSource;
    top: number;
    width: number;
    height: number;
    durationMs: number;
    startDelayMs: number;
    baseOpacity: number;
    edgeFadePx: number;
    startX: number;
    endX: number;
};

const EASE_LINEAR = Easing.linear;

const CLOUD_SOURCES: CloudSource[] = [
    require("@/assets/Cloud/Cloud1.png"),
    require("@/assets/Cloud/Cloud2.png"),
    require("@/assets/Cloud/Cloud3.png"),
];

const rand = (min: number, max: number) => min + Math.random() * (max - min);
const pick = <T,>(arr: T[]) => arr[Math.floor(Math.random() * arr.length)];
const uid = () => `${Date.now()}-${Math.floor(Math.random() * 1e9)}`;

type Props = {
    contentWidth?: number;
    height?: number;
    count?: number;
    intensity?: 0.6 | 0.8 | 1 | 1.2;
    zIndex?: number;
};

const DEFAULT_COUNT = 4;
const MIN_DURATION_MS = 20000;

const CloudLayerImpl: React.FC<Props> = ({
    contentWidth = 0,
    height = 160,
    count = DEFAULT_COUNT,
    intensity = 1,
    zIndex = 3,
}) => {
    const [measuredWidth, setMeasuredWidth] = useState(0);
    const W = contentWidth || measuredWidth;

    const onLayout = useCallback((e: LayoutChangeEvent) => {
        const w = e.nativeEvent.layout.width;
        if (w > 0) setMeasuredWidth((prev) => (prev !== w ? w : prev));
    }, []);

    const clouds = useMemo<CloudConfig[]>(() => {
        if (!W || W <= 0) return [];
        const layerH = height;
        const list: CloudConfig[] = [];

        for (let i = 0; i < count; i++) {
            const scale = rand(0.65, 0.95) * intensity;
            const baseW = rand(90, 140);
            const width = baseW * scale;
            const heightPx = baseW * 0.72 * scale;
            const top = rand(0, Math.max(0, layerH - heightPx - 4));
            const startX = -width - 24;
            const endX = W + width + 24;
            const speedPxPerSec = rand(8, 14) / Math.max(0.7, scale);
            const durationMs = Math.max(MIN_DURATION_MS, ((endX - startX) / speedPxPerSec) * 1000);
            const startDelayMs = rand(0, 8000);
            const baseOpacity = rand(0.12, 0.22) / Math.max(0.85, scale);
            const edgeFadePx = rand(60, 120);

            list.push({
                id: `cloud-${i}-${uid()}`,
                source: pick(CLOUD_SOURCES),
                top,
                width,
                height: heightPx,
                durationMs,
                startDelayMs,
                baseOpacity,
                edgeFadePx,
                startX,
                endX,
            });
        }
        return list;
    }, [W, height, count, intensity]);

    if (!W) {
        return (
            <View
                pointerEvents="none"
                style={[styles.layer, { height, zIndex }]}
                onLayout={onLayout}
                removeClippedSubviews={Platform.OS === "android"}
            />
        );
    }

    return (
        <View
            pointerEvents="none"
            style={[styles.layer, { height, zIndex }]}
            onLayout={onLayout}
            removeClippedSubviews={Platform.OS === "android"}
        >
            {clouds.map((cfg) => (
                <Cloud key={cfg.id} config={cfg} />
            ))}
        </View>
    );
};

const Cloud = memo(({ config }: { config: CloudConfig }) => {
    const { startX, endX, durationMs, startDelayMs, baseOpacity, edgeFadePx } = config;
    const x = useSharedValue(startX);

    React.useEffect(() => {
        x.value = startX;
        x.value = withDelay(
            startDelayMs,
            withRepeat(
                withSequence(
                    withTiming(endX, { duration: durationMs, easing: EASE_LINEAR }),
                    withTiming(startX, { duration: 0 })
                ),
                -1
            )
        );
    }, [startX, endX, durationMs, startDelayMs, x]);

    const animatedStyle = useAnimatedStyle(() => {
        "worklet";
        const leftRaw = (x.value - startX) / edgeFadePx;
        const rightRaw = (endX - x.value) / edgeFadePx;
        const leftFade = Math.max(0, Math.min(1, leftRaw));
        const rightFade = Math.max(0, Math.min(1, rightRaw));
        const opacity = baseOpacity * Math.min(leftFade, rightFade);
        return {
            transform: [{ translateX: x.value }],
            opacity,
        };
    }, [startX, endX, edgeFadePx, baseOpacity]);

    return (
        <Animated.View
            style={[styles.cloudWrap, { top: config.top, width: config.width, height: config.height }, animatedStyle]}
            renderToHardwareTextureAndroid={Platform.OS === "android"}
        >
            <Image
                source={config.source}
                style={{ width: config.width, height: config.height }}
                contentFit="contain"
                cachePolicy="memory-disk"
            />
        </Animated.View>
    );
});

Cloud.displayName = "Cloud";

const CloudLayer = memo(CloudLayerImpl);
CloudLayer.displayName = "CloudLayer";

export default CloudLayer;

const styles = StyleSheet.create({
    layer: {
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        overflow: "hidden",
    },
    cloudWrap: {
        position: "absolute",
        left: 0,
    },
});
