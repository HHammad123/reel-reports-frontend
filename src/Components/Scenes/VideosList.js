import React, { useEffect, useState } from 'react';

const VideosList = ({ jobId, onClose }) => {
  const [items, setItems] = useState([]); // array of { url, description, narration }
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('queued');
  const [selectedIndex, setSelectedIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    const load = async () => {
      try {
        setIsLoading(true); setError('');
        const session_id = localStorage.getItem('session_id');
        const user_id = localStorage.getItem('token');
        if (!session_id || !user_id) { setError('Missing session or user'); setIsLoading(false); return; }
        // First read from session
        const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id, session_id })
        });
        const text = await resp.text();
        let data; try { data = JSON.parse(text); } catch (_) { data = text; }
        if (!resp.ok) throw new Error(`user-session/data failed: ${resp.status} ${text}`);
        const sdata = data?.session_data || {};
        const scenesFromSession = [];
        const videos = Array.isArray(sdata?.videos) ? sdata.videos : [];
        videos.forEach(vobj => {
          const scenes = Array.isArray(vobj?.scenes) ? vobj.scenes : [];
          scenes.forEach(sc => {
            const u = sc?.blobLink?.video_link;
            if (typeof u === 'string' && u) {
              scenesFromSession.push({
                url: u,
                description: sc?.desc || sc?.description || sc?.scene_description || '',
                narration: sc?.narration || sc?.voiceover || ''
              });
            }
          });
        });
        if (!cancelled) {
          setItems(scenesFromSession);
          setStatus(scenesFromSession.length > 0 ? 'succeeded' : 'queued');
        }

        // If we have a jobId and no session videos yet, poll job API until succeeded
        const id = jobId || localStorage.getItem('current_video_job_id');
        const shouldPollJob = !!id && scenesFromSession.length === 0;
        if (!shouldPollJob) { setIsLoading(false); return; }

        const poll = async () => {
          try {
            const jresp = await fetch(`https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/jobs/${encodeURIComponent(id)}`);
            const jtext = await jresp.text();
            let jdata; try { jdata = JSON.parse(jtext); } catch (_) { jdata = jtext; }
            if (!jresp.ok) throw new Error(`jobs status failed: ${jresp.status} ${jtext}`);
            const s = String(jdata?.status || '').toLowerCase();
            if (!cancelled) setStatus(s);
            const scenes = Array.isArray(jdata?.scenes) ? jdata.scenes : [];
            const mapped = [];
            scenes.forEach(sc => {
              const v = sc?.blobLink?.video_link;
              if (typeof v === 'string' && v) mapped.push({ url: v, description: '', narration: '' });
            });
            if (!cancelled) setItems(mapped);
            if (!cancelled && s !== 'succeeded') {
              timeoutId = setTimeout(poll, 3000);
            } else {
              setIsLoading(false);
            }
          } catch (e) {
            if (!cancelled) setError(e?.message || 'Failed to load video job');
            setIsLoading(false);
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-[#13008B]">Videos</h3>
        {onClose && (<button onClick={onClose} className="px-3 py-1.5 rounded-lg border text-sm">Back</button>)}
      </div>
      <div className="p-4 space-y-4">
        <div className="mb-2 text-sm text-gray-600">Status: {status}</div>
        {isLoading && (<div className="text-sm text-gray-600">Loading…</div>)}
        {error && (<div className="text-sm text-red-600 mb-2">{error}</div>)}

        {/* Top preview */}
        {items[selectedIndex] && (
          <div className="bg-white border rounded-xl p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2">
                <div className="w-full aspect-video bg-black rounded-xl overflow-hidden">
                  <video src={items[selectedIndex]?.url} controls className="w-full h-full object-contain bg-black" />
                </div>
                <div className="mt-3">
                  <label className="text-sm text-gray-600">Narration</label>
                  <div className="mt-1 flex items-start gap-2">
                    <textarea className="flex-1 min-h-[140px] border rounded-lg px-3 py-2 text-sm" placeholder="Narration" readOnly value={items[selectedIndex]?.narration || ''} />
                    <button className="px-4 h-10 rounded-lg bg-[#13008B] text-white text-sm self-start">Edit</button>
                  </div>
                </div>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-600">Description of the Video</label>
                  <textarea className="w-full h-32 border rounded-lg px-3 py-2 text-sm" readOnly value={items[selectedIndex]?.description || ''} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Text to be Included</label>
                  <textarea className="w-full h-32 border rounded-lg px-3 py-2 text-sm" readOnly />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Strip */}
        <div className="bg-white border rounded-xl p-4">
          <div className="text-base font-semibold mb-3">Scene By Scene Video Generation</div>
          <div className="flex gap-4 overflow-x-auto scrollbar-hide">
            {items.length === 0 && !isLoading && !error && (
              <div className="text-sm text-gray-600">No videos available yet.</div>
            )}
            {items.map((scene, i) => (
              <div key={i} className="min-w-[260px] w-[260px] cursor-pointer" onClick={() => setSelectedIndex(i)}>
                <div className={`rounded-xl border overflow-hidden ${selectedIndex === i ? 'ring-2 ring-[#13008B]' : ''}`}>
                  <div className="w-full h-40 bg-black">
                    <video src={scene?.url} className="w-full h-full object-cover" muted />
                  </div>
                </div>
                <div className="mt-2 text-sm font-semibold">Scene {i + 1}</div>
                {scene?.description ? (
                  <div className="mt-1 text-xs text-gray-600 line-clamp-2">{scene.description}</div>
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideosList;
