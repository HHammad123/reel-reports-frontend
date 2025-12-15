// Timeline utility functions
// Re-export gap utilities
export { findGapsInTrack } from './utils/gap-utils';
/**
 * Calculate viewport duration based on zoom scale and content duration
 * When zooming out (zoomScale < 1), expand the viewport to show more time
 * When zooming in (zoomScale > 1), keep the viewport at content duration
 */
export const calculateViewportDuration = (contentDuration, zoomScale) => {
    if (zoomScale >= 1) {
        return contentDuration;
    }
    // When zoomed out, expand viewport proportionally with no arbitrary cap
    const expansionFactor = 1 / Math.max(zoomScale, 0.0001);
    return contentDuration * expansionFactor;
};
/**
 * Convert frame number to time in seconds
 */
export const frameToTime = (frame, fps) => {
    return frame / fps;
};
/**
 * Convert time in seconds to frame number
 */
export const timeToFrame = (timeInSeconds, fps) => {
    return Math.round(timeInSeconds * fps);
};
/**
 * Calculate mouse position as percentage within timeline bounds
 */
export const calculateMousePosition = (clientX, timelineRect) => {
    const position = ((clientX - timelineRect.left) / timelineRect.width) * 100;
    return Math.max(0, Math.min(100, position));
};
/**
 * Calculate timeline content styles for zooming
 */
export const getTimelineContentStyles = (zoomScale) => ({
    width: `${Math.max(100, 100 * zoomScale)}%`,
    minWidth: "100%",
    willChange: "width, transform",
    transform: `translateZ(0)`,
});
