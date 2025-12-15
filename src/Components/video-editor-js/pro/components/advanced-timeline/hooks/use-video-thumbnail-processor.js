import { useState, useEffect, useRef } from 'react';
import { Input, ALL_FORMATS, BlobSource, CanvasSink } from 'mediabunny';
// Simple cache with automatic cleanup
class ThumbnailCache {
    constructor() {
        this.cache = new Map();
        this.maxEntries = 10;
        this.maxAgeMs = 5 * 60 * 1000; // 5 minutes
    }
    // Create a cache key that includes ONLY source and time range
    createKey(src, start, end) {
        const sourceId = src instanceof File
            ? `file:${src.name}:${src.size}:${src.lastModified}`
            : `url:${src}`;
        // Only include time range in the key - thumbnailCount and size are NOT part of cache key
        return `${sourceId}|${start.toFixed(2)}|${end.toFixed(2)}`;
    }
    get(src, start, end) {
        const key = this.createKey(src, start, end);
        const entry = this.cache.get(key);
        if (!entry)
            return null;
        // Check if entry is too old
        if (Date.now() - entry.lastAccessed > this.maxAgeMs) {
            this.cache.delete(key);
            return null;
        }
        // Update last accessed time
        entry.lastAccessed = Date.now();
        return entry.data;
    }
    set(src, start, end, data) {
        const key = this.createKey(src, start, end);
        // Simple LRU: if cache is full, remove oldest entry
        if (this.cache.size >= this.maxEntries) {
            let oldestKey = null;
            let oldestTime = Date.now();
            this.cache.forEach((v, k) => {
                if (v.lastAccessed < oldestTime) {
                    oldestTime = v.lastAccessed;
                    oldestKey = k;
                }
            });
            if (oldestKey) {
                this.cache.delete(oldestKey);
            }
        }
        this.cache.set(key, {
            data,
            lastAccessed: Date.now()
        });
    }
    clear() {
        this.cache.clear();
    }
    // Clean up old entries
    cleanup() {
        const now = Date.now();
        const keysToDelete = [];
        this.cache.forEach((entry, key) => {
            if (now - entry.lastAccessed > this.maxAgeMs) {
                keysToDelete.push(key);
            }
        });
        keysToDelete.forEach(key => this.cache.delete(key));
    }
}
// Single global cache instance
const thumbnailCache = new ThumbnailCache();
// Cleanup old entries periodically
setInterval(() => thumbnailCache.cleanup(), 60000); // Every minute
/**
 * A simplified React hook that processes video files to generate thumbnails.
 *
 * @param src - URL or File of the video to process
 * @param start - Start time in seconds for thumbnail generation
 * @param end - End time in seconds for thumbnail generation (0 means use full duration)
 * @param options - Configuration options for thumbnail generation
 * @returns {ThumbnailResult} Object containing thumbnail data, loading state, and error state
 */
export function useVideoThumbnailProcessor(src, start = 0, end = 0, options = {}) {
    const [thumbnailData, setThumbnailData] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const abortControllerRef = useRef(null);
    const { thumbnailCount = 8, thumbnailSize = 120, } = options;
    useEffect(() => {
        // Clear state if no source
        if (!src) {
            setThumbnailData(null);
            setIsLoading(false);
            setError(null);
            return;
        }
        // Check cache first
        const cachedData = thumbnailCache.get(src, start, end);
        if (cachedData) {
            setThumbnailData(cachedData);
            setIsLoading(false);
            setError(null);
            return;
        }
        // Cancel any ongoing operation
        if (abortControllerRef.current) {
            abortControllerRef.current.abort();
        }
        // Create new abort controller
        const abortController = new AbortController();
        abortControllerRef.current = abortController;
        // Start loading
        setIsLoading(true);
        setError(null);
        const generateThumbnails = async () => {
            try {
                let input;
                // Create input from source
                if (src instanceof File) {
                    input = new Input({
                        source: new BlobSource(src),
                        formats: ALL_FORMATS,
                    });
                }
                else {
                    // Fetch video from URL
                    const response = await fetch(src);
                    if (!response.ok) {
                        throw new Error(`Failed to fetch video: ${response.status}`);
                    }
                    const blob = await response.blob();
                    if (blob.size === 0) {
                        throw new Error('Video file is empty');
                    }
                    input = new Input({
                        source: new BlobSource(blob),
                        formats: ALL_FORMATS,
                    });
                }
                // Check if aborted
                if (abortController.signal.aborted)
                    return;
                // Get video track
                const videoTrack = await input.getPrimaryVideoTrack();
                if (!videoTrack) {
                    throw new Error('No video track found');
                }
                if (videoTrack.codec === null) {
                    throw new Error('Unsupported video codec');
                }
                if (!(await videoTrack.canDecode())) {
                    throw new Error('Unable to decode video');
                }
                // Check if aborted
                if (abortController.signal.aborted)
                    return;
                // Calculate dimensions
                const aspectRatio = videoTrack.displayWidth / videoTrack.displayHeight;
                const width = aspectRatio >= 1 ? thumbnailSize : Math.floor(thumbnailSize * aspectRatio);
                const height = aspectRatio <= 1 ? thumbnailSize : Math.floor(thumbnailSize / aspectRatio);
                // Get timing info
                const firstTimestamp = await videoTrack.getFirstTimestamp();
                const videoDuration = await videoTrack.computeDuration();
                // Determine actual time range
                const actualStart = Math.max(start, firstTimestamp);
                const actualEnd = end > 0 ? Math.min(end, firstTimestamp + videoDuration) : firstTimestamp + videoDuration;
                const rangeDuration = actualEnd - actualStart;
                // Generate timestamps for the requested range
                const timestamps = [];
                for (let i = 0; i < thumbnailCount; i++) {
                    const timestamp = actualStart + (i * rangeDuration) / Math.max(thumbnailCount - 1, 1);
                    timestamps.push(timestamp);
                }
                // Check if aborted
                if (abortController.signal.aborted)
                    return;
                // Create canvas sink
                const sink = new CanvasSink(videoTrack, {
                    width: Math.floor(width * window.devicePixelRatio),
                    height: Math.floor(height * window.devicePixelRatio),
                    fit: 'fill',
                });
                const thumbnailUrls = [];
                const actualTimestamps = [];
                // Generate thumbnails
                for await (const wrappedCanvas of sink.canvasesAtTimestamps(timestamps)) {
                    if (abortController.signal.aborted)
                        return;
                    if (wrappedCanvas) {
                        const canvas = wrappedCanvas.canvas;
                        const dataUrl = canvas.toDataURL('image/jpeg', 0.7);
                        thumbnailUrls.push(dataUrl);
                        actualTimestamps.push(wrappedCanvas.timestamp);
                    }
                }
                // Create result data
                const data = {
                    thumbnails: thumbnailUrls,
                    timestamps: actualTimestamps,
                    duration: videoDuration,
                    width,
                    height
                };
                // Store in cache
                thumbnailCache.set(src, start, end, data);
                // Update state if not aborted
                if (!abortController.signal.aborted) {
                    setThumbnailData(data);
                    setIsLoading(false);
                }
            }
            catch (err) {
                if (!abortController.signal.aborted) {
                    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
                    setError(errorMessage);
                    setIsLoading(false);
                }
            }
        };
        generateThumbnails();
        // Cleanup function
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort();
                abortControllerRef.current = null;
            }
        };
    }, [src, start, end, thumbnailCount, thumbnailSize]);
    return {
        data: thumbnailData,
        isLoading,
        error
    };
}
// Export cache utilities
export function clearThumbnailCache() {
    thumbnailCache.clear();
}
