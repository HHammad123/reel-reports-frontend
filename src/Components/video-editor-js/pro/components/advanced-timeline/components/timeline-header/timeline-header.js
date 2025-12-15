import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatInTimeZone } from 'date-fns-tz';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { ZoomControls } from './zoom-controls';
import { PlaybackControls } from './playback-controls';
import { SplittingToggle } from './splitting-toggle';
import { SplitAtSelectionButton } from './split-at-selection-button';
import { UndoRedoControls } from './undo-redo-controls';
import { AspectRatioDropdown } from './aspect-ratio-dropdown';
export const TimelineHeader = ({ totalDuration, currentTime = 0, showZoomControls = false, zoomScale, setZoomScale, isPlaying = false, onPlay, onPause, onSeekToStart, onSeekToEnd, showPlaybackControls = false, playbackRate = 1, setPlaybackRate, splittingEnabled = false, onToggleSplitting, onSplitAtSelection, hasSelectedItem = false, selectedItemsCount = 0, showSplitAtSelection = true, showUndoRedoControls = false, canUndo = false, canRedo = false, onUndo, onRedo, aspectRatio = "16:9", onAspectRatioChange, showAspectRatioControls = true, isCollapsed = false, onToggleCollapse,
// overlays = [],
 }) => {
    const formatTime = (timeInSeconds) => {
        // Convert seconds to milliseconds
        const milliseconds = Math.round(timeInSeconds * 1000);
        // Use date-fns-tz to format in UTC timezone, avoiding local timezone offset issues
        return formatInTimeZone(milliseconds, 'UTC', 'm:ss.SS');
    };
    // Debug export function
    // const exportOverlaysAsTemplate = () => {
    //   const template = {
    //     id: `debug-export-${Date.now()}`,
    //     name: "Debug Export",
    //     description: "Debug export of current overlays",
    //     createdAt: new Date().toISOString(),
    //     updatedAt: new Date().toISOString(),
    //     createdBy: {
    //       id: "debug-user",
    //       name: "Debug User"
    //     },
    //     category: "Debug",
    //     tags: ["debug", "export"],
    //     duration: totalDuration,
    //     aspectRatio: aspectRatio,
    //     overlays: overlays
    //   };
    //   // Create and download JSON file
    //   const dataStr = JSON.stringify(template, null, 2);
    //   const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
    //   const exportFileDefaultName = `debug-overlays-${Date.now()}.json`;
    //   const linkElement = document.createElement('a');
    //   linkElement.setAttribute('href', dataUri);
    //   linkElement.setAttribute('download', exportFileDefaultName);
    //   linkElement.click();
    //   // Also log to console for easy copying
    //   console.log('Exported overlays:', template);
    // };
    return (_jsxs("div", { className: " bg-background flex justify-between items-center border border-border px-3 py-2.5", children: [_jsxs("div", { className: "flex items-center gap-2 flex-1 justify-start", children: [showUndoRedoControls && onUndo && onRedo && (_jsx(UndoRedoControls, { canUndo: canUndo, canRedo: canRedo, onUndo: onUndo, onRedo: onRedo })), false && onToggleSplitting && (_jsx(SplittingToggle, { enabled: splittingEnabled, onToggle: onToggleSplitting })), showSplitAtSelection && onSplitAtSelection && (_jsx(SplitAtSelectionButton, { onSplitAtSelection: onSplitAtSelection, hasSelectedItem: hasSelectedItem, selectedItemsCount: selectedItemsCount }))] }), _jsx("div", { className: "flex items-center justify-center gap-2 grow", children: showPlaybackControls && (_jsx(PlaybackControls, { isPlaying: isPlaying, onPlay: onPlay, onPause: onPause, onSeekToStart: onSeekToStart, onSeekToEnd: onSeekToEnd, currentTime: currentTime, totalDuration: totalDuration, formatTime: formatTime, playbackRate: playbackRate, setPlaybackRate: setPlaybackRate })) }), _jsxs("div", { className: "flex items-center gap-3 flex-1 justify-end", children: [showAspectRatioControls && onAspectRatioChange && (_jsx(AspectRatioDropdown, { aspectRatio: aspectRatio, onAspectRatioChange: onAspectRatioChange })), showZoomControls && zoomScale !== undefined && setZoomScale && (_jsx(ZoomControls, { zoomScale: zoomScale, setZoomScale: setZoomScale })), onToggleCollapse && (_jsx("button", { onClick: onToggleCollapse, className: "p-1.5 hover:bg-secondary rounded-md transition-colors text-foreground", title: isCollapsed ? "Expand Timeline" : "Collapse Timeline", type: "button", children: isCollapsed ? _jsx(ChevronUp, { className: "w-4 h-4" }) : _jsx(ChevronDown, { className: "w-4 h-4" }) }))] })] }));
};
