import { jsx as _jsx } from "react/jsx-runtime";
import { captionTemplates } from "../../../templates/caption-templates";
import { AlignLeft, PaintBucket } from "lucide-react";
import { CaptionStylePanel } from "./caption-style-panel";
import { CaptionTimeline } from "./caption-timeline";
import { UnifiedTabs } from "../shared/unified-tabs";
/**
 * Default styling configuration for captions
 * Uses the classic template from caption-templates.ts
 */
export const defaultCaptionStyles = captionTemplates.classic.styles;
/**
 * CaptionSettings Component
 *
 * @component
 * @description
 * Provides a tabbed interface for managing caption settings including:
 * - Caption text and timing management
 * - Visual style customization
 * - Voice settings (planned feature)
 *
 * The component uses a tab-based layout to organize different aspects of caption
 * configuration, making it easier for users to focus on specific settings.
 *
 * @example
 * ```tsx
 * <CaptionSettings
 *   localOverlay={captionOverlay}
 *   setLocalOverlay={handleOverlayUpdate}
 *   currentFrame={30}
 *   startFrame={0}
 *   captions={[...]}
 * />
 * ```
 */
export const CaptionSettings = ({ localOverlay, setLocalOverlay, currentFrame, }) => {
    const currentMs = (currentFrame / 30) * 1000;
    return (_jsx(UnifiedTabs, { defaultValue: "captions", tabs: [
            {
                value: "captions",
                label: "Edit",
                icon: _jsx(AlignLeft, { className: "w-3 h-3" }),
                content: (_jsx("div", { className: "overflow-y-auto [&_[data-radix-scroll-area-viewport]]:!scrollbar-none", style: {
                        height: 'calc(100vh - 120px)',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }, children: _jsx(CaptionTimeline, { localOverlay: localOverlay, setLocalOverlay: setLocalOverlay, currentMs: currentMs }) })),
            },
            {
                value: "display",
                label: "Style",
                icon: _jsx(PaintBucket, { className: "w-3 h-3" }),
                content: (_jsx("div", { className: "overflow-y-auto [&_[data-radix-scroll-area-viewport]]:!scrollbar-none", style: {
                        height: 'calc(100vh - 120px)',
                        scrollbarWidth: 'none',
                        msOverflowStyle: 'none'
                    }, children: _jsx(CaptionStylePanel, { localOverlay: localOverlay, setLocalOverlay: setLocalOverlay }) })),
            },
        ] }));
};
