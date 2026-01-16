import React from 'react';
import { OverlayType } from '../../../../types';
import { FPS } from '../../../../../constants';
import { useTimelineTransforms } from './use-timeline-transforms';
import { useMediaAdaptors } from '../../../../contexts/media-adaptor-context';
import { useAspectRatio } from '../../../../hooks/use-aspect-ratio';
import { calculateIntelligentAssetSize, getAssetDimensions } from '../../../../utils/asset-sizing';
/**
 * Hook to handle timeline event handlers and state management
 */
export const useTimelineHandlers = ({ overlays, playerRef, setSelectedOverlayId, setSelectedOverlayIds, deleteOverlay, duplicateOverlay, splitOverlay, handleOverlayChange, setOverlays, setActivePanel, setIsOpen }) => {
    const { transformTracksToOverlays } = useTimelineTransforms();
    
    // Helper function to safely convert itemId to overlayId (handles both numeric and string IDs)
    // Returns the ID as-is if it's a string that can't be parsed as a number, otherwise parses it
    const safeParseOverlayId = React.useCallback((itemId) => {
        console.log('[safeParseOverlayId] Input itemId:', itemId, 'Type:', typeof itemId);
        if (itemId == null || itemId === undefined) {
            console.warn('[safeParseOverlayId] Null or undefined itemId');
            return null;
        }
        // If it's already a number, return it
        if (typeof itemId === 'number') {
            console.log('[safeParseOverlayId] Already a number, returning:', itemId);
            return itemId;
        }
        // Convert to string first to handle any edge cases
        const itemIdString = String(itemId);
        // If it's a string, check if it can be parsed as a number
        const parsed = parseInt(itemIdString, 10);
        // If parsing results in NaN, it's a string ID (e.g., "audio-video-0") - return as-is
        if (isNaN(parsed)) {
            console.log('[safeParseOverlayId] String ID (cannot parse as number), returning as-is:', itemIdString);
            return itemIdString;
        }
        // Otherwise, return the parsed number
        console.log('[safeParseOverlayId] Parsed as number:', parsed);
        return parsed;
    }, []);
    const { videoAdaptors, imageAdaptors } = useMediaAdaptors();
    const { getAspectRatioDimensions } = useAspectRatio();
    /** Ref to prevent circular updates between overlays and tracks */
    const isUpdatingFromTimelineRef = React.useRef(false);
    // Handler for when timeline tracks change
    const handleTracksChange = React.useCallback((newTracks) => {
        // CRITICAL FIX: Defer state update to prevent "Cannot update component during render" error
        // Use requestAnimationFrame + setTimeout to ensure updates happen after render phase
        requestAnimationFrame(() => {
            setTimeout(() => {
                // Set flag to prevent circular updates
                isUpdatingFromTimelineRef.current = true;
                const newOverlays = transformTracksToOverlays(newTracks);
                setOverlays(newOverlays);
                // Reset flag after a longer delay to prevent race conditions with debounced text panel updates
                setTimeout(() => {
                    isUpdatingFromTimelineRef.current = false;
                }, 500); // Increased from 0 to 500ms to account for debounced updates
            }, 0);
        });
    }, [setOverlays, transformTracksToOverlays]);
    // Handler for frame changes from timeline
    const handleTimelineFrameChange = React.useCallback((frame) => {
        if (playerRef.current) {
            playerRef.current.seekTo(frame);
        }
    }, [playerRef]);
    // Helper function to set sidebar panel based on overlay type
    // Handles both numeric and string overlay IDs (e.g., 123 or "audio-video-0")
    const setSidebarForOverlay = React.useCallback((overlayId) => {
        console.log('[setSidebarForOverlay] Looking for overlay with ID:', overlayId, 'Type:', typeof overlayId);
        console.log('[setSidebarForOverlay] Available overlay IDs:', overlays.map(o => ({ id: o.id, type: typeof o.id, overlayType: o.type })));
        
        // Find overlay by ID - handle both numeric and string IDs
        const overlay = overlays.find(o => {
            // Direct match (works for both string and numeric)
            if (o.id === overlayId) {
                console.log('[setSidebarForOverlay] Found by direct match');
                return true;
            }
            // String comparison for string IDs (e.g., "audio-video-0")
            if (typeof overlayId === 'string' && String(o.id) === overlayId) {
                console.log('[setSidebarForOverlay] Found by string comparison');
                return true;
            }
            // Numeric comparison for numeric IDs
            if (typeof overlayId === 'number' && Number(o.id) === overlayId) {
                console.log('[setSidebarForOverlay] Found by numeric comparison');
                return true;
            }
            return false;
        });
        if (!overlay) {
            console.warn('[setSidebarForOverlay] Overlay not found for ID:', overlayId, 'Type:', typeof overlayId);
            console.warn('[setSidebarForOverlay] Available IDs:', overlays.map(o => ({ id: o.id, type: typeof o.id, overlayType: o.type })));
            return;
        }
        
        console.log('[setSidebarForOverlay] Overlay found:', overlay);
        console.log('[setSidebarForOverlay] Overlay type:', overlay.type, 'Type of:', typeof overlay.type);
        console.log('[setSidebarForOverlay] Overlay has src:', !!overlay.src, 'Content:', overlay.content);
        
        // Normalize overlay type to handle both enum and string formats
        const overlayType = overlay.type;
        // Convert to string and lowercase for consistent comparison
        const typeString = String(overlayType).toLowerCase();
        
        // Set the appropriate sidebar panel based on overlay type
        let panelToSet = null;
        
        // Check for IMAGE type first to ensure it's always handled
        if (typeString === 'image' || overlayType === OverlayType.IMAGE) {
            console.log('[setSidebarForOverlay] Matched IMAGE type, setting panel to IMAGE');
            panelToSet = OverlayType.IMAGE;
        } else if (typeString === 'sound' || overlayType === OverlayType.SOUND) {
            console.log('[setSidebarForOverlay] Matched SOUND type, setting panel to SOUND');
            panelToSet = OverlayType.SOUND;
        } else if (typeString === 'text' || overlayType === OverlayType.TEXT) {
            panelToSet = OverlayType.TEXT;
        } else if (typeString === 'video' || overlayType === OverlayType.VIDEO) {
            panelToSet = OverlayType.VIDEO;
        } else if (typeString === 'sticker' || overlayType === OverlayType.STICKER) {
            panelToSet = OverlayType.STICKER;
        } else if (typeString === 'caption' || overlayType === OverlayType.CAPTION) {
            panelToSet = OverlayType.CAPTION;
        } else if (typeString === 'shape' || overlayType === OverlayType.SHAPE) {
            // For shapes, we might want to show the image panel or create a dedicated shapes panel
            // For now, let's use the image panel as it's the closest match
            panelToSet = OverlayType.IMAGE;
        } else {
            console.log('[setSidebarForOverlay] Default case, checking overlay properties');
            // If type doesn't match, try to infer from overlay properties
            // Images typically have src with image extensions or are identified by type
            if (overlay.src && (overlay.src.match(/\.(jpg|jpeg|png|gif|webp|svg)/i) || typeString === 'image')) {
                console.log('[setSidebarForOverlay] Inferred IMAGE from properties');
                panelToSet = OverlayType.IMAGE;
            } else if (overlay.src && (!overlay.content || overlay.content === overlay.src)) {
                console.log('[setSidebarForOverlay] Inferred SOUND from properties');
                panelToSet = OverlayType.SOUND;
            }
        }
        
        console.log('[setSidebarForOverlay] Panel to set:', panelToSet);
        console.log('[setSidebarForOverlay] setActivePanel available:', !!setActivePanel);
        console.log('[setSidebarForOverlay] setIsOpen available:', !!setIsOpen);
        
        // CRITICAL FIX: Defer state updates to prevent "Cannot update component during render" error
        // Use requestAnimationFrame + setTimeout to ensure updates happen after render phase
        requestAnimationFrame(() => {
            setTimeout(() => {
                // Set the panel and open sidebar
                // Ensure panel is set for all overlay types including IMAGE
                if (panelToSet && setActivePanel) {
                    console.log('[setSidebarForOverlay] Calling setActivePanel with:', panelToSet);
                    setActivePanel(panelToSet);
                } else if (!panelToSet) {
                    console.warn('[setSidebarForOverlay] No panel to set for overlay type:', overlayType);
                }
                
                // Always open the sidebar when an overlay is selected (including IMAGE overlays)
                if (setIsOpen) {
                    console.log('[setSidebarForOverlay] Calling setIsOpen(true)');
                    setIsOpen(true);
                }
            }, 0);
        });
    }, [overlays, setActivePanel, setIsOpen]);
    // Handler for item selection (single item - for backward compatibility)
    // Handles both numeric IDs (e.g., 123) and string IDs (e.g., "audio-video-0")
    const handleItemSelect = React.useCallback((itemId) => {
        const overlayId = safeParseOverlayId(itemId);
        if (overlayId == null) {
            console.warn('[Timeline] Invalid overlay ID:', itemId);
            return;
        }
        console.log('[handleItemSelect] Setting selected overlay ID:', overlayId, 'from itemId:', itemId);
        setSelectedOverlayId(overlayId);
        // Ensure sidebar opens and panel is set for the selected overlay
        setSidebarForOverlay(overlayId);
    }, [setSelectedOverlayId, setSidebarForOverlay, safeParseOverlayId, overlays]);
    // Handler for multiselect changes
    const handleSelectedItemsChange = React.useCallback((itemIds) => {
        const overlayIds = itemIds.map(id => safeParseOverlayId(id)).filter(id => id != null);
        setSelectedOverlayIds(overlayIds);
        // Set sidebar panel for the first selected item
        if (overlayIds.length > 0) {
            setSidebarForOverlay(overlayIds[0]);
        }
    }, [setSelectedOverlayIds, setSidebarForOverlay, safeParseOverlayId]);
    // Handler for item deletion
    const handleDeleteItems = React.useCallback((itemIds) => {
        itemIds.forEach(itemId => {
            const overlayId = safeParseOverlayId(itemId);
            if (overlayId != null) {
                deleteOverlay(overlayId);
            } else {
                console.warn('[Timeline] Cannot delete overlay with invalid ID:', itemId);
            }
        });
    }, [deleteOverlay, safeParseOverlayId]);
    // Handler for item duplication
    const handleDuplicateItems = React.useCallback((itemIds) => {
        itemIds.forEach(itemId => {
            const overlayId = safeParseOverlayId(itemId);
            if (overlayId != null) {
                duplicateOverlay(overlayId);
            } else {
                console.warn('[Timeline] Cannot duplicate overlay with invalid ID:', itemId);
            }
        });
    }, [duplicateOverlay, safeParseOverlayId]);
    // Handler for item splitting
    const handleSplitItems = React.useCallback((itemId, splitTime) => {
        const overlayId = safeParseOverlayId(itemId);
        if (overlayId == null) {
            console.warn('[Timeline] Cannot split overlay with invalid ID:', itemId);
            return;
        }
        const splitFrame = Math.round(splitTime * FPS);
        splitOverlay(overlayId, splitFrame);
    }, [splitOverlay, safeParseOverlayId]);
    // Handler for item move
    const handleItemMove = React.useCallback((itemId, newStart, newEnd, newTrackId) => {
        const timestamp = Date.now();
        const overlayId = safeParseOverlayId(itemId);
        if (overlayId == null) {
            console.warn('[Timeline] Cannot move overlay with invalid ID:', itemId);
            return;
        }
        // Find overlay by ID - handle both numeric and string IDs
        const overlay = overlays.find(o => {
            // Direct match (works for both string and numeric)
            if (o.id === overlayId) return true;
            // String comparison for string IDs (e.g., "audio-video-0")
            if (typeof overlayId === 'string' && String(o.id) === overlayId) return true;
            // Numeric comparison for numeric IDs
            if (typeof overlayId === 'number' && Number(o.id) === overlayId) return true;
            return false;
        });
        console.log(`[TIMELINE-HANDLERS][${timestamp}] handleItemMove CALLED:`, {
            itemId,
            overlayId,
            newTrackId,
            newStart,
            newEnd,
            isUpdatingFlag: isUpdatingFromTimelineRef.current,
            currentOverlayState: overlays.map(o => ({ id: o.id, row: o.row, type: o.type })),
            overlayFound: !!overlay
        });
        // CRITICAL FIX: Don't process individual item moves when we're in the middle of a batch track update
        // This prevents double-updates where handleTracksChange already processed all changes
        if (isUpdatingFromTimelineRef.current) {
            return;
        }
        if (overlay) {
            const newRow = parseInt(newTrackId.replace('track-', ''), 10);
            const updatedOverlay = {
                ...overlay,
                from: Math.round(newStart * FPS),
                durationInFrames: Math.round((newEnd - newStart) * FPS),
                row: newRow,
            };
            handleOverlayChange(updatedOverlay);
        }
        else {
            console.error(`[TIMELINE-HANDLERS][${timestamp}] ❌ Overlay not found for move:`, { itemId, overlayId, availableOverlays: overlays.map(o => o.id) });
        }
    }, [overlays, handleOverlayChange, isUpdatingFromTimelineRef]);
    // Handler for item resize
    const handleItemResize = React.useCallback((itemId, newStart, newEnd) => {
        const timestamp = Date.now();
        // CRITICAL FIX: Don't process individual item resizes when we're in the middle of a batch track update
        if (isUpdatingFromTimelineRef.current) {
            console.log(`[TIMELINE-HANDLERS][${timestamp}] 🛑 SKIPPING handleItemResize - batch update in progress`);
            return;
        }
        const overlayId = safeParseOverlayId(itemId);
        if (overlayId == null) {
            console.warn('[Timeline] Cannot resize overlay with invalid ID:', itemId);
            return;
        }
        // Find overlay by ID - handle both numeric and string IDs
        const overlay = overlays.find(o => {
            // Direct match (works for both string and numeric)
            if (o.id === overlayId) return true;
            // String comparison for string IDs (e.g., "audio-video-0")
            if (typeof overlayId === 'string' && String(o.id) === overlayId) return true;
            // Numeric comparison for numeric IDs
            if (typeof overlayId === 'number' && Number(o.id) === overlayId) return true;
            return false;
        });
        if (overlay) {
            const updatedOverlay = {
                ...overlay,
                from: Math.round(newStart * FPS),
                durationInFrames: Math.round((newEnd - newStart) * FPS),
            };
            handleOverlayChange(updatedOverlay);
        }
    }, [overlays, handleOverlayChange, isUpdatingFromTimelineRef, safeParseOverlayId]);
    // Handler for new item drop from external sources (e.g., media grid)
    const handleNewItemDrop = React.useCallback((itemType, trackIndex, startTime, itemData) => {
        var _a;
        console.log('[TIMELINE-HANDLERS] New item drop', { itemType, trackIndex, startTime, itemData });
        // Only handle video, image, audio, and text types from media grid
        if (itemType !== 'video' && itemType !== 'image' && itemType !== 'audio' && itemType !== 'text') {
            console.warn('[TIMELINE-HANDLERS] Unsupported item type:', itemType);
            return;
        }
        try {
            const canvasDimensions = getAspectRatioDimensions();
            let newOverlay;
            if (itemType === 'video' && (itemData === null || itemData === void 0 ? void 0 : itemData.data)) {
                const video = itemData.data;
                // Check if this is local media (has src already) or external media (needs adaptor)
                let videoUrl;
                if (video._isLocalMedia && video.src) {
                    // Local media - use src directly, but validate it's not double-prefixed
                    const rawSrc = video.src;
                    console.log('[TIMELINE-HANDLERS] Video drop - raw src:', rawSrc);
                    console.log('[TIMELINE-HANDLERS] Starts with http:', rawSrc.startsWith('http://'));
                    console.log('[TIMELINE-HANDLERS] Starts with https:', rawSrc.startsWith('https://'));
                    console.log('[TIMELINE-HANDLERS] Starts with blob:', rawSrc.startsWith('blob:'));
                    
                    // CRITICAL: If src already starts with http/https/blob, use it directly
                    // If it has the serve prefix + http/https, strip the prefix
                    if (rawSrc.startsWith('http://') || rawSrc.startsWith('https://') || rawSrc.startsWith('blob:')) {
                        videoUrl = rawSrc;
                        console.log('[TIMELINE-HANDLERS] Using external URL directly:', videoUrl);
                    } else if (rawSrc.includes('/api/latest/local-media/serve/http') || rawSrc.includes('/api/latest/local-media/serve/https')) {
                        // Double-prefixed URL - extract the actual URL
                        const match = rawSrc.match(/\/api\/latest\/local-media\/serve\/(https?:\/\/.+)/);
                        if (match && match[1]) {
                            videoUrl = match[1];
                            console.log('[TIMELINE-HANDLERS] Fixed double-prefixed URL:', videoUrl);
                        } else {
                            videoUrl = rawSrc;
                        }
                    } else {
                        // Local path - use as-is (should already have prefix if needed)
                        videoUrl = rawSrc;
                        console.log('[TIMELINE-HANDLERS] Using local path:', videoUrl);
                    }
                }
                else {
                    // External media - use adaptor
                    const adaptor = videoAdaptors.find((a) => a.name === video._source);
                    videoUrl = (adaptor === null || adaptor === void 0 ? void 0 : adaptor.getVideoUrl(video, "hd")) || "";
                }
                console.log('[TIMELINE-HANDLERS] Final videoUrl:', videoUrl);
                // Use duration from drag data (already available from video metadata)
                // This avoids the async fetch delay and provides instant feedback
                const durationFromMetadata = itemData.duration || 5; // Default to 5 seconds if not provided
                const durationInFrames = Math.round(durationFromMetadata * FPS);
                const mediaSrcDuration = durationFromMetadata;
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
                
                newOverlay = {
                    left: left, // Constrained to canvas bounds
                    top: top, // Constrained to canvas bounds
                    width, // Constrained to canvas bounds
                    height, // Constrained to canvas bounds
                    durationInFrames,
                    from: Math.round(startTime * FPS),
                    rotation: 0,
                    row: trackIndex,
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
            }
            else if (itemType === 'image' && (itemData === null || itemData === void 0 ? void 0 : itemData.data)) {
                const image = itemData.data;
                // Check if this is local media (has src already) or external media (needs adaptor)
                let imageUrl;
                if (image._isLocalMedia && image.src) {
                    // Local media - use src directly, but validate it's not double-prefixed
                    const rawSrc = image.src;
                    console.log('[TIMELINE-HANDLERS] Image drop - raw src:', rawSrc);
                    
                    // CRITICAL: If src already starts with http/https/blob, use it directly
                    // If it has the serve prefix + http/https, strip the prefix
                    if (rawSrc.startsWith('http://') || rawSrc.startsWith('https://') || rawSrc.startsWith('blob:')) {
                        imageUrl = rawSrc;
                        console.log('[TIMELINE-HANDLERS] Using external image URL directly:', imageUrl);
                    } else if (rawSrc.includes('/api/latest/local-media/serve/http') || rawSrc.includes('/api/latest/local-media/serve/https')) {
                        // Double-prefixed URL - extract the actual URL
                        const match = rawSrc.match(/\/api\/latest\/local-media\/serve\/(https?:\/\/.+)/);
                        if (match && match[1]) {
                            imageUrl = match[1];
                            console.log('[TIMELINE-HANDLERS] Fixed double-prefixed image URL:', imageUrl);
                        } else {
                            imageUrl = rawSrc;
                        }
                    } else {
                        // Local path - use as-is (should already have prefix if needed)
                        imageUrl = rawSrc;
                        console.log('[TIMELINE-HANDLERS] Using local image path:', imageUrl);
                    }
                }
                else {
                    // External media - use adaptor
                    const adaptor = imageAdaptors.find((a) => a.name === image._source);
                    imageUrl = (adaptor === null || adaptor === void 0 ? void 0 : adaptor.getImageUrl(image, "large")) || image.src || "";
                }
                console.log('[TIMELINE-HANDLERS] Final imageUrl:', imageUrl);
                const assetDimensions = getAssetDimensions(image);
                const { width, height } = assetDimensions
                    ? calculateIntelligentAssetSize(assetDimensions, canvasDimensions)
                    : canvasDimensions;
                newOverlay = {
                    left: 0,
                    top: 0,
                    width,
                    height,
                    durationInFrames: 150, // 5 seconds default
                    from: Math.round(startTime * FPS),
                    rotation: 0,
                    row: trackIndex,
                    isDragging: false,
                    type: OverlayType.IMAGE,
                    content: imageUrl,
                    src: imageUrl,
                    styles: {
                        opacity: 1,
                        zIndex: 100,
                        transform: "none",
                        objectFit: "contain",
                        animation: {
                            enter: "none",
                            exit: "none",
                        },
                    },
                };
            }
            else if (itemType === 'audio' && (itemData === null || itemData === void 0 ? void 0 : itemData.data)) {
                const sound = itemData.data;
                // Use duration from drag data (audio duration in seconds)
                const durationFromMetadata = itemData.duration || 5; // Default to 5 seconds if not provided
                const durationInFrames = Math.round(durationFromMetadata * FPS);
                const mediaSrcDuration = durationFromMetadata;
                // Get audio source URL (works for both local and external media)
                const audioSrc = sound.src || sound.file || "";
                newOverlay = {
                    left: 0,
                    top: 0,
                    width: 1920,
                    height: 100,
                    durationInFrames,
                    from: Math.round(startTime * FPS),
                    rotation: 0,
                    row: trackIndex,
                    isDragging: false,
                    type: OverlayType.SOUND,
                    content: sound.title || sound.name || 'Audio',
                    src: audioSrc,
                    mediaSrcDuration,
                    styles: {
                        opacity: 1,
                    },
                };
            }
            else if (itemType === 'text' && (itemData === null || itemData === void 0 ? void 0 : itemData.data)) {
                const template = itemData.data;
                // Use duration from drag data
                const durationFromMetadata = itemData.duration || 3; // Default to 3 seconds if not provided
                const durationInFrames = Math.round(durationFromMetadata * FPS);
                
                // Extract src URL from template or itemData
                let textOverlaySrc = null;
                if (template.src || template.url) {
                    let rawTextUrl = template.src || template.url;
                    
                    // Check if URL is already double-prefixed
                    if (rawTextUrl.includes('/api/latest/local-media/serve/http') || rawTextUrl.includes('/api/latest/local-media/serve/https')) {
                        const match = rawTextUrl.match(/\/api\/latest\/local-media\/serve\/(https?:\/\/.+)/);
                        if (match && match[1]) {
                            rawTextUrl = match[1];
                        }
                    }
                    
                    // Process URL (same logic as video URLs)
                    if (rawTextUrl.startsWith("http://") || rawTextUrl.startsWith("https://") || rawTextUrl.startsWith("blob:")) {
                        textOverlaySrc = rawTextUrl;
                    } else {
                        const cleanPath = rawTextUrl.startsWith("/") ? rawTextUrl.slice(1) : rawTextUrl;
                        textOverlaySrc = `/api/latest/local-media/serve/${cleanPath}`;
                    }
                } else if (itemData.src || itemData.url) {
                    // Fallback to itemData if template doesn't have src
                    let rawTextUrl = itemData.src || itemData.url;
                    
                    // Check if URL is already double-prefixed
                    if (rawTextUrl.includes('/api/latest/local-media/serve/http') || rawTextUrl.includes('/api/latest/local-media/serve/https')) {
                        const match = rawTextUrl.match(/\/api\/latest\/local-media\/serve\/(https?:\/\/.+)/);
                        if (match && match[1]) {
                            rawTextUrl = match[1];
                        }
                    }
                    
                    // Process URL
                    if (rawTextUrl.startsWith("http://") || rawTextUrl.startsWith("https://") || rawTextUrl.startsWith("blob:")) {
                        textOverlaySrc = rawTextUrl;
                    } else {
                        const cleanPath = rawTextUrl.startsWith("/") ? rawTextUrl.slice(1) : rawTextUrl;
                        textOverlaySrc = `/api/latest/local-media/serve/${cleanPath}`;
                    }
                }
                
                // Convert letterSpacing to em if needed
                let letterSpacingEm = template.styles?.letterSpacing || '0em';
                if (typeof letterSpacingEm === 'string' && letterSpacingEm.endsWith('px')) {
                    const pxValue = parseFloat(letterSpacingEm) || 0;
                    letterSpacingEm = `${(pxValue / 16).toFixed(2)}em`;
                } else if (typeof letterSpacingEm === 'number') {
                    letterSpacingEm = `${letterSpacingEm}em`;
                } else if (!letterSpacingEm || letterSpacingEm === '0px' || letterSpacingEm === 0) {
                    letterSpacingEm = '0em';
                }
                
                // Console log the src URL for debugging (ID will be generated later)
                console.log('[TIMELINE-HANDLERS] Text Overlay - Using ID as replacement for src:', {
                    itemType: itemType,
                    trackIndex: trackIndex,
                    templateSrc: template.src || null,
                    templateUrl: template.url || null,
                    itemDataSrc: itemData.src || null,
                    itemDataUrl: itemData.url || null,
                    processedSrc: textOverlaySrc,
                    hasSrc: !!textOverlaySrc,
                    usingIdAsReplacement: !textOverlaySrc, // True if no src, will use ID instead
                    note: !textOverlaySrc ? 'No URL available - using overlay ID to fetch text style' : 'URL available - can use src',
                    templateStyles: template.styles || {},
                });
                
                // CRITICAL: Create complete styles object with ALL required properties for TextStylePanel
                const textContent = (_a = template.content) !== null && _a !== void 0 ? _a : "Testing";
                newOverlay = {
                    left: 100,
                    top: 100,
                    width: 500,
                    height: 180,
                    durationInFrames,
                    from: Math.round(startTime * FPS),
                    rotation: 0,
                    row: trackIndex,
                    isDragging: false,
                    type: OverlayType.TEXT,
                    content: textContent,
                    text: textContent, // Ensure both content and text properties exist for editing compatibility
                    src: textOverlaySrc, // URL for text overlay video/text source (can be null if no URL)
                    styles: {
                        // CRITICAL: Include ALL properties for TextStylePanel
                        fontSizeScale: template.styles?.fontSizeScale || 1.0, // Slider control (0.3-3)
                        fontSize: template.styles?.fontSize || '28px', // Backward compatibility
                        fontFamily: template.styles?.fontFamily || 'Inter', // Dropdown
                        fontWeight: String(template.styles?.fontWeight || '400'), // Dropdown
                        color: template.styles?.color || '#000000', // Color picker
                        textAlign: template.styles?.textAlign || 'left', // Toggle buttons
                        lineHeight: String(template.styles?.lineHeight || 1.2), // Internal
                        letterSpacing: letterSpacingEm, // Slider (MUST be em format)
                        opacity: template.styles?.opacity !== undefined ? template.styles.opacity : 1, // Rendering
                        textShadow: template.styles?.textShadow || null, // Effects
                        backgroundColor: template.styles?.backgroundColor || 'transparent', // Color picker
                        padding: template.styles?.padding || '0px', // Spacing
                        borderRadius: template.styles?.borderRadius || '0px', // Styling
                        zIndex: 300, // Z-index
                        transform: template.styles?.transform || "none", // Transform
                    },
                };
            }
            else {
                console.warn('[TIMELINE-HANDLERS] No data provided for item drop');
                return;
            }
            // Generate new ID for all overlay types - ensure it's always a number and unique
            const existingIds = overlays
                .map((o) => o?.id)
                .filter((id) => id !== undefined && id !== null && typeof id === 'number')
                .filter((id) => !isNaN(id));
            
            const newId = existingIds.length > 0 
                ? Math.max(...existingIds) + 1 
                : Date.now(); // Use timestamp as fallback for unique ID
            
            const overlayWithId = { ...newOverlay, id: newId };
            
            console.log('✅ [TIMELINE-HANDLERS] Generated overlay ID:', {
                overlayId: newId,
                overlayType: overlayWithId.type,
                hasContent: !!overlayWithId.content,
                hasText: !!overlayWithId.text,
                existingIdsCount: existingIds.length
            });
            
            // 🆕 LOG: Track overlay creation for all types
            console.log('🆕 [TIMELINE-HANDLERS] NEW OVERLAY CREATED:', {
                overlayId: newId,
                itemType: itemType,
                overlayType: overlayWithId.type,
                overlayTypeString: String(overlayWithId.type),
                from: overlayWithId.from,
                durationInFrames: overlayWithId.durationInFrames,
                row: overlayWithId.row,
                content: overlayWithId.content || overlayWithId.text || 'N/A',
                src: overlayWithId.src || 'N/A',
                hasSrc: !!overlayWithId.src,
                styles: overlayWithId.styles || {},
                fullOverlay: overlayWithId
            });
            
            // Log the final overlay ID for text overlays
            if (itemType === 'text') {
                console.log('[TIMELINE-HANDLERS] Text Overlay created with ID:', {
                    overlayId: newId,
                    hasSrc: !!overlayWithId.src,
                    src: overlayWithId.src || null,
                    styles: overlayWithId.styles || {},
                });
            }
            
            // 🆕 LOG: Before adding to overlays
            console.log('📊 [TIMELINE-HANDLERS] Before adding overlay:', {
                currentOverlayCount: overlays.length,
                newOverlayId: newId,
                newOverlayType: overlayWithId.type,
                existingOverlayIds: overlays.map(o => o.id)
            });
            
            // Add to overlays
            const updatedOverlays = [...overlays, overlayWithId];
            
            // 🆕 LOG: After creating updated overlays array
            console.log('✅ [TIMELINE-HANDLERS] Updated overlays array created:', {
                previousCount: overlays.length,
                newCount: updatedOverlays.length,
                newOverlayId: newId,
                allOverlayIds: updatedOverlays.map(o => o.id)
            });
            
            setOverlays(updatedOverlays);
            
            // 🆕 LOG: After setOverlays call
            console.log('🎯 [TIMELINE-HANDLERS] setOverlays called with new overlay:', {
                overlayId: newId,
                overlayType: overlayWithId.type,
                totalOverlays: updatedOverlays.length
            });
            
            // Select the new overlay
            setSelectedOverlayId(newId);
            // Open the appropriate sidebar panel
            if (itemType === 'video') {
                setActivePanel(OverlayType.VIDEO);
            }
            else if (itemType === 'image') {
                setActivePanel(OverlayType.IMAGE);
            }
            else if (itemType === 'audio') {
                setActivePanel(OverlayType.SOUND);
            }
            else if (itemType === 'text') {
                setActivePanel(OverlayType.TEXT);
            }
            console.log('[TIMELINE-HANDLERS] Successfully created overlay', overlayWithId);
        }
        catch (error) {
            console.error('[TIMELINE-HANDLERS] Error creating overlay from drop:', error);
        }
    }, [overlays, setOverlays, setSelectedOverlayId, setActivePanel, videoAdaptors, imageAdaptors, getAspectRatioDimensions]);
    return {
        isUpdatingFromTimelineRef,
        handleTracksChange,
        handleTimelineFrameChange,
        handleItemSelect,
        handleSelectedItemsChange,
        handleDeleteItems,
        handleDuplicateItems,
        handleSplitItems,
        handleItemMove,
        handleItemResize,
        handleNewItemDrop,
    };
};
