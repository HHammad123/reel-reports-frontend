    import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useMemo, useEffect, useRef, useCallback } from "react";
    import { ToggleGroup, ToggleGroupItem } from "../../ui/toggle-group";
    import { AlignLeft, AlignCenter, AlignRight, RotateCcw } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../ui/select";
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
     * Individual font item that automatically loads font when scrolled into view
 */
const FontItem = ({ 
    fontFamily, 
    previewUrl, 
    isSelected, 
    onClick, 
    loadFontForPreview, 
    isFontLoaded, 
    makeFontPreviewName 
}) => {
        const itemRef = useRef(null);
    
        useEffect(() => {
            const element = itemRef.current;
        if (!element) return;
        
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !isFontLoaded(fontFamily)) {
                        loadFontForPreview(fontFamily, previewUrl).catch(() => {
                            // Silently fail - error is already logged in loadFontPreview
                        });
                    }
                });
            },
            {
                root: null,
                rootMargin: '100px',
                threshold: 0,
            }
        );
        
            observer.observe(element);
            return () => {
                observer.disconnect();
            };
        }, [fontFamily, previewUrl, loadFontForPreview, isFontLoaded]);
    
        const fontLoaded = isFontLoaded(fontFamily);
        const fontFamilyStyle = fontLoaded
            ? { fontFamily: makeFontPreviewName(fontFamily) }
            : {};
    
    return _jsx("button", {
        ref: itemRef,
        onClick: onClick,
        className: `w-full px-3 py-2 text-xs text-left hover:bg-accent hover:text-accent-foreground ${
            isSelected ? "bg-accent text-accent-foreground" : ""
        }`,
        style: fontFamilyStyle,
        children: fontFamily
    });
};

    /**
     * Panel component for managing text overlay styling options
 */
