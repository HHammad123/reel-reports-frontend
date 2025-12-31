import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState, useRef, useMemo, useCallback, useEffect } from "react";
import { useLocalMedia } from "../../../contexts/local-media-context";
import { formatBytes, formatDuration } from "../../../utils/general/format-utils";
import { Button } from "../../ui/button";
import { Loader2, Upload, Trash2, Music, X } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, } from "../../ui/dialog";
import { UnifiedTabs } from "../shared/unified-tabs";
import { setCurrentNewItemDragData, setCurrentNewItemDragType } from "../../advanced-timeline/hooks/use-new-item-drag";
import { getUserId } from "../../../utils/general/user-id";
/**
 * User Media Gallery Component
 *
 * Displays the user's uploaded media files and provides functionality to:
 * - Upload new media files
 * - Filter media by type (image, video, audio)
 * - Preview media files
 * - Delete media files
 * - Add media to the timeline
 */
export function LocalMediaGallery({ onSelectMedia, sessionMedia = [], onClearAll, aspectRatio = '16:9' }) {
    const { localMediaFiles, addMediaFile, removeMediaFile, isLoading, generatedImages, generatedVideos, isLoadingGeneratedMedia } = useLocalMedia();
    
    // Normalize aspect ratio helper function
    const normalizeAspectRatio = useCallback((ratio) => {
        if (!ratio || typeof ratio !== 'string') return '16:9';
        // Normalize common separators: space, underscore, "x", "/", ":"
        const cleaned = ratio.replace(/\s+/g, '').replace(/_/g, ':');
        const match = cleaned.match(/(\d+(?:\.\d+)?)[:/xX](\d+(?:\.\d+)?)/);
        if (match) {
            const w = Number(match[1]);
            const h = Number(match[2]);
            if (w > 0 && h > 0) return `${w}:${h}`;
        }
        const lower = cleaned.toLowerCase();
        if (lower === '9:16' || lower === '9x16') return '9:16';
        if (lower === '16:9' || lower === '16x9') return '16:9';
        return '16:9';
    }, []);
    
    // Normalize session media into file-like objects
    // Videos from session data should appear in Videos tab (type: 'video')
    // Images from session data should appear in Images tab (type: 'image')
    const normalizedSessionMedia = useMemo(() => {
        const base = Array.isArray(sessionMedia) ? sessionMedia : [];
        return base.map((m, idx) => {
            const path = m.path || m.url || m.src || "";
            // Preserve the type from session media (should be 'video', 'image', or 'audio')
            // This ensures videos appear in Videos tab, images in Images tab, etc.
            const mediaType = m.type || "video";
            return ({
                id: m.id || `session-${idx}`,
                name: m.title || m.name || `Session ${mediaType === 'video' ? 'Video' : mediaType === 'image' ? 'Image' : 'Media'} ${idx + 1}`,
                path,
                type: mediaType, // Preserve type so videos go to Videos tab, images to Images tab
                duration: m.duration || m.mediaSrcDuration || m.length || 10,
                size: m.size || 0,
                thumbnail: m.thumbnail || m.poster || m.url || "",
                _session: true,
            });
        });
    }, [sessionMedia]);
    const [activeTab, setActiveTab] = useState("upload");
    // Note: Removed auto-switch to video tab to allow users to access upload section
    const [selectedFile, setSelectedFile] = useState(null);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [uploadError, setUploadError] = useState(null);
    const fileInputRef = useRef(null);
    // Create source results for the tabs - memoized to prevent recalculation
    // Include generated images in the allMediaFiles for images tab
    const allMediaFiles = useMemo(() => {
        const baseFiles = [...normalizedSessionMedia, ...localMediaFiles];
        // Add generated images only to images (when filtering by type)
        return baseFiles;
    }, [normalizedSessionMedia, localMediaFiles]);
    
    // Get all images including generated ones for the Images tab count
    const allImagesForTab = useMemo(() => {
        const regularImages = allMediaFiles.filter(file => file.type === "image");
        return [...regularImages, ...generatedImages];
    }, [allMediaFiles, generatedImages]);
    
    const sourceResults = useMemo(() => [
        {
            adaptorName: "upload",
            adaptorDisplayName: "Upload",
            itemCount: 0, // Upload tab doesn't need a count
        },
        {
            adaptorName: "image",
            adaptorDisplayName: "Images",
            itemCount: allImagesForTab.length,
        },
        {
            adaptorName: "video",
            adaptorDisplayName: "Videos",
            itemCount: allMediaFiles.filter(file => file.type === "video").length + generatedVideos.length,
        },
        {
            adaptorName: "audio",
            adaptorDisplayName: "Audio",
            itemCount: allMediaFiles.filter(file => file.type === "audio").length,
        },
    ], [allMediaFiles, allImagesForTab, generatedVideos]);
    // Filter media files based on active tab and aspect ratio - memoized to prevent recalculation
    // Session media should only appear in Videos and Images tabs, not in Upload tab
    const filteredMedia = useMemo(() => {
        // Don't show any media files in the Upload tab
        if (activeTab === "upload") {
            return [];
        }
        // For images tab, include generated images filtered by aspect ratio
        if (activeTab === "image") {
            const normalizedCurrentAspect = normalizeAspectRatio(aspectRatio);
            const regularImages = allMediaFiles.filter((file) => file.type === "image");
            
            // Filter generated images by current aspect ratio
            const filteredGeneratedImages = generatedImages.filter((img) => {
                const imgAspect = normalizeAspectRatio(img._aspectRatio || '16:9');
                return imgAspect === normalizedCurrentAspect;
            });
            
            // For regular images (session/uploaded), show all (or filter by aspect if they have aspect ratio info)
            // For now, show all regular images since they might not have aspect ratio metadata
            return [...regularImages, ...filteredGeneratedImages];
        }
        // For videos tab, include generated videos filtered by aspect ratio
        if (activeTab === "video") {
            const normalizedCurrentAspect = normalizeAspectRatio(aspectRatio);
            const regularVideos = allMediaFiles.filter((file) => file.type === "video");
            
            // Filter generated videos by current aspect ratio
            const filteredGeneratedVideos = generatedVideos.filter((vid) => {
                const vidAspect = normalizeAspectRatio(vid._aspectRatio || '16:9');
                return vidAspect === normalizedCurrentAspect;
            });
            
            // For regular videos (session/uploaded), show all
            return [...regularVideos, ...filteredGeneratedVideos];
        }
        // Filter by type for other tabs (audio)
        return allMediaFiles.filter((file) => {
            if (activeTab === "all")
                return true;
            return file.type === activeTab;
        });
    }, [allMediaFiles, activeTab, generatedImages, generatedVideos, aspectRatio, normalizeAspectRatio]);
    // Handle file upload - memoized to prevent recreation
    const handleFileUpload = useCallback(async (event) => {
        const files = event.target.files;
        if (files && files.length > 0) {
            try {
                setUploadError(null);
                await addMediaFile(files[0]);
                // Reset the input value to allow uploading the same file again
                event.target.value = "";
            }
            catch (error) {
                console.error("Error uploading file:", error);
                setUploadError("Failed to upload file. Please try again.");
                event.target.value = "";
            }
        }
    }, [addMediaFile]);
    // Handle upload button click - memoized to prevent recreation
    const handleUploadClick = useCallback(() => {
        var _a;
        (_a = fileInputRef.current) === null || _a === void 0 ? void 0 : _a.click();
    }, []);
    // Handle media selection - memoized to prevent recreation
    const handleMediaSelect = useCallback((file) => {
        const rawPath = file.path || file.url || file.src || "";
        if (rawPath) {
            console.log('[LocalMediaGallery] Playing URL:', rawPath);
        }
        
        // Automatically add video to timeline when clicked
        if (file.type === "video" && onSelectMedia) {
            console.log('[LocalMediaGallery] Auto-adding video to timeline:', rawPath);
            onSelectMedia(file);
            // Still show preview dialog for user feedback
            setSelectedFile(file);
            setPreviewOpen(true);
        } else {
            // For images and audio, just show preview
            setSelectedFile(file);
            setPreviewOpen(true);
        }
    }, [onSelectMedia]);
    // Add media to timeline - memoized to prevent recreation
    const handleAddToTimeline = useCallback(() => {
        if (selectedFile && onSelectMedia) {
            onSelectMedia(selectedFile);
            setPreviewOpen(false);
        }
    }, [selectedFile, onSelectMedia]);
    // Handle drag start for timeline integration
    const handleDragStart = useCallback((file) => (e) => {
        const fileDuration = file.duration;
        const defaultDuration = file.type === "video" ? 5 : file.type === "audio" ? 5 : 5;
        const duration = typeof fileDuration === 'number' && fileDuration > 0
            ? fileDuration
            : defaultDuration;
        const timelineType = file.type;
        // Get raw path - check all possible locations
        let rawPath = file.path || file.url || file.src || "";
        
        // CRITICAL: Check if rawPath is already double-prefixed
        if (rawPath.includes('/api/latest/local-media/serve/http') || rawPath.includes('/api/latest/local-media/serve/https')) {
            console.warn('[LocalMediaGallery] WARNING: Double-prefixed URL detected!', rawPath);
            // Extract the actual URL
            const match = rawPath.match(/\/api\/latest\/local-media\/serve\/(https?:\/\/.+)/);
            if (match && match[1]) {
                rawPath = match[1];
                console.log('[LocalMediaGallery] Fixed double-prefixed URL:', rawPath);
            }
        }
        
        console.log('═══ DRAG START DEBUG ═══');
        console.log('File object:', file);
        console.log('Raw path from file:', rawPath);
        console.log('Starts with http:', rawPath.startsWith('http://'));
        console.log('Starts with https:', rawPath.startsWith('https://'));
        console.log('Starts with blob:', rawPath.startsWith('blob:'));
        
        let mediaSrc;
        if (!rawPath) {
            console.error('[LocalMediaGallery] No path for drag');
            return;
        } else if (rawPath.startsWith("http://") || rawPath.startsWith("https://") || rawPath.startsWith("blob:")) {
            // External URLs - use directly WITHOUT any prefix
            mediaSrc = rawPath;
            console.log('[LocalMediaGallery] ✓ Using external URL directly (no prefix):', mediaSrc);
        } else {
            // Local paths only - add prefix
            // Remove leading slash if present to avoid double slashes
            const cleanPath = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
            mediaSrc = `/api/latest/local-media/serve/${cleanPath}`;
            console.log('[LocalMediaGallery] ✓ Using local path with prefix:', mediaSrc);
        }
        
        console.log('Final drag mediaSrc:', mediaSrc);
        console.log('═══════════════════════');
        
        // Create enriched file data with proper src for timeline
        const enrichedFileData = {
            ...file,
            src: mediaSrc,
            file: mediaSrc,
            path: mediaSrc, // Update path to the correct mediaSrc
            title: file.name,
            thumbnail: file.thumbnail || mediaSrc,
            _isLocalMedia: true,
        };
        // Set drag data for timeline
        const dragData = {
            isNewItem: true,
            type: timelineType,
            label: file.name,
            duration,
            data: enrichedFileData, // Pass enriched file data
        };
        e.dataTransfer.effectAllowed = 'move';
        e.dataTransfer.setData("application/json", JSON.stringify(dragData));
        // Set global drag state for timeline
        setCurrentNewItemDragType(dragData.type);
        setCurrentNewItemDragData(dragData);
        // Create a custom drag image (smaller thumbnail)
        const thumbnail = e.currentTarget.querySelector('img');
        if (thumbnail) {
            // Create a smaller version of the thumbnail for dragging
            const dragPreview = document.createElement('div');
            dragPreview.style.position = 'absolute';
            dragPreview.style.top = '-9999px';
            dragPreview.style.width = '60px';
            dragPreview.style.height = '40px';
            dragPreview.style.overflow = 'hidden';
            dragPreview.style.borderRadius = '4px';
            dragPreview.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            dragPreview.style.cursor = 'none';
            const clonedImg = thumbnail.cloneNode(true);
            clonedImg.style.width = '80px';
            clonedImg.style.height = '60px';
            clonedImg.style.objectFit = 'cover';
            dragPreview.appendChild(clonedImg);
            document.body.appendChild(dragPreview);
            e.dataTransfer.setDragImage(dragPreview, 40, 30);
            // Clean up the preview element after drag starts
            setTimeout(() => {
                dragPreview.remove();
            }, 0);
        }
        else if (file.type === "audio") {
            // For audio files without thumbnail, create a simple preview
            const dragPreview = document.createElement('div');
            dragPreview.style.position = 'absolute';
            dragPreview.style.top = '-9999px';
            dragPreview.style.width = '60px';
            dragPreview.style.height = '40px';
            dragPreview.style.backgroundColor = 'rgba(0,0,0,0.8)';
            dragPreview.style.borderRadius = '4px';
            dragPreview.style.boxShadow = '0 4px 12px rgba(0,0,0,0.3)';
            dragPreview.style.display = 'flex';
            dragPreview.style.alignItems = 'center';
            dragPreview.style.justifyContent = 'center';
            dragPreview.innerHTML = '🎵';
            dragPreview.style.fontSize = '20px';
            document.body.appendChild(dragPreview);
            e.dataTransfer.setDragImage(dragPreview, 30, 20);
            setTimeout(() => {
                dragPreview.remove();
            }, 0);
        }
    }, []);
    const handleDragEnd = useCallback(() => {
        // Clear drag state
        setCurrentNewItemDragType(null);
        setCurrentNewItemDragData(null);
    }, []);
    // Render preview content based on file type
    const renderPreviewContent = () => {
        if (!selectedFile)
            return null;
        const commonClasses = "max-h-[50vh] w-full object-contain rounded-lg shadow-sm";
        const displayPath = selectedFile.path || selectedFile.url || selectedFile.src || "";
        if (!displayPath) {
            return (_jsx("div", { className: "text-sm text-gray-500", children: "No source available for preview." }));
        }
        switch (selectedFile.type) {
            case "image":
                return (_jsx("div", { className: "relative bg-white rounded-lg p-2 flex justify-center", children: _jsx("img", { src: displayPath, alt: selectedFile.name, className: `${commonClasses} object-contain` }) }));
            case "video":
                return (_jsx("div", { className: "relative bg-white rounded-lg p-2", children: _jsx("video", { src: displayPath, controls: true, className: commonClasses, controlsList: "nodownload", playsInline: true, onError: (e) => console.error('[LocalMediaGallery] Video preview error', e) }) }));
            case "audio":
                return (_jsxs("div", { className: "flex flex-col items-center space-y-3 p-4 bg-white rounded-lg", children: [_jsx("div", { className: "w-12 h-12 bg-blue-50 rounded-full flex items-center justify-center", children: _jsx(Music, { className: "w-6 h-6 text-blue-600" }) }), _jsx("audio", { src: selectedFile.path.startsWith("http")
                                ? selectedFile.path
                                : `${window.location.origin}${displayPath}`, controls: true, className: "w-[280px] max-w-full", controlsList: "nodownload", onError: (e) => console.error('[LocalMediaGallery] Audio preview error', e) })] }));
            default:
                return (_jsx("div", { className: "text-sm text-gray-500", children: "Unsupported file type" }));
        }
    };
    // Render media item - memoized to prevent recreation
    const renderMediaItem = useCallback((file) => {
        const rawPath = file.path || file.url || file.src || "";
        const resolvedThumb = file.thumbnail || rawPath;
        const videoUrl = file.type === "video" ? (file.path || file.url || file.src || "") : "";
        return (_jsxs("div", { className: "relative group/item border border-gray-200 rounded-md overflow-hidden cursor-pointer \n          hover:border-gray-300 transition-all \n          bg-white shadow-sm hover:shadow-md", onClick: () => handleMediaSelect(file), draggable: true, onDragStart: handleDragStart(file), onDragEnd: handleDragEnd, children: [_jsxs("div", { className: "aspect-video relative", children: [file.type === "image" && (_jsx("img", { src: resolvedThumb, alt: file.name, className: "absolute inset-0 w-full h-full object-cover bg-gray-50", draggable: false })), file.type === "video" && (_jsxs(_Fragment, { children: [videoUrl ? (_jsx("video", { src: videoUrl, className: "absolute inset-0 w-full h-full object-cover bg-gray-50", muted: true, playsInline: true, preload: "metadata", onLoadedMetadata: (e) => {
                            // Ensure video is loaded and displayed
                            e.currentTarget.currentTime = 0.1; // Seek to 0.1s to show a frame
                        }, draggable: false })) : (_jsx("img", { src: resolvedThumb, alt: file.name, className: "absolute inset-0 w-full h-full object-cover bg-gray-50", draggable: false })), _jsx("div", { className: "absolute bottom-1.5 right-1.5 bg-black/75 text-white text-xs px-1.5 py-0.5 rounded-md", children: formatDuration(file.duration) })] })), file.type === "audio" && (_jsx("div", { className: "w-full h-full flex items-center justify-center bg-gray-50", children: _jsx(Music, { className: "w-10 h-10 text-gray-400" }) }))] }), _jsxs("div", { className: "p-2.5 bg-white", children: [_jsx("p", { className: "text-sm font-extralight truncate text-gray-800", children: file.name }), _jsx("p", { className: "text-xs text-gray-500 mt-0.5", children: formatBytes(file.size) })] }), _jsx("button", { className: "absolute top-2 right-2 bg-red-500\n            text-white p-1.5 rounded-full opacity-0 group-hover/item:opacity-100 transition-all duration-200 \n            shadow-sm hover:shadow-md transform hover:scale-105", onClick: (e) => {
                        e.stopPropagation();
                        if (!file._session) {
                        removeMediaFile(file.id);
                        }
                    }, title: "Delete media", children: _jsx(Trash2, { className: "w-3.5 h-3.5" }) })] }, file.id));
    }, [handleMediaSelect, removeMediaFile, handleDragStart, handleDragEnd]);
    return (_jsxs("div", { className: "h-full flex flex-col bg-white", children: [_jsx("h2", { className: "text-sm font-extralight text-gray-800 mb-4", children: "Saved Uploads" }), _jsx(UnifiedTabs, { sourceResults: sourceResults, activeTab: activeTab, onTabChange: setActiveTab, className: "mb-4", showAllTab: false }), uploadError && (_jsx("div", { className: "bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded mb-4", children: uploadError })), _jsxs("div", { className: "flex-1 flex flex-col overflow-hidden", children: activeTab === "upload" ? (_jsxs("div", { className: "flex flex-col gap-4 p-4", children: [_jsxs("div", { className: "flex items-center gap-2", children: [onClearAll && (_jsx(Button, { variant: "outline", size: "sm", className: "gap-1 text-gray-700 border-gray-300 hover:bg-gray-50 hover:text-gray-900 bg-white", onClick: onClearAll, children: [_jsx(X, { className: "w-4 h-4" }), "Clear All"] })), _jsxs(Button, { variant: "default", size: "sm", className: "gap-1 bg-blue-600 hover:bg-blue-700 text-white border-0", onClick: handleUploadClick, disabled: isLoading, children: [isLoading ? (_jsx(Loader2, { className: "w-4 h-4 animate-spin" })) : (_jsx(Upload, { className: "w-4 h-4" })), "Upload"] }), _jsx("input", { ref: fileInputRef, id: "file-upload", type: "file", className: "hidden", onChange: handleFileUpload, accept: "image/*,video/*,audio/*", disabled: isLoading, multiple: true })] }), _jsxs("div", { className: "flex flex-col items-center justify-center py-12 text-gray-500 text-center", children: [_jsx(Upload, { className: "h-12 w-12 mb-4 text-gray-400" }), _jsx("p", { className: "text-sm font-medium mb-2", children: "Upload Media Files" }), _jsx("p", { className: "text-xs text-gray-400 mb-4", children: "Upload images, videos, or audio files to use in your video" }), _jsx(Button, { variant: "default", size: "sm", onClick: handleUploadClick, disabled: isLoading, className: "bg-blue-600 hover:bg-blue-700 text-white", children: isLoading ? (_jsxs(_Fragment, { children: [_jsx(Loader2, { className: "w-4 h-4 animate-spin mr-2" }), "Uploading..."] })) : (_jsxs(_Fragment, { children: [_jsx(Upload, { className: "w-4 h-4 mr-2" }), "Select Files"] })) })] })] })) : (_jsx("div", { className: "flex-1 overflow-y-auto", children: (isLoading || isLoadingGeneratedMedia) ? (_jsxs("div", { className: "h-full flex flex-col items-center justify-center text-center space-y-4 text-sm text-gray-500", children: [_jsx(Loader2, { className: "w-5 h-5 animate-spin" }), _jsx("p", { children: "Loading media files..." })] })) : filteredMedia.length === 0 ? (_jsxs("div", { className: "h-full flex flex-col font-extralight items-center justify-center py-8 text-gray-500 text-center", children: [_jsx(Upload, { className: "h-8 w-8 mb-2" }), _jsx("p", { className: "text-sm text-center", children: "No media files" }), _jsx("p", { className: "text-xs text-center mt-1", children: "Switch to Upload tab to add files" })] })) : (_jsx("div", { className: "flex flex-col gap-2 p-2", children: filteredMedia.map(renderMediaItem) })) })) }), _jsx(Dialog, { open: previewOpen, onOpenChange: setPreviewOpen, children: _jsxs(DialogContent, { className: "max-w-2xl bg-white", children: [_jsxs(DialogHeader, { children: [_jsx(DialogTitle, { className: "text-gray-800", children: selectedFile === null || selectedFile === void 0 ? void 0 : selectedFile.name }), _jsxs(DialogDescription, { className: "text-gray-600", children: [selectedFile === null || selectedFile === void 0 ? void 0 : selectedFile.type, " \u2022 ", formatBytes(selectedFile === null || selectedFile === void 0 ? void 0 : selectedFile.size)] })] }), _jsx("div", { className: "flex justify-center", children: renderPreviewContent() }), _jsx("div", { className: "flex justify-end mt-4", children: _jsx(Button, { variant: "default", size: "sm", className: "bg-blue-600 hover:bg-blue-700 text-white", onClick: handleAddToTimeline, children: "Add to Timeline" }) })] }) })] }));
}
