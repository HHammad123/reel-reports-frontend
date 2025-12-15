import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/**
 * Renders visual alignment guides as lines overlaying the canvas
 * Shows vertical and horizontal guide lines with smooth fade animations
 */
export const AlignmentGuides = ({ guideState, canvasWidth, canvasHeight, }) => {
    if (!guideState.isActive || guideState.guides.length === 0) {
        return null;
    }
    // Calculate responsive scale factor based on canvas size
    const baseScale = Math.min(canvasWidth, canvasHeight) / 500; // Scale relative to 500px baseline
    const minScale = 0.5; // Minimum scale to keep guides visible on very small canvases
    const maxScale = 3; // Maximum scale to prevent guides becoming too thick on very large canvases
    const scaleFactor = Math.max(minScale, Math.min(maxScale, baseScale));
    const getGuideColor = (guide) => {
        if (guide.type.startsWith("canvas-center")) {
            return "#3b82f6"; // Blue for canvas center
        }
        if (guide.type.startsWith("canvas-edge")) {
            return "#ef4444"; // Red for canvas edges (more prominent)
        }
        return "#f59e0b"; // Orange for element alignment
    };
    const getGuideOpacity = (guide) => {
        if (guide.type.startsWith("canvas-center")) {
            return 0.9;
        }
        if (guide.type.startsWith("canvas-edge")) {
            return 0.85; // More prominent for edges
        }
        return 0.8; // Element guides
    };
    const getGuideDashArray = (guide) => {
        const centerDash = `${6 * scaleFactor} ${4 * scaleFactor}`;
        const elementDash = `${4 * scaleFactor} ${2 * scaleFactor}`;
        if (guide.type.startsWith("canvas-center")) {
            return centerDash; // Slightly more solid dashed for center
        }
        if (guide.type.startsWith("canvas-edge")) {
            return ""; // Solid lines for edges (most prominent)
        }
        return elementDash; // Dashed for element alignment
    };
    const getGuideStrokeWidth = (guide) => {
        if (guide.type.startsWith("canvas-edge")) {
            return 3 * scaleFactor; // Thicker for canvas edges
        }
        if (guide.type.startsWith("canvas-center")) {
            return 3 * scaleFactor; // Medium for center
        }
        return 2 * scaleFactor; // Standard for element guides
    };
    return (_jsxs("div", { className: "pointer-events-none absolute inset-0 overflow-hidden", style: {
            width: canvasWidth,
            height: canvasHeight,
        }, children: [_jsx("svg", { width: canvasWidth, height: canvasHeight, className: "absolute inset-0 pointer-events-none", style: { zIndex: 1000 }, children: guideState.guides.map((guide) => {
                    const color = getGuideColor(guide);
                    const opacity = getGuideOpacity(guide);
                    const dashArray = getGuideDashArray(guide);
                    const strokeWidth = getGuideStrokeWidth(guide);
                    if (guide.x !== undefined) {
                        // Vertical guide line
                        return (_jsx("line", { x1: guide.x, y1: 0, x2: guide.x, y2: canvasHeight, stroke: color, strokeWidth: strokeWidth, strokeOpacity: opacity, strokeDasharray: dashArray, className: "animate-in fade-in duration-150", style: {
                                filter: guide.type.startsWith("canvas-edge")
                                    ? "drop-shadow(0 0 2px rgba(239, 68, 68, 0.3))"
                                    : undefined
                            } }, guide.id));
                    }
                    if (guide.y !== undefined) {
                        // Horizontal guide line
                        return (_jsx("line", { x1: 0, y1: guide.y, x2: canvasWidth, y2: guide.y, stroke: color, strokeWidth: strokeWidth, strokeOpacity: opacity, strokeDasharray: dashArray, className: "animate-in fade-in duration-150", style: {
                                filter: guide.type.startsWith("canvas-edge")
                                    ? "drop-shadow(0 0 2px rgba(239, 68, 68, 0.3))"
                                    : undefined
                            } }, guide.id));
                    }
                    return null;
                }) }), guideState.guides.map((guide) => {
                const getLabelText = () => {
                    if (guide.type === "canvas-center-x")
                        return "Center";
                    if (guide.type === "canvas-center-y")
                        return "Center";
                    // Hide width/height dimension labels for edges
                    return "";
                };
                const getLabelColor = () => {
                    if (guide.type.startsWith("canvas-center"))
                        return "bg-blue-600";
                    if (guide.type.startsWith("canvas-edge"))
                        return "bg-red-600";
                    return "bg-orange-600";
                };
                const labelText = getLabelText();
                if (!labelText)
                    return null;
                // Position labels smartly to avoid overlap with responsive spacing
                const labelOffset = 8 * scaleFactor;
                const rightMargin = 60 * scaleFactor;
                const bottomMargin = 30 * scaleFactor;
                const getPositionStyles = () => {
                    if (guide.x !== undefined) {
                        // Vertical guide - position to the right
                        return {
                            left: Math.min(guide.x + labelOffset, canvasWidth - rightMargin),
                            top: labelOffset,
                            transform: "none",
                        };
                    }
                    else if (guide.y !== undefined) {
                        // Horizontal guide - position below
                        return {
                            left: labelOffset,
                            top: Math.min(guide.y + labelOffset, canvasHeight - bottomMargin),
                            transform: "none",
                        };
                    }
                    return {};
                };
                // Calculate responsive text size and padding
                const fontSize = Math.max(10, Math.min(16, 12 * scaleFactor));
                const padding = Math.max(4, Math.min(12, 8 * scaleFactor));
                return (_jsx("div", { className: `absolute ${getLabelColor()} text-white rounded shadow-lg pointer-events-none animate-in fade-in duration-150`, style: {
                        ...getPositionStyles(),
                        fontSize: `${fontSize}px`,
                        padding: `${padding * 0.5}px ${padding}px`,
                        zIndex: 1001,
                    }, children: labelText }, `label-${guide.id}`));
            })] }));
};
