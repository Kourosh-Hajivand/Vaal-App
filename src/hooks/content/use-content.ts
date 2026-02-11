import { useQuery } from "@tanstack/react-query";
import { contentService } from "@/src/services/content.service";

/**
 * Query Keys برای content
 */
export const contentKeys = {
    all: ["content"] as const,
    detail: (id: string) => [...contentKeys.all, "detail", id] as const,
} as const;

/**
 * Hook برای دریافت یک content item با ID
 */
export const useContent = (id: string, enabled = true) => {
    return useQuery({
        queryKey: contentKeys.detail(id),
        queryFn: async () => {
            const response = await contentService.getById(id);
            return response.data;
        },
        enabled: enabled && !!id,
        retry: 5,
        staleTime: 10 * 60 * 1000, // 10 minutes (content ها معمولاً کمتر تغییر می‌کنن)
        placeholderData: (previousData) => previousData,
        throwOnError: false,
        // غیرفعال کردن refetchInterval - فقط از staleTime استفاده می‌کنیم
        refetchInterval: false, // کاملاً غیرفعال برای جلوگیری از infinite loop
    });
};
