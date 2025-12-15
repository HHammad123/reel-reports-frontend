import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useMemo, useRef, useEffect } from "react";
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
    const { overlays, currentFrame, setOverlays, setSelectedOverlayId, durationInFrames } = useEditorContext();
    const { clearMediaFiles } = useLocalMedia();
    const { addAtPlayhead } = useTimelinePositioning();
    const { getAspectRatioDimensions } = useAspectRatio();
  // Session media injected via window from parent (VideosList)
  const sessionMedia = useMemo(() => {
    if (typeof window === "undefined") return [];
    const arr = window.__SESSION_MEDIA_FILES;
    return Array.isArray(arr) ? arr : [];
  }, []);
  const sessionMediaAddedRef = useRef(false);
    /**
     * Add a media file to the timeline
     * Memoized to prevent recreation on every frame update
     */
    const handleAddToTimeline = useCallback((file) => {
        const canvasDimensions = getAspectRatioDimensions();
        // Note: Local media files don't currently store dimension information
        // For intelligent sizing, we would need to extract dimensions during upload
        // For now, we fall back to canvas dimensions
        const assetDimensions = getAssetDimensions(file);
        const { width, height } = assetDimensions
            ? calculateIntelligentAssetSize(assetDimensions, canvasDimensions)
            : canvasDimensions;
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
        // Generate ID first
        const newId = updatedOverlays.length > 0 ? Math.max(...updatedOverlays.map((o) => o.id)) + 1 : 0;
        // Default position: CENTER (always center videos by default)
        // canvasDimensions is already declared above, reuse it
        const left = Math.round((canvasDimensions.width - width) / 2);
        const top = Math.round((canvasDimensions.height - height) / 2);
        let newOverlay;
        if (file.type === "video") {
            newOverlay = {
                id: newId,
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
            newOverlay = {
                id: newId,
                left: 0,
                top: 0,
                width,
                height,
                durationInFrames: smartDuration,
                from,
                rotation: 0,
                row,
                isDragging: false,
                type: OverlayType.IMAGE,
                src: mediaSrc, // Use the API route instead of direct path
                content: mediaSrc,
                styles: {
                    objectFit: "fill",
                    animation: {
                        enter: "fadeIn",
                        exit: "fadeOut",
                    },
                },
            };
        }
        else if (file.type === "audio") {
            newOverlay = {
                id: newId,
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
        // Update overlays with both the shifted overlays and the new overlay in a single operation
        const finalOverlays = [...updatedOverlays, newOverlay];
        setOverlays(finalOverlays);
        setSelectedOverlayId(newId);
    }, [currentFrame, overlays, addAtPlayhead, getAspectRatioDimensions, setOverlays, setSelectedOverlayId]);

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

    return (_jsx("div", { className: "flex flex-col gap-4 p-2 bg-background h-full", children: _jsx(LocalMediaGallery, { onSelectMedia: handleAddToTimeline, sessionMedia: sessionMedia, onClearAll: handleClearAll }) }));
};
export default LocalMediaPanel;
