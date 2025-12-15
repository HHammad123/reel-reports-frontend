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
    return (_jsx("div", { className: "space-y-4", children: _jsx("div", { className: "grid grid-cols-1 gap-3", children: Object.entries(captionTemplates).map(([templateId, template]) => {
                var _a, _b;
                return (_jsxs("button", { onClick: () => {
                        const updatedOverlay = {
                            ...localOverlay,
                            template: templateId,
                            styles: template.styles,
                        };
                        setLocalOverlay(updatedOverlay);
                    }, className: `group relative overflow-hidden rounded-lg transition-all duration-200
              ${(localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.template) === templateId
                        ? " bg-primary/10 border-2 border-primary"
                        : "border-border hover:border-accent bg-muted/50 hover:bg-muted/80"}`, children: [_jsx("div", { className: "relative aspect-16/7 w-full overflow-hidden bg-card", children: _jsx("div", { className: "absolute inset-0 flex items-center justify-center p-10", children: _jsxs("span", { style: {
                                        ...template.styles,
                                        fontSize: "1.2rem",
                                        lineHeight: "1.2",
                                    }, children: ["Let's", " ", _jsx("span", { style: {
                                                ...template.styles.highlightStyle,
                                                transform: `scale(${((_a = template.styles.highlightStyle) === null || _a === void 0 ? void 0 : _a.scale) || 1})`,
                                            }, children: "start" }), " ", "with a demo of your caption."] }) }) }), _jsxs("div", { className: "flex items-center justify-between p-3 bg-card/50 backdrop-blur-sm", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx("span", { className: "text-xs font-extralight text-primary-foreground", children: template.name }), (localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.template) === templateId && (_jsx("span", { className: "text-[10px] text-primary font-extralight bg-primary/10 px-2 py-0.5 rounded-full", children: "Active" }))] }), _jsx("div", { className: "flex items-center gap-1.5", children: [
                                        template.styles.color,
                                        (_b = template.styles.highlightStyle) === null || _b === void 0 ? void 0 : _b.backgroundColor,
                                    ].map((color, i) => (_jsx("div", { className: "w-3 h-3 rounded-full border-[0.1px] border-popover-foreground/30", style: { backgroundColor: color } }, i))) })] })] }, templateId));
            }) }) }));
};
