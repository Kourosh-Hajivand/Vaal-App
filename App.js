import React, { useEffect, useState, useRef, useCallback } from "react";
import { StyleSheet, View, ActivityIndicator, StatusBar, Platform, AppState, Text } from "react-native";
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
import { AutoRefetchOnReconnect } from "./src/components/shared/AutoRefetchOnReconnect";
import { ErrorBoundary } from "./src/components/shared/ErrorBoundary";
import { errorHandler } from "./src/utils/errorHandler";
import { useDeviceToken } from "./src/hooks/use-device-token";
import { clearAllCaches } from "./src/utils/cache/clearAllCaches";
import { logService } from "./src/services/logService";
import { logManager } from "./src/utils/logging/logManager";
import { startMemoryPressureMonitor } from "./src/utils/memoryPressureMonitor";
import { useDeviceInfo } from "./src/hooks/device/useDeviceInfo";
import OfflineScreen from "./components/OfflineScreen";
import HomeScreen from "./components/HomeScreen";
// Import asset index برای اطمینان از bundle شدن همه asset ها در production
import "./src/assets";

// Prevent splash screen from auto-hiding
SplashScreen.preventAutoHideAsync();

// Initialize global error handler
errorHandler.init();

// Create QueryClient instance
const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 2,
            staleTime: 1 * 60 * 1000, // 1 minute
            gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز — کش رو نگه دار برای آفلاین
            // توکن در axios instance پاک می‌شه، اینجا نیازی به onError نیست
        },
    },
});

// AsyncStorage Persister — تمام query data رو به AsyncStorage ذخیره می‌کنه
const asyncStoragePersister = createAsyncStoragePersister({
    storage: AsyncStorage,
    key: "REACT_QUERY_OFFLINE_CACHE",
    throttleTime: 2000, // هر 2 ثانیه persist (برای performance)
});

const persistOptions = { persister: asyncStoragePersister, maxAge: 7 * 24 * 60 * 60 * 1000 };

/**
 * محتوای اصلی اپ — داخل Provider رندر می‌شود تا useDeviceInfo/useQuery از اولین رندر در دسترس باشند.
 */
