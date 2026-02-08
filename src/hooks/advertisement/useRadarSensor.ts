/**
 * useRadarSensor Hook
 * Integration با RadarLogic.js
 * ✅ Maximum stability با:
 * - Empty dependency array (no re-render loop)
 * - Ref-based state (no race conditions)
 * - Exponential backoff (smart retry)
 * - Proper cleanup (no memory leaks)
 */
import { useEffect, useState, useRef, useCallback, useMemo } from 'react';
import RadarLogic from '../../../RadarLogic';

interface RadarData {
    isPresence: boolean;
    distance: number;
    statusText: string;
}

export const useRadarSensor = () => {
    const [isPresence, setIsPresence] = useState(false);
    const [distance, setDistance] = useState(0);
    const [statusText, setStatusText] = useState('Not Available');
    const [isConnected, setIsConnected] = useState(false);
    
    // Refs for stable connection management
    const isConnectedRef = useRef(false);
    const isConnectingRef = useRef(false);
    const connectionTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const lastDataTimeRef = useRef<number>(0);
    const mountedRef = useRef(true);
    const retryCountRef = useRef(0); // برای exponential backoff

    // 🛡️ Stable callback که فقط یکبار تعریف میشه
    const handleDataUpdate = useCallback((data: RadarData) => {
        if (!mountedRef.current) return;

        // Update last data time
        lastDataTimeRef.current = Date.now();
        
        // Update presence data
        setIsPresence(data.isPresence);
        setDistance(data.distance);
        setStatusText(data.statusText);
        
        // ✅ فقط اگر واقعاً disconnected بود، state رو update کن
        if (!isConnectedRef.current) {
            isConnectedRef.current = true;
            setIsConnected(true);
        }
        
        // Clear timeout چون data دریافت شد
        if (connectionTimeoutRef.current) {
            clearTimeout(connectionTimeoutRef.current);
            connectionTimeoutRef.current = null;
        }
    }, []);

    // 🔌 تابع connect با race condition protection و exponential backoff
    const attemptConnect = useCallback(async () => {
        // ⛔ جلوگیری از multiple concurrent attempts
        if (isConnectingRef.current || isConnectedRef.current) {
            return;
        }

        isConnectingRef.current = true;

        try {
            await RadarLogic.connect('/dev/ttyS1', 115200);
            
            // ✅ اتصال موفق - reset retry count
            retryCountRef.current = 0;
            
            // ⏱️ Timeout: اگر بعد از 5 ثانیه data نیومد، mark as disconnected
            connectionTimeoutRef.current = setTimeout(() => {
                if (lastDataTimeRef.current === 0 && mountedRef.current) {
                    isConnectedRef.current = false;
                    setIsConnected(false);
                    setStatusText('Not Available');
                }
                isConnectingRef.current = false;
            }, 5000);
            
        } catch (error: any) {
            // ❌ اتصال ناموفق - increase retry count
            retryCountRef.current++;
            
            if (mountedRef.current) {
                isConnectedRef.current = false;
                setIsConnected(false);
                setStatusText('Not Available');
            }
            isConnectingRef.current = false;
        }
    }, []);

    // 🚀 Initialize connection (فقط یکبار)
    useEffect(() => {
        mountedRef.current = true;

        // Setup callbacks
        RadarLogic.onDataUpdate = handleDataUpdate;
        RadarLogic.onLog = null;
        RadarLogic.onConfigRead = null;

        // اولین تلاش
        attemptConnect();

        // 🔄 Health check: هر 30 ثانیه وضعیت رو چک کن
        retryIntervalRef.current = setInterval(() => {
            if (!mountedRef.current) return;

            const timeSinceLastData = Date.now() - lastDataTimeRef.current;

            // اگر هنوز data نگرفتیم یا خیلی وقته data نیومده
            if (lastDataTimeRef.current === 0) {
                // هنوز اصلاً متصل نشدیم - retry با exponential backoff
                if (!isConnectingRef.current) {
                    // 📈 Exponential backoff: 2s, 4s, 8s, 16s, max 30s
                    const backoffDelay = Math.min(2000 * Math.pow(2, retryCountRef.current), 30000);
                    
                    setTimeout(() => {
                        if (mountedRef.current && !isConnectingRef.current) {
                            attemptConnect();
                        }
                    }, backoffDelay);
                }
            } else if (timeSinceLastData > 120000) {
                // 2 دقیقه data نیومده - احتمالاً disconnected شده
                if (isConnectedRef.current) {
                    isConnectedRef.current = false;
                    setIsConnected(false);
                    RadarLogic.disconnect();
                    lastDataTimeRef.current = 0;
                    isConnectingRef.current = false;
                    retryCountRef.current = 0; // Reset retry count
                    
                    // بعد از 2 ثانیه دوباره connect کن
                    setTimeout(() => {
                        if (mountedRef.current) {
                            attemptConnect();
                        }
                    }, 2000);
                }
            }
            // اگه connected هستیم و data میاد، هیچ کاری نکن ✅
        }, 30 * 1000);

        // 🧹 Cleanup - guaranteed to run on unmount
        return () => {
            mountedRef.current = false;
            
            // Clear all timers
            if (connectionTimeoutRef.current) {
                clearTimeout(connectionTimeoutRef.current);
                connectionTimeoutRef.current = null;
            }
            if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
                retryIntervalRef.current = null;
            }
            
            // Remove callbacks
            RadarLogic.onDataUpdate = null;
            RadarLogic.onLog = null;
            RadarLogic.onConfigRead = null;
            
            // Disconnect sensor
            RadarLogic.disconnect();
            
            // Reset refs
            isConnectedRef.current = false;
            isConnectingRef.current = false;
            retryCountRef.current = 0;
        };
    }, []); // ✅ Empty dependency - فقط mount/unmount

    // 🎯 Memoized return value - جلوگیری از re-render غیرضروری
    return useMemo(() => ({
        isPresence,
        distance,
        statusText,
        isConnected,
    }), [isPresence, distance, statusText, isConnected]);
};
