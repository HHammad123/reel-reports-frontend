import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useMemo, useCallback } from 'react';
import { shuffleArray } from '../types/overlay-adaptors';
import { getDefaultAudioAdaptors } from '../adaptors/default-audio-adaptors';
import { getDefaultVideoAdaptors } from '../adaptors/default-video-adaptors';
import { getDefaultTextAdaptors } from '../adaptors/default-text-adaptors';
import { getDefaultTemplateAdaptors } from '../adaptors/default-templates-adaptor';
import { getDefaultAnimationAdaptors } from '../adaptors/default-animation-adaptors';
const MediaAdaptorContext = createContext(null);
export const MediaAdaptorProvider = ({ children, adaptors }) => {
    // Resolve adaptors with defaults
    const resolvedAdaptors = useMemo(() => {
        const resolvedAdaptorsConfig = {
            videoAdaptors: (adaptors === null || adaptors === void 0 ? void 0 : adaptors.video) || getDefaultVideoAdaptors(),
            imageAdaptors: (adaptors === null || adaptors === void 0 ? void 0 : adaptors.images) || [],
            audioAdaptors: (adaptors === null || adaptors === void 0 ? void 0 : adaptors.audio) || getDefaultAudioAdaptors(),
            textAdaptors: (adaptors === null || adaptors === void 0 ? void 0 : adaptors.text) || getDefaultTextAdaptors(),
            stickerAdaptors: (adaptors === null || adaptors === void 0 ? void 0 : adaptors.stickers) || [],
            templateAdaptors: (adaptors === null || adaptors === void 0 ? void 0 : adaptors.templates) || getDefaultTemplateAdaptors(),
            animationAdaptors: (adaptors === null || adaptors === void 0 ? void 0 : adaptors.animations) || getDefaultAnimationAdaptors(),
        };
        return resolvedAdaptorsConfig;
    }, [adaptors]);
    // Video search across all video adaptors
    const searchVideos = useCallback(async (params, config) => {
        const activeAdaptors = resolvedAdaptors.videoAdaptors;
        if (activeAdaptors.length === 0) {
            return {
                items: [],
                totalCount: 0,
                hasMore: false,
                sourceResults: []
            };
        }
        // Execute all adaptor searches in parallel
        const searchPromises = activeAdaptors.map(async (adaptor) => {
            try {
                const result = await adaptor.search(params, config);
                return {
                    adaptor,
                    result,
                    error: null
                };
            }
            catch (error) {
                console.error(`Error searching videos with ${adaptor.name}:`, error);
                return {
                    adaptor,
                    result: { items: [], totalCount: 0, hasMore: false },
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        const searchResults = await Promise.all(searchPromises);
        // Merge and attribute results
        const mergedItems = [];
        const sourceResults = [];
        searchResults.forEach(({ adaptor, result, error }) => {
            // Add source attribution to each item
            const attributedItems = result.items.map(item => ({
                ...item,
                _source: adaptor.name,
                _sourceDisplayName: adaptor.displayName
            }));
            mergedItems.push(...attributedItems);
            sourceResults.push({
                adaptorName: adaptor.name,
                adaptorDisplayName: adaptor.displayName,
                itemCount: result.items.length,
                hasMore: result.hasMore || false,
                ...(error && { error })
            });
        });
        // Shuffle merged results to mix sources
        const shuffledItems = shuffleArray(mergedItems);
        return {
            items: shuffledItems,
            totalCount: mergedItems.length,
            hasMore: sourceResults.some(s => s.hasMore),
            sourceResults
        };
    }, [resolvedAdaptors.videoAdaptors]);
    // Image search across all image adaptors
    const searchImages = useCallback(async (params, config) => {
        const activeAdaptors = resolvedAdaptors.imageAdaptors;
        if (activeAdaptors.length === 0) {
            return {
                items: [],
                totalCount: 0,
                hasMore: false,
                sourceResults: []
            };
        }
        // Execute all adaptor searches in parallel
        const searchPromises = activeAdaptors.map(async (adaptor) => {
            try {
                const result = await adaptor.search(params, config);
                return {
                    adaptor,
                    result,
                    error: null
                };
            }
            catch (error) {
                console.error(`Error searching images with ${adaptor.name}:`, error);
                return {
                    adaptor,
                    result: { items: [], totalCount: 0, hasMore: false },
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        const searchResults = await Promise.all(searchPromises);
        // Merge and attribute results
        const mergedItems = [];
        const sourceResults = [];
        searchResults.forEach(({ adaptor, result, error }) => {
            // Add source attribution to each item
            const attributedItems = result.items.map(item => ({
                ...item,
                _source: adaptor.name,
                _sourceDisplayName: adaptor.displayName
            }));
            mergedItems.push(...attributedItems);
            sourceResults.push({
                adaptorName: adaptor.name,
                adaptorDisplayName: adaptor.displayName,
                itemCount: result.items.length,
                hasMore: result.hasMore || false,
                ...(error && { error })
            });
        });
        // Shuffle merged results to mix sources
        const shuffledItems = shuffleArray(mergedItems);
        return {
            items: shuffledItems,
            totalCount: mergedItems.length,
            hasMore: sourceResults.some(s => s.hasMore),
            sourceResults
        };
    }, [resolvedAdaptors.imageAdaptors]);
    // Audio search across all audio adaptors
    const searchAudio = useCallback(async (params, config) => {
        const activeAdaptors = resolvedAdaptors.audioAdaptors;
        if (activeAdaptors.length === 0) {
            return {
                items: [],
                totalCount: 0,
                hasMore: false,
                sourceResults: []
            };
        }
        // Execute all adaptor searches in parallel
        const searchPromises = activeAdaptors.map(async (adaptor) => {
            try {
                const result = await adaptor.search(params, config);
                return {
                    adaptor,
                    result,
                    error: null
                };
            }
            catch (error) {
                console.error(`Error searching audio with ${adaptor.name}:`, error);
                return {
                    adaptor,
                    result: { items: [], totalCount: 0, hasMore: false },
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        const searchResults = await Promise.all(searchPromises);
        // Merge and attribute results
        const mergedItems = [];
        const sourceResults = [];
        searchResults.forEach(({ adaptor, result, error }) => {
            // Add source attribution to each item
            const attributedItems = result.items.map(item => ({
                ...item,
                _source: adaptor.name,
                _sourceDisplayName: adaptor.displayName
            }));
            mergedItems.push(...attributedItems);
            sourceResults.push({
                adaptorName: adaptor.name,
                adaptorDisplayName: adaptor.displayName,
                itemCount: result.items.length,
                hasMore: result.hasMore || false,
                ...(error && { error })
            });
        });
        // Shuffle merged results to mix sources
        const shuffledItems = shuffleArray(mergedItems);
        return {
            items: shuffledItems,
            totalCount: mergedItems.length,
            hasMore: sourceResults.some(s => s.hasMore),
            sourceResults
        };
    }, [resolvedAdaptors.audioAdaptors]);
    // Text templates across all text adaptors
    const getTextTemplates = useCallback(async (config) => {
        const activeAdaptors = resolvedAdaptors.textAdaptors;
        if (activeAdaptors.length === 0) {
            return {
                items: [],
                totalCount: 0,
                hasMore: false,
                sourceResults: []
            };
        }
        // Execute all adaptor template fetches in parallel
        const templatePromises = activeAdaptors.map(async (adaptor) => {
            try {
                const result = await adaptor.getTemplates(config);
                return {
                    adaptor,
                    result,
                    error: null
                };
            }
            catch (error) {
                console.error(`Error fetching text templates from ${adaptor.name}:`, error);
                return {
                    adaptor,
                    result: { items: [], totalCount: 0 },
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        const templateResults = await Promise.all(templatePromises);
        // Merge and attribute results
        const mergedItems = [];
        const sourceResults = [];
        templateResults.forEach(({ adaptor, result, error }) => {
            // Add source attribution to each item
            const attributedItems = result.items.map(item => ({
                ...item,
                _source: adaptor.name,
                _sourceDisplayName: adaptor.displayName
            }));
            mergedItems.push(...attributedItems);
            sourceResults.push({
                adaptorName: adaptor.name,
                adaptorDisplayName: adaptor.displayName,
                itemCount: result.items.length,
                hasMore: false, // Text templates typically don't paginate
                ...(error && { error })
            });
        });
        // Return items in original order (no shuffling for text templates)
        return {
            items: mergedItems,
            totalCount: mergedItems.length,
            hasMore: false, // Text templates typically don't paginate
            sourceResults
        };
    }, [resolvedAdaptors.textAdaptors]);
    const getStickerTemplates = useCallback(async () => {
        // TODO: Implement in stickers step
        return { items: [], totalCount: 0, hasMore: false, sourceResults: [] };
    }, []);
    // Animation templates across all animation adaptors
    const getAnimationTemplates = useCallback(async (config) => {
        const activeAdaptors = resolvedAdaptors.animationAdaptors;
        if (activeAdaptors.length === 0) {
            return {
                items: [],
                totalCount: 0,
                hasMore: false,
                sourceResults: []
            };
        }
        // Execute all adaptor template fetches in parallel
        const templatePromises = activeAdaptors.map(async (adaptor) => {
            try {
                const result = await adaptor.getTemplates(config);
                return {
                    adaptor,
                    result,
                    error: null
                };
            }
            catch (error) {
                console.error(`Error fetching animation templates from ${adaptor.name}:`, error);
                return {
                    adaptor,
                    result: { items: [], totalCount: 0 },
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        const templateResults = await Promise.all(templatePromises);
        // Merge and attribute results
        const mergedItems = [];
        const sourceResults = [];
        templateResults.forEach(({ adaptor, result, error }) => {
            // Add source attribution to each item
            const attributedItems = result.items.map(item => ({
                ...item,
                _source: adaptor.name,
                _sourceDisplayName: adaptor.displayName
            }));
            mergedItems.push(...attributedItems);
            sourceResults.push({
                adaptorName: adaptor.name,
                adaptorDisplayName: adaptor.displayName,
                itemCount: result.items.length,
                hasMore: false, // Animation templates typically don't paginate
                ...(error && { error })
            });
        });
        // Shuffle merged results to mix sources
        const shuffledItems = shuffleArray(mergedItems);
        return {
            items: shuffledItems,
            totalCount: mergedItems.length,
            hasMore: false, // Animation templates typically don't paginate
            sourceResults
        };
    }, [resolvedAdaptors.animationAdaptors]);
    // Template overlays across all template adaptors
    const getTemplateOverlays = useCallback(async (params = {}, config) => {
        const activeAdaptors = resolvedAdaptors.templateAdaptors;
        console.log('getTemplateOverlays called with params:', params);
        console.log('Active template adaptors:', activeAdaptors);
        if (activeAdaptors.length === 0) {
            console.log('No active template adaptors found');
            return {
                items: [],
                totalCount: 0,
                hasMore: false,
                sourceResults: []
            };
        }
        // Execute all adaptor template fetches in parallel
        const templatePromises = activeAdaptors.map(async (adaptor) => {
            try {
                console.log(`Fetching templates from adaptor: ${adaptor.name}`);
                const result = await adaptor.getTemplates(params, config);
                console.log(`Result from ${adaptor.name}:`, result);
                return {
                    adaptor,
                    result,
                    error: null
                };
            }
            catch (error) {
                console.error(`Error fetching templates from ${adaptor.name}:`, error);
                return {
                    adaptor,
                    result: { items: [], totalCount: 0, hasMore: false },
                    error: error instanceof Error ? error.message : 'Unknown error'
                };
            }
        });
        const templateResults = await Promise.all(templatePromises);
        console.log('All template results:', templateResults);
        // Merge and attribute results
        const mergedItems = [];
        const sourceResults = [];
        templateResults.forEach(({ adaptor, result, error }) => {
            // Add source attribution to each item
            const attributedItems = result.items.map(item => ({
                ...item,
                _source: adaptor.name,
                _sourceDisplayName: adaptor.displayName
            }));
            mergedItems.push(...attributedItems);
            sourceResults.push({
                adaptorName: adaptor.name,
                adaptorDisplayName: adaptor.displayName,
                itemCount: result.items.length,
                hasMore: result.hasMore || false,
                ...(error && { error })
            });
        });
        // Shuffle merged results to mix sources
        const shuffledItems = shuffleArray(mergedItems);
        console.log('Final merged items:', shuffledItems);
        return {
            items: shuffledItems,
            totalCount: mergedItems.length,
            hasMore: sourceResults.some(s => s.hasMore),
            sourceResults
        };
    }, [resolvedAdaptors.templateAdaptors]);
    const contextValue = useMemo(() => ({
        videoAdaptors: resolvedAdaptors.videoAdaptors,
        imageAdaptors: resolvedAdaptors.imageAdaptors,
        audioAdaptors: resolvedAdaptors.audioAdaptors,
        textAdaptors: resolvedAdaptors.textAdaptors,
        stickerAdaptors: resolvedAdaptors.stickerAdaptors,
        templateAdaptors: resolvedAdaptors.templateAdaptors,
        animationAdaptors: resolvedAdaptors.animationAdaptors,
        searchVideos,
        searchImages,
        searchAudio,
        getTextTemplates,
        getStickerTemplates,
        getTemplateOverlays,
        getAnimationTemplates,
    }), [resolvedAdaptors, searchVideos, searchImages, searchAudio, getTextTemplates, getStickerTemplates, getTemplateOverlays, getAnimationTemplates]);
    return (_jsx(MediaAdaptorContext.Provider, { value: contextValue, children: children }));
};
export const useMediaAdaptors = () => {
    const context = useContext(MediaAdaptorContext);
    if (!context) {
        throw new Error('useMediaAdaptors must be used within MediaAdaptorProvider');
    }
    return context;
};
