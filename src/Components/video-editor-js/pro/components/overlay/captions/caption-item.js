import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { forwardRef } from "react";
import { Card, CardContent } from "../../ui/card";
import { cn } from "../../../utils/general/utils";
import { CaptionTimeInput } from "./caption-time-input";
import { CaptionTextEditor } from "./caption-text-editor";
export const CaptionItem = forwardRef(({ caption, index, isActive, isUpcoming, isPast, timingError, getInputValue, onInputChange, onTimingChange, onTextChange, }, ref) => {
    return (_jsx(Card, { ref: ref, className: cn("bg-background group transition-all duration-200 rounded-sm", isActive
            ? "bg-background text-foreground border border-caption-overlay"
            : isUpcoming || isPast
                ? "border bg-background text-caption-item-foreground opacity-70"
                : "border bg-muted text-muted-foreground hover:bg-caption-item/5 hover:border-caption-item/50"), children: _jsxs(CardContent, { className: "p-3 space-y-2 rounded-sm", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center gap-2", children: [_jsx(CaptionTimeInput, { label: "Start", value: getInputValue(index, 'startMs'), isActive: isActive, onChange: (value) => onInputChange(index, 'startMs', value), onBlur: (value) => onTimingChange(index, 'startMs', value) }), _jsx(CaptionTimeInput, { label: "End", value: getInputValue(index, 'endMs'), isActive: isActive, onChange: (value) => onInputChange(index, 'endMs', value), onBlur: (value) => onTimingChange(index, 'endMs', value) })] }), timingError && (_jsx("div", { className: "text-xs text-destructive font-extralight", children: timingError }))] }), _jsx(CaptionTextEditor, { text: caption.text, isActive: isActive, onChange: (text) => onTextChange(index, text) })] }) }));
});
CaptionItem.displayName = "CaptionItem";
