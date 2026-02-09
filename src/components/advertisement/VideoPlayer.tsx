/**
 * Video Player Component
 * با custom duration control - ویدیو بعد از duration مشخص شده متوقف میشه
 */
import React, { useRef, useEffect, useState, useCallback } from "react";
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
    const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
    const durationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pausedAtRef = useRef<number>(0);
    const elapsedBeforePauseRef = useRef<number>(0);
    const previousUriRef = useRef<string>("");

    // Reset state when URI changes
    useEffect(() => {
        if (previousUriRef.current !== uri) {
            previousUriRef.current = uri;

            // Reset all state
            setHasEnded(false);
            setHasStartedPlaying(false);
            elapsedBeforePauseRef.current = 0;
            pausedAtRef.current = 0;

            // Clear any existing timers
            if (durationTimerRef.current) {
                clearTimeout(durationTimerRef.current);
                durationTimerRef.current = null;
            }
        }
    }, [uri]);

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

        // اگر ended شده یا duration نداریم یا هنوز پخش نشده، timer نزن
        if (hasEnded || duration <= 0 || !hasStartedPlaying) {
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
            if (!isPaused && hasStartedPlaying) {
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
    }, [uri, duration, isPaused, hasEnded, hasStartedPlaying, handleEnd]);

    const handleError = (error: any) => {
        onError?.(error);
    };

    // Track progress for countdown
    const handleVideoProgress = useCallback((data: any) => {
        // Check if URI has changed (prevent old video progress from affecting new video)
        if (previousUriRef.current !== uri) {
            return;
        }

        // اگر ویدیو progress داره و pause نیست، یعنی واقعاً پخش شده
        if (!isPaused && data.currentTime > 0 && !hasStartedPlaying) {
            setHasStartedPlaying(true);
            elapsedBeforePauseRef.current = 0;
        }

        // ⚠️ CRITICAL: اگر ویدیو به duration رسیده یا ازش گذشته، advance کن
        if (!hasEnded && hasStartedPlaying && !isPaused && data.currentTime >= duration) {
            handleEnd();
            return;
        }

        if (onProgress && !isPaused && !hasEnded) {
            onProgress(data.currentTime);
        }
    }, [uri, isPaused, hasStartedPlaying, hasEnded, duration, handleEnd, onProgress]);

    return (
        <View style={styles.container}>
            <Video
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
                onEnd={handleEnd}
                onError={handleError}
                onProgress={handleVideoProgress}
                ignoreSilentSwitch="ignore"
                controls={false}
                poster={undefined}
                posterResizeMode="cover"
                progressUpdateInterval={250}
                bufferConfig={{
                    minBufferMs: 1000,
                    maxBufferMs: 5000,
                    bufferForPlaybackMs: 500,
                    bufferForPlaybackAfterRebufferMs: 1000,
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
