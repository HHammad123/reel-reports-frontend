import { useState, useEffect } from 'react';
import { parseMedia } from '@remotion/media-parser';
/**
 * Hook to get source duration of media files using @remotion/media-parser
 * Supports both File objects and URL strings
 * Returns duration in both seconds and frames
 */
export const useSrcDuration = (src, options = {}) => {
    const { fps = 30 } = options;
    const [durationInSeconds, setDurationInSeconds] = useState(null);
    const [dimensions, setDimensions] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    useEffect(() => {
        if (!src) {
            setDurationInSeconds(null);
            setDimensions(null);
            setError(null);
            setIsLoading(false);
            return;
        }
        let isCancelled = false;
        const parseDuration = async () => {
            setIsLoading(true);
            setError(null);
            try {
                let srcPath = '';
                const reader = undefined;
                // Handle File objects vs URL strings
                if (src instanceof File) {
                    // For File objects in browser, create a temporary URL
                    if (typeof window !== 'undefined') {
                        srcPath = URL.createObjectURL(src);
                    }
                    else {
                        // In Node.js environment, File objects are not supported
                        throw new Error('File objects are not supported in Node.js environment. Use file path string instead.');
                    }
                }
                else {
                    // For URL strings, use directly
                    srcPath = src;
                    // For local file paths in Node.js, we'd need to dynamically import nodeReader
                    if (src.startsWith('/') && typeof window === 'undefined') {
                        // We'll handle this case in a separate function if needed
                        throw new Error('Local file paths in Node.js environment are not supported in this context. Use URLs instead.');
                    }
                }
                const parseOptions = {
                    src: srcPath,
                    fields: {
                        durationInSeconds: true,
                        dimensions: true,
                    },
                };
                // Add reader for Node.js environments or local file paths
                if (reader) {
                    parseOptions.reader = reader;
                }
                const result = await parseMedia(parseOptions);
                if (isCancelled)
                    return;
                if (result.durationInSeconds !== undefined) {
                    setDurationInSeconds(result.durationInSeconds);
                }
                if (result.dimensions) {
                    setDimensions(result.dimensions);
                }
                // Clean up blob URL if we created one
                if (src instanceof File && typeof window !== 'undefined' && srcPath) {
                    URL.revokeObjectURL(srcPath);
                }
            }
            catch (err) {
                if (isCancelled)
                    return;
                console.error('Error parsing media duration:', err);
                setError(err instanceof Error ? err.message : 'Failed to parse media duration');
            }
            finally {
                if (!isCancelled) {
                    setIsLoading(false);
                }
            }
        };
        parseDuration();
        // Cleanup function
        return () => {
            isCancelled = true;
        };
    }, [src, fps]);
    // Calculate duration in frames
    const durationInFrames = durationInSeconds !== null ? Math.round(durationInSeconds * fps) : null;
    return {
        durationInSeconds,
        durationInFrames,
        isLoading,
        error,
        dimensions,
    };
};
/**
 * Standalone function to get source duration (useful for one-off parsing)
 */
export const getSrcDuration = async (src, options = {}) => {
    const { fps = 30 } = options;
    let srcPath;
    const reader = undefined;
    // Handle File objects vs URL strings
    if (src instanceof File) {
        if (typeof window !== 'undefined') {
            srcPath = URL.createObjectURL(src);
        }
        else {
            throw new Error('File objects are not supported in Node.js environment. Use file path string instead.');
        }
    }
    else {
        srcPath = src;
        // For local file paths in Node.js, we'd need to dynamically import nodeReader
        if (src.startsWith('/') && typeof window === 'undefined') {
            throw new Error('Local file paths in Node.js environment are not supported in this context. Use URLs instead.');
        }
    }
    try {
        const parseOptions = {
            src: srcPath,
            fields: {
                durationInSeconds: true,
                dimensions: true,
            },
        };
        if (reader) {
            parseOptions.reader = reader;
        }
        const result = await parseMedia(parseOptions);
        // Clean up blob URL if we created one
        if (src instanceof File && typeof window !== 'undefined') {
            URL.revokeObjectURL(srcPath);
        }
        if (result.durationInSeconds === undefined) {
            throw new Error('Could not determine media duration');
        }
        return {
            durationInSeconds: result.durationInSeconds,
            durationInFrames: Math.round(result.durationInSeconds * fps),
            dimensions: result.dimensions || undefined,
        };
    }
    catch (error) {
        // Clean up blob URL on error if we created one
        if (src instanceof File && typeof window !== 'undefined') {
            try {
                URL.revokeObjectURL(srcPath);
            }
            catch (cleanupErr) {
                // Ignore cleanup errors
            }
        }
        throw error;
    }
};
