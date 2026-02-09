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
            console.log('[useRadarSensor] ✅ Sensor reconnected, data received');
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
        if (isConnectingRef.current) {
            console.log('[useRadarSensor] ⚠️ Already connecting, skipping...');
            return;
        }

        // اگر RadarLogic disconnected شده ولی ما connected فکر می‌کنیم، reset کن
        if (!RadarLogic.isConnected && isConnectedRef.current) {
            console.log('[useRadarSensor] 🔄 RadarLogic disconnected, resetting state');
            isConnectedRef.current = false;
            setIsConnected(false);
            setIsPresence(false);
            setDistance(0);
            setStatusText('Not Available');
        }

        isConnectingRef.current = true;
        console.log('[useRadarSensor] 🔌 Attempting to connect to sensor...');

        try {
            await RadarLogic.connect('/dev/ttyS1', 115200);
            
            console.log('[useRadarSensor] ✅ Connection successful, waiting for data...');
            
            // ✅ اتصال موفق - reset retry count
            retryCountRef.current = 0;
            
            // ⏱️ Timeout: اگر بعد از 5 ثانیه data نیومد، mark as disconnected
            connectionTimeoutRef.current = setTimeout(() => {
                if (lastDataTimeRef.current === 0 && mountedRef.current) {
                    console.log('[useRadarSensor] ⚠️ No data received after 5s, marking as disconnected');
                    isConnectedRef.current = false;
                    setIsConnected(false);
                    setIsPresence(false);
                    setDistance(0);
                    setStatusText('Not Available');
                }
                isConnectingRef.current = false;
            }, 5000);
            
        } catch (error: any) {
            // ❌ اتصال ناموفق - increase retry count
            console.log('[useRadarSensor] ❌ Connection failed:', error?.message || error);
            retryCountRef.current++;
            
            if (mountedRef.current) {
                isConnectedRef.current = false;
                setIsConnected(false);
                setIsPresence(false);
                setDistance(0);
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

        // 🔄 Health check: هر 5 ثانیه وضعیت رو چک کن (سریع‌تر برای تشخیص قطع سریع)
        retryIntervalRef.current = setInterval(() => {
            if (!mountedRef.current) return;

            // ⚠️ CRITICAL: چک کن که RadarLogic واقعاً connected هست یا نه
            const radarLogicConnected = RadarLogic.isConnected;
            const timeSinceLastData = lastDataTimeRef.current > 0 ? Date.now() - lastDataTimeRef.current : Infinity;

            // اگر RadarLogic disconnected شده ولی ما هنوز connected فکر می‌کنیم
            if (!radarLogicConnected && isConnectedRef.current) {
                console.log('[useRadarSensor] ⚠️ RadarLogic disconnected but state says connected, fixing...');
                isConnectedRef.current = false;
                setIsConnected(false);
                setIsPresence(false); // Reset presence
                setDistance(0);
                setStatusText('Not Available');
                lastDataTimeRef.current = 0;
                isConnectingRef.current = false;
            }

            // اگر هنوز data نگرفتیم یا خیلی وقته data نیومده
            if (lastDataTimeRef.current === 0) {
                // هنوز اصلاً متصل نشدیم - retry با exponential backoff
                if (!isConnectingRef.current && !radarLogicConnected) {
                    // 📈 Exponential backoff: 2s, 4s, 8s, 16s, max 30s
                    const backoffDelay = Math.min(2000 * Math.pow(2, retryCountRef.current), 30000);
                    
                    setTimeout(() => {
                        if (mountedRef.current && !isConnectingRef.current) {
                            attemptConnect();
                        }
                    }, backoffDelay);
                }
            } else if (timeSinceLastData > 10000) {
                // ⚠️ 10 ثانیه data نیومده - احتمالاً disconnected شده (سریع‌تر از قبل)
                if (isConnectedRef.current) {
                    console.log('[useRadarSensor] ⚠️ No data for 10s, marking as disconnected');
                    isConnectedRef.current = false;
                    setIsConnected(false);
                    setIsPresence(false); // Reset presence
                    setDistance(0);
                    setStatusText('Not Available');
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
        }, 5 * 1000); // هر 5 ثانیه چک کن (به جای 30 ثانیه)

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
