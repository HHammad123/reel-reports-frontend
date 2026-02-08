import { jsx as _jsx } from "react/jsx-runtime";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
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
    const [isLoadingGeneratedBaseVideos, setIsLoadingGeneratedBaseVideos] = useState(false);
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
    const searchTimeoutRef = useRef(null);
    const isInitialMount = useRef(true);
    const generateBaseVideosCompleted = useRef(false);
    
    // Fetch all videos from generate-base-video API for All tab
    // API endpoint: https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/user/{userId}/generated-base-videos
    // Expected structure: { "16:9": { "Session Name": { videos: [...], updated_at: "..." } } }
    // These videos are displayed in the "All" tab when activeTab === "all"
    useEffect(() => {
        const fetchGeneratedBaseVideos = async () => {
            setIsLoadingGeneratedBaseVideos(true);
            try {
                const userId = localStorage.getItem('token');
                if (!userId) {
                    setIsLoadingGeneratedBaseVideos(false);
                    return;
                }
                

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
                } catch (parseError) {

                    data = text;
                }
                const allGeneratedVideos = [];
                
                // PRIORITY 1: Check if the response has base_videos wrapper: base_videos["16:9"]["Session Name"].videos
                // Structure: { base_videos: { "16:9": { "Session Name": { videos: [...], updated_at: "..." } } } }
                if (data && typeof data === 'object' && !Array.isArray(data)) {
                    // Check if response has base_videos key
                    if (data.base_videos || data.baseVideos) {
                        const baseVideosData = data.base_videos || data.baseVideos;

                        
                        // Process base_videos structure: base_videos["16:9"]["Session Name"].videos
                        Object.keys(baseVideosData).forEach((aspectRatio) => {

                            const sessionsForRatio = baseVideosData[aspectRatio];
                            
                            if (typeof sessionsForRatio === 'object' && sessionsForRatio !== null && !Array.isArray(sessionsForRatio)) {
                                const sessionNames = Object.keys(sessionsForRatio);

                                
                                Object.entries(sessionsForRatio).forEach(([sessionName, sessionData]) => {
                                    let videos = [];
                                    let updatedAt = null;
                                    
                                    // Handle new format: { videos: [...], updated_at: "..." }
                                    if (sessionData && typeof sessionData === 'object' && !Array.isArray(sessionData)) {
                                        videos = sessionData.videos || sessionData.video || [];
                                        updatedAt = sessionData.updated_at || sessionData.updatedAt || null;

                                    } 
                                    // Handle old format: array directly
                                    else if (Array.isArray(sessionData)) {
                                        videos = sessionData;
                                        updatedAt = null;
                                    }
                                    
                                    if (Array.isArray(videos) && videos.length > 0) {
                                        videos.forEach((videoUrl, idx) => {
                                            let videoUrlStr = '';
                                            let videoName = `${sessionName} - Video ${idx + 1}`;
                                            
                                            if (typeof videoUrl === 'string' && videoUrl) {
                                                videoUrlStr = videoUrl;
                                            } else if (videoUrl && typeof videoUrl === 'object') {
                                                videoUrlStr = videoUrl.video_url || videoUrl.url || videoUrl.src || videoUrl.video || '';
                                                videoName = videoUrl.name || videoUrl.title || videoName;
                                            }
                                            
                                            if (videoUrlStr) {
                                                const videoItem = {
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
                                                    _source: 'generated-base-videos',
                                                    _updatedAt: updatedAt,
                                                };
                                                allGeneratedVideos.push(videoItem);

                                            } else {

                                            }
                                        });
                                    } else {

                                    }
                                });
                            } else {
                            }
                        });
                        
                        // Log results after processing base_videos format
                        if (allGeneratedVideos.length > 0) {

                        } else {

                        }
                    }
                    // PRIORITY 2: Check if aspect ratios are top-level keys (fallback for direct structure)
                    else {
                        const topLevelKeys = Object.keys(data);
                        const hasAspectRatioKeys = topLevelKeys.some(key => key.includes(':'));
                        
                        if (hasAspectRatioKeys) {
                            // Nested format - aspect ratios as top-level keys
                            // Structure: data[aspectRatio][sessionName].videos
                            Object.keys(data).forEach((aspectRatio) => {

                                const sessionsForRatio = data[aspectRatio];
                                
                                if (typeof sessionsForRatio === 'object' && sessionsForRatio !== null && !Array.isArray(sessionsForRatio)) {
                                    const sessionNames = Object.keys(sessionsForRatio);

                                    
                                    Object.entries(sessionsForRatio).forEach(([sessionName, sessionData]) => {
                                        let videos = [];
                                        let updatedAt = null;
                                        
                                        // Handle new format: { videos: [...], updated_at: "..." }
                                        if (sessionData && typeof sessionData === 'object' && !Array.isArray(sessionData)) {
                                            videos = sessionData.videos || sessionData.video || [];
                                            updatedAt = sessionData.updated_at || sessionData.updatedAt || null;

                                        } 
                                        // Handle old format: array directly
                                        else if (Array.isArray(sessionData)) {
                                            videos = sessionData;
                                            updatedAt = null;
                                        }
                                        
                                        if (Array.isArray(videos) && videos.length > 0) {
                                            videos.forEach((videoUrl, idx) => {
                                                let videoUrlStr = '';
                                                let videoName = `${sessionName} - Video ${idx + 1}`;
                                                
                                                if (typeof videoUrl === 'string' && videoUrl) {
                                                    videoUrlStr = videoUrl;
                                                } else if (videoUrl && typeof videoUrl === 'object') {
                                                    videoUrlStr = videoUrl.video_url || videoUrl.url || videoUrl.src || videoUrl.video || '';
                                                    videoName = videoUrl.name || videoUrl.title || videoName;
                                                }
                                                
                                                if (videoUrlStr) {
                                                    const videoItem = {
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
                                                        _source: 'generated-base-videos',
                                                        _updatedAt: updatedAt,
                                                    };
                                                    allGeneratedVideos.push(videoItem);

                                                } else {

                                                }
                                            });
                                        } else {

                                        }
                                    });
                                } else {
                                }
                            });
                            
                            // Log results after processing nested format
                            if (allGeneratedVideos.length > 0) {

                            } else {

                            }
                        }
                    }
                }
                
                // PRIORITY 2: Check if the response is in the flat format: { "videos": [...], "updated_at": "..." }
                if (allGeneratedVideos.length === 0 && data && typeof data === 'object' && !Array.isArray(data) && Array.isArray(data.videos)) {

                    // New flat format - direct videos array
                    const videos = data.videos || [];
                    videos.forEach((videoUrl, idx) => {

                        let videoUrlStr = '';
                        let videoName = `Generated Video ${idx + 1}`;
                        
                        if (typeof videoUrl === 'string' && videoUrl) {
                            videoUrlStr = videoUrl;
                        } else if (videoUrl && typeof videoUrl === 'object') {
                            videoUrlStr = videoUrl.video_url || videoUrl.url || videoUrl.src || '';
                            videoName = videoUrl.name || videoUrl.title || videoName;
                        }
                        
                        if (videoUrlStr) {
                            const videoItem = {
                                id: `generated-video-flat-${idx}`,
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
                                _sessionName: 'Generated Videos',
                                _aspectRatio: '16:9',
                                _source: 'generated-base-videos',
                                _updatedAt: data.updated_at || null,
                            };

                            allGeneratedVideos.push(videoItem);
                        } else {

                        }
                    });
                }
                
                // PRIORITY 4: Old nested format with wrapper - normalize and sort (fallback)
                if (allGeneratedVideos.length === 0) {
                    const { normalizeGeneratedBaseVideosResponse } = await import('../../../../../../utils/generatedMediaUtils');
                    const normalized = normalizeGeneratedBaseVideosResponse(data);
                    const baseVideosData = normalized.base_videos || {};
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
                                                _source: 'generated-base-videos',
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
                

                setGeneratedBaseVideos(allGeneratedVideos);
                
                // Mark that generate-base-video API has completed
                generateBaseVideosCompleted.current = true;
                
                // If no session videos have loaded yet, show generated videos immediately
                if (!hasLoadedInitialVideos.current) {
                    setVideos(allGeneratedVideos);
                }
            } catch (error) {

            } finally {
                setIsLoadingGeneratedBaseVideos(false);
                generateBaseVideosCompleted.current = true; // Mark as completed even on error
            }
        };
        
        fetchGeneratedBaseVideos();
    }, []);
    
    // Load session videos automatically - BUT only after generate-base-video API completes
    // This effect watches for when generate-base-video loading completes
    useEffect(() => {
        // Only proceed if generate-base-video is done loading and we haven't loaded session videos yet
        if (isLoadingGeneratedBaseVideos || hasLoadedInitialVideos.current) {
            return;
        }
        
        // Double-check with ref to ensure it's truly completed
        if (!generateBaseVideosCompleted.current) {
            return;
        }
        
        const loadSessionVideos = async () => {
            // Check if we have session videos adaptor
            const sessionVideosAdaptor = videoAdaptors.find(adaptor => adaptor.name === 'local-session-videos');
            if (!sessionVideosAdaptor) {
                // If no adaptor, show generated base videos
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
                // Now combine with generated base videos (which should be loaded by now)
                const allVideos = [...sessionVids, ...generatedBaseVideos];
                setVideos(allVideos);
                setSourceResults(results.sourceResults || []);
                hasLoadedInitialVideos.current = true;
            } catch (error) {

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
    }, [isLoadingGeneratedBaseVideos, searchVideos, videoAdaptors, generatedBaseVideos]);
    
    // Update videos when generatedBaseVideos changes - but only if base videos loading is complete
    useEffect(() => {
        // Only update if generate-base-video API is done loading
        if (!isLoadingGeneratedBaseVideos) {
            if (hasLoadedInitialVideos.current && generatedBaseVideos.length > 0) {
                // Combine with existing session videos
                const allVideos = [...sessionVideos, ...generatedBaseVideos];
                setVideos(allVideos);
            } else if (!hasLoadedInitialVideos.current && generatedBaseVideos.length > 0) {
                // If generated videos load first and session videos haven't loaded yet, show them immediately
                // But don't mark as loaded until session videos also complete
                setVideos(generatedBaseVideos);
            }
        }
    }, [generatedBaseVideos, sessionVideos, isLoadingGeneratedBaseVideos]);
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
    
    // Extract search logic into a reusable function
    const performSearch = useCallback(async (query) => {
        // If search query is empty, reload session videos
        if (!query.trim()) {
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
                query: query,
                perPage: 50,
                page: 1,
            });
            // Filter generated base videos by search query if provided
            let filteredGeneratedVideos = generatedBaseVideos;
            if (query.trim()) {
                const queryLower = query.toLowerCase();
                filteredGeneratedVideos = generatedBaseVideos.filter(vid => 
                    (vid.alt && vid.alt.toLowerCase().includes(queryLower)) ||
                    (vid.title && vid.title.toLowerCase().includes(queryLower)) ||
                    (vid._sessionName && vid._sessionName.toLowerCase().includes(queryLower))
                );
            }
            // Filter session videos by session title if search query is provided
            let filteredSessionVideos = result.items || [];
            if (query.trim()) {
                const queryLower = query.toLowerCase();
                filteredSessionVideos = (result.items || []).filter(vid => {
                    // Check if it's a session video and filter by session title
                    if (vid._isSessionVideo || vid._source === 'local-session-videos') {
                        const sessionTitle = (vid._sessionTitle || vid._sessionName || '').toLowerCase();
                        const videoTitle = (vid.title || vid.name || '').toLowerCase();
                        return sessionTitle.includes(queryLower) || videoTitle.includes(queryLower);
                    }
                    // For non-session videos, include them (they're already filtered by the adaptor)
                    return true;
                });
            }
            // Combine search results with filtered generated base videos
            const allVideos = [...filteredSessionVideos, ...filteredGeneratedVideos];
            setVideos(allVideos);
            setSourceResults(result.sourceResults || []);
        }
        catch (error) {

            // On error, show generated base videos and session videos if search matches
            if (query.trim()) {
                const queryLower = query.toLowerCase();
                // Filter generated base videos
                const filteredGenerated = generatedBaseVideos.filter(vid => 
                    (vid.alt && vid.alt.toLowerCase().includes(queryLower)) ||
                    (vid.title && vid.title.toLowerCase().includes(queryLower)) ||
                    (vid._sessionName && vid._sessionName.toLowerCase().includes(queryLower))
                );
                // Filter session videos by session title
                const filteredSession = sessionVideos.filter(vid => {
                    const sessionTitle = (vid._sessionTitle || vid._sessionName || '').toLowerCase();
                    const videoTitle = (vid.title || vid.name || '').toLowerCase();
                    return sessionTitle.includes(queryLower) || videoTitle.includes(queryLower);
                });
                setVideos([...filteredSession, ...filteredGenerated]);
            } else {
                setVideos([...sessionVideos, ...generatedBaseVideos]);
            }
            setSourceResults([]);
        }
        finally {
            setIsLoading(false);
        }
    }, [searchVideos, videoAdaptors, generatedBaseVideos, sessionVideos]);
    
    // Debounced search on type
    useEffect(() => {
        // Skip on initial mount
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }
        
        // Clear existing timeout
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        
        // Set up debounced search (500ms delay)
        searchTimeoutRef.current = setTimeout(() => {
            performSearch(searchQuery);
        }, 500);
        
        // Cleanup timeout on unmount or when searchQuery changes
        return () => {
            if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
            }
        };
    }, [searchQuery, performSearch]);
    
    const handleSearch = async (e) => {
        e.preventDefault();
        // Clear any pending debounced search
        if (searchTimeoutRef.current) {
            clearTimeout(searchTimeoutRef.current);
        }
        await performSearch(searchQuery);
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
                // Get video URL - try multiple sources and ensure it's a valid string
                let videoUrl = "";
                if (video._source === 'generated-base-videos') {
                    videoUrl = video.file || video.src || video.thumbnail || "";
                } else {
                    const adaptor = videoAdaptors.find((a) => a.name === video._source);
                    let adaptorUrl = null;
                    if (adaptor && typeof adaptor.getVideoUrl === 'function') {
                        try {
                            adaptorUrl = adaptor.getVideoUrl(video, "hd");
                            // If adaptor returns false/null/undefined, treat as invalid
                            if (adaptorUrl === false || adaptorUrl === null || adaptorUrl === undefined) {
                                adaptorUrl = null;
                            }
                        } catch (error) {
                            console.warn("Error getting video URL from adaptor:", error);
                            adaptorUrl = null;
                        }
                    }
                    // Ensure we get a valid string URL - try multiple fallbacks
                    videoUrl = (adaptorUrl && typeof adaptorUrl === 'string' && adaptorUrl.trim() !== '') 
                        ? adaptorUrl.trim()
                        : (video.file || video.src || video.url || video.thumbnail || "");
                }
                
                // Final validation - ensure videoUrl is a non-empty string
                // If it's still empty/false, try getting from video object directly
                if (!videoUrl || videoUrl === false || typeof videoUrl !== 'string' || videoUrl.trim() === "") {
                    // Last resort: check if video has direct URL properties
                    videoUrl = video.video_url || video.videoUrl || video.video || video.media_url || video.mediaUrl || "";
                    if (!videoUrl || typeof videoUrl !== 'string' || videoUrl.trim() === "") {
                        console.warn("Cannot add video: video URL is empty or invalid", { 
                            video, 
                            videoUrl,
                            availableProps: Object.keys(video),
                            source: video._source
                        });
                        setIsDurationLoading(false);
                        setLoadingItemKey(null);
                        return;
                    }
                }
                
                // Ensure video URL is absolute or properly formatted
                // For generated videos, they should already be absolute URLs
                // For other videos, ensure they're properly formatted
                if (!videoUrl.startsWith('http://') && !videoUrl.startsWith('https://') && !videoUrl.startsWith('/') && !videoUrl.startsWith('blob:')) {
                    console.warn("Video URL format may be invalid:", videoUrl);
                }
                
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
                // CRITICAL: Replicate chart video logic for overlay videos
                // Chart videos: z-index 200, always on top, objectFit: contain
                // Base videos: z-index 100, background, objectFit: cover
                
                // Check if there are existing base videos (videos with z-index 100 or that fill canvas)
                const hasExistingBaseVideos = overlays.some(ov => {
                    const isBaseVideo = (ov.styles?.zIndex === 100) || 
                                       (ov.width === canvasDimensions.width && ov.height === canvasDimensions.height) ||
                                       (ov.left === 0 && ov.top === 0 && ov.width === canvasDimensions.width && ov.height === canvasDimensions.height);
                    return isBaseVideo && ov.type === OverlayType.VIDEO;
                });
                
                // Determine if this is a base video or overlay video
                // Base videos: fill canvas AND no existing base videos (first video)
                // Overlay videos: everything else (always on top, like chart videos)
                const isBaseVideo = fillsCanvas && !hasExistingBaseVideos;
                
                // Determine final dimensions and position
                let finalWidth = width;
                let finalHeight = height;
                let left, top;
                
                if (isBaseVideo) {
                    // Base video: fills entire canvas, positioned at (0,0) - background layer
                    finalWidth = canvasDimensions.width;
                    finalHeight = canvasDimensions.height;
                    left = 0;
                    top = 0;
                } else {
                    // Overlay video: replicate chart video behavior
                    // Use calculated dimensions, centered on canvas, on top of base videos
                    finalWidth = width;
                    finalHeight = height;
                    left = Math.round((canvasDimensions.width - finalWidth) / 2);
                    top = Math.round((canvasDimensions.height - finalHeight) / 2);
                }
                
                // Placement: base videos go to bottom, overlay videos ALWAYS go to top (like chart videos)
                const placement = isBaseVideo ? 'bottom' : 'top';
                const { from, row, updatedOverlays } = addAtPlayhead(currentFrame, overlays, placement);
                
                // CRITICAL: Ensure video stays within canvas bounds
                // For base videos, ensure they always fill the entire canvas
                if (isBaseVideo) {
                    // Base videos must fill entire canvas - no clamping needed
                    finalWidth = canvasDimensions.width;
                    finalHeight = canvasDimensions.height;
                    left = 0;
                    top = 0;
                } else {
                    // For overlay videos, clamp position and dimensions to stay within canvas
                    left = Math.max(0, Math.min(left, canvasDimensions.width - Math.max(1, finalWidth)));
                    top = Math.max(0, Math.min(top, canvasDimensions.height - Math.max(1, finalHeight)));
                    // Clamp dimensions to fit within remaining canvas space
                    finalWidth = Math.max(1, Math.min(finalWidth, canvasDimensions.width - left));
                    finalHeight = Math.max(1, Math.min(finalHeight, canvasDimensions.height - top));
                    // Final safety check: ensure position + size doesn't exceed canvas
                    if (left + finalWidth > canvasDimensions.width) {
                        finalWidth = Math.max(1, canvasDimensions.width - left);
                    }
                    if (top + finalHeight > canvasDimensions.height) {
                        finalHeight = Math.max(1, canvasDimensions.height - top);
                    }
                }
                
                // Z-index assignment: EXACTLY like chart videos
                // - Base videos (first video, fills canvas): z-index 100 (background layer)
                // - Overlay videos (all others): z-index 200 (on top, EXACTLY like chart videos)
                const overlayZIndex = isBaseVideo ? 100 : 200;
                
                console.log('🎯 Video overlay z-index assignment:', {
                    isBaseVideo,
                    fillsCanvas,
                    hasExistingBaseVideos,
                    overlayZIndex,
                    row,
                    videoUrl: videoUrl ? videoUrl.substring(0, 50) : 'N/A',
                });
                
                // Build styles object - replicate chart video structure
                // CRITICAL: Ensure zIndex is explicitly set as a number, not calculated
                const overlayStyles = {
                    opacity: 1,
                    zIndex: overlayZIndex, // Explicit zIndex: 100 for base videos, 200 for overlays (same as chart videos)
                    transform: "none",
                    objectFit: isBaseVideo ? "cover" : "contain", // Cover for base videos, contain for overlays (same as chart videos)
                    backgroundColor: "white", // Default white background for videos
                    animation: {
                        enter: "none",
                        exit: "none",
                    },
                };
                
                // Create the new overlay without an ID (will be generated)
                // Structure matches chart video overlay structure exactly
                // CRITICAL: Ensure src is a valid string, not false or undefined
                // If videoUrl is invalid, use thumbnail as fallback (thumbnail often contains the actual video URL)
                let finalVideoUrl = "";
                if (videoUrl && typeof videoUrl === 'string' && videoUrl.trim() !== '') {
                    finalVideoUrl = videoUrl.trim();
                } else if (video.thumbnail && typeof video.thumbnail === 'string' && video.thumbnail.trim() !== '') {
                    // If adaptor failed, use thumbnail which may contain the video URL
                    finalVideoUrl = video.thumbnail.trim();
                } else {
                    // Last resort: try other properties
                    finalVideoUrl = (video.file || video.src || video.url || "").trim();
                }
                
                if (!finalVideoUrl) {
                    console.error("Invalid video URL when creating overlay:", { 
                        video, 
                        videoUrl, 
                        thumbnail: video.thumbnail,
                        finalVideoUrl,
                        availableProps: Object.keys(video)
                    });
                    setIsDurationLoading(false);
                    setLoadingItemKey(null);
                    return;
                }
                
                // CRITICAL: Verify zIndex is correctly set before creating overlay
                if (overlayStyles.zIndex !== overlayZIndex) {
                    console.error("⚠️ zIndex mismatch in overlayStyles!", {
                        expected: overlayZIndex,
                        actual: overlayStyles.zIndex,
                        isBaseVideo,
                    });
                    // Force correct zIndex
                    overlayStyles.zIndex = overlayZIndex;
                }
                
                // CRITICAL: Double-check finalVideoUrl is valid before creating overlay
                if (!finalVideoUrl || typeof finalVideoUrl !== 'string' || finalVideoUrl.trim() === '') {
                    console.error("❌ CRITICAL: finalVideoUrl is invalid when creating overlay:", {
                        finalVideoUrl,
                        videoUrl,
                        video: video,
                        videoThumbnail: video.thumbnail,
                    });
                    setIsDurationLoading(false);
                    setLoadingItemKey(null);
                    return;
                }
                
                const newOverlay = {
                    left: left, // Constrained to canvas bounds
                    top: top, // Constrained to canvas bounds
                    width: finalWidth, // Use final dimensions (may be adjusted for overlays)
                    height: finalHeight, // Use final dimensions (may be adjusted for overlays)
                    durationInFrames,
                    from,
                    rotation: 0,
                    row,
                    isDragging: false,
                    type: OverlayType.VIDEO,
                    content: video.thumbnail || finalVideoUrl, // Use thumbnail for preview, fallback to video URL
                    src: finalVideoUrl, // Video source URL - MUST be a valid string
                    videoStartTime: 0,
                    mediaSrcDuration,
                    // Add properties that chart videos have (for consistency)
                    has_background: true, // Overlay videos from panel have background by default
                    removeBackground: false,
                    needsChromaKey: false,
                    styles: { ...overlayStyles }, // Create a new object to prevent mutations
                };
                
                // Final verification - ensure zIndex is correct in the final overlay
                if (newOverlay.styles.zIndex !== overlayZIndex) {
                    console.error("⚠️ zIndex incorrect in newOverlay!", {
                        expected: overlayZIndex,
                        actual: newOverlay.styles.zIndex,
                        overlayStyles: overlayStyles,
                    });
                    newOverlay.styles.zIndex = overlayZIndex;
                }
                
                // CRITICAL: Verify src is set correctly - VideoLayerContent will return null if src is missing
                if (!newOverlay.src || typeof newOverlay.src !== 'string' || newOverlay.src.trim() === '') {
                    console.error("❌ CRITICAL: newOverlay.src is invalid!", {
                        src: newOverlay.src,
                        finalVideoUrl,
                        newOverlay,
                    });
                    setIsDurationLoading(false);
                    setLoadingItemKey(null);
                    return;
                }
                
                // Log video overlay creation for debugging
                console.log('🎬 Adding video overlay:', {
                    isBaseVideo,
                    fillsCanvas,
                    hasExistingBaseVideos,
                    videoUrl: finalVideoUrl.substring(0, 100), // Log first 100 chars
                    dimensions: { width: finalWidth, height: finalHeight },
                    position: { left, top },
                    zIndex: overlayStyles.zIndex, // Log the actual zIndex from styles
                    row,
                    overlayStyles: overlayStyles, // Log full styles object
                });
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
                
                // Final verification before setting overlays
                if (overlayWithId.styles?.zIndex !== overlayZIndex) {
                    console.error("❌ CRITICAL: zIndex mismatch in overlayWithId before setting overlays!", {
                        expected: overlayZIndex,
                        actual: overlayWithId.styles?.zIndex,
                        overlay: overlayWithId,
                        isBaseVideo,
                    });
                    overlayWithId.styles = { ...overlayWithId.styles, zIndex: overlayZIndex };
                }
                
                // CRITICAL: Verify src is set and valid before setting overlays
                if (!overlayWithId.src || typeof overlayWithId.src !== 'string' || overlayWithId.src.trim() === '') {
                    console.error("❌ CRITICAL: overlayWithId.src is invalid before setting overlays!", {
                        src: overlayWithId.src,
                        finalVideoUrl,
                        overlay: overlayWithId,
                    });
                    setIsDurationLoading(false);
                    setLoadingItemKey(null);
                    return;
                }
                
                console.log('✅ Final overlay before setting:', {
                    id: overlayWithId.id,
                    type: overlayWithId.type,
                    src: overlayWithId.src ? overlayWithId.src.substring(0, 100) : 'MISSING',
                    srcLength: overlayWithId.src ? overlayWithId.src.length : 0,
                    zIndex: overlayWithId.styles?.zIndex,
                    row: overlayWithId.row,
                    isBaseVideo,
                    dimensions: { width: overlayWithId.width, height: overlayWithId.height },
                    position: { left: overlayWithId.left, top: overlayWithId.top },
                    from: overlayWithId.from,
                    durationInFrames: overlayWithId.durationInFrames,
                    has_background: overlayWithId.has_background,
                    needsChromaKey: overlayWithId.needsChromaKey,
                });
                
                const finalOverlays = [...updatedOverlays, overlayWithId];
                
                // Log the overlays array to verify the overlay is added
                console.log('📋 Setting overlays array:', {
                    totalOverlays: finalOverlays.length,
                    newOverlayId: overlayWithId.id,
                    newOverlayType: overlayWithId.type,
                    newOverlaySrc: overlayWithId.src ? overlayWithId.src.substring(0, 80) : 'MISSING',
                    newOverlayFrom: overlayWithId.from,
                    newOverlayDuration: overlayWithId.durationInFrames,
                    newOverlayZIndex: overlayWithId.styles?.zIndex,
                    currentFrame: currentFrame,
                    allOverlayIds: finalOverlays.map(o => ({ id: o.id, type: o.type, from: o.from, duration: o.durationInFrames })),
                });
                
                setOverlays(finalOverlays);
                setSelectedOverlayId(overlayWithId.id);
                

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
        const sessionVids = videos.filter(v => v._source === 'local-session-videos' && !v._generated);
        const generatedVids = videos.filter(v => v._source === 'generated-base-videos');
        const otherVids = videos.filter(v => v._source !== 'local-session-videos' && v._source !== 'generated-base-videos');
        return videos;
    }, [videos]);
    
    return (_jsx(MediaOverlayPanel, { searchQuery: searchQuery, onSearchQueryChange: setSearchQuery, onSearch: handleSearch, items: filteredVideosForDisplay, isLoading: isLoading, isLoadingSessionImages: isLoadingSessionVideos, isLoadingGeneratedBaseVideos: isLoadingGeneratedBaseVideos, hasAdaptors: videoAdaptors.length > 0, sourceResults: sourceResults, onItemClick: handleAddClip, getThumbnailUrl: getThumbnailUrl, getItemKey: getItemKey, mediaType: "videos", searchPlaceholder: isReplaceMode ? "Search for replacement video" : "Search videos", showSourceBadge: false, isEditMode: !!localOverlay && !isReplaceMode, editComponent: localOverlay ? (_jsx(VideoDetails, { localOverlay: localOverlay, setLocalOverlay: handleUpdateOverlay, onChangeVideo: startReplaceMode })) : null, isReplaceMode: isReplaceMode, onCancelReplace: handleCancelReplace, enableTimelineDrag: !isReplaceMode && !localOverlay, isDurationLoading: isDurationLoading, loadingItemKey: loadingItemKey, sessionVideos: sessionVideos }));
};
