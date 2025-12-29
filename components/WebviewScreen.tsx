import { BridgeWebView } from "@/src/components/BridgeWebView";
import { networkService } from "@/src/services/networkService";
import { tokenService } from "@/src/services/tokenService";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { ActivityIndicator, SafeAreaView, StyleSheet, View } from "react-native";
import OfflineScreen from "./OfflineScreen";

// const WEBVIEW_URL = process.env.EXPO_PUBLIC_WEBVIEW_URL || "https://vaal.pixlink.co";
const WEBVIEW_URL = process.env.EXPO_PUBLIC_WEBVIEW_URL || "http://localhost:3000";

export default function WebviewScreen() {
    const [isOnline, setIsOnline] = useState<boolean>(false);
    const [isTokenValid, setIsTokenValid] = useState<boolean>(false);
    const [isChecking, setIsChecking] = useState<boolean>(true);

    useEffect(() => {
        checkStatus();
    }, []);

    const checkStatus = async () => {
        setIsChecking(true);

        // Check network connection
        const networkConnected = await networkService.isConnected();
        setIsOnline(networkConnected);

        // Check if token exists
        const token = await tokenService.get();
        setIsTokenValid(!!token);

        setIsChecking(false);

        // If no token, redirect to offline screen (which handles pairing)
        if (!token) {
            router.replace("/screens/OfflineScreen");
            return;
        }

        // Subscribe to network changes
        const unsubscribe = networkService.subscribe((connected) => {
            setIsOnline(connected);
        });

        return () => {
            unsubscribe();
        };
    };

    const handleConnected = () => {
        setIsOnline(true);
    };

    if (isChecking) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#2962FF" />
                </View>
            </SafeAreaView>
        );
    }

    // Show offline screen if no internet
    if (!isOnline) {
        return <OfflineScreen onConnected={handleConnected} />;
    }

    // Show WebView if online and token exists
    if (isTokenValid) {
        return (
            <SafeAreaView style={styles.container}>
                <BridgeWebView
                    webViewUrl={WEBVIEW_URL}
                    onError={(error) => {
                        console.error("WebView error:", error);
                    }}
                />
            </SafeAreaView>
        );
    }

    // Redirect to pairing if no token
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
