/**
 * Advertisement Component
 * Offline-First Strategy با Progressive Loading
 * - بلافاصله cached videos رو نشون میده
 * - در background manifest جدید رو fetch می‌کنه
 * - هر ویدیویی که دانلود شد، بلافاصله قابل نمایش میشه
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, StyleSheet, Text, ActivityIndicator } from "react-native";
import { useDeviceManifest, useOnlineStatus } from "@/src/hooks";
import { usePlaylistTimer } from "@/src/hooks/advertisement/usePlaylistTimer";
import { useRadarSensor } from "@/src/hooks/advertisement/useRadarSensor";
import { cacheManager } from "@/src/utils/cache/cacheManager";
import { VideoPlayer } from "./VideoPlayer";
import { ImageDisplay } from "./ImageDisplay";
import { Image } from "expo-image";
import type { ContentItemResource, PlaylistItemResource } from "@/src/types/api.types";

// Extended type با duration محاسبه شده (برای display)
interface DisplayContentItem {
    id: string;
    title: string;
    type: string;
    file_url: string;
    media_url: string; // alias for file_url
    duration: number; // محاسبه شده از playlistItem.duration || content.duration_sec
    duration_sec: number;
    resolution?: string | null;
    aspect_ratio?: string | null;
    metadata?: Record<string, unknown> | null;
    status: string;
    expires_at?: string | null;
    is_expired: boolean;
    creator: { id?: string | null; name?: string | null };
    created_at: string;
    updated_at: string;
}

export const Advertisement: React.FC = () => {
    const { data: manifest, isLoading, error } = useDeviceManifest();
    const { isPresence, isConnected: isSensorConnected, distance, statusText } = useRadarSensor();
    const { isOnline, connectionType } = useOnlineStatus();
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isPaused, setIsPaused] = useState(false);
    const [isInitialized, setIsInitialized] = useState(false);
    const [localPaths, setLocalPaths] = useState<Map<string, string>>(new Map());
    const [downloadStatus, setDownloadStatus] = useState<Map<string, "downloading" | "ready" | "error">>(new Map());
    const [retryCount, setRetryCount] = useState<Map<string, number>>(new Map());
    const [videoProgress, setVideoProgress] = useState(0);
    const [remainingTime, setRemainingTime] = useState(0);
    // REMOVED: videoKey - no longer needed since we don't remount VideoPlayer

    // Track playlist ID to detect changes
    const currentPlaylistIdRef = useRef<string | null>(null);
    const itemStartTimeRef = useRef<number>(0);
    const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // Extract playlist from manifest
    const playlist = manifest?.playlist;

    // اگر سنسور وصل نیست، همیشه پخش کن (Auto-Play Mode)
    const shouldPlay = !isSensorConnected || isPresence;

    // ========================================================================
    // 1. OFFLINE-FIRST: بلافاصله cache رو لود کن
    // ========================================================================

    useEffect(() => {
        const initCache = async () => {
            try {
                await cacheManager.initialize();
                setIsInitialized(true);
            } catch (error) {
                setIsInitialized(true); // ادامه بده حتی با خطا
            }
        };

        initCache();
    }, []); // فقط یکبار، مستقل از playlist

    // ========================================================================
    // 2. PROGRESSIVE LOADING: هر ویدیو که دانلود شد، بلافاصله اضافه کن
    // ========================================================================

    useEffect(() => {
        if (!playlist?.items || !isInitialized) return;

        const playlistId = playlist.id;

        // اگر playlist عوض شد، reset کن
        if (currentPlaylistIdRef.current !== playlistId) {
            currentPlaylistIdRef.current = playlistId;
            setCurrentIndex(0);
            setLocalPaths(new Map());
            setDownloadStatus(new Map());
        }

        const items = playlist.items;

        // بلافاصله cached files رو شناسایی کن
        const loadCachedFiles = async () => {
            const paths = new Map<string, string>();
            const status = new Map<string, "downloading" | "ready" | "error">();

            for (const playlistItem of items) {
                const content = playlistItem.content;
                const url = content.file_url;
                const localPath = cacheManager.getCachedPath(url);

                if (localPath) {
                    // فایل کش شده پیدا شد
                    paths.set(content.id.toString(), localPath);
                    status.set(url, "ready");
                } else {
                    // فایل کش نشده، باید دانلود بشه
                    status.set(url, "downloading");
                }
            }

            setLocalPaths(paths);
            setDownloadStatus(status);

            // اگر هیچ فایلی کش نشده، شروع به دانلود کن
            const needsDownload = items.filter((item) => !paths.has(item.content.id.toString()));

            if (needsDownload.length > 0) {
                downloadItemsProgressively(needsDownload);
            }
        };

        loadCachedFiles();
    }, [playlist?.id, playlist?.items, isInitialized]);

    // Progressive download: هر ویدیو که دانلود شد، بلافاصله اضافه کن
    // ⚠️ هیچ وقت فایل‌های کش شده رو دوباره دانلود نمی‌کنیم
    const downloadItemsProgressively = async (items: PlaylistItemResource[]) => {
        for (const playlistItem of items) {
            const content = playlistItem.content;
            const url = content.file_url;

            try {
                // ⛔ CRITICAL: چک کن فایل کش شده یا نه - دوباره دانلود نکن
                const needsUpdate = cacheManager.needsUpdate(url, content.updated_at);

                if (!needsUpdate) {
                    // فایل کش شده و به‌روز است
                    const cachedPath = cacheManager.getCachedPath(url);
                    if (cachedPath) {
                        setLocalPaths((prev) => new Map(prev).set(content.id.toString(), cachedPath));
                        setDownloadStatus((prev) => new Map(prev).set(url, "ready"));
                    }
                    continue;
                }

                // فایل جدید است یا کش نشده - دانلود کن
                setDownloadStatus((prev) => new Map(prev).set(url, "downloading"));

                const localPath = await cacheManager.cacheFile(url, content.type === "video" ? "video" : "image", content.id.toString(), content.updated_at);

                // بلافاصله به state اضافه کن تا قابل نمایش بشه
                setLocalPaths((prev) => {
                    const newPaths = new Map(prev);
                    newPaths.set(content.id.toString(), localPath);
                    return newPaths;
                });
                setDownloadStatus((prev) => {
                    const newStatus = new Map(prev);
                    newStatus.set(url, "ready");
                    return newStatus;
                });
            } catch (error) {
                // Track retry count
                const currentRetries = retryCount.get(url) || 0;
                setRetryCount((prev) => new Map(prev).set(url, currentRetries + 1));

                setDownloadStatus((prev) => {
                    const newStatus = new Map(prev);
                    newStatus.set(url, "error");
                    return newStatus;
                });
            }
        }
    };

    // ========================================================================
    // RETRY MECHANISM: هر 10 ثانیه failed downloads رو دوباره امتحان کن
    // ========================================================================

    useEffect(() => {
        if (!playlist?.items || !isOnline) return;

        // Clear existing interval
        if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current);
        }

        retryIntervalRef.current = setInterval(() => {
            const items = playlist.items || [];
            const failedItems: PlaylistItemResource[] = [];

            for (const playlistItem of items) {
                const url = playlistItem.content.file_url;
                const status = downloadStatus.get(url);
                const retries = retryCount.get(url) || 0;

                // اگر error داره و کمتر از 5 بار retry شده
                if (status === "error" && retries < 5) {
                    failedItems.push(playlistItem);
                }
            }

            if (failedItems.length > 0) {
                downloadItemsProgressively(failedItems);
            }
        }, 10 * 1000); // هر 10 ثانیه

        return () => {
            if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
            }
        };
    }, [playlist?.id, downloadStatus, retryCount, isOnline]);

    // ========================================================================
    // 3. AUTO-PLAY: سنسور optional است
    // ========================================================================

    // Pause/Resume based on sensor
    useEffect(() => {
        const newPausedState = !shouldPlay;
        setIsPaused(newPausedState);
    }, [shouldPlay, isPresence, isSensorConnected]);

    // ========================================================================
    // Current Item
    // ========================================================================

    // Get ready items (فقط آیتم‌هایی که localPath دارن)
    const readyItems = useMemo(() => {
        const items = playlist?.items || [];
        return items.filter((item) => localPaths.has(item.content.id.toString()));
    }, [playlist?.items, localPaths.size]);

    // Get current item from ready items
    const currentItem: DisplayContentItem | null = useMemo(() => {
        if (!readyItems.length) return null;

        const safeIndex = Math.min(currentIndex, readyItems.length - 1);
        const playlistItem = readyItems[safeIndex];
        if (!playlistItem) return null;

        const content = playlistItem.content;
        if (!content) return null;

        // محاسبه duration: اولویت با playlistItem.duration، بعد content.duration_sec
        const itemDuration = playlistItem.duration || content.duration_sec || 10;

        return {
            ...content,
            media_url: content.file_url,
            duration: itemDuration,
            id: content.id.toString(),
        } as DisplayContentItem;
    }, [readyItems, currentIndex]);

    // Advance to next item
    const advanceToNext = useCallback(() => {
        if (!readyItems.length) {
            return;
        }

        const nextIndex = (currentIndex + 1) % readyItems.length;

        setCurrentIndex(nextIndex);
        setVideoProgress(0);
        setRemainingTime(0);
        itemStartTimeRef.current = Date.now();
    }, [currentIndex, readyItems.length, readyItems, currentItem?.id]);

    // Track item start time - برای ویدیو و عکس
    useEffect(() => {
        // Reset وقتی آیتم عوض شد
        itemStartTimeRef.current = Date.now();
        setVideoProgress(0);
        setRemainingTime(currentItem?.duration || 0);
    }, [currentIndex, currentItem?.id]);

    // Update remaining time countdown - فقط وقتی ویدیو واقعاً پخش شده
    useEffect(() => {
        if (!currentItem || isPaused) {
            return;
        }

        // اگر ویدیو هست و هنوز progress نداره، timer رو شروع نکن
        if (currentItem.type === "video" && videoProgress === 0) {
            setRemainingTime(currentItem.duration || 0);
            return;
        }

        const interval = setInterval(() => {
            if (currentItem.type === "video") {
                // برای ویدیو، از videoProgress استفاده کن (از VideoPlayer میاد)
                const remaining = Math.max(0, (currentItem.duration || 0) - videoProgress);
                setRemainingTime(remaining);
            } else {
                // برای عکس، از elapsed time استفاده کن
                const elapsed = (Date.now() - itemStartTimeRef.current) / 1000;
                const remaining = Math.max(0, (currentItem.duration || 0) - elapsed);
                setRemainingTime(remaining);
            }
        }, 100); // Update هر 100ms برای smooth countdown

        return () => clearInterval(interval);
    }, [currentItem?.id, currentItem?.duration, currentItem?.type, isPaused, videoProgress]);

    // Video progress handler
    const handleVideoProgress = useCallback(
        (currentTime: number) => {
            setVideoProgress(currentTime);
        },
        [currentItem?.id, currentItem?.duration],
    );

    // Get local path for current item
    const localPath = currentItem ? localPaths.get(currentItem.id.toString()) : null;

    // Auto-advance timer for images (video خودش timer داره)
    usePlaylistTimer({
        duration: currentItem?.type === "image" ? currentItem.duration || 10 : 0,
        enabled: currentItem?.type === "image" && !isPaused && isInitialized && !!localPath, // فقط وقتی عکس آماده باشه
        onAdvance: advanceToNext,
    });

    // وقتی ویدیو جدید لود شد، مطمئن شو که play میشه (اگر نباید pause باشه)
    useEffect(() => {
        if (currentItem && localPath && currentItem.type === "video") {
            // اگر نباید pause باشه، مطمئن شو که play میشه
            if (shouldPlay && isPaused) {
                setIsPaused(false);
            }
        }
    }, [currentItem?.id, localPath, shouldPlay, isPaused]);

    // ========================================================================
    // Render States
    // ========================================================================

    // Fallback: هیچ آیتمی در playlist نیست → نمایش عکس fallback
    if (!isLoading && !playlist?.items?.length) {
        return (
            <View style={styles.fallbackContainer}>
                <Image source={require("../../../assets/images/fallback-advertisement.png")} style={styles.fallbackImage} contentFit="cover" transition={300} />
            </View>
        );
    }

    // Loading: نمایش زیبا با gradient
    if (!isInitialized) {
        return (
            <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#4CAF50" />
                <Text style={styles.loadingText}>در حال بارگذاری...</Text>
            </View>
        );
    }

    // Waiting for first item - نمایش progress
    if (!currentItem || !localPath) {
        const totalItems = playlist?.items?.length || 0;
        const readyCount = readyItems.length;
        const percentage = totalItems > 0 ? Math.round((readyCount / totalItems) * 100) : 0;

        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingContent}>
                    <ActivityIndicator size="large" color="#4CAF50" />
                    <Text style={styles.loadingText}>{totalItems > 0 ? "در حال دانلود محتوا..." : "در انتظار محتوا..."}</Text>
                    {totalItems > 0 && (
                        <>
                            <Text style={styles.loadingProgress}>
                                {readyCount} از {totalItems} آماده
                            </Text>
                            {/* Progress Bar */}
                            <View style={styles.progressBar}>
                                <View style={[styles.progressFill, { width: `${percentage}%` }]} />
                            </View>
                            <Text style={styles.loadingPercentage}>{percentage}%</Text>
                        </>
                    )}
                </View>
            </View>
        );
    }

    return (
        <View style={styles.container}>
            {currentItem.type === "video" ? (
                <VideoPlayer
                    // REMOVED: key prop - single instance handles URI changes via source prop
                    uri={localPath}
                    duration={currentItem.duration}
                    onEnded={advanceToNext}
                    isPaused={isPaused}
                    onProgress={handleVideoProgress}
                />
            ) : (
                <ImageDisplay key={`${currentItem.id}-${currentIndex}`} uri={localPath || ""} />
            )}

            {/* Debug Overlay */}
            {__DEV__ && (
                <View style={styles.debugOverlay}>
                    <Text style={styles.debugText}>
                        📹 {currentItem.title} ({currentIndex + 1}/{readyItems.length})
                    </Text>
                    <Text style={styles.debugText}>⏱️ Duration: {currentItem.duration}s</Text>

                    <Text style={[styles.debugText, styles.timerText]}>⏳ Remaining: {remainingTime.toFixed(1)}s</Text>
                    {currentItem.type === "video" && <Text style={styles.debugText}>📼 Video: {videoProgress.toFixed(1)}s</Text>}
                    <Text style={styles.debugText}>{isPaused ? "⏸️ PAUSED" : "▶️ PLAYING"}</Text>
                    <View style={styles.separator} />

                    <Text style={[styles.debugText, isOnline ? styles.onlineText : styles.offlineText]}>
                        {isOnline ? "🟢 Online" : "🔴 Offline"} ({connectionType})
                    </Text>
                    <View style={styles.separator} />
                    <Text style={styles.debugText}>🎯 Sensor: {isSensorConnected ? "✅ Connected" : "❌ Not Connected"}</Text>
                    {isSensorConnected && (
                        <>
                            <Text style={styles.debugText}>👤 Presence: {isPresence ? "✅ YES" : "❌ NO"}</Text>
                            <Text style={styles.debugText}>📏 Distance: {distance}cm</Text>
                            <Text style={styles.debugText}>📊 {statusText}</Text>
                        </>
                    )}
                    {!isSensorConnected && <Text style={styles.debugText}>🎬 Auto-Play Mode</Text>}
                    <View style={styles.separator} />
                    <Text style={styles.debugText}>
                        📦 Ready: {readyItems.length}/{playlist?.items?.length || 0}
                    </Text>
                    {(playlist?.items?.length || 0) > readyItems.length && <Text style={styles.downloadingText}>⬇️ Downloading...</Text>}
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#000",
        borderRadius: 14,
        overflow: "hidden",
    },
    fallbackContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
        borderRadius: 14,
        overflow: "hidden",
    },
    fallbackImage: {
        width: "100%",
        height: "100%",
    },
    loadingContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#1a1a1a",
        borderRadius: 14,
        overflow: "hidden",
    },
    loadingContent: {
        alignItems: "center",
        padding: 30,
        backgroundColor: "rgba(255,255,255,0.05)",
        borderRadius: 14,
        minWidth: 280,
    },
    loadingText: {
        color: "#fff",
        fontSize: 18,
        marginTop: 20,
        fontFamily: "YekanBakh-Regular",
    },
    loadingProgress: {
        color: "#aaa",
        fontSize: 14,
        marginTop: 12,
        fontFamily: "YekanBakh-Regular",
    },
    progressBar: {
        width: 200,
        height: 6,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 3,
        marginTop: 16,
        overflow: "hidden",
    },
    progressFill: {
        height: "100%",
        backgroundColor: "#4CAF50",
        borderRadius: 3,
    },
    loadingPercentage: {
        color: "#4CAF50",
        fontSize: 16,
        marginTop: 8,
        fontFamily: "YekanBakh-SemiBold",
    },
    emptyContainer: {
        flex: 1,
        justifyContent: "center",
        alignItems: "center",
        backgroundColor: "#000",
        borderRadius: 14,
        overflow: "hidden",
    },
    emptyText: {
        color: "#fff",
        fontSize: 18,
        fontFamily: "YekanBakh-Regular",
    },
    debugOverlay: {
        position: "absolute",
        top: 10,
        left: 10,
        backgroundColor: "rgba(0,0,0,0.85)",
        padding: 10,
        borderRadius: 8,
        minWidth: 200,
    },
    debugText: {
        color: "#fff",
        fontSize: 11,
        fontFamily: "YekanBakh-Regular",
        marginBottom: 3,
    },
    timerText: {
        color: "#4CAF50",
        fontWeight: "bold",
        fontSize: 12,
    },
    onlineText: {
        color: "#4CAF50",
    },
    offlineText: {
        color: "#F44336",
    },
    separator: {
        height: 1,
        backgroundColor: "rgba(255,255,255,0.3)",
        marginVertical: 6,
    },
    downloadingText: {
        color: "#FFA726",
        fontSize: 11,
        fontFamily: "YekanBakh-Regular",
        marginTop: 3,
    },
});
