/**
 * Theme Context
 * Provides dark/light theme based on Iran time
 * - استفاده از config file برای راحتی تنظیمات
 * - پشتیبانی از تغییر دستی تم با setTheme
 * - پشتیبانی از initialTheme روی Provider
 * - کشینگ تم در AsyncStorage برای استفاده آفلاین
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getIranTime, isDayTime } from '@/src/utils/time/iranTime';
import { LIGHT_THEME, DARK_THEME, THEME_CONFIG, type ThemeColors } from '@/src/config/theme.config';

export type ThemeMode = 'light' | 'dark';

const THEME_CACHE_KEY = '@app_theme_mode';
const THEME_MANUAL_OVERRIDE_KEY = '@app_theme_manual_override';

interface ThemeContextType {
    /** تم فعلی: 'light' یا 'dark' */
    mode: ThemeMode;
    /** آیا تم دارک فعاله؟ */
    isDark: boolean;
    /** رنگ‌های تم فعلی */
    colors: ThemeColors;
    /** تغییر دستی تم از کد — اتوماتیک رو غیرفعال می‌کنه */
    setTheme: (mode: ThemeMode) => void;
    /** برگشت به حالت اتوماتیک (بر اساس ساعت ایران) */
    resetToAuto: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
    /** اگه بخوای تم اولیه رو دستی ست کنی */
    initialTheme?: ThemeMode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children, initialTheme }) => {
    // آیا کاربر دستی تم رو عوض کرده؟
    const isManualOverride = useRef(false);
    const [isLoading, setIsLoading] = useState(true);

    const [mode, setMode] = useState<ThemeMode>(() => {
        if (initialTheme) return initialTheme;
        const currentTime = getIranTime();
        return isDayTime(currentTime) ? 'light' : 'dark';
    });

    // لود کردن تم کش شده از AsyncStorage
    useEffect(() => {
        const loadCachedTheme = async () => {
            try {
                const [cachedMode, cachedOverride] = await Promise.all([
                    AsyncStorage.getItem(THEME_CACHE_KEY),
                    AsyncStorage.getItem(THEME_MANUAL_OVERRIDE_KEY),
                ]);

                if (cachedMode && (cachedMode === 'light' || cachedMode === 'dark')) {
                    console.log('[Theme] 📂 Loaded cached theme:', cachedMode);
                    setMode(cachedMode as ThemeMode);
                }

                if (cachedOverride === 'true') {
                    console.log('[Theme] 📂 Manual override detected');
                    isManualOverride.current = true;
                }
            } catch (error) {
                console.error('[Theme] Error loading cached theme:', error);
            } finally {
                setIsLoading(false);
            }
        };

        loadCachedTheme();
    }, []);

    // ذخیره کردن تم در AsyncStorage هر وقت تغییر کرد
    useEffect(() => {
        if (isLoading) return;

        const saveTheme = async () => {
            try {
                await AsyncStorage.setItem(THEME_CACHE_KEY, mode);
                console.log('[Theme] 💾 Saved theme to cache:', mode);
            } catch (error) {
                console.error('[Theme] Error saving theme:', error);
            }
        };

        saveTheme();
    }, [mode, isLoading]);

    // ذخیره کردن وضعیت manual override
    useEffect(() => {
        if (isLoading) return;

        const saveOverride = async () => {
            try {
                await AsyncStorage.setItem(THEME_MANUAL_OVERRIDE_KEY, isManualOverride.current ? 'true' : 'false');
            } catch (error) {
                console.error('[Theme] Error saving override status:', error);
            }
        };

        saveOverride();
    }, [isManualOverride.current, isLoading]);

    useEffect(() => {
        // اگه دستی ست شده، اتوماتیک آپدیت نکن
        if (isManualOverride.current || isLoading) return;

        const interval = setInterval(() => {
            const time = getIranTime();
            const isDaytime = isDayTime(time);
            const newMode = isDaytime ? 'light' : 'dark';
            
            // فقط اگر تم تغییر کرد، آپدیت کن
            if (newMode !== mode) {
                console.log('[Theme] 🌅 Auto theme change:', mode, '→', newMode);
                setMode(newMode);
            }
        }, THEME_CONFIG.updateInterval);

        return () => clearInterval(interval);
    }, [isManualOverride.current, isLoading, mode]);

    /** تغییر دستی تم — اتوماتیک رو غیرفعال می‌کنه */
    const setTheme = useCallback((newMode: ThemeMode) => {
        console.log('[Theme] 🎨 Manual theme change:', mode, '→', newMode);
        isManualOverride.current = true;
        setMode(newMode);
    }, [mode]);

    /** برگشت به حالت اتوماتیک */
    const resetToAuto = useCallback(() => {
        console.log('[Theme] 🔄 Resetting to auto mode');
        isManualOverride.current = false;
        const currentTime = getIranTime();
        setMode(isDayTime(currentTime) ? 'light' : 'dark');
    }, []);

    const colors = mode === 'light' ? LIGHT_THEME : DARK_THEME;
    const isDark = mode === 'dark';

    return (
        <ThemeContext.Provider value={{ mode, isDark, colors, setTheme, resetToAuto }}>
            {children}
        </ThemeContext.Provider>
    );
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};
