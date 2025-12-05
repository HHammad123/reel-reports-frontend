import React, { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Sidebar from '../Components/Sidebar';
import Topbar from '../Components/Topbar';
import { SlidersHorizontal, Play, Pause, Volume2, VolumeX, Maximize2, Minimize2, Download } from 'lucide-react';
import { selectVideoJob, updateJobStatus, setJob } from '../redux/slices/videoJobSlice';

// Download video function - handles CORS and ensures complete download
const downloadVideo = async (videoUrl, videoName) => {
  let loadingMsg = null;
  
  try {
    // Show loading indicator
    loadingMsg = document.createElement('div');
    loadingMsg.id = 'video-download-loading';
    loadingMsg.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%);background:#13008B;color:white;padding:20px;border-radius:8px;z-index:10000;box-shadow:0 4px 6px rgba(0,0,0,0.3);';
    loadingMsg.textContent = 'Preparing download...';
    document.body.appendChild(loadingMsg);
    
    // Try fetch approach first (more reliable for binary data)
    const response = await fetch(videoUrl, {
      method: 'GET',
      headers: {
        'Accept': 'video/*,*/*',
      },
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    // Get content type
    const contentType = response.headers.get('content-type') || 'video/mp4';
    
    // Read the response as blob (handles binary data correctly)
    const blob = await response.blob();
    
    // Verify blob is valid and not empty
    if (!blob || blob.size === 0) {
      throw new Error('Downloaded file is empty or invalid');
    }
    
    // Determine file extension from content type or URL
    let extension = 'mp4';
    if (contentType.includes('webm')) extension = 'webm';
    else if (contentType.includes('mov')) extension = 'mov';
    else if (contentType.includes('avi')) extension = 'avi';
    else if (videoUrl.toLowerCase().match(/\.(webm|mov|avi)$/)) {
      const match = videoUrl.toLowerCase().match(/\.(\w+)$/);
      if (match) extension = match[1];
    }
    
    // Create download link
    const url = window.URL.createObjectURL(blob);
    const downloadLink = document.createElement('a');
    downloadLink.href = url;
    downloadLink.download = videoName 
      ? (videoName.endsWith('.mp4') || videoName.endsWith('.webm') || videoName.endsWith('.mov') 
         ? videoName 
         : `${videoName}.${extension}`)
      : `video.${extension}`;
    downloadLink.style.display = 'none';
    
    document.body.appendChild(downloadLink);
    downloadLink.click();
    
    // Cleanup after a delay
    setTimeout(() => {
      window.URL.revokeObjectURL(url);
      if (downloadLink.parentNode) {
        document.body.removeChild(downloadLink);
      }
      if (loadingMsg && loadingMsg.parentNode) {
        document.body.removeChild(loadingMsg);
      }
    }, 200);
    
  } catch (fetchError) {
    // If fetch fails (CORS or other issue), try direct download
    console.warn('Fetch download failed, trying direct download:', fetchError);
    
    if (loadingMsg && loadingMsg.parentNode) {
      loadingMsg.textContent = 'Trying alternative method...';
    }
    
    try {
      const directLink = document.createElement('a');
      directLink.href = videoUrl;
      directLink.download = videoName || 'video.mp4';
      directLink.style.display = 'none';
      document.body.appendChild(directLink);
      directLink.click();
      
      setTimeout(() => {
        if (directLink.parentNode) {
          document.body.removeChild(directLink);
        }
        if (loadingMsg && loadingMsg.parentNode) {
          document.body.removeChild(loadingMsg);
        }
      }, 200);
    } catch (directError) {
      // Final fallback: open in new tab
      if (loadingMsg && loadingMsg.parentNode) {
        document.body.removeChild(loadingMsg);
      }
      
      const fallbackLink = document.createElement('a');
      fallbackLink.href = videoUrl;
      fallbackLink.target = '_blank';
      fallbackLink.rel = 'noopener noreferrer';
      fallbackLink.style.display = 'none';
      document.body.appendChild(fallbackLink);
      fallbackLink.click();
      setTimeout(() => {
        if (fallbackLink.parentNode) {
          document.body.removeChild(fallbackLink);
        }
      }, 200);
      
      alert('Download failed. The video will open in a new tab - please right-click and select "Save video as..." to download.');
    }
  }
};

// Video Player Component
const VideoPlayer = ({ videoUrl, videoName }) => {
  const videoRef = useRef(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const controlsTimeoutRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const updateTime = () => setCurrentTime(video.currentTime);
    const updateDuration = () => setDuration(video.duration);
    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
    };

    video.addEventListener('timeupdate', updateTime);
    video.addEventListener('loadedmetadata', updateDuration);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', updateTime);
      video.removeEventListener('loadedmetadata', updateDuration);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.volume = volume;
      setIsMuted(volume === 0);
    }
  }, [volume]);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isPlaying) {
      video.pause();
    } else {
      video.play().catch(() => {});
    }
  };

  const handleProgressClick = (e) => {
    const video = videoRef.current;
    if (!video || !duration) return;
    
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    video.currentTime = percentage * duration;
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (isMuted) {
      setVolume(1);
    } else {
      setVolume(0);
    }
  };

  const toggleFullscreen = () => {
    const video = videoRef.current;
    if (!video) return;

    if (!isFullscreen) {
      if (video.requestFullscreen) {
        video.requestFullscreen();
      } else if (video.webkitRequestFullscreen) {
        video.webkitRequestFullscreen();
      } else if (video.mozRequestFullScreen) {
        video.mozRequestFullScreen();
      } else if (video.msRequestFullscreen) {
        video.msRequestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) {
        document.webkitExitFullscreen();
      } else if (document.mozCancelFullScreen) {
        document.mozCancelFullScreen();
      } else if (document.msExitFullscreen) {
        document.msExitFullscreen();
      }
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!(
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.mozFullScreenElement ||
        document.msFullscreenElement
      ));
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const formatTime = (seconds) => {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleMouseMove = () => {
    setShowControls(true);
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    controlsTimeoutRef.current = setTimeout(() => {
      if (isPlaying) {
        setShowControls(false);
      }
    }, 3000);
  };

  const handleMouseLeave = () => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    if (isPlaying) {
      setShowControls(false);
    }
  };

  return (
    <div 
      className="relative w-full bg-black rounded-xl overflow-hidden group"
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      <video
        ref={videoRef}
        src={videoUrl}
        className="w-full h-auto max-h-[700px] object-contain"
        preload="metadata"
        onClick={togglePlay}
      />
      
      {/* Controls Overlay */}
      <div 
        className={`absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4 transition-opacity duration-300 ${
          showControls ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Progress Bar */}
        <div 
          className="w-full h-1 bg-white/30 rounded-full mb-3 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div 
            className="h-full bg-[#13008B] rounded-full transition-all"
            style={{ width: `${duration ? (currentTime / duration) * 100 : 0}%` }}
          />
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {/* Play/Pause Button */}
            <button
              onClick={togglePlay}
              className="text-white hover:text-[#13008B] transition-colors"
            >
              {isPlaying ? <Pause size={24} /> : <Play size={24} />}
            </button>

            {/* Volume Control */}
            <div className="flex items-center gap-2">
              <button
                onClick={toggleMute}
                className="text-white hover:text-[#13008B] transition-colors"
              >
                {isMuted || volume === 0 ? <VolumeX size={20} /> : <Volume2 size={20} />}
              </button>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={volume}
                onChange={(e) => setVolume(parseFloat(e.target.value))}
                className="w-20 h-1 bg-white/30 rounded-full appearance-none cursor-pointer accent-[#13008B]"
              />
            </div>

            {/* Time Display */}
            <span className="text-white text-sm">
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className="flex items-center gap-3">
            {/* Download Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                downloadVideo(videoUrl, videoName);
              }}
              className="text-white hover:text-[#13008B] transition-colors"
              title="Download video"
            >
              <Download size={20} />
            </button>

            {/* Fullscreen Button */}
            <button
              onClick={toggleFullscreen}
              className="text-white hover:text-[#13008B] transition-colors"
            >
              {isFullscreen ? <Minimize2 size={20} /> : <Maximize2 size={20} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// Video Thumbnail Component - shows first frame and expands to player on click
const VideoThumbnail = ({ videoUrl, videoName }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const thumbnailVideoRef = useRef(null);
  const [thumbnailReady, setThumbnailReady] = useState(false);

  useEffect(() => {
    const video = thumbnailVideoRef.current;
    if (!video) return;

    const handleLoadedData = () => {
      video.currentTime = 0.1; // Seek to first frame
      setThumbnailReady(true);
    };

    video.addEventListener('loadeddata', handleLoadedData);
    video.load();

    return () => {
      video.removeEventListener('loadeddata', handleLoadedData);
    };
  }, [videoUrl]);

  if (isExpanded) {
    return (
      <div className="w-full">
        <div className="flex items-center justify-between mb-2">
          <button
            onClick={() => setIsExpanded(false)}
            className="text-sm text-gray-600 hover:text-gray-900"
          >
            ← Back to thumbnail
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              downloadVideo(videoUrl, videoName);
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-white bg-[#13008B] hover:bg-[#0f0069] rounded-md transition-colors"
            title="Download video"
          >
            <Download size={16} />
            Download
          </button>
        </div>
        <VideoPlayer videoUrl={videoUrl} videoName={videoName} />
      </div>
    );
  }

  return (
    <div className="relative w-full">
      <div 
        className="relative w-full bg-black rounded-xl overflow-hidden border border-gray-200 shadow-sm cursor-pointer group"
        onClick={() => setIsExpanded(true)}
      >
        <video
          ref={thumbnailVideoRef}
          src={videoUrl}
          className="w-full h-auto object-contain max-h-[400px]"
          preload="metadata"
          muted
          playsInline
        />
        {/* Play button overlay */}
        <div className="absolute inset-0 flex items-center justify-center bg-black/20 group-hover:bg-black/30 transition-colors pointer-events-none">
          <div className="w-16 h-16 rounded-full bg-white/90 flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform">
            <Play size={32} className="text-black ml-1" fill="black" />
          </div>
        </div>
        {/* Download button overlay - appears on hover */}
        <div 
          className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            downloadVideo(videoUrl, videoName);
          }}
        >
          <button
            className="p-2 bg-black/70 hover:bg-black/90 rounded-full text-white transition-colors"
            title="Download video"
          >
            <Download size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

// Section expects an array of items: { id, url, name, created_at, type }

const Section = ({ title, items }) => {
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {items.map((item, i) => {
          const isVideo = item?.type === 'video';
          
          return (
            <div key={item.id || i} className="w-full">
              {isVideo && item?.url ? (
                <VideoThumbnail videoUrl={item.url} videoName={item.name} />
              ) : item?.thumb || item?.url ? (
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-black">
                  <img 
                    src={item.thumb || item.url} 
                    alt={item.id || `media-${i}`} 
                    className="w-full h-auto object-contain" 
                  />
                </div>
              ) : (
                <div className="w-full h-40 flex items-center justify-center text-white/70 text-sm bg-gray-100 rounded-xl">
                  No preview
                </div>
              )}
              {/* Video/Image title and download button below */}
              {item?.name && (
                <div className="mt-3 flex items-center justify-between">
                  <p className="text-base font-semibold text-gray-900 flex-1 truncate" title={item.name}>
                    {item.name}
                  </p>
                  {isVideo && item?.url && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadVideo(item.url, item.name);
                      }}
                      className="ml-2 p-2 text-gray-600 hover:text-[#13008B] hover:bg-gray-100 rounded-md transition-colors flex-shrink-0"
                      title="Download video"
                    >
                      <Download size={18} />
                    </button>
                  )}
                </div>
              )}
              {!item?.name && isVideo && item?.url && (
                <div className="mt-3 flex justify-end">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      downloadVideo(item.url, item.name || 'video.mp4');
                    }}
                    className="p-2 text-gray-600 hover:text-[#13008B] hover:bg-gray-100 rounded-md transition-colors"
                    title="Download video"
                  >
                    <Download size={18} />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const MyMedia = () => {
  const [sortMode, setSortMode] = useState('timeline');
  const videoJob = useSelector(selectVideoJob);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [library, setLibrary] = useState({ today: [], week: [], month: [], year: [] });
  const [isLoadingLib, setIsLoadingLib] = useState(false);
  const [libError, setLibError] = useState('');
  const [showShortPopup, setShowShortPopup] = useState(false);
  const [webmConversionJobId, setWebmConversionJobId] = useState(null);
  const [webmConversionStatus, setWebmConversionStatus] = useState(null);
  // State for final videos
  const [finalVideos, setFinalVideos] = useState([]);

  // Initialize Redux job from localStorage if user hit this page via redirect
  useEffect(() => {
    try {
      if (!videoJob?.jobId) {
        const jid = localStorage.getItem('current_video_job_id');
        if (jid) dispatch(setJob({ jobId: jid, status: 'queued' }));
      }
    } catch (_) { /* noop */ }
  }, [videoJob?.jobId, dispatch]);

  // Initialize webm conversion job from localStorage
  useEffect(() => {
    try {
      const jobId = localStorage.getItem('webm_conversion_job_id');
      if (jobId) {
        setWebmConversionJobId(jobId);
        setWebmConversionStatus('queued');
      }
    } catch (_) { /* noop */ }
  }, []);

  // Poll webm conversion job status until succeeded
  useEffect(() => {
    if (!webmConversionJobId) return;
    
    let cancelled = false;
    let isPolling = false; // Track if polling is in progress
    const pollInterval = 3000; // 3 seconds
    const maxDuration = 10 * 60 * 1000; // 10 minutes
    const startTime = Date.now();
    
    const poll = async () => {
      // Prevent multiple polling loops
      if (isPolling || cancelled) return;
      
      // Check timeout
      if (Date.now() - startTime > maxDuration) {
        setWebmConversionStatus('failed');
        console.error('WebM conversion job polling timeout');
        return;
      }
      
      isPolling = true;
      
      try {
        const apiBase = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net';
        const url = `${apiBase}/v1/videos/webm-conversion-job-status/${encodeURIComponent(webmConversionJobId)}`;
        
        const resp = await fetch(url);
        const text = await resp.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = text;
        }
        
        if (!resp.ok) {
          throw new Error(`Job status check failed: ${resp.status} ${text}`);
        }
        
        const status = data?.status || data?.job_status || 'queued';
        
        if (!cancelled) {
          setWebmConversionStatus(status);
          
          // If succeeded, clear the job ID from localStorage
          if (status === 'succeeded' || status === 'completed') {
            localStorage.removeItem('webm_conversion_job_id');
            // Refresh the video library to show the new video
            setTimeout(() => {
              window.location.reload();
            }, 1000);
            isPolling = false;
            return; // Stop polling
          }
          
          // If failed, keep job ID for debugging but stop polling
          if (status === 'failed' || status === 'error') {
            console.error('WebM conversion job failed:', data);
            isPolling = false;
            return; // Stop polling
          }
        }
        
        // Continue polling if not in terminal state
        if (!cancelled && status !== 'succeeded' && status !== 'completed' && status !== 'failed' && status !== 'error') {
          isPolling = false;
          setTimeout(poll, pollInterval);
        } else {
          isPolling = false;
        }
      } catch (e) {
        console.error('Error polling webm conversion job status:', e);
        isPolling = false;
        if (!cancelled) {
          // On error, retry after interval (but check timeout first)
          if (Date.now() - startTime < maxDuration) {
            setTimeout(poll, pollInterval);
          } else {
            setWebmConversionStatus('failed');
          }
        }
      }
    };
    
    poll();
    return () => { cancelled = true; };
  }, [webmConversionJobId]); // Only depend on jobId, not status

  // Poll job status if jobId exists and not terminal (adjust to merge jobs when needed)
  useEffect(() => {
    if (!videoJob?.jobId) return;
    if (videoJob.status === 'succeeded' || videoJob.status === 'failed') return;
    let cancelled = false;
    const pollInterval = 3000;
    const maxDuration = 10 * 60 * 1000; // 10 minutes
    const startTime = Date.now();
    const poll = async () => {
      try {
        let url = videoJob.statusUrl;
        if (!url) {
          const jobType = (() => { try { return localStorage.getItem('current_video_job_type'); } catch (_) { return null; } })();
          const base = 'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net';
          if (jobType === 'merge') {
            url = `${base}/v1/jobs/merge/${encodeURIComponent(videoJob.jobId)}`;
          } else {
            url = `${base}/v1/jobs/${encodeURIComponent(videoJob.jobId)}`;
          }
        }
        const resp = await fetch(url);
        const text = await resp.text();
        let data; try { data = JSON.parse(text); } catch (_) { data = text; }
        if (!resp.ok) throw new Error(`jobs poll failed: ${resp.status} ${text}`);
        const next = {
          status: data?.status || videoJob.status,
          progress: data?.progress || videoJob.progress,
          resultUrl: data?.result_url,
          error: data?.error || null,
        };
        if (!cancelled) dispatch(updateJobStatus(next));
      } catch (e) {
        if (!cancelled) dispatch(updateJobStatus({ error: e.message }));
      } finally {
        if (!cancelled && videoJob?.status !== 'succeeded' && videoJob?.status !== 'failed') {
          if (Date.now() - startTime < maxDuration) {
            setTimeout(poll, pollInterval);
          } else {
            dispatch(updateJobStatus({ status: 'failed', error: 'Video generation timeout' }));
          }
        }
      }
    };
    poll();
    return () => { cancelled = true; };
  }, [videoJob?.jobId, videoJob?.status, videoJob?.statusUrl, dispatch]);

  // Trigger video generation (merge) from media page
  const handleGenerateVideoMerge = async () => {
    try {
      const token = localStorage.getItem('token');
      const sessionId = localStorage.getItem('session_id');
      if (!token || !sessionId) { alert('Missing login or session. Please sign in again.'); return; }

      // Fetch full session data first
      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessionText = await sessionResp.text();
      let sessionData; try { sessionData = JSON.parse(sessionText); } catch (_) { sessionData = sessionText; }
      if (!sessionResp.ok) throw new Error(`user-session/data failed: ${sessionResp.status} ${sessionText}`);
      const sd = sessionData?.session_data || {};

      // Build session payload expected by merge API
      const sessionForBody = {
        id: sd.session_id || sessionId,
        user_id: token,
        title: sd.title || sd.session_title || 'My Video',
        videoduration: (sd.video_duration?.toString?.() || '60'),
        created_at: sd.created_at || new Date().toISOString(),
        updated_at: sd.updated_at || new Date().toISOString(),
        document_summary: sd.document_summary || sd.summarydocument || [],
        messages: sd.messages || [],
        content: sd.content || [],
        total_summary: sd.total_summary || [],
        scripts: Array.isArray(sd.scripts) ? sd.scripts : [],
        videos: sd.videos || [],
        images: sd.images || [],
      };

      const body = { session: sessionForBody };
      const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/videos/merge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`videos/merge failed: ${resp.status} ${text}`);

      const jobId = data?.job_id || data?.jobId || data?.id;
      let statusUrl = data?.status_url || null;
      try {
        if (statusUrl) {
          const u = new URL(statusUrl);
          if (u.protocol === 'http:') u.protocol = 'https:';
          statusUrl = u.toString();
        }
      } catch (_) { /* keep raw */ }
      const status = data?.status || 'queued';
      if (jobId) {
        try { localStorage.setItem('current_video_job_id', jobId); } catch (_) { /* noop */ }
        try { if (statusUrl) localStorage.setItem('current_video_job_status_url', statusUrl); } catch (_) { /* noop */ }
        try { localStorage.setItem('current_video_job_type', 'merge'); } catch (_) { /* noop */ }
        try { dispatch(setJob({ jobId, status, statusUrl })); } catch (_) { /* noop */ }
      }

      // Show 5s popup then redirect to media (this page reload)
      setShowShortPopup(true);
      setTimeout(() => {
        setShowShortPopup(false);
        try { window.location && (window.location.href = '/media'); } catch (_) { /* noop */ }
      }, 5000);
    } catch (e) {
      alert(e?.message || 'Failed to start video merge');
    }
  };

  // Get all media items from final videos
  const getAllMedia = useCallback(() => {
    // Return all final videos directly
    return finalVideos || [];
  }, [finalVideos]);

  // Get all media data (videos and images from all aspect ratios)
  const data = useMemo(() => {
    const allMedia = getAllMedia();

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfWeek = (() => { 
      const d = new Date(startOfDay); 
      const day = d.getDay(); 
      const diff = (day + 6) % 7; 
      d.setDate(d.getDate() - diff); 
      return d; 
    })();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const inRange = (ts, from) => (new Date(ts)).getTime() >= from.getTime();

    const today = allMedia.filter(v => inRange(v.created_at, startOfDay));
    const week = allMedia.filter(v => inRange(v.created_at, startOfWeek) && !inRange(v.created_at, startOfDay));
    const month = allMedia.filter(v => inRange(v.created_at, startOfMonth) && !inRange(v.created_at, startOfWeek));
    const year = allMedia.filter(v => inRange(v.created_at, startOfYear) && !inRange(v.created_at, startOfMonth));

    return { today, week, month, year, all: allMedia };
  }, [getAllMedia]);

  // Fetch user's final videos (videos and images) organized by aspect ratio
  useEffect(() => {
    const fetchMedia = async () => {
      try {
        setIsLoadingLib(true); 
        setLibError('');
        const user_id = localStorage.getItem('token') || '';
        
        if (!user_id) {
          setLibError('User ID not found. Please sign in again.');
          setIsLoadingLib(false);
          return;
        }

        const apiBase = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net';
        const resp = await fetch(`${apiBase}/v1/users/user/${encodeURIComponent(user_id)}/final-videos`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        
        const text = await resp.text();
        let json; 
        try { 
          json = JSON.parse(text); 
        } catch (_) { 
          json = text; 
        }
        
        if (!resp.ok) {
          throw new Error(`final-videos failed: ${resp.status} ${text}`);
        }

        // Parse the response structure: { final_videos: [{ name, url }, ...] }
        const videosArray = Array.isArray(json?.final_videos) ? json.final_videos : [];
        
        // Normalize videos to consistent format
        const normalizedVideos = videosArray
          .filter(v => v && v.url && typeof v.url === 'string' && v.url.trim())
          .map((video, index) => ({
            id: video.id || `video-${index}-${Date.now()}`,
            url: video.url.trim(),
            thumb: video.thumbnail_url || video.thumb_url || video.url.trim(), // Use video URL as thumbnail if no thumbnail
            name: video.name || `Video ${index + 1}`,
            created_at: video.created_at || video.updated_at || new Date().toISOString(),
            type: 'video'
          }));

        // Store final videos
        setFinalVideos(normalizedVideos);

        // Initialize library with empty arrays (time buckets will be calculated in useMemo)
        setLibrary({ today: [], week: [], month: [], year: [], all: [] });
      } catch (e) {
        setLibError(e?.message || 'Failed to load media');
        console.error('Error fetching final videos:', e);
      } finally { 
        setIsLoadingLib(false); 
      }
    };
    fetchMedia();
  }, []);

  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
      <Sidebar />
      <div className="flex-1 mx-[2rem] mt-[1rem] min-w-0">
        <Topbar />
        <div className="h-[85vh] my-2 overflow-y-auto scrollbar-hide">
          <div className="bg-white rounded-2xl p-5">
            <div className="flex items-center justify-end mb-4 gap-2">
              {/* Sort buttons */}
              <div className="flex items-center gap-2">
              <div className="flex items-center gap-2 text-gray-700"><SlidersHorizontal className="w-4 h-4" /></div>
              <button onClick={() => setSortMode('type')} className={`px-3 py-1.5 rounded-md text-sm border ${sortMode==='type' ? 'bg-gray-100 border-gray-300' : 'border-gray-200 hover:bg-gray-50'}`}>Sort by File Type</button>
              <button onClick={() => setSortMode('timeline')} className={`px-3 py-1.5 rounded-md text-sm border ${sortMode==='timeline' ? 'bg-gray-100 border-gray-300' : 'border-gray-200 hover:bg-gray-50'}`}>Sort by Timeline</button>
              </div>
            </div>

            {/* In-progress video card at top if a job exists */}
            {videoJob?.jobId && videoJob.status !== 'failed' && videoJob.status !== 'succeeded' && (
              <div className="mb-8 p-4 border border-gray-200 rounded-xl bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-gray-900 font-medium">Generating Video</div>
                  <div className={`text-sm ${videoJob.status === 'succeeded' ? 'text-green-700' : videoJob.status === 'failed' ? 'text-red-700' : 'text-blue-700'}`}>
                    {videoJob.status || 'queued'} {typeof videoJob?.progress?.percent === 'number' ? `• ${videoJob.progress.percent}%` : ''}
                  </div>
                </div>
                <div className="relative w-full aspect-video rounded-lg border overflow-hidden bg-black flex items-center justify-center">
                  {videoJob.status !== 'succeeded' && (
                    <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded bg-yellow-400 text-black text-xs font-semibold">Generating…</div>
                  )}
                  {videoJob.status === 'succeeded' && videoJob.resultUrl ? (
                    <video src={videoJob.resultUrl} controls className="w-full h-full object-contain" />
                  ) : (
                    <div className="text-white/80 text-sm">{'Generating Your Perfect Video…'}</div>
                  )}
                </div>
                {videoJob.status === 'failed' && (
                  <div className="mt-2 text-sm text-red-700">{videoJob.error || 'Video generation failed.'}</div>
                )}
              </div>
            )}

            {/* WebM Conversion job status card */}
            {webmConversionJobId && webmConversionStatus && webmConversionStatus !== 'succeeded' && webmConversionStatus !== 'completed' && webmConversionStatus !== 'failed' && webmConversionStatus !== 'error' && (
              <div className="mb-8 p-4 border border-gray-200 rounded-xl bg-gray-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-gray-900 font-medium">Converting Video to MP4</div>
                  <div className={`text-sm ${webmConversionStatus === 'succeeded' || webmConversionStatus === 'completed' ? 'text-green-700' : webmConversionStatus === 'failed' || webmConversionStatus === 'error' ? 'text-red-700' : 'text-blue-700'}`}>
                    {webmConversionStatus || 'queued'}
                  </div>
                </div>
                <div className="relative w-full aspect-video rounded-lg border overflow-hidden bg-black flex items-center justify-center">
                  <div className="absolute top-3 left-3 z-10 px-2 py-1 rounded bg-yellow-400 text-black text-xs font-semibold">Converting…</div>
                  <div className="text-white/80 text-sm">{'Your video is being converted. Please wait...'}</div>
                </div>
              </div>
            )}

            {isLoadingLib && (<div className="mb-4 text-sm text-gray-600">Loading your videos…</div>)}
            {libError && (<div className="mb-4 text-sm text-red-600">{libError}</div>)}
            
            {/* Show message if no videos found */}
            {!isLoadingLib && !libError && data.all.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                <p className="text-lg font-medium mb-2">No videos found</p>
                <p className="text-sm">No videos available.</p>
              </div>
            )}
            
            {data.today.length > 0 && (
              <Section 
                title="Today" 
                items={data.today} 
              />
            )}
            {data.week.length > 0 && (
              <Section 
                title="This Week" 
                items={data.week} 
              />
            )}
            {data.month.length > 0 && (
              <Section 
                title="This Month" 
                items={data.month} 
              />
            )}
            {data.year.length > 0 && (
              <Section 
                title="This Year" 
                items={data.year} 
              />
            )}
            {data.all.length > 0 && (
              <Section 
                title="All Videos" 
                items={data.all} 
              />
            )}
          </div>
        </div>
      </div>

      {showShortPopup && (
        <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='bg-white w-[100%] max-w-sm rounded-lg shadow-xl p-6 text-center'>
            <div className='mx-auto mb-4 w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin' />
            <h4 className='text-lg font-semibold text-gray-900'>Generating your video…</h4>
            <p className='mt-1 text-sm text-gray-600'>We’ll redirect you to Media shortly.</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyMedia;
