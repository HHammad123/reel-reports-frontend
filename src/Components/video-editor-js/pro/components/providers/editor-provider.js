import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useCallback, useEffect, useRef } from "react";
import { EditorProvider as EditorContextProvider } from "../../contexts/editor-context";
import { useOverlays } from "../../hooks/use-overlays";
import { useVideoPlayer } from "../../hooks/use-video-player";
// Removed useHistory import - Timeline now manages its own history
import { useCompositionDuration } from "../../hooks/use-composition-duration";
// Autosave removed - no longer using useAutosave
import { useAspectRatio } from "../../hooks/use-aspect-ratio";
import { useRendering } from "../../hooks/use-rendering";
import { useRenderer } from "../../contexts/renderer-context";
import { TIMELINE_CONSTANTS } from "../advanced-timeline/constants";
import { transformOverlaysForAspectRatio, shouldTransformOverlays, getDimensionsForAspectRatio } from "../../utils/aspect-ratio-transform";
export const EditorProvider = ({ children, projectId, defaultOverlays = [], defaultAspectRatio, defaultBackgroundColor, autoSaveInterval = 10000, fps = 30, onSaving, onSaved, onOverlaysChange, 
// Loading State
isLoadingProject = false, 
// Player Configuration
playerRef: externalPlayerRef, 
// API Configuration
baseUrl, 
// Configuration props
initialRows = 5, maxRows = 8, zoomConstraints = {
    min: 0.2,
    max: 10,
    step: 0.1,
    default: 1,
}, snappingConfig = {
    thresholdFrames: 1,
    enableVerticalSnapping: true,
}, disableMobileLayout = false, disableVideoKeyframes = false, enablePushOnDrag = false, videoWidth = 1280, videoHeight = 720, }) => {
    var _a;
    // Get renderer configuration to extract render type
    const rendererConfig = useRenderer();
    const renderType = ((_a = rendererConfig.renderer.renderType) === null || _a === void 0 ? void 0 : _a.type) || "ssr";
    // Initialize hooks
    const { overlays, setOverlays, selectedOverlayId, setSelectedOverlayId, 
    // Multi-select support
    selectedOverlayIds, setSelectedOverlayIds, changeOverlay, addOverlay, deleteOverlay, duplicateOverlay, splitOverlay, handleOverlayChange, resetOverlays, } = useOverlays(defaultOverlays);
    // Update overlays when defaultOverlays change AND project is loading
    // This ensures project overlays are applied when they finish loading
    const previousDefaultOverlaysRef = useRef(defaultOverlays);
    useEffect(() => {
        // Apply defaultOverlays when they change (for both project loading and session videos)
        if (isLoadingProject === false) {
            const hasChanged = defaultOverlays !== previousDefaultOverlaysRef.current;
            
            if (hasChanged) {
                // Check if there's a projectId in URL (meaning we loaded a project)
                const hasProjectId = typeof window !== 'undefined' &&
                    new URLSearchParams(window.location.search).has('projectId');
                
                // Apply overlays if: (1) project loaded with projectId, OR (2) defaultOverlays changed and not empty (session videos)
                if (hasProjectId || defaultOverlays.length > 0) {
                    // console.log('[EditorProvider] Applying default overlays:', defaultOverlays.length, hasProjectId ? '(project)' : '(session videos)');
                    setOverlays(defaultOverlays);
                } else if (defaultOverlays.length === 0 && previousDefaultOverlaysRef.current.length > 0) {
                    // Clear overlays when defaultOverlays becomes empty
                    // console.log('[EditorProvider] Clearing overlays (defaultOverlays is empty)');
                    setOverlays([]);
                }
            }
        }
        previousDefaultOverlaysRef.current = defaultOverlays;
    }, [defaultOverlays, isLoadingProject, setOverlays]);
    const { isPlaying, currentFrame, playerRef: internalPlayerRef, togglePlayPause, formatTime, play, pause, seekTo } = useVideoPlayer(fps, externalPlayerRef);
    // Use external playerRef if provided, otherwise use internal one
    const playerRef = externalPlayerRef || internalPlayerRef;
    
    // CRITICAL: Force reload Scene 1 audio when timeline is at frame 0
    useEffect(() => {
        if (currentFrame === 0) {
            // Find all Scene 1 audio elements in DOM
            const scene1AudioElements = document.querySelectorAll('audio[data-scene-1-audio="true"]');
            
            if (scene1AudioElements.length > 0) {
                scene1AudioElements.forEach((audio, index) => {
                    // Force reload to ensure it's ready
                    audio.currentTime = 0;
                    audio.load();
                });
            }
        }
    }, [currentFrame]);
    
    // CRITICAL: Ensure Remotion uses preloaded Scene 1 audio - intercept audio element creation
    useEffect(() => {
        // Watch for Remotion creating new audio elements
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                mutation.addedNodes.forEach((node) => {
                    if (node.tagName === 'AUDIO') {
                        const audioElement = node;
                        const src = audioElement.src;
                        
                        // Check if this is Scene 1 audio
                        if (window.__SCENE_1_AUDIO_ELEMENTS && window.__SCENE_1_AUDIO_ELEMENTS.has(src)) {
                            const preloadedAudio = window.__SCENE_1_AUDIO_ELEMENTS.get(src);
                            
                            // Force the new element to use preloaded data
                            audioElement.load();
                            
                            // Mirror the preloaded audio state
                            if (preloadedAudio.readyState >= 3) {
                                audioElement.currentTime = 0;
                            }
                            
                            audioElement.addEventListener('error', (e) => {
                                console.error('[EditorProvider] ❌ Remotion audio ERROR:', {
                                    error: e,
                                    src: src?.substring(0, 60)
                                });
                            });
                            
                            // CRITICAL: Store reference to sync playback state
                            if (!window.__ALL_AUDIO_ELEMENTS) {
                                window.__ALL_AUDIO_ELEMENTS = new Set();
                            }
                            window.__ALL_AUDIO_ELEMENTS.add(audioElement);
                        }
                        
                        // Store ALL audio elements, not just Scene 1
                        if (!window.__ALL_AUDIO_ELEMENTS) {
                            window.__ALL_AUDIO_ELEMENTS = new Set();
                        }
                        window.__ALL_AUDIO_ELEMENTS.add(audioElement);
                    }
                });
            });
        });
        
        // Observe the entire document for audio elements
        observer.observe(document.body, {
            childList: true,
            subtree: true
        });
        
        return () => observer.disconnect();
    }, []);
    
    // CRITICAL: Wait for Scene 1 audio to be ready on mount
    useEffect(() => {
        const audioOverlaysAtStart = overlays.filter(o => {
            const overlayType = String(o?.type || '').toLowerCase();
            return (overlayType === 'sound' || o.type === 'sound') && (o.from || 0) === 0;
        });
        
        if (audioOverlaysAtStart.length === 0) {
            return;
        }
        
        let checkCount = 0;
        const maxChecks = 50; // 5 seconds max
        
        const checkAudioReady = setInterval(() => {
            checkCount++;
            
            let allReady = true;
            const statuses = [];
            
            audioOverlaysAtStart.forEach(overlay => {
                const audioElement = document.querySelector(`audio[data-scene-1-audio="true"][data-overlay-id="${overlay.id}"]`);
                
                if (!audioElement) {
                    allReady = false;
                    statuses.push({ id: overlay.id, status: 'NOT_FOUND' });
                } else if (audioElement.readyState < 3) { // Less than HAVE_FUTURE_DATA
                    allReady = false;
                    statuses.push({ 
                        id: overlay.id, 
                        status: 'LOADING', 
                        readyState: audioElement.readyState 
                    });
                } else {
                    statuses.push({ 
                        id: overlay.id, 
                        status: 'READY', 
                        readyState: audioElement.readyState 
                    });
                }
            });
            
            if (allReady) {
                clearInterval(checkAudioReady);
            } else if (checkCount >= maxChecks) {
                console.warn('[EditorProvider] ⚠️ Scene 1 audio readiness check TIMEOUT after 5s:', statuses);
                clearInterval(checkAudioReady);
            }
        }, 100);
        
        return () => clearInterval(checkAudioReady);
    }, [overlays]);
    
    // CRITICAL: Check Scene 1 audio volume when playback starts
    useEffect(() => {
        if (isPlaying && currentFrame <= 30) { // Within first second
            // Find all audio elements
            const allAudioElements = document.querySelectorAll('audio');
            
            allAudioElements.forEach((audio, index) => {
                // Force unmute and set volume
                if (audio.muted) {
                    audio.muted = false;
                }
                
                if (audio.volume === 0) {
                    audio.volume = 1;
                }
            });
        }
    }, [isPlaying, currentFrame]);
    
    // CRITICAL: Sync audio playback with timeline state
    useEffect(() => {
        // Find all audio overlays (not just Scene 1)
        const audioOverlays = overlays.filter(o => {
            const overlayType = String(o?.type || '').toLowerCase();
            return overlayType === 'sound' || o.type === 'sound';
        });
        
        if (audioOverlays.length === 0) {
            return;
        }
        
        // Process all audio overlays
        audioOverlays.forEach((overlay) => {
            const audioStartFrame = overlay.from || 0;
            const audioEndFrame = audioStartFrame + (overlay.durationInFrames || 0);
            const isWithinAudioRange = currentFrame >= audioStartFrame && currentFrame < audioEndFrame;
            
            // Find all audio elements for this overlay
            const audioElements = document.querySelectorAll(`audio[src="${overlay.src}"]`);
            
            audioElements.forEach((audio) => {
                // CRITICAL: If timeline is paused, ALWAYS pause audio (no exceptions)
                if (!isPlaying) {
                    if (!audio.paused) {
                        audio.pause();
                    }
                    return; // Don't do anything else if paused
                }
                
                // Only proceed if timeline is playing
                if (isPlaying && isWithinAudioRange) {
                    // Timeline is playing and we're within this audio's time range
                    if (audio.paused && audio.readyState >= 2) {
                        audio.volume = overlay.styles?.volume || 1;
                        audio.muted = false;
                        
                        // Calculate the correct currentTime based on frame position
                        const framesIntoAudio = currentFrame - audioStartFrame;
                        const secondsIntoAudio = framesIntoAudio / fps;
                        audio.currentTime = Math.max(0, secondsIntoAudio);
                        
                        audio.play()
                            .catch((error) => {
                                console.error('[EditorProvider] ❌ Failed to play audio:', error);
                            });
                    } else if (!audio.paused) {
                        // Audio is already playing, but sync the currentTime in case we seeked
                        const framesIntoAudio = currentFrame - audioStartFrame;
                        const secondsIntoAudio = framesIntoAudio / fps;
                        const targetTime = Math.max(0, secondsIntoAudio);
                        
                        // Only update if there's a significant difference to avoid constant updates
                        if (Math.abs(audio.currentTime - targetTime) > 0.1) {
                            audio.currentTime = targetTime;
                        }
                    }
                }
            });
        });
    }, [isPlaying, currentFrame, overlays, fps]);
    
    // CRITICAL: Pause ALL audio elements when timeline is paused - IMMEDIATE and AGGRESSIVE
    useEffect(() => {
        if (!isPlaying) {
            // IMMEDIATE: Pause all audio synchronously first
            const pauseAllAudioImmediate = () => {
                const allAudioElements = document.querySelectorAll('audio');
                
                allAudioElements.forEach((audio, index) => {
                    if (!audio.paused) {
                        audio.pause();
                    }
                });
            };
            
            // Execute immediately
            pauseAllAudioImmediate();
            
            // Also use requestAnimationFrame to catch any audio that might start after
            requestAnimationFrame(() => {
                pauseAllAudioImmediate();
            });
            
            // And use setTimeout as a final catch
            setTimeout(() => {
                pauseAllAudioImmediate();
            }, 0);
            
            // Set up an interval to continuously check and pause for a short period
            const checkInterval = setInterval(() => {
                const allAudioElements = document.querySelectorAll('audio');
                let foundPlaying = false;
                
                allAudioElements.forEach((audio) => {
                    if (!audio.paused) {
                        foundPlaying = true;
                        audio.pause();
                    }
                });
                
                if (!foundPlaying) {
                    clearInterval(checkInterval);
                }
            }, 50); // Check every 50ms
            
            // Clear interval after 1 second (should be enough)
            setTimeout(() => {
                clearInterval(checkInterval);
            }, 1000);
            
        } else {
            // Timeline is playing - ensure audio that should be playing actually plays
            // Give Remotion a moment to handle playback, then check if we need to step in
            setTimeout(() => {
                const audioOverlays = overlays.filter(o => {
                    const overlayType = String(o?.type || '').toLowerCase();
                    return overlayType === 'sound' || o.type === 'sound';
                });
                
                audioOverlays.forEach((overlay) => {
                    const audioStartFrame = overlay.from || 0;
                    const audioEndFrame = audioStartFrame + (overlay.durationInFrames || 0);
                    const isWithinAudioRange = currentFrame >= audioStartFrame && currentFrame < audioEndFrame;
                    
                    if (isWithinAudioRange) {
                        const audioElements = document.querySelectorAll(`audio[src="${overlay.src}"]`);
                        
                        audioElements.forEach((audio) => {
                            if (audio.paused && audio.readyState >= 2) {
                                audio.volume = overlay.styles?.volume || 1;
                                audio.muted = false;
                                
                                const framesIntoAudio = currentFrame - audioStartFrame;
                                const secondsIntoAudio = framesIntoAudio / fps;
                                audio.currentTime = Math.max(0, secondsIntoAudio);
                                
                                audio.play()
                                    .catch((error) => {
                                        console.error('[EditorProvider] ❌ Failed to resume audio:', error);
                                    });
                            }
                        });
                    }
                });
            }, 100); // Small delay to let Remotion handle it first
        }
    }, [isPlaying, currentFrame, overlays, fps]);
    
    // Pause all audio when window loses focus
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                const allAudioElements = document.querySelectorAll('audio');
                allAudioElements.forEach((audio) => {
                    if (!audio.paused) {
                        audio.pause();
                        // Mark that we paused it
                        audio.setAttribute('data-paused-by-visibility', 'true');
                    }
                });
            }
        };
        
        const handleBlur = () => {
            const allAudioElements = document.querySelectorAll('audio');
            allAudioElements.forEach((audio) => {
                if (!audio.paused) {
                    audio.pause();
                }
            });
        };
        
        document.addEventListener('visibilitychange', handleVisibilityChange);
        window.addEventListener('blur', handleBlur);
        
        return () => {
            document.removeEventListener('visibilitychange', handleVisibilityChange);
            window.removeEventListener('blur', handleBlur);
        };
    }, []);
    
    const [playbackRate, setPlaybackRate] = useState(1);
    const [showAlignmentGuides, setShowAlignmentGuides] = useState(true);
    const [backgroundColor, setBackgroundColor] = useState(defaultBackgroundColor || "black");
    const [trackHeight, setTrackHeight] = useState(TIMELINE_CONSTANTS.TRACK_HEIGHT);
    const [timelineItemHeight, setTimelineItemHeight] = useState(TIMELINE_CONSTANTS.TRACK_ITEM_HEIGHT);
    const { durationInFrames, durationInSeconds } = useCompositionDuration(overlays, fps);
    // State for extracted SRT text to auto-populate captions panel
    const [extractedSRTText, setExtractedSRTText] = useState(null);
    const extractedSRTTextQueueRef = useRef([]); // Queue to store multiple extracted texts
    
    // Set up global event listener for SRT text extraction (always active)
    useEffect(() => {
        const handleSRTTextExtracted = (event) => {
            if (event.detail && event.detail.text) {
                const { text, sceneIndex, srtUrl } = event.detail;
                
                // Store in queue for processing
                extractedSRTTextQueueRef.current.push({
                    text,
                    sceneIndex,
                    srtUrl,
                    timestamp: Date.now()
                });
                
                // Also set the latest one in state
                setExtractedSRTText({
                    text,
                    sceneIndex,
                    srtUrl,
                    timestamp: Date.now()
                });
            }
        };
        
        window.addEventListener('srtTextExtracted', handleSRTTextExtracted);
        
        return () => {
            window.removeEventListener('srtTextExtracted', handleSRTTextExtracted);
        };
    }, []);
    // Normalize aspect ratio: convert underscores to colons (e.g., "9_16" -> "9:16", "16_9" -> "16:9")
    const normalizeAspectRatio = useCallback((value) => {
        if (!value || typeof value !== 'string') return value;
        return value.replace(/_/g, ':').trim();
    }, []);
    
    // Normalize and ensure we have a valid value (don't default to undefined)
    const normalizedDefaultAspectRatio = defaultAspectRatio 
        ? normalizeAspectRatio(defaultAspectRatio) 
        : undefined;
    
    const { aspectRatio, setAspectRatio: setAspectRatioBase, playerDimensions, updatePlayerDimensions, getAspectRatioDimensions } = useAspectRatio(normalizedDefaultAspectRatio);
    // Track previous canvas dimensions for aspect ratio transformations
    const previousDimensionsRef = useRef(getAspectRatioDimensions());
    // Update aspect ratio when defaultAspectRatio changes AND project is loading
    // This ensures project aspect ratio is applied when it finishes loading
    const previousDefaultAspectRatioRef = useRef(normalizedDefaultAspectRatio);
    useEffect(() => {
        // Only update if we're loading a project and defaultAspectRatio actually changed
        if (isLoadingProject === false &&
            normalizedDefaultAspectRatio !== previousDefaultAspectRatioRef.current &&
            normalizedDefaultAspectRatio) {
            // Check if there's a projectId in URL (meaning we loaded a project)
            const hasProjectId = typeof window !== 'undefined' &&
                new URLSearchParams(window.location.search).has('projectId');
            if (hasProjectId) {
                // Use the base setter directly to avoid transformation (project overlays are already correct for this ratio)
                setAspectRatioBase(normalizedDefaultAspectRatio);
                // Update the previous dimensions ref to match the loaded aspect ratio
                previousDimensionsRef.current = getDimensionsForAspectRatio(normalizedDefaultAspectRatio);
            } else {
                // For VideosList (not project loading), also apply the aspect ratio
                setAspectRatioBase(normalizedDefaultAspectRatio);
                previousDimensionsRef.current = getDimensionsForAspectRatio(normalizedDefaultAspectRatio);
            }
        }
        previousDefaultAspectRatioRef.current = normalizedDefaultAspectRatio;
    }, [normalizedDefaultAspectRatio, defaultAspectRatio, isLoadingProject, setAspectRatioBase, aspectRatio, normalizeAspectRatio]);
    // Wrapped setAspectRatio that transforms overlays when aspect ratio changes
    const setAspectRatio = useCallback((newRatio) => {
        const oldDimensions = previousDimensionsRef.current;
        const newDimensions = getDimensionsForAspectRatio(newRatio);
        // Update the aspect ratio first
        setAspectRatioBase(newRatio);
        // Transform all overlays if dimensions changed
        if (shouldTransformOverlays(oldDimensions, newDimensions)) {
            const transformedOverlays = transformOverlaysForAspectRatio(overlays, oldDimensions, newDimensions);
            setOverlays(transformedOverlays);
        }
        // Update the previous dimensions ref
        previousDimensionsRef.current = newDimensions;
    }, [setAspectRatioBase, overlays, setOverlays]);
    // Get dynamic dimensions based on current aspect ratio
    const { width: dynamicWidth, height: dynamicHeight } = getAspectRatioDimensions();
    // Set up rendering functionality
    const { renderMedia: triggerRender, state: renderState } = useRendering(projectId, // Use projectId as composition ID
    {
        overlays,
        durationInFrames,
        fps,
        width: dynamicWidth,
        height: dynamicHeight,
        src: "", // Base video src if any
        // Note: selectedOverlayId and baseUrl are not part of CompositionProps
        // They are editor state, not render parameters
    });
    // State for general editor state - separate from render state to prevent unnecessary re-renders
    const [state, setState] = useState({
        overlays,
        selectedOverlayId,
        selectedOverlayIds,
        aspectRatio,
        playbackRate,
        durationInFrames,
        currentFrame,
        backgroundColor,
    });
    // Update state when dependencies change (excluding renderState to prevent unnecessary re-renders)
    useEffect(() => {
        setState({
            overlays,
            selectedOverlayId,
            selectedOverlayIds,
            aspectRatio,
            playbackRate,
            durationInFrames,
            currentFrame,
            backgroundColor,
        });
    }, [overlays, selectedOverlayId, selectedOverlayIds, aspectRatio, playbackRate, durationInFrames, currentFrame, backgroundColor]);
    // Call onOverlaysChange when overlays change
    useEffect(() => {
        if (onOverlaysChange) {
            onOverlaysChange(overlays);
        }
    }, [overlays, onOverlaysChange]);
    // Autosave functionality removed
    // Manual save function (if needed in future, implement without autosave)
    const saveProject = useCallback(async () => {
        if (onSaving)
            onSaving(true);
        try {
            // Manual save implementation can be added here if needed
            if (onSaved)
                onSaved(Date.now());
        }
        finally {
            if (onSaving)
                onSaving(false);
        }
    }, [onSaving, onSaved]);
    // Timeline click handler
    const handleTimelineClick = useCallback((e) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const timelineWidth = rect.width;
        const clickRatio = clickX / timelineWidth;
        const targetFrame = Math.round(clickRatio * durationInFrames);
        seekTo(targetFrame);
    }, [durationInFrames, seekTo]);
    // Delete overlays by row
    const deleteOverlaysByRow = useCallback((row) => {
        const overlaysToDelete = overlays.filter(overlay => overlay.row === row);
        overlaysToDelete.forEach(overlay => deleteOverlay(overlay.id));
    }, [overlays, deleteOverlay]);
    // Update overlay styles
    const updateOverlayStyles = useCallback((overlayId, styles) => {
        changeOverlay(overlayId, (overlay) => ({
            ...overlay,
            styles: {
                ...overlay.styles,
                ...styles,
            },
        }));
    }, [changeOverlay]);
    
    // Cleanup: Stop all audio on unmount
    useEffect(() => {
        return () => {
            const allAudioElements = document.querySelectorAll('audio');
            allAudioElements.forEach((audio) => {
                audio.pause();
                audio.currentTime = 0;
            });
            
            // Clear stored references
            if (window.__ALL_AUDIO_ELEMENTS) {
                window.__ALL_AUDIO_ELEMENTS.clear();
            }
            if (window.__SCENE_1_AUDIO_ELEMENTS) {
                window.__SCENE_1_AUDIO_ELEMENTS.clear();
            }
        };
    }, []);
    
    // Context value
    const contextValue = {
        // Overlay Management
        overlays,
        selectedOverlayId,
        setSelectedOverlayId,
        // Multi-select support
        selectedOverlayIds,
        setSelectedOverlayIds,
        changeOverlay,
        setOverlays,
        // Player State
        isPlaying,
        currentFrame,
        playerRef,
        playbackRate,
        setPlaybackRate,
        // Player Controls
        togglePlayPause,
        play,
        pause,
        seekTo,
        formatTime,
        handleTimelineClick,
        // Overlay Operations
        handleOverlayChange,
        addOverlay,
        deleteOverlay,
        duplicateOverlay,
        splitOverlay,
        // Video Dimensions and Aspect Ratio
        aspectRatio,
        setAspectRatio,
        playerDimensions,
        updatePlayerDimensions,
        getAspectRatioDimensions,
        // Video Properties
        durationInFrames,
        durationInSeconds,
        renderMedia: triggerRender, // Now connected to actual rendering
        state,
        renderState, // Provide render state separately
        // Timeline
        deleteOverlaysByRow,
        // Style management
        updateOverlayStyles,
        // Reset
        resetOverlays,
        // Autosave
        saveProject,
        // Render type (extracted from renderer)
        renderType,
        // FPS
        fps,
        // Configuration
        initialRows,
        maxRows,
        zoomConstraints,
        snappingConfig,
        disableMobileLayout,
        disableVideoKeyframes,
        enablePushOnDrag,
        videoWidth,
        videoHeight,
        // API Configuration - use conditional spreading for optional properties
        ...(baseUrl !== undefined && { baseUrl }),
        // Alignment Guides
        showAlignmentGuides,
        setShowAlignmentGuides,
        // Settings
        backgroundColor,
        setBackgroundColor,
        // Timeline Height Settings
        trackHeight,
        setTrackHeight,
        timelineItemHeight,
        setTimelineItemHeight,
        // SRT Text Extraction
        extractedSRTText,
        setExtractedSRTText,
        extractedSRTTextQueue: extractedSRTTextQueueRef.current,
        // Combined loading state: wait for both autosave check AND project loading
        isInitialLoadComplete: true, // Autosave removed, always true
    };
    return (_jsx(EditorContextProvider, { value: contextValue, children: children }));
};
