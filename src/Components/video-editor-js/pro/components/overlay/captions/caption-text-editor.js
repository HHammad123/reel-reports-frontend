import { jsx as _jsx } from "react/jsx-runtime";
import { Textarea } from "../../ui/textarea";
import { cn } from "../../../utils/general/utils";
export const CaptionTextEditor = ({ text, isActive, onChange, placeholder = "Enter caption text...", }) => {
    return (_jsx(Textarea, { value: text, onChange: (e) => onChange(e.target.value), className: cn("w-full rounded-sm p-2.5 text-sm font-extralight focus:outline-none resize-none min-h-[60px] transition-all duration-200 placeholder:text-muted-foreground/60", isActive
            ? "bg-card text-foreground border-0"
            : "bg-card/50 text-card-muted-foreground border-0 hover:bg-caption-item/5 bg-card"), placeholder: placeholder, style: {
            height: "auto",
            overflow: "hidden",
        }, onInput: (e) => {
            const target = e.target;
            target.style.height = "auto";
            target.style.height = `${target.scrollHeight}px`;
        } }));
};
