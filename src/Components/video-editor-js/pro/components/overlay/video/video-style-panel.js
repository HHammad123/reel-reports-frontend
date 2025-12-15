import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MediaFilterPresetSelector } from "../common/media-filter-preset-selector";
import { MediaPaddingControls } from "../common/media-padding-controls";
import { Slider } from "../../ui/slider";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "../../ui/select";
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
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p;
    return (_jsx("div", { className: "space-y-2", children: _jsxs("div", { className: "space-y-4 rounded-md bg-card p-4 border", children: [_jsx("h3", { className: "text-sm font-extralight text-foreground", children: "Appearance" }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs font-extralight", children: "Fit" }), _jsxs(Select, { value: (_b = (_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _a === void 0 ? void 0 : _a.objectFit) !== null && _b !== void 0 ? _b : "cover", onValueChange: (value) => handleStyleChange({ objectFit: value }), children: [_jsx(SelectTrigger, { className: "w-full font-extralight shadow-none", children: _jsx(SelectValue, { placeholder: "Select fit" }) }), _jsxs(SelectContent, { children: [_jsx(SelectItem, { value: "cover", children: "Cover" }), _jsx(SelectItem, { value: "contain", children: "Contain" }), _jsx(SelectItem, { value: "fill", children: "Fill" })] })] })] }), _jsx(MediaFilterPresetSelector, { localOverlay: localOverlay, handleStyleChange: handleStyleChange }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight", children: "Border Radius" }), _jsx("span", { className: "text-xs min-w-[40px] text-right", children: (_d = (_c = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _c === void 0 ? void 0 : _c.borderRadius) !== null && _d !== void 0 ? _d : "0px" })] }), _jsx("div", { className: "flex items-center gap-3", children: _jsx(Slider, { value: [
                                    parseInt((_f = (_e = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _e === void 0 ? void 0 : _e.borderRadius) !== null && _f !== void 0 ? _f : "0")
                                ], onValueChange: (value) => handleStyleChange({ borderRadius: `${value[0]}px` }), min: 0, max: 50, step: 1, className: "flex-1" }) })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight", children: "Brightness" }), _jsxs("span", { className: "text-xs min-w-[40px] text-right", children: [parseInt((_k = (_j = (_h = (_g = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _g === void 0 ? void 0 : _g.filter) === null || _h === void 0 ? void 0 : _h.match(/brightness\((\d+)%\)/)) === null || _j === void 0 ? void 0 : _j[1]) !== null && _k !== void 0 ? _k : "100"), "%"] })] }), _jsx("div", { className: "flex items-center gap-3", children: _jsx(Slider, { value: [
                                    parseInt((_p = (_o = (_m = (_l = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _l === void 0 ? void 0 : _l.filter) === null || _m === void 0 ? void 0 : _m.match(/brightness\((\d+)%\)/)) === null || _o === void 0 ? void 0 : _o[1]) !== null && _p !== void 0 ? _p : "100"),
                                ], onValueChange: (value) => {
                                    var _a;
                                    const currentFilter = ((_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _a === void 0 ? void 0 : _a.filter) || "";
                                    const newFilter = currentFilter.replace(/brightness\(\d+%\)/, "") +
                                        ` brightness(${value[0]}%)`;
                                    handleStyleChange({ filter: newFilter.trim() });
                                }, min: 0, max: 200, step: 10, className: "flex-1" }) })] }), _jsx(MediaPaddingControls, { localOverlay: localOverlay, handleStyleChange: handleStyleChange })] }) }));
};
