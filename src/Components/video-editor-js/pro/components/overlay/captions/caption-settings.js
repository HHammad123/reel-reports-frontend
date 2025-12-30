import { jsx as _jsx } from "react/jsx-runtime";
import { captionTemplates } from "../../../templates/caption-templates";
import { PaintBucket } from "lucide-react";
import { CaptionStylePanel } from "./caption-style-panel";
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
 * Provides an interface for managing caption style settings.
 * - Visual style customization
 *
 * The component provides style customization for caption overlays.
 *
 * @example
 * ```tsx
 * <CaptionSettings
 *   localOverlay={captionOverlay}
 *   setLocalOverlay={handleOverlayUpdate}
 *   currentFrame={30}
 * />
 * ```
 */
export const CaptionSettings = ({ localOverlay, setLocalOverlay, currentFrame, }) => {
    return (_jsx(UnifiedTabs, { defaultValue: "display", tabs: [
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
