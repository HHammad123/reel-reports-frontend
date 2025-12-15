import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { Loader2, CheckCircle2 } from "lucide-react";
/**
 * Component that displays the current autosave status
 */
export const AutosaveStatus = ({ lastSaveTime, isSaving = false, }) => {
    const [visible, setVisible] = useState(false);
    const [isAnimating, setIsAnimating] = useState(false);
    // Show status when saving starts or a new save completes
    useEffect(() => {
        if (isSaving || lastSaveTime) {
            setVisible(true);
            setIsAnimating(true);
            // Hide status after 3 seconds
            const timer = setTimeout(() => {
                setIsAnimating(false);
                setTimeout(() => setVisible(false), 200); // Small delay for fade out
            }, 3000);
            return () => clearTimeout(timer);
        }
        return undefined;
    }, [isSaving, lastSaveTime]);
    // Format the last save time
    const formattedTime = lastSaveTime
        ? new Date(lastSaveTime).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        })
        : "";
    // Don't render anything if not visible
    if (!visible) {
        return null;
    }
    return (_jsx("div", { className: `
        fixed bottom-6 right-6 
        bg-background
        border-muted-foreground/50
        text-text-primary
        px-4 py-3 rounded-md
        text-sm font-extralight
        flex items-center gap-3 
        z-50
        transition-all duration-300 ease-out
        ${isAnimating
            ? "opacity-100 translate-y-0 scale-100"
            : "opacity-0 translate-y-2 scale-95"}
      `, children: isSaving ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "h-4 w-4 text-text-secondary animate-spin" }), _jsx("span", { className: "text-text-secondary", children: "Saving..." })] })) : (_jsxs(_Fragment, { children: [_jsx(CheckCircle2, { className: "h-4 w-4 text-success" }), _jsxs("span", { className: "text-text-secondary", children: ["Saved at ", formattedTime] })] })) }));
};
