import { useState, useEffect, useRef } from 'react';

/**
 * Custom hook to simulate progress bar for loaders
 * Progress increases from 0 to a target value over time
 * 
 * @param {boolean} isActive - Whether the loader is active
 * @param {number} targetProgress - Target progress percentage (0-100), default 95
 * @param {number} duration - Duration in milliseconds to reach target, default 30000 (30 seconds)
 * @param {number} intervalMs - Update interval in milliseconds, default 300
 * @returns {number} Current progress value (0-100)
 */
export const useProgressLoader = (
  isActive,
  targetProgress = 95,
  duration = 30000,
  intervalMs = 300
) => {
  const [progress, setProgress] = useState(0);
  const intervalRef = useRef(null);
  const startTimeRef = useRef(null);

  useEffect(() => {
    if (isActive) {
      // Reset progress when loader becomes active
      setProgress(0);
      startTimeRef.current = Date.now();

      // Calculate progress increment per interval
      const increments = duration / intervalMs;
      const incrementPerStep = targetProgress / increments;

      intervalRef.current = setInterval(() => {
        const elapsed = Date.now() - startTimeRef.current;
        const newProgress = Math.min(
          targetProgress,
          (elapsed / duration) * targetProgress
        );
        setProgress(newProgress);
      }, intervalMs);
    } else {
      // Reset progress when loader becomes inactive
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      setProgress(0);
      startTimeRef.current = null;
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, targetProgress, duration, intervalMs]);

  return Math.min(100, Math.max(0, Math.round(progress)));
};

