/**
 * پنل مانیتورینگ سیستم: RAM، CPU، FPS، Cache، Network
 */
import React from "react";
import { View, Text, StyleSheet } from "react-native";
import type { SystemMonitorSnapshot } from "@/src/hooks/monitoring/useSystemMonitor";

const BAR_HEIGHT = 6;
const BAR_BG = "rgba(255,255,255,0.15)";
const RAM_FILL = "#42A5F5";
const CPU_FILL = "#66BB6A";
const FPS_GOOD = "#4CAF50";
const FPS_MED = "#FFA726";
const FPS_BAD = "#F44336";

function ProgressBar({ percent, fillColor, label, valueText }: { percent: number; fillColor: string; label: string; valueText: string }) {
    const pct = Math.min(100, Math.max(0, percent));
    return (
        <View style={panelStyles.barRow}>
            <Text style={panelStyles.barLabel}>{label}</Text>
            <Text style={panelStyles.barValue}>{valueText}</Text>
            <View style={panelStyles.barTrack}>
                <View style={[panelStyles.barFill, { width: `${pct}%`, backgroundColor: fillColor }]} />
            </View>
        </View>
    );
}

function FpsBadge({ fps }: { fps: number }) {
    const color = fps >= 55 ? FPS_GOOD : fps >= 30 ? FPS_MED : FPS_BAD;
    return (
        <View style={[panelStyles.fpsBadge, { backgroundColor: color }]}>
            <Text style={panelStyles.fpsText}>{fps} FPS</Text>
        </View>
    );
}

export const SystemMonitorPanel: React.FC<{ snapshot: SystemMonitorSnapshot }> = ({ snapshot }) => {
    const { memory, cpuPercent, fps, cache, isOnline, connectionType } = snapshot;

    return (
        <View style={panelStyles.container}>
            <Text style={panelStyles.title}>📊 مانیتورینگ سیستم</Text>
            <View style={panelStyles.separator} />

            {memory && <ProgressBar label="RAM (واقعی دستگاه)" percent={memory.percentOfLimit} valueText={`${memory.usedStr} / ${memory.limitStr}`} fillColor={RAM_FILL} />}

            {cpuPercent !== null && <ProgressBar label="CPU (واقعی دستگاه)" percent={Math.min(100, cpuPercent)} valueText={`${cpuPercent}%`} fillColor={CPU_FILL} />}

            <View style={panelStyles.fpsRow}>
                <Text style={panelStyles.barLabel}>FPS</Text>
                <FpsBadge fps={fps} />
            </View>

            {cache && (
                <Text style={panelStyles.text}>
                    📦 Cache: {cache.totalSizeFormatted} ({cache.totalFiles} فایل — {cache.videoCount} ویدیو، {cache.imageCount} تصویر)
                </Text>
            )}

            <Text style={[panelStyles.text, isOnline ? panelStyles.online : panelStyles.offline]}>
                {isOnline ? "🟢 آنلاین" : "🔴 آفلاین"} ({connectionType})
            </Text>
            <View style={panelStyles.separator} />
        </View>
    );
};

const panelStyles = StyleSheet.create({
    container: {
        marginBottom: 4,
    },
    title: {
        color: "#fff",
        fontSize: 12,
        fontFamily: "YekanBakh-SemiBold",
        marginBottom: 4,
    },
    separator: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.25)",
        marginVertical: 6,
    },
    barRow: {
        marginBottom: 6,
    },
    barLabel: {
        color: "rgba(255,255,255,0.9)",
        fontSize: 10,
        fontFamily: "YekanBakh-Regular",
        marginBottom: 2,
    },
    barValue: {
        color: "rgba(255,255,255,0.7)",
        fontSize: 10,
        fontFamily: "YekanBakh-Regular",
        marginBottom: 2,
    },
    barTrack: {
        height: BAR_HEIGHT,
        backgroundColor: BAR_BG,
        borderRadius: 3,
        overflow: "hidden",
    },
    barFill: {
        height: "100%",
        borderRadius: 3,
    },
    fpsRow: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 6,
        gap: 8,
    },
    fpsBadge: {
        paddingHorizontal: 8,
        paddingVertical: 4,
        borderRadius: 6,
    },
    fpsText: {
        color: "#fff",
        fontSize: 11,
        fontFamily: "YekanBakh-SemiBold",
    },
    text: {
        color: "#fff",
        fontSize: 11,
        fontFamily: "YekanBakh-Regular",
        marginBottom: 3,
    },
    online: {
        color: "#4CAF50",
    },
    offline: {
        color: "#F44336",
    },
});
