import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * VideoPreview Component
 *
 * A reusable component for displaying video overlay previews.
 * Shows the video thumbnail with proper aspect ratio and styling.
 *
 * @component
 */
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "../../ui/button";
/**
 * VideoPreview component for displaying video overlay thumbnails
 */
export const VideoPreview = ({ overlay, className = "", onChangeVideo, }) => {
    var _a, _b, _c;
    const [isHovered, setIsHovered] = useState(false);
    if (!overlay.content) {
        return null;
    }
    return (_jsxs("div", { className: `relative aspect-16/5 overflow-hidden rounded-sm border border-border bg-transparent group ${className}`, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), children: [_jsx("img", { src: overlay.content, alt: "Video preview", className: "absolute inset-0 w-full h-full object-contain transition-transform duration-200 group-hover:scale-105", style: {
                    filter: ((_a = overlay.styles) === null || _a === void 0 ? void 0 : _a.filter) || 'none',
                    opacity: (_c = (_b = overlay.styles) === null || _b === void 0 ? void 0 : _b.opacity) !== null && _c !== void 0 ? _c : 1,
                } }), onChangeVideo && (_jsx("div", { className: `absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`, children: _jsxs(Button, { onClick: onChangeVideo, variant: "secondary", size: "sm", className: "bg-white/90 hover:bg-white text-gray-900", children: [_jsx(RefreshCw, { className: "w-3 h-3" }), "Change Video"] }) }))] }));
};
