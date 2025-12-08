import RadarLogic from "../../RadarLogic";

const SERIAL_PORT = "/dev/ttyS1";
const BAUD_RATE = 115200;

export interface SensorData {
    isPresence: boolean;
    distance: number;
    statusText: string;
    hex?: string;
}

/**
 * Sensor Service - مدیریت سنسور رادار
 */
export const sensorService = {
    isRunning: false,

    /**
     * شروع سنسور
     */
    startSensor: (onDataUpdate?: (data: SensorData) => void) => {
        if (sensorService.isRunning) {
            console.log("Sensor already running");
            return;
        }

        sensorService.isRunning = true;

        // Setup callbacks
        RadarLogic.onDataUpdate = (data: any) => {
            if (onDataUpdate) {
                onDataUpdate({
                    isPresence: data.isPresence,
                    distance: data.distance,
                    statusText: data.statusText,
                    hex: data.hex,
                });
            }
        };

        RadarLogic.onLog = (msg: any, type: any) => {
            console.log(`[Sensor] ${type}: ${msg}`);
        };

        // Connect to sensor with better error handling
        RadarLogic.connect(SERIAL_PORT, BAUD_RATE).catch((error) => {
            console.error("Error connecting to sensor:", error);
            sensorService.isRunning = false;
            // Don't throw - allow app to continue without sensor
            // Sensor is optional for testing
        });
    },

    /**
     * توقف سنسور
     */
    stopSensor: () => {
        if (!sensorService.isRunning) {
            return;
        }

        sensorService.isRunning = false;
        RadarLogic.disconnect();
        RadarLogic.onDataUpdate = null;
        RadarLogic.onLog = null;
    },
};
