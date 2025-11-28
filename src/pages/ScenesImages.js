import React, { useEffect, useState } from 'react';
import Sidebar from '../Components/Sidebar';
import Topbar from '../Components/Topbar';

const SceneCard = ({ scene }) => {
  const imgs = Array.isArray(scene?.ref_image) ? scene.ref_image : [];
  const texts = Array.isArray(scene?.text_to_be_included) ? scene.text_to_be_included : [];
  return (
    <div className="border rounded-xl p-4 bg-white">
      <div className="flex items-start justify-between">
        <div>
          <div className="text-sm text-gray-500">Scene {scene?.scene_number}</div>
          <div className="text-lg font-semibold">{scene?.scene_title || 'Untitled'}</div>
          <div className="text-xs text-gray-500 mt-1">{scene?.timeline || ''}</div>
        </div>
        <div className="text-xs px-2 py-1 rounded bg-gray-100 border">{scene?.model || scene?.mode || ''}</div>
      </div>
      <div className="mt-3 text-sm text-gray-800 whitespace-pre-wrap">{scene?.desc || scene?.description || ''}</div>
      {texts.length > 0 && (
        <div className="mt-2 text-sm text-gray-700"><span className="font-semibold">Include:</span> {texts.join(', ')}</div>
      )}
      <div className="mt-4 grid grid-cols-3 gap-3">
        {imgs.length === 0 && (
          <div className="col-span-3 text-sm text-gray-500">No images yet for this scene.</div>
        )}
        {imgs.slice(0, 6).map((u, i) => (
          <div key={i} className="w-full aspect-video rounded-lg border overflow-hidden bg-black">
            <img src={u} alt={`scene-${scene?.scene_number}-${i}`} className="w-full h-full object-cover" />
          </div>
        ))}
      </div>
    </div>
  );
};

const ScenesImages = () => {
  const [rows, setRows] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let pollTimer = null;
    const loadSessionImages = async () => {
      try {
        const token = localStorage.getItem('token');
        const sessionId = localStorage.getItem('session_id');
        if (!token || !sessionId) return false;
        const r = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
        });
        const t = await r.text();
        let j; try { j = JSON.parse(t); } catch(_) { j = {}; }
        const sd = j?.session_data || j?.session || {};
        const images = Array.isArray(sd?.images) ? sd.images : [];
        if (images.length > 0) {
          setRows(images.map((u, i) => ({ scene_number: i+1, scene_title: '', timeline: '', model: '', description: '', desc: '', text_to_be_included: [], ref_image: [u] })));
          return true;
        }
        return false;
      } catch(_) { return false; }
    };
    const start = async () => {
      try {
        setIsLoading(true); setError('');
        const jobId = localStorage.getItem('current_images_job_id');
        if (!jobId) { setIsLoading(false); return; }
        // initial attempt to show any existing images
        const hasAny = await loadSessionImages();
        const pendingFlag = localStorage.getItem('images_generate_pending') === 'true';
        // poll status until succeeded only if generation was just initiated and no images yet
        pollTimer = setInterval(async () => {
          try {
            const r = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/job-status/${encodeURIComponent(jobId)}`);
            const tx = await r.text();
            let d; try { d = JSON.parse(tx); } catch(_) { d = {}; }
            const status = (d?.status || d?.job_status || '').toLowerCase();
            if (status === 'succeeded' || status === 'success' || status === 'completed') {
              clearInterval(pollTimer);
              pollTimer = null;
              await loadSessionImages();
              setIsLoading(false);
              try { localStorage.removeItem('images_generate_pending'); } catch(_){}
            }
          } catch(_) { /* continue polling */ }
        }, 3000);
      } catch (e) { setError(e?.message || 'Failed to load images'); setIsLoading(false); }
    };
    start();
    return () => { if (pollTimer) clearInterval(pollTimer); };
  }, []);

  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
      <Sidebar />
      <div className="flex-1 mx-[2rem] mt-[1rem] min-w-0">
        <Topbar />
        <div className='h-[87vh] rounded-lg overflow-y-auto scrollbar-hide my-2 p-4'>
          <div className="mb-4">
            <h2 className="text-2xl font-semibold text-gray-900">Scenes • Images</h2>
            <p className="text-sm text-gray-600">Review generated images per scene. Chat area is hidden here.</p>
          </div>
          {isLoading && (<div className="text-sm text-gray-600">Loading images…</div>)}
          {error && (<div className="text-sm text-red-600">{error}</div>)}
          <div className="grid grid-cols-1 gap-4 mt-2">
            {Array.isArray(rows) && rows.length > 0 ? rows.map((r, i) => (
              <SceneCard key={i} scene={r} />
            )) : (
              <div className="text-sm text-gray-600">No scenes available. Go back and generate scenes.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ScenesImages;
