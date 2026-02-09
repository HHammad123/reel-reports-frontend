import React, { useState, useEffect, useRef } from 'react';
import LoadingAnimationGif from '../asset/loadingv2.gif';

/**
 * Reusable Loader Component with simulated progress and completion animation.
 * 
 * @param {Object} props
 * @param {string} props.title - Main title text
 * @param {string} props.description - Subtitle text
 * @param {string} props.status - Status text (e.g. PROCESSING_SORA)
 * @param {boolean} props.isOpen - Controls visibility. If provided, handles exit animation.
 * @param {boolean} props.simulateProgress - If true, internal progress simulates 0-95%.
 * @param {number} props.progress - External progress value (0-100). Ignored if simulateProgress is true.
 * @param {boolean} props.fullScreen - Display as overlay (default: true if isOpen is used)
 */
const Loader = ({
  title,
  description,
  children,
  fullScreen = true,
  overlayBg = 'bg-black/50',
  zIndex = 'z-[100]',
  videoSize = 'w-16 h-16',
  containerClass = '',
  progress: externalProgress = 0,
  isOpen = true,
  simulateProgress = false,
  status = '',
  onClose
}) => {
  const [isVisible, setIsVisible] = useState(isOpen);
  const [internalProgress, setInternalProgress] = useState(0);
  const [isClosing, setIsClosing] = useState(false);
  const progressInterval = useRef(null);

  // Handle Visibility and Completion Logic
  useEffect(() => {
    if (isOpen) {
      setIsVisible(true);
      setIsClosing(false);
      setInternalProgress(0);

      if (simulateProgress) {
        // Simulate progress 0 -> 95%
        const duration = 30000; // 30s to reach 95%
        const interval = 200;
        const steps = duration / interval;
        const increment = 95 / steps;
        
        progressInterval.current = setInterval(() => {
          setInternalProgress(prev => {
            if (prev >= 95) return 95;
            return prev + increment;
          });
        }, interval);
      }
    } else {
      // isOpen became false -> Complete the progress
      if (progressInterval.current) clearInterval(progressInterval.current);
      
      // Jump to 100%
      setInternalProgress(100);
      setIsClosing(true);

      // Wait then hide
      const timer = setTimeout(() => {
        setIsVisible(false);
        setIsClosing(false);
        if (onClose) onClose();
      }, 800); // Show 100% for 800ms

      return () => clearTimeout(timer);
    }

    return () => {
      if (progressInterval.current) clearInterval(progressInterval.current);
    };
  }, [isOpen, simulateProgress, onClose]);

  // Use internal progress if simulating or closing, otherwise external
  const currentProgress = (simulateProgress || isClosing) ? internalProgress : externalProgress;

  if (!isVisible) return null;

  const content = (
    <div className={`bg-white rounded-2xl shadow-2xl w-full max-w-md p-8 flex flex-col items-center text-center ${containerClass}`}>
      {/* Icon / Animation */}
      <div className={`relative ${videoSize} mb-4 flex items-center justify-center`}>
        <img
          src={LoadingAnimationGif}
          alt="Loading..."
          className="w-full h-full object-contain"
        />
      </div>

      {/* Title */}
      {title && (
        <h3 className="text-xl font-bold text-[#13008B] mb-2">{title}</h3>
      )}

      {/* Description */}
      {description && (
        <p className="text-sm text-gray-500 mb-6 px-4">{description}</p>
      )}

      {/* Progress Bar */}
      <div className="w-full px-4 mb-1">
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="bg-[#13008B] h-2 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${Math.min(100, Math.max(0, currentProgress))}%` }}
          />
        </div>
      </div>

      {/* Percentage */}
      <div className="text-sm font-medium text-gray-700 mt-2">
        {Math.round(currentProgress)}%
      </div>

      {children}
    </div>
  );

  if (fullScreen) {
    return (
      <div className={`fixed inset-0 ${zIndex} flex items-center justify-center ${overlayBg} transition-opacity duration-300 ${isClosing ? 'opacity-0' : 'opacity-100'}`} style={{ transitionDelay: isClosing ? '500ms' : '0ms' }}>
        {content}
      </div>
    );
  }

  return content;
};

export default Loader;

