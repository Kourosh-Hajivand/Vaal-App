/**
 * Clear All Caches Utility
 * پاک کردن کامل تمام cache ها وقتی 401 می‌گیریم یا device reset می‌شه
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { cacheManager } from "./cacheManager";

// Cache keys که باید پاک بشن
const CACHE_KEYS = [
    // Device data
    "@last_playlist",
    "@last_manifest",
    "@last_device_data",
    // Announcements
    "@device_announcements",
    "@device_announcements_timestamp",
    // Contacts
    "@device_contacts",
    // Weather
    "@weather_forecast_cache",
    "@weather_current_cache",
    "@weather_cache_timestamp",
    // Media cache metadata
    "@media_cache_metadata",
    "@media_cache_metadata_backup",
    // React Query cache (handled separately)
    "REACT_QUERY_OFFLINE_CACHE",
] as const;

/**
 * پاک کردن کامل تمام cache ها
 * شامل:
 * - Media cache (videos/images)
 * - Device data cache
 * - Announcements cache
 * - Contacts cache
 * - Weather cache
 * - React Query cache (باید جداگانه clear بشه)
 */
export const clearAllCaches = async (): Promise<void> => {
    console.log("🧹 [ClearCache] شروع پاک کردن تمام cache ها...");

    try {
        // 1. پاک کردن media cache (videos/images)
        try {
            await cacheManager.clearCache();
            console.log("✅ [ClearCache] Media cache cleared");
        } catch (error) {
            console.error("❌ [ClearCache] Error clearing media cache:", error);
        }

        // 2. پاک کردن تمام AsyncStorage keys مربوط به device
        try {
            await AsyncStorage.multiRemove([...CACHE_KEYS]);
            console.log("✅ [ClearCache] AsyncStorage cache cleared");
        } catch (error) {
            console.error("❌ [ClearCache] Error clearing AsyncStorage:", error);
        }

        console.log("✅ [ClearCache] تمام cache ها پاک شدند");
    } catch (error) {
        console.error("❌ [ClearCache] Error clearing caches:", error);
        throw error;
    }
};
