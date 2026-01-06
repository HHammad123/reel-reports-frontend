import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { toAbsoluteUrl } from "../../general/url-helper";
import { useEditorContext } from "../../../pro/contexts/editor-context";
import { OverlayType } from "../../../types";

/**
 * Hook to safely use editor context only when available
 */
const useSafeEditorContext = () => {
    try {
        return useEditorContext();
    }
    catch {
        return { baseUrl: undefined };
    }
};

/**
 * VideoPreloader Component
 * 
 * Preloads ALL video files immediately when overlays are available,
 * regardless of when they're scheduled to play (their 'from' frame).
 * This ensures video files start loading in the network tab immediately
 * instead of waiting for Remotion's Sequence to render them.
 * 
 * @param {Object} props
 * @param {Array} props.overlays - Array of all overlays
 * @param {string} props.baseUrl - Base URL for resolving relative URLs
 */
export const VideoPreloader = ({ overlays = [], baseUrl }) => {
    const { baseUrl: contextBaseUrl } = useSafeEditorContext();
    // Resolve baseUrl: use prop first, then context, then fallback to window.location.origin
    const resolvedBaseUrl = baseUrl || contextBaseUrl || (typeof window !== 'undefined' ? window.location.origin : undefined);
    const preloadedVideoRef = useRef(new Set()); // Track which video URLs we've already preloaded
    const videoElementsRef = useRef(new Map()); // Store video elements to prevent garbage collection
    const activePreloadsRef = useRef(0); // Track concurrent preload operations
    const MAX_CONCURRENT_PRELOADS = 2; // Limit concurrent video preloads (lower than audio due to larger file sizes)
    
    useEffect(() => {
        // Filter to only video overlays
        const videoOverlays = overlays.filter(overlay => {
            // Must have a valid src
            if (!overlay?.src || overlay.src.trim() === '') {
                return false;
            }
            
            const overlayType = overlay?.type;
            const overlayTypeString = String(overlayType || '').toLowerCase();
            
            // Check if it's a video overlay
            const isVideo = (
                overlayType === OverlayType.VIDEO ||
                overlayTypeString === 'video' ||
                overlayType === 'video'
            );
            
            return isVideo;
        });
        
        if (videoOverlays.length === 0) {
            return;
        }
        
        // Helper function to preload a single video overlay
        const preloadVideoOverlay = (overlay) => {
            const videoSrc = overlay.src;
            if (!videoSrc || videoSrc.trim() === '') {
                return;
            }
            
            // Determine the final video source URL
            let finalVideoSrc = videoSrc;
            if (videoSrc.startsWith("http://") || videoSrc.startsWith("https://") || videoSrc.startsWith("blob:")) {
                // Already absolute URL, use as-is
                finalVideoSrc = videoSrc;
            } else if (videoSrc.startsWith("/api/")) {
                // API route - use toAbsoluteUrl
                finalVideoSrc = toAbsoluteUrl(videoSrc, resolvedBaseUrl);
            } else if (videoSrc.startsWith("/")) {
                // Relative URL starting with /
                finalVideoSrc = toAbsoluteUrl(videoSrc, resolvedBaseUrl);
            } else {
                // Relative URL without /
                finalVideoSrc = toAbsoluteUrl(videoSrc, resolvedBaseUrl);
            }
            
            // Skip if already preloaded (to avoid duplicate network requests)
            if (preloadedVideoRef.current.has(finalVideoSrc)) {
                return;
            }
            
            // OPTIMIZED: Limit concurrent preloads to prevent browser overload
            if (activePreloadsRef.current >= MAX_CONCURRENT_PRELOADS) {
                // Queue video if we're at the limit
                setTimeout(() => preloadVideoOverlay(overlay), 500);
                return;
            }
            
            // Mark as preloaded immediately to prevent duplicates
            preloadedVideoRef.current.add(finalVideoSrc);
            activePreloadsRef.current++;
            
            // METHOD 1: Use fetch to trigger network request (appears in network tab)
            fetch(finalVideoSrc, { 
                method: 'GET',
                credentials: 'same-origin'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
                // Read the response to ensure the request completes
                return response.blob();
            })
            .then(blob => {
                // Store the blob URL for later use
                const blobUrl = URL.createObjectURL(blob);
                videoElementsRef.current.set(finalVideoSrc, { blobUrl, blob });
                activePreloadsRef.current--;
            })
            .catch(error => {
                // Silently handle errors - video will still try to load via video element
                activePreloadsRef.current--;
            });
            
            // METHOD 2: Also create video element for browser caching (backup method)
            // Check if video element already exists to prevent duplicates
            const existingVideo = videoElementsRef.current.get(finalVideoSrc)?.video;
            if (existingVideo && existingVideo.parentNode) {
                // Video element already exists and is in DOM, skip creating duplicate
                return;
            }
            
            // CRITICAL: This ensures video is preloaded and cached by browser
            const video = document.createElement('video');
            video.preload = 'auto'; // Preload entire file
            video.crossOrigin = 'anonymous';
            video.src = finalVideoSrc;
            video.muted = true; // Mute to allow autoplay in some browsers
            video.playsInline = true; // Important for mobile
            
            // Set buffering properties for better playback performance
            video.setAttribute('preload', 'auto');
            
            // Add video element to DOM temporarily to ensure it's loaded (some browsers need this)
            video.style.display = 'none';
            video.style.position = 'absolute';
            video.style.visibility = 'hidden';
            video.style.width = '0';
            video.style.height = '0';
            document.body.appendChild(video);
            
            // Store video element reference
            videoElementsRef.current.set(finalVideoSrc, { 
                video, 
                ...(videoElementsRef.current.get(finalVideoSrc) || {})
            });
            
            // Set up event listeners to track loading
            const handleError = () => {
                // Silently handle errors
            };
            
            const handleCanPlay = () => {
                // Ensure video is buffered enough for smooth playback
            };
            
            video.addEventListener('error', handleError);
            video.addEventListener('canplay', handleCanPlay);
            video.addEventListener('progress', handleCanPlay); // Track buffering progress
            video.addEventListener('loadedmetadata', () => {
                // Metadata loaded - video is ready
            });
            
            // Explicitly call load() to trigger network request immediately
            // This triggers the network request that appears in the network tab
            video.load();
            
            // Remove from DOM after loading starts (keep in memory for cache)
            // Increased timeout to allow more buffering time
            setTimeout(() => {
                try {
                    if (video.parentNode) {
                        video.parentNode.removeChild(video);
                    }
                } catch (e) {
                    // Ignore errors removing from DOM
                }
            }, 3000); // Allow 3 seconds for buffering
        };
        
        // Sort videos by their start frame to prioritize early videos
        const sortedVideoOverlays = [...videoOverlays].sort((a, b) => {
            const aFrom = a.from || 0;
            const bFrom = b.from || 0;
            return aFrom - bFrom;
        });
        
        // Preload all videos immediately
        sortedVideoOverlays.forEach(preloadVideoOverlay);
        
        // OPTIMIZED: Cleanup function with blob URL cleanup
        return () => {
            // Remove video elements from DOM and clean up blob URLs
            videoElementsRef.current.forEach((value, url) => {
                // Clean up blob URLs to prevent memory leaks
                if (value?.blobUrl) {
                    try {
                        URL.revokeObjectURL(value.blobUrl);
                    } catch (e) {
                        // Ignore errors revoking blob URLs
                    }
                }
                
                if (value?.video && value.video.parentNode) {
                    try {
                        value.video.parentNode.removeChild(value.video);
                    } catch (e) {
                        // Ignore errors
                    }
                }
            });
            // Clear all refs to free memory
            videoElementsRef.current.clear();
            activePreloadsRef.current = 0;
        };
    }, [overlays, resolvedBaseUrl]); // Re-run when overlays change
    
    // This component doesn't render anything visible
    return null;
};

