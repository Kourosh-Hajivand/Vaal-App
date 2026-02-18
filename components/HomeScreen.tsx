import React, { useEffect, useState } from "react";
import { StyleSheet, View, StatusBar, TouchableOpacity, Text } from "react-native";
import { tokenService, deviceService } from "../src/services";
import { pairCodeService } from "../src/services/pairCodeService";
import { Advertisement } from "../src/components/advertisement/Advertisement";
import { Clock } from "../src/components/clock/Clock";
import { SensorTestScreen } from "./SensorTestScreen";
import { useTheme } from "../src/contexts/ThemeContext";
import { useDeviceAuth } from "@/src/hooks";
import { useOTAUpdate } from "@/src/hooks/useOTAUpdate";
import { useAppUpdate } from "@/src/hooks/useAppUpdate";
import { DebugPanelProvider } from "../src/contexts/DebugPanelContext";

export default function HomeScreen({ onLogout }: { onLogout: () => void }) {
    const { colors, mode } = useTheme();
    const deviceAuth = useDeviceAuth();

    // OTA Update — آپدیت JS bundle هر 5 دقیقه
    const otaUpdate = useOTAUpdate({
        checkInterval: 5 * 60 * 1000, // هر 5 دقیقه
        autoApply: true,
        enabled: true,
    });

    // Native APK Update — فعلاً غیرفعال (API مسیر app-version روی سرور وجود نداره)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const appUpdate = useAppUpdate({
        checkInterval: 30 * 60 * 1000,
        autoInstall: true,
        enabled: false, // تا وقتی route /api/devices/app-version اضافه نشه، کال نزن
    });

    const [showTestScreen, setShowTestScreen] = useState(false);

    // Token validation هر 5 دقیقه
    useEffect(() => {
        const validateToken = async () => {
            console.log("🔐 [TOKEN] Validating token...");
            try {
                await deviceService.auth();
                console.log("✅ [TOKEN] Token is valid");
            } catch (error: any) {
                if (error?.response?.status === 401) {
                    console.log("❌ [TOKEN] Token is invalid (401), logging out...");
                    await tokenService.remove();
                    await pairCodeService.remove();
                    onLogout?.();
                }
            }
        };

        // اولین validation بلافاصله
        validateToken();

        // هر 5 دقیقه validation
        const interval = setInterval(validateToken, 5 * 60 * 1000);

        return () => {
            clearInterval(interval);
        };
    }, [onLogout]);

    if (showTestScreen) {
        return (
            <View style={[styles.container, { backgroundColor: colors.background }]}>
                <StatusBar hidden={true} />
                <SensorTestScreen />
                {/* دکمه بازگشت */}
                <TouchableOpacity style={[styles.backButton, { backgroundColor: colors.info || "#2962FF" }]} onPress={() => setShowTestScreen(false)}>
                    <View style={styles.backButtonContent}>
                        <Text style={styles.backButtonText}>← بازگشت</Text>
                    </View>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <DebugPanelProvider>
            <View style={[styles.container, { backgroundColor: "black" }]}>
                {/* StatusBar */}
                <StatusBar hidden={true} barStyle={mode === "dark" ? "light-content" : "dark-content"} />

                {/* Layout: Advertisement (55%) + Clock (45%) */}
                <View style={styles.mainLayout}>
                    {/* Advertisement Section (55%) */}
                    <View style={styles.advertisementSection}>
                        <Advertisement />
                    </View>

                    {/* Clock Section (45%) - Triple Tap to open Test Screen */}
                    <View style={styles.clockSection}>
                        <Clock />
                    </View>
                </View>
            </View>
        </DebugPanelProvider>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mainLayout: {
        flex: 1,
        flexDirection: "row",
        gap: 10,
    },
    advertisementSection: {
        flex: 50,
        borderRadius: 14,
        overflow: "hidden",
    },
    clockSection: {
        flex: 50,
        shadowOpacity: 0,
        elevation: 0,
    },
    backButton: {
        position: "absolute",
        top: 20,
        right: 20,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        elevation: 5,
    },
    backButtonContent: {
        alignItems: "center",
        justifyContent: "center",
    },
    backButtonText: {
        color: "#FFFFFF",
        fontSize: 16,
        fontWeight: "bold",
    },
});
