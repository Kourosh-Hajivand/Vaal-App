import { QueryClient } from "@tanstack/react-query";

/**
 * QueryClient configuration - Optimized for low-end devices
 */
export const queryClient = new QueryClient({
    defaultOptions: {
        queries: {
            retry: 1,
            refetchOnWindowFocus: false,
            staleTime: 10 * 60 * 1000, // 10 minutes (increased for better performance)
            gcTime: 7 * 24 * 60 * 60 * 1000, // 7 روز — برای آفلاین persist
            refetchOnMount: false, // Disable refetch on mount (save resources)
            refetchOnReconnect: false, // Disable background refetch
            refetchInterval: false, // Disable automatic refetch
        },
        mutations: {
            retry: false,
        },
    },
});
