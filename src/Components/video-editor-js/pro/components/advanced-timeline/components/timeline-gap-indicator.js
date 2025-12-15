import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TIMELINE_CONSTANTS } from '../constants';
/**
 * A component that displays a visual indicator for gaps in a timeline track.
 * It shows a striped pattern on hover and includes a close button to remove the gap.
 * The width and position of the indicator are calculated as percentages of the total duration.
 */
export const TimelineGapIndicator = ({ gap, totalDuration, trackItems, onItemMove, trackId, }) => {
    const handleRemoveGap = (e) => {
        e.stopPropagation();
        if (!onItemMove)
            return;
        // Find all items that start after the gap end
        const itemsToShift = trackItems
            .filter((item) => item.start >= gap.end)
            .sort((a, b) => a.start - b.start);
        if (itemsToShift.length === 0)
            return;
        // Calculate gap size
        const gapSize = gap.end - gap.start;
        if (gapSize <= 0)
            return;
        // Move all items after the gap backward by the gap size
        itemsToShift.forEach((item) => {
            const newStart = item.start - gapSize;
            const newEnd = item.end - gapSize;
            // Ensure we don't move items to negative positions
            if (newStart >= 0) {
                onItemMove(item.id, newStart, newEnd, trackId);
            }
        });
    };
    return (_jsxs("div", { className: "absolute top-0 bottom-0 w-full h-full cursor-pointer group z-10 my-auto", style: {
            left: `${(gap.start / totalDuration) * 100}%`,
            width: `${((gap.end - gap.start) / totalDuration) * 100}%`,
            height: `${TIMELINE_CONSTANTS.TRACK_ITEM_HEIGHT}px`,
        }, onClick: handleRemoveGap, title: `Gap: ${gap.start.toFixed(1)}s - ${gap.end.toFixed(1)}s (Click to close)`, children: [_jsx("div", { className: "absolute top-0 bottom-0 left-0 right-0 w-full h-full opacity-0 group-hover:opacity-100 transition-all duration-200", style: {
                    background: `repeating-linear-gradient(
            -45deg,
            rgba(100, 116, 139, 0.1),
            rgba(100, 116, 139, 0.1) 8px,
            rgba(100, 116, 139, 0.2) 8px,
            rgba(100, 116, 139, 0.2) 16px
          )`,
                } }), _jsx("div", { className: "opacity-0 group-hover:opacity-100 transition-opacity duration-200 absolute top-0 bottom-0 left-0 right-0 w-full h-full flex items-center justify-center", children: _jsx("div", { className: "bg-slate-900/70 rounded-full p-1.5 backdrop-blur-sm border border-white/20", children: _jsx(CloseIcon, {}) }) })] }));
};
/**
 * A simple close icon component rendered as an SVG.
 * Used within the gap indicator to show the remove action.
 */
const CloseIcon = () => (_jsx("svg", { className: "w-2.5 h-2.5 text-white", fill: "none", strokeWidth: "2", viewBox: "0 0 24 24", stroke: "currentColor", children: _jsx("path", { strokeLinecap: "round", strokeLinejoin: "round", d: "M6 18L18 6M6 6l12 12" }) }));
