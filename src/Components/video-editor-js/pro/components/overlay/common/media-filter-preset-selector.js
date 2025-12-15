import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { ChevronDown, Check } from "lucide-react";
import { defaultMediaFilterPresets } from "../../../types/media-filters";
/**
 * MediaFilterPresetSelector Component
 *
 * A visual component for selecting predefined filters/presets for media (images and videos).
 * Displays visual previews of each filter applied to a thumbnail of the current media.
 *
 * @component
 * @param {MediaFilterPresetSelectorProps} props - Component props
 * @returns {JSX.Element} A grid of filter previews
 */
export const MediaFilterPresetSelector = ({ localOverlay, handleStyleChange }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    // Determine which preset (if any) is currently active
    const getCurrentPresetId = () => {
        var _a;
        const currentFilter = ((_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _a === void 0 ? void 0 : _a.filter) || "none";
        // If no filter is applied or it's explicitly "none", return "none"
        if (!currentFilter || currentFilter === "none") {
            return "none";
        }
        // Try to find a matching preset
        const matchingPreset = defaultMediaFilterPresets.find((preset) => preset.filter === currentFilter);
        // Return the matching preset ID or "custom" if no match is found
        return (matchingPreset === null || matchingPreset === void 0 ? void 0 : matchingPreset.id) || "custom";
    };
    // Get the current preset name for display
    const getCurrentPresetName = () => {
        const currentId = getCurrentPresetId();
        if (currentId === "custom")
            return "Custom";
        const preset = defaultMediaFilterPresets.find((p) => p.id === currentId);
        return (preset === null || preset === void 0 ? void 0 : preset.name) || "None";
    };
    // When a new preset is selected, apply its filter
    const handlePresetChange = (presetId) => {
        var _a;
        const selectedPreset = defaultMediaFilterPresets.find((preset) => preset.id === presetId);
        if (selectedPreset) {
            // Preserve any brightness adjustments if the user has made them
            let newFilter = selectedPreset.filter;
            // If we're selecting "none", remove all filters
            if (presetId === "none") {
                newFilter = "none";
            }
            // Otherwise, try to preserve brightness from existing filter
            else {
                const currentFilter = (_a = localOverlay === null || localOverlay === void 0 ? void 0 : localOverlay.styles) === null || _a === void 0 ? void 0 : _a.filter;
                const brightnessMatch = currentFilter === null || currentFilter === void 0 ? void 0 : currentFilter.match(/brightness\((\d+)%\)/);
                if (brightnessMatch &&
                    brightnessMatch[1] &&
                    !newFilter.includes("brightness") &&
                    newFilter !== "none") {
                    // Add brightness to the new filter if the new filter doesn't already have it
                    newFilter = `${newFilter} brightness(${brightnessMatch[1]}%)`;
                }
            }
            handleStyleChange({ filter: newFilter });
            setIsExpanded(false);
        }
    };
    // Get the content to display in the preview (either video src or image src)
    const getMediaContent = () => {
        if (localOverlay.type === "video") {
            return localOverlay.content;
        }
        else {
            return localOverlay.src;
        }
    };
    return (_jsxs("div", { className: "space-y-2", children: [_jsx("div", { className: "flex items-center justify-between", children: _jsx("div", { className: "flex items-center gap-1.5", children: _jsx("label", { className: "text-xs text-muted-foreground", children: "Filter Preset" }) }) }), _jsxs("button", { onClick: () => setIsExpanded(!isExpanded), className: "flex justify-between items-center w-full bg-background border border-input rounded-md text-xs p-2 hover:border-accent-foreground transition-colors text-foreground", children: [_jsx("span", { children: getCurrentPresetName() }), _jsx(ChevronDown, { className: `w-4 h-4 transition-transform ${isExpanded ? "rotate-180" : ""}` })] }), isExpanded && (_jsx("div", { className: "mt-2 grid grid-cols-3 gap-2 bg-background p-2 rounded-md border border-input shadow-sm", children: defaultMediaFilterPresets.map((preset) => {
                    const isActive = getCurrentPresetId() === preset.id;
                    return (_jsxs("button", { onClick: () => handlePresetChange(preset.id), className: `relative p-1 rounded-md overflow-hidden flex flex-col items-center transition-all ${isActive ? "ring-2 ring-primary" : "hover:bg-muted"}`, children: [_jsxs("div", { className: "relative h-12 w-full mb-1 rounded overflow-hidden", children: [_jsx("img", { src: getMediaContent(), alt: `${preset.name} preview`, className: "absolute inset-0 w-full h-full object-cover", style: { filter: preset.filter } }), isActive && (_jsx("div", { className: "absolute top-1 right-1 bg-primary rounded-full p-0.5", children: _jsx(Check, { className: "h-3 w-3 text-background" }) }))] }), _jsx("span", { className: "text-[10px] leading-tight text-center", children: preset.name })] }, preset.id));
                }) }))] }));
};
