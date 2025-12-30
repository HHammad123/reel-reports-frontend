import React from 'react';
import LoadingAnimationVideo from '../asset/Loading animation.mp4';

/**
 * Reusable Loader Component
 * 
 * Displays a consistent loading animation with the Loading animation.mp4 video at the top
 * and customizable content below.
 * 
 * @param {Object} props
 * @param {string} props.title - Main title text displayed below the video
 * @param {string} props.description - Optional description text below the title
 * @param {string|React.ReactNode} props.children - Optional custom content to display
 * @param {boolean} props.fullScreen - If true, displays as full-screen overlay (default: false)
 * @param {string} props.overlayBg - Background color for overlay (default: 'bg-black/30')
 * @param {string} props.zIndex - Z-index for full-screen overlay (default: 'z-50')
 * @param {string} props.videoSize - Size of the video (default: 'w-20 h-20')
 * @param {string} props.containerClass - Additional classes for the container
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
}) => {
  const content = (
    <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center space-y-4 ${containerClass}`}>
      {/* Loading Animation Video at the top */}
      <div className={`relative ${videoSize} flex items-center justify-center`}>
        <video
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-contain"
        >
          <source src={LoadingAnimationVideo} type="video/mp4" />
        </video>
      </div>
      
      {/* Content below the video */}
      <div className="space-y-2">
        {title && (
          <p className="text-lg font-semibold text-[#13008B]">{title}</p>
        )}
        {description && (
          <p className="text-sm text-gray-600">{description}</p>
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

