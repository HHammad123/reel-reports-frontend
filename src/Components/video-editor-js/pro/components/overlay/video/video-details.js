import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from "react";
import { VideoStylePanel } from "./video-style-panel";
import { VideoSettingsPanel } from "./video-settings-panel";
import { VideoAIPanel } from "./video-ai-panel";
import { VideoPreview } from "./video-preview";
import { useOverlayOverlapCheck } from "../../../hooks/use-overlay-overlap-check";
import { useEditorContext } from "../../../contexts/editor-context";
import { UnifiedTabs } from "../shared/unified-tabs";
import { Settings, PaintBucket, Sparkles } from "lucide-react";
/**
 * VideoDetails component for managing video overlay configuration
 */
export const VideoDetails = ({ localOverlay, setLocalOverlay, onChangeVideo, }) => {
    const { checkAndAdjustOverlaps } = useOverlayOverlapCheck();
    const { overlays, setOverlays, changeOverlay } = useEditorContext();
    
    /**
     * Updates the style properties of the video overlay
     * FIXED: Uses functional updates to prevent callback recreation
     */
    const handleStyleChange = useCallback((updates) => {
        setLocalOverlay((prevOverlay) => {
            const updatedOverlay = {
                ...prevOverlay,
                styles: {
                    ...prevOverlay.styles,
                    ...updates,
                },
            };
            // Update global state immediately (no debounce to prevent losing changes)
            changeOverlay(updatedOverlay.id, () => updatedOverlay);
            return updatedOverlay;
        });
    }, [setLocalOverlay, changeOverlay]);
    
    /**
     * Handles speed and duration changes for the video overlay
     * FIXED: Uses functional updates to prevent callback recreation
     */
    const handleSpeedChange = useCallback((speed, newDuration) => {
        setLocalOverlay((prevOverlay) => {
            const updatedOverlay = {
                ...prevOverlay,
                speed,
                durationInFrames: newDuration,
            };
            // Then check for overlaps and update global state
            const { hasOverlap, adjustedOverlays } = checkAndAdjustOverlaps(updatedOverlay, overlays);
            // Create the final array of overlays to update
            const finalOverlays = overlays.map((overlay) => {
                if (overlay.id === updatedOverlay.id) {
                    return updatedOverlay;
                }
                if (hasOverlap) {
                    const adjustedOverlay = adjustedOverlays.find((adj) => adj.id === overlay.id);
                    return adjustedOverlay || overlay;
                }
                return overlay;
            });
            // Update global state in one operation
            setOverlays(finalOverlays);
            return updatedOverlay;
        });
    }, [setLocalOverlay, overlays, setOverlays, checkAndAdjustOverlaps]);
    
    /**
     * Handles position and size changes for the video overlay
     * FIXED: Uses functional updates to prevent callback recreation
     */
    const handlePositionChange = useCallback((updates) => {
        setLocalOverlay((prevOverlay) => {
            const updatedOverlay = {
                ...prevOverlay,
                ...updates,
            };
            // Update global state immediately
            changeOverlay(updatedOverlay.id, () => updatedOverlay);
            return updatedOverlay;
        });
    }, [setLocalOverlay, changeOverlay]);
    
    // FIXED: Memoize tabs array to prevent UnifiedTabs re-renders
    // Stable icon references created once
    const settingsIcon = useMemo(() => _jsx(Settings, { className: "w-4 h-4" }), []);
    const paintBucketIcon = useMemo(() => _jsx(PaintBucket, { className: "w-4 h-4" }), []);
    const sparklesIcon = useMemo(() => _jsx(Sparkles, { className: "w-4 h-4" }), []);
    
    const tabs = useMemo(() => [
        {
            value: "settings",
            label: "Settings",
            icon: settingsIcon,
            content: _jsx(VideoSettingsPanel, { localOverlay: localOverlay, handleStyleChange: handleStyleChange, onSpeedChange: handleSpeedChange, onPositionChange: handlePositionChange }),
        },
        {
            value: "style",
            label: "Style",
            icon: paintBucketIcon,
            content: _jsx(VideoStylePanel, { localOverlay: localOverlay, handleStyleChange: handleStyleChange }),
        },
        {
            value: "ai",
            label: "AI",
            icon: sparklesIcon,
            content: _jsx(VideoAIPanel, { localOverlay: localOverlay }),
        },
    ], [localOverlay, handleStyleChange, handleSpeedChange, handlePositionChange, settingsIcon, paintBucketIcon, sparklesIcon]);
    
    return (_jsxs("div", { className: "space-y-2", children: [_jsx(VideoPreview, { overlay: localOverlay, onChangeVideo: onChangeVideo }), _jsx(UnifiedTabs, { tabs: tabs })] }));
};
