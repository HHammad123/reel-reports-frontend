import React, { useMemo, useState, useRef, useEffect } from 'react';
import { FaPlus, FaAngleRight, FaEyeDropper } from 'react-icons/fa';
import { HexColorPicker } from 'react-colorful';
import useBrandAssets from '../../hooks/useBrandAssets';
import { toast } from 'react-hot-toast';
import ImageList from '../Scenes/ImageList';
import VideosList from '../Scenes/VideosList';

// Module-scope helpers so both StepOne (generate) and StepTwo can use them
const getPerSceneDurationGlobal = (type) => (String(type).toLowerCase() === 'avatar based' ? 8 : 10);
const computeTimelineForIndex = (arr, idx) => {
  try {
    const rows = Array.isArray(arr) ? arr : [];
    let start = 0;
    for (let i = 0; i < idx; i++) start += getPerSceneDurationGlobal(rows[i]?.type || '');
    const end = start + getPerSceneDurationGlobal(rows[idx]?.type || '');
    return `${start} - ${end} seconds`;
  } catch (_) { return '0 - 10 seconds'; }
};

// Hook: centralizes scene-by-scene script state and updates
const useScriptScenes = (initial = []) => {
  const [script, setScript] = useState(Array.isArray(initial) ? initial.map(s => ({ ...(s || {}) })) : []);

  const modelToType = (model) => {
    const m = String(model || '').toUpperCase();
    if (m === 'VEO3' || m.includes('VEO')) return 'Avatar Based';
    if (m === 'SORA') return 'Infographic';
    return 'Infographic';
  };
  const typeToModel = (type) => {
    const t = String(type || '').toLowerCase();
    if (t === 'avatar based') return 'VEO3';
    if (t === 'infographic') return 'SORA';
    return 'SORA';
  };
  const perSceneDurationByModel = (model) => (String(model || '').toUpperCase().includes('VEO') ? 8 : 10);
  const computeTimelineForIndexByScript = (idx) => {
    try {
      let start = 0;
      for (let i = 0; i < idx; i++) start += perSceneDurationByModel(script[i]?.model || '');
      const end = start + perSceneDurationByModel(script[idx]?.model || '');
      return `${start} - ${end} seconds`;
    } catch (_) { return '0 - 10 seconds'; }
  };

  const setFromApi = (arr) => {
    const normalized = mapResponseToScenes(arr);
    let start = 0;
    const out = normalized.map((s, i) => {
      const model = typeToModel(s.type || '');
      const end = start + perSceneDurationByModel(model);
      const row = {
        scene_number: i + 1,
        scene_title: s.title || '',
        model,
        timeline: `${start} - ${end} seconds`,
        narration: s.narration || '',
        desc: s.description || '',
        text_to_be_included: Array.isArray(s.text_to_be_included) ? s.text_to_be_included.slice() : [],
        ref_image: Array.isArray(s.ref_image) ? s.ref_image.slice() : [],
        folderLink: s.folderLink || ''
      };
      start = end;
      return row;
    });
    setScript(out);
  };

  const updateScene = (idx, patch) => {
    setScript(prev => prev.map((sc, i) => {
      if (i !== idx) return sc;
      const next = { ...(sc || {}), ...(patch || {}) };
      // Keep scene_number consistent
      next.scene_number = i + 1;
      // Recompute timeline if model changed
      if (Object.prototype.hasOwnProperty.call(patch || {}, 'model')) {
        next.timeline = computeTimelineForIndexByScript(i);
      }
      return next;
    }));
  };

  const addSceneSimple = () => {
    setScript(prev => {
      const idx = prev.length;
      const start = (() => { let s = 0; for (let i = 0; i < idx; i++) s += perSceneDurationByModel(prev[i]?.model||''); return s; })();
      const model = 'SORA';
      const end = start + perSceneDurationByModel(model);
      return [...prev, {
        scene_number: idx + 1,
        scene_title: '',
        model,
        timeline: `${start} - ${end} seconds`,
        narration: '',
        desc: '',
        ref_image: [],
        folderLink: ''
      }];
    });
  };

  return { script, setScript, setFromApi, updateScene, addSceneSimple, modelToType, typeToModel, computeTimelineForIndexByScript };
};

// Normalize backend script/airesponse array into UI scenes array.
// Ensures: ordered by scene_number, unique object per scene, correct field mapping.
const mapResponseToScenes = (arr) => {
  const src = Array.isArray(arr) ? arr : [];
  // Index by scene_number when provided, else keep order
  const bucket = [];
  src.forEach((r, i) => {
    const sn = Number(r?.scene_number) || (i + 1);
    const m = String(r?.model || '').toUpperCase();
    const type = (m === 'VEO3' || m.includes('VEO')) ? 'Avatar Based' : (m.includes('SORA') ? 'Infographic' : (r?.type || 'Infographic'));
    bucket[sn - 1] = {
      title: r?.scene_title || '',
      description: r?.desc || r?.description || '',
      narration: r?.narration || '',
      text_to_be_included: Array.isArray(r?.text_to_be_included) ? r.text_to_be_included.slice() : [],
      type,
      avatar: null,
      ref_image: Array.isArray(r?.ref_image) ? r.ref_image.slice() : [],
      folderLink: r?.folderLink || ''
    };
  });
  // Remove holes and return
  return bucket.filter(Boolean).map(s => ({ ...(s || {}) }));
};

