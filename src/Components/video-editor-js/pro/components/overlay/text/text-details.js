import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { TextSettingsPanel } from "./text-settings-panel";
import { TextStylePanel } from "./text-style-panel";
import { UnifiedTabs } from "../shared/unified-tabs";
import { Textarea } from "../../ui/textarea";
import { Separator } from "../../ui/separator";
/**
 * TextDetails component provides a UI for editing text overlay properties and styles.
 * It includes a live preview, text editor, and tabbed panels for settings and styling.
 * Changes are debounced to prevent excessive re-renders.
 *
 * @component
 * @param {TextDetailsProps} props - Component props
 * @returns {JSX.Element} Rendered component
 */
export const TextDetails = ({ localOverlay, setLocalOverlay, }) => {
    const { changeOverlay } = useEditorContext();
    /**
     * Handles changes to direct overlay properties
     * MEMOIZED with useCallback to prevent infinite loops
     * @param {keyof TextOverlay} field - The field to update
     * @param {string} value - The new value
     */
    const handleInputChange = useCallback((field, value) => {
        const updatedOverlay = { ...localOverlay, [field]: value };
        // Update local state immediately for responsive UI
        setLocalOverlay(updatedOverlay);
        // Update global state immediately (no debounce to prevent losing changes)
        changeOverlay(updatedOverlay.id, () => updatedOverlay);
    }, [localOverlay, setLocalOverlay, changeOverlay]);
    
    /**
     * Handles changes to nested style properties
     * MEMOIZED with useCallback to prevent infinite loops
     * @param {keyof TextOverlay["styles"]} field - The style field to update
     * @param {string} value - The new value
     */
    const handleStyleChange = useCallback((field, value) => {
        console.log(field, value);
        
        // CRITICAL: Check if value actually changed to prevent unnecessary updates
        if (localOverlay.styles && localOverlay.styles[field] === value) {
            console.log('[TextDetails] Style value unchanged, skipping update:', field, value);
            return;
        }
        
        // Update local state immediately for responsive UI
        const updatedLocalOverlay = {
            ...localOverlay,
            styles: { ...localOverlay.styles, [field]: value },
        };
        setLocalOverlay(updatedLocalOverlay);
        // Update global state immediately (no debounce to prevent losing changes)
        changeOverlay(updatedLocalOverlay.id, () => updatedLocalOverlay);
    }, [localOverlay, setLocalOverlay, changeOverlay]);
    
    /**
     * Handles position and size changes for the text overlay
     * MEMOIZED with useCallback to prevent infinite loops
     */
    const handlePositionChange = useCallback((updates) => {
        const updatedOverlay = {
            ...localOverlay,
            ...updates,
        };
        // Update local state immediately for responsive UI
        setLocalOverlay(updatedOverlay);
        // Update global state immediately
        changeOverlay(updatedOverlay.id, () => updatedOverlay);
    }, [localOverlay, setLocalOverlay, changeOverlay]);
    
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex flex-col px-2 mt-2", children: _jsx(Textarea, { value: localOverlay.content || "", onChange: (e) => handleInputChange("content", e.target.value), placeholder: "Enter your text here...", className: "w-full min-h-[60px] resize-none text-base bg-input border-gray-300 text-foreground", spellCheck: "false" }) }), _jsx(Separator, {}), _jsx("div", { className: "flex flex-col gap-4 px-2", children: _jsx(UnifiedTabs, { settingsContent: _jsx(TextSettingsPanel, { localOverlay: localOverlay, handleStyleChange: handleStyleChange }), styleContent: _jsx(TextStylePanel, { localOverlay: localOverlay, handleInputChange: handleInputChange, handleStyleChange: handleStyleChange, onPositionChange: handlePositionChange }) }) })] }));
};