import React, { useMemo, useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { FaPlus, FaAngleRight, FaEyeDropper, FaAngleUp, FaAngleDown, FaCheck, FaMicrophone, FaDesktop, FaMobileAlt, FaChartPie, FaUserTie, FaCoins } from 'react-icons/fa';
import { ChevronLeft, ChevronRight, Image, MoreHorizontal, Paperclip, RefreshCcw, Trash2, X, Edit, MoreVertical, ChevronUp } from 'lucide-react';
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
import loadingGif from '../../asset/loadingv2.gif';

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

// Helper to check if aspect ratio matches (same as Chat.js)
const matchesAspectValue = (value, target) => {
  if (!target) return true;
  const normalizedTarget = normalizeTemplateAspectLabel(target);
  const normalizedValue = normalizeTemplateAspectLabel(
    typeof value === 'string' ? value : ''
  );
  if (!normalizedTarget || normalizedTarget === 'Unspecified') return true;
  // If the source aspect is missing, allow it (so uploaded assets without aspect still show)
  if (!normalizedValue || normalizedValue === 'Unspecified') return true;
  return normalizedValue === normalizedTarget;
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
const computeWordCount = (text) => {
  if (typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
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

const getSampleChartData = (type) => {
  const t = String(type || '').toLowerCase();

  if (t === 'pie' || t === 'donut') {
    return {
      series: {
        labels: ['Category A', 'Category B', 'Category C'],
        data: [{ values: [30, 50, 20] }]
      }
    };
  }

  if (t === 'waterfall' || t === 'waterfall_bar' || t === 'waterfall_column') {
    return {
      series: {
        x: ['Start', 'Income', 'Expense', 'Tax', 'Net Profit'],
        data: [{
          name: 'Cash Flow',
          y: [100, 50, -30, -20, 100],
          measure: ['absolute', 'relative', 'relative', 'relative', 'total']
        }]
      }
    };
  }

  if (t === 'funnel') {
    return {
      series: {
        x: ['Stage 1', 'Stage 2', 'Stage 3', 'Stage 4'],
        data: [{
          name: 'Conversion',
          y: [1000, 800, 400, 100]
        }]
      }
    };
  }

  if (t === 'gauge') {
    return {
      series: {
        x: ['Score'],
        data: [{
          name: 'Performance',
          y: [75]
        }]
      }
    };
  }

  if (t === 'scatter') {
    return {
      series: {
        x: ['1', '2', '3', '4', '5'],
        data: [{ name: 'Points', y: [10, 15, 13, 17, 20] }]
      }
    };
  }

  if (t === 'radar') {
    return {
      series: {
        x: ['Metric A', 'Metric B', 'Metric C', 'Metric D', 'Metric E'],
        data: [{
          name: 'Series 1',
          y: [80, 90, 70, 85, 60]
        }]
      }
    };
  }

  // Default (Bar, Line, Area, etc.)
  return {
    series: {
      x: ['Q1', 'Q2', 'Q3', 'Q4'],
      data: [
        { name: 'Series 1', y: [100, 150, 120, 180] },
        { name: 'Series 2', y: [80, 120, 100, 140] }
      ]
    }
  };
};

const Accordion = ({ title, children, defaultOpen = false }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  return (
    <div className="border border-gray-200 rounded-lg mb-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 transition-colors rounded-t-lg font-medium text-gray-700"
      >
        {title}
        {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
      </button>
      {isOpen && <div className="p-4 bg-white border-t border-gray-200 rounded-b-lg space-y-3">{children}</div>}
    </div>
  );
};

const SceneScriptModal = ({
  isOpen, onClose, scriptContent, onSave, videoDuration, sessionData, user, onRefreshSession,
  imagesJobId, setImagesJobId,
  hasVideosAvailable, setSubView,
  sendUserSessionData, handleGenerateVideosFromImages,
  setShowStoryboardModal, isGeneratingStoryboard, setIsGeneratingStoryboard
}) => {
  const [localScript, setLocalScript] = useState({});
  const colorInputRef = useRef(null);
  const [currentColor, setCurrentColor] = useState('#000000');

  const presetColors = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#E5E5E5', '#F2F2F2', '#FFFFFF',
    '#FF0000', '#FF7F00', '#FFFF00', '#7FFF00', '#00FF00', '#00FF7F', '#00FFFF', '#007FFF',
    '#0000FF', '#7F00FF', '#FF00FF', '#FF007F', '#FFC0CB', '#FFA500', '#FFD700', '#DA70D6',
    '#F08080', '#DC143C', '#8B0000', '#A52A2A', '#800000', '#B8860B', '#8B4513', '#D2691E',
    '#006400', '#228B22', '#2E8B57', '#3CB371', '#20B2AA', '#008B8B', '#4682B4', '#1E90FF',
    '#4169E1', '#00008B', '#4B0082', '#483D8B', '#6A5ACD', '#8A2BE2', '#9400D3', '#C71585',
    '#708090', '#778899', '#B0C4DE', '#ADD8E6', '#87CEEB', '#87CEFA', '#B0E0E6', '#AFEEEE'
  ];

  const normalizeColor = (color) => {
    if (!color) return null;
    if (typeof color === 'object' && color !== null) {
      const colorValue = color.color || color.value || color.hex || color.code || color;
      if (typeof colorValue === 'string') color = colorValue;
      else return null;
    }
    if (typeof color !== 'string') return null;
    const trimmed = color.trim().toLowerCase();
    if (/^#[0-9a-f]{6}$/i.test(trimmed)) return trimmed;
    if (/^#[0-9a-f]{3}$/i.test(trimmed)) return '#' + trimmed.slice(1).split('').map(c => c + c).join('');
    if (/^[0-9a-f]{6}$/i.test(trimmed)) return '#' + trimmed;
    if (/^[0-9a-f]{3}$/i.test(trimmed)) return '#' + trimmed.split('').map(c => c + c).join('');
    return trimmed;
  };

  const isColorSelected = (color) => {
    const selectedColors = localScript.colors || [];
    if (!color || selectedColors.length === 0) return false;
    const normalized = normalizeColor(color) || color;
    return selectedColors.some(sc => {
      const normalizedSc = normalizeColor(sc) || sc;
      return normalizedSc === normalized || sc === color;
    });
  };

  const toggleColor = (color) => {
    const selectedColors = localScript.colors || [];
    let newColors;
    if (isColorSelected(color)) {
      const normalized = normalizeColor(color) || color;
      newColors = selectedColors.filter(sc => {
        const normalizedSc = normalizeColor(sc) || sc;
        return normalizedSc !== normalized && sc !== color;
      });
    } else {
      newColors = [...selectedColors, color];
    }
    updateField('colors', newColors);
    autoSaveScript({ ...localScript, colors: newColors });
  };

  const handlePickCustomColor = (e) => {
    const color = e.target.value;
    if (color && !isColorSelected(color)) {
      toggleColor(color);
    }
  };

  const addCurrentColor = () => {
    if (currentColor && !isColorSelected(currentColor)) {
      toggleColor(currentColor);
    }
  };

  const openColorPicker = () => {
    colorInputRef.current?.click();
  };
  // const [showStoryboardModal, setShowStoryboardModal] = useState(false);
  // const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [assetsData, setAssetsData] = useState({ templates: [], logos: [], icons: [], uploaded_images: [], documents_images: [] });
  const [generatedImagesData, setGeneratedImagesData] = useState({ generated_images: {}, generated_videos: {} });
  const [assetsTab, setAssetsTab] = useState('preset_templates');
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [showChartEditor, setShowChartEditor] = useState(false);
  const [changeCount, setChangeCount] = useState(0);
  const [newTextLine, setNewTextLine] = useState('');

  const autoSaveScript = async (currentScript) => {
    try {
      let freshSession = sessionData;
      let freshUser = user;

      // 1. Fetch latest session data BEFORE
      if (onRefreshSession) {
        const freshData = await onRefreshSession();
        if (freshData) {
          freshSession = freshData.sessionData;
          freshUser = freshData.user;
        }
      }

      if (!freshSession || !freshUser) {
        console.warn('Auto-save skipped: Missing sessionData or user');
        return;
      }

      console.log('Auto-saving script...', currentScript);

      // 2. Construct current_script
      // Fetch the latest script from session data
      // If 'script' (singular) is present, use it (latest object without version)
      let latestScript = {};
      if (freshSession.script) {
        try {
          latestScript = typeof freshSession.script === 'string'
            ? JSON.parse(freshSession.script)
            : freshSession.script;

          // Ensure it's an object and not an array
          if (Array.isArray(latestScript)) latestScript = {};
          else if (typeof latestScript !== 'object') latestScript = {};
        } catch (_) {
          latestScript = {};
        }
      }

      // Fallback to scripts array if script(singular) was invalid or empty
      if ((!latestScript || Object.keys(latestScript).length === 0) && freshSession.scripts && freshSession.scripts.length > 0) {
        latestScript = freshSession.scripts[0];
      }

      let aiResponse = latestScript.airesponse || latestScript.aiResponse || [];
      // Ensure aiResponse is an array
      if (!Array.isArray(aiResponse)) aiResponse = [];

      // Update the specific scene in aiResponse with current localScript values
      const updatedAiResponse = aiResponse.map(scene => {
        if (String(scene.scene_number) === String(currentScript.scene_number)) {
          return { ...scene, ...currentScript };
        }
        return scene;
      });

      let userQuery = latestScript.userquery || latestScript.userQuery || [];
      if (!Array.isArray(userQuery)) {
        if (userQuery && typeof userQuery === 'object') userQuery = [userQuery];
        else userQuery = [];
      }

      // If userQuery is empty, try to fetch from session root if it exists there
      if (userQuery.length === 0) {
        let rootQuery = freshSession.userQuery || freshSession.userquery || freshSession.user_query;
        if (rootQuery) {
          if (Array.isArray(rootQuery)) userQuery = rootQuery;
          else userQuery = [rootQuery];
        }
      }

      // If still empty, use fallback structure or current script aspect ratio
      if (userQuery.length === 0) {
        // Default structure based on user request
        const rawAspect = currentScript.aspect_ratio || '16:9';
        const formattedAspect = rawAspect.replace(':', '_');

        userQuery = [{
          guidelines: {
            technical_and_formal_constraints: {
              aspect_ratio: formattedAspect
            }
          }
        }];
      }

      const body = {
        user: freshUser,
        session_id: freshSession.session_id || (typeof window !== 'undefined' ? localStorage.getItem('session_id') : ''),
        current_script: {
          userquery: userQuery,
          airesponse: updatedAiResponse
        },
        action: 'save',
        model_type: currentScript.model || 'SORA'
      };

      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/create-from-scratch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        console.error('Auto-save failed:', await response.text());
      } else {
        console.log('Auto-save successful');
        // 3. Fetch session data AFTER
        if (onRefreshSession) await onRefreshSession();
      }

    } catch (error) {
      console.error('Error during auto-save:', error);
    }
  };


  // Initialize local script
  useEffect(() => {
    if (isOpen && scriptContent) {
      setLocalScript(typeof scriptContent === 'string' ? {} : JSON.parse(JSON.stringify(scriptContent)));
    }
  }, [isOpen, scriptContent]);

  // Load assets when assets modal opens
  useEffect(() => {
    if (showAssetsModal) {
      const loadAssets = async () => {
        setIsLoadingAssets(true);
        try {
          const token = localStorage.getItem('token');
          if (token) {
            // Fetch Brand Assets
            const assetsPromise = fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`)
              .then(async (r) => {
                if (r.ok) return normalizeBrandAssetsResponse(await r.json());
                const local = localStorage.getItem('brand_assets');
                return local ? normalizeBrandAssetsResponse(JSON.parse(local)) : {};
              })
              .catch(() => {
                const local = localStorage.getItem('brand_assets');
                return local ? normalizeBrandAssetsResponse(JSON.parse(local)) : {};
              });

            // Fetch Generated Media
            const generatedPromise = fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/user/${encodeURIComponent(token)}/generated-media`)
              .then(async (r) => {
                if (r.ok) return normalizeGeneratedMediaResponse(await r.json());
                return { generated_images: {}, generated_videos: {} };
              })
              .catch(() => ({ generated_images: {}, generated_videos: {} }));

            const [assets, generated] = await Promise.all([assetsPromise, generatedPromise]);
            setAssetsData(assets);
            setGeneratedImagesData(generated);
          }
        } catch (e) {
          console.error("Failed to load assets", e);
        } finally {
          setIsLoadingAssets(false);
        }
      };
      loadAssets();
    }
  }, [showAssetsModal]);

  if (!isOpen) return null;

  const handleSave = () => {
    if (onSave) onSave(localScript);
    onClose();
  };

  const handleGenerateStoryboard = async () => {
    try {
      // 1. Auto Save
      await autoSaveScript(localScript);

      // 2. Prepare payload
      const token = localStorage.getItem('token');
      const sessionId = sessionData?.session_id || localStorage.getItem('session_id');
      const userId = user?.id || user?.user_id || token;

      if (!userId || !sessionId) {
        console.error('Missing user_id or session_id');
        toast.error('Missing user or session info');
        return;
      }

      const sceneNumber = localScript.scene_number;
      if (sceneNumber === undefined || sceneNumber === null) {
        toast.error('Missing scene number');
        return;
      }

      const payload = {
        user_id: userId,
        session_id: sessionId,
        scene_numbers: [sceneNumber]
      };

      setIsGeneratingStoryboard(true);

      // 3. Call API
      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/generate-images-queue', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      if (!response.ok) {
        const errText = await response.text();
        console.error('Generate images queue failed', errText);
        toast.error('Failed to start image generation');
        setIsGeneratingStoryboard(false);
        return;
      }

      const data = await response.json();
      const jobId = data.job_id || data.jobId;

      if (!jobId) {
        console.error('No job_id in response', data);
        toast.error('No job ID received');
        setIsGeneratingStoryboard(false);
        return;
      }

      // Set job ID and open modal to let ImageList handle polling
      setImagesJobId(jobId);
      try {
        localStorage.setItem('current_images_job_id', jobId);
        localStorage.setItem('images_generate_pending', 'true');
      } catch (_) {
        // Ignore localStorage errors
      }
      setIsGeneratingStoryboard(false);
      setShowStoryboardModal(true);

    } catch (error) {
      console.error('Error generating storyboard:', error);
      toast.error('Error generating storyboard');
      setIsGeneratingStoryboard(false);
    }
  };

  const updateField = (key, value) => {
    setLocalScript(prev => {
      const updated = { ...prev, [key]: value };

      const newCount = changeCount + 1;
      setChangeCount(newCount);

      if (newCount >= 4) {
        autoSaveScript(updated);
        setChangeCount(0);
      }

      return updated;
    });
  };

  const updateNestedField = (parentKey, childKey, value) => {
    setLocalScript(prev => {
      const parent = prev[parentKey] && typeof prev[parentKey] === 'object' ? { ...prev[parentKey] } : {};
      parent[childKey] = value;
      const updated = { ...prev, [parentKey]: parent };

      const newCount = changeCount + 1;
      setChangeCount(newCount);

      if (newCount >= 4) {
        autoSaveScript(updated);
        setChangeCount(0);
      }

      return updated;
    });
  };

  const animationDescFields = [
    { key: 'lighting', label: 'Lighting' },
    { key: 'style_mood', label: 'Style & Mood' },
    { key: 'transition_type', label: 'Transition Type' },
    { key: 'scene_description', label: 'Scene Description' },
    { key: 'subject_description', label: 'Subject Description' },
    { key: 'action_specification', label: 'Action Specification' },
    { key: 'content_modification', label: 'Content Modification' },
    { key: 'camera_specifications', label: 'Camera Specifications' },
    { key: 'geometric_preservation', label: 'Geometric Preservation' }
  ];

  const backgroundFrameFields = [
    { key: 'style', label: 'Style' },
    { key: 'action', label: 'Action' },
    { key: 'setting', label: 'Setting' },
    { key: 'subject', label: 'Subject' },
    { key: 'composition', label: 'Composition' },
    { key: 'final_prompt', label: 'Final Prompt' },
    { key: 'factual_details', label: 'Factual Details' },
    { key: 'camera_lens_shadow_lighting', label: 'Camera, Lens, Shadow & Lighting' }
  ];

  const renderNestedFields = (parentKey, fields) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {fields.map(({ key, label }) => (
        <div key={key}>
          <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
          <textarea
            value={localScript[parentKey]?.[key] || ''}
            onChange={(e) => updateNestedField(parentKey, key, e.target.value)}
            rows={2}
            className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
          />
        </div>
      ))}
    </div>
  );

  const model = String(localScript.model || '').toUpperCase();
  const isVeo = model === 'VEO3' || model.includes('VEO') || model === 'AVATAR';
  const isSora = model === 'SORA' || model.includes('SORA') || model === 'INFOGRAPHIC';
  const isPlotly = model === 'PLOTLY' || model === 'FINANCIAL' || model.includes('FINANCIAL');

  // Filter by aspect ratio if possible
  const scriptAspect = localScript.aspect_ratio || '16:9';
  const normalizedTargetAspect = normalizeTemplateAspectLabel(scriptAspect);

  let currentAssets = [];
  let generatedGroups = [];

  if (assetsTab === 'generated_images') {
    const generatedImages = generatedImagesData.generated_images || {};
    // Iterate to build groups
    Object.entries(generatedImages).forEach(([aspectRatio, sessions]) => {
      if (!sessions || typeof sessions !== 'object') return;
      const aspectLabel = normalizeTemplateAspectLabel(aspectRatio) || 'Unspecified';

      // Filter by aspect
      if (normalizedTargetAspect && normalizedTargetAspect !== 'Unspecified') {
        if (!matchesAspectValue(aspectLabel, normalizedTargetAspect)) return;
      }

      Object.entries(sessions).forEach(([sessionName, mediaArray]) => {
        const urlsArray = Array.isArray(mediaArray) ? mediaArray : [];
        const validImages = [];

        urlsArray.forEach((img, idx) => {
          let imageUrl = '';
          if (typeof img === 'string') imageUrl = img;
          else if (img && typeof img === 'object') imageUrl = img.image_url || img.url || '';

          if (imageUrl && imageUrl.trim()) {
            validImages.push({
              id: `gen-${aspectLabel}-${sessionName}-${idx}`,
              imageUrl: imageUrl.trim(),
              label: `Generated Image ${idx + 1}`,
              aspect: aspectLabel
            });
          }
        });

        if (validImages.length > 0) {
          generatedGroups.push({
            sessionName,
            aspect: aspectLabel,
            images: validImages
          });
        }
      });
    });
  } else {
    // Brand Assets
    const extracted = extractAssetsByType(assetsData?.templates || {}, assetsTab === 'uploaded_images' ? 'uploaded_images' : assetsTab);

    // Add flat lists for certain tabs
    if (assetsTab === 'uploaded_images') {
      (assetsData.uploaded_images || []).forEach((img, i) => {
        const url = typeof img === 'string' ? img : (img?.image_url || '');
        if (url) extracted.push({ id: `upl-${i}`, imageUrl: url, label: 'Uploaded', aspect: 'Unspecified' });
      });
    }

    if (assetsTab === 'documents_images') {
      (assetsData.documents_images || []).forEach((img, i) => {
        const url = typeof img === 'string' ? img : (img?.image_url || '');
        if (url) extracted.push({ id: `doc-${i}`, imageUrl: url, label: 'Document', aspect: 'Unspecified' });
      });
    }

    // Filter
    currentAssets = extracted.filter(asset => {
      if (!normalizedTargetAspect || normalizedTargetAspect === 'Unspecified') return true;
      return matchesAspectValue(asset.aspect, normalizedTargetAspect);
    });

    // Fallback if empty and we have a target aspect
    if (currentAssets.length === 0 && normalizedTargetAspect && assetsTab.includes('templates')) {
      currentAssets = extracted;
    }
  }

  const handleAssetSelect = (asset) => {
    if (asset.imageUrl) {
      if (isPlotly) {
        updateNestedField('background_frame', 'final_prompt', asset.imageUrl);
      } else {
        // For VEO3 and SORA
        updateField('ref_image', [asset.imageUrl]);
      }
      setShowAssetsModal(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
      <div className="bg-white w-full max-w-4xl rounded-xl shadow-2xl flex flex-col max-h-[90vh] m-auto">
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <div>
            <h3 className="text-lg font-bold text-gray-900">Script Editor</h3>
            <div className="flex gap-4 mt-1 text-xs text-gray-500 font-medium">
              <span className="bg-gray-100 px-2 py-0.5 rounded">Scene {localScript.scene_number || '#'}</span>
              <span className="bg-gray-100 px-2 py-0.5 rounded">{localScript.model || 'Unknown Type'}</span>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 md:grid-cols-2 gap-6 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
          {/* Common Fields */}
          <div className="col-span-full space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Scene Title</label>
              <input
                type="text"
                value={localScript.scene_title || ''}
                onChange={(e) => updateField('scene_title', e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Narration</label>
              <textarea
                value={localScript.narration || ''}
                onChange={(e) => updateField('narration', e.target.value)}
                rows={3}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
              />
            </div>

            {/* Gen Image Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="gen_image"
                checked={localScript.gen_image !== false} // Default to true
                onChange={(e) => updateField('gen_image', e.target.checked)}
                className="w-4 h-4 text-[#13008B] rounded focus:ring-[#13008B]"
              />
              <label htmlFor="gen_image" className="text-sm font-medium text-gray-700">Generate Image with AI</label>
            </div>

            {/* Choose Template if Gen Image unchecked */}
            {localScript.gen_image === false && (
              <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 mb-2">Select an image from your templates or uploads:</p>
                <button
                  onClick={() => setShowAssetsModal(true)}
                  className="px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 flex items-center gap-2"
                >
                  <span className="w-5 h-5 bg-gray-200 rounded overflow-hidden">
                    {(isPlotly ? localScript.background_frame : (localScript.ref_image && localScript.ref_image[0])) ? (
                      <img
                        src={isPlotly ? localScript.background_frame : localScript.ref_image[0]}
                        alt="Selected"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Image />
                    )}
                  </span>
                  Choose from template
                </button>
              </div>
            )}
          </div>

          {/* Model Specific Fields */}

          {/* VEO3 */}
          {isVeo && (
            <div className="col-span-full space-y-4 border-t border-gray-100 pt-4">
              <h4 className="font-bold text-sm text-gray-900">VEO3 Template Details</h4>
              <Accordion title="VEO Prompt Template" defaultOpen={true}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[
                    { label: 'User', key: 'user' },
                    { label: 'System', key: 'system' },
                    { label: 'Style', key: 'styleCard' },
                    { label: 'Camera', key: 'cameraCard' },
                    { label: 'Subject', key: 'subject' },
                    { label: 'Action', key: 'action' },
                    { label: 'Ambiance', key: 'ambiance' },
                    { label: 'Background', key: 'background' },
                    { label: 'Composition', key: 'composition' },
                    { label: 'Focus & Lens', key: 'focus_and_lens' }
                  ].map(field => (
                    <div key={field.key}>
                      <label className="block text-xs font-medium text-gray-700 mb-1">{field.label}</label>
                      <textarea
                        value={localScript[field.key] || ''}
                        onChange={(e) => updateField(field.key, e.target.value)}
                        rows={1}
                        className="w-full p-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                      />
                    </div>
                  ))}
                </div>
              </Accordion>
            </div>
          )}

          {/* SORA */}
          {isSora && (
            <>
              <div className="col-span-full">
                <Accordion title="Opening Frame" defaultOpen={true}>
                  {renderNestedFields('opening_frame', backgroundFrameFields)}
                </Accordion>
              </div>
              <div className="col-span-full">
                <Accordion title="Closing Frame" defaultOpen={true}>
                  {renderNestedFields('closing_frame', backgroundFrameFields)}
                </Accordion>
              </div>
              <div className="col-span-full">
                <Accordion title="Animation Description" defaultOpen={true}>
                  {renderNestedFields('animation_desc', animationDescFields)}
                </Accordion>
              </div>
              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Text to be Included</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTextLine}
                    onChange={(e) => setNewTextLine(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent text-sm"
                    placeholder="Add text line..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTextLine.trim()) {
                          const current = Array.isArray(localScript.text_to_be_included) ? localScript.text_to_be_included : [];
                          updateField('text_to_be_included', [...current, newTextLine.trim()]);
                          setNewTextLine('');
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newTextLine.trim()) {
                        const current = Array.isArray(localScript.text_to_be_included) ? localScript.text_to_be_included : [];
                        updateField('text_to_be_included', [...current, newTextLine.trim()]);
                        setNewTextLine('');
                      }
                    }}
                    className="px-3 py-2 bg-[#13008B] text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-1"
                  >
                    <FaPlus size={12} /> Add
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(Array.isArray(localScript.text_to_be_included) ? localScript.text_to_be_included : []).map((text, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                      <span className="text-sm text-gray-700">{text}</span>
                      <button
                        onClick={() => {
                          const newArr = [...(localScript.text_to_be_included || [])];
                          newArr.splice(idx, 1);
                          updateField('text_to_be_included', newArr);
                        }}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {(!localScript.text_to_be_included || localScript.text_to_be_included.length === 0) && (
                    <p className="text-xs text-gray-400 italic">No text included yet.</p>
                  )}
                </div>
              </div>
              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Colors</label>
                <div className="flex flex-col gap-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="flex flex-col gap-3">
                      <HexColorPicker color={currentColor} onChange={setCurrentColor} />
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full border"
                          style={{ backgroundColor: currentColor }}
                        />
                        <input
                          value={currentColor}
                          onChange={(e) => setCurrentColor(e.target.value)}
                          className="px-3 py-2 border rounded-lg w-40"
                        />
                        <button
                          type="button"
                          onClick={addCurrentColor}
                          className="px-4 py-2 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0066] transition-colors"
                        >
                          Add Color
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="w-full border border-gray-200 rounded-xl p-4 mb-4">
                        <div className="grid grid-cols-8 gap-2">
                          {(() => {
                            const allColors = [...presetColors];
                            const selectedColorsArray = Array.from(localScript.colors || []);

                            const missingSelectedColors = selectedColorsArray.filter(selectedColor => {
                              const normalized = normalizeColor(selectedColor) || selectedColor;
                              return !presetColors.some(color => {
                                const normalizedColor = normalizeColor(color) || color;
                                return normalizedColor === normalized || color === selectedColor;
                              });
                            });

                            const uniqueSelected = [];
                            const seen = new Set();
                            missingSelectedColors.forEach(color => {
                              const normalized = normalizeColor(color) || color;
                              if (!seen.has(normalized) && !seen.has(color)) {
                                seen.add(normalized);
                                seen.add(color);
                                uniqueSelected.push(color);
                              }
                            });

                            const finalColors = [...uniqueSelected, ...presetColors];

                            return finalColors.map((color) => {
                              const isSelected = isColorSelected(color);
                              return (
                                <button
                                  key={color}
                                  onClick={() => toggleColor(color)}
                                  className={`w-8 h-8 rounded-full border-2 ${isSelected
                                    ? "border-blue-500 ring-2 ring-blue-300"
                                    : "border-gray-300"
                                    } flex items-center justify-center transition-all duration-150`}
                                  style={{ backgroundColor: color }}
                                  title={color}
                                >
                                  {isSelected && (
                                    <span className="text-white text-xs">✓</span>
                                  )}
                                </button>
                              );
                            });
                          })()}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {/* PLOTLY */}
          {isPlotly && (
            <>
              <div className="col-span-full">
                <Accordion title="Background Frame" defaultOpen={true}>
                  {renderNestedFields('background_frame', backgroundFrameFields)}
                  <div className="mt-2">
                    <button
                      onClick={() => setShowAssetsModal(true)}
                      className="px-3 py-2 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 flex items-center gap-2 text-sm"
                    >
                      <Paperclip size={16} /> Select Reference Image
                    </button>
                  </div>
                </Accordion>
              </div>
              <div className="col-span-full">
                <Accordion title="Animation Description" defaultOpen={true}>
                  {renderNestedFields('animation_desc', animationDescFields)}
                </Accordion>
              </div>
              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Text to be Included</label>
                <div className="flex gap-2 mb-2">
                  <input
                    type="text"
                    value={newTextLine}
                    onChange={(e) => setNewTextLine(e.target.value)}
                    className="flex-1 p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent text-sm"
                    placeholder="Add text line..."
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newTextLine.trim()) {
                          const current = Array.isArray(localScript.text_to_be_included) ? localScript.text_to_be_included : [];
                          updateField('text_to_be_included', [...current, newTextLine.trim()]);
                          setNewTextLine('');
                        }
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (newTextLine.trim()) {
                        const current = Array.isArray(localScript.text_to_be_included) ? localScript.text_to_be_included : [];
                        updateField('text_to_be_included', [...current, newTextLine.trim()]);
                        setNewTextLine('');
                      }
                    }}
                    className="px-3 py-2 bg-[#13008B] text-white rounded-lg hover:bg-blue-800 transition-colors flex items-center gap-1"
                  >
                    <FaPlus size={12} /> Add
                  </button>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {(Array.isArray(localScript.text_to_be_included) ? localScript.text_to_be_included : []).map((text, idx) => (
                    <div key={idx} className="flex justify-between items-center bg-gray-50 p-2 rounded border border-gray-100">
                      <span className="text-sm text-gray-700">{text}</span>
                      <button
                        onClick={() => {
                          const newArr = [...(localScript.text_to_be_included || [])];
                          newArr.splice(idx, 1);
                          updateField('text_to_be_included', newArr);
                        }}
                        className="text-gray-400 hover:text-red-500 p-1"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {(!localScript.text_to_be_included || localScript.text_to_be_included.length === 0) && (
                    <p className="text-xs text-gray-400 italic">No text included yet.</p>
                  )}
                </div>
              </div>
              <div className="col-span-full">
                <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
                <select
                  value={localScript.chart_type || 'Bar'}
                  onChange={(e) => {
                    const val = e.target.value;
                    setLocalScript(prev => ({ ...prev, chart_type: val, chart_data: getSampleChartData(val) }));
                  }}
                  className="w-full p-2 border border-gray-300 rounded-lg"
                >
                  {['Clustered Bar', 'Clustered Column', 'Line', 'Pie', 'Stacked Bar', 'Stacked Column', 'Waterfall Bar', 'Waterfall Column', 'Donut'].map(t => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>
              <div className="col-span-full">
                {!localScript.chart_data ? (
                  <button
                    onClick={() => {
                      updateField('chart_data', getSampleChartData(localScript.chart_type));
                    }}
                    className="px-4 py-2 bg-[#13008B] text-white rounded-lg hover:bg-blue-800 text-sm font-medium"
                  >
                    Initialize Chart Data
                  </button>
                ) : (
                  <div className=" rounded-lg overflow-hidden">
                    <ChartDataEditor
                      chartType={localScript.chart_type || 'Bar'}
                      chartData={localScript.chart_data}
                      onDataChange={(newData) => updateField('chart_data', newData)}
                      onSave={(newData) => updateField('chart_data', newData)}
                    />
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 flex justify-end gap-2">
          <button onClick={handleGenerateStoryboard} className="px-4 py-2 bg-[#13008B] text-white rounded-lg hover:bg-blue-800 transition-colors font-medium">
            Generate Storyboard
          </button>
          <button onClick={handleSave} className="px-4 py-2 bg-[#13008B] text-white rounded-lg hover:bg-blue-800 transition-colors font-medium">
            Save
          </button>
        </div>
      </div>

      {/* Assets Modal Overlay */}
      {showAssetsModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="bg-white w-[90%] max-w-4xl max-h-[90vh] rounded-xl flex flex-col shadow-2xl">
            <div className="flex-shrink-0 flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-bold text-lg">Select Asset ({normalizedTargetAspect})</h3>
              <button onClick={() => setShowAssetsModal(false)}><X /></button>
            </div>
            <div className="flex-shrink-0 flex gap-3 p-4 border-b border-gray-100 flex-wrap">
              {[
                { key: 'preset_templates', label: 'Preset Templates' },
                ...(isVeo ? [{ key: 'veo3_templates', label: 'Veo 3 Template' }] : []),
                { key: 'uploaded_templates', label: 'Uploaded Templates' },
                { key: 'uploaded_images', label: 'Uploaded Images' },
                { key: 'documents_images', label: 'Documents' },
                { key: 'generated_images', label: 'Generated Images' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setAssetsTab(tab.key)}
                  className={`px-3 py-1.5 rounded-full text-sm border whitespace-nowrap transition-colors ${assetsTab === tab.key
                    ? 'bg-[#13008B] text-white border-[#13008B]'
                    : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                    }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
            <div className="flex-1 overflow-y-auto p-4 mt-9 bg-gray-50">
              {isLoadingAssets ? (
                <div className="flex justify-center py-10">
                  <Loader title={
                    assetsTab === 'generated_images' ? 'Loading generated images...' :
                      ['preset_templates', 'uploaded_templates', 'veo3_templates'].includes(assetsTab) ? 'Loading templates by aspect ratio...' :
                        'Loading assets...'
                  } />
                </div>
              ) : (
                <>
                  {assetsTab === 'generated_images' ? (
                    <div className="space-y-8">
                      {generatedGroups.map((group, gIdx) => (
                        <div key={gIdx} className="space-y-3">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-gray-800 text-sm">Session: {group.sessionName}</h4>
                            <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded-full">{group.aspect} {group.images.length} images</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                            {group.images.map((asset, i) => (
                              <div
                                key={asset.id}
                                onClick={() => handleAssetSelect(asset)}
                                className="group relative cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-[#13008B] transition-all bg-white shadow-sm"
                              >
                                <div className="aspect-video bg-gray-200 relative">
                                  {asset.imageUrl ? (
                                    <img src={asset.imageUrl} alt={asset.label} className="w-full h-full object-cover" />
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                                  )}
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                                </div>
                                <div className="p-2 text-xs truncate font-medium text-gray-700">{asset.label}</div>
                                {asset.aspect && asset.aspect !== 'Unspecified' && (
                                  <div className="px-2 pb-1 text-[10px] text-gray-400">{asset.aspect}</div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                      {generatedGroups.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500">No generated images found for {normalizedTargetAspect}</div>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                      {currentAssets.map((asset, i) => (
                        <div
                          key={i}
                          onClick={() => handleAssetSelect(asset)}
                          className="group relative cursor-pointer rounded-lg overflow-hidden border-2 border-transparent hover:border-[#13008B] transition-all bg-white shadow-sm"
                        >
                          <div className="aspect-video bg-gray-200 relative">
                            {asset.imageUrl ? (
                              <img src={asset.imageUrl} alt={asset.label} className="w-full h-full object-cover" />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">No Image</div>
                            )}
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors" />
                          </div>
                          <div className="p-2 text-xs truncate font-medium text-gray-700">{asset.label}</div>
                          {asset.aspect && asset.aspect !== 'Unspecified' && (
                            <div className="px-2 pb-1 text-[10px] text-gray-400">{asset.aspect}</div>
                          )}
                        </div>
                      ))}
                      {currentAssets.length === 0 && (
                        <div className="col-span-full text-center py-10 text-gray-500">No assets found in this category for {normalizedTargetAspect}</div>
                      )}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AddSceneDropdown = ({ onAdd, hasScripts }) => {
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [videoType, setVideoType] = useState('Infographic');

  return (
    <div className="absolute top-full right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 p-4 flex flex-col gap-4">
      {/* Aspect Ratio Section - Only show if NO scripts exist */}
      {!hasScripts && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Aspect Ratio</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setAspectRatio('9:16')}
              className={`flex-1 p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${aspectRatio === '9:16' ? 'border-[#13008B] bg-blue-50 text-[#13008B]' : 'border-gray-100 hover:border-gray-200 text-gray-500'
                }`}
            >
              <div className="w-6 h-10 border-2 border-current rounded-sm"></div>
              <span className="text-xs font-bold">9:16</span>
            </button>
            <button
              onClick={() => setAspectRatio('16:9')}
              className={`flex-1 p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${aspectRatio === '16:9' ? 'border-[#13008B] bg-blue-50 text-[#13008B]' : 'border-gray-100 hover:border-gray-200 text-gray-500'
                }`}
            >
              <div className="w-10 h-6 border-2 border-current rounded-sm"></div>
              <span className="text-xs font-bold">16:9</span>
            </button>
          </div>
        </div>
      )}

      {/* Video Type Section */}
      <div>
        <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Video Type</h3>
        <div className="flex flex-col gap-2">
          {[
            { id: 'Infographic', icon: FaChartPie, label: 'Infographic' },
            { id: 'Avatar', icon: FaUserTie, label: 'Avatar' },
            { id: 'Financial Scene', icon: FaCoins, label: 'Financial Scene' }
          ].map((type) => (
            <button
              key={type.id}
              onClick={() => setVideoType(type.id)}
              className={`flex items-center gap-3 p-3 rounded-lg transition-all w-full text-left ${videoType === type.id ? 'bg-[#13008B] text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                }`}
            >
              <type.icon className={videoType === type.id ? 'text-white' : 'text-gray-400'} />
              <span className="text-sm font-medium">{type.label}</span>
              {videoType === type.id && <FaCheck className="ml-auto text-xs" />}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={() => onAdd({ aspectRatio, videoType })}
        className="w-full py-3 bg-[#13008B] text-white rounded-lg font-bold hover:bg-[#0e006b] transition-colors mt-2 shadow-lg shadow-blue-900/20"
      >
        Create Scene
      </button>
    </div>
  );
};

const StepTwo = ({ values, onBack, onSave, onGenerate, isGenerating = false, hasImages = false, onGoToStoryboard, addScene, onEditScene, onDeleteScene }) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);
  const [isSceneMenuOpen, setIsSceneMenuOpen] = useState(false);
  const sceneMenuRef = useRef(null);
  const [menuPosition, setMenuPosition] = useState({ top: 0, left: 0 });

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (sceneMenuRef.current && !sceneMenuRef.current.contains(event.target)) {
        // Check if the click is on the trigger button (which we might need to track, but simply closing is usually fine if we don't click inside the menu)
        setIsSceneMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const latestScript = values.scripts && values.scripts.length > 0 ? values.scripts[0] : null;
  const scenes = latestScript && latestScript.airesponse ? latestScript.airesponse : [];
  const activeScene = scenes[activeIndex] || scenes[0] || null;

  // Adjust activeIndex if out of bounds
  useEffect(() => {
    if (scenes.length > 0 && activeIndex >= scenes.length) {
      setActiveIndex(Math.max(0, scenes.length - 1));
    }
  }, [scenes.length, activeIndex]);

  // Simplified StepTwo with VideosList and Add Scene button
  return (
    <div className='bg-white h-[100vh] w-full rounded-lg p-6 overflow-y-auto'>
      <div className='flex items-center justify-between mb-6'>
        <h2 className='text-[24px] font-semibold'>Add Your Scenes</h2>
        <div className="flex items-center gap-2 relative" ref={dropdownRef}>
          {/* Add Scene button - top right */}
          <button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className='px-5 py-2 rounded-lg bg-[#13008B] text-white flex items-center gap-2 hover:bg-gray-800 transition-colors'
          >
            <FaPlus /> Add Scene
          </button>

          {isDropdownOpen && (
            <AddSceneDropdown
              hasScripts={values.scripts && values.scripts.length > 0}
              onAdd={(options) => {
                setIsDropdownOpen(false);
                addScene(options);
              }}
            />
          )}
        </div>
      </div>

      {/* Horizontal Scenes List (Pills) */}
      {scenes.length > 0 && (
        <div className="flex items-center gap-3 overflow-x-auto mb-6 pb-2 scrollbar-hide">
          {scenes.map((scene, idx) => {
            const isActive = activeIndex === idx;
            return (
              <div
                key={idx}
                onClick={() => {
                  setActiveIndex(idx);
                  setIsSceneMenuOpen(false);
                }}
                className={`relative flex items-center gap-2 px-4 py-2 rounded-full text-sm font-medium transition-colors whitespace-nowrap min-w-[100px] cursor-pointer ${isActive
                  ? 'bg-[#13008B] text-white shadow-md'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
              >
                <span>Scene {scene.scene_number || idx + 1}</span>

                {isActive && (
                  <div className="relative flex items-center">
                    <button
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={(e) => {
                        e.stopPropagation();
                        const rect = e.currentTarget.getBoundingClientRect();
                        setMenuPosition({ top: rect.bottom + 5, left: rect.left });
                        setIsSceneMenuOpen(!isSceneMenuOpen);
                      }}
                      className="p-0.5 hover:bg-white/20 rounded-full transition-colors"
                    >
                      <MoreVertical size={16} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <VideosList jobId={typeof window !== 'undefined' ? localStorage.getItem('current_video_job_id') : ''} />

      {/* Scene Menu - Fixed Position to avoid overflow clipping */}
      {isSceneMenuOpen && (
        <div
          ref={sceneMenuRef}
          style={{
            position: 'fixed',
            top: `${menuPosition.top}px`,
            left: `${menuPosition.left}px`,
            zIndex: 60
          }}
          className="w-48 bg-white rounded-lg shadow-xl border border-gray-100 overflow-hidden ring-1 ring-black ring-opacity-5 text-left"
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onEditScene) onEditScene(activeScene);
              setIsSceneMenuOpen(false);
            }}
            className="w-full text-left px-4 py-3 hover:bg-gray-50 text-sm font-medium text-gray-700 flex items-center gap-2 transition-colors"
          >
            <Edit size={16} className="text-gray-400" /> Edit & View
          </button>
          <div className="h-px bg-gray-100 my-0"></div>
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onDeleteScene) onDeleteScene(activeScene);
              setIsSceneMenuOpen(false);
            }}
            className="w-full text-left px-4 py-3 hover:bg-red-50 text-sm font-medium text-red-600 flex items-center gap-2 transition-colors"
          >
            <Trash2 size={16} className="text-red-400" /> Delete
          </button>
        </div>
      )}
    </div>
  );
};

const BuildReelWizard = () => {
  const { sessionId: paramSessionId } = useParams();
  // Restore step from localStorage on mount
  const [step, setStep] = useState(() => {
    try {
      const stored = localStorage.getItem('buildreel_current_step');
      const storedStep = stored ? parseInt(stored, 10) : 1;

      // Only restore to step 2+ if we have a valid session
      if (storedStep > 1) {
        const sessionId = paramSessionId || localStorage.getItem('session_id');
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
  const [form, setForm] = useState({ prompt: '', industry: '', scenes: [], scripts: [], userquery: null, videoDuration: '60' });
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
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [sceneToDeleteConfirm, setSceneToDeleteConfirm] = useState(null);
  const [isDeletingScene, setIsDeletingScene] = useState(false);
  const [imagesJobId, setImagesJobId] = useState('');
  const [videosJobId, setVideosJobId] = useState('');
  const [hasVideosAvailable, setHasVideosAvailable] = useState(false);
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [showImagesPopup, setShowImagesPopup] = useState(false);
  const [isRestoringSession, setIsRestoringSession] = useState(false);
  // Scene Script Modal State
  const [showSceneScriptModal, setShowSceneScriptModal] = useState(false);
  // Storyboard Modal State
  const [showStoryboardModal, setShowStoryboardModal] = useState(false);
  const [isGeneratingStoryboard, setIsGeneratingStoryboard] = useState(false);
  const [isVideoGenerating, setIsVideoGenerating] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const [currentScriptContent, setCurrentScriptContent] = useState('');
  const [sessionDataState, setSessionDataState] = useState(null);
  const [userState, setUserState] = useState(null);

  // Poll video generation status
  useEffect(() => {
    let intervalId;

    if (isVideoGenerating && videosJobId) {
      const pollVideoStatus = async () => {
        try {
          const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/video-job-status/${videosJobId}`);
          if (!resp.ok) {
            console.warn('Video status check failed:', resp.status);
            return;
          }

          const data = await resp.json();
          console.log('[BuildReel] Video job status:', data);

          // Update progress if available
          if (data.progress !== undefined) {
            setVideoProgress(data.progress);
          }

          if (data.status === 'completed' || data.status === 'succeeded') {
            setIsVideoGenerating(false);
            setVideoProgress(100);
            // Refresh session to get the new videos
            await sendUserSessionData();
            toast.success('Video generation completed!');
          } else if (data.status === 'failed') {
            setIsVideoGenerating(false);
            toast.error('Video generation failed');
          }

        } catch (e) {
          console.error('Error polling video status:', e);
        }
      };

      // Poll every 3 seconds
      intervalId = setInterval(pollVideoStatus, 3000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [isVideoGenerating, videosJobId]);

  const handleChange = (patch) => setForm((f) => ({ ...f, ...patch }));

  const handleSaveScenes = (scenes) => {
    setForm((f) => ({ ...f, scenes }));
  };

  const handleRefreshSession = async () => {
    const sessionId = localStorage.getItem('session_id');
    const token = localStorage.getItem('token');
    if (!sessionId || !token) return null;

    const data = await fetchSessionData(token, sessionId);
    if (data) {
      const sData = data.session_data || data.session;
      const uData = data.user_data || data.user;
      setSessionDataState(sData);
      setUserState(uData);
      return { sessionData: sData, user: uData };
    }
    return null;
  };

  const handleEditScene = (scene) => {
    setCurrentScriptContent(scene);
    setShowSceneScriptModal(true);
  };

  const handleDeleteScene = (sceneToDelete) => {
    setSceneToDeleteConfirm(sceneToDelete);
    setShowDeleteConfirm(true);
  };

  const executeDeleteScene = async () => {
    if (isDeletingScene || !sceneToDeleteConfirm) return;
    setIsDeletingScene(true);

    const sceneToDelete = sceneToDeleteConfirm;
    const sessionId = localStorage.getItem('session_id');
    const token = localStorage.getItem('token');

    if (!sessionId || !token) {
      setIsDeletingScene(false);
      return;
    }

    try {
      // 1. Fetch user session data
      const sessionDataResp = await fetchSessionData(token, sessionId);
      if (!sessionDataResp) throw new Error('Failed to fetch session data');

      const userObj = sessionDataResp.user_data || sessionDataResp.user || {};
      const sessionObj = sessionDataResp.session_data || sessionDataResp.session || {};

      // Ensure consistent session object structure for delete payload
      const sessionForBody = sanitizeSessionSnapshot(sessionObj, sessionId, token);

      // 2. Call delete-scene API
      const payload = {
        user: userObj,
        session: sessionForBody,
        scene_number: sceneToDelete.scene_number
      };

      console.log('[BuildReel] Deleting scene:', payload);

      const deleteResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/delete-scene', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!deleteResp.ok) {
        const err = await deleteResp.text();
        throw new Error(`Delete failed: ${err}`);
      }

      console.log('[BuildReel] Scene deleted successfully');

      // 3. Refresh session data to update UI
      const updatedData = await fetchSessionData(token, sessionId);
      if (updatedData) {
        const sd = updatedData.session_data || updatedData.session || {};
        const scripts = Array.isArray(sd.scripts) ? sd.scripts : [];
        setForm(f => ({ ...f, scripts }));
      }

      setShowDeleteConfirm(false);
      setSceneToDeleteConfirm(null);

    } catch (error) {
      console.error('Error deleting scene:', error);
      alert('Failed to delete scene. Please try again.');
    } finally {
      setIsDeletingScene(false);
    }
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

  // Helper function to fetch session data (reused in createFromScratch and restoreSession)
  const fetchSessionData = async (token, sessionId) => {
    try {
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
        return null;
      }
      return sessionData;
    } catch (e) {
      console.error('Error fetching session data:', e);
      return null;
    }
  };

  // Restore session data and scenes when step > 1 on mount
  useEffect(() => {
    const restoreSession = async () => {
      // Restore if we haven't restored yet
      if (isRestoringSession || hasRestoredSessionRef.current) return;

      const sessionId = paramSessionId || localStorage.getItem('session_id');
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
        const sessionData = await fetchSessionData(token, sessionId);

        if (!sessionData) {
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

        setSessionDataState(sessionData.session_data || sessionData.session);
        setUserState(sessionData.user_data || sessionData.user);

        const sd = sessionData?.session_data || sessionData?.session || {};

        // Strict Title-Based Step Logic
        const sessionTitle = sd?.title || sd?.session_title || '';

        // If title exists -> Step 2
        // If title is null/empty -> Step 1
        if (sessionTitle && sessionTitle.trim()) {
          setStep(2);
          try {
            localStorage.setItem('buildreel_current_step', '2');
          } catch (_) { }
        } else {
          setStep(1);
          try {
            localStorage.setItem('buildreel_current_step', '1');
          } catch (_) { }
        }

        // Check if session has images
        const sessionImages = Array.isArray(sd?.images) ? sd.images : [];
        setHasImages(sessionImages.length > 0);

        // Check if session has videos
        const sessionVideos = Array.isArray(sd?.videos) ? sd.videos : [];
        setHasVideosAvailable(sessionVideos.length > 0);

        // Conditional Modal Logic:
        // 1. If images exist AND (videos are empty/null) -> Open ImageList Modal
        // 2. If videos exist -> Go to Step 2 (already handled by title check above, but ensure modal is closed)
        if (sessionImages.length > 0 && sessionVideos.length === 0) {
          setShowStoryboardModal(true);
        } else if (sessionVideos.length > 0) {
          setShowStoryboardModal(false);
          // Ensure we are on step 2
          setStep(2);
          try { localStorage.setItem('buildreel_current_step', '2'); } catch (_) { }
        }

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

        // Auto-open Scene Script Modal if scenes exist BUT no images/videos yet (i.e. just script generated)
        if (airesponse.length > 0 && sessionImages.length === 0 && sessionVideos.length === 0) {
          const latestScene = airesponse[0]; // Open the first scene of the latest script
          setCurrentScriptContent(latestScene);
          setShowSceneScriptModal(true);
        }

        // REMOVED: If no scenes found in session, reset to step 1
        // We now rely solely on title to determine step.

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
        setForm(f => ({ ...f, scripts: scripts, videoDuration: String(sd?.video_duration || '60') }));
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
        } else {
          const narrationWordCount = computeWordCount(narration);
          if (narrationWordCount > 20) {
            validationErrors.push(`${sceneTitle} (Scene ${sceneNum}): Narration exceed the video duration. Maximum allowed is 20 words.`);
          }
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

      // Extract aspect ratio
      const aspectRatio = extractAspectRatioFromSessionPayload(sd) || '16:9';

      const payload = {
        session_id: sessionId,
        user_id: token,
        aspect_ratio: aspectRatio,
        subtitles: false,
        scenes: [],
        scene_numbers: [0]
      };

      const genResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/generate-videos-queue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload)
      });
      const genText = await genResp.text();
      let genData; try { genData = JSON.parse(genText); } catch (_) { genData = genText; }
      if (!genResp.ok) throw new Error(`generate-videos-queue failed: ${genResp.status} ${genText}`);

      const jobId = genData?.job_id || genData?.jobId || genData?.id;
      if (jobId) {
        setVideosJobId(jobId);
        setIsVideoGenerating(true);
        setSubView('videos');
      }

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
      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/merge', {
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

  const createFromScratch = async (optionsOrEvent) => {
    if (isCreatingScenes) return;

    let options = null;
    // Check if it's a custom options object and not a React event
    if (optionsOrEvent && typeof optionsOrEvent === 'object' && !optionsOrEvent.preventDefault && !optionsOrEvent.nativeEvent && !optionsOrEvent._reactName) {
      options = optionsOrEvent;
    }

    try {
      if (options) {
        setIsCreatingScenes(true);
        console.log('[BuildReel] Adding scene with options:', options);
        // If adding a scene via options, we need to fetch user data and call the scene creation API
        const sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) ? localStorage.getItem('session_id') : '';
        const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';

        if (!sessionId || !token) throw new Error('Missing session_id or token');

        // Fetch User Session Data to get the user object
        console.log('[BuildReel] Fetching user session data...');
        const sessResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: token, session_id: sessionId })
        });

        if (!sessResp.ok) {
          throw new Error('Failed to fetch user session data');
        }

        const sessData = await sessResp.json();
        // Use user_data if available, otherwise fallback to user
        const userObj = sessData?.user_data || {};

        // Format Aspect Ratio (e.g., "16:9" -> "16_9")
        const formattedAspectRatio = options.aspectRatio ? options.aspectRatio.replace(':', '_') : '16_9';

        // Map video type to model type
        // Avatar -> VEO3-avatar
        // Financial Scene -> PLOTLY-financial
        // Infographic -> SORA-info
        let modelType = 'SORA'; // Default
        const selectedType = options.videoType || 'Infographic';

        if (selectedType === 'Avatar') {
          modelType = 'VEO3';
        } else if (selectedType === 'Financial Scene') {
          modelType = 'PLOTLY';
        } else if (selectedType === 'Infographic') {
          modelType = 'SORA';
        }

        // Construct Payload
        const payload = {
          user: userObj,
          session_id: sessionId,
          current_script: {
            userquery: [
              {
                guidelines: {
                  technical_and_formal_constraints: {
                    aspect_ratio: formattedAspectRatio
                  }
                }
              }
            ],
            airesponse: []
          },
          action: "add",
          model_type: modelType
        };

        console.log('[BuildReel] Calling Scene Creation API with payload:', payload);

        // Call Scene Creation API
        const sceneResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/create-from-scratch', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        if (!sceneResp.ok) {
          const errText = await sceneResp.text();
          throw new Error(`Scene creation failed: ${errText}`);
        }

        const sceneData = await sceneResp.json();
        console.log('[BuildReel] Scene Creation Response:', sceneData);

        // Fetch session data again to get latest scripts and update state
        const updatedSessionData = await fetchSessionData(token, sessionId);
        if (updatedSessionData) {
          const sd = updatedSessionData?.session_data || updatedSessionData?.session || {};
          const scripts = Array.isArray(sd?.scripts) ? sd.scripts : [];
          setForm(f => ({ ...f, scripts: scripts }));

          // Auto-open script editor with the latest scene
          const currentScript = scripts[0] || {};
          const airesponse = Array.isArray(currentScript.airesponse) ? currentScript.airesponse : [];
          if (airesponse.length > 0) {
            // Use the first scene from the latest script, similar to restore logic
            const latestScene = airesponse[0];
            setCurrentScriptContent(latestScene);
            setShowSceneScriptModal(true);
          } else {
            // Fallback to previous logic if no scripts found in session (though unexpected)
            const scriptContent = sceneData?.script || sceneData?.message || sceneData;
            setCurrentScriptContent(scriptContent);
            setShowSceneScriptModal(true);
          }
        } else {
          // Fallback if session fetch fails
          const scriptContent = sceneData?.script || sceneData?.message || sceneData;
          setCurrentScriptContent(scriptContent);
          setShowSceneScriptModal(true);
        }

        setIsCreatingScenes(false);
        return; // Stop here, don't proceed to default step transition logic
      }

      setIsCreatingScenes(true);
      // Build request per new format
      const sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) ? localStorage.getItem('session_id') : '';
      const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';

      if (!sessionId || !token) {
        throw new Error('Missing session_id or token');
      }

      // Step 3: Call video-type/update API
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

      setStep(2);
      // Persist step change
      try {
        localStorage.setItem('buildreel_current_step', '2');
      } catch (_) {
        // Ignore
      }
    } catch (e) {
      console.error(e);
      alert('Failed to proceed. Please try again.');
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
              addScene={createFromScratch}
              onEditScene={handleEditScene}
              onDeleteScene={handleDeleteScene}
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
      {isCreatingScenes && (
        <Loader
          title="Creating Scene"
          fullScreen={true}
          progress={creatingScriptProgress}
        />
      )}
      {showShortGenPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-[100%] max-w-sm rounded-lg shadow-xl p-6 text-center">
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <h4 className="text-lg font-semibold text-gray-900">Fetching Video…</h4>
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

      {/* Image List Modal (Popup) */}
      {showStoryboardModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white w-[90%] h-[90%] rounded-xl shadow-2xl overflow-hidden relative flex flex-col">
            <div className="flex items-center justify-between p-4 border-b">
              <h3 className="text-lg font-bold">Storyboard Images</h3>
              <button
                onClick={() => setShowStoryboardModal(false)}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 overflow-hidden relative">
              <ImageList
                jobId={imagesJobId}
                hasVideos={hasVideosAvailable}
                onGoToVideos={() => {
                  setShowStoryboardModal(false);
                  setSubView('videos');
                }}
                onClose={async () => {
                  await sendUserSessionData();
                  setShowStoryboardModal(false);
                }}
                onGenerateVideos={async () => {
                  await handleGenerateVideosFromImages();
                  setShowStoryboardModal(false);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* Scene Script Modal */}
      <SceneScriptModal
        isOpen={showSceneScriptModal}
        onClose={() => setShowSceneScriptModal(false)}
        scriptContent={currentScriptContent}
        videoDuration={form.videoDuration}
        sessionData={sessionDataState}
        user={userState}
        onRefreshSession={handleRefreshSession}
        // New props
        imagesJobId={imagesJobId}
        setImagesJobId={setImagesJobId}
        hasVideosAvailable={hasVideosAvailable}
        setSubView={setSubView}
        sendUserSessionData={sendUserSessionData}
        handleGenerateVideosFromImages={handleGenerateVideosFromImages}
        setShowStoryboardModal={setShowStoryboardModal}
        isGeneratingStoryboard={isGeneratingStoryboard}
        setIsGeneratingStoryboard={setIsGeneratingStoryboard}
      />

      {/* Confirm Delete Scene Popup */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white w-[92%] max-w-md rounded-lg shadow-xl p-5">
            <h3 className="text-lg font-semibold text-[#13008B]">Delete This Scene?</h3>
            <p className="mt-2 text-sm text-gray-700">
              Are you sure you want to delete Scene {sceneToDeleteConfirm?.scene_number}? This action cannot be undone.
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
                onClick={executeDeleteScene}
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

      {/* Video Generation Loader */}
      {isVideoGenerating && (
        <div className="fixed inset-0 z-[80] flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm">
          <img src={loadingGif} alt="Generating Video..." className="w-32 h-32 mb-6" />
          <h3 className="text-2xl font-bold text-[#13008B] mb-3">Generating Video</h3>
          <p className="text-gray-600 text-lg">This may take a few moments. Please keep this tab open while we finish.</p>
          {videoProgress > 0 && (
            <div className="mt-6 w-80 bg-gray-200 rounded-full h-3">
              <div
                className="bg-[#13008B] h-3 rounded-full transition-all duration-300 ease-out"
                style={{ width: `${videoProgress}%` }}
              />
            </div>
          )}
        </div>
      )}

    </>
  );
};

export default BuildReelWizard;
