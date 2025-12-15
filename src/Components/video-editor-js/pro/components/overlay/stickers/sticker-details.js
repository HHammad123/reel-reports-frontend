import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useMemo } from "react";
import { UnifiedTabs } from "../shared/unified-tabs";
import { StickerStylesPanel } from "./sticker-styles-panel";
import { StickerSettingsPanel } from "./sticker-settings-panel";
/**
 * StickerDetails Component
 *
 * @component
 * @description
 * Provides a tabbed interface for managing sticker settings and styles.
 * Features include:
 * - Sticker preview
 * - Style customization panel
 * - Settings configuration panel
 * - Real-time updates
 *
 * The component serves as the main configuration interface
 * for sticker overlays in the editor.
 *
 * @example
 * ```tsx
 * <StickerDetails
 *   localOverlay={stickerOverlay}
 *   setLocalOverlay={handleOverlayUpdate}
 * />
 * ```
 */
export const StickerDetails = ({ localOverlay, setLocalOverlay, }) => {
    // FIXED: Memoize callback to prevent recreation on every render
    const handleStyleChange = useCallback((updates) => {
        setLocalOverlay((prevOverlay) => {
            return {
                ...prevOverlay,
                styles: {
                    ...prevOverlay.styles,
                    ...updates,
                },
            };
        });
    }, [setLocalOverlay]);
    
    // FIXED: Memoize content components to prevent UnifiedTabs re-renders
    const settingsContent = useMemo(() => {
        return _jsx(StickerSettingsPanel, { localOverlay: localOverlay, handleStyleChange: handleStyleChange });
    }, [localOverlay, handleStyleChange]);
    
    const styleContent = useMemo(() => {
        return _jsx(StickerStylesPanel, {});
    }, []);
    
    return (_jsx("div", { className: "space-y-4", children: _jsx(UnifiedTabs, { settingsContent: settingsContent, styleContent: styleContent }) }));
};
