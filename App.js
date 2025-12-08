import React, { useEffect, useState, useRef, useCallback } from "react";
import { StyleSheet, View, ActivityIndicator, SafeAreaView } from "react-native";
import { networkService, tokenService, deviceService } from "./src/services";
import { getAndroidId } from "./src/services/androidId";
import { pairCodeService } from "./src/services/pairCodeService";
import OfflineScreen from "./components/OfflineScreen";
import { BridgeWebView } from "./src/components/BridgeWebView";
import { sensorService } from "./src/services/sensorService";

const WEBVIEW_URL = process.env.EXPO_PUBLIC_WEBVIEW_URL || "https://vaal.pixlink.co";

export default function App() {
    const [screen, setScreen] = useState("loading");
    const [isChecking, setIsChecking] = useState(true);
    const activateIntervalRef = useRef(null);
    const networkCheckIntervalRef = useRef(null);
    const hasRegisteredRef = useRef(false);

    // 1. بررسی اولیه هنگام باز شدن اپ
    useEffect(() => {
        checkInitialStatus();

        return () => {
            // Cleanup intervals
            if (activateIntervalRef.current) {
                clearInterval(activateIntervalRef.current);
            }
            if (networkCheckIntervalRef.current) {
                clearInterval(networkCheckIntervalRef.current);
            }
            sensorService.stopSensor();
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const checkInitialStatus = async () => {
        setIsChecking(true);

        try {
            // بررسی اتصال اینترنت
            const isConnected = await networkService.isConnected();

            if (!isConnected) {
                // Offline → هدایت به OfflineScreen
                setScreen("offline");
                setIsChecking(false);
                startOfflineMode();
                return;
            }

            // Online → بررسی Token
            const token = await tokenService.get();

            if (!token) {
                // بدون Token → OfflineScreen
                setScreen("offline");
                setIsChecking(false);
                startOfflineMode();
                return;
            }

            // Token وجود دارد → اعتبارسنجی
            try {
                await deviceService.auth();
                // Token معتبر → WebviewScreen
                setScreen("webview");
                setIsChecking(false);
                startWebViewMode();
            } catch (error) {
                const status = error?.response?.status;
                if (status === 401) {
                    // Token نامعتبر → حذف Token → OfflineScreen
                    await tokenService.remove();
                    await pairCodeService.remove();
                    hasRegisteredRef.current = false;
                    setScreen("offline");
                    setIsChecking(false);
                    startOfflineMode();
                } else {
                    // خطای دیگر → OfflineScreen
                    setScreen("offline");
                    setIsChecking(false);
                    startOfflineMode();
                }
            }
        } catch (error) {
            console.error("Error in checkInitialStatus:", error);
            setScreen("offline");
            setIsChecking(false);
            startOfflineMode();
        }
    };

    // 3. حالت WebView - نمایش WebView و شروع سنسور
    const startWebViewMode = useCallback(() => {
        // سنسور در BridgeWebView شروع می‌شود
        // اینجا فقط مطمئن می‌شویم که سنسور قبلی متوقف شده
        sensorService.stopSensor();
    }, []);

    // 2. حالت Offline - Polling و بررسی شبکه
    const startOfflineMode = useCallback(() => {
        // بررسی Pair Code موجود
        checkExistingPairCode();

        // هر 3 ثانیه یکبار: تلاش برای فعال‌سازی
        if (activateIntervalRef.current) {
            clearInterval(activateIntervalRef.current);
        }

        activateIntervalRef.current = setInterval(async () => {
            // بررسی Token قبل از هر تلاش
            const existingToken = await tokenService.get();
            if (existingToken) {
                // Token دریافت شد → توقف Polling
                if (activateIntervalRef.current) {
                    clearInterval(activateIntervalRef.current);
                    activateIntervalRef.current = null;
                }
                // بررسی اعتبار Token
                try {
                    await deviceService.auth();
                    setScreen("webview");
                    startWebViewMode();
                } catch (error) {
                    if (error?.response?.status === 401) {
                        await tokenService.remove();
                        await pairCodeService.remove();
                        hasRegisteredRef.current = false;
                    }
                }
                return;
            }

            // دریافت Pair Code
            const pairCode = await pairCodeService.get();
            if (!pairCode) {
                // اگر Pair Code نداریم، ثبت دستگاه
                if (!hasRegisteredRef.current) {
                    registerDevice();
                }
                return;
            }

            // تلاش برای فعال‌سازی
            try {
                const response = await deviceService.activate({
                    pair_code: pairCode,
                });

                const token = response.data?.token;
                if (token) {
                    // Token دریافت شد
                    await tokenService.save(token);
                    await pairCodeService.remove();

                    // توقف Polling
                    if (activateIntervalRef.current) {
                        clearInterval(activateIntervalRef.current);
                        activateIntervalRef.current = null;
                    }

                    // هدایت به WebviewScreen
                    setScreen("webview");
                    startWebViewMode();
                }
            } catch (error) {
                const status = error?.response?.status;
                if (status === 404) {
                    // خطای Pair Code
                    console.log("Invalid pair code");
                    await pairCodeService.remove();
                    hasRegisteredRef.current = false;
                } else if (status === 400) {
                    // دستگاه هنوز pending است → ادامه Polling
                    // (بدون لاگ برای جلوگیری از spam)
                } else {
                    console.error("Error activating device:", error.message);
                }
            }
        }, 3000); // هر 3 ثانیه

        // هر 10 ثانیه: بررسی اتصال اینترنت
        if (networkCheckIntervalRef.current) {
            clearInterval(networkCheckIntervalRef.current);
        }

        networkCheckIntervalRef.current = setInterval(async () => {
            const isConnected = await networkService.isConnected();
            if (isConnected) {
                // آنلاین شد → بررسی Token و اعتبارسنجی
                const token = await tokenService.get();
                if (token) {
                    try {
                        await deviceService.auth();
                        // Token معتبر → هدایت به WebviewScreen
                        if (activateIntervalRef.current) {
                            clearInterval(activateIntervalRef.current);
                            activateIntervalRef.current = null;
                        }
                        setScreen("webview");
                        startWebViewMode();
                    } catch (error) {
                        if (error?.response?.status === 401) {
                            await tokenService.remove();
                            await pairCodeService.remove();
                            hasRegisteredRef.current = false;
                        }
                    }
                }
            }
        }, 10000); // هر 10 ثانیه
    }, [startWebViewMode]);

    const checkExistingPairCode = async () => {
        try {
            const existingToken = await tokenService.get();
            if (existingToken) {
                return;
            }

            const existingPairCode = await pairCodeService.get();
            if (existingPairCode) {
                // Pair Code موجود است، polling شروع می‌شود
                return;
            }

            // اگر Pair Code نداریم، ثبت دستگاه
            if (!hasRegisteredRef.current) {
                registerDevice();
            }
        } catch (error) {
            console.error("Error checking existing pair code:", error);
        }
    };

    const registerDevice = async () => {
        if (hasRegisteredRef.current) return;

        try {
            hasRegisteredRef.current = true;

            const androidId = await getAndroidId();
            const ipAddress = await networkService.getIpAddress();

            const response = await deviceService.register({
                serial: androidId,
                app_version: "1.0.0",
                ip_address: ipAddress || null,
            });

            const pairCode = response.data?.pair_code;
            if (pairCode) {
                await pairCodeService.save(pairCode);
                console.log("Device registered. Pair code:", pairCode);
            }
        } catch (error) {
            console.error("Error registering device:", error);
            // Retry after 10 seconds
            setTimeout(() => {
                hasRegisteredRef.current = false;
                registerDevice();
            }, 10000);
        }
    };

    const handleConnected = useCallback(async () => {
        // وقتی آنلاین شد، بررسی Token و اعتبارسنجی
        const token = await tokenService.get();
        if (token) {
            try {
                await deviceService.auth();
                if (activateIntervalRef.current) {
                    clearInterval(activateIntervalRef.current);
                    activateIntervalRef.current = null;
                }
                setScreen("webview");
                startWebViewMode();
            } catch (error) {
                if (error?.response?.status === 401) {
                    await tokenService.remove();
                    await pairCodeService.remove();
                    hasRegisteredRef.current = false;
                }
            }
        }
    }, [startWebViewMode]);

    // Render
    if (isChecking) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2962FF" />
                </View>
            </SafeAreaView>
        );
    }

    if (screen === "offline") {
        return <OfflineScreen onConnected={handleConnected} />;
    }

    if (screen === "webview") {
        return (
            <SafeAreaView style={styles.container}>
                <BridgeWebView
                    webViewUrl={WEBVIEW_URL}
                    onError={(error) => {
                        console.error("WebView error:", error);
                        // در صورت خطا، به OfflineScreen برگرد
                        setScreen("offline");
                        startOfflineMode();
                    }}
                />
            </SafeAreaView>
        );
    }

    return null;
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
    },
});
