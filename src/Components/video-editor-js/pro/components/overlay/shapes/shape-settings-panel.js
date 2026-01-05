import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from "react";
import { AnimationSettings } from "../../shared/animation/animation-settings";
import { PositionSettings } from "../../shared/position/position-settings";

/**
 * ShapeSettingsPanel Component
 *
 * A panel that allows users to configure animation and position settings for a shape overlay.
 * Provides options to set both enter and exit animations from a predefined set
 * of animation templates.
 *
 * Features:
 * - Positioning controls for quick layout adjustments
 * - Enter animation selection
 * - Exit animation selection
 * - Option to remove animations ("None" selection)
 */
export const ShapeSettingsPanel = ({ localOverlay, handleStyleChange, onPositionChange }) => {
    // Memoize handlers to prevent infinite loops
    const handleEnterAnimationSelect = useCallback((animationKey) => {
        // Only update if the value actually changed
        const currentEnter = localOverlay?.styles?.animation?.enter || "";
        const newEnter = animationKey === "none" ? "" : animationKey;
        if (currentEnter !== newEnter) {
            handleStyleChange({
                animation: {
                    ...localOverlay.styles.animation,
                    enter: newEnter,
                },
            });
        }
    }, [localOverlay?.styles?.animation, handleStyleChange]);
    
    const handleExitAnimationSelect = useCallback((animationKey) => {
        // Only update if the value actually changed
        const currentExit = localOverlay?.styles?.animation?.exit || "";
        const newExit = animationKey === "none" ? "" : animationKey;
        if (currentExit !== newExit) {
            handleStyleChange({
                animation: {
                    ...localOverlay.styles.animation,
                    exit: newExit,
                },
            });
        }
    }, [localOverlay?.styles?.animation, handleStyleChange]);
    
    // Memoize animation values to prevent unnecessary re-renders
    const selectedEnterAnimation = useMemo(() => {
        return localOverlay?.styles?.animation?.enter || "none";
    }, [localOverlay?.styles?.animation]);
    
    const selectedExitAnimation = useMemo(() => {
        return localOverlay?.styles?.animation?.exit || "none";
    }, [localOverlay?.styles?.animation]);
    
    return (
        <div className="space-y-2">
            {onPositionChange && (
                <PositionSettings
                    overlayWidth={localOverlay.width}
                    overlayHeight={localOverlay.height}
                    overlayLeft={localOverlay.left}
                    overlayTop={localOverlay.top}
                    onPositionChange={onPositionChange}
                />
            )}
            <AnimationSettings
                selectedEnterAnimation={selectedEnterAnimation}
                selectedExitAnimation={selectedExitAnimation}
                onEnterAnimationSelect={handleEnterAnimationSelect}
                onExitAnimationSelect={handleExitAnimationSelect}
            />
        </div>
    );
};

