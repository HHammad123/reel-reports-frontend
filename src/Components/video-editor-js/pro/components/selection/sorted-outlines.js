import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Sequence } from "remotion";
import { SelectionOutline } from "./selected-outline";
import { SelectionHandles } from "./selection-handles";
/**
 * Sorts overlays by their row number to maintain proper stacking order
 * Lower row numbers should appear later in the array (top)
 */
const sortOverlaysByRow = (overlays) => {
    const sorted = [...overlays].sort((a, b) => (a.row || 0) - (b.row || 0));
    return sorted;
};
/**
 * Renders a sorted list of selection outlines for overlays
 * Maintains natural stacking order based on row numbers
 * Each outline is wrapped in a Remotion Sequence component for timeline positioning
 *
 * @param props
 * @param props.overlays - Array of overlay objects to render
 * @param props.selectedOverlayId - ID of currently selected overlay
 * @param props.changeOverlay - Callback to modify an overlay's properties
 * @param props.setSelectedOverlayId - State setter for selected overlay ID
 */
export const SortedOutlines = ({ overlays, selectedOverlayId, changeOverlay, alignmentGuides }) => {
    // Filter out overlays without valid IDs - they can't be selected or manipulated
    const validOverlays = React.useMemo(() => {
        return overlays.filter((overlay) => {
            const hasValidId = overlay.id != null && overlay.id !== undefined && overlay.id !== '';
            if (!hasValidId) {
                console.warn('[SortedOutlines] Overlay missing ID, skipping:', overlay);
            }
            return hasValidId;
        });
    }, [overlays]);
    
    const overlaysToDisplay = React.useMemo(() => sortOverlaysByRow(validOverlays), [validOverlays]);
    const isDragging = React.useMemo(() => validOverlays.some((overlay) => overlay.isDragging), [validOverlays]);
    const selectedOverlay = React.useMemo(() => validOverlays.find((o) => o.id === selectedOverlayId), [validOverlays, selectedOverlayId]);
    return (_jsxs(_Fragment, { children: [overlaysToDisplay.map((overlay) => {
                return (_jsx(Sequence, { from: overlay.from, durationInFrames: overlay.durationInFrames, layout: "none", children: _jsx(SelectionOutline, { changeOverlay: changeOverlay, overlay: overlay, selectedOverlayId: selectedOverlayId, isDragging: isDragging, alignmentGuides: alignmentGuides, allOverlays: overlays }) }, overlay.id));
            }), selectedOverlay && (_jsx(Sequence, { from: selectedOverlay.from, durationInFrames: selectedOverlay.durationInFrames, layout: "none", children: _jsx(SelectionHandles, { overlay: selectedOverlay, changeOverlay: changeOverlay, alignmentGuides: alignmentGuides, allOverlays: overlays }) }, `handles-${selectedOverlay.id}`))] }));
};
