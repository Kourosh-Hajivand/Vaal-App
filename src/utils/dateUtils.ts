/**
 * Date utilities for Persian calendar and Iran timezone
 */

const persianMonths = [
    "فروردین",
    "اردیبهشت",
    "خرداد",
    "تیر",
    "مرداد",
    "شهریور",
    "مهر",
    "آبان",
    "آذر",
    "دی",
    "بهمن",
    "اسفند",
];

const persianWeekdays = ["یکشنبه", "دوشنبه", "سه‌شنبه", "چهارشنبه", "پنج‌شنبه", "جمعه", "شنبه"];

/**
 * Convert Gregorian date to Persian date (Jalali)
 */
function gregorianToJalali(gy: number, gm: number, gd: number): [number, number, number] {
    let jy, jm, jd, days;
    const g_d_m = [0, 31, 59, 90, 120, 151, 181, 212, 243, 273, 304, 334];
    
    if (gy > 1600) {
        jy = 979;
        gy -= 1600;
    } else {
        jy = 0;
        gy -= 621;
    }
    
    const gy2 = gm > 2 ? gy + 1 : gy;
    days = 365 * gy + Math.floor((gy2 + 3) / 4) - Math.floor((gy2 + 99) / 100) + Math.floor((gy2 + 399) / 400) - 80 + gd + g_d_m[gm - 1];
    jy += 33 * Math.floor(days / 12053);
    days %= 12053;
    jy += 4 * Math.floor(days / 1461);
    days %= 1461;
    
    if (days > 365) {
        jy += Math.floor((days - 1) / 365);
        days = (days - 1) % 365;
    }
    
    if (days < 186) {
        jm = 1 + Math.floor(days / 31);
        jd = 1 + (days % 31);
    } else {
        jm = 7 + Math.floor((days - 186) / 30);
        jd = 1 + ((days - 186) % 30);
    }
    
    return [jy, jm, jd];
}

/**
 * Get Iran timezone date (UTC+3:30)
 */
function getIranDate(date: Date): Date {
    // Iran timezone is UTC+3:30
    const iranOffset = 3.5 * 60; // 3 hours 30 minutes in minutes
    const utc = date.getTime() + date.getTimezoneOffset() * 60000;
    return new Date(utc + iranOffset * 60000);
}

/**
 * Format time in Iran timezone as HH:MM AM/PM
 */
export function formatIranTime(date: Date): string {
    const iranDate = getIranDate(date);
    let hours = iranDate.getHours();
    const minutes = iranDate.getMinutes();
    const ampm = hours >= 12 ? "PM" : "AM";
    
    hours = hours % 12;
    hours = hours ? hours : 12; // 0 should be 12
    
    const hoursStr = hours.toString().padStart(2, "0");
    const minutesStr = minutes.toString().padStart(2, "0");
    
    return `${hoursStr}:${minutesStr} ${ampm}`;
}

/**
 * Format Persian date as "شنبه 15 آذر"
 */
export function formatPersianDate(date: Date): string {
    const iranDate = getIranDate(date);
    const [jy, jm, jd] = gregorianToJalali(
        iranDate.getFullYear(),
        iranDate.getMonth() + 1,
        iranDate.getDate()
    );
    
    // Get weekday (0 = Sunday, 6 = Saturday)
    const weekday = iranDate.getDay();
    const weekdayName = persianWeekdays[weekday];
    const monthName = persianMonths[jm - 1];
    
    return `${weekdayName} ${jd} ${monthName}`;
}

