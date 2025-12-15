import { useCallback } from 'react';
export const useTimelineOperations = ({ onItemMove, onItemResize, onDeleteItems, onDuplicateItems, onSplitItems, onAddNewItem, }) => {
    // External handler wrappers that delegate to parent callbacks
    const handleExternalItemMove = useCallback((itemId, newStart, newEnd, newTrackId) => {
        onItemMove === null || onItemMove === void 0 ? void 0 : onItemMove(itemId, newStart, newEnd, newTrackId);
    }, [onItemMove]);
    const handleExternalItemResize = useCallback((itemId, newStart, newEnd) => {
        onItemResize === null || onItemResize === void 0 ? void 0 : onItemResize(itemId, newStart, newEnd);
    }, [onItemResize]);
    const handleExternalItemsDelete = useCallback((itemIds) => {
        onDeleteItems === null || onDeleteItems === void 0 ? void 0 : onDeleteItems(itemIds);
    }, [onDeleteItems]);
    const handleExternalItemsDuplicate = useCallback((itemIds) => {
        // Just call the external callback - let the parent component handle duplication
        // This ensures proper ID synchronization between timeline and overlay data
        onDuplicateItems === null || onDuplicateItems === void 0 ? void 0 : onDuplicateItems(itemIds);
    }, [onDuplicateItems]);
    const handleExternalItemSplit = useCallback((itemId, splitTime) => {
        // Just call the external callback - let the parent component handle splitting
        // This ensures proper ID synchronization between timeline and overlay data
        onSplitItems === null || onSplitItems === void 0 ? void 0 : onSplitItems(itemId, splitTime);
    }, [onSplitItems]);
    const handleExternalAddNewItem = useCallback((item) => {
        onAddNewItem === null || onAddNewItem === void 0 ? void 0 : onAddNewItem(item);
    }, [onAddNewItem]);
    return {
        handleExternalItemMove,
        handleExternalItemResize,
        handleExternalItemsDelete,
        handleExternalItemsDuplicate,
        handleExternalItemSplit,
        handleExternalAddNewItem,
    };
};
