import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { Button } from "../../ui/button";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from "../../ui/collapsible";
import { AlignVerticalJustifyStart, AlignVerticalJustifyEnd, AlignHorizontalJustifyStart, AlignHorizontalJustifyEnd, SquareDot, } from "lucide-react";
import { useEditorContext } from "../../../contexts/editor-context";
/**
 * PositionSettings Component
 *
 * A collapsible panel that provides quick positioning controls for overlays.
 * Offers preset positions (corners, edges, center) and fullscreen option.
 *
 * Features:
 * - Collapsible interface to save space
 * - 3x3 grid layout for intuitive positioning
 * - One-click positioning presets
 * - Fullscreen/fill canvas option
 * - Automatically uses current aspect ratio from EditorContext
 *
 * @component
 */
export const PositionSettings = ({ overlayWidth, overlayHeight, overlayLeft, overlayTop, onPositionChange, }) => {
    const [isOpen, setIsOpen] = useState(false);
    const { getAspectRatioDimensions } = useEditorContext();
    // Default new overlays to fill canvas if no position is set yet
    useEffect(() => {
        const hasDimensions = typeof overlayWidth === 'number' && typeof overlayHeight === 'number';
        const hasPosition = typeof overlayLeft === 'number' && typeof overlayTop === 'number';
        if (!hasDimensions || !hasPosition) {
            const canvasDimensions = getAspectRatioDimensions();
            // CRITICAL: Use rounded dimensions to ensure integer pixels (prevents overflow for both 16:9 and 9:16)
            onPositionChange({
                left: 0,
                top: 0,
                width: Math.round(canvasDimensions.width),
                height: Math.round(canvasDimensions.height),
            });
        }
    }, [overlayWidth, overlayHeight, overlayLeft, overlayTop, getAspectRatioDimensions, onPositionChange]);
    /**
     * Determines which position preset matches the current overlay position
     */
    const getCurrentPositionPreset = () => {
        if (overlayLeft === undefined || overlayTop === undefined) {
            // Default to fill canvas when position not set yet
            return "fullscreen";
        }
        const canvasDimensions = getAspectRatioDimensions();
        const tolerance = 5; // Allow 5px tolerance for floating point calculations
        const canvasWidth = Math.round(canvasDimensions.width);
        const canvasHeight = Math.round(canvasDimensions.height);
        const centerLeft = (canvasWidth - overlayWidth) / 2;
        const centerTop = (canvasHeight - overlayHeight) / 2;
        const isCenteredHorizontally = Math.abs(overlayLeft - centerLeft) < tolerance;
        const isCenteredVertically = Math.abs(overlayTop - centerTop) < tolerance;
        const isAtTop = overlayTop < tolerance;
        const isAtBottom = Math.abs(overlayTop - (canvasHeight - overlayHeight)) < tolerance;
        const isAtLeft = overlayLeft < tolerance;
        const isAtRight = Math.abs(overlayLeft - (canvasWidth - overlayWidth)) < tolerance;
        // Check for fullscreen (fills entire canvas) - works for both 16:9 and 9:16
        // Use tolerance to handle floating point precision issues
        const isFullscreenWidth = Math.abs(overlayWidth - canvasWidth) < tolerance;
        const isFullscreenHeight = Math.abs(overlayHeight - canvasHeight) < tolerance;
        if (overlayLeft < tolerance && overlayTop < tolerance && isFullscreenWidth && isFullscreenHeight) {
            return "fullscreen";
        }
        // Check center position
        if (isCenteredHorizontally && isCenteredVertically) {
            return "center";
        }
        // Check other positions
        if (isAtTop && isAtLeft) return "top-left";
        if (isAtTop && isCenteredHorizontally) return "top-center";
        if (isAtTop && isAtRight) return "top-right";
        if (isCenteredVertically && isAtLeft) return "center-left";
        if (isCenteredVertically && isAtRight) return "center-right";
        if (isAtBottom && isAtLeft) return "bottom-left";
        if (isAtBottom && isCenteredHorizontally) return "bottom-center";
        if (isAtBottom && isAtRight) return "bottom-right";
        return null;
    };
    const currentPreset = getCurrentPositionPreset();
    /**
     * Handles positioning preset selection
     * Calculates new position and size based on canvas dimensions and selected preset
     */
    const handlePositionPreset = (preset) => {
        const canvasDimensions = getAspectRatioDimensions();
        // CRITICAL: Use rounded dimensions to ensure integer pixels (prevents overflow for both 16:9 and 9:16)
        const canvasWidth = Math.round(canvasDimensions.width);
        const canvasHeight = Math.round(canvasDimensions.height);
        let updates = {};
        switch (preset) {
            case "fullscreen":
                // Scale to fill entire canvas - works for both 16:9 and 9:16
                // CRITICAL: Use rounded dimensions to ensure integer pixels and prevent overflow
                updates = {
                    left: 0,
                    top: 0,
                    width: canvasWidth, // Integer pixels for 16:9 (1920) or 9:16 (1080)
                    height: canvasHeight, // Integer pixels for 16:9 (1080) or 9:16 (1920)
                };
                break;
            case "center":
                // Center in canvas
                updates = {
                    left: Math.round((canvasWidth - overlayWidth) / 2),
                    top: Math.round((canvasHeight - overlayHeight) / 2),
                };
                break;
            case "top-left":
                updates = {
                    left: 0,
                    top: 0,
                };
                break;
            case "top-center":
                updates = {
                    left: Math.round((canvasWidth - overlayWidth) / 2),
                    top: 0,
                };
                break;
            case "top-right":
                updates = {
                    left: Math.round(canvasWidth - overlayWidth),
                    top: 0,
                };
                break;
            case "center-left":
                updates = {
                    left: 0,
                    top: Math.round((canvasHeight - overlayHeight) / 2),
                };
                break;
            case "center-right":
                updates = {
                    left: Math.round(canvasWidth - overlayWidth),
                    top: Math.round((canvasHeight - overlayHeight) / 2),
                };
                break;
            case "bottom-left":
                updates = {
                    left: 0,
                    top: Math.round(canvasHeight - overlayHeight),
                };
                break;
            case "bottom-center":
                updates = {
                    left: Math.round((canvasWidth - overlayWidth) / 2),
                    top: Math.round(canvasHeight - overlayHeight),
                };
                break;
            case "bottom-right":
                updates = {
                    left: Math.round(canvasWidth - overlayWidth),
                    top: Math.round(canvasHeight - overlayHeight),
                };
                break;
        }
        onPositionChange(updates);
    };
    return (_jsx(Collapsible, { open: isOpen, onOpenChange: setIsOpen, className: "w-full", children: _jsxs("div", { className: "border rounded-md overflow-hidden bg-card", children: [_jsxs(CollapsibleTrigger, { className: "w-full flex justify-between items-center px-4 py-3 bg-card hover:bg-accent/50 duration-200 ease-out", children: [_jsx("div", { className: "flex items-center gap-2", children: _jsx("span", { className: "font-extralight text-xs text-foreground  ", children: "Position" }) }), _jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", className: `duration-200 ease-out text-foreground ${isOpen ? "rotate-180" : ""}`, children: _jsx("path", { d: "M4 6L8 10L12 6", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) })] }), _jsx(CollapsibleContent, { children: _jsxs("div", { className: "p-3 bg-card border-t", children: [_jsxs("div", { className: "grid grid-cols-3 gap-1 mb-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => handlePositionPreset("top-left"), className: "h-7 w-full p-0 flex items-center justify-center", title: "Top Left", children: _jsx(AlignHorizontalJustifyStart, { className: "h-3 w-3 rotate-90 text-foreground" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handlePositionPreset("top-center"), className: "h-7 w-full p-0 flex items-center justify-center", title: "Top Center", children: _jsx(AlignVerticalJustifyStart, { className: "h-3 w-3 text-foreground" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handlePositionPreset("top-right"), className: "h-7 w-full p-0 flex items-center justify-center", title: "Top Right", children: _jsx(AlignHorizontalJustifyEnd, { className: "h-3 w-3 rotate-90 text-foreground" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handlePositionPreset("center-left"), className: "h-7 w-full p-0 flex items-center justify-center", title: "Center Left", children: _jsx(AlignHorizontalJustifyStart, { className: "h-3 w-3 text-foreground " }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handlePositionPreset("center"), className: "h-7 w-full p-0 flex items-center justify-center", title: "Center", children: _jsx(SquareDot, { className: "h-3 w-3 text-foreground " }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handlePositionPreset("center-right"), className: "h-7 w-full p-0 flex items-center justify-center", title: "Center Right", children: _jsx(AlignHorizontalJustifyEnd, { className: "h-3 w-3 text-foreground" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handlePositionPreset("bottom-left"), className: "h-7 w-full p-0 flex items-center justify-center ", title: "Bottom Left", children: _jsx(AlignHorizontalJustifyStart, { className: "h-3 w-3 rotate-90 transform scale-y-[-1] text-foreground" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handlePositionPreset("bottom-center"), className: "h-7 w-full p-0 flex items-center justify-center", title: "Bottom Center", children: _jsx(AlignVerticalJustifyEnd, { className: "h-3 w-3 text-foreground" }) }), _jsx(Button, { variant: "ghost", size: "sm", onClick: () => handlePositionPreset("bottom-right"), className: "h-7 w-full p-0 flex items-center justify-center", title: "Bottom Right", children: _jsx(AlignHorizontalJustifyEnd, { className: "h-3 w-3 rotate-90 transform scale-y-[-1] text-foreground  " }) })] }), _jsx(Button, { variant: "outline", size: "sm", onClick: () => handlePositionPreset("fullscreen"), className: "h-7 w-full flex items-center justify-center gap-1.5", title: "Fill Canvas", children: _jsx("span", { className: "text-xs text-foreground", children: "Fill Canvas" }) })] }) })] }) }));
};
