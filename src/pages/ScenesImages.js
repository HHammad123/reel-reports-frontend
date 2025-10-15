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
    const load = async () => {
      try {
        setIsLoading(true); setError('');
        const jobId = localStorage.getItem('current_images_job_id');
        if (jobId) {
          const resp = await fetch(`https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/jobs/images/${encodeURIComponent(jobId)}`);
          const text = await resp.text();
          let data; try { data = JSON.parse(text); } catch (_) { data = text; }
          if (!resp.ok) throw new Error(`jobs/images failed: ${resp.status} ${text}`);
          // Response shape may be array; normalize scenes
          const container = Array.isArray(data) ? data[0] : data;
          const scenes = Array.isArray(container?.scenes) ? container.scenes : [];
          // Map to row format for display
          const mapped = scenes.map((s) => ({
            scene_number: s?.scene_number,
            scene_title: s?.scene_title,
            timeline: '',
            model: '',
            description: '',
            desc: '',
            text_to_be_included: Array.isArray(s?.approved_texts) ? s.approved_texts : [],
            ref_image: [s?.image_1_url, s?.image_2_url].filter(Boolean),
          }));
          setRows(mapped);
          return;
        }
        // Fallback to any previously stored scenes list
        const raw = localStorage.getItem('scenes_images_source');
        if (raw) {
          const data = JSON.parse(raw);
          const arr = Array.isArray(data?.script) ? data.script : (Array.isArray(data) ? data : []);
          setRows(arr);
        }
      } catch (e) { setError(e?.message || 'Failed to load images'); }
      finally { setIsLoading(false); }
    };
    load();
  }, []);

  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
      <Sidebar />
      <div className="w-full mx-[2rem] mt-[1rem]">
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
