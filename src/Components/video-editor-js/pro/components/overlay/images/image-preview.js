import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * ImagePreview Component
 *
 * A reusable component for displaying image overlay previews.
 * Shows the image with proper aspect ratio and styling.
 *
 * @component
 */
import { useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "../../ui/button";
/**
 * ImagePreview component for displaying image overlay thumbnails
 */
export const ImagePreview = ({ overlay, className = "", onChangeImage, }) => {
    var _a, _b, _c, _d;
    const [isHovered, setIsHovered] = useState(false);
    const [imageError, setImageError] = useState(false);
    
    if (!overlay || !overlay.src) {
        console.warn("ImagePreview: No overlay or src found", overlay);
        return (_jsx("div", { className: `relative w-full min-h-[120px] overflow-hidden rounded-sm border border-border bg-muted/40 flex items-center justify-center ${className}`, children: _jsx("p", { className: "text-xs text-muted-foreground", children: "No image preview available" }) }));
    }
    
    return (_jsxs("div", { className: `relative w-full min-h-[120px] overflow-hidden rounded-sm border border-border bg-transparent group ${className}`, style: { aspectRatio: '16/9' }, onMouseEnter: () => setIsHovered(true), onMouseLeave: () => setIsHovered(false), children: [!imageError ? (_jsx("img", { src: overlay.src, alt: "Image preview", className: "absolute inset-0 w-full h-full object-cover transition-transform duration-200 group-hover:scale-105", style: {
                    filter: ((_a = overlay.styles) === null || _a === void 0 ? void 0 : _a.filter) || 'none',
                    opacity: (_c = (_b = overlay.styles) === null || _b === void 0 ? void 0 : _b.opacity) !== null && _c !== void 0 ? _c : 1,
                    objectFit: ((_d = overlay.styles) === null || _d === void 0 ? void 0 : _d.objectFit) || 'cover'
                }, onError: () => setImageError(true), onLoad: () => setImageError(false) })) : (_jsx("div", { className: "absolute inset-0 flex items-center justify-center bg-muted/20", children: _jsx("p", { className: "text-xs text-muted-foreground", children: "Failed to load image" }) })), onChangeImage && (_jsx("div", { className: `absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-sm transition-opacity duration-200 ${isHovered ? 'opacity-100' : 'opacity-0'}`, children: _jsxs(Button, { onClick: onChangeImage, variant: "secondary", size: "sm", className: "bg-white/90 hover:bg-white text-gray-900", children: [_jsx(RefreshCw, { className: "w-3 h-3" }), "Change Image"] }) }))] }));
};
