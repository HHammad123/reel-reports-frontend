import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Image } from 'lucide-react';
import { TimelineItemLabel } from './timeline-item-label';
export const ImageItemContent = ({ label, data, itemWidth, isHovering = false // Default to false
 }) => {
    // Get the image source - prioritize src from overlay data, then fall back to thumbnailUrl or originalUrl
    const imageSource = (data === null || data === void 0 ? void 0 : data.src) || (data === null || data === void 0 ? void 0 : data.thumbnailUrl) || (data === null || data === void 0 ? void 0 : data.originalUrl);
    // If we have an image source and enough width to display it meaningfully
    if (imageSource && itemWidth > 60) {
        return (_jsxs("div", { className: "flex items-center h-full w-full overflow-hidden relative rounded-[3px]", children: [_jsx("div", { className: "h-full aspect-square shrink-0 mr-2", children: _jsx("div", { className: "h-full w-full flex items-center py-2 relative", children: _jsx("img", { src: imageSource, alt: "", draggable: false, onDragStart: (e) => e.preventDefault(), className: "absolute inset-0 w-full h-full rounded-[1px] ml-6 object-cover" }) }) }), _jsx("div", { className: "flex-1 min-w-0", children: _jsx(TimelineItemLabel, { icon: Image, label: "IMAGE", defaultLabel: "IMAGE", isHovering: isHovering }) })] }));
    }
    // Fallback to simple label (no image source or small width)
    return (_jsx(TimelineItemLabel, { icon: Image, label: label, defaultLabel: "IMAGE", isHovering: isHovering }));
};
