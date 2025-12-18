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
    
    // Track lock version to trigger enforcedOverlay recalculation when lock changes
    const [lockVersion, setLockVersion] = useState(0);
    
    // Lock dimensions when localOverlay is first set
    // CRITICAL FIX: Never lock canvas size dimensions. Always use actual dimensions from overlay.
    useEffect(() => {
        if (localOverlay && (!lockedDimensionsRef.current || lockedDimensionsRef.current.id !== localOverlay.id)) {
            const canvasDimensions = getAspectRatioDimensions();
            const canvasWidth = canvasDimensions.width;
            const canvasHeight = canvasDimensions.height;
            
            // CRITICAL: Check if localOverlay dimensions match canvas size (likely wrong defaults)
            // This works for both 9:16 (1080x1080) and 16:9 (1920x1080) videos
            const localIsCanvasSize = 
                (localOverlay.width === canvasWidth && localOverlay.height === canvasHeight);
            
            // CRITICAL: Always check global state FIRST if local has canvas size
            // Global state is the source of truth for actual dimensions
            let finalWidth, finalHeight, finalLeft, finalTop;
            
            if (localIsCanvasSize) {
                // Local has canvas size - try to get correct dimensions from global state
                const globalOverlay = overlays.find(o => o.id === localOverlay.id);
                
                // Check if global has reasonable (non-canvas-size) dimensions
                if (globalOverlay && 
                    globalOverlay.width !== canvasWidth && 
                    globalOverlay.height !== canvasHeight &&
                    globalOverlay.width > 0 && 
                    globalOverlay.height > 0 &&
                    globalOverlay.width < canvasWidth * 0.9 &&  // Reasonable size check
                    globalOverlay.height < canvasHeight * 0.9) {
                    // Use dimensions from global state (they're the correct ones)
                    finalWidth = globalOverlay.width;
                    finalHeight = globalOverlay.height;
                    finalLeft = globalOverlay.left;
                    finalTop = globalOverlay.top;
                    console.log('✅ [TextDetails] Using dimensions from global state (local had canvas size):', {
                        width: finalWidth,
                        height: finalHeight,
                        left: finalLeft,
                        top: finalTop,
                        localWidth: localOverlay.width,
                        localHeight: localOverlay.height,
                    });
                } else {
                    // Both local and global have canvas size - use fallbacks
                    finalWidth = 512;
                    finalHeight = 72;
                    finalLeft = (globalOverlay && Number.isFinite(globalOverlay.left)) ? globalOverlay.left : (localOverlay.left || 64);
                    finalTop = (globalOverlay && Number.isFinite(globalOverlay.top)) ? globalOverlay.top : (localOverlay.top || 72);
                    console.warn('⚠️ [TextDetails] Canvas size in both local and global, using fallbacks:', {
                        width: finalWidth,
                        height: finalHeight,
                        left: finalLeft,
                        top: finalTop,
                    });
                }
            } else {
                // Local dimensions are NOT canvas size - they're likely correct, use them
                finalWidth = (Number.isFinite(localOverlay.width) && localOverlay.width > 0 && localOverlay.width < canvasWidth * 0.9) 
                    ? localOverlay.width 
                    : 512;
                finalHeight = (Number.isFinite(localOverlay.height) && localOverlay.height > 0 && localOverlay.height < canvasHeight * 0.9) 
                    ? localOverlay.height 
                    : 72;
                finalLeft = Number.isFinite(localOverlay.left) 
                    ? localOverlay.left 
                    : 64;
                finalTop = Number.isFinite(localOverlay.top) 
                    ? localOverlay.top 
                    : 72;
            }
            
            // CRITICAL: NEVER lock canvas size dimensions - always use reasonable dimensions
            // Check against actual canvas dimensions (works for any aspect ratio)
            const finalIsCanvasSize = (finalWidth === canvasWidth && finalHeight === canvasHeight);
            if (finalIsCanvasSize) {
                console.error('❌ [TextDetails] CRITICAL: Attempted to lock canvas size dimensions! Using fallbacks instead.');
                finalWidth = 512;
                finalHeight = 72;
                finalLeft = localOverlay.left || 64;
                finalTop = localOverlay.top || 72;
            }
            
            // Lock the dimensions (guaranteed to be non-canvas-size at this point)
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
                originalLocalWidth: localOverlay.width,
                originalLocalHeight: localOverlay.height,
                localWasCanvasSize: localIsCanvasSize,
            });
            
            // Trigger enforcedOverlay recalculation by updating lockVersion
            setLockVersion(v => v + 1);
            
            // If we corrected dimensions, update local and global state
            if (localIsCanvasSize && (finalWidth !== localOverlay.width || finalHeight !== localOverlay.height)) {
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
    // BUT: If locked dimensions are canvas size, check global state for correct dimensions and update lock
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
        // This works for both 9:16 (1080x1080) and 16:9 (1920x1080) videos
        const lockedIsCanvasSize = 
            (lockedDims.width === canvasWidth && lockedDims.height === canvasHeight);
        
        // CRITICAL: If locked dimensions are canvas size, check global state for correct dimensions
        if (lockedIsCanvasSize) {
            const globalOverlay = overlays.find(o => o.id === localOverlay.id);
            
            // Check if global state has reasonable (non-canvas-size) dimensions
            if (globalOverlay && 
                globalOverlay.width !== canvasWidth && 
                globalOverlay.height !== canvasHeight &&
                globalOverlay.width > 0 && 
                globalOverlay.height > 0 &&
                globalOverlay.width < canvasWidth * 0.9 && 
                globalOverlay.height < canvasHeight * 0.9) {
                
                // Use dimensions from global state (they're the correct ones)
                const correctDims = {
                    width: globalOverlay.width,
                    height: globalOverlay.height,
                    left: globalOverlay.left,
                    top: globalOverlay.top,
                    rotation: globalOverlay.rotation || lockedDims.rotation,
                };
                
                console.log('✅ [TextDetails] Updating lock from canvas size to global state dimensions:', {
                    oldLock: lockedDims,
                    newLock: correctDims,
                });
                
                // Update the lock to the correct dimensions from global state
                lockedDimensionsRef.current = {
                    id: localOverlay.id,
                    ...correctDims,
                };
                
                // Also update localOverlay to match
                setLocalOverlay((prev) => {
                    if (!prev || prev.id !== localOverlay.id) return prev;
                    return {
                        ...prev,
                        ...correctDims,
                    };
                });
                
                // Update global state to ensure consistency (though it should already be correct)
                setTimeout(() => {
                    changeOverlay(localOverlay.id, (current) => ({
                        ...current,
                        ...correctDims,
                    }));
                }, 0);
                
                prevDimsRef.current = { ...correctDims };
                
                // Trigger enforcedOverlay recalculation by updating lockVersion
                setLockVersion(v => v + 1);
                
                return; // Don't enforce, dimensions are now correct
            }
        }
        
        // Check if current dimensions are reasonable (not canvas size)
        // This works for both 9:16 (1080x1080) and 16:9 (1920x1080) videos
        const currentIsCanvasSize = 
            (currentDims.width === canvasWidth && currentDims.height === canvasHeight);
        
        const currentIsReasonable = 
            !currentIsCanvasSize &&
            currentDims.width > 0 && 
            currentDims.height > 0 &&
            currentDims.width < canvasWidth * 0.9 && 
            currentDims.height < canvasHeight * 0.9 &&
            Number.isFinite(currentDims.width) &&
            Number.isFinite(currentDims.height);
        
        // CRITICAL: If locked dimensions are reasonable but current is canvas size, enforce locked (don't update lock to canvas size)
        if (!lockedIsCanvasSize && currentIsCanvasSize) {
            console.warn('⚠️ [TextDetails] Current dimensions are canvas size but locked are reasonable - enforcing locked dimensions:', {
                current: currentDims,
                locked: lockedDims
            });
            // Fall through to enforcement below - don't update lock
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
    }, [localOverlay?.width, localOverlay?.height, localOverlay?.left, localOverlay?.top, localOverlay?.rotation, localOverlay?.id, changeOverlay, getAspectRatioDimensions, overlays]);
    
    // CRITICAL: Create a memoized overlay that ALWAYS uses locked dimensions
    // This ensures dimensions never change, even if localOverlay has wrong values
    // We use lockVersion to trigger recalculation when lock changes
    
    const enforcedOverlay = useMemo(() => {
        if (!localOverlay) return null;
        
        const canvasDimensions = getAspectRatioDimensions();
        const canvasWidth = canvasDimensions.width;
        const canvasHeight = canvasDimensions.height;
        
        // CRITICAL: Always use locked dimensions if they exist
        // The lock is set by the useEffect above, which calculates correct dimensions
        let lockedDims;
        if (lockedDimensionsRef.current && lockedDimensionsRef.current.id === localOverlay.id) {
            lockedDims = lockedDimensionsRef.current;
        } else {
            // If no lock yet, check if localOverlay has canvas size dimensions
            // This works for both 9:16 (1080x1080) and 16:9 (1920x1080) videos
            const localIsCanvasSize = 
                (localOverlay.width === canvasWidth && localOverlay.height === canvasHeight);
            
            if (localIsCanvasSize) {
                // CRITICAL: Never use canvas size dimensions, use fallbacks instead
                lockedDims = {
                    width: 512,
                    height: 72,
                    left: localOverlay.left || 64,
                    top: localOverlay.top || 72,
                    rotation: localOverlay.rotation || 0,
                };
                console.warn('⚠️ [TextDetails] enforcedOverlay: localOverlay has canvas size, using fallbacks:', lockedDims);
            } else {
                // Use current dimensions as fallback (they're reasonable)
                lockedDims = {
                    width: localOverlay.width,
                    height: localOverlay.height,
                    left: localOverlay.left,
                    top: localOverlay.top,
                    rotation: localOverlay.rotation || 0,
                };
            }
        }
        
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
        getAspectRatioDimensions,
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
                // Trigger enforcedOverlay recalculation
                setLockVersion(v => v + 1);
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