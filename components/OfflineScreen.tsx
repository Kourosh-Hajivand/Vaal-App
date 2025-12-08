import { getAndroidId } from "@/src/services/androidId";
import { deviceService } from "@/src/services/device.service";
import { networkService } from "@/src/services/networkService";
import { pairCodeService } from "@/src/services/pairCodeService";
import { tokenService } from "@/src/services/tokenService";
import { formatIranTime, formatPersianDate } from "@/src/utils/dateUtils";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImageBackground, SafeAreaView, StyleSheet, Text, View, StatusBar, Platform } from "react-native";

interface OfflineScreenProps {
    onConnected?: () => void;
}

export default function OfflineScreen({ onConnected }: OfflineScreenProps) {
    const [time, setTime] = useState(new Date());
    const [pairCode, setPairCode] = useState<string | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isActivating, setIsActivating] = useState(false);
    const activateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasRegisteredRef = useRef(false);

    // Check token and authenticate when online
    const checkTokenAndAuth = useCallback(async () => {
        try {
            const isConnected = await networkService.isConnected();
            if (!isConnected) {
                return; // No internet, stay on offline screen
            }

            const existingToken = await tokenService.get();
            if (!existingToken) {
                // No token, proceed with registration
                console.log("ℹ️ No token found, starting registration process");
                registerDevice();
                checkExistingPairCode();
                return;
            }

            // Token exists, validate it with auth API
            console.log("🔐 Token exists, validating with auth API...");
            try {
                const response = await deviceService.auth();
                // If auth successful (not 401), trigger onConnected callback
                console.log("✅ Token is valid");
                if (onConnected) {
                    onConnected();
                }
            } catch (error: any) {
                // Check if it's 401 (Unauthorized)
                const status = error.response?.status;
                if (status === 401) {
                    console.log("❌ Token is invalid (401), removing token and starting fresh");
                    // Remove invalid token
                    await tokenService.remove();
                    await pairCodeService.remove();
                    // Reset refs
                    hasRegisteredRef.current = false;
                    // Start registration process
                    registerDevice();
                    checkExistingPairCode();
                } else {
                    // Other errors (network, etc.) - keep token and stay on offline screen
                    console.warn("⚠️ Auth check failed (non-401 error):", error.message);
                }
            }
        } catch (error) {
            console.error("Error in checkTokenAndAuth:", error);
        }
    }, [onConnected]);

    // Update time every second
    useEffect(() => {
        const interval = setInterval(() => {
            setTime(new Date());
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    // Check network connection and validate token when online (optimized interval)
    useEffect(() => {
        const networkCheckInterval = setInterval(async () => {
            const isConnected = await networkService.isConnected();
            if (isConnected) {
                await checkTokenAndAuth();
            }
        }, 10000); // Check every 10 seconds (reduced frequency for better performance)

        return () => clearInterval(networkCheckInterval);
    }, [checkTokenAndAuth]);

    // Subscribe to network changes
    useEffect(() => {
        const unsubscribe = networkService.subscribe(async (isConnected) => {
            if (isConnected) {
                await checkTokenAndAuth();
            }
        });

        return () => {
            unsubscribe();
        };
    }, [checkTokenAndAuth]);

    // Register device on mount (only if no token exists)
    useEffect(() => {
        checkTokenAndRegister();

        return () => {
            // Cleanup activate polling
            if (activateIntervalRef.current) {
                clearInterval(activateIntervalRef.current);
            }
        };
    }, []);

    // Auto-activate when pair code is available
    useEffect(() => {
        if (pairCode && !isActivating) {
            startActivatePolling();
        }
    }, [pairCode, isActivating]);

    const checkTokenAndRegister = async () => {
        try {
            const isConnected = await networkService.isConnected();
            if (!isConnected) {
                // No internet, just show offline screen
                console.log("ℹ️ No internet connection, showing offline screen");
                return;
            }

            // Check token and auth
            await checkTokenAndAuth();
        } catch (error) {
            console.error("Error checking token:", error);
            // On error, try to register anyway
            registerDevice();
            checkExistingPairCode();
        }
    };

    const checkExistingPairCode = async () => {
        try {
            // Check token first
            const existingToken = await tokenService.get();
            if (existingToken) {
                console.log("✅ Token exists, skipping pair code check");
                return;
            }

            const existingPairCode = await pairCodeService.get();
            if (existingPairCode) {
                setPairCode(existingPairCode);
                startActivatePolling();
            }
        } catch (error) {
            console.error("Error checking existing pair code:", error);
        }
    };

    const registerDevice = async () => {
        // Check token first
        const existingToken = await tokenService.get();
        if (existingToken) {
            console.log("✅ Token exists, skipping device registration");
            return;
        }

        if (hasRegisteredRef.current || isRegistering) return;

        try {
            setIsRegistering(true);
            hasRegisteredRef.current = true;

            // Get Android ID and IP address
            const androidId = await getAndroidId();
            const ipAddress = await networkService.getIpAddress();

            // Register device
            const response = await deviceService.register({
                serial: androidId,
                app_version: "1.0.0",
                ip_address: ipAddress || null,
            });

            const pairCode = response.data?.pair_code;
            if (pairCode) {
                await pairCodeService.save(pairCode);
                setPairCode(pairCode);
                console.log("✅ Device registered. Pair code:", pairCode);
                console.log("🔄 Starting activate polling...");
            } else {
                console.warn("⚠️ No pair_code in response:", JSON.stringify(response, null, 2));
            }
        } catch (error: any) {
            console.error("Error registering device:", error);
            // Retry after 10 seconds
            setTimeout(() => {
                hasRegisteredRef.current = false;
                registerDevice();
            }, 10000);
        } finally {
            setIsRegistering(false);
        }
    };

    const startActivatePolling = () => {
        console.log("🚀 Starting activate polling with pair code:", pairCode);

        // Stop existing polling
        if (activateIntervalRef.current) {
            clearInterval(activateIntervalRef.current);
        }

        // Start polling every 5 seconds (optimized for low-end devices)
        activateIntervalRef.current = setInterval(async () => {
            if (!pairCode || isActivating) return;

            // Check token before each activation attempt
            const existingToken = await tokenService.get();
            if (existingToken) {
                console.log("✅ Token already exists, stopping activation polling");
                if (activateIntervalRef.current) {
                    clearInterval(activateIntervalRef.current);
                    activateIntervalRef.current = null;
                }
                if (onConnected) {
                    onConnected();
                }
                return;
            }

            try {
                setIsActivating(true);
                const response = await deviceService.activate({
                    pair_code: pairCode,
                });

                // If token received, save it and redirect
                // Response structure: { data: { token: "..." }, status: "success", message: "..." }
                const token = response.data?.token;
                if (token) {
                    console.log("✅ Device activated! Token received:", token.substring(0, 20) + "...");
                    await tokenService.save(token);
                    await pairCodeService.remove(); // Clean up pair code

                    // Stop polling
                    if (activateIntervalRef.current) {
                        clearInterval(activateIntervalRef.current);
                        activateIntervalRef.current = null;
                    }

                    // Trigger onConnected callback to redirect to WebView
                    console.log("🔄 Redirecting to WebView...");
                    if (onConnected) {
                        onConnected();
                    }
                } else {
                    console.log("⏳ Device not activated yet, continuing polling...");
                }
            } catch (error: any) {
                // If device not activated yet, continue polling
                // 404 = Invalid pair code
                // 400 = Device not confirmed or pair code expired (expected)
                const status = error.response?.status;
                if (status === 404) {
                    console.log("⚠️ Invalid pair code or device not found");
                } else if (status === 400) {
                    // This is expected - device is pending, admin hasn't confirmed yet
                    // Don't log to avoid spam
                } else {
                    console.error("❌ Error activating device:", error.message || error);
                }
            } finally {
                setIsActivating(false);
            }
        }, 3000); // Poll every 3 seconds
    };

    const formatTime = (date: Date) => {
        return formatIranTime(date);
    };

    const formatDate = (date: Date) => {
        return formatPersianDate(date);
    };

    const getStatusText = () => {
        if (isRegistering) {
            return "در حال ثبت دستگاه...";
        }
        if (pairCode) {
            return "در انتظار تایید ادمین";
        }
        return "عدم اتصال به اینترنت";
    };

    return (
        <ImageBackground source={require("@/assets/images/offlineMode.png")} style={styles.container} resizeMode="cover">
            <StatusBar hidden={true} />
            <View style={styles.safeArea}>
                <View style={styles.content}>
                    <View style={styles.clockContainer}>
                        <Text style={styles.timeText}>{formatTime(time)}</Text>
                        <Text style={styles.dateText}>{formatDate(time)}</Text>
                    </View>

                    {/* Pair Code Display */}
                    {pairCode && (
                        <View style={styles.pairCodeContainer}>
                            <Text style={styles.pairCodeText}>{pairCode}</Text>
                            {/* {isActivating && <Text style={styles.activatingText}>در انتظار فعال‌سازی...</Text>} */}
                        </View>
                    )}

                    {/* Status */}
                    <View style={styles.statusContainer}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>{getStatusText()}</Text>
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
        paddingTop: 50,
    },
    clockContainer: {
        alignItems: "center",
        marginBottom: 20,
    },
    timeText: {
        fontSize: 72,
        fontWeight: "400",
        color: "#000000",
        marginBottom: 16,
        fontFamily: "Michroma-Regular",
    },
    dateText: {
        fontSize: 32,
        color: "#000000",
        fontFamily: "YekanBakh-Regular",
    },
    pairCodeContainer: {
        alignItems: "center",
        marginBottom: 20,
        padding: 15,
        backgroundColor: "rgba(30, 30, 30, 0.7)",
        borderRadius: 12,
    },
    pairCodeLabel: {
        fontSize: 14,
        color: "#fff",
        fontFamily: "YekanBakh-SemiBold",
        marginBottom: 8,
    },
    pairCodeText: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#00E676",
        letterSpacing: 4,
        fontFamily: "Michroma-Regular",
    },
    activatingText: {
        fontSize: 12,
        color: "#fff",
        marginTop: 8,
        fontFamily: "YekanBakh-Regular",
    },
    statusContainer: {
        flexDirection: "row",
        alignItems: "center",
        marginTop: 0,
        backgroundColor: "rgba(30, 30, 30, 0.2)",
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
    },
    statusDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
        backgroundColor: "#D50000",
        marginRight: 8,
    },
    statusText: {
        fontSize: 14,
        color: "#fff",
        fontFamily: "YekanBakh-Regular",
    },
});
