import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    // Handlers for animation selection
    const handleEnterAnimationSelect = (animationKey) => {
        handleStyleChange({
            animation: {
                ...localOverlay.styles.animation,
                enter: animationKey === "none" ? "" : animationKey,
            },
        });
    };
    const handleExitAnimationSelect = (animationKey) => {
        handleStyleChange({
            animation: {
                ...localOverlay.styles.animation,
                exit: animationKey === "none" ? "" : animationKey,
            },
        });
    };
    const handleLayout3DSelect = (layoutKey) => {
        const updates = {
            layout3D: {
                layout: layoutKey === "none" ? "" : layoutKey,
            },
        };
        // Clear padding when applying a 3D layout effect
        if (layoutKey !== "none") {
            updates.padding = "0px";
            updates.paddingBackgroundColor = "white";
        }
        handleStyleChange(updates);
    };
    return (_jsxs("div", { className: "space-y-2", children: [_jsx(CropSettings, { localOverlay: localOverlay, handleStyleChange: handleStyleChange }), onPositionChange && (_jsx(PositionSettings, { overlayWidth: localOverlay.width, overlayHeight: localOverlay.height, onPositionChange: onPositionChange })), _jsx(AnimationSettings, { selectedEnterAnimation: ((_a = localOverlay.styles.animation) === null || _a === void 0 ? void 0 : _a.enter) || "none", selectedExitAnimation: ((_b = localOverlay.styles.animation) === null || _b === void 0 ? void 0 : _b.exit) || "none", onEnterAnimationSelect: handleEnterAnimationSelect, onExitAnimationSelect: handleExitAnimationSelect }), _jsx(VisualLayoutSettings, { selectedLayout: ((_c = localOverlay.styles.layout3D) === null || _c === void 0 ? void 0 : _c.layout) || "none", onLayoutSelect: handleLayout3DSelect })] }));
};
