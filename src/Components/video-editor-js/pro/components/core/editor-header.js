import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Separator } from "../ui/separator";
import { SidebarTrigger } from "../ui/sidebar";
import { ThemeDropdown } from "../ui/theme-dropdown";
import { useExtendedThemeSwitcher } from "../../hooks/use-extended-theme-switcher";
import { useThemeConfig } from "../../contexts/theme-context";
import RenderControls from "../rendering/render-controls";
import { useEditorContext } from "../../contexts/editor-context";
import { useEffect, useCallback, useState } from "react";
import { Button } from "../ui/button";
import { Save } from "lucide-react";
/**
 * EditorHeader component renders the top navigation bar of the editor interface.
 *
 * @component
 * @description
 * This component provides the main navigation and control elements at the top of the editor:
 * - A sidebar trigger button for showing/hiding the sidebar
 * - A visual separator
 * - A theme dropdown for switching themes (conditionally shown)
 * - Rendering controls for media export
 *
 * The header is sticky-positioned at the top of the viewport and includes
 * responsive styling for both light and dark themes.
 *
 * Theme configuration can be provided either through direct props or through the ThemeProvider context.
 * Direct props take precedence over context values.
 *
 * @example
 * ```tsx
 * // Using direct props
 * <EditorHeader
 *   availableThemes={[{id: 'purple', name: 'Purple', className: 'theme-purple'}]}
 *   onThemeChange={(theme) => console.log('Theme changed:', theme)}
 *   hideThemeToggle={false}
 *   defaultTheme="dark"
 * />
 *
 * // Using ThemeProvider context (no props needed)
 * <ThemeProvider config={{...}}>
 *   <EditorHeader />
 * </ThemeProvider>
 * ```
 *
 * @returns {JSX.Element} A header element containing navigation and control components
 */
export function EditorHeader({ availableThemes, selectedTheme, onThemeChange, showDefaultThemes, hideThemeToggle, defaultTheme, } = {}) {
    var _a, _b, _c, _d;
    /**
     * Destructure required values from the editor context:
     * - renderMedia: Function to handle media rendering/export
     * - renderState: Current render state (separate from editor state)
     * - saveProject: Function to save the current project
     * - overlays: Current overlays in the project
     * - projectId: Current project ID
     * - aspectRatio: Current aspect ratio
     * - backgroundColor: Current background color
     * - fps: Current FPS setting
     */
    const { renderMedia, renderState, saveProject, overlays, projectId, aspectRatio, backgroundColor, fps } = useEditorContext();
    const [isSaving, setIsSaving] = useState(false);
    
    // Handle save button click
    const handleSave = useCallback(async () => {
        try {
            setIsSaving(true);
            
            // Prepare project data with all current state
            const projectData = {
                overlays: overlays || [],
                projectId: projectId || 'video-editor-project',
                aspectRatio: aspectRatio,
                backgroundColor: backgroundColor,
                fps: fps,
                timestamp: new Date().toISOString(),
            };
            
            // Call saveProject function from context
            if (saveProject) {
                await saveProject(projectData);
                console.log('[EditorHeader] Project saved successfully');
            } else {
                // Fallback: save directly to localStorage
                const storageKey = `video-editor-project-${projectData.projectId}`;
                localStorage.setItem(storageKey, JSON.stringify(projectData));
                console.log('[EditorHeader] Project saved to localStorage (fallback):', storageKey);
            }
        } catch (error) {
            console.error('[EditorHeader] Error saving project:', error);
        } finally {
            setIsSaving(false);
        }
    }, [saveProject, overlays, projectId, aspectRatio, backgroundColor, fps]);
    // Get theme configuration from context if available
    const themeConfig = useThemeConfig();
    // Use direct props if provided, otherwise fall back to context values
    const resolvedAvailableThemes = (_a = availableThemes !== null && availableThemes !== void 0 ? availableThemes : themeConfig === null || themeConfig === void 0 ? void 0 : themeConfig.availableThemes) !== null && _a !== void 0 ? _a : [];
    const resolvedSelectedTheme = selectedTheme !== null && selectedTheme !== void 0 ? selectedTheme : themeConfig === null || themeConfig === void 0 ? void 0 : themeConfig.selectedTheme;
    const resolvedOnThemeChange = onThemeChange !== null && onThemeChange !== void 0 ? onThemeChange : themeConfig === null || themeConfig === void 0 ? void 0 : themeConfig.onThemeChange;
    const resolvedShowDefaultThemes = (_b = showDefaultThemes !== null && showDefaultThemes !== void 0 ? showDefaultThemes : themeConfig === null || themeConfig === void 0 ? void 0 : themeConfig.showDefaultThemes) !== null && _b !== void 0 ? _b : true;
    const resolvedHideThemeToggle = (_c = hideThemeToggle !== null && hideThemeToggle !== void 0 ? hideThemeToggle : themeConfig === null || themeConfig === void 0 ? void 0 : themeConfig.hideThemeToggle) !== null && _c !== void 0 ? _c : false;
    const resolvedDefaultTheme = (_d = defaultTheme !== null && defaultTheme !== void 0 ? defaultTheme : themeConfig === null || themeConfig === void 0 ? void 0 : themeConfig.defaultTheme) !== null && _d !== void 0 ? _d : 'dark';
    // Use the theme switcher hook to apply default theme when toggle is hidden
    const { setTheme } = useExtendedThemeSwitcher({
        customThemes: resolvedAvailableThemes,
        showDefaultThemes: resolvedShowDefaultThemes,
        defaultTheme: resolvedDefaultTheme,
    });
    // Apply default theme when theme toggle is hidden (only on mount or when hideThemeToggle changes)
    useEffect(() => {
        if (resolvedHideThemeToggle && resolvedDefaultTheme) {
            setTheme(resolvedDefaultTheme);
        }
    }, [resolvedHideThemeToggle, resolvedDefaultTheme, setTheme]);
    return (_jsxs("header", { className: "sticky top-0 flex shrink-0 items-center gap-2.5 \n      bg-background\n      border-l\n      p-2.5 px-4.5", children: [_jsx("div", { className: "grow" }), _jsx(SidebarTrigger, { className: "hidden sm:block text-foreground" }), (_jsx(Button, { variant: "default", size: "sm", onClick: handleSave, disabled: isSaving, className: "gap-2", children: [_jsx(Save, { className: "w-4 h-4" }), isSaving ? "Saving..." : "Save"] })), _jsx(RenderControls, { handleRender: renderMedia, state: renderState })] }));
}
