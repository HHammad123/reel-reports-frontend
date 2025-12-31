// Autosave functionality has been removed
// This file is kept for backward compatibility but all autosave features are disabled

import { useEffect, useRef, useState } from "react";

/**
 * Hook for automatically saving editor state to IndexedDB
 * DISABLED: Autosave functionality has been removed
 *
 * @param projectId Unique identifier for the project
 * @param state Current state to be saved
 * @param options Configuration options for autosave behavior
 * @returns Object with functions to manually save and load state
 */
export const useAutosave = (projectId, state, options = {}) => {
    const { onLoad, isLoadingProject = false } = options;
    const [isInitialLoadComplete, setIsInitialLoadComplete] = useState(false);

    // Autosave functionality removed - just mark as complete immediately
    useEffect(() => {
        if (isLoadingProject) {
            return;
        }
        // Mark as complete without checking IndexedDB
        setIsInitialLoadComplete(true);
    }, [isLoadingProject]);

    // Function to manually save state - DISABLED
    const saveState = async () => {
        console.log('[Autosave] Manual save disabled - autosave functionality removed');
        return false;
    };

    // Function to manually load state - DISABLED
    const loadState = async () => {
        console.log('[Autosave] Manual load disabled - autosave functionality removed');
        return null;
    };

    return {
        saveState,
        loadState,
        isInitialLoadComplete,
    };
};