function AppContent() {
    // Load custom fonts
    const [fontsLoaded, fontError] = useFonts({
        "YekanBakh-Regular": require("./assets/fonts/YekanBakh-Regular.ttf"),
        "YekanBakh-SemiBold": require("./assets/fonts/YekanBakh-SemiBold.ttf"),
        "YekanBakh-Light": require("./assets/fonts/YekanBakh-Light.ttf"),
        "Michroma-Regular": require("./assets/fonts/Michroma-Regular.ttf"),
    });

    // Monitor token changes (reactive)
    const { hasToken } = useDeviceToken();
    const { data: deviceData } = useDeviceInfo();

    // هرچه زودتر device_id را برای لاگ‌ها (مثلاً memory_critical) ست کن
    useEffect(() => {
        if (deviceData?.id) {
            logManager.setDeviceId(deviceData.id);
        }
    }, [deviceData?.id]);

    const [screen, setScreen] = useState("loading");
    const [isChecking, setIsChecking] = useState(true);
    const networkUnsubscribeRef = useRef(null);
    const screenRef = useRef("loading");
    const appStateRef = useRef(AppState.currentState);
    const wasInBackgroundRef = useRef(false);
    const logSyncIntervalRef = useRef(null);
    const lastSyncTimeRef = useRef(0);

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

    // Monitor token changes - اگر token حذف شد (مثلاً بخاطر 401)، به OfflineScreen برو
    useEffect(() => {
        // اگر token نداریم و در Home هستیم، به OfflineScreen برو
        if (!hasToken && screen === "home") {
            console.log("❌ [APP] Token removed (likely due to 401), redirecting to OfflineScreen");
            setScreen("offline");
        }
    }, [hasToken, screen]);

    // Monitor 401 errors directly in App.js برای redirect فوری
    const hasRedirectedRef = useRef(false);
    useEffect(() => {
        const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
            // فقط events که query دارن رو چک کن
            if ("query" in event && event.query?.state?.error) {
                const error = event.query.state.error;
                // Check if error has response property
                const status = error && typeof error === "object" && "response" in error ? error.response?.status : null;

                // اگر 401 بود و هنوز redirect نکردیم، فوری redirect کن
                // توکن در axios instance پاک شده، cache ها رو هم پاک می‌کنیم
                if (status === 401 && !hasRedirectedRef.current) {
                    const currentScreen = screenRef.current;
                    console.log(`❌ [APP] 401 error detected (current screen: ${currentScreen}) - clearing caches and redirecting...`);
                    hasRedirectedRef.current = true;
                    
                    // Cancel تمام queryهای در حال اجرا
                    queryClient.cancelQueries();
                    // Remove تمام queries از cache تا enabled نشن
                    queryClient.removeQueries();
                    // Clear تمام React Query cache
                    queryClient.clear();
                    
                    // پاک کردن تمام cache ها (media, device data, etc.)
                    clearAllCaches().catch((error) => {
                        console.error("❌ [APP] Error clearing caches:", error);
                    });
                    
                    // فوری redirect کن (توکن در axios instance پاک شده)
                    setScreen("offline");
                    // Reset flag بعد از 3 ثانیه برای امکان redirect دوباره
                    setTimeout(() => {
                        hasRedirectedRef.current = false;
                    }, 3000);
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [queryClient]);

    // Handle AppState changes (Background/Foreground)
    useEffect(() => {
        const subscription = AppState.addEventListener("change", async (nextAppState) => {
            const wasBackground = appStateRef.current.match(/inactive|background/);
            const isNowForeground = nextAppState === "active";

            console.log(`[APP] AppState changed: ${appStateRef.current} → ${nextAppState}`);

            // اگر از background به foreground اومدیم
            if (wasBackground && isNowForeground) {
                console.log("🔄 [APP] App came to foreground, checking status...");
                wasInBackgroundRef.current = true;

                // اگر در Home هستیم و token داریم، validate کن
                if (screenRef.current === "home") {
                    const token = await tokenService.get();
                    if (token) {
                        try {
                            await deviceService.auth();
                            console.log("✅ [APP] Token still valid after foreground");
                        } catch (error) {
                            if (error?.response?.status === 401) {
                                console.log("❌ [APP] Token invalid after foreground, redirecting to OfflineScreen");
                                await tokenService.remove();
                                await pairCodeService.remove();
                                setScreen("offline");
                            }
                        }
                    }
                }
            }

            // اگر به background رفتیم
            if (nextAppState.match(/inactive|background/)) {
                console.log("📱 [APP] App went to background");
                wasInBackgroundRef.current = true;
            }

            appStateRef.current = nextAppState;
        });

        return () => {
            subscription.remove();
        };
    }, []);

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
        
        // لاگ تستی برای نمایش عملکرد سیستم
        if (hasToken) {
            logManager.logDeviceStateChange("on", "active");
            logManager.logError("other", "سیستم لاگ فعال شد - این یک لاگ تستی است", undefined, {
                test: true,
                timestamp: new Date().toISOString(),
            });
            console.log("✅ [LOG_SYSTEM] سیستم لاگ فعال شد و آماده دریافت لاگ‌ها است");
        }
    }, [checkInitialStatus, hasToken]);

    // راه‌اندازی سرویس sync لاگ‌ها
    useEffect(() => {
        if (!hasToken) return;

        // لاگ تستی برای نمایش عملکرد سیستم
        (async () => {
            try {
                const stats = await logManager.getStats();
                console.log("📊 [LOG_SYSTEM] سیستم لاگ فعال شد!");
                console.log("📊 [LOG_SYSTEM] آمار لاگ‌ها:", {
                    total_logs: stats?.total_logs || 0,
                    pending_sync: stats?.pending_sync_count || 0,
                    oldest_log: stats?.oldest_log_timestamp ? new Date(stats.oldest_log_timestamp).toLocaleString("fa-IR") : "ندارد",
                    newest_log: stats?.newest_log_timestamp ? new Date(stats.newest_log_timestamp).toLocaleString("fa-IR") : "ندارد",
                });
                
                // نوشتن یک لاگ تستی
                await logManager.logError("other", "سیستم لاگ فعال شد - این یک لاگ تستی است", undefined, {
                    test: true,
                    message: "سیستم لاگ با موفقیت راه‌اندازی شد",
                    timestamp: new Date().toISOString(),
                });
                console.log("✅ [LOG_SYSTEM] لاگ تستی نوشته شد");
            } catch (error) {
                console.error("❌ [LOG_SYSTEM] خطا در راه‌اندازی:", error);
            }
        })();

        const syncLogs = async () => {
            try {
                const isOnline = await networkService.isConnected();
                if (isOnline) {
                    const result = await logService.syncPendingLogs();
                    if (result.success) {
                        lastSyncTimeRef.current = Date.now();
                        console.log(`✅ [LOG_SYNC] ${result.syncedCount} لاگ sync شد`);
                    } else {
                        console.log(`⚠️ [LOG_SYNC] خطا در sync: ${result.message || "نامشخص"}`);
                    }
                } else {
                    console.log("📦 [LOG_SYNC] آفلاین - لاگ‌ها در دستگاه نگه داشته می‌شوند");
                }
            } catch (error) {
                console.error("❌ [LOG_SYNC] خطا در sync:", error);
            }
        };

        // Sync هر 10 دقیقه
        logSyncIntervalRef.current = setInterval(() => {
            syncLogs();
        }, 10 * 60 * 1000); // 10 minutes

        // Sync اولیه
        syncLogs();

        // مانیتور فشار حافظه روی دستگاه‌های کم‌رم: لاگ به بک‌اند + در صورت نیاز ریستارت نرم
        startMemoryPressureMonitor();

        return () => {
            if (logSyncIntervalRef.current) {
                clearInterval(logSyncIntervalRef.current);
            }
        };
    }, [hasToken]);

    // Force flush لاگ‌ها قبل از بستن اپ
    useEffect(() => {
        const handleAppStateChange = (nextAppState) => {
            if (nextAppState === "background" || nextAppState === "inactive") {
                // Flush لاگ‌ها قبل از رفتن به background
                logManager.flush().catch((error) => {
                    console.error("[LOG_SYNC] Error flushing logs:", error);
                });
            }
        };

        const subscription = AppState.addEventListener("change", handleAppStateChange);

        return () => {
            subscription.remove();
            // Flush نهایی
            logManager.flush().catch(() => {});
        };
    }, []);

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
                // فوراً لاگ‌ها را sync کن
                if (hasToken) {
                    logService.syncPendingLogs().catch((error) => {
                        console.error("[LOG_SYNC] Error syncing logs on reconnect:", error);
                    });
                }
                
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

    const errorFallback = (
        <View style={styles.errorContainer}>
            <Text style={styles.errorText}>خطا در اجرای برنامه</Text>
            <Text style={styles.errorSubtext}>در حال راه‌اندازی مجدد خودکار...</Text>
        </View>
    );

    const content = isChecking ? null : (
        <ErrorBoundary fallback={errorFallback}>
            {screen === "offline" && <OfflineScreen onConnected={(onLog) => handleConnected(onLog)} />}
            {screen === "home" && <HomeScreen onLogout={handleLogout} />}
            {screen === "loading" && null}
        </ErrorBoundary>
    );

    return (
        <ThemeProvider>
            <AutoRefetchOnReconnect />
            {content}
        </ThemeProvider>
    );
}

export default function App() {
    return (
        <PersistQueryClientProvider client={queryClient} persistOptions={persistOptions}>
            <AppContent />
        </PersistQueryClientProvider>
    );
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
    errorContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
        padding: 20,
    },
    errorText: {
        color: "#F44336",
        fontSize: 20,
        fontFamily: "YekanBakh-SemiBold",
        marginBottom: 10,
        textAlign: "center",
    },
    errorSubtext: {
        color: "#fff",
        fontSize: 14,
        fontFamily: "YekanBakh-Regular",
        textAlign: "center",
        opacity: 0.8,
    },
});
