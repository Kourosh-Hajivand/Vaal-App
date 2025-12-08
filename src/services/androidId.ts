import * as Device from "expo-device";

/**
 * Get Android Device ID (Serial Number)
 */
export async function getAndroidId(): Promise<string> {
    try {
        // Use Device API to get device info
        // For Android, we can use Device.modelName or Device.deviceName
        // But for actual Android ID, we need to use native module
        // This is a fallback - you may need to install expo-device or use a native module
        if (Device.brand === "Android") {
            // TODO: Implement native module to get actual Android ID
            // For now, return a placeholder
            return Device.modelName || Device.deviceName || "UNKNOWN_DEVICE";
        }
        return Device.modelName || "UNKNOWN_DEVICE";
    } catch (error) {
        console.error("Error getting Android ID:", error);
        return "UNKNOWN_DEVICE";
    }
}
