import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * TimelineMarker component displays the current playback position as a vertical line.
 * Shows a red line with a triangle pointer at the top to indicate current frame.
 */
export const TimelineMarker = ({ currentFrame, totalDurationInFrames, }) => {
    // Calculate the marker's position as a percentage
    const markerPosition = totalDurationInFrames > 0
        ? (currentFrame / totalDurationInFrames) * 100
        : 0;
    // Clamp position between 0 and 100
    const clampedPosition = Math.max(0, Math.min(100, markerPosition));
    return (_jsxs("div", { className: "absolute top-0 z-50", "data-timeline-marker": "playhead", style: {
            left: `${clampedPosition}%`,
            transform: "translateX(-50%)",
            height: "100%",
            width: "2px",
            pointerEvents: "none", // No interaction to prevent interference with resizing
        }, children: [_jsx("div", { className: "absolute top-0 left-1/2 transform -translate-x-1/2 w-[2px] bg-red-500 shadow-lg", style: {
                    height: "100%",
                } }), _jsx("div", { className: "absolute -top-[2px] left-1/2 transform -translate-x-1/2 w-2.5 h-5 bg-red-500 rounded-sm shadow-sm" })] }));
};
