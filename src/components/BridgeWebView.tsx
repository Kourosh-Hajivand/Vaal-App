import React, { useEffect, useRef } from "react";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { Platform } from "react-native";
import { sensorService, SensorData } from "@/src/services/sensorService";
import { tokenService } from "@/src/services/tokenService";

interface BridgeWebViewProps {
    webViewUrl: string;
    onError?: (error: Error) => void;
}

export function BridgeWebView({ webViewUrl, onError }: BridgeWebViewProps) {
    const webViewRef = useRef<WebView>(null);
    const isWebViewReady = useRef(false);

    // Send token to WebView when it's ready
    const sendTokenToWebView = async () => {
        if (!webViewRef.current || !isWebViewReady.current) return;

        try {
            const token = await tokenService.get();
            if (token) {
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
            }
        } catch (error) {
            console.error("Error sending token to WebView:", error);
        }
    };

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
            cacheEnabled={true} // فعال کردن کش
            cacheMode="LOAD_DEFAULT" // استفاده از کش
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
