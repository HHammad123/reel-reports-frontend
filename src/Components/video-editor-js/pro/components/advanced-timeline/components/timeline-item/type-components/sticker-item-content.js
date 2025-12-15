import { jsx as _jsx } from "react/jsx-runtime";
import { Smile } from 'lucide-react';
import { TimelineItemLabel } from './timeline-item-label';
export const StickerItemContent = ({ label, isHovering = false // Default to false
 }) => {
    return (_jsx(TimelineItemLabel, { icon: Smile, label: label, defaultLabel: "STICKER", isHovering: isHovering }));
};
