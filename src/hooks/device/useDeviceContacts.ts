/**
 * Device Contacts Hook
 * دریافت لیست مخاطبین دستگاه با cache support
 */
import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { deviceService } from "@/src/services/device.service";
import { tokenStorage } from "@/src/utils/token-storage";
import AsyncStorage from "@react-native-async-storage/async-storage";
import type { ContactResource } from "@/src/types/api.types";

const CACHE_KEY = "@device_contacts";

// Helper functions برای cache
const loadCachedContacts = async (): Promise<ContactResource[] | null> => {
    try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached);
        }
        return null;
    } catch (error) {
        console.error("[useDeviceContacts] Error loading cache:", error);
        return null;
    }
};

const saveCachedContacts = async (data: ContactResource[]): Promise<void> => {
    try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify(data));
    } catch (error) {
        console.error("[useDeviceContacts] Error saving cache:", error);
    }
};

export const useDeviceContacts = () => {
    const [hasToken, setHasToken] = useState(false);
    const cachedDataRef = useRef<ContactResource[] | null>(null);
    const [cacheLoaded, setCacheLoaded] = useState(false);

    // بلافاصله cached data رو لود کن (فقط یکبار)
    useEffect(() => {
        const init = async () => {
            console.log("[useDeviceContacts] 📂 Loading cached contacts...");
            const cached = await loadCachedContacts();
            if (cached) {
                console.log("[useDeviceContacts] ✅ Cached contacts found:", cached.length);
                cachedDataRef.current = cached;
            } else {
                console.log("[useDeviceContacts] ⚠️ No cached contacts");
            }
            setCacheLoaded(true);

            // چک کردن token
            const token = await tokenStorage.get();
            setHasToken(!!token);
            console.log("[useDeviceContacts] 🔑 Token:", token ? "EXISTS" : "NOT FOUND");
        };

        init();
    }, []);

    const query = useQuery({
        queryKey: ["device", "contacts"],
        queryFn: async () => {
            console.log("[useDeviceContacts] 🔄 Fetching contacts from server...");
            const contacts = await deviceService.getContacts();
            console.log("[useDeviceContacts] ✅ Got contacts from server:", contacts.length);
            return contacts;
        },
        enabled: hasToken && cacheLoaded,
        staleTime: 60 * 1000, // 1 minute
        gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز
        networkMode: "offlineFirst",
        retry: 3,
        retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
        // فقط برای اولین render از cache استفاده کن
        placeholderData: () => {
            return cachedDataRef.current || undefined;
        },
        // هر 1 دقیقه refetch کن
        refetchInterval: 10 * 1000,
        refetchIntervalInBackground: true,
    });

    // Save to cache when new data arrives از server
    useEffect(() => {
        if (query.data && !query.isPlaceholderData) {
            console.log("[useDeviceContacts] 💾 Saving contacts to cache");
            saveCachedContacts(query.data);
            cachedDataRef.current = query.data;
        }
    }, [query.data, query.isPlaceholderData]);

    // CRITICAL: اولویت با query.data (آخرین دیتا از server)
    const contacts = query.data || cachedDataRef.current || [];

    return {
        ...query,
        data: contacts,
        isLoadingCache: !cacheLoaded,
    };
};
