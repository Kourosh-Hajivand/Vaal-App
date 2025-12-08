import { Platform } from 'react-native';

/**
 * Global Error Handler
 * Catches unhandled errors and promise rejections
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
            if (typeof ErrorUtils !== 'undefined' && ErrorUtils.getGlobalHandler) {
                const originalErrorHandler = ErrorUtils.getGlobalHandler();
                
                ErrorUtils.setGlobalHandler((error: Error, isFatal?: boolean) => {
                    try {
                        this.logError(error, isFatal);
                    } catch (e) {
                        console.error('Error in error handler:', e);
                    }
                    
                    // Call original handler
                    if (originalErrorHandler) {
                        try {
                            originalErrorHandler(error, isFatal);
                        } catch (e) {
                            console.error('Error in original error handler:', e);
                        }
                    }
                });
            }

            console.log('✅ Error handler initialized');
        } catch (error) {
            console.error('Failed to initialize error handler:', error);
        }
    }

    logError(error: Error, isFatal?: boolean) {
        const errorLog: ErrorLog = {
            message: error.message || 'Unknown error',
            stack: error.stack,
            timestamp: new Date().toISOString(),
            platform: Platform.OS,
        };

        this.errorLogs.push(errorLog);

        // Log to console
        console.error('🚨 Global Error:', {
            message: errorLog.message,
            isFatal,
            platform: errorLog.platform,
            timestamp: errorLog.timestamp,
        });

        // In production, you might want to send to crash reporting service
        // Example: Sentry.captureException(error);
        
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

