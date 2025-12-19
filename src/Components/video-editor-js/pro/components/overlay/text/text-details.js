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
    // CRITICAL: Only set lock ONCE per overlay ID - never overwrite existing lock
    useEffect(() => {
        // Only proceed if we have localOverlay AND (no lock exists OR it's a different overlay ID)
        // CRITICAL: If lock already exists for this overlay ID, NEVER update it here
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
            
            // CRITICAL: Double-check - never lock if we already have a valid lock for this overlay ID
            // This is a safety check to prevent race conditions
            if (lockedDimensionsRef.current && lockedDimensionsRef.current.id === localOverlay.id) {
                console.warn('⚠️ [TextDetails] Lock already exists for this overlay ID, preserving existing lock');
                return; // Don't overwrite existing lock
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
            // CRITICAL: Defer setLocalOverlay to avoid "Cannot update component while rendering" error
            if (localIsCanvasSize && (finalWidth !== localOverlay.width || finalHeight !== localOverlay.height)) {
                setTimeout(() => {
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
                }, 0);
                
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
        // NOTE: 'overlays' is in deps to read latest global state, but the lock check
        // (lockedDimensionsRef.current.id !== localOverlay.id) ensures lock is only set once per overlay ID
    }, [localOverlay?.id, getAspectRatioDimensions, overlays, changeOverlay]);
    
    // CRITICAL: Enforce locked dimensions on every render to prevent dimension changes
    // NEVER update the lock - only enforce the existing lock
    // The lock is ONLY updated in handlePositionChange
    const prevEnforcedRef = useRef(null);
    useEffect(() => {
        if (!localOverlay || !lockedDimensionsRef.current || lockedDimensionsRef.current.id !== localOverlay.id) {
            prevEnforcedRef.current = null;
            return;
        }
        
        // CRITICAL: Never update lockedDimensionsRef - only read and enforce it
        const lockedDims = lockedDimensionsRef.current;
        const currentDims = {
            width: localOverlay.width,
            height: localOverlay.height,
            left: localOverlay.left,
            top: localOverlay.top,
            rotation: localOverlay.rotation,
        };
        
        // Check if dimensions changed from locked values
        const dimensionsChanged = 
            currentDims.width !== lockedDims.width ||
            currentDims.height !== lockedDims.height ||
            currentDims.left !== lockedDims.left ||
            currentDims.top !== lockedDims.top ||
            currentDims.rotation !== lockedDims.rotation;
        
        // CRITICAL: Always enforce locked dimensions if they differ
        // Use a ref to track if we've already enforced in this effect run to prevent infinite loops
        const enforceKey = `${localOverlay.id}-${lockedDims.width}-${lockedDims.height}-${lockedDims.left}-${lockedDims.top}`;
        if (dimensionsChanged && prevEnforcedRef.current !== enforceKey) {
            console.warn('⚠️ [TextDetails] Dimensions changed! Enforcing locked dimensions:', {
                current: currentDims,
                locked: lockedDims
            });
            
            prevEnforcedRef.current = enforceKey;
            
            // CRITICAL: Defer setLocalOverlay to avoid "Cannot update component while rendering" error
            // This ensures we don't update parent component state during render phase
            setTimeout(() => {
                setLocalOverlay((prev) => {
                    if (!prev || prev.id !== localOverlay.id) return prev;
                    // Double-check dimensions are actually different before updating
                    if (prev.width === lockedDims.width && 
                        prev.height === lockedDims.height && 
                        prev.left === lockedDims.left && 
                        prev.top === lockedDims.top && 
                        prev.rotation === lockedDims.rotation) {
                        return prev; // Already correct
                    }
                    return {
                        ...prev,
                        width: lockedDims.width,
                        height: lockedDims.height,
                        left: lockedDims.left,
                        top: lockedDims.top,
                        rotation: lockedDims.rotation,
                    };
                });
            }, 0);
            
            // Also update global state to ensure consistency
            setTimeout(() => {
                changeOverlay(localOverlay.id, (current) => {
                    // Double-check dimensions are actually different before updating
                    if (current.width === lockedDims.width && 
                        current.height === lockedDims.height && 
                        current.left === lockedDims.left && 
                        current.top === lockedDims.top && 
                        current.rotation === lockedDims.rotation) {
                        return current; // Already correct
                    }
                    return {
                        ...current,
                        width: lockedDims.width,
                        height: lockedDims.height,
                        left: lockedDims.left,
                        top: lockedDims.top,
                        rotation: lockedDims.rotation,
                    };
                });
            }, 0);
        }
    }, [localOverlay?.width, localOverlay?.height, localOverlay?.left, localOverlay?.top, localOverlay?.rotation, localOverlay?.id, changeOverlay]);
    
    // CRITICAL: Create a memoized overlay that ALWAYS uses locked dimensions
    // This ensures dimensions never change, even if localOverlay has wrong values
    // We use lockVersion to trigger recalculation when lock changes
    
    // CRITICAL: Store the last enforced overlay to maintain reference stability
    // This prevents unnecessary re-renders of child components during tab changes
    const lastEnforcedOverlayRef = useRef(null);
    const lastEnforcedOverlayKeyRef = useRef(null);
    
    const enforcedOverlay = useMemo(() => {
        if (!localOverlay) {
            lastEnforcedOverlayRef.current = null;
            lastEnforcedOverlayKeyRef.current = null;
            return null;
        }
        
        // CRITICAL: Always use locked dimensions if they exist
        // The lock is set by the first useEffect when overlay is first loaded
        // NEVER update the lock here - only use it
        // If lock doesn't exist yet, use current dimensions (lock will be set by first useEffect soon)
        const lockedDims = (lockedDimensionsRef.current && lockedDimensionsRef.current.id === localOverlay.id)
            ? lockedDimensionsRef.current // Lock exists - always use it (this is the source of truth)
            : { // No lock yet - use current dimensions temporarily (first useEffect will set lock)
                width: localOverlay.width || 512,
                height: localOverlay.height || 72,
                left: localOverlay.left || 64,
                top: localOverlay.top || 72,
                rotation: localOverlay.rotation || 0,
            };
        
        // Create a stable key based on what actually matters for the overlay
        // This helps us maintain object reference stability
        const overlayKey = JSON.stringify({
            id: localOverlay.id,
            content: localOverlay.content,
            styles: localOverlay.styles,
            width: lockedDims.width,
            height: lockedDims.height,
            left: lockedDims.left,
            top: lockedDims.top,
            rotation: lockedDims.rotation,
            lockVersion: lockVersion,
        });
        
        // If the key hasn't changed, return the previous object to maintain reference stability
        // This prevents unnecessary re-renders during tab changes
        if (lastEnforcedOverlayKeyRef.current === overlayKey && lastEnforcedOverlayRef.current) {
            return lastEnforcedOverlayRef.current;
        }
        
        // Always use locked dimensions, never use localOverlay dimensions directly
        // CRITICAL: Spread localOverlay first to get all other properties, then override with locked dimensions
        const newEnforcedOverlay = {
            ...localOverlay,
            width: lockedDims.width,
            height: lockedDims.height,
            left: lockedDims.left,
            top: lockedDims.top,
            rotation: lockedDims.rotation,
        };
        
        // Store for next comparison
        lastEnforcedOverlayRef.current = newEnforcedOverlay;
        lastEnforcedOverlayKeyRef.current = overlayKey;
        
        return newEnforcedOverlay;
    }, [
        localOverlay?.id, // Only recalculate when overlay ID changes
        localOverlay?.content, // Or when content changes
        localOverlay?.styles, // Or when styles change (shallow comparison)
        lockVersion, // Or when lock version changes
        // NOTE: getAspectRatioDimensions is NOT needed here - canvas size check only happens in first useEffect
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