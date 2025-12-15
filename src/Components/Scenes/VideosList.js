import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import { ReactVideoEditor } from '../video-editor-js/pro/components/react-video-editor';
import { HttpRenderer } from '../video-editor-js/pro/utils/http-renderer';
import { OverlayType } from '../video-editor-js/pro/types';
import '../video-editor-js/pro/styles.css';
import '../video-editor-js/pro/styles.utilities.css';
import '../video-editor-js/pro/styles/base-themes/dark.css';
import '../video-editor-js/pro/styles/base-themes/light.css';
import '../video-editor-js/pro/styles/base-themes/rve.css';
import { Zap, ChevronRight, X, Menu } from 'lucide-react';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { fetchFile, toBlobURL } from '@ffmpeg/util';
import LogoImage from '../../asset/mainLogo.png';
import LoadingAnimationVideo from '../../asset/Loading animation.mp4';

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

const VideosList = ({ jobId, onClose, onGenerateFinalReel }) => {
  const [items, setItems] = useState([]); // array of { url, description, narration, scenes: [] }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('queued');
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showVideoLoader, setShowVideoLoader] = useState(false);
  const [jobProgress, setJobProgress] = useState({ percent: 0, phase: '' });
  // Transitions state: key is video index (transition between video[index] and video[index+1])
  const [transitions, setTransitions] = useState({}); // { 0: "fade", 1: "slideleft", ... }
  const [transitionDuration, setTransitionDuration] = useState(0.5);
  // Logo and Subtitle toggle states (default both on)
  const [logoEnabled, setLogoEnabled] = useState(true);
  const [subtitleEnabled, setSubtitleEnabled] = useState(true);
  const [sidebarVisible, setSidebarVisible] = useState(true);
  // Aspect ratio from session/script data
  const [aspectRatio, setAspectRatio] = useState('16:9');
  
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

    const load = async () => {
      try {
        setIsLoading(true); setError('');
        const session_id = localStorage.getItem('session_id');
        const user_id = localStorage.getItem('token');
        if (!session_id || !user_id) { setError('Missing session or user'); setIsLoading(false); return; }
        // First read from session
        const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id, session_id })
        });
        const text = await resp.text();
        let data; try { data = JSON.parse(text); } catch (_) { data = text; }
        if (!resp.ok) throw new Error(`user-session/data failed: ${resp.status} ${text}`);
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
          setSelectedIndex(0);
          
          // Expose session media to sidebar uploads - with RAW URLs (no prefix)
          if (typeof window !== 'undefined') {
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
                      volume: audioLayer.volume !== undefined ? audioLayer.volume : 1,
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
                chartVideoUrl: rawChartVideoUrl, // Store raw chart video URL from layers or fallback - NEVER add prefix
                chart_video_url: rawChartVideoUrl, // Alias for compatibility
                chartLayerData: chartLayerDataForSession, // Include full layer data for reference
                subtitleLayerData: subtitleLayerDataForSession, // Include full subtitle layer data
                subtitleUrl: subtitleLayerDataForSession?.url || null, // SRT file URL
                subtitleText: subtitleLayerDataForSession?.text || '', // Inline text
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

        // If we have a jobId, always poll job API until status is "succeeded" or "failed"
        const id = jobId || localStorage.getItem('current_video_job_id');
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

            // Check if status is "succeeded" or "failed" - only then stop polling
            // Also check if progress is complete
            const isCompleted = finalStatus === 'succeeded' || 
                              finalStatus === 'failed' || 
                              finalStatus === 'error' ||
                              finalStatus === 'completed' ||
                              isProgressComplete;
            
            if (!cancelled && !isCompleted) {
              // Continue polling if not succeeded or failed - keep loader visible
              
              setIsLoading(true);
              setShowVideoLoader(true);
              timeoutId = setTimeout(poll, 3000);
            } else {
              // Job is complete (succeeded or failed) - reload session data to get the new videos
              if (!cancelled) {
                
                if (finalStatus === 'failed' || finalStatus === 'error') {
                  // If failed, hide loader and show error
                  console.error('❌ Video job failed');
                  setIsLoading(false);
                  setShowVideoLoader(false);
                  setError('Video generation failed. Please try again.');
                  return;
                }
                
                
                // Keep loader visible during refresh
                setIsLoading(true);
                setShowVideoLoader(true);
                setJobProgress({ percent: 100, phase: 'loading' });
                try {
                  const session_id = localStorage.getItem('session_id');
                  const user_id = localStorage.getItem('token');
                  if (session_id && user_id) {
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
                      if (!cancelled && refreshedVideos.length > 0) {
                        
                        setItems(refreshedVideos);
                        setStatus('succeeded');
                        setSelectedIndex(0);
                        // Hide loader after successful load
                        setIsLoading(false);
                        setShowVideoLoader(false);
                      } else if (!cancelled) {
                        
                        // If no videos yet, continue polling for a bit more
                        timeoutId = setTimeout(poll, 3000);
                        return;
                      }
                    } else {
                      console.warn('⚠️ Failed to refresh session data:', refreshText);
                      // Continue polling if refresh failed
                      timeoutId = setTimeout(poll, 3000);
                      return;
                    }
                  } else {
                    // Missing session/user, hide loader
                    setIsLoading(false);
                    setShowVideoLoader(false);
                  }
                } catch (refreshError) {
                  console.error('❌ Error refreshing session data:', refreshError);
                  // Continue polling if refresh failed
                  timeoutId = setTimeout(poll, 3000);
                  return;
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

    load();
    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); };
  }, [jobId, logoEnabled, subtitleEnabled]);

  useEffect(() => {
    if (selectedIndex >= items.length && items.length > 0) {
      setSelectedIndex(0);
    }
  }, [items.length, selectedIndex]);

  // Selected video helpers (declare before usage)
  const selectedVideo = items[selectedIndex] || {};
  const selectedScenes = Array.isArray(selectedVideo.scenes) ? selectedVideo.scenes : [];
  const selectedVideoUrl = selectedVideo.url || selectedScenes[0]?.url || '';

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
        console.error('Video load error:', error);
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
      ffmpeg.on('log', () => {});

      // Prefer CDN blobs to avoid CORS with local hosting
      const coreURL = await toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.js', 'text/javascript');
      const wasmURL = await toBlobURL('https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.6/dist/esm/ffmpeg-core.wasm', 'application/wasm');

      await ffmpeg.load({ coreURL, wasmURL });
      ffmpegRef.current = ffmpeg;
      return ffmpeg;
    } catch (error) {
      console.error('❌ Failed to load FFmpeg:', error);
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
          console.error('❌ Error polling merge job:', error);
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
      console.error('❌ FFmpeg 720p export failed:', error);
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
          console.warn('⚠️ Video duration is invalid, using default');
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
        console.error('Error loading video:', error);
        reject(error);
      };
      
      videoElement.load();
    });
  }, []);

  // Helper function to convert audio URL to clip by loading metadata
  const convertAudioUrlToClip = useCallback(async (audioUrl, itemId, itemTitle) => {
    return new Promise((resolve, reject) => {
      const audioElement = document.createElement('audio');
      audioElement.crossOrigin = 'anonymous'; // Must be set BEFORE src
      audioElement.preload = 'metadata';
      audioElement.src = audioUrl;
      
      audioElement.onloadedmetadata = () => {
        const duration = audioElement.duration;
        if (!isFinite(duration) || duration <= 0) {
          console.warn('⚠️ Audio duration is invalid, using default');
          resolve(null);
          return;
        }
        
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
      };
      
      audioElement.onerror = (error) => {
        console.error('Error loading audio:', error);
        reject(error);
      };
      
      audioElement.load();
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
                    console.error(`Failed to convert chart_video_url for ${item.id}:`, error);
                  }
                }
                
                // Update accumulated time for next clip (after adding current clip)
                const trimmedDuration = (clip.trimEnd - clip.trimStart) / (clip.speed || 1.0);
                primaryClipAccumulatedTime += trimmedDuration;
              }
            } catch (error) {
              console.error(`Failed to convert video ${item.id}:`, error);
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
        console.error('Error converting videos/audio to clips:', error);
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
        localStorage.setItem('current_merge_job_id', jobId);
        setMergeJobId(jobId);
      }

      // Show success popup
      setShowSuccessPopup(true);
      setIsGenerating(false);

    } catch (e) {
      console.error('❌ Error generating final reel:', e);
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
    
    // Filter for videos only
    const videoFiles = sessionMediaFiles.filter((f) => f.type === "video" && (f.path || f.url || f.src));
    
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
          };
        }
      }
      return null;
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

    // Helper function to parse SRT file and convert to caption format
    const parseSRTToCaption = async (srtUrl, fps = 30) => {
      try {
        // Fetch SRT file content
        const response = await fetch(srtUrl);
        if (!response.ok) {
          return null;
        }
        
        const srtContent = await response.text();
        
        // Parse SRT content into caption entries
        const captions = [];
        const blocks = srtContent.trim().split('\n\n');
        
        blocks.forEach((block, index) => {
          const lines = block.split('\n');
          if (lines.length < 3) return;
          
          // Parse timing line (format: 00:00:00,000 --> 00:00:05,000)
          const timingLine = lines[1];
          const timingMatch = timingLine.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/);
          
          if (!timingMatch) {
            return;
          }
          
          const [_, startH, startM, startS, startMs, endH, endM, endS, endMs] = timingMatch;
          
          // Convert to milliseconds
          const startTimeMs = (parseInt(startH) * 3600 + parseInt(startM) * 60 + parseInt(startS)) * 1000 + parseInt(startMs);
          const endTimeMs = (parseInt(endH) * 3600 + parseInt(endM) * 60 + parseInt(endS)) * 1000 + parseInt(endMs);
          
          // Get text content (lines 2 onwards)
          const text = lines.slice(2).join(' ').trim();
          
          // Create caption entry
          captions.push({
            startMs: startTimeMs,
            endMs: endTimeMs,
            words: [{ 
              word: text, 
              startMs: startTimeMs, 
              endMs: endTimeMs 
            }]
          });
        });
        
        return captions;
        
      } catch (error) {
        console.error(`❌ Error parsing SRT file:`, error);
        return null;
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

    // Get text overlay layer data from layers array (supports multiple text overlays)
    const getTextOverlayLayerData = (entry = {}) => {
      if (Array.isArray(entry?.videos?.v1?.layers)) {
        // Filter all text_overlay layers (there might be multiple)
        const textLayers = entry.videos.v1.layers.filter(layer => layer?.name === 'text_overlay');
        
        if (textLayers.length > 0) {
          return textLayers.map((textLayer, index) => {
            return {
              text: textLayer.text || '',
              url: textLayer.url || null, // URL for text overlay video/text source
              timing: textLayer.timing || { start: "00:00:00", end: null },
              position: textLayer.position || { x: 0.5, y: 0.5 }, // Default center
              bounding_box: textLayer.bounding_box || null,
              size: textLayer.size || null,
              style: {
                fontSize: textLayer.fontSize || textLayer.style?.fontSize || 28,
                fontFamily: textLayer.fontFamily || textLayer.style?.fontFamily || 'Inter',
                fontWeight: textLayer.fontWeight || textLayer.style?.fontWeight || 'bold',
                color: textLayer.fill || textLayer.style?.color || textLayer.style?.fill || '#000000',
                textAlign: textLayer.textAlign || textLayer.style?.textAlign || 'center',
                lineHeight: textLayer.lineHeight || textLayer.style?.lineHeight || 1.2,
                letterSpacing: textLayer.letterSpacing || textLayer.style?.letterSpacing || 1,
                opacity: textLayer.textOpacity !== undefined ? textLayer.textOpacity : 
                        (textLayer.opacity !== undefined ? textLayer.opacity : 1),
                textShadow: textLayer.style?.textShadow || textLayer.effects?.textShadow || null,
                backgroundColor: textLayer.style?.backgroundColor || 'transparent',
                padding: textLayer.style?.padding || '0px',
                borderRadius: textLayer.style?.borderRadius || '0px',
              },
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

      for (let i = 0; i < videoFiles.length; i++) {
        if (cancelled) break;
        
        const file = videoFiles[i];
        try {
          // UPDATED LAYER ORGANIZATION (dynamic based on number of text overlays):
          // Rows 1 to N: Text Overlays (TEXT) - zIndex 350 (N = number of text overlays)
          // Row N+1: Logo (IMAGE) - zIndex 400
          // Row N+2: Chart Video (VIDEO) - zIndex 200 (if present)
          // Row N+3: Base Video (VIDEO) - zIndex 100 (MAIN CONTENT)
          // Row N+4: Subtitles (CAPTION) - zIndex 350 (SAME as text overlays)
          // Row N+5: Audio (SOUND) - no visual component
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
          if (!rawPath) {
            console.warn(`[VideosList] Skipping video ${i + 1}: No base_video_url or path found`);
            continue;
          }
          
          // Check if rawPath is already double-prefixed
          if (rawPath.includes('/api/latest/local-media/serve/http') || rawPath.includes('/api/latest/local-media/serve/https')) {
            console.warn('[VideosList] WARNING: Double-prefixed URL detected!', rawPath);
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
                console.warn(`[VideosList] Video ${i + 1} metadata timeout, using file duration:`, durationSeconds);
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
                console.warn(`[VideosList] Video ${i + 1} load error, using file duration:`, durationSeconds);
                resolve();
              };
              video.src = mediaSrc;
            });
          } catch (error) {
            console.warn(`[VideosList] Error loading video ${i + 1} metadata:`, error);
          }
          
          const durationInFrames = Math.max(1, Math.round(durationSeconds * fps));
          const currentAspectRatio = aspectRatio || '16:9';
          const canvasWidth = currentAspectRatio === '9:16' || currentAspectRatio === '9/16' ? 1080 : 1920;
          const canvasHeight = currentAspectRatio === '9:16' || currentAspectRatio === '9/16' ? 1920 : 1080;
          
          // STEP 1: Process text overlay(s) FIRST with dynamic row assignment
          // Each text overlay gets its own row: Row 1, Row 2, Row 3, etc.
          // This ensures multiple text overlays from the same scene don't overlap
          const textOverlayLayers = getTextOverlayLayerData(file);
          let currentTextRow = 1; // Start at row 1 for first text overlay
          let lastTextRow = 0; // Track last row used by text overlays
          
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
              
              // Calculate text position
              let textLeft = 0;
              let textTop = 0;
              let textWidth = 400; // Default text box width
              let textHeight = 100; // Default text box height
              
              if (textLayerData.bounding_box) {
                // Use bounding_box for absolute positioning
                textLeft = Math.round((textLayerData.bounding_box.x || 0) * canvasWidth);
                textTop = Math.round((textLayerData.bounding_box.y || 0) * canvasHeight);
                textWidth = Math.round((textLayerData.bounding_box.width || 0.3) * canvasWidth);
                textHeight = Math.round((textLayerData.bounding_box.height || 0.1) * canvasHeight);
              } else if (textLayerData.position) {
                // Use position (center by default)
                textLeft = Math.round((textLayerData.position.x || 0.5) * canvasWidth) - (textWidth / 2);
                textTop = Math.round((textLayerData.position.y || 0.5) * canvasHeight) - (textHeight / 2);
              }
              
              // Ensure text is within canvas bounds
              textLeft = Math.max(0, Math.min(textLeft, canvasWidth - textWidth));
              textTop = Math.max(0, Math.min(textTop, canvasHeight - textHeight));
              
              // Map animation type ONCE - create stable animation config
              let animationType = 'none';
              if (textLayerData.animation?.type === 'fade_in_out' || textLayerData.animation?.type === 'fade') {
                animationType = 'fade';
              }
              
              // Create stable animation object - CRITICAL: Create once, reuse reference
              const animationConfig = {
                enter: animationType,
                exit: animationType,
                duration: textLayerData.animation?.duration || 0.5,
              };
              
              // Create stable styles object - CRITICAL: Create once, reuse reference
              // NOTE: TextStylePanel expects fontSizeScale (number 0.3-3) not fontSize (px)
              // The panel uses fontSizeScale to control font size via slider
              const fontSizeScale = 1.0; // Default scale (1.0 = 100%), can be adjusted via panel
              
              // Convert letterSpacing from px to em if needed (panel expects em units)
              let letterSpacingEm = textLayerData.style.letterSpacing;
              if (letterSpacingEm && typeof letterSpacingEm === 'string' && letterSpacingEm.endsWith('px')) {
                const pxValue = parseFloat(letterSpacingEm) || 0;
                letterSpacingEm = `${(pxValue / 16).toFixed(2)}em`; // Convert px to em (16px = 1em)
              } else if (!letterSpacingEm || letterSpacingEm === '0px' || letterSpacingEm === 0) {
                letterSpacingEm = '0em';
              } else if (typeof letterSpacingEm === 'number') {
                letterSpacingEm = `${letterSpacingEm}em`;
              }
              
              const textStyles = {
                // CRITICAL: TextStylePanel requires fontSizeScale (number 0.3-3)
                fontSizeScale: fontSizeScale,
                // Keep fontSize for backward compatibility and rendering
                fontSize: `${textLayerData.style.fontSize || 28}px`,
                fontFamily: textLayerData.style.fontFamily || 'Inter',
                fontWeight: String(textLayerData.style.fontWeight || '400'),
                color: textLayerData.style.color || '#000000',
                textAlign: textLayerData.style.textAlign || 'center',
                lineHeight: String(textLayerData.style.lineHeight || 1.2),
                letterSpacing: letterSpacingEm || '0em',
                opacity: textLayerData.style.opacity !== undefined ? textLayerData.style.opacity : 1,
                textShadow: textLayerData.style.textShadow || null,
                backgroundColor: textLayerData.style.backgroundColor || 'transparent',
                padding: textLayerData.style.padding || '0px',
                borderRadius: textLayerData.style.borderRadius || '0px',
                zIndex: 350, // Same z-index for all text overlays
                transform: `scale(${textLayerData.scale || 1})`,
                animation: animationConfig, // Use stable reference
              };
              
              // Generate stable ID
              const textId = file.name || file.title || file.id || `text-${i}-${textIndex}`;
              const cleanTextId = String(textId)
                .replace(/[^a-zA-Z0-9_-]/g, '-')
                .replace(/-+/g, '-')
                .replace(/^-|-$/g, '')
                .toLowerCase();
              
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
              
              // Console log the src URL and ID for debugging
              const finalOverlayId = `text-${cleanTextId}-${textIndex}`;
              console.log(`[VideosList] Text Overlay ${textIndex + 1} - Using ID as replacement for src:`, {
                overlayId: finalOverlayId,
                originalUrl: textLayerData.url || null,
                processedSrc: textOverlaySrc,
                hasSrc: !!textOverlaySrc,
                usingIdAsReplacement: !textOverlaySrc, // True if no src, will use ID instead
                note: !textOverlaySrc ? 'No URL available - using overlay ID to fetch text style' : 'URL available - can use src',
              });
              
              // Create overlay object with stable references
              // NOTE: Text overlays can have a 'src' property with the text/video URL
              const textOverlay = {
                id: `text-${cleanTextId}-${textIndex}`, // CRITICAL: Add textIndex to ensure uniqueness
                left: textLeft,
                top: textTop,
                width: textWidth,
                height: textHeight,
                durationInFrames: textDurationInFrames,
                from: textStartFrame,
                rotation: textLayerData.rotation || 0,
                row: currentTextRow, // CRITICAL: Each text overlay gets its own row (1, 2, 3, etc.)
                isDragging: false,
                type: OverlayType.TEXT, // CRITICAL: Use TEXT type for text panel
                content: textLayerData.text || '', // Ensure content is always a string
                src: textOverlaySrc, // URL for text overlay video/text source (can be null if no URL)
                styles: textStyles, // Use stable reference with all required properties
              };
              
              newOverlays.push(textOverlay);
              
              // INCREMENT ROW for next text overlay
              lastTextRow = currentTextRow;
              currentTextRow++;
            });
          }
          
          // Calculate row offsets based on number of text overlays
          const textOverlayCount = textOverlayLayers.filter(layer => layer.enabled).length;
          const logoRow = Math.max(lastTextRow + 1, 2); // Logo after all text overlays (minimum row 2)
          const chartRow = logoRow + 1; // Chart after logo
          const baseVideoRow = chartRow + 1; // Base video after chart
          const subtitleRow = baseVideoRow + 1; // Subtitles after base video
          const audioRow = subtitleRow + 1; // Audio after subtitles
          
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
            
            // Process logo URL
            let logoMediaSrc = logoLayerData.url;
            if (!logoMediaSrc.startsWith('http://') && !logoMediaSrc.startsWith('https://') && !logoMediaSrc.startsWith('blob:')) {
              const cleanPath = logoMediaSrc.startsWith("/") ? logoMediaSrc.slice(1) : logoMediaSrc;
              logoMediaSrc = `/api/latest/local-media/serve/${cleanPath}`;
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
              rotation: logoLayerData.rotation,
              row: logoRow, // CRITICAL: Use calculated row (after all text overlays)
              isDragging: false,
              type: OverlayType.IMAGE, // CRITICAL: Use IMAGE type for image panel
              content: 'Logo',
              src: logoMediaSrc,
              styles: {
                opacity: logoLayerData.opacity,
                zIndex: 400, // CRITICAL: Highest z-index (above all other layers)
                transform: `scale(${logoLayerData.scale})`,
                objectFit: 'contain',
                mixBlendMode: logoLayerData.blend_mode || 'normal',
                animation: {
                  enter: animationType,
                  exit: animationType,
                  duration: logoLayerData.animation?.duration || 0.5,
                },
              },
            });
          }
          
          // STEP 3: Get chart layer data from new schema (row after logo)
          const chartLayerData = getChartLayerDataForBuild(file);
          
          let chartVideoUrl = null;
          let chartPosition = { x: 0.5, y: 0.5 };
          let chartBoundingBox = null;
          let chartScaling = { scale_x: 1, scale_y: 1, fit_mode: 'contain' };
          let chartAnimation = { type: 'none', duration: 0.5 };
          let chartOpacity = 1;
          let chartLayout = { align: 'center', verticalAlign: 'middle' };
          
          if (chartLayerData) {
            chartVideoUrl = chartLayerData.url;
            chartPosition = chartLayerData.position;
            chartBoundingBox = chartLayerData.bounding_box;
            chartScaling = chartLayerData.scaling;
            chartAnimation = chartLayerData.animation;
            chartOpacity = chartLayerData.opacity;
            chartLayout = chartLayerData.layout;
          } else {
            // Fallback to legacy chart extraction
            chartVideoUrl = file.chartVideoUrl || file.chart_video_url || '';
          }
          
          // Default video dimensions - fixed at 1280x720 (must fit within canvas)
          const DEFAULT_VIDEO_WIDTH = 1280;
          const DEFAULT_VIDEO_HEIGHT = 720;
          
          // ALWAYS CENTER VIDEOS BY DEFAULT
          const left = 0;
          const top = 0;

          // Ensure mediaSrc is valid
          if (!mediaSrc || !mediaSrc.trim()) {
            console.error(`[VideosList] Video ${i + 1} has no valid source URL, skipping`);
            continue;
          }

          // STEP 4: Process chart video (use calculated chartRow)
          if (chartVideoUrl && chartVideoUrl.trim()) {
            // Process chart video URL (same logic as base video URL)
            let rawChartPath = chartVideoUrl;
            
            // Check if chart video URL is already double-prefixed
            if (rawChartPath.includes('/api/latest/local-media/serve/http') || 
                rawChartPath.includes('/api/latest/local-media/serve/https')) {
              console.warn('[VideosList] WARNING: Double-prefixed chart video URL detected!', rawChartPath);
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
            
            // Get chart video duration
            let chartDurationSeconds = durationSeconds; // Default to base video duration
            
            try {
              const chartVideo = document.createElement('video');
              chartVideo.crossOrigin = 'anonymous';
              chartVideo.preload = 'metadata';
              
              await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                  console.warn(`[VideosList] Chart video ${i + 1} metadata timeout, using base video duration:`, chartDurationSeconds);
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
                  console.warn(`[VideosList] Chart video ${i + 1} load error, using base video duration:`, chartDurationSeconds);
                  resolve();
                };
                
                chartVideo.src = chartMediaSrc;
              });
            } catch (error) {
              console.warn(`[VideosList] Error loading chart video ${i + 1} metadata:`, error);
            }
            
            const chartDurationInFrames = Math.max(1, Math.round(chartDurationSeconds * fps));
            
            // Calculate position from bounding_box or position
            // Get aspect ratio from state (defaults to '16:9' if not set)
            const currentAspectRatio = aspectRatio || '16:9';
            const canvasWidth = currentAspectRatio === '9:16' || currentAspectRatio === '9/16' ? 1080 : 1920;
            const canvasHeight = currentAspectRatio === '9:16' || currentAspectRatio === '9/16' ? 1920 : 1080;
            
            let chartLeft = 0;
            let chartTop = 0;
            let chartWidth = DEFAULT_VIDEO_WIDTH;
            let chartHeight = DEFAULT_VIDEO_HEIGHT;
            
            if (chartBoundingBox) {
              // Use bounding_box for absolute positioning
              chartLeft = Math.round((chartBoundingBox.x || 0) * canvasWidth);
              chartTop = Math.round((chartBoundingBox.y || 0) * canvasHeight);
              chartWidth = Math.round((chartBoundingBox.width || 1) * canvasWidth);
              chartHeight = Math.round((chartBoundingBox.height || 1) * canvasHeight);
            } else if (chartPosition) {
              // Use position for centered positioning
              chartLeft = Math.round((chartPosition.x || 0.5) * canvasWidth);
              chartTop = Math.round((chartPosition.y || 0.5) * canvasHeight);
              
              // Center the chart based on its size
              chartLeft = chartLeft - (chartWidth / 2);
              chartTop = chartTop - (chartHeight / 2);
            } else {
              // Default to center if neither bounding_box nor position is specified
              chartLeft = (canvasWidth - chartWidth) / 2;
              chartTop = (canvasHeight - chartHeight) / 2;
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
            
            newOverlays.push({
              id: `chart-${cleanChartId}`, // Use file name as ID for uniqueness
              left: chartLeft,
              top: chartTop,
              width: chartWidth,
              height: chartHeight,
              durationInFrames: chartDurationInFrames,
              from: fromFrame,
              rotation: chartLayerData ? (chartLayerData.rotation || 0) : 0,
              row: chartRow, // CRITICAL: Use calculated row (after logo)
              isDragging: false,
              type: OverlayType.VIDEO,
              content: chartMediaSrc,
              src: chartMediaSrc, // Chart video URL from layers array or fallback - no prefixing, no modification
              videoStartTime: 0,
              mediaSrcDuration: chartDurationSeconds,
              styles: {
                opacity: chartOpacity,
                zIndex: 200, // High zIndex to ensure chart video renders on top visually
                transform: `scale(${chartScaling?.scale_x || 1}, ${chartScaling?.scale_y || 1})`,
                objectFit: chartScaling?.fit_mode || 'contain',
                animation: {
                  enter: animationType,
                  exit: animationType,
                  duration: chartAnimation?.duration || 0.5,
                },
                // Apply layout properties
                textAlign: chartLayout ? (chartLayout.align || 'center') : 'center',
                padding: chartLayout ? (chartLayout.padding || 0) : 0,
                verticalAlign: chartLayout ? (chartLayout.verticalAlign || 'middle') : 'middle',
              },
            });
            
          }

          // STEP 5: Add base video overlay (use calculated baseVideoRow)
          const baseVideoId = file.name || file.title || file.id || `base-video-${i}`;
          const cleanBaseVideoId = String(baseVideoId)
            .replace(/[^a-zA-Z0-9_-]/g, '-')
            .replace(/-+/g, '-')
            .replace(/^-|-$/g, '')
            .toLowerCase();
          
          newOverlays.push({
            id: `base-video-${cleanBaseVideoId}`, // Use file name as ID for uniqueness
            left: left, // Default: CENTERED horizontally (320px from left)
            top: top, // Default: CENTERED vertically (180px from top)
            width: DEFAULT_VIDEO_WIDTH, // Fixed: 1280px
            height: DEFAULT_VIDEO_HEIGHT, // Fixed: 720px
            durationInFrames,
            from: fromFrame,
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
              transform: 'none',
              objectFit: 'contain', // Maintain aspect ratio within 1280x720 container
              animation: {
                enter: 'none',
                exit: 'none',
              },
            },
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
            // PRIORITY 2: Fallback to existing audio extraction
            audioUrl = file.audioUrl || file.audio_url || '';
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
            
            // Get audio duration (try to load metadata, fallback to video duration)
            let audioDurationSeconds = durationSeconds; // Default to video duration
            
            try {
              const audio = document.createElement('audio');
              audio.crossOrigin = 'anonymous';
              audio.preload = 'metadata';
              
              await new Promise((resolve) => {
                const timeout = setTimeout(() => {
                  console.warn(`[VideosList] Audio ${i + 1} metadata timeout, using video duration:`, audioDurationSeconds);
                  resolve();
                }, 5000);
                
                audio.onloadedmetadata = () => {
                  clearTimeout(timeout);
                  const dur = audio.duration;
                    if (isFinite(dur) && dur > 0) {
                      audioDurationSeconds = dur;
                    }
                  resolve();
                };
                
                audio.onerror = (error) => {
                  clearTimeout(timeout);
                  console.warn(`[VideosList] Audio ${i + 1} load error, using video duration:`, audioDurationSeconds);
                  resolve();
                };
                
                audio.src = audioMediaSrc;
              });
            } catch (error) {
              console.warn(`[VideosList] Error loading audio ${i + 1} metadata:`, error);
            }
            
            const audioDurationInFrames = Math.max(1, Math.round(audioDurationSeconds * fps));
            
            // Add audio overlay on row 3 (bottom track) - CRITICAL: Audio MUST be on Row 3 (below chart, subtitles, and base video)
            const audioId = file.name || file.title || file.id || `audio-${i}`;
            const cleanAudioId = String(audioId)
              .replace(/[^a-zA-Z0-9_-]/g, '-')
              .replace(/-+/g, '-')
              .replace(/^-|-$/g, '')
              .toLowerCase();
            
            newOverlays.push({
              id: `audio-${cleanAudioId}`, // Use file name as ID for uniqueness
              left: 0,
              top: 0,
              width: 0, // Audio has no visual dimensions
              height: 0,
              durationInFrames: audioDurationInFrames,
              from: fromFrame, // Same start time as video (or from audio layer timing if available)
              rotation: 0,
              row: audioRow, // CRITICAL: Use calculated row (after subtitles, bottom track)
              isDragging: false,
              type: OverlayType.SOUND,
              content: file.name || file.title || `Audio ${i + 1}`,
              src: audioMediaSrc, // Audio URL from layers array or fallback - no prefixing, no modification
              mediaSrcDuration: audioDurationSeconds,
              startFromSound: 0, // Start from beginning of audio file
              styles: {
                volume: audioVolume, // Use volume from layer or default to 1
              },
            });
          }

          // STEP 6: Add subtitle/caption overlay (use calculated subtitleRow and updated z-index)
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
            const currentAspectRatio = aspectRatio || '16:9';
            const canvasWidth = currentAspectRatio === '9:16' || currentAspectRatio === '9/16' ? 1080 : 1920;
            const canvasHeight = currentAspectRatio === '9:16' || currentAspectRatio === '9/16' ? 1920 : 1080;
            
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
            
            // Ensure subtitle is within canvas bounds
            subtitleLeft = Math.max(0, Math.min(subtitleLeft, canvasWidth - subtitleWidth));
            subtitleTop = Math.max(0, Math.min(subtitleTop, canvasHeight - subtitleHeight));
            
            // Parse captions from SRT file or use inline text
            let captions = null;
            
            if (subtitleLayerData.url) {
              // Parse SRT file
              captions = await parseSRTToCaption(subtitleLayerData.url, fps);
            } else if (subtitleLayerData.text) {
              // Use inline text
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
              
              newOverlays.push({
                id: `caption-${cleanSubtitleId}`,
                left: subtitleLeft,
                top: subtitleTop,
                width: subtitleWidth,
                height: subtitleHeight,
                durationInFrames: subtitleDurationInFrames,
                from: subtitleStartFrame,
                rotation: 0,
                row: subtitleRow, // CRITICAL: Use calculated row (after base video)
                isDragging: false,
                type: OverlayType.CAPTION, // CRITICAL: Use CAPTION type for caption panel
                content: subtitleLayerData.text || 'Subtitles',
                src: subtitleLayerData.url || null, // SRT file URL
                captions: captions, // Parsed caption data with timing
                styles: {
                  fontSize: `${subtitleLayerData.style.fontSize}px`,
                  fontFamily: subtitleLayerData.style.fontFamily,
                  fontWeight: String(subtitleLayerData.style.fontWeight),
                  color: subtitleLayerData.style.color,
                  textAlign: subtitleLayerData.style.textAlign,
                  lineHeight: String(subtitleLayerData.style.lineHeight),
                  letterSpacing: `${subtitleLayerData.style.letterSpacing}px`,
                  opacity: 1, // CRITICAL: Full opacity for visibility
                  textShadow: subtitleLayerData.style.textShadow,
                  backgroundColor: subtitleLayerData.style.backgroundColor || 'rgba(0, 0, 0, 0.7)', // Semi-transparent background
                  padding: subtitleLayerData.style.padding,
                  borderRadius: subtitleLayerData.style.borderRadius,
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
              });
            }
          }

          fromFrame += durationInFrames;
        } catch (error) {
          console.error(`[VideosList] Failed to build overlay for video ${i + 1}:`, error);
        }
      }

      if (!cancelled) {
        if (newOverlays.length > 0) {
          // Sort overlays by row and then by from position
          newOverlays.sort((a, b) => {
            if (a.row !== b.row) return a.row - b.row;
            return (a.from || 0) - (b.from || 0);
          });
          
          // Log detailed overlay summary
          const overlaysByRow = {};
          const overlaysByType = {};
          
          newOverlays.forEach(overlay => {
            // Count by row
            if (!overlaysByRow[overlay.row]) {
              overlaysByRow[overlay.row] = [];
            }
            overlaysByRow[overlay.row].push(overlay);
            
            // Count by type
            overlaysByType[overlay.type] = (overlaysByType[overlay.type] || 0) + 1;
          });
          
          // Count text overlays for summary
          const textOverlayCount = newOverlays.filter(o => o.type === OverlayType.TEXT).length;
          
          // Only update if overlays actually changed (using ref to avoid unnecessary updates)
          if (!areOverlaysEqual(lastOverlaysRef.current, newOverlays)) {
            // Store in ref first, then update state with stable reference
            // Create a deep copy to ensure reference stability
            const overlaysToSet = JSON.parse(JSON.stringify(newOverlays));
            lastOverlaysRef.current = overlaysToSet;
            setDefaultOverlays(overlaysToSet);
          } else {
            // Overlays unchanged, skip update to prevent unnecessary re-renders
            console.log('📋 Overlays unchanged, skipping update');
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-lg relative h-[100%] w-full">
      {(showVideoLoader || isLoading) && (
        <>
          <div className="absolute inset-0 z-30 bg-white" />
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center space-y-4">
              <div className="relative w-20 h-20 flex items-center justify-center">
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
              <div className="space-y-2">
                <p className="text-lg font-semibold text-[#13008B]">Generating Videos</p>
                <p className="text-sm text-gray-600">
                  {status === 'succeeded' || (jobProgress.phase === 'done' && jobProgress.percent >= 100)
                    ? 'Refreshing video list...'
                    : 'This may take a few moments. Please keep this tab open while we finish.'}
                </p>
                {jobProgress.phase && jobProgress.percent > 0 && (
                  <p className="text-xs text-gray-500">
                    {jobProgress.phase.toUpperCase()} • {Math.min(100, Math.max(0, Math.round(jobProgress.percent)))}%
                  </p>
                )}
              </div>
            </div>
          </div>
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
      {/* Toggle buttons for Logo and Subtitle */}
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
          <div className="flex items-center gap-4">
            {/* Logo Toggle */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Logo</label>
              <button
                onClick={() => setLogoEnabled(!logoEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  logoEnabled ? 'bg-[#13008B]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    logoEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            
            {/* Subtitle Toggle */}
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-gray-700">Subtitle</label>
              <button
                onClick={() => setSubtitleEnabled(!subtitleEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  subtitleEnabled ? 'bg-[#13008B]' : 'bg-gray-300'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    subtitleEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
        {onClose && (
          <button onClick={onClose} className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50">
            Back
          </button>
        )}
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
                    className={`px-3 py-1.5 rounded-lg text-xs text-white ${
                      isTranscodingFinal || isFFmpegLoading ? 'bg-gray-400' : 'bg-[#13008B] hover:bg-[#0f0069]'
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
          <div className="flex-1 min-h-[640px] rounded-lg border border-gray-200 shadow-sm relative overflow-hidden">
            <ReactVideoEditor
              key={editorKey}
              projectId={PROJECT_ID}
              defaultOverlays={memoizedDefaultOverlays}
              defaultAspectRatio={aspectRatio}
              fps={APP_CONFIG.fps}
              renderer={lambdaRenderer}
              showDefaultThemes={true}
              showSidebar={sidebarVisible}
              sidebarLogo={null}
              sidebarFooterText=""
              // isLoadingProject={true}
              className="bg-white text-gray-900"
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
                '--sidebar-width': '16rem',
                '--sidebar-width-icon': '3rem',
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
              flex-direction: column-reverse !important;
              flex-wrap: wrap !important;
              justify-content: flex-start !important;
              gap: 0.5rem !important;
              align-items: center !important;
            }
            /* Ensure buttons are inline */
            .rve-host [data-sidebar="sidebar"]:last-child [data-sidebar="content"] button + button,
            .rve-host [data-sidebar="sidebar"]:last-child [data-sidebar="content"] a[role="button"] + a[role="button"],
            .rve-host [data-sidebar="sidebar"]:last-child [data-sidebar="content"] button + a[role="button"] {
              display: inline-flex !important;
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
                          <video
                            src={LoadingAnimationVideo}
                            autoPlay
                            loop
                            muted
                            playsInline
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
                      onError={(e) => console.error('Video error:', e.target.error)}
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