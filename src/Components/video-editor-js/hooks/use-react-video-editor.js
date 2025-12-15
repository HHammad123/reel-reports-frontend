import { useEditorContext } from "../contexts/editor-context";
import { useCallback } from "react";
/**
 * Enhanced useReactVideoEditor hook - the primary interface for programmatic control
 *
 * This hook provides a unified API for controlling the video editor programmatically.
 * All state changes can be monitored using standard React useEffect patterns.
 *
 * @returns {ReactVideoEditorAPI} Comprehensive API for video editor control
 *
 * @example
 * ```tsx
 * // Basic usage
 * const editor = useReactVideoEditor();
 *
 * // Control playback
 * editor.play();
 * editor.pause();
 * editor.seekTo(120);
 *
 * // Manage overlays
 * editor.addOverlay(newOverlay);
 * editor.selectOverlay(overlayId);
 *
 * // Monitor state changes with useEffect
 * useEffect(() => {
 *   console.log('Playback state:', editor.isPlaying, editor.currentFrame);
 * }, [editor.isPlaying, editor.currentFrame]);
 *
 * // Bulk operations
 * editor.setOverlays(newOverlays);
 * editor.setIsPlaying(true);
 * ```
 */
export const useReactVideoEditor = () => {
    const editorContext = useEditorContext();
    if (!editorContext) {
        throw new Error('useReactVideoEditor must be used within ReactVideoEditorProvider');
    }
    const { overlays, selectedOverlayId, setSelectedOverlayId, addOverlay, deleteOverlay, changeOverlay, updateOverlayStyles, duplicateOverlay, splitOverlay, isPlaying, currentFrame, playbackRate, setPlaybackRate, togglePlayPause, formatTime, durationInFrames, durationInSeconds, aspectRatio, setAspectRatio, playerDimensions, saveProject, resetOverlays, renderMedia, fps, playerRef, setOverlays, } = editorContext;
    // Enhanced player controls
    const play = useCallback(() => {
        if (!isPlaying) {
            togglePlayPause();
        }
    }, [isPlaying, togglePlayPause]);
    const pause = useCallback(() => {
        if (isPlaying) {
            togglePlayPause();
        }
    }, [isPlaying, togglePlayPause]);
    const seekTo = useCallback((frame) => {
        if (playerRef === null || playerRef === void 0 ? void 0 : playerRef.current) {
            playerRef.current.seekTo(frame);
        }
    }, [playerRef]);
    // Bulk state setters for external state management
    const setIsPlaying = useCallback((playing) => {
        if (playing !== isPlaying) {
            togglePlayPause();
        }
    }, [isPlaying, togglePlayPause]);
    const setCurrentFrame = useCallback((frame) => {
        seekTo(frame);
    }, [seekTo]);
    // Enhanced overlay operations
    const updateOverlay = useCallback((overlayId, updates) => {
        changeOverlay(overlayId, (overlay) => ({ ...overlay, ...updates }));
    }, [changeOverlay]);
    const selectOverlay = useCallback((overlayId) => {
        setSelectedOverlayId(overlayId);
    }, [setSelectedOverlayId]);
    return {
        // Overlays
        overlays,
        selectedOverlayId,
        addOverlay,
        deleteOverlay,
        updateOverlay,
        updateOverlayStyles,
        duplicateOverlay,
        splitOverlay,
        selectOverlay,
        // Player
        isPlaying,
        currentFrame,
        playbackRate,
        play,
        pause,
        togglePlayPause,
        seekTo,
        setPlaybackRate,
        // Timeline
        durationInFrames,
        durationInSeconds,
        formatTime,
        // Aspect Ratio
        aspectRatio,
        setAspectRatio,
        playerDimensions,
        // Project
        ...(saveProject && { saveProject }),
        resetOverlays,
        // Rendering
        renderMedia,
        // Settings
        fps,
        // Bulk Operations
        setOverlays,
        setIsPlaying,
        setCurrentFrame,
        setSelectedOverlayId,
    };
};
