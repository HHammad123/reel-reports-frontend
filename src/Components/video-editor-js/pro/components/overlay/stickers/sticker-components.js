import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Base sticker component for simple shapes and icons
 */
export const BaseStickerComponent = ({ overlay, isSelected, }) => {
    var _a, _b, _c, _d, _e;
    const stickerStyle = {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.min(overlay.width, overlay.height) * 0.6,
        color: ((_a = overlay.styles) === null || _a === void 0 ? void 0 : _a.fill) || "#000000",
        backgroundColor: ((_b = overlay.styles) === null || _b === void 0 ? void 0 : _b.stroke) || "transparent",
        borderRadius: "8px",
        border: isSelected ? "2px solid #3b82f6" : "none",
        opacity: ((_c = overlay.styles) === null || _c === void 0 ? void 0 : _c.opacity) || 1,
        transform: `scale(${((_d = overlay.styles) === null || _d === void 0 ? void 0 : _d.scale) || 1}) rotate(${overlay.rotation || 0}deg)`,
        filter: ((_e = overlay.styles) === null || _e === void 0 ? void 0 : _e.filter) || "none",
        cursor: "pointer",
        userSelect: "none",
        transition: "all 0.2s ease-in-out",
    };
    return (_jsx("div", { style: stickerStyle, children: _jsx("span", { children: overlay.content }) }));
};
/**
 * SVG-based sticker component for more complex graphics
 */
export const SVGStickerComponent = ({ overlay, isSelected, svgContent, }) => {
    var _a, _b, _c, _d, _e, _f;
    const containerStyle = {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        border: isSelected ? "2px solid #3b82f6" : "none",
        opacity: ((_a = overlay.styles) === null || _a === void 0 ? void 0 : _a.opacity) || 1,
        transform: `scale(${((_b = overlay.styles) === null || _b === void 0 ? void 0 : _b.scale) || 1}) rotate(${overlay.rotation || 0}deg)`,
        filter: ((_c = overlay.styles) === null || _c === void 0 ? void 0 : _c.filter) || "none",
        cursor: "pointer",
        transition: "all 0.2s ease-in-out",
    };
    return (_jsx("div", { style: containerStyle, children: _jsx("div", { dangerouslySetInnerHTML: { __html: svgContent }, style: {
                width: "100%",
                height: "100%",
                fill: ((_d = overlay.styles) === null || _d === void 0 ? void 0 : _d.fill) || "currentColor",
                stroke: (_e = overlay.styles) === null || _e === void 0 ? void 0 : _e.stroke,
                strokeWidth: (_f = overlay.styles) === null || _f === void 0 ? void 0 : _f.strokeWidth,
            } }) }));
};
/**
 * Animated sticker component for dynamic effects
 */
export const AnimatedStickerComponent = ({ overlay, isSelected, animationType, }) => {
    var _a, _b, _c, _d, _e;
    const getAnimationClass = () => {
        switch (animationType) {
            case "pulse":
                return "animate-pulse";
            case "bounce":
                return "animate-bounce";
            case "spin":
                return "animate-spin";
            case "ping":
                return "animate-ping";
            default:
                return "";
        }
    };
    const stickerStyle = {
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: Math.min(overlay.width, overlay.height) * 0.6,
        color: ((_a = overlay.styles) === null || _a === void 0 ? void 0 : _a.fill) || "#000000",
        backgroundColor: ((_b = overlay.styles) === null || _b === void 0 ? void 0 : _b.stroke) || "transparent",
        borderRadius: "8px",
        border: isSelected ? "2px solid #3b82f6" : "none",
        opacity: ((_c = overlay.styles) === null || _c === void 0 ? void 0 : _c.opacity) || 1,
        transform: `scale(${((_d = overlay.styles) === null || _d === void 0 ? void 0 : _d.scale) || 1}) rotate(${overlay.rotation || 0}deg)`,
        filter: ((_e = overlay.styles) === null || _e === void 0 ? void 0 : _e.filter) || "none",
        cursor: "pointer",
        userSelect: "none",
    };
    return (_jsx("div", { style: stickerStyle, className: getAnimationClass(), children: _jsx("span", { children: overlay.content }) }));
};
