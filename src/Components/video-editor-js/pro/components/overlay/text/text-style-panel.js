import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo, useEffect, useRef } from "react";
import { ToggleGroup, ToggleGroupItem } from "../../ui/toggle-group";
import { AlignLeft, AlignCenter, AlignRight, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, } from "../../ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Slider } from "../../ui/slider";
import ColorPicker from "react-best-gradient-color-picker";
import { GOOGLE_FONTS_LIST } from "../../../data/google-fonts-list";
import { useFontPreviewLoader } from "../../../utils/text/load-font-preview";
import { Input } from "../../ui/input";
import { Search } from "lucide-react";
import { PositionSettings } from "../../shared/position/position-settings";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "../../ui/tooltip";
/**
 * Font weight options
 */
const fontWeights = [
    { value: "100", label: "Thin" },
    { value: "200", label: "Extra Light" },
    { value: "300", label: "Light" },
    { value: "400", label: "Regular" },
    { value: "500", label: "Medium" },
    { value: "600", label: "Semi Bold" },
    { value: "700", label: "Bold" },
    { value: "800", label: "Extra Bold" },
    { value: "900", label: "Black" },
];
/**
 * Extract available weights from FontInfo metadata
 * @param fontInfo - Font metadata from Google Fonts API
 * @returns Array of available weight strings
 */
function extractAvailableWeights(fontInfo) {
    const weights = new Set();
    // Extract weights from normal style
    if (fontInfo.fonts.normal) {
        Object.keys(fontInfo.fonts.normal).forEach(weight => weights.add(weight));
    }
    // Extract weights from italic style (usually same weights, but include them too)
    if (fontInfo.fonts.italic) {
        Object.keys(fontInfo.fonts.italic).forEach(weight => weights.add(weight));
    }
    // Convert to array and sort numerically
    return Array.from(weights).sort((a, b) => parseInt(a) - parseInt(b));
}
/**
 * Individual font item that automatically loads font when scrolled into view
 */
const FontItem = ({ fontFamily, previewUrl, isSelected, onClick, loadFontForPreview, isFontLoaded, makeFontPreviewName, }) => {
    const itemRef = useRef(null);
    useEffect(() => {
        const element = itemRef.current;
        if (!element)
            return;
        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting && !isFontLoaded(fontFamily)) {
                    // Load font as soon as it comes into view, using the correct previewUrl
                    loadFontForPreview(fontFamily, previewUrl).catch(() => {
                        // Silently fail - error is already logged in loadFontPreview
                    });
                }
            });
        }, {
            root: null,
            rootMargin: '100px', // Start loading before it comes into view
            threshold: 0,
        });
        observer.observe(element);
        return () => {
            observer.disconnect();
        };
    }, [fontFamily, previewUrl, loadFontForPreview, isFontLoaded]);
    const fontLoaded = isFontLoaded(fontFamily);
    const fontFamilyStyle = fontLoaded
        ? { fontFamily: makeFontPreviewName(fontFamily) }
        : {};
    return (_jsx("button", { ref: itemRef, onClick: onClick, className: `w-full px-3 py-2 text-xs text-left hover:bg-accent hover:text-accent-foreground ${isSelected ? "bg-accent text-accent-foreground" : ""}`, style: fontFamilyStyle, children: fontFamily }));
};
/**
 * Panel component for managing text overlay styling options
 * Provides controls for typography settings (font family, alignment) and colors (text color, highlight)
 *
 * @component
 * @param {TextStylePanelProps} props - Component props
 * @returns {JSX.Element} A panel with text styling controls
 */
