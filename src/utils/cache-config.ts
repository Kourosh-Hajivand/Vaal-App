/**
 * Helper functions برای مدیریت cache در حالت offline
 * وقتی offline هستیم، cache رو مادام‌العمر نگه می‌داریم
 *
 * React Native: از @react-native-community/netinfo استفاده می‌شود
 * این فایل فقط برای Web است و در RN همیشه online در نظر گرفته می‌شود
 */

/**
 * چک کردن وضعیت آنلاین/آفلاین
 * در React Native همیشه false برمی‌گرداند (مدیریت offline توسط NetInfo)
 */
const isClientOffline = (): boolean => {
    // React Native: navigator.onLine وجود ندارد، پس همیشه online فرض کن
    // مدیریت offline/online توسط @react-native-community/netinfo انجام می‌شود
    if (typeof window === "undefined") return false;
    if (typeof navigator === "undefined") return false;
    if (typeof navigator.onLine === "undefined") return false;
    return navigator.onLine === false;
};

/**
 * محاسبه gcTime بر اساس online/offline status
 * اگر offline هستیم، cache رو مادام‌العمر نگه دار
 * @param defaultGcTime - زمان پیش‌فرض برای online mode (میلی‌ثانیه)
 * @returns gcTime مناسب برای وضعیت فعلی
 */
export const getGcTime = (defaultGcTime: number = 24 * 60 * 60 * 1000): number => {
    if (isClientOffline()) {
        // اگر offline هستیم، cache رو مادام‌العمر نگه دار
        return Infinity;
    }
    // اگر online هستیم (یا در سرور هستیم)، از زمان پیش‌فرض استفاده کن
    return defaultGcTime;
};

/**
 * محاسبه staleTime بر اساس online/offline status
 * اگر offline هستیم، data رو همیشه fresh در نظر بگیر (از cache استفاده کن)
 * @param defaultStaleTime - زمان پیش‌فرض برای online mode (میلی‌ثانیه)
 * @returns staleTime مناسب برای وضعیت فعلی
 */
export const getStaleTime = (defaultStaleTime: number = 5 * 60 * 1000): number => {
    if (isClientOffline()) {
        // اگر offline هستیم، data رو همیشه fresh در نظر بگیر (از cache استفاده کن)
        return Infinity;
    }
    // اگر online هستیم (یا در سرور هستیم)، از زمان پیش‌فرض استفاده کن
    return defaultStaleTime;
};
