/**
 * Log Service - ارسال لاگ‌ها به بک‌اند
 */

import { axiosInstance } from "@/src/utils/axios-instance";
import { routes } from "@/src/routes/routes";
import { logStorage } from "@/src/utils/logging/logStorage";
import type { LogBatch, LogBatchResponse } from "@/src/types/logging.types";
import type { ApiResponse } from "@/src/types/api.types";

export const logService = {
    /**
     * ارسال بچ لاگ‌ها به سرور
     */
    sendLogBatch: async (logs: LogBatch): Promise<LogBatchResponse> => {
        try {
            const response = await axiosInstance.post<ApiResponse<LogBatchResponse>>(
                routes.devices.logs(),
                logs
            );

            const apiResponse = response.data as ApiResponse<LogBatchResponse>;
            
            if (apiResponse?.data) {
                return apiResponse.data;
            }

            // Fallback: اگر ساختار response متفاوت بود
            return {
                success: true,
                received_count: logs.logs.length,
            };
        } catch (error: any) {
            console.error("[LogService] Error sending log batch:", error);
            
            // در صورت خطا، false برمی‌گردانیم تا لاگ‌ها sync نشده باقی بمانند
            return {
                success: false,
                message: error?.message || "Unknown error",
                received_count: 0,
            };
        }
    },

    /**
     * Sync تمام لاگ‌های pending
     */
    syncPendingLogs: async (): Promise<{ success: boolean; syncedCount: number }> => {
        try {
            const pendingLogs = await logStorage.getPendingLogs(50); // حداکثر 50 لاگ در هر بچ

            if (pendingLogs.length === 0) {
                return { success: true, syncedCount: 0 };
            }

            const batch: LogBatch = {
                logs: pendingLogs,
                batch_id: `batch-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                created_at: Date.now(),
            };

            const result = await logService.sendLogBatch(batch);

            if (result.success) {
                // علامت‌گذاری لاگ‌ها به عنوان sync شده
                const logIds = pendingLogs.map((log) => log.id);
                await logStorage.markLogsAsSynced(logIds);

                return {
                    success: true,
                    syncedCount: result.received_count || pendingLogs.length,
                };
            }

            return {
                success: false,
                syncedCount: 0,
            };
        } catch (error) {
            console.error("[LogService] Error syncing logs:", error);
            return {
                success: false,
                syncedCount: 0,
            };
        }
    },
};
