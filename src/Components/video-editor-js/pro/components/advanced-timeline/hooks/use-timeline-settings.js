import { useState, useEffect, useCallback } from 'react';
export const useTimelineSettings = ({ autoRemoveEmptyTracks, onAutoRemoveEmptyTracksChange }) => {
    const [isAutoRemoveEnabled, setIsAutoRemoveEnabled] = useState(Boolean(autoRemoveEmptyTracks));
    const [isSplittingEnabled, setIsSplittingEnabled] = useState(false);
    // Update auto-remove setting when prop changes
    useEffect(() => {
        setIsAutoRemoveEnabled(Boolean(autoRemoveEmptyTracks));
    }, [autoRemoveEmptyTracks]);
    // Toggle auto-remove empty tracks setting
    const handleToggleAutoRemoveEmptyTracks = useCallback((enabled) => {
        setIsAutoRemoveEnabled(enabled);
        onAutoRemoveEmptyTracksChange === null || onAutoRemoveEmptyTracksChange === void 0 ? void 0 : onAutoRemoveEmptyTracksChange(enabled);
    }, [onAutoRemoveEmptyTracksChange]);
    // Toggle splitting mode
    const handleToggleSplitting = useCallback((enabled) => {
        setIsSplittingEnabled(enabled);
    }, []);
    return {
        isAutoRemoveEnabled,
        isSplittingEnabled,
        handleToggleAutoRemoveEmptyTracks,
        handleToggleSplitting,
    };
};
