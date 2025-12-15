import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Button } from '../../../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../ui/tooltip';
import { FoldVertical } from 'lucide-react';
export const AutoRemoveEmptyTracksToggle = ({ enabled, onToggle, }) => {
    return (_jsx("div", { className: "hidden md:block", children: _jsx(TooltipProvider, { delayDuration: 50, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { onClick: () => onToggle(!enabled), variant: enabled ? "outline" : "ghost", size: "icon", className: `transition-all duration-200 relative ${enabled
                                ? 'border-primary '
                                : ' text-muted-foreground'}`, onTouchStart: (e) => e.preventDefault(), style: { WebkitTapHighlightColor: 'transparent' }, children: _jsx(FoldVertical, { className: `w-4 h-4 transition-all duration-300 ` }) }) }), _jsx(TooltipContent, { side: "top", sideOffset: 8, className: "bg-popover border-border text-popover-foreground shadow-md", children: enabled
                            ? 'Auto-remove empty tracks'
                            : 'Enable auto-removal of empty tracks' })] }) }) }));
};
