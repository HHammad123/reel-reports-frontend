import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import React from "react";
import { Button } from "../ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "../ui/popover";
import { Bell, Download, Loader2 } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useEditorContext } from "../../contexts/editor-context";
/**
 * RenderControls component provides UI controls for video rendering functionality
 *
 * Features:
 * - Render button that shows progress during rendering
 * - Notification bell showing render history
 * - Download buttons for completed renders
 * - Error display for failed renders
 *
 * The component maintains a history of render attempts, both successful and failed,
 * and provides visual feedback about the current render status.
 */
const RenderControls = ({ state, handleRender, }) => {
    // Get render type from editor context
    const { renderType } = useEditorContext();
    // Check if rendering is enabled via environment variable
    // Default to enabled (true) unless explicitly disabled
    const isRenderingEnabled = process.env.NEXT_PUBLIC_RENDERING_ENABLED !== "false";
    // Store multiple renders
    const [renders, setRenders] = React.useState([]);
    // Track if there are new renders
    const [hasNewRender, setHasNewRender] = React.useState(false);
    // Add new render to the list when completed
    React.useEffect(() => {
        if (state.status === "done") {
            setRenders((prev) => [
                {
                    url: state.url,
                    timestamp: new Date(),
                    id: crypto.randomUUID(),
                    status: "success",
                },
                ...prev,
            ]);
            setHasNewRender(true);
        }
        else if (state.status === "error") {
            setRenders((prev) => {
                var _a;
                return [
                    {
                        timestamp: new Date(),
                        id: crypto.randomUUID(),
                        status: "error",
                        error: ((_a = state.error) === null || _a === void 0 ? void 0 : _a.message) || "Failed to render video. Please try again.",
                    },
                    ...prev,
                ];
            });
            setHasNewRender(true);
        }
    }, [state.status, state.url, state.error]);
    const handleDownload = (url) => {
        let downloadUrl = url;
        if (renderType === "ssr") {
            // Convert the video URL to a download URL for SSR
            downloadUrl = url
                .replace("/rendered-videos/", "/api/latest/ssr/download/")
                .replace(".mp4", "");
        }
        // Lambda URLs are already in the correct format for download
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = "rendered-video.mp4";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
    };
    const getDisplayFileName = (url) => {
        if (renderType === "ssr") {
            return url.split("/").pop();
        }
        // For Lambda URLs, use the full URL pathname
        try {
            return new URL(url).pathname.split("/").pop();
        }
        catch {
            return url.split("/").pop();
        }
    };
    return (_jsxs(_Fragment, { children: [_jsxs(Popover, { onOpenChange: () => setHasNewRender(false), children: [_jsx(PopoverTrigger, { asChild: true, children: _jsxs(Button, { variant: "ghost", size: "sm", className: "relative hover:bg-accent text-foreground", children: [_jsx(Bell, { className: "w-3.5 h-3.5" }), hasNewRender && (_jsx("span", { className: "absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-red-500" }))] }) }), _jsx(PopoverContent, { className: "w-60 p-3", children: _jsxs("div", { className: "space-y-1.5", children: [_jsx("h4", { className: "text-sm font-extralight", children: "Recent Renders" }), renders.length === 0 ? (_jsx("p", { className: "text-xs text-muted-foreground", children: "No renders yet" })) : (renders.map((render) => (_jsxs("div", { className: `flex items-center justify-between rounded-md border p-1.5 ${render.status === "error"
                                        ? "border-destructive/50 bg-destructive/10"
                                        : "border-border"}`, children: [_jsxs("div", { className: "flex flex-col", children: [_jsx("div", { className: "text-xs text-primary", children: render.status === "error" ? (_jsx("span", { className: "text-red-400 font-extralight", children: "Render Failed" })) : (getDisplayFileName(render.url)) }), _jsxs("div", { className: "text-[11px] text-muted-foreground", children: [formatDistanceToNow(render.timestamp, {
                                                            addSuffix: true,
                                                        }), render.error && (_jsx("div", { className: "text-red-400 mt-0.5 truncate max-w-[180px]", title: render.error, children: render.error }))] })] }), render.status === "success" && (_jsx(Button, { size: "icon", variant: "ghost", className: "text-foreground hover:bg-accent h-6 w-6", onClick: () => handleDownload(render.url), children: _jsx(Download, { className: "w-3.5 h-3.5" }) }))] }, render.id))))] }) })] }), _jsx(Button, { onClick: handleRender, size: "sm", variant: "outline", disabled: state.status === "rendering" || state.status === "invoking" || !isRenderingEnabled, className: `bg-gray-800 text-white border-gray-700 hover:bg-gray-700 disabled:cursor-not-allowed disabled:opacity-50 ${!isRenderingEnabled ? "cursor-not-allowed" : ""}`, title: !isRenderingEnabled ? "Rendering is currently disabled" : undefined, children: !isRenderingEnabled ? ("Render Video") : state.status === "rendering" ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-3.5 h-3.5 mr-1.5 animate-spin" }), "Rendering... ", (state.progress * 100).toFixed(0), "%"] })) : state.status === "invoking" ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-3.5 h-3.5 mr-1.5 animate-spin" }), "Preparing..."] })) : (`Render Video`) })] }));
};
export default RenderControls;
