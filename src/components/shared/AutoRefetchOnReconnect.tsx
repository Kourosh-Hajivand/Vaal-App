/**
 * Auto Refetch On Reconnect
 * وقتی اینترنت وصل می‌شه، همه queries رو refetch می‌کنه
 * همچنین 401 errors رو monitor می‌کنه و token رو invalidate می‌کنه
 */
import React, { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOnlineStatus } from "@/src/hooks/use-online-status";
import { tokenService } from "@/src/services/tokenService";
import { pairCodeService } from "@/src/services/pairCodeService";

export const AutoRefetchOnReconnect: React.FC = () => {
    const queryClient = useQueryClient();
    const { isOnline } = useOnlineStatus();
    const wasOfflineRef = React.useRef(false);

    // Monitor query errors برای 401
    useEffect(() => {
        const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
            // فقط events که query دارن رو چک کن (added, removed, updated)
            if ("query" in event && event.query?.state?.error) {
                const error = event.query.state.error as any;
                const status = error?.response?.status;
                
                if (status === 401) {
                    console.log("❌ [AutoRefetch] 401 error detected in query, invalidating token...");
                    // Token رو حذف می‌کنیم
                    tokenService.remove().catch(() => {});
                    pairCodeService.remove().catch(() => {});
                    // تمام queries رو invalidate می‌کنیم تا دوباره fetch نکنن
                    queryClient.invalidateQueries();
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [queryClient]);

    useEffect(() => {
        // اگر قبلاً آفلاین بودیم و الان آنلاین شدیم، refetch کن
        if (wasOfflineRef.current && isOnline) {
            console.log("🔄 [AutoRefetch] Internet reconnected, refetching all queries...");

            // Refetch همه queries که stale هستند
            queryClient.refetchQueries({
                type: "active",
                stale: true,
            });

            // همچنین refetch queries مهم
            queryClient.refetchQueries({
                queryKey: ["device", "manifest"],
            });
            queryClient.refetchQueries({
                queryKey: ["device", "announcements"],
            });
            queryClient.refetchQueries({
                queryKey: ["device", "contacts"],
            });
            queryClient.refetchQueries({
                queryKey: ["device", "auth"],
            });
            queryClient.refetchQueries({
                queryKey: ["weather", "forecast"],
            });
            queryClient.refetchQueries({
                queryKey: ["weather", "current"],
            });

            console.log("✅ [AutoRefetch] All queries refetched");
        }

        // به‌روزرسانی وضعیت
        wasOfflineRef.current = !isOnline;
    }, [isOnline, queryClient]);

    return null;
};
