/**
 * Session Images Adaptor
 * Fetches images from user session data and displays them in the Image tab
 */
export const sessionImagesAdaptor = {
    name: 'session-images',
    displayName: 'Session Images',
    description: 'Images from your session',
    supportedTypes: ['image'],
    requiresAuth: false,
    async search(params, config) {
        try {
            // Fetch session data
            const sessionId = localStorage.getItem('session_id');
            const userId = localStorage.getItem('token');
            
            if (!sessionId || !userId) {
                return {
                    items: [],
                    totalCount: 0,
                    hasMore: false,
                };
            }
            
            const response = await fetch(
                'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ user_id: userId, session_id: sessionId })
                }
            );
            
            if (!response.ok) {
                console.error('Failed to fetch session images:', response.status);
                return {
                    items: [],
                    totalCount: 0,
                    hasMore: false,
                };
            }
            
            const text = await response.text();
            let data;
            try {
                data = JSON.parse(text);
            } catch (_) {
                data = text;
            }
            
            const sessionData = data?.session_data || data?.session || {};
            const images = Array.isArray(sessionData?.images) ? sessionData.images : [];
            
            // Transform session images to standard format
            const standardImages = images.map((img, idx) => {
                // Handle different image formats from session data
                const imageUrl = typeof img === 'string' 
                    ? img 
                    : (img?.image_url || img?.imageUrl || img?.url || img?.src || img?.ref_image?.[0] || '');
                
                if (!imageUrl) return null;
                
                // Extract image frames if available
                const imageFrames = Array.isArray(img?.imageFrames) ? img.imageFrames : [];
                const firstFrame = imageFrames[0] || {};
                const frameImageUrl = firstFrame?.image_url || firstFrame?.url || firstFrame?.src || imageUrl;
                
                return {
                    id: `session-img-${idx}`,
                    type: 'image',
                    width: img?.width || firstFrame?.width || 1920,
                    height: img?.height || firstFrame?.height || 1080,
                    thumbnail: frameImageUrl,
                    src: {
                        original: frameImageUrl,
                        large: frameImageUrl,
                        medium: frameImageUrl,
                        small: frameImageUrl,
                        thumbnail: frameImageUrl,
                    },
                    alt: img?.scene_title || img?.title || `Session Image ${idx + 1}`,
                    attribution: {
                        author: 'Session',
                        source: 'User Session',
                        license: 'User Content',
                    },
                    _session: true,
                    _sessionImage: true,
                    _source: 'session-images',
                    sceneNumber: img?.scene_number || img?.sceneNumber || (idx + 1),
                };
            }).filter(Boolean); // Remove null entries
            
            // Also include logos from window.__SESSION_MEDIA_FILES
            let logoImages = [];
            if (typeof window !== 'undefined' && Array.isArray(window.__SESSION_MEDIA_FILES)) {
                logoImages = window.__SESSION_MEDIA_FILES
                    .filter(item => item.type === 'image' && item._isLogo && item.url)
                    .map((logo, idx) => ({
                        id: logo.id || `session-logo-${idx}`,
                        type: 'image',
                        width: 1920,
                        height: 1080,
                        thumbnail: logo.url || logo.path || logo.src || '',
                        src: {
                            original: logo.url || logo.path || logo.src || '',
                            large: logo.url || logo.path || logo.src || '',
                            medium: logo.url || logo.path || logo.src || '',
                            small: logo.url || logo.path || logo.src || '',
                            thumbnail: logo.url || logo.path || logo.src || '',
                        },
                        alt: logo.title || logo.name || `Logo ${idx + 1}`,
                        attribution: {
                            author: 'Session',
                            source: 'User Session',
                            license: 'User Content',
                        },
                        _session: true,
                        _isLogo: true,
                        _logoImage: true,
                        _source: 'session-images',
                    }));
            }
            
            // Fetch generated images from generate-media API
            let generatedImages = [];
            try {
                const generatedMediaResponse = await fetch(
                    `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/user/${encodeURIComponent(userId)}/generated-media`,
                    {
                        method: 'GET',
                        headers: { 'Content-Type': 'application/json' }
                    }
                );
                
                if (generatedMediaResponse.ok) {
                    const generatedMediaText = await generatedMediaResponse.text();
                    let generatedMediaData;
                    try {
                        generatedMediaData = JSON.parse(generatedMediaText);
                    } catch (_) {
                        generatedMediaData = generatedMediaText;
                    }
                    
                    // Normalize and sort generated images
                    const { normalizeGeneratedMediaResponse } = await import('../../../../utils/generatedMediaUtils');
                    const normalized = normalizeGeneratedMediaResponse(generatedMediaData || {});
                    const generatedImagesData = normalized.generated_images || {};
                    
                    // Transform generated images to standard format
                    // Only include images from the current session
                    Object.keys(generatedImagesData).forEach((aspectRatio) => {
                        const sessionsForRatio = generatedImagesData[aspectRatio];
                        if (typeof sessionsForRatio === 'object' && sessionsForRatio !== null && !Array.isArray(sessionsForRatio)) {
                            // Handle new structure: sessionsForRatio is an object with session names as keys
                            Object.entries(sessionsForRatio).forEach(([sessionName, images]) => {
                                // Filter: Only include images from current session
                                // Session name might match session ID or contain it
                                const sessionNameLower = String(sessionName || '').toLowerCase();
                                const sessionIdLower = String(sessionId || '').toLowerCase();
                                const isCurrentSession = sessionNameLower === sessionIdLower || 
                                                       sessionNameLower.includes(sessionIdLower) ||
                                                       sessionIdLower.includes(sessionNameLower);
                                
                                if (!isCurrentSession) return; // Skip images from other sessions
                                
                                if (Array.isArray(images)) {
                                    images.forEach((imgUrl, idx) => {
                                        let imageUrl = '';
                                        let imageName = `${sessionName} - Image ${idx + 1}`;
                                        
                                        if (typeof imgUrl === 'string' && imgUrl) {
                                            imageUrl = imgUrl;
                                        } else if (imgUrl && typeof imgUrl === 'object') {
                                            // Handle object format
                                            imageUrl = imgUrl.image_url || imgUrl.url || imgUrl.src || '';
                                            imageName = imgUrl.name || imgUrl.title || imageName;
                                        }
                                        
                                        if (imageUrl) {
                                            generatedImages.push({
                                                id: `generated-img-${aspectRatio}-${sessionName}-${idx}`,
                                                type: 'image',
                                                width: 1920,
                                                height: 1080,
                                                thumbnail: imageUrl,
                                                src: {
                                                    original: imageUrl,
                                                    large: imageUrl,
                                                    medium: imageUrl,
                                                    small: imageUrl,
                                                    thumbnail: imageUrl,
                                                },
                                                alt: imageName,
                                                attribution: {
                                                    author: 'Generated',
                                                    source: 'Generated Media',
                                                    license: 'User Content',
                                                },
                                                _session: true,
                                                _generated: true,
                                                _sessionImage: true,
                                                _aspectRatio: aspectRatio,
                                                _sessionName: sessionName,
                                                _sessionId: sessionId,
                                            });
                                        }
                                    });
                                }
                            });
                        } else if (Array.isArray(sessionsForRatio)) {
                            // Legacy format: aspectRatio directly contains array of images
                            // For legacy format, include all images (no session filtering)
                            sessionsForRatio.forEach((imgUrl, idx) => {
                                if (typeof imgUrl === 'string' && imgUrl) {
                                    generatedImages.push({
                                        id: `generated-img-${aspectRatio}-${idx}`,
                                        type: 'image',
                                        width: 1920,
                                        height: 1080,
                                        thumbnail: imgUrl,
                                        src: {
                                            original: imgUrl,
                                            large: imgUrl,
                                            medium: imgUrl,
                                            small: imgUrl,
                                            thumbnail: imgUrl,
                                        },
                                        alt: `Generated Image (${aspectRatio}) ${idx + 1}`,
                                        attribution: {
                                            author: 'Generated',
                                            source: 'Generated Media',
                                            license: 'User Content',
                                        },
                                        _session: true,
                                        _generated: true,
                                        _sessionImage: true,
                                        _aspectRatio: aspectRatio,
                                        _sessionId: sessionId,
                                    });
                                }
                            });
                        }
                    });
                }
            } catch (error) {
                console.error('Error fetching generated images:', error);
                // Continue with other images even if generated images fail
            }
            
            // Combine session images with logos and generated images
            const allImages = [...standardImages, ...logoImages, ...generatedImages];
            
            // Filter by search query if provided
            let filteredImages = allImages;
            if (params.query && params.query.trim()) {
                const query = params.query.toLowerCase();
                filteredImages = allImages.filter(img => 
                    (img.alt && img.alt.toLowerCase().includes(query)) ||
                    (img.sceneNumber && String(img.sceneNumber).includes(query))
                );
            }
            
            // Apply pagination
            const page = params.page || 1;
            const perPage = params.perPage || 50;
            const startIndex = (page - 1) * perPage;
            const endIndex = startIndex + perPage;
            const paginatedImages = filteredImages.slice(startIndex, endIndex);
            
            return {
                items: paginatedImages,
                totalCount: filteredImages.length,
                hasMore: endIndex < filteredImages.length,
                nextPage: endIndex < filteredImages.length ? page + 1 : null,
            };
        } catch (error) {
            console.error('Error fetching session images:', error);
            return {
                items: [],
                totalCount: 0,
                hasMore: false,
            };
        }
    },
    getImageUrl(image, size = 'medium') {
        return image.src[size] || image.src.original;
    },
};

