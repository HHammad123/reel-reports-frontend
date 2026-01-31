import { jsx as _jsx } from "react/jsx-runtime";
import { useCurrentFrame, interpolate, Html5Audio, useVideoConfig } from "remotion";
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
    const { fps } = useVideoConfig(); // CRITICAL: Must be called before any early returns
    // Use prop baseUrl first, then context baseUrl
    const resolvedBaseUrl = baseUrl || contextBaseUrl;
    // Safety check - don't render Audio if src is missing
    if (!overlay.src || overlay.src.trim() === '') {
        if (process.env.NODE_ENV === 'development') {
        console.warn('SoundLayerContent: No src provided for sound overlay', overlay);
        }
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
    // Calculate volume with fade in/out
    const baseVolume = (_b = (_a = overlay.styles) === null || _a === void 0 ? void 0 : _a.volume) !== null && _b !== void 0 ? _b : 1;
    const fadeIn = Math.max(0, (_d = (_c = overlay.styles) === null || _c === void 0 ? void 0 : _c.fadeIn) !== null && _d !== void 0 ? _d : 0); // Ensure non-negative
    const fadeOut = Math.max(0, (_f = (_e = overlay.styles) === null || _e === void 0 ? void 0 : _e.fadeOut) !== null && _f !== void 0 ? _f : 0); // Ensure non-negative
    // Calculate fade multiplier based on current frame
    // Use actual fps from Remotion config for accurate timing (already retrieved at top of component)
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

    // CRITICAL: Check if this is Scene 1 audio (starts at frame 0)
    const startsAtFrameZero = (overlay.from || 0) === 0;

    // CRITICAL: Html5Audio's trimBefore expects seconds
    // startFromSound is typically 0 (start from beginning of audio file)
    // Convert frames to seconds if startFromSound appears to be in frames (value > 10)
    const startFromSoundValue = overlay.startFromSound || 0;
    const trimBeforeSeconds = startFromSoundValue > 10 
        ? (startFromSoundValue / fps)  // Likely in frames, convert to seconds
        : startFromSoundValue;  // Already in seconds (0 means start from beginning)
        
    // CRITICAL: For Scene 1 audio (startsAtFrameZero), ensure trimBefore is 0 and audio starts at frame 0
    const finalTrimBefore = startsAtFrameZero ? 0 : trimBeforeSeconds;
    
    // CRITICAL FIX: Mute Remotion's audio element for Scene 1 to prevent echo
    // EditorProvider handles playing the preloaded audio element for Scene 1
    // We keep Html5Audio rendering so Remotion tracks time, but we silence it
    return (_jsx(Html5Audio, { 
        src: audioSrc, 
        trimBefore: finalTrimBefore, 
        volume: startsAtFrameZero ? 0 : finalVolume, // Mute if Scene 1
        muted: startsAtFrameZero // Explicitly mute
    }));
};
