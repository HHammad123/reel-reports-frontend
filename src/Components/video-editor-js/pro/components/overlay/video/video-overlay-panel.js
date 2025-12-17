import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { useAspectRatio } from "../../../hooks/use-aspect-ratio";
import { OverlayType } from "../../../types";
import { VideoDetails } from "./video-details";
import { useMediaAdaptors } from "../../../contexts/media-adaptor-context";
import { MediaOverlayPanel } from "../shared/media-overlay-panel";
import { getSrcDuration } from "../../../hooks/use-src-duration";
import { calculateIntelligentAssetSize, getAssetDimensions } from "../../../utils/asset-sizing";
import { useVideoReplacement } from "../../../hooks/use-video-replacement";
/**
 * VideoOverlayPanel is a component that provides video search and management functionality.
 * It allows users to:
 * - Search and browse videos from all configured video adaptors
 * - Add videos to the timeline as overlays
 * - Manage video properties when a video overlay is selected
 *
 * The component has two main states:
 * 1. Search/Browse mode: Shows a search input and grid of video thumbnails from all sources
 * 2. Edit mode: Shows video details panel when a video overlay is selected
 *
 * @component
 * @example
 * ```tsx
 * <VideoOverlayPanel />
 * ```
 */
export const VideoOverlayPanel = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [videos, setVideos] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isDurationLoading, setIsDurationLoading] = useState(false);
    const [loadingItemKey, setLoadingItemKey] = useState(null);
    const [sourceResults, setSourceResults] = useState([]);
    const { searchVideos, videoAdaptors } = useMediaAdaptors();
    const { isReplaceMode, startReplaceMode, cancelReplaceMode, replaceVideo } = useVideoReplacement();
    const { overlays, selectedOverlayId, changeOverlay, currentFrame, setOverlays, setSelectedOverlayId, } = useEditorContext();
    const { addAtPlayhead } = useTimelinePositioning();
    const { getAspectRatioDimensions } = useAspectRatio();
    const [localOverlay, setLocalOverlay] = useState(null);
    useEffect(() => {
        if (selectedOverlayId === null) {
            setLocalOverlay(null);
            return;
        }
        const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId);
        if ((selectedOverlay === null || selectedOverlay === void 0 ? void 0 : selectedOverlay.type) === OverlayType.VIDEO) {
            setLocalOverlay(selectedOverlay);
        }
    }, [selectedOverlayId, overlays]);
    const handleSearch = async (e) => {
        e.preventDefault();
        if (!searchQuery.trim())
            return;
        setIsLoading(true);
        try {
            const result = await searchVideos({
                query: searchQuery,
                perPage: 50,
                page: 1,
            });
            setVideos(result.items);
            setSourceResults(result.sourceResults);
        }
        catch (error) {
            console.error("Error searching videos:", error);
            // Reset state on error
            setVideos([]);
            setSourceResults([]);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleAddClip = async (video) => {
        const itemKey = getItemKey(video);
        setIsDurationLoading(true);
        setLoadingItemKey(itemKey);
        try {
            // Check if we're in replace mode
            if (isReplaceMode && localOverlay) {
                // Replace mode: Use the hook to handle replacement
                await replaceVideo(localOverlay, video, (v) => {
                    const adaptor = videoAdaptors.find((a) => a.name === v._source);
                    return (adaptor === null || adaptor === void 0 ? void 0 : adaptor.getVideoUrl(v, "hd")) || "";
                }, (updatedOverlay) => {
                    setLocalOverlay(updatedOverlay);
                    // Clear search state
                    setSearchQuery("");
                    setVideos([]);
                    setSourceResults([]);
                });
            }
            else {
                // Add mode: Create new overlay
                const adaptor = videoAdaptors.find((a) => a.name === video._source);
                const videoUrl = (adaptor === null || adaptor === void 0 ? void 0 : adaptor.getVideoUrl(video, "hd")) || "";
                // Get actual video duration using media-parser
                let durationInFrames = 200; // fallback
                let mediaSrcDuration;
                try {
                    const result = await getSrcDuration(videoUrl);
                    durationInFrames = result.durationInFrames;
                    mediaSrcDuration = result.durationInSeconds;
                }
                catch (error) {
                    console.warn("Failed to get video duration, using fallback:", error);
                }
                const canvasDimensions = getAspectRatioDimensions();
                const assetDimensions = getAssetDimensions(video);
                // Check if aspect ratios match - if so, always fill canvas for base videos
                // Works for both 9:16 and 16:9 aspect ratios
                // Examples:
                // - 16:9 video (1920x1080) on 16:9 canvas (1920x1080) → matches → fills canvas
                // - 9:16 video (1080x1920) on 9:16 canvas (1080x1920) → matches → fills canvas
                let width, height, fillsCanvas;
                if (assetDimensions) {
                    const assetAspectRatio = assetDimensions.width / assetDimensions.height;
                    const canvasAspectRatio = canvasDimensions.width / canvasDimensions.height;
                    const aspectRatioTolerance = 0.01; // 1% tolerance for floating point comparison
                    const aspectRatiosMatch = Math.abs(assetAspectRatio - canvasAspectRatio) < aspectRatioTolerance;
                    // If aspect ratios match (9:16 or 16:9), always fill canvas (base video behavior)
                    if (aspectRatiosMatch) {
                        width = canvasDimensions.width;
                        height = canvasDimensions.height;
                        fillsCanvas = true;
                    } else {
                        // Use intelligent sizing for non-matching aspect ratios
                        const sized = calculateIntelligentAssetSize(assetDimensions, canvasDimensions);
                        width = sized.width;
                        height = sized.height;
                        fillsCanvas = false;
                    }
                } else {
                    // No asset dimensions - use canvas dimensions (fill canvas for both 9:16 and 16:9)
                    width = canvasDimensions.width;
                    height = canvasDimensions.height;
                    fillsCanvas = true;
                }
                const { from, row, updatedOverlays } = addAtPlayhead(currentFrame, overlays, 'top');
                // If video fills canvas, position at (0,0), otherwise center it
                let left = fillsCanvas ? 0 : Math.round((canvasDimensions.width - width) / 2);
                let top = fillsCanvas ? 0 : Math.round((canvasDimensions.height - height) / 2);
                
                // CRITICAL: Ensure video stays within canvas bounds
                // Clamp position to canvas bounds
                left = Math.max(0, Math.min(left, canvasDimensions.width - Math.max(1, width)));
                top = Math.max(0, Math.min(top, canvasDimensions.height - Math.max(1, height)));
                // Clamp dimensions to fit within remaining canvas space
                width = Math.max(1, Math.min(width, canvasDimensions.width - left));
                height = Math.max(1, Math.min(height, canvasDimensions.height - top));
                // Final safety check: ensure position + size doesn't exceed canvas
                if (left + width > canvasDimensions.width) {
                    width = Math.max(1, canvasDimensions.width - left);
                }
                if (top + height > canvasDimensions.height) {
                    height = Math.max(1, canvasDimensions.height - top);
                }
                
                // Create the new overlay without an ID (will be generated)
                const newOverlay = {
                    left: left, // Constrained to canvas bounds
                    top: top, // Constrained to canvas bounds
                    width, // Constrained to canvas bounds
                    height, // Constrained to canvas bounds
                    durationInFrames,
                    from,
                    rotation: 0,
                    row,
                    isDragging: false,
                    type: OverlayType.VIDEO,
                    content: video.thumbnail,
                    src: videoUrl,
                    videoStartTime: 0,
                    mediaSrcDuration,
                    styles: {
                        opacity: 1,
                        zIndex: 100,
                        transform: "none",
                        objectFit: fillsCanvas ? "cover" : "contain", // Use "cover" when filling canvas to ensure no gaps
                        animation: {
                            enter: "none",
                            exit: "none",
                        },
                    },
                };
                // Update overlays with both the shifted overlays and the new overlay in a single operation
                // Generate ID - ensure we always get a valid numeric ID
                const validIds = updatedOverlays
                    .map((o) => o?.id)
                    .filter((id) => id != null && !isNaN(id) && typeof id === 'number');
                const newId = validIds.length > 0 
                    ? Math.max(...validIds) + 1 
                    : (overlays.length > 0 
                        ? Math.max(...overlays.map((o) => o?.id || 0).filter(id => !isNaN(id))) + 1 
                        : 0);
                const finalId = (isNaN(newId) || newId < 0) ? Date.now() : newId;
                const overlayWithId = { ...newOverlay, id: finalId };
                
                // Ensure the overlay has a valid ID
                if (!overlayWithId.id || isNaN(overlayWithId.id)) {
                    overlayWithId.id = finalId;
                }
                
                const finalOverlays = [...updatedOverlays, overlayWithId];
                setOverlays(finalOverlays);
                setSelectedOverlayId(overlayWithId.id);
                
                console.log('[VideoOverlayPanel] Added overlay with ID:', overlayWithId.id, 'Type:', overlayWithId.type);
            }
        }
        finally {
            setIsDurationLoading(false);
            setLoadingItemKey(null);
        }
    };
    const handleUpdateOverlay = (updatedOverlay) => {
        setLocalOverlay(updatedOverlay);
        changeOverlay(updatedOverlay.id, () => updatedOverlay);
    };
    const handleCancelReplace = () => {
        cancelReplaceMode();
        setSearchQuery("");
        setVideos([]);
        setSourceResults([]);
    };
    const getThumbnailUrl = (video) => {
        return video.thumbnail;
    };
    const getItemKey = (video) => {
        return `${video._source}-${video.id}`;
    };
    return (_jsx(MediaOverlayPanel, { searchQuery: searchQuery, onSearchQueryChange: setSearchQuery, onSearch: handleSearch, items: videos, isLoading: isLoading, isDurationLoading: isDurationLoading, loadingItemKey: loadingItemKey, hasAdaptors: videoAdaptors.length > 0, sourceResults: sourceResults, onItemClick: handleAddClip, getThumbnailUrl: getThumbnailUrl, getItemKey: getItemKey, mediaType: "videos", searchPlaceholder: isReplaceMode ? "Search for replacement video" : "Search videos", showSourceBadge: false, isEditMode: !!localOverlay && !isReplaceMode, editComponent: localOverlay ? (_jsx(VideoDetails, { localOverlay: localOverlay, setLocalOverlay: handleUpdateOverlay, onChangeVideo: startReplaceMode })) : null, isReplaceMode: isReplaceMode, onCancelReplace: handleCancelReplace, enableTimelineDrag: !isReplaceMode && !localOverlay }));
};
