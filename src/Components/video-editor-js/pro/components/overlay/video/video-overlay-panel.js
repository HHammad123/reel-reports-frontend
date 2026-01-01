import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, useRef, useMemo } from "react";
import { useEditorContext } from "../../../contexts/editor-context";
import { useTimelinePositioning } from "../../../hooks/use-timeline-positioning";
import { useAspectRatio } from "../../../hooks/use-aspect-ratio";
import { OverlayType } from "../../../types";
import { VideoDetails } from "./video-details";
import { useMediaAdaptors } from "../../../contexts/media-adaptor-context";
import { MediaOverlayPanel } from "../shared/media-overlay-panel";
import { getSrcDuration } from "../../../hooks/use-src-duration";
import { calculateIntelligentAssetSize, getAssetDimensions } from "../../../utils/asset-sizing";
import { useVideoReplacement } from "../../../hooks/use-video-replacement";
import { Loader2 } from "lucide-react";
/**
 * VideoOverlayPanel is a component that provides video search and management functionality.
 * It allows users to:
 * - Search and browse videos from all configured video adaptors
 * - Add videos to the timeline as overlays
 * - Manage video properties when a video overlay is selected
 *
 * The component has two main states:
 * 1. Search/Browse mode: Shows a search input and grid of video thumbnails from all sources
 * 2. Edit mode: Shows video details panel when a video overlay is selected
 *
 * @component
 * @example
 * ```tsx
 * <VideoOverlayPanel />
 * ```
 */
