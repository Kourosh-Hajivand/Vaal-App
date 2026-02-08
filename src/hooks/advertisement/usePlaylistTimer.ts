/**
 * usePlaylistTimer Hook
 * مدیریت auto-advance برای playlist
 */
import { useEffect, useRef } from 'react';

interface UsePlaylistTimerProps {
    duration: number; // in seconds
    enabled: boolean;
    onAdvance: () => void;
}

export const usePlaylistTimer = ({ duration, enabled, onAdvance }: UsePlaylistTimerProps) => {
    const timerRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!enabled || duration <= 0) {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        console.log(`[PlaylistTimer] Starting timer for ${duration}s`);

        timerRef.current = setTimeout(() => {
            console.log('[PlaylistTimer] Timer expired, advancing');
            onAdvance();
        }, duration * 1000);

        return () => {
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [duration, enabled, onAdvance]);

    const reset = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    return { reset };
};
