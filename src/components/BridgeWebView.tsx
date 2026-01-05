import React, { useEffect, useRef } from "react";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { Platform } from "react-native";
import { sensorService, SensorData } from "@/src/services/sensorService";
import { tokenService } from "@/src/services/tokenService";
import { deviceService } from "@/src/services/device.service";
import { pairCodeService } from "@/src/services/pairCodeService";

interface BridgeWebViewProps {
    webViewUrl: string;
    onError?: (error: Error) => void;
    onTokenInvalid?: () => void; // Callback برای وقتی token نامعتبره
}

export function BridgeWebView({ webViewUrl, onError, onTokenInvalid }: BridgeWebViewProps) {
    const webViewRef = useRef<WebView>(null);
    const isWebViewReady = useRef(false);
    const lastRefreshDateRef = useRef<string | null>(null);
    const refreshCheckIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const isTokenValidatingRef = useRef(false); // برای جلوگیری از validate کردن همزمان

    // Validate token before sending to WebView
    const validateAndSendToken = async () => {
        if (!webViewRef.current || !isWebViewReady.current) return;
        if (isTokenValidatingRef.current) return; // اگر در حال validate هست، صبر کن

        try {
            isTokenValidatingRef.current = true;
            const token = await tokenService.get();
            
            if (!token) {
                console.log("⚠️ No token found, cannot send to WebView");
                isTokenValidatingRef.current = false;
                return;
            }

            // اول validate کن که token معتبر هست
            console.log("🔐 [TOKEN] Validating token before sending to WebView...");
            try {
                await deviceService.auth();
                console.log("✅ [TOKEN] Token is valid, sending to WebView");
                
                // Token معتبر → ارسال به WebView
                const message = JSON.stringify({
                    type: "device_token",
                    token: token,
                });

                webViewRef.current.injectJavaScript(`
                    (function() {
                        window.postMessage(${message}, '*');
                        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                            window.ReactNativeWebView.postMessage(${message});
                        }
                    })();
                    true;
                `);
                console.log("✅ Token sent to WebView");
            } catch (error) {
                // Token نامعتبر
                const status = error?.response?.status;
                if (status === 401) {
                    // فقط در صورت 401 از WebView بیرون بیا
                    console.log("❌ [TOKEN] Token is invalid (401), removing token and pair code");
                    
                    // پاک کردن token و pair code
                    await tokenService.remove();
                    await pairCodeService.remove();
                    
                    // اطلاع دادن به App.js که token نامعتبره
                    if (onTokenInvalid) {
                        onTokenInvalid();
                    }
                } else {
                    // خطای دیگر (network, etc.) - WebView بمونه و token رو ارسال کن
                    console.warn("⚠️ [TOKEN] Auth check failed (non-401 error), staying in WebView:", error?.message);
                    
                    // در صورت خطای network یا خطای دیگر، token رو ارسال کن و در WebView بمون
                    const message = JSON.stringify({
                        type: "device_token",
                        token: token,
                    });

                    webViewRef.current.injectJavaScript(`
                        (function() {
                            window.postMessage(${message}, '*');
                            if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                                window.ReactNativeWebView.postMessage(${message});
                            }
                        })();
                        true;
                    `);
                    console.log("✅ Token sent to WebView (staying in WebView despite auth error)");
                }
            }
        } catch (error) {
            console.error("Error validating/sending token to WebView:", error);
        } finally {
            isTokenValidatingRef.current = false;
        }
    };

    // Send token to WebView when it's ready (legacy function name for compatibility)
    const sendTokenToWebView = validateAndSendToken;

    useEffect(() => {
        // Start sensor when WebView mounts
        sensorService.startSensor((sensorData: SensorData) => {
            // Send sensor data to WebView
            if (webViewRef.current && isWebViewReady.current) {
                const message = JSON.stringify({
                    type: "sensor_data",
                    data: sensorData,
                });

                webViewRef.current.injectJavaScript(`
                    (function() {
                        window.postMessage(${message}, '*');
                        if (window.ReactNativeWebView && window.ReactNativeWebView.postMessage) {
                            window.ReactNativeWebView.postMessage(${message});
                        }
                    })();
                    true;
                `);
            }
        });

        return () => {
            // Stop sensor when WebView unmounts
            sensorService.stopSensor();
        };
    }, []);

    // Auto-refresh WebView every day at 3 AM
    useEffect(() => {
        const checkAndRefresh = () => {
            const now = new Date();
            const currentHour = now.getHours();
            const currentMinute = now.getMinutes();
            const today = now.toDateString(); // Format: "Mon Jan 01 2024"

            // Check if it's 3 AM (between 3:00 and 3:01)
            if (currentHour === 3 && currentMinute === 0) {
                // Check if we haven't refreshed today
                if (lastRefreshDateRef.current !== today) {
                    console.log("🔄 [AUTO-REFRESH] Refreshing WebView at 3 AM");
                    lastRefreshDateRef.current = today;

                    // Reload WebView
                    if (webViewRef.current) {
                        webViewRef.current.reload();
                    }
                }
            }
        };

        // Check immediately
        checkAndRefresh();

        // Check every minute
        refreshCheckIntervalRef.current = setInterval(checkAndRefresh, 60000); // 60000ms = 1 minute

        return () => {
            if (refreshCheckIntervalRef.current) {
                clearInterval(refreshCheckIntervalRef.current);
                refreshCheckIntervalRef.current = null;
            }
        };
    }, []);

    const handleMessage = (event: WebViewMessageEvent) => {
        try {
            const message = JSON.parse(event.nativeEvent.data);
            console.log("Message from WebView:", message);

            // Handle different message types from WebView
            switch (message.type) {
                case "webview_ready":
                    // WebView is ready, send token
                    isWebViewReady.current = true;
                    sendTokenToWebView();
                    break;
                case "request_token":
                    // WebView is requesting token
                    sendTokenToWebView();
                    break;
                case "request_sensor_data":
                    // WebView is requesting current sensor data
                    // This will be handled by the sensor callback
                    break;
                default:
                    console.log("Unknown message type:", message.type);
            }
        } catch (error) {
            console.error("Error parsing WebView message:", error);
        }
    };

    // Handle WebView load end - send token when page is loaded
    const handleLoadEnd = async () => {
        isWebViewReady.current = true;

        // بررسی اینکه آیا استایل‌ها لود شده‌اند
        webViewRef.current?.injectJavaScript(`
            (function() {
                const stylesheets = document.querySelectorAll('link[rel="stylesheet"]');
                console.log('📄 Stylesheets found:', stylesheets.length);
                stylesheets.forEach((link, index) => {
                    const isLoaded = link.sheet !== null;
                    console.log('📄 Stylesheet ' + index + ':', link.href, isLoaded ? '✅ loaded' : '❌ not loaded');
                    if (!isLoaded) {
                        // اگر استایل لود نشده، دوباره تلاش کن
                        const newLink = document.createElement('link');
                        newLink.rel = 'stylesheet';
                        newLink.href = link.href;
                        document.head.appendChild(newLink);
                    }
                });
            })();
            true;
        `);

        // Wait a bit for WebView to be fully ready
        setTimeout(() => {
            sendTokenToWebView();
        }, 500);
    };

    const handleError = (syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;
        const errorCode = nativeEvent?.code;
        const errorDescription = nativeEvent?.description || "WebView error";

        console.error("WebView error:", errorDescription, "Code:", errorCode);

        // Don't trigger onError for network errors - let WebView retry
        // Only trigger for critical errors
        if (errorCode !== -2 && errorCode !== -6) {
            // -2 = ERR_ADDRESS_UNREACHABLE (network issue)
            // -6 = ERR_FILE_NOT_FOUND
            if (onError) {
                onError(new Error(errorDescription));
            }
        } else {
            console.warn("Network error (will retry):", errorDescription);
        }
    };

    return (
        <WebView
            ref={webViewRef}
            source={{ uri: webViewUrl }}
            onMessage={handleMessage}
            onError={handleError}
            onLoadEnd={handleLoadEnd}
            javaScriptEnabled={true}
            domStorageEnabled={true}
            startInLoadingState={true}
            style={{ flex: 1 }}
            // تنظیمات مهم برای لود شدن استایل‌ها
            allowsInlineMediaPlayback={true}
            mediaPlaybackRequiresUserAction={false}
            mixedContentMode="always" // اجازه لود منابع HTTP در HTTPS
            originWhitelist={["*"]} // اجازه به همه منابع
            allowsBackForwardNavigationGestures={true}
            cacheEnabled={true} // فعال کردن کش (کش در اپ وب هندل میشه)
            thirdPartyCookiesEnabled={true} // برای کوکی‌های شخص ثالث
            sharedCookiesEnabled={true} // اشتراک کوکی‌ها
            scalesPageToFit={true}
            // User-Agent را تنظیم کن تا سرور استایل‌ها را بلاک نکند
            userAgent={Platform.OS === "ios" ? "Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.0 Mobile/15E148 Safari/604.1" : "Mozilla/5.0 (Linux; Android 10; Mobile) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Mobile Safari/537.36"}
            // تنظیمات اضافی برای Android
            {...(Platform.OS === "android" && {
                androidLayerType: "hardware",
                androidHardwareAccelerationDisabled: false,
            })}
            // تنظیمات اضافی برای iOS
            {...(Platform.OS === "ios" && {
                allowsLinkPreview: false,
                decelerationRate: "normal",
            })}
            // Inject CSS قبل از لود شدن محتوا (برای اطمینان از لود شدن استایل‌ها)
            injectedJavaScriptBeforeContentLoaded={`
                (function() {
                    // اضافه کردن meta tag برای viewport
                    if (!document.querySelector('meta[name="viewport"]')) {
                        const meta = document.createElement('meta');
                        meta.name = 'viewport';
                        meta.content = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no';
                        document.head.appendChild(meta);
                    }
                    
                    // اضافه کردن meta tag برای charset
                    if (!document.querySelector('meta[charset]')) {
                        const meta = document.createElement('meta');
                        meta.setAttribute('charset', 'UTF-8');
                        document.head.appendChild(meta);
                    }
                    
                    console.log('WebView content loading...');
                })();
                true;
            `}
            // Inject script to listen for messages
            injectedJavaScript={`
                (function() {
                    // Notify native that WebView is ready
                    window.addEventListener('load', function() {
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'webview_ready'
                            }));
                        }
                    });
                    
                    // Listen for messages from native
                    window.addEventListener('message', function(event) {
                        console.log('Message from native:', event.data);
                    });
                    
                    // Expose a function for WebView to request token
                    window.requestToken = function() {
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'request_token'
                            }));
                        }
                    };
                    
                    // Expose a function for WebView to request sensor data
                    window.requestSensorData = function() {
                        if (window.ReactNativeWebView) {
                            window.ReactNativeWebView.postMessage(JSON.stringify({
                                type: 'request_sensor_data'
                            }));
                        }
                    };
                })();
                true;
            `}
        />
    );
}
