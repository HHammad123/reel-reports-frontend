import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useCallback, useMemo } from "react";
import { useCurrentScale } from "remotion";
import { OverlayType } from "../../types";
import { getEffectiveCropDimensions } from "../../utils/crop-utils";
import { useOverlaySelection } from "../../hooks/use-overlay-section";
import { useCropHandling } from "../../hooks/use-crop-handling";
/**
 * SelectionOutline is a component that renders a draggable, resizable outline around selected overlays.
 * It provides visual feedback and interaction handles for manipulating overlay elements.
 *
 * @component
 * @param {Object} props
 * @param {Overlay} props.overlay - The overlay object containing position, size, and other properties
 * @param {Function} props.changeOverlay - Callback to update overlay properties
 * @param {Function} props.setSelectedOverlayId - Function to update the currently selected overlay
 * @param {number|null} props.selectedOverlayId - ID of the currently selected overlay
 * @param {boolean} props.isDragging - Whether the overlay is currently being dragged
 */
export const SelectionOutline = ({ overlay, changeOverlay, selectedOverlayId, isDragging, alignmentGuides, allOverlays, }) => {
    // Call all hooks first - they must be called in the same order every render
    const scale = useCurrentScale();
    const scaledBorder = Math.ceil(1 / scale);
    const [hovered, setHovered] = React.useState(false);
    const dragStartedRef = React.useRef(false);
    const { handleOverlaySelect } = useOverlaySelection();
    
    // Validate overlay exists and has valid ID - use safe defaults if invalid
    const isValidOverlay = overlay && overlay.id != null && overlay.id !== undefined && overlay.id !== '';
    const safeOverlay = isValidOverlay ? overlay : { id: null, type: null, left: 0, top: 0, width: 0, height: 0, rotation: 0, row: 0, styles: {} };
    
    const onMouseEnter = useCallback(() => {
        setHovered(true);
    }, []);
    const onMouseLeave = useCallback(() => {
        setHovered(false);
    }, []);
    const isSelected = safeOverlay.id === selectedOverlayId;
    // Use shared crop handling hook - pass safe overlay
    const handleCropChange = useCropHandling(safeOverlay, changeOverlay);
    // Handle double-click to enable cropping
    const handleDoubleClick = useCallback((e) => {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        e.stopPropagation();
        // Only enable crop for VIDEO and IMAGE types
        if (!isValidOverlay) return;
        if (safeOverlay.type === OverlayType.VIDEO || safeOverlay.type === OverlayType.IMAGE) {
            const currentOverlay = safeOverlay;
            // If crop is not already enabled, enable it with default values
            if (!((_a = currentOverlay.styles) === null || _a === void 0 ? void 0 : _a.cropEnabled)) {
                handleCropChange({
                    cropEnabled: true,
                    cropX: (_c = (_b = currentOverlay.styles) === null || _b === void 0 ? void 0 : _b.cropX) !== null && _c !== void 0 ? _c : 0,
                    cropY: (_e = (_d = currentOverlay.styles) === null || _d === void 0 ? void 0 : _d.cropY) !== null && _e !== void 0 ? _e : 0,
                    cropWidth: (_g = (_f = currentOverlay.styles) === null || _f === void 0 ? void 0 : _f.cropWidth) !== null && _g !== void 0 ? _g : 100,
                    cropHeight: (_j = (_h = currentOverlay.styles) === null || _h === void 0 ? void 0 : _h.cropHeight) !== null && _j !== void 0 ? _j : 100,
                });
            }
        }
    }, [isValidOverlay, safeOverlay, handleCropChange]);
    const style = useMemo(() => {
        if (!isValidOverlay) {
            return { display: 'none' };
        }
        // Get effective dimensions based on crop settings when crop is enabled
        const effectiveDimensions = getEffectiveCropDimensions(safeOverlay);
        // Selection outlines should match layer stacking
        // But start at 1000 to be above content
        // e.g. row 4 = z-index 960, row 0 = z-index 1000
        const baseZIndex = 1000 - (safeOverlay.row || 0) * 10;
        // Selected items get a small boost to appear above their layer
        // but not enough to override higher layers (max +5 to stay within row spacing of 10)
        const selectionBoost = isSelected ? 5 : 0;
        const zIndex = baseZIndex + selectionBoost;
        // Always show border when selected, or on hover when not dragging
        const shouldShowBorder = isSelected || (hovered && !isDragging);
        // Ensure minimum border width for visibility (at least 3px for better visibility)
        const borderWidth = Math.max(scaledBorder, isSelected ? 3 : 2);
        // Ensure minimum dimensions for clickability
        const minDimension = 20; // Minimum 20px for clickability
        const outlineWidth = Math.max(effectiveDimensions.width || 0, minDimension);
        const outlineHeight = Math.max(effectiveDimensions.height || 0, minDimension);
        
        return {
            width: Number.isFinite(outlineWidth) ? outlineWidth : minDimension,
            height: Number.isFinite(outlineHeight) ? outlineHeight : minDimension,
            left: effectiveDimensions.left,
            top: effectiveDimensions.top,
            position: "absolute",
            // Use border for all 4 sides - always show when selected, thicker for selected items
            border: shouldShowBorder
                ? `${borderWidth}px solid ${isSelected ? '#3b82f6' : '#60a5fa'}`
                : 'none',
            boxSizing: 'border-box',
            // Add a more prominent shadow when selected for better visibility
            boxShadow: isSelected
                ? '0 0 0 2px rgba(59, 130, 246, 0.4), 0 0 8px rgba(59, 130, 246, 0.2)'
                : shouldShowBorder
                    ? '0 0 0 1px rgba(59, 130, 246, 0.3)'
                    : 'none',
            transform: `rotate(${safeOverlay.rotation || 0}deg)`,
            transformOrigin: "center center",
            userSelect: "none",
            touchAction: "none",
            zIndex,
            pointerEvents: "all", // CRITICAL: Must be "all" to capture clicks and drags
            cursor: isSelected ? "move" : "pointer", // Show move cursor when selected
            // Ensure the div covers the full area and is clickable
            backgroundColor: 'transparent',
            // Ensure minimum size for clickability - but use actual dimensions
            minWidth: outlineWidth,
            minHeight: outlineHeight,
        };
    }, [isValidOverlay, safeOverlay, hovered, isDragging, isSelected, scaledBorder]);
    const startDragging = useCallback((e) => {
        if (!isValidOverlay) return;
        const initialX = e.clientX;
        const initialY = e.clientY;
        let hasMoved = false;
        const DRAG_THRESHOLD = 3; // Pixels to move before starting drag
        
        const onPointerMove = (pointerMoveEvent) => {
            const deltaX = Math.abs(pointerMoveEvent.clientX - initialX);
            const deltaY = Math.abs(pointerMoveEvent.clientY - initialY);
            
            // Only start dragging if mouse has moved beyond threshold
            if (!hasMoved && (deltaX < DRAG_THRESHOLD && deltaY < DRAG_THRESHOLD)) {
                return; // Wait for more movement
            }
            
            if (!hasMoved) {
                hasMoved = true;
                dragStartedRef.current = true; // Mark that dragging has started
            }
            
            const offsetX = (pointerMoveEvent.clientX - initialX) / scale;
            const offsetY = (pointerMoveEvent.clientY - initialY) / scale;
            // Calculate the intended position without snapping
            const intendedLeft = safeOverlay.left + offsetX;
            const intendedTop = safeOverlay.top + offsetY;
            // Create a temporary overlay with the intended position for alignment calculations
            const tempOverlay = {
                ...safeOverlay,
                left: intendedLeft,
                top: intendedTop,
                isDragging: true,
            };
            // Update alignment guides based on current position
            alignmentGuides.updateGuides(tempOverlay, allOverlays);
            // Calculate snap position
            const snapPosition = alignmentGuides.calculateSnapPosition(tempOverlay, allOverlays);
            changeOverlay(safeOverlay.id, (o) => {
                return {
                    ...o,
                    left: Math.round(snapPosition.left),
                    top: Math.round(snapPosition.top),
                    isDragging: true,
                };
            });
        };
        const onPointerUp = () => {
            if (!isValidOverlay) return;
            // Clear alignment guides when dragging ends
            alignmentGuides.clearGuides();
            changeOverlay(safeOverlay.id, (o) => {
                return {
                    ...o,
                    isDragging: false,
                };
            });
            // Reset drag flag after a short delay to allow click handler to check it
            setTimeout(() => {
                dragStartedRef.current = false;
            }, 100);
            window.removeEventListener("pointermove", onPointerMove);
        };
        window.addEventListener("pointermove", onPointerMove, { passive: true });
        window.addEventListener("pointerup", onPointerUp, {
            once: true,
        });
    }, [isValidOverlay, safeOverlay, scale, changeOverlay, alignmentGuides, allOverlays]);
    
    const onPointerDown = useCallback((e) => {
        if (!isValidOverlay) return;
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection during drag
        if (e.button !== 0) {
            return;
        }
        // Reset drag flag at start
        dragStartedRef.current = false;
        // Always select the overlay first (this opens the sidebar)
        handleOverlaySelect(safeOverlay);
        // Then start dragging (will only actually drag if mouse moves beyond threshold)
        startDragging(e);
    }, [isValidOverlay, safeOverlay, handleOverlaySelect, startDragging]);
    
    // Also handle click (separate from drag) to ensure selection
    // Only fire if no drag occurred
    const onClick = useCallback((e) => {
        if (!isValidOverlay) return;
        e.stopPropagation();
        // Only select if we didn't drag (prevents double-selection)
        if (!dragStartedRef.current) {
            handleOverlaySelect(safeOverlay);
        }
    }, [isValidOverlay, safeOverlay, handleOverlaySelect]);
    
    // Early return after all hooks - validate overlay
    if (!isValidOverlay || safeOverlay.type === OverlayType.SOUND) {
        return null;
    }
    
    return (_jsx(_Fragment, { children: _jsx("div", { 
        onPointerDown: onPointerDown, 
        onClick: onClick,
        onPointerEnter: onMouseEnter, 
        onPointerLeave: onMouseLeave, 
        onDoubleClick: handleDoubleClick, 
        style: style,
        // Add data attribute for debugging
        'data-overlay-id': safeOverlay.id,
        'data-overlay-type': safeOverlay.type
    }) }));
};
