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
    // CRITICAL: Preload ALL audio files fully for smooth playback
    const startsAtFrameZero = (overlay.from || 0) === 0;
    useEffect(() => {
        let isMounted = true;
        const handle = delayRender("Loading audio");
        const audio = document.createElement("audio");
        audio.preload = "auto"; // CRITICAL: Preload entire audio file for ALL scenes
        audio.crossOrigin = "anonymous";
        audio.src = audioSrc;
        
        // Log audio loading start for all scenes
        console.log(`[SoundLayerContent] 🎵 PRELOADING AUDIO - Network request should appear:`, {
            overlayId: overlay.id,
            src: overlay.src,
            audioSrc: audioSrc,
            from: overlay.from,
            startsAtFrameZero: startsAtFrameZero,
            durationInFrames: overlay.durationInFrames
        });
        
        let metadataLoaded = false;
        let audioReady = false;
        
        const handleLoadedMetadata = () => {
            metadataLoaded = true;
            console.log(`[SoundLayerContent] Audio metadata loaded:`, audioSrc);
        };
        
        const handleCanPlayThrough = () => {
            audioReady = true;
            if (isMounted) {
                console.log(`[SoundLayerContent] ✅ Audio fully loaded and ready to play:`, audioSrc);
                setIsAudioReady(true);
                continueRender(handle);
            }
        };
        
        const handleLoadedData = () => {
            // Fallback: If canplaythrough doesn't fire, use loadeddata
            if (isMounted && !audioReady) {
                setTimeout(() => {
                    if (isMounted && !audioReady && metadataLoaded) {
                        audioReady = true;
                        console.log(`[SoundLayerContent] ✅ Audio loaded (fallback):`, audioSrc);
                        setIsAudioReady(true);
                        continueRender(handle);
                    }
                }, 300); // Wait a bit to ensure audio is really ready
            }
        };
        
        const handleError = (error) => {
            console.error(`[SoundLayerContent] Error loading audio ${overlay.src}:`, error);
            if (isMounted) {
                setIsAudioReady(true); // Continue even on error
                continueRender(handle);
            }
        };
        
        audio.addEventListener("loadedmetadata", handleLoadedMetadata);
        audio.addEventListener("canplaythrough", handleCanPlayThrough);
        audio.addEventListener("loadeddata", handleLoadedData);
        audio.addEventListener("error", handleError);
        
        // CRITICAL: Explicitly call load() to trigger network request
        // This should appear in the network tab for ALL audio files
        audio.load(); // Explicitly trigger load to ensure network request happens
        
        // Log that we're attempting to load the audio
        console.log(`[SoundLayerContent] Audio element load() called - network request should appear:`, {
            src: audioSrc,
            overlayId: overlay.id,
            startsAtFrameZero: startsAtFrameZero,
            preload: audio.preload
        });
        
        // Timeout fallback - 10 seconds for all audio files
        const timeout = setTimeout(() => {
            if (isMounted && !audioReady) {
                console.warn(`[SoundLayerContent] Audio loading timeout for ${overlay.src}, continuing anyway`, {
                    startsAtFrameZero,
                    metadataLoaded
                });
                setIsAudioReady(true);
                continueRender(handle);
            }
        }, 10000); // 10 seconds timeout for all audio files
        
        return () => {
            isMounted = false;
            audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
            audio.removeEventListener("canplaythrough", handleCanPlayThrough);
            audio.removeEventListener("loadeddata", handleLoadedData);
            audio.removeEventListener("error", handleError);
            clearTimeout(timeout);
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
    const trimBeforeSeconds = (overlay.startFromSound || 0) > 10 
        ? (overlay.startFromSound / fps)  // Likely in frames, convert to seconds
        : (overlay.startFromSound || 0);  // Already in seconds (0 means start from beginning)
    
    // Log audio playback info for first scene at frame 0 to verify it's starting
    if (startsAtFrameZero && frame <= 2) {
        console.log(`[SoundLayerContent] 🎵 First scene audio rendering at frame ${frame}:`, {
            overlayId: overlay.id,
            src: audioSrc,
            trimBeforeSeconds: trimBeforeSeconds,
            startFromSound: overlay.startFromSound,
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
    // trimBefore: offset into the audio file in seconds (0 = start from beginning)
    return (_jsx(Html5Audio, { 
        src: audioSrc, 
        trimBefore: trimBeforeSeconds, 
        volume: finalVolume
    }));
};
