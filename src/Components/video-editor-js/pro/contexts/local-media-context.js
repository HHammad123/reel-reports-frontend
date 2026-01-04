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
    const [generatedImages, setGeneratedImages] = useState([]);
    const [generatedVideos, setGeneratedVideos] = useState([]);
    const [isLoadingGeneratedMedia, setIsLoadingGeneratedMedia] = useState(false);
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
    
    // Fetch generated media (images and videos) on page load/reload
    useEffect(() => {
        const fetchGeneratedMedia = async () => {
            const token = localStorage.getItem('token') || userId;
            if (!token) {
                console.warn('[LocalMediaContext] No userId/token found, skipping generated media fetch');
                return;
            }
            
            setIsLoadingGeneratedMedia(true);
            try {
                const apiBase = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net';
                
                // Fetch generated images
                const imagesResp = await fetch(`${apiBase}/v1/users/user/${encodeURIComponent(token)}/generated-media`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                // Fetch generated base videos
                const videosResp = await fetch(`${apiBase}/v1/users/user/${encodeURIComponent(token)}/generated-base-videos`, {
                    method: 'GET',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                // Parse images response
                let imagesJson;
                if (imagesResp.ok) {
                    const imagesText = await imagesResp.text();
                    try {
                        imagesJson = JSON.parse(imagesText);
                    } catch (_) {
                        imagesJson = imagesText;
                    }
                }
                
                // Parse videos response
                let videosJson;
                if (videosResp.ok) {
                    const videosText = await videosResp.text();
                    try {
                        videosJson = JSON.parse(videosText);
                    } catch (_) {
                        videosJson = videosText;
                    }
                }
                
                // Normalize and sort generated images
                const { normalizeGeneratedMediaResponse } = await import('../../../../utils/generatedMediaUtils');
                const normalizedImages = normalizeGeneratedMediaResponse(imagesJson || {});
                const generatedImagesData = normalizedImages.generated_images || {};
                const transformedImages = [];
                
                console.log('[LocalMediaContext] Generated images structure:', generatedImagesData);
                
                Object.keys(generatedImagesData).forEach((aspectRatio) => {
                    const sessionsForRatio = generatedImagesData[aspectRatio];
                    if (typeof sessionsForRatio === 'object' && sessionsForRatio !== null && !Array.isArray(sessionsForRatio)) {
                        // Handle new structure: sessionsForRatio is an object with session names as keys
                        Object.entries(sessionsForRatio).forEach(([sessionName, images]) => {
                            if (Array.isArray(images)) {
                                images.forEach((imgUrl, idx) => {
                                    if (typeof imgUrl === 'string' && imgUrl) {
                                        transformedImages.push({
                                            id: `generated-img-${aspectRatio}-${sessionName}-${idx}`,
                                            name: `${sessionName} - Image ${idx + 1}`,
                                            path: imgUrl,
                                            url: imgUrl,
                                            src: imgUrl,
                                            type: 'image',
                                            duration: 0,
                                            size: 0,
                                            thumbnail: imgUrl,
                                            _generated: true,
                                            _aspectRatio: aspectRatio,
                                            _sessionName: sessionName,
                                        });
                                    } else if (imgUrl && typeof imgUrl === 'object') {
                                        // Handle object format
                                        const imgPath = imgUrl.image_url || imgUrl.url || imgUrl.src || '';
                                        if (imgPath) {
                                            transformedImages.push({
                                                id: imgUrl.id || `generated-img-${aspectRatio}-${sessionName}-${idx}`,
                                                name: imgUrl.name || imgUrl.title || `${sessionName} - Image ${idx + 1}`,
                                                path: imgPath,
                                                url: imgPath,
                                                src: imgPath,
                                                type: 'image',
                                                duration: 0,
                                                size: 0,
                                                thumbnail: imgPath,
                                                _generated: true,
                                                _aspectRatio: aspectRatio,
                                                _sessionName: sessionName,
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    } else if (Array.isArray(sessionsForRatio)) {
                        // Legacy format: aspectRatio directly contains array of images
                        sessionsForRatio.forEach((imgUrl, idx) => {
                            if (typeof imgUrl === 'string' && imgUrl) {
                                transformedImages.push({
                                    id: `generated-img-${aspectRatio}-${idx}`,
                                    name: `Generated Image (${aspectRatio}) ${idx + 1}`,
                                    path: imgUrl,
                                    url: imgUrl,
                                    src: imgUrl,
                                    type: 'image',
                                    duration: 0,
                                    size: 0,
                                    thumbnail: imgUrl,
                                    _generated: true,
                                    _aspectRatio: aspectRatio,
                                });
                            }
                        });
                    }
                });
                setGeneratedImages(transformedImages);
                
                // Normalize and sort generated videos
                const { normalizeGeneratedBaseVideosResponse } = await import('../../../../utils/generatedMediaUtils');
                const normalizedVideos = normalizeGeneratedBaseVideosResponse(videosJson || {});
                const generatedVideosData = normalizedVideos.base_videos || {};
                const transformedVideos = [];
                
                console.log('[LocalMediaContext] Generated videos structure:', generatedVideosData);
                
                Object.keys(generatedVideosData).forEach((aspectRatio) => {
                    const sessionsForRatio = generatedVideosData[aspectRatio];
                    if (typeof sessionsForRatio === 'object' && sessionsForRatio !== null && !Array.isArray(sessionsForRatio)) {
                        // Handle new structure: sessionsForRatio is an object with session names as keys
                        Object.entries(sessionsForRatio).forEach(([sessionName, videos]) => {
                            if (Array.isArray(videos)) {
                                videos.forEach((videoUrl, idx) => {
                                    if (typeof videoUrl === 'string' && videoUrl) {
                                        transformedVideos.push({
                                            id: `generated-vid-${aspectRatio}-${sessionName}-${idx}`,
                                            name: `${sessionName} - Video ${idx + 1}`,
                                            path: videoUrl,
                                            url: videoUrl,
                                            src: videoUrl,
                                            type: 'video',
                                            duration: 0,
                                            size: 0,
                                            thumbnail: videoUrl,
                                            _generated: true,
                                            _aspectRatio: aspectRatio,
                                            _sessionName: sessionName,
                                        });
                                    } else if (videoUrl && typeof videoUrl === 'object') {
                                        // Handle object format
                                        const videoPath = videoUrl.video_url || videoUrl.url || videoUrl.src || '';
                                        if (videoPath) {
                                            transformedVideos.push({
                                                id: videoUrl.id || `generated-vid-${aspectRatio}-${sessionName}-${idx}`,
                                                name: videoUrl.name || videoUrl.title || `${sessionName} - Video ${idx + 1}`,
                                                path: videoPath,
                                                url: videoPath,
                                                src: videoPath,
                                                type: 'video',
                                                duration: 0,
                                                size: 0,
                                                thumbnail: videoPath,
                                                _generated: true,
                                                _aspectRatio: aspectRatio,
                                                _sessionName: sessionName,
                                            });
                                        }
                                    }
                                });
                            }
                        });
                    } else if (Array.isArray(sessionsForRatio)) {
                        // Legacy format: aspectRatio directly contains array of videos
                        sessionsForRatio.forEach((videoUrl, idx) => {
                            if (typeof videoUrl === 'string' && videoUrl) {
                                transformedVideos.push({
                                    id: `generated-vid-${aspectRatio}-${idx}`,
                                    name: `Generated Video (${aspectRatio}) ${idx + 1}`,
                                    path: videoUrl,
                                    url: videoUrl,
                                    src: videoUrl,
                                    type: 'video',
                                    duration: 0,
                                    size: 0,
                                    thumbnail: videoUrl,
                                    _generated: true,
                                    _aspectRatio: aspectRatio,
                                });
                            }
                        });
                    }
                });
                setGeneratedVideos(transformedVideos);
                
                console.log('[LocalMediaContext] Fetched generated media:', {
                    images: transformedImages.length,
                    videos: transformedVideos.length
                });
            } catch (error) {
                console.error('[LocalMediaContext] Error fetching generated media:', error);
                setGeneratedImages([]);
                setGeneratedVideos([]);
            } finally {
                setIsLoadingGeneratedMedia(false);
            }
        };
        
        fetchGeneratedMedia();
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
        generatedImages,
        generatedVideos,
        isLoadingGeneratedMedia,
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
