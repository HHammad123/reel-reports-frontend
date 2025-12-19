import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo, useRef, useEffect } from "react";
import { useCurrentFrame } from "remotion";
import { animationTemplates } from "../../../templates/animation-templates";
import { getAnimationKey } from "../../../adaptors/default-animation-adaptors";
import { useLoadFontFromTextItem } from "../../text/load-font-from-text-item";

export const TextLayerContent = ({ overlay, fontInfos, }) => {
    var _a, _b, _c, _d, _e;
    
    const frame = useCurrentFrame();
    
    // ============================================================================
    // CRITICAL FIX: Store calculated fontSize in a ref to prevent recalculation
    // Only recalculate when width, height, or content actually changes
    // ============================================================================
    const calculatedFontSizeRef = useRef(null);
    const lastCalculationParamsRef = useRef(null);
    
    // Get font family - handle legacy Tailwind classes for backward compatibility
    const getFontFamily = () => {
        const fontValue = overlay.styles.fontFamily;
        if (fontValue?.startsWith('font-')) {
            switch (fontValue) {
                case "font-sans": return "Inter";
                case "font-serif": return "Merriweather";
                case "font-mono": return "Roboto Mono";
                case "font-retro": return "VT323";
                case "font-league-spartan": return "League Spartan";
                case "font-bungee-inline": return "Bungee Inline";
                default: return "Inter";
            }
        }
        return fontValue || "Inter";
    };
    
    const fontFamily = getFontFamily();
    const fontWeight = String(overlay.styles.fontWeight || '400');
    const fontStyle = (overlay.styles.fontStyle || 'normal');
    
    const fontInfo = (fontInfos?.[fontFamily]) || null;
    useLoadFontFromTextItem({
        fontFamily: fontFamily,
        fontWeight: fontWeight,
        fontStyle: fontStyle,
        fontInfosDuringRendering: fontInfo,
    });
    
    // Calculate if we're in the exit phase (last 30 frames)
    const isExitPhase = frame >= overlay.durationInFrames - 30;
    
    // Apply enter animation only during entry phase
    const enterAnimation = !isExitPhase && overlay.styles.animation?.enter
        ? animationTemplates[getAnimationKey(overlay.styles.animation.enter)]?.enter(frame, overlay.durationInFrames)
        : {};
    
    // Apply exit animation only during exit phase
    const exitAnimation = isExitPhase && overlay.styles.animation?.exit
        ? animationTemplates[getAnimationKey(overlay.styles.animation.exit)]?.exit(frame, overlay.durationInFrames)
        : {};
    
    // ============================================================================
    // CRITICAL FIX: Only recalculate fontSize when necessary
    // Check if calculation params have changed before recalculating
    // ============================================================================
    const calculateFontSize = (width, height, content, padding, border, lineHeight, fontSizeScale) => {
        const lines = content.split("\n");
        const numLines = lines.length;
        const maxLineLength = Math.max(...lines.map((line) => line.length));
        
        if (!content.trim() || maxLineLength === 0) {
            return Math.min(48, height * 0.6);
        }
        
        const extractPadding = (paddingStr) => {
            if (!paddingStr) return { vertical: 0, horizontal: 0 };
            const values = paddingStr.split(' ').map(v => {
                if (v.endsWith('px')) return parseInt(v);
                if (v.endsWith('em')) return parseInt(v) * 16;
                return 0;
            });
            if (values.length === 1) {
                return { vertical: values[0] * 2, horizontal: values[0] * 2 };
            } else if (values.length === 2) {
                return { vertical: values[0] * 2, horizontal: values[1] * 2 };
            } else if (values.length === 4) {
                return { vertical: values[0] + values[2], horizontal: values[1] + values[3] };
            }
            return { vertical: values[0] * 2, horizontal: values[0] * 2 };
        };
        
        const paddingValues = extractPadding(padding);
        const actualPaddingVertical = paddingValues.vertical;
        const actualPaddingHorizontal = paddingValues.horizontal;
        
        const borderWidth = border ? 2 : 0;
        const lineHeightFactor = parseFloat(lineHeight || "1.2");
        
        const availableWidth = Math.max(20, width - actualPaddingHorizontal - (borderWidth * 2));
        const availableHeight = Math.max(20, height - actualPaddingVertical - (borderWidth * 2));
        
        const heightBasedSize = (availableHeight / numLines) / lineHeightFactor;
        const avgCharWidthRatio = 0.5;
        const widthBasedSize = availableWidth / (maxLineLength * avgCharWidthRatio);
        
        let calculatedSize = Math.min(heightBasedSize, widthBasedSize);
        calculatedSize *= 0.95;
        
        if (maxLineLength > 40) {
            calculatedSize *= Math.max(0.85, 1 - (maxLineLength - 40) / 200);
        }
        if (numLines > 4) {
            calculatedSize *= Math.max(0.9, 1 - (numLines - 4) * 0.02);
        }
        if (width < 60 || height < 20) {
            calculatedSize *= 0.9;
        }
        
        const minSize = Math.max(8, Math.min(16, height * 0.1));
        const maxSize = Math.min(height * 0.8, width * 0.15, 200);
        
        const finalSize = Math.max(minSize, Math.min(calculatedSize, maxSize));
        const scale = fontSizeScale || 1;
        
        return finalSize * scale;
    };
    
    // Check if we need to recalculate
    const currentParams = {
        width: overlay.width,
        height: overlay.height,
        content: overlay.content,
        padding: overlay.styles.padding,
        border: overlay.styles.border,
        lineHeight: overlay.styles.lineHeight,
        fontSizeScale: overlay.styles.fontSizeScale,
    };
    
    // Create a stable key for comparison
    const paramsKey = JSON.stringify(currentParams);
    const lastParamsKey = lastCalculationParamsRef.current ? JSON.stringify(lastCalculationParamsRef.current) : null;
    
    // Only recalculate if params actually changed
    if (paramsKey !== lastParamsKey) {
        calculatedFontSizeRef.current = calculateFontSize(
            currentParams.width,
            currentParams.height,
            currentParams.content,
            currentParams.padding,
            currentParams.border,
            currentParams.lineHeight,
            currentParams.fontSizeScale
        );
        lastCalculationParamsRef.current = currentParams;
    }
    
    // Use the cached fontSize
    const fontSize = calculatedFontSizeRef.current || 28;
    
    const containerStyle = {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        textAlign: overlay.styles.textAlign,
        justifyContent: overlay.styles.textAlign === "center"
            ? "center"
            : overlay.styles.textAlign === "right"
                ? "flex-end"
                : "flex-start",
        overflow: "hidden",
        boxSizing: "border-box",
        position: "relative",
        userSelect: "none",
        WebkitUserSelect: "none",
        ...(isExitPhase ? exitAnimation : enterAnimation),
    };
    
    const { fontSize: _templateFontSize, ...restStyles } = overlay.styles;
    
    // Ensure font family is properly quoted if it contains spaces
    const quotedFontFamily = fontFamily && fontFamily.includes(' ') ? `"${fontFamily}"` : fontFamily;
    
    const textStyle = {
        ...restStyles,
        animation: undefined,
        fontSize: `${fontSize}px`,
        fontFamily: quotedFontFamily,
        maxWidth: "100%",
        maxHeight: "100%",
        wordWrap: "break-word",
        whiteSpace: "pre-wrap",
        lineHeight: overlay.styles.lineHeight || "1.2",
        padding: overlay.styles.padding || "0.1em",
        overflow: "hidden",
        textOverflow: "ellipsis",
        boxSizing: "border-box",
        userSelect: "none",
        WebkitUserSelect: "none",
        ...(isExitPhase ? exitAnimation : enterAnimation),
    };
    
    const enterKey = overlay.styles.animation?.enter;
    const content = overlay.content || "Enter text...";
    let renderedContent = content;
    
    if (enterKey === 'typing') {
        const charDelay = 2;
        const speed = 0.5;
        const visibleCount = Math.min(content.length, Math.floor((frame * speed) / Math.max(1, charDelay)));
        renderedContent = content.slice(0, visibleCount);
    }
    
    return (
        <div style={containerStyle}>
            <div style={textStyle}>
                {renderedContent}
            </div>
        </div>
    );
};