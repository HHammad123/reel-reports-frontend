import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Film, Music, Type, Subtitles, ImageIcon, FolderOpen, Sticker, Layout, ChevronsLeft, Settings, } from "lucide-react";
// Import OverlayType directly from types to avoid export issues
import { OverlayType } from "../../types";
// Import hooks and contexts directly
import { useEditorSidebar } from "../../contexts/sidebar-context";
import { useEditorContext } from "../../contexts/editor-context";
// Import overlay panels directly
import { VideoOverlayPanel } from "../overlay/video/video-overlay-panel";
import { TextOverlaysPanel } from "../overlay/text/text-overlays-panel";
import SoundsOverlayPanel from "../overlay/sounds/sounds-overlay-panel";
import { CaptionsOverlayPanel } from "../overlay/captions/captions-overlay-panel";
import { ImageOverlayPanel } from "../overlay/images/image-overlay-panel";
import { LocalMediaPanel } from "../overlay/local-media/local-media-panel";
import { StickersPanel } from "../overlay/stickers/stickers-panel";
import { TemplateOverlayPanel } from "../overlay/templates/template-overlay-panel";
import { SettingsPanel } from "../settings/settings-panel";
// Import UI components directly
import { Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarHeader, SidebarMenu, SidebarMenuButton, SidebarMenuItem, } from "../ui/sidebar";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger, } from "../ui/tooltip";
import { Button } from "../ui/button";
/**
 * DefaultSidebar Component
 *
 * A dual-sidebar layout component for the video editor application.
 * Consists of two parts:
 * 1. A narrow icon-based sidebar on the left for main navigation
 * 2. A wider content sidebar that displays the active panel's content
 *
 * @component
 */
