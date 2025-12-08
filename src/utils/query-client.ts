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
            gcTime: 15 * 60 * 1000, // 15 minutes (increased cache time)
            refetchOnMount: false, // Disable refetch on mount (save resources)
            refetchOnReconnect: false, // Disable background refetch
            refetchInterval: false, // Disable automatic refetch
        },
        mutations: {
            retry: false,
        },
    },
});
