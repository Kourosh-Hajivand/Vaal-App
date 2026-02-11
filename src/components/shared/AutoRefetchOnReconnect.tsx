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
import { clearAllCaches } from "@/src/utils/cache/clearAllCaches";

export const AutoRefetchOnReconnect: React.FC = () => {
    const queryClient = useQueryClient();
    const { isOnline } = useOnlineStatus();
    const wasOfflineRef = React.useRef(false);

    // Monitor query errors برای 401
    // توکن در axios instance پاک می‌شه، اینجا queries رو cancel می‌کنیم تا fetch نکنن
    const hasHandled401Ref = React.useRef(false);
    useEffect(() => {
        const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
            // فقط events که query دارن رو چک کن (added, removed, updated)
            if ("query" in event && event.query?.state?.error) {
                const error = event.query.state.error as any;
                const status = error?.response?.status;

                if (status === 401 && !hasHandled401Ref.current) {
                    console.log("❌ [AutoRefetch] 401 error detected - clearing all caches and queries...");
                    hasHandled401Ref.current = true;
                    // Cancel تمام queryهای در حال اجرا
                    queryClient.cancelQueries();
                    // Remove تمام queries از cache تا enabled نشن
                    queryClient.removeQueries();
                    // Clear تمام React Query cache
                    queryClient.clear();
                    // پاک کردن تمام cache ها (media, device data, etc.)
                    clearAllCaches().catch((error) => {
                        console.error("❌ [AutoRefetch] Error clearing caches:", error);
                    });
                    // Reset flag بعد از 2 ثانیه
                    setTimeout(() => {
                        hasHandled401Ref.current = false;
                    }, 2000);
                }
            }
        });

        return () => {
            unsubscribe();
        };
    }, [queryClient]);

    useEffect(() => {
        // اگر قبلاً آفلاین بودیم و الان آنلاین شدیم، refetch کن (فقط یکبار)
        if (wasOfflineRef.current && isOnline) {
            console.log("🔄 [AutoRefetch] Internet reconnected, refetching stale queries...");

            // فقط queries که stale هستند رو refetch کن (نه همه queries)
            queryClient.refetchQueries({
                type: "active",
                stale: true,
            });

            console.log("✅ [AutoRefetch] Stale queries refetched");
        }

        // به‌روزرسانی وضعیت
        wasOfflineRef.current = !isOnline;
    }, [isOnline]); // حذف queryClient از dependencies برای جلوگیری از infinite loop

    return null;
};
