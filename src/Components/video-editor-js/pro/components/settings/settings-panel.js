import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEditorContext } from "../../contexts/editor-context";
import ColorPicker from "react-best-gradient-color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Button } from "../ui/button";
import { Switch } from "../ui/switch";
import { Separator } from "../ui/separator";
import { SaveHistory } from "./save-history";
/**
 * Settings Panel Component
 *
 *
 * A panel that provides settings for the React Video Editor.
 * Currently includes:
 * 1. Background color setting for the video canvas
 * 2. Timeline height size controls
 *
 * Future settings can be added here such as:
 * - Canvas size/aspect ratio
 * - Default animation settings
 * - Export quality settings
 * - Theme preferences
 */
export const SettingsPanel = () => {
    const { backgroundColor = "black", setBackgroundColor, showAlignmentGuides, setShowAlignmentGuides, } = useEditorContext();
    return (_jsxs("div", { className: "p-2 space-y-6", children: [_jsxs("div", { className: "space-y-4", children: [_jsx("h3", { className: "text-sm font-extralight", children: "Player" }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs font-extralight", children: "Background Color" }), _jsxs("div", { className: "flex items-center gap-2 mt-2", children: [_jsx("div", { className: "space-y-2", children: _jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx("div", { className: "h-8 w-8 rounded-md border border-border cursor-pointer", style: { backgroundColor } }) }), _jsx(PopoverContent, { className: "w-[330px] bg-card", side: "right", children: _jsx(ColorPicker, { value: backgroundColor, onChange: (color) => setBackgroundColor === null || setBackgroundColor === void 0 ? void 0 : setBackgroundColor(color), hideHue: true, hideControls: true, hideColorTypeBtns: true, hideAdvancedSliders: true, hideColorGuide: true, hideInputType: true, height: 200 }) })] }) }), _jsx("input", { type: "text", value: backgroundColor, onChange: (e) => setBackgroundColor === null || setBackgroundColor === void 0 ? void 0 : setBackgroundColor(e.target.value), placeholder: "black", className: "flex-1 bg-background border rounded-md text-xs p-2 hover:border transition-colors text-primary" }), backgroundColor !== "black" && (_jsx(Button, { onClick: () => setBackgroundColor === null || setBackgroundColor === void 0 ? void 0 : setBackgroundColor("black"), variant: "ghost", size: "sm", children: "Reset" }))] })] }), _jsx(Separator, {}), _jsx("div", { className: "space-y-2", children: _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight ", children: "Show Alignment Guide" }), _jsx(Switch, { checked: showAlignmentGuides, onCheckedChange: setShowAlignmentGuides })] }) })] }), _jsx(Separator, {}), _jsx(SaveHistory, {})] }));
};
