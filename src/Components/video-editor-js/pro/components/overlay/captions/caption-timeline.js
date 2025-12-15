import { jsx as _jsx } from "react/jsx-runtime";
import { useCaptionTimeline } from "../../../hooks/use-caption-timeline";
import { CaptionTimelineContainer } from "./caption-timeline-container";
/**
 * CaptionTimeline Component
 *
 * @component
 * @description
 * Provides an interface for editing and managing caption timing and content.
 * Features include:
 * - Auto-scrolling to active caption
 * - Real-time caption text editing
 * - Inline start and end time editing with validation
 * - Visual feedback for active/upcoming/past captions
 * - Automatic word timing distribution
 * - Overlap detection and timing validation
 *
 * The component handles both the visual representation and editing
 * functionality for caption sequences with comprehensive timing controls.
 *
 * @example
 * ```tsx
 * <CaptionTimeline
 *   localOverlay={captionOverlay}
 *   setLocalOverlay={handleOverlayUpdate}
 *   currentMs={1000}
 * />
 * ```
 */
export const CaptionTimeline = ({ localOverlay, setLocalOverlay, currentMs, }) => {
    const { containerRef, activeCaptionRef, timingErrors, getInputValue, handleInputChange, handleCaptionTextChange, handleTimingChange, } = useCaptionTimeline({
        localOverlay,
        setLocalOverlay,
        currentMs,
    });
    return (_jsx(CaptionTimelineContainer, { localOverlay: localOverlay, currentMs: currentMs, containerRef: containerRef, activeCaptionRef: activeCaptionRef, timingErrors: timingErrors, getInputValue: getInputValue, onInputChange: handleInputChange, onTimingChange: handleTimingChange, onTextChange: handleCaptionTextChange }));
};
