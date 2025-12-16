import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import React from "react";
import { EditorHeader } from "./editor-header";
import { useEditorContext } from "../../contexts/editor-context";
import { VideoPlayer } from "./video-player";
import { TimelineSection } from "./timeline-section";
import { MobileNavBar } from "../shared/mobile-nav-bar";
/**
 * Main Editor Component
 *
 * @component
 * @description
 * The core editor interface that orchestrates the video editing experience.
 * This component manages:
 * - Video playback and controls
 * - Timeline visualization and interaction
 * - Overlay management (selection, modification, deletion)
 * - Responsive behavior for desktop/mobile views
 *
 * The component uses the EditorContext to manage state and actions across
 * its child components. It implements a responsive design that shows a
 * mobile-specific message for smaller screens.
 *
 * Key features:
 * - Video player integration
 * - Timeline controls (play/pause, seeking)
 * - Overlay management (selection, modification)
 * - Frame-based navigation
 * - Mobile detection and fallback UI
 *
 * @example
 * ```tsx
 * <Editor availableThemes={[{id: 'purple', name: 'Purple'}]} />
 * ```
 */
export const Editor = ({ availableThemes, selectedTheme, onThemeChange, showDefaultThemes, hideThemeToggle, defaultTheme, }) => {
    /** State to track if the current viewport is mobile-sized */
    const [isMobile, setIsMobile] = React.useState(false);
    /**
     * Effect to handle mobile detection and window resize events
     * Uses 768px as the standard mobile breakpoint
     */
    React.useEffect(() => {
        const checkMobile = () => {
            setIsMobile(window.innerWidth < 768);
        };
        checkMobile();
        window.addEventListener("resize", checkMobile);
        return () => window.removeEventListener("resize", checkMobile);
    }, []);
    /**
     * Effect to prevent any scrolling and handle mobile viewport issues
     */
    React.useEffect(() => {
        // Function to handle viewport issues on mobile
        const handleResize = () => {
            // Set CSS custom property for viewport height to use instead of h-screen
            const vh = window.innerHeight * 0.01;
            document.documentElement.style.setProperty("--vh", `${vh}px`);
        };
        // Initial call
        handleResize();
        // Handle orientation changes and resizes
        window.addEventListener("resize", handleResize);
        // Prevent any scrolling on body
        document.body.style.overflow = "hidden";
        document.documentElement.style.overflow = "hidden";
        return () => {
            window.removeEventListener("resize", handleResize);
            document.body.style.overflow = "";
            document.documentElement.style.overflow = "";
        };
    }, []);
    /**
     * Destructure values and functions from the editor context
     * These provide core functionality for the editor's features
     */
    const { playerRef, // Reference to video player
    disableMobileLayout, // Configuration for mobile layout
    // isInitialLoadComplete removed - autosave disabled
     } = useEditorContext();
    // Loading state check removed - autosave disabled
    /**
     * Mobile fallback UI
     * Displays a message when accessed on mobile devices
     */
    if (isMobile && disableMobileLayout) {
        return (_jsx("div", { className: "flex items-center justify-center h-screen bg-background p-6", children: _jsxs("div", { className: "text-center text-primary", children: [_jsx("h2", { className: "text-xl font-extralight mb-3", children: "React Video Editor" }), _jsx("p", { className: "text-sm text-secondary font-extralight mb-4", children: "Currently, React Video Editor is designed as a full-screen desktop experience. We're actively working on making it mobile-friendly! \uD83D\uDC40" }), _jsxs("p", { className: "text-sm text-secondary font-extralight", children: ["Want mobile support? Let us know by voting", " ", _jsx("a", { href: "https://reactvideoeditor.featurebase.app/p/bulb-mobile-layout-version-2", className: "text-primary font-medium hover:text-primary/80 hover:underline", target: "_blank", rel: "noopener noreferrer", children: "here" }), "!"] })] }) }));
    }
    /**
     * Main editor layout
     * Organized in a column layout with the following sections:
     * 1. Editor header (controls and options)
     * 2. Main content area (video player)
     * 3. Timeline controls
     * 4. Timeline visualization
     */
    return (_jsxs("div", { className: "flex flex-col overflow-hidden", style: {
            height: "calc(var(--vh, 1vh) * 100)",
            maxHeight: "-webkit-fill-available" /* Safari fix */,
        }, children: [_jsx(EditorHeader, { availableThemes: availableThemes, selectedTheme: selectedTheme, onThemeChange: onThemeChange, showDefaultThemes: showDefaultThemes, hideThemeToggle: hideThemeToggle, defaultTheme: defaultTheme }), _jsx("div", { className: "flex flex-col lg:flex-row overflow-hidden", style: { maxHeight: '65%', minHeight: '200px', flex: '1 1 auto' }, children: _jsx(VideoPlayer, { playerRef: playerRef }) }), _jsx(TimelineSection, {}), _jsx(MobileNavBar, {})] }));
};
