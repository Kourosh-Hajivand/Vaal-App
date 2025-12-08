# فونت‌های سفارشی

این پوشه برای قرار دادن فایل‌های فونت سفارشی شماست.

## نحوه استفاده:

### 1. قرار دادن فایل‌های فونت
فایل‌های فونت خود را (`.ttf` یا `.otf`) در این پوشه قرار دهید.

مثال:
```
assets/fonts/
  ├── Vazir-Regular.ttf
  ├── Vazir-Bold.ttf
  ├── Vazir-Medium.ttf
  └── ...
```

### 2. ثبت فونت‌ها در `utils/fonts.ts`
فایل `utils/fonts.ts` را باز کنید و فونت‌های خود را اضافه کنید:

```typescript
export const useFonts = () => {
    const [fontsLoaded, fontError] = useExpoFonts({
        "Vazir": require("../assets/fonts/Vazir-Regular.ttf"),
        "Vazir-Bold": require("../assets/fonts/Vazir-Bold.ttf"),
        "Vazir-Medium": require("../assets/fonts/Vazir-Medium.ttf"),
    });

    return { fontsLoaded, fontError };
};
```

### 3. اضافه کردن به Tailwind (اختیاری)
اگر می‌خواهید از فونت‌ها در NativeWind استفاده کنید، `tailwind.config.js` را به‌روزرسانی کنید:

```javascript
theme: {
    extend: {
        fontFamily: {
            sans: ["Vazir", "system-ui"],
            bold: ["Vazir-Bold", "system-ui"],
            medium: ["Vazir-Medium", "system-ui"],
        },
    },
},
```

### 4. استفاده در کامپوننت‌ها

**با NativeWind:**
```tsx
<Text className="font-sans">متن با فونت Vazir</Text>
<Text className="font-bold">متن با فونت Bold</Text>
```

**با StyleSheet:**
```tsx
<Text style={{ fontFamily: "Vazir" }}>متن با فونت Vazir</Text>
<Text style={{ fontFamily: "Vazir-Bold" }}>متن با فونت Bold</Text>
```

## نکات مهم:
- نام فونت باید با نامی که در `useFonts` استفاده می‌کنید یکسان باشد
- پس از اضافه کردن فونت جدید، سرور را restart کنید
- فونت‌ها به صورت خودکار در `_layout.tsx` لود می‌شوند

