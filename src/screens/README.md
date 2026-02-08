# Main Screen

صفحه اصلی با layout دو ستونه و قابلیت Dark/Light Mode خودکار

## ویژگی‌ها

### 1. Layout دو ستونه
- **Advertisement (55%)**: نمایش تبلیغات و ویدیوها
- **Clock (45%)**: نمایش ساعت، تاریخ، آب و هوا و اطلاعیه‌ها

### 2. Dark/Light Mode خودکار
- **Light Mode**: ساعت 06:00 صبح تا 18:00 عصر (بر اساس ساعت ایران)
- **Dark Mode**: ساعت 18:00 عصر تا 06:00 صبح

Theme بر اساس `ThemeContext` که هر 1 دقیقه چک می‌کنه و automatic تغییر می‌کنه.

### 3. Error Boundary
هر دو بخش (Advertisement و Clock) با ErrorBoundary محافظت شده‌اند:
- اگر یکی crash کرد، دیگری همچنان کار می‌کنه
- پیام خطای زیبا و فارسی
- رنگ‌ها بر اساس theme

### 4. بهینه‌سازی Performance
- استفاده از `StyleSheet` به جای inline styles
- `useMemo` و `useCallback` برای prevent unnecessary re-renders
- Theme colors به صورت Context برای جلوگیری از prop drilling

## ساختار فایل‌ها

```
src/
├── screens/
│   ├── MainScreen.tsx          # صفحه اصلی با layout
│   └── index.ts                # Exports
├── contexts/
│   ├── ThemeContext.tsx        # مدیریت dark/light theme
│   └── index.ts                # Exports
├── components/
│   ├── shared/
│   │   ├── ErrorBoundary.tsx  # Error handling
│   │   ├── CustomText.tsx     # با پشتیبانی theme
│   │   └── ThemedView.tsx     # با پشتیبانی theme
│   ├── advertisement/
│   │   └── Advertisement.tsx
│   └── clock/
│       └── Clock.tsx
```

## نحوه استفاده

### در `app/_layout.tsx`:

```tsx
import { ThemeProvider } from '@/src/contexts';

export default function RootLayout() {
    return (
        <ThemeProvider>
            {/* بقیه app */}
        </ThemeProvider>
    );
}
```

### در `app/(tabs)/index.tsx`:

```tsx
import { MainScreen } from '@/src/screens';

export default function HomeScreen() {
    return <MainScreen />;
}
```

## تنظیم ساعت‌های Dark/Light Mode

اگر می‌خواید ساعت‌ها رو تغییر بدید، فایل `src/contexts/ThemeContext.tsx` رو ببینید:

```tsx
// در حال حاضر:
// Light: 6 AM - 6 PM
// Dark: 6 PM - 6 AM

// تابع isDayTime() در src/utils/time/iranTime.ts
```

## Theme Colors

### Light Theme
- Background: `#FFFFFF`
- Text: `#000000`
- Border: `#DADADA`
- Card Background: `#FFFFFF`

### Dark Theme
- Background: `#1A1A1A`
- Text: `#FFFFFF`
- Border: `#333333`
- Card Background: `#2A2A2A`

## استفاده از Theme در کامپوننت‌ها

```tsx
import { useTheme } from '@/src/contexts/ThemeContext';

const MyComponent = () => {
    const { mode, colors } = useTheme();
    
    return (
        <View style={{ backgroundColor: colors.background }}>
            <Text style={{ color: colors.text }}>
                Current mode: {mode}
            </Text>
        </View>
    );
};
```

## Performance Tips

1. **StyleSheet**: همیشه از `StyleSheet.create()` استفاده کنید
2. **Memoization**: برای computed values از `useMemo` استفاده کنید
3. **Theme**: فقط `colors` که نیاز دارید رو destructure کنید
4. **Re-renders**: از `React.memo()` برای کامپوننت‌های سنگین استفاده کنید

## مشکلات رایج

### Theme تغییر نمی‌کنه؟
- چک کنید `ThemeProvider` در بالاترین سطح app باشه
- چک کنید `iranTime.ts` درست کار می‌کنه
- در __DEV__ mode، تغییرات هر 1 دقیقه اعمال میشه

### Error Boundary کار نمی‌کنه؟
- ErrorBoundary فقط errors در component tree رو می‌گیره
- Event handlers خودشون باید try-catch داشته باشند

## TODO (آینده)

- [ ] اضافه کردن transition animations برای تغییر theme
- [ ] پشتیبانی از manual theme toggle
- [ ] ذخیره user preference در AsyncStorage
- [ ] اضافه کردن smooth transitions بین dark/light
