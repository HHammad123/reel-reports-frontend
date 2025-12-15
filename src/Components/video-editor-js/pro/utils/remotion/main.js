import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from "react";
import { AbsoluteFill } from "remotion";
import { SortedOutlines } from "../../components/selection/sorted-outlines";
import { Layer } from "./layer";
import { AlignmentGuides } from "../../components/selection/alignment-guides";
import { useAlignmentGuides } from "../../hooks/use-alignment-guides";
const outer = {
    backgroundColor: "white",
};
const layerContainer = {
    overflow: "hidden",
    maxWidth: "3000px",
};
/**
 * Main component that renders a canvas-like area with overlays and their outlines.
 * Handles selection of overlays and provides a container for editing them.
 *
 * @param props - Component props of type MainProps
 * @returns React component that displays overlays and their interactive outlines
 */
export const Main = ({ overlays, setSelectedOverlayId, selectedOverlayId, changeOverlay, width, height, baseUrl, showAlignmentGuides = true, backgroundColor = "white", fontInfos, }) => {
    // Initialize alignment guides hook with responsive snap threshold
    // Calculate snap threshold as a percentage of canvas size for consistent sensitivity
    const snapThreshold = Math.min(width, height) * 0.01; // 1% of the smaller dimension
    const alignmentGuides = useAlignmentGuides({
        canvasWidth: width,
        canvasHeight: height,
        snapThreshold,
    });
    const onPointerDown = useCallback((e) => {
        if (e.button !== 0) {
            return;
        }
        setSelectedOverlayId(null);
    }, [setSelectedOverlayId]);
    return (_jsxs(AbsoluteFill, { style: {
            ...outer,
            backgroundColor,
        }, onPointerDown: onPointerDown, children: [_jsx(AbsoluteFill, { style: layerContainer, children: overlays.map((overlay) => {
                    return (_jsx(Layer, { overlay: overlay, ...(baseUrl && { baseUrl }), ...(fontInfos && { fontInfos }) }, overlay.id));
                }) }), _jsx(SortedOutlines, { selectedOverlayId: selectedOverlayId, overlays: overlays, changeOverlay: changeOverlay, alignmentGuides: alignmentGuides }), showAlignmentGuides && (_jsx(AlignmentGuides, { guideState: alignmentGuides.guideState, canvasWidth: width, canvasHeight: height }))] }));
};
