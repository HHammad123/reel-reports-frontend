import { jsx as _jsx } from "react/jsx-runtime";
import { useMemo } from "react";
import { Sequence } from "remotion";
import { LayerContent } from "./layer-content";
/**
 * Props for the Layer component
 * @interface LayerProps
 * @property {Overlay} overlay - The overlay object containing position, dimensions, and content information
 * @property {string | undefined} baseUrl - The base URL for the video
 * @property {Record<string, FontInfo>} fontInfos - Font infos for rendering (populated during SSR/Lambda rendering)
 */
export const Layer = ({ overlay, baseUrl, fontInfos }) => {
    /**
     * Memoized style calculations for the layer
     * Handles positioning, dimensions, rotation, and z-index based on:
     * - Overlay position (left, top)
     * - Dimensions (width, height)
     * - Rotation
     * - Row position for z-index stacking
     * - Selection state for pointer events
     *
     * @returns {React.CSSProperties} Computed styles for the layer
     */
    const style = useMemo(() => {
        // Higher row numbers should be at the bottom
        // e.g. row 4 = z-index 60, row 0 = z-index 100
        // Use nullish coalescing to handle negative row values correctly
        const row = overlay.row ?? 0;
        // Calculate base zIndex from row
        let zIndex = 100 - row * 10;
        // If styles.zIndex is explicitly set and higher, use it (for chart videos on top)
        if (overlay.styles?.zIndex && typeof overlay.styles.zIndex === 'number' && overlay.styles.zIndex > zIndex) {
            zIndex = overlay.styles.zIndex;
        }
        return {
            position: "absolute",
            left: overlay.left,
            top: overlay.top,
            width: overlay.width,
            height: overlay.height,
            transform: `rotate(${overlay.rotation || 0}deg)`,
            transformOrigin: "center center",
            zIndex,
            // Always disable pointer events on the actual content layer
            // Interaction happens through SelectionOutline component instead
            pointerEvents: "none",
        };
    }, [
        overlay.height,
        overlay.left,
        overlay.top,
        overlay.width,
        overlay.rotation,
        overlay.row,
        overlay.styles?.zIndex,
    ]);
    /**
     * Special handling for sound overlays
     * Sound overlays don't need positioning or visual representation,
     * they just need to be sequenced correctly
     */
    if (overlay.type === "sound") {
        return (_jsx(Sequence, { from: overlay.from, durationInFrames: overlay.durationInFrames, children: _jsx(LayerContent, { overlay: overlay, ...(baseUrl && { baseUrl }), ...(fontInfos && { fontInfos }) }) }, overlay.id));
    }
    /**
     * Standard layer rendering for visual elements
     * Wraps the content in a Sequence for timing control and
     * a positioned div for layout management
     */
    return (_jsx(Sequence, { from: overlay.from, durationInFrames: overlay.durationInFrames, layout: "none", children: _jsx("div", { style: style, children: _jsx(LayerContent, { overlay: overlay, ...(baseUrl && { baseUrl }), ...(fontInfos && { fontInfos }) }) }) }, overlay.id));
};
