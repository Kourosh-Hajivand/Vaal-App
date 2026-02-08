/**
 * Iran Time & Persian Calendar Utilities
 * تمام utility functions برای زمان ایران و تقویم فارسی
 */
import moment from 'moment-jalaali';
import 'moment-timezone';

// Configure moment-jalaali
moment.loadPersian({ usePersianDigits: false });

/**
 * دریافت زمان فعلی ایران (UTC+3:30)
 */
export const getIranTime = (): Date => {
    return moment().tz('Asia/Tehran').toDate();
};

/**
 * فرمت کردن زمان به فرمت HH:mm:ss
 */
export const formatIranTime = (date: Date): string => {
    return moment(date).tz('Asia/Tehran').format('HH:mm:ss');
};

/**
 * دریافت روز هفته فارسی
 */
export const getPersianDayOfWeek = (date: Date): string => {
    const days = ['یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'];
    return days[moment(date).day()];
};

/**
 * دریافت روز ماه فارسی (1-31)
 */
export const getPersianDayOfMonth = (date: Date): number => {
    return moment(date).jDate();
};

/**
 * دریافت نام ماه فارسی
 */
export const getPersianMonthName = (date: Date): string => {
    return moment(date).format('jMMMM');
};

/**
 * دریافت سال فارسی
 */
export const getPersianYear = (date: Date): number => {
    return moment(date).jYear();
};

/**
 * دریافت تاریخ کامل فارسی
 */
export const getPersianDate = (date: Date) => {
    const jDate = moment(date);
    return {
        day: jDate.jDate(),
        month: jDate.jMonth() + 1,
        year: jDate.jYear(),
        monthName: jDate.format('jMMMM'),
    };
};

/**
 * فرمت کردن تاریخ فارسی به صورت کامل
 * مثال: "پنجشنبه ۱۸ بهمن ۱۴۰۴"
 */
export const formatPersianDate = (date: Date): string => {
    const dayOfWeek = getPersianDayOfWeek(date);
    const day = getPersianDayOfMonth(date);
    const month = getPersianMonthName(date);
    const year = getPersianYear(date);
    
    return `${dayOfWeek} ${day} ${month} ${year}`;
};

/**
 * چک کردن روز بودن زمان (6 صبح تا 6 عصر)
 */
export const isDayTime = (date: Date): boolean => {
    const hour = moment(date).tz('Asia/Tehran').hour();
    return hour >= 6 && hour < 18;
};

/**
 * چک کردن شب بودن زمان (6 عصر تا 6 صبح)
 */
export const isNightTime = (date: Date): boolean => {
    return !isDayTime(date);
};

/**
 * تبدیل اعداد انگلیسی به فارسی
 */
const englishToPersian = (str: string): string => {
    const persianNumbers = ['۰', '۱', '۲', '۳', '۴', '۵', '۶', '۷', '۸', '۹'];
    const englishNumbers = ['0', '1', '2', '3', '4', '5', '6', '7', '8', '9'];
    let result = str;
    for (let i = 0; i < englishNumbers.length; i++) {
        result = result.replace(new RegExp(englishNumbers[i], 'g'), persianNumbers[i]);
    }
    return result;
};

/**
 * فرمت کردن تاریخ به صورت نسبی (مثل "5 دقیقه پیش")
 */
export const formatRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = getIranTime();
    const diffMs = now.getTime() - date.getTime();
    const diffSeconds = Math.floor(diffMs / 1000);
    const diffMinutes = Math.floor(diffSeconds / 60);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);
    const diffYears = Math.floor(diffDays / 365);

    if (diffSeconds < 60) {
        if (diffSeconds < 10) {
            return 'به تازگی';
        }
        const seconds = englishToPersian(diffSeconds.toString());
        return `${seconds} ثانیه پیش`;
    } else if (diffMinutes < 60) {
        const minutes = englishToPersian(diffMinutes.toString());
        return `${minutes} دقیقه پیش`;
    } else if (diffHours < 24) {
        const hours = englishToPersian(diffHours.toString());
        return `${hours} ساعت پیش`;
    } else if (diffDays < 7) {
        const days = englishToPersian(diffDays.toString());
        return `${days} روز پیش`;
    } else if (diffWeeks < 4) {
        const weeks = englishToPersian(diffWeeks.toString());
        return `${weeks} هفته پیش`;
    } else if (diffMonths < 12) {
        const months = englishToPersian(diffMonths.toString());
        return `${months} ماه پیش`;
    } else {
        const years = englishToPersian(diffYears.toString());
        return `${years} سال پیش`;
    }
};

/**
 * فرمت تاریخ کوتاه شمسی (مثل "9 آبان")
 */
export const formatPersianDateShort = (dateString: string): string => {
    const date = new Date(dateString);
    const jDate = moment(date);
    const day = jDate.jDate();
    const monthName = jDate.format('jMMMM');
    
    return `${day} ${monthName}`;
};
