import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEditorContext } from "../../contexts/editor-context";
import { Button } from "../ui/button";
import { Label } from "../ui/label";
import { TIMELINE_CONSTANTS } from "../advanced-timeline/constants";
// Define size presets
const HEIGHT_PRESETS = {
    small: {
        trackHeight: 36,
        itemHeight: 28,
    },
    medium: {
        trackHeight: TIMELINE_CONSTANTS.TRACK_HEIGHT, // 48
        itemHeight: TIMELINE_CONSTANTS.TRACK_ITEM_HEIGHT, // 40
    },
    large: {
        trackHeight: 64,
        itemHeight: 52,
    },
};
export const TimelineHeightSettings = () => {
    const { trackHeight = TIMELINE_CONSTANTS.TRACK_HEIGHT, setTrackHeight, timelineItemHeight = TIMELINE_CONSTANTS.TRACK_ITEM_HEIGHT, setTimelineItemHeight, } = useEditorContext();
    // Determine current size based on values
    const getCurrentSize = () => {
        for (const [size, preset] of Object.entries(HEIGHT_PRESETS)) {
            if (preset.trackHeight === trackHeight && preset.itemHeight === timelineItemHeight) {
                return size;
            }
        }
        return 'medium'; // Default fallback
    };
    const currentSize = getCurrentSize();
    const handleSizeChange = (size) => {
        const preset = HEIGHT_PRESETS[size];
        setTrackHeight === null || setTrackHeight === void 0 ? void 0 : setTrackHeight(preset.trackHeight);
        setTimelineItemHeight === null || setTimelineItemHeight === void 0 ? void 0 : setTimelineItemHeight(preset.itemHeight);
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-extralight", children: "Timeline" }), _jsxs("div", { className: "space-y-2", children: [_jsx(Label, { className: "text-xs", children: "Size" }), _jsx("div", { className: "flex gap-1", children: Object.keys(HEIGHT_PRESETS).map((size) => (_jsx(Button, { onClick: () => handleSizeChange(size), variant: currentSize === size ? "default" : "outline", size: "sm", className: "text-xs capitalize flex-1", children: size }, size))) })] })] }));
};
