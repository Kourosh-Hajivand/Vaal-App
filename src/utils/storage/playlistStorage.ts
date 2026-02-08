/**
 * Playlist Storage
 * ذخیره و بازیابی آخرین playlist و device data برای offline mode
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { PlaylistResource, ManifestResponse } from '@/src/types/api.types';

const LAST_PLAYLIST_KEY = '@last_playlist';
const LAST_MANIFEST_KEY = '@last_manifest';
const LAST_DEVICE_DATA_KEY = '@last_device_data';

/**
 * Save last playlist to AsyncStorage
 */
export const saveLastPlaylist = async (playlist: PlaylistResource): Promise<void> => {
    try {
        await AsyncStorage.setItem(LAST_PLAYLIST_KEY, JSON.stringify(playlist));
        console.log('[Storage] Playlist saved');
    } catch (error) {
        console.error('[Storage] Error saving playlist:', error);
    }
};

/**
 * Load last playlist from AsyncStorage
 */
export const loadLastPlaylist = async (): Promise<PlaylistResource | null> => {
    try {
        const stored = await AsyncStorage.getItem(LAST_PLAYLIST_KEY);
        if (stored) {
            console.log('[Storage] Playlist loaded from cache');
            return JSON.parse(stored);
        }
        return null;
    } catch (error) {
        console.error('[Storage] Error loading playlist:', error);
        return null;
    }
};

/**
 * Save entire manifest to AsyncStorage
 */
export const saveLastManifest = async (manifest: ManifestResponse): Promise<void> => {
    try {
        await AsyncStorage.setItem(LAST_MANIFEST_KEY, JSON.stringify(manifest));
        console.log('[Storage] Manifest saved');
    } catch (error) {
        console.error('[Storage] Error saving manifest:', error);
    }
};

/**
 * Load last manifest from AsyncStorage
 */
export const loadLastManifest = async (): Promise<ManifestResponse | null> => {
    try {
        const stored = await AsyncStorage.getItem(LAST_MANIFEST_KEY);
        if (stored) {
            console.log('[Storage] Manifest loaded from cache');
            return JSON.parse(stored);
        }
        return null;
    } catch (error) {
        console.error('[Storage] Error loading manifest:', error);
        return null;
    }
};

/**
 * Save last device data (building, contacts, etc.)
 */
export const saveLastDeviceData = async (data: any): Promise<void> => {
    try {
        await AsyncStorage.setItem(LAST_DEVICE_DATA_KEY, JSON.stringify(data));
        console.log('[Storage] Device data saved');
    } catch (error) {
        console.error('[Storage] Error saving device data:', error);
    }
};

/**
 * Load last device data
 */
export const loadLastDeviceData = async (): Promise<any | null> => {
    try {
        const stored = await AsyncStorage.getItem(LAST_DEVICE_DATA_KEY);
        if (stored) {
            console.log('[Storage] Device data loaded from cache');
            return JSON.parse(stored);
        }
        return null;
    } catch (error) {
        console.error('[Storage] Error loading device data:', error);
        return null;
    }
};

/**
 * Clear all cached data
 */
export const clearAllStorage = async (): Promise<void> => {
    try {
        await AsyncStorage.multiRemove([LAST_PLAYLIST_KEY, LAST_MANIFEST_KEY, LAST_DEVICE_DATA_KEY]);
        console.log('[Storage] All storage cleared');
    } catch (error) {
        console.error('[Storage] Error clearing storage:', error);
    }
};
