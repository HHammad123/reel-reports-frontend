import React from 'react';
import LoadingAnimationGif from '../asset/loading.gif';

/**
 * Reusable Loader Component
 * 
 * Displays a consistent loading animation with the loading.gif at the top
 * and customizable content below.
 * 
 * @param {Object} props
 * @param {string} props.title - Main title text displayed below the animation
 * @param {string} props.description - Optional description text below the title
 * @param {string|React.ReactNode} props.children - Optional custom content to display
 * @param {boolean} props.fullScreen - If true, displays as full-screen overlay (default: false)
 * @param {string} props.overlayBg - Background color for overlay (default: 'bg-black/30')
 * @param {string} props.zIndex - Z-index for full-screen overlay (default: 'z-50')
 * @param {string} props.videoSize - Size of the animation (default: 'w-20 h-20')
 * @param {string} props.containerClass - Additional classes for the container
 * @param {number} props.progress - Progress percentage (0-100) to display in progress bar
 */
const Loader = ({
  title,
  description,
  children,
  fullScreen = false,
  overlayBg = 'bg-black/30',
  zIndex = 'z-50',
  videoSize = 'w-20 h-20',
  containerClass = '',
  progress = null,
}) => {
  const content = (
    <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center space-y-4 ${containerClass}`}>
      {/* Loading Animation GIF at the top */}
      <div className={`relative ${videoSize} flex items-center justify-center`}>
        <img
          src={LoadingAnimationGif}
          alt="Loading..."
          className="w-full h-full object-contain"
        />
      </div>
      
      {/* Content below the animation */}
      <div className="space-y-2 w-full">
        {title && (
          <p className="text-lg font-semibold text-[#13008B]">{title}</p>
        )}
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
        )}
        
        {/* Progress Bar - appears below title/description */}
        {progress !== null && (
          <div className="w-full max-w-xs mx-auto mt-3">
            <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
              <div
                className="bg-[#13008B] h-2 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
              />
            </div>
            <p className="text-xs text-gray-600 mt-1">{Math.min(100, Math.max(0, Math.round(progress)))}%</p>
          </div>
        )}
        
        {children}
      </div>
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 ${zIndex} flex items-center justify-center ${overlayBg}`}>
        {content}
      </div>
    );
  }

  return content;
};

export default Loader;

