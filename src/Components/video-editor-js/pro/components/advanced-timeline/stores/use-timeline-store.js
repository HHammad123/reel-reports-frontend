import { create } from 'zustand';
import { persist } from 'zustand/middleware';
const useTimelineStore = create()(persist((set, get) => ({
    // Initial state
    ghostMarkerPosition: null,
    isDragging: false,
    isPlayheadDragging: false, // Initialize new state
    isContextMenuOpen: false,
    timelineRef: null,
    draggedItem: null,
    ghostElement: null,
    floatingGhost: null,
    isValidDrop: true,
    dragInfo: null,
    newItemDragState: {
        isDragging: false,
        itemType: null,
        ghostElement: null,
    },
    livePreviewUpdates: new Map(),
    insertionIndex: null,
    magneticPreview: null,
    currentDragPosition: null,
    // Basic setters
    setGhostMarkerPosition: (position) => {
        set({ ghostMarkerPosition: position });
    },
    setIsDragging: (isDragging) => {
        set({ isDragging });
    },
    setIsPlayheadDragging: (isPlayheadDragging) => {
        set({ isPlayheadDragging });
    },
    setIsContextMenuOpen: (isOpen) => {
        set({ isContextMenuOpen: isOpen });
    },
    setTimelineRef: (ref) => {
        set({ timelineRef: ref });
    },
    // Drag and drop setters
    setDraggedItem: (item) => {
        set({ draggedItem: item });
    },
    setGhostElement: (ghostElement) => {
        set({ ghostElement });
    },
    setFloatingGhost: (floatingGhost) => {
        set({ floatingGhost });
    },
    setIsValidDrop: (isValid) => {
        set({ isValidDrop: isValid });
    },
    setDragInfo: (dragInfo) => {
        set({ dragInfo });
    },
    getDragInfo: () => {
        return get().dragInfo;
    },
    // New item drag
    setNewItemDragState: (state) => {
        set({ newItemDragState: state });
    },
    // Live preview
    setLivePreviewUpdates: (updates) => {
        set({ livePreviewUpdates: updates });
    },
    updateLivePreview: (itemId, updates) => {
        const currentUpdates = get().livePreviewUpdates;
        const newMap = new Map(currentUpdates);
        if (itemId === null && updates === null) {
            // Clear all previews
            newMap.clear();
        }
        else if (itemId !== null && updates === null) {
            // Clear preview for specific item
            newMap.delete(itemId);
        }
        else if (itemId !== null && updates !== null) {
            // Update preview for specific item
            newMap.set(itemId, {
                ...currentUpdates.get(itemId),
                ...updates,
            });
        }
        set({ livePreviewUpdates: newMap });
    },
    // Insertion indicator
    setInsertionIndex: (index) => {
        set({ insertionIndex: index });
    },
    getInsertionIndex: () => get().insertionIndex,
    // Magnetic preview
    setMagneticPreview: (preview) => {
        set({ magneticPreview: preview });
    },
    // Current drag position for guidelines
    setCurrentDragPosition: (position) => {
        set({ currentDragPosition: position });
    },
    // Reset functions
    resetDragState: () => {
        set({
            draggedItem: null,
            ghostElement: null,
            floatingGhost: null,
            isValidDrop: false,
            dragInfo: null,
            isDragging: false,
            insertionIndex: null,
            magneticPreview: null, // Clear magnetic preview
            currentDragPosition: null, // Clear current drag position
        });
    },
    clearAllState: () => {
        set({
            ghostMarkerPosition: null,
            isDragging: false,
            isContextMenuOpen: false,
            draggedItem: null,
            ghostElement: null,
            floatingGhost: null,
            isValidDrop: true,
            dragInfo: null,
            newItemDragState: {
                isDragging: false,
                itemType: null,
                ghostElement: null,
            },
            livePreviewUpdates: new Map(),
            insertionIndex: null,
        });
    },
}), {
    name: 'advanced-timeline-store',
    partialize: () => ({}), // Don't persist any state
}));
export default useTimelineStore;
