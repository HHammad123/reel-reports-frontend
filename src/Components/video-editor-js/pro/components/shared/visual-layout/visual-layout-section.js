import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Collapsible, CollapsibleContent, CollapsibleTrigger, } from "../../ui/collapsible";
/**
 * VisualLayoutSection displays a collapsible section of 3D layout options
 */
export const VisualLayoutSection = ({ title, count, isOpen, onToggle, children, }) => {
    return (_jsx(Collapsible, { open: isOpen, onOpenChange: onToggle, className: "w-full mb-4 px-0 mx-0", children: _jsxs("div", { className: "border border-border rounded-sm overflow-hidden", children: [_jsxs(CollapsibleTrigger, { className: "w-full flex justify-between items-center px-4 py-3 bg-card hover:bg-accent/50 duration-200 ease-out", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "font-extralight text-foreground text-xs", children: title }), _jsxs("span", { className: "text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground", children: ["(", count, ")"] })] }), _jsx("svg", { width: "16", height: "16", viewBox: "0 0 16 16", fill: "none", xmlns: "http://www.w3.org/2000/svg", className: `duration-200 ease-out ${isOpen ? "rotate-180" : ""}`, children: _jsx("path", { d: "M4 6L8 10L12 6", stroke: "currentColor", strokeWidth: "1.5", strokeLinecap: "round", strokeLinejoin: "round" }) })] }), _jsx(CollapsibleContent, { children: _jsx("div", { className: "p-2 bg-sidebar border-t border-border", children: _jsx("div", { className: "grid grid-cols-4 sm:grid-cols-3 gap-2 place-items-center", children: children }) }) })] }) }));
};
