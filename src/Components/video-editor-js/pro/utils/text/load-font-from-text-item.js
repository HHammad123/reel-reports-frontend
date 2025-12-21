/**
 * Utility for loading full Google Fonts for text rendering
 * Handles font loading for both editor preview and server-side rendering
 */
import { createContext } from 'react';
import { loadFontFromInfo } from '@remotion/google-fonts/from-info';
import { getInfo as getRobotoFontInfo } from '@remotion/google-fonts/Roboto';
import { continueRender, delayRender } from 'remotion';
import { useEffect, useState } from 'react';
// Cache for font info to avoid redundant API calls
const fontInfoPromiseCache = {};
// Cache for loaded fonts via Google Fonts CDN
const loadedGoogleFonts = new Set();
/**
 * Converts font family name to Google Fonts URL format
 * @param fontFamily - The font family name (e.g., "Open Sans")
 * @returns The URL-encoded font name (e.g., "Open+Sans")
 */
const getGoogleFontsUrlName = (fontFamily) => {
    return fontFamily.replace(/\s+/g, '+');
};
/**
 * Loads a font directly from Google Fonts CDN using link tag
 * This is a fallback when the API endpoint is not available
 * @param fontFamily - The font family name
 * @param fontWeight - The font weight (default: '400')
 * @param fontStyle - The font style (default: 'normal')
 * @returns Promise that resolves when font is loaded
 */
const loadFontFromGoogleFontsCDN = async (fontFamily, fontWeight = '400', fontStyle = 'normal') => {
    const fontKey = `${fontFamily}:${fontWeight}:${fontStyle}`;
    
    // Check if already loaded
    if (loadedGoogleFonts.has(fontKey)) {
        return;
    }
    
    // Check if link tag already exists
    const googleFontsUrlName = getGoogleFontsUrlName(fontFamily);
    const linkId = `google-font-${fontKey.replace(/[^a-zA-Z0-9]/g, '-')}`;
    const existingLink = document.getElementById(linkId);
    
    if (existingLink) {
        loadedGoogleFonts.add(fontKey);
        return;
    }
    
    // Create and add link tag
    const link = document.createElement('link');
    link.id = linkId;
    link.rel = 'stylesheet';
    link.href = `https://fonts.googleapis.com/css2?family=${googleFontsUrlName}:wght@${fontWeight}${fontStyle === 'italic' ? ':ital@1' : ''}&display=swap`;
    
    // Wait for font to load
    return new Promise((resolve, reject) => {
        link.onload = () => {
            loadedGoogleFonts.add(fontKey);
            // Wait for font to be available in document.fonts
            document.fonts.ready.then(() => {
                // Additional check to ensure font is loaded
                const checkFont = () => {
                    const fontFace = Array.from(document.fonts).find(
                        f => f.family === fontFamily && 
                        f.weight === fontWeight && 
                        f.style === fontStyle
                    );
                    if (fontFace && fontFace.status === 'loaded') {
                        resolve();
                    } else {
                        // Fallback: resolve after a short delay if font check fails
                        setTimeout(() => resolve(), 100);
                    }
                };
                checkFont();
            });
        };
        link.onerror = () => {
            console.warn(`Failed to load font "${fontFamily}" from Google Fonts CDN`);
            reject(new Error(`Failed to load font ${fontFamily}`));
        };
        document.head.appendChild(link);
    });
};
/**
 * Loads font info either from API (in editor) or from pre-collected data (during rendering)
 * Falls back to Google Fonts CDN, then to Roboto font on error for graceful degradation
 *
 * @param options - Font loading options
 * @returns Promise resolving to FontInfo
 */
const loadFontInfo = async ({ fontFamily, fontInfosDuringRendering, }) => {
    // During rendering, use pre-collected font info
    if (fontInfosDuringRendering) {
        return fontInfosDuringRendering;
    }
    // In editor, fetch from API with caching
    if (!fontInfoPromiseCache[fontFamily]) {
        fontInfoPromiseCache[fontFamily] = fetch(`/api/fonts/${fontFamily}`)
            .then((res) => {
            if (!res.ok) {
                throw new Error(`Failed to fetch font info for ${fontFamily}: ${res.statusText}`);
            }
            return res.json();
        })
            .catch(async (error) => {
            console.warn(`API endpoint failed for font "${fontFamily}", trying Google Fonts CDN...`, `Error: ${error.message}`);
            // Try to load from Google Fonts CDN as fallback
            try {
                await loadFontFromGoogleFontsCDN(fontFamily, '400', 'normal');
                // Create a minimal FontInfo object for CDN-loaded fonts
                return {
                    fontFamily: fontFamily,
                    importName: fontFamily.replace(/\s+/g, ''),
                    url: `https://fonts.googleapis.com/css2?family=${getGoogleFontsUrlName(fontFamily)}`,
                };
            } catch (cdnError) {
                console.warn(`Failed to load font "${fontFamily}" from CDN, falling back to Roboto.`, `Error: ${cdnError.message}`);
            // Remove from cache on error so it can be retried
            delete fontInfoPromiseCache[fontFamily];
                // Return Roboto as final fallback
            return getRobotoFontInfo();
            }
        });
    }
    return fontInfoPromiseCache[fontFamily];
};
/**
 * Loads a font from text item configuration
 * Handles both editor and rendering contexts
 *
 * @param item - Font configuration from text item
 * @returns Promise that resolves when font is loaded
 */
