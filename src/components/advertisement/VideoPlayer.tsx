/**
 * Video Player Component
 * با custom duration control - ویدیو بعد از duration مشخص شده متوقف میشه
 */
import React, { useRef, useEffect, useState } from 'react';
import { View, StyleSheet } from 'react-native';
import Video, { type VideoRef } from 'react-native-video';

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
    const durationTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pausedAtRef = useRef<number>(0);
    const elapsedBeforePauseRef = useRef<number>(0);

    useEffect(() => {
        // Reset ended state when URI changes
        setHasEnded(false);
        elapsedBeforePauseRef.current = 0;
        pausedAtRef.current = 0;
    }, [uri]);

    // ⏰ Custom duration timer: بعد از duration مشخص شده، force advance
    useEffect(() => {
        // Clear existing timer
        if (durationTimerRef.current) {
            clearTimeout(durationTimerRef.current);
            durationTimerRef.current = null;
        }

        // اگر ended شده یا duration نداریم، timer نزن
        if (hasEnded || duration <= 0) return;

        if (isPaused) {
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

        durationTimerRef.current = setTimeout(() => {
            handleEnd();
        }, remainingTime * 1000);

        // Track elapsed time
        const trackingInterval = setInterval(() => {
            if (!isPaused) {
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
    }, [uri, duration, isPaused, hasEnded]);

    const handleEnd = () => {
        if (!hasEnded) {
            setHasEnded(true);
            onEnded();
        }
    };

    const handleError = (error: any) => {
        onError?.(error);
    };

    // Track progress for countdown
    const handleVideoProgress = (data: any) => {
        if (onProgress && !isPaused) {
            onProgress(data.currentTime);
        }
    };

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
            />
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
    },
    video: {
        position: 'absolute',
        top: 0,
        left: 0,
        bottom: 0,
        right: 0,
    },
});
