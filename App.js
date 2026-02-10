import React, { useEffect, useState, useRef, useCallback } from "react";
import { StyleSheet, View, ActivityIndicator, StatusBar, Platform } from "react-native";
import { useFonts } from "expo-font";
import * as NavigationBar from "expo-navigation-bar";
import * as SplashScreen from "expo-splash-screen";
import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { ThemeProvider } from "./src/contexts/ThemeContext";
import { networkService, tokenService, deviceService } from "./src/services";
import { getAndroidId } from "./src/services/androidId";
import { pairCodeService } from "./src/services/pairCodeService";
import OfflineScreen from "./components/OfflineScreen";
import HomeScreen from "./components/HomeScreen";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Create QueryClient instance
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 1 * 60 * 1000, // 1 minute
            gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز — کش رو نگه دار برای آفلاین
        },
    },
});

// AsyncStorage Persister — تمام query data رو به AsyncStorage ذخیره می‌کنه
const asyncStoragePersister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: "REACT_QUERY_OFFLINE_CACHE",
    throttleTime: 2000, // هر 2 ثانیه persist (برای performance)
});

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
    const networkUnsubscribeRef = useRef(null);
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

    // کیوسک برای کل اپ (نه فقط Home)
    useEffect(() => {
        const enableKioskMode = async () => {
            try {
                if (Platform.OS === "android") {
                    await NavigationBar.setVisibilityAsync("hidden");
                    await NavigationBar.setBehaviorAsync("overlay-swipe");
                    console.log("✅ [KIOSK] Mode enabled for entire app");
                }
            } catch (error) {
                console.error("❌ [KIOSK] Error:", error);
            }
        };
        enableKioskMode();
    }, []);

    // بررسی اولیه وضعیت (token → network)
    const checkInitialStatus = useCallback(async () => {
        setIsChecking(true);

        try {
            // ✅ اول Token رو چک کن (مهم‌ترین)
            const token = await tokenService.get();
            console.log("🔑 [TOKEN] Token from storage:", token || "NO TOKEN");

            if (!token) {
                // ❌ بدون Token → OfflineScreen (برای registration)
                console.log("❌ [TOKEN] No token found, going to OfflineScreen");
                setScreen("offline");
                setIsChecking(false);
                return;
            }

            // ✅ Token داریم → چک کن online هستیم یا نه
            const isConnected = await networkService.isConnected();
            console.log("🌐 [NETWORK]", isConnected ? "Online" : "Offline");

            if (!isConnected) {
                // 📦 Token داریم + Offline → مستقیم Home برو (از cache استفاده کن)
                console.log("📦 [OFFLINE] Has token, entering Home with cached data");
                setScreen("home");
                setIsChecking(false);
                return;
            }

            // ✅ Token داریم + Online → اعتبارسنجی
            try {
                console.log("🔐 [TOKEN] Validating token...");
                await deviceService.auth();
                console.log("✅ [TOKEN] Token is valid, entering Home");
                setScreen("home");
                setIsChecking(false);
            } catch (error) {
                const status = error?.response?.status;
                if (status === 401) {
                    // Token نامعتبر → حذف Token → OfflineScreen
                    console.log("❌ [TOKEN] Token invalid (401), removing and going to OfflineScreen");
                    await tokenService.remove();
                    await pairCodeService.remove();
                    setScreen("offline");
                    setIsChecking(false);
                } else {
                    // خطای network یا server → به Home برو با cached data
                    console.warn("⚠️ [TOKEN] Validation failed (non-401), entering Home with cache:", error?.message);
                    setScreen("home");
                    setIsChecking(false);
                }
            }
        } catch (error) {
            console.error("❌ [APP] Error in checkInitialStatus:", error);
            // اگر token داریم، به Home برو
            const token = await tokenService.get();
            setScreen(token ? "home" : "offline");
            setIsChecking(false);
        }
    }, []);

    // بررسی اولیه هنگام باز شدن اپ
    useEffect(() => {
        checkInitialStatus();
    }, [checkInitialStatus]);

    // Subscribe to network changes
    useEffect(() => {
        networkUnsubscribeRef.current = networkService.subscribe(async (isConnected) => {
            console.log("🌐 [NETWORK] Status changed:", isConnected ? "Connected" : "Disconnected");

            if (!isConnected) {
                // ❌ اینترنت قطع شد
                if (screenRef.current === "home") {
                    // ✅ در Home بمون (Offline Mode با cache)
                    console.log("📦 [OFFLINE] Internet lost, staying in Home with cached data");
                    return;
                }
                // اگر در OfflineScreen هستیم، همونجا بمون
            } else {
                // ✅ اینترنت وصل شد
                if (screenRef.current === "offline") {
                    console.log("🌐 [ONLINE] Internet connected, checking token...");
                    const token = await tokenService.get();
                    if (token) {
                        try {
                            await deviceService.auth();
                            console.log("✅ [TOKEN] Valid, going to Home");
                            setScreen("home");
                        } catch (error) {
                            if (error?.response?.status === 401) {
                                console.log("❌ [TOKEN] Invalid (401), removing token");
                                await tokenService.remove();
                                await pairCodeService.remove();
                                // در OfflineScreen بمون برای registration
                            } else {
                                // Network error - به Home برو با cache
                                console.log("⚠️ [TOKEN] Validation error (non-401), going to Home with cache");
                                setScreen("home");
                            }
                        }
                    } else {
                        // token نداریم، در OfflineScreen بمون برای registration
                        console.log("❌ [TOKEN] No token, staying in OfflineScreen");
                    }
                }
            }
        });

        return () => {
            if (networkUnsubscribeRef.current) {
                networkUnsubscribeRef.current();
            }
        };
    }, []);

    // Handler: وقتی در OfflineScreen token دریافت شد
    const handleConnected = useCallback(async (onLog) => {
        const log = (msg) => {
            console.log(msg);
            if (onLog) onLog(msg);
        };

        log("🔔 [HANDLE_CONNECTED] Callback triggered");

        const token = await tokenService.get();
        log(`🔑 [HANDLE_CONNECTED] Token retrieved: ${token ? token.substring(0, 20) + "..." : "NO TOKEN"}`);

        if (token) {
            log("✅ [HANDLE_CONNECTED] Token exists, redirecting to Home...");
            setScreen("home");

            // Background validation
            try {
                await deviceService.auth();
                log("✅ [HANDLE_CONNECTED] Token validated successfully");
            } catch (error) {
                log(`❌ [HANDLE_CONNECTED] Auth validation error: ${error?.message || error}`);

                if (error?.response?.status === 401) {
                    log("❌ [HANDLE_CONNECTED] Token is invalid (401), switching back to offline");
                    await tokenService.remove();
                    await pairCodeService.remove();
                    setScreen("offline");
                } else {
                    log(`⚠️ [HANDLE_CONNECTED] Auth check failed (non-401), but staying in Home: ${error?.message}`);
                }
            }
        } else {
            log("❌ [HANDLE_CONNECTED] No token found! Cannot redirect to Home.");
        }
    }, []);

    // Handler: وقتی کاربر logout کرد
    const handleLogout = useCallback(async () => {
        console.log("🚪 [LOGOUT] User logged out");
        await tokenService.remove();
        await pairCodeService.remove();
        setScreen("offline");
    }, []);

    // Wait for fonts to load
    if (!fontsLoaded && !fontError) {
        return null;
    }

    // Render: Loading Screen - نگه داشتن splash screen تا ready بشه
    if (isChecking) {
        // نگه داشتن splash screen native (بجای نمایش loading سیاه)
        return null;
    }

    // Render: Offline Screen
    if (screen === "offline") {
        return (
            <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister, maxAge: 7 * 24 * 60 * 60 * 1000 }}>
                <ThemeProvider>
                    <OfflineScreen onConnected={(onLog) => handleConnected(onLog)} />
                </ThemeProvider>
            </PersistQueryClientProvider>
        );
    }

    // Render: Home Screen
    if (screen === "home") {
        return (
            <PersistQueryClientProvider client={queryClient} persistOptions={{ persister: asyncStoragePersister, maxAge: 7 * 24 * 60 * 60 * 1000 }}>
                <ThemeProvider>
                    <HomeScreen onLogout={handleLogout} />
                </ThemeProvider>
            </PersistQueryClientProvider>
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
