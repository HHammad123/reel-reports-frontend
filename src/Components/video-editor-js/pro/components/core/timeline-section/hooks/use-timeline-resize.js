import React from 'react';
import { useVerticalResize } from '../../../../hooks/use-vertical-resize';
import { TIMELINE_CONSTANTS } from '../../../advanced-timeline/constants';
/**
 * Constants for timeline height calculations
 */
const HEIGHT_CONSTANTS = {
    /** Reserved space for editor header and minimum video player - reduced to give more space to canvas */
    RESERVED_VIEWPORT_SPACE: 200,
    /** Minimum timeline height to ensure usability */
    MIN_TIMELINE_HEIGHT: 250,
    /** Additional padding for timeline (scrollbar + comfortable viewing) */
    TIMELINE_PADDING: 67,
};
/**
 * Custom hook for managing timeline resize functionality
 * Calculates dynamic max height based on track count and manages resize state
 * Auto-expands timeline height when new tracks are added
 */
export const useTimelineResize = ({ overlays }) => {
    /**
     * Calculate the number of tracks based on overlays
     * Tracks are determined by the row property of overlays
     * Memoized to avoid recalculation on every render
     */
    const trackCount = React.useMemo(() => {
        if (overlays.length === 0)
            return 1; // Minimum 1 track
        const maxRow = Math.max(...overlays.map(overlay => overlay.row || 0));
        return maxRow + 1; // Rows are 0-indexed
    }, [overlays]);
    // Track previous track count to detect when new tracks are added
    const prevTrackCountRef = React.useRef(trackCount);
    // Track previous bottomHeight to avoid dependency issues in auto-expand effect
    const prevBottomHeightRef = React.useRef(0);
    /**
     * Calculate dynamic max height - allow timeline to go to bottom of viewport
     * When dragged down, timeline can expand to fill remaining space after canvas area
     * Formula: Viewport height - (header + minimum canvas space)
     * This allows dragging timeline all the way to the bottom
     */
    const dynamicMaxHeight = React.useMemo(() => {
        if (typeof window === 'undefined') {
            // SSR fallback - use track-based calculation
            return TIMELINE_CONSTANTS.MARKERS_HEIGHT +
                (trackCount * TIMELINE_CONSTANTS.TRACK_HEIGHT) +
                HEIGHT_CONSTANTS.TIMELINE_PADDING;
        }
        // Calculate available space: viewport height minus header and minimum canvas space
        const viewportHeight = window.innerHeight;
        const headerHeight = 60; // Approximate header height
        const minCanvasSpace = 150; // Minimum space to keep for canvas (very small to allow timeline to go to bottom)
        const availableSpace = Math.max(viewportHeight - headerHeight - minCanvasSpace, 0);
        
        // Track-based minimum height calculation
        const trackBasedHeight = TIMELINE_CONSTANTS.MARKERS_HEIGHT +
            (trackCount * TIMELINE_CONSTANTS.TRACK_HEIGHT) +
            HEIGHT_CONSTANTS.TIMELINE_PADDING;
        
        // Allow timeline to expand to bottom - use available space or track-based, whichever is larger
        // This allows dragging timeline all the way down to the bottom of the viewport
        return Math.max(availableSpace, trackBasedHeight);
    }, [trackCount]);
    /**
     * Calculate initial height: use full available viewport height on first load
     *
     * Note: This is only called once during initialization (not on window resize)
     * Users can manually resize the timeline, and their preference is saved to localStorage
     */
    const calculateInitialHeight = React.useCallback(() => {
        if (typeof window === 'undefined') {
            return HEIGHT_CONSTANTS.MIN_TIMELINE_HEIGHT; // SSR fallback
        }
        // Use full available height: viewport height minus reserved space for header and video player
        const viewportHeight = window.innerHeight;
        const fullHeight = viewportHeight - HEIGHT_CONSTANTS.RESERVED_VIEWPORT_SPACE;
        // Ensure we never go below minimum height
        return Math.max(HEIGHT_CONSTANTS.MIN_TIMELINE_HEIGHT, fullHeight);
    }, []);
    /**
     * Vertical resize functionality for timeline with dynamic max height
     */
    const { bottomHeight, isResizing, handleMouseDown, handleTouchStart, setHeight } = useVerticalResize({
        initialHeight: calculateInitialHeight(),
        minHeight: 155,
        maxHeight: dynamicMaxHeight,
        storageKey: 'editor-timeline-height',
    });
    /**
     * Auto-expand timeline height when new tracks are added
     *
     * Uses refs to avoid race conditions and infinite loops from including
     * bottomHeight in the dependency array
     */
    React.useEffect(() => {
        const prevCount = prevTrackCountRef.current;
        if (trackCount > prevCount) {
            // Calculate how many new rows were added
            const newRows = trackCount - prevCount;
            const additionalHeight = newRows * TIMELINE_CONSTANTS.TRACK_HEIGHT;
            // Expand the timeline to show the new row(s)
            // Use the ref value to avoid bottomHeight dependency
            setHeight(prevBottomHeightRef.current + additionalHeight);
        }
        // Update the refs for next comparison
        prevTrackCountRef.current = trackCount;
    }, [trackCount, setHeight]);
    /**
     * Keep the bottomHeight ref in sync
     * Separate effect to avoid dependency issues
     */
    React.useEffect(() => {
        prevBottomHeightRef.current = bottomHeight;
    }, [bottomHeight]);
    return {
        bottomHeight,
        isResizing,
        handleMouseDown,
        handleTouchStart,
        trackCount,
        dynamicMaxHeight,
    };
};
