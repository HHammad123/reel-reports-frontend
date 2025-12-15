import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { ContextMenuContent, ContextMenuItem, ContextMenuSeparator } from '../../../ui/context-menu';
export const TimelineItemContextMenu = ({ onDuplicate, onDelete, onSplit, onDuplicateItems, onDeleteItems, onSplitItems, duplicateText, deleteText, showSplit = false, }) => {
    return (_jsxs(ContextMenuContent, { className: "w-48 bg-white", children: [_jsx(ContextMenuItem, { onClick: onDuplicate, disabled: !onDuplicateItems, children: _jsx("span", { children: duplicateText }) }), showSplit && onSplit && onSplitItems && (_jsxs(_Fragment, { children: [_jsx(ContextMenuSeparator, {}), _jsx(ContextMenuItem, { onClick: onSplit, children: _jsx("span", { children: "Split at playhead" }) })] })), _jsx(ContextMenuSeparator, {}), _jsx(ContextMenuItem, { onClick: onDelete, disabled: !onDeleteItems, className: "text-red-600 focus:text-red-600", children: _jsx("span", { children: deleteText }) })] }));
};
