import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MediaLoadingGrid } from "./media-loading-grid";
import { MediaEmptyState } from "./media-empty-state";
import { setCurrentNewItemDragData, setCurrentNewItemDragType } from "../../advanced-timeline/hooks/use-new-item-drag";
/**
 * MediaGrid - Shared media grid component
 *
 * Provides consistent masonry grid layout and state handling across all media panels.
 * Handles loading states, empty states, and media item display with hover effects.
 *
 * New: Supports dragging items to timeline with ghost element preview
 */
export const MediaGrid = ({ items, isLoading, isDurationLoading = false, loadingItemKey = null, hasAdaptors, hasSearched, activeTab, sourceResults, mediaType, onItemClick, getThumbnailUrl, getItemKey, enableTimelineDrag = false, }) => {
    var _a;
    // Get active tab display name for empty state
    const activeTabDisplayName = (_a = sourceResults.find(s => s.adaptorName === activeTab)) === null || _a === void 0 ? void 0 : _a.adaptorDisplayName;
    if (isLoading) {
        return _jsx(MediaLoadingGrid, {});
    }
    // Handle drag start for timeline integration
    const handleDragStart = (item) => (e) => {
        if (!enableTimelineDrag)
            return;
        // Extract duration from item if available (videos may have duration metadata)
        const itemDuration = item.duration;
        const defaultDuration = mediaType === "videos" ? 5 : 5; // Default to 5 seconds
        const duration = typeof itemDuration === 'number' && itemDuration > 0
            ? itemDuration
            : defaultDuration;
        // Set drag data for timeline
        const dragData = {
            isNewItem: true,
            type: mediaType === "videos" ? "video" : "image",
            label: item._sourceDisplayName,
            duration, // Use actual duration from video metadata or default
            data: item, // Full item data
        };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData("application/json", JSON.stringify(dragData));
        // Set global drag state for timeline
        setCurrentNewItemDragType(dragData.type);
        setCurrentNewItemDragData(dragData);
        // Create a custom drag image (smaller thumbnail)
        const thumbnail = e.currentTarget.querySelector('img');
        if (thumbnail) {
            // Create a smaller version of the thumbnail for dragging
            const dragPreview = document.createElement('div');
            dragPreview.style.position = 'absolute';
            dragPreview.style.top = '-9999px';
            dragPreview.style.width = '60px';
            dragPreview.style.height = '40px';
            dragPreview.style.overflow = 'hidden';
            dragPreview.style.borderRadius = '4px';
            dragPreview.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            dragPreview.style.cursor = 'none';
            const clonedImg = thumbnail.cloneNode(true);
            clonedImg.style.width = '80px';
            clonedImg.style.height = '60px';
            clonedImg.style.objectFit = 'cover';
            dragPreview.appendChild(clonedImg);
            document.body.appendChild(dragPreview);
            e.dataTransfer.setDragImage(dragPreview, 40, 30);
            // Clean up the preview element after drag starts
            setTimeout(() => {
                dragPreview.remove();
            }, 0);
        }
    };
    const handleDragEnd = () => {
        if (!enableTimelineDrag)
            return;
        // Clear drag state
        setCurrentNewItemDragType(null);
        setCurrentNewItemDragData(null);
    };
    if (items.length > 0) {
        return (_jsx("div", { className: "columns-2 sm:columns-2 gap-3 space-y-3", children: items.map((item) => {
                const itemKey = getItemKey(item);
                const isItemLoading = isDurationLoading && loadingItemKey === itemKey;
                const thumbnailUrl = getThumbnailUrl(item);
                // For videos, check if we have a real thumbnail or should show video element
                const isVideo = mediaType === "videos";
                // For session videos, always use video element (they don't have real thumbnails)
                const isSessionVideo = item._isSessionVideo || item._sessionVideo;
                // Get video URL - prioritize base video URL for session videos
                const videoUrl = item.file || 
                                item._sessionVideo?.baseVideoUrl || 
                                item._sessionVideo?.base_video_url || 
                                item._sessionVideo?.path || 
                                item._sessionVideo?.url || 
                                item._sessionVideo?.src || '';
                // Check if we have a real thumbnail (image URL, not video URL)
                const hasRealThumbnail = item.thumbnail && 
                                        item.thumbnail.trim() && 
                                        !item.thumbnail.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)(\?|$)/i) &&
                                        !isSessionVideo;
                const hasRealPoster = item.poster && 
                                     item.poster.trim() && 
                                     !item.poster.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)(\?|$)/i) &&
                                     !isSessionVideo;
                // Show video element if: (1) it's a session video with URL, OR (2) no real thumbnail/poster and we have a video URL
                const shouldShowVideo = isVideo && videoUrl && (isSessionVideo || (!hasRealThumbnail && !hasRealPoster));
                return (_jsx("button", { className: "relative block w-full cursor-pointer border border-transparent rounded-sm overflow-hidden break-inside-avoid mb-3", onClick: () => !isItemLoading && onItemClick(item), disabled: isItemLoading, draggable: enableTimelineDrag && !isItemLoading, onDragStart: handleDragStart(item), onDragEnd: handleDragEnd, children: _jsx("div", { className: "relative w-full", children: _jsxs("div", { className: "relative w-full pb-[75%]", children: [" ", shouldShowVideo ? (_jsx("video", { src: videoUrl, className: `absolute inset-0 w-full h-full rounded-sm object-cover ${isItemLoading ? 'opacity-50' : 'hover:opacity-60'}`, muted: true, playsInline: true, preload: "metadata", onLoadedMetadata: (e) => {
                            // Seek to 0.1s to show a frame
                            e.currentTarget.currentTime = 0.1;
                        }, draggable: false })) : (_jsx("img", { src: thumbnailUrl, alt: `${mediaType.slice(0, -1)} from ${item._sourceDisplayName}`, className: `absolute inset-0 w-full h-full rounded-sm object-cover ${isItemLoading ? 'opacity-50' : 'hover:opacity-60'}`, draggable: false })), isItemLoading && (_jsx("div", { className: "absolute inset-0 bg-background/80 flex items-center justify-center", children: _jsx("div", { className: "w-6 h-6 border-2 border-secondary border-t-transparent rounded-full animate-spin" }) })), !isItemLoading && (_jsx("div", { className: "absolute inset-0 bg-background/20 opacity-0 hover:opacity-100 transition-opacity duration-200" }))] }) }) }, itemKey));
            }) }));
    }
    // Determine empty state type
    if (!hasAdaptors)
        return _jsx(MediaEmptyState, { type: "no-adaptors", mediaType: mediaType });
    if (hasSearched && sourceResults.length > 0) {
        return (_jsx(MediaEmptyState, { type: "no-results", mediaType: mediaType, activeTabName: activeTab !== "all" ? activeTabDisplayName : undefined }));
    }
    return _jsx(MediaEmptyState, { type: "initial", mediaType: mediaType });
};
