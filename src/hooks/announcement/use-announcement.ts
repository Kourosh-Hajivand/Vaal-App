import { announcementService } from "@/src/services/announcement.service";
import { useQuery } from "@tanstack/react-query";

/**
 * Query Keys برای announcement
 */
export const announcementKeys = {
    all: ["announcement"] as const,
    detail: (id: string) => [...announcementKeys.all, "detail", id] as const,
} as const;

/**
 * Hook برای دریافت یک announcement با ID
 */
export const useAnnouncement = (id: string, enabled = true) => {
    return useQuery({
        queryKey: announcementKeys.detail(id),
        queryFn: async () => {
            const response = await announcementService.getById(id);
            return response.data;
        },
        enabled: enabled && !!id,
        retry: 5,
        staleTime: 5 * 60 * 1000,
        placeholderData: (previousData) => previousData,
        throwOnError: false,
        // غیرفعال کردن refetchInterval - فقط از staleTime استفاده می‌کنیم
        refetchInterval: false, // کاملاً غیرفعال برای جلوگیری از infinite loop
    });
};
