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
// Autosave removed - IndexedDB import removed
export const EditorProvider = ({ children, projectId, defaultOverlays = [], defaultAspectRatio, defaultBackgroundColor, autoSaveInterval = 10000, fps = 30, onSaving, onSaved, onOverlaysChange, onSelectedOverlayChange,
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

    // CRITICAL: Reset ALL audio when timeline returns to frame 0 to prevent echo
    useEffect(() => {
        if (currentFrame === 0 && isPlaying) {
            // Find ALL audio elements and reset them to prevent echo on replay
            const allAudioElements = document.querySelectorAll('audio');

            allAudioElements.forEach((audio) => {
                // Pause all audio first
                if (!audio.paused) {
                    audio.pause();
                }
                // Reset to beginning to prevent echo
                audio.currentTime = 0;
                // Clear any pending play promises
                audioPlayPromisesRef.current.clear();
            });
        }
    }, [currentFrame, isPlaying]);

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

                        // CRITICAL: Invalidate audio cache when new audio elements are added
                        // This ensures the main loop discovers new elements (like Remotion's) immediately
                        if (audioElementsCacheRef.current) {
                            audioElementsCacheRef.current.clear();
                        }
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

    // CRITICAL: Optimized audio sync - let Remotion handle most sync, only intervene when needed
    const audioElementsCacheRef = useRef(new Map()); // Cache audio elements by src
    const lastSyncFrameRef = useRef(-1);
    const syncThrottleRef = useRef(null);
    const lastOverlayHashRef = useRef('');
    const audioPlayPromisesRef = useRef(new Map()); // Track pending play promises to prevent race conditions

    useEffect(() => {
        // OPTIMIZED: Reduce duplicate cleanup frequency - only check every 10 frames (~333ms at 30fps)
        // This significantly reduces DOM queries and improves performance
        const duplicateCheckFrameSkip = 10;
        const shouldCheckDuplicates = currentFrame === 0 ||
            (lastSyncFrameRef.current === -1 || currentFrame - lastSyncFrameRef.current >= duplicateCheckFrameSkip);

        if (shouldCheckDuplicates && (isPlaying || currentFrame === 0)) {
            const allAudioElements = Array.from(document.querySelectorAll('audio'));
            const audioBySource = new Map();

            allAudioElements.forEach(audio => {
                const src = audio.src;
                if (src) { // Only process audio elements with a src
                    if (!audioBySource.has(src)) {
                        audioBySource.set(src, []);
                    }
                    audioBySource.get(src).push(audio);
                }
            });

            // For each unique audio source, keep only ONE playing element (prioritize Scene 1 preloaded)
            audioBySource.forEach((elements, src) => {
                if (elements.length > 1) {
                    // Find Scene 1 preloaded element if it exists
                    const scene1Element = elements.find(el => el.hasAttribute('data-scene-1-audio'));
                    const keepElement = scene1Element || elements[0];

                    // Pause all others immediately
                    elements.forEach(el => {
                        if (el !== keepElement && !el.paused) {
                            el.pause();
                            el.currentTime = 0;
                        }
                    });
                }
            });
        }

        // CRITICAL: Remotion's Html5Audio handles sync automatically, so we should minimize manual intervention
        // Only sync when there's a significant drift or when starting/stopping

        // OPTIMIZED: Reduce sync frequency from every 3 frames to every 6 frames (~200ms at 30fps)
        // This reduces CPU usage by 50% while maintaining smooth playback
        // Remotion's Html5Audio handles most sync, we only need to intervene occasionally
        const frameSkip = 6; // Sync every 6 frames (reduced from 3) for better performance
        if (lastSyncFrameRef.current !== -1 && currentFrame - lastSyncFrameRef.current < frameSkip && isPlaying) {
            return; // Skip this sync cycle
        }
        lastSyncFrameRef.current = currentFrame;

        // Clear any pending throttle
        if (syncThrottleRef.current) {
            cancelAnimationFrame(syncThrottleRef.current);
        }

        // Use requestAnimationFrame to batch DOM queries
        syncThrottleRef.current = requestAnimationFrame(() => {
            // Find all audio overlays (not just Scene 1)
            const audioOverlays = overlays.filter(o => {
                const overlayType = String(o?.type || '').toLowerCase();
                return overlayType === 'sound' || o.type === 'sound';
            });

            if (audioOverlays.length === 0) {
                return;
            }

            // CRITICAL FIX: Only invalidate cache when overlays change, not every second
            // This prevents lag spikes after 1 second
            const currentOverlayHash = JSON.stringify(audioOverlays.map(o => ({ id: o.id, src: o.src })));
            if (currentOverlayHash !== lastOverlayHashRef.current) {
                audioElementsCacheRef.current.clear();
                lastOverlayHashRef.current = currentOverlayHash;
            }

            // Process all audio overlays
            audioOverlays.forEach((overlay) => {
                const audioStartFrame = overlay.from || 0;
                const audioEndFrame = audioStartFrame + (overlay.durationInFrames || 0);
                const isWithinAudioRange = currentFrame >= audioStartFrame && currentFrame < audioEndFrame;

                // Use cached audio elements or query DOM (cache persists longer now)
                let audioElements = audioElementsCacheRef.current.get(overlay.src);
                if (!audioElements || audioElements.length === 0 || audioElements.some(el => !el.parentNode)) {
                    // Re-query if cache is empty or elements were removed from DOM
                    audioElements = Array.from(document.querySelectorAll(`audio[src="${overlay.src}"]`));
                    if (audioElements.length > 0) {
                        audioElementsCacheRef.current.set(overlay.src, audioElements);
                    } else {
                        return; // No audio elements found, skip
                    }
                }

                // CRITICAL: Prioritize Scene 1 preloaded audio element to prevent echo
                // For Scene 1 audio (from === 0), ALWAYS use the preloaded element marked with data-scene-1-audio
                // For other audio, use the first element found
                let audio;
                const isScene1Audio = audioStartFrame === 0;

                if (isScene1Audio) {
                    // CRITICAL: For Scene 1 audio, find the preloaded element with data-scene-1-audio attribute
                    audio = audioElements.find(el => el.hasAttribute('data-scene-1-audio'));

                    // CRITICAL: If not found in cache, force a re-query from DOM to check if AudioPreloader just added it
                    // This prevents race conditions on initial load where cache might be stale
                    if (!audio) {
                        const freshElements = Array.from(document.querySelectorAll(`audio[src="${overlay.src}"]`));
                        audio = freshElements.find(el => el.hasAttribute('data-scene-1-audio'));

                        if (audio) {
                            // Found it! Update cache with fresh elements to include the persistent one
                            audioElements = freshElements;
                            audioElementsCacheRef.current.set(overlay.src, freshElements);
                        } else {
                            // Still not found, fall back to first element
                            audio = audioElements[0];
                        }
                    }

                    // CRITICAL: Pause and reset ALL other audio elements with same src (especially Remotion-created ones)
                    audioElements.forEach((otherAudio) => {
                        if (otherAudio !== audio) {
                            if (!otherAudio.paused) {
                                otherAudio.pause();
                                otherAudio.currentTime = 0;
                            }
                        }
                    });
                } else {
                    // For non-Scene-1 audio, use the first element
                    audio = audioElements[0];

                    // Pause other duplicates
                    audioElements.slice(1).forEach((otherAudio) => {
                        if (!otherAudio.paused) {
                            otherAudio.pause();
                            otherAudio.currentTime = 0;
                        }
                    });
                }

                if (!audio) {
                    return; // No audio element found
                }

                // CRITICAL: If timeline is paused, ALWAYS pause audio (no exceptions)
                if (!isPlaying) {
                    if (!audio.paused) {
                        // CRITICAL: Cancel any pending play promises before pausing
                        const audioKey = `${overlay.src}-${audio.src}`;
                        const pendingPromise = audioPlayPromisesRef.current.get(audioKey);
                        if (pendingPromise) {
                            // Pause will automatically reject the play promise (AbortError)
                            // Remove from tracking to prevent error logs
                            audioPlayPromisesRef.current.delete(audioKey);
                        }
                        audio.pause();
                    }
                    return; // Don't do anything else if paused
                }

                // Only proceed if timeline is playing
                if (isPlaying && isWithinAudioRange) {
                    // Timeline is playing and we're within this audio's time range
                    if (audio.paused && audio.readyState >= 2) {
                        // CRITICAL: Cancel any pending play promise to prevent race conditions
                        const audioKey = `${overlay.src}-${audio.src}`;
                        const pendingPromise = audioPlayPromisesRef.current.get(audioKey);
                        if (pendingPromise) {
                            // Don't cancel the promise, just track it
                            audioPlayPromisesRef.current.delete(audioKey);
                        }

                        audio.volume = overlay.styles?.volume || 1;
                        audio.muted = false;

                        // Calculate the correct currentTime based on frame position
                        const framesIntoAudio = currentFrame - audioStartFrame;
                        const secondsIntoAudio = framesIntoAudio / fps;
                        const targetTime = Math.max(0, secondsIntoAudio);

                        // Set currentTime when starting playback
                        audio.currentTime = targetTime;

                        // CRITICAL: Handle play() promise properly to avoid AbortError
                        const playPromise = audio.play();
                        if (playPromise !== undefined) {
                            audioPlayPromisesRef.current.set(audioKey, playPromise);
                            playPromise
                                .then(() => {
                                    // Play succeeded, remove from tracking
                                    audioPlayPromisesRef.current.delete(audioKey);
                                })
                                .catch((error) => {
                                    // Remove from tracking on error
                                    audioPlayPromisesRef.current.delete(audioKey);

                                    // AbortError is expected when pause() interrupts play()
                                    // Don't log it as an error, it's normal behavior
                                    if (error.name !== 'AbortError' && error.name !== 'NotAllowedError') {
                                        // Only log unexpected errors in development
                                        if (process.env.NODE_ENV === 'development') {
                                            console.error('[EditorProvider] Failed to play audio:', error);
                                        }
                                    }
                                });
                        }
                    } else if (!audio.paused) {
                        // Audio is already playing - let Remotion's Html5Audio handle sync automatically
                        // Only check volume/mute state, don't manually sync currentTime
                        // This prevents interference with Remotion's built-in sync mechanism and prevents glitches

                        // Ensure volume and mute are correct
                        const targetVolume = overlay.styles?.volume || 1;
                        if (Math.abs(audio.volume - targetVolume) > 0.01) {
                            audio.volume = targetVolume;
                        }
                        if (audio.muted) {
                            audio.muted = false;
                        }

                        // CRITICAL: Do NOT manually sync currentTime when audio is already playing
                        // Remotion's Html5Audio handles sync automatically, and manual sync causes glitches
                        // Only allow Remotion to manage playback timing
                    }
                } else if (isPlaying && !isWithinAudioRange) {
                    // Audio is outside its range, pause it
                    if (!audio.paused) {
                        // CRITICAL: Cancel any pending play promises before pausing
                        const audioKey = `${overlay.src}-${audio.src}`;
                        const pendingPromise = audioPlayPromisesRef.current.get(audioKey);
                        if (pendingPromise) {
                            audioPlayPromisesRef.current.delete(audioKey);
                        }
                        audio.pause();
                    }
                }
            });
        });

        return () => {
            if (syncThrottleRef.current) {
                cancelAnimationFrame(syncThrottleRef.current);
            }
        };
    }, [isPlaying, currentFrame, overlays, fps]);

    // CRITICAL: Pause ALL audio elements when timeline is paused - IMMEDIATE and AGGRESSIVE
    useEffect(() => {
        if (!isPlaying) {
            // IMMEDIATE: Pause all audio synchronously first
            const pauseAllAudioImmediate = () => {
                const allAudioElements = document.querySelectorAll('audio');

                allAudioElements.forEach((audio, index) => {
                    if (!audio.paused) {
                        // CRITICAL: Clear any pending play promises before pausing
                        // Find the audio key by checking all tracked promises
                        audioPlayPromisesRef.current.forEach((promise, key) => {
                            if (key.includes(audio.src)) {
                                audioPlayPromisesRef.current.delete(key);
                            }
                        });
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
            // Use requestAnimationFrame for better performance instead of setTimeout
            const playCheckFrame = requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    const audioOverlays = overlays.filter(o => {
                        const overlayType = String(o?.type || '').toLowerCase();
                        return overlayType === 'sound' || o.type === 'sound';
                    });

                    audioOverlays.forEach((overlay) => {
                        const audioStartFrame = overlay.from || 0;
                        const audioEndFrame = audioStartFrame + (overlay.durationInFrames || 0);
                        const isWithinAudioRange = currentFrame >= audioStartFrame && currentFrame < audioEndFrame;

                        if (isWithinAudioRange) {
                            // Use cached audio elements if available
                            let audioElements = audioElementsCacheRef.current.get(overlay.src);
                            if (!audioElements || audioElements.length === 0) {
                                audioElements = Array.from(document.querySelectorAll(`audio[src="${overlay.src}"]`));
                                if (audioElements.length > 0) {
                                    audioElementsCacheRef.current.set(overlay.src, audioElements);
                                }
                            }

                            // CRITICAL: Prioritize Scene 1 preloaded audio element to prevent echo
                            // For Scene 1 audio (from === 0), ALWAYS use the preloaded element marked with data-scene-1-audio
                            // For other audio, use the first element found
                            let audio;
                            const isScene1Audio = audioStartFrame === 0;

                            if (isScene1Audio) {
                                // CRITICAL: For Scene 1 audio, find the preloaded element with data-scene-1-audio attribute
                                audio = audioElements.find(el => el.hasAttribute('data-scene-1-audio'));

                                // CRITICAL: If not found in cache, force a re-query from DOM to check if AudioPreloader just added it
                                // This prevents race conditions on initial load where cache might be stale
                                if (!audio) {
                                    const freshElements = Array.from(document.querySelectorAll(`audio[src="${overlay.src}"]`));
                                    audio = freshElements.find(el => el.hasAttribute('data-scene-1-audio'));

                                    if (audio) {
                                        // Found it! Update cache with fresh elements to include the persistent one
                                        audioElements = freshElements;
                                        audioElementsCacheRef.current.set(overlay.src, freshElements);
                                    } else {
                                        // Still not found, fall back to first element
                                        audio = audioElements[0];
                                    }
                                }

                                // CRITICAL: Pause and reset ALL other audio elements with same src (especially Remotion-created ones)
                                audioElements.forEach((otherAudio) => {
                                    if (otherAudio !== audio) {
                                        if (!otherAudio.paused) {
                                            otherAudio.pause();
                                            otherAudio.currentTime = 0;
                                        }
                                    }
                                });
                            } else {
                                // For non-Scene-1 audio, use the first element
                                audio = audioElements[0];

                                // Pause other duplicates
                                audioElements.slice(1).forEach((otherAudio) => {
                                    if (!otherAudio.paused) {
                                        otherAudio.pause();
                                        otherAudio.currentTime = 0;
                                    }
                                });
                            }

                            if (!audio) {
                                return; // No audio element found
                            }

                            if (audio.paused && audio.readyState >= 2) {
                                // CRITICAL: Cancel any pending play promise to prevent race conditions
                                const audioKey = `${overlay.src}-${audio.src}`;
                                const pendingPromise = audioPlayPromisesRef.current.get(audioKey);
                                if (pendingPromise) {
                                    audioPlayPromisesRef.current.delete(audioKey);
                                }

                                audio.volume = overlay.styles?.volume || 1;
                                audio.muted = false;

                                const framesIntoAudio = currentFrame - audioStartFrame;
                                const secondsIntoAudio = framesIntoAudio / fps;
                                const targetTime = Math.max(0, secondsIntoAudio);

                                // Only set if significantly different
                                if (Math.abs(audio.currentTime - targetTime) > 0.05) {
                                    audio.currentTime = targetTime;
                                }

                                // CRITICAL: Handle play() promise properly to avoid AbortError
                                const playPromise = audio.play();
                                if (playPromise !== undefined) {
                                    audioPlayPromisesRef.current.set(audioKey, playPromise);
                                    playPromise
                                        .then(() => {
                                            // Play succeeded, remove from tracking
                                            audioPlayPromisesRef.current.delete(audioKey);
                                        })
                                        .catch((error) => {
                                            // Remove from tracking on error
                                            audioPlayPromisesRef.current.delete(audioKey);

                                            // AbortError is expected when pause() interrupts play()
                                            // Don't log it as an error, it's normal behavior
                                            if (error.name === 'AbortError' || error.name === 'NotAllowedError') {
                                                // These are expected - audio was paused or autoplay blocked
                                                // Silently ignore
                                            } else {
                                                if (process.env.NODE_ENV === 'development') {
                                                    console.error('[EditorProvider] ❌ Failed to resume audio:', error);
                                                }
                                            }
                                        });
                                }
                            }
                        }
                    });
                });
            });

            return () => {
                cancelAnimationFrame(playCheckFrame);
            };
        }
    }, [isPlaying, currentFrame, overlays, fps]);

    // Pause all audio when window loses focus
    useEffect(() => {
        const handleVisibilityChange = () => {
            if (document.hidden) {
                const allAudioElements = document.querySelectorAll('audio');
                allAudioElements.forEach((audio) => {
                    if (!audio.paused) {
                        // CRITICAL: Clear any pending play promises before pausing
                        audioPlayPromisesRef.current.forEach((promise, key) => {
                            if (key.includes(audio.src)) {
                                audioPlayPromisesRef.current.delete(key);
                            }
                        });
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
                    // CRITICAL: Clear any pending play promises before pausing
                    audioPlayPromisesRef.current.forEach((promise, key) => {
                        if (key.includes(audio.src)) {
                            audioPlayPromisesRef.current.delete(key);
                        }
                    });
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

    // Call onSelectedOverlayChange when selectedOverlayId changes
    useEffect(() => {
        if (onSelectedOverlayChange) {
            onSelectedOverlayChange(selectedOverlayId);
        }
    }, [selectedOverlayId, onSelectedOverlayChange]);
    // Manual save function - saves current project state
    const saveProject = useCallback(async (projectData) => {
        if (onSaving)
            onSaving(true);
        try {
            // Prepare project data with current state
            const dataToSave = projectData || {
                overlays: overlays || [],
                projectId: projectId || 'default-project',
                aspectRatio: aspectRatio || defaultAspectRatio,
                backgroundColor: backgroundColor || defaultBackgroundColor,
                fps: fps || 30,
                timestamp: new Date().toISOString(),
            };

            // Save to localStorage as primary storage
            if (typeof window !== 'undefined') {
                const storageKey = `video-editor-project-${dataToSave.projectId}`;
                localStorage.setItem(storageKey, JSON.stringify(dataToSave));
                console.log('[EditorProvider] Project saved to localStorage:', storageKey);
            }

            // Call onSaved callback if provided
            if (onSaved)
                onSaved(Date.now());

            return dataToSave;
        }
        catch (error) {
            console.error('[EditorProvider] Error saving project:', error);
            throw error;
        }
        finally {
            if (onSaving)
                onSaving(false);
        }
    }, [onSaving, onSaved, overlays, projectId, aspectRatio, defaultAspectRatio, backgroundColor, defaultBackgroundColor, fps]);

    // Autosave functionality removed

    // Load saved project on mount (only once when projectId is available and not loading)
    const hasLoadedSavedProjectRef = useRef(false);
    useEffect(() => {
        if (!projectId || isLoadingProject || hasLoadedSavedProjectRef.current) return;

        const storageKey = `video-editor-project-${projectId}`;
        try {
            const savedData = localStorage.getItem(storageKey);
            if (savedData) {
                const parsedData = JSON.parse(savedData);
                if (parsedData.overlays && Array.isArray(parsedData.overlays) && parsedData.overlays.length > 0) {
                    // Only load if we don't have overlays yet (initial load)
                    if (overlays.length === 0 && defaultOverlays.length === 0) {
                        console.log('[EditorProvider] Loading saved project from localStorage:', storageKey);
                        setOverlays(parsedData.overlays);
                        if (parsedData.aspectRatio) {
                            setAspectRatio(parsedData.aspectRatio);
                        }
                        if (parsedData.backgroundColor) {
                            setBackgroundColor(parsedData.backgroundColor);
                        }
                        hasLoadedSavedProjectRef.current = true;
                    }
                }
            }
        } catch (error) {
            console.error('[EditorProvider] Error loading saved project:', error);
        }
    }, [projectId, isLoadingProject, overlays.length, defaultOverlays.length, setOverlays, setAspectRatio, setBackgroundColor]);

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
        // Project ID
        projectId,
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