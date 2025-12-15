import { jsxs as _jsxs, jsx as _jsx } from "react/jsx-runtime";
import { Input } from "../../ui/input";
import { cn } from "../../../utils/general/utils";
export const CaptionTimeInput = ({ label, value, isActive, onChange, onBlur, placeholder = "00:00.0", }) => {
    return (_jsxs("div", { className: "flex items-center gap-1", children: [_jsxs("span", { className: "text-xs text-muted-foreground font-extralight", children: [label, ":"] }), _jsx(Input, { value: value, onChange: (e) => onChange(e.target.value), onBlur: (e) => onBlur(e.target.value), className: cn("h-6 w-16 px-1 text-xs font-extralight text-center transition-colors", isActive
                    ? "text-primary border-caption-overlay/50 bg-background"
                    : "text-foreground border-muted bg-background hover:border-border focus:border-primary focus:text-foreground"), placeholder: placeholder })] }));
};