export const loadFontFromTextItem = async (item) => {
    try {
        // Get font info (with fallback to Google Fonts CDN, then Roboto on error)
        const fontInfo = await loadFontInfo({
            fontFamily: item.fontFamily,
            fontInfosDuringRendering: item.fontInfosDuringRendering,
        });
        
        // Check if this is a CDN-loaded font (has url but no proper FontInfo structure)
        const isCDNFont = fontInfo.url && fontInfo.url.includes('fonts.googleapis.com') && !fontInfo.importName;
        
        if (isCDNFont) {
            // Load directly from Google Fonts CDN with the specific weight and style
            const fontWeight = item.fontWeight || '400';
            const fontStyle = item.fontStyle || 'normal';
            await loadFontFromGoogleFontsCDN(item.fontFamily, fontWeight, fontStyle);
            // Wait a bit for the font to be available
            await document.fonts.ready;
            return;
        }
        
        // Use Remotion's font loading for proper FontInfo objects
        // Determine font variant based on weight and style
        const variant = item.fontStyle === 'italic' ? 'italic' : 'normal';
        // If using fallback font, adjust weight to available ones
        let fontWeight = item.fontWeight;
        if (fontInfo.fontFamily === 'Roboto' && item.fontFamily !== 'Roboto') {
            // Roboto supports all standard weights, but ensure we use a valid one
            const validWeights = ['100', '300', '400', '500', '700', '900'];
            if (!validWeights.includes(fontWeight)) {
                fontWeight = '400'; // Default to regular
            }
        }
        // Load font with specific weight
        await loadFontFromInfo(fontInfo, variant, {
            weights: [fontWeight],
        }).waitUntilDone();
    }
    catch (error) {
        console.error(`Failed to load font ${item.fontFamily}:`, error);
        // Try one more time with Google Fonts CDN as last resort
        try {
            const fontWeight = item.fontWeight || '400';
            const fontStyle = item.fontStyle || 'normal';
            await loadFontFromGoogleFontsCDN(item.fontFamily, fontWeight, fontStyle);
        } catch (cdnError) {
            console.error(`Failed to load font ${item.fontFamily} even from CDN:`, cdnError);
            // Don't throw - we've already tried all fallbacks
        }
    }
};
/**
 * Hook for loading fonts in React components with Remotion integration
 * Handles delayRender/continueRender for proper font loading during rendering
 *
 * @param fontInfo - Font loading configuration
 * @returns Loading state
 */
export const useLoadFontFromTextItem = (fontInfo) => {
    const [loaded, setLoaded] = useState(false);
    useEffect(() => {
        if (!fontInfo || !fontInfo.fontFamily) {
            setLoaded(true);
            return;
        }
        let handle = null;
        let cancelled = false;
        let hasContinued = false;
        
        // Helper to continue render only once
        const safeContinueRender = () => {
            if (!cancelled && handle !== null && !hasContinued) {
                hasContinued = true;
                continueRender(handle);
            }
        };
        
        const loadFont = async () => {
            // CRITICAL: Use very short delayRender timeout to prevent blocking subtitle changes
            // Fonts will load in background, but we won't block rendering
            handle = delayRender(`Loading font ${fontInfo.fontFamily}`);
            
            // Set a very short timeout to continue render quickly
            const timeoutId = setTimeout(() => {
                safeContinueRender();
                setLoaded(true);
            }, 100); // Only wait 100ms - fonts load in background
            
            try {
                // Load font asynchronously without blocking
                loadFontFromTextItem(fontInfo).then(() => {
                    if (!cancelled) {
                        setLoaded(true);
                    }
                }).catch(() => {
                    // Font loading failed, but continue anyway
                if (!cancelled) {
                    setLoaded(true);
                }
                });
                
                // Don't wait for font to be fully loaded - continue render quickly
                // Font will load in background and apply when ready
                safeContinueRender();
            }
            catch (error) {
                if (process.env.NODE_ENV === 'development') {
                console.error('Font loading error:', error);
                }
                // Continue render even on error to prevent blocking
                safeContinueRender();
                if (!cancelled) {
                    setLoaded(true);
                }
            }
            finally {
                clearTimeout(timeoutId);
            }
        };
        loadFont();
        return () => {
            cancelled = true;
            safeContinueRender();
        };
    }, [fontInfo === null || fontInfo === void 0 ? void 0 : fontInfo.fontFamily, fontInfo === null || fontInfo === void 0 ? void 0 : fontInfo.fontWeight, fontInfo === null || fontInfo === void 0 ? void 0 : fontInfo.fontStyle]);
    return loaded;
};
/**
 * Context for providing font infos during rendering
 * This is used to pass pre-collected font data to text layers
 */
export const FontInfoContext = createContext({});
