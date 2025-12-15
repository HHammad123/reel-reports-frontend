import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useRef } from "react";
import { Film, Music, Type, Subtitles, ImageIcon, FolderOpen, Sticker, Plus, X, } from "lucide-react";
import { useEditorSidebar } from "../../contexts/sidebar-context";
import { OverlayType } from "../../types";
import { Tooltip, TooltipProvider, TooltipTrigger, } from "../ui/tooltip";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetClose, } from "../ui/sheet";
import { VideoOverlayPanel } from "../overlay/video/video-overlay-panel";
import { TextOverlaysPanel } from "../overlay/text/text-overlays-panel";
import SoundsOverlayPanel from "../overlay/sounds/sounds-overlay-panel";
import { CaptionsOverlayPanel } from "../overlay/captions/captions-overlay-panel";
import { ImageOverlayPanel } from "../overlay/images/image-overlay-panel";
import { StickersPanel } from "../overlay/stickers/stickers-panel";
import { LocalMediaPanel } from "../overlay/local-media/local-media-panel";
/**
 * MobileNavBar Component
 *
 * A compact mobile-only navigation bar that displays overlay type icons
 * with a horizontal scrollable interface. Designed to match the TimelineControls
 * visual style while remaining compact for mobile screens.
 */
export function MobileNavBar() {
    const { activePanel, setActivePanel } = useEditorSidebar();
    const [clickedItemId, setClickedItemId] = useState(null);
    const scrollableRef = useRef(null);
    const [showScrollIndicator, setShowScrollIndicator] = useState(false);
    const [isSheetOpen, setIsSheetOpen] = useState(false);
    // Check if scrolling is needed
    useEffect(() => {
        const checkScrollWidth = () => {
            if (scrollableRef.current) {
                const { scrollWidth, clientWidth } = scrollableRef.current;
                setShowScrollIndicator(scrollWidth > clientWidth);
            }
        };
        checkScrollWidth();
        window.addEventListener("resize", checkScrollWidth);
        return () => window.removeEventListener("resize", checkScrollWidth);
    }, []);
    // Scroll active item into view when it changes
    useEffect(() => {
        if (activePanel && scrollableRef.current) {
            const activeItem = scrollableRef.current.querySelector(`[data-panel="${activePanel}"]`);
            if (activeItem) {
                // Calculate the scroll position to center the active item
                const containerWidth = scrollableRef.current.offsetWidth;
                const itemLeft = activeItem.offsetLeft;
                const itemWidth = activeItem.offsetWidth;
                const scrollLeft = itemLeft - containerWidth / 2 + itemWidth / 2;
                scrollableRef.current.scrollTo({
                    left: scrollLeft,
                    behavior: "smooth",
                });
            }
        }
    }, [activePanel]);
    // Use shorter names on mobile
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
                return "Media";
            case OverlayType.STICKER:
                return "Sticker";
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
    ];
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
            default:
                return null;
        }
    };
    const handleItemClick = (item) => {
        // Set the clicked item ID for animation
        setClickedItemId(item.title);
        // Clear the animation after it completes
        setTimeout(() => setClickedItemId(null), 300);
        // Set the active panel and open the bottom sheet
        setActivePanel(item.panel);
        setIsSheetOpen(true);
    };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "md:hidden flex flex-col border-t border bg-background/95 dark:bg-background/30 relative", children: _jsxs("div", { className: "relative flex-1 flex", children: [showScrollIndicator && (_jsx("div", { className: "absolute left-0 top-0 bottom-0 w-4 bg-linear-to-r from-white/90 to-transparent dark:from-gray-900/90 z-10 pointer-events-none" })), _jsxs("div", { ref: scrollableRef, className: `flex-1 flex items-center justify-evenly overflow-x-auto scrollbar-hide px-1 py-2 overflow-auto relative`, style: {
                                scrollbarWidth: "none",
                                msOverflowStyle: "none",
                            }, children: [navigationItems.map((item) => (_jsx(TooltipProvider, { delayDuration: 50, children: _jsx(Tooltip, { children: _jsx(TooltipTrigger, { asChild: true, children: _jsx("button", { "data-panel": item.panel, onClick: () => handleItemClick(item), className: `rounded flex flex-col items-center flex-1 py-1.5
                      ${clickedItemId === item.title
                                                    ? "scale-95 opacity-80"
                                                    : ""}
                      ${activePanel === item.panel
                                                    ? "bg-secondary text-secondary-foreground"
                                                    : "text-secondary-foreground hover:bg-accent"} transition-all`, children: _jsx(item.icon, { className: "h-4 w-4" }) }) }) }) }, item.title))), showScrollIndicator && (_jsx("button", { onClick: () => {
                                        if (scrollableRef.current) {
                                            scrollableRef.current.scrollBy({
                                                left: 100,
                                                behavior: "smooth",
                                            });
                                        }
                                    }, className: "flex items-center justify-center h-9 min-w-9 px-2 rounded bg-background text-foreground", children: _jsx(Plus, { className: "h-4 w-4" }) }))] }), showScrollIndicator && (_jsx("div", { className: "absolute right-0 top-0 bottom-0 w-4 bg-linear-to-l from-white/90 to-transparent dark:from-gray-900/90 z-10 pointer-events-none" }))] }) }), _jsx(Sheet, { open: isSheetOpen, onOpenChange: setIsSheetOpen, children: _jsx(SheetContent, { side: "bottom", className: "pt-4 h-[70vh] rounded-t-xl pb-0 px-0 overflow-hidden", children: _jsxs("div", { className: "flex flex-col h-full", children: [_jsxs(SheetHeader, { className: "px-4 pb-3 border-b", children: [_jsx(SheetTitle, { className: "text-left text-lg font-light", children: activePanel && getPanelTitle(activePanel) }), _jsxs(SheetClose, { className: "rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-secondary text-foreground", children: [_jsx(X, { className: "h-4 w-4" }), _jsx("span", { className: "sr-only", children: "Close" })] })] }), _jsx("div", { className: "flex-1 overflow-y-auto p-0", children: renderActivePanel() })] }) }) })] }));
}
