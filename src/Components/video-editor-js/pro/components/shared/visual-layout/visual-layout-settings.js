import { jsx as _jsx } from "react/jsx-runtime";
import { useState } from "react";
import { layout3DTemplates } from "../../../adaptors/default-3d-layout-adaptors";
import { VisualLayoutPreview } from "./visual-layout-preview";
import { VisualLayoutSection } from "./visual-layout-section";
/**
 * VisualLayoutSettings component provides a unified interface for selecting 3D layout effects
 * Uses the 3D layout templates directly for consistent key mapping
 */
export const VisualLayoutSettings = ({ selectedLayout, onLayoutSelect, }) => {
    const [isOpen, setIsOpen] = useState(false);
    const toggleSection = () => {
        setIsOpen(prev => !prev);
    };
    // Add a "None" option for no 3D effect
    const noneLayout = {
        key: "none",
        name: "None",
        preview: "No 3D effect",
        transform: () => ({}),
    };
    // Convert layout3DTemplates to array with keys
    const layoutArray = Object.values(layout3DTemplates);
    // All layouts including none option
    const allLayouts = [noneLayout, ...layoutArray.filter(layout => layout.key !== "none")];
    return (_jsx("div", { className: "w-full", children: _jsx(VisualLayoutSection, { title: "3D Layout Effects", count: allLayouts.length, isOpen: isOpen, onToggle: toggleSection, children: allLayouts.map((layout, index) => (_jsx(VisualLayoutPreview, { layout: layout, isSelected: selectedLayout === layout.key, onClick: () => {
                    console.log("Selecting 3D layout:", layout.key);
                    onLayoutSelect === null || onLayoutSelect === void 0 ? void 0 : onLayoutSelect(layout.key);
                } }, `layout-${layout.key}-${index}`))) }) }));
};
