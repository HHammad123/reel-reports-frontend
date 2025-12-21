import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { cn } from "../../../utils/general/utils";
export const AnimationPreview = ({ animation, isSelected, onClick, }) => {
    const [isHovering, setIsHovering] = useState(false);
    const getAnimationStyle = () => {
        if (!animation.enter || animation.name === "None")
            return {};
        const styles = animation.enter(isHovering ? 40 : 0, 40) || {};
        return {
            ...styles,
            transition: "all 0.6s ease-out",
        };
    };
    return (_jsxs("button", { onClick: onClick, onMouseEnter: () => setIsHovering(true), onMouseLeave: () => setIsHovering(false), className: cn("aspect-square w-full rounded-sm border-2 p-2 transition-all duration-200", "flex flex-col items-center justify-center gap-1", "relative", isSelected
            ? "border-primary bg-primary/20 hover:bg-primary/30"
            : "border-border hover:border-primary/50 hover:bg-primary/10"), style: isSelected ? {
            boxShadow: "0 0 0 2px hsl(var(--primary) / 0.3), 0 2px 4px rgba(0, 0, 0, 0.1)",
        } : {}, children: [_jsxs("div", { className: "relative h-6 w-6", children: [_jsx("div", { className: cn("h-6 w-6 rounded-full transition-opacity duration-300", isSelected ? "border-primary border-dashed border-2" : "border border-border"), style: { opacity: isHovering ? 0.3 : 0.8 } }), animation.name !== "None" && (_jsx("div", { className: "absolute inset-0 h-6 w-6 rounded-full border-2 border-dashed border-primary", style: {
                            ...getAnimationStyle(),
                            opacity: isHovering ? 1 : 0,
                        } }))] }), _jsx("p", { className: cn("text-[10px] font-extralight text-center", isSelected ? "text-primary font-semibold" : "text-muted-foreground"), children: animation.name })] }));
};
