import React, { useEffect, useState, useRef, useMemo, useCallback } from 'react';
import VideoEditor from '../../pages/VideoEditor';
import { Zap, ChevronRight, X } from 'lucide-react';
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
  
  // Wrapper for setTransitions to add debugging
  const handleTransitionsChange = useCallback((newTransitions) => {
    console.log('🔄 VideosList: Transitions changed from VideoEditor:', {
      oldTransitions: transitions,
      newTransitions,
      keys: Object.keys(newTransitions),
      values: Object.values(newTransitions)
    });
    setTransitions(newTransitions);
  }, [transitions]);
  const [hoveredTransitionIndex, setHoveredTransitionIndex] = useState(null); // null or video index
  const [showTransitionMenu, setShowTransitionMenu] = useState(null); // null or video index
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mergeJobId, setMergeJobId] = useState('');

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

    // Get video URL based on logo and subtitle toggle states
    const getVideoUrlBasedOnToggles = (entry = {}) => {
      // 1. Both on: video_with_logo_and_subtitles_url
      if (logoEnabled && subtitleEnabled) {
        const url = getVideoWithLogoAndSubtitlesUrlFromEntry(entry);
        if (url) return url;
      }
      
      // 2. Both off: silent_video_url
      if (!logoEnabled && !subtitleEnabled) {
        const url = getSilentVideoUrlFromEntry(entry);
        if (url) return url;
      }
      
      // 3. Logo on, subtitle off: video_with_logo_url
      if (logoEnabled && !subtitleEnabled) {
        const url = getVideoWithLogoUrlFromEntry(entry);
        if (url) return url;
      }
      
      // 4. Logo off, subtitle on: video_with_subtitles_url
      if (!logoEnabled && subtitleEnabled) {
        const url = getVideoWithSubtitlesUrlFromEntry(entry);
        if (url) return url;
      }
      
      // Fallback to regular video URL if specific version not available
      return getVideoUrlFromEntry(entry);
    };

    // Get chart video URL (for PLOTLY model overlay)
    const getChartVideoUrlFromEntry = (entry = {}) => {
      // Check top-level first (most common structure)
      if (entry?.chart_video_url) return entry.chart_video_url;
      if (entry?.chartVideoUrl) return entry.chartVideoUrl;
      // Check nested structures
      if (entry?.chart_video?.url) return entry.chart_video.url;
      if (entry?.chart?.video_url) return entry.chart.video_url;
      if (entry?.videos?.v1?.chart_video_url) return entry.videos.v1.chart_video_url;
      if (entry?.videos?.chart_video_url) return entry.videos.chart_video_url;
      if (entry?.video?.v1?.chart_video_url) return entry.video.v1.chart_video_url;
      if (entry?.video?.chart_video_url) return entry.video.chart_video_url;
      return null;
    };

    // Get audio URL (prefer audio_only_url, especially from videos.v1 for SORA/PLOTLY)
    const getAudioUrlFromEntry = (entry = {}) => {
      // First check videos.v1.audio_only_url (for SORA/PLOTLY scenes)
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
          // Get video URL based on logo and subtitle toggle states
          const primaryVideoUrl = getVideoUrlBasedOnToggles(videoEntry);
          const scenes = [];

          const appendScene = (sceneSource, fallbackLabel) => {
            const sceneUrl = getVideoUrlFromEntry(sceneSource);
            const sceneAudioUrl = getAudioUrlFromEntry(sceneSource);
            if (sceneUrl) {
              scenes.push({
                url: sceneUrl,
                audioUrl: sceneAudioUrl, // Store audio URL per scene
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
          const chartVideoUrl = getChartVideoUrlFromEntry(videoEntry);
          
          // Debug logging for video URLs
          console.log(`📹 Video ${videoIndex + 1} URLs:`, {
            model: modelUpper,
            logoEnabled,
            subtitleEnabled,
            primaryVideoUrl: primaryVideoUrl,
            chart_video_url: chartVideoUrl,
            hasChartVideo: !!chartVideoUrl
          });
          
          // Debug logging for audio URL extraction
          if (audioUrl) {
            console.log(`✅ Found audio URL for video ${videoIndex + 1}:`, audioUrl);
            console.log(`   Source:`, {
              from_videos_v1: !!videoEntry?.videos?.v1?.audio_only_url,
              from_videos: !!videoEntry?.videos?.audio_only_url,
              from_video_v1: !!videoEntry?.video?.v1?.audio_only_url,
              from_top_level: !!videoEntry?.audio_only_url
            });
          } else {
            console.log(`⚠️ No audio URL found for video ${videoIndex + 1}, checking entry:`, {
              audio_only_url: videoEntry?.audio_only_url,
              audio_url: videoEntry?.audio_url,
              videos_v1: videoEntry?.videos?.v1 ? {
                audio_only_url: videoEntry.videos.v1?.audio_only_url,
                audio_url: videoEntry.videos.v1?.audio_url,
                video_with_logo_and_subtitles_url: videoEntry.videos.v1?.video_with_logo_and_subtitles_url
              } : null,
              videos: videoEntry?.videos ? {
                audio_only_url: videoEntry.videos?.audio_only_url,
                audio_url: videoEntry.videos?.audio_url
              } : null,
              video_v1: videoEntry?.video?.v1 ? {
                audio_only_url: videoEntry.video.v1?.audio_only_url,
                audio_url: videoEntry.video.v1?.audio_url
              } : null,
              video: videoEntry?.video ? {
                audio_only_url: videoEntry.video?.audio_only_url,
                audio_url: videoEntry.video?.audio_url
              } : null
            });
          }

          // Debug logging for chart_video_url
          if (chartVideoUrl) {
            console.log(`📊 Found chart_video_url for video ${videoIndex + 1} (model: ${modelUpper}):`, chartVideoUrl);
          }

          return {
            id: videoEntry?.id || videoEntry?.video_id || `video-${videoIndex}`,
            title: videoEntry?.title || videoEntry?.name || `Video ${videoIndex + 1}`,
            url: primaryVideoUrl || scenes[0]?.url || '', // This will be video_with_logo_and_subtitles_url if available
            description: videoEntry?.desc || videoEntry?.scene_description || '',
            narration: videoEntry?.narration || '',
            audioUrl: audioUrl,
            scenes,
            sceneNumber: videoEntry?.scene_number || videoEntry?.sceneNumber || videoEntry?.scene_no || null,
            model: modelUpper,
            chartVideoUrl: chartVideoUrl, // Store chart_video_url for overlay layer
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
        if (!cancelled && parsedSessionVideos.length > 0) {
          setItems(parsedSessionVideos);
          setSelectedIndex(0);
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
            
            console.log('📊 Video job status check:', {
              responseStatus,
              phaseStatus,
              finalStatus,
              isProgressComplete,
              percent,
              phase,
              jdataStatus: jdata?.status,
              fullResponse: jdata
            });
            
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
              console.log('⏳ Job still in progress, continuing to poll...', { finalStatus });
              setIsLoading(true);
              setShowVideoLoader(true);
              timeoutId = setTimeout(poll, 3000);
            } else {
              // Job is complete (succeeded or failed) - reload session data to get the new videos
              if (!cancelled) {
                console.log('✅ Job completed with status:', finalStatus);
                if (finalStatus === 'failed' || finalStatus === 'error') {
                  // If failed, hide loader and show error
                  console.error('❌ Video job failed');
                  setIsLoading(false);
                  setShowVideoLoader(false);
                  setError('Video generation failed. Please try again.');
                  return;
                }
                
                console.log('✅ Video job succeeded, reloading session data...');
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
                        console.log(`✅ Loaded ${refreshedVideos.length} videos from session data`);
                        setItems(refreshedVideos);
                        setStatus('succeeded');
                        setSelectedIndex(0);
                        // Hide loader after successful load
                        setIsLoading(false);
                        setShowVideoLoader(false);
                      } else if (!cancelled) {
                        console.log('⚠️ No videos found in refreshed session data, will continue polling...');
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
                
                // Convert chart_video_url to overlay clip (for any video that has it)
                // Only add chart overlay for PLOTLY clips so it stacks above the base video layer
                if (item.model === 'PLOTLY' && item.chartVideoUrl) {
                  try {
                    console.log(`📊 Converting chart_video_url to overlay for video ${item.id} (model: ${item.model || 'unknown'}):`, item.chartVideoUrl);
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
                      console.log(`✅ Chart overlay clip created and DIRECTLY linked to primary clip:`, {
                        itemId: item.id,
                        itemModel: item.model,
                        itemUrl: item.url, // This should be video_with_logo_and_subtitles_url
                        chartClipId: chartClip.id,
                        chartClipUrl: chartClip.url,
                        chartClipDuration: chartClip.duration,
                        chartClipTrimEnd: chartClip.trimEnd,
                        startTime: chartClip.startTime,
                        primaryClipId: clip.id,
                        primaryClipIndex: currentClipIndex,
                        sourceItemId: item.id,
                        primaryClipStartTime: primaryClipStartTime,
                        primaryClipEffectiveDuration: primaryClipEffectiveDuration,
                        primaryClipSpeed: primaryClipSpeed,
                        transform: chartClip.transform
                      });
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
        console.log('🎵 Processing audio tracks for', items.length, 'items');
        let accumulatedTime = 0;
        
        for (let i = 0; i < items.length; i++) {
          const item = items[i];
          const currentVideoClip = clips[i];
          let itemHasAudio = false;
          
          // Calculate start time for this video's scenes
          let sceneStartTime = accumulatedTime;
          
          // Process audio from scenes first (per scene audio)
          if (item.scenes && Array.isArray(item.scenes) && item.scenes.length > 0) {
            console.log(`🎵 Item ${i + 1} has ${item.scenes.length} scenes`);
            
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
                  console.log(`🎵 Converting audio URL for scene ${sceneIdx + 1} of item ${i + 1}:`, scene.audioUrl);
                  
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
                    
                    console.log(`✅ Audio clip created for scene:`, {
                      name: audioClip.name,
                      startTime: audioClip.startTime,
                      duration: audioClip.duration,
                      url: audioClip.url,
                      sceneIndex: sceneIdx
                    });
                  }
                } catch (error) {
                  console.error(`Failed to convert audio for scene ${sceneIdx + 1} of item ${i + 1}:`, error);
                }
              } else {
                console.log(`⚠️ Scene ${sceneIdx + 1} of item ${i + 1} has no audioUrl`);
              }
            }
          }
          
          // Fallback: Use video-level audio URL if no scene-level audio found
          if (item.audioUrl && (!item.scenes || item.scenes.length === 0 || !item.scenes.some(s => s.audioUrl))) {
            try {
              console.log(`🎵 Converting video-level audio URL for item ${i + 1}:`, item.audioUrl);
              const audioClip = await convertAudioUrlToClip(item.audioUrl, item.id, item.title);
              if (audioClip) {
                audioClip.startTime = accumulatedTime;
                audioClip.linkedVideoId = item.id;
                audioClips.push(audioClip);
                itemHasAudio = true;
                console.log(`✅ Audio clip created from video-level:`, {
                  name: audioClip.name,
                  startTime: audioClip.startTime,
                  duration: audioClip.duration,
                  url: audioClip.url
                });
              }
            } catch (error) {
              console.error(`Failed to convert video-level audio ${item.id}:`, error);
            }
          }

          // Fallback: For PLOTLY, if no audio added yet, try extracting audio from chart video
          if (!itemHasAudio && item.model === 'PLOTLY' && item.chartVideoUrl) {
            try {
              console.log(`🎵 PLOTLY fallback audio from chart video for item ${i + 1}:`, item.chartVideoUrl);
              const audioClip = await convertAudioUrlToClip(item.chartVideoUrl, `${item.id}-chart-audio`, `${item.title || 'Chart'} Audio`);
              if (audioClip) {
                audioClip.startTime = accumulatedTime;
                audioClip.linkedVideoId = item.id;
                audioClips.push(audioClip);
                itemHasAudio = true;
                console.log(`✅ Audio clip created from chart video:`, {
                  name: audioClip.name,
                  startTime: audioClip.startTime,
                  duration: audioClip.duration,
                  url: audioClip.url
                });
              }
            } catch (error) {
              console.error(`Failed to convert chart audio for PLOTLY item ${item.id}:`, error);
            }
          }

          // Final fallback: derive audio from the primary video URL itself (if still no audio)
          if (!itemHasAudio && item.url) {
            try {
              console.log(`🎵 Deriving audio from primary video for item ${i + 1}:`, item.url);
              const audioClip = await convertAudioUrlToClip(item.url, `${item.id}-video-audio`, `${item.title || 'Video'} Audio`);
              if (audioClip) {
                audioClip.startTime = accumulatedTime;
                audioClip.linkedVideoId = item.id;
                audioClips.push(audioClip);
                itemHasAudio = true;
                console.log(`✅ Audio clip created from video source:`, {
                  name: audioClip.name,
                  startTime: audioClip.startTime,
                  duration: audioClip.duration,
                  url: audioClip.url
                });
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
        
        console.log(`🎵 Total audio clips created: ${audioClips.length}`, audioClips);
        
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
              console.log(`🔗 Linked video clip ${videoClip.id} to ${linkedAudioClips.length} audio clip(s):`, 
                linkedAudioClips.map(ac => ac.id));
            }
            
            // Store the video clip ID in each linked audio clip
            linkedAudioClips.forEach((audioClip) => {
              audioClip.linkedVideoClipId = videoClip.id;
              console.log(`🔗 Linked audio clip ${audioClip.id} to video clip ${videoClip.id}`);
            });
          }
        });
        
        console.log('📊 Final results:', {
          videoClips: clips.length,
          chartOverlayClips: chartOverlayClips.length,
          audioClips: audioClips.length,
          overlayClipsDetails: chartOverlayClips.map(oc => ({
            id: oc.id,
            name: oc.name,
            url: oc.url,
            duration: oc.duration,
            primaryClipIndex: oc.primaryClipIndex
          })),
          audioClipsDetails: audioClips.map(ac => ({
            name: ac.name,
            url: ac.url,
            startTime: ac.startTime,
            duration: ac.duration,
            linkedVideoClipId: ac.linkedVideoClipId
          }))
        });
        
        // Set tracks: [0] = primary clips, [1+] = dedicated chart overlay tracks (one per chart clip)
        const chartTracks = chartOverlayClips.map(chartClip => [chartClip]);
        setEditorTracks([clips, ...chartTracks]);
        setEditorAudioTracks(audioClips);
        
        // Force a re-render by logging state update
        console.log('✅ State updated - editorAudioTracks set to:', audioClips.length, 'tracks');
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
      console.log('🎬 Preparing transitions for API:', {
        itemsCount: items.length,
        transitionsState: transitions,
        transitionsKeys: Object.keys(transitions),
        transitionsValues: Object.values(transitions)
      });
      
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
          console.log(`✅ Added transition ${i}:`, { from: i + 1, to: i + 2, type: transitionType });
        } else {
          // Add default fade if no transition is explicitly set
          transitionsArray.push({
            from: i + 1,
            to: i + 2,
            type: 'fade',
            duration: transitionDuration || 0.5
          });
          console.log(`⚠️ No transition set for index ${i}, using default 'fade'`);
        }
      }
      
      console.log('🎬 Final transitions array being sent to API:', {
        transitionsCount: transitionsArray.length,
        transitions: transitionsArray,
        requestBody: {
          session_id,
          user_id: user_id ? '***' : null,
          transitions: transitionsArray
        }
      });

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

  const selectedVideo = items[selectedIndex] || {};
  const selectedScenes = Array.isArray(selectedVideo.scenes) ? selectedVideo.scenes : [];
  const selectedVideoUrl = selectedVideo.url || selectedScenes[0]?.url || '';

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

        {/* Video Editor - Full Section */}
        {editorTracks[0].length > 0 && !isConvertingVideos ? (
          <div className="flex-1 flex flex-col overflow-hidden">
            {(() => {
              console.log('📹 Passing to VideoEditor:', {
                videoClips: editorTracks[0].length,
                audioClips: editorAudioTracks.length,
                audioTracks: editorAudioTracks,
                firstAudioTrack: editorAudioTracks[0],
                allAudioTracks: editorAudioTracks
              });
              return null;
            })()}
            <VideoEditor 
              key={`editor-${editorTracks[0].length}-${editorAudioTracks.length}`}
              initialTracks={editorTracks} 
              initialAudioTracks={editorAudioTracks}
              externalTransitions={transitions}
              onTransitionsChange={handleTransitionsChange}
              transitionOptions={Object.keys(TRANSITION_MAP)}
              transitionDuration={transitionDuration}
              onTransitionDurationChange={setTransitionDuration}
            />
          </div>
        ) : isConvertingVideos ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-20 h-20 mx-auto mb-4">
                <video
                  src={LoadingAnimationVideo}
                  autoPlay
                  loop
                  muted
                  playsInline
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="text-[#13008B] font-semibold">Loading video editor...</div>
            </div>
          </div>
        ) : items.length === 0 && !isLoading ? (
          <div className="flex-1 flex items-center justify-center text-gray-600">
            No videos available yet.
          </div>
        ) : null}
        
        {/* {selectedVideoUrl && (
          <div className="bg-white border rounded-xl p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2">
                <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
                  {isConvertingVideos ? (
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
                        <div>Loading video editor...</div>
                      </div>
                    </div>
                  ) : (
                    <video src={selectedVideoUrl} controls className="w-full h-full object-contain bg-black" />
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
        )}

        {/* Scene-by-scene for selected video */}
        {/* <div className="bg-white border rounded-xl p-4">
          <div className="text-base font-semibold mb-3">Scene By Scene (Selected Video)</div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {selectedScenes.length === 0 && (
              <div className="text-sm text-gray-600">No scene-level videos available for this selection.</div>
            )}
            {selectedScenes.map((scene, i) => (
              <div key={i} className="min-w-[260px] w-[260px]">
                <div className="rounded-xl border overflow-hidden">
                  <div className="w-full h-40 bg-black">
                    <video src={scene?.url} className="w-full h-full object-cover" controls muted />
                  </div>
                </div>
                <div className="mt-2 text-sm font-semibold">Scene {i + 1}</div>
                {scene?.description ? (
                  <div className="mt-1 text-xs text-gray-600 line-clamp-2">{scene.description}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div> */}

        {/* Video selector */}
      

        
      </div>
    </div>
  );
};

export default VideosList;
