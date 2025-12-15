import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
export const TimelineItemSplitLine = ({ splittingEnabled = false, isHovering = false, splitPosition, }) => {
    if (!splittingEnabled || !isHovering || splitPosition === null) {
        return null;
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none z-20 shadow-lg", style: {
                    left: `${splitPosition}%`,
                    transform: 'translateX(-50%)',
                    boxShadow: '0 0 4px rgba(239, 68, 68, 0.5)',
                } }), _jsx("div", { className: "absolute top-0 bottom-0 w-1 bg-red-500/30 pointer-events-none z-19 blur-sm", style: {
                    left: `${splitPosition}%`,
                    transform: 'translateX(-50%)',
                } })] }));
};
