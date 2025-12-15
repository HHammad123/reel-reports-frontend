import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from "react";
import { ZoomOut, ZoomIn, Maximize } from "lucide-react";
import { ZOOM_CONSTRAINTS } from "../../constants";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../../ui/tooltip";
import { Slider } from "../../../ui/slider";
import { Button } from "../../../ui/button";
import { Separator } from "../../../ui/separator";
export const ZoomControls = ({ zoomScale, setZoomScale, zoomConstraints = ZOOM_CONSTRAINTS, // Use default if not provided
 }) => {
    const handleSliderChange = useCallback((value) => {
        setZoomScale(value[0] / 100);
    }, [setZoomScale]);
    const handleZoomOut = () => {
        const newScale = Math.max(zoomConstraints.min, zoomScale - zoomConstraints.step);
        setZoomScale(newScale);
    };
    const handleZoomIn = () => {
        const newScale = Math.min(zoomConstraints.max, zoomScale + zoomConstraints.step);
        setZoomScale(newScale);
    };
    const handleZoomReset = () => {
        setZoomScale(zoomConstraints.default);
    };
    return (_jsxs("div", { className: "flex items-center gap-1 w-full sm:w-48 z-50", children: [_jsx(TooltipProvider, { delayDuration: 50, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { onClick: handleZoomOut, variant: "ghost", size: "icon", className: "h-8 w-8 sm:h-6 sm:w-6 text-(--text-secondary) hover:bg-(--interactive-hover)", disabled: zoomScale <= zoomConstraints.min, onTouchStart: (e) => e.preventDefault(), style: { WebkitTapHighlightColor: 'transparent' }, children: _jsx(ZoomOut, { className: "h-4 w-4 sm:h-3.5 sm:w-3.5" }) }) }), _jsx(TooltipContent, { side: "top", sideOffset: 5, className: "bg-(--surface-elevated) text-xs px-2 py-1 rounded-md z-9999 border border-(--border)", align: "center", children: _jsx("span", { className: "text-(--text-primary)", children: "Zoom Out" }) })] }) }), _jsx(Slider, { value: [zoomScale * 100], onValueChange: handleSliderChange, min: zoomConstraints.min * 100, max: zoomConstraints.max * 100, step: zoomConstraints.step * 100, className: "hidden sm:flex flex-1 mx-2 hover:cursor-pointer", "aria-label": "Timeline Zoom" }), _jsx(TooltipProvider, { delayDuration: 50, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { onClick: handleZoomIn, variant: "ghost", size: "icon", className: "h-8 w-8 sm:h-6 sm:w-6 text-(--text-secondary) hover:bg-(--interactive-hover)", disabled: zoomScale >= zoomConstraints.max, onTouchStart: (e) => e.preventDefault(), style: { WebkitTapHighlightColor: 'transparent' }, children: _jsx(ZoomIn, { className: "h-4 w-4 sm:h-3.5 sm:w-3.5" }) }) }), _jsx(TooltipContent, { side: "top", sideOffset: 5, className: "bg-(--surface-elevated) text-xs px-2 py-1 rounded-md z-9999 border border-(--border)", align: "center", children: _jsx("span", { className: "text-(--text-primary)", children: "Zoom In" }) })] }) }), _jsx(Separator, { orientation: "vertical", className: "hidden sm:block h-4 mx-2" }), _jsx(TooltipProvider, { delayDuration: 50, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { onClick: handleZoomReset, variant: "ghost", size: "icon", className: "h-8 w-8 sm:h-6 sm:w-6 text-(--text-secondary) hover:bg-(--interactive-hover)", disabled: zoomScale === zoomConstraints.default, onTouchStart: (e) => e.preventDefault(), style: { WebkitTapHighlightColor: 'transparent' }, children: _jsx(Maximize, { className: "h-4 w-4 sm:h-3.5 sm:w-3.5" }) }) }), _jsx(TooltipContent, { side: "top", sideOffset: 5, className: "bg-(--surface-elevated) text-xs px-2 py-1 rounded-md z-9999 border border-(--border)", align: "center", children: _jsx("span", { className: "text-(--text-primary)", children: "Reset Zoom" }) })] }) })] }));
};
