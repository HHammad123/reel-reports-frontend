/**
 * Utility functions for uploading assets to brand assets API
 * @fileoverview Provides functions to upload images and other assets to the brand assets service
 */

const API_BASE_URL = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1';

/**
 * Gets the user's profile ID from the token
 * @param {string} token - User authentication token
 * @returns {Promise<string|null>} Profile ID or null if not found
 */
export const getProfileId = async (token) => {
  try {
    console.log('[uploadAssets] Getting profile ID for token');
    
    if (!token) {
      console.error('[uploadAssets] No token provided');
      return null;
    }

    // Try to get profile ID from user session data
    const sessionUrl = `${API_BASE_URL}/users/session-data/${encodeURIComponent(token)}`;
    console.log('[uploadAssets] Fetching session data from:', sessionUrl);
    
    const response = await fetch(sessionUrl);
    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('[uploadAssets] Failed to parse session data:', parseError);
      console.log('[uploadAssets] Raw response:', text);
      return null;
    }

    if (!response.ok) {
      console.error('[uploadAssets] Session data fetch failed:', response.status, text);
      return null;
    }

    // Extract profile ID from various possible locations in the response
    const profileId = data?.profile_id || data?.profileId || data?.data?.profile_id || data?.data?.profileId;
    
    if (profileId) {
      console.log('[uploadAssets] Profile ID found:', profileId);
      return profileId;
    }

    console.warn('[uploadAssets] Profile ID not found in response:', data);
    return null;
  } catch (error) {
    console.error('[uploadAssets] Error getting profile ID:', error);
    return null;
  }
};

/**
 * Uploads images to brand assets
 * @param {File[]} files - Array of image files to upload
 * @param {Object} options - Upload options
 * @param {boolean} [options.convertColors=false] - Whether to convert colors in images
 * @param {Function} [options.onProgress] - Progress callback (not currently used but available for future)
 * @returns {Promise<Object>} Upload response data
 * @throws {Error} If upload fails
 */
export const uploadImages = async (files, options = {}) => {
  try {
    console.log('[uploadAssets] Starting image upload, files count:', files?.length || 0);
    
    const { convertColors = false, onProgress } = options;
    
    // Validate input
    if (!files || !Array.isArray(files) || files.length === 0) {
      throw new Error('No files provided for upload');
    }

    // Get token from localStorage
    const token = localStorage.getItem('token');
    if (!token) {
      console.error('[uploadAssets] No token found in localStorage');
      throw new Error('Missing user. Please log in again.');
    }

    // Get profile ID
    console.log('[uploadAssets] Getting profile ID...');
    const profileId = await getProfileId(token);
    if (!profileId) {
      console.error('[uploadAssets] Failed to get profile ID');
      throw new Error('Failed to get profile ID. Please try again.');
    }

    // Create FormData
    const form = new FormData();
    files.forEach((file, index) => {
      console.log(`[uploadAssets] Adding file ${index + 1}:`, file.name, 'Size:', file.size);
      form.append('images', file);
    });
    form.append('convert_colors', String(convertColors));
    console.log('[uploadAssets] FormData created with convert_colors:', convertColors);

    // Upload to API
    const uploadUrl = `${API_BASE_URL}/users/brand-assets/profiles/${encodeURIComponent(token)}/${encodeURIComponent(profileId)}/upload-images`;
    console.log('[uploadAssets] Uploading to:', uploadUrl);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: form
    });

    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('[uploadAssets] Failed to parse upload response:', parseError);
      console.log('[uploadAssets] Raw response:', text);
      data = text;
    }

    if (!response.ok) {
      console.error('[uploadAssets] Upload failed:', response.status, text);
      throw new Error(`Upload failed: ${response.status} ${text}`);
    }

    console.log('[uploadAssets] Upload successful:', data);
    
    // Call progress callback if provided
    if (onProgress && typeof onProgress === 'function') {
      onProgress({ percent: 100, complete: true });
    }

    return data;
  } catch (error) {
    console.error('[uploadAssets] Image upload error:', error);
    throw error;
  }
};

/**
 * Refreshes brand assets data after upload
 * @param {string} token - User authentication token
 * @returns {Promise<Object>} Normalized assets data
 */
export const refreshBrandAssets = async (token) => {
  try {
    console.log('[uploadAssets] Refreshing brand assets data');
    
    if (!token) {
      console.error('[uploadAssets] No token provided for refresh');
      return null;
    }

    // Clear cache
    const cacheKey = `brand_assets_images:${token}`;
    localStorage.removeItem(cacheKey);
    console.log('[uploadAssets] Cleared cache key:', cacheKey);

    // Fetch fresh assets data
    const url = `${API_BASE_URL}/users/brand-assets/images/${encodeURIComponent(token)}`;
    console.log('[uploadAssets] Fetching assets from:', url);
    
    const response = await fetch(url);
    const text = await response.text();
    let data;
    
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      console.error('[uploadAssets] Failed to parse assets response:', parseError);
      console.log('[uploadAssets] Raw response:', text);
      data = {};
    }

    if (!response.ok) {
      console.error('[uploadAssets] Failed to fetch assets:', response.status, text);
      return null;
    }

    console.log('[uploadAssets] Assets data refreshed successfully');
    return data;
  } catch (error) {
    console.error('[uploadAssets] Error refreshing brand assets:', error);
    return null;
  }
};

