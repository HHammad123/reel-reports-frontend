import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from "react";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { useEditorContext } from "../../../contexts/editor-context";
import { OverlayType } from "../../../types";
import { CaptionSettings } from "./caption-settings";
import { CaptionsErrorDisplay } from "./captions-error-display";
import { useCaptions } from "../../../hooks/use-captions";
import { Upload, FileText, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "../../ui/alert";
/**
 * CaptionsOverlayPanel Component
 *
 * @component
 * @description
 * Clean interface for managing captions in the video editor.
 * Provides functionality for:
 * - Uploading SRT caption files with validation
 * - Manual script entry with automatic timing
 * - Caption editing and styling
 * - Error handling and user guidance
 *
 * Features:
 * - SRT file parsing with comprehensive validation
 * - Real-time error feedback
 * - Text-to-caption conversion
 * - Automatic timeline positioning
 * - Clean, intuitive UI
 *
 * @example
 * ```tsx
 * <CaptionsOverlayPanel />
 * ```
 */
export const CaptionsOverlayPanel = () => {
    const [script, setScript] = useState("");
    const [fileName, setFileName] = useState(null);
    const { overlays, selectedOverlayId, changeOverlay, currentFrame, } = useEditorContext();
    const { isProcessing, isError, error, lastParseResult, handleFileUpload, generateFromText, createCaptionOverlay, reset, } = useCaptions();
    const [localOverlay, setLocalOverlay] = useState(null);
    React.useEffect(() => {
        if (selectedOverlayId === null) {
            setLocalOverlay(null);
            return;
        }
        const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId);
        if ((selectedOverlay === null || selectedOverlay === void 0 ? void 0 : selectedOverlay.type) === OverlayType.CAPTION) {
            setLocalOverlay(selectedOverlay);
        }
    }, [selectedOverlayId, overlays]);
    const handleUpdateOverlay = (updatedOverlay) => {
        setLocalOverlay(updatedOverlay);
        changeOverlay(updatedOverlay.id, () => updatedOverlay);
    };
    const handleSRTFileUpload = async (event) => {
        var _a;
        const file = (_a = event.target.files) === null || _a === void 0 ? void 0 : _a[0];
        if (!file)
            return;
        setFileName(file.name);
        reset(); // Clear any previous errors
        try {
            const result = await handleFileUpload(file);
            if (result.success && result.captions) {
                createCaptionOverlay(result.captions);
                setScript(""); // Clear text input
            }
        }
        catch (error) {
            console.error('File upload error:', error);
        }
        // Clear the input value to allow re-uploading the same file
        event.target.value = '';
    };
    const handleGenerateFromText = async () => {
        if (!script.trim())
            return;
        try {
            const captions = await generateFromText({ text: script });
            createCaptionOverlay(captions);
            setScript("");
            reset(); // Clear any previous errors
        }
        catch (error) {
            console.error('Text generation error:', error);
        }
    };
    const handleRetry = () => {
        reset();
        setFileName(null);
        setScript("");
    };
    return (_jsx("div", { className: "flex flex-col gap-4 p-2 h-full [&_[data-radix-scroll-area-viewport]]:!scrollbar-none", children: !localOverlay ? (_jsxs(_Fragment, { children: [lastParseResult && !lastParseResult.success && lastParseResult.errors && (_jsx(CaptionsErrorDisplay, { errors: lastParseResult.errors, fileName: fileName || undefined, onRetry: handleRetry })), _jsxs("div", { className: "shrink-0 space-y-4", children: [_jsxs("div", { className: "flex flex-col gap-4", children: [_jsxs("div", { className: "flex flex-col gap-2 rounded-sm", children: [_jsxs(Button, { variant: "outline", className: "w-full border-2 border-dashed border-sidebar-border\n                  hover:border-primary/50 bg-muted\n                  hover:bg-muted/80 h-28 \n                  flex flex-col items-center justify-center gap-3 text-sm group transition-all duration-200", onClick: () => { var _a; return (_a = document.getElementById("srt-file-upload")) === null || _a === void 0 ? void 0 : _a.click(); }, disabled: isProcessing, children: [isProcessing ? (_jsx(Loader2, { className: "w-4 h-4 text-foreground animate-spin" })) : (_jsx(Upload, { className: "w-4 h-4 text-foreground" })), _jsxs("div", { className: "flex flex-col items-center font-extralight", children: [_jsx("span", { className: "text-foreground", children: isProcessing ? 'Processing SRT File...' : 'Upload SRT File' }), _jsx("span", { className: "text-xs text-muted-foreground mt-1", children: "Standard SubRip subtitle format (.srt)" })] })] }), _jsx("input", { id: "srt-file-upload", type: "file", accept: ".srt", className: "hidden", onChange: handleSRTFileUpload, disabled: isProcessing })] }), _jsxs("div", { className: "relative flex items-center", children: [_jsx("div", { className: "grow border-t border-border" }), _jsx("span", { className: "mx-4 px-3 py-1 text-xs font-extralight text-muted-foreground bg-background border border-border rounded-full", children: "or" }), _jsx("div", { className: "grow border-t border-border" })] }), _jsxs("div", { children: [_jsxs("div", { className: "flex items-center gap-2 mb-2", children: [_jsx(FileText, { className: "w-4 h-4 text-muted-foreground" }), _jsx("span", { className: "text-sm font-extralight text-foreground", children: "Generate from Text" })] }), _jsx(Textarea, { value: script, onChange: (e) => setScript(e.target.value), placeholder: "Type your script here. Sentences will be automatically split into timed captions...", rows: 8, className: "bg-input border-gray-300 font-extralight", disabled: isProcessing })] })] }), _jsxs("div", { className: "flex gap-3 pt-2", children: [_jsx(Button, { onClick: handleGenerateFromText, className: "flex-1", size: "sm", disabled: !script.trim() || isProcessing, children: isProcessing ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-3 h-3 mr-2 animate-spin" }), "Processing..."] })) : ('Generate Captions') }), script && (_jsx(Button, { variant: "ghost", className: "text-sm", onClick: () => setScript(""), disabled: isProcessing, children: "Clear" }))] }), isError && error && !(lastParseResult === null || lastParseResult === void 0 ? void 0 : lastParseResult.errors) && (_jsxs(Alert, { className: "border-destructive/50 bg-destructive/5", children: [_jsx(AlertTriangle, { className: "w-4 h-4 text-destructive" }), _jsx(AlertDescription, { className: "text-destructive", children: error })] }))] })] })) : (_jsx("div", { className: "flex-1 overflow-hidden", children: _jsx(CaptionSettings, { currentFrame: currentFrame, localOverlay: localOverlay, setLocalOverlay: handleUpdateOverlay, startFrame: localOverlay.from, captions: localOverlay.captions }) })) }));
};
