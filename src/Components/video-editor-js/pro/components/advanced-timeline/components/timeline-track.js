import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { TimelineItem } from './timeline-item';
import { TimelineGhostElement } from './timeline-ghost-element';
import { TimelineGapIndicator } from './timeline-gap-indicator';
import { findGapsInTrack } from '../utils/gap-utils';
import { TIMELINE_CONSTANTS } from '../constants';
import useTimelineStore from '../stores/use-timeline-store';
export const TimelineTrack = ({ track, totalDuration, trackIndex, trackCount, onItemSelect, onDeleteItems, onDuplicateItems, onSplitItems, selectedItemIds = [], onSelectedItemsChange, onItemMove, onDragStart, zoomScale = 1, isDragging = false, draggedItemId, ghostElements = [], isValidDrop = false, onContextMenuOpenChange, splittingEnabled = false, hideItemsOnDrag = false, currentFrame, fps = 30, }) => {
    const { magneticPreview } = useTimelineStore();
    // Find gaps in the track for gap indicators
    const gaps = findGapsInTrack(track.items);
    // Handle item selection change with support for multi-selection
    const handleSelectionChange = (itemId, isMultiple) => {
        if (onSelectedItemsChange) {
            if (isMultiple) {
                // Multi-selection: toggle the item
                const currentlySelected = selectedItemIds.includes(itemId);
                if (currentlySelected) {
                    // Remove from selection
                    const newSelection = selectedItemIds.filter(id => id !== itemId);
                    onSelectedItemsChange(newSelection);
                }
                else {
                    // Add to selection
                    const newSelection = [...selectedItemIds, itemId];
                    onSelectedItemsChange(newSelection);
                }
            }
            else {
                // Single selection: replace current selection
                onSelectedItemsChange([itemId]);
            }
        }
        else {
            // Fallback to old behavior
            onItemSelect === null || onItemSelect === void 0 ? void 0 : onItemSelect(itemId);
        }
    };
    // Determine which items to render and their positions
    const shouldShowPreview = magneticPreview && magneticPreview.trackId === track.id && isDragging;
    return (_jsxs("div", { className: "track relative bg-(--timeline-row) border-b border-(--border) w-full transition-all duration-200 ease-in-out", style: {
            height: `${TIMELINE_CONSTANTS.TRACK_HEIGHT}px`,
        }, children: [shouldShowPreview ? (
            // Render preview items with shifted positions
            magneticPreview.previewItems.map((previewItem) => {
                const originalItem = track.items.find(item => item.id === previewItem.id);
                if (!originalItem)
                    return null;
                return (_jsx(TimelineItem, { item: {
                        ...originalItem,
                        start: previewItem.start,
                        end: previewItem.end
                    }, totalDuration: totalDuration, onSelect: onItemSelect, onSelectionChange: handleSelectionChange, onDragStart: onDragStart, onDeleteItems: onDeleteItems, onDuplicateItems: onDuplicateItems, onSplitItems: onSplitItems, selectedItemIds: selectedItemIds, zoomScale: zoomScale, isDragging: isDragging && draggedItemId === previewItem.id, isSelected: selectedItemIds === null || selectedItemIds === void 0 ? void 0 : selectedItemIds.includes(previewItem.id), onContextMenuOpenChange: onContextMenuOpenChange, splittingEnabled: splittingEnabled, currentFrame: currentFrame, fps: fps }, previewItem.id));
            })) : (
            // Render normal items
            track.items.map((item) => {
                // Check if this specific item should be hidden during drag
                const shouldHideThisItem = hideItemsOnDrag && isDragging && (selectedItemIds === null || selectedItemIds === void 0 ? void 0 : selectedItemIds.includes(item.id));
                // Skip rendering this item if it should be hidden
                if (shouldHideThisItem) {
                    return null;
                }
                return (_jsx(TimelineItem, { item: item, totalDuration: totalDuration, onSelect: onItemSelect, onSelectionChange: handleSelectionChange, onDragStart: onDragStart, onDeleteItems: onDeleteItems, onDuplicateItems: onDuplicateItems, onSplitItems: onSplitItems, selectedItemIds: selectedItemIds, zoomScale: zoomScale, isDragging: isDragging && draggedItemId === item.id, isSelected: selectedItemIds === null || selectedItemIds === void 0 ? void 0 : selectedItemIds.includes(item.id), onContextMenuOpenChange: onContextMenuOpenChange, splittingEnabled: splittingEnabled, currentFrame: currentFrame, fps: fps }, item.id));
            })), !isDragging && !track.magnetic &&
                gaps.map((gap, gapIndex) => (_jsx(TimelineGapIndicator, { gap: gap, trackIndex: trackIndex, totalDuration: totalDuration, trackItems: track.items, onItemMove: onItemMove, trackId: track.id }, `gap-${track.id}-${gapIndex}`))), ghostElements.map((ghostElement, ghostIndex) => (_jsx(TimelineGhostElement, { ghostElement: ghostElement, rowIndex: trackIndex, trackCount: trackCount, isValidDrop: isValidDrop, isFloating: false }, `ghost-${trackIndex}-${ghostIndex}`)))] }));
};
