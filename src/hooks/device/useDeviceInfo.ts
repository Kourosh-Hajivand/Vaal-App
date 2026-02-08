/**
 * Device Info Hooks
 * دریافت اطلاعات device، contacts، snippets با cache support
 */
import { useState, useEffect, useMemo } from 'react';
import { useDeviceManifest } from './useDeviceManifest';
import { loadLastDeviceData, saveLastDeviceData } from '@/src/utils/storage/playlistStorage';
import type { ContactResource } from '@/src/types/api.types';

export const useDeviceInfo = () => {
    const { data, isLoading, error } = useDeviceManifest();
    const [lastData, setLastData] = useState<any>(null);

    // Load from cache on mount
    useEffect(() => {
        loadLastDeviceData().then(setLastData);
    }, []);

    // Save to cache when data changes
    useEffect(() => {
        if (data) {
            saveLastDeviceData(data);
            setLastData(data);
        }
    }, [data]);

    return {
        data: data || lastData,
        isLoading,
        error,
    };
};

export const useDeviceContacts = (): { data: ContactResource[]; isLoading: boolean } => {
    const { data, isLoading } = useDeviceInfo();

    const contacts = useMemo(() => {
        if (!data?.contacts) return [];
        
        // Map contacts to consistent format
        return data.contacts.map((c: any) => ({
            name: c.name || c.label || '',
            phone: c.phone || '',
            role: c.role || c.description || '',
        }));
    }, [data?.contacts]);

    return {
        data: contacts,
        isLoading,
    };
};

export const useRandomSnippet = (): { data: any; isLoading: boolean } => {
    const { data, isLoading } = useDeviceInfo();

    const randomSnippet = useMemo(() => {
        const snippets = data?.snippets || [];
        if (snippets.length === 0) return null;

        // انتخاب یک snippet تصادفی
        const randomIndex = Math.floor(Math.random() * snippets.length);
        return snippets[randomIndex];
    }, [data?.snippets]);

    return {
        data: randomSnippet,
        isLoading,
    };
};
