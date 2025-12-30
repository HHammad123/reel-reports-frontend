import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, useRef, useCallback } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { useAspectRatio } from "../../../hooks/use-aspect-ratio";
import { OverlayType } from "../../../types";
import { ImageDetails } from "./image-details";
import { useMediaAdaptors } from "../../../contexts/media-adaptor-context";
import { MediaOverlayPanel } from "../shared/media-overlay-panel";
import { calculateIntelligentAssetSize, getAssetDimensions } from "../../../utils/asset-sizing";
import { useImageReplacement } from "../../../hooks/use-image-replacement";
import { DEFAULT_IMAGE_DURATION_FRAMES, IMAGE_DURATION_PERCENTAGE } from "../../../../constants";
/**
 * ImageOverlayPanel Component
 *
 * A panel that provides functionality to:
 * 1. Search and select images from all configured image adaptors
 * 2. Add selected images as overlays to the editor
 * 3. Modify existing image overlay properties
 * 4. Filter images by source using tabs
 *
 * The panel has two main states:
 * - Search/Selection mode: Shows a search bar, source tabs, and masonry grid of images
 * - Edit mode: Shows image details editor when an existing image overlay is selected
 */
export const ImageOverlayPanel = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [images, setImages] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [sourceResults, setSourceResults] = useState([]);
    const { searchImages, imageAdaptors } = useMediaAdaptors();
    const { isReplaceMode, startReplaceMode, cancelReplaceMode, replaceImage } = useImageReplacement();
    const { overlays, selectedOverlayId, changeOverlay, currentFrame, setOverlays, setSelectedOverlayId, durationInFrames, } = useEditorContext();
    const { addAtPlayhead } = useTimelinePositioning();
    const { getAspectRatioDimensions } = useAspectRatio();
    const [localOverlay, setLocalOverlay] = useState(null);
    const hasLoadedInitialImages = useRef(false);
    
    // Track previous selectedOverlayId to prevent unnecessary updates
    const prevSelectedIdRef = useRef(selectedOverlayId);
    const prevOverlayIdRef = useRef(null);
    // Store overlays in a ref to access latest without causing re-renders
    const overlaysRef = useRef(overlays);
    overlaysRef.current = overlays;
    
    // Load session images automatically when component mounts
    useEffect(() => {
        const loadSessionImages = async () => {
            // Only load once on mount
            if (hasLoadedInitialImages.current) return;
            
            // Check if we have session images adaptor
            const sessionImagesAdaptor = imageAdaptors.find(adaptor => adaptor.name === 'session-images');
            if (!sessionImagesAdaptor) {
                hasLoadedInitialImages.current = true;
                return;
            }
            
            setIsLoading(true);
            try {
                // Load session images with empty query to get all images
                const results = await searchImages({ query: '', page: 1, perPage: 100 });
                if (results.items && results.items.length > 0) {
                    setImages(results.items);
                    setSourceResults(results.sourceResults || []);
                }
                hasLoadedInitialImages.current = true;
            } catch (error) {
                console.error('Failed to load session images:', error);
                hasLoadedInitialImages.current = true;
            } finally {
                setIsLoading(false);
            }
        };
        
        loadSessionImages();
    }, [searchImages, imageAdaptors]);
    
    // Reload session images when search query is cleared
    useEffect(() => {
        // Only reload if we've already loaded initial images and search is empty
        if (!hasLoadedInitialImages.current || searchQuery.trim() !== '') return;
        
        const reloadSessionImages = async () => {
            const sessionImagesAdaptor = imageAdaptors.find(adaptor => adaptor.name === 'session-images');
            if (!sessionImagesAdaptor) return;
            
            setIsLoading(true);
            try {
                const results = await searchImages({ query: '', page: 1, perPage: 100 });
                setImages(results.items);
                setSourceResults(results.sourceResults || []);
            } catch (error) {
                console.error('Failed to reload session images:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        // Debounce to avoid too many reloads
        const timeoutId = setTimeout(reloadSessionImages, 300);
        return () => clearTimeout(timeoutId);
    }, [searchQuery, searchImages, imageAdaptors]);
    
    // CRITICAL FIX: Only update when selectedOverlayId changes, not when overlays array is recreated
    // This prevents infinite loops when handleUpdateOverlay updates the overlays array
    useEffect(() => {
        // Only proceed if selectedOverlayId actually changed
        if (selectedOverlayId === prevSelectedIdRef.current) {
            // selectedOverlayId didn't change, skip update to prevent infinite loop
            // The localOverlay will be updated by handleUpdateOverlay when user makes changes
            return;
        }
        
        // selectedOverlayId changed - update
        prevSelectedIdRef.current = selectedOverlayId;
        
        if (selectedOverlayId === null) {
            setLocalOverlay(null);
            prevOverlayIdRef.current = null;
            return;
        }
        
        // Use ref to get latest overlays without adding it as a dependency
        const selectedOverlay = overlaysRef.current.find((overlay) => overlay.id === selectedOverlayId);
        if (selectedOverlay && selectedOverlay.type === OverlayType.IMAGE) {
            // Only update if the overlay actually changed (prevent unnecessary updates)
            setLocalOverlay((prevLocalOverlay) => {
                // If we already have this overlay and it hasn't changed, don't update
                if (prevLocalOverlay && prevLocalOverlay.id === selectedOverlay.id) {
                    const prevStr = JSON.stringify(prevLocalOverlay);
                    const newStr = JSON.stringify(selectedOverlay);
                    if (prevStr === newStr) {
                        return prevLocalOverlay; // No change, return previous
                    }
                }
                return selectedOverlay;
            });
            prevOverlayIdRef.current = selectedOverlay.id;
        } else {
            setLocalOverlay(null);
            prevOverlayIdRef.current = null;
        }
    }, [selectedOverlayId]); // Only depend on selectedOverlayId, not overlays
    /**
     * Handles the image search form submission
     * Searches across all configured image adaptors
     * If query is empty, reloads session images
     */
    const handleSearch = async (e) => {
        e.preventDefault();
        
        // If search query is empty, reload session images
        if (!searchQuery.trim()) {
            const sessionImagesAdaptor = imageAdaptors.find(adaptor => adaptor.name === 'session-images');
            if (sessionImagesAdaptor) {
                setIsLoading(true);
                try {
                    const results = await searchImages({ query: '', page: 1, perPage: 100 });
                    setImages(results.items);
                    setSourceResults(results.sourceResults || []);
                } catch (error) {
                    console.error('Failed to reload session images:', error);
                } finally {
                    setIsLoading(false);
                }
            }
            return;
        }
        
        setIsLoading(true);
        try {
            const results = await searchImages({ query: searchQuery, page: 1, perPage: 50 });
            setImages(results.items);
            setSourceResults(results.sourceResults || []);
        }
        catch (error) {
            console.error('Failed to search images:', error);
            setImages([]);
            setSourceResults([]);
        }
        finally {
            setIsLoading(false);
        }
    };
    /**
     * Handles adding or replacing an image
     * @param image - The selected image to add or use as replacement
     */
    const handleAddImage = async (image) => {
        // Check if we're in replace mode
        if (isReplaceMode && localOverlay) {
            // Replace mode: Use the hook to handle replacement
            await replaceImage(localOverlay, image, (updatedOverlay) => {
                setLocalOverlay(updatedOverlay);
                // Clear search state
                setSearchQuery("");
                setImages([]);
                setSourceResults([]);
            });
        }
        else {
            // Add mode: Create new overlay
            const canvasDimensions = getAspectRatioDimensions();
            const assetDimensions = getAssetDimensions(image);
            // Use intelligent sizing if asset dimensions are available, otherwise fall back to canvas dimensions
            const { width, height } = assetDimensions
                ? calculateIntelligentAssetSize(assetDimensions, canvasDimensions)
                : canvasDimensions;
            const { from, row, updatedOverlays } = addAtPlayhead(currentFrame, overlays, 'top');
            // Create the new overlay without an ID (addOverlay will generate it)
            // Use a percentage of composition duration for smart image length when there are existing overlays,
            // otherwise default to DEFAULT_IMAGE_DURATION_FRAMES
            const smartDuration = overlays.length > 0
                ? Math.round(durationInFrames * IMAGE_DURATION_PERCENTAGE)
                : DEFAULT_IMAGE_DURATION_FRAMES;
            // Default position: CENTER (same as videos for consistency and better UX)
            const left = Math.round((canvasDimensions.width - width) / 2);
            const top = Math.round((canvasDimensions.height - height) / 2);
            const newOverlay = {
                left: left, // Default: CENTERED horizontally
                top: top, // Default: CENTERED vertically
                width,
                height,
                durationInFrames: smartDuration,
                from,
                rotation: 0,
                row,
                isDragging: false,
                type: OverlayType.IMAGE,
                src: image.src['original'] || image.src['large'] || image.src['medium'] || image.src['small'] || '',
                styles: {
                    objectFit: "contain",
                    animation: {
                        enter: "fadeIn",
                        exit: "fadeOut",
                    },
                },
            };
            // Generate ID - ensure we always get a valid numeric ID
            // Filter out undefined/null IDs and ensure we have valid numbers
            const validIds = updatedOverlays
                .map((o) => o?.id)
                .filter((id) => id != null && !isNaN(id) && typeof id === 'number');
            const newId = validIds.length > 0 
                ? Math.max(...validIds) + 1 
                : (overlays.length > 0 
                    ? Math.max(...overlays.map((o) => o?.id || 0).filter(id => !isNaN(id))) + 1 
                    : 0);
            
            // Ensure newId is a valid number
            const finalId = (isNaN(newId) || newId < 0) ? Date.now() : newId;
            
            // Update overlays with both the shifted overlays and the new overlay in a single operation
            const overlayWithId = { ...newOverlay, id: finalId };
            
            // Ensure the overlay has a valid ID before adding
            if (!overlayWithId.id || isNaN(overlayWithId.id)) {
                console.error('[ImageOverlayPanel] Overlay missing valid ID:', overlayWithId);
                overlayWithId.id = finalId; // Force set the ID
            }
            
            const finalOverlays = [...updatedOverlays, overlayWithId];
            setOverlays(finalOverlays);
            setSelectedOverlayId(overlayWithId.id);
            
            console.log('[ImageOverlayPanel] Added overlay with ID:', overlayWithId.id, 'Type:', overlayWithId.type);
        }
    };
    /**
     * Updates an existing image overlay's properties
     * @param updatedOverlay - The modified overlay object
     * Updates both local state and global editor context
     */
    const handleUpdateOverlay = useCallback((updatedOverlay) => {
        // Prevent infinite loops by checking if overlay actually changed
        if (!updatedOverlay || !updatedOverlay.id) {
            return;
        }
        
        // Use functional update to prevent unnecessary re-renders
        setLocalOverlay((prevOverlay) => {
            // Only update if the overlay actually changed
            if (prevOverlay && prevOverlay.id === updatedOverlay.id) {
                // Deep compare to avoid unnecessary updates
                const prevStr = JSON.stringify(prevOverlay);
                const newStr = JSON.stringify(updatedOverlay);
                if (prevStr === newStr) {
                    return prevOverlay; // No change, return previous to prevent update
                }
            }
            return updatedOverlay;
        });
        
        // Update global overlay state (debounced to prevent excessive updates)
        changeOverlay(updatedOverlay.id, () => updatedOverlay);
    }, [changeOverlay]);
    const handleCancelReplace = () => {
        cancelReplaceMode();
        setSearchQuery("");
        setImages([]);
        setSourceResults([]);
    };
    const getThumbnailUrl = (image) => {
        return image.src['medium'] || image.src['small'] || image.src['original'];
    };
    const getItemKey = (image) => {
        return `${image._source}-${image.id}`;
    };
    return (_jsx(MediaOverlayPanel, { searchQuery: searchQuery, onSearchQueryChange: setSearchQuery, onSearch: handleSearch, items: images, isLoading: isLoading, hasAdaptors: imageAdaptors.length > 0, sourceResults: sourceResults, onItemClick: handleAddImage, getThumbnailUrl: getThumbnailUrl, getItemKey: getItemKey, mediaType: "images", searchPlaceholder: isReplaceMode ? "Search for replacement image" : "Search images", showSourceBadge: true, isEditMode: !!localOverlay && !isReplaceMode, editComponent: localOverlay ? (_jsx(ImageDetails, { localOverlay: localOverlay, setLocalOverlay: handleUpdateOverlay, onChangeImage: startReplaceMode })) : null, isReplaceMode: isReplaceMode, onCancelReplace: handleCancelReplace, enableTimelineDrag: !isReplaceMode && !localOverlay }));
};
