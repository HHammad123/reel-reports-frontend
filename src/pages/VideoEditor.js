import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { 
  Play, Pause, SkipBack, SkipForward, Scissors, 
  Layers, Download, Upload, Settings, 
  Monitor, ArrowRightLeft, Move, GripVertical, 
  Film, Plus, Trash2, X, Clock, Zap, Square
} from 'lucide-react';
import RecordRTC from 'recordrtc';

/**
 * NEXUS EDIT - MULTI-TRACK VIDEO EDITOR
 * Features: Multi-Track Sequencing (V1: Primary, V2: Overlay), Trim Dragging, Enhanced Transitions.
 * Status: Export simplified to direct download (simulated MP4). V2 overlay visibility correctly tied to clip duration.
 */

// --- Global Constants ---
const TRANSITION_TYPES = ['None', 'Fade', 'Dip To Black', 'Slide Right'];
const TRANSITION_DURATION = 0.5; // seconds
// FAKE_EXPORT_URL is used to simulate the final encoded video download in the browser.
const FAKE_EXPORT_URL = 'data:video/mp4;base64,GkXfo6NChoEBQveBAULygQRC84EIQoKEdmF2Jic2SAp3d2ViZQEAAAAAAAAFTgSgABRbmjrQltNErD5T+v4rB+Vv+QvB9i4b24gEAAAAAAAAAAgAAABHo+xHghAEAAAAAAAAYu0QoAAAAAAAAfSWhAIIAABAAqAAAAH3FhZ2JpbiB0ZXN0IG92ZXJsYXkgc2ltdWxhdGlvbi4=';

// --- Components ---

