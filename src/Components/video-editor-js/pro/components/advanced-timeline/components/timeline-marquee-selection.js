import { jsx as _jsx } from "react/jsx-runtime";
/**
 * Renders a marquee selection box on the timeline.
 * This component is displayed when the user is actively dragging to select multiple items.
 * It shows a visual representation of the selection area.
 */
export const TimelineMarqueeSelection = ({ isMarqueeSelecting, marqueeStartPoint, marqueeEndPoint, }) => {
    if (!isMarqueeSelecting || !marqueeStartPoint || !marqueeEndPoint) {
        return null;
    }
    return (_jsx("div", { className: "absolute border-[1.5px] border-(--primary) pointer-events-none rounded-sm", style: {
            left: Math.min(marqueeStartPoint.x, marqueeEndPoint.x),
            top: Math.min(marqueeStartPoint.y, marqueeEndPoint.y),
            width: Math.abs(marqueeEndPoint.x - marqueeStartPoint.x),
            height: Math.abs(marqueeEndPoint.y - marqueeStartPoint.y),
            zIndex: 100, // Ensure it's above other elements
            backgroundColor: "rgba(59, 130, 246, 0.1)",
            backgroundImage: "repeating-linear-gradient(45deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.2) 10px, rgba(59, 130, 246, 0.1) 10px, rgba(59, 130, 246, 0.1) 20px)",
        } }));
};
