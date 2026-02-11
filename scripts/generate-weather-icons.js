#!/usr/bin/env node
/**
 * اسکریپت برای generate کردن require ها برای ۶۵ آیکون
 * 
 * استفاده:
 *   1. همه آیکون‌ها رو در assets/weather بذار
 *   2. این اسکریپت رو اجرا کن: node scripts/generate-weather-icons.js
 *   3. خروجی رو در weatherIcons.ts کپی کن
 */

const fs = require('fs');
const path = require('path');

const WEATHER_DIR = path.join(__dirname, '../assets/weather');

// لیست فایل‌های موجود در پوشه weather
function getIconFiles() {
    if (!fs.existsSync(WEATHER_DIR)) {
        console.log('❌ پوشه assets/weather وجود ندارد');
        return [];
    }
    const files = fs.readdirSync(WEATHER_DIR)
        .filter(f => /\.(png|jpg|jpeg|svg|webp)$/i.test(f))
        .sort();
    return files;
}

// Generate require statements
function generateRequires(files) {
    const requires = files.map((file, index) => {
        const varName = `icon${index + 1}`;
        return `    "${file}": require('../../assets/weather/${file}'),`;
    }).join('\n');
    
    return `const allIcons = {\n${requires}\n};`;
}

// Main
const files = getIconFiles();
if (files.length === 0) {
    console.log('⚠️  هیچ فایل آیکونی پیدا نشد');
} else {
    console.log(`✅ ${files.length} آیکون پیدا شد:\n`);
    files.forEach((f, i) => console.log(`   ${i + 1}. ${f}`));
    console.log('\n📝 کد generate شده:\n');
    console.log(generateRequires(files));
    console.log('\n✅ export const weatherIconSources = buildIconMapping(allIcons);');
}
