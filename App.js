import React, { useEffect, useState, useRef, useCallback } from "react";
import { StyleSheet, View, ActivityIndicator, SafeAreaView, StatusBar, Platform } from "react-native";
import { useFonts } from "expo-font";
import * as SplashScreen from "expo-splash-screen";
import { networkService, tokenService, deviceService } from "./src/services";
import { getAndroidId } from "./src/services/androidId";
import { pairCodeService } from "./src/services/pairCodeService";
import OfflineScreen from "./components/OfflineScreen";
import { BridgeWebView } from "./src/components/BridgeWebView";
import { sensorService } from "./src/services/sensorService";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

const WEBVIEW_URL = process.env.EXPO_PUBLIC_WEBVIEW_URL || "https://vaal.pixlink.co";
// const WEBVIEW_URL = process.env.EXPO_PUBLIC_WEBVIEW_URL || "http://192.168.1.119:3000";

export default function App() {
    // Load custom fonts
    const [fontsLoaded, fontError] = useFonts({
        "YekanBakh-Regular": require("./assets/fonts/YekanBakh-Regular.ttf"),
        "YekanBakh-SemiBold": require("./assets/fonts/YekanBakh-SemiBold.ttf"),
        "YekanBakh-Light": require("./assets/fonts/YekanBakh-Light.ttf"),
        "Michroma-Regular": require("./assets/fonts/Michroma-Regular.ttf"),
    });

    const [screen, setScreen] = useState("loading");
    const [isChecking, setIsChecking] = useState(true);
    const activateIntervalRef = useRef(null);
    const networkCheckIntervalRef = useRef(null);
    const networkUnsubscribeRef = useRef(null);
    const hasRegisteredRef = useRef(false);
    const screenRef = useRef("loading");

    // Hide splash screen when fonts are loaded
    useEffect(() => {
        if (fontsLoaded || fontError) {
            SplashScreen.hideAsync();
        }
    }, [fontsLoaded, fontError]);

    // Update screenRef whenever screen changes
    useEffect(() => {
        screenRef.current = screen;
    }, [screen]);

    // 3. حالت WebView - نمایش WebView و شروع سنسور
    const startWebViewMode = useCallback(() => {
        // سنسور در BridgeWebView شروع می‌شود
        // اینجا فقط مطمئن می‌شویم که سنسور قبلی متوقف شده
        sensorService.stopSensor();
    }, []);

    // 2. حالت Offline - Polling و بررسی شبکه
    const startOfflineMode = useCallback(() => {
        // Cleanup intervals قبلی برای جلوگیری از memory leak
        if (activateIntervalRef.current) {
            clearInterval(activateIntervalRef.current);
            activateIntervalRef.current = null;
        }
        if (networkCheckIntervalRef.current) {
            clearInterval(networkCheckIntervalRef.current);
            networkCheckIntervalRef.current = null;
        }

        // بررسی Pair Code موجود
        checkExistingPairCode();

        // هر 3 ثانیه یکبار: تلاش برای فعال‌سازی

        activateIntervalRef.current = setInterval(async () => {
            // بررسی Token قبل از هر تلاش
            const existingToken = await tokenService.get();
            if (existingToken) {
                console.log("🔑 [TOKEN] Token found in storage:", existingToken);
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

                // Response structure from deviceService.activate():
                // {
                //   data: {
                //     id: "...",
                //     token: "47|cgkB1ABjYolnfQi3uPksX3e0jIhSYJBtEAW2Ic15afdc727e",
                //     status: "active",
                //     building: { ... },
                //     ...
                //   },
                //   status: "success",
                //   message: "Device activated successfully"
                // }
                // Token is at: response.data.token
                const token = response.data.token;
                console.log("🔑 [TOKEN] Token received from activate:", token);
                if (token) {
                    // Token دریافت شد
                    console.log("💾 [TOKEN] Saving token to storage:", token);
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
        }, 5000); // هر 5 ثانیه

        // هر 10 ثانیه: بررسی اتصال اینترنت
        if (networkCheckIntervalRef.current) {
            clearInterval(networkCheckIntervalRef.current);
        }

        networkCheckIntervalRef.current = setInterval(async () => {
            const isConnected = await networkService.isConnected();
            if (isConnected) {
                // آنلاین شد → بررسی Token و اعتبارسنجی
                const token = await tokenService.get();
                console.log("🔑 [TOKEN] Token from storage:", token || "NO TOKEN");
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
        }, 5000); // هر 5 ثانیه
    }, [startWebViewMode]);

    const checkInitialStatus = useCallback(async () => {
        setIsChecking(true);

        try {
            // بررسی اتصال اینترنت
            const isConnected = await networkService.isConnected();

            if (!isConnected) {
                // Offline → هدایت به OfflineScreen
                // OfflineScreen خودش polling رو انجام میده، نیازی به startOfflineMode نیست
                setScreen("offline");
                setIsChecking(false);
                return;
            }

            // Online → بررسی Token
            const token = await tokenService.get();
            console.log("🔑 [TOKEN] Token from storage:", token || "NO TOKEN");

            if (!token) {
                // بدون Token → OfflineScreen
                // OfflineScreen خودش polling رو انجام میده، نیازی به startOfflineMode نیست
                setScreen("offline");
                setIsChecking(false);
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
                    // OfflineScreen خودش polling رو انجام میده
                } else {
                    // خطای دیگر → OfflineScreen
                    setScreen("offline");
                    setIsChecking(false);
                    // OfflineScreen خودش polling رو انجام میده
                }
            }
        } catch (error) {
            console.error("Error in checkInitialStatus:", error);
            setScreen("offline");
            setIsChecking(false);
            // OfflineScreen خودش polling رو انجام میده
        }
    }, [startWebViewMode]);

    // Cleanup intervals وقتی screen به "offline" تغییر میکنه
    // چون OfflineScreen خودش polling رو انجام میده، App.js نباید polling کنه
    useEffect(() => {
        if (screen === "offline") {
            // وقتی به OfflineScreen می‌ریم، intervals App.js رو cleanup کن
            // چون OfflineScreen خودش polling رو انجام میده
            if (activateIntervalRef.current) {
                clearInterval(activateIntervalRef.current);
                activateIntervalRef.current = null;
            }
            if (networkCheckIntervalRef.current) {
                clearInterval(networkCheckIntervalRef.current);
                networkCheckIntervalRef.current = null;
            }
        }
    }, [screen]);

    // TEMPORARY: Auto-clear token on mount for testing (must run before checkInitialStatus)
    // useEffect(() => {
    //     const clearTokenOnMount = async () => {
    //         try {
    //             const existingToken = await tokenService.get();
    //             if (existingToken) {
    //                 console.log("🗑️ [DEBUG] Token found on mount, auto-clearing for testing...");
    //                 await tokenService.remove();
    //                 await pairCodeService.remove();
    //                 hasRegisteredRef.current = false;
    //                 console.log("✅ [DEBUG] Token and pair code cleared automatically");
    //             } else {
    //                 console.log("ℹ️ [DEBUG] No token found, proceeding normally");
    //             }
    //         } catch (error) {
    //             console.error("❌ [DEBUG] Error in auto-clear:", error);
    //         }
    //     };

    //     clearTokenOnMount();
    // }, []); // فقط یک بار در mount اجرا میشه

    // 1. بررسی اولیه هنگام باز شدن اپ
    useEffect(() => {
        // کمی delay بذار تا clearTokenOnMount اجرا بشه
        const timer = setTimeout(() => {
            checkInitialStatus();
        }, 500); // 500ms delay برای اطمینان از اینکه token پاک شده

        return () => {
            clearTimeout(timer);
            // Cleanup intervals
            if (activateIntervalRef.current) {
                clearInterval(activateIntervalRef.current);
                activateIntervalRef.current = null;
            }
            if (networkCheckIntervalRef.current) {
                clearInterval(networkCheckIntervalRef.current);
                networkCheckIntervalRef.current = null;
            }
            sensorService.stopSensor();
        };
    }, [checkInitialStatus]);

    // 2. Subscribe to network changes for instant response
    useEffect(() => {
        networkUnsubscribeRef.current = networkService.subscribe(async (isConnected) => {
            console.log("🌐 Network status changed:", isConnected ? "Connected" : "Disconnected");

            if (!isConnected) {
                // اینترنت قطع شد → اگر در WebView هستیم و token داریم، در WebView بمون و از کش استفاده کن
                if (screenRef.current === "webview") {
                    const token = await tokenService.get();
                    if (token) {
                        console.log("⚠️ Internet disconnected, but staying in WebView with cached content");
                        // در WebView بمون و از کش استفاده کن - نیازی به تغییر screen نیست
                        return;
                    } else {
                        // اگر token نداریم، به OfflineScreen برگرد
                        console.log("⚠️ Internet disconnected, no token, switching to OfflineScreen");
                        if (activateIntervalRef.current) {
                            clearInterval(activateIntervalRef.current);
                            activateIntervalRef.current = null;
                        }
                        if (networkCheckIntervalRef.current) {
                            clearInterval(networkCheckIntervalRef.current);
                            networkCheckIntervalRef.current = null;
                        }
                        setScreen("offline");
                    }
                }
            } else {
                // اینترنت وصل شد → بررسی Token
                if (screenRef.current === "offline") {
                    console.log("✅ Internet connected, checking token...");
                    const token = await tokenService.get();
                    if (token) {
                        try {
                            await deviceService.auth();
                            // Token معتبر → هدایت به WebviewScreen
                            // Cleanup intervals قبل از تغییر screen
                            if (activateIntervalRef.current) {
                                clearInterval(activateIntervalRef.current);
                                activateIntervalRef.current = null;
                            }
                            if (networkCheckIntervalRef.current) {
                                clearInterval(networkCheckIntervalRef.current);
                                networkCheckIntervalRef.current = null;
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
            }
        });

        return () => {
            // Cleanup network listener
            if (networkUnsubscribeRef.current) {
                networkUnsubscribeRef.current();
            }
        };
    }, [startOfflineMode, startWebViewMode]);

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

    const handleConnected = useCallback(
        async (onLog) => {
            const log = (msg) => {
                console.log(msg);
                if (onLog) onLog(msg);
            };

            log("🔔 [HANDLE_CONNECTED] Callback triggered");

            // وقتی token دریافت شد، مستقیماً به WebView برو
            log("🔍 [HANDLE_CONNECTED] Getting token from storage...");
            const token = await tokenService.get();
            log(`🔑 [HANDLE_CONNECTED] Token retrieved: ${token ? token.substring(0, 20) + "..." : "NO TOKEN"}`);

            if (token) {
                log("✅ [HANDLE_CONNECTED] Token exists, redirecting to WebView...");

                // Cleanup intervals
                log("🧹 [HANDLE_CONNECTED] Cleaning up intervals...");
                if (activateIntervalRef.current) {
                    clearInterval(activateIntervalRef.current);
                    activateIntervalRef.current = null;
                    log("✅ [HANDLE_CONNECTED] activateInterval cleared");
                }
                if (networkCheckIntervalRef.current) {
                    clearInterval(networkCheckIntervalRef.current);
                    networkCheckIntervalRef.current = null;
                    log("✅ [HANDLE_CONNECTED] networkCheckInterval cleared");
                }

                // مستقیماً به WebView برو (token از سرور دریافت شده، نیازی به auth() دوباره نیست)
                log(`🔄 [HANDLE_CONNECTED] Setting screen to 'webview'... (current: ${screenRef.current})`);
                setScreen("webview");
                log("✅ [HANDLE_CONNECTED] Screen state updated to 'webview'");

                log("🚀 [HANDLE_CONNECTED] Starting WebView mode...");
                startWebViewMode();
                log("✅ [HANDLE_CONNECTED] WebView mode started");

                // در background auth رو چک کن (برای validation)
                log("🔐 [HANDLE_CONNECTED] Validating token in background...");
                try {
                    await deviceService.auth();
                    log("✅ [HANDLE_CONNECTED] Token validated successfully");
                } catch (error) {
                    log(`❌ [HANDLE_CONNECTED] Auth validation error: ${error?.message || error}`);

                    // فقط اگر 401 بود (token نامعتبر)، به OfflineScreen برگرد
                    if (error?.response?.status === 401) {
                        log("❌ [HANDLE_CONNECTED] Token is invalid (401), removing token...");
                        await tokenService.remove();
                        await pairCodeService.remove();
                        hasRegisteredRef.current = false;
                        setScreen("offline");
                        log("🔄 [HANDLE_CONNECTED] Switched back to offline screen");
                    } else {
                        // خطاهای دیگر (network, etc.) - ignore کن، token معتبره
                        log(`⚠️ [HANDLE_CONNECTED] Auth check failed (non-401 error), but token exists: ${error?.message}`);
                    }
                }
            } else {
                log("❌ [HANDLE_CONNECTED] No token found! Cannot redirect to WebView.");
            }
        },
        [startWebViewMode],
    );

    // Wait for fonts to load
    if (!fontsLoaded && !fontError) {
        return null;
    }

    // Render
    if (isChecking) {
        return (
            <View style={styles.container}>
                <StatusBar hidden={true} />
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2962FF" />
                </View>
            </View>
        );
    }

    if (screen === "offline") {
        return <OfflineScreen onConnected={(onLog) => handleConnected(onLog)} />;
    }

    if (screen === "webview") {
        return (
            <View style={styles.container}>
                <StatusBar hidden={true} />
                <BridgeWebView
                    webViewUrl={WEBVIEW_URL}
                    onError={(error) => {
                        console.error("WebView error:", error);
                        // فقط برای خطاهای critical به OfflineScreen برگرد
                        // خطاهای network رو ignore کن تا از کش استفاده کنه
                        const isNetworkError = error?.message?.includes("network") || error?.message?.includes("ERR_INTERNET_DISCONNECTED") || error?.message?.includes("ERR_ADDRESS_UNREACHABLE");

                        if (!isNetworkError) {
                            // فقط برای خطاهای غیر network به OfflineScreen برگرد
                            console.log("⚠️ Critical WebView error, switching to OfflineScreen");
                            if (activateIntervalRef.current) {
                                clearInterval(activateIntervalRef.current);
                                activateIntervalRef.current = null;
                            }
                            if (networkCheckIntervalRef.current) {
                                clearInterval(networkCheckIntervalRef.current);
                                networkCheckIntervalRef.current = null;
                            }
                            setScreen("offline");
                        } else {
                            console.log("⚠️ Network error in WebView, will use cached content");
                        }
                    }}
                />
            </View>
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
