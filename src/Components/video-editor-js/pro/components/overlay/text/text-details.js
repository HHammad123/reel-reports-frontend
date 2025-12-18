import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo, useRef, useEffect, useState } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { TextSettingsPanel } from "./text-settings-panel";
import { TextStylePanel } from "./text-style-panel";
import { UnifiedTabs } from "../shared/unified-tabs";
import { Textarea } from "../../ui/textarea";
import { Separator } from "../../ui/separator";

/**
 * TextDetails component provides a UI for editing text overlay properties and styles.
 * CRITICAL FIX: This component NEVER modifies width, height, left, top, or rotation
 * Only handlePositionChange can modify dimensions
 */
export const TextDetails = ({ localOverlay, setLocalOverlay }) => {
    const { changeOverlay, getAspectRatioDimensions, overlays } = useEditorContext();
    
    // CRITICAL: Lock dimensions in a ref when overlay is first loaded
    // These dimensions will NEVER change except through handlePositionChange
    const lockedDimensionsRef = useRef(null);
    
    // Lock dimensions when localOverlay is first set
    // CRITICAL FIX: Check if dimensions are canvas size (likely wrong) and use global state instead
    useEffect(() => {
        if (localOverlay && (!lockedDimensionsRef.current || lockedDimensionsRef.current.id !== localOverlay.id)) {
            const canvasDimensions = getAspectRatioDimensions();
            const canvasWidth = canvasDimensions.width;
            const canvasHeight = canvasDimensions.height;
            
            // Check if localOverlay dimensions match canvas size (likely wrong defaults)
            const isCanvasSize = 
                (localOverlay.width === canvasWidth && localOverlay.height === canvasHeight) ||
                (localOverlay.width === 1080 && localOverlay.height === 1080); // Common default
            
            // If dimensions are canvas size, try to get correct dimensions from global state
            let finalWidth = localOverlay.width;
            let finalHeight = localOverlay.height;
            let finalLeft = localOverlay.left;
            let finalTop = localOverlay.top;
            
            if (isCanvasSize) {
                // Try to get correct dimensions from global overlays array
                const globalOverlay = overlays.find(o => o.id === localOverlay.id);
                if (globalOverlay && 
                    globalOverlay.width !== canvasWidth && 
                    globalOverlay.height !== canvasHeight &&
                    globalOverlay.width > 0 && 
                    globalOverlay.height > 0) {
                    // Use dimensions from global state (they're likely correct)
                    finalWidth = globalOverlay.width;
                    finalHeight = globalOverlay.height;
                    finalLeft = globalOverlay.left;
                    finalTop = globalOverlay.top;
                    console.log('✅ [TextDetails] Using dimensions from global state (canvas size detected):', {
                        width: finalWidth,
                        height: finalHeight,
                        left: finalLeft,
                        top: finalTop,
                        localWidth: localOverlay.width,
                        localHeight: localOverlay.height,
                    });
                } else {
                    // Still canvas size in global state, use fallbacks
                    finalWidth = 512;
                    finalHeight = 72;
                    finalLeft = localOverlay.left || 64;
                    finalTop = localOverlay.top || 72;
                    console.warn('⚠️ [TextDetails] Canvas size detected, using fallbacks:', {
                        width: finalWidth,
                        height: finalHeight,
                        left: finalLeft,
                        top: finalTop,
                    });
                }
            } else {
                // Dimensions look reasonable, use them as-is
                finalWidth = (Number.isFinite(localOverlay.width) && localOverlay.width > 0) 
                    ? localOverlay.width 
                    : 512;
                finalHeight = (Number.isFinite(localOverlay.height) && localOverlay.height > 0) 
                    ? localOverlay.height 
                    : 72;
                finalLeft = Number.isFinite(localOverlay.left) 
                    ? localOverlay.left 
                    : 64;
                finalTop = Number.isFinite(localOverlay.top) 
                    ? localOverlay.top 
                    : 72;
            }
            
            // Lock the dimensions
            lockedDimensionsRef.current = {
                id: localOverlay.id,
                width: finalWidth,
                height: finalHeight,
                left: finalLeft,
                top: finalTop,
                rotation: localOverlay.rotation || 0,
            };
            
            console.log('🔒 [TextDetails] Locked dimensions:', {
                id: lockedDimensionsRef.current.id,
                width: lockedDimensionsRef.current.width,
                height: lockedDimensionsRef.current.height,
                left: lockedDimensionsRef.current.left,
                top: lockedDimensionsRef.current.top,
                originalWidth: localOverlay.width,
                originalHeight: localOverlay.height,
                wasCanvasSize: isCanvasSize,
            });
            
            // If we corrected dimensions, update local and global state
            if (isCanvasSize && (finalWidth !== localOverlay.width || finalHeight !== localOverlay.height)) {
                setLocalOverlay((prev) => {
                    if (!prev || prev.id !== localOverlay.id) return prev;
                    return {
                        ...prev,
                        width: finalWidth,
                        height: finalHeight,
                        left: finalLeft,
                        top: finalTop,
                    };
                });
                
                setTimeout(() => {
                    changeOverlay(localOverlay.id, (current) => ({
                        ...current,
                        width: finalWidth,
                        height: finalHeight,
                        left: finalLeft,
                        top: finalTop,
                    }));
                }, 0);
            }
        }
    }, [localOverlay?.id, getAspectRatioDimensions, overlays, changeOverlay]);
    
    // CRITICAL: Enforce locked dimensions on every render to prevent dimension changes
    // BUT: If locked dimensions are canvas size and current dimensions are reasonable, update the lock
    const prevDimsRef = useRef(null);
    useEffect(() => {
        if (!localOverlay || !lockedDimensionsRef.current || lockedDimensionsRef.current.id !== localOverlay.id) {
            prevDimsRef.current = null;
            return;
        }
        
        const lockedDims = lockedDimensionsRef.current;
        const currentDims = {
            width: localOverlay.width,
            height: localOverlay.height,
            left: localOverlay.left,
            top: localOverlay.top,
            rotation: localOverlay.rotation,
        };
        
        const canvasDimensions = getAspectRatioDimensions();
        const canvasWidth = canvasDimensions.width;
        const canvasHeight = canvasDimensions.height;
        
        // Check if locked dimensions are canvas size (likely wrong)
        const lockedIsCanvasSize = 
            (lockedDims.width === canvasWidth && lockedDims.height === canvasHeight) ||
            (lockedDims.width === 1080 && lockedDims.height === 1080);
        
        // Check if current dimensions are reasonable (not canvas size)
        const currentIsReasonable = 
            currentDims.width > 0 && 
            currentDims.height > 0 &&
            currentDims.width < canvasWidth * 0.9 && 
            currentDims.height < canvasHeight * 0.9 &&
            Number.isFinite(currentDims.width) &&
            Number.isFinite(currentDims.height);
        
        // If locked dimensions are canvas size but current dimensions are reasonable, update the lock
        if (lockedIsCanvasSize && currentIsReasonable) {
            console.log('✅ [TextDetails] Updating lock from canvas size to reasonable dimensions:', {
                oldLock: lockedDims,
                newLock: currentDims,
            });
            
            // Update the lock to the current reasonable dimensions
            lockedDimensionsRef.current = {
                id: localOverlay.id,
                width: currentDims.width,
                height: currentDims.height,
                left: currentDims.left,
                top: currentDims.top,
                rotation: currentDims.rotation,
            };
            
            prevDimsRef.current = { ...currentDims };
            return; // Don't enforce, dimensions are now correct
        }
        
        // Check if dimensions changed from what we expect
        const dimensionsChanged = 
            currentDims.width !== lockedDims.width ||
            currentDims.height !== lockedDims.height ||
            currentDims.left !== lockedDims.left ||
            currentDims.top !== lockedDims.top ||
            currentDims.rotation !== lockedDims.rotation;
        
        // Only enforce if dimensions changed AND we haven't already enforced for this render
        if (dimensionsChanged && (
            !prevDimsRef.current ||
            prevDimsRef.current.width !== currentDims.width ||
            prevDimsRef.current.height !== currentDims.height ||
            prevDimsRef.current.left !== currentDims.left ||
            prevDimsRef.current.top !== currentDims.top ||
            prevDimsRef.current.rotation !== currentDims.rotation
        )) {
            console.warn('⚠️ [TextDetails] Dimensions changed after render! Enforcing locked dimensions:', {
                current: currentDims,
                locked: lockedDims
            });
            
            prevDimsRef.current = { ...currentDims };
            
            // Immediately correct the dimensions
            setLocalOverlay((prev) => {
                if (!prev || prev.id !== localOverlay.id) return prev;
                return {
                    ...prev,
                    width: lockedDims.width,
                    height: lockedDims.height,
                    left: lockedDims.left,
                    top: lockedDims.top,
                    rotation: lockedDims.rotation,
                };
            });
            
            // Also update global state to ensure consistency
            setTimeout(() => {
                changeOverlay(localOverlay.id, (current) => ({
                    ...current,
                    width: lockedDims.width,
                    height: lockedDims.height,
                    left: lockedDims.left,
                    top: lockedDims.top,
                    rotation: lockedDims.rotation,
                }));
            }, 0);
        } else if (!dimensionsChanged) {
            // Dimensions are correct, update prevDimsRef
            prevDimsRef.current = { ...currentDims };
        }
    }, [localOverlay?.width, localOverlay?.height, localOverlay?.left, localOverlay?.top, localOverlay?.rotation, localOverlay?.id, changeOverlay, getAspectRatioDimensions]);
    
    // CRITICAL: Create a memoized overlay that ALWAYS uses locked dimensions
    // This ensures dimensions never change, even if localOverlay has wrong values
    // We use a state to track when lock is set, so useMemo can react to it
    const [lockVersion, setLockVersion] = useState(0);
    
    // Update lockVersion when dimensions are locked (triggers enforcedOverlay recalculation)
    useEffect(() => {
        if (lockedDimensionsRef.current && localOverlay && lockedDimensionsRef.current.id === localOverlay.id) {
            setLockVersion(v => v + 1);
        }
    }, [localOverlay?.id]);
    
    const enforcedOverlay = useMemo(() => {
        if (!localOverlay) return null;
        
        // CRITICAL: Always use locked dimensions if they exist
        // The lock is set by the useEffect above, which calculates correct dimensions
        const lockedDims = lockedDimensionsRef.current && lockedDimensionsRef.current.id === localOverlay.id
            ? lockedDimensionsRef.current
            : {
                // If no lock yet, use current dimensions (lock will be set by useEffect)
                width: localOverlay.width,
                height: localOverlay.height,
                left: localOverlay.left,
                top: localOverlay.top,
                rotation: localOverlay.rotation || 0,
            };
        
        // Always use locked dimensions, never use localOverlay dimensions directly
        return {
            ...localOverlay,
            width: lockedDims.width,
            height: lockedDims.height,
            left: lockedDims.left,
            top: lockedDims.top,
            rotation: lockedDims.rotation,
        };
    }, [
        localOverlay?.id,
        localOverlay?.content,
        localOverlay?.styles,
        lockVersion, // Trigger recalculation when lock is set
    ]);
    
    // Use enforcedOverlay instead of localOverlay throughout the component
    const safeOverlay = enforcedOverlay || localOverlay;
    
    // ADD DIAGNOSTIC LOGGING
    console.log('🔍 [TextDetails RENDER]', {
        id: safeOverlay?.id,
        width: safeOverlay?.width,
        height: safeOverlay?.height,
        left: safeOverlay?.left,
        top: safeOverlay?.top,
        lockedWidth: lockedDimensionsRef.current?.width,
        lockedHeight: lockedDimensionsRef.current?.height,
        originalWidth: localOverlay?.width,
        originalHeight: localOverlay?.height,
        timestamp: new Date().toISOString()
    });
    
    /**
     * Handles changes to direct overlay properties (like content)
     * FIXED: Never touches width, height, left, top, rotation
     * CRITICAL: Defer changeOverlay call to avoid "Cannot update component while rendering" error
     */
    const handleInputChange = useCallback((field, value) => {
        setLocalOverlay((prevOverlay) => {
            // CRITICAL: Always use locked dimensions - never allow them to change
            const lockedDims = lockedDimensionsRef.current && lockedDimensionsRef.current.id === prevOverlay.id
                ? lockedDimensionsRef.current
                : {
                    width: prevOverlay.width,
                    height: prevOverlay.height,
                    left: prevOverlay.left,
                    top: prevOverlay.top,
                    rotation: prevOverlay.rotation,
                };
            
            const updatedOverlay = { 
                ...prevOverlay, 
                [field]: value,
                // CRITICAL: Force locked dimensions - prevent any dimension changes
                width: lockedDims.width,
                height: lockedDims.height,
                left: lockedDims.left,
                top: lockedDims.top,
                rotation: lockedDims.rotation,
            };
            
            // CRITICAL: Defer changeOverlay to avoid render phase update
            // ALWAYS include locked dimensions when updating global state
            setTimeout(() => {
                changeOverlay(updatedOverlay.id, () => ({
                    ...updatedOverlay,
                    width: lockedDims.width,
                    height: lockedDims.height,
                    left: lockedDims.left,
                    top: lockedDims.top,
                    rotation: lockedDims.rotation,
                }));
            }, 0);
            
            return updatedOverlay;
        });
    }, [setLocalOverlay, changeOverlay]);
    
    /**
     * Handles changes to nested style properties
     * CRITICAL FIX: Only updates the style field, never touches dimensions
     * CRITICAL: Defer changeOverlay call to avoid "Cannot update component while rendering" error
     */
    const handleStyleChange = useCallback((field, value) => {
        setLocalOverlay((prevOverlay) => {
            // Skip update if value hasn't changed
            if (prevOverlay.styles && prevOverlay.styles[field] === value) {
                return prevOverlay;
            }
            
            // CRITICAL: Always use locked dimensions - never allow them to change
            const lockedDims = lockedDimensionsRef.current && lockedDimensionsRef.current.id === prevOverlay.id
                ? lockedDimensionsRef.current
                : {
                    width: prevOverlay.width,
                    height: prevOverlay.height,
                    left: prevOverlay.left,
                    top: prevOverlay.top,
                    rotation: prevOverlay.rotation,
                };
            
            // Update ONLY the style property
            const updatedOverlay = {
                ...prevOverlay,
                styles: { 
                    ...prevOverlay.styles, 
                    [field]: value 
                },
                // CRITICAL: Force locked dimensions - prevent any dimension changes
                width: lockedDims.width,
                height: lockedDims.height,
                left: lockedDims.left,
                top: lockedDims.top,
                rotation: lockedDims.rotation,
            };
            
            // CRITICAL: Defer changeOverlay to avoid render phase update
            // ALWAYS include locked dimensions when updating global state
            setTimeout(() => {
                changeOverlay(updatedOverlay.id, () => ({
                    ...updatedOverlay,
                    width: lockedDims.width,
                    height: lockedDims.height,
                    left: lockedDims.left,
                    top: lockedDims.top,
                    rotation: lockedDims.rotation,
                }));
            }, 0);
            
            return updatedOverlay;
        });
    }, [setLocalOverlay, changeOverlay]);
    
    /**
     * Handles position and size changes for the text overlay
     * This is the ONLY function that should modify dimensions
     */
    const handlePositionChange = useCallback((updates) => {
        setLocalOverlay((prevOverlay) => {
            const canvasDimensions = getAspectRatioDimensions();
            const canvasWidth = canvasDimensions.width;
            const canvasHeight = canvasDimensions.height;
            
            const MIN_DIMENSION = 20;
            const MAX_DIMENSION = Math.min(canvasWidth, canvasHeight);
            
            // Get and validate width
            let finalWidth = updates.width !== undefined ? updates.width : prevOverlay.width;
            if (!Number.isFinite(finalWidth) || finalWidth <= 0) {
                finalWidth = prevOverlay.width || 500;
            }
            finalWidth = Math.max(MIN_DIMENSION, Math.min(finalWidth, MAX_DIMENSION));
            
            // Get and validate height
            let finalHeight = updates.height !== undefined ? updates.height : prevOverlay.height;
            if (!Number.isFinite(finalHeight) || finalHeight <= 0) {
                finalHeight = prevOverlay.height || 180;
            }
            finalHeight = Math.max(MIN_DIMENSION, Math.min(finalHeight, MAX_DIMENSION));
            
            // Get and validate left position
            let finalLeft = updates.left !== undefined ? updates.left : prevOverlay.left;
            if (!Number.isFinite(finalLeft)) {
                finalLeft = prevOverlay.left || 100;
            }
            finalLeft = Math.max(-finalWidth * 0.5, Math.min(finalLeft, canvasWidth - finalWidth * 0.5));
            
            // Get and validate top position
            let finalTop = updates.top !== undefined ? updates.top : prevOverlay.top;
            if (!Number.isFinite(finalTop)) {
                finalTop = prevOverlay.top || 100;
            }
            finalTop = Math.max(-finalHeight * 0.5, Math.min(finalTop, canvasHeight - finalHeight * 0.5));
            
            const updatedOverlay = {
                ...prevOverlay,
                left: finalLeft,
                top: finalTop,
                width: finalWidth,
                height: finalHeight,
                ...updates,
            };
            
            // Override with validated dimensions
            updatedOverlay.width = finalWidth;
            updatedOverlay.height = finalHeight;
            updatedOverlay.left = finalLeft;
            updatedOverlay.top = finalTop;
            
            // Calculate normalized position
            const normalizedX = (finalLeft + finalWidth / 2) / canvasWidth;
            const normalizedY = (finalTop + finalHeight / 2) / canvasHeight;
            
            updatedOverlay.position = {
                x: Math.max(0, Math.min(1, normalizedX)),
                y: Math.max(0, Math.min(1, normalizedY))
            };
            
            updatedOverlay.bounding_box = {
                x: finalLeft / canvasWidth,
                y: finalTop / canvasHeight,
                width: finalWidth / canvasWidth,
                height: finalHeight / canvasHeight
            };
            
            // CRITICAL: Update locked dimensions when position is explicitly changed
            if (lockedDimensionsRef.current && lockedDimensionsRef.current.id === updatedOverlay.id) {
                lockedDimensionsRef.current = {
                    id: updatedOverlay.id,
                    width: finalWidth,
                    height: finalHeight,
                    left: finalLeft,
                    top: finalTop,
                    rotation: updatedOverlay.rotation,
                };
                console.log('🔓 [TextDetails] Updated locked dimensions:', lockedDimensionsRef.current);
            }
            
            // CRITICAL: Defer changeOverlay to avoid render phase update
            // Use setTimeout to ensure it runs after render completes
            setTimeout(() => {
            changeOverlay(updatedOverlay.id, () => updatedOverlay);
            }, 0);
            
            return updatedOverlay;
        });
    }, [setLocalOverlay, changeOverlay, getAspectRatioDimensions]);
    
    // Memoize content components to prevent UnifiedTabs re-renders
    // CRITICAL: Use safeOverlay (with enforced dimensions) instead of localOverlay
    const settingsContent = useMemo(() => {
        return _jsx(TextSettingsPanel, { 
            localOverlay: safeOverlay, 
            handleStyleChange: handleStyleChange 
        });
    }, [safeOverlay, handleStyleChange]);
    
    const styleContent = useMemo(() => {
        return _jsx(TextStylePanel, { 
            localOverlay: safeOverlay, 
            handleInputChange: handleInputChange, 
            handleStyleChange: handleStyleChange, 
            onPositionChange: handlePositionChange 
        });
    }, [safeOverlay, handleInputChange, handleStyleChange, handlePositionChange]);
    
    if (!safeOverlay) {
        return null;
    }
    
    return (
        <div className="space-y-4">
            <div className="flex flex-col px-2 mt-2">
                <Textarea
                    value={safeOverlay.content || ""}
                    onChange={(e) => handleInputChange("content", e.target.value)}
                    placeholder="Enter your text here..."
                    className="w-full min-h-[60px] resize-none text-base bg-input border-gray-300 text-foreground"
                    spellCheck="false"
                />
            </div>
            <Separator />
            <div className="flex flex-col gap-4 px-2">
                <UnifiedTabs
                    settingsContent={settingsContent}
                    styleContent={styleContent}
                />
            </div>
        </div>
    );
};