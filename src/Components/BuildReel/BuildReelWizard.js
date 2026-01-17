import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { FaPlus, FaAngleRight, FaEyeDropper, FaAngleUp, FaAngleDown, FaCheck, FaMicrophone } from 'react-icons/fa';
import { ChevronLeft, ChevronRight, MoreHorizontal, RefreshCcw, Trash2 } from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import { ChevronDown, Sparkles } from 'lucide-react';
import useBrandAssets from '../../hooks/useBrandAssets';
import { toast } from 'react-hot-toast';
import ImageList from '../Scenes/ImageList';
import VideosList from '../Scenes/VideosList';
import ChartDataEditor from '../ChartDataEditor';
import Loader from '../Loader';
import { useProgressLoader } from '../../hooks/useProgressLoader';
import { normalizeGeneratedMediaResponse } from '../../utils/generatedMediaUtils';

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

// Helper to normalize user data (same as Chat.js)
const normalizeUserSnapshot = (userData = {}, token = '') => {
  const base =
    userData && typeof userData === 'object' && !Array.isArray(userData)
      ? { ...userData }
      : {};
  if (!base.id) base.id = base.user_id || base._id || token || '';
  if (!base.display_name) base.display_name = base.displayName || base.name || '';
  if (!base.email && base.Email) base.email = base.Email;
  if (!base.created_at) base.created_at = new Date().toISOString();
  if (!base.avatar_url && base.avatarUrl) base.avatar_url = base.avatarUrl;
  if (!base.folder_url && base.folderUrl) base.folder_url = base.folderUrl;
  if (!Array.isArray(base.templates)) base.templates = [];
  if (!Array.isArray(base.voiceover)) {
    base.voiceover = Array.isArray(base.voiceovers) ? base.voiceovers : [];
  }
  delete base.user_id;
  delete base._id;
  delete base.avatarUrl;
  delete base.folderUrl;
  delete base.voiceovers;
  delete base.displayName;
  delete base.Email;
  return base;
};

// Helper to extract aspect ratio from session payload (same as Chat.js)
const extractAspectRatioFromSessionPayload = (payload) => {
  try {
    if (!payload || typeof payload !== 'object') return '';
    const visited = new Set();
    const queue = [];
    const enqueue = (node) => {
      if (!node) return;
      if (Array.isArray(node)) {
        node.forEach(enqueue);
        return;
      }
      if (typeof node !== 'object') return;
      if (visited.has(node)) return;
      visited.add(node);
      queue.push(node);
    };
    const readAspectFromGuidelines = (obj) => {
      if (!obj || typeof obj !== 'object') return '';
      const guidelines =
        obj.guidelines ||
        obj.Guidelines ||
        obj.guideLines;
      if (!guidelines || typeof guidelines !== 'object') return '';
      const technical =
        guidelines.technical_and_formal_constraints ||
        guidelines.technicalAndFormalConstraints ||
        guidelines.technical_formal_constraints;
      if (!technical || typeof technical !== 'object') return '';
      const aspect =
        technical.aspect_ratio ||
        technical.aspectRatio ||
        technical.aspectratio;
      if (typeof aspect === 'string' && aspect.trim()) return aspect;
      if (Array.isArray(aspect)) {
        const found = aspect.find((item) => typeof item === 'string' && item.trim());
        if (found) return found;
      }
      return '';
    };
    const readAspectFromScript = (script) => {
      if (!script || typeof script !== 'object') return '';
      const userQuery =
        script.userquery ||
        script.user_query ||
        script.userQuery ||
        script.UserQuery;
      const candidates = [
        readAspectFromGuidelines(userQuery),
        readAspectFromGuidelines(script),
        readAspectFromGuidelines(userQuery?.additionalProp1),
        readAspectFromGuidelines(script?.additionalProp1),
        readAspectFromGuidelines(userQuery?.additional_prop1),
        readAspectFromGuidelines(script?.additional_prop1),
        readAspectFromGuidelines(userQuery?.additionalProps),
        readAspectFromGuidelines(script?.additionalProps),
        readAspectFromGuidelines(userQuery?.additional_properties),
        readAspectFromGuidelines(script?.additional_properties)
      ];
      for (const candidate of candidates) {
        if (candidate) return candidate;
      }
      return '';
    };

    enqueue(payload?.session_data);
    enqueue(payload?.session);
    enqueue(payload);

    while (queue.length > 0) {
      const node = queue.shift();
      if (!node || typeof node !== 'object') continue;

      const aspectFromNode = readAspectFromGuidelines(node);
      if (aspectFromNode) return aspectFromNode;

      const scripts = node.scripts;
      if (Array.isArray(scripts)) {
        for (const script of scripts) {
          const aspect = readAspectFromScript(script);
          if (aspect) return aspect;
          enqueue(script);
        }
      } else if (scripts && typeof scripts === 'object') {
        const aspect = readAspectFromScript(scripts);
        if (aspect) return aspect;
        enqueue(scripts);
      }

      Object.values(node).forEach(enqueue);
    }

    return '';
  } catch (_) {
    return '';
  }
};

// Helper to normalize template aspect label (same as Chat.js)
const normalizeTemplateAspectLabel = (aspect) => {
  if (!aspect || typeof aspect !== 'string') return 'Unspecified';
  const trimmed = aspect.trim();
  if (!trimmed) return 'Unspecified';
  const normalized = trimmed.replace(/[xX_]/g, ':').replace(/\s+/g, '');
  if (/^\d+:\d+$/.test(normalized)) return normalized;
  const lower = normalized.toLowerCase();
  if (lower.includes('portrait')) return '9:16';
  if (lower.includes('landscape')) return '16:9';
  return trimmed;
};

const resolveTemplateAssetUrl = (entry) => {
  if (!entry) return '';
  if (typeof entry === 'string') return entry.trim();
  if (typeof entry !== 'object') return '';
  const baseImage = entry.base_image || entry.baseImage;
  if (baseImage) {
    if (typeof baseImage === 'string') return baseImage.trim();
    if (typeof baseImage === 'object') {
      const baseUrl = baseImage.image_url || baseImage.imageUrl || baseImage.url || baseImage.src || baseImage.href;
      if (baseUrl) return baseUrl.trim();
    }
  }
  const direct =
    entry.image_url ||
    entry.imageUrl ||
    entry.url ||
    entry.src ||
    entry.href ||
    entry.link ||
    (entry.asset && (entry.asset.image_url || entry.asset.url)) ||
    (entry.media && (entry.media.image_url || entry.media.url));
  return typeof direct === 'string' ? direct.trim() : '';
};

const normalizeBrandAssetsResponse = (data = {}) => {
  if (!data || typeof data !== 'object') {
    return {
      logos: [],
      icons: [],
      uploaded_images: [],
      templates: [],
      documents_images: []
    };
  }
  const logos = Array.isArray(data.logos) ? data.logos : [];
  const icons = Array.isArray(data.icons) ? data.icons : [];
  const uploaded_images = Array.isArray(data.uploaded_images) ? data.uploaded_images : [];
  const documents_images = Array.isArray(data.documents_images) ? data.documents_images : [];
  let templates = data.templates ?? [];
  const aspectRatioKeys = Object.keys(data).filter(key =>
    /^(\d+):(\d+)$/.test(key) && typeof data[key] === 'object' && data[key] !== null
  );
  if (aspectRatioKeys.length > 0 && (!Array.isArray(templates) || templates.length === 0)) {
    const templatesObj = {};
    aspectRatioKeys.forEach(key => {
      templatesObj[key] = data[key];
    });
    templates = templatesObj;
  }
  return {
    logos,
    icons,
    uploaded_images,
    templates,
    documents_images
  };
};

