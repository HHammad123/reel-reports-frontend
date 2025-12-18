import { jsx as _jsx } from "react/jsx-runtime";
import { useCurrentFrame, interpolate, Html5Audio, delayRender, continueRender } from "remotion";
import { useEffect, useState } from "react";
import { toAbsoluteUrl } from "../../general/url-helper";
import { useEditorContext } from "../../../contexts/editor-context";
/**
 * Hook to safely use editor context only when available
 */
const useSafeEditorContext = () => {
    try {
        return useEditorContext();
    }
    catch {
        return { baseUrl: undefined };
    }
};
export const SoundLayerContent = ({ overlay, baseUrl, }) => {
    var _a, _b, _c, _d, _e, _f;
    const { baseUrl: contextBaseUrl } = useSafeEditorContext();
    const frame = useCurrentFrame();
    const [isAudioReady, setIsAudioReady] = useState(false);
    // Use prop baseUrl first, then context baseUrl
    const resolvedBaseUrl = baseUrl || contextBaseUrl;
    // Safety check - don't render Audio if src is missing
    if (!overlay.src || overlay.src.trim() === '') {
        console.warn('SoundLayerContent: No src provided for sound overlay', overlay);
        return null;
    }
    // Determine the audio source URL
    let audioSrc = overlay.src;
    // If it's an API route, use toAbsoluteUrl to ensure proper domain
    if (overlay.src.startsWith("/api/")) {
        audioSrc = toAbsoluteUrl(overlay.src, resolvedBaseUrl);
    }
    // If it's a relative URL and baseUrl is provided, use baseUrl
    else if (overlay.src.startsWith("/") && resolvedBaseUrl) {
        audioSrc = `${resolvedBaseUrl}${overlay.src}`;
    }
    // Otherwise use the toAbsoluteUrl helper for relative URLs
    else if (overlay.src.startsWith("/")) {
        audioSrc = toAbsoluteUrl(overlay.src, resolvedBaseUrl);
    }
    // Preload audio before rendering to ensure smooth playback
    // CRITICAL: For Scene 1 audio (startsAtFrameZero), we MUST NOT block rendering
    // If we use delayRender, it blocks Html5Audio from rendering, which prevents audio from playing
    const startsAtFrameZero = (overlay.from || 0) === 0;
    
    useEffect(() => {
        let isMounted = true;
        let quickReadyTimer = null;
        
        // CRITICAL FIX: For Scene 1 audio (frame 0), don't block rendering with delayRender
        // Html5Audio needs to render immediately to start playing
        // Only use delayRender for non-Scene-1 audio as a performance optimization
        const handle = startsAtFrameZero ? null : delayRender("Loading audio");
        
        // CRITICAL: For Scene 1, AudioPreloader should have already started fetching
        // Mark audio as ready quickly to allow Html5Audio to render
        // The actual audio loading will continue in the background
        if (startsAtFrameZero) {
            // Set a very short timeout to mark as ready, allowing Html5Audio to render
            // AudioPreloader has already started fetching, so audio should be loading
            quickReadyTimer = setTimeout(() => {
                if (isMounted) {
                    setIsAudioReady(true);
                }
            }, 50); // Very short delay - AudioPreloader should have started by now
        }
        
        // CRITICAL: Check if audio element already exists to prevent duplicates
        // Html5Audio from Remotion will create its own audio element, so we should
        // only create a preload element if one doesn't already exist
        // However, we should still continue with the loading process to ensure proper initialization
        const existingAudio = document.querySelector(`audio[src="${audioSrc}"]`);
        if (existingAudio && existingAudio.readyState >= 2) {
            // Audio already exists and is ready, mark as ready but continue with setup
            if (isMounted) {
                setIsAudioReady(true);
                if (handle) {
                    continueRender(handle);
                }
            }
            // Don't return early - let the rest of the effect run to ensure proper setup
        }
        
        const audio = document.createElement("audio");
        audio.preload = "auto"; // CRITICAL: Preload entire audio file for ALL scenes
        audio.crossOrigin = "anonymous";
        audio.src = audioSrc;
        
        // Set buffering properties for better playback performance
        audio.setAttribute('preload', 'auto');
        
        // Log audio loading start for all scenes (reduced logging for performance)
        if (startsAtFrameZero || frame <= 5) {
            console.log(`[SoundLayerContent] 🎵 PRELOADING AUDIO:`, {
                overlayId: overlay.id,
                src: overlay.src?.substring(0, 60),
                from: overlay.from,
                startsAtFrameZero: startsAtFrameZero
            });
        }
        
        let metadataLoaded = false;
        let audioReady = false;
        
        const handleLoadedMetadata = () => {
            metadataLoaded = true;
            console.log(`[SoundLayerContent] Audio metadata loaded:`, audioSrc);
        };
        
        const handleCanPlayThrough = () => {
            audioReady = true;
            if (isMounted) {
                // Check buffering status for better playback
                if (audio.buffered.length > 0) {
                    const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
                    const bufferedPercent = (bufferedEnd / audio.duration) * 100;
                    // Only log if buffering is significant
                    if (bufferedPercent > 10 || startsAtFrameZero) {
                        console.log(`[SoundLayerContent] ✅ Audio ready (${bufferedPercent.toFixed(1)}% buffered):`, audioSrc.substring(0, 60));
                    }
                } else {
                    console.log(`[SoundLayerContent] ✅ Audio ready:`, audioSrc.substring(0, 60));
                }
                setIsAudioReady(true);
                // Only call continueRender if we used delayRender (non-Scene-1 audio)
                if (handle) {
                    continueRender(handle);
                }
            }
        };
        
        const handleLoadedData = () => {
            // Fallback: If canplaythrough doesn't fire, use loadeddata
            if (isMounted && !audioReady) {
                setTimeout(() => {
                    if (isMounted && !audioReady && metadataLoaded) {
                        audioReady = true;
                        // Reduced logging for performance
                        if (startsAtFrameZero) {
                            console.log(`[SoundLayerContent] ✅ Audio loaded (fallback):`, audioSrc.substring(0, 60));
                        }
                        setIsAudioReady(true);
                        // Only call continueRender if we used delayRender (non-Scene-1 audio)
                        if (handle) {
                            continueRender(handle);
                        }
                    }
                }, startsAtFrameZero ? 10 : 300); // Very short delay (10ms) for Scene 1 to mark ready quickly
            }
        };
        
        // Track buffering progress for better playback
        const handleProgress = () => {
            if (audio.buffered.length > 0 && isMounted && !audioReady) {
                const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
                const bufferedPercent = (bufferedEnd / audio.duration) * 100;
                // Mark as ready if we have at least 20% buffered (for non-Scene-1) or 5% for Scene 1
                if (bufferedPercent > (startsAtFrameZero ? 5 : 20)) {
                    if (!audioReady) {
                        audioReady = true;
                        setIsAudioReady(true);
                        if (handle) {
                            continueRender(handle);
                        }
                    }
                }
            }
        };
        
        const handleError = (error) => {
            console.error(`[SoundLayerContent] Error loading audio ${overlay.src}:`, error);
            if (isMounted) {
                setIsAudioReady(true); // Continue even on error
                // Only call continueRender if we used delayRender (non-Scene-1 audio)
                if (handle) {
                    continueRender(handle);
                }
            }
        };
        
        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("canplaythrough", handleCanPlayThrough);
        audio.addEventListener("loadeddata", handleLoadedData);
        audio.addEventListener("progress", handleProgress); // Track buffering progress
        audio.addEventListener("error", handleError);
        
        // CRITICAL: Explicitly call load() to trigger network request
        // This should appear in the network tab for ALL audio files
        audio.load(); // Explicitly trigger load to ensure network request happens
        
        // Log that we're attempting to load the audio
        console.log(`[SoundLayerContent] Audio element load() called - network request should appear:`, {
            src: audioSrc,
            overlayId: overlay.id,
            startsAtFrameZero: startsAtFrameZero,
            preload: audio.preload,
            blockingRender: !!handle
        });
        
        // Timeout fallback - much shorter for Scene 1 to avoid blocking
        const timeout = setTimeout(() => {
            if (isMounted && !audioReady) {
                console.warn(`[SoundLayerContent] Audio loading timeout for ${overlay.src}, continuing anyway`, {
                    startsAtFrameZero,
                    metadataLoaded,
                    blockingRender: !!handle
                });
                setIsAudioReady(true);
                // Only call continueRender if we used delayRender (non-Scene-1 audio)
                if (handle) {
                    continueRender(handle);
                }
            }
        }, startsAtFrameZero ? 100 : 10000); // 100ms for Scene 1 (very aggressive to mark ready quickly), 10 seconds for others
        
        return () => {
            isMounted = false;
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("canplaythrough", handleCanPlayThrough);
            audio.removeEventListener("loadeddata", handleLoadedData);
            audio.removeEventListener("progress", handleProgress);
            audio.removeEventListener("error", handleError);
            clearTimeout(timeout);
            if (quickReadyTimer) {
                clearTimeout(quickReadyTimer);
            }
        };
    }, [audioSrc, overlay.src, overlay.from, startsAtFrameZero, overlay.id, overlay.durationInFrames]); // Added startsAtFrameZero and overlay properties for better tracking
    // Calculate volume with fade in/out
    const baseVolume = (_b = (_a = overlay.styles) === null || _a === void 0 ? void 0 : _a.volume) !== null && _b !== void 0 ? _b : 1;
    const fadeIn = Math.max(0, (_d = (_c = overlay.styles) === null || _c === void 0 ? void 0 : _c.fadeIn) !== null && _d !== void 0 ? _d : 0); // Ensure non-negative
    const fadeOut = Math.max(0, (_f = (_e = overlay.styles) === null || _e === void 0 ? void 0 : _e.fadeOut) !== null && _f !== void 0 ? _f : 0); // Ensure non-negative
    // Calculate fade multiplier based on current frame
    // Assuming 30fps for fade calculation
    const fps = 30;
    const fadeInFrames = fadeIn * fps;
    const fadeOutFrames = fadeOut * fps;
    const totalFrames = overlay.durationInFrames || 0;
    let fadeMultiplier = 1;
    // Apply fade in
    if (fadeIn > 0 && frame < fadeInFrames) {
        const fadeInMultiplier = interpolate(frame, [0, fadeInFrames], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        fadeMultiplier *= fadeInMultiplier;
    }
    // Apply fade out
    if (fadeOut > 0 && frame > totalFrames - fadeOutFrames) {
        const fadeOutMultiplier = interpolate(frame, [totalFrames - fadeOutFrames, totalFrames], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
        fadeMultiplier *= fadeOutMultiplier;
    }
    const finalVolume = baseVolume * fadeMultiplier;
    
    // CRITICAL: Html5Audio's trimBefore expects seconds
    // startFromSound is typically 0 (start from beginning of audio file)
    // Convert frames to seconds if startFromSound appears to be in frames (value > 10)
    const startFromSoundValue = overlay.startFromSound || 0;
    const trimBeforeSeconds = startFromSoundValue > 10 
        ? (startFromSoundValue / fps)  // Likely in frames, convert to seconds
        : startFromSoundValue;  // Already in seconds (0 means start from beginning)
    
    // CRITICAL: Ensure trimBeforeSeconds is 0 for audio to start from beginning
    // If it's somehow not 0, log a warning
    if (trimBeforeSeconds !== 0 && startsAtFrameZero) {
        console.warn(`[SoundLayerContent] ⚠️ WARNING: First scene audio trimBeforeSeconds is ${trimBeforeSeconds}, not 0!`, {
            overlayId: overlay.id,
            startFromSound: startFromSoundValue,
            trimBeforeSeconds: trimBeforeSeconds
        });
    }
    
    // Log audio playback info for first scene at frame 0 to verify it's starting from beginning
    if (startsAtFrameZero && frame <= 2) {
        console.log(`[SoundLayerContent] 🎵 First scene audio rendering at frame ${frame} (should start from beginning):`, {
            overlayId: overlay.id,
            src: audioSrc,
            trimBeforeSeconds: trimBeforeSeconds,
            startFromSound: startFromSoundValue,
            startsFromBeginning: trimBeforeSeconds === 0,
            volume: finalVolume,
            from: overlay.from,
            currentFrame: frame,
            durationInFrames: overlay.durationInFrames,
            isAudioReady: isAudioReady
        });
    }
    
    // CRITICAL: Return Html5Audio component
    // Sequence wrapper (in layer.js) ensures this only renders when frame >= overlay.from
    // For first scene (overlay.from === 0), this renders immediately at frame 0
    // Html5Audio automatically syncs playback with Remotion's frame timeline
    // trimBefore: offset into the audio file in seconds (0 = start from beginning of audio file)
    // CRITICAL: For Scene 1 audio (startsAtFrameZero), ensure trimBefore is 0 and audio starts at frame 0
    // Force trimBefore to 0 for Scene 1 audio to ensure it plays from the beginning
    const finalTrimBefore = startsAtFrameZero ? 0 : trimBeforeSeconds;
    
    // CRITICAL FIX: Always render Html5Audio - Remotion handles loading internally
    // The preloading we do is just for optimization, but Html5Audio will handle its own loading
    // For Scene 1, we still want to render immediately so Remotion can start loading
    // The isAudioReady check was preventing Html5Audio from ever rendering, which blocked loading
    
    // Render Html5Audio - Remotion will handle loading and playback sync
    // The AudioPreloader helps with initial buffering, but Html5Audio needs to render to load
    return (_jsx(Html5Audio, { 
        src: audioSrc, 
        trimBefore: finalTrimBefore,  // Force 0 for Scene 1 audio to start from beginning
        volume: finalVolume
    }));
};
