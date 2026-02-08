# 📱 راهنمای Build و نصب Vaal

## 🚀 روش‌های Build

### 1️⃣ Development Build (برای تست سریع)

```bash
# Build APK (Debug)
npm run build:debug

# مسیر APK:
# android/app/build/outputs/apk/debug/app-debug.apk
```

### 2️⃣ Production Build (برای استقرار نهایی)

```bash
# Build APK (Release)
npm run build:release

# مسیر APK:
# android/app/build/outputs/apk/release/app-release.apk
```

### 3️⃣ نصب مستقیم روی دستگاه

```bash
# اتصال دستگاه با USB و فعال کردن USB Debugging
npm run android
```

---

## 📦 نصب APK روی مانیتور

### گزینه A: USB (سریع‌ترین)
```bash
# نصب با ADB
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

### گزینه B: فلش USB
1. فایل `app-debug.apk` رو کپی کن روی فلش
2. فلش رو به مانیتور وصل کن
3. با File Manager باز کن و نصب کن

### گزینه C: آپلود به سرور
1. APK رو آپلود کن به یه سرور
2. روی مانیتور با Browser دانلود کن
3. نصب کن

---

## ⚙️ تنظیمات لازم روی مانیتور

### 1. فعال کردن نصب از منابع نامشخص:
```
Settings → Security → Install from Unknown Sources → Enable
```

### 2. دسترسی‌های لازم:
- 🌐 Internet (برای fetch کردن manifest)
- 📁 Storage (برای cache کردن ویدیوها)
- 🔌 Serial Port (برای سنسور رادار)

---

## 🔧 Build Settings

### تغییر Package Name:
```json
// app.json
"android": {
  "package": "com.vaal.monitor"  ← تغییر بده
}
```

### تغییر Version:
```json
// app.json
"version": "1.0.1"
```

---

## 🐛 Troubleshooting

### Build Error:
```bash
# پاک کردن cache
cd android && ./gradlew clean && cd ..
npm run build:debug
```

### اگر Gradle خطا داد:
```bash
# Update Gradle wrapper
cd android && ./gradlew wrapper --gradle-version 8.14.3
```

---

## 📊 بررسی Build

```bash
# چک کردن APK info
aapt dump badging android/app/build/outputs/apk/debug/app-debug.apk | grep -E "package|version|sdkVersion"
```

---

## 🎯 بعد از نصب

1. باز کردن app
2. چک کردن debug overlay (فقط در debug build):
   - ⏳ Timer countdown
   - 🟢/🔴 Online/Offline status
   - 🎯 Sensor status
   - 📦 Cache progress

3. تست سناریوها:
   - ✅ بدون اینترنت (باید از cache استفاده کنه)
   - ✅ با اینترنت (باید manifest update بشه)
   - ✅ بدون سنسور (باید auto-play mode باشه)
   - ✅ با سنسور (باید presence control داشته باشه)
