import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Slider } from "../../ui/slider";
import { Button } from "../../ui/button";
import ColorPicker from "react-best-gradient-color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
/**
 * MediaPaddingControls Component
 *
 * A reusable component for controlling padding and padding background color
 * for both video and image overlays.
 *
 * @component
 * @param {MediaPaddingControlsProps} props - Component props
 * @returns {JSX.Element} UI controls for padding and padding background
 */
export const MediaPaddingControls = ({ localOverlay, handleStyleChange, }) => {
    var _a, _b;
    // Extract current padding value or set default
    const paddingValue = ((_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _a === void 0 ? void 0 : _a.padding) || "0px";
    const paddingMatch = paddingValue.match(/^(\d+)px$/);
    const numericPadding = paddingMatch ? parseInt(paddingMatch[1], 10) : 0;
    // Extract current padding background color or set default
    const paddingBackgroundColor = ((_b = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _b === void 0 ? void 0 : _b.paddingBackgroundColor) || "white";
    return (_jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs text-foreground font-extralight", children: "Padding" }), _jsx("span", { className: "text-xs min-w-[40px] text-right", children: paddingValue })] }), _jsx(Slider, { value: [numericPadding], onValueChange: (value) => handleStyleChange({ padding: `${value[0]}px` }), min: 0, max: 100, step: 5, className: "w-full" })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs text-foreground font-extralight", children: "Padding Background" }), _jsxs("div", { className: "flex items-center gap-2", children: [_jsx("div", { className: "space-y-2", children: _jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx("div", { className: "h-8 w-8 rounded-md border cursor-pointer", style: { backgroundColor: paddingBackgroundColor } }) }), _jsx(PopoverContent, { className: "w-[330px] bg-card", side: "right", children: _jsx(ColorPicker, { value: paddingBackgroundColor, onChange: (color) => handleStyleChange({ paddingBackgroundColor: color }), 
                                                // hideInputs
                                                hideHue: true, hideControls: true, hideColorTypeBtns: true, hideAdvancedSliders: true, hideColorGuide: true, hideInputType: true, height: 200 }) })] }) }), _jsx("input", { type: "text", value: paddingBackgroundColor, onChange: (e) => handleStyleChange({ paddingBackgroundColor: e.target.value }), placeholder: "white", className: "flex-1 bg-background border rounded-md text-xs p-2 hover:border transition-colors text-primary" }), paddingBackgroundColor !== "white" && (_jsx(Button, { onClick: () => handleStyleChange({ paddingBackgroundColor: "white" }), variant: "ghost", size: "sm", children: "Clear" }))] })] })] }));
};
