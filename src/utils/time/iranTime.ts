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
