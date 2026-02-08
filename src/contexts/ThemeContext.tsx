/**
 * Theme Context
 * Provides dark/light theme based on Iran time
 * - استفاده از config file برای راحتی تنظیمات
 * - پشتیبانی از تغییر دستی تم با setTheme
 * - پشتیبانی از initialTheme روی Provider
 */
import React, { createContext, useContext, useEffect, useState, useCallback, useRef, ReactNode } from 'react';
import { getIranTime, isDayTime } from '@/src/utils/time/iranTime';
import { LIGHT_THEME, DARK_THEME, THEME_CONFIG, type ThemeColors } from '@/src/config/theme.config';

export type ThemeMode = 'light' | 'dark';

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
    const isManualOverride = useRef(!!initialTheme);

    const [mode, setMode] = useState<ThemeMode>(() => {
        if (initialTheme) return initialTheme;
        const currentTime = getIranTime();
        return isDayTime(currentTime) ? 'light' : 'dark';
    });

    useEffect(() => {
        // اگه دستی ست شده، اتوماتیک آپدیت نکن
        if (isManualOverride.current) return;

        const interval = setInterval(() => {
            const time = getIranTime();
            const isDaytime = isDayTime(time);
            setMode(isDaytime ? 'light' : 'dark');
        }, THEME_CONFIG.updateInterval);

        return () => clearInterval(interval);
    }, [isManualOverride.current]);

    /** تغییر دستی تم — اتوماتیک رو غیرفعال می‌کنه */
    const setTheme = useCallback((newMode: ThemeMode) => {
        isManualOverride.current = true;
        setMode(newMode);
    }, []);

    /** برگشت به حالت اتوماتیک */
    const resetToAuto = useCallback(() => {
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
