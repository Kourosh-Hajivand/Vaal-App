/**
 * Auto Refetch On Reconnect
 * وقتی اینترنت وصل می‌شه، همه queries رو refetch می‌کنه
 */
import React, { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useOnlineStatus } from "@/src/hooks/use-online-status";

export const AutoRefetchOnReconnect: React.FC = () => {
    const queryClient = useQueryClient();
    const { isOnline } = useOnlineStatus();
    const wasOfflineRef = React.useRef(false);

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
