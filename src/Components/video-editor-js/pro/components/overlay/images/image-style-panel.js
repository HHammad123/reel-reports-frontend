import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { MediaFilterPresetSelector } from "../common/media-filter-preset-selector";
import { MediaPaddingControls } from "../common/media-padding-controls";
import { Slider } from "../../ui/slider";
/**
 * ImageStylePanel Component
 *
 * A panel that allows users to adjust visual appearance settings for an image overlay.
 * Provides controls for various CSS filter properties to modify the image's appearance.
 *
 * Features:
 * - Filter presets (retro, vintage, noir, etc.)
 * - Brightness adjustment (0-200%)
 * - Padding and padding background controls
 * - Maintains existing filters while updating individual properties
 * - Real-time preview of adjustments
 *
 * Note: The filter string is managed as a space-separated list of CSS filter functions,
 * allowing multiple filters to be applied simultaneously.
 */
export const ImageStylePanel = ({ localOverlay, handleStyleChange, }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r;
    const layout3D = (_b = (_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _a === void 0 ? void 0 : _a.layout3D) !== null && _b !== void 0 ? _b : null;
    const hasNo3DLayout = !layout3D || layout3D.layout === "none";
    return (_jsx("div", {
        className: "space-y-6", children: _jsxs("div", {
            className: "space-y-4 rounded-md bg-card p-4 border", children: [_jsx("h3", { className: "text-sm font-extralight text-foreground", children: "Appearance" }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Fit" }), _jsxs("select", { value: (_d = (_c = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _c === void 0 ? void 0 : _c.objectFit) !== null && _d !== void 0 ? _d : "cover", onChange: (e) => handleStyleChange({ objectFit: e.target.value }), className: "w-full text-foreground bg-background border border-input rounded-md text-xs p-2 hover:border-accent-foreground transition-colors", children: [_jsx("option", { value: "cover", children: "Cover" }), _jsx("option", { value: "contain", children: "Contain" }), _jsx("option", { value: "fill", children: "Fill" })] })] }), _jsx(MediaFilterPresetSelector, { localOverlay: localOverlay, handleStyleChange: handleStyleChange }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Border Radius" }), _jsx("span", { className: "text-xs text-muted-foreground min-w-[40px] text-right", children: (_f = (_e = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _e === void 0 ? void 0 : _e.borderRadius) !== null && _f !== void 0 ? _f : "0px" })] }), _jsx("input", { type: "number", value: parseInt((_h = (_g = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _g === void 0 ? void 0 : _g.borderRadius) !== null && _h !== void 0 ? _h : "0"), onChange: (e) => handleStyleChange({ borderRadius: `${e.target.value}px` }), min: "0", className: "w-full text-foreground bg-background border border-input rounded-md text-xs p-2 hover:border-accent-foreground transition-colors" })] }), _jsxs("div", {
                className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Brightness" }), _jsxs("span", { className: "text-xs text-muted-foreground min-w-[40px] text-right", children: [parseInt((_m = (_l = (_k = (_j = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _j === void 0 ? void 0 : _j.filter) === null || _k === void 0 ? void 0 : _k.match(/brightness\((\d+)%\)/)) === null || _l === void 0 ? void 0 : _l[1]) !== null && _m !== void 0 ? _m : "100"), "%"] })] }), _jsx("div", {
                    className: "flex items-center gap-3", children: _jsx(Slider, {
                        value: [parseInt((_r = (_q = (_p = (_o = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _o === void 0 ? void 0 : _o.filter) === null || _p === void 0 ? void 0 : _p.match(/brightness\((\d+)%\)/)) === null || _q === void 0 ? void 0 : _q[1]) !== null && _r !== void 0 ? _r : "100")], onValueChange: (value) => {
                            var _a;
                            const currentFilterRaw = ((_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _a === void 0 ? void 0 : _a.filter) || "";
                            const baseFilter = currentFilterRaw === "none" ? "" : currentFilterRaw;
                            const cleaned = baseFilter.replace(/brightness\(\d+%\)/, "").trim();
                            const prefix = cleaned ? `${cleaned} ` : "";
                            const newFilter = `${prefix}brightness(${value[0]}%)`;
                            handleStyleChange({ filter: newFilter.trim() });
                        }, min: 0, max: 200, step: 10, className: "flex-1"
                    })
                })]
            }), hasNo3DLayout && (_jsx(MediaPaddingControls, { localOverlay: localOverlay, handleStyleChange: handleStyleChange }))]
        })
    }));
};
