import { jsx as _jsx } from "react/jsx-runtime";
import { AnimationSettings } from "../../shared/animation/animation-settings";
/**
 * Panel component for managing text overlay animation settings
 * Allows users to select enter and exit animations for text overlays
 *
 * @component
 * @param {TextSettingsPanelProps} props - Component props
 * @returns {JSX.Element} A panel with animation selection options
 */
export const TextSettingsPanel = ({ localOverlay, handleStyleChange, }) => {
    var _a, _b;
    // Handlers for animation selection
    const handleEnterAnimationSelect = (animationKey) => {
        handleStyleChange("animation", {
            ...localOverlay.styles.animation,
            enter: animationKey === "none" ? "" : animationKey,
        });
    };
    const handleExitAnimationSelect = (animationKey) => {
        handleStyleChange("animation", {
            ...localOverlay.styles.animation,
            exit: animationKey === "none" ? "" : animationKey,
        });
    };
    return (_jsx(AnimationSettings, { selectedEnterAnimation: ((_a = localOverlay.styles.animation) === null || _a === void 0 ? void 0 : _a.enter) || "none", selectedExitAnimation: ((_b = localOverlay.styles.animation) === null || _b === void 0 ? void 0 : _b.exit) || "none", onEnterAnimationSelect: handleEnterAnimationSelect, onExitAnimationSelect: handleExitAnimationSelect }));
};
