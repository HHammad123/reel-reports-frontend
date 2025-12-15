import { jsx as _jsx } from "react/jsx-runtime";
import { CaptionItem } from "./caption-item";
export const CaptionTimelineContainer = ({ localOverlay, currentMs, containerRef, activeCaptionRef, timingErrors, getInputValue, onInputChange, onTimingChange, onTextChange, }) => {
    var _a;
    return (_jsx("div", { className: "bg-background space-y-2 max-h-screen overflow-y-auto scrollbar-none scrollbar-hidden rounded-sm", ref: containerRef, children: (_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.captions) === null || _a === void 0 ? void 0 : _a.map((caption, index) => {
            // Convert absolute currentMs to relative time for comparison with stored caption timings
            const overlayStartMs = (localOverlay.from / 30) * 1000;
            const relativeCurrentMs = Math.max(0, currentMs - overlayStartMs);
            const isActive = relativeCurrentMs >= caption.startMs && relativeCurrentMs < caption.endMs;
            const isUpcoming = relativeCurrentMs < caption.startMs;
            const isPast = relativeCurrentMs >= caption.endMs;
            return (_jsx(CaptionItem, { ref: isActive ? activeCaptionRef : undefined, caption: caption, index: index, isActive: isActive, isUpcoming: isUpcoming, isPast: isPast, timingError: timingErrors[index], getInputValue: getInputValue, onInputChange: onInputChange, onTimingChange: onTimingChange, onTextChange: onTextChange }, index));
        }) }));
};
