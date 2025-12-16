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
 * AudioPreloader Component
 * 
 * Preloads ALL audio files immediately when overlays are available,
 * regardless of when they're scheduled to play (their 'from' frame).
 * This ensures audio files start loading in the network tab immediately
 * instead of waiting for Remotion's Sequence to render them.
 * 
 * @param {Object} props
 * @param {Array} props.overlays - Array of all overlays
 * @param {string} props.baseUrl - Base URL for resolving relative URLs
 */
export const AudioPreloader = ({ overlays = [], baseUrl }) => {
    const { baseUrl: contextBaseUrl } = useSafeEditorContext();
    // Resolve baseUrl: use prop first, then context, then fallback to window.location.origin
    const resolvedBaseUrl = baseUrl || contextBaseUrl || (typeof window !== 'undefined' ? window.location.origin : undefined);
    const preloadedAudioRef = useRef(new Set()); // Track which audio URLs we've already preloaded
    const audioElementsRef = useRef(new Map()); // Store audio elements to prevent garbage collection
    
    useEffect(() => {
        
        // Filter to only sound/audio overlays
        // CRITICAL: Check multiple conditions to handle all possible type representations
        const audioOverlays = overlays.filter(overlay => {
            // Must have a valid src
            if (!overlay?.src || overlay.src.trim() === '') {
                return false;
            }
            
            const overlayType = overlay?.type;
            const overlayTypeString = String(overlayType || '').toLowerCase();
            const overlayId = String(overlay?.id || '').toLowerCase();
            
            // Multiple checks to catch audio overlays in all scenarios:
            // 1. Direct enum comparison (OverlayType.SOUND === "sound")
            // 2. String comparison (case-insensitive)
            // 3. ID-based detection (if ID contains 'audio')
            // 4. Row-based detection (audio typically on higher rows, but not reliable)
            const isSound = (
                overlayType === OverlayType.SOUND ||  // Direct enum comparison (most reliable)
                overlayTypeString === 'sound' ||      // String "sound" (lowercase)
                overlayTypeString === 'audio' ||      // String "audio" (lowercase)
                overlayType === 'sound' ||            // String "sound" (exact match)
                overlayType === 'audio' ||            // String "audio" (exact match)
                overlayId.includes('audio') ||        // ID contains "audio" (fallback)
                (overlay.id && String(overlay.id).startsWith('audio-')) // ID starts with "audio-"
            );
            
            return isSound;
        });
        
        if (audioOverlays.length === 0) {
            return;
        }
        
        // CRITICAL: Separate Scene 1 audio (from === 0) from other audio
        // Scene 1 audio MUST load first before other audio starts
        const scene1AudioOverlays = audioOverlays.filter(overlay => (overlay.from || 0) === 0);
        const otherAudioOverlays = audioOverlays.filter(overlay => (overlay.from || 0) !== 0);
        
        // Helper function to preload a single audio overlay
        const preloadAudioOverlay = (overlay) => {
            const audioSrc = overlay.src;
            if (!audioSrc || audioSrc.trim() === '') {
                return;
            }
            
            // Determine the final audio source URL
            // toAbsoluteUrl handles undefined baseUrl by using window.location.origin as fallback
            let finalAudioSrc = audioSrc;
            if (audioSrc.startsWith("http://") || audioSrc.startsWith("https://") || audioSrc.startsWith("blob:")) {
                // Already absolute URL, use as-is
                finalAudioSrc = audioSrc;
            } else if (audioSrc.startsWith("/api/")) {
                // API route - use toAbsoluteUrl which handles undefined baseUrl
                finalAudioSrc = toAbsoluteUrl(audioSrc, resolvedBaseUrl);
            } else if (audioSrc.startsWith("/")) {
                // Relative URL starting with / - use toAbsoluteUrl which handles undefined baseUrl
                finalAudioSrc = toAbsoluteUrl(audioSrc, resolvedBaseUrl);
            } else {
                // Relative URL without / - use toAbsoluteUrl which handles undefined baseUrl
                finalAudioSrc = toAbsoluteUrl(audioSrc, resolvedBaseUrl);
            }
            
            // Skip if already preloaded (to avoid duplicate network requests)
            if (preloadedAudioRef.current.has(finalAudioSrc)) {
                return;
            }
            
            // Mark as preloaded immediately to prevent duplicates
            preloadedAudioRef.current.add(finalAudioSrc);
            
            const isScene1Audio = overlay.from === 0;
            
            // METHOD 1: Use fetch to trigger network request (appears in network tab)
            // CRITICAL: For Scene 1 audio, this MUST succeed and appear in network tab
            fetch(finalAudioSrc, { 
                method: 'GET',
                // Don't use Range header - request entire file to ensure it loads
                credentials: 'same-origin' // Include credentials for authenticated requests
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
                audioElementsRef.current.set(finalAudioSrc, { blobUrl, blob });
            })
            .catch(error => {
                // Silently handle errors - audio will still try to load via audio element
            });
            
            // METHOD 2: Also create audio element for browser caching (backup method)
            // CRITICAL: This ensures audio is preloaded and cached by browser
            const audio = document.createElement('audio');
            audio.preload = 'auto'; // Preload entire file - CRITICAL for Scene 1
            audio.crossOrigin = 'anonymous';
            audio.src = finalAudioSrc;
            
            // Add audio element to DOM temporarily to ensure it's loaded (some browsers need this)
            audio.style.display = 'none';
            audio.style.position = 'absolute';
            audio.style.visibility = 'hidden';
            audio.style.width = '0';
            audio.style.height = '0';
            document.body.appendChild(audio);
            
            // Store audio element reference
            audioElementsRef.current.set(finalAudioSrc, { 
                audio, 
                ...(audioElementsRef.current.get(finalAudioSrc) || {})
            });
            
            // Set up event listeners to track loading
            const handleError = () => {
                // Silently handle errors
            };
            
            audio.addEventListener('error', handleError);
            
            // Explicitly call load() to trigger network request immediately
            // This triggers the network request that appears in the network tab
            audio.load();
            
            // Remove from DOM after loading starts (keep in memory for cache)
            setTimeout(() => {
                try {
                    if (audio.parentNode) {
                        audio.parentNode.removeChild(audio);
                    }
                } catch (e) {
                    // Ignore errors removing from DOM
                }
            }, 1000);
        };
        
        // CRITICAL: Load Scene 1 audio FIRST and IMMEDIATELY (no waiting)
        // Fetch Scene 1 audio right away, before timeline rendering
        if (scene1AudioOverlays.length > 0) {
            // IMMEDIATELY fetch Scene 1 audio - don't wait for anything
            scene1AudioOverlays.forEach(overlay => {
                const audioSrc = overlay.src;
                if (!audioSrc || audioSrc.trim() === '') {
                    return;
                }
                
                let finalAudioSrc = audioSrc;
                if (audioSrc.startsWith("http://") || audioSrc.startsWith("https://") || audioSrc.startsWith("blob:")) {
                    finalAudioSrc = audioSrc;
                } else {
                    finalAudioSrc = toAbsoluteUrl(audioSrc, resolvedBaseUrl);
                }
                
                if (preloadedAudioRef.current.has(finalAudioSrc)) {
                    return;
                }
                
                preloadedAudioRef.current.add(finalAudioSrc);
                
                // IMMEDIATELY trigger fetch - this should appear in network tab right away
                fetch(finalAudioSrc, { 
                    method: 'GET',
                    credentials: 'same-origin',
                    cache: 'default' // Use default cache, but force fresh request if needed
                })
                .then(response => {
                    if (response.ok) {
                        return response.blob();
                    }
                    return null;
                })
                .then(blob => {
                    if (blob) {
                        const blobUrl = URL.createObjectURL(blob);
                        audioElementsRef.current.set(finalAudioSrc, { blobUrl, blob });
                    }
                })
                .catch(() => {
                    // Silently handle errors
                });
                
                // Also create audio element immediately for browser caching
                const audio = document.createElement('audio');
                audio.preload = 'auto';
                audio.crossOrigin = 'anonymous';
                audio.src = finalAudioSrc;
                
                // Add to DOM immediately to trigger loading
                audio.style.display = 'none';
                audio.style.position = 'absolute';
                audio.style.visibility = 'hidden';
                audio.style.width = '0';
                audio.style.height = '0';
                document.body.appendChild(audio);
                
                audioElementsRef.current.set(finalAudioSrc, { 
                    audio, 
                    ...(audioElementsRef.current.get(finalAudioSrc) || {})
                });
                
                // Immediately call load() to trigger network request
                audio.load();
                
                // Reset audio to start when ready
                const handleCanPlayThrough = () => {
                    audio.currentTime = 0;
                };
                audio.addEventListener('canplaythrough', handleCanPlayThrough);
                
                // Clean up DOM after a delay
                setTimeout(() => {
                    try {
                        if (audio.parentNode) {
                            audio.parentNode.removeChild(audio);
                        }
                    } catch (e) {
                        // Ignore errors
                    }
                }, 2000);
            });
            
            // Now load other audio files (Scene 1 audio fetch has already started)
            // Small delay to ensure Scene 1 audio fetch request appears in network tab first
            setTimeout(() => {
                otherAudioOverlays.forEach(preloadAudioOverlay);
            }, 50);
        } else {
            // No Scene 1 audio, load all audio in order
            const sortedAudioOverlays = [...audioOverlays].sort((a, b) => {
                const aFrom = a.from || 0;
                const bFrom = b.from || 0;
                return aFrom - bFrom;
            });
            sortedAudioOverlays.forEach(preloadAudioOverlay);
        }
        
        // Cleanup function: clean up DOM elements but keep refs for cache
        return () => {
            // Remove any audio elements from DOM if still there
            audioElementsRef.current.forEach((value, url) => {
                if (value?.audio && value.audio.parentNode) {
                    try {
                        value.audio.parentNode.removeChild(value.audio);
                    } catch (e) {
                        // Ignore errors
                    }
                }
            });
            // Keep refs in memory for browser cache
        };
    }, [overlays, resolvedBaseUrl]); // Re-run when overlays change
    
    // This component doesn't render anything visible
    return null;
};

