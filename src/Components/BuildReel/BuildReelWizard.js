import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { FaPlus, FaAngleRight, FaEyeDropper, FaAngleUp, FaAngleDown, FaCheck, FaMicrophone } from 'react-icons/fa';
import { HexColorPicker } from 'react-colorful';
import useBrandAssets from '../../hooks/useBrandAssets';
import { toast } from 'react-hot-toast';
import ImageList from '../Scenes/ImageList';
import VideosList from '../Scenes/VideosList';

// Helper to preserve ALL fields from session_data including nested structures
const sanitizeSessionSnapshot = (sessionData = {}, sessionId = '', token = '') => {
  // Start with a deep copy to preserve ALL fields including nested structures
  const base =
    sessionData && typeof sessionData === 'object' && !Array.isArray(sessionData)
      ? JSON.parse(JSON.stringify(sessionData)) // Deep copy to preserve all nested fields
      : {};
  
  // Only normalize/transform specific fields, preserve everything else
  if (base.id && !base.session_id) base.session_id = base.id;
  delete base.id;
  base.session_id = base.session_id || sessionId || '';
  base.user_id = base.user_id || token || '';
  
  // Normalize video_duration but preserve if already exists
  if (base.videoduration && !base.video_duration) base.video_duration = base.videoduration;
  base.video_duration = String(base.video_duration || '60');
  
  // Ensure dates exist
  if (!base.created_at) base.created_at = new Date().toISOString();
  if (!base.updated_at) base.updated_at = new Date().toISOString();
  
  // Ensure arrays exist (but preserve their contents including all nested fields)
  if (!Array.isArray(base.content)) base.content = [];
  if (!Array.isArray(base.document_summary)) base.document_summary = [];
  if (!Array.isArray(base.messages)) base.messages = [];
  if (Array.isArray(base.totalsummary) && !Array.isArray(base.total_summary)) {
    base.total_summary = base.totalsummary;
  }
  if (!Array.isArray(base.total_summary)) base.total_summary = [];
  if (!Array.isArray(base.scripts)) base.scripts = [];
  if (!Array.isArray(base.videos)) base.videos = [];
  if (!Array.isArray(base.images)) base.images = [];
  
  // Preserve final_link if it exists
  if (base.final_link === undefined || base.final_link === null) base.final_link = '';
  
  // Normalize videoType
  if (!base.videoType && base.video_type) base.videoType = base.video_type;
  
  // Ensure brand_style_interpretation is an object
  if (!base.brand_style_interpretation || typeof base.brand_style_interpretation !== 'object') {
    base.brand_style_interpretation = {};
  }
  
  // Remove unwanted fields but preserve all others (including opening_frame, closing_frame, background_frame, animation_desc in scripts)
  if ('additionalProp1' in base) delete base.additionalProp1;
  if ('user_data' in base) delete base.user_data;
  if ('user' in base) delete base.user;
  delete base.videoduration;
  delete base.video_type;
  delete base.totalsummary;
  
  // All other fields (including nested structures in scripts/scenes) are preserved
  return base;
};

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
    if (m === 'PLOTLY') return 'Financial';
    return 'Infographic';
  };
  const typeToModel = (type) => {
    const t = String(type || '').toLowerCase();
    if (t === 'avatar based') return 'VEO3';
    if (t === 'infographic') return 'SORA';
    if (t === 'financial') return 'PLOTLY';
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
  // Options aligned with Guidelines layout
  const goalsOptions = [
    { id: "Promote", label: "Promote" },
    { id: "Inform", label: "Inform" },
    { id: "Summarize", label: "Summarize" },
    { id: "Educate", label: "Educate" },
    { id: "other", label: "Other" },
  ];
  const audienceOptions = [
    { id: "Investors", label: "Investors" },
    { id: "Clients", label: "Clients" },
    { id: "Colleagues", label: "Colleagues" },
    { id: "Students", label: "Students" },
    { id: "General public", label: "General public" },
    { id: "other", label: "Other (please specify)" },
  ];
  const toneOptions = [
    { id: "professional", label: "Professional" },
    { id: "casual", label: "Casual" },
    { id: "humorous", label: "Humorous" },
    { id: "inspiring", label: "Inspiring" },
    { id: "formal", label: "Formal" },
  ];

  // Accordion open states (matching Guidelines.js pattern)
  const [openPurpose, setOpenPurpose] = useState(false);
  const [openStyle, setOpenStyle] = useState(false);
  const [openAudio, setOpenAudio] = useState(false);
  const [openTechnical, setOpenTechnical] = useState(false);

  // Function to close all accordions except the one being opened (matching Guidelines.js)
  const handleAccordionToggle = (accordionName) => {
    setOpenPurpose(accordionName === 'purpose');
    setOpenStyle(accordionName === 'style');
    setOpenAudio(accordionName === 'audio');
    setOpenTechnical(accordionName === 'technical');
  };

  // User Query fields
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [tone, setTone] = useState('professional');
  const [audience, setAudience] = useState('Investors');
  const [otherAudienceText, setOtherAudienceText] = useState('');
  const [goal, setGoal] = useState('Promote');
  const [otherGoalText, setOtherGoalText] = useState('');
  // Font styles state (matching Guidelines.js)
  const [selectedFont, setSelectedFont] = useState('no'); // 'yes' | 'no'
  const [selectedFonts, setSelectedFonts] = useState(['Poppins']); // Array of selected fonts
  const [isFontOpen, setIsFontOpen] = useState(false);
  // Legacy fontStyles state for backward compatibility
  const [fontStyles, setFontStyles] = useState(['Poppins']);
  const optionsFont = [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
  ];
  const fontOptions = [
    'Poppins','Inter','Roboto','Open Sans','Lato','Montserrat','Nunito','Source Sans Pro','Merriweather','Playfair Display','Raleway','Oswald','Ubuntu','PT Sans','Noto Sans','Fira Sans','Rubik','Mulish','Josefin Sans','Work Sans','Karla','Quicksand','Barlow','Heebo','Hind','Manrope','IBM Plex Sans','IBM Plex Serif','Archivo','Catamaran','DM Sans','DM Serif Display','Cabin','Titillium Web','Bebas Neue','Anton','Inconsolata','Space Mono','Arial','Helvetica','Times New Roman','Georgia','Verdana','Tahoma','Trebuchet MS','Courier New','Segoe UI'
  ];
  const handleSelectFont = (font) => {
    if (!selectedFonts.includes(font)) {
      setSelectedFonts([...selectedFonts, font]);
    }
    setIsFontOpen(false);
  };
  const removeFont = (font) => {
    setSelectedFonts(selectedFonts.filter((f) => f !== font));
  };
  // Sync selectedFonts with fontStyles for backward compatibility
  useEffect(() => {
    if (selectedFont === 'yes' && selectedFonts.length > 0) {
      setFontStyles(selectedFonts);
    } else if (selectedFont === 'no') {
      setFontStyles([]);
    }
  }, [selectedFont, selectedFonts]);
  // Color palette state (Guidelines-style)
  const [selectedColors, setSelectedColors] = useState(new Set());
  const [customColors, setCustomColors] = useState([]);
  const [currentColor, setCurrentColor] = useState('#279CF5');
  const colorInputRef = useRef(null);
  // Logo inclusion state (matching Guidelines.js)
  const [selectedLogo, setSelectedLogo] = useState('no'); // 'yes' | 'no'
  const [selectedLogoUrl, setSelectedLogoUrl] = useState('');
  const [logoSelectMode, setLogoSelectMode] = useState('assets'); // 'assets' | 'upload'
  const optionsLogo = [
    { id: 'yes', label: 'Yes' },
    { id: 'no', label: 'No' },
  ];
  // Legacy state for backward compatibility
  const [logoAnswer, setLogoAnswer] = useState('No');
  const [logoLink, setLogoLink] = useState('');
  const [logoPreviewUrl, setLogoPreviewUrl] = useState('');
  const [brandLogos, setBrandLogos] = useState([]);
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const logoFileInputRef = useRef(null);
  
  // Sync selectedLogo with logoAnswer for backward compatibility
  useEffect(() => {
    if (selectedLogo === 'yes') {
      setLogoAnswer('Yes');
      if (selectedLogoUrl) {
        setLogoLink(selectedLogoUrl);
        setLogoPreviewUrl(selectedLogoUrl);
      }
    } else {
      setLogoAnswer('No');
      setLogoLink('');
      setLogoPreviewUrl('');
    }
  }, [selectedLogo, selectedLogoUrl]);
  // Captions/Subtitles (shareable)
  const [selectedShareable, setSelectedShareable] = useState('no');
  const optionsShareable = [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ];
  const handleSelectShareable = (id) => setSelectedShareable(id);
  const [audioAnswer, setAudioAnswer] = useState('Yes');
  const [voiceLink, setVoiceLink] = useState('');
  const [preferredVoiceName, setPreferredVoiceName] = useState('');
  const [voiceFileName, setVoiceFileName] = useState('');
  const [voicePreviewUrl, setVoicePreviewUrl] = useState('');
  const voiceInputRef = useRef(null);
  const [selectedVoiceFromLibrary, setSelectedVoiceFromLibrary] = useState(null);
  // Brand voices + recording
  const { getBrandAssetsByUserId, uploadBrandAssets, uploadBrandFiles, updateBrandAssets } = useBrandAssets();
  const [brandVoices, setBrandVoices] = useState([]); // Store full voice objects, not just URLs
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
  
  // Extract voice name from voice object (matching Guidelines.js)
  const extractBrandVoiceName = useCallback((voice, index) => {
    if (!voice) return `Voice ${index + 1}`;
    if (typeof voice === 'object' && voice !== null) {
      const candidates = [
        voice.name,
        voice.voiceover_name,
        voice.voice_name,
        voice.voiceName,
        voice.title,
        voice.display_name,
        voice.label
      ];
      const match = candidates.find(value => typeof value === 'string' && value.trim());
      if (match) return match.trim();
    }
    // If voice is a string (URL), try to extract name from URL
    if (typeof voice === 'string') {
      try {
        const parts = voice.split('/');
        const last = parts[parts.length - 1] || '';
        const name = (last.split('?')[0] || '').split('.')[0] || '';
        if (name) return name;
      } catch (_) {}
    }
    return `Voice ${index + 1}`;
  }, []);
  
  // Filter voiceovers by selected tone when Audio is "Yes" (matching Guidelines.js)
  const uniqueBrandVoiceOptions = useMemo(() => {
    let source = Array.isArray(brandVoices) ? brandVoices : [];
    
    // If Audio is selected as "Yes", filter by tone type
    if (audioAnswer === 'Yes' && tone) {
      source = source.filter(voice => {
        const voiceType = (typeof voice === 'object' && voice !== null)
          ? (voice.type || voice.tone || voice.voice_type || '')
          : '';
        return voiceType.toLowerCase() === tone.toLowerCase();
      });
    }
    
    const seen = new Map();
    return source.reduce((acc, voice, index) => {
      const name = extractBrandVoiceName(voice, index);
      const key = name.trim().toLowerCase();
      if (!seen.has(key)) {
        seen.set(key, true);
        const url = typeof voice === 'string' ? voice : (voice?.url || voice?.link || '');
        acc.push({ name, index, originalVoice: voice, url });
      }
      return acc;
    }, []);
  }, [brandVoices, extractBrandVoiceName, audioAnswer, tone]);
  // Technical & Format Constraints state (matching Guidelines.js)
  const [selectedDuration, setSelectedDuration] = useState('upto1'); // Default to "Up to 1 minute"
  const optionsDuration = [
    { id: 'upto1', label: 'Up to 1 minute' },
    { id: '1to2', label: '1-2 minutes' },
    { id: '2to3', label: '2-3 minutes' },
    { id: '3to5', label: '3-5 minutes' },
    { id: 'longer5', label: 'Longer than 5 minutes' },
  ];
  const handleSelectDuration = (id) => setSelectedDuration(id);
  
  const [selectedFormat, setSelectedFormat] = useState('mp4'); // Default to "MP4"
  const [otherFormatText, setOtherFormatText] = useState('');
  const optionsFormat = [
    { id: 'mp4', label: 'MP4' },
    { id: 'mov', label: 'MOV' },
    { id: 'embedded', label: 'Embedded video link' },
    { id: 'other', label: 'Other (please specify)' },
  ];
  const handleSelectFormat = (id) => setSelectedFormat(id);
  
  const [selectedAspect, setSelectedAspect] = useState('16_9'); // Default to "16:9 (Standard widescreen)"
  const [otherAspectText, setOtherAspectText] = useState('');
  const [customAspectWidth, setCustomAspectWidth] = useState('');
  const [customAspectHeight, setCustomAspectHeight] = useState('');
  const optionsAspect = [
    { id: '16_9', label: '16:9 (Standard widescreen)' },
    { id: '9_16', label: '9:16 (Vertical, ideal for TikTok, Reels, Stories)' },
    { id: 'custom', label: 'Custom aspect ratio' },
  ];
  const handleSelectAspect = (id) => setSelectedAspect(id);
  
  // Legacy state for backward compatibility
  const [aspectRatio, setAspectRatio] = useState('9:16 (Vertical, ideal for TikTok, Stories)');
  const [videoFormat, setVideoFormat] = useState('MP4');
  const [videoLength, setVideoLength] = useState('1 -2 minutes');
  const [contentEmphasisCsv, setContentEmphasisCsv] = useState('');
  
  // Sync new state with legacy state
  useEffect(() => {
    // Map selectedDuration to videoLength
    const durationMap = {
      'upto1': '0-30 seconds',
      '1to2': '1 -2 minutes',
      '2to3': '2-3 minutes',
      '3to5': '3-5 minutes',
      'longer5': 'Longer than 5 minutes',
    };
    if (durationMap[selectedDuration]) {
      setVideoLength(durationMap[selectedDuration]);
    }
    
    // Map selectedFormat to videoFormat
    const formatMap = {
      'mp4': 'MP4',
      'mov': 'MOV',
      'embedded': 'Embedded video link',
      'other': otherFormatText || 'MP4',
    };
    if (selectedFormat !== 'other') {
      setVideoFormat(formatMap[selectedFormat] || 'MP4');
    } else {
      setVideoFormat(otherFormatText || 'MP4');
    }
    
    // Map selectedAspect to aspectRatio
    const aspectMap = {
      '16_9': '16:9 (Standard widescreen)',
      '9_16': '9:16 (Vertical, ideal for TikTok, Stories)',
      'custom': otherAspectText || '16:9 (Standard widescreen)',
    };
    if (selectedAspect !== 'custom') {
      setAspectRatio(aspectMap[selectedAspect] || '16:9 (Standard widescreen)');
    } else {
      setAspectRatio(otherAspectText || '16:9 (Standard widescreen)');
    }
  }, [selectedDuration, selectedFormat, selectedAspect, otherFormatText, otherAspectText]);

  // Load brand voices and logos from Brand Assets API
  useEffect(() => {
    const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';
    if (!token) return;
    (async () => {
      try {
        const assets = await getBrandAssetsByUserId(token);
        // Store full voice objects, not just URLs (matching Guidelines.js)
        const voices = Array.isArray(assets?.voiceovers)
          ? assets.voiceovers
          : (Array.isArray(assets?.voiceover) ? assets.voiceover : (assets?.voices || []));
        setBrandVoices(voices);
        // Fetch logos from brand_identity.logo (matching Guidelines.js)
        const current = assets || {};
        const bi = current?.brand_identity || {};
        const logosNow = Array.isArray(bi.logo) 
          ? bi.logo 
          : (Array.isArray(current?.logos) 
            ? current.logos 
            : (Array.isArray(current?.logo) ? current.logo : []));
        const logoUrls = (logosNow || []).map(l => (typeof l === 'string' ? l : (l?.url || l?.link || ''))).filter(Boolean);
        setBrandLogos(logoUrls);
      } catch (_) { /* noop */ }
    })();
  }, [getBrandAssetsByUserId]);

  // (Removed StepOne-level assets modal; handled in StepTwo)

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mime = (window.MediaRecorder && MediaRecorder.isTypeSupported('audio/webm')) ? 'audio/webm' : '';
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
      mediaRecorderRef.current = mr;
      recordedChunksRef.current = [];
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data); };
      mr.onstop = async () => {
        try {
          const blob = new Blob(recordedChunksRef.current, { type: mime || 'audio/webm' });
          const url = URL.createObjectURL(blob);
          setPendingVoiceBlobs(prev => [...prev, blob]);
          setPendingVoiceUrls(prev => [...prev, url]);
          if (audioPreviewRef.current) audioPreviewRef.current.src = url;
        } catch (e) { console.error(e); }
        setIsRecording(false);
        try { stream.getTracks().forEach(t => t.stop()); } catch(_){}
      };
      mr.start();
      setIsRecording(true);
    } catch (_) { alert('Unable to access microphone.'); }
  };
  const stopRecording = () => { 
    try { 
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
    } catch(_){} 
  };

  // Add Voice modal (upload/record) - matching Guidelines.js
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const voiceModalFileInputRef = useRef(null);
  const [voiceFilesForUpload, setVoiceFilesForUpload] = useState([]);
  const [pendingVoiceBlobs, setPendingVoiceBlobs] = useState([]);
  const [pendingVoiceUrls, setPendingVoiceUrls] = useState([]);
  const [isSavingBrandVoices, setIsSavingBrandVoices] = useState(false);
  const [voiceSaveMsg, setVoiceSaveMsg] = useState('');
  const [voiceModalTab, setVoiceModalTab] = useState('record');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [voiceName, setVoiceName] = useState('');
  
  // Recording timer effect (matching Guidelines.js)
  useEffect(() => {
    let t;
    if (isRecording) {
      setElapsedSec(0);
      t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    }
    return () => { if (t) clearInterval(t); };
  }, [isRecording]);
  
  // Recording helper: sample script based on selected tone/style (matching Guidelines.js)
  const getRecordingSample = () => {
    if (tone === 'other' && otherGoalText) {
      return `Sample (${otherGoalText}): Hi there, let me walk you through the highlights.`;
    }
    switch (tone) {
      case 'professional':
        return 'Sample (Professional): Hello, and welcome. Let\'s review the key points.';
      case 'casual':
        return 'Sample (Casual): Hey! Super excited to show you what we\'ve got.';
      case 'humorous':
        return 'Sample (Humorous): Alright, buckle up—this will be fun and informative!';
      case 'inspiring':
        return 'Sample (Inspiring): Together, we can achieve more—let\'s dive in.';
      case 'formal':
        return 'Sample (Formal): Good day. This presentation outlines the essential details.';
      default:
        return 'Sample: Hi there, let me walk you through the highlights.';
    }
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

  const goalForPayload = goal === 'other' ? (otherGoalText || '') : goal;
  const audienceForPayload = audience === 'other' ? (otherAudienceText || '') : audience;

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
            audience: audienceForPayload,
            audience_other: audience === 'other' ? otherAudienceText : '',
            goal_of_video: goalForPayload,
            goal_other: goal === 'other' ? otherGoalText : '',
          },
          style_and_visual_pref: {
            font_style: selectedFont === 'yes' ? (Array.isArray(selectedFonts) ? selectedFonts : []) : [],
            color_pallete: Array.from(selectedColors || []),
            logo_inclusion: selectedLogo === 'yes'
              ? [{ answer: 'Yes', imageLink: (selectedLogoUrl || '') }]
              : (selectedLogo === 'no' ? [{ answer: 'No', imageLink: '' }] : []),
          },
          content_focus_and_emphasis: contentEmphasisCsv.split(',').map((s) => s.trim()).filter(Boolean),
          technical_and_formal_constraints: {
            aspect_ratio: (() => {
              if (selectedAspect === 'custom' || selectedAspect === 'other') {
                if (customAspectWidth && customAspectHeight) return `${customAspectWidth}:${customAspectHeight}`;
                return otherAspectText || aspectRatio;
              }
              const aspectMap = {
                '16_9': '16:9 (Standard widescreen)',
                '9_16': '9:16 (Vertical, ideal for TikTok, Reels, Stories)',
              };
              return aspectMap[selectedAspect] || aspectRatio;
            })(),
            video_format: selectedFormat === 'other' ? (otherFormatText || videoFormat) : (selectedFormat === 'mp4' ? 'MP4' : selectedFormat === 'mov' ? 'MOV' : selectedFormat === 'embedded' ? 'Embedded video link' : videoFormat),
            video_length: (() => {
              const durationMap = {
                'upto1': 'Up to 1 minute',
                '1to2': '1-2 minutes',
                '2to3': '2-3 minutes',
                '3to5': '3-5 minutes',
                'longer5': 'Longer than 5 minutes',
              };
              return durationMap[selectedDuration] || videoLength;
            })(),
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
  React.useEffect(() => { syncUp(); }, [videoTitle, videoDesc, tone, audience, goal, fontStyles, selectedFont, selectedFonts, selectedColors, customColors, currentColor, logoAnswer, logoLink, logoPreviewUrl, selectedLogo, selectedLogoUrl, audioAnswer, voiceLink, voicePreviewUrl, preferredVoiceName, aspectRatio, videoFormat, videoLength, selectedDuration, selectedFormat, selectedAspect, otherFormatText, otherAspectText, customAspectWidth, customAspectHeight, contentEmphasisCsv]);

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
      const hydratedAudience = p.purpose_and_audience?.audience || 'Investors';
      setAudience(hydratedAudience);
      if (hydratedAudience === 'other') {
        setOtherAudienceText(p.purpose_and_audience?.audience_other || '');
      }
      const hydratedGoal = p.purpose_and_audience?.goal_of_video || 'Promote';
      setGoal(hydratedGoal);
      if (hydratedGoal === 'other') {
        setOtherGoalText(p.purpose_and_audience?.goal_other || '');
      }
      if (Array.isArray(p.style_and_visual_pref?.font_style)) {
        const fonts = p.style_and_visual_pref.font_style;
        setFontStyles(fonts);
        setSelectedFonts(fonts);
        setSelectedFont(fonts.length > 0 ? 'yes' : 'no');
      }
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
    <div className='bg-white h-[100vh] w-full rounded-lg p-[20px] overflow-y-scroll scrollbar-hide'>
      <div className='flex justify-between items-center mb-4'>
        <div className='flex flex-col justify-start items-start gap-2'>
          <h2 className='text-[25px]'>Generate Your Custom Video</h2>
          <p className='text-[15px] text-gray-500'>Fill in all the Mandatory details and Generate Video</p>
        </div>
      </div>

      {/* Title and Description (Basics) - Keep at top */}
      <div className='mb-4'>
        <input
          value={videoTitle}
          onChange={(e)=>setVideoTitle(e.target.value)}
          placeholder='Add a Video Title'
          className='w-full p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13008B]'
        />
      </div>
      <div className='mb-6'>
        <textarea
          rows={4}
          value={videoDesc}
          onChange={(e) => setVideoDesc(e.target.value)}
          placeholder='Describe your video...'
          className='w-full p-4 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13008B]'
        />
      </div>

      {/* Accordions for user query - Matching Guidelines.js layout */}
      <div>
        {/* Purpose & Audience */}
        <div
          onClick={() => handleAccordionToggle('purpose')}
          className="w-full cursor-pointer mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between"
        >
          <span className="text-[18px] text-gray-600">Purpose and Audience</span>
          {openPurpose ? <FaAngleUp /> : <FaAngleDown />}
        </div>
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${openPurpose ? "max-h-[2000px] mt-4 opacity-100" : "max-h-0 opacity-0"}`}
        >
          {/* Goal of the video */}
          <div className="w-full flex-col bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
                <div className="flex justify-between items-center">
                  <span className="text-[18px] text-gray-600">Goal of the video</span>
                </div>
                <div className="mt-4">
                  <div className="flex flex-col gap-3">
                    {goalsOptions.map((g) => (
                      <div key={g.id} className="flex items-center gap-3">
                        <button
                          onClick={() => setGoal(g.id)}
                          className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                            goal === g.id ? "bg-green-500 border-green-500" : "bg-white border-gray-400"
                          }`}
                        >
                          {goal === g.id && <FaCheck className="text-white text-sm" />}
                        </button>
                        <label
                          onClick={() => setGoal(g.id)}
                          className="cursor-pointer"
                        >
                          {g.label}
                        </label>
                        {g.id === "other" && goal === "other" && (
                          <input
                            type="text"
                            value={otherGoalText}
                            onChange={(e) => setOtherGoalText(e.target.value)}
                            placeholder="Please specify"
                            className="border-b border-gray-400 outline-none ml-2"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            {/* Audience */}
            <div className="w-full flex-col mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
              <div className="flex justify-between items-center">
                <span className="text-[18px] text-gray-600">Audience</span>
              </div>
              <div className="mt-4">
                <div className="flex flex-col gap-3">
                  {audienceOptions.map((aud) => (
                    <div key={aud.id} className="flex items-center gap-3">
                      <button
                        onClick={() => setAudience(aud.id)}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                          audience === aud.id ? "bg-green-500 border-green-500" : "bg-white border-gray-400"
                        }`}
                      >
                        {audience === aud.id && <FaCheck className="text-white text-sm" />}
                      </button>
                      <label
                        onClick={() => setAudience(aud.id)}
                        className="cursor-pointer"
                      >
                        {aud.label}
                      </label>
                      {aud.id === "other" && audience === "other" && (
                        <input
                          type="text"
                          value={otherAudienceText}
                          onChange={(e) => setOtherAudienceText(e.target.value)}
                          placeholder="Please specify"
                          className="border-b border-gray-400 outline-none ml-2"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Tone */}
            <div className="w-full flex-col mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
              <div className="flex justify-between items-center">
                <span className="text-[18px] text-gray-600">Tone or Style</span>
              </div>
              <div className="mt-4">
                <div className="flex flex-col gap-3">
                  {toneOptions.map((t) => (
                    <div key={t.id} className="flex items-center gap-3">
                      <button
                        onClick={() => setTone(t.id)}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                          tone === t.id ? "bg-green-500 border-green-500" : "bg-white border-gray-400"
                        }`}
                      >
                        {tone === t.id && <FaCheck className="text-white text-sm" />}
                      </button>
                      <label
                        onClick={() => setTone(t.id)}
                        className="cursor-pointer"
                      >
                        {t.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
        </div>

        {/* Style & Visual Preferences */}
        <div
          onClick={() => handleAccordionToggle('style')}
          className="w-full cursor-pointer mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between"
        >
          <span className="text-[18px] text-gray-600">Style and Visual Preferences</span>
          {openStyle ? <FaAngleUp /> : <FaAngleDown />}
        </div>
        <div
          className={`transition-all duration-500 ease-in-out ${openStyle ? "max-h-[2000px] mt-4 opacity-100 overflow-visible" : "max-h-0 opacity-0 overflow-hidden"}`}
        >
          {openStyle && (
            <div className="w-full flex-col bg-white rounded-xl flex">
              <div className="flex flex-col gap-6">
                {/* Logo Inclusion */}
                <div className="w-full flex-col bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
                  <span className="text-[18px] text-gray-600 mb-3">Logo inclusion</span>
                  <div className="flex flex-col gap-3">
                    {optionsLogo.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedLogo(opt.id)}
                          className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                        ${selectedLogo === opt.id
                            ? "bg-green-500 border-green-500"
                            : "bg-white border-gray-400"
                          }`}
                        >
                          {selectedLogo === opt.id && (
                            <FaCheck className="text-white text-sm" />
                          )}
                        </button>
                        <label
                          onClick={() => setSelectedLogo(opt.id)}
                          className="cursor-pointer"
                        >
                          {opt.label}
                        </label>
                      </div>
                    ))}
                    {selectedLogo === 'yes' && (
                      <div className="mt-2 border rounded-lg p-3">
                        <div className="flex items-center gap-2 mb-3">
                          <button onClick={() => setLogoSelectMode('assets')} className={`px-3 py-1.5 rounded-md text-sm ${logoSelectMode==='assets' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>From Brand Assets</button>
                          <button onClick={() => setLogoSelectMode('upload')} className={`px-3 py-1.5 rounded-md text-sm ${logoSelectMode==='upload' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>Upload Image</button>
                        </div>
                        {logoSelectMode === 'assets' ? (
                          <div>
                            {Array.isArray(brandLogos) && brandLogos.length > 0 ? (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {brandLogos.map((u, i) => {
                                  const url = typeof u === 'string' ? u : (u?.url || '');
                                  if (!url) return null;
                                  const active = selectedLogoUrl === url;
                                  return (
                                    <button key={i} onClick={() => setSelectedLogoUrl(url)} className={`border rounded-lg p-2 flex items-center justify-center bg-white hover:bg-gray-50 ${active ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200'}`}>
                                      <img src={url} alt={`Logo ${i+1}`} className="max-h-16 object-contain" />
                                    </button>
                                  )
                                })}
                              </div>
                            ) : (
                              <p className="text-sm text-gray-600">No logos found in Brand Assets.</p>
                            )}
                          </div>
                        ) : (
                          <div>
                            <input ref={logoFileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                              const file = e.target.files && e.target.files[0];
                              if (!file) return;
                              const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';
                              if (!token) return;
                              try {
                                setIsLogoUploading(true);
                                // 1) Upload via upload-file
                                await uploadBrandFiles({ userId: token, fileType: 'logo', files: [file] });
                                // 2) GET full latest brand assets
                                const latest = await getBrandAssetsByUserId(token);
                                const current = latest || {};
                                const bi = current?.brand_identity || {};
                                const logosNow = Array.isArray(bi.logo) ? bi.logo : (Array.isArray(current?.logos) ? current.logos : (Array.isArray(current?.logo) ? current.logo : []));
                                // 3) UPDATE full assets payload, ensuring logo includes any new URLs from GET
                                const payload = {
                                  brand_identity: {
                                    fonts: bi.fonts || [],
                                    icon: bi.icon || bi.icons || [],
                                    colors: bi.colors || [],
                                    spacing: bi.spacing,
                                    tagline: bi.tagline,
                                    logo: logosNow || []
                                  },
                                  tone_and_voice: current?.tone_and_voice || {},
                                  look_and_feel: current?.look_and_feel || {},
                                  template: current?.template || current?.templates || [],
                                  voiceover: current?.voiceover || current?.voiceovers || []
                                };
                                await updateBrandAssets({ userId: token, payload });
                                // 4) GET again and refresh UI list
                                const finalAssets = await getBrandAssetsByUserId(token);
                                const finalLogos = Array.isArray(finalAssets?.brand_identity?.logo)
                                  ? finalAssets.brand_identity.logo
                                  : (Array.isArray(finalAssets?.logos)
                                    ? finalAssets.logos
                                    : (Array.isArray(finalAssets?.logo) ? finalAssets.logo : []));
                                setBrandLogos(finalLogos);
                                const lastSel = finalLogos && finalLogos.length ? (typeof finalLogos[finalLogos.length-1] === 'string' ? finalLogos[finalLogos.length-1] : (finalLogos[finalLogos.length-1]?.url || '')) : '';
                                if (lastSel) setSelectedLogoUrl(lastSel);
                              } catch (_) { /* noop */ }
                              finally { setIsLogoUploading(false); e.target.value=''; }
                            }} />
                            <button onClick={() => logoFileInputRef.current && logoFileInputRef.current.click()} className={`px-3 py-2 rounded-md text-sm ${isLogoUploading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`} disabled={isLogoUploading}>
                              <span className="inline-flex items-center gap-2">
                                {isLogoUploading && (<span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />)}
                                {isLogoUploading ? 'Uploading…' : 'Choose Image'}
                              </span>
                            </button>
                            {selectedLogoUrl && (
                              <div className="mt-3">
                                <p className="text-xs text-gray-600 mb-1">Selected logo preview</p>
                                <div className="border rounded-lg p-2 inline-flex bg-white">
                                  <img src={selectedLogoUrl} alt="Selected logo" className="h-16 object-contain" />
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Captions/Subtitles */}
                <div className="w-full flex-col mt-0 bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
                  <span className="text-[18px] text-gray-600 mb-3">Would you like captions or subtitles included</span>
                  <div className="flex justify-start items-start gap-2 bg-white">
                    <div className="flex flex-col gap-3">
                      {optionsShareable.map((opt) => (
                        <div key={opt.id} className="flex items-center gap-3">
                          <button
                            onClick={() => handleSelectShareable(opt.id)}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                              selectedShareable === opt.id ? "bg-green-500 border-green-500" : "bg-white border-gray-400"
                            }`}
                          >
                            {selectedShareable === opt.id && (
                              <FaCheck className="text-white text-sm" />
                            )}
                          </button>
                          <label
                            onClick={() => handleSelectShareable(opt.id)}
                            className="cursor-pointer"
                          >
                            {opt.label}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Specific color schemes */}
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

                {/* Font styles */}
                <div className="w-full flex-col bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
                  <span className="text-[18px] text-gray-600 mb-3">Font styles</span>
                  <div className="flex flex-col gap-3">
                    {optionsFont.map((opt) => (
                      <div key={opt.id} className="flex items-center gap-3">
                        <button
                          onClick={() => setSelectedFont(opt.id)}
                          className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                        ${selectedFont === opt.id
                            ? "bg-green-500 border-green-500"
                            : "bg-white border-gray-400"
                          }`}
                        >
                          {selectedFont === opt.id && (
                            <FaCheck className="text-white text-sm" />
                          )}
                        </button>
                        <label
                          onClick={() => setSelectedFont(opt.id)}
                          className="cursor-pointer"
                        >
                          {opt.label}
                        </label>
                      </div>
                    ))}
                    {selectedFont === 'yes' && (
                      <div className="mt-3 w-full">
                        <div className="relative z-40">
                          <button
                            type="button"
                            onClick={() => setIsFontOpen((o) => !o)}
                            className="w-full h-12 border border-gray-300 rounded-lg px-3 flex items-center justify-between bg-white"
                          >
                            <div className="flex flex-wrap gap-2">
                              {selectedFonts.length === 0 && (
                                <span className="text-gray-400">Select fonts</span>
                              )}
                              {selectedFonts.map((font) => (
                                <span
                                  key={font}
                                  className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm inline-flex items-center gap-2"
                                  style={{ fontFamily: font }}
                                >
                                  {font}
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      removeFont(font);
                                    }}
                                    className="hover:text-red-500"
                                  >
                                    ×
                                  </button>
                                </span>
                              ))}
                            </div>
                            <span className="text-gray-400">{isFontOpen ? '▲' : '▼'}</span>
                          </button>

                          {isFontOpen && (
                            <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                              {fontOptions.map((font) => (
                                <button
                                  key={font}
                                  type="button"
                                  onClick={() => handleSelectFont(font)}
                                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${selectedFonts.includes(font)?'bg-indigo-50':''}`}
                                  style={{ fontFamily: font }}
                                >
                                  {font}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Audio & Effects */}
        <div
          onClick={() => handleAccordionToggle('audio')}
          className="w-full cursor-pointer mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between"
        >
          <span className="text-[18px] text-gray-600">Audio and Effects</span>
          {openAudio ? <FaAngleUp /> : <FaAngleDown />}
        </div>
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${openAudio ? "max-h-[2000px] mt-4 opacity-100" : "max-h-0 opacity-0"}`}
        >
          {openAudio && (
            <div className="w-full flex-col bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
              <div className="flex flex-col gap-4">
                <div className="w-full flex-col bg-white rounded-xl flex">
                  <span className="text-[18px] text-gray-600 mb-3">Would you like to add voice narration or voice-over?</span>
                  <div className="flex flex-col gap-3">
                    {['Yes', 'No'].map((v) => (
                      <div key={v} className="flex items-center gap-3 cursor-pointer" onClick={() => setAudioAnswer(v)}>
                        <button
                          className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${
                            audioAnswer === v ? 'bg-green-500 border-green-500' : 'bg-white border-gray-400'
                          }`}
                        >
                          {audioAnswer === v && <FaCheck className="text-white text-sm" />}
                        </button>
                        <label className="cursor-pointer">{v}</label>
                      </div>
                    ))}
                  </div>
                </div>

                {audioAnswer === 'Yes' && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                    <h4 className="text-[16px] font-medium text-gray-700 mb-3">Select Your Preferred Voice</h4>
                    <p className="text-sm text-gray-600 mb-2">Choose from your files:</p>
                    <div className="flex flex-wrap gap-4 items-start">
                      {uniqueBrandVoiceOptions.length > 0 ? (
                        uniqueBrandVoiceOptions.map(({ name, index, url }) => {
                          const active = selectedVoiceFromLibrary === index;
                          return (
                            <div key={`${name}-${index}`} className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => {
                                  setSelectedVoiceFromLibrary(index);
                                  const voiceObj = brandVoices[index];
                                  const voiceUrl = typeof voiceObj === 'string' ? voiceObj : (voiceObj?.url || voiceObj?.link || url || '');
                                  setVoicePreviewUrl(voiceUrl);
                                  setVoiceFileName(name);
                                  setVoiceLink(voiceUrl);
                                  setPreferredVoiceName(name);
                                }}
                                onMouseEnter={() => playBrandVoice(index, url)}
                                onMouseLeave={() => stopBrandVoice(index)}
                                className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all ${
                                  active ? 'border-blue-600 ring-2 ring-blue-300 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'
                                }`}
                                title={name}
                              >
                                <span className={`text-xs font-medium px-2 text-center truncate max-w-full ${
                                  active ? 'text-blue-700' : 'text-gray-600'
                                }`}>
                                  {name.length > 10 ? name.substring(0, 8) + '...' : name}
                                </span>
                              </button>
                              <span className="text-xs text-gray-600 text-center max-w-[80px] truncate">{name}</span>
                            </div>
                          );
                        })
                      ) : (
                        <span className="text-xs text-gray-500">No saved voices found for {tone} tone.</span>
                      )}
                      {/* Add new voice */}
                      <div className="flex flex-col items-center gap-1">
                        <button
                          onClick={() => setIsVoiceModalOpen(true)}
                          className="w-20 h-20 rounded-full flex items-center justify-center border border-dashed border-gray-400 text-gray-500 hover:bg-gray-50"
                          title="Add voice"
                        >
                          <FaPlus className="w-6 h-6" />
                        </button>
                        <span className="text-xs text-gray-600">Add</span>
                      </div>
                    </div>

                    {(voicePreviewUrl || voiceLink) && (
                      <div className="mt-3">
                        <audio ref={audioPreviewRef} className="w-full" controls src={voicePreviewUrl || voiceLink} />
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Technical & Constraints */}
        <div
          onClick={() => handleAccordionToggle('technical')}
          className="w-full cursor-pointer mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between"
        >
          <span className="text-[18px] text-gray-600">Technical and Format Constraints</span>
          {openTechnical ? <FaAngleUp /> : <FaAngleDown />}
        </div>
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${openTechnical ? "max-h-[2000px] mt-4 opacity-100" : "max-h-0 opacity-0"}`}
        >
          {openTechnical && (
            <>
              <div className="w-full flex-col bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
                <span className="text-[18px] text-gray-600 mb-3">What is the preferred duration of the final video?</span>
                <div className="flex flex-col gap-3">
                  {optionsDuration.map((opt) => (
                    <div key={opt.id} className="flex items-center gap-3">
                      <button
                        onClick={() => handleSelectDuration(opt.id)}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                      ${selectedDuration === opt.id
                          ? "bg-green-500 border-green-500"
                          : "bg-white border-gray-400"
                        }`}
                      >
                        {selectedDuration === opt.id && (
                          <FaCheck className="text-white text-sm" />
                        )}
                      </button>
                      <label
                        onClick={() => handleSelectDuration(opt.id)}
                        className="cursor-pointer"
                      >
                        {opt.label}
                      </label>
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full flex-col mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
                <span className="text-[18px] text-gray-600 mb-3">In which format should the final video be delivered?</span>
                <div className="flex flex-col gap-3">
                  {optionsFormat.map((opt) => (
                    <div key={opt.id} className="flex items-center gap-3">
                      <button
                        onClick={() => handleSelectFormat(opt.id)}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                      ${selectedFormat === opt.id
                          ? "bg-green-500 border-green-500"
                          : "bg-white border-gray-400"
                        }`}
                      >
                        {selectedFormat === opt.id && (
                          <FaCheck className="text-white text-sm" />
                        )}
                      </button>
                      <label
                        onClick={() => handleSelectFormat(opt.id)}
                        className="cursor-pointer"
                      >
                        {opt.label}
                      </label>
                      {opt.id === "other" && selectedFormat === "other" && (
                        <input
                          type="text"
                          value={otherFormatText}
                          onChange={(e) => setOtherFormatText(e.target.value)}
                          placeholder="Please specify"
                          className="border-b border-gray-400 outline-none ml-2"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div className="w-full flex-col mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
                <span className="text-[18px] text-gray-600 mb-3">What aspect ratio should the video be published in?</span>
                <div className="flex flex-col gap-3">
                  {optionsAspect.map((opt) => {
                    const isSelected = selectedAspect === opt.id;
                    return (
                      <div key={opt.id} className="flex flex-col gap-2">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleSelectAspect(opt.id)}
                            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                              ${isSelected ? "bg-green-500 border-green-500" : "bg-white border-gray-400"}`}
                          >
                            {isSelected && <FaCheck className="text-white text-sm" />}
                          </button>
                          <label
                            onClick={() => handleSelectAspect(opt.id)}
                            className="cursor-pointer"
                          >
                            {opt.label}
                          </label>
                        </div>
                        {opt.id === "custom" && isSelected && (
                          <div className="ml-9 flex items-center gap-3 flex-wrap">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="1"
                                value={customAspectWidth}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^\d]/g, '');
                                  setCustomAspectWidth(val);
                                  setOtherAspectText(val && customAspectHeight ? `${val}:${customAspectHeight}` : '');
                                }}
                                placeholder="Width"
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                              />
                              <span className="text-sm text-gray-500">:</span>
                              <input
                                type="number"
                                min="1"
                                value={customAspectHeight}
                                onChange={(e) => {
                                  const val = e.target.value.replace(/[^\d]/g, '');
                                  setCustomAspectHeight(val);
                                  setOtherAspectText(customAspectWidth && val ? `${customAspectWidth}:${val}` : '');
                                }}
                                placeholder="Height"
                                className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                              />
                            </div>
                            <p className="text-xs text-gray-500">Enter numerical values (e.g., 4 and 5 for 4:5)</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Next Step Button - Matching Guidelines.js style */}
      <div className='w-full mt-8 flex justify-center'>
        <button 
          onClick={() => { 
            syncUp(); 
            onCreateScenes && onCreateScenes(); 
          }} 
          className='px-6 py-2 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0066] transition-colors flex items-center gap-2'
        >
          Add Your Scenes <FaAngleRight />
        </button>
      </div>

      {/* Add Voice Modal - Matching Guidelines.js */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[96%] max-w-4xl rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Add Voice</h3>
              <button onClick={() => {
                setIsVoiceModalOpen(false);
                setVoiceName('');
                setVoiceFilesForUpload([]);
                setPendingVoiceBlobs([]);
                setPendingVoiceUrls([]);
              }} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            {/* Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="Enter voice name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setVoiceModalTab('record')}
                className={`${voiceModalTab==='record' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} px-3 py-1.5 rounded-md text-sm`}
              >Record</button>
              <button
                onClick={() => setVoiceModalTab('upload')}
                className={`${voiceModalTab==='upload' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} px-3 py-1.5 rounded-md text-sm`}
              >Upload</button>
            </div>

            {/* Record view */}
            {voiceModalTab === 'record' && (
              <div>
                {/* Tone sample at top */}
                <div className="mb-4 text-base text-gray-800 bg-gray-50 border border-gray-200 rounded px-4 py-3">
                  {getRecordingSample()}
                </div>
                <div className="border rounded-xl p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-sm text-gray-700 font-medium">Record Voice</p>
                    <div className="flex items-center gap-3">
                      {isRecording && (
                        <div className="flex items-center gap-2 text-red-600 font-medium">
                          <span className="inline-block w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                          Recording…
                        </div>
                      )}
                      <div className="text-xs text-gray-600 tabular-nums">
                        {String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:{String(elapsedSec % 60).padStart(2, '0')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    {!isRecording ? (
                      <button onClick={startRecording} className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md transition-colors">
                        <FaMicrophone className="w-7 h-7" />
                      </button>
                    ) : (
                      <button onClick={stopRecording} className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-colors">
                        <FaMicrophone className="w-7 h-7" />
                      </button>
                    )}
                  </div>

                  {/* Simple animated level bars for visual feedback */}
                  <div className="flex items-end justify-center gap-1 h-8">
                    {[0,1,2,3,4].map((i) => (
                      <span key={i} className={`w-1.5 bg-green-500 rounded-sm animate-pulse`} style={{height: `${6 + i*6}px`, animationDelay: `${i*120}ms`}} />
                    ))}
                  </div>

                  {pendingVoiceUrls && pendingVoiceUrls.length > 0 && (
                    <div className="mt-2">
                      <audio ref={audioPreviewRef} src={pendingVoiceUrls[pendingVoiceUrls.length-1]} controls className="w-full" />
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={() => { setPendingVoiceBlobs([]); setPendingVoiceUrls([]); }} className="px-3 py-1.5 rounded-md text-sm bg-gray-100 hover:bg-gray-200 text-gray-800">Re-record</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upload view */}
            {voiceModalTab === 'upload' && (
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-700 font-medium mb-2">Upload Voice File</p>
                <input
                  ref={voiceModalFileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setVoiceFilesForUpload(files.length > 0 ? [files[0]] : []);
                  }}
                />
                <button onClick={() => voiceModalFileInputRef.current && voiceModalFileInputRef.current.click()} className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm">Choose File</button>
                {voiceFilesForUpload && voiceFilesForUpload.length > 0 && (
                  <div className="mt-2 text-xs text-gray-700">
                    <p className="font-medium">Selected file:</p>
                    <p className="text-gray-600">{voiceFilesForUpload[0].name}</p>
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => {
                  setIsVoiceModalOpen(false);
                  setVoiceName('');
                  setVoiceFilesForUpload([]);
                  setPendingVoiceBlobs([]);
                  setPendingVoiceUrls([]);
                }} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200" disabled={isSavingBrandVoices}>Cancel</button>
              <button
                onClick={async () => {
                  try {
                    setVoiceSaveMsg('');
                    setIsSavingBrandVoices(true);
                    
                    // Validate name
                    if (!voiceName || !voiceName.trim()) {
                      setVoiceSaveMsg('Please enter a voice name.');
                      return;
                    }
                    
                    // Get the file to upload
                    let fileToUpload = null;
                    
                    if (voiceModalTab === 'record') {
                      // Use recorded voice
                      if (!pendingVoiceBlobs || pendingVoiceBlobs.length === 0) {
                        setVoiceSaveMsg('Please record a voice first.');
                        return;
                      }
                      const toMp3File = (blob) => new File([blob], `recorded_${Date.now()}.mp3`, { type: 'audio/mpeg' });
                      fileToUpload = toMp3File(pendingVoiceBlobs[pendingVoiceBlobs.length - 1]);
                    } else {
                      // Use uploaded file
                      if (!voiceFilesForUpload || voiceFilesForUpload.length === 0) {
                        setVoiceSaveMsg('Please upload a voice file first.');
                        return;
                      }
                      fileToUpload = voiceFilesForUpload[0];
                    }
                    
                    // Get the tone type for the API (professional, casual, humorous, inspiring, formal)
                    const toneType = (tone && tone !== 'other') 
                      ? tone.toLowerCase() 
                      : 'professional';
                    
                    const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';
                    if (!token) {
                      setVoiceSaveMsg('Login required');
                      return;
                    }
                    
                    // Upload to the new API endpoint
                    const form = new FormData();
                    form.append('user_id', token);
                    form.append('name', voiceName.trim());
                    form.append('type', toneType); // Use tone (professional, casual, humorous, inspiring, formal)
                    form.append('file', fileToUpload);
                    
                    const uploadResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/upload-voiceover', {
                      method: 'POST',
                      body: form
                    });
                    
                    if (!uploadResp.ok) {
                      const errorText = await uploadResp.text().catch(() => '');
                      throw new Error(`Upload failed: ${uploadResp.status} ${errorText}`);
                    }
                    
                    // Call get brand assets API to refresh the list
                    const getResp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/${encodeURIComponent(token)}`);
                    if (!getResp.ok) {
                      throw new Error(`Failed to fetch brand assets: ${getResp.status}`);
                    }
                    
                    const assets = await getResp.json().catch(() => ({}));
                    // Parse voiceovers using the same logic as initial load
                    const voices = Array.isArray(assets?.voiceovers)
                      ? assets.voiceovers
                      : (Array.isArray(assets?.voiceover)
                        ? assets.voiceover
                        : (assets?.voices || []));
                    
                    // Update brand voices state - this will trigger uniqueBrandVoiceOptions to recalculate
                    setBrandVoices(voices);
                    
                    // Reset form
                    setVoiceName('');
                    setVoiceFilesForUpload([]);
                    try { (pendingVoiceUrls || []).forEach(u => URL.revokeObjectURL(u)); } catch (_) {}
                    setPendingVoiceUrls([]);
                    setPendingVoiceBlobs([]);
                    setVoiceSaveMsg('Voice uploaded successfully!');
                    
                    // Close modal after a brief delay to show success message
                    setTimeout(() => {
                      setIsVoiceModalOpen(false);
                      setVoiceSaveMsg('');
                    }, 1500);
                  } catch (e) {
                    setVoiceSaveMsg(e?.message || 'Failed to save');
                  } finally {
                    setIsSavingBrandVoices(false);
                  }
                }}
                disabled={isSavingBrandVoices}
                className={`px-4 py-2 rounded-md text-white ${isSavingBrandVoices ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >Save to Brand Assets</button>
            </div>
            <div className="flex items-center gap-2 mt-2 min-h-[1.25rem]">
              {isSavingBrandVoices && (
                <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
              )}
              {voiceSaveMsg && (<div className="text-sm text-gray-700">{voiceSaveMsg}</div>)}
            </div>
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

  // Brand Assets modal state and helpers (scoped to StepTwo)
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  // Back-compat alias in case some leftover code references singular naming
  const showAssetModal = showAssetsModal;
  const setShowAssetModal = setShowAssetsModal;
  const [assetsData, setAssetsData] = useState({ logos: [], icons: [], uploaded_images: [], templates: [], documents_images: [] });
  const [assetsTab, setAssetsTab] = useState('uploaded_images');
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  const assetsUploadInputRef = useRef(null);
  const [pendingUploadType, setPendingUploadType] = useState('uploaded_image');
  const [selectedAssetUrl, setSelectedAssetUrl] = useState('');

  // Helpers: session snapshot + update-text for a single scene
  const getSessionSnapshot = async () => {
    const sessionId = localStorage.getItem('session_id');
    const token = localStorage.getItem('token');
    if (!sessionId || !token) throw new Error('Missing session_id or token');
    const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
    });
    const text = await sessionResp.text();
    let data; try { data = JSON.parse(text); } catch (_) { data = {}; }
    if (!sessionResp.ok) throw new Error(`user-session/data failed: ${sessionResp.status} ${text}`);
    const sd = data?.session_data || data?.session || {};
    const user = data?.user_data || sd?.user_data || sd?.user || {};
    // Preserve ALL fields from session_data, including nested structures
    const sessionForBody = sanitizeSessionSnapshot(sd, sessionId, token);
    return { user, sessionForBody, sd };
  };

  const buildAiresponseWithOverrides = (targetIdx, { genImage, descriptionOverride, refImagesOverride } = {}) => {
    const rows = Array.isArray(script) ? script : [];
    return rows.map((r, idx) => {
      const isTarget = idx === targetIdx;
      return {
        scene_number: r?.scene_number,
        scene_title: r?.scene_title ?? '',
        model: r?.model ?? '',
        timeline: r?.timeline ?? '',
        narration: r?.narration ?? '',
        desc: isTarget && typeof descriptionOverride === 'string' ? descriptionOverride : (r?.desc ?? r?.description ?? ''),
        gen_image: (isTarget && typeof genImage === 'boolean') ? genImage : ((typeof r?.gen_image === 'boolean') ? r.gen_image : undefined),
        font_style: r?.font_style ?? r?.fontStyle ?? '',
        font_size: r?.font_size ?? r?.fontsize ?? r?.fontSize ?? '',
        text_to_be_included: Array.isArray(r?.text_to_be_included) ? r.text_to_be_included : [],
        ref_image: Array.isArray(refImagesOverride) && isTarget && refImagesOverride.length > 0
          ? refImagesOverride
          : (Array.isArray(r?.ref_image) ? r.ref_image : []) ,
        folderLink: r?.folderLink ?? r?.folder_link ?? ''
      };
    });
  };

  const updateTextForSelected = async (targetIdx, { genImage, descriptionOverride, refImagesOverride } = {}) => {
    const { user, sessionForBody, sd } = await getSessionSnapshot();
    const originalUserquery = Array.isArray(sd?.scripts?.[0]?.userquery) ? sd.scripts[0].userquery : [];
    const airesponse = buildAiresponseWithOverrides(targetIdx, { genImage, descriptionOverride, refImagesOverride });
    const body = {
      user,
      session: sessionForBody,
      changed_script: { userquery: originalUserquery, airesponse, version: String(sd?.scripts?.[0]?.version || 'v1') }
    };
    const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-text', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
    });
    const txt = await resp.text();
    if (!resp.ok) throw new Error(`scripts/update-text failed: ${resp.status} ${txt}`);
    try { toast.success('Scene updated'); } catch(_) {}
  };

  const openAssetsModal = async () => {
    try {
      const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';
      if (!token) { setShowAssetsModal(true); return; }
      setIsAssetsLoading(true);
      setShowAssetsModal(true);
      const url = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`;
      const resp = await fetch(url);
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch(_) { data = {}; }
      const logos = Array.isArray(data?.logos) ? data.logos : [];
      const icons = Array.isArray(data?.icons) ? data.icons : [];
      const uploaded_images = Array.isArray(data?.uploaded_images) ? data.uploaded_images : [];
      const templates = Array.isArray(data?.templates) ? data.templates : [];
      const documents_images = Array.isArray(data?.documents_images) ? data.documents_images : [];
      setAssetsData({ logos, icons, uploaded_images, templates, documents_images });
    } catch(_) { /* noop */ }
    finally { setIsAssetsLoading(false); }
  };

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

  const types = ['Avatar Based', 'Infographic', 'Financial'];

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
        <div className='col-span-12 lg:col-span-9 space-y-6'>
          {/* Scene Details */}
          <div className='bg-gray-50 border border-gray-200 rounded-xl p-4'>
            <h3 className='text-lg font-semibold text-gray-900 mb-4'>Scene Details</h3>
            <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mb-4'>
              <div className='bg-white border border-gray-200 rounded-lg p-3'>
                <label className='text-xs font-semibold text-gray-600 block mb-1'>Scene Title</label>
                <input
                  value={scenes[activeIndex]?.title || ''}
                  onChange={(e) => setScene(activeIndex, { title: e.target.value })}
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg'
                  placeholder='Enter scene title'
                />
              </div>
              <div className='bg-white border border-gray-200 rounded-lg p-3'>
                <label className='text-xs font-semibold text-gray-600 block mb-2'>Video Type</label>
                <div className='flex flex-wrap gap-2'>
                  {types.map((t) => (
                    <button
                      key={t}
                      onClick={() => setScene(activeIndex, { type: t })}
                      className={`px-3 py-2 rounded-full text-sm border transition-colors ${
                        (scenes[activeIndex]?.type === t) ? 'bg-[#13008B] text-white border-[#13008B]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {t.replace('Based','').trim()}
                    </button>
                  ))}
                </div>
              </div>
              <div className='bg-white border border-gray-200 rounded-lg p-3'>
                <label className='text-xs font-semibold text-gray-600 block mb-1'>Video Duration</label>
                <div className='text-base text-gray-900'>
                  {(() => {
                    try { return computeTimelineForIndexByScript(activeIndex); }
                    catch { return `${videoDurationSec} seconds`; }
                  })()}
                </div>
              </div>
            </div>
            <div className='bg-white border border-gray-200 rounded-lg p-3'>
              <div className='flex items-center justify-between mb-2'>
                <label className='text-xs font-semibold text-gray-600'>Narration</label>
                <span className='text-[11px] text-gray-500'>Double-click the narration to edit.</span>
              </div>
              <textarea
                rows={4}
                value={scenes[activeIndex]?.narration || ''}
                onChange={(e) => setScene(activeIndex, { narration: e.target.value })}
                className='w-full p-3 border rounded-lg'
                placeholder='Narration for this scene'
              />
            </div>
          </div>

          {/* Scene Description */}
          <div className='bg-gray-50 border border-gray-200 rounded-xl p-4'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-gray-900'>Scene Description</h3>
              <button
                type='button'
                onClick={async () => {
                  if (isEnhancing) return;
                  try {
                    setIsEnhancing(true);
                    const sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) ? localStorage.getItem('session_id') : '';
                    if (!sessionId) throw new Error('Missing session_id');
                    const curIdx = activeIndex;
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
              >{isEnhancing ? 'Enhancing…' : 'Edit'}</button>
            </div>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-3'>
              {[
                { key: 'subject', label: 'Subject' },
                { key: 'background', label: 'Background' },
                { key: 'action', label: 'Action' },
                { key: 'styleCard', label: 'Style' },
                { key: 'cameraCard', label: 'Camera' },
                { key: 'ambiance', label: 'Ambiance' },
                { key: 'composition', label: 'Composition' },
                { key: 'focus_and_lens', label: 'Focus and Lens' },
              ].map(({ key, label }) => (
                <div key={key} className='bg-white border border-gray-200 rounded-lg p-3'>
                  <p className='text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide'>{label}</p>
                  <textarea
                    rows={2}
                    value={scenes[activeIndex]?.[key] || ''}
                    onChange={(e) => setScene(activeIndex, { [key]: e.target.value })}
                    className='w-full p-2 border rounded-lg text-sm'
                    placeholder={`Add ${label.toLowerCase()}...`}
                  />
                </div>
              ))}
            </div>
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
                {((scenes[activeIndex]?.type || '') !== 'Financial') && (
                  <div className='text-sm text-gray-600 mb-2'>
                    { (scenes[activeIndex]?.type || '') === 'Avatar Based' ? 'Select an Avatar' : 'Select a Reference Image' }
                  </div>
                )}
                <div className='flex items-center gap-3'>
                  {/* When Financial, show Chart Type selector */}
                  {((scenes[activeIndex]?.type || '') === 'Financial') && (
                    <div className='flex items-center gap-2'>
                      <label className='text-sm text-gray-600'>Chart Type</label>
                      <select
                        value={script?.[activeIndex]?.chart_type || script?.[activeIndex]?.chartType || ''}
                        onChange={(e)=> updateScriptScene(activeIndex, { chart_type: e.target.value })}
                        className='px-3 py-2 border rounded-lg text-sm'
                      >
                        <option value=''>Select</option>
                        <option value='pie'>Pie</option>
                        <option value='bar'>Bar</option>
                        <option value='line'>Line</option>
                      </select>
                    </div>
                  )}
                  {/* Existing selected refs preview (hide for Financial) */}
                  {(() => {
                    const curType = (scenes[activeIndex]?.type || '');
                    if (curType === 'Financial') return null;
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
                  {/* Choose from Brand Assets (Scenes Editor-like flow) for non-Avatar types */}
                  {((scenes[activeIndex]?.type || '') !== 'Avatar Based' && (scenes[activeIndex]?.type || '') !== 'Financial') && (
                    <button
                      type='button'
                      onClick={openAssetsModal}
                      className='px-3 py-2 rounded-lg border bg-white hover:bg-gray-50 text-sm'
                      title='Choose from Brand Assets'
                    >
                      Choose from Assets
                    </button>
                  )}
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
                  {/* Removed inline upload + box per requirement */}
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
      {/* Brand Assets Modal (scoped to StepTwo) */}
      {showAssetsModal && (
        <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/50'>
          <div className='bg-white w-[96%] max-w-5xl max-h-[85vh] overflow-hidden rounded-lg shadow-xl flex flex-col'>
            <div className='flex items-center justify-between p-4 border-b border-gray-200'>
              <h3 className='text-lg font-semibold text-[#13008B]'>Choose Reference Image</h3>
              <button onClick={() => setShowAssetsModal(false)} className='px-3 py-1.5 rounded-lg border text-sm'>Close</button>
            </div>
            <div className='px-4 pt-3 border-b border-gray-100'>
              <div className='flex items-center gap-3 flex-wrap'>
                {['uploaded_images','documents_images','logos','icons','templates'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setAssetsTab(tab)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${assetsTab===tab ? 'bg-[#13008B] text-white border-[#13008B]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >{tab.replace('_',' ')}</button>
                ))}
                <div className='ml-auto'>
                  <button
                    onClick={() => { setPendingUploadType(assetsTab === 'templates' ? 'template' : (assetsTab.endsWith('s') ? assetsTab.slice(0,-1) : assetsTab)); assetsUploadInputRef.current && assetsUploadInputRef.current.click(); }}
                    className='px-3 py-1.5 rounded-lg border text-sm bg-white hover:bg-gray-50'
                  >
                    Upload
                  </button>
                  <input ref={assetsUploadInputRef} type='file' accept='image/*' className='hidden' multiple onChange={async (e)=>{
                    try {
                      const files = Array.from(e.target.files || []);
                      if (files.length === 0) return;
                      const token = localStorage.getItem('token');
                      if (!token) { alert('Missing user'); return; }
                      if (!pendingUploadType) { alert('Unknown upload type'); return; }
                      const form = new FormData();
                      form.append('user_id', token);
                      form.append('file_type', pendingUploadType);
                      files.forEach(f => form.append('files', f));
                      const upResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/upload-file', { method: 'POST', body: form });
                      const upText = await upResp.text();
                      if (!upResp.ok) throw new Error(`upload-file failed: ${upResp.status} ${upText}`);
                      // Refresh images snapshot
                      setIsAssetsLoading(true);
                      const getResp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`);
                      const getText = await getResp.text();
                      let data; try { data = JSON.parse(getText); } catch(_) { data = {}; }
                      const logos = Array.isArray(data?.logos) ? data.logos : [];
                      const icons = Array.isArray(data?.icons) ? data.icons : [];
                      const uploaded_images = Array.isArray(data?.uploaded_images) ? data.uploaded_images : [];
                      const templates = Array.isArray(data?.templates) ? data.templates : [];
                      const documents_images = Array.isArray(data?.documents_images) ? data.documents_images : [];
                      setAssetsData({ logos, icons, uploaded_images, templates, documents_images });
                    } catch (err) { console.error('Upload failed:', err); alert('Failed to upload file.'); }
                    finally { setIsAssetsLoading(false); if (assetsUploadInputRef.current) assetsUploadInputRef.current.value=''; }
                  }} />
                </div>
              </div>
            </div>
            <div className='p-4 overflow-y-auto'>
              {isAssetsLoading ? (
                <div className='flex items-center justify-center py-16'>
                  <div className='w-10 h-10 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin' />
                </div>
              ) : (
                (()=>{
                  const list = Array.isArray(assetsData[assetsTab]) ? assetsData[assetsTab] : [];
                  const urls = list.map(item => (typeof item === 'string' ? item : (item?.url || item?.link || ''))).filter(Boolean);
                  return (
                    <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3'>
                      {urls.map((url, idx) => {
                        const selected = selectedAssetUrl === url;
                        return (
                          <button key={idx} onClick={()=> setSelectedAssetUrl(url)} className={`relative block w-full pt-[100%] rounded-lg overflow-hidden border ${selected ? 'border-blue-600 ring-2 ring-blue-300' : 'border-gray-200 hover:border-gray-300'}`} title={url}>
                            <img src={url} alt={`asset-${idx}`} className='absolute inset-0 w-full h-full object-cover' />
                          </button>
                        );
                      })}
                    </div>
                  );
                })()
              )}
            </div>
            <div className='p-4 border-t border-gray-200 flex items-center justify-end gap-2'>
              <button onClick={()=> setShowAssetsModal(false)} className='px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-800 hover:bg-gray-200'>Cancel</button>
              <button
                onClick={async () => {
                  try {
                    if (!selectedAssetUrl) return;
                    const imgs = Array.isArray(scenes[activeIndex]?.ref_image) ? scenes[activeIndex].ref_image.slice(0,2) : [];
                    const next = [selectedAssetUrl, ...imgs].slice(0,3);
                    updateScriptScene(activeIndex, { ref_image: next });
                    await updateTextForSelected(activeIndex, { genImage: false, descriptionOverride: '', refImagesOverride: [selectedAssetUrl] });
                    setSelectedAssetUrl('');
                    setShowAssetsModal(false);
                  } catch (e) { console.error(e); try { toast.error(e?.message || 'Failed to keep default'); } catch(_) { alert('Failed to keep default'); } }
                }}
                disabled={!selectedAssetUrl}
                className={`px-4 py-2 rounded-lg text-sm ${!selectedAssetUrl ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
              >
                Keep Default
              </button>
              <button
                onClick={async () => {
                  try {
                    if (!selectedAssetUrl) return;
                    setIsEnhancing(true);
                    const { user, sessionForBody } = await getSessionSnapshot();
                    const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
                    const sceneNumber = scene?.scene_number ?? (activeIndex + 1);
                    const model = String(scene?.model || '').toUpperCase();
                    let reqBody = { user, session: sessionForBody, scene_number: sceneNumber };
                    if (model === 'SORA') reqBody = { ...reqBody, image_links: [selectedAssetUrl] };
                    if (model === 'PLOTLY') reqBody = { ...reqBody, chart_type: scene?.chart_type || scene?.chartType || '' };
                    if (model === 'VEO3') reqBody = { ...reqBody, presenter_options: {} };
                    await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-scene-visual', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody)
                    });
                    const imgs = Array.isArray(scenes[activeIndex]?.ref_image) ? scenes[activeIndex].ref_image.slice(0,2) : [];
                    const next = [selectedAssetUrl, ...imgs].slice(0,3);
                    updateScriptScene(activeIndex, { ref_image: next });
                    await updateTextForSelected(activeIndex, { genImage: true, descriptionOverride: scene?.desc || scene?.description || '', refImagesOverride: [selectedAssetUrl] });
                    setSelectedAssetUrl('');
                    setShowAssetsModal(false);
                  } catch (e) { console.error(e); try { toast.error(e?.message || 'Failed to generate'); } catch(_) { alert('Failed to generate'); } }
                  finally { setIsEnhancing(false); }
                }}
                disabled={!selectedAssetUrl}
                className={`px-4 py-2 rounded-lg text-sm text-white ${!selectedAssetUrl ? 'bg-[#9aa0d0] cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const    BuildReelWizard = () => {
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
      const sessResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessText = await sessResp.text();
      let sessionData; try { sessionData = JSON.parse(sessText); } catch (_) { sessionData = sessText; }
      if (!sessResp.ok) throw new Error(`user-session/data failed: ${sessResp.status} ${sessText}`);

      // Call queue endpoint with minimal payload
      const sd = sessionData?.session_data || {};
      const queueBody = {
        user_id: token,
        session_id: sessionId
      };
      const imgResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/generate-images-queue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(queueBody)
      });
      const imgText = await imgResp.text();
      let imgData; try { imgData = JSON.parse(imgText); } catch (_) { imgData = imgText; }
      if (!imgResp.ok) throw new Error(`generate-images-queue failed: ${imgResp.status} ${imgText}`);

      // Persist job response (job_id, status, status_url, scenes_to_process)
      const jobId = imgData?.job_id || imgData?.jobId || imgData?.id || (Array.isArray(imgData) && imgData[0]?.job_id);
      if (jobId) {
        try { localStorage.setItem('current_images_job_id', jobId); } catch (_) { /* noop */ }
        try { localStorage.setItem('images_generate_pending', 'true'); localStorage.setItem('images_generate_started_at', String(Date.now())); } catch(_){}
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
      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
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
      const sessResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessText = await sessResp.text();
      let sessData; try { sessData = JSON.parse(sessText); } catch (_) { sessData = sessText; }
      if (!sessResp.ok) throw new Error(`user-session/data failed: ${sessResp.status} ${sessText}`);
      const sd = sessData?.session_data || {};
      // Preserve ALL fields from session_data, including nested structures
      const sessionForBody = sanitizeSessionSnapshot(sd, sessionId, token);
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
      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessionText = await sessionResp.text();
      let sessionData; try { sessionData = JSON.parse(sessionText); } catch (_) { sessionData = sessionText; }
      if (!sessionResp.ok) throw new Error(`user-session/data failed: ${sessionResp.status} ${sessionText}`);
      const sd = sessionData?.session_data || {};
      // Preserve ALL fields from session_data, including nested structures
      const sessionForBody = sanitizeSessionSnapshot(sd, sessionId, token);
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
      // Userquery payload from form/localStorage
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
      if (!Array.isArray(uq)) uq = [];

      // Build user object from localStorage (fallbacks to blanks)
      let storedUser = {};
      try { const rawUser = localStorage.getItem('user'); if (rawUser) storedUser = JSON.parse(rawUser) || {}; } catch (_) { /* noop */ }
      const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';
      const userPayload = {
        id: storedUser.id || token || '',
        email: storedUser.email || '',
        display_name: storedUser.display_name || storedUser.name || '',
        created_at: storedUser.created_at || '',
        avatar_url: storedUser.avatar_url || '',
        folder_url: storedUser.folder_url || '',
        brand_identity: storedUser.brand_identity || {},
        tone_and_voice: storedUser.tone_and_voice || {},
        look_and_feel: storedUser.look_and_feel || {},
        templates: Array.isArray(storedUser.templates) ? storedUser.templates : [],
        voiceover: Array.isArray(storedUser.voiceover) ? storedUser.voiceover : [],
      };

      const body = {
        user: userPayload,
        session_id: sessionId || '',
        current_script: { userquery: uq },
        action: 'add',
        model_type: 'SORA'
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
