import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useCallback } from "react";
import { Slider } from "../../ui/slider";
import ColorPicker from "react-best-gradient-color-picker";
import { Popover, PopoverContent, PopoverTrigger } from "../../ui/popover";
import { Button } from "../../ui/button";

/**
 * ShapeStylePanel Component
 *
 * A panel that allows users to adjust visual appearance settings for a shape overlay.
 * Provides controls for fill color, stroke color, stroke width, and opacity.
 */
export const ShapeStylePanel = ({ localOverlay, handleStyleChange }) => {
    const [fillColor, setFillColor] = useState(
        localOverlay?.styles?.fill || "#3b82f6"
    );
    const [strokeColor, setStrokeColor] = useState(
        localOverlay?.styles?.stroke || "#1e40af"
    );
    const [strokeWidth, setStrokeWidth] = useState(
        localOverlay?.styles?.strokeWidth || 2
    );
    const [opacity, setOpacity] = useState(
        localOverlay?.styles?.opacity !== undefined ? localOverlay.styles.opacity * 100 : 100
    );
    
    const handleFillColorChange = useCallback((color) => {
        setFillColor(color);
        handleStyleChange({ fill: color });
    }, [handleStyleChange]);
    
    const handleStrokeColorChange = useCallback((color) => {
        setStrokeColor(color);
        handleStyleChange({ stroke: color });
    }, [handleStyleChange]);
    
    const handleStrokeWidthChange = useCallback((value) => {
        const width = value[0];
        setStrokeWidth(width);
        handleStyleChange({ strokeWidth: width });
    }, [handleStyleChange]);
    
    const handleOpacityChange = useCallback((value) => {
        const opacityValue = value[0] / 100;
        setOpacity(value[0]);
        handleStyleChange({ opacity: opacityValue });
    }, [handleStyleChange]);
    
    return (
        <div className="space-y-6">
            <div className="space-y-4 rounded-md bg-card p-4 border">
                <h3 className="text-sm font-extralight text-foreground">Appearance</h3>
                
                {/* Fill Color */}
                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Fill Color</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full h-10 justify-start text-left font-normal"
                                style={{ backgroundColor: fillColor }}
                            >
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="w-4 h-4 rounded border border-border"
                                        style={{ backgroundColor: fillColor }}
                                    />
                                    <span className="text-xs">{fillColor}</span>
                                </div>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <ColorPicker
                                value={fillColor}
                                onChange={handleFillColorChange}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                
                {/* Stroke Color */}
                <div className="space-y-2">
                    <label className="text-xs text-muted-foreground">Stroke Color</label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant="outline"
                                className="w-full h-10 justify-start text-left font-normal"
                                style={{ borderColor: strokeColor }}
                            >
                                <div className="flex items-center gap-2">
                                    <div 
                                        className="w-4 h-4 rounded border border-border"
                                        style={{ backgroundColor: strokeColor }}
                                    />
                                    <span className="text-xs">{strokeColor}</span>
                                </div>
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <ColorPicker
                                value={strokeColor}
                                onChange={handleStrokeColorChange}
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                
                {/* Stroke Width */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Stroke Width</label>
                        <span className="text-xs text-muted-foreground min-w-[40px] text-right">
                            {strokeWidth}px
                        </span>
                    </div>
                    <Slider
                        value={[strokeWidth]}
                        onValueChange={handleStrokeWidthChange}
                        min={0}
                        max={20}
                        step={1}
                        className="flex-1"
                    />
                </div>
                
                {/* Opacity */}
                <div className="space-y-2">
                    <div className="flex items-center justify-between">
                        <label className="text-xs text-muted-foreground">Opacity</label>
                        <span className="text-xs text-muted-foreground min-w-[40px] text-right">
                            {opacity}%
                        </span>
                    </div>
                    <Slider
                        value={[opacity]}
                        onValueChange={handleOpacityChange}
                        min={0}
                        max={100}
                        step={1}
                        className="flex-1"
                    />
                </div>
            </div>
        </div>
    );
};

