import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Play, Pause, SkipBack, SkipForward, Scissors, 
  Layers, Download, Upload, Settings, 
  Monitor, ArrowRightLeft, Move, GripVertical, 
  Film, Plus, Trash2, X, Clock, Zap, Square,
  ArrowLeft, ArrowRight, RefreshCcw
} from 'lucide-react';
import RecordRTC from 'recordrtc';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';

/**
 * NEXUS EDIT - MULTI-TRACK VIDEO EDITOR
 * Features: Multi-Track Sequencing (V1: Primary, V2: Overlay), Trim Dragging, Enhanced Transitions.
 * Status: Export simplified to direct download (simulated MP4). V2 overlay visibility correctly tied to clip duration.
 */

// --- Global Constants ---
const FFMPEG_TRANSITIONS = [
  { id: 'none', label: 'None' },
  { id: 'fade', label: 'Fade' },
  { id: 'wipeleft', label: 'Wipe Left' },
  { id: 'wiperight', label: 'Wipe Right' },
  { id: 'wipeup', label: 'Wipe Up' },
  { id: 'wipedown', label: 'Wipe Down' },
  { id: 'slideleft', label: 'Slide Left' },
  { id: 'slideright', label: 'Slide Right' },
  { id: 'slideup', label: 'Slide Up' },
  { id: 'slidedown', label: 'Slide Down' },
  { id: 'squeezeleft', label: 'Squeeze Left' },
  { id: 'squeezeright', label: 'Squeeze Right' },
  { id: 'squeezeup', label: 'Squeeze Up' },
  { id: 'squeezedown', label: 'Squeeze Down' },
  { id: 'circlecrop', label: 'Circle Crop' },
  { id: 'rectcrop', label: 'Rect Crop' },
  { id: 'distance', label: 'Distance' },
  { id: 'fadeblack', label: 'Fade Black' },
  { id: 'fadewhite', label: 'Fade White' },
  { id: 'radial', label: 'Radial' },
  { id: 'smoothleft', label: 'Smooth Left' },
  { id: 'smoothright', label: 'Smooth Right' },
  { id: 'smoothup', label: 'Smooth Up' },
  { id: 'smoothdown', label: 'Smooth Down' },
  { id: 'circleopen', label: 'Circle Open' },
  { id: 'circleclose', label: 'Circle Close' },
  { id: 'vertopen', label: 'Vertical Open' },
  { id: 'vertclose', label: 'Vertical Close' },
  { id: 'horzopen', label: 'Horizontal Open' },
  { id: 'horzclose', label: 'Horizontal Close' },
  { id: 'dissolve', label: 'Dissolve' },
  { id: 'pixelize', label: 'Pixelize' },
  { id: 'diagtl', label: 'Diag Top-Left' },
  { id: 'diagtr', label: 'Diag Top-Right' },
  { id: 'diagbl', label: 'Diag Bottom-Left' },
  { id: 'diagbr', label: 'Diag Bottom-Right' },
  { id: 'hlslice', label: 'Horizontal Slice Left' },
  { id: 'hrslice', label: 'Horizontal Slice Right' },
  { id: 'vuslice', label: 'Vertical Slice Up' },
  { id: 'vdslice', label: 'Vertical Slice Down' },
  { id: 'hblur', label: 'Horizontal Blur' }
];
const DEFAULT_TRANSITION_DURATION = 0.5; // seconds
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
  const navigate = useNavigate();
  
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
  
  // FFmpeg and session state
  const ffmpegRef = useRef(null);
  const [isFFmpegLoaded, setIsFFmpegLoaded] = useState(false);
  const [sessionData, setSessionData] = useState({ session_id: '', user_id: '' });
  const [isFetchingSession, setIsFetchingSession] = useState(false);
  
  // Regenerate video state
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [showRegeneratePopup, setShowRegeneratePopup] = useState(false);
  const [regenerateJobId, setRegenerateJobId] = useState('');
  const [regenerateStatus, setRegenerateStatus] = useState('');
  const [regenerateError, setRegenerateError] = useState('');
  const [regenerateProgress, setRegenerateProgress] = useState({ percent: 0, phase: '' });
  
  // Load FFmpeg.wasm
  useEffect(() => {
    const loadFFmpeg = async () => {
      try {
        // Check if SharedArrayBuffer is available (required for FFmpeg.wasm)
        if (typeof SharedArrayBuffer === 'undefined') {
          console.warn('⚠️ SharedArrayBuffer is not available. FFmpeg.wasm may not work properly.');
          console.warn('⚠️ This usually means the server needs to set Cross-Origin headers.');
        }
        
        console.log('🔄 Initializing FFmpeg.wasm...');
        const ffmpeg = new FFmpeg();
        ffmpegRef.current = ffmpeg;
        
        // Listen to FFmpeg logs for debugging
        ffmpeg.on('log', ({ message }) => {
          console.log('FFmpeg:', message);
        });
        
        // Load FFmpeg core - try local files first, then CDN fallbacks
        console.log('📥 Loading FFmpeg core...');
        
        const loadSources = [
          {
            name: 'Local files',
            coreURL: '/ffmpeg-core.js',
            wasmURL: '/ffmpeg-core.wasm',
            useToBlob: true
          },
          {
            name: 'jsDelivr CDN',
            baseURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm',
            useToBlob: true
          },
          {
            name: 'jsDelivr CDN (alternative)',
            baseURL: 'https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/umd',
            useToBlob: false
          },
          {
            name: 'unpkg CDN',
            baseURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm',
            useToBlob: true
          },
          {
            name: 'unpkg CDN (alternative)',
            baseURL: 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd',
            useToBlob: false
          },
          {
            name: 'esm.sh CDN',
            baseURL: 'https://esm.sh/@ffmpeg/core@0.12.6/dist/esm',
            useToBlob: true
          },
          {
            name: 'skypack CDN',
            baseURL: 'https://cdn.skypack.dev/@ffmpeg/core@0.12.6/dist/esm',
            useToBlob: true
          }
        ];
        
        let loaded = false;
        let lastError = null;
        
        for (const source of loadSources) {
          try {
            console.log(`🔄 Trying ${source.name}...`);
            
            // Add timeout for each source (30 seconds)
            const loadPromise = (async () => {
            let coreURL, wasmURL;
            
            if (source.useToBlob) {
              if (source.baseURL) {
                // Use CDN with toBlobURL
                coreURL = await toBlobURL(`${source.baseURL}/ffmpeg-core.js`, 'text/javascript');
                wasmURL = await toBlobURL(`${source.baseURL}/ffmpeg-core.wasm`, 'application/wasm');
              } else {
                // Use local files with toBlobURL
                coreURL = await toBlobURL(source.coreURL, 'text/javascript');
                wasmURL = await toBlobURL(source.wasmURL, 'application/wasm');
              }
            } else {
              // Direct URLs (fallback)
              coreURL = source.coreURL;
              wasmURL = source.wasmURL;
            }
            
            await ffmpeg.load({
              coreURL,
              wasmURL,
            });
            })();
            
            // Race between load and timeout
            const timeoutPromise = new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Timeout after 30 seconds')), 30000)
            );
            
            await Promise.race([loadPromise, timeoutPromise]);
            
            console.log(`✅ Loaded FFmpeg from ${source.name}`);
            loaded = true;
            break;
          } catch (error) {
            const errorMsg = error.message || 'Unknown error';
            console.warn(`⚠️ Failed to load from ${source.name}:`, errorMsg);
            lastError = error;
            // Continue to next source
          }
        }
        
        if (!loaded) {
          // Don't throw - just log and continue without FFmpeg
          // FFmpeg is only needed for certain transitions, not critical for basic functionality
          console.warn('⚠️ FFmpeg.wasm could not be loaded from any source. Some advanced features may be unavailable.');
          console.warn('Last error:', lastError?.message || 'Unknown error');
          if (lastError) {
            console.warn('Error details:', {
              message: lastError.message,
              stack: lastError.stack,
              name: lastError.name
            });
          }
          // Set to null so we know it failed, but don't block the app
          ffmpegRef.current = null;
          setIsFFmpegLoaded(false);
          return; // Exit early, don't set as loaded
        }
        
        setIsFFmpegLoaded(true);
        console.log('✅ FFmpeg.wasm loaded successfully and ready to use');
      } catch (error) {
        // Catch any unexpected errors during loading
        console.warn('⚠️ Error during FFmpeg.wasm loading:', error.message);
        console.warn('Error details:', {
          message: error.message,
          stack: error.stack,
          name: error.name
        });
        // Set to null so we know it failed, but don't block the app
        ffmpegRef.current = null;
        setIsFFmpegLoaded(false);
      }
    };
    
    loadFFmpeg();
  }, []);
  
  // Load session data from localStorage at start
  useEffect(() => {
    const loadSessionData = () => {
      try {
        // Get from localStorage first (most reliable)
        const storedSessionId = localStorage.getItem('session_id') || '';
        const storedUserId = localStorage.getItem('token') || localStorage.getItem('user_id') || '';
        
        console.log('📋 Loading session data from localStorage:', {
          session_id: storedSessionId,
          user_id: storedUserId
        });
        
        if (storedSessionId && storedUserId) {
          setSessionData({ session_id: storedSessionId, user_id: storedUserId });
          console.log('✅ Session data loaded from localStorage');
        } else {
          // Try to fetch from API as fallback
          fetchSessionData();
        }
      } catch (error) {
        console.error('Error loading session data:', error);
        // Fallback to API fetch
        fetchSessionData();
      }
    };
    
    loadSessionData();
  }, []);
  const [selectedClipId, setSelectedClipId] = useState(null);
  const [activeTransitionId, setActiveTransitionId] = useState(null); 
  const [transitions, setTransitions] = useState({}); 
  const [transitionDurations, setTransitionDurations] = useState({});
  const [hoveredTransitionId, setHoveredTransitionId] = useState(null);
  const [showPublishModal, setShowPublishModal] = useState(false);
  const [publishForm, setPublishForm] = useState({ name: '' });
  const [isPublishing, setIsPublishing] = useState(false);
  const [showPublishUploading, setShowPublishUploading] = useState(false);

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

  // Compute selectedClip from selectedClipId
  const selectedClip = useMemo(() => {
    if (!selectedClipId) return null;
    // Search in all tracks
    for (const track of tracks) {
      const clip = track.find(c => c.id === selectedClipId);
      if (clip) return clip;
    }
    // Also check audio tracks
    const audioClip = audioTracks.find(a => a.id === selectedClipId);
    if (audioClip) return audioClip;
    return null;
  }, [selectedClipId, tracks, audioTracks]);

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
      const rawTransitionType = transitionKey ? transitions[transitionKey] : null;
      const transitionType = normalizeTransitionForPlayback(rawTransitionType);
      const transitionDuration = transitionKey ? (transitionDurations[transitionKey] || DEFAULT_TRANSITION_DURATION) : DEFAULT_TRANSITION_DURATION;

      let currentTransitionEffect = null;
      if (transitionType) {
         if (timeRemaining <= transitionDuration && timeRemaining > 0) {
           currentTransitionEffect = `transition-out-${transitionType}`;
         } else if (localTime - activeClip.trimStart < transitionDuration && index > 0) {
            currentTransitionEffect = `transition-in-${transitionType}`;
         }
      }
      
      setTransitionEffect(currentTransitionEffect);
      
      if (playerContainer) {
        playerContainer.style.setProperty('--transition-duration', `${transitionDuration}s`);
        // NOTE: Tailwind classes need to be directly applied, using template literals for class names might fail tree-shaking/JIT compilation in some environments, but we proceed for demonstration.
        playerContainer.className = `player-container relative shadow-2xl shadow-black/50 group transition-all ${currentTransitionEffect || ''}`;
      }

      // --- Preload Next Clip (when close to end) ---
      // Preload next clip when within 1 second of the end to ensure seamless transition
      const timeUntilEnd = (activeClip.trimEnd - localTime) / (activeClip.speed || 1.0);
      if (nextClipExists && nextClipExists.type === 'video' && timeUntilEnd <= 1.0) {
        // Create a hidden preload element
        let preloadVideo = document.getElementById(`preload-${nextClipExists.id}`);
        if (!preloadVideo) {
          preloadVideo = document.createElement('video');
          preloadVideo.id = `preload-${nextClipExists.id}`;
          preloadVideo.crossOrigin = 'anonymous';
          preloadVideo.preload = 'auto';
          preloadVideo.style.display = 'none';
          document.body.appendChild(preloadVideo);
        }
        
        // Only set src if it's different to avoid unnecessary reloads
        if (preloadVideo.src !== nextClipExists.url) {
          preloadVideo.src = nextClipExists.url;
          preloadVideo.load();
          
          // Preload the next clip's start time
          preloadVideo.addEventListener('loadeddata', () => {
            preloadVideo.currentTime = nextClipExists.trimStart || 0;
          }, { once: true });
        }
      }

      // --- Source Swap Logic with Seamless Transition ---
      const currentSrc = videoElement.getAttribute('src'); 
      if (currentSrc !== activeClip.url) {
        // Set crossOrigin before setting src to prevent canvas tainting
        if (!videoElement.crossOrigin) {
          videoElement.crossOrigin = 'anonymous';
        }
        
        // Preload the video before switching to prevent black screen
        videoElement.preload = 'auto';
        
        // Store the target time and clip for when video is ready
        const targetTime = localTime;
        const targetClip = activeClip;
        
        // Wait for video to be ready before switching if playing
        const handleCanPlay = () => {
          // Set the correct time once video is ready
          if (Math.abs(videoElement.currentTime - targetTime) > 0.1) {
            videoElement.currentTime = targetTime;
          }
          
          // If playing, ensure it continues playing
          if (isPlaying && videoElement.paused) {
            videoElement.play().catch(e => console.log("V1 Play after load interrupted"));
          }
          
        if (playerContainer) {
            playerContainer.className = `player-container relative shadow-2xl shadow-black/50 group`;
        }
          videoElement.removeEventListener('canplay', handleCanPlay);
        };
        
        // Also handle loadeddata for faster switching
        const handleLoadedData = () => {
          if (Math.abs(videoElement.currentTime - targetTime) > 0.1) {
            videoElement.currentTime = targetTime;
          }
          videoElement.removeEventListener('loadeddata', handleLoadedData);
        };
        
        videoElement.addEventListener('canplay', handleCanPlay, { once: true });
        videoElement.addEventListener('loadeddata', handleLoadedData, { once: true });
        
        // Set src and load
        videoElement.src = activeClip.url;
        videoElement.load(); // Force load to start buffering
        
        // If not playing, set the time immediately (video might already be cached)
        if (!isPlaying) {
          // Use a small timeout to ensure src is set
          setTimeout(() => {
            if (videoElement.readyState >= 1) { // HAVE_METADATA
              videoElement.currentTime = localTime;
            }
          }, 10);
        }
      }

      // Sync Time and Play State
      if (activeClip.type === 'video') {
         // Set playback speed
         const speed = activeClip.speed || 1.0;
         if (Math.abs(videoElement.playbackRate - speed) > 0.01) {
           videoElement.playbackRate = speed;
         }
         
         // Only update currentTime if video is ready and src matches
         // Use a smaller threshold to prevent gaps
         if (videoElement.readyState >= 2 && videoElement.src === activeClip.url) { // HAVE_CURRENT_DATA or higher
           const timeDiff = Math.abs(videoElement.currentTime - localTime);
           // Use smaller threshold (0.1s) for more precise sync, but only update if significantly off
           if (timeDiff > 0.1 && timeDiff < videoElement.duration) {
            videoElement.currentTime = localTime;
         }
         }
         
         // Play if playing 
         if (isPlaying && videoElement.paused) {
             // Wait for video to be ready before playing
             if (videoElement.readyState >= 2 && videoElement.src === activeClip.url) {
             videoElement.play().catch(e => console.log("V1 Play interrupted"));
             } else {
               const handleCanPlayThrough = () => {
                 if (isPlaying && videoElement.paused && videoElement.src === activeClip.url) {
                   videoElement.play().catch(e => console.log("V1 Play interrupted"));
                 }
                 videoElement.removeEventListener('canplaythrough', handleCanPlayThrough);
               };
               videoElement.addEventListener('canplaythrough', handleCanPlayThrough, { once: true });
             }
         } else if (!isPlaying && !videoElement.paused) {
             videoElement.pause();
         }
      }

    } else if (tracks[0].length > 0) {
      // If no active clip but there are clips, show the first clip
      const firstClip = tracks[0][0];
      const currentSrc = videoElement.getAttribute('src');
      
      if (firstClip && currentSrc !== firstClip.url) {
        // Set crossOrigin before setting src to prevent canvas tainting
        if (!videoElement.crossOrigin) {
          videoElement.crossOrigin = 'anonymous';
        }
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

  const handleExport = async (options = {}) => {
    const { suppressAlerts = false, onComplete } = options;
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
                tempVideo.crossOrigin = 'anonymous'; // Must be set BEFORE src
                tempVideo.src = overlayClip.url;
                tempVideo.muted = true;
                tempVideo.preload = 'auto';
                overlayElementCacheRef.current.set(cacheKey, tempVideo);
                tempVideo.load();
              } else if (overlayClip.type === 'image') {
                const tempImg = new Image();
                tempImg.crossOrigin = 'anonymous'; // Must be set BEFORE src
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
      // Use minimum 720p resolution (1280x720) for better quality
      const canvas = document.createElement('canvas');
      const rect = playerContainer.getBoundingClientRect();
      
      // Calculate aspect ratio from container
      const containerAspect = rect.width / rect.height;
      
      // Set minimum dimensions for 720p (1280x720)
      const MIN_WIDTH = 1280;
      const MIN_HEIGHT = 720;
      
      // Calculate dimensions maintaining aspect ratio, but ensuring minimum 720p
      let canvasWidth = Math.max(rect.width || MIN_WIDTH, MIN_WIDTH);
      let canvasHeight = Math.max(rect.height || MIN_HEIGHT, MIN_HEIGHT);
      
      // If container is smaller than 720p, scale up while maintaining aspect ratio
      if (rect.width < MIN_WIDTH || rect.height < MIN_HEIGHT) {
        if (containerAspect > 16/9) {
          // Wider than 16:9, use width as base
          canvasWidth = MIN_WIDTH;
          canvasHeight = Math.round(MIN_WIDTH / containerAspect);
          // Ensure height is at least MIN_HEIGHT
          if (canvasHeight < MIN_HEIGHT) {
            canvasHeight = MIN_HEIGHT;
            canvasWidth = Math.round(MIN_HEIGHT * containerAspect);
          }
        } else {
          // Taller or equal to 16:9, use height as base
          canvasHeight = MIN_HEIGHT;
          canvasWidth = Math.round(MIN_HEIGHT * containerAspect);
          // Ensure width is at least MIN_WIDTH
          if (canvasWidth < MIN_WIDTH) {
            canvasWidth = MIN_WIDTH;
            canvasHeight = Math.round(MIN_WIDTH / containerAspect);
          }
        }
      }
      
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      
      console.log('📐 Canvas dimensions set to:', {
        width: canvas.width,
        height: canvas.height,
        aspectRatio: (canvas.width / canvas.height).toFixed(2),
        containerSize: { width: rect.width, height: rect.height }
      });
      
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
      let canvasStream;
      try {
        canvasStream = canvas.captureStream(30); // 30 FPS
      } catch (error) {
        // Canvas is tainted - likely due to cross-origin resources
        console.error('❌ Failed to capture canvas stream:', error);
        throw new Error('Export failed: Canvas contains cross-origin resources. Please ensure all videos and images are served with proper CORS headers, or use resources from the same origin.');
      }
      
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
      // Calculate bitrate based on resolution for better quality
      // For 720p: ~8-10 Mbps, for 1080p: ~15-20 Mbps
      const pixelCount = canvas.width * canvas.height;
      const isHD = pixelCount >= 1280 * 720; // 720p or higher
      const videoBitrate = isHD ? 10000000 : 8000000; // 10 Mbps for HD, 8 Mbps for lower
      
      const recorder = new RecordRTC(combinedStream, {
        type: 'video',
        mimeType: selectedMimeType,
        videoBitsPerSecond: videoBitrate, // Higher bitrate for better quality
        audioBitsPerSecond: 192000, // 192 kbps for better audio quality
        frameRate: 30,
        disableLogs: false,
        timeSlice: 200, // Collect data every 200ms
        getNativeBlob: false // Use RecordRTC's blob handling
      });
      
      console.log('📋 RecordRTC configured with:', {
        mimeType: selectedMimeType,
        width: canvas.width,
        height: canvas.height,
        resolution: `${canvas.width}x${canvas.height}`,
        frameRate: 30,
        videoBitrate: `${(videoBitrate / 1000000).toFixed(1)} Mbps`,
        audioBitrate: '192 kbps',
        quality: canvas.height >= 720 ? 'HD (720p+)' : 'Standard'
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
            if (onComplete) {
              Promise.resolve(onComplete(blob, blobUrl)).catch((cbError) => {
                console.error('Post-export callback failed:', cbError);
                alert(`Post-export action failed: ${cbError.message}`);
              });
            }
            
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
            if (!suppressAlerts) {
              alert('Export complete! Click "Download Final Video" to save.');
            }
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
      
      // Ensure crossOrigin is set on video element to prevent canvas tainting
      if (videoElement && !videoElement.crossOrigin) {
        videoElement.crossOrigin = 'anonymous';
      }
      
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
            // Ensure crossOrigin is set to prevent canvas tainting
            if (!media.crossOrigin) {
              media.crossOrigin = 'anonymous';
            }
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
              tempVideo.crossOrigin = 'anonymous'; // Must be set BEFORE src
              tempVideo.src = overlayClip.url;
              tempVideo.muted = true;
              tempVideo.preload = 'auto';
              overlayElementCacheRef.current.set(cacheKey, tempVideo);
              overlayElementToDraw = tempVideo;
            } else if (overlayClip.type === 'image') {
              const tempImg = new Image();
              tempImg.crossOrigin = 'anonymous'; // Must be set BEFORE src
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

  const activeTransitionDuration = activeTransitionId ? (transitionDurations[activeTransitionId] || DEFAULT_TRANSITION_DURATION) : DEFAULT_TRANSITION_DURATION;

  const normalizeTransitionForPlayback = (id) => {
    if (!id) return null;
    const map = {
      fade: 'fade',
      fadewhite: 'fade',
      fadeblack: 'dip-to-black',
      'dip-to-black': 'dip-to-black',
      slideleft: 'slide-left',
      wipeleft: 'slide-left',
      wiperight: 'slide-right',
      wiperup: 'slide-up',
      wiperdown: 'slide-down',
      slideright: 'slide-right',
      slideup: 'slide-up',
      slidedown: 'slide-down',
      smoothleft: 'slide-left',
      smoothright: 'slide-right',
      smoothup: 'slide-up',
      smoothdown: 'slide-down',
    };
    return map[id] || 'fade';
  };

  const updateTrimForClip = (clipId, updater) => {
    let updated = false;
    setTracks(prev => prev.map(track =>
      track.map(clip => {
        if (clip.id !== clipId) return clip;
        updated = true;
        return updater(clip);
      })
    ));
    if (!updated) {
      setAudioTracks(prev => prev.map(clip => {
        if (clip.id !== clipId) return clip;
        return updater(clip);
      }));
    }
  };

  const moveClipByOne = (trackIndex, fromIndex, direction) => {
    setTracks(prev => {
      const newTracks = prev.map(t => [...t]);
      const track = newTracks[trackIndex];
      if (!track) return prev;
      const targetIndex = direction === 'left' ? fromIndex - 1 : fromIndex + 1;
      if (targetIndex < 0 || targetIndex >= track.length) return prev;
      [track[fromIndex], track[targetIndex]] = [track[targetIndex], track[fromIndex]];
      return newTracks;
    });
  };

  const getStoredSessionFromStorage = () => {
    if (typeof window === 'undefined') return { session_id: '', user_id: '' };
    const stores = [localStorage, sessionStorage];
    const keys = [
      'session_id',
      'sessionId',
      'user_id',
      'userId'
    ];
    const result = { session_id: '', user_id: '' };
    for (const store of stores) {
      try {
        result.session_id = result.session_id || store.getItem('session_id') || store.getItem('sessionId') || '';
        result.user_id = result.user_id || store.getItem('user_id') || store.getItem('userId') || '';
      } catch (_) {
        // ignore storage access issues
      }
    }
    return result;
  };

  const fetchSessionData = async () => {
    setIsFetchingSession(true);
    try {
      let session_id = '';
      let user_id = '';

      // First priority: localStorage
      try {
        session_id = localStorage.getItem('session_id') || '';
        user_id = localStorage.getItem('token') || localStorage.getItem('user_id') || '';
        console.log('📋 Session data from localStorage:', { session_id, user_id });
      } catch (e) {
        console.warn('Error reading localStorage:', e);
      }

      // Second priority: fetch from user session API if not in localStorage
      if ((!session_id || !user_id) && typeof fetch !== 'undefined') {
        try {
          const res = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', { credentials: 'include' });
          if (res.ok) {
            const data = await res.json();
            session_id = session_id || data.session_id || '';
            user_id = user_id || data.user_id || '';
            console.log('📋 Session data from API:', { session_id, user_id });
            
            // Save to localStorage for future use
            if (session_id) localStorage.setItem('session_id', session_id);
            if (user_id) {
              localStorage.setItem('token', user_id);
              localStorage.setItem('user_id', user_id);
            }
          } else {
            console.warn('Session API returned', res.status);
          }
        } catch (e) {
          console.warn('Session API failed', e);
        }
      }

      // Fallbacks
      const globalSession = typeof window !== 'undefined' ? window.__USER_SESSION__ || {} : {};
      const stored = getStoredSessionFromStorage();
      session_id = session_id || globalSession.session_id || stored.session_id || '';
      user_id = user_id || globalSession.user_id || stored.user_id || '';

      console.log('✅ Final session data:', { session_id, user_id });
      setSessionData({ session_id, user_id });
      return { session_id, user_id };
    } finally {
      setIsFetchingSession(false);
    }
  };

  const handlePublish = async () => {
    if (tracks[0].length === 0) {
      alert('Please add clips to the V1 (Primary) track before publishing.');
      return;
    }
    if (!publishForm.name) {
      alert('Please enter a name to publish.');
      return;
    }
    
    // Get fresh session data from localStorage before publishing
    let finalSessionId = sessionData.session_id || localStorage.getItem('session_id') || '';
    let finalUserId = sessionData.user_id || localStorage.getItem('token') || localStorage.getItem('user_id') || '';
    
    if (!finalSessionId || !finalUserId) {
      // Try to fetch one more time
      try {
        const freshData = await fetchSessionData();
        finalSessionId = freshData.session_id || finalSessionId;
        finalUserId = freshData.user_id || finalUserId;
      } catch (e) {
        console.error('Error fetching session data:', e);
      }
    }
    
    if (!finalSessionId || !finalUserId) {
      alert('Missing session or user information. Please ensure you are logged in.');
      console.error('Missing session data:', { session_id: finalSessionId, user_id: finalUserId });
      return;
    }
    
    console.log('📤 Publishing with session data:', { session_id: finalSessionId, user_id: finalUserId });
    
    setShowPublishModal(false);
    setIsPublishing(true);
    try {
      await handleExport({
        suppressAlerts: true,
        onComplete: async (blob, blobUrl) => {
          // Ensure we're working with a valid WebM blob
          if (!blob || !blobUrl) {
            console.error('❌ Invalid blob or blobUrl received');
            setIsPublishing(false);
            setShowPublishUploading(false);
            alert('Export failed: Invalid video file');
            return;
          }

          try {
            // Step 1: Save WebM file locally to browser first
            console.log('💾 Saving WebM file locally...');
            try {
              const link = document.createElement('a');
              link.href = blobUrl;
              link.download = `${publishForm.name || 'reel'}.webm`;
              document.body.appendChild(link);
              link.click();
              // Give browser time to start download before cleanup
              setTimeout(() => {
                document.body.removeChild(link);
              }, 200);
              console.log('✅ Video saved locally');
            } catch (downloadError) {
              console.warn('⚠️ Local save failed (non-critical):', downloadError);
              // Continue with API upload even if local save fails
            }

            // Step 2: Show loading screen and upload WebM file to webm-conversion-queue API
            console.log('📤 Uploading WebM to conversion queue...');
            setShowPublishUploading(true);
            
            console.log('📦 Blob details:', {
              size: blob.size,
              type: blob.type,
              name: `${publishForm.name || 'reel'}.webm`
            });
            
            const formData = new FormData();
            formData.append('session_id', finalSessionId);
            formData.append('user_id', finalUserId);
            formData.append('name', publishForm.name);
            formData.append('file', blob, `${publishForm.name || 'reel'}.webm`);
            
            console.log('📤 Uploading to webm-conversion-queue API:', {
              session_id: finalSessionId,
              user_id: finalUserId ? '***' : 'missing',
              name: publishForm.name,
              fileSize: blob.size,
              fileType: blob.type
            });

            const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/webm-conversion-queue', {
              method: 'POST',
              body: formData,
            });

            if (!response.ok) {
              const text = await response.text();
              throw new Error(`Upload failed: ${response.status} ${text}`);
            }
            
            const responseData = await response.json().catch(() => {
              // If response is not JSON, try parsing text
              return { job_id: null };
            });
            
            const jobId = responseData?.job_id || responseData?.jobId || responseData?.id;
            
            if (!jobId) {
              throw new Error('No job_id received from API response');
            }
            
            console.log('✅ Video uploaded to conversion queue. Job ID:', jobId);
            
            // Save job_id to localStorage
            localStorage.setItem('webm_conversion_job_id', jobId);
            
            // Hide loading and redirect immediately to My Media page
            setShowPublishUploading(false);
            setIsPublishing(false);
            navigate('/media');
          } catch (error) {
            console.error('❌ Error in onComplete callback:', error);
            setShowPublishUploading(false);
            setIsPublishing(false);
            alert(`Publish failed: ${error.message}`);
            throw error; // Re-throw so the outer catch can handle it
          }
        }
      });
    } catch (error) {
      console.error('Publish error:', error);
      alert(`Publish failed: ${error.message}`);
      setIsPublishing(false);
    }
  };


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

    const rect = timelineElement.getBoundingClientRect();
    const timelineWidth = Math.max(timelineElement.scrollWidth, rect.width) - 16;
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
              newStart = Math.min(newStart, audioClip.trimEnd - 0.1);
              return { ...audioClip, trimStart: newStart };
            } else {
              let newEnd = dragState.initialTrimEnd + deltaSeconds;
              newEnd = Math.max(audioClip.trimStart + 0.1, newEnd);
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
                  newStart = Math.min(newStart, clip.trimEnd - 0.1);
                  return { ...clip, trimStart: newStart };
                } else {
                  let newEnd = dragState.initialTrimEnd + deltaSeconds;
                  newEnd = Math.max(clip.trimStart + 0.1, newEnd);
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
        >
            <div className="flex items-center justify-between mb-1 px-1 sticky left-0">
              <span className="text-xs text-gray-700 uppercase font-bold tracking-wider flex items-center gap-2">
                <Layers size={12} /> {trackName}
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
            
            <div 
              className="relative h-14 bg-gray-100 rounded-lg border border-gray-300 flex items-center px-2 py-1 gap-0.5 overflow-visible cursor-pointer"
              onMouseDown={(e) => {
                // Only handle clicks if not clicking on a clip, handle, or playhead
                if (e.target.closest('.clip-block') || 
                    e.target.closest('[class*="resize"]') || 
                    e.target.closest('[class*="handle"]') ||
                    e.target.closest('[style*="bg-red-500"]')) {
                  return;
                }
                e.preventDefault();
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left - 8; // Subtract padding
                const timelineWidth = rect.width - 16; // Account for padding
                if (timelineWidth > 0 && totalDuration > 0) {
                  const clickedTime = (clickX / timelineWidth) * totalDuration;
                  const clampedTime = Math.max(0, Math.min(totalDuration, clickedTime));
                  setGlobalTime(clampedTime);
                  // Pause playback when seeking
                  if (isPlaying) {
                    setIsPlaying(false);
                  }
                  
                  // Allow dragging to scrub through timeline
                  const handleMouseMove = (moveEvent) => {
                    const moveX = moveEvent.clientX - rect.left - 8;
                    const newTime = Math.max(0, Math.min(totalDuration, (moveX / timelineWidth) * totalDuration));
                    setGlobalTime(newTime);
                  };
                  
                  const handleMouseUp = () => {
                    document.removeEventListener('mousemove', handleMouseMove);
                    document.removeEventListener('mouseup', handleMouseUp);
                  };
                  
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                }
              }}
            >
                {/* Global Playhead */}
                {isPrimaryTrack && totalDuration > 0 && (
                   <div 
                     className={`absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 transition-transform duration-75`}
                     style={{ left: `calc(8px + ${(globalTime / totalDuration) * (100 - 2)}%)`, cursor: 'grab' }} 
                     onMouseDown={(e) => {
                       e.stopPropagation();
                       const startX = e.clientX;
                       const startTime = globalTime;
                       const rect = e.currentTarget.parentElement.getBoundingClientRect();
                       const timelineWidth = rect.width - 16;
                       
                       const handleMouseMove = (moveEvent) => {
                         const deltaX = moveEvent.clientX - startX;
                         const deltaTime = (deltaX / timelineWidth) * totalDuration;
                         const newTime = Math.max(0, Math.min(totalDuration, startTime + deltaTime));
                         setGlobalTime(newTime);
                         if (isPlaying) {
                           setIsPlaying(false);
                         }
                       };
                       
                       const handleMouseUp = () => {
                         document.removeEventListener('mousemove', handleMouseMove);
                         document.removeEventListener('mouseup', handleMouseUp);
                       };
                       
                       document.addEventListener('mousemove', handleMouseMove);
                       document.addEventListener('mouseup', handleMouseUp);
                     }}
                   >
                      <div className="absolute -top-3 -left-1.5 w-3 h-3 bg-red-500 rotate-45 cursor-grab active:cursor-grabbing"></div>
                   </div>
                )}
                
                {/* Invisible clickable overlay for timeline seeking - behind clips but clickable */}
                <div
                  className="absolute inset-0 z-0"
                  onClick={(e) => {
                    // Only handle if clicking directly on this overlay (not on clips)
                    if (e.target === e.currentTarget) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      const clickX = e.clientX - rect.left - 8;
                      const timelineWidth = rect.width - 16;
                      if (timelineWidth > 0 && totalDuration > 0) {
                        const clickedTime = (clickX / timelineWidth) * totalDuration;
                        const clampedTime = Math.max(0, Math.min(totalDuration, clickedTime));
                        setGlobalTime(clampedTime);
                        if (isPlaying) {
                          setIsPlaying(false);
                        }
                      }
                    }
                  }}
                />
                
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
                        className={`
                          clip-block relative h-full rounded-md cursor-grab transition-all border-2 group
                          ${isSelected ? 'border-[#13008B] ring-2 ring-[#13008B]/20 z-10' : 'border-gray-400 hover:border-gray-500'}
                          ${isActive ? 'opacity-100' : 'opacity-70'}
                          shrink-0
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

                         {isPrimaryTrack && (
                           <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-auto">
                             <button
                               onMouseDown={(e) => e.stopPropagation()}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 moveClipByOne(trackIndex, index, 'left');
                               }}
                               disabled={index === 0}
                               className={`w-6 h-6 rounded-full border flex items-center justify-center text-gray-700 bg-white shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100`}
                               title="Move clip left"
                             >
                               <ArrowLeft size={12} />
                             </button>
                             <button
                               onMouseDown={(e) => e.stopPropagation()}
                               onClicl={(e) => {
                                 e.stopPropagation();
                                 moveClipByOne(trackIndex, index, 'right');
                               }}
                               disabled={index === trackClips.length - 1}
                               className={`w-6 h-6 rounded-full border flex items-center justify-center text-gray-700 bg-white shadow-sm transition disabled:opacity-40 disabled:cursor-not-allowed hover:bg-gray-100`}
                               title="Move clip right"
                             >
                               <ArrowRight size={12} />
                             </button>
                           </div>
                         )}
                      </div>

                      {/* Transition Node (Connector) - Only on Primary Track */}
                      {isPrimaryTrack && nextClip && (
                        <div 
                          className="relative w-12 h-full flex items-center justify-center z-30 -ml-2 -mr-2 group transition-all"
                          onMouseEnter={() => setHoveredTransitionId(transitionId)}
                          onMouseLeave={() => {
                            if (activeTransitionId !== transitionId) {
                              setHoveredTransitionId(null);
                            }
                          }}
                        >
                           {/* Always visible transition indicator line */}
                           <div 
                             className={`
                               absolute left-1/2 top-0 bottom-0 w-0.5 transition-all
                               ${hoveredTransitionId === transitionId || activeTransitionId === transitionId
                                 ? 'bg-[#13008B] opacity-100'
                                 : hasTransition
                                 ? 'bg-[#13008B] opacity-30'
                                 : 'bg-gray-300 opacity-20'}
                             `}
                             style={{ transform: 'translateX(-50%)' }}
                           />
                           
                           {/* Transition Button - Always visible but more prominent on hover */}
                             <button 
                               onMouseDown={(e) => e.stopPropagation()}
                               onClick={(e) => {
                                 e.stopPropagation();
                                 setActiveTab('transitions');
                                 setActiveTransitionId(transitionId);
                                 setSelectedClipId(null);
                               }}
                               className={`
                               relative w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all transform shadow-lg
                               ${hoveredTransitionId === transitionId || activeTransitionId === transitionId
                                 ? 'scale-110 bg-[#13008B] border-[#13008B] text-white shadow-[#13008B]/50'
                                 : hasTransition
                                 ? 'scale-100 bg-[#13008B]/80 border-[#13008B]/80 text-white shadow-[#13008B]/30 opacity-70 hover:opacity-100'
                                 : 'scale-90 bg-white/80 border-gray-300 text-gray-500 shadow-gray-300/20 opacity-50 hover:opacity-100 hover:bg-[#13008B] hover:border-[#13008B] hover:text-white'}
                               `}
                               title={hasTransition ? `Edit transition: ${transitions[transitionId]}` : 'Add transition'}
                             >
                             {hasTransition ? <Zap size={16} /> : <Plus size={16} />}
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
        
        <div 
          className="relative h-14 bg-gray-100 rounded-lg border border-gray-300 flex items-center px-2 py-1 gap-0.5 overflow-visible cursor-pointer"
          onMouseDown={(e) => {
            // Only handle clicks if not clicking on a clip, handle, or playhead
            if (e.target.closest('.clip-block') || 
                e.target.closest('[class*="resize"]') || 
                e.target.closest('[class*="handle"]') ||
                e.target.closest('[style*="bg-red-500"]')) {
              return;
            }
            e.preventDefault();
            const rect = e.currentTarget.getBoundingClientRect();
            const clickX = e.clientX - rect.left - 8; // Subtract padding
            const timelineWidth = rect.width - 16; // Account for padding
            if (timelineWidth > 0 && totalDuration > 0) {
              const clickedTime = (clickX / timelineWidth) * totalDuration;
              const clampedTime = Math.max(0, Math.min(totalDuration, clickedTime));
              setGlobalTime(clampedTime);
              // Pause playback when seeking
              if (isPlaying) {
                setIsPlaying(false);
              }
              
              // Allow dragging to scrub through timeline
              const handleMouseMove = (moveEvent) => {
                const moveX = moveEvent.clientX - rect.left - 8;
                const newTime = Math.max(0, Math.min(totalDuration, (moveX / timelineWidth) * totalDuration));
                setGlobalTime(newTime);
              };
              
              const handleMouseUp = () => {
                document.removeEventListener('mousemove', handleMouseMove);
                document.removeEventListener('mouseup', handleMouseUp);
              };
              
              document.addEventListener('mousemove', handleMouseMove);
              document.addEventListener('mouseup', handleMouseUp);
            }
          }}
        >
          {/* Global Playhead */}
          {totalDuration > 0 && (
            <div 
              className={`absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 transition-transform duration-75`}
              style={{ left: `calc(8px + ${(globalTime / totalDuration) * (100 - 2)}%)`, cursor: 'grab' }} 
              onMouseDown={(e) => {
                e.stopPropagation();
                const startX = e.clientX;
                const startTime = globalTime;
                const rect = e.currentTarget.parentElement.getBoundingClientRect();
                const timelineWidth = rect.width - 16;
                
                const handleMouseMove = (moveEvent) => {
                  const deltaX = moveEvent.clientX - startX;
                  const deltaTime = (deltaX / timelineWidth) * totalDuration;
                  const newTime = Math.max(0, Math.min(totalDuration, startTime + deltaTime));
                  setGlobalTime(newTime);
                  if (isPlaying) {
                    setIsPlaying(false);
                  }
                };
                
                const handleMouseUp = () => {
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };
                
                document.addEventListener('mousemove', handleMouseMove);
                document.addEventListener('mouseup', handleMouseUp);
              }}
            >
              <div className="absolute -top-3 -left-1.5 w-3 h-3 bg-red-500 rotate-45 cursor-grab active:cursor-grabbing"></div>
            </div>
          )}
          
          {/* Invisible clickable overlay for timeline seeking - behind clips but clickable */}
          <div
            className="absolute inset-0 z-0"
            onClick={(e) => {
              // Only handle if clicking directly on this overlay (not on clips)
              if (e.target === e.currentTarget) {
                const rect = e.currentTarget.getBoundingClientRect();
                const clickX = e.clientX - rect.left - 8;
                const timelineWidth = rect.width - 16;
                if (timelineWidth > 0 && totalDuration > 0) {
                  const clickedTime = (clickX / timelineWidth) * totalDuration;
                  const clampedTime = Math.max(0, Math.min(totalDuration, clickedTime));
                  setGlobalTime(clampedTime);
                  if (isPlaying) {
                    setIsPlaying(false);
                  }
                }
              }
            }}
          />
          
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
                crossOrigin="anonymous"
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

  // Handle regenerate video
  const handleRegenerateVideo = useCallback(async () => {
    if (!selectedClip) {
      alert('Please select a video clip to regenerate');
      return;
    }

    try {
      setIsRegenerating(true);
      setShowRegeneratePopup(true);
      setRegenerateError('');
      setRegenerateStatus('preparing');
      setRegenerateProgress({ percent: 0, phase: 'preparing' });

      // Fetch session data
      const session_id = localStorage.getItem('session_id');
      const user_id = localStorage.getItem('token');
      
      if (!session_id || !user_id) {
        throw new Error('Missing session or user information. Please ensure you are logged in.');
      }

      // Fetch full session data to get scene information
      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, session_id })
      });

      const sessionText = await sessionResp.text();
      let sessionData;
      try { sessionData = JSON.parse(sessionText); } catch (_) { sessionData = sessionText; }

      if (!sessionResp.ok) {
        throw new Error(`Failed to fetch session data: ${sessionResp.status} ${sessionText}`);
      }

      const sdata = sessionData?.session_data || {};
      
      // Get aspect ratio from session
      const aspectRatio = sdata?.aspect_ratio || sdata?.aspectRatio || '16:9';
      const subtitles = sdata?.subtitles || false;

      // Get scenes from session - check multiple possible locations
      let scenesData = [];
      
      // Try different locations where scenes might be stored
      if (Array.isArray(sdata?.scenes)) {
        scenesData = sdata.scenes;
      } else if (Array.isArray(sdata?.images?.scenes)) {
        scenesData = sdata.images.scenes;
      } else if (Array.isArray(sdata?.images)) {
        // If images is an array, treat each item as a scene
        scenesData = sdata.images;
      } else if (sdata?.images && typeof sdata.images === 'object') {
        // If images is an object with a scenes property
        if (Array.isArray(sdata.images.scenes)) {
          scenesData = sdata.images.scenes;
        } else if (Array.isArray(sdata.images.v1)) {
          // Sometimes scenes are in images.v1 array
          scenesData = sdata.images.v1;
        }
      }
      
      // If still no scenes found, try to reconstruct from videos array
      if ((!Array.isArray(scenesData) || scenesData.length === 0) && Array.isArray(sdata?.videos)) {
        // Use videos array as scenes (they contain scene information)
        scenesData = sdata.videos.map((video, idx) => ({
          scene_number: video.scene_number || video.sceneNumber || (idx + 1),
          model: video.model || video.mode || 'VEO3',
          transitions: video.transitions || [],
          veo3_prompt_template: video.veo3_prompt_template || video.veo3PromptTemplate || {},
          logo_url: video.logo_url || video.logoUrl || ''
        }));
      }
      
      if (!Array.isArray(scenesData) || scenesData.length === 0) {
        console.error('Session data structure:', {
          hasScenes: !!sdata?.scenes,
          hasImages: !!sdata?.images,
          imagesType: typeof sdata?.images,
          imagesIsArray: Array.isArray(sdata?.images),
          imagesScenes: !!sdata?.images?.scenes,
          hasVideos: !!sdata?.videos,
          videosIsArray: Array.isArray(sdata?.videos),
          videosLength: Array.isArray(sdata?.videos) ? sdata.videos.length : 0,
          sessionDataKeys: Object.keys(sdata || {})
        });
        throw new Error('No scenes found in session data. Please ensure videos have been generated first.');
      }

      // Find the scene corresponding to the selected clip
      // Try to match by scene number if available, otherwise by index
      let targetScene = null;
      const clipIndex = tracks[0].findIndex(clip => clip.id === selectedClip.id);
      
      if (clipIndex >= 0 && clipIndex < scenesData.length) {
        targetScene = scenesData[clipIndex];
      } else {
        // Try to find by scene_number if clips have that metadata
        const sceneNumber = selectedClip.sceneNumber;
        if (sceneNumber != null) {
          targetScene = scenesData.find(s => (s.scene_number || s.sceneNumber) === sceneNumber);
        }
      }

      if (!targetScene) {
        // Fallback: use the first scene or the scene at clip index
        targetScene = scenesData[clipIndex] || scenesData[0];
      }

      if (!targetScene) {
        throw new Error('Could not find matching scene for selected clip');
      }

      // Check if logo is needed - check if scene has logo_url
      const sessionAssets = sdata?.assets || {};
      const hasLogoAsset = !!sessionAssets.logo_url;
      const sceneLogoUrl = targetScene?.logo_url || targetScene?.logoUrl;
      // Logo is true if there's a logo asset and the scene uses it
      const logo = hasLogoAsset && !!sceneLogoUrl;

      // Build scene payload for regenerate request
      const sceneNumber = targetScene.scene_number || targetScene.sceneNumber || clipIndex + 1;
      const model = targetScene.model || targetScene.mode || 'VEO3';
      const modelUpper = String(model).toUpperCase();

      // Build transitions array from scene data
      // Ensure transitions match the API spec structure
      let transitions = [];
      if (targetScene.transitions && Array.isArray(targetScene.transitions)) {
        transitions = targetScene.transitions.map(trans => {
          // Ensure transition has the correct structure
          if (trans.is_preset !== undefined) {
            return {
              is_preset: trans.is_preset || false,
              userQuery: trans.userQuery || '',
              parameters: {
                name: trans.parameters?.name || '',
                preservation_notes: {
                  camera_specifications: trans.parameters?.preservation_notes?.camera_specifications || '',
                  subject_description: trans.parameters?.preservation_notes?.subject_description || '',
                  action_specification: trans.parameters?.preservation_notes?.action_specification || '',
                  scene_description: trans.parameters?.preservation_notes?.scene_description || '',
                  lighting: trans.parameters?.preservation_notes?.lighting || '',
                  style_mood: trans.parameters?.preservation_notes?.style_mood || '',
                  geometric_preservation: trans.parameters?.preservation_notes?.geometric_preservation || '',
                  transition_type: trans.parameters?.preservation_notes?.transition_type || '',
                  content_modification: trans.parameters?.preservation_notes?.content_modification || ''
                },
                prompt_description: trans.parameters?.prompt_description || ''
              },
              savecustom: trans.savecustom || false,
              custom_name: trans.custom_name || ''
            };
          }
          return trans;
        });
      } else if (targetScene.transition && typeof targetScene.transition === 'object') {
        // Handle single transition object
        const trans = targetScene.transition;
        transitions = [{
          is_preset: trans.is_preset || false,
          userQuery: trans.userQuery || '',
          parameters: {
            name: trans.parameters?.name || '',
            preservation_notes: {
              camera_specifications: trans.parameters?.preservation_notes?.camera_specifications || '',
              subject_description: trans.parameters?.preservation_notes?.subject_description || '',
              action_specification: trans.parameters?.preservation_notes?.action_specification || '',
              scene_description: trans.parameters?.preservation_notes?.scene_description || '',
              lighting: trans.parameters?.preservation_notes?.lighting || '',
              style_mood: trans.parameters?.preservation_notes?.style_mood || '',
              geometric_preservation: trans.parameters?.preservation_notes?.geometric_preservation || '',
              transition_type: trans.parameters?.preservation_notes?.transition_type || '',
              content_modification: trans.parameters?.preservation_notes?.content_modification || ''
            },
            prompt_description: trans.parameters?.prompt_description || ''
          },
          savecustom: trans.savecustom || false,
          custom_name: trans.custom_name || ''
        }];
      }

      // Build scene payload
      const scenePayload = {
        scene_number: sceneNumber,
        model: modelUpper,
        transitions: transitions
      };

      // Add VEO3 prompt template if model is VEO3
      if (modelUpper === 'VEO3') {
        const veo3Template = targetScene.veo3_prompt_template || targetScene.veo3PromptTemplate || {};
        if (Object.keys(veo3Template).length > 0) {
          scenePayload.veo3_prompt_template = {
            style: veo3Template.style || '',
            action: veo3Template.action || '',
            camera: veo3Template.camera || '',
            subject: veo3Template.subject || '',
            ambiance: veo3Template.ambiance || '',
            background: veo3Template.background || '',
            composition: veo3Template.composition || '',
            focus_and_lens: veo3Template.focus_and_lens || veo3Template.focusAndLens || ''
          };
        }
      }

      // Build regenerate request body
      const requestBody = {
        session_id,
        user_id,
        aspect_ratio: aspectRatio,
        subtitles: subtitles,
        logo: logo,
        scenes: [scenePayload]
      };

      console.log('🔄 Regenerating video with request:', requestBody);

      // Call regenerate API
      const regenerateResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const regenerateText = await regenerateResp.text();
      let regenerateData;
      try { regenerateData = JSON.parse(regenerateText); } catch (_) { regenerateData = regenerateText; }

      if (!regenerateResp.ok) {
        throw new Error(`Regenerate failed: ${regenerateResp.status} ${regenerateText}`);
      }

      const jobId = regenerateData?.job_id || regenerateData?.jobId || regenerateData?.id;
      if (!jobId) {
        throw new Error('No job ID returned from regenerate API');
      }

      setRegenerateJobId(jobId);
      setRegenerateStatus('queued');
      setRegenerateProgress({ percent: 0, phase: 'queued' });

      // Poll for job status
      const pollStatus = async () => {
        try {
          const statusResp = await fetch(
            `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/regenerate/${encodeURIComponent(jobId)}/status`
          );
          const statusText = await statusResp.text();
          let statusData;
          try { statusData = JSON.parse(statusText); } catch (_) { statusData = statusText; }

          if (!statusResp.ok) {
            throw new Error(`Status check failed: ${statusResp.status} ${statusText}`);
          }

          const status = String(statusData?.status || '').toLowerCase();
          const progress = statusData?.progress || {};
          const percent = Number(progress?.percent) || 0;
          const phase = String(progress?.phase || progress?.stage || status).toLowerCase();

          setRegenerateStatus(status);
          setRegenerateProgress({ percent, phase });

          if (status === 'succeeded' || status === 'completed' || (phase === 'done' && percent >= 100)) {
            // Success - close popup and refresh videos
            setShowRegeneratePopup(false);
            setIsRegenerating(false);
            alert('Video regenerated successfully! The video list will be updated.');
            // Optionally reload the page or refresh video data
            window.location.reload();
          } else if (status === 'failed' || status === 'error') {
            // Failed - show error
            const errorMessage = statusData?.error || statusData?.message || 'Video regeneration failed';
            setRegenerateError(errorMessage);
            setRegenerateStatus('failed');
          } else {
            // Still processing - poll again
            setTimeout(pollStatus, 3000);
          }
        } catch (err) {
          console.error('Error polling regenerate status:', err);
          setRegenerateError(err.message || 'Failed to check regeneration status');
          setRegenerateStatus('error');
        }
      };

      // Start polling
      setTimeout(pollStatus, 2000);
    } catch (error) {
      console.error('Error regenerating video:', error);
      setRegenerateError(error.message || 'Failed to regenerate video');
      setRegenerateStatus('error');
      setIsRegenerating(false);
    }
  }, [selectedClip, tracks]);

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
            --transition-duration: ${DEFAULT_TRANSITION_DURATION}s;
            transition: all var(--transition-duration) ease-in-out;
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
            transition: opacity var(--transition-duration) ease-in-out;
            z-index: 10;
            pointer-events: none;
        }
        .transition-out-dip-to-black::before { opacity: 1; }
        .transition-in-dip-to-black::before { opacity: 0; }
        
        .transition-out-slide-right { transform: translateX(100%); }
        .transition-in-slide-right { transform: translateX(0); }
        .transition-out-slide-left { transform: translateX(-100%); }
        .transition-in-slide-left { transform: translateX(0); }
        .transition-out-slide-up { transform: translateY(-100%); }
        .transition-in-slide-up { transform: translateY(0); }
        .transition-out-slide-down { transform: translateY(100%); }
        .transition-in-slide-down { transform: translateY(0); }

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
            <Button 
              onClick={async () => {
                try {
                  const { session_id, user_id } = await fetchSessionData();
                  if (!session_id || !user_id) {
                    throw new Error('Missing session or user information. Please ensure you are logged in.');
                  }
                  setShowPublishModal(true);
                } catch (err) {
                  alert(err.message);
                }
              }} 
              icon={Download} 
              disabled={tracks[0].length === 0 || isProcessing || isPublishing || isFetchingSession}
              active={!isProcessing && !isPublishing && !isFetchingSession}
               className={`bg-[#13008B] hover:bg-[#0f0069] text-white shadow-lg`}
            >
              {isProcessing || isPublishing || isFetchingSession
                  ? 'Preparing...' 
                  : 'Publish Reel'}
            </Button>

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
                            crossOrigin="anonymous"
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
           <div className="w-80 bg-white border-l border-gray-200 overflow-y-auto shrink-0 relative">
            {/* Publish modal */}
            <Modal open={showPublishModal} onClose={() => setShowPublishModal(false)}>
              <div className="p-6 space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Publish Reel</h3>
                <p className="text-sm text-gray-600">Name your reel. Session/User info comes from your current session.</p>
                <div className="space-y-3">
                  <div className="flex flex-col gap-1">
                    <label className="text-xs font-semibold text-gray-700">Name</label>
                    <input
                      type="text"
                      value={publishForm.name}
                      onChange={(e) => setPublishForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="My Awesome Reel"
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                  </div>
                  <div className="flex flex-col gap-1 text-xs text-gray-600 bg-gray-50 border border-gray-200 rounded px-3 py-2">
                    <span className="font-semibold text-gray-700">Session</span>
                    <span>Session ID: {sessionData.session_id || 'Not available'}</span>
                    <span>User ID: {sessionData.user_id || 'Not available'}</span>
                  </div>
                </div>
                <div className="flex justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowPublishModal(false)}
                    className="px-3 py-2 text-sm rounded border border-gray-300 text-gray-700 hover:bg-gray-100"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handlePublish}
                    disabled={isPublishing || isProcessing}
                    className="px-3 py-2 text-sm rounded bg-[#13008B] text-white hover:bg-[#0f0069] disabled:opacity-50"
                  >
                    {isPublishing ? 'Publishing...' : 'Publish'}
                  </button>
                </div>
              </div>
            </Modal>

            {/* Publish uploading loading screen */}
            {showPublishUploading && (
              <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex items-center justify-center px-4">
                <div className="bg-white shadow-2xl rounded-2xl px-8 py-9 text-center space-y-4 max-w-md">
                  <div className="w-16 h-16 rounded-full border-4 border-[#D8D3FF] border-t-[#13008B] animate-spin mx-auto"></div>
                  <div className="text-lg font-semibold text-[#13008B]">Uploading Video...</div>
                  <p className="text-sm text-gray-600">Please wait while we upload your video to the conversion queue.</p>
                </div>
              </div>
            )}
            {(selectedClip || activeTab === 'transitions') ? (
              <div className="p-5">
                 {/* Header for Selected Clip */}
                 {selectedClip && (
                   <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-300">
                      <div className="flex flex-col">
                         <span className="text-[10px] uppercase text-gray-500 font-bold tracking-wider">Properties</span>
                         <span className="text-sm font-medium text-gray-900 truncate w-40" title={selectedClip.name}>{selectedClip.name}</span>
                      </div>
                      {/* Delete button from properties panel */}
                      <Button variant="danger" onClick={() => deleteClip(selectedClip.id)} className="px-2 py-1"><Trash2 size={14}/></Button>
                   </div>
                 )}

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

                      <div className="mt-3 grid grid-cols-2 gap-2">
                        <button
                          className="text-xs py-2 px-2 rounded bg-white border border-gray-300 hover:bg-gray-100"
                          onClick={() => {
                            updateTrimForClip(selectedClip.id, (clip) => ({
                              ...clip,
                              trimStart: Math.max(0, clip.trimStart - 1),
                              trimEnd: clip.trimEnd
                            }));
                          }}
                        >
                          Extend Start (-1s)
                        </button>
                        <button
                          className="text-xs py-2 px-2 rounded bg-white border border-gray-300 hover:bg-gray-100"
                          onClick={() => {
                            updateTrimForClip(selectedClip.id, (clip) => ({
                              ...clip,
                              trimStart: clip.trimStart,
                              trimEnd: Math.min(clip.duration, clip.trimEnd + 1)
                            }));
                          }}
                        >
                          Extend End (+1s)
                        </button>
                        <button
                          className="text-xs py-2 px-2 rounded bg-white border border-gray-300 hover:bg-gray-100 col-span-2"
                          onClick={() => {
                            updateTrimForClip(selectedClip.id, (clip) => ({
                              ...clip,
                              trimStart: 0,
                              trimEnd: clip.duration
                            }));
                          }}
                        >
                          Reset to Full Length
                        </button>
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

                    {/* Regenerate Video Button - Only for V1 (primary track) clips */}
                    {selectedClip && tracks[0].some(clip => clip.id === selectedClip.id) && (
                      <div className="bg-gray-50 p-4 rounded-xl border border-gray-300">
                        <h3 className="text-xs font-semibold text-gray-700 mb-2 uppercase flex items-center gap-2"><RefreshCcw size={12}/> Regenerate Video</h3>
                        <p className="text-xs text-gray-600 mb-4 leading-relaxed">
                          Regenerate this video scene with the current settings.
                        </p>
                        <button
                          onClick={handleRegenerateVideo}
                          disabled={isRegenerating}
                          className={`w-full py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                            isRegenerating
                              ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                              : 'bg-[#13008B] hover:bg-[#0f0069] text-white'
                          }`}
                        >
                          {isRegenerating ? 'Regenerating...' : 'Regenerate Video'}
                        </button>
                      </div>
                    )}
                    
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
                        <div className="bg-gray-50 p-3 rounded-lg mb-4 border border-gray-300">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Clock size={16} className="text-[#13008B]"/>
                              <span className="text-xs font-semibold text-gray-700 uppercase">Duration</span>
                            </div>
                            <span className="text-sm font-mono text-gray-900">{activeTransitionDuration.toFixed(1)}s</span>
                          </div>
                          <input
                            type="range"
                            min="0.2"
                            max="3"
                            step="0.1"
                            value={activeTransitionDuration}
                            onChange={(e) => {
                              const duration = parseFloat(e.target.value);
                              setTransitionDurations(prev => ({ ...prev, [activeTransitionId]: duration }));
                            }}
                            className="w-full accent-[#13008B]"
                          />
                        </div>
                        <div className="grid grid-cols-2 gap-2 max-h-64 overflow-y-auto pr-1">
                          {FFMPEG_TRANSITIONS.map(({ id, label }) => {
                            const isNone = id === 'none';
                            const isActiveTransition = transitions[activeTransitionId] === id || (!transitions[activeTransitionId] && isNone);
                            return (
                              <button
                                key={id}
                                onClick={() => {
                                  setTransitions(prev => {
                                    if (isNone) {
                                      const next = { ...prev };
                                      delete next[activeTransitionId];
                                      return next;
                                    }
                                    return { ...prev, [activeTransitionId]: id };
                                  });
                                  setTransitionDurations(prev => {
                                    if (isNone) {
                                      const next = { ...prev };
                                      delete next[activeTransitionId];
                                      return next;
                                    }
                                    return { ...prev, [activeTransitionId]: prev[activeTransitionId] || DEFAULT_TRANSITION_DURATION };
                                  });
                                }}
                                className={`p-3 rounded border text-sm transition-all text-left
                                  ${isActiveTransition
                                    ? 'bg-[#13008B] border-[#13008B] text-white' 
                                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}
                                `}
                              >
                                {label}
                              </button>
                            );
                          })}
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

      {/* Regenerate Video Popup Modal */}
      {showRegeneratePopup && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-md mx-4 relative">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800">Regenerating Video</h3>
                {!isRegenerating && (
                  <button
                    onClick={() => {
                      setShowRegeneratePopup(false);
                      setRegenerateError('');
                      setRegenerateStatus('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    <X size={20} />
                  </button>
                )}
              </div>

              {regenerateError ? (
                <div className="text-center py-8">
                  <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <X size={32} className="text-red-600" />
                  </div>
                  <h4 className="text-lg font-semibold text-red-600 mb-2">Regeneration Failed</h4>
                  <p className="text-sm text-gray-600 mb-4">{regenerateError}</p>
                  <button
                    onClick={() => {
                      setShowRegeneratePopup(false);
                      setRegenerateError('');
                      setRegenerateStatus('');
                      setIsRegenerating(false);
                    }}
                    className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-lg text-sm font-medium"
                  >
                    Close
                  </button>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="w-16 h-16 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <h4 className="text-lg font-semibold text-gray-800 mb-2">
                    {regenerateStatus === 'queued' ? 'Queued for Regeneration' :
                     regenerateStatus === 'processing' ? 'Processing...' :
                     regenerateStatus === 'succeeded' ? 'Regeneration Complete!' :
                     'Regenerating Video'}
                  </h4>
                  <p className="text-sm text-gray-600 mb-4">
                    {regenerateProgress.phase ? `Phase: ${regenerateProgress.phase}` : 'Please wait...'}
                  </p>
                  {regenerateProgress.percent > 0 && (
                    <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                      <div
                        className="bg-[#13008B] h-2 rounded-full transition-all duration-300"
                        style={{ width: `${regenerateProgress.percent}%` }}
                      />
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    {regenerateProgress.percent > 0 ? `${regenerateProgress.percent}%` : 'Initializing...'}
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
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

// Simple modal for publish details
const Modal = ({ open, onClose, children }) => {
  if (!open) return null;
  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center px-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-md relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          aria-label="Close"
        >
          <X size={16} />
        </button>
        {children}
      </div>
    </div>
  );
};
