import { useState } from "react";
import { useEditorContext } from "../contexts/editor-context";
/**
 * Hook for managing image replacement functionality
 * Handles replacing image sources while preserving overlay properties
 */
export const useImageReplacement = () => {
    const [isReplaceMode, setIsReplaceMode] = useState(false);
    const { changeOverlay } = useEditorContext();
    /**
     * Replace an image overlay's source while preserving all other properties
     */
    const replaceImage = async (currentOverlay, newImage, onComplete) => {
        const imageOverlay = currentOverlay;
        // Get the best quality image source
        const imageSrc = newImage.src['original'] ||
            newImage.src['large'] ||
            newImage.src['medium'] ||
            newImage.src['small'] || '';
        // Create updated overlay with new image source
        const updatedOverlay = {
            ...imageOverlay,
            src: imageSrc,
        };
        // Update the overlay in editor context
        changeOverlay(updatedOverlay.id, () => updatedOverlay);
        // Call completion callback
        onComplete(updatedOverlay);
        // Exit replace mode
        setIsReplaceMode(false);
    };
    /**
     * Initiate replace mode
     */
    const startReplaceMode = () => {
        setIsReplaceMode(true);
    };
    /**
     * Cancel replace mode
     */
    const cancelReplaceMode = () => {
        setIsReplaceMode(false);
    };
    return {
        isReplaceMode,
        startReplaceMode,
        cancelReplaceMode,
        replaceImage,
    };
};
