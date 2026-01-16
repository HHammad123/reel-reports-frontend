import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useCallback } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { OverlayType } from "../../../types";
import { textOverlayTemplates } from "../../../templates/text-overlay-templates";
import { setCurrentNewItemDragData, setCurrentNewItemDragType } from "../../advanced-timeline/hooks/use-new-item-drag";
/**
 * SelectTextOverlay Component
 *
 * This component renders a grid of text overlay templates that users can select from.
 * When a template is selected, it creates a new text overlay with predefined styles
 * and positions it at the next available spot in the timeline.
 *
 * Features:
 * - Displays a grid of text overlay templates with preview and information
 * - Automatically positions new overlays in the timeline
 * - Applies template styles while maintaining consistent base properties
 * - Supports dark/light mode with appropriate styling
 *
 * @component
 */
export const SelectTextOverlay = () => {
    const { overlays, currentFrame, setOverlays, setSelectedOverlayId } = useEditorContext();
    const { addAtPlayhead } = useTimelinePositioning();
    /**
     * Creates and adds a new text overlay to the editor
     * @param option - The selected template option from textOverlayTemplates
     */
    const handleAddOverlay = useCallback((option) => {
        var _a;
        const { from, row, updatedOverlays } = addAtPlayhead(currentFrame, overlays);
        const textContent = (_a = option.content) !== null && _a !== void 0 ? _a : "Testing";
        const newOverlay = {
            left: 64,    // Your desired default
            top: 72,     // Your desired default
            width: 512,  // Your desired default
            height: 72,  // Your desired default
            durationInFrames: 90,
            from,
            row,
            rotation: 0,
            isDragging: false,
            type: OverlayType.TEXT,
            content: textContent,
            text: textContent, // Ensure both content and text properties exist for editing compatibility
            styles: {
                ...option.styles,
                // Remove hardcoded fontSize to let dynamic calculation work
                opacity: 1,
                zIndex: 300,
                transform: "none",
                textAlign: option.styles.textAlign,
                fontSizeScale: 1, // Default scale factor
            },
        };
        // Update overlays with both the shifted overlays and the new overlay in a single operation
        // Generate a unique ID - ensure it's always a number and unique
        const existingIds = updatedOverlays
            .map((o) => o?.id)
            .filter((id) => id !== undefined && id !== null && typeof id === 'number')
            .filter((id) => !isNaN(id));
        
        const newId = existingIds.length > 0 
            ? Math.max(...existingIds) + 1 
            : Date.now(); // Use timestamp as fallback for unique ID
        
        const overlayWithId = { 
            ...newOverlay, 
            id: newId
        };
        
        console.log('✅ [SelectTextOverlay] Created text overlay with ID:', {
            overlayId: newId,
            content: overlayWithId.content,
            text: overlayWithId.text,
            type: overlayWithId.type,
            from: overlayWithId.from,
            row: overlayWithId.row
        });
        
        const finalOverlays = [...updatedOverlays, overlayWithId];
        setOverlays(finalOverlays);
        
        // Select the new overlay so it can be edited immediately
        setSelectedOverlayId(newId);
        
        console.log('✅ [SelectTextOverlay] Text overlay selected for editing:', newId);
    }, [currentFrame, overlays, addAtPlayhead, setOverlays, setSelectedOverlayId]);
    /**
     * Handle drag start for timeline integration
     */
    const handleDragStart = useCallback((option) => (e) => {
        // Set drag data for timeline
        const dragData = {
            isNewItem: true,
            type: 'text',
            label: option.name,
            duration: 3, // Default 3 seconds (90 frames / 30 fps)
            data: option, // Pass template data
        };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData("application/json", JSON.stringify(dragData));
        // Set global drag state for timeline
        setCurrentNewItemDragType(dragData.type);
        setCurrentNewItemDragData(dragData);
        // Create a custom drag preview with text
        const dragPreview = document.createElement('div');
        dragPreview.style.position = 'absolute';
        dragPreview.style.top = '-9999px';
        dragPreview.style.padding = '8px 12px';
        dragPreview.style.backgroundColor = 'rgba(0,0,0,0.8)';
        dragPreview.style.color = 'white';
        dragPreview.style.borderRadius = '4px';
        dragPreview.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
        dragPreview.style.fontSize = '14px';
        dragPreview.style.whiteSpace = 'nowrap';
        dragPreview.textContent = option.name;
        document.body.appendChild(dragPreview);
        e.dataTransfer.setDragImage(dragPreview, 40, 20);
        // Clean up the preview element after drag starts
        setTimeout(() => {
            document.body.removeChild(dragPreview);
        }, 0);
    }, []);
    /**
     * Handle drag end - clear drag state
     */
    const handleDragEnd = useCallback(() => {
        setCurrentNewItemDragType(null);
        setCurrentNewItemDragData(null);
    }, []);
    return useMemo(() => (_jsx("div", { className: "grid grid-cols-1 gap-3 p-2", children: Object.entries(textOverlayTemplates).map(([key, option]) => (_jsxs("div", { onClick: () => handleAddOverlay(option), draggable: true, onDragStart: handleDragStart(option), onDragEnd: handleDragEnd, className: "group relative overflow-hidden border-2  bg-card rounded-md transition-all duration-200 hover:border-secondary hover:bg-accent/30 cursor-pointer", children: [_jsx("div", { className: "aspect-16/6 w-full flex items-center justify-center p-2 pb-12", children: _jsx("div", { className: "text-base transform-gpu transition-transform duration-200 group-hover:scale-102 text-foreground", style: {
                            ...option.styles,
                            fontSize: "1.25rem",
                            padding: option.styles.padding || undefined,
                            fontFamily: undefined,
                            color: undefined,
                        }, children: option.content }) }), _jsxs("div", { className: "absolute bottom-0 left-0 right-0 backdrop-blur-[2px] px-3 py-1.5", children: [_jsx("div", { className: "font-extralight text-foreground text-[11px]", children: option.name }), _jsx("div", { className: "text-muted-foreground text-[9px] leading-tight", children: option.preview })] })] }, key))) })), [handleAddOverlay, handleDragStart, handleDragEnd]);
};
