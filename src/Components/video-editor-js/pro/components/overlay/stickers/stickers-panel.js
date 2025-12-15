import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { OverlayType } from "../../../types";
import { templatesByCategory, getStickerCategories, } from "../../../templates/sticker-templates/sticker-helpers";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { UnifiedTabs } from "../shared/unified-tabs";
import { StickerPreview } from "./sticker-preview";
import { StickerDetails } from "./sticker-details";
export function StickersPanel() {
    const { overlays, currentFrame, setOverlays, setSelectedOverlayId, selectedOverlayId, changeOverlay, } = useEditorContext();
    const { addAtPlayhead } = useTimelinePositioning();
    const stickerCategories = getStickerCategories();
    const [localOverlay, setLocalOverlay] = useState(null);
    // Track selected overlay for edit mode
    useEffect(() => {
        if (selectedOverlayId === null) {
            setLocalOverlay(null);
            return;
        }
        const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId);
        if ((selectedOverlay === null || selectedOverlay === void 0 ? void 0 : selectedOverlay.type) === OverlayType.STICKER) {
            setLocalOverlay(selectedOverlay);
        }
    }, [selectedOverlayId, overlays]);
    /**
     * Updates an existing sticker overlay's properties
     * @param updatedOverlay - The modified overlay object
     * Updates both local state and global editor context
     */
    const handleUpdateOverlay = (updatedOverlay) => {
        setLocalOverlay(updatedOverlay);
        changeOverlay(updatedOverlay.id, () => updatedOverlay);
    };
    const handleStickerClick = (templateId) => {
        var _a;
        const template = Object.values(templatesByCategory)
            .flat()
            .find((t) => t.config.id === templateId);
        if (!template)
            return;
        const { from, row, updatedOverlays } = addAtPlayhead(currentFrame, overlays, 'top');
        // Create the new overlay without an ID (we'll generate it)
        const newOverlay = {
            type: OverlayType.STICKER,
            content: template.config.id,
            category: template.config.category,
            durationInFrames: 50,
            from,
            height: 150,
            width: 150,
            left: 0,
            top: 0,
            row,
            isDragging: false,
            rotation: 0,
            styles: {
                opacity: 1,
                zIndex: 1,
                ...(_a = template.config.defaultProps) === null || _a === void 0 ? void 0 : _a.styles,
            },
        };
        // Update overlays with both the shifted overlays and the new overlay in a single operation
        const newId = updatedOverlays.length > 0 ? Math.max(...updatedOverlays.map((o) => o.id)) + 1 : 0;
        const overlayWithId = { ...newOverlay, id: newId };
        const finalOverlays = [...updatedOverlays, overlayWithId];
        setOverlays(finalOverlays);
        setSelectedOverlayId(newId);
    };
    const renderStickerContent = (category) => {
        var _a;
        return (_jsx("div", { className: "grid grid-cols-1 gap-4 pt-4 pb-4 px-2", children: (_a = templatesByCategory[category]) === null || _a === void 0 ? void 0 : _a.map((template) => (_jsx("div", { className: `
            h-[200px] w-full
            ${template.config.layout === "double" ? "col-span-1" : ""}
          `, children: _jsx(StickerPreview, { template: template, onClick: () => handleStickerClick(template.config.id) }) }, template.config.id))) }));
    };
    // If we're in edit mode, show the details panel
    if (localOverlay) {
        return (_jsx("div", { className: "flex flex-col w-full gap-4 p-2 h-full", children: _jsx(StickerDetails, { localOverlay: localOverlay, setLocalOverlay: handleUpdateOverlay }) }));
    }
    // Otherwise show the sticker selection panel with tabs at bottom
    return (_jsx("div", { className: "flex flex-col w-full h-full overflow-hidden bg-white", children: _jsx(UnifiedTabs, { tabsAtBottom: true, defaultValue: stickerCategories[0], tabs: stickerCategories.map((category) => ({
                value: category,
                label: category,
                content: (_jsx("div", { className: "w-full", children: renderStickerContent(category) })),
            })) }) }));
}
