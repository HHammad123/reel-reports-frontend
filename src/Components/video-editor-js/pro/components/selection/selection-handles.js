import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { ResizeHandle } from "./resize-handle";
import { OverlayType } from "../../types";
import { RotateHandle } from "./rotate-handle";
import { CropOverlay } from "./crop-overlay";
import { getEffectiveCropDimensions } from "../../utils/crop-utils";
import { useCropHandling } from "../../hooks/use-crop-handling";
/**
 * SelectionHandles renders interactive handles (resize, rotate, crop) for the selected overlay.
 * These handles are rendered OUTSIDE the selection outline to avoid z-index stacking context issues.
 * This component is positioned absolutely to match the selected overlay's position.
 *
 * @component
 * @param {Object} props
 * @param {Overlay} props.overlay - The selected overlay object
 * @param {Function} props.changeOverlay - Callback to update overlay properties
 * @param {ReturnType<typeof useAlignmentGuides>} props.alignmentGuides - Alignment guide utilities
 * @param {Overlay[]} props.allOverlays - All overlays for alignment calculations
 */
export const SelectionHandles = ({ overlay, changeOverlay, alignmentGuides, allOverlays }) => {
    // Use shared crop handling hook
    const handleCropChange = useCropHandling(overlay, changeOverlay);
    if (overlay.type === OverlayType.SOUND) {
        return null;
    }
    // Get effective dimensions for positioning
    const effectiveDimensions = getEffectiveCropDimensions(overlay);
    // Container style matches the overlay position but with extreme z-index
    const containerStyle = {
        position: "absolute",
        left: effectiveDimensions.left,
        top: effectiveDimensions.top,
        width: effectiveDimensions.width,
        height: effectiveDimensions.height,
        transform: `rotate(${overlay.rotation || 0}deg)`,
        transformOrigin: "center center",
        zIndex: 999999, // Extreme z-index to be above everything
        pointerEvents: "none", // Don't block clicks on the container itself
    };
    return (_jsxs("div", { style: containerStyle, children: [_jsx(ResizeHandle, { overlay: overlay, setOverlay: changeOverlay, type: "top-left", alignmentGuides: alignmentGuides, allOverlays: allOverlays }), _jsx(ResizeHandle, { overlay: overlay, setOverlay: changeOverlay, type: "top-right", alignmentGuides: alignmentGuides, allOverlays: allOverlays }), _jsx(ResizeHandle, { overlay: overlay, setOverlay: changeOverlay, type: "bottom-left", alignmentGuides: alignmentGuides, allOverlays: allOverlays }), _jsx(ResizeHandle, { overlay: overlay, setOverlay: changeOverlay, type: "bottom-right", alignmentGuides: alignmentGuides, allOverlays: allOverlays }), _jsx(RotateHandle, { overlay: overlay, setOverlay: changeOverlay }), (overlay.type === OverlayType.VIDEO && overlay.styles.cropEnabled) && (_jsx(CropOverlay, { overlay: overlay, onCropChange: handleCropChange })), (overlay.type === OverlayType.IMAGE && overlay.styles.cropEnabled) && (_jsx(CropOverlay, { overlay: overlay, onCropChange: handleCropChange }))] }));
};
