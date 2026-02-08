/**
 * CloudLayer ANDROID-OPTIMIZED (Worklet-safe, Smooth)
 * - Android only: blur=0
 * - count کمتر
 * - memo برای جلوگیری از rerender
 */

import React, { memo, useCallback, useMemo, useState } from "react";
import { View, StyleSheet, LayoutChangeEvent } from "react-native";
import { Image } from "expo-image";
import Animated, { Easing, useAnimatedReaction, useAnimatedStyle, useSharedValue, withDelay, withRepeat, withSequence, withTiming } from "react-native-reanimated";

type CloudSource = any;

type CloudConfig = {
    id: string;
    source: CloudSource;

    top: number;
    width: number;
    height: number;

    speedPxPerSec: number;
    startDelayMs: number;

    baseOpacity: number;
    pulseAmp: number;
    pulseCycleMs: number;
    pulseDelayMs: number;

    edgeFadePx: number;
};

const EASE_MOVE = Easing.linear;
const EASE_SOFT = Easing.inOut(Easing.ease);

const CLOUD_SOURCES: CloudSource[] = [require("@/assets/Cloud/Cloud1.png"), require("@/assets/Cloud/Cloud2.png"), require("@/assets/Cloud/Cloud3.png"), require("@/assets/Cloud/Cloud1.png"), require("@/assets/Cloud/Cloud2.png"), require("@/assets/Cloud/Cloud3.png")];

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

const CloudLayerImpl: React.FC<Props> = ({ contentWidth = 0, height = 160, count = 6, intensity = 1, zIndex = 3 }) => {
    const [measuredWidth, setMeasuredWidth] = useState(0);
    const W = contentWidth || measuredWidth;

    const onLayout = useCallback(
        (e: LayoutChangeEvent) => {
            const w = e.nativeEvent.layout.width;
            if (w && w !== measuredWidth) setMeasuredWidth(w);
        },
        [measuredWidth],
    );

    const clouds = useMemo<CloudConfig[]>(() => {
        if (!W) return [];
        const layerH = height;

        return Array.from({ length: count }).map((_, idx) => {
            const scale = rand(0.6, 1.0) * intensity;

            const baseW = rand(100, 160);
            const width = baseW * scale;
            const heightPx = baseW * 0.72 * scale;

            const top = rand(0, Math.max(0, layerH - heightPx - 4));

            const speedPxPerSec = rand(9, 18) / Math.max(0.7, scale);

            const baseOpacity = rand(0.1, 0.2) / Math.max(0.85, scale);
            const pulseAmp = rand(0.04, 0.1) / Math.max(0.85, scale);

            const pulseCycleMs = rand(9000, 16000);
            const startDelayMs = rand(0, 18000);
            const pulseDelayMs = rand(0, 4000);

            const edgeFadePx = rand(70, 140);

            return {
                id: `${idx}-${uid()}`,
                source: pick(CLOUD_SOURCES),
                top,
                width,
                height: heightPx,
                speedPxPerSec,
                startDelayMs,
                baseOpacity,
                pulseAmp,
                pulseCycleMs,
                pulseDelayMs,
                edgeFadePx,
            };
        });
    }, [W, height, count, intensity]);

    if (!W) {
        return <View pointerEvents="none" style={[styles.layer, { height, zIndex }]} onLayout={onLayout} />;
    }

    return (
        <View pointerEvents="none" style={[styles.layer, { height, zIndex }]} onLayout={onLayout}>
            {clouds.map((cfg) => (
                <Cloud key={cfg.id} cfg={cfg} contentWidth={W} />
            ))}
        </View>
    );
};

const Cloud = memo(({ cfg, contentWidth }: { cfg: CloudConfig; contentWidth: number }) => {
    const startX = -cfg.width - 24;
    const endX = contentWidth + cfg.width + 24;

    const x = useSharedValue(startX);
    const pulse = useSharedValue(0);

    const durationMs = Math.max(17000, ((endX - startX) / cfg.speedPxPerSec) * 1000);

    React.useEffect(() => {
        x.value = startX;
        x.value = withDelay(cfg.startDelayMs, withTiming(endX, { duration: durationMs, easing: EASE_MOVE }));

        pulse.value = 0;
        pulse.value = withDelay(cfg.pulseDelayMs, withRepeat(withSequence(withTiming(1, { duration: cfg.pulseCycleMs / 2, easing: EASE_SOFT }), withTiming(0, { duration: cfg.pulseCycleMs / 2, easing: EASE_SOFT })), -1, false));
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useAnimatedReaction(
        () => x.value,
        (val, prev) => {
            if (prev == null) return;
            if (prev < endX - 2 && val >= endX - 2) {
                x.value = startX;
                x.value = withDelay(cfg.startDelayMs, withTiming(endX, { duration: durationMs, easing: EASE_MOVE }));
            }
        },
        [endX],
    );

    const animStyle = useAnimatedStyle(() => {
        const leftRaw = (x.value - startX) / cfg.edgeFadePx;
        const rightRaw = (endX - x.value) / cfg.edgeFadePx;

        const leftFade = Math.max(0, Math.min(1, leftRaw));
        const rightFade = Math.max(0, Math.min(1, rightRaw));
        const edgeFade = Math.min(leftFade, rightFade);

        const o = (cfg.baseOpacity + cfg.pulseAmp * pulse.value) * edgeFade;

        return {
            transform: [{ translateX: x.value }],
            opacity: o,
        };
    });

    return (
        <Animated.View renderToHardwareTextureAndroid style={[styles.cloudWrap, { top: cfg.top, width: cfg.width, height: cfg.height }, animStyle]}>
            <Image source={cfg.source} style={{ width: cfg.width, height: cfg.height }} contentFit="contain" blurRadius={0} cachePolicy="memory-disk" />
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
