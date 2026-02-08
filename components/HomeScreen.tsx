import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, StatusBar, Platform, TouchableOpacity, Text } from "react-native";
import { tokenService, deviceService } from "../src/services";
import { pairCodeService } from "../src/services/pairCodeService";
import * as NavigationBar from "expo-navigation-bar";
import { Advertisement } from "../src/components/advertisement/Advertisement";
import { Clock } from "../src/components/clock/Clock";
import { SensorTestScreen } from "./SensorTestScreen";
import { useTheme } from "../src/contexts/ThemeContext";
import { useDeviceAuth } from "@/src/hooks";
import { useOTAUpdate } from "@/src/hooks/useOTAUpdate";
import { useAppUpdate } from "@/src/hooks/useAppUpdate";

export default function HomeScreen({ onLogout }: { onLogout: () => void }) {
    const { colors, mode } = useTheme();
    const deviceAuth = useDeviceAuth();

    // OTA Update — آپدیت JS bundle هر 5 دقیقه
    const otaUpdate = useOTAUpdate({
        checkInterval: 5 * 60 * 1000, // هر 5 دقیقه
        autoApply: true,
        enabled: true,
    });

    // Native APK Update — چک APK جدید هر 30 دقیقه
    const appUpdate = useAppUpdate({
        checkInterval: 30 * 60 * 1000, // هر 30 دقیقه
        autoInstall: true,
        enabled: true,
    });

    const [showTestScreen, setShowTestScreen] = useState(false);
    const tapCountRef = useRef(0);
    const tapTimerRef = useRef<number | null>(null);
    // Enable Kiosk Mode (Full Immersive)
    useEffect(() => {
        enableKioskMode();

        return () => {
            // Cleanup not needed - stay in kiosk mode
        };
    }, []);

    const enableKioskMode = async () => {
        try {
            if (Platform.OS === "android") {
                // Hide navigation bar and make it immersive
                await NavigationBar.setVisibilityAsync("hidden");
                await NavigationBar.setBehaviorAsync("overlay-swipe");
                console.log("✅ Kiosk mode enabled");
            }
        } catch (error) {
            console.error("❌ Error enabling kiosk mode:", error);
        }
    };

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

        return () => clearInterval(interval);
    }, [onLogout]);

    // Triple Tap handler برای باز کردن Test Screen
    const handleClockTap = () => {
        tapCountRef.current += 1;

        // Clear previous timer
        if (tapTimerRef.current) {
            clearTimeout(tapTimerRef.current);
        }

        // اگر 3 بار tap شد، Test Screen رو نشون بده
        if (tapCountRef.current === 3) {
            console.log("🔧 Opening Sensor Test Screen");
            setShowTestScreen(true);
            tapCountRef.current = 0;
            return;
        }

        // Reset tap count بعد از 1 ثانیه
        tapTimerRef.current = setTimeout(() => {
            tapCountRef.current = 0;
        }, 1000);
    };

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
        <View style={[styles.container, { backgroundColor: colors.background }]}>
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
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    mainLayout: {
        flex: 1,
        flexDirection: "row",
        padding: 24,
        gap: 12,
    },
    advertisementSection: {
        flex: 55,
        borderRadius: 14,
        overflow: "hidden",
    },
    clockSection: {
        flex: 45,
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
