import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo, useEffect } from "react";
import { ShapeStylePanel } from "./shape-style-panel";
import { ShapeSettingsPanel } from "./shape-settings-panel";
import { UnifiedTabs } from "../shared/unified-tabs";
import { Settings, PaintBucket } from "lucide-react";
import { useEditorContext } from "../../../contexts/editor-context";

/**
 * ShapeDetails Component
 *
 * Provides a tabbed interface for managing shape settings and styles.
 * Features include:
 * - Style customization panel (fill, stroke, opacity)
 * - Settings configuration panel (position, size, animation)
 * - Real-time updates
 */
export const ShapeDetails = ({ localOverlay, setLocalOverlay }) => {
    const { changeOverlay } = useEditorContext();
    
    // Memoize callbacks to prevent recreation on every render
    const handleStyleChange = useCallback((updates) => {
        if (!localOverlay || !updates) {
            return;
        }
        
        setLocalOverlay((prevOverlay) => {
            if (!prevOverlay) {
                return prevOverlay;
            }
            
            // Check if any values actually changed to prevent infinite loops
            let hasChanges = false;
            for (const key in updates) {
                if (key === 'animation') {
                    // Deep compare animation object
                    const prevAnimation = prevOverlay.styles?.animation || {};
                    const newAnimation = updates.animation || {};
                    if (prevAnimation.enter !== newAnimation.enter || 
                        prevAnimation.exit !== newAnimation.exit || 
                        prevAnimation.duration !== newAnimation.duration) {
                        hasChanges = true;
                        break;
                    }
                } else if (prevOverlay.styles?.[key] !== updates[key]) {
                    hasChanges = true;
                    break;
                }
            }
            
            // Only update if there are actual changes
            if (!hasChanges) {
                return prevOverlay;
            }
            
            const updatedOverlay = {
                ...prevOverlay,
                styles: {
                    ...prevOverlay.styles,
                    ...updates,
                },
            };
            
            // Defer changeOverlay to avoid render phase update
            setTimeout(() => {
                changeOverlay(updatedOverlay.id, () => updatedOverlay);
            }, 0);
            
            return updatedOverlay;
        });
    }, [localOverlay, setLocalOverlay, changeOverlay]);
    
    /**
     * Handles position and size changes for the shape overlay
     */
    const handlePositionChange = useCallback((updates) => {
        if (!localOverlay || !updates) {
            return;
        }
        
        setLocalOverlay((prevOverlay) => {
            if (!prevOverlay) {
                return prevOverlay;
            }
            
            // Check if any values actually changed
            let hasChanges = false;
            for (const key in updates) {
                if (prevOverlay[key] !== updates[key]) {
                    hasChanges = true;
                    break;
                }
            }
            
            // Only update if there are actual changes
            if (!hasChanges) {
                return prevOverlay;
            }
            
            const updatedOverlay = {
                ...prevOverlay,
                ...updates,
            };
            
            // Defer changeOverlay to avoid render phase update
            setTimeout(() => {
                changeOverlay(updatedOverlay.id, () => updatedOverlay);
            }, 0);
            
            return updatedOverlay;
        });
    }, [localOverlay, setLocalOverlay, changeOverlay]);
    
    // Stable icon references created once
    const settingsIcon = useMemo(() => _jsx(Settings, { className: "w-4 h-4" }), []);
    const paintBucketIcon = useMemo(() => _jsx(PaintBucket, { className: "w-4 h-4" }), []);
    
    // Memoize overlay ID to prevent unnecessary tab re-creation
    const overlayId = useMemo(() => localOverlay?.id, [localOverlay?.id]);
    
    const tabs = useMemo(() => {
        if (!localOverlay) {
            return [];
        }
        
        return [
            {
                value: "settings",
                label: "Settings",
                icon: settingsIcon,
                content: _jsx(ShapeSettingsPanel, { 
                    localOverlay: localOverlay, 
                    handleStyleChange: handleStyleChange, 
                    onPositionChange: handlePositionChange 
                }),
            },
            {
                value: "style",
                label: "Style",
                icon: paintBucketIcon,
                content: _jsx(ShapeStylePanel, { 
                    localOverlay: localOverlay, 
                    handleStyleChange: handleStyleChange 
                }),
            },
        ];
    }, [overlayId, localOverlay, handleStyleChange, handlePositionChange, settingsIcon, paintBucketIcon]);
    
    if (!localOverlay) {
        return null;
    }
    
    return (
        <div className="space-y-4">
            <div className="p-4 border rounded-md bg-card">
                <div className="text-sm font-extralight text-foreground mb-2">
                    Shape Type: <span className="font-normal capitalize">{localOverlay.shapeType || 'circle'}</span>
                </div>
            </div>
            <UnifiedTabs tabs={tabs} />
        </div>
    );
};

