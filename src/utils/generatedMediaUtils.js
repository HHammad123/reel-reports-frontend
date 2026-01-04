/**
 * Utility functions for handling generated media API responses
 * 
 * New API response format:
 * {
 *   "9:16": {
 *     "Session Title": {
 *       "images": ["url1", "url2"],  // or "videos" for videos API
 *       "updated_at": "2026-01-03T15:31:02.973456"
 *     }
 *   }
 * }
 * 
 * Old format (backward compatible):
 * {
 *   "9:16": {
 *     "Session Title": ["url1", "url2"]
 *   }
 * }
 */

/**
 * Normalizes and sorts generated media/videos data by updated_at (recent to oldest)
 * @param {Object} data - Raw API response data (e.g., generated_images or base_videos)
 * @param {string} mediaType - Type of media: 'images' or 'videos'
 * @returns {Object} Normalized data sorted by updated_at
 */
export const normalizeAndSortGeneratedMedia = (data, mediaType = 'images') => {
  if (!data || typeof data !== 'object') {
    return {};
  }

  const normalized = {};
  const mediaKey = mediaType === 'images' ? 'images' : 'videos';

  // Iterate through aspect ratios
  Object.keys(data).forEach((aspectRatio) => {
    const sessionsForRatio = data[aspectRatio];
    if (!sessionsForRatio || typeof sessionsForRatio !== 'object') {
      return;
    }

    // Convert sessions to array with updated_at for sorting
    const sessionsArray = Object.entries(sessionsForRatio).map(([sessionName, sessionData]) => {
      let mediaArray = [];
      let updatedAt = null;

      // Handle new format: { images/videos: [...], updated_at: "..." }
      if (sessionData && typeof sessionData === 'object' && !Array.isArray(sessionData)) {
        mediaArray = sessionData[mediaKey] || sessionData[mediaType] || [];
        updatedAt = sessionData.updated_at || sessionData.updatedAt || null;
      } 
      // Handle old format: array directly
      else if (Array.isArray(sessionData)) {
        mediaArray = sessionData;
        updatedAt = null; // No timestamp in old format
      }

      return {
        sessionName,
        mediaArray: Array.isArray(mediaArray) ? mediaArray : [],
        updatedAt
      };
    });

    // Sort by updated_at (recent to oldest)
    // Sessions without updated_at go to the end
    sessionsArray.sort((a, b) => {
      if (!a.updatedAt && !b.updatedAt) return 0;
      if (!a.updatedAt) return 1; // a goes after b
      if (!b.updatedAt) return -1; // b goes after a
      return new Date(b.updatedAt) - new Date(a.updatedAt); // Recent first
    });

    // Rebuild the normalized structure with sorted sessions
    normalized[aspectRatio] = {};
    sessionsArray.forEach(({ sessionName, mediaArray }) => {
      normalized[aspectRatio][sessionName] = mediaArray;
    });
  });

  return normalized;
};

/**
 * Normalizes generated_images response
 * @param {Object} responseData - Full API response object
 * @returns {Object} Normalized structure: { generated_images: {...}, generated_videos: {...} }
 */
export const normalizeGeneratedMediaResponse = (responseData) => {
  if (!responseData || typeof responseData !== 'object') {
    return { generated_images: {}, generated_videos: {} };
  }

  return {
    generated_images: normalizeAndSortGeneratedMedia(
      responseData.generated_images || responseData.generatedImages || {},
      'images'
    ),
    generated_videos: normalizeAndSortGeneratedMedia(
      responseData.generated_videos || responseData.generatedVideos || {},
      'videos'
    )
  };
};

/**
 * Normalizes base_videos response
 * @param {Object} responseData - Full API response object
 * @returns {Object} Normalized structure: { base_videos: {...} }
 */
export const normalizeGeneratedBaseVideosResponse = (responseData) => {
  if (!responseData || typeof responseData !== 'object') {
    return { base_videos: {} };
  }

  return {
    base_videos: normalizeAndSortGeneratedMedia(
      responseData.base_videos || responseData.baseVideos || {},
      'videos'
    )
  };
};

