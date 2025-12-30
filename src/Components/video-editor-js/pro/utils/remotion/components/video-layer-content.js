import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCurrentFrame, delayRender, continueRender, Html5Video } from "remotion";
import { animationTemplates, getAnimationKey } from "../../../adaptors/default-animation-adaptors";
import { toAbsoluteUrl } from "../../general/url-helper";
import { useEffect, useRef, useCallback } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { FPS } from "../../../../constants";
import { calculateObjectFitDimensions } from "../helpers/object-fit-calculator";
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
/**
 * VideoLayerContent component renders a video layer with animations and styling
 *
 * This component handles:
 * - Video playback using Remotion's OffthreadVideo
 * - Enter/exit animations based on the current frame
 * - Styling including transform, opacity, border radius, etc.
 * - Video timing and volume controls
 * - Optional greenscreen removal using canvas processing
 *
 * @param props.overlay - Configuration object for the video overlay including:
 *   - src: Video source URL
 *   - videoStartTime: Start time offset for the video
 *   - durationInFrames: Total duration of the overlay
 *   - styles: Object containing visual styling properties and animations
 *   - greenscreen: Optional greenscreen removal configuration
 */
export const VideoLayerContent = ({ overlay, baseUrl, }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    const frame = useCurrentFrame();
    const { baseUrl: contextBaseUrl } = useSafeEditorContext();
    const canvasRef = useRef(null);
    const lastProcessedFrameRef = useRef(null);
    const frameSkipRef = useRef(0);
    const videoErrorRef = useRef(false);
    
    // Use prop baseUrl first, then context baseUrl
    const resolvedBaseUrl = baseUrl || contextBaseUrl;
    // Determine the video source URL first
    let videoSrc = overlay.src;
    // If it's an API route, use toAbsoluteUrl to ensure proper domain
    if (overlay.src && overlay.src.startsWith("/api/")) {
        videoSrc = toAbsoluteUrl(overlay.src, resolvedBaseUrl);
    }
    // If it's a relative URL and baseUrl is provided, use baseUrl
    else if (overlay.src && overlay.src.startsWith("/") && resolvedBaseUrl) {
        videoSrc = `${resolvedBaseUrl}${overlay.src}`;
    }
    // Otherwise use the toAbsoluteUrl helper for relative URLs
    else if (overlay.src && overlay.src.startsWith("/")) {
        videoSrc = toAbsoluteUrl(overlay.src, resolvedBaseUrl);
    }
    
    // Handle video playback errors
    const handleVideoError = useCallback((error) => {
        if (videoErrorRef.current) return; // Only log once
        videoErrorRef.current = true;
        
        console.error('❌ [VideoLayerContent] Video playback error:', {
            overlayId: overlay.id,
            overlayType: overlay.type,
            videoSrc: videoSrc?.substring(0, 100) + '...',
            error: error,
            errorCode: error?.code,
            errorMessage: error?.message,
            possibleCauses: [
                'CORS configuration issue',
                'Invalid MIME type (should be video/mp4)',
                'Video format not supported',
                'Video file does not exist or is corrupted',
                'Network connectivity issue'
            ]
        });
        
        // Log specific error codes
        if (error?.code) {
            const errorCodes = {
                1: 'MEDIA_ERR_ABORTED - Video loading aborted',
                2: 'MEDIA_ERR_NETWORK - Network error while loading video',
                3: 'MEDIA_ERR_DECODE - Video decoding error',
                4: 'MEDIA_ERR_SRC_NOT_SUPPORTED - Video format not supported or source invalid'
            };
            console.error(`Error Code ${error.code}: ${errorCodes[error.code] || 'Unknown error'}`);
        }
    }, [overlay.id, overlay.type, videoSrc]);
    
    // Process video frame with greenscreen/chart background removal - OPTIMIZED: Skip frames to reduce lag
    const processVideoFrame = useCallback((videoFrame) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
        // Check if chroma key is needed (greenscreen or chart background removal)
        const needsChromaKey = 
            ((_a = overlay.greenscreen) === null || _a === void 0 ? void 0 : _a.enabled) || 
            overlay.needsChromaKey === true || 
            overlay.removeBackground === true ||
            overlay.has_background === false;
        
        if (!canvasRef.current || !needsChromaKey) {
            return;
        }
        
        // Debug logging for chart videos
        const isChartVideo = overlay.needsChromaKey === true || overlay.removeBackground === true || overlay.has_background === false;
        if (isChartVideo && frameSkipRef.current === 0) {
            console.log('🎨 Processing chart video frame:', {
                overlayId: overlay.id,
                needsChromaKey: overlay.needsChromaKey,
                removeBackground: overlay.removeBackground,
                has_background: overlay.has_background,
                src: overlay.src
            });
        }
        
        // OPTIMIZED: Skip frames to reduce CPU usage - process every 3rd frame (reduced from every 2nd)
        // This reduces processing by 66% while maintaining acceptable visual quality
        // For smoother playback, we prioritize frame rate over perfect chroma key quality
        frameSkipRef.current = (frameSkipRef.current + 1) % 3;
        if (frameSkipRef.current !== 0 && lastProcessedFrameRef.current) {
            return; // Skip this frame, use last processed frame
        }
        const context = canvasRef.current.getContext("2d", { willReadFrequently: true });
        if (!context) {
            return;
        }
        // Store the last processed frame for reprocessing on resize
        lastProcessedFrameRef.current = videoFrame;
        // Get dimensions
        const canvasWidth = canvasRef.current.width;
        const canvasHeight = canvasRef.current.height;
        const videoWidth = videoFrame.videoWidth || canvasWidth;
        const videoHeight = videoFrame.videoHeight || canvasHeight;
        // Clear canvas
        context.clearRect(0, 0, canvasWidth, canvasHeight);
        // Calculate objectFit positioning using helper
        const objectFit = overlay.styles.objectFit || "cover";
        const { drawX, drawY, drawWidth, drawHeight } = calculateObjectFitDimensions(videoWidth, videoHeight, canvasWidth, canvasHeight, objectFit);
        // Draw the video frame to canvas
        context.drawImage(videoFrame, drawX, drawY, drawWidth, drawHeight);
        // Get image data for pixel manipulation
        const imageData = context.getImageData(0, 0, canvasWidth, canvasHeight);
        const { data } = imageData;
        // Get greenscreen configuration with defaults (or use chart defaults)
        const config = overlay.greenscreen || {};
        
        // For chart videos, use white background removal (not green)
        if (isChartVideo) {
            // White background removal for charts
            const WHITE_THRESHOLD = 240; // Pixels with RGB > 240 are considered white
            const step = 3; // OPTIMIZED: Process every 3rd pixel (reduced from 2nd) for better performance
            for (let i = 0; i < data.length; i += step * 4) {
                const red = data[i];
                const green = data[i + 1];
                const blue = data[i + 2];
                const alpha = data[i + 3];
                
                // Remove white pixels (make transparent)
                if (red > WHITE_THRESHOLD && green > WHITE_THRESHOLD && blue > WHITE_THRESHOLD) {
                    data[i + 3] = 0; // Make fully transparent
                }
            }
        } else {
            // Standard greenscreen removal (green background)
        const sensitivity = (_b = config.sensitivity) !== null && _b !== void 0 ? _b : 100;
        const redThreshold = (_d = (_c = config.threshold) === null || _c === void 0 ? void 0 : _c.red) !== null && _d !== void 0 ? _d : 100;
        const greenMin = (_f = (_e = config.threshold) === null || _e === void 0 ? void 0 : _e.green) !== null && _f !== void 0 ? _f : 100;
        const blueThreshold = (_h = (_g = config.threshold) === null || _g === void 0 ? void 0 : _g.blue) !== null && _h !== void 0 ? _h : 100;
        const smoothing = (_j = config.smoothing) !== null && _j !== void 0 ? _j : 0;
        const spill = (_k = config.spill) !== null && _k !== void 0 ? _k : 0;
        // OPTIMIZED: Process pixels in chunks to avoid blocking main thread
        // Process every 3rd pixel (reduces processing by 66% for smoother playback)
        const step = 3; // Process every 3rd pixel (reduced from 2nd)
        for (let i = 0; i < data.length; i += step * 4) {
            const red = data[i];
            const green = data[i + 1];
            const blue = data[i + 2];
            const alpha = data[i + 3];
            // Check if pixel is green (greenscreen)
            if (green > greenMin && red < redThreshold && blue < blueThreshold) {
                // Calculate how "green" this pixel is for smooth transition
                const greenness = (green - Math.max(red, blue)) / 255;
                const alphaReduction = Math.min(1, greenness * (sensitivity / 100));
                // Apply transparency based on greenness and sensitivity
                data[i + 3] = alpha * (1 - alphaReduction);
            }
            else if (spill > 0) {
                // Remove green spill from non-green pixels
                const greenSpill = Math.max(0, green - Math.max(red, blue));
                if (greenSpill > 0) {
                    data[i + 1] = Math.max(0, green - greenSpill * spill);
                    }
                }
            }
        }
        
        // Skip smoothing for performance - too expensive
        // Put processed image data back to canvas
        context.putImageData(imageData, 0, 0);
    }, [overlay.greenscreen, overlay.needsChromaKey, overlay.removeBackground, overlay.has_background, overlay.styles.objectFit, overlay.id, overlay.src]);
    
    // Reprocess last frame when dimensions change (handles resize while paused)
    useEffect(() => {
        var _a;
        const needsChromaKey = 
            ((_a = overlay.greenscreen) === null || _a === void 0 ? void 0 : _a.enabled) || 
            overlay.needsChromaKey === true || 
            overlay.removeBackground === true ||
            overlay.has_background === false;
        if (needsChromaKey && lastProcessedFrameRef.current) {
            processVideoFrame(lastProcessedFrameRef.current);
        }
    }, [overlay.width, overlay.height, processVideoFrame, overlay.greenscreen, overlay.needsChromaKey, overlay.removeBackground, overlay.has_background]);
    
    // Video loading effect
    useEffect(() => {
        // CRITICAL: REMOVE ALL BLOCKING - videos load in background
        // Don't block rendering for ANY videos to prevent lag with multiple layers
        // Videos will load and play as they become ready
        // No blocking - videos load asynchronously
        // Reset error state when video source changes
        videoErrorRef.current = false;
    }, [overlay.src, videoSrc]);
    
    // Greenscreen removal callback for video frame processing
    const onVideoFrame = useCallback((videoFrame) => {
        processVideoFrame(videoFrame);
    }, [processVideoFrame]);
    
    // Debug logging for chart videos
    const isChartVideo = overlay.id?.includes('chart') || overlay.src?.includes('chart') || overlay.needsChromaKey === true || overlay.has_background === false;
    if (isChartVideo && frame === 0) {
        console.log('🎬 VideoLayerContent rendering chart video:', {
            overlayId: overlay.id,
            type: overlay.type,
            src: overlay.src,
            needsChromaKey: overlay.needsChromaKey,
            has_background: overlay.has_background,
            removeBackground: overlay.removeBackground,
            width: overlay.width,
            height: overlay.height,
            from: overlay.from,
            durationInFrames: overlay.durationInFrames
        });
    }
    
    // Safety check - don't render Video if src is missing
    if (!overlay.src || overlay.src.trim() === '') {
        if (isChartVideo) {
            console.error('❌ VideoLayerContent: Chart video overlay missing src:', {
                overlayId: overlay.id,
                overlay: overlay
            });
        }
        return null;
    }
    
    // Log final video source for chart videos
    if (isChartVideo && frame === 0) {
        console.log('🎬 VideoLayerContent final videoSrc:', videoSrc);
    }
    // Calculate if we're in the exit phase (last 30 frames)
    const isExitPhase = frame >= overlay.durationInFrames - 30;
    // Apply enter animation only during entry phase
    const enterAnimation = !isExitPhase && ((_b = overlay.styles.animation) === null || _b === void 0 ? void 0 : _b.enter)
        ? (_c = animationTemplates[getAnimationKey(overlay.styles.animation.enter)]) === null || _c === void 0 ? void 0 : _c.enter(frame, overlay.durationInFrames)
        : {};
    // Apply exit animation only during exit phase
    const exitAnimation = isExitPhase && ((_d = overlay.styles.animation) === null || _d === void 0 ? void 0 : _d.exit)
        ? (_e = animationTemplates[getAnimationKey(overlay.styles.animation.exit)]) === null || _e === void 0 ? void 0 : _e.exit(frame, overlay.durationInFrames)
        : {};
    // Optimize transform for GPU acceleration
    const baseTransform = overlay.styles.transform || "none";
    const gpuTransform = baseTransform === "none" ? "translateZ(0)" : `${baseTransform} translateZ(0)`;
    
    const videoStyle = {
        width: "100%",
        height: "100%",
        objectFit: overlay.styles.objectFit || "cover",
        opacity: overlay.styles.opacity,
        transform: gpuTransform,
        filter: overlay.styles.filter || "none",
        // Optimize for GPU acceleration when filters are applied
        willChange: overlay.styles.filter && overlay.styles.filter !== "none" ? "filter, transform" : "transform",
        // Force hardware acceleration
        backfaceVisibility: "hidden",
        WebkitBackfaceVisibility: "hidden",
        ...(isExitPhase ? exitAnimation : enterAnimation),
    };
    // Create a container style that includes padding and background color
    const containerStyle = {
        width: "100%",
        height: "100%",
        padding: overlay.styles.padding || "0px",
        backgroundColor: overlay.styles.paddingBackgroundColor || "transparent",
        display: "flex", // Use flexbox for centering
        alignItems: "center",
        justifyContent: "center",
        // Padding should be part of the total size
        boxSizing: "border-box",
        // Radius/border/shadow should wrap the padded container
        borderRadius: overlay.styles.borderRadius || "0px",
        border: overlay.styles.border || "none",
        boxShadow: overlay.styles.boxShadow || "none",
        // Ensure inner video respects rounded corners
        overflow: "hidden",
        // Apply clipPath at the container level so padding is also cropped
        clipPath: overlay.styles.clipPath || "none",
    };
    // Convert videoStartTime from seconds to frames for OffthreadVideo
    const startFromFrames = Math.round((overlay.videoStartTime || 0) * FPS);
    
    // Check if chroma key/background removal is needed
    // Support both greenscreen config and chart-specific flags
    const needsChromaKey = 
        ((_f = overlay.greenscreen) === null || _f === void 0 ? void 0 : _f.enabled) || 
        overlay.needsChromaKey === true || 
        overlay.removeBackground === true ||
        overlay.has_background === false;
    
    // If greenscreen/chroma key removal is enabled, use canvas-based rendering
    if (needsChromaKey) {
        return (_jsx("div", { style: containerStyle, children: _jsxs("div", { style: { position: 'relative', width: '100%', height: '100%' }, children: [_jsx(Html5Video, { src: videoSrc, trimBefore: startFromFrames, style: {
                            ...videoStyle,
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            opacity: 0,
                        }, volume: (_g = overlay.styles.volume) !== null && _g !== void 0 ? _g : 1, playbackRate: (_h = overlay.speed) !== null && _h !== void 0 ? _h : 1, onError: handleVideoError }), _jsx("canvas", { ref: canvasRef, width: overlay.width, height: overlay.height, style: {
                            ...videoStyle,
                            position: 'absolute',
                            top: 0,
                            left: 0,
                        } })] }) }));
    }
    // Normal rendering without greenscreen removal
    return (_jsx("div", { style: containerStyle, children: _jsx(Html5Video, { src: videoSrc, trimBefore: startFromFrames, style: videoStyle, volume: (_j = overlay.styles.volume) !== null && _j !== void 0 ? _j : 1, playbackRate: (_k = overlay.speed) !== null && _k !== void 0 ? _k : 1, onError: handleVideoError }) }));
};