export const DefaultSidebar = ({ logo, disabledPanels = [], showIconTitles = true, }) => {
    const { activePanel, setActivePanel, setIsOpen } = useEditorSidebar();
    const { setSelectedOverlayId, selectedOverlayId, overlays } = useEditorContext();
    // Get the selected overlay to check its type
    const selectedOverlay = selectedOverlayId !== null
        ? overlays.find(overlay => overlay.id === selectedOverlayId)
        : null;
    // Only show back button if there's a selected overlay AND it matches the active panel type
    // Normalize types for comparison (handle both enum and string formats)
    const overlayTypeString = selectedOverlay ? String(selectedOverlay.type).toLowerCase() : '';
    const activePanelString = String(activePanel).toLowerCase();
    const shouldShowBackButton = selectedOverlay && overlayTypeString === activePanelString;
    const getPanelTitle = (type) => {
        switch (type) {
            case OverlayType.VIDEO:
                return "Video";
            case OverlayType.TEXT:
                return "Text";
            case OverlayType.SOUND:
                return "Audio";
            case OverlayType.CAPTION:
                return "Caption";
            case OverlayType.IMAGE:
                return "Image";
            case OverlayType.LOCAL_DIR:
                return "Uploads";
            case OverlayType.STICKER:
                return "Stickers";
            case OverlayType.TEMPLATE:
                return "Templates";
            case OverlayType.SETTINGS:
                return "Settings";
            default:
                return "Unknown";
        }
    };
    const navigationItems = [
        {
            title: getPanelTitle(OverlayType.VIDEO),
            url: "#",
            icon: Film,
            panel: OverlayType.VIDEO,
            type: OverlayType.VIDEO,
        },
        {
            title: getPanelTitle(OverlayType.TEXT),
            url: "#",
            icon: Type,
            panel: OverlayType.TEXT,
            type: OverlayType.TEXT,
        },
        {
            title: getPanelTitle(OverlayType.SOUND),
            url: "#",
            icon: Music,
            panel: OverlayType.SOUND,
            type: OverlayType.SOUND,
        },
        {
            title: getPanelTitle(OverlayType.CAPTION),
            url: "#",
            icon: Subtitles,
            panel: OverlayType.CAPTION,
            type: OverlayType.CAPTION,
        },
        {
            title: getPanelTitle(OverlayType.IMAGE),
            url: "#",
            icon: ImageIcon,
            panel: OverlayType.IMAGE,
            type: OverlayType.IMAGE,
        },
        {
            title: getPanelTitle(OverlayType.STICKER),
            url: "#",
            icon: Sticker,
            panel: OverlayType.STICKER,
            type: OverlayType.STICKER,
        },
        {
            title: getPanelTitle(OverlayType.LOCAL_DIR),
            url: "#",
            icon: FolderOpen,
            panel: OverlayType.LOCAL_DIR,
            type: OverlayType.LOCAL_DIR,
        },
        {
            title: getPanelTitle(OverlayType.TEMPLATE),
            url: "#",
            icon: Layout,
            panel: OverlayType.TEMPLATE,
            type: OverlayType.TEMPLATE,
        },
        {
            title: getPanelTitle(OverlayType.SETTINGS),
            url: "#",
            icon: Settings,
            panel: OverlayType.SETTINGS,
            type: OverlayType.SETTINGS,
        },
    ].filter((item) => !disabledPanels.includes(item.type));
    /**
     * Renders the appropriate panel component based on the active panel selection
     * @returns {React.ReactNode} The component corresponding to the active panel
     */
    const renderActivePanel = () => {
        switch (activePanel) {
            case OverlayType.TEXT:
                return _jsx(TextOverlaysPanel, {});
            case OverlayType.SOUND:
                return _jsx(SoundsOverlayPanel, {});
            case OverlayType.VIDEO:
                return _jsx(VideoOverlayPanel, {});
            case OverlayType.CAPTION:
                return _jsx(CaptionsOverlayPanel, {});
            case OverlayType.IMAGE:
                return _jsx(ImageOverlayPanel, {});
            case OverlayType.STICKER:
                return _jsx(StickersPanel, {});
            case OverlayType.LOCAL_DIR:
                return _jsx(LocalMediaPanel, {});
            case OverlayType.TEMPLATE:
                return _jsx(TemplateOverlayPanel, {});
            case OverlayType.SETTINGS:
                return _jsx(SettingsPanel, {});
            default:
                return null;
        }
    };
    return (_jsxs(Sidebar, { collapsible: "icon", className: "overflow-hidden *:data-[sidebar=sidebar]:flex-row", children: [_jsxs(Sidebar, { collapsible: "none", className: "w-[calc(var(--sidebar-width-icon)+1px)]! border-r border-border ", children: [_jsx(SidebarHeader, { children: _jsx(SidebarMenu, { children: _jsx(SidebarMenuItem, { children: _jsx(SidebarMenuButton, { size: "lg", asChild: true, className: "md:h-8 md:pb-4 md:pt-4 ", children: _jsx("a", { href: "#", children: _jsx("div", { className: "flex aspect-square size-9 items-center justify-center rounded-lg", children: logo || (_jsx("img", { src: "/icons/logo-rve.png", alt: "RVE Logo", width: 27, height: 27 })) }) }) }) }) }) }), _jsx(SidebarContent, { className: "border-t border-border", children: _jsx(SidebarGroup, { className: "pt-3", children: navigationItems.map((item) => (_jsx(TooltipProvider, { delayDuration: 0, children: _jsxs(Tooltip, { children: [_jsx(TooltipTrigger, { asChild: true, children: _jsxs(SidebarMenuButton, { onClick: () => {
                                                    setActivePanel(item.panel);
                                                    setIsOpen(true);
                                                }, size: "lg", className: "flex flex-col items-center gap-2 px-1.5 py-2.5", "data-active": activePanel === item.panel, children: [_jsx(item.icon, { className: "h-4 w-4", strokeWidth: 1.25 }), showIconTitles && (_jsx("span", { className: "text-[8px] leading-none", children: item.title }))] }) }), _jsx(TooltipContent, { side: "right", children: item.title })] }) }, item.title))) }) })] }), _jsxs(Sidebar, { collapsible: "none", className: "hidden md:flex bg-background transition-all duration-300 ease-in-out", style: { width: 'var(--sidebar-width)', minWidth: 'var(--sidebar-width)', maxWidth: 'var(--sidebar-width)', transition: 'width 300ms ease-in-out, opacity 300ms ease-in-out, transform 300ms ease-in-out' }, children: [_jsx(SidebarHeader, { className: "gap-3.5 border-b border-border px-4 py-3", children: _jsx("div", { className: "flex w-full items-center justify-between", children: _jsxs("div", { className: "flex items-center justify-between w-full", children: [_jsx("h3", { className: "font-extralight text-sidebar-foreground", children: activePanel ? getPanelTitle(activePanel) : "" }), shouldShowBackButton && (_jsx(Button, { variant: "ghost", size: "icon", className: "h-6 w-6", onClick: () => setSelectedOverlayId(null), "aria-label": "Back", children: _jsx(ChevronsLeft, { className: "h-4 w-4" }) }))] }) }) }), _jsx(SidebarContent, { className: "bg-background px-2 pt-1", children: renderActivePanel() })] })] }));
};
