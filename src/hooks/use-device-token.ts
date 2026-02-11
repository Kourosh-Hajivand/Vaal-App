import { useEffect, useState, useRef } from "react";
import { tokenStorage } from "@/src/utils/token-storage";

/**
 * Hook برای چک کردن token به صورت reactive
 * وقتی token تغییر می‌کنه، hook به صورت خودکار update میشه
 *
 * سازگار با React Native (بدون localStorage / window)
 */
export const useDeviceToken = () => {
    const [hasToken, setHasToken] = useState<boolean>(false);
    const [token, setToken] = useState<string | null>(null);
    const [isChecking, setIsChecking] = useState(true);

    // استفاده از ref برای جلوگیری از infinite loop
    const tokenRef = useRef<string | null>(null);
    const initializedRef = useRef(false);

    useEffect(() => {
        // فقط یکبار initialize کن
        if (initializedRef.current) return;
        initializedRef.current = true;

        // چک کردن اولیه token
        const checkToken = async () => {
            try {
                const currentToken = await tokenStorage.get();
                const tokenExists = !!currentToken;
                tokenRef.current = currentToken;
                setHasToken(tokenExists);
                setToken(currentToken);
                setIsChecking(false);
            } catch (error) {
                console.error("[useDeviceToken] Error checking token:", error);
                setHasToken(false);
                setToken(null);
                setIsChecking(false);
            }
        };

        checkToken();

        // تابع برای update کردن state
        const updateTokenState = (newToken: string | null) => {
            if (newToken !== tokenRef.current) {
                tokenRef.current = newToken;
                setHasToken(!!newToken);
                setToken(newToken);
            }
        };

        // Polling: هر 500ms چک کن token تغییر کرده یا نه (برای react سریع‌تر)
        // در React Native از polling استفاده می‌کنیم (نه localStorage event)
        const checkInterval = setInterval(async () => {
            try {
                const currentToken = await tokenStorage.get();
                if (currentToken !== tokenRef.current) {
                    updateTokenState(currentToken);
                }
            } catch {
                // ignore errors
            }
        }, 500); // کاهش از 2000ms به 500ms برای react سریع‌تر

        return () => {
            clearInterval(checkInterval);
        };
    }, []);

    return {
        hasToken,
        token,
        isChecking,
    };
};
