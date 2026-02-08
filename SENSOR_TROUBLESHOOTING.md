# 🔧 راهنمای عیب‌یابی سنسور HLK-LD2410C

## 🐛 مشکل گزارش شده
**"سنسور وصل میشه بعدش دوباره یهو انگار قطع میشه و استیبل نیست"**

---

## ✅ تغییرات اعمال شده (Fixed Issues)

### 1️⃣ **Buffer Management**
- ✅ اضافه شدن **Buffer Overflow Protection** (Max 2KB)
- ✅ اضافه شدن **Loop Protection** (حداکثر 10 packet در هر iteration)
- ✅ Safe slicing برای جلوگیری از memory leak

### 2️⃣ **Error Handling**
- ✅ Try-Catch در تمام توابع parsing
- ✅ Validation برای packet size قبل از parse
- ✅ Safe array access با `||` operator
- ✅ Callback error handling برای جلوگیری از crash

### 3️⃣ **Watchdog Timer**
- ✅ تغییر timeout از **10 ثانیه** به **60 ثانیه**
- ✅ کمتر حساس شدن reconnection logic
- ✅ Reset کردن timer بعد از reconnect

### 4️⃣ **Statistics & Monitoring**
- ✅ اضافه شدن **Real-time Statistics**:
  - Total packets received
  - Config vs Data packets
  - Error count
  - Uptime & Last packet time
  - Reconnection count
  - Buffer overflows

---

## 🚀 مراحل تست و عیب‌یابی

### مرحله 1: Rebuild اپلیکیشن

```bash
# پاک کردن cache
npx expo start -c

# یا rebuild کامل (برای Android)
cd android && ./gradlew clean && cd ..
npm run android
```

### مرحله 2: باز کردن Test Screen

1. اپ رو باز کنید
2. روی **Clock** (سمت راست) **3 بار سریع** tap کنید
3. صفحه **"SENSOR DEBUG"** باز میشه

### مرحله 3: اجرای تست‌ها

#### تست کامل (Recommended):
```
🚀 Run All Tests
```

این دکمه همه تست‌ها رو به صورت خودکار اجرا می‌کنه.

#### تست‌های جداگانه:
```
1️⃣ Check API      → بررسی کتابخونه Serial Port
2️⃣ List Ports     → لیست پورت‌های موجود
3️⃣ Check File     → بررسی /dev/ttyS1
4️⃣ Direct Test    → تست مستقیم اتصال
5️⃣ Connect Radar  → اتصال با RadarLogic
```

### مرحله 4: مانیتور کردن Statistics

وقتی سنسور وصل شد، **Statistics Card** ظاهر میشه که شامل:

```
📊 STATISTICS
┌─────────────────────────────┐
│ Packets: 1234  Data: 1200  │
│ Config: 34     Errors: 0   │
│ Uptime: 120s   Last: 0s    │
│ Reconnects: 1  Buffer: 45B │
└─────────────────────────────┘
```

#### 🟢 **حالت سالم (Healthy):**
- `Packets` مداوم در حال افزایش
- `Errors` = 0 یا عدد کم
- `Last Packet` = 0s یا 1s-2s
- `Buffer` < 200 bytes

#### 🔴 **حالت مشکل‌دار (Problematic):**
- `Errors` مداوم افزایش می‌یابد → مشکل در parsing
- `Last Packet` > 10s → سنسور data نمی‌فرسته
- `Buffer` > 500 bytes → buffer overflow
- `Reconnects` زیاد → مشکل در کانکشن
- `Buffer Overflows` > 0 → مشکل شدید

---

## 🔍 عیب‌یابی مشکلات رایج

### ❌ مشکل: "Packets = 0, Last Packet = N/A"
**علت:** سنسور متصل نیست یا data نمی‌فرسته

**راه‌حل:**
1. سیم‌کشی رو چک کنید (TX → RX, RX → TX, GND → GND)
2. برق سنسور رو چک کنید (5V)
3. Baud Rate رو بررسی کنید (باید 115200 باشه)
4. سنسور رو restart کنید (power cycle)

---

### ⚠️ مشکل: "Errors مداوم افزایش می‌یابد"
**علت:** Packet corruption یا مشکل در parsing

**راه‌حل:**
1. کابل رو عوض کنید (کابل بلند یا بی‌کیفیت noise ایجاد می‌کنه)
2. Ground connection رو چک کنید
3. از کابل shield شده استفاده کنید
4. سنسور رو نزدیک‌تر به دستگاه ببرید

---

### 🔴 مشکل: "Buffer Overflows > 0"
**علت:** سنسور خیلی سریع data می‌فرسته و parsing نمی‌رسه