/**
 * Uploads a blob URL by converting it to a file and uploading it
 * @param {string} blobUrl - Blob URL to upload (starts with "blob:")
 * @param {string} fileName - Optional filename for the uploaded file
 * @param {string} mimeType - Optional MIME type (e.g., 'image/png', 'video/mp4', 'audio/mpeg')
 * @param {string} sessionId - Session ID for the upload
 * @param {Object} metadata - Optional metadata object with purpose and layer_name for the upload
 * @returns {Promise<Object>} Object containing { file_url, layer_name, purpose } from the upload response
 * @throws {Error} If upload fails
 */
export const uploadBlobUrl = async (blobUrl, fileName = null, mimeType = null, sessionId = null, metadata = null) => {
  try {
    console.log('[uploadAssets] Starting blob URL upload:', blobUrl);
    
    if (!blobUrl || !blobUrl.startsWith('blob:')) {
      throw new Error('Invalid blob URL provided');
    }

    // Fetch the blob from the blob URL
    console.log('[uploadAssets] Fetching blob from URL...');
    const blobResponse = await fetch(blobUrl);
    
    if (!blobResponse.ok) {
      throw new Error(`Failed to fetch blob: ${blobResponse.status}`);
    }

    const blob = await blobResponse.blob();
    console.log('[uploadAssets] Blob fetched, size:', blob.size, 'type:', blob.type);

    if (!blob || blob.size === 0) {
      throw new Error('Blob is empty or invalid');
    }

    // Determine file type and name
    // Use provided mimeType, or detect from blob, or default based on blob type
    let detectedMimeType = mimeType;
    if (!detectedMimeType) {
      detectedMimeType = blob.type || 'application/octet-stream';
    }
    
    // Generate filename if not provided
    let detectedFileName = fileName;
    if (!detectedFileName) {
      // Extract extension from MIME type
      const extension = detectedMimeType.split('/')[1] || 'bin';
      // Handle common MIME types
      const extensionMap = {
        'jpeg': 'jpg',
        'svg+xml': 'svg',
        'x-mpeg': 'mp3',
        'mpeg': 'mp3',
        'mp4': 'mp4',
        'quicktime': 'mov'
      };
      const finalExtension = extensionMap[extension] || extension;
      detectedFileName = `upload-${Date.now()}.${finalExtension}`;
    }
    
    console.log('[uploadAssets] Creating file from blob:', {
      fileName: detectedFileName,
      mimeType: detectedMimeType,
      size: blob.size,
      blobType: blob.type
    });

    // Create a File object from the blob
    const file = new File([blob], detectedFileName, {
      type: detectedMimeType,
      lastModified: Date.now()
    });

    // Get session_id if not provided
    const finalSessionId = sessionId || localStorage.getItem('session_id');
    if (!finalSessionId) {
      throw new Error('Session ID is required for upload');
    }

    // Use the new /v1/videos/api/upload-assets endpoint
    console.log('[uploadAssets] Uploading file to /v1/videos/api/upload-assets...');
    
    const formData = new FormData();
    // Append file as 'files' (plural) to match API format
    formData.append('files', file);
    formData.append('session_id', finalSessionId);
    
    // Add metadata as a JSON string array if provided
    // Format: '[{"purpose":"logo","layer_name":"logo"}]'
    if (metadata) {
      // If metadata is already a string, use it directly
      // Otherwise, convert to array format and stringify
      let metadataString;
      if (typeof metadata === 'string') {
        metadataString = metadata;
      } else {
        // Ensure metadata is in array format for the API
        const metadataArray = Array.isArray(metadata) ? metadata : [metadata];
        metadataString = JSON.stringify(metadataArray);
      }
      formData.append('metadata', metadataString);
      console.log('[uploadAssets] Adding metadata:', metadataString);
    }

    const uploadUrl = `${API_BASE_URL}/videos/api/upload-assets`;
    console.log('[uploadAssets] Uploading to:', uploadUrl);
    
    const response = await fetch(uploadUrl, {
      method: 'POST',
      body: formData
    });

    const text = await response.text();
    let uploadData;
    
    try {
      uploadData = JSON.parse(text);
    } catch (parseError) {
      console.error('[uploadAssets] Failed to parse upload response:', parseError);
      console.log('[uploadAssets] Raw response:', text);
      uploadData = text;
    }

    if (!response.ok) {
      console.error('[uploadAssets] Upload failed:', response.status, text);
      throw new Error(`Upload failed: ${response.status} ${text}`);
    }

    console.log('[uploadAssets] Upload successful:', uploadData);

    // Extract the uploaded file info from the response
    // Response structure: { uploaded_files: [{ file_url, layer_name, purpose, ... }] }
    let uploadedFileInfo = null;
    
    if (uploadData) {
      // Check for uploaded_files array (expected format)
      if (uploadData.uploaded_files && Array.isArray(uploadData.uploaded_files) && uploadData.uploaded_files.length > 0) {
        const firstFile = uploadData.uploaded_files[0];
        uploadedFileInfo = {
          file_url: firstFile.file_url,
          layer_name: firstFile.layer_name,
          purpose: firstFile.purpose,
          original_filename: firstFile.original_filename,
          file_type: firstFile.file_type
        };
        console.log('[uploadAssets] Extracted file info from uploaded_files:', uploadedFileInfo);
      }
      // Fallback: Check if response is an array (multiple files uploaded)
      else if (Array.isArray(uploadData) && uploadData.length > 0) {
        const firstItem = uploadData[0];
        uploadedFileInfo = {
          file_url: firstItem.file_url || firstItem.url || firstItem.link,
          layer_name: firstItem.layer_name || metadata?.layer_name,
          purpose: firstItem.purpose || metadata?.purpose,
          original_filename: firstItem.original_filename,
          file_type: firstItem.file_type || mimeType
        };
      } 
      // Fallback: Check if response is an object
      else if (typeof uploadData === 'object') {
        uploadedFileInfo = {
          file_url: uploadData.file_url || uploadData.url || uploadData.link || 
                   uploadData.asset_url || uploadData.uploaded_url ||
                   uploadData.files?.[0]?.file_url || uploadData.files?.[0]?.url ||
                   uploadData.data?.file_url || uploadData.data?.url,
          layer_name: uploadData.layer_name || metadata?.layer_name,
          purpose: uploadData.purpose || metadata?.purpose,
          original_filename: uploadData.original_filename,
          file_type: uploadData.file_type || mimeType
        };
      }
      // Fallback: Check if response is a string (direct URL)
      else if (typeof uploadData === 'string') {
        // Check if it's a valid URL
        if (uploadData.startsWith('http://') || uploadData.startsWith('https://')) {
          uploadedFileInfo = {
            file_url: uploadData,
            layer_name: metadata?.layer_name,
            purpose: metadata?.purpose,
            original_filename: fileName,
            file_type: mimeType
          };
        } else {
          // Might be JSON string, try to parse
          try {
            const parsed = JSON.parse(uploadData);
            if (parsed.uploaded_files && Array.isArray(parsed.uploaded_files) && parsed.uploaded_files.length > 0) {
              const firstFile = parsed.uploaded_files[0];
              uploadedFileInfo = {
                file_url: firstFile.file_url,
                layer_name: firstFile.layer_name,
                purpose: firstFile.purpose,
                original_filename: firstFile.original_filename,
                file_type: firstFile.file_type
              };
            } else if (parsed.file_url || parsed.url || parsed.link) {
              uploadedFileInfo = {
                file_url: parsed.file_url || parsed.url || parsed.link,
                layer_name: parsed.layer_name || metadata?.layer_name,
                purpose: parsed.purpose || metadata?.purpose,
                original_filename: parsed.original_filename || fileName,
                file_type: parsed.file_type || mimeType
              };
            }
          } catch {
            // Not JSON, ignore
          }
        }
      }
    }

    if (!uploadedFileInfo || !uploadedFileInfo.file_url) {
      throw new Error('Upload succeeded but no file_url was returned in the response');
    }

    console.log('[uploadAssets] Blob URL uploaded successfully:', uploadedFileInfo);
    return uploadedFileInfo;
  } catch (error) {
    console.error('[uploadAssets] Error uploading blob URL:', error);
    throw error;
  }
};

