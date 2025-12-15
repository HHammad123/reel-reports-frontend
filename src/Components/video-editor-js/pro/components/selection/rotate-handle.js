import { jsx as _jsx } from "react/jsx-runtime";
import { useCallback, useMemo } from "react";
import { useCurrentScale } from "remotion";
import { RotateCw } from "lucide-react";
const HANDLE_SIZE = 28;
const ICON_SIZE = 20;
const HANDLE_OFFSET = 38;
/**
 * RotateHandle Component
 *
 * A React component that provides rotation functionality for overlay elements.
 * Renders a rotation handle that users can drag to rotate the parent overlay.
 *
 * @component
 * @param {Object} props
 * @param {Overlay} props.overlay - The overlay object to be rotated
 * @param {Function} props.setOverlay - Callback function to update the overlay properties
 *
 * @example
 * <RotateHandle
 *   overlay={overlayObject}
 *   setOverlay={(id, updater) => updateOverlay(id, updater)}
 * />
 */
export const RotateHandle = ({ overlay, setOverlay }) => {
    const scale = useCurrentScale();
    /**
     * Handles the start of a rotation gesture and sets up event listeners
     * for tracking the rotation movement.
     *
     * @param {React.PointerEvent} e - The pointer event that initiated the rotation
     */
    const startRotating = useCallback((e) => {
        var _a;
        e.stopPropagation();
        e.preventDefault(); // Prevent text selection during drag
        const rect = (_a = e.currentTarget.parentElement) === null || _a === void 0 ? void 0 : _a.getBoundingClientRect();
        if (!rect)
            return;
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const getAngle = (x, y) => {
            const deltaX = x - centerX;
            const deltaY = y - centerY;
            return Math.atan2(deltaY, deltaX) * (180 / Math.PI);
        };
        const startAngle = getAngle(e.clientX, e.clientY);
        const startRotation = overlay.rotation || 0;
        const onPointerMove = (e) => {
            const currentAngle = getAngle(e.clientX, e.clientY);
            const deltaAngle = currentAngle - startAngle;
            setOverlay(overlay.id, (o) => ({
                ...o,
                rotation: startRotation + deltaAngle,
            }));
        };
        const onPointerUp = () => {
            window.removeEventListener("pointermove", onPointerMove);
        };
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp, { once: true });
    }, [overlay, setOverlay]);
    // Scale the handle size and offset based on zoom level
    const scaledHandleSize = Math.round(HANDLE_SIZE / scale);
    const scaledIconSize = Math.round(ICON_SIZE / scale);
    const scaledOffset = Math.round(HANDLE_OFFSET / scale);
    const style = useMemo(() => ({
        position: "absolute",
        width: Number.isFinite(scaledHandleSize) ? scaledHandleSize : HANDLE_SIZE,
        height: Number.isFinite(scaledHandleSize) ? scaledHandleSize : HANDLE_SIZE,
        cursor: "pointer",
        top: Number.isFinite(scaledOffset) ? -scaledOffset : -HANDLE_OFFSET,
        left: "50%",
        transform: "translateX(-50%)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        pointerEvents: "auto", // Enable pointer events for the rotate handle
    }), [scaledHandleSize, scaledOffset]);
    const iconSize = Number.isFinite(scaledIconSize) ? scaledIconSize : ICON_SIZE;
    return (_jsx("div", { onPointerDown: startRotating, style: style, children: _jsx(RotateCw, { size: iconSize, strokeWidth: 2, color: "var(--primary-500)" }) }));
};
