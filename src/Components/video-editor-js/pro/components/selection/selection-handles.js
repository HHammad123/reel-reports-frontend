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
    // For text overlays, use actual dimensions directly (no crop calculations)
    const isTextOverlay = overlay.type === OverlayType.TEXT;
    
    let handleWidth, handleHeight, handleLeft, handleTop;
    
    if (isTextOverlay) {
        // For text overlays, use the exact dimensions and position from the overlay
        // No transformations, no crop calculations, just use what's stored
        handleWidth = overlay.width;
        handleHeight = overlay.height;
        handleLeft = overlay.left;
        handleTop = overlay.top;
        
        // Only validate that values are finite numbers, don't constrain them
        if (!Number.isFinite(handleWidth) || handleWidth <= 0) {
            handleWidth = overlay.width || 500;
        }
        if (!Number.isFinite(handleHeight) || handleHeight <= 0) {
            handleHeight = overlay.height || 180;
        }
        if (!Number.isFinite(handleLeft)) {
            handleLeft = overlay.left || 100;
        }
        if (!Number.isFinite(handleTop)) {
            handleTop = overlay.top || 100;
        }
    } else {
        // For other overlay types (video, image), use crop calculations
        const effectiveDimensions = getEffectiveCropDimensions(overlay);
        const MIN_DIMENSION = 20;
        const MAX_DIMENSION = 3000;
        
        handleWidth = effectiveDimensions.width || overlay.width || 0;
        if (!Number.isFinite(handleWidth) || handleWidth <= 0) {
            handleWidth = overlay.width || MIN_DIMENSION;
        }
        handleWidth = Math.max(MIN_DIMENSION, Math.min(handleWidth, MAX_DIMENSION));
        
        handleHeight = effectiveDimensions.height || overlay.height || 0;
        if (!Number.isFinite(handleHeight) || handleHeight <= 0) {
            handleHeight = overlay.height || MIN_DIMENSION;
        }
        handleHeight = Math.max(MIN_DIMENSION, Math.min(handleHeight, MAX_DIMENSION));
        
        handleLeft = effectiveDimensions.left !== undefined ? effectiveDimensions.left : overlay.left;
        if (!Number.isFinite(handleLeft)) {
            handleLeft = overlay.left || 0;
        }
        handleLeft = Math.max(-handleWidth * 0.5, Math.min(handleLeft, MAX_DIMENSION));
        
        handleTop = effectiveDimensions.top !== undefined ? effectiveDimensions.top : overlay.top;
        if (!Number.isFinite(handleTop)) {
            handleTop = overlay.top || 0;
        }
        handleTop = Math.max(-handleHeight * 0.5, Math.min(handleTop, MAX_DIMENSION));
    }
    
    // Container style matches the overlay position but with extreme z-index
    const containerStyle = {
        position: "absolute",
        left: handleLeft,
        top: handleTop,
        width: handleWidth,
        height: handleHeight,
        transform: `rotate(${overlay.rotation || 0}deg)`,
        transformOrigin: "center center",
        zIndex: 999999, // Extreme z-index to be above everything
        pointerEvents: "none", // Don't block clicks on the container itself
    };
    return (_jsxs("div", { style: containerStyle, children: [_jsx(ResizeHandle, { overlay: overlay, setOverlay: changeOverlay, type: "top-left", alignmentGuides: alignmentGuides, allOverlays: allOverlays }), _jsx(ResizeHandle, { overlay: overlay, setOverlay: changeOverlay, type: "top-right", alignmentGuides: alignmentGuides, allOverlays: allOverlays }), _jsx(ResizeHandle, { overlay: overlay, setOverlay: changeOverlay, type: "bottom-left", alignmentGuides: alignmentGuides, allOverlays: allOverlays }), _jsx(ResizeHandle, { overlay: overlay, setOverlay: changeOverlay, type: "bottom-right", alignmentGuides: alignmentGuides, allOverlays: allOverlays }), _jsx(RotateHandle, { overlay: overlay, setOverlay: changeOverlay }), (overlay.type === OverlayType.VIDEO && overlay.styles.cropEnabled) && (_jsx(CropOverlay, { overlay: overlay, onCropChange: handleCropChange })), (overlay.type === OverlayType.IMAGE && overlay.styles.cropEnabled) && (_jsx(CropOverlay, { overlay: overlay, onCropChange: handleCropChange }))] }));
};
