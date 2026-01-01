/**
 * Local Session Video Adaptor
 * 
 * Provides videos from window.__SESSION_MEDIA_FILES to the VideoOverlayPanel
 * Similar to how audio adaptors provide audio tracks to the audio section
 */
export const createLocalSessionVideoAdaptor = () => ({
    name: 'local-session-videos',
    displayName: 'Session Videos',
    description: 'Videos from your session data',
    requiresAuth: false,
    search: async (params) => {
        // Get videos from window.__SESSION_MEDIA_FILES
        if (typeof window === 'undefined') {
            return {
                items: [],
                totalCount: 0,
                hasMore: false
            };
        }
        
        const sessionMedia = window.__SESSION_MEDIA_FILES || [];
        // Filter only base videos from user session data
        // Exclude: chart videos (_isChartVideo: true), generated videos from API (_generated: true)
        // Only include: videos from session data (_session: true or undefined) and NOT generated from API
        let videos = Array.isArray(sessionMedia) 
            ? sessionMedia.filter(m => {
                return m.type === 'video' && 
                       !m._isChartVideo && 
                       !m._generated && 
                       m._session !== false; // Include session videos (or undefined, which is session)
              })
            : [];
        
        // Filter by search query if provided
        if (params.query && params.query.trim()) {
            const query = params.query.toLowerCase();
            videos = videos.filter(video => {
                const name = (video.name || video.title || '').toLowerCase();
                return name.includes(query);
            });
        }
        
        // Handle pagination
        const page = params.page || 1;
        const perPage = params.perPage || 50;
        const startIndex = (page - 1) * perPage;
        const endIndex = startIndex + perPage;
        const paginatedItems = videos.slice(startIndex, endIndex);
        
        // Convert session media format to video adaptor format
        const formattedItems = paginatedItems.map(video => {
            // Always use base video URL (baseVideoUrl or base_video_url or path/url/src)
            const videoUrl = video.baseVideoUrl || video.base_video_url || video.path || video.url || video.src || '';
            // Don't set thumbnail - we'll use video element for preview
            // Only set thumbnail if there's an actual image thumbnail/poster
            const hasRealThumbnail = video.thumbnail && 
                                    video.thumbnail !== videoUrl && 
                                    video.thumbnail !== video.path &&
                                    video.thumbnail !== video.url &&
                                    video.thumbnail !== video.src;
            const hasRealPoster = video.poster && 
                                 video.poster !== videoUrl &&
                                 video.poster !== video.path &&
                                 video.poster !== video.url &&
                                 video.poster !== video.src;
            return {
                id: video.id,
                title: video.name || video.title || 'Untitled Video',
                // Only set thumbnail if it's a real image, not the video URL itself
                thumbnail: hasRealThumbnail ? video.thumbnail : (hasRealPoster ? video.poster : ''),
                poster: hasRealPoster ? video.poster : '',
                duration: video.duration || video.mediaSrcDuration || 10,
                width: video.width,
                height: video.height,
                // Store the original video object for getVideoUrl
                _sessionVideo: video,
                // Store video URL for direct access (always base video URL)
                file: videoUrl,
                // Flag to indicate this is a session video (for video element rendering)
                _isSessionVideo: true,
                _source: 'local-session-videos',
            };
        });
        
        return {
            items: formattedItems,
            totalCount: videos.length,
            hasMore: endIndex < videos.length
        };
    },
    getVideoUrl: (video, quality = 'hd') => {
        // Get the base video URL from the original session video object
        // Always use base video URL (baseVideoUrl or base_video_url)
        const sessionVideo = video._sessionVideo || video;
        return sessionVideo.baseVideoUrl || sessionVideo.base_video_url || 
               sessionVideo.path || sessionVideo.url || sessionVideo.src || '';
    }
});

/**
 * Get the local session video adaptor instance
 */
export const getLocalSessionVideoAdaptor = () => {
    return createLocalSessionVideoAdaptor();
};

