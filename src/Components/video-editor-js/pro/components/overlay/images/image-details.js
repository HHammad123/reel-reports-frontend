import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
    const handleStyleChange = (updates) => {
        const updatedOverlay = {
            ...localOverlay,
            styles: {
                ...localOverlay.styles,
                ...updates,
            },
        };
        setLocalOverlay(updatedOverlay);
    };
    /**
     * Handles position and size changes for the image overlay
     */
    const handlePositionChange = (updates) => {
        const updatedOverlay = {
            ...localOverlay,
            ...updates,
        };
        setLocalOverlay(updatedOverlay);
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx(ImagePreview, { overlay: localOverlay, onChangeImage: onChangeImage }), _jsx(UnifiedTabs, { tabs: [
                    {
                        value: "settings",
                        label: "Settings",
                        icon: _jsx(Settings, { className: "w-4 h-4" }),
                        content: (_jsx(ImageSettingsPanel, { localOverlay: localOverlay, handleStyleChange: handleStyleChange, onPositionChange: handlePositionChange })),
                    },
                    {
                        value: "style",
                        label: "Style",
                        icon: _jsx(PaintBucket, { className: "w-4 h-4" }),
                        content: (_jsx(ImageStylePanel, { localOverlay: localOverlay, handleStyleChange: handleStyleChange })),
                    },
                    {
                        value: "ai",
                        label: "AI",
                        icon: _jsx(Sparkles, { className: "w-4 h-4" }),
                        content: (_jsx(ImageAIPanel, { localOverlay: localOverlay })),
                    },
                ] })] }));
};
