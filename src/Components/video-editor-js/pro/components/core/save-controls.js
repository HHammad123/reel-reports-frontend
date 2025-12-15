import { jsx as _jsx } from "react/jsx-runtime";
import { Button } from "../ui/button";
import { Save } from "lucide-react";
/**
 * SaveControls component provides a save button for the project
 */
export const SaveControls = ({ onSave, isSaving = false, }) => {
    return (_jsx(Button, { variant: "ghost", size: "sm", className: "relative hover:bg-accent text-foreground", onClick: onSave, disabled: isSaving, children: _jsx(Save, { className: "w-3.5 h-3.5" }) }));
};
