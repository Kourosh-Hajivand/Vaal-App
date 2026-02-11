/**
 * Weather types — OpenWeather 5-day + UI
 * https://openweathermap.org/forecast5
 */

/** آیتم یک بازهٔ ۳ ساعته در پاسخ OpenWeather */
export interface OpenWeatherForecastItem {
    dt: number;
    main: { temp: number; temp_min: number; temp_max: number };
    weather: Array<{ id: number; main: string; description: string; icon: string }>;
    dt_txt: string;
}

export interface OpenWeatherForecastResponse {
    cod: string;
    list: OpenWeatherForecastItem[];
    city?: { name: string; country: string };
}

/** یک روز پیش‌بینی برای استفاده در UI */
export interface DayForecast {
    date: string; // YYYY-MM-DD
    label: string; // مثلاً «امروز»، «فردا»، یا نام روز
    weathercode: number; // WMO-compatible برای آیکون (از OpenWeather map شده)
    tempMax: number;
    tempMin: number;
}

/** دستهٔ وضعیت هوا برای انتخاب آیکون */
export type WeatherCodeCategory =
    | "clear"
    | "partly-cloudy"
    | "cloudy"
    | "fog"
    | "drizzle"
    | "rain"
    | "snow"
    | "thunderstorm"
    | "unknown";
