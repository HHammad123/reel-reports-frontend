/**
 * AssetUploadSection Component
 * @fileoverview Component for uploading images to brand assets
 * @description Allows users to upload multiple images to their brand assets library
 */

import React, { useState, useRef, useCallback } from 'react';
import { uploadImages, refreshBrandAssets, normalizeBrandAssetsResponse } from '../../utils/uploadAssets';

/**
 * AssetUploadSection Component
 * @param {Object} props - Component props
 * @param {Function} [props.onUploadSuccess] - Callback when upload succeeds
 * @param {Function} [props.onUploadError] - Callback when upload fails
 * @param {boolean} [props.showConvertColors=false] - Whether to show color conversion option
 * @returns {JSX.Element} Asset upload section component
 */
const AssetUploadSection = ({ 
  onUploadSuccess, 
  onUploadError,
  showConvertColors = false 
}) => {
  // State management
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [convertColors, setConvertColors] = useState(false);
  
  // File input reference
  const fileInputRef = useRef(null);

  /**
   * Handles file selection and upload
   * @param {Event} event - File input change event
   */
  const handleFileChange = useCallback(async (event) => {
    const files = Array.from(event.target.files || []);
    
    if (files.length === 0) {
      console.log('[AssetUploadSection] No files selected');
      return;
    }

    console.log('[AssetUploadSection] Files selected:', files.length);
    
    // Reset states
    setUploadError('');
    setUploadSuccess(false);
    setIsUploading(true);

    try {
      // Upload images using utility function
      console.log('[AssetUploadSection] Starting upload...');
      const uploadData = await uploadImages(files, { 
        convertColors,
        onProgress: (progress) => {
          console.log('[AssetUploadSection] Upload progress:', progress);
        }
      });

      console.log('[AssetUploadSection] Upload successful, refreshing assets...');
      
      // Refresh brand assets data
      const token = localStorage.getItem('token');
      if (token) {
        const refreshedData = await refreshBrandAssets(token);
        if (refreshedData) {
          const normalized = normalizeBrandAssetsResponse(refreshedData);
          console.log('[AssetUploadSection] Assets refreshed:', normalized);
        }
      }

      // Show success message
      setUploadSuccess(true);
      setTimeout(() => {
        setUploadSuccess(false);
      }, 3000);

      // Clear file input
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }

      // Call success callback if provided
      if (onUploadSuccess && typeof onUploadSuccess === 'function') {
        onUploadSuccess(uploadData);
      }

      console.log('[AssetUploadSection] Upload process completed successfully');
    } catch (error) {
      console.error('[AssetUploadSection] Upload failed:', error);
      
      const errorMessage = error?.message || 'Failed to upload images. Please try again.';
      setUploadError(errorMessage);

      // Call error callback if provided
      if (onUploadError && typeof onUploadError === 'function') {
        onUploadError(error);
      }
    } finally {
      setIsUploading(false);
    }
  }, [convertColors, onUploadSuccess, onUploadError]);

  /**
   * Handles click on upload area to trigger file input
   */
  const handleUploadClick = useCallback(() => {
    if (isUploading) {
      console.log('[AssetUploadSection] Upload in progress, ignoring click');
      return;
    }
    
    if (fileInputRef.current) {
      console.log('[AssetUploadSection] Triggering file input');
      fileInputRef.current.click();
    }
  }, [isUploading]);

  /**
   * Handles drag and drop events
   */
  const handleDragOver = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDragLeave = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
  }, []);

  const handleDrop = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();

    if (isUploading) {
      console.log('[AssetUploadSection] Upload in progress, ignoring drop');
      return;
    }

    const files = Array.from(event.dataTransfer.files || []);
    const imageFiles = files.filter(file => file.type.startsWith('image/'));
    
    if (imageFiles.length === 0) {
      console.log('[AssetUploadSection] No image files in drop');
      setUploadError('Please drop image files only');
      return;
    }

    console.log('[AssetUploadSection] Files dropped:', imageFiles.length);
    
    // Create a synthetic event to reuse handleFileChange logic
    const syntheticEvent = {
      target: {
        files: imageFiles
      }
    };
    
    handleFileChange(syntheticEvent);
  }, [isUploading, handleFileChange]);

  return (
    <div className="mx-4 mb-3">
      <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
        {/* Header */}
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-semibold text-[#13008B]">Upload Assets</h4>
          {showConvertColors && (
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={convertColors}
                onChange={(e) => {
                  console.log('[AssetUploadSection] Convert colors toggled:', e.target.checked);
                  setConvertColors(e.target.checked);
                }}
                disabled={isUploading}
                className="w-4 h-4 text-[#13008B] border-gray-300 rounded focus:ring-[#13008B]"
              />
              <span className="text-xs text-gray-600">Convert colors</span>
            </label>
          )}
        </div>

        {/* Upload Area */}
        <div
          onClick={handleUploadClick}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={`
            border-2 border-dashed rounded-lg p-6 text-center transition-colors
            ${isUploading 
              ? 'border-gray-300 bg-gray-50 cursor-not-allowed' 
              : 'border-gray-300 hover:border-[#13008B] bg-gray-50 hover:bg-indigo-50 cursor-pointer'
            }
          `}
        >
          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleFileChange}
            disabled={isUploading}
            className="hidden"
            id="asset-upload-input"
          />

          {/* Upload icon and text */}
          <div className="flex flex-col items-center gap-2">
            {isUploading ? (
              <>
                <div className="w-12 h-12 rounded-full bg-[#13008B] bg-opacity-10 flex items-center justify-center">
                  <svg 
                    className="animate-spin h-6 w-6 text-[#13008B]" 
                    xmlns="http://www.w3.org/2000/svg" 
                    fill="none" 
                    viewBox="0 0 24 24"
                  >
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    />
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                </div>
                <p className="text-sm text-gray-600">Uploading images...</p>
              </>
            ) : (
              <>
                <svg 
                  className="w-12 h-12 text-gray-400" 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path 
                    strokeLinecap="round" 
                    strokeLinejoin="round" 
                    strokeWidth={2} 
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                <div>
                  <p className="text-sm font-medium text-gray-700">
                    Click to upload or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    PNG, JPG, GIF up to 10MB (Multiple images allowed)
                  </p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Success Message */}
        {uploadSuccess && (
          <div className="mt-3 p-2 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-xs text-green-700 flex items-center gap-2">
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M5 13l4 4L19 7"
                />
              </svg>
              Images uploaded successfully!
            </p>
          </div>
        )}

        {/* Error Message */}
        {uploadError && (
          <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-xs text-red-700 flex items-center gap-2">
              <svg 
                className="w-4 h-4" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
              {uploadError}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default AssetUploadSection;

