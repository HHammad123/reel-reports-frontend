import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from "react";
import { AnimationSettings } from "../../shared/animation/animation-settings";
import { VisualLayoutSettings } from "../../shared/visual-layout/visual-layout-settings";
import { CropSettings } from "../video/crop-settings";
import { PositionSettings } from "../../shared/position/position-settings";
/**
 * ImageSettingsPanel Component
 *
 * A panel that allows users to configure crop, animation and 3D layout settings for an image overlay.
 * Provides options to set both enter and exit animations from a predefined set
 * of animation templates, as well as 3D layout transformations.
 *
 * Features:
 * - Positioning controls for quick layout adjustments
 * - Crop settings with aspect ratio presets
 * - Enter animation selection
 * - Exit animation selection
 * - 3D layout transformation selection
 * - Option to remove animations and 3D effects ("None" selection)
 */
export const ImageSettingsPanel = ({ localOverlay, handleStyleChange, onPositionChange, }) => {
    var _a, _b, _c;
    // Memoize handlers to prevent infinite loops
    const handleEnterAnimationSelect = useCallback((animationKey) => {
        // Only update if the value actually changed
        const currentEnter = ((_a = localOverlay.styles.animation) === null || _a === void 0 ? void 0 : _a.enter) || "";
        const newEnter = animationKey === "none" ? "" : animationKey;
        if (currentEnter !== newEnter) {
            handleStyleChange({
                animation: {
                    ...localOverlay.styles.animation,
                    enter: newEnter,
                },
            });
        }
    }, [localOverlay.styles.animation, handleStyleChange]);
    
    const handleExitAnimationSelect = useCallback((animationKey) => {
        // Only update if the value actually changed
        const currentExit = ((_b = localOverlay.styles.animation) === null || _b === void 0 ? void 0 : _b.exit) || "";
        const newExit = animationKey === "none" ? "" : animationKey;
        if (currentExit !== newExit) {
            handleStyleChange({
                animation: {
                    ...localOverlay.styles.animation,
                    exit: newExit,
                },
            });
        }
    }, [localOverlay.styles.animation, handleStyleChange]);
    
    const handleLayout3DSelect = useCallback((layoutKey) => {
        const currentLayout = ((_c = localOverlay.styles.layout3D) === null || _c === void 0 ? void 0 : _c.layout) || "";
        const newLayout = layoutKey === "none" ? "" : layoutKey;
        // Only update if the value actually changed
        if (currentLayout !== newLayout) {
            const updates = {
                layout3D: {
                    layout: newLayout,
                },
            };
            // Clear padding when applying a 3D layout effect
            if (layoutKey !== "none") {
                updates.padding = "0px";
                updates.paddingBackgroundColor = "white";
            }
            handleStyleChange(updates);
        }
    }, [localOverlay.styles.layout3D, handleStyleChange]);
    
    // Memoize animation values to prevent unnecessary re-renders
    const selectedEnterAnimation = useMemo(() => {
        return ((_a = localOverlay.styles.animation) === null || _a === void 0 ? void 0 : _a.enter) || "none";
    }, [localOverlay.styles.animation]);
    
    const selectedExitAnimation = useMemo(() => {
        return ((_b = localOverlay.styles.animation) === null || _b === void 0 ? void 0 : _b.exit) || "none";
    }, [localOverlay.styles.animation]);
    
    const selectedLayout = useMemo(() => {
        return ((_c = localOverlay.styles.layout3D) === null || _c === void 0 ? void 0 : _c.layout) || "none";
    }, [localOverlay.styles.layout3D]);
    
    return (_jsxs("div", { className: "space-y-2", children: [_jsx(CropSettings, { localOverlay: localOverlay, handleStyleChange: handleStyleChange }), onPositionChange && (_jsx(PositionSettings, { overlayWidth: localOverlay.width, overlayHeight: localOverlay.height, onPositionChange: onPositionChange })), _jsx(AnimationSettings, { selectedEnterAnimation: selectedEnterAnimation, selectedExitAnimation: selectedExitAnimation, onEnterAnimationSelect: handleEnterAnimationSelect, onExitAnimationSelect: handleExitAnimationSelect }), _jsx(VisualLayoutSettings, { selectedLayout: selectedLayout, onLayoutSelect: handleLayout3DSelect })] }));
};