const Button = ({ children, onClick, active, disabled, className = "", icon: Icon, variant = "default" }) => (
  <button
    onClick={onClick}
    disabled={disabled}
    className={`flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all
    ${variant === 'danger' ? 'bg-red-900/50 text-red-200 hover:bg-red-800' : ''}
    ${variant === 'default' && active 
      ? 'bg-[#13008B] text-white shadow-lg' 
      : variant === 'default' && !active 
      ? 'bg-gray-100 text-gray-700 hover:bg-gray-200 hover:text-gray-900 border border-gray-300'
      : ''}
    ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
    ${className}`}
  >
    {Icon && <Icon size={16} />}
    {children}
  </button>
);

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export default function VideoEditor({ initialTracks = null, initialAudioTracks = null }) {
  // --- Global Sequence State ---
  // tracks[0] = V1 (Primary), tracks[1+] = Overlay layers (V2, V3, V4, etc.)
  const [tracks, setTracks] = useState(initialTracks || [[], []]);
  const [audioTracks, setAudioTracks] = useState(initialAudioTracks || []); // Audio tracks: [{ id, url, name, file, startTime, volume, duration }]
  
  // Sync tracks when initialTracks prop changes
  useEffect(() => {
    if (initialTracks && JSON.stringify(initialTracks) !== JSON.stringify(tracks)) {
      setTracks(initialTracks);
    }
  }, [initialTracks]);
  
  // Sync audio tracks when initialAudioTracks prop changes
  useEffect(() => {
    if (initialAudioTracks && JSON.stringify(initialAudioTracks) !== JSON.stringify(audioTracks)) {
      setAudioTracks(initialAudioTracks);
    }
  }, [initialAudioTracks]);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [activeTransitionId, setActiveTransitionId] = useState(null); 
  const [transitions, setTransitions] = useState({}); 

  // --- Playback State ---
  const [isPlaying, setIsPlaying] = useState(false);
  const [globalTime, setGlobalTime] = useState(0); 
  const [totalDuration, setTotalDuration] = useState(0); 
  
  // --- UI State ---
  const [activeTab, setActiveTab] = useState('adjust');
  const [isProcessing, setIsProcessing] = useState(false);
  const [transitionEffect, setTransitionEffect] = useState(null); 
  const [uploadTargetTrack, setUploadTargetTrack] = useState(0); 
  const [draggedClip, setDraggedClip] = useState(null); 
  const [showLayerManager, setShowLayerManager] = useState(false); 
  
  // --- EXPORT STATE (Simplified) ---
  const [exportUrl, setExportUrl] = useState(null);

  // --- Drag State for Trimming ---
  const [dragState, setDragState] = useState(null); 
  
  // --- V2 Overlay Interaction State ---
  const [interactionState, setInteractionState] = useState(null); 


  // --- Refs ---
  const videoRef = useRef(null); // Ref for V1 video player
  const playerRef = useRef(null); // Ref for the player container to get bounding box for V2 transform
  const fileInputRef = useRef(null);
  const animationFrameRef = useRef(null);
  const lastTimeRef = useRef(Date.now());
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const exportCanvasRef = useRef(null);
  const overlayElementCacheRef = useRef(new Map()); // Cache for overlay elements

  // --- Derived State: The Active Clips for all layers ---
  const { v1ClipInfo, activeOverlayClips, v1TotalDuration } = useMemo(() => {
    let accumulatedTime = 0;
    let v1ClipInfo = null;

    // --- V1 (Primary) Track Logic ---
    tracks[0].forEach((clip, i) => {
      const trimmedDuration = clip.trimEnd - clip.trimStart;
      const speed = clip.speed || 1.0;
      const effectiveDuration = trimmedDuration / speed; // Faster speed = shorter timeline duration
      
      if (globalTime >= accumulatedTime && globalTime < accumulatedTime + effectiveDuration) {
        // Calculate local time accounting for speed
        const timelineOffset = globalTime - accumulatedTime;
        const localTime = clip.trimStart + (timelineOffset * speed);
        
        v1ClipInfo = { 
          clip, 
          trackIndex: 0,
          index: i, 
          localTime: localTime, 
          startTimeInTimeline: accumulatedTime
        };
      }
      accumulatedTime += effectiveDuration;
    });
    
    const calculatedV1TotalDuration = accumulatedTime;

    // --- Overlay Layers (V2, V3, V4, etc.) Logic ---
    const activeOverlayClips = [];
    
    for (let trackIndex = 1; trackIndex < tracks.length; trackIndex++) {
      const overlayClip = tracks[trackIndex][0]; // Overlay tracks hold one clip
      
      if (overlayClip) {
        const trimmedDuration = overlayClip.trimEnd - overlayClip.trimStart;
        
        // Check if overlay is active at current time
        if (globalTime >= 0 && globalTime < trimmedDuration) {
          activeOverlayClips.push({
            clip: overlayClip,
            trackIndex: trackIndex,
                index: 0,
            localTime: globalTime + overlayClip.trimStart,
                startTimeInTimeline: 0
          });
        }
      }
    }
    
    return { v1ClipInfo, activeOverlayClips, v1TotalDuration: calculatedV1TotalDuration };
  }, [globalTime, tracks]);

  // Backward compatibility: v2ClipInfo for existing code
  const v2ClipInfo = activeOverlayClips[0] || null;

  // Set total duration based on V1 track length
  useEffect(() => {
    if (v1TotalDuration !== totalDuration) {
      setTotalDuration(v1TotalDuration);
    }
  }, [v1TotalDuration, totalDuration]);

  // --- Handlers (File Upload, Delete, Drag/Drop - Simplified for space) ---

  const handleFileUpload = (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    files.forEach(file => {
      const url = URL.createObjectURL(file);
      const mimeType = file.type;
      const isVideo = mimeType.startsWith('video/');
      const isImage = mimeType.startsWith('image/');
      const isAudio = mimeType.startsWith('audio/');

      // Handle audio files separately
      if (isAudio) {
        const audioElement = document.createElement('audio');
        audioElement.src = url;
        audioElement.preload = 'metadata';
        
        audioElement.onloadedmetadata = () => {
          try {
            const duration = audioElement.duration;
            if (!isFinite(duration) || duration <= 0) {
              console.warn('⚠️ Audio duration is invalid, using default');
            }
            
            const audioClip = {
              id: Date.now() + Math.random(),
              file,
              url,
              name: file.name,
              mimeType,
              type: 'audio',
              duration: isFinite(duration) && duration > 0 ? duration : 30, // Default 30s if duration is invalid
              startTime: 0, // Start at beginning of timeline
              volume: 1.0, // Full volume by default
              speed: 1.0, // Playback speed (1.0 = normal, 0.5 = half, 2.0 = double)
              trimStart: 0,
              trimEnd: isFinite(duration) && duration > 0 ? duration : 30,
            };
            
            setAudioTracks(prev => {
              const updated = [...prev, audioClip];
              console.log('✅ Audio file uploaded:', audioClip.name, 'Duration:', audioClip.duration, 'Total audio tracks:', updated.length);
              return updated;
            });
            
            if (!selectedClipId) setSelectedClipId(audioClip.id);
          } catch (error) {
            console.error('Error processing audio file:', error);
            alert(`Failed to process audio file: ${file.name}`);
          }
        };
        
        audioElement.onerror = (error) => {
          console.error('Error loading audio file:', error);
          alert(`Failed to load audio file: ${file.name}`);
        };
        
        audioElement.load(); // Trigger loading
        return; // Exit early for audio files
      }

      // Handle video/image files
      const tempElement = document.createElement(isVideo ? 'video' : 'img');
      tempElement.src = url;

      tempElement.onloadedmetadata = tempElement.onload = () => {
        const duration = isVideo ? tempElement.duration : Infinity;
        const initialDuration = isVideo ? tempElement.duration : 10; 
        
        const newClip = {
          id: Date.now() + Math.random(),
          file,
          url,
          name: file.name,
          mimeType,
          type: isVideo ? 'video' : isImage ? 'image' : 'unknown',
          duration: duration,
          speed: 1.0, // Playback speed (1.0 = normal, 0.5 = half, 2.0 = double)
          trimStart: 0,
          trimEnd: initialDuration,
        };
        
        if (uploadTargetTrack > 0) {
            newClip.transform = {
                x: 20 + (uploadTargetTrack - 1) * 10, 
                y: 20 + (uploadTargetTrack - 1) * 10, 
                width: 30, 
                opacity: 1,
            };
        }

        if (isVideo || isImage) {
          // Add to video/image tracks
        setTracks(prevTracks => {
          const newTracks = [...prevTracks];
            // Ensure track exists
            while (newTracks.length <= uploadTargetTrack) {
              newTracks.push([]);
            }
            
            // For overlay tracks (index > 0), add transform if not present
            if (uploadTargetTrack > 0 && !newClip.transform) {
              newClip.transform = {
                x: 20 + (uploadTargetTrack - 1) * 10, 
                y: 20 + (uploadTargetTrack - 1) * 10, 
                width: 30, 
                opacity: 1,
              };
            }
            
            // For overlay tracks, replace the single clip; for primary track, append
            newTracks[uploadTargetTrack] = uploadTargetTrack === 0 
              ? [...newTracks[uploadTargetTrack], newClip]
              : [newClip]; // Overlay tracks still hold one clip for now

          if (!selectedClipId) setSelectedClipId(newClip.id); 
          return newTracks;
        });
        }
        
        e.target.value = null; 
      };
    });
  };

  const deleteClip = (id) => {
    // Check if it's an audio clip
    const isAudioClip = audioTracks.some(a => a.id === id);
    if (isAudioClip) {
      setAudioTracks(prev => prev.filter(a => a.id !== id));
    } else {
    setTracks(prevTracks => prevTracks.map(track => track.filter(c => c.id !== id)));
    }
    if (selectedClipId === id) setSelectedClipId(null);
  };

  // Add new overlay layer
  const addLayer = () => {
    setTracks(prevTracks => [...prevTracks, []]);
  };

  // Remove layer (can't remove track 0 - primary track)
  const removeLayer = (trackIndex) => {
    if (trackIndex === 0) return; // Can't remove primary track
    setTracks(prevTracks => {
      const newTracks = [...prevTracks];
      newTracks.splice(trackIndex, 1);
      return newTracks;
    });
  };
  
  // --- V2 Transform Logic ---

  const updateV2ClipTransform = useCallback((clipId, changes) => {
    setTracks(prevTracks => {
      const newTracks = [...prevTracks];
      const v2Index = newTracks[1].findIndex(c => c.id === clipId);

      if (v2Index !== -1) {
        const clip = newTracks[1][v2Index];
        newTracks[1][v2Index] = {
          ...clip,
          transform: {
            ...clip.transform,
            ...changes,
          },
        };
      }
      return newTracks;
    });
  }, []);

  const handleOverlayDragStart = useCallback((e, clip) => {
    e.preventDefault();
    e.stopPropagation(); 
    if (e.target.classList.contains('resize-handle')) return;
    if (!playerRef.current) return;

    setInteractionState({
      clipId: clip.id,
      type: 'drag',
      startX: e.clientX,
      startY: e.clientY,
      initialTransform: clip.transform,
      handle: 'center'
    });
  }, []);

  const handleResizeStart = useCallback((e, clip, handle) => {
    e.preventDefault();
    e.stopPropagation();

    setInteractionState({
      clipId: clip.id,
      type: 'resize',
      startX: e.clientX,
      startY: e.clientY,
      initialTransform: clip.transform,
      handle: handle
    });
  }, []);


  // Mouse move/up logic for V2 overlay drag/resize (implementation omitted for brevity, but functional)
  useEffect(() => {
    
    const handleMouseMove = (e) => {
        if (!interactionState || !playerRef.current) return;
        
        const { clipId, type, startX, startY, initialTransform, handle } = interactionState;
        const playerRect = playerRef.current.getBoundingClientRect();
        
        const deltaX = e.clientX - startX;
        const deltaY = e.clientY - startY;
        
        const deltaXPercent = (deltaX / playerRect.width) * 100;
        const deltaYPercent = (deltaY / playerRect.height) * 100;

        let newTransform = { ...initialTransform };
        
        if (type === 'drag') {
          newTransform.x = Math.min(100, Math.max(0, initialTransform.x + deltaXPercent));
          newTransform.y = Math.min(100, Math.max(0, initialTransform.y + deltaYPercent));
        } else if (type === 'resize' && handle === 'bottom-right') {
          let newWidth = initialTransform.width + deltaXPercent;
          newTransform.width = Math.min(100, Math.max(5, newWidth));
          newTransform.height = 'auto'; 
        }

        updateV2ClipTransform(clipId, newTransform);
      };

    const handleMouseUp = () => {
      setInteractionState(null);
    };

    if (interactionState) {
      document.body.style.userSelect = 'none'; 
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      document.body.style.userSelect = 'auto'; 
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [interactionState, updateV2ClipTransform]);
  
  
  // --- Playback Engine (Core) ---

  // Main Loop for Timeline Sync
  useEffect(() => {
    if (isPlaying) { 
      lastTimeRef.current = Date.now();
      
      const loop = () => {
        const now = Date.now();
        const delta = (now - lastTimeRef.current) / 1000;
        lastTimeRef.current = now;

        setGlobalTime(prev => {
          const nextTime = prev + delta;
          if (nextTime >= totalDuration && totalDuration > 0) {
            setIsPlaying(false);
            return totalDuration; 
          }
          return nextTime;
        });
        
        animationFrameRef.current = requestAnimationFrame(loop);
      };
      animationFrameRef.current = requestAnimationFrame(loop);
    } else {
      cancelAnimationFrame(animationFrameRef.current);
    }

    return () => cancelAnimationFrame(animationFrameRef.current);
  }, [isPlaying, totalDuration]);

  // Sync V1 Video Element
  useEffect(() => {
    if (!videoRef.current) return;
    
    const videoElement = videoRef.current;
    const playerContainer = videoElement.closest('.player-container');
    
    const activeClip = v1ClipInfo?.clip;
    const localTime = v1ClipInfo?.localTime;
    const index = v1ClipInfo?.index;

    // If there's an active clip, sync it
    if (activeClip) {
      // --- Transition Logic (V1 only) ---
      const timeRemaining = (activeClip.trimEnd - activeClip.trimStart) - (localTime - activeClip.trimStart);
      const nextClipExists = tracks[0][index + 1];
      const transitionKey = nextClipExists ? `${activeClip.id}-${nextClipExists.id}` : null;
      const transitionType = transitionKey ? transitions[transitionKey] : null;

      let currentTransitionEffect = null;
      if (transitionType) {
         if (timeRemaining <= TRANSITION_DURATION && timeRemaining > 0) {
           currentTransitionEffect = `transition-out-${transitionType}`;
         } else if (localTime - activeClip.trimStart < TRANSITION_DURATION && index > 0) {
            currentTransitionEffect = `transition-in-${transitionType}`;
         }
      }
      
      setTransitionEffect(currentTransitionEffect);
      
      if (playerContainer) {
        // NOTE: Tailwind classes need to be directly applied, using template literals for class names might fail tree-shaking/JIT compilation in some environments, but we proceed for demonstration.
        playerContainer.className = `player-container relative shadow-2xl shadow-black/50 group transition-all duration-[${TRANSITION_DURATION}s] ${currentTransitionEffect || ''}`;
      }

      // --- Source Swap Logic ---
      const currentSrc = videoElement.getAttribute('src'); 
      if (currentSrc !== activeClip.url) {
        videoElement.src = activeClip.url;
        if (playerContainer) {
            playerContainer.className = `player-container relative shadow-2xl shadow-black/50 group`;
        }
      }

      // Sync Time and Play State
      if (activeClip.type === 'video') {
         // Set playback speed
         const speed = activeClip.speed || 1.0;
         if (Math.abs(videoElement.playbackRate - speed) > 0.01) {
           videoElement.playbackRate = speed;
         }
         if (Math.abs(videoElement.currentTime - localTime) > 0.3) {
            videoElement.currentTime = localTime;
         }
         // Play if playing 
         if (isPlaying && videoElement.paused) {
             videoElement.play().catch(e => console.log("V1 Play interrupted"));
         } else if (!isPlaying && !videoElement.paused) {
             videoElement.pause();
         }
      }

    } else if (tracks[0].length > 0) {
      // If no active clip but there are clips, show the first clip
      const firstClip = tracks[0][0];
      const currentSrc = videoElement.getAttribute('src');
      
      if (firstClip && currentSrc !== firstClip.url) {
        videoElement.src = firstClip.url;
        videoElement.currentTime = firstClip.trimStart || 0;
        if (playerContainer) {
          playerContainer.className = `player-container relative shadow-2xl shadow-black/50 group`;
        }
      }
      
      if (videoElement && !isPlaying) {
        videoElement.pause();
      }
      setTransitionEffect(null);
    } else {
      // No clips at all
      if (videoElement) {
         videoElement.pause();
         videoElement.currentTime = 0; 
      }
      if (playerContainer) playerContainer.className = `player-container relative shadow-2xl shadow-black/50 group`;
      setTransitionEffect(null);
    }
  }, [globalTime, v1ClipInfo, isPlaying, tracks, transitions]);


  // --- EXPORT LOGIC (Simplified) ---

  const handleExport = async () => {
    if (tracks[0].length === 0) {
        alert("Please add clips to the V1 (Primary) track before attempting to export.");
        return;
    }

    setExportUrl(null); 
    setIsPlaying(false);
    setIsProcessing(true);
      
    try {
      const playerContainer = playerRef.current || document.querySelector('.player-container');
      
      if (!playerContainer) {
        throw new Error('Player container not found');
      }

      console.log('🎬 Starting client-side video export with RecordRTC...');

      // Preload all overlay elements to ensure they're ready
      overlayElementCacheRef.current.clear();
      
      // Preload all overlay layers (V2, V3, V4, etc.)
      for (let trackIndex = 1; trackIndex < tracks.length; trackIndex++) {
        const track = tracks[trackIndex];
        if (track && track.length > 0) {
          for (const overlayClip of track) {
            if (overlayClip.url) {
              const cacheKey = `${trackIndex}-${overlayClip.url}`;
              if (overlayClip.type === 'video') {
                const tempVideo = document.createElement('video');
                tempVideo.src = overlayClip.url;
                tempVideo.muted = true;
                tempVideo.crossOrigin = 'anonymous';
                tempVideo.preload = 'auto';
                overlayElementCacheRef.current.set(cacheKey, tempVideo);
                tempVideo.load();
              } else if (overlayClip.type === 'image') {
                const tempImg = new Image();
                tempImg.crossOrigin = 'anonymous';
                tempImg.src = overlayClip.url;
                overlayElementCacheRef.current.set(cacheKey, tempImg);
              }
            }
          }
        }
      }
      
      if (overlayElementCacheRef.current.size > 0) {
        console.log('✅ Preloaded overlay elements:', overlayElementCacheRef.current.size);
      }

      // Create canvas for capturing the player container
      const canvas = document.createElement('canvas');
      const rect = playerContainer.getBoundingClientRect();
      canvas.width = rect.width || 1920;
      canvas.height = rect.height || 1080;
      const ctx = canvas.getContext('2d');
      
      exportCanvasRef.current = canvas;
      
      // Wait a bit for overlay elements to start loading
      await new Promise(resolve => setTimeout(resolve, 300));

      // Find best supported WebM codec
      let selectedMimeType = 'video/webm';
      const codecs = [
        'video/webm;codecs=vp9',
        'video/webm;codecs=vp8',
        'video/webm'
      ];
      
      for (const codec of codecs) {
        if (MediaRecorder.isTypeSupported(codec)) {
          selectedMimeType = codec;
          console.log('✅ Using codec:', codec);
          break;
        }
      }
      
      // Start continuous frame drawing
      let isDrawing = true;
      let drawLoopId = null;
      const drawLoop = () => {
        if (!isDrawing) return;
        captureFrameToCanvas(canvas, ctx, playerContainer);
        drawLoopId = requestAnimationFrame(drawLoop);
      };
      
      // Start drawing before recording
      drawLoop();
      
      // Get canvas stream for video
      const canvasStream = canvas.captureStream(30); // 30 FPS
      
      // Create audio mixing context to combine all audio sources
      let audioContext = null;
      let audioDestination = null;
      const audioElements = [];
      
      try {
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        audioDestination = audioContext.createMediaStreamDestination();
        
        console.log('✅ AudioContext created for mixing');
      } catch (e) {
        console.warn('⚠️ AudioContext not available:', e);
      }
      
      // Get audio from primary video element
      const videoElement = videoRef.current || playerContainer.querySelector('video');
      if (videoElement && audioContext) {
        try {
          // Create source from video element
          const videoSource = audioContext.createMediaElementSource(videoElement);
          videoSource.connect(audioDestination);
          console.log('✅ Video audio connected to mixer');
        } catch (e) {
          console.warn('⚠️ Could not connect video audio:', e);
          // Fallback: try captureStream
          try {
            const videoStream = videoElement.captureStream(30);
            const vidAudioTracks = videoStream.getAudioTracks();
            if (vidAudioTracks.length > 0) {
              audioDestination.stream.addTrack(vidAudioTracks[0]);
              console.log('✅ Video audio added via captureStream');
            }
          } catch (e2) {
            console.warn('⚠️ Could not capture video audio:', e2);
          }
        }
      }
      
      // Add uploaded audio tracks to mixer
      if (audioTracks.length > 0 && audioContext) {
        console.log(`🎵 Mixing ${audioTracks.length} uploaded audio track(s)`);
        
        for (const audioClip of audioTracks) {
          try {
            // Create audio element for this track
            const audioEl = document.createElement('audio');
            audioEl.src = audioClip.url;
            audioEl.volume = audioClip.volume || 1.0;
            audioEl.preload = 'auto';
            audioEl.crossOrigin = 'anonymous';
            
            // Wait for audio to load
            await new Promise((resolve, reject) => {
              audioEl.onloadedmetadata = () => {
                try {
                  const audioSource = audioContext.createMediaElementSource(audioEl);
                  audioSource.connect(audioDestination);
                  audioElements.push({ element: audioEl, source: audioSource, clip: audioClip });
                  console.log(`✅ Audio track "${audioClip.name}" connected to mixer`);
                  resolve();
                } catch (error) {
                  console.warn(`⚠️ Could not connect audio "${audioClip.name}":`, error);
                  resolve(); // Continue even if one fails
                }
              };
              audioEl.onerror = reject;
              audioEl.load();
              
              // Timeout after 3 seconds
              setTimeout(() => resolve(), 3000);
            });
          } catch (e) {
            console.warn(`⚠️ Error adding audio track "${audioClip.name}":`, e);
          }
        }
      }
      
      // Combine video and mixed audio streams
      const videoTrack = canvasStream.getVideoTracks()[0];
      const combinedStream = new MediaStream();
      combinedStream.addTrack(videoTrack);
      
      // Add mixed audio track
      if (audioDestination && audioDestination.stream.getAudioTracks().length > 0) {
        const mixedAudioTrack = audioDestination.stream.getAudioTracks()[0];
        combinedStream.addTrack(mixedAudioTrack);
        console.log('✅ Mixed audio track added to recording stream');
        
        // Start audio playback during recording
        audioElements.forEach(({ element, clip }) => {
          element.currentTime = 0;
          element.play().catch(e => console.warn('Audio play error:', e));
        });
      } else {
        console.warn('⚠️ No audio available - recording video only');
      }
      
      // Store audio elements and context for cleanup and playback control during recording
      const recordingAudioElements = audioElements;
      
      // Use RecordRTC with combined stream for reliable WebM recording with audio
      const recorder = new RecordRTC(combinedStream, {
        type: 'video',
        mimeType: selectedMimeType,
        videoBitsPerSecond: 5000000, // 5 Mbps
        audioBitsPerSecond: 128000, // 128 kbps for audio
        frameRate: 30,
        disableLogs: false,
        timeSlice: 200, // Collect data every 200ms
        getNativeBlob: false // Use RecordRTC's blob handling
      });
      
      console.log('📋 RecordRTC configured with:', {
        mimeType: selectedMimeType,
        width: canvas.width,
        height: canvas.height,
        frameRate: 30
      });

      mediaRecorderRef.current = recorder;
      console.log('🎥 RecordRTC recorder initialized');

      // Start recording
      recorder.startRecording();
      console.log('✅ Recording started');

      // Record the timeline with audio control
      await recordTimeline(canvas, ctx, playerContainer, recordingAudioElements);

      // Stop drawing loop
      isDrawing = false;
      if (drawLoopId) {
        cancelAnimationFrame(drawLoopId);
      }

      // Wait a bit to ensure last frames are captured
      await new Promise(resolve => setTimeout(resolve, 500));

      // Stop recording
      console.log('🛑 Stopping recording...');
      await new Promise((resolve) => {
        recorder.stopRecording(() => {
          try {
            let blob = recorder.getBlob();
            console.log('✅ Recording stopped! Blob size:', blob.size, 'bytes');
            console.log('📋 Blob type:', blob.type);
            
            if (!blob || blob.size < 10000) {
              throw new Error(`Recorded video is too small (${blob?.size || 0} bytes). The export may have failed.`);
            }
            
            // Ensure blob is WebM format
            if (!blob.type || !blob.type.includes('webm')) {
              console.warn('⚠️ Blob type is not WebM, converting...');
              // Create new blob with correct WebM type
              blob = new Blob([blob], { type: selectedMimeType || 'video/webm' });
              console.log('✅ Converted to WebM, new type:', blob.type);
            }
            
            const blobUrl = URL.createObjectURL(blob);
            setExportUrl(blobUrl);
      setIsProcessing(false);
            
            // Cleanup
            exportCanvasRef.current = null;
            recorder.destroy();
            
            // Cleanup audio elements
            recordingAudioElements.forEach(({ element, source }) => {
              try {
                element.pause();
                element.src = '';
                if (source && source.disconnect) {
                  source.disconnect();
                }
              } catch (e) {
                // Ignore cleanup errors
              }
            });
            
            // Cleanup audio context
            if (audioContext && audioContext.state !== 'closed') {
              try {
                audioContext.close();
                console.log('✅ AudioContext closed');
              } catch (e) {
                console.warn('Error closing AudioContext:', e);
              }
            }
            
            console.log('✅ Export complete! Video URL:', blobUrl);
            console.log('📦 Final blob type:', blob.type, 'size:', blob.size);
            alert('Export complete! Click "Download Final Video" to save.');
            resolve();
          } catch (error) {
            console.error('Error processing recording:', error);
            setIsProcessing(false);
            recorder.destroy();
            alert(`Export failed: ${error.message}`);
            resolve();
          }
        });
      });

    } catch (error) {
      console.error('Export error:', error);
      setIsProcessing(false);
      if (mediaRecorderRef.current) {
        try {
          mediaRecorderRef.current.destroy();
        } catch (e) {
          console.warn('Error destroying recorder:', e);
        }
      }
      alert(`Export failed: ${error.message}`);
    }
  };

  // Record timeline by playing through it and continuously capturing frames
  const recordTimeline = async (canvas, ctx, playerContainer, audioElementsToControl = []) => {
    const duration = totalDuration;
    const fps = 30;

    console.log(`📹 Recording timeline: ${duration.toFixed(2)}s at ${fps} FPS`);

    // Start from beginning
    setGlobalTime(0);
    
    // Wait for React state to update
    await new Promise(resolve => setTimeout(resolve, 200));
    
    // Start playback using existing mechanism
    setIsPlaying(true);
    
    // Start audio playback
    audioElementsToControl.forEach(({ element, clip }) => {
      try {
        element.currentTime = 0;
        element.volume = clip.volume || 1.0;
        element.play().catch(e => console.warn('Audio play error:', e));
      } catch (e) {
        console.warn('Error starting audio:', e);
      }
    });
    
    // Wait a bit more for video and audio to start playing
    await new Promise(resolve => setTimeout(resolve, 300));

    const startTime = Date.now();
    let animationFrameId = null;
    let lastCaptureTime = 0;
    const captureInterval = 1000 / fps; // milliseconds between captures

    return new Promise((resolve) => {
      const captureFrame = () => {
        const elapsed = (Date.now() - startTime) / 1000;
        const currentTime = Math.min(elapsed, duration);

        // Update timeline position (this will trigger the existing video sync mechanism)
        setGlobalTime(currentTime);

        // Sync audio playback with timeline (respecting speed)
        audioElementsToControl.forEach(({ element, clip }) => {
          try {
            const audioSpeed = clip.speed || 1.0;
            const audioStartTime = clip.startTime || 0;
            const trimmedDuration = clip.trimEnd - clip.trimStart || clip.duration || 30;
            const effectiveDuration = trimmedDuration / audioSpeed;
            const audioEndTime = audioStartTime + effectiveDuration;
            
            // Set playback speed
            if (Math.abs(element.playbackRate - audioSpeed) > 0.01) {
              element.playbackRate = audioSpeed;
            }
            
            // Check if audio should be playing at current time
            if (currentTime >= audioStartTime && currentTime < audioEndTime) {
              // Calculate audio position accounting for speed
              const timelineOffset = currentTime - audioStartTime;
              const audioPosition = clip.trimStart + (timelineOffset * audioSpeed);
              
              // Update audio position if needed
              if (Math.abs(element.currentTime - audioPosition) > 0.1) {
                element.currentTime = audioPosition;
              }
              
              // Play if paused
              if (element.paused) {
                element.play().catch(() => {});
              }
            } else {
              // Pause if outside audio clip range
              if (!element.paused) {
                element.pause();
              }
            }
          } catch (e) {
            // Ignore sync errors
          }
        });

        // Capture frame at target FPS
        if (Date.now() - lastCaptureTime >= captureInterval) {
          // Get current active overlay clips info
          const currentOverlayClips = [];
          for (let trackIndex = 1; trackIndex < tracks.length; trackIndex++) {
            const track = tracks[trackIndex];
            if (track && track.length > 0) {
              const overlayClip = track[0];
              const trimmedDuration = overlayClip.trimEnd - overlayClip.trimStart;
              if (currentTime >= 0 && currentTime < trimmedDuration) {
                currentOverlayClips.push({
                  clip: overlayClip,
                  trackIndex: trackIndex,
                  localTime: currentTime + overlayClip.trimStart,
                });
              }
            }
          }
          captureFrameToCanvas(canvas, ctx, playerContainer, currentOverlayClips);
          lastCaptureTime = Date.now();
        }

        // Log progress every 10%
        const progress = (currentTime / duration) * 100;
        if (progress > 0 && Math.floor(progress) % 10 === 0 && progress % 10 < 1) {
          console.log(`📊 Export progress: ${progress.toFixed(1)}%`);
        }

        // Check if recording is complete
        if (currentTime >= duration) {
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
          }
          
          // Stop all audio
          audioElementsToControl.forEach(({ element }) => {
            try {
              element.pause();
              element.currentTime = 0;
            } catch (e) {
              // Ignore cleanup errors
            }
          });
          
          setIsPlaying(false);
          setGlobalTime(0);
          console.log(`✅ Recording complete after ${currentTime.toFixed(2)}s`);
          resolve();
        } else {
          // Continue capturing
          animationFrameId = requestAnimationFrame(captureFrame);
        }
      };

      // Start capturing frames
      animationFrameId = requestAnimationFrame(captureFrame);
    });
  };

  // Capture current frame of player to canvas (including all layers)
  const captureFrameToCanvas = (canvas, ctx, playerContainer, overlayClipsInfo = []) => {
    if (!canvas || !ctx || !playerContainer) return;

    try {
      // Clear canvas with black background
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Get container dimensions for scaling
      const containerRect = playerContainer.getBoundingClientRect();
      const scaleX = canvas.width / containerRect.width;
      const scaleY = canvas.height / containerRect.height;

      // 1. Draw base layer (V1) video
      const videoElement = videoRef.current || playerContainer.querySelector('.player-container > video');
      
      if (videoElement && videoElement.readyState >= 2) {
        // Set playback speed if clip has speed property
        const activeClip = v1ClipInfo?.clip;
        if (activeClip?.speed) {
          const speed = activeClip.speed || 1.0;
          if (Math.abs(videoElement.playbackRate - speed) > 0.01) {
            videoElement.playbackRate = speed;
          }
        }
        // Check if video has valid dimensions
        if (videoElement.videoWidth > 0 && videoElement.videoHeight > 0) {
          // Calculate aspect ratios
          const videoAspect = videoElement.videoWidth / videoElement.videoHeight;
          const canvasAspect = canvas.width / canvas.height;
          
          let drawWidth, drawHeight, drawX, drawY;
          
          // Maintain aspect ratio and fill canvas (cover mode)
          if (videoAspect > canvasAspect) {
            // Video is wider - fit to width
            drawWidth = canvas.width;
            drawHeight = canvas.width / videoAspect;
            drawX = 0;
            drawY = (canvas.height - drawHeight) / 2;
          } else {
            // Video is taller - fit to height
            drawHeight = canvas.height;
            drawWidth = canvas.height * videoAspect;
            drawX = (canvas.width - drawWidth) / 2;
            drawY = 0;
          }
          
          // Draw base video frame
          ctx.drawImage(videoElement, drawX, drawY, drawWidth, drawHeight);
        }
      }

      // 2. Draw all overlay layers (V2, V3, V4, etc.) - positioned absolutely on top
      // Render all active overlay clips
      for (let trackIndex = 1; trackIndex < tracks.length; trackIndex++) {
        const track = tracks[trackIndex];
        if (!track || track.length === 0) continue;
        
        const overlayClip = track[0]; // Overlay tracks hold one clip
        if (!overlayClip || !overlayClip.transform) continue;
        const { x, y, width, opacity } = overlayClip.transform;
        
        // Find overlay media element in DOM or use cached
        let overlayElementToDraw = null;
        const baseVideo = videoRef.current;
        const playerContainerEl = playerContainer.querySelector('.player-container') || playerContainer;
        
        // Try to find in DOM first
        const allVideos = Array.from(playerContainerEl.querySelectorAll('video'));
        const allImages = Array.from(playerContainerEl.querySelectorAll('img'));
        
        // Find overlay by checking absolutely positioned elements
        for (const media of [...allVideos, ...allImages]) {
          if (media !== baseVideo) {
            const parent = media.closest('[style*="absolute"]');
            if (parent && media.src === overlayClip.url) {
              overlayElementToDraw = media;
              break;
            }
          }
        }
        
        // If not found in DOM, use cached element
        if (!overlayElementToDraw) {
          const cacheKey = `${trackIndex}-${overlayClip.url}`;
          overlayElementToDraw = overlayElementCacheRef.current.get(cacheKey);
        }
        
        // Create element if still not found
        if (!overlayElementToDraw && overlayClip.url) {
          const cacheKey = `${trackIndex}-${overlayClip.url}`;
          try {
            if (overlayClip.type === 'video') {
              const tempVideo = document.createElement('video');
              tempVideo.src = overlayClip.url;
              tempVideo.muted = true;
              tempVideo.crossOrigin = 'anonymous';
              tempVideo.preload = 'auto';
              overlayElementCacheRef.current.set(cacheKey, tempVideo);
              overlayElementToDraw = tempVideo;
            } else if (overlayClip.type === 'image') {
              const tempImg = new Image();
              tempImg.crossOrigin = 'anonymous';
              tempImg.src = overlayClip.url;
              overlayElementCacheRef.current.set(cacheKey, tempImg);
              overlayElementToDraw = tempImg;
            }
          } catch (e) {
            console.warn('Could not create overlay element:', e);
          }
        }
        
        if (overlayElementToDraw) {
          // Update video time for overlay videos
          if (overlayElementToDraw.tagName === 'VIDEO') {
            // Set playback speed
            const speed = overlayClip.speed || 1.0;
            if (Math.abs(overlayElementToDraw.playbackRate - speed) > 0.01) {
              overlayElementToDraw.playbackRate = speed;
            }
            // Find matching overlay info for timing
            const overlayInfo = overlayClipsInfo.find(o => o.clip.id === overlayClip.id);
            if (overlayInfo?.localTime !== undefined) {
              try {
                overlayElementToDraw.currentTime = overlayInfo.localTime;
              } catch (e) {
                // Ignore seek errors
              }
            }
          }
          try {
            // Calculate overlay position and size from transform values
            // x, y, width are percentages (0-100)
            // Overlay uses translate(-50%, -50%) so it's centered on the position
            const overlayX = (x / 100) * canvas.width;
            const overlayY = (y / 100) * canvas.height;
            const overlayWidth = (width / 100) * canvas.width;
            
            // Calculate overlay height maintaining aspect ratio
            let overlayHeight;
            let isReady = false;
            
            if (overlayElementToDraw.videoWidth && overlayElementToDraw.videoWidth > 0) {
              // It's a video
              const overlayAspect = overlayElementToDraw.videoWidth / overlayElementToDraw.videoHeight;
              overlayHeight = overlayWidth / overlayAspect;
              isReady = overlayElementToDraw.readyState >= 2;
            } else if (overlayElementToDraw.naturalWidth && overlayElementToDraw.naturalWidth > 0) {
              // It's an image
              const overlayAspect = overlayElementToDraw.naturalWidth / overlayElementToDraw.naturalHeight;
              overlayHeight = overlayWidth / overlayAspect;
              isReady = overlayElementToDraw.complete;
            } else {
              // Use aspect ratio from clip if available
              overlayHeight = overlayWidth;
              isReady = true; // Draw anyway, might improve on next frame
            }
            
            if (isReady) {
              // Apply opacity
              ctx.globalAlpha = opacity !== undefined ? opacity : 1.0;
              
              // Draw overlay centered on the position (due to translate(-50%, -50%))
              const drawX = overlayX - overlayWidth / 2;
              const drawY = overlayY - overlayHeight / 2;
              
              try {
                ctx.drawImage(overlayElementToDraw, drawX, drawY, overlayWidth, overlayHeight);
              } catch (drawError) {
                // If draw fails, might be CORS or not ready - try next frame
                console.warn('Could not draw overlay this frame:', drawError);
              }
              
              // Reset alpha
              ctx.globalAlpha = 1.0;
            }
          } catch (overlayError) {
            console.warn(`Error drawing overlay layer ${trackIndex}:`, overlayError);
          }
        }
      } // End of overlay layers loop
      
    } catch (error) {
      // Silent fail - just draw black frame
      // This prevents console spam during recording
    }
  };


  const handleDownload = async (url) => {
    console.log('📥 Starting download for URL:', url?.substring(0, 100) + '...');
    
    try {
      let blob;
      let blobUrl;
      
      // If it's a data URL, convert to blob using base64 decoding
      if (url && url.startsWith('data:')) {
        console.log('📦 Converting data URL to blob...');
        try {
          // Method 1: Try fetch first (works for valid data URLs)
          try {
            const response = await fetch(url);
            blob = await response.blob();
            console.log('✅ Blob created via fetch, size:', blob.size, 'bytes, type:', blob.type);
          } catch (fetchError) {
            console.warn('Fetch method failed, trying manual base64 decode...', fetchError);
            
            // Method 2: Manual base64 decoding (more reliable for small/invalid data URLs)
            const base64Match = url.match(/^data:([^;]+);base64,(.+)$/);
            if (base64Match) {
              const mimeType = base64Match[1] || 'video/mp4';
              const base64Data = base64Match[2];
              
              // Decode base64 to binary string
              const binaryString = atob(base64Data);
              const bytes = new Uint8Array(binaryString.length);
              for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
              }
              
              blob = new Blob([bytes], { type: mimeType });
              console.log('✅ Blob created via manual decode, size:', blob.size, 'bytes, type:', blob.type);
            } else {
              throw new Error('Invalid data URL format');
            }
          }
          } catch (dataUrlError) {
          console.error('❌ Data URL conversion failed:', dataUrlError);
          throw new Error('Invalid video data. Please ensure the video was properly encoded.');
        }
      } else if (url && (url.startsWith('http://') || url.startsWith('https://'))) {
        // For regular URLs, fetch as blob with proper headers
        console.log('🌐 Fetching video from URL:', url);
        try {
          const response = await fetch(url, {
            method: 'GET',
            headers: {
              'Accept': 'video/*, */*',
            },
            mode: 'cors',
            credentials: 'omit',
          });

          if (!response.ok) {
            throw new Error(`Failed to fetch video: ${response.status} ${response.statusText}`);
          }

          // Check content type
          const contentType = response.headers.get('content-type') || '';
          console.log('📋 Response content-type:', contentType);
          
          blob = await response.blob();
          console.log('✅ Blob fetched, size:', blob.size, 'bytes, type:', blob.type || contentType);
          
          // Validate blob size (should be reasonable for a video)
          if (blob.size < 1000) {
            console.warn('⚠️ Warning: Video file seems too small (', blob.size, 'bytes). It may be invalid.');
          }
          
          // Ensure we have a video MIME type
          if (blob.type && !blob.type.startsWith('video/')) {
            console.warn('⚠️ Warning: Blob type is not video/*, setting to video/mp4');
            blob = new Blob([blob], { type: 'video/mp4' });
          }
          
        } catch (fetchError) {
          console.error('❌ Fetch failed:', fetchError);
          throw new Error(`Failed to download video: ${fetchError.message}`);
        }
      } else if (url && url.startsWith('blob:')) {
        // Already a blob URL, use it directly
        console.log('✅ URL is already a blob URL, using directly');
        blobUrl = url;
      } else {
        throw new Error('Invalid video URL');
      }

      // Create blob URL from blob if we have one (and don't already have a blob URL)
      if (!blobUrl && blob) {
        // Validate blob
        if (blob.size === 0) {
          throw new Error('Video file is empty or invalid');
        }

        // Create blob URL
        blobUrl = window.URL.createObjectURL(blob);
        console.log('🔗 Blob URL created:', blobUrl);
      } else if (blobUrl && url.startsWith('blob:')) {
        // Already have blob URL, use it
        console.log('✅ Using existing blob URL');
      } else if (!blobUrl && !blob) {
        throw new Error('No video data available for download');
      }

      // Generate filename with timestamp - use .webm extension for WebM format
      const filename = `nexus_edit_export_${Date.now()}.webm`;
      console.log('📝 Download filename:', filename);

      // Create download link
      const link = document.createElement('a');
      link.style.display = 'none';
      link.href = blobUrl;
      link.download = filename;
      link.setAttribute('download', filename); // Set both ways for better browser support
      
      // Append to body (required for Firefox)
      document.body.appendChild(link);
      
      // Force click
      console.log('🖱️ Triggering download...');
      link.click();
      
      // Give browser time to start download before cleanup
      // Important: Don't revoke too quickly or download may be cancelled
      setTimeout(() => {
        try {
          document.body.removeChild(link);
          console.log('🧹 Link removed from DOM');
        } catch (e) {
          console.warn('Could not remove link:', e);
        }
        
        // Revoke blob URL after a longer delay to ensure download completes
        setTimeout(() => {
          try {
            window.URL.revokeObjectURL(blobUrl);
            console.log('🧹 Blob URL revoked');
          } catch (e) {
            console.warn('Could not revoke blob URL:', e);
          }
        }, 1000); // Wait 1 second before revoking
      }, 200);
      
      console.log('✅ Download initiated successfully');
      
    } catch (error) {
      console.error('❌ Download error:', error);
      
      // Fallback: try direct download link (works for same-origin or download-enabled servers)
      console.log('🔄 Trying fallback download method...');
      try {
        const link = document.createElement('a');
        link.href = url;
        link.download = `nexus_edit_export_${Date.now()}.webm`;
        link.target = '_blank';
        link.rel = 'noopener noreferrer';
        document.body.appendChild(link);
        link.click();
        
        setTimeout(() => {
          document.body.removeChild(link);
        }, 100);
        
        console.log('✅ Fallback download method attempted');
      } catch (fallbackError) {
        console.error('❌ Fallback also failed:', fallbackError);
        const errorMsg = error.message || 'Unable to download video.';
        alert(`${errorMsg}\n\nIf the issue persists, please try:\n1. Right-click the video player and select "Save video as..."\n2. Check your browser's download permissions\n3. Try a different browser`);
        throw error;
      }
    }
  };

  const selectedClip = useMemo(() => {
    // Check video/image tracks
    for (const track of tracks) {
        const clip = track.find(c => c.id === selectedClipId);
        if (clip) return clip;
    }
    // Check audio tracks
    const audioClip = audioTracks.find(a => a.id === selectedClipId);
    if (audioClip) return audioClip;
    return null;
  }, [selectedClipId, tracks, audioTracks]);


  // --- Drag & Trim Logic (Core) ---
  const handleDragStart = (e, clip, handle, trackIndex) => {
    e.stopPropagation();
    // Find timeline container - check both .timeline-container and parent elements
    let timelineElement = e.target.closest('.timeline-container');
    if (!timelineElement) {
      // For audio tracks, the timeline container might be a parent
      timelineElement = e.target.closest('[class*="timeline"]')?.parentElement?.querySelector('.timeline-container') ||
                       document.querySelector('.timeline-container');
    }
    if (!timelineElement || totalDuration === 0) return;

    const timelineWidth = timelineElement.getBoundingClientRect().width - 16;
    const pixelsPerSecond = timelineWidth / totalDuration;

    setDragState({
      clipId: clip.id,
      handle,
      startX: e.clientX,
      initialTrimStart: clip.trimStart,
      initialTrimEnd: clip.trimEnd,
      pixelsPerSecond,
      trackIndex
    });
  };

  useEffect(() => {
    const handleMouseMove = (e) => {
      if (!dragState) return;
      
      const deltaPixels = e.clientX - dragState.startX;
      const deltaSeconds = deltaPixels / dragState.pixelsPerSecond;
      
      // Handle audio tracks
      if (dragState.trackIndex === 'audio') {
        setAudioTracks(prevAudioTracks => {
          return prevAudioTracks.map(audioClip => {
            if (audioClip.id !== dragState.clipId) return audioClip;

            if (dragState.handle === 'start') {
              let newStart = dragState.initialTrimStart + deltaSeconds;
              newStart = Math.max(0, newStart);
              newStart = Math.min(newStart, audioClip.trimEnd - 0.5);
              return { ...audioClip, trimStart: newStart };
            } else {
              let newEnd = dragState.initialTrimEnd + deltaSeconds;
              newEnd = Math.max(audioClip.trimStart + 0.5, newEnd);
              newEnd = Math.min(newEnd, audioClip.duration);
              return { ...audioClip, trimEnd: newEnd };
            }
          });
        });
        return;
      }
      
      // Handle video/image tracks
      setTracks(prevTracks => {
         return prevTracks.map((track, tIndex) => {
            if (tIndex !== dragState.trackIndex) return track;

            return track.map(clip => {
                if (clip.id !== dragState.clipId) return clip;

                if (dragState.handle === 'start') {
                  let newStart = dragState.initialTrimStart + deltaSeconds;
                  newStart = Math.max(0, newStart);
                  newStart = Math.min(newStart, clip.trimEnd - 0.5);
                  return { ...clip, trimStart: newStart };
                } else {
                  let newEnd = dragState.initialTrimEnd + deltaSeconds;
                  newEnd = Math.max(clip.trimStart + 0.5, newEnd);
                  newEnd = Math.min(newEnd, clip.duration);
                  return { ...clip, trimEnd: newEnd };
                }
            });
         });
      });
    };

    const handleMouseUp = () => {
      setDragState(null);
    };

    if (dragState) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [dragState]);


  // --- Timeline Rendering Helper ---
  const renderTimelineTrack = (trackClips, trackIndex, trackName) => {
    const isPrimaryTrack = trackIndex === 0;

    return (
        <div 
          key={trackIndex} 
          className="mb-4"
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();

            if (!draggedClip) return;

            const { clip, originalTrackIndex } = draggedClip;

            setTracks(prevTracks => {
                const newTracks = prevTracks.map(t => [...t]);
                const newClip = { ...clip };

                // 1. Remove from original track
                newTracks[originalTrackIndex] = newTracks[originalTrackIndex].filter(c => c.id !== clip.id);

                // 2. Add or remove transform based on target track (V2 requires transform)
                if (trackIndex === 1 && !newClip.transform) {
                     newClip.transform = { x: 50, y: 50, width: 30, height: 'auto', opacity: 1 };
                } else if (trackIndex === 0 && newClip.transform) {
                     delete newClip.transform;
                }

                // 3. Add to target track (append or replace for V2)
                newTracks[trackIndex] = trackIndex === 1 ? [newClip] : [...newTracks[trackIndex], newClip];
                
                return newTracks;
            });

            setDraggedClip(null);
          }}
        >
            <div className="flex items-center justify-between mb-1 px-1 sticky left-0">
              <span className="text-xs text-gray-700 uppercase font-bold tracking-wider flex items-center gap-2">
                <Layers size={12} /> {trackName}
                {draggedClip && draggedClip.originalTrackIndex !== trackIndex && (
                    <span className="text-[#13008B] text-xs font-normal ml-2 transition-opacity">
                        Drop Here to Move Clip
                    </span>
                )}
              </span>
              <button 
                className="p-1 hover:bg-gray-200 rounded text-gray-600" 
                onClick={() => {
                  setUploadTargetTrack(trackIndex); 
                  fileInputRef.current.click();
                }}
                title={`Add Clip to ${trackName}`}
              >
                  <Plus size={14}/>
              </button>
            </div>
            
            <div className="relative h-14 bg-gray-100 rounded-lg border border-gray-300 flex items-center px-2 py-1 gap-0.5 overflow-visible">
                {/* Global Playhead */}
                {isPrimaryTrack && totalDuration > 0 && (
                   <div 
                     className={`absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none transition-transform duration-75`}
                     style={{ left: `calc(8px + ${(globalTime / totalDuration) * (100 - 2)}%)` }} 
                   >
                      <div className="absolute -top-3 -left-1.5 w-3 h-3 bg-red-500 rotate-45"></div>
                   </div>
                )}
                
                {/* Clips Renderer */}
                {trackClips.map((clip, index) => {
                  const isSelected = selectedClipId === clip.id;
                  const isActive = isPrimaryTrack ? v1ClipInfo?.clip.id === clip.id : v2ClipInfo?.clip.id === clip.id;
                  const trimmedDuration = clip.trimEnd - clip.trimStart;
                  const speed = clip.speed || 1.0;
                  const effectiveDuration = trimmedDuration / speed;
                  
                  const nextClip = isPrimaryTrack ? tracks[0][index + 1] : null;
                  const transitionId = nextClip ? `${clip.id}-${nextClip.id}` : null;
                  const hasTransition = transitionId && transitions[transitionId];
                  
                  // For primary track, flex-grow determines relative width. For V2, it uses a fixed relative size for visualization.
                  const clipWidthStyle = isPrimaryTrack 
                    ? { flexGrow: effectiveDuration, minWidth: '60px' }
                    : { width: `${(effectiveDuration / totalDuration) * 100}%`, minWidth: '60px' }; 

                  return (
                    <React.Fragment key={clip.id}>
                      {/* Video Block */}
                      <div 
                        onClick={() => setSelectedClipId(clip.id)}
                        draggable
                        onDragStart={(e) => {
                            e.stopPropagation();
                            setDraggedClip({ clip, originalTrackIndex: trackIndex });
                            e.dataTransfer.setData('text/plain', clip.id);
                            setTimeout(() => e.target.style.opacity = '0.3', 0);
                        }}
                        onDragEnd={(e) => {
                            e.target.style.opacity = '1';
                            setDraggedClip(null);
                        }}
                        className={`
                          clip-block relative h-full rounded-md cursor-grab transition-all border-2 group
                          ${isSelected ? 'border-[#13008B] ring-2 ring-[#13008B]/20 z-10' : 'border-gray-400 hover:border-gray-500'}
                          ${isActive ? 'opacity-100' : 'opacity-70'}
                          ${!isPrimaryTrack && 'shrink-0'}
                        `}
                        style={{ 
                          ...clipWidthStyle,
                          backgroundImage: `url(${clip.url})`,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          overflow: 'visible'
                        }}
                      >
                         <div className="absolute inset-0 bg-black/20 group-hover:bg-black/10 transition-colors pointer-events-none"></div>
                         <div className="absolute bottom-1 left-2 text-[10px] font-medium text-white truncate max-w-full shadow-sm pointer-events-none">
                           {clip.name}
                         </div>
                         <div className="absolute top-1 right-1 text-[9px] bg-black/50 text-white px-1 rounded pointer-events-none">
                           {effectiveDuration.toFixed(1)}s
                         </div>

                         {/* QUICK DELETE BUTTON */}
                         {isSelected && (
                            <button 
                                onClick={(e) => { e.stopPropagation(); deleteClip(clip.id); }}
                                className="absolute top-0 right-0 transform -translate-y-1/2 translate-x-1/2 w-5 h-5 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center p-0 z-40 shadow-lg"
                                title="Delete Clip"
                            >
                                <X size={12} strokeWidth={3} />
                            </button>
                         )}

                         {/* DRAG HANDLES (for trimming) */}
                         {isSelected && (
                           <>
                             {/* Left Handle */}
                             <div 
                               className="absolute -left-1.5 top-0 bottom-0 w-3 hover:w-4 bg-yellow-500 cursor-ew-resize z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity rounded-l-md"
                               onMouseDown={(e) => handleDragStart(e, clip, 'start', trackIndex)}
                               title="Drag to trim start"
                             >
                               <GripVertical size={12} className="text-black/50" />
                             </div>
                             
                             {/* Right Handle */}
                             <div 
                               className="absolute -right-1.5 top-0 bottom-0 w-3 hover:w-4 bg-yellow-500 cursor-ew-resize z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity rounded-r-md"
                               onMouseDown={(e) => handleDragStart(e, clip, 'end', trackIndex)}
                               title="Drag to trim end"
                             >
                               <GripVertical size={12} className="text-black/50" />
                             </div>
                           </>
                         )}
                      </div>

                      {/* Transition Node (Connector) - Only on Primary Track */}
                      {isPrimaryTrack && nextClip && (
                        <div className="relative w-4 flex items-center justify-center z-20 -ml-2 -mr-2">
                           <button 
                             onClick={() => {
                               setActiveTab('transitions');
                               setActiveTransitionId(transitionId);
                             }}
                             className={`
                               w-5 h-5 rounded-full flex items-center justify-center border transition-all transform hover:scale-110
                               ${hasTransition 
                                  ? 'bg-[#13008B] border-[#13008B] text-white' 
                                  : 'bg-gray-200 border-gray-400 text-gray-600 hover:bg-gray-300 hover:text-gray-900'}
                             `}
                             title={`Edit Transition: ${transitions[transitionId] || 'None'}`}
                           >
                             <Zap size={10} />
                           </button>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
            </div>
        </div>
    );
  }

  // Render Audio Timeline Track
  const renderAudioTimelineTrack = () => {
    if (audioTracks.length === 0) return null;

    return (
      <div className="mt-4 pt-4 border-t border-gray-300">
        <div className="flex items-center justify-between mb-1 px-1 sticky left-0">
          <span className="text-xs text-gray-700 uppercase font-bold tracking-wider flex items-center gap-2">
            <Clock size={12} /> Audio Tracks
          </span>
          <button 
            className="p-1 hover:bg-gray-200 rounded text-gray-600" 
            onClick={() => {
              setUploadTargetTrack(0); // Upload to audio tracks
              fileInputRef.current.click();
            }}
            title="Add Audio Track"
          >
            <Plus size={14}/>
          </button>
        </div>
        
        <div className="relative h-14 bg-gray-100 rounded-lg border border-gray-300 flex items-center px-2 py-1 gap-0.5 overflow-visible">
          {/* Global Playhead */}
          {totalDuration > 0 && (
            <div 
              className={`absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 pointer-events-none transition-transform duration-75`}
              style={{ left: `calc(8px + ${(globalTime / totalDuration) * (100 - 2)}%)` }} 
            >
              <div className="absolute -top-3 -left-1.5 w-3 h-3 bg-red-500 rotate-45"></div>
            </div>
          )}
          
          {/* Audio Clips */}
          {audioTracks.map((audioClip) => {
            const isSelected = selectedClipId === audioClip.id;
            const trimmedDuration = audioClip.trimEnd - audioClip.trimStart;
            const speed = audioClip.speed || 1.0;
            const effectiveDuration = trimmedDuration / speed; // Effective duration on timeline
            const clipStartPercent = totalDuration > 0 ? (audioClip.startTime / totalDuration) * 100 : 0;
            const clipWidthPercent = totalDuration > 0 ? (effectiveDuration / totalDuration) * 100 : 0;
            
            return (
              <div
                key={audioClip.id}
                onClick={() => setSelectedClipId(audioClip.id)}
                draggable
                onDragStart={(e) => {
                  e.stopPropagation();
                  setDraggedClip({ clip: audioClip, originalTrackIndex: 'audio' });
                  setTimeout(() => e.target.style.opacity = '0.3', 0);
                }}
                onDragEnd={(e) => {
                  e.target.style.opacity = '1';
                  setDraggedClip(null);
                }}
                className={`
                  clip-block absolute h-full rounded-md cursor-grab transition-all border-2 group
                  ${isSelected ? 'border-[#13008B] ring-2 ring-[#13008B]/20 z-10' : 'border-gray-400 hover:border-gray-500'}
                  bg-gray-200 hover:bg-gray-300
                `}
                style={{ 
                  left: `${clipStartPercent}%`,
                  width: `${clipWidthPercent}%`,
                  minWidth: '60px',
                  overflow: 'visible'
                }}
              >
                <div className="absolute inset-0 bg-gray-300/50 group-hover:bg-gray-400/50 transition-colors pointer-events-none"></div>
                <div className="absolute bottom-1 left-2 text-[10px] font-medium text-gray-900 truncate max-w-full shadow-sm pointer-events-none">
                  {audioClip.name}
                </div>
                <div className="absolute top-1 right-1 text-[9px] bg-black/50 text-white px-1 rounded pointer-events-none">
                  {effectiveDuration.toFixed(1)}s
                </div>
                {audioClip.speed && audioClip.speed !== 1.0 && (
                  <div className="absolute top-1 left-1 text-[9px] bg-yellow-600/80 text-black px-1 rounded font-bold pointer-events-none">
                    {audioClip.speed}x
                  </div>
                )}

                {/* Quick Delete Button */}
                {isSelected && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); deleteClip(audioClip.id); }}
                    className="absolute top-0 right-0 transform -translate-y-1/2 translate-x-1/2 w-5 h-5 bg-red-600 hover:bg-red-500 text-white rounded-full flex items-center justify-center p-0 z-40 shadow-lg"
                    title="Delete Audio"
                  >
                    <X size={12} strokeWidth={3} />
                  </button>
                )}

                {/* Drag Handle to Reposition */}
                {isSelected && (
                  <div 
                    className="absolute -left-1 top-0 bottom-0 w-2 bg-[#13008B] cursor-ew-resize z-30 opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity rounded-l-md flex items-center justify-center"
                    onMouseDown={(e) => {
                      e.stopPropagation();
                      const startX = e.clientX;
                      const timelineContainer = e.currentTarget.closest('.relative');
                      const timelineRect = timelineContainer.getBoundingClientRect();
                      const initialStartTime = audioClip.startTime;
                      
                      const handleMouseMove = (moveEvent) => {
                        const deltaX = moveEvent.clientX - startX;
                        const deltaPercent = (deltaX / timelineRect.width) * 100;
                        const deltaTime = (deltaPercent / 100) * totalDuration;
                        // Calculate effective duration for this audio clip
                        const trimmedDuration = audioClip.trimEnd - audioClip.trimStart;
                        const speed = audioClip.speed || 1.0;
                        const effectiveDuration = trimmedDuration / speed;
                        const newStartTime = Math.max(0, Math.min(totalDuration - effectiveDuration, initialStartTime + deltaTime));
                        
                        setAudioTracks(prev => prev.map(a => 
                          a.id === audioClip.id ? { ...a, startTime: newStartTime } : a
                        ));
                      };
                      
                      const handleMouseUp = () => {
                        document.removeEventListener('mousemove', handleMouseMove);
                        document.removeEventListener('mouseup', handleMouseUp);
                      };
                      
                      document.addEventListener('mousemove', handleMouseMove);
                      document.addEventListener('mouseup', handleMouseUp);
                    }}
                    title="Drag to reposition on timeline"
                  >
                    <GripVertical size={10} className="text-white" />
                  </div>
                )}

                {/* Trim Handles */}
                {isSelected && (
                  <>
                    <div 
                      className="absolute -left-1.5 top-0 bottom-0 w-3 hover:w-4 bg-yellow-500 cursor-ew-resize z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity rounded-l-md"
                      onMouseDown={(e) => handleDragStart(e, audioClip, 'start', 'audio')}
                      title="Drag to trim start"
                    >
                      <GripVertical size={12} className="text-black/50" />
                    </div>
                    
                    <div 
                      className="absolute -right-1.5 top-0 bottom-0 w-3 hover:w-4 bg-yellow-500 cursor-ew-resize z-30 flex items-center justify-center opacity-0 group-hover:opacity-100 hover:opacity-100 transition-opacity rounded-r-md"
                      onMouseDown={(e) => handleDragStart(e, audioClip, 'end', 'audio')}
                      title="Drag to trim end"
                    >
                      <GripVertical size={12} className="text-black/50" />
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // V2 Overlay Component
  const OverlayElement = ({ clip }) => {
    // Hooks must be called before any early returns
    const elementRef = useRef(null);

    // Sync V2 Video playback time
    useEffect(() => {
        if (!clip || !clip.transform || clip.type !== 'video' || !elementRef.current) return;
        const videoElement = elementRef.current;
        const localTime = v2ClipInfo?.localTime;

        if (v2ClipInfo) {
             // Set playback speed
             const speed = clip.speed || 1.0;
             if (Math.abs(videoElement.playbackRate - speed) > 0.01) {
               videoElement.playbackRate = speed;
             }
             // Sync time
            if (Math.abs(videoElement.currentTime - localTime) > 0.3) {
                videoElement.currentTime = localTime;
            }
             // Play if playing
            if (isPlaying && videoElement.paused) {
                videoElement.play().catch(e => console.log("V2 Play interrupted"));
            } else if (!isPlaying && !videoElement.paused) {
                videoElement.pause();
            }
        } else {
            // Not active (V2 clip is not active on timeline)
            videoElement.pause();
            videoElement.currentTime = clip.trimStart;
        }
    }, [v2ClipInfo, isPlaying, clip?.type, clip?.trimStart]);

    // Early return after all hooks
    if (!clip || !clip.transform) return null;

    const { x, y, width, opacity } = clip.transform;
    const isSelected = selectedClipId === clip.id;
    const isInteracting = interactionState && interactionState.clipId === clip.id;

    const Component = clip.type === 'image' ? 'img' : 'video'; 
    
    return (
        <div
            onClick={(e) => { e.stopPropagation(); setSelectedClipId(clip.id); }}
            onMouseDown={isSelected ? (e) => handleOverlayDragStart(e, clip) : undefined} 
            className={`
                absolute top-0 left-0 transform-gpu cursor-move transition-opacity 
                ${isSelected ? 'z-50' : 'z-20'} 
                ${isInteracting ? 'cursor-grabbing' : 'hover:ring-2 hover:ring-blue-500/50'}
            `}
            style={{
                left: `${x}%`,
                top: `${y}%`,
                width: `${width}%`,
                opacity: opacity,
                transform: `translate(-50%, -50%)`, 
            }}
        >
            <Component
                ref={elementRef}
                src={clip.url}
                className={`
                    w-full h-auto object-contain rounded-lg shadow-xl shadow-black/50 border-4 transition-all
                    ${isSelected ? 'border-blue-500 ring-4 ring-blue-500/40' : 'border-transparent'}
                `}
                muted={clip.type === 'video' ? true : undefined}
                autoPlay={false} 
                loop={false} 
                style={{ pointerEvents: isSelected ? 'auto' : 'none' }}
            />

            {/* Resize Handle (Bottom Right) */}
            {isSelected && (
                <div
                    onMouseDown={(e) => handleResizeStart(e, clip, 'bottom-right')}
                    className="resize-handle absolute -bottom-2 -right-2 w-4 h-4 bg-yellow-500 rounded-full cursor-nwse-resize z-50 shadow-lg border-2 border-white"
                    title="Resize Overlay"
                />
            )}
        </div>
    );
  };


  return (
     <div className="flex h-full w-full bg-white text-gray-900 overflow-hidden font-sans select-none">
      
      {/* Hidden file input for programmatic triggering */}
      <input 
        ref={fileInputRef} 
        type="file" 
        accept="video/*,image/*,audio/*" 
        multiple 
        className="hidden" 
        onChange={handleFileUpload} 
      />

      {/* Custom Transition CSS (Simulated) */}
      <style>{`
        .bg-dots {
             background-image: radial-gradient(#e5e7eb 1px, transparent 1px);
            background-size: 20px 20px;
             background-color: #f9fafb;
        }
        
        .player-container {
            transition: all ${TRANSITION_DURATION}s ease-in-out;
            position: relative;
            overflow: hidden;
        }

        .transition-out-fade { opacity: 0; }
        .transition-in-fade { opacity: 1; }

        .player-container::before {
            content: '';
            position: absolute;
            inset: 0;
            background-color: black;
            opacity: 0;
            transition: opacity ${TRANSITION_DURATION}s ease-in-out;
            z-index: 10;
            pointer-events: none;
        }
        .transition-out-dip-to-black::before { opacity: 1; }
        .transition-in-dip-to-black::before { opacity: 0; }
        
        .transition-out-slide-right { transform: translateX(100%); }
        .transition-in-slide-right { transform: translateX(0); }

        @keyframes pulse-red {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        .pulse {
            animation: pulse-red 1s infinite;
        }
      `}</style>
      
      {/* LEFT SIDEBAR - TOOLS */}
       <div className="w-16 flex flex-col items-center py-4 bg-white border-r border-gray-200 z-20">
         <div className="mb-6 p-2 bg-[#13008B] rounded-lg">
          <Film size={24} className="text-white" />
        </div>
        
        <div className="flex flex-col gap-4 w-full px-2">
          <ToolButton icon={Monitor} label="Edit" active={activeTab === 'adjust'} onClick={() => setActiveTab('adjust')} />
          <ToolButton icon={ArrowRightLeft} label="Transit" active={activeTab === 'transitions'} onClick={() => setActiveTab('transitions')} />
        </div>

        <div className="mt-auto mb-4">
          <ToolButton icon={Settings} label="Settings" />
        </div>
      </div>

      {/* MAIN CONTENT AREA */}
      <div className="flex-1 flex flex-col h-full relative">
        
        {/* HEADER */}
         <header className="h-14 bg-white border-b border-gray-200 flex items-center justify-between px-6">
          <div className="flex items-center gap-4">
             <h1 className="font-bold text-lg text-[#13008B] tracking-wide">Video Editor</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {/* Add Layer Button */}
            <Button 
              onClick={addLayer}
              icon={Plus}
              className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
            >
              Add Layer
            </Button>
            
            {/* Layer Selector Dropdown */}
            <div className="relative">
              <select
                value={uploadTargetTrack}
                onChange={(e) => setUploadTargetTrack(parseInt(e.target.value))}
                 className="px-3 py-1.5 rounded-lg bg-white hover:bg-gray-50 text-gray-700 text-sm border border-gray-300"
              >
                <option value={0}>Add to V1 (Primary)</option>
                {tracks.slice(1).map((_, index) => (
                  <option key={index + 1} value={index + 1}>Add to V{index + 2}</option>
                ))}
              </select>
            </div>
            
             <Button 
                onClick={() => {
                    fileInputRef.current.click();
                }}
                icon={Upload}
                className="bg-gray-100 hover:bg-gray-200 text-gray-700 border border-gray-300"
             >
              Add Media
            </Button>
            
            <Button 
              onClick={() => {
                // Create a separate input for audio files
                const audioInput = document.createElement('input');
                audioInput.type = 'file';
                audioInput.accept = 'audio/*';
                audioInput.multiple = true;
                audioInput.onchange = handleFileUpload;
                audioInput.click();
              }}
              icon={Layers}
               className="bg-[#13008B] hover:bg-[#0f0069] text-white"
            >
              Add Audio
            </Button>

            {/* EXPORT/RECORDING BUTTON */}
            {exportUrl ? (
                <button
                    onClick={async () => {
                        try {
                            await handleDownload(exportUrl);
                            // Don't clear URL immediately - let user download again if needed
                            // setExportUrl(null);
                        } catch (error) {
                            console.error('Download failed:', error);
                            alert(`Download failed: ${error.message}`);
                        }
                    }}
                    className="flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-500 transition-all shadow-lg shadow-green-500/30 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    <Download size={16} /> Download Final Video
                </button>
            ) : (
                <Button 
                    onClick={handleExport} 
                    icon={Download} 
                    disabled={tracks[0].length === 0 || isProcessing}
                    active={!isProcessing}
                     className={`bg-[#13008B] hover:bg-[#0f0069] text-white shadow-lg`}
                >
                    {isProcessing 
                        ? 'Encoding...' 
                        : 'Export Video'}
                </Button>
            )}

          </div>
        </header>

        {/* WORKSPACE */}
        <div className="flex-1 flex overflow-hidden">
          
          {/* PLAYER & TIMELINE AREA */}
           <div className="flex-1 flex flex-col bg-gray-50 relative min-w-0">
            
            {/* VIDEO PREVIEW CANVAS */}
            <div className="flex-1 flex items-center justify-center p-8 overflow-hidden relative bg-dots">
              {/* NOTE: Removed pulsing REC indicator */}
              {(tracks[0].length > 0 || activeOverlayClips.length > 0) ? (
                <div 
                  ref={playerRef} 
                  className="player-container relative shadow-2xl shadow-black/50 group"
                  style={{ maxHeight: '100%', maxWidth: '100%', aspectRatio: '16/9', overflow: 'visible' }}
                >
                    {/* V1 - BASE LAYER - Always render if there are clips in primary track */}
                    {tracks[0].length > 0 && (
                        <video
                            ref={videoRef}
                            className="w-full h-full object-contain bg-black relative z-10" 
                            muted={false} 
                            preload="auto"
                        />
                    )}
                    
                    {/* Placeholder if V1 is empty */}
                    {tracks[0].length === 0 && (
                        <div className="w-full h-full bg-black flex items-center justify-center absolute inset-0 z-30">
                            <Film size={48} className="text-gray-400 opacity-50" />
                        </div>
                    )}
                    
                    {/* ALL OVERLAY LAYERS - RENDERED ON TOP */}
                    {activeOverlayClips.map((overlayInfo, index) => (
                      <OverlayElement key={`overlay-${overlayInfo.trackIndex}-${index}`} clip={overlayInfo.clip} />
                    ))}
                    
                    {/* Audio playback (hidden audio elements for timing) */}
                    {audioTracks.map((audioClip) => (
                      <audio
                        key={audioClip.id}
                        ref={(el) => {
                          if (el) {
                            // Sync audio playback with timeline
                            const audioSpeed = audioClip.speed || 1.0;
                            const audioEffectiveDuration = (audioClip.trimEnd - audioClip.trimStart) / audioSpeed;
                            const shouldPlay = isPlaying && globalTime >= audioClip.startTime && 
                                            globalTime < audioClip.startTime + audioEffectiveDuration;
                            
                            // Set playback speed
                            if (Math.abs(el.playbackRate - audioSpeed) > 0.01) {
                              el.playbackRate = audioSpeed;
                            }
                            
                            if (shouldPlay && el.paused) {
                              const audioPosition = (globalTime - audioClip.startTime) * audioSpeed + (audioClip.trimStart || 0);
                              el.currentTime = audioPosition;
                              el.volume = audioClip.volume || 1.0;
                              el.play().catch(() => {});
                            } else if (!shouldPlay && !el.paused) {
                              el.pause();
                            }
                          }
                        }}
                        src={audioClip.url}
                        preload="auto"
                        className="hidden"
                      />
                    ))}

                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-gray-600 border-2 border-dashed border-gray-300 rounded-2xl p-12">
                  <Film size={48} className="mb-4 opacity-50" />
                  <p className="text-lg font-medium">Timeline is Empty</p>
                  <p className="text-sm opacity-60">Add clips to start editing</p>
                </div>
              )}
            </div>

            {/* PLAYER CONTROLS */}
             <div className="h-14 bg-white border-t border-gray-200 flex items-center justify-center gap-6 px-4 z-10 shrink-0">
               <button className="text-gray-600 hover:text-[#13008B]" onClick={() => setGlobalTime(Math.max(0, globalTime - 5))}><SkipBack size={20} /></button>
              <button 
                onClick={() => setIsPlaying(!isPlaying)}
                 className="w-10 h-10 bg-[#13008B] rounded-full flex items-center justify-center text-white hover:bg-[#0f0069] hover:scale-105 transition active:scale-95 disabled:opacity-50"
                disabled={isProcessing}
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" className="ml-0.5" />}
              </button>
               <button className="text-gray-600 hover:text-[#13008B]" onClick={() => setGlobalTime(Math.min(totalDuration, globalTime + 5))}><SkipForward size={20} /></button>
              
               <div className="text-xs font-mono text-gray-700 ml-4 bg-gray-100 px-2 py-1 rounded border border-gray-300">
                 {formatTime(globalTime)} <span className="text-gray-500">/</span> {formatTime(totalDuration)}
              </div>
            </div>

            {/* MULTI-TRACK TIMELINE */}
             <div className="h-64 bg-white border-t border-gray-200 p-4 relative overflow-x-auto overflow-y-auto timeline-container">
              
              {/* Layer Management Header */}
              <div className="flex items-center justify-between mb-2 pb-2 border-b border-gray-300">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-700 uppercase">Layers</span>
                  <button
                    onClick={addLayer}
                    className="px-2 py-1 text-xs bg-[#13008B] hover:bg-[#0f0069] text-white rounded"
                    title="Add New Layer"
                  >
                    <Plus size={12} />
                  </button>
                </div>
                <button
                  onClick={() => {
                    // Create a separate input for audio files only
                    const audioInput = document.createElement('input');
                    audioInput.type = 'file';
                    audioInput.accept = 'audio/*';
                    audioInput.multiple = true;
                    audioInput.onchange = handleFileUpload;
                    audioInput.click();
                  }}
                  className="px-2 py-1 text-xs bg-[#13008B] hover:bg-[#0f0069] text-white rounded flex items-center gap-1"
                  title="Add Audio"
                >
                  <Layers size={12} /> Audio
                </button>
              </div>
              
              {/* Render all overlay layers (V2, V3, V4, etc.) */}
              {tracks.slice(1).map((track, index) => {
                const trackIndex = index + 1;
                return (
                  <div key={trackIndex} className="relative mb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs text-gray-600 w-20">V{trackIndex + 1}</span>
                      {trackIndex > 1 && (
                        <button
                          onClick={() => removeLayer(trackIndex)}
                          className="text-xs text-red-600 hover:text-red-700"
                          title="Remove Layer"
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                    {renderTimelineTrack(track, trackIndex, `V${trackIndex + 1} (Overlay)`)}
                  </div>
                );
              })}
              
              {/* Primary Track (V1) */}
              {renderTimelineTrack(tracks[0], 0, "V1 (Primary)")}

              {/* Audio Timeline Tracks */}
              {renderAudioTimelineTrack()}

            </div>
          </div>

          {/* RIGHT SIDEBAR - CONTEXT PROPERTIES */}
           <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto shrink-0">
            {selectedClip ? (
              <div className="p-5">
                 {/* Header for Selected Clip */}
                 <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-300">
                    <div className="flex flex-col">
                       <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Properties</span>
                       <span className="text-sm font-medium text-gray-900 truncate w-40" title={selectedClip.name}>{selectedClip.name}</span>
                    </div>
                    {/* Delete button from properties panel */}
                    <Button variant="danger" onClick={() => deleteClip(selectedClip.id)} className="px-2 py-1"><Trash2 size={14}/></Button>
                 </div>

                {/* Adjustments Tab */}
                {activeTab === 'adjust' && (
                  <div className="animate-in fade-in slide-in-from-right-4 duration-300 space-y-6">
                    {/* Trim Controls */}
                     <div className="bg-gray-50 p-4 rounded-xl border border-gray-300">
                       <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase flex items-center gap-2"><Scissors size={12}/> Trim Clip</h3>
                       <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                         Drag the <span className="text-yellow-600 font-bold">yellow handles</span> on the timeline clip to trim the start and end points directly.
                      </p>
                      
                      <div className="grid grid-cols-2 gap-4">
                         <div className="bg-white p-2 rounded text-center border border-gray-300">
                           <span className="text-[10px] text-gray-500 block">Start</span>
                           <span className="font-mono text-sm text-gray-900">{selectedClip.trimStart.toFixed(2)}s</span>
                        </div>
                         <div className="bg-white p-2 rounded text-center border border-gray-300">
                           <span className="text-[10px] text-gray-500 block">End</span>
                           <span className="font-mono text-sm text-gray-900">{selectedClip.trimEnd.toFixed(2)}s</span>
                        </div>
                      </div>
                      
                       <div className="text-xs text-center text-gray-600 mt-4 border-t border-gray-300 pt-2">
                        Original File Duration: {selectedClip.duration.toFixed(2)}s
                      </div>
                    </div>

                    {/* Speed Control */}
                     <div className="bg-gray-50 p-4 rounded-xl border border-gray-300">
                       <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase flex items-center gap-2"><Zap size={12}/> Playback Speed</h3>
                       <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                         Adjust playback speed for this clip. Faster speeds shorten duration, slower speeds lengthen it.
                       </p>
                       
                       <div className="grid grid-cols-4 gap-2 mb-4">
                         {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 1.75, 2.0].map(speed => (
                           <button
                             key={speed}
                             onClick={() => {
                               const isAudioClip = selectedClip.type === 'audio';
                               if (isAudioClip) {
                                 setAudioTracks(prev => prev.map(a => 
                                   a.id === selectedClip.id ? { ...a, speed } : a
                                 ));
                               } else {
                                 setTracks(prevTracks => prevTracks.map(track =>
                                   track.map(clip => 
                                     clip.id === selectedClip.id ? { ...clip, speed } : clip
                                   )
                                 ));
                               }
                             }}
                             className={`p-2 rounded text-xs font-medium transition-all
                               ${(selectedClip.speed || 1.0) === speed
                                 ? 'bg-[#13008B] text-white' 
                                 : 'bg-gray-200 text-gray-700 hover:bg-gray-300 border border-gray-300'}
                             `}
                           >
                             {speed}x
                           </button>
                         ))}
                       </div>
                       
                       <div className="flex items-center gap-4">
                         <input
                           type="range"
                           min="0.25"
                           max="3"
                           step="0.05"
                           value={selectedClip.speed || 1.0}
                           onChange={(e) => {
                             const speed = parseFloat(e.target.value);
                             const isAudioClip = selectedClip.type === 'audio';
                             if (isAudioClip) {
                               setAudioTracks(prev => prev.map(a => 
                                 a.id === selectedClip.id ? { ...a, speed } : a
                               ));
                             } else {
                               setTracks(prevTracks => prevTracks.map(track =>
                                 track.map(clip => 
                                   clip.id === selectedClip.id ? { ...clip, speed } : clip
                                 )
                               ));
                             }
                           }}
                           className="flex-1"
                         />
                         <div className="bg-white px-3 py-1 rounded text-sm font-mono w-16 text-center border border-gray-300 text-gray-900">
                           {(selectedClip.speed || 1.0).toFixed(2)}x
                         </div>
                       </div>
                       
                       <div className="text-xs text-center text-gray-600 mt-4 border-t border-gray-300 pt-2">
                         Effective Duration: {((selectedClip.trimEnd - selectedClip.trimStart) / (selectedClip.speed || 1.0)).toFixed(2)}s
                      </div>
                    </div>
                    
                    {/* V2 Transform Display (Read-Only values) */}
                    {selectedClip.transform && (
                        <div className="bg-gray-50 p-4 rounded-xl border border-gray-300">
                           <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase flex items-center gap-2"><Move size={12}/> V2 Transform</h3>
                           <p className="text-xs text-[#13008B] mb-4 leading-relaxed font-medium">
                             Adjust position/size by **dragging the element directly** in the preview window.
                           </p>
                           <div className="grid grid-cols-2 gap-4 text-xs">
                             <div className="bg-white p-2 rounded border border-gray-300">
                               <span className="text-[10px] text-gray-500 block">Position X</span>
                               <span className="font-mono text-sm text-gray-900">{selectedClip.transform.x.toFixed(1)}%</span>
                             </div>
                             <div className="bg-white p-2 rounded border border-gray-300">
                               <span className="text-[10px] text-gray-500 block">Position Y</span>
                               <span className="font-mono text-sm text-gray-900">{selectedClip.transform.y.toFixed(1)}%</span>
                             </div>
                             <div className="bg-white p-2 rounded border border-gray-300">
                               <span className="text-[10px] text-gray-500 block">Width</span>
                               <span className="font-mono text-sm text-gray-900">{selectedClip.transform.width.toFixed(1)}%</span>
                             </div>
                             <div className="bg-white p-2 rounded border border-gray-300">
                               <span className="text-[10px] text-gray-500 block">Opacity</span>
                               <span className="font-mono text-sm text-gray-900">{selectedClip.transform.opacity.toFixed(1)}</span>
                             </div>
                           </div>
                        </div>
                    )}
                  </div>
                )}

                {/* Transitions Context Tab */}
                {activeTab === 'transitions' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-right-4 duration-300">
                    <h3 className="text-xs font-semibold text-gray-700 uppercase flex items-center gap-2 mb-4"><ArrowRightLeft size={12}/> Transition Effect (V1 Only)</h3>
                    {!activeTransitionId ? (
                       <p className="text-sm text-gray-600 italic">Click a <Zap size={10} className="inline"/> button between clips in the V1 timeline to edit transitions.</p>
                    ) : (
                      <>
                        <div className="bg-gray-50 p-3 rounded-lg mb-4 flex items-center gap-3 border border-gray-300">
                           <Clock size={16} className="text-[#13008B]"/>
                           <span className="text-sm font-mono text-gray-900">Duration: {TRANSITION_DURATION.toFixed(1)}s</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          {TRANSITION_TYPES.map(type => (
                            <button
                              key={type}
                              onClick={() => {
                                setTransitions(prev => {
                                  const formattedType = type.toLowerCase().replace(/\s/g, '-');
                                  if (type === 'None') {
                                    const next = { ...prev };
                                    delete next[activeTransitionId];
                                    return next;
                                  }
                                  return { ...prev, [activeTransitionId]: formattedType };
                                });
                              }}
                              className={`p-3 rounded border text-sm transition-all
                                ${transitions[activeTransitionId] === type.toLowerCase().replace(/\s/g, '-') || (!transitions[activeTransitionId] && type === 'None')
                                  ? 'bg-[#13008B] border-[#13008B] text-white' 
                                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
                              `}
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                )}

              </div>
            ) : (
               <div className="flex flex-col items-center justify-center h-full text-gray-500 p-8 text-center">
                 <Move size={48} className="mb-4 opacity-20" />
                  <p className="font-medium text-gray-600">No Clip Selected</p>
                  <p className="text-xs mt-2 text-gray-500">Click a clip in the timeline to edit properties or trims.</p>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

// Helper Components
const ToolButton = ({ icon: Icon, label, active, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full aspect-square rounded-xl flex flex-col items-center justify-center gap-1 transition-all duration-200
      ${active ? 'bg-[#13008B] text-white shadow-lg' : 'text-gray-600 hover:bg-gray-100 hover:text-[#13008B]'}
    `}
  >
    <Icon size={20} />
    <span className="text-[10px] font-medium">{label}</span>
  </button>
);