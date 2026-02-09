import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { ReactVideoEditor } from '../video-editor-js/pro/components/react-video-editor';
import { HttpRenderer } from '../video-editor-js/pro/utils/http-renderer';
import { OverlayType } from '../video-editor-js/pro/types';
import { calculateIntelligentAssetSize } from '../video-editor-js/pro/utils/asset-sizing';
import '../video-editor-js/pro/styles.css';
import '../video-editor-js/pro/styles.utilities.css';
import '../video-editor-js/pro/styles/base-themes/dark.css';
import '../video-editor-js/pro/styles/base-themes/light.css';
import '../video-editor-js/pro/styles/base-themes/rve.css';
import { Zap, ChevronRight, X, Menu, Plus, MoreVertical } from 'lucide-react';
import { FaPlus } from 'react-icons/fa';
import AddSceneDropdown from '../BuildReel/AddSceneDropdown';
import { SidebarMenuButton } from '../video-editor-js/pro/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../video-editor-js/pro/components/ui/tooltip';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import LogoImage from '../../asset/mainLogo.png';
import LoadingAnimationGif from '../../asset/loadingv2.gif';
import { uploadBlobUrl } from '../../utils/uploadAssets';
import Loader from '../Loader';
import { useProgressLoader } from '../../hooks/useProgressLoader';
import { sessionImagesAdaptor } from '../video-editor-js/pro/adaptors/session-images-adaptor';
import { useLocation } from 'react-router-dom';

// FFmpeg xfade filter transition types
// Reference: https://ffmpeg.org/ffmpeg-filters.html#xfade
const TRANSITION_MAP = {
  "fade": "fade",                    // Cross-fade (default)
  "fadeblack": "fadeblack",           // Fade to black
  "fadewhite": "fadewhite",           // Fade to white
  "distance": "distance",             // Distance-based transition
  "wipeleft": "wipeleft",             // Wipe from right to left
  "wiperight": "wiperight",           // Wipe from left to right
  "wipeup": "wipeup",                 // Wipe from bottom to top
  "wipedown": "wipedown",             // Wipe from top to bottom
  "slideleft": "slideleft",           // Slide from right to left
  "slideright": "slideright",         // Slide from left to right
  "slideup": "slideup",               // Slide from bottom to top
  "slidedown": "slidedown",           // Slide from top to bottom
  "circleopen": "circleopen",         // Circle opening
  "circleclose": "circleclose",       // Circle closing
  "rectcrop": "rectcrop",             // Rectangular crop
  "pixelize": "pixelize",             // Pixelize effect
  "radial": "radial",                 // Radial transition
  "hblur": "hblur",                   // Horizontal blur
  "wipetl": "wipetl",                 // Wipe top-left
  "wipetr": "wipetr",                 // Wipe top-right
  "wipebl": "wipebl",                 // Wipe bottom-left
  "wipebr": "wipebr",                 // Wipe bottom-right
  "squeezeh": "squeezeh",             // Squeeze horizontally
  "squeezev": "squeezev",             // Squeeze vertically
  "zoomin": "zoomin",                 // Zoom in
  "zoomout": "zoomout",               // Zoom out
  "fadefast": "fadefast",             // Fast fade
  "fadeslow": "fadeslow",             // Slow fade
};

const PROJECT_ID = 'demo-project';
const DEFAULT_PROJECT_OVERLAYS = [];
const APP_CONFIG = { fps: 30 };
const LAMBDA_RENDER_ENDPOINT = '/api/render/lambda';
const SSR_RENDER_ENDPOINT = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/api/render/ssr';


const VideosList = ({ jobId, onClose, onGenerateFinalReel, onJobPhaseDone, onAddScene, hasScripts, onViewScene }) => {
  const [items, setItems] = useState([]); // array of { url, description, narration, scenes: [] }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('queued');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [currentSessionId, setCurrentSessionId] = useState(() => localStorage.getItem('session_id') || null);
  const [showVideoLoader, setShowVideoLoader] = useState(false);
  const [jobProgress, setJobProgress] = useState({ percent: 0, phase: '' });
  // Render video modal state
  const [showRenderModal, setShowRenderModal] = useState(false);
  const [renderProgress, setRenderProgress] = useState({ percent: 0, phase: '' });
  const [renderJobId, setRenderJobId] = useState(null);
  // Transitions state: key is video index (transition between video[index] and video[index+1])
  const [transitions, setTransitions] = useState({}); // { 0: "fade", 1: "slideleft", ... }
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  // Logo and Subtitle toggle states (default both on)
  const [logoEnabled, setLogoEnabled] = useState(true);
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(false);
  const [isAddSceneOpen, setIsAddSceneOpen] = useState(false);
  const addSceneButtonRef = useRef(null);
  // Aspect ratio from session/script data
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const sidebarTopActions = useMemo(() => {
    // Only show the button if onAddScene is provided (i.e., in BuildReelWizard)
    if (!onAddScene) return null;

    return (
      <div className="relative">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <SidebarMenuButton
                ref={addSceneButtonRef}
                onClick={() => setIsAddSceneOpen(!isAddSceneOpen)}
                size="lg"
                className="flex flex-col items-center gap-2 px-1.5 py-2.5"
                data-active={isAddSceneOpen}
              >
                <Plus className="h-4 w-4" strokeWidth={1.25} />
                <span className="text-[8px] leading-none">Add Scene</span>
              </SidebarMenuButton>
            </TooltipTrigger>
            <TooltipContent side="right">Add Scene</TooltipContent>
          </Tooltip>
        </TooltipProvider>

        {isAddSceneOpen && (
          <div
            className="fixed z-[9999]"
            style={{
              top: addSceneButtonRef.current ? addSceneButtonRef.current.getBoundingClientRect().top : 0,
              left: (addSceneButtonRef.current ? addSceneButtonRef.current.getBoundingClientRect().right : 0) + 10
            }}
          >
            <div className="relative">
              {/* Arrow pointing left */}
              <div className="absolute top-4 -left-2 w-4 h-4 bg-white transform rotate-45 border-l border-b border-gray-100"></div>
              <AddSceneDropdown
                hasScripts={hasScripts}
                onAdd={(options) => {
                  setIsAddSceneOpen(false);
                  if (onAddScene) onAddScene(options);
                }}
                className="w-72 shadow-xl"
              />
            </div>
          </div>
        )}
      </div>
    );
  }, [isAddSceneOpen, hasScripts, onAddScene]);

  const applyChromaKey = useCallback((videoElement) => {
    if (!videoElement || !videoElement.parentNode) return;

    // Check if already processed
    if (videoElement.dataset.chromaProcessed === 'true') {
      return;
    }

    // IMMEDIATELY hide the video to prevent white flash
    videoElement.style.opacity = '0';
    videoElement.style.visibility = 'hidden';

    // Mark immediately to prevent duplicate processing
    videoElement.dataset.chromaProcessed = 'true';

    // Set crossOrigin BEFORE accessing canvas
    if (!videoElement.crossOrigin) {
      videoElement.crossOrigin = 'anonymous';
      const originalSrc = videoElement.src;
      videoElement.src = '';
      videoElement.src = originalSrc;

      videoElement.addEventListener('loadeddata', () => {
        setTimeout(() => {
          videoElement.dataset.chromaProcessed = 'false';
          applyChromaKey(videoElement);
        }, 100);
      }, { once: true });
      return;
    }

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });

    const setupCanvas = () => {
      canvas.width = videoElement.videoWidth || 1280;
      canvas.height = videoElement.videoHeight || 720;

      canvas.style.cssText = videoElement.style.cssText;
      canvas.style.width = videoElement.style.width || '100%';
      canvas.style.height = videoElement.style.height || '100%';
      canvas.className = videoElement.className;
      canvas.id = videoElement.id;
      canvas.dataset.chromaProcessed = 'true';

      // Force canvas to be visible
      canvas.style.opacity = '1';
      canvas.style.visibility = 'visible';

      const WHITE_THRESHOLD = 240;
      let lastFrameTime = 0;
      const frameInterval = 1000 / 30; // 30 FPS

      const processFrame = (currentTime) => {
        // Throttle to 30 FPS for performance
        if (currentTime - lastFrameTime < frameInterval) {
          requestAnimationFrame(processFrame);
          return;
        }
        lastFrameTime = currentTime;

        try {
          // Always keep video hidden
          videoElement.style.opacity = '0';
          videoElement.style.visibility = 'hidden';

          ctx.clearRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);

          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const data = imageData.data;

          for (let i = 0; i < data.length; i += 4) {
            const r = data[i];
            const g = data[i + 1];
            const b = data[i + 2];

            if (r > WHITE_THRESHOLD && g > WHITE_THRESHOLD && b > WHITE_THRESHOLD) {
              data[i + 3] = 0;
            }
          }

          ctx.putImageData(imageData, 0, 0);
        } catch (err) {
          // Silently continue
        }

        requestAnimationFrame(processFrame);
      };

      // Replace video with canvas
      const parent = videoElement.parentNode;
      if (parent) {
        // Insert canvas BEFORE removing video (prevents layout shift)
        parent.insertBefore(canvas, videoElement);

        // Move video to body (completely hidden)
        videoElement.style.position = 'fixed';
        videoElement.style.left = '-99999px';
        videoElement.style.top = '-99999px';
        videoElement.style.width = '1px';
        videoElement.style.height = '1px';
        videoElement.style.opacity = '0';
        videoElement.style.visibility = 'hidden';
        videoElement.style.pointerEvents = 'none';
        videoElement.style.zIndex = '-9999';
        document.body.appendChild(videoElement);

        // Pre-render first frame
        if (videoElement.readyState >= 2) {
          try {
            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            const data = imageData.data;
            for (let i = 0; i < data.length; i += 4) {
              const r = data[i];
              const g = data[i + 1];
              const b = data[i + 2];
              if (r > WHITE_THRESHOLD && g > WHITE_THRESHOLD && b > WHITE_THRESHOLD) {
                data[i + 3] = 0;
              }
            }
            ctx.putImageData(imageData, 0, 0);
          } catch (err) {
            console.error('Pre-render error:', err);
          }
        }

        // Start processing immediately
        requestAnimationFrame(processFrame);

        // Sync canvas controls
        canvas.addEventListener('click', (e) => {
          e.stopPropagation();
          if (videoElement.paused) {
            videoElement.play();
          } else {
            videoElement.pause();
          }
        });

        // Force video to stay hidden on all events
        const keepHidden = () => {
          videoElement.style.opacity = '0';
          videoElement.style.visibility = 'hidden';
        };

        videoElement.addEventListener('play', keepHidden);
        videoElement.addEventListener('playing', keepHidden);
        videoElement.addEventListener('seeked', keepHidden);
        videoElement.addEventListener('timeupdate', keepHidden);
        videoElement.addEventListener('loadeddata', keepHidden);
      }
    };

    if (videoElement.readyState >= 2) {
      setupCanvas();
    } else {
      videoElement.addEventListener('loadedmetadata', setupCanvas, { once: true });
    }

  }, []);
  // Wrapper for setTransitions to add debugging
  const handleTransitionsChange = useCallback((newTransitions) => {
    setTransitions(newTransitions);
  }, [transitions]);
  const [hoveredTransitionIndex, setHoveredTransitionIndex] = useState(null); // null or video index
  const [showTransitionMenu, setShowTransitionMenu] = useState(null); // null or video index
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mergeJobId, setMergeJobId] = useState('');
  const ffmpegRef = useRef(null);
  const [isFFmpegLoading, setIsFFmpegLoading] = useState(false);
  const [ffmpegError, setFfmpegError] = useState('');
  const [finalMergeStatus, setFinalMergeStatus] = useState('');
  const [finalMergeProgress, setFinalMergeProgress] = useState({ percent: 0, phase: '' });
  const [finalMergeUrl, setFinalMergeUrl] = useState('');
  const [isTranscodingFinal, setIsTranscodingFinal] = useState(false);
  const [finalReel720Url, setFinalReel720Url] = useState('');
  const [videoBlobUrl, setVideoBlobUrl] = useState(null);
  const [videoLoading, setVideoLoading] = useState(false);
  // Track unsaved layers for save button
  const [hasUnsavedLayers, setHasUnsavedLayers] = useState(false);
  const [isSavingLayers, setIsSavingLayers] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const savedOverlayIdsRef = useRef(new Set()); // Track saved overlay IDs
  const savedOverlaysSnapshotRef = useRef([]);
  const deletedOverlayIdsRef = useRef(new Set()); // Track overlay IDs that have been deleted via API
  // Upload Base Video Modal State
  const [showUploadBaseVideoModal, setShowUploadBaseVideoModal] = useState(false);
  const [selectedSceneForUpload, setSelectedSceneForUpload] = useState(null);
  const [uploadBaseVideoFile, setUploadBaseVideoFile] = useState(null);
  const [isUploadingBaseVideo, setIsUploadingBaseVideo] = useState(false);
  const [uploadBaseVideoError, setUploadBaseVideoError] = useState('');

  // Progress bars for loaders using useProgressLoader hook (must be after all state declarations)
  const savingLayersProgress = useProgressLoader(isSavingLayers, 95, 15000);
  const uploadingBaseVideoProgress = useProgressLoader(isUploadingBaseVideo, 95, 30000);
  // Use jobProgress.percent if available, otherwise fall back to simulated progress
  const simulatedVideoLoaderProgress = useProgressLoader(showVideoLoader || isLoading, 95, 60000);
  const videoLoaderProgress = jobProgress.percent > 0 ? jobProgress.percent : simulatedVideoLoaderProgress;
  // Use renderProgress.percent if available, otherwise fall back to simulated progress
  const simulatedRenderProgress = useProgressLoader(showRenderModal && renderJobId, 95, 120000);
  const renderingVideoProgress = renderProgress.percent > 0 ? renderProgress.percent : simulatedRenderProgress;

  const editorOverlaysRef = useRef([]); // Store current overlays from editor
  const initialOverlaysLoadedRef = useRef(false); // Track if initial overlays have been loaded
  const jobVideoResultsFetchedRef = useRef(false); // Track if video results have been fetched from job API

  // Track original base video URLs to detect changes
  const originalBaseVideoUrlsRef = useRef({});

  // Track session_id changes and clear state when session changes
  useEffect(() => {
    const checkSession = () => {
      const newSessionId = localStorage.getItem('session_id');

      // If session changed, clear all state
      if (newSessionId !== currentSessionId && currentSessionId !== null) {
        // Clear all video-related state when session changes
        setItems([]);
        setSelectedIndex(0);
        setError('');
        setIsLoading(false);
        setStatus('queued');
        setJobProgress({ percent: 0, phase: '' });
        setShowVideoLoader(false);
        // Clear session media files
        if (typeof window !== 'undefined') {
          window.__SESSION_MEDIA_FILES = [];
        }
        // Clear saved overlays tracking
        savedOverlayIdsRef.current.clear();
        savedOverlaysSnapshotRef.current = [];
        initialOverlaysLoadedRef.current = false;
        editorOverlaysRef.current = [];
        deletedOverlayIdsRef.current.clear();
        originalBaseVideoUrlsRef.current = {};
      }

      // Update current session ID
      if (newSessionId !== currentSessionId) {
        setCurrentSessionId(newSessionId);
      }
    };

    // Check immediately
    checkSession();

    // Also set up a listener for storage events (in case session changes in another tab/window)
    const handleStorageChange = (e) => {
      if (e.key === 'session_id') {
        checkSession();
      }
    };

    window.addEventListener('storage', handleStorageChange);

    // Poll for session changes (in case localStorage is updated directly)
    const interval = setInterval(checkSession, 1000);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(interval);
    };
  }, [currentSessionId]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    // Get video URL with logo and subtitles
    const getVideoWithLogoAndSubtitlesUrlFromEntry = (entry = {}) => {
      // Check for video_with_logo_and_subtitles_url in various locations
      if (entry?.video_with_logo_and_subtitles_url) return entry.video_with_logo_and_subtitles_url;
      if (entry?.video?.video_with_logo_and_subtitles_url) return entry.video.video_with_logo_and_subtitles_url;
      if (entry?.videos?.video_with_logo_and_subtitles_url) return entry.videos.video_with_logo_and_subtitles_url;
      if (entry?.videos?.v1?.video_with_logo_and_subtitles_url) return entry.videos.v1.video_with_logo_and_subtitles_url;
      if (entry?.video?.v1?.video_with_logo_and_subtitles_url) return entry.video.v1.video_with_logo_and_subtitles_url;
      if (entry?.blobLink?.video_with_logo_and_subtitles_link) return entry.blobLink.video_with_logo_and_subtitles_link;
      return null;
    };

    // Get silent video URL (no logo, no subtitles)
    const getSilentVideoUrlFromEntry = (entry = {}) => {
      if (entry?.silent_video_url) return entry.silent_video_url;
      if (entry?.video?.silent_video_url) return entry.video.silent_video_url;
      if (entry?.videos?.silent_video_url) return entry.videos.silent_video_url;
      if (entry?.videos?.v1?.silent_video_url) return entry.videos.v1.silent_video_url;
      if (entry?.video?.v1?.silent_video_url) return entry.video.v1.silent_video_url;
      if (entry?.blobLink?.silent_video_link) return entry.blobLink.silent_video_link;
      return null;
    };

    // Get video URL with logo only (no subtitles)
    const getVideoWithLogoUrlFromEntry = (entry = {}) => {
      if (entry?.video_with_logo_url) return entry.video_with_logo_url;
      if (entry?.video?.video_with_logo_url) return entry.video.video_with_logo_url;
      if (entry?.videos?.video_with_logo_url) return entry.videos.video_with_logo_url;
      if (entry?.videos?.v1?.video_with_logo_url) return entry.videos.v1.video_with_logo_url;
      if (entry?.video?.v1?.video_with_logo_url) return entry.video.v1.video_with_logo_url;
      if (entry?.blobLink?.video_with_logo_link) return entry.blobLink.video_with_logo_link;
      return null;
    };

    // Get video URL with subtitles only (no logo)
    const getVideoWithSubtitlesUrlFromEntry = (entry = {}) => {
      if (entry?.video_with_subtitles_url) return entry.video_with_subtitles_url;
      if (entry?.video?.video_with_subtitles_url) return entry.video.video_with_subtitles_url;
      if (entry?.videos?.video_with_subtitles_url) return entry.videos.video_with_subtitles_url;
      if (entry?.videos?.v1?.video_with_subtitles_url) return entry.videos.v1.video_with_subtitles_url;
      if (entry?.video?.v1?.video_with_subtitles_url) return entry.video.v1.video_with_subtitles_url;
      if (entry?.blobLink?.video_with_subtitles_link) return entry.blobLink.video_with_subtitles_link;
      return null;
    };

    // Get regular video URL (fallback if specific version not available)
    const getVideoUrlFromEntry = (entry = {}) =>
      entry?.video?.v1?.video_url ||
      entry?.video?.video_url ||
      entry?.videos?.v1?.video_url ||
      entry?.videos?.video_url ||
      entry?.video_url ||
      entry?.blobLink?.video_link ||
      entry?.url;

    // Get base video URL from new schema (highest priority)
    // This is the canonical base video without overlays
    const getBaseVideoUrlFromEntry = (entry = {}) => {
      // Priority 1: Check videos.v1.base_video_url (NEW SCHEMA)
      if (entry?.videos?.v1?.base_video_url) {
        return entry.videos.v1.base_video_url;
      }

      // Priority 2: Fall back to existing logic
      if (entry?.videos?.base_video_url) {
        return entry.videos.base_video_url;
      }
      if (entry?.video?.v1?.base_video_url) {
        return entry.video.v1.base_video_url;
      }
      if (entry?.video?.base_video_url) {
        return entry.video.base_video_url;
      }

      // Priority 3: Fall back to regular video URL extraction
      return getVideoUrlFromEntry(entry);
    };

    // Get video URL based on logo and subtitle toggle states
    const getVideoUrlBasedOnToggles = (entry = {}) => {
      let url = null;

      // 1. Both on: video_with_logo_and_subtitles_url
      if (logoEnabled && subtitleEnabled) {
        url = getVideoWithLogoAndSubtitlesUrlFromEntry(entry);
        if (url) {
          return url;
        }
      }

      // 2. Both off: silent_video_url
      if (!logoEnabled && !subtitleEnabled) {
        url = getSilentVideoUrlFromEntry(entry);
        if (url) {
          return url;
        }
      }

      // 3. Logo on, subtitle off: video_with_logo_url
      if (logoEnabled && !subtitleEnabled) {
        url = getVideoWithLogoUrlFromEntry(entry);
        if (url) {
          return url;
        }
      }

      // 4. Logo off, subtitle on: video_with_subtitles_url
      if (!logoEnabled && subtitleEnabled) {
        url = getVideoWithSubtitlesUrlFromEntry(entry);
        if (url) {
          return url;
        }
      }

      // Fallback to regular video URL if specific version not available
      url = getVideoUrlFromEntry(entry);

      // IMPORTANT: Return the URL as-is, no modifications
      // External URLs (http://, https://) should be used directly
      return url;
    };

    // Get chart video URL from layers array (NEW SCHEMA - Priority 1)
    const getChartVideoUrlFromLayers = (entry = {}) => {
      // Priority 1: Check videos.v1.layers array for chart layer (NEW SCHEMA)
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        const chartLayer = entry.videos.v1.layers.find(layer => layer?.name === 'chart');
        if (chartLayer?.url) {
          return chartLayer.url;
        }
      }

      // Return null to trigger fallback
      return null;
    };

    // Get complete chart layer data with all properties
    const getChartLayerData = (entry = {}) => {
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        const chartLayer = entry.videos.v1.layers.find(layer => layer?.name === 'chart');
        if (chartLayer) {
          return {
            url: chartLayer.url,
            timing: chartLayer.timing || { start: "00:00:00", end: null },
            position: chartLayer.position || { x: 0.5, y: 0.5 },
            bounding_box: chartLayer.bounding_box || null,
            size: chartLayer.size || null,
            scaling: chartLayer.scaling || { scale_x: 1, scale_y: 1, fit_mode: 'contain' },
            animation: chartLayer.animation || { type: 'none', duration: 0.5 },
            layout: chartLayer.layout || { align: 'center', verticalAlign: 'middle' },
            opacity: chartLayer.opacity !== undefined ? chartLayer.opacity : 1,
            rotation: chartLayer.rotation || 0,
            enabled: chartLayer.enabled !== undefined ? chartLayer.enabled : true,
          };
        }
      }
      return null;
    };

    // Get chart video URL (for PLOTLY model overlay)
    const getChartVideoUrlFromEntry = (entry = {}) => {
      // PRIORITY 1: Check layers array first (NEW SCHEMA)
      const chartFromLayers = getChartVideoUrlFromLayers(entry);
      if (chartFromLayers) {
        return chartFromLayers;
      }

      // PRIORITY 2: Check top-level fields (LEGACY)
      if (entry?.chart_video_url) {
        return entry.chart_video_url;
      }
      if (entry?.chartVideoUrl) {
        return entry.chartVideoUrl;
      }
      // Check nested structures
      if (entry?.chart_video?.url) {
        return entry.chart_video.url;
      }
      if (entry?.chart?.video_url) {
        return entry.chart.video_url;
      }
      if (entry?.videos?.v1?.chart_video_url) {
        return entry.videos.v1.chart_video_url;
      }
      if (entry?.videos?.chart_video_url) {
        return entry.videos.chart_video_url;
      }
      if (entry?.video?.v1?.chart_video_url) {
        return entry.video.v1.chart_video_url;
      }
      if (entry?.video?.chart_video_url) {
        return entry.video.chart_video_url;
      }
      return null;
    };

    // Get audio URL from layers array (NEW SCHEMA - Priority 1)
    const getAudioUrlFromLayers = (entry = {}) => {
      // Priority 1: Check videos.v1.layers array for audio layer (NEW SCHEMA)
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        const audioLayer = entry.videos.v1.layers.find(layer => layer?.name === 'audio');
        if (audioLayer?.url) {
          return audioLayer.url;
        }
      }

      // Return null to trigger fallback
      return null;
    };

    // Get audio layer data (url, timing, volume, enabled) from layers array
    const getAudioLayerData = (entry = {}) => {
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        const audioLayer = entry.videos.v1.layers.find(layer => layer?.name === 'audio');
        if (audioLayer) {
          return {
            url: audioLayer.url,
            timing: audioLayer.timing || { start: "00:00:00", end: null },
            volume: audioLayer.volume !== undefined ? audioLayer.volume : 1,
            enabled: audioLayer.enabled !== undefined ? audioLayer.enabled : true,
          };
        }
      }
      return null;
    };

    // Get audio URL (prefer audio_only_url, especially from videos.v1 for SORA/PLOTLY)
    const getAudioUrlFromEntry = (entry = {}) => {
      // PRIORITY 1: Check layers array first (NEW SCHEMA)
      const audioFromLayers = getAudioUrlFromLayers(entry);
      if (audioFromLayers) {
        return audioFromLayers;
      }

      // PRIORITY 2: Check videos.v1.audio_only_url (for SORA/PLOTLY scenes)
      if (entry?.videos?.v1?.audio_only_url) {
        return entry.videos.v1.audio_only_url;
      }
      // Check videos.v1.audio_url as fallback
      if (entry?.videos?.v1?.audio_url) {
        return entry.videos.v1.audio_url;
      }
      // Check other nested structures
      if (entry?.videos?.audio_only_url) {
        return entry.videos.audio_only_url;
      }
      if (entry?.videos?.audio_url) {
        return entry.videos.audio_url;
      }
      // Check video (singular) structure
      if (entry?.video?.v1?.audio_only_url) {
        return entry.video.v1.audio_only_url;
      }
      if (entry?.video?.v1?.audio_url) {
        return entry.video.v1.audio_url;
      }
      if (entry?.video?.audio_only_url) {
        return entry.video.audio_only_url;
      }
      if (entry?.video?.audio_url) {
        return entry.video.audio_url;
      }
      // Check top-level fields
      if (entry?.audio_only_url) {
        return entry.audio_only_url;
      }
      if (entry?.audio_only?.url) {
        return entry.audio_only.url;
      }
      if (entry?.audio_url) {
        return entry.audio_url;
      }
      if (entry?.audio?.url) {
        return entry.audio.url;
      }
      // Check other audio-related fields
      if (entry?.voice_link) {
        return entry.voice_link;
      }
      if (entry?.voiceover_url) {
        return entry.voiceover_url;
      }
      if (entry?.narration_url) {
        return entry.narration_url;
      }
      if (entry?.narration?.url) {
        return entry.narration.url;
      }
      if (entry?.audio?.audio_url) {
        return entry.audio.audio_url;
      }
      if (entry?.blobLink?.audio_link) {
        return entry.blobLink.audio_link;
      }
      // Check if narration is a URL string
      if (typeof entry?.narration === 'string' && entry.narration.startsWith('http')) {
        return entry.narration;
      }
      return null;
    };

    const parseVideosPayload = (payload = {}) => {
      const videosArr = Array.isArray(payload?.videos) ? payload.videos : [];
      return videosArr
        .map((videoEntry, videoIndex) => {
          // Get base video URL from new schema (highest priority)
          const baseVideoUrl = getBaseVideoUrlFromEntry(videoEntry);

          // Get video URL based on logo and subtitle toggle states (fallback)
          const primaryVideoUrl = baseVideoUrl || getVideoUrlBasedOnToggles(videoEntry);
          const scenes = [];

          const appendScene = (sceneSource, fallbackLabel) => {
            const sceneUrl = getVideoUrlFromEntry(sceneSource);
            const sceneAudioUrl = getAudioUrlFromEntry(sceneSource);
            const sceneChartUrl = getChartVideoUrlFromEntry(sceneSource);
            if (sceneUrl) {
              scenes.push({
                url: sceneUrl,
                audioUrl: sceneAudioUrl, // Store audio URL per scene
                chartVideoUrl: sceneChartUrl || null,
                description:
                  sceneSource?.desc ||
                  sceneSource?.description ||
                  sceneSource?.scene_description ||
                  fallbackLabel ||
                  '',
                narration: sceneSource?.narration || sceneSource?.voiceover || '',
                sceneNumber: sceneSource?.scene_number,
                sceneTitle: sceneSource?.scene_title || sceneSource?.title,
              });
            }
          };

          const nestedScenes = Array.isArray(videoEntry?.scenes) ? videoEntry.scenes : [];
          nestedScenes.forEach((scene, idx) => appendScene(scene, `Scene ${idx + 1}`));

          const nestedVideosArray = Array.isArray(videoEntry?.videos) ? videoEntry.videos : [];
          nestedVideosArray.forEach((scene, idx) => appendScene(scene, `Scene ${idx + 1}`));

          if (!nestedScenes.length && !nestedVideosArray.length && videoEntry?.videos && typeof videoEntry.videos === 'object') {
            appendScene({ videos: videoEntry.videos, description: videoEntry?.description, narration: videoEntry?.narration }, 'Scene');
          }

          if (!primaryVideoUrl && scenes.length === 0) {
            return null;
          }

          const audioUrl = getAudioUrlFromEntry(videoEntry);

          // Extract chart_video_url - check for all videos, not just PLOTLY
          const modelUpper = String(videoEntry?.model || videoEntry?.mode || '').toUpperCase();
          const isPlotly = modelUpper === 'PLOTLY';
          // Extract chart_video_url if available (for PLOTLY and potentially other models)
          let chartVideoUrl = getChartVideoUrlFromEntry(videoEntry);
          // If top-level chart video is missing, fall back to first scene that has one
          if (!chartVideoUrl) {
            const sceneWithChart = scenes.find(s => s.chartVideoUrl);
            if (sceneWithChart) chartVideoUrl = sceneWithChart.chartVideoUrl;
          }

          // Debug logging for video URLs


          // Debug logging for audio URL extraction


          // Debug logging for chart_video_url


          return {
            id: videoEntry?.id || videoEntry?.video_id || `video-${videoIndex}`,
            title: videoEntry?.title || videoEntry?.name || `Video ${videoIndex + 1}`,
            url: primaryVideoUrl || scenes[0]?.url || '', // This will be video_with_logo_and_subtitles_url if available
            baseVideoUrl: baseVideoUrl, // Store base_video_url from new schema (highest priority)
            base_video_url: baseVideoUrl, // Alias for compatibility
            description: videoEntry?.desc || videoEntry?.scene_description || '',
            narration: videoEntry?.narration || '',
            audioUrl: audioUrl,
            scenes,
            sceneNumber: videoEntry?.scene_number || videoEntry?.sceneNumber || videoEntry?.scene_no || null,
            model: modelUpper,
            chartVideoUrl: chartVideoUrl, // Store chart_video_url for overlay layer
            // Include full videos.v1 structure for layer processing
            videos: videoEntry?.videos || {},
          };
        })
        .filter(Boolean)
        .sort((a, b) => {
          // Sort by scene_number if available
          const aSceneNum = a.sceneNumber;
          const bSceneNum = b.sceneNumber;

          // If both have scene numbers, sort numerically
          if (aSceneNum != null && bSceneNum != null) {
            return Number(aSceneNum) - Number(bSceneNum);
          }
          // If only one has scene number, prioritize it
          if (aSceneNum != null && bSceneNum == null) return -1;
          if (aSceneNum == null && bSceneNum != null) return 1;
          // If neither has scene number, maintain original order
          return 0;
        });
    };

    /**
     * PRIORITY 1: Parse video_results from job API response
     * Transforms job API video_results format into the format expected by parseVideosPayload
     * @param {Array} videoResults - Array of video results from job API
     * @returns {Array} Transformed video entries ready for parseVideosPayload
     */
    const parseJobVideoResults = (videoResults = []) => {
      if (!Array.isArray(videoResults) || videoResults.length === 0) {
        return [];
      }

      return videoResults.map((result) => {
        // Determine which version to use (current_version or default to v1)
        const currentVersion = result.videos?.current_version || 'v1';
        const videoData = result.videos?.[currentVersion] || result.videos?.v1 || {};

        // Extract aspect ratio from video data or prompts
        const aspectRatio = videoData.aspect_ratio ||
          videoData.prompts?.aspect_ratio ||
          '16:9';

        // Build the transformed entry structure
        const transformedEntry = {
          scene_number: result.scene_number,
          sceneNumber: result.scene_number,
          model: result.model || result.mode || '',
          processing_status: result.processing_status || 'completed',
          id: result.id || `scene-${result.scene_number}`,
          title: result.title || `Scene ${result.scene_number}`,
          description: result.description || '',
          narration: result.narration || '',

          // Map videos structure with layers
          videos: {
            [currentVersion]: {
              base_video_url: videoData.base_video_url || '',
              duration: videoData.duration || '00:00:10',
              layers: Array.isArray(videoData.layers) ? videoData.layers : [],
              aspect_ratio: aspectRatio,
              prompts: videoData.prompts || {},
              has_background: videoData.prompts?.has_background !== undefined
                ? videoData.prompts.has_background
                : true,
            },
            current_version: currentVersion,
          },
        };

        // Also add v1, v2, v3, v4 if they exist in the original structure
        if (result.videos) {
          Object.keys(result.videos).forEach(key => {
            if (key !== 'current_version' && result.videos[key]) {
              transformedEntry.videos[key] = result.videos[key];
            }
          });
        }

        return transformedEntry;
      });
    };

    const load = async () => {
      try {
        setIsLoading(true); setError('');

        // Always read fresh from localStorage to ensure we have the latest session_id
        // But validate it matches currentSessionId to prevent loading wrong session
        const localStorageSessionId = localStorage.getItem('session_id');
        const session_id = localStorageSessionId;
        const user_id = localStorage.getItem('token');
        // Validate session_id matches currentSessionId (unless currentSessionId is null on first load)
        if (currentSessionId !== null && session_id !== currentSessionId) {
          console.warn('⚠️ [VIDEOS-LIST] Session ID mismatch, skipping load', {
            localStorageSessionId: session_id ? `${session_id.substring(0, 8)}...` : 'N/A',
            currentSessionId: currentSessionId ? `${currentSessionId.substring(0, 8)}...` : 'N/A'
          });
          setIsLoading(false);
          return;
        }

        if (!session_id || !user_id) {
          console.error('❌ [VIDEOS-LIST] Missing session or user', { session_id: !!session_id, user_id: !!user_id });
          setError('Missing session or user');
          setIsLoading(false);
          return;
        }

        // First read from session
        const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id, session_id })
        });
        const text = await resp.text();
        let data; try { data = JSON.parse(text); } catch (_) { data = text; }
        if (!resp.ok) {
          console.error('❌ [VIDEOS-LIST] API request failed', {
            status: resp.status,
            statusText: resp.statusText,
            response: text.substring(0, 200)
          });
          throw new Error(`user-session/data failed: ${resp.status} ${text}`);
        }

        const sdata = data?.session_data || {};
        const parsedSessionVideos = parseVideosPayload(sdata);
        // Extract aspect ratio from session data
        const sessionData = sdata || {};
        const scripts = Array.isArray(sessionData?.scripts) && sessionData.scripts.length > 0 ? sessionData.scripts : [];
        const currentScript = scripts[0] || null;
        const pickString = (val) => (typeof val === 'string' && val.trim() ? val.trim() : '');

        let extractedAspectRatio = '16:9';
        // 1) Prefer aspect_ratio from guidelines
        let fromGuidelines = '';
        if (currentScript && typeof currentScript === 'object') {
          const currentVersionKey = currentScript.current_version || currentScript.currentVersion;
          const currentVersionObj =
            (typeof currentVersionKey === 'string' && currentScript[currentVersionKey]) ||
            currentScript;
          const userQueryArr =
            (Array.isArray(currentVersionObj?.userquery) && currentVersionObj.userquery) ||
            (Array.isArray(currentVersionObj?.user_query) && currentVersionObj.user_query) ||
            [];
          const firstUserQuery = userQueryArr[0] || {};
          const guidelines = firstUserQuery?.guidelines || firstUserQuery?.guideLines || {};
          const tech = guidelines.technical_and_formal_constraints ||
            guidelines.technicalAndFormalConstraints ||
            guidelines.technical_constraints ||
            guidelines.technicalConstraints ||
            {};
          fromGuidelines =
            pickString(tech.aspect_ratio) ||
            pickString(tech.aspectRatio);
        }

        if (fromGuidelines) {
          extractedAspectRatio = fromGuidelines;
        } else {
          // 2) Fallback to script-level / session-level aspect_ratio fields
          extractedAspectRatio =
            pickString(currentScript?.aspect_ratio) ||
            pickString(currentScript?.aspectRatio) ||
            pickString(sessionData?.aspect_ratio) ||
            pickString(sessionData?.aspectRatio) ||
            '16:9';
        }

        // Normalize aspect ratio: convert underscores to colons (e.g., "9_16" -> "9:16", "16_9" -> "16:9")
        const normalizeAspectRatio = (value) => {
          if (!value || typeof value !== 'string') return value;
          return value.replace(/_/g, ':').trim();
        };

        const normalizedAspectRatio = normalizeAspectRatio(extractedAspectRatio);

        if (!cancelled) {
          setAspectRatio(normalizedAspectRatio);
        }

        if (!cancelled && parsedSessionVideos.length > 0) {
          setItems(parsedSessionVideos);

          // ============================================================
          // STEP 2A: STORE ORIGINAL BASE VIDEO URLS FROM SESSION DATA
          // ============================================================

          // Store original base video URLs for change detection
          const originalUrls = {};
          parsedSessionVideos.forEach((video, index) => {
            // Extract base video URL with priority order
            const baseVideoUrl = video.videos?.v1?.base_video_url ||
              video.videos?.base_video_url ||
              video.video?.v1?.base_video_url ||
              video.video?.base_video_url ||
              video.baseVideoUrl ||
              video.base_video_url ||
              video.url;

            const sceneNumber = video.sceneNumber || video.scene_number;
            if (sceneNumber && baseVideoUrl) {
              originalUrls[sceneNumber] = baseVideoUrl;
            } else {
              console.warn('⚠️ [SAVE-LAYERS] Skipping video - missing scene number or URL', {
                videoId: video.id,
                hasSceneNumber: !!sceneNumber,
                hasBaseVideoUrl: !!baseVideoUrl
              });
            }
          });

          originalBaseVideoUrlsRef.current = originalUrls;

          setSelectedIndex(0);

          // Expose session media to sidebar uploads - with RAW URLs (no prefix)
          if (typeof window !== 'undefined') {
            // Helper function to get logo layer data (defined outside map for reuse)
            const getLogoLayerDataForSession = (entry) => {
              if (Array.isArray(entry?.videos?.v1?.layers)) {
                const logoLayer = entry.videos.v1.layers.find(layer => layer?.name === 'logo');
                if (logoLayer) {
                  return {
                    url: logoLayer.url,
                    timing: logoLayer.timing || { start: "00:00:00", end: null },
                    position: logoLayer.position || { x: 0.9, y: 0.1 },
                    bounding_box: logoLayer.bounding_box || null,
                    size: logoLayer.size || null,
                    scale: logoLayer.scale !== undefined ? logoLayer.scale : 1,
                    opacity: logoLayer.opacity !== undefined ? logoLayer.opacity : 1,
                    rotation: logoLayer.rotation || 0,
                    style: logoLayer.style || {},
                    blend_mode: logoLayer.blend_mode || 'normal',
                    enabled: logoLayer.enabled !== undefined ? logoLayer.enabled : true,
                    animation: logoLayer.animation || { type: 'none', duration: 0.5 },
                  };
                }
              }
              return null;
            };

            window.__SESSION_MEDIA_FILES = parsedSessionVideos.map((it, idx) => {
              // Get the raw base video URL - prioritize base_video_url from new schema
              const rawBaseUrl = it.videos?.v1?.base_video_url ||
                it.videos?.base_video_url ||
                it.video?.v1?.base_video_url ||
                it.video?.base_video_url ||
                it.url ||
                it.video_url ||
                it.videos?.v1?.video_url ||
                it.videos?.video_url ||
                it.video?.v1?.video_url ||
                it.video?.video_url ||
                '';

              // Get audio URL from layers first (NEW SCHEMA - Priority 1), then fallback
              const getAudioLayerDataForSession = (entry) => {
                if (Array.isArray(entry?.videos?.v1?.layers)) {
                  const audioLayer = entry.videos.v1.layers.find(layer => layer?.name === 'audio');
                  if (audioLayer) {
                    return {
                      url: audioLayer.url,
                      timing: audioLayer.timing || { start: "00:00:00", end: null },
                      volume: audioLayer.volume !== undefined ? audioLayer.volume : 1,
                      enabled: audioLayer.enabled !== undefined ? audioLayer.enabled : true,
                    };
                  }
                }
                return null;
              };

              const audioLayerData = getAudioLayerDataForSession(it);
              const rawAudioUrl = audioLayerData?.url ||
                it.audioUrl ||
                it.audio_url ||
                it.audio_only_url ||
                it.videos?.v1?.audio_url ||
                it.videos?.v1?.audio_only_url ||
                it.videos?.audio_url ||
                it.videos?.audio_only_url ||
                it.video?.v1?.audio_url ||
                it.video?.v1?.audio_only_url ||
                it.video?.audio_url ||
                it.video?.audio_only_url ||
                '';

              // Get chart URL from layers first (NEW SCHEMA - Priority 1), then fallback
              const getChartLayerDataForSession = (entry) => {
                if (Array.isArray(entry?.videos?.v1?.layers)) {
                  const chartLayer = entry.videos.v1.layers.find(layer => layer?.name === 'chart');
                  if (chartLayer) {
                    return {
                      url: chartLayer.url,
                      position: chartLayer.position || { x: 0.5, y: 0.5 },
                      bounding_box: chartLayer.bounding_box || null,
                      scaling: chartLayer.scaling || { scale_x: 1, scale_y: 1, fit_mode: 'contain' },
                      animation: chartLayer.animation || { type: 'none', duration: 0.5 },
                      layout: chartLayer.layout || { align: 'center', verticalAlign: 'middle' },
                      opacity: chartLayer.opacity !== undefined ? chartLayer.opacity : 1,
                    };
                  }
                }
                return null;
              };

              const chartLayerDataForSession = getChartLayerDataForSession(it);
              const rawChartVideoUrl = chartLayerDataForSession?.url ||
                it.chartVideoUrl ||
                it.chart_video_url ||
                it.videos?.v1?.chart_video_url ||
                it.videos?.chart_video_url ||
                it.video?.v1?.chart_video_url ||
                it.video?.chart_video_url ||
                '';

              // Get logo layer data from layers
              const logoLayerDataForSession = getLogoLayerDataForSession(it);
              const rawLogoUrl = logoLayerDataForSession?.url || '';

              // Get subtitle layer data from layers
              const getSubtitleLayerDataForSession = (entry) => {
                if (Array.isArray(entry?.videos?.v1?.layers)) {
                  const subtitleLayer = entry.videos.v1.layers.find(layer => layer?.name === 'subtitles');
                  if (subtitleLayer) {
                    return {
                      url: subtitleLayer.url || null,
                      text: subtitleLayer.text || '',
                      timing: subtitleLayer.timing || { start: "00:00:00", end: null },
                      position: subtitleLayer.position || { x: 0.5, y: 0.85 },
                      bounding_box: subtitleLayer.bounding_box || null,
                      style: {
                        fontSize: subtitleLayer.fontSize || subtitleLayer.style?.fontSize || 24,
                        fontFamily: subtitleLayer.fontFamily || subtitleLayer.style?.fontFamily || 'Inter',
                        fontWeight: subtitleLayer.fontWeight || subtitleLayer.style?.fontWeight || '600',
                        color: subtitleLayer.fill || subtitleLayer.style?.color || subtitleLayer.style?.fill || '#FFFFFF',
                      },
                      enabled: subtitleLayer.enabled !== undefined ? subtitleLayer.enabled : true,
                    };
                  }
                }
                return null;
              };

              const subtitleLayerDataForSession = getSubtitleLayerDataForSession(it);

              return {
                id: it.id || `session-${idx}`,
                name: it.title || it.name || `Video ${idx + 1}`,
                title: it.title || it.name || `Video ${idx + 1}`,
                path: rawBaseUrl,  // Store raw base video URL - NEVER add prefix
                url: rawBaseUrl,   // Store raw base video URL - NEVER add prefix
                src: rawBaseUrl,   // Store raw base video URL - NEVER add prefix
                baseVideoUrl: rawBaseUrl, // Store raw base video URL from new schema
                base_video_url: rawBaseUrl, // Alias for compatibility
                audioUrl: rawAudioUrl, // Store raw audio URL from layers or fallback - NEVER add prefix
                audio_url: rawAudioUrl, // Alias for compatibility
                audioVolume: audioLayerData?.volume || 1, // Include volume from layer if available
                audioLayerData: audioLayerData, // Include full layer data for reference
                chartVideoUrl: rawChartVideoUrl, // Store raw chart video URL from layers or fallback - NEVER add prefix
                chart_video_url: rawChartVideoUrl, // Alias for compatibility
                chartLayerData: chartLayerDataForSession, // Include full layer data for reference
                logoUrl: rawLogoUrl, // Store raw logo URL from layers - NEVER add prefix
                logo_url: rawLogoUrl, // Alias for compatibility
                logoLayerData: logoLayerDataForSession, // Include full logo layer data for reference
                subtitleLayerData: subtitleLayerDataForSession, // Include full subtitle layer data
                subtitleUrl: subtitleLayerDataForSession?.url || null, // SRT file URL
                subtitleText: subtitleLayerDataForSession?.text || '', // Inline text
                type: 'video',
                duration: it.mediaSrcDuration || it.duration || 10,
                mediaSrcDuration: it.mediaSrcDuration || it.duration || 10,
                // Use video URL as thumbnail if no thumbnail is provided (browsers can display video frames)
                thumbnail: it.thumbnail || it.poster || rawBaseUrl || '',
                size: it.size || 0,
                _session: true, // Flag to indicate this is session media
                // Include full videos.v1 structure for layer processing
                videos: it.videos || {},
              };
            });

            // Add logo images as separate entries to Images tab
            const logoImages = [];
            parsedSessionVideos.forEach((it, idx) => {
              const logoLayerDataForSession = getLogoLayerDataForSession(it);
              if (logoLayerDataForSession && logoLayerDataForSession.enabled && logoLayerDataForSession.url) {
                const rawLogoUrl = logoLayerDataForSession.url;
                logoImages.push({
                  id: `logo-${it.id || `session-${idx}`}`,
                  name: `Logo - ${it.title || it.name || `Video ${idx + 1}`}`,
                  title: `Logo - ${it.title || it.name || `Video ${idx + 1}`}`,
                  path: rawLogoUrl,  // Store raw logo URL - NEVER add prefix
                  url: rawLogoUrl,   // Store raw logo URL - NEVER add prefix
                  src: rawLogoUrl,    // Store raw logo URL - NEVER add prefix
                  logoUrl: rawLogoUrl,
                  logo_url: rawLogoUrl,
                  logoLayerData: logoLayerDataForSession,
                  type: 'image',
                  duration: 0,
                  mediaSrcDuration: 0,
                  thumbnail: rawLogoUrl,
                  size: 0,
                  _session: true,
                  _isLogo: true, // Flag to indicate this is a logo image
                  _parentVideoId: it.id || `session-${idx}`, // Reference to parent video
                });
              }
            });

            // Add chart/overlay videos as separate entries to Videos tab
            const chartVideos = [];
            parsedSessionVideos.forEach((it, idx) => {
              // Helper function to get chart layer data
              const getChartLayerDataForSession = (entry) => {
                if (Array.isArray(entry?.videos?.v1?.layers)) {
                  const chartLayer = entry.videos.v1.layers.find(layer => layer?.name === 'chart');
                  if (chartLayer) {
                    return {
                      url: chartLayer.url,
                      position: chartLayer.position || { x: 0.5, y: 0.5 },
                      bounding_box: chartLayer.bounding_box || null,
                      scaling: chartLayer.scaling || { scale_x: 1, scale_y: 1, fit_mode: 'contain' },
                      animation: chartLayer.animation || { type: 'none', duration: 0.5 },
                      layout: chartLayer.layout || { align: 'center', verticalAlign: 'middle' },
                      opacity: chartLayer.opacity !== undefined ? chartLayer.opacity : 1,
                    };
                  }
                }
                return null;
              };

              const chartLayerDataForSession = getChartLayerDataForSession(it);
              if (chartLayerDataForSession && chartLayerDataForSession.url) {
                const rawChartVideoUrl = chartLayerDataForSession.url;
                // Only add if it's a video file (check extension or URL pattern)
                const isVideoFile = rawChartVideoUrl.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)(\?|$)/i);
                if (isVideoFile) {
                  chartVideos.push({
                    id: `chart-${it.id || `session-${idx}`}`,
                    name: `Chart - ${it.title || it.name || `Video ${idx + 1}`}`,
                    title: `Chart - ${it.title || it.name || `Video ${idx + 1}`}`,
                    path: rawChartVideoUrl,  // Store raw chart video URL - NEVER add prefix
                    url: rawChartVideoUrl,   // Store raw chart video URL - NEVER add prefix
                    src: rawChartVideoUrl,    // Store raw chart video URL - NEVER add prefix
                    chartVideoUrl: rawChartVideoUrl,
                    chart_video_url: rawChartVideoUrl,
                    chartLayerData: chartLayerDataForSession,
                    type: 'video', // Chart videos should appear in Videos tab
                    duration: it.mediaSrcDuration || it.duration || 10,
                    mediaSrcDuration: it.mediaSrcDuration || it.duration || 10,
                    thumbnail: rawChartVideoUrl || it.thumbnail || '',
                    size: it.size || 0,
                    _session: true,
                    _isChartVideo: true, // Flag to indicate this is a chart video
                    _parentVideoId: it.id || `session-${idx}`, // Reference to parent video
                  });
                }
              }
            });

            // Extract images from session data and add them to session media
            const sessionImages = [];
            const sessionDataImages = Array.isArray(sdata?.images) ? sdata.images : [];
            sessionDataImages.forEach((img, idx) => {
              // Handle different image formats from session data
              const imageUrl = typeof img === 'string'
                ? img
                : (img?.image_url || img?.imageUrl || img?.url || img?.src || img?.ref_image?.[0] || '');

              if (!imageUrl) return;

              // Extract image frames if available
              const imageFrames = Array.isArray(img?.imageFrames) ? img.imageFrames : [];
              const firstFrame = imageFrames[0] || {};
              const frameImageUrl = firstFrame?.image_url || firstFrame?.url || firstFrame?.src || imageUrl;

              sessionImages.push({
                id: `session-img-${idx}`,
                name: img?.scene_title || img?.title || `Session Image ${idx + 1}`,
                title: img?.scene_title || img?.title || `Session Image ${idx + 1}`,
                path: frameImageUrl,  // Store raw image URL - NEVER add prefix
                url: frameImageUrl,   // Store raw image URL - NEVER add prefix
                src: frameImageUrl,    // Store raw image URL - NEVER add prefix
                type: 'image',
                duration: 0,
                mediaSrcDuration: 0,
                thumbnail: frameImageUrl,
                size: 0,
                _session: true,
                _isSessionImage: true, // Flag to indicate this is a session image
                sceneNumber: img?.scene_number || img?.sceneNumber || (idx + 1),
              });
            });

            // Combine video entries with logo image entries, chart video entries, and session images
            window.__SESSION_MEDIA_FILES = [...window.__SESSION_MEDIA_FILES, ...logoImages, ...chartVideos, ...sessionImages];

            // Trigger timeline rebuild by updating sessionMediaVersion
            setSessionMediaVersion(prev => prev + 1);
          }

          // Log the session videos resolved for the timeline (url + title)
          const videoSummaries = parsedSessionVideos.map((v, idx) => ({
            index: idx,
            id: v.id,
            title: v.title,
            url: v.url,
            scenes: v.scenes?.length || 0
          }));

          // AUTO-ADD ALL VIDEOS TO TIMELINE AFTER API SUCCESS
          // This will be handled by the useEffect that watches items
        } else if (!cancelled) {
          // Clear session media if no videos
          if (typeof window !== 'undefined') {
            window.__SESSION_MEDIA_FILES = [];
          }
        }

        // Fetch generated base videos from user API for upload section video tab
        if (!cancelled) {
          const fetchGeneratedBaseVideos = async () => {
            try {
              const user_id = localStorage.getItem('token');
              if (!user_id) {
                return;
              }
              const response = await fetch(
                `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/user/${user_id}/generated-base-videos`,
                {
                  method: 'GET',
                  headers: {
                    'Content-Type': 'application/json',
                  }
                }
              );

              if (!response.ok) {
                console.warn('⚠️ [GENERATED-VIDEOS] Failed to fetch generated base videos', {
                  status: response.status,
                  statusText: response.statusText
                });
                return;
              }

              const responseText = await response.text();
              let responseData;
              try {
                responseData = JSON.parse(responseText);
              } catch (e) {
                console.warn('⚠️ [GENERATED-VIDEOS] Failed to parse response', { responseText });
                return;
              }

              // Get current aspect ratio (normalize format: 16:9, 9:16, 1:1)
              const currentAspectRatio = aspectRatio || '16:9';
              const normalizedAspectRatio = currentAspectRatio.replace(/\//g, ':'); // Convert 16/9 to 16:9 if needed
              // Normalize and sort base videos
              const { normalizeGeneratedBaseVideosResponse } = await import('../../utils/generatedMediaUtils');
              const normalized = normalizeGeneratedBaseVideosResponse(responseData);
              const baseVideosData = normalized.base_videos || {};

              // Extract videos based on aspect ratio structure
              // Normalized structure: { base_videos: { "16:9": { "Session Name": ["url1", "url2"] }, ... } }
              let videos = [];

              if (baseVideosData && typeof baseVideosData === 'object') {
                // Get sessions for current aspect ratio
                const sessionsForRatio = baseVideosData[normalizedAspectRatio];

                if (sessionsForRatio && typeof sessionsForRatio === 'object' && !Array.isArray(sessionsForRatio)) {
                  // Iterate through sessions and collect all videos
                  Object.entries(sessionsForRatio).forEach(([sessionName, sessionVideos]) => {
                    if (Array.isArray(sessionVideos)) {
                      sessionVideos.forEach((videoUrl, idx) => {
                        if (typeof videoUrl === 'string') {
                          videos.push({
                            url: videoUrl,
                            base_video_url: videoUrl,
                            video_url: videoUrl,
                            id: `generated-${normalizedAspectRatio}-${sessionName}-${idx}`,
                            title: `${sessionName} - Video ${idx + 1}`
                          });
                        } else if (videoUrl && typeof videoUrl === 'object') {
                          videos.push(videoUrl);
                        }
                      });
                    }
                  });
                } else if (Array.isArray(sessionsForRatio)) {
                  // Legacy format: array directly
                  videos = sessionsForRatio.map((url, idx) => {
                    if (typeof url === 'string') {
                      return {
                        url: url,
                        base_video_url: url,
                        video_url: url,
                        id: `generated-${normalizedAspectRatio}-${idx}`,
                        title: `Generated Video ${idx + 1} (${normalizedAspectRatio})`
                      };
                    }
                    return url;
                  });
                }
              } else {
                // No videos found for this aspect ratio
                videos = [];
              }

              if (videos.length > 0 && typeof window !== 'undefined') {
                // Convert API response to format compatible with upload panel
                const generatedVideos = videos.map((video, idx) => {
                  // Handle both string URLs and object formats
                  let videoUrl;
                  let videoId;
                  let videoTitle;

                  if (typeof video === 'string') {
                    // If video is just a URL string
                    videoUrl = video;
                    videoId = `generated-${normalizedAspectRatio}-${idx}`;
                    videoTitle = `Generated Video ${idx + 1} (${normalizedAspectRatio})`;
                  } else {
                    // If video is an object
                    videoUrl = video.base_video_url ||
                      video.video_url ||
                      video.url ||
                      video.videos?.v1?.base_video_url ||
                      video.videos?.base_video_url ||
                      '';
                    videoId = video.id || video.video_id || `generated-${normalizedAspectRatio}-${idx}`;
                    videoTitle = video.title || video.name || `Generated Video ${idx + 1} (${normalizedAspectRatio})`;
                  }

                  if (!videoUrl) {
                    console.warn('⚠️ [GENERATED-VIDEOS] Video missing URL, skipping', {
                      videoId: videoId,
                      videoTitle: videoTitle
                    });
                    return null;
                  }

                  return {
                    id: videoId,
                    name: videoTitle,
                    title: videoTitle,
                    path: videoUrl,
                    url: videoUrl,
                    src: videoUrl,
                    baseVideoUrl: videoUrl,
                    base_video_url: videoUrl,
                    type: 'video',
                    duration: (typeof video === 'object' ? video.duration : null) || 10,
                    mediaSrcDuration: (typeof video === 'object' ? (video.duration || video.mediaSrcDuration) : null) || 10,
                    thumbnail: (typeof video === 'object' ? (video.thumbnail || video.thumbnail_url) : null) || videoUrl,
                    size: (typeof video === 'object' ? video.size : null) || 0,
                    aspectRatio: normalizedAspectRatio, // Store aspect ratio for reference
                    _generated: true, // Flag to indicate this is from generated base videos API
                    _session: false,
                    created_at: (typeof video === 'object' ? (video.created_at || video.createdAt) : null) || new Date().toISOString(),
                    // Include full video structure if available
                    videos: (typeof video === 'object' ? video.videos : null) || {},
                  };
                }).filter(v => v !== null); // Remove null entries

                if (generatedVideos.length > 0) {
                  // Add generated videos to upload panel
                  if (!window.__SESSION_MEDIA_FILES) {
                    window.__SESSION_MEDIA_FILES = [];
                  }

                  // Check for duplicates by URL before adding
                  const existingUrls = new Set(
                    window.__SESSION_MEDIA_FILES.map(f => f.url || f.path || f.src).filter(Boolean)
                  );

                  const newVideos = generatedVideos.filter(v => !existingUrls.has(v.url));

                  if (newVideos.length > 0) {
                    window.__SESSION_MEDIA_FILES = [...window.__SESSION_MEDIA_FILES, ...newVideos];
                    // Trigger timeline rebuild
                    setSessionMediaVersion(prev => prev + 1);
                  } else {
                  }
                }
              }
            } catch (error) {
              console.error('❌ [GENERATED-VIDEOS] Error fetching generated base videos', {
                error: error.message,
                stack: error.stack
              });
            }
          };

          // Fetch generated videos (don't await to avoid blocking)
          fetchGeneratedBaseVideos();
        }

        // If we have a jobId, always poll job API until status is "succeeded" or "failed"
        const id = jobId;
        console.log('Video job ID:', id);
        const shouldPollJob = !!id;
        if (!shouldPollJob) {
          setIsLoading(false);
          setShowVideoLoader(false);
          if (!cancelled && parsedSessionVideos.length > 0) {
            setStatus('succeeded');
          }
          return;
        }

        // Always show loader when we have a jobId to poll
        setIsLoading(true);
        setShowVideoLoader(true);
        setJobProgress({ percent: 0, phase: 'queued' });
        setStatus('queued');

        const poll = async () => {
          try {
            console.log('Calling video-job-status for job_id:', id);
            const jresp = await fetch(
              `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/video-job-status/${encodeURIComponent(id)}`
            );
            const jtext = await jresp.text();
            let jdata; try { jdata = JSON.parse(jtext); } catch (_) { jdata = jtext; }
            if (!jresp.ok) throw new Error(`job status failed: ${jresp.status} ${jtext}`);
            const progress = jdata?.progress || {};
            const percent = Number(progress?.percent) || 0;
            const phase = String(progress?.phase || progress?.stage || '').toLowerCase();
            // Get status from response - check status field first, then phase
            const responseStatus = String(jdata?.status || '').toLowerCase().trim();
            const phaseStatus = String(phase || '').toLowerCase().trim();
            // Also check if progress indicates completion
            const isProgressComplete = percent >= 100 && (phase === 'done' || phase === 'completed' || phase === 'succeeded');
            // Prioritize status field from API response
            const finalStatus = responseStatus || phaseStatus || 'queued';



            if (!cancelled) {
              setJobProgress({ percent, phase });
              setStatus(finalStatus);
              // Keep loader visible while polling
              setIsLoading(true);
              setShowVideoLoader(true);
            }

            // Check if percent is 100% - start session data polling
            const isPercentComplete = percent >= 100;

            // Check if job is complete: percent >= 100 AND (phase === "done" OR status === "succeeded")
            const isJobComplete = isPercentComplete && (
              phase === 'done' ||
              phase === 'completed' ||
              responseStatus === 'succeeded' ||
              responseStatus === 'completed'
            );

            if (isJobComplete && onJobPhaseDone) {
              onJobPhaseDone();
            }

            // Check if status is "succeeded" or "failed" - only then stop polling
            // Also check if progress indicates completion
            const isCompleted = finalStatus === 'succeeded' ||
              finalStatus === 'failed' ||
              finalStatus === 'error' ||
              finalStatus === 'completed';

            if (!cancelled && !isCompleted && !isPercentComplete) {
              // Continue polling if not succeeded, failed, or 100% - keep loader visible
              setIsLoading(true);
              setShowVideoLoader(true);
              timeoutId = setTimeout(poll, 3000);
            } else {
              // Job is complete (succeeded, failed, or 100%) - fetch video results and layers
              if (!cancelled) {

                if (finalStatus === 'failed' || finalStatus === 'error') {
                  // If failed, hide loader and show error
                  setIsLoading(false);
                  setShowVideoLoader(false);
                  setError('Video generation failed. Please try again.');
                  return;
                }

                // PRIORITY 1: Fetch video_results from job API response when job is complete
                if (!jobVideoResultsFetchedRef.current && jdata && isJobComplete) {
                  jobVideoResultsFetchedRef.current = true; // Mark as fetched to prevent duplicate calls

                  // Debug logging for job API response
                  // PRIORITY 1: Check for video_results (plural) in job response
                  const videoResults = jdata?.video_results || jdata?.videoResults;

                  // FALLBACK: Also check for legacy video_result (singular) for backward compatibility
                  const videoResult = jdata?.video_result || jdata?.videoResult || jdata?.result || jdata?.result_data;

                  // PRIORITY 1: Process video_results (new format) if available
                  if (videoResults && Array.isArray(videoResults) && videoResults.length > 0) {
                    try {
                      // Keep loader visible during processing
                      setIsLoading(true);
                      setShowVideoLoader(true);
                      setJobProgress({ percent: 100, phase: 'processing' });

                      // Transform job API video_results format
                      const jobVideosRaw = parseJobVideoResults(videoResults);

                      if (jobVideosRaw.length > 0) {
                        // Create a payload structure for parseVideosPayload
                        const jobPayload = {
                          videos: jobVideosRaw
                        };

                        // Parse videos from job API response
                        const jobVideos = parseVideosPayload(jobPayload);

                        if (!cancelled && jobVideos.length > 0) {
                          // Set items from job API results
                          setItems(jobVideos);

                          // ============================================================
                          // STEP 2B: STORE ORIGINAL BASE VIDEO URLS FROM JOB RESULTS
                          // ============================================================

                          // Store original base video URLs for change detection (from job results)
                          const originalUrlsFromJob = {};
                          jobVideos.forEach((video, index) => {
                            // Extract base video URL with priority order
                            const baseVideoUrl = video.videos?.v1?.base_video_url ||
                              video.videos?.base_video_url ||
                              video.video?.v1?.base_video_url ||
                              video.video?.base_video_url ||
                              video.baseVideoUrl ||
                              video.base_video_url ||
                              video.url;

                            const sceneNumber = video.sceneNumber || video.scene_number;
                            if (sceneNumber && baseVideoUrl) {
                              originalUrlsFromJob[sceneNumber] = baseVideoUrl;
                            } else {
                              console.warn('⚠️ [SAVE-LAYERS] Skipping job video - missing scene number or URL', {
                                videoId: video.id,
                                hasSceneNumber: !!sceneNumber,
                                hasBaseVideoUrl: !!baseVideoUrl
                              });
                            }
                          });

                          originalBaseVideoUrlsRef.current = originalUrlsFromJob;

                          setSelectedIndex(0);

                          // Extract aspect ratio from first video if available
                          const firstVideoAspectRatio = jobVideos[0]?.videos?.v1?.aspect_ratio ||
                            jobVideos[0]?.videos?.v1?.prompts?.aspect_ratio;
                          if (firstVideoAspectRatio && !cancelled) {
                            // Normalize aspect ratio: convert underscores to colons
                            const normalizeAspectRatio = (value) => {
                              if (!value || typeof value !== 'string') return value;
                              return value.replace(/_/g, ':').trim();
                            };
                            setAspectRatio(normalizeAspectRatio(firstVideoAspectRatio));
                          }

                          // Expose job media to sidebar uploads - with RAW URLs (no prefix)
                          if (typeof window !== 'undefined') {
                            // Helper function to get logo layer data (defined outside map for reuse)
                            const getLogoLayerDataForJob = (entry) => {
                              if (Array.isArray(entry?.videos?.v1?.layers)) {
                                const logoLayer = entry.videos.v1.layers.find(layer => layer?.name === 'logo');
                                if (logoLayer) {
                                  return {
                                    url: logoLayer.url,
                                    timing: logoLayer.timing || { start: "00:00:00", end: null },
                                    position: logoLayer.position || { x: 0.9, y: 0.1 },
                                    bounding_box: logoLayer.bounding_box || null,
                                    size: logoLayer.size || null,
                                    scale: logoLayer.scale !== undefined ? logoLayer.scale : 1,
                                    opacity: logoLayer.opacity !== undefined ? logoLayer.opacity : 1,
                                    rotation: logoLayer.rotation || 0,
                                    style: logoLayer.style || {},
                                    blend_mode: logoLayer.blend_mode || 'normal',
                                    enabled: logoLayer.enabled !== undefined ? logoLayer.enabled : true,
                                    animation: logoLayer.animation || { type: 'none', duration: 0.5 },
                                  };
                                }
                              }
                              return null;
                            };

                            window.__SESSION_MEDIA_FILES = jobVideos.map((it, idx) => {
                              // Get the raw base video URL - prioritize base_video_url from new schema
                              const rawBaseUrl = it.videos?.v1?.base_video_url ||
                                it.videos?.base_video_url ||
                                it.video?.v1?.base_video_url ||
                                it.video?.base_video_url ||
                                it.url ||
                                it.video_url ||
                                it.videos?.v1?.video_url ||
                                it.videos?.video_url ||
                                it.video?.v1?.video_url ||
                                it.video?.video_url ||
                                '';

                              // Get audio URL from layers first (NEW SCHEMA - Priority 1), then fallback
                              const getAudioLayerDataForJob = (entry) => {
                                if (Array.isArray(entry?.videos?.v1?.layers)) {
                                  const audioLayer = entry.videos.v1.layers.find(layer => layer?.name === 'audio');
                                  if (audioLayer) {
                                    return {
                                      url: audioLayer.url,
                                      timing: audioLayer.timing || { start: "00:00:00", end: null },
                                      volume: audioLayer.volume !== undefined ? audioLayer.volume : 1,
                                      enabled: audioLayer.enabled !== undefined ? audioLayer.enabled : true,
                                    };
                                  }
                                }
                                return null;
                              };

                              const audioLayerData = getAudioLayerDataForJob(it);
                              const rawAudioUrl = audioLayerData?.url ||
                                it.audioUrl ||
                                it.audio_url ||
                                it.audio_only_url ||
                                it.videos?.v1?.audio_url ||
                                it.videos?.v1?.audio_only_url ||
                                it.videos?.audio_url ||
                                it.videos?.audio_only_url ||
                                it.video?.v1?.audio_url ||
                                it.video?.v1?.audio_only_url ||
                                it.video?.audio_url ||
                                it.video?.audio_only_url ||
                                '';

                              // Get chart URL from layers first (NEW SCHEMA - Priority 1), then fallback
                              const getChartLayerDataForJob = (entry) => {
                                if (Array.isArray(entry?.videos?.v1?.layers)) {
                                  const chartLayer = entry.videos.v1.layers.find(layer => layer?.name === 'chart');
                                  if (chartLayer) {
                                    return {
                                      url: chartLayer.url,
                                      position: chartLayer.position || { x: 0.5, y: 0.5 },
                                      bounding_box: chartLayer.bounding_box || null,
                                      scaling: chartLayer.scaling || { scale_x: 1, scale_y: 1, fit_mode: 'contain' },
                                      animation: chartLayer.animation || { type: 'none', duration: 0.5 },
                                      layout: chartLayer.layout || { align: 'center', verticalAlign: 'middle' },
                                      opacity: chartLayer.opacity !== undefined ? chartLayer.opacity : 1,
                                    };
                                  }
                                }
                                return null;
                              };

                              const chartLayerDataForJob = getChartLayerDataForJob(it);
                              const rawChartVideoUrl = chartLayerDataForJob?.url ||
                                it.chartVideoUrl ||
                                it.chart_video_url ||
                                it.videos?.v1?.chart_video_url ||
                                it.videos?.chart_video_url ||
                                it.video?.v1?.chart_video_url ||
                                it.video?.chart_video_url ||
                                '';

                              // Get logo layer data from layers
                              const logoLayerDataForJob = getLogoLayerDataForJob(it);
                              const rawLogoUrl = logoLayerDataForJob?.url || '';

                              // Get subtitle layer data from layers
                              const getSubtitleLayerDataForJob = (entry) => {
                                if (Array.isArray(entry?.videos?.v1?.layers)) {
                                  const subtitleLayer = entry.videos.v1.layers.find(layer => layer?.name === 'subtitles');
                                  if (subtitleLayer) {
                                    return {
                                      url: subtitleLayer.url || null,
                                      text: subtitleLayer.text || '',
                                      timing: subtitleLayer.timing || { start: "00:00:00", end: null },
                                      position: subtitleLayer.position || { x: 0.5, y: 0.85 },
                                      bounding_box: subtitleLayer.bounding_box || null,
                                      style: {
                                        fontSize: subtitleLayer.fontSize || subtitleLayer.style?.fontSize || 24,
                                        fontFamily: subtitleLayer.fontFamily || subtitleLayer.style?.fontFamily || 'Inter',
                                        fontWeight: subtitleLayer.fontWeight || subtitleLayer.style?.fontWeight || '600',
                                        color: subtitleLayer.fill || subtitleLayer.style?.color || subtitleLayer.style?.fill || '#FFFFFF',
                                      },
                                      enabled: subtitleLayer.enabled !== undefined ? subtitleLayer.enabled : true,
                                    };
                                  }
                                }
                                return null;
                              };

                              const subtitleLayerDataForJob = getSubtitleLayerDataForJob(it);

                              return {
                                id: it.id || `job-${idx}`,
                                name: it.title || it.name || `Video ${idx + 1}`,
                                title: it.title || it.name || `Video ${idx + 1}`,
                                path: rawBaseUrl,  // Store raw base video URL - NEVER add prefix
                                url: rawBaseUrl,   // Store raw base video URL - NEVER add prefix
                                src: rawBaseUrl,   // Store raw base video URL - NEVER add prefix
                                baseVideoUrl: rawBaseUrl, // Store raw base video URL from new schema
                                base_video_url: rawBaseUrl, // Alias for compatibility
                                audioUrl: rawAudioUrl, // Store raw audio URL from layers or fallback - NEVER add prefix
                                audio_url: rawAudioUrl, // Alias for compatibility
                                audioVolume: audioLayerData?.volume || 1, // Include volume from layer if available
                                audioLayerData: audioLayerData, // Include full layer data for reference
                                chartVideoUrl: rawChartVideoUrl, // Store raw chart video URL from layers or fallback - NEVER add prefix
                                chart_video_url: rawChartVideoUrl, // Alias for compatibility
                                chartLayerData: chartLayerDataForJob, // Include full layer data for reference
                                logoUrl: rawLogoUrl, // Store raw logo URL from layers - NEVER add prefix
                                logo_url: rawLogoUrl, // Alias for compatibility
                                logoLayerData: logoLayerDataForJob, // Include full logo layer data for reference
                                subtitleLayerData: subtitleLayerDataForJob, // Include full subtitle layer data
                                subtitleUrl: subtitleLayerDataForJob?.url || null, // SRT file URL
                                subtitleText: subtitleLayerDataForJob?.text || '', // Inline text
                                type: 'video',
                                duration: it.mediaSrcDuration || it.duration || 10,
                                mediaSrcDuration: it.mediaSrcDuration || it.duration || 10,
                                thumbnail: it.thumbnail || rawBaseUrl || '',
                                size: it.size || 0,
                                _session: true, // Flag to indicate this is session media
                                // Include full videos.v1 structure for layer processing
                                videos: it.videos || {},
                              };
                            });

                            // Add logo images as separate entries to upload section (same as base video)
                            const logoImages = [];
                            jobVideos.forEach((it, idx) => {
                              const logoLayerDataForJob = getLogoLayerDataForJob(it);
                              if (logoLayerDataForJob && logoLayerDataForJob.enabled && logoLayerDataForJob.url) {
                                const rawLogoUrl = logoLayerDataForJob.url;
                                logoImages.push({
                                  id: `logo-${it.id || `job-${idx}`}`,
                                  name: `Logo - ${it.title || it.name || `Video ${idx + 1}`}`,
                                  title: `Logo - ${it.title || it.name || `Video ${idx + 1}`}`,
                                  path: rawLogoUrl,  // Store raw logo URL - NEVER add prefix
                                  url: rawLogoUrl,   // Store raw logo URL - NEVER add prefix
                                  src: rawLogoUrl,    // Store raw logo URL - NEVER add prefix
                                  logoUrl: rawLogoUrl,
                                  logo_url: rawLogoUrl,
                                  logoLayerData: logoLayerDataForJob,
                                  type: 'image',
                                  duration: 0,
                                  mediaSrcDuration: 0,
                                  thumbnail: rawLogoUrl,
                                  size: 0,
                                  _session: true,
                                  _isLogo: true, // Flag to indicate this is a logo image
                                  _parentVideoId: it.id || `job-${idx}`, // Reference to parent video
                                });
                              }
                            });

                            // Combine video entries with logo image entries
                            window.__SESSION_MEDIA_FILES = [...window.__SESSION_MEDIA_FILES, ...logoImages];

                            // Trigger timeline rebuild by updating sessionMediaVersion
                            setSessionMediaVersion(prev => prev + 1);
                          }

                          setStatus('succeeded');
                          // Hide loader after successful load
                          setIsLoading(false);
                          setShowVideoLoader(false);
                          return; // Exit early since we got videos from job API
                        } else {
                        }
                      } else {
                      }
                    } catch (jobResultError) {
                      console.error('❌ JOB API: Error processing video_results:', jobResultError);
                      // Continue to fallback session data refresh
                    }
                  }

                  // FALLBACK: Process legacy video_result (singular) for backward compatibility
                  if (videoResult && !videoResults) {
                    try {
                      // Keep loader visible during processing
                      setIsLoading(true);
                      setShowVideoLoader(true);
                      setJobProgress({ percent: 100, phase: 'processing' });

                      // Process video_result - it might be an array of videos or an object with videos array
                      let videosToProcess = [];

                      if (Array.isArray(videoResult)) {
                        // If video_result is directly an array
                        videosToProcess = videoResult;
                      } else if (Array.isArray(videoResult?.videos)) {
                        // If video_result has a videos array
                        videosToProcess = videoResult.videos;
                      } else if (videoResult?.videos && typeof videoResult.videos === 'object') {
                        // If videos is an object, try to extract array from it
                        videosToProcess = Object.values(videoResult.videos).filter(v => v && typeof v === 'object');
                      } else if (videoResult && typeof videoResult === 'object') {
                        // If video_result is a single video object, wrap it in array
                        videosToProcess = [videoResult];
                      }

                      if (videosToProcess.length > 0) {
                        // Create a payload structure similar to session_data for parseVideosPayload
                        const jobPayload = {
                          videos: videosToProcess
                        };

                        // Parse videos from job API response
                        const jobVideos = parseVideosPayload(jobPayload);

                        if (!cancelled && jobVideos.length > 0) {
                          // Set items from job API results
                          setItems(jobVideos);

                          // ============================================================
                          // STEP 2B: STORE ORIGINAL BASE VIDEO URLS FROM JOB RESULTS (LEGACY)
                          // ============================================================

                          // Store original base video URLs for change detection (from job results - legacy)
                          const originalUrlsFromJob = {};
                          jobVideos.forEach((video, index) => {
                            // Extract base video URL with priority order
                            const baseVideoUrl = video.videos?.v1?.base_video_url ||
                              video.videos?.base_video_url ||
                              video.video?.v1?.base_video_url ||
                              video.video?.base_video_url ||
                              video.baseVideoUrl ||
                              video.base_video_url ||
                              video.url;

                            const sceneNumber = video.sceneNumber || video.scene_number;
                            if (sceneNumber && baseVideoUrl) {
                              originalUrlsFromJob[sceneNumber] = baseVideoUrl;
                            } else {
                              console.warn('⚠️ [SAVE-LAYERS] Skipping job video - missing scene number or URL (legacy)', {
                                videoId: video.id,
                                hasSceneNumber: !!sceneNumber,
                                hasBaseVideoUrl: !!baseVideoUrl
                              });
                            }
                          });

                          originalBaseVideoUrlsRef.current = originalUrlsFromJob;

                          setSelectedIndex(0);

                          // Expose job media to sidebar uploads - with RAW URLs (no prefix)
                          if (typeof window !== 'undefined') {
                            // Helper function to get logo layer data (defined outside map for reuse)
                            const getLogoLayerDataForJob = (entry) => {
                              if (Array.isArray(entry?.videos?.v1?.layers)) {
                                const logoLayer = entry.videos.v1.layers.find(layer => layer?.name === 'logo');
                                if (logoLayer) {
                                  return {
                                    url: logoLayer.url,
                                    timing: logoLayer.timing || { start: "00:00:00", end: null },
                                    position: logoLayer.position || { x: 0.9, y: 0.1 },
                                    bounding_box: logoLayer.bounding_box || null,
                                    size: logoLayer.size || null,
                                    scale: logoLayer.scale !== undefined ? logoLayer.scale : 1,
                                    opacity: logoLayer.opacity !== undefined ? logoLayer.opacity : 1,
                                    rotation: logoLayer.rotation || 0,
                                    style: logoLayer.style || {},
                                    blend_mode: logoLayer.blend_mode || 'normal',
                                    enabled: logoLayer.enabled !== undefined ? logoLayer.enabled : true,
                                    animation: logoLayer.animation || { type: 'none', duration: 0.5 },
                                  };
                                }
                              }
                              return null;
                            };

                            window.__SESSION_MEDIA_FILES = jobVideos.map((it, idx) => {
                              // Get the raw base video URL - prioritize base_video_url from new schema
                              const rawBaseUrl = it.videos?.v1?.base_video_url ||
                                it.videos?.base_video_url ||
                                it.video?.v1?.base_video_url ||
                                it.video?.base_video_url ||
                                it.url ||
                                it.video_url ||
                                it.videos?.v1?.video_url ||
                                it.videos?.video_url ||
                                it.video?.v1?.video_url ||
                                it.video?.video_url ||
                                '';

                              // Get audio URL from layers first (NEW SCHEMA - Priority 1), then fallback
                              const getAudioLayerDataForJob = (entry) => {
                                if (Array.isArray(entry?.videos?.v1?.layers)) {
                                  const audioLayer = entry.videos.v1.layers.find(layer => layer?.name === 'audio');
                                  if (audioLayer) {
                                    return {
                                      url: audioLayer.url,
                                      timing: audioLayer.timing || { start: "00:00:00", end: null },
                                      volume: audioLayer.volume !== undefined ? audioLayer.volume : 1,
                                      enabled: audioLayer.enabled !== undefined ? audioLayer.enabled : true,
                                    };
                                  }
                                }
                                return null;
                              };

                              const audioLayerData = getAudioLayerDataForJob(it);
                              const rawAudioUrl = audioLayerData?.url ||
                                it.audioUrl ||
                                it.audio_url ||
                                it.audio_only_url ||
                                it.videos?.v1?.audio_url ||
                                it.videos?.v1?.audio_only_url ||
                                it.videos?.audio_url ||
                                it.videos?.audio_only_url ||
                                it.video?.v1?.audio_url ||
                                it.video?.v1?.audio_only_url ||
                                it.video?.audio_url ||
                                it.video?.audio_only_url ||
                                '';

                              // Get chart URL from layers first (NEW SCHEMA - Priority 1), then fallback
                              const getChartLayerDataForJob = (entry) => {
                                if (Array.isArray(entry?.videos?.v1?.layers)) {
                                  const chartLayer = entry.videos.v1.layers.find(layer => layer?.name === 'chart');
                                  if (chartLayer) {
                                    return {
                                      url: chartLayer.url,
                                      position: chartLayer.position || { x: 0.5, y: 0.5 },
                                      bounding_box: chartLayer.bounding_box || null,
                                      scaling: chartLayer.scaling || { scale_x: 1, scale_y: 1, fit_mode: 'contain' },
                                      animation: chartLayer.animation || { type: 'none', duration: 0.5 },
                                      layout: chartLayer.layout || { align: 'center', verticalAlign: 'middle' },
                                      opacity: chartLayer.opacity !== undefined ? chartLayer.opacity : 1,
                                    };
                                  }
                                }
                                return null;
                              };

                              const chartLayerDataForJob = getChartLayerDataForJob(it);
                              const rawChartVideoUrl = chartLayerDataForJob?.url ||
                                it.chartVideoUrl ||
                                it.chart_video_url ||
                                it.videos?.v1?.chart_video_url ||
                                it.videos?.chart_video_url ||
                                it.video?.v1?.chart_video_url ||
                                it.video?.chart_video_url ||
                                '';

                              // Get logo layer data from layers
                              const logoLayerDataForJob = getLogoLayerDataForJob(it);
                              const rawLogoUrl = logoLayerDataForJob?.url || '';

                              // Get subtitle layer data from layers
                              const getSubtitleLayerDataForJob = (entry) => {
                                if (Array.isArray(entry?.videos?.v1?.layers)) {
                                  const subtitleLayer = entry.videos.v1.layers.find(layer => layer?.name === 'subtitles');
                                  if (subtitleLayer) {
                                    return {
                                      url: subtitleLayer.url || null,
                                      text: subtitleLayer.text || '',
                                      timing: subtitleLayer.timing || { start: "00:00:00", end: null },
                                      position: subtitleLayer.position || { x: 0.5, y: 0.85 },
                                      bounding_box: subtitleLayer.bounding_box || null,
                                      style: {
                                        fontSize: subtitleLayer.fontSize || subtitleLayer.style?.fontSize || 24,
                                        fontFamily: subtitleLayer.fontFamily || subtitleLayer.style?.fontFamily || 'Inter',
                                        fontWeight: subtitleLayer.fontWeight || subtitleLayer.style?.fontWeight || '600',
                                        color: subtitleLayer.fill || subtitleLayer.style?.color || subtitleLayer.style?.fill || '#FFFFFF',
                                      },
                                      enabled: subtitleLayer.enabled !== undefined ? subtitleLayer.enabled : true,
                                    };
                                  }
                                }
                                return null;
                              };

                              const subtitleLayerDataForJob = getSubtitleLayerDataForJob(it);

                              return {
                                id: it.id || `job-${idx}`,
                                name: it.title || it.name || `Video ${idx + 1}`,
                                title: it.title || it.name || `Video ${idx + 1}`,
                                path: rawBaseUrl,  // Store raw base video URL - NEVER add prefix
                                url: rawBaseUrl,   // Store raw base video URL - NEVER add prefix
                                src: rawBaseUrl,   // Store raw base video URL - NEVER add prefix
                                baseVideoUrl: rawBaseUrl, // Store raw base video URL from new schema
                                base_video_url: rawBaseUrl, // Alias for compatibility
                                audioUrl: rawAudioUrl, // Store raw audio URL from layers or fallback - NEVER add prefix
                                audio_url: rawAudioUrl, // Alias for compatibility
                                audioVolume: audioLayerData?.volume || 1, // Include volume from layer if available
                                audioLayerData: audioLayerData, // Include full layer data for reference
                                chartVideoUrl: rawChartVideoUrl, // Store raw chart video URL from layers or fallback - NEVER add prefix
                                chart_video_url: rawChartVideoUrl, // Alias for compatibility
                                chartLayerData: chartLayerDataForJob, // Include full layer data for reference
                                logoUrl: rawLogoUrl, // Store raw logo URL from layers - NEVER add prefix
                                logo_url: rawLogoUrl, // Alias for compatibility
                                logoLayerData: logoLayerDataForJob, // Include full logo layer data for reference
                                subtitleLayerData: subtitleLayerDataForJob, // Include full subtitle layer data
                                subtitleUrl: subtitleLayerDataForJob?.url || null, // SRT file URL
                                subtitleText: subtitleLayerDataForJob?.text || '', // Inline text
                                type: 'video',
                                duration: it.mediaSrcDuration || it.duration || 10,
                                mediaSrcDuration: it.mediaSrcDuration || it.duration || 10,
                                thumbnail: it.thumbnail || rawBaseUrl || '',
                                size: it.size || 0,
                                _session: true, // Flag to indicate this is session media
                                // Include full videos.v1 structure for layer processing
                                videos: it.videos || {},
                              };
                            });

                            // Add logo images as separate entries to upload section (same as base video)
                            const logoImages = [];
                            jobVideos.forEach((it, idx) => {
                              const logoLayerDataForJob = getLogoLayerDataForJob(it);
                              if (logoLayerDataForJob && logoLayerDataForJob.enabled && logoLayerDataForJob.url) {
                                const rawLogoUrl = logoLayerDataForJob.url;
                                logoImages.push({
                                  id: `logo-${it.id || `job-${idx}`}`,
                                  name: `Logo - ${it.title || it.name || `Video ${idx + 1}`}`,
                                  title: `Logo - ${it.title || it.name || `Video ${idx + 1}`}`,
                                  path: rawLogoUrl,  // Store raw logo URL - NEVER add prefix
                                  url: rawLogoUrl,   // Store raw logo URL - NEVER add prefix
                                  src: rawLogoUrl,    // Store raw logo URL - NEVER add prefix
                                  logoUrl: rawLogoUrl,
                                  logo_url: rawLogoUrl,
                                  logoLayerData: logoLayerDataForJob,
                                  type: 'image',
                                  duration: 0,
                                  mediaSrcDuration: 0,
                                  thumbnail: rawLogoUrl,
                                  size: 0,
                                  _session: true,
                                  _isLogo: true, // Flag to indicate this is a logo image
                                  _parentVideoId: it.id || `job-${idx}`, // Reference to parent video
                                });
                              }
                            });

                            // Combine video entries with logo image entries
                            window.__SESSION_MEDIA_FILES = [...window.__SESSION_MEDIA_FILES, ...logoImages];

                            // Trigger timeline rebuild by updating sessionMediaVersion
                            setSessionMediaVersion(prev => prev + 1);
                          }

                          setStatus('succeeded');
                          // Hide loader after successful load
                          setIsLoading(false);
                          setShowVideoLoader(false);
                          return; // Exit early since we got videos from job API
                        }
                      }
                    } catch (jobResultError) {
                      console.error('❌ JOB API: Error processing legacy video_result:', jobResultError);
                      // Continue to fallback session data refresh
                    }
                  }
                }

                // FALLBACK: When percent is 100%, poll session data 2-3 times to fetch all videos and layers
                // Only start session polling if percent is 100% and job API didn't provide video_results or video_result
                if (isPercentComplete) {
                  // Keep loader visible during session data polling
                  setIsLoading(true);
                  setShowVideoLoader(true);
                  setJobProgress({ percent: 100, phase: 'fetching videos...' });

                  // Start polling session data when percent is 100%
                  const sessionPollStartTime = Date.now();
                  const sessionPollMaxDuration = 5 * 60 * 1000; // 5 minutes max
                  const sessionPollInterval = 3000; // Poll every 3 seconds
                  const maxSessionPollAttempts = 3; // Poll 2-3 times as requested
                  let sessionPollAttempts = 0;

                  const pollSessionData = async () => {
                    // Ensure loader is active at the start of each polling iteration
                    if (!cancelled) {
                      setIsLoading(true);
                      setShowVideoLoader(true);
                    }

                    try {
                      // Check timeout
                      if (Date.now() - sessionPollStartTime > sessionPollMaxDuration) {
                        if (!cancelled) {
                          setError('Timeout waiting for videos and layers. Please refresh the page.');
                          setIsLoading(false);
                          setShowVideoLoader(false);
                        }
                        return;
                      }

                      // Increment poll attempts
                      sessionPollAttempts++;

                      const session_id = localStorage.getItem('session_id');
                      const user_id = localStorage.getItem('token');

                      if (!session_id || !user_id) {
                        if (!cancelled) {
                          setIsLoading(false);
                          setShowVideoLoader(false);
                        }
                        return;
                      }

                      const refreshResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ user_id, session_id })
                      });

                      const refreshText = await refreshResp.text();
                      let refreshData;
                      try {
                        refreshData = JSON.parse(refreshText);
                      } catch (_) {
                        refreshData = refreshText;
                      }

                      if (refreshResp.ok && refreshData?.session_data) {
                        const refreshedVideos = parseVideosPayload(refreshData.session_data);

                        // Check if we have videos with all required data
                        const hasVideos = refreshedVideos.length > 0;
                        const hasAllLayers = refreshedVideos.every(video => {
                          // Check if video has base video URL
                          const hasBaseVideo = video.url || video.video_url || video.videos?.v1?.base_video_url;
                          return hasBaseVideo;
                        });

                        if (!cancelled && hasVideos && hasAllLayers) {
                          // All videos and layers are available
                          setItems(refreshedVideos);
                          setStatus('succeeded');
                          setSelectedIndex(0);
                          setIsLoading(false);
                          setShowVideoLoader(false);
                          return; // Stop polling
                        } else if (!cancelled && sessionPollAttempts < maxSessionPollAttempts) {
                          // Videos or layers not ready yet, continue polling (up to max attempts)
                          setIsLoading(true);
                          setShowVideoLoader(true);
                          setJobProgress({ percent: 100, phase: `fetching videos... (attempt ${sessionPollAttempts}/${maxSessionPollAttempts})` });
                          timeoutId = setTimeout(pollSessionData, sessionPollInterval);
                          return;
                        } else if (!cancelled) {
                          // Max attempts reached - hide loader and show current state
                          setIsLoading(false);
                          setShowVideoLoader(false);
                          if (refreshedVideos.length > 0) {
                            // At least we have some videos, show them
                            setItems(refreshedVideos);
                            setStatus('succeeded');
                            setSelectedIndex(0);
                          }
                          return;
                        }
                      } else {
                        // API error, continue polling if attempts remaining
                        if (!cancelled && sessionPollAttempts < maxSessionPollAttempts) {
                          setIsLoading(true);
                          setShowVideoLoader(true);
                          setJobProgress({ percent: 100, phase: 'retrying...' });
                          timeoutId = setTimeout(pollSessionData, sessionPollInterval);
                        }
                        return;
                      }
                    } catch (refreshError) {
                      // Error occurred, continue polling if attempts remaining
                      if (!cancelled && sessionPollAttempts < maxSessionPollAttempts) {
                        setIsLoading(true);
                        setShowVideoLoader(true);
                        console.warn('Session data poll error:', refreshError);
                        setJobProgress({ percent: 100, phase: 'retrying...' });
                        timeoutId = setTimeout(pollSessionData, sessionPollInterval);
                      }
                      return;
                    }
                  };

                  // Start polling session data
                  pollSessionData();
                }
              }
            }
          } catch (e) {
            if (!cancelled) setError(e?.message || 'Failed to load video job');
            setIsLoading(false);
            setShowVideoLoader(false);
          }
        };
        poll();
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load videos');
        setIsLoading(false);
      }
    };

    // Get current session_id from localStorage
    const sessionId = localStorage.getItem('session_id');

    // Only load if we have a valid session_id
    if (!sessionId) {
      setItems([]);
      setError('No session ID found');
      setIsLoading(false);
      return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); };
    }

    // Only load if session_id matches currentSessionId (prevents loading stale data)
    // If session changed, the session tracking useEffect will update currentSessionId first
    if (sessionId !== currentSessionId) {
      // Session changed, wait for session tracking useEffect to update currentSessionId
      return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); };
    }

    // Clear items before loading to prevent showing stale videos from previous session
    setItems([]);
    setSelectedIndex(0);

    load();
    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); };
  }, [jobId, logoEnabled, subtitleEnabled, currentSessionId]);

  useEffect(() => {
    if (selectedIndex >= items.length && items.length > 0) {
      setSelectedIndex(0);
    }
  }, [items.length, selectedIndex]);

  // Selected video helpers (declare before usage)
  const selectedVideo = items[selectedIndex] || {};
  const selectedScenes = Array.isArray(selectedVideo.scenes) ? selectedVideo.scenes : [];
  const selectedVideoUrl = selectedVideo.url || selectedScenes[0]?.url || '';

  // Reset saved overlay tracking when selected video changes
  useEffect(() => {
    savedOverlayIdsRef.current.clear();
    savedOverlaysSnapshotRef.current = [];
    initialOverlaysLoadedRef.current = false;
    setHasUnsavedLayers(false);
    editorOverlaysRef.current = [];
    deletedOverlayIdsRef.current.clear(); // Clear deleted overlay tracking when switching videos
  }, [selectedIndex]);

  // Load selected video as blob to avoid unsupported source errors
  useEffect(() => {
    const targetUrl = selectedVideoUrl;
    if (!targetUrl) {
      setVideoBlobUrl(null);
      return;
    }

    let cancelled = false;
    let objectUrl = null;

    const loadVideoAsBlob = async () => {
      setVideoLoading(true);
      try {
        const response = await fetch(targetUrl);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        if (!cancelled) {
          objectUrl = URL.createObjectURL(new Blob([blob], { type: 'video/mp4' }));
          setVideoBlobUrl(objectUrl);
        }
      } catch (error) {
        if (!cancelled) setError(`Failed to load video: ${error.message}`);
      } finally {
        if (!cancelled) setVideoLoading(false);
      }
    };

    loadVideoAsBlob();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [selectedVideoUrl]);

  // Load FFmpeg.wasm (lightweight loader that reuses cached instance)
  const loadFFmpeg = useCallback(async () => {
    if (ffmpegRef.current) {
      return ffmpegRef.current;
    }

    setIsFFmpegLoading(true);
    setFfmpegError('');

    try {
      const ffmpeg = new FFmpeg();
      ffmpeg.on('log', () => { });

      // Prefer CDN blobs to avoid CORS with local hosting
      const coreURL = await toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js', 'text/javascript');
      const wasmURL = await toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm', 'application/wasm');

      await ffmpeg.load({ coreURL, wasmURL });
      ffmpegRef.current = ffmpeg;
      return ffmpeg;
    } catch (error) {
      setFfmpegError(error?.message || 'Failed to load FFmpeg');
      throw error;
    } finally {
      setIsFFmpegLoading(false);
    }
  }, []);

  // Poll merge job status to capture final reel URL for 720p export
  useEffect(() => {
    if (!mergeJobId) return;

    let cancelled = false;
    let timeoutId = null;

    const pollMerge = async () => {
      try {
        const resp = await fetch(
          `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/merge-job-status/${encodeURIComponent(mergeJobId)}`
        );
        const text = await resp.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = text;
        }

        if (!resp.ok) {
          throw new Error(`merge-job-status failed: ${resp.status} ${text}`);
        }

        const status = String(data?.status || '').toLowerCase();
        const progress = data?.progress || {};
        const percent = Number(progress?.percent) || 0;
        const phase = String(progress?.phase || progress?.stage || '').toLowerCase();

        if (!cancelled) {
          setFinalMergeStatus(status);
          setFinalMergeProgress({ percent, phase });

          if (status === 'succeeded' || status === 'completed') {
            const url =
              data?.final_video_url ||
              data?.finalVideoUrl ||
              data?.video_url ||
              data?.videoUrl ||
              data?.result_url ||
              data?.resultUrl ||
              '';
            setFinalMergeUrl(url);
            return;
          }

          if (status === 'failed' || status === 'error') {
            setFfmpegError(data?.error || data?.message || 'Final reel generation failed');
            return;
          }
        }

        if (!cancelled) {
          timeoutId = setTimeout(pollMerge, 3000);
        }
      } catch (error) {
        if (!cancelled) {
          setFfmpegError(error?.message || 'Unable to poll final reel status');
          timeoutId = setTimeout(pollMerge, 4000);
        }
      }
    };

    pollMerge();

    return () => {
      cancelled = true;
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [mergeJobId]);

  const transcodeFinalReelTo720p = useCallback(async () => {
    if (!finalMergeUrl) {
      setFfmpegError('Final reel URL not ready yet.');
      return;
    }

    setIsTranscodingFinal(true);
    setFfmpegError('');

    try {
      const ffmpeg = await loadFFmpeg();

      await ffmpeg.writeFile('final_input.mp4', await fetchFile(finalMergeUrl));

      // scale=-2:720 keeps aspect ratio while forcing height to 720
      await ffmpeg.exec([
        '-i',
        'final_input.mp4',
        '-vf',
        'scale=-2:720',
        '-c:v',
        'libx264',
        '-preset',
        'veryfast',
        '-crf',
        '23',
        '-c:a',
        'aac',
        '-b:a',
        '192k',
        'final_720p.mp4'
      ]);

      const data = await ffmpeg.readFile('final_720p.mp4');
      const url = URL.createObjectURL(new Blob([data.buffer], { type: 'video/mp4' }));
      setFinalReel720Url(url);
    } catch (error) {
      setFfmpegError(error?.message || '720p export failed');
    } finally {
      setIsTranscodingFinal(false);
    }
  }, [finalMergeUrl, loadFFmpeg]);

  // Auto-kickoff 720p export once final reel URL is available
  useEffect(() => {
    if (finalMergeUrl && !finalReel720Url && !isTranscodingFinal) {
      transcodeFinalReelTo720p();
    }
  }, [finalMergeUrl, finalReel720Url, isTranscodingFinal, transcodeFinalReelTo720p]);

  // Helper function to convert video URL to clip by loading metadata
  const convertVideoUrlToClip = useCallback(async (videoItem) => {
    return new Promise((resolve, reject) => {
      const videoElement = document.createElement('video');
      videoElement.crossOrigin = 'anonymous'; // Must be set BEFORE src
      videoElement.preload = 'metadata';
      videoElement.src = videoItem.url;

      videoElement.onloadedmetadata = () => {
        const duration = videoElement.duration;
        if (!isFinite(duration) || duration <= 0) {
          resolve(null);
          return;
        }

        const clip = {
          id: videoItem.id || Date.now() + Math.random(),
          url: videoItem.url,
          name: videoItem.title || videoItem.name || `Video ${Date.now()}`,
          type: 'video',
          duration: duration,
          speed: 1.0,
          trimStart: 0,
          trimEnd: duration,
          description: videoItem.description || '',
          narration: videoItem.narration || '',
        };

        resolve(clip);
      };

      videoElement.onerror = (error) => {
        reject(error);
      };

      videoElement.load();
    });
  }, []);

  // Helper function to convert audio URL to clip by loading metadata and preloading audio
  const convertAudioUrlToClip = useCallback(async (audioUrl, itemId, itemTitle) => {
    return new Promise((resolve, reject) => {
      const audioElement = document.createElement('audio');
      audioElement.crossOrigin = 'anonymous'; // Must be set BEFORE src
      audioElement.preload = 'auto'; // CRITICAL: Preload entire audio file for smooth playback
      audioElement.src = audioUrl;

      let metadataLoaded = false;
      let audioReady = false;

      // First, wait for metadata to get duration
      const handleLoadedMetadata = () => {
        metadataLoaded = true;
        const duration = audioElement.duration;
        if (!isFinite(duration) || duration <= 0) {
          console.warn('⚠️ Audio duration is invalid, using default');
          resolve(null);
          return;
        }

        // If audio is already ready to play, resolve immediately
        if (audioReady) {
          const audioClip = {
            id: `audio-${itemId}-${Date.now()}`,
            url: audioUrl,
            name: itemTitle ? `Audio: ${itemTitle}` : `Audio ${Date.now()}`,
            type: 'audio',
            duration: duration,
            speed: 1.0,
            trimStart: 0,
            trimEnd: duration,
            startTime: 0, // Start at beginning of timeline
            volume: 1.0,
          };

          resolve(audioClip);
        }
      };

      // Wait for audio to be ready to play (canplaythrough = fully loaded)
      const handleCanPlayThrough = () => {
        audioReady = true;
        if (metadataLoaded) {
          const duration = audioElement.duration;
          const audioClip = {
            id: `audio-${itemId}-${Date.now()}`,
            url: audioUrl,
            name: itemTitle ? `Audio: ${itemTitle}` : `Audio ${Date.now()}`,
            type: 'audio',
            duration: duration,
            speed: 1.0,
            trimStart: 0,
            trimEnd: duration,
            startTime: 0, // Start at beginning of timeline
            volume: 1.0,
          };

          resolve(audioClip);
        }
      };

      // Fallback: If canplaythrough doesn't fire, use loadeddata as backup
      const handleLoadedData = () => {
        if (!audioReady && metadataLoaded) {
          // Give it a small delay to ensure audio is ready
          setTimeout(() => {
            if (!audioReady) {
              audioReady = true;
              const duration = audioElement.duration;
              const audioClip = {
                id: `audio-${itemId}-${Date.now()}`,
                url: audioUrl,
                name: itemTitle ? `Audio: ${itemTitle}` : `Audio ${Date.now()}`,
                type: 'audio',
                duration: duration,
                speed: 1.0,
                trimStart: 0,
                trimEnd: duration,
                startTime: 0,
                volume: 1.0,
              };

              resolve(audioClip);
            }
          }, 100);
        }
      };

      audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.addEventListener('canplaythrough', handleCanPlayThrough);
      audioElement.addEventListener('loadeddata', handleLoadedData);

      audioElement.onerror = (error) => {
        console.error('❌ Error loading audio:', error, { url: audioUrl, itemId, itemTitle });
        audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
        audioElement.removeEventListener('canplaythrough', handleCanPlayThrough);
        audioElement.removeEventListener('loadeddata', handleLoadedData);
        reject(error);
      };

      // Start loading the audio
      audioElement.load();

      // Timeout fallback (10 seconds)
      setTimeout(() => {
        if (!metadataLoaded || !audioReady) {
          console.warn(`⚠️ Audio loading timeout for ${itemTitle || itemId}, using metadata only`);
          if (metadataLoaded) {
            const duration = audioElement.duration;
            const audioClip = {
              id: `audio-${itemId}-${Date.now()}`,
              url: audioUrl,
              name: itemTitle ? `Audio: ${itemTitle}` : `Audio ${Date.now()}`,
              type: 'audio',
              duration: duration,
              speed: 1.0,
              trimStart: 0,
              trimEnd: duration,
              startTime: 0,
              volume: 1.0,
            };
            resolve(audioClip);
          } else {
            reject(new Error('Audio loading timeout'));
          }
        }
      }, 10000);
    });
  }, []);

  // Convert video items to clips when items change
  const [editorTracks, setEditorTracks] = useState([[], []]);
  const [editorAudioTracks, setEditorAudioTracks] = useState([]);
  const [isConvertingVideos, setIsConvertingVideos] = useState(false);
  const [defaultOverlays, setDefaultOverlays] = useState([]);
  const [timelineLoading, setTimelineLoading] = useState(false);
  const [sessionMediaVersion, setSessionMediaVersion] = useState(0); // Track session media changes

  // Memoize defaultOverlays to prevent unnecessary re-renders in ReactVideoEditor
  // Use overlay IDs and count to create stable signature
  const memoizedDefaultOverlays = useMemo(() => {
    // Return the overlays array - memoization will prevent re-renders if dependencies don't change
    return defaultOverlays;
  }, [
    defaultOverlays.length,
    defaultOverlays.map(o => o?.id || '').filter(Boolean).sort().join('|')
  ]);

  // Watch defaultOverlays and ensure initial overlays are marked when they're set
  // This is a fallback in case onOverlaysChange isn't called
  useEffect(() => {
    if (defaultOverlays.length > 0 && !initialOverlaysLoadedRef.current) {
      // Wait a bit for ReactVideoEditor to process the overlays and call onOverlaysChange
      // If onOverlaysChange hasn't been called after a delay, mark them manually
      const timeoutId = setTimeout(() => {
        if (!initialOverlaysLoadedRef.current && defaultOverlays.length > 0) {
          initialOverlaysLoadedRef.current = true;
          defaultOverlays.forEach(overlay => {
            if (overlay?.id !== undefined) {
              savedOverlayIdsRef.current.add(overlay.id);
            }
          });
        }
      }, 1000); // Wait 1 second for onOverlaysChange to be called

      return () => clearTimeout(timeoutId);
    }
  }, [defaultOverlays]);

  // Fallback: Periodically check for unsaved overlays (in case onOverlaysChange doesn't fire)
  useEffect(() => {
    if (!initialOverlaysLoadedRef.current) return;

    let previousOverlayCount = editorOverlaysRef.current?.length || 0;

    const checkInterval = setInterval(() => {
      const currentOverlays = editorOverlaysRef.current || [];
      const currentOverlayCount = currentOverlays.length;
      const savedIds = savedOverlayIdsRef.current;
      const currentOverlayIds = new Set(currentOverlays.map(o => o?.id).filter(Boolean));

      // Check for unsaved overlay IDs
      const unsavedIds = Array.from(currentOverlayIds).filter(id => !savedIds.has(id));

      // Check if overlay count increased (user added a layer)
      const countIncreased = currentOverlayCount > previousOverlayCount;

      if (unsavedIds.length > 0 || countIncreased) {
        setHasUnsavedLayers(true);
      }

      previousOverlayCount = currentOverlayCount;
    }, 1000); // Check every 1 second for faster detection

    return () => clearInterval(checkInterval);
  }, [initialOverlaysLoadedRef.current]);

  useEffect(() => {
    if (items.length === 0) {
      setEditorTracks([[], []]);
      setEditorAudioTracks([]);
      return;
    }

    const convertAllVideos = async () => {
      setIsConvertingVideos(true);
      try {
        const clips = [];
        const chartOverlayClips = []; // Dedicated chart overlay clips (PLOTLY)
        const audioClips = [];

        let primaryClipAccumulatedTime = 0; // Track accumulated time for primary clips positioning

        for (let i = 0; i < items.length; i++) {
          const item = items[i];

          // Convert video URL to clip
          if (item.url) {
            try {
              const clip = await convertVideoUrlToClip(item);
              if (clip) {
                // Store the source item ID in the primary clip for direct matching
                clip.sourceItemId = item.id;

                // Calculate where this primary clip starts in the timeline (before adding it)
                const primaryClipStartTime = primaryClipAccumulatedTime;

                // Store the current clip index before pushing (this is the index it will have)
                const currentClipIndex = clips.length;

                clips.push(clip);

                // Convert chart_video_url to overlay clip for any video that has it
                // This ensures chart overlays appear for every scene with a chart_video_url
                if (item.chartVideoUrl) {
                  try {

                    const chartClip = await convertVideoUrlToClip({
                      id: `${item.id}-chart-overlay`,
                      url: item.chartVideoUrl,
                      title: `${item.title} - Chart Overlay`,
                      name: `${item.title} - Chart Overlay`
                    });

                    if (chartClip) {
                      // Calculate the trimmed duration of the primary clip (exact match)
                      const primaryClipSpeed = clip.speed || 1.0;
                      const primaryClipTrimmedDuration = clip.trimEnd - clip.trimStart;
                      const primaryClipEffectiveDuration = primaryClipTrimmedDuration / primaryClipSpeed;

                      // Set overlay clip to match primary clip timing EXACTLY
                      chartClip.trimStart = 0;
                      // Match the exact effective duration of the primary clip
                      chartClip.trimEnd = Math.min(chartClip.duration, primaryClipEffectiveDuration);
                      chartClip.speed = 1.0; // Ensure speed is 1.0 for proper sync
                      // Start at the same time as the primary clip (where it actually is in the timeline)
                      chartClip.startTime = primaryClipStartTime;
                      // Persist the intended timeline start to survive matching fallbacks
                      chartClip.timelineStartTime = primaryClipStartTime;
                      chartClip.isChartOverlay = true; // Mark as chart-only layer

                      // Add transform property to position overlay on top of video (centered, full width)
                      // x: 50% (center), y: 50% (center), width: 100% (full width), opacity: 1.0
                      chartClip.transform = {
                        x: 50,  // Center horizontally
                        y: 50,  // Center vertically
                        width: 100,  // Full width of the video
                        opacity: 1.0  // Fully visible
                      };

                      // Store DIRECT references to the primary clip for reliable matching
                      chartClip.primaryClipId = clip.id; // Direct clip ID reference
                      chartClip.primaryClipIndex = currentClipIndex; // Direct index reference (the index we just used)
                      chartClip.sourceItemId = item.id; // Store source item ID for direct matching

                      chartOverlayClips.push(chartClip);

                    }
                  } catch (error) {
                  }
                }

                // Update accumulated time for next clip (after adding current clip)
                const trimmedDuration = (clip.trimEnd - clip.trimStart) / (clip.speed || 1.0);
                primaryClipAccumulatedTime += trimmedDuration;
              }
            } catch (error) {
            }
          }
        }

        // Now process audio URLs from scenes (per scene) and video-level fallback

        let accumulatedTime = 0;

        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const currentVideoClip = clips[i];
          let itemHasAudio = false;

          // Calculate start time for this video's scenes
          let sceneStartTime = accumulatedTime;

          // Process audio from scenes first (per scene audio)
          if (item.scenes && Array.isArray(item.scenes) && item.scenes.length > 0) {


            // Calculate duration per scene if we have a video clip
            let sceneDuration = 0;
            if (currentVideoClip && item.scenes.length > 0) {
              const videoDuration = (currentVideoClip.trimEnd - currentVideoClip.trimStart) / (currentVideoClip.speed || 1.0);
              sceneDuration = videoDuration / item.scenes.length;
            }

            for (let sceneIdx = 0; sceneIdx < item.scenes.length; sceneIdx++) {
              const scene = item.scenes[sceneIdx];

              if (scene.audioUrl) {
                try {
                  const sceneTitle = scene.sceneTitle || scene.description || `Scene ${scene.sceneNumber || sceneIdx + 1}`;


                  const audioClip = await convertAudioUrlToClip(
                    scene.audioUrl,
                    `${item.id}-scene-${sceneIdx}`,
                    `${item.title} - ${sceneTitle}`
                  );

                  if (audioClip) {
                    audioClip.startTime = sceneStartTime + (sceneIdx * sceneDuration);
                    audioClip.linkedVideoId = item.id;
                    audioClips.push(audioClip);
                    itemHasAudio = true;


                  }
                } catch (error) {
                  console.error(`Failed to convert audio for scene ${sceneIdx + 1} of item ${i + 1}:`, error);
                }
              } else {

              }
            }
          }

          // Fallback: Use video-level audio URL if no scene-level audio found
          if (item.audioUrl && (!item.scenes || item.scenes.length === 0 || !item.scenes.some(s => s.audioUrl))) {
            try {

              const audioClip = await convertAudioUrlToClip(item.audioUrl, item.id, item.title);
              if (audioClip) {
                audioClip.startTime = accumulatedTime;
                audioClip.linkedVideoId = item.id;
                audioClips.push(audioClip);
                itemHasAudio = true;

              }
            } catch (error) {
              console.error(`Failed to convert video-level audio ${item.id}:`, error);
            }
          }

          // Fallback: For PLOTLY, if no audio added yet, try extracting audio from chart video
          if (!itemHasAudio && item.model === 'PLOTLY' && item.chartVideoUrl) {
            try {

              const audioClip = await convertAudioUrlToClip(item.chartVideoUrl, `${item.id}-chart-audio`, `${item.title || 'Chart'} Audio`);
              if (audioClip) {
                audioClip.startTime = accumulatedTime;
                audioClip.linkedVideoId = item.id;
                audioClips.push(audioClip);
                itemHasAudio = true;

              }
            } catch (error) {
              console.error(`Failed to convert chart audio for PLOTLY item ${item.id}:`, error);
            }
          }

          // Final fallback: derive audio from the primary video URL itself (if still no audio)
          if (!itemHasAudio && item.url) {
            try {

              const audioClip = await convertAudioUrlToClip(item.url, `${item.id}-video-audio`, `${item.title || 'Video'} Audio`);
              if (audioClip) {
                audioClip.startTime = accumulatedTime;
                audioClip.linkedVideoId = item.id;
                audioClips.push(audioClip);
                itemHasAudio = true;

              }
            } catch (error) {
              console.error(`Failed to derive audio from video for item ${item.id}:`, error);
            }
          }

          // Update accumulated time for next video
          if (currentVideoClip) {
            const trimmedDuration = (currentVideoClip.trimEnd - currentVideoClip.trimStart) / (currentVideoClip.speed || 1.0);
            accumulatedTime += trimmedDuration;
          }
        }



        // Establish bidirectional linking between video and audio clips
        // Video clips have sourceItemId, audio clips have linkedVideoId - match them
        clips.forEach((videoClip) => {
          if (videoClip.sourceItemId) {
            // Find all audio clips linked to this video clip's source item
            const linkedAudioClips = audioClips.filter(
              (audioClip) => audioClip.linkedVideoId === videoClip.sourceItemId
            );

            // Store array of linked audio clip IDs in the video clip
            if (linkedAudioClips.length > 0) {
              videoClip.linkedAudioClipIds = linkedAudioClips.map(ac => ac.id);

            }

            // Store the video clip ID in each linked audio clip
            linkedAudioClips.forEach((audioClip) => {
              audioClip.linkedVideoClipId = videoClip.id;

            });
          }
        });



        // Set tracks: [0] = primary clips, [1+] = dedicated chart overlay tracks (one per chart clip)
        const chartTracks = chartOverlayClips.map(chartClip => [chartClip]);
        setEditorTracks([clips, ...chartTracks]);
        setEditorAudioTracks(audioClips);

        // Force a re-render by logging state update

      } catch (error) {
      } finally {
        setIsConvertingVideos(false);
      }
    };

    convertAllVideos();
  }, [items, convertVideoUrlToClip, convertAudioUrlToClip]);

  // Close transition menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (showTransitionMenu !== null && !e.target.closest('.transition-menu-container')) {
        setShowTransitionMenu(null);
        // Also reset hover if menu was closed
        if (!e.target.closest('[onMouseEnter]')) {
          setHoveredTransitionIndex(null);
        }
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showTransitionMenu]);

  // Handle success popup timeout
  useEffect(() => {
    if (showSuccessPopup && mergeJobId) {
      const timer = setTimeout(() => {
        setShowSuccessPopup(false);
        // Navigate to final video section
        if (onGenerateFinalReel && typeof onGenerateFinalReel === 'function') {
          onGenerateFinalReel(mergeJobId);
        }
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [showSuccessPopup, mergeJobId, onGenerateFinalReel]);

  // Generate Final Reel function
  const handleGenerateFinalReel = async () => {
    try {
      setIsGenerating(true);
      setError('');

      const session_id = localStorage.getItem('session_id');
      const user_id = localStorage.getItem('token');

      if (!session_id || !user_id) {
        setError('Missing session or user');
        setIsGenerating(false);
        return;
      }

      if (items.length < 2) {
        setError('At least 2 videos are required to generate a final reel');
        setIsGenerating(false);
        return;
      }

      // Transform transitions to API format
      // transitions object: { 0: "fade", 1: "slideleft" } means transition between video[0] and video[1], video[1] and video[2]
      // API expects: [{ from: 1, to: 2, type: "fade", duration: 0.5 }] (1-indexed)


      const transitionsArray = [];
      for (let i = 0; i < items.length - 1; i++) {
        // Check if transition exists for this index (as string key or number)
        const transitionType = transitions[i] !== undefined ? transitions[i] : (transitions[String(i)] !== undefined ? transitions[String(i)] : null);

        if (transitionType && transitionType !== 'none' && transitionType !== null && transitionType !== undefined) {
          transitionsArray.push({
            from: i + 1, // 1-indexed
            to: i + 2,   // 1-indexed
            type: transitionType,
            duration: transitionDuration || 0.5 // Transition duration in seconds (can be adjusted)
          });

        } else {
          // Add default fade if no transition is explicitly set
          transitionsArray.push({
            from: i + 1,
            to: i + 2,
            type: 'fade',
            duration: transitionDuration || 0.5
          });

        }
      }



      const requestBody = {
        session_id,
        user_id,
        transitions: transitionsArray
      };

      const resp = await fetch(
        'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/merge-videos',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(requestBody)
        }
      );

      const text = await resp.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = text;
      }

      if (!resp.ok) {
        throw new Error(`merge-videos failed: ${resp.status} ${text}`);
      }

      // Store job_id for final video component
      const jobId = data?.job_id || data?.jobId || data?.id || '';
      if (jobId) {
        setMergeJobId(jobId);
      }

      // Show success popup
      setShowSuccessPopup(true);
      setIsGenerating(false);

    } catch (e) {
      setError(e?.message || 'Failed to generate final reel');
      setIsGenerating(false);
    }
  };

  const lambdaRenderer = useMemo(
    () =>
      new HttpRenderer(LAMBDA_RENDER_ENDPOINT, {
        type: 'lambda',
        entryPoint: LAMBDA_RENDER_ENDPOINT,
      }),
    []
  );

  const ssrRenderer = useMemo(
    () =>
      new HttpRenderer(SSR_RENDER_ENDPOINT, {
        type: 'ssr',
        entryPoint: SSR_RENDER_ENDPOINT,
      }),
    []
  );

  // Feature flag to toggle between SSR and Lambda rendering
  const USE_SSR_RENDERING = true; // Set to false to use Lambda rendering

  // Select renderer based on feature flag with error handling
  const selectedRenderer = useMemo(() => {
    try {
      if (USE_SSR_RENDERING) {
        return ssrRenderer;
      } else {
        return lambdaRenderer;
      }
    } catch (error) {
      console.error('Renderer initialization error:', error);
      // Fallback to Lambda if SSR fails
      return lambdaRenderer;
    }
  }, [USE_SSR_RENDERING, ssrRenderer, lambdaRenderer]);

  useEffect(() => {
  }, [USE_SSR_RENDERING]);

  // Handle selected overlay changes - open sidebar when any layer is clicked
  const handleSelectedOverlayChange = useCallback((selectedOverlayId) => {
    // Open sidebar when an overlay is selected (video, audio, image, subtitle, etc.)
    if (selectedOverlayId !== null && selectedOverlayId !== undefined) {
      setSidebarVisible(true);
    }
  }, []);

  // Helper function to normalize an overlay for comparison (removes volatile properties)
  const normalizeOverlayForComparison = useCallback((overlay) => {
    if (!overlay) return null;

    const normalized = {
      id: overlay.id,
      type: overlay.type,
      from: overlay.from || 0,
      durationInFrames: overlay.durationInFrames || 0,
      row: overlay.row ?? 0,
      x: overlay.x ?? overlay.left ?? 0,
      y: overlay.y ?? overlay.top ?? 0,
      width: overlay.width || 0,
      height: overlay.height || 0,
      content: overlay.content || '',
      text: overlay.text || overlay.content || '',
      src: overlay.src || '',
      volume: overlay.volume ?? 1,
      hasBackground: overlay.has_background,
      animationEnter: overlay.animation?.enter,
      animationExit: overlay.animation?.exit,
    };

    if (overlay.styles) {
      normalized.styles = {
        fontSize: overlay.styles.fontSize || overlay.styles.fontSizeScale || overlay.fontSize || '',
        fontFamily: overlay.styles.fontFamily || overlay.fontFamily || '',
        fontWeight: overlay.styles.fontWeight || '',
        color: overlay.styles.color || overlay.color || '',
        textAlign: overlay.styles.textAlign || '',
        backgroundColor: overlay.styles.backgroundColor || overlay.backgroundColor || '',
        opacity: overlay.styles.opacity ?? 1,
      };
    } else if (overlay.style) {
      normalized.styles = overlay.style;
    } else {
      normalized.styles = {};
    }

    return normalized;
  }, []);

  // Helper function to detect if overlays have changed
  const detectOverlayChanges = useCallback((currentOverlays, savedOverlays) => {
    // Normalize both arrays for comparison
    const normalizeOverlay = normalizeOverlayForComparison;

    // Create normalized snapshots
    const normalizeArray = (overlays) => {
      return overlays
        .filter(overlay => overlay?.id !== undefined && overlay?.id !== null)
        .map(normalizeOverlay)
        .filter(Boolean)
        .sort((a, b) => {
          // Sort by ID for consistent comparison
          const idA = String(a.id);
          const idB = String(b.id);
          return idA.localeCompare(idB);
        });
    };

    const currentNormalized = normalizeArray(currentOverlays);
    const savedNormalized = normalizeArray(savedOverlays);

    // Create maps for easier comparison
    const currentMap = new Map();
    const savedMap = new Map();

    currentNormalized.forEach(overlay => {
      currentMap.set(String(overlay.id), JSON.stringify(overlay));
    });

    savedNormalized.forEach(overlay => {
      savedMap.set(String(overlay.id), JSON.stringify(overlay));
    });

    // Check for new overlays (in current but not in saved)
    const newOverlays = Array.from(currentMap.keys()).filter(id => !savedMap.has(id));

    // Check for deleted overlays (in saved but not in current)
    const deletedOverlays = Array.from(savedMap.keys()).filter(id => !currentMap.has(id));

    // Check for modified overlays (same ID but different properties)
    const modifiedOverlays = Array.from(currentMap.keys()).filter(id => {
      if (!savedMap.has(id)) return false;
      return currentMap.get(id) !== savedMap.get(id);
    });

    const hasChanges = newOverlays.length > 0 || deletedOverlays.length > 0 || modifiedOverlays.length > 0;

    return {
      hasChanges,
      newOverlays,
      deletedOverlays,
      modifiedOverlays
    };
  }, [normalizeOverlayForComparison]);

  /**
   * Delete a text layer from a specific scene
   * @param {number} sceneNumber - The scene number where the layer exists
   * @param {string} layerName - The layer name (e.g., "text_overlay")
   * @param {number} layerIndex - The index of the layer to delete
   */
  const deleteLayer = useCallback(async (sceneNumber, layerName = 'text_overlay', layerIndex) => {
    try {
      const session_id = localStorage.getItem('session_id');
      const user_id = localStorage.getItem('token'); // Use 'token' instead of 'user_id'

      if (!session_id) {
        console.error('❌ [DELETE-LAYER] Session ID is missing');
        throw new Error('Session ID is required');
      }

      if (layerIndex === undefined || layerIndex === null) {
        console.error('❌ [DELETE-LAYER] Layer index is missing', {
          layerIndex,
          layerIndexType: typeof layerIndex
        });
        throw new Error('Layer index is required for deletion');
      }

      // Ensure layerIndex is a number
      const numericLayerIndex = Number(layerIndex);
      if (isNaN(numericLayerIndex)) {
        console.error('❌ [DELETE-LAYER] Layer index is not a valid number', {
          layerIndex,
          numericLayerIndex
        });
        throw new Error(`Layer index must be a valid number, got: ${layerIndex}`);
      }

      // Build delete layer request body
      // Format matches API specification:
      // {
      //   "session_id": "460d4818-82ca-4a73-b9b9-241403c20a66",
      //   "scene_number": 3,
      //   "operation": "delete_layer",
      //   "layer_selector": {
      //     "name": "text_overlay",
      //     "index": 2
      //   }
      // }
      const layerSelector = {
        name: layerName
      };

      if (layerName !== 'logo' && layerName !== 'subtitles') {
        layerSelector.index = numericLayerIndex;
      }

      const requestBody = {
        session_id: session_id,
        scene_number: Number(sceneNumber), // Ensure it's a number
        operation: "delete_layer",
        layer_selector: layerSelector
      };
      const apiUrl = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/manage-layers';
      const response = await fetch(apiUrl, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }
      if (!response.ok) {
        console.error('❌ [DELETE-LAYER] manage-layers API call failed', {
          status: response.status,
          response: responseData,
          sceneNumber,
          layerName,
          layerIndex,
          requestBody: requestBody
        });

        // Handle 404 specifically - endpoint might not exist or be temporarily unavailable
        if (response.status === 404) {
          const errorMessage = `Layer deletion endpoint not found (404). The manage-layers API endpoint may not be available.`;
          console.warn('⚠️ [DELETE-LAYER] Endpoint not found, skipping deletion:', errorMessage);
          // Don't throw error for 404 - just log and return silently
          // This prevents errors during initialization when the endpoint might not be set up
          return;
        }

        throw new Error(`Failed to delete layer: ${response.status} ${JSON.stringify(responseData)}`);
      }
      await refreshUserSessionData();
    } catch (error) {
      console.error('❌ [DELETE-LAYER] Error deleting layer:', error);
      // Only show alert if it's not a 404 error (which we handle silently)
      // and if the error message doesn't indicate it's a missing endpoint
      if (!error.message.includes('404') && !error.message.includes('not found')) {
        alert(`Failed to delete layer: ${error.message}`);
      }
      // Don't throw error for 404 - allow the function to complete silently
      if (error.message.includes('404') || error.message.includes('not found')) {
        return;
      }
      throw error;
    }
  }, []);

  /**
   * Converts a shape overlay to an image blob (PNG)
   * @param {Object} overlay - Shape overlay object
   * @returns {Promise<Blob>} PNG image blob
   */
  const convertShapeToImageBlob = useCallback(async (overlay) => {
    const shapeType = overlay?.shapeType || 'circle';
    const styles = overlay?.styles || {};
    const fill = styles.fill || '#3b82f6';
    const stroke = styles.stroke || '#1e40af';
    const strokeWidth = styles.strokeWidth || 2;
    const opacity = styles.opacity !== undefined ? styles.opacity : 1;
    const width = overlay.width || 200;
    const height = overlay.height || 200;

    // Generate SVG string based on shape type
    let svgContent = '';
    const size = Math.min(width, height);
    const centerX = width / 2;
    const centerY = height / 2;
    const radius = size / 2;

    switch (shapeType) {
      case 'circle':
        svgContent = `<circle cx="${centerX}" cy="${centerY}" r="${radius - strokeWidth / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
        break;
      case 'square':
        const squareSize = size - strokeWidth;
        const squareX = width / 2 - squareSize / 2;
        const squareY = height / 2 - squareSize / 2;
        svgContent = `<rect x="${squareX}" y="${squareY}" width="${squareSize}" height="${squareSize}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
        break;
      case 'rectangle':
        const rectWidth = width - strokeWidth;
        const rectHeight = height - strokeWidth;
        const rectX = width / 2 - rectWidth / 2;
        const rectY = height / 2 - rectHeight / 2;
        svgContent = `<rect x="${rectX}" y="${rectY}" width="${rectWidth}" height="${rectHeight}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
        break;
      case 'triangle':
        const triangleSize = size - strokeWidth;
        const trianglePoints = [
          `${centerX},${centerY - triangleSize / 2}`,
          `${centerX - triangleSize / 2},${centerY + triangleSize / 2}`,
          `${centerX + triangleSize / 2},${centerY + triangleSize / 2}`
        ].join(' ');
        svgContent = `<polygon points="${trianglePoints}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
        break;
      case 'hexagon':
        const hexSize = size - strokeWidth;
        const hexPoints = [];
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i;
          const x = centerX + (hexSize / 2) * Math.cos(angle);
          const y = centerY + (hexSize / 2) * Math.sin(angle);
          hexPoints.push(`${x},${y}`);
        }
        svgContent = `<polygon points="${hexPoints.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
        break;
      case 'heart':
        const heartSize = size * 0.8;
        const heartPath = `M ${centerX},${centerY + heartSize * 0.3} C ${centerX},${centerY} ${centerX - heartSize * 0.5},${centerY - heartSize * 0.2} ${centerX - heartSize * 0.5},${centerY} C ${centerX - heartSize * 0.5},${centerY + heartSize * 0.3} ${centerX},${centerY + heartSize * 0.6} ${centerX},${centerY + heartSize * 0.9} C ${centerX},${centerY + heartSize * 0.6} ${centerX + heartSize * 0.5},${centerY + heartSize * 0.3} ${centerX + heartSize * 0.5},${centerY} C ${centerX + heartSize * 0.5},${centerY - heartSize * 0.2} ${centerX},${centerY} ${centerX},${centerY + heartSize * 0.3} Z`;
        svgContent = `<path d="${heartPath}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
        break;
      case 'star':
        const starSize = size * 0.8;
        const starPoints = [];
        const outerRadius = starSize / 2;
        const innerRadius = outerRadius * 0.4;
        for (let i = 0; i < 10; i++) {
          const angle = (Math.PI / 5) * i - Math.PI / 2;
          const radius = i % 2 === 0 ? outerRadius : innerRadius;
          const x = centerX + radius * Math.cos(angle);
          const y = centerY + radius * Math.sin(angle);
          starPoints.push(`${x},${y}`);
        }
        svgContent = `<polygon points="${starPoints.join(' ')}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
        break;
      default:
        svgContent = `<circle cx="${centerX}" cy="${centerY}" r="${radius - strokeWidth / 2}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}" opacity="${opacity}"/>`;
    }

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">${svgContent}</svg>`;
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const svgUrl = URL.createObjectURL(svgBlob);

    // Convert SVG to PNG using canvas
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(svgUrl);
          if (blob) {
            resolve(blob);
          } else {
            reject(new Error('Failed to convert shape to blob'));
          }
        }, 'image/png');
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        reject(new Error('Failed to load shape SVG'));
      };
      img.src = svgUrl;
    });
  }, []);

  // Map overlay type to API layer_name
  const getLayerName = useCallback((overlayType) => {
    switch (overlayType) {
      case OverlayType.TEXT:
        return 'text_overlay';
      case OverlayType.IMAGE:
        return 'logo';
      case OverlayType.VIDEO:
        return 'chart';
      case OverlayType.SOUND:
        return 'audio';
      case OverlayType.CAPTION:
        return 'text_overlay';
      default:
        return 'custom';
    }
  }, []);

  /**
   * Saves a single layer to the API (called automatically when a layer is added)
   * @param {Object} overlay - The overlay to save
   * @returns {Promise<void>}
   */
  const saveSingleLayer = useCallback(async (overlay) => {
    const session_id = localStorage.getItem('session_id');
    const user_id = localStorage.getItem('token');

    if (!session_id || !user_id) {
      console.error('❌ [SAVE-SINGLE-LAYER] Missing session_id or user_id');
      return;
    }

    if (!overlay || overlay.id === undefined || overlay.id === null) {
      console.error('❌ [SAVE-SINGLE-LAYER] Invalid overlay:', overlay);
      return;
    }

    // Skip if already saved
    if (savedOverlayIdsRef.current.has(overlay.id)) {
      return;
    }
    try {
      const fps = APP_CONFIG.fps || 30;

      // Calculate scene frame ranges
      const sceneFrameRanges = [];
      let cumulativeFrames = 0;

      items.forEach((video, index) => {
        const sceneNum = video.sceneNumber || video.scene_number || (index + 1);
        const videoDuration = video.duration ||
          video.videos?.v1?.duration ||
          video.videos?.duration ||
          10;
        const videoFrames = Math.round(videoDuration * fps);

        sceneFrameRanges.push({
          sceneNumber: sceneNum,
          startFrame: cumulativeFrames,
          endFrame: cumulativeFrames + videoFrames,
          video: video,
          duration: videoDuration,
          durationFrames: videoFrames
        });

        cumulativeFrames += videoFrames;
      });

      // Find which scene this overlay belongs to
      const overlayStartFrame = overlay.from || 0;
      let targetScene = null;
      let sceneRange = null;

      for (const range of sceneFrameRanges) {
        const isLastScene = range === sceneFrameRanges[sceneFrameRanges.length - 1];
        const isInRange = isLastScene
          ? (overlayStartFrame >= range.startFrame && overlayStartFrame <= range.endFrame)
          : (overlayStartFrame >= range.startFrame && overlayStartFrame < range.endFrame);

        if (isInRange) {
          targetScene = range.sceneNumber;
          sceneRange = range;
          break;
        }
      }

      if (!targetScene || !sceneRange) {
        targetScene = items[0]?.sceneNumber || items[0]?.scene_number || 1;
        sceneRange = sceneFrameRanges[0] || { startFrame: 0, endFrame: 150, sceneNumber: targetScene };
        console.warn('⚠️ [SAVE-SINGLE-LAYER] Could not determine scene, using fallback:', targetScene);
      }

      overlay.sceneNumber = targetScene;

      // Calculate timing
      let absoluteStartFrame = overlayStartFrame;
      let overlayDurationFrames = overlay.durationInFrames || (5 * fps);

      if (overlayDurationFrames <= 0 || isNaN(overlayDurationFrames)) {
        overlayDurationFrames = 5 * fps;
      }

      let absoluteEndFrame = absoluteStartFrame + overlayDurationFrames;

      // Calculate relative frames
      const sceneStartFrame = sceneRange.startFrame || 0;
      let relativeStartFrame = Math.max(0, absoluteStartFrame - sceneStartFrame);
      let relativeEndFrame = Math.max(0, absoluteEndFrame - sceneStartFrame);

      if (relativeEndFrame <= relativeStartFrame) {
        relativeEndFrame = relativeStartFrame + 1;
      }

      // Convert to time
      const framesToTime = (frames, fps) => {
        const totalSeconds = Math.floor(frames / fps);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;
        return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
      };

      const startTime = framesToTime(relativeStartFrame, fps);
      let endTime = framesToTime(relativeEndFrame, fps);

      // Build layer object
      let layer = {};
      let layerName = getLayerName(overlay.type);
      let purpose = null;

      // Handle different overlay types
      if (overlay.type === OverlayType.TEXT || overlay.type === OverlayType.CAPTION) {
        // Text overlay - build text layer
        const text = overlay.content || overlay.text || '';
        const styles = overlay.styles || {};

        layer = {
          text: text,
          fontSize: styles.fontSize || 24,
          fontFamily: styles.fontFamily || 'Arial',
          fontWeight: styles.fontWeight || 'normal',
          color: styles.color || '#000000',
          alignment: styles.textAlign || 'center',
        };

        layerName = 'text_overlay';
      } else if (overlay.type === OverlayType.SHAPE) {
        // Shape overlay - convert to image and upload
        const shapeBlob = await convertShapeToImageBlob(overlay);
        const shapeBlobUrl = URL.createObjectURL(shapeBlob);

        const fileName = `scene-${targetScene}-shape-${overlay.id}.png`;
        const mimeType = 'image/png';
        purpose = 'custom_sticker';
        layerName = 'custom_sticker';

        const uploadLayerName = overlay.name || `shape_${overlay.shapeType}_${overlay.id}`;
        const uploadMetadata = {
          purpose: purpose,
          layer_name: uploadLayerName
        };

        const uploadedFileInfo = await uploadBlobUrl(
          shapeBlobUrl,
          fileName,
          mimeType,
          session_id,
          uploadMetadata
        );

        URL.revokeObjectURL(shapeBlobUrl);
        layer.url = uploadedFileInfo.file_url;

      } else if (overlay.type === OverlayType.IMAGE || overlay.type === OverlayType.VIDEO || overlay.type === OverlayType.SOUND) {
        // File-based layers - upload if blob URL
        if (overlay.src && overlay.src.startsWith('blob:')) {
          let mimeType = null;
          let fileName = null;

          const srcUrl = overlay.src || '';
          const lowerSrc = srcUrl.toLowerCase();

          if (lowerSrc.includes('.png')) {
            mimeType = 'image/png';
            fileName = `scene-${targetScene}-image-${overlay.id}.png`;
            purpose = overlay.name?.toLowerCase().includes('logo') ? 'logo' : 'custom_sticker';
            layerName = purpose;
          } else if (lowerSrc.includes('.jpg') || lowerSrc.includes('.jpeg')) {
            mimeType = 'image/jpeg';
            fileName = `scene-${targetScene}-logo-${overlay.id}.jpg`;
            purpose = 'logo';
            layerName = 'logo';
          } else if (lowerSrc.includes('.mp4')) {
            mimeType = 'video/mp4';
            fileName = `scene-${targetScene}-video-${overlay.id}.mp4`;
            purpose = 'video';
            layerName = 'video';
          } else if (lowerSrc.includes('.mp3')) {
            mimeType = 'audio/mpeg';
            fileName = `scene-${targetScene}-audio-${overlay.id}.mp3`;
            purpose = 'audio';
            layerName = 'audio';
          } else {
            // Fallback based on overlay type
            if (overlay.type === OverlayType.IMAGE) {
              mimeType = 'image/png';
              fileName = `scene-${targetScene}-image-${overlay.id}.png`;
              purpose = 'custom_sticker';
              layerName = 'custom_sticker';
            } else if (overlay.type === OverlayType.VIDEO) {
              mimeType = 'video/mp4';
              fileName = `scene-${targetScene}-video-${overlay.id}.mp4`;
              purpose = 'video';
              layerName = 'video';
            } else if (overlay.type === OverlayType.SOUND) {
              mimeType = 'audio/mpeg';
              fileName = `scene-${targetScene}-audio-${overlay.id}.mp3`;
              purpose = 'audio';
              layerName = 'audio';
            }
          }

          const uploadLayerName = overlay.name || `layer_${overlay.id}`;
          const uploadMetadata = {
            purpose: purpose,
            layer_name: uploadLayerName
          };

          const uploadedFileInfo = await uploadBlobUrl(
            overlay.src,
            fileName,
            mimeType,
            session_id,
            uploadMetadata
          );

          layer.url = uploadedFileInfo.file_url;
          if (uploadedFileInfo.purpose) {
            layerName = uploadedFileInfo.purpose;
          }
        } else {
          // Not a blob URL, use it directly
          layer.url = overlay.src;
        }
      }

      layer.name = layerName;

      // Calculate position
      let canvasWidth = 1920;
      let canvasHeight = 1080;
      if (aspectRatio === '9:16' || aspectRatio === '9/16') {
        canvasWidth = 1080;
        canvasHeight = 1920;
      }

      const position = {};
      if (overlay.left !== undefined && overlay.width !== undefined) {
        const centerX = overlay.left + (overlay.width / 2);
        position.x = Math.max(0, Math.min(1, centerX / canvasWidth));
      } else {
        position.x = 0.5;
      }

      if (overlay.top !== undefined && overlay.height !== undefined) {
        const centerY = overlay.top + (overlay.height / 2);
        position.y = Math.max(0, Math.min(1, centerY / canvasHeight));
      } else {
        position.y = 0.5;
      }

      layer.position = position;

      // Add bounding_box
      if (overlay.width !== undefined && overlay.height !== undefined) {
        const boundingBoxX = overlay.left !== undefined
          ? Math.max(0, Math.min(1, overlay.left / canvasWidth))
          : position.x - (overlay.width / canvasWidth / 2);
        const boundingBoxY = overlay.top !== undefined
          ? Math.max(0, Math.min(1, overlay.top / canvasHeight))
          : position.y - (overlay.height / canvasHeight / 2);
        const boundingBoxWidth = Math.max(0, Math.min(1, overlay.width / canvasWidth));
        const boundingBoxHeight = Math.max(0, Math.min(1, overlay.height / canvasHeight));

        layer.bounding_box = {
          x: boundingBoxX,
          y: boundingBoxY,
          width: boundingBoxWidth,
          height: boundingBoxHeight
        };
      }

      // Build request body
      const requestBody = {
        session_id: session_id,
        scene_number: targetScene,
        operation: "add_layer",
        layer: layer,
        start_time: startTime,
        end_time: endTime
      };
      // Call manage-layers API
      const response = await fetch(
        'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/manage-layers',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody)
        }
      );

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      if (!response.ok) {
        throw new Error(`Failed to save layer: ${response.status} ${JSON.stringify(responseData)}`);
      }

      await refreshUserSessionData();

      savedOverlayIdsRef.current.add(overlay.id);

      // Update snapshot
      const currentSnapshot = savedOverlaysSnapshotRef.current || [];
      savedOverlaysSnapshotRef.current = [...currentSnapshot, overlay];

    } catch (error) {
      console.error('❌ [SAVE-SINGLE-LAYER] Error saving layer:', error);
      throw error;
    }
  }, [items, aspectRatio, getLayerName, convertShapeToImageBlob]);

  const handleOverlaysChange = useCallback((overlays) => {
    const currentOverlays = overlays || [];

    // Update the ref with current overlays
    editorOverlaysRef.current = currentOverlays;

    // If initial overlays haven't been marked as loaded yet
    if (!initialOverlaysLoadedRef.current) {
      if (currentOverlays.length > 0) {
        // Mark initial overlays as loaded and saved
        initialOverlaysLoadedRef.current = true;
        currentOverlays.forEach(overlay => {
          if (overlay?.id !== undefined && overlay?.id !== null) {
            savedOverlayIdsRef.current.add(overlay.id);
          }
        });
        // Store normalized snapshot of initial overlays
        savedOverlaysSnapshotRef.current = JSON.parse(JSON.stringify(currentOverlays));
        setHasUnsavedLayers(false);
        return;
      } else {
        // No overlays yet, don't show save button
        savedOverlaysSnapshotRef.current = [];
        setHasUnsavedLayers(false);
        return;
      }
    }

    const savedOverlays = savedOverlaysSnapshotRef.current || [];
    const changes = detectOverlayChanges(currentOverlays, savedOverlays);

    // Show save button if there are new layers (user needs to click save to add them)
    const hasNewLayers = changes.newOverlays && changes.newOverlays.length > 0;
    const hasModifiedLayers = changes.modifiedOverlays && changes.modifiedOverlays.length > 0;
    const hasDeletedLayers = changes.deletedOverlays && changes.deletedOverlays.length > 0;
    setHasUnsavedLayers(hasNewLayers || hasModifiedLayers || hasDeletedLayers);

    if (changes.hasChanges) {
    } else {
    }
  }, [detectOverlayChanges, items, saveSingleLayer]);

  /**
   * Delete overlay handler - called when user clicks delete in timeline
   * This function is passed to ReactVideoEditor and called when delete is clicked
   * @param {string|number} overlayId - The ID of the overlay to delete
   */
  const deleteOverlay = useCallback(async (overlayId) => {
    try {
      const currentOverlays = editorOverlaysRef.current || [];
      const overlayToDelete = currentOverlays.find(o => o?.id === overlayId || String(o?.id) === String(overlayId));

      if (!overlayToDelete) {
        console.warn('⚠️ [DELETE-OVERLAY] Overlay not found:', overlayId);
        return;
      }
    } catch (error) {
      console.error('❌ [DELETE-OVERLAY] Error deleting overlay:', error);
    }
  }, []);

  const rebuildSessionMediaFromSessionData = (sessionData) => {
    if (typeof window === 'undefined') {
      return;
    }

    const videosArray = Array.isArray(sessionData?.videos) ? sessionData.videos : [];

    const getLogoLayerDataForSession = (entry) => {
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        const logoLayer = entry.videos.v1.layers.find(layer => layer?.name === 'logo');
        if (logoLayer) {
          return {
            url: logoLayer.url,
            timing: logoLayer.timing || { start: "00:00:00", end: null },
            position: logoLayer.position || { x: 0.9, y: 0.1 },
            bounding_box: logoLayer.bounding_box || null,
            size: logoLayer.size || null,
            scale: logoLayer.scale !== undefined ? logoLayer.scale : 1,
            opacity: logoLayer.opacity !== undefined ? logoLayer.opacity : 1,
            rotation: logoLayer.rotation || 0,
            style: logoLayer.style || {},
            blend_mode: logoLayer.blend_mode || 'normal',
            enabled: logoLayer.enabled !== undefined ? logoLayer.enabled : true,
            animation: logoLayer.animation || { type: 'none', duration: 0.5 },
          };
        }
      }
      return null;
    };

    const getAudioLayerDataForSession = (entry) => {
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        const audioLayer = entry.videos.v1.layers.find(layer => layer?.name === 'audio');
        if (audioLayer) {
          return {
            url: audioLayer.url,
            timing: audioLayer.timing || { start: "00:00:00", end: null },
            volume: audioLayer.volume !== undefined ? audioLayer.volume : 1,
            enabled: audioLayer.enabled !== undefined ? audioLayer.enabled : true,
          };
        }
      }
      return null;
    };

    const getChartLayerDataForSession = (entry) => {
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        const chartLayer = entry.videos.v1.layers.find(layer => layer?.name === 'chart');
        if (chartLayer) {
          return {
            url: chartLayer.url,
            position: chartLayer.position || { x: 0.5, y: 0.5 },
            bounding_box: chartLayer.bounding_box || null,
            scaling: chartLayer.scaling || { scale_x: 1, scale_y: 1, fit_mode: 'contain' },
            animation: chartLayer.animation || { type: 'none', duration: 0.5 },
            layout: chartLayer.layout || { align: 'center', verticalAlign: 'middle' },
            opacity: chartLayer.opacity !== undefined ? chartLayer.opacity : 1,
          };
        }
      }
      return null;
    };

    const getSubtitleLayerDataForSession = (entry) => {
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        const subtitleLayer = entry.videos.v1.layers.find(layer => layer?.name === 'subtitles');
        if (subtitleLayer) {
          return {
            url: subtitleLayer.url || null,
            text: subtitleLayer.text || '',
            timing: subtitleLayer.timing || { start: "00:00:00", end: null },
            position: subtitleLayer.position || { x: 0.5, y: 0.85 },
            bounding_box: subtitleLayer.bounding_box || null,
            style: {
              fontSize: subtitleLayer.fontSize || subtitleLayer.style?.fontSize || 24,
              fontFamily: subtitleLayer.fontFamily || subtitleLayer.style?.fontFamily || 'Inter',
              fontWeight: subtitleLayer.fontWeight || subtitleLayer.style?.fontWeight || '600',
              color: subtitleLayer.fill || subtitleLayer.style?.color || subtitleLayer.style?.fill || '#FFFFFF',
            },
            enabled: subtitleLayer.enabled !== undefined ? subtitleLayer.enabled : true,
          };
        }
      }
      return null;
    };

    const sessionVideos = videosArray.map((it, idx) => {
      const rawBaseUrl =
        it.videos?.v1?.base_video_url ||
        it.videos?.base_video_url ||
        it.video?.v1?.base_video_url ||
        it.video?.base_video_url ||
        it.url ||
        it.video_url ||
        it.videos?.v1?.video_url ||
        it.videos?.video_url ||
        it.video?.v1?.video_url ||
        it.video?.video_url ||
        '';

      const audioLayerData = getAudioLayerDataForSession(it);
      const rawAudioUrl =
        audioLayerData?.url ||
        it.audioUrl ||
        it.audio_url ||
        it.audio_only_url ||
        it.videos?.v1?.audio_url ||
        it.videos?.v1?.audio_only_url ||
        it.videos?.audio_url ||
        it.videos?.audio_only_url ||
        it.video?.v1?.audio_url ||
        it.video?.v1?.audio_only_url ||
        it.video?.audio_url ||
        it.video?.audio_only_url ||
        '';

      const chartLayerDataForSession = getChartLayerDataForSession(it);
      const rawChartVideoUrl =
        chartLayerDataForSession?.url ||
        it.chartVideoUrl ||
        it.chart_video_url ||
        it.videos?.v1?.chart_video_url ||
        it.videos?.chart_video_url ||
        it.video?.v1?.chart_video_url ||
        it.video?.chart_video_url ||
        '';

      const logoLayerDataForSession = getLogoLayerDataForSession(it);
      const rawLogoUrl = logoLayerDataForSession?.url || '';

      const subtitleLayerDataForSession = getSubtitleLayerDataForSession(it);

      return {
        id: it.id || `session-${idx}`,
        name: it.title || it.name || `Video ${idx + 1}`,
        title: it.title || it.name || `Video ${idx + 1}`,
        path: rawBaseUrl,
        url: rawBaseUrl,
        src: rawBaseUrl,
        baseVideoUrl: rawBaseUrl,
        base_video_url: rawBaseUrl,
        audioUrl: rawAudioUrl,
        audio_url: rawAudioUrl,
        audioVolume: audioLayerData?.volume || 1,
        audioLayerData,
        chartVideoUrl: rawChartVideoUrl,
        chart_video_url: rawChartVideoUrl,
        chartLayerData: chartLayerDataForSession,
        logoUrl: rawLogoUrl,
        logo_url: rawLogoUrl,
        logoLayerData: logoLayerDataForSession,
        subtitleLayerData: subtitleLayerDataForSession,
        subtitleUrl: subtitleLayerDataForSession?.url || null,
        subtitleText: subtitleLayerDataForSession?.text || '',
        type: 'video',
        duration: it.mediaSrcDuration || it.duration || 10,
        mediaSrcDuration: it.mediaSrcDuration || it.duration || 10,
        thumbnail: it.thumbnail || it.poster || rawBaseUrl || '',
        size: it.size || 0,
        _session: true,
        videos: it.videos || {},
      };
    });

    const logoImages = [];
    videosArray.forEach((it, idx) => {
      const logoLayerDataForSession = getLogoLayerDataForSession(it);
      if (logoLayerDataForSession && logoLayerDataForSession.enabled && logoLayerDataForSession.url) {
        const rawLogoUrl = logoLayerDataForSession.url;
        logoImages.push({
          id: `logo-${it.id || `session-${idx}`}`,
          name: `Logo - ${it.title || it.name || `Video ${idx + 1}`}`,
          title: `Logo - ${it.title || it.name || `Video ${idx + 1}`}`,
          path: rawLogoUrl,
          url: rawLogoUrl,
          src: rawLogoUrl,
          logoUrl: rawLogoUrl,
          logo_url: rawLogoUrl,
          logoLayerData: logoLayerDataForSession,
          type: 'image',
          duration: 0,
          mediaSrcDuration: 0,
          thumbnail: rawLogoUrl,
          size: 0,
          _session: true,
          _isLogo: true,
          _parentVideoId: it.id || `session-${idx}`,
        });
      }
    });

    const chartVideos = [];
    videosArray.forEach((it, idx) => {
      const chartLayerDataForSession = getChartLayerDataForSession(it);
      if (chartLayerDataForSession && chartLayerDataForSession.url) {
        const rawChartVideoUrl = chartLayerDataForSession.url;
        const isVideoFile = rawChartVideoUrl.match(/\.(mp4|webm|mov|avi|mkv|flv|wmv|m4v)(\?|$)/i);
        if (isVideoFile) {
          chartVideos.push({
            id: `chart-${it.id || `session-${idx}`}`,
            name: `Chart - ${it.title || it.name || `Video ${idx + 1}`}`,
            title: `Chart - ${it.title || it.name || `Video ${idx + 1}`}`,
            path: rawChartVideoUrl,
            url: rawChartVideoUrl,
            src: rawChartVideoUrl,
            chartVideoUrl: rawChartVideoUrl,
            chart_video_url: rawChartVideoUrl,
            chartLayerData: chartLayerDataForSession,
            type: 'video',
            duration: it.mediaSrcDuration || it.duration || 10,
            mediaSrcDuration: it.mediaSrcDuration || it.duration || 10,
            thumbnail: rawChartVideoUrl || it.thumbnail || '',
            size: it.size || 0,
            _session: true,
            _isChartVideo: true,
            _parentVideoId: it.id || `session-${idx}`,
          });
        }
      }
    });

    const sessionImages = [];
    const sessionDataImages = Array.isArray(sessionData?.images) ? sessionData.images : [];
    sessionDataImages.forEach((img, idx) => {
      const imageUrl = typeof img === 'string'
        ? img
        : (img?.image_url || img?.imageUrl || img?.url || img?.src || img?.ref_image?.[0] || '');

      if (!imageUrl) return;

      const imageFrames = Array.isArray(img?.imageFrames) ? img.imageFrames : [];
      const firstFrame = imageFrames[0] || {};
      const frameImageUrl = firstFrame?.image_url || firstFrame?.url || firstFrame?.src || imageUrl;

      sessionImages.push({
        id: `session-img-${idx}`,
        name: img?.scene_title || img?.title || `Session Image ${idx + 1}`,
        title: img?.scene_title || img?.title || `Session Image ${idx + 1}`,
        path: frameImageUrl,
        url: frameImageUrl,
        src: frameImageUrl,
        type: 'image',
        duration: 0,
        mediaSrcDuration: 0,
        thumbnail: frameImageUrl,
        size: 0,
        _session: true,
        _isSessionImage: true,
        sceneNumber: img?.scene_number || img?.sceneNumber || (idx + 1),
      });
    });

    window.__SESSION_MEDIA_FILES = sessionVideos;
    window.__SESSION_MEDIA_FILES = [...window.__SESSION_MEDIA_FILES, ...logoImages, ...chartVideos, ...sessionImages];
    setSessionMediaVersion(prev => prev + 1);
  };

  const refreshUserSessionData = async () => {
    const session_id = localStorage.getItem('session_id');
    const user_id = localStorage.getItem('token');
    if (!session_id || !user_id) {
      return null;
    }
    try {
      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, session_id })
      });
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }
      if (!response.ok) {
        console.warn('⚠️ [SESSION-REFRESH] Failed to refresh user session data after manage-layers:', {
          status: response.status,
          data
        });
        return null;
      }
      console.log('✅ [SESSION-REFRESH] User session data refreshed after manage-layers');
      const sessionData = data?.session_data || data?.session || null;
      if (sessionData && typeof sessionData === 'object' && !Array.isArray(sessionData)) {
        rebuildSessionMediaFromSessionData(sessionData);
      }
      return data;
    } catch (error) {
      console.error('❌ [SESSION-REFRESH] Error refreshing user session data after manage-layers:', error);
      return null;
    }
  };

  // Convert frames to HH:MM:SS format
  const framesToTime = useCallback((frames, fps = 30) => {
    // Validate inputs - ensure frames is a valid number
    if (frames === null || frames === undefined || isNaN(frames) || !isFinite(frames)) {
      console.warn('⚠️ [framesToTime] Invalid frames value, using 0:', frames);
      frames = 0;
    } else {
      frames = Number(frames);
      if (isNaN(frames) || !isFinite(frames)) {
        console.warn('⚠️ [framesToTime] frames is NaN after conversion, using 0:', frames);
        frames = 0;
      }
    }
    if (fps === null || fps === undefined || isNaN(fps) || !isFinite(fps) || fps <= 0) {
      console.warn('⚠️ [framesToTime] Invalid fps value, using 30:', fps);
      fps = 30;
    } else {
      fps = Number(fps);
      if (isNaN(fps) || !isFinite(fps) || fps <= 0) {
        console.warn('⚠️ [framesToTime] fps is invalid after conversion, using 30:', fps);
        fps = 30;
      }
    }
    const seconds = frames / fps;

    // Validate seconds is a valid number
    if (isNaN(seconds) || !isFinite(seconds)) {
      console.error('❌ [framesToTime] seconds is NaN/Invalid, using 0:', {
        frames,
        fps,
        calculatedSeconds: seconds
      });
      return '00:00:00'; // Return safe default
    }

    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    // Validate all calculated values are valid numbers
    if (isNaN(hours) || isNaN(minutes) || isNaN(secs)) {
      console.error('❌ [framesToTime] Calculated time values contain NaN, using default:', {
        frames,
        fps,
        seconds,
        hours,
        minutes,
        secs
      });
      return '00:00:00'; // Return safe default
    }

    const result = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

    // Final safety check: ensure result doesn't contain "NaN"
    if (result.includes('NaN') || result.includes('Infinity')) {
      console.error('❌ [framesToTime] Result contains NaN/Infinity, using default:', {
        frames,
        fps,
        result
      });
      return '00:00:00'; // Return safe default
    }

    return result;
  }, []);

  /**
   * Detects which scenes have changed base video URLs
   * Compares current items state with stored original URLs
   * @returns {Array} Array of change objects with scene number and URLs
   */
  const detectBaseVideoChanges = useCallback(() => {
    const changes = [];

    items.forEach((video, index) => {
      const sceneNumber = video.sceneNumber || video.scene_number;
      if (!sceneNumber) {
        return;
      }

      // Get current base video URL (priority order)
      const currentBaseVideoUrl = video.videos?.v1?.base_video_url ||
        video.videos?.base_video_url ||
        video.video?.v1?.base_video_url ||
        video.video?.base_video_url ||
        video.baseVideoUrl ||
        video.base_video_url ||
        video.url;

      // Get original base video URL
      const originalBaseVideoUrl = originalBaseVideoUrlsRef.current[sceneNumber];
      // Check if URL has changed
      if (originalBaseVideoUrl && currentBaseVideoUrl && originalBaseVideoUrl !== currentBaseVideoUrl) {
        changes.push({
          sceneNumber: sceneNumber,
          oldUrl: originalBaseVideoUrl,
          newUrl: currentBaseVideoUrl,
          videoTitle: video.title,
          videoId: video.id
        });
      } else if (!originalBaseVideoUrl) {
      } else if (!currentBaseVideoUrl) {
      } else {
      }
    });

    return changes;
  }, [items]);

  /**
   * Updates base videos via API for all detected changes
   * Makes sequential PATCH requests to /v1/videos/manage-layers
   * @param {Array} changes - Array of change objects from detectBaseVideoChanges
   * @returns {Promise<Object>} Result object with success status and updated scenes
   */
  const updateBaseVideos = async (changes) => {
    if (changes.length === 0) {
      return { success: true, updatedScenes: [], message: 'No changes detected' };
    }
    // Get authentication from localStorage
    const session_id = localStorage.getItem('session_id');
    const user_id = localStorage.getItem('token');
    if (!session_id || !user_id) {
      console.error('❌ [SAVE-LAYERS] Authentication failed - missing credentials', {
        hasSessionId: !!session_id,
        hasUserId: !!user_id,
        sessionIdLength: session_id?.length || 0,
        userIdLength: user_id?.length || 0
      });
      throw new Error('Session ID or User ID not found in localStorage');
    }

    const results = [];
    const errors = [];

    // Update each changed scene sequentially
    for (let i = 0; i < changes.length; i++) {
      const change = changes[i];
      try {
        // Build request body according to API spec
        const requestBody = {
          session_id: session_id,
          scene_number: change.sceneNumber,
          operation: "update_base_video",
          base_video_url: change.newUrl
        };
        // Make API request
        const apiStartTime = Date.now();
        const response = await fetch(
          'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/manage-layers',
          {
            method: 'PATCH',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
          }
        );

        const apiEndTime = Date.now();
        const apiDuration = apiEndTime - apiStartTime;
        // Parse response
        const responseText = await response.text();
        let responseData;

        try {
          responseData = JSON.parse(responseText);
        } catch (e) {
          responseData = responseText;
        }
        // Check if request was successful
        if (!response.ok) {
          const errorMsg = `API request failed: HTTP ${response.status} - ${response.statusText}`;
          console.error('❌ [SAVE-LAYERS] API request failed', {
            sceneNumber: change.sceneNumber,
            status: response.status,
            statusText: response.statusText,
            errorMessage: errorMsg,
            responseBody: typeof responseData === 'string' ? responseData : JSON.stringify(responseData)
          });
          throw new Error(errorMsg);
        }
        results.push({
          sceneNumber: change.sceneNumber,
          success: true,
          response: responseData,
          duration: apiDuration
        });

        // Update the original URL reference to the new URL
        originalBaseVideoUrlsRef.current[change.sceneNumber] = change.newUrl;
      } catch (error) {
        console.error('❌ [SAVE-LAYERS] Failed to update base video', {
          sceneNumber: change.sceneNumber,
          videoTitle: change.videoTitle,
          error: {
            message: error.message,
            name: error.name,
            stack: error.stack
          },
          attemptNumber: i + 1,
          totalAttempts: changes.length,
          timestamp: new Date().toISOString()
        });

        errors.push({
          sceneNumber: change.sceneNumber,
          videoTitle: change.videoTitle,
          error: error.message,
          errorType: error.name
        });
      }
    }

    if (errors.length > 0) {
      const errorMessage = `Failed to update base video for ${errors.length} scene(s): ${errors.map(e => `Scene ${e.sceneNumber} (${e.videoTitle})`).join(', ')}`;
      console.error('❌ [SAVE-LAYERS] Some updates failed - throwing error', {
        errorMessage,
        failedCount: errors.length,
        errors: errors,
        partialSuccess: results.length > 0
      });
      throw new Error(errorMessage);
    }
    return {
      success: true,
      updatedScenes: results.map(r => r.sceneNumber),
      results: results
    };
  };

  // Save layers to API
  const saveLayers = useCallback(async () => {
    if (isSavingLayers) return;
    // Prevent multiple simultaneous saves
    if (isSavingLayers) {
      console.warn('⚠️ [SAVE-LAYERS] Save already in progress - ignoring click');
      return;
    }

    const session_id = localStorage.getItem('session_id');
    const user_id = localStorage.getItem('token');

    if (!session_id || !user_id) {
      setError('Missing session_id or user_id');
      return;
    }

    setIsSavingLayers(true);
    setError('');

    try {
      // =====================================================
      // STEP 1: DETECT BASE VIDEO CHANGES
      // =====================================================
      const baseVideoChanges = detectBaseVideoChanges();

      // =====================================================
      // STEP 2: UPDATE BASE VIDEOS IF CHANGES DETECTED
      // =====================================================
      if (baseVideoChanges.length > 0) {
        const updateStartTime = Date.now();
        const updateResult = await updateBaseVideos(baseVideoChanges);
        const updateDuration = Date.now() - updateStartTime;
        await refreshUserSessionData();
      } else {
      }

      // =====================================================
      // STEP 3: SAVE OTHER LAYERS (existing functionality)
      // =====================================================
      const currentOverlays = editorOverlaysRef.current || [];
      const savedOverlaysSnapshot = savedOverlaysSnapshotRef.current || [];

      const overlayChanges = detectOverlayChanges(currentOverlays, savedOverlaysSnapshot);
      const deletedOverlayIds = overlayChanges?.deletedOverlays || [];
      const modifiedOverlayIds = overlayChanges?.modifiedOverlays || [];
      const newOverlayIds = overlayChanges?.newOverlays || [];

      if (newOverlayIds.length > 0 && (deletedOverlayIds.length > 0 || modifiedOverlayIds.length > 0)) {
        setError('please save your previous work');
        setIsSavingLayers(false);
        return;
      }

      const fps = APP_CONFIG.fps || 30;
      const sceneFrameRanges = [];
      let cumulativeFrames = 0;

      items.forEach((video, index) => {
        const sceneNum = video.sceneNumber || video.scene_number || (index + 1);
        const videoDuration = video.duration ||
          video.videos?.v1?.duration ||
          video.videos?.duration ||
          10;
        const videoFrames = Math.round(videoDuration * fps);

        sceneFrameRanges.push({
          sceneNumber: sceneNum,
          startFrame: cumulativeFrames,
          endFrame: cumulativeFrames + videoFrames,
          video: video,
          duration: videoDuration,
          durationFrames: videoFrames
        });

        cumulativeFrames += videoFrames;
      });

      const findSceneNumberForFrame = (frame) => {
        if (!sceneFrameRanges.length) {
          return null;
        }
        const numericFrame = Number(frame);
        const safeFrame = !isNaN(numericFrame) && isFinite(numericFrame) && numericFrame >= 0 ? numericFrame : 0;
        for (let i = 0; i < sceneFrameRanges.length; i++) {
          const range = sceneFrameRanges[i];
          const isLastScene = i === sceneFrameRanges.length - 1;
          const isInRange = isLastScene
            ? safeFrame >= range.startFrame && safeFrame <= range.endFrame
            : safeFrame >= range.startFrame && safeFrame < range.endFrame;
          if (isInRange) {
            return range.sceneNumber;
          }
        }
        return null;
      };

      const getLayerNameForOverlay = (overlay) => {
        if (!overlay || !overlay.type) {
          return null;
        }
        const overlayId = String(overlay.id || '');
        if (overlay.type === OverlayType.CAPTION) {
          if (overlayId.startsWith('caption-')) {
            return 'subtitles';
          }
          return getLayerName(overlay.type);
        }
        if (overlay.type === OverlayType.IMAGE && overlayId.includes('logo-')) {
          return 'logo';
        }
        if (overlay.type === OverlayType.VIDEO && overlayId.includes('chart')) {
          return 'chart';
        }
        if (overlay.type === OverlayType.SOUND) {
          return 'audio';
        }
        if (overlay.type === OverlayType.TEXT) {
          return 'text_overlay';
        }
        return null;
      };

      const getNormalizedPositionAndBox = (overlay) => {
        let position = null;
        let boundingBox = null;

        if (overlay.position && typeof overlay.position.x === 'number' && typeof overlay.position.y === 'number') {
          position = {
            x: Math.max(0, Math.min(1, overlay.position.x)),
            y: Math.max(0, Math.min(1, overlay.position.y))
          };
        }

        if (overlay.bounding_box && typeof overlay.bounding_box.x === 'number' && typeof overlay.bounding_box.y === 'number' && typeof overlay.bounding_box.width === 'number' && typeof overlay.bounding_box.height === 'number') {
          boundingBox = {
            x: Math.max(0, Math.min(1, overlay.bounding_box.x)),
            y: Math.max(0, Math.min(1, overlay.bounding_box.y)),
            width: Math.max(0, Math.min(1, overlay.bounding_box.width)),
            height: Math.max(0, Math.min(1, overlay.bounding_box.height))
          };
        }

        if ((!position || !boundingBox) && overlay.left !== undefined && overlay.top !== undefined) {
          let canvasWidth = 1920;
          let canvasHeight = 1080;
          if (aspectRatio === '9:16' || aspectRatio === '9/16') {
            canvasWidth = 1080;
            canvasHeight = 1920;
          }
          const width = overlay.width || 0;
          const height = overlay.height || 0;
          if (!position) {
            const centerX = overlay.left + width / 2;
            const centerY = overlay.top + height / 2;
            position = {
              x: Math.max(0, Math.min(1, centerX / canvasWidth)),
              y: Math.max(0, Math.min(1, centerY / canvasHeight))
            };
          }
          if (!boundingBox && width > 0 && height > 0) {
            boundingBox = {
              x: Math.max(0, Math.min(1, overlay.left / canvasWidth)),
              y: Math.max(0, Math.min(1, overlay.top / canvasHeight)),
              width: Math.max(0, Math.min(1, width / canvasWidth)),
              height: Math.max(0, Math.min(1, height / canvasHeight))
            };
          }
        }

        return { position, bounding_box: boundingBox };
      };

      const computeTimingForOverlay = (overlay, sceneRangeLocal) => {
        if (!sceneRangeLocal) {
          return null;
        }
        let absoluteStartFrame = overlay.from;
        if (absoluteStartFrame === undefined || absoluteStartFrame === null || isNaN(absoluteStartFrame) || !isFinite(absoluteStartFrame)) {
          absoluteStartFrame = 0;
        } else {
          absoluteStartFrame = Number(absoluteStartFrame);
          if (isNaN(absoluteStartFrame) || !isFinite(absoluteStartFrame)) {
            absoluteStartFrame = 0;
          }
        }
        let overlayDurationFrames = overlay.durationInFrames;
        if (overlayDurationFrames === undefined || overlayDurationFrames === null || isNaN(overlayDurationFrames) || !isFinite(overlayDurationFrames) || overlayDurationFrames <= 0) {
          if (sceneRangeLocal && sceneRangeLocal.durationFrames && !isNaN(sceneRangeLocal.durationFrames) && sceneRangeLocal.durationFrames > 0) {
            overlayDurationFrames = sceneRangeLocal.durationFrames;
          } else {
            overlayDurationFrames = 5 * fps;
          }
        } else {
          overlayDurationFrames = Number(overlayDurationFrames);
          if (isNaN(overlayDurationFrames) || !isFinite(overlayDurationFrames) || overlayDurationFrames <= 0) {
            overlayDurationFrames = 5 * fps;
          }
        }
        let absoluteEndFrame = absoluteStartFrame + overlayDurationFrames;
        const sceneStartFrame = Number(sceneRangeLocal.startFrame || 0);
        let sceneEndFrame = sceneRangeLocal.endFrame !== undefined && sceneRangeLocal.endFrame !== null ? Number(sceneRangeLocal.endFrame) : null;
        if (sceneEndFrame !== null && !isNaN(sceneEndFrame) && isFinite(sceneEndFrame) && sceneEndFrame > 0) {
          absoluteEndFrame = Math.min(absoluteEndFrame, sceneEndFrame);
        }
        let relativeStartFrame = absoluteStartFrame - sceneStartFrame;
        if (!isNaN(relativeStartFrame) && isFinite(relativeStartFrame)) {
          relativeStartFrame = Math.max(0, relativeStartFrame);
        } else {
          relativeStartFrame = 0;
        }
        let relativeEndFrame = absoluteEndFrame - sceneStartFrame;
        if (!isNaN(relativeEndFrame) && isFinite(relativeEndFrame)) {
          relativeEndFrame = Math.max(relativeStartFrame + 1, relativeEndFrame);
        } else {
          relativeEndFrame = relativeStartFrame + 1;
        }
        const start = framesToTime(relativeStartFrame, fps);
        const end = framesToTime(relativeEndFrame, fps);
        if (!start || !end || typeof start !== 'string' || typeof end !== 'string' || start.includes('NaN') || end.includes('NaN') || start.includes('Infinity') || end.includes('Infinity')) {
          return null;
        }
        return { start, end };
      };

      const overlaysBySceneAndLayer = {};

      if (deletedOverlayIds.length > 0 || modifiedOverlayIds.length > 0) {
        for (const overlay of savedOverlaysSnapshot) {
          if (!overlay || overlay.id === undefined || overlay.id === null) {
            continue;
          }
          const layerName = getLayerNameForOverlay(overlay);
          if (!layerName) {
            continue;
          }
          const sceneNumber = overlay.sceneNumber || findSceneNumberForFrame(overlay.from || 0);
          if (!sceneNumber) {
            continue;
          }
          const key = `${sceneNumber}:${layerName}`;
          if (!overlaysBySceneAndLayer[key]) {
            overlaysBySceneAndLayer[key] = [];
          }
          overlaysBySceneAndLayer[key].push(overlay);
        }
      }

      if (modifiedOverlayIds.length > 0) {
        for (const modifiedId of modifiedOverlayIds) {
          const modifiedIdStr = String(modifiedId);
          const currentOverlay = currentOverlays.find(o => String(o?.id) === modifiedIdStr);
          if (!currentOverlay) {
            continue;
          }
          const savedOverlayForId = savedOverlaysSnapshot.find(o => String(o?.id) === modifiedIdStr);
          const layerName = getLayerNameForOverlay(currentOverlay) || getLayerNameForOverlay(savedOverlayForId);
          if (!layerName) {
            continue;
          }
          let sceneNumber = currentOverlay.sceneNumber || savedOverlayForId?.sceneNumber || findSceneNumberForFrame(currentOverlay.from || 0);
          if (!sceneNumber) {
            sceneNumber = selectedVideo?.sceneNumber || selectedVideo?.scene_number || sceneFrameRanges[0]?.sceneNumber || 1;
          }
          const sceneRangeLocal = sceneFrameRanges.find(r => r.sceneNumber === sceneNumber) || null;
          const key = `${sceneNumber}:${layerName}`;
          const overlaysInSceneLayer = overlaysBySceneAndLayer[key] || [];
          let layerIndex = null;
          if (layerName !== 'logo' && layerName !== 'subtitles') {
            let index = overlaysInSceneLayer.findIndex(o => String(o?.id) === modifiedIdStr);
            if (index < 0) {
              index = 0;
            }
            layerIndex = index;
          }

          const updates = {};

          if (layerName === 'text_overlay') {
            const text = currentOverlay.text || currentOverlay.content || '';
            if (text) {
              updates.text = text;
            }
            if (currentOverlay.styles?.fontSize) {
              const fontSize = parseInt(String(currentOverlay.styles.fontSize).replace('px', '')) || null;
              if (fontSize) {
                updates.fontSize = fontSize;
              }
            }
            if (currentOverlay.styles?.color) {
              updates.color = currentOverlay.styles.color;
            }
            if (currentOverlay.styles?.fontWeight) {
              updates.fontWeight = currentOverlay.styles.fontWeight;
            } else if (currentOverlay.styles?.bold || currentOverlay.styles?.fontWeight === 'bold') {
              updates.fontWeight = 'bold';
            }
            if (currentOverlay.styles?.textAlign) {
              updates.alignment = currentOverlay.styles.textAlign;
            } else if (currentOverlay.styles?.align) {
              updates.alignment = currentOverlay.styles.align;
            }
            const normalized = getNormalizedPositionAndBox(currentOverlay);
            if (normalized.position) {
              updates.position = normalized.position;
            }
            if (normalized.bounding_box) {
              updates.bounding_box = normalized.bounding_box;
            }
            const timing = computeTimingForOverlay(currentOverlay, sceneRangeLocal);
            if (timing) {
              updates.timing = timing;
            }
            if (currentOverlay.animation) {
              if (currentOverlay.animation.enter) {
                updates.enter_animation = currentOverlay.animation.enter;
              }
              if (currentOverlay.animation.exit) {
                updates.exit_animation = currentOverlay.animation.exit;
              }
            }
          } else if (layerName === 'logo') {
            if (currentOverlay.src) {
              updates.url = currentOverlay.src;
            }
            const normalized = getNormalizedPositionAndBox(currentOverlay);
            if (normalized.position) {
              updates.position = normalized.position;
            }
            if (normalized.bounding_box) {
              updates.bounding_box = normalized.bounding_box;
            }
            const timing = computeTimingForOverlay(currentOverlay, sceneRangeLocal);
            if (timing) {
              updates.timing = timing;
            }
          } else if (layerName === 'chart') {
            if (currentOverlay.src) {
              updates.url = currentOverlay.src;
            }
            if (currentOverlay.has_background !== undefined) {
              updates.has_background = currentOverlay.has_background;
            }
            const normalized = getNormalizedPositionAndBox(currentOverlay);
            if (normalized.position) {
              updates.position = normalized.position;
            }
            if (normalized.bounding_box) {
              updates.bounding_box = normalized.bounding_box;
            }
            const timing = computeTimingForOverlay(currentOverlay, sceneRangeLocal);
            if (timing) {
              updates.timing = timing;
            }
          } else if (layerName === 'audio') {
            const timing = computeTimingForOverlay(currentOverlay, sceneRangeLocal);
            if (timing) {
              updates.timing = timing;
            }
            if (currentOverlay.volume !== undefined) {
              updates.volume = currentOverlay.volume;
            }
          } else if (layerName === 'subtitles') {
            const normalized = getNormalizedPositionAndBox(currentOverlay);
            if (normalized.position) {
              updates.position = normalized.position;
            }
            if (normalized.bounding_box) {
              updates.bounding_box = normalized.bounding_box;
            }
            const timing = computeTimingForOverlay(currentOverlay, sceneRangeLocal);
            if (timing) {
              updates.timing = timing;
            }
          }

          if (Object.keys(updates).length === 0) {
            continue;
          }

          const layerSelector = {
            name: layerName
          };
          if (layerName !== 'logo' && layerName !== 'subtitles' && layerName !== 'chart' && layerIndex !== null) {
            layerSelector.index = Number(layerIndex);
          }

          const requestBody = {
            session_id: session_id,
            scene_number: sceneNumber,
            operation: "update_layer",
            layer_selector: layerSelector,
            updates: updates
          };

          const response = await fetch(
            'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/manage-layers',
            {
              method: 'PATCH',
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(requestBody)
            }
          );

          const responseText = await response.text();
          let responseData;
          try {
            responseData = JSON.parse(responseText);
          } catch {
            responseData = responseText;
          }

          if (!response.ok) {
            console.error('❌ [SAVE-LAYERS] Failed to update layer via manage-layers:', {
              sceneNumber,
              layerName,
              layerIndex,
              overlayId: modifiedIdStr,
              status: response.status,
              statusText: response.statusText,
              responseData,
              requestBody
            });
            throw new Error(`Failed to update layer: ${response.status} ${JSON.stringify(responseData)}`);
          }

          await refreshUserSessionData();
        }

        const currentSnapshotForUpdate = savedOverlaysSnapshotRef.current || [];
        const updatedSnapshotForUpdate = currentSnapshotForUpdate.map(overlay => {
          if (!overlay || overlay.id === undefined || overlay.id === null) {
            return overlay;
          }
          const current = currentOverlays.find(o => String(o?.id) === String(overlay.id));
          if (!current) {
            return overlay;
          }
          return current;
        });
        savedOverlaysSnapshotRef.current = JSON.parse(JSON.stringify(updatedSnapshotForUpdate));
      }

      if (deletedOverlayIds.length > 0) {
        for (const deletedId of deletedOverlayIds) {
          const deletedIdStr = String(deletedId);
          const overlay = savedOverlaysSnapshot.find(o => String(o?.id) === deletedIdStr);
          if (!overlay) {
            continue;
          }
          const layerName = getLayerNameForOverlay(overlay);
          if (!layerName) {
            continue;
          }
          let sceneNumber = overlay.sceneNumber || findSceneNumberForFrame(overlay.from || 0);
          if (!sceneNumber) {
            sceneNumber = selectedVideo?.sceneNumber || selectedVideo?.scene_number || sceneFrameRanges[0]?.sceneNumber || 1;
          }
          const key = `${sceneNumber}:${layerName}`;
          const overlaysInSceneLayer = overlaysBySceneAndLayer[key] || [];
          let layerIndex = 0;
          if (overlaysInSceneLayer.length > 0) {
            const index = overlaysInSceneLayer.findIndex(o => String(o?.id) === deletedIdStr);
            if (index >= 0) {
              layerIndex = index;
            }
          }

          try {
            await deleteLayer(sceneNumber, layerName, layerIndex);
          } catch (error) {
            console.error('❌ [SAVE-LAYERS] Failed to delete layer via manage-layers:', {
              sceneNumber,
              layerName,
              layerIndex,
              overlayId: deletedIdStr,
              error
            });
            throw error;
          }

          const keyOverlays = overlaysBySceneAndLayer[key];
          if (keyOverlays) {
            const index = keyOverlays.findIndex(o => String(o?.id) === deletedIdStr);
            if (index >= 0) {
              keyOverlays.splice(index, 1);
            }
          }
        }

        const deletedIdSet = new Set(deletedOverlayIds.map(id => String(id)));
        const currentSnapshot = savedOverlaysSnapshotRef.current || [];
        const updatedSnapshot = currentSnapshot.filter(overlay => !deletedIdSet.has(String(overlay?.id)));
        savedOverlaysSnapshotRef.current = JSON.parse(JSON.stringify(updatedSnapshot));
        deletedIdSet.forEach(id => {
          if (savedOverlayIdsRef.current.has(id)) {
            savedOverlayIdsRef.current.delete(id);
          }
        });
      }

      if (currentOverlays.length > 0) {
        const savedIds = savedOverlayIdsRef.current;

        // Find only NEWLY ADDED overlays (overlays that exist in current but not in saved snapshot)
        // Use overlay IDs to determine which overlays are new
        const savedOverlayIdsSet = new Set(savedOverlaysSnapshot.map(o => o?.id).filter(Boolean));

        // CRITICAL: Only include overlays that are NOT in the saved snapshot AND NOT already marked as saved
        // This ensures we only save truly new overlays, not existing ones that were already saved
        const newlyAddedOverlays = currentOverlays.filter(overlay => {
          const overlayId = overlay?.id;
          if (overlayId === undefined || overlayId === null) {
            return false; // Skip overlays without valid IDs
          }

          // Only include if:
          // 1. NOT in the saved snapshot (means it's new or was added after last snapshot update)
          // 2. NOT already marked as saved (means it hasn't been saved via API yet)
          const isInSnapshot = savedOverlayIdsSet.has(overlayId);
          const isAlreadySaved = savedIds.has(overlayId);
          const shouldSave = !isInSnapshot && !isAlreadySaved;

          if (!shouldSave) {
          }

          return shouldSave;
        });
        // Only save newly added overlays, not all unsaved overlays
        const overlaysToSave = newlyAddedOverlays;

        if (overlaysToSave.length > 0) {
          // Group overlays by scene number based on frame position
          const overlaysByScene = {};

          for (const overlay of overlaysToSave) {
            const overlayStartFrame = overlay.from || 0;
            // Calculate end frame from from + durationInFrames (overlays don't have a 'to' property)
            const overlayDurationFrames = overlay.durationInFrames || (5 * fps); // Default 5 seconds if duration not specified
            const overlayEndFrame = overlayStartFrame + overlayDurationFrames;
            // Find which scene this overlay belongs to based on frame position
            // Use overlay start frame to determine scene
            let targetScene = null;
            let matchedRange = null;

            for (const range of sceneFrameRanges) {
              // Check if overlay start frame falls within this scene's range
              // Use >= startFrame and < endFrame to ensure proper boundary detection
              // For the last scene, use <= endFrame to include the boundary
              const isLastScene = range === sceneFrameRanges[sceneFrameRanges.length - 1];
              const isInRange = isLastScene
                ? (overlayStartFrame >= range.startFrame && overlayStartFrame <= range.endFrame)
                : (overlayStartFrame >= range.startFrame && overlayStartFrame < range.endFrame);

              if (isInRange) {
                targetScene = range.sceneNumber;
                matchedRange = range;
                break;
              }
            }

            // Fallback: if not found in ranges, try to match by video properties or use first scene
            if (!targetScene) {
              console.warn('⚠️ [SAVE-LAYERS] Overlay frame position not found in any scene range', {
                overlayStartFrame,
                overlayEndFrame,
                availableRanges: sceneFrameRanges.map(r => ({
                  scene: r.sceneNumber,
                  start: r.startFrame,
                  end: r.endFrame
                }))
              });
              // Try to match overlay to video by checking if overlay src matches video base_video_url
              const overlaySrc = overlay.src || overlay.content;
              if (overlaySrc) {
                for (const range of sceneFrameRanges) {
                  const videoUrl = range.video.videos?.v1?.base_video_url ||
                    range.video.videos?.base_video_url ||
                    range.video.baseVideoUrl ||
                    range.video.url;
                  if (videoUrl && overlaySrc.includes(videoUrl.split('/').pop())) {
                    targetScene = range.sceneNumber;
                    break;
                  }
                }
              }

              // Final fallback: use first scene or selected video scene
              if (!targetScene) {
                targetScene = selectedVideo?.sceneNumber || selectedVideo?.scene_number || sceneFrameRanges[0]?.sceneNumber || 1;
                console.warn('⚠️ [SAVE-LAYERS] Could not determine scene for overlay, using fallback', {
                  overlayId: overlay.id,
                  overlayStartFrame: overlayStartFrame,
                  fallbackScene: targetScene
                });
              }
            }

            if (!overlaysByScene[targetScene]) {
              overlaysByScene[targetScene] = [];
            }
            overlaysByScene[targetScene].push(overlay);
          }

          // Track which overlay IDs were saved in THIS save operation
          const overlaysSavedInThisOperation = new Set();

          // Save overlays for each scene separately
          for (const [sceneNumStr, sceneOverlays] of Object.entries(overlaysByScene)) {
            const sceneNumber = parseInt(sceneNumStr);

            if (!sceneNumber) {
              console.warn('⚠️ [SAVE-LAYERS] Invalid scene number, skipping', { sceneNumStr });
              continue;
            }
            // Find the scene frame range for this scene to calculate relative timing
            const sceneRange = sceneFrameRanges.find(r => r.sceneNumber === sceneNumber);
            if (!sceneRange) {
              console.warn('⚠️ [SAVE-LAYERS] Scene range not found for scene', sceneNumber);
              continue;
            }
            // Separate text overlays from other overlays
            const textOverlays = [];
            const otherOverlays = [];

            for (const overlay of sceneOverlays) {
              if (overlay.type === OverlayType.TEXT || overlay.type === OverlayType.CAPTION) {
                textOverlays.push(overlay);
              } else {
                otherOverlays.push(overlay);
              }
            }

            // Sort overlays by start time to ensure correct order
            textOverlays.sort((a, b) => {
              const startA = a.from || 0;
              const startB = b.from || 0;
              return startA - startB;
            });

            otherOverlays.sort((a, b) => {
              const startA = a.from || 0;
              const startB = b.from || 0;
              return startA - startB;
            });

            // Process text overlays individually with start_time and end_time at root level
            for (const overlay of textOverlays) {
              const layerName = getLayerName(overlay.type);

              // STEP 1: Read actual timeline position from overlay object
              // Get start frame from timeline (overlay.from)
              let absoluteStartFrame = overlay.from;
              if (absoluteStartFrame === undefined || absoluteStartFrame === null || isNaN(absoluteStartFrame) || !isFinite(absoluteStartFrame)) {
                console.warn('⚠️ [SAVE-LAYERS] Invalid overlay.from in timeline (text), using 0:', {
                  overlayId: overlay.id,
                  overlayType: overlay.type,
                  overlayFrom: overlay.from,
                  overlayKeys: Object.keys(overlay)
                });
                absoluteStartFrame = 0;
              } else {
                absoluteStartFrame = Number(absoluteStartFrame);
                if (isNaN(absoluteStartFrame) || !isFinite(absoluteStartFrame)) {
                  console.error('❌ [SAVE-LAYERS] overlay.from is NaN after conversion (text), using 0:', overlay.from);
                  absoluteStartFrame = 0;
                }
              }

              // Get duration from timeline (overlay.durationInFrames)
              let overlayDurationFrames = overlay.durationInFrames;

              // STEP 2: Validate and fix duration if missing/invalid
              if (overlayDurationFrames === undefined || overlayDurationFrames === null || isNaN(overlayDurationFrames) || !isFinite(overlayDurationFrames) || overlayDurationFrames <= 0) {
                // Try to calculate from scene duration first
                if (sceneRange && sceneRange.durationFrames && !isNaN(sceneRange.durationFrames) && sceneRange.durationFrames > 0) {
                  // Use scene duration as fallback (but cap it reasonably)
                  overlayDurationFrames = Math.min(sceneRange.durationFrames, 30 * fps); // Max 30 seconds
                  console.warn('⚠️ [SAVE-LAYERS] Overlay missing durationInFrames in timeline, using scene duration (text):', {
                    overlayId: overlay.id,
                    overlayType: overlay.type,
                    sceneDurationFrames: sceneRange.durationFrames,
                    calculatedDuration: overlayDurationFrames,
                    overlayFrom: absoluteStartFrame
                  });
                } else {
                  // Final fallback: default 5 seconds
                  overlayDurationFrames = 5 * fps;
                  console.warn('⚠️ [SAVE-LAYERS] Overlay missing durationInFrames in timeline, using default 5 seconds (text):', {
                    overlayId: overlay.id,
                    overlayType: overlay.type,
                    defaultDuration: overlayDurationFrames,
                    overlayFrom: absoluteStartFrame
                  });
                }
              } else {
                // Ensure it's a valid number
                overlayDurationFrames = Number(overlayDurationFrames);
                if (isNaN(overlayDurationFrames) || !isFinite(overlayDurationFrames) || overlayDurationFrames <= 0) {
                  overlayDurationFrames = 5 * fps;
                  console.warn('⚠️ [SAVE-LAYERS] Overlay durationInFrames was invalid in timeline, using default (text):', {
                    overlayId: overlay.id,
                    originalDuration: overlay.durationInFrames,
                    defaultDuration: overlayDurationFrames
                  });
                }
              }

              // STEP 3: Calculate end frame from timeline position
              // End frame = start frame + duration
              let absoluteEndFrame = absoluteStartFrame + overlayDurationFrames;
              // STEP 4: Calculate relative frame positions within the scene

              // Validate absoluteEndFrame - must be a valid finite number
              if (isNaN(absoluteEndFrame) || !isFinite(absoluteEndFrame)) {
                console.error('❌ [SAVE-LAYERS] absoluteEndFrame is NaN/Invalid for text overlay, using fallback:', {
                  overlayId: overlay.id,
                  absoluteStartFrame,
                  overlayDurationFrames,
                  calculated: absoluteEndFrame
                });
                // Use safe fallback: start frame + 5 seconds
                absoluteEndFrame = absoluteStartFrame + (5 * fps);
                // Validate the fallback too
                if (isNaN(absoluteEndFrame) || !isFinite(absoluteEndFrame)) {
                  console.error('❌ [SAVE-LAYERS] Fallback absoluteEndFrame is also invalid for text overlay, using hardcoded value');
                  absoluteEndFrame = 150; // Hardcoded 5 seconds at 30fps
                }
              }

              // Ensure end frame doesn't exceed scene end
              // CRITICAL: Validate sceneRange.endFrame before using Math.min to prevent NaN
              if (sceneRange && sceneRange.endFrame !== undefined && sceneRange.endFrame !== null) {
                const sceneEndFrame = Number(sceneRange.endFrame);
                if (!isNaN(sceneEndFrame) && isFinite(sceneEndFrame) && sceneEndFrame > 0) {
                  absoluteEndFrame = Math.min(absoluteEndFrame, sceneEndFrame);
                  // Validate the result after Math.min
                  if (isNaN(absoluteEndFrame) || !isFinite(absoluteEndFrame)) {
                    console.error('❌ [SAVE-LAYERS] absoluteEndFrame became NaN after Math.min for text overlay, reverting:', {
                      overlayId: overlay.id,
                      beforeMin: absoluteStartFrame + overlayDurationFrames,
                      sceneEndFrame,
                      afterMin: absoluteEndFrame
                    });
                    // Recalculate without scene constraint
                    absoluteEndFrame = absoluteStartFrame + overlayDurationFrames;
                  }
                }
              }

              // Calculate relative frames (relative to scene start at frame 0)
              // CRITICAL: Ensure sceneStartFrame is ALWAYS a valid number
              let sceneStartFrame = 0;
              if (sceneRange && sceneRange.startFrame !== undefined && sceneRange.startFrame !== null) {
                sceneStartFrame = Number(sceneRange.startFrame);
                if (isNaN(sceneStartFrame) || !isFinite(sceneStartFrame)) {
                  console.warn('⚠️ [SAVE-LAYERS] Invalid sceneRange.startFrame for text overlay, using 0:', sceneRange.startFrame);
                  sceneStartFrame = 0;
                }
              }

              // CRITICAL: Calculate relative frames with validation at each step
              let relativeStartFrame = absoluteStartFrame - sceneStartFrame;
              relativeStartFrame = Math.max(0, relativeStartFrame); // Ensure non-negative

              let relativeEndFrame = absoluteEndFrame - sceneStartFrame;
              relativeEndFrame = Math.max(0, relativeEndFrame); // Ensure non-negative

              // Validate and fix relative frames before converting to time
              if (isNaN(relativeStartFrame) || !isFinite(relativeStartFrame)) {
                console.error('❌ [SAVE-LAYERS] relativeStartFrame is NaN/Invalid for text overlay, using 0:', {
                  overlayId: overlay.id,
                  absoluteStartFrame,
                  sceneStartFrame,
                  calculated: relativeStartFrame
                });
                relativeStartFrame = 0;
              }

              if (isNaN(relativeEndFrame) || !isFinite(relativeEndFrame)) {
                console.error('❌ [SAVE-LAYERS] relativeEndFrame is NaN/Invalid for text overlay, using default:', {
                  overlayId: overlay.id,
                  absoluteEndFrame,
                  sceneStartFrame,
                  calculated: relativeEndFrame
                });
                // Set end frame to be at least 5 seconds (150 frames at 30fps) after start frame
                relativeEndFrame = relativeStartFrame + (5 * fps);
                // Validate the fallback
                if (isNaN(relativeEndFrame) || !isFinite(relativeEndFrame)) {
                  console.error('❌ [SAVE-LAYERS] Fallback relativeEndFrame is also invalid for text overlay, using hardcoded value');
                  relativeEndFrame = relativeStartFrame + 150; // Hardcoded 5 seconds at 30fps
                }
              }

              // Ensure end frame is greater than start frame (minimum 1 frame difference)
              if (relativeEndFrame <= relativeStartFrame) {
                console.warn('⚠️ [SAVE-LAYERS] relativeEndFrame <= relativeStartFrame for text overlay, adjusting:', {
                  overlayId: overlay.id,
                  relativeStartFrame,
                  relativeEndFrame
                });
                relativeEndFrame = relativeStartFrame + 1;
              }

              // CRITICAL: Final validation before converting to time
              // Ensure both values are valid numbers
              if (isNaN(relativeStartFrame) || !isFinite(relativeStartFrame)) {
                console.error('❌ [SAVE-LAYERS] Final validation failed for relativeStartFrame (text overlay), using 0');
                relativeStartFrame = 0;
              }
              if (isNaN(relativeEndFrame) || !isFinite(relativeEndFrame)) {
                console.error('❌ [SAVE-LAYERS] Final validation failed for relativeEndFrame (text overlay), using default');
                relativeEndFrame = relativeStartFrame + (5 * fps);
                if (isNaN(relativeEndFrame) || !isFinite(relativeEndFrame)) {
                  relativeEndFrame = 150; // Hardcoded fallback
                }
              }

              // CRITICAL: Validate relativeEndFrame one more time before converting to time
              if (isNaN(relativeEndFrame) || !isFinite(relativeEndFrame) || relativeEndFrame <= 0) {
                console.error('❌ [SAVE-LAYERS] relativeEndFrame is STILL invalid right before framesToTime (text), forcing safe value:', {
                  overlayId: overlay.id,
                  relativeEndFrame,
                  relativeStartFrame,
                  absoluteEndFrame,
                  absoluteStartFrame,
                  overlayDurationFrames
                });
                relativeEndFrame = Math.max(relativeStartFrame + 1, 150); // At least 1 frame after start, minimum 150 frames
              }

              // Convert relative frames to time (HH:MM:SS format)
              const startTime = framesToTime(relativeStartFrame, fps);
              let endTime = framesToTime(relativeEndFrame, fps);

              // CRITICAL: Validate endTime immediately after conversion
              if (!endTime || typeof endTime !== 'string' || endTime.includes('NaN') || endTime.includes('Infinity')) {
                console.error('❌ [SAVE-LAYERS] endTime is invalid immediately after framesToTime (text), recalculating:', {
                  overlayId: overlay.id,
                  endTime,
                  relativeEndFrame,
                  fps
                });
                // Force recalculation with safe values
                const safeEndFrame = Math.max(relativeStartFrame + 1, 150);
                endTime = framesToTime(safeEndFrame, fps);
                // If still invalid, use hardcoded default
                if (!endTime || typeof endTime !== 'string' || endTime.includes('NaN') || endTime.includes('Infinity')) {
                  console.error('❌ [SAVE-LAYERS] endTime still invalid after recalculation (text), using hardcoded default');
                  endTime = '00:00:05'; // Hardcoded 5 seconds
                }
              }
              // Build layer object for text overlay
              const layer = {
                name: layerName
              };

              // Text overlay - match exact API format
              const text = overlay.text || overlay.content || '';
              layer.text = text;

              // Font size (camelCase: fontSize)
              if (overlay.styles?.fontSize) {
                const fontSize = parseInt(overlay.styles.fontSize.replace('px', '')) || null;
                if (fontSize) layer.fontSize = fontSize;
              }

              // Font family (camelCase: fontFamily)
              if (overlay.styles?.fontFamily) {
                layer.fontFamily = overlay.styles.fontFamily;
              }

              // Font weight (camelCase: fontWeight)
              if (overlay.styles?.fontWeight) {
                layer.fontWeight = overlay.styles.fontWeight;
              } else if (overlay.styles?.bold || overlay.styles?.fontWeight === 'bold') {
                layer.fontWeight = 'bold';
              } else {
                layer.fontWeight = 'normal';
              }

              // Color (use 'color' not 'fill')
              if (overlay.styles?.color) {
                layer.color = overlay.styles.color;
              }

              // Alignment (text alignment)
              if (overlay.styles?.textAlign) {
                layer.alignment = overlay.styles.textAlign;
              } else if (overlay.styles?.align) {
                layer.alignment = overlay.styles.align;
              } else {
                layer.alignment = 'center'; // Default
              }

              // Position as object {x, y} (0.0 to 1.0 scale)
              const canvasWidth = 1280; // Default canvas width
              const canvasHeight = 720; // Default canvas height
              const position = {};

              if (overlay.left !== undefined) {
                position.x = overlay.left / canvasWidth;
              } else {
                position.x = 0.5; // Default center
              }

              if (overlay.top !== undefined) {
                position.y = overlay.top / canvasHeight;
              } else {
                position.y = 0.5; // Default center
              }

              layer.position = position;

              // Bounding box (optional) - if overlay has width and height
              if (overlay.width !== undefined && overlay.height !== undefined) {
                layer.bounding_box = {
                  x: position.x - (overlay.width / canvasWidth / 2),
                  y: position.y - (overlay.height / canvasHeight / 2),
                  width: overlay.width / canvasWidth,
                  height: overlay.height / canvasHeight
                };
              } else if (overlay.styles?.bounding_box) {
                // Use provided bounding box if available
                layer.bounding_box = overlay.styles.bounding_box;
              }
              // Validate startTime and endTime before building request body
              if (!startTime || startTime.includes('NaN') || !endTime || endTime.includes('NaN')) {
                console.error('❌ [SAVE-LAYERS] Invalid time values, skipping overlay:', {
                  overlayId: overlay.id,
                  startTime,
                  endTime,
                  relativeStartFrame,
                  relativeEndFrame,
                  absoluteStartFrame,
                  absoluteEndFrame,
                  sceneStartFrame: sceneRange.startFrame,
                  sceneEndFrame: sceneRange.endFrame
                });
                continue; // Skip this overlay if times are invalid
              }

              // Ensure end_time is greater than start_time (minimum 1 frame difference = 1/30 second)
              if (relativeEndFrame <= relativeStartFrame) {
                console.warn('⚠️ [SAVE-LAYERS] end_time is not greater than start_time, adjusting:', {
                  overlayId: overlay.id,
                  originalStartTime: startTime,
                  originalEndTime: endTime,
                  relativeStartFrame,
                  relativeEndFrame
                });
                // Set end_time to be at least 1 frame (1/30 second) after start_time
                const minEndFrame = relativeStartFrame + 1;
                endTime = framesToTime(minEndFrame, fps);
              }

              // CRITICAL: Final validation right before building request body
              // Re-check endTime after any adjustments to ensure it's still valid
              if (!endTime || typeof endTime !== 'string' || endTime.includes('NaN') || endTime.includes('Infinity')) {
                console.error('❌ [SAVE-LAYERS] endTime is invalid after adjustments (text overlay), recalculating with safe defaults:', {
                  overlayId: overlay.id,
                  endTime,
                  relativeStartFrame,
                  relativeEndFrame,
                  fps
                });
                // Force a safe endTime: at least 1 frame after start
                const safeEndFrame = Math.max(relativeStartFrame + 1, 150); // At least 150 frames (5 seconds at 30fps)
                endTime = framesToTime(safeEndFrame, fps);
              }

              // Final check: if endTime is still invalid, skip this overlay entirely
              if (!endTime || typeof endTime !== 'string' || endTime.includes('NaN') || endTime.includes('Infinity')) {
                console.error('❌ [SAVE-LAYERS] endTime is still invalid after recalculation (text overlay), skipping overlay:', {
                  overlayId: overlay.id,
                  endTime,
                  relativeStartFrame,
                  relativeEndFrame
                });
                continue; // Skip this overlay completely
              }

              // Build request body with start_time and end_time at root level (not in operations array)
              const requestBody = {
                session_id: session_id,
                scene_number: sceneNumber,
                operation: "add_layer",
                layer: layer,
                start_time: startTime,
                end_time: endTime
              };
              // Send individual request for this text overlay
              const response = await fetch(
                'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/manage-layers',
                {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(requestBody)
                }
              );

              const responseText = await response.text();
              let responseData;
              try {
                responseData = JSON.parse(responseText);
              } catch {
                responseData = responseText;
              }

              if (!response.ok) {
                const errorMsg = `Failed to save text overlay for scene ${sceneNumber}: ${response.status} ${JSON.stringify(responseData)}`;
                console.error('❌ [SAVE-LAYERS] API request failed for text overlay:', {
                  sceneNumber,
                  overlayId: overlay.id,
                  status: response.status,
                  statusText: response.statusText,
                  responseData,
                  requestBody: {
                    ...requestBody,
                    layer: { ...layer, text: layer.text?.substring(0, 50) + '...' }
                  },
                  startTime,
                  endTime
                });
                throw new Error(errorMsg);
              }

              await refreshUserSessionData();

              // Mark overlay as saved
              if (overlay?.id !== undefined) {
                savedOverlayIdsRef.current.add(overlay.id);
                overlaysSavedInThisOperation.add(overlay.id);
              }
            }

            // Process other overlays (non-text) - send individual add_layer requests
            for (const overlay of otherOverlays) {
              // STEP 1: Read actual timeline position from overlay object
              // Get start frame from timeline (overlay.from)
              let absoluteStartFrame = overlay.from;
              if (absoluteStartFrame === undefined || absoluteStartFrame === null || isNaN(absoluteStartFrame) || !isFinite(absoluteStartFrame)) {
                console.warn('⚠️ [SAVE-LAYERS] Invalid overlay.from in timeline (non-text), using 0:', {
                  overlayId: overlay.id,
                  overlayType: overlay.type,
                  overlayFrom: overlay.from,
                  overlayKeys: Object.keys(overlay)
                });
                absoluteStartFrame = 0;
              } else {
                absoluteStartFrame = Number(absoluteStartFrame);
                if (isNaN(absoluteStartFrame) || !isFinite(absoluteStartFrame)) {
                  console.error('❌ [SAVE-LAYERS] overlay.from is NaN after conversion (non-text), using 0:', overlay.from);
                  absoluteStartFrame = 0;
                }
              }

              // Get duration from timeline (overlay.durationInFrames)
              // STEP 2: Validate and fix duration if missing/invalid
              let overlayDurationFrames = overlay.durationInFrames;

              if (overlayDurationFrames === undefined || overlayDurationFrames === null || isNaN(overlayDurationFrames) || !isFinite(overlayDurationFrames) || overlayDurationFrames <= 0) {
                // Try to calculate from scene duration first
                if (sceneRange && sceneRange.durationFrames && !isNaN(sceneRange.durationFrames) && sceneRange.durationFrames > 0) {
                  // Use scene duration as fallback (but cap it reasonably)
                  overlayDurationFrames = Math.min(sceneRange.durationFrames, 30 * fps); // Max 30 seconds
                  console.warn('⚠️ [SAVE-LAYERS] Overlay missing durationInFrames in timeline, using scene duration (non-text):', {
                    overlayId: overlay.id,
                    overlayType: overlay.type,
                    sceneDurationFrames: sceneRange.durationFrames,
                    calculatedDuration: overlayDurationFrames,
                    overlayFrom: absoluteStartFrame
                  });
                } else {
                  // Final fallback: default 5 seconds
                  overlayDurationFrames = 5 * fps;
                  console.warn('⚠️ [SAVE-LAYERS] Overlay missing durationInFrames in timeline, using default 5 seconds (non-text):', {
                    overlayId: overlay.id,
                    overlayType: overlay.type,
                    defaultDuration: overlayDurationFrames,
                    overlayFrom: absoluteStartFrame
                  });
                }
              } else {
                // Ensure it's a valid number
                overlayDurationFrames = Number(overlayDurationFrames);
                if (isNaN(overlayDurationFrames) || !isFinite(overlayDurationFrames) || overlayDurationFrames <= 0) {
                  overlayDurationFrames = 5 * fps;
                  console.warn('⚠️ [SAVE-LAYERS] Overlay durationInFrames was invalid in timeline, using default (non-text):', {
                    overlayId: overlay.id,
                    overlayType: overlay.type,
                    originalDuration: overlay.durationInFrames,
                    defaultDuration: overlayDurationFrames
                  });
                }
              }

              // STEP 3: Calculate end frame from timeline position
              // End frame = start frame + duration
              let absoluteEndFrame = absoluteStartFrame + overlayDurationFrames;
              // STEP 4: Calculate relative frame positions within the scene
              // (absoluteStartFrame and absoluteEndFrame are already calculated above from timeline)

              // Validate absoluteEndFrame - must be a valid finite number
              if (isNaN(absoluteEndFrame) || !isFinite(absoluteEndFrame)) {
                console.error('❌ [SAVE-LAYERS] absoluteEndFrame is NaN/Invalid for non-text overlay, using fallback:', {
                  overlayId: overlay.id,
                  overlayType: overlay.type,
                  absoluteStartFrame,
                  overlayDurationFrames,
                  calculated: absoluteEndFrame
                });
                // Use safe fallback: start frame + 5 seconds
                absoluteEndFrame = absoluteStartFrame + (5 * fps);
                // Validate the fallback too
                if (isNaN(absoluteEndFrame) || !isFinite(absoluteEndFrame)) {
                  console.error('❌ [SAVE-LAYERS] Fallback absoluteEndFrame is also invalid, using hardcoded value');
                  absoluteEndFrame = 150; // Hardcoded 5 seconds at 30fps
                }
              }

              // Ensure end frame doesn't exceed scene end
              if (sceneRange && sceneRange.endFrame !== undefined && !isNaN(sceneRange.endFrame)) {
                absoluteEndFrame = Math.min(absoluteEndFrame, sceneRange.endFrame);
              }

              // Calculate relative frames (relative to scene start at frame 0)
              // CRITICAL: Ensure sceneStartFrame is ALWAYS a valid number
              let sceneStartFrame = 0;
              if (sceneRange && sceneRange.startFrame !== undefined && sceneRange.startFrame !== null) {
                sceneStartFrame = Number(sceneRange.startFrame);
                if (isNaN(sceneStartFrame) || !isFinite(sceneStartFrame)) {
                  console.warn('⚠️ [SAVE-LAYERS] Invalid sceneRange.startFrame, using 0:', sceneRange.startFrame);
                  sceneStartFrame = 0;
                }
              }

              // CRITICAL: Calculate relative frames with validation at each step
              let relativeStartFrame = absoluteStartFrame - sceneStartFrame;
              relativeStartFrame = Math.max(0, relativeStartFrame); // Ensure non-negative

              let relativeEndFrame = absoluteEndFrame - sceneStartFrame;
              relativeEndFrame = Math.max(0, relativeEndFrame); // Ensure non-negative

              // Validate and fix relative frames before converting to time
              if (isNaN(relativeStartFrame) || !isFinite(relativeStartFrame)) {
                console.error('❌ [SAVE-LAYERS] relativeStartFrame is NaN/Invalid for non-text overlay, using 0:', {
                  overlayId: overlay.id,
                  overlayType: overlay.type,
                  absoluteStartFrame,
                  sceneStartFrame,
                  calculated: relativeStartFrame
                });
                relativeStartFrame = 0;
              }

              if (isNaN(relativeEndFrame) || !isFinite(relativeEndFrame)) {
                console.error('❌ [SAVE-LAYERS] relativeEndFrame is NaN/Invalid for non-text overlay, using default:', {
                  overlayId: overlay.id,
                  overlayType: overlay.type,
                  absoluteEndFrame,
                  sceneStartFrame,
                  calculated: relativeEndFrame
                });
                // Set end frame to be at least 5 seconds (150 frames at 30fps) after start frame
                relativeEndFrame = relativeStartFrame + (5 * fps);
                // Validate the fallback
                if (isNaN(relativeEndFrame) || !isFinite(relativeEndFrame)) {
                  console.error('❌ [SAVE-LAYERS] Fallback relativeEndFrame is also invalid, using hardcoded value');
                  relativeEndFrame = relativeStartFrame + 150; // Hardcoded 5 seconds at 30fps
                }
              }

              // Ensure end frame is greater than start frame (minimum 1 frame difference)
              if (relativeEndFrame <= relativeStartFrame) {
                console.warn('⚠️ [SAVE-LAYERS] relativeEndFrame <= relativeStartFrame for non-text overlay, adjusting:', {
                  overlayId: overlay.id,
                  overlayType: overlay.type,
                  relativeStartFrame,
                  relativeEndFrame
                });
                relativeEndFrame = relativeStartFrame + 1;
              }

              // CRITICAL: Final validation before converting to time
              // Ensure both values are valid numbers
              if (isNaN(relativeStartFrame) || !isFinite(relativeStartFrame)) {
                console.error('❌ [SAVE-LAYERS] Final validation failed for relativeStartFrame, using 0');
                relativeStartFrame = 0;
              }
              if (isNaN(relativeEndFrame) || !isFinite(relativeEndFrame)) {
                console.error('❌ [SAVE-LAYERS] Final validation failed for relativeEndFrame, using default');
                relativeEndFrame = relativeStartFrame + (5 * fps);
                if (isNaN(relativeEndFrame) || !isFinite(relativeEndFrame)) {
                  relativeEndFrame = 150; // Hardcoded fallback
                }
              }

              // CRITICAL: Validate relativeEndFrame one more time before converting to time
              if (isNaN(relativeEndFrame) || !isFinite(relativeEndFrame) || relativeEndFrame <= 0) {
                console.error('❌ [SAVE-LAYERS] relativeEndFrame is STILL invalid right before framesToTime (non-text), forcing safe value:', {
                  overlayId: overlay.id,
                  overlayType: overlay.type,
                  relativeEndFrame,
                  relativeStartFrame,
                  absoluteEndFrame,
                  absoluteStartFrame,
                  overlayDurationFrames
                });
                relativeEndFrame = Math.max(relativeStartFrame + 1, 150); // At least 1 frame after start, minimum 150 frames
              }

              // Convert relative frames to time (HH:MM:SS format)
              const startTime = framesToTime(relativeStartFrame, fps);
              let endTime = framesToTime(relativeEndFrame, fps);

              // CRITICAL: Validate endTime immediately after conversion
              if (!endTime || typeof endTime !== 'string' || endTime.includes('NaN') || endTime.includes('Infinity')) {
                console.error('❌ [SAVE-LAYERS] endTime is invalid immediately after framesToTime (non-text), recalculating:', {
                  overlayId: overlay.id,
                  overlayType: overlay.type,
                  endTime,
                  relativeEndFrame,
                  fps
                });
                // Force recalculation with safe values
                const safeEndFrame = Math.max(relativeStartFrame + 1, 150);
                endTime = framesToTime(safeEndFrame, fps);
                // If still invalid, use hardcoded default
                if (!endTime || typeof endTime !== 'string' || endTime.includes('NaN') || endTime.includes('Infinity')) {
                  console.error('❌ [SAVE-LAYERS] endTime still invalid after recalculation (non-text), using hardcoded default');
                  endTime = '00:00:05'; // Hardcoded 5 seconds
                }
              }
              // Build layer object
              let layer = {};

              // Determine layer name based on purpose or file type
              let layerName = getLayerName(overlay.type);
              let purpose = null;

              // Add type-specific fields for non-text overlays
              // Handle SHAPE overlays - convert to image and upload
              if (overlay.type === OverlayType.SHAPE) {
                try {
                  // Convert shape to image blob
                  const shapeBlob = await convertShapeToImageBlob(overlay);
                  // Create a blob URL for upload
                  const shapeBlobUrl = URL.createObjectURL(shapeBlob);

                  // Generate filename
                  const fileName = `scene-${sceneNumber}-shape-${overlay.id || Date.now()}.png`;
                  const mimeType = 'image/png';
                  purpose = 'custom_sticker'; // Shapes are treated as custom stickers
                  layerName = 'custom_sticker';

                  const uploadLayerName = overlay.name || `shape_${overlay.shapeType}_${overlay.id || Date.now()}`;

                  const uploadMetadata = {
                    purpose: purpose,
                    layer_name: uploadLayerName
                  };

                  // Upload the shape blob
                  const uploadedFileInfo = await uploadBlobUrl(
                    shapeBlobUrl,
                    fileName,
                    mimeType,
                    session_id,
                    uploadMetadata
                  );

                  // Clean up the blob URL
                  URL.revokeObjectURL(shapeBlobUrl);
                  // Use the file_url from the response
                  layer.url = uploadedFileInfo.file_url;

                  // Use the purpose as the layer name for manage-layers API
                  if (uploadedFileInfo.purpose) {
                    layerName = uploadedFileInfo.purpose;
                  }
                } catch (shapeError) {
                  console.error('❌ [SAVE-LAYERS] Failed to convert/upload shape:', shapeError);
                  throw new Error(`Failed to convert/upload shape: ${shapeError.message}`);
                }
              } else if (overlay.type === OverlayType.IMAGE || overlay.type === OverlayType.VIDEO || overlay.type === OverlayType.SOUND) {
                // For file-based layers, include the URL
                if (overlay.src) {
                  // Check if the URL is a blob URL - if so, upload it first
                  if (overlay.src.startsWith('blob:')) {
                    try {
                      // Determine file type and purpose based on file extension/MIME type
                      let mimeType = null;
                      let fileName = null;

                      // Try to detect from blob URL or overlay src
                      const srcUrl = overlay.src || '';
                      const lowerSrc = srcUrl.toLowerCase();

                      // Check file extension in URL first
                      if (lowerSrc.includes('.jpg') || lowerSrc.includes('.jpeg')) {
                        mimeType = 'image/jpeg';
                        fileName = `scene-${sceneNumber}-logo-${overlay.id || Date.now()}.jpg`;
                        purpose = 'logo'; // JPG files are logos
                        layerName = 'logo';
                      } else if (lowerSrc.includes('.mp4')) {
                        mimeType = 'video/mp4';
                        fileName = `scene-${sceneNumber}-video-${overlay.id || Date.now()}.mp4`;
                        purpose = 'video'; // MP4 files are videos
                        layerName = 'video';
                      } else if (lowerSrc.includes('.mp3')) {
                        mimeType = 'audio/mpeg';
                        fileName = `scene-${sceneNumber}-audio-${overlay.id || Date.now()}.mp3`;
                        purpose = 'audio'; // MP3 files are audio
                        layerName = 'audio';
                      } else if (lowerSrc.includes('.png')) {
                        mimeType = 'image/png';
                        fileName = `scene-${sceneNumber}-image-${overlay.id || Date.now()}.png`;
                        // PNG could be logo, watermark, or sticker - check overlay properties
                        if (overlay.name?.toLowerCase().includes('watermark') || overlay.name?.toLowerCase().includes('wm')) {
                          purpose = 'watermark';
                          layerName = 'watermark';
                        } else if (overlay.name?.toLowerCase().includes('logo')) {
                          purpose = 'logo';
                          layerName = 'logo';
                        } else {
                          purpose = 'custom_sticker';
                          layerName = 'custom_sticker';
                        }
                      } else if (lowerSrc.includes('.gif')) {
                        mimeType = 'image/gif';
                        fileName = `scene-${sceneNumber}-image-${overlay.id || Date.now()}.gif`;
                        purpose = 'custom_sticker'; // GIF files are stickers
                        layerName = 'custom_sticker';
                      } else {
                        // Fallback to overlay type if extension not found in URL
                        if (overlay.type === OverlayType.IMAGE) {
                          mimeType = 'image/png';
                          fileName = `scene-${sceneNumber}-image-${overlay.id || Date.now()}.png`;
                          purpose = 'custom_sticker';
                          layerName = 'custom_sticker';
                        } else if (overlay.type === OverlayType.VIDEO) {
                          mimeType = 'video/mp4';
                          fileName = `scene-${sceneNumber}-video-${overlay.id || Date.now()}.mp4`;
                          purpose = 'video';
                          layerName = 'video';
                        } else if (overlay.type === OverlayType.SOUND) {
                          mimeType = 'audio/mpeg';
                          fileName = `scene-${sceneNumber}-audio-${overlay.id || Date.now()}.mp3`;
                          purpose = 'audio';
                          layerName = 'audio';
                        }
                      }
                      const uploadLayerName = overlay.name || `layer_${overlay.id || Date.now()}`;

                      const uploadMetadata = {
                        purpose: purpose,
                        layer_name: uploadLayerName
                      };

                      // Upload the blob URL and get the uploaded file info
                      const uploadedFileInfo = await uploadBlobUrl(
                        overlay.src,
                        fileName,
                        mimeType,
                        session_id,
                        uploadMetadata
                      );
                      // Use the file_url from the response
                      layer.url = uploadedFileInfo.file_url;

                      // Use the purpose as the layer name for manage-layers API
                      if (uploadedFileInfo.purpose) {
                        layerName = uploadedFileInfo.purpose;
                      }
                    } catch (uploadError) {
                      console.error('❌ [SAVE-LAYERS] Failed to upload blob URL:', uploadError);
                      throw new Error(`Failed to upload blob asset: ${uploadError.message}`);
                    }
                  } else {
                    // Not a blob URL, use it directly
                    layer.url = overlay.src;

                    // Try to determine layer name from URL or overlay properties
                    const srcUrl = overlay.src || '';
                    const lowerSrc = srcUrl.toLowerCase();
                    if (lowerSrc.includes('logo') || lowerSrc.includes('brand')) {
                      layerName = 'logo';
                    } else if (lowerSrc.includes('watermark') || lowerSrc.includes('wm')) {
                      layerName = 'watermark';
                    } else if (lowerSrc.includes('sticker') || lowerSrc.includes('animation')) {
                      layerName = 'custom_sticker';
                    }
                  }
                }
              }

              // Set layer name
              layer.name = layerName;

              // Calculate normalized position (0.0 to 1.0 scale)
              // Get canvas dimensions - try to get from aspect ratio or use defaults
              let canvasWidth = 1920; // Default for 16:9
              let canvasHeight = 1080;

              // Check if aspect ratio is 9:16 (portrait)
              if (aspectRatio === '9:16' || aspectRatio === '9/16') {
                canvasWidth = 1080;
                canvasHeight = 1920;
              }

              const position = {};

              // Calculate normalized position from overlay's left/top
              if (overlay.left !== undefined && overlay.width !== undefined) {
                // Position is center of overlay, so calculate center point
                const centerX = overlay.left + (overlay.width / 2);
                position.x = Math.max(0, Math.min(1, centerX / canvasWidth));
              } else if (overlay.position?.x !== undefined) {
                position.x = overlay.position.x;
              } else {
                position.x = 0.5; // Default center
              }

              if (overlay.top !== undefined && overlay.height !== undefined) {
                // Position is center of overlay, so calculate center point
                const centerY = overlay.top + (overlay.height / 2);
                position.y = Math.max(0, Math.min(1, centerY / canvasHeight));
              } else if (overlay.position?.y !== undefined) {
                position.y = overlay.position.y;
              } else {
                position.y = 0.5; // Default center
              }

              layer.position = position;

              // Add bounding_box if overlay has width and height
              if (overlay.width !== undefined && overlay.height !== undefined) {
                const boundingBoxX = overlay.left !== undefined
                  ? Math.max(0, Math.min(1, overlay.left / canvasWidth))
                  : position.x - (overlay.width / canvasWidth / 2);
                const boundingBoxY = overlay.top !== undefined
                  ? Math.max(0, Math.min(1, overlay.top / canvasHeight))
                  : position.y - (overlay.height / canvasHeight / 2);
                const boundingBoxWidth = Math.max(0, Math.min(1, overlay.width / canvasWidth));
                const boundingBoxHeight = Math.max(0, Math.min(1, overlay.height / canvasHeight));

                layer.bounding_box = {
                  x: boundingBoxX,
                  y: boundingBoxY,
                  width: boundingBoxWidth,
                  height: boundingBoxHeight
                };
              } else if (overlay.bounding_box) {
                // Use provided bounding box if available
                layer.bounding_box = overlay.bounding_box;
              }

              // Add animation properties if available (for custom_sticker)
              if (layerName === 'custom_sticker' || overlay.animation) {
                if (overlay.animation?.enter || overlay.enter_animation) {
                  layer.enter_animation = overlay.animation.enter || overlay.enter_animation;
                }
                if (overlay.animation?.exit || overlay.exit_animation) {
                  layer.exit_animation = overlay.animation.exit || overlay.exit_animation;
                }
              }
              // Validate startTime and endTime before building request body
              if (!startTime || startTime.includes('NaN') || !endTime || endTime.includes('NaN')) {
                console.error('❌ [SAVE-LAYERS] Invalid time values for non-text overlay, skipping:', {
                  overlayId: overlay.id,
                  overlayType: overlay.type,
                  startTime,
                  endTime,
                  relativeStartFrame,
                  relativeEndFrame,
                  absoluteStartFrame,
                  absoluteEndFrame,
                  sceneStartFrame: sceneRange?.startFrame,
                  sceneEndFrame: sceneRange?.endFrame
                });
                continue; // Skip this overlay if times are invalid
              }

              // Ensure end_time is greater than start_time (minimum 1 frame difference = 1/30 second)
              if (relativeEndFrame <= relativeStartFrame) {
                console.warn('⚠️ [SAVE-LAYERS] end_time is not greater than start_time for non-text overlay, adjusting:', {
                  overlayId: overlay.id,
                  overlayType: overlay.type,
                  originalStartTime: startTime,
                  originalEndTime: endTime,
                  relativeStartFrame,
                  relativeEndFrame
                });
                // Set end_time to be at least 1 frame (1/30 second) after start_time
                const minEndFrame = relativeStartFrame + 1;
                endTime = framesToTime(minEndFrame, fps);
              }

              // CRITICAL: Final validation right before building request body
              // Re-check endTime after any adjustments to ensure it's still valid
              if (!endTime || typeof endTime !== 'string' || endTime.includes('NaN') || endTime.includes('Infinity')) {
                console.error('❌ [SAVE-LAYERS] endTime is invalid after adjustments, recalculating with safe defaults:', {
                  overlayId: overlay.id,
                  overlayType: overlay.type,
                  endTime,
                  relativeStartFrame,
                  relativeEndFrame,
                  fps
                });
                // Force a safe endTime: at least 1 frame after start
                const safeEndFrame = Math.max(relativeStartFrame + 1, 150); // At least 150 frames (5 seconds at 30fps)
                endTime = framesToTime(safeEndFrame, fps);
              }

              // Final check: if endTime is still invalid, skip this overlay entirely
              if (!endTime || typeof endTime !== 'string' || endTime.includes('NaN') || endTime.includes('Infinity')) {
                console.error('❌ [SAVE-LAYERS] endTime is still invalid after recalculation, skipping overlay:', {
                  overlayId: overlay.id,
                  overlayType: overlay.type,
                  endTime,
                  relativeStartFrame,
                  relativeEndFrame
                });
                continue; // Skip this overlay completely
              }

              // Build request body with start_time and end_time at root level
              const requestBody = {
                session_id: session_id,
                scene_number: sceneNumber,
                operation: "add_layer",
                layer: layer,
                start_time: startTime,
                end_time: endTime
              };
              // Send individual request for this overlay
              const response = await fetch(
                'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/manage-layers',
                {
                  method: 'PATCH',
                  headers: {
                    'Content-Type': 'application/json',
                  },
                  body: JSON.stringify(requestBody)
                }
              );

              const responseText = await response.text();
              let responseData;
              try {
                responseData = JSON.parse(responseText);
              } catch {
                responseData = responseText;
              }

              if (!response.ok) {
                const errorMsg = `Failed to save overlay for scene ${sceneNumber}: ${response.status} ${JSON.stringify(responseData)}`;
                console.error('❌ [SAVE-LAYERS] API request failed for non-text overlay:', {
                  sceneNumber,
                  overlayId: overlay.id,
                  overlayType: overlay.type,
                  layerName: layer.name,
                  status: response.status,
                  statusText: response.statusText,
                  responseData,
                  requestBody: {
                    ...requestBody,
                    layer: { ...layer, url: layer.url?.substring(0, 50) + '...' }
                  },
                  startTime,
                  endTime
                });
                throw new Error(errorMsg);
              }

              await refreshUserSessionData();

              if (overlay?.id !== undefined) {
                savedOverlayIdsRef.current.add(overlay.id);
                overlaysSavedInThisOperation.add(overlay.id);
              }
            }
          }

          // After all manage-layers API calls succeed, refresh user session data
          try {
            const refreshResponse = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id, session_id })
            });

            const refreshText = await refreshResponse.text();
            let refreshData;
            try {
              refreshData = JSON.parse(refreshText);
            } catch {
              refreshData = refreshText;
            }

            if (refreshResponse.ok && refreshData?.session_data) {
              // Parse and update overlays from refreshed session data if needed
              // The overlays will be automatically updated when the editor re-renders
            } else {
              console.warn('⚠️ [SAVE-LAYERS] Failed to refresh user session data:', refreshResponse.status);
            }
          } catch (refreshError) {
            console.error('❌ [SAVE-LAYERS] Error refreshing user session data:', refreshError);
            // Don't throw - this is not critical, layers are already saved
          }

          // Update saved overlays snapshot after successful save
          // CRITICAL: Only add newly saved overlays to the snapshot, don't replace the entire snapshot
          // This ensures existing overlays in the snapshot remain, and only new ones are added
          const currentOverlays = editorOverlaysRef.current || [];
          const existingSnapshot = savedOverlaysSnapshotRef.current || [];
          const existingSnapshotIds = new Set(existingSnapshot.map(o => o?.id).filter(Boolean));

          // Get overlays that were saved in this operation
          const newlySavedOverlays = currentOverlays.filter(overlay => {
            const overlayId = overlay?.id;
            return overlayId !== undefined &&
              overlayId !== null &&
              overlaysSavedInThisOperation.has(overlayId);
          });

          // Merge: keep existing snapshot overlays + add newly saved overlays
          // Remove duplicates by ID
          const updatedSnapshot = [...existingSnapshot];

          for (const newlySavedOverlay of newlySavedOverlays) {
            const overlayId = newlySavedOverlay?.id;
            if (overlayId !== undefined && overlayId !== null && !existingSnapshotIds.has(overlayId)) {
              updatedSnapshot.push(newlySavedOverlay);
              existingSnapshotIds.add(overlayId);
            }
          }

          savedOverlaysSnapshotRef.current = JSON.parse(JSON.stringify(updatedSnapshot));

          // Update state
          setHasUnsavedLayers(false);
        } else {
        }
      } else {
      }

      // =====================================================
      // STEP 4: SHOW SUCCESS MESSAGE
      // =====================================================
    } catch (error) {
      console.error('❌ [SAVE-LAYERS] Error saving layers:', error);
      alert(`Failed to save layers: ${error.message}`);
      throw error;
    } finally {
      setIsSavingLayers(false);
    }
  }, [isSavingLayers, selectedVideo, getLayerName, framesToTime, items, detectBaseVideoChanges, aspectRatio]);

  // Upload base video for selected scene
  const handleUploadBaseVideo = useCallback(async () => {
    // Validation
    if (!selectedSceneForUpload) {
      setUploadBaseVideoError('Please select a scene');
      return;
    }

    if (!uploadBaseVideoFile) {
      setUploadBaseVideoError('Please select a video file');
      return;
    }

    const session_id = localStorage.getItem('session_id');
    const user_id = localStorage.getItem('token');

    if (!session_id || !user_id) {
      setUploadBaseVideoError('Session ID or User ID not found');
      return;
    }

    setIsUploadingBaseVideo(true);
    setUploadBaseVideoError('');

    try {
      // STEP 1: Upload file to Azure via upload-assets API
      const formData = new FormData();
      formData.append('session_id', session_id);
      formData.append('files', uploadBaseVideoFile);
      formData.append('metadata', JSON.stringify([{
        purpose: 'base_video',
        layer_name: null
      }]));

      const uploadResponse = await fetch(
        'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/api/upload-assets',
        {
          method: 'POST',
          body: formData
        }
      );

      const uploadText = await uploadResponse.text();
      let uploadData;
      try {
        uploadData = JSON.parse(uploadText);
      } catch {
        uploadData = uploadText;
      }

      if (!uploadResponse.ok) {
        throw new Error(`Upload failed: ${uploadResponse.status} - ${JSON.stringify(uploadData)}`);
      }
      // Extract file URL from response
      const uploadedFile = uploadData?.uploaded_files?.[0];
      if (!uploadedFile || !uploadedFile.file_url) {
        throw new Error('Upload response missing file URL');
      }

      const newBaseVideoUrl = uploadedFile.file_url;
      // STEP 2: Update base video via manage-layers API
      const updateRequestBody = {
        session_id: session_id,
        scene_number: selectedSceneForUpload,
        operation: 'update_base_video',
        base_video_url: newBaseVideoUrl
      };
      const updateResponse = await fetch(
        'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/manage-layers',
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(updateRequestBody)
        }
      );

      const updateText = await updateResponse.text();
      let updateData;
      try {
        updateData = JSON.parse(updateText);
      } catch {
        updateData = updateText;
      }

      if (!updateResponse.ok) {
        throw new Error(`Update failed: ${updateResponse.status} - ${JSON.stringify(updateData)}`);
      }
      // STEP 3: Refresh user session data to get updated video list
      try {
        // Wait a bit for backend to process the update
        await new Promise(resolve => setTimeout(resolve, 500));

        // Call user session data API to get updated data
        const refreshResponse = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: user_id, session_id: session_id })
        });

        const refreshText = await refreshResponse.text();
        let refreshData;
        try {
          refreshData = JSON.parse(refreshText);
        } catch {
          refreshData = refreshText;
        }

        if (refreshResponse.ok && refreshData?.session_data) {
          // Data refresh complete - the component will automatically update when items state changes
          // Note: parseVideosPayload is not accessible here as it's defined inside useEffect
          // The data refresh ensures backend has the latest data, which will be loaded on next render
        } else {
          console.warn('⚠️ [UPLOAD-BASE-VIDEO] Failed to refresh user session data:', refreshResponse.status);
        }
      } catch (refreshError) {
        console.error('❌ [UPLOAD-BASE-VIDEO] Error refreshing user session data:', refreshError);
        // Don't throw - base video was already updated successfully
      }

      // STEP 4: Close modal and reset state
      setShowUploadBaseVideoModal(false);
      setSelectedSceneForUpload(null);
      setUploadBaseVideoFile(null);
      setIsUploadingBaseVideo(false);

    } catch (error) {
      console.error('❌ [UPLOAD-BASE-VIDEO] Upload failed:', error);
      setUploadBaseVideoError(error?.message || 'Upload failed');
      setIsUploadingBaseVideo(false);
    }
  }, [selectedSceneForUpload, uploadBaseVideoFile]);

  // Force ReactVideoEditor to remount when we have new overlays so defaultOverlays apply
  // Use ref to track overlay IDs to create stable key (prevents unnecessary remounts)
  const overlayIdsRef = useRef('');
  const editorKeyRef = useRef('');
  const editorKey = useMemo(() => {
    const overlayIds = defaultOverlays?.map(o => o?.id || '').filter(Boolean).sort().join(',') || '';
    const overlayCount = defaultOverlays?.length || 0;

    // Create stable signature based on overlay IDs instead of URLs (more stable)
    const overlayIdsSignature = overlayIds.substring(0, 100); // Use first 100 chars for stability

    // Create new key based on overlay IDs (more stable than URLs)
    const newKey = `rve-${overlayCount}-${overlayIdsSignature}`;

    // Only update refs if key actually changed (prevents unnecessary remounts)
    if (newKey !== editorKeyRef.current) {
      overlayIdsRef.current = overlayIds;
      editorKeyRef.current = newKey;
    }

    // Return the stable key from ref
    return editorKeyRef.current;
  }, [
    defaultOverlays.length,
    defaultOverlays.map(o => o?.id || '').filter(Boolean).sort().join(',')
  ]);

  // Auto-load ALL videos from upload section to timeline when session changes
  // This ensures timeline shows EXACTLY the same videos as upload section
  const previousVideoFilesRef = useRef(null);
  const isProcessingRef = useRef(false);
  const previousSessionVersionRef = useRef(null);
  const lastOverlaysRef = useRef(null);

  // Helper function to create a stable signature for video files
  const getVideoFilesSignature = (files) => {
    if (!files || files.length === 0) return 'empty';
    return files.map(f => {
      const baseUrl = f.videos?.v1?.base_video_url || f.videos?.base_video_url || f.path || f.url || f.src || '';
      const chartUrl = f.videos?.v1?.layers?.find(l => l?.name === 'chart')?.url || f.chartVideoUrl || f.chart_video_url || '';
      const audioUrl = f.videos?.v1?.layers?.find(l => l?.name === 'audio')?.url || f.audioUrl || f.audio_url || '';
      return `${baseUrl}|${chartUrl}|${audioUrl}`;
    }).join('||');
  };

  // Helper function to compare overlays deeply
  const areOverlaysEqual = (overlays1, overlays2) => {
    // Handle null/undefined cases
    if (!overlays1 && !overlays2) return true;
    if (!overlays1 || !overlays2) return false;
    if (!Array.isArray(overlays1) || !Array.isArray(overlays2)) return false;
    if (overlays1.length !== overlays2.length) return false;
    if (overlays1.length === 0 && overlays2.length === 0) return true;

    // Compare by ID and key properties only (not full deep comparison to avoid performance issues)
    const ids1 = overlays1.map(o => o?.id || '').filter(Boolean).sort().join(',');
    const ids2 = overlays2.map(o => o?.id || '').filter(Boolean).sort().join(',');
    if (ids1 !== ids2) return false;

    // Deep comparison of critical properties for each overlay
    for (let i = 0; i < overlays1.length; i++) {
      const a = overlays1[i];
      const b = overlays2[i];

      // Compare critical properties that affect rendering
      if (
        a.id !== b.id ||
        a.row !== b.row ||
        a.from !== b.from ||
        a.durationInFrames !== b.durationInFrames ||
        a.type !== b.type ||
        a.content !== b.content ||
        a.left !== b.left ||
        a.top !== b.top ||
        a.width !== b.width ||
        a.height !== b.height
      ) {
        return false;
      }
    }

    return true;
  };

  useEffect(() => {
    // Get videos directly from window.__SESSION_MEDIA_FILES (same source as upload section)
    const sessionMediaFiles = typeof window !== 'undefined' && Array.isArray(window.__SESSION_MEDIA_FILES)
      ? window.__SESSION_MEDIA_FILES
      : [];

    // Filter for videos only, but EXCLUDE:
    // 1. Generated base videos (they should only be in upload panel, not timeline) - _generated: true
    // 2. Chart videos (they are layers within scenes, not separate scenes) - _isChartVideo: true
    // Chart layers are already added from videos.v1.layers array within each scene
    // Session/job videos have _session: true flag and should appear in timeline
    const videoFiles = sessionMediaFiles.filter((f) =>
      f.type === "video" &&
      (f.path || f.url || f.src) &&
      !f._generated && // Exclude generated base videos from timeline
      !f._isChartVideo // CRITICAL: Exclude chart videos - they're layers, not separate scenes
    );

    // Create signature for current video files
    const currentSignature = getVideoFilesSignature(videoFiles);
    const previousSignature = previousVideoFilesRef.current;

    // Check if we're already processing
    if (isProcessingRef.current) {
      return;
    }

    // Check if video files have actually changed
    if (currentSignature === previousSignature && previousSessionVersionRef.current === sessionMediaVersion) {
      return;
    }

    // Update refs BEFORE processing to prevent re-entry
    previousVideoFilesRef.current = currentSignature;
    previousSessionVersionRef.current = sessionMediaVersion;
    isProcessingRef.current = true;

    if (videoFiles.length === 0) {
      // Clear timeline when no videos in upload section
      const emptyOverlays = [];
      if (!areOverlaysEqual(lastOverlaysRef.current, emptyOverlays)) {
        setDefaultOverlays(emptyOverlays);
        lastOverlaysRef.current = emptyOverlays;
      }
      setTimelineLoading(false);
      isProcessingRef.current = false;
      return;
    }

    let cancelled = false;

    // Get audio layer data helper function (for buildOverlaysFromUploadSection)
    const getAudioLayerDataForBuild = (entry = {}) => {
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        const audioLayer = entry.videos.v1.layers.find(layer => layer?.name === 'audio');
        if (audioLayer) {
          return {
            url: audioLayer.url,
            timing: audioLayer.timing || { start: "00:00:00", end: null },
            volume: audioLayer.volume !== undefined ? audioLayer.volume : 1,
            enabled: audioLayer.enabled !== undefined ? audioLayer.enabled : true,
          };
        }
      }
      return null;
    };

    // Get audio URL from entry (comprehensive search) - local version for buildOverlaysFromUploadSection
    const getAudioUrlFromEntryLocal = (entry = {}) => {
      // Check videos.v1.audio_only_url (for SORA/PLOTLY scenes)
      if (entry?.videos?.v1?.audio_only_url) {
        return entry.videos.v1.audio_only_url;
      }
      // Check videos.v1.audio_url as fallback
      if (entry?.videos?.v1?.audio_url) {
        return entry.videos.v1.audio_url;
      }
      // Check other nested structures
      if (entry?.videos?.audio_only_url) {
        return entry.videos.audio_only_url;
      }
      if (entry?.videos?.audio_url) {
        return entry.videos.audio_url;
      }
      // Check video (singular) structure
      if (entry?.video?.v1?.audio_only_url) {
        return entry.video.v1.audio_only_url;
      }
      if (entry?.video?.v1?.audio_url) {
        return entry.video.v1.audio_url;
      }
      if (entry?.video?.audio_only_url) {
        return entry.video.audio_only_url;
      }
      if (entry?.video?.audio_url) {
        return entry.video.audio_url;
      }
      // Check top-level fields
      if (entry?.audio_only_url) {
        return entry.audio_only_url;
      }
      if (entry?.audio_only?.url) {
        return entry.audio_only.url;
      }
      if (entry?.audio_url) {
        return entry.audio_url;
      }
      if (entry?.audio?.url) {
        return entry.audio.url;
      }
      // Check other audio-related fields
      if (entry?.voice_link) {
        return entry.voice_link;
      }
      if (entry?.voiceover_url) {
        return entry.voiceover_url;
      }
      if (entry?.narration_url) {
        return entry.narration_url;
      }
      if (entry?.narration?.url) {
        return entry.narration.url;
      }
      if (entry?.audio?.audio_url) {
        return entry.audio.audio_url;
      }
      if (entry?.blobLink?.audio_link) {
        return entry.blobLink.audio_link;
      }
      // Check if narration is a URL string
      if (typeof entry?.narration === 'string' && entry.narration.startsWith('http')) {
        return entry.narration;
      }
      return null;
    };

    // Get chart layer data helper function (for buildOverlaysFromUploadSection)
    const getChartLayerDataForBuild = (entry = {}) => {
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        const chartLayer = entry.videos.v1.layers.find(layer => layer?.name === 'chart');
        if (chartLayer) {
          return {
            url: chartLayer.url,
            timing: chartLayer.timing || { start: "00:00:00", end: null },
            position: chartLayer.position || { x: 0.5, y: 0.5 },
            bounding_box: chartLayer.bounding_box || null,
            size: chartLayer.size || null,
            scaling: chartLayer.scaling || { scale_x: 1, scale_y: 1, fit_mode: 'contain' },
            animation: chartLayer.animation || { type: 'none', duration: 0.5 },
            layout: chartLayer.layout || { align: 'center', verticalAlign: 'middle' },
            opacity: chartLayer.opacity !== undefined ? chartLayer.opacity : 1,
            rotation: chartLayer.rotation || 0,
            enabled: chartLayer.enabled !== undefined ? chartLayer.enabled : true,
            has_background: chartLayer.has_background !== undefined ? chartLayer.has_background : true,
          };
        }
      }
      return null;
    };

    // Get custom_sticker layer data from layers array
    const getCustomStickerLayerDataForBuild = (entry = {}) => {
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        // Filter all custom_sticker layers (there might be multiple)
        const stickerLayers = entry.videos.v1.layers.filter(layer => layer?.name === 'custom_sticker');

        if (stickerLayers.length > 0) {
          return stickerLayers.map((stickerLayer) => {
            return {
              url: stickerLayer.url,
              timing: stickerLayer.timing || { start: "00:00:00", end: null },
              position: stickerLayer.position || { x: 0.5, y: 0.5 },
              bounding_box: stickerLayer.bounding_box || null,
              size: stickerLayer.size || null,
              scaling: stickerLayer.scaling || { scale_x: 1, scale_y: 1, fit_mode: 'contain' },
              animation: stickerLayer.animation || { type: 'none', duration: 0.5 },
              opacity: stickerLayer.opacity !== undefined ? stickerLayer.opacity : 1,
              rotation: stickerLayer.rotation || 0,
              enabled: stickerLayer.enabled !== undefined ? stickerLayer.enabled : true,
            };
          });
        }
      }
      return [];
    };

    // Helper function to convert timing string (HH:MM:SS) to frame numbers
    const convertTimingToFrames = (timeStr, fps = 30) => {
      if (!timeStr || typeof timeStr !== 'string') {
        return 0;
      }
      const parts = timeStr.split(':').map(Number);
      if (parts.length !== 3 || parts.some(isNaN)) {
        return 0;
      }
      const [hours, minutes, seconds] = parts;
      const totalSeconds = hours * 3600 + minutes * 60 + seconds;
      return Math.round(totalSeconds * fps);
    };

    // Get base video layer data from layers array
    const getBaseVideoLayerData = (entry = {}) => {
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        // Check for base_video or video layer name
        const baseVideoLayer = entry.videos.v1.layers.find(layer =>
          layer?.name === 'base_video' || layer?.name === 'base-video' || layer?.name === 'video'
        );
        if (baseVideoLayer) {
          return {
            url: baseVideoLayer.url || null,
            timing: baseVideoLayer.timing || { start: "00:00:00", end: null },
            enabled: baseVideoLayer.enabled !== undefined ? baseVideoLayer.enabled : true,
          };
        }
      }
      return null;
    };

    // Get subtitle/caption layer data from layers array
    const getSubtitleLayerData = (entry = {}) => {
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        const subtitleLayer = entry.videos.v1.layers.find(layer => layer?.name === 'subtitles');
        if (subtitleLayer) {
          return {
            url: subtitleLayer.url || null, // SRT file URL
            text: subtitleLayer.text || '', // Inline text
            timing: subtitleLayer.timing || { start: "00:00:00", end: null },
            position: subtitleLayer.position || { x: 0.5, y: 0.85 }, // Default bottom center
            bounding_box: subtitleLayer.bounding_box || null,
            size: subtitleLayer.size || null,
            style: {
              fontSize: subtitleLayer.fontSize || subtitleLayer.style?.fontSize || 24,
              fontFamily: subtitleLayer.fontFamily || subtitleLayer.style?.fontFamily || 'Inter',
              fontWeight: subtitleLayer.fontWeight || subtitleLayer.style?.fontWeight || '600',
              color: subtitleLayer.fill || subtitleLayer.style?.color || subtitleLayer.style?.fill || '#FFFFFF',
              textAlign: subtitleLayer.textAlign || subtitleLayer.style?.textAlign || 'center',
              lineHeight: subtitleLayer.lineHeight || subtitleLayer.style?.lineHeight || 1.2,
              letterSpacing: subtitleLayer.letterSpacing || subtitleLayer.style?.letterSpacing || 0,
              opacity: subtitleLayer.textOpacity !== undefined ? subtitleLayer.textOpacity :
                (subtitleLayer.opacity !== undefined ? subtitleLayer.opacity : 1),
              // Text shadow/stroke for readability
              textShadow: subtitleLayer.style?.textShadow || '2px 2px 4px rgba(0,0,0,0.8)',
              backgroundColor: subtitleLayer.style?.backgroundColor || 'transparent',
              padding: subtitleLayer.style?.padding || '8px 16px',
              borderRadius: subtitleLayer.style?.borderRadius || '4px',
            },
            effects: subtitleLayer.effects || null,
            animation: subtitleLayer.animation || { type: 'none', duration: 0.3 },
            enabled: subtitleLayer.enabled !== undefined ? subtitleLayer.enabled : true,
          };
        }
      }
      return null;
    };

    // SRT file upload function removed - using URLs directly

    // Helper function to generate captions from text (replicates generateFromText logic)
    const generateCaptionsFromText = (text, wordsPerMinute = 160, sentenceGapMs = 500) => {
      if (!text || !text.trim()) {
        return [];
      }

      const sentences = text
        .split(/[.!?]+/)
        .map(sentence => sentence.trim())
        .filter(sentence => sentence.length > 0);

      if (sentences.length === 0) {
        return [];
      }

      let currentStartTime = 0;
      const msPerWord = (60 * 1000) / wordsPerMinute;

      const captions = sentences.map((sentence) => {
        const words = sentence.split(/\s+/).filter(word => word.length > 0);
        const sentenceStartTime = currentStartTime;
        const sentenceDuration = words.length * msPerWord;
        const sentenceEndTime = sentenceStartTime + sentenceDuration;

        // Distribute word timing evenly across sentence duration
        const wordTiming = words.map((word, index) => {
          const wordDuration = sentenceDuration / words.length;
          return {
            word: word.trim(),
            startMs: Math.round(sentenceStartTime + index * wordDuration),
            endMs: Math.round(sentenceStartTime + (index + 1) * wordDuration),
            confidence: 0.99,
          };
        });

        const caption = {
          text: sentence,
          startMs: sentenceStartTime,
          endMs: sentenceEndTime,
          timestampMs: null,
          confidence: 0.99,
          words: wordTiming,
        };

        currentStartTime = caption.endMs + sentenceGapMs;
        return caption;
      });

      return captions;
    };

    // Helper function to parse SRT file, extract text, and generate captions
    const parseSRTToCaption = async (srtUrl, fps = 30, sceneIndex = null) => {
      try {
        // Fetch SRT file content
        const response = await fetch(srtUrl);
        if (!response.ok) {
          return { captions: null, extractedText: null };
        }

        const srtContent = await response.text();

        // Helper function to parse SRT timestamp to milliseconds
        const parseSRTTimestamp = (timestamp) => {
          // Format: HH:MM:SS,mmm
          const match = timestamp.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
          if (!match) return 0;
          const [, hours, minutes, seconds, milliseconds] = match;
          return (
            parseInt(hours) * 3600000 +
            parseInt(minutes) * 60000 +
            parseInt(seconds) * 1000 +
            parseInt(milliseconds)
          );
        };

        // Parse SRT blocks with actual timestamps
        const allTexts = [];
        const captions = [];
        const blocks = srtContent.trim().split('\n\n');

        blocks.forEach((block, index) => {
          const lines = block.split('\n');
          if (lines.length < 3) return;

          // Parse timing line (format: 00:00:00,000 --> 00:00:08,000)
          const timingLine = lines[1];
          const timingMatch = timingLine.match(/(.+?)\s*-->\s*(.+)/);

          if (timingMatch) {
            const [, startTime, endTime] = timingMatch;
            const startMs = parseSRTTimestamp(startTime.trim());
            const endMs = parseSRTTimestamp(endTime.trim());

            // Get text content (lines 2 onwards)
            const text = lines.slice(2).join(' ').trim();

            if (text) {
              allTexts.push(text);

              // Split text into words and calculate per-word timing
              const words = text.split(/\s+/).filter(word => word.length > 0);
              const totalDuration = endMs - startMs;
              const wordDuration = totalDuration / words.length;

              const wordTiming = words.map((word, wordIndex) => ({
                word: word.trim(),
                startMs: Math.round(startMs + wordIndex * wordDuration),
                endMs: Math.round(startMs + (wordIndex + 1) * wordDuration),
                confidence: 0.99,
              }));

              captions.push({
                text: text,
                startMs: startMs,
                endMs: endMs,
                timestampMs: null,
                confidence: 0.99,
                words: wordTiming,
              });
            }
          }
        });

        // Join all extracted text
        const extractedText = allTexts.join(' ').trim();

        if (!extractedText || captions.length === 0) {
          return { captions: null, extractedText: null };
        }

        // Dispatch event for captions panel (optional, for UI updates)
        const event = new CustomEvent('srtTextExtracted', {
          detail: {
            text: extractedText,
            sceneIndex: sceneIndex !== null ? sceneIndex + 1 : null,
            srtUrl: srtUrl
          }
        });
        window.dispatchEvent(event);

        return { captions: captions, extractedText };

      } catch (error) {
        return { captions: null, extractedText: null };
      }
    };

    // Helper function to convert inline text to caption format
    const convertTextToCaption = (text, startFrame, endFrame, fps = 30) => {
      const startMs = Math.round((startFrame / fps) * 1000);
      const endMs = Math.round((endFrame / fps) * 1000);

      return [{
        startMs: startMs,
        endMs: endMs,
        words: [{
          word: text,
          startMs: startMs,
          endMs: endMs
        }]
      }];
    };

    // Get logo layer data from layers array
    const getLogoLayerData = (entry = {}) => {
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        const logoLayer = entry.videos.v1.layers.find(layer => layer?.name === 'logo');
        if (logoLayer) {
          return {
            url: logoLayer.url,
            timing: logoLayer.timing || { start: "00:00:00", end: null },
            position: logoLayer.position || { x: 0.9, y: 0.1 }, // Default top-right
            bounding_box: logoLayer.bounding_box || null,
            size: logoLayer.size || null,
            scale: logoLayer.scale !== undefined ? logoLayer.scale : 1,
            opacity: logoLayer.opacity !== undefined ? logoLayer.opacity : 1,
            rotation: logoLayer.rotation || 0,
            style: logoLayer.style || {},
            blend_mode: logoLayer.blend_mode || 'normal',
            enabled: logoLayer.enabled !== undefined ? logoLayer.enabled : true,
            animation: logoLayer.animation || { type: 'none', duration: 0.5 },
          };
        }
      }
      return null;
    };

    // Helper to create complete text overlay styles from layer data
    // This ensures TextStylePanel never needs to auto-apply defaults
    // textLayerData has properties at top level (new schema) or nested in style (legacy)
    const createTextOverlayStyles = (textLayerData) => {
      // Convert fontSize (px number) to fontSizeScale (0.3-3 range)
      // Base size is 28px, so fontSizeScale = fontSize / 28
      const fontSize = textLayerData.fontSize || textLayerData.style?.fontSize || 28;
      const fontSizeScale = Math.max(0.3, Math.min(3, fontSize / 28)); // Normalize to base size of 28, clamp to 0.3-3

      // Convert letterSpacing from px to em
      const letterSpacingPx = textLayerData.letterSpacing || textLayerData.style?.letterSpacing || 0;
      let letterSpacingEm;
      if (typeof letterSpacingPx === 'number') {
        letterSpacingEm = `${(letterSpacingPx / 16).toFixed(2)}em`; // Convert px to em (16px = 1em)
      } else if (typeof letterSpacingPx === 'string') {
        if (letterSpacingPx.endsWith('px')) {
          const pxValue = parseFloat(letterSpacingPx) || 0;
          letterSpacingEm = `${(pxValue / 16).toFixed(2)}em`;
        } else if (letterSpacingPx.endsWith('em')) {
          letterSpacingEm = letterSpacingPx;
        } else {
          letterSpacingEm = letterSpacingPx === '0' || letterSpacingPx === '' ? '0em' : `${letterSpacingPx}em`;
        }
      } else {
        letterSpacingEm = '0em';
      }

      // Map fontWeight to numeric string
      const fontWeightMap = {
        'thin': '100',
        'extra-light': '200',
        'light': '300',
        'normal': '400',
        'regular': '400',
        'medium': '500',
        'semi-bold': '600',
        'semibold': '600',
        'bold': '700',
        'extra-bold': '800',
        'black': '900',
      };

      const rawWeight = textLayerData.fontWeight || textLayerData.style?.fontWeight || '400';
      const fontWeight = fontWeightMap[String(rawWeight).toLowerCase()] || String(rawWeight);

      // Map animation type
      let animationType = 'none';
      if (textLayerData.animation?.type === 'fade_in_out' ||
        textLayerData.animation?.type === 'fade') {
        animationType = 'fade';
      }

      // Create stable animation config object
      const animationConfig = {
        enter: animationType,
        exit: animationType,
        duration: textLayerData.animation?.duration || 0.5,
      };

      // Return complete styles object with ALL required properties
      return {
        // CRITICAL: TextStylePanel expects fontSizeScale (number 0.3-3)
        fontSizeScale: fontSizeScale,
        // Keep fontSize for rendering
        fontSize: `${fontSize}px`,
        fontFamily: textLayerData.fontFamily || textLayerData.style?.fontFamily || 'Inter',
        fontWeight: fontWeight,
        color: textLayerData.color || textLayerData.fill || textLayerData.style?.color || '#000000',
        textAlign: textLayerData.alignment || textLayerData.textAlign || textLayerData.style?.textAlign || 'center',
        lineHeight: String(textLayerData.lineHeight || textLayerData.style?.lineHeight || 1.2),
        letterSpacing: letterSpacingEm,
        opacity: textLayerData.opacity !== undefined ? textLayerData.opacity :
          (textLayerData.textOpacity !== undefined ? textLayerData.textOpacity : 1),
        textShadow: textLayerData.textShadow || textLayerData.style?.textShadow || textLayerData.effects?.textShadow || null,
        backgroundColor: textLayerData.backgroundColor || textLayerData.style?.backgroundColor || 'transparent',
        padding: textLayerData.padding || textLayerData.style?.padding || '0px',
        borderRadius: textLayerData.borderRadius || textLayerData.style?.borderRadius || '0px',
        zIndex: 350, // Same as other text overlays
        transform: `scale(${textLayerData.scale !== undefined ? textLayerData.scale : 1})`,
        animation: animationConfig, // Stable reference
      };
    };

    // Get text overlay layer data from layers array (supports multiple text overlays)
    // Extracts data from new schema: { name: "text_overlay", text: "...", fontSize: 28, color: "#000000", ... }
    const getTextOverlayLayerData = (entry = {}) => {
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        // Filter all text_overlay layers (there might be multiple)
        const textLayers = entry.videos.v1.layers.filter(layer => layer?.name === 'text_overlay');

        if (textLayers.length > 0) {
          return textLayers.map((textLayer, index) => {
            // Extract data directly from layer object (new schema) or nested style object (legacy)
            return {
              text: textLayer.text || '',
              url: textLayer.url || null, // URL for text overlay video/text source
              timing: textLayer.timing || { start: "00:00:00", end: null },
              position: textLayer.position || { x: 0.5, y: 0.5 }, // Default center
              bounding_box: textLayer.bounding_box || null,
              size: textLayer.size || null,
              // Extract style properties directly from layer (new schema) or from nested style (legacy)
              fontSize: textLayer.fontSize || textLayer.style?.fontSize || 28,
              fontFamily: textLayer.fontFamily || textLayer.style?.fontFamily || 'Inter',
              fontWeight: textLayer.fontWeight || textLayer.style?.fontWeight || 'bold',
              color: textLayer.color || textLayer.fill || textLayer.style?.color || textLayer.style?.fill || '#000000',
              alignment: textLayer.alignment || textLayer.textAlign || textLayer.style?.textAlign || 'center',
              textAlign: textLayer.alignment || textLayer.textAlign || textLayer.style?.textAlign || 'center',
              lineHeight: textLayer.lineHeight || textLayer.style?.lineHeight || 1.2,
              letterSpacing: textLayer.letterSpacing || textLayer.style?.letterSpacing || 1,
              opacity: textLayer.textOpacity !== undefined ? textLayer.textOpacity :
                (textLayer.opacity !== undefined ? textLayer.opacity : 1),
              textShadow: textLayer.style?.textShadow || textLayer.effects?.textShadow || null,
              backgroundColor: textLayer.style?.backgroundColor || 'transparent',
              padding: textLayer.style?.padding || '0px',
              borderRadius: textLayer.style?.borderRadius || '0px',
              effects: textLayer.effects || null,
              animation: textLayer.animation || { type: 'fade_in_out', duration: 0.5 },
              rotation: textLayer.rotation || 0,
              scale: textLayer.scale !== undefined ? textLayer.scale : 1,
              enabled: textLayer.enabled !== undefined ? textLayer.enabled : true,
            };
          });
        }
      }
      return [];
    };

    // Build overlays from upload section videos (window.__SESSION_MEDIA_FILES)
    const buildOverlaysFromUploadSection = async () => {
      setTimelineLoading(true);
      const newOverlays = [];
      let fromFrame = 0;
      const fps = APP_CONFIG.fps || 30;
      const fallbackDurationSeconds = 10;

      // CRITICAL: GLOBAL LAYER ROWS (same for all scenes)
      // These rows are shared across all scenes to ensure proper organization:
      // Row 1: Subtitles (all scenes share this row)
      // Rows 2+: Text Overlays (dynamic, varies per scene)
      // After all text overlays: Logos (all scenes share one row)
      // After logos: Charts (all scenes share one row)
      // After charts: Base Videos (all scenes share one row - bottom, above audio)
      // After base videos: Audio (all scenes share one row - bottommost)
      const GLOBAL_SUBTITLE_ROW = 1; // Fixed: All subtitles in one layer
      const GLOBAL_LOGO_ROW = 99; // Fixed: All logos in one layer
      const GLOBAL_CHART_ROW = 100; // Fixed: All charts in one layer (will be adjusted if needed)
      const GLOBAL_BASE_VIDEO_ROW = 101; // Fixed: All base videos in one layer (bottom, above audio)
      const GLOBAL_AUDIO_ROW = 102; // Fixed: All audio in one layer (bottommost)

      // Track maximum text row across all scenes to ensure global layers are after all text
      let maxTextRow = 1; // Start at 1 (subtitles row)

      for (let i = 0; i < videoFiles.length; i++) {
        if (cancelled) break;

        const file = videoFiles[i];
        const sceneNumber = file.sceneNumber || file.scene_number || (i + 1);
        try {
          // CRITICAL: GLOBAL LAYER ORGANIZATION (all scenes share the same rows)
          // This ensures proper layer organization across all scenes:
          // Row 1: Subtitles (CAPTION) - zIndex 350 - ALL scenes' subtitles in one layer
          // Rows 2 to N+1: Text Overlays (TEXT) - zIndex 350 - Dynamic rows for text (varies per scene)
          // Row N+2: Charts (VIDEO) - zIndex 200 - ALL scenes' charts in one layer
          // Row N+3: Base Videos (VIDEO) - zIndex 100 - ALL scenes' base videos in one layer (bottom, above audio)
          // Row N+4: Audio (SOUND) - zIndex 50 - ALL scenes' audio in one layer (bottommost)
          // Note: Row numbers in timeline are for organization, z-index determines actual visual stacking on canvas

          // Get video duration first (needed for all layers)
          const baseVideoUrl = file.videos?.v1?.base_video_url ||
            file.videos?.base_video_url ||
            file.video?.v1?.base_video_url ||
            file.video?.base_video_url ||
            file.baseVideoUrl ||
            file.base_video_url ||
            file.path ||
            file.url ||
            file.src || "";

          let rawPath = baseVideoUrl;
          // CRITICAL: Skip videos without valid base video URL
          // This ensures we only show videos that are actually in the user session data
          if (!rawPath || !rawPath.trim()) {
            console.warn('⚠️ [TIMELINE] Skipping video entry without base video URL:', {
              index: i,
              fileName: file.name || file.title,
              fileId: file.id,
              hasBaseVideoUrl: !!baseVideoUrl
            });
            continue;
          }

          // Check if rawPath is already double-prefixed
          if (rawPath.includes('/api/latest/local-media/serve/http') || rawPath.includes('/api/latest/local-media/serve/https')) {
            const match = rawPath.match(/\/api\/latest\/local-media\/serve\/(https?:\/\/.+)/);
            if (match && match[1]) {
              rawPath = match[1];
            }
          }

          let mediaSrc;
          if (rawPath.startsWith("http://") || rawPath.startsWith("https://") || rawPath.startsWith("blob:")) {
            mediaSrc = rawPath;
          } else {
            const cleanPath = rawPath.startsWith("/") ? rawPath.slice(1) : rawPath;
            mediaSrc = `/api/latest/local-media/serve/${cleanPath}`;
          }

          // Get video duration
          let durationSeconds = file.duration || file.mediaSrcDuration || fallbackDurationSeconds;
          try {
            const video = document.createElement('video');
            video.crossOrigin = 'anonymous';
            video.preload = 'metadata';
            await new Promise((resolve) => {
              const timeout = setTimeout(() => {
                resolve();
              }, 5000);
              video.onloadedmetadata = () => {
                clearTimeout(timeout);
                const dur = video.duration;
                if (isFinite(dur) && dur > 0) {
                  durationSeconds = dur;
                }
                resolve();
              };
              video.onerror = () => {
                clearTimeout(timeout);
                resolve();
              };
              video.src = mediaSrc;
            });
          } catch (error) {
          }

          const durationInFrames = Math.max(1, Math.round(durationSeconds * fps));
          const currentAspectRatio = aspectRatio || '16:9';
          // Canvas dimensions: 16:9 = 1280x720, 9:16 = 1080x1920
          const canvasWidth = currentAspectRatio === '9:16' || currentAspectRatio === '9/16' ? 1080 : 1280;
          const canvasHeight = currentAspectRatio === '9:16' || currentAspectRatio === '9/16' ? 1920 : 720;

          // STEP 1: Process text overlay(s) with dynamic row assignment
          // CRITICAL: Row 1 is reserved for subtitles (all scene subtitles go to row 1)
          // Text overlays start at row 2: Row 2, Row 3, Row 4, etc.
          // This ensures multiple text overlays from the same scene don't overlap
          const textOverlayLayers = getTextOverlayLayerData(file);
          let currentTextRow = 2; // Start at row 2 (row 1 is reserved for subtitles)
          let lastTextRow = 1; // Track last row used by text overlays (minimum is 1 for subtitle row)

          if (textOverlayLayers.length > 0) {
            textOverlayLayers.forEach((textLayerData, textIndex) => {
              if (!textLayerData.enabled) {
                return;
              }

              // Calculate text timing
              const textStartFrame = textLayerData.timing?.start
                ? convertTimingToFrames(textLayerData.timing.start, fps)
                : fromFrame;
              const textEndFrame = textLayerData.timing?.end
                ? convertTimingToFrames(textLayerData.timing.end, fps)
                : (fromFrame + durationInFrames);
              const textDurationInFrames = Math.max(1, textEndFrame - textStartFrame);

              // Calculate text position and size
              let textLeft = 0;
              let textTop = 0;
              let textWidth = 400; // Default text box width
              let textHeight = 100; // Default text box height

              // Priority 1: Use bounding_box for absolute positioning (0-1 normalized)
              if (textLayerData.bounding_box) {
                textLeft = Math.round((textLayerData.bounding_box.x || 0) * canvasWidth);
                textTop = Math.round((textLayerData.bounding_box.y || 0) * canvasHeight);
                textWidth = Math.round((textLayerData.bounding_box.width || 0.3) * canvasWidth);
                textHeight = Math.round((textLayerData.bounding_box.height || 0.1) * canvasHeight);
              }
              // Priority 2: Use position for center-based positioning (0-1 normalized)
              else if (textLayerData.position) {
                const posX = textLayerData.position.x !== undefined ? textLayerData.position.x : 0.5;
                const posY = textLayerData.position.y !== undefined ? textLayerData.position.y : 0.5;

                // Center the text box at the position
                textLeft = Math.round((posX * canvasWidth) - (textWidth / 2));
                textTop = Math.round((posY * canvasHeight) - (textHeight / 2));
              }

              // CRITICAL: Ensure text stays within canvas bounds with comprehensive boundary checks
              const originalTextLeft = textLeft;
              const originalTextTop = textTop;
              const originalTextWidth = textWidth;
              const originalTextHeight = textHeight;

              // Clamp position to canvas bounds
              textLeft = Math.max(0, Math.min(textLeft, canvasWidth - textWidth));
              textTop = Math.max(0, Math.min(textTop, canvasHeight - textHeight));

              // Clamp dimensions to fit within remaining canvas space
              textWidth = Math.min(textWidth, canvasWidth - textLeft);
              textHeight = Math.min(textHeight, canvasHeight - textTop);

              // Ensure minimum dimensions
              textWidth = Math.max(50, textWidth);
              textHeight = Math.max(20, textHeight);

              // Final boundary check - ensure overlay doesn't exceed canvas
              let wasClamped = false;
              if (textLeft + textWidth > canvasWidth) {
                textWidth = canvasWidth - textLeft;
                wasClamped = true;
              }

              if (textTop + textHeight > canvasHeight) {
                textHeight = canvasHeight - textTop;
                wasClamped = true;
              }

              // Calculate normalized position (0-1 range) for saving/API - like chart editor
              // Position represents the center of the text box in normalized coordinates
              const normalizedX = (textLeft + textWidth / 2) / canvasWidth;
              const normalizedY = (textTop + textHeight / 2) / canvasHeight;
              const normalizedPosition = {
                x: Math.max(0, Math.min(1, normalizedX)), // Clamp to 0-1
                y: Math.max(0, Math.min(1, normalizedY))  // Clamp to 0-1
              };

              // Calculate normalized bounding box (0-1 range)
              const normalizedBoundingBox = {
                x: textLeft / canvasWidth,
                y: textTop / canvasHeight,
                width: textWidth / canvasWidth,
                height: textHeight / canvasHeight
              };

              // Create complete styles using helper function
              // This ensures TextStylePanel never needs to auto-apply defaults
              const textStyles = createTextOverlayStyles(textLayerData);

              // Generate stable ID
              const textId = file.name || file.title || file.id || `text-${i}-${textIndex}`;
              const cleanTextId = String(textId)
                .replace(/[^a-zA-Z0-9_-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .toLowerCase();
              const finalOverlayId = `text-${cleanTextId}-${textIndex}`;

              // Process text overlay URL for src property
              let textOverlaySrc = null;
              if (textLayerData.url) {
                let rawTextUrl = textLayerData.url;

                // Check if URL is already double-prefixed
                if (rawTextUrl.includes('/api/latest/local-media/serve/http') || rawTextUrl.includes('/api/latest/local-media/serve/https')) {
                  const match = rawTextUrl.match(/\/api\/latest\/local-media\/serve\/(https?:\/\/.+)/);
                  if (match && match[1]) {
                    rawTextUrl = match[1];
                  }
                }

                // Process URL (same logic as video URLs)
                if (rawTextUrl.startsWith("http://") || rawTextUrl.startsWith("https://") || rawTextUrl.startsWith("blob:")) {
                  textOverlaySrc = rawTextUrl;
                } else {
                  const cleanPath = rawTextUrl.startsWith("/") ? rawTextUrl.slice(1) : rawTextUrl;
                  textOverlaySrc = `/api/latest/local-media/serve/${cleanPath}`;
                }
              }

              // CRITICAL: Verify text overlay is within canvas bounds before creating
              const isWithinBounds = textLeft >= 0 && textTop >= 0 &&
                (textLeft + textWidth) <= canvasWidth &&
                (textTop + textHeight) <= canvasHeight;

              // Log warning if overlay was clamped
              if (wasClamped) {
              }

              // Verify final position is within bounds
              if (!isWithinBounds) {
              }

              // Debug logging for text overlay creation with comprehensive position info

              if (!isWithinBounds) {
              }

              // Create overlay object with complete styles
              // NOTE: Text overlays can have a 'src' property with the text/video URL
              const textOverlay = {
                id: finalOverlayId, // CRITICAL: Add textIndex to ensure uniqueness
                left: textLeft, // Pixel position for rendering
                top: textTop, // Pixel position for rendering
                width: textWidth, // Pixel width for rendering
                height: textHeight, // Pixel height for rendering
                position: normalizedPosition, // Normalized position (0-1) like chart editor
                bounding_box: normalizedBoundingBox, // Normalized bounding box (0-1) for API
                durationInFrames: textDurationInFrames,
                from: textStartFrame,
                rotation: textLayerData.rotation || 0,
                row: currentTextRow, // CRITICAL: Each text overlay gets its own row (2, 3, 4, etc. - row 1 is reserved for subtitles)
                isDragging: false,
                type: OverlayType.TEXT, // CRITICAL: Use TEXT type for text panel
                content: textLayerData.text || '', // Ensure content is always a string
                src: textOverlaySrc, // URL for text overlay video/text source (can be null if no URL)
                styles: textStyles, // Complete styles from helper - TextStylePanel will never need to auto-apply defaults
                sceneNumber: sceneNumber,
              };

              newOverlays.push(textOverlay);

              // INCREMENT ROW for next text overlay
              lastTextRow = currentTextRow;
              currentTextRow++;
            });
          }

          // CRITICAL: GLOBAL ROW ASSIGNMENT (same rows for all scenes)
          // Update max text row for this scene
          maxTextRow = Math.max(maxTextRow, lastTextRow);

          // For this scene, use the global rows (defined outside loop)
          const subtitleRow = GLOBAL_SUBTITLE_ROW;
          const logoRow = GLOBAL_LOGO_ROW; // Fixed: All logos in one layer
          const chartRow = GLOBAL_CHART_ROW;
          const baseVideoRow = GLOBAL_BASE_VIDEO_ROW;
          const audioRow = GLOBAL_AUDIO_ROW;

          // STEP 2: Add logo overlay (use calculated logoRow)
          const logoLayerData = getLogoLayerData(file);

          if (logoLayerData && logoLayerData.enabled && logoLayerData.url) {
            // Calculate logo timing
            const logoStartFrame = logoLayerData.timing?.start
              ? convertTimingToFrames(logoLayerData.timing.start, fps)
              : fromFrame;
            const logoEndFrame = logoLayerData.timing?.end
              ? convertTimingToFrames(logoLayerData.timing.end, fps)
              : (fromFrame + durationInFrames);
            const logoDurationInFrames = Math.max(1, logoEndFrame - logoStartFrame);

            // Calculate logo position
            let logoLeft = 0;
            let logoTop = 0;
            let logoWidth = 150; // Default logo size
            let logoHeight = 150;

            if (logoLayerData.bounding_box) {
              // Use bounding_box for absolute positioning
              logoLeft = Math.round((logoLayerData.bounding_box.x || 0) * canvasWidth);
              logoTop = Math.round((logoLayerData.bounding_box.y || 0) * canvasHeight);
              logoWidth = Math.round((logoLayerData.bounding_box.width || 0.1) * canvasWidth);
              logoHeight = Math.round((logoLayerData.bounding_box.height || 0.1) * canvasHeight);
            } else if (logoLayerData.position) {
              // Use position (typically top-right corner)
              const posX = logoLayerData.position.x || 0.9;
              const posY = logoLayerData.position.y || 0.1;
              logoLeft = Math.round(posX * canvasWidth) - logoWidth;
              logoTop = Math.round(posY * canvasHeight);
            }

            // CRITICAL: Ensure logo stays within canvas bounds
            logoLeft = Math.max(0, Math.min(logoLeft, canvasWidth - logoWidth));
            logoTop = Math.max(0, Math.min(logoTop, canvasHeight - logoHeight));
            // Ensure logo dimensions don't exceed canvas
            logoWidth = Math.min(logoWidth, canvasWidth - logoLeft);
            logoHeight = Math.min(logoHeight, canvasHeight - logoTop);

            // Process logo URL - use raw URL directly (same as base video)
            // Get logo URL from file object first (from upload section), then fallback to layer data
            let logoMediaSrc = file.logoUrl || file.logo_url || logoLayerData.url || '';

            // Check if logoMediaSrc is already double-prefixed
            if (logoMediaSrc.includes('/api/latest/local-media/serve/http') || logoMediaSrc.includes('/api/latest/local-media/serve/https')) {
              const match = logoMediaSrc.match(/\/api\/latest\/local-media\/serve\/(https?:\/\/.+)/);
              if (match && match[1]) {
                logoMediaSrc = match[1];
              }
            }

            // Use raw URL directly - NEVER add prefix (same as base video)
            // The URL from API response should be used as-is
            if (!logoMediaSrc) {
              continue; // Skip if no logo URL
            }

            // Map animation type
            let animationType = 'none';
            if (logoLayerData.animation?.type === 'fade_in_out' || logoLayerData.animation?.type === 'fade') {
              animationType = 'fade';
            }

            // Add logo overlay (IMAGE type for image panel)
            const logoId = file.name || file.title || file.id || `logo-${i}`;
            const cleanLogoId = String(logoId)
              .replace(/[^a-zA-Z0-9_-]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '')
              .toLowerCase();

            newOverlays.push({
              id: `logo-${cleanLogoId}`,
              left: logoLeft,
              top: logoTop,
              width: logoWidth,
              height: logoHeight,
              durationInFrames: logoDurationInFrames,
              from: logoStartFrame,
              rotation: logoLayerData.rotation || 0,
              row: logoRow, // CRITICAL: Use global logo row (all logos in same layer)
              isDragging: false,
              type: OverlayType.IMAGE, // CRITICAL: Use IMAGE type for image panel
              content: logoMediaSrc, // Set content to image URL (same as normal image overlays)
              src: logoMediaSrc, // Image source URL
              styles: {
                opacity: logoLayerData.opacity !== undefined ? logoLayerData.opacity : 1,
                zIndex: 400, // CRITICAL: Highest z-index (above all other layers)
                transform: logoLayerData.scale !== undefined && logoLayerData.scale !== 1 ? `scale(${logoLayerData.scale})` : 'none',
                objectFit: 'contain', // Default objectFit for logo
                mixBlendMode: logoLayerData.blend_mode || 'normal',
                animation: {
                  enter: animationType,
                  exit: animationType,
                  duration: logoLayerData.animation?.duration || 0.5,
                },
              },
              sceneNumber: sceneNumber,
            });
          }

          // STEP 3: Get chart layer data from new schema (row after logo)
          // CRITICAL: Only add chart overlay if it exists in videos.v1.layers array
          // This ensures we only show chart layers that are actually in the user session data
          // and prevents duplicate chart layers from being added
          const chartLayerData = getChartLayerDataForBuild(file);

          let chartVideoUrl = null;
          let chartPosition = { x: 0.5, y: 0.5 };
          let chartBoundingBox = null;
          let chartSize = null;
          let chartScaling = { scale_x: 1, scale_y: 1, fit_mode: 'contain' };
          let chartAnimation = { type: 'none', duration: 0.5 };
          let chartOpacity = 1;
          let chartLayout = { align: 'center', verticalAlign: 'middle' };
          let chartHasBackground = true;

          // CRITICAL FIX: Only use chart layer if it exists in THIS file's videos.v1.layers array
          // This ensures charts are only shown for the correct scene/video
          // Each video file should only have its own chart, not charts from other videos
          if (chartLayerData && chartLayerData.enabled !== false && chartLayerData.url) {
            // Chart layer exists in THIS file's videos.v1.layers - use it
            chartVideoUrl = chartLayerData.url;
            chartPosition = chartLayerData.position;
            chartBoundingBox = chartLayerData.bounding_box;
            chartSize = chartLayerData.size;
            chartScaling = chartLayerData.scaling;
            chartAnimation = chartLayerData.animation;
            chartOpacity = chartLayerData.opacity;
            chartLayout = chartLayerData.layout;
            chartHasBackground = chartLayerData.has_background !== undefined ? chartLayerData.has_background : true;

            // Get scene number for this video to verify chart belongs to correct scene
            const currentSceneNumber = file.sceneNumber || file.scene_number || (i + 1);
          } else {
            // No chart layer in THIS file's videos.v1.layers - don't add chart overlay
            // This ensures we only show layers that are actually in the user session data
            chartVideoUrl = null;
            const currentSceneNumber = file.sceneNumber || file.scene_number || (i + 1);
          }

          // Default video dimensions - fixed at 1280x720 (must fit within canvas)
          const DEFAULT_VIDEO_WIDTH = 1280;
          const DEFAULT_VIDEO_HEIGHT = 720;

          // Note: currentAspectRatio, canvasWidth, and canvasHeight are already declared at line 2489

          // ALWAYS CENTER VIDEOS BY DEFAULT
          const left = 0;
          const top = 0;

          // Ensure mediaSrc is valid
          if (!mediaSrc || !mediaSrc.trim()) {
            continue;
          }

          // STEP 4: Process chart video (use calculated chartRow)
          // CRITICAL: Only add chart if it exists in THIS file's layers array
          // This ensures charts are only shown for the correct scene/video
          if (chartVideoUrl && chartVideoUrl.trim() && chartLayerData) {
            // Process chart video URL (same logic as base video URL)
            let rawChartPath = chartVideoUrl;

            // Check if chart video URL is already double-prefixed
            if (rawChartPath.includes('/api/latest/local-media/serve/http') ||
              rawChartPath.includes('/api/latest/local-media/serve/https')) {
              const match = rawChartPath.match(/\/api\/latest\/local-media\/serve\/(https?:\/\/.+)/);
              if (match && match[1]) {
                rawChartPath = match[1];
              }
            }

            // Determine chart video media source
            let chartMediaSrc;
            if (rawChartPath.startsWith("http://") || rawChartPath.startsWith("https://") || rawChartPath.startsWith("blob:")) {
              chartMediaSrc = rawChartPath;
            } else {
              const cleanChartPath = rawChartPath.startsWith("/") ? rawChartPath.slice(1) : rawChartPath;
              chartMediaSrc = `/api/latest/local-media/serve/${cleanChartPath}`;
            }

            // Get chart video duration - should match base video duration for overlay
            // Chart should overlay the entire base video, so use the same duration
            let chartDurationSeconds = durationSeconds; // Use base video duration

            try {
              const chartVideo = document.createElement('video');
              chartVideo.crossOrigin = 'anonymous';
              chartVideo.preload = 'metadata';

              await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                  resolve();
                }, 5000);

                chartVideo.onloadedmetadata = () => {
                  clearTimeout(timeout);
                  const dur = chartVideo.duration;
                  if (isFinite(dur) && dur > 0) {
                    chartDurationSeconds = dur;
                  }
                  resolve();
                };

                chartVideo.onerror = (error) => {
                  clearTimeout(timeout);
                  resolve();
                };

                chartVideo.src = chartMediaSrc;
              });
            } catch (error) {
            }

            const chartDurationInFrames = Math.max(1, Math.round(chartDurationSeconds * fps));

            // CRITICAL: Chart should always start at the same fromFrame as the base video
            // Charts are overlays on the base video, not separate scenes
            // Always use fromFrame to ensure chart appears as overlay on the base video
            const chartStartFrame = fromFrame;

            // Calculate position and size from bounding_box, size, or position
            // Note: currentAspectRatio, canvasWidth, and canvasHeight are already declared above

            let chartLeft = 0;
            let chartTop = 0;
            let chartWidth = DEFAULT_VIDEO_WIDTH;
            let chartHeight = DEFAULT_VIDEO_HEIGHT;

            // Priority 1: Use bounding_box if available (most precise)
            if (chartBoundingBox) {
              // Use bounding_box for absolute positioning and size
              chartLeft = Math.round((chartBoundingBox.x || 0) * canvasWidth);
              chartTop = Math.round((chartBoundingBox.y || 0) * canvasHeight);
              chartWidth = Math.round((chartBoundingBox.width || 1) * canvasWidth);
              chartHeight = Math.round((chartBoundingBox.height || 1) * canvasHeight);
            }
            // Priority 2: Use size and position if available
            else if (chartSize && chartPosition) {
              // Use size for dimensions (can be absolute pixels or relative 0-1)
              if (typeof chartSize === 'object' && chartSize.width && chartSize.height) {
                // If size values are less than 1, treat as relative (0-1), otherwise absolute pixels
                chartWidth = chartSize.width < 1 ? Math.round(chartSize.width * canvasWidth) : Math.round(chartSize.width);
                chartHeight = chartSize.height < 1 ? Math.round(chartSize.height * canvasHeight) : Math.round(chartSize.height);
              } else if (typeof chartSize === 'number') {
                // Single number - treat as scale factor
                chartWidth = Math.round(DEFAULT_VIDEO_WIDTH * chartSize);
                chartHeight = Math.round(DEFAULT_VIDEO_HEIGHT * chartSize);
              }

              // Use position for placement (0-1 normalized coordinates)
              const posX = chartPosition.x !== undefined ? chartPosition.x : 0.5;
              const posY = chartPosition.y !== undefined ? chartPosition.y : 0.5;

              // Calculate position - if position is 0-1, treat as normalized; if > 1, treat as absolute pixels
              if (posX <= 1 && posY <= 1) {
                // Normalized coordinates (0-1) - center the chart at this position
                chartLeft = Math.round((posX * canvasWidth) - (chartWidth / 2));
                chartTop = Math.round((posY * canvasHeight) - (chartHeight / 2));
              } else {
                // Absolute pixel coordinates
                chartLeft = Math.round(posX);
                chartTop = Math.round(posY);
              }
            }
            // Priority 3: Use position only (center chart at position)
            else if (chartPosition) {
              const posX = chartPosition.x !== undefined ? chartPosition.x : 0.5;
              const posY = chartPosition.y !== undefined ? chartPosition.y : 0.5;

              if (posX <= 1 && posY <= 1) {
                // Normalized coordinates (0-1)
                chartLeft = Math.round((posX * canvasWidth) - (chartWidth / 2));
                chartTop = Math.round((posY * canvasHeight) - (chartHeight / 2));
              } else {
                // Absolute pixel coordinates
                chartLeft = Math.round(posX - (chartWidth / 2));
                chartTop = Math.round(posY - (chartHeight / 2));
              }
            }
            // Priority 4: Default to center if nothing specified
            else {
              chartLeft = (canvasWidth - chartWidth) / 2;
              chartTop = (canvasHeight - chartHeight) / 2;
            }

            // CRITICAL: Ensure chart stays within canvas bounds - comprehensive boundary checks
            // Clamp position to canvas bounds (prevent negative or out-of-bounds positions)
            chartLeft = Math.max(0, Math.min(chartLeft, canvasWidth - Math.max(1, chartWidth)));
            chartTop = Math.max(0, Math.min(chartTop, canvasHeight - Math.max(1, chartHeight)));
            // Clamp dimensions to fit within remaining canvas space
            chartWidth = Math.max(1, Math.min(chartWidth, canvasWidth - chartLeft));
            chartHeight = Math.max(1, Math.min(chartHeight, canvasHeight - chartTop));
            // Final safety check: ensure position + size doesn't exceed canvas
            if (chartLeft + chartWidth > canvasWidth) {
              chartWidth = Math.max(1, canvasWidth - chartLeft);
            }
            if (chartTop + chartHeight > canvasHeight) {
              chartHeight = Math.max(1, canvasHeight - chartTop);
            }

            // Map animation type
            let animationType = 'none';
            if (chartAnimation?.type === 'fade_in_out' || chartAnimation?.type === 'fade') {
              animationType = 'fade';
            } else if (chartAnimation?.type) {
              animationType = chartAnimation.type;
            }

            // Add chart video overlay on Row 1 (below logo/text on row 0, above base video on row 2)
            const chartId = file.name || file.title || file.id || `chart-${i}`;
            const cleanChartId = String(chartId)
              .replace(/[^a-zA-Z0-9_-]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '')
              .toLowerCase();

            // Build styles object with background removal support
            const chartStyles = {
              opacity: chartOpacity,
              zIndex: 200,
              transform: `scale(${chartScaling?.scale_x || 1}, ${chartScaling?.scale_y || 1})`,
              objectFit: chartScaling?.fit_mode || 'contain',
              animation: {
                enter: animationType,
                exit: animationType,
                duration: chartAnimation?.duration || 0.5,
              },
              textAlign: chartLayout ? (chartLayout.align || 'center') : 'center',
              padding: chartLayout ? (chartLayout.padding || 0) : 0,
              verticalAlign: chartLayout ? (chartLayout.verticalAlign || 'middle') : 'middle',
              // CRITICAL: Use multiply blend mode to remove white backgrounds
              mixBlendMode: chartHasBackground ? 'normal' : 'screen',
              filter: chartHasBackground ? 'none' : 'invert(1) contrast(1.5) invert(1) brightness(1.2)',
              backdropFilter: chartHasBackground ? 'none' : 'brightness(1.2)',
            };
            newOverlays.push({
              id: `chart-${cleanChartId}`,
              left: chartLeft,
              top: chartTop,
              width: chartWidth,
              height: chartHeight,
              durationInFrames: chartDurationInFrames,
              from: chartStartFrame, // CRITICAL: Use calculated chart start frame (respects timing)
              rotation: chartLayerData ? (chartLayerData.rotation || 0) : 0,
              row: chartRow,
              isDragging: false,
              type: OverlayType.VIDEO,
              content: chartMediaSrc,
              src: chartMediaSrc,
              videoStartTime: 0,
              mediaSrcDuration: chartDurationSeconds,
              has_background: chartHasBackground,
              removeBackground: !chartHasBackground,
              needsChromaKey: !chartHasBackground, // ADD THIS FLAG
              styles: chartStyles,
              style: chartHasBackground ? {} : {
                mixBlendMode: 'screen',
                filter: 'invert(1) contrast(1.5) invert(1) brightness(1.2)',
                WebkitFilter: 'invert(1) contrast(1.5) invert(1) brightness(1.2)',
                opacity: 0, // START HIDDEN
              },
              className: chartHasBackground ? '' : 'chart-no-background',
              sceneNumber: sceneNumber,
            });

          }

          // STEP 4.5: Process custom_sticker layers (if any)
          const customStickerLayers = getCustomStickerLayerDataForBuild(file);

          if (customStickerLayers && customStickerLayers.length > 0) {
            customStickerLayers.forEach((stickerLayerData, stickerIndex) => {
              if (!stickerLayerData.enabled) {
                return;
              }

              // Process sticker URL
              let rawStickerPath = stickerLayerData.url;
              if (!rawStickerPath || !rawStickerPath.trim()) {
                return; // Skip if no URL
              }

              // Check if sticker URL is already double-prefixed
              if (rawStickerPath.includes('/api/latest/local-media/serve/http') ||
                rawStickerPath.includes('/api/latest/local-media/serve/https')) {
                const match = rawStickerPath.match(/\/api\/latest\/local-media\/serve\/(https?:\/\/.+)/);
                if (match && match[1]) {
                  rawStickerPath = match[1];
                }
              }

              // Determine sticker media source
              let stickerMediaSrc;
              if (rawStickerPath.startsWith("http://") || rawStickerPath.startsWith("https://") || rawStickerPath.startsWith("blob:")) {
                stickerMediaSrc = rawStickerPath;
              } else {
                const cleanStickerPath = rawStickerPath.startsWith("/") ? rawStickerPath.slice(1) : rawStickerPath;
                stickerMediaSrc = `/api/latest/local-media/serve/${cleanStickerPath}`;
              }

              // Calculate sticker timing
              const stickerStartFrame = stickerLayerData.timing?.start
                ? (fromFrame + convertTimingToFrames(stickerLayerData.timing.start, fps))
                : fromFrame;
              const stickerEndFrame = stickerLayerData.timing?.end
                ? (fromFrame + convertTimingToFrames(stickerLayerData.timing.end, fps))
                : (fromFrame + durationInFrames);
              const stickerDurationInFrames = Math.max(1, stickerEndFrame - stickerStartFrame);

              // Calculate sticker position and size
              let stickerLeft = 0;
              let stickerTop = 0;
              let stickerWidth = 200; // Default sticker size
              let stickerHeight = 200;

              // Priority 1: Use bounding_box if available
              if (stickerLayerData.bounding_box) {
                stickerLeft = Math.round((stickerLayerData.bounding_box.x || 0) * canvasWidth);
                stickerTop = Math.round((stickerLayerData.bounding_box.y || 0) * canvasHeight);
                stickerWidth = Math.round((stickerLayerData.bounding_box.width || 0.1) * canvasWidth);
                stickerHeight = Math.round((stickerLayerData.bounding_box.height || 0.1) * canvasHeight);
              }
              // Priority 2: Use size and position if available
              else if (stickerLayerData.size && stickerLayerData.position) {
                if (typeof stickerLayerData.size === 'object' && stickerLayerData.size.width && stickerLayerData.size.height) {
                  stickerWidth = stickerLayerData.size.width < 1
                    ? Math.round(stickerLayerData.size.width * canvasWidth)
                    : Math.round(stickerLayerData.size.width);
                  stickerHeight = stickerLayerData.size.height < 1
                    ? Math.round(stickerLayerData.size.height * canvasHeight)
                    : Math.round(stickerLayerData.size.height);
                }

                const posX = stickerLayerData.position.x !== undefined ? stickerLayerData.position.x : 0.5;
                const posY = stickerLayerData.position.y !== undefined ? stickerLayerData.position.y : 0.5;

                if (posX <= 1 && posY <= 1) {
                  stickerLeft = Math.round((posX * canvasWidth) - (stickerWidth / 2));
                  stickerTop = Math.round((posY * canvasHeight) - (stickerHeight / 2));
                } else {
                  stickerLeft = Math.round(posX - (stickerWidth / 2));
                  stickerTop = Math.round(posY - (stickerHeight / 2));
                }
              }
              // Priority 3: Use position only
              else if (stickerLayerData.position) {
                const posX = stickerLayerData.position.x !== undefined ? stickerLayerData.position.x : 0.5;
                const posY = stickerLayerData.position.y !== undefined ? stickerLayerData.position.y : 0.5;

                if (posX <= 1 && posY <= 1) {
                  stickerLeft = Math.round((posX * canvasWidth) - (stickerWidth / 2));
                  stickerTop = Math.round((posY * canvasHeight) - (stickerHeight / 2));
                } else {
                  stickerLeft = Math.round(posX - (stickerWidth / 2));
                  stickerTop = Math.round(posY - (stickerHeight / 2));
                }
              }

              // Ensure sticker stays within canvas bounds
              stickerLeft = Math.max(0, Math.min(stickerLeft, canvasWidth - Math.max(1, stickerWidth)));
              stickerTop = Math.max(0, Math.min(stickerTop, canvasHeight - Math.max(1, stickerHeight)));
              stickerWidth = Math.max(1, Math.min(stickerWidth, canvasWidth - stickerLeft));
              stickerHeight = Math.max(1, Math.min(stickerHeight, canvasHeight - stickerTop));

              // Map animation type
              let animationType = 'none';
              if (stickerLayerData.animation?.type === 'fade_in_out' || stickerLayerData.animation?.type === 'fade') {
                animationType = 'fade';
              } else if (stickerLayerData.animation?.type) {
                animationType = stickerLayerData.animation.type;
              }

              // Add custom_sticker overlay (IMAGE type)
              const stickerId = file.name || file.title || file.id || `sticker-${i}-${stickerIndex}`;
              const cleanStickerId = String(stickerId)
                .replace(/[^a-zA-Z0-9_-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .toLowerCase();

              // Use a row after text overlays but before logos
              // Calculate dynamic row for stickers (after text overlays)
              const stickerRow = Math.max(lastTextRow + 1, 3); // At least row 3, after text overlays

              newOverlays.push({
                id: `sticker-${cleanStickerId}`,
                left: stickerLeft,
                top: stickerTop,
                width: stickerWidth,
                height: stickerHeight,
                durationInFrames: stickerDurationInFrames,
                from: stickerStartFrame,
                rotation: stickerLayerData.rotation || 0,
                row: stickerRow,
                isDragging: false,
                type: OverlayType.IMAGE,
                content: stickerMediaSrc,
                src: stickerMediaSrc,
                styles: {
                  opacity: stickerLayerData.opacity !== undefined ? stickerLayerData.opacity : 1,
                  zIndex: 300,
                  transform: `scale(${stickerLayerData.scaling?.scale_x || 1}, ${stickerLayerData.scaling?.scale_y || 1})`,
                  objectFit: stickerLayerData.scaling?.fit_mode || 'contain',
                  animation: {
                    enter: animationType,
                    exit: animationType,
                    duration: stickerLayerData.animation?.duration || 0.5,
                  },
                },
                sceneNumber: sceneNumber,
              });
            });
          }

          // STEP 5: Add base video overlay (use calculated baseVideoRow)
          const baseVideoId = file.name || file.title || file.id || `base-video-${i}`;
          const cleanBaseVideoId = String(baseVideoId)
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .toLowerCase();

          // Note: currentAspectRatio, canvasWidth, and canvasHeight are already declared above

          // Get base video layer data from script object (similar to subtitles)
          const baseVideoLayerData = getBaseVideoLayerData(file);

          // Calculate base video timing (same logic as subtitles)
          // Use timing from script object if available, otherwise use scene start/end
          // Timing is relative to scene start, so we need to add fromFrame for non-first scenes
          const isFirstScene = i === 0;
          let baseVideoStartFrameRelative = 0; // Relative to scene start (in frames)
          let baseVideoEndFrameRelative = durationInFrames; // Default to scene duration

          if (baseVideoLayerData?.timing) {
            // Parse timing start and end (relative to scene start)
            const timingStart = baseVideoLayerData.timing.start;
            const timingEnd = baseVideoLayerData.timing.end;

            if (timingStart) {
              baseVideoStartFrameRelative = convertTimingToFrames(timingStart, fps);
            }

            if (timingEnd) {
              baseVideoEndFrameRelative = convertTimingToFrames(timingEnd, fps);
            }
          }

          // Calculate absolute start frame: fromFrame (scene start) + relative timing start
          // For first scene, if timing start is "00:00:00", ensure it starts at frame 0
          const baseVideoStartFrame = isFirstScene && baseVideoStartFrameRelative === 0
            ? 0
            : (fromFrame + baseVideoStartFrameRelative);
          const baseVideoEndFrame = fromFrame + baseVideoEndFrameRelative;
          const baseVideoDurationInFrames = Math.max(1, baseVideoEndFrame - baseVideoStartFrame);

          // Base videos ALWAYS fill the canvas completely for both 9:16 and 16:9
          // This ensures the base video covers the entire canvas regardless of video dimensions
          // CRITICAL: Base video dimensions must EXACTLY match canvas dimensions (no overflow, no gaps)
          // For 16:9: canvasWidth=1280, canvasHeight=720 → baseVideoWidth=1280, baseVideoHeight=720
          // For 9:16: canvasWidth=1080, canvasHeight=1920 → baseVideoWidth=1080, baseVideoHeight=1920
          // Use canvas dimensions directly - they are already integers (1280/720 for 16:9, 1080/1920 for 9:16)
          const baseVideoWidth = canvasWidth; // CRITICAL: Must be exactly canvasWidth (no rounding needed)
          const baseVideoHeight = canvasHeight; // CRITICAL: Must be exactly canvasHeight (no rounding needed)
          const baseVideoLeft = 0; // CRITICAL: Always start at (0, 0) to fill canvas from top-left
          const baseVideoTop = 0; // CRITICAL: Always start at (0, 0) to fill canvas from top-left
          const baseVideoObjectFit = 'cover'; // CRITICAL: Use 'cover' to fill entire canvas with no gaps

          // Debug logging to verify dimensions match canvas

          // Verify base video exactly matches canvas dimensions
          if (baseVideoWidth !== canvasWidth || baseVideoHeight !== canvasHeight) {
          }

          newOverlays.push({
            id: `base-video-${cleanBaseVideoId}`, // Use file name as ID for uniqueness
            left: baseVideoLeft, // CRITICAL: Exactly 0 to fill from left edge
            top: baseVideoTop, // CRITICAL: Exactly 0 to fill from top edge
            width: baseVideoWidth, // CRITICAL: Exactly canvasWidth (1280 for 16:9, 1080 for 9:16)
            height: baseVideoHeight, // CRITICAL: Exactly canvasHeight (720 for 16:9, 1920 for 9:16)
            durationInFrames: baseVideoDurationInFrames, // Use duration from timing if available
            from: baseVideoStartFrame, // Use start frame from timing (like subtitles)
            rotation: 0,
            row: baseVideoRow, // CRITICAL: Use calculated row (after chart)
            isDragging: false,
            type: OverlayType.VIDEO,
            content: mediaSrc, // Use video source as content
            src: mediaSrc, // Direct base_video_url from new schema - no prefixing, no modification
            videoStartTime: 0,
            mediaSrcDuration: durationSeconds,
            styles: {
              opacity: 1,
              zIndex: 90, // zIndex = 100 - (1 * 10) = 90
              transform: 'none', // CRITICAL: No transform to ensure exact positioning
              objectFit: baseVideoObjectFit, // CRITICAL: 'cover' fills entire canvas with no gaps for both 16:9 and 9:16
              animation: {
                enter: 'none',
                exit: 'none',
              },
            },
            sceneNumber: sceneNumber,
          });

          // STEP 6: Audio processing (see below)

          // Add audio overlay from the SAME object - on a separate timeline row
          // PRIORITY 1: Get audio layer data from new schema (videos.v1.layers)
          const audioLayerData = getAudioLayerDataForBuild(file);
          let audioUrl = null;
          let audioVolume = 1;

          if (audioLayerData) {
            audioUrl = audioLayerData.url;
            audioVolume = audioLayerData.volume;
          } else {
            // PRIORITY 2: Check file-level audio properties
            audioUrl = file.audioUrl || file.audio_url || '';
            if (audioUrl) {
            } else {
              // PRIORITY 3: Check scenes array - especially for first scene (index 0)
              // Some video entries have audio stored in their scenes array
              if (file.scenes && Array.isArray(file.scenes) && file.scenes.length > 0) {
                // For first scene, check first scene's audioUrl
                const targetSceneIndex = i === 0 ? 0 : Math.min(i, file.scenes.length - 1);
                const targetScene = file.scenes[targetSceneIndex];
                if (targetScene && targetScene.audioUrl) {
                  audioUrl = targetScene.audioUrl;
                }
              }

              // PRIORITY 4: Try getAudioUrlFromEntryLocal as last resort (comprehensive search)
              if (!audioUrl) {
                const entryAudioUrl = getAudioUrlFromEntryLocal(file);
                if (entryAudioUrl) {
                  audioUrl = entryAudioUrl;
                }
              }

              if (!audioUrl) {
                console.warn(`[VideosList] Scene ${i + 1} - ⚠️ NO AUDIO URL FOUND!`, {
                  hasAudioLayerData: !!audioLayerData,
                  fileKeys: Object.keys(file),
                  fileAudioUrl: file.audioUrl,
                  fileAudio_url: file.audio_url,
                  fileScenes: file.scenes ? file.scenes.map((s, idx) => ({ index: idx, hasAudioUrl: !!s.audioUrl, audioUrl: s.audioUrl })) : null,
                  fileVideos: file.videos ? Object.keys(file.videos) : null,
                  fileVideosV1: file.videos?.v1 ? Object.keys(file.videos.v1) : null,
                  fileVideosV1Layers: file.videos?.v1?.layers ? file.videos.v1.layers.map(l => l?.name) : null
                });
              }
            }
          }

          if (audioUrl && audioUrl.trim()) {
            // Process audio URL the same way as video URL
            let rawAudioPath = audioUrl;

            // Check if audio URL is already double-prefixed
            if (rawAudioPath.includes('/api/latest/local-media/serve/http') || rawAudioPath.includes('/api/latest/local-media/serve/https')) {
              console.warn('[VideosList] WARNING: Double-prefixed audio URL detected!', rawAudioPath);
              const match = rawAudioPath.match(/\/api\/latest\/local-media\/serve\/(https?:\/\/.+)/);
              if (match && match[1]) {
                rawAudioPath = match[1];
              }
            }

            // Determine audio media source (same logic as video)
            let audioMediaSrc;
            if (rawAudioPath.startsWith("http://") || rawAudioPath.startsWith("https://") || rawAudioPath.startsWith("blob:")) {
              audioMediaSrc = rawAudioPath;
            } else {
              const cleanAudioPath = rawAudioPath.startsWith("/") ? rawAudioPath.slice(1) : rawAudioPath;
              audioMediaSrc = `/api/latest/local-media/serve/${cleanAudioPath}`;
            }

            // Get audio duration and preload audio for smooth playback
            // CRITICAL: Preload ALL audio files fully for smooth playback
            let audioDurationSeconds = durationSeconds; // Default to video duration

            // CRITICAL: Determine if this is Scene 1 (first video in loop)
            const isFirstScene = i === 0;

            // Calculate audio timing (REPLICATE SUBTITLE LOGIC EXACTLY)
            // Subtitles use: subtitleStartFrame = timing?.start ? convertTimingToFrames(timing.start) : fromFrame
            // This means timing is treated as absolute timeline position, not relative to scene
            let audioStartFrame = fromFrame; // Default to scene start if no timing
            let audioEndFrame = fromFrame + durationInFrames; // Default to scene end if no timing
            let audioDurationInFrames = 0; // Will be calculated from start/end
            let useTimingForDuration = false;

            if (audioLayerData?.timing) {
              // Parse timing start and end (same as subtitles - absolute timeline positions)
              const timingStart = audioLayerData.timing.start;
              const timingEnd = audioLayerData.timing.end;

              if (timingStart) {
                // Convert timing to frames (absolute position on timeline, like subtitles)
                audioStartFrame = convertTimingToFrames(timingStart, fps);
              }

              if (timingEnd) {
                // Convert timing to frames (absolute position on timeline, like subtitles)
                audioEndFrame = convertTimingToFrames(timingEnd, fps);
                audioDurationInFrames = Math.max(1, audioEndFrame - audioStartFrame);
                useTimingForDuration = true;
              }
            }

            // If timing doesn't specify duration, use default (video duration or audio file duration)
            if (!useTimingForDuration) {
              // Will be set after audio preload or use video duration as fallback
            }

            // Debug logging to verify audio positioning per scene (matching subtitle pattern)
            console.log(`[VideosList] Audio positioning for Scene ${i + 1} (subtitle-style):`, {
              sceneIndex: i,
              fromFrame,
              audioStartFrame,
              audioEndFrame,
              timing: audioLayerData?.timing,
              audioUrl: audioUrl?.substring(0, 50) + '...'
            });

            // Preload audio asynchronously (non-blocking) - don't await to avoid blocking overlay creation
            // This allows overlay creation to proceed even if audio preload is slow
            (async () => {
              try {
                const audio = document.createElement('audio');
                audio.crossOrigin = 'anonymous';
                // CRITICAL: Preload entire audio file for ALL scenes to ensure smooth playback
                audio.preload = 'auto';

                await new Promise((resolve) => {
                  let metadataLoaded = false;
                  let audioReady = false;

                  const timeout = setTimeout(() => {
                    if (metadataLoaded) {
                      if (audioReady) {
                      } else {
                        console.warn(`[VideosList] Audio ${i + 1} preload timeout (metadata loaded), continuing...`);
                      }
                      resolve();
                    } else {
                      console.warn(`[VideosList] Audio ${i + 1} metadata timeout, using video duration:`, audioDurationSeconds);
                      resolve();
                    }
                  }, 10000); // 10 second timeout for all audio files

                  const handleLoadedMetadata = () => {
                    metadataLoaded = true;
                    const dur = audio.duration;
                    if (isFinite(dur) && dur > 0) {
                      audioDurationSeconds = dur;
                      // Only use audio file duration if timing doesn't specify duration
                      if (!useTimingForDuration) {
                        audioDurationInFrames = Math.max(1, Math.round(audioDurationSeconds * fps));
                      }
                    }
                    // Wait for audio to be ready to play (for all scenes)
                    if (audioReady) {
                      clearTimeout(timeout);
                      resolve();
                    }
                  };

                  // Wait for audio to be ready to play (for ALL scenes)
                  const handleCanPlayThrough = () => {
                    audioReady = true;
                    if (metadataLoaded) {
                      clearTimeout(timeout);
                      resolve();
                    }
                  };

                  // Fallback: If canplaythrough doesn't fire, use loadeddata
                  const handleLoadedData = () => {
                    if (!audioReady) {
                      setTimeout(() => {
                        if (!audioReady && metadataLoaded) {
                          audioReady = true;
                          clearTimeout(timeout);
                          resolve();
                        }
                      }, 200);
                    }
                  };

                  audio.addEventListener('loadedmetadata', handleLoadedMetadata);
                  audio.addEventListener('canplaythrough', handleCanPlayThrough);
                  audio.addEventListener('loadeddata', handleLoadedData);

                  audio.onerror = (error) => {
                    clearTimeout(timeout);
                    console.warn(`[VideosList] Audio ${i + 1} load error, using video duration:`, audioDurationSeconds, error);
                    audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
                    audio.removeEventListener('canplaythrough', handleCanPlayThrough);
                    audio.removeEventListener('loadeddata', handleLoadedData);
                    resolve();
                  };

                  audio.src = audioMediaSrc;
                  audio.load(); // Explicitly start loading
                });
              } catch (error) {
                console.warn(`[VideosList] Error loading audio ${i + 1}:`, error);
                // Continue even if preload fails - overlay is already created
              }
            })(); // Execute async without blocking

            // If timing doesn't specify duration, calculate from audioDurationSeconds (will be updated by preload)
            // This matches subtitle logic: if no timing.end, use scene duration
            if (!useTimingForDuration) {
              audioDurationInFrames = Math.max(1, Math.round(audioDurationSeconds * fps));
              // Update audioEndFrame based on calculated duration
              audioEndFrame = audioStartFrame + audioDurationInFrames;
            } else {
              // Duration already calculated from timing.end - audioEndFrame is already set
              audioDurationInFrames = Math.max(1, audioEndFrame - audioStartFrame);
            }

            // REPLICATE SUBTITLE LOGIC: Use timing frames directly, no clamping to scene boundaries
            // Subtitles don't clamp - they use timing as absolute positions
            // This allows audio to span scenes if timing specifies it, just like subtitles can
            const finalAudioStartFrame = audioStartFrame;
            const finalAudioDurationInFrames = audioDurationInFrames;

            // Add audio overlay on row 3 (bottom track) - CRITICAL: Audio MUST be on Row 3 (below chart, subtitles, and base video)
            const audioId = file.name || file.title || file.id || `audio-${i}`;
            const cleanAudioId = String(audioId)
              .replace(/[^a-zA-Z0-9_-]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '')
              .toLowerCase();

            const audioOverlay = {
              id: `audio-${cleanAudioId}`, // Use file name as ID for uniqueness
              left: 0,
              top: 0,
              width: 0, // Audio has no visual dimensions (allowed for SOUND type)
              height: 0, // Audio has no visual dimensions (allowed for SOUND type)
              durationInFrames: finalAudioDurationInFrames, // From timing (like subtitles)
              from: finalAudioStartFrame, // From timing.start (like subtitles use subtitleStartFrame)
              rotation: 0,
              row: audioRow, // CRITICAL: Use calculated row (after subtitles, bottom track)
              isDragging: false,
              type: OverlayType.SOUND,
              content: file.name || file.title || `Audio ${i + 1}`,
              src: audioMediaSrc, // Audio URL from layers array or fallback - no prefixing, no modification
              mediaSrcDuration: audioDurationSeconds, // Keep for reference, but durationInFrames controls playback
              startFromSound: 0, // Start from beginning of audio file
              styles: {
                volume: audioVolume, // Use volume from layer or default to 1
              },
              sceneNumber: sceneNumber,
            };

            newOverlays.push(audioOverlay);
          }

          // STEP 6: Add subtitle/caption overlay (FIXED to row 1 - all scene subtitles go to row 1, above text layers)
          const subtitleLayerData = getSubtitleLayerData(file);

          if (subtitleLayerData && subtitleLayerData.enabled) {
            // Calculate subtitle timing
            const subtitleStartFrame = subtitleLayerData.timing?.start
              ? convertTimingToFrames(subtitleLayerData.timing.start, fps)
              : fromFrame;
            const subtitleEndFrame = subtitleLayerData.timing?.end
              ? convertTimingToFrames(subtitleLayerData.timing.end, fps)
              : (fromFrame + durationInFrames);
            const subtitleDurationInFrames = Math.max(1, subtitleEndFrame - subtitleStartFrame);

            // Calculate subtitle position - CRITICAL: Use absolute canvas coordinates
            // Note: currentAspectRatio, canvasWidth, and canvasHeight are already declared at line 2489

            let subtitleLeft = 0;
            let subtitleTop = 0;
            let subtitleWidth = canvasWidth * 0.8; // 80% of canvas width for readability
            let subtitleHeight = 120; // Fixed height for subtitle box

            if (subtitleLayerData.bounding_box) {
              // Use bounding_box for absolute positioning
              subtitleLeft = Math.round((subtitleLayerData.bounding_box.x || 0) * canvasWidth);
              subtitleTop = Math.round((subtitleLayerData.bounding_box.y || 0.8) * canvasHeight);
              subtitleWidth = Math.round((subtitleLayerData.bounding_box.width || 0.8) * canvasWidth);
              subtitleHeight = Math.round((subtitleLayerData.bounding_box.height || 0.1) * canvasHeight);
            } else if (subtitleLayerData.position) {
              // Use position for centered positioning (default bottom center)
              const posX = subtitleLayerData.position.x || 0.5; // Default center horizontally
              const posY = subtitleLayerData.position.y || 0.85; // Default near bottom

              // Center the subtitle box horizontally
              subtitleLeft = Math.round((posX * canvasWidth) - (subtitleWidth / 2));
              subtitleTop = Math.round(posY * canvasHeight);
            }

            // CRITICAL: Ensure subtitle stays within canvas bounds with comprehensive boundary checks
            const originalSubtitleLeft = subtitleLeft;
            const originalSubtitleTop = subtitleTop;
            const originalSubtitleWidth = subtitleWidth;
            const originalSubtitleHeight = subtitleHeight;

            // Clamp position to canvas bounds
            subtitleLeft = Math.max(0, Math.min(subtitleLeft, canvasWidth - subtitleWidth));
            subtitleTop = Math.max(0, Math.min(subtitleTop, canvasHeight - subtitleHeight));

            // Clamp dimensions to fit within remaining canvas space
            subtitleWidth = Math.min(subtitleWidth, canvasWidth - subtitleLeft);
            subtitleHeight = Math.min(subtitleHeight, canvasHeight - subtitleTop);

            // Ensure minimum dimensions for readability
            subtitleWidth = Math.max(200, subtitleWidth);
            subtitleHeight = Math.max(40, subtitleHeight);

            // Final boundary check - ensure overlay doesn't exceed canvas
            let subtitleWasClamped = false;
            if (subtitleLeft + subtitleWidth > canvasWidth) {
              subtitleWidth = canvasWidth - subtitleLeft;
              subtitleWasClamped = true;
            }

            if (subtitleTop + subtitleHeight > canvasHeight) {
              subtitleHeight = canvasHeight - subtitleTop;
              subtitleWasClamped = true;
            }

            // Calculate normalized position (0-1 range) for saving/API - like chart editor
            // Position represents the center of the subtitle box in normalized coordinates
            const normalizedX = (subtitleLeft + subtitleWidth / 2) / canvasWidth;
            const normalizedY = (subtitleTop + subtitleHeight / 2) / canvasHeight;
            const normalizedPosition = {
              x: Math.max(0, Math.min(1, normalizedX)), // Clamp to 0-1
              y: Math.max(0, Math.min(1, normalizedY))  // Clamp to 0-1
            };

            // Calculate normalized bounding box (0-1 range)
            const normalizedBoundingBox = {
              x: subtitleLeft / canvasWidth,
              y: subtitleTop / canvasHeight,
              width: subtitleWidth / canvasWidth,
              height: subtitleHeight / canvasHeight
            };

            // Parse SRT file directly from URL
            let captions = null;
            let srtUrl = null;

            if (subtitleLayerData.url) {
              // Use SRT URL directly (no upload)
              srtUrl = subtitleLayerData.url;

              const result = await parseSRTToCaption(srtUrl, fps, i);
              captions = result.captions;
              const extractedText = result.extractedText;

              if (captions && captions.length > 0) {
              }
            } else if (subtitleLayerData.text) {
              // Use inline text (no SRT file to upload)
              captions = convertTextToCaption(
                subtitleLayerData.text,
                subtitleStartFrame,
                subtitleEndFrame,
                fps
              );
            }

            if (captions && captions.length > 0) {
              // Add caption overlay (this will appear in caption panel)
              const subtitleId = file.name || file.title || file.id || `caption-${i}`;
              const cleanSubtitleId = String(subtitleId)
                .replace(/[^a-zA-Z0-9_-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .toLowerCase();

              const captionOverlayId = `caption-${cleanSubtitleId}`;

              // CRITICAL: Verify subtitle overlay is within canvas bounds before creating
              const isWithinBounds = subtitleLeft >= 0 && subtitleTop >= 0 &&
                (subtitleLeft + subtitleWidth) <= canvasWidth &&
                (subtitleTop + subtitleHeight) <= canvasHeight;

              // Log warning if overlay was clamped
              if (subtitleWasClamped) {
              }

              // Verify final position is within bounds
              if (!isWithinBounds) {
              }

              // Verify captions array is properly formatted
              const validCaptions = captions.filter(caption =>
                caption &&
                typeof caption.startMs === 'number' &&
                typeof caption.endMs === 'number' &&
                caption.startMs >= 0 &&
                caption.endMs > caption.startMs &&
                (caption.text || '').trim().length > 0
              );

              if (validCaptions.length === 0) {
              }

              // Debug logging for subtitle overlay creation with comprehensive visibility info

              if (!isWithinBounds) {
              }

              if (validCaptions.length === 0) {
              }

              newOverlays.push({
                id: captionOverlayId,
                left: subtitleLeft, // Pixel position for rendering - relative to ReactVideoEditor canvas
                top: subtitleTop, // Pixel position for rendering - relative to ReactVideoEditor canvas
                width: subtitleWidth, // Pixel width for rendering
                height: subtitleHeight, // Pixel height for rendering
                position: normalizedPosition, // Normalized position (0-1) like chart editor
                bounding_box: normalizedBoundingBox, // Normalized bounding box (0-1) for API
                durationInFrames: subtitleDurationInFrames,
                from: subtitleStartFrame,
                rotation: 0,
                row: subtitleRow, // CRITICAL: FIXED to row 1 - all scene subtitles go to row 1 (above text layers)
                isDragging: false,
                type: OverlayType.CAPTION, // CRITICAL: Use CAPTION type for caption panel
                content: subtitleLayerData.text || 'Subtitles',
                src: srtUrl || subtitleLayerData.url || null, // Use SRT URL directly
                captions: validCaptions.length > 0 ? validCaptions : captions, // Use valid captions or fallback to original
                styles: {
                  fontSize: `${subtitleLayerData.style.fontSize}px`,
                  fontFamily: subtitleLayerData.style.fontFamily,
                  fontWeight: String(subtitleLayerData.style.fontWeight),
                  color: subtitleLayerData.style.color,
                  textAlign: subtitleLayerData.style.textAlign || 'center', // Default to center for subtitles
                  lineHeight: String(subtitleLayerData.style.lineHeight || 1.2),
                  letterSpacing: `${subtitleLayerData.style.letterSpacing || 0}px`,
                  opacity: 1, // CRITICAL: Full opacity for visibility
                  textShadow: subtitleLayerData.style.textShadow || '2px 2px 4px rgba(0,0,0,0.8)', // Default shadow for readability
                  backgroundColor: subtitleLayerData.style.backgroundColor || 'rgba(0, 0, 0, 0.7)', // Semi-transparent background for readability
                  padding: subtitleLayerData.style.padding || '12px 16px', // Default padding for readability
                  borderRadius: subtitleLayerData.style.borderRadius || '4px', // Default border radius
                  zIndex: 350, // CRITICAL: Same z-index as text overlays for consistent stacking
                  display: 'block', // CRITICAL: Ensure display is not hidden
                  visibility: 'visible', // CRITICAL: Ensure visibility
                  pointerEvents: 'none', // Allow click-through for video controls
                  // Animation
                  animation: {
                    enter: subtitleLayerData.animation?.type || 'fade',
                    exit: subtitleLayerData.animation?.type || 'fade',
                    duration: subtitleLayerData.animation?.duration || 0.3,
                  },
                },
                sceneNumber: sceneNumber,
              });

              // Subtitle added to timeline
            } else {
            }
          }

          fromFrame += durationInFrames;
        } catch (error) {
        }
      }

      // CRITICAL: After processing all scenes, adjust global layer rows if needed
      // Ensure global layers are after all text overlays
      if (maxTextRow >= GLOBAL_LOGO_ROW) {
        // If text overlays extend beyond global rows, adjust global rows
        const adjustedLogoRow = maxTextRow + 1;
        const adjustedChartRow = adjustedLogoRow + 1;
        const adjustedBaseVideoRow = adjustedChartRow + 1;
        const adjustedAudioRow = adjustedBaseVideoRow + 1;

        // Update all overlays with adjusted rows
        newOverlays.forEach(overlay => {
          if (overlay.row === GLOBAL_LOGO_ROW) {
            overlay.row = adjustedLogoRow;
          } else if (overlay.row === GLOBAL_CHART_ROW) {
            overlay.row = adjustedChartRow;
          } else if (overlay.row === GLOBAL_BASE_VIDEO_ROW) {
            overlay.row = adjustedBaseVideoRow;
          } else if (overlay.row === GLOBAL_AUDIO_ROW) {
            overlay.row = adjustedAudioRow;
          }
        });
      } else {
      }

      if (!cancelled) {
        // CRITICAL: Filter out empty/invalid overlays before processing
        // Only keep overlays that have valid content and properties
        const validOverlays = newOverlays.filter(overlay => {
          // Must have valid ID
          if (!overlay.id || typeof overlay.id !== 'string' || overlay.id.trim() === '') {
            console.warn('⚠️ [LAYERS] Filtering out overlay without valid ID:', overlay);
            return false;
          }

          // Must have valid type
          if (!overlay.type) {
            console.warn('⚠️ [LAYERS] Filtering out overlay without type:', overlay.id);
            return false;
          }

          // Must have valid dimensions (width and height must be numbers >= 0)
          // Exception: SOUND overlays can have width/height of 0 (no visual dimensions)
          if (overlay.type !== OverlayType.SOUND) {
            if (typeof overlay.width !== 'number' || overlay.width <= 0 ||
              typeof overlay.height !== 'number' || overlay.height <= 0 ||
              isNaN(overlay.width) || isNaN(overlay.height)) {
              console.warn('⚠️ [LAYERS] Filtering out overlay with invalid dimensions:', {
                id: overlay.id,
                type: overlay.type,
                width: overlay.width,
                height: overlay.height
              });
              return false;
            }
          } else {
            // For SOUND overlays, width and height can be 0 (they don't have visual dimensions)
            // But they must still be valid numbers
            if (typeof overlay.width !== 'number' || typeof overlay.height !== 'number' ||
              isNaN(overlay.width) || isNaN(overlay.height)) {
              console.warn('⚠️ [LAYERS] Filtering out audio overlay with invalid dimensions:', {
                id: overlay.id,
                type: overlay.type,
                width: overlay.width,
                height: overlay.height
              });
              return false;
            }
          }

          // Must have valid duration
          if (typeof overlay.durationInFrames !== 'number' ||
            overlay.durationInFrames <= 0 ||
            isNaN(overlay.durationInFrames)) {
            console.warn('⚠️ [LAYERS] Filtering out overlay with invalid duration:', {
              id: overlay.id,
              type: overlay.type,
              durationInFrames: overlay.durationInFrames
            });
            return false;
          }

          // Helper function to check if a URL/content is valid (not empty, not just whitespace)
          const isValidContent = (value) => {
            if (!value) return false;
            if (typeof value !== 'string') return false;
            const trimmed = value.trim();
            return trimmed !== '' && trimmed !== 'undefined' && trimmed !== 'null';
          };

          // Type-specific validation with stricter checks
          if (overlay.type === OverlayType.VIDEO) {
            // Video overlays must have valid src or content URL
            const hasValidSrc = overlay.src && isValidContent(overlay.src);
            const hasValidContent = overlay.content && isValidContent(overlay.content);
            if (!hasValidSrc && !hasValidContent) {
              console.warn('⚠️ [LAYERS] Filtering out video overlay without valid src/content:', {
                id: overlay.id,
                src: overlay.src,
                content: overlay.content
              });
              return false;
            }
          } else if (overlay.type === OverlayType.IMAGE) {
            // Image overlays must have valid src or content URL
            const hasValidSrc = overlay.src && isValidContent(overlay.src);
            const hasValidContent = overlay.content && isValidContent(overlay.content);
            if (!hasValidSrc && !hasValidContent) {
              console.warn('⚠️ [LAYERS] Filtering out image overlay without valid src/content:', {
                id: overlay.id,
                src: overlay.src,
                content: overlay.content
              });
              return false;
            }
          } else if (overlay.type === OverlayType.TEXT) {
            // Text overlays must have non-empty content (text)
            if (!overlay.content || typeof overlay.content !== 'string' || overlay.content.trim() === '') {
              console.warn('⚠️ [LAYERS] Filtering out text overlay without valid content:', {
                id: overlay.id,
                content: overlay.content
              });
              return false;
            }
          } else if (overlay.type === OverlayType.SOUND) {
            // Audio overlays must have valid src URL
            if (!overlay.src || !isValidContent(overlay.src)) {
              console.warn('⚠️ [LAYERS] Filtering out audio overlay without valid src:', {
                id: overlay.id,
                src: overlay.src
              });
              return false;
            }
          } else if (overlay.type === OverlayType.CAPTION) {
            // Caption overlays must have valid content (text) or captions array with items
            const hasValidContent = overlay.content && typeof overlay.content === 'string' && overlay.content.trim() !== '';
            const hasValidCaptions = overlay.captions && Array.isArray(overlay.captions) && overlay.captions.length > 0;
            if (!hasValidContent && !hasValidCaptions) {
              console.warn('⚠️ [LAYERS] Filtering out caption overlay without valid content/captions:', {
                id: overlay.id,
                content: overlay.content,
                captions: overlay.captions
              });
              return false;
            }
          }

          // Additional check: overlay must have valid 'from' position
          if (typeof overlay.from !== 'number' || isNaN(overlay.from) || overlay.from < 0) {
            console.warn('⚠️ [LAYERS] Filtering out overlay with invalid from position:', {
              id: overlay.id,
              type: overlay.type,
              from: overlay.from
            });
            return false;
          }

          return true;
        });

        const filteredCount = newOverlays.length - validOverlays.length;

        if (validOverlays.length > 0) {
          // Sort overlays by row and then by from position
          validOverlays.sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return (a.from || 0) - (b.from || 0);
          });

          // Log detailed overlay summary with layer organization
          const overlaysByRow = {};
          const overlaysByType = {};
          const audioOverlays = [];

          // Group overlays by type to verify layer organization
          const overlaysByLayerType = {
            baseVideos: [],
            charts: [],
            subtitles: [],
            audio: [],
            text: [],
            logos: []
          };

          validOverlays.forEach(overlay => {
            if (overlay.type === OverlayType.VIDEO && overlay.id?.includes('base-video')) {
              overlaysByLayerType.baseVideos.push(overlay);
            } else if (overlay.type === OverlayType.VIDEO && overlay.id?.includes('chart')) {
              overlaysByLayerType.charts.push(overlay);
            } else if (overlay.type === OverlayType.CAPTION) {
              overlaysByLayerType.subtitles.push(overlay);
            } else if (overlay.type === OverlayType.SOUND) {
              overlaysByLayerType.audio.push(overlay);
            } else if (overlay.type === OverlayType.TEXT) {
              overlaysByLayerType.text.push(overlay);
            } else if (overlay.type === OverlayType.IMAGE && overlay.id?.includes('logo')) {
              overlaysByLayerType.logos.push(overlay);
            }
          });

          validOverlays.forEach(overlay => {
            // Count by row
            if (!overlaysByRow[overlay.row]) {
              overlaysByRow[overlay.row] = [];
            }
            overlaysByRow[overlay.row].push(overlay);

            // Count by type
            overlaysByType[overlay.type] = (overlaysByType[overlay.type] || 0) + 1;

            // Track audio overlays specifically
            if (overlay.type === OverlayType.SOUND) {
              audioOverlays.push({
                id: overlay.id,
                from: overlay.from,
                durationInFrames: overlay.durationInFrames,
                src: overlay.src,
                startsAtZero: overlay.from === 0
              });
            }
          });

          if (audioOverlays.length > 0) {
          } else {
            console.warn(`[VideosList] ⚠️ No audio overlays found in validOverlays!`, {
              totalOverlays: validOverlays.length,
              overlayTypes: Object.keys(overlaysByType),
              firstOverlay: validOverlays[0]
            });
          }

          // CRITICAL: Verify first scene audio overlay is present
          const firstSceneAudioOverlay = validOverlays.find(overlay =>
            overlay.type === OverlayType.SOUND && (overlay.from || 0) === 0
          );
          if (!firstSceneAudioOverlay) {
            console.error(`[VideosList] ❌ CRITICAL: First scene audio overlay NOT FOUND!`, {
              audioOverlaysCount: audioOverlays.length,
              allOverlays: validOverlays.filter(o => o.type === OverlayType.SOUND).map(o => ({
                id: o.id,
                from: o.from,
                src: o.src
              }))
            });
          }

          // Count text overlays for summary
          const textOverlayCount = validOverlays.filter(o => o.type === OverlayType.TEXT).length;

          // CRITICAL VERIFICATION STEP: Ensure first scene audio overlay ALWAYS starts at frame 0
          // This fixes any edge cases where Scene 1 audio might not be positioned correctly
          let audioOverlaysVerified = validOverlays.filter(o => o.type === OverlayType.SOUND);

          if (audioOverlaysVerified.length > 0) {
            // Sort audio overlays by their 'from' frame to find the earliest one
            audioOverlaysVerified.sort((a, b) => (a.from || 0) - (b.from || 0));
            const earliestAudioOverlay = audioOverlaysVerified[0];

            // If the earliest audio overlay doesn't start at frame 0, we need to fix it
            // This should be Scene 1 audio, which MUST start at frame 0
            if (earliestAudioOverlay.from !== 0) {
              console.warn(`[VideosList] ⚠️ VERIFICATION: Earliest audio overlay starts at frame ${earliestAudioOverlay.from}, not 0. Auto-correcting...`, {
                overlayId: earliestAudioOverlay.id,
                originalFrom: earliestAudioOverlay.from,
                src: earliestAudioOverlay.src
              });

              // Find this overlay in validOverlays and fix it
              const overlayToFix = validOverlays.find(o => o.id === earliestAudioOverlay.id);
              if (overlayToFix) {
                overlayToFix.from = 0;
              }
            }
          }

          // CRITICAL: Group overlays by row and filter out rows that have no valid overlays
          // This ensures empty layers are not shown in the video editor
          const overlaysByRowMap = {};
          validOverlays.forEach(overlay => {
            const row = overlay.row;
            if (row !== undefined && row !== null && !isNaN(row)) {
              if (!overlaysByRowMap[row]) {
                overlaysByRowMap[row] = [];
              }
              overlaysByRowMap[row].push(overlay);
            }
          });

          // Only keep rows that have at least one valid overlay
          const rowsWithContent = Object.keys(overlaysByRowMap)
            .map(Number)
            .filter(row => overlaysByRowMap[row] && overlaysByRowMap[row].length > 0)
            .sort((a, b) => a - b); // Sort rows in ascending order

          // CRITICAL: Compact row numbers to remove gaps
          // This prevents empty tracks from appearing in the timeline
          // Create a mapping from old row numbers to new compacted row numbers
          const rowMapping = {};
          rowsWithContent.forEach((oldRow, index) => {
            rowMapping[oldRow] = index; // Map old row to new sequential row (0, 1, 2, ...)
          });

          // Reassign row numbers to overlays using the compacted mapping
          const finalOverlays = validOverlays
            .filter(overlay => {
              const row = overlay.row;
              const hasValidRow = row !== undefined && row !== null && !isNaN(row) && rowsWithContent.includes(row);
              if (!hasValidRow) {
                console.warn('⚠️ [LAYERS] Filtering out overlay with invalid/empty row:', {
                  id: overlay.id,
                  type: overlay.type,
                  row: overlay.row
                });
              }
              return hasValidRow;
            })
            .map(overlay => {
              // Reassign row to compacted sequential number
              const oldRow = overlay.row;
              const newRow = rowMapping[oldRow];
              if (newRow !== undefined && newRow !== oldRow) {
                return {
                  ...overlay,
                  row: newRow
                };
              }
              return overlay;
            });

          // Sort finalOverlays by start time (timing-based ordering)
          finalOverlays.sort((a, b) => (a.from || 0) - (b.from || 0));

          // Group final overlays by new compacted row for logging
          const finalOverlaysByRow = {};
          finalOverlays.forEach(overlay => {
            const row = overlay.row;
            if (!finalOverlaysByRow[row]) {
              finalOverlaysByRow[row] = [];
            }
            finalOverlaysByRow[row].push(overlay);
          });

          // Only update if overlays actually changed (using ref to avoid unnecessary updates)
          if (!areOverlaysEqual(lastOverlaysRef.current, finalOverlays)) {
            // Store in ref first, then update state with stable reference
            // Create a deep copy to ensure reference stability
            const overlaysToSet = JSON.parse(JSON.stringify(finalOverlays));
            lastOverlaysRef.current = overlaysToSet;

            // CRITICAL FINAL VERIFICATION: Check Scene 1 audio is in the overlays
            const scene1AudioInOverlays = overlaysToSet.find(o => {
              const overlayType = String(o?.type || '').toLowerCase();
              return (overlayType === 'sound' || o.type === OverlayType.SOUND) && (o.from || 0) === 0;
            });

            if (!scene1AudioInOverlays) {
              console.error('[VideosList] ❌❌❌ CRITICAL: Scene 1 audio NOT in overlaysToSet!', {
                totalOverlays: overlaysToSet.length,
                audioOverlays: overlaysToSet.filter(o => {
                  const overlayType = String(o?.type || '').toLowerCase();
                  return overlayType === 'sound' || o.type === OverlayType.SOUND;
                }).length,
                firstAudioOverlay: overlaysToSet.find(o => {
                  const overlayType = String(o?.type || '').toLowerCase();
                  return overlayType === 'sound' || o.type === OverlayType.SOUND;
                })
              });
            }

            setDefaultOverlays(overlaysToSet);
            // Mark initial overlays as loaded (but don't mark as saved here - let handleOverlaysChange do it)
            // This prevents double-marking and ensures handleOverlaysChange is the single source of truth
            if (!initialOverlaysLoadedRef.current) {
              // Don't mark as saved here - handleOverlaysChange will do it when it's called
              // This ensures consistency
            }
          } else {
            // Overlays unchanged, skip update to prevent unnecessary re-renders
          }
        } else {
          const emptyOverlays = [];
          if (!areOverlaysEqual(lastOverlaysRef.current, emptyOverlays)) {
            setDefaultOverlays(emptyOverlays);
            lastOverlaysRef.current = emptyOverlays;
          }
        }
        setTimelineLoading(false);
      }

      // Reset processing flag
      isProcessingRef.current = false;
    };


    buildOverlaysFromUploadSection();

    return () => {
      cancelled = true;
      isProcessingRef.current = false;
    };
  }, [sessionMediaVersion]); // Only depend on sessionMediaVersion, not items
  // Apply chroma key to chart videos without background
  // Apply chroma key to chart videos without background - AGGRESSIVE IMMEDIATE PROCESSING
  useEffect(() => {
    const processedVideos = new WeakSet();

    const applyChromaKeyToCharts = () => {
      // Use multiple selectors to catch videos early
      const selectors = [
        '[id^="chart-"] video',
        '[id*="chart"] video',
        'video[src*="chart"]',
        '.chart-no-background video',
        '[data-overlay-type="VIDEO"] video[src*="chart"]'
      ];

      selectors.forEach(selector => {
        const videos = document.querySelectorAll(selector);

        videos.forEach((video) => {
          if (processedVideos.has(video) || video.dataset.chromaProcessed === 'true') {
            return;
          }

          // IMMEDIATELY hide video before processing
          video.style.opacity = '0';
          video.style.visibility = 'hidden';

          if (video.src && video.src.includes('chart')) {
            processedVideos.add(video);

            // Process synchronously if ready, otherwise wait
            if (video.readyState >= 2) {
              applyChromaKey(video);
            } else {
              // Hide and wait
              video.style.opacity = '0';
              video.addEventListener('loadedmetadata', () => {
                applyChromaKey(video);
              }, { once: true });
            }
          }
        });
      });
    };

    // Process IMMEDIATELY (no delay)
    applyChromaKeyToCharts();

    // Reduced timers to minimize lag - only one delayed check
    const timer1 = setTimeout(applyChromaKeyToCharts, 200);

    // Throttled mutation observer to reduce performance impact
    let mutationTimeout = null;
    const observer = new MutationObserver(() => {
      // Throttle mutations - only process every 200ms to reduce lag
      if (mutationTimeout) {
        clearTimeout(mutationTimeout);
      }
      mutationTimeout = setTimeout(() => {
        applyChromaKeyToCharts();
      }, 200);
    });

    const editorContainer = document.querySelector('.rve-host');
    if (editorContainer) {
      observer.observe(editorContainer, {
        childList: true,
        subtree: true,
        attributes: true, // Watch attribute changes too
        attributeFilter: ['src'] // Specifically watch src changes
      });
    }

    return () => {
      clearTimeout(timer1);
      if (mutationTimeout) {
        clearTimeout(mutationTimeout);
      }
      observer.disconnect();
    };
  }, [applyChromaKey, defaultOverlays]);

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-white rounded-lg relative w-full">
      {(showVideoLoader || isLoading) && (
        <>
          <div className="absolute inset-0 z-30 bg-white" />
          <Loader
            fullScreen
            zIndex="z-40"
            overlayBg="bg-black/40 backdrop-blur-sm"
            title="Generating Videos"
            description={
              status === 'succeeded' || (jobProgress.phase === 'done' && jobProgress.percent >= 100)
                ? 'Refreshing video list...'
                : 'This may take a few moments. Please keep this tab open while we finish.'
            }
            progress={videoLoaderProgress > 0 ? videoLoaderProgress : null}
          >
            {jobProgress.phase && jobProgress.percent > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {jobProgress.phase.toUpperCase()}
              </p>
            )}
          </Loader>
        </>
      )}

      {/* Save Layers Loader Modal */}
      {isSavingLayers && (
        <>
          <div className="absolute inset-0 z-30 bg-white" />
          <Loader
            fullScreen
            zIndex="z-40"
            overlayBg="bg-black/40 backdrop-blur-sm"
            title="Saving Layers"
            description="Please wait while we save your layer changes..."
            progress={savingLayersProgress > 0 ? savingLayersProgress : null}
          />
        </>
      )}

      {/* Upload Base Video Modal */}
      {showUploadBaseVideoModal && (
        <>
          {/* Modal Backdrop */}
          <div
            className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm"
            onClick={() => !isUploadingBaseVideo && setShowUploadBaseVideoModal(false)}
          />

          {/* Modal Content */}
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 relative">
              {/* Close Button */}
              {!isUploadingBaseVideo && (
                <button
                  onClick={() => setShowUploadBaseVideoModal(false)}
                  className="absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-gray-600" />
                </button>
              )}

              {/* Modal Header */}
              <h2 className="text-xl font-semibold text-[#13008B] mb-6">Upload Base Video</h2>

              {/* Error Message */}
              {uploadBaseVideoError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600">{uploadBaseVideoError}</p>
                </div>
              )}

              {/* Scene Dropdown */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select Scene
                </label>
                <select
                  value={selectedSceneForUpload || ''}
                  onChange={(e) => setSelectedSceneForUpload(Number(e.target.value))}
                  disabled={isUploadingBaseVideo}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent disabled:bg-gray-100"
                >
                  <option value="">Choose a scene...</option>
                  {items.map((item, index) => {
                    const sceneNumber = item.sceneNumber || item.scene_number || (index + 1);
                    const sceneTitle = item.title || item.name || `Scene ${sceneNumber}`;
                    return (
                      <option key={item.id || index} value={sceneNumber}>
                        Scene {sceneNumber} - {sceneTitle}
                      </option>
                    );
                  })}
                </select>
              </div>

              {/* File Upload */}
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Upload Video (MP4)
                </label>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 hover:border-[#13008B] transition-colors">
                  <input
                    type="file"
                    accept="video/mp4"
                    onChange={(e) => setUploadBaseVideoFile(e.target.files?.[0] || null)}
                    disabled={isUploadingBaseVideo}
                    className="w-full text-sm text-gray-600 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-medium file:bg-[#13008B] file:text-white hover:file:bg-[#0f0069] file:cursor-pointer disabled:opacity-50"
                  />
                  {uploadBaseVideoFile && (
                    <p className="mt-2 text-xs text-green-600 font-medium">
                      ✓ {uploadBaseVideoFile.name} ({(uploadBaseVideoFile.size / 1024 / 1024).toFixed(2)} MB)
                    </p>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end">
                <button
                  onClick={() => setShowUploadBaseVideoModal(false)}
                  disabled={isUploadingBaseVideo}
                  className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  onClick={handleUploadBaseVideo}
                  disabled={isUploadingBaseVideo || !selectedSceneForUpload || !uploadBaseVideoFile}
                  className={`px-6 py-2 rounded-lg text-white font-medium ${isUploadingBaseVideo || !selectedSceneForUpload || !uploadBaseVideoFile
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-[#13008B] hover:bg-[#0f0069]'
                    }`}
                >
                  {isUploadingBaseVideo ? 'Uploading...' : 'Upload & Save'}
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Upload Base Video Loader - Show during upload process */}
      {isUploadingBaseVideo && (
        <>
          <div className="absolute inset-0 z-30 bg-white" />
          <Loader
            fullScreen
            zIndex="z-60"
            overlayBg="bg-black/40 backdrop-blur-sm"
            title="Uploading Base Video"
            description="Please wait while we upload and update your scene..."
            progress={uploadingBaseVideoProgress > 0 ? uploadingBaseVideoProgress : null}
          />
        </>
      )}

      {/* Render Video Modal */}
      {showRenderModal && (
        <>
          <div className="absolute inset-0 z-30 bg-white" />
          <Loader
            fullScreen
            zIndex="z-40"
            overlayBg="bg-black/40 backdrop-blur-sm"
            title="Rendering Video"
            description={
              renderProgress.phase === 'done' && renderProgress.percent >= 100
                ? 'Redirecting to media page...'
                : 'This may take a few moments. Please keep this tab open while we finish.'
            }
            progress={renderingVideoProgress > 0 ? renderingVideoProgress : null}
          >
            {renderProgress.phase && renderProgress.percent > 0 && (
              <p className="text-xs text-gray-500 mt-2">
                {renderProgress.phase.toUpperCase()}
              </p>
            )}
          </Loader>
        </>
      )}

      {/* Success popup */}
      {showSuccessPopup && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white shadow-2xl rounded-2xl px-8 py-9 text-center space-y-3 max-w-md">
            <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <div className="text-lg font-semibold text-[#13008B]">Final Reel Generation Started!</div>
            <p className="text-sm text-gray-600">Your final reel is being generated. Redirecting to the video section...</p>
          </div>
        </div>
      )}
      {/* Header with Save Layers Button */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          {/* Hamburger Menu for Sidebar Toggle */}
          <button
            onClick={() => setSidebarVisible((v) => !v)}
            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Toggle sidebar"
          >
            <Menu className={`w-6 h-6 ${sidebarVisible ? 'text-[#13008B]' : 'text-gray-600'}`} />
          </button>
          <h3 className="text-lg font-semibold text-[#13008B]">Videos</h3>
        </div>
        <div className="flex items-center gap-4">
          {/* Save Layers Button - only show when there are new layers */}
          {hasUnsavedLayers && (
            <button
              onClick={saveLayers}
              disabled={isSavingLayers}
              className={`px-4 py-2 rounded-lg text-sm font-medium text-white shadow-lg transition-all ${isSavingLayers
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-green-600 hover:bg-green-700'
                }`}
            >
              {isSavingLayers ? 'Saving...' : 'Save Layers'}
            </button>
          )}

          {/* Actions Menu */}
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <MoreVertical className="w-6 h-6 text-gray-600" />
            </button>

            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-lg shadow-xl border border-gray-100 z-50 overflow-hidden">
                <button
                  onClick={() => {
                    setShowUploadBaseVideoModal(true);
                    setIsMenuOpen(false);
                  }}
                  disabled={items.length === 0}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium text-gray-700 disabled:text-gray-400"
                >
                  Upload Base Video
                </button>

                <div className="h-px bg-gray-100 my-0"></div>

                <button
                  onClick={() => {
                    // Trigger render by finding and clicking the render button inside the editor
                    // The render button is typically in the editor header/controls
                    setTimeout(() => {
                      const renderButton = document.querySelector('.rve-host button[class*="Render"]') ||
                        document.querySelector('.rve-host button[aria-label*="render" i]') ||
                        Array.from(document.querySelectorAll('.rve-host button')).find(btn =>
                          btn.textContent?.toLowerCase().includes('render') &&
                          !btn.textContent?.toLowerCase().includes('rendering')
                        );
                      if (renderButton) {
                        renderButton.click();
                      } else {
                        console.warn('Render button not found in editor');
                      }
                    }, 100);
                    setIsMenuOpen(false);
                  }}
                  disabled={items.length === 0 || showRenderModal}
                  className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium text-gray-700 disabled:text-gray-400"
                >
                  {showRenderModal ? 'Rendering...' : 'Render Video'}
                </button>

                {location.pathname.includes('/buildreel') && (
                  <>
                    <div className="h-px bg-gray-100 my-0"></div>
                    <button
                      onClick={() => {
                        if (onViewScene) onViewScene();
                        setIsMenuOpen(false);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium text-gray-700"
                    >
                      View Scene
                    </button>
                  </>
                )}
              </div>
            )}
          </div>

          {/* Debug info in development */}

          {onClose && (
            <button onClick={onClose} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">
              Back
            </button>
          )}
        </div>
      </div>
      <div className="flex-1 flex flex-col overflow-hidden">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 m-4">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        {(mergeJobId || finalMergeUrl || finalReel720Url) && (
          <div className="mx-4 mb-3 p-3 rounded-lg border border-indigo-100 bg-indigo-50">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#13008B]">Final reel export (FFmpeg 720p)</div>
              {finalMergeStatus && (
                <div className="text-xs text-gray-600">
                  {finalMergeStatus.toUpperCase()}
                  {finalMergeProgress?.phase && ` • ${finalMergeProgress.phase.toUpperCase()}`}
                  {finalMergeProgress?.percent > 0 && ` • ${Math.min(100, Math.round(finalMergeProgress.percent))}%`}
                </div>
              )}
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {!finalMergeUrl && (
                <span className="text-xs text-gray-700">
                  Waiting for final reel to finish before exporting to 720p...
                </span>
              )}

              {finalMergeUrl && (
                <>
                  <a
                    href={finalMergeUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 rounded-lg bg-white border text-xs hover:bg-gray-50"
                  >
                    View source reel
                  </a>
                  <button
                    onClick={transcodeFinalReelTo720p}
                    disabled={isTranscodingFinal || isFFmpegLoading}
                    className={`px-3 py-1.5 rounded-lg text-xs text-white ${isTranscodingFinal || isFFmpegLoading ? 'bg-gray-400' : 'bg-[#13008B] hover:bg-[#0f0069]'
                      }`}
                  >
                    {isTranscodingFinal
                      ? 'Transcoding...'
                      : isFFmpegLoading
                        ? 'Loading FFmpeg...'
                        : 'Export 720p (FFmpeg)'}
                  </button>
                  {finalReel720Url && (
                    <a
                      href={finalReel720Url}
                      download="final_reel_720p.mp4"
                      className="px-3 py-1.5 rounded-lg bg-green-600 text-white text-xs hover:bg-green-700"
                    >
                      Download 720p
                    </a>
                  )}
                </>
              )}
            </div>

            {isTranscodingFinal && (
              <div className="text-xs text-gray-600 mt-1">Encoding to 1280x720 via FFmpeg in the browser...</div>
            )}
            {ffmpegError && (
              <div className="text-xs text-red-600 mt-1">
                {ffmpegError}
              </div>
            )}
          </div>
        )}

        {/* React Video Editor - contained within the white panel */}
        <div
          className="flex-1 flex flex-col bg-white rve-host"
        // style={{ paddingLeft: '16rem' }}
        >
          <div className="flex-1 rounded-lg border border-gray-200 shadow-sm relative ">
            <ReactVideoEditor
              key={editorKey}
              projectId={PROJECT_ID}
              defaultOverlays={memoizedDefaultOverlays}
              defaultAspectRatio={aspectRatio}
              fps={APP_CONFIG.fps}
              renderer={selectedRenderer}
              onRenderStart={() => {
                setShowRenderModal(true);
                setRenderProgress({ percent: 0, phase: '' });
              }}
              onRenderProgress={(progress) => {
                setRenderProgress(progress);
              }}
              onRenderComplete={() => {
                setRenderProgress({ percent: 100, phase: 'done' });
              }}
              showDefaultThemes={true}
              showSidebar={sidebarVisible}
              sidebarTopActions={sidebarTopActions}
              sidebarLogo={null}
              sidebarFooterText=""
              onOverlaysChange={handleOverlaysChange}
              onSelectedOverlayChange={handleSelectedOverlayChange}
              deleteOverlay={deleteOverlay}
              isLoadingProject={true}
              className="bg-white text-gray-900"
              adaptors={{
                images: [sessionImagesAdaptor]
              }}
              style={{
                // Apply custom color scheme: white background with #13008B accents
                '--rve-surface': '#ffffff',
                '--rve-panel': '#ffffff',
                '--rve-panel-alt': '#ffffff',
                '--rve-contrast': '#13008B',
                '--rve-contrast-2': '#13008B',
                '--rve-accent': '#13008B',
                '--rve-border': '#E5E2FF',
                '--rve-timeline-bg': '#ffffff',
                '--rve-timeline-scrim': '#ffffff',
                '--sidebar-width': '20rem',  // Standardized panel width - all panels use same width
                '--sidebar-width-icon': '4rem',  // Standardized icon sidebar width
                width: '100%',
                height: '100%',
              }}
            />
          </div>
          {/* Scoped override to keep the editor sidebar inside this white box */}
          <style>{`
            .rve-host [class*="w-(--sidebar-width)"][class*="fixed"] {
              position: absolute !important;
              inset: 0 auto 0 0 !important;
              height: 100% !important;
              top: 0 !important;
              left: 0 !important;
              background: #f8fafc !important;
              display: flex !important;
              flex-direction: row !important;
            }
            /* Keep sidebar in place only when open; allow it to slide away when closed */
            .rve-host [data-state="open"][class*="group-data\\[collapsible=offcanvas\\]:left-\\[calc\\(var\\(--sidebar-width\\)\\*\\-1\\)\\]"] {
              left: 0 !important;
              transform: none !important;
            }
            /* Ensure sidebar uses column direction */
            .rve-host [data-sidebar="sidebar"] {
              display: flex !important;
              flex-direction: row !important;
            }
            /* Hide RVE logo in sidebar header - target all possible logo locations */
            .rve-host img[alt="RVE Logo"],
            .rve-host img[alt*="RVE"],
            .rve-host img[src*="logo-rve"],
            .rve-host img[src="/icons/logo-rve.png"] {
              display: none !important;
              visibility: hidden !important;
            }
            /* Hide the editor header row with Save and Render Video buttons */
            .rve-host header.sticky.top-0,
            .rve-host header[class*="sticky"]:has(button),
            .rve-host > div > div > div > header {
              display: none !important;
              visibility: hidden !important;
              height: 0 !important;
              padding: 0 !important;
              margin: 0 !important;
              overflow: hidden !important;
              border: none !important;
            }
            /* Hide the logo container in the first sidebar header */
            .rve-host [data-sidebar="sidebar"]:first-child [data-sidebar="header"] a[href="#"] {
              display: none !important;
            }
            /* Alternative selector for logo container */
            .rve-host [data-sidebar="sidebar"]:first-child [data-sidebar="header"] > div > div > a[href="#"] {
              display: none !important;
            }
            /* Make buttons below Video section display in a row - target common button containers */
            .rve-host [data-sidebar="sidebar"]:last-child [data-sidebar="content"] > div[class*="flex-col"] > div:last-child,
            .rve-host [data-sidebar="sidebar"]:last-child [data-sidebar="content"] > div[class*="flex"] > div:last-child:not([class*="grid"]):not([class*="columns"]) {
              display: flex !important;
              flex-direction: column !important;
              flex-wrap: wrap !important;
              justify-content: flex-start !important;
              gap: 0.5rem !important;
            }
            /* Ensure buttons are inline */
            .rve-host [data-sidebar="sidebar"]:last-child [data-sidebar="content"] button + button,
            .rve-host [data-sidebar="sidebar"]:last-child [data-sidebar="content"] a[role="button"] + a[role="button"],
            .rve-host [data-sidebar="sidebar"]:last-child [data-sidebar="content"] button + a[role="button"] {
              display: inline-flex !important;
            }
            /* Increase video player height for 9:16 aspect ratio */
            .rve-host[data-aspect-ratio="9:16"] .video-container,
            .rve-host[data-aspect-ratio="9/16"] .video-container,
            .rve-host .rve-video-container[data-aspect-ratio="9:16"],
            .rve-host .rve-video-container[data-aspect-ratio="9/16"] {
              min-height: 95vh !important;
              height: 95vh !important;
              max-height: 95vh !important;
            }
            .rve-host[data-aspect-ratio="9:16"] .video-container > div,
            .rve-host[data-aspect-ratio="9/16"] .video-container > div,
            .rve-host .rve-video-container[data-aspect-ratio="9:16"] > div,
            .rve-host .rve-video-container[data-aspect-ratio="9/16"] > div {
              min-height: 95vh !important;
              height: 95vh !important;
              max-height: 95vh !important;
            }
            /* Alternative selector for nested video container */
            .rve-host[data-aspect-ratio="9:16"] .video-container .z-10,
            .rve-host[data-aspect-ratio="9/16"] .video-container .z-10,
            .rve-host .rve-video-container[data-aspect-ratio="9:16"] .z-10,
            .rve-host .rve-video-container[data-aspect-ratio="9/16"] .z-10 {
              min-height: 95vh !important;
              height: 95vh !important;
              max-height: 95vh !important;
            }
            /* Additional selectors for video player wrapper */
            .rve-host[data-aspect-ratio="9:16"] .video-container .z-10 > div,
            .rve-host[data-aspect-ratio="9/16"] .video-container .z-10 > div {
              min-height: 95vh !important;
              height: 95vh !important;
              max-height: 95vh !important;
            }
            /* Make all dropdowns, popovers, and select menus white */
            .rve-host [role="menu"],
            .rve-host [role="listbox"],
            .rve-host [data-radix-popper-content-wrapper],
            .rve-host [data-radix-select-content],
            .rve-host [data-radix-popover-content],
            .rve-host [data-radix-dropdown-menu-content],
            .rve-host [data-radix-menu-content],
            .rve-host [class*="PopoverContent"],
            .rve-host [class*="DropdownMenuContent"],
            .rve-host [class*="SelectContent"],
            .rve-host [class*="popover-content"],
            .rve-host [class*="dropdown-content"],
            .rve-host [class*="select-content"],
            .rve-host [class*="menu-content"],
            .rve-host [class*="bg-popover"],
            .rve-host div[data-radix-menu-content],
            .rve-host div.bg-popover,
            .rve-host [class*="bg-popover"][data-radix-menu-content],
            .rve-host div[class*="bg-popover"][data-radix-menu-content] {
              background: white !important;
              background-color: white !important;
              background-image: none !important;
              color: #1f2937 !important;
              border: 1px solid #e5e7eb !important;
            }
            /* Style dropdown menu items */
            .rve-host [role="menuitem"],
            .rve-host [role="option"],
            .rve-host [class*="MenuItem"],
            .rve-host [class*="SelectItem"] {
              background: white !important;
              color: #1f2937 !important;
            }
            .rve-host [role="menuitem"]:hover,
            .rve-host [role="option"]:hover,
            .rve-host [class*="MenuItem"]:hover,
            .rve-host [class*="SelectItem"]:hover {
              background: #f3f4f6 !important;
            }
            /* Override CSS variables for popover background */
            .rve-host,
            .rve-host * {
              --popover: white !important;
              --popover-foreground: #1f2937 !important;
            }
            /* Force white background on elements with bg-popover class */
            .rve-host .bg-popover,
            .rve-host [class*="bg-popover"] {
              background: white !important;
              background-color: white !important;
              background-image: none !important;
            }
            /* Ensure all nested elements in dropdowns are white */
            .rve-host [data-radix-menu-content] *,
            .rve-host [data-radix-dropdown-menu-content] *,
            .rve-host [data-radix-popover-content] * {
              background-color: transparent !important;
            }
            .rve-host [data-radix-menu-content],
            .rve-host [data-radix-dropdown-menu-content],
            .rve-host [data-radix-popover-content] {
              background: white !important;
              background-color: white !important;
            }
            /* Target Radix popper content wrapper specifically */
            .rve-host [data-radix-popper-content-wrapper],
            .rve-host [data-radix-popper-content-wrapper] > * {
              background: #fff !important;
              background-color: #fff !important;
            }
            /* Specifically target aspect ratio dropdown */
            .rve-host [data-radix-popper-content-wrapper] [role="menu"],
            .rve-host [data-radix-popper-content-wrapper] [data-radix-dropdown-menu-content],
            .rve-host [data-radix-popper-content-wrapper] [data-radix-menu-content],
            .rve-host [data-radix-popper-content-wrapper] div[class*="DropdownMenuContent"],
            .rve-host [data-radix-popper-content-wrapper] div[class*="bg-popover"] {
              background: #fff !important;
              background-color: #fff !important;
            }
            /* Target dropdown menu items in aspect ratio dropdown */
            .rve-host [data-radix-popper-content-wrapper] [role="menuitem"],
            .rve-host [data-radix-popper-content-wrapper] [role="menuitemradio"] {
              background: #fff !important;
              background-color: #fff !important;
            }
            .rve-host [data-radix-popper-content-wrapper] [role="menuitem"]:hover,
            .rve-host [data-radix-popper-content-wrapper] [role="menuitemradio"]:hover {
              background: #f3f4f6 !important;
              background-color: #f3f4f6 !important;
            }
            /* Style zoom controls slider/progress bar with custom colors */
            .rve-host [role="slider"],
            .rve-host [data-radix-slider-track],
            .rve-host [data-radix-slider-range],
            .rve-host [class*="SliderTrack"],
            .rve-host [class*="SliderRange"] {
              background: #E5E2FF !important;
            }
            .rve-host [data-radix-slider-range],
            .rve-host [class*="SliderRange"] {
              background: #13008B !important;
              background-color: #13008B !important;
            }
            .rve-host [data-radix-slider-thumb],
            .rve-host [class*="SliderThumb"] {
              background: #13008B !important;
              background-color: #13008B !important;
              border-color: #13008B !important;
            }
            /* Target the slider track and range using class names */
            .rve-host .bg-secondary {
              background: #E5E2FF !important;
            }
            .rve-host .bg-primary {
              background: #13008B !important;
              background-color: #13008B !important;
            }
            /* Apply custom color scheme throughout the editor */
            .rve-host {
              --primary: #13008B !important;
              --primary-foreground: #ffffff !important;
              --accent: #E5E2FF !important;
              --accent-foreground: #13008B !important;
              --secondary: #E5E2FF !important;
              --secondary-foreground: #13008B !important;
              --border: #E5E2FF !important;
              --ring: #13008B !important;
            }
            /* Style all primary buttons */
            .rve-host button[class*="bg-primary"],
            .rve-host button.bg-primary,
            .rve-host [class*="Button"][class*="bg-primary"],
            .rve-host button[class*="variant"][class*="default"] {
              background: #13008B !important;
              background-color: #13008B !important;
              color: #ffffff !important;
              border-color: #13008B !important;
            }
            .rve-host button[class*="bg-primary"]:hover,
            .rve-host button.bg-primary:hover,
            .rve-host [class*="Button"][class*="bg-primary"]:hover,
            .rve-host button[class*="variant"][class*="default"]:hover {
              background: #0f0069 !important;
              background-color: #0f0069 !important;
            }
            /* Style outline buttons */
            .rve-host button[class*="variant"][class*="outline"],
            .rve-host button[class*="border"] {
              border-color: #13008B !important;
              color: #13008B !important;
            }
            .rve-host button[class*="variant"][class*="outline"]:hover,
            .rve-host button[class*="border"]:hover {
              background: #E5E2FF !important;
              background-color: #E5E2FF !important;
            }
            /* Style ghost buttons on hover */
            .rve-host button[class*="variant"][class*="ghost"]:hover {
              background: #E5E2FF !important;
              background-color: #E5E2FF !important;
              color: #13008B !important;
            }
            /* Style secondary buttons */
            .rve-host button[class*="bg-secondary"],
            .rve-host button.bg-secondary {
              background: #E5E2FF !important;
              background-color: #E5E2FF !important;
              color: #13008B !important;
            }
            /* Style panels and surfaces - white background */
            .rve-host [class*="bg-background"],
            .rve-host [class*="bg-panel"],
            .rve-host [class*="surface"],
            .rve-host [class*="bg-card"] {
              background: white !important;
              background-color: white !important;
            }
            /* Style Volume, Fade In, Fade Out sections with white background and border */
            .rve-host [class*="space-y-4"][class*="rounded-md"][class*="bg-card"],
            .rve-host div[class*="space-y-4"][class*="rounded-md"][class*="bg-card"][class*="p-4"],
            .rve-host div[class*="space-y-4"][class*="rounded-md"][class*="bg-card"][class*="border"] {
              background: white !important;
              background-color: white !important;
              border: 1px solid #E5E2FF !important;
              border-radius: 8px !important;
            }
            /* Style main content area panels (Audio, Caption, etc.) - white background */
            .rve-host [class*="flex"][class*="flex-col"][class*="p-2"][class*="bg-background"],
            .rve-host [class*="SoundsOverlayPanel"],
            .rve-host [class*="CaptionPanel"],
            .rve-host [class*="TextPanel"],
            .rve-host [class*="ImagePanel"],
            .rve-host [class*="VideoPanel"],
            .rve-host [class*="captions-overlay-panel"],
            .rve-host [class*="text-overlay-panel"],
            .rve-host [class*="image-overlay-panel"],
            .rve-host [class*="video-overlay-panel"],
            .rve-host [class*="sounds-overlay-panel"],
            .rve-host [class*="local-media-panel"],
            .rve-host [class*="template-panel"] {
              background: white !important;
              background-color: white !important;
            }
            /* Style all panel content sections */
            .rve-host [class*="space-y-4"],
            .rve-host [class*="space-y-6"],
            .rve-host [class*="space-y-2"] {
              background: transparent !important;
            }
            /* Ensure control sections (Volume, Fade In, Fade Out, etc.) have white background with border */
            .rve-host div[class*="rounded-md"][class*="bg-card"][class*="p-4"][class*="border"],
            .rve-host div[class*="rounded-md"][class*="bg-card"][class*="p-4"],
            .rve-host div[class*="rounded-lg"][class*="bg-card"][class*="border"],
            .rve-host div[class*="rounded-lg"][class*="bg-card"] {
              background: white !important;
              background-color: white !important;
              border: 1px solid #E5E2FF !important;
            }
            /* Style borders */
            .rve-host [class*="border"],
            .rve-host [class*="border-"] {
              border-color: #E5E2FF !important;
            }
            /* Style text colors for primary elements */
            .rve-host [class*="text-primary"],
            .rve-host [class*="text-foreground"] {
              color: #13008B !important;
            }
            /* Style links */
            .rve-host a[class*="text-primary"],
            .rve-host a[class*="link"] {
              color: #13008B !important;
            }
            .rve-host a[class*="text-primary"]:hover,
            .rve-host a[class*="link"]:hover {
              color: #0f0069 !important;
            }
            /* Style focus rings */
            .rve-host [class*="ring"],
            .rve-host [class*="focus-visible:ring"] {
              --ring-color: #13008B !important;
            }
            /* Style header background - white */
            .rve-host header,
            .rve-host [class*="header"] {
              background: white !important;
              background-color: white !important;
            }
            /* Style sidebar background - keep light purple for contrast */
            .rve-host [data-sidebar="sidebar"] {
              background: #E5E2FF !important;
              background-color: #E5E2FF !important;
            }
            /* Style sidebar header (logo area) - white background */
            .rve-host [data-sidebar="header"],
            .rve-host [data-sidebar="sidebar"] [data-sidebar="header"],
            .rve-host [data-sidebar="sidebar"]:first-child [data-sidebar="header"] {
              background: white !important;
              background-color: white !important;
            }
            /* Style sidebar footer (settings button) - white background */
            .rve-host [data-sidebar="footer"],
            .rve-host [data-sidebar="sidebar"] [data-sidebar="footer"],
            .rve-host [data-sidebar="sidebar"]:first-child [data-sidebar="footer"] {
              background: white !important;
              background-color: white !important;
            }
            /* Make timeline playhead appear behind sidebar - lower z-index */
            .rve-host [data-timeline-marker="playhead"],
            .rve-host [class*="timeline-marker"],
            .rve-host [class*="TimelineMarker"] {
              z-index: 10 !important;
            }
            /* Ensure sidebar has higher z-index than timeline - must be in front */
            .rve-host [data-sidebar="sidebar"],
            .rve-host [data-sidebar="sidebar"]:first-child,
            .rve-host [data-sidebar="sidebar"]:last-child {
              z-index: 100 !important;
              position: relative !important;
            }
            /* Style ALL sidebar buttons - white background, dark blue text */
            .rve-host [data-sidebar="sidebar"] button,
            .rve-host [data-sidebar="sidebar"] [role="button"],
            .rve-host [data-sidebar="sidebar"] [class*="SidebarMenuButton"],
            .rve-host [data-sidebar="sidebar"] [class*="menu-button"],
            .rve-host [data-sidebar="sidebar"] [class*="Button"],
            .rve-host [data-sidebar="sidebar"] a[role="button"] {
              background-color: #fff !important;
              background: #fff !important;
              color: #13008B !important;
            }
            /* Hover state for ALL sidebar buttons - light purple background */
            .rve-host [data-sidebar="sidebar"] button:hover,
            .rve-host [data-sidebar="sidebar"] [role="button"]:hover,
            .rve-host [data-sidebar="sidebar"] [class*="SidebarMenuButton"]:hover,
            .rve-host [data-sidebar="sidebar"] [class*="menu-button"]:hover,
            .rve-host [data-sidebar="sidebar"] [class*="Button"]:hover,
            .rve-host [data-sidebar="sidebar"] a[role="button"]:hover {
              background-color: #E5E2FF !important;
              background: #E5E2FF !important;
              color: #13008B !important;
            }
            /* Sidebar text and icons - always dark blue */
            .rve-host [data-sidebar="sidebar"] span,
            .rve-host [data-sidebar="sidebar"] [class*="text-"],
            .rve-host [data-sidebar="sidebar"] svg,
            .rve-host [data-sidebar="sidebar"] [class*="icon"],
            .rve-host [data-sidebar="sidebar"] button span,
            .rve-host [data-sidebar="sidebar"] button svg {
              color: #13008B !important;
            }
            /* Style main content area - white background */
            .rve-host [data-sidebar="content"],
            .rve-host [class*="sidebar-content"],
            .rve-host [class*="panel-content"] {
              background: white !important;
              background-color: white !important;
            }
            /* Style active/selected states */
            .rve-host [class*="active"],
            .rve-host [class*="selected"],
            .rve-host [aria-selected="true"] {
              background: #13008B !important;
              background-color: #13008B !important;
              color: #ffffff !important;
            }
            /* Style hover states for interactive elements */
            .rve-host [class*="hover:bg-accent"]:hover,
            .rve-host [class*="hover:bg-secondary"]:hover {
              background: #E5E2FF !important;
              background-color: #E5E2FF !important;
            }
            /* Style render button specifically */
            .rve-host button[class*="bg-gray-800"],
            .rve-host button[class*="bg-gray-700"] {
              background: #13008B !important;
              background-color: #13008B !important;
              color: #ffffff !important;
              border-color: #13008B !important;
            }
            .rve-host button[class*="bg-gray-800"]:hover:not(:disabled),
            .rve-host button[class*="bg-gray-700"]:hover:not(:disabled) {
              background: #0f0069 !important;
              background-color: #0f0069 !important;
            }
            /* Style save button */
            .rve-host button[class*="Save"],
            .rve-host [class*="SaveControls"] button {
              color: #13008B !important;
            }
            .rve-host button[class*="Save"]:hover,
            .rve-host [class*="SaveControls"] button:hover {
              background: #E5E2FF !important;
              background-color: #E5E2FF !important;
            }
            /* Style theme dropdown button */
            .rve-host [class*="ThemeDropdown"] button,
            .rve-host [class*="theme-dropdown"] button {
              color: #13008B !important;
              border-color: #E5E2FF !important;
            }
            .rve-host [class*="ThemeDropdown"] button:hover,
            .rve-host [class*="theme-dropdown"] button:hover {
              background: #E5E2FF !important;
              background-color: #E5E2FF !important;
            }
            /* Ensure timeline stays behind sidebar */
            .rve-host .timeline-container,
            .rve-host [class*="timeline-container"],
            .rve-host [class*="timeline-content"],
            .rve-host [class*="timeline-tracks-wrapper"],
            .rve-host [class*="timeline-header"] {
              z-index: 1 !important;
              position: relative !important;
            }
            /* Remove all bottom spacing from timeline section */
            .rve-host [class*="timeline-section"],
            .rve-host [class*="TimelineSection"],
            .rve-host [class*="timeline-zoomable-content"],
            .rve-host [class*="timeline-tracks-scroll-container"] {
              margin-bottom: 0 !important;
              padding-bottom: 0 !important;
            }
            /* Style tabs at bottom (stickers panel) */
            .rve-host [class*="TabsList"] {
              background: white !important;
              background-color: white !important;
            }
            .rve-host [class*="TabsTrigger"] {
              background: transparent !important;
              background-color: transparent !important;
              color: #13008B !important;
              border: none !important;
              border-bottom: 2px solid transparent !important;
            }
            .rve-host [class*="TabsTrigger"][data-state="active"],
            .rve-host [class*="TabsTrigger"][aria-selected="true"] {
              color: #13008B !important;
              border-bottom-color: #13008B !important;
              background: transparent !important;
            }
            .rve-host [class*="TabsTrigger"]:hover {
              background: transparent !important;
              color: #13008B !important;
            }
            .rve-host [class*="TabsContent"] {
              background: white !important;
              background-color: white !important;
            }
            /* Ensure stickers panel has proper scrolling */
            .rve-host [class*="StickersPanel"],
            .rve-host [class*="stickers-panel"] {
              overflow-y: auto !important;
              overflow-x: hidden !important;
            }
            /* Style sticker preview cards */
            .rve-host [class*="sticker-preview"],
            .rve-host button[class*="sticker"] {
              background: white !important;
              background-color: white !important;
              border-color: #E5E2FF !important;
            }
            .rve-host button[class*="sticker"]:hover {
              border-color: #13008B !important;
              background-color: #E5E2FF !important;
            }
            video[src*="chart"],
[id^="chart-"] video,
[id*="chart"] video,
.chart-no-background video {
opacity: 0 !important;
visibility: hidden !important;
transition: none !important; /* No fade-in transition */
}

/* Only show canvas replacements */
canvas[data-chroma-processed="true"] {
opacity: 1 !important;
visibility: visible !important;
}
/* Chart video background removal - WORKING SOLUTION */
.rve-host [id^="chart-"] video,
.rve-host [id*="chart"] video,
.rve-host .chart-no-background video {
/* Remove white background using chromakey-like effect */
background: transparent !important;

/* Method 1: Color matrix filter to remove white */
filter: 
  brightness(1.1)
  contrast(1.2)
  saturate(1.1)
  drop-shadow(0 0 0 transparent) !important;

/* Method 2: Backdrop filter + blend */
backdrop-filter: brightness(0) !important;
mix-blend-mode: darken !important;

/* Isolation to force new stacking context */
isolation: isolate !important;
}

/* Parent container must allow transparency */
.rve-host [id^="chart-"],
.rve-host [id*="chart"],
.rve-host .chart-no-background {
background: transparent !important;
isolation: isolate !important;
}
          `}</style>
        </div>

        {/* {selectedVideoUrl && (
          <div className="bg-white border rounded-xl p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2">
                <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
                  {videoLoading ? (
                    <div className="w-full h-full flex items-center justify-center text-white">
                      <div className="text-center">
                        <div className="w-16 h-16 mx-auto mb-4">
                          <img
                            src={LoadingAnimationGif}
                            alt="Loading..."
                            className="w-full h-full object-contain"
                          />
                        </div>
                        <div>Loading video...</div>
                      </div>
                    </div>
                  ) : videoBlobUrl ? (
                    <video
                      src={videoBlobUrl}
                      controls
                      className="w-full h-full object-contain bg-black"
                      playsInline
                      preload="metadata"
                      onError={(e) => {}}
                    />
                  ) : (
                    <div className="text-white">No video available</div>
                  )}
                </div>
                <div className="mt-3">
                  <label className="text-sm text-gray-600">Narration</label>
                  <div className="mt-1 flex items-start gap-2">
                    <textarea className="flex-1 min-h-[140px] border rounded-lg px-3 py-2 text-sm" placeholder="Narration" readOnly value={selectedVideo?.narration || ''} />
                    <button className="px-4 h-10 rounded-lg bg-[#13008B] text-white text-sm self-start">Edit</button>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600 flex items-center gap-2">
                    Description
                    <span className="text-xs text-gray-500">
                      {selectedVideo?.desc ? '(has description)' : '(no description)'}
                    </span>
                  </label>
                  <textarea className="w-full h-32 border rounded-lg px-3 py-2 text-sm" readOnly value={selectedVideo?.description || ''} />
                </div>
              </div>
            </div>
          </div>
        )} */}


      </div>
    </div>
  );
};

export default VideosList;
