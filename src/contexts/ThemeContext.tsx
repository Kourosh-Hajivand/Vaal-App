/**
 * Theme Context
 * Provides dark/light theme based on Iran time
 * - استفاده از config file برای راحتی تنظیمات
 */
import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { getIranTime, isDayTime } from '@/src/utils/time/iranTime';
import { LIGHT_THEME, DARK_THEME, THEME_CONFIG, type ThemeColors } from '@/src/config/theme.config';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
    mode: ThemeMode;
    colors: ThemeColors;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

interface ThemeProviderProps {
    children: ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
    const [mode, setMode] = useState<ThemeMode>('light');

    useEffect(() => {
        // Initial check
        const currentTime = getIranTime();
        const isDay = isDayTime(currentTime);
        setMode(isDay ? 'light' : 'dark');

        // Update based on config interval
        const interval = setInterval(() => {
            const time = getIranTime();
            const isDaytime = isDayTime(time);
            setMode(isDaytime ? 'light' : 'dark');
        }, THEME_CONFIG.updateInterval);

        return () => clearInterval(interval);
    }, []);

    const colors = mode === 'light' ? LIGHT_THEME : DARK_THEME;

    return <ThemeContext.Provider value={{ mode, colors }}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
    const context = useContext(ThemeContext);
    if (!context) {
        throw new Error('useTheme must be used within ThemeProvider');
    }
    return context;
};
