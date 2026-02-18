/**
 * Video Player Component
 * با custom duration control - ویدیو بعد از duration مشخص شده متوقف میشه
 */
import React, { useRef, useEffect, useState, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import Video, { type VideoRef } from "react-native-video";
import { logManager } from "@/src/utils/logging/logManager";

interface VideoPlayerProps {
    uri: string;
    duration: number; // Duration in seconds (از API)
    onEnded: () => void;
    isPaused: boolean;
    onError?: (error: any) => void;
    onProgress?: (currentTime: number) => void; // برای نمایش countdown
    playCount?: number; // تعداد دفعاتی که این ویدیو پخش شده (برای ویدیوهای تکراری)
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ uri, duration, onEnded, isPaused, onError, onProgress, playCount = 0 }) => {
    const videoRef = useRef<VideoRef>(null);
    const [hasEnded, setHasEnded] = useState(false);
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
    const durationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pausedAtRef = useRef<number>(0);
    const elapsedBeforePauseRef = useRef<number>(0);
    const previousUriRef = useRef<string>("");
    const previousPlayCountRef = useRef<number>(0);
    const isReadyForDisplayRef = useRef<boolean>(false);
    const [isPreparing, setIsPreparing] = useState(false); // برای pause کردن ویدیو تا آماده بشه
    const hasSeekedRef = useRef<boolean>(false); // برای جلوگیری از seek مکرر
    const seekTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null); // برای clear کردن timeout seek

    // Reset state when URI changes or playCount changes (برای ویدیوهای تکراری)
    useEffect(() => {
        const uriChanged = previousUriRef.current !== uri;
        // حذف شرط playCount > 0 تا حتی وقتی playCount از 0 به 1 تغییر می‌کند، reset شود
        const playCountChanged = previousPlayCountRef.current !== playCount;

        if (uriChanged || playCountChanged) {
            const wasDifferentUri = previousUriRef.current !== "";

            if (uriChanged) {
                previousUriRef.current = uri;
            }
            if (playCountChanged) {
                previousPlayCountRef.current = playCount;
            }

            // Reset all state
            setHasEnded(false);
            setHasStartedPlaying(false);
            elapsedBeforePauseRef.current = 0;
            pausedAtRef.current = 0;
            isReadyForDisplayRef.current = false;
            hasSeekedRef.current = false; // reset seek flag
            setIsPreparing(true); // pause کن تا آماده بشه

            // Clear any existing timers
            if (durationTimerRef.current) {
                clearTimeout(durationTimerRef.current);
                durationTimerRef.current = null;
            }
            if (seekTimeoutRef.current) {
                clearTimeout(seekTimeoutRef.current);
                seekTimeoutRef.current = null;
            }
        }
    }, [uri, playCount]);

    // Handle end callback - must be defined before useEffect that uses it
    const handleEnd = useCallback(() => {
        // Check if URI has changed (prevent old video from calling onEnded)
        if (previousUriRef.current !== uri) {
            return;
        }

        if (!hasEnded) {
            setHasEnded(true);
            if (durationTimerRef.current) {
                clearTimeout(durationTimerRef.current);
                durationTimerRef.current = null;
            }
            onEnded();
        }
    }, [uri, onEnded, hasEnded]);

    // ⏰ Custom duration timer: بعد از duration مشخص شده، force advance
    useEffect(() => {
        // Clear existing timer
        if (durationTimerRef.current) {
            clearTimeout(durationTimerRef.current);
            durationTimerRef.current = null;
        }

        // اگر ended شده یا duration نداریم یا هنوز پخش نشده یا در حال آماده‌سازی است، timer نزن
        if (hasEnded || duration <= 0 || !hasStartedPlaying || isPreparing) {
            return;
        }

        if (isPaused) {
            if (pausedAtRef.current === 0) {
                pausedAtRef.current = Date.now();
            }
            return;
        }

        // وقتی resume میشه، remaining time رو محاسبه کن
        if (pausedAtRef.current > 0) {
            pausedAtRef.current = 0;
        }

        const remainingTime = duration - elapsedBeforePauseRef.current;

        durationTimerRef.current = setTimeout(() => {
            handleEnd();
        }, remainingTime * 1000);

        // Track elapsed time
        const trackingInterval = setInterval(() => {
            if (!isPaused && !isPreparing && hasStartedPlaying) {
                elapsedBeforePauseRef.current += 0.1;
            }
        }, 100);

        return () => {
            if (durationTimerRef.current) {
                clearTimeout(durationTimerRef.current);
                durationTimerRef.current = null;
            }
            clearInterval(trackingInterval);
        };
    }, [uri, duration, isPaused, isPreparing, hasEnded, hasStartedPlaying, handleEnd]);

    const handleError = (error: any) => {
        console.error(`[VideoPlayer] ❌ Error playing video: ${uri}`, error);

        // اگر ویدیو corrupt شده یا format اشتباه، skip کن
        const errorMessage = error?.error?.code || error?.error?.localizedDescription || String(error);

        // لاگ خطای پخش
        logManager.logError("playback", `Video playback error: ${errorMessage}`, error?.stack || error?.error?.stack, {
            uri,
            duration,
            playCount,
        });

        if (errorMessage.includes("format") || errorMessage.includes("codec") || errorMessage.includes("corrupt")) {
            console.warn(`[VideoPlayer] ⚠️ Video file appears corrupted, skipping to next...`);
            // Skip به ویدیو بعدی
            setTimeout(() => {
                onEnded();
            }, 500);
        } else {
            // سایر خطاها رو به parent component بده
            onError?.(error);
        }
    };

    // Handle video load start - وقتی ویدیو شروع به لود کردن کرد
    const handleLoadStart = useCallback(() => {
        if (previousUriRef.current === uri) {
            isReadyForDisplayRef.current = false;
            hasSeekedRef.current = false;
            setIsPreparing(true); // pause کن تا آماده بشه
        }
    }, [uri]);

    // Handle video load - وقتی ویدیو لود شد
    const handleLoad = useCallback(() => {
        // seek(0) رو بعد از onReadyForDisplay صدا بزن
    }, []);

    // Handle seek complete - وقتی seek کامل شد
    const handleSeek = useCallback(
        (data: { currentTime: number }) => {
            if (previousUriRef.current === uri && hasSeekedRef.current && isPreparing) {
                // اگر seek به 0 رسید، آماده‌سازی رو تمام کن
                if (Math.abs(data.currentTime) < 0.1) {
                    // Clear timeout قبلی
                    if (seekTimeoutRef.current) {
                        clearTimeout(seekTimeoutRef.current);
                    }
                    // یه تاخیر کوچک بده و بعد play کن
                    seekTimeoutRef.current = setTimeout(() => {
                        setIsPreparing(false);
                        seekTimeoutRef.current = null;
                    }, 50);
                }
            }
        },
        [uri, isPreparing],
    );

    // Handle ready for display - وقتی ویدیو آماده نمایش شد
    const handleReadyForDisplay = useCallback(() => {
        if (videoRef.current && previousUriRef.current === uri && !hasSeekedRef.current) {
            isReadyForDisplayRef.current = true;
            hasSeekedRef.current = true; // flag رو set کن تا دوباره seek نشه

            // seek(0) کن
            if (videoRef.current) {
                videoRef.current.seek(0);
            }
        }
    }, [uri]);

    // Track progress for countdown
    const handleVideoProgress = useCallback(
        (data: any) => {
            // Check if URI has changed (prevent old video progress from affecting new video)
            if (previousUriRef.current !== uri) {
                return;
            }

            // اگر در حال آماده‌سازی هستیم
            if (isPreparing) {
                // اگر currentTime بیشتر از 0.2 شد و هنوز در حال آماده‌سازی هستیم، یعنی seek کار نکرده
                // در این صورت آماده‌سازی رو تمام کن
                if (data.currentTime > 0.2) {
                    setIsPreparing(false);
                }
                return;
            }

            // اگر ویدیو progress داره و pause نیست و آماده شده، یعنی واقعاً پخش شده
            if (!isPaused && data.currentTime > 0 && !hasStartedPlaying) {
                setHasStartedPlaying(true);
                elapsedBeforePauseRef.current = 0;
            }

            // ⚠️ CRITICAL: اگر ویدیو به duration رسیده یا ازش گذشته، advance کن
            if (!hasEnded && hasStartedPlaying && !isPaused && data.currentTime >= duration) {
                handleEnd();
                return;
            }

            if (onProgress && !isPaused && !hasEnded && !isPreparing) {
                onProgress(data.currentTime);
            }
        },
        [uri, isPaused, isPreparing, hasStartedPlaying, hasEnded, duration, handleEnd, onProgress],
    );

    return (
        <View style={styles.container}>
            <Video
                ref={videoRef}
                source={{ uri }}
                style={styles.video}
                resizeMode="cover"
                repeat={false}
                paused={isPaused || isPreparing} // pause کن تا آماده بشه
                muted={false}
                volume={1.0}
                playInBackground={false}
                playWhenInactive={false}
                onEnd={handleEnd}
                onError={handleError}
                onLoadStart={handleLoadStart}
                onLoad={handleLoad}
                onReadyForDisplay={handleReadyForDisplay}
                onSeek={handleSeek}
                onProgress={handleVideoProgress}
                ignoreSilentSwitch="ignore"
                controls={false}
                poster={undefined}
                posterResizeMode="cover"
                progressUpdateInterval={250}
                bufferConfig={{
                    minBufferMs: 2000, // افزایش buffer برای جلوگیری از لگ
                    maxBufferMs: 10000, // افزایش max buffer
                    bufferForPlaybackMs: 1000, // افزایش buffer قبل از شروع پخش
                    bufferForPlaybackAfterRebufferMs: 2000,
                }}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: "100%",
        height: "100%",
        backgroundColor: "#000",
    },
    video: {
        position: "absolute",
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
});
