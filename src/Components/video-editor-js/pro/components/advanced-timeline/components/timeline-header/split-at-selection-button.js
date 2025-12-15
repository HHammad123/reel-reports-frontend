import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Scissors } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../../../ui/tooltip';
export const SplitAtSelectionButton = ({ onSplitAtSelection, disabled = false, hasSelectedItem = false, selectedItemsCount = 0 }) => {
    const isDisabled = disabled || !hasSelectedItem;
    const getTooltipMessage = () => {
        if (selectedItemsCount === 0) {
            return 'Select an item to split at playhead';
        }
        if (selectedItemsCount > 1) {
            return 'Select only one item to split';
        }
        if (!hasSelectedItem) {
            return 'Move playhead over selected item to split';
        }
        return 'Split selected item at playhead';
    };
    return (_jsx("div", { className: "hidden md:block", children: _jsx(TooltipProvider, { delayDuration: 50, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx(Button, { onClick: onSplitAtSelection, variant: "ghost", size: "icon", disabled: isDisabled, className: `transition-all duration-200 relative ${isDisabled
                                ? 'text-muted-foreground opacity-50 cursor-not-allowed'
                                : 'text-foreground hover:bg-accent hover:text-accent-foreground'}`, onTouchStart: (e) => e.preventDefault(), style: { WebkitTapHighlightColor: 'transparent' }, children: _jsx(Scissors, { className: "w-4 h-4 transition-all duration-300" }) }) }), _jsx(TooltipContent, { side: "top", sideOffset: 8, className: "bg-popover border-border text-popover-foreground shadow-md", children: getTooltipMessage() })] }) }) }));
};
