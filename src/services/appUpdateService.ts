/**
 * App Update Service
 * مکانیزم self-update برای APK (تغییرات native)
 *
 * فلو:
 * 1. چک ورژن فعلی با سرور
 * 2. اگه ورژن جدید بود، APK رو دانلود کن
 * 3. Intent بفرست برای نصب
 *
 * ⚠️ نیازمندی بکند:
 * GET /api/devices/app-version
 * Response: { version: "1.0.1", download_url: "https://..../app-release.apk", force_update: boolean }
 */
import { axiosInstance } from "@/src/utils/axios-instance";
import { routes } from "@/src/routes/routes";
import Constants from "expo-constants";
import RNFS from "react-native-fs";
import { Linking, Platform } from "react-native";

/** شکل response از سرور */
export interface AppVersionResponse {
    /** ورژن جدید — مثل "1.0.1" */
    version: string;
    /** لینک دانلود APK */
    download_url: string;
    /** آیا آپدیت اجباریه؟ */
    force_update: boolean;
    /** توضیحات آپدیت (اختیاری) */
    release_notes?: string;
}

/** مسیر ذخیره APK */
const APK_DOWNLOAD_PATH = `${RNFS.DocumentDirectoryPath}/app-update.apk`;

export const appUpdateService = {
    /**
     * دریافت آخرین ورژن از سرور
     */
    checkVersion: async (): Promise<AppVersionResponse | null> => {
        try {
            const response = await axiosInstance.get<AppVersionResponse>(
                routes.devices.checkAppVersion()
            );
            return response.data;
        } catch (error: any) {
            console.error("[AppUpdate] ❌ Failed to check version:", error?.message);
            return null;
        }
    },

    /**
     * آیا آپدیت جدید موجوده؟
     */
    isUpdateAvailable: async (): Promise<{
        available: boolean;
        serverVersion: string | null;
        currentVersion: string;
        data: AppVersionResponse | null;
    }> => {
        const currentVersion = Constants.expoConfig?.version || "1.0.0";
        const serverData = await appUpdateService.checkVersion();

        if (!serverData) {
            return { available: false, serverVersion: null, currentVersion, data: null };
        }

        const isNewer = appUpdateService.compareVersions(
            serverData.version,
            currentVersion
        );

        return {
            available: isNewer,
            serverVersion: serverData.version,
            currentVersion,
            data: serverData,
        };
    },

    /**
     * دانلود APK از سرور
     * @returns مسیر فایل دانلود شده
     */
    downloadApk: async (
        downloadUrl: string,
        onProgress?: (progress: number) => void
    ): Promise<string> => {
        console.log("[AppUpdate] 📥 Downloading APK from:", downloadUrl);

        // اول فایل قبلی رو پاک کن
        const exists = await RNFS.exists(APK_DOWNLOAD_PATH);
        if (exists) {
            await RNFS.unlink(APK_DOWNLOAD_PATH);
        }

        const result = await RNFS.downloadFile({
            fromUrl: downloadUrl,
            toFile: APK_DOWNLOAD_PATH,
            progress: (res) => {
                const percent = Math.round(
                    (res.bytesWritten / res.contentLength) * 100
                );
                console.log(`[AppUpdate] 📥 Download progress: ${percent}%`);
                onProgress?.(percent);
            },
            progressDivider: 5, // هر 5% یکبار progress بده
        }).promise;

        if (result.statusCode === 200) {
            console.log("[AppUpdate] ✅ APK downloaded successfully");
            return APK_DOWNLOAD_PATH;
        } else {
            throw new Error(`Download failed with status: ${result.statusCode}`);
        }
    },

    /**
     * نصب APK دانلود شده
     * ⚠️ روی دستگاه‌های عادی، دیالوگ نصب نمایش داده میشه
     * برای نصب بدون تعامل، نیاز به Device Owner Mode یا Root هست
     */
    installApk: async (filePath: string): Promise<void> => {
        if (Platform.OS !== "android") {
            console.warn("[AppUpdate] ⚠️ APK install only works on Android");
            return;
        }

        try {
            // باز کردن APK با intent
            const contentUri = `content://com.anonymous.SensorMonitor.fileprovider/app-updates/app-update.apk`;
            await Linking.openURL(contentUri);
        } catch (error: any) {
            console.error("[AppUpdate] ❌ Failed to install APK:", error?.message);

            // fallback: از file:// استفاده کن
            try {
                await Linking.openURL(`file://${filePath}`);
            } catch (fallbackError: any) {
                console.error(
                    "[AppUpdate] ❌ Fallback install failed:",
                    fallbackError?.message
                );
            }
        }
    },

    /**
     * مقایسه دو ورژن — آیا v1 از v2 بزرگتره؟
     * مثال: compareVersions("1.0.1", "1.0.0") → true
     */
    compareVersions: (v1: string, v2: string): boolean => {
        const parts1 = v1.split(".").map(Number);
        const parts2 = v2.split(".").map(Number);
        const len = Math.max(parts1.length, parts2.length);

        for (let i = 0; i < len; i++) {
            const a = parts1[i] || 0;
            const b = parts2[i] || 0;
            if (a > b) return true;
            if (a < b) return false;
        }
        return false;
    },
};
