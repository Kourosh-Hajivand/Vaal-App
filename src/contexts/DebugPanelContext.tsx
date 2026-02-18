/**
 * Debug Panel Context
 * مدیریت نمایش/مخفی کردن پنل دیباگ
 */
import React, { createContext, useContext, useState, useEffect, useRef, ReactNode } from "react";

interface DebugPanelContextType {
    isDebugPanelVisible: boolean;
    showDebugPanel: () => void;
    hideDebugPanel: () => void;
    toggleDebugPanel: () => void;
}

const DebugPanelContext = createContext<DebugPanelContextType | undefined>(undefined);

export const DebugPanelProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [isDebugPanelVisible, setIsDebugPanelVisible] = useState(false);
    const autoCloseTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const AUTO_CLOSE_DELAY = 10 * 60 * 1000; // 10 دقیقه

    const showDebugPanel = () => {
        setIsDebugPanelVisible(true);

        // Clear previous timeout if exists
        if (autoCloseTimeoutRef.current) {
            clearTimeout(autoCloseTimeoutRef.current);
        }

        // Set new timeout to auto-close after 10 minutes
        autoCloseTimeoutRef.current = setTimeout(() => {
            setIsDebugPanelVisible(false);
            autoCloseTimeoutRef.current = null;
        }, AUTO_CLOSE_DELAY);
    };

    const hideDebugPanel = () => {
        setIsDebugPanelVisible(false);

        // Clear timeout if panel is manually closed
        if (autoCloseTimeoutRef.current) {
            clearTimeout(autoCloseTimeoutRef.current);
            autoCloseTimeoutRef.current = null;
        }
    };

    const toggleDebugPanel = () => {
        if (isDebugPanelVisible) {
            hideDebugPanel();
        } else {
            showDebugPanel();
        }
    };

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (autoCloseTimeoutRef.current) {
                clearTimeout(autoCloseTimeoutRef.current);
            }
        };
    }, []);

    return (
        <DebugPanelContext.Provider
            value={{
                isDebugPanelVisible,
                showDebugPanel,
                hideDebugPanel,
                toggleDebugPanel,
            }}
        >
            {children}
        </DebugPanelContext.Provider>
    );
};

export const useDebugPanel = (): DebugPanelContextType => {
    const context = useContext(DebugPanelContext);
    if (!context) {
        throw new Error("useDebugPanel must be used within DebugPanelProvider");
    }
    return context;
};
