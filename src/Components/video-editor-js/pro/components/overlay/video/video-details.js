import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
     */
    const handleStyleChange = (updates) => {
        const updatedOverlay = {
            ...localOverlay,
            styles: {
                ...localOverlay.styles,
                ...updates,
            },
        };
        // Update local state immediately for responsive UI
        setLocalOverlay(updatedOverlay);
        // Update global state immediately (no debounce to prevent losing changes)
        changeOverlay(updatedOverlay.id, () => updatedOverlay);
    };
    /**
     * Handles speed and duration changes for the video overlay
     */
    const handleSpeedChange = (speed, newDuration) => {
        const updatedOverlay = {
            ...localOverlay,
            speed,
            durationInFrames: newDuration,
        };
        // First update local state
        setLocalOverlay(updatedOverlay);
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
    };
    /**
     * Handles position and size changes for the video overlay
     */
    const handlePositionChange = (updates) => {
        const updatedOverlay = {
            ...localOverlay,
            ...updates,
        };
        // Update local state immediately for responsive UI
        setLocalOverlay(updatedOverlay);
        // Update global state immediately
        changeOverlay(updatedOverlay.id, () => updatedOverlay);
    };
    return (_jsxs("div", { className: "space-y-2", children: [_jsx(VideoPreview, { overlay: localOverlay, onChangeVideo: onChangeVideo }), _jsx(UnifiedTabs, { tabs: [
                    {
                        value: "settings",
                        label: "Settings",
                        icon: _jsx(Settings, { className: "w-4 h-4" }),
                        content: (_jsx(VideoSettingsPanel, { localOverlay: localOverlay, handleStyleChange: handleStyleChange, onSpeedChange: handleSpeedChange, onPositionChange: handlePositionChange })),
                    },
                    {
                        value: "style",
                        label: "Style",
                        icon: _jsx(PaintBucket, { className: "w-4 h-4" }),
                        content: (_jsx(VideoStylePanel, { localOverlay: localOverlay, handleStyleChange: handleStyleChange })),
                    },
                    {
                        value: "ai",
                        label: "AI",
                        icon: _jsx(Sparkles, { className: "w-4 h-4" }),
                        content: (_jsx(VideoAIPanel, { localOverlay: localOverlay })),
                    },
                ] })] }));
};
