import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, } from "../../ui/alert-dialog";
export const ApplyTemplateDialog = ({ open, onOpenChange, selectedTemplate, onApplyTemplate, }) => {
    const handleApply = () => {
        if (selectedTemplate) {
            onApplyTemplate(selectedTemplate);
        }
    };
    return (_jsx(AlertDialog, { open: open, onOpenChange: onOpenChange, children: _jsxs(AlertDialogContent, { className: "w-[90%] max-w-md mx-auto rounded-lg p-6", children: [_jsxs(AlertDialogHeader, { children: [_jsx(AlertDialogTitle, { className: "text-lg font-extralight text-foreground", children: "Apply Template" }), _jsx(AlertDialogDescription, { className: "text-sm text-muted-foreground font-extralight", children: "Are you sure you want to add this template to your timeline? It will replace all existing overlays." })] }), _jsxs(AlertDialogFooter, { className: "gap-3", children: [_jsx(AlertDialogCancel, { className: "h-8 text-xs font-extralight text-muted-foreground", children: "Cancel" }), _jsx(AlertDialogAction, { className: "h-8 text-xs font-extralight", onClick: handleApply, children: "Apply Template" })] })] }) }));
};
