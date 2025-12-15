import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { animationTemplates } from "../../../adaptors/default-animation-adaptors";
import { AnimationPreview } from "./animation-preview";
import { AnimationSection } from "./animation-section";
/**
 * AnimationSettings component provides a unified interface for selecting enter and exit animations
 * Uses the animation templates directly for consistent key mapping
 */
export const AnimationSettings = ({ selectedEnterAnimation, selectedExitAnimation, onEnterAnimationSelect, onExitAnimationSelect, }) => {
    const [openSections, setOpenSections] = useState({
        enter: false,
        exit: false,
    });
    const toggleSection = (section) => {
        setOpenSections((prev) => ({
            ...prev,
            [section]: !prev[section],
        }));
    };
    // Add a "None" option for both enter and exit
    const noneAnimation = {
        key: "none",
        name: "None",
        preview: "No animation",
        enter: () => ({}),
        exit: () => ({}),
    };
    // Convert animationTemplates to array with keys
    const animationArray = Object.values(animationTemplates);
    // All animations are available for both enter and exit since each template has both functions
    const allAnimations = [noneAnimation, ...animationArray];
    return (_jsxs("div", { className: "space-y-2", children: [_jsx(AnimationSection, { title: "Enter Animations", count: allAnimations.length, isOpen: openSections.enter, onToggle: () => toggleSection("enter"), children: allAnimations.map((animation, index) => (_jsx(AnimationPreview, { animation: animation, isSelected: selectedEnterAnimation === animation.key, onClick: () => {
                        console.log("Selecting enter animation:", animation.key);
                        onEnterAnimationSelect === null || onEnterAnimationSelect === void 0 ? void 0 : onEnterAnimationSelect(animation.key);
                    }, animationType: "enter" }, `enter-${animation.key}-${index}`))) }), _jsx(AnimationSection, { title: "Exit Animations", count: allAnimations.length, isOpen: openSections.exit, onToggle: () => toggleSection("exit"), children: allAnimations.map((animation, index) => (_jsx(AnimationPreview, { animation: animation, isSelected: selectedExitAnimation === animation.key, onClick: () => {
                        console.log("Selecting exit animation:", animation.key);
                        onExitAnimationSelect === null || onExitAnimationSelect === void 0 ? void 0 : onExitAnimationSelect(animation.key);
                    } }, `exit-${animation.key}-${index}`))) })] }));
};
