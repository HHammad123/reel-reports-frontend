import { jsx as _jsx } from "react/jsx-runtime";
import { useCurrentFrame, useVideoConfig } from "remotion";
import { useMemo, useRef } from "react";
import { defaultCaptionStyles } from "../../../components/overlay/captions/caption-settings";
import { useLoadFontFromTextItem } from "../../text/load-font-from-text-item";
/**
 * CaptionLayerContent Component
 *
 * @component
 * @description
 * Renders animated captions in the video editor with word-by-word highlighting.
 * Features include:
 * - Word-by-word timing and animation
 * - Customizable text styles and animations
 * - Smooth transitions between words
 * - Dynamic highlighting based on current frame
 *
 * The component calculates timing for each word and applies appropriate
 * styling and animations based on the current playback position.
 *
 * @example
 * ```tsx
 * <CaptionLayerContent
 *   overlay={{
 *     captions: [...],
 *     styles: {...},
 *     // other overlay properties
 *   }}
 * />
 * ```
 */
export const CaptionLayerContent = ({ overlay, fontInfos, }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const frameMs = (frame / fps) * 1000;
    const styles = overlay.styles || defaultCaptionStyles;
    
    // Cache caption lookup to avoid re-running find() on every frame
    const lastFrameRef = useRef(-1);
    const lastCaptionRef = useRef(null);
    
    // Use font from overlay styles or default to Inter
    const fontFamily = styles.fontFamily || "Inter";
    const fontWeight = String(styles.fontWeight || '400');
    const fontStyle = 'normal'; // Captions don't typically use italic
    // Use the proper font loading hook
    // During rendering, fontInfos will be provided and fontInfo will be extracted from it
    // In editor, fontInfos will be undefined and font will be fetched from API
    const fontInfo = (fontInfos === null || fontInfos === void 0 ? void 0 : fontInfos[fontFamily]) || null;
    useLoadFontFromTextItem({
        fontFamily: fontFamily,
        fontWeight: fontWeight,
        fontStyle: fontStyle,
        fontInfosDuringRendering: fontInfo,
    });
    
    // Cache caption finding - only recalculate if frame changed
    // Removed frame skipping to prevent subtitle lag behind timeline
    let currentCaption = lastCaptionRef.current;
    if (lastFrameRef.current !== frame) {
        currentCaption = overlay.captions.find((caption) => frameMs >= caption.startMs && frameMs <= caption.endMs);
        lastFrameRef.current = frame;
        lastCaptionRef.current = currentCaption;
    }
    
    if (!currentCaption)
        return null;
    
    // Ensure font family is properly quoted if it contains spaces
    const quotedFontFamily = fontFamily && fontFamily.includes(' ') ? `"${fontFamily}"` : fontFamily;
    
    // Pre-calculate highlight style to avoid repeated lookups
    const highlightStyle = styles.highlightStyle || defaultCaptionStyles.highlightStyle;
    const highlightColor = highlightStyle?.color;
    const highlightBg = highlightStyle?.backgroundColor;
    const highlightScale = highlightStyle?.scale;
    const highlightFontWeight = highlightStyle?.fontWeight || 600;
    const highlightTextShadow = highlightStyle?.textShadow;
    const highlightPadding = highlightStyle?.padding || "4px 8px";
    const highlightBorderRadius = highlightStyle?.borderRadius || "4px";
    
    // Render words - optimize by skipping calculations when not highlighted
        var _a;
    const words = (_a = currentCaption === null || currentCaption === void 0 ? void 0 : currentCaption.words) === null || _a === void 0 ? void 0 : _a.map((word, index) => {
            const isHighlighted = frameMs >= word.startMs && frameMs <= word.endMs;
        
        // Skip progress calculation if not highlighted (optimization)
        let scaleValue = 1;
        if (isHighlighted) {
            const progress = Math.min((frameMs - word.startMs) / 300, 1);
            scaleValue = highlightScale
                ? 1 + (highlightScale - 1) * progress
                : 1.08;
        }
        
        return (_jsx("span", { 
            className: "inline-block", // REMOVED: transition-all duration-200 - causes lag
            style: {
                color: isHighlighted ? highlightColor : styles.color,
                backgroundColor: isHighlighted ? highlightBg : "transparent",
                opacity: 1, // FIXED: Always full opacity for visibility - was 0.85 for non-highlighted
                transform: `scale(${scaleValue})`,
                fontWeight: isHighlighted ? highlightFontWeight : styles.fontWeight || 400,
                textShadow: isHighlighted ? highlightTextShadow : styles.textShadow,
                padding: highlightPadding,
                borderRadius: highlightBorderRadius,
                    margin: "0 2px",
                fontFamily: quotedFontFamily,
                // REMOVED: transition property - causes performance issues
                willChange: isHighlighted ? "transform, opacity" : "auto", // Only optimize when highlighted
            }, 
            children: word.word 
        }, `${word.word}-${index}`));
        });
    
    return (_jsx("div", { className: "absolute inset-0 flex items-center justify-center p-4", style: {
            ...styles,
            width: "100%",
            height: "100%",
            fontFamily: quotedFontFamily, // Use quoted font name for proper CSS
            zIndex: 1000, // FIXED: Ensure subtitles appear above other content
            pointerEvents: "none", // Don't block interactions
        }, children: _jsx("div", { className: "leading-relaxed tracking-wide", style: {
                whiteSpace: "pre-wrap",
                width: "100%",
                textAlign: "center",
                wordBreak: "break-word",
                display: "flex",
                flexWrap: "wrap",
                justifyContent: "center",
                alignItems: "center",
                gap: "2px",
                // FIXED: Ensure text is always visible
                color: styles.color || "#ffffff",
                textShadow: styles.textShadow || "2px 2px 4px rgba(0,0,0,0.8)", // Default shadow for readability
            }, children: words }) }));
};