export const TextStylePanel = ({ localOverlay, handleStyleChange, onPositionChange, }) => {
    var _a;
    const [fontSearch, setFontSearch] = useState("");
    // REMOVED: availableWeights state - no longer needed, showing all font weights
    const { loadFontForPreview, makeFontPreviewName, isFontLoaded } = useFontPreviewLoader();
    
    // REMOVED: Auto-apply logic that caused infinite loops
    // Styles should already be present when overlay is created in VideosList.js
    // This panel is now a pure display/edit component
    
    // Optional: Add debug logging to verify styles are present
    useEffect(() => {
        if (localOverlay?.id) {
            console.log('[TextStylePanel] Displaying text overlay:', {
                overlayId: localOverlay.id,
                hasStyles: !!localOverlay.styles && Object.keys(localOverlay.styles).length > 0,
                fontSizeScale: localOverlay.styles?.fontSizeScale,
                fontSize: localOverlay.styles?.fontSize,
                fontFamily: localOverlay.styles?.fontFamily,
                fontWeight: localOverlay.styles?.fontWeight,
                color: localOverlay.styles?.color,
                textAlign: localOverlay.styles?.textAlign,
                letterSpacing: localOverlay.styles?.letterSpacing,
                lineHeight: localOverlay.styles?.lineHeight,
                opacity: localOverlay.styles?.opacity,
                backgroundColor: localOverlay.styles?.backgroundColor,
                textShadow: localOverlay.styles?.textShadow,
                padding: localOverlay.styles?.padding,
                borderRadius: localOverlay.styles?.borderRadius,
                hasSrc: !!localOverlay.src,
                src: localOverlay.src || null,
            });
        }
    }, [localOverlay?.id]);
    
    // REMOVED: Font weight fetching useEffect that called handleStyleChange
    // This could cause infinite loops if the font weight changes trigger re-renders
    // Font weights are now handled statically via the fontWeights array
    
    // Filter fonts based on search
    const filteredFonts = useMemo(() => {
        if (!fontSearch)
            return GOOGLE_FONTS_LIST;
        const searchTerm = fontSearch.toLowerCase();
        return GOOGLE_FONTS_LIST.filter((font) => font.fontFamily.toLowerCase().includes(searchTerm));
    }, [fontSearch]);
    // Parse current letter spacing into em units for the slider control
    const currentLetterSpacingEm = useMemo(() => {
        const ls = localOverlay.styles.letterSpacing;
        if (!ls)
            return 0;
        
        // Handle different types: string, number, or null/undefined
        const lsString = typeof ls === 'string' ? ls : String(ls || '');
        if (!lsString || lsString === '0' || lsString === '0px' || lsString === '0em')
            return 0;
        
        const numeric = parseFloat(lsString);
        if (Number.isNaN(numeric))
            return 0;
        
        // Check if it ends with "px" (convert to em) or "em" (use as-is)
        if (typeof lsString === 'string' && lsString.endsWith("px"))
            return numeric / 16; // Convert px to em (approx.)
        
        // If it's already in em or a bare number, return as-is
        return numeric;
    }, [localOverlay.styles.letterSpacing]);
    const showFontSizeReset = ((_a = localOverlay.styles.fontSizeScale) !== null && _a !== void 0 ? _a : 1) !== 1;
    const showLetterSpacingReset = currentLetterSpacingEm !== 0;
    return (_jsx(TooltipProvider, { children: _jsxs("div", { className: "space-y-2", children: [onPositionChange && (_jsx(PositionSettings, { overlayWidth: localOverlay.width, overlayHeight: localOverlay.height, onPositionChange: onPositionChange })), _jsxs("div", { className: "space-y-4 rounded-md bg-sidebar p-2.5 border", children: [_jsxs("div", { className: "grid grid-cols-2 gap-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs text-muted-foreground/50", children: "Font Family" }), _jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx("button", { className: "w-full px-3 py-2 text-xs text-left text-foreground bg-background border rounded-md hover:bg-accent hover:text-accent-foreground", children: localOverlay.styles.fontFamily || "Select a font" }) }), _jsxs(PopoverContent, { className: "w-64 p-0", side: "bottom", align: "start", children: [_jsx("div", { className: "p-2 border-b", children: _jsxs("div", { className: "relative", children: [_jsx(Search, { className: "absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground" }), _jsx(Input, { placeholder: "Search fonts...", value: fontSearch, onChange: (e) => setFontSearch(e.target.value), className: "pl-7 h-8 text-xs" })] }) }), _jsx("div", { className: "max-h-[300px] overflow-y-auto", children: filteredFonts.length === 0 ? (_jsx("div", { className: "p-4 text-xs text-center text-muted-foreground", children: "No fonts found" })) : (filteredFonts.map((font) => (_jsx(FontItem, { fontFamily: font.fontFamily, previewUrl: font.previewUrl, isSelected: localOverlay.styles.fontFamily === font.fontFamily, onClick: () => {
                                                                    handleStyleChange("fontFamily", font.fontFamily);
                                                                    setFontSearch("");
                                                                }, loadFontForPreview: loadFontForPreview, isFontLoaded: isFontLoaded, makeFontPreviewName: makeFontPreviewName }, font.importName)))) })] })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs text-foreground text-muted-foreground/50", children: "Font Weight" }), _jsxs(Select, { value: localOverlay.styles.fontWeight || "400", onValueChange: (value) => handleStyleChange("fontWeight", value), children: [_jsx(SelectTrigger, { className: "w-full text-xs text-foreground", children: _jsx(SelectValue, { className: "text-foreground", placeholder: "Select weight" }) }),                     _jsx(SelectContent, { children: fontWeights
                                                        // REMOVED: .filter((weight) => availableWeights.includes(weight.value))
                                                        // Now showing all font weights - Google Fonts will handle fallback if weight doesn't exist
                                                        .map((weight) => (_jsx(SelectItem, { value: weight.value, className: "text-xs text-foreground", style: { fontWeight: weight.value }, children: weight.label }, weight.value))) })] })] })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs text-muted-foreground/50 py-1", children: "Font Size" }), _jsx("div", { className: "flex items-center gap-2", children: showFontSizeReset && (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: () => handleStyleChange("fontSizeScale", undefined), className: "text-xs px-2 py-1.5 rounded-md transition-colors bg-secondary hover:bg-secondary/80 text-secondary-foreground", children: _jsx(RotateCcw, { className: "h-3 w-3" }) }) }), _jsx(TooltipContent, { side: "top", children: "Reset font size" })] })) })] }), _jsx(Slider, { value: [localOverlay.styles.fontSizeScale || 1], onValueChange: (value) => handleStyleChange("fontSizeScale", value[0]), min: 0.3, max: 3, step: 0.1, className: "w-full" })] }), _jsxs("div", { className: "space-y-4", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs text-muted-foreground/50 py-1", children: "Letter Spacing" }), _jsx("div", { className: "flex items-center gap-2", children: showLetterSpacingReset && (_jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { type: "button", onClick: () => handleStyleChange("letterSpacing", undefined), className: "text-xs px-2 py-1.5 rounded-md transition-colors bg-secondary hover:bg-secondary/80 text-secondary-foreground", children: _jsx(RotateCcw, { className: "h-3 w-3" }) }) }), _jsx(TooltipContent, { side: "top", children: "Reset letter spacing" })] })) })] }), _jsx(Slider, { value: [currentLetterSpacingEm], onValueChange: (value) => handleStyleChange("letterSpacing", `${value[0].toFixed(2)}em`), min: -0.10, max: 1, step: 0.01, className: "w-full" })] }), _jsx("div", { className: "grid grid-cols-2 gap-2", children: _jsxs("div", { className: "space-y-4", children: [_jsx("label", { className: "text-xs text-muted-foreground/50", children: "Alignment" }), _jsxs(ToggleGroup, { type: "single", size: "sm", className: "justify-start gap-1 text-foreground", value: localOverlay.styles.textAlign || "left", onValueChange: (value) => {
                                            if (value)
                                                handleStyleChange("textAlign", value);
                                        }, children: [_jsx(ToggleGroupItem, { value: "left", "aria-label": "Align left", className: "h-10 w-10", children: _jsx(AlignLeft, { className: "h-4 w-4 text-foreground" }) }), _jsx(ToggleGroupItem, { value: "center", "aria-label": "Align center", className: "h-10 w-10", children: _jsx(AlignCenter, { className: "h-4 w-4 text-foreground" }) }), _jsx(ToggleGroupItem, { value: "right", "aria-label": "Align right", className: "h-10 w-10", children: _jsx(AlignRight, { className: "h-4 w-4 text-foreground" }) })] })] }) })] }), _jsxs("div", { className: "space-y-2 rounded-md bg-sidebar p-2.5 border", children: [_jsx("h5", { className: "text-sm font-light leading-none text-foreground", children: "Colors" }), _jsx("div", { className: "grid grid-cols-3 gap-2", children: !localOverlay.styles.WebkitBackgroundClip ? (_jsxs(_Fragment, { children: [_jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Text Color" }), _jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx("div", { className: "h-8 w-8 rounded-md border cursor-pointer", style: { backgroundColor: localOverlay.styles.color } }) }), _jsx(PopoverContent, { className: "w-[330px]", side: "right", children: _jsx(ColorPicker, { value: localOverlay.styles.color, onChange: (color) => handleStyleChange("color", color), 
                                                            // hideInputs
                                                            hideHue: true, hideControls: true, hideColorTypeBtns: true, hideAdvancedSliders: true, hideColorGuide: true, hideInputType: true, height: 200 }) })] })] }), _jsxs("div", { className: "space-y-2", children: [_jsx("label", { className: "text-xs text-muted-foreground", children: "Highlight" }), _jsxs(Popover, { children: [_jsx(PopoverTrigger, { asChild: true, children: _jsx("div", { className: "h-8 w-8 rounded-md border cursor-pointer", style: {
                                                                backgroundColor: localOverlay.styles.backgroundColor,
                                                            } }) }), _jsx(PopoverContent, { className: "w-[330px]", side: "right", children: _jsx(ColorPicker, { value: localOverlay.styles.backgroundColor, onChange: (color) => {
                                                                handleStyleChange("backgroundColor", color);
                                                            }, hideInputs: true, hideHue: true, hideControls: true, hideColorTypeBtns: true, hideAdvancedSliders: true, hideColorGuide: true, hideInputType: true, height: 200 }) })] })] })] })) : (_jsx("div", { className: "col-span-3", children: _jsx("p", { className: "text-xs text-muted-foreground", children: "Color settings are not available for gradient text styles" }) })) })] })] }) }));
};
