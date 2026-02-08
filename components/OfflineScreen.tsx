import { getAndroidId } from "@/src/services/androidId";
import { deviceService } from "@/src/services/device.service";
import { networkService } from "@/src/services/networkService";
import { pairCodeService } from "@/src/services/pairCodeService";
import { tokenService } from "@/src/services/tokenService";
import { formatIranTime, formatPersianDate } from "@/src/utils/dateUtils";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImageBackground, StyleSheet, Text, View, StatusBar } from "react-native";

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

            const newPairCode = response.data?.pair_code;
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

                const token = response.data.token;
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
                if (status === 404) {
                    console.log("❌ Invalid pair code (404)");
                    await pairCodeService.remove();
                    setPairCode(null);
                    if (activateIntervalRef.current) {
                        clearInterval(activateIntervalRef.current);
                        activateIntervalRef.current = null;
                    }
                    // Retry registration
                    hasRegisteredRef.current = false;
                    registerDevice();
                } else if (status === 400) {
                    // Device still pending - continue polling
                    console.log("⏳ Device pending confirmation (400)");
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
        <ImageBackground 
            source={require("@/assets/images/offlineMode.png")} 
            style={styles.container} 
            resizeMode="cover"
        >
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
                        </View>
                    )}

                    {/* Status */}
                    <View style={styles.statusContainer}>
                        <View style={styles.statusDot} />
                        <Text style={styles.statusText}>{status}</Text>
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
    pairCodeText: {
        fontSize: 36,
        fontWeight: "bold",
        color: "#00E676",
        letterSpacing: 4,
        fontFamily: "Michroma-Regular",
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
