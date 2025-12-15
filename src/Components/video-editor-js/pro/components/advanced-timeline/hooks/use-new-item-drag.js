import { useCallback, useRef } from 'react';
import { TIMELINE_CONSTANTS } from '../constants';
import useTimelineStore from '../stores/use-timeline-store';
// Global state for new item drag (similar to the icon-advanced-timeline implementation)
let currentNewItemDragType = null;
let currentNewItemDragData = null;
export const setCurrentNewItemDragType = (type) => {
    currentNewItemDragType = type;
};
export const getCurrentNewItemDragType = () => currentNewItemDragType;
export const setCurrentNewItemDragData = (data) => {
    currentNewItemDragData = data;
};
export const getCurrentNewItemDragData = () => currentNewItemDragData;
const checkForOverlap = (tracks, trackIndex, startTime, duration) => {
    if (trackIndex < 0 || trackIndex >= tracks.length)
        return true;
    const track = tracks[trackIndex];
    const endTime = startTime + duration;
    return track.items.some((item) => startTime < item.end && endTime > item.start);
};
export const useNewItemDrag = ({ timelineRef, totalDuration, tracks, onNewItemDrop, }) => {
    var _a, _b;
    const { setGhostElement, setNewItemDragState, setIsValidDrop } = useTimelineStore();
    // Track last position to avoid unnecessary updates
    const lastPositionRef = useRef(null);
    const handleNewItemDragOver = useCallback((e) => {
        e.preventDefault(); // Allow drop
        // Check if this is a new item drag
        if (!e.dataTransfer.types.includes("application/json") &&
            !e.dataTransfer.types.some((type) => type.includes("new-item"))) {
            return;
        }
        if (!timelineRef.current)
            return;
        const timelineRect = timelineRef.current.getBoundingClientRect();
        const relativeX = e.clientX - timelineRect.left;
        const relativeY = e.clientY - timelineRect.top;
        // Calculate horizontal position
        const leftPercentage = Math.max(0, Math.min(100, (relativeX / timelineRect.width) * 100));
        // Calculate track index
        // NOTE: Markers are now in a separate container, so relativeY is already relative to tracks
        const adjustedY = Math.max(0, relativeY);
        const trackHeight = TIMELINE_CONSTANTS.TRACK_HEIGHT;
        const trackIndex = Math.max(0, Math.min(tracks.length - 1, Math.floor(adjustedY / trackHeight)));
        // Calculate width and duration based on item data
        let widthPercentage = 8; // Default width (8% of timeline)
        let duration = totalDuration * 0.08; // Default duration
        try {
            const globalDragData = getCurrentNewItemDragData();
            const dragDataString = e.dataTransfer.getData("application/json");
            let dragData = globalDragData;
            if (!dragData && dragDataString) {
                dragData = JSON.parse(dragDataString);
            }
            if (dragData === null || dragData === void 0 ? void 0 : dragData.duration) {
                duration = dragData.duration;
                widthPercentage = (duration / totalDuration) * 100;
                widthPercentage = Math.max(1, Math.min(50, widthPercentage)); // Reasonable bounds
            }
        }
        catch (error) {
            // Use default values
        }
        // Calculate start time for collision detection
        const startTime = (leftPercentage / 100) * totalDuration;
        // Check for collisions
        const hasOverlap = checkForOverlap(tracks, trackIndex, startTime, duration);
        const isValidDrop = !hasOverlap;
        // Only update if position or validity changed significantly (throttling)
        const currentPosition = {
            trackIndex,
            left: Math.round(leftPercentage),
            isValid: isValidDrop,
        };
        const lastPosition = lastPositionRef.current;
        if (lastPosition &&
            Math.abs(lastPosition.left - currentPosition.left) < 2 && // Less than 2% change
            lastPosition.trackIndex === currentPosition.trackIndex &&
            lastPosition.isValid === currentPosition.isValid) {
            return; // Skip update
        }
        lastPositionRef.current = currentPosition;
        const topPercentage = trackIndex * (100 / tracks.length);
        // Update validity state in store
        setIsValidDrop(isValidDrop);
        // Update ghost element
        setGhostElement([
            {
                id: "new-item-ghost",
                left: leftPercentage,
                width: widthPercentage,
                top: topPercentage,
            },
        ]);
        // Update new item drag state
        setNewItemDragState({
            isDragging: true,
            itemType: getCurrentNewItemDragType(),
            ghostElement: {
                left: leftPercentage,
                width: widthPercentage,
                top: topPercentage,
            },
            itemData: {
                type: getCurrentNewItemDragType() || undefined,
                label: getCurrentNewItemDragType() || undefined,
                duration,
            },
        });
    }, [
        timelineRef,
        totalDuration,
        tracks,
        setGhostElement,
        setNewItemDragState,
        setIsValidDrop,
    ]);
    const handleNewItemDragEnd = useCallback(() => {
        // Clear ghost and global state when drag ends
        setGhostElement(null);
        setIsValidDrop(true); // Reset to valid
        lastPositionRef.current = null;
        setCurrentNewItemDragType(null);
        setCurrentNewItemDragData(null);
        setNewItemDragState({
            isDragging: false,
            itemType: null,
            ghostElement: null,
        });
    }, [setGhostElement, setNewItemDragState, setIsValidDrop]);
    const handleNewItemDragLeave = useCallback((e) => {
        var _a;
        // Clear ghost if leaving timeline completely
        if (!((_a = timelineRef.current) === null || _a === void 0 ? void 0 : _a.contains(e.relatedTarget))) {
            setGhostElement(null);
            lastPositionRef.current = null;
        }
    }, [timelineRef, setGhostElement]);
    const handleNewItemDrop = useCallback((itemType, trackIndex, startTime, itemData) => {
        // Before dropping, check one more time for collisions
        const duration = (itemData === null || itemData === void 0 ? void 0 : itemData.duration) || totalDuration * 0.08;
        const hasOverlap = checkForOverlap(tracks, trackIndex, startTime, duration);
        if (hasOverlap) {
            // Don't drop if there would be an overlap
            handleNewItemDragEnd();
            return;
        }
        // Call the provided drop handler
        if (onNewItemDrop) {
            onNewItemDrop(itemType, trackIndex, startTime, itemData);
        }
        // Clear state
        handleNewItemDragEnd();
    }, [tracks, totalDuration, onNewItemDrop, handleNewItemDragEnd]);
    const clearNewItemDragState = useCallback(() => {
        setGhostElement(null);
        setIsValidDrop(true); // Reset to valid
        lastPositionRef.current = null;
        setCurrentNewItemDragType(null);
        setCurrentNewItemDragData(null);
        setNewItemDragState({
            isDragging: false,
            itemType: null,
            ghostElement: null,
        });
    }, [setGhostElement, setNewItemDragState, setIsValidDrop]);
    // Compute if we're currently dragging a new item
    const isDraggingNewItem = !!getCurrentNewItemDragType();
    // Get the current ghost element from the timeline store reactively
    const { ghostElement } = useTimelineStore();
    const currentGhostElement = ghostElement === null || ghostElement === void 0 ? void 0 : ghostElement[0]; // Get the first ghost element
    // Compute newItemIsValidDrop from the current state
    const newItemIsValidDrop = (_b = (_a = lastPositionRef.current) === null || _a === void 0 ? void 0 : _a.isValid) !== null && _b !== void 0 ? _b : true;
    return {
        newItemDragState: {
            isDragging: isDraggingNewItem,
            itemType: getCurrentNewItemDragType(),
            ghostElement: currentGhostElement
                ? {
                    left: currentGhostElement.left,
                    width: currentGhostElement.width,
                    top: currentGhostElement.top,
                }
                : null,
            itemData: {
                type: getCurrentNewItemDragType() || undefined,
                label: getCurrentNewItemDragType() || undefined,
            },
        },
        newItemIsValidDrop,
        handleNewItemDragOver,
        handleNewItemDragEnd,
        handleNewItemDragLeave,
        handleNewItemDrop,
        clearNewItemDragState,
    };
};
