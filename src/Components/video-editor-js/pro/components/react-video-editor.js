import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useState, useEffect, useRef } from "react";
import { DefaultSidebar } from "./shared/default-sidebar";
import { SidebarInset } from "./ui/sidebar";
import { Editor } from "./core/editor";
import { VideoPlayer } from "./core/video-player";
// AutosaveStatus removed - autosave functionality disabled
import { ReactVideoEditorProvider } from "./providers/react-video-editor-provider";
export const ReactVideoEditor = ({ showSidebar = true, showAutosaveStatus = true, className, customSidebar, sidebarLogo, sidebarFooterText, disabledPanels, showIconTitles = true, availableThemes = [], selectedTheme, onThemeChange, showDefaultThemes = true, hideThemeToggle = false, defaultTheme = 'dark', onSaving, onSaved, isPlayerOnly = false, ...providerProps }) => {
    // Log aspect ratio when received
    if (providerProps.defaultAspectRatio) {
        // console.log('[ReactVideoEditor] Received defaultAspectRatio:', providerProps.defaultAspectRatio);
    }
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaveTime, setLastSaveTime] = useState(null);
    const playerRef = useRef(null);
    const handleSaving = (saving) => {
        setIsSaving(saving);
        onSaving === null || onSaving === void 0 ? void 0 : onSaving(saving);
    };
    const handleSaved = (timestamp) => {
        setLastSaveTime(timestamp);
        onSaved === null || onSaved === void 0 ? void 0 : onSaved(timestamp);
    };
    // Set up mobile viewport height handling for player-only mode
    useEffect(() => {
        if (!isPlayerOnly)
            return;
        const handleResize = () => {
           
        };
        // Initial call
        handleResize();
        // Handle orientation changes and resizes
        window.addEventListener("resize", handleResize);
        window.addEventListener("orientationchange", () => {
            setTimeout(handleResize, 100); // Small delay for mobile browsers
        });
        return () => {
            window.removeEventListener("resize", handleResize);
            window.removeEventListener("orientationchange", handleResize);
        };
    }, [isPlayerOnly]);
    return (_jsx(ReactVideoEditorProvider, { ...providerProps, onSaving: handleSaving, onSaved: handleSaved, playerRef: playerRef, children: isPlayerOnly ? (
        // Player-only mode: Simple fullscreen video player
        _jsx("div", { className: "w-full bg-black flex items-center justify-center", style: {
                height: "100%",
                maxHeight: "-webkit-fill-available" /* Safari fix */,
            }, children: _jsx(VideoPlayer, { playerRef: playerRef, isPlayerOnly: true }) })) : (
        // Editor mode: Full editor interface with sidebar
        _jsxs(_Fragment, { children: [showSidebar && (customSidebar || _jsx(DefaultSidebar, { logo: sidebarLogo, footerText: sidebarFooterText || "RVE", disabledPanels: disabledPanels || [], showIconTitles: showIconTitles })), _jsx(SidebarInset, { className: className, children: _jsx(Editor, { availableThemes: availableThemes, selectedTheme: selectedTheme, onThemeChange: onThemeChange, showDefaultThemes: showDefaultThemes, hideThemeToggle: hideThemeToggle, defaultTheme: defaultTheme }) })] })) }));
};
