/**
 * Central Asset Index
 * همه asset ها اینجا require می‌شن تا مطمئن بشیم در production bundle می‌شن
 * 
 * ⚠️ IMPORTANT: این فایل باید در App.js یا یک فایل اصلی import بشه
 * تا Metro bundler بتونه همه asset ها رو bundle کنه
 */

// Import کردن این فایل در App.js برای اطمینان از bundle شدن
// این یک side effect import هست که فقط برای bundle کردن asset ها استفاده میشه
if (__DEV__) {
    console.log('[Assets] Asset index loaded - ensuring all assets are bundled');
}

// Weather Icons
export const weatherIcons = {
    // Dark theme
    clear_dark: require("../../assets/weather/clear_dark.png"),
    "partly-cloudy_dark": require("../../assets/weather/partly_cloudy_dark.png"),
    cloudy_dark: require("../../assets/weather/cloudy_dark.png"),
    fog_dark: require("../../assets/weather/fog_dark.png"),
    drizzle_dark: require("../../assets/weather/drizzle_dark.png"),
    rain_dark: require("../../assets/weather/rain_dark.png"),
    snow_dark: require("../../assets/weather/snow_dark.png"),
    thunderstorm_dark: require("../../assets/weather/thunderstorm_dark.png"),
    unknown_dark: require("../../assets/weather/unknown_dark.png"),

    // Light theme
    clear_light: require("../../assets/weather/clear_light.png"),
    "partly-cloudy_light": require("../../assets/weather/partly_cloudy_light.png"),
    cloudy_light: require("../../assets/weather/cloudy_light.png"),
    fog_light: require("../../assets/weather/fog_light.png"),
    drizzle_light: require("../../assets/weather/drizzle_light.png"),
    rain_light: require("../../assets/weather/rain_light.png"),
    snow_light: require("../../assets/weather/snow_light.png"),
    thunderstorm_light: require("../../assets/weather/thunderstorm_light.png"),
    unknown_light: require("../../assets/weather/unknown_light.png"),
};

// Other Assets
export const images = {
    offlinePage: require("../../assets/OfflinePage.png"),
    fallbackAdvertisement: require("../../assets/images/fallback-advertisement.png"),
};