/**
 * Normalizes brand assets response data
 * @param {Object} data - Raw API response data
 * @returns {Object} Normalized assets data with arrays for each asset type
 */
export const normalizeBrandAssetsResponse = (data) => {
  try {
    console.log('[uploadAssets] Normalizing brand assets response');
    
    if (!data || typeof data !== 'object') {
      console.warn('[uploadAssets] Invalid data for normalization, returning empty structure');
      return {
        logos: [],
        icons: [],
        uploaded_images: [],
        templates: [],
        documents_images: []
      };
    }

    const normalized = {
      logos: Array.isArray(data.logos) ? data.logos : [],
      icons: Array.isArray(data.icons) ? data.icons : [],
      uploaded_images: Array.isArray(data.uploaded_images) ? data.uploaded_images : [],
      templates: Array.isArray(data.templates) ? data.templates : [],
      documents_images: Array.isArray(data.documents_images) ? data.documents_images : []
    };

    console.log('[uploadAssets] Normalized assets:', {
      logos: normalized.logos.length,
      icons: normalized.icons.length,
      uploaded_images: normalized.uploaded_images.length,
      templates: normalized.templates.length,
      documents_images: normalized.documents_images.length
    });

    return normalized;
  } catch (error) {
    console.error('[uploadAssets] Error normalizing brand assets:', error);
    return {
      logos: [],
      icons: [],
      uploaded_images: [],
      templates: [],
      documents_images: []
    };
  }
};

