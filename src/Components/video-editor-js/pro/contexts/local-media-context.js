import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState, useEffect, useCallback, } from "react";
import { getUserId } from "../utils/general/user-id";
import { getUserMediaItems, deleteMediaItem as deleteFromIndexDB, clearUserMedia, } from "../utils/general/indexdb";
import { uploadMediaFile, deleteMediaFile } from "../utils/general/media-upload";
const LocalMediaContext = createContext(undefined);
/**
 * LocalMediaProvider Component
 *
 * Provides context for managing local media files uploaded by the user.
 * Handles:
 * - Storing and retrieving local media files from IndexedDB and server
 * - Adding new media files
 * - Removing media files
 * - Persisting media files between sessions
 */
export const LocalMediaProvider = ({ children, }) => {
    const [localMediaFiles, setLocalMediaFiles] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [userId] = useState(() => getUserId());
    const sanitizePath = useCallback((path = "") => {
        if (!path) return "";
        let cleanPath = String(path);
        
        // CRITICAL: Preserve external URLs unchanged
        if (cleanPath.startsWith("http://") || 
            cleanPath.startsWith("https://") || 
            cleanPath.startsWith("blob:")) {
            console.log('[LocalMediaContext] Preserving external URL:', cleanPath);
            return cleanPath;
        }
        
        // Only clean local paths (remove serve prefix if present)
        const servePrefix = "/api/latest/local-media/serve/";
        if (cleanPath.startsWith(servePrefix)) {
            cleanPath = cleanPath.slice(servePrefix.length);
        }
        
        const absServePrefix = "http://localhost:3000/api/latest/local-media/serve/";
        if (cleanPath.startsWith(absServePrefix)) {
            cleanPath = cleanPath.slice(absServePrefix.length);
        }
        
        return cleanPath;
    }, []);
    // Skip loading from IndexedDB; keep browser storage empty and rely on runtime media
    useEffect(() => {
        setLocalMediaFiles([]);
    }, [userId]);
    /**
     * Add a new media file to the collection
     */
    const addMediaFile = useCallback(async (file) => {
        setIsLoading(true);
        try {
            // Upload file with hybrid approach (server upload with blob fallback)
            const mediaItem = await uploadMediaFile(file);
            console.log('[LocalMediaContext] Media item from upload:', {
                id: mediaItem.id,
                name: mediaItem.name,
                originalServerPath: mediaItem.serverPath,
            });
            // Convert to LocalMediaFile format
            const sanitizedPath = sanitizePath(mediaItem.serverPath);
            console.log('[LocalMediaContext] Sanitized path:', {
                original: mediaItem.serverPath,
                sanitized: sanitizedPath,
            });
            const newMediaFile = {
                id: mediaItem.id,
                name: mediaItem.name,
                type: mediaItem.type,
                path: sanitizedPath,
                size: mediaItem.size,
                lastModified: mediaItem.lastModified,
                thumbnail: mediaItem.thumbnail || "",
                duration: mediaItem.duration || 0,
            };
            console.log('[LocalMediaContext] Final media file object:', newMediaFile);
            // Update state with the new media file
            setLocalMediaFiles((prev) => {
                // Check if file with same ID already exists
                const exists = prev.some((item) => item.id === newMediaFile.id);
                if (exists) {
                    // Replace existing file
                    return prev.map((item) => item.id === newMediaFile.id ? newMediaFile : item);
                }
                // Add new file
                return [...prev, newMediaFile];
            });
            return newMediaFile;
        }
        catch (error) {
            console.error("Error adding media file:", error);
            throw error;
        }
        finally {
            setIsLoading(false);
        }
    }, []);
    /**
     * Remove a media file by ID
     */
    const removeMediaFile = useCallback(async (id) => {
        try {
            const fileToRemove = localMediaFiles.find((file) => file.id === id);
            if (fileToRemove) {
                // Delete from server
                await deleteMediaFile(userId, fileToRemove.path);
                // Delete from IndexedDB
                await deleteFromIndexDB(id);
                // Update state
                setLocalMediaFiles((prev) => prev.filter((file) => file.id !== id));
            }
        }
        catch (error) {
            console.error("Error removing media file:", error);
        }
    }, [localMediaFiles, userId]);
    /**
     * Clear all media files
     */
    const clearMediaFiles = useCallback(async () => {
        try {
            // Delete all files from server
            for (const file of localMediaFiles) {
                await deleteMediaFile(userId, file.path);
            }
            // Clear IndexedDB
            await clearUserMedia(userId);
            // Update state
            setLocalMediaFiles([]);
        }
        catch (error) {
            console.error("Error clearing media files:", error);
        }
    }, [localMediaFiles, userId]);
    const value = {
        localMediaFiles,
        addMediaFile,
        removeMediaFile,
        clearMediaFiles,
        isLoading,
    };
    return (_jsx(LocalMediaContext.Provider, { value: value, children: children }));
};
/**
 * Hook to use the local media context
 */
export const useLocalMedia = () => {
    const context = useContext(LocalMediaContext);
    if (context === undefined) {
        throw new Error("useLocalMedia must be used within a LocalMediaProvider");
    }
    return context;
};
