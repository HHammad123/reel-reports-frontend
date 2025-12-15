import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { Sparkles } from "lucide-react";
import { useEditorContext } from "../../../contexts/editor-context";
import { Slider } from "../../ui/slider";
import { Switch } from "../../ui/switch";
/**
 * ImageAIPanel Component
 *
 * A panel that provides AI-powered actions for image overlays. Currently includes:
 * - Remove green screen background
 *
 * Future AI features could include:
 * - Auto background removal (any color)
 * - Object detection and isolation
 * - Image enhancement
 * - Smart cropping
 *
 * @component
 * @param {ImageAIPanelProps} props - Component props
 * @returns {JSX.Element} The rendered AI panel
 */
export const ImageAIPanel = ({ localOverlay, }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    const { changeOverlay } = useEditorContext();
    // Initialize greenscreen state from overlay
    const [greenscreenEnabled, setGreenscreenEnabled] = useState((_b = (_a = localOverlay.greenscreen) === null || _a === void 0 ? void 0 : _a.enabled) !== null && _b !== void 0 ? _b : false);
    const [greenscreenSensitivity, setGreenscreenSensitivity] = useState((_d = (_c = localOverlay.greenscreen) === null || _c === void 0 ? void 0 : _c.sensitivity) !== null && _d !== void 0 ? _d : 100);
    const [redThreshold, setRedThreshold] = useState((_g = (_f = (_e = localOverlay.greenscreen) === null || _e === void 0 ? void 0 : _e.threshold) === null || _f === void 0 ? void 0 : _f.red) !== null && _g !== void 0 ? _g : 100);
    const [greenMin, setGreenMin] = useState((_k = (_j = (_h = localOverlay.greenscreen) === null || _h === void 0 ? void 0 : _h.threshold) === null || _j === void 0 ? void 0 : _j.green) !== null && _k !== void 0 ? _k : 100);
    const [blueThreshold, setBlueThreshold] = useState((_o = (_m = (_l = localOverlay.greenscreen) === null || _l === void 0 ? void 0 : _l.threshold) === null || _m === void 0 ? void 0 : _m.blue) !== null && _o !== void 0 ? _o : 100);
    const [smoothing, setSmoothing] = useState((_q = (_p = localOverlay.greenscreen) === null || _p === void 0 ? void 0 : _p.smoothing) !== null && _q !== void 0 ? _q : 0);
    const [spill, setSpill] = useState((_s = (_r = localOverlay.greenscreen) === null || _r === void 0 ? void 0 : _r.spill) !== null && _s !== void 0 ? _s : 0);
    // Update overlay greenscreen settings
    const updateGreenscreen = (updates) => {
        const newGreenscreen = {
            enabled: greenscreenEnabled,
            sensitivity: greenscreenSensitivity,
            threshold: {
                red: redThreshold,
                green: greenMin,
                blue: blueThreshold,
            },
            smoothing,
            spill,
            ...updates,
        };
        changeOverlay(localOverlay.id, (overlay) => ({
            ...overlay,
            greenscreen: newGreenscreen,
        }));
    };
    const handleGreenscreenToggle = (checked) => {
        setGreenscreenEnabled(checked);
        updateGreenscreen({ enabled: checked });
    };
    const handleSensitivityChange = (value) => {
        setGreenscreenSensitivity(value[0]);
        updateGreenscreen({ sensitivity: value[0] });
    };
    const handleRedThresholdChange = (value) => {
        setRedThreshold(value[0]);
        updateGreenscreen({
            threshold: { red: value[0], green: greenMin, blue: blueThreshold },
        });
    };
    const handleGreenMinChange = (value) => {
        setGreenMin(value[0]);
        updateGreenscreen({
            threshold: { red: redThreshold, green: value[0], blue: blueThreshold },
        });
    };
    const handleBlueThresholdChange = (value) => {
        setBlueThreshold(value[0]);
        updateGreenscreen({
            threshold: { red: redThreshold, green: greenMin, blue: value[0] },
        });
    };
    const handleSmoothingChange = (value) => {
        setSmoothing(value[0]);
        updateGreenscreen({ smoothing: value[0] });
    };
    const handleSpillChange = (value) => {
        setSpill(value[0]);
        updateGreenscreen({ spill: value[0] });
    };
    return (_jsx("div", { className: "space-y-4", children: _jsx("div", { className: "rounded-lg border bg-card transition-all duration-200 hover:bg-accent/50 hover:border-primary/30", children: _jsx("div", { className: "p-4", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h4", { className: "text-sm font-extralight text-foreground flex items-center gap-2", children: [_jsx(Sparkles, { className: "w-4 h-4" }), "Green Screen Removal"] }), _jsx("p", { className: "text-xs text-muted-foreground leading-relaxed font-extralight", children: "Remove green screen background from your image" })] }), _jsx(Switch, { checked: greenscreenEnabled, onCheckedChange: handleGreenscreenToggle })] }), greenscreenEnabled && (_jsxs("div", { className: "space-y-3 pt-2 border-t", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight", children: "Sensitivity" }), _jsx("span", { className: "text-xs min-w-[40px] text-right", children: greenscreenSensitivity })] }), _jsx(Slider, { value: [greenscreenSensitivity], onValueChange: handleSensitivityChange, min: 0, max: 255, step: 5, className: "w-full" }), _jsx("p", { className: "text-xs text-muted-foreground font-extralight", children: "Higher values remove more green" })] }), _jsxs("details", { className: "space-y-2", children: [_jsx("summary", { className: "text-xs font-extralight cursor-pointer hover:text-foreground", children: "Advanced Settings" }), _jsxs("div", { className: "space-y-3 pt-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight", children: "Red Threshold" }), _jsx("span", { className: "text-xs min-w-[40px] text-right", children: redThreshold })] }), _jsx(Slider, { value: [redThreshold], onValueChange: handleRedThresholdChange, min: 0, max: 255, step: 5, className: "w-full" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight", children: "Green Minimum" }), _jsx("span", { className: "text-xs min-w-[40px] text-right", children: greenMin })] }), _jsx(Slider, { value: [greenMin], onValueChange: handleGreenMinChange, min: 0, max: 255, step: 5, className: "w-full" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight", children: "Blue Threshold" }), _jsx("span", { className: "text-xs min-w-[40px] text-right", children: blueThreshold })] }), _jsx(Slider, { value: [blueThreshold], onValueChange: handleBlueThresholdChange, min: 0, max: 255, step: 5, className: "w-full" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight", children: "Edge Smoothing" }), _jsx("span", { className: "text-xs min-w-[40px] text-right", children: smoothing })] }), _jsx(Slider, { value: [smoothing], onValueChange: handleSmoothingChange, min: 0, max: 10, step: 1, className: "w-full" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight", children: "Spill Removal" }), _jsx("span", { className: "text-xs min-w-[40px] text-right", children: spill.toFixed(2) })] }), _jsx(Slider, { value: [spill * 100], onValueChange: (value) => handleSpillChange([value[0] / 100]), min: 0, max: 100, step: 5, className: "w-full" }), _jsx("p", { className: "text-xs text-muted-foreground font-extralight", children: "Remove green tint from edges" })] })] })] })] }))] }) }) }) }));
};
