import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MediaFilterPresetSelector } from "../common/media-filter-preset-selector";
import { MediaPaddingControls } from "../common/media-padding-controls";
import { Slider } from "../../ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "../../ui/select";
import ColorPicker from "react-best-gradient-color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Button } from "../../ui/button";
/**
 * VideoStylePanel Component
 *
 * A panel that provides controls for styling video overlays. It allows users to adjust:
 * - Object fit (cover, contain, fill)
 * - Border radius
 * - Brightness
 * - Filter presets (retro, vintage, Wes Anderson, etc.)
 * - Padding and padding background color
 *
 * The component uses a local overlay state and propagates changes through the handleStyleChange callback.
 * All style controls maintain both light and dark theme compatibility.
 *
 * @component
 * @param {VideoStylePanelProps} props - Component props
 * @returns {JSX.Element} A styled form containing video appearance controls
 */
export const VideoStylePanel = ({ localOverlay, handleStyleChange, }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q;
    // Get current background color or default to white
    const backgroundColor = ((_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _a === void 0 ? void 0 : _a.backgroundColor) || "white";
    const objectFitValue = ((_c = (_b = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _b === void 0 ? void 0 : _b.objectFit) !== null && _c !== void 0 ? _c : "cover");
    const borderRadiusValue = (_e = (_d = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _d === void 0 ? void 0 : _d.borderRadius) !== null && _e !== void 0 ? _e : "0px";
    const borderRadiusNumeric = parseInt((_g = (_f = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _f === void 0 ? void 0 : _f.borderRadius) !== null && _g !== void 0 ? _g : "0");
    const filterValue = ((_h = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _h === void 0 ? void 0 : _h.filter) || "";
    const brightnessMatch = typeof filterValue === "string" ? filterValue.match(/brightness\((\d+)%\)/) : null;
    const brightnessValue = parseInt((_m = (_l = (_j = brightnessMatch) === null || _j === void 0 ? void 0 : _j[1]) !== null && _l !== void 0 ? _l : "100"));
    return (_jsx("div", { className: "space-y-2", children: _jsxs("div", { className: "space-y-4 rounded-md bg-card p-4 border", children: [
        _jsx("h3", { className: "text-sm font-extralight text-foreground", children: "Appearance" }),
        _jsxs("div", { className: "space-y-4", children: [
            _jsxs("div", { className: "space-y-2", children: [
                _jsx("label", { className: "text-xs font-extralight", children: "Fit" }),
                _jsxs(Select, { value: objectFitValue, onValueChange: (value) => handleStyleChange({ objectFit: value }), children: [
                    _jsx(SelectTrigger, { className: "w-full font-extralight bg-white shadow-none", children: _jsx(SelectValue, { placeholder: "Select fit" }) }),
                    _jsxs(SelectContent, { children: [
                        _jsx(SelectItem, { value: "cover", children: "Cover" }),
                        _jsx(SelectItem, { value: "contain", children: "Contain" }),
                        _jsx(SelectItem, { value: "fill", children: "Fill" })
                    ] })
                ] })
            ]}),
            _jsxs("div", { className: "space-y-2", children: [
                _jsx("label", { className: "text-xs font-extralight", children: "Background Color" }),
                _jsxs("div", { className: "flex items-center gap-2", children: [
                    _jsxs(Popover, { children: [
                        _jsx(PopoverTrigger, { asChild: true, children: _jsx("div", { className: "h-8 w-8 rounded-md border border-border cursor-pointer flex-shrink-0", style: { backgroundColor: backgroundColor } }) }),
                        _jsx(PopoverContent, { className: "w-[330px] bg-card p-4", side: "right", children: _jsx(ColorPicker, { value: backgroundColor, onChange: (color) => handleStyleChange({ backgroundColor: color }), hideHue: true, hideControls: true, hideColorTypeBtns: true, hideAdvancedSliders: true, hideColorGuide: true, hideInputType: true, height: 200 }) })
                    ]}),
                    _jsx("input", { type: "text", value: backgroundColor, onChange: (e) => handleStyleChange({ backgroundColor: e.target.value }), placeholder: "white", className: "flex-1 bg-background border rounded-md text-xs p-2 hover:border transition-colors text-primary font-extralight" }),
                    backgroundColor !== "white" && (_jsx(Button, { onClick: () => handleStyleChange({ backgroundColor: "white" }), variant: "ghost", size: "sm", className: "flex-shrink-0", children: "Reset" }))
                ]})
            ]}),
            _jsx(MediaFilterPresetSelector, { localOverlay: localOverlay, handleStyleChange: handleStyleChange }),
            _jsxs("div", { className: "space-y-2", children: [
                _jsxs("div", { className: "flex items-center justify-between", children: [
                    _jsx("label", { className: "text-xs font-extralight", children: "Border Radius" }),
                    _jsx("span", { className: "text-xs min-w-[40px] text-right", children: borderRadiusValue })
                ]}),
                _jsx("div", { className: "flex items-center gap-3", children: _jsx(Slider, { value: [borderRadiusNumeric], onValueChange: (value) => handleStyleChange({ borderRadius: `${value[0]}px` }), min: 0, max: 50, step: 1, className: "flex-1" }) })
            ]}),
            _jsxs("div", { className: "space-y-2", children: [
                _jsxs("div", { className: "flex items-center justify-between", children: [
                    _jsx("label", { className: "text-xs font-extralight", children: "Brightness" }),
                    _jsxs("span", { className: "text-xs min-w-[40px] text-right", children: [brightnessValue, "%"] })
                ]}),
                _jsx("div", { className: "flex items-center gap-3", children: _jsx(Slider, { value: [brightnessValue], onValueChange: (value) => {
                    var _a;
                    const currentFilter = ((_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _a === void 0 ? void 0 : _a.filter) || "";
                    const newFilter = currentFilter.replace(/brightness\(\d+%\)/, "") + ` brightness(${value[0]}%)`;
                    handleStyleChange({ filter: newFilter.trim() });
                }, min: 0, max: 200, step: 10, className: "flex-1" }) })
            ]}),
            _jsx(MediaPaddingControls, { localOverlay: localOverlay, handleStyleChange: handleStyleChange })
        ]})
    ]})}));
};