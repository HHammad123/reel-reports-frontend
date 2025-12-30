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
    const activePreloadsRef = useRef(0); // Track concurrent preload operations
    const MAX_CONCURRENT_PRELOADS = 3; // Limit concurrent preloads to prevent browser overload
    
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
            
            const isScene1Audio = overlay.from === 0;
            
            // OPTIMIZED: Limit concurrent preloads to prevent browser overload
            // Prioritize Scene 1 audio, queue others
            if (!isScene1Audio && activePreloadsRef.current >= MAX_CONCURRENT_PRELOADS) {
                // Queue non-Scene-1 audio if we're at the limit
                // Scene 1 audio always loads immediately
                setTimeout(() => preloadAudioOverlay(overlay), 500);
                return;
            }
            
            // Mark as preloaded immediately to prevent duplicates
            preloadedAudioRef.current.add(finalAudioSrc);
            activePreloadsRef.current++;
            
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
                activePreloadsRef.current--;
            })
            .catch(error => {
                // Silently handle errors - audio will still try to load via audio element
                activePreloadsRef.current--;
            });
            
            // METHOD 2: Also create audio element for browser caching (backup method)
            // CRITICAL: Check if audio element already exists to prevent duplicates
            const existingAudio = audioElementsRef.current.get(finalAudioSrc)?.audio;
            if (existingAudio && existingAudio.parentNode) {
                // Audio element already exists and is in DOM, skip creating duplicate
                return;
            }
            
            // CRITICAL: This ensures audio is preloaded and cached by browser
            const audio = document.createElement('audio');
            audio.preload = 'auto'; // Preload entire file - CRITICAL for Scene 1
            audio.crossOrigin = 'anonymous';
            audio.src = finalAudioSrc;
            
            // Set buffering properties for better playback performance
            audio.setAttribute('preload', 'auto');
            
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
            
            const handleCanPlay = () => {
                // Ensure audio is buffered enough for smooth playback
                if (audio.buffered.length > 0) {
                    const bufferedEnd = audio.buffered.end(audio.buffered.length - 1);
                    // Log buffering status for debugging
                    if (bufferedEnd > 0) {
                        console.log(`[AudioPreloader] Audio buffered: ${bufferedEnd.toFixed(2)}s / ${audio.duration.toFixed(2)}s`, finalAudioSrc.substring(0, 60));
                    }
                }
            };
            
            audio.addEventListener('error', handleError);
            audio.addEventListener('canplay', handleCanPlay);
            audio.addEventListener('progress', handleCanPlay); // Track buffering progress
            
            // Explicitly call load() to trigger network request immediately
            // This triggers the network request that appears in the network tab
            audio.load();
            
            // Remove from DOM after loading starts (keep in memory for cache)
            // Track when audio is ready to reduce active preload count
            audio.addEventListener('canplaythrough', () => {
                activePreloadsRef.current = Math.max(0, activePreloadsRef.current - 1);
                try {
                    if (audio.parentNode && !audioElementsRef.current.get(finalAudioSrc)?.persistent) {
                        audio.parentNode.removeChild(audio);
                    }
                } catch (e) {
                    // Ignore errors removing from DOM
                }
            }, { once: true });
            
            // Fallback timeout if canplaythrough doesn't fire
            setTimeout(() => {
                try {
                    if (audio.parentNode && !audioElementsRef.current.get(finalAudioSrc)?.persistent) {
                        audio.parentNode.removeChild(audio);
                    }
                } catch (e) {
                    // Ignore errors removing from DOM
                }
            }, 3000); // 3 seconds timeout
        };
        
        // CRITICAL: Load Scene 1 audio FIRST with guaranteed playback readiness
        if (scene1AudioOverlays.length > 0) {
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
                
                // CRITICAL: Check if Scene 1 audio element already exists to prevent duplicates
                const existingScene1Audio = audioElementsRef.current.get(finalAudioSrc)?.audio;
                if (existingScene1Audio && existingScene1Audio.hasAttribute('data-scene-1-audio')) {
                    // Scene 1 audio already exists, skip creating duplicate
                    return;
                }
                
                // Create PERSISTENT audio element for Scene 1 (never remove from DOM)
                const audio = document.createElement('audio');
                audio.preload = 'auto';
                audio.crossOrigin = 'anonymous';
                audio.src = finalAudioSrc;
                
                // Set buffering properties for better playback performance
                audio.setAttribute('preload', 'auto');
                
                // CRITICAL: Mark as Scene 1 audio so it persists in DOM
                audio.setAttribute('data-scene-1-audio', 'true');
                audio.setAttribute('data-overlay-id', overlay.id || 'scene-1-audio');
                
                // Add to DOM permanently (DO NOT REMOVE)
                audio.style.display = 'none';
                audio.style.position = 'absolute';
                audio.style.visibility = 'hidden';
                audio.style.width = '0';
                audio.style.height = '0';
                document.body.appendChild(audio);
                
                // Store with persistent flag
                audioElementsRef.current.set(finalAudioSrc, { 
                    audio, 
                    persistent: true, // CRITICAL: Mark as persistent
                    overlayId: overlay.id,
                    ...(audioElementsRef.current.get(finalAudioSrc) || {})
                });
                
                // Track loading progress
                const handleLoadedMetadata = () => {
                    // Metadata loaded
                };
                
                const handleCanPlayThrough = () => {
                    // Reset to start
                    audio.currentTime = 0;
                    
                    // CRITICAL: Store reference globally for Remotion to find
                    if (!window.__SCENE_1_AUDIO_ELEMENTS) {
                        window.__SCENE_1_AUDIO_ELEMENTS = new Map();
                    }
                    window.__SCENE_1_AUDIO_ELEMENTS.set(finalAudioSrc, audio);
                };
                
                const handleLoadedData = () => {
                    // Data loaded
                };
                
                const handleError = (e) => {
                    // Silently handle errors
                };
                
                // Add all event listeners
                audio.addEventListener('loadedmetadata', handleLoadedMetadata, { once: true });
                audio.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
                audio.addEventListener('loadeddata', handleLoadedData, { once: true });
                audio.addEventListener('error', handleError);
                
                // Immediately start loading
                audio.load();
                
                // CRITICAL: Also store reference immediately (before load completes)
                if (!window.__SCENE_1_AUDIO_ELEMENTS) {
                    window.__SCENE_1_AUDIO_ELEMENTS = new Map();
                }
                window.__SCENE_1_AUDIO_ELEMENTS.set(finalAudioSrc, audio);
                
                // DO NOT REMOVE FROM DOM - Scene 1 audio stays permanently
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
        
        // Cleanup function: preserve Scene 1 audio, clean up others
        return () => {
            // Remove audio elements from DOM, EXCEPT Scene 1 audio (persistent)
            audioElementsRef.current.forEach((value, url) => {
                // CRITICAL: Never remove Scene 1 audio from DOM
                if (value?.persistent) {
                    return;
                }
                
                // OPTIMIZED: Clean up blob URLs to prevent memory leaks
                if (value?.blobUrl) {
                    try {
                        URL.revokeObjectURL(value.blobUrl);
                    } catch (e) {
                        // Ignore errors revoking blob URLs
                    }
                }
                
                // Remove non-Scene-1 audio from DOM
                if (value?.audio && value.audio.parentNode) {
                    try {
                        value.audio.parentNode.removeChild(value.audio);
                    } catch (e) {
                        // Ignore errors
                    }
                }
            });
            // Keep Scene 1 audio refs in memory for browser cache
            // Clear non-Scene-1 entries to free memory
            const scene1Entries = new Map();
            audioElementsRef.current.forEach((value, url) => {
                if (value?.persistent) {
                    scene1Entries.set(url, value);
                }
            });
            audioElementsRef.current = scene1Entries;
            activePreloadsRef.current = 0;
        };
    }, [overlays, resolvedBaseUrl]); // Re-run when overlays change
    
    // This component doesn't render anything visible
    return null;
};

