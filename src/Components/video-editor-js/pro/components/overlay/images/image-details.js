import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useCallback, useMemo } from "react";
import { ImageStylePanel } from "./image-style-panel";
import { ImageSettingsPanel } from "./image-settings-panel";
import { ImagePreview } from "./image-preview";
import { ImageAIPanel } from "./image-ai-panel";
import { UnifiedTabs } from "../shared/unified-tabs";
import { Settings, PaintBucket, Sparkles } from "lucide-react";
/**
 * ImageDetails Component
 *
 * @component
 * @description
 * Provides a tabbed interface for managing image settings and styles.
 * Features include:
 * - Image preview
 * - Style customization panel
 * - Settings configuration panel
 * - Real-time updates
 *
 * The component serves as the main configuration interface
 * for image overlays in the editor.
 *
 * @example
 * ```tsx
 * <ImageDetails
 *   localOverlay={imageOverlay}
 *   setLocalOverlay={handleOverlayUpdate}
 *   onChangeImage={startReplaceMode}
 * />
 * ```
 */
export const ImageDetails = ({ localOverlay, setLocalOverlay, onChangeImage, }) => {
    // FIXED: Memoize callbacks to prevent recreation on every render
    // Also prevent updates if the values haven't actually changed
    const handleStyleChange = useCallback((updates) => {
        setLocalOverlay((prevOverlay) => {
            // Check if any values actually changed to prevent infinite loops
            let hasChanges = false;
            for (const key in updates) {
                if (key === 'animation') {
                    // Deep compare animation object
                    const prevAnimation = prevOverlay.styles.animation || {};
                    const newAnimation = updates.animation || {};
                    if (prevAnimation.enter !== newAnimation.enter || prevAnimation.exit !== newAnimation.exit) {
                        hasChanges = true;
                        break;
                    }
                } else if (key === 'layout3D') {
                    // Deep compare layout3D object
                    const prevLayout3D = prevOverlay.styles.layout3D || {};
                    const newLayout3D = updates.layout3D || {};
                    if (prevLayout3D.layout !== newLayout3D.layout) {
                        hasChanges = true;
                        break;
                    }
                } else if (prevOverlay.styles[key] !== updates[key]) {
                    hasChanges = true;
                    break;
                }
            }
            
            // Only update if there are actual changes
            if (!hasChanges) {
                return prevOverlay;
            }
            
            return {
                ...prevOverlay,
                styles: {
                    ...prevOverlay.styles,
                    ...updates,
                },
            };
        });
    }, [setLocalOverlay]);
    
    /**
     * Handles position and size changes for the image overlay
     */
    const handlePositionChange = useCallback((updates) => {
        setLocalOverlay((prevOverlay) => {
            return {
                ...prevOverlay,
                ...updates,
            };
        });
    }, [setLocalOverlay]);
    
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
            content: _jsx(ImageSettingsPanel, { localOverlay: localOverlay, handleStyleChange: handleStyleChange, onPositionChange: handlePositionChange }),
        },
        {
            value: "style",
            label: "Style",
            icon: paintBucketIcon,
            content: _jsx(ImageStylePanel, { localOverlay: localOverlay, handleStyleChange: handleStyleChange }),
        },
        {
            value: "ai",
            label: "AI",
            icon: sparklesIcon,
            content: _jsx(ImageAIPanel, { localOverlay: localOverlay }),
        },
    ], [localOverlay, handleStyleChange, handlePositionChange, settingsIcon, paintBucketIcon, sparklesIcon]);
    
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(ImagePreview, { overlay: localOverlay, onChangeImage: onChangeImage }), _jsx(UnifiedTabs, { tabs: tabs })] }));
};
