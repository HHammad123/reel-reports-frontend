import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { captionTemplates } from "../../../templates/caption-templates";
/**
 * CaptionStylePanel Component
 *
 * @component
 * @description
 * Provides a visual interface for selecting and customizing caption styles.
 * Features include:
 * - Pre-defined style templates
 * - Live preview of styles
 * - Color palette visualization
 * - Active state indication
 *
 * Each template includes:
 * - Preview text with highlight example
 * - Template name and status
 * - Color scheme visualization
 *
 * @example
 * ```tsx
 * <CaptionStylePanel
 *   localOverlay={captionOverlay}
 *   setLocalOverlay={handleStyleUpdate}
 * />
 * ```
 */
export const CaptionStylePanel = ({ localOverlay, setLocalOverlay, }) => {
    return (_jsx("div", { className: "space-y-3", children: _jsx("div", { className: "grid grid-cols-1 gap-3", children: Object.entries(captionTemplates).map(([templateId, template]) => {
                var _a, _b;
                const isActive = (localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.template) === templateId;
                const highlightColor = (_b = template.styles.highlightStyle) === null || _b === void 0 ? void 0 : _b.backgroundColor;
                const colorIndicators = [
                    _jsx("div", { key: "white", className: "w-3 h-3 rounded-full border border-white/30", style: { backgroundColor: "#FFFFFF" } })
                ];
                if (highlightColor) {
                    colorIndicators.push(_jsx("div", { key: "highlight", className: `w-3 h-3 rounded-full border border-white/30 ${isActive ? "ring-2 ring-primary ring-offset-1" : ""}`, style: { backgroundColor: highlightColor } }));
                }
                return (_jsxs("button", { key: templateId, onClick: () => {
                        const updatedOverlay = {
                            ...localOverlay,
                            template: templateId,
                            styles: template.styles,
                        };
                        setLocalOverlay(updatedOverlay);
                    }, className: `group relative overflow-hidden flex flex-col rounded-lg transition-all duration-200 border w-[300px]
              ${isActive
                        ? "border-primary border-2"
                        : "border-gray-300 hover:border-gray-400"}`, children: [_jsx("div", { className: "relative w-full overflow-hidden rounded-t-lg", style: {
                            backgroundColor: "#eee",
                            minHeight: "120px",
                            padding: "40px 20px"
                        }, children: _jsx("div", { className: "flex items-center justify-center", children: _jsxs("span", { style: {
                                        ...template.styles,
                                        fontSize: "1.1rem",
                                        lineHeight: "1.4",
                                        color: "#FFFFFF",
                                    }, children: ["Let's ", _jsx("span", { style: {
                                                ...template.styles.highlightStyle,
                                                transform: `scale(${((_a = template.styles.highlightStyle) === null || _a === void 0 ? void 0 : _a.scale) || 1})`,
                                                display: "inline-block",
                                            }, children: "start" }), " with a demo of your caption."] }) }) }), _jsxs("div", { className: "flex items-center justify-between px-4 py-3 rounded-b-lg bg-white", style: {
                            backgroundColor: "#eee",
                            borderTop: "1px solid var(--primary)"
                        }, children: [_jsx("span", { className: "text-sm font-medium text-white", children: template.name }), _jsx("div", { className: "flex items-center gap-2", children: colorIndicators })] })] }));
            }) }) }));
};
