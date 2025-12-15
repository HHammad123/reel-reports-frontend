import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from 'react';
import { Video, Loader2 } from 'lucide-react';
import { TimelineItemLabel } from './timeline-item-label';
export const VideoItemContent = ({ label, data, itemWidth, isHovering = false, onThumbnailDisplayChange }) => {
    const thumbnails = data === null || data === void 0 ? void 0 : data.thumbnails;
    const isLoadingThumbnails = data === null || data === void 0 ? void 0 : data.isLoadingThumbnails;
    const thumbnailError = data === null || data === void 0 ? void 0 : data.thumbnailError;
    const showLabelOnHover = false;
    // Determine if we're showing thumbnails
    const isShowingThumbnails = thumbnails && thumbnails.length > 0 && !isLoadingThumbnails;
    // Notify parent component when thumbnail display state changes
    React.useEffect(() => {
        onThumbnailDisplayChange === null || onThumbnailDisplayChange === void 0 ? void 0 : onThumbnailDisplayChange(!!isShowingThumbnails);
    }, [isShowingThumbnails, onThumbnailDisplayChange]);
    // If we have thumbnails and enough width to display them meaningfully
    if (isShowingThumbnails) {
        const thumbnailWidth = itemWidth / thumbnails.length;
        return (_jsxs("div", { className: "flex items-center h-full w-full overflow-hidden relative rounded-[3px]", children: [_jsx("div", { className: "flex-1 flex h-full", children: thumbnails.map((thumbnail, index) => (_jsx("div", { className: "shrink-0 h-full last:border-r-0 overflow-hidden relative", style: { width: thumbnailWidth }, children: _jsx("img", { src: thumbnail, alt: `Frame ${index + 1}`, className: "absolute inset-0 w-full h-full object-cover opacity-90", style: {
                                imageRendering: 'crisp-edges'
                            } }) }, index))) }), (isHovering || itemWidth < 80) && showLabelOnHover && ( // Reduced from 120 to 80px to better accommodate higher thumbnail density
                _jsx("div", { className: "absolute inset-0 bg-white/10 backdrop-blur-xs", children: _jsx(TimelineItemLabel, { icon: Video, label: "VIDEO", defaultLabel: "VIDEO", isHovering: isHovering }) }))] }));
    }
    // Show loading state
    if (isLoadingThumbnails && ((data === null || data === void 0 ? void 0 : data.src) || (data === null || data === void 0 ? void 0 : data.originalUrl))) {
        return (_jsx(TimelineItemLabel, { icon: Loader2, label: "Loading...", defaultLabel: "VIDEO", iconClassName: "w-4 h-4 animate-spin text-white/60", isHovering: isHovering }));
    }
    // Show error state if thumbnail generation failed
    if (thumbnailError) {
        return (_jsx(TimelineItemLabel, { icon: Video, label: "VIDEO", defaultLabel: "VIDEO", iconClassName: "w-4 h-4 text-red-400", isHovering: isHovering }));
    }
    // Fallback to simple label (no video source or small width)
    return (_jsx(TimelineItemLabel, { icon: Video, label: label, defaultLabel: "VIDEO", isHovering: isHovering }));
};
