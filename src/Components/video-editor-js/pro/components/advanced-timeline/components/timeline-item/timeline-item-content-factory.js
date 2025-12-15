import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TrackItemType } from '../../types';
import { VideoItemContent, AudioItemContent, TextItemContent, CaptionItemContent, ImageItemContent, StickerItemContent, } from './type-components';
/**
 * Factory component that renders the appropriate type-specific content component
 * based on the timeline item's type. This provides a clean abstraction for
 * type-specific rendering while maintaining a consistent interface.
 */
export const TimelineItemContentFactory = ({ type, label, data, itemWidth, itemHeight, start, end, isHovering = false, // Default to false
onThumbnailDisplayChange, currentFrame, fps = 30, }) => {
    // Common props that all type components receive
    const commonProps = {
        label,
        data,
        itemWidth,
        itemHeight,
        start,
        end,
        isHovering, // Pass hover state to all components
        onThumbnailDisplayChange, // Pass thumbnail display callback to all components
        currentFrame, // Pass current frame to all components
        fps, // Pass fps to all components
    };
    // Select the appropriate component based on type
    switch (type) {
        case TrackItemType.VIDEO:
            return _jsx(VideoItemContent, { ...commonProps });
        case TrackItemType.AUDIO:
            return _jsx(AudioItemContent, { ...commonProps });
        case TrackItemType.TEXT:
            return _jsx(TextItemContent, { ...commonProps });
        case TrackItemType.CAPTION:
            return _jsx(CaptionItemContent, { ...commonProps });
        case TrackItemType.IMAGE:
            return _jsx(ImageItemContent, { ...commonProps });
        case TrackItemType.STICKER:
            return _jsx(StickerItemContent, { ...commonProps });
        // Handle custom/unknown types with a generic fallback
        default:
            return _jsx(DefaultItemContent, { ...commonProps, type: type });
    }
};
/**
 * Default/fallback component for unknown or custom item types
 */
const DefaultItemContent = ({ label, type, itemWidth, }) => {
    return (_jsxs("div", { className: "flex items-center h-full w-full overflow-hidden px-2", children: [_jsx("div", { className: "shrink-0 mr-2", children: _jsx("div", { className: "w-4 h-4 bg-white/40 rounded border border-white/60" }) }), _jsxs("div", { className: "flex-1 min-w-0", children: [_jsx("div", { className: "truncate text-xs font-extralight", children: label || type || 'Unknown' }), itemWidth > 80 && type && (_jsxs("div", { className: "text-xs text-white/60 truncate", children: ["Type: ", type] }))] })] }));
};
