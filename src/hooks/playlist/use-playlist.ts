import { useQuery } from "@tanstack/react-query";
import { playlistService } from "@/src/services/playlist.service";

/**
 * Query Keys برای playlist
 */
export const playlistKeys = {
    all: ["playlist"] as const,
    detail: (id: string) => [...playlistKeys.all, "detail", id] as const,
} as const;

/**
 * Hook برای دریافت یک playlist با ID
 */
export const usePlaylist = (id: string, enabled = true) => {
    return useQuery({
        queryKey: playlistKeys.detail(id),
        queryFn: async () => {
            const response = await playlistService.getById(id);
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
