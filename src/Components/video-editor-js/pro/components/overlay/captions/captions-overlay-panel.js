import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React, { useState } from "react";
import { Button } from "../../ui/button";
import { Textarea } from "../../ui/textarea";
import { useEditorContext } from "../../../contexts/editor-context";
import { OverlayType } from "../../../types";
import { CaptionSettings } from "./caption-settings";
import { CaptionsErrorDisplay } from "./captions-error-display";
import { useCaptions } from "../../../hooks/use-captions";
import { FileText, Loader2, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "../../ui/alert";
/**
 * CaptionsOverlayPanel Component
 *
 * @component
 * @description
 * Clean interface for managing captions in the video editor.
 * Provides functionality for:
 * - Manual script entry with automatic timing
 * - Caption editing and styling
 * - Error handling and user guidance
 *
 * Features:
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
    console.log('[CaptionsOverlayPanel] Component rendered/mounted');
    
    const [script, setScript] = useState("");
    const { overlays, selectedOverlayId, changeOverlay, currentFrame, extractedSRTText, extractedSRTTextQueue, setOverlays, setSelectedOverlayId, } = useEditorContext();
    const { isProcessing, isError, error, lastParseResult, generateFromText, createCaptionOverlay, reset, } = useCaptions();
    const [localOverlay, setLocalOverlay] = useState(null);
    const hasProcessedSRTRef = React.useRef(new Set()); // Track processed SRT texts to avoid duplicates
    
    // Check for pending extracted SRT text when component mounts or when extractedSRTText changes
    // Only populate textarea, don't auto-generate - user will click button to generate
    React.useEffect(() => {
        if (extractedSRTText && extractedSRTText.text) {
            const textKey = `${extractedSRTText.srtUrl || 'unknown'}-${extractedSRTText.text.substring(0, 50)}`;
            
            if (!hasProcessedSRTRef.current.has(textKey)) {
                console.log('[CaptionsOverlayPanel] Found pending extracted SRT text from context, populating textarea...', {
                    textLength: extractedSRTText.text.length,
                    textPreview: extractedSRTText.text.substring(0, 100),
                    sceneIndex: extractedSRTText.sceneIndex
                });
                
                hasProcessedSRTRef.current.add(textKey);
                
                // Only populate textarea, don't auto-generate
                if (!script.trim()) {
                    setScript(extractedSRTText.text);
                    console.log('[CaptionsOverlayPanel] ✅ Text populated in textarea. User can now click "Generate Captions" button.');
                }
            }
        }
        
        // Process queue if available - only populate, don't generate
        if (extractedSRTTextQueue && Array.isArray(extractedSRTTextQueue) && extractedSRTTextQueue.length > 0) {
            console.log('[CaptionsOverlayPanel] Found SRT text queue with', extractedSRTTextQueue.length, 'items');
            extractedSRTTextQueue.forEach((item, index) => {
                const textKey = `${item.srtUrl || 'unknown'}-${item.text.substring(0, 50)}`;
                if (!hasProcessedSRTRef.current.has(textKey)) {
                    console.log(`[CaptionsOverlayPanel] Populating textarea with queued item ${index + 1}/${extractedSRTTextQueue.length}`);
                    hasProcessedSRTRef.current.add(textKey);
                    // Only populate first item if textarea is empty
                    if (index === 0 && !script.trim()) {
                        setScript(item.text);
                        console.log('[CaptionsOverlayPanel] ✅ Text populated in textarea from queue.');
                    }
                }
            });
        }
    }, [extractedSRTText, extractedSRTTextQueue, script]);
    
    console.log('[CaptionsOverlayPanel] State initialized:', {
        scriptLength: script.length,
        isProcessing,
        selectedOverlayId,
        localOverlay: !!localOverlay
    });
    
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
    
    // Listen for SRT text extraction events and auto-populate/generate
    React.useEffect(() => {
        console.log('[CaptionsOverlayPanel] Setting up event listener for srtTextExtracted');
        
        const handleSRTTextExtracted = async (event) => {
            console.log('[CaptionsOverlayPanel] Event received!', event);
            console.log('[CaptionsOverlayPanel] Event detail:', event.detail);
            
            if (!event.detail) {
                console.warn('[CaptionsOverlayPanel] Event detail is missing!');
                return;
            }
            
            const { text, sceneIndex, srtUrl } = event.detail;
            
            console.log('[CaptionsOverlayPanel] Text Received:', {
                text: text,
                textLength: text ? text.length : 0,
                sceneIndex: sceneIndex,
                srtUrl: srtUrl,
                hasText: !!text,
                textPreview: text ? text.substring(0, 100) : 'NO TEXT'
            });
            
            if (!text || !text.trim()) {
                console.warn('[CaptionsOverlayPanel] No text found in event detail');
                return;
            }
            
            // Create a unique key for this SRT text to avoid processing duplicates
            const textKey = `${srtUrl || 'unknown'}-${text.substring(0, 50)}`;
            
            // Skip if we've already processed this text
            if (hasProcessedSRTRef.current.has(textKey)) {
                console.log('[CaptionsOverlayPanel] Text already processed, skipping:', textKey);
                return;
            }
            
            // Mark as processed
            hasProcessedSRTRef.current.add(textKey);
            
            console.log('[CaptionsOverlayPanel] Processing new SRT text, auto-populating and generating...', {
                sceneIndex,
                textLength: text.length,
                srtUrl,
                textPreview: text.substring(0, 200),
                currentScript: script,
                isProcessing: isProcessing
            });
            
            // Only populate textarea, don't auto-generate - user will click button
            if (!script.trim()) {
                console.log('[CaptionsOverlayPanel] Populating textarea with extracted text...');
                setScript(text);
                console.log('[CaptionsOverlayPanel] ✅ Text populated in textarea. User can now click "Generate Captions" button.');
            } else {
                console.log('[CaptionsOverlayPanel] Textarea has content, appending new text...');
                // Append with separator if textarea already has content
                setScript(prev => prev ? `${prev}\n\n${text}` : text);
            }
        };
        
        console.log('[CaptionsOverlayPanel] Adding event listener to window');
        window.addEventListener('srtTextExtracted', handleSRTTextExtracted);
        console.log('[CaptionsOverlayPanel] Event listener added successfully');
        
        // Test: Check if we can manually trigger the event
        console.log('[CaptionsOverlayPanel] Testing event listener setup...');
        const testEvent = new CustomEvent('srtTextExtracted', {
            detail: { text: 'TEST', sceneIndex: 0, srtUrl: 'test' }
        });
        console.log('[CaptionsOverlayPanel] Test event created, but not dispatching (to avoid false positives)');
        
        // Also add a global test function for debugging
        if (typeof window !== 'undefined') {
            window.testSRTEvent = () => {
                console.log('[CaptionsOverlayPanel] Manual test triggered');
                const testEvent = new CustomEvent('srtTextExtracted', {
                    detail: { 
                        text: 'This is a test text from manual trigger. It should appear in the textarea and generate captions.', 
                        sceneIndex: 999, 
                        srtUrl: 'test://manual-trigger' 
                    }
                });
                window.dispatchEvent(testEvent);
            };
            console.log('[CaptionsOverlayPanel] Test function available: window.testSRTEvent()');
        }
        
        return () => {
            console.log('[CaptionsOverlayPanel] Removing event listener');
            window.removeEventListener('srtTextExtracted', handleSRTTextExtracted);
            if (typeof window !== 'undefined' && window.testSRTEvent) {
                delete window.testSRTEvent;
            }
        };
    }, [script, isProcessing, generateFromText, createCaptionOverlay, reset]);
    const handleUpdateOverlay = (updatedOverlay) => {
        setLocalOverlay(updatedOverlay);
        changeOverlay(updatedOverlay.id, () => updatedOverlay);
    };
    const handleGenerateFromText = async () => {
        if (!script.trim())
            return;
        try {
            console.log('[CaptionsOverlayPanel] User clicked "Generate Captions" button');
            console.log('[CaptionsOverlayPanel] Generating captions from text:', script.substring(0, 100));
            
            const captions = await generateFromText({ text: script });
            console.log('[CaptionsOverlayPanel] Captions generated:', captions.length, 'captions');
            
            // Calculate total duration
            const lastCaption = captions[captions.length - 1];
            const totalDurationMs = lastCaption.endMs;
            const calculatedDurationInFrames = Math.ceil((totalDurationMs / 1000) * 30);
            
            // Start from frame 0 (beginning of timeline)
            const startFrame = 0;
            
            // Find available row (use row 0 for top, or find first available)
            let row = 0;
            const usedRows = new Set(overlays.map(o => o.row));
            while (usedRows.has(row)) {
                row++;
            }
            
            // Generate ID
            const newId = overlays.length > 0 ? Math.max(...overlays.map((o) => o.id)) + 1 : 0;
            
            const newCaptionOverlay = {
                id: newId,
                type: OverlayType.CAPTION,
                from: startFrame, // Start from frame 0
                durationInFrames: calculatedDurationInFrames,
                captions,
                left: 230,
                top: 414,
                width: 833,
                height: 269,
                rotation: 0,
                isDragging: false,
                row,
            };
            
            // Add overlay to timeline
            const finalOverlays = [...overlays, newCaptionOverlay];
            setOverlays(finalOverlays);
            setSelectedOverlayId(newId);
            
            console.log('[CaptionsOverlayPanel] ✅ Caption overlay created and added to timeline starting from frame 0', {
                overlayId: newId,
                startFrame: startFrame,
                durationInFrames: calculatedDurationInFrames,
                row: row,
                captionCount: captions.length
            });
            setScript("");
            reset(); // Clear any previous errors
        }
        catch (error) {
            console.error('[CaptionsOverlayPanel] Text generation error:', error);
        }
    };
    const handleRetry = () => {
        reset();
        setScript("");
    };
    if (!localOverlay) {
        const errorDisplay = lastParseResult && !lastParseResult.success && lastParseResult.errors
            ? _jsx(CaptionsErrorDisplay, { errors: lastParseResult.errors, onRetry: handleRetry })
            : null;
        const alertDisplay = isError && error && !(lastParseResult === null || lastParseResult === void 0 ? void 0 : lastParseResult.errors)
            ? _jsxs(Alert, { className: "border-destructive/50 bg-destructive/5", children: [
                _jsx(AlertTriangle, { className: "w-4 h-4 text-destructive" }),
                _jsx(AlertDescription, { className: "text-destructive", children: error })
            ] })
            : null;
        const headerSection = _jsxs("div", { className: "flex items-center gap-2 mb-2", children: [
            _jsx(FileText, { className: "w-4 h-4 text-muted-foreground" }),
            _jsx("span", { className: "text-sm font-extralight text-foreground", children: "Generate from Text" })
        ] });
        const textareaElement = _jsx(Textarea, {
            value: script,
            onChange: (e) => setScript(e.target.value),
            placeholder: "Type your script here. Sentences will be automatically split into timed captions...",
            rows: 8,
            className: "bg-input border-gray-300 font-extralight",
            disabled: isProcessing
        });
        const buttonGroup = _jsxs("div", { className: "flex gap-3 pt-2", children: [
            _jsx(Button, {
                onClick: handleGenerateFromText,
                className: "flex-1 bg-gray-800 hover:bg-gray-700 text-white",
                size: "sm",
                disabled: !script.trim() || isProcessing,
                children: isProcessing
                    ? _jsxs(_Fragment, { children: [
                        _jsx(Loader2, { className: "w-3 h-3 mr-2 animate-spin" }),
                        "Processing..."
                    ] })
                    : "Generate Captions"
            }),
            script && _jsx(Button, {
                variant: "ghost",
                className: "text-sm",
                onClick: () => setScript(""),
                disabled: isProcessing,
                children: "Clear"
            })
        ] });
        const formSection = _jsxs("div", { children: [
            headerSection,
            textareaElement,
            buttonGroup
        ] });
        const contentSection = _jsxs("div", { className: "shrink-0 space-y-4", children: [formSection] });
        const fragmentChildren = [errorDisplay, contentSection, alertDisplay].filter(Boolean);
        return _jsx("div", {
            className: "flex flex-col gap-4 p-2 h-full [&_[data-radix-scroll-area-viewport]]:!scrollbar-none",
            children: _jsxs(_Fragment, { children: fragmentChildren })
        });
    }
    return _jsx("div", {
        className: "flex-1 overflow-hidden",
        children: _jsx(CaptionSettings, {
            currentFrame: currentFrame,
            localOverlay: localOverlay,
            setLocalOverlay: handleUpdateOverlay,
            startFrame: localOverlay.from,
            captions: localOverlay.captions
        })
    });
};
