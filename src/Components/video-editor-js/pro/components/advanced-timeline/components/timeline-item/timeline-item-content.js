import { jsx as _jsx } from "react/jsx-runtime";
import { useRef, useEffect, useState } from 'react';
import { TimelineItemContentFactory } from './timeline-item-content-factory';
import { TrackItemType } from '../../types';
import { useWaveformProcessor } from '../../hooks/use-waveform-processor';
import { useVideoThumbnailProcessor } from '../../hooks/use-video-thumbnail-processor';
import useTimelineStore from '../../stores/use-timeline-store';
export const TimelineItemContent = ({ label, type, data, start = 0, end = 0, mediaStart, isHovering = false, // Default to false
itemId, onThumbnailDisplayChange, currentFrame, fps = 30, }) => {
    var _a, _b;
    const containerRef = useRef(null);
    const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
    // Get drag info from timeline store to check if we're resizing
    const { dragInfo, isDragging } = useTimelineStore();
    // Check if THIS specific item is currently being resized
    const isResizing = isDragging && dragInfo && itemId && (dragInfo.action === 'resize-start' ||
        dragInfo.action === 'resize-end') && dragInfo.id === itemId;
    // Calculate audio content timing - prioritize mediaStart from timeline item, then fall back to data properties
    const audioContentStart = type === TrackItemType.AUDIO
        ? (mediaStart !== undefined
            ? mediaStart
            : ((data === null || data === void 0 ? void 0 : data.startFromSound) !== undefined ? data.startFromSound / 30 : 0)) // Convert frames to seconds
        : 0;
    // Generate waveform data for audio items - ALWAYS generate fresh waveforms
    // This ensures split audio items get correct waveforms for their time segment
    const waveformResult = useWaveformProcessor(type === TrackItemType.AUDIO && (data === null || data === void 0 ? void 0 : data.src) ? data.src : undefined, audioContentStart, // Start time in seconds
    end - start // Duration in seconds
    );
    // Calculate video content timing - prioritize mediaStart/mediaEnd from timeline item, 
    // then fall back to data properties, finally default to 0
    const videoContentStart = type === TrackItemType.VIDEO
        ? (mediaStart !== undefined
            ? mediaStart
            : ((data === null || data === void 0 ? void 0 : data.videoStartTime) !== undefined
                ? data.videoStartTime
                : 0)) // Default to start of video if no content timing specified
        : 0;
    // For videoContentEnd, always calculate based on timeline duration to ensure thumbnails refresh on resize
    const videoContentEnd = type === TrackItemType.VIDEO
        ? (videoContentStart + (end - start)) // Always use timeline duration for content end
        : 0;
    // Generate thumbnail data for video items
    const thumbnailResult = useVideoThumbnailProcessor(type === TrackItemType.VIDEO && ((data === null || data === void 0 ? void 0 : data.src) || (data === null || data === void 0 ? void 0 : data.originalUrl)) ? ((data === null || data === void 0 ? void 0 : data.src) || (data === null || data === void 0 ? void 0 : data.originalUrl)) : undefined, videoContentStart, videoContentEnd, {
        thumbnailCount: Math.max(4, Math.floor(dimensions.width / 30)), // Increased density: one thumbnail every 30px instead of 60px
        thumbnailSize: Math.min(dimensions.height * 2, 120), // Size based on item height
        fps: (data === null || data === void 0 ? void 0 : data.fps) || 30
    });
    // Augment data with waveform information for audio items
    const audioEnhancedData = type === TrackItemType.AUDIO
        ? {
            ...data,
            // Always use the generated waveform for correct timing
            waveformData: waveformResult.data,
            // Show loading state when generating
            isLoadingWaveform: waveformResult.isLoading
        }
        : data;
    // Augment data with thumbnail information for video items
    const enhancedData = type === TrackItemType.VIDEO
        ? {
            ...audioEnhancedData,
            thumbnails: ((_a = thumbnailResult.data) === null || _a === void 0 ? void 0 : _a.thumbnails) || (audioEnhancedData === null || audioEnhancedData === void 0 ? void 0 : audioEnhancedData.thumbnails),
            thumbnailTimestamps: ((_b = thumbnailResult.data) === null || _b === void 0 ? void 0 : _b.timestamps) || (audioEnhancedData === null || audioEnhancedData === void 0 ? void 0 : audioEnhancedData.thumbnailTimestamps),
            isLoadingThumbnails: thumbnailResult.isLoading,
            thumbnailError: thumbnailResult.error
        }
        : audioEnhancedData;
    // Measure the container dimensions to pass to type-specific components
    useEffect(() => {
        const updateDimensions = () => {
            if (containerRef.current) {
                const rect = containerRef.current.getBoundingClientRect();
                setDimensions({
                    width: rect.width,
                    height: rect.height,
                });
            }
        };
        updateDimensions();
        // Update dimensions on resize
        const resizeObserver = new ResizeObserver(updateDimensions);
        if (containerRef.current) {
            resizeObserver.observe(containerRef.current);
        }
        return () => {
            resizeObserver.disconnect();
        };
    }, []);
    return (_jsx("div", { ref: containerRef, className: "flex-1 min-w-0 h-full", children: !isResizing && dimensions.width > 0 && (_jsx(TimelineItemContentFactory, { type: type, label: label, data: enhancedData, itemWidth: dimensions.width, itemHeight: dimensions.height, start: start, end: end, isHovering: isHovering, onThumbnailDisplayChange: onThumbnailDisplayChange, currentFrame: currentFrame, fps: fps })) }));
};
