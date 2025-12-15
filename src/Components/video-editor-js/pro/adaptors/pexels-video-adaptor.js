/**
 * Pexels Video Adaptor
 * Transforms Pexels Video API responses into the standard MediaItem format
 */
export const pexelsVideoAdaptor = {
    name: 'pexels-videos',
    displayName: 'Pexels Videos',
    description: 'High-quality stock videos from Pexels',
    supportedTypes: ['video'],
    requiresAuth: true,
    authFields: [
        {
            key: 'apiKey',
            label: 'Pexels API Key',
            type: 'password',
            required: true,
            placeholder: 'Enter your Pexels API key',
        },
    ],
    async search(params, config) {
        const apiKey = config === null || config === void 0 ? void 0 : config.apiKey;
        if (!apiKey) {
            throw new Error('Pexels API key is required');
        }
        const searchParams = new URLSearchParams({
            query: params.query,
            per_page: (params.perPage || 20).toString(),
            page: (params.page || 1).toString(),
        });
        // Add orientation filter if specified
        if (params.orientation) {
            searchParams.append('orientation', params.orientation);
        }
        // Add size filter if specified - map to Pexels video sizes
        if (params.size) {
            const sizeMap = {
                small: 'small',
                medium: 'medium',
                large: 'large',
            };
            searchParams.append('size', sizeMap[params.size] || 'medium');
        }
        try {
            const response = await fetch(`https://api.pexels.com/videos/search?${searchParams.toString()}`, {
                headers: {
                    Authorization: apiKey,
                },
            });
            if (!response.ok) {
                throw new Error(`Pexels Video API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            // Transform Pexels response to standard format
            const standardVideos = data.videos.map(transformPexelsVideoToStandard);
            return {
                items: standardVideos,
                totalCount: data.total_results,
                hasMore: !!data.next_page,
                nextPage: data.page + 1,
            };
        }
        catch (error) {
            console.error('Error fetching videos from Pexels:', error);
            throw error;
        }
    },
    getVideoUrl(video, quality = 'hd') {
        var _a;
        const qualityFile = video.videoFiles.find(file => file.quality === quality);
        return (qualityFile === null || qualityFile === void 0 ? void 0 : qualityFile.url) || ((_a = video.videoFiles[0]) === null || _a === void 0 ? void 0 : _a.url) || '';
    },
    getThumbnailUrl(video) {
        return video.thumbnail;
    },
};
/**
 * Transform a Pexels video response to the standard format
 */
function transformPexelsVideoToStandard(pexelsVideo) {
    // Map Pexels quality names to standard quality names
    const qualityMap = {
        'uhd': 'uhd',
        'hd': 'hd',
        'sd': 'sd',
        'mobile': 'low',
    };
    const videoFiles = pexelsVideo.video_files.map(file => ({
        quality: qualityMap[file.quality.toLowerCase()] || 'sd',
        format: file.file_type,
        url: file.link,
    }));
    return {
        id: pexelsVideo.id,
        type: 'video',
        width: pexelsVideo.width,
        height: pexelsVideo.height,
        thumbnail: pexelsVideo.image,
        duration: pexelsVideo.duration,
        videoFiles,
        attribution: {
            author: pexelsVideo.user.name,
            source: 'Pexels',
            license: 'Pexels License',
            url: pexelsVideo.url,
        },
    };
}
/**
 * Factory function to create a Pexels video adaptor with API key
 * @param apiKey - Your Pexels API key
 * @returns Configured Pexels video adaptor ready to use
 */
export const createPexelsVideoAdaptor = (apiKey) => {
    return {
        ...pexelsVideoAdaptor,
        // Override search to pass the API key in config
        async search(params, config) {
            return pexelsVideoAdaptor.search(params, { ...config, apiKey });
        }
    };
};
