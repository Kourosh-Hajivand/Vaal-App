import * as Device from "expo-device";
import Constants from "expo-constants";
import { storage } from "@/src/utils/storage";

const DEVICE_ID_KEY = "device_unique_id";

/**
 * Get Android Device Serial Number
 * یک identifier یکتا و ثابت برای هر دستگاه که در storage ذخیره میشه
 * این ID همیشه یکسان می‌مونه و برای شناسایی دستگاه در دیتابیس استفاده میشه
 */
export async function getAndroidId(): Promise<string> {
    try {
        // اول چک کن که آیا device ID قبلاً ذخیره شده یا نه
        const storedDeviceId = await storage.get(DEVICE_ID_KEY);
        if (storedDeviceId && storedDeviceId.trim() !== "") {
            return storedDeviceId;
        }

        // اگر ذخیره نشده بود، یک ID یکتا بساز
        let deviceId: string | null = null;

        // فقط برای Android - چک کردن brand
        if (Device.brand === "Android") {
            // اول از osInternalBuildId استفاده کن (یکتا و ثابت برای هر دستگاه)
            if (Device.osInternalBuildId && Device.osInternalBuildId.trim() !== "") {
                deviceId = Device.osInternalBuildId;
            }
            // اگر osInternalBuildId موجود نبود، از osBuildId استفاده کن
            else if (Device.osBuildId && Device.osBuildId.trim() !== "") {
                deviceId = Device.osBuildId;
            }
            // اگر هیچکدوم موجود نبود، از installationId استفاده کن
            else if (Constants.installationId && Constants.installationId.trim() !== "") {
                deviceId = Constants.installationId;
            }
            // Fallback: ترکیب چند property برای ساخت یک unique ID
            else {
                const modelName = (Device.modelName || "unknown").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
                const osVersion = (Device.osVersion || "unknown").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
                const deviceName = (Device.deviceName || String(Device.deviceType || "device")).replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
                deviceId = `Android_${modelName}_${osVersion}_${deviceName}`;
            }
        } else {
            // اگر Android نبود، از installationId استفاده کن
            if (Constants.installationId && Constants.installationId.trim() !== "") {
                deviceId = Constants.installationId;
            } else {
                // Fallback: ترکیب property های عمومی
                const brand = Device.brand || "Device";
                const modelName = (Device.modelName || "unknown").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
                const osVersion = (Device.osVersion || "unknown").replace(/\s+/g, "_").replace(/[^a-zA-Z0-9_]/g, "");
                deviceId = `${brand}_${modelName}_${osVersion}`;
            }
        }

        // اطمینان از اینکه deviceId یکتا و معتبر هست
        if (!deviceId || deviceId.trim() === "" || deviceId === "Android_unknown_unknown_device") {
            // آخرین fallback: استفاده از installationId + random برای ساخت یک unique ID
            const random = Math.random().toString(36).substring(2, 15);
            deviceId = `Device_${random}`;
        }

        // ذخیره device ID در storage تا همیشه همون رو برگردونه
        await storage.save(DEVICE_ID_KEY, deviceId);

        return deviceId;
    } catch (error) {
        // در صورت خطا، سعی کن device ID ذخیره شده رو برگردون
        try {
            const storedDeviceId = await storage.get(DEVICE_ID_KEY);
            if (storedDeviceId && storedDeviceId.trim() !== "") {
                return storedDeviceId;
            }
        } catch (storageError) {
            // ignore
        }

        // آخرین fallback: یک ID موقت بساز (اما این نباید اتفاق بیفته)
        const random = Math.random().toString(36).substring(2, 15);
        return `Device_${random}`;
    }
}
