import { CustomText } from "@/src/components/shared";
import { getAndroidId } from "@/src/services/androidId";
import { deviceService } from "@/src/services/device.service";
import { networkService } from "@/src/services/networkService";
import { pairCodeService } from "@/src/services/pairCodeService";
import { tokenService } from "@/src/services/tokenService";
import { formatIranTime, formatPersianDate } from "@/src/utils/dateUtils";
import { images } from "@/src/assets";
import React, { useEffect, useRef, useState } from "react";
import { ImageBackground, StyleSheet, View, StatusBar, Animated } from "react-native";

interface OfflineScreenProps {
    onConnected?: (onLog?: (message: string) => void) => void;
}

export default function OfflineScreen({ onConnected }: OfflineScreenProps) {
    const [time, setTime] = useState(new Date());
    const [pairCode, setPairCode] = useState<string | null>(null);
    const [status, setStatus] = useState<string>("در حال بررسی...");

    const activateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasRegisteredRef = useRef(false);
    const isProcessingRef = useRef(false);

    // Animation for status dot
    const pulseAnim = useRef(new Animated.Value(0.5)).current;

    // الگوی استایل: backgroundColor rgba(..., 0.70) + borderColor (همان رنگ) + نقطه سفید
    const getStatusStyle = (currentStatus: string) => {
        if (currentStatus.includes("خطا")) {
            return { backgroundColor: "rgba(255, 82, 82, 0.70)", borderColor: "#FF5252" }; // قرمز
        }
        if (currentStatus.includes("انتظار") || currentStatus.includes("تایید")) {
            return { backgroundColor: "rgba(255, 215, 64, 0.70)", borderColor: "#FFD740" }; // زرد
        }
        if (currentStatus.includes("بررسی") || currentStatus.includes("ثبت")) {
            return { backgroundColor: "rgba(68, 138, 255, 0.70)", borderColor: "#448AFF" }; // آبی
        }
        if (currentStatus.includes("اعتبار") || currentStatus === "متصل شد") {
            return { backgroundColor: "rgba(17, 201, 149, 0.70)", borderColor: "#11C995" }; // سبز
        }
        return { backgroundColor: "rgba(176, 190, 197, 0.70)", borderColor: "#B0BEC5" }; // خاکستری
    };

    const statusStyle = getStatusStyle(status);

    // Animation effect
    useEffect(() => {
        Animated.loop(
            Animated.sequence([
                Animated.timing(pulseAnim, {
                    toValue: 1,
                    duration: 1000,
                    useNativeDriver: true,
                }),
                Animated.timing(pulseAnim, {
                    toValue: 0.5,
                    duration: 1000,
                    useNativeDriver: true,
                }),
            ]),
        ).start();
    }, [pulseAnim]);

    // Update time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Initial setup on mount
    useEffect(() => {
        initialize();

        return () => {
            // Cleanup
            if (activateIntervalRef.current) {
                clearInterval(activateIntervalRef.current);
                activateIntervalRef.current = null;
            }
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const initialize = async () => {
        try {
            // Check if we already have a token
            const existingToken = await tokenService.get();
            if (existingToken) {
                console.log("✅ Token exists, validating...");
                setStatus("در حال بررسی اعتبار...");

                try {
                    await deviceService.auth();
                    console.log("✅ Token is valid");
                    if (onConnected) {
                        onConnected();
                    }
                    return;
                } catch (error: any) {
                    if (error?.response?.status === 401) {
                        console.log("❌ Token is invalid, removing...");
                        await tokenService.remove();
                        await pairCodeService.remove();
                        hasRegisteredRef.current = false;
                    }
                }
            }

            // Check for existing pair code
            const existingPairCode = await pairCodeService.get();
            if (existingPairCode) {
                console.log("✅ Existing pair code found:", existingPairCode);
                setPairCode(existingPairCode);
                setStatus("در انتظار تایید ادمین");
                startActivatePolling(existingPairCode);
                return;
            }

            // Register device
            await registerDevice();
        } catch (error) {
            console.error("Error in initialize:", error);
            setStatus("خطا در بارگذاری");
        }
    };

    const registerDevice = async () => {
        if (hasRegisteredRef.current || isProcessingRef.current) {
            console.log("⏭️ Registration already in progress or completed");
            return;
        }

        try {
            isProcessingRef.current = true;
            hasRegisteredRef.current = true;

            setStatus("در حال ثبت دستگاه...");
            console.log("📝 Registering device...");

            const androidId = await getAndroidId();
            const ipAddress = await networkService.getIpAddress();

            const response = await deviceService.register({
                serial: androidId,
                app_version: "1.0.0",
                ip_address: ipAddress || null,
            });

            const newPairCode = response.pair_code;
            if (newPairCode) {
                console.log("✅ Device registered successfully. Pair code:", newPairCode);
                await pairCodeService.save(newPairCode);
                setPairCode(newPairCode);
                setStatus("در انتظار تایید ادمین");
                startActivatePolling(newPairCode);
            } else {
                console.warn("⚠️ No pair_code in response");
                setStatus("خطا در دریافت کد");
            }
        } catch (error: any) {
            console.error("❌ Error registering device:", error);
            setStatus("خطا در ثبت دستگاه");

            // Retry after 10 seconds
            setTimeout(() => {
                hasRegisteredRef.current = false;
                isProcessingRef.current = false;
                registerDevice();
            }, 10000);
        } finally {
            isProcessingRef.current = false;
        }
    };

    const startActivatePolling = (code: string) => {
        console.log("🔄 Starting activation polling for code:", code);

        // Clear existing interval
        if (activateIntervalRef.current) {
            clearInterval(activateIntervalRef.current);
            activateIntervalRef.current = null;
        }

        // Poll every 5 seconds
        activateIntervalRef.current = setInterval(async () => {
            try {
                // Check if we already have a token (might have been set by another process)
                const existingToken = await tokenService.get();
                if (existingToken) {
                    console.log("✅ Token found, stopping polling");
                    if (activateIntervalRef.current) {
                        clearInterval(activateIntervalRef.current);
                        activateIntervalRef.current = null;
                    }
                    if (onConnected) {
                        onConnected();
                    }
                    return;
                }

                // Get current pair code from storage
                const currentPairCode = await pairCodeService.get();
                if (!currentPairCode) {
                    console.log("⚠️ No pair code in storage, stopping polling");
                    if (activateIntervalRef.current) {
                        clearInterval(activateIntervalRef.current);
                        activateIntervalRef.current = null;
                    }
                    return;
                }

                // Try to activate
                const response = await deviceService.activate({
                    pair_code: currentPairCode,
                });

                const token = response.token;
                if (token) {
                    console.log("🎉 Device activated! Token received");
                    await tokenService.save(token);
                    await pairCodeService.remove();

                    // Stop polling
                    if (activateIntervalRef.current) {
                        clearInterval(activateIntervalRef.current);
                        activateIntervalRef.current = null;
                    }

                    // Redirect to home
                    if (onConnected) {
                        onConnected();
                    }
                }
            } catch (error: any) {
                const status = error?.response?.status;
                const apiMessage: string | undefined = error?.response?.data?.message;

                if (status === 404) {
                    console.log("❌ Invalid pair code (404)");
                    await pairCodeService.remove();
                    setPairCode(null);
                    if (activateIntervalRef.current) {
                        clearInterval(activateIntervalRef.current);
                        activateIntervalRef.current = null;
                    }
                    // Retry registration with a brand new code
                    hasRegisteredRef.current = false;
                    registerDevice();
                } else if (status === 400) {
                    // 400 می‌تونه یعنی pending یا اینکه کد Pair منقضی شده
                    if (apiMessage && apiMessage.toLowerCase().includes("pair code has expired")) {
                        console.log("⌛ Pair code expired. Re-registering device...");
                        // کد قبلی منقضی شده؛ پاک کن و دوباره درخواست ثبت دستگاه بده
                        await pairCodeService.remove();
                        setPairCode(null);
                        if (activateIntervalRef.current) {
                            clearInterval(activateIntervalRef.current);
                            activateIntervalRef.current = null;
                        }
                        hasRegisteredRef.current = false;
                        setStatus("کد قبلی منقضی شد، در حال دریافت کد جدید...");
                        registerDevice();
                    } else {
                        // Device still pending - continue polling
                        console.log("⏳ Device pending confirmation (400)");
                    }
                } else {
                    console.error("❌ Activation error:", error.message);
                }
            }
        }, 5000);
    };

    const formatTime = (date: Date) => {
        return formatIranTime(date);
    };

    const formatDate = (date: Date) => {
        return formatPersianDate(date);
    };

    return (
        <ImageBackground source={images.offlinePage} style={styles.container} resizeMode="cover">
            <StatusBar hidden={true} />
            <View style={styles.safeArea}>
                <View style={styles.content}>
                    {/* Figma: Date on top, Time below */}
                    <View style={styles.clockContainer}>
                        <CustomText size={20} weight="Regular" fontType="YekanBakh" style={{ color: "#FFFFFF" }}>
                            {formatDate(time)}
                        </CustomText>
                        <CustomText fontType="Michroma" weight="Regular" size={80} style={{ color: "#FFFFFF", lineHeight: 80 }}>
                            {formatTime(time)}
                        </CustomText>
                    </View>

                    {pairCode && (
                        <View style={styles.pairCodeContainer}>
                            <CustomText size={32} weight="Regular" fontType="Michroma" style={{ letterSpacing: 4, lineHeight: 32, color: "#FFFFFF" }}>
                                {pairCode}
                            </CustomText>
                        </View>
                    )}

                    <View
                        style={[
                            styles.statusContainer,
                            {
                                backgroundColor: statusStyle.backgroundColor,
                                borderColor: statusStyle.borderColor,
                                borderWidth: 1,
                            },
                        ]}
                    >
                        <CustomText size={16} weight="Regular" fontType="YekanBakh" style={{ color: "#FFFFFF" }}>
                            {status}
                        </CustomText>
                        <Animated.View
                            style={[
                                styles.statusDot,
                                {
                                    backgroundColor: "#FFFFFF",
                                    opacity: pulseAnim,
                                    transform: [{ scale: pulseAnim }],
                                    shadowColor: statusStyle.borderColor,
                                    shadowOffset: { width: 0, height: 0 },
                                    shadowOpacity: 0.8,
                                    shadowRadius: 10,
                                    elevation: 5,
                                },
                            ]}
                        />
                    </View>
                </View>
            </View>
        </ImageBackground>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: "100%",
        height: "100%",
    },
    safeArea: {
        flex: 1,
    },
    content: {
        flex: 1,
        justifyContent: "flex-start",
        alignItems: "center",
        paddingTop: 56,
    },
    clockContainer: {
        alignItems: "center",
        marginBottom: 24,
    },
    dateText: {
        fontSize: 28,
        color: "#FFFFFF",
        fontFamily: "YekanBakh-Regular",
        marginBottom: 12,
    },
    timeText: {
        fontSize: 72,
        fontWeight: "400",
        color: "#FFFFFF",
        fontFamily: "Michroma-Regular",
    },
    pairCodeContainer: {
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
        paddingVertical: 16,
        backgroundColor: "rgba(17, 201, 149, 0.70)",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#11C995",
    },
    pairCodeText: {
        fontSize: 32,
        fontWeight: "bold",
        color: "#FFFFFF",
        letterSpacing: 4,
        fontFamily: "Michroma-Regular",
    },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
        alignSelf: "center",
        marginTop: 0,
        backgroundColor: "rgba(17, 201, 149, 0.70)",
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 24,
        borderWidth: 1,
        position: "absolute",
        bottom: 40,
        gap: 20,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        marginRight: 10,
    },
    statusText: {
        fontSize: 16,
        color: "#FFFFFF",
        fontFamily: "YekanBakh-Regular",
    },
});
