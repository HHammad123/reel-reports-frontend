import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { useLocalMedia } from "../../../contexts/local-media-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { useAspectRatio } from "../../../hooks/use-aspect-ratio";
import { calculateIntelligentAssetSize, getAssetDimensions } from "../../../utils/asset-sizing";
import { OverlayType } from "../../../types";
import { LocalMediaGallery } from "./local-media-gallery";
import { DEFAULT_IMAGE_DURATION_FRAMES, IMAGE_DURATION_PERCENTAGE } from "../../../../constants";
/**
 * LocalMediaPanel Component
 *
 * A panel that allows users to:
 * 1. Upload their own media files (videos, images, audio)
 * 2. View and manage uploaded media files
 * 3. Add uploaded media to the timeline
 */
export const LocalMediaPanel = () => {
    const { overlays, currentFrame, setOverlays, setSelectedOverlayId, durationInFrames, aspectRatio } = useEditorContext();
    const { clearMediaFiles } = useLocalMedia();
    const { addAtPlayhead } = useTimelinePositioning();
    const { getAspectRatioDimensions } = useAspectRatio();
  // Session media injected via window from parent (VideosList)
  // Use state to make it reactive to window.__SESSION_MEDIA_FILES changes
  const [sessionMedia, setSessionMedia] = useState(() => {
    if (typeof window === "undefined") return [];
    const arr = window.__SESSION_MEDIA_FILES;
    return Array.isArray(arr) ? arr : [];
  });
  const sessionMediaAddedRef = useRef(false);
  
  // Update sessionMedia when window.__SESSION_MEDIA_FILES changes
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const checkSessionMedia = () => {
      const arr = window.__SESSION_MEDIA_FILES;
      const newSessionMedia = Array.isArray(arr) ? arr : [];
      setSessionMedia(newSessionMedia);
    };
    
    // Check initially
    checkSessionMedia();
    
    // Poll for changes (since window.__SESSION_MEDIA_FILES can be updated by VideosList)
    const interval = setInterval(checkSessionMedia, 500);
    
    return () => clearInterval(interval);
  }, []);
    /**
     * Load image to get its natural dimensions
     */
    const getImageDimensions = useCallback((imageSrc) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.onload = () => {
                resolve({
                    width: img.naturalWidth,
                    height: img.naturalHeight,
                });
            };
            img.onerror = () => {
                resolve(null);
            };
            img.src = imageSrc;
        });
    }, []);

    /**
     * Add a media file to the timeline
     * Memoized to prevent recreation on every frame update
     */
    const handleAddToTimeline = useCallback(async (file) => {
        const canvasDimensions = getAspectRatioDimensions();
        
        // For images, try to get dimensions from file or load the image
        let assetDimensions = getAssetDimensions(file);
        
        // If no dimensions in file object and it's an image, load the image to get dimensions
        if (!assetDimensions && file.type === "image") {
            const imageSrc = file.path || file.url || file.src || "";
            if (imageSrc) {
                // Determine the correct image source URL
                let mediaSrc = imageSrc;
                if (!imageSrc.startsWith("http://") && !imageSrc.startsWith("https://") && !imageSrc.startsWith("blob:")) {
                    const cleanPath = imageSrc.startsWith("/") ? imageSrc.slice(1) : imageSrc;
                    mediaSrc = `/api/latest/local-media/serve/${cleanPath}`;
                }
                assetDimensions = await getImageDimensions(mediaSrc);
            }
        }
        
        // Calculate size: use intelligent sizing if we have dimensions, otherwise use a reasonable default
        let width, height;
        if (assetDimensions) {
            const sized = calculateIntelligentAssetSize(assetDimensions, canvasDimensions);
            width = sized.width;
            height = sized.height;
        } else if (file.type === "image") {
            // For images without dimensions: Default to 50% of canvas size (maintains reasonable size without taking full canvas)
            // Use a 4:3 aspect ratio as a reasonable default
            const defaultWidth = Math.round(canvasDimensions.width * 0.5);
            const defaultHeight = Math.round(defaultWidth * 0.75); // 4:3 aspect ratio
            width = defaultWidth;
            height = defaultHeight;
        } else {
            // For videos without dimensions, use canvas dimensions (videos typically fill the canvas)
            width = canvasDimensions.width;
            height = canvasDimensions.height;
        }
        const { from, row, updatedOverlays } = addAtPlayhead(currentFrame, overlays, 'top');
        // Get raw path from file - check all possible locations
        let rawPath = file.path || file.url || file.src || "";
        
        // CRITICAL: Check if rawPath is already double-prefixed
        if (rawPath.includes('/api/latest/local-media/serve/http') || rawPath.includes('/api/latest/local-media/serve/https')) {
            console.warn('[LocalMediaPanel] WARNING: Double-prefixed URL detected!', rawPath);
            // Extract the actual URL
            const match = rawPath.match(/\/api\/latest\/local-media\/serve\/(https?:\/\/.+)/);
            if (match && match[1]) {
                rawPath = match[1];
                console.log('[LocalMediaPanel] Fixed double-prefixed URL:', rawPath);
            }
        }
        
        console.log('═══ ADD TO TIMELINE DEBUG ═══');
        console.log('File object:', file);
        console.log('Raw path:', rawPath);
        console.log('Starts with http:', rawPath.startsWith('http://'));
        console.log('Starts with https:', rawPath.startsWith('https://'));
        console.log('Starts with blob:', rawPath.startsWith('blob:'));
        
        let mediaSrc;
        if (!rawPath) {
            console.error('[LocalMediaPanel] No path found in file');
            return;
        } else if (rawPath.startsWith("http://") || rawPath.startsWith("https://") || rawPath.startsWith("blob:")) {
            // External URLs - use directly WITHOUT any prefix
            mediaSrc = rawPath;
            console.log('[LocalMediaPanel] ✓ Using external URL directly (no prefix):', mediaSrc);
        } else {
            // Local paths only - add serve prefix
            // Remove leading slash if present to avoid double slashes
            const cleanPath = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
            mediaSrc = `/api/latest/local-media/serve/${cleanPath}`;
            console.log('[LocalMediaPanel] ✓ Using local path with prefix:', mediaSrc);
        }
        
        console.log('Final mediaSrc:', mediaSrc);
        console.log('═══════════════════════════');

        if (!mediaSrc) {
            console.warn('[LocalMediaPanel] Skipping add: empty mediaSrc');
            return;
        }
        // Generate ID first - ensure we always get a valid numeric ID
        // Filter out undefined/null IDs and ensure we have valid numbers
        const validIds = updatedOverlays
            .map((o) => o?.id)
            .filter((id) => id != null && !isNaN(id) && typeof id === 'number');
        const newId = validIds.length > 0 
            ? Math.max(...validIds) + 1 
            : (overlays.length > 0 
                ? Math.max(...overlays.map((o) => o?.id || 0).filter(id => !isNaN(id))) + 1 
                : 0);
        
        // Ensure newId is a valid number
        if (isNaN(newId) || newId < 0) {
            console.error('[LocalMediaPanel] Invalid ID generated, using fallback');
            const fallbackId = Date.now(); // Use timestamp as fallback
            console.log('[LocalMediaPanel] Using fallback ID:', fallbackId);
        }
        
        const finalId = isNaN(newId) || newId < 0 ? Date.now() : newId;
        // Default position: CENTER (for both videos and images)
        const left = Math.round((canvasDimensions.width - width) / 2);
        const top = Math.round((canvasDimensions.height - height) / 2);
        let newOverlay;
        if (file.type === "video") {
            newOverlay = {
                id: finalId,
                left: left, // Default: CENTERED horizontally
                top: top, // Default: CENTERED vertically
                width,
                height,
                durationInFrames: file.duration ? Math.round(file.duration * 30) : 200, // Convert seconds to frames (assuming 30fps)
                from,
                rotation: 0,
                row,
                isDragging: false,
                type: OverlayType.VIDEO,
                content: file.thumbnail || mediaSrc,
                src: mediaSrc, // Use the correctly determined mediaSrc
                videoStartTime: 0,
                mediaSrcDuration: file.duration, // Set the source media duration in seconds
                styles: {
                    opacity: 1,
                    zIndex: 100,
                    transform: "none",
                    objectFit: "contain",
                },
            };
        }
        else if (file.type === "image") {
            // Use a percentage of composition duration for smart image length when there are existing overlays,
            // otherwise default to DEFAULT_IMAGE_DURATION_FRAMES
            const smartDuration = overlays.length > 0
                ? Math.round(durationInFrames * IMAGE_DURATION_PERCENTAGE)
                : DEFAULT_IMAGE_DURATION_FRAMES;
            // Use the calculated width and height from above (already centered via left/top calculated earlier)
            newOverlay = {
                id: finalId,
                left: left, // Default: CENTERED horizontally
                top: top, // Default: CENTERED vertically
                width, // Use calculated width (maintains image aspect ratio)
                height, // Use calculated height (maintains image aspect ratio)
                durationInFrames: smartDuration,
                from,
                rotation: 0,
                row,
                isDragging: false,
                type: OverlayType.IMAGE,
                src: mediaSrc, // Use the API route instead of direct path
                content: mediaSrc,
                styles: {
                    objectFit: "contain", // Maintain aspect ratio, don't stretch
                    animation: {
                        enter: "fadeIn",
                        exit: "fadeOut",
                    },
                },
            };
        }
        else if (file.type === "audio") {
            newOverlay = {
                id: finalId,
                left: 0,
                top: 0,
                width: 0,
                height: 0,
                durationInFrames: file.duration ? Math.round(file.duration * 30) : 200,
                from,
                rotation: 0,
                row,
                isDragging: false,
                type: OverlayType.SOUND,
                content: file.name,
                src: mediaSrc, // Use the API route instead of direct path
                mediaSrcDuration: file.duration, // Set the source media duration in seconds
                styles: {
                    volume: 1,
                },
            };
        }
        else {
            return; // Unsupported file type
        }
        // Ensure the overlay has a valid ID before adding
        if (!newOverlay.id || isNaN(newOverlay.id)) {
            console.error('[LocalMediaPanel] Overlay missing valid ID:', newOverlay);
            newOverlay.id = finalId; // Force set the ID
        }
        
        // Update overlays with both the shifted overlays and the new overlay in a single operation
        const finalOverlays = [...updatedOverlays, newOverlay];
        setOverlays(finalOverlays);
        setSelectedOverlayId(newOverlay.id);
        
        console.log('[LocalMediaPanel] Added overlay with ID:', newOverlay.id, 'Type:', newOverlay.type);
    }, [currentFrame, overlays, addAtPlayhead, getAspectRatioDimensions, setOverlays, setSelectedOverlayId, durationInFrames, getImageDimensions]);

    // REMOVED: Auto-loading from LocalMediaPanel
    // Videos are now automatically added to timeline in VideosList.js after session data API succeeds

    // Clear all videos from timeline and upload section
    const handleClearAll = useCallback(async () => {
        try {
            // Clear timeline overlays
            setOverlays([]);
            setSelectedOverlayId(null);
            
            // Clear uploaded media files from IndexedDB
            await clearMediaFiles();
            
            // Reset session media flag
            sessionMediaAddedRef.current = false;
            
            // Clear session media from window
            if (typeof window !== 'undefined') {
                window.__SESSION_MEDIA_FILES = [];
            }
            
            console.log('[LocalMediaPanel] Cleared all videos from timeline and uploads');
        } catch (error) {
            console.error('[LocalMediaPanel] Error clearing all:', error);
        }
    }, [setOverlays, setSelectedOverlayId, clearMediaFiles]);

    return (_jsx("div", { className: "flex flex-col gap-4 p-2 bg-white h-full min-h-0 overflow-hidden", children: _jsx(LocalMediaGallery, { onSelectMedia: handleAddToTimeline, sessionMedia: sessionMedia, onClearAll: handleClearAll, aspectRatio: aspectRatio || '16:9' }) }));
};
export default LocalMediaPanel;
