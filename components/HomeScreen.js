import React, { useEffect, useState, useRef } from "react";
import { StyleSheet, View, StatusBar, Platform, TouchableOpacity } from "react-native";
import { tokenService, deviceService } from "../src/services";
import { pairCodeService } from "../src/services/pairCodeService";
import * as NavigationBar from "expo-navigation-bar";
import { Advertisement } from "../src/components/advertisement/Advertisement";
import { Clock } from "../src/components/clock/Clock";
import { SensorTestScreen } from "./SensorTestScreen";

export default function HomeScreen({ onLogout }) {
    const [showTestScreen, setShowTestScreen] = useState(false);
    const tapCountRef = useRef(0);
    const tapTimerRef = useRef(null);
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
            } catch (error) {
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
            console.log('🔧 Opening Sensor Test Screen');
            setShowTestScreen(true);
            tapCountRef.current = 0;
            return;
        }

        // Reset tap count بعد از 1 ثانیه
        tapTimerRef.current = setTimeout(() => {
            tapCountRef.current = 0;
        }, 1000);
    };

    // اگر Test Screen فعال باشه، اونو نشون بده
    if (showTestScreen) {
        return (
            <View style={styles.container}>
                <StatusBar hidden={true} />
                <SensorTestScreen />
                {/* دکمه بازگشت */}
                <TouchableOpacity
                    style={styles.backButton}
                    onPress={() => setShowTestScreen(false)}
                >
                    <View style={styles.backButtonContent}>
                        <View style={styles.backButtonText}>← Back</View>
                    </View>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {/* StatusBar کاملاً مخفی */}
            <StatusBar hidden={true} />

            {/* Landscape Layout: Advertisement (70%) + Clock (30%) */}
            <View style={styles.landscapeLayout}>
                {/* Advertisement Section (70%) */}
                <View style={styles.advertisementSection}>
                    <Advertisement />
                </View>

                {/* Clock Section (30%) - Triple Tap to open Test Screen */}
                <TouchableOpacity 
                    style={styles.clockSection} 
                    onPress={handleClockTap}
                    activeOpacity={0.95}
                >
                    <Clock />
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    landscapeLayout: {
        flex: 1,
        flexDirection: "row",
    },
    advertisementSection: {
        flex: 7, // 70% width
        backgroundColor: "#000",
    },
    clockSection: {
        flex: 3, // 30% width
        backgroundColor: "#F5F5F5",
        padding: 16,
    },
    backButton: {
        position: 'absolute',
        top: 20,
        right: 20,
        backgroundColor: '#2962FF',
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 8,
        elevation: 5,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
    },
    backButtonContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    backButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: 'bold',
    },
});
