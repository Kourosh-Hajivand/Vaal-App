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
    const onAdvanceRef = useRef(onAdvance);
    const startTimeRef = useRef<number>(0); // زمان شروع timer
    const elapsedBeforePauseRef = useRef<number>(0); // زمان سپری شده قبل از pause
    const isPausedRef = useRef<boolean>(false);
    const lastDurationRef = useRef<number>(0); // برای تشخیص تغییر duration

    // Keep onAdvance ref updated
    useEffect(() => {
        onAdvanceRef.current = onAdvance;
    }, [onAdvance]);

    useEffect(() => {
        // ⚠️ CRITICAL: اگر duration تغییر کرد، timer رو reset کن (عکس جدید)
        const durationChanged = lastDurationRef.current !== duration && lastDurationRef.current > 0;
        if (durationChanged) {
            console.log('[PlaylistTimer] 🔄 Duration changed, resetting timer:', {
                oldDuration: lastDurationRef.current,
                newDuration: duration,
            });
            elapsedBeforePauseRef.current = 0;
            startTimeRef.current = 0;
            isPausedRef.current = false;
            if (timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        }
        lastDurationRef.current = duration;

        console.log(`[PlaylistTimer] Effect triggered:`, {
            enabled,
            duration,
            willStart: enabled && duration > 0,
            isPaused: isPausedRef.current,
            durationChanged,
        });

        // Clear existing timer (اگر duration تغییر نکرده و فقط enabled تغییر کرده)
        if (!durationChanged && timerRef.current) {
            console.log('[PlaylistTimer] Clearing existing timer');
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (!enabled || duration <= 0) {
            console.log('[PlaylistTimer] Timer disabled or invalid duration');
            // اگر pause شده، elapsed time رو ذخیره کن
            if (!enabled && startTimeRef.current > 0 && !isPausedRef.current) {
                isPausedRef.current = true;
                elapsedBeforePauseRef.current += (Date.now() - startTimeRef.current) / 1000;
                startTimeRef.current = 0;
                console.log('[PlaylistTimer] Paused, elapsed:', elapsedBeforePauseRef.current.toFixed(1), 's');
            } else if (duration <= 0) {
                // Reset elapsed time وقتی duration نامعتبره
                elapsedBeforePauseRef.current = 0;
                startTimeRef.current = 0;
                isPausedRef.current = false;
            }
            return;
        }

        // اگر pause شده بود و حالا resume شد
        if (isPausedRef.current && enabled) {
            console.log('[PlaylistTimer] Resuming from pause');
            isPausedRef.current = false;
            const remainingTime = duration - elapsedBeforePauseRef.current;
            
            if (remainingTime > 0) {
                console.log(`[PlaylistTimer] ✅ Resuming timer for ${remainingTime.toFixed(1)}s (${elapsedBeforePauseRef.current.toFixed(1)}s elapsed)`);
                startTimeRef.current = Date.now();
                timerRef.current = setTimeout(() => {
                    console.log('[PlaylistTimer] ⏰ Timer expired (resumed), calling onAdvance');
                    onAdvanceRef.current();
                }, remainingTime * 1000);
            } else {
                // زمان تمام شده، بلافاصله advance کن
                console.log('[PlaylistTimer] ⏰ Time already expired, advancing immediately');
                elapsedBeforePauseRef.current = 0;
                startTimeRef.current = 0;
                onAdvanceRef.current();
            }
            return;
        }

        // شروع جدید (نه resume)
        if (enabled && !isPausedRef.current) {
            // Reset elapsed time برای شروع جدید
            elapsedBeforePauseRef.current = 0;
            startTimeRef.current = Date.now();
            
            console.log(`[PlaylistTimer] ✅ Starting NEW timer for ${duration}s`);

            timerRef.current = setTimeout(() => {
                console.log('[PlaylistTimer] ⏰ Timer expired, calling onAdvance');
                elapsedBeforePauseRef.current = 0;
                startTimeRef.current = 0;
                onAdvanceRef.current();
            }, duration * 1000);
        }

        return () => {
            if (timerRef.current) {
                console.log('[PlaylistTimer] Cleaning up timer');
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
        };
    }, [duration, enabled]); // حذف onAdvance از dependencies برای جلوگیری از reset شدن

    const reset = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }
    };

    return { reset };
};
