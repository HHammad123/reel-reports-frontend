import { jsx as _jsx } from "react/jsx-runtime";
import { TimelineMarkers } from './';
import { getTimelineContentStyles } from '../utils';
/**
 * Fixed markers section at the top of the timeline
 * Handles horizontal scrolling only while remaining fixed vertically
 */
export const TimelineMarkersSection = ({ viewportDuration, fps, zoomScale, onFrameChange, onMouseMove, onMouseLeave, onDragStateChange, }) => {
    return (_jsx("div", { className: "timeline-markers-wrapper overflow-x-auto overflow-y-hidden scrollbar-hide flex-shrink-0", children: _jsx("div", { className: "timeline-markers-content", style: {
                ...getTimelineContentStyles(zoomScale),
            }, onMouseMove: onMouseMove, onMouseLeave: onMouseLeave, children: _jsx("div", { className: "timeline-markers-container", children: _jsx(TimelineMarkers, { totalDuration: viewportDuration, onTimeClick: (timeInSeconds) => {
                        const frame = Math.round(timeInSeconds * fps);
                        onFrameChange === null || onFrameChange === void 0 ? void 0 : onFrameChange(frame);
                    }, onDragStateChange: onDragStateChange, zoomScale: zoomScale }) }) }) }));
};
