import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import Timeline from '../../advanced-timeline/timeline';
import { useEditorContext } from '../../../contexts/editor-context';
import { useEditorSidebar } from '../../../contexts/sidebar-context';
import { useTimelineTransforms } from './hooks/use-timeline-transforms';
import { useTimelineHandlers } from './hooks/use-timeline-handlers';
import { useTimelineResize } from './hooks/use-timeline-resize';
import { TimelineResizeHandle } from './components';
import { OverlayType } from '../../../types';
import { FPS } from '../../../../constants';
/**
 * TimelineSection Component
 *
 * Encapsulates all timeline-related logic including:
 * - Data transformation between overlays and timeline tracks
 * - Event handlers for timeline interactions
 * - State management for timeline synchronization
 */
export const TimelineSection = () => {
    /** State for timeline tracks derived from overlays */
    const [timelineTracks, setTimelineTracks] = React.useState([]);
    /** Ref to track last processed overlays to prevent unnecessary re-renders */
    const lastProcessedOverlaysRef = React.useRef([]);
    /** State for timeline collapse */
    const [isTimelineCollapsed, setIsTimelineCollapsed] = React.useState(false);
    /** Ref to the Timeline component for imperative actions like scrolling */
    const timelineRef = React.useRef(null);
    /** Ref to track previous overlay IDs for detecting new items */
    const prevOverlayIdsRef = React.useRef(new Set());
    /** Get editor context values */
    const { overlays, currentFrame, isPlaying, playerRef, togglePlayPause, durationInFrames, setSelectedOverlayId, selectedOverlayIds, setSelectedOverlayIds, deleteOverlay, duplicateOverlay, splitOverlay, handleOverlayChange, setOverlays, 
    // Add playback controls
    playbackRate, setPlaybackRate, 
    // Add aspect ratio controls
    aspectRatio, setAspectRatio, } = useEditorContext();
    // Get sidebar context for setting active panel
    const { setActivePanel, setIsOpen } = useEditorSidebar();
    // Track sidebar visibility and open state by checking DOM
    const [sidebarVisible, setSidebarVisible] = React.useState(false);
    const [contentSidebarOpen, setContentSidebarOpen] = React.useState(false);
    
    // Check sidebar state from DOM - this works even when showSidebar prop changes
    React.useEffect(() => {
        const checkSidebarState = () => {
            // First, check if sidebar is visible at all (showSidebar prop)
            const sidebarExists = document.querySelector('[data-sidebar="sidebar"]') !== null;
            setSidebarVisible(sidebarExists);
            
            if (!sidebarExists) {
                setContentSidebarOpen(false);
                return;
            }
            
            // Look for sidebar elements - check if content sidebar (not icon sidebar) is expanded
            const allSidebars = document.querySelectorAll('[data-sidebar="sidebar"]');
            let isContentOpen = false;
            
            allSidebars.forEach((sidebar) => {
                // Find parent with data-state attribute
                const parentWithState = sidebar.closest('[data-state]');
                if (parentWithState) {
                    const state = parentWithState.getAttribute('data-state');
                    // Check if this is the content sidebar (not icon sidebar)
                    // Icon sidebar has collapsible="none", content sidebar doesn't
                    const isIconSidebar = sidebar.closest('[data-collapsible="none"]');
                    if (!isIconSidebar && state === 'expanded') {
                        isContentOpen = true;
                    }
                }
            });
            
            // Fallback: check if any sidebar with expanded state exists
            if (!isContentOpen) {
                const expandedSidebar = document.querySelector('[data-state="expanded"][data-sidebar="sidebar"], [data-state="expanded"] [data-sidebar="sidebar"]');
                if (expandedSidebar) {
                    // Make sure it's not the icon sidebar
                    const isIconSidebar = expandedSidebar.closest('[data-collapsible="none"]');
                    if (!isIconSidebar) {
                        isContentOpen = true;
                    }
                }
            }
            
            setContentSidebarOpen(isContentOpen);
        };
        
        // Initial check with small delay to ensure DOM is ready
        const timeoutId = setTimeout(checkSidebarState, 50);
        
        // Watch for changes using MutationObserver
        const observer = new MutationObserver(checkSidebarState);
        
        // Observe the document body for changes
        observer.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: ['data-state', 'data-sidebar', 'data-collapsible']
        });
        
        // Also check periodically as a fallback
        const interval = setInterval(checkSidebarState, 150);
        
        return () => {
            clearTimeout(timeoutId);
            observer.disconnect();
            clearInterval(interval);
        };
    }, []);
    // Get transformation functions
    const { transformOverlaysToTracks } = useTimelineTransforms();
    // Scroll timeline when new items are added (top for most, bottom for audio)
    React.useEffect(() => {
        var _a, _b;
        const currentIds = new Set(overlays.map(o => o.id));
        const prevIds = prevOverlayIdsRef.current;
        // Find newly added overlays
        const newOverlays = overlays.filter(o => !prevIds.has(o.id));
        // Only scroll when items are added (not on initial load)
        if (newOverlays.length > 0 && prevIds.size > 0) {
            // Check if any of the new items are audio/sound type
            const hasAudioItem = newOverlays.some(o => o.type === OverlayType.SOUND);
            if (hasAudioItem) {
                (_a = timelineRef.current) === null || _a === void 0 ? void 0 : _a.scroll.scrollToBottom();
            }
            else {
                (_b = timelineRef.current) === null || _b === void 0 ? void 0 : _b.scroll.scrollToTop();
            }
        }
        // Update the previous IDs
        prevOverlayIdsRef.current = currentIds;
    }, [overlays]);
    // Get timeline handlers
    const { isUpdatingFromTimelineRef, handleTracksChange, handleTimelineFrameChange, handleItemSelect, handleSelectedItemsChange, handleDeleteItems, handleDuplicateItems, handleSplitItems, handleItemMove, handleItemResize, handleNewItemDrop, } = useTimelineHandlers({
        overlays,
        playerRef,
        setSelectedOverlayId,
        setSelectedOverlayIds,
        deleteOverlay,
        duplicateOverlay,
        splitOverlay,
        handleOverlayChange,
        setOverlays,
        setActivePanel,
        setIsOpen,
    });
    // Update timeline tracks when overlays change (but not during timeline updates)
    React.useEffect(() => {
        const isUpdating = isUpdatingFromTimelineRef.current;
        if (!isUpdating) {
            // Only update if overlays have actually changed (deep comparison of key properties)
            const hasChanged = overlays.length !== lastProcessedOverlaysRef.current.length ||
                overlays.some((overlay, index) => {
                    const lastOverlay = lastProcessedOverlaysRef.current[index];
                    if (!lastOverlay) {
                        return true;
                    }
                    // Check basic properties
                    if (overlay.id !== lastOverlay.id ||
                        overlay.from !== lastOverlay.from ||
                        overlay.durationInFrames !== lastOverlay.durationInFrames ||
                        overlay.row !== lastOverlay.row ||
                        overlay.type !== lastOverlay.type ||
                        overlay.width !== lastOverlay.width ||
                        overlay.height !== lastOverlay.height ||
                        overlay.left !== lastOverlay.left ||
                        overlay.top !== lastOverlay.top ||
                        overlay.isDragging !== lastOverlay.isDragging) {
                        return true;
                    }
                    // Check text overlay specific properties
                    if (overlay.type === OverlayType.TEXT) {
                        const textOverlay = overlay;
                        const lastTextOverlay = lastOverlay;
                        if (textOverlay.content !== lastTextOverlay.content ||
                            JSON.stringify(textOverlay.styles || {}) !== JSON.stringify(lastTextOverlay.styles || {})) {
                            return true;
                        }
                    }
                    // Check caption overlay specific properties
                    if (overlay.type === OverlayType.CAPTION) {
                        const captionOverlay = overlay;
                        const lastCaptionOverlay = lastOverlay;
                        if (JSON.stringify(captionOverlay.styles || {}) !== JSON.stringify(lastCaptionOverlay.styles || {}) ||
                            JSON.stringify(captionOverlay.captions || []) !== JSON.stringify(lastCaptionOverlay.captions || [])) {
                            return true;
                        }
                    }
                    // Check sound overlay specific properties (including fade effects)
                    if (overlay.type === OverlayType.SOUND) {
                        const soundOverlay = overlay; // SoundOverlay type
                        const lastSoundOverlay = lastOverlay;
                        if (JSON.stringify(soundOverlay.styles || {}) !== JSON.stringify(lastSoundOverlay.styles || {})) {
                            return true;
                        }
                    }
                    // Check video overlay specific properties (for video replacement)
                    if (overlay.type === OverlayType.VIDEO) {
                        const videoOverlay = overlay;
                        const lastVideoOverlay = lastOverlay;
                        // Check if video source or content changed (important for video replacement)
                        if (videoOverlay.src !== lastVideoOverlay.src ||
                            videoOverlay.content !== lastVideoOverlay.content ||
                            videoOverlay.videoStartTime !== lastVideoOverlay.videoStartTime ||
                            videoOverlay.mediaSrcDuration !== lastVideoOverlay.mediaSrcDuration) {
                            return true;
                        }
                    }
                    // Check image overlay specific properties (for image replacement)
                    if (overlay.type === OverlayType.IMAGE) {
                        const imageOverlay = overlay;
                        const lastImageOverlay = lastOverlay;
                        // Check if image source changed (important for image replacement)
                        if (imageOverlay.src !== lastImageOverlay.src) {
                            return true;
                        }
                    }
                    // Check video/image/sticker overlay styles (for padding, filters, etc.)
                    // OPTIMIZED: Only check key style properties instead of full JSON.stringify
                    if ('styles' in overlay && 'styles' in lastOverlay) {
                        const currentStyles = overlay.styles || {};
                        const lastStyles = lastOverlay.styles || {};
                        // Only check important properties that affect rendering
                        const importantProps = ['opacity', 'filter', 'transform', 'objectFit', 'padding', 'borderRadius'];
                        for (const prop of importantProps) {
                            if (currentStyles[prop] !== lastStyles[prop]) {
                            return true;
                            }
                        }
                    }
                    return false;
                });
            if (hasChanged) {
                lastProcessedOverlaysRef.current = [...overlays];
                setTimelineTracks(transformOverlaysToTracks(overlays));
            }
        }
    }, [overlays, transformOverlaysToTracks, isUpdatingFromTimelineRef]);
    // Playback control handlers
    const handlePlay = React.useCallback(() => {
        if (!isPlaying) {
            togglePlayPause();
        }
    }, [isPlaying, togglePlayPause]);
    const handlePause = React.useCallback(() => {
        if (isPlaying) {
            togglePlayPause();
        }
    }, [isPlaying, togglePlayPause]);
    const handleSeekToStart = React.useCallback(() => {
        if (playerRef === null || playerRef === void 0 ? void 0 : playerRef.current) {
            playerRef.current.seekTo(0);
        }
    }, [playerRef]);
    const handleSeekToEnd = React.useCallback(() => {
        if (playerRef === null || playerRef === void 0 ? void 0 : playerRef.current) {
            const endFrame = Math.max(0, durationInFrames - 1);
            playerRef.current.seekTo(endFrame);
        }
    }, [playerRef, durationInFrames]);
    // Timeline resize functionality
    const { bottomHeight, isResizing, handleMouseDown, handleTouchStart } = useTimelineResize({
        overlays,
    });
    // Collapse handler
    const handleCollapseChange = React.useCallback((collapsed) => {
        setIsTimelineCollapsed(collapsed);
    }, []);
    // Calculate effective height based on collapse state
    const HEADER_HEIGHT = 57; // Height of timeline header
    const effectiveHeight = isTimelineCollapsed ? HEADER_HEIGHT : bottomHeight;
    // Calculate margin-left based on sidebar state
    // When sidebar is visible: shift by icon sidebar width + content sidebar width (if content sidebar is open)
    // When sidebar is hidden: no shift
    const sidebarOffset = sidebarVisible 
        ? (contentSidebarOpen 
            ? 'calc(var(--sidebar-width-icon) + var(--sidebar-width) * 1.0)'
            : 'calc(var(--sidebar-width-icon) + var(--sidebar-width) * 1.0)')
        : '0';
    return (_jsxs(_Fragment, { children: [_jsx(TimelineResizeHandle, { onMouseDown: handleMouseDown, onTouchStart: handleTouchStart, isResizing: isResizing }), _jsx("div", { style: {
                    height: `${effectiveHeight}px`,
                    marginLeft: sidebarOffset,
                    marginBottom: '150px',
                    transition: 'margin-left 300ms ease-in-out',
                    // No maxHeight constraint - timeline can be dragged to bottom
                }, className: "flex flex-col overflow-hidden", children: _jsx(Timeline, { ref: timelineRef, tracks: timelineTracks, totalDuration: durationInFrames / FPS, currentFrame: currentFrame, fps: FPS, onFrameChange: handleTimelineFrameChange, onItemMove: handleItemMove, onItemResize: handleItemResize, onItemSelect: handleItemSelect, onSelectedItemsChange: handleSelectedItemsChange, onDeleteItems: handleDeleteItems, onDuplicateItems: handleDuplicateItems, onSplitItems: handleSplitItems, selectedItemIds: selectedOverlayIds.filter((id) => typeof id === 'number' && !isNaN(id)).map((id) => id.toString()), onTracksChange: handleTracksChange, onNewItemDrop: handleNewItemDrop, showZoomControls: true, showTimelineGuidelines: true, enableTrackDrag: true, enableMagneticTrack: true, enableTrackDelete: true, showPlaybackControls: true, isPlaying: isPlaying, hideItemsOnDrag: true, onPlay: handlePlay, onPause: handlePause, onSeekToStart: handleSeekToStart, onSeekToEnd: handleSeekToEnd, playbackRate: playbackRate, setPlaybackRate: setPlaybackRate, showUndoRedoControls: true, aspectRatio: aspectRatio, onAspectRatioChange: setAspectRatio, showAspectRatioControls: true, onCollapseChange: handleCollapseChange, overlays: overlays }) })] }));
};
