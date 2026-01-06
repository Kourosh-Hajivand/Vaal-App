import * as Device from "expo-device";
import Constants from "expo-constants";
import * as SecureStore from "expo-secure-store";

const DEVICE_ID_KEY = "device_unique_id";

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
    return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
    });
}

/**
 * Get Android Device Serial Number
 * یک UUID یکتا و ثابت برای هر دستگاه که در SecureStore ذخیره میشه
 * این ID حتی بعد از uninstall هم می‌مونه (با backup rules درست)
 * و همیشه یکسان می‌مونه برای شناسایی دستگاه در دیتابیس
 */
export async function getAndroidId(): Promise<string> {
    try {
        // اول چک کن که آیا device ID قبلاً در SecureStore ذخیره شده یا نه
        // SecureStore حتی بعد از uninstall هم می‌مونه (اگر backup rules درست باشه)
        let storedDeviceId: string | null = null;

        try {
            storedDeviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
        } catch (secureStoreError) {
            // اگر SecureStore کار نکرد، از AsyncStorage استفاده کن
            const { storage } = await import("@/src/utils/storage");
            storedDeviceId = await storage.get(DEVICE_ID_KEY);
        }

        // چک کن که آیا device ID ذخیره شده معتبر هست (باید UUID format باشه)
        // اگر format قدیمی بود (مثل google_sdk_...)، یک UUID جدید بساز
        if (storedDeviceId && storedDeviceId.trim() !== "") {
            const trimmedId = storedDeviceId.trim();
            const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(trimmedId);

            if (isValidUUID) {
                return trimmedId;
            }
            // اگر format قدیمی بود، storage رو پاک کن تا UUID جدید ساخته بشه
            try {
                await SecureStore.deleteItemAsync(DEVICE_ID_KEY);
            } catch {
                try {
                    const { storage } = await import("@/src/utils/storage");
                    await storage.remove(DEVICE_ID_KEY);
                } catch {
                    // ignore
                }
            }
        }

        // اگر ذخیره نشده بود یا format قدیمی داشت، یک UUID یکتا بساز
        // این UUID یکبار ساخته میشه و همیشه همون می‌مونه
        const deviceId = generateUUID();

        // ذخیره device ID در SecureStore (که حتی بعد از uninstall هم می‌مونه)
        try {
            await SecureStore.setItemAsync(DEVICE_ID_KEY, deviceId);
        } catch (secureStoreError) {
            // اگر SecureStore کار نکرد، از AsyncStorage استفاده کن
            const { storage } = await import("@/src/utils/storage");
            await storage.save(DEVICE_ID_KEY, deviceId);
        }

        return deviceId;
    } catch (error) {
        try {
            let storedDeviceId: string | null = null;
            try {
                storedDeviceId = await SecureStore.getItemAsync(DEVICE_ID_KEY);
            } catch {
                const { storage } = await import("@/src/utils/storage");
                storedDeviceId = await storage.get(DEVICE_ID_KEY);
            }

            if (storedDeviceId && storedDeviceId.trim() !== "") {
                return storedDeviceId;
            }
        } catch (storageError) {
            // ignore
        }

        return generateUUID();
    }
}
