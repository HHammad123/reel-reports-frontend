import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Sidebar from '../Components/Sidebar';
import Topbar from '../Components/Topbar';
import { SlidersHorizontal } from 'lucide-react';
import { selectVideoJob, updateJobStatus, setJob } from '../redux/slices/videoJobSlice';

// Section expects an array of items: { id, url, created_at }

const Section = ({ title, items, onItemClick }) => {
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
        {items.map((item, i) => (
          <div key={i} className="relative group cursor-pointer" onClick={() => onItemClick && onItemClick(item)}>
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-black">
              {item?.thumb ? (
                <img src={item.thumb} alt={item.id || `media-${i}`} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 flex items-center justify-center text-white/70 text-sm">No preview</div>
              )}
            </div>
            <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-hover:ring-blue-500 pointer-events-none"></div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center">
                <div className="w-0 h-0 border-l-[10px] border-l-black border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
              </div>
            </div>
          </div>
        ))}
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

  // Initialize Redux job from localStorage if user hit this page via redirect
  useEffect(() => {
    try {
      if (!videoJob?.jobId) {
        const jid = localStorage.getItem('current_video_job_id');
        if (jid) dispatch(setJob({ jobId: jid, status: 'queued' }));
      }
    } catch (_) { /* noop */ }
  }, [videoJob?.jobId, dispatch]);

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
      const sessionResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data', {
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

  const data = useMemo(() => ({
    today: library.today || [],
    week: library.week || [],
    month: library.month || [],
    year: library.year || [],
    all: library.all || [],
  }), [library]);

  // Fetch user's videos and group by time buckets
  useEffect(() => {
    const fetchVideos = async () => {
      try {
        setIsLoadingLib(true); setLibError('');
        const user_id = localStorage.getItem('token') || '';
        const session_id = localStorage.getItem('session_id') || '';
        const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/users/videos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id, session_id })
        });
        const text = await resp.text();
        let json; try { json = JSON.parse(text); } catch (_) { json = text; }
        if (!resp.ok) throw new Error(`users/videos failed: ${resp.status} ${text}`);

        const content = json?.content || json || {};
        const videos = Array.isArray(content?.videos) ? content.videos : (Array.isArray(json?.videos) ? json.videos : []);
        const normalized = videos.map(v => ({
          id: v?.id || v?.video_id || v?.job_id || Math.random().toString(36).slice(2),
          url: v?.final_video_url || v?.result_url || '',
          thumb: v?.thumbnail_url || v?.thumb_url || v?.poster || v?.preview_image_url || '',
          created_at: v?.created_at || v?.updated_at || new Date().toISOString(),
        }));

        const now = new Date();
        const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const startOfWeek = (() => { const d = new Date(startOfDay); const day = d.getDay(); const diff = (day + 6) % 7; d.setDate(d.getDate() - diff); return d; })();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        const inRange = (ts, from) => (new Date(ts)).getTime() >= from.getTime();

        const today = normalized.filter(v => inRange(v.created_at, startOfDay));
        const week = normalized.filter(v => inRange(v.created_at, startOfWeek) && !inRange(v.created_at, startOfDay));
        const month = normalized.filter(v => inRange(v.created_at, startOfMonth) && !inRange(v.created_at, startOfWeek));
        const year = normalized.filter(v => inRange(v.created_at, startOfYear) && !inRange(v.created_at, startOfMonth));

        setLibrary({ today, week, month, year, all: normalized });
      } catch (e) {
        setLibError(e?.message || 'Failed to load media');
      } finally { setIsLoadingLib(false); }
    };
    fetchVideos();
  }, []);

  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
      <Sidebar />
      <div className="w-full mx-[2rem] mt-[1rem]">
        <Topbar />
        <div className="h-[85vh] my-2 overflow-y-auto scrollbar-hide">
          <div className="bg-white rounded-2xl p-5">
            <div className="flex items-center justify-end mb-4 gap-2">
              <div className="flex items-center gap-2 text-gray-700"><SlidersHorizontal className="w-4 h-4" /></div>
              <button onClick={() => setSortMode('type')} className={`px-3 py-1.5 rounded-md text-sm border ${sortMode==='type' ? 'bg-gray-100 border-gray-300' : 'border-gray-200 hover:bg-gray-50'}`}>Sort by File Type</button>
              <button onClick={() => setSortMode('timeline')} className={`px-3 py-1.5 rounded-md text-sm border ${sortMode==='timeline' ? 'bg-gray-100 border-gray-300' : 'border-gray-200 hover:bg-gray-50'}`}>Sort by Timeline</button>
              {/* Generate button moved to Home Videos section */}
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

            {isLoadingLib && (<div className="mb-4 text-sm text-gray-600">Loading your videos…</div>)}
            {libError && (<div className="mb-4 text-sm text-red-600">{libError}</div>)}
            {data.today.length > 0 && (<Section title="Today" items={data.today} onItemClick={(it)=>navigate(`/result/${encodeURIComponent(it.id)}`)} />)}
            {data.week.length > 0 && (<Section title="This Week" items={data.week} onItemClick={(it)=>navigate(`/result/${encodeURIComponent(it.id)}`)} />)}
            {data.month.length > 0 && (<Section title="This Month" items={data.month} onItemClick={(it)=>navigate(`/result/${encodeURIComponent(it.id)}`)} />)}
            {data.year.length > 0 && (<Section title="This Year" items={data.year} onItemClick={(it)=>navigate(`/result/${encodeURIComponent(it.id)}`)} />)}
            {data.all.length > 0 && (<Section title="All Videos" items={data.all} onItemClick={(it)=>navigate(`/result/${encodeURIComponent(it.id)}`)} />)}
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
