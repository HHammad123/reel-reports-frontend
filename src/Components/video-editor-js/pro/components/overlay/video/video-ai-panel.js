import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState } from "react";
import { OverlayType } from "../../../types";
import { Button } from "../../ui/button";
import { Wand2, Loader2, CheckCircle, AlertCircle, Sparkles } from "lucide-react";
import { useAICaptions } from "../../../hooks/use-ai-captions";
import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { Slider } from "../../ui/slider";
import { Switch } from "../../ui/switch";
/**
 * VideoAIPanel Component
 *
 * A panel that provides AI-powered actions for video overlays. Currently includes:
 * - Generate captions from video (placeholder)
 *
 * Future AI features could include:
 * - Auto-generate thumbnails
 * - Scene detection
 * - Content analysis
 * - Smart cropping
 *
 * @component
 * @param {VideoAIPanelProps} props - Component props
 * @returns {JSX.Element} The rendered AI panel
 */
export const VideoAIPanel = ({ localOverlay, }) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k, _l, _m, _o, _p, _q, _r, _s;
    const { progress, error, isProcessing, isCompleted, isError, isServiceReady, generateCaptions, reset } = useAICaptions();
    const { overlays, currentFrame, setOverlays, setSelectedOverlayId, changeOverlay } = useEditorContext();
    const { addAtPlayhead } = useTimelinePositioning();
    // Initialize greenscreen state from overlay
    const [greenscreenEnabled, setGreenscreenEnabled] = useState((_b = (_a = localOverlay.greenscreen) === null || _a === void 0 ? void 0 : _a.enabled) !== null && _b !== void 0 ? _b : false);
    const [greenscreenSensitivity, setGreenscreenSensitivity] = useState((_d = (_c = localOverlay.greenscreen) === null || _c === void 0 ? void 0 : _c.sensitivity) !== null && _d !== void 0 ? _d : 100);
    const [redThreshold, setRedThreshold] = useState((_g = (_f = (_e = localOverlay.greenscreen) === null || _e === void 0 ? void 0 : _e.threshold) === null || _f === void 0 ? void 0 : _f.red) !== null && _g !== void 0 ? _g : 100);
    const [greenMin, setGreenMin] = useState((_k = (_j = (_h = localOverlay.greenscreen) === null || _h === void 0 ? void 0 : _h.threshold) === null || _j === void 0 ? void 0 : _j.green) !== null && _k !== void 0 ? _k : 100);
    const [blueThreshold, setBlueThreshold] = useState((_o = (_m = (_l = localOverlay.greenscreen) === null || _l === void 0 ? void 0 : _l.threshold) === null || _m === void 0 ? void 0 : _m.blue) !== null && _o !== void 0 ? _o : 100);
    const [smoothing, setSmoothing] = useState((_q = (_p = localOverlay.greenscreen) === null || _p === void 0 ? void 0 : _p.smoothing) !== null && _q !== void 0 ? _q : 0);
    const [spill, setSpill] = useState((_s = (_r = localOverlay.greenscreen) === null || _r === void 0 ? void 0 : _r.spill) !== null && _s !== void 0 ? _s : 0);
    // Update overlay greenscreen settings
    const updateGreenscreen = (updates) => {
        const newGreenscreen = {
            enabled: greenscreenEnabled,
            sensitivity: greenscreenSensitivity,
            threshold: {
                red: redThreshold,
                green: greenMin,
                blue: blueThreshold,
            },
            smoothing,
            spill,
            ...updates,
        };
        changeOverlay(localOverlay.id, (overlay) => ({
            ...overlay,
            greenscreen: newGreenscreen,
        }));
    };
    const handleGreenscreenToggle = (checked) => {
        setGreenscreenEnabled(checked);
        updateGreenscreen({ enabled: checked });
    };
    const handleSensitivityChange = (value) => {
        setGreenscreenSensitivity(value[0]);
        updateGreenscreen({ sensitivity: value[0] });
    };
    const handleRedThresholdChange = (value) => {
        setRedThreshold(value[0]);
        updateGreenscreen({
            threshold: { red: value[0], green: greenMin, blue: blueThreshold },
        });
    };
    const handleGreenMinChange = (value) => {
        setGreenMin(value[0]);
        updateGreenscreen({
            threshold: { red: redThreshold, green: value[0], blue: blueThreshold },
        });
    };
    const handleBlueThresholdChange = (value) => {
        setBlueThreshold(value[0]);
        updateGreenscreen({
            threshold: { red: redThreshold, green: greenMin, blue: value[0] },
        });
    };
    const handleSmoothingChange = (value) => {
        setSmoothing(value[0]);
        updateGreenscreen({ smoothing: value[0] });
    };
    const handleSpillChange = (value) => {
        setSpill(value[0]);
        updateGreenscreen({ spill: value[0] });
    };
    const handleGenerateCaptions = async () => {
        if (!localOverlay.src) {
            console.error("No video source available");
            return;
        }
        try {
            const captions = await generateCaptions({
                videoSrc: localOverlay.src,
                language: 'en',
                outputFormat: 'json'
            });
            if (captions && captions.length > 0) {
                // Calculate total duration in frames based on the last caption
                const lastCaption = captions[captions.length - 1];
                const totalDurationMs = lastCaption.endMs + 500; // Add small buffer
                const calculatedDurationInFrames = Math.ceil((totalDurationMs / 1000) * 30); // Assuming 30 FPS
                // Add at playhead position
                const { from, row, updatedOverlays } = addAtPlayhead(currentFrame, overlays, 'top');
                // Generate ID
                const newId = updatedOverlays.length > 0 ? Math.max(...updatedOverlays.map((o) => o.id)) + 1 : 0;
                // Create new caption overlay
                const newCaptionOverlay = {
                    id: newId,
                    type: OverlayType.CAPTION,
                    from,
                    durationInFrames: calculatedDurationInFrames,
                    captions: captions,
                    left: 230,
                    top: 414,
                    width: 833,
                    height: 269,
                    rotation: 0,
                    isDragging: false,
                    row,
                };
                // Update overlays with both the shifted overlays and the new overlay in a single operation
                const finalOverlays = [...updatedOverlays, newCaptionOverlay];
                setOverlays(finalOverlays);
                setSelectedOverlayId(newId);
            }
        }
        catch (error) {
            console.error("Failed to generate captions:", error);
        }
    };
    const getButtonContent = () => {
        if (isProcessing) {
            return (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 mr-2 animate-spin" }), "Generating... ", progress !== undefined && `${Math.round(progress)}%`] }));
        }
        if (isCompleted) {
            return (_jsxs(_Fragment, { children: [_jsx(CheckCircle, { className: "w-4 h-4 mr-2" }), "Captions Generated!"] }));
        }
        if (isError) {
            return (_jsxs(_Fragment, { children: [_jsx(AlertCircle, { className: "w-4 h-4 mr-2" }), "Try Again"] }));
        }
        return (_jsxs(_Fragment, { children: [_jsx(Wand2, { className: "w-4 h-4 mr-2" }), "Generate Captions"] }));
    };
    const getButtonVariant = () => {
        if (isCompleted)
            return "default";
        if (isError)
            return "destructive";
        return "default";
    };
    return (_jsxs("div", { className: "space-y-4", children: [_jsx("div", { className: "rounded-lg border bg-card transition-all duration-200 hover:bg-accent/50 hover:border-primary/30", children: _jsx("div", { className: "p-4", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsxs("div", { children: [_jsxs("h4", { className: "text-sm font-extralight text-foreground flex items-center gap-2", children: [_jsx(Sparkles, { className: "w-4 h-4" }), "Green Screen Removal"] }), _jsx("p", { className: "text-xs text-muted-foreground leading-relaxed font-extralight", children: "Remove green screen background from your video" })] }), _jsx(Switch, { checked: greenscreenEnabled, onCheckedChange: handleGreenscreenToggle })] }), greenscreenEnabled && (_jsxs("div", { className: "space-y-3 pt-2 border-t", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight", children: "Sensitivity" }), _jsx("span", { className: "text-xs min-w-[40px] text-right", children: greenscreenSensitivity })] }), _jsx(Slider, { value: [greenscreenSensitivity], onValueChange: handleSensitivityChange, min: 0, max: 255, step: 5, className: "w-full" }), _jsx("p", { className: "text-xs text-muted-foreground font-extralight", children: "Higher values remove more green" })] }), _jsxs("details", { className: "space-y-2", children: [_jsx("summary", { className: "text-xs font-extralight cursor-pointer hover:text-foreground", children: "Advanced Settings" }), _jsxs("div", { className: "space-y-3 pt-2", children: [_jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight", children: "Red Threshold" }), _jsx("span", { className: "text-xs min-w-[40px] text-right", children: redThreshold })] }), _jsx(Slider, { value: [redThreshold], onValueChange: handleRedThresholdChange, min: 0, max: 255, step: 5, className: "w-full" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight", children: "Green Minimum" }), _jsx("span", { className: "text-xs min-w-[40px] text-right", children: greenMin })] }), _jsx(Slider, { value: [greenMin], onValueChange: handleGreenMinChange, min: 0, max: 255, step: 5, className: "w-full" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight", children: "Blue Threshold" }), _jsx("span", { className: "text-xs min-w-[40px] text-right", children: blueThreshold })] }), _jsx(Slider, { value: [blueThreshold], onValueChange: handleBlueThresholdChange, min: 0, max: 255, step: 5, className: "w-full" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight", children: "Edge Smoothing" }), _jsx("span", { className: "text-xs min-w-[40px] text-right", children: smoothing })] }), _jsx(Slider, { value: [smoothing], onValueChange: handleSmoothingChange, min: 0, max: 10, step: 1, className: "w-full" })] }), _jsxs("div", { className: "space-y-2", children: [_jsxs("div", { className: "flex items-center justify-between", children: [_jsx("label", { className: "text-xs font-extralight", children: "Spill Removal" }), _jsx("span", { className: "text-xs min-w-[40px] text-right", children: spill.toFixed(2) })] }), _jsx(Slider, { value: [spill * 100], onValueChange: (value) => handleSpillChange([value[0] / 100]), min: 0, max: 100, step: 5, className: "w-full" }), _jsx("p", { className: "text-xs text-muted-foreground font-extralight", children: "Remove green tint from edges" })] })] })] })] }))] }) }) }), _jsx("div", { className: "space-y-3", children: _jsx("div", { className: "rounded-lg border bg-card transition-all duration-200 hover:bg-accent/50 hover:border-primary/30", children: _jsx("div", { className: "p-4", children: _jsxs("div", { className: "space-y-3", children: [_jsxs("div", { children: [_jsx("h4", { className: "text-sm font-extralight text-foreground mb-1", children: "Auto Captions" }), _jsx("p", { className: "text-xs text-muted-foreground leading-relaxed font-extralight", children: "Generate captions from the video's audio track using AI" }), !isServiceReady && (_jsx("p", { className: "text-xs text-amber-600 mt-1 font-extralight", children: "AI service not configured. Using demo mode." }))] }), error && (_jsx("div", { className: "p-2 rounded bg-destructive/10 border border-destructive/20", children: _jsx("p", { className: "text-xs text-destructive font-extralight", children: error }) })), isProcessing && progress !== undefined && (_jsxs("div", { className: "space-y-1", children: [_jsx("div", { className: "w-full bg-secondary rounded-full h-2", children: _jsx("div", { className: "bg-primary h-2 rounded-full transition-all duration-300", style: { width: `${progress}%` } }) }), _jsx("p", { className: "text-xs text-muted-foreground font-extralight", children: "Processing audio..." })] })), _jsxs("div", { className: "flex gap-2", children: [_jsx(Button, { onClick: handleGenerateCaptions, variant: getButtonVariant(), size: "sm", className: "flex-1 justify-center", disabled: isProcessing, children: getButtonContent() }), (isCompleted || isError) && (_jsx(Button, { onClick: reset, variant: "outline", size: "sm", className: "px-3", children: "Reset" }))] })] }) }) }) })] }));
};
