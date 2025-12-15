import { jsx as _jsx } from "react/jsx-runtime";
import { SidebarProvider as UISidebarProvider } from "../ui/sidebar";
import { EditorProvider } from "./editor-provider";
import { RendererProvider } from "../../contexts/renderer-context";
import { LocalMediaProvider } from "../../contexts/local-media-context";
import { SidebarProvider as EditorSidebarProvider } from "../../contexts/sidebar-context";
import { MediaAdaptorProvider } from "../../contexts/media-adaptor-context";
import { ThemeProvider } from "../../contexts/theme-context";
export const ReactVideoEditorProvider = ({ children, projectId, defaultOverlays = [], defaultAspectRatio, defaultBackgroundColor, autoSaveInterval = 10000, fps = 30, renderer, onSaving, onSaved, sidebarWidth = "16rem", sidebarIconWidth = "3rem", 
// Loading State
isLoadingProject = false, 
// Player Configuration
playerRef, 
// API Configuration
baseUrl, 
// Adaptor Configuration
adaptors, 
// Configuration props
initialRows = 5, maxRows = 8, zoomConstraints = {
    min: 0.2,
    max: 10,
    step: 0.1,
    default: 1,
}, snappingConfig = {
    thresholdFrames: 1,
    enableVerticalSnapping: true,
}, disableMobileLayout = false, disableVideoKeyframes = false, enablePushOnDrag = false, videoWidth = 1280, videoHeight = 720, 
// Theme Configuration
availableThemes = [], selectedTheme, onThemeChange, showDefaultThemes = true, hideThemeToggle = false, defaultTheme = 'dark', }) => {
    return (_jsx(UISidebarProvider, { style: {
            "--sidebar-width": sidebarWidth,
            "--sidebar-width-icon": sidebarIconWidth,
        }, children: _jsx(RendererProvider, { config: { renderer }, children: _jsx(MediaAdaptorProvider, { adaptors: adaptors || {}, children: _jsx(ThemeProvider, { config: {
                        availableThemes,
                        selectedTheme,
                        onThemeChange,
                        showDefaultThemes,
                        hideThemeToggle,
                        defaultTheme,
                    }, children: _jsx(EditorProvider, { projectId: projectId, defaultOverlays: defaultOverlays, defaultAspectRatio: defaultAspectRatio, defaultBackgroundColor: defaultBackgroundColor, autoSaveInterval: autoSaveInterval, fps: fps, isLoadingProject: isLoadingProject, ...(onSaving && { onSaving }), ...(onSaved && { onSaved }), ...(playerRef && { playerRef }), ...(baseUrl !== undefined && { baseUrl }), initialRows: initialRows, maxRows: maxRows, zoomConstraints: zoomConstraints, snappingConfig: snappingConfig, disableMobileLayout: disableMobileLayout, disableVideoKeyframes: disableVideoKeyframes, enablePushOnDrag: enablePushOnDrag, videoWidth: videoWidth, videoHeight: videoHeight, children: _jsx(LocalMediaProvider, { children: _jsx(EditorSidebarProvider, { children: children }) }) }) }) }) }) }));
};
