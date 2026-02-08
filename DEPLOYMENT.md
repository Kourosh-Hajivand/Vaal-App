# 🚀 راهنمای استقرار Vaal

## 📱 App Features

### ✨ ویژگی‌های اصلی:

- ✅ **Offline-First Architecture** - کار می‌کنه حتی بدون اینترنت
- ✅ **Progressive Loading** - بلافاصله اولین ویدیو رو پخش می‌کنه
- ✅ **Smart Caching** - فایل‌ها روی filesystem ذخیره میشن
- ✅ **Auto-Retry** - download failures هر 10s retry میشن (تا 5 بار)
- ✅ **Sensor Integration** - رادار سنسور با auto-detection
- ✅ **Auto-Play Mode** - اگر سنسور نباشه، بدون توقف پخش می‌کنه
- ✅ **Real-time Updates** - manifest هر 10s update میشه
- ✅ **Duration Control** - از API duration استفاده می‌کنه (نه کل ویدیو)

---

## 🏗️ Architecture

```
src/
├── services/          # API calls با axios
│   ├── device.service.ts
│   ├── announcement.service.ts
│   ├── content.service.ts
│   └── playlist.service.ts
├── hooks/             # React Query hooks
│   ├── device/
│   ├── announcement/
│   ├── advertisement/
│   └── use-device-token.ts
├── routes/            # API endpoints
│   └── routes.ts
├── types/             # TypeScript types
│   └── api.types.ts
├── utils/
│   ├── cache/         # Cache manager (RNFS)
│   ├── storage/       # AsyncStorage helpers
│   └── axios-instance.ts
└── components/
    ├── advertisement/ # Video player با caching
    └── clock/         # Clock + weather + announcements
```

---

## 🔑 Flow Diagram

```
App Start
    ↓
Check Token?
    ├─ ❌ No  → OfflineScreen (Registration)
    └─ ✅ Yes → Check Network?
                 ├─ ❌ Offline → Home با Cache 📦
                 └─ ✅ Online  → Validate Token?
                                  ├─ ✅ Valid   → Home 🌐
                                  ├─ ❌ 401     → OfflineScreen
                                  └─ ⚠️ Network → Home با Cache 📦
```

---

## 💾 Cache Strategy

### Updated_at Comparison:

```typescript
if (cached.updated_at === new.updated_at) {
    return cached; // ✅ Use cache
} else {
    download(new); // 📥 Re-download
}
```

### Scenarios:

**1. تعداد ویدیوها کم شد (15 → 5):**

```
✅ 5 ویدیو از cache استفاده میشه
✅ 10 ویدیوی دیگه ignore میشن (نه delete)
```

**2. Duration عوض شد:**

```
✅ فایل ویدیو: از cache
✅ Duration: از manifest جدید
```

**3. ویدیو update شد:**

```
📦 Cached: updated_at = "2024-01-01"
🔄 New:    updated_at = "2024-02-01" ← تغییر کرده
✅ Result: دوباره دانلود میشه
```

---

## ⏰ Timing

| عملیات                | فاصله زمانی                    |
| --------------------- | ------------------------------ |
| Manifest refetch      | هر 10 ثانیه                    |
| Failed download retry | هر 10 ثانیه (تا 5 بار)         |
| Sensor reconnect      | هر 30 ثانیه                    |
| Sensor watchdog       | اگر 10s data نیومد → reconnect |

---

## 🎯 Sensor Logic

```
Sensor Connect Attempt
    ↓
Success?
├─ ✅ Yes → Wait for Data (3s timeout)
│            ├─ Data received? → Connected ✅
│            └─ No data? → Not Connected ❌
└─ ❌ No  → Not Connected ❌

Every 30s:
    if (!connected) → Retry connect
    if (connected && no_data_for_10s) → Reconnect
```

---

## 🐛 Debug Overlay (فقط در Debug Build)

```
📹 اسنپ (1/4)
⏱️ Duration: 5s
⏳ Remaining: 3.7s ← countdown زنده
📼 Video: 1.3s
▶️ PLAYING
────────────────
🟢 Online (wifi) ← وضعیت اینترنت
────────────────
🎯 Sensor: ❌ Not Connected
🎬 Auto-Play Mode
────────────────
📦 Ready: 2/4
⬇️ Downloading...
```

---

## 📦 Build Commands

```bash
# Development (با debug overlay)
npm run build:debug

# Production (بدون debug)
npm run build:release

# Run on device
npm run android
```

---

## ⚠️ نکات مهم

### 1. Token Priority:

- اگر token داری → همیشه Home (حتی offline)
- فقط 401 باعث logout میشه

### 2. Cache Location:

```
RNFS.DocumentDirectoryPath/media-cache/
├── videos/
│   ├── video1_timestamp.MOV
│   └── video2_timestamp.MP4
└── images/
    └── image1_timestamp.jpg
```

### 3. No Re-download:

- فایل‌های cached با همون `updated_at` هیچ وقت دوباره دانلود نمیشن
- فقط ویدیوهای جدید یا update شده

### 4. Auto-Play:

- اگر سنسور نباشه: همیشه پخش
- اگر سنسور باشه: فقط با presence

---

## 🔧 Environment Variables

```bash
# .env یا app.json
EXPO_PUBLIC_API_URL=https://api-vaal.pixlink.ir
```

---

## 🎨 Branding

- **App Name:** Vaal
- **Package:** com.anonymous.SensorMonitor
- **Splash:** Logo نارنجی روی پس‌زمینه #FF6F3C
- **Icon:** Logo.png

---

تمام! 🎉
