import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Undo2, Redo2 } from 'lucide-react';
import { Button } from '../../../ui/button';
export const UndoRedoControls = ({ canUndo, canRedo, onUndo, onRedo, }) => {
    return (_jsxs("div", { className: "flex items-center gap-1 border-r border-border pr-3 mr-2", children: [_jsx(Button, { onClick: onUndo, disabled: !canUndo, variant: "link", size: "icon", className: "h-8 w-8", title: "Undo (Ctrl/Cmd + Z)", "aria-label": "Undo last action", onTouchStart: (e) => e.preventDefault(), style: { WebkitTapHighlightColor: 'transparent' }, children: _jsx(Undo2, { className: "w-4 h-4 text-text-secondary" }) }), _jsx(Button, { onClick: onRedo, disabled: !canRedo, variant: "link", size: "icon", className: "h-8 w-8 text-text-secondary", title: "Redo (Ctrl/Cmd + Shift + Z)", "aria-label": "Redo last action", onTouchStart: (e) => e.preventDefault(), style: { WebkitTapHighlightColor: 'transparent' }, children: _jsx(Redo2, { className: "w-4 h-4" }) })] }));
};
