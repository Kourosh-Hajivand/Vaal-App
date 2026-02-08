# 🏗️ معماری پروژه Vaal

## 📊 نمای کلی

این پروژه یک **Digital Signage System** با قابلیت **Offline-First** است که روی مانیتورهای Android اجرا میشه.

---

## 🎯 Core Concepts

### 1. **Offline-First Architecture**

```
Priority: Server Data > Cached Data > Nothing

Flow:
1. بلافاصله cached data نشون بده
2. در background fetch کن
3. fresh data رو جایگزین کن
4. cache رو update کن
```

### 2. **Progressive Loading**

```
اولین ویدیو ready شد → شروع پخش
ویدیوی دوم ready شد → اضافه کن به لیست
ویدیوی سوم ready شد → اضافه کن به لیست
...
```

### 3. **Smart Retry**

```
Failed Downloads: هر 10s × 5 بار
Sensor Connect: هر 30s × ∞
Manifest Update: هر 10s × ∞
```

---

## 📁 Structure

### Services Layer

```typescript
// HTTP calls فقط - بدون business logic
deviceService.getManifest() → axios.get(...)
```

### Hooks Layer

```typescript
// React Query + business logic
useDeviceManifest() {
    enabled: hasToken,           // شرط
    refetchInterval: 10000,      // timing
    placeholderData: cache,      // fallback
}
```

### Component Layer

```typescript
// UI + orchestration
<Advertisement>
    - useDeviceManifest()
    - useSensor()
    - useOnlineStatus()
    - Progressive download logic
</Advertisement>
```

---

## 🔄 Data Flow

```
┌─────────────┐
│   Server    │
│   Manifest  │
└──────┬──────┘
       │ fetch (every 10s)
       ↓
┌─────────────┐
│ React Query │ ← Cache در memory
│   Cache     │
└──────┬──────┘
       │ save
       ↓
┌─────────────┐
│ AsyncStorage│ ← Persist manifest
│  (Manifest) │
└─────────────┘

┌─────────────┐
│   Server    │
│   Videos    │
└──────┬──────┘
       │ download
       ↓
┌─────────────┐
│    RNFS     │ ← Persist files
│ (Filesystem)│
└─────────────┘
```

---

## ⚙️ Cache Strategy

### Metadata در AsyncStorage:

```json
{
    "https://...video1.mp4": {
        "localPath": "/path/to/video1.mp4",
        "updated_at": "2024-01-01T00:00:00Z",
        "size": 5242880,
        "verified": true
    }
}
```

### Decision Logic:

```typescript
needsUpdate(url, new_updated_at) {
    cached = metadata.get(url);

    if (!cached) return true;          // جدید است
    if (!cached.verified) return true; // فایل پاک شده
    if (cached.updated_at !== new_updated_at) return true; // update شده

    return false; // ✅ از cache استفاده کن
}
```

---

## 🎬 Video Playback

### Duration Priority:

```typescript
const duration =
    playlistItem.duration || // 1. از API (override)
    content.duration_sec || // 2. طول اصلی ویدیو
    10; // 3. default
```

### Timer Logic:

```typescript
// VideoPlayer.tsx
setTimeout(() => {
    onEnded(); // بعد از {duration} ثانیه → next
}, duration * 1000);
```

### Pause/Resume:

```typescript
// Advertisement.tsx
const shouldPlay = !sensorConnected || isPresence;

useEffect(() => {
    setIsPaused(!shouldPlay);
}, [shouldPlay]);
```

---

## 🎯 Sensor Integration

### Auto-Detection:

```
Try Connect → Wait 3s for data
    ↓
Data received?
    ├─ YES → ✅ Connected
    └─ NO  → ❌ Not Connected (Auto-Play Mode)
```

### Reconnect Logic:

```
Every 30s:
    if (!connected):
        retry connect

    if (connected && no_data_for_10s):
        disconnect → reconnect
```

---

## 🌐 Network Handling

### App.js (Screen Router):

```typescript
if (!token) {
    return <OfflineScreen />; // Registration
}

// Token داریم
if (offline) {
    return <HomeScreen />; // با cached data
}

// Online
validate_token()
    .then(() => <HomeScreen />) // Valid
    .catch(401 => <OfflineScreen />) // Invalid
    .catch(error => <HomeScreen />); // Network error → use cache
```

### React Query:

```typescript
networkMode: "offlineFirst",
placeholderData: cached,
refetchOnReconnect: true,
```

---

## 🐛 Debug Overlay

در `__DEV__` mode:

```
📹 Title (1/4)        ← Current item
⏱️ Duration: 5s       ← API duration
⏳ Remaining: 3.7s    ← Countdown
📼 Video: 1.3s        ← Video position
▶️ PLAYING            ← Play state
────────────────
🟢 Online (wifi)      ← Network
────────────────
🎯 Sensor: ❌         ← Sensor
🎬 Auto-Play Mode
────────────────
📦 Ready: 2/4         ← Cache progress
⬇️ Downloading...
```

---

## 🔐 Authentication Flow

```
App Start
    ↓
Token exists?
    ├─ NO  → OfflineScreen
    │         ↓
    │    Register Device
    │         ↓
    │    Get pair_code
    │         ↓
    │    Poll /activate (every 5s)
    │         ↓
    │    Get token → Home
    │
    └─ YES → Validate
              ├─ 401 → Remove token → OfflineScreen
              └─ OK  → Home
```

---

## 📊 Performance Optimizations

1. **Lazy Loading**: فقط ready items رو نشون میده
2. **Background Downloads**: کاربر منتظر نمیمونه
3. **Smart Caching**: هیچ فایلی دوباره دانلود نمیشه
4. **Minimal Re-renders**: useMemo, useCallback
5. **Native Splash**: سریع‌تر از JS splash

---

## 🎨 State Management

```
Global: React Query Cache
    ├─ Manifest (every 10s)
    ├─ Weather
    └─ Announcements

Local: Component State
    ├─ currentIndex
    ├─ isPaused
    ├─ localPaths (Map)
    └─ downloadStatus (Map)

Persistent: AsyncStorage + RNFS
    ├─ Token (SecureStore)
    ├─ Manifest (AsyncStorage)
    └─ Videos (RNFS.DocumentDirectory)
```

---

تمام! 🎉