**راه‌حل:**
1. این مشکل الان **Fixed** شده (Buffer auto-cleanup)
2. اگه همچنان مشکل داره، `updateInterval` رو کم کنید:

```javascript
// در RadarLogic.js - خط 22
this.updateInterval = 50; // کمتر کنید به 30 یا 20
```

---

### 🟡 مشکل: "Reconnects زیاد (> 5)"
**علت:** Watchdog timer یا قطع شدن اتصال

**راه‌حل:**
1. الان timeout از 10s به **60s** تغییر کرده (باید بهتر بشه)
2. اگه همچنان reconnect میشه، لاگ‌ها رو چک کنید:

```bash
adb logcat | grep "Radar"
```

3. اگر میبینید `"No data for 60s"` اومده، یعنی سنسور واقعاً قطع شده

---

### 🔵 مشکل: "Last Packet > 10s"
**علت:** سنسور دیگه data نمی‌فرسته (ممکنه sleep رفته باشه)

**راه‌حل:**
1. دستگاه رو تکون بدید (presence sensor trigger بشه)
2. سنسور رو restart کنید
3. چک کنید End Config command درست فرستاده شده (`FE00`)

---

## 📱 لاگ‌های کامل

برای دیدن لاگ‌های دقیق:

```bash
# همه لاگ‌ها
adb logcat | grep -E "Radar|RadarLogic"

# فقط error ها
adb logcat *:E | grep "Radar"

# ذخیره در فایل
adb logcat | grep "Radar" > sensor_debug.log
```

---

## 🎯 تنظیمات پیشرفته

### تغییر Path سنسور:

اگر سنسور در path دیگری است (مثلاً `/dev/ttyUSB0`):

**در `src/hooks/advertisement/useRadarSensor.ts` خط 59:**
```typescript
await RadarLogic.connect('/dev/ttyUSB0', 115200);
```

**در `RadarLogic.js` خط 29:**
```javascript
async connect(path = '/dev/ttyUSB0', baudRate = 115200) {
```

---

### تغییر Baud Rate:

اگر سنسور با baud rate دیگری کار می‌کنه:

```typescript
await RadarLogic.connect('/dev/ttyS1', 9600); // یا 57600
```

---

### تغییر Watchdog Timeout:

اگر می‌خواید timeout رو تغییر بدید:

**در `src/hooks/advertisement/useRadarSensor.ts` خط 89:**
```typescript
if (timeSinceLastData > 120000) { // 120 ثانیه = 2 دقیقه
```

---

## 🧪 حالت Debug در Production

اگر می‌خواید Statistics رو در **Production** هم ببینید:

**در `src/components/advertisement/Advertisement.tsx` خط 397:**
```typescript
{/* Debug Overlay */}
{true && ( // از __DEV__ به true تغییر بدید
```

---

## 🆘 اگر هنوز کار نکرد

1. **Screenshot از Statistics Card** بگیرید
2. **لاگ‌های کامل** رو ذخیره کنید:
   ```bash
   adb logcat > full_sensor_log.txt
   ```
3. فایل‌های زیر رو بررسی کنید:
   - `RadarLogic.js`
   - `src/hooks/advertisement/useRadarSensor.ts`
   - `src/components/advertisement/Advertisement.tsx`

4. مشخصات دستگاه رو بگید:
   - نوع دستگاه (Tablet/Phone)
   - Android Version
   - نوع سنسور (HLK-LD2410C revision)

---

## 📊 Expected Behavior (رفتار صحیح)

### زمان اتصال موفق:
```
[Radar] 🔌 Attempting to connect...
[RadarLogic] Connecting to /dev/ttyS1 at 115200...
[RadarLogic] Port Opened. Initializing... (Reconnect #1)
[RadarLogic] CMD Sent: FF000100
[RadarLogic] CMD Sent: 6100
[RadarLogic] Config Read: MaxGate=8, Time=5s
[RadarLogic] CMD Sent: FE00
[Radar] ✅ Sensor connected! (data received)
```

### حین کار:
- هر ~50ms یک data packet دریافت میشه
- `Packets` و `Data` مداوم افزایش می‌یابند
- `Errors` = 0
- `Last Packet` = 0s یا 1s

---

## ✅ Checklist نهایی

- [ ] اپ رو rebuild کردید؟
- [ ] Test Screen رو باز کردید؟ (Triple tap on Clock)
- [ ] "Run All Tests" رو اجرا کردید؟
- [ ] Statistics رو بررسی کردید؟
- [ ] سیم‌کشی رو چک کردید؟
- [ ] لاگ‌ها رو بررسی کردید؟

---

**موفق باشید!** 🚀

اگر مشکل ادامه داشت، لاگ‌ها و statistics رو برام بفرستید تا دقیق‌تر بررسی کنم.
