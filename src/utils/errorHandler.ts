import { Platform } from "react-native";

/**
 * Global Error Handler
 * Catches unhandled errors and promise rejections
 * On fatal JS errors: auto-restart app (kiosk mode)
 */

interface ErrorLog {
    message: string;
    stack?: string;
    timestamp: string;
    platform: string;
}

class ErrorHandler {
    private errorLogs: ErrorLog[] = [];

    init() {
        try {
            // Handle JavaScript errors
            if (typeof ErrorUtils !== "undefined" && ErrorUtils.getGlobalHandler) {
                const originalErrorHandler = ErrorUtils.getGlobalHandler();

                ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
                    try {
                        this.logError(error, isFatal);
                    } catch (e) {
                        console.error("Error in error handler:", e);
                    }

                    // Kiosk mode: auto-restart on fatal JS errors
                    if (isFatal && Platform.OS !== "web") {
                        try {
                            const RNRestart = require("react-native-restart").default;
                            RNRestart.restart();
                            return;
                        } catch (restartErr) {
                            console.error("Failed to restart:", restartErr);
                        }
                    }

                    // Call original handler
                    if (originalErrorHandler) {
                        try {
                            originalErrorHandler(error, isFatal);
                        } catch (e) {
                            console.error("Error in original error handler:", e);
                        }
                    }
                });
            }

            console.log("✅ Error handler initialized");
        } catch (error) {
            console.error("Failed to initialize error handler:", error);
        }
    }

    logError(error: Error, isFatal?: boolean) {
        const errorLog: ErrorLog = {
            message: error.message || "Unknown error",
            stack: error.stack,
            timestamp: new Date().toISOString(),
            platform: Platform.OS,
        };

        this.errorLogs.push(errorLog);

        // Log to console
        console.error("🚨 Global Error:", {
            message: errorLog.message,
            isFatal,
            platform: errorLog.platform,
            timestamp: errorLog.timestamp,
        });

        // ارسال به بک‌اند (با device_id اگر ست شده) تا بدانی کدام مانیتور crash کرده
        if (Platform.OS !== "web") {
            try {
                const { logManager } = require("../utils/logging/logManager");
                logManager
                    .logError("other", errorLog.message, errorLog.stack, {
                        reason: "js_error",
                        isFatal: !!isFatal,
                        platform: Platform.OS,
                    })
                    .then(() => logManager.flush())
                    .catch(() => {});
            } catch (_) {
                // ignore if logManager not available
            }
        }

        // Keep only last 10 errors
        if (this.errorLogs.length > 10) {
            this.errorLogs.shift();
        }
    }

    getErrorLogs(): ErrorLog[] {
        return [...this.errorLogs];
    }

    clearLogs() {
        this.errorLogs = [];
    }
}

export const errorHandler = new ErrorHandler();
