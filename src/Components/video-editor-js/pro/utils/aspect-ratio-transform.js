/**
 * Get canvas dimensions for a specific aspect ratio
 * @param aspectRatio - The aspect ratio to get dimensions for
 * @returns Canvas dimensions for the given aspect ratio
 */
export function getDimensionsForAspectRatio(aspectRatio) {
    switch (aspectRatio) {
        case "9:16":
            return { width: 1080, height: 1920 };
        case "4:5":
            return { width: 1080, height: 1350 };
        case "1:1":
            return { width: 1080, height: 1080 };
        case "16:9":
            return { width: 1280, height: 720 };
        default:
            return { width: 1920, height: 1080 };
    }
}
/**
 * Transforms a single overlay's position and dimensions based on canvas size change
 * @param overlay - The overlay to transform
 * @param oldDimensions - Previous canvas dimensions
 * @param newDimensions - New canvas dimensions
 * @returns Updated overlay with transformed position and size
 */
export function transformOverlayForAspectRatio(overlay, oldDimensions, newDimensions) {
    // Calculate scale factors for both dimensions
    const scaleX = newDimensions.width / oldDimensions.width;
    const scaleY = newDimensions.height / oldDimensions.height;
    // Transform position
    const newLeft = overlay.left * scaleX;
    const newTop = overlay.top * scaleY;
    // Transform dimensions
    const newWidth = overlay.width * scaleX;
    const newHeight = overlay.height * scaleY;
    return {
        ...overlay,
        left: Math.round(newLeft),
        top: Math.round(newTop),
        width: Math.round(newWidth),
        height: Math.round(newHeight),
    };
}
/**
 * Transforms all overlays for a new aspect ratio
 * @param overlays - Array of overlays to transform
 * @param oldDimensions - Previous canvas dimensions
 * @param newDimensions - New canvas dimensions
 * @returns Array of transformed overlays
 */
export function transformOverlaysForAspectRatio(overlays, oldDimensions, newDimensions) {
    // If dimensions haven't changed, return overlays as-is
    if (oldDimensions.width === newDimensions.width &&
        oldDimensions.height === newDimensions.height) {
        return overlays;
    }
    return overlays.map((overlay) => transformOverlayForAspectRatio(overlay, oldDimensions, newDimensions));
}
/**
 * Check if overlays need transformation (i.e., if dimensions changed significantly)
 * @param oldDimensions - Previous canvas dimensions
 * @param newDimensions - New canvas dimensions
 * @returns true if transformation is needed
 */
export function shouldTransformOverlays(oldDimensions, newDimensions) {
    // Use a small tolerance to avoid unnecessary transformations due to rounding
    const tolerance = 0.01;
    const widthRatio = Math.abs(oldDimensions.width - newDimensions.width) / oldDimensions.width;
    const heightRatio = Math.abs(oldDimensions.height - newDimensions.height) / oldDimensions.height;
    return widthRatio > tolerance || heightRatio > tolerance;
}
