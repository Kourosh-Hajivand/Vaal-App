import { getAndroidId } from "@/src/services/androidId";
import { deviceService } from "@/src/services/device.service";
import { networkService } from "@/src/services/networkService";
import { pairCodeService } from "@/src/services/pairCodeService";
import { tokenService } from "@/src/services/tokenService";
import { formatIranTime, formatPersianDate } from "@/src/utils/dateUtils";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { ImageBackground, SafeAreaView, StyleSheet, Text, View, StatusBar, Platform, ScrollView, TouchableOpacity } from "react-native";

interface OfflineScreenProps {
    onConnected?: (onLog?: (message: string) => void) => void;
}

interface LogEntry {
    id: number;
    message: string;
    timestamp: Date;
}

export default function OfflineScreen({ onConnected }: OfflineScreenProps) {
    const [time, setTime] = useState(new Date());
    const [pairCode, setPairCode] = useState<string | null>(null);
    const [isRegistering, setIsRegistering] = useState(false);
    const [isActivating, setIsActivating] = useState(false);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const activateIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const hasRegisteredRef = useRef(false);
    const logIdRef = useRef(0);

    // Helper function to add log to screen
    const addLog = useCallback((message: string) => {
        const logEntry: LogEntry = {
            id: logIdRef.current++,
            message: `${new Date().toLocaleTimeString()} - ${message}`,
            timestamp: new Date(),
        };
        setLogs((prev) => {
            const newLogs = [...prev, logEntry];
            // Keep only last 50 logs
            return newLogs.slice(-50);
        });
        // Also log to console
        console.log(message);
    }, []);

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
                addLog("✅ Token is valid");
                if (onConnected) {
                    onConnected(addLog);
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
        if (pairCode) {
            addLog(`🔄 [POLLING] Pair code available: ${pairCode}, starting polling...`);
            startActivatePolling();
        } else {
            addLog("⚠️ [POLLING] No pair code available yet");
        }
    }, [pairCode]); // فقط وقتی pairCode تغییر کنه، polling رو شروع کن

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
        addLog(`🚀 [POLLING] Starting activate polling with pair code: ${pairCode}`);

        // Stop existing polling
        if (activateIntervalRef.current) {
            addLog("🛑 [POLLING] Stopping existing polling interval...");
            clearInterval(activateIntervalRef.current);
            activateIntervalRef.current = null;
            addLog("✅ [POLLING] Existing polling stopped");
        }

        // Start polling every 5 seconds
        addLog("⏰ [ACTIVATE] Setting up polling interval (every 5 seconds)...");
        activateIntervalRef.current = setInterval(async () => {
            addLog("🔄 [ACTIVATE] Polling tick - checking activation status...");

            // Read pair code from storage in each tick (not from state closure)
            const currentPairCode = await pairCodeService.get();
            if (!currentPairCode) {
                addLog("⚠️ [ACTIVATE] No pair code in storage, skipping polling");
                return;
            }

            // اگر در حال activate هستیم، skip کن (اما polling ادامه داره)
            if (isActivating) {
                addLog("⏳ [ACTIVATE] Already activating, skipping this attempt (will retry in 5s)...");
                return;
            }

            addLog(`🔄 [ACTIVATE] Ready to check activation for pair code: ${currentPairCode}`);

            // Check token before each activation attempt
            const existingToken = await tokenService.get();
            if (existingToken) {
                addLog("✅ Token already exists, stopping activation polling");
                if (activateIntervalRef.current) {
                    clearInterval(activateIntervalRef.current);
                    activateIntervalRef.current = null;
                }
                if (onConnected) {
                    onConnected(addLog);
                }
                return;
            }

            try {
                setIsActivating(true);

                const response = await deviceService.activate({
                    pair_code: currentPairCode,
                });

                const token = response.data.token;

                if (token) {
                    await tokenService.save(token);
                    await pairCodeService.remove();

                    // Stop polling
                    if (activateIntervalRef.current) {
                        clearInterval(activateIntervalRef.current);
                        activateIntervalRef.current = null;
                    }

                    // Trigger onConnected callback to redirect to WebView
                    if (onConnected) {
                        try {
                            onConnected(addLog);
                        } catch (callbackError: any) {
                            addLog(`❌ [ACTIVATE] Error in onConnected callback: ${callbackError?.message || callbackError}`);
                        }
                    }
                }
            } catch (error: any) {
                // If device not activated yet, continue polling
                // 404 = Invalid pair code
                // 400 = Device not confirmed or pair code expired (expected)
                addLog("❌ [ACTIVATE] Error caught in activation attempt");
                addLog(`❌ [ACTIVATE] Error type: ${error?.constructor?.name || "Unknown"}`);
                addLog(`❌ [ACTIVATE] Error message: ${error?.message || "No message"}`);
                addLog(`❌ [ACTIVATE] Error response: ${error?.response ? JSON.stringify(error.response.data || error.response, null, 2).substring(0, 200) : "No response"}`);

                const status = error.response?.status;
                if (status === 404) {
                    addLog("⚠️ [ACTIVATE] Invalid pair code or device not found (404)");
                } else if (status === 400) {
                    // This is expected - device is pending, admin hasn't confirmed yet
                    addLog("⏳ [ACTIVATE] Device pending confirmation (400) - continuing polling...");
                } else {
                    addLog(`❌ [ACTIVATE] Unexpected error: ${error.message || error}`);
                }
            } finally {
                addLog("🏁 [ACTIVATE] Setting isActivating to false - polling will continue");
                setIsActivating(false);
            }
        }, 5000); // Poll every 5 seconds

        addLog("✅ [ACTIVATE] Polling started successfully");
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

    // Temporary function to clear token and pair code for testing
    const handleClearToken = async () => {
        try {
            addLog("🗑️ [DEBUG] Clearing token and pair code...");
            await tokenService.remove();
            await pairCodeService.remove();
            setPairCode(null);
            hasRegisteredRef.current = false;

            // Stop polling
            if (activateIntervalRef.current) {
                clearInterval(activateIntervalRef.current);
                activateIntervalRef.current = null;
            }

            addLog("✅ [DEBUG] Token and pair code cleared successfully");
            addLog("🔄 [DEBUG] App will restart registration process...");

            // Restart registration
            setTimeout(() => {
                checkTokenAndRegister();
            }, 1000);
        } catch (error: any) {
            addLog(`❌ [DEBUG] Error clearing token: ${error?.message || error}`);
        }
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

                    {/* Temporary Clear Token Button */}
                    {/* <TouchableOpacity style={styles.clearTokenButton} onPress={handleClearToken}>
                        <Text style={styles.clearTokenButtonText}>🗑️ پاک کردن Token (موقت)</Text>
                    </TouchableOpacity> */}

                    {/* Debug Logs - Temporary */}
                    {/* <View style={styles.logsContainer}>
                        <Text style={styles.logsTitle}>Debug Logs:</Text>
                        <ScrollView style={styles.logsScrollView} nestedScrollEnabled={true}>
                            {logs.map((log) => (
                                <Text key={log.id} style={styles.logText}>
                                    {log.message}
                                </Text>
                            ))}
                        </ScrollView>
                    </View> */}
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
    logsContainer: {
        position: "absolute",
        bottom: 20,
        left: 10,
        right: 10,
        maxHeight: 200,
        backgroundColor: "rgba(0, 0, 0, 0.8)",
        borderRadius: 8,
        padding: 10,
    },
    logsTitle: {
        fontSize: 12,
        color: "#fff",
        fontFamily: "YekanBakh-SemiBold",
        marginBottom: 5,
    },
    logsScrollView: {
        maxHeight: 180,
    },
    logText: {
        fontSize: 10,
        color: "#00E676",
        fontFamily: "YekanBakh-Regular",
        marginBottom: 2,
    },
    clearTokenButton: {
        marginTop: 15,
        marginBottom: 10,
        backgroundColor: "rgba(255, 0, 0, 0.7)",
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 8,
    },
    clearTokenButtonText: {
        color: "#fff",
        fontSize: 14,
        fontFamily: "YekanBakh-SemiBold",
        textAlign: "center",
    },
});
