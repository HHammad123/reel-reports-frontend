import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback, useRef } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { OverlayType } from "../../../types";
import { ShapeDetails } from "./shape-details";
import { SelectShapeOverlay } from "./select-shape-overlay";

export const ShapesOverlayPanel = () => {
    const { selectedOverlayId, overlays } = useEditorContext();
    const [localOverlay, setLocalOverlay] = useState(null);
    
    const prevSelectedIdRef = useRef(selectedOverlayId);
    
    // CRITICAL FIX: Only update localOverlay when selectedOverlayId changes
    // Keep local state when same overlay is selected
    // NEVER call changeOverlay here - it causes "Cannot update component while rendering" error
    useEffect(() => {
        // Skip if selectedOverlayId hasn't changed
        if (selectedOverlayId === prevSelectedIdRef.current) {
            // CRITICAL: Even if overlays array changed (due to style updates), don't update localOverlay
            // This prevents dimensions from being reset when styles change
            return;
        }
        
        prevSelectedIdRef.current = selectedOverlayId;
        
        if (selectedOverlayId === null) {
            setLocalOverlay(null);
            return;
        }
        
        const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId);
        
        if (selectedOverlay && selectedOverlay.type === OverlayType.SHAPE) {
            setLocalOverlay((prevLocalOverlay) => {
                if (prevLocalOverlay && prevLocalOverlay.id === selectedOverlay.id) {
                    // CRITICAL: Preserve local dimensions, only sync styles/content
                    console.log('✅ [ShapesOverlayPanel] Preserving local dimensions:', {
                        localWidth: prevLocalOverlay.width,
                        localHeight: prevLocalOverlay.height,
                        localLeft: prevLocalOverlay.left,
                        localTop: prevLocalOverlay.top,
                        globalWidth: selectedOverlay.width,
                        globalHeight: selectedOverlay.height,
                        globalLeft: selectedOverlay.left,
                        globalTop: selectedOverlay.top,
                    });
                    
                    return {
                        ...selectedOverlay, // Get latest styles/content from global
                        // But preserve local dimensions - NEVER change them
                        width: prevLocalOverlay.width,
                        height: prevLocalOverlay.height,
                        left: prevLocalOverlay.left,
                        top: prevLocalOverlay.top,
                        rotation: prevLocalOverlay.rotation,
                    };
                }
                
                // Different overlay - load fresh, but log it
                console.log('🔄 [ShapesOverlayPanel] Loading new overlay:', {
                    id: selectedOverlay.id,
                    width: selectedOverlay.width,
                    height: selectedOverlay.height,
                    left: selectedOverlay.left,
                    top: selectedOverlay.top,
                });
                return selectedOverlay;
            });
        } else {
            setLocalOverlay(null);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedOverlayId]); // CRITICAL: Only depend on selectedOverlayId, NOT overlays array
    
    const handleSetLocalOverlay = useCallback((overlay) => {
        setLocalOverlay(overlay);
    }, []);
    
    const isValidShapeOverlay = localOverlay && selectedOverlayId !== null;
    
    return (
        <_Fragment>
            {!isValidShapeOverlay ? (
                <SelectShapeOverlay />
            ) : (
                <ShapeDetails 
                    localOverlay={localOverlay} 
                    setLocalOverlay={handleSetLocalOverlay} 
                />
            )}
        </_Fragment>
    );
};