export const TextStylePanel = ({ 
    localOverlay, 
    handleStyleChange, 
    onPositionChange 
}) => {
        const [fontSearch, setFontSearch] = useState("");
        const { loadFontForPreview, makeFontPreviewName, isFontLoaded } = useFontPreviewLoader();
        
    // Debug logging for styles
        const stylesRef = useRef();
        const stylesChanged = localOverlay?.styles && (
            !stylesRef.current ||
            stylesRef.current.fontFamily !== localOverlay.styles.fontFamily ||
            stylesRef.current.fontWeight !== localOverlay.styles.fontWeight ||
            stylesRef.current.fontSize !== localOverlay.styles.fontSize ||
            stylesRef.current.fontSizeScale !== localOverlay.styles.fontSizeScale ||
            stylesRef.current.color !== localOverlay.styles.color ||
            stylesRef.current.textAlign !== localOverlay.styles.textAlign ||
            stylesRef.current.lineHeight !== localOverlay.styles.lineHeight ||
            stylesRef.current.letterSpacing !== localOverlay.styles.letterSpacing ||
            stylesRef.current.opacity !== localOverlay.styles.opacity ||
            stylesRef.current.backgroundColor !== localOverlay.styles.backgroundColor ||
            stylesRef.current.textShadow !== localOverlay.styles.textShadow ||
            stylesRef.current.padding !== localOverlay.styles.padding ||
            stylesRef.current.borderRadius !== localOverlay.styles.borderRadius
        );
        
        if (stylesChanged && localOverlay?.styles) {
            stylesRef.current = { ...localOverlay.styles };
            
            const cssProperties = [];
        if (localOverlay.styles.fontFamily) {
            cssProperties.push(`font-family: ${localOverlay.styles.fontFamily}`);
        }
        if (localOverlay.styles.fontWeight) {
            cssProperties.push(`font-weight: ${localOverlay.styles.fontWeight}`);
        }
        
        const baseSize = localOverlay.styles.fontSize 
            ? parseFloat(String(localOverlay.styles.fontSize).replace('px', '')) 
            : 28;
            const scale = localOverlay.styles.fontSizeScale || 1;
            const actualSize = baseSize * scale;
            cssProperties.push(`font-size: ${actualSize}px (base: ${baseSize}px, scale: ${scale})`);
            
        if (localOverlay.styles.color) {
            cssProperties.push(`color: ${localOverlay.styles.color}`);
        }
        if (localOverlay.styles.textAlign) {
            cssProperties.push(`text-align: ${localOverlay.styles.textAlign}`);
        }
        if (localOverlay.styles.lineHeight) {
            cssProperties.push(`line-height: ${localOverlay.styles.lineHeight}`);
        }
        if (localOverlay.styles.letterSpacing) {
            cssProperties.push(`letter-spacing: ${localOverlay.styles.letterSpacing}`);
        }
            if (localOverlay.styles.opacity !== undefined && localOverlay.styles.opacity !== null) {
                cssProperties.push(`opacity: ${localOverlay.styles.opacity}`);
            }
            if (localOverlay.styles.backgroundColor && localOverlay.styles.backgroundColor !== 'transparent') {
                cssProperties.push(`background-color: ${localOverlay.styles.backgroundColor}`);
            }
        if (localOverlay.styles.textShadow) {
            cssProperties.push(`text-shadow: ${localOverlay.styles.textShadow}`);
        }
        if (localOverlay.styles.padding) {
            cssProperties.push(`padding: ${localOverlay.styles.padding}`);
        }
        if (localOverlay.styles.borderRadius) {
            cssProperties.push(`border-radius: ${localOverlay.styles.borderRadius}`);
        }
            
            const cssString = cssProperties.join('; ');
            
            console.log('%c═══════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold;');
            console.log('%c[TEXT STYLES] Complete CSS for text overlay:', 'color: #4CAF50; font-weight: bold; font-size: 14px;');
            console.log('%c' + cssString, 'color: #2196F3; font-family: monospace; font-size: 12px; background: #f5f5f5; padding: 8px; border-radius: 4px;');
            console.log('%c[TEXT STYLES] Full styles object:', 'color: #FF9800; font-weight: bold;', localOverlay.styles);
            console.log('%c[TEXT STYLES] Text content:', 'color: #9C27B0; font-weight: bold;', localOverlay.content);
            console.log('%c[TEXT STYLES] Position & Size:', 'color: #795548; font-weight: bold;', {
                left: `${localOverlay.left}px`,
                top: `${localOverlay.top}px`,
                width: `${localOverlay.width}px`,
                height: `${localOverlay.height}px`
            });
            console.log('%c═══════════════════════════════════════════════════════════', 'color: #4CAF50; font-weight: bold;');
        }
        
        // Filter fonts based on search
        const filteredFonts = useMemo(() => {
        if (!fontSearch) return GOOGLE_FONTS_LIST;
            const searchTerm = fontSearch.toLowerCase();
        return GOOGLE_FONTS_LIST.filter((font) => 
            font.fontFamily.toLowerCase().includes(searchTerm)
        );
        }, [fontSearch]);
    
    // Parse current letter spacing into em units
        const currentLetterSpacingEm = useMemo(() => {
            const ls = localOverlay.styles.letterSpacing;
        if (!ls) return 0;
            
            const lsString = typeof ls === 'string' ? ls : String(ls || '');
        if (!lsString || lsString === '0' || lsString === '0px' || lsString === '0em') {
                return 0;
        }
            
            const numeric = parseFloat(lsString);
        if (Number.isNaN(numeric)) return 0;
        
        if (typeof lsString === 'string' && lsString.endsWith("px")) {
            return numeric / 16;
        }
        
            return numeric;
        }, [localOverlay.styles.letterSpacing]);
    
    const showFontSizeReset = (localOverlay.styles.fontSizeScale ?? 1) !== 1;
        const showLetterSpacingReset = currentLetterSpacingEm !== 0;
    
    const handleTextAlignChange = useCallback((value) => {
        if (value) {
            handleStyleChange("textAlign", value);
        }
    }, [handleStyleChange]);
    
    const handleFontFamilyChange = useCallback((fontFamily) => {
        handleStyleChange("fontFamily", fontFamily);
                                                                        setFontSearch("");
    }, [handleStyleChange]);
    
    return _jsx(TooltipProvider, {
        children: _jsxs("div", {
            className: "space-y-2",
            children: [
                onPositionChange && _jsx(PositionSettings, {
                    overlayWidth: localOverlay.width,
                    overlayHeight: localOverlay.height,
                    onPositionChange: onPositionChange
                }),
                _jsxs("div", {
                    className: "space-y-4 rounded-md bg-sidebar p-2.5 border",
                    children: [
                        _jsxs("div", {
                            className: "grid grid-cols-2 gap-2",
                            children: [
                                _jsxs("div", {
                                    className: "space-y-2",
                                    children: [
                                        _jsx("label", {
                                            className: "text-xs text-muted-foreground/50",
                                            children: "Font Family"
                                        }),
                                        _jsxs(Popover, {
                                            children: [
                                                _jsx(PopoverTrigger, {
                                                    asChild: true,
                                                    children: _jsx("button", {
                                                        className: "w-full px-3 py-2 text-xs text-left text-foreground bg-background border rounded-md hover:bg-accent hover:text-accent-foreground",
                                                        children: localOverlay.styles.fontFamily || "Select a font"
                                                    })
                                                }),
                                                _jsxs(PopoverContent, {
                                                    className: "w-64 p-0",
                                                    side: "bottom",
                                                    align: "start",
                                                    children: [
                                                        _jsx("div", {
                                                            className: "p-2 border-b",
                                                            children: _jsxs("div", {
                                                                className: "relative",
                                                                children: [
                                                                    _jsx(Search, {
                                                                        className: "absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-muted-foreground"
                                                                    }),
                                                                    _jsx(Input, {
                                                                        placeholder: "Search fonts...",
                                                                        value: fontSearch,
                                                                        onChange: (e) => setFontSearch(e.target.value),
                                                                        className: "pl-7 h-8 text-xs"
                                                                    })
                                                                ]
                                                            })
                                                        }),
                                                        _jsx("div", {
                                                            className: "max-h-[300px] overflow-y-auto",
                                                            children: filteredFonts.length === 0 
                                                                ? _jsx("div", {
                                                                    className: "p-4 text-xs text-center text-muted-foreground",
                                                                    children: "No fonts found"
                                                                })
                                                                : filteredFonts.map((font) => 
                                                                    _jsx(FontItem, {
                                                                        fontFamily: font.fontFamily,
                                                                        previewUrl: font.previewUrl,
                                                                        isSelected: localOverlay.styles.fontFamily === font.fontFamily,
                                                                        onClick: () => handleFontFamilyChange(font.fontFamily),
                                                                        loadFontForPreview: loadFontForPreview,
                                                                        isFontLoaded: isFontLoaded,
                                                                        makeFontPreviewName: makeFontPreviewName
                                                                    }, font.importName)
                                                                )
                                                        })
                                                    ]
                                                })
                                            ]
                                        })
                                    ]
                                }),
                                _jsxs("div", {
                                    className: "space-y-2",
                                    children: [
                                        _jsx("label", {
                                            className: "text-xs text-foreground text-muted-foreground/50",
                                            children: "Font Weight"
                                        }),
                                        _jsxs(Select, {
                                            value: localOverlay.styles.fontWeight || "400",
                                            onValueChange: (value) => handleStyleChange("fontWeight", value),
                                            children: [
                                                _jsx(SelectTrigger, {
                                                    className: "w-full text-xs text-foreground",
                                                    children: _jsx(SelectValue, {
                                                        className: "text-foreground",
                                                        placeholder: "Select weight"
                                                    })
                                                }),
                                                _jsx(SelectContent, {
                                                    children: fontWeights.map((weight) =>
                                                        _jsx(SelectItem, {
                                                            value: weight.value,
                                                            className: "text-xs text-foreground",
                                                            style: { fontWeight: weight.value },
                                                            children: weight.label
                                                        }, weight.value)
                                                    )
                                                })
                                            ]
                                        })
                                    ]
                                })
                            ]
                        }),
                        _jsxs("div", {
                            className: "space-y-4",
                            children: [
                                _jsxs("div", {
                                    className: "flex items-center justify-between",
                                    children: [
                                        _jsx("label", {
                                            className: "text-xs text-muted-foreground/50 py-1",
                                            children: "Font Size"
                                        }),
                                        _jsx("div", {
                                            className: "flex items-center gap-2",
                                            children: showFontSizeReset && _jsxs(Tooltip, {
                                                children: [
                                                    _jsx(TooltipTrigger, {
                                                        asChild: true,
                                                        children: _jsx("button", {
                                                            type: "button",
                                                            onClick: () => handleStyleChange("fontSizeScale", undefined),
                                                            className: "text-xs px-2 py-1.5 rounded-md transition-colors bg-secondary hover:bg-secondary/80 text-secondary-foreground",
                                                            children: _jsx(RotateCcw, {
                                                                className: "h-3 w-3"
                                                            })
                                                        })
                                                    }),
                                                    _jsx(TooltipContent, {
                                                        side: "top",
                                                        children: "Reset font size"
                                                    })
                                                ]
                                            })
                                        })
                                    ]
                                }),
                                _jsx(Slider, {
                                    value: [localOverlay.styles.fontSizeScale || 1],
                                    onValueChange: (value) => handleStyleChange("fontSizeScale", value[0]),
                                    min: 0.3,
                                    max: 3,
                                    step: 0.1,
                                    className: "w-full"
                                })
                            ]
                        }),
                        _jsxs("div", {
                            className: "space-y-4",
                            children: [
                                _jsxs("div", {
                                    className: "flex items-center justify-between",
                                    children: [
                                        _jsx("label", {
                                            className: "text-xs text-muted-foreground/50 py-1",
                                            children: "Letter Spacing"
                                        }),
                                        _jsx("div", {
                                            className: "flex items-center gap-2",
                                            children: showLetterSpacingReset && _jsxs(Tooltip, {
                                                children: [
                                                    _jsx(TooltipTrigger, {
                                                        asChild: true,
                                                        children: _jsx("button", {
                                                            type: "button",
                                                            onClick: () => handleStyleChange("letterSpacing", undefined),
                                                            className: "text-xs px-2 py-1.5 rounded-md transition-colors bg-secondary hover:bg-secondary/80 text-secondary-foreground",
                                                            children: _jsx(RotateCcw, {
                                                                className: "h-3 w-3"
                                                            })
                                                        })
                                                    }),
                                                    _jsx(TooltipContent, {
                                                        side: "top",
                                                        children: "Reset letter spacing"
                                                    })
                                                ]
                                            })
                                        })
                                    ]
                                }),
                                _jsx(Slider, {
                                    value: [currentLetterSpacingEm],
                                    onValueChange: (value) => handleStyleChange("letterSpacing", `${value[0].toFixed(2)}em`),
                                    min: -0.10,
                                    max: 1,
                                    step: 0.01,
                                    className: "w-full"
                                })
                            ]
                        }),
                        _jsx("div", {
                            className: "grid grid-cols-2 gap-2",
                            children: _jsxs("div", {
                                className: "space-y-4",
                                children: [
                                    _jsx("label", {
                                        className: "text-xs text-muted-foreground/50",
                                        children: "Alignment"
                                    }),
                                    _jsxs(ToggleGroup, {
                                        type: "single",
                                        size: "sm",
                                        className: "justify-start gap-1 text-foreground",
                                        value: localOverlay.styles.textAlign || "left",
                                        onValueChange: handleTextAlignChange,
                                        children: [
                                            _jsx(ToggleGroupItem, {
                                                value: "left",
                                                "aria-label": "Align left",
                                                className: "h-10 w-10",
                                                children: _jsx(AlignLeft, {
                                                    className: "h-4 w-4 text-foreground"
                                                })
                                            }),
                                            _jsx(ToggleGroupItem, {
                                                value: "center",
                                                "aria-label": "Align center",
                                                className: "h-10 w-10",
                                                children: _jsx(AlignCenter, {
                                                    className: "h-4 w-4 text-foreground"
                                                })
                                            }),
                                            _jsx(ToggleGroupItem, {
                                                value: "right",
                                                "aria-label": "Align right",
                                                className: "h-10 w-10",
                                                children: _jsx(AlignRight, {
                                                    className: "h-4 w-4 text-foreground"
                                                })
                                            })
                                        ]
                                    })
                                ]
                            })
                        })
                    ]
                }),
                _jsxs("div", {
                    className: "space-y-2 rounded-md bg-sidebar p-2.5 border",
                    children: [
                        _jsx("h5", {
                            className: "text-sm font-light leading-none text-foreground",
                            children: "Colors"
                        }),
                        _jsx("div", {
                            className: "grid grid-cols-2 gap-3",
                            children: !localOverlay.styles.WebkitBackgroundClip 
                                ? _jsxs(_Fragment, {
                                    children: [
                                        _jsxs("div", {
                                            className: "space-y-2",
                                            children: [
                                                _jsx("label", {
                                                    className: "text-xs text-muted-foreground font-medium",
                                                    children: "Text Color"
                                                }),
                                                _jsxs(Popover, {
                                                    children: [
                                                        _jsx(PopoverTrigger, {
                                                            asChild: true,
                                                            children: _jsx("div", {
                                                                className: "h-10 w-full rounded-md border-2 cursor-pointer flex items-center justify-center transition-all hover:border-primary",
                                                                style: { 
                                                                    backgroundColor: localOverlay.styles.color || '#000000' 
                                                                }
                                                            })
                                                        }),
                                                        _jsx(PopoverContent, {
                                                            className: "w-[330px] p-4",
                                                            side: "right",
                                                            children: _jsx(ColorPicker, {
                                                                value: localOverlay.styles.color || '#000000',
                                                                onChange: (color) => handleStyleChange("color", color),
                                                                hideHue: false,
                                                                hideControls: false,
                                                                hideColorTypeBtns: false,
                                                                hideAdvancedSliders: false,
                                                                hideColorGuide: false,
                                                                hideInputType: false,
                                                                height: 250
                                                            })
                                                        })
                                                    ]
                                                })
                                            ]
                                        }),
                                        _jsxs("div", {
                                            className: "space-y-2",
                                            children: [
                                                _jsx("label", {
                                                    className: "text-xs text-muted-foreground font-medium",
                                                    children: "Background Color"
                                                }),
                                                _jsxs(Popover, {
                                                    children: [
                                                        _jsx(PopoverTrigger, {
                                                            asChild: true,
                                                            children: _jsx("div", {
                                                                className: "h-10 w-full rounded-md border-2 cursor-pointer flex items-center justify-center transition-all hover:border-primary",
                                                                style: { 
                                                                    backgroundColor: localOverlay.styles.backgroundColor || 'transparent' 
                                                                }
                                                            })
                                                        }),
                                                        _jsx(PopoverContent, {
                                                            className: "w-[330px] p-4",
                                                            side: "right",
                                                            children: _jsx(ColorPicker, {
                                                                value: localOverlay.styles.backgroundColor || 'transparent',
                                                                onChange: (color) => handleStyleChange("backgroundColor", color),
                                                                hideHue: false,
                                                                hideControls: false,
                                                                hideColorTypeBtns: false,
                                                                hideAdvancedSliders: false,
                                                                hideColorGuide: false,
                                                                hideInputType: false,
                                                                height: 250
                                                            })
                                                        })
                                                    ]
                                                })
                                            ]
                                        })
                                    ]
                                })
                                : _jsx("div", {
                                    className: "col-span-2",
                                    children: _jsx("p", {
                                        className: "text-xs text-muted-foreground",
                                        children: "Color settings are not available for gradient text styles"
                                    })
                                })
                        })
                    ]
                })
            ]
        })
    });
};