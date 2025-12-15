import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
export const TimelineItemResizeHandles = ({ onDragStart, splittingEnabled = false, isHovering = false, isSelected = false, isDragging = false, isMultiSelected = false, onMouseDown, onTouchStart, }) => {
    // Hide resize handles if dragging is not enabled, splitting is enabled, or multiple items are selected
    if (!onDragStart || splittingEnabled || isMultiSelected) {
        return null;
    }
    const handleMouseDown = (position) => (e) => {
        onMouseDown === null || onMouseDown === void 0 ? void 0 : onMouseDown(e, position);
    };
    const handleTouchStart = (position) => (e) => {
        onTouchStart === null || onTouchStart === void 0 ? void 0 : onTouchStart(e, position);
    };
    const baseHandleClasses = `
    absolute top-0 bottom-0 z-50
    bg-(--timeline-handle-bg) backdrop-blur-sm
    hover:bg-(--timeline-handle-hover) 
    ${isHovering || isSelected ? "opacity-100 " : "opacity-0 group-hover:opacity-100"}
    transition-all duration-200 ease-in-out
    border-(--border)
  `.trim();
    const cursorStyle = !isDragging
        ? { cursor: "ew-resize" }
        : { cursor: "grabbing" };
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: `${baseHandleClasses} left-0 border-r border-l rounded-l-[4px] touch-none`, style: { width: '12px', minWidth: '12px', ...cursorStyle }, onMouseDown: handleMouseDown('left'), onTouchStart: handleTouchStart('left'), children: _jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsxs("div", { className: "space-x-0.5 flex ml-0", children: [_jsx("div", { className: "w-px h-4 bg-(--timeline-handle-indicator) rounded-full shadow-glow" }), _jsx("div", { className: "w-px h-4 bg-(--timeline-handle-indicator) rounded-full shadow-glow" })] }) }) }), _jsx("div", { className: `${baseHandleClasses} right-0 border-r border-l rounded-r-[4px] touch-none`, style: { width: '12px', minWidth: '12px', ...cursorStyle }, onMouseDown: handleMouseDown('right'), onTouchStart: handleTouchStart('right'), children: _jsx("div", { className: "absolute inset-0 flex items-center justify-center", children: _jsxs("div", { className: "space-x-0.5 flex mr-0", children: [_jsx("div", { className: "w-px h-4 bg-(--timeline-handle-indicator) rounded-full shadow-glow" }), _jsx("div", { className: "w-px h-4 bg-(--timeline-handle-indicator) rounded-full shadow-glow" })] }) }) })] }));
};
