/**
 * Pexels Image Adaptor
 * Transforms Pexels API responses into the standard MediaItem format
 */
export const pexelsImageAdaptor = {
    name: 'pexels-images',
    displayName: 'Pexels Images',
    description: 'High-quality stock images from Pexels',
    supportedTypes: ['image'],
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
        // Add color filter if specified
        if (params.color) {
            searchParams.append('color', params.color);
        }
        // Add size filter if specified
        if (params.size) {
            searchParams.append('size', params.size);
        }
        try {
            const response = await fetch(`https://api.pexels.com/v1/search?${searchParams.toString()}`, {
                headers: {
                    Authorization: apiKey,
                },
            });
            if (!response.ok) {
                throw new Error(`Pexels API error: ${response.status} ${response.statusText}`);
            }
            const data = await response.json();
            // Transform Pexels response to standard format
            const standardImages = data.photos.map(transformPexelsImageToStandard);
            return {
                items: standardImages,
                totalCount: data.total_results,
                hasMore: !!data.next_page,
                nextPage: data.page + 1,
            };
        }
        catch (error) {
            console.error('Error fetching images from Pexels:', error);
            throw error;
        }
    },
    getImageUrl(image, size = 'medium') {
        return image.src[size] || image.src.original;
    },
};
/**
 * Transform a Pexels image response to the standard format
 */
function transformPexelsImageToStandard(pexelsImage) {
    return {
        id: pexelsImage.id,
        type: 'image',
        width: pexelsImage.width,
        height: pexelsImage.height,
        thumbnail: pexelsImage.src.small,
        src: {
            original: pexelsImage.src.original,
            large: pexelsImage.src.large,
            medium: pexelsImage.src.medium,
            small: pexelsImage.src.small,
            thumbnail: pexelsImage.src.tiny,
        },
        alt: pexelsImage.alt,
        attribution: {
            author: pexelsImage.photographer,
            source: 'Pexels',
            license: 'Pexels License',
            url: pexelsImage.url,
        },
    };
}
/**
 * Factory function to create a Pexels image adaptor with API key
 * @param apiKey - Your Pexels API key
 * @returns Configured Pexels image adaptor ready to use
 */
export const createPexelsImageAdaptor = (apiKey) => {
    return {
        ...pexelsImageAdaptor,
        // Override search to pass the API key in config
        async search(params, config) {
            return pexelsImageAdaptor.search(params, { ...config, apiKey });
        }
    };
};
