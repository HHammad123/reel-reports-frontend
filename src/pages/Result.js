import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setJob } from '../redux/slices/videoJobSlice'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import Resultarea from '../Components/Result/Resultarea'
import Scencearea from '../Components/Result/Scencearea'

const Result = () => {
  const navigate = useNavigate()
  useEffect(() => {
    if (localStorage.getItem('auth') === 'false') {
      navigate('/login')
    }
  }, [localStorage.getItem('auth')])

  const { videoId } = useParams();
  const dispatch = useDispatch();
  const [resultvideo, setResultVideo] = useState('');
  const [scenes, setScenes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // Transitions UI state
  const [showTransModal, setShowTransModal] = useState(false);
  const [transRows, setTransRows] = useState([]); // one entry per consecutive pair
  const [showShortPopup, setShowShortPopup] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setIsLoading(true); setError('');
        const token = localStorage.getItem('token') || '';
        if (videoId) {
          const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/users/videos/get', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, video_id: videoId })
          });
          const text = await resp.text();
          let data; try { data = JSON.parse(text); } catch (_) { data = text; }
          if (!resp.ok) throw new Error(`users/videos/get failed: ${resp.status} ${text}`);
          const v = data?.video || {};
          console.log(data?.final_link)
          // Use final_link for the main top video per new requirement
          setResultVideo(data?.final_link || data?.v?.finalVideoUrl || data?.v?.final_video_url || data?.v?.result_url || '');
          setScenes(Array.isArray(v?.scenes) ? v.scenes : []);
          return;
        }
        // Fallback to local storage legacy
        const jobResult = localStorage.getItem('job_result');
        if (jobResult) {
          const jobResultData = JSON.parse(jobResult);
          setResultVideo(jobResultData?.result_url || '');
          setScenes(jobResultData?.scenes || []);
        }
      } catch (e) { setError(e?.message || 'Failed to load video'); }
      finally { setIsLoading(false); }
    };
    fetchVideo();
  }, [videoId]);

  // Initialize default transitions when scenes load/change
  useEffect(() => {
    const count = Array.isArray(scenes) ? Math.max(0, scenes.length - 1) : 0;
    setTransRows(Array.from({ length: count }, () => ({ type: 'fade', duration: '1.0' })));
  }, [scenes]);

  const transitionOptions = [
    'fade','fadeblack','fadewhite',
    'slideleft','slideright','slideup','slidedown',
    'circleopen','circleclose',
    'wipeleft','wiperight','wipeup','wipedown',
    'pixelize','dissolve'
  ];

  const handleSaveTransitions = async () => {
    try {
      const token = localStorage.getItem('token');
      const sessionId = localStorage.getItem('session_id');
      if (!token || !sessionId) throw new Error('Missing user token or session_id');

      // Get full session structure to send back
      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessionText = await sessionResp.text();
      let sessionData; try { sessionData = JSON.parse(sessionText); } catch (_) { sessionData = sessionText; }
      if (!sessionResp.ok) throw new Error(`user-session/data failed: ${sessionResp.status} ${sessionText}`);
      const sd = sessionData?.session_data || {};
      const sessionForBody = {
        id: sessionId,
        user_id: token,
        created_at: sd.created_at,
        updated_at: sd.updated_at,
        content: sd.content || [],
        summarydocument: sd.summarydocument || [],
        videoduration: (sd.video_duration?.toString?.() || '60'),
        totalsummary: sd.total_summary || [],
        messages: sd.messages || [],
        scripts: Array.isArray(sd.scripts) ? sd.scripts : [],
        videos: sd.videos || [],
      };

      // Build transitions payload for each consecutive pair
      const transitions = [];
      for (let i = 0; i < Math.max(0, scenes.length - 1); i++) {
        const fromScene = scenes?.[i]?.scene_number ?? (i + 1);
        const toScene = scenes?.[i + 1]?.scene_number ?? (i + 2);
        const row = transRows?.[i] || { type: 'fade', duration: '1.0' };
        transitions.push({ from_scene: fromScene, to_scene: toScene, type: row.type, duration: row.duration });
      }

      const body = { session: sessionForBody, transitions, output_filename: 'final_merged_video.mp4' };
      const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/videos/remerge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`videos/remerge failed: ${resp.status} ${text}`);

      const jobId = data?.job_id || data?.jobId || data?.id;
      let statusUrl = data?.status_url || null;
      try {
        if (statusUrl) {
          const u = new URL(statusUrl);
          if (u.protocol === 'http:') u.protocol = 'https:';
          if (!u.pathname.endsWith('/')) u.pathname += '/';
          statusUrl = u.toString();
        }
      } catch (_) { /* keep raw */ }
      const status = data?.status || 'queued';
      if (jobId) {
        try { localStorage.setItem('current_video_job_id', jobId); } catch (_) { /* noop */ }
        try { if (statusUrl) localStorage.setItem('current_video_job_status_url', statusUrl); } catch (_) { /* noop */ }
        try { dispatch(setJob({ jobId, status, statusUrl })); } catch (_) { /* noop */ }
      }

      // Show 5s popup then redirect to media
      setShowTransModal(false);
      setShowShortPopup(true);
      setTimeout(() => {
        setShowShortPopup(false);
        try { window.location && (window.location.href = '/media'); } catch (_) { /* noop */ }
      }, 10000);
    } catch (e) {
      setError(e?.message || 'Failed to submit transitions');
    }
  };
  
  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
      <Sidebar/>
      <div className="flex-1 mx-[2rem] mt-[1rem] min-w-0">
        <Topbar/>
        <div className='h-[85vh] my-2 overflow-y-auto scrollbar-hide space-y-3 pr-1'>
          {isLoading && (<div className='p-4 text-gray-600'>Loading video…</div>)}
          {error && (<div className='p-4 text-red-600'>{error}</div>)}
          {!isLoading && !error && (<Resultarea resultvideo={resultvideo} />)}
          {!isLoading && !error && (
            <div className='relative'>
              <div className='flex items-center justify-between px-2'>
                <h3 className='text-[18px] font-semibold text-gray-900'>Scene by Scene</h3>
                <button onClick={()=>setShowTransModal(true)} className='px-3 py-1.5 text-sm rounded-lg bg-[#13008B] text-white hover:bg-blue-800'>Edit Transitions</button>
              </div>
              <Scencearea scenes={scenes} />
            </div>
          )}
        </div>
        {showTransModal && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
            <div className='bg-white w-[95%] max-w-5xl rounded-lg shadow-xl p-5'>
              <div className='flex items-center justify-between mb-4'>
                <h3 className='text-xl font-semibold text-gray-900'>Choose your transition:</h3>
                <button onClick={()=>setShowTransModal(false)} className='text-white w-8 h-8 hover:text-[#13008B] hover:bg-[#e4e0ff] transition-all duration-300 bg-[#13008B] rounded-full'>✕</button>
              </div>
              <div className='space-y-5 max-h-[65vh] overflow-y-auto pr-1'>
                {Array.isArray(scenes) && scenes.length > 1 ? (
                  scenes.slice(0, scenes.length - 1).map((s, i) => {
                    const from = scenes[i];
                    const to = scenes[i + 1];
                    const fromThumb = Array.isArray(from?.ref_image) && from.ref_image[0];
                    const toThumb = Array.isArray(to?.ref_image) && to.ref_image[0];
                    const row = transRows?.[i] || { type: 'fade', duration: '1.0' };
                    return (
                      <div key={i} className='grid grid-cols-1 md:grid-cols-3 gap-4 items-center'>
                        {/* From Scene */}
                        <div>
                          <div className='text-sm font-medium text-gray-700 mb-2'>From Scene {from?.scene_number ?? (i + 1)}</div>
                          <div className='relative rounded-lg border overflow-hidden border-gray-300'>
                            {fromThumb ? (
                              <img src={fromThumb} alt={`Scene ${from?.scene_number ?? (i + 1)}`} className='w-full h-28 object-cover' />
                            ) : (
                              <div className='w-full h-28 bg-black text-white/70 text-xs flex items-center justify-center'>Scene {from?.scene_number ?? (i + 1)}</div>
                            )}
                          </div>
                        </div>

                        {/* Transition controls */}
                        <div className='md:px-3'>
                          <label className='block text-sm font-medium text-gray-700 mb-1'>Select Transition</label>
                          <select
                            value={row.type}
                            onChange={(e)=>{
                              const val = e.target.value; setTransRows(prev => {
                                const next = [...(prev||[])]; next[i] = { ...(next[i]||{ duration: '1.0' }), type: val }; return next;
                              });
                            }}
                            className='w-full border rounded px-3 py-2'
                          >
                            {transitionOptions.map(t => (<option key={t} value={t}>{t}</option>))}
                          </select>
                          <label className='block text-sm font-medium text-gray-700 mt-3 mb-1'>Duration (s)</label>
                          <input
                            value={row.duration}
                            onChange={(e)=>{
                              const val = e.target.value; setTransRows(prev => {
                                const next = [...(prev||[])]; next[i] = { ...(next[i]||{ type: 'fade' }), duration: val }; return next;
                              });
                            }}
                            className='w-full border rounded px-3 py-2'
                          />
                        </div>

                        {/* To Scene */}
                        <div>
                          <div className='text-sm font-medium text-gray-700 mb-2'>To Scene {to?.scene_number ?? (i + 2)}</div>
                          <div className='relative rounded-lg border overflow-hidden border-gray-300'>
                            {toThumb ? (
                              <img src={toThumb} alt={`Scene ${to?.scene_number ?? (i + 2)}`} className='w-full h-28 object-cover' />
                            ) : (
                              <div className='w-full h-28 bg-black text-white/70 text-xs flex items-center justify-center'>Scene {to?.scene_number ?? (i + 2)}</div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })
                ) : (
                  <div className='text-sm text-gray-600'>Not enough scenes to add transitions.</div>
                )}
              </div>
              <div className='flex items-center justify-end gap-2 mt-5'>
                <button onClick={()=>setShowTransModal(false)} className='px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200'>Cancel</button>
                <button onClick={handleSaveTransitions} className='px-4 py-2 rounded-lg text-sm font-medium bg-[#13008B] text-white hover:bg-blue-800'>Save</button>
              </div>
            </div>
          </div>
        )}

        {showShortPopup && (
          <div className='fixed inset-0 z-50 flex items-center justify-center bg-black/50'>
            <div className='bg-white w-[100%] max-w-sm rounded-lg shadow-xl p-6 text-center'>
              <div className='mx-auto mb-4 w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin' />
              <h4 className='text-lg font-semibold text-gray-900'>Merging with transitions…</h4>
              <p className='mt-1 text-sm text-gray-600'>Please wait while we process your video.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default Result
