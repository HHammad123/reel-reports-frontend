import { jsx as _jsx } from "react/jsx-runtime";
import { TextLayerContent } from "./components/text-layer-content";
import { OverlayType } from "../../types";
import { CaptionLayerContent } from "./components/caption-layer-content";
import { VideoLayerContent } from "./components/video-layer-content";
import { ImageLayerContent } from "./components/image-layer-content";
import { SoundLayerContent } from "./components/sound-layer-content";
import { StickerLayerContent } from "./components/sticker-layer-content";
import { ShapeLayerContent } from "./components/shape-layer-content";
/**
 * LayerContent Component
 *
 * @component
 * @description
 * A component that renders different types of content layers in the video editor.
 * It acts as a switch component that determines which specific layer component
 * to render based on the overlay type.
 *
 * Supported overlay types:
 * - VIDEO: Renders video content with VideoLayerContent
 * - TEXT: Renders text overlays with TextLayerContent
 * - SHAPE: Renders colored shapes
 * - IMAGE: Renders images with ImageLayerContent
 * - CAPTION: Renders captions with CaptionLayerContent
 * - SOUND: Renders audio elements using Remotion's Audio component
 *
 * Each layer type maintains consistent sizing through commonStyle,
 * with specific customizations applied as needed.
 *
 * @example
 * ```tsx
 * <LayerContent overlay={{
 *   type: OverlayType.TEXT,
 *   content: "Hello World",
 *   // ... other overlay properties
 * }} />
 * ```
 */
export const LayerContent = ({ overlay, baseUrl, fontInfos, }) => {
    /**
     * Common styling applied to all layer types
     * Ensures consistent dimensions across different content types
     */
    const commonStyle = {
        width: "100%",
        height: "100%",
    };
    switch (overlay.type) {
        case OverlayType.VIDEO:
            return (_jsx("div", { style: { ...commonStyle }, children: _jsx(VideoLayerContent, { overlay: overlay, ...(baseUrl && { baseUrl }) }, `video-${overlay.id}`) }));
        case OverlayType.TEXT:
            return (_jsx("div", { style: { ...commonStyle }, children: _jsx(TextLayerContent, { overlay: overlay, ...(fontInfos && { fontInfos }) }) }));
        case OverlayType.IMAGE:
            return (_jsx("div", { style: { ...commonStyle }, children: _jsx(ImageLayerContent, { overlay: overlay, ...(baseUrl && { baseUrl }) }) }));
        case OverlayType.CAPTION:
            return (_jsx("div", { style: {
                    ...commonStyle,
                    position: "relative",
                    overflow: "hidden",
                    display: "flex",
                }, children: _jsx(CaptionLayerContent, { overlay: overlay, ...(fontInfos && { fontInfos }) }) }));
        case OverlayType.STICKER:
            return (_jsx("div", { style: { ...commonStyle }, children: _jsx(StickerLayerContent, { overlay: overlay, isSelected: false }) }));
        case OverlayType.SHAPE:
            return (_jsx("div", { style: { ...commonStyle }, children: _jsx(ShapeLayerContent, { overlay: overlay }) }));
        case OverlayType.SOUND:
            return _jsx(SoundLayerContent, { overlay: overlay, ...(baseUrl && { baseUrl }) });
        default:
            return null;
    }
};
