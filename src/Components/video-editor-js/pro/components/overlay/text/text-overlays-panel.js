import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { OverlayType } from "../../../types";
import { TextDetails } from "./text-details";
import { SelectTextOverlay } from "./select-text-overlay";

export const TextOverlaysPanel = () => {
    const { selectedOverlayId, overlays } = useEditorContext();
    const [localOverlay, setLocalOverlay] = useState(null);
    
    // Track previous selectedOverlayId to prevent unnecessary updates
    const prevSelectedIdRef = useRef(selectedOverlayId);
    const prevOverlayIdRef = useRef(null);
    
    // Track current localOverlay in ref to avoid dependency issues
    const localOverlayRef = useRef(localOverlay);
    localOverlayRef.current = localOverlay;
    
    // CRITICAL FIX: Only update when selectedOverlayId changes, not when overlays array is recreated
    useEffect(() => {
        // Only proceed if selectedOverlayId actually changed
        if (selectedOverlayId === prevSelectedIdRef.current) {
            // selectedOverlayId didn't change, skip update to prevent infinite loop
            // The localOverlay will be updated by handleSetLocalOverlay when user makes changes
            return;
        }
        
        // selectedOverlayId changed - update
        prevSelectedIdRef.current = selectedOverlayId;
        
        if (selectedOverlayId === null) {
            setLocalOverlay(null);
            prevOverlayIdRef.current = null;
            return;
        }
        
        const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId);
        if (selectedOverlay && selectedOverlay.type === OverlayType.TEXT) {
            setLocalOverlay(selectedOverlay);
            prevOverlayIdRef.current = selectedOverlay.id;
        } else {
            setLocalOverlay(null);
            prevOverlayIdRef.current = null;
        }
    }, [selectedOverlayId, overlays]);
    
    // Memoize callback to prevent recreation
    const handleSetLocalOverlay = useCallback((overlay) => {
        setLocalOverlay(overlay);
        if (overlay) {
            prevOverlayIdRef.current = overlay.id;
        }
    }, []);
    
    const isValidTextOverlay = localOverlay && selectedOverlayId !== null;
    return (_jsx(_Fragment, { children: !isValidTextOverlay ? (_jsx(SelectTextOverlay, {})) : (_jsx(TextDetails, { localOverlay: localOverlay, setLocalOverlay: handleSetLocalOverlay })) }));
};