const extractAssetsByType = (templatesInput = {}, assetType = 'preset_templates') => {
  const normalized = [];
  if (!templatesInput || typeof templatesInput !== 'object') return normalized;
  if (Array.isArray(templatesInput)) return normalized;
  Object.keys(templatesInput).forEach(aspectKey => {
    const aspectGroup = templatesInput[aspectKey];
    if (!aspectGroup || typeof aspectGroup !== 'object') return;
    const assets = Array.isArray(aspectGroup[assetType]) ? aspectGroup[assetType] : [];
    assets.forEach((entry, idx) => {
      if (!entry) return;
      const imageUrl = resolveTemplateAssetUrl(entry);
      if (!imageUrl) return;
      const aspectLabel = normalizeTemplateAspectLabel(aspectKey);
      const templateId = entry?.template_id || entry?.templateId || entry?.id || `${assetType}-${aspectKey}-${idx}`;
      normalized.push({
        id: String(templateId),
        imageUrl,
        aspect: aspectLabel,
        label: `${assetType.replace('_', ' ')} ${idx + 1}`,
        raw: entry,
        assetType: assetType
      });
    });
  });
  return normalized;
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
    const src = Array.isArray(arr) ? arr : [];
    let start = 0;
    setScript(prev => {
      // Merge API response with existing script to preserve all fields
      return src.map((r, i) => {
        const sn = Number(r?.scene_number) || (i + 1);
        const m = String(r?.model || '').toUpperCase();
        const model = typeToModel((m === 'VEO3' || m.includes('VEO')) ? 'Avatar Based' : (m === 'PLOTLY') ? 'Financial' : (m.includes('SORA') ? 'Infographic' : (r?.type || 'Infographic')));
        const end = start + perSceneDurationByModel(model);
        start = end;

        // Find existing scene data to preserve fields not in API response
        const existingScene = prev.find(s => (s?.scene_number || 0) === sn) || {};

        // Build new scene object, preserving existing fields and merging API response
        const newScene = {
          ...existingScene, // Preserve all existing fields first
          // Override with API response data
          scene_number: sn,
          scene_title: r?.scene_title ?? r?.title ?? existingScene.scene_title ?? '',
          model: model,
          timeline: `${start - perSceneDurationByModel(model)} - ${end} seconds`,
          narration: r?.narration ?? existingScene.narration ?? '',
          desc: r?.desc ?? r?.description ?? existingScene.desc ?? existingScene.description ?? '',
          text_to_be_included: Array.isArray(r?.text_to_be_included) ? r.text_to_be_included.slice() : (Array.isArray(existingScene.text_to_be_included) ? existingScene.text_to_be_included : []),
          ref_image: Array.isArray(r?.ref_image) ? r.ref_image.slice() : (Array.isArray(existingScene.ref_image) ? existingScene.ref_image : []),
          folderLink: r?.folderLink ?? existingScene.folderLink ?? '',
          // Preserve all other important fields from API response if present, otherwise keep existing
          avatar: r?.avatar ?? existingScene.avatar ?? null,
          avatar_urls: Array.isArray(r?.avatar_urls) ? r.avatar_urls.slice() : (Array.isArray(existingScene.avatar_urls) ? existingScene.avatar_urls : []),
          presenter_options: r?.presenter_options ?? existingScene.presenter_options ?? {},
          veo3_prompt_template: r?.veo3_prompt_template ?? existingScene.veo3_prompt_template ?? null,
          colors: Array.isArray(r?.colors) ? r.colors.slice() : (Array.isArray(existingScene.colors) ? existingScene.colors : []),
          font_size: r?.font_size ?? r?.fontsize ?? r?.fontSize ?? existingScene.font_size ?? existingScene.fontsize ?? existingScene.fontSize ?? 16,
          font_style: r?.font_style ?? r?.fontStyle ?? existingScene.font_style ?? existingScene.fontStyle ?? '',
          opening_frame: r?.opening_frame ?? existingScene.opening_frame ?? null,
          closing_frame: r?.closing_frame ?? existingScene.closing_frame ?? null,
          background_frame: r?.background_frame ?? existingScene.background_frame ?? null,
          animation_desc: r?.animation_desc ?? r?.animationDesc ?? existingScene.animation_desc ?? existingScene.animationDesc ?? null,
          chart_type: r?.chart_type ?? existingScene.chart_type ?? '',
          chart_data: r?.chart_data ?? existingScene.chart_data ?? null,
          background_image: Array.isArray(r?.background_image) ? r.background_image.slice() : (Array.isArray(existingScene.background_image) ? existingScene.background_image : []),
          // Preserve scene description fields
          subject: r?.subject ?? existingScene.subject ?? '',
          background: r?.background ?? existingScene.background ?? '',
          action: r?.action ?? existingScene.action ?? '',
          styleCard: r?.styleCard ?? existingScene.styleCard ?? '',
          cameraCard: r?.cameraCard ?? existingScene.cameraCard ?? '',
          ambiance: r?.ambiance ?? existingScene.ambiance ?? '',
          composition: r?.composition ?? existingScene.composition ?? '',
          focus_and_lens: r?.focus_and_lens ?? existingScene.focus_and_lens ?? ''
        };
        return newScene;
      });
    });
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
      const start = (() => { let s = 0; for (let i = 0; i < idx; i++) s += perSceneDurationByModel(prev[i]?.model || ''); return s; })();
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

// Helper function to filter scene to only include allowed fields (matching sample object)
// This is used by both StepTwo (saveScenesToServer) and BuildReelWizard (handleGenerate)
const filterSceneForAPI = (scene, index) => {
  if (!scene || typeof scene !== 'object') {
    // Return minimal valid scene structure if scene is invalid
    return {
      desc: '',
      model: '',
      colors: [],
      duration: 0,
      timeline: '',
      font_size: 0,
      gen_image: true,
      narration: '',
      folderLink: null,
      font_style: '',
      word_count: 0,
      scene_title: '',
      scene_number: index + 1,
      background_image: [],
      text_to_be_included: []
    };
  }

  // Determine video type from model
  const model = String(scene.model || '').toUpperCase();
  const isAvatarBased = model === 'VEO3' || model.includes('VEO');
  const isFinancial = model === 'PLOTLY';
  const isInfographic = model === 'SORA' || (!isAvatarBased && !isFinancial);

  // Common fields for all video types
  const commonFields = {
    desc: scene.desc ?? scene.description ?? '',
    model: scene.model ?? '',
    colors: Array.isArray(scene.colors) ? scene.colors.slice() : [],
    duration: scene.duration ?? 0,
    timeline: scene.timeline ?? '',
    font_size: scene.font_size ?? 0,
    gen_image: scene.gen_image ?? true,
    narration: scene.narration ?? '',
    folderLink: scene.folderLink ?? null,
    font_style: scene.font_style ?? '',
    word_count: scene.word_count ?? 0,
    scene_title: scene.scene_title ?? '',
    scene_number: scene.scene_number ?? (index + 1),
    background_image: Array.isArray(scene.background_image) ? scene.background_image.slice() : [],
    text_to_be_included: Array.isArray(scene.text_to_be_included) ? scene.text_to_be_included.slice() : []
  };

  // Build object based on video type
  if (isAvatarBased) {
    // Avatar Based (VEO3) - only include these specific fields
    return {
      ...commonFields,
      mode: scene.mode ?? 'presenter',
      avatar_urls: Array.isArray(scene.avatar_urls) ? scene.avatar_urls.slice() : [],
      regenerate_desc: scene.regenerate_desc ?? false,
      presenter_options: scene.presenter_options && typeof scene.presenter_options === 'object'
        ? { ...scene.presenter_options }
        : {},
      veo3_prompt_template: scene.veo3_prompt_template && typeof scene.veo3_prompt_template === 'object'
        ? { ...scene.veo3_prompt_template }
        : null
    };
  } else if (isFinancial) {
    // Financial (PLOTLY) - only include these specific fields
    const financialScene = {
      ...commonFields
    };

    // Include chart fields if they exist
    if (scene.chart_data !== undefined) {
      financialScene.chart_data = scene.chart_data && typeof scene.chart_data === 'object'
        ? { ...scene.chart_data }
        : null;
    }
    if (scene.chart_type !== undefined) {
      financialScene.chart_type = scene.chart_type ?? '';
    }
    if (scene.chart_title !== undefined) {
      financialScene.chart_title = scene.chart_title ?? '';
    }
    if (scene.animation_desc !== undefined) {
      financialScene.animation_desc = scene.animation_desc && typeof scene.animation_desc === 'object'
        ? { ...scene.animation_desc }
        : null;
    }
    if (scene.background_frame !== undefined) {
      financialScene.background_frame = scene.background_frame && typeof scene.background_frame === 'object'
        ? { ...scene.background_frame }
        : null;
    }

    return financialScene;
  } else {
    // Infographic (SORA) - only include these specific fields
    const infographicScene = {
      ...commonFields
    };

    // Include frame fields if they exist
    if (scene.closing_frame !== undefined) {
      infographicScene.closing_frame = scene.closing_frame && typeof scene.closing_frame === 'object'
        ? { ...scene.closing_frame }
        : null;
    }
    if (scene.opening_frame !== undefined) {
      infographicScene.opening_frame = scene.opening_frame && typeof scene.opening_frame === 'object'
        ? { ...scene.opening_frame }
        : null;
    }
    if (scene.animation_desc !== undefined) {
      infographicScene.animation_desc = scene.animation_desc && typeof scene.animation_desc === 'object'
        ? { ...scene.animation_desc }
        : null;
    }

    return infographicScene;
  }
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
    'Poppins', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Nunito', 'Source Sans Pro', 'Merriweather', 'Playfair Display', 'Raleway', 'Oswald', 'Ubuntu', 'PT Sans', 'Noto Sans', 'Fira Sans', 'Rubik', 'Mulish', 'Josefin Sans', 'Work Sans', 'Karla', 'Quicksand', 'Barlow', 'Heebo', 'Hind', 'Manrope', 'IBM Plex Sans', 'IBM Plex Serif', 'Archivo', 'Catamaran', 'DM Sans', 'DM Serif Display', 'Cabin', 'Titillium Web', 'Bebas Neue', 'Anton', 'Inconsolata', 'Space Mono', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Courier New', 'Segoe UI'
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
      Object.keys(map).forEach(k => { const a = map[k]; if (a) { try { a.pause(); a.currentTime = 0; } catch (_) { } } });
    } catch (_) { }
  };
  const playBrandVoice = (i, url) => {
    try {
      stopAllBrandVoice();
      let a = brandVoiceAudioRefs.current[i];
      if (!a || a.src !== url) { a = new Audio(url); brandVoiceAudioRefs.current[i] = a; }
      a.currentTime = 0; a.play().catch(() => { });
    } catch (_) { }
  };
  const stopBrandVoice = (i) => { try { const a = brandVoiceAudioRefs.current[i]; if (a) { a.pause(); a.currentTime = 0; } } catch (_) { } };

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
      } catch (_) { }
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
        try { stream.getTracks().forEach(t => t.stop()); } catch (_) { }
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
    } catch (_) { }
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
      'Poppins', 'Inter', 'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Nunito', 'Source Sans Pro', 'Merriweather', 'Playfair Display', 'Raleway', 'Oswald', 'Ubuntu', 'PT Sans', 'Noto Sans', 'Fira Sans', 'Rubik', 'Mulish', 'Josefin Sans', 'Work Sans', 'Karla', 'Quicksand', 'Barlow', 'Heebo', 'Hind', 'Manrope', 'IBM Plex Sans', 'IBM Plex Serif', 'Archivo', 'Catamaran', 'DM Sans', 'DM Serif Display', 'Cabin', 'Titillium Web', 'Bebas Neue', 'Anton', 'Inconsolata', 'Space Mono', 'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Courier New', 'Segoe UI'
    ];
    const selected = Array.isArray(value) ? value : [];
    const toggle = (f) => {
      const exists = selected.includes(f);
      const next = exists ? selected.filter(x => x !== f) : [...selected, f];
      onChange && onChange(next);
    };
    const remove = (f) => onChange && onChange(selected.filter(x => x !== f));
    return (
      <div className='relative z-10'>
        <button type='button' onClick={() => setOpen(o => !o)} className='w-full min-h-[48px] border border-gray-300 rounded-lg px-3 py-2 bg-white flex items-center justify-between'>
          <div className='flex flex-wrap gap-2'>
            {selected.length === 0 && <span className='text-gray-400'>Select fonts</span>}
            {selected.map(f => (
              <span key={f} className='px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm inline-flex items-center gap-2' style={{ fontFamily: f }}>
                {f}
                <button type='button' onClick={(e) => { e.stopPropagation(); remove(f); }} className='hover:text-red-500'>×</button>
              </span>
            ))}
          </div>
          <span className='text-gray-400'>{open ? '▲' : '▼'}</span>
        </button>
        {open && (
          <div className='absolute z-20 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto'>
            {options.map((f) => (
              <button
                key={f}
                type='button'
                onClick={() => toggle(f)}
                className={`w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${selected.includes(f) ? 'bg-indigo-50' : ''}`}
                style={{ fontFamily: f }}
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
      const arr = Array.isArray(val?.userquery) ? val.userquery : [];
      const first = arr[0] || {};
      const p = first && typeof first === 'object'
        ? (first.additonalprop1 && typeof first.additonalprop1 === 'object' ? first.additonalprop1 : first)
        : null;
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
          onChange={(e) => setVideoTitle(e.target.value)}
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
                      className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${goal === g.id ? "bg-green-500 border-green-500" : "bg-white border-gray-400"
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
                      className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${audience === aud.id ? "bg-green-500 border-green-500" : "bg-white border-gray-400"
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
                      className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${tone === t.id ? "bg-green-500 border-green-500" : "bg-white border-gray-400"
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
                          <button onClick={() => setLogoSelectMode('assets')} className={`px-3 py-1.5 rounded-md text-sm ${logoSelectMode === 'assets' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>From Brand Assets</button>
                          <button onClick={() => setLogoSelectMode('upload')} className={`px-3 py-1.5 rounded-md text-sm ${logoSelectMode === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>Upload Image</button>
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
                                      <img src={url} alt={`Logo ${i + 1}`} className="max-h-16 object-contain" />
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
                                const lastSel = finalLogos && finalLogos.length ? (typeof finalLogos[finalLogos.length - 1] === 'string' ? finalLogos[finalLogos.length - 1] : (finalLogos[finalLogos.length - 1]?.url || '')) : '';
                                if (lastSel) setSelectedLogoUrl(lastSel);
                              } catch (_) { /* noop */ }
                              finally { setIsLogoUploading(false); e.target.value = ''; }
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
                            className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${selectedShareable === opt.id ? "bg-green-500 border-green-500" : "bg-white border-gray-400"
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
                        <input ref={colorInputRef} type='color' onChange={(e) => {
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
                                  className={`w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0 ${selectedFonts.includes(font) ? 'bg-indigo-50' : ''}`}
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
                          className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors ${audioAnswer === v ? 'bg-green-500 border-green-500' : 'bg-white border-gray-400'
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
                                className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all ${active ? 'border-blue-600 ring-2 ring-blue-300 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'
                                  }`}
                                title={name}
                              >
                                <span className={`text-xs font-medium px-2 text-center truncate max-w-full ${active ? 'text-blue-700' : 'text-gray-600'
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

                    {(voicePreviewUrl || voiceLink) && audioAnswer !== 'Yes' && (
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
            // Validate title and description are required
            if (!videoTitle || !videoTitle.trim()) {
              try {
                toast.error('Video Title is required');
              } catch (_) {
                alert('Video Title is required');
              }
              return;
            }
            if (!videoDesc || !videoDesc.trim()) {
              try {
                toast.error('Video Description is required');
              } catch (_) {
                alert('Video Description is required');
              }
              return;
            }
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
                className={`${voiceModalTab === 'record' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} px-3 py-1.5 rounded-md text-sm`}
              >Record</button>
              <button
                onClick={() => setVoiceModalTab('upload')}
                className={`${voiceModalTab === 'upload' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} px-3 py-1.5 rounded-md text-sm`}
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
                    {[0, 1, 2, 3, 4].map((i) => (
                      <span key={i} className={`w-1.5 bg-green-500 rounded-sm animate-pulse`} style={{ height: `${6 + i * 6}px`, animationDelay: `${i * 120}ms` }} />
                    ))}
                  </div>

                  {pendingVoiceUrls && pendingVoiceUrls.length > 0 && (
                    <div className="mt-2">
                      <audio ref={audioPreviewRef} src={pendingVoiceUrls[pendingVoiceUrls.length - 1]} controls className="w-full" />
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
                    try { (pendingVoiceUrls || []).forEach(u => URL.revokeObjectURL(u)); } catch (_) { }
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

const StepTwo = ({ values, onBack, onSave, onGenerate, isGenerating = false, hasImages = false, onGoToStoryboard }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  // Only show 5 scene tabs at a time without scroll
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  // Undo/Redo state
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // Delete scene state
  const [isDeletingScene, setIsDeletingScene] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Kebab menu state
  const [kebabMenuOpen, setKebabMenuOpen] = useState(false);
  const kebabMenuRef = useRef(null);

  // Close kebab menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (kebabMenuOpen && kebabMenuRef.current && !kebabMenuRef.current.contains(e.target)) {
        setKebabMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [kebabMenuOpen]);

  // Use centralized script state
  const { script, setScript, setFromApi, updateScene: updateScriptScene, addSceneSimple, modelToType, typeToModel, computeTimelineForIndexByScript } = useScriptScenes(
    Array.isArray(values?.scripts?.[0]?.airesponse) ? values.scripts[0].airesponse : (Array.isArray(values?.script) ? values.script : [])
  );

  // Track last synced script to avoid unnecessary updates
  const lastSyncedScriptRef = useRef(null);
  const lastSavedScriptRef = useRef(null);
  const isSyncingRef = useRef(false);

  // Sync script when values.script changes (e.g., on session restore)
  // This preserves all fields including scene description fields - same way as text_to_be_included
  useEffect(() => {
    // Prevent infinite loop - if we're already syncing, skip
    if (isSyncingRef.current) return;

    const currentScript = Array.isArray(values?.script) ? values.script : [];
    if (currentScript.length === 0) {
      // If parent has no script but we have local script, keep local script
      if (script.length > 0) return;
      // Otherwise, clear script state
      if (script.length === 0) return;
      isSyncingRef.current = true;
      setScript([]);
      setTimeout(() => { isSyncingRef.current = false; }, 0);
      return;
    }

    const scriptKey = JSON.stringify(currentScript);

    // Always sync if script has changed or if local script is empty (initial load)
    // This ensures scene descriptions are fetched the same way as text_to_be_included
    if (scriptKey !== lastSyncedScriptRef.current || script.length === 0) {
      lastSyncedScriptRef.current = scriptKey;
      isSyncingRef.current = true;
      // Directly set script state to preserve all fields (including scene description)
      // Don't use setFromApi as it uses mapResponseToScenes which loses scene description fields
      // Use spread operator to preserve ALL fields from the source, including scene description
      // Merge with existing script state to preserve any local edits
      setScript(prevScript => {
        const syncedScript = currentScript.map((r, i) => {
          if (!r || typeof r !== 'object') return r;
          // Get existing scene from local state if it exists
          const existingScene = prevScript[i] || {};
          // Merge: use parent values as base, but preserve local scene description fields if they exist
          const merged = { ...r };
          // Always use parent values if they exist (they come from server/session)
          // Only preserve local values if parent doesn't have them (for unsaved edits)
          // Handle scene description fields the same way as text_to_be_included
          const descriptionFields = ['subject', 'background', 'action', 'styleCard', 'cameraCard', 'ambiance', 'composition', 'focus_and_lens'];
          descriptionFields.forEach(field => {
            // Always prefer parent value if it exists (even if empty string, use parent's value)
            // This ensures scene descriptions from server are always used
            if (r && Object.prototype.hasOwnProperty.call(r, field)) {
              merged[field] = r[field] ?? '';
            } else if (existingScene[field] !== undefined) {
              // Parent doesn't have this field, preserve local value
              merged[field] = existingScene[field];
            }
          });
          // Handle text_to_be_included the same way - always use parent if available
          if (r && Object.prototype.hasOwnProperty.call(r, 'text_to_be_included')) {
            merged.text_to_be_included = Array.isArray(r.text_to_be_included) ? r.text_to_be_included.slice() : [];
          } else if (existingScene.text_to_be_included !== undefined) {
            merged.text_to_be_included = existingScene.text_to_be_included;
          }
          // Preserve avatar and preset fields - always use parent if available
          if (merged.avatar || (Array.isArray(merged.avatar_urls) && merged.avatar_urls.length > 0)) {
            // Parent has avatar, use it
          } else if (existingScene.avatar || (Array.isArray(existingScene.avatar_urls) && existingScene.avatar_urls.length > 0)) {
            // Parent doesn't have avatar, preserve local
            merged.avatar = existingScene.avatar;
            merged.avatar_urls = existingScene.avatar_urls;
          }
          if (merged.presenter_options && Object.keys(merged.presenter_options).length > 0) {
            // Parent has presenter_options, use it
          } else if (existingScene.presenter_options && Object.keys(existingScene.presenter_options).length > 0) {
            // Parent doesn't have presenter_options, preserve local
            merged.presenter_options = existingScene.presenter_options;
          }
          // Preserve opening_frame and closing_frame - always use parent if available
          if (r && Object.prototype.hasOwnProperty.call(r, 'opening_frame')) {
            merged.opening_frame = r.opening_frame;
          } else if (existingScene.opening_frame !== undefined) {
            merged.opening_frame = existingScene.opening_frame;
          }
          if (r && Object.prototype.hasOwnProperty.call(r, 'closing_frame')) {
            merged.closing_frame = r.closing_frame;
          } else if (existingScene.closing_frame !== undefined) {
            merged.closing_frame = existingScene.closing_frame;
          }
          return merged;
        });
        console.log('[BuildReel] StepTwo - Syncing script with scene description fields:', {
          count: syncedScript.length,
          firstSceneFields: syncedScript[0] ? {
            subject: syncedScript[0].subject,
            background: syncedScript[0].background,
            action: syncedScript[0].action,
            styleCard: syncedScript[0].styleCard,
            cameraCard: syncedScript[0].cameraCard,
            ambiance: syncedScript[0].ambiance,
            composition: syncedScript[0].composition,
            focus_and_lens: syncedScript[0].focus_and_lens,
            avatar: syncedScript[0].avatar,
            avatar_urls: syncedScript[0].avatar_urls,
            presenter_options: syncedScript[0].presenter_options
          } : null
        });
        return syncedScript;
      });
      // Reset syncing flag after state update
      setTimeout(() => { isSyncingRef.current = false; }, 0);
    }
  }, [values?.script]);
  const [videoDurationSec, setVideoDurationSec] = useState(10);
  const [isAdding, setIsAdding] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isSavingScenes, setIsSavingScenes] = useState(false);

  // Progress bars for scene save and add operations
  const savingScenesProgress = useProgressLoader(isSavingScenes, 95, 30000);
  const addingSceneProgress = useProgressLoader(isAdding, 95, 30000);

  const imageFileInputRef = useRef(null);
  const [isUploadingSceneImage, setIsUploadingSceneImage] = useState(false);
  const [textIncludeInput, setTextIncludeInput] = useState('');

  // Avatar selection state (matching Chat.js)
  const [presetAvatars] = useState([
    'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/1.png',
    'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/2.png',
    'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/3.png',
    'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/4.png',
    'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/5.png',
    'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/6.png',
    'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/7.png'
  ]);
  const presetAvatarNames = {
    'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/1.png': 'Alex',
    'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/2.png': 'Sarah',
    'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/3.png': 'Tyler',
    'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/4.png': 'Fawad',
    'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/5.png': 'David',
    'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/6.png': 'Olivia',
    'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/7.png': 'James'
  };
  const [brandAssetsAvatars, setBrandAssetsAvatars] = useState([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const [showAvatarUploadPopup, setShowAvatarUploadPopup] = useState(false);
  const [avatarUploadFiles, setAvatarUploadFiles] = useState([]);
  const [isUploadingAvatarFiles, setIsUploadingAvatarFiles] = useState(false);
  const [avatarName, setAvatarName] = useState('');
  const avatarUploadFileInputRef = useRef(null);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);

  // Presenter preset state (for Avatar Based videos)
  const [presenterPresets, setPresenterPresets] = useState({
    VEO3: [],
    ANCHOR: []
  });
  const [selectedPresenterPreset, setSelectedPresenterPreset] = useState('');
  const [presenterPresetOriginal, setPresenterPresetOriginal] = useState('');

  // Opening and closing frame state (for Infographic and Financial videos)
  const [openingFrameAccordionOpen, setOpeningFrameAccordionOpen] = useState(false);
  const [closingFrameAccordionOpen, setClosingFrameAccordionOpen] = useState(false);
  const [isEditingOpeningFrame, setIsEditingOpeningFrame] = useState(false);
  const [isEditingClosingFrame, setIsEditingClosingFrame] = useState(false);
  const [editedOpeningFrame, setEditedOpeningFrame] = useState({});
  const [editedClosingFrame, setEditedClosingFrame] = useState({});
  const [isSavingFrameData, setIsSavingFrameData] = useState(false);
  // Background frame state (for Financial/PLOTLY videos)
  const [editedBackgroundFrame, setEditedBackgroundFrame] = useState({});
  // Advanced Style Options state (for all video types)
  const [advancedStyleColors, setAdvancedStyleColors] = useState([]);
  const [advancedStyleFontSize, setAdvancedStyleFontSize] = useState(16);
  const [advancedStyleFontStyle, setAdvancedStyleFontStyle] = useState('');
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(true); // Always open by default
  // Animation Description state (for Infographic and Financial)
  const [editedAnimationDesc, setEditedAnimationDesc] = useState({});
  const [animationDescAccordionOpen, setAnimationDescAccordionOpen] = useState(true); // Always open by default
  const [presenterPresetDirty, setPresenterPresetDirty] = useState(false);
  const [isLoadingPresenterPresets, setIsLoadingPresenterPresets] = useState(false);
  const [presenterPresetsError, setPresenterPresetsError] = useState('');
  const [showPresenterSaveConfirm, setShowPresenterSaveConfirm] = useState(false);
  const [pendingPresenterPresetId, setPendingPresenterPresetId] = useState('');
  const [pendingPresenterPresetLabel, setPendingPresenterPresetLabel] = useState('');
  const [isSavingPresenterPreset, setIsSavingPresenterPreset] = useState(false);

  // Validation error modal state
  const [showValidationModal, setShowValidationModal] = useState(false);
  const [validationErrors, setValidationErrors] = useState([]);

  // Chart type state (for Financial/PLOTLY videos)
  const [isChartTypeEditing, setIsChartTypeEditing] = useState(false);
  const [pendingChartTypeValue, setPendingChartTypeValue] = useState('');
  const [chartTypeSceneIndex, setChartTypeSceneIndex] = useState(null);
  const [isRegeneratingChart, setIsRegeneratingChart] = useState(false);

  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const showAssetModal = showAssetsModal;
  const setShowAssetModal = setShowAssetsModal;
  const [assetsData, setAssetsData] = useState({ logos: [], icons: [], uploaded_images: [], templates: [], documents_images: [] });
  const [assetsTab, setAssetsTab] = useState('templates');
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  const [generatedImagesData, setGeneratedImagesData] = useState({ generated_images: {}, generated_videos: {} });
  const [isLoadingGeneratedImages, setIsLoadingGeneratedImages] = useState(false);
  const assetsUploadInputRef = useRef(null);
  const [pendingUploadType, setPendingUploadType] = useState('');
  const [selectedAssetUrl, setSelectedAssetUrl] = useState('');
  const [selectedTemplateUrls, setSelectedTemplateUrls] = useState([]);

  useEffect(() => {
    if (!showAssetsModal) {
      setIsAssetsLoading(false);
      return;
    }
    let cancelled = false;
    setIsAssetsLoading(true);
    (async () => {
      try {
        const token = (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
        if (!token) {
          if (!cancelled) {
            setAssetsData({ logos: [], icons: [], uploaded_images: [], templates: [], documents_images: [] });
            setIsAssetsLoading(false);
          }
          return;
        }
        const url = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`;
        const resp = await fetch(url);
        const text = await resp.text();
        let data;
        try { data = JSON.parse(text); } catch (_) { data = {}; }
        if (cancelled) return;
        const normalized = normalizeBrandAssetsResponse(data);
        if (!cancelled) {
          setAssetsData(normalized);
          setIsAssetsLoading(false);
        }
      } catch (err) {
        if (!cancelled) {
          setAssetsData({ logos: [], icons: [], uploaded_images: [], templates: [], documents_images: [] });
          setIsAssetsLoading(false);
        }
      }
    })();
    return () => { cancelled = true; setIsAssetsLoading(false); };
  }, [showAssetsModal]);

  useEffect(() => {
    if (!showAssetsModal || assetsTab !== 'generated_images') {
      setIsLoadingGeneratedImages(false);
      return;
    }
    let cancelled = false;
    setIsLoadingGeneratedImages(true);
    (async () => {
      try {
        const token = (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
        if (!token) {
          if (!cancelled) {
            setGeneratedImagesData({ generated_images: {}, generated_videos: {} });
            setIsLoadingGeneratedImages(false);
          }
          return;
        }
        const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/user/${encodeURIComponent(token)}/generated-media`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        });
        const text = await resp.text();
        let data;
        try { data = JSON.parse(text); } catch (_) { data = null; }
        if (cancelled) return;
        if (!resp.ok || !data || typeof data !== 'object') {
          if (!cancelled) {
            setGeneratedImagesData({ generated_images: {}, generated_videos: {} });
            setIsLoadingGeneratedImages(false);
          }
          return;
        }
        if (!cancelled) {
          const normalized = normalizeGeneratedMediaResponse(data);
          setGeneratedImagesData(normalized);
          setIsLoadingGeneratedImages(false);
        }
      } catch (err) {
        if (!cancelled) {
          setGeneratedImagesData({ generated_images: {}, generated_videos: {} });
          setIsLoadingGeneratedImages(false);
        }
      }
    })();
    return () => { cancelled = true; setIsLoadingGeneratedImages(false); };
  }, [showAssetsModal, assetsTab]);

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
    const rawUser = data?.user_data || sd?.user_data || sd?.user || {};
    // Preserve ALL fields from session_data, including nested structures
    const sessionForBody = sanitizeSessionSnapshot(sd, sessionId, token);
    const user = normalizeUserSnapshot(rawUser, token);
    return { user, sessionForBody, sd, rawSession: sd, rawUser };
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
          : (Array.isArray(r?.ref_image) ? r.ref_image : []),
        folderLink: r?.folderLink ?? r?.folder_link ?? '',
        // Preserve frame data
        opening_frame: r?.opening_frame ?? null,
        closing_frame: r?.closing_frame ?? null,
        background_frame: r?.background_frame ?? null,
        // Preserve Advanced Style Options
        colors: Array.isArray(r?.colors) ? r.colors : [],
        font_size: r?.font_size ?? r?.fontsize ?? r?.fontSize ?? 16,
        font_style: r?.font_style ?? r?.fontStyle ?? '',
        // Preserve Animation Description
        animation_desc: r?.animation_desc ?? r?.animationDesc ?? null,
        // Preserve veo3_prompt_template (contains Scene Description fields)
        veo3_prompt_template: r?.veo3_prompt_template ?? null,
        // Preserve presenter_options
        presenter_options: r?.presenter_options ?? null
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
    try { toast.success('Scene updated'); } catch (_) { }
  };

  const openAssetsModal = () => {
    setSelectedAssetUrl('');
    setSelectedTemplateUrls([]);
    setAssetsTab('templates');
    setShowAssetsModal(true);
  };

  // Helpers to persist current scenes before enhance
  const scenes = useMemo(() => (Array.isArray(script) ? script.map((r) => ({
    title: r?.scene_title || '',
    description: r?.desc || r?.description || '',
    narration: r?.narration || '',
    text_to_be_included: Array.isArray(r?.text_to_be_included) ? r.text_to_be_included : [],
    type: modelToType(r?.model),
    ref_image: Array.isArray(r?.ref_image) ? r.ref_image : [],
    folderLink: r?.folderLink || '',
    // Scene Description fields
    subject: r?.subject || '',
    background: r?.background || '',
    action: r?.action || '',
    styleCard: r?.styleCard || '',
    cameraCard: r?.cameraCard || '',
    ambiance: r?.ambiance || '',
    composition: r?.composition || '',
    focus_and_lens: r?.focus_and_lens || ''
  })) : []), [script, modelToType]);
  // Validation function for all scenes
  const validateAllScenes = () => {
    const errors = [];

    if (!Array.isArray(script) || script.length === 0) {
      errors.push('At least one scene is required');
      return errors;
    }

    script.forEach((currentScene, index) => {
      if (!currentScene) {
        errors.push(`Scene ${index + 1}: Scene data is missing`);
        return;
      }

      // 1. Scene Title - required
      const sceneTitle = currentScene?.scene_title || '';
      if (!sceneTitle || sceneTitle.trim() === '') {
        errors.push(`Scene ${index + 1}: Scene Title is required`);
      }

      // 2. Video Type - required
      const videoType = modelToType(currentScene?.model || '');
      if (!videoType || videoType.trim() === '') {
        errors.push(`Scene ${index + 1}: Video Type is required`);
      }

      // 3. Narration - required
      const narration = currentScene?.narration || '';
      if (!narration || narration.trim() === '') {
        errors.push(`Scene ${index + 1}: Narration is required`);
      }

      // 4. Scene Description fields - required only for Avatar Based scenes
      if (videoType === 'Avatar Based') {
        const descriptionFields = [
          { key: 'subject', label: 'Subject' },
          { key: 'background', label: 'Background' },
          { key: 'action', label: 'Action' },
          { key: 'styleCard', label: 'Style' },
          { key: 'cameraCard', label: 'Camera' },
          { key: 'ambiance', label: 'Ambiance' },
          { key: 'composition', label: 'Composition' },
          { key: 'focus_and_lens', label: 'Focus and Lens' }
        ];

        // Check Scene Description fields from veo3_prompt_template first, then direct fields
        descriptionFields.forEach(({ key, label }) => {
          let value = '';
          // Check veo3_prompt_template first
          if (currentScene?.veo3_prompt_template && typeof currentScene.veo3_prompt_template === 'object') {
            const promptTemplate = currentScene.veo3_prompt_template;
            const promptKeyMap = {
              'styleCard': 'style',
              'action': 'action',
              'cameraCard': 'camera',
              'subject': 'subject',
              'ambiance': 'ambiance',
              'background': 'background',
              'composition': 'composition',
              'focus_and_lens': 'focus_and_lens'
            };
            const promptKey = promptKeyMap[key];
            if (promptKey && promptTemplate[promptKey]) {
              value = promptTemplate[promptKey];
            }
          }
          // Fallback to direct field
          if (!value) {
            value = currentScene?.[key] || '';
          }
          if (!value || value.trim() === '') {
            errors.push(`Scene ${index + 1}: ${label} is required`);
          }
        });
      }

      // 5. Opening Frame and Closing Frame - required for Infographic scenes
      if (videoType === 'Infographic') {
        const openingFrame = currentScene?.opening_frame;
        if (!openingFrame || typeof openingFrame !== 'object') {
          errors.push(`Scene ${index + 1}: Opening Frame is required`);
        } else {
          const openingFrameFields = ['style', 'action', 'setting', 'subject', 'composition', 'factual_details', 'camera_lens_shadow_lighting'];
          openingFrameFields.forEach((key) => {
            const value = openingFrame[key] || '';
            if (!value || value.trim() === '') {
              const label = key.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              errors.push(`Scene ${index + 1}: Opening Frame - ${label} is required`);
            }
          });
        }

        const closingFrame = currentScene?.closing_frame;
        if (!closingFrame || typeof closingFrame !== 'object') {
          errors.push(`Scene ${index + 1}: Closing Frame is required`);
        } else {
          const closingFrameFields = ['style', 'action', 'setting', 'subject', 'composition', 'factual_details', 'camera_lens_shadow_lighting'];
          closingFrameFields.forEach((key) => {
            const value = closingFrame[key] || '';
            if (!value || value.trim() === '') {
              const label = key.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              errors.push(`Scene ${index + 1}: Closing Frame - ${label} is required`);
            }
          });
        }
      }

      // 6. Background Frame - required for Financial scenes
      if (videoType === 'Financial') {
        const backgroundFrame = currentScene?.background_frame;
        if (!backgroundFrame || typeof backgroundFrame !== 'object') {
          errors.push(`Scene ${index + 1}: Background Frame is required`);
        } else {
          const backgroundFrameFields = ['style', 'action', 'setting', 'subject', 'composition', 'factual_details', 'camera_lens_shadow_lighting'];
          backgroundFrameFields.forEach((key) => {
            const value = backgroundFrame[key] || '';
            if (!value || value.trim() === '') {
              const label = key.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              errors.push(`Scene ${index + 1}: Background Frame - ${label} is required`);
            }
          });
        }
      }

      // 7. Avatar selection - required if Avatar Based
      if (videoType === 'Avatar Based') {
        const sceneAvatar = currentScene?.avatar || (Array.isArray(currentScene?.avatar_urls) && currentScene.avatar_urls.length > 0 ? currentScene.avatar_urls[0] : null);
        if (!sceneAvatar || String(sceneAvatar).trim() === '') {
          errors.push(`Scene ${index + 1}: Avatar selection is required for Avatar Based videos`);
        }

        // 8. Scene Settings (presenter preset) - required if Avatar Based
        const modelUpper = String(currentScene?.model || currentScene?.mode || '').toUpperCase();
        if (modelUpper === 'VEO3' || modelUpper === 'ANCHOR') {
          const presenterOpts = currentScene?.presenter_options || currentScene?.presenterOptions || {};
          const hasPreset = presenterOpts?.preset_id || presenterOpts?.presetId || presenterOpts?.preset || presenterOpts?.anchor_id || presenterOpts?.anchorId;
          if (!hasPreset || String(hasPreset).trim() === '') {
            errors.push(`Scene ${index + 1}: Scene Settings (Presenter Preset) is required for Avatar Based videos`);
          }
        }
      }
    });

    return errors;
  };

  const saveScenesToServer = async () => {
    try {
      setIsSavingScenes(true);

      // Validate all scenes before saving
      const validationErrors = validateAllScenes();
      if (validationErrors.length > 0) {
        setValidationErrors(validationErrors);
        setShowValidationModal(true);
        throw new Error('Validation failed');
      }

      const sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) ? localStorage.getItem('session_id') : '';
      if (!sessionId) throw new Error('Missing session_id');

      // Filter scenes to only include allowed fields (matching sample object structure)
      const airesponse = Array.isArray(script) ? script.map((scene, index) => filterSceneForAPI(scene, index)) : [];

      // Log first scene to verify all fields are included
      if (airesponse.length > 0) {
        console.log('[BuildReel] Saving scenes - First scene payload:', {
          scene_number: airesponse[0].scene_number,
          scene_title: airesponse[0].scene_title,
          narration: airesponse[0].narration,
          desc: airesponse[0].desc,
          subject: airesponse[0].subject,
          background: airesponse[0].background,
          action: airesponse[0].action,
          styleCard: airesponse[0].styleCard,
          cameraCard: airesponse[0].cameraCard,
          ambiance: airesponse[0].ambiance,
          composition: airesponse[0].composition,
          focus_and_lens: airesponse[0].focus_and_lens,
          avatar: airesponse[0].avatar,
          avatar_urls: airesponse[0].avatar_urls,
          presenter_options: airesponse[0].presenter_options,
          text_to_be_included: airesponse[0].text_to_be_included,
          ref_image: airesponse[0].ref_image,
          background_image: airesponse[0].background_image,
          chart_type: airesponse[0].chart_type,
          chart_data: airesponse[0].chart_data,
          allKeys: Object.keys(airesponse[0])
        });
      }

      let uq = [];
      try {
        const raw = localStorage.getItem('buildreel_userquery');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (parsed && Array.isArray(parsed.userquery)) uq = parsed.userquery;
        }
      } catch (_) { /* noop */ }
      if (!Array.isArray(uq)) uq = [];
      if (Array.isArray(uq) && uq.length > 0) {
        uq = uq.map((item) => {
          if (item && typeof item === 'object' && item.additonalprop1 && typeof item.additonalprop1 === 'object') {
            return item.additonalprop1;
          }
          return item;
        });
      }

      // Fetch full user object from session user_data for create-from-scratch save
      const { rawUser } = await getSessionSnapshot();
      const userForBody = rawUser || {};

      const body = {
        user: userForBody,
        session_id: sessionId || '',
        current_script: {
          userquery: uq,
          airesponse
        },
        action: 'save'
      };

      console.log('[BuildReel] Save payload - Total scenes:', airesponse.length);

      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/create-from-scratch', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`create-from-scratch(save) failed: ${resp.status} ${text}`);
      return data;
    } finally {
      setIsSavingScenes(false);
    }
  };

  // Undo handler
  const handleUndoScript = async () => {
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) return;
      // 1) Fetch user-session-data to build user payload
      const sessResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessText = await sessResp.text();
      let sessJson; try { sessJson = JSON.parse(sessText); } catch (_) { sessJson = {}; }
      if (!sessResp.ok) throw new Error(`user-session/data failed: ${sessResp.status} ${sessText}`);
      const sd = (sessJson?.session_data || sessJson?.session || {});
      const userPayload = (sessJson?.user_data) || (sd?.user_data) || {};
      // New undo schema: send user and session_id only
      const reqBody = { user: userPayload, session_id: sd?.id || sd?.session_id || sessionId };
      // 2) Call undo with user + session_id
      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/undo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody)
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`scripts/undo failed: ${resp.status} ${text}`);
      // Update script from response
      if (data?.script) {
        const scriptArray = Array.isArray(data.script) ? data.script : (Array.isArray(data.script?.airesponse) ? data.script.airesponse : []);
        if (scriptArray.length > 0) {
          setFromApi(scriptArray);
          // Update activeIndex if needed
          if (activeIndex >= scriptArray.length) {
            setActiveIndex(Math.max(0, scriptArray.length - 1));
          }
        }
      }
      // Update undo/redo state
      setCanUndo(data?.can_undo ?? false);
      setCanRedo(data?.can_redo ?? false);
      toast.success('Undo successful');
    } catch (e) {
      console.error('Undo failed:', e);
      toast.error('Undo failed. Please try again.');
    }
  };

  // Redo handler
  const handleRedoScript = async () => {
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) return;
      // 1) Fetch user-session-data to build user payload
      const sessResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessText = await sessResp.text();
      let sessJson; try { sessJson = JSON.parse(sessText); } catch (_) { sessJson = {}; }
      if (!sessResp.ok) throw new Error(`user-session/data failed: ${sessResp.status} ${sessText}`);
      const sd2 = (sessJson?.session_data || sessJson?.session || {});
      const userPayload = (sessJson?.user_data) || (sd2?.user_data) || {};
      // New redo schema: send user and session_id only
      const reqBody = { user: userPayload, session_id: sd2?.id || sd2?.session_id || sessionId };
      // 2) Call redo with user + session_id
      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/redo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody)
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`scripts/redo failed: ${resp.status} ${text}`);
      // Update script from response
      if (data?.script) {
        const scriptArray = Array.isArray(data.script) ? data.script : (Array.isArray(data.script?.airesponse) ? data.script.airesponse : []);
        if (scriptArray.length > 0) {
          setFromApi(scriptArray);
          // Update activeIndex if needed
          if (activeIndex >= scriptArray.length) {
            setActiveIndex(Math.max(0, scriptArray.length - 1));
          }
        }
      }
      // Update undo/redo state
      setCanUndo(data?.can_undo ?? false);
      setCanRedo(data?.can_redo ?? false);
      toast.success('Redo successful');
    } catch (e) {
      console.error('Redo failed:', e);
      toast.error('Redo failed. Please try again.');
    }
  };

  // Delete scene handler
  const handleDeleteScene = async () => {
    if (isDeletingScene) return;
    setIsDeletingScene(true);
    try {
      if (!Array.isArray(script) || script.length === 0) return;
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) throw new Error('Missing session_id or token');

      // 1) Load session snapshot (source of truth for delete payload)
      const sessionReqBody = { user_id: token, session_id: sessionId };
      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionReqBody)
      });
      if (!sessionResp.ok) {
        const text = await sessionResp.text();
        throw new Error(`user-session/data failed: ${sessionResp.status} ${text}`);
      }
      const sessionDataResponse = await sessionResp.json();
      const sd = sessionDataResponse?.session_data || {};

      // Current scene number
      const cur = script[activeIndex];
      const sceneNumber = cur?.scene_number ?? (activeIndex + 1);

      // Use a unified delete endpoint regardless of video type
      const deleteEndpointPath = 'scripts/delete-scene';

      // 3) Build user payload EXACTLY from user-session-data.user_data
      const rawUser = sessionDataResponse?.user_data || sd?.user_data || sd?.user || {};
      const userPayload = normalizeUserSnapshot(rawUser, token);

      // 4) Build delete payload with { user, session, scene_number }
      const sessionForBody = sanitizeSessionSnapshot(sd, sessionId, token);
      const body = { user: userPayload, session: sessionForBody, scene_number: sceneNumber };

      // 5) Call unified delete endpoint
      const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/${deleteEndpointPath}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`${deleteEndpointPath} failed: ${resp.status} ${text}`);

      // Reload script from session after delete
      await new Promise(resolve => setTimeout(resolve, 500));
      const reloadResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const reloadText = await reloadResp.text();
      let reloadData;
      try { reloadData = JSON.parse(reloadText); } catch (_) { reloadData = reloadText; }

      if (reloadResp.ok && reloadData) {
        const sessionDataObj = reloadData?.session_data || reloadData?.session || {};
        const scripts = Array.isArray(sessionDataObj?.scripts) && sessionDataObj.scripts.length > 0
          ? sessionDataObj.scripts
          : [];

        let scriptData = null;
        if (sessionDataObj?.reordered_script) {
          const reordered = sessionDataObj.reordered_script;
          if (Array.isArray(reordered?.airesponse)) {
            scriptData = reordered.airesponse;
          } else if (Array.isArray(reordered)) {
            scriptData = reordered;
          }
        }
        if (!scriptData && sessionDataObj?.changed_script) {
          const changed = sessionDataObj.changed_script;
          if (Array.isArray(changed?.airesponse)) {
            scriptData = changed.airesponse;
          } else if (Array.isArray(changed)) {
            scriptData = changed;
          }
        }
        if (!scriptData && scripts.length > 0) {
          for (let i = 0; i < scripts.length; i++) {
            const currentScript = scripts[i];
            if (Array.isArray(currentScript?.airesponse)) {
              scriptData = currentScript.airesponse;
              break;
            }
          }
        }
        if (!scriptData && Array.isArray(sessionDataObj?.airesponse)) {
          scriptData = sessionDataObj.airesponse;
        }

        if (scriptData && Array.isArray(scriptData) && scriptData.length > 0) {
          setFromApi(scriptData);
          // Adjust activeIndex if needed
          if (activeIndex >= scriptData.length) {
            setActiveIndex(Math.max(0, scriptData.length - 1));
          }
        }
      }

      toast.success('Scene deleted successfully');
    } catch (err) {
      console.error('Delete scene failed:', err);
      toast.error(err?.message || 'Failed to delete scene. Please try again.');
    } finally {
      setIsDeletingScene(false);
    }
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

  // Load brand assets avatars on mount (matching Chat.js)
  useEffect(() => {
    const loadAvatars = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) return;
        setIsLoadingAvatars(true);
        const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/avatars/${encodeURIComponent(token)}`);
        const text = await resp.text();
        let data;
        try { data = JSON.parse(text); } catch (_) { data = text; }
        if (resp.ok && data && typeof data === 'object') {
          const avatarsObject = data?.avatars || {};
          const avatarObjects = [];
          Object.values(avatarsObject).forEach((profileAvatars) => {
            if (Array.isArray(profileAvatars)) {
              profileAvatars.forEach((avatar) => {
                if (avatar && typeof avatar === 'object' && avatar.url) {
                  avatarObjects.push({
                    name: avatar.name || '',
                    url: String(avatar.url).trim()
                  });
                }
              });
            }
          });
          setBrandAssetsAvatars(avatarObjects);
        }
      } catch (_) { /* noop */ }
      finally { setIsLoadingAvatars(false); }
    };
    loadAvatars();
  }, []);

  // Note: We don't use setFromApi here because it strips scene description fields
  // The sync logic at line 1734 handles syncing values.script to script state while preserving all fields

  // Note: Auto-save removed - create-from-scratch is only called from the "+ scene" button

  // Initialize opening_frame and closing_frame states when scene changes
  useEffect(() => {
    const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
    if (scene) {
      // Initialize opening_frame
      if (scene.opening_frame && typeof scene.opening_frame === 'object') {
        setEditedOpeningFrame({ ...scene.opening_frame });
      } else {
        setEditedOpeningFrame({});
      }
      // Initialize closing_frame
      if (scene.closing_frame && typeof scene.closing_frame === 'object') {
        setEditedClosingFrame({ ...scene.closing_frame });
      } else {
        setEditedClosingFrame({});
      }
      // Initialize background_frame
      if (scene.background_frame && typeof scene.background_frame === 'object') {
        setEditedBackgroundFrame({ ...scene.background_frame });
      } else {
        setEditedBackgroundFrame({});
      }
    }
  }, [activeIndex, script]);

  // Sync script changes back to parent form state
  useEffect(() => {
    // Prevent infinite loop - don't save if we're syncing from parent
    if (isSyncingRef.current) return;

    if (script.length > 0 && onSave) {
      // Convert script to scenes format for parent
      const scenes = script.map((r) => ({
        title: r?.scene_title || '',
        description: r?.desc || r?.description || '',
        narration: r?.narration || '',
        text_to_be_included: Array.isArray(r?.text_to_be_included) ? r.text_to_be_included : [],
        type: modelToType(r?.model),
        ref_image: Array.isArray(r?.ref_image) ? r.ref_image : [],
        folderLink: r?.folderLink || '',
        // Scene Description fields
        subject: r?.subject || '',
        background: r?.background || '',
        action: r?.action || '',
        styleCard: r?.styleCard || '',
        cameraCard: r?.cameraCard || '',
        ambiance: r?.ambiance || '',
        composition: r?.composition || '',
        focus_and_lens: r?.focus_and_lens || ''
      }));

      // Only save if scenes have actually changed
      const scenesKey = JSON.stringify(scenes);
      if (scenesKey !== lastSavedScriptRef.current) {
        lastSavedScriptRef.current = scenesKey;
        onSave(scenes);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [script]);

  const addScene = async () => {
    try {
      if (isAdding) return;

      // Validation: Check if current scene has all required fields
      const currentScene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
      if (!currentScene) {
        setValidationErrors(['Please complete the current scene before adding a new one.']);
        setShowValidationModal(true);
        return;
      }

      const errors = [];

      // 1. Scene Title - required
      const sceneTitle = currentScene?.scene_title || '';
      if (!sceneTitle || sceneTitle.trim() === '') {
        errors.push('Scene Title is required');
      }

      // 2. Video Type - required
      const videoType = modelToType(currentScene?.model || '');
      if (!videoType || videoType.trim() === '') {
        errors.push('Video Type is required');
      }

      // 3. Narration - required
      const narration = currentScene?.narration || '';
      if (!narration || narration.trim() === '') {
        errors.push('Narration is required');
      }

      // 4. Scene Description fields - required only for Avatar Based scenes
      if (videoType === 'Avatar Based') {
        const descriptionFields = [
          { key: 'subject', label: 'Subject' },
          { key: 'background', label: 'Background' },
          { key: 'action', label: 'Action' },
          { key: 'styleCard', label: 'Style' },
          { key: 'cameraCard', label: 'Camera' },
          { key: 'ambiance', label: 'Ambiance' },
          { key: 'composition', label: 'Composition' },
          { key: 'focus_and_lens', label: 'Focus and Lens' }
        ];

        // Check Scene Description fields from veo3_prompt_template first, then direct fields
        descriptionFields.forEach(({ key, label }) => {
          let value = '';
          // Check veo3_prompt_template first
          if (currentScene?.veo3_prompt_template && typeof currentScene.veo3_prompt_template === 'object') {
            const promptTemplate = currentScene.veo3_prompt_template;
            const promptKeyMap = {
              'styleCard': 'style',
              'action': 'action',
              'cameraCard': 'camera',
              'subject': 'subject',
              'ambiance': 'ambiance',
              'background': 'background',
              'composition': 'composition',
              'focus_and_lens': 'focus_and_lens'
            };
            const promptKey = promptKeyMap[key];
            if (promptKey && promptTemplate[promptKey]) {
              value = promptTemplate[promptKey];
            }
          }
          // Fallback to direct field
          if (!value) {
            value = currentScene?.[key] || '';
          }
          if (!value || value.trim() === '') {
            errors.push(`${label} is required`);
          }
        });
      }

      // 5. Opening Frame and Closing Frame - required for Infographic scenes
      if (videoType === 'Infographic') {
        const openingFrame = currentScene?.opening_frame;
        if (!openingFrame || typeof openingFrame !== 'object') {
          errors.push('Opening Frame is required');
        } else {
          const openingFrameFields = ['style', 'action', 'setting', 'subject', 'composition', 'factual_details', 'camera_lens_shadow_lighting'];
          openingFrameFields.forEach((key) => {
            const value = openingFrame[key] || '';
            if (!value || value.trim() === '') {
              const label = key.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              errors.push(`Opening Frame: ${label} is required`);
            }
          });
        }

        const closingFrame = currentScene?.closing_frame;
        if (!closingFrame || typeof closingFrame !== 'object') {
          errors.push('Closing Frame is required');
        } else {
          const closingFrameFields = ['style', 'action', 'setting', 'subject', 'composition', 'factual_details', 'camera_lens_shadow_lighting'];
          closingFrameFields.forEach((key) => {
            const value = closingFrame[key] || '';
            if (!value || value.trim() === '') {
              const label = key.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              errors.push(`Closing Frame: ${label} is required`);
            }
          });
        }
      }

      // 6. Background Frame - required for Financial scenes
      if (videoType === 'Financial') {
        const backgroundFrame = currentScene?.background_frame;
        if (!backgroundFrame || typeof backgroundFrame !== 'object') {
          errors.push('Background Frame is required');
        } else {
          const backgroundFrameFields = ['style', 'action', 'setting', 'subject', 'composition', 'factual_details', 'camera_lens_shadow_lighting'];
          backgroundFrameFields.forEach((key) => {
            const value = backgroundFrame[key] || '';
            if (!value || value.trim() === '') {
              const label = key.replace(/_/g, ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
              errors.push(`Background Frame: ${label} is required`);
            }
          });
        }
      }

      // 7. Avatar selection - required if Avatar Based
      if (videoType === 'Avatar Based') {
        const sceneAvatar = currentScene?.avatar || (Array.isArray(currentScene?.avatar_urls) && currentScene.avatar_urls.length > 0 ? currentScene.avatar_urls[0] : null);
        if (!sceneAvatar || String(sceneAvatar).trim() === '') {
          errors.push('Avatar selection is required for Avatar Based videos');
        }

        // 6. Scene Settings (presenter preset) - required if Avatar Based
        const modelUpper = String(currentScene?.model || currentScene?.mode || '').toUpperCase();
        if (modelUpper === 'VEO3' || modelUpper === 'ANCHOR') {
          const presenterOpts = currentScene?.presenter_options || currentScene?.presenterOptions || {};
          // Check multiple possible fields for preset
          const hasPreset = presenterOpts?.preset_id || presenterOpts?.presetId || presenterOpts?.preset || presenterOpts?.anchor_id || presenterOpts?.anchorId;
          // Also check selectedPresenterPreset state as fallback (in case scene data hasn't updated yet)
          const hasPresetInState = selectedPresenterPreset && String(selectedPresenterPreset).trim() !== '';
          if ((!hasPreset || String(hasPreset).trim() === '') && !hasPresetInState) {
            errors.push('Scene Settings (Presenter Preset) is required for Avatar Based videos');
          }
        }
      }

      // Show errors if any
      if (errors.length > 0) {
        setValidationErrors(errors);
        setShowValidationModal(true);
        return;
      }

      setIsAdding(true);
      // 1) Load session id (frontend sends userquery + current scenes)
      const sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) ? localStorage.getItem('session_id') : '';
      if (!sessionId) throw new Error('Missing session_id');

      // 1a) Fetch full user object from session user_data for create-from-scratch API
      const { rawUser } = await getSessionSnapshot();
      const userForBody = rawUser || {};

      // 2) Build airesponse from current UI scenes (filter to only include allowed fields)
      const airesponse = Array.isArray(script) ? script.map((scene, index) => filterSceneForAPI(scene, index)) : [];

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
      if (Array.isArray(uq) && uq.length > 0) {
        uq = uq.map((item) => {
          if (item && typeof item === 'object' && item.additonalprop1 && typeof item.additonalprop1 === 'object') {
            return item.additonalprop1;
          }
          return item;
        });
      }

      const endpoint = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/create-from-scratch';

      // 4) First, call create-from-scratch with action "save" to save current scenes
      const saveBody = {
        user: userForBody,
        session_id: sessionId || '',
        current_script: {
          userquery: uq,
          airesponse
        },
        action: 'save'
      };

      console.log('[BuildReel] addScene - Step 1: Saving current scenes with action "save"');
      const saveResp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(saveBody) });
      const saveText = await saveResp.text();
      let saveData; try { saveData = JSON.parse(saveText); } catch (_) { saveData = saveText; }
      if (!saveResp.ok) throw new Error(`create-from-scratch(save) failed: ${saveResp.status} ${saveText}`);
      console.log('[BuildReel] addScene - Step 1: Save successful');

      // 5) Then, call create-from-scratch again with action "add" to add new scene
      const addBody = {
        user: userForBody,
        session_id: sessionId || '',
        current_script: {
          userquery: uq,
          airesponse
        },
        action: 'add'
      };

      console.log('[BuildReel] addScene - Step 2: Adding new scene with action "add"');
      const resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(addBody) });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`create-from-scratch(add) failed: ${resp.status} ${text}`);
      console.log('[BuildReel] addScene - Step 2: Add successful');

      // 6) Extract updated scenes from response and update UI
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
        if (Array.isArray(val)) val.forEach(v => (typeof v === 'string') ? pushStr(v) : (v && typeof v === 'object' && pushStr(v.url || v.link || v.src)));
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

  // State for AI enhancement loading
  const [enhancingFields, setEnhancingFields] = useState({});

  // Helper function to enhance field using AI
  const enhanceField = async (fieldName) => {
    if (enhancingFields[fieldName]) return; // Prevent duplicate calls

    setEnhancingFields(prev => ({ ...prev, [fieldName]: true }));
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) throw new Error('Missing session_id or token');

      // 1) First call user-session-data API
      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessionText = await sessionResp.text();
      let sessionData;
      try { sessionData = JSON.parse(sessionText); } catch (_) { sessionData = {}; }
      if (!sessionResp.ok) throw new Error(`user-session-data failed: ${sessionResp.status} ${sessionText}`);
      const sd = sessionData?.session_data || sessionData?.session || {};

      // Get current scene - use the latest version from script state
      const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
      if (!scene) throw new Error('Scene not found');
      const targetSceneNumber = scene?.scene_number ?? (activeIndex + 1);

      // Build current_script object with filtered airesponse array - use latest script state
      // Map over script array to get the latest version of all scenes
      const currentScriptForApi = Array.isArray(script) ? script.map((sceneItem, index) => filterSceneForAPI(sceneItem, index)) : [];

      // Extract userquery from session data, with fallbacks
      let userquery = [];
      try {
        // First try to get from session data
        if (sd?.userquery && Array.isArray(sd.userquery)) {
          userquery = sd.userquery;
        } else if (sessionData?.userquery && Array.isArray(sessionData.userquery)) {
          userquery = sessionData.userquery;
        } else if (values && values.userquery && Array.isArray(values.userquery.userquery)) {
          // Fallback to values prop
          userquery = values.userquery.userquery;
        } else {
          // Fallback to localStorage
          const raw = localStorage.getItem('buildreel_userquery');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.userquery)) {
              userquery = parsed.userquery;
            }
          }
        }
      } catch (_) { /* noop */ }
      if (!Array.isArray(userquery)) userquery = [];

      const requestBody = {
        session_id: sessionId,
        scene_number: targetSceneNumber,
        fields: [fieldName],
        current_script: {
          userquery: userquery,
          airesponse: currentScriptForApi
        }
      };

      // 2) Then call enhance-field API
      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/enhance-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const text = await resp.text();
      let data;
      try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`enhance-field failed: ${resp.status} ${text}`);

      // Extract the enhanced field from response
      const enhancedScript = Array.isArray(data?.script) && data.script.length > 0 ? data.script[0] : null;
      if (!enhancedScript) throw new Error('No script data in response');

      // Update the specific field based on fieldName
      if (fieldName === 'narration') {
        const enhancedValue = enhancedScript.narration || '';
        updateScriptScene(activeIndex, { narration: enhancedValue });
        try { toast.success('Narration enhanced with AI'); } catch (_) { }
      } else if (fieldName === 'desc' || fieldName === 'description') {
        const enhancedValue = enhancedScript.desc || enhancedScript.description || '';
        updateScriptScene(activeIndex, { desc: enhancedValue, description: enhancedValue });
        try { toast.success('Description enhanced with AI'); } catch (_) { }
      } else if (fieldName === 'opening_frame') {
        const enhancedValue = enhancedScript.opening_frame || null;
        if (enhancedValue) {
          updateScriptScene(activeIndex, { opening_frame: enhancedValue });
          setEditedOpeningFrame(enhancedValue);
          setIsEditingOpeningFrame(true);
          await saveFrameData('opening_frame', enhancedValue);
        }
        try { toast.success('Opening frame enhanced with AI'); } catch (_) { }
      } else if (fieldName === 'closing_frame') {
        const enhancedValue = enhancedScript.closing_frame || null;
        if (enhancedValue) {
          updateScriptScene(activeIndex, { closing_frame: enhancedValue });
          setEditedClosingFrame(enhancedValue);
          setIsEditingClosingFrame(true);
          await saveFrameData('closing_frame', enhancedValue);
        }
        try { toast.success('Closing frame enhanced with AI'); } catch (_) { }
      } else if (fieldName === 'background_frame') {
        const enhancedValue = enhancedScript.background_frame || null;
        if (enhancedValue) {
          updateScriptScene(activeIndex, { background_frame: enhancedValue });
          setEditedBackgroundFrame(enhancedValue);
          await saveFrameData('background_frame', enhancedValue);
        }
        try { toast.success('Background frame enhanced with AI'); } catch (_) { }
      } else if (fieldName === 'animation_desc') {
        const enhancedValue = enhancedScript.animation_desc || null;
        if (enhancedValue) {
          updateScriptScene(activeIndex, { animation_desc: enhancedValue });
          setEditedAnimationDesc(enhancedValue);
          await saveFrameData('animation_desc', enhancedValue);
        }
        try { toast.success('Animation description enhanced with AI'); } catch (_) { }
      }
    } catch (e) {
      console.error('enhanceField failed:', e);
      try { toast.error(`Failed to enhance ${fieldName}. Please try again.`); } catch (_) { alert(`Failed to enhance ${fieldName}. Please try again.`); }
    } finally {
      setEnhancingFields(prev => ({ ...prev, [fieldName]: false }));
    }
  };

  // Helper function to save frame data (opening_frame, closing_frame) - only updates local state
  const saveFrameData = async (fieldName, fieldData) => {
    if (isSavingFrameData) return;
    setIsSavingFrameData(true);
    try {
      // Get current scene
      const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
      if (!scene) throw new Error('Scene not found');

      // Update the scene's frame data locally only
      updateScriptScene(activeIndex, { [fieldName]: fieldData });

      try { toast.success(`${fieldName.replace('_', ' ')} saved successfully`); } catch (_) { }
    } catch (e) {
      console.error('saveFrameData failed:', e);
      try { toast.error(`Failed to save ${fieldName}. Please try again.`); } catch (_) { alert(`Failed to save ${fieldName}. Please try again.`); }
      throw e;
    } finally {
      setIsSavingFrameData(false);
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

  // Initialize opening and closing frame fields when scene changes (for Infographic scenes - always open)
  useEffect(() => {
    const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
    if (!scene) {
      // Reset all state when no scene is available
      setAdvancedStyleColors([]);
      setAdvancedStyleFontSize(16);
      setAdvancedStyleFontStyle('');
      setEditedOpeningFrame({});
      setEditedClosingFrame({});
      setEditedBackgroundFrame({});
      setEditedAnimationDesc({});
      return;
    }
    const sceneModelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
    const isSora = sceneModelUpper === 'SORA';
    const isPlotly = sceneModelUpper === 'PLOTLY';
    const sceneType = scenes[activeIndex]?.type || '';

    // Initialize for Infographic scenes (Scene Visual is always open for these)
    if (isSora || sceneType === 'Infographic') {
      // Initialize opening frame
      const openingData = scene?.opening_frame || scene?.openingFrame || scene?.opening || {};
      const normalizedOpening = typeof openingData === 'object' && !Array.isArray(openingData) ? { ...openingData } : {};
      const allFields = ['style', 'action', 'setting', 'subject', 'composition', 'factual_details', 'camera_lens_shadow_lighting'];
      const initializedOpening = {};
      allFields.forEach(field => {
        initializedOpening[field] = normalizedOpening[field] || '';
      });
      setEditedOpeningFrame(initializedOpening);
      setIsEditingOpeningFrame(true);

      // Initialize closing frame
      const closingData = scene?.closing_frame || scene?.closingFrame || scene?.choosing_frame || scene?.choosingFrame || {};
      const normalizedClosing = typeof closingData === 'object' && !Array.isArray(closingData) ? { ...closingData } : {};
      const initializedClosing = {};
      allFields.forEach(field => {
        initializedClosing[field] = normalizedClosing[field] || '';
      });
      setEditedClosingFrame(initializedClosing);
      setIsEditingClosingFrame(true);
    } else {
      // Reset frame data for non-Infographic scenes
      setEditedOpeningFrame({});
      setEditedClosingFrame({});
      setIsEditingOpeningFrame(false);
      setIsEditingClosingFrame(false);
    }

    // Initialize background frame for Financial scenes
    if (isPlotly || sceneType === 'Financial') {
      const backgroundData = scene?.background_frame || scene?.backgroundFrame || scene?.background || {};
      const normalizedBackground = typeof backgroundData === 'object' && !Array.isArray(backgroundData) ? { ...backgroundData } : {};
      const allFields = ['style', 'action', 'setting', 'subject', 'composition', 'factual_details', 'camera_lens_shadow_lighting'];
      const initializedBackground = {};
      allFields.forEach(field => {
        initializedBackground[field] = normalizedBackground[field] || '';
      });
      setEditedBackgroundFrame(initializedBackground);
    } else {
      // Reset background frame for non-Financial scenes
      setEditedBackgroundFrame({});
    }

    // Initialize Advanced Style Options for all scenes - ALWAYS fetch from scene data
    const colors = Array.isArray(scene?.colors) ? scene.colors : [];
    const fontSize = scene?.font_size ?? scene?.fontsize ?? scene?.fontSize ?? 16;
    const fontStyle = scene?.font_style ?? scene?.fontStyle ?? '';
    setAdvancedStyleColors(colors);
    setAdvancedStyleFontSize(fontSize);
    setAdvancedStyleFontStyle(fontStyle);

    // Initialize Animation Description for Infographic and Financial scenes
    if (isSora || isPlotly || sceneType === 'Infographic' || sceneType === 'Financial') {
      const animationData = scene?.animation_desc || scene?.animationDesc || {};
      const normalizedAnimation = typeof animationData === 'object' && !Array.isArray(animationData) ? { ...animationData } : {};
      setEditedAnimationDesc(normalizedAnimation);
    } else {
      // Reset animation description for non-Infographic/Financial scenes
      setEditedAnimationDesc({});
    }
  }, [activeIndex, script, scenes]);

  // Update selectedAvatar when switching scenes
  useEffect(() => {
    const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
    if (scene) {
      const sceneAvatar = scene?.avatar || (Array.isArray(scene?.avatar_urls) && scene.avatar_urls.length > 0 ? scene.avatar_urls[0] : null);
      if (sceneAvatar) {
        setSelectedAvatar(String(sceneAvatar).trim());
      } else {
        setSelectedAvatar(null);
      }
    } else {
      setSelectedAvatar(null);
    }
  }, [activeIndex, script]);

  // Update selectedPresenterPreset when switching scenes
  useEffect(() => {
    const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
    if (scene) {
      const presenterOpts = scene?.presenter_options || {};
      const presetId = presenterOpts?.preset_id || presenterOpts?.presetId || presenterOpts?.preset || presenterOpts?.anchor_id || presenterOpts?.anchorId || '';
      if (presetId) {
        setSelectedPresenterPreset(String(presetId).trim());
        setPresenterPresetOriginal(String(presetId).trim());
        setPresenterPresetDirty(false);
      } else {
        setSelectedPresenterPreset('');
        setPresenterPresetOriginal('');
        setPresenterPresetDirty(false);
      }
    } else {
      setSelectedPresenterPreset('');
      setPresenterPresetOriginal('');
      setPresenterPresetDirty(false);
    }
  }, [activeIndex, script]);

  // Cache for presenter presets to avoid redundant API calls
  const presenterPresetsCacheRef = useRef({});
  const lastFetchedModelRef = useRef('');
  const lastFetchedAspectRef = useRef('');
  const aspectRatioCacheRef = useRef(null);
  const presetJustSelectedRef = useRef(false); // Track if preset was just selected to prevent API re-call

  // Fetch presenter presets when Avatar Based is selected - only when model changes or switching scenes
  useEffect(() => {
    // Don't re-call API if preset was just selected
    if (presetJustSelectedRef.current) {
      presetJustSelectedRef.current = false;
      return;
    }

    const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
    if (!scene) {
      setPresenterPresets({ VEO3: [], ANCHOR: [] });
      setPresenterPresetsError('');
      setIsLoadingPresenterPresets(false);
      return;
    }
    const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
    const isAvatarBased = modelUpper === 'VEO3' || modelUpper.includes('VEO') || modelUpper === 'ANCHOR';
    if (!isAvatarBased) {
      setPresenterPresets({ VEO3: [], ANCHOR: [] });
      setPresenterPresetsError('');
      setIsLoadingPresenterPresets(false);
      return;
    }

    let ignore = false;
    const fetchPresenterPresets = async () => {
      try {
        setIsLoadingPresenterPresets(true);
        setPresenterPresetsError('');
        const { rawSession, rawUser } = await getSessionSnapshot();
        if (ignore) return;
        const token = localStorage.getItem('token') || '';
        const userId =
          rawUser?.id ||
          rawUser?.user_id ||
          rawUser?._id ||
          token;
        // Extract aspect ratio from session_data.scripts[0].userquery[0].additonalprop1.technical_and_formal_constraints.aspect_ratio
        let rawAspect = '';
        try {
          const scripts = Array.isArray(rawSession?.scripts) ? rawSession.scripts : [];
          const primaryScript = scripts[0] || {};
          const userquery = Array.isArray(primaryScript?.userquery) ? primaryScript.userquery : [];
          const firstUserQuery = userquery[0] || {};
          const technicalConstraints = firstUserQuery?.technical_and_formal_constraints || {};
          rawAspect = technicalConstraints?.aspect_ratio || '';

          // Extract only the numeric ratio part (e.g., "16:9" from "16:9 (Standard widescreen)")
          if (rawAspect && typeof rawAspect === 'string') {
            const ratioMatch = rawAspect.match(/^(\d+:\d+)/);
            if (ratioMatch) {
              rawAspect = ratioMatch[1];
            }
          }
        } catch (err) {
          console.warn('Failed to extract aspect ratio from session data:', err);
        }
        const normalizedAspect = normalizeTemplateAspectLabel(rawAspect);
        const aspectParam = (normalizedAspect && normalizedAspect !== 'Unspecified') ? normalizedAspect : '';
        const modeParam = 'veo3_presets';
        const params = new URLSearchParams();
        if (userId) params.set('user_id', String(userId));
        if (aspectParam) params.set('aspect_ratio', aspectParam);
        params.set('mode', modeParam);
        const url = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/presets?${params.toString()}`;
        const resp = await fetch(url, { method: 'GET' });
        const text = await resp.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = text;
        }
        console.log('[presenter] presets response', { url, data });
        if (!resp.ok) throw new Error(`presets request failed: ${resp.status}`);
        const listSource = Array.isArray(data?.presets)
          ? data.presets
          : Array.isArray(data?.data)
            ? data.data
            : Array.isArray(data)
              ? data
              : [];
        const normalizedList = listSource
          .map((item) => {
            if (!item) return null;
            if (typeof item === 'string') return { option: item, preset_id: String(item) };
            if (typeof item === 'object') {
              const option =
                item.option ||
                item.name ||
                item.title ||
                item.label ||
                '';
              if (!option) return null;
              const presetId =
                item.preset_id ||
                item.presetId ||
                item.id ||
                item.value ||
                item.option_id ||
                item.optionId ||
                option;
              const rawPreviewUrl =
                item.sample_video ||
                item.sampleVideo ||
                item.sample_video_url ||
                item.sampleVideoUrl ||
                item.sample_url ||
                item.sampleUrl ||
                item.sample_img ||
                item.sampleImg ||
                item.sample_image ||
                item.sampleImage ||
                item.sample_image_url ||
                item.sampleImageUrl ||
                item.preview_url ||
                item.previewUrl ||
                item.thumbnail ||
                item.thumbnail_url ||
                item.thumbnailUrl ||
                item.image ||
                item.image_url ||
                item.imageUrl ||
                '';
              const rawPreviewType =
                item.sample_video_type ||
                item.sampleVideoType ||
                item.sample_type ||
                item.sampleType ||
                item.preview_type ||
                item.previewType ||
                '';
              const inferPreviewType = (url) => {
                if (!url || typeof url !== 'string') return '';
                const clean = url.split('?')[0].toLowerCase();
                const videoExts = ['.mp4', '.mov', '.m4v', '.webm', '.ogg', '.ogv'];
                const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.avif'];
                if (videoExts.some((ext) => clean.endsWith(ext))) return 'video';
                if (imageExts.some((ext) => clean.endsWith(ext))) return 'image';
                return '';
              };
              const sampleVideoType =
                rawPreviewType && typeof rawPreviewType === 'string'
                  ? rawPreviewType.toLowerCase()
                  : inferPreviewType(rawPreviewUrl);
              const anchorId = item.anchor_id || item.anchorId || '';
              const promptTemplate = item.prompt_template || item.promptTemplate || item.veo3_prompt_template || item.veo3PromptTemplate || null;
              return {
                option,
                preset_id: String(presetId),
                anchor_id: anchorId ? String(anchorId) : undefined,
                sample_video: rawPreviewUrl || '',
                sample_video_type: sampleVideoType,
                prompt_template: promptTemplate
              };
            }
            return null;
          })
          .filter(Boolean);
        if (!ignore) {
          // Normalize the key to 'VEO3' if it contains 'VEO', otherwise keep as is (for ANCHOR)
          const presetKey = (modelUpper === 'VEO3' || modelUpper.includes('VEO')) ? 'VEO3' : modelUpper;
          setPresenterPresets((prev) => ({
            ...prev,
            [presetKey]: normalizedList
          }));
        }
      } catch (err) {
        if (!ignore) {
          console.warn('Failed to load presenter presets:', err);
          // Normalize the key to 'VEO3' if it contains 'VEO', otherwise keep as is (for ANCHOR)
          const presetKey = (modelUpper === 'VEO3' || modelUpper.includes('VEO')) ? 'VEO3' : modelUpper;
          setPresenterPresets((prev) => ({
            ...prev,
            [presetKey]: []
          }));
          setPresenterPresetsError(err?.message || 'Failed to load presets');
        }
      } finally {
        if (!ignore) setIsLoadingPresenterPresets(false);
      }
    };
    fetchPresenterPresets();
    return () => {
      ignore = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeIndex, script, script?.[activeIndex]?.model, script?.[activeIndex]?.mode]); // Depend on activeIndex and scene model to refetch when video type changes (e.g., Infographic to Avatar Based)

  // Initialize selected presenter preset from scene data - check preset_id from presenter_options
  useEffect(() => {
    const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
    if (!scene) {
      setSelectedPresenterPreset('');
      setPresenterPresetOriginal('');
      setPresenterPresetDirty(false);
      return;
    }
    const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
    const isAvatarBased = modelUpper === 'VEO3' || modelUpper.includes('VEO') || modelUpper === 'ANCHOR';
    if (!isAvatarBased) {
      setSelectedPresenterPreset('');
      setPresenterPresetOriginal('');
      setPresenterPresetDirty(false);
      return;
    }
    // Normalize the key to 'VEO3' if it contains 'VEO', otherwise keep as is (for ANCHOR)
    const presetKey = (modelUpper === 'VEO3' || modelUpper.includes('VEO')) ? 'VEO3' : modelUpper;
    const list = Array.isArray(presenterPresets[presetKey]) ? presenterPresets[presetKey] : [];
    const presenterOpts = scene?.presenter_options || scene?.presenterOptions || {};
    // Check preset_id from presenter_options (primary check)
    const scenePresetId = presenterOpts?.preset_id || presenterOpts?.presetId || '';
    const sceneAnchorId = presenterOpts?.anchor_id || presenterOpts?.anchorId || '';
    const scenePreset = presenterOpts?.preset || '';

    let resolvedValue = '';

    if (modelUpper === 'ANCHOR') {
      // For ANCHOR, check anchor_id first, then preset_id
      let valueToMatch = '';
      if (sceneAnchorId) {
        valueToMatch = String(sceneAnchorId).trim();
      } else if (scenePresetId) {
        valueToMatch = String(scenePresetId).trim();
      } else if (scenePreset) {
        valueToMatch = String(scenePreset).trim();
      }
      if (valueToMatch && list.length > 0) {
        const match = list.find((item) => {
          const itemAnchorId = String(item?.anchor_id || item?.anchorId || '').trim();
          const itemPresetId = String(item?.preset_id || '').trim();
          return itemAnchorId === valueToMatch || itemPresetId === valueToMatch;
        });
        if (match) {
          resolvedValue = String(match.preset_id || match.option || '');
        }
      }
    } else if (modelUpper === 'VEO3') {
      // For VEO3, check preset_id from presenter_options
      let valueToMatch = '';
      if (scenePresetId) {
        valueToMatch = String(scenePresetId).trim();
      } else if (scenePreset) {
        valueToMatch = String(scenePreset).trim();
      }
      if (valueToMatch && list.length > 0) {
        const match = list.find((item) => {
          const itemPresetId = String(item?.preset_id || '').trim();
          return itemPresetId === valueToMatch;
        });
        if (match) {
          resolvedValue = String(match.preset_id || match.option || '');
        }
      }
    }

    console.log('[BuildReel] Presenter preset from scene data:', {
      presenter_options: presenterOpts,
      preset_id: scenePresetId,
      preset: scenePreset,
      anchor_id: sceneAnchorId,
      resolvedValue: resolvedValue,
      model: modelUpper,
      availablePresets: list.length
    });

    setSelectedPresenterPreset(resolvedValue);
    setPresenterPresetOriginal(resolvedValue);
    setPresenterPresetDirty(false);
  }, [script, activeIndex, presenterPresets]);

  // Handler for presenter preset change - update scene data only (no API call)
  const handlePresenterPresetChange = (value) => {
    const normalizedValue = value != null ? String(value) : '';

    // Set flag to prevent API re-call
    presetJustSelectedRef.current = true;

    setSelectedPresenterPreset(normalizedValue);
    setPresenterPresetDirty(normalizedValue !== presenterPresetOriginal);

    // Update preset selection in scene data immediately (no API call)
    try {
      const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
      if (!scene) return;
      const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
      const isAvatarBased = modelUpper === 'VEO3' || modelUpper.includes('VEO') || modelUpper === 'ANCHOR';
      if (!isAvatarBased) return;

      // Normalize the key to 'VEO3' if it contains 'VEO', otherwise keep as is (for ANCHOR)
      const presetKey = (modelUpper === 'VEO3' || modelUpper.includes('VEO')) ? 'VEO3' : modelUpper;
      const list = Array.isArray(presenterPresets[presetKey]) ? presenterPresets[presetKey] : [];
      const selectedPreset = list.find(
        (item) => String(item?.preset_id || item?.option || '') === normalizedValue
      ) || {};

      const presenterOpts = {
        ...(scene.presenter_options || {}),
        option: selectedPreset.option || '',
        preset_id: normalizedValue
      };

      // For VEO3 models, also save preset_id to the preset field
      if (modelUpper === 'VEO3') {
        presenterOpts.preset = normalizedValue;
      }

      // For ANCHOR models, include anchor_id from the preset
      if (modelUpper === 'ANCHOR' && selectedPreset?.anchor_id) {
        presenterOpts.anchor_id = String(selectedPreset.anchor_id);
      }

      // Update scene data with presenter_options and veo3_prompt_template
      const updateData = { presenter_options: presenterOpts };

      // Add veo3_prompt_template from selected preset's prompt_template (for avatar based videos)
      if (selectedPreset?.prompt_template) {
        updateData.veo3_prompt_template = selectedPreset.prompt_template;

        // Also populate Scene Description fields from prompt_template
        const promptTemplate = selectedPreset.prompt_template;
        if (promptTemplate && typeof promptTemplate === 'object') {
          const sceneDescUpdates = {};
          // Map prompt_template fields to Scene Description fields
          if (promptTemplate.style) sceneDescUpdates.styleCard = promptTemplate.style;
          if (promptTemplate.action) sceneDescUpdates.action = promptTemplate.action;
          if (promptTemplate.camera) sceneDescUpdates.cameraCard = promptTemplate.camera;
          if (promptTemplate.subject) sceneDescUpdates.subject = promptTemplate.subject;
          if (promptTemplate.ambiance) sceneDescUpdates.ambiance = promptTemplate.ambiance;
          if (promptTemplate.background) sceneDescUpdates.background = promptTemplate.background;
          if (promptTemplate.composition) sceneDescUpdates.composition = promptTemplate.composition;
          if (promptTemplate.focus_and_lens) sceneDescUpdates.focus_and_lens = promptTemplate.focus_and_lens;

          // Merge scene description updates
          Object.assign(updateData, sceneDescUpdates);
        }
      }

      // Clear background_image when preset is selected
      updateData.background_image = [];
      updateData.ref_image = [];

      // Update scene data immediately (no API call - only local update)
      updateScriptScene(activeIndex, updateData);

      // Update state to reflect the change
      setPresenterPresetOriginal(normalizedValue);
      setPresenterPresetDirty(false);
    } catch (err) {
      console.error('Failed to update presenter preset:', err);
    }
  };

  // Handler for saving presenter preset
  const handleConfirmPresenterPresetSave = async () => {
    if (!pendingPresenterPresetId) return;
    setIsSavingPresenterPreset(true);
    try {
      const sessionId = localStorage.getItem('session_id') || '';
      const token = localStorage.getItem('token') || '';
      if (!sessionId || !token) throw new Error('Missing session_id or token');
      const { rawSession, rawUser } = await getSessionSnapshot();
      const sanitizedSession = sanitizeSessionSnapshot(rawSession, sessionId, token);
      const normalizedUser = normalizeUserSnapshot(rawUser, token);
      const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
      if (!scene) throw new Error('Scene not found');
      const sceneNumber = scene?.scene_number ?? activeIndex + 1;
      const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
      // Normalize the key to 'VEO3' if it contains 'VEO', otherwise keep as is (for ANCHOR)
      const presetKey = (modelUpper === 'VEO3' || modelUpper.includes('VEO')) ? 'VEO3' : modelUpper;
      const list = Array.isArray(presenterPresets[presetKey]) ? presenterPresets[presetKey] : [];
      const selectedPreset =
        list.find(
          (item) =>
            String(item?.preset_id || item?.option || '') === String(pendingPresenterPresetId)
        ) || {};
      // For ANCHOR models, use anchor_id as preset_id in the request body
      const presetIdForRequest = modelUpper === 'ANCHOR' && selectedPreset?.anchor_id
        ? String(selectedPreset.anchor_id)
        : String(pendingPresenterPresetId || '');

      // Extract aspect ratio from session_data.scripts[0].userquery[0].additonalprop1.technical_and_formal_constraints.aspect_ratio
      let rawAspect = '';
      try {
        const scripts = Array.isArray(rawSession?.scripts) ? rawSession.scripts : [];
        const primaryScript = scripts[0] || {};
        const userquery = Array.isArray(primaryScript?.userquery) ? primaryScript.userquery : [];
        const firstUserQuery = userquery[0] || {};
        const technicalConstraints = firstUserQuery?.technical_and_formal_constraints || {};
        rawAspect = technicalConstraints?.aspect_ratio || '';

        // Extract only the numeric ratio part (e.g., "16:9" from "16:9 (Standard widescreen)")
        if (rawAspect && typeof rawAspect === 'string') {
          const ratioMatch = rawAspect.match(/^(\d+:\d+)/);
          if (ratioMatch) {
            rawAspect = ratioMatch[1];
          }
        }
      } catch (err) {
        console.warn('Failed to extract aspect ratio from session data:', err);
      }
      const normalizedAspect = normalizeTemplateAspectLabel(rawAspect);
      const aspectRatio = normalizedAspect && normalizedAspect !== 'Unspecified' ? normalizedAspect : '';

      const payload = {
        user: normalizedUser,
        session: sanitizedSession,
        scene_number: sceneNumber,
        preset_id: presetIdForRequest
      };

      // Add aspect_ratio to payload if found (same as Chat.js pattern)
      if (aspectRatio) {
        payload.aspect_ratio = aspectRatio;
      }
      const resp = await fetch(
        'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-preset',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
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
        throw new Error(`scripts/update-preset failed: ${resp.status} ${text}`);
      }
      const savedPreset = selectedPreset;
      const savedLabel = pendingPresenterPresetLabel || savedPreset.option || '';
      if (scene) {
        const rows = [...(script || [])];
        const presenterOpts = {
          ...(scene.presenter_options || {}),
          option: savedLabel,
          preset_id: pendingPresenterPresetId
        };
        // For VEO3 models, also save preset_id to the preset field
        if (modelUpper === 'VEO3') {
          presenterOpts.preset = String(pendingPresenterPresetId);
        }
        // For ANCHOR models, include anchor_id from the preset
        if (modelUpper === 'ANCHOR' && savedPreset?.anchor_id) {
          presenterOpts.anchor_id = String(savedPreset.anchor_id);
        }

        // Add veo3_prompt_template from saved preset's prompt_template
        const updateData = { presenter_options: presenterOpts };
        if (savedPreset?.prompt_template) {
          updateData.veo3_prompt_template = savedPreset.prompt_template;
        }

        const updated = {
          ...scene,
          presenter_options: presenterOpts,
          ...(savedPreset?.prompt_template ? { veo3_prompt_template: savedPreset.prompt_template } : {})
        };
        rows[activeIndex] = updated;
        updateScriptScene(activeIndex, updateData);
      }
      try {
        const stored = { option: savedLabel, preset_id: pendingPresenterPresetId };
        if (sessionId) localStorage.setItem(`presenter_option:${sessionId}`, JSON.stringify(stored));
        else localStorage.setItem('presenter_option', JSON.stringify(stored));
      } catch (_) { /* noop */ }
      const savedIdString = String(pendingPresenterPresetId || '');
      setPresenterPresetOriginal(savedIdString);
      setPresenterPresetDirty(false);
      setSelectedPresenterPreset(savedIdString);
      toast.success('Presenter preset saved');
    } catch (e) {
      console.error('scripts/update-preset failed:', e);
      alert('Failed to update presenter preset. Please try again.');
    } finally {
      setIsSavingPresenterPreset(false);
      setShowPresenterSaveConfirm(false);
      setPendingPresenterPresetId('');
      setPendingPresenterPresetLabel('');
    }
  };

  return (
    <div className='bg-white h-[100vh] w-full rounded-lg p-6 overflow-y-auto'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-[24px] font-semibold'>Add Your Scenes</h2>
        <div className="flex items-center gap-2">
          {/* Go to Storyboard button */}
          {hasImages && (
            <button
              onClick={onGoToStoryboard}
              className='px-5 py-2 rounded-lg bg-[#fff] text-[#000] border-[1px] border-black flex items-center gap-2 hover:bg-gray-800 transition-colors'
            >
              Go to Storyboard
            </button>
          )}
          {/* Generate Storyboard button - top right */}
          <button
            onClick={async (e) => {
              e.preventDefault();
              e.stopPropagation();
              if (isGenerating) return;
              if (!onGenerate) {
                console.error('onGenerate is not defined');
                return;
              }
              if (!script) {
                console.error('script is not defined');
                return;
              }
              try {
                await onGenerate(script);
              } catch (error) {
                console.error('Error calling onGenerate:', error);
              }
            }}
            disabled={isGenerating || !script || script.length === 0}
            className='px-5 py-2 rounded-lg bg-[#13008B] text-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 hover:bg-gray-800 transition-colors'
          >
            {isGenerating ? (
              <>
                <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
                Generating Storyboard...
              </>
            ) : (
              'Generate Storyboard'
            )}
          </button>
        </div>
      </div>

      <div className='flex items-center gap-2 mb-5'>
        {/* Left arrow button */}
        <button
          onClick={() => {
            setVisibleStartIndex(prev => Math.max(0, prev - 1));
          }}
          disabled={visibleStartIndex <= 0}
          className={`w-6 h-6 rounded-full flex items-center justify-center border ${visibleStartIndex <= 0
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'
            }`}
          title="Previous scenes"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Scene tabs - show 5 at a time */}
        {(() => {
          const total = Array.isArray(script) ? script.length : 0;
          const start = Math.max(0, Math.min(visibleStartIndex, Math.max(0, total - 5)));
          const end = start + 5;
          const slice = Array.isArray(script) ? script.slice(start, end) : [];
          return slice.map((scene, idxLocal) => {
            const index = start + idxLocal;
            return (
              <button
                key={index}
                onClick={() => {
                  setActiveIndex(index);
                  // Auto-scroll to keep selected scene visible
                  if (index < visibleStartIndex) {
                    setVisibleStartIndex(Math.max(0, index));
                  } else if (index >= visibleStartIndex + 5) {
                    setVisibleStartIndex(Math.max(0, index - 4));
                  }
                }}
                className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${activeIndex === index
                  ? 'bg-[#13008B] text-white'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                Scene {index + 1}
              </button>
            );
          });
        })()}

        {/* Right arrow button */}
        <button
          onClick={() => {
            setVisibleStartIndex(prev => Math.min(Math.max(0, (Array.isArray(script) ? script.length : 0) - 5), prev + 1));
          }}
          disabled={(() => {
            const total = Array.isArray(script) ? script.length : 0;
            return visibleStartIndex >= Math.max(0, total - 5);
          })()}
          className={`w-6 h-6 rounded-full flex items-center justify-center border ${(() => {
            const total = Array.isArray(script) ? script.length : 0;
            return visibleStartIndex >= Math.max(0, total - 5);
          })()
            ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed'
            : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'
            }`}
          title="Next scenes"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Circular + button to add scene */}
        <button
          onClick={addScene}
          className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center hover:bg-gray-800"
          title="Add new scene"
        >
          +
        </button>

        {/* Save Scenes button */}
        <button
          onClick={async () => {
            try {
              await saveScenesToServer();
              toast.success('Scenes saved successfully');
            } catch (error) {
              console.error('Failed to save scenes:', error);
              toast.error(error?.message || 'Failed to save scenes. Please try again.');
            }
          }}
          disabled={isSavingScenes || script.length === 0}
          className='ml-2 flex items-center gap-2 px-4 py-2 rounded-full bg-[#13008B] text-white border border-[#13008B] hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed'
        >
          {isSavingScenes ? (
            <>
              <div className='w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin' />
              Saving...
            </>
          ) : (
            <>
              <FaCheck /> Save Scenes
            </>
          )}
        </button>

        {/* Kebab Menu */}
        <div ref={kebabMenuRef} className="relative">
          <button
            onClick={() => setKebabMenuOpen(v => !v)}
            className="inline-flex items-center justify-center w-9 h-9 rounded-lg border bg-white hover:bg-gray-50 ml-2"
            title="More"
          >
            <MoreHorizontal className="w-5 h-5" />
          </button>
          {kebabMenuOpen && (
            <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden">
              <div className="py-1">
                <button
                  onClick={() => {
                    setKebabMenuOpen(false);
                    handleUndoScript();
                  }}
                  disabled={!canUndo}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${canUndo ? 'hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                >
                  <RefreshCcw className="w-4 h-4 rotate-180 text-[#13008B]" />
                  <span>Undo</span>
                </button>
                <button
                  onClick={() => {
                    setKebabMenuOpen(false);
                    handleRedoScript();
                  }}
                  disabled={!canRedo}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${canRedo ? 'hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}
                >
                  <RefreshCcw className="w-4 h-4 text-[#13008B]" />
                  <span>Redo</span>
                </button>
                <div className="my-1 h-px bg-gray-100" />
                <button
                  onClick={() => {
                    setKebabMenuOpen(false);
                    setShowDeleteConfirm(true);
                  }}
                  disabled={isDeletingScene || script.length === 0}
                  className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${(!script.length || isDeletingScene) ? 'text-gray-400 cursor-not-allowed' : 'text-red-700 hover:bg-red-50'}`}
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete Scene</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scene Editor */}
      <div className='space-y-6'>
        {/* Scene Details */}
        <div className='bg-gray-50 border border-gray-200 rounded-xl p-4'>
          <h3 className='text-lg font-semibold text-gray-900 mb-4'>Scene Details</h3>
          <div className='grid grid-cols-3 gap-4 mb-4'>
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
                    className={`px-3 py-2 rounded-full text-sm border transition-colors ${(scenes[activeIndex]?.type === t) ? 'bg-[#13008B] text-white border-[#13008B]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }`}
                  >
                    {t.replace('Based', '').trim()}
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
          <div className={`grid ${(() => {
            const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
            const sceneModelUpper = scene ? String(scene?.model || scene?.mode || '').toUpperCase() : '';
            const sceneType = scenes[activeIndex]?.type || '';
            const isInfographic = sceneModelUpper === 'SORA' || sceneType === 'Infographic';
            const isFinancial = sceneModelUpper === 'PLOTLY' || sceneType === 'Financial';
            return (isInfographic || isFinancial) ? 'grid-cols-1 md:grid-cols-2 gap-4' : 'grid-cols-1';
          })()}`}>
            <div className='bg-white border border-gray-200 rounded-lg p-3'>
              <div className='flex items-center justify-between mb-2'>
                <label className='text-xs font-semibold text-gray-600'>Narration <span className='text-red-500'>*</span></label>
                <button
                  type="button"
                  onClick={() => enhanceField('narration')}
                  disabled={enhancingFields['narration']}
                  className='flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors'
                  title='Enhance with AI'
                >
                  {enhancingFields['narration'] ? (
                    <>
                      <div className="w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
                      <span>AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className='w-3 h-3' />
                      <span>AI</span>
                    </>
                  )}
                </button>
              </div>
              <textarea
                rows={4}
                value={scenes[activeIndex]?.narration || ''}
                onChange={(e) => setScene(activeIndex, { narration: e.target.value })}
                className='w-full p-3 border rounded-lg'
                placeholder='Narration for this scene'
                required
              />
            </div>
            {(() => {
              const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
              const sceneModelUpper = scene ? String(scene?.model || scene?.mode || '').toUpperCase() : '';
              const sceneType = scenes[activeIndex]?.type || '';
              const isInfographic = sceneModelUpper === 'SORA' || sceneType === 'Infographic';
              const isFinancial = sceneModelUpper === 'PLOTLY' || sceneType === 'Financial';
              if (isInfographic || isFinancial) {
                return (
                  <div className='bg-white border border-gray-200 rounded-lg p-3'>
                    <div className='flex items-center justify-between mb-2'>
                      <label className='text-xs font-semibold text-gray-600'>Description <span className='text-red-500'>*</span></label>
                      <button
                        type="button"
                        onClick={() => enhanceField('desc')}
                        disabled={enhancingFields['desc']}
                        className='flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors'
                        title='Enhance with AI'
                      >
                        {enhancingFields['desc'] ? (
                          <>
                            <div className="w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
                            <span>AI...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className='w-3 h-3' />
                            <span>AI</span>
                          </>
                        )}
                      </button>
                    </div>
                    <textarea
                      rows={4}
                      value={scenes[activeIndex]?.desc || scenes[activeIndex]?.description || ''}
                      onChange={(e) => {
                        const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
                        updateScriptScene(activeIndex, {
                          desc: e.target.value,
                          description: e.target.value
                        });
                      }}
                      className='w-full p-3 border rounded-lg'
                      placeholder='Description for this scene (required)'
                      required
                    />
                  </div>
                );
              }
              return null;
            })()}
          </div>
        </div>

        {/* Scene Visual - Always open for Infographic scenes */}
        {(() => {
          const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
          if (!scene) return null;
          const sceneModelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
          const isSora = sceneModelUpper === 'SORA';
          const sceneType = scenes[activeIndex]?.type || '';
          if (!(isSora || sceneType === 'Infographic')) return null;

          return (
            <div className='space-y-4 mt-6'>
              <div className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
                <h4 className='text-lg font-semibold text-gray-800 mb-4'>Scene Visual</h4>

                {/* Opening Frame - Always Open */}
                <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
                  <div className="bg-white rounded-lg border border-gray-200 mb-4">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                      <span className="text-sm font-semibold text-gray-800">Opening Frame</span>
                      <button
                        type="button"
                        onClick={() => enhanceField('opening_frame')}
                        disabled={enhancingFields['opening_frame']}
                        className='flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors'
                        title='Enhance with AI'
                      >
                        {enhancingFields['opening_frame'] ? (
                          <>
                            <div className="w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
                            <span>AI...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className='w-3 h-3' />
                            <span>AI</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="px-4 pb-4 pt-4">
                      {(() => {
                        const formatTitle = (key) => {
                          const cleaned = key.replace(/_/g, ' ').trim();
                          if (!cleaned) return '';
                          return cleaned
                            .split(' ')
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                            .join(' ');
                        };
                        const allFields = ['style', 'action', 'setting', 'subject', 'composition', 'factual_details', 'camera_lens_shadow_lighting'];

                        return (
                          <>
                            <div className="grid grid-cols-1 gap-4">
                              {allFields.map((key) => {
                                const title = formatTitle(key);
                                const currentValue = editedOpeningFrame[key] || '';
                                return (
                                  <div
                                    key={key}
                                    className="border border-gray-200 rounded-lg bg-white p-4 space-y-2 shadow-sm"
                                  >
                                    <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                      {title}
                                    </h5>
                                    <textarea
                                      value={currentValue}
                                      onChange={(e) => {
                                        const newData = { ...editedOpeningFrame };
                                        newData[key] = e.target.value;
                                        setEditedOpeningFrame(newData);
                                        // Update local script state immediately
                                        updateScriptScene(activeIndex, { opening_frame: newData });
                                      }}
                                      onBlur={async (e) => {
                                        // Auto-save to backend on blur
                                        try {
                                          // Use the latest value from the event target to ensure we have the most current data
                                          const latestData = { ...editedOpeningFrame };
                                          latestData[key] = e.target.value;
                                          setEditedOpeningFrame(latestData);
                                          await saveFrameData('opening_frame', latestData);
                                        } catch (err) {
                                          console.error('Failed to auto-save opening frame:', err);
                                        }
                                      }}
                                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm text-gray-600 resize-none"
                                      rows={3}
                                      disabled={isSavingFrameData}
                                      placeholder={`Enter ${title.toLowerCase()}...`}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>

                  {/* Closing Frame - Always Open */}
                  <div className="bg-white rounded-lg border border-gray-200">
                    <div className="flex items-center justify-between p-4 border-b border-gray-200">
                      <span className="text-sm font-semibold text-gray-800">Closing Frame</span>
                      <button
                        type="button"
                        onClick={() => enhanceField('closing_frame')}
                        disabled={enhancingFields['closing_frame']}
                        className='flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors'
                        title='Enhance with AI'
                      >
                        {enhancingFields['closing_frame'] ? (
                          <>
                            <div className="w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
                            <span>AI...</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className='w-3 h-3' />
                            <span>AI</span>
                          </>
                        )}
                      </button>
                    </div>
                    <div className="px-4 pb-4 pt-4">
                      {(() => {
                        const formatTitle = (key) => {
                          const cleaned = key.replace(/_/g, ' ').trim();
                          if (!cleaned) return '';
                          return cleaned
                            .split(' ')
                            .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                            .join(' ');
                        };
                        const allFields = ['style', 'action', 'setting', 'subject', 'composition', 'factual_details', 'camera_lens_shadow_lighting'];

                        return (
                          <>
                            <div className="grid grid-cols-1 gap-4">
                              {allFields.map((key) => {
                                const title = formatTitle(key);
                                const currentValue = editedClosingFrame[key] || '';
                                return (
                                  <div
                                    key={key}
                                    className="border border-gray-200 rounded-lg bg-white p-4 space-y-2 shadow-sm"
                                  >
                                    <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                      {title}
                                    </h5>
                                    <textarea
                                      value={currentValue}
                                      onChange={(e) => {
                                        const newData = { ...editedClosingFrame };
                                        newData[key] = e.target.value;
                                        setEditedClosingFrame(newData);
                                        // Update local script state immediately
                                        updateScriptScene(activeIndex, { closing_frame: newData });
                                      }}
                                      onBlur={async (e) => {
                                        // Auto-save to backend on blur
                                        try {
                                          // Use the latest value from the event target to ensure we have the most current data
                                          const latestData = { ...editedClosingFrame };
                                          latestData[key] = e.target.value;
                                          setEditedClosingFrame(latestData);
                                          await saveFrameData('closing_frame', latestData);
                                        } catch (err) {
                                          console.error('Failed to auto-save closing frame:', err);
                                        }
                                      }}
                                      className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm text-gray-600 resize-none"
                                      rows={3}
                                      disabled={isSavingFrameData}
                                      placeholder={`Enter ${title.toLowerCase()}...`}
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Scene Visual - Background Frame for Financial scenes */}
        {(() => {
          const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
          if (!scene) return null;
          const sceneModelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
          const isPlotly = sceneModelUpper === 'PLOTLY';
          const sceneType = scenes[activeIndex]?.type || '';
          if (!(isPlotly || sceneType === 'Financial')) return null;

          return (
            <div className='space-y-4 mt-6'>
              <div className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
                <h4 className='text-lg font-semibold text-gray-800 mb-4'>Scene Visual</h4>

                {/* Background Frame - Always Open */}
                <div className="bg-white rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between p-4 border-b border-gray-200">
                    <span className="text-sm font-semibold text-gray-800">Background Frame</span>
                    <button
                      type="button"
                      onClick={() => enhanceField('background_frame')}
                      disabled={enhancingFields['background_frame']}
                      className='flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors'
                      title='Enhance with AI'
                    >
                      {enhancingFields['background_frame'] ? (
                        <>
                          <div className="w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
                          <span>AI...</span>
                        </>
                      ) : (
                        <>
                          <Sparkles className='w-3 h-3' />
                          <span>AI</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="px-4 pb-4 pt-4">
                    {(() => {
                      const formatTitle = (key) => {
                        const cleaned = key.replace(/_/g, ' ').trim();
                        if (!cleaned) return '';
                        return cleaned
                          .split(' ')
                          .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                          .join(' ');
                      };
                      const allFields = ['style', 'action', 'setting', 'subject', 'composition', 'factual_details', 'camera_lens_shadow_lighting'];

                      return (
                        <>
                          <div className="grid grid-cols-1 gap-4">
                            {allFields.map((key) => {
                              const title = formatTitle(key);
                              const currentValue = editedBackgroundFrame[key] || '';
                              return (
                                <div
                                  key={key}
                                  className="border border-gray-200 rounded-lg bg-white p-4 space-y-2 shadow-sm"
                                >
                                  <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                    {title}
                                  </h5>
                                  <textarea
                                    value={currentValue}
                                    onChange={(e) => {
                                      const newData = { ...editedBackgroundFrame };
                                      newData[key] = e.target.value;
                                      setEditedBackgroundFrame(newData);
                                      // Update local script state immediately
                                      updateScriptScene(activeIndex, { background_frame: newData });
                                    }}
                                    onBlur={async (e) => {
                                      // Auto-save to backend on blur
                                      try {
                                        // Use the latest value from the event target to ensure we have the most current data
                                        const latestData = { ...editedBackgroundFrame };
                                        latestData[key] = e.target.value;
                                        setEditedBackgroundFrame(latestData);
                                        await saveFrameData('background_frame', latestData);
                                      } catch (err) {
                                        console.error('Failed to auto-save background frame:', err);
                                      }
                                    }}
                                    className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm text-gray-600 resize-none"
                                    rows={3}
                                    disabled={isSavingFrameData}
                                    placeholder={`Enter ${title.toLowerCase()}...`}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          );
        })()}

        {/* Scene Description - Hidden for Infographic and Financial scenes */}
        {(() => {
          const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
          if (!scene) return null;
          const sceneModelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
          const isSora = sceneModelUpper === 'SORA';
          const isPlotly = sceneModelUpper === 'PLOTLY';
          const sceneType = scenes[activeIndex]?.type || '';
          const isInfographic = isSora || sceneType === 'Infographic';
          const isFinancial = isPlotly || sceneType === 'Financial';

          // Hide Scene Description for Infographic and Financial scenes
          if (isInfographic || isFinancial) return null;

          return (
            <div className='bg-gray-50 border border-gray-200 rounded-xl p-4'>
              <div className='mb-4'>
                <h3 className='text-lg font-semibold text-gray-900'>Scene Description</h3>
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
                ].map(({ key, label }) => {
                  // Read directly from script to ensure we get the latest value
                  const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;

                  // Always prioritize veo3_prompt_template values over direct fields
                  let fieldValue = '';
                  if (scene?.veo3_prompt_template && typeof scene.veo3_prompt_template === 'object') {
                    const promptTemplate = scene.veo3_prompt_template;
                    // Map Scene Description keys to prompt_template keys
                    const promptKeyMap = {
                      'styleCard': 'style',
                      'action': 'action',
                      'cameraCard': 'camera',
                      'subject': 'subject',
                      'ambiance': 'ambiance',
                      'background': 'background',
                      'composition': 'composition',
                      'focus_and_lens': 'focus_and_lens'
                    };
                    const promptKey = promptKeyMap[key];
                    if (promptKey && promptTemplate[promptKey]) {
                      fieldValue = promptTemplate[promptKey];
                    }
                  }

                  // Fallback to direct field if not in prompt_template
                  if (!fieldValue) {
                    fieldValue = scene?.[key] || '';
                  }

                  return (
                    <div key={key} className='bg-white border border-gray-200 rounded-lg p-3'>
                      <p className='text-xs font-semibold text-gray-600 mb-2 uppercase tracking-wide'>{label}</p>
                      <textarea
                        rows={2}
                        value={fieldValue}
                        disabled={true}
                        readOnly={true}
                        className='w-full p-2 border rounded-lg text-sm bg-gray-100 cursor-not-allowed opacity-75'
                        placeholder={`Add ${label.toLowerCase()}...`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })()}

        {/* Text To Be Included */}
        <div className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
          <h4 className='text-lg font-semibold text-gray-800 mb-2'>Text To Be Included</h4>
          {(() => {
            const r = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
            const items = Array.isArray(r?.text_to_be_included) ? r.text_to_be_included : [];
            const removeAt = (idx) => {
              const next = items.slice();
              next.splice(idx, 1);
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
                  {items.map((t, i) => (
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
        {/* Avatar selection section - only show when Avatar Based */}
        {((scenes[activeIndex]?.type || '') === 'Avatar Based') && (
          <div>
            <div className='w-full'>
              {(() => {
                const seenUrls = new Set();
                const allAvatars = [];
                const normalizeAvatar = (item) => {
                  if (item && typeof item === 'object' && item.url) {
                    return { name: item.name || '', url: String(item.url).trim() };
                  }
                  if (typeof item === 'string') {
                    const trimmedUrl = item.trim();
                    const presetName = presetAvatarNames[trimmedUrl];
                    return { name: presetName || '', url: trimmedUrl };
                  }
                  return null;
                };
                const addIfNotSeen = (avatar) => {
                  const normalized = normalizeAvatar(avatar);
                  if (normalized && normalized.url && !seenUrls.has(normalized.url)) {
                    seenUrls.add(normalized.url);
                    allAvatars.push(normalized);
                  }
                };
                presetAvatars.forEach(addIfNotSeen);
                brandAssetsAvatars.forEach(addIfNotSeen);
                const sceneAvatar = script?.[activeIndex]?.avatar || (Array.isArray(script?.[activeIndex]?.avatar_urls) && script[activeIndex].avatar_urls.length > 0 ? script[activeIndex].avatar_urls[0] : null);
                const normalizedSceneAvatar = sceneAvatar ? String(sceneAvatar).trim() : null;
                const normalizedSelectedAvatar = selectedAvatar ? String(selectedAvatar).trim() : null;
                const isAvatarSelected = (avatarObj) => {
                  if (!avatarObj || !avatarObj.url) return false;
                  const normalizedUrl = String(avatarObj.url).trim();
                  if (normalizedSelectedAvatar && normalizedSelectedAvatar === normalizedUrl) return true;
                  if (normalizedSceneAvatar && normalizedSceneAvatar === normalizedUrl) return true;
                  return false;
                };
                return (
                  <div className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
                    <div className='mb-4'>
                      <h4 className='text-lg font-semibold text-gray-800'>Select an Avatar</h4>
                    </div>
                    {isLoadingAvatars ? (
                      <div className='flex items-center justify-center py-8'>
                        <div className='w-8 h-8 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin' />
                      </div>
                    ) : (
                      <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-4'>
                        {allAvatars.length === 0 ? (
                          <div className='col-span-full text-center py-8 text-gray-500'>
                            No avatars available. Click "Upload Avatar" to add one.
                          </div>
                        ) : (
                          allAvatars.map((avatarObj, index) => {
                            const avatarUrl = avatarObj.url;
                            const avatarName = avatarObj.name || `Avatar ${index + 1}`;
                            const isSelected = isAvatarSelected(avatarObj);
                            return (
                              <div key={index} className='flex flex-col items-center gap-2'>
                                <button
                                  type='button'
                                  onClick={async () => {
                                    try {
                                      setSelectedAvatar(avatarUrl);
                                      // Update local state only - no API call
                                      updateScriptScene(activeIndex, { avatar: avatarUrl, avatar_urls: [avatarUrl] });
                                    } catch (err) {
                                      console.error('Failed to update avatar:', err);
                                    }
                                  }}
                                  className={`w-20 h-20 rounded-lg border-2 overflow-hidden transition-colors ${isSelected ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-300 hover:border-[#13008B]'
                                    }`}
                                  title={avatarName}
                                >
                                  <img src={avatarUrl} alt={avatarName} className='w-full h-full object-cover' />
                                </button>
                                <span className='text-xs text-gray-600 text-center max-w-[80px] truncate' title={avatarName}>
                                  {avatarName}
                                </span>
                              </div>
                            );
                          })
                        )}
                        <button
                          type='button'
                          onClick={() => setShowAvatarUploadPopup(true)}
                          className='w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#13008B] transition-colors'
                          title='Upload Avatar'
                        >
                          <svg className='w-8 h-8 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                            <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M12 6v6m0 0v6m0-6h6m-6 0H6' />
                          </svg>
                        </button>
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Background Image selection section for Avatar Based - only show when Avatar Based */}
        {((scenes[activeIndex]?.type || '') === 'Avatar Based') && (
          <div>
            <div className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
              <div className='flex items-center justify-between mb-4'>
                <h4 className='text-lg font-semibold text-gray-800'>Select a Background Image</h4>
              </div>
              {(() => {
                const scene = script?.[activeIndex];
                // Check if preset is selected - if so, don't show any background images
                const presenterOpts = scene?.presenter_options || {};
                const hasPreset = presenterOpts?.preset_id || presenterOpts?.presetId || presenterOpts?.preset || presenterOpts?.anchor_id || presenterOpts?.anchorId;

                // If preset is selected, show empty state
                if (hasPreset) {
                  return (
                    <div>
                      <p className='text-sm text-gray-500'>Background images are not available when a preset is selected.</p>
                    </div>
                  );
                }

                const refs = (() => {
                  const urls = [];
                  // Only show background images if they were explicitly selected (not from preset)
                  // First try background_image array
                  if (Array.isArray(scene?.background_image) && scene.background_image.length > 0) {
                    scene.background_image.forEach(item => {
                      let url = '';
                      if (typeof item === 'string' && item.trim()) {
                        url = item.trim();
                      } else if (item && typeof item === 'object') {
                        url = item?.imageurl || item?.imageUrl || item?.image_url || item?.url || item?.src || item?.link || item?.image || '';
                        if (url) url = url.trim();
                      }
                      if (url && typeof url === 'string' && url.length > 0 && !urls.includes(url)) {
                        urls.push(url);
                      }
                    });
                  }
                  // Fallback to ref_image
                  if (urls.length === 0) {
                    const r = scene?.ref_image;
                    if (Array.isArray(r) && r.length > 0) {
                      r.forEach(url => {
                        const trimmed = typeof url === 'string' ? url.trim() : url;
                        if (trimmed && !urls.includes(trimmed)) {
                          urls.push(trimmed);
                        }
                      });
                    } else if (typeof r === 'string' && r.trim()) {
                      const trimmed = r.trim();
                      if (!urls.includes(trimmed)) urls.push(trimmed);
                    }
                  }
                  // Don't use fallback to background field - only show explicitly selected images
                  return urls;
                })();
                const selectedRefs = refs;
                return (
                  <div>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-4 mb-4'>
                      {refs.length === 0 ? (
                        <p className='text-sm text-gray-500 col-span-4'>No background images yet. Add one below.</p>
                      ) : (
                        refs.map((url, idx) => (
                          <div key={idx} className={`group relative w-24 h-24 rounded-lg border-2 ${selectedRefs.includes(url) ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-300'} overflow-visible transition-colors cursor-pointer`} title={url} onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const currentSelected = selectedRefs || [];
                              const exists = currentSelected.includes(url);
                              let newSelected;
                              if (exists) {
                                newSelected = currentSelected.filter(u => u !== url);
                              } else {
                                const next = [...currentSelected, url];
                                newSelected = next.length > 2 ? next.slice(-2) : next;
                              }
                              // Update scene with background images
                              const backgroundImageArray = newSelected.map((u) => ({
                                image_url: u,
                                template_id: ''
                              }));
                              updateScriptScene(activeIndex, {
                                ref_image: newSelected,
                                background_image: backgroundImageArray.length > 0 ? backgroundImageArray : []
                              });
                              await updateTextForSelected(activeIndex, {
                                genImage: false,
                                descriptionOverride: '',
                                refImagesOverride: newSelected
                              });
                            } catch (_) { }
                          }}>
                            <img src={url} alt={`BG ${idx + 1}`} className='w-full h-full object-cover' />
                            <button className='pointer-events-auto absolute inset-0 m-auto w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity' title='View full size' onClick={(e) => { e.stopPropagation(); window.open(url, '_blank'); }}>
                              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 10l4.553-4.553a2.121 2.121 0 10-3-3L12 7M9 14l-4.553 4.553a2.121 2.121 0 103 3L12 17' /></svg>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={openAssetsModal}
                        className='inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50'
                        title='Choose from templates'
                      >
                        <FaPlus className='w-4 h-4' /> Choose From Template
                      </button>
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
                              const curRefs = Array.isArray(script?.[activeIndex]?.ref_image) ? script[activeIndex].ref_image.slice(0, 1) : [];
                              const newRefs = [urls[0], ...curRefs].slice(0, 2);
                              const backgroundImageArray = newRefs.map((u) => ({
                                image_url: u,
                                template_id: ''
                              }));
                              updateScriptScene(activeIndex, {
                                ref_image: newRefs,
                                background_image: backgroundImageArray
                              });
                              await updateTextForSelected(activeIndex, {
                                genImage: false,
                                descriptionOverride: '',
                                refImagesOverride: newRefs
                              });
                            }
                          } finally {
                            setIsUploadingSceneImage(false);
                            if (imageFileInputRef.current) imageFileInputRef.current.value = '';
                          }
                        }}
                      />
                      <button
                        onClick={() => imageFileInputRef.current?.click()}
                        className='inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50'
                        disabled={isUploadingSceneImage}
                      >
                        {isUploadingSceneImage ? 'Uploading...' : 'Upload Image'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Scene Settings section for Avatar Based - only show when Avatar Based */}
        {((scenes[activeIndex]?.type || '') === 'Avatar Based') && (() => {
          const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
          if (!scene) return null;
          const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
          const isAvatarBased = modelUpper === 'VEO3' || modelUpper.includes('VEO') || modelUpper === 'ANCHOR';
          if (!isAvatarBased) return null;
          const presetKey = (modelUpper === 'VEO3' || modelUpper.includes('VEO')) ? 'VEO3' : 'ANCHOR';
          const optionsList = Array.isArray(presenterPresets[presetKey]) ? presenterPresets[presetKey] : [];
          const selectedPreset =
            optionsList.find(
              (opt) =>
                String(opt?.preset_id || opt?.option || '') ===
                String(selectedPresenterPreset || '')
            ) || null;
          const canSave =
            presenterPresetDirty &&
            !!selectedPresenterPreset &&
            !isLoadingPresenterPresets;
          return (
            <div className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
              <div className='mb-3'>
                <h4 className='text-lg font-semibold text-gray-800'>Scene Settings</h4>
              </div>
              <div className='mt-3'>
                {isLoadingPresenterPresets ? (
                  <div className='flex items-center gap-2 text-sm text-gray-500'>
                    <span className='inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[#13008B] border-t-transparent' />
                    Loading presenter presets…
                  </div>
                ) : optionsList.length === 0 ? (
                  <div className='rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600'>
                    No presenter presets available for this configuration.
                  </div>
                ) : (
                  <div className='grid grid-cols-5 gap-3 pb-2'>
                    {optionsList.map((po) => {
                      const value =
                        po?.preset_id != null
                          ? String(po.preset_id)
                          : String(po.option || '');
                      // Check if preset_id from presenter_options matches this preset's preset_id
                      const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
                      const presenterOpts = scene?.presenter_options || scene?.presenterOptions || {};
                      const scenePresetId = String(presenterOpts?.preset_id || presenterOpts?.presetId || '').trim();
                      const scenePreset = String(presenterOpts?.preset || '').trim();

                      // Match based on preset_id from presenter_options (primary) or preset field (fallback)
                      const matchesPresetId = scenePresetId && String(value).trim() === scenePresetId;
                      const matchesPreset = scenePreset && String(value).trim() === scenePreset;
                      const matchesState = String(selectedPresenterPreset || '').trim() === String(value).trim();

                      const isSelected = matchesPresetId || matchesPreset || matchesState;

                      // Debug log for first preset to help troubleshoot
                      if (optionsList.indexOf(po) === 0) {
                        console.log('[BuildReel] Preset selection check:', {
                          presetValue: value,
                          scenePresetId: scenePresetId,
                          scenePreset: scenePreset,
                          selectedPresenterPreset: selectedPresenterPreset,
                          presenterOptions: presenterOpts,
                          isSelected: isSelected,
                          matchesPresetId: matchesPresetId,
                          matchesPreset: matchesPreset,
                          matchesState: matchesState
                        });
                      }
                      const previewUrl = po.sample_video || '';
                      const previewType = String(po.sample_video_type || '').toLowerCase();
                      const inferPreviewType = (url) => {
                        if (!url || typeof url !== 'string') return '';
                        const clean = url.split('?')[0].toLowerCase();
                        const videoExts = ['.mp4', '.mov', '.m4v', '.webm', '.ogg', '.ogv'];
                        const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.avif'];
                        if (videoExts.some((ext) => clean.endsWith(ext))) return 'video';
                        if (imageExts.some((ext) => clean.endsWith(ext))) return 'image';
                        return '';
                      };
                      const resolvedType = previewType || inferPreviewType(previewUrl);
                      const isVideo = resolvedType === 'video';
                      const isImage = resolvedType === 'image';
                      return (
                        <div key={value} className='relative'>
                          <button
                            type='button'
                            onClick={() => handlePresenterPresetChange(value)}
                            className={`relative flex flex-col overflow-hidden rounded-lg border transition-shadow w-full ${isSelected
                              ? 'border-[#13008B] ring-2 ring-[#13008B] shadow-lg'
                              : 'border-gray-200 shadow-sm hover:border-[#13008B] hover:shadow'
                              }`}
                          >
                            {isSelected && (
                              <span className='absolute right-2 top-2 rounded-full bg-[#13008B] px-2.5 py-1 text-xs font-semibold text-white z-20 shadow-lg'>
                                ✓ Selected
                              </span>
                            )}
                            {isSelected && (
                              <div className='absolute inset-0 border-4 border-[#13008B] rounded-lg z-10 pointer-events-none' />
                            )}
                            <div className='flex-1 bg-black/5 aspect-video'>
                              {previewUrl ? (
                                isVideo ? (
                                  <video
                                    className='h-full w-full object-cover'
                                    muted
                                    playsInline
                                    loop
                                  >
                                    <source src={previewUrl} type='video/mp4' />
                                  </video>
                                ) : isImage ? (
                                  <img
                                    src={previewUrl}
                                    alt={`${po.option} preview`}
                                    className='h-full w-full object-cover'
                                  />
                                ) : (
                                  <div className='flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-500'>
                                    Preview available
                                  </div>
                                )
                              ) : (
                                <div className='flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-500'>
                                  No preview available
                                </div>
                              )}
                            </div>
                            <div className='flex items-center px-3 py-2 text-left'>
                              <span className='text-sm font-semibold text-gray-800'>
                                {po.option}
                              </span>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              {presenterPresetsError && (
                <div className='mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600'>
                  {presenterPresetsError}
                </div>
              )}
            </div>
          );
        })()}

        {/* Chart section for Financial/PLOTLY videos - only show when Financial */}
        {((scenes[activeIndex]?.type || '') === 'Financial') && (() => {
          const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
          if (!scene) return null;
          const sceneModelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
          const isPlotly = sceneModelUpper === 'PLOTLY';
          if (!isPlotly) return null;

          const chartType = scene?.chart_type || scene?.chartType || '';
          const chartData = scene?.chart_data || scene?.chartData || null;

          // REPLACE handleChartTypeChange function
          const handleChartTypeChange = (newChartType) => {
            let newChartData = chartData;
            if (newChartType && !chartData) {
              // Initialize default structure based on chart type - FOLLOW EXACT PLOTLY FORMAT
              if (newChartType === 'pie' || newChartType === 'donut') { // ✅ HANDLE BOTH
                // Pie/Donut use "labels" and "values" (NOT "x" and "y")
                newChartData = {
                  series: {
                    labels: ['Category 1', 'Category 2', 'Category 3'],
                    data: [
                      { name: 'Market Share', values: [45, 35, 20] }
                    ]
                  },
                  formatting: {
                    series_info: [
                      { name: 'Category 1', color: '#4F008C' },
                      { name: 'Category 2', color: '#1976D2' },
                      { name: 'Category 3', color: '#FF375E' }
                    ],
                    font_style: 'Inter',
                    font_size: 20
                  }
                };
              } else if (newChartType === 'waterfall_bar' || newChartType === 'waterfall_column') {
                // Waterfall MUST have measure array INSIDE data object
                newChartData = {
                  series: {
                    x: ['Start', 'Change 1', 'Change 2', 'Total'],
                    data: [
                      {
                        name: 'Flow',
                        y: [1000, 300, -150, 1150],
                        measure: ['absolute', 'relative', 'relative', 'total']
                      }
                    ]
                  },
                  formatting: {
                    waterfall_colors: {
                      increasing: '#1976D2',
                      decreasing: '#FF375E',
                      totals: '#4F008C'
                    },
                    font_style: 'Inter',
                    font_size: 20
                  }
                };
              } else if (newChartType === 'stacked_bar' || newChartType === 'stacked_column') {
                // Stacked charts
                newChartData = {
                  series: {
                    x: ['Q1', 'Q2', 'Q3', 'Q4'],
                    data: [
                      { name: 'Product A', y: [100, 120, 140, 160] },
                      { name: 'Product B', y: [80, 90, 100, 110] }
                    ]
                  },
                  formatting: {
                    series_info: [
                      { name: 'Product A', color: '#4F008C' },
                      { name: 'Product B', color: '#1976D2' }
                    ],
                    font_style: 'Inter',
                    font_size: 20
                  }
                };
              } else {
                // Default: clustered_bar, clustered_column, line
                newChartData = {
                  series: {
                    x: ['Q1', 'Q2', 'Q3', 'Q4'],
                    data: [
                      { name: 'Series 1', y: [100, 120, 140, 160] }
                    ]
                  },
                  formatting: {
                    series_info: [
                      { name: 'Series 1', color: '#4F008C' }
                    ],
                    font_style: 'Inter',
                    font_size: 20
                  }
                };
              }
            }
            updateScriptScene(activeIndex, {
              chart_type: newChartType,
              chartType: newChartType,
              chart_data: newChartData,
              chartData: newChartData
            });
          };
          const handleChartDataChange = (newChartData) => {
            // Update chart data in local state
            updateScriptScene(activeIndex, {
              chart_data: newChartData,
              chartData: newChartData
            });
          };

          const handleChartDataSave = async (newChartData) => {
            // Save chart data to scene
            updateScriptScene(activeIndex, {
              chart_data: newChartData,
              chartData: newChartData
            });
            // Optionally call updateTextForSelected to persist to server
            try {
              await updateTextForSelected(activeIndex, {
                genImage: false,
                descriptionOverride: '',
                refImagesOverride: []
              });
              toast.success('Chart data saved');
            } catch (e) {
              console.error('Failed to save chart data:', e);
            }
          };

          return (
            <div className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
              <h4 className='text-lg font-semibold text-gray-800 mb-4'>Chart</h4>
              <div className='space-y-4'>
                <div>
                  <div className='mb-1'>
                    <div className='text-sm font-medium text-gray-700'>Chart Type</div>
                  </div>
                  <select
                    value={chartType || ''}
                    onChange={(e) => handleChartTypeChange(e.target.value)}
                    className='w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent'
                  >
                    <option value=''>Select</option>
                    <option value='clustered_bar'>Clustered Bar</option>
                    <option value='clustered_column'>Clustered Column</option>
                    <option value='line'>Line</option>
                    <option value='pie'>Pie</option>
                    <option value='stacked_bar'>Stacked Bar</option> {/* ✅ ADD THIS LINE */}
                    <option value='stacked_column'>Stacked Column</option>
                    <option value='waterfall_bar'>Waterfall Bar</option>
                    <option value='waterfall_column'>Waterfall Column</option>
                    <option value='donut'>Donut</option>
                  </select>
                </div>
                {chartType && (
                  <div>
                    <div className='mb-2'>
                      <div className='text-sm font-medium text-gray-700'>Chart Data</div>
                      <p className='text-xs text-gray-500'>Manually enter your chart data below</p>
                    </div>
                    <div className='border border-gray-200 rounded-lg bg-white p-4'>
                      <ChartDataEditor
                        chartType={chartType}
                        chartData={chartData}
                        onDataChange={handleChartDataChange}
                        onSave={handleChartDataSave}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })()}

        {/* Background Image selection section - only show when Infographic (matching Chat.js) */}
        {((scenes[activeIndex]?.type || '') === 'Infographic') && (
          <div>
            <div className='bg-gray-50 rounded-lg p-4 border border-gray-200'>
              <div className='flex items-center justify-between mb-4'>
                <h4 className='text-lg font-semibold text-gray-800'>Select a Background Image</h4>
              </div>
              {(() => {
                const scene = script?.[activeIndex];
                const refs = (() => {
                  const urls = [];
                  // First try background_image array
                  if (Array.isArray(scene?.background_image) && scene.background_image.length > 0) {
                    scene.background_image.forEach(item => {
                      let url = '';
                      if (typeof item === 'string' && item.trim()) {
                        url = item.trim();
                      } else if (item && typeof item === 'object') {
                        url = item?.imageurl || item?.imageUrl || item?.image_url || item?.url || item?.src || item?.link || item?.image || '';
                        if (url) url = url.trim();
                      }
                      if (url && typeof url === 'string' && url.length > 0 && !urls.includes(url)) {
                        urls.push(url);
                      }
                    });
                  }
                  // Fallback to ref_image
                  if (urls.length === 0) {
                    const r = scene?.ref_image;
                    if (Array.isArray(r) && r.length > 0) {
                      r.forEach(url => {
                        const trimmed = typeof url === 'string' ? url.trim() : url;
                        if (trimmed && !urls.includes(trimmed)) {
                          urls.push(trimmed);
                        }
                      });
                    } else if (typeof r === 'string' && r.trim()) {
                      const trimmed = r.trim();
                      if (!urls.includes(trimmed)) urls.push(trimmed);
                    }
                  }
                  // Fallback to background field
                  if (urls.length === 0 && typeof scene?.background === 'string' && scene.background.trim()) {
                    const trimmed = scene.background.trim();
                    if (!urls.includes(trimmed)) urls.push(trimmed);
                  }
                  return urls;
                })();
                const selectedRefs = refs;
                return (
                  <div>
                    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-4 mb-4'>
                      {refs.length === 0 ? (
                        <p className='text-sm text-gray-500 col-span-4'>No background images yet. Add one below.</p>
                      ) : (
                        refs.map((url, idx) => (
                          <div key={idx} className={`group relative w-24 h-24 rounded-lg border-2 ${selectedRefs.includes(url) ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-300'} overflow-visible transition-colors cursor-pointer`} title={url} onClick={async (e) => {
                            e.stopPropagation();
                            try {
                              const currentSelected = selectedRefs || [];
                              const exists = currentSelected.includes(url);
                              let newSelected;
                              if (exists) {
                                newSelected = currentSelected.filter(u => u !== url);
                              } else {
                                const next = [...currentSelected, url];
                                newSelected = next.length > 2 ? next.slice(-2) : next;
                              }
                              // Update scene with background images
                              const backgroundImageArray = newSelected.map((u) => ({
                                image_url: u,
                                template_id: ''
                              }));
                              updateScriptScene(activeIndex, {
                                ref_image: newSelected,
                                background_image: backgroundImageArray.length > 0 ? backgroundImageArray : []
                              });
                              await updateTextForSelected(activeIndex, {
                                genImage: false,
                                descriptionOverride: '',
                                refImagesOverride: newSelected
                              });
                            } catch (_) { }
                          }}>
                            <img src={url} alt={`BG ${idx + 1}`} className='w-full h-full object-cover' />
                            <button className='pointer-events-auto absolute inset-0 m-auto w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity' title='View full size' onClick={(e) => { e.stopPropagation(); window.open(url, '_blank'); }}>
                              <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'><path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M15 10l4.553-4.553a2.121 2.121 0 10-3-3L12 7M9 14l-4.553 4.553a2.121 2.121 0 103 3L12 17' /></svg>
                            </button>
                          </div>
                        ))
                      )}
                    </div>
                    <div className='flex items-center gap-2'>
                      <button
                        onClick={openAssetsModal}
                        className='inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50'
                        title='Choose from templates'
                      >
                        <FaPlus className='w-4 h-4' /> Choose From Template
                      </button>
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
                              const curRefs = Array.isArray(script?.[activeIndex]?.ref_image) ? script[activeIndex].ref_image.slice(0, 1) : [];
                              const newRefs = [urls[0], ...curRefs].slice(0, 2);
                              const backgroundImageArray = newRefs.map((u) => ({
                                image_url: u,
                                template_id: ''
                              }));
                              updateScriptScene(activeIndex, {
                                ref_image: newRefs,
                                background_image: backgroundImageArray
                              });
                              await updateTextForSelected(activeIndex, {
                                genImage: false,
                                descriptionOverride: '',
                                refImagesOverride: newRefs
                              });
                            }
                          } finally {
                            setIsUploadingSceneImage(false);
                            if (imageFileInputRef.current) imageFileInputRef.current.value = '';
                          }
                        }}
                      />
                      <button
                        onClick={() => imageFileInputRef.current?.click()}
                        className='inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50'
                        disabled={isUploadingSceneImage}
                      >
                        {isUploadingSceneImage ? 'Uploading...' : 'Upload Image'}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* Advanced Style Options - At the bottom for all video types */}
        <div className="mt-4">
          <button
            type="button"
            onClick={() => setAdvancedOptionsOpen((prev) => !prev)}
            className="flex w-full items-center justify-between rounded-lg border border-[#D8D3FF] bg-white px-4 py-3 text-sm font-semibold text-[#13008B] shadow-sm transition hover:bg-[#F6F4FF]"
          >
            <span>Advanced Style Options</span>
            <ChevronDown className={`h-4 w-4 transition-transform ${advancedOptionsOpen ? 'rotate-180' : ''}`} />
          </button>
          {advancedOptionsOpen && (
            <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 transition-all duration-300">
              <div className="space-y-4 px-4 py-4 transition-all duration-300 w-full">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-700">Style Controls</p>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Colors</label>
                    <div className="flex flex-wrap gap-2">
                      {advancedStyleColors.map((c, i) => (
                        <button
                          key={`${c}-${i}`}
                          type="button"
                          onClick={() => {
                            const next = advancedStyleColors.filter((_, idx) => idx !== i);
                            setAdvancedStyleColors(next);
                            updateScriptScene(activeIndex, { colors: next });
                          }}
                          className="w-7 h-7 rounded border border-gray-300"
                          style={{ background: c }}
                          title={`Remove ${c}`}
                        />
                      ))}
                      {(!advancedStyleColors || advancedStyleColors.length === 0) && (
                        <span className="text-sm text-gray-500">-</span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                      <input
                        type="text"
                        placeholder="#000000"
                        className="flex-1 px-3 py-2 border rounded-lg border-gray-300"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            const val = (e.currentTarget.value || '').trim();
                            if (val) {
                              const next = Array.from(new Set([...advancedStyleColors, val]));
                              setAdvancedStyleColors(next);
                              updateScriptScene(activeIndex, { colors: next });
                              e.currentTarget.value = '';
                            }
                          }
                        }}
                      />
                      <span className="text-xs text-gray-500">Press Enter to add</span>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.max(8, advancedStyleFontSize - 1);
                          setAdvancedStyleFontSize(next);
                          updateScriptScene(activeIndex, { font_size: next });
                        }}
                        className="h-9 w-9 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-lg font-semibold"
                      >
                        −
                      </button>
                      <input
                        type="range"
                        min={8}
                        max={72}
                        step={1}
                        value={advancedStyleFontSize}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          setAdvancedStyleFontSize(next);
                          updateScriptScene(activeIndex, { font_size: next });
                        }}
                        className="flex-1"
                      />
                      <input
                        type="number"
                        min={8}
                        max={150}
                        step={1}
                        value={advancedStyleFontSize}
                        onChange={(e) => {
                          const next = Number(e.target.value);
                          if (Number.isFinite(next)) {
                            setAdvancedStyleFontSize(next);
                            updateScriptScene(activeIndex, { font_size: next });
                          }
                        }}
                        className="w-20 rounded-md border border-gray-300 px-2 py-1 text-sm"
                      />
                      <span className="inline-block text-sm text-gray-700">px</span>
                      <button
                        type="button"
                        onClick={() => {
                          const next = Math.min(150, advancedStyleFontSize + 1);
                          setAdvancedStyleFontSize(next);
                          updateScriptScene(activeIndex, { font_size: next });
                        }}
                        className="h-9 w-9 rounded-full border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 text-lg font-semibold"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Font Style</label>
                    <select
                      value={advancedStyleFontStyle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAdvancedStyleFontStyle(val);
                        updateScriptScene(activeIndex, { font_style: val });
                      }}
                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent border-gray-300"
                    >
                      <option value="">Select font</option>
                      {['Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Source Sans Pro', 'Inter', 'Nunito', 'Raleway', 'Playfair Display', 'Merriweather', 'PT Sans', 'Oswald', 'Rubik', 'Work Sans', 'Fira Sans', 'Cabin', 'Karla', 'Libre Baskerville', 'Josefin Sans'].map((f) => (
                        <option key={f} value={f} style={{ fontFamily: f }}>
                          {f}
                        </option>
                      ))}
                    </select>
                    <input
                      type="text"
                      value={advancedStyleFontStyle}
                      onChange={(e) => {
                        const val = e.target.value;
                        setAdvancedStyleFontStyle(val);
                        updateScriptScene(activeIndex, { font_style: val });
                      }}
                      className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                      placeholder="Enter custom font name"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Font Size</p>
                    <p className="mt-1 text-sm text-gray-800">{advancedStyleFontSize ? `${advancedStyleFontSize}px` : '-'}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Font Style</p>
                    <p className="mt-1 text-sm text-gray-800 break-words">{advancedStyleFontStyle || '-'}</p>
                  </div>
                </div>

                {/* Animation Description - Inside Advanced Style Options for Infographic and Financial scenes */}
                {(() => {
                  const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
                  if (!scene) return null;
                  const sceneModelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                  const isSora = sceneModelUpper === 'SORA';
                  const isPlotly = sceneModelUpper === 'PLOTLY';
                  const sceneType = scenes[activeIndex]?.type || '';
                  if (!(isSora || isPlotly || sceneType === 'Infographic' || sceneType === 'Financial')) return null;

                  const animationDesc = scene?.animation_desc || scene?.animationDesc || {};

                  return (
                    <div className="bg-white rounded-lg border border-gray-200 mt-4">
                      <div className="flex items-center justify-between p-4">
                        <button
                          type="button"
                          onClick={() => setAnimationDescAccordionOpen(!animationDescAccordionOpen)}
                          className="flex-1 flex items-center justify-between text-left hover:bg-gray-50 transition-colors -ml-4 -mr-4 px-4"
                        >
                          <span className="text-sm font-semibold text-gray-800">Animation description</span>
                          <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${animationDescAccordionOpen ? 'rotate-180' : ''}`} />
                        </button>
                        <button
                          type="button"
                          onClick={() => enhanceField('animation_desc')}
                          disabled={enhancingFields['animation_desc']}
                          className='flex items-center gap-1 px-2 py-1 rounded-md bg-purple-100 text-purple-700 hover:bg-purple-200 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium transition-colors ml-2'
                          title='Enhance with AI'
                        >
                          {enhancingFields['animation_desc'] ? (
                            <>
                              <div className="w-3 h-3 border-2 border-purple-700 border-t-transparent rounded-full animate-spin" />
                              <span>AI...</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className='w-3 h-3' />
                              <span>AI</span>
                            </>
                          )}
                        </button>
                      </div>
                      {animationDescAccordionOpen && (
                        <div className="px-4 pb-4">
                          {(() => {
                            const normalizeAnimationDescData = (data) => {
                              if (!data) return {};
                              if (typeof data === 'string') {
                                try {
                                  const parsed = JSON.parse(data);
                                  if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
                                } catch (_) {
                                  return {};
                                }
                              }
                              if (Array.isArray(data)) {
                                const collected = {};
                                data.forEach((item) => {
                                  if (item && typeof item === 'object') {
                                    Object.entries(item).forEach(([k, v]) => {
                                      if (collected[k] === undefined) collected[k] = v;
                                    });
                                  }
                                });
                                return collected;
                              }
                              return typeof data === 'object' ? data : {};
                            };
                            const currentData = normalizeAnimationDescData(animationDesc);
                            const formatTitle = (key) => {
                              const cleaned = key.replace(/_/g, ' ').trim();
                              if (!cleaned) return '';
                              return cleaned
                                .split(' ')
                                .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                                .join(' ');
                            };
                            const priorityOrder = ['lighting', 'style_mood', 'transition_type', 'scene_description', 'subject_description', 'action_specification', 'content_modification', 'camera_specifications', 'geometric_preservation'];

                            // Ensure all priority fields exist
                            const allFields = priorityOrder;
                            const finalData = { ...currentData };
                            allFields.forEach(field => {
                              if (!(field in finalData)) {
                                finalData[field] = '';
                              }
                            });

                            return allFields.length > 0 ? (
                              <>
                                <div className="grid grid-cols-1 gap-4">
                                  {allFields.map((key) => {
                                    const title = formatTitle(key);
                                    const currentValue = finalData[key] || '';
                                    return (
                                      <div
                                        key={key}
                                        className="border border-gray-200 rounded-lg bg-white p-4 space-y-2 shadow-sm"
                                      >
                                        <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                          {title}
                                        </h5>
                                        <textarea
                                          value={currentValue}
                                          onChange={(e) => {
                                            const newData = { ...editedAnimationDesc };
                                            newData[key] = e.target.value;
                                            setEditedAnimationDesc(newData);
                                            // Update local script state immediately
                                            updateScriptScene(activeIndex, { animation_desc: newData });
                                          }}
                                          onBlur={async (e) => {
                                            // Auto-save to backend on blur
                                            try {
                                              const latestData = { ...editedAnimationDesc };
                                              latestData[key] = e.target.value;
                                              setEditedAnimationDesc(latestData);
                                              await saveFrameData('animation_desc', latestData);
                                            } catch (err) {
                                              console.error('Failed to auto-save animation description:', err);
                                            }
                                          }}
                                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm text-gray-600 resize-none"
                                          rows={3}
                                          disabled={isSavingFrameData}
                                          placeholder={`Enter ${title.toLowerCase()}...`}
                                        />
                                      </div>
                                    );
                                  })}
                                </div>
                              </>
                            ) : (
                              <div className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-500">
                                No animation description data available
                              </div>
                            );
                          })()}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
            </div>
          )}
        </div>

      </div>

      <div className='flex justify-end gap-3 mt-8'>
        <button
          type="button"
          onClick={onBack}
          disabled={isGenerating}
          className='px-5 py-2 rounded-lg border disabled:opacity-50 disabled:cursor-not-allowed'
        >
          Back
        </button>
      </div>
      {/* Validation Error Modal */}
      {showValidationModal && (
        <div className='fixed inset-0 z-[90] flex items-center justify-center bg-black/50 backdrop-blur-sm'>
          <div className='bg-white w-[90%] max-w-md rounded-lg shadow-xl p-6'>
            <div className='flex items-center justify-between mb-4'>
              <h3 className='text-lg font-semibold text-gray-900'>Validation Required</h3>
              <button
                onClick={() => {
                  setShowValidationModal(false);
                  setValidationErrors([]);
                }}
                className='text-gray-400 hover:text-gray-600 transition-colors'
              >
                <svg className='w-5 h-5' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                  <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M6 18L18 6M6 6l12 12' />
                </svg>
              </button>
            </div>
            <div className='mb-4'>
              <p className='text-sm text-gray-700 mb-3'>Please complete all required fields:</p>
              <div className='bg-red-50 border border-red-200 rounded-lg p-4 max-h-64 overflow-y-auto'>
                <ul className='space-y-2'>
                  {validationErrors.map((error, index) => (
                    <li key={index} className='text-sm text-red-700 flex items-start gap-2'>
                      <span className='text-red-500 mt-0.5'>•</span>
                      <span>{error}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
            <div className='flex justify-end'>
              <button
                onClick={() => {
                  setShowValidationModal(false);
                  setValidationErrors([]);
                }}
                className='px-4 py-2 rounded-lg bg-[#13008B] text-white text-sm font-medium hover:bg-blue-800 transition-colors'
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Presenter Preset Save Confirmation Modal */}
      {showPresenterSaveConfirm && (
        <div className='fixed inset-0 z-[80] flex items-center justify-center bg-black/50'>
          <div className='w-[92%] max-w-md rounded-lg bg-white p-5 shadow-xl'>
            <h3 className='text-lg font-semibold text-[#13008B]'>Save Presenter Option?</h3>
            <div className='mt-3 space-y-1 text-sm text-gray-700'>
              <p>
                Selected preset:{' '}
                <span className='font-medium text-gray-900'>
                  {pendingPresenterPresetLabel || 'Unknown'}
                </span>
              </p>
              <p>This will update the presenter preset for the current scene.</p>
            </div>
            <div className='mt-5 flex justify-end gap-3'>
              <button
                onClick={() => {
                  if (isSavingPresenterPreset) return;
                  setShowPresenterSaveConfirm(false);
                  setPendingPresenterPresetId('');
                  setPendingPresenterPresetLabel('');
                }}
                className='rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70'
                disabled={isSavingPresenterPreset}
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmPresenterPresetSave}
                className='rounded-lg bg-[#13008B] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-[#9aa0d0]'
                disabled={isSavingPresenterPreset}
              >
                {isSavingPresenterPreset ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isSavingPresenterPreset && !showPresenterSaveConfirm && (
        <div className='fixed inset-0 z-[80] flex items-center justify-center bg-black/40'>
          <div className='flex items-center gap-3 rounded-lg bg-white px-6 py-4 shadow-xl'>
            <div className='h-6 w-6 animate-spin rounded-full border-4 border-[#13008B] border-t-transparent' />
            <span className='text-sm font-medium text-gray-800'>Saving presenter option…</span>
          </div>
        </div>
      )}

      {/* Brand Assets Modal (scoped to StepTwo) */}
      {showAssetsModal && (
        <div className='fixed inset-0 z-[70] flex items-center justify-center bg-black/50'>
          <div className='bg-white w-[96%] max-w-5xl max-h-[85vh] overflow-hidden rounded-lg shadow-xl flex flex-col'>
            <div className='flex items-center justify-between p-4 border-b border-gray-200'>
              <h3 className='text-lg font-semibold text-[#13008B]'>Choose an asset</h3>
              <button onClick={() => setShowAssetsModal(false)} className='px-3 py-1.5 rounded-lg border text-sm'>Close</button>
            </div>
            <div className='px-4 pt-3 border-b border-gray-100'>
              <div className='flex items-center gap-3 flex-wrap'>
                {[
                  { key: 'templates', label: 'Templates' },
                  { key: 'uploaded_images', label: 'Uploaded Images' },
                  { key: 'documents_images', label: 'Documents' },
                  { key: 'logos', label: 'Logos' },
                  { key: 'icons', label: 'Icons' },
                  { key: 'generated_images', label: 'Generated Images' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setAssetsTab(tab.key)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${assetsTab === tab.key ? 'bg-[#13008B] text-white border-[#13008B]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >{tab.label}</button>
                ))}
                <div className='ml-auto'>
                  <button
                    onClick={() => {
                      const uploadTypeMap = {
                        templates: 'template',
                        uploaded_images: 'uploaded_images',
                        documents_images: 'document_image',
                        logos: 'logo',
                        icons: 'icon'
                      };
                      const nextType = uploadTypeMap[assetsTab] || '';
                      setPendingUploadType(nextType);
                      if (nextType && assetsUploadInputRef.current) {
                        assetsUploadInputRef.current.click();
                      }
                    }}
                    className='px-3 py-1.5 rounded-lg border text-sm bg-white hover:bg-gray-50'
                  >
                    Upload
                  </button>
                  <input
                    ref={assetsUploadInputRef}
                    type='file'
                    accept='image/*'
                    className='hidden'
                    multiple
                    onChange={async (e) => {
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
                        setIsAssetsLoading(true);
                        const getResp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`);
                        const getText = await getResp.text();
                        let data; try { data = JSON.parse(getText); } catch (_) { data = {}; }
                        const normalized = normalizeBrandAssetsResponse(data);
                        setAssetsData(normalized);
                      } catch (err) {
                        console.error('Upload failed:', err);
                        alert('Failed to upload file.');
                      } finally {
                        setIsAssetsLoading(false);
                        if (assetsUploadInputRef.current) assetsUploadInputRef.current.value = '';
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            <div className='p-4 overflow-y-auto'>
              {(isAssetsLoading || (assetsTab === 'generated_images' && isLoadingGeneratedImages)) ? (
                <div className='flex items-center justify-center py-16'>
                  <div className='flex flex-col items-center gap-3'>
                    <div className='w-10 h-10 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin' />
                    <span className='text-sm text-gray-600'>
                      {assetsTab === 'generated_images' && isLoadingGeneratedImages ? 'Loading generated images...' : 'Loading assets...'}
                    </span>
                  </div>
                </div>
              ) : (
                (() => {
                  if (assetsTab === 'generated_images') {
                    const generated = generatedImagesData.generated_images || {};
                    const buildGroups = (entries) => {
                      const groups = [];
                      entries.forEach(([aspectRatio, sessions]) => {
                        if (!sessions || typeof sessions !== 'object') return;
                        const aspectLabel = normalizeTemplateAspectLabel(aspectRatio) || 'Unspecified';
                        Object.entries(sessions).forEach(([sessionName, mediaArray]) => {
                          const urlsArray = Array.isArray(mediaArray) ? mediaArray : [];
                          const imagesForSession = [];
                          urlsArray.forEach((img, idx) => {
                            let imageUrl = '';
                            if (typeof img === 'string') {
                              imageUrl = img;
                            } else if (img && typeof img === 'object') {
                              imageUrl = img.image_url || img.url || img.src || '';
                            }
                            if (imageUrl && imageUrl.trim()) {
                              const trimmed = imageUrl.trim();
                              const id = `generated-${aspectLabel}-${sessionName}-${idx}`;
                              imagesForSession.push({
                                id,
                                url: trimmed,
                                label: `Generated Image ${idx + 1}`
                              });
                            }
                          });
                          if (imagesForSession.length > 0) {
                            groups.push({
                              sessionName,
                              aspectLabel,
                              images: imagesForSession
                            });
                          }
                        });
                      });
                      return groups;
                    };
                    const allEntries = Object.entries(generated);
                    const groups = buildGroups(allEntries);
                    if (groups.length === 0) {
                      return (
                        <div className='text-sm text-gray-600'>
                          No generated images found.
                        </div>
                      );
                    }
                    return (
                      <>
                        {groups.map((group) => (
                          <div key={`${group.aspectLabel}-${group.sessionName}`} className='mb-6'>
                            <div className='flex items-center justify-between mb-3'>
                              <div className='text-sm font-semibold text-gray-800 truncate'>
                                Session: {group.sessionName}
                              </div>
                              <div className='flex items-center gap-2'>
                                <span className='inline-flex items-center px-2 py-0.5 rounded-full border border-gray-300 text-xs text-gray-700 bg-gray-50'>
                                  {group.aspectLabel}
                                </span>
                                <span className='text-xs text-gray-500'>
                                  {group.images.length} image{group.images.length !== 1 ? 's' : ''}
                                </span>
                              </div>
                            </div>
                            <div className='flex gap-4 overflow-x-auto pb-2'>
                              {group.images.map((img, idx) => {
                                const imageUrl = img.url;
                                const isSelected = selectedTemplateUrls.includes(imageUrl);
                                const handleClick = () => {
                                  setSelectedTemplateUrls(prev => {
                                    const exists = prev.includes(imageUrl);
                                    if (exists) {
                                      return prev.filter(u => u !== imageUrl);
                                    }
                                    const next = [...prev, imageUrl];
                                    if (next.length > 3) {
                                      next.shift();
                                    }
                                    return next;
                                  });
                                };
                                return (
                                  <div
                                    key={img.id || idx}
                                    className={`flex-shrink-0 w-40 rounded-lg border overflow-hidden bg-white cursor-pointer group ${isSelected ? 'ring-2 ring-[#13008B]' : ''}`}
                                    onClick={handleClick}
                                    title={img.label}
                                  >
                                    <img src={imageUrl} alt={img.label} className='w-full h-24 object-cover' />
                                    <div className='px-2 py-1'>
                                      <div className='text-[11px] text-gray-700 truncate'>
                                        {img.label}
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </>
                    );
                  }
                  let urls = [];
                  if (assetsTab === 'templates') {
                    const templatesInput = assetsData.templates || {};
                    const combined = [
                      ...extractAssetsByType(templatesInput, 'preset_templates'),
                      ...extractAssetsByType(templatesInput, 'uploaded_templates')
                    ];
                    urls = combined.map(item => item.imageUrl).filter(Boolean);
                  } else {
                    const list = Array.isArray(assetsData[assetsTab]) ? assetsData[assetsTab] : [];
                    urls = list.map(item => {
                      if (typeof item === 'string') return item;
                      return item?.image_url || item?.url || item?.link || '';
                    }).filter(Boolean);
                  }
                  return (
                    <div className='grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3'>
                      {urls.map((url, idx) => {
                        const selected = selectedTemplateUrls.includes(url);
                        return (
                          <button
                            key={idx}
                            onClick={() => {
                              setSelectedTemplateUrls(prev => {
                                const exists = prev.includes(url);
                                if (exists) {
                                  return prev.filter(u => u !== url);
                                }
                                const next = [...prev, url];
                                if (next.length > 3) {
                                  next.shift();
                                }
                                return next;
                              });
                            }}
                            className={`relative block w-full pt-[100%] rounded-lg overflow-hidden border ${selected ? 'border-blue-600 ring-2 ring-blue-300' : 'border-gray-200 hover:border-gray-300'}`}
                            title={url}
                          >
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
              <button onClick={() => setShowAssetsModal(false)} className='px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-800 hover:bg-gray-200'>Cancel</button>
              <button
                onClick={async () => {
                  try {
                    if (selectedTemplateUrls.length === 0) return;
                    const imagesToUse = selectedTemplateUrls.slice(0, 3);
                    updateScriptScene(activeIndex, { ref_image: imagesToUse });
                    await updateTextForSelected(activeIndex, { genImage: false, descriptionOverride: '', refImagesOverride: imagesToUse });
                    setSelectedAssetUrl('');
                    setSelectedTemplateUrls([]);
                    setShowAssetsModal(false);
                  } catch (e) { console.error(e); try { toast.error(e?.message || 'Failed to keep default'); } catch (_) { alert('Failed to keep default'); } }
                }}
                disabled={selectedTemplateUrls.length === 0}
                className={`px-4 py-2 rounded-lg text-sm ${selectedTemplateUrls.length === 0 ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-800 hover:bg-gray-200'}`}
              >
                Keep Default
              </button>
              <button
                onClick={async () => {
                  try {
                    if (selectedTemplateUrls.length === 0) return;
                    setIsEnhancing(true);
                    const { user, sessionForBody } = await getSessionSnapshot();
                    const scene = Array.isArray(script) && script[activeIndex] ? script[activeIndex] : null;
                    const sceneNumber = scene?.scene_number ?? (activeIndex + 1);
                    const imagesToUse = selectedTemplateUrls.slice(0, 3);
                    updateScriptScene(activeIndex, { ref_image: imagesToUse });
                    await updateTextForSelected(activeIndex, { genImage: true, descriptionOverride: scene?.desc || scene?.description || '', refImagesOverride: imagesToUse });
                    setSelectedAssetUrl('');
                    setSelectedTemplateUrls([]);
                    setShowAssetsModal(false);
                  } catch (e) { console.error(e); try { toast.error(e?.message || 'Failed to generate'); } catch (_) { alert('Failed to generate'); } }
                  finally { setIsEnhancing(false); }
                }}
                disabled={selectedTemplateUrls.length === 0}
                className={`px-4 py-2 rounded-lg text-sm text-white ${selectedTemplateUrls.length === 0 ? 'bg-[#9aa0d0] cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Upload Avatar Popup (matching Chat.js) */}
      {showAvatarUploadPopup && (
        <div className='fixed inset-0 z-[80] flex items-center justify-center bg-black/50'>
          <div className='bg-white w-[90%] max-w-2xl rounded-lg shadow-xl flex flex-col max-h-[90vh]'>
            <div className='flex items-center justify-between p-4 border-b border-gray-200'>
              <h3 className='text-lg font-semibold text-[#13008B]'>Upload Avatar</h3>
              <button
                onClick={() => {
                  setShowAvatarUploadPopup(false);
                  setAvatarUploadFiles([]);
                  setAvatarName('');
                }}
                className='px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50'
              >
                Close
              </button>
            </div>

            <div className='p-6 overflow-y-auto flex-1'>
              <div className='mb-6'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Avatar Name <span className='text-red-500'>*</span>
                </label>
                <input
                  type='text'
                  value={avatarName}
                  onChange={(e) => setAvatarName(e.target.value)}
                  placeholder='Enter avatar name'
                  className='w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13008B] focus:border-transparent'
                />
              </div>

              <div className='mb-6'>
                <label className='block text-sm font-medium text-gray-700 mb-2'>
                  Select Avatar File
                </label>
                <input
                  ref={avatarUploadFileInputRef}
                  type='file'
                  accept='image/*'
                  className='hidden'
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    if (files.length > 0) {
                      setAvatarUploadFiles([files[0]]);
                    }
                    if (avatarUploadFileInputRef.current) {
                      avatarUploadFileInputRef.current.value = '';
                    }
                  }}
                />
                <button
                  type='button'
                  onClick={() => avatarUploadFileInputRef.current?.click()}
                  className='w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#13008B] hover:bg-gray-50 transition-colors'
                >
                  <div className='text-center'>
                    <FaPlus className='w-8 h-8 text-gray-400 mx-auto mb-2' />
                    <p className='text-sm text-gray-600'>Click to select avatar file</p>
                    <p className='text-xs text-gray-500 mt-1'>Supported: JPG, PNG, WEBP</p>
                  </div>
                </button>
              </div>

              {avatarUploadFiles.length > 0 && (
                <div className='mb-6'>
                  <label className='block text-sm font-medium text-gray-700 mb-2'>
                    Selected File
                  </label>
                  <div className='space-y-2'>
                    {avatarUploadFiles.map((file, index) => (
                      <div key={index} className='flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200'>
                        <div className='flex items-center gap-3 flex-1 min-w-0'>
                          <div className='w-10 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0'>
                            <svg className='w-6 h-6 text-gray-400' fill='none' stroke='currentColor' viewBox='0 0 24 24'>
                              <path strokeLinecap='round' strokeLinejoin='round' strokeWidth={2} d='M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z' />
                            </svg>
                          </div>
                          <div className='flex-1 min-w-0'>
                            <p className='text-sm font-medium text-gray-900 truncate'>{file.name}</p>
                            <p className='text-xs text-gray-500'>{(file.size / 1024).toFixed(2)} KB</p>
                          </div>
                        </div>
                        <button
                          type='button'
                          onClick={() => {
                            setAvatarUploadFiles([]);
                          }}
                          className='ml-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0'
                          title='Remove file'
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className='flex justify-end gap-3 pt-4 border-t border-gray-200'>
                <button
                  type='button'
                  onClick={() => {
                    setShowAvatarUploadPopup(false);
                    setAvatarUploadFiles([]);
                    setAvatarName('');
                  }}
                  className='px-4 py-2 rounded-lg border text-sm hover:bg-gray-50'
                  disabled={isUploadingAvatarFiles}
                >
                  Cancel
                </button>
                <button
                  type='button'
                  onClick={async () => {
                    try {
                      if (!avatarName || !avatarName.trim()) {
                        alert('Please enter an avatar name');
                        return;
                      }

                      if (avatarUploadFiles.length === 0) {
                        alert('Please select a file to upload');
                        return;
                      }

                      const token = localStorage.getItem('token');
                      if (!token) {
                        alert('Missing user ID');
                        return;
                      }

                      setIsUploadingAvatarFiles(true);

                      const form = new FormData();
                      form.append('user_id', token);
                      form.append('name', avatarName.trim());
                      form.append('file', avatarUploadFiles[0]);

                      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/upload-avatar', {
                        method: 'POST',
                        body: form
                      });

                      const text = await resp.text();
                      if (!resp.ok) {
                        throw new Error(`Upload failed: ${resp.status} ${text}`);
                      }

                      const getResp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/avatars/${encodeURIComponent(token)}`);
                      const getText = await getResp.text();
                      let data;
                      try { data = JSON.parse(getText); } catch (_) { data = getText; }

                      if (getResp.ok && data && typeof data === 'object') {
                        const avatarsObject = data?.avatars || {};
                        const avatarObjects = [];
                        Object.values(avatarsObject).forEach((profileAvatars) => {
                          if (Array.isArray(profileAvatars)) {
                            profileAvatars.forEach((avatar) => {
                              if (avatar && typeof avatar === 'object' && avatar.url) {
                                avatarObjects.push({
                                  name: avatar.name || '',
                                  url: String(avatar.url).trim()
                                });
                              }
                            });
                          }
                        });
                        setBrandAssetsAvatars(avatarObjects);
                      }

                      setShowAvatarUploadPopup(false);
                      setAvatarUploadFiles([]);
                      setAvatarName('');
                      alert('Avatar uploaded successfully!');
                    } catch (err) {
                      alert(err?.message || 'Failed to upload avatar');
                    } finally {
                      setIsUploadingAvatarFiles(false);
                    }
                  }}
                  disabled={isUploadingAvatarFiles}
                  className={`px-4 py-2 rounded-lg text-sm text-white ${isUploadingAvatarFiles ? 'bg-gray-400 cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}
                >
                  {isUploadingAvatarFiles ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white w-[92%] max-w-md rounded-lg shadow-xl p-5">
            <h3 className="text-lg font-semibold text-[#13008B]">Delete This Scene?</h3>
            <p className="mt-2 text-sm text-gray-700">
              Are you sure you want to delete Scene {Math.min(activeIndex + 1, Array.isArray(script) ? script.length : (activeIndex + 1))}? This action cannot be undone.
            </p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => { if (!isDeletingScene) setShowDeleteConfirm(false); }}
                disabled={isDeletingScene}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${isDeletingScene ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  if (isDeletingScene) return;
                  await handleDeleteScene();
                  setShowDeleteConfirm(false);
                }}
                disabled={isDeletingScene}
                className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium text-white ${isDeletingScene ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
              >
                {isDeletingScene && (<span className="w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />)}
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Loader for saving scenes */}
      {isSavingScenes && (
        <Loader
          fullScreen
          zIndex="z-40"
          overlayBg="bg-black/30"
          title="Saving Scenes…"
          description="Please wait while we save your scenes..."
          progress={savingScenesProgress}
        />
      )}

      {/* Loader for adding new scene */}
      {isAdding && (
        <Loader
          fullScreen
          zIndex="z-40"
          overlayBg="bg-black/30"
          title="Creating Scene…"
          description="Please wait while we create your new scene..."
          progress={addingSceneProgress}
        />
      )}
    </div>
  );
};

const BuildReelWizard = () => {
  // Restore step from localStorage on mount
  const [step, setStep] = useState(() => {
    try {
      const stored = localStorage.getItem('buildreel_current_step');
      const storedStep = stored ? parseInt(stored, 10) : 1;

      // Only restore to step 2+ if we have a valid session
      if (storedStep > 1) {
        const sessionId = localStorage.getItem('session_id');
        const token = localStorage.getItem('token');
        // If no session ID or token, reset to step 1
        if (!sessionId || !token) {
          console.log('[BuildReel] Step initialization - No session found, starting at step 1');
          try {
            localStorage.setItem('buildreel_current_step', '1');
          } catch (_) {
            // Ignore
          }
          return 1;
        }
      }

      return storedStep;
    } catch (_) {
      return 1;
    }
  });
  const [form, setForm] = useState({ prompt: '', industry: '', scenes: [], userquery: null });
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCreatingScenes, setIsCreatingScenes] = useState(false);
  const [isSavingStoryboard, setIsSavingStoryboard] = useState(false);
  const [isGeneratingImagesQueue, setIsGeneratingImagesQueue] = useState(false);

  // Progress bars for loaders
  const creatingScriptProgress = useProgressLoader(isCreatingScenes, 95, 60000);
  const savingStoryboardProgress = useProgressLoader(isSavingStoryboard, 95, 30000);
  const generatingImagesQueueProgress = useProgressLoader(isGeneratingImagesQueue, 95, 20000);
  const [showShortGenPopup, setShowShortGenPopup] = useState(false);
  // Sub-flow: images and videos views similar to Home
  const [subView, setSubView] = useState(() => {
    try {
      const stored = localStorage.getItem('buildreel_subview');
      return stored || 'editor';
    } catch (_) {
      return 'editor';
    }
  });
  const [hasImages, setHasImages] = useState(false);
  const [imagesJobId, setImagesJobId] = useState('');
  const [videosJobId, setVideosJobId] = useState('');
  const [hasVideosAvailable, setHasVideosAvailable] = useState(false);
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [showImagesPopup, setShowImagesPopup] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);

  const handleChange = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSaveScenes = (scenes) => {
    setForm((f) => ({ ...f, scenes }));
  };

  // Persist step changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('buildreel_current_step', String(step));
    } catch (_) {
      // Ignore localStorage errors
    }
  }, [step]);

  // Persist subView changes to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('buildreel_subview', subView);
    } catch (_) {
      // Ignore localStorage errors
    }
  }, [subView]);

  // Removed auto-set subView to 'images' functionality to prevent infinite loop
  // The subView is now controlled by Sidebar navigation and user actions only

  // Track if we've already restored session to prevent multiple restores
  const hasRestoredSessionRef = useRef(false);

  // Restore session data and scenes when step > 1 on mount
  useEffect(() => {
    const restoreSession = async () => {
      // Only restore if we're on step 2 or 3 and haven't restored yet
      if (step === 1 || isRestoringSession || hasRestoredSessionRef.current) return;

      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');

      // If no session ID or token, reset to step 1
      if (!sessionId || !token) {
        console.log('[BuildReel] No session ID or token found, resetting to step 1');
        setStep(1);
        try {
          localStorage.setItem('buildreel_current_step', '1');
        } catch (_) {
          // Ignore
        }
        return;
      }

      try {
        setIsRestoringSession(true);

        // Load session data
        const sessResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: token, session_id: sessionId })
        });
        const sessText = await sessResp.text();
        let sessionData;
        try {
          sessionData = JSON.parse(sessText);
        } catch (_) {
          sessionData = sessText;
        }

        if (!sessResp.ok) {
          console.error('Failed to load session data:', sessText);
          // If session data fetch fails, reset to step 1
          console.log('[BuildReel] Session data fetch failed, resetting to step 1');
          setStep(1);
          try {
            localStorage.setItem('buildreel_current_step', '1');
          } catch (_) {
            // Ignore
          }
          return;
        }

        const sd = sessionData?.session_data || sessionData?.session || {};

        // Check if session has images
        const sessionImages = Array.isArray(sd?.images) ? sd.images : [];
        setHasImages(sessionImages.length > 0);

        // Extract scripts/airesponse from session data
        // scripts[0] is the latest/current version
        const scripts = Array.isArray(sd?.scripts) ? sd.scripts : [];
        let currentScript = scripts[0] || null;
        let airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];

        // If scripts[0] doesn't have airesponse, try to find the latest script with airesponse
        if (airesponse.length === 0 && scripts.length > 0) {
          for (let i = 0; i < scripts.length; i++) {
            const script = scripts[i];
            if (Array.isArray(script?.airesponse) && script.airesponse.length > 0) {
              currentScript = script;
              airesponse = script.airesponse;
              console.log(`[BuildReel] Found airesponse in scripts[${i}]`);
              break;
            }
          }
        }

        // If no scenes found in session, reset to step 1
        if (airesponse.length === 0) {
          console.log('[BuildReel] No scenes found in session, resetting to step 1');
          setStep(1);
          try {
            localStorage.setItem('buildreel_current_step', '1');
          } catch (_) {
            // Ignore
          }
          return;
        }

        // Check if scene description fields are populated
        const hasSceneDescriptionFields = airesponse.length > 0 && airesponse.some(scene => {
          return scene?.subject || scene?.background || scene?.action || scene?.styleCard ||
            scene?.cameraCard || scene?.ambiance || scene?.composition || scene?.focus_and_lens;
        });

        // Debug logging to check what we're getting
        console.log('[BuildReel] Session restore - scripts array:', scripts.length);
        console.log('[BuildReel] Session restore - currentScript:', currentScript);
        console.log('[BuildReel] Session restore - airesponse length:', airesponse.length);
        console.log('[BuildReel] Session restore - hasSceneDescriptionFields:', hasSceneDescriptionFields);
        if (airesponse.length > 0) {
          console.log('[BuildReel] Session restore - first scene from airesponse:', {
            scene_number: airesponse[0]?.scene_number,
            scene_title: airesponse[0]?.scene_title,
            subject: airesponse[0]?.subject,
            background: airesponse[0]?.background,
            action: airesponse[0]?.action,
            styleCard: airesponse[0]?.styleCard,
            cameraCard: airesponse[0]?.cameraCard,
            ambiance: airesponse[0]?.ambiance,
            composition: airesponse[0]?.composition,
            focus_and_lens: airesponse[0]?.focus_and_lens
          });
        }

        // Restore userquery from session or localStorage
        let uq = [];
        try {
          const raw = localStorage.getItem('buildreel_userquery');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (parsed && Array.isArray(parsed.userquery)) uq = parsed.userquery;
          }
        } catch (_) {
          // Ignore
        }

        // If we have scenes in the session, restore them
        if (airesponse.length > 0) {
          // Map airesponse directly to preserve all fields including scene description
          setForm((f) => {
            const restoredScript = airesponse.map((r, i) => {
              const sn = Number(r?.scene_number) || (i + 1);
              const m = String(r?.model || '').toUpperCase();
              const type = (m === 'VEO3' || m.includes('VEO')) ? 'Avatar Based' :
                (m === 'PLOTLY') ? 'Financial' :
                  (m.includes('SORA')) ? 'Infographic' :
                    (r?.type || 'Infographic');
              const mappedScenes = mapResponseToScenes(airesponse);

              // Extract presenter preset from presenter_options (same as Chat.js)
              const presenterOpts = r?.presenter_options || r?.presenterOptions || {};
              const presetId = presenterOpts?.preset_id || presenterOpts?.presetId || presenterOpts?.preset || presenterOpts?.anchor_id || presenterOpts?.anchorId || '';

              const sceneObj = {
                scene_number: sn,
                scene_title: r?.scene_title ?? '',
                model: (String(type).toLowerCase() === 'avatar based') ? 'VEO3' :
                  (String(type).toLowerCase() === 'financial') ? 'PLOTLY' : 'SORA',
                timeline: computeTimelineForIndex(mappedScenes, i),
                narration: r?.narration ?? '',
                desc: r?.desc ?? r?.description ?? '',
                text_to_be_included: Array.isArray(r?.text_to_be_included) ? r.text_to_be_included.slice() : [],
                ref_image: Array.isArray(r?.ref_image) ? r.ref_image : [],
                folderLink: r?.folderLink ?? '',
                // Restore scene description fields directly from airesponse - preserve all fields exactly as they are (same as Chat.js)
                subject: r?.subject ?? '',
                background: r?.background ?? '',
                action: r?.action ?? '',
                styleCard: r?.styleCard ?? '',
                cameraCard: r?.cameraCard ?? '',
                ambiance: r?.ambiance ?? '',
                composition: r?.composition ?? '',
                focus_and_lens: r?.focus_and_lens ?? '',
                avatar: r?.avatar ?? (Array.isArray(r?.avatar_urls) && r.avatar_urls.length > 0 ? r.avatar_urls[0] : null),
                avatar_urls: Array.isArray(r?.avatar_urls) ? r.avatar_urls : [],
                presenter_options: presenterOpts,
                veo3_prompt_template: r?.veo3_prompt_template ?? '',
                background_image: Array.isArray(r?.background_image) ? r.background_image : [],
                opening_frame: r?.opening_frame ?? null,
                closing_frame: r?.closing_frame ?? null,
                background_frame: r?.background_frame ?? null,
                chart_type: r?.chart_type ?? '',
                chart_data: r?.chart_data ?? null,
                // Advanced Style Options
                colors: Array.isArray(r?.colors) ? r.colors : [],
                font_size: r?.font_size ?? r?.fontsize ?? r?.fontSize ?? 16,
                font_style: r?.font_style ?? r?.fontStyle ?? '',
                // Animation Description
                animation_desc: r?.animation_desc ?? r?.animationDesc ?? null
              };

              // Debug log for first scene (matching Chat.js approach)
              if (i === 0) {
                console.log('[BuildReel] Restored first scene from user-session-data:', {
                  scene_number: sceneObj.scene_number,
                  scene_title: sceneObj.scene_title,
                  narration: sceneObj.narration,
                  subject: sceneObj.subject,
                  background: sceneObj.background,
                  action: sceneObj.action,
                  styleCard: sceneObj.styleCard,
                  cameraCard: sceneObj.cameraCard,
                  ambiance: sceneObj.ambiance,
                  composition: sceneObj.composition,
                  focus_and_lens: sceneObj.focus_and_lens,
                  avatar: sceneObj.avatar,
                  avatar_urls: sceneObj.avatar_urls,
                  presenter_options: sceneObj.presenter_options,
                  preset_id: presetId,
                  model: sceneObj.model
                });
              }
              // Debug log for second scene if it exists
              if (i === 1) {
                console.log('[BuildReel] Restored second scene from user-session-data:', {
                  scene_number: sceneObj.scene_number,
                  scene_title: sceneObj.scene_title,
                  narration: sceneObj.narration,
                  subject: sceneObj.subject,
                  background: sceneObj.background,
                  action: sceneObj.action,
                  styleCard: sceneObj.styleCard,
                  cameraCard: sceneObj.cameraCard,
                  ambiance: sceneObj.ambiance,
                  composition: sceneObj.composition,
                  focus_and_lens: sceneObj.focus_and_lens,
                  avatar: sceneObj.avatar,
                  avatar_urls: sceneObj.avatar_urls,
                  presenter_options: sceneObj.presenter_options,
                  preset_id: presetId,
                  model: sceneObj.model
                });
              }

              return sceneObj;
            });

            console.log('[BuildReel] Total scenes restored:', restoredScript.length);

            // Restore presenter preset for the first scene if it's Avatar Based
            const firstScene = restoredScript[0];
            if (firstScene && (firstScene.model === 'VEO3' || firstScene.model === 'ANCHOR')) {
              const presenterOpts = firstScene.presenter_options || {};
              const presetId = presenterOpts?.preset_id || presenterOpts?.presetId || presenterOpts?.preset || presenterOpts?.anchor_id || presenterOpts?.anchorId || '';
              if (presetId) {
                // This will be set in StepTwo's useEffect when it loads presets
                console.log('[BuildReel] Found presenter preset in session:', presetId);
              }
            }

            return {
              ...f,
              script: restoredScript,
              userquery: uq.length > 0 ? { userquery: uq } : f.userquery
            };
          });
        }

        // Restore job IDs if available
        try {
          const storedImagesJobId = localStorage.getItem('current_images_job_id');
          if (storedImagesJobId) setImagesJobId(storedImagesJobId);

          const storedVideosJobId = localStorage.getItem('current_video_job_id');
          if (storedVideosJobId) setVideosJobId(storedVideosJobId);

          const vids = Array.isArray(sd?.videos) ? sd.videos : [];
          setHasVideosAvailable(vids.length > 0);
        } catch (_) {
          // Ignore
        }

        // Call video-type/update API after restoring session
        try {
          const updateVideoTypeBody = {
            user_id: token,
            session_id: sessionId,
            videoType: 'custom'
          };
          console.log('[BuildReel] Calling video-type/update API after session restore');
          const videoTypeResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/video-type/update', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updateVideoTypeBody)
          });
          const videoTypeText = await videoTypeResp.text();
          let videoTypeData;
          try {
            videoTypeData = JSON.parse(videoTypeText);
          } catch (_) {
            videoTypeData = videoTypeText;
          }
          if (!videoTypeResp.ok) {
            console.warn('[BuildReel] video-type/update API call failed:', videoTypeText);
          } else {
            console.log('[BuildReel] video-type/update API response:', videoTypeData);
          }
        } catch (videoTypeError) {
          console.error('[BuildReel] video-type/update API error:', videoTypeError);
          // Continue anyway, don't block the flow
        }
      } catch (error) {
        console.error('Failed to restore session:', error);
      } finally {
        setIsRestoringSession(false);
        hasRestoredSessionRef.current = true;
      }
    };

    restoreSession();
  }, []); // Only run on mount

  const handleGenerate = async (script) => {
    try {
      console.log('[BuildReel] handleGenerateStoryboard called, setting isGenerating to true');
      setIsGenerating(true);

      // Small delay to ensure state update is processed
      await new Promise(resolve => setTimeout(resolve, 0));

      // Validate all scenes have narration (description is required for Infographic/Financial)
      const scriptArray = Array.isArray(script) ? script : [];
      console.log('[BuildReel] Validating script with', scriptArray.length, 'scenes');
      console.log('[BuildReel] Script structure sample:', scriptArray[0] ? {
        scene_number: scriptArray[0].scene_number,
        scene_title: scriptArray[0].scene_title,
        narration: scriptArray[0].narration,
        desc: scriptArray[0].desc,
        description: scriptArray[0].description,
        model: scriptArray[0].model,
        hasNarration: !!scriptArray[0].narration,
        hasDesc: !!(scriptArray[0].desc || scriptArray[0].description)
      } : 'No scenes');

      const validationErrors = [];

      scriptArray.forEach((s, index) => {
        const sceneNum = s?.scene_number || (index + 1);
        const sceneTitle = s?.scene_title || `Scene ${sceneNum}`;
        const narration = String(s?.narration || '').trim();
        const description = String(s?.desc || s?.description || '').trim();
        const sceneModelUpper = String(s?.model || s?.mode || '').toUpperCase();
        const isInfographic = sceneModelUpper === 'SORA';
        const isFinancial = sceneModelUpper === 'PLOTLY';

        // Narration is always required
        if (!narration) {
          validationErrors.push(`${sceneTitle} (Scene ${sceneNum}): Narration is required`);
        }

        // Description is required for Infographic and Financial scenes
        if ((isInfographic || isFinancial) && !description) {
          validationErrors.push(`${sceneTitle} (Scene ${sceneNum}): Description is required for Infographic/Financial scenes`);
        }
      });

      if (validationErrors.length > 0) {
        console.log('[BuildReel] Validation failed:', validationErrors);
        const errorMessage = validationErrors.length === 1
          ? validationErrors[0]
          : `Please fill narration for all scenes. Issues found:\n${validationErrors.join('\n')}`;
        try {
          toast.error(errorMessage);
        } catch (_) {
          alert(errorMessage);
        }
        setIsGenerating(false);
        return;
      }

      console.log('[BuildReel] Validation passed - all scenes have narration');
      setForm((f) => ({ ...f, script }));

      // Step 1: Save scenes with create-from-scratch
      setIsSavingStoryboard(true);
      try {
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
        if (Array.isArray(uq) && uq.length > 0) {
          uq = uq.map((item) => {
            if (item && typeof item === 'object' && item.additonalprop1 && typeof item.additonalprop1 === 'object') {
              return item.additonalprop1;
            }
            return item;
          });
        }

        // Fetch full user object from session user_data for storyboard save
        let userForBody = {};
        try {
          const tokenForUser = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';
          if (sessionId && tokenForUser) {
            const sessResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ user_id: tokenForUser, session_id: sessionId })
            });
            const sessText = await sessResp.text();
            let sessJson; try { sessJson = JSON.parse(sessText); } catch (_) { sessJson = {}; }
            if (sessResp.ok) {
              const sdForUser = sessJson?.session_data || sessJson?.session || {};
              userForBody = sessJson?.user_data || sdForUser?.user_data || sdForUser?.user || {};
            }
          }
        } catch (_) { /* noop */ }

        // Filter scenes to only include allowed fields (same as saveScenesToServer)
        const airesponse = Array.isArray(script) ? script.map((scene, index) => filterSceneForAPI(scene, index)) : [];
        const body = {
          user: userForBody,
          session_id: sessionId,
          current_script: { userquery: uq, airesponse },
          action: 'save'
        };
        console.log('[BuildReel] create-from-scratch(save) request:', body);
        const saveResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/create-from-scratch', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
        });
        const saveText = await saveResp.text();
        let saveData; try { saveData = JSON.parse(saveText); } catch (_) { saveData = saveText; }
        if (!saveResp.ok) throw new Error(`create-from-scratch(save) failed: ${saveResp.status} ${saveText}`);
        console.log('[BuildReel] create-from-scratch(save) response:', saveData);
      } finally {
        setIsSavingStoryboard(false);
      }

      // Step 2: Call generate-images-queue
      setIsGeneratingImagesQueue(true);
      let jobId = null;
      try {
        const sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) ? localStorage.getItem('session_id') : '';
        const token = localStorage.getItem('token');
        if (!token) throw new Error('Missing login token');
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

        // Get job ID
        jobId = imgData?.job_id || imgData?.jobId || imgData?.id || (Array.isArray(imgData) && imgData[0]?.job_id);
        if (!jobId) {
          throw new Error('No job ID received from generate-images-queue');
        }

        try { localStorage.setItem('current_images_job_id', jobId); } catch (_) { /* noop */ }
        try { localStorage.setItem('images_generate_pending', 'true'); localStorage.setItem('images_generate_started_at', String(Date.now())); } catch (_) { }
        setImagesJobId(jobId);
      } finally {
        setIsGeneratingImagesQueue(false);
      }

      // Step 3: Navigate to images subview immediately (ImageList will handle job polling)
      await sendUserSessionData();
      setSubView('images');

      // ImageList component will automatically poll job-status API using the jobId from localStorage
      setIsGenerating(false);

    } catch (e) {
      console.error('Generate Storyboard failed:', e);
      try { toast.error(e?.message || 'Failed to generate storyboard'); } catch (_) { alert(e?.message || 'Failed to generate storyboard'); }
      setIsSavingStoryboard(false);
      setIsGeneratingImagesQueue(false);
      setIsGenerating(false);
    }
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
        try { localStorage.setItem('current_video_job_id', jobId); } catch (_) { }
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
      const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';

      if (!sessionId || !token) {
        throw new Error('Missing session_id or token');
      }

      // Step 1: Fetch user_data from user-session-data API
      const sessionReqBody = { user_id: token, session_id: sessionId };
      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionReqBody)
      });
      if (!sessionResp.ok) {
        const text = await sessionResp.text();
        throw new Error(`user-session-data failed: ${sessionResp.status} ${text}`);
      }
      const sessionDataResponse = await sessionResp.json();
      const sd = sessionDataResponse?.session_data || {};

      // Extract user_data from response (use as-is, don't change anything)
      const rawUser = sessionDataResponse?.user_data || sd?.user_data || sd?.user || {};
      const userPayload = normalizeUserSnapshot(rawUser, token);

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

      let transformedUQ = [];
      if (Array.isArray(uq) && uq.length > 0) {
        const first = uq[0];
        if (first && typeof first === 'object') {
          const inner = first.additonalprop1 && typeof first.additonalprop1 === 'object'
            ? first.additonalprop1
            : first;
          transformedUQ = [inner];
        }
      }

      // Step 2: Call create-from-scratch API first (this creates the title automatically in Swagger)
      const body = {
        user: userPayload,
        session_id: sessionId || '',
        current_script: {
          userquery: transformedUQ,
          airesponse: []
        },
        action: 'add',
        model_type: 'SORA'
      };
      const endpoint = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/create-from-scratch';
      console.log('[BuildReel] Step 2: Calling create-from-scratch API');
      console.log('[BuildReel] create-from-scratch request body:', JSON.stringify(body, null, 2));
      const resp = await fetch(endpoint, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`create-from-scratch failed: ${resp.status} ${text}`);
      console.log('[BuildReel] Step 2: create-from-scratch successful');

      // Step 3: Call video-type/update API after create-from-scratch
      try {
        const updateVideoTypeBody = {
          user_id: token,
          session_id: sessionId,
          videoType: 'custom'
        };
        console.log('[BuildReel] Step 3: Calling video-type/update API');
        const videoTypeResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/video-type/update', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(updateVideoTypeBody)
        });
        const videoTypeText = await videoTypeResp.text();
        let videoTypeData;
        try {
          videoTypeData = JSON.parse(videoTypeText);
        } catch (_) {
          videoTypeData = videoTypeText;
        }
        if (!videoTypeResp.ok) {
          console.warn('[BuildReel] video-type/update API call failed:', videoTypeText);
        } else {
          console.log('[BuildReel] video-type/update API response:', videoTypeData);
        }
      } catch (videoTypeError) {
        console.error('[BuildReel] video-type/update API error:', videoTypeError);
        // Continue anyway, don't block the flow
      }

      // Step 4: Call title API after video-type update to refresh sidebar
      try {
        const titleBody = {
          session_id: sessionId,
          user_id: token
        };
        console.log('[BuildReel] Step 4: Calling title API to refresh sidebar');
        const titleResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/title', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(titleBody)
        });
        const titleText = await titleResp.text();
        let titleData;
        try {
          titleData = JSON.parse(titleText);
        } catch (_) {
          titleData = titleText;
        }
        if (!titleResp.ok) {
          console.warn('[BuildReel] Title API call failed:', titleText);
          // Continue anyway, don't block the flow
        } else {
          console.log('[BuildReel] Title API response:', titleData);
          // Dispatch event to refresh sidebar sessions list (same as Generate Reel)
          if (titleData && (titleData.title || titleData.updated)) {
            try {
              window.dispatchEvent(new CustomEvent('session-title-updated', {
                detail: { sessionId, title: titleData.title }
              }));
            } catch (_) { /* noop */ }
          }
        }
      } catch (titleError) {
        console.error('[BuildReel] Title API error:', titleError);
        // Continue anyway, don't block the flow
      }

      // Extract scenes array from response; support both old airesponse and new script format
      const aiArr = data?.session_patch?.append_message?.airesponse
        ?? data?.assistant_message?.airesponse
        ?? data?.airesponse
        ?? data?.script
        ?? [];
      const mapped = mapResponseToScenes(aiArr);

      // Use the response from create-from-scratch directly (no session API call)
      setForm((f) => ({
        ...f, script: aiArr.map((r, i) => {
          const sn = Number(r?.scene_number) || (i + 1);
          const m = String(r?.model || '').toUpperCase();
          const type = (m === 'VEO3' || m.includes('VEO')) ? 'Avatar Based' :
            (m === 'PLOTLY') ? 'Financial' :
              (m.includes('SORA')) ? 'Infographic' :
                (r?.type || 'Infographic');

          // Extract presenter preset from presenter_options (same as Chat.js)
          const presenterOpts = r?.presenter_options || r?.presenterOptions || {};
          const presetId = presenterOpts?.preset_id || presenterOpts?.presetId || presenterOpts?.preset || presenterOpts?.anchor_id || presenterOpts?.anchorId || '';

          // Preserve ALL fields from airesponse, including scene description fields
          return {
            scene_number: sn,
            scene_title: r?.scene_title ?? '',
            model: (String(type).toLowerCase() === 'avatar based') ? 'VEO3' :
              (String(type).toLowerCase() === 'financial') ? 'PLOTLY' : 'SORA',
            timeline: computeTimelineForIndex(mapped, i),
            narration: r?.narration ?? '',
            desc: r?.desc ?? r?.description ?? '',
            text_to_be_included: Array.isArray(r?.text_to_be_included) ? r.text_to_be_included.slice() : [],
            ref_image: Array.isArray(r?.ref_image) ? r.ref_image : [],
            folderLink: r?.folderLink ?? '',
            // Preserve scene description fields directly from airesponse
            subject: r?.subject ?? '',
            background: r?.background ?? '',
            action: r?.action ?? '',
            styleCard: r?.styleCard ?? '',
            cameraCard: r?.cameraCard ?? '',
            ambiance: r?.ambiance ?? '',
            composition: r?.composition ?? '',
            focus_and_lens: r?.focus_and_lens ?? '',
            avatar: r?.avatar ?? (Array.isArray(r?.avatar_urls) && r.avatar_urls.length > 0 ? r.avatar_urls[0] : null),
            avatar_urls: Array.isArray(r?.avatar_urls) ? r.avatar_urls : [],
            presenter_options: presenterOpts,
            background_image: Array.isArray(r?.background_image) ? r.background_image : [],
            chart_type: r?.chart_type ?? '',
            chart_data: r?.chart_data ?? null
          };
        })
      }));

      setStep(2);
      // Persist step change
      try {
        localStorage.setItem('buildreel_current_step', '2');
      } catch (_) {
        // Ignore
      }
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
          onNext={async () => {
            setStep(2);
            try {
              localStorage.setItem('buildreel_current_step', '2');
            } catch (_) {
              // Ignore
            }
            // Call video-type/update API when navigating to step 2
            try {
              const sessionId = localStorage.getItem('session_id');
              const token = localStorage.getItem('token');
              if (sessionId && token) {
                const updateVideoTypeBody = {
                  user_id: token,
                  session_id: sessionId,
                  videoType: 'custom'
                };
                console.log('[BuildReel] Calling video-type/update API on step 2 navigation');
                const videoTypeResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/video-type/update', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify(updateVideoTypeBody)
                });
                const videoTypeText = await videoTypeResp.text();
                let videoTypeData;
                try {
                  videoTypeData = JSON.parse(videoTypeText);
                } catch (_) {
                  videoTypeData = videoTypeText;
                }
                if (!videoTypeResp.ok) {
                  console.warn('[BuildReel] video-type/update API call failed:', videoTypeText);
                } else {
                  console.log('[BuildReel] video-type/update API response:', videoTypeData);
                }
              }
            } catch (videoTypeError) {
              console.error('[BuildReel] video-type/update API error:', videoTypeError);
              // Continue anyway, don't block the flow
            }
          }}
          onCreateScenes={createFromScratch}
        />
      ) : (
        <>
          {subView === 'editor' && (
            <StepTwo
              values={form}
              onBack={() => {
                setStep(1);
                try {
                  localStorage.setItem('buildreel_current_step', '1');
                } catch (_) {
                  // Ignore
                }
              }}
              onSave={handleSaveScenes}
              onGenerate={handleGenerate}
              isGenerating={isGenerating}
              hasImages={hasImages}
              onGoToStoryboard={() => setSubView('images')}
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
      {/* Loader for creating script when transitioning from step 1 to step 2 */}
      {isCreatingScenes && (
        <Loader
          fullScreen
          zIndex="z-40"
          overlayBg="bg-black/30"
          title="Creating Script…"
          description="Please wait while we create your script..."
          progress={creatingScriptProgress}
        />
      )}

      {/* Loader for saving storyboard */}
      {isSavingStoryboard && (
        <Loader
          fullScreen
          zIndex="z-40"
          overlayBg="bg-black/30"
          title="Saving Storyboard…"
          description="Please wait while we save your storyboard..."
          progress={savingStoryboardProgress}
        />
      )}

      {/* Loader for generating images queue */}
      {isGeneratingImagesQueue && (
        <Loader
          fullScreen
          zIndex="z-40"
          overlayBg="bg-black/30"
          title="Generating Images Queue…"
          description="Please wait while we queue your image generation..."
          progress={generatingImagesQueueProgress}
        />
      )}

    </>
  );
};

export default BuildReelWizard;
