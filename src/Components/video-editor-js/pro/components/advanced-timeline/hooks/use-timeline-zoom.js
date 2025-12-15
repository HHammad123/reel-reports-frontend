import { useCallback, useState } from "react";
import { ZOOM_CONSTRAINTS } from "../constants";
/**
 * A custom hook that manages zoom and scroll behavior for a timeline component.
 * Handles both programmatic and wheel-based zooming while maintaining the zoom point
 * relative to the cursor position.
 *
 * @param timelineRef - Reference to the timeline element
 * @returns {Object} An object containing:
 *   - zoomScale: Current zoom level
 *   - scrollPosition: Current scroll position
 *   - setZoomScale: Function to directly set zoom level
 *   - setScrollPosition: Function to directly set scroll position
 *   - handleZoom: Function to handle programmatic zooming
 *   - handleWheelZoom: Event handler for wheel-based zooming
 */
export const useTimelineZoom = (timelineRef) => {
    const [zoomState, setZoomState] = useState({
        scale: ZOOM_CONSTRAINTS.default,
        scroll: 0,
    });
    const calculateNewZoom = useCallback((prevZoom, delta) => {
        return Math.min(ZOOM_CONSTRAINTS.max, Math.max(ZOOM_CONSTRAINTS.min, prevZoom + delta * ZOOM_CONSTRAINTS.step));
    }, []);
    const handleZoom = useCallback((delta, clientX) => {
        var _a;
        const scrollContainer = (_a = timelineRef === null || timelineRef === void 0 ? void 0 : timelineRef.current) === null || _a === void 0 ? void 0 : _a.parentElement;
        if (!scrollContainer)
            return;
        const newZoom = calculateNewZoom(zoomState.scale, delta);
        if (newZoom === zoomState.scale)
            return;
        const rect = scrollContainer.getBoundingClientRect();
        const relativeX = clientX - rect.left + scrollContainer.scrollLeft;
        const zoomFactor = newZoom / zoomState.scale;
        const newScroll = relativeX * zoomFactor - (clientX - rect.left);
        // Apply scroll immediately - no requestAnimationFrame delay
        scrollContainer.scrollLeft = newScroll;
        setZoomState({ scale: newZoom, scroll: newScroll });
    }, [timelineRef, zoomState.scale, calculateNewZoom]);
    const handleWheelZoom = useCallback((event) => {
        if (event.ctrlKey || event.metaKey) {
            event.preventDefault();
            const delta = -Math.sign(event.deltaY) * ZOOM_CONSTRAINTS.wheelStep;
            handleZoom(delta, event.clientX);
        }
    }, [handleZoom]);
    return {
        zoomScale: zoomState.scale,
        scrollPosition: zoomState.scroll,
        setZoomScale: (newScale) => setZoomState({ ...zoomState, scale: newScale }),
        setScrollPosition: (newScroll) => setZoomState({ ...zoomState, scroll: newScroll }),
        handleZoom,
        handleWheelZoom,
    };
};
