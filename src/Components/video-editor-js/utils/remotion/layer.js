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
        const zIndex = 100 - (overlay.row || 0) * 10;
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
