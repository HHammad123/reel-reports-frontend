import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from "react";
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
    const { changeOverlay, getAspectRatioDimensions } = useEditorContext();
    /**
     * Handles changes to direct overlay properties
     * FIXED: Uses functional updates to avoid depending on localOverlay
     * This prevents callbacks from being recreated on every render
     * @param {keyof TextOverlay} field - The field to update
     * @param {string} value - The new value
     */
    const handleInputChange = useCallback((field, value) => {
        setLocalOverlay((prevOverlay) => {
            const updatedOverlay = { ...prevOverlay, [field]: value };
            // Update global state immediately (no debounce to prevent losing changes)
            changeOverlay(updatedOverlay.id, () => updatedOverlay);
            return updatedOverlay;
        });
    }, [setLocalOverlay, changeOverlay]);
    
    /**
     * Handles changes to nested style properties
     * FIXED: Uses functional updates to avoid depending on localOverlay
     * This prevents callbacks from being recreated on every render
     * @param {keyof TextOverlay["styles"]} field - The style field to update
     * @param {string} value - The new value
     */
    const handleStyleChange = useCallback((field, value) => {
        console.log(field, value);
        
        setLocalOverlay((prevOverlay) => {
            // CRITICAL: Check if value actually changed to prevent unnecessary updates
            if (prevOverlay.styles && prevOverlay.styles[field] === value) {
                console.log('[TextDetails] Style value unchanged, skipping update:', field, value);
                return prevOverlay; // Return unchanged overlay
            }
            
            // Update local state immediately for responsive UI
            const updatedLocalOverlay = {
                ...prevOverlay,
                styles: { ...prevOverlay.styles, [field]: value },
            };
            // Update global state immediately (no debounce to prevent losing changes)
            changeOverlay(updatedLocalOverlay.id, () => updatedLocalOverlay);
            return updatedLocalOverlay;
        });
    }, [setLocalOverlay, changeOverlay]);
    
    /**
     * Handles position and size changes for the text overlay
     * FIXED: Uses functional updates to avoid depending on localOverlay
     * Also updates normalized position (0-1) like chart editor
     * This prevents callbacks from being recreated on every render
     */
    const handlePositionChange = useCallback((updates) => {
        setLocalOverlay((prevOverlay) => {
            // Get canvas dimensions for normalized position calculation
            const canvasDimensions = getAspectRatioDimensions();
            const canvasWidth = canvasDimensions.width;
            const canvasHeight = canvasDimensions.height;
            
            // Merge updates with existing overlay
            const updatedOverlay = {
                ...prevOverlay,
                ...updates,
            };
            
            // Calculate normalized position (0-1 range) - center of text box
            const finalLeft = updates.left !== undefined ? updates.left : prevOverlay.left;
            const finalTop = updates.top !== undefined ? updates.top : prevOverlay.top;
            const finalWidth = updates.width !== undefined ? updates.width : prevOverlay.width;
            const finalHeight = updates.height !== undefined ? updates.height : prevOverlay.height;
            
            const normalizedX = (finalLeft + finalWidth / 2) / canvasWidth;
            const normalizedY = (finalTop + finalHeight / 2) / canvasHeight;
            
            // Update normalized position (like chart editor)
            updatedOverlay.position = {
                x: Math.max(0, Math.min(1, normalizedX)), // Clamp to 0-1
                y: Math.max(0, Math.min(1, normalizedY))  // Clamp to 0-1
            };
            
            // Update normalized bounding box (0-1 range)
            updatedOverlay.bounding_box = {
                x: finalLeft / canvasWidth,
                y: finalTop / canvasHeight,
                width: finalWidth / canvasWidth,
                height: finalHeight / canvasHeight
            };
            
            // Update global state immediately
            changeOverlay(updatedOverlay.id, () => updatedOverlay);
            return updatedOverlay;
        });
    }, [setLocalOverlay, changeOverlay, getAspectRatioDimensions]);
    
    // ============================================================================
    // CRITICAL FIX: Memoize content components to prevent UnifiedTabs re-renders
    // ============================================================================
    // Without memoization, new component instances are created on every render,
    // causing UnifiedTabs to see "new" props and re-render infinitely
    const settingsContent = useMemo(() => {
        return _jsx(TextSettingsPanel, { localOverlay: localOverlay, handleStyleChange: handleStyleChange });
    }, [localOverlay, handleStyleChange]);
    
    const styleContent = useMemo(() => {
        return _jsx(TextStylePanel, { 
            localOverlay: localOverlay, 
            handleInputChange: handleInputChange, 
            handleStyleChange: handleStyleChange, 
            onPositionChange: handlePositionChange 
        });
    }, [localOverlay, handleInputChange, handleStyleChange, handlePositionChange]);
    
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "flex flex-col px-2 mt-2", children: _jsx(Textarea, { value: localOverlay.content || "", onChange: (e) => handleInputChange("content", e.target.value), placeholder: "Enter your text here...", className: "w-full min-h-[60px] resize-none text-base bg-input border-gray-300 text-foreground", spellCheck: "false" }) }), _jsx(Separator, {}), _jsx("div", { className: "flex flex-col gap-4 px-2", children: _jsx(UnifiedTabs, { settingsContent: settingsContent, styleContent: styleContent }) })] }));
};