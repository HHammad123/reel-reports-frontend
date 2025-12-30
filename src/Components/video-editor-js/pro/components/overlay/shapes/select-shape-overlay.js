import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useCallback } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { OverlayType } from "../../../types";
import { Circle, Square, Triangle, RectangleHorizontal, Hexagon, Heart, Star } from "lucide-react";
import { setCurrentNewItemDragData, setCurrentNewItemDragType } from "../../advanced-timeline/hooks/use-new-item-drag";

/**
 * Shape templates with different shape types
 */
const shapeTemplates = {
    circle: {
        name: "Circle",
        preview: "Perfect circle shape",
        shapeType: "circle",
        icon: Circle,
        defaultSize: { width: 200, height: 200 },
    },
    square: {
        name: "Square",
        preview: "Perfect square shape",
        shapeType: "square",
        icon: Square,
        defaultSize: { width: 200, height: 200 },
    },
    rectangle: {
        name: "Rectangle",
        preview: "Wide rectangle shape",
        shapeType: "rectangle",
        icon: RectangleHorizontal,
        defaultSize: { width: 300, height: 150 },
    },
    triangle: {
        name: "Triangle",
        preview: "Triangle shape",
        shapeType: "triangle",
        icon: Triangle,
        defaultSize: { width: 200, height: 200 },
    },
    hexagon: {
        name: "Hexagon",
        preview: "Hexagon shape",
        shapeType: "hexagon",
        icon: Hexagon,
        defaultSize: { width: 200, height: 200 },
    },
    heart: {
        name: "Heart",
        preview: "Heart shape",
        shapeType: "heart",
        icon: Heart,
        defaultSize: { width: 200, height: 200 },
    },
    star: {
        name: "Star",
        preview: "Star shape",
        shapeType: "star",
        icon: Star,
        defaultSize: { width: 200, height: 200 },
    },
};

/**
 * SelectShapeOverlay Component
 *
 * This component renders a grid of shape templates that users can select from.
 * When a template is selected, it creates a new shape overlay with predefined styles
 * and positions it at the next available spot in the timeline.
 */
export const SelectShapeOverlay = () => {
    const { overlays, currentFrame, setOverlays, setSelectedOverlayId } = useEditorContext();
    const { addAtPlayhead } = useTimelinePositioning();
    
    /**
     * Creates and adds a new shape overlay to the editor
     * @param option - The selected shape template option
     */
    const handleAddOverlay = useCallback((option) => {
        const { from, row, updatedOverlays } = addAtPlayhead(currentFrame, overlays);
        
        const newOverlay = {
            left: 64,
            top: 72,
            width: option.defaultSize.width,
            height: option.defaultSize.height,
            durationInFrames: 90, // 3 seconds at 30fps
            from,
            row,
            rotation: 0,
            isDragging: false,
            type: OverlayType.SHAPE,
            shapeType: option.shapeType,
            styles: {
                fill: "#3b82f6", // Default blue color
                stroke: "#1e40af", // Default stroke color
                strokeWidth: 2,
                opacity: 1,
                zIndex: 1,
                transform: "none",
            },
        };
        
        // Generate a unique ID
        const existingIds = updatedOverlays
            .map((o) => o?.id)
            .filter((id) => id !== undefined && id !== null && typeof id === 'number')
            .filter((id) => !isNaN(id));
        
        const newId = existingIds.length > 0 
            ? Math.max(...existingIds) + 1 
            : Date.now();
        
        const overlayWithId = { 
            ...newOverlay, 
            id: newId
        };
        
        console.log('✅ [SelectShapeOverlay] Created shape overlay with ID:', {
            overlayId: newId,
            shapeType: overlayWithId.shapeType,
            type: overlayWithId.type,
            from: overlayWithId.from,
            row: overlayWithId.row
        });
        
        const finalOverlays = [...updatedOverlays, overlayWithId];
        setOverlays(finalOverlays);
        
        // Select the new overlay so it can be edited immediately
        setSelectedOverlayId(newId);
        
        console.log('✅ [SelectShapeOverlay] Shape overlay selected for editing:', newId);
    }, [currentFrame, overlays, addAtPlayhead, setOverlays, setSelectedOverlayId]);
    
    /**
     * Handle drag start for timeline integration
     */
    const handleDragStart = useCallback((option) => (e) => {
        const dragData = {
            isNewItem: true,
            type: 'shape',
            label: option.name,
            duration: 3,
            data: option,
        };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData("application/json", JSON.stringify(dragData));
        setCurrentNewItemDragType(dragData.type);
        setCurrentNewItemDragData(dragData);
        
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
        setTimeout(() => {
            document.body.removeChild(dragPreview);
        }, 0);
    }, []);
    
    const handleDragEnd = useCallback(() => {
        setCurrentNewItemDragType(null);
        setCurrentNewItemDragData(null);
    }, []);
    
    return useMemo(() => (
        <div className="grid grid-cols-2 gap-3 p-2">
            {Object.entries(shapeTemplates).map(([key, option]) => {
                const IconComponent = option.icon;
                return (
                    <div
                        key={key}
                        onClick={() => handleAddOverlay(option)}
                        draggable={true}
                        onDragStart={handleDragStart(option)}
                        onDragEnd={handleDragEnd}
                        className="group relative overflow-hidden border-2 bg-card rounded-md transition-all duration-200 hover:border-secondary hover:bg-accent/30 cursor-pointer"
                    >
                        <div className="aspect-square w-full flex items-center justify-center p-4">
                            <IconComponent 
                                className="w-16 h-16 text-foreground transition-transform duration-200 group-hover:scale-110"
                                style={{ 
                                    fill: option.defaultSize.fill || 'currentColor',
                                    stroke: 'currentColor',
                                    strokeWidth: 1
                                }}
                            />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 backdrop-blur-[2px] px-3 py-1.5">
                            <div className="font-extralight text-foreground text-[11px]">
                                {option.name}
                            </div>
                            <div className="text-muted-foreground text-[9px] leading-tight">
                                {option.preview}
                            </div>
                        </div>
                    </div>
                );
            })}
        </div>
    ), [handleAddOverlay, handleDragStart, handleDragEnd]);
};

