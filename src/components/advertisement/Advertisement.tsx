/**
 * Advertisement Component
 * Offline-First Strategy با Progressive Loading
 * - بلافاصله cached videos رو نشون میده
 * - در background manifest جدید رو fetch می‌کنه
 * - هر ویدیویی که دانلود شد، بلافاصله قابل نمایش میشه
 */
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { View, StyleSheet, Text, ActivityIndicator, TouchableOpacity, Alert } from "react-native";
import { useDeviceManifest, useOnlineStatus } from "@/src/hooks";
import { usePlaylistTimer } from "@/src/hooks/advertisement/usePlaylistTimer";
import { useRadarSensor } from "@/src/hooks/advertisement/useRadarSensor";
import { cacheManager } from "@/src/utils/cache/cacheManager";
import { VideoPlayer } from "./VideoPlayer";
import { ImageDisplay } from "./ImageDisplay";
import { images } from "@/src/assets";
import { Image } from "expo-image";
import type { ManifestContentItem } from "@/src/types/api.types";

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
    const [downloadProgress, setDownloadProgress] = useState<Map<string, number>>(new Map()); // درصد دانلود هر آیتم
    const [retryCount, setRetryCount] = useState<Map<string, number>>(new Map());
    const [videoProgress, setVideoProgress] = useState(0);
    const [remainingTime, setRemainingTime] = useState(0);
    // Track play count برای هر ویدیو - وقتی advanceToNext صدا زده میشه، افزایش پیدا می‌کنه
    // این باعث میشه که اگر همون ویدیو دوباره اومد (مثلاً تو لوپ)، دوباره mount بشه
    const playCountRef = useRef<Map<string, number>>(new Map());
    
    // Concurrent downloads management
    const MAX_CONCURRENT_DOWNLOADS = 2; // حداکثر 2 دانلود همزمان
    const activeDownloadsRef = useRef<Set<string>>(new Set()); // URLs در حال دانلود
    const downloadQueueRef = useRef<ManifestContentItem[]>([]); // Queue برای دانلودهای pending

    // Track playlist ID to detect changes
    const currentPlaylistIdRef = useRef<string | null>(null);
    const itemStartTimeRef = useRef<number>(0);
    const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

    // منبع محتوا: مستقیم از data.content
    const contentItems = useMemo<ManifestContentItem[]>(() => manifest?.content ?? [], [manifest?.content]);

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
        if (!contentItems.length || !isInitialized) return;

        const contentKey = manifest?.device_id ?? "content";

        // اگر منبع عوض شد، reset کن
        if (currentPlaylistIdRef.current !== contentKey) {
            currentPlaylistIdRef.current = contentKey;
            setCurrentIndex(0);
            setLocalPaths(new Map());
            setDownloadStatus(new Map());
            setDownloadProgress(new Map()); // reset progress
            // Reset play count وقتی playlist تغییر کرد
            playCountRef.current.clear();
        }

        // بلافاصله cached files رو شناسایی کن
        const loadCachedFiles = async () => {
            const paths = new Map<string, string>();
            const status = new Map<string, "downloading" | "ready" | "error">();

            for (const item of contentItems) {
                const url = item.file_url;
                const localPath = cacheManager.getCachedPath(url);

                if (localPath) {
                    paths.set(item.id, localPath);
                    status.set(url, "ready");
                }
                // اگر cache نداره، status رو set نکن - بذار retry mechanism تصمیم بگیره
            }

            setLocalPaths(paths);
            // فقط status های ready رو set کن، بقیه رو نگه دار (برای حفظ error status)
            setDownloadStatus((prev) => {
                const newStatus = new Map(prev);
                status.forEach((value, key) => {
                    newStatus.set(key, value);
                });
                return newStatus;
            });

            const needsDownload = contentItems.filter((item) => !paths.has(item.id));
            if (needsDownload.length > 0 && isOnline) {
                // فقط اگر آنلاین هستیم، دانلود کن
                downloadItemsProgressively(needsDownload);
            }
        };

        loadCachedFiles();
    }, [manifest?.device_id, contentItems, isInitialized, isOnline]);

    // Progressive download با concurrent download management
    // ⚠️ هیچ وقت فایل‌های کش شده رو دوباره دانلود نمی‌کنیم
    const downloadItemsProgressively = async (items: ManifestContentItem[]) => {
        // اول چک کن کدوم‌ها cache شده‌اند
        const itemsToDownload: ManifestContentItem[] = [];
        
        for (const item of items) {
            const url = item.file_url;
            const updatedAt = item.updated_at ?? "0";
            const needsUpdate = cacheManager.needsUpdate(url, updatedAt);

            if (!needsUpdate) {
                const cachedPath = cacheManager.getCachedPath(url);
                if (cachedPath) {
                    setLocalPaths((prev) => new Map(prev).set(item.id, cachedPath));
                    setDownloadStatus((prev) => new Map(prev).set(url, "ready"));
                }
                continue;
            }

            // اگر در حال دانلود است، skip کن
            if (activeDownloadsRef.current.has(url)) {
                continue;
            }

            itemsToDownload.push(item);
        }

        // Process downloads با rate limiting
        const processDownload = async (item: ManifestContentItem) => {
            const url = item.file_url;
            const updatedAt = item.updated_at ?? "0";

            // اگر در حال دانلود است، skip کن
            if (activeDownloadsRef.current.has(url)) {
                return;
            }

            // Check concurrent limit
            if (activeDownloadsRef.current.size >= MAX_CONCURRENT_DOWNLOADS) {
                downloadQueueRef.current.push(item);
                return;
            }

            activeDownloadsRef.current.add(url);

            try {
                setDownloadStatus((prev) => new Map(prev).set(url, "downloading"));
                setDownloadProgress((prev) => new Map(prev).set(item.id, 0));
                console.log(`[Advertisement] 📥 Starting download: ${item.title || item.id} (${item.type})`);

                const localPath = await cacheManager.cacheFile(
                    url,
                    item.type === "video" ? "video" : "image",
                    item.id,
                    updatedAt,
                    (progress) => {
                        setDownloadProgress((prev) => {
                            const newProgress = new Map(prev);
                            newProgress.set(item.id, Math.round(progress.percentage));
                            return newProgress;
                        });
                    },
                );

                setLocalPaths((prev) => {
                    const newPaths = new Map(prev);
                    newPaths.set(item.id, localPath);
                    return newPaths;
                });
                setDownloadStatus((prev) => {
                    const newStatus = new Map(prev);
                    newStatus.set(url, "ready");
                    return newStatus;
                });
                setDownloadProgress((prev) => {
                    const newProgress = new Map(prev);
                    newProgress.set(item.id, 100);
                    return newProgress;
                });
                setRetryCount((prev) => {
                    const newRetries = new Map(prev);
                    newRetries.delete(url); // Reset retry count on success
                    return newRetries;
                });
            } catch (error: any) {
                const currentRetries = retryCount.get(url) || 0;
                const newRetryCount = currentRetries + 1;
                setRetryCount((prev) => new Map(prev).set(url, newRetryCount));
                setDownloadStatus((prev) => {
                    const newStatus = new Map(prev);
                    newStatus.set(url, "error");
                    return newStatus;
                });
                setDownloadProgress((prev) => {
                    const newProgress = new Map(prev);
                    newProgress.delete(item.id);
                    return newProgress;
                });

                // Handle specific errors
                const errorMessage = error?.message || String(error);
                if (errorMessage.includes('timeout')) {
                    console.warn(`[Advertisement] ⏱️ Download timeout: ${item.title || item.id} (attempt ${newRetryCount}/10)`);
                } else if (errorMessage.includes('Storage full') || errorMessage.includes('ENOSPC')) {
                    console.warn(`[Advertisement] 💾 Storage full: ${item.title || item.id}`);
                } else {
                    console.warn(`[Advertisement] ❌ Download failed: ${item.title || item.id} (attempt ${newRetryCount}/10)`, error);
                }

                // Cancel download if timeout
                if (errorMessage.includes('timeout')) {
                    try {
                        await cacheManager.cancelDownload(url);
                    } catch (cancelError) {
                        // Ignore cancel errors
                    }
                }
            } finally {
                activeDownloadsRef.current.delete(url);

                // Process next item in queue
                if (downloadQueueRef.current.length > 0 && activeDownloadsRef.current.size < MAX_CONCURRENT_DOWNLOADS) {
                    const nextItem = downloadQueueRef.current.shift();
                    if (nextItem) {
                        processDownload(nextItem);
                    }
                }
            }
        };

        // Start downloads (up to MAX_CONCURRENT_DOWNLOADS)
        const initialBatch = itemsToDownload.slice(0, MAX_CONCURRENT_DOWNLOADS);
        const remainingItems = itemsToDownload.slice(MAX_CONCURRENT_DOWNLOADS);
        downloadQueueRef.current.push(...remainingItems);

        // Start initial batch
        initialBatch.forEach((item) => {
            processDownload(item);
        });
    };

    // ========================================================================
    // RETRY MECHANISM: هر 10 ثانیه failed downloads و آیتم‌های دانلود نشده رو دوباره امتحان کن
    // ========================================================================

    useEffect(() => {
        if (!contentItems.length || !isOnline) return;

        if (retryIntervalRef.current) {
            clearInterval(retryIntervalRef.current);
        }

        retryIntervalRef.current = setInterval(() => {
            const failedItems: ManifestContentItem[] = [];
            const notDownloadedItems: ManifestContentItem[] = [];

            for (const item of contentItems) {
                const url = item.file_url;
                const status = downloadStatus.get(url);
                const retries = retryCount.get(url) || 0;
                const hasLocalPath = localPaths.has(item.id);

                // آیتم‌هایی که error شده‌اند و کمتر از 10 بار retry شده‌اند
                // با exponential backoff: بعد از 5 retry، فقط هر 30 ثانیه retry کن
                if (status === "error") {
                    if (retries < 5) {
                        failedItems.push(item);
                    } else if (retries < 10) {
                        // Exponential backoff: فقط اگر آخرین retry بیشتر از 30 ثانیه پیش بوده
                        const lastRetryTime = item.updated_at ? new Date(item.updated_at).getTime() : 0;
                        const timeSinceLastRetry = Date.now() - lastRetryTime;
                        if (timeSinceLastRetry > 30 * 1000) {
                            failedItems.push(item);
                        }
                    }
                    // بعد از 10 retry، skip کن (circuit breaker)
                }
                // آیتم‌هایی که هنوز دانلود نشده‌اند (نه ready هستند و نه downloading)
                // اگر status نداره یا undefined هست، یعنی هنوز دانلود نشده
                else if (!hasLocalPath && status !== "downloading" && status !== "ready") {
                    notDownloadedItems.push(item);
                }
            }

            // اول failed items رو retry کن، بعد not downloaded items
            const itemsToDownload = [...failedItems, ...notDownloadedItems];
            if (itemsToDownload.length > 0) {
                console.log(
                    `[Advertisement] 🔄 Retrying ${itemsToDownload.length} items (${failedItems.length} failed, ${notDownloadedItems.length} not downloaded)`,
                );
                downloadItemsProgressively(itemsToDownload);
            }
        }, 10 * 1000);

        return () => {
            if (retryIntervalRef.current) {
                clearInterval(retryIntervalRef.current);
            }
        };
    }, [manifest?.device_id, contentItems, downloadStatus, retryCount, isOnline, localPaths]);

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
        return contentItems.filter((item) => localPaths.has(item.id));
    }, [contentItems, localPaths.size]);

    // Get current item from ready items
    const currentItem: DisplayContentItem | null = useMemo(() => {
        if (!readyItems.length) return null;

        const safeIndex = Math.min(currentIndex, readyItems.length - 1);
        const item = readyItems[safeIndex];
        if (!item) return null;

        const itemDuration = item.duration_sec ?? 10;

        return {
            ...item,
            media_url: item.file_url,
            duration: itemDuration,
            duration_sec: item.duration_sec,
            id: item.id,
        } as DisplayContentItem;
    }, [readyItems, currentIndex]);

    // Advance to next item
    const advanceToNext = useCallback(() => {
        if (!readyItems.length) {
            return;
        }

        // افزایش play count برای ویدیو فعلی
        if (currentItem?.id) {
            const currentCount = playCountRef.current.get(currentItem.id) || 0;
            playCountRef.current.set(currentItem.id, currentCount + 1);
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

    // 🛡️ GUARD: مطمئن شو که ویدیو در حال پخش است وقتی باید باشد
    useEffect(() => {
        // اگر سنسور نیست، همیشه play کن (Auto-Play Mode)
        if (!isSensorConnected) {
            if (isPaused) {
                console.log("[Advertisement] 🛡️ Guard: سنسور نیست، auto-play فعال می‌شود");
                setIsPaused(false);
            }
            return;
        }

        // اگر سنسور وصل است و presence تایید شده و ویدیو آماده است
        if (isSensorConnected && isPresence && currentItem?.type === "video" && localPath) {
            if (isPaused) {
                console.log("[Advertisement] 🛡️ Guard: سنسور تایید شده و ویدیو آماده است، resume می‌کنم");
                setIsPaused(false);
            }
        }
    }, [isSensorConnected, isPresence, currentItem?.type, localPath, isPaused]);

    // 🛡️ GUARD: Periodic check - هر 2 ثانیه چک کن که ویدیو در حال پخش است
    const shouldPlayRef = useRef(shouldPlay);
    const currentItemRef = useRef(currentItem);
    const localPathRef = useRef(localPath);
    
    useEffect(() => {
        shouldPlayRef.current = shouldPlay;
        currentItemRef.current = currentItem;
        localPathRef.current = localPath;
    }, [shouldPlay, currentItem, localPath]);

    useEffect(() => {
        // فقط وقتی ویدیو داریم و نباید pause باشه
        if (!currentItem || currentItem.type !== "video" || !localPath || !shouldPlay) {
            return;
        }

        const guardInterval = setInterval(() => {
            // استفاده از ref برای جلوگیری از stale closure
            if (shouldPlayRef.current && currentItemRef.current?.type === "video" && localPathRef.current) {
                // چک کن که آیا واقعاً pause شده یا نه
                setIsPaused((currentPaused) => {
                    if (currentPaused && shouldPlayRef.current) {
                        console.log("[Advertisement] 🛡️ Guard (Periodic): ویدیو pause شده ولی باید play باشه، resume می‌کنم");
                        return false;
                    }
                    return currentPaused;
                });
            }
        }, 2000); // هر 2 ثانیه چک کن

        return () => clearInterval(guardInterval);
    }, [currentItem?.id, currentItem?.type, localPath, shouldPlay]);

    // ========================================================================
    // Render States
    // ========================================================================

    // Fallback: هیچ آیتمی در content نیست → نمایش عکس fallback
    if (!isLoading && !contentItems.length) {
        return (
            <View style={styles.fallbackContainer}>
                <Image source={images.fallbackAdvertisement} style={styles.fallbackImage} contentFit="cover" transition={300} />
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
        const totalItems = contentItems.length;
        const readyCount = readyItems.length;
        const percentage = totalItems > 0 ? Math.round((readyCount / totalItems) * 100) : 0;

        // پیدا کردن آیتمی که در حال دانلود است
        const downloadingItems = contentItems.filter((item) => {
            const status = downloadStatus.get(item.file_url);
            return status === "downloading";
        });

        // پیدا کردن آیتم‌های failed
        const failedItems = contentItems.filter((item) => {
            const status = downloadStatus.get(item.file_url);
            const retries = retryCount.get(item.file_url) || 0;
            return status === "error" && retries < 5;
        });

        // پیدا کردن آیتم‌های که هنوز دانلود نشده‌اند
        const notDownloadedItems = contentItems.filter((item) => {
            const hasLocalPath = localPaths.has(item.id);
            const status = downloadStatus.get(item.file_url);
            return !hasLocalPath && status !== "downloading" && status !== "ready";
        });

        // اولین آیتم در حال دانلود
        const currentDownloadingItem = downloadingItems[0];
        const currentDownloadProgress = currentDownloadingItem
            ? downloadProgress.get(currentDownloadingItem.id) || 0
            : 0;

        // اگر هیچ آیتمی در حال دانلود نیست اما آیتم‌های failed یا not downloaded وجود دارند
        const hasPendingItems = failedItems.length > 0 || notDownloadedItems.length > 0;
        const isRetrying = hasPendingItems && !currentDownloadingItem;

        // اگر کش نداریم و آنلاین هم نیستیم → نمایش fallback
        const hasNoCacheAndOffline = totalItems > 0 && readyCount === 0 && !isOnline && !currentDownloadingItem && !hasPendingItems;

        // اگر کش نداریم اما آنلاین هستیم → نمایش loading با پیام دانلود
        const hasNoCacheButOnline = totalItems > 0 && readyCount === 0 && isOnline && !currentDownloadingItem;

        return (
            <View style={styles.loadingContainer}>
                <View style={styles.loadingContent}>
                    {/* اگر کش نداریم و آفلاین هستیم → نمایش fallback image */}
                    {hasNoCacheAndOffline ? (
                        <>
                            <Image 
                                source={images.fallbackAdvertisement} 
                                style={styles.fallbackImageInLoading} 
                                contentFit="cover" 
                                transition={300} 
                            />
                            <View style={styles.offlineMessageContainer}>
                                <Text style={styles.offlineMessageTitle}>🔴 آفلاین</Text>
                                <Text style={styles.offlineMessageText}>
                                    برای نمایش محتوا نیاز به اتصال اینترنت دارید
                                </Text>
                                <Text style={styles.offlineMessageSubtext}>
                                    {totalItems} آیتم در انتظار دانلود
                                </Text>
                            </View>
                        </>
                    ) : (
                        <>
                            <ActivityIndicator size="large" color={isRetrying ? "#FFA726" : "#4CAF50"} />
                            <Text style={styles.loadingText}>
                                {hasNoCacheButOnline
                                    ? "در حال دانلود محتوا برای اولین بار..."
                                    : isRetrying
                                      ? "در حال تلاش مجدد برای دانلود..."
                                      : totalItems > 0
                                        ? "در حال دانلود محتوا..."
                                        : "در انتظار محتوا..."}
                            </Text>
                            {totalItems > 0 && (
                                <>
                                    <Text style={styles.loadingProgress}>
                                        {readyCount} از {totalItems} آماده
                                    </Text>
                                    {/* Progress Bar کلی */}
                                    <View style={styles.progressBar}>
                                        <View style={[styles.progressFill, { width: `${percentage}%` }]} />
                                    </View>
                                    <Text style={styles.loadingPercentage}>{percentage}%</Text>

                                    {/* نمایش آیتم در حال دانلود */}
                                    {currentDownloadingItem ? (
                                        <View style={styles.downloadingItemContainer}>
                                            <Text style={styles.downloadingItemTitle}>
                                                {currentDownloadingItem.type === "video" ? "📹" : "🖼️"} {currentDownloadingItem.title || "محتوا"}
                                            </Text>
                                            <View style={styles.downloadingItemProgressBar}>
                                                <View style={[styles.downloadingItemProgressFill, { width: `${currentDownloadProgress}%` }]} />
                                            </View>
                                            <Text style={styles.downloadingItemPercentage}>{currentDownloadProgress}%</Text>
                                        </View>
                                    ) : hasPendingItems ? (
                                        <View style={styles.downloadingItemContainer}>
                                            <Text style={styles.downloadingItemTitle}>
                                                ⏳ در انتظار اتصال اینترنت...
                                            </Text>
                                            {failedItems.length > 0 && (
                                                <Text style={styles.retryInfo}>
                                                    {failedItems.length} آیتم در انتظار تلاش مجدد
                                                </Text>
                                            )}
                                            {notDownloadedItems.length > 0 && (
                                                <Text style={styles.retryInfo}>
                                                    {notDownloadedItems.length} آیتم در انتظار دانلود
                                                </Text>
                                            )}
                                        </View>
                                    ) : null}
                                </>
                            )}
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
                    uri={localPath}
                    duration={currentItem.duration}
                    onEnded={advanceToNext}
                    isPaused={isPaused}
                    onProgress={handleVideoProgress}
                    // Pass playCount برای ویدیوهای تکراری - بدون key برای جلوگیری از remount
                    playCount={currentItem?.id ? (playCountRef.current.get(currentItem.id) || 0) : 0}
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
                        📦 Ready: {readyItems.length}/{contentItems.length}
                    </Text>
                    {contentItems.length > readyItems.length && (
                        <>
                            <Text style={styles.downloadingText}>⬇️ Downloading...</Text>
                            {(() => {
                                const downloadingItems = contentItems.filter((item) => {
                                    const status = downloadStatus.get(item.file_url);
                                    return status === "downloading";
                                });
                                const currentDownloadingItem = downloadingItems[0];
                                const currentDownloadProgress = currentDownloadingItem
                                    ? downloadProgress.get(currentDownloadingItem.id) || 0
                                    : 0;
                                if (currentDownloadingItem) {
                                    return (
                                        <>
                                            <Text style={styles.debugText}>
                                                📥 {currentDownloadingItem.title}: {currentDownloadProgress}%
                                            </Text>
                                        </>
                                    );
                                }
                                return null;
                            })()}
                        </>
                    )}
                    <View style={styles.separator} />
                    <TouchableOpacity
                        style={styles.debugButton}
                        onPress={async () => {
                            Alert.alert(
                                "پاک کردن Cache",
                                "آیا مطمئن هستید که می‌خواهید تمام cache را پاک کنید؟",
                                [
                                    { text: "لغو", style: "cancel" },
                                    {
                                        text: "پاک کردن",
                                        style: "destructive",
                                        onPress: async () => {
                                            try {
                                                await cacheManager.clearCache();
                                                setLocalPaths(new Map());
                                                setDownloadStatus(new Map());
                                                setDownloadProgress(new Map());
                                                setIsInitialized(false);
                                                // Reinitialize
                                                await cacheManager.initialize();
                                                setIsInitialized(true);
                                                Alert.alert("✅", "Cache پاک شد. اپ را refresh کنید.");
                                            } catch (error) {
                                                Alert.alert("❌", `خطا: ${error}`);
                                            }
                                        },
                                    },
                                ],
                            );
                        }}
                    >
                        <Text style={styles.debugButtonText}>🗑️ پاک کردن Cache</Text>
                    </TouchableOpacity>
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
    downloadingItemContainer: {
        marginTop: 24,
        width: "100%",
        alignItems: "center",
    },
    downloadingItemTitle: {
        color: "#fff",
        fontSize: 14,
        fontFamily: "YekanBakh-Regular",
        marginBottom: 12,
        textAlign: "center",
    },
    downloadingItemProgressBar: {
        width: 200,
        height: 4,
        backgroundColor: "rgba(255,255,255,0.1)",
        borderRadius: 2,
        overflow: "hidden",
    },
    downloadingItemProgressFill: {
        height: "100%",
        backgroundColor: "#FFA726",
        borderRadius: 2,
    },
    downloadingItemPercentage: {
        color: "#FFA726",
        fontSize: 12,
        fontFamily: "YekanBakh-SemiBold",
        marginTop: 6,
    },
    retryInfo: {
        color: "#FFA726",
        fontSize: 11,
        fontFamily: "YekanBakh-Regular",
        marginTop: 8,
        textAlign: "center",
    },
    fallbackImageInLoading: {
        width: "100%",
        height: "60%",
        borderRadius: 14,
        marginBottom: 20,
    },
    offlineMessageContainer: {
        alignItems: "center",
        marginTop: 20,
        padding: 20,
        backgroundColor: "rgba(244, 67, 54, 0.1)",
        borderRadius: 12,
        borderWidth: 1,
        borderColor: "rgba(244, 67, 54, 0.3)",
    },
    offlineMessageTitle: {
        color: "#F44336",
        fontSize: 20,
        fontFamily: "YekanBakh-SemiBold",
        marginBottom: 8,
    },
    offlineMessageText: {
        color: "#fff",
        fontSize: 14,
        fontFamily: "YekanBakh-Regular",
        textAlign: "center",
        marginBottom: 4,
    },
    offlineMessageSubtext: {
        color: "#aaa",
        fontSize: 12,
        fontFamily: "YekanBakh-Regular",
        textAlign: "center",
        marginTop: 8,
    },
    debugButton: {
        backgroundColor: "rgba(244, 67, 54, 0.3)",
        padding: 8,
        borderRadius: 6,
        marginTop: 8,
        borderWidth: 1,
        borderColor: "rgba(244, 67, 54, 0.5)",
    },
    debugButtonText: {
        color: "#F44336",
        fontSize: 11,
        fontFamily: "YekanBakh-SemiBold",
        textAlign: "center",
    },
});
