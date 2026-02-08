/**
 * Theme Configuration
 * تنظیمات مرکزی برای theme colors و timing
 */

export interface ThemeColors {
    background: string;
    text: string;
    border: string;
    cardBackground: string;
    errorBackground: string;
    errorBorder: string;
    errorText: string;
    // می‌تونید رنگ‌های دیگه هم اضافه کنید
    success?: string;
    warning?: string;
    info?: string;
}

/**
 * Light Theme Colors
 */
export const LIGHT_THEME: ThemeColors = {
    background: "#FFFFFF",
    text: "#000000",
    border: "#DADADA",
    cardBackground: "#FFFFFF",
    errorBackground: "#FEF2F2",
    errorBorder: "#FCA5A5",
    errorText: "#DC2626",
    success: "#10B981",
    warning: "#FFE8DC",
    info: "#3B82F6",
};

/**
 * Dark Theme Colors
 */
export const DARK_THEME: ThemeColors = {
    background: "#080F18",
    text: "#FFFFFF",
    border: "#333333",
    cardBackground: "#2A2A2A",
    errorBackground: "#450A0A",
    errorBorder: "#991B1B",
    errorText: "#FCA5A5",
    success: "#34D399",
    warning: "#FBBF24",
    info: "#60A5FA",
};

/**
 * Theme Timing Configuration
 */
export const THEME_CONFIG = {
    /**
     * ساعت شروع Light Mode (صبح)
     * مقدار: 0-23
     */
    lightModeStartHour: 6,

    /**
     * ساعت شروع Dark Mode (عصر)
     * مقدار: 0-23
     */
    darkModeStartHour: 18,

    /**
     * به‌روزرسانی theme هر چند دقیقه یکبار؟
     * مقدار به میلی‌ثانیه
     */
    updateInterval: 60 * 1000, // 1 دقیقه

    /**
     * آیا transition animation فعال باشه؟
     */
    enableTransitions: true,

    /**
     * مدت زمان transition (milliseconds)
     */
    transitionDuration: 300,
};

/**
 * تابع کمکی برای گرفتن theme بر اساس ساعت
 * می‌تونید logic سفارشی خودتون رو بذارید
 */
export const getThemeByHour = (hour: number): "light" | "dark" => {
    const { lightModeStartHour, darkModeStartHour } = THEME_CONFIG;

    // اگر ساعت بین lightModeStart تا darkModeStart باشه -> Light
    if (hour >= lightModeStartHour && hour < darkModeStartHour) {
        return "light";
    }

    // در غیر این صورت -> Dark
    return "dark";
};

/**
 * Layout Configuration
 */
export const LAYOUT_CONFIG = {
    /**
     * Advertisement section width (درصد)
     */
    advertisementWidth: 55,

    /**
     * Clock section width (درصد)
     */
    clockWidth: 45,

    /**
     * Gap بین دو section (px)
     */
    sectionGap: 12,

    /**
     * Padding صفحه اصلی (px)
     */
    screenPadding: 24,

    /**
     * Border radius برای cards (px)
     */
    borderRadius: 16,
};
