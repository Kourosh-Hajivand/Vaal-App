/**
 * Video Player Component
 * با custom duration control - ویدیو بعد از duration مشخص شده متوقف میشه
 */
import React, { useRef, useEffect, useState } from "react";
import { View, StyleSheet } from "react-native";
import Video, { type VideoRef } from "react-native-video";

interface VideoPlayerProps {
    uri: string;
    duration: number; // Duration in seconds (از API)
    onEnded: () => void;
    isPaused: boolean;
    onError?: (error: any) => void;
    onProgress?: (currentTime: number) => void; // برای نمایش countdown
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({ uri, duration, onEnded, isPaused, onError, onProgress }) => {
    const videoRef = useRef<VideoRef>(null);
    const [hasEnded, setHasEnded] = useState(false);
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false); // آیا ویدیو واقعاً شروع به پخش کرده؟
    const durationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pausedAtRef = useRef<number>(0);
    const elapsedBeforePauseRef = useRef<number>(0);

    useEffect(() => {
        // Reset ended state when URI changes
        setHasEnded(false);
        setHasStartedPlaying(false); // Reset playing state
        elapsedBeforePauseRef.current = 0;
        pausedAtRef.current = 0;
    }, [uri]);

    // ⏰ Custom duration timer: بعد از duration مشخص شده، force advance
    // ⚠️ CRITICAL: فقط وقتی timer رو شروع کن که ویدیو واقعاً شروع به پخش کرده باشه
    useEffect(() => {
        console.log("[VideoPlayer] Duration timer effect:", {
            hasEnded,
            duration,
            hasStartedPlaying,
            isPaused,
            elapsedBeforePause: elapsedBeforePauseRef.current,
        });

        // Clear existing timer
        if (durationTimerRef.current) {
            console.log("[VideoPlayer] Clearing existing timer");
            clearTimeout(durationTimerRef.current);
            durationTimerRef.current = null;
        }

        // اگر ended شده یا duration نداریم یا هنوز پخش نشده، timer نزن
        if (hasEnded || duration <= 0 || !hasStartedPlaying) {
            console.log("[VideoPlayer] Skipping timer:", { hasEnded, duration, hasStartedPlaying });
            return;
        }

        if (isPaused) {
            console.log("[VideoPlayer] Video is paused, not starting timer");
            // وقتی pause میشه، وقت سپری شده رو ذخیره کن
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
        console.log("[VideoPlayer] Starting duration timer:", {
            duration,
            elapsedBeforePause: elapsedBeforePauseRef.current,
            remainingTime,
            timeoutMs: remainingTime * 1000,
        });

        durationTimerRef.current = setTimeout(() => {
            console.log("[VideoPlayer] Duration timer expired, calling handleEnd");
            handleEnd();
        }, remainingTime * 1000);

        // Track elapsed time
        const trackingInterval = setInterval(() => {
            if (!isPaused && hasStartedPlaying) {
                elapsedBeforePauseRef.current += 0.1;
                console.log("[VideoPlayer] Elapsed time:", elapsedBeforePauseRef.current.toFixed(1), "s");
            }
        }, 100);

        return () => {
            console.log("[VideoPlayer] Cleaning up duration timer");
            if (durationTimerRef.current) {
                clearTimeout(durationTimerRef.current);
                durationTimerRef.current = null;
            }
            clearInterval(trackingInterval);
        };
    }, [uri, duration, isPaused, hasEnded, hasStartedPlaying]);

    const handleEnd = () => {
        console.log("[VideoPlayer] 🎬 handleEnd called:", {
            hasEnded,
            hasStartedPlaying,
            elapsedBeforePause: elapsedBeforePauseRef.current,
            duration,
        });
        if (!hasEnded) {
            console.log("[VideoPlayer] ✅ Setting hasEnded=true and calling onEnded (advance to next)");
            setHasEnded(true);
            // Clear timer
            if (durationTimerRef.current) {
                clearTimeout(durationTimerRef.current);
                durationTimerRef.current = null;
            }
            onEnded();
        } else {
            console.log("[VideoPlayer] ⚠️ handleEnd called but already ended, ignoring");
        }
    };

    const handleError = (error: any) => {
        onError?.(error);
    };

    // Track progress for countdown
    const handleVideoProgress = (data: any) => {
        console.log("[VideoPlayer] Progress:", {
            currentTime: data.currentTime,
            isPaused,
            hasStartedPlaying,
            duration,
            hasEnded,
        });

        // اگر ویدیو progress داره و pause نیست، یعنی واقعاً پخش شده
        if (!isPaused && data.currentTime > 0 && !hasStartedPlaying) {
            console.log("[VideoPlayer] ✅ Video started playing! currentTime:", data.currentTime);
            setHasStartedPlaying(true);
            // Reset elapsed time چون تازه شروع شده
            elapsedBeforePauseRef.current = 0;
        }

        // ⚠️ CRITICAL: اگر ویدیو به duration رسیده یا ازش گذشته، advance کن
        // این چک باید قبل از onProgress باشه تا اگه duration رسید، advance کنه
        if (!hasEnded && hasStartedPlaying && !isPaused && data.currentTime >= duration) {
            console.log("[VideoPlayer] ⏰ Video reached duration limit via progress!", {
                currentTime: data.currentTime,
                duration,
                difference: data.currentTime - duration,
            });
            handleEnd();
            return; // Return early تا onProgress صدا زده نشه
        }

        if (onProgress && !isPaused && !hasEnded) {
            onProgress(data.currentTime);
        }
    };

    // Track if we've already tried to seek (prevent infinite loop)
    const hasSeekedRef = useRef(false);

    useEffect(() => {
        // Reset seek flag when URI changes
        hasSeekedRef.current = false;
    }, [uri]);

    // Handle video load - فقط یکبار seek کن
    const handleLoad = () => {
        console.log("[VideoPlayer] Video loaded, isPaused:", isPaused, "hasSeeked:", hasSeekedRef.current);
        if (!isPaused && videoRef.current && !hasSeekedRef.current) {
            hasSeekedRef.current = true;
            // فقط یکبار seek کن برای اطمینان از شروع پخش
            setTimeout(() => {
                if (videoRef.current && !isPaused) {
                    console.log("[VideoPlayer] Seeking to start (one time only)");
                    videoRef.current.seek(0);
                }
            }, 100);
        }
    };

    // Handle ready for display - حذف شد چون باعث infinite loop میشد
    // const handleReadyForDisplay = () => {
    //     // حذف شد - این callback مدام صدا زده میشه و seek(0) باعث reset شدن ویدیو میشه
    // };

    return (
        <View style={styles.container}>
            <Video
                key={uri} // Force re-render when URI changes
                ref={videoRef}
                source={{ uri }}
                style={styles.video}
                resizeMode="cover"
                repeat={false}
                paused={isPaused}
                muted={false}
                volume={1.0}
                playInBackground={false}
                playWhenInactive={false}
                onLoad={handleLoad}
                onEnd={handleEnd}
                onError={handleError}
                onProgress={handleVideoProgress}
                ignoreSilentSwitch="ignore"
                controls={false}
                poster={undefined}
                posterResizeMode="cover"
                progressUpdateInterval={250}
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
