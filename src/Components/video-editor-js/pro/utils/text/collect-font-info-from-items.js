/**
 * Utility for collecting font information from items before rendering
 * This ensures all required fonts are available during server-side rendering
 */
import { GOOGLE_FONTS_DATABASE } from '../../data/google-fonts';
import { OverlayType } from '../../types';
/**
 * Type guard to check if an overlay is a text overlay
 */
const isTextOverlay = (overlay) => {
    return overlay.type === OverlayType.TEXT;
};
/**
 * Type guard to check if an overlay is a caption overlay
 */
const isCaptionOverlay = (overlay) => {
    return overlay.type === OverlayType.CAPTION;
};
/**
 * Collects all font information from overlays that use custom fonts
 * This is called before rendering to ensure all fonts are available
 *
 * @param overlays - Array of overlays to extract font info from
 * @returns Record of font family names to FontInfo objects
 */
export const collectFontInfoFromOverlays = (overlays) => {
    var _a;
    const fontInfos = {};
    for (const overlay of overlays) {
        let fontFamily;
        // Extract font family based on overlay type
        if (isTextOverlay(overlay)) {
            // For text overlays, get font from styles
            fontFamily = overlay.styles.fontFamily;
        }
        else if (isCaptionOverlay(overlay)) {
            // For caption overlays, get font from caption styles or default
            fontFamily = ((_a = overlay.styles) === null || _a === void 0 ? void 0 : _a.fontFamily) || 'Inter'; // Default font
        }
        // Skip if no font family or already collected
        if (!fontFamily || fontInfos[fontFamily]) {
            continue;
        }
        // Find font info in database
        const fontInfo = GOOGLE_FONTS_DATABASE.find((font) => font.fontFamily === fontFamily);
        if (!fontInfo) {
            console.warn(`Font "${fontFamily}" not found in Google Fonts database`);
            continue;
        }
        fontInfos[fontFamily] = fontInfo;
    }
    return fontInfos;
};
/**
 * Validates that all required fonts are available in the database
 * Useful for pre-flight checks before rendering
 *
 * @param overlays - Array of overlays to validate
 * @returns Array of missing font names
 */
export const validateFontsAvailable = (overlays) => {
    var _a;
    const missingFonts = [];
    const checkedFonts = new Set();
    for (const overlay of overlays) {
        let fontFamily;
        if (isTextOverlay(overlay)) {
            fontFamily = overlay.styles.fontFamily;
        }
        else if (isCaptionOverlay(overlay)) {
            fontFamily = ((_a = overlay.styles) === null || _a === void 0 ? void 0 : _a.fontFamily) || 'Inter';
        }
        if (!fontFamily || checkedFonts.has(fontFamily)) {
            continue;
        }
        checkedFonts.add(fontFamily);
        const fontExists = GOOGLE_FONTS_DATABASE.some((font) => font.fontFamily === fontFamily);
        if (!fontExists) {
            missingFonts.push(fontFamily);
        }
    }
    return missingFonts;
};
