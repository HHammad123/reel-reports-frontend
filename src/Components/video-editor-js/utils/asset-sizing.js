/**
 * Utility functions for intelligent asset sizing when importing media
 */
/**
 * Calculates intelligent sizing for an asset based on canvas dimensions and asset dimensions.
 *
 * Rules:
 * 1. If asset is smaller than canvas, use asset's original size
 * 2. If asset is larger than canvas, scale it down intelligently:
 *    - If aspect ratios match, fill the canvas
 *    - If aspect ratios don't match, scale the largest dimension to fit canvas
 *      while maintaining original aspect ratio
 *
 * @param assetSize - Original dimensions of the asset
 * @param canvasSize - Canvas/viewport dimensions
 * @returns Calculated dimensions for the asset
 */
export function calculateIntelligentAssetSize(assetSize, canvasSize) {
    const { width: assetWidth, height: assetHeight } = assetSize;
    const { width: canvasWidth, height: canvasHeight } = canvasSize;
    // Calculate aspect ratios first
    const assetAspectRatio = assetWidth / assetHeight;
    const canvasAspectRatio = canvasWidth / canvasHeight;
    // If aspect ratios are very close (within 1% tolerance), always fill the canvas
    // This ensures base videos with matching aspect ratios cover the full canvas
    const aspectRatioTolerance = 0.01;
    if (Math.abs(assetAspectRatio - canvasAspectRatio) < aspectRatioTolerance) {
        return {
            width: canvasWidth,
            height: canvasHeight,
        };
    }
    // If asset is smaller than canvas in both dimensions and aspect ratios don't match, use original size
    if (assetWidth <= canvasWidth && assetHeight <= canvasHeight) {
        return {
            width: assetWidth,
            height: assetHeight,
        };
    }
    // Calculate scale factors for both dimensions
    const widthScale = canvasWidth / assetWidth;
    const heightScale = canvasHeight / assetHeight;
    // Use the smaller scale factor to ensure the asset fits within canvas bounds
    const scale = Math.min(widthScale, heightScale);
    const scaledWidth = assetWidth * scale;
    const scaledHeight = assetHeight * scale;
    return {
        width: Math.round(scaledWidth),
        height: Math.round(scaledHeight),
    };
}
/**
 * Helper function to get asset dimensions from StandardVideo/StandardImage
 */
export function getAssetDimensions(asset) {
    if (!asset.width || !asset.height) {
        return null;
    }
    return {
        width: asset.width,
        height: asset.height,
    };
}
/**
 * Helper function to get asset dimensions from various asset types with size property
 */
export function getAssetDimensionsFromSize(asset) {
    if (!asset.size) {
        return null;
    }
    return {
        width: asset.size.width,
        height: asset.size.height,
    };
}
