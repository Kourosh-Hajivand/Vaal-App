import React, { useEffect, useRef } from "react";
import { WebView, WebViewMessageEvent } from "react-native-webview";
import { sensorService, SensorData } from "@/src/services/sensorService";

interface BridgeWebViewProps {
    webViewUrl: string;
    onError?: (error: Error) => void;
}

export function BridgeWebView({ webViewUrl, onError }: BridgeWebViewProps) {
    const webViewRef = useRef<WebView>(null);

    useEffect(() => {
        // Start sensor when WebView mounts
        sensorService.startSensor((sensorData: SensorData) => {
            // Send sensor data to WebView
            if (webViewRef.current) {
                const message = JSON.stringify({
                    type: "sensor_data",
                    data: sensorData,
                });

                webViewRef.current.injectJavaScript(`
                    window.postMessage(${message}, '*');
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

    const handleError = (syntheticEvent: any) => {
        const { nativeEvent } = syntheticEvent;
        console.error("WebView error:", nativeEvent);
        if (onError) {
            onError(new Error(nativeEvent.description || "WebView error"));
        }
    };

    return <WebView ref={webViewRef} source={{ uri: webViewUrl }} onMessage={handleMessage} onError={handleError} javaScriptEnabled={true} domStorageEnabled={true} startInLoadingState={true} style={{ flex: 1 }} />;
}
