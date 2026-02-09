/**
 * Image Display Component
 * با Expo Image برای fast loading & cache support
 */
import React from "react";
import { View, StyleSheet, Text } from "react-native";
import { Image } from "expo-image";

interface ImageDisplayProps {
    uri: string;
    onError?: (error: any) => void;
}

export const ImageDisplay: React.FC<ImageDisplayProps> = ({ uri, onError }) => {
    const handleError = (error: any) => {
        console.error("[ImageDisplay] Error:", error);
        onError?.(error);
    };

    const handleLoad = () => {};

    // ⚠️ CRITICAL: expo-image نیاز به file:// scheme برای local files داره
    const imageUri = React.useMemo(() => {
        if (!uri) return "";

        // اگر از http/https شروع میشه، همون رو برگردون
        if (uri.startsWith("http://") || uri.startsWith("https://")) {
            return uri;
        }

        // اگر file:// داره، همون رو برگردون
        if (uri.startsWith("file://")) {
            return uri;
        }

        // در غیر این صورت، file:// اضافه کن
        return `file://${uri}`;
    }, [uri]);

    if (!uri) {
        console.warn("[ImageDisplay] ⚠️ No URI provided");
        return (
            <View style={styles.container}>
                <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
                    <Text style={{ color: "#fff" }}>No image</Text>
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            <Image source={{ uri: imageUri }} style={styles.image} contentFit="cover" transition={300} cachePolicy="memory-disk" onError={handleError} onLoad={handleLoad} priority="high" />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
    },
    image: {
        width: "100%",
        height: "100%",
    },
});
