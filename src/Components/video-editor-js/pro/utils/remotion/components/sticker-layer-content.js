import { jsx as _jsx } from "react/jsx-runtime";
import { memo } from "react";
import { templateMap } from "../../../templates/sticker-templates/sticker-helpers";
export const StickerLayerContent = memo(({ overlay, isSelected, onUpdate }) => {
    const template = templateMap[overlay.content];
    if (!template) {
        console.warn(`No sticker template found for id: ${overlay.content}`);
        return null;
    }
    const { Component } = template;
    const MemoizedComponent = memo(Component);
    const props = {
        ...template.config.defaultProps,
        overlay,
        isSelected,
        ...(onUpdate && { onUpdate }),
    };
    return _jsx(MemoizedComponent, { ...props });
}, (prevProps, nextProps) => {
    var _a, _b;
    // Only re-render if these props change
    return (prevProps.overlay.content === nextProps.overlay.content &&
        prevProps.isSelected === nextProps.isSelected &&
        ((_a = prevProps.overlay.styles) === null || _a === void 0 ? void 0 : _a.opacity) === ((_b = nextProps.overlay.styles) === null || _b === void 0 ? void 0 : _b.opacity) &&
        prevProps.overlay.rotation === nextProps.overlay.rotation &&
        prevProps.overlay.width === nextProps.overlay.width &&
        prevProps.overlay.height === nextProps.overlay.height);
});
StickerLayerContent.displayName = "StickerLayerContent";
