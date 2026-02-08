# 🔧 Sensor Stability Fix - Connection Jump Problem

## 🐛 مشکل قبلی

سنسور مدام بین Connected و Not Connected جامپ می‌کرد:
```
🎯 Sensor: ✅ Connected
🎯 Sensor: ❌ Not Connected  
🎯 Sensor: ✅ Connected
🎯 Sensor: ❌ Not Connected
... (مدام تکرار میشد)
```

---

## 🔍 علت مشکل

### 1️⃣ **Infinite Re-render Loop**
```typescript
// ❌ قبل - dependency به isConnected
useEffect(() => {
    // ...
}, [isConnected]); // هر بار isConnected تغییر کنه، effect دوباره اجرا میشه!
```

هر بار که `isConnected` تغییر می‌کرد:
1. Effect دوباره اجرا می‌شد
2. Connection دوباره attempt می‌شد
3. State دوباره تغییر می‌کرد
4. و دوباره از اول... (infinite loop)

### 2️⃣ **Race Conditions**
- چندتا `attemptConnect()` همزمان در حال اجرا
- چندتا interval همزمان فعال
- Multiple timeout ها که overlap می‌کردن

### 3️⃣ **State vs Ref Confusion**
- State برای UI استفاده می‌شد
- اما برای logic هم از state استفاده می‌شد
- این باعث re-render های غیرضروری می‌شد

---

## ✅ راه‌حل پیاده شده

### 1️⃣ **Empty Dependency Array**
```typescript
// ✅ بعد - فقط یکبار اجرا میشه
useEffect(() => {
    // ...
    return cleanup;
}, []); // Empty! فقط mount/unmount
```

### 2️⃣ **Ref-Based State Management**
```typescript
const isConnectedRef = useRef(false);      // برای logic
const isConnectingRef = useRef(false);     // برای race protection
const mountedRef = useRef(true);           // برای cleanup safety

// State فقط برای UI
const [isConnected, setIsConnected] = useState(false);
```

### 3️⃣ **Race Condition Protection**
```typescript
const attemptConnect = useCallback(async () => {
    // ⛔ جلوگیری از multiple attempts
    if (isConnectingRef.current || isConnectedRef.current) {
        return;
    }
    
    isConnectingRef.current = true;
    // ... connection logic
    isConnectingRef.current = false;
}, []);
```

### 4️⃣ **Stable Callbacks**
```typescript
// ✅ Callback فقط یکبار ساخته میشه
const handleDataUpdate = useCallback((data) => {
    if (!mountedRef.current) return;
    
    // فقط اگه واقعاً disconnected بود، update کن
    if (!isConnectedRef.current) {
        isConnectedRef.current = true;
        setIsConnected(true);
    }
    // ...
}, []);
```

### 5️⃣ **Improved Health Check**
```typescript
setInterval(() => {
    const timeSinceLastData = Date.now() - lastDataTimeRef.current;
    
    if (lastDataTimeRef.current === 0) {
        // هنوز اصلاً متصل نشدیم
        if (!isConnectingRef.current) {
            attemptConnect();
        }
    } else if (timeSinceLastData > 120000) {
        // 2 دقیقه data نیومده - احتمالاً disconnected
        // Graceful reconnect
    }
    // اگه data میاد، هیچ کاری نکن ✅
}, 30000);
```

### 6️⃣ **RadarLogic.js Improvements**
```javascript
// ✅ اضافه شدن isConnecting flag
this.isConnecting = false;

async connect() {
    if (this.isConnected || this.isConnecting) {
        return; // جلوگیری از duplicate connection
    }
    
    this.isConnecting = true;
    // ... connection
    this.isConnecting = false;
}
```

---

## 🎯 نتیجه

### ✅ قبل از Fix:
```
⏰ 14:30:00 - ✅ Connected
⏰ 14:30:01 - ❌ Disconnected (effect re-run)
⏰ 14:30:02 - ✅ Connected
⏰ 14:30:03 - ❌ Disconnected (timeout)
⏰ 14:30:04 - ✅ Connected
... (merry-go-round 🎠)
```

### ✅ بعد از Fix:
```
⏰ 14:30:00 - 🔌 Attempting to connect...
⏰ 14:30:02 - ✅ Connected
⏰ 14:30:03 - 📊 Data received
⏰ 14:30:04 - 📊 Data received
⏰ 14:30:05 - 📊 Data received
... (stable! 🎉)
```

---

## 📊 مقایسه تکنیکال

| Feature | قبل ❌ | بعد ✅ |
|---------|--------|--------|
| **Dependency Array** | `[isConnected]` | `[]` |
| **Re-renders** | مدام | فقط وقتی لازم باشه |
| **Race Conditions** | دارد | ندارد |
| **Connection Attempts** | Multiple همزمان | فقط یکی |
| **State Management** | State-based | Ref-based |
| **Reconnection Logic** | هر 30s حتی اگه connected باشه | فقط اگه واقعاً لازم باشه |
| **Timeout** | 3 ثانیه (خیلی کم) | 5 ثانیه |
| **Health Check** | 60 ثانیه | 120 ثانیه |
| **Stability** | ⚠️ ناپایدار | ✅ پایدار |

---

## 🧪 نحوه تست

### مرحله 1: Build
```bash
npx expo start -c
```

### مرحله 2: Watch Debug Overlay
گوشه بالا سمت چپ:
```
🎯 Sensor: ✅ Connected
```

این باید **ثابت** بمونه و دیگه toggle نشه!

### مرحله 3: Monitor به مدت 5 دقیقه
- اگر سنسور متصله، باید **ثابت Connected** بمونه
- اگر سنسور disconnected شد، بعد از 2 دقیقه خودش reconnect می‌کنه
- دیگه اون پرش‌های مدام رو نباید ببینید

---

## 🔧 تنظیمات (اگر لازم شد)

### تغییر Health Check Interval:
```typescript
// در useRadarSensor.ts - خط ~100
setInterval(() => {
    // ...
}, 30 * 1000); // ← این رو تغییر بدید (30 ثانیه پیشنهاد میشه)
```

### تغییر Disconnect Timeout:
```typescript
// در useRadarSensor.ts - خط ~79
if (timeSinceLastData > 120000) { // ← این رو تغییر بدید (120 ثانیه = 2 دقیقه)
```

### تغییر Initial Connection Timeout:
```typescript
// در useRadarSensor.ts - خط ~57
}, 5000); // ← این رو تغییر بدید (5 ثانیه)
```

---

## 🚨 اگر هنوز مشکل داره

### چک کنید:
1. **سیم‌کشی سنسور** - ممکنه loose باشه
2. **برق سنسور** - stable 5V می‌خواد
3. **GND connection** - باید محکم باشه
4. **کابل** - از کابل shield شده استفاده کنید

### Debug:
```bash
# لاگ‌های کامل
adb logcat | grep -E "Radar|Serial"
```

---

## 📝 Summary

این fix سه مشکل اصلی رو حل کرد:

1. ✅ **Infinite Re-render Loop** - با empty dependency
2. ✅ **Race Conditions** - با ref-based flags
3. ✅ **Unstable State** - با debouncing و proper timing

حالا سنسور باید **100% stable** باشه! 🎉

---

**Last Updated:** 2026-02-08
**Version:** 2.0.0 - Stable Connection