export const VideoOverlayPanel = () => {
    const [searchQuery, setSearchQuery] = useState("");
    const [videos, setVideos] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isLoadingSessionVideos, setIsLoadingSessionVideos] = useState(false);
    const [isDurationLoading, setIsDurationLoading] = useState(false);
    const [loadingItemKey, setLoadingItemKey] = useState(null);
    const [sourceResults, setSourceResults] = useState([]);
    const [generatedBaseVideos, setGeneratedBaseVideos] = useState([]);
    const [sessionVideos, setSessionVideos] = useState([]);
    const { searchVideos, videoAdaptors } = useMediaAdaptors();
    const { isReplaceMode, startReplaceMode, cancelReplaceMode, replaceVideo } = useVideoReplacement();
    const { overlays, selectedOverlayId, changeOverlay, currentFrame, setOverlays, setSelectedOverlayId, } = useEditorContext();
    const { addAtPlayhead } = useTimelinePositioning();
    const { getAspectRatioDimensions } = useAspectRatio();
    const [localOverlay, setLocalOverlay] = useState(null);
    const hasLoadedInitialVideos = useRef(false);
    
    // Fetch all videos from generate-base-video API for All tab
    useEffect(() => {
        const fetchGeneratedBaseVideos = async () => {
            try {
                const userId = localStorage.getItem('token');
                if (!userId) return;
                
                const response = await fetch(
                    `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/user/${encodeURIComponent(userId)}/generated-base-videos`,
                    {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
                
                if (!response.ok) return;
                
                const text = await response.text();
                let data;
                try {
                    data = JSON.parse(text);
                } catch (_) {
                    data = text;
                }
                
                const baseVideosData = data?.base_videos || {};
                const allGeneratedVideos = [];
                
                // Transform all videos from generate-base-video API (all sessions, all aspect ratios)
                Object.keys(baseVideosData).forEach((aspectRatio) => {
                    const sessionsForRatio = baseVideosData[aspectRatio];
                    if (typeof sessionsForRatio === 'object' && sessionsForRatio !== null && !Array.isArray(sessionsForRatio)) {
                        Object.entries(sessionsForRatio).forEach(([sessionName, videos]) => {
                            if (Array.isArray(videos)) {
                                videos.forEach((videoUrl, idx) => {
                                    let videoUrlStr = '';
                                    let videoName = `${sessionName} - Video ${idx + 1}`;
                                    
                                    if (typeof videoUrl === 'string' && videoUrl) {
                                        videoUrlStr = videoUrl;
                                    } else if (videoUrl && typeof videoUrl === 'object') {
                                        videoUrlStr = videoUrl.video_url || videoUrl.url || videoUrl.src || '';
                                        videoName = videoUrl.name || videoUrl.title || videoName;
                                    }
                                    
                                    if (videoUrlStr) {
                                        allGeneratedVideos.push({
                                            id: `generated-video-${aspectRatio}-${sessionName}-${idx}`,
                                            type: 'video',
                                            width: 1920,
                                            height: 1080,
                                            thumbnail: videoUrlStr,
                                            file: videoUrlStr,
                                            src: videoUrlStr,
                                            alt: videoName,
                                            title: videoName,
                                            attribution: {
                                                author: 'Generated',
                                                source: 'Generated Base Video',
                                                license: 'User Content',
                                            },
                                            _session: true,
                                            _generated: true,
                                            _sessionVideo: true,
                                            _sessionName: sessionName,
                                            _aspectRatio: aspectRatio,
                                            _source: 'local-session-videos',
                                        });
                                    }
                                });
                            }
                        });
                    }
                });
                
                console.log('[VideoOverlayPanel] Fetched generated base videos:', allGeneratedVideos.length, 'videos from', Object.keys(baseVideosData).length, 'aspect ratios');
                setGeneratedBaseVideos(allGeneratedVideos);
            } catch (error) {
                console.error('Failed to fetch generated base videos:', error);
            }
        };
        
        fetchGeneratedBaseVideos();
    }, []);
    
    // Load session videos automatically when component mounts
    useEffect(() => {
        const loadSessionVideos = async () => {
            // Only load once on mount
            if (hasLoadedInitialVideos.current) return;
            
            // Check if we have session videos adaptor
            const sessionVideosAdaptor = videoAdaptors.find(adaptor => adaptor.name === 'local-session-videos');
            if (!sessionVideosAdaptor) {
                // If no adaptor, still show generated base videos
                setVideos(generatedBaseVideos);
                hasLoadedInitialVideos.current = true;
                return;
            }
            
            setIsLoadingSessionVideos(true);
            setIsLoading(true);
            try {
                // Load session videos with empty query to get all videos (only current session)
                const results = await searchVideos({ query: '', page: 1, perPage: 100 });
                const sessionVids = results.items || [];
                setSessionVideos(sessionVids);
                
                // For All tab: combine session videos with generated base videos
                // For Session Videos tab: only show session videos (handled by MediaOverlayPanel filtering)
                const allVideos = [...sessionVids, ...generatedBaseVideos];
                setVideos(allVideos);
                setSourceResults(results.sourceResults || []);
                hasLoadedInitialVideos.current = true;
            } catch (error) {
                console.error('Failed to load session videos:', error);
                setSessionVideos([]);
                // On error, still show generated base videos for All tab
                setVideos(generatedBaseVideos);
                hasLoadedInitialVideos.current = true;
            } finally {
                setIsLoadingSessionVideos(false);
                setIsLoading(false);
            }
        };
        
        loadSessionVideos();
    }, [searchVideos, videoAdaptors, generatedBaseVideos]);
    
    // Update videos when generatedBaseVideos changes (in case they load after session videos)
    useEffect(() => {
        if (hasLoadedInitialVideos.current && generatedBaseVideos.length > 0) {
            // Combine with existing session videos
            const allVideos = [...sessionVideos, ...generatedBaseVideos];
            setVideos(allVideos);
        } else if (!hasLoadedInitialVideos.current && generatedBaseVideos.length > 0) {
            // If generated videos load first, show them immediately
            setVideos(generatedBaseVideos);
        }
    }, [generatedBaseVideos, sessionVideos]);
    useEffect(() => {
        if (selectedOverlayId === null) {
            setLocalOverlay(null);
            return;
        }
        const selectedOverlay = overlays.find((overlay) => overlay.id === selectedOverlayId);
        if ((selectedOverlay === null || selectedOverlay === void 0 ? void 0 : selectedOverlay.type) === OverlayType.VIDEO) {
            setLocalOverlay(selectedOverlay);
        }
    }, [selectedOverlayId, overlays]);
    const handleSearch = async (e) => {
        e.preventDefault();
        
        // If search query is empty, reload session videos
        if (!searchQuery.trim()) {
            const sessionVideosAdaptor = videoAdaptors.find(adaptor => adaptor.name === 'local-session-videos');
            if (sessionVideosAdaptor) {
                setIsLoadingSessionVideos(true);
                setIsLoading(true);
                try {
                    const results = await searchVideos({ query: '', page: 1, perPage: 100 });
                    const sessionVids = results.items || [];
                    setSessionVideos(sessionVids);
                    // Combine session videos with generated base videos for All tab
                    const allVideos = [...sessionVids, ...generatedBaseVideos];
                    setVideos(allVideos);
                    setSourceResults(results.sourceResults || []);
                } catch (error) {
                    console.error('Failed to reload session videos:', error);
                    setSessionVideos([]);
                    // On error, still show generated base videos
                    setVideos(generatedBaseVideos);
                } finally {
                    setIsLoadingSessionVideos(false);
                    setIsLoading(false);
                }
            } else {
                // If no adaptor, still show generated base videos
                setVideos(generatedBaseVideos);
            }
            return;
        }
        
        setIsLoading(true);
        try {
            const result = await searchVideos({
                query: searchQuery,
                perPage: 50,
                page: 1,
            });
            // Filter generated base videos by search query if provided
            let filteredGeneratedVideos = generatedBaseVideos;
            if (searchQuery.trim()) {
                const queryLower = searchQuery.toLowerCase();
                filteredGeneratedVideos = generatedBaseVideos.filter(vid => 
                    (vid.alt && vid.alt.toLowerCase().includes(queryLower)) ||
                    (vid.title && vid.title.toLowerCase().includes(queryLower)) ||
                    (vid._sessionName && vid._sessionName.toLowerCase().includes(queryLower))
                );
            }
            // Combine search results with filtered generated base videos
            const allVideos = [...(result.items || []), ...filteredGeneratedVideos];
            setVideos(allVideos);
            setSourceResults(result.sourceResults || []);
        }
        catch (error) {
            console.error("Error searching videos:", error);
            // On error, show generated base videos if search matches
            if (searchQuery.trim()) {
                const queryLower = searchQuery.toLowerCase();
                const filtered = generatedBaseVideos.filter(vid => 
                    (vid.alt && vid.alt.toLowerCase().includes(queryLower)) ||
                    (vid.title && vid.title.toLowerCase().includes(queryLower)) ||
                    (vid._sessionName && vid._sessionName.toLowerCase().includes(queryLower))
                );
                setVideos(filtered);
            } else {
                setVideos(generatedBaseVideos);
            }
            setSourceResults([]);
        }
        finally {
            setIsLoading(false);
        }
    };
    const handleAddClip = async (video) => {
        const itemKey = getItemKey(video);
        setIsDurationLoading(true);
        setLoadingItemKey(itemKey);
        try {
            // Check if we're in replace mode
            if (isReplaceMode && localOverlay) {
                // Replace mode: Use the hook to handle replacement
                await replaceVideo(localOverlay, video, (v) => {
                    const adaptor = videoAdaptors.find((a) => a.name === v._source);
                    return (adaptor === null || adaptor === void 0 ? void 0 : adaptor.getVideoUrl(v, "hd")) || "";
                }, (updatedOverlay) => {
                    setLocalOverlay(updatedOverlay);
                    // Clear search state
                    setSearchQuery("");
                    setVideos([]);
                    setSourceResults([]);
                });
            }
            else {
                // Add mode: Create new overlay
                const adaptor = videoAdaptors.find((a) => a.name === video._source);
                const videoUrl = (adaptor === null || adaptor === void 0 ? void 0 : adaptor.getVideoUrl(video, "hd")) || "";
                // Get actual video duration using media-parser
                let durationInFrames = 200; // fallback
                let mediaSrcDuration;
                try {
                    const result = await getSrcDuration(videoUrl);
                    durationInFrames = result.durationInFrames;
                    mediaSrcDuration = result.durationInSeconds;
                }
                catch (error) {
                    console.warn("Failed to get video duration, using fallback:", error);
                }
                const canvasDimensions = getAspectRatioDimensions();
                const assetDimensions = getAssetDimensions(video);
                // Check if aspect ratios match - if so, always fill canvas for base videos
                // Works for both 9:16 and 16:9 aspect ratios
                // Examples:
                // - 16:9 video (1920x1080) on 16:9 canvas (1920x1080) → matches → fills canvas
                // - 9:16 video (1080x1920) on 9:16 canvas (1080x1920) → matches → fills canvas
                let width, height, fillsCanvas;
                if (assetDimensions) {
                    const assetAspectRatio = assetDimensions.width / assetDimensions.height;
                    const canvasAspectRatio = canvasDimensions.width / canvasDimensions.height;
                    const aspectRatioTolerance = 0.01; // 1% tolerance for floating point comparison
                    const aspectRatiosMatch = Math.abs(assetAspectRatio - canvasAspectRatio) < aspectRatioTolerance;
                    // If aspect ratios match (9:16 or 16:9), always fill canvas (base video behavior)
                    if (aspectRatiosMatch) {
                        width = canvasDimensions.width;
                        height = canvasDimensions.height;
                        fillsCanvas = true;
                    } else {
                        // Use intelligent sizing for non-matching aspect ratios
                        const sized = calculateIntelligentAssetSize(assetDimensions, canvasDimensions);
                        width = sized.width;
                        height = sized.height;
                        fillsCanvas = false;
                    }
                } else {
                    // No asset dimensions - use canvas dimensions (fill canvas for both 9:16 and 16:9)
                    width = canvasDimensions.width;
                    height = canvasDimensions.height;
                    fillsCanvas = true;
                }
                const { from, row, updatedOverlays } = addAtPlayhead(currentFrame, overlays, 'top');
                // If video fills canvas, position at (0,0), otherwise center it
                let left = fillsCanvas ? 0 : Math.round((canvasDimensions.width - width) / 2);
                let top = fillsCanvas ? 0 : Math.round((canvasDimensions.height - height) / 2);
                
                // CRITICAL: Ensure video stays within canvas bounds
                // Clamp position to canvas bounds
                left = Math.max(0, Math.min(left, canvasDimensions.width - Math.max(1, width)));
                top = Math.max(0, Math.min(top, canvasDimensions.height - Math.max(1, height)));
                // Clamp dimensions to fit within remaining canvas space
                width = Math.max(1, Math.min(width, canvasDimensions.width - left));
                height = Math.max(1, Math.min(height, canvasDimensions.height - top));
                // Final safety check: ensure position + size doesn't exceed canvas
                if (left + width > canvasDimensions.width) {
                    width = Math.max(1, canvasDimensions.width - left);
                }
                if (top + height > canvasDimensions.height) {
                    height = Math.max(1, canvasDimensions.height - top);
                }
                
                // Create the new overlay without an ID (will be generated)
                const newOverlay = {
                    left: left, // Constrained to canvas bounds
                    top: top, // Constrained to canvas bounds
                    width, // Constrained to canvas bounds
                    height, // Constrained to canvas bounds
                    durationInFrames,
                    from,
                    rotation: 0,
                    row,
                    isDragging: false,
                    type: OverlayType.VIDEO,
                    content: video.thumbnail,
                    src: videoUrl,
                    videoStartTime: 0,
                    mediaSrcDuration,
                    styles: {
                        opacity: 1,
                        zIndex: 100,
                        transform: "none",
                        objectFit: fillsCanvas ? "cover" : "contain", // Use "cover" when filling canvas to ensure no gaps
                        animation: {
                            enter: "none",
                            exit: "none",
                        },
                    },
                };
                // Update overlays with both the shifted overlays and the new overlay in a single operation
                // Generate ID - ensure we always get a valid numeric ID
                const validIds = updatedOverlays
                    .map((o) => o?.id)
                    .filter((id) => id != null && !isNaN(id) && typeof id === 'number');
                const newId = validIds.length > 0 
                    ? Math.max(...validIds) + 1 
                    : (overlays.length > 0 
                        ? Math.max(...overlays.map((o) => o?.id || 0).filter(id => !isNaN(id))) + 1 
                        : 0);
                const finalId = (isNaN(newId) || newId < 0) ? Date.now() : newId;
                const overlayWithId = { ...newOverlay, id: finalId };
                
                // Ensure the overlay has a valid ID
                if (!overlayWithId.id || isNaN(overlayWithId.id)) {
                    overlayWithId.id = finalId;
                }
                
                const finalOverlays = [...updatedOverlays, overlayWithId];
                setOverlays(finalOverlays);
                setSelectedOverlayId(overlayWithId.id);
                
                console.log('[VideoOverlayPanel] Added overlay with ID:', overlayWithId.id, 'Type:', overlayWithId.type);
            }
        }
        finally {
            setIsDurationLoading(false);
            setLoadingItemKey(null);
        }
    };
    const handleUpdateOverlay = (updatedOverlay) => {
        setLocalOverlay(updatedOverlay);
        changeOverlay(updatedOverlay.id, () => updatedOverlay);
    };
    const handleCancelReplace = () => {
        cancelReplaceMode();
        setSearchQuery("");
        setVideos([]);
        setSourceResults([]);
    };
    const getThumbnailUrl = (video) => {
        // For session videos, always return empty string so video element is used
        if (video._isSessionVideo || video._sessionVideo) {
            // Return empty string - MediaGrid will use video element
            return video.thumbnail && video.thumbnail.trim() ? video.thumbnail : '';
        }
        // For other videos, use thumbnail if available
        if (video.thumbnail) {
        return video.thumbnail;
        }
        // Fallback to video URL for non-session videos
        return video.file || '';
    };
    const getItemKey = (video) => {
        return `${video._source}-${video.id}`;
    };
    
    // Filter videos based on active tab
    // For Session Videos tab: only show session videos (not generated base videos)
    // For All tab: show all videos (session + generated base videos)
    const filteredVideosForDisplay = useMemo(() => {
        // This will be filtered by MediaOverlayPanel based on activeTab
        // But we need to ensure session videos don't include generated base videos
        return videos;
    }, [videos]);
    
    return (_jsx(MediaOverlayPanel, { searchQuery: searchQuery, onSearchQueryChange: setSearchQuery, onSearch: handleSearch, items: filteredVideosForDisplay, isLoading: isLoading, isLoadingSessionImages: isLoadingSessionVideos, hasAdaptors: videoAdaptors.length > 0, sourceResults: sourceResults, onItemClick: handleAddClip, getThumbnailUrl: getThumbnailUrl, getItemKey: getItemKey, mediaType: "videos", searchPlaceholder: isReplaceMode ? "Search for replacement video" : "Search videos", showSourceBadge: false, isEditMode: !!localOverlay && !isReplaceMode, editComponent: localOverlay ? (_jsx(VideoDetails, { localOverlay: localOverlay, setLocalOverlay: handleUpdateOverlay, onChangeVideo: startReplaceMode })) : null, isReplaceMode: isReplaceMode, onCancelReplace: handleCancelReplace, enableTimelineDrag: !isReplaceMode && !localOverlay, isDurationLoading: isDurationLoading, loadingItemKey: loadingItemKey, sessionImages: sessionVideos }));
};
