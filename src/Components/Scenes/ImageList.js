import React, { useEffect, useState } from 'react';

const ImageList = ({ jobId, onClose, onGenerateVideos, hasVideos = false, onGoToVideos }) => {
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState({ index: 0, imageUrl: '', images: [], title: '', sceneNumber: '', description: '', narration: '', textToBeIncluded: '' });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    const mapSessionImages = (imagesRoot) => {
      let mapped = [];
      const pushRow = (num, title, refs, meta = {}) => {
        const clean = Array.from(new Set((refs || []).filter(Boolean)));
        if (clean.length > 0) mapped.push({ scene_number: num, scene_title: title || 'Untitled', refs: clean, ...meta });
      };
      if (!imagesRoot) return mapped;
      if (Array.isArray(imagesRoot)) {
        if (imagesRoot.every(it => typeof it === 'string')) {
          pushRow('-', 'Images', imagesRoot);
        } else {
          imagesRoot.forEach((it, idx) => {
            if (Array.isArray(it?.scenes)) {
              it.scenes.forEach((sc, j) => {
                const refs = [];
                if (sc?.image_url) refs.push(sc.image_url);
                if (sc?.image_1_url) refs.push(sc.image_1_url);
                if (sc?.image_2_url) refs.push(sc.image_2_url);
                if (Array.isArray(sc?.refs)) refs.push(...sc.refs);
                if (Array.isArray(sc?.urls)) refs.push(...sc.urls);
                const meta = {
                  description: sc?.desc || sc?.description || sc?.scene_description || '',
                  narration: sc?.narration || sc?.voiceover || '',
                  textToBeIncluded: sc?.text_to_be_included || sc?.textToBeIncluded || sc?.include_text || ''
                };
                pushRow(sc?.scene_number ?? (j + 1), sc?.scene_title || sc?.title, refs, meta);
              });
            } else {
              const refs = [];
              if (it?.image_url) refs.push(it.image_url);
              if (it?.image_1_url) refs.push(it.image_1_url);
              if (it?.image_2_url) refs.push(it.image_2_url);
              if (Array.isArray(it?.refs)) refs.push(...it.refs);
              if (Array.isArray(it?.urls)) refs.push(...it.urls);
              if (typeof it === 'string') refs.push(it);
              const meta = {
                description: it?.desc || it?.description || it?.scene_description || '',
                narration: it?.narration || it?.voiceover || '',
                textToBeIncluded: it?.text_to_be_included || it?.textToBeIncluded || it?.include_text || ''
              };
              pushRow(it?.scene_number ?? (idx + 1), it?.scene_title || it?.title, refs, meta);
            }
          });
        }
      } else if (Array.isArray(imagesRoot?.scenes)) {
        imagesRoot.scenes.forEach((sc, j) => {
          const refs = [];
          if (sc?.image_url) refs.push(sc.image_url);
          if (sc?.image_1_url) refs.push(sc.image_1_url);
          if (sc?.image_2_url) refs.push(sc.image_2_url);
          if (Array.isArray(sc?.refs)) refs.push(...sc.refs);
          if (Array.isArray(sc?.urls)) refs.push(...sc.urls);
          const meta = {
            description: sc?.desc || sc?.description || sc?.scene_description || '',
            narration: sc?.narration || sc?.voiceover || '',
            textToBeIncluded: sc?.text_to_be_included || sc?.textToBeIncluded || sc?.include_text || ''
          };
          pushRow(sc?.scene_number ?? (j + 1), sc?.scene_title || sc?.title, refs, meta);
        });
      }
      return mapped;
    };

    const isJobDone = (container) => {
      try {
        const status = String(container?.status || '').toLowerCase();
        if (status === 'succeeded') return true;
        const total = Number(container?.total_scenes ?? 0);
        const completed = Number(container?.completed_scenes ?? 0);
        if (total > 0 && completed >= total) return true;
        const arr = Array.isArray(container?.image_results) ? container.image_results
                  : (Array.isArray(container?.scenes) ? container.scenes : []);
        if (Array.isArray(container?.image_urls) && container.image_urls.length > 0) return true;
        if (arr.length === 0) return false;
        return arr.every(s => (String(s?.processing_status || '').toLowerCase() === 'completed') && (s?.image_url || s?.image_1_url || s?.image_2_url));
      } catch (_) { return false; }
    };

    const load = async () => {
      try {
        if (!rows || rows.length === 0) setIsLoading(true);
        setError('');
        const session_id = localStorage.getItem('session_id');
        const user_id = localStorage.getItem('token');
        if (!session_id || !user_id) { setError('Missing session or user'); setIsLoading(false); return; }
        // First try session data
        const sresp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id, session_id })
        });
        const stext = await sresp.text();
        let sdata; try { sdata = JSON.parse(stext); } catch (_) { sdata = stext; }
        if (!sresp.ok) throw new Error(`user-session/data failed: ${sresp.status} ${stext}`);
        const sessionImages = mapSessionImages(sdata?.session_data?.images);
        if (!cancelled && sessionImages.length > 0) {
          setRows(sessionImages);
          const refs0 = Array.isArray(sessionImages[0]?.refs) ? sessionImages[0].refs : [];
          const first = refs0[0] || '';
          setSelected({ index: 0, imageUrl: first, images: refs0.slice(0,2), title: sessionImages[0]?.scene_title || 'Untitled', sceneNumber: sessionImages[0]?.scene_number ?? '', description: sessionImages[0]?.description || '', narration: sessionImages[0]?.narration || '', textToBeIncluded: sessionImages[0]?.textToBeIncluded || '' });
        }
        // If we have a jobId and either no session images yet or we expect generation, poll job API until done
        const shouldPollJob = !!(jobId || localStorage.getItem('current_images_job_id')) && sessionImages.length === 0;
        if (!shouldPollJob) { setIsLoading(false); return; }

        const id = jobId || localStorage.getItem('current_images_job_id');
        if (!id) { setIsLoading(false); return; }

        const poll = async () => {
          try {
            const resp = await fetch(`https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/jobs/images/${encodeURIComponent(id)}`);
            const text = await resp.text();
            let data; try { data = JSON.parse(text); } catch (_) { data = text; }
            if (!resp.ok) throw new Error(`jobs/images failed: ${resp.status} ${text}`);
            const container = Array.isArray(data) ? data[0] : data;
            const arr = Array.isArray(container?.image_results) ? container.image_results
                      : (Array.isArray(container?.scenes) ? container.scenes : []);
            let mapped = [];
            if (arr.length > 0) {
              mapped = arr.map((s) => ({
                scene_number: s?.scene_number,
                scene_title: s?.scene_title,
                refs: [s?.image_url, s?.image_1_url, s?.image_2_url].filter(Boolean)
              }));
            } else if (Array.isArray(container?.image_urls)) {
              const refs = container.image_urls.filter(Boolean);
              if (refs.length > 0) {
                mapped = [{ scene_number: '-', scene_title: 'Images', refs }];
              }
            }
            if (!cancelled) {
              setRows(mapped);
              if (mapped.length > 0) {
                const refs0 = Array.isArray(mapped[0]?.refs) ? mapped[0].refs : [];
                const first = refs0[0] || '';
                setSelected({ index: 0, imageUrl: first, images: refs0.slice(0,2), title: mapped[0]?.scene_title || 'Untitled', sceneNumber: mapped[0]?.scene_number ?? '', description: '', narration: '', textToBeIncluded: '' });
              }
            }
            if (!cancelled && !isJobDone(container)) {
              timeoutId = setTimeout(poll, 3000);
            } else {
              setIsLoading(false);
            }
          } catch (e) {
            if (!cancelled) setError(e?.message || 'Failed to load images');
            setIsLoading(false);
          }
        };
        poll();
      } catch (e) {
        if (!cancelled) setError(e?.message || 'Failed to load images');
      } finally {
        if (!cancelled) {
          // Do not force isLoading false here; polling may continue
        }
      }
    };

    load();
    return () => { cancelled = true; if (timeoutId) clearTimeout(timeoutId); };
  }, [jobId]);

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-lg">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-[#13008B]">Scenes • Images</h3>
        <div className="flex items-center gap-2">
          {hasVideos ? (
            <button
              onClick={() => { if (typeof onGoToVideos === 'function') onGoToVideos(); }}
              className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800"
            >
              Go to Videos
            </button>
          ) : (
            <button
              onClick={() => {
                try {
                  if (typeof onGenerateVideos === 'function') {
                    const images = rows.flatMap(r => Array.isArray(r?.refs) ? r.refs : []);
                    onGenerateVideos(images);
                  }
                } catch (_) { /* noop */ }
              }}
              className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800"
            >
              Generate Videos
            </button>
          )}
          {onClose && (<button onClick={onClose} className="px-3 py-1.5 rounded-lg border text-sm">Back to Chat</button>)}
        </div>
      </div>

      <div className="p-4 space-y-4 overflow-y-auto overflow-x-hidden">
        {isLoading && (<div className="text-sm text-gray-600">Loading images…</div>)}
        {error && (<div className="text-sm text-red-600 mb-2">{error}</div>)}

        {selected?.imageUrl && (
          <div className="bg-white border rounded-xl p-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
              <div className="lg:col-span-2 min-w-0">
                <div className="w-full rounded-xl overflow-hidden">
                  <div className={`grid ${Array.isArray(selected.images) && selected.images.length > 1 ? 'grid-cols-2' : 'grid-cols-1'} gap-2`}>
                    {(selected.images && selected.images.length > 0 ? selected.images.slice(0,2) : [selected.imageUrl]).map((img, idx) => (
                      <div key={idx} className="w-full aspect-video bg-black rounded-lg overflow-hidden">
                        {img ? (
                          <img src={img} alt={`selected-${idx}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div className="mt-3">
                  <label className="text-sm text-gray-600">Narration</label>
                  <div className="mt-1 flex items-start gap-2">
                    <textarea className="flex-1 min-h-[140px] border rounded-lg px-3 py-2 text-sm" placeholder="Narration" readOnly value={selected?.narration || ''} />
                    <button className="px-4 h-10 rounded-lg bg-[#13008B] text-white text-sm self-start">Edit</button>
                  </div>
                </div>
              </div>
              <div className="space-y-4 min-w-0">
                <div>
                  <label className="text-sm text-gray-600">Description of the Video</label>
                  <textarea className="w-full h-32 border rounded-lg px-3 py-2 text-sm" value={selected?.description || ''} readOnly />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Text to be Included</label>
                  <textarea className="w-full h-32 border rounded-lg px-3 py-2 text-sm" readOnly value={selected?.textToBeIncluded || ''} />
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="bg-white border rounded-xl p-4">
          <div className="text-base font-semibold mb-3">Scene By Scene Image Selection</div>
          <div className="flex gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide">
            {rows.length === 0 && !isLoading && !error && (
              <div className="text-sm text-gray-600">No images available yet.</div>
            )}
            {rows.map((r, i) => {
              const first = (r.refs || [])[0];
              const second = (r.refs || [])[1];
              return (
                <div
                  key={i}
                  className={`min-w-[300px] w-[300px] max-w-full cursor-pointer`}
                  onClick={() => setSelected({ index: i, imageUrl: first || '', images: (r.refs || []).slice(0,2), title: r.scene_title || 'Untitled', sceneNumber: r.scene_number, description: r?.description || '', narration: r?.narration || '', textToBeIncluded: r?.textToBeIncluded || '' })}
                >
                  <div className={`rounded-xl border overflow-hidden ${selected.index === i ? 'ring-2 ring-[#13008B]' : ''}`}>
                    <div className="grid grid-cols-2 gap-0 w-full h-40 bg-black">
                      <div className="w-full h-full bg-black">
                        {first ? (
                          <img src={first} alt={`scene-${r.scene_number}-1`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
                        )}
                      </div>
                      <div className="w-full h-full bg-black">
                        {second ? (
                          <img src={second} alt={`scene-${r.scene_number}-2`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 text-sm font-semibold">Scene {r.scene_number} • {r.scene_title || 'Untitled'}</div>
                  {r?.description ? (
                    <div className="mt-1 text-xs text-gray-600 line-clamp-2">{r.description}</div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageList;
