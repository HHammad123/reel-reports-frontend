import { jsx as _jsx, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { OverlayType } from "../../../types";
import { TextDetails } from "./text-details";
import { SelectTextOverlay } from "./select-text-overlay";
export const TextOverlaysPanel = () => {
    const { selectedOverlayId, overlays } = useEditorContext();
    const [localOverlay, setLocalOverlay] = useState(null);
    // Update local overlay when selected overlay changes or when overlays change
    React.useEffect(() => {
        if (selectedOverlayId === null) {
            setLocalOverlay(null);
            return;
        }
        const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId);
        if ((selectedOverlay === null || selectedOverlay === void 0 ? void 0 : selectedOverlay.type) === OverlayType.TEXT) {
            setLocalOverlay(selectedOverlay);
        }
        else {
            // Reset localOverlay if selected overlay is not a text overlay
            setLocalOverlay(null);
        }
    }, [selectedOverlayId, overlays]);
    const handleSetLocalOverlay = (overlay) => {
        setLocalOverlay(overlay);
    };
    const isValidTextOverlay = localOverlay && selectedOverlayId !== null;
    return (_jsx(_Fragment, { children: !isValidTextOverlay ? (_jsx(SelectTextOverlay, {})) : (_jsx(TextDetails, { localOverlay: localOverlay, setLocalOverlay: handleSetLocalOverlay })) }));
};
