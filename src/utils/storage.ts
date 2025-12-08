import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";

/**
 * Storage utility with fallback for web/development
 * Uses SecureStore on native, AsyncStorage as fallback
 */

const isWeb = Platform.OS === "web";

// Lazy import SecureStore to handle cases where native module is not available
let SecureStore: typeof import("expo-secure-store") | null = null;

try {
    SecureStore = require("expo-secure-store");
} catch (error) {
    console.warn("expo-secure-store not available, using AsyncStorage only");
}

export const storage = {
    /**
     * Save item
     */
    save: async (key: string, value: string): Promise<void> => {
        try {
            if (isWeb) {
                // Web: use AsyncStorage
                await AsyncStorage.setItem(key, value);
                return;
            }

            // Native: try SecureStore first (if available)
            if (SecureStore) {
                try {
                    await SecureStore.setItemAsync(key, value);
                    return;
                } catch (secureError) {
                    // Fallback to AsyncStorage if SecureStore fails
                    console.warn("SecureStore failed, using AsyncStorage:", secureError);
                }
            }
            // Use AsyncStorage as fallback or primary
            await AsyncStorage.setItem(key, value);
        } catch (error) {
            console.error(`Error saving ${key}:`, error);
            throw error;
        }
    },

    /**
     * Get item
     */
    get: async (key: string): Promise<string | null> => {
        try {
            if (isWeb) {
                // Web: use AsyncStorage
                return await AsyncStorage.getItem(key);
            }

            // Native: try SecureStore first (if available)
            if (SecureStore) {
                try {
                    const value = await SecureStore.getItemAsync(key);
                    if (value !== null) {
                        return value;
                    }
                } catch (secureError) {
                    // Fallback to AsyncStorage if SecureStore fails
                    console.warn("SecureStore failed, using AsyncStorage:", secureError);
                }
            }

            // Fallback to AsyncStorage
            return await AsyncStorage.getItem(key);
        } catch (error) {
            console.error(`Error getting ${key}:`, error);
            return null;
        }
    },

    /**
     * Remove item
     */
    remove: async (key: string): Promise<void> => {
        try {
            if (isWeb) {
                // Web: use AsyncStorage
                await AsyncStorage.removeItem(key);
                return;
            }

            // Native: try SecureStore first (if available)
            if (SecureStore) {
                try {
                    await SecureStore.deleteItemAsync(key);
                    return;
                } catch (secureError) {
                    // Fallback to AsyncStorage if SecureStore fails
                    console.warn("SecureStore failed, using AsyncStorage:", secureError);
                }
            }
            // Use AsyncStorage as fallback or primary
            await AsyncStorage.removeItem(key);
        } catch (error) {
            console.error(`Error removing ${key}:`, error);
            throw error;
        }
    },
};
