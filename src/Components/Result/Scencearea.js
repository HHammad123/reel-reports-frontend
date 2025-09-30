import React, { useState, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'
import { FaPlay } from 'react-icons/fa'
// Horizontal scroller with 4 cards visible; extra cards scroll horizontally

const SCENES = [
  {
    id: 1,
    label: 'Scene 1',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 2,
    label: 'Scene 2',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 3,
    label: 'Scene 3',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 4,
    label: 'Scene 4',
    image:
      'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 5,
    label: 'Scene 5',
    image:
      'https://images.unsplash.com/photo-1529078155058-5d716f45d604?q=80&w=1600&auto=format&fit=crop'
  }
]

const Scencearea = ({scenes}) => {
  const [menuFor, setMenuFor] = useState(null) // slide index
  const closeMenu = () => setMenuFor(null)
  const [transitionMenuFor, setTransitionMenuFor] = useState(null) // between index
  console.log('scenes', scenes);
  const scenevideos = scenes?.map((scene) => scene?.blobLink?.videoLink);
  console.log('scenevideos', scenevideos);
  const [aspectRatios, setAspectRatios] = useState({});
  const [hoverIndex, setHoverIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

  // Keep local edit value in sync when a new scene is selected to edit
  useEffect(() => {
    if (editingIndex == null) return;
    try {
      const s = Array.isArray(scenes) ? scenes[editingIndex] : null;
      const d = s?.description || s?.desc || s?.scene_title || s?.title || '';
      setEditValue(d || '');
    } catch (_) { setEditValue(''); }
  }, [editingIndex, scenes]);
  const onMeta = (idx, e) => {
    try {
      const v = e.currentTarget;
      const w = v.videoWidth || 0;
      const h = v.videoHeight || 0;
      if (w > 0 && h > 0) {
        setAspectRatios(prev => ({ ...prev, [idx]: `${w} / ${h}` }));
      }
    } catch (_) { /* noop */ }
  };

  const getSceneText = (idx) => {
    try {
      const s = Array.isArray(scenes) ? scenes[idx] : null;
      const d = s?.description || s?.desc || s?.scene_title || s?.title || '';
      return d || '';
    } catch (_) { return ''; }
  };

  const summarize = (text, limit = 100) => {
    if (!text) return ' ';
    const t = String(text);
    return t.length > limit ? `${t.slice(0, limit)}…` : t;
  };
  return (
    <div className="rounded-2xl border overflow-hidden border-violet-200 bg-[#FFF] p-4">
      <div className="flex items-center justify-between px-2">
        <h3 className="text-gray-900 font-semibold">Scene By Scene Video Generation</h3>
      </div>

      <div className="mt-4 overflow-x-auto scrollbar-hide">
        <div className="flex flex-nowrap gap-5 min-w-full">
          {scenevideos.map((sceneUrl, i) => (
            <React.Fragment key={i}>
              <div className="relative basis-1/4 min-w-[25%]" onMouseEnter={() => setHoverIndex(i)} onMouseLeave={() => setHoverIndex(null)}>
                <div className="relative rounded-lg overflow-hidden bg-black flex items-center justify-center">
                  {scenevideos[i] ? (
                    <video
                      className="w-full object-contain"
                      style={{ aspectRatio: aspectRatios[i] || '16 / 9' }}
                      controls
                      playsInline
                      onLoadedMetadata={(e) => onMeta(i, e)}
                    >
                      <source src={scenevideos[i]} type="video/mp4" />
                    </video>
                  ) : (
                    <div className="w-[220px]" style={{ aspectRatio: aspectRatios[i] || '16 / 9' }} />
                  )}
                </div>
                <p className="text-center mt-2 font-medium text-gray-800">{`Scene ${i + 1}`}</p>
                {editingIndex === i ? (
                  <div className="mt-1">
                    <textarea
                      value={editValue}
                      onChange={(e) => setEditValue(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                      rows={3}
                    />
                    <div className="mt-2 flex items-center justify-center gap-2">
                      <button
                        className="px-3 py-1.5 rounded-md text-sm bg-[#13008B] text-white hover:bg-blue-800"
                        onClick={() => {
                          try {
                            // Update description immutably in the provided scenes array clone if possible
                            if (Array.isArray(scenes)) {
                              const scene = scenes[i];
                              if (scene) scene.description = editValue; // local UI update only
                            }
                          } catch (_) { /* noop */ }
                          setEditingIndex(null);
                        }}
                      >
                        Save
                      </button>
                      <button
                        className="px-3 py-1.5 rounded-md text-sm bg-gray-100 text-gray-800 hover:bg-gray-200"
                        onClick={() => setEditingIndex(null)}
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="mt-1 text-center">
                    <p
                      className="text-sm text-gray-600 whitespace-pre-wrap cursor-pointer"
                      onClick={() => setEditingIndex(i)}
                      title={getSceneText(i) || ''}
                    >
                      {summarize(getSceneText(i), 100)}
                    </p>
                    {hoverIndex === i && (
                      <button className="mt-1 text-xs text-[#13008B] hover:underline" onClick={() => setEditingIndex(i)}>
                        Edit Script
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Between button between slides */}
              {i < scenevideos.length - 1 && (
                <div className="flex items-center justify-center">
                  <div className="relative">
                    <button
                      onClick={() => setTransitionMenuFor(transitionMenuFor === i ? null : i)}
                      className="  flex items-center justify-center"
                    >
                      <MoreVertical className='w-5 h-5' />
                    </button>
                    {transitionMenuFor === i && (
                      <div className="absolute left-1/2 -translate-x-1/2 top-[20px] bg-white rounded-md shadow-lg border border-gray-200 w-44 z-10">
                        <div className="py-2 text-sm">
                          <button onClick={() => setTransitionMenuFor(null)} className="w-full text-left px-3 py-1 hover:bg-gray-100">Edit Transition</button>
                          <button onClick={() => setTransitionMenuFor(null)} className="w-full text-left px-3 py-1 hover:bg-gray-100">Add Overlay</button>
                          <button onClick={() => setTransitionMenuFor(null)} className="w-full text-left px-3 py-1 hover:bg-gray-100">Change Timing</button>
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
  )
}

export default Scencearea


