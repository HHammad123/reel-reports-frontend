import { jsx as _jsx } from "react/jsx-runtime";
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
    const handleStyleChange = (updates) => {
        const updatedOverlay = {
            ...localOverlay,
            styles: {
                ...localOverlay.styles,
                ...updates,
            },
        };
        setLocalOverlay(updatedOverlay);
    };
    return (_jsx("div", { className: "space-y-4", children: _jsx(UnifiedTabs, { settingsContent: _jsx(StickerSettingsPanel, { localOverlay: localOverlay, handleStyleChange: handleStyleChange }), styleContent: _jsx(StickerStylesPanel, {}) }) }));
};
