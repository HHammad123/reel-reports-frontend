import { jsx as _jsx } from "react/jsx-runtime";
import { useEffect, useRef } from "react";
import { toAbsoluteUrl } from "../../general/url-helper";
import { useEditorContext } from "../../../pro/contexts/editor-context";
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
    const resolvedBaseUrl = baseUrl || contextBaseUrl;
    const preloadedAudioRef = useRef(new Set()); // Track which audio URLs we've already preloaded
    const audioElementsRef = useRef(new Map()); // Store audio elements to prevent garbage collection
    
    // Log component render
    console.log(`[AudioPreloader] 🎯 Component rendered with ${overlays.length} overlay(s)`, {
        baseUrl: baseUrl,
        contextBaseUrl: contextBaseUrl,
        resolvedBaseUrl: resolvedBaseUrl
    });
    
    useEffect(() => {
        console.log(`[AudioPreloader] ⚡ useEffect triggered. Total overlays: ${overlays.length}`);
        
        // Debug: log all overlay types
        const overlayTypes = overlays.map(o => ({ 
            id: o?.id, 
            type: o?.type, 
            typeString: String(o?.type || '').toLowerCase(),
            hasSrc: !!o?.src,
            src: o?.src 
        }));
        console.log(`[AudioPreloader] All overlay types:`, overlayTypes);
        
        // Filter to only sound/audio overlays
        // Check for both 'sound' string and OverlayType.SOUND enum value
        const audioOverlays = overlays.filter(overlay => {
            const overlayType = overlay?.type;
            const overlayTypeString = String(overlayType || '').toLowerCase();
            // Check for 'sound' type (handles both string "sound" and OverlayType.SOUND which is "sound")
            const isSound = (overlayTypeString === 'sound' || overlayType === 'sound' || overlayTypeString === 'audio') && overlay?.src && overlay.src.trim() !== '';
            
            // Debug: log all overlays to see what we're getting
            if (overlay?.src) {
                console.log(`[AudioPreloader] Checking overlay with src:`, {
                    id: overlay.id,
                    type: overlayType,
                    typeString: overlayTypeString,
                    src: overlay.src,
                    isSound: isSound
                });
            }
            
            if (isSound) {
                console.log(`[AudioPreloader] ✅ Found audio overlay:`, {
                    id: overlay.id,
                    type: overlay.type,
                    src: overlay.src
                });
            }
            return isSound;
        });
        
        console.log(`[AudioPreloader] Found ${audioOverlays.length} audio overlay(s) out of ${overlays.length} total overlays`);
        
        if (audioOverlays.length === 0) {
            console.log(`[AudioPreloader] No audio overlays found. Exiting.`);
            return;
        }
        
        console.log(`[AudioPreloader] 🎵 Preloading ${audioOverlays.length} audio file(s) immediately...`);
        
        // Preload each audio file
        audioOverlays.forEach((overlay, index) => {
            const audioSrc = overlay.src;
            if (!audioSrc || audioSrc.trim() === '') {
                return;
            }
            
            // Determine the final audio source URL
            let finalAudioSrc = audioSrc;
            if (audioSrc.startsWith("/api/")) {
                finalAudioSrc = toAbsoluteUrl(audioSrc, resolvedBaseUrl);
            } else if (audioSrc.startsWith("/") && resolvedBaseUrl) {
                finalAudioSrc = `${resolvedBaseUrl}${audioSrc}`;
            } else if (audioSrc.startsWith("/")) {
                finalAudioSrc = toAbsoluteUrl(audioSrc, resolvedBaseUrl);
            }
            
            // Skip if already preloaded (to avoid duplicate network requests)
            if (preloadedAudioRef.current.has(finalAudioSrc)) {
                return;
            }
            
            // Mark as preloaded immediately to prevent duplicates
            preloadedAudioRef.current.add(finalAudioSrc);
            
            // Log preloading start
            console.log(`[AudioPreloader] 🎵 Preloading audio ${index + 1}/${audioOverlays.length}:`, {
                overlayId: overlay.id,
                src: overlay.src,
                finalAudioSrc: finalAudioSrc,
                from: overlay.from,
                durationInFrames: overlay.durationInFrames
            });
            
            // METHOD 1: Use fetch to trigger network request (appears in network tab)
            fetch(finalAudioSrc, { 
                method: 'GET',
                headers: {
                    'Range': 'bytes=0-', // Request the entire file to trigger full download
                }
            })
            .then(response => {
                console.log(`[AudioPreloader] 📡 Fetch request initiated for:`, finalAudioSrc, {
                    status: response.status,
                    headers: Object.fromEntries(response.headers.entries())
                });
                // Read the response to ensure the request completes
                return response.blob();
            })
            .then(blob => {
                console.log(`[AudioPreloader] ✅ Audio file fetched successfully:`, finalAudioSrc, {
                    size: blob.size,
                    type: blob.type
                });
                // Store the blob URL for later use
                const blobUrl = URL.createObjectURL(blob);
                audioElementsRef.current.set(finalAudioSrc, { blobUrl, blob });
            })
            .catch(error => {
                console.warn(`[AudioPreloader] ⚠️ Fetch error for ${finalAudioSrc}:`, error);
            });
            
            // METHOD 2: Also create audio element for browser caching (backup method)
            const audio = document.createElement('audio');
            audio.preload = 'auto'; // Preload entire file
            audio.crossOrigin = 'anonymous';
            audio.src = finalAudioSrc;
            
            // Add audio element to DOM temporarily to ensure it's loaded (some browsers need this)
            audio.style.display = 'none';
            audio.style.position = 'absolute';
            audio.style.visibility = 'hidden';
            document.body.appendChild(audio);
            
            // Store audio element reference
            audioElementsRef.current.set(finalAudioSrc, { 
                audio, 
                ...(audioElementsRef.current.get(finalAudioSrc) || {})
            });
            
            // Set up event listeners to track loading
            const handleLoadedMetadata = () => {
                console.log(`[AudioPreloader] 📊 Audio metadata loaded:`, finalAudioSrc, {
                    duration: audio.duration,
                    readyState: audio.readyState
                });
            };
            
            const handleCanPlay = () => {
                console.log(`[AudioPreloader] ▶️ Audio can play:`, finalAudioSrc);
            };
            
            const handleCanPlayThrough = () => {
                console.log(`[AudioPreloader] ✅ Audio preloaded and ready:`, finalAudioSrc);
            };
            
            const handleLoadedData = () => {
                console.log(`[AudioPreloader] 📦 Audio data loaded:`, finalAudioSrc);
            };
            
            const handleProgress = () => {
                if (audio.buffered.length > 0) {
                    const loaded = audio.buffered.end(0);
                    const total = audio.duration;
                    const percent = total > 0 ? (loaded / total * 100).toFixed(1) : 0;
                    console.log(`[AudioPreloader] 📈 Audio loading progress: ${percent}%`, finalAudioSrc);
                }
            };
            
            const handleError = (error) => {
                console.warn(`[AudioPreloader] ⚠️ Error preloading audio:`, finalAudioSrc, error);
            };
            
            audio.addEventListener('loadedmetadata', handleLoadedMetadata);
            audio.addEventListener('canplay', handleCanPlay);
            audio.addEventListener('canplaythrough', handleCanPlayThrough);
            audio.addEventListener('loadeddata', handleLoadedData);
            audio.addEventListener('progress', handleProgress);
            audio.addEventListener('error', handleError);
            
            // Explicitly call load() to trigger network request immediately
            // This should trigger a network request that appears in the network tab
            console.log(`[AudioPreloader] 🚀 Calling audio.load() for:`, finalAudioSrc);
            audio.load();
            
            // Also log the audio element state after a short delay
            setTimeout(() => {
                console.log(`[AudioPreloader] 📋 Audio state after load (${finalAudioSrc}):`, {
                    readyState: audio.readyState,
                    networkState: audio.networkState,
                    preload: audio.preload,
                    src: audio.src
                });
                // Remove from DOM after loading starts (keep in memory for cache)
                try {
                    if (audio.parentNode) {
                        audio.parentNode.removeChild(audio);
                    }
                } catch (e) {
                    // Ignore errors removing from DOM
                }
            }, 1000);
        });
        
        console.log(`[AudioPreloader] ✅ Started preloading ${audioOverlays.length} audio file(s). Check network tab for requests.`);
        
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

