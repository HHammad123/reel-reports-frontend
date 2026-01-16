import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { captionTemplates } from "../../../templates/caption-templates";
import { Slider } from "../../ui/slider";
import { Input } from "../../ui/input";
import { RotateCcw } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/tooltip";
/**
 * CaptionStylePanel Component
 *
 * @component
 * @description
 * Provides a visual interface for selecting and customizing caption styles.
 * Features include:
 * - Pre-defined style templates
 * - Live preview of styles
 * - Color palette visualization
 * - Active state indication
 * - Font size customization
 *
 * Each template includes:
 * - Preview text with highlight example
 * - Template name and status
 * - Color scheme visualization
 *
 * @example
 * ```tsx
 * <CaptionStylePanel
 *   localOverlay={captionOverlay}
 *   setLocalOverlay={handleStyleUpdate}
 * />
 * ```
 */
export const CaptionStylePanel = ({ localOverlay, setLocalOverlay, }) => {
    // Get current font size from styles
    const currentFontSize = localOverlay?.styles?.fontSize 
        ? parseFloat(String(localOverlay.styles.fontSize).replace('px', '')) 
        : 24; // Default font size
    
    const handleFontSizeChange = (newSize) => {
        const updatedOverlay = {
            ...localOverlay,
            styles: {
                ...localOverlay?.styles,
                fontSize: `${newSize}px`
            }
        };
        setLocalOverlay(updatedOverlay);
    };
    
    const resetFontSize = () => {
        // Reset to default font size from template or 24px
        const templateId = localOverlay?.template || 'classic';
        const template = captionTemplates[templateId];
        const defaultSize = template?.styles?.fontSize 
            ? parseFloat(String(template.styles.fontSize).replace('px', ''))
            : 24;
        handleFontSizeChange(defaultSize);
    };
    
    const showFontSizeReset = currentFontSize !== 24; // Check if different from default
    
    return (_jsxs("div", { className: "space-y-4", children: [
        // Font Size Control Section
        _jsxs("div", { className: "space-y-2", children: [
            _jsxs("div", { className: "flex items-center justify-between", children: [
                _jsx("label", { className: "text-xs text-muted-foreground/50 py-1", children: "Font Size" }),
                showFontSizeReset && _jsxs(TooltipProvider, { children: [
                    _jsx(Tooltip, { children: [
                        _jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: resetFontSize, className: "text-xs px-2 py-1.5 rounded-md transition-colors bg-secondary hover:bg-secondary/80 text-secondary-foreground", children: _jsx(RotateCcw, { className: "h-3 w-3" }) }) }),
                        _jsx(TooltipContent, { side: "top", children: "Reset font size" })
                    ] })
                ] })
            ] }),
            _jsx(Slider, { value: [currentFontSize], onValueChange: (value) => handleFontSizeChange(value[0]), min: 12, max: 72, step: 1, className: "w-full" }),
            _jsxs("div", { className: "flex items-center gap-2", children: [
                _jsx(Input, { type: "number", min: 12, max: 72, step: 1, value: currentFontSize, onChange: (e) => {
                    const newSize = Math.max(12, Math.min(72, parseInt(e.target.value) || 24));
                    handleFontSizeChange(newSize);
                }, className: "w-20 h-8 text-xs" }),
                _jsx("span", { className: "text-xs text-muted-foreground", children: "px" })
            ] })
        ] }),
        // Template Selection Section
        _jsx("div", { className: "space-y-3", children: _jsx("div", { className: "grid grid-cols-1 gap-3", children: Object.entries(captionTemplates).map(([templateId, template]) => {
                var _a, _b;
                const isActive = (localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.template) === templateId;
                const highlightColor = (_b = template.styles.highlightStyle) === null || _b === void 0 ? void 0 : _b.backgroundColor;
                const colorIndicators = [
                    _jsx("div", { key: "white", className: "w-3 h-3 rounded-full border border-white/30", style: { backgroundColor: "#FFFFFF" } })
                ];
                if (highlightColor) {
                    colorIndicators.push(_jsx("div", { key: "highlight", className: `w-3 h-3 rounded-full border border-white/30 ${isActive ? "ring-2 ring-primary ring-offset-1" : ""}`, style: { backgroundColor: highlightColor } }));
                }
                return (_jsxs("button", { key: templateId, onClick: () => {
                        // Preserve current font size if it was customized
                        const currentSize = localOverlay?.styles?.fontSize;
                        const updatedStyles = {
                            ...template.styles,
                            ...(currentSize && currentSize !== template.styles.fontSize ? { fontSize: currentSize } : {}),
                            zIndex: (localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) && typeof localOverlay.styles.zIndex === "number"
                                ? localOverlay.styles.zIndex
                                : (((_a = template.styles) === null || _a === void 0 ? void 0 : _a.zIndex) !== undefined ? template.styles.zIndex : 300)
                        };
                        const updatedOverlay = {
                            ...localOverlay,
                            template: templateId,
                            styles: updatedStyles,
                        };
                        setLocalOverlay(updatedOverlay);
                    }, className: `group relative overflow-hidden flex flex-col rounded-lg transition-all duration-200 border w-[300px]
              ${isActive
                        ? "border-primary border-2"
                        : "border-gray-300 hover:border-gray-400"}`, children: [_jsx("div", { className: "relative w-full overflow-hidden rounded-t-lg", style: {
                            backgroundColor: "#eee",
                            minHeight: "120px",
                            padding: "40px 20px"
                        }, children: _jsx("div", { className: "flex items-center justify-center", children: _jsxs("span", { style: {
                                        ...template.styles,
                                        fontSize: "1.1rem",
                                        lineHeight: "1.4",
                                        color: "#FFFFFF",
                                    }, children: ["Let's ", _jsx("span", { style: {
                                                ...template.styles.highlightStyle,
                                                transform: `scale(${((_a = template.styles.highlightStyle) === null || _a === void 0 ? void 0 : _a.scale) || 1})`,
                                                display: "inline-block",
                                            }, children: "start" }), " with a demo of your caption."] }) }) }), _jsxs("div", { className: "flex items-center justify-between px-4 py-3 rounded-b-lg bg-white", style: {
                            backgroundColor: "#eee",
                            borderTop: "1px solid var(--primary)"
                        }, children: [_jsx("span", { className: "text-sm font-medium text-white", children: template.name }), _jsx("div", { className: "flex items-center gap-2", children: colorIndicators })] })] }));
            }) }) })
    ] }));
};
