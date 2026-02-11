/**
 * مثال: چطور ۶۵ آیکون رو require کنی و خودکار mapping بشه
 * 
 * ۱. همه آیکون‌هایت رو در assets/weather بذار
 * ۲. این فایل رو کپی کن به weatherIcons.ts
 * ۳. همه require ها رو اضافه کن (مثلاً icon1.png تا icon65.png)
 * ۴. buildIconMapping خودکار تشخیص می‌ده کدوم برای کدوم حالت
 */

import { buildIconMapping } from "./weatherIconMapping";

// همه آیکون‌ها رو require کن (مثال با ۶۵ آیکون):
const allIcons = {
    // آیکون ۱ تا ۶۵ — نام فایل‌ها رو بر اساس محتواشون بذار
    // سیستم خودکار بر اساس نام فایل تشخیص می‌ده:
    // - اگر نام شامل "sun", "clear", "آفتابی" باشه → clear
    // - اگر شامل "rain", "باران" باشه → rain
    // - اگر شامل "cloud", "ابری" باشه → cloudy
    // - و غیره...
    
    // مثال (نام فایل‌های واقعی خودت رو بذار):
    "icon1.png": require('../../assets/weather/icon1.png'),
    "icon2.png": require('../../assets/weather/icon2.png'),
    "icon3.png": require('../../assets/weather/icon3.png'),
    // ... تا icon65.png
    
    // یا اگر نام‌های معنادار داری:
    "sunny-day.png": require('../../assets/weather/sunny-day.png'),
    "rainy.png": require('../../assets/weather/rainy.png'),
    "cloudy-sky.png": require('../../assets/weather/cloudy-sky.png'),
    // ...
};

// خودکار mapping می‌شه:
export const weatherIconSources = buildIconMapping(allIcons);
