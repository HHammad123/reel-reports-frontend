import React, { useEffect, useState } from 'react';

const TRANSITION_MAP = {
  "fade": "fade",
  "fadeblack": "fadeblack",
  "fadewhite": "fadewhite",
  "slideleft": "slideleft",
  "slideright": "slideright",
  "slideup": "slideup",
  "slidedown": "slidedown",
  "circleopen": "circleopen",
  "circleclose": "circleclose",
  "wipeleft": "wipeleft",
  "wiperight": "wiperight",
  "wipeup": "wipeup",
  "wipedown": "wipedown",
  "pixelize": "pixelize",
  "dissolve": "dissolve",
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
  const [hoveredTransitionIndex, setHoveredTransitionIndex] = useState(null); // null or video index
  const [showTransitionMenu, setShowTransitionMenu] = useState(null); // null or video index
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [mergeJobId, setMergeJobId] = useState('');

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    const getVideoUrlFromEntry = (entry = {}) =>
      entry?.video?.v1?.video_url ||
      entry?.video?.video_url ||
      entry?.videos?.v1?.video_url ||
      entry?.videos?.video_url ||
      entry?.video_url ||
      entry?.blobLink?.video_link ||
      entry?.url;

    const parseVideosPayload = (payload = {}) => {
      const videosArr = Array.isArray(payload?.videos) ? payload.videos : [];
      return videosArr
        .map((videoEntry, videoIndex) => {
          const primaryVideoUrl = getVideoUrlFromEntry(videoEntry);
          const scenes = [];

          const appendScene = (sceneSource, fallbackLabel) => {
            const sceneUrl = getVideoUrlFromEntry(sceneSource);
            if (sceneUrl) {
              scenes.push({
                url: sceneUrl,
                description:
                  sceneSource?.desc ||
                  sceneSource?.description ||
                  sceneSource?.scene_description ||
                  fallbackLabel ||
                  '',
                narration: sceneSource?.narration || sceneSource?.voiceover || '',
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

          return {
            id: videoEntry?.id || videoEntry?.video_id || `video-${videoIndex}`,
            title: videoEntry?.title || videoEntry?.name || `Video ${videoIndex + 1}`,
            url: primaryVideoUrl || scenes[0]?.url || '',
            description: videoEntry?.desc || videoEntry?.scene_description || '',
            narration: videoEntry?.narration || '',
            scenes,
          };
        })
        .filter(Boolean);
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
          setStatus('succeeded');
          setSelectedIndex(0);
        }

        const fetchFinalVideos = async () => {
          try {
            setShowVideoLoader(true);
            const vidsResp = await fetch(
              `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/${encodeURIComponent(session_id)}?user_id=${encodeURIComponent(user_id)}`
            );
            const vidsText = await vidsResp.text();
            let vidsData;
            try {
              vidsData = JSON.parse(vidsText);
            } catch (_) {
              vidsData = vidsText;
            }
            if (!vidsResp.ok) throw new Error(`videos fetch failed: ${vidsResp.status} ${vidsText}`);
            const parsed = parseVideosPayload(vidsData);
            if (!cancelled) {
              setItems(parsed);
              setStatus(parsed.length ? 'succeeded' : status);
              if (parsed.length) setSelectedIndex(0);
            }
          } catch (err) {
            console.error('❌ Error fetching final videos:', err);
            if (!cancelled) setError(err?.message || 'Failed to fetch videos');
          } finally {
            if (!cancelled) setShowVideoLoader(false);
          }
        };

        // If we have a jobId and no session videos yet, poll job API until succeeded
        const id = jobId || localStorage.getItem('current_video_job_id');
        const shouldPollJob = !!id && parsedSessionVideos.length === 0;
        if (!shouldPollJob) { setIsLoading(false); setShowVideoLoader(false); return; }

        setShowVideoLoader(true);
        setJobProgress({ percent: 0, phase: 'queued' });

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
            if (!cancelled) {
              setJobProgress({ percent, phase });
              setStatus(phase || String(jdata?.status || 'queued'));
            }

            if (!cancelled && !(phase === 'done' && percent >= 100)) {
              timeoutId = setTimeout(poll, 3000);
            } else {
              await fetchFinalVideos();
              if (!cancelled) {
                setIsLoading(false);
                setShowVideoLoader(false);
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
  }, [jobId]);

  useEffect(() => {
    if (selectedIndex >= items.length && items.length > 0) {
      setSelectedIndex(0);
    }
  }, [items.length, selectedIndex]);

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
        const transitionType = transitions[i] || 'fade'; // Default to 'fade' if not set
        transitionsArray.push({
          from: i + 1, // 1-indexed
          to: i + 2,   // 1-indexed
          type: transitionType,
          duration: 0.5
        });
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

  const selectedVideo = items[selectedIndex] || {};
  const selectedScenes = Array.isArray(selectedVideo.scenes) ? selectedVideo.scenes : [];
  const selectedVideoUrl = selectedVideo.url || selectedScenes[0]?.url || '';

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-lg relative h-[100%]">
      {showVideoLoader && (
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="bg-white shadow-2xl rounded-2xl px-8 py-9 text-center space-y-3">
            <div className="w-16 h-16 rounded-full border-4 border-[#D8D3FF] border-t-[#13008B] animate-spin mx-auto" />
            <div className="text-lg font-semibold text-[#13008B]">Generating Videos</div>
            {/* <div className="text-sm text-gray-600">
              {jobProgress.phase ? jobProgress.phase.toUpperCase() : 'PROCESSING'} • {Math.min(100, Math.max(0, Math.round(jobProgress.percent)))}%
            </div> */}
            <p className="text-xs text-gray-500">Please keep this tab open while we prepare your videos.</p>
          </div>
        </div>
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
      {/* <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-[#13008B]">Videos</h3>
        {onClose && (<button onClick={onClose} className="px-3 py-1.5 rounded-lg border text-sm">Back</button>)}
      </div> */}
      <div className="p-4 space-y-4">
        {/* Header with Generate Final Reel button */}
        <div className="flex items-center justify-between mb-4">
          <div></div>
          {items.length >= 2 && (
            <button
              onClick={handleGenerateFinalReel}
              disabled={isGenerating}
              className="px-6 py-2.5 rounded-lg bg-[#13008B] text-white text-sm font-semibold hover:bg-[#0f0069] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isGenerating ? 'Generating...' : 'Generate Final Reel'}
            </button>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-2">
            <div className="text-sm text-red-600">{error}</div>
          </div>
        )}

        {/* Top preview */}
        {selectedVideoUrl && (
          <div className="bg-white border rounded-xl p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2">
                <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
                  <video src={selectedVideoUrl} controls className="w-full h-full object-contain bg-black" />
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
        <div className="bg-white border rounded-xl p-4">
          <div className="text-base font-semibold mb-3">Available Videos</div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide items-start">
            {items.length === 0 && !isLoading && !error && (
              <div className="text-sm text-gray-600">No videos available yet.</div>
            )}
            {items.map((video, i) => (
              <React.Fragment key={video?.id || i}>
                <div className="min-w-[220px] w-[220px] flex-shrink-0 cursor-pointer" onClick={() => setSelectedIndex(i)}>
                  <div className={`rounded-xl border overflow-hidden ${selectedIndex === i ? 'ring-2 ring-[#13008B]' : ''}`}>
                    <div className="w-full h-32 bg-black">
                      <video src={video?.url || video?.scenes?.[0]?.url} className="w-full h-full object-cover" muted />
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-semibold">{video?.title || `Video ${i + 1}`}</div>
                  {video?.description ? (
                    <div className="mt-1 text-xs text-gray-600 line-clamp-2">{video.description}</div>
                  ) : null}
                </div>
                {/* Transition zone between videos */}
                {i < items.length - 1 && (
                  <div
                    className="relative flex-shrink-0 w-16 flex items-center justify-center py-4"
                    onMouseEnter={() => setHoveredTransitionIndex(i)}
                    onMouseLeave={() => {
                      // Only hide hover indicator if menu is not open
                      if (showTransitionMenu !== i) {
                        setHoveredTransitionIndex(null);
                      }
                    }}
                  >
                    {/* Hover indicator line */}
                    {hoveredTransitionIndex === i && (
                      <div className="absolute inset-0 flex items-center justify-center z-10 pointer-events-none">
                        <div className="w-0.5 h-full bg-[#13008B] rounded-full opacity-40"></div>
                      </div>
                    )}
                    {/* Transition button/indicator */}
                    <div className="relative z-20">
                      {(transitions[i] || hoveredTransitionIndex === i || showTransitionMenu === i) && (
                        <>
                          {transitions[i] ? (
                            <div
                              className="px-3 py-1.5 bg-[#13008B] text-white text-xs rounded-lg cursor-pointer hover:bg-[#0f0069] transition-all shadow-md"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowTransitionMenu(showTransitionMenu === i ? null : i);
                              }}
                              onMouseEnter={() => setHoveredTransitionIndex(i)}
                            >
                              {transitions[i]}
                            </div>
                          ) : (
                            <div
                              className="px-3 py-1.5 bg-gray-200 text-gray-600 text-xs rounded-lg cursor-pointer hover:bg-gray-300 transition-all flex items-center gap-1 shadow-sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setShowTransitionMenu(showTransitionMenu === i ? null : i);
                              }}
                              onMouseEnter={() => setHoveredTransitionIndex(i)}
                            >
                              <span className="font-semibold">+</span>
                              <span>Transition</span>
                            </div>
                          )}
                        </>
                      )}
                      {/* Transition menu dropdown */}
                      {showTransitionMenu === i && (
                        <div 
                          className="transition-menu-container absolute top-full left-1/2 transform -translate-x-1/2 mt-2 z-30 bg-white border rounded-lg shadow-xl p-2 max-h-64 overflow-y-auto min-w-[180px]"
                          onMouseEnter={() => setHoveredTransitionIndex(i)}
                          onMouseLeave={() => {
                            // Keep menu open when hovering over it
                          }}
                        >
                          <div className="text-xs font-semibold text-gray-700 mb-2 px-2">Select Transition</div>
                          <div className="space-y-1">
                            {Object.keys(TRANSITION_MAP).map((transitionKey) => (
                              <button
                                key={transitionKey}
                                className={`w-full text-left px-3 py-2 text-xs rounded hover:bg-gray-100 transition-colors ${
                                  transitions[i] === TRANSITION_MAP[transitionKey]
                                    ? 'bg-[#13008B] text-white hover:bg-[#0f0069]'
                                    : 'text-gray-700'
                                }`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransitions((prev) => ({
                                    ...prev,
                                    [i]: TRANSITION_MAP[transitionKey],
                                  }));
                                  setShowTransitionMenu(null);
                                  setHoveredTransitionIndex(null);
                                }}
                              >
                                {transitionKey}
                              </button>
                            ))}
                            {transitions[i] && (
                              <button
                                className="w-full text-left px-3 py-2 text-xs rounded hover:bg-red-50 text-red-600 transition-colors border-t border-gray-200 mt-1 pt-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setTransitions((prev) => {
                                    const newTransitions = { ...prev };
                                    delete newTransitions[i];
                                    return newTransitions;
                                  });
                                  setShowTransitionMenu(null);
                                  setHoveredTransitionIndex(null);
                                }}
                              >
                                Remove Transition
                              </button>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>

        
      </div>
    </div>
  );
};

export default VideosList;
