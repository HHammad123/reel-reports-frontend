import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "../../ui/select";
import { Slider } from "../../ui/slider";
import { Toggle } from "../../ui/toggle";
import { AnimationSettings } from "../../shared/animation/animation-settings";
import { CropSettings } from "./crop-settings";
import { PositionSettings } from "../../shared/position/position-settings";
const SPEED_OPTIONS = [
    { value: 0.25, label: "0.25x" },
    { value: 0.5, label: "0.5x" },
    { value: 0.75, label: "0.75x" },
    { value: 1, label: "1x (Normal)" },
    { value: 1.25, label: "1.25x" },
    { value: 1.5, label: "1.5x" },
    { value: 1.75, label: "1.75x" },
    { value: 2, label: "2x" },
    { value: 3, label: "3x" },
    { value: 4, label: "4x" },
];
/**
 * VideoSettingsPanel Component
 *
 * A panel that provides controls for configuring video overlay settings including:
 * - Positioning controls for quick layout adjustments
 * - Volume control with mute/unmute functionality
 * - Playback speed control
 * - Enter/Exit animation selection
 *
 * The component uses a local overlay state and provides a UI for users to modify
 * video-specific settings. Changes are propagated through the handleStyleChange callback.
 *
 * @component
 * @param {VideoSettingsPanelProps} props - Component props
 * @returns {JSX.Element} The rendered settings panel
 */
export const VideoSettingsPanel = ({ localOverlay, handleStyleChange, onSpeedChange, onPositionChange, }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o;
    // Add state to control select open state
    const [isSelectOpen, setIsSelectOpen] = React.useState(false);
    // Cleanup effect for unmounting
    React.useEffect(() => {
        return () => {
            // Ensure select is closed when component unmounts
            setIsSelectOpen(false);
        };
    }, []);
    const handleSpeedChange = (newSpeed) => {
        var _a;
        if (localOverlay) {
            // Get the base duration (duration at 1x speed)
            const baseDuration = localOverlay.durationInFrames * ((_a = localOverlay.speed) !== null && _a !== void 0 ? _a : 1);
            // Calculate new duration based on new speed
            const newDuration = Math.round(baseDuration / newSpeed);
            if (onSpeedChange) {
                onSpeedChange(newSpeed, newDuration);
            }
            else {
                console.warn("onSpeedChange not provided, speed changes will not work. Please provide onSpeedChange prop to handle speed updates.");
            }
            // Close select after change
            setIsSelectOpen(false);
        }
    };
    // Handlers for animation selection
    const handleEnterAnimationSelect = (animationKey) => {
        var _a;
        handleStyleChange({
            animation: {
                ...(_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _a === void 0 ? void 0 : _a.animation,
                enter: animationKey === "none" ? "" : animationKey,
            },
        });
    };
    const handleExitAnimationSelect = (animationKey) => {
        var _a;
        handleStyleChange({
            animation: {
                ...(_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _a === void 0 ? void 0 : _a.animation,
                exit: animationKey === "none" ? "" : animationKey,
            },
        });
    };
    return (_jsxs("div", { className: "space-y-2", children: [_jsx(CropSettings, { localOverlay: localOverlay, handleStyleChange: handleStyleChange }), onPositionChange && (_jsx(PositionSettings, { overlayWidth: localOverlay.width, overlayHeight: localOverlay.height, overlayLeft: localOverlay.left, overlayTop: localOverlay.top, onPositionChange: onPositionChange })), _jsxs("div", { className: "space-y-2 rounded-md bg-card p-4 border", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("h3", { className: "text-xs font-extralight text-foreground", children: "Volume" }), _jsx(Toggle, { pressed: ((_b = (_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _a === void 0 ? void 0 : _a.volume) !== null && _b !== void 0 ? _b : 1) === 0, onPressedChange: (pressed) => handleStyleChange({
                                    volume: pressed ? 0 : 1,
                                }), size: "sm", className: "text-xs text-foreground   ", children: ((_d = (_c = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _c === void 0 ? void 0 : _c.volume) !== null && _d !== void 0 ? _d : 1) === 0 ? "Unmute" : "Mute" })] }), _jsxs("div", { className: "flex items-center gap-3 pt-1", children: [_jsx(Slider, { value: [(_f = (_e = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _e === void 0 ? void 0 : _e.volume) !== null && _f !== void 0 ? _f : 1], onValueChange: (value) => handleStyleChange({ volume: value[0] }), min: 0, max: 1, step: 0.1, className: "flex-1" }), _jsxs("span", { className: "text-xs min-w-[40px] text-right", children: [Math.round(((_h = (_g = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _g === void 0 ? void 0 : _g.volume) !== null && _h !== void 0 ? _h : 1) * 100), "%"] })] })] }), _jsxs("div", { className: "space-y-2 rounded-md bg-card p-4 border", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsx("h3", { className: "text-xs font-extralight text-foreground", children: "Playback Speed" }) }), _jsx("div", { className: "flex items-center gap-3 pt-1", children: _jsxs(Select, { open: isSelectOpen, onOpenChange: setIsSelectOpen, value: String((_j = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.speed) !== null && _j !== void 0 ? _j : 1), onValueChange: (value) => handleSpeedChange(parseFloat(value)), children: [_jsx(SelectTrigger, { className: "w-full font-extralight shadow-xs text-foreground", children: _jsx(SelectValue, { className: "text-foreground", placeholder: "Select speed" }) }), _jsx(SelectContent, { children: SPEED_OPTIONS.map((option) => (_jsx(SelectItem, { className: "font-extralight text-foreground", value: String(option.value), children: option.label }, option.value))) })] }) })] }), _jsx(AnimationSettings, { selectedEnterAnimation: ((_l = (_k = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _k === void 0 ? void 0 : _k.animation) === null || _l === void 0 ? void 0 : _l.enter) || "none", selectedExitAnimation: ((_o = (_m = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _m === void 0 ? void 0 : _m.animation) === null || _o === void 0 ? void 0 : _o.exit) || "none", onEnterAnimationSelect: handleEnterAnimationSelect, onExitAnimationSelect: handleExitAnimationSelect })] }));
};
