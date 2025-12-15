import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export const TimelineItemLabel = ({ icon: Icon, label, defaultLabel, iconClassName = "w-3 h-3 text-white/80", isHovering = false, // Default to false
showBackground = false // Default to false
 }) => {
    return (_jsx("div", { className: `flex items-center h-full w-full overflow-hidden px-2 transition-all duration-200 ease-out ${isHovering ? 'ml-6' : 'ml-4'}`, children: _jsx("div", { className: "flex items-center min-w-0 w-full overflow-hidden", children: _jsxs("div", { className: `flex items-center p-1 rounded-sm overflow-hidden ${showBackground ? 'bg-yellow-600 opacity-80' : ''}`, children: [_jsx("div", { className: "shrink-0 mr-2 flex items-center overflow-hidden", children: _jsx(Icon, { className: showBackground ? `w-3 h-3 shrink-0 ${showBackground ? 'text-white' : ''} ${iconClassName.includes('text-red-') ? 'text-red-400' : 'text-white'}` : `${iconClassName} shrink-0` }) }), _jsx("div", { className: "min-w-0 overflow-hidden", children: _jsx("div", { className: `truncate text-xs font-extralight whitespace-nowrap ${showBackground ? 'text-white' : 'text-white'}`, children: label || defaultLabel }) })] }) }) }));
};