const StepOne = ({ values, onChange, onNext, onSetUserQuery, onCreateScenes }) => {
  const industries = useMemo(() => [], []);

  // Accordion open states
  const [open, setOpen] = useState({
    basics: false,
    purpose: true,
    style: false,
    audio: false,
    technical: false,
    content: false,
  });

  // Ensure only one accordion is open at a time
  const openSection = (key) => {
    setOpen({ basics: false, purpose: false, style: false, audio: false, technical: false, content: false, [key]: true });
  };

  // User Query fields
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [tone, setTone] = useState('professional');
  const [audience, setAudience] = useState('Investors');
  const [goal, setGoal] = useState('Promote');
  // Font styles as multi-select
  const [fontStyles, setFontStyles] = useState(['Poppins']);
  // Color palette state (Guidelines-style)
  const [selectedColors, setSelectedColors] = useState(new Set());
  const [customColors, setCustomColors] = useState([]);
  const [currentColor, setCurrentColor] = useState('#279CF5');
  const colorInputRef = useRef(null);
  const [logoAnswer, setLogoAnswer] = useState('No');
  const [logoLink, setLogoLink] = useState('');
  const [logoFileName, setLogoFileName] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [brandLogos, setBrandLogos] = useState([]);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const logoFileInputRef = useRef(null);
  const [audioAnswer, setAudioAnswer] = useState('Yes');
  const [voiceLink, setVoiceLink] = useState('');
  const [preferredVoiceName, setPreferredVoiceName] = useState('');
  const [voiceFileName, setVoiceFileName] = useState('');
  const [voicePreviewUrl, setVoicePreviewUrl] = useState('');
  const voiceInputRef = useRef(null);
  // Brand voices + recording
  const { getBrandAssets, uploadBrandAssets } = useBrandAssets();
  const [brandVoices, setBrandVoices] = useState([]);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const recordedChunksRef = useRef([]);
  const audioPreviewRef = useRef(null);
  // Hover-to-play refs
  const brandVoiceAudioRefs = useRef({});
  const stopAllBrandVoice = () => {
    try {
      const map = brandVoiceAudioRefs.current || {};
      Object.keys(map).forEach(k => { const a = map[k]; if (a) { try { a.pause(); a.currentTime = 0; } catch(_){} } });
    } catch(_){}
  };
  const playBrandVoice = (i, url) => {
    try {
      stopAllBrandVoice();
      let a = brandVoiceAudioRefs.current[i];
      if (!a || a.src !== url) { a = new Audio(url); brandVoiceAudioRefs.current[i] = a; }
      a.currentTime = 0; a.play().catch(()=>{});
    } catch(_){}
  };
  const stopBrandVoice = (i) => { try { const a = brandVoiceAudioRefs.current[i]; if (a) { a.pause(); a.currentTime = 0; } } catch(_){} };
  const [aspectRatio, setAspectRatio] = useState('9:16 (Vertical, ideal for TikTok, Stories)');
  const [videoFormat, setVideoFormat] = useState('MP4');
  const [videoLength, setVideoLength] = useState('1 -2 minutes');
  const [contentEmphasisCsv, setContentEmphasisCsv] = useState('');

  // Load brand voices and logos from Brand Assets API
  useEffect(() => {
    const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';
    if (!token) return;
    (async () => {
      try {
        const assets = await getBrandAssets(token);
        const voices = Array.isArray(assets?.voiceovers)
          ? assets.voiceovers
          : (Array.isArray(assets?.voiceover) ? assets.voiceover : (assets?.voices || []));
        const urls = (voices || []).map(v => (typeof v === 'string' ? v : (v?.url || v?.link || ''))).filter(Boolean);
        setBrandVoices(urls);
        const logos = Array.isArray(assets?.logos)
          ? assets.logos
          : (Array.isArray(assets?.logo) ? assets.logo : []);
        const logoUrls = (logos || []).map(l => (typeof l === 'string' ? l : (l?.url || l?.link || ''))).filter(Boolean);
        setBrandLogos(logoUrls);
      } catch (_) { /* noop */ }
    })();
  }, [getBrandAssets]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm')) ? 'audio/webm' : '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = mr;
      recordedChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data); };
      mr.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: mime || 'audio/webm' });
        const url = URL.createObjectURL(blob);
        setVoicePreviewUrl(url);
        setVoiceFileName('Recorded audio');
        setIsRecording(false);
        try { if (audioPreviewRef.current) audioPreviewRef.current.src = url; } catch(_){}
        try { stream.getTracks().forEach(t => t.stop()); } catch(_){}
      };
      mr.start();
      setIsRecording(true);
    } catch (_) { alert('Unable to access microphone.'); }
  };
  const stopRecording = () => { try { if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop(); } catch(_){} };

  // Add Voice modal (upload/record)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const voiceModalFileInputRef = useRef(null);
  const [voiceFilesForUpload, setVoiceFilesForUpload] = useState([]);
  const [pendingVoiceBlobs, setPendingVoiceBlobs] = useState([]);
  const [pendingVoiceUrls, setPendingVoiceUrls] = useState([]);
  const [isVoiceUploading, setIsVoiceUploading] = useState(false);
  const [voiceSaveMsg, setVoiceSaveMsg] = useState('');

  const startRecordingModal = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm')) ? 'audio/webm' : '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      const chunks = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data); };
      mr.onstop = () => {
        try {
          const blob = new Blob(chunks, { type: mime || 'audio/webm' });
          const url = URL.createObjectURL(blob);
          setPendingVoiceBlobs(prev => [...prev, blob]);
          setPendingVoiceUrls(prev => [...prev, url]);
        } catch(_){}
        try { stream.getTracks().forEach(t => t.stop()); } catch(_){ }
      };
      mr.start();
      setTimeout(() => { try { mr.stop(); } catch(_){} }, 5000); // auto-stop after 5s
    } catch(_) { alert('Unable to access microphone.'); }
  };

  // Font multi-select component (inline)
  const FontMultiSelect = ({ value = [], onChange }) => {
    const [open, setOpen] = useState(false);
    const options = [
      'Poppins','Inter','Roboto','Open Sans','Lato','Montserrat','Nunito','Source Sans Pro','Merriweather','Playfair Display','Raleway','Oswald','Ubuntu','PT Sans','Noto Sans','Fira Sans','Rubik','Mulish','Josefin Sans','Work Sans','Karla','Quicksand','Barlow','Heebo','Hind','Manrope','IBM Plex Sans','IBM Plex Serif','Archivo','Catamaran','DM Sans','DM Serif Display','Cabin','Titillium Web','Bebas Neue','Anton','Inconsolata','Space Mono','Arial','Helvetica','Times New Roman','Georgia','Verdana','Tahoma','Trebuchet MS','Courier New','Segoe UI'
    ];
    const selected = Array.isArray(value) ? value : [];
    const toggle = (f) => {
      const exists = selected.includes(f);
      const next = exists ? selected.filter(x=>x!==f) : [...selected, f];
      onChange && onChange(next);
    };
    const remove = (f) => onChange && onChange(selected.filter(x=>x!==f));
    return (
      <div className='relative z-10'>
        <button type='button' onClick={()=>setOpen(o=>!o)} className='w-full min-h-[48px] border border-gray-300 rounded-lg px-3 py-2 bg-white flex items-center justify-between'>
          <div className='flex flex-wrap gap-2'>
            {selected.length === 0 && <span className='text-gray-400'>Select fonts</span>}
            {selected.map(f => (
              <span key={f} className='px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm inline-flex items-center gap-2' style={{fontFamily: f}}>
                {f}
                <button type='button' onClick={(e)=>{e.stopPropagation(); remove(f);}} className='hover:text-red-500'>×</button>
              </span>
            ))}
          </div>
          <span className='text-gray-400'>{open ? '▲' : '▼'}</span>
        </button>
        {open && (
          <div className='absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto'>
            {options.map((f)=> (
              <button
                key={f}
                type='button'
                onClick={()=>toggle(f)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${selected.includes(f)?'bg-indigo-50':''}`}
                style={{fontFamily: f}}
              >
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

  // Preset color palette (same as Guidelines)
  const presetColors = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#E5E5E5', '#F2F2F2', '#FFFFFF',
    '#FF0000', '#FF7F00', '#FFFF00', '#7FFF00', '#00FF00', '#00FF7F', '#00FFFF', '#007FFF',
    '#0000FF', '#7F00FF', '#FF00FF', '#FF007F', '#FFC0CB', '#FFA500', '#FFD700', '#DA70D6',
    '#F08080', '#DC143C', '#8B0000', '#A52A2A', '#800000', '#B8860B', '#8B4513', '#D2691E',
    '#006400', '#228B22', '#2E8B57', '#3CB371', '#20B2AA', '#008B8B', '#4682B4', '#1E90FF',
    '#4169E1', '#00008B', '#4B0082', '#483D8B', '#6A5ACD', '#8A2BE2', '#9400D3', '#C71585',
    '#708090', '#778899', '#B0C4DE', '#ADD8E6', '#87CEEB', '#87CEFA', '#B0E0E6', '#AFEEEE'
  ];

  const buildUserQuery = () => ({
    userquery: [
      {
        additonalprop1: {
          ai_ques: [],
          video_desc: videoDesc,
          video_title: videoTitle,
          audio_and_effects: [
            {
              answer: audioAnswer,
              question: 'Would you like to add voice narration and voice-over',
              voice_link: voicePreviewUrl || voiceLink || '',
              preferred_voice_name: preferredVoiceName,
            },
          ],
          purpose_and_audience: {
            tone,
            audience,
            goal_of_video: goal,
          },
          style_and_visual_pref: {
            font_style: Array.isArray(fontStyles) ? fontStyles : [],
            color_pallete: Array.from(selectedColors || []),
            logo_inclusion: [
              {
                answer: logoAnswer,
                imageLink: logoPreviewUrl || logoLink || '',
              },
            ],
          },
          content_focus_and_emphasis: contentEmphasisCsv.split(',').map((s) => s.trim()).filter(Boolean),
          technical_and_formal_constraints: {
            aspect_ratio: aspectRatio,
            video_format: videoFormat,
            video_length: videoLength,
          },
        },
      },
    ],
  });

  // Sync up to parent on every change
  const syncUp = () => {
    const uq = buildUserQuery();
    onSetUserQuery && onSetUserQuery(uq);
    try { localStorage.setItem('buildreel_userquery', JSON.stringify(uq)); } catch (_) { /* noop */ }
  };

  // Persist on changes
  React.useEffect(() => { syncUp(); }, [videoTitle, videoDesc, tone, audience, goal, fontStyles, selectedColors, customColors, currentColor, logoAnswer, logoLink, logoPreviewUrl, audioAnswer, voiceLink, voicePreviewUrl, preferredVoiceName, aspectRatio, videoFormat, videoLength, contentEmphasisCsv]);

  // Rehydrate if available
  React.useEffect(() => {
    try {
      const raw = localStorage.getItem('buildreel_userquery');
      if (!raw) return;
      const val = JSON.parse(raw);
      const p = val?.userquery?.[0]?.additonalprop1;
      if (!p) return;
      setVideoTitle(p.video_title || '');
      setVideoDesc(p.video_desc || '');
      setTone(p.purpose_and_audience?.tone || 'professional');
      setAudience(p.purpose_and_audience?.audience || 'Investors');
      setGoal(p.purpose_and_audience?.goal_of_video || 'Promote');
      if (Array.isArray(p.style_and_visual_pref?.font_style)) setFontStyles(p.style_and_visual_pref.font_style);
      if (Array.isArray(p.style_and_visual_pref?.color_pallete)) setSelectedColors(new Set(p.style_and_visual_pref.color_pallete));
      const li = Array.isArray(p.style_and_visual_pref?.logo_inclusion) ? p.style_and_visual_pref.logo_inclusion[0] : null;
      setLogoAnswer(li?.answer || 'No');
      setLogoLink(li?.imageLink || '');
      setLogoPreviewUrl(li?.imageLink || '');
      const ae = Array.isArray(p.audio_and_effects) ? p.audio_and_effects[0] : null;
      setAudioAnswer(ae?.answer || 'Yes');
      setVoiceLink(ae?.voice_link || '');
      setVoicePreviewUrl(ae?.voice_link || '');
      setPreferredVoiceName(ae?.preferred_voice_name || '');
      setAspectRatio(p.technical_and_formal_constraints?.aspect_ratio || '9:16 (Vertical, ideal for TikTok, Stories)');
      setVideoFormat(p.technical_and_formal_constraints?.video_format || 'MP4');
      setVideoLength(p.technical_and_formal_constraints?.video_length || '1 -2 minutes');
      setContentEmphasisCsv(Array.isArray(p.content_focus_and_emphasis) ? p.content_focus_and_emphasis.join(',') : (p.content_focus_and_emphasis || ''));
    } catch (_) { /* noop */ }
  }, []);

  return (
    <div className='bg-white h-[100vh] w-full rounded-lg p-6 overflow-y-auto'>
      <div className='flex flex-col gap-1 mb-6'>
        <h2 className='text-[24px] font-semibold'>Generate Your Custom Video</h2>
        <p className='text-[14px] text-gray-500'>Fill in all the Mandatory details and Generate Video</p>
      </div>

      {/* Title and Description (Basics) */}
      <div className='mb-4'>
        <input
          value={videoTitle}
          onChange={(e)=>setVideoTitle(e.target.value)}
          placeholder='Add a Video Title'
          className='w-full p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500'
        />
      </div>
      <div className='mb-6'>
        <textarea
          rows={4}
          value={videoDesc}
          onChange={(e) => setVideoDesc(e.target.value)}
          placeholder='Describe your video...'
          className='w-full p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500'
        />
      </div>

      {/* Accordions for user query */}
      <div className='space-y-3 mb-6'>
        {/* Basics accordion removed; title & description moved to top */}

        {/* Purpose & Audience */}
        <div className='border rounded-xl'>
          <button className='w-full flex justify-between items-center px-4 py-3' onClick={() => openSection('purpose')}>
            <span className='font-medium'>Purpose & Audience</span>
            <span>{open.purpose ? '−' : '+'}</span>
          </button>
          {open.purpose && (
            <div className='px-4 pb-4 flex flex-col gap-3'>
              <div>
                <label className='text-sm text-gray-600'>Tone</label>
                <select value={tone} onChange={e=>setTone(e.target.value)} className='w-full mt-1 p-3 border rounded-lg'>
                  {['professional','casual','humorous','inspiring','formal'].map(t=> <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className='text-sm text-gray-600'>Audience</label>
                <select value={audience} onChange={e=>setAudience(e.target.value)} className='w-full mt-1 p-3 border rounded-lg'>
                  {['Investors','Clients','Colleagues','Students','General public'].map(a=> <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className='text-sm text-gray-600'>Goal</label>
                <select value={goal} onChange={e=>setGoal(e.target.value)} className='w-full mt-1 p-3 border rounded-lg'>
                  {['Promote','Inform','Summarize','Educate'].map(g=> <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Style & Visuals */}
        <div className='border rounded-xl'>
          <button className='w-full flex justify-between items-center px-4 py-3' onClick={() => openSection('style')}>
            <span className='font-medium'>Style & Visual Preferences</span>
            <span>{open.style ? '−' : '+'}</span>
          </button>
          {open.style && (
            <div className='px-4 pb-4 flex flex-col gap-6'>
              <div className='relative'>
                <label className='text-sm text-gray-600'>Font Styles</label>
                <FontMultiSelect value={fontStyles} onChange={setFontStyles} />
              </div>
              <div className='bg-white border border-gray-200 rounded-xl p-4'>
                <span className='text-[18px] text-gray-600 mb-3 block'>Specific color schemes</span>
                <div className='flex flex-col md:flex-row gap-6 items-start'>
                  <div className='flex flex-col gap-3 w-full md:w-[320px]'>
                    <HexColorPicker color={currentColor} onChange={setCurrentColor} />
                    <div className='flex items-center gap-3'>
                      <div className='h-8 w-8 rounded-full border' style={{ backgroundColor: currentColor }} />
                      <input
                        value={currentColor}
                        onChange={(e) => setCurrentColor(e.target.value)}
                        className='px-3 py-2 border rounded-lg w-40'
                      />
                      <button
                        type='button'
                        onClick={() => {
                          setCustomColors((prev) => (prev.includes(currentColor) ? prev : [...prev, currentColor]));
                          setSelectedColors((prev) => new Set(prev).add(currentColor));
                        }}
                        className='px-4 py-2 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0066] transition-colors'
                      >
                        Add Color
                      </button>
                    </div>
                  </div>
                  <div className='w-full md:flex-1'>
                    <div className='w-full border border-gray-200 rounded-xl p-4 mb-4'>
                      <div className='grid grid-cols-8 gap-2'>
                        {([...presetColors, ...customColors]).map((color) => {
                          const isSel = (selectedColors || new Set()).has(color);
                          return (
                            <button
                              key={color}
                              type='button'
                              onClick={() => {
                                setSelectedColors((prev) => {
                                  const next = new Set(prev);
                                  if (next.has(color)) next.delete(color); else next.add(color);
                                  return next;
                                });
                              }}
                              className={`w-8 h-8 rounded-full border-2 ${isSel ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'} flex items-center justify-center transition-all duration-150`}
                              style={{ backgroundColor: color }}
                              title={color}
                            >
                              {isSel && (<span className='text-white text-xs'>✓</span>)}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className='flex items-center gap-3'>
                      <p className='text-gray-700 font-medium'>CUSTOM</p>
                      <button
                        onClick={() => colorInputRef.current?.click()}
                        className='w-8 h-8 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors'
                        title='Pick color'
                        type='button'
                      >
                        <FaEyeDropper className='w-4 h-4' />
                      </button>
                      <input ref={colorInputRef} type='color' onChange={(e)=>{
                        const newColor = e.target.value;
                        setCurrentColor(newColor);
                        if (!presetColors.includes(newColor) && !customColors.includes(newColor)) {
                          setCustomColors(prev => [...prev, newColor]);
                          setSelectedColors(prev => new Set(prev).add(newColor));
                        }
                      }} className='hidden' />
                    </div>
                  </div>
                </div>
              </div>
              <div>
                <label className='text-sm text-gray-600'>Logo Inclusion</label>
                <div className='flex gap-2 mt-1'>
                  {['Yes','No'].map(v => (
                    <button key={v} onClick={()=>setLogoAnswer(v)} className={`px-3 py-2 rounded-lg border ${logoAnswer===v?'bg-[#13008B] text-white border-[#13008B]':'bg-white text-gray-700'}`}>{v}</button>
                  ))}
                </div>
                {logoAnswer==='Yes' && (
                  <div className='mt-3'>
                    <p className='text-sm text-gray-700 mb-2'>Choose from your brand assets:</p>
                    <div className='flex flex-wrap gap-4 items-start'>
                      {Array.isArray(brandLogos) && brandLogos.length > 0 && brandLogos.map((url, i) => (
                        <div key={i} className='flex flex-col items-center gap-1'>
                          <button
                            type='button'
                            onClick={() => { setLogoPreviewUrl(url); setLogoLink(url); setLogoFileName(`Logo ${i+1}`); }}
                            className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all ${ (logoPreviewUrl||logoLink)===url ? 'border-blue-600 ring-2 ring-blue-300 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}
                          >
                            <img src={url} alt={`Logo ${i+1}`} className='w-12 h-12 object-contain' />
                          </button>
                          <span className='text-xs text-gray-600'>Logo {i+1}</span>
                        </div>
                      ))}
                      {/* Add new logo */}
                      <div className='flex flex-col items-center gap-1'>
                        <input ref={logoFileInputRef} type='file' accept='image/*' className='hidden' onChange={async (e) => {
                          const file = e.target.files && e.target.files[0];
                          if (!file) return;
                          const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';
                          if (!token) return;
                          try {
                            setIsLogoUploading(true);
                            await uploadBrandAssets({ userId: token, files: { logos: [file] } });
                            const refreshed = await getBrandAssets(token);
                            const list = Array.isArray(refreshed?.logos) ? refreshed.logos : (Array.isArray(refreshed?.logo) ? refreshed.logo : []);
                            const logoUrls = (list || []).map(l => (typeof l === 'string' ? l : (l?.url || l?.link || ''))).filter(Boolean);
                            setBrandLogos(logoUrls);
                            const latest = logoUrls[logoUrls.length - 1];
                            if (latest) { setLogoPreviewUrl(latest); setLogoLink(latest); setLogoFileName(file.name || 'Uploaded logo'); }
                          } catch (_) { /* noop */ }
                          finally { setIsLogoUploading(false); if (e.target) e.target.value=''; }
                        }} />
                        <button type='button' onClick={() => logoFileInputRef.current && logoFileInputRef.current.click()} className={`w-20 h-20 rounded-full flex items-center justify-center border border-dashed ${isLogoUploading ? 'border-gray-300 bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-400 text-gray-500 hover:bg-gray-50'}`} title='Add logo' disabled={isLogoUploading}>
                          {isLogoUploading ? (
                            <span className='inline-block w-6 h-6 border-2 border-gray-400 border-t-transparent rounded-full animate-spin' />
                          ) : (
                            <FaPlus className='w-6 h-6' />
                          )}
                        </button>
                        <span className='text-xs text-gray-600'>Add</span>
                      </div>
                    </div>
                    {(logoPreviewUrl || logoLink) && (
                      <div className='mt-3'>
                        <p className='text-xs text-gray-600 mb-1'>Selected logo preview</p>
                        <div className='border rounded-lg p-2 inline-flex bg-white'>
                          <img src={logoPreviewUrl || logoLink} alt='Logo preview' className='h-16 object-contain' />
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Audio & Effects */}
        <div className='border rounded-xl'>
          <button className='w-full flex justify-between items-center px-4 py-3' onClick={() => openSection('audio')}>
            <span className='font-medium'>Audio & Effects</span>
            <span>{open.audio ? '−' : '+'}</span>
          </button>
          {open.audio && (
            <div className='px-4 pb-4 flex flex-col gap-4'>
              <div>
                <label className='text-sm text-gray-600'>Add Voiceover?</label>
                <div className='flex gap-2 mt-1'>
                  {['Yes','No'].map(v => (
                    <button key={v} onClick={()=>setAudioAnswer(v)} className={`px-3 py-2 rounded-lg border ${audioAnswer===v?'bg-[#13008B] text-white border-[#13008B]':'bg-white text-gray-700'}`}>{v}</button>
                  ))}
                </div>
              </div>
              {audioAnswer === 'Yes' && (
                <>
                  <div>
                    <div className='flex items-center justify-between mb-1'>
                      <label className='text-sm text-gray-600'>Select from Brand Voices</label>
                      <button type='button' onClick={() => setIsVoiceModalOpen(true)} className='text-sm px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200'>Add Voice</button>
                    </div>
                    {Array.isArray(brandVoices) && brandVoices.length > 0 ? (
                      <div className='flex flex-wrap gap-2'>
                        {brandVoices.map((url, idx) => (
                          <button
                            type='button'
                            key={idx}
                            onMouseEnter={() => playBrandVoice(idx, url)}
                            onMouseLeave={() => stopBrandVoice(idx)}
                            onClick={() => { setVoicePreviewUrl(url); setVoiceFileName(`Brand Voice ${idx+1}`); }}
                            className={`px-3 py-2 rounded-lg border transition-all ${voicePreviewUrl===url ? 'bg-[#13008B] text-white border-[#13008B]' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                            title={url}
                          >
                            Voice {idx+1}
                          </button>
                        ))}
                      </div>
                    ) : (
                      <div className='flex items-center gap-3'>
                        <p className='text-sm text-gray-500'>No brand voices found.</p>
                        <button type='button' onClick={() => setIsVoiceModalOpen(true)} className='text-sm px-3 py-1 rounded-md bg-gray-100 hover:bg-gray-200'>Add Voice</button>
                      </div>
                    )}
                  </div>
                  <div>
                    <label className='text-sm text-gray-600'>Upload Voice (MP3/WAV)</label>
                    <div className='mt-1 flex items-center gap-3'>
                      <button type='button' onClick={()=>voiceInputRef.current?.click()} className='px-4 py-2 rounded-lg border bg-white hover:bg-gray-50'>Choose File</button>
                      <span className='text-sm text-gray-600 truncate'>{voiceFileName || 'No file selected'}</span>
                      <input ref={voiceInputRef} type='file' accept='audio/*' className='hidden' onChange={(e)=>{
                        const f = e.target.files && e.target.files[0];
                        if (!f) return;
                        setVoiceFileName(f.name);
                        const url = URL.createObjectURL(f);
                        setVoicePreviewUrl(url);
                        setVoiceLink('');
                      }} />
                    </div>
                  </div>
                  <div>
                    <label className='text-sm text-gray-600'>Record Voice</label>
                    <div className='mt-1 flex items-center gap-3'>
                      {!isRecording ? (
                        <button type='button' onClick={startRecording} className='px-4 py-2 rounded-lg border bg-white hover:bg-gray-50'>Start Recording</button>
                      ) : (
                        <button type='button' onClick={stopRecording} className='px-4 py-2 rounded-lg border bg-red-600 text-white hover:bg-red-700'>Stop</button>
                      )}
                      <span className='text-sm text-gray-600'>{isRecording ? 'Recording…' : ''}</span>
                    </div>
                  </div>
                  {(voicePreviewUrl || voiceLink) && (
                    <audio ref={audioPreviewRef} className='mt-2 w-full' controls src={voicePreviewUrl || voiceLink} />
                  )}
                  <div>
                    <label className='text-sm text-gray-600'>Preferred Voice Name</label>
                    <input value={preferredVoiceName} onChange={e=>setPreferredVoiceName(e.target.value)} className='w-full mt-1 p-3 border rounded-lg' placeholder='Jane Doe' />
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Technical & Constraints */}
        <div className='border rounded-xl'>
          <button className='w-full flex justify-between items-center px-4 py-3' onClick={() => openSection('technical')}>
            <span className='font-medium'>Technical & Format Constraints</span>
            <span>{open.technical ? '−' : '+'}</span>
          </button>
          {open.technical && (
            <div className='px-4 pb-4 flex flex-col gap-3'>
              <div>
                <label className='text-sm text-gray-600'>Aspect Ratio</label>
                <select value={aspectRatio} onChange={e=>setAspectRatio(e.target.value)} className='w-full mt-1 p-3 border rounded-lg'>
                  {['16:9 (Standard widescreen)','1:1 (Square, ideal for Instagram)','9:16 (Vertical, ideal for TikTok, Stories)','4:5 (Portrait, suitable for Instagram feeds)'].map(a=> <option key={a} value={a}>{a}</option>)}
                </select>
              </div>
              <div>
                <label className='text-sm text-gray-600'>Video Format</label>
                <select value={videoFormat} onChange={e=>setVideoFormat(e.target.value)} className='w-full mt-1 p-3 border rounded-lg'>
                  {['MP4','MOV','Embedded video link'].map(f=> <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
              <div>
                <label className='text-sm text-gray-600'>Video Length</label>
                <select value={videoLength} onChange={e=>setVideoLength(e.target.value)} className='w-full mt-1 p-3 border rounded-lg'>
                  {['0-30 seconds','30-60 seconds','1 -2 minutes','2-3 minutes'].map(l=> <option key={l} value={l}>{l}</option>)}
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Content Focus & Emphasis */}
        {/* <div className='border rounded-xl'>
          <button className='w-full flex justify-between items-center px-4 py-3' onClick={() => openSection('content')}>
            <span className='font-medium'>Content Focus & Emphasis</span>
            <span>{open.content ? '−' : '+'}</span>
          </button>
          {open.content && (
            <div className='px-4 pb-4'>
              <label className='text-sm text-gray-600'>Topics/keywords (comma separated)</label>
              <input value={contentEmphasisCsv} onChange={e=>setContentEmphasisCsv(e.target.value)} className='w-full mt-1 p-3 border rounded-lg' placeholder='benefits, call-to-action, pricing' />
            </div>
          )}
        </div> */}
      </div>

      {/* Removed earlier question blocks; replaced by accordions below */}

      <div className='flex justify-end mt-8'>
        <button onClick={() => { syncUp(); onCreateScenes && onCreateScenes(); }} className='flex items-center gap-2 bg-[#13008B] text-white px-5 py-2 rounded-lg'>
          Add Your Scenes <FaAngleRight />
        </button>
      </div>

      {/* Add Voice Modal */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[92%] max-w-xl rounded-lg shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Add Voice</h3>
              <button onClick={() => setIsVoiceModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Upload */}
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-700 font-medium mb-2">Upload Voice File</p>
                <input
                  ref={voiceModalFileInputRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  className="hidden"
                  onChange={(e) => setVoiceFilesForUpload(Array.from(e.target.files || []))}
                />
                <button onClick={() => voiceModalFileInputRef.current && voiceModalFileInputRef.current.click()} className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm">Choose Files</button>
                {voiceFilesForUpload && voiceFilesForUpload.length > 0 && (
                  <ul className="mt-2 text-xs text-gray-700 list-disc ml-5">
                    {voiceFilesForUpload.map((f, i) => (<li key={i}>{f.name}</li>))}
                  </ul>
                )}
              </div>
              {/* Record */}
              <div className="border rounded-lg p-4 flex flex-col gap-2">
                <p className="text-sm text-gray-700 font-medium">Record Voice</p>
                <button onClick={startRecordingModal} className="px-3 py-2 rounded-md bg-blue-100 border border-blue-300 text-blue-700 hover:bg-blue-200 text-sm">Start 5s Recording</button>
                {pendingVoiceUrls && pendingVoiceUrls.length > 0 && (
                  <audio src={pendingVoiceUrls[pendingVoiceUrls.length-1]} controls className="mt-1" />
                )}
              </div>
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button onClick={() => setIsVoiceModalOpen(false)} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    setIsVoiceUploading(true); setVoiceSaveMsg('');
                    const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';
                    if (!token) { setVoiceSaveMsg('Login required'); setIsVoiceUploading(false); return; }
                    const toMp3File = (blob, idx) => new File([blob], `recorded_${Date.now()}_${idx}.mp3`, { type: 'audio/mpeg' });
                    const filesFromBlobs = (pendingVoiceBlobs || []).map((b, i) => toMp3File(b, i));
                    const combined = [...(voiceFilesForUpload || []), ...filesFromBlobs];
                    if (combined.length === 0) { setVoiceSaveMsg('Please upload or record a voice first.'); setIsVoiceUploading(false); return; }
                    await uploadBrandAssets({ userId: token, files: { voiceovers: combined } });
                    setVoiceFilesForUpload([]);
                    try { (pendingVoiceUrls || []).forEach(u => URL.revokeObjectURL(u)); } catch (_) {}
                    setPendingVoiceUrls([]); setPendingVoiceBlobs([]);
                    const refreshed = await getBrandAssets(token);
                    const list = Array.isArray(refreshed?.voiceovers) ? refreshed.voiceovers : (Array.isArray(refreshed?.voiceover) ? refreshed.voiceover : (refreshed?.voices || []));
                    const urls = (list || []).map(v => (typeof v === 'string' ? v : (v?.url || ''))).filter(Boolean);
                    setBrandVoices(urls);
                    setIsVoiceModalOpen(false);
                  } catch (e) {
                    setVoiceSaveMsg(e?.message || 'Failed to save');
                  } finally { setIsVoiceUploading(false); }
                }}
                className={`px-4 py-2 rounded-md ${isVoiceUploading ? 'bg-gray-300 text-gray-600' : 'bg-green-600 hover:bg-green-700 text-white'}`}
              >{isVoiceUploading ? 'Saving…' : 'Save to Brand Assets'}</button>
            </div>
            {voiceSaveMsg && (<div className="text-sm mt-2 text-gray-700">{voiceSaveMsg}</div>)}
          </div>
        </div>
      )}
    </div>
  );
};

const StepTwo = ({ values, onBack, onSave, onGenerate }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  // Use centralized script state
  const { script, setFromApi, updateScene: updateScriptScene, addSceneSimple, modelToType, typeToModel, computeTimelineForIndexByScript } = useScriptScenes(
    Array.isArray(values?.scripts?.[0]?.airesponse) ? values.scripts[0].airesponse : (Array.isArray(values?.script) ? values.script : [])
  );
  const [videoDurationSec, setVideoDurationSec] = useState(10);
  const [isAdding, setIsAdding] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const imageFileInputRef = useRef(null);
  const [isUploadingSceneImage, setIsUploadingSceneImage] = useState(false);
  const [textIncludeInput, setTextIncludeInput] = useState('');

  // Helpers to persist current scenes before enhance
  const scenes = useMemo(() => (Array.isArray(script) ? script.map((r) => ({
    title: r?.scene_title || '',
    description: r?.desc || r?.description || '',
    narration: r?.narration || '',
    text_to_be_included: Array.isArray(r?.text_to_be_included) ? r.text_to_be_included : [],
    type: modelToType(r?.model),
    ref_image: Array.isArray(r?.ref_image) ? r.ref_image : [],
    folderLink: r?.folderLink || ''
  })) : []), [script, modelToType]);
  const saveScenesToServer = async () => {
    const sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) ? localStorage.getItem('session_id') : '';
    if (!sessionId) throw new Error('Missing session_id');
    const airesponse = Array.isArray(script) ? script : [];
    let uq = [];
    try {
      const raw = localStorage.getItem('buildreel_userquery');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.userquery)) uq = parsed.userquery;
      }
    } catch (_) { /* noop */ }
    if (!Array.isArray(uq)) uq = [];
    const body = {
      session_id: sessionId || '',
      current_script: {
        userquery: uq,
        airesponse
      },
      action: 'save'
    };
    const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/create-from-scratch', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const text = await resp.text();
    let data; try { data = JSON.parse(text); } catch (_) { data = text; }
    if (!resp.ok) throw new Error(`create-from-scratch(save) failed: ${resp.status} ${text}`);
    return data;
  };

  const getPerSceneDuration = (type) => (String(type).toLowerCase() === 'avatar based' ? 8 : 10);
  const computeTimelineForIndex = (arr, idx) => {
    try {
      let start = 0;
      for (let i = 0; i < idx; i++) start += getPerSceneDuration(arr[i]?.type || '');
      const end = start + getPerSceneDuration(arr[idx]?.type || '');
      return `${start} - ${end} seconds`;
    } catch (_) { return '0 - 10 seconds'; }
  };

  const setScene = (idx, patch) => {
    if (!patch) return;
    const p = { ...patch };
    if (Object.prototype.hasOwnProperty.call(p, 'type')) {
      p.model = typeToModel(p.type);
      delete p.type;
    }
    // Map UI keys to script keys
    if (Object.prototype.hasOwnProperty.call(p, 'title')) { p.scene_title = p.title; delete p.title; }
    if (Object.prototype.hasOwnProperty.call(p, 'description')) { p.desc = p.description; delete p.description; }
    // Write into script
    updateScriptScene(idx, p);
    if (patch && Object.prototype.hasOwnProperty.call(patch, 'type')) {
      setVideoDurationSec(getPerSceneDuration(patch.type));
    }
  };

  // If values.script is provided (from parent), initialize/replace script state
  useEffect(() => {
    const scriptFromParent = Array.isArray(values?.script) ? values.script : [];
    if (scriptFromParent.length > 0) setFromApi(scriptFromParent);
  }, [values?.script]);

  const addScene = async () => {
    try {
      if (isAdding) return;
      setIsAdding(true);
      // 1) Load session id (frontend sends userquery + current scenes)
      const sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) ? localStorage.getItem('session_id') : '';
      if (!sessionId) throw new Error('Missing session_id');

      // 2) Build airesponse from current UI scenes (include current scenes as-is)
      const airesponse = Array.isArray(script) ? script : [];

      // 3) Prepare request body per new schema — include userquery and current scenes from frontend
      let uq = [];
      try {
        if (values && values.userquery && Array.isArray(values.userquery.userquery)) {
          uq = values.userquery.userquery;
        } else {
          const raw = localStorage.getItem('buildreel_userquery');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.userquery)) uq = parsed.userquery;
          }
        }
      } catch (_) { /* noop */ }
      if (!Array.isArray(uq)) uq = [];
      const body = {
        session_id: sessionId || '',
        current_script: {
          userquery: uq,
          airesponse
        },
        action: 'add'
      };

      // 4) Call create-from-scratch to append a new scene
      const endpoint = 'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/create-from-scratch';
      const resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`create-from-scratch failed: ${resp.status} ${text}`);

      // 5) Extract updated scenes from response and update UI
      const aiArr = data?.session_patch?.append_message?.airesponse
        ?? data?.assistant_message?.airesponse
        ?? data?.airesponse
        ?? data?.script
        ?? [];
      setFromApi(aiArr);
      setActiveIndex(Math.max(0, (Array.isArray(aiArr) ? aiArr.length : 1) - 1));
    } catch (e) {
      console.error('Add Scene failed:', e);
      alert('Failed to add scene. Please try again.');
    } finally { setIsAdding(false); }
  };

  // Upload reference image (or avatar image) for current scene
  const uploadSceneImage = async (file) => {
    try {
      const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';
      if (!file) return [];
      const form = new FormData();
      if (token) form.append('user_id', token);
      form.append('files', file);
      const endpoint = 'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/images/upload';
      const resp = await fetch(endpoint, { method: 'POST', body: form });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`images/upload failed: ${resp.status} ${text}`);
      // Try to extract URLs from common response shapes
      const urls = [];
      const pushStr = (u) => { if (typeof u === 'string') urls.push(u); };
      const harvest = (val) => {
        if (!val) return;
        if (Array.isArray(val)) val.forEach(v => (typeof v === 'string') ? pushStr(v) : (v && typeof v === 'object' && pushStr(v.url || v.link || v.src)) );
        else if (typeof val === 'string') pushStr(val);
      };
      try {
        harvest(data?.image_urls);
        harvest(data?.urls);
        harvest(data?.images);
        if (urls.length === 0 && typeof data === 'object') Object.keys(data).forEach(k => harvest(data[k]));
      } catch (_) { /* noop */ }
      return Array.from(new Set(urls));
    } catch (e) {
      console.error('Upload image failed:', e);
      alert('Failed to upload image. Please try again.');
      return [];
    }
  };

  const types = ['Avatar Based', 'Infographic', 'Commercial', 'Corporate'];

  // Keep duration in sync with current scene type
  React.useEffect(() => {
    try {
      const currentType = scenes[activeIndex]?.type || '';
      setVideoDurationSec(getPerSceneDuration(currentType));
    } catch (_) { /* noop */ }
  }, [activeIndex, scenes]);

  return (
    <div className='bg-white h-[100vh] w-full rounded-lg p-6 overflow-y-auto'>
      <div className='flex flex-col gap-1 mb-6'>
        <h2 className='text-[24px] font-semibold'>Add Your Scenes</h2>
      </div>

      <div className='flex items-center gap-3 mb-5'>
        {scenes.map((_, i) => (
          <button
            key={i}
            className={`px-4 py-2 rounded-full text-sm ${i === activeIndex ? 'bg-[#13008B] text-white' : 'bg-gray-200 text-gray-700'}`}
            onClick={() => setActiveIndex(i)}
          >
            Scene {i + 1}
          </button>
        ))}
        <button onClick={addScene} className='ml-2 flex items-center gap-2 px-3 py-2 rounded-full bg-gray-100 border'>
          <FaPlus /> Scene
        </button>
      </div>

      {/* Scene Editor */}
      <div className='grid grid-cols-12 gap-6'>
        <div className='col-span-12 lg:col-span-9 space-y-4'>
          <div>
            <label className='text-sm text-gray-600'>Scene Title</label>
            <input
              value={scenes[activeIndex]?.title || ''}
              onChange={(e) => setScene(activeIndex, { title: e.target.value })}
              className='w-full mt-1 p-3 border rounded-lg'
              placeholder="Lorem Ipsum has been the industry's standard dummy text ever since the 1500s"
            />
          </div>
          <div>
            <div className='flex items-center justify-between'>
              <label className='text-sm text-gray-600'>Description</label>
              <button
                type='button'
                onClick={async () => {
                  if (isEnhancing) return;
                  try {
                    setIsEnhancing(true);
                    const sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) ? localStorage.getItem('session_id') : '';
                    if (!sessionId) throw new Error('Missing session_id');
                    const curIdx = activeIndex;
                    // Build current_script from UI and local userquery
                    const airesponse = Array.isArray(script) ? script : [];
                    let uq = [];
                    try {
                      const raw = localStorage.getItem('buildreel_userquery');
                      if (raw) { const parsed = JSON.parse(raw); if (parsed && Array.isArray(parsed.userquery)) uq = parsed.userquery; }
                    } catch (_) { /* noop */ }
                    if (!Array.isArray(uq)) uq = [];
                    const enhanceBody = { session_id: sessionId, current_script: { userquery: uq, airesponse }, scene_number: (curIdx + 1), action: 'desc' };
                    const endpoint = 'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/enhance-field';
                    const resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(enhanceBody) });
                    const text = await resp.text();
                    let data; try { data = JSON.parse(text); } catch (_) { data = text; }
                    if (!resp.ok) throw new Error(`enhance-field failed: ${resp.status} ${text}`);
                    const updated = Array.isArray(data?.script) ? data.script : [];
                    if (updated.length > 0) {
                      const targetSn = curIdx + 1;
                      const match = updated.find(s => Number(s?.scene_number) === targetSn) || updated[curIdx] || updated[0];
                      if (match && typeof match.desc === 'string') {
                        updateScriptScene(activeIndex, { desc: match.desc });
                      }
                    }
                  } catch (e) {
                    console.error('Enhance description failed:', e);
                    alert('Failed to enhance description. Please try again.');
                  } finally { setIsEnhancing(false); }
                }}
                className={`text-xs px-3 py-1 rounded-md border ${isEnhancing ? 'bg-gray-100 text-gray-500' : 'bg-white hover:bg-gray-50'}`}
                title='Enhance description'
                disabled={isEnhancing}
              >{isEnhancing ? 'Enhancing…' : 'Enhance'}</button>
            </div>
            <textarea
              rows={4}
              value={scenes[activeIndex]?.description || ''}
              onChange={(e) => setScene(activeIndex, { description: e.target.value })}
              className='w-full mt-1 p-3 border rounded-lg'
              placeholder='Describe the scene'
            />
          </div>
          <div>
            <div className='flex items-center justify-between'>
              <label className='text-sm text-gray-600'>Narration</label>
              <button
                type='button'
                onClick={async () => {
                  if (isEnhancing) return;
                  try {
                    setIsEnhancing(true);
                    const sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) ? localStorage.getItem('session_id') : '';
                    if (!sessionId) throw new Error('Missing session_id');
                    const curIdxN = activeIndex;
                    const airesponse = Array.isArray(script) ? script : [];
                    let uq = [];
                    try {
                      const raw = localStorage.getItem('buildreel_userquery');
                      if (raw) { const parsed = JSON.parse(raw); if (parsed && Array.isArray(parsed.userquery)) uq = parsed.userquery; }
                    } catch (_) { /* noop */ }
                    if (!Array.isArray(uq)) uq = [];
                    const enhanceBody = { session_id: sessionId, current_script: { userquery: uq, airesponse }, scene_number: (curIdxN + 1), action: 'narration' };
                    const endpoint = 'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/enhance-field';
                    const resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(enhanceBody) });
                    const text = await resp.text();
                    let data; try { data = JSON.parse(text); } catch (_) { data = text; }
                    if (!resp.ok) throw new Error(`enhance-field failed: ${resp.status} ${text}`);
                    const updated = Array.isArray(data?.script) ? data.script : [];
                    if (updated.length > 0) {
                      const targetSnN = curIdxN + 1;
                      const matchN = updated.find(s => Number(s?.scene_number) === targetSnN) || updated[curIdxN] || updated[0];
                      if (matchN && typeof matchN.narration === 'string') {
                        updateScriptScene(activeIndex, { narration: matchN.narration });
                      }
                    }
                  } catch (e) {
                    console.error('Enhance narration failed:', e);
                    alert('Failed to enhance narration. Please try again.');
                  } finally { setIsEnhancing(false); }
                }}
                className={`text-xs px-3 py-1 rounded-md border ${isEnhancing ? 'bg-gray-100 text-gray-500' : 'bg-white hover:bg-gray-50'}`}
                title='Enhance narration'
                disabled={isEnhancing}
              >{isEnhancing ? 'Enhancing…' : 'Enhance'}</button>
            </div>
            <textarea
              rows={4}
              value={scenes[activeIndex]?.narration || ''}
              onChange={(e) => setScene(activeIndex, { narration: e.target.value })}
              className='w-full mt-1 p-3 border rounded-lg'
              placeholder='Narration for this scene'
            />
          </div>
          {/* Text To Be Included */}
          <div className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
            <h4 className='text-lg font-semibold text-gray-800 mb-2'>Text To Be Included</h4>
            {(() => {
              const r = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
              const items = Array.isArray(r?.text_to_be_included) ? r.text_to_be_included : [];
              const removeAt = (idx) => {
                const next = items.slice();
                next.splice(idx,1);
                updateScriptScene(activeIndex, { text_to_be_included: next });
              };
              const addItem = () => {
                const val = (textIncludeInput || '').trim();
                if (!val) return;
                const next = [...items, val];
                updateScriptScene(activeIndex, { text_to_be_included: next });
                setTextIncludeInput('');
              };
              return (
                <div>
                  <div className='flex flex-wrap gap-2 mb-2'>
                    {items.map((t,i) => (
                      <span key={i} className='inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white border border-gray-300 text-sm'>
                        {t}
                        <button type='button' onClick={() => removeAt(i)} className='text-gray-500 hover:text-red-600'>×</button>
                      </span>
                    ))}
                  </div>
                  <input
                    type='text'
                    value={textIncludeInput}
                    onChange={(e) => setTextIncludeInput(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
                    className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent'
                    placeholder='Type text and press Enter to add'
                  />
                  <div className='mt-2 flex justify-end'>
                    <button type='button' onClick={addItem} className='px-3 py-1.5 rounded-md bg-[#13008B] text-white text-sm'>Add</button>
                  </div>
                </div>
              );
            })()}
          </div>
          <div className='rounded-xl border p-4'>
            <div className='grid grid-cols-12 gap-4 items-start'>
              <div className='col-span-12 md:col-span-6'>
                <div className='text-sm text-gray-600 mb-2'>Select a Video Type</div>
                <div className='flex flex-wrap gap-2'>
                  {types.map((t) => (
                    <button
                      key={t}
                      onClick={() => setScene(activeIndex, { type: t })}
                      className={`px-4 py-2 rounded-full text-sm ${scenes[activeIndex]?.type === t ? 'bg-[#13008B] text-white' : 'bg-gray-200 text-gray-700'}`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div className='col-span-12 md:col-span-6'>
                <div className='text-sm text-gray-600 mb-2'>
                  { (scenes[activeIndex]?.type || '') === 'Avatar Based' ? 'Select an Avatar' : 'Select a Reference Image' }
                </div>
                <div className='flex items-center gap-3'>
                  {(() => {
                  const imgs = Array.isArray(scenes[activeIndex]?.ref_image) ? scenes[activeIndex].ref_image : [];
                    if (imgs.length > 0) {
                      return imgs.slice(0,3).map((url, idx) => (
                        <div key={idx} className='w-16 h-16 rounded-lg border overflow-hidden'>
                          <img src={url} alt={`ref-${idx}`} className='w-full h-full object-cover' />
                        </div>
                      ));
                    }
                    return null;
                  })()}
                  <input
                    ref={imageFileInputRef}
                    type='file'
                    accept='image/*'
                    className='hidden'
                    onChange={async (e) => {
                      try {
                        const file = (e.target.files && e.target.files[0]) || null;
                        if (!file) return;
                        setIsUploadingSceneImage(true);
                        const urls = await uploadSceneImage(file);
                        if (urls.length > 0) {
                          const curRefs = Array.isArray(script?.[activeIndex]?.ref_image) ? script[activeIndex].ref_image.slice(0,2) : [];
                          updateScriptScene(activeIndex, { ref_image: [urls[0], ...curRefs] });
                        }
                      } finally {
                        setIsUploadingSceneImage(false);
                        if (imageFileInputRef.current) imageFileInputRef.current.value = '';
                      }
                    }}
                  />
                  <button
                    type='button'
                    onClick={() => imageFileInputRef.current && imageFileInputRef.current.click()}
                    className={`w-16 h-16 flex items-center justify-center bg-gray-100 border rounded-lg ${isUploadingSceneImage ? 'opacity-60 cursor-not-allowed' : 'hover:bg-gray-50'}`}
                    disabled={isUploadingSceneImage}
                    title='Upload image'
                  >
                    {isUploadingSceneImage ? '...' : '+'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='col-span-12 lg:col-span-3'>
          <div className='border rounded-xl p-4'>
            <div className='text-sm text-gray-600 mb-2'>Video Duration</div>
            <div className='text-2xl font-semibold'>
              {(() => {
                try {
                  const tl = computeTimelineForIndexByScript(activeIndex);
                  return tl.replace('seconds','sec');
                } catch (_) { return `0 – ${videoDurationSec} sec`; }
              })()}
            </div>
          </div>
        </div>
      </div>

      <div className='flex justify-end gap-3 mt-8'>
        <button onClick={onBack} className='px-5 py-2 rounded-lg border'>Back</button>
        <button onClick={async () => { await onGenerate(script); }} className='px-5 py-2 rounded-lg bg-black text-white'>Generate</button>
      </div>
    </div>
  );
};

const BuildReelWizard = () => {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState({ prompt: '', industry: '', scenes: [], userquery: null });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingScenes, setIsCreatingScenes] = useState(false);
  const [showShortGenPopup, setShowShortGenPopup] = useState(false);
  // Sub-flow: images and videos views similar to Home
  const [subView, setSubView] = useState('editor'); // 'editor' | 'images' | 'videos'
  const [imagesJobId, setImagesJobId] = useState('');
  const [videosJobId, setVideosJobId] = useState('');
  const [hasVideosAvailable, setHasVideosAvailable] = useState(false);
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [showImagesPopup, setShowImagesPopup] = useState(false);

  const handleChange = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSaveScenes = (scenes) => {
    setForm((f) => ({ ...f, scenes }));
  };

  const handleGenerate = async (script) => {
    try {
      setIsGenerating(true);
      // Validate all scenes have narration and description
      const missing = (Array.isArray(script) ? script : []).some(s => !String(s?.narration || '').trim() || !String((s?.desc || s?.description || '')).trim());
      if (missing) {
        try { toast.error('Please fill narration and description for all scenes'); } catch(_) { alert('Please fill narration and description for all scenes'); }
        return;
      }
      setForm((f) => ({ ...f, script }));

      // 1) Build save payload in the simplified format
      const sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) ? localStorage.getItem('session_id') : '';
      if (!sessionId) throw new Error('Missing session_id');
      let uq = [];
      try {
        if (form && form.userquery && Array.isArray(form.userquery.userquery)) {
          uq = form.userquery.userquery;
        } else {
          const raw = localStorage.getItem('buildreel_userquery');
          if (raw) { const parsed = JSON.parse(raw); if (parsed && Array.isArray(parsed.userquery)) uq = parsed.userquery; }
        }
      } catch (_) { /* noop */ }
      if (!Array.isArray(uq)) uq = [];
      const airesponse = Array.isArray(script) ? script : [];
      const body = {
        session_id: sessionId,
        current_script: { userquery: uq, airesponse },
        action: 'save'
      };
      console.log('[BuildReel] create-from-scratch(save) request:', body);
      const saveResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/create-from-scratch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const saveText = await saveResp.text();
      let saveData; try { saveData = JSON.parse(saveText); } catch(_) { saveData = saveText; }
      if (!saveResp.ok) throw new Error(`create-from-scratch(save) failed: ${saveResp.status} ${saveText}`);
      console.log('[BuildReel] create-from-scratch(save) response:', saveData);

      // 2) Load current session snapshot (as per Home flow) and kick off images generation
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Missing login token');
      const sessResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessText = await sessResp.text();
      let sessionData; try { sessionData = JSON.parse(sessText); } catch (_) { sessionData = sessText; }
      if (!sessResp.ok) throw new Error(`user-session/data failed: ${sessResp.status} ${sessText}`);

      // Build request body per /v1/images/generate schema
      const sd = sessionData?.session_data || {};
      const sessionForBody = {
        id: sd.session_id || sessionId,
        user_id: token,
        created_at: sd.created_at || new Date().toISOString(),
        updated_at: sd.updated_at || new Date().toISOString(),
        content: sd.content || [],
        summarydocument: sd.document_summary || [],
        videoduration: String(sd.video_duration ?? 60),
        totalsummary: sd.total_summary || [],
        messages: Array.isArray(sd.messages) ? sd.messages : [],
        scripts: [
          {
            userquery: Array.isArray(sd?.scripts?.[0]?.userquery) ? sd.scripts[0].userquery : [],
            airesponse: Array.isArray(sd?.scripts?.[0]?.airesponse) ? sd.scripts[0].airesponse : [],
            version: sd?.scripts?.[0]?.version || 'v1'
          }
        ],
        videos: sd.videos || [],
        additionalProp1: {}
      };
      const imgBody = { session: sessionForBody };
      const imgResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/images/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(imgBody)
      });
      const imgText = await imgResp.text();
      let imgData; try { imgData = JSON.parse(imgText); } catch (_) { imgData = imgText; }
      if (!imgResp.ok) throw new Error(`images/generate failed: ${imgResp.status} ${imgText}`);

      // Persist job response (job_id, status, status_url, scenes_to_process)
      const jobId = imgData?.job_id || imgData?.jobId || imgData?.id || (Array.isArray(imgData) && imgData[0]?.job_id);
      if (jobId) {
        try { localStorage.setItem('current_images_job_id', jobId); } catch (_) { /* noop */ }
        setImagesJobId(jobId);
      }

      // Show popup for 5s and then open Images list
      setShowImagesPopup(true);
      setTimeout(async () => {
        setShowImagesPopup(false);
        await sendUserSessionData();
        setSubView('images');
      }, 5000);
    } catch (e) {
      console.error('Generate failed:', e);
      try { toast.error(e?.message || 'Failed to generate'); } catch(_) { alert(e?.message || 'Failed to generate'); }
    } finally { setIsGenerating(false); }
  };

  // Session helper used in sub-views
  const sendUserSessionData = async () => {
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) return null;
      const response = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const text = await response.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!response.ok) throw new Error(`user-session/data failed: ${response.status} ${text}`);
      const sd = data?.session_data || {};
      const vids = Array.isArray(sd?.videos) ? sd.videos : [];
      setHasVideosAvailable(vids.length > 0);
      return data;
    } catch (_) { return null; }
  };

  // Generate videos from session images
  const handleGenerateVideosFromImages = async () => {
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) { alert('Login expired'); return; }
      const sessResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessText = await sessResp.text();
      let sessData; try { sessData = JSON.parse(sessText); } catch (_) { sessData = sessText; }
      if (!sessResp.ok) throw new Error(`user-session/data failed: ${sessResp.status} ${sessText}`);
      const sd = sessData?.session_data || {};
      const sessionForBody = {
        id: sd.session_id || sessionId,
        user_id: token,
        title: sd.title || '',
        video_duration: String(sd.video_duration ?? 60),
        created_at: sd.created_at || new Date().toISOString(),
        updated_at: sd.updated_at || new Date().toISOString(),
        document_summary: sd.document_summary || [],
        messages: Array.isArray(sd.messages) ? sd.messages : [],
        total_summary: sd.total_summary || [],
        scripts: [
          {
            userquery: Array.isArray(sd?.scripts?.[0]?.userquery) ? sd.scripts[0].userquery : [],
            airesponse: Array.isArray(sd?.scripts?.[0]?.airesponse) ? sd.scripts[0].airesponse : [],
            version: sd?.scripts?.[0]?.version || 'v1'
          }
        ],
        videos: sd.videos || [],
        images: Array.isArray(sd.images) ? sd.images : (sd.images || [])
      };
      const body = { session: sessionForBody };
      const genResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/videos/generate-from-session', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const genText = await genResp.text();
      let genData; try { genData = JSON.parse(genText); } catch (_) { genData = genText; }
      if (!genResp.ok) throw new Error(`videos/generate-from-session failed: ${genResp.status} ${genText}`);
      const jobId = genData?.job_id || genData?.jobId || genData?.id;
      if (jobId) {
        try { localStorage.setItem('current_video_job_id', jobId); } catch (_) {}
        setVideosJobId(jobId);
      }
      setShowVideoPopup(true);
      setTimeout(() => { setShowVideoPopup(false); setSubView('videos'); }, 5000);
    } catch (e) {
      alert(e?.message || 'Failed to start video generation');
    }
  };

  // Merge final video (same as Home flow)
  const handleGenerateFinalMerge = async () => {
    try {
      const token = localStorage.getItem('token');
      const sessionId = localStorage.getItem('session_id');
      if (!token || !sessionId) { alert('Missing login or session. Please sign in again.'); return; }
      setIsMerging(true);
      setShowVideoPopup(true);
      const sessionResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessionText = await sessionResp.text();
      let sessionData; try { sessionData = JSON.parse(sessionText); } catch (_) { sessionData = sessionText; }
      if (!sessionResp.ok) throw new Error(`user-session/data failed: ${sessionResp.status} ${sessionText}`);
      const sd = sessionData?.session_data || {};
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
      const statusUrl = data?.status_url || null;
      const status = data?.status || 'queued';
      if (jobId) {
        try { localStorage.setItem('current_video_job_id', jobId); } catch (_) { /* noop */ }
        try { if (statusUrl) localStorage.setItem('current_video_job_status_url', statusUrl); } catch (_) { /* noop */ }
        try { localStorage.setItem('current_video_job_type', 'merge'); } catch (_) { /* noop */ }
        try { localStorage.setItem('job_status', status); } catch (_) { /* legacy */ }
      }
      setTimeout(() => {
        setShowVideoPopup(false);
        setIsMerging(false);
        try { window.location && (window.location.href = '/media'); } catch (_) { /* noop */ }
      }, 5000);
    } catch (e) {
      setIsMerging(false);
      setShowVideoPopup(false);
      alert(e?.message || 'Failed to start video merge');
    }
  };

  const createFromScratch = async () => {
    if (isCreatingScenes) return;
    try {
      setIsCreatingScenes(true);
      // Build request per new format
      const sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) ? localStorage.getItem('session_id') : '';
      // Userquery payload from form/localStorage (already shaped as [{ additonalprop1: {...} }])
      let uq = [];
      try {
        if (form && form.userquery && Array.isArray(form.userquery.userquery)) {
          uq = form.userquery.userquery;
        } else {
          const raw = localStorage.getItem('buildreel_userquery');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.userquery)) uq = parsed.userquery;
          }
        }
      } catch (_) { /* noop */ }
      // As a final guard, ensure shape is an array
      if (!Array.isArray(uq)) uq = [];
      const body = {
        session_id: sessionId || '',
        current_script: {
          userquery: Array.isArray(uq) ? uq : [],
          airesponse: []
        },
        action: 'add'
      };
      const endpoint = 'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/create-from-scratch';
      const resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`create-from-scratch failed: ${resp.status} ${text}`);

      // Extract scenes array from response; support both old airesponse and new script format
      const aiArr = data?.session_patch?.append_message?.airesponse
        ?? data?.assistant_message?.airesponse
        ?? data?.airesponse
        ?? data?.script
        ?? [];
      const mapped = mapResponseToScenes(aiArr);
      // Update form with script (canonical) and go to step 2
      setForm((f) => ({ ...f, script: mapped.map((s, i) => ({
        scene_number: i + 1,
        scene_title: s.title || '',
        model: (String(s.type || '').toLowerCase() === 'avatar based') ? 'VEO3' : 'SORA',
        timeline: computeTimelineForIndex(mapped, i),
        narration: s.narration || '',
        desc: s.description || '',
        text_to_be_included: Array.isArray(s.text_to_be_included) ? s.text_to_be_included.slice() : [],
        ref_image: Array.isArray(s.ref_image) ? s.ref_image : [],
        folderLink: s.folderLink || ''
      })) }));
      setStep(2);
    } catch (e) {
      console.error(e);
      alert('Failed to create scenes. Please try again.');
    } finally { setIsCreatingScenes(false); }
  };

  return (
    <>
      {step === 1 ? (
        <StepOne
          values={form}
          onChange={handleChange}
          onSetUserQuery={(uq) => setForm((f) => ({ ...f, ...uq }))}
          onNext={() => setStep(2)}
          onCreateScenes={createFromScratch}
        />
      ) : (
        <>
          {subView === 'editor' && (
            <StepTwo
              values={form}
              onBack={() => setStep(1)}
              onSave={handleSaveScenes}
              onGenerate={handleGenerate}
            />
          )}
          {subView === 'images' && (
            <div className='bg-white rounded-lg w-full'>
              <ImageList
                jobId={imagesJobId}
                hasVideos={hasVideosAvailable}
                onGoToVideos={() => setSubView('videos')}
                onClose={async () => { await sendUserSessionData(); setSubView('editor'); }}
                onGenerateVideos={async () => { await handleGenerateVideosFromImages(); }}
              />
            </div>
          )}
          {subView === 'videos' && (
            <div className='bg-white rounded-lg w-full'>
              <div className='flex items-center justify-between p-4 border-b border-gray-200'>
                <h3 className='text-lg font-semibold text-[#13008B]'>Videos</h3>
                <div className='flex items-center gap-2'>
                  <button onClick={async () => { await sendUserSessionData(); setSubView('images'); }} className='px-3 py-1.5 rounded-lg border text-sm'>Back</button>
                  <button onClick={handleGenerateFinalMerge} className='px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800'>Generate Video</button>
                </div>
              </div>
              <VideosList jobId={videosJobId} onClose={async () => { await sendUserSessionData(); setSubView('images'); }} />
            </div>
          )}
        </>
      )}
      {showShortGenPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-[100%] max-w-sm rounded-lg shadow-xl p-6 text-center">
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <h4 className="text-lg font-semibold text-gray-900">Generating Video…</h4>
            <p className="mt-1 text-sm text-gray-600">You’ll be redirected to My Media shortly.</p>
          </div>
        </div>
      )}
      {showVideoPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-[100%] max-w-sm rounded-lg shadow-xl p-6 text-center">
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <h4 className="text-lg font-semibold text-gray-900">{isMerging ? 'Merging video…' : 'Generating Video…'}</h4>
            <p className="mt-1 text-sm text-gray-600">{isMerging ? 'Redirecting to Media…' : 'Opening Videos list…'}</p>
          </div>
        </div>
      )}
      {showImagesPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-[100%] max-w-sm rounded-lg shadow-xl p-6 text-center">
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <h4 className="text-lg font-semibold text-gray-900">Generating Images…</h4>
            <p className="mt-1 text-sm text-gray-600">Opening Images list…</p>
          </div>
        </div>
      )}
    </>
  );
};

export default BuildReelWizard;
