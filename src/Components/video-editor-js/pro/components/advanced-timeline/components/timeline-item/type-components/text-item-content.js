import { jsx as _jsx } from "react/jsx-runtime";
import { Type } from 'lucide-react';
import { TimelineItemLabel } from './timeline-item-label';
export const TextItemContent = ({ label, data, isHovering = false, }) => {
    const textToDisplay = (data === null || data === void 0 ? void 0 : data.text) || label;
    return (_jsx(TimelineItemLabel, { icon: Type, label: textToDisplay, defaultLabel: "TEXT", isHovering: isHovering }));
};
