import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, Paperclip, FileText, Camera, Send, File, X, GripVertical, Check, Maximize2, RefreshCcw, ChevronLeft, ChevronRight, ChevronDown, MoreHorizontal, Trash2 } from 'lucide-react';
import { CiPen } from 'react-icons/ci';
import { formatAIResponse } from '../utils/formatting';
import ChartDataEditor from './ChartDataEditor';
import LogoImage from '../asset/mainLogo.png';
import LoadingAnimationVideo from '../asset/Loading animation.mp4';

const GOOGLE_FONT_OPTIONS = [
  'Roboto',
  'Open Sans',
  'Lato',
  'Montserrat',
  'Poppins',
  'Source Sans Pro',
  'Inter',
  'Nunito',
  'Raleway',
  'Playfair Display',
  'Merriweather',
  'PT Sans',
  'Oswald',
  'Rubik',
  'Work Sans',
  'Fira Sans',
  'Cabin',
  'Karla',
  'Libre Baskerville',
  'Josefin Sans'
];

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

// Helper function to normalize brand assets API response
// Handles both old format: { templates: [...], logos: [...] }
// and new format: { "9:16": { preset_templates: [...], uploaded_templates: [...] }, logos: [...] }
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
  
  // Extract flat arrays (logos, icons, etc.)
  const logos = Array.isArray(data.logos) ? data.logos : [];
  const icons = Array.isArray(data.icons) ? data.icons : [];
  const uploaded_images = Array.isArray(data.uploaded_images) ? data.uploaded_images : [];
  const documents_images = Array.isArray(data.documents_images) ? data.documents_images : [];
  
  // Handle templates - check if it's in new format (aspect ratio keys) or old format (templates array)
  let templates = data.templates ?? [];
  
  // Check if data has aspect ratio keys (like "9:16", "16:9", etc.) indicating new format
  const aspectRatioKeys = Object.keys(data).filter(key => 
    /^(\d+):(\d+)$/.test(key) && typeof data[key] === 'object' && data[key] !== null
  );
  
  // If we have aspect ratio keys and templates is empty/not an array, use the entire data object structure
  if (aspectRatioKeys.length > 0 && (!Array.isArray(templates) || templates.length === 0)) {
    // Build templates structure from aspect ratio keys
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

// Helper function to extract assets by type from the templates structure
// Structure: { "9:16": { preset_templates: [...], uploaded_templates: [...], uploaded_images: [...] }, "16:9": {...} }
const extractAssetsByType = (templatesInput = {}, assetType = 'preset_templates') => {
  const normalized = [];
  
  if (!templatesInput || typeof templatesInput !== 'object') return normalized;
  
  // If templatesInput is an array (old format), return empty
  if (Array.isArray(templatesInput)) return normalized;
  
  // Process aspect ratio keys (like "9:16", "16:9")
  Object.keys(templatesInput).forEach(aspectKey => {
    const aspectGroup = templatesInput[aspectKey];
    if (!aspectGroup || typeof aspectGroup !== 'object') return;
    
    // Get the specific asset type array
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

const flattenTemplateAssets = (templatesInput = []) => {
  const normalized = [];

  const pushEntry = (entry, aspectHint, labelHint, keyHint) => {
    if (!entry) return;
    const templateObj =
      (entry.template && typeof entry.template === 'object' ? entry.template : entry);
    const imageUrl = resolveTemplateAssetUrl(templateObj);
    if (!imageUrl) return;
    const trimmedUrl = imageUrl.trim();
    const lowerUrl = trimmedUrl.toLowerCase();
    const looksLikeHttp = /^https?:\/\//.test(trimmedUrl);
    const looksLikeData = trimmedUrl.startsWith('data:image/');
    const hasImageExtension = /(\.png|\.jpe?g|\.webp|\.gif|\.bmp|\.svg)(\?|$)/.test(lowerUrl);
    if (!(looksLikeHttp || looksLikeData || hasImageExtension)) return;
    const aspectSource =
      templateObj?.aspect_ratio ||
      templateObj?.ratio ||
      templateObj?.orientation ||
      entry?.aspect_ratio ||
      entry?.ratio ||
      entry?.orientation ||
      aspectHint;
    const aspectLabel = normalizeTemplateAspectLabel(aspectSource);
    const label =
      templateObj?.label ||
      entry?.label ||
      labelHint ||
      `Template ${normalized.length + 1}`;
    const templateId =
      templateObj?.template_id ||
      templateObj?.templateId ||
      templateObj?.id ||
      entry?.template_id ||
      entry?.templateId ||
      entry?.id ||
      `${keyHint || 'template'}-${normalized.length}`;
    normalized.push({
      id: String(templateId),
      imageUrl,
      aspect: aspectLabel,
      label,
      raw: templateObj
    });
  };
  const looksLikeTemplateObject = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
    const candidate =
      obj.template && typeof obj.template === 'object' ? obj.template : obj;
    return !!resolveTemplateAssetUrl(candidate);
  };

  const processNode = (node, aspectHint = '', labelHint = '', keyHint = 'template') => {
    if (!node) return;
    if (typeof node === 'string') {
      pushEntry(node, aspectHint, labelHint || `Template ${normalized.length + 1}`, keyHint);
      return;
    }
    if (Array.isArray(node)) {
      node.forEach((child, idx) => {
        processNode(child, aspectHint, labelHint, `${keyHint}-${idx}`);
      });
      return;
    }
    if (typeof node === 'object') {
      if (looksLikeTemplateObject(node)) {
        const directAspect =
          node?.aspect_ratio || node?.ratio || node?.orientation || aspectHint;
        const aspect = normalizeTemplateAspectLabel(directAspect);
        pushEntry(node, aspect, labelHint, keyHint);
        return;
      }
      const aspectFromNode = normalizeTemplateAspectLabel(
        node?.aspect_ratio || node?.ratio || node?.orientation || aspectHint
      );
      const nestedTemplates = [
        ...(Array.isArray(node.preset_templates) ? node.preset_templates : []),
        ...(Array.isArray(node.uploaded_templates) ? node.uploaded_templates : []),
        ...(Array.isArray(node.uploaded_images) ? node.uploaded_images : []),
        ...(Array.isArray(node.logos) ? node.logos : []),
        ...(Array.isArray(node.icons) ? node.icons : []),
        ...(Array.isArray(node.documents_images) ? node.documents_images : [])
      ];
      const handledKeys = new Set();
      if (Array.isArray(node.preset_templates)) handledKeys.add('preset_templates');
      if (Array.isArray(node.uploaded_templates)) handledKeys.add('uploaded_templates');
      if (Array.isArray(node.uploaded_images)) handledKeys.add('uploaded_images');
      if (Array.isArray(node.logos)) handledKeys.add('logos');
      if (Array.isArray(node.icons)) handledKeys.add('icons');
      if (Array.isArray(node.documents_images)) handledKeys.add('documents_images');
      if (nestedTemplates.length > 0) {
        nestedTemplates.forEach((child, idx) => {
          processNode(
            child,
            aspectFromNode,
            `${aspectFromNode} Template ${idx + 1}`,
            `${keyHint}-${idx}`
          );
        });
      }
      const entries = Object.entries(node).filter(([childKey]) => !handledKeys.has(childKey));
      if (entries.length === 0) return;
      entries.forEach(([childKey, childVal], idx) => {
        if (childVal == null) return;
        const aspectFromKey = normalizeTemplateAspectLabel(childKey);
        const nextAspect =
          aspectFromKey && aspectFromKey !== 'Unspecified'
            ? aspectFromKey
            : aspectFromNode;
        const childLabel =
          typeof childKey === 'string' && childKey.trim().length > 0
            ? childKey
            : labelHint;
        processNode(childVal, nextAspect, childLabel, `${keyHint}-${childKey || idx}`);
      });
      return;
    }
  };

  processNode(templatesInput);

  return normalized;
};

const parseDurationToSeconds = (input) => {
  try {
    if (typeof input === 'number' && Number.isFinite(input)) return Math.round(input);
    if (typeof input !== 'string') return null;
    const trimmed = input.trim();
    if (!trimmed) return null;
    if (/^\d+$/.test(trimmed)) return Number(trimmed);
    const rangeMatch = trimmed.match(/(\d+)\s*[-–]\s*(\d+)/);
    if (rangeMatch) {
      const endVal = Number(rangeMatch[2]);
      return Number.isFinite(endVal) ? endVal : null;
    }
    const matches = trimmed.match(/(\d+(\.\d+)?)/g);
    if (matches && matches.length > 0) {
      const last = Number(matches[matches.length - 1]);
      return Number.isFinite(last) ? Math.round(last) : null;
    }
    return null;
  } catch (_) {
    return null;
  }
};

const computeWordCount = (text) => {
  if (typeof text !== 'string') return 0;
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
};

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

const formatUserForVisual = (userData = {}, token = '') => {
  const fallbackObject = { additionalProp1: {} };
  const ensureObject = (val) =>
    val && typeof val === 'object' && !Array.isArray(val) ? val : { ...fallbackObject };
  const ensureVoiceoverArray = (arr) => {
    if (!Array.isArray(arr)) return [];
    return arr.map((vo = {}) => ({
      url: vo?.url || vo?.voice_url || vo?.voiceUrl || '',
      name: vo?.name || vo?.label || '',
      type: vo?.type || vo?.voice_type || '',
      created_at: vo?.created_at || vo?.createdAt || new Date().toISOString()
    }));
  };
  const ensureArrayOfStrings = (arr) => (Array.isArray(arr) ? arr.map(String) : []);
  const userObj = {
    id: String(userData?.id || userData?._id || token || ''),
    email: userData?.email || userData?.Email || '',
    display_name: userData?.display_name || userData?.displayName || userData?.name || '',
    created_at: userData?.created_at || new Date().toISOString(),
    folder_url: userData?.folder_url || userData?.folderUrl || '',
    brand_identity: ensureObject(userData?.brand_identity || userData?.brandIdentity),
    tone_and_voice: ensureObject(userData?.tone_and_voice || userData?.toneAndVoice),
    look_and_feel: ensureObject(userData?.look_and_feel || userData?.lookAndFeel),
    templates: ensureArrayOfStrings(userData?.templates),
    voiceover: ensureVoiceoverArray(userData?.voiceover || userData?.voiceovers)
  };
  // Only include avatar_url if it has a non-empty value
  const avatarUrl = userData?.avatar_url || userData?.avatarUrl || '';
  if (avatarUrl && avatarUrl.trim()) {
    userObj.avatar_url = avatarUrl.trim();
  }
  return userObj;
};

const formatSessionForVisual = (sessionData = {}, sessionId = '', token = '') => {
  // Start with a deep copy to preserve ALL fields including nested structures
  const base = sessionData && typeof sessionData === 'object' && !Array.isArray(sessionData)
    ? JSON.parse(JSON.stringify(sessionData)) // Deep copy to preserve all nested fields
    : {};
  
  // Only normalize/transform specific fields, preserve everything else
  const result = {
    ...base, // Preserve all original fields first
    session_id: base.session_id || sessionId,
    user_id: base.user_id || token,
    title: base.title || '',
    video_duration: String(base.video_duration || '60'),
    created_at: base.created_at || new Date().toISOString(),
    updated_at: base.updated_at || new Date().toISOString(),
    document_summary: Array.isArray(base.document_summary) ? base.document_summary : (base.document_summary ? [base.document_summary] : []),
    messages: Array.isArray(base.messages) ? base.messages : (base.messages ? [base.messages] : []),
    total_summary: Array.isArray(base.total_summary) ? base.total_summary : (Array.isArray(base.totalsummary) ? base.totalsummary : []),
    scripts: Array.isArray(base.scripts) ? base.scripts : (base.scripts ? [base.scripts] : []),
    videos: Array.isArray(base.videos) ? base.videos : (base.videos ? [base.videos] : []),
    images: Array.isArray(base.images) ? base.images : (base.images ? [base.images] : []),
    final_link: base.final_link || '',
    videoType: base.videoType || base.video_type || '',
    brand_style_interpretation: base.brand_style_interpretation && typeof base.brand_style_interpretation === 'object'
      ? base.brand_style_interpretation
        : {}
  };
  
  // Remove unwanted fields
  delete result.additionalProp1;
  delete result.user_data;
  delete result.user;
  delete result.videoduration;
  delete result.video_type;
  delete result.totalsummary;
  delete result.id; // Remove id if present, we use session_id
  
  // All other fields (including nested structures in scripts/scenes like opening_frame, closing_frame, background_frame, animation_desc) are preserved
  return result;
};

// Helper function to parse description into sections
const parseDescription = (description) => {
  if (!description || typeof description !== 'string') return [];
  
  // Check if description contains **Title**: pattern
  if (!description.includes('**')) {
    return [{ type: 'text', content: description }];
  }
  
  // Match all **Title**: content patterns
  const pattern = /\*\*([^*]+?)\*\*:\s*([^*]+?)(?=\s*\*\*|$)/g;
  const sections = [];
  let lastIndex = 0;
  let match;
  
  while ((match = pattern.exec(description)) !== null) {
    // Add any text before this match
    if (match.index > lastIndex) {
      const prefix = description.substring(lastIndex, match.index).trim();
      if (prefix) {
        sections.push({ type: 'text', content: prefix });
      }
    }
    
    // Add the title and content
    const title = match[1].trim();
    const content = match[2].trim();
    if (title && content) {
      sections.push({ type: 'section', title, content });
    }
    
    lastIndex = pattern.lastIndex;
  }
  
  // Add any remaining text after last match
  if (lastIndex < description.length) {
    const suffix = description.substring(lastIndex).trim();
    if (suffix) {
      sections.push({ type: 'text', content: suffix });
    }
  }
  
  // If no sections found, return as text
  if (sections.length === 0) {
    return [{ type: 'text', content: description }];
  }
  
  return sections;
};

// Helper function to merge sections back into description format (keeps ** marks)
const mergeDescriptionSections = (sections) => {
  if (!sections || sections.length === 0) return '';
  
  // Filter out empty sections and merge them
  const validSections = sections.filter(section => {
    if (section.type === 'section') {
      return section.title && section.title.trim() && section.content && section.content.trim();
    } else {
      return section.content && section.content.trim();
    }
  });
  
  return validSections.map(section => {
    if (section.type === 'section') {
      return `**${section.title.trim()}**: ${section.content.trim()}`;
    } else {
      return section.content.trim();
    }
  }).join(' ').trim();
};

// Helper function to format description for display (hides ** marks, shows bold titles)
const formatDescription = (description) => {
  const sections = parseDescription(description);
  
  // If no sections found, return original
  if (sections.length === 0) {
    return <div className="text-sm text-gray-600 whitespace-pre-wrap">{description}</div>;
  }
  
  // Render formatted sections - each title and description in separate divs, one below another
  return (
    <div className="space-y-4">
      {sections.map((section, index) => {
        if (section.type === 'section') {
          return (
            <div key={index} className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0">
              <div className="text-sm font-bold text-gray-800 mb-2">
                {section.title}
              </div>
              <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed pl-0">
                {section.content}
              </div>
            </div>
          );
        } else {
          return (
            <div key={index} className="text-sm text-gray-600 whitespace-pre-wrap">{section.content}</div>
          );
        }
      })}
    </div>
  );
};

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

const Chat = ({ addUserChat, userChat, setuserChat, sendUserSessionData, chatHistory, setChatHistory, isChatLoading = false, onOpenImagesList, imagesAvailable = false, onGoToScenes, scenesMode = false, initialScenes = null, onBackToChat, enablePresenterOptions = false, isSwitchingVideoType = false, loadingVideoType = null, onScriptChange = null }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingMessageId, setThinkingMessageId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isSubmittingSummary, setIsSubmittingSummary] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingQuestionnaire, setIsGeneratingQuestionnaire] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [showShortGenPopup, setShowShortGenPopup] = useState(false); // no longer used for images
  const [showImagesOverlay, setShowImagesOverlay] = useState(false);
  const [showMissingAvatarPopup, setShowMissingAvatarPopup] = useState(false);
  const [missingAvatarScenes, setMissingAvatarScenes] = useState([]);
  const [imagesJobId, setImagesJobId] = useState('');
  const [videoCountdown, setVideoCountdown] = useState(0);
  const fileInputRef = useRef(null);
  const chatInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptRows, setScriptRows] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [draggedRowIndex, setDraggedRowIndex] = useState(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState(null);
  // New: drag state for scene tabs
  const [draggedTabIndex, setDraggedTabIndex] = useState(null);
  const [dragOverTabIndex, setDragOverTabIndex] = useState(null);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);
  // Presenter preset state
  const [selectedPresenterPreset, setSelectedPresenterPreset] = useState('');
  const [presenterPresetOriginal, setPresenterPresetOriginal] = useState('');
  const [presenterPresetDirty, setPresenterPresetDirty] = useState(false);
  const [showPresenterSaveConfirm, setShowPresenterSaveConfirm] = useState(false);
  const [pendingPresenterPresetId, setPendingPresenterPresetId] = useState('');
  const [pendingPresenterPresetLabel, setPendingPresenterPresetLabel] = useState('');
  const [isSavingPresenterPreset, setIsSavingPresenterPreset] = useState(false);
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);
  // Accordion states for Opening, Closing Frame, Background, and Animation Description
  const [openingAccordionOpen, setOpeningAccordionOpen] = useState(false);
  const [closingFrameAccordionOpen, setClosingFrameAccordionOpen] = useState(false);
  const [backgroundAccordionOpen, setBackgroundAccordionOpen] = useState(false);
  const [animationDescAccordionOpen, setAnimationDescAccordionOpen] = useState(false);
  
  // Editing states for frame data
  const [isEditingOpeningFrame, setIsEditingOpeningFrame] = useState(false);
  const [isEditingClosingFrame, setIsEditingClosingFrame] = useState(false);
  const [isEditingBackgroundFrame, setIsEditingBackgroundFrame] = useState(false);
  const [isEditingAnimationDesc, setIsEditingAnimationDesc] = useState(false);
  const [isSavingFrameData, setIsSavingFrameData] = useState(false);
  
  // Edited data states
  const [editedOpeningFrame, setEditedOpeningFrame] = useState({});
  const [editedClosingFrame, setEditedClosingFrame] = useState({});
  const [editedBackgroundFrame, setEditedBackgroundFrame] = useState({});
  const [editedAnimationDesc, setEditedAnimationDesc] = useState({});
  
  // Helper function to save frame data (opening_frame, closing_frame, background_frame, animation_desc)
  const saveFrameData = async (fieldName, fieldData) => {
    if (isSavingFrameData) return;
    setIsSavingFrameData(true);
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) throw new Error('Missing session_id or token');

      // Load session snapshot
      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessText = await sessionResp.text();
      let sessJson; try { sessJson = JSON.parse(sessText); } catch(_) { sessJson = {}; }
      if (!sessionResp.ok) throw new Error(`user-session/data failed: ${sessionResp.status} ${sessText}`);
      const rawSession = sessJson?.session_data || sessJson?.session || {};
      const sessionForBody = sanitizeSessionSnapshot(rawSession, sessionId, token);
      const rawUser = sessJson?.user_data || rawSession?.user_data || rawSession?.user || {};
      const user = normalizeUserSnapshot(rawUser, token);
      const scriptsSource = Array.isArray(sessionForBody?.scripts) ? sessionForBody.scripts : [];
      const primaryScript = scriptsSource[0] || {};
      const originalUserquery = Array.isArray(primaryScript?.userquery) ? primaryScript.userquery : [];
      const scriptVersion = primaryScript?.version || sessionForBody?.version || 'v1';
      const airesponseSource = Array.isArray(primaryScript?.airesponse)
        ? primaryScript.airesponse.map((item) => (item && typeof item === 'object' ? { ...item } : item))
        : [];
      const rows = Array.isArray(scriptRows) ? scriptRows : [];
      const targetRow = rows[currentSceneIndex] || {};
      const targetSceneNumber = targetRow?.scene_number ?? (currentSceneIndex + 1);

      // Update the specific scene's field
      let matchedScene = false;
      const airesponse = airesponseSource.map((scene, idx) => {
        if (!scene || typeof scene !== 'object') return scene;
        const sceneNumber =
          scene?.scene_number ??
          scene?.scene_no ??
          scene?.sceneNo ??
          scene?.scene ??
          (idx + 1);
        if (sceneNumber !== targetSceneNumber) {
          return { ...scene };
        }
        matchedScene = true;
        const clone = { ...scene };
        
        // Update the specific field
        clone[fieldName] = fieldData;
        
        return clone;
      });

      // If scene not found, add it as a new scene
      const finalAiresponse = matchedScene ? airesponse : (() => {
        const fallbackRow = rows[currentSceneIndex] || {};
        const fallbackScene = {
          scene_number: targetSceneNumber,
          scene_title: fallbackRow?.scene_title ?? '',
          model: fallbackRow?.mode ?? fallbackRow?.model ?? '',
          timeline: fallbackRow?.timeline ?? '',
          [fieldName]: fieldData
        };
        return [...airesponse, fallbackScene];
      })();

      const requestBody = {
        user,
        session: sessionForBody,
        changed_script: {
          userquery: originalUserquery,
          airesponse: finalAiresponse,
          version: String(scriptVersion || 'v1')
        }
      };

      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-text', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody)
      });
      const txt = await resp.text();
      let data;
      try { data = JSON.parse(txt); } catch(_) { data = txt; }
      if (!resp.ok || resp.status !== 200) throw new Error(`scripts/update-text failed: ${resp.status} ${txt}`);
      
      const container = data?.script ? { script: data.script } : data;
      const normalized = normalizeScriptToRows(container);
      const newRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
      setScriptRows(newRows);
      try {
        localStorage.setItem(scopedKey('updated_script_structure'), JSON.stringify(container));
        localStorage.setItem(scopedKey('original_script_hash'), JSON.stringify(container));
      } catch(_) {}
    } catch(e) {
      console.error('saveFrameData failed:', e);
      alert(`Failed to save ${fieldName}. Please try again.`);
      throw e;
    } finally {
      setIsSavingFrameData(false);
    }
  };

  // Move scene left/right utilities for tab controls
  const moveSceneLeft = (index) => {
    try {
      if (!Array.isArray(scriptRows) || index <= 0) return;
      const newOrder = [...scriptRows];
      const tmp = newOrder[index - 1];
      newOrder[index - 1] = newOrder[index];
      newOrder[index] = tmp;
      setScriptRows(newOrder);
      setHasOrderChanged(true);
      setCurrentSceneIndex(index - 1);
    } catch (_) { /* noop */ }
  };
  const moveSceneRight = (index) => {
    try {
      if (!Array.isArray(scriptRows) || index >= scriptRows.length - 1) return;
      const newOrder = [...scriptRows];
      const tmp = newOrder[index + 1];
      newOrder[index + 1] = newOrder[index];
      newOrder[index] = tmp;
      setScriptRows(newOrder);
      setHasOrderChanged(true);
      setCurrentSceneIndex(index + 1);
    } catch (_) { /* noop */ }
  };
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);
  const [selectedVideoType, setSelectedVideoType] = useState('Avatar Based');
  const [showReorderTable, setShowReorderTable] = useState(false);
  const [isEditingScene, setIsEditingScene] = useState(false);
  const [isUpdatingText, setIsUpdatingText] = useState(false);
  const [isSwitchingModel, setIsSwitchingModel] = useState(false);
  const [showModelConfirm, setShowModelConfirm] = useState(false);
  const [pendingModelType, setPendingModelType] = useState(null);
  // Switch-model popup inputs
  const [switchAvatarUrl, setSwitchAvatarUrl] = useState('');
  const [switchPresenterPresetId, setSwitchPresenterPresetId] = useState('');
  const [switchPresenterPresetLabel, setSwitchPresenterPresetLabel] = useState('');
  const [isLoadingSwitchPresenterPresets, setIsLoadingSwitchPresenterPresets] = useState(false);
  const [switchChartType, setSwitchChartType] = useState('');
  const [switchChartData, setSwitchChartData] = useState('');
  const [switchModelStep, setSwitchModelStep] = useState(1); // 1: chart type, 2: suggestions
  const [switchSuggestions, setSwitchSuggestions] = useState([]);
  const [isSuggestingSwitch, setIsSuggestingSwitch] = useState(false);
  const [switchSelectedIdx, setSwitchSelectedIdx] = useState(-1);
  const [switchSceneContent, setSwitchSceneContent] = useState('');
  const [showAddSceneModal, setShowAddSceneModal] = useState(false);
  const [insertSceneIndex, setInsertSceneIndex] = useState(null);
  const [sceneSuggestions, setSceneSuggestions] = useState([]);
  const [isSuggestingScenes, setIsSuggestingScenes] = useState(false);
  const [newSceneDescription, setNewSceneDescription] = useState('');
  const [newSceneVideoType, setNewSceneVideoType] = useState('Avatar Based');
  const [newSceneAvatarType, setNewSceneAvatarType] = useState('Presenter'); // 'Presenter' | 'Anchor'
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [addSceneStep, setAddSceneStep] = useState(1); // 1: pick model, 2+: flow-specific steps
  const [newSceneChartType, setNewSceneChartType] = useState('');
  const [newSceneChartData, setNewSceneChartData] = useState('');
  const [newSceneDocSummary, setNewSceneDocSummary] = useState('');
  const [isUploadingNewSceneDoc, setIsUploadingNewSceneDoc] = useState(false);
  const [newSceneContent, setNewSceneContent] = useState('');
  const [newSceneSelectedIdx, setNewSceneSelectedIdx] = useState(-1);
  const [newScenePresenterPresetId, setNewScenePresenterPresetId] = useState('');
  const [newScenePresenterPresetLabel, setNewScenePresenterPresetLabel] = useState('');
  const [isLoadingNewScenePresenter, setIsLoadingNewScenePresenter] = useState(false);
  const [newScenePresenterError, setNewScenePresenterError] = useState('');
  const [requiresAvatarPresenterSelection, setRequiresAvatarPresenterSelection] = useState(false);
  const [isSavingReorder, setIsSavingReorder] = useState(false);
  const [isDeletingScene, setIsDeletingScene] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  // Per-scene text include input buffer
  const [textIncludeInput, setTextIncludeInput] = useState('');
  // Script history controls (undo/redo)
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // Regenerate modal state
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenQuery, setRegenQuery] = useState('');
  const [regenModel, setRegenModel] = useState('VEO3'); // 'VEO3' | 'ANCHOR' | 'SORA' | 'PLOTLY'
  const [regenStep, setRegenStep] = useState(1); // 1: pick model, 2: suggestions
  const [regenChartType, setRegenChartType] = useState('');
  const [regenChartData, setRegenChartData] = useState('');
  const [regenDocSummary, setRegenDocSummary] = useState('');
  const [isUploadingRegenDoc, setIsUploadingRegenDoc] = useState(false);
  const [regenSceneContent, setRegenSceneContent] = useState('');
  const [regenSelectedIdx, setRegenSelectedIdx] = useState(-1);
  const [regenManualText, setRegenManualText] = useState('');
const [regenPresenterPresetId, setRegenPresenterPresetId] = useState('');
const [regenPresenterPresetLabel, setRegenPresenterPresetLabel] = useState('');
const [isLoadingRegenPresenter, setIsLoadingRegenPresenter] = useState(false);
const [regenPresenterError, setRegenPresenterError] = useState('');
const [requiresRegenPresenterSelection, setRequiresRegenPresenterSelection] = useState(false);
const [showGenerateSummaryModal, setShowGenerateSummaryModal] = useState(false);
const [generateSummaryPosition, setGenerateSummaryPosition] = useState('');
const [generateSummaryError, setGenerateSummaryError] = useState('');
const [showCustomDescModal, setShowCustomDescModal] = useState(false);
const [customDescDescription, setCustomDescDescription] = useState('');
const [customDescTextarea, setCustomDescTextarea] = useState('');
const [isSavingCustomDesc, setIsSavingCustomDesc] = useState(false);
const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  // Snapshot current scene when entering edit to allow cancel revert
  const [editSnapshot, setEditSnapshot] = useState(null);
  useEffect(() => {
    try {
      if (isEditingScene && Array.isArray(scriptRows) && scriptRows[currentSceneIndex]) {
        const snap = JSON.parse(JSON.stringify(scriptRows[currentSceneIndex]));
        setEditSnapshot(snap);
        setIsEditingAnchorOptions(false);
        setIsEditingAnchorPrompt(false);
      }
    } catch (_) { /* noop */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingScene, currentSceneIndex]);
  useEffect(() => {
    setAdvancedOptionsOpen(false);
  }, [currentSceneIndex]);
useEffect(() => {
  setIsEditingAdvancedStyles(false);
  setIsEditingSceneData(false);
  setIsEditingAnchorPrompt(false);
  setIsEditingOpeningFrame(false);
  setIsEditingClosingFrame(false);
  setIsEditingBackgroundFrame(false);
  setIsEditingAnimationDesc(false);
  setEditedOpeningFrame({});
  setEditedClosingFrame({});
  setEditedBackgroundFrame({});
  setEditedAnimationDesc({});
  advancedStylesBackupRef.current = null;
  sceneDataBackupRef.current = null;
  anchorPromptBackupRef.current = null;
}, [currentSceneIndex]);
  // Chart type confirm (PLOTLY) state
  const [showChartTypeConfirm, setShowChartTypeConfirm] = useState(false);
  const [pendingChartType, setPendingChartType] = useState('');
  const [isUpdatingChartType, setIsUpdatingChartType] = useState(false);
  const [isApplyingChartType, setIsApplyingChartType] = useState(false);
const [isEditingAnchorOptions, setIsEditingAnchorOptions] = useState(false);
const [isEditingAnchorPrompt, setIsEditingAnchorPrompt] = useState(false);
const [isEditingAdvancedStyles, setIsEditingAdvancedStyles] = useState(false);
const [isEditingSceneData, setIsEditingSceneData] = useState(false);
const [isSavingAdvancedStyles, setIsSavingAdvancedStyles] = useState(false);
const [isSavingSceneData, setIsSavingSceneData] = useState(false);
const [isSavingAnchorPrompt, setIsSavingAnchorPrompt] = useState(false);
  // Brand fonts from user brand identity (for font_style dropdown)
const [brandFonts, setBrandFonts] = useState([]);
const combinedFontOptions = useMemo(() => {
  const set = new Set(GOOGLE_FONT_OPTIONS);
  if (Array.isArray(brandFonts)) {
    brandFonts.filter(Boolean).forEach((font) => set.add(font));
  }
  return Array.from(set);
}, [brandFonts]);
const advancedStylesBackupRef = useRef(null);
const sceneDataBackupRef = useRef(null);
const anchorPromptBackupRef = useRef(null);
// Rich text editor state
const [showRichTextEditor, setShowRichTextEditor] = useState(false);
const [selectedShape, setSelectedShape] = useState(null);
const [textEditorContent, setTextEditorContent] = useState('');
const [textEditorFormat, setTextEditorFormat] = useState({
  fontFamily: 'Arial',
  fontSize: 16,
  bold: false,
  italic: false,
  underline: false,
  strikethrough: false,
  align: 'left',
  color: '#000000'
});

  useEffect(() => {
    try {
      const token = localStorage.getItem('token') || '';
      const raw = (token && localStorage.getItem(`brand_assets_analysis:${token}`)) || localStorage.getItem('brand_assets_analysis');
      if (raw) {
        const assets = JSON.parse(raw);
        const bi = assets?.brand_identity || {};
        const fonts = Array.isArray(bi?.fonts) ? bi.fonts.filter(Boolean).map(String) : [];
        setBrandFonts(fonts);
      }
    } catch (_) { /* noop */ }
  }, []);

  // Upload dropdown state (declared early for useEffect)
  const [showUploadDropdown, setShowUploadDropdown] = useState(false);
  const [convertColors, setConvertColors] = useState(true);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const pptxFileInputRef = useRef(null);

  // Close upload dropdown when clicking outside
  useEffect(() => {
    if (!showUploadDropdown) return;
    const handleClickOutside = (e) => {
      if (e.target.closest('.upload-dropdown-container') === null) {
        setShowUploadDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUploadDropdown]);

  // Helper: fetch suggestions for a given model_type and position
  const fetchSceneSuggestions = async (modelType, positionIdx, target = 'add', chartType = null) => {
    try {
      if (target === 'regen') setIsSuggestingRegen(true); else setIsSuggestingScenes(true);
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) { setIsSuggestingScenes(false); return; }
      const sessResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const text = await sessResp.text();
      let json; try { json = JSON.parse(text); } catch(_) { json = {}; }
      if (!sessResp.ok) throw new Error(`user-session/data failed: ${sessResp.status} ${text}`);
      const sd = json?.session_data || json?.session || {};
      const user = json?.user_data || sd?.user_data || sd?.user || {};
      // Preserve ALL fields from session_data, including nested structures
      const sessionForBody = sanitizeSessionSnapshot(sd, sessionId, token);
      const suggestBody = {
        session: sessionForBody,
        user,
        action: target === 'regen' ? 'regenerate' : 'add',
        position: Math.max(0, Number(positionIdx) || 0),
        model_type: modelType,
        document_content: (modelType === 'PLOTLY')
          ? (addSceneStep ? (newSceneDocSummary || '') : (regenDocSummary || ''))
          : ''
      };
      // Add chart_type to request body when model is PLOTLY and chart_type is provided
      if (modelType === 'PLOTLY' && chartType) {
        suggestBody.chart_type = chartType;
      }
      const sugResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/suggest-scenes', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(suggestBody)
      });
      const sugText = await sugResp.text();
      let sug; try { sug = JSON.parse(sugText); } catch(_) { sug = {}; }
      const list = Array.isArray(sug?.suggestions) ? sug.suggestions : [];
      if (target === 'regen') setRegenSuggestions(list); else setSceneSuggestions(list);
    } catch(_) { if (target === 'regen') setRegenSuggestions([]); else setSceneSuggestions([]); }
    finally { if (target === 'regen') setIsSuggestingRegen(false); else setIsSuggestingScenes(false); }
  };
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regenSuggestions, setRegenSuggestions] = useState([]);
  const [isSuggestingRegen, setIsSuggestingRegen] = useState(false);
  const [isEnhancing, setIsEnhancing] = useState(false);
  const [isApplyingKeepDefault, setIsApplyingKeepDefault] = useState(false);
  // Only show 5 scene tabs at a time without scroll
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  // Multiple selection of ref images by URL
  const [selectedRefImages, setSelectedRefImages] = useState([]);
  // Removed template upload in assets picker per requirements
  // Brand assets modal state (logos, icons, uploaded_images, templates, voiceover)
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [assetsData, setAssetsData] = useState({ logos: [], icons: [], uploaded_images: [], templates: [], documents_images: [] });
  const [assetsTab, setAssetsTab] = useState('preset_templates');
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  // Generated images state
  const [generatedImagesData, setGeneratedImagesData] = useState({ generated_images: {}, generated_videos: {} });
  const [isLoadingGeneratedImages, setIsLoadingGeneratedImages] = useState(false);
  const [isLoadingTemplates, setIsLoadingTemplates] = useState(false);
  // Multi-select support for Templates in assets modal
  const [selectedTemplateUrls, setSelectedTemplateUrls] = useState([]);
  const [sessionTemplateAspect, setSessionTemplateAspect] = useState('');
  const [summaryTemplates, setSummaryTemplates] = useState({});
  const [isLoadingSummaryTemplates, setIsLoadingSummaryTemplates] = useState(false);
  const [presenterPresets, setPresenterPresets] = useState({
    VEO3: [],
    ANCHOR: []
  });
  const [isLoadingPresenterPresets, setIsLoadingPresenterPresets] = useState(false);
  const [presenterPresetsError, setPresenterPresetsError] = useState('');
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
  const [pendingDescription, setPendingDescription] = useState('');
  const [descriptionSceneIndex, setDescriptionSceneIndex] = useState(null);
  const [editableSections, setEditableSections] = useState([]);
  const [isNarrationEditing, setIsNarrationEditing] = useState(false);
  const [pendingNarration, setPendingNarration] = useState('');
  const [narrationSceneIndex, setNarrationSceneIndex] = useState(null);
  const [isSavingNarration, setIsSavingNarration] = useState(false);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  const [isTextToBeIncludedEditing, setIsTextToBeIncludedEditing] = useState(false);
  const [pendingTextToBeIncluded, setPendingTextToBeIncluded] = useState([]);
  const [textToBeIncludedSceneIndex, setTextToBeIncludedSceneIndex] = useState(null);
  const [isChartTypeEditing, setIsChartTypeEditing] = useState(false);
  const [pendingChartTypeValue, setPendingChartTypeValue] = useState('');
  const [chartTypeSceneIndex, setChartTypeSceneIndex] = useState(null);
  const [isRegeneratingChart, setIsRegeneratingChart] = useState(false);
  const assetsUploadInputRef = useRef(null);
  const [pendingUploadType, setPendingUploadType] = useState('');
  // Upload popup modal state
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [uploadPopupTab, setUploadPopupTab] = useState('image'); // 'image' or 'pptx'
  const assetImageUploadRef = useRef(null);
  const assetPptxUploadRef = useRef(null);
  // Selected asset in Choose Asset modal
  const [selectedAssetUrl, setSelectedAssetUrl] = useState('');
  const normalizedTemplateAssets = useMemo(
    () => flattenTemplateAssets(assetsData.templates),
    [assetsData.templates]
  );
  const templateAspectOptions = useMemo(() => {
    const seen = new Set();
    normalizedTemplateAssets.forEach(item => {
      seen.add(item.aspect || 'Unspecified');
    });
    return Array.from(seen);
  }, [normalizedTemplateAssets]);
  const currentSceneModelUpper = useMemo(() => {
    if (!Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) return '';
    const scene = scriptRows[currentSceneIndex];
    return String(scene?.model || scene?.mode || '').toUpperCase();
  }, [scriptRows, currentSceneIndex]);
  // Always filter templates by aspect ratio from script
  const effectiveTemplateAspect = useMemo(() => {
    if (sessionTemplateAspect) return sessionTemplateAspect;
    // Always use aspect ratio from script for all models
    const prioritized = templateAspectOptions.find(opt => opt && opt !== 'Unspecified');
    return prioritized || templateAspectOptions[0] || '';
  }, [sessionTemplateAspect, templateAspectOptions]);
  const matchesAspect = (aspectValue, targetAspect) => {
    if (!targetAspect) return true;
    const normalizedTarget = normalizeTemplateAspectLabel(targetAspect);
    const normalizedValue = normalizeTemplateAspectLabel(
      typeof aspectValue === 'string' ? aspectValue : ''
    );
    // Be lenient: if a target aspect exists but the value is unspecified/missing,
    // allow it to pass so uploaded assets without explicit aspect still show.
    if (!normalizedTarget || normalizedTarget === 'Unspecified') return true;
    if (!normalizedValue || normalizedValue === 'Unspecified') return true;
    return normalizedValue === normalizedTarget;
  };
  const filteredTemplateAssets = useMemo(() => {
    if (!Array.isArray(normalizedTemplateAssets)) return [];
    if (!effectiveTemplateAspect) return normalizedTemplateAssets;
    return normalizedTemplateAssets.filter((item) =>
      matchesAspect(item?.aspect, effectiveTemplateAspect)
    );
  }, [normalizedTemplateAssets, effectiveTemplateAspect]);
  const templateLookupByUrl = useMemo(() => {
    const map = new Map();
    filteredTemplateAssets.forEach((item) => {
      if (item?.imageUrl) map.set(item.imageUrl, item);
    });
    normalizedTemplateAssets.forEach((item) => {
      if (item?.imageUrl && !map.has(item.imageUrl)) {
        map.set(item.imageUrl, item);
      }
    });
    return map;
  }, [normalizedTemplateAssets, filteredTemplateAssets]);
  const buildBackgroundImagePayload = (urls = []) => {
    const seen = new Set();
    const payload = [];
    (Array.isArray(urls) ? urls : [urls]).forEach((url) => {
      if (typeof url !== 'string') return;
      const trimmed = url.trim();
      if (!trimmed || seen.has(trimmed)) return;
      seen.add(trimmed);
      const templateEntry = templateLookupByUrl.get(trimmed);
      const rawTemplate = templateEntry?.raw || {};
      const templateId =
        templateEntry?.id ||
        rawTemplate?.template_id ||
        rawTemplate?.templateId ||
        rawTemplate?.id ||
        '';
      payload.push({
        image_url: trimmed,
        template_id: templateId ? String(templateId) : ''
      });
    });
    return payload;
  };
  const sendUpdateSceneVisualWithTemplates = async (sceneNumber, templateUrls = []) => {
    try {
      const background_image = buildBackgroundImagePayload(templateUrls);
      if (background_image.length === 0) return;
      const { session, user } = await buildSessionAndUserForScene();
      const token = localStorage.getItem('token') || '';
      const formattedUser = formatUserForVisual(user, token);
      const formattedSession = formatSessionForVisual(
        session,
        session?.session_id,
        session?.user_id
      );
      const payload = {
        user: formattedUser,
        session: formattedSession,
        scene_number: Number(sceneNumber) || 0,
        background_image
      };
      await fetch(
        'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-scene-visual',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
    } catch (err) {
      console.error('update-scene-visual failed:', err);
    }
  };
  
  // Load brand assets when modal opens
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
          console.error('Failed to load brand assets:', err);
          setAssetsData({ logos: [], icons: [], uploaded_images: [], templates: [], documents_images: [] });
          setIsAssetsLoading(false);
        }
      }
    })();
    return () => { cancelled = true; setIsAssetsLoading(false); };
  }, [showAssetsModal]);

  useEffect(() => {
    if (!showAssetsModal || !['preset_templates', 'uploaded_templates'].includes(assetsTab)) {
      setIsLoadingTemplates(false);
      return;
    }
    let cancelled = false;
    setIsLoadingTemplates(true);
    (async () => {
      try {
        const token = (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
        const sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) || '';
        if (!token || !sessionId) {
          if (!cancelled) {
            setSessionTemplateAspect('');
            setIsLoadingTemplates(false);
          }
          return;
        }
        const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: token, session_id: sessionId })
        });
        const text = await resp.text();
        let data;
        try { data = JSON.parse(text); } catch (_) { data = null; }
        if (cancelled) return;
        if (!resp.ok || !data || typeof data !== 'object') {
          if (!cancelled) {
            setSessionTemplateAspect('');
            setIsLoadingTemplates(false);
          }
          return;
        }
        const rawAspect = extractAspectRatioFromSessionPayload(data);
        const normalizedAspect = normalizeTemplateAspectLabel(rawAspect);
        if (!cancelled) {
          if (normalizedAspect && normalizedAspect !== 'Unspecified') {
            setSessionTemplateAspect(normalizedAspect);
          } else {
            setSessionTemplateAspect('');
          }
          // Add a small delay to ensure templates are filtered before hiding loader
          setTimeout(() => {
            if (!cancelled) setIsLoadingTemplates(false);
          }, 100);
        }
      } catch (err) {
        if (!cancelled) {
          setSessionTemplateAspect('');
          setIsLoadingTemplates(false);
          try { console.warn('Failed to load session aspect ratio:', err); } catch (_) { /* noop */ }
        }
      }
    })();
    return () => { cancelled = true; setIsLoadingTemplates(false); };
  }, [showAssetsModal, assetsTab]);

  // Fetch generated images when the generated_images tab is selected
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
          setGeneratedImagesData({
            generated_images: data.generated_images || {},
            generated_videos: data.generated_videos || {}
          });
          setIsLoadingGeneratedImages(false);
        }
      } catch (err) {
        if (!cancelled) {
          setGeneratedImagesData({ generated_images: {}, generated_videos: {} });
          setIsLoadingGeneratedImages(false);
          try { console.warn('Failed to load generated images:', err); } catch (_) { /* noop */ }
        }
      }
    })();
    return () => { cancelled = true; setIsLoadingGeneratedImages(false); };
  }, [showAssetsModal, assetsTab]);
  useEffect(() => {
    if (!enablePresenterOptions) {
      setPresenterPresets({ VEO3: [], ANCHOR: [] });
      setPresenterPresetsError('');
      setIsLoadingPresenterPresets(false);
      return;
    }
    const scene =
      Array.isArray(scriptRows) && scriptRows[currentSceneIndex]
        ? scriptRows[currentSceneIndex]
        : null;
    const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
    if (modelUpper !== 'VEO3' && modelUpper !== 'ANCHOR') {
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
        const { rawSession, rawUser } = await buildSessionAndUserForScene();
        if (ignore) return;
        const token = localStorage.getItem('token') || '';
        const userId =
          rawUser?.id ||
          rawUser?.user_id ||
          rawUser?._id ||
          token;
        const rawAspect =
          extractAspectRatioFromSessionPayload({
            session_data: rawSession,
            session: rawSession,
            user_data: rawUser,
            user: rawUser
          }) || sessionTemplateAspect;
        const normalizedAspect = normalizeTemplateAspectLabel(rawAspect);
        const aspectParam = normalizedAspect || '';
        const modeParam = modelUpper === 'VEO3' ? 'veo3_presets' : 'anchor_presets';
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
              return {
                option,
                preset_id: String(presetId),
                anchor_id: anchorId ? String(anchorId) : undefined,
                sample_video: rawPreviewUrl || '',
                sample_video_type: sampleVideoType
              };
            }
            return null;
          })
          .filter(Boolean);
        if (!ignore) {
          setPresenterPresets((prev) => ({
            ...prev,
            [modelUpper]: normalizedList
          }));
        }
      } catch (err) {
        if (!ignore) {
          console.warn('Failed to load presenter presets:', err);
          setPresenterPresets((prev) => ({
            ...prev,
            [modelUpper]: []
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
  }, [enablePresenterOptions, scriptRows, currentSceneIndex, sessionTemplateAspect]);

  useEffect(() => {
    if (!enablePresenterOptions) {
      setSelectedPresenterPreset('');
      setPresenterPresetOriginal('');
      setPresenterPresetDirty(false);
      return;
    }
    const scene =
      Array.isArray(scriptRows) && scriptRows[currentSceneIndex]
        ? scriptRows[currentSceneIndex]
        : null;
    if (!scene) {
      setSelectedPresenterPreset('');
      setPresenterPresetOriginal('');
      setPresenterPresetDirty(false);
      return;
    }
    const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
    if (modelUpper !== 'VEO3' && modelUpper !== 'ANCHOR') {
      setSelectedPresenterPreset('');
      setPresenterPresetOriginal('');
      setPresenterPresetDirty(false);
      return;
    }
    const list = Array.isArray(presenterPresets[modelUpper]) ? presenterPresets[modelUpper] : [];
    
    const presenterOpts = scene?.presenter_options || scene?.presenterOptions || {};
    const scenePresetId = presenterOpts?.preset_id || presenterOpts?.presetId || '';
    const sceneAnchorId = presenterOpts?.anchor_id || presenterOpts?.anchorId || '';
    const scenePreset = presenterOpts?.preset || ''; // For ANCHOR, this is the anchor_id
    const scenePresetLabel = presenterOpts?.option || presenterOpts?.name || presenterOpts?.label || presenterOpts?.title || '';
    
    console.log(`[Scene Settings] ${modelUpper} - Full scene data:`, {
      scene,
      presenterOpts,
      scenePresetId,
      sceneAnchorId,
      scenePreset,
      scenePresetLabel,
      availablePresets: list.map(p => ({
        preset_id: p.preset_id,
        anchor_id: p.anchor_id,
        anchorId: p.anchorId,
        option: p.option
      }))
    });
    
    let resolvedValue = '';
    
    // For ANCHOR model: Compare presenter_options.preset_id with anchor_id from preset list
    // The preset_id stored in script is the anchor_id that was saved
    if (modelUpper === 'ANCHOR') {
      // For ANCHOR, preset_id in presenter_options IS the anchor_id
      // We need to find the preset in the list where anchor_id matches this preset_id
      let valueToMatch = '';
      
      // Priority 1: Check anchor_id field (explicitly saved)
      if (sceneAnchorId) {
        valueToMatch = String(sceneAnchorId).trim();
      }
      // Priority 2: Check preset_id (for ANCHOR, this is the anchor_id sent to API)
      else if (scenePresetId) {
        valueToMatch = String(scenePresetId).trim();
      }
      // Priority 3: Check preset field
      else if (scenePreset) {
        valueToMatch = String(scenePreset).trim();
      }
      
      console.log('[Scene Settings] ANCHOR - Matching process:', {
        sceneAnchorId,
          scenePresetId,
        scenePreset,
        valueToMatch,
        listLength: list.length,
        availablePresets: list.map(p => ({
          preset_id: p.preset_id,
          anchor_id: p.anchor_id,
          anchorId: p.anchorId,
          option: p.option
        }))
      });
      
      if (valueToMatch && list.length > 0) {
        const valueToMatchNormalized = String(valueToMatch).trim().toLowerCase().replace(/\s+/g, '');
        
        // Find preset where anchor_id matches the value from script
        const matchByAnchorId = list.find((item) => {
          const itemAnchorId = String(item?.anchor_id || item?.anchorId || '').trim().toLowerCase().replace(/\s+/g, '');
          const matches = itemAnchorId === valueToMatchNormalized;
          
          if (matches) {
            console.log('[Scene Settings] ANCHOR - ✓✓✓ MATCH FOUND:', {
              scriptValue: valueToMatch,
              scriptValueNormalized: valueToMatchNormalized,
              presetAnchorId: item.anchor_id,
              presetAnchorIdNormalized: itemAnchorId,
              presetOption: item.option,
              presetPresetId: item.preset_id
            });
          }
          
          return matches;
        });
        
        if (matchByAnchorId) {
          // Use the matched preset's identifier for dropdown
          // Dropdown uses: po?.preset_id != null ? String(po.preset_id) : String(po.option || '')
          resolvedValue = matchByAnchorId.preset_id != null 
            ? String(matchByAnchorId.preset_id)
            : String(matchByAnchorId.option || '');
          
          console.log('[Scene Settings] ANCHOR - ✓✓✓ SUCCESS: Resolved preset value:', {
            resolvedValue,
            matchedPreset: matchByAnchorId.option,
            matchedPresetId: matchByAnchorId.preset_id,
            matchedAnchorId: matchByAnchorId.anchor_id
        });
      } else {
          console.error('[Scene Settings] ANCHOR - ✗✗✗ NO MATCH: Could not find preset with matching anchor_id:', {
            valueToMatch,
            valueToMatchNormalized,
            availableAnchorIds: list.map(p => {
              const normalized = String(p?.anchor_id || p?.anchorId || '').trim().toLowerCase().replace(/\s+/g, '');
              return {
                preset_id: p.preset_id,
                anchor_id: p.anchor_id,
                anchorId: p.anchorId,
                option: p.option,
                normalized,
                matches: normalized === valueToMatchNormalized
              };
            })
          });
          // DO NOT set resolvedValue - let it stay empty so we don't default to first preset
        }
      } else {
        if (!valueToMatch) {
          console.warn('[Scene Settings] ANCHOR - No preset_id/anchor_id found in presenter_options:', {
            presenterOpts,
            sceneAnchorId,
            scenePresetId,
            scenePreset
          });
        }
        if (list.length === 0) {
          console.warn('[Scene Settings] ANCHOR - Preset list is empty, cannot match');
        }
        // DO NOT set resolvedValue - let it stay empty so we don't default to first preset
      }
    }
    
    // For VEO3 model: Compare presenter_options.preset with preset_id from preset list
    // The preset field in presenter_options should contain the preset_id that matches preset_id in the preset list
    if (modelUpper === 'VEO3' && !resolvedValue) {
      let valueToMatch = '';
      
      // Priority 1: Check preset field (this should contain the preset_id value)
      if (scenePreset) {
        valueToMatch = String(scenePreset).trim();
      }
      // Priority 2: Check preset_id field as fallback
      else if (scenePresetId) {
        valueToMatch = String(scenePresetId).trim();
      }
      
      console.log('[Scene Settings] VEO3 - Matching process:', {
        scenePreset,
        scenePresetId,
        valueToMatch,
        listLength: list.length,
        availablePresets: list.map(p => ({
          preset_id: p.preset_id,
          option: p.option
        }))
      });
      
      if (valueToMatch && list.length > 0) {
        const valueToMatchStr = String(valueToMatch).trim();
        
        // Find preset where preset_id matches the preset value from script
        // Simple direct string comparison: presenter_options.preset === preset.preset_id
        const matchByPresetId = list.find((item) => {
          const itemPresetId = item?.preset_id;
          if (itemPresetId == null) return false;
          
          // Direct string comparison
          const matches = String(itemPresetId).trim() === valueToMatchStr;
          
          if (matches) {
            console.log('[Scene Settings] VEO3 - ✓✓✓ MATCH FOUND:', {
              scriptPresetValue: valueToMatch,
              presetPresetId: item.preset_id,
              presetOption: item.option
            });
          }
          
          return matches;
        });
        
        if (matchByPresetId) {
          // Use the matched preset's identifier for dropdown
          // Dropdown uses: po?.preset_id != null ? String(po.preset_id) : String(po.option || '')
          resolvedValue = matchByPresetId.preset_id != null 
            ? String(matchByPresetId.preset_id)
            : String(matchByPresetId.option || '');
          
          console.log('[Scene Settings] VEO3 - ✓✓✓ SUCCESS: Resolved preset value:', {
            resolvedValue,
            matchedPreset: matchByPresetId.option,
            matchedPresetId: matchByPresetId.preset_id,
            scriptPresetValue: valueToMatch
          });
        } else {
          // Fallback: Try matching by option text if preset_id match failed
          // Sometimes the script might have the option text stored in preset field
          const matchByOption = list.find((item) => {
            const itemOption = item?.option;
            if (!itemOption) return false;
            return String(itemOption).trim() === valueToMatchStr;
          });
          
          if (matchByOption) {
            resolvedValue = matchByOption.preset_id != null 
              ? String(matchByOption.preset_id)
              : String(matchByOption.option || '');
            
            console.log('[Scene Settings] VEO3 - ✓✓✓ MATCH FOUND BY OPTION:', {
              resolvedValue,
              matchedPreset: matchByOption.option,
              matchedPresetId: matchByOption.preset_id,
              scriptPresetValue: valueToMatch
            });
          } else {
            console.error('[Scene Settings] VEO3 - ✗✗✗ NO MATCH: Could not find preset with matching preset_id or option:', {
              scriptPresetValue: valueToMatch,
              availablePresets: list.map(p => ({
                preset_id: p.preset_id,
                option: p.option,
                matchesPresetId: String(p.preset_id || '').trim() === valueToMatchStr,
                matchesOption: String(p.option || '').trim() === valueToMatchStr
              }))
            });
            // DO NOT set resolvedValue - let it stay empty so we don't default to first preset
          }
        }
      } else {
        if (!valueToMatch) {
          console.warn('[Scene Settings] VEO3 - No preset or preset_id found in presenter_options:', {
            presenterOpts,
            scenePreset,
            scenePresetId
          });
        }
        if (list.length === 0) {
          console.warn('[Scene Settings] VEO3 - Preset list is empty, cannot match');
        }
        // DO NOT set resolvedValue - let it stay empty so we don't default to first preset
      }
    }
    
    // For other non-ANCHOR models (fallback), use standard logic
    if (modelUpper !== 'ANCHOR' && modelUpper !== 'VEO3' && !resolvedValue) {
      if (scenePresetId) {
        resolvedValue = String(scenePresetId);
      } else if (scenePresetLabel) {
        // Try to find preset by option/label in the list
        const matchByLabel = list.find((item) => {
          const itemOption = String(item?.option || '').trim();
          return itemOption === String(scenePresetLabel).trim();
        });
        if (matchByLabel) {
          resolvedValue = String(matchByLabel.preset_id || matchByLabel.option || '');
      } else {
          // If not found in list, use the label directly
          resolvedValue = String(scenePresetLabel);
        }
      } else if (list.length > 0) {
        // Only default to first preset if we truly have no preset data
        resolvedValue = String(list[0].preset_id || list[0].option || '');
      }
    }
    
    // For ANCHOR: Only default to first preset if we have NO preset data at all in the script
    if (modelUpper === 'ANCHOR' && !resolvedValue && !scenePresetId && !sceneAnchorId && !scenePreset && list.length > 0) {
      console.log('[Scene Settings] ANCHOR - No preset data in script, defaulting to first preset');
      resolvedValue = String(list[0].preset_id || list[0].option || '');
    }
    
    // For VEO3: Only default to first preset if we have NO preset data at all in the script
    if (modelUpper === 'VEO3' && !resolvedValue && !scenePreset && !scenePresetId && list.length > 0) {
      console.log('[Scene Settings] VEO3 - No preset data in script, defaulting to first preset');
      resolvedValue = String(list[0].preset_id || list[0].option || '');
    }
    
    const normalizedResolved = resolvedValue ? String(resolvedValue) : '';
    
    console.log(`[Scene Settings] ${modelUpper} - Final resolved value:`, {
      resolvedValue,
      normalizedResolved,
      scenePreset,
      scenePresetId,
      listLength: list.length,
      willSetSelected: normalizedResolved
    });
    
    setSelectedPresenterPreset(normalizedResolved);
    setPresenterPresetOriginal(normalizedResolved);
    setPresenterPresetDirty(false);
  }, [enablePresenterOptions, scriptRows, currentSceneIndex, presenterPresets]);

  const handlePresenterPresetChange = (value) => {
    const normalizedValue = value != null ? String(value) : '';
    setSelectedPresenterPreset(normalizedValue);
    setPresenterPresetDirty(normalizedValue !== presenterPresetOriginal);
  };

  const handleConfirmPresenterPresetSave = async () => {
    if (!pendingPresenterPresetId) return;
    setIsSavingPresenterPreset(true);
    try {
      const sessionId = localStorage.getItem('session_id') || '';
      const token = localStorage.getItem('token') || '';
      const { rawSession, rawUser } = await buildSessionAndUserForScene();
      const sanitizedSession = sanitizeSessionSnapshot(rawSession, sessionId, token);
      const normalizedUser = normalizeUserSnapshot(rawUser, token);
      const scene =
        Array.isArray(scriptRows) && scriptRows[currentSceneIndex]
          ? scriptRows[currentSceneIndex]
          : null;
      const sceneNumber = scene?.scene_number ?? currentSceneIndex + 1;
      const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
      const list = Array.isArray(presenterPresets[modelUpper]) ? presenterPresets[modelUpper] : [];
      const selectedPreset =
        list.find(
          (item) =>
            String(item?.preset_id || item?.option || '') === String(pendingPresenterPresetId)
        ) || {};
      // For ANCHOR models, use anchor_id as preset_id in the request body
      const presetIdForRequest = modelUpper === 'ANCHOR' && selectedPreset?.anchor_id
        ? String(selectedPreset.anchor_id)
        : String(pendingPresenterPresetId || '');
      const payload = {
        user: normalizedUser,
        session: sanitizedSession,
        scene_number: sceneNumber,
        preset_id: presetIdForRequest
      };
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
        const rows = [...(scriptRows || [])];
        const presenterOpts = {
          ...(scene.presenter_options || {}),
          option: savedLabel,
          preset_id: pendingPresenterPresetId
        };
        // For VEO3 models, also save preset_id to the preset field for proper matching
        if (modelUpper === 'VEO3') {
          presenterOpts.preset = String(pendingPresenterPresetId);
        }
        // For ANCHOR models, include anchor_id from the preset
        if (modelUpper === 'ANCHOR' && savedPreset?.anchor_id) {
          presenterOpts.anchor_id = String(savedPreset.anchor_id);
        }
        const updated = {
          ...scene,
          presenter_options: presenterOpts
        };
        rows[currentSceneIndex] = updated;
        setScriptRows(rows);
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
  useEffect(() => {
    const scene =
      Array.isArray(scriptRows) && scriptRows[currentSceneIndex]
        ? scriptRows[currentSceneIndex]
        : null;
    const desc = scene?.description || '';
    setPendingDescription(desc);
    setDescriptionSceneIndex(currentSceneIndex);
    setIsDescriptionEditing(false);
  }, [scriptRows, currentSceneIndex]);
  useEffect(() => {
    if (!['preset_templates', 'uploaded_templates'].includes(assetsTab)) return;
    try {
      const aspectSummary = Array.from(
        new Set(
          (filteredTemplateAssets || []).map((item) =>
            normalizeTemplateAspectLabel(item?.aspect || '')
          )
        )
      );
      console.log('[templates] normalized assets', {
        filter: effectiveTemplateAspect || 'All',
        total: normalizedTemplateAssets.length,
        shown: filteredTemplateAssets.length,
        aspectsShown: aspectSummary,
        templates: filteredTemplateAssets
      });
    } catch (_) { /* noop */ }
  }, [assetsTab, normalizedTemplateAssets, filteredTemplateAssets, effectiveTemplateAspect]);
  // Kebab menu inline component for header actions
  const KebabMenu = ({
    canUndo,
    canRedo,
    onUndo,
    onRedo,
    onDelete,
    onRegenerate,
    onEdit,
    onGenerateSummary,
    onSwitchAnchor,
    onSwitchAvatar,
    onSwitchInfographic,
    onSwitchFinancial,
    isDeleting,
    hasScenes,
    isSwitching,
    isGeneratingSummary,
    showSwitchAnchor = true,
    showSwitchAvatar = true,
    showSwitchInfographic = true,
    showSwitchFinancial = true
  }) => {
    const [open, setOpen] = React.useState(false);
    const ref = React.useRef(null);
    React.useEffect(() => {
      const onDoc = (e) => { if (open && ref.current && !ref.current.contains(e.target)) setOpen(false); };
      document.addEventListener('mousedown', onDoc);
      return () => document.removeEventListener('mousedown', onDoc);
    }, [open]);
    return (
      <div ref={ref} className="relative">
        <button onClick={() => setOpen(v => !v)} className="inline-flex items-center justify-center w-9 h-9 rounded-lg border bg-white hover:bg-gray-50" title="More">
          <MoreHorizontal className="w-5 h-5" />
        </button>
        {open && (
          <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-200 rounded-lg shadow-xl z-20 overflow-hidden">
            <div className="py-1">
              <button
                onClick={() => {
                  setOpen(false);
                  if (!isGeneratingSummary && onGenerateSummary) onGenerateSummary();
                }}
                disabled={!hasScenes || isGeneratingSummary}
                className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${
                  (!hasScenes || isGeneratingSummary)
                    ? 'text-gray-400 cursor-not-allowed'
                    : 'hover:bg-gray-50'
                }`}
              >
                <FileText className="w-4 h-4 text-[#13008B]" />
                <span>Generate Summary</span>
              </button>
              <button onClick={() => { setOpen(false); onRegenerate(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                <RefreshCcw className="w-4 h-4 text-[#13008B]" />
                <span>Regenerate Scene</span>
              </button>
              <button onClick={() => { setOpen(false); onEdit && onEdit(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                <CiPen className="w-4 h-4 text-[#13008B]" />
                <span>Edit Scenes</span>
              </button>
              <div className="my-1 h-px bg-gray-100" />
              {(showSwitchAnchor || showSwitchAvatar || showSwitchInfographic || showSwitchFinancial) && (
                <>
                  <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-gray-500">Switch Model</div>
                  {showSwitchAnchor && (
                    <button
                      onClick={() => {
                        setOpen(false);
                        onSwitchAnchor && onSwitchAnchor();
                      }}
                      disabled={isSwitching || !hasScenes}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${
                        !hasScenes || isSwitching ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'
                      }`}
                    >
                      <span>Anchor</span>
                    </button>
                  )}
                  {showSwitchAvatar && (
                    <button onClick={() => { setOpen(false); onSwitchAvatar && onSwitchAvatar(); }} disabled={isSwitching || !hasScenes} className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${(!hasScenes || isSwitching) ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                      <span>Avatar Based</span>
                    </button>
                  )}
                  {showSwitchInfographic && (
                    <button onClick={() => { setOpen(false); onSwitchInfographic && onSwitchInfographic(); }} disabled={isSwitching || !hasScenes} className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${(!hasScenes || isSwitching) ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                      <span>Infographic</span>
                    </button>
                  )}
                  {showSwitchFinancial && (
                    <button onClick={() => { setOpen(false); onSwitchFinancial && onSwitchFinancial(); }} disabled={isSwitching || !hasScenes} className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${(!hasScenes || isSwitching) ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                      <span>Financial</span>
                    </button>
                  )}
                </>
              )}
              <div className="my-1 h-px bg-gray-100" />
              <button onClick={() => { setOpen(false); onUndo(); }} disabled={!canUndo} className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${canUndo ? 'hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}>
                <RefreshCcw className="w-4 h-4 rotate-180" />
                <span>Undo</span>
              </button>
              <button onClick={() => { setOpen(false); onRedo(); }} disabled={!canRedo} className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${canRedo ? 'hover:bg-gray-50' : 'text-gray-400 cursor-not-allowed'}`}>
                <RefreshCcw className="w-4 h-4" />
                <span>Redo</span>
              </button>
              <div className="my-1 h-px bg-gray-100" />
              <button onClick={() => { setOpen(false); onDelete(); }} disabled={isDeleting || !hasScenes} className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${(!hasScenes || isDeleting) ? 'text-gray-400 cursor-not-allowed' : 'text-red-700 hover:bg-red-50'}`}>
                <Trash2 className="w-4 h-4" />
                <span>Delete Scene</span>
              </button>
            </div>
          </div>
        )}
  {showPresenterSaveConfirm && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
      <div className="w-[92%] max-w-md rounded-lg bg-white p-5 shadow-xl">
        <h3 className="text-lg font-semibold text-[#13008B]">Save Presenter Option?</h3>
        <div className="mt-3 space-y-1 text-sm text-gray-700">
          <p>
            Selected preset:{' '}
            <span className="font-medium text-gray-900">
              {pendingPresenterPresetLabel || 'Unknown'}
            </span>
          </p>
          <p>This will update the presenter preset for the current scene.</p>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            onClick={() => {
              if (isSavingPresenterPreset) return;
              setShowPresenterSaveConfirm(false);
              setPendingPresenterPresetId('');
              setPendingPresenterPresetLabel('');
            }}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isSavingPresenterPreset}
          >
            Cancel
          </button>
          <button
            onClick={handleConfirmPresenterPresetSave}
            className="rounded-lg bg-[#13008B] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-[#9aa0d0]"
            disabled={isSavingPresenterPreset}
          >
            {isSavingPresenterPreset ? 'Saving…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )}

  {isSavingPresenterPreset && !showPresenterSaveConfirm && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
      <div className="flex items-center gap-3 rounded-lg bg-white px-6 py-4 shadow-xl">
        <div className="h-6 w-6 animate-spin rounded-full border-4 border-[#13008B] border-t-transparent" />
        <span className="text-sm font-medium text-gray-800">Saving presenter option…</span>
      </div>
    </div>
  )}
 
  {isSwitchingModel && (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/40">
      <div className="flex items-center gap-3 rounded-lg bg-white px-6 py-4 shadow-xl">
        <span className="h-6 w-6 animate-spin rounded-full border-4 border-[#13008B] border-t-transparent" />
        <span className="text-sm font-medium text-gray-800">Creating session…</span>
      </div>
    </div>
  )}

  {showGenerateSummaryModal && (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <h3 className="text-lg font-semibold text-[#13008B]">Generate Summary</h3>
        <p className="mt-2 text-sm text-gray-600">
          Choose the scene position (1-based) to generate a summary for. The first scene is position 1.
        </p>
        <div className="mt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Scene Position
          </label>
          <input
            type="number"
            min="1"
            max={Math.max(1, Array.isArray(scriptRows) ? scriptRows.length : 1)}
            value={generateSummaryPosition}
            onChange={(e) => setGenerateSummaryPosition(e.target.value)}
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#13008B] focus:outline-none focus:ring-2 focus:ring-[#13008B]/20"
            disabled={isGeneratingSummary}
          />
        </div>
        {generateSummaryError && (
          <div className="mt-3 text-sm text-red-600">{generateSummaryError}</div>
        )}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={closeGenerateSummaryPrompt}
            disabled={isGeneratingSummary}
            className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70"
          >
            Cancel
          </button>
          <button
            onClick={handleGenerateSummary}
            disabled={isGeneratingSummary}
            className="inline-flex items-center gap-2 rounded-lg bg-[#13008B] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-[#9aa0d0]"
          >
            {isGeneratingSummary && (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
            )}
            <span>{isGeneratingSummary ? 'Generating…' : 'Generate'}</span>
          </button>
        </div>
      </div>
    </div>
  )}

      </div>
    );
  };
  // Lightbox for zooming a reference image fullscreen
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState('');
  const openLightbox = (url) => {
    try {
      setLightboxUrl(url || '');
      setIsImageLightboxOpen(!!url);
    } catch (_) { /* noop */ }
  };
  // Image upload & folder picker
  const imageFileInputRef = useRef(null);
  const [isFolderPickerOpen, setIsFolderPickerOpen] = useState(false);
  const [folderImageCandidates, setFolderImageCandidates] = useState([]);
  const [selectedFolderImages, setSelectedFolderImages] = useState([]);
  const [isLoadingFolderImages, setIsLoadingFolderImages] = useState(false);
  const [folderPickerError, setFolderPickerError] = useState('');
  // Scene image upload states (avatar or reference images)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isUploadingSceneImages, setIsUploadingSceneImages] = useState(false);
  // Avatar selection/upload state
  const [avatarOptions, setAvatarOptions] = useState([]);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const avatarFileInputRef = useRef(null);
  const [brandAssetsAvatars, setBrandAssetsAvatars] = useState([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  const [isSavingAvatar, setIsSavingAvatar] = useState(false);
  const [showAvatarUploadPopup, setShowAvatarUploadPopup] = useState(false);
  const [avatarUploadFiles, setAvatarUploadFiles] = useState([]);
  const [isUploadingAvatarFiles, setIsUploadingAvatarFiles] = useState(false);
  const avatarUploadFileInputRef = useRef(null);
  const presetAvatars = useMemo(
    () => [
      'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/1.png',
      'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/2.png',
      'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/3.png',
      'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/4.png',
      'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/5.png',
      'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/6.png',
      'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/7.png'
    ],
    []
  );

  // Helpers for session-scoped localStorage keys
  const getSid = () => {
    try { return localStorage.getItem('session_id') || ''; } catch (_) { return ''; }
  };
  const scopedKey = (base) => {
    const sid = getSid();
    return sid ? `${base}:${sid}` : base;
  };

  // Persist per-scene ref images across modal closes and reloads
  const readSceneRefMap = () => {
    try {
      const raw = localStorage.getItem(scopedKey('scene_ref_images'));
      const obj = raw ? JSON.parse(raw) : {};
      return obj && typeof obj === 'object' ? obj : {};
    } catch (_) { return {}; }
  };
  const writeSceneRefMap = (map) => {
    try { localStorage.setItem(scopedKey('scene_ref_images'), JSON.stringify(map || {})); } catch (_) { /* noop */ }
  };
  const updateRefMapForScene = (sceneNumber, images) => {
    try {
      const sn = Number(sceneNumber);
      if (!sn || Number.isNaN(sn)) return;
      const filtered = filterImageUrls(Array.isArray(images) ? images : []).slice(0, 3);
      const map = readSceneRefMap();
      if (filtered.length > 0) map[sn] = filtered; else delete map[sn];
      writeSceneRefMap(map);
      try { console.log('[refs] Saved ref_image for scene', sn, filtered); } catch (_) { /* noop */ }
    } catch (_) { /* noop */ }
  };
  const applyPersistedRefsToRows = (rows) => {
    try {
      const map = readSceneRefMap();
      const applied = [];
      const outRows = (Array.isArray(rows) ? rows : []).map((r) => {
        const sn = r?.scene_number;
        // Only apply persisted refs if the API row doesn't have ref_image already
        // This ensures API responses (e.g., from update-text) take precedence over localStorage
        const hasApiRefs = Array.isArray(r?.ref_image) && r.ref_image.length > 0;
        if (!hasApiRefs && sn != null && Array.isArray(map[sn])) {
          const imgs = filterImageUrls(map[sn]).slice(0, 3);
          applied.push({ scene_number: sn, ref_image: imgs });
          return { ...r, ref_image: imgs };
        }
        return r;
      });
      if (applied.length > 0) {
        try { console.log('[refs] Restored ref_image from storage:', applied); } catch (_) { /* noop */ }
      }
      return outRows;
    } catch (_) { return rows; }
  };
  // Upload images with flexible folder targeting (folder_url or user_id)
  // If user_id provided: uploads to user's uploaded_images folder
  // If folder_url provided: uploads to specified folder
  // One of user_id or folder_url must be provided
  const uploadImagesToFolder = async (files, folderUrl) => {
    if (!Array.isArray(files) || files.length === 0) return [];
    const form = new FormData();
    const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';
    if (folderUrl && typeof folderUrl === 'string' && folderUrl.trim().length > 0) {
      form.append('folder_url', folderUrl);
    } else if (token) {
      form.append('user_id', token);
    } else {
      throw new Error('Missing folder_url or user_id for image upload');
    }
    for (const f of files) form.append('files', f);
    const endpoint = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/images/upload';
    const resp = await fetch(endpoint, { method: 'POST', body: form });
    const text = await resp.text();
    let data; try { data = JSON.parse(text); } catch (_) { data = text; }
    if (!resp.ok) throw new Error(`images/upload failed: ${resp.status} ${text}`);

    // Extract URLs from various possible response shapes
    const urls = [];
    const pushStr = (u) => { if (typeof u === 'string') urls.push(u); };
    const harvest = (val) => {
      if (!val) return;
      if (Array.isArray(val)) {
        val.forEach(v => {
          if (typeof v === 'string') pushStr(v);
          else if (v && typeof v === 'object') pushStr(v.url || v.link || v.src);
        });
      } else if (typeof val === 'string') pushStr(val);
    };
    try {
      harvest(data?.image_urls);
      harvest(data?.urls);
      harvest(data?.images);
      if (urls.length === 0 && typeof data === 'object') {
        // search shallowly for any array of strings
        Object.keys(data).forEach(k => harvest(data[k]));
      }
    } catch (_) { /* noop */ }
    const filtered = filterImageUrls(urls);
    try { console.log('[upload] images/upload response URLs:', filtered); } catch (_) { /* noop */ }
    return Array.from(new Set(filtered));
  };

  // Helper: keep only plausible image URLs
  const filterImageUrls = (vals) => {
    try {
      const arr = Array.isArray(vals) ? vals : (typeof vals === 'string' ? [vals] : []);
      const isImg = (u) => {
        if (typeof u !== 'string') return false;
        const s = u.trim().toLowerCase();
        if (!s) return false;
        if (s.startsWith('data:image/')) return true;
        if (/(\.pdf|\.pptx?|\.docx?|\.xls[x]?)(\?|$)/.test(s)) return false;
        return /(\.png|\.jpe?g|\.webp|\.gif|\.bmp|\.svg)(\?|$)/.test(s);
      };
      return arr.filter(isImg);
    } catch (_) { return []; }
  };

  // Helper: Get profile_id from brand assets
  const getProfileId = async (userId) => {
    try {
      const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/${encodeURIComponent(userId)}`);
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = {}; }
      if (!resp.ok) throw new Error(`Failed to get brand assets: ${resp.status}`);
      const profileId = data?.active_profile_id || data?.profile_id || data?.profileId || data?.profile?.id || data?.id;
      return profileId;
    } catch (err) {
      console.error('Error fetching profile_id:', err);
      return null;
    }
  };

  // Handle image upload to brand assets
  const handleUploadBackgroundImages = async (files) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { alert('Missing user. Please log in again.'); return; }
      
      setIsUploadingBackground(true);
      const profileId = await getProfileId(token);
      if (!profileId) { alert('Failed to get profile ID. Please try again.'); return; }

      const form = new FormData();
      form.append('user_id', token);
      form.append('convert_colors', String(convertColors));
      files.forEach(file => form.append('images', file));

      const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/profiles/${encodeURIComponent(token)}/${encodeURIComponent(profileId)}/upload-images`, {
        method: 'POST',
        body: form
      });

      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      
      if (!resp.ok) throw new Error(`Upload failed: ${resp.status} ${text}`);
      
      alert('Images uploaded successfully!');
      // Refresh assets data
      const cacheKey = `brand_assets_images:${token}`;
      localStorage.removeItem(cacheKey);
      setShowUploadDropdown(false);
    } catch (err) {
      console.error('Background images upload failed:', err);
      alert(`Failed to upload background images: ${err.message || 'Please try again.'}`);
    } finally {
      setIsUploadingBackground(false);
      if (imageFileInputRef.current) imageFileInputRef.current.value = '';
    }
  };

  // Handle PPTX upload to brand assets
  const handleUploadBackgroundPptx = async (file) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) { alert('Missing user. Please log in again.'); return; }
      
      setIsUploadingBackground(true);
      const profileId = await getProfileId(token);
      if (!profileId) { alert('Failed to get profile ID. Please try again.'); return; }

      const form = new FormData();
      form.append('user_id', token);
      form.append('convert_colors', String(convertColors));
      form.append('pptx_file', file);

      const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/profiles/${encodeURIComponent(token)}/${encodeURIComponent(profileId)}/upload-pptx`, {
        method: 'POST',
        body: form
      });

      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      
      if (!resp.ok) throw new Error(`Upload failed: ${resp.status} ${text}`);
      
      alert('PPTX uploaded successfully!');
      // Refresh assets data
      const cacheKey = `brand_assets_images:${token}`;
      localStorage.removeItem(cacheKey);
      setShowUploadDropdown(false);
    } catch (err) {
      console.error('Background PPTX upload failed:', err);
      alert(`Failed to upload PPTX: ${err.message || 'Please try again.'}`);
    } finally {
      setIsUploadingBackground(false);
      if (pptxFileInputRef.current) pptxFileInputRef.current.value = '';
    }
  };

  // Get user profile from localStorage on component mount
  React.useEffect(() => {
    const getUserProfile = () => {
      try {
        const userJson = localStorage.getItem('user');
        if (userJson) {
          const userObject = JSON.parse(userJson);
          setUserProfile(userObject);
        }
      } catch (error) {
        console.error('Error parsing user profile:', error);
        }
    };
    getUserProfile();
  }, [scriptRows]);

  // Track previous avatar values to detect avatar-specific changes
  const prevAvatarRef = React.useRef({ sceneIndex: -1, avatar: null, avatar_urls: null });

  // Load avatars from brand assets API when avatar section is shown
  // Only trigger when scene changes or avatar-related fields change, not when description or other fields change
  React.useEffect(() => {
    const loadAvatars = async () => {
      try {
        const scene = Array.isArray(scriptRows) ? scriptRows[currentSceneIndex] : null;
        const m = String(scene?.model || scene?.mode || '').toUpperCase();
        const isAvatarish = (m === 'VEO3' || m === 'ANCHOR');
        
        if (!isAvatarish) {
          prevAvatarRef.current = { sceneIndex: currentSceneIndex, avatar: null, avatar_urls: null };
          return;
        }
        
        // Extract avatar-related fields
        const currentAvatar = scene?.avatar || null;
        const currentAvatarUrls = Array.isArray(scene?.avatar_urls) ? scene.avatar_urls : null;
        const avatarUrlsKey = currentAvatarUrls ? currentAvatarUrls.join(',') : null;
        
        // Check if avatar-related fields actually changed or scene changed
        const sceneChanged = prevAvatarRef.current.sceneIndex !== currentSceneIndex;
        const avatarChanged = prevAvatarRef.current.avatar !== currentAvatar;
        const avatarUrlsChanged = prevAvatarRef.current.avatar_urls !== avatarUrlsKey;
        
        // Only proceed if scene changed or avatar-related fields changed
        if (!sceneChanged && !avatarChanged && !avatarUrlsChanged) {
          return; // No avatar-related changes, don't reload
        }
        
        // Update ref with current values
        prevAvatarRef.current = {
          sceneIndex: currentSceneIndex,
          avatar: currentAvatar,
          avatar_urls: avatarUrlsKey
        };
        
        // Check if avatar is already selected for this scene
        const hasSelectedAvatar = currentAvatar || (currentAvatarUrls && currentAvatarUrls.length > 0) || selectedAvatar;
        
        // If avatar is already selected, try to load from cache only
        if (hasSelectedAvatar) {
          const token = localStorage.getItem('token');
          if (token) {
            try {
              const cacheKey = `brand_assets_images:${token}`;
              const cached = localStorage.getItem(cacheKey);
              if (cached) {
                const cachedData = JSON.parse(cached);
                const avatars = Array.isArray(cachedData?.avatars) ? cachedData.avatars : [];
                if (avatars.length > 0) {
                  setBrandAssetsAvatars(avatars);
                  return; // Use cached data, don't call API
                }
              }
            } catch(_) {}
          }
        }
        
        // Only call API if no avatar selected or cache is empty
        setIsLoadingAvatars(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoadingAvatars(false);
          return;
        }
        
        const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`);
        const text = await resp.text();
        let data; 
        try { data = JSON.parse(text); } catch(_) { data = text; }
        
        if (resp.ok && data && typeof data === 'object') {
          const avatars = Array.isArray(data?.avatars) ? data.avatars : [];
          setBrandAssetsAvatars(avatars);
          // Also cache in localStorage
          try {
            const cacheKey = `brand_assets_images:${token}`;
            const cached = localStorage.getItem(cacheKey);
            let cachedData = {};
            if (cached) {
              try { cachedData = JSON.parse(cached); } catch(_) {}
            }
            cachedData.avatars = avatars;
            localStorage.setItem(cacheKey, JSON.stringify(cachedData));
          } catch(_) {}
        }
      } catch (err) {
        console.error('Failed to load avatars:', err);
      } finally {
        setIsLoadingAvatars(false);
      }
    };
    
    loadAvatars();
  }, [currentSceneIndex, scriptRows, selectedAvatar]);

  // Copy helper for AI messages (ChatGPT-like)
  const copyMessageText = async (text) => {
    try {
      const toCopy = typeof text === 'string' ? text : JSON.stringify(text, null, 2);
      await navigator.clipboard.writeText(toCopy || '');
    } catch (_) { /* noop */ }
  };

  // Auto-scroll to bottom on new messages
  React.useEffect(() => {
    try {
      if (messagesContainerRef.current) {
        messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
      }
    } catch (_) { /* noop */ }
  }, [chatHistory]);

  // Listen for questionnaire generation events
  React.useEffect(() => {
    const handler = (e) => {
      const flag = !!(e?.detail?.isGenerating);
      setIsGeneratingQuestionnaire(flag);
    };
    window.addEventListener('questionnaire-generating', handler);
    return () => window.removeEventListener('questionnaire-generating', handler);
  }, []);

  // Fetch session and then trigger video generation using the first API's payload
  const triggerVideoGenerationFromSession = React.useCallback(async () => {
    try {
      const sessionId = localStorage.getItem('session_id');
      if (!sessionId) return;

      setIsGeneratingVideo(true);
      setVideoCountdown(300);
      let countdownInterval = null;
      try {
        countdownInterval = setInterval(() => {
          setVideoCountdown(prev => (prev > 0 ? prev - 1 : 0));
        }, 1000);
      } catch (_) { /* noop */ }

      const sessionPayload = { session_id: sessionId };
      console.log('sessions/get request payload:', sessionPayload);

      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/get', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sessionPayload)
      });

      if (!sessionResp.ok) {
        const text = await sessionResp.text();
        throw new Error(`sessions/get failed: ${sessionResp.status} ${text}`);
      }
      const sessionData = await sessionResp.json();
      console.log('sessions/get response:', sessionData);

      // Use entire first API payload, but overlay per-scene ref_image from current UI state
      const videoGenRequest = (() => {
        try {
          const req = JSON.parse(JSON.stringify(sessionData));
          // Build a map of scene_number -> ref_image (capped to 3) from UI
          const rows = Array.isArray(scriptRows) ? scriptRows : [];
          const refMap = new Map();
          for (const r of rows) {
            const sn = r?.scene_number;
            if (sn == null) continue;
            const imgs = Array.isArray(r?.ref_image) ? r.ref_image.filter(Boolean) : [];
            refMap.set(sn, imgs.slice(0, 3));
          }
          // Overlay persisted map so selections survive modal close/reload
          try {
            const persisted = readSceneRefMap();
            Object.keys(persisted || {}).forEach(k => {
              const sn = Number(k);
              if (!Number.isNaN(sn)) {
                const imgs = filterImageUrls(persisted[k]).slice(0, 3);
                if (imgs.length > 0) refMap.set(sn, imgs);
              }
            });
          } catch (_) { /* noop */ }
          // Log final map that will be applied to payload
          try { console.log('[refs] Generate payload ref_image map:', Array.from(refMap.entries()).map(([k,v]) => ({ scene_number: k, ref_image: v }))); } catch (_) { /* noop */ }

          const setRefsOnScene = (scene, indexHint) => {
            try {
              const sn = scene?.scene_number ?? (typeof indexHint === 'number' ? indexHint + 1 : undefined);
              if (sn == null) return scene;
              if (!refMap.has(sn)) return scene;
              const out = scene ? { ...scene } : {};
              // Always send ref_image as empty array
              out.ref_image = [];
              // Ensure no duplicate/synonym keys remain
              if ('ref_images' in out) delete out.ref_images;
              if ('reference_image' in out) delete out.reference_image;
              if ('reference_images' in out) delete out.reference_images;
              try { console.log('[refs] Applied to payload scene', sn, []); } catch (_) { /* noop */ }
              return out;
            } catch (_) { return scene; }
          };

          const looksLikeScene = (obj) => {
            if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false;
            return (
              'scene_number' in obj ||
              'scene_title' in obj ||
              'narration' in obj ||
              'desc' in obj ||
              'description' in obj
            );
          };

          const applyToScenesArray = (arr) => {
            if (!Array.isArray(arr)) return false;
            let changed = false;
            for (let i = 0; i < arr.length; i++) {
              const sc = arr[i];
              if (sc && looksLikeScene(sc)) {
                const updated = setRefsOnScene(sc, i);
                if (updated !== sc) changed = true;
                arr[i] = updated;
              }
            }
            return changed;
          };

          const visit = (node) => {
            if (!node) return;
            if (Array.isArray(node)) {
              applyToScenesArray(node);
              for (const el of node) visit(el);
              return;
            }
            if (typeof node === 'object') {
              for (const k of Object.keys(node)) {
                const v = node[k];
                if (Array.isArray(v)) applyToScenesArray(v);
                visit(v);
              }
            }
          };

          // Common shapes we might encounter
          const candidates = [
            req?.session_data?.scripts,
            req?.session?.scripts,
            req?.scripts,
          ].filter(Boolean);

          let applied = false;
          for (const scriptsArr of candidates) {
            if (Array.isArray(scriptsArr) && scriptsArr.length > 0) {
              const first = scriptsArr[0];
              if (Array.isArray(first?.airesponse)) {
                applyToScenesArray(first.airesponse);
                applied = true;
              } else if (Array.isArray(first)) {
                applyToScenesArray(first);
                applied = true;
              }
            }
          }
          if (!applied) {
            // Try direct airesponse containers if present
            if (Array.isArray(req?.airesponse)) applyToScenesArray(req.airesponse);
            if (Array.isArray(req?.assistant_message?.airesponse)) applyToScenesArray(req.assistant_message.airesponse);
            if (Array.isArray(req?.reordered_script?.airesponse)) applyToScenesArray(req.reordered_script.airesponse);
            if (Array.isArray(req?.changed_script?.airesponse)) applyToScenesArray(req.changed_script.airesponse);
          }

          // Deep walk as a final safety net
          visit(req);

          return req;
        } catch (e) {
          console.warn('Failed to overlay ref images into request; sending raw session data.', e);
          return sessionData;
        }
      })();
      console.log('videos/generate request payload:', videoGenRequest);

      const videoResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(videoGenRequest)
      });
      const videoDataText = await videoResp.text();
      let videoData;
      try { videoData = JSON.parse(videoDataText); } catch (_) { videoData = videoDataText; }
      console.log('videos/generate response:', videoData);
      console.log('videos/generate response:', videoData.job_id);
      localStorage.setItem('job_id', videoData.job_id);
      

      
      // Hit jobs endpoint with the job_id and poll until success
      const jobId = videoData?.job_id;
      if (jobId) {
        const jobsBase = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1';
        const jobsRequest = { job_id: jobId };
        console.log('jobs request payload:', jobsRequest);

        const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
        const isSuccess = (status) => {
          const s = String(status || '').toLowerCase();
          return ['succeeded', 'success', 'completed', 'done', 'finished'].includes(s);
        };

        const maxAttempts = 60; // ~5 minutes at 5s interval
        const intervalMs = 5000;
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
          try {
            const jobsResp = await fetch(`${jobsBase}/jobs/${encodeURIComponent(jobId)}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            const jobsText = await jobsResp.text();
            let jobsData;
            try { jobsData = JSON.parse(jobsText); } catch (_) { jobsData = jobsText; }
            console.log(`jobs response (attempt ${attempt}):`, jobsData);

            const status = jobsData?.status || jobsData?.job_status || jobsData?.state;
            if (status) {
              try { localStorage.setItem('job_status', status); } catch (_) { /* noop */ }
            }

            if (isSuccess(status)) {
              console.log('Job status indicates success. Stopping polling.');
              try { localStorage.setItem('job_result', JSON.stringify(jobsData)); } catch (_) { /* noop */ }
              try { window.location && (window.location.href = '/result'); } catch (_) { /* noop */ }
              break;
              
            }
          } catch (e) {
            console.error('Error polling job status:', e);
          }
          await sleep(intervalMs);
        }
      }
      
    } catch (err) {
      console.error('Error in triggerVideoGenerationFromSession:', err);
    } finally {
      try {
        // Stop countdown timer
        // Using a function-scope reference would be ideal, but since we created
        // it above within the try block, also clear any global timers just in case.
        // This is safe because clearing a null/undefined interval is a no-op in browsers.
        // eslint-disable-next-line no-undef
        if (typeof countdownInterval !== 'undefined' && countdownInterval) clearInterval(countdownInterval);
      } catch (_) { /* noop */ }
      setIsGeneratingVideo(false);
    }
  }, []);

  // Note: triggerVideoGenerationFromSession is invoked on button click only

  // Generate Storyboard Images Flow:
  // 1. Fetch session data snapshot
  // 2. Validate VEO3 scenes have avatar_urls
  // 3. Call /v1/generate-images-queue (POST) with user_id and session_id
  // 4. Get job_id from response and start polling /v1/job-status/{job_id} (GET) until status is succeeded
  // 5. Extract and display images from job-status response
  const triggerGenerateScenes = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const sessionId = localStorage.getItem('session_id');
      if (!token || !sessionId) throw new Error('Missing user token or session_id');

      // 1) Fetch session data snapshot
      const sessionReqBody = { user_id: token, session_id: sessionId };
      const sessResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionReqBody)
      });
      const sessText = await sessResp.text();
      let sessionData; try { sessionData = JSON.parse(sessText); } catch (_) { sessionData = sessText; }
      if (!sessResp.ok) throw new Error(`user-session/data failed: ${sessResp.status} ${sessText}`);

      // 2) Build request body per new generate-images schema
      const sd = sessionData?.session_data || sessionData?.session || {};
      const user = sessionData?.user_data || sd?.user_data || sd?.user || {};
      
      // VALIDATION: Check all VEO3 scenes have non-empty avatar_urls array before proceeding
      // This validates user selections - when users select avatars, they are saved in the session data
      // and will be checked here before generating the storyboard
      const scripts = Array.isArray(sd.scripts) && sd.scripts.length > 0 ? sd.scripts : [];
      const currentScript = scripts[0] || null; // Get current version (first script)
      const airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];
      
      const missingScenes = [];
      airesponse.forEach((scene, index) => {
        if (!scene || typeof scene !== 'object') return;
        const model = String(scene?.model || scene?.mode || '').toUpperCase();
        const isVEO3 = (model === 'VEO3' || model === 'ANCHOR');
        
        if (isVEO3) {
          const sceneNumber = scene?.scene_number || scene?.scene_no || scene?.sceneNo || scene?.scene || (index + 1);
          
          // Check if avatar_urls array exists and is not empty (validates user's avatar selection)
          // avatar_urls is compulsory for VEO3 scenes
          const avatarUrls = Array.isArray(scene?.avatar_urls) ? scene.avatar_urls : [];
          const hasAvatarUrls = avatarUrls.length > 0 && avatarUrls.some(url => {
            return typeof url === 'string' && url.trim().length > 0;
          });
          
          // If avatar_urls is missing (user hasn't selected avatar), add scene to missing list
          if (!hasAvatarUrls) {
            missingScenes.push(sceneNumber);
          }
        }
      });
      
      // If any VEO3 scenes are missing avatar_urls selections, show popup with scene numbers and stop
      if (missingScenes.length > 0) {
        setMissingAvatarScenes(missingScenes);
        setShowMissingAvatarPopup(true);
        return; // Stop execution - user must select avatar for all VEO3 scenes first
      }

      // 3) Call /v1/generate-images-queue API (POST) with user_id and session_id
      const imgBody = {
        user_id: (user?.id || user?.user_id || localStorage.getItem('token') || ''),
        session_id: (localStorage.getItem('session_id') || sessionId || '')
      };
      const imgResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/generate-images-queue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(imgBody)
      });
      const imgText = await imgResp.text();
      let imgData; try { imgData = JSON.parse(imgText); } catch (_) { imgData = imgText; }
      if (!imgResp.ok) throw new Error(`generate-images-queue failed: ${imgResp.status} ${imgText}`);
      try { localStorage.setItem('images_generate_response', JSON.stringify(imgData)); } catch(_) {}

      // 4) Extract job_id from response and start polling /v1/job-status/{job_id}
      const jobId = imgData?.job_id || imgData?.jobId || imgData?.id || (Array.isArray(imgData) && imgData[0]?.job_id);
      if (jobId) {
        try { localStorage.setItem('current_images_job_id', jobId); } catch (_) { /* noop */ }
        try { localStorage.setItem('images_generate_pending', 'true'); localStorage.setItem('images_generate_started_at', String(Date.now())); } catch(_){}
        setImagesJobId(jobId);
        
        // Start polling job-status
        const pollJobStatus = async () => {
          try {
            const statusResp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/job-status/${encodeURIComponent(jobId)}`);
            const statusText = await statusResp.text();
            let statusData;
            try {
              statusData = JSON.parse(statusText);
            } catch (_) {
              statusData = statusText;
            }
            if (!statusResp.ok) {
              console.error(`job-status failed: ${statusResp.status} ${statusText}`);
              return;
            }
            const status = String(statusData?.status || statusData?.job_status || '').toLowerCase();
            if (status === 'succeeded' || status === 'success' || status === 'completed') {
              try { localStorage.removeItem('images_generate_pending'); } catch(_){}
              console.log('Image generation job completed successfully');
            } else {
              // Continue polling every 3 seconds
              setTimeout(pollJobStatus, 3000);
            }
          } catch (error) {
            console.error('Error polling job-status:', error);
          }
        };
        // Start polling after a short delay
        setTimeout(pollJobStatus, 3000);
      }
      // Show short popup then navigate to images list
      setShowShortGenPopup(true);
      setTimeout(() => {
        setShowShortGenPopup(false);
        if (typeof onOpenImagesList === 'function') {
          onOpenImagesList(jobId || '');
        } else {
          setShowImagesOverlay(true);
        }
      }, 5000);
    } catch (e) {
      console.error('Failed to start scenes images generation:', e);
      alert(e?.message || 'Failed to start image generation');
    }
  }, [scriptRows]);

  // Inline component to render images for a job
  const ImageList = ({ jobId, inline = false }) => {
    const [rows, setRows] = useState([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [jobStatus, setJobStatus] = useState('');
    const [activeSceneTab, setActiveSceneTab] = useState(0); // Track active scene tab
    
    // Reset active tab when rows change
    useEffect(() => {
      if (rows.length > 0 && activeSceneTab >= rows.length) {
        setActiveSceneTab(0);
      }
    }, [rows.length, activeSceneTab]);
    
    useEffect(() => {
      let pollTimer = null;
      // Extract images from job-status API response
      // Handles image_results array structure: image_results[i].v1.image[].base_image.url
      const extractImagesFromJobStatus = (jobData) => {
        try {
          // Primary: Handle image_results array structure
          // Structure: image_results[scene_index].v1.image[].base_image.url
          if (Array.isArray(jobData?.image_results) && jobData.image_results.length > 0) {
            console.log('[ImageList] Extracting from image_results array:', jobData.image_results);
            return jobData.image_results.map((sceneResult, sceneIdx) => {
              const sceneNumber = sceneIdx + 1;
              const imageUrls = [];
              
              // Extract from v1.image array - get ALL images from base_image objects
              const v1Images = sceneResult?.v1?.image;
              if (Array.isArray(v1Images) && v1Images.length > 0) {
                v1Images.forEach((imgObj) => {
                  // First try image_url directly on imgObj
                  const imageUrl = imgObj?.image_url || imgObj?.imageUrl || '';
                  if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
                    imageUrls.push(imageUrl.trim());
                  }
                  
                  // Get image_url from base_image object (primary source)
                  const baseImage = imgObj?.base_image;
                  if (baseImage) {
                    const baseImageUrl = 
                      baseImage?.image_url ||
                      baseImage?.url || 
                      baseImage?.imageUrl || 
                      baseImage?.src || 
                      baseImage?.link || 
                      '';
                    if (baseImageUrl && typeof baseImageUrl === 'string' && baseImageUrl.trim() && !imageUrls.includes(baseImageUrl.trim())) {
                      imageUrls.push(baseImageUrl.trim());
                    }
                  }
                  
                  // Also try direct url on imgObj as fallback
                  const directUrl = imgObj?.url || '';
                  if (directUrl && typeof directUrl === 'string' && directUrl.trim() && !imageUrls.includes(directUrl.trim())) {
                    imageUrls.push(directUrl.trim());
                  }
                });
              }
              
              // Also check for image_url directly on sceneResult
              const sceneImageUrl = sceneResult?.image_url || sceneResult?.imageUrl || '';
              if (sceneImageUrl && typeof sceneImageUrl === 'string' && sceneImageUrl.trim() && !imageUrls.includes(sceneImageUrl.trim())) {
                imageUrls.push(sceneImageUrl.trim());
              }
              
              // Get scene title and description
              const sceneTitle = 
                sceneResult?.scene_title || 
                sceneResult?.title || 
                sceneResult?.sceneTitle || 
                sceneResult?.v1?.scene_title || 
                '';
              
              const sceneDescription = 
                sceneResult?.description || 
                sceneResult?.desc || 
                sceneResult?.scene_description || 
                sceneResult?.v1?.description || 
                '';
              
              console.log(`[ImageList] Scene ${sceneNumber}: Found ${imageUrls.length} image(s)`, imageUrls);
              
              return {
                scene_number: sceneNumber,
                scene_title: sceneTitle,
                description: sceneDescription,
                // Return ALL images, not just the last one
                refs: imageUrls
              };
            });
          }
          
          // Fallback: Try other possible response structures
          const images = 
            jobData?.images || 
            jobData?.result?.images || 
            jobData?.data?.images ||
            (Array.isArray(jobData?.result) ? jobData.result : []) ||
            (Array.isArray(jobData?.data) ? jobData.data : []) ||
            [];
          
          if (Array.isArray(images) && images.length > 0) {
            // If images is an array of URLs
            if (typeof images[0] === 'string') {
              return images.map((url, idx) => ({ scene_number: idx + 1, scene_title: '', refs: [url] }));
            }
            // If images is an array of objects with url/image_url properties
            if (typeof images[0] === 'object') {
              return images.map((img, idx) => {
                const url = img?.url || img?.image_url || img?.imageUrl || img?.src || '';
                return { scene_number: idx + 1, scene_title: img?.scene_title || img?.title || '', refs: [url] };
              });
            }
          }
          return [];
        } catch (e) {
          console.error('Error extracting images from job status:', e);
          return [];
        }
      };
      
      const loadSessionImages = async () => {
        try {
          const token = localStorage.getItem('token');
          const sessionId = localStorage.getItem('session_id');
          if (!token || !sessionId) return;
          const r = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
          });
          const t = await r.text();
          let j; try { j = JSON.parse(t); } catch(_) { j = {}; }
          const sd = j?.session_data || j?.session || {};
          const images = Array.isArray(sd?.images) ? sd.images : [];
          if (images.length > 0) {
            setRows(images.map((u, i) => ({ scene_number: i+1, scene_title: '', refs: [u] })));
          }
        } catch(_) {}
      };
      const start = async () => {
        try {
          setIsLoading(true); setError('');
          const id = jobId || localStorage.getItem('current_images_job_id');
          if (!id) { setError('Missing job id'); setIsLoading(false); return; }
          // initial load of any session images
          await loadSessionImages();
          // poll job status until succeeded
          const pendingFlag = localStorage.getItem('images_generate_pending') === 'true';
          if (!pendingFlag) { setIsLoading(false); return; }
          pollTimer = setInterval(async () => {
            try {
              // Poll /v1/job-status/{job_id} API (GET method) to check job status
              const r = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/job-status/${encodeURIComponent(id)}`);
              const tx = await r.text();
              let d; try { d = JSON.parse(tx); } catch(_) { d = {}; }
              const status = (d?.status || d?.job_status || '').toLowerCase();
              setJobStatus(status);
              
              // Extract images from job-status response but don't show until status is successful
              const extractedRows = extractImagesFromJobStatus(d);
              
              if (status === 'succeeded' || status === 'success' || status === 'completed') {
                clearInterval(pollTimer);
                pollTimer = null;
                // Only show images after status is confirmed successful
                if (extractedRows.length > 0) {
                  setRows(extractedRows);
                } else {
                  // Fallback: try loading from session if no images in response
                  await loadSessionImages();
                }
                setIsLoading(false);
                try { localStorage.removeItem('images_generate_pending'); } catch(_){}
              } else if (status === 'failed' || status === 'error') {
                clearInterval(pollTimer);
                pollTimer = null;
                setIsLoading(false);
                setError('Job failed. Please try again.');
                try { localStorage.removeItem('images_generate_pending'); } catch(_){}
              }
              // Keep loading state true while polling (status is not yet successful)
            } catch(e) { 
              console.error('Error polling job status:', e);
              // keep polling on error
            }
          }, 3000);
        } catch (e) { setError(e?.message || 'Failed to load images'); }
        finally { /* keep loader until succeeded */ }
      };
      start();
      return () => { if (pollTimer) clearInterval(pollTimer); };
    }, [jobId]);
    return (
      <div className={inline ? 'bg-white rounded-lg shadow-sm flex-1 flex flex-col' : 'fixed inset-0 z-[60] flex items-center justify-center bg-black/50'}>
        <div className={inline ? 'flex-1 flex flex-col' : 'bg-white w-[95%] max-w-6xl max-h-[85vh] overflow-hidden rounded-lg shadow-xl flex flex-col'}>
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-[#13008B]">Scenes • Images</h3>
            {!inline && (<button onClick={() => setShowImagesOverlay(false)} className="px-3 py-1.5 rounded-lg border text-sm">Close</button>)}
          </div>
          <div className={inline ? 'p-4 overflow-y-auto flex-1' : 'p-4 overflow-y-auto'}>
            {/* Prominent loader while polling job status - shows until status is successful */}
            {isLoading && (
              <div className="flex flex-col items-center justify-center py-12 min-h-[400px]">
                <div className="relative w-20 h-20 mb-4">
                  <div className="absolute inset-0 rounded-full border-4 border-[#D8D3FF]"></div>
                  <div className="absolute inset-2 rounded-full overflow-hidden">
                    <img 
                      src={LogoImage} 
                      alt="Logo" 
                      className="w-full h-full object-contain animate-spin"
                      style={{ animationDuration: '2s' }}
                    />
                  </div>
                </div>
                <p className="text-lg font-semibold text-gray-900 mb-2">Generating Images</p>
                <p className="text-sm text-gray-600">
                  {jobStatus ? `Status: ${jobStatus.charAt(0).toUpperCase() + jobStatus.slice(1)}` : 'Processing...'}
                </p>
                <p className="text-xs text-gray-500 mt-2">Please wait while we generate images for your scenes</p>
              </div>
            )}
            {error && (
              <div className="flex flex-col items-center justify-center py-12 min-h-[400px]">
                <div className="text-red-600 mb-2">
                  <svg className="w-12 h-12 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <p className="text-sm text-red-600 font-medium">{error}</p>
              </div>
            )}
            {/* Only show images when loading is complete and status is successful */}
            {!isLoading && !error && (
              <div className="flex flex-col h-full">
                {rows.length === 0 ? (
                  <div className="text-sm text-gray-600 text-center py-8">No images available yet.</div>
                ) : (
                  <>
                    {/* Scene Tabs */}
                    <div className="flex gap-2 border-b border-gray-200 mb-4 overflow-x-auto scrollbar-hide">
                      {rows.map((r, i) => (
                        <button
                          key={i}
                          onClick={() => setActiveSceneTab(i)}
                          className={`px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors ${
                            activeSceneTab === i
                              ? 'border-b-2 border-[#13008B] text-[#13008B]'
                              : 'text-gray-600 hover:text-gray-900'
                          }`}
                        >
                          Scene {r.scene_number}
                        </button>
                      ))}
                    </div>

                    {/* Active Scene Content */}
                    {rows[activeSceneTab] && (() => {
                      const activeScene = rows[activeSceneTab];
                      const sceneImages = Array.isArray(activeScene.refs) ? activeScene.refs : [];
                      
                      return (
                        <div className="flex-1 overflow-y-auto">
                          {/* Scene Title and Description */}
                          <div className="mb-4 pb-4 border-b border-gray-200">
                            <div className="flex items-center gap-2 mb-2">
                              <h3 className="text-lg font-semibold text-gray-900">
                              {activeScene.scene_title || `Scene ${activeScene.scene_number}`}
                            </h3>
                              {/* Show video type based on model */}
                              {(() => {
                                const modelUpper = String(activeScene?.model || activeScene?.mode || '').toUpperCase();
                                if (modelUpper === 'VEO3') {
                                  return <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-800 rounded">Avatar</span>;
                                } else if (modelUpper === 'ANCHOR') {
                                  return <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-800 rounded">Anchor</span>;
                                }
                                return null;
                              })()}
                            </div>
                            {activeScene.description && (
                              <p className="text-sm text-gray-600">{activeScene.description}</p>
                            )}
                          </div>

                          {/* Images Grid - 4 columns */}
                          {sceneImages.length === 0 ? (
                            <div className="text-sm text-gray-500 text-center py-8">No images available for this scene.</div>
                          ) : (
                            <div className="grid grid-cols-4 gap-4">
                              {sceneImages.map((imageUrl, imgIdx) => (
                                <div key={imgIdx} className="relative group">
                                  {/* Edit button - shows on hover at top */}
                                  <button
                                    className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/90 hover:bg-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                    title="Edit image"
                                    onClick={() => {
                                      // Handle edit action here
                                      console.log('Edit image', activeScene.scene_number, imgIdx);
                                    }}
                                  >
                                    <svg className="w-4 h-4 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                  </button>
                                  
                                  {/* Image container */}
                                  <div className="w-full aspect-video rounded-lg border overflow-hidden bg-gray-100 relative">
                                    {imageUrl ? (
                                      <>
                                        <img 
                                          src={imageUrl} 
                                          alt={`scene-${activeScene.scene_number}-image-${imgIdx + 1}`} 
                                          className="w-full h-full object-cover"
                                          onError={(e) => {
                                            e.target.style.display = 'none';
                                            const errorDiv = e.target.parentElement.querySelector('.image-error');
                                            if (errorDiv) {
                                              errorDiv.classList.remove('hidden');
                                              errorDiv.classList.add('flex');
                                            }
                                          }}
                                        />
                                        <div className="image-error absolute inset-0 w-full h-full hidden items-center justify-center text-sm text-gray-500 bg-gray-100">
                                          Failed to load image
                                        </div>
                                      </>
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-sm text-gray-500">
                                        No image available
                                      </div>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  // Listen for script-generated events (from DynamicQuestion)
  React.useEffect(() => {
    const onScriptGenerated = (e) => {
      const data = e?.detail;
      if (!data) return;
      // Save and show
      try {
        localStorage.setItem(scopedKey('last_generated_script'), JSON.stringify(data));
        localStorage.setItem(scopedKey('has_generated_script'), 'true');
        // Clear any persisted per-scene refs for a fresh script
        localStorage.removeItem(scopedKey('scene_ref_images'));
        // Clean legacy non-scoped keys to avoid cross-session bleed
        localStorage.removeItem('last_generated_script');
        localStorage.removeItem('has_generated_script');
      } catch (_) { /* noop */ }
      setChatHistory(prev => ([...prev, { id: Date.now(), type: 'ai', content: 'Your script is ready. You can view it or generate the video.', script: data, timestamp: new Date().toISOString() }]));
      
             // Clear any previous reordered rows when a new script is generated
       try {
         localStorage.removeItem('reordered_script_rows');
         localStorage.removeItem('original_script_hash');
         localStorage.removeItem('updated_script_structure');
         localStorage.removeItem(scopedKey('reordered_script_rows'));
         localStorage.removeItem(scopedKey('original_script_hash'));
         localStorage.removeItem(scopedKey('updated_script_structure'));
       } catch (_) { /* noop */ }
      
      // Do not auto-open script modal; Script now has its own step
      // try { openScriptModal(data); } catch (_) { /* noop */ }
    };
    window.addEventListener('script-generated', onScriptGenerated);
    return () => window.removeEventListener('script-generated', onScriptGenerated);
  }, [setChatHistory]);

  // Disabled auto-open of script modal on reload; Script has a dedicated step
  // useEffect(() => { ... }, [isChatLoading, chatHistory]);

  const normalizeScriptToRows = (script) => {
    try {
      const coalesce = (...vals) => vals.find(v => typeof v === 'string' && v.trim().length > 0) || '';

      // Normalize various ref_image shapes into an array of image URLs
      const isImageUrl = (u) => {
        if (typeof u !== 'string') return false;
        const url = u.trim();
        if (!url) return false;
        if (url.startsWith('data:image/')) return true;
        const lower = url.toLowerCase();
        // Exclude obvious non-image docs
        if (/(\.pdf|\.pptx?|\.docx?|\.xls[x]?)(\?|$)/.test(lower)) return false;
        return /(\.png|\.jpe?g|\.webp|\.gif|\.bmp|\.svg)(\?|$)/.test(lower);
      };

      const normRefs = (val) => {
        try {
          if (!val) return [];
          if (Array.isArray(val)) {
            const out = [];
            for (const item of val) {
              if (typeof item === 'string') { if (isImageUrl(item)) out.push(item.trim()); }
              else if (item && typeof item === 'object') {
                // Common shapes: { url }, { link }, { src }
                const cand = item.url || item.link || item.src || '';
                if (isImageUrl(cand)) out.push(cand);
              }
            }
            return out;
          }
          if (typeof val === 'string') {
            // Sometimes comma-separated string
            const parts = val.split(',').map(s => s.trim()).filter(Boolean);
            const out = parts.filter(isImageUrl);
            return out;
          }
          if (val && typeof val === 'object') {
            const cand = val.url || val.link || val.src || '';
            return isImageUrl(cand) ? [cand] : [];
          }
          return [];
        } catch (_) { return []; }
      };

      const cloneTemplate = (input) => {
        if (!input || typeof input !== 'object') return null;
        if (Array.isArray(input)) return [...input];
        return { ...input };
      };

      const toRow = (row, idx) => {
        const refs = normRefs(
          row?.ref_image ?? row?.reference_image ?? row?.ref_img ?? row?.ref_images ?? row?.reference_images
        );
        const promptTemplate = (() => {
          const candidates = [
            row?.veo3_prompt_template,
            row?.veo_prompt_template,
            row?.veo3PromptTemplate,
            row?.prompt_template,
            row?.promptTemplate
          ];
          for (const cand of candidates) {
            if (cand && typeof cand === 'object') {
              return cloneTemplate(cand);
            }
          }
          return null;
        })();
        const anchorPromptTemplate = (() => {
          const candidates = [
            row?.anchor_prompt_template,
            row?.anchorPromptTemplate
          ];
          for (const cand of candidates) {
            if (cand && typeof cand === 'object') {
              return cloneTemplate(cand);
            }
          }
          return null;
        })();
        const sceneNumber = row?.scene_number ?? row?.sceneNo ?? row?.scene_no ?? row?.no ?? (idx + 1);
        const mode = row?.model ?? row?.mode_type ?? row?.video_mode ?? row?.mode ?? '';
        const folderLink = row?.folder_link ?? row?.folderLink ?? row?.folder ?? '';
        const timeline = coalesce(row?.timeline, row?.time, row?.duration, row?.additional, row?.additional_info, row?.timestamp);
        const narration = coalesce(row?.narration, row?.voice_over_script, row?.voice_over, row?.voiceover, row?.voice);
        const description = coalesce(row?.description, row?.desc, row?.scene_title, row?.title, row?.scene, row?.content, row?.text);
        const fontSizeValue = row?.font_size != null ? row.font_size : row?.fontSize;
        const fontStyleValue = row?.font_style ?? row?.fontStyle ?? '';
        const durationSource =
          row?.scene_duration ??
          row?.duration ??
          row?.timeline ??
          row?.time ??
          '';
        const durationValue = parseDurationToSeconds(durationSource);
        const wordCountValue =
          typeof row?.word_count === 'number'
            ? row.word_count
            : computeWordCount(narration || description || '');

        // Start with a deep copy of the original row to preserve ALL fields
        const preservedRow = row && typeof row === 'object' && !Array.isArray(row)
          ? JSON.parse(JSON.stringify(row)) // Deep copy to preserve all nested fields
          : {};
        
        // Build normalized row, preserving all original fields and only overriding specific ones
        return {
          ...preservedRow, // Preserve ALL original fields first (including opening_frame, closing_frame, animation_desc, etc.)
          scene_number: sceneNumber,
          mode,
          // Always preserve ref_image from API responses (e.g., from update-text API)
          ref_image: refs,
          folderLink,
          timeline,
          duration: durationValue,
          scene_title: coalesce(row?.scene_title, row?.title, row?.scene, row?.content, row?.text),
          narration,
          description,
          gen_image: (typeof row?.gen_image === 'boolean') ? row.gen_image : undefined,
          additional: coalesce(row?.additional, row?.additional_info, row?.notes, row?.extra, row?.additionalInformation),
          // Chart-specific fields for Financial (PLOTLY) scenes
          chart_type: row?.chart_type ?? row?.chartType ?? '',
          chartType: row?.chartType ?? row?.chart_type ?? '',
          chart_data: row?.chart_data ?? row?.chartData ?? null,
          chartData: row?.chartData ?? row?.chart_data ?? null,
          // Styling and colors
          colors: Array.isArray(row?.colors) ? row.colors : [],
          font_size: fontSizeValue,
          fontSize: fontSizeValue,
          font_style: fontStyleValue,
          fontStyle: fontStyleValue,
          text_to_be_included: Array.isArray(row?.text_to_be_included)
            ? row.text_to_be_included.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim())
            : (typeof row?.text_to_include === 'string' && row.text_to_include.trim() ? [row.text_to_include.trim()] : []),
          veo3_prompt_template: promptTemplate,
          anchor_prompt_template: anchorPromptTemplate,
          word_count: wordCountValue,
          // Preserve presenter_options for VEO3/ANCHOR models
          presenter_options: (() => {
            if (row?.presenter_options && typeof row.presenter_options === 'object') {
              return {
                preset_id: row.presenter_options.preset_id ?? row.presenter_options.presetId ?? undefined,
                option: row.presenter_options.option ?? row.presenter_options.name ?? row.presenter_options.label ?? undefined,
                anchor_id: row.presenter_options.anchor_id ?? row.presenter_options.anchorId ?? undefined,
                ...row.presenter_options
              };
            }
            // Also check alternative field names
            if (row?.presenterOptions && typeof row.presenterOptions === 'object') {
              return {
                preset_id: row.presenterOptions.preset_id ?? row.presenterOptions.presetId ?? undefined,
                option: row.presenterOptions.option ?? row.presenterOptions.name ?? row.presenterOptions.label ?? undefined,
                anchor_id: row.presenterOptions.anchor_id ?? row.presenterOptions.anchorId ?? undefined,
                ...row.presenterOptions
              };
            }
            return undefined;
          })(),
          // Preserve avatar_urls array if present, fallback to avatar field
          avatar_urls: (() => {
            if (Array.isArray(row?.avatar_urls) && row.avatar_urls.length > 0) {
              return row.avatar_urls.filter(url => typeof url === 'string' && url.trim()).map(url => url.trim());
            }
            // Fallback: convert avatar to avatar_urls array
            if (typeof row?.avatar === 'string' && row.avatar.trim()) {
              return [row.avatar.trim()];
            }
            return [];
          })(),
          // Also preserve avatar field for backward compatibility
          avatar: typeof row?.avatar === 'string' && row.avatar.trim() ? row.avatar.trim() : undefined,
          // Preserve background_image array and background field
          background_image: (() => {
            if (Array.isArray(row?.background_image)) {
              return row.background_image;
            }
            return [];
          })(),
          background: typeof row?.background === 'string' && row.background.trim() ? row.background.trim() : undefined
        };
      };

      // Extract metadata from the top-level script
      const extractMetadata = (scriptObj) => {
        return {
          model: scriptObj?.model || scriptObj?.mode || '',
          ref_images: scriptObj?.ref_images || scriptObj?.reference_images || scriptObj?.ref_img || [],
          mode: scriptObj?.mode || scriptObj?.model || '',
          folder_link: scriptObj?.folder_link || scriptObj?.folderLink || scriptObj?.folder || ''
        };
      };

      // Unwrap common wrappers
      const unwrap = (obj) => {
        if (!obj || typeof obj !== 'object') return obj;
        if (Array.isArray(obj)) return obj;
        return (
          obj.script ||
          obj.airesponse ||
          obj.scenes ||
          obj.rows ||
          obj.result ||
          obj.output ||
          obj.content ||
          obj.data ||
          obj
        );
      };

      const unwrapped = unwrap(script);
      const metadata = extractMetadata(script);

      // Array of rows
      if (Array.isArray(unwrapped)) {
        // If array of strings
        if (unwrapped.every(item => typeof item === 'string')) {
          const rows = unwrapped.map((text, idx) => ({
            scene_number: idx + 1,
            mode: '',
            ref_image: [],
            folderLink: '',
            timeline: '',
            narration: '',
            description: text,
            additional: ''
          }));
          return { rows, metadata };
        }
        // Array of objects
      const rows = unwrapped.map((row, idx) => toRow(row || {}, idx));
      return { rows, metadata };
      }

      // If nested property contains array (direct children)
      const nestedCandidates = ['script', 'airesponse', 'scenes', 'rows', 'result', 'output', 'content', 'data'];
      for (const key of nestedCandidates) {
        if (Array.isArray(unwrapped?.[key])) {
          const rows = unwrapped[key].map((row, idx) => toRow(row || {}, idx));
          return { rows, metadata };
        }
      }

      // Deeply nested common shapes (e.g., assistant_message.airesponse, reordered_script.airesponse, changed_script.airesponse)
      const deepCandidates = [
        ['assistant_message', 'airesponse'],
        ['reordered_script', 'airesponse'],
        ['changed_script', 'airesponse'],
      ];
      for (const path of deepCandidates) {
        const arr = unwrapped?.[path[0]]?.[path[1]];
        if (Array.isArray(arr)) {
          const rows = arr.map((row, idx) => toRow(row || {}, idx));
          return { rows, metadata };
        }
      }

      // Fallback: single row stringified
      const rows = [{ 
        scene_number: 1, 
        mode: '', 
        ref_image: [], 
        folderLink: '', 
        timeline: '', 
        narration: '', 
        description: typeof script === 'string' ? script : JSON.stringify(script, null, 2), 
        additional: '' 
      }];
      return { rows, metadata };
    } catch (_) {
      const rows = [{ 
        scene_number: 1, 
        mode: '', 
        ref_image: [], 
        folderLink: '', 
        timeline: '', 
        narration: '', 
        description: 'Unable to render script.', 
        additional: '' 
      }];
      const metadata = { model: '', ref_images: [], mode: '', folder_link: '' };
      return { rows, metadata };
    }
  };
  // Auto-select video type based on current scene's mode
  useEffect(() => {
    if (Array.isArray(scriptRows) && scriptRows.length > 0 && scriptRows[currentSceneIndex]) {
      const currentScene = scriptRows[currentSceneIndex];
      if (currentScene && currentScene.mode) {
        const modeLower = currentScene.mode.toLowerCase();
        if (modeLower.includes('veo3') || modeLower.includes('veo')) {
          setSelectedVideoType('Avatar Based');
          console.log(`Scene ${currentSceneIndex + 1}: Mode "${currentScene.mode}" → Video Type: Avatar Based`);
        } else {
          setSelectedVideoType('Infographic');
          console.log(`Scene ${currentSceneIndex + 1}: Mode "${currentScene.mode}" → Video Type: Infographic`);
        }
      } else {
        console.log(`Scene ${currentSceneIndex + 1}: No mode set, using default`);
      }
    }
  }, [scriptRows, currentSceneIndex]);

  // Initialize selectedAvatar from current scene data (only on scene change, preserve user selection)
  useEffect(() => {
    if (Array.isArray(scriptRows) && scriptRows[currentSceneIndex]) {
      const scene = scriptRows[currentSceneIndex];
      const m = String(scene?.model || scene?.mode || '').toUpperCase();
      const isAvatarish = (m === 'VEO3' || m === 'ANCHOR');
      
      if (isAvatarish) {
        // Check for avatar_urls array first, then avatar field
        // Normalize URLs by trimming to ensure proper matching
        let avatarToSet = null;
        if (Array.isArray(scene?.avatar_urls) && scene.avatar_urls.length > 0) {
          const normalizedUrl = String(scene.avatar_urls[0] || '').trim();
          if (normalizedUrl) {
            avatarToSet = normalizedUrl;
          }
        } else if (typeof scene?.avatar === 'string' && scene.avatar.trim()) {
          avatarToSet = scene.avatar.trim();
        }
        
        // Only update if we have a valid avatar and it's different from current selection
        if (avatarToSet) {
          const currentNormalized = selectedAvatar ? String(selectedAvatar).trim() : null;
          if (currentNormalized !== avatarToSet) {
            setSelectedAvatar(avatarToSet);
          }
        } else {
          // Reset to null if scene doesn't have an avatar - don't preserve from previous scene
          setSelectedAvatar(null);
        }
      } else {
        // Reset for non-avatar scenes
        setSelectedAvatar(null);
      }
    } else {
      setSelectedAvatar(null);
    }
  }, [currentSceneIndex, scriptRows]); // Include scriptRows to update when scene data changes

  // Auto-select first avatar if no avatar is selected for avatar-based scenes
  useEffect(() => {
    if (Array.isArray(scriptRows) && scriptRows[currentSceneIndex]) {
      const scene = scriptRows[currentSceneIndex];
      const m = String(scene?.model || scene?.mode || '').toUpperCase();
      const isAvatarish = (m === 'VEO3' || m === 'ANCHOR');
      
      // Only auto-select if:
      // 1. Scene is avatar-based
      // 2. No avatar is currently selected
      // 3. Scene doesn't have an avatar saved
      if (isAvatarish && !selectedAvatar) {
        const hasSceneAvatar = (Array.isArray(scene?.avatar_urls) && scene.avatar_urls.length > 0) || 
                              (typeof scene?.avatar === 'string' && scene.avatar.trim());
        
        if (!hasSceneAvatar) {
          // Get the first available avatar from preset or brand assets
          const firstPresetAvatar = Array.isArray(presetAvatars) && presetAvatars.length > 0 
            ? String(presetAvatars[0]).trim() 
            : null;
          const firstBrandAvatar = Array.isArray(brandAssetsAvatars) && brandAssetsAvatars.length > 0 
            ? String(brandAssetsAvatars[0]).trim() 
            : null;
          
          // Prefer preset avatar, fallback to brand asset avatar
          const firstAvailableAvatar = firstPresetAvatar || firstBrandAvatar;
          
          if (firstAvailableAvatar) {
            setSelectedAvatar(firstAvailableAvatar);
          }
        }
      }
    }
  }, [currentSceneIndex, scriptRows, selectedAvatar, presetAvatars, brandAssetsAvatars]);

  // Keep avatar selection scoped to the current scene - removed incorrect ref_image assignment

  // Reset text input buffer when switching scenes
  useEffect(() => {
    try {
      const r = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
      const arr = Array.isArray(r?.text_to_be_included) ? r.text_to_be_included : [];
      setTextIncludeInput('');
    } catch (_) { setTextIncludeInput(''); }
  }, [currentSceneIndex, scriptRows]);

  // Initialize selectedRefImages from scene data when scene changes or scriptRows loads
  useEffect(() => {
    if (Array.isArray(scriptRows) && scriptRows[currentSceneIndex]) {
      const scene = scriptRows[currentSceneIndex];
      const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
      const isSora = modelUpper === 'SORA';
      const isAnchor = modelUpper === 'ANCHOR';
      
      // Extract background images - prioritize background_image array over ref_image
      let backgroundImages = [];
      
      // First check background_image array (primary source for background images)
      if (Array.isArray(scene?.background_image) && scene.background_image.length > 0) {
        // Extract URLs from array of objects or strings
        backgroundImages = scene.background_image
          .map(item => {
            if (typeof item === 'string' && item.trim()) return item.trim();
            if (item && typeof item === 'object') {
              return item?.imageurl || item?.imageUrl || item?.image_url || item?.url || item?.src || item?.link || '';
            }
            return '';
          })
          .filter(url => url && typeof url === 'string');
      } else if (typeof scene?.background_image === 'string' && scene.background_image.trim()) {
        backgroundImages = [scene.background_image.trim()];
      } else if (typeof scene?.background === 'string' && scene.background.trim()) {
        backgroundImages = [scene.background.trim()];
      }
      
      // Fallback to ref_image only if background_image is empty
      if (backgroundImages.length === 0 && Array.isArray(scene?.ref_image) && scene.ref_image.length > 0) {
        backgroundImages = scene.ref_image
          .filter(item => item && typeof item === 'string' ? item.trim() : item)
          .map(item => typeof item === 'string' ? item.trim() : item);
      }
      
      // Set selectedRefImages - show ALL background images (no limit, but typically up to 2)
      if (backgroundImages.length > 0) {
        // Show all background images, not just the first 2
        setSelectedRefImages(backgroundImages);
        console.log('[Background Images] Setting selectedRefImages:', {
          count: backgroundImages.length,
          images: backgroundImages,
          scene: scene?.scene_number
        });
      } else {
        setSelectedRefImages([]);
      }
    } else {
      setSelectedRefImages([]);
    }
  }, [currentSceneIndex, scriptRows]);

  const openScriptModal = (script) => {
    try {
      // In scenesMode (ScriptEditor), always use the script from API, don't check localStorage
      // This ensures we always show the latest data from the backend
      let scriptToShow = script;
      let normalizedIncoming = null;
      try { normalizedIncoming = normalizeScriptToRows(script); } catch (_) { normalizedIncoming = null; }
      
      // Only check localStorage if NOT in scenesMode (for regular chat flow)
      if (!scenesMode) {
        try {
          const latest = localStorage.getItem(scopedKey('updated_script_structure'));
          if (latest) {
            const stored = JSON.parse(latest);
            const normalizedStored = normalizeScriptToRows(stored);
            const countImgs = (rows) => {
              try {
                return (Array.isArray(rows) ? rows : []).reduce((acc, r) => acc + (Array.isArray(r?.ref_image) ? r.ref_image.length : 0), 0);
              } catch (_) { return 0; }
            };
            const storedImgs = countImgs(normalizedStored?.rows);
            const incomingImgs = countImgs(normalizedIncoming?.rows);
            // If stored has no images but incoming has, use incoming; otherwise use stored
            if (storedImgs === 0 && incomingImgs > 0) {
              scriptToShow = script;
            } else {
              scriptToShow = stored;
              normalizedIncoming = normalizedStored; // keep in sync for header auto-select below
            }
          }
        } catch (_) { /* noop */ }
      }

      const currentScriptHash = JSON.stringify(scriptToShow);
      const normalizedRows = normalizeScriptToRows(scriptToShow);
      const rowsWithPersistedRefs = applyPersistedRefsToRows(normalizedRows.rows || []);
      setScriptRows(rowsWithPersistedRefs);
      // Track original script structure for resets
      localStorage.setItem(scopedKey('original_script_hash'), currentScriptHash);
      setHasOrderChanged(false);
    } catch (_) {
      setScriptRows([]);
      setHasOrderChanged(false);
    }
    
    // Auto-select video type based on first scene's mode
    try {
      const normalizedResult = normalizeScriptToRows(script);
      if (normalizedResult.rows && normalizedResult.rows.length > 0) {
        const firstScene = normalizedResult.rows[0];
        if (firstScene && firstScene.mode) {
          const modeLower = firstScene.mode.toLowerCase();
          if (modeLower.includes('veo3') || modeLower.includes('veo')) {
            setSelectedVideoType('Avatar Based');
          } else {
            setSelectedVideoType('Infographic');
          }
        }
      }
    } catch (e) {
      console.warn('Failed to auto-select video type based on first scene:', e);
    }
    
    setShowScriptModal(true);
    setCurrentSceneIndex(0);
    setShowReorderTable(false);
  };

  // If rendering Scenes inline (Home page section), open when initialScenes provided
  useEffect(() => {
    if (scenesMode) {
      // Check if initialScenes is provided and not empty
      const hasScenes = initialScenes !== null && initialScenes !== undefined && 
        (Array.isArray(initialScenes) ? initialScenes.length > 0 : true);
      
      if (hasScenes) {
        console.log('[Chat] Opening script modal with initialScenes:', {
          type: Array.isArray(initialScenes) ? 'array' : typeof initialScenes,
          length: Array.isArray(initialScenes) ? initialScenes.length : 'N/A',
          initialScenes: initialScenes
        });
        try { 
          openScriptModal(initialScenes); 
        } catch (error) { 
          console.error('[Chat] Error opening script modal:', error);
        }
      } else {
        console.log('[Chat] No initialScenes provided or empty, not opening script modal');
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scenesMode, initialScenes]);

  // Apply script response container from undo/redo
  const applyScriptContainer = (container, meta = {}) => {
    try {
      localStorage.setItem(scopedKey('updated_script_structure'), JSON.stringify(container));
      localStorage.setItem(scopedKey('original_script_hash'), JSON.stringify(container));
    } catch (_) { /* noop */ }
    try {
      const normalized = normalizeScriptToRows(container);
      const newRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
      setScriptRows(newRows);
      setHasOrderChanged(false);
    } catch (_) { /* noop */ }
    if (typeof meta.can_undo === 'boolean') setCanUndo(meta.can_undo);
    if (typeof meta.can_redo === 'boolean') setCanRedo(meta.can_redo);
  };

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
      const container = data?.script ? { script: data.script } : data;
      applyScriptContainer(container, { can_undo: data?.can_undo, can_redo: data?.can_redo });
    } catch (e) {
      console.error('Undo failed:', e);
      alert('Undo failed. Please try again.');
    }
  };

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
      const resp = await fetch('https://coreappservicerr-aseahgexgk​e8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/redo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody)
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`scripts/redo failed: ${resp.status} ${text}`);
      const container = data?.script ? { script: data.script } : data;
      applyScriptContainer(container, { can_undo: data?.can_undo, can_redo: data?.can_redo });
    } catch (e) {
      console.error('Redo failed:', e);
      alert('Redo failed. Please try again.');
    }
  };

  // Regenerate current scene based on user query and model
  const handleRegenerateScene = async () => {
    // Check if user selected a suggestion
    const hasSelectedSuggestion = regenSelectedIdx >= 0 && regenSuggestions && regenSuggestions[regenSelectedIdx];
    // Check if user entered manual description/query
    const hasManualDescription = regenQuery && regenQuery.trim();
    // Check if there's document summary or scene content from suggestion
    const hasContent = (regenDocSummary && regenDocSummary.trim()) || (regenSceneContent && regenSceneContent.trim());
    
    // Validation: user must either select a suggestion OR enter a description OR have document summary
    if (!hasSelectedSuggestion && !hasManualDescription && !hasContent) {
      alert('Please select a suggested scene, enter a description, or upload a document before regenerating.');
      return;
    }
    
    // Use selected suggestion content, manual description, or document summary (priority: suggestion > doc summary > description)
    const content = hasSelectedSuggestion 
      ? (regenSceneContent && regenSceneContent.trim()) || (regenDocSummary && regenDocSummary.trim()) || ''
      : (hasContent ? (regenDocSummary && regenDocSummary.trim()) || (regenSceneContent && regenSceneContent.trim()) || '' : (regenQuery && regenQuery.trim()) || '');
    
    if (!content) { 
      alert('Please select a suggested scene, enter a description, or upload a document before regenerating.'); 
      return; 
    }
    
    // For financial model, validate chart_data exists
    if (regenModelUpper === 'PLOTLY') {
      // Check if chart_data exists from selected suggestion, uploaded document, or manually entered
      const hasChartDataFromSuggestion = regenSelectedIdx >= 0 && regenSuggestions?.[regenSelectedIdx]?.chart_data;
      const hasChartDataFromUpload = regenDocSummary && regenDocSummary.trim();
      const hasChartDataManual = regenChartData && regenChartData.trim();
      
      // Also check if chart_data exists in the selected suggestion's data structure
      let chartDataFromSelected = null;
      if (regenSelectedIdx >= 0 && regenSuggestions?.[regenSelectedIdx]) {
        const selectedSuggestion = regenSuggestions[regenSelectedIdx];
        chartDataFromSelected = selectedSuggestion?.chart_data || selectedSuggestion?.chartData;
      }
      
      // Check if we have chart_data from any source
      const hasChartData = chartDataFromSelected || hasChartDataManual;
      
      if (!hasChartData) {
        alert('Please select a suggested scene with chart data, upload a document, or manually enter chart data before regenerating.');
        return;
      }
    }
    
    await regenerateSceneViaAPI(content);
  };


  const normalizeRegenModel = React.useCallback((rawModel) => {
    const upper = String(rawModel || '').toUpperCase();
    if (!upper) return 'SORA';
    if (upper === 'ANCHOR') return 'ANCHOR';
    if (upper === 'PLOTLY') return 'PLOTLY';
    if (upper === 'VEO3' || upper === 'AVATAR' || upper === 'AVATAR BASED') return 'VEO3';
    return upper;
  }, []);

  const continueRegenerateFlow = React.useCallback(
    async (modelOverride) => {
      try {
        if (isRegenerating || isLoadingRegenPresenter || isSuggestingRegen) return;
        const total = Array.isArray(scriptRows) ? scriptRows.length : 0;
        const idx = Math.min(Math.max(0, currentSceneIndex), Math.max(0, total));
        const normalizedModel = normalizeRegenModel(modelOverride || regenModel || 'SORA');
        const isAvatarModel = normalizedModel === 'VEO3' || normalizedModel === 'ANCHOR';
        const isFinancialModel = normalizedModel === 'PLOTLY';

        setRegenPresenterError('');
        setRegenSelectedIdx(-1);
        setRegenSceneContent('');

        // For financial model, require chart type before proceeding
        if (isFinancialModel) {
          if (!regenChartType || !regenChartType.trim()) {
            alert('Please select a chart type before continuing.');
            return;
          }
        }

        if (enablePresenterOptions && isAvatarModel) {
          let shouldPauseForPresenter = false;
          setRegenPresenterPresetId('');
          setRegenPresenterPresetLabel('');
          setIsLoadingRegenPresenter(true);
          try {
            const list = await fetchPresenterPresetsForModel(normalizedModel);
            const normalizedList = Array.isArray(list) ? list : [];
            if (normalizedList.length > 0) {
              setRequiresRegenPresenterSelection(true);
              if (normalizedList.length === 1) {
                setRegenPresenterPresetId(String(normalizedList[0].preset_id));
                setRegenPresenterPresetLabel(normalizedList[0].option || '');
              }
              setRegenStep(2);
              shouldPauseForPresenter = true;
            } else {
              setRequiresRegenPresenterSelection(false);
            }
          } catch (err) {
            console.error('Failed to load presenter options for regenerate flow:', err);
            setRequiresRegenPresenterSelection(false);
            setRegenPresenterError(err?.message || 'Failed to load presenter options.');
          } finally {
            setIsLoadingRegenPresenter(false);
          }
          if (shouldPauseForPresenter) return;
        } else {
          setRequiresRegenPresenterSelection(false);
        }

        // For financial model, pass chart_type to fetchSceneSuggestions
        const chartTypeForSuggestions = isFinancialModel ? regenChartType : null;
        await fetchSceneSuggestions(normalizedModel || 'SORA', idx, 'regen', chartTypeForSuggestions);
        setRegenStep(2);
      } catch (err) {
        console.error('Failed to continue regenerate flow:', err);
        setRegenPresenterError(err?.message || 'Failed to continue regenerate flow.');
      }
    },
    [
      currentSceneIndex,
      enablePresenterOptions,
      fetchSceneSuggestions,
      isLoadingRegenPresenter,
      isRegenerating,
      isSuggestingRegen,
      normalizeRegenModel,
      regenModel,
      regenChartType,
      scriptRows
    ]
  );

  // Open Regenerate modal first; suggestions load based on selected model
  const openRegenerateWithSuggestions = async () => {
    try {
      // Fresh start every time Regenerate flow opens
      setRegenStep(1);
      setRegenSuggestions([]);
      setRegenSelectedIdx(-1);
      setRegenSceneContent('');
      setRegenDocSummary('');
      setRegenQuery(''); // Reset manual description input
      // Initialize chart type from current scene if available
      const currentScene = scriptRows?.[currentSceneIndex];
      const existingChartType = currentScene?.chart_type || currentScene?.chartType || '';
      setRegenChartType(existingChartType);
      const existingChartData = currentScene?.chart_data || currentScene?.chartData || {};
      setRegenChartData(typeof existingChartData === 'string' ? existingChartData : (existingChartData ? JSON.stringify(existingChartData, null, 2) : ''));
      setIsUploadingRegenDoc(false);
      setRegenManualText('');
      setRegenPresenterPresetId('');
      setRegenPresenterPresetLabel('');
      setRegenPresenterError('');
      setIsLoadingRegenPresenter(false);
      setRequiresRegenPresenterSelection(false);
      const rawSceneModel = String(scriptRows?.[currentSceneIndex]?.model || scriptRows?.[currentSceneIndex]?.mode || '').toUpperCase();
      const normalizedModel = normalizeRegenModel(rawSceneModel || 'SORA');
      setRegenModel(normalizedModel || 'SORA');
      setShowRegenModal(true);
      // For PLOTLY, stay at step 1 to show chart type first
      if (normalizedModel !== 'PLOTLY') {
        continueRegenerateFlow(normalizedModel);
      }
    } catch(_) { setShowRegenModal(true); }
  };

  const regenerateSceneViaAPI = async (userQuery) => {
    try {
      setIsRegenerating(true);
      if (!Array.isArray(scriptRows) || scriptRows.length === 0) return;
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) throw new Error('Missing session_id or token');

      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      if (!sessionResp.ok) {
        const text = await sessionResp.text();
        throw new Error(`user-session/data failed: ${sessionResp.status} ${text}`);
      }
      const sessionDataResponse = await sessionResp.json();
      const sd = (sessionDataResponse?.session_data || sessionDataResponse?.session || {});
      const regenPath = 'scripts/regenerate-scene';

      // Preserve ALL fields from session_data, including nested structures
      const sessionForBody = sanitizeSessionSnapshot(sd, sessionId, token);
      let userForBody;
      if (sessionDataResponse && typeof sessionDataResponse.user_data === 'object') {
        userForBody = sessionDataResponse.user_data;
      } else if (sd && typeof sd.user_data === 'object') {
        userForBody = sd.user_data;
      } else if (sd && typeof sd.user === 'object') {
        userForBody = sd.user;
      } else {
        throw new Error('user_data missing in user-session-data response');
      }

      const cur = scriptRows[currentSceneIndex];
      const sceneNumber = cur?.scene_number ?? (currentSceneIndex + 1);
      // Use selected regen model if provided, else current scene's model
      const selectedRegen = (regenModel || '').toUpperCase();
      const currentSceneModel = String(scriptRows?.[currentSceneIndex]?.model || scriptRows?.[currentSceneIndex]?.mode || '').toUpperCase();
      const modelUpper = selectedRegen || currentSceneModel || 'SORA';
      let body = {
        user: userForBody,
        session: sessionForBody,
        scene_number: sceneNumber,
        user_query: (regenModel === 'PLOTLY' && regenDocSummary) ? regenDocSummary : (userQuery || ''),
        model: modelUpper,
        action: 'regenerate'
      };
      if (modelUpper === 'VEO3' || modelUpper === 'ANCHOR') {
        const presetBucket = presenterPresets[modelUpper] || [];
        const list = Array.isArray(presetBucket) ? presetBucket : [];
        const selectedPreset = list.find(
          (preset) => String(preset?.preset_id) === String(regenPresenterPresetId || '')
        );
        if (regenPresenterPresetId && selectedPreset) {
          if (modelUpper === 'ANCHOR') {
            // For ANCHOR model, use the correct format with preset (anchor_id) and is_custom
            const anchorId = selectedPreset?.anchor_id || selectedPreset?.anchorId || '';
            if (anchorId) {
              body.presenter_options = {
                preset: String(anchorId),
                is_custom: false
              };
            } else {
              body.presenter_options = {
                preset: String(selectedPreset.preset_id || ''),
                is_custom: false
              };
            }
          } else if (modelUpper === 'VEO3') {
            // For VEO3, set both preset_id and preset fields
          const presenterPayload = {
            preset_id: String(selectedPreset.preset_id),
            preset: String(selectedPreset.preset_id), // Also set preset field for proper matching
            option: selectedPreset.option || regenPresenterPresetLabel || ''
          };
          if (selectedPreset.sample_video) {
            presenterPayload.sample_video = selectedPreset.sample_video;
          }
          body.presenter_options = presenterPayload;
          } else {
            // For other models, use the existing format
          const presenterPayload = {
            preset_id: String(selectedPreset.preset_id),
            option: selectedPreset.option || regenPresenterPresetLabel || ''
          };
          if (selectedPreset.sample_video) {
            presenterPayload.sample_video = selectedPreset.sample_video;
          }
          body.presenter_options = presenterPayload;
          }
        } else if (regenPresenterPresetLabel || regenPresenterPresetId) {
          if (modelUpper === 'ANCHOR') {
            // For ANCHOR, try to find preset by preset_id to get anchor_id
            const fallbackPreset = list.find(
              (preset) => String(preset?.preset_id) === String(regenPresenterPresetId || '')
            );
            const anchorId = fallbackPreset?.anchor_id || fallbackPreset?.anchorId || regenPresenterPresetId || '';
            body.presenter_options = {
              preset: String(anchorId),
              is_custom: false
            };
          } else {
          body.presenter_options = {
            preset_id: String(regenPresenterPresetId || ''),
            option: regenPresenterPresetLabel || ''
          };
          }
        } else {
          body.presenter_options = {};
        }
      }
      if (modelUpper === 'PLOTLY') {
        body.chart_type = (regenChartType || scriptRows?.[currentSceneIndex]?.chart_type || scriptRows?.[currentSceneIndex]?.chartType || '').toLowerCase();
        if (regenChartData && typeof regenChartData === 'string') {
          try { body.chart_data = JSON.parse(regenChartData); } catch(_) {}
        }
      }

      const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/${regenPath}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`${regenPath} failed: ${resp.status} ${text}`);

      const container = data?.script ? { script: data.script } : data;
      try {
        localStorage.setItem(scopedKey('updated_script_structure'), JSON.stringify(container));
        localStorage.setItem(scopedKey('original_script_hash'), JSON.stringify(container));
      } catch (_) { /* noop */ }

      const normalized = normalizeScriptToRows(container);
      const newRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
      setScriptRows(newRows);
      // Keep focus on same (regenerated) scene index where possible
      const nextIdx = Math.min(currentSceneIndex, Math.max(0, newRows.length - 1));
      setCurrentSceneIndex(nextIdx);
      setHasOrderChanged(false);
      setCanUndo(true); setCanRedo(false);
      setShowRegenModal(false);
    } catch (e) {
      console.error('Regenerate scene failed:', e);
      alert('Failed to regenerate scene. Please try again.');
    } finally { setIsRegenerating(false); }
  };
  // Delete current scene
  const handleDeleteScene = async () => {
    if (isDeletingScene) return;
    setIsDeletingScene(true);
    try {
      if (!Array.isArray(scriptRows) || scriptRows.length === 0) return;
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
      const cur = scriptRows[currentSceneIndex];
      const sceneNumber = cur?.scene_number ?? (currentSceneIndex + 1);

      // Use a unified delete endpoint regardless of video type
      const deleteEndpointPath = 'scripts/delete-scene';

      // 3) Build user payload EXACTLY from user-session-data.user_data
      //    Do not reshape; use as-is. If absent, stop with a clear error.
      let userPayload = undefined;
      if (sessionDataResponse && typeof sessionDataResponse.user_data === 'object') {
        userPayload = sessionDataResponse.user_data;
      } else if (sd && typeof sd.user_data === 'object') {
        userPayload = sd.user_data;
      } else {
        throw new Error('user_data missing in user-session-data response');
      }

      // 4) Build delete payload with { user, session, scene_number }
      //    - Map session_data -> session
      //    - Do NOT include user_data/session_data at the top-level
      //    - Include scene_number as a top-level field per requirement
      // Preserve ALL fields from session_data, including nested structures
      const sessionForBody = sanitizeSessionSnapshot(sd, sessionId, token);
      const body = { user: userPayload, session: sessionForBody, scene_number: sceneNumber };
      try { console.log('[delete-scene] endpoint:', deleteEndpointPath, 'body:', body); } catch (_) { /* noop */ }
      // 5) Call unified delete endpoint
      const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/${deleteEndpointPath}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`${deleteEndpointPath} failed: ${resp.status} ${text}`);

      const container = data?.script ? { script: data.script } : data;
      try {
        localStorage.setItem(scopedKey('updated_script_structure'), JSON.stringify(container));
        localStorage.setItem(scopedKey('original_script_hash'), JSON.stringify(container));
      } catch (_) { /* noop */ }

      const normalized = normalizeScriptToRows(container);
      const newRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
      setScriptRows(newRows);
      // Shift active tab to same index (or last if removed last)
      const nextIndex = Math.min(currentSceneIndex, Math.max(0, newRows.length - 1));
      setCurrentSceneIndex(nextIndex);
      setHasOrderChanged(false);
      // After delete, enable undo; redo disabled until an undo occurs
      setCanUndo(true); setCanRedo(false);
      // Trigger script refresh callback if provided
      if (onScriptChange) {
        onScriptChange();
      }
    } catch (e) {
      console.error('Delete scene failed:', e);
      alert('Failed to delete scene. Please try again.');
    } finally { setIsDeletingScene(false); }
  };

  // Add Scene helpers
  const openAddSceneModal = (index) => {
    try {
      // Fresh start every time Add Scene is opened. Always insert at end.
      setInsertSceneIndex(Array.isArray(scriptRows) ? scriptRows.length : 0);
      setNewSceneDescription('');
      setNewSceneVideoType('Avatar Based');
      setAddSceneStep(1);
      setSceneSuggestions([]);
      setNewSceneChartType('');
      setNewSceneChartData('');
      setNewSceneDocSummary('');
      setNewSceneContent('');
      setNewSceneSelectedIdx(-1);
      setIsUploadingNewSceneDoc(false);
      setNewScenePresenterPresetId('');
      setNewScenePresenterPresetLabel('');
      setNewScenePresenterError('');
      setIsLoadingNewScenePresenter(false);
      setRequiresAvatarPresenterSelection(false);
      setShowAddSceneModal(true);
    } catch (_) { /* noop */ }
  };

  const openGenerateSummaryPrompt = () => {
    try {
      const total = Array.isArray(scriptRows) ? scriptRows.length : 0;
      const fallback = total > 0 ? Math.min((currentSceneIndex ?? 0) + 1, total) : 1;
      setGenerateSummaryPosition(String(fallback));
    } catch (_) {
      setGenerateSummaryPosition('1');
    }
    setGenerateSummaryError('');
    setShowGenerateSummaryModal(true);
  };

  const closeGenerateSummaryPrompt = () => {
    if (isGeneratingSummary) return;
    setShowGenerateSummaryModal(false);
  };

  const handleGenerateSummary = async () => {
    try {
      const totalScenes = Array.isArray(scriptRows) ? scriptRows.length : 0;
      if (!totalScenes) {
        setGenerateSummaryError('No scenes available to summarize.');
        return;
      }
      let parsed = parseInt(generateSummaryPosition, 10);
      if (Number.isNaN(parsed) || parsed < 1) parsed = 1;
      if (parsed > totalScenes) parsed = totalScenes;
      const position = Math.max(0, parsed - 1);

      setIsGeneratingSummary(true);
      setGenerateSummaryError('');
      const { session, user } = await buildSessionAndUserForScene();
      const payload = { session, user, position };
      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/generate-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const text = await resp.text();
      let data;
      try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`generate-summary failed: ${resp.status} ${text}`);
      try { console.log('[generate-summary] success', { payload, data }); } catch (_) { /* noop */ }
      const container = data?.script ? { script: data.script } : data;
      try {
        localStorage.setItem(scopedKey('updated_script_structure'), JSON.stringify(container));
        localStorage.setItem(scopedKey('original_script_hash'), JSON.stringify(container));
      } catch (_) { /* noop */ }
      applyScriptContainer(container, { can_undo: data?.can_undo, can_redo: data?.can_redo });
      try {
        const normalized = normalizeScriptToRows(container);
        const rows = Array.isArray(normalized?.rows) ? normalized.rows : [];
        if (rows.length > 0) {
          const nextIdx = Math.min(position, rows.length - 1);
          setCurrentSceneIndex(nextIdx);
        }
      } catch (_) { /* noop */ }
      setShowGenerateSummaryModal(false);
    } catch (err) {
      const message = err?.message || 'Failed to generate summary.';
      setGenerateSummaryError(message);
      try { console.error('generate-summary failed:', err); } catch (_) { /* noop */ }
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleSaveCustomDesc = async () => {
    try {
      setIsSavingCustomDesc(true);
      if (!Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) {
        throw new Error('No scene available');
      }
      const scene = scriptRows[currentSceneIndex];
      const sceneNumber = scene?.scene_number ?? (currentSceneIndex + 1);
      const { session, user } = await buildSessionAndUserForScene();
      const token = localStorage.getItem('token') || '';
      const formattedUser = formatUserForVisual(user, token);
      const formattedSession = formatSessionForVisual(
        session,
        session?.session_id,
        session?.user_id
      );
      const payload = {
        user: formattedUser,
        session: formattedSession,
        scene_number: Number(sceneNumber) || 0,
        custom_desc: customDescDescription
      };
      const resp = await fetch(
        'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/custom-desc',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );
      const text = await resp.text();
      if (!resp.ok) {
        throw new Error(`custom-desc failed: ${resp.status} ${text}`);
      }
      setShowCustomDescModal(false);
      // Refresh script after save
      try {
        const data = text ? JSON.parse(text) : {};
        const container = data?.script ? { script: data.script } : data;
        if (container && (container.script || Object.keys(container).length > 0)) {
          const normalized = normalizeScriptToRows(container);
          const newRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
          setScriptRows(newRows);
        }
      } catch (_) { /* noop */ }
    } catch (err) {
      console.error('custom-desc save failed:', err);
      alert(err?.message || 'Failed to save custom description');
    } finally {
      setIsSavingCustomDesc(false);
    }
  };

  // Helper to build session + user payload from user-session-data
  const buildSessionAndUserForScene = async () => {
    const sessionId = localStorage.getItem('session_id');
    const token = localStorage.getItem('token');
    if (!sessionId || !token) throw new Error('Missing session_id or token');
    const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
    });
    const text = await resp.text();
    let json; try { json = JSON.parse(text); } catch(_) { json = {}; }
    if (!resp.ok) throw new Error(`user-session/data failed: ${resp.status} ${text}`);
    const sd = json?.session_data || json?.session || {};
    const user = json?.user_data || sd?.user_data || sd?.user || {};
    // Preserve ALL fields from session_data, including nested structures
    const session = sanitizeSessionSnapshot(sd, sessionId, token);
    return { session, user, rawSession: sd, rawUser: user };
  };

  const fetchPresenterPresetsForModel = React.useCallback(
    async (modelUpper) => {
      const upper = String(modelUpper || '').toUpperCase();
      if (!enablePresenterOptions || (upper !== 'VEO3' && upper !== 'ANCHOR')) return [];
      const existing = Array.isArray(presenterPresets[upper]) ? presenterPresets[upper] : [];
      if (existing.length > 0) return existing;
      try {
        const { rawSession, rawUser } = await buildSessionAndUserForScene();
        const token = localStorage.getItem('token') || '';
        const userId =
          rawUser?.id ||
          rawUser?.user_id ||
          rawUser?._id ||
          token;
        const rawAspect =
          extractAspectRatioFromSessionPayload({
            session_data: rawSession,
            session: rawSession,
            user_data: rawUser,
            user: rawUser
          }) || sessionTemplateAspect;
        const normalizedAspect = normalizeTemplateAspectLabel(rawAspect);
        const params = new URLSearchParams();
        if (userId) params.set('user_id', String(userId));
        params.set('mode', upper === 'VEO3' ? 'veo3_presets' : 'anchor_presets');
        if (normalizedAspect && normalizedAspect !== 'Unspecified') {
          params.set('aspect_ratio', normalizedAspect);
        }
        const url = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/presets?${params.toString()}`;
        const resp = await fetch(url, { method: 'GET' });
        const text = await resp.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = text;
        }
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
            if (typeof item === 'string') {
              return { option: item, preset_id: String(item) };
            }
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
              // Normalize preview URL and type (image or video)
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
              return {
                option,
                preset_id: String(presetId),
                anchor_id: anchorId ? String(anchorId) : undefined,
                sample_video: rawPreviewUrl || '',
                sample_video_type: sampleVideoType
              };
            }
            return null;
          })
          .filter(Boolean);
        setPresenterPresets((prev) => ({
          ...prev,
          [upper]: normalizedList
        }));
        setPresenterPresetsError('');
        return normalizedList;
      } catch (err) {
        console.warn('Failed to fetch presenter presets for add-scene:', err);
        setPresenterPresets((prev) => ({
          ...prev,
          [upper]: []
        }));
        setPresenterPresetsError(err?.message || 'Failed to load presenter presets');
        return [];
      }
    },
    [enablePresenterOptions, presenterPresets, sessionTemplateAspect, buildSessionAndUserForScene]
  );

  // Add-scene via API with given content (used by suggestions and manual)
  const addSceneViaAPI = async (sceneContent) => {
    try {
      if (isAddingScene) return;
      const { session, user } = await buildSessionAndUserForScene();
      setIsAddingScene(true);
      const total = Array.isArray(scriptRows) ? scriptRows.length : 0;
      // Always add at the last position
      const idx = total;
      const desiredModel =
        newSceneVideoType === 'Avatar Based'
          ? (newSceneAvatarType === 'Anchor' ? 'ANCHOR' : 'VEO3')
          : newSceneVideoType === 'Infographic'
            ? 'SORA'
            : newSceneVideoType === 'Financial'
              ? 'PLOTLY'
              : String(scriptRows?.[currentSceneIndex]?.model || scriptRows?.[currentSceneIndex]?.mode || 'SORA');
      let body = {
        user,
        session,
        insert_position: idx,
        scene_content: (newSceneVideoType === 'Financial' && newSceneDocSummary) ? newSceneDocSummary : (sceneContent || ''),
        model_type: desiredModel
      };
      if (desiredModel === 'VEO3') {
        const selectedPreset = (Array.isArray(presenterPresets.VEO3) ? presenterPresets.VEO3 : []).find(
          (preset) => String(preset?.preset_id) === String(newScenePresenterPresetId || '')
        );
        if (newScenePresenterPresetId && selectedPreset) {
          const presenterPayload = {
            preset_id: String(selectedPreset.preset_id),
            preset: String(selectedPreset.preset_id), // For VEO3, also set preset field
            option: selectedPreset.option || newScenePresenterPresetLabel || ''
          };
          if (selectedPreset.sample_video) {
            presenterPayload.sample_video = selectedPreset.sample_video;
          }
          body.presenter_options = presenterPayload;
        } else if (newScenePresenterPresetLabel || newScenePresenterPresetId) {
          body.presenter_options = {
            preset_id: String(newScenePresenterPresetId || ''),
            preset: String(newScenePresenterPresetId || ''), // For VEO3, also set preset field
            option: newScenePresenterPresetLabel || ''
          };
        } else {
          body.presenter_options = {};
        }
      }
      if (desiredModel === 'PLOTLY') {
        body.chart_type = (newSceneChartType || scriptRows?.[currentSceneIndex]?.chart_type || scriptRows?.[currentSceneIndex]?.chartType || '').toLowerCase();
        if (newSceneChartData && typeof newSceneChartData === 'string') {
          try { body.chart_data = JSON.parse(newSceneChartData); } catch(_) { /* ignore parse error */ }
        }
      }

      const addResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/add-scene', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const addText = await addResp.text();
      let addData; try { addData = JSON.parse(addText); } catch(_) { addData = addText; }
      if (!addResp.ok) throw new Error(`scripts/add-scene failed: ${addResp.status} ${addText}`);
      // Update UI
      const container = addData?.reordered_script ?? addData;
      try {
        localStorage.setItem(scopedKey('updated_script_structure'), JSON.stringify(container));
        localStorage.setItem(scopedKey('original_script_hash'), JSON.stringify(container));
        const normalized = normalizeScriptToRows(container);
        const newRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
        setScriptRows(newRows);
        const selIndex = Math.min(Math.max(0, idx), Math.max(0, newRows.length - 1));
        setCurrentSceneIndex(selIndex);
        setHasOrderChanged(false);
        setCanUndo(true); setCanRedo(false);
      } catch(_) {}
      setShowAddSceneModal(false);
      // Trigger script refresh callback if provided
      if (onScriptChange) {
        onScriptChange();
      }
    } catch (e) {
      console.error('Add scene failed:', e);
      alert('Failed to add scene. Please try again.');
    } finally {
      setIsAddingScene(false);
    }
  };

  const handleAvatarPresenterNext = async () => {
    try {
      if (!requiresAvatarPresenterSelection) return;
      setNewScenePresenterError('');
      if (!newScenePresenterPresetId) {
        setNewScenePresenterError('Please select a presenter option before continuing.');
        return;
      }
      const total = Array.isArray(scriptRows) ? scriptRows.length : 0;
      const idx =
        (typeof insertSceneIndex === 'number' && insertSceneIndex >= 0 && insertSceneIndex <= total)
          ? insertSceneIndex
          : total;
      setSceneSuggestions([]);
      setNewSceneSelectedIdx(-1);
      setNewSceneContent('');
      setNewSceneDescription('');
      setAddSceneStep(3);
      const avatarModelUpperForNewScene =
        newSceneVideoType === 'Avatar Based'
          ? (newSceneAvatarType === 'Anchor' ? 'ANCHOR' : 'VEO3')
          : 'SORA';
      await fetchSceneSuggestions(avatarModelUpperForNewScene, idx, 'add');
    } catch (err) {
      console.error('Failed to continue add-scene flow for presenter selection:', err);
      setNewScenePresenterError(err?.message || 'Failed to load scene suggestions. Please try again.');
      setAddSceneStep(2);
    }
  };

  const handleRegenPresenterNext = async () => {
    try {
      if (!requiresRegenPresenterSelection) return;
      setRegenPresenterError('');
      if (!regenPresenterPresetId) {
        setRegenPresenterError('Please select a presenter option before continuing.');
        return;
      }
      const total = Array.isArray(scriptRows) ? scriptRows.length : 0;
      const idx = Math.min(Math.max(0, currentSceneIndex), Math.max(0, total));
      const modelUpper = normalizeRegenModel(regenModel || 'VEO3');
      setRegenSceneContent('');
      setRegenSelectedIdx(-1);
      setRegenPresenterError('');
      setRegenStep(3);
      await fetchSceneSuggestions(modelUpper || 'VEO3', idx, 'regen');
    } catch (err) {
      console.error('Failed to continue regenerate flow for presenter selection:', err);
      setRegenPresenterError(err?.message || 'Failed to load scene suggestions. Please try again.');
      setRegenStep(2);
    }
  };

  const addSceneToRows = async () => {
    try {
      if (isAddingScene) return;
      // Allow content from: selected suggestion, document summary, or description
      const content = (newSceneDocSummary && newSceneDocSummary.trim()) 
        || (newSceneContent && newSceneContent.trim()) 
        || (newSceneDescription && newSceneDescription.trim()) 
        || '';
      if (!content) { 
        alert('Please select a suggested scene, enter a description, or upload a document to provide scene content.'); 
        return; 
      }
      await addSceneViaAPI(content);
    } catch (e) {
      console.error('Add scene failed:', e);
      alert('Failed to add scene. Please try again.');
    } finally {
      setIsAddingScene(false);
    }
  };
  // Generate Script directly from Chat using saved questionnaire and guidelines
  const generateScriptFromChat = async () => {
    try {
      setIsGeneratingScript(true);
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      const guidelinesRaw = localStorage.getItem('guidelines_payload');
      const dynamicAnswersRaw = localStorage.getItem('dynamic_answers');
      const guidelines = guidelinesRaw ? JSON.parse(guidelinesRaw) : null;
      const aiQues = dynamicAnswersRaw ? JSON.parse(dynamicAnswersRaw) : [];
      const wrapAdditional = (value) => {
        if (value && typeof value === 'object' && Object.keys(value).length) return { additionalProp1: value };
        return { additionalProp1: {} };
      };
      const toAdditionalArray = (items) => {
        if (!Array.isArray(items) || items.length === 0) return [wrapAdditional({})];
        return items.map(item => wrapAdditional(item && typeof item === 'object' ? item : { value: item }));
      };
      const mapToStringArray = (arr) => {
        if (!Array.isArray(arr) || arr.length === 0) return [];
        return arr
          .map(item => {
            if (typeof item === 'string') return item;
            if (item && typeof item === 'object') {
              return item.name || item.title || item.url || item.id || JSON.stringify(item);
            }
            return item != null ? String(item) : '';
          })
          .filter(Boolean);
      };

      const mapVoiceoverObjects = (arr = []) => {
        if (!Array.isArray(arr)) return [];
        return arr
          .map(item => {
            if (!item || typeof item !== 'object') return null;
            const url = item.url || item.audio_url || item.file || item.link || '';
            if (!url) return null;
            return {
              url,
              name: item.name || item.voiceover_name || item.title || '',
              type: item.type || item.voiceover_type || '',
              created_at: item.created_at || item.uploaded_at || item.timestamp || new Date().toISOString()
            };
          })
          .filter(Boolean);
      };

      // Pull latest user message from current chat history
      let lastUserMessage = '';
      try {
        const last = [...(chatHistory || [])].reverse().find(m => m?.type === 'user' && typeof m?.content === 'string');
        if (last) lastUserMessage = last.content;
      } catch (_) { /* noop */ }

      // Fetch current session data (do not fabricate)
      let sessionPayload = {};
      let userPayload = undefined;
      let resolvedVideoDuration = '60';
      let resolvedVideoTone = 'professional';
      try {
        const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: token, session_id: sessionId })
        });
        if (resp.ok) {
          const sessionDataResponse = await resp.json();
          const sd = sessionDataResponse?.session_data || {};
          // Use complete user_data (includes brand_identity) when available
          userPayload = (sessionDataResponse?.user_data || sd?.user_data || sd?.user || undefined);
          resolvedVideoDuration = sd?.video_duration != null ? String(sd.video_duration) : '60';
          resolvedVideoTone = sd?.video_tone || sd?.videoTone || 'professional';
          const resolvedVideoType = sd?.videoType || sd?.video_type || '';
          sessionPayload = {
            session_id: sd?.id || sd?.session_id || sessionId || '',
            user_id: sd?.user_id || token || '',
            title: sd?.title || '',
            video_duration: resolvedVideoDuration,
            created_at: sd?.created_at || new Date().toISOString(),
            updated_at: sd?.updated_at || new Date().toISOString(),
            document_summary: toAdditionalArray(sd?.document_summary),
            messages: toAdditionalArray(sd?.messages),
            total_summary: mapToStringArray(sd?.total_summary),
            scripts: mapToStringArray(sd?.scripts),
            videos: toAdditionalArray(sd?.videos),
            images: mapToStringArray(sd?.images),
            final_link: sd?.final_link || '',
            videoType: resolvedVideoType,
            brand_style_interpretation: wrapAdditional(sd?.brand_style_interpretation || {}),
            additionalProp1: wrapAdditional({})
          };
        }
      } catch (_) { /* noop */ }

      // Normalize user brand_identity to ensure fields are populated (icons vs icon, etc.)
      let normalizedUser = undefined;
      if (userPayload && typeof userPayload === 'object') {
        const bi = userPayload.brand_identity || {};
        const normalizedBI = {
          logo: Array.isArray(bi.logo) ? bi.logo : (Array.isArray(bi.logos) ? bi.logos : []),
          icon: Array.isArray(bi.icon) ? bi.icon : (Array.isArray(bi.icons) ? bi.icons : []),
          colors: Array.isArray(bi.colors) ? bi.colors : [],
          fonts: Array.isArray(bi.fonts) ? bi.fonts : [],
          spacing: (bi.spacing != null ? bi.spacing : (bi.spacing_scale != null ? bi.spacing_scale : '')),
          tagline: bi.tagline || ''
        };
        normalizedUser = {
          id: userPayload.id || userPayload.user_id || token || '',
          email: userPayload.email || '',
          display_name: userPayload.display_name || userPayload.name || '',
          created_at: userPayload.created_at || new Date().toISOString(),
          folder_url: userPayload.folder_url || '',
          brand_identity: wrapAdditional(normalizedBI),
          tone_and_voice: wrapAdditional(userPayload.tone_and_voice || {}),
          look_and_feel: wrapAdditional(userPayload.look_and_feel || {}),
          templates: mapToStringArray(userPayload.templates),
          voiceover: mapVoiceoverObjects(userPayload.voiceover)
        };
        // Only include avatar_url if it has a non-empty value
        const avatarUrlValue = userPayload.avatar_url || userPayload.avatar || '';
        if (avatarUrlValue && avatarUrlValue.trim()) {
          normalizedUser.avatar_url = avatarUrlValue.trim();
        }
      }
      const additionalInstructions = {
        ai_questions: Array.isArray(aiQues) ? aiQues : [],
        guidelines: guidelines || null
      };

      const fallbackUser = {
          id: token || '',
          email: '',
          display_name: '',
          created_at: new Date().toISOString(),
          folder_url: '',
          brand_identity: wrapAdditional({}),
          tone_and_voice: wrapAdditional({}),
          look_and_feel: wrapAdditional({}),
          templates: [],
          voiceover: []
        };
      const requestPayload = {
        user: normalizedUser || fallbackUser,
        session: Object.keys(sessionPayload).length ? sessionPayload : {
          session_id: sessionId || '',
          user_id: token || '',
          title: '',
          video_duration: '60',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          document_summary: [wrapAdditional({})],
          messages: [wrapAdditional({})],
          total_summary: [],
          scripts: [],
          videos: [wrapAdditional({})],
          images: [],
          final_link: '',
          videoType: '',
          brand_style_interpretation: wrapAdditional({}),
          additionalProp1: wrapAdditional({})
        },
        video_length: Number(resolvedVideoDuration) || 60,
        video_tone: resolvedVideoTone || 'professional',
        user_query: lastUserMessage || '',
        additional_instructions: JSON.stringify(Object.keys(additionalInstructions).length ? additionalInstructions : {})
      };

      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestPayload)
      });
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`HTTP ${resp.status}: ${text}`);
      }
      const data = await resp.json();
      try {
        localStorage.setItem(scopedKey('has_generated_script'), 'true');
        localStorage.setItem(scopedKey('last_generated_script'), JSON.stringify(data));
        localStorage.removeItem('has_generated_script');
        localStorage.removeItem('last_generated_script');
      } catch (_) { /* noop */ }

      // Append AI message with script
      setChatHistory(prev => {
        const aiMessage = {
          id: Date.now(),
          type: 'ai',
          content: 'Your script is ready. You can view it or generate the video.',
          script: data,
          timestamp: new Date().toISOString()
        };
        const next = [...prev, aiMessage];
        try { localStorage.setItem(scopedKey('chat_history'), JSON.stringify(next)); } catch (_) { /* noop */ }
        return next;
      });

      // Open modal immediately using React state
      try {
        // Open the script modal with the generated script data
        openScriptModal(data);
      } catch (_) { /* noop */ }
    } catch (e) {
      console.error('Error generating script from chat:', e);
      alert('Failed to generate script. Please try again.');
    } finally {
      setIsGeneratingScript(false);
    }
  };

  // Handle file selection
  const handleFileSelect = async (event) => {
    const files = Array.from(event.target.files);
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.presentationml.presentation', // pptx
      'application/vnd.ms-powerpoint', // ppt
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // docx
      'application/msword', // doc
      'text/csv', // csv
      'application/vnd.ms-excel', // xls
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' // xlsx
    ];

    const validFiles = files.filter(file => {
      const type = (file?.type || '').toLowerCase();
      const name = (file?.name || '').toLowerCase();
      const byMime = allowedTypes.includes(type);
      const byExt = ['.pdf','.ppt','.pptx','.doc','.docx','.csv','.xls','.xlsx'].some(ext => name.endsWith(ext));
      if (byMime || byExt) return true;
      alert(`File ${file.name} is not a supported format. Please upload PDF, PPT, PPTX, DOC, DOCX, CSV, XLS, or XLSX.`);
      return false;
    });

    if (validFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...validFiles]);
      
             // Process documents: extract API then summary API
       await processDocuments(validFiles);
    }
  };

  // Remove uploaded file
  const removeFile = (index) => {
    setUploadedFiles(prev => prev.filter((_, i) => i !== index));
  };
  // Get file icon based on type
  const getFileIcon = (file) => {
    const type = (file?.type || '').toLowerCase();
    const name = (file?.name || '').toLowerCase();
    if (type.includes('pdf') || name.endsWith('.pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (type.includes('powerpoint') || type.includes('presentation') || name.endsWith('.ppt') || name.endsWith('.pptx')) {
      return <FileText className="w-5 h-5 text-orange-500" />;
    } else if (type.includes('word') || type.includes('document') || name.endsWith('.doc') || name.endsWith('.docx')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    } else if (type.includes('csv') || name.endsWith('.csv')) {
      return <FileText className="w-5 h-5 text-green-600" />;
    } else if (type.includes('excel') || type.includes('spreadsheet') || name.endsWith('.xls') || name.endsWith('.xlsx') || type.includes('vnd.ms-excel') || type.includes('vnd.openxmlformats-officedocument.spreadsheetml.sheet')) {
      return <FileText className="w-5 h-5 text-green-600" />;
    }
    return <File className="w-5 h-5 text-gray-500" />;
  };

  // Icon helper for messages created from summary (docMeta)
  const getDocIconByName = (name) => {
    const lower = (name || '').toLowerCase();
    if (lower.endsWith('.pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return <FileText className="w-5 h-5 text-orange-500" />;
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return <FileText className="w-5 h-5 text-blue-500" />;
    if (lower.endsWith('.csv') || lower.endsWith('.xls') || lower.endsWith('.xlsx')) return <FileText className="w-5 h-5 text-green-600" />;
    return <File className="w-5 h-5 text-gray-500" />;
  };

  // Step 1: Call extract API only
  const processDocuments = async (files) => {
    if (files.length === 0) return;

    setIsUploading(true);
    
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');

      if (!sessionId || !token) {
        throw new Error('Missing session_id or token');
      }

      // Determine authoritative video type from user-session-data
      let isFinancialVT = false;
      try {
        const vtResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
        });
        const vtText = await vtResp.text();
        let vtData; try { vtData = JSON.parse(vtText); } catch(_) { vtData = vtText; }
        const sd = vtData?.session_data || vtData?.session || {};
        const vtLower = ((sd?.videoType || sd?.video_type || '') + '').toLowerCase();
        isFinancialVT = vtLower === 'financial' || vtLower.includes('financial');
      } catch (_) { /* noop */ }

      // Process each file sequentially
      for (const file of files) {
        try {
          // Call extract API
          const extractFormData = new FormData();
          extractFormData.append('files', file);
          extractFormData.append('user_id', token);

          console.log('Calling extract API for file:', file.name);
          try {
            // Unified extract endpoint for all video types
            const extractUrl = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/documents/extract_documents`;
            const extractResponse = await fetch(extractUrl, {
              method: 'POST',
              body: extractFormData
            });

            if (!extractResponse.ok) {
              throw new Error(`Document extraction failed for ${file.name}: ${extractResponse.status}`);
            }

            const extractData = await extractResponse.json();
            console.log('Extract API Response for', file.name, ':', extractData);
            // Store extract data for later use in summary API
            file.extractData = extractData;
            // Log the documents array structure
            if (extractData.documents && Array.isArray(extractData.documents)) {
              console.log('Documents array from API:', extractData.documents);
              console.log('Number of documents:', extractData.documents.length);
              extractData.documents.forEach((doc, index) => {
                console.log(`Document ${index + 1}:`, doc);
                if (doc.additionalProp1) {
                  console.log(`Document ${index + 1} additionalProp1:`, doc.additionalProp1);
                }
              });
            } else {
              console.log('No documents array found in response or invalid structure');
            }
          } catch (extractErr) {
            console.error(`Error extracting file ${file.name}:`, extractErr);
          }
        } catch (fileError) {
          console.error(`Error extracting file ${file.name}:`, fileError);
        }
      }

    } catch (error) {
      console.error('Error calling extract API:', error);
    } finally {
      setIsUploading(false);
    }
  };

  // Step 2: Call summary API when user clicks chat button
    const callSummaryAPI = async (file) => {
      if (!file.extractData) {
        console.error('No extract data available for file:', file.name);
        return;
      }
  
      try {
        const sessionId = localStorage.getItem('session_id');
        const token = localStorage.getItem('token');
  
        if (!sessionId || !token) {
          throw new Error('Missing session_id or token');
        }
  
        // Prepare request body according to API specification
        // Use the extract API response directly for the documents array when available
        // Build documents array for summary from extract response (robust to shapes)
        let documentsFromExtract = [];
        if (Array.isArray(file.extractData?.documents)) {
          documentsFromExtract = file.extractData.documents;
        } else if (Array.isArray(file.extractData)) {
          documentsFromExtract = file.extractData;
        } else if (file.extractData && (file.extractData.documentName || file.extractData.slides)) {
          documentsFromExtract = [file.extractData];
        } else {
          documentsFromExtract = [];
        }

        // Build session object from user-session-data API as source of truth
        let sessionObj = {};
        try {
          const sessResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: token, session_id: sessionId })
          });
          const text = await sessResp.text();
          let json; try { json = JSON.parse(text); } catch (_) { json = {}; }
          const sd = json?.session_data || json?.session || {};
          // Normalize to required schema
          sessionObj = {
            session_id: sd.id || sd.session_id || sessionId,
            user_id: sd.user_id || token,
            content: Array.isArray(sd.content) ? sd.content : [],
            document_summary: Array.isArray(sd.document_summary) ? sd.document_summary : [{ additionalProp1: {} }],
            video_duration: String(sd.video_duration || sd.videoduration || '60'),
            created_at: sd.created_at || new Date().toISOString(),
            totalsummary: Array.isArray(sd.totalsummary) ? sd.totalsummary : [],
            messages: Array.isArray(sd.messages) ? sd.messages : [],
            scripts: Array.isArray(sd.scripts) ? sd.scripts : [],
            videos: Array.isArray(sd.videos) ? sd.videos : [],
            images: Array.isArray(sd.images) ? sd.images : [],
            final_link: sd.final_link || '',
            videoType: sd.videoType || sd.video_type || '',
            additionalProp1: sd.additionalProp1 || {}
          };
        } catch (_) {
          sessionObj = {
            session_id: sessionId,
            user_id: token,
            content: [],
            document_summary: [{ additionalProp1: {} }],
            video_duration: '60',
            created_at: new Date().toISOString(),
            totalsummary: [],
            messages: [],
            scripts: [],
            videos: [],
            images: [],
            final_link: '',
            videoType: '',
            additionalProp1: {}
          };
        }

        const requestBody = {
          session: sessionObj,
          documents: documentsFromExtract
        };
  
        console.log('Calling summary API for file:', file.name);
        console.log('Summary API Request Body:', requestBody);
        
        // Determine video type to choose correct summary endpoint (scoped per call)
        let svtLower = 'hybrid';
        try {
          const vtResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: token, session_id: sessionId })
          });
          if (vtResp.ok) {
            const vtJson = await vtResp.json();
            const sd = vtJson?.session_data;
            svtLower = String((sd?.videoType || sd?.video_type || localStorage.getItem(`video_type_value:${sessionId}`) || 'hybrid') || '').toLowerCase();
          } else {
            svtLower = String(localStorage.getItem(`video_type_value:${sessionId}`) || 'hybrid').toLowerCase();
          }
        } catch (_) {
          svtLower = String(localStorage.getItem(`video_type_value:${sessionId}`) || 'hybrid').toLowerCase();
        }

        // Unified summarize endpoint for all video types
        const summaryResponse = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/documents/summarize_documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });
  
        if (!summaryResponse.ok) {
          throw new Error(`Document summary failed for ${file.name}: ${summaryResponse.status}`);
        }
  
        const summaryData = await summaryResponse.json();
        console.log('Summary API Response for', file.name, ':', summaryData);

        // Attempt to generate/update session title after content is summarized (first activity trigger)
        try {
          const sessionId = localStorage.getItem('session_id');
          const userId = localStorage.getItem('token');
          if (sessionId && userId && typeof window !== 'undefined') {
            const key = `session_title_updated:${sessionId}`;
            if (localStorage.getItem(key) !== 'true') {
              const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionId, user_id: userId })
              });
              const text = await resp.text();
              let data; try { data = JSON.parse(text); } catch (_) { data = text; }
              if (resp.ok && (data?.title || data?.updated)) {
                try { localStorage.setItem(key, 'true'); } catch (_) { /* noop */ }
                try { window.dispatchEvent(new CustomEvent('session-title-updated', { detail: { sessionId, title: data?.title } })); } catch (_) { /* noop */ }
              }
            }
          }
        } catch (e) { /* noop */ }

        // Append final output to chat (robust extraction)
        const finalOutput =
          summaryData?.append_message?.airesponse?.final_output ??
          summaryData?.assistant_message?.airesponse?.final_output ??
          summaryData?.airesponse?.final_output ??
          summaryData?.final_output ??
          (Array.isArray(summaryData?.documents?.[0]?.content)
            ? summaryData.documents[0].content.join('\n')
            : undefined);

        // Build user message as document name and size
        // Show full upload section loading until chat completes
        setIsSummarizing(true);
        const now = new Date().toISOString();
        const userDocLabel = `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)`;

        // Push a user message row that visually includes an icon
        setChatHistory(prev => [
          ...prev,
          {
            id: Date.now() + Math.random(),
            type: 'user',
            content: userDocLabel,
            timestamp: now,
            docMeta: { name: file.name }
          }
        ]);

        // Mark next chat as doc-follow-up and call chat API with the userDocLabel
        try { localStorage.setItem(scopedKey('is_doc_followup'), 'true'); } catch (_) { /* noop */ }
        if (typeof window !== 'undefined' && typeof window.markDocFollowup === 'function') {
          window.markDocFollowup();
        }
        // Show thinking while chat API processes
        const thinkingId = Date.now() + Math.random();
        setChatHistory(prev => [
          ...prev,
          { id: thinkingId, type: 'thinking', content: 'AI is thinking...', timestamp: new Date().toISOString() }
        ]);
        try {
          const chatResp = await addUserChat(userDocLabel);
          // Remove thinking
          setChatHistory(prev => prev.filter(m => m.id !== thinkingId));
          // Append AI content from chat API
          const aiOut = chatResp?.assistant_message?.airesponse?.final_output
            ?? chatResp?.append_message?.airesponse?.final_output
            ?? chatResp?.airesponse?.final_output
            ?? chatResp?.final_output
            ?? undefined;
          if (aiOut) {
            setChatHistory(prev => [
              ...prev,
              { id: Date.now() + Math.random(), type: 'ai', content: aiOut, timestamp: new Date().toISOString() }
            ]);
          }
        } catch (e) {
          console.error('Chat API failed after summary doc message:', e);
          setChatHistory(prev => [
            ...prev,
            { id: Date.now() + Math.random(), type: 'error', content: 'Chat failed. Please try again.', timestamp: new Date().toISOString() }
          ]);
        } finally {
          setIsSummarizing(false);
        }
  
      } catch (error) {
        console.error(`Error calling summary API for ${file.name}:`, error);
      }
    };

    // Call summary API once for all processed files, sending the combined extract response after session data
    const callSummaryAPIForAll = async () => {
      try {
        const sessionId = localStorage.getItem('session_id');
        const token = localStorage.getItem('token');

        if (!sessionId || !token) {
          throw new Error('Missing session_id or token');
        }

        // Collect documents from all files that have extractData (robust to response shapes)
        const combinedDocuments = uploadedFiles
          .filter(f => f.extractData)
          .flatMap(f => {
            const ed = f.extractData;
            if (Array.isArray(ed?.documents)) return ed.documents;
            if (Array.isArray(ed)) return ed;
            if (ed && (ed.documentName || ed.slides)) return [ed];
            return [];
          });

        if (combinedDocuments.length === 0) {
          console.warn('No extracted documents available to send. Proceeding with empty documents array.');
        }

        // Build session object from user-session-data API as source of truth
        let sessionObjAll = {};
        try {
          const sessRespAll = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: token, session_id: sessionId })
          });
          const textAll = await sessRespAll.text();
          let jsonAll; try { jsonAll = JSON.parse(textAll); } catch (_) { jsonAll = {}; }
          const sdAll = jsonAll?.session_data || jsonAll?.session || {};
          sessionObjAll = {
            session_id: sdAll.id || sdAll.session_id || sessionId,
            user_id: sdAll.user_id || token,
            content: Array.isArray(sdAll.content) ? sdAll.content : [],
            document_summary: Array.isArray(sdAll.document_summary) ? sdAll.document_summary : [{ additionalProp1: {} }],
            video_duration: String(sdAll.video_duration || sdAll.videoduration || '60'),
            created_at: sdAll.created_at || new Date().toISOString(),
            totalsummary: Array.isArray(sdAll.totalsummary) ? sdAll.totalsummary : [],
            messages: Array.isArray(sdAll.messages) ? sdAll.messages : [],
            scripts: Array.isArray(sdAll.scripts) ? sdAll.scripts : [],
            videos: Array.isArray(sdAll.videos) ? sdAll.videos : [],
            images: Array.isArray(sdAll.images) ? sdAll.images : [],
            final_link: sdAll.final_link || '',
            videoType: sdAll.videoType || sdAll.video_type || '',
            additionalProp1: sdAll.additionalProp1 || {}
          };
        } catch (_) {
          sessionObjAll = {
            session_id: sessionId,
            user_id: token,
            content: [],
            document_summary: [{ additionalProp1: {} }],
            video_duration: '60',
            created_at: new Date().toISOString(),
            totalsummary: [],
            messages: [],
            scripts: [],
            videos: [],
            images: [],
            final_link: '',
            videoType: '',
            additionalProp1: {}
          };
        }

        const requestBody = {
          session: sessionObjAll,
          documents: combinedDocuments
        };

        console.log('Calling summary API for ALL files. Request Body:', requestBody);

        // Determine video type to choose correct summary endpoint
        let vtLower = 'hybrid';
        try {
          const vtResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: token, session_id: sessionId })
          });
          if (vtResp.ok) {
            const vtJson = await vtResp.json();
            const sd = vtJson?.session_data;
            vtLower = String((sd?.videoType || sd?.video_type || localStorage.getItem(`video_type_value:${sessionId}`) || 'hybrid') || '').toLowerCase();
          } else {
            // Fallback to any locally stored value
            vtLower = String(localStorage.getItem(`video_type_value:${sessionId}`) || 'hybrid').toLowerCase();
          }
        } catch (e) {
          // Silently fall back to hybrid if fetch fails
          vtLower = String(localStorage.getItem(`video_type_value:${sessionId}`) || 'hybrid').toLowerCase();
        }

        // Unified summarize endpoint for all video types
        const summaryResponse = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/documents/summarize_documents`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(requestBody)
        });

        if (!summaryResponse.ok) {
          throw new Error(`Document summary failed: ${summaryResponse.status}`);
        }

        const summaryData = await summaryResponse.json();
        console.log('Summary API Response (ALL files):', summaryData);

        // After summarization completes for all files, attempt to set/update the session title once
        try {
          const sessionIdAll = localStorage.getItem('session_id');
          const userIdAll = localStorage.getItem('token');
          if (sessionIdAll && userIdAll && typeof window !== 'undefined') {
            const key = `session_title_updated:${sessionIdAll}`;
            if (localStorage.getItem(key) !== 'true') {
              const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/title', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ session_id: sessionIdAll, user_id: userIdAll })
              });
              const text = await resp.text();
              let data; try { data = JSON.parse(text); } catch (_) { data = text; }
              if (resp.ok && (data?.title || data?.updated)) {
                try { localStorage.setItem(key, 'true'); } catch (_) { /* noop */ }
                try { window.dispatchEvent(new CustomEvent('session-title-updated', { detail: { sessionId: sessionIdAll, title: data?.title } })); } catch (_) { /* noop */ }
              }
            }
          }
        } catch (e) { /* noop */ }

        // Extract final output from summary API response
        const finalOutputAll =
          summaryData?.append_message?.airesponse?.final_output ??
          summaryData?.assistant_message?.airesponse?.final_output ??
          summaryData?.airesponse?.final_output ??
          summaryData?.final_output ??
          (Array.isArray(summaryData?.documents?.[0]?.content)
            ? summaryData.documents[0].content.join('\n')
            : 'Document summary completed successfully.');

        // Show user message for uploaded files
        setIsSummarizing(true);
        const nowAll = new Date().toISOString();
        const userDocRows = uploadedFiles.map(f => ({ 
          id: Date.now() + Math.random(), 
          type: 'user', 
          content: `${f.name} (${(f.size / 1024 / 1024).toFixed(2)} MB)`, 
          timestamp: nowAll, 
          docMeta: { name: f.name } 
        }));
        
        // Add user message showing uploaded files
        setChatHistory(prev => ([ ...prev, ...userDocRows ]));
        
        // Add AI response with final_output from summary API
        setChatHistory(prev => ([
          ...prev,
          { 
            id: Date.now() + Math.random(), 
            type: 'ai', 
            content: finalOutputAll, 
            timestamp: new Date().toISOString() 
          }
        ]));

      // Set flag for subsequent chats to have is_doc_followup: true
        localStorage.setItem(scopedKey('is_doc_followup'), 'true');
        try {
          const sid = localStorage.getItem('session_id');
          if (sid) localStorage.setItem(`has_doc_summary:${sid}`, 'true');
        } catch (_) { /* noop */ }
        
        // Update session data to include the document summary
        try {
          const sessionDataResponse = await sendUserSessionData();
          console.log('Session data updated after summary:', sessionDataResponse);
          
          // Also update the session data in localStorage for immediate use
          if (sessionDataResponse && sessionDataResponse.session_data) {
            localStorage.setItem('last_session_data', JSON.stringify(sessionDataResponse.session_data));
          }
        } catch (sessionError) {
          console.warn('Failed to update session data after summary:', sessionError);
        }

      } catch (error) {
        console.error('Error calling summary API (ALL files):', error);
        // Show error message in chat
        setChatHistory(prev => ([
          ...prev,
          { 
            id: Date.now() + Math.random(), 
            type: 'error', 
            content: 'Failed to summarize documents. Please try again.', 
            timestamp: new Date().toISOString() 
          }
        ]));
      } finally {
        setIsSummarizing(false);
      }
    };

  // CSS styles for animated thinking dots
  const thinkingDotsStyles = `
    .thinking-dots .dot {
      animation: thinking 1.4s infinite ease-in-out;
      display: inline-block;
    }
    .thinking-dots .dot:nth-child(1) { animation-delay: -0.32s; }
    .thinking-dots .dot:nth-child(2) { animation-delay: -0.16s; }
    .thinking-dots .dot:nth-child(3) { animation-delay: 0s; }
    @keyframes thinking {
      0%, 80%, 100% { opacity: 0.3; transform: scale(0.8); }
      40% { opacity: 1; transform: scale(1); }
    }
  `;

  const formatSeconds = (total) => {
    const minutes = String(Math.floor((total || 0) / 60)).padStart(2, '0');
    const seconds = String((total || 0) % 60).padStart(2, '0');
    return `${minutes}:${seconds}`;
  };
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    try {
      setIsLoading(true);
      // Snapshot text then clear input immediately for snappier UX
      const text = inputMessage;
      setInputMessage('');
      try {
        if (chatInputRef && chatInputRef.current) {
          chatInputRef.current.value = '';
          chatInputRef.current.style.height = 'auto';
        }
      } catch (_) { /* noop */ }
      
      // Add user message to chat history
      const userMessage = {
        id: Date.now(),
        type: 'user',
        content: text,
        timestamp: new Date().toISOString()
      };
      
      setChatHistory(prev => [...prev, userMessage]);
      
      // Add thinking message
      const thinkingId = Date.now() + 1;
      const thinkingMessage = {
        id: thinkingId,
        type: 'thinking',
        content: 'AI is thinking...',
        timestamp: new Date().toISOString()
      };
      
      setChatHistory(prev => [...prev, thinkingMessage]);
      setThinkingMessageId(thinkingId);
      
      // Call the addUserChat function (which now handles session data internally)
      const response = await addUserChat(text);
      
      // Remove thinking message and add AI response
      setChatHistory(prev => prev.filter(msg => msg.id !== thinkingId));
      setThinkingMessageId(null);
      
      // Add AI response to chat history
      if (response) {
        const aiResponse = response?.assistant_message?.airesponse?.final_output
          ?? response?.append_message?.airesponse?.final_output
          ?? response?.airesponse?.final_output
          ?? response?.final_output;

        // If AI response is a structured object, treat it as a script
        if (aiResponse && typeof aiResponse === 'object') {
          const now = new Date().toISOString();
          setChatHistory(prev => ([
            ...prev,
            {
              id: Date.now() + 1,
              type: 'ai',
              content: 'Your script is ready. You can view it or generate the video.',
              script: aiResponse,
              timestamp: now
            }
          ]));
          try {
            openScriptModal(aiResponse);
          } catch (_) { /* noop */ }
        } else if (aiResponse) {
          // Regular textual AI message
          const aiMessage = {
            id: Date.now() + 1,
            type: 'ai',
            content: aiResponse,
            timestamp: new Date().toISOString()
          };
          setChatHistory(prev => [...prev, aiMessage]);
        } else {
          // Fallback if the expected structure is not found
          console.log('Full response structure:', response);
          const aiMessage = {
            id: Date.now() + 1,
            type: 'ai',
            content: 'Response received but format unexpected',
            timestamp: new Date().toISOString()
          };
          setChatHistory(prev => [...prev, aiMessage]);
        }
      }
      
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Remove thinking message on error
      if (thinkingMessageId) {
        setChatHistory(prev => prev.filter(msg => msg.id !== thinkingMessageId));
        setThinkingMessageId(null);
      }
      
      // Add error message to chat history
      const errorMessage = {
        id: Date.now() + 1,
        type: 'error',
        content: 'Failed to send message. Please try again.',
        timestamp: new Date().toISOString()
      };
      
      setChatHistory(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Auto-size the chat textarea on mount and when content changes
  useEffect(() => {
    try {
      if (chatInputRef && chatInputRef.current) {
        chatInputRef.current.style.height = 'auto';
        chatInputRef.current.style.height = chatInputRef.current.scrollHeight + 'px';
      }
    } catch (_) { /* noop */ }
  }, [inputMessage]);

  // Keep the visible scene window aligned to the current scene
  useEffect(() => {
    try {
      const total = Array.isArray(scriptRows) ? scriptRows.length : 0;
      const maxStart = Math.max(0, total - 5);
      if (currentSceneIndex < visibleStartIndex) {
        setVisibleStartIndex(currentSceneIndex);
      } else if (currentSceneIndex >= visibleStartIndex + 5) {
        const newStart = Math.min(maxStart, currentSceneIndex - 4);
        setVisibleStartIndex(newStart);
      }
      if (visibleStartIndex > maxStart) setVisibleStartIndex(maxStart);
    } catch (_) { /* noop */ }
  }, [currentSceneIndex, scriptRows]);

  // Drag and Drop handlers for script rows
  const handleDragStart = (e, index) => {
    setDraggedRowIndex(index);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', e.target.outerHTML);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverRowIndex(index);
  };

  const handleDragEnter = (e, index) => {
    e.preventDefault();
    setDragOverRowIndex(index);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setDragOverRowIndex(null);
  };

  const handleDrop = (e, dropIndex) => {
    e.preventDefault();
    if (!Array.isArray(scriptRows) || draggedRowIndex === null || draggedRowIndex === dropIndex) {
      setDragOverRowIndex(null);
      setDraggedRowIndex(null);
      return;
    }

    // Reorder the script rows
    const newScriptRows = [...scriptRows];
    const draggedRow = newScriptRows[draggedRowIndex];
    newScriptRows.splice(draggedRowIndex, 1);
    newScriptRows.splice(dropIndex, 0, draggedRow);

    // Do NOT renumber scenes; preserve original scene_number values

    setScriptRows(newScriptRows);
    
    // Mark that the order has changed
    setHasOrderChanged(true);
    
    setDragOverRowIndex(null);
    setDraggedRowIndex(null);
  };

  const handleDragEnd = () => {
    setDragOverRowIndex(null);
    setDraggedRowIndex(null);
  };

  // Function to update the original script structure with the new row order
  const updateScriptWithNewOrder = (originalScript, newRows) => {
    try {
      // Create a deep copy of the original script
      const updatedScript = JSON.parse(JSON.stringify(originalScript));
      
      // Find the array that contains the script rows/scenes
      const scriptArray = findScriptArray(updatedScript);
      
      if (scriptArray && Array.isArray(scriptArray)) {
        // Update the script array with the new order
        // Map the new rows back to the original script structure
        const updatedArray = newRows.map((newRow, index) => {
          // Find the corresponding original row by matching key properties
          const originalRow = scriptArray.find(origRow => {
            // Try to match by scene number, title, or description
            return (
              (origRow.scene_number === newRow.scene_number) ||
              (origRow.scene_title === newRow.scene_title) ||
              (origRow.title === newRow.scene_title) ||
              (origRow.description === newRow.description) ||
              (origRow.content === newRow.scene_title)
            );
          });
          
          if (originalRow) {
            // Preserve original scene numbering; only reorder array
            return { ...originalRow };
          } else {
            // If no match found, create a new row structure
            return {
              // Preserve incoming numbering from the UI row
              scene_number: newRow.scene_number,
              scene_title: newRow.scene_title,
              title: newRow.scene_title,
              timeline: newRow.timeline,
              time: newRow.timeline,
              duration: newRow.timeline,
              narration: newRow.narration,
              voice_over_script: newRow.narration,
              voice_over: newRow.narration,
              voiceover: newRow.narration,
              voice: newRow.narration,
              description: newRow.description,
              desc: newRow.description,
              additional: newRow.additional,
              additional_info: newRow.additional,
              notes: newRow.additional,
              extra: newRow.additional,
              additionalInformation: newRow.additional
            };
          }
        });
        
        // Replace the original array with the updated one
        replaceScriptArray(updatedScript, updatedArray);
      }
      
      return updatedScript;
    } catch (e) {
      console.warn('Failed to update script with new order:', e);
      return originalScript;
    }
  };

  // Helper function to find the script array in the script structure
  const findScriptArray = (script) => {
    if (!script || typeof script !== 'object') return null;
    
    // Check if script itself is an array
    if (Array.isArray(script)) return script;
    
    // Check common properties that might contain the script array
    const candidates = ['script', 'airesponse', 'scenes', 'rows', 'result', 'output', 'content', 'data'];
    for (const key of candidates) {
      if (Array.isArray(script[key])) {
        return script[key];
      }
    }
    
    return null;
  };

  // Helper function to replace the script array in the script structure
  const replaceScriptArray = (script, newArray) => {
    if (!script || typeof script !== 'object') return;
    
    // Check common properties that might contain the script array
    const candidates = ['script', 'airesponse', 'scenes', 'rows', 'result', 'output', 'content', 'data'];
    for (const key of candidates) {
      if (Array.isArray(script[key])) {
        script[key] = newArray;
        return;
      }
    }
    
    // If no array found in common properties, check if script itself should be an array
    if (Array.isArray(script)) {
      // This case is handled by the caller
      return;
    }
  };

  // Function to handle scene updates
  const handleSceneUpdate = (sceneIndex, field, value) => {
    if (!Array.isArray(scriptRows)) {
      console.warn('scriptRows is not an array, cannot update scene');
      return;
    }
    
    if (sceneIndex < 0 || sceneIndex >= scriptRows.length) {
      console.warn('Invalid scene index:', sceneIndex);
      return;
    }
    
    const updatedRows = [...scriptRows];
    updatedRows[sceneIndex] = { ...updatedRows[sceneIndex], [field]: value };
    setScriptRows(updatedRows);
    // Don't set hasOrderChanged here - only set it when order actually changes (drag/drop, move left/right)
    
    // No persistence for edit changes here; save via dedicated actions
  };

  // Function to handle video type selection
  // Request model change: open confirmation dialog first
  const openModelChangeConfirm = (videoType) => {
    try {
      if (!Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) return;
      const scene = scriptRows[currentSceneIndex];
      const desiredModel =
        videoType === 'Avatar Based'
          ? 'VEO3'
          : videoType === 'Financial'
            ? 'PLOTLY'
            : videoType === 'Anchor'
              ? 'ANCHOR'
              : 'SORA';
      const currentModel = (scene?.mode || scene?.model || '').toUpperCase();
      if (currentModel === desiredModel.toUpperCase()) return; // no-op if same
      setPendingModelType(videoType);
      // seed popup fields from current scene
      try {
        setSwitchAvatarUrl('');
        setSwitchPresenterPresetId('');
        setSwitchPresenterPresetLabel('');
        setSwitchChartType(scene?.chart_type || scene?.chartType || '');
        const cd = scene?.chart_data || scene?.chartData;
        setSwitchChartData(cd ? (typeof cd === 'string' ? cd : JSON.stringify(cd, null, 2)) : '');
        // Reset switch model flow state
        setSwitchModelStep(1);
        setSwitchSuggestions([]);
        setSwitchSelectedIdx(-1);
        setSwitchSceneContent('');
      } catch(_) {}
      setShowModelConfirm(true);
      
      // Load presenter presets if switching to Avatar Based or Anchor
      if (enablePresenterOptions && (desiredModel === 'VEO3' || desiredModel === 'ANCHOR')) {
        setIsLoadingSwitchPresenterPresets(true);
        fetchPresenterPresetsForModel(desiredModel)
          .then(() => {
            setIsLoadingSwitchPresenterPresets(false);
          })
          .catch((err) => {
            console.warn('Failed to load presenter presets for switch modal:', err);
            setIsLoadingSwitchPresenterPresets(false);
          });
      }
    } catch (_) { /* noop */ }
  };

  // Helper: wait for session_id/token to exist in localStorage
  const waitForSessionReady = async (timeoutMs = 15000, pollMs = 300) => {
    const start = Date.now();
    // eslint-disable-next-line no-constant-condition
    while (true) {
      try {
        const sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) || '';
        const token = (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
        if (sessionId && token) return { sessionId, token };
      } catch (_) { /* noop */ }
      if (Date.now() - start >= timeoutMs) return { sessionId: '', token: '' };
      await new Promise((r) => setTimeout(r, pollMs));
    }
  };

  // Confirmed: perform the API switch
  const handleVideoTypeSelect = async (videoType) => {
    try {
      if (isSwitchingModel) return;
      // Turn on overlay immediately; keep it until we finish or error
      setIsSwitchingModel(true);
      if (!Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) {
        console.warn('Cannot update video type: invalid scene index');
        setIsSwitchingModel(false);
        return;
      }
      const scene = scriptRows[currentSceneIndex];
      const desiredModel =
        videoType === 'Avatar Based'
          ? 'VEO3'
          : videoType === 'Financial'
            ? 'PLOTLY'
            : videoType === 'Anchor'
              ? 'ANCHOR'
              : 'SORA';
      const currentModel = scene?.mode || scene?.model || '';
      if ((currentModel || '').toUpperCase() === desiredModel.toUpperCase()) {
        setSelectedVideoType(videoType);
        setIsSwitchingModel(false);
        return;
      }
      // 1) Load session snapshot
      let sessionId = (typeof window !== 'undefined' && localStorage.getItem('session_id')) || '';
      let token = (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
      if (!sessionId || !token) {
        const waited = await waitForSessionReady(20000, 300);
        sessionId = waited.sessionId;
        token = waited.token;
      }
      if (!sessionId || !token) throw new Error('Missing session_id or token');
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
      // Build user object: prefer user_data from session response; fallback to localStorage
      let userForBody = undefined;
      if (sessionDataResponse && typeof sessionDataResponse.user_data === 'object') {
        userForBody = sessionDataResponse.user_data;
      } else if (sd && typeof sd.user_data === 'object') {
        userForBody = sd.user_data;
      } else {
        try {
          const raw = localStorage.getItem('user');
          const token = localStorage.getItem('token') || '';
          const u = raw ? JSON.parse(raw) : {};
          userForBody = {
            id: u?.id || token || '',
            email: u?.email || '',
            display_name: u?.display_name || u?.name || '',
            created_at: u?.created_at || '',
            folder_url: u?.folder_url || '',
            brand_identity: u?.brand_identity || {},
            tone_and_voice: u?.tone_and_voice || {},
            look_and_feel: u?.look_and_feel || {},
            templates: Array.isArray(u?.templates) ? u.templates : [],
            voiceover: Array.isArray(u?.voiceover) ? u.voiceover : [],
          };
          // Only include avatar_url if it has a non-empty value
          const avatarUrlVal = u?.avatar_url || '';
          if (avatarUrlVal && avatarUrlVal.trim()) {
            userForBody.avatar_url = avatarUrlVal.trim();
          }
        } catch (_) { userForBody = {}; }
      }
      // Preserve ALL fields from session_data, including nested structures
      const sessionForBody = sanitizeSessionSnapshot(sd, sessionId, token);

      // 2) Build switch-model request body
      const requestBody = {
        user: userForBody,
        session: sessionForBody,
        scene_number: scene.scene_number,
        target_model: desiredModel,
      };
      // Optional fields per target model
      if (desiredModel === 'VEO3' || desiredModel === 'ANCHOR') {
        // Use selected presenter preset from modal
        if (switchPresenterPresetId) {
          const selectedPreset = (Array.isArray(presenterPresets[desiredModel]) ? presenterPresets[desiredModel] : []).find(
            (preset) => String(preset?.preset_id) === String(switchPresenterPresetId)
          );
          if (selectedPreset) {
            requestBody.presenter_options = {
              preset_id: switchPresenterPresetId,
              option: switchPresenterPresetLabel || selectedPreset.option || ''
            };
            // For VEO3 models, also set preset field to preset_id for proper matching
            if (desiredModel === 'VEO3') {
              requestBody.presenter_options.preset = String(switchPresenterPresetId);
            }
            // For ANCHOR models, include anchor_id from the preset
            if (desiredModel === 'ANCHOR' && selectedPreset?.anchor_id) {
              requestBody.presenter_options.anchor_id = String(selectedPreset.anchor_id);
            }
          } else {
            requestBody.presenter_options = {
              preset_id: switchPresenterPresetId,
              option: switchPresenterPresetLabel || ''
            };
            // For VEO3 models, also set preset field to preset_id for proper matching
            if (desiredModel === 'VEO3') {
              requestBody.presenter_options.preset = String(switchPresenterPresetId);
            }
          }
        } else {
          requestBody.presenter_options = {};
        }
      }
      if (desiredModel === 'PLOTLY') {
        const chart_type = (switchChartType || scene?.chart_type || scene?.chartType || '').toLowerCase();
        let chart_data = scene?.chart_data || scene?.chartData || {};
        if (switchChartData && typeof switchChartData === 'string') {
          try { chart_data = JSON.parse(switchChartData); } catch(_) {/* keep scene data */}
        }
        requestBody.chart_type = chart_type;
        requestBody.chart_data = chart_data;
      }
      console.log('scripts/switch-model request body:', requestBody);

      // 3) Call switch-model API
      const switchResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/switch-model', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody)
      });
      const switchText = await switchResp.text();
      let switchData; try { switchData = JSON.parse(switchText); } catch (_) { switchData = switchText; }
      if (!switchResp.ok) throw new Error(`scripts/switch-model failed: ${switchResp.status} ${switchText}`);
      console.log('scripts/switch-model response:', switchData);

      // 4) Update UI with returned script
      const container = switchData?.reordered_script ?? switchData?.changed_script ?? switchData;
      try {
        localStorage.setItem('updated_script_structure', JSON.stringify(container));
        localStorage.setItem('original_script_hash', JSON.stringify(container));
        const normalized = normalizeScriptToRows(container);
        const newRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
        setScriptRows(newRows);
        // Keep current scene by scene_number if possible
        const idx = newRows.findIndex(r => (r?.scene_number === scene.scene_number));
        if (idx >= 0) setCurrentSceneIndex(idx);
        // Update last script in chat history and localStorage
        try {
          setChatHistory(prev => {
            const copy = [...prev];
            for (let i = copy.length - 1; i >= 0; i--) {
              if (copy[i]?.script) { copy[i] = { ...copy[i], script: container }; break; }
            }
            try { localStorage.setItem('last_generated_script', JSON.stringify(container)); } catch (_) { /* noop */ }
            return copy;
          });
        } catch (_) { /* noop */ }
      } catch (_) { /* noop */ }

      // Reflect new selection in UI and close confirm
      setSelectedVideoType(videoType);
      setShowModelConfirm(false);
      setPendingModelType(null);
      setSwitchPresenterPresetId('');
      setSwitchPresenterPresetLabel('');
      
      // If switching to VEO3 or ANCHOR, fetch presenter options
      if (desiredModel === 'VEO3' || desiredModel === 'ANCHOR') {
        try {
          // Clear existing presets for this model to force refresh
          setPresenterPresets((prev) => ({
            ...prev,
            [desiredModel]: []
          }));
          // Fetch presenter presets for the new model
          await fetchPresenterPresetsForModel(desiredModel);
        } catch (err) {
          console.warn('Failed to load presenter options after model switch:', err);
        }
      }

      // Trigger script refresh after successful model switch
      if (onScriptChange) {
        onScriptChange();
      }
    } catch (e) {
      console.error('Video type switch failed:', e);
      alert('Failed to switch video type. Please try again.');
    } finally {
      setIsSwitchingModel(false);
    }
  };

  // Navigate to next scene; wrap from last -> first
  const goToNextScene = () => {
    try {
      if (!Array.isArray(scriptRows) || scriptRows.length === 0) return;
      setCurrentSceneIndex((prev) => {
        const next = prev + 1;
        return next < scriptRows.length ? next : 0;
      });
    } catch (_) { /* noop */ }
  };
  // Save edited narration/description for scenes via update-text API
  const saveEditedScriptText = async () => {
    if (isUpdatingText) return;
    setIsUpdatingText(true);
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) throw new Error('Missing session_id or token');

      // 1) Load current session data
      const sessionReqBody = { user_id: token, session_id: sessionId };
      const sessionResp = await fetch(
        'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionReqBody) }
      );
      if (!sessionResp.ok) {
        const text = await sessionResp.text();
        throw new Error(`user-session/data failed: ${sessionResp.status} ${text}`);
      }
      const sessionDataResponse = await sessionResp.json();
      const sd = (sessionDataResponse?.session_data || sessionDataResponse?.session || {});
      // Build session object to match required schema
      // Preserve ALL fields from session_data, including nested structures
      const sessionForBody = sanitizeSessionSnapshot(sd, sessionId, token);

      // Use exact user object from user-session-data
      let userForBody = undefined;
      if (sessionDataResponse && typeof sessionDataResponse.user_data === 'object') {
        userForBody = sessionDataResponse.user_data;
      } else if (sd && typeof sd.user_data === 'object') {
        userForBody = sd.user_data;
      } else if (sd && typeof sd.user === 'object') {
        userForBody = sd.user;
      } else {
        throw new Error('user_data missing in user-session-data response');
      }

      const originalUserquery = Array.isArray(sd?.scripts?.[0]?.userquery) ? sd.scripts[0].userquery : [];
      // Derive script version from session data when available
      const scriptVersion = (
        (Array.isArray(sd?.scripts) && sd.scripts[0]?.version)
        || (sd?.scripts && sd.scripts.version)
        || sd?.version
        || 'v1'
      );

      // 2) Build changed_script.airesponse from current UI rows (preserve scene_number)
      const rows = Array.isArray(scriptRows) ? scriptRows : [];
      const clonePromptTemplate = (tpl) => {
        if (!tpl || typeof tpl !== 'object') return null;
        if (Array.isArray(tpl)) return [...tpl];
        return { ...tpl };
      };
      const airesponse = rows.map((r, idx) => {
        const narrationVal = r?.narration ?? '';
        const modelUpper = String(r?.mode ?? r?.model ?? '').toUpperCase();
        const isVEO3 = modelUpper === 'VEO3';
        const descriptionVal = isVEO3 ? '' : (r?.description ?? '');
        const durationCandidate =
          (typeof r?.duration === 'number' && Number.isFinite(r.duration))
            ? Math.round(r.duration)
            : (typeof r?.duration === 'string' && r.duration.trim()
                ? parseDurationToSeconds(r.duration)
                : (typeof r?.scene_duration === 'string' && r.scene_duration.trim()
                    ? parseDurationToSeconds(r.scene_duration)
                    : (typeof r?.timeline === 'string' && r.timeline.trim()
                        ? parseDurationToSeconds(r.timeline)
                        : null)));
        const wordCountVal =
          typeof r?.word_count === 'number'
            ? r.word_count
            : computeWordCount(narrationVal || descriptionVal || '');
        return {
          scene_number: r?.scene_number,
          scene_title: r?.scene_title ?? '',
          model: r?.mode ?? r?.model ?? '',
          timeline: r?.timeline ?? '',
          duration: durationCandidate != null && !Number.isNaN(durationCandidate) ? durationCandidate : undefined,
          narration: narrationVal,
          desc: descriptionVal,
          word_count: wordCountVal,
          gen_image: (typeof r?.gen_image === 'boolean') ? r.gen_image : undefined,
          // Preserve visual/styling fields so they are not dropped server-side
          chart_type: r?.chart_type ?? r?.chartType ?? '',
          chart_data: r?.chart_data ?? r?.chartData ?? undefined,
          colors: Array.isArray(r?.colors) ? r.colors : [],
          font_style: r?.font_style ?? r?.fontStyle ?? '',
          font_size: r?.font_size ?? r?.fontsize ?? r?.fontSize ?? '',
          text_to_be_included: Array.isArray(r?.text_to_be_included)
            ? r.text_to_be_included
            : (typeof r?.text_to_include === 'string' && r.text_to_include.trim() ? [r.text_to_include.trim()] : []),
          ref_image: filterImageUrls(
            Array.isArray(r?.ref_image)
              ? r.ref_image
              : (typeof r?.ref_image === 'string' && r.ref_image.trim())
              ? [r.ref_image]
              : []
          ),
          // Include avatar_urls as array if present, remove avatar field
          avatar_urls: (() => {
            if (Array.isArray(r?.avatar_urls) && r.avatar_urls.length > 0) {
              return r.avatar_urls.filter(url => typeof url === 'string' && url.trim()).map(url => url.trim());
            }
            // Fallback: convert avatar to avatar_urls array
            if (typeof r?.avatar === 'string' && r.avatar.trim()) {
              return [r.avatar.trim()];
            }
            return [];
          })(),
          // Include background_image array only, remove background field
          background_image: (() => {
            if (Array.isArray(r?.background_image)) {
              return r.background_image;
            }
            if (typeof r?.background === 'string' && r.background.trim()) {
              // Convert single background string to array format
              return [{
                imageurl: r.background.trim(),
                imageid: ''
              }];
            }
            return [];
          })(),
          // Include model-specific option blobs
          presenter_options: (() => {
            const modelUpper = String(r?.mode ?? r?.model ?? '').toUpperCase();
            if (r?.presenter_options) {
              const presenterOpts = { ...r.presenter_options };
              // For ANCHOR models, ensure preset_id is included if a preset is selected
              if (modelUpper === 'ANCHOR') {
                const anchorPresets = Array.isArray(presenterPresets.ANCHOR) ? presenterPresets.ANCHOR : [];
                // Try to find preset by anchor_id if preset_id is missing
                if (!presenterOpts.preset_id && presenterOpts.anchor_id) {
                  const matchingPreset = anchorPresets.find(
                    (p) => String(p?.anchor_id || '') === String(presenterOpts.anchor_id)
                  );
                  if (matchingPreset?.preset_id) {
                    presenterOpts.preset_id = String(matchingPreset.preset_id);
                  }
                }
                // If still no preset_id but we have an option/name, try to match by that
                if (!presenterOpts.preset_id && (presenterOpts.option || presenterOpts.name)) {
                  const matchingPreset = anchorPresets.find(
                    (p) => String(p?.option || p?.name || '') === String(presenterOpts.option || presenterOpts.name)
                  );
                  if (matchingPreset?.preset_id) {
                    presenterOpts.preset_id = String(matchingPreset.preset_id);
                  }
                }
                // If this is the current scene and we have a selected preset, use that
                if (!presenterOpts.preset_id && idx === currentSceneIndex && selectedPresenterPreset) {
                  const matchingPreset = anchorPresets.find(
                    (p) => String(p?.preset_id || p?.option || '') === String(selectedPresenterPreset)
                  );
                  if (matchingPreset?.preset_id) {
                    presenterOpts.preset_id = String(matchingPreset.preset_id);
                  }
                }
              }
              return presenterOpts;
            }
            return undefined;
          })(),
          anchor_options: r?.anchor_options ?? undefined,
          folderLink: r?.folderLink ?? r?.folder_link ?? '',
          veo3_prompt_template: clonePromptTemplate(r?.veo3_prompt_template),
          anchor_prompt_template: clonePromptTemplate(r?.anchor_prompt_template)
        };
      });

      const requestBody = {
        user: userForBody,
        session: sessionForBody,
        changed_script: {
          userquery: originalUserquery,
          airesponse,
          version: String(scriptVersion || 'v1')
        },
      };
      console.log('scripts/update-text request body:', requestBody);

      // 3) Use unified update-text endpoint (no video-type branching)
      const updateResp = await fetch(
        `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-text`,
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody) }
      );
      const updateText = await updateResp.text();
      let updateData; try { updateData = JSON.parse(updateText); } catch (_) { updateData = updateText; }
      if (!updateResp.ok) {
        throw new Error(`scripts/update-text failed: ${updateResp.status} ${updateText}`);
      }
      console.log('scripts/update-text response:', updateData);

      // 4) Extract updated script array from response
      const container = updateData;
      const scriptArray = container?.script
        || container?.assistant_message?.airesponse
        || container?.airesponse
        || null;

      if (Array.isArray(scriptArray)) {
        // Persist and refresh modal
        const containerToStore = { script: scriptArray };
        try {
          localStorage.setItem(scopedKey('updated_script_structure'), JSON.stringify(containerToStore));
          localStorage.setItem(scopedKey('original_script_hash'), JSON.stringify(containerToStore));
          const normalized = normalizeScriptToRows(containerToStore);
          const newRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
          setScriptRows(newRows);
          // Update last script references in chat/localStorage
          try {
            setChatHistory(prev => {
              const copy = [...prev];
              for (let i = copy.length - 1; i >= 0; i--) {
                if (copy[i]?.script) { copy[i] = { ...copy[i], script: containerToStore }; break; }
              }
              try {
                localStorage.setItem(scopedKey('last_generated_script'), JSON.stringify(containerToStore));
                localStorage.removeItem('last_generated_script');
              } catch (_) { /* noop */ }
              return copy;
            });
          } catch (_) { /* noop */ }
        } catch (_) { /* noop */ }

        // Reopen/refresh the modal view with new script
        openScriptModal(containerToStore);

        // UI: Exit editing (no chat message needed)
        setIsEditingScene(false);
        // Enable undo after successful text update
        setCanUndo(true); setCanRedo(false);
      } else {
        alert('Update succeeded, but no script returned.');
      }
    } catch (e) {
      console.error('Failed to update script text:', e);
      alert('Failed to update scene text. Please try again.');
    } finally {
      setIsUpdatingText(false);
    }
  };
  // Helper: Update a single scene's gen_image flag (and optional description) via update-text API
  const updateSceneGenImageFlag = async (sceneIdx, { genImage, descriptionOverride, narrationOverride, refImagesOverride, backgroundOverride, backgroundImageOverride, backgroundImageArrayOverride, avatarOverride, avatarUrl } = {}) => {
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) throw new Error('Missing session_id or token');
      // Load session snapshot
      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessText = await sessionResp.text();
      let sessJson; try { sessJson = JSON.parse(sessText); } catch(_) { sessJson = {}; }
      if (!sessionResp.ok) throw new Error(`user-session/data failed: ${sessionResp.status} ${sessText}`);
      const rawSession = sessJson?.session_data || sessJson?.session || {};
      const sessionForBody = sanitizeSessionSnapshot(rawSession, sessionId, token);
      const rawUser = sessJson?.user_data || rawSession?.user_data || rawSession?.user || {};
      const user = normalizeUserSnapshot(rawUser, token);
      const scriptsSource = Array.isArray(sessionForBody?.scripts) ? sessionForBody.scripts : [];
      const primaryScript = scriptsSource[0] || {};
      const originalUserquery = Array.isArray(primaryScript?.userquery) ? primaryScript.userquery : [];
      const scriptVersion =
        primaryScript?.version ||
        sessionForBody?.version ||
        'v1';
      const airesponseSource = Array.isArray(primaryScript?.airesponse)
        ? primaryScript.airesponse.map((item) => (item && typeof item === 'object' ? { ...item } : item))
        : [];
      const rows = Array.isArray(scriptRows) ? scriptRows : [];
      const targetRow = rows[sceneIdx] || {};
      const targetSceneNumber = targetRow?.scene_number ?? (sceneIdx + 1);

      const applyField = (obj, keys, value) => {
        for (const key of keys) {
          if (Object.prototype.hasOwnProperty.call(obj, key)) {
            obj[key] = value;
            return true;
          }
        }
        return false;
      };

      const clonePromptTemplate = (tpl) => {
        if (!tpl || typeof tpl !== 'object') return null;
        if (Array.isArray(tpl)) return [...tpl];
        return { ...tpl };
      };

      let matchedScene = false;
      const airesponse = airesponseSource.map((scene, idx) => {
        if (!scene || typeof scene !== 'object') return scene;
        const sceneNumber =
          scene?.scene_number ??
          scene?.scene_no ??
          scene?.sceneNo ??
          scene?.scene ??
          (idx + 1);
        if (sceneNumber !== targetSceneNumber) {
          return { ...scene };
        }
        matchedScene = true;
        const clone = { ...scene };

        const modelUpper = String((clone.model || clone.mode || targetRow?.mode) ?? targetRow?.model ?? '').toUpperCase();
        const isVEO3 = modelUpper === 'VEO3';
        const descriptionVal = isVEO3 
          ? '' 
          : (typeof descriptionOverride === 'string'
            ? descriptionOverride
              : (targetRow?.description ?? clone.desc ?? clone.description ?? ''));
        const narrationVal =
          typeof narrationOverride === 'string'
            ? narrationOverride
            : (typeof targetRow?.narration === 'string' && targetRow.narration.trim()
            ? targetRow.narration
            : (clone.narration ??
              clone.voice_over ??
              clone.voiceover ??
              clone.voice ??
                  ''));

        const refImages = (() => {
          if (Array.isArray(refImagesOverride) && refImagesOverride.length > 0) {
            return filterImageUrls(refImagesOverride);
          }
          if (Array.isArray(targetRow?.ref_image)) return filterImageUrls(targetRow.ref_image);
          if (typeof targetRow?.ref_image === 'string' && targetRow.ref_image.trim()) {
            return filterImageUrls([targetRow.ref_image]);
          }
          return Array.isArray(clone.ref_image) ? filterImageUrls(clone.ref_image) : [];
        })();

        const backgroundVal =
          backgroundOverride ??
          backgroundImageOverride ??
          targetRow?.background ??
          targetRow?.background_image ??
          clone.background ??
          clone.background_image ??
          '';
        const backgroundImageVal =
          backgroundImageOverride ??
          backgroundOverride ??
          targetRow?.background_image ??
          targetRow?.background ??
          clone.background_image ??
          clone.background ??
          '';
        const avatarVal =
          typeof avatarOverride === 'string'
            ? avatarOverride
            : (targetRow?.avatar ?? clone.avatar);
        // Determine avatar_url for API body (use avatarUrl override, then selected avatar, then scene avatar)
        const avatarUrlForApi = avatarUrl || avatarVal || targetRow?.avatar || '';

        applyField(clone, ['scene_number', 'scene_no', 'sceneNo', 'scene'], targetSceneNumber);
        if (!applyField(clone, ['scene_title', 'sceneTitle', 'title'], targetRow?.scene_title ?? clone.scene_title ?? clone.title)) {
          clone.scene_title = targetRow?.scene_title ?? clone.scene_title ?? '';
        }
        if (!applyField(clone, ['model', 'mode'], targetRow?.mode ?? targetRow?.model ?? clone.model ?? clone.mode)) {
          clone.model = targetRow?.mode ?? targetRow?.model ?? clone.model ?? '';
        }
        applyField(clone, ['timeline', 'time'], targetRow?.timeline ?? clone.timeline ?? '');
        if (!applyField(clone, ['narration', 'voice_over', 'voiceover', 'voice'], narrationVal)) {
          clone.narration = narrationVal;
        }
        if (!applyField(clone, ['desc', 'description'], descriptionVal)) {
          clone.desc = descriptionVal;
        }
        const durationCandidate =
          (typeof targetRow?.duration === 'number' && Number.isFinite(targetRow.duration) ? Math.round(targetRow.duration) : null) ??
          (typeof targetRow?.duration === 'string' && targetRow.duration.trim()
            ? parseDurationToSeconds(targetRow.duration)
            : null) ??
          (typeof targetRow?.scene_duration === 'string' && targetRow.scene_duration.trim()
            ? parseDurationToSeconds(targetRow.scene_duration)
            : null) ??
          (typeof targetRow?.timeline === 'string' && targetRow.timeline.trim()
            ? parseDurationToSeconds(targetRow.timeline)
            : null);
        if (durationCandidate != null && !Number.isNaN(durationCandidate)) {
          applyField(clone, ['duration', 'scene_duration'], durationCandidate);
        }
        const wordCountVal =
          typeof targetRow?.word_count === 'number'
            ? targetRow.word_count
            : (typeof clone.word_count === 'number'
                ? clone.word_count
                : computeWordCount(narrationVal || descriptionVal || ''));
        if (!applyField(clone, ['word_count'], wordCountVal)) {
          clone.word_count = wordCountVal;
        }
        if (typeof genImage === 'boolean') {
          applyField(clone, ['gen_image'], genImage);
        } else if (typeof targetRow?.gen_image === 'boolean') {
          applyField(clone, ['gen_image'], targetRow.gen_image);
        }
        applyField(clone, ['chart_type', 'chartType'], targetRow?.chart_type ?? targetRow?.chartType ?? clone.chart_type ?? clone.chartType);
        applyField(clone, ['chart_data', 'chartData'], targetRow?.chart_data ?? targetRow?.chartData ?? clone.chart_data ?? clone.chartData);
        applyField(clone, ['colors'], Array.isArray(targetRow?.colors) ? targetRow.colors : clone.colors ?? []);
        applyField(clone, ['font_style', 'fontStyle'], targetRow?.font_style ?? targetRow?.fontStyle ?? clone.font_style ?? clone.fontStyle);
        const fontSizeVal = targetRow?.font_size ?? targetRow?.fontSize ?? targetRow?.fontsize ?? clone.font_size ?? clone.fontSize;
        applyField(clone, ['font_size', 'fontSize'], fontSizeVal);
        if (Array.isArray(targetRow?.text_to_be_included)) {
          applyField(clone, ['text_to_be_included'], targetRow.text_to_be_included);
        }
        // Set ref_image from refImages (which includes refImagesOverride if provided)
        // If backgroundImageArrayOverride is provided, don't set ref_image (send empty array)
        if (Array.isArray(backgroundImageArrayOverride) && backgroundImageArrayOverride.length > 0) {
          clone.ref_image = [];
        } else {
          clone.ref_image = Array.isArray(refImages) && refImages.length > 0 ? refImages : [];
        }
        // Remove avatar field - we'll use avatar_urls instead
        if ('avatar' in clone) {
          delete clone.avatar;
        }
        // Remove background field - we'll use background_image array only
        if ('background' in clone) {
          delete clone.background;
        }
        // Set background_image array - prioritize backgroundImageArrayOverride if provided
        if (Array.isArray(backgroundImageArrayOverride) && backgroundImageArrayOverride.length > 0) {
          // Use backgroundImageArrayOverride directly (already in correct format)
          clone.background_image = backgroundImageArrayOverride.map(item => ({
            template_id: item?.template_id || '',
            image_url: item?.image_url || ''
          }));
        } else if (Array.isArray(targetRow?.background_image) && targetRow.background_image.length > 0) {
          clone.background_image = targetRow.background_image;
        } else if (backgroundImageVal && typeof backgroundImageVal === 'string' && backgroundImageVal.trim()) {
          // Convert single background string to array format if needed
          const templateEntry = templateLookupByUrl.get(backgroundImageVal.trim());
          const rawTemplate = templateEntry?.raw || {};
          const templateId = templateEntry?.id || rawTemplate?.template_id || rawTemplate?.templateId || rawTemplate?.id || '';
          clone.background_image = [{
            template_id: templateId ? String(templateId) : '',
            image_url: backgroundImageVal.trim()
          }];
        }
        // Handle presenter_options - ensure preset_id is included for ANCHOR models
        if (targetRow?.presenter_options) {
          clone.presenter_options = { ...targetRow.presenter_options };
          // For ANCHOR models, ensure preset_id is included if a preset is selected
          if (modelUpper === 'ANCHOR') {
            const anchorPresets = Array.isArray(presenterPresets.ANCHOR) ? presenterPresets.ANCHOR : [];
            // Try to find preset by anchor_id if preset_id is missing
            if (!clone.presenter_options.preset_id && clone.presenter_options.anchor_id) {
              const matchingPreset = anchorPresets.find(
                (p) => String(p?.anchor_id || '') === String(clone.presenter_options.anchor_id)
              );
              if (matchingPreset?.preset_id) {
                clone.presenter_options.preset_id = String(matchingPreset.preset_id);
              }
            }
            // If still no preset_id but we have an option/name, try to match by that
            if (!clone.presenter_options.preset_id && (clone.presenter_options.option || clone.presenter_options.name)) {
              const matchingPreset = anchorPresets.find(
                (p) => String(p?.option || p?.name || '') === String(clone.presenter_options.option || clone.presenter_options.name)
              );
              if (matchingPreset?.preset_id) {
                clone.presenter_options.preset_id = String(matchingPreset.preset_id);
              }
            }
            // If we're on the current scene and have a selected preset, use that
            if (!clone.presenter_options.preset_id && sceneIdx === currentSceneIndex && selectedPresenterPreset) {
              const matchingPreset = anchorPresets.find(
                (p) => String(p?.preset_id || p?.option || '') === String(selectedPresenterPreset)
              );
              if (matchingPreset?.preset_id) {
                clone.presenter_options.preset_id = String(matchingPreset.preset_id);
              }
            }
          }
        }
        if (targetRow?.anchor_options) clone.anchor_options = targetRow.anchor_options;
        if (targetRow?.anchor_prompt_template && typeof targetRow.anchor_prompt_template === 'object') {
          clone.anchor_prompt_template = clonePromptTemplate(targetRow.anchor_prompt_template);
        }
        clone.folderLink = targetRow?.folderLink ?? targetRow?.folder_link ?? clone.folderLink ?? clone.folder_link ?? '';
        if (targetRow?.veo3_prompt_template && typeof targetRow.veo3_prompt_template === 'object') {
          clone.veo3_prompt_template = clonePromptTemplate(targetRow.veo3_prompt_template);
        }

        return clone;
      });

      const finalAiresponse = (() => {
        if (matchedScene) return airesponse;
        const fallbackRow = targetRow;
        const refImages = Array.isArray(refImagesOverride) && refImagesOverride.length > 0
          ? filterImageUrls(refImagesOverride)
          : Array.isArray(fallbackRow?.ref_image)
            ? filterImageUrls(fallbackRow.ref_image)
            : [];
        const fallbackModelUpper = String(fallbackRow?.mode ?? fallbackRow?.model ?? '').toUpperCase();
        const isFallbackVEO3 = fallbackModelUpper === 'VEO3';
        const descriptionVal = isFallbackVEO3
          ? ''
          : (typeof descriptionOverride === 'string'
            ? descriptionOverride
              : (fallbackRow?.description ?? ''));
        const backgroundVal =
          backgroundOverride ??
          backgroundImageOverride ??
          fallbackRow?.background ??
          fallbackRow?.background_image ??
          '';
        const backgroundImageVal =
          backgroundImageOverride ??
          backgroundOverride ??
          fallbackRow?.background_image ??
          fallbackRow?.background ??
          '';
        const fallbackDuration =
          (typeof fallbackRow?.duration === 'number' && Number.isFinite(fallbackRow.duration) ? Math.round(fallbackRow.duration) : null) ??
          (typeof fallbackRow?.duration === 'string' && fallbackRow.duration.trim()
            ? parseDurationToSeconds(fallbackRow.duration)
            : null) ??
          (typeof fallbackRow?.scene_duration === 'string' && fallbackRow.scene_duration.trim()
            ? parseDurationToSeconds(fallbackRow.scene_duration)
            : null) ??
          (typeof fallbackRow?.timeline === 'string' && fallbackRow.timeline.trim()
            ? parseDurationToSeconds(fallbackRow.timeline)
            : null);
        const fallbackNarration = fallbackRow?.narration ?? '';
        const fallbackWordCount =
          typeof fallbackRow?.word_count === 'number'
            ? fallbackRow.word_count
            : computeWordCount(fallbackNarration || descriptionVal || '');
        const fallbackScene = {
          scene_number: targetSceneNumber,
          scene_title: fallbackRow?.scene_title ?? '',
          model: fallbackRow?.mode ?? fallbackRow?.model ?? '',
          timeline: fallbackRow?.timeline ?? '',
          duration: fallbackDuration != null && !Number.isNaN(fallbackDuration) ? fallbackDuration : undefined,
          narration: fallbackNarration,
          desc: descriptionVal,
          gen_image: typeof genImage === 'boolean' ? genImage : (typeof fallbackRow?.gen_image === 'boolean' ? fallbackRow.gen_image : undefined),
          chart_type: fallbackRow?.chart_type ?? fallbackRow?.chartType ?? '',
          chart_data: fallbackRow?.chart_data ?? fallbackRow?.chartData ?? undefined,
          colors: Array.isArray(fallbackRow?.colors) ? fallbackRow.colors : [],
          font_style: fallbackRow?.font_style ?? fallbackRow?.fontStyle ?? '',
          font_size: fallbackRow?.font_size ?? fallbackRow?.fontSize ?? fallbackRow?.fontsize ?? '',
          text_to_be_included: Array.isArray(fallbackRow?.text_to_be_included)
            ? fallbackRow.text_to_be_included
            : (typeof fallbackRow?.text_to_include === 'string' && fallbackRow.text_to_include.trim() ? [fallbackRow.text_to_include.trim()] : []),
          ref_image: (() => {
            // If backgroundImageArrayOverride is provided, don't set ref_image (send empty array)
            if (Array.isArray(backgroundImageArrayOverride) && backgroundImageArrayOverride.length > 0) {
              return [];
            }
            return Array.isArray(refImages) && refImages.length > 0 ? refImages : [];
          })(),
          // Don't include avatar field - use avatar_urls instead
          // Don't include background field - use background_image array only
          background_image: (() => {
            // Prioritize backgroundImageArrayOverride if provided
            if (Array.isArray(backgroundImageArrayOverride) && backgroundImageArrayOverride.length > 0) {
              return backgroundImageArrayOverride.map(item => ({
                template_id: item?.template_id || '',
                image_url: item?.image_url || ''
              }));
            }
            if (backgroundImageVal && typeof backgroundImageVal === 'string' && backgroundImageVal.trim()) {
              const templateEntry = templateLookupByUrl.get(backgroundImageVal.trim());
              const rawTemplate = templateEntry?.raw || {};
              const templateId = templateEntry?.id || rawTemplate?.template_id || rawTemplate?.templateId || rawTemplate?.id || '';
              return [{
                template_id: templateId ? String(templateId) : '',
                image_url: backgroundImageVal.trim()
              }];
            }
            if (Array.isArray(fallbackRow?.background_image)) {
              return fallbackRow.background_image;
            }
            return [];
          })(),
          presenter_options: fallbackRow?.presenter_options,
          anchor_options: fallbackRow?.anchor_options,
          folderLink: fallbackRow?.folderLink ?? fallbackRow?.folder_link ?? '',
          anchor_prompt_template: fallbackRow?.anchor_prompt_template && typeof fallbackRow.anchor_prompt_template === 'object'
            ? clonePromptTemplate(fallbackRow.anchor_prompt_template)
            : undefined,
          word_count: fallbackWordCount
        };
        if (fallbackRow?.veo3_prompt_template && typeof fallbackRow.veo3_prompt_template === 'object') {
          fallbackScene.veo3_prompt_template = clonePromptTemplate(fallbackRow.veo3_prompt_template);
        }
        return [...airesponse, fallbackScene];
      })();

      // Build background_image array if provided
      // First check overrides, then targetRow, then fetched session data to preserve existing data
      const backgroundImageArray = (() => {
        if (Array.isArray(backgroundImageArrayOverride) && backgroundImageArrayOverride.length > 0) {
          // If backgroundImageArrayOverride is provided, use it directly (for summary templates with template_id and image_url)
          // Check if it's already in the correct format (has template_id and image_url)
          return backgroundImageArrayOverride.map(item => {
            // If it already has template_id and image_url, return as is
            if (item?.template_id !== undefined || item?.image_url !== undefined) {
              return {
                template_id: item?.template_id || '',
                image_url: item?.image_url || ''
              };
            }
            // Otherwise, convert old format to new format
            const imageUrl = item?.imageurl || item?.imageUrl || item?.url || '';
            const templateId = item?.template_id || item?.templateId || item?.imageid || item?.imageId || '';
            return {
              template_id: templateId ? String(templateId) : '',
              image_url: imageUrl ? String(imageUrl) : ''
            };
          });
        }
        // If we have a single background image and want to convert to array format
        const bgUrl = backgroundImageOverride || backgroundOverride || targetRow?.background_image || targetRow?.background || '';
        if (bgUrl && typeof bgUrl === 'string' && bgUrl.trim()) {
          // Check if background_image is already an array
          if (Array.isArray(targetRow?.background_image) && targetRow.background_image.length > 0) {
            return targetRow.background_image.map(item => {
              if (typeof item === 'object' && item !== null) {
                return {
                  template_id: item?.template_id || '',
                  image_url: item?.image_url || item?.imageurl || ''
                };
              }
              return {
                template_id: '',
                image_url: typeof item === 'string' ? item : ''
              };
            });
          }
          // Try to get template ID from templateLookupByUrl
          const templateEntry = templateLookupByUrl.get(bgUrl.trim());
          const rawTemplate = templateEntry?.raw || {};
          const templateId = templateEntry?.id || rawTemplate?.template_id || rawTemplate?.templateId || rawTemplate?.id || '';
          return [{
            template_id: templateId ? String(templateId) : '',
            image_url: bgUrl.trim()
          }];
        }
        // If not in targetRow, check the fetched session data for existing background_image
        const matchedSceneFromSession = airesponseSource.find((scene) => {
          if (!scene || typeof scene !== 'object') return false;
          const sceneNumber =
            scene?.scene_number ??
            scene?.scene_no ??
            scene?.sceneNo ??
            scene?.scene;
          return sceneNumber === targetSceneNumber;
        });
        if (matchedSceneFromSession) {
          if (Array.isArray(matchedSceneFromSession?.background_image) && matchedSceneFromSession.background_image.length > 0) {
            return matchedSceneFromSession.background_image.map(item => {
              if (typeof item === 'object' && item !== null) {
                return {
                  template_id: item?.template_id || item?.templateId || item?.imageid || item?.imageId || '',
                  image_url: item?.image_url || item?.imageurl || item?.imageUrl || item?.url || ''
                };
              }
              return {
                template_id: '',
                image_url: typeof item === 'string' ? item : ''
              };
            });
          }
          // Fallback: check background field in session data
          const sessionBg = matchedSceneFromSession?.background;
          if (sessionBg && typeof sessionBg === 'string' && sessionBg.trim()) {
            const templateEntry = templateLookupByUrl.get(sessionBg.trim());
            const rawTemplate = templateEntry?.raw || {};
            const templateId = templateEntry?.id || rawTemplate?.template_id || rawTemplate?.templateId || rawTemplate?.id || '';
            return [{
              template_id: templateId ? String(templateId) : '',
              image_url: sessionBg.trim()
            }];
          }
        }
        return [];
      })();

      // Get avatar_urls for API body as array of strings
      // First check if avatarUrl override is provided, then check targetRow, then check fetched session data
      const avatarUrlsForApiBody = (() => {
        if (avatarUrl) {
          const url = typeof avatarUrl === 'string' && avatarUrl.trim() ? avatarUrl.trim() : '';
          return url ? [url] : [];
        }
        const targetRow = rows[sceneIdx] || {};
        // Check targetRow first (UI state)
        if (Array.isArray(targetRow?.avatar_urls) && targetRow.avatar_urls.length > 0) {
          return targetRow.avatar_urls.filter(url => typeof url === 'string' && url.trim()).map(url => url.trim());
        }
        // Fallback: check avatar field and convert to array
        if (typeof targetRow?.avatar === 'string' && targetRow.avatar.trim()) {
          return [targetRow.avatar.trim()];
        }
        // If not in targetRow, check the fetched session data for existing avatar_urls
        const matchedSceneFromSession = airesponseSource.find((scene) => {
          if (!scene || typeof scene !== 'object') return false;
          const sceneNumber =
            scene?.scene_number ??
            scene?.scene_no ??
            scene?.sceneNo ??
            scene?.scene;
          return sceneNumber === targetSceneNumber;
        });
        if (matchedSceneFromSession) {
          if (Array.isArray(matchedSceneFromSession?.avatar_urls) && matchedSceneFromSession.avatar_urls.length > 0) {
            return matchedSceneFromSession.avatar_urls.filter(url => typeof url === 'string' && url.trim()).map(url => url.trim());
          }
          // Fallback: check avatar field in session data
          if (typeof matchedSceneFromSession?.avatar === 'string' && matchedSceneFromSession.avatar.trim()) {
            return [matchedSceneFromSession.avatar.trim()];
          }
        }
        return [];
      })();

      // Attach background_image array and avatar_urls array to the targeted scene object, remove avatar and background fields
      const airesponseWithVisuals = (() => {
        if (!Array.isArray(finalAiresponse) || finalAiresponse.length === 0) return finalAiresponse;
        const cloned = finalAiresponse.map((scene) => {
          if (!scene || typeof scene !== 'object') return scene;
          const cleanedScene = { ...scene };
          // Remove avatar field if present
          if ('avatar' in cleanedScene) {
            delete cleanedScene.avatar;
          }
          // Remove background field if present (keep only background_image array)
          if ('background' in cleanedScene && !Array.isArray(cleanedScene.background)) {
            delete cleanedScene.background;
          }
          return cleanedScene;
        });
        const targetIndex = (() => {
          try {
            const bySceneNumber = cloned.findIndex((scene) => {
              if (!scene || typeof scene !== 'object') return false;
              const sn =
                scene.scene_number ??
                scene.scene_no ??
                scene.sceneNo ??
                scene.scene;
              return sn === targetSceneNumber;
            });
            if (bySceneNumber >= 0) return bySceneNumber;
          } catch (_) { /* noop */ }
          if (sceneIdx >= 0 && sceneIdx < cloned.length) return sceneIdx;
          return 0;
        })();
        const targetSceneObj = cloned[targetIndex];
        if (targetSceneObj && typeof targetSceneObj === 'object') {
          // Set background_image only if backgroundImageArray is provided (not undefined)
          // If undefined, remove background_image field entirely
          if (backgroundImageArray !== undefined) {
          targetSceneObj.background_image = Array.isArray(backgroundImageArray) ? backgroundImageArray : [];
          } else {
            // Remove background_image field if it exists
            if ('background_image' in targetSceneObj) {
              delete targetSceneObj.background_image;
            }
          }
          targetSceneObj.avatar_urls = Array.isArray(avatarUrlsForApiBody) ? avatarUrlsForApiBody : [];
          // Ensure avatar field is removed
          if ('avatar' in targetSceneObj) {
            delete targetSceneObj.avatar;
          }
          // Ensure background field is removed (keep only background_image array)
          if ('background' in targetSceneObj && !Array.isArray(targetSceneObj.background)) {
            delete targetSceneObj.background;
          }
        }
        return cloned;
      })();

      // Clean user and session objects - remove avatar and background fields
      const cleanUser = { ...user };
      // Remove avatar field if present
      if ('avatar' in cleanUser) {
        delete cleanUser.avatar;
      }
      // Remove background field if present (keep only background_image array if it exists)
      if ('background' in cleanUser && !Array.isArray(cleanUser.background)) {
        delete cleanUser.background;
      }
      
      const cleanSession = { ...sessionForBody };
      // Remove avatar field if present
      if ('avatar' in cleanSession) {
        delete cleanSession.avatar;
      }
      // Remove background field if present (keep only background_image array if it exists)
      if ('background' in cleanSession && !Array.isArray(cleanSession.background)) {
        delete cleanSession.background;
      }

      const requestBody = {
        user: cleanUser,
        session: cleanSession,
        changed_script: {
          userquery: originalUserquery,
          airesponse: airesponseWithVisuals,
          version: String(scriptVersion || 'v1')
        }
      };
      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-text', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody)
      });
      const txt = await resp.text(); let data; try { data = JSON.parse(txt); } catch(_) { data = txt; }
      if (!resp.ok || resp.status !== 200) throw new Error(`scripts/update-text failed: ${resp.status} ${txt}`);
      const container = data?.script ? { script: data.script } : data;
      const normalized = normalizeScriptToRows(container);
      const newRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
      setScriptRows(newRows);
      try {
        localStorage.setItem(scopedKey('updated_script_structure'), JSON.stringify(container));
        localStorage.setItem(scopedKey('original_script_hash'), JSON.stringify(container));
      } catch(_) {}
    } catch(e) {
      console.error('updateSceneGenImageFlag failed:', e);
      throw e; // Re-throw to allow caller to handle the error
    }
  };

  // Helper: Update text_to_be_included for a scene via update-text API
  const updateTextToBeIncluded = async (sceneIdx, textToBeIncludedArray) => {
    if (isUpdatingText) return;
    setIsUpdatingText(true);
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) throw new Error('Missing session_id or token');

      // Load session snapshot
      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessText = await sessionResp.text();
      let sessJson; try { sessJson = JSON.parse(sessText); } catch(_) { sessJson = {}; }
      if (!sessionResp.ok) throw new Error(`user-session/data failed: ${sessionResp.status} ${sessText}`);
      const rawSession = sessJson?.session_data || sessJson?.session || {};
      const sessionForBody = sanitizeSessionSnapshot(rawSession, sessionId, token);
      const rawUser = sessJson?.user_data || rawSession?.user_data || rawSession?.user || {};
      const user = normalizeUserSnapshot(rawUser, token);
      const scriptsSource = Array.isArray(sessionForBody?.scripts) ? sessionForBody.scripts : [];
      const primaryScript = scriptsSource[0] || {};
      const originalUserquery = Array.isArray(primaryScript?.userquery) ? primaryScript.userquery : [];
      const scriptVersion = primaryScript?.version || sessionForBody?.version || 'v1';
      const airesponseSource = Array.isArray(primaryScript?.airesponse)
        ? primaryScript.airesponse.map((item) => (item && typeof item === 'object' ? { ...item } : item))
        : [];
      const rows = Array.isArray(scriptRows) ? scriptRows : [];
      const targetRow = rows[sceneIdx] || {};
      const targetSceneNumber = targetRow?.scene_number ?? (sceneIdx + 1);

      const clonePromptTemplate = (tpl) => {
        if (!tpl || typeof tpl !== 'object') return null;
        if (Array.isArray(tpl)) return [...tpl];
        return { ...tpl };
      };

      // Update the specific scene's text_to_be_included
      let matchedScene = false;
      const airesponse = airesponseSource.map((scene, idx) => {
        if (!scene || typeof scene !== 'object') return scene;
        const sceneNumber =
          scene?.scene_number ??
          scene?.scene_no ??
          scene?.sceneNo ??
          scene?.scene ??
          (idx + 1);
        if (sceneNumber !== targetSceneNumber) {
          return { ...scene };
        }
        matchedScene = true;
        const clone = { ...scene };
        
        // Update text_to_be_included
        clone.text_to_be_included = Array.isArray(textToBeIncludedArray) 
          ? textToBeIncludedArray.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim())
          : [];
        
        return clone;
      });

      // If scene not found, add it as a new scene
      const finalAiresponse = matchedScene ? airesponse : (() => {
        const fallbackRow = rows[sceneIdx] || {};
        const fallbackScene = {
          scene_number: targetSceneNumber,
          scene_title: fallbackRow?.scene_title ?? '',
          model: fallbackRow?.mode ?? fallbackRow?.model ?? '',
          timeline: fallbackRow?.timeline ?? '',
          text_to_be_included: Array.isArray(textToBeIncludedArray)
            ? textToBeIncludedArray.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim())
            : [],
          ref_image: [],
          background_image: [],
          avatar_urls: []
        };
        return [...airesponse, fallbackScene];
      })();

      const requestBody = {
        user,
        session: sessionForBody,
        changed_script: {
          userquery: originalUserquery,
          airesponse: finalAiresponse,
          version: String(scriptVersion || 'v1')
        }
      };

      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-text', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody)
      });
      const txt = await resp.text();
      let data;
      try { data = JSON.parse(txt); } catch(_) { data = txt; }
      if (!resp.ok || resp.status !== 200) throw new Error(`scripts/update-text failed: ${resp.status} ${txt}`);
      
      const container = data?.script ? { script: data.script } : data;
      const normalized = normalizeScriptToRows(container);
      const newRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
      setScriptRows(newRows);
      try {
        localStorage.setItem(scopedKey('updated_script_structure'), JSON.stringify(container));
        localStorage.setItem(scopedKey('original_script_hash'), JSON.stringify(container));
      } catch(_) {}
    } catch(e) {
      console.error('updateTextToBeIncluded failed:', e);
      alert('Failed to update text to be included. Please try again.');
      throw e;
    } finally {
      setIsUpdatingText(false);
    }
  };

  // Helper: Regenerate chart with new chart type via regenerate-chart API
  const regenerateChart = async (sceneIdx, chartType) => {
    if (isRegeneratingChart) return;
    setIsRegeneratingChart(true);
    try {
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) throw new Error('Missing session_id or token');

      // Build session and user objects
      const { session, user } = await buildSessionAndUserForScene();
      const formattedUser = formatUserForVisual(user, token);
      const formattedSession = formatSessionForVisual(session, sessionId, token);

      // Get scene number
      const rows = Array.isArray(scriptRows) ? scriptRows : [];
      const targetRow = rows[sceneIdx] || {};
      const sceneNumber = targetRow?.scene_number ?? (sceneIdx + 1);

      const requestBody = {
        user: formattedUser,
        session: formattedSession,
        scene_number: Number(sceneNumber) || 0,
        chart_type: String(chartType || '').toLowerCase()
      };

      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/regenerate-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      const txt = await resp.text();
      let data;
      try { data = JSON.parse(txt); } catch(_) { data = txt; }
      
      if (!resp.ok || resp.status !== 200) {
        throw new Error(`regenerate-chart failed: ${resp.status} ${txt}`);
      }

      // Log the response for debugging
      try {
        console.log('[regenerateChart] API response:', {
          status: resp.status,
          hasScript: !!(data?.script || data?.scriptArray),
          hasChartType: !!(data?.chart_type || data?.chartType),
          hasChartData: !!(data?.chart_data || data?.chartData),
          sceneNumber,
          requestedChartType: chartType,
          responseKeys: Object.keys(data || {}),
          responseData: data
        });
        
        // Check if the response has the scene data directly
        if (data?.script && Array.isArray(data.script) && data.script[sceneIdx]) {
          const sceneInResponse = data.script[sceneIdx];
          console.log('[regenerateChart] Scene in response:', {
            sceneIdx,
            chart_type: sceneInResponse?.chart_type || sceneInResponse?.chartType,
            has_chart_data: !!(sceneInResponse?.chart_data || sceneInResponse?.chartData)
          });
        }
      } catch(_) {}

      // Update local state with the response
      // The response should contain updated script data
      let finalChartType = chartType; // Default to requested type
      let preservedChartData = null; // Will preserve transformed chart_data
      
      if (data?.script || data?.scriptArray) {
        const scriptArray = data.script || data.scriptArray;
        const container = { script: scriptArray };
        const normalized = normalizeScriptToRows(container);
        const newRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
        
        // Verify the updated scene has the correct chart_data and chart_type
        const updatedScene = newRows[sceneIdx];
        if (updatedScene) {
          try {
            // Extract chart type from response (prefer response value over parameter)
            // Check multiple possible locations
            let responseChartType = updatedScene.chart_type || updatedScene.chartType;
            
            // Also check the raw script array item
            if (!responseChartType && Array.isArray(scriptArray) && scriptArray[sceneIdx]) {
              const rawScene = scriptArray[sceneIdx];
              responseChartType = rawScene?.chart_type || rawScene?.chartType;
            }
            
            // Also check top-level response
            if (!responseChartType) {
              responseChartType = data.chart_type || data.chartType;
            }
            
            if (responseChartType) {
              finalChartType = String(responseChartType).toLowerCase().trim();
              console.log('[regenerateChart] Extracted chart type from response:', finalChartType);
            } else {
              console.warn('[regenerateChart] No chart type found in response, using requested:', chartType);
            }
            const sceneChartType = finalChartType;
            const sceneChartData = updatedScene.chart_data || updatedScene.chartData;
            
            console.log('[regenerateChart] Updated scene data:', {
              sceneIdx,
              chart_type: sceneChartType,
              requested_chart_type: chartType,
              response_chart_type: responseChartType,
              has_chart_data: !!sceneChartData,
              chart_data_type: typeof sceneChartData
            });
            
            // Ensure chart_data format matches the chart_type
            if (sceneChartData && sceneChartType) {
              const isPieDonut = sceneChartType === 'pie' || sceneChartType === 'donut';
              
              // Safely parse chart data
              let parsedData;
              try {
                if (typeof sceneChartData === 'string') {
                  parsedData = JSON.parse(sceneChartData);
                } else if (typeof sceneChartData === 'object' && sceneChartData !== null) {
                  parsedData = sceneChartData;
                } else {
                  console.warn('[regenerateChart] Invalid chart_data type:', typeof sceneChartData);
                  parsedData = null;
                }
              } catch (parseError) {
                console.error('[regenerateChart] Error parsing chart_data:', parseError);
                parsedData = null;
              }
              
              if (parsedData && parsedData.series) {
                try {
              // Check if data format matches chart type
              const hasLabels = parsedData?.series?.labels && Array.isArray(parsedData.series.labels);
              const hasValues = parsedData?.series?.data?.[0]?.values && Array.isArray(parsedData.series.data[0].values);
              const hasX = parsedData?.series?.x && Array.isArray(parsedData.series.x);
              const hasY = parsedData?.series?.data?.[0]?.y && Array.isArray(parsedData.series.data[0].y);
              
              // If format doesn't match, transform it
              if (isPieDonut && (hasX || hasY) && !(hasLabels && hasValues)) {
                    // Convert from standard format (bar/line) to pie/donut format
                    try {
                      const x = Array.isArray(parsedData.series.x) ? parsedData.series.x : [];
                      let yValues = [];
                      
                      // Try to get y values from different possible locations
                      if (Array.isArray(parsedData.series.data?.[0]?.y)) {
                        yValues = parsedData.series.data[0].y;
                      } else if (Array.isArray(parsedData.series.data?.[0]?.values)) {
                        yValues = parsedData.series.data[0].values;
                      } else if (Array.isArray(parsedData.series.y)) {
                        yValues = parsedData.series.y;
                      } else if (Array.isArray(parsedData.series.values)) {
                        yValues = parsedData.series.values;
                      }
                      
                      // Ensure arrays have data and same length
                      if (x.length > 0 && yValues.length > 0) {
                        // If lengths don't match, use the minimum length
                        const minLength = Math.min(x.length, yValues.length);
                        const transformedData = {
                          ...parsedData,
                          series: {
                            labels: x.slice(0, minLength).map(v => String(v || '')),
                            data: [{ values: yValues.slice(0, minLength).map(v => Number(v) || 0) }]
                          }
                };
                        newRows[sceneIdx].chart_data = transformedData;
                        newRows[sceneIdx].chartData = transformedData;
                        console.log('[regenerateChart] Transformed chart_data from bar/line to pie/donut format', {
                          originalLength: { x: x.length, y: yValues.length },
                          transformedLength: minLength
                        });
                      } else {
                        console.warn('[regenerateChart] Cannot transform: empty or invalid data arrays', {
                          xLength: x.length,
                          yLength: yValues.length,
                          seriesStructure: Object.keys(parsedData.series || {})
                        });
                        // Still store the parsed data even if transformation fails
                newRows[sceneIdx].chart_data = parsedData;
                newRows[sceneIdx].chartData = parsedData;
                      }
                    } catch (transformErr) {
                      console.error('[regenerateChart] Error transforming to pie/donut format:', transformErr);
                      // Store original data on error
                      newRows[sceneIdx].chart_data = parsedData;
                      newRows[sceneIdx].chartData = parsedData;
                    }
              } else if (!isPieDonut && (hasLabels && hasValues) && !(hasX && hasY)) {
                    // Convert from pie/donut format to standard format (bar/line)
                    const labels = Array.isArray(parsedData.series.labels) ? parsedData.series.labels : [];
                    const values = Array.isArray(parsedData.series.data?.[0]?.values) 
                      ? parsedData.series.data[0].values 
                      : [];
                    
                    // Ensure arrays have data and same length
                    if (labels.length > 0 && values.length > 0) {
                      const minLength = Math.min(labels.length, values.length);
                      const transformedData = {
                        ...parsedData,
                        series: {
                          x: labels.slice(0, minLength),
                          data: [{ name: 'Series 1', y: values.slice(0, minLength) }]
                        }
                };
                      newRows[sceneIdx].chart_data = transformedData;
                      newRows[sceneIdx].chartData = transformedData;
                      console.log('[regenerateChart] Transformed chart_data from pie/donut to bar/line format', {
                        originalLength: { labels: labels.length, values: values.length },
                        transformedLength: minLength
                      });
                    } else {
                      console.warn('[regenerateChart] Cannot transform: empty or invalid data arrays', {
                        labelsLength: labels.length,
                        valuesLength: values.length
                      });
                      // Still store the parsed data even if transformation fails
                newRows[sceneIdx].chart_data = parsedData;
                newRows[sceneIdx].chartData = parsedData;
                    }
                  } else {
                    // Data format is correct, just ensure it's stored properly
                    newRows[sceneIdx].chart_data = parsedData;
                    newRows[sceneIdx].chartData = parsedData;
                    console.log('[regenerateChart] Chart data format is already correct for', sceneChartType);
                  }
                } catch (transformError) {
                  console.error('[regenerateChart] Error during data transformation:', transformError);
                  // Store the original parsed data even if transformation fails
                  newRows[sceneIdx].chart_data = parsedData;
                  newRows[sceneIdx].chartData = parsedData;
                }
              } else if (parsedData) {
                // If parsedData exists but doesn't have series, store it as-is
                console.warn('[regenerateChart] Chart data does not have series structure, storing as-is');
                newRows[sceneIdx].chart_data = parsedData;
                newRows[sceneIdx].chartData = parsedData;
              }
            }
            
            // Update chart type in the row (always use finalChartType which comes from response if available)
            newRows[sceneIdx].chart_type = finalChartType;
            newRows[sceneIdx].chartType = finalChartType;
          } catch(e) {
            console.error('[regenerateChart] Error processing scene data:', e);
            // Even if there's an error, ensure chart type is updated
            if (newRows[sceneIdx]) {
              newRows[sceneIdx].chart_type = finalChartType;
              newRows[sceneIdx].chartType = finalChartType;
            }
            // Don't throw - continue with update even if transformation fails
          }
        } else {
          // If updatedScene is null, still try to update chart type if row exists
          if (newRows[sceneIdx]) {
            newRows[sceneIdx].chart_type = finalChartType;
            newRows[sceneIdx].chartType = finalChartType;
            console.warn('[regenerateChart] Updated scene not found, but setting chart type on row');
          }
        }
        
        // Preserve transformed chart_data before reloading
        preservedChartData = newRows[sceneIdx]?.chart_data || newRows[sceneIdx]?.chartData || null;
        
        setScriptRows(newRows);
        try {
          localStorage.setItem(scopedKey('updated_script_structure'), JSON.stringify(container));
          localStorage.setItem(scopedKey('original_script_hash'), JSON.stringify(container));
        } catch(_) {}
      } else {
        // If response doesn't have script, try to update chart_data directly from response
        if (data?.chart_data || data?.chartData) {
          const chartData = data.chart_data || data.chartData;
          handleSceneUpdate(sceneIdx, 'chart_data', chartData);
          try {
            console.log('[regenerateChart] Updated chart_data directly from response');
          } catch(_) {}
        }
        
        // Also check if chart_type is in the response
        if (data?.chart_type || data?.chartType) {
          finalChartType = String(data.chart_type || data.chartType).toLowerCase();
        }
      }

      // If we didn't get chart_data from script response, try to get it from current scene
      if (!preservedChartData) {
        const currentRows = Array.isArray(scriptRows) ? scriptRows : [];
        if (currentRows[sceneIdx]) {
          preservedChartData = currentRows[sceneIdx].chart_data || currentRows[sceneIdx].chartData;
        }
      }

      // Update local chart type with the final value (from response if available, otherwise requested)
      handleSceneUpdate(sceneIdx, 'chart_type', finalChartType);
      
      // Reload script from session to ensure we have the latest version
      try {
        const sessionId = localStorage.getItem('session_id');
        const token = localStorage.getItem('token');
        if (sessionId && token) {
          const sessResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: token, session_id: sessionId })
          });
          
          if (sessResp.ok) {
            const sessText = await sessResp.text();
            let sessData;
            try { sessData = JSON.parse(sessText); } catch(_) { sessData = sessText; }
            
            const sessionData = sessData?.session_data || {};
            const script = sessionData?.script || sessionData?.scriptArray || [];
            
            if (Array.isArray(script) && script.length > 0) {
              const container = { script };
              const normalized = normalizeScriptToRows(container);
              const reloadedRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
              
              // Apply persisted refs to maintain user selections
              const rowsWithPersistedRefs = applyPersistedRefsToRows(reloadedRows);
              
              // Ensure the regenerated scene has the correct chart type and chart_data
              if (rowsWithPersistedRefs[sceneIdx]) {
                if (finalChartType) {
                  rowsWithPersistedRefs[sceneIdx].chart_type = finalChartType;
                  rowsWithPersistedRefs[sceneIdx].chartType = finalChartType;
                  console.log('[regenerateChart] Set chart type in reloaded rows:', finalChartType);
                }
                
                // Preserve the transformed chart_data from API response if available
                if (preservedChartData) {
                  rowsWithPersistedRefs[sceneIdx].chart_data = preservedChartData;
                  rowsWithPersistedRefs[sceneIdx].chartData = preservedChartData;
                  console.log('[regenerateChart] Preserved transformed chart_data in reloaded rows');
                } else {
                  // If no preserved data, check if session has chart_data and ensure it's in correct format
                  const sessionChartData = rowsWithPersistedRefs[sceneIdx].chart_data || rowsWithPersistedRefs[sceneIdx].chartData;
                  if (sessionChartData && finalChartType) {
                    // ChartDataEditor will handle transformation, but we ensure it's set
                    rowsWithPersistedRefs[sceneIdx].chart_data = sessionChartData;
                    rowsWithPersistedRefs[sceneIdx].chartData = sessionChartData;
                    console.log('[regenerateChart] Using chart_data from session');
                  }
                }
              }
              
              // Update script rows with latest data from session
              setScriptRows(rowsWithPersistedRefs);
              
              // Update localStorage with latest script structure
              try {
                localStorage.setItem(scopedKey('updated_script_structure'), JSON.stringify(container));
              } catch(_) {}
              
              console.log('[regenerateChart] Reloaded script from session after regeneration', {
                sceneIdx,
                chartType: rowsWithPersistedRefs[sceneIdx]?.chart_type || rowsWithPersistedRefs[sceneIdx]?.chartType,
                hasChartData: !!(rowsWithPersistedRefs[sceneIdx]?.chart_data || rowsWithPersistedRefs[sceneIdx]?.chartData),
                finalChartType
              });
            }
          }
        }
      } catch (reloadError) {
        console.warn('[regenerateChart] Failed to reload script from session:', reloadError);
        // Don't throw - we already updated from the API response
      }
    } catch(e) {
      console.error('regenerateChart failed:', e);
      const errorMessage = e?.message || 'Unknown error';
      
      // If the API call itself failed, throw the error
      // But if it's a data processing error, we might still want to update chart type
      if (errorMessage.includes('regenerate-chart failed') || errorMessage.includes('Missing session')) {
        alert(`Failed to regenerate chart: ${errorMessage}. Please try again.`);
      throw e;
      } else {
        // For other errors (like data processing), log but don't block
        console.warn('Non-critical error during chart regeneration:', errorMessage);
        // Still update chart type even if data processing had issues
        try {
          handleSceneUpdate(sceneIdx, 'chart_type', chartType);
        } catch (updateError) {
          console.error('Failed to update chart type after error:', updateError);
        }
        // Don't throw - allow the UI to update
      }
    } finally {
      setIsRegeneratingChart(false);
    }
  };

const beginAdvancedStylesEdit = () => {
  const scene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
  if (!scene) return;
  advancedStylesBackupRef.current = {
    colors: Array.isArray(scene?.colors) ? [...scene.colors] : [],
    font_size: scene?.font_size ?? scene?.fontsize ?? scene?.fontSize ?? 16,
    font_style: scene?.font_style ?? scene?.fontStyle ?? ''
  };
  setIsEditingAdvancedStyles(true);
};

const cancelAdvancedStylesEdit = () => {
  const backup = advancedStylesBackupRef.current;
  if (backup) {
    handleSceneUpdate(currentSceneIndex, 'colors', Array.isArray(backup.colors) ? [...backup.colors] : []);
    handleSceneUpdate(currentSceneIndex, 'font_size', backup.font_size ?? 16);
    handleSceneUpdate(currentSceneIndex, 'font_style', backup.font_style ?? '');
  }
  advancedStylesBackupRef.current = null;
  setIsEditingAdvancedStyles(false);
};

const saveAdvancedStyles = async () => {
  if (isSavingAdvancedStyles) return;
  try {
    setIsSavingAdvancedStyles(true);
    await updateSceneGenImageFlag(currentSceneIndex);
    setIsEditingAdvancedStyles(false);
    advancedStylesBackupRef.current = null;
  } catch (err) {
    console.error('Failed to save advanced style options:', err);
    alert('Failed to update style options. Please try again.');
  } finally {
    setIsSavingAdvancedStyles(false);
  }
};

const beginSceneDataEdit = () => {
  const scene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
  if (!scene) return;
  // Backup both description and veo3_prompt_template
  const backup = {
    description: scene?.description || '',
    veo3_prompt_template: scene?.veo3_prompt_template ? JSON.parse(JSON.stringify(scene.veo3_prompt_template)) : {}
  };
  sceneDataBackupRef.current = backup;
  setIsEditingSceneData(true);
};

const cancelSceneDataEdit = () => {
  const backup = sceneDataBackupRef.current;
  if (backup) {
    // Restore description
    if (backup.description !== undefined) {
      handleSceneUpdate(currentSceneIndex, 'description', backup.description);
    }
    // Restore veo3_prompt_template if it existed
    if (backup.veo3_prompt_template && Object.keys(backup.veo3_prompt_template).length > 0) {
      handleSceneUpdate(currentSceneIndex, 'veo3_prompt_template', JSON.parse(JSON.stringify(backup.veo3_prompt_template)));
    }
  }
  sceneDataBackupRef.current = null;
  setIsEditingSceneData(false);
};

const saveSceneData = async () => {
  if (isSavingSceneData) return;
  try {
    setIsSavingSceneData(true);
    await updateSceneGenImageFlag(currentSceneIndex);
    setIsEditingSceneData(false);
    sceneDataBackupRef.current = null;
  } catch (err) {
    console.error('Failed to save scene data:', err);
    alert('Failed to update scene data. Please try again.');
  } finally {
    setIsSavingSceneData(false);
  }
};

const beginAnchorPromptEdit = () => {
  const scene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
  if (!scene || !scene?.anchor_prompt_template) return;
  anchorPromptBackupRef.current = JSON.parse(JSON.stringify(scene.anchor_prompt_template));
  setIsEditingAnchorPrompt(true);
};

const cancelAnchorPromptEdit = () => {
  const backup = anchorPromptBackupRef.current;
  if (backup) {
    handleSceneUpdate(currentSceneIndex, 'anchor_prompt_template', JSON.parse(JSON.stringify(backup)));
  }
  anchorPromptBackupRef.current = null;
  setIsEditingAnchorPrompt(false);
};

const saveAnchorPromptTemplate = async () => {
  if (isSavingAnchorPrompt) return;
  try {
    setIsSavingAnchorPrompt(true);
    await updateSceneGenImageFlag(currentSceneIndex);
    setIsEditingAnchorPrompt(false);
    anchorPromptBackupRef.current = null;
  } catch (err) {
    console.error('Failed to save anchor prompt template:', err);
    alert('Failed to update anchor prompt template. Please try again.');
  } finally {
    setIsSavingAnchorPrompt(false);
  }
};

  const [showSaveConfirm, setShowSaveConfirm] = useState(false);

  // Function to save the current reordered state
  const saveReorderedScript = async (rowsOverride = null) => {
    if (isSavingReorder) return;
    setIsSavingReorder(true);
    try {
      // 1) Fetch session data for reorder API via user-session/data (no custom schema guessing)
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) throw new Error('Missing session_id or token');
      const sessionReqBody = { user_id: token, session_id: sessionId };
      console.log('user-session/data request payload:', sessionReqBody);

      const sessionResp = await fetch(
        'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(sessionReqBody),
        }
      );

      if (!sessionResp.ok) {
        const text = await sessionResp.text();
        throw new Error(`user-session/data failed: ${sessionResp.status} ${text}`);
      }
      const sessionDataResponse = await sessionResp.json();
      console.log('user-session/data response:', sessionDataResponse);

      // 2) Build the reordered script array from current UI rows - include ALL fields
      const rows = Array.isArray(rowsOverride) ? rowsOverride : (Array.isArray(scriptRows) ? scriptRows : []);
      const orderedScriptArray = rows.map((r, idx) => {
        const fontSizeRaw = r?.font_size ?? r?.fontsize ?? r?.fontSize;
        const fontSizeNum = typeof fontSizeRaw === 'number'
          ? fontSizeRaw
          : Number.parseInt(String(fontSizeRaw || '').replace(/[^0-9]/g, ''), 10);
        
        // Build complete scene object with ALL fields from scriptRows
        const sceneData = {
          scene_number: r?.scene_number ?? idx + 1,
          scene_title: r?.scene_title ?? r?.sceneTitle ?? '',
          model: r?.mode ?? r?.model ?? '',
          mode: r?.mode ?? r?.model ?? '',
          timeline: r?.timeline ?? '',
          narration: r?.narration ?? '',
          description: r?.description ?? r?.desc ?? '',
          desc: r?.description ?? r?.desc ?? '',
          font_style: r?.font_style ?? r?.fontStyle ?? '',
          font_size: Number.isFinite(fontSizeNum) ? fontSizeNum : 0,
          fontSize: Number.isFinite(fontSizeNum) ? fontSizeNum : 0,
          text_to_be_included: Array.isArray(r?.text_to_be_included)
            ? r.text_to_be_included
            : (typeof r?.text_to_include === 'string' && r.text_to_include.trim() ? [r.text_to_include.trim()] : []),
          ref_image: filterImageUrls(
            Array.isArray(r?.ref_image)
              ? r.ref_image
              : (typeof r?.ref_image === 'string' && r.ref_image.trim())
              ? [r.ref_image]
              : []
          ),
          folderLink: r?.folderLink ?? r?.folder_link ?? '',
          folder_link: r?.folderLink ?? r?.folder_link ?? '',
          duration: r?.duration ?? 0,
          additional: r?.additional ?? r?.additional_info ?? '',
          additional_info: r?.additional ?? r?.additional_info ?? '',
          word_count: r?.word_count ?? 0,
          // Preserve presenter_options for VEO3/ANCHOR models
          presenter_options: r?.presenter_options || r?.presenterOptions || undefined,
          presenterOptions: r?.presenter_options || r?.presenterOptions || undefined,
          // Preserve prompt templates
          veo3_prompt_template: r?.veo3_prompt_template || r?.veo3PromptTemplate || undefined,
          veo3PromptTemplate: r?.veo3_prompt_template || r?.veo3PromptTemplate || undefined,
          anchor_prompt_template: r?.anchor_prompt_template || r?.anchorPromptTemplate || undefined,
          anchorPromptTemplate: r?.anchor_prompt_template || r?.anchorPromptTemplate || undefined,
          // Preserve avatar_urls for VEO3/ANCHOR
          avatar_urls: Array.isArray(r?.avatar_urls) ? r.avatar_urls : undefined,
          avatarUrls: Array.isArray(r?.avatar_urls) ? r.avatar_urls : undefined,
          // Preserve gen_image flag
          gen_image: typeof r?.gen_image === 'boolean' ? r.gen_image : undefined,
          genImage: typeof r?.gen_image === 'boolean' ? r.gen_image : undefined,
          // Chart-specific fields for Financial (PLOTLY) scenes
          chart_type: r?.chart_type ?? r?.chartType ?? undefined,
          chartType: r?.chart_type ?? r?.chartType ?? undefined,
          chart_data: r?.chart_data ?? r?.chartData ?? undefined,
          chartData: r?.chart_data ?? r?.chartData ?? undefined,
          // Styling and colors
          colors: Array.isArray(r?.colors) ? r.colors : undefined,
        };
        
        // Remove undefined values to keep the payload clean
        Object.keys(sceneData).forEach(key => {
          if (sceneData[key] === undefined) {
            delete sceneData[key];
          }
        });
        
        return sceneData;
      });

      // 3) Use session data and user data from user-session-data API response as-is
      // Extract session_data and user_data from the response
      const sessionData = sessionDataResponse?.session_data || sessionDataResponse?.session || {};
      const userData = sessionDataResponse?.user_data || sessionData?.user_data || sessionData?.user || {};
      
      if (!sessionData || Object.keys(sessionData).length === 0) {
        throw new Error('session_data missing in user-session-data response');
      }
      if (!userData || Object.keys(userData).length === 0) {
        throw new Error('user_data missing in user-session-data response');
      }
      
      // Extract session_id from session_data.id (it's stored as 'id' in session_data)
      const sessionIdFromData = sessionData?.id || sessionData?.session_id || sessionId || '';
      
      // Get the script directly from session_data.scripts
      const sessionScripts = Array.isArray(sessionData?.scripts) ? sessionData.scripts : [];
      let scriptFromSession = null;
      
      // Find the script in session_data.scripts
      if (sessionScripts.length > 0) {
        // If scripts is an array of objects, take the first one
        if (typeof sessionScripts[0] === 'object' && sessionScripts[0] !== null) {
          scriptFromSession = sessionScripts[0];
        } else if (typeof sessionScripts[0] === 'string') {
          // If it's a string, try to parse it
          try {
            scriptFromSession = JSON.parse(sessionScripts[0]);
          } catch (_) {
            scriptFromSession = { airesponse: [], userquery: [] };
          }
        }
      }
      
      // If no script found in scripts array, check if sessionData itself has script data
      if (!scriptFromSession) {
        if (sessionData?.script) {
          scriptFromSession = typeof sessionData.script === 'string' 
            ? JSON.parse(sessionData.script) 
            : sessionData.script;
        } else if (Array.isArray(sessionData?.airesponse)) {
          scriptFromSession = { 
            airesponse: sessionData.airesponse,
            userquery: Array.isArray(sessionData?.userquery) ? sessionData.userquery : []
          };
      } else {
          // Fallback: use the orderedScriptArray we built
          scriptFromSession = { 
            airesponse: orderedScriptArray,
            userquery: []
          };
        }
      }
      
      // Get the original airesponse from the script in session data
      const originalAiresponse = Array.isArray(scriptFromSession?.airesponse) 
        ? scriptFromSession.airesponse 
        : [];
      
      // Get the original userquery from the script
      const originalUserquery = Array.isArray(scriptFromSession?.userquery)
        ? scriptFromSession.userquery
        : Array.isArray(sessionData?.userquery)
        ? sessionData.userquery
        : [];
      
      // Reorder the airesponse based on the current UI order (scriptRows)
      // Create a map of scene_number to scene data from original airesponse
      const originalScenesMap = new Map();
      originalAiresponse.forEach((scene, idx) => {
        const sceneNum = scene?.scene_number ?? scene?.scene_no ?? scene?.no ?? (idx + 1);
        originalScenesMap.set(sceneNum, scene);
      });
      
      // Build reordered airesponse based on current scriptRows order
      // Use the original scene data from session script exactly as-is, only update scene_number
      const reorderedAiresponse = rows.map((r, idx) => {
        const sceneNum = r?.scene_number ?? (idx + 1);
        // Get the original scene data from session script
        const originalScene = originalScenesMap.get(sceneNum) || originalAiresponse[idx] || {};
        
        // Use the original scene data exactly as-is from session script
        // Only update scene_number to reflect the new order
        const reorderedScene = {
          ...originalScene, // Use all original fields from session script exactly as they are
        };
        reorderedScene.scene_number = idx + 1; // Update scene_number to new order
        
        return reorderedScene;
      });
      
      // If we have more scenes in original than in current rows, append them at the end
      if (originalAiresponse.length > rows.length) {
        for (let i = rows.length; i < originalAiresponse.length; i++) {
          const extraScene = { ...originalAiresponse[i] };
          extraScene.scene_number = reorderedAiresponse.length + 1;
          reorderedAiresponse.push(extraScene);
        }
      }

      // Prepare session object according to API schema:
      // session should have: session_id, user_id, and all other fields from session_data
      const sessionForRequest = { ...sessionData };
      
      // Set session_id from session_data.id (the id field in session_data is the session_id)
      // Priority: sessionData.id > sessionData.session_id > sessionId from localStorage
      const finalSessionId = sessionData?.id || sessionData?.session_id || sessionId || '';
      
      if (finalSessionId) {
        sessionForRequest.session_id = String(finalSessionId);
      } else {
        throw new Error('session_id not found: sessionData.id, sessionData.session_id, and localStorage sessionId are all missing');
      }
      
      // Remove id field from session object (we've copied it to session_id)
      if (sessionForRequest.id) {
        delete sessionForRequest.id;
      }
      
      // Ensure user_id is in session object (from sessionData.user_id or token)
      // According to schema, session should have both session_id and user_id
      if (!sessionForRequest.user_id) {
        const userIdFromData = sessionData?.user_id || token || '';
        if (userIdFromData) {
          sessionForRequest.user_id = String(userIdFromData);
        }
      }
      
      console.log('[Reorder] Session object prepared:', {
        hasSessionId: !!sessionForRequest.session_id,
        sessionId: sessionForRequest.session_id,
        hasUserId: !!sessionForRequest.user_id,
        userId: sessionForRequest.user_id,
        sessionDataId: sessionData?.id,
        sessionDataSessionId: sessionData?.session_id,
        sessionDataUserId: sessionData?.user_id,
        localStorageSessionId: sessionId,
        token: token
      });

      // Prepare user object according to API schema:
      // user should have: id (not session_id), and all other fields from user_data
      const userForRequest = { ...userData };
      
      // Ensure user object has 'id' field (from userData.id or userData.user_id or token)
      if (!userForRequest.id) {
        const userIdForUser = userData?.id || userData?.user_id || token || '';
        if (userIdForUser) {
          userForRequest.id = String(userIdForUser);
        }
      }
      
      // Build reorder request body using session and user data according to API schema
      const reorderRequestBody = {
        session: sessionForRequest, // Session with session_id and user_id
        user: userForRequest, // User with id field
        reordered_script: {
          userquery: originalUserquery,
          airesponse: reorderedAiresponse, // Use script from session data exactly as-is, only reordered
        },
      };
      
      // Verify request body structure matches API schema
      console.log('[Reorder] Request body verification:', {
        session: {
          hasSessionId: !!reorderRequestBody.session?.session_id,
          sessionId: reorderRequestBody.session?.session_id,
          hasUserId: !!reorderRequestBody.session?.user_id,
          userId: reorderRequestBody.session?.user_id,
          sessionKeys: Object.keys(reorderRequestBody.session || {})
        },
        user: {
          hasId: !!reorderRequestBody.user?.id,
          id: reorderRequestBody.user?.id,
          userKeys: Object.keys(reorderRequestBody.user || {})
        },
        reordered_script: {
          hasUserquery: Array.isArray(reorderRequestBody.reordered_script?.userquery),
          hasAiresponse: Array.isArray(reorderRequestBody.reordered_script?.airesponse),
          airesponseLength: reorderRequestBody.reordered_script?.airesponse?.length
        }
      });
      console.log('scripts/reorder request body:', reorderRequestBody);

      // 4) Call unified reorder endpoint
      const reorderResp = await fetch(
        `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/reorder`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(reorderRequestBody),
        }
      );

      const reorderText = await reorderResp.text();
      let reorderData;
      try { reorderData = JSON.parse(reorderText); } catch (_) { reorderData = reorderText; }
      if (!reorderResp.ok) {
        throw new Error(`scripts/reorder failed: ${reorderResp.status} ${reorderText}`);
      }
      console.log('scripts/reorder response:', reorderData);

      // 5) Find updated script in response and update modal/UI
      // Prefer nested "reordered_script" if present; otherwise try root
      const reorderedScriptContainer = reorderData?.reordered_script ?? reorderData;
      try {
        // Persist the updated script structure for export and future edits
        localStorage.setItem(scopedKey('updated_script_structure'), JSON.stringify(reorderedScriptContainer));
        localStorage.setItem(scopedKey('original_script_hash'), JSON.stringify(reorderedScriptContainer));
      } catch (_) { /* noop */ }

      // Update reordered rows cache based on server response
      try {
        const normalized = normalizeScriptToRows(reorderedScriptContainer);
        const newRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
        setScriptRows(newRows);
        // Enable undo after successful reorder
        setCanUndo(true); setCanRedo(false);
        // Update last script references
        try {
          setChatHistory(prev => {
            const copy = [...prev];
            for (let i = copy.length - 1; i >= 0; i--) {
              if (copy[i]?.script) { copy[i] = { ...copy[i], script: reorderedScriptContainer }; break; }
            }
            try {
              localStorage.setItem(scopedKey('last_generated_script'), JSON.stringify(reorderedScriptContainer));
              localStorage.removeItem('last_generated_script');
            } catch (_) { /* noop */ }
            return copy;
          });
        } catch (_) { /* noop */ }
      } catch (_) { /* noop */ }

      // Refresh modal with updated script shown just like initial script
      openScriptModal(reorderedScriptContainer);
      // Enable undo after successful reorder (place after openScriptModal so flags persist)
      setCanUndo(true); setCanRedo(false);

      // Exit reorder table view and clear dirty flag
      setShowReorderTable(false);
      setShowSaveConfirm(false);
      setHasOrderChanged(false);

      // Trigger script refresh callback if provided
      if (onScriptChange) {
        onScriptChange();
      }

      // No chat message needed on reorder success; UI already updates
    } catch (e) {
      console.error('Failed to reorder script:', e);
      alert('Failed to reorder script. Please try again.');
    } finally {
      setIsSavingReorder(false);
    }
  };
  console.log(scriptRows)

  const activeScene = useMemo(() => {
    if (!Array.isArray(scriptRows) || scriptRows.length === 0) return null;
    const safeIndex = Math.min(Math.max(currentSceneIndex ?? 0, 0), scriptRows.length - 1);
    return scriptRows[safeIndex] || null;
  }, [scriptRows, currentSceneIndex]);

  const activeModelType = useMemo(() => {
    const candidates = [
      activeScene?.video_type,
      activeScene?.videoType,
      activeScene?.mode,
      activeScene?.mode_type,
      activeScene?.model,
      selectedVideoType
    ];
    const firstValid = candidates.find(
      (val) => typeof val === 'string' && val.trim().length > 0
    );
    if (!firstValid) return '';
    const upper = firstValid.trim().toUpperCase();
    if (['ANCHOR', 'ANCHOR BASED', 'ANCHOR-BASED'].includes(upper)) return 'Anchor';
    if (['VEO3', 'AVATAR', 'AVATAR BASED', 'AVATAR-BASED'].includes(upper)) return 'Avatar Based';
    if (['PLOTLY', 'FINANCIAL', 'FINANCE'].includes(upper)) return 'Financial';
    if (['SORA', 'INFOGRAPHIC', 'INFOGRAPHICS'].includes(upper)) return 'Infographic';
    return firstValid.trim();
  }, [activeScene, selectedVideoType]);

  const isSummarySceneActive = useMemo(() => {
    const title = String(
      activeScene?.scene_title ||
      activeScene?.sceneTitle ||
      ''
    ).trim().toLowerCase();
    return title === 'summary';
  }, [activeScene]);

  // Fetch summary templates when summary scene is active
  useEffect(() => {
    if (!isSummarySceneActive) {
      setSummaryTemplates({});
      setIsLoadingSummaryTemplates(false);
      return;
    }
    
    let cancelled = false;
    setIsLoadingSummaryTemplates(true);
    
    (async () => {
      try {
        const token = (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
        if (!token) {
          if (!cancelled) {
            setSummaryTemplates({});
            setIsLoadingSummaryTemplates(false);
          }
          return;
        }
        
        const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`);
        const text = await resp.text();
        let data;
        try { data = JSON.parse(text); } catch (_) { data = null; }
        
        if (cancelled) return;
        
        if (!resp.ok || !data || typeof data !== 'object') {
          if (!cancelled) {
            setSummaryTemplates({});
            setIsLoadingSummaryTemplates(false);
          }
          return;
        }
        
        const summaryTemplatesData = data?.summary_templates || {};
        if (!cancelled) {
          setSummaryTemplates(summaryTemplatesData);
          setIsLoadingSummaryTemplates(false);
        }
      } catch (err) {
        if (!cancelled) {
          setSummaryTemplates({});
          setIsLoadingSummaryTemplates(false);
          try { console.warn('Failed to load summary templates:', err); } catch (_) { /* noop */ }
        }
      }
    })();
    
    return () => { cancelled = true; setIsLoadingSummaryTemplates(false); };
  }, [isSummarySceneActive]);

  const isActiveAnchorModel = activeModelType === 'Anchor';
  const isActiveAvatarModel = activeModelType === 'Avatar Based';
  const isActiveInfographicModel = activeModelType === 'Infographic';
  const isActiveFinancialModel = activeModelType === 'Financial';

  const isAvatarModelSelected = newSceneVideoType === 'Avatar Based';
  const isInfographicModelSelected = newSceneVideoType === 'Infographic';
  const isFinancialModelSelected = newSceneVideoType === 'Financial';
  const suggestionStep =
    enablePresenterOptions && isAvatarModelSelected && requiresAvatarPresenterSelection ? 3 : 2;
  const showSuggestionSection = addSceneStep >= suggestionStep;
  const isPresenterSelectionPhase =
    enablePresenterOptions && isAvatarModelSelected && requiresAvatarPresenterSelection && addSceneStep === 2;
  const regenModelUpper = String(regenModel || '').toUpperCase();
  const regenModelLabel = React.useMemo(() => {
    switch (regenModelUpper) {
      case 'VEO3':
        return 'Avatar • VEO3';
      case 'ANCHOR':
        return 'Avatar • Anchor';
      case 'PLOTLY':
        return 'Financial • Plotly';
      case 'SORA':
      default:
        return (regenModelUpper || 'SORA') === 'SORA' ? 'Infographic • SORA' : (regenModelUpper || 'SORA');
    }
  }, [regenModelUpper]);
  const isRegenAvatarModel = regenModelUpper === 'VEO3' || regenModelUpper === 'ANCHOR';
  const regenSuggestionStep =
    enablePresenterOptions && isRegenAvatarModel && requiresRegenPresenterSelection ? 3 : 2;
  const showRegenSuggestionSection = regenStep >= regenSuggestionStep;
  const isRegenPresenterSelectionPhase =
    enablePresenterOptions && isRegenAvatarModel && requiresRegenPresenterSelection && regenStep === 2;
  return (
    <div className='bg-white h-[79vh] flex justify-between flex-col rounded-lg mt-3 p-6 relative'>
      {/* Video Type Switching Loader - Centered circular loader with text */}
      {isSwitchingVideoType && loadingVideoType && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/20">
          <div className="bg-white p-8 w-[300px] rounded-lg flex flex-col items-center justify-center shadow-xl">
            {/* Circular loader with logo */}
            <div className="relative w-20 h-20 mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-[#D8D3FF]"></div>
              <div className="absolute inset-2 rounded-full overflow-hidden">
                <img 
                  src={LogoImage} 
                  alt="Logo" 
                  className="w-full h-full object-contain animate-spin"
                  style={{ animationDuration: '2s' }}
                />
              </div>
            </div>
            {/* Loading text with video type */}
            <p className="text-lg font-semibold text-gray-900">Loading {loadingVideoType}...</p>
          </div>
        </div>
      )}
      {/* Add Scene Modal */}
      {showAddSceneModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white w-[95%] max-w-2xl rounded-lg shadow-xl flex flex-col max-h-[90vh]">
            <div className="px-6 pt-6 pb-4 flex-shrink-0">
              <h3 className="text-lg font-semibold text-[#13008B]">Add New Scene</h3>
            </div>
            <div className="px-6 overflow-y-auto flex-1 min-h-0">
              <div className="space-y-4 pb-4">
              {/* Step 1: Model selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Video Type</label>
                <div className="flex gap-3 flex-wrap">
                  {['Avatar Based', 'Infographic', 'Financial'].map((type) => (
                    <button
                      key={type}
                      onClick={() => {
                        setNewSceneVideoType(type);
                        setAddSceneStep(1);
                        setSceneSuggestions([]);
                        setNewSceneSelectedIdx(-1);
                        setNewSceneContent('');
                        setNewSceneDescription('');
                        setRequiresAvatarPresenterSelection(false);
                        setNewScenePresenterPresetId('');
                        setNewScenePresenterPresetLabel('');
                        setNewScenePresenterError('');
                        setIsLoadingNewScenePresenter(false);
                        if (type === 'Avatar Based') {
                          setNewSceneAvatarType('Presenter');
                        }
                      }}
                      className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                        newSceneVideoType === type
                          ? 'bg-[#13008B] text-white'
                          : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              {newSceneVideoType === 'Avatar Based' && addSceneStep >= 2 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Avatar Type</label>
                  <div className="flex gap-3 flex-wrap">
                    {['Presenter', 'Anchor'].map((atype) => (
                      <button
                        key={atype}
                        onClick={async () => {
                          setNewSceneAvatarType(atype);
                          // Reset presenter selection when avatar type changes
                          setNewScenePresenterPresetId('');
                          setNewScenePresenterPresetLabel('');
                          setNewScenePresenterError('');
                          if (enablePresenterOptions) {
                            try {
                              setIsLoadingNewScenePresenter(true);
                              const modelUpper = atype === 'Anchor' ? 'ANCHOR' : 'VEO3';
                              await fetchPresenterPresetsForModel(modelUpper);
                            } catch (_) {
                              // errors will already be handled inside fetchPresenterPresetsForModel
                            } finally {
                              setIsLoadingNewScenePresenter(false);
                            }
                          }
                        }}
                        className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                          newSceneAvatarType === atype
                            ? 'bg-[#13008B] text-white'
                            : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                        }`}
                      >
                        {atype}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              {newSceneVideoType === 'Financial' && addSceneStep === 1 && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
                    <select value={newSceneChartType} onChange={(e)=>setNewSceneChartType(e.target.value)} className="w-full p-2 border rounded">
                      <option value="">Select</option>
                      <option value="clustered_bar">Clustered Bar</option>
                      <option value="clustered_column">Clustered Column</option>
                      <option value="line">Line</option>
                      <option value="pie">Pie</option>
                      <option value="stacked_bar">Stacked Bar</option>
                      <option value="stacked_column">Staacked Column</option>
                      <option value="waterfall_bar">Waterfall Bar</option>
                      <option value="waterfall_column">Waterfall Column</option>
                      <option value="donut">Donut</option>
                    </select>
                  </div>
                </div>
              )}
              {newSceneVideoType === 'Financial' && addSceneStep >= 2 && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
                    <div className="px-3 py-2 rounded-lg border bg-gray-50 text-sm font-medium text-gray-800">
                      {newSceneChartType || 'Not selected'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chart Data (JSON)</label>
                    <textarea value={newSceneChartData} onChange={(e)=>setNewSceneChartData(e.target.value)} rows={4} className="w-full p-2 border rounded" placeholder='{"labels":["A","B"],"values":[10,20]}' />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Upload Document (to summarize)</label>
                    <input type="file" accept=".pdf,.doc,.docx,.txt" disabled={isUploadingNewSceneDoc} onChange={async (e)=>{
                      const file = e.target.files?.[0]; if (!file) return; setIsUploadingNewSceneDoc(true);
                      try {
                        const userId = localStorage.getItem('token');
                        const sessionId = localStorage.getItem('session_id');
                        if (!userId || !sessionId) throw new Error('Missing session');
                        // Extract
                        const form = new FormData(); form.append('files', file); form.append('user_id', userId); form.append('session_id', sessionId);
                        const extractUrl = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/documents/extract_documents`;
                        const ex = await fetch(extractUrl, { method: 'POST', body: form }); const tx = await ex.text();
                        if (!ex.ok) throw new Error(`extract failed: ${ex.status} ${tx}`);
                        // Summarize: requires { session, documents } using rich session object
                        let exJson; try { exJson = JSON.parse(tx); } catch(_) { exJson = {}; }
                        let documents = [];
                        if (Array.isArray(exJson?.documents)) documents = exJson.documents;
                        else if (Array.isArray(exJson)) documents = exJson;
                        else if (exJson && (exJson.documentName || exJson.slides)) documents = [exJson];
                        else if (Array.isArray(exJson?.data)) documents = exJson.data; else documents = [];
                        // Build session from user-session-data (align with other summarize flow)
                        let sessionObj = { session_id: sessionId, user_id: userId };
                        try {
                          const sResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, session_id: sessionId })
                          });
                          const st = await sResp.text();
                          let sj; try { sj = JSON.parse(st); } catch(_) { sj = {}; }
                          const sd = sj?.session_data || sj?.session || {};
                          sessionObj = {
                            session_id: sd.id || sd.session_id || sessionId,
                            user_id: sd.user_id || userId,
                            content: Array.isArray(sd.content) ? sd.content : [],
                            document_summary: Array.isArray(sd.document_summary) ? sd.document_summary : [{ additionalProp1: {} }],
                            video_duration: String(sd.video_duration || sd.videoduration || '60'),
                            created_at: sd.created_at || new Date().toISOString(),
                            totalsummary: Array.isArray(sd.totalsummary) ? sd.totalsummary : [],
                            messages: Array.isArray(sd.messages) ? sd.messages : [],
                            scripts: Array.isArray(sd.scripts) ? sd.scripts : [],
                            videos: Array.isArray(sd.videos) ? sd.videos : [],
                            images: Array.isArray(sd.images) ? sd.images : [],
                            final_link: sd.final_link || '',
                            videoType: sd.videoType || sd.video_type || '',
                            additionalProp1: sd.additionalProp1 || {}
                          };
                        } catch(_) { /* keep minimal sessionObj */ }
                        const summaryUrl = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/documents/summarize_documents`;
                        const sum = await fetch(summaryUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session: sessionObj, documents }) });
                        const ts = await sum.text(); let js; try { js = JSON.parse(ts); } catch(_) { js = {}; }
                        if (!sum.ok) throw new Error(`summarize failed: ${sum.status} ${ts}`);
                        // Prefer the first summary object/string from response
                        let firstSummary = '';
                        try {
                          const arr = Array.isArray(js?.summaries)
                            ? js.summaries
                            : (Array.isArray(js?.summary)
                              ? js.summary
                              : (Array.isArray(js?.total_summary) ? js.total_summary : []));
                          if (Array.isArray(arr) && arr.length > 0) {
                            const item = arr[0];
                            firstSummary = typeof item === 'string' ? item : (item?.summary || JSON.stringify(item));
                          } else if (typeof js?.summary === 'string') {
                            firstSummary = js.summary;
                          } else if (typeof js?.total_summary === 'string') {
                            firstSummary = js.total_summary;
                          }
                        } catch(_) { /* noop */ }
                        if (firstSummary) setNewSceneDocSummary(String(firstSummary));
                      } catch(err) { alert(err?.message || 'Upload failed'); }
                      finally { setIsUploadingNewSceneDoc(false); e.target.value = ''; }
                    }} />
                    {isUploadingNewSceneDoc && (<div className="text-xs text-gray-500 mt-1">Processing document…</div>)}
                    {(!isUploadingNewSceneDoc && newSceneDocSummary) && (
                      <div className="mt-2">
                        <label className="block text-sm font-medium text-gray-700 mb-1">Document Summary</label>
                        <div className="max-h-40 overflow-auto p-3 border rounded bg-white text-sm text-gray-800 whitespace-pre-wrap">{newSceneDocSummary}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
              {isPresenterSelectionPhase && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Presenter Options</label>
                    {newScenePresenterPresetId && (
                      <span className="text-xs text-gray-500">
                        Selected: {newScenePresenterPresetLabel || 'Presenter'}
                      </span>
                    )}
                  </div>
                  {isLoadingNewScenePresenter ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-4 h-4 border-2 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                      Loading presenter options…
                    </div>
                  ) : (() => {
                    const presenterBucket =
                      newSceneVideoType === 'Avatar Based'
                        ? (presenterPresets[newSceneAvatarType === 'Anchor' ? 'ANCHOR' : 'VEO3'] || [])
                        : [];
                    const avatarPresenterOptions = Array.isArray(presenterBucket) ? presenterBucket : [];
                    if (avatarPresenterOptions.length === 0) {
                      return (
                        <div className="text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg px-3 py-2">
                          No presenter options available for this configuration.
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {avatarPresenterOptions.map((preset, idx) => {
                          const id = String(preset?.preset_id ?? '');
                          const selected = String(newScenePresenterPresetId || '') === id;
                          const previewUrl = preset?.sample_video || '';
                          const inferPreviewType = (url) => {
                            if (!url || typeof url !== 'string') return '';
                            const clean = url.split('?')[0].toLowerCase();
                            const videoExts = ['.mp4', '.mov', '.m4v', '.webm', '.ogg', '.ogv'];
                            const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.avif'];
                            if (videoExts.some((ext) => clean.endsWith(ext))) return 'video';
                            if (imageExts.some((ext) => clean.endsWith(ext))) return 'image';
                            return '';
                          };
                          const resolvedType = inferPreviewType(previewUrl);
                          const isVideo = resolvedType === 'video';
                          const isImage = resolvedType === 'image';
                          return (
                            <button
                              key={id || idx}
                              type="button"
                              onClick={() => {
                                setNewScenePresenterPresetId(id);
                                setNewScenePresenterPresetLabel(preset?.option || '');
                                setNewScenePresenterError('');
                              }}
                              className={`w-full text-left border rounded-lg px-3 py-3 transition-all ${
                                selected
                                  ? 'border-[#13008B] bg-[#f3f1ff] shadow-sm'
                                  : 'border-gray-200 bg-white hover:border-[#13008B]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="w-20 h-12 rounded overflow-hidden bg-black/5 flex-shrink-0">
                                  {previewUrl ? (
                                    isVideo ? (
                                      <video
                                        className="w-full h-full object-cover"
                                        muted
                                        playsInline
                                        loop
                                      >
                                        <source src={previewUrl} type="video/mp4" />
                                      </video>
                                    ) : isImage ? (
                                      <img
                                        src={previewUrl}
                                        alt={`${preset?.option || 'Presenter'} preview`}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">
                                        Preview
                                      </div>
                                    )
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                                      No image
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-800">
                                    {preset?.option || 'Presenter'}
                                  </p>
                                </div>
                                {selected && <Check className="w-4 h-4 text-[#13008B]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {newScenePresenterError && (
                    <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                      {newScenePresenterError}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Select a presenter preset to continue. You can preview samples where available.
                  </p>
                </div>
              )}
              {showSuggestionSection && (
              <div>
                {/* Suggestions */}
                <label className="block text-sm font-medium text-gray-700 mb-1">Suggestions</label>
                {isSuggestingScenes ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-4 h-4 border-2 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                    Fetching suggestions…
                       </div>

                     ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto border rounded-md p-2">
                    {Array.isArray(sceneSuggestions) && sceneSuggestions.length > 0 ? (
                      sceneSuggestions.map((sug, i) => (
                        <div key={i}>
                          <button
                            type="button"
                            onClick={() => { setNewSceneSelectedIdx(i); setNewSceneContent((((sug?.title ? (sug.title+': ') : '') + (sug?.content || '')).trim())); }}
                            className={`relative w-full text-left p-2 rounded border hover:bg-gray-50 ${newSceneSelectedIdx===i?'border-[#13008B] ring-2 ring-[#cfcaf7]':''}`}
                            title="Click to select this suggestion"
                          >
                            {newSceneSelectedIdx===i && (
                              <span className="absolute top-1 right-1 text-[10px] px-2 py-0.5 rounded-full bg-[#13008B] text-white">Selected</span>
                            )}
                            <div className="text-xs font-medium text-gray-800">{sug?.title || 'Suggestion'}</div>
                            <div className="text-xs text-gray-600 whitespace-pre-wrap">{sug?.content || ''}</div>
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">No suggestions available.</div>
                    )}
                  </div>
                )}
              </div>
              )}
              {/* Description field - always visible when suggestions section is shown */}
              {showSuggestionSection && !isSuggestingScenes && (
                  <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-xs text-gray-500 font-normal">(Optional - if you don't select a suggestion)</span>
                  </label>
                    <textarea
                      value={newSceneDescription}
                    onChange={(e) => {
                      setNewSceneDescription(e.target.value);
                      // Clear selected suggestion when user types manually
                      if (e.target.value.trim()) {
                        setNewSceneSelectedIdx(-1);
                        setNewSceneContent('');
                      }
                    }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                      rows={4}
                    placeholder="Enter scene description or query"
                    />
                  <p className="text-xs text-gray-500 mt-1">
                    Enter a description to use as the scene content. This will be used if no suggestion is selected.
                  </p>
                  </div>
              )}
              {/* Document upload for all model types when suggestions section is shown (except Financial which has its own in step 2) */}
              {showSuggestionSection && !isSuggestingScenes && newSceneVideoType !== 'Financial' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Upload Document (to summarize)</label>
                  <input 
                    type="file" 
                    accept=".pdf,.doc,.docx,.txt" 
                    disabled={isUploadingNewSceneDoc} 
                    onChange={async (e) => {
                      const file = e.target.files?.[0]; 
                      if (!file) return; 
                      setIsUploadingNewSceneDoc(true);
                      try {
                        const userId = localStorage.getItem('token');
                        const sessionId = localStorage.getItem('session_id');
                        if (!userId || !sessionId) throw new Error('Missing session');
                        // Extract
                        const form = new FormData(); 
                        form.append('files', file); 
                        form.append('user_id', userId); 
                        form.append('session_id', sessionId);
                        const extractUrl = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/documents/extract_documents`;
                        const ex = await fetch(extractUrl, { method: 'POST', body: form }); 
                        const tx = await ex.text();
                        if (!ex.ok) throw new Error(`extract failed: ${ex.status} ${tx}`);
                        // Summarize: requires { session, documents } using rich session object
                        let exJson; 
                        try { exJson = JSON.parse(tx); } catch(_) { exJson = {}; }
                        let documents = [];
                        if (Array.isArray(exJson?.documents)) documents = exJson.documents;
                        else if (Array.isArray(exJson)) documents = exJson;
                        else if (exJson && (exJson.documentName || exJson.slides)) documents = [exJson];
                        else if (Array.isArray(exJson?.data)) documents = exJson.data; 
                        else documents = [];
                        // Build session from user-session-data (align with other summarize flow)
                        let sessionObj = { session_id: sessionId, user_id: userId };
                        try {
                          const sResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, session_id: sessionId })
                          });
                          const st = await sResp.text();
                          let sj; try { sj = JSON.parse(st); } catch(_) { sj = {}; }
                          const sd = sj?.session_data || sj?.session || {};
                          sessionObj = {
                            session_id: sd.id || sd.session_id || sessionId,
                            user_id: sd.user_id || userId,
                            content: Array.isArray(sd.content) ? sd.content : [],
                            document_summary: Array.isArray(sd.document_summary) ? sd.document_summary : [{ additionalProp1: {} }],
                            video_duration: String(sd.video_duration || sd.videoduration || '60'),
                            created_at: sd.created_at || new Date().toISOString(),
                            totalsummary: Array.isArray(sd.totalsummary) ? sd.totalsummary : [],
                            messages: Array.isArray(sd.messages) ? sd.messages : [],
                            scripts: Array.isArray(sd.scripts) ? sd.scripts : [],
                            videos: Array.isArray(sd.videos) ? sd.videos : [],
                            images: Array.isArray(sd.images) ? sd.images : [],
                            final_link: sd.final_link || '',
                            videoType: sd.videoType || sd.video_type || '',
                            additionalProp1: sd.additionalProp1 || {}
                          };
                        } catch(_) { /* keep minimal sessionObj */ }
                        const summaryUrl = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/documents/summarize_documents`;
                        const sum = await fetch(summaryUrl, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session: sessionObj, documents }) });
                        const ts = await sum.text(); 
                        let js; try { js = JSON.parse(ts); } catch(_) { js = {}; }
                        if (!sum.ok) throw new Error(`summarize failed: ${sum.status} ${ts}`);
                        // Prefer the first summary object/string from response
                        let firstSummary = '';
                        try {
                          const arr = Array.isArray(js?.summaries)
                            ? js.summaries
                            : (Array.isArray(js?.summary)
                              ? js.summary
                              : (Array.isArray(js?.total_summary) ? js.total_summary : []));
                          if (Array.isArray(arr) && arr.length > 0) {
                            const item = arr[0];
                            firstSummary = typeof item === 'string' ? item : (item?.summary || JSON.stringify(item));
                          } else if (typeof js?.summary === 'string') {
                            firstSummary = js.summary;
                          } else if (typeof js?.total_summary === 'string') {
                            firstSummary = js.total_summary;
                          }
                        } catch(_) { /* noop */ }
                        if (firstSummary) {
                          setNewSceneDocSummary(String(firstSummary));
                          // Clear selected suggestion when document summary is set
                          setNewSceneSelectedIdx(-1);
                          setNewSceneContent('');
                        }
                      } catch(err) { 
                        alert(err?.message || 'Upload failed'); 
                      } finally { 
                        setIsUploadingNewSceneDoc(false); 
                        e.target.value = ''; 
                      }
                    }} 
                  />
                  {isUploadingNewSceneDoc && (<div className="text-xs text-gray-500 mt-1">Processing document…</div>)}
                  {(!isUploadingNewSceneDoc && newSceneDocSummary) && (
                    <div className="mt-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Document Summary</label>
                      <div className="max-h-40 overflow-auto p-3 border rounded bg-white text-sm text-gray-800 whitespace-pre-wrap">{newSceneDocSummary}</div>
                    </div>
                  )}
                </div>
              )}
              </div>
            </div>
            <div className="px-6 pt-4 pb-6 flex justify-end gap-2 flex-shrink-0 border-t border-gray-200">
              <button
                onClick={() => setShowAddSceneModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              {addSceneStep === 1 && (
                <button
                  disabled={isLoadingNewScenePresenter || isSuggestingScenes || (newSceneVideoType === 'Financial' && !newSceneChartType)}
                  onClick={async () => {
                    try {
                      const total = Array.isArray(scriptRows) ? scriptRows.length : 0;
                      const idx =
                        (typeof insertSceneIndex === 'number' && insertSceneIndex >= 0 && insertSceneIndex <= total)
                          ? insertSceneIndex
                          : total;
                      const modelType =
                        newSceneVideoType === 'Avatar Based'
                          ? (newSceneAvatarType === 'Anchor' ? 'ANCHOR' : 'VEO3')
                          : (newSceneVideoType === 'Financial' ? 'PLOTLY' : 'SORA');
                      
                      // For financial model, require chart type before proceeding
                      if (newSceneVideoType === 'Financial' && !newSceneChartType) {
                        alert('Please select a chart type before continuing.');
                        return;
                      }
                      
                      setSceneSuggestions([]);
                      setNewSceneSelectedIdx(-1);
                      setNewSceneContent('');
                      setNewSceneDescription('');
                      setNewScenePresenterError('');
                      if (enablePresenterOptions && (modelType === 'VEO3' || modelType === 'ANCHOR')) {
                        setNewScenePresenterPresetId('');
                        setNewScenePresenterPresetLabel('');
                        setIsLoadingNewScenePresenter(true);
                        try {
                          const list = await fetchPresenterPresetsForModel(modelType);
                          const normalizedList = Array.isArray(list) ? list : [];
                          if (normalizedList.length > 0) {
                            setRequiresAvatarPresenterSelection(true);
                            if (normalizedList.length === 1) {
                              setNewScenePresenterPresetId(String(normalizedList[0].preset_id));
                              setNewScenePresenterPresetLabel(normalizedList[0].option || '');
                            }
                            setAddSceneStep(2);
                            return;
                          }
                          setRequiresAvatarPresenterSelection(false);
                        } catch (err) {
                          setRequiresAvatarPresenterSelection(false);
                          setNewScenePresenterError(err?.message || 'Failed to load presenter options');
                        } finally {
                          setIsLoadingNewScenePresenter(false);
                        }
                      } else {
                        setRequiresAvatarPresenterSelection(false);
                      }
                      // For financial model, pass chart_type to fetchSceneSuggestions
                      const chartTypeForSuggestions = (modelType === 'PLOTLY') ? newSceneChartType : null;
                      await fetchSceneSuggestions(modelType, idx, 'add', chartTypeForSuggestions);
                      setAddSceneStep(2);
                    } catch (err) {
                      console.error('Failed to continue add-scene flow:', err);
                      setNewScenePresenterError(err?.message || 'Failed to continue add-scene flow.');
                    }
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                    isLoadingNewScenePresenter || isSuggestingScenes || (newSceneVideoType === 'Financial' && !newSceneChartType)
                      ? 'bg-[#9aa0d0] cursor-not-allowed'
                      : 'bg-[#13008B] hover:bg-blue-800'
                  }`}
                >
                  Continue
                </button>
              )}
              {requiresAvatarPresenterSelection && addSceneStep === 2 && (
                <button
                  onClick={handleAvatarPresenterNext}
                  disabled={
                    isLoadingNewScenePresenter ||
                    isSuggestingScenes ||
                    !newScenePresenterPresetId
                  }
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                    isLoadingNewScenePresenter || isSuggestingScenes || !newScenePresenterPresetId
                      ? 'bg-[#9aa0d0] cursor-not-allowed'
                      : 'bg-[#13008B] hover:bg-blue-800'
                  }`}
                >
                  {isSuggestingScenes ? 'Loading…' : 'Next'}
                </button>
              )}
              {showSuggestionSection && !isSuggestingScenes && (
                <button
                  onClick={addSceneToRows}
                  disabled={isAddingScene}
                  className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${isAddingScene ? 'bg-[#9aa0d0] cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}
                >
                  {isAddingScene ? 'Adding…' : 'Add Scene'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Image Lightbox */}
      {isImageLightboxOpen && (
        <div
          className="fixed inset-0 z-[70] bg-black/85 flex items-center justify-center"
          onClick={() => setIsImageLightboxOpen(false)}
        >
          <button
            onClick={(e) => { e.stopPropagation(); setIsImageLightboxOpen(false); }}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/90 text-gray-800 flex items-center justify-center shadow hover:bg-white"
            title="Close"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="max-w-[90vw] max-h-[90vh] p-2" onClick={(e) => e.stopPropagation()}>
            {lightboxUrl ? (
              <img src={lightboxUrl} alt="Preview" className="max-w-full max-h-[86vh] object-contain rounded" />
            ) : null}
          </div>
        </div>
      )}

      {/* Folder Image Picker Modal */}
      {isFolderPickerOpen && (
        <div className="fixed inset-0 z-[65] bg-black/50 flex items-center justify-center">
          <div className="bg-white w-[92%] max-w-3xl rounded-lg shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[#13008B]">Pick Images From Folder</h3>
              <button
                onClick={() => setIsFolderPickerOpen(false)}
                className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center"
                title="Close"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            {isLoadingFolderImages ? (
              <div className="flex items-center justify-center py-10">
                <div className="w-6 h-6 border-2 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                <span className="ml-2 text-sm text-gray-700">Loading images…</span>
                       </div>

                       

                     ) : (
              <>
                {folderPickerError ? (
                  <div className="mb-3 p-3 rounded bg-red-50 border border-red-200 text-sm text-red-700">
                    {folderPickerError}
                  </div>
                ) : null}
                {folderImageCandidates.length === 0 ? (
                  <p className="text-sm text-gray-600">No images found for this folder. Try adding some first.</p>
                ) : (
                  <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-3 max-h-[50vh] overflow-y-auto">
                    {folderImageCandidates.map((url, idx) => {
                      const selected = (selectedFolderImages || []).includes(url);
                      return (
                        <div
                          key={idx}
                          className={`group relative w-full pt-[100%] bg-gray-100 rounded-lg border ${selected ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-200'}`}
                          onClick={() => {
                            setSelectedFolderImages(prev => {
                              const list = Array.isArray(prev) ? [...prev] : [];
                              const pos = list.indexOf(url);
                              if (pos >= 0) {
                                list.splice(pos, 1);
                              } else {
                                if (list.length >= 3) {
                                  alert('You can select up to 3 reference images.');
                                  return list;
                                }
                                list.push(url);
                              }
                              return list;
                            });
                          }}
                          title={url}
                        >
                          <img src={url} alt={`Pick ${idx + 1}`} className="absolute inset-0 w-full h-full object-cover rounded-lg" />
                          <div className={`absolute top-1 right-1 w-6 h-6 rounded-full flex items-center justify-center ${selected ? 'bg-green-600 text-white' : 'bg-black/60 text-white opacity-0 group-hover:opacity-100'} transition-opacity`}>
                            <Check className="w-4 h-4" />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                <div className="mt-4 flex items-center justify-end gap-2">
                  <button
                    onClick={() => setIsFolderPickerOpen(false)}
                    className="px-4 py-2 rounded-lg text-sm bg-gray-100 text-gray-800 hover:bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={(selectedFolderImages || []).length === 0}
                    onClick={() => {
                      try {
                        if (!Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) return;
                        const rows = [...scriptRows];
                        const scene = { ...rows[currentSceneIndex] };
                        const capped = filterImageUrls(selectedFolderImages || []).slice(0, 3);
                        scene.ref_image = capped;
                        rows[currentSceneIndex] = scene;
                        setScriptRows(rows);
                        setSelectedRefImages(capped);
                        updateRefMapForScene(scene.scene_number, scene.ref_image);
                        setIsFolderPickerOpen(false);
                        setSelectedFolderImages([]);
                      } catch (_) { /* noop */ }
                    }}
                    className={`px-4 py-2 rounded-lg text-sm text-white ${(selectedFolderImages || []).length === 0 ? 'bg-[#9aa0d0] cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}
                  >
                    Add Selected
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {/* Confirm Save Order Popup */}
      {showSaveConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40">
          <div className="bg-white w-[92%] max-w-md rounded-lg shadow-xl p-5">
            <h3 className="text-lg font-semibold text-[#13008B]">Save New Order?</h3>
            <p className="mt-2 text-sm text-gray-700">Your scene order has changed. Save to update the script.</p>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => { if (!isSavingReorder) setShowSaveConfirm(false); }}
                disabled={isSavingReorder}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${isSavingReorder ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={saveReorderedScript}
                disabled={isSavingReorder}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${isSavingReorder ? 'bg-[#9aa0d0] cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >
                {isSavingReorder ? 'Saving…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Confirm Delete Scene Popup */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white w-[92%] max-w-md rounded-lg shadow-xl p-5">
            <h3 className="text-lg font-semibold text-[#13008B]">Delete This Scene?</h3>
            <p className="mt-2 text-sm text-gray-700">
              Are you sure you want to delete Scene {Math.min(currentSceneIndex + 1, Array.isArray(scriptRows) ? scriptRows.length : (currentSceneIndex + 1))}? This action cannot be undone.
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
      {/* Confirm Model Change Popup */}
      {showModelConfirm && (() => {
        const scene = Array.isArray(scriptRows) ? scriptRows[currentSceneIndex] : null;
        const currentModel = (scene?.mode || scene?.model || '').toUpperCase();
        const targetModel = (pendingModelType === 'Avatar Based') ? 'VEO3' : (pendingModelType === 'Anchor') ? 'ANCHOR' : (pendingModelType === 'Financial' ? 'PLOTLY' : 'SORA');
        const isAvatarModel = targetModel === 'VEO3' || targetModel === 'ANCHOR';
        const modalWidth = isAvatarModel && enablePresenterOptions ? 'max-w-2xl' : 'max-w-md';
        return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className={`bg-white w-[92%] ${modalWidth} rounded-lg shadow-xl p-5`}>
            <h3 className="text-lg font-semibold text-[#13008B]">Change Video Type?</h3>
            <div className="mt-3 text-sm text-gray-700">
              {(() => {
                const scene = Array.isArray(scriptRows) ? scriptRows[currentSceneIndex] : null;
                const currentModel = (scene?.mode || scene?.model || '').toUpperCase();
                const modelLabel = (m) => {
                  const u = String(m || '').toUpperCase();
                  if (u === 'VEO3') return 'AVATAR';
                  if (u === 'SORA') return 'INFOGRAPHICS';
                  if (u === 'PLOTLY') return 'FINANCIAL';
                  return u || 'UNKNOWN';
                };
                const targetModel = (pendingModelType === 'Avatar Based') ? 'VEO3' : (pendingModelType === 'Anchor') ? 'ANCHOR' : (pendingModelType === 'Financial' ? 'PLOTLY' : 'SORA');
                const isAvatarModel = targetModel === 'VEO3' || targetModel === 'ANCHOR';
                const switchPresenterOptions = isAvatarModel && enablePresenterOptions ? (presenterPresets[targetModel] || []) : [];
                return (
                  <div>
                    <p className="mb-1">Scene {scene?.scene_number || currentSceneIndex + 1}: {scene?.scene_title || '-'}</p>
                    <p className="mb-3">Current model: <span className="font-medium">{modelLabel(currentModel)}</span> → <span className="font-medium">{modelLabel(targetModel)}</span></p>
                    {/* Per-target controls */}
                    {enablePresenterOptions && isAvatarModel && (
                      <div className="mb-3">
                        <div className="text-sm font-medium text-gray-700 mb-2">Presenter Options</div>
                        {isLoadingSwitchPresenterPresets ? (
                          <div className="flex items-center justify-center py-4">
                            <div className="w-6 h-6 border-2 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                            <span className="ml-2 text-sm text-gray-600">Loading presenter options...</span>
                          </div>
                        ) : switchPresenterOptions.length === 0 ? (
                          <div className="text-sm text-gray-500 py-2">No presenter options available.</div>
                        ) : (
                          <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto">
                            {switchPresenterOptions.map((po) => {
                              const value = po?.preset_id != null ? String(po.preset_id) : String(po.option || '');
                              const isSelected = String(switchPresenterPresetId || '') === value;
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
                                <button
                                  key={value}
                                  type="button"
                                  onClick={() => {
                                    setSwitchPresenterPresetId(value);
                                    setSwitchPresenterPresetLabel(po.option || '');
                                  }}
                                  className={`relative flex flex-col overflow-hidden rounded-lg border transition-shadow ${
                                    isSelected
                                      ? 'border-[#13008B] ring-2 ring-[#13008B] shadow-lg'
                                      : 'border-gray-200 shadow-sm hover:border-[#13008B] hover:shadow'
                                  }`}
                                >
                                  {isSelected && (
                                    <span className="absolute right-1 top-1 rounded-full bg-[#13008B] px-1.5 py-0.5 text-[10px] font-medium text-white z-10">
                                      ✓
                                    </span>
                                  )}
                                  <div className="flex-1 bg-black/5 aspect-video">
                                    {previewUrl ? (
                                      isVideo ? (
                                        <video
                                          className="h-full w-full object-cover"
                                          muted
                                          playsInline
                                          loop
                                        >
                                          <source src={previewUrl} type="video/mp4" />
                                        </video>
                                      ) : isImage ? (
                                        <img
                                          src={previewUrl}
                                          alt={`${po.option} preview`}
                                          className="h-full w-full object-cover"
                                        />
                                      ) : (
                                        <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[10px] text-gray-500">
                                          Preview
                                        </div>
                                      )
                                    ) : (
                                      <div className="flex h-full w-full items-center justify-center bg-gray-100 text-[10px] text-gray-500">
                                        No preview
                                      </div>
                                    )}
                                  </div>
                                  <div className="px-2 py-1.5 bg-white">
                                    <span className="text-xs font-semibold text-gray-800 line-clamp-1">
                                      {po.option}
                                    </span>
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    )}
                    {pendingModelType === 'Infographic' && (
                      <div className="mb-2 text-xs text-gray-600">After switching, pick a reference image in the editor or assets modal.</div>
                    )}
                    {pendingModelType === 'Financial' && switchModelStep === 1 && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-600 mb-1">Chart Type</div>
                        <select value={switchChartType} onChange={(e)=>setSwitchChartType(e.target.value)} className="w-full px-3 py-2 border rounded mb-2">
                 <option value="">Select</option>
                      <option value="clustered_bar">Clustered Bar</option>
                      <option value="clustered_column">Clustered Column</option>
                      <option value="line">Line</option>
                      <option value="pie">Pie</option>
                      <option value="stacked_bar">Stacked Bar</option>
                      <option value="stacked_column">Staacked Column</option>
                      <option value="waterfall_bar">Waterfall Bar</option>
                      <option value="waterfall_column">Waterfall Column</option>
                      <option value="donut">Donut</option>
                        </select>
                        <div className="flex justify-end mt-2">
                          <button
                            disabled={!switchChartType || isSuggestingSwitch}
                            onClick={async () => {
                              if (!switchChartType) {
                                alert('Please select a chart type before continuing.');
                                return;
                              }
                              try {
                                setIsSuggestingSwitch(true);
                                const total = Array.isArray(scriptRows) ? scriptRows.length : 0;
                                const idx = Math.min(Math.max(0, currentSceneIndex), Math.max(0, total));
                                // Create a custom fetch for switch model suggestions
                                const sessionId = localStorage.getItem('session_id');
                                const token = localStorage.getItem('token');
                                if (!sessionId || !token) throw new Error('Missing session');
                                const sessResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
                                });
                                const text = await sessResp.text();
                                let json; try { json = JSON.parse(text); } catch(_) { json = {}; }
                                if (!sessResp.ok) throw new Error(`user-session/data failed: ${sessResp.status} ${text}`);
                                const sd = json?.session_data || json?.session || {};
                                const user = json?.user_data || sd?.user_data || sd?.user || {};
                                // Preserve ALL fields from session_data, including nested structures
                                const sessionForBody = sanitizeSessionSnapshot(sd, sessionId, token);
                                const suggestBody = {
                                  session: sessionForBody,
                                  user,
                                  action: 'add',
                                  position: Math.max(0, Number(idx) || 0),
                                  model_type: 'PLOTLY',
                                  document_content: '',
                                  chart_type: switchChartType
                                };
                                const sugResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/suggest-scenes', {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(suggestBody)
                                });
                                const sugText = await sugResp.text();
                                let sug; try { sug = JSON.parse(sugText); } catch(_) { sug = {}; }
                                const list = Array.isArray(sug?.suggestions) ? sug.suggestions : [];
                                setSwitchSuggestions(list);
                                setSwitchModelStep(2);
                              } catch (err) {
                                console.error('Failed to fetch suggestions for switch model:', err);
                                setSwitchSuggestions([]);
                              } finally {
                                setIsSuggestingSwitch(false);
                              }
                            }}
                            className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                              !switchChartType || isSuggestingSwitch
                                ? 'bg-[#9aa0d0] cursor-not-allowed'
                                : 'bg-[#13008B] hover:bg-blue-800'
                            }`}
                          >
                            {isSuggestingSwitch ? 'Loading...' : 'Continue'}
                          </button>
                        </div>
                      </div>
                    )}
                    {pendingModelType === 'Financial' && switchModelStep >= 2 && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-600 mb-1">Chart Type</div>
                        <div className="px-3 py-2 border rounded mb-2 bg-gray-50 text-sm font-medium text-gray-800">
                          {switchChartType || 'Not selected'}
                        </div>
                        <div className="text-xs text-gray-600 mb-1">Suggestions</div>
                        {isSuggestingSwitch ? (
                          <div className="flex items-center gap-2 text-sm text-gray-600 mb-2">
                            <span className="w-4 h-4 border-2 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                            Fetching suggestions…
                          </div>
                        ) : (
                          <div className="space-y-2 max-h-44 overflow-y-auto border rounded-md p-2 mb-2">
                            {Array.isArray(switchSuggestions) && switchSuggestions.length > 0 ? (
                              switchSuggestions.map((sug, i) => (
                                <div key={i}>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSwitchSelectedIdx(i);
                                      setSwitchSceneContent((((sug?.title ? (sug.title+': ') : '') + (sug?.content || '')).trim()));
                                      // Extract chart_data from suggestion if available
                                      if (sug?.chart_data || sug?.chartData) {
                                        const chartData = sug.chart_data || sug.chartData;
                                        setSwitchChartData(typeof chartData === 'string' ? chartData : JSON.stringify(chartData, null, 2));
                                      }
                                    }}
                                    className={`relative w-full text-left p-2 rounded border hover:bg-gray-50 ${switchSelectedIdx===i?'border-[#13008B] ring-2 ring-[#cfcaf7]':''}`}
                                    title="Click to select this suggestion"
                                  >
                                    {switchSelectedIdx===i && (
                                      <span className="absolute top-1 right-1 text-[10px] px-2 py-0.5 rounded-full bg-[#13008B] text-white">Selected</span>
                                    )}
                                    <div className="text-xs font-medium text-gray-800">{sug?.title || 'Suggestion'}</div>
                                    <div className="text-xs text-gray-600 whitespace-pre-wrap">{sug?.content || ''}</div>
                                  </button>
                                </div>
                              ))
                            ) : (
                              <div className="text-xs text-gray-500">No suggestions available.</div>
                            )}
                          </div>
                        )}
                        <div className="text-xs text-gray-600 mb-1">Chart Data (JSON)</div>
                        <textarea value={switchChartData} onChange={(e)=>setSwitchChartData(e.target.value)} className="w-full h-24 px-3 py-2 border rounded" placeholder='{"labels":["A","B"],"values":[10,20]}' />
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                onClick={() => { if (!isSwitchingModel) { setShowModelConfirm(false); setPendingModelType(null); } }}
                disabled={isSwitchingModel}
                className={`px-4 py-2 rounded-lg text-sm font-medium ${isSwitchingModel ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
              >
                Cancel
              </button>
              <button
                onClick={() => pendingModelType && handleVideoTypeSelect(pendingModelType)}
                disabled={isSwitchingModel}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${isSwitchingModel ? 'bg-[#9aa0d0] cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}
              >
                {isSwitchingModel ? 'Switching…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
        );
      })()}
      {/* Custom Description Modal */}
      {showCustomDescModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white w-[92%] max-w-2xl rounded-lg shadow-xl p-6">
            <h3 className="text-lg font-semibold text-[#13008B] mb-4">Custom Description</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                <textarea
                  value={customDescDescription}
                  onChange={(e) => setCustomDescDescription(e.target.value)}
                  rows={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent resize-y"
                  placeholder="Enter description"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowCustomDescModal(false);
                  setCustomDescDescription('');
                  setCustomDescTextarea('');
                }}
                disabled={isSavingCustomDesc}
                className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-70"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveCustomDesc}
                disabled={isSavingCustomDesc}
                className="rounded-lg bg-[#13008B] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800 disabled:cursor-not-allowed disabled:bg-[#9aa0d0]"
              >
                {isSavingCustomDesc ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Script Modal (React-driven) */}
      {showScriptModal && (
        <div className={scenesMode ? 'bg-transparent' : 'fixed inset-0 z-50 flex items-center justify-center bg-black/50'}>
          <div className={scenesMode ? 'bg-white w-full rounded-lg shadow-sm flex flex-col' : 'bg-white w-[95%] max-w-6xl max-h-[100vh] overflow-hidden rounded-lg shadow-xl flex flex-col'}>
                         {/* Header */}
            <div className="flex items-center justify-between p-2 border-b border-gray-200">
              {/* Left: Back + title */}
              <div className="flex items-center gap-3">
                {scenesMode && (
                  <button
                    onClick={() => { try { onBackToChat && onBackToChat(); } catch(_){} }}
                    className="inline-flex items-center justify-center w-8 h-8 rounded-full border bg-white hover:bg-gray-50"
                    title="Back"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
                <h3 className="text-lg font-semibold text-[#000000]">Generate Script</h3>
              </div>
              {/* Right: Generate Images + kebab menu */}
              <div className="relative flex items-center gap-2">
                {!isEditingScene && hasOrderChanged && (
                  <button
                    onClick={() => setShowSaveConfirm(true)}
                    disabled={isSavingReorder}
                    className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium ${
                      isSavingReorder ? 'bg-green-400 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
                    }`}
                    title="Save new scene order"
                  >
                    {isSavingReorder ? 'Saving…' : 'Save Order'}
                  </button>
                )}
                {!isEditingScene && hasOrderChanged && (
                  <button
                    onClick={() => {
                      try {
                        const originalScriptHash = localStorage.getItem(scopedKey('original_script_hash')) || localStorage.getItem('original_script_hash');
                        if (originalScriptHash) {
                          const originalScript = JSON.parse(originalScriptHash);
                          const normalized = normalizeScriptToRows(originalScript);
                          setScriptRows(normalized.rows || []);
                        }
                      } catch (_) { /* noop */ }
                      setHasOrderChanged(false);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
                    title="Cancel order changes"
                  >
                    Cancel
                  </button>
                )}
                {(() => (
                  <button
                    onClick={triggerGenerateScenes}
                    className="inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium text-white bg-[#13008B] hover:bg-blue-800"
                    title="Generate Storyboard"
                  >
                    Generate Storyboard
                  </button>
                ))()}
                {isEditingScene && (
                  <button
                    onClick={saveEditedScriptText}
                    disabled={isUpdatingText}
                    className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium ${isUpdatingText ? 'bg-green-400 text-white cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'}`}
                    title="Save Changes"
                  >
                    {isUpdatingText ? 'Saving…' : 'Save Changes'}
                  </button>
                )}
                {isEditingScene && (
                  <button
                    onClick={() => {
                      try {
                        if (editSnapshot && Array.isArray(scriptRows) && scriptRows[currentSceneIndex]) {
                          const rows = [...scriptRows];
                          rows[currentSceneIndex] = JSON.parse(JSON.stringify(editSnapshot));
                          setScriptRows(rows);
                        }
                      } catch (_) { /* noop */ }
                      setIsEditingScene(false);
                    }}
                    disabled={isUpdatingText}
                    className={`inline-flex items-center gap-1 px-3 py-2 rounded-lg text-sm font-medium ${isUpdatingText ? 'bg-gray-200 cursor-not-allowed text-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                    title="Cancel editing"
                  >
                    Cancel
                  </button>
                )}
                <div className="relative">
                  <KebabMenu
                    canUndo={canUndo}
                    canRedo={canRedo}
                    onUndo={handleUndoScript}
                    onRedo={handleRedoScript}
                    onDelete={() => setShowDeleteConfirm(true)}
                    onRegenerate={openRegenerateWithSuggestions}
                    onEdit={() => setIsEditingScene(true)}
                    onGenerateSummary={openGenerateSummaryPrompt}
                    onSwitchAnchor={() => openModelChangeConfirm('Anchor')}
                    onSwitchAvatar={() => openModelChangeConfirm('Avatar Based')}
                    onSwitchInfographic={() => openModelChangeConfirm('Infographic')}
                    onSwitchFinancial={() => openModelChangeConfirm('Financial')}
                    isDeleting={isDeletingScene}
                    hasScenes={Array.isArray(scriptRows) && scriptRows.length > 0}
                    isSwitching={isSwitchingModel}
                    isGeneratingSummary={isGeneratingSummary}
                    showSwitchAnchor={!isActiveAnchorModel}
                    showSwitchAvatar={!isActiveAvatarModel}
                    showSwitchInfographic={!isActiveInfographicModel}
                    showSwitchFinancial={!isActiveFinancialModel}
                  />
                </div>
                {!scenesMode && (<button onClick={() => {
                  // On close, if in reorder with unsaved changes, revert
                  if (showReorderTable && hasOrderChanged) {
                     try {
                       const originalScriptHash = localStorage.getItem('original_script_hash');
                       if (originalScriptHash) {
                         const originalScript = JSON.parse(originalScriptHash);
                         const normalized = normalizeScriptToRows(originalScript);
                         setScriptRows(normalized.rows || []);
                       }
                     } catch (_) { /* noop */ }
                     setHasOrderChanged(false);
                   }
                   setShowScriptModal(false);
                 }} className="text-white w-8 h-8 hover:text-[#13008B] hover:bg-[#e4e0ff] transition-all duration-300 bg-[#13008B] rounded-full">✕</button>)}
              </div>
            </div>

                         {/* Scene Navigation Tabs - Only show in edit mode */}
            {!showReorderTable && (
              <div className="px-4 py-3 border-b border-gray-200">
                {(() => {
                  const total = Array.isArray(scriptRows) ? scriptRows.length : 0;
                  const [windowSize] = [5];
                  // Local state shim via closure variables
                  // We'll rely on React state defined above; ensure it exists
                })()}
                <div className="flex items-center gap-2">
                  {/* Window navigation (no scroll) */}
                  <button
                    onClick={() => {
                      try { setCurrentSceneIndex(idx => idx); } catch (_) { /* noop */ }
                      setVisibleStartIndex(prev => Math.max(0, prev - 1));
                    }}
                    disabled={typeof visibleStartIndex === 'undefined' || visibleStartIndex <= 0}
                  className={`w-6 h-6 rounded-full flex items-center justify-center border ${visibleStartIndex <= 0 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'}`}
                    title="Previous scenes"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>

                  {(() => {
                    const start = Math.max(0, Math.min(visibleStartIndex ?? 0, (Array.isArray(scriptRows) ? Math.max(0, scriptRows.length - 5) : 0)));
                    const end = start + 5;
                    const slice = (Array.isArray(scriptRows) ? scriptRows.slice(start, end) : []);
                    return slice.map((scene, idxLocal) => {
                      const index = start + idxLocal;
                      const rawTitle = String(scene?.scene_title || scene?.sceneTitle || '').trim();
                      const isSummaryTab = rawTitle.toLowerCase() === 'summary';
                      const tabLabel = isSummaryTab ? 'Summary' : `Scene ${index + 1}`;
                      const tabTitle = isSummaryTab ? 'Summary ' : `Drag to reorder. Currently Scene ${index + 1}`;
                      return (
                    <div
                      key={index}
                      className={`flex items-center gap-2 group ${dragOverTabIndex === index ? 'ring-2 ring-blue-300 rounded-full' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        setDraggedTabIndex(index);
                        try { e.dataTransfer.effectAllowed = 'move'; } catch (_) { /* noop */ }
                      }}
                      onDragOver={(e) => { e.preventDefault(); setDragOverTabIndex(index); }}
                      onDragEnter={(e) => { e.preventDefault(); setDragOverTabIndex(index); }}
                      onDragLeave={() => setDragOverTabIndex(null)}
                      onDrop={(e) => {
                        e.preventDefault();
                        try {
                          if (draggedTabIndex === null || draggedTabIndex === index) { setDragOverTabIndex(null); return; }
                          const newOrder = Array.isArray(scriptRows) ? [...scriptRows] : [];
                          const dragged = newOrder[draggedTabIndex];
                          newOrder.splice(draggedTabIndex, 1);
                          newOrder.splice(index, 0, dragged);
                          setScriptRows(newOrder);
                          setHasOrderChanged(true);
                          // Update current scene index to the dropped location for continuity
                          setCurrentSceneIndex(index);
                          // Do not persist immediately; show Save button near Next
                        } finally {
                          setDraggedTabIndex(null);
                          setDragOverTabIndex(null);
                        }
                      }}
                      title={tabTitle}
                    >
                      {/* Insert and Move controls (horizontal): left, +, right */}
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => moveSceneLeft(index)}
                          disabled={index === 0}
                          title={index === 0 ? 'Cannot move further left' : `Move Scene ${index + 1} left`}
                          className={`w-5 h-5 rounded-full flex items-center justify-center border ${index === 0 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'}`}
                        >
                          <ChevronLeft className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => openAddSceneModal(index)}
                          title={(function(){
                            try {
                              const prev = index > 0 ? (scriptRows?.[index-1]?.scene_number ?? (index)) : 0;
                              const next = scriptRows?.[index]?.scene_number ?? (index+1);
                              return `Add scene after Scene ${prev} (before Scene ${next})`;
                            } catch(_) { return 'Add scene here'; }
                          })()}
                          className="w-5 h-5 rounded-full bg-black text-white flex items-center justify-center"
                        >
                          +
                        </button>
                        <button
                          onClick={() => moveSceneRight(index)}
                          disabled={!Array.isArray(scriptRows) || index >= scriptRows.length - 1}
                          title={index >= (Array.isArray(scriptRows) ? scriptRows.length - 1 : 0) ? 'Cannot move further right' : `Move Scene ${index + 1} right`}
                          className={`w-5 h-5 rounded-full flex items-center justify-center border ${index >= (Array.isArray(scriptRows) ? scriptRows.length - 1 : 0) ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'}`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                       <button
                         onClick={() => setCurrentSceneIndex(index)}
                         className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                           currentSceneIndex === index
                             ? 'bg-[#13008B] text-white'
                             : `bg-gray-100 text-gray-700 hover:bg-gray-200 ${draggedTabIndex === index ? 'opacity-50' : ''}`
                         }`}
                       >
                         {tabLabel}
                       </button>
                     </div>
                      );
                    })
                  })()}

                  <button
                    onClick={() => setVisibleStartIndex(prev => Math.min((Array.isArray(scriptRows) ? Math.max(0, scriptRows.length - 5) : 0), (prev ?? 0) + 1))}
                    disabled={(visibleStartIndex ?? 0) >= (Array.isArray(scriptRows) ? Math.max(0, scriptRows.length - 5) : 0)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center border ${ (visibleStartIndex ?? 0) >= (Array.isArray(scriptRows) ? Math.max(0, scriptRows.length - 5) : 0) ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'}`}
                    title="Next scenes"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                  {/* Rightmost Add Scene pill */}
                  <button
                     onClick={() => openAddSceneModal((Array.isArray(scriptRows) ? scriptRows.length : 0))}
                     title={(function(){
                       try {
                         const last = Array.isArray(scriptRows) && scriptRows.length>0 ? (scriptRows[scriptRows.length-1].scene_number ?? scriptRows.length) : 0;
                         return `Add scene after Scene ${last}`;
                       } catch(_) { return 'Add scene at end'; }
                     })()}
                     className="ml-2 px-4 py-2 rounded-full text-sm font-medium bg-gray-200 text-gray-800 hover:bg-gray-300 whitespace-nowrap"
                   >
                     + Scene
                   </button>
                </div>
              </div>
            )}

             {/* Reorder Table View */}
             {showReorderTable && (
               <div className="p-4">
                 <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                   <p className="text-sm text-blue-700 flex items-center gap-2">
                     <GripVertical className="w-4 h-4" />
                     <span>💡 <strong>Tip:</strong> You can drag and drop rows to reorder them. Use the grip handle on the left to drag rows up or down.</span>
                   </p>
                 </div>
                 
                 {/* Table Header */}
                 <div className="grid grid-cols-12 text-center gap-[3px] mb-[3px] text-[#13008B] font-semibold">
                   <div className="px-3 col-span-1 py-2 border-[2px] rounded-lg border-[#13008B] bg-[#e4e0ff] flex items-center justify-center">
                     <GripVertical className="w-4 h-4" />
                   </div>
                   <div className="px-3 col-span-1 py-2 border-[2px] rounded-lg border-[#13008B] bg-[#e4e0ff]">Scene No.</div>
                   <div className="px-3 col-span-4 py-2 border-[2px] rounded-lg border-[#13008B] bg-[#e4e0ff]">Scene Title</div>
                   <div className="px-3 col-span-3 py-2 border-[2px] rounded-lg border-[#13008B] bg-[#e4e0ff]">Timeline</div>
                   <div className="px-3 col-span-3 py-2 border-[2px] rounded-lg border-[#13008B] bg-[#e4e0ff]">Description</div>
                 </div>
                 
                 {/* Table Rows (scrollable) */}
                 <div className="space-y-[3px] max-h-[48vh] overflow-y-auto pr-1">
                   {(Array.isArray(scriptRows) ? scriptRows : []).map((r, i) => {
                     const expanded = !!expandedRows[i];
                     const desc = r.description || '-';
                     const isDragging = draggedRowIndex === i;
                     const isDragOver = dragOverRowIndex === i;
                     
                     return (
                       <div 
                         key={i} 
                         draggable
                         onDragStart={(e) => handleDragStart(e, i)}
                         onDragOver={(e) => handleDragOver(e, i)}
                         onDragEnter={(e) => handleDragEnter(e, i)}
                         onDragLeave={handleDragLeave}
                         onDrop={(e) => handleDrop(e, i)}
                         onDragEnd={handleDragEnd}
                         className={`grid grid-cols-12 gap-[3px] text-center text-[10px] text-gray-800 transition-all duration-200 ${
                           isDragging ? 'script-row-dragging' : ''
                         } ${
                           isDragOver ? 'script-row-drag-over' : ''
                         }`}
                       >
                         {/* Drag Handle */}
                         <div className="col-span-1 flex items-center justify-center script-row-drag-handle">
                           <GripVertical className="w-4 h-4 text-gray-400 hover:text-gray-600" />
                         </div>
                         
                         {/* Scene Number */}
                         <div className="col-span-1 px-3 py-2 border-[1px] text-[1.1rem] rounded-lg border-[#ccceee] whitespace-nowrap bg-white">
                           {r.scene_number || i + 1}
                         </div>
                         
                         {/* Scene Title */}
                         <div className="col-span-4 px-3 py-2 border-[1px] rounded-lg border-[#ccceee] min-w-[10rem] bg-white">
                           {r.scene_title || '-'}
                         </div>
                         
                         {/* Timeline */}
                         <div className="col-span-3 px-3 py-2 border-[1px] rounded-lg border-[#ccceee] min-w-[10rem] bg-white">
                           {r.timeline || '-'}
                         </div>
                         
                         {/* Description */}
                         <div className="col-span-3 px-3 py-2 border-[1px] rounded-lg border-[#ccceee] min-w-[14rem] bg-white">
                           <div className={`${expanded ? '' : 'line-clamp-2'} text-gray-800`}>{desc}</div>
                           {typeof desc === 'string' && desc.length > 120 && (
                             <button
                               onClick={() => setExpandedRows(prev => ({ ...prev, [i]: !expanded }))}
                               className="mt-1 text-xs text-[#13008B] hover:underline"
                             >
                               {expanded ? 'Read less' : 'Read more'}
                             </button>
                           )}
                         </div>
                       </div>
                     );
                   })}
                 </div>
               </div>
             )}

                         {/* Scene Content - Only show in edit mode */}
            {!showReorderTable && (
              <div className={scenesMode ? 'px-0 py-3 h-full overflow-y-auto' : 'px-0 py-3 max-h-[60vh] overflow-y-auto'}>
                 {Array.isArray(scriptRows) && scriptRows[currentSceneIndex] && (
                   <div className="space-y-6">
                     {/* Scene Details Section */}
                     <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                       <h4 className="text-lg font-semibold text-gray-800 mb-4">Scene Details</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                           <label className="block text-sm font-medium text-gray-700 mb-2">Scene Title</label>
                           {isEditingScene ? (
                             <div className="flex items-center justify-between gap-3">
                               <input
                                 type="text"
                                 value={Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex].scene_title || '' : ''}
                                 disabled
                                 className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600 flex-1"
                               />
                               {(() => {
                                 const r = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                                 const mu = String(r?.model || r?.mode || '').toUpperCase();
                                 const vt =
                                   mu === 'ANCHOR'
                                     ? 'Anchor'
                                     : (mu === 'VEO3'
                                       ? 'Avatar'
                                       : (mu === 'SORA'
                                         ? 'Infographic'
                                         : (mu === 'PLOTLY' ? 'Financial' : '')));
                                return (!isSummarySceneActive && vt) ? (
                                   <span className="whitespace-nowrap text-sm font-medium text-gray-700">Video Type: <span className="ml-1 px-2 py-0.5 text-xs rounded-full border bg-gray-50 text-gray-700 align-middle">{vt}</span></span>
                                ) : null;
                               })()}
                             </div>
                           ) : (
                             <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 flex items-center gap-3 justify-between">
                               <span>{Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? (scriptRows[currentSceneIndex].scene_title || '-') : '-'}</span>
                               {(() => {
                                 const r = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                                 const mu = String(r?.model || r?.mode || '').toUpperCase();
                                 const vt =
                                   mu === 'ANCHOR'
                                     ? 'Anchor'
                                     : (mu === 'VEO3'
                                       ? 'Avatar'
                                       : (mu === 'SORA'
                                         ? 'Infographic'
                                         : (mu === 'PLOTLY' ? 'Financial' : '')));
                               return (!isSummarySceneActive && vt) ? (
                                   <span className="text-sm font-medium text-gray-700">Video Type: <span className="ml-1 px-2 py-0.5 text-xs rounded-full border bg-gray-50 text-gray-700 align-middle">{vt}</span></span>
                                ) : null;
                               })()}
                              </div>
                           )}
                         </div>
                         <div>
                           <label className="block text-sm font-medium text-gray-700 mb-2">Video Duration</label>
                           {isEditingScene ? (
                             <input
                               type="text"
                               value={Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex].timeline || '' : ''}
                               disabled
                               className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600"
                             />
                           ) : (
                             <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800">
                               {Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? (scriptRows[currentSceneIndex].timeline || '-') : '-'}
                             </div>
                           )}
                         </div>
                         {/* Narration and Description in same row */}
                         <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4">
                           {/* Narration Section */}
                           <div>
                           {(() => {
                             const sceneNarration =
                               Array.isArray(scriptRows) && scriptRows[currentSceneIndex]
                                 ? scriptRows[currentSceneIndex].narration || ''
                                 : '';
                             const isInlineEditingNarration =
                               !isEditingScene &&
                               isNarrationEditing &&
                               narrationSceneIndex === currentSceneIndex;
                             const startInlineEditingNarration = () => {
                               setPendingNarration(sceneNarration);
                               setNarrationSceneIndex(currentSceneIndex);
                               setIsNarrationEditing(true);
                             };
                             const cancelInlineEditingNarration = () => {
                               setPendingNarration(sceneNarration);
                               setIsNarrationEditing(false);
                               setNarrationSceneIndex(null);
                             };
                             const saveInlineNarration = async () => {
                               try {
                                 setIsSavingNarration(true);
                                 const nextNarration = pendingNarration || '';
                                 const scene =
                                   Array.isArray(scriptRows) && scriptRows[currentSceneIndex]
                                     ? scriptRows[currentSceneIndex]
                                     : null;
                                 const descriptionText = scene?.description || '';
                                 const computedWordCount = computeWordCount(nextNarration || descriptionText);
                                 handleSceneUpdate(currentSceneIndex, 'narration', nextNarration);
                                 handleSceneUpdate(currentSceneIndex, 'word_count', computedWordCount);
                                 
                                 // Call update-text API to save narration
                                 try {
                                   await updateSceneGenImageFlag(currentSceneIndex, {
                                     narrationOverride: nextNarration,
                                     descriptionOverride: descriptionText
                                   });
                                 } catch (err) {
                                   console.warn('update-text narration failed:', err);
                                   alert('Failed to save narration. Please try again.');
                                 }
                               } catch (_) {
                                 /* noop */
                               } finally {
                                 setIsSavingNarration(false);
                                 setIsNarrationEditing(false);
                                 setNarrationSceneIndex(null);
                               }
                             };
                             
                             if (isEditingScene) {
                               const wordCount = (sceneNarration || '').trim().split(/\s+/).filter(word => word.length > 0).length;
                               const isOptimalWordCount = wordCount >= 18 && wordCount <= 20;
                               return (
                                 <>
                           <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
                               <textarea
                                     value={sceneNarration}
                                 onChange={(e) => handleSceneUpdate(currentSceneIndex, 'narration', e.target.value)}
                                     className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent ${
                                       isOptimalWordCount 
                                         ? 'border-green-500 bg-green-50' 
                                         : 'border-red-300 bg-red-50'
                                     }`}
                                 rows={3}
                                 placeholder="Enter narration text"
                               />
                               <div className="mt-2 flex items-center justify-between">
                                 <p className="text-xs text-gray-500 italic">
                                   Keep 18-20 words for a perfect 10 second audio
                                 </p>
                                 <p className={`text-xs font-medium ${
                                   isOptimalWordCount ? 'text-green-600' : 'text-red-600'
                                 }`}>
                                   {wordCount} {wordCount === 1 ? 'word' : 'words'}
                                 </p>
                               </div>
                                 </>
                               );
                             }
                             
                             return (
                               <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative">
                                 {/* Loading Overlay */}
                                 {isSavingNarration && (
                                   <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
                                     <div className="bg-white shadow-lg rounded-lg px-6 py-4 text-center space-y-3">
                                       <div className="relative w-16 h-16 mx-auto">
                                         <div className="absolute inset-0 rounded-full border-4 border-[#D8D3FF]"></div>
                                         <div className="absolute inset-2 rounded-full overflow-hidden">
                                           <img 
                                             src={LogoImage} 
                                             alt="Logo" 
                                             className="w-full h-full object-contain animate-spin"
                                             style={{ animationDuration: '2s' }}
                                           />
                                         </div>
                                       </div>
                                       <div className="text-sm font-semibold text-[#13008B]">Updating Narration</div>
                                       <p className="text-xs text-gray-500">Please wait...</p>
                             </div>
                                   </div>
                                 )}
                                 <div className="flex items-center justify-between mb-3">
                                   <label className="block text-sm font-medium text-gray-700">Narration</label>
                                   {isInlineEditingNarration ? (
                                     <div className="flex items-center gap-2">
                                       <button
                                         type="button"
                                         className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                         onClick={cancelInlineEditingNarration}
                                         disabled={isSavingNarration}
                                       >
                                         Cancel
                                       </button>
                                       <button
                                         type="button"
                                         className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                         onClick={saveInlineNarration}
                                         disabled={isSavingNarration}
                                       >
                                         {isSavingNarration ? (
                                           <>
                                             <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                             <span>Saving...</span>
                                           </>
                                         ) : (
                                           'Save'
                                         )}
                                       </button>
                             </div>
                                   ) : (
                                     <p className="text-xs text-gray-500">Double-click the narration to edit.</p>
                           )}
                         </div>
                                 {(() => {
                                   const currentNarrationText = isInlineEditingNarration ? pendingNarration : sceneNarration;
                                   const wordCount = (currentNarrationText || '').trim().split(/\s+/).filter(word => word.length > 0).length;
                                   const isOptimalWordCount = wordCount >= 18 && wordCount <= 20;
                                   return (
                                     <>
                                 <textarea
                                         value={currentNarrationText}
                                   onChange={(e) => setPendingNarration(e.target.value)}
                                   onDoubleClick={startInlineEditingNarration}
                                   readOnly={!isInlineEditingNarration || isSavingNarration}
                                   className={`w-full px-3 py-2 rounded-lg border ${
                                     isInlineEditingNarration
                                             ? isOptimalWordCount
                                               ? 'border-green-500 bg-green-50 focus:ring-2 focus:ring-green-500'
                                               : 'border-red-300 bg-red-50 focus:ring-2 focus:ring-red-500'
                                       : 'border-gray-200 bg-white text-gray-600 font-normal cursor-pointer '
                                   } ${isSavingNarration ? 'opacity-60' : ''}`}
                                   rows={3}
                                   placeholder="Double-click to edit narration"
                                 />
                                       {isInlineEditingNarration && (
                                         <div className="mt-2 flex items-center justify-between">
                                           <p className="text-xs text-gray-500 italic">
                                             Keep 18-20 words for a perfect 10 second audio
                                           </p>
                                           <p className={`text-xs font-medium ${
                                             isOptimalWordCount ? 'text-green-600' : 'text-red-600'
                                           }`}>
                                             {wordCount} {wordCount === 1 ? 'word' : 'words'}
                                           </p>
                               </div>
                                       )}
                                     </>
                                   );
                                 })()}
                               </div>
                             );
                           })()}
                         </div>
                           {/* Description Section - Hidden for VEO3 */}
                         {(() => {
                           const scene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                           const sceneModelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                             const isVEO3 = sceneModelUpper === 'VEO3';
                             // Don't show description for VEO3
                             if (isVEO3) return null;
                           
                           const sceneDescription =
                             Array.isArray(scriptRows) && scriptRows[currentSceneIndex]
                               ? scriptRows[currentSceneIndex].description || ''
                               : '';
                           const isInlineEditing =
                             !isEditingScene &&
                             isDescriptionEditing &&
                             descriptionSceneIndex === currentSceneIndex;
                           const startInlineEditing = () => {
                             // Parse description into sections for editing
                             const sections = parseDescription(sceneDescription);
                             setEditableSections(sections);
                             setDescriptionSceneIndex(currentSceneIndex);
                             setIsDescriptionEditing(true);
                           };
                           const cancelInlineEditing = () => {
                             setEditableSections([]);
                             setIsDescriptionEditing(false);
                             setDescriptionSceneIndex(null);
                           };
                           const updateSection = (index, field, value) => {
                             setEditableSections(prev => {
                               const updated = [...prev];
                               if (updated[index]) {
                                 if (field === 'title') {
                                   updated[index] = { ...updated[index], title: value };
                                 } else if (field === 'content') {
                                   updated[index] = { ...updated[index], content: value };
                                 }
                               }
                               return updated;
                             });
                           };
                           const addNewSection = () => {
                             setEditableSections(prev => [...prev, { type: 'section', title: '', content: '' }]);
                           };
                           const removeSection = (index) => {
                             setEditableSections(prev => prev.filter((_, i) => i !== index));
                           };
                           const saveInlineDescription = async () => {
                               setIsSavingDescription(true);
                               try {
                                 const saveScene =
                                 Array.isArray(scriptRows) && scriptRows[currentSceneIndex]
                                   ? scriptRows[currentSceneIndex]
                                   : null;
                                 const sceneNumber = (saveScene?.scene_number ?? (currentSceneIndex + 1)) || 0;
                                 const modelUpper = String(saveScene?.model || saveScene?.mode || '').toUpperCase();
                               // Merge sections back into description format (keeps ** marks)
                               const nextDescription = mergeDescriptionSections(editableSections);
                                 const narrationText = saveScene?.narration || '';
                               const computedWordCount = computeWordCount(narrationText || nextDescription);
                               handleSceneUpdate(currentSceneIndex, 'description', nextDescription);
                               handleSceneUpdate(currentSceneIndex, 'word_count', computedWordCount);

                                 if (modelUpper === 'VEO3') {
                                   try {
                                     const { session, user } = await buildSessionAndUserForScene();
                                     const token = localStorage.getItem('token') || '';
                                     const formattedUser = formatUserForVisual(user, token);
                                     const formattedSession = formatSessionForVisual(
                                       session,
                                       session?.session_id,
                                       session?.user_id
                                     );
                                     const payload = {
                                       user: formattedUser,
                                       session: formattedSession,
                                       scene_number: Number(sceneNumber) || 0,
                                       custom_desc: nextDescription
                                     };
                                     
                                     // Call custom-desc API
                                     const customDescResp = await fetch(
                                       'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/custom-desc',
                                       {
                                         method: 'POST',
                                         headers: { 'Content-Type': 'application/json' },
                                         body: JSON.stringify(payload)
                                       }
                                     );
                                     const customDescText = await customDescResp.text();
                                     let customDescData;
                                     try {
                                       customDescData = JSON.parse(customDescText);
                                     } catch (_) {
                                       customDescData = customDescText;
                                     }
                                     if (!customDescResp.ok) {
                                       throw new Error(`custom-desc failed: ${customDescResp.status} ${customDescText}`);
                                     }

                                     // Small delay to ensure backend has processed the update
                                     await new Promise(resolve => setTimeout(resolve, 500));

                                     // After custom-desc API succeeds, call user-session-data API
                                     const sessionId = localStorage.getItem('session_id');
                                     const userId = localStorage.getItem('token');
                                     if (sessionId && userId) {
                                       const sessionResp = await fetch(
                                         'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data',
                                         {
                                           method: 'POST',
                                           headers: { 'Content-Type': 'application/json' },
                                           body: JSON.stringify({ user_id: userId, session_id: sessionId })
                                         }
                                       );
                                       const sessionText = await sessionResp.text();
                                       let sessionData;
                                       try {
                                         sessionData = JSON.parse(sessionText);
                                       } catch (_) {
                                         sessionData = sessionText;
                                       }
                                       if (sessionResp.ok && sessionData) {
                                         // Update scriptRows from session data
                                         const sd = sessionData?.session_data || sessionData?.session || {};
                                         const scripts = Array.isArray(sd?.scripts) ? sd.scripts : [];
                                         if (scripts.length > 0) {
                                           const currentScript = scripts[0];
                                           const airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];
                                           if (airesponse.length > 0) {
                                             // Find the scene with matching scene_number and update its description
                                             // Use the description we sent (nextDescription) as the source of truth
                                             // but also check session data for any other updates
                                             const updatedAiresponse = airesponse.map((scene) => {
                                               const sceneNum = scene?.scene_number ?? scene?.scene_no ?? scene?.sceneNo ?? scene?.scene;
                                               if (Number(sceneNum) === Number(sceneNumber)) {
                                                 // Prioritize custom_desc from session, fallback to nextDescription we just sent
                                                 const updatedDesc = scene?.custom_desc || scene?.desc || scene?.description || nextDescription;
                                                 return {
                                                   ...scene,
                                                   description: updatedDesc,
                                                   desc: updatedDesc,
                                                   custom_desc: updatedDesc
                                                 };
                                               }
                                               return scene;
                                             });
                                             
                                             const scriptContainer = { script: { airesponse: updatedAiresponse } };
                                             applyScriptContainer(scriptContainer);
                                             
                                             // Also update the local state directly after a small delay to ensure description is preserved
                                             // This ensures the description is updated even if applyScriptContainer normalization doesn't pick it up
                                             setTimeout(() => {
                                               setScriptRows((prevRows) => {
                                                 if (!Array.isArray(prevRows)) return prevRows;
                                                 return prevRows.map((row, idx) => {
                                                   const rowSceneNum = row?.scene_number ?? (idx + 1);
                                                   if (Number(rowSceneNum) === Number(sceneNumber)) {
                                                     return {
                                                       ...row,
                                                       description: nextDescription,
                                                       desc: nextDescription
                                                     };
                                                   }
                                                   return row;
                                                 });
                                               });
                                             }, 100);
                                           }
                                         }
                                       }
                                     }
                                   } catch (err) {
                                     console.warn('custom-desc update failed:', err);
                                     alert(err?.message || 'Failed to save description. Please try again.');
                                   } finally {
                                     setIsSavingDescription(false);
                                     // Close editing state after loading completes for VEO3
                                     setIsDescriptionEditing(false);
                                     setDescriptionSceneIndex(null);
                                     setEditableSections([]);
                                   }
                                 } else if (modelUpper === 'ANCHOR' || modelUpper === 'SORA' || modelUpper === 'PLOTLY') {
                                   // Use update-text API for ANCHOR, SORA, and PLOTLY
                               try {
                                 await updateSceneGenImageFlag(currentSceneIndex, {
                                   descriptionOverride: nextDescription
                                 });
                               } catch (err) {
                                 console.warn('update-text description failed:', err);
                                 alert('Failed to save description. Please try again.');
                               }
                                 } else {
                                   // Default to update-text flow for any other models
                                   try {
                                     await updateSceneGenImageFlag(currentSceneIndex, {
                                       descriptionOverride: nextDescription
                                     });
                                   } catch (err) {
                                     console.warn('description update failed:', err);
                                     alert('Failed to save description. Please try again.');
                                   }
                                 }
                                 // Close editing state after API completes
                               setIsDescriptionEditing(false);
                               setDescriptionSceneIndex(null);
                               setEditableSections([]);
                             } catch (err) {
                               console.error('Error saving description:', err);
                               alert('Failed to save description. Please try again.');
                             } finally {
                               setIsSavingDescription(false);
                             }
                           };
                             if (isEditingScene) {
                           return (
                                 <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative">
                               {/* Loading Overlay */}
                               {isSavingDescription && (
                                 <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
                                   <div className="bg-white shadow-lg rounded-lg px-6 py-4 text-center space-y-3">
                                     <div className="w-16 h-16 mx-auto">
                                       <video
                                         src={LoadingAnimationVideo}
                                         autoPlay
                                         loop
                                         muted
                                         playsInline
                                         className="w-full h-full object-contain"
                                       />
                                         </div>
                                         <div className="text-sm font-semibold text-[#13008B]">Updating Description</div>
                                         <p className="text-xs text-gray-500">Please wait...</p>
                                       </div>
                                     </div>
                                   )}
                                   <h4 className="text-lg font-semibold text-gray-800 mb-4">Description</h4>
                                   {!isInlineEditing && (
                                   <p className="mt-2 text-xs text-gray-500">Double-click the description to edit.</p>
                                 )}
                                   <textarea
                                     value={sceneDescription}
                                     onChange={(e) => handleSceneUpdate(currentSceneIndex, 'description', e.target.value)}
                                     className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent !font-medium ${isSavingDescription ? 'opacity-60' : ''}`}
                                     rows={4}
                                     placeholder="Enter scene description"
                                     readOnly={isSavingDescription}
                                   />
                                 </div>
                               );
                             }
                             return (
                               <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative">
                                 {/* Loading Overlay */}
                                 {isSavingDescription && (
                                   <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
                                     <div className="bg-white shadow-lg rounded-lg px-6 py-4 text-center space-y-3">
                                       <div className="relative w-16 h-16 mx-auto">
                                         <div className="absolute inset-0 rounded-full border-4 border-[#D8D3FF]"></div>
                                         <div className="absolute inset-2 rounded-full overflow-hidden">
                                           <img 
                                             src={LogoImage} 
                                             alt="Logo" 
                                             className="w-full h-full object-contain animate-spin"
                                             style={{ animationDuration: '2s' }}
                                           />
                                         </div>
                                     </div>
                                     <div className="text-sm font-semibold text-[#13008B]">Updating Description</div>
                                     <p className="text-xs text-gray-500">Please wait...</p>
                                   </div>
                                 </div>
                               )}
                               <div className="flex items-center justify-between mb-3">
                                 <h4 className="text-lg font-semibold text-gray-800">Description</h4>
                                 {isInlineEditing ? (
                                   <div className="flex items-center gap-2">
                                     <button
                                       type="button"
                                       className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                       onClick={cancelInlineEditing}
                                       disabled={isSavingDescription}
                                     >
                                       Cancel
                                     </button>
                                     <button
                                       type="button"
                                         className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                       onClick={saveInlineDescription}
                                       disabled={isSavingDescription}
                                     >
                                       {isSavingDescription ? (
                                         <>
                                           <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                           <span>Saving...</span>
                                         </>
                                       ) : (
                                         'Save'
                                       )}
                                     </button>
                                   </div>
                                 ) : (
                                   <p className="text-xs text-gray-500">Double-click the description to edit.</p>
                                 )}
                               </div>
                               {isInlineEditing ? (
                                 <div className="space-y-4">
                                   {editableSections.map((section, index) => {
                                     if (section.type === 'section') {
                                       return (
                                         <div key={index} className="border border-gray-300 rounded-lg p-4 bg-white space-y-3">
                                           <div>
                                             <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Title</label>
                                           </div>
                                           <input
                                             type="text"
                                             value={section.title || ''}
                                             onChange={(e) => updateSection(index, 'title', e.target.value)}
                                             className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm font-semibold text-gray-800"
                                             placeholder="Enter title"
                                             disabled={isSavingDescription}
                                           />
                                           <div>
                                             <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Description</label>
                               <textarea
                                               value={section.content || ''}
                                               onChange={(e) => updateSection(index, 'content', e.target.value)}
                                               className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm text-gray-600 resize-none"
                                               rows={3}
                                               placeholder="Enter description"
                                               disabled={isSavingDescription}
                                             />
                                           </div>
                                         </div>
                                       );
                                     } else {
                                       return (
                                         <div key={index} className="border border-gray-300 rounded-lg p-4 bg-white space-y-3">
                                           <div>
                                             <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">Text Content</label>
                                           </div>
                                           <textarea
                                             value={section.content || ''}
                                             onChange={(e) => updateSection(index, 'content', e.target.value)}
                                             className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm text-gray-600 resize-none"
                                             rows={2}
                                             placeholder="Enter text content"
                                             disabled={isSavingDescription}
                                           />
                                         </div>
                                       );
                                     }
                                   })}
                                 </div>
                               ) : (
                                 <div
                                   onDoubleClick={startInlineEditing}
                                     className={`w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-600 min-h-[100px] cursor-pointer ${isSavingDescription ? 'opacity-60' : ''}`}
                                 >
                                   {sceneDescription ? (
                                     formatDescription(sceneDescription) || (
                                         <div className="text-sm text-gray-600 whitespace-pre-wrap">{sceneDescription}</div>
                                     )
                                   ) : (
                                     <p className="text-sm text-gray-400 italic">Double-click to add description</p>
                                   )}
                                 </div>
                               )}
                             </div>
                           );
                         })()}
                       </div>
                     </div>
                         {/* Accordions for Opening, Choosing Frame (SORA/ANCHOR) and Background (PLOTLY) */}
                         {(() => {
                           const scene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                           if (!scene) return null;
                           const sceneModelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                           const isSora = sceneModelUpper === 'SORA';
                           const isAnchor = sceneModelUpper === 'ANCHOR';
                           const isPlotly = sceneModelUpper === 'PLOTLY';
                           
                           // Only show accordions for SORA, ANCHOR, or PLOTLY
                           if (!isSora && !isAnchor && !isPlotly) return null;
                           
                           return (
                             <div className="md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                              {/* Scene Visual Section for SORA/ANCHOR */}
                              {(isSora || isAnchor) && (
                                <>
                                  <div className="md:col-span-2 mb-3">
                                    <h3 className="text-base font-semibold text-gray-800">Scene Visual</h3>
                                  </div>
                                  {/* Opening Frame Accordion */}
                                  <div className="bg-white rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between p-4">
                                      <button
                                        type="button"
                                        onClick={() => setOpeningAccordionOpen(!openingAccordionOpen)}
                                        className="flex-1 flex items-center justify-between text-left hover:bg-gray-50 transition-colors -ml-4 -mr-4 px-4"
                                      >
                                        <span className="text-sm font-semibold text-gray-800">Opening Frame</span>
                                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${openingAccordionOpen ? 'rotate-180' : ''}`} />
                                      </button>
                                      {openingAccordionOpen && (
                                        <div className="ml-2 flex items-center gap-2">
                                          {isEditingOpeningFrame ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setIsEditingOpeningFrame(false);
                                                  setEditedOpeningFrame({});
                                                }}
                                                disabled={isSavingFrameData}
                                                className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  try {
                                                    await saveFrameData('opening_frame', editedOpeningFrame);
                                                    setIsEditingOpeningFrame(false);
                                                  } catch (e) {
                                                    console.error('Failed to save opening frame:', e);
                                                  }
                                                }}
                                                disabled={isSavingFrameData}
                                                className="px-3 py-1.5 rounded-md bg-[#13008B] text-white text-xs font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                              >
                                                {isSavingFrameData ? (
                                                  <>
                                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Saving...</span>
                                                  </>
                                                ) : (
                                                  'Save'
                                                )}
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const openingData = scene?.opening_frame || scene?.openingFrame || scene?.opening || {};
                                                setEditedOpeningFrame(typeof openingData === 'object' && !Array.isArray(openingData) ? { ...openingData } : {});
                                                setIsEditingOpeningFrame(true);
                                              }}
                                              className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                              Edit
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                     {openingAccordionOpen && (
                                       <div className="px-4 pb-4">
                                         {(() => {
                                           const normalizeOpeningData = (data) => {
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
                                           // Check for opening_frame first, then fallback to opening
                                           const currentData = isEditingOpeningFrame ? editedOpeningFrame : normalizeOpeningData(scene?.opening_frame || scene?.openingFrame || scene?.opening);
                                           const formatTitle = (key) => {
                                             const cleaned = key.replace(/_/g, ' ').trim();
                                             if (!cleaned) return '';
                                             return cleaned
                                               .split(' ')
                                               .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                                               .join(' ');
                                           };
                                           const formatValue = (val) => {
                                             if (val == null) return '';
                                             if (typeof val === 'object') return JSON.stringify(val, null, 2);
                                             return String(val);
                                           };
                                           const openingFields = Object.entries(currentData);
                                           const priorityOrder = ['style', 'action', 'setting', 'subject', 'composition', 'factual_details', 'camera_lens_shadow_lighting'];
                                           const sortedFields = openingFields.sort(([keyA], [keyB]) => {
                                             const indexA = priorityOrder.indexOf(keyA.toLowerCase());
                                             const indexB = priorityOrder.indexOf(keyB.toLowerCase());
                                             if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                             if (indexA !== -1) return -1;
                                             if (indexB !== -1) return 1;
                                             return 0;
                                           });
                                           
                                           return openingFields.length > 0 ? (
                                             <>
                                               <div className="grid grid-cols-1 gap-4">
                                                 {sortedFields.map(([key, value]) => {
                                                   const title = formatTitle(key);
                                                   const displayValue = formatValue(value);
                                                   return (
                                                     <div
                                                       key={key}
                                                       className="border border-gray-200 rounded-lg bg-white p-4 space-y-2 shadow-sm"
                                                     >
                                                       <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                                         {title}
                                                       </h5>
                                                       {isEditingOpeningFrame ? (
                                                         <textarea
                                                           value={displayValue}
                                                           onChange={(e) => {
                                                             const newData = { ...editedOpeningFrame };
                                                             newData[key] = e.target.value;
                                                             setEditedOpeningFrame(newData);
                                                           }}
                                                           className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm text-gray-600 resize-none"
                                                           rows={3}
                                                           disabled={isSavingFrameData}
                                                         />
                                                       ) : (
                                                         <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600 whitespace-pre-wrap min-h-[60px]">
                                                           {displayValue || '-'}
                                                         </div>
                                                       )}
                                                     </div>
                                                   );
                                                 })}
                                               </div>
                                             </>
                                           ) : (
                                             <div className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-500">
                                               No opening data available
                                             </div>
                                           );
                                         })()}
                                       </div>
                                     )}
                                   </div>
                                  {/* Closing Frame Accordion */}
                                  <div className="bg-white rounded-lg border border-gray-200">
                                    <div className="flex items-center justify-between p-4">
                                      <button
                                        type="button"
                                        onClick={() => setClosingFrameAccordionOpen(!closingFrameAccordionOpen)}
                                        className="flex-1 flex items-center justify-between text-left hover:bg-gray-50 transition-colors -ml-4 -mr-4 px-4"
                                      >
                                        <span className="text-sm font-semibold text-gray-800">Closing Frame</span>
                                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${closingFrameAccordionOpen ? 'rotate-180' : ''}`} />
                                      </button>
                                      {closingFrameAccordionOpen && (
                                        <div className="ml-2 flex items-center gap-2">
                                          {isEditingClosingFrame ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setIsEditingClosingFrame(false);
                                                  setEditedClosingFrame({});
                                                }}
                                                disabled={isSavingFrameData}
                                                className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  try {
                                                    await saveFrameData('closing_frame', editedClosingFrame);
                                                    setIsEditingClosingFrame(false);
                                                  } catch (e) {
                                                    console.error('Failed to save closing frame:', e);
                                                  }
                                                }}
                                                disabled={isSavingFrameData}
                                                className="px-3 py-1.5 rounded-md bg-[#13008B] text-white text-xs font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                              >
                                                {isSavingFrameData ? (
                                                  <>
                                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Saving...</span>
                                                  </>
                                                ) : (
                                                  'Save'
                                                )}
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const closingData = scene?.closing_frame || scene?.closingFrame || scene?.choosing_frame || scene?.choosingFrame || {};
                                                setEditedClosingFrame(typeof closingData === 'object' && !Array.isArray(closingData) ? { ...closingData } : {});
                                                setIsEditingClosingFrame(true);
                                              }}
                                              className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                              Edit
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {closingFrameAccordionOpen && (
                                       <div className="px-4 pb-4">
                                         {(() => {
                                          const normalizeClosingFrameData = (data) => {
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
                                          // Check for closing_frame first, then fallback to choosing_frame (for backward compatibility)
                                          const currentData = isEditingClosingFrame ? editedClosingFrame : normalizeClosingFrameData(scene?.closing_frame || scene?.closingFrame || scene?.choosing_frame || scene?.choosingFrame);
                                          const formatTitle = (key) => {
                                            const cleaned = key.replace(/_/g, ' ').trim();
                                            if (!cleaned) return '';
                                            return cleaned
                                              .split(' ')
                                              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                                              .join(' ');
                                          };
                                          const formatValue = (val) => {
                                            if (val == null) return '';
                                            if (typeof val === 'object') return JSON.stringify(val, null, 2);
                                            return String(val);
                                          };
                                          const closingFrameFields = Object.entries(currentData);
                                          const priorityOrder = ['style', 'action', 'setting', 'subject', 'composition', 'factual_details', 'camera_lens_shadow_lighting'];
                                          const sortedFields = closingFrameFields.sort(([keyA], [keyB]) => {
                                            const indexA = priorityOrder.indexOf(keyA.toLowerCase());
                                            const indexB = priorityOrder.indexOf(keyB.toLowerCase());
                                            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                            if (indexA !== -1) return -1;
                                            if (indexB !== -1) return 1;
                                            return 0;
                                          });
                                          
                                          return closingFrameFields.length > 0 ? (
                                             <>
                                               <div className="grid grid-cols-1 gap-4">
                                                 {sortedFields.map(([key, value]) => {
                                                   const title = formatTitle(key);
                                                   const displayValue = formatValue(value);
                                                   return (
                                                     <div
                                                       key={key}
                                                       className="border border-gray-200 rounded-lg bg-white p-4 space-y-2 shadow-sm"
                                                     >
                                                       <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                                         {title}
                                                       </h5>
                                                       {isEditingClosingFrame ? (
                                                         <textarea
                                                           value={displayValue}
                                                           onChange={(e) => {
                                                             const newData = { ...editedClosingFrame };
                                                             newData[key] = e.target.value;
                                                             setEditedClosingFrame(newData);
                                                           }}
                                                           className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm text-gray-600 resize-none"
                                                           rows={3}
                                                           disabled={isSavingFrameData}
                                                         />
                                                       ) : (
                                                         <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600 whitespace-pre-wrap min-h-[60px]">
                                                           {displayValue || '-'}
                                                         </div>
                                                       )}
                                                     </div>
                                                   );
                                                 })}
                                               </div>
                                             </>
                                           ) : (
                                            <div className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-500">
                                              No closing frame data available
                                            </div>
                                           );
                                         })()}
                                       </div>
                                     )}
                                   </div>
                                 </>
                               )}
                              {/* Scene Visual Section for PLOTLY */}
                              {isPlotly && (
                                <>
                                  <div className="md:col-span-2 mb-3">
                                    <h3 className="text-base font-semibold text-gray-800">Scene Visual</h3>
                                  </div>
                                  {/* Background Frame Accordion */}
                                  <div className="bg-white rounded-lg border border-gray-200 md:col-span-2">
                                    <div className="flex items-center justify-between p-4">
                                      <button
                                        type="button"
                                        onClick={() => setBackgroundAccordionOpen(!backgroundAccordionOpen)}
                                        className="flex-1 flex items-center justify-between text-left hover:bg-gray-50 transition-colors -ml-4 -mr-4 px-4"
                                      >
                                        <span className="text-sm font-semibold text-gray-800">Background Frame</span>
                                        <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${backgroundAccordionOpen ? 'rotate-180' : ''}`} />
                                      </button>
                                      {backgroundAccordionOpen && (
                                        <div className="ml-2 flex items-center gap-2">
                                          {isEditingBackgroundFrame ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  setIsEditingBackgroundFrame(false);
                                                  setEditedBackgroundFrame({});
                                                }}
                                                disabled={isSavingFrameData}
                                                className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                              >
                                                Cancel
                                              </button>
                                              <button
                                                type="button"
                                                onClick={async () => {
                                                  try {
                                                    await saveFrameData('background_frame', editedBackgroundFrame);
                                                    setIsEditingBackgroundFrame(false);
                                                  } catch (e) {
                                                    console.error('Failed to save background frame:', e);
                                                  }
                                                }}
                                                disabled={isSavingFrameData}
                                                className="px-3 py-1.5 rounded-md bg-[#13008B] text-white text-xs font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                              >
                                                {isSavingFrameData ? (
                                                  <>
                                                    <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                    <span>Saving...</span>
                                                  </>
                                                ) : (
                                                  'Save'
                                                )}
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const backgroundData = scene?.background_frame || scene?.backgroundFrame || scene?.background || {};
                                                setEditedBackgroundFrame(typeof backgroundData === 'object' && !Array.isArray(backgroundData) ? { ...backgroundData } : {});
                                                setIsEditingBackgroundFrame(true);
                                              }}
                                              className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                            >
                                              Edit
                                            </button>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                    {backgroundAccordionOpen && (
                                      <div className="px-4 pb-4">
                                        {(() => {
                                          const normalizeBackgroundFrameData = (data) => {
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
                                          // Check for background_frame first, then fallback to background (for backward compatibility)
                                          const currentData = isEditingBackgroundFrame ? editedBackgroundFrame : normalizeBackgroundFrameData(scene?.background_frame || scene?.backgroundFrame || scene?.background || {});
                                          const formatTitle = (key) => {
                                            const cleaned = key.replace(/_/g, ' ').trim();
                                            if (!cleaned) return '';
                                            return cleaned
                                              .split(' ')
                                              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                                              .join(' ');
                                          };
                                          const formatValue = (val) => {
                                            if (val == null) return '';
                                            if (typeof val === 'object') return JSON.stringify(val, null, 2);
                                            return String(val);
                                          };
                                          const backgroundFrameFields = Object.entries(currentData);
                                          const priorityOrder = ['style', 'action', 'setting', 'subject', 'composition', 'factual_details', 'camera_lens_shadow_lighting'];
                                          const sortedFields = backgroundFrameFields.sort(([keyA], [keyB]) => {
                                            const indexA = priorityOrder.indexOf(keyA.toLowerCase());
                                            const indexB = priorityOrder.indexOf(keyB.toLowerCase());
                                            if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                            if (indexA !== -1) return -1;
                                            if (indexB !== -1) return 1;
                                            return 0;
                                          });
                                          
                                          return backgroundFrameFields.length > 0 ? (
                                            <>
                                              <div className="grid grid-cols-1 gap-4">
                                                {sortedFields.map(([key, value]) => {
                                                  const title = formatTitle(key);
                                                  const displayValue = formatValue(value);
                                                  return (
                                                    <div
                                                      key={key}
                                                      className="border border-gray-200 rounded-lg bg-white p-4 space-y-2 shadow-sm"
                                                    >
                                                      <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                                        {title}
                                                      </h5>
                                                      {isEditingBackgroundFrame ? (
                                                        <textarea
                                                          value={displayValue}
                                                          onChange={(e) => {
                                                            const newData = { ...editedBackgroundFrame };
                                                            newData[key] = e.target.value;
                                                            setEditedBackgroundFrame(newData);
                                                          }}
                                                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm text-gray-600 resize-none"
                                                          rows={3}
                                                          disabled={isSavingFrameData}
                                                        />
                                                      ) : (
                                                        <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600 whitespace-pre-wrap min-h-[60px]">
                                                          {displayValue || '-'}
                                                        </div>
                                                      )}
                                                    </div>
                                                  );
                                                })}
                                              </div>
                                            </>
                                          ) : (
                                            <div className="px-3 py-2 rounded-lg border border-gray-200 bg-white text-sm text-gray-500">
                                              No background frame data available
                                            </div>
                                          );
                                        })()}
                                      </div>
                                    )}
                                  </div>
                                </>
                              )}
                             </div>
                           );
                         })()}
                     </div>

                      {(() => {
                        const scene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                        const sceneModelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                        const isPlotly = sceneModelUpper === 'PLOTLY';
                        if (isPlotly) {
                          // Debug logging for chart_type and chart_data
                          try {
                            console.log('[Chat] PLOTLY scene data:', {
                              sceneIndex: currentSceneIndex,
                              chart_type: scene?.chart_type,
                              chartType: scene?.chartType,
                              has_chart_data: !!(scene?.chart_data || scene?.chartData),
                              chart_data_structure: scene?.chart_data || scene?.chartData
                            });
                          } catch(_) {}
                          const chartType = scene?.chart_type || scene?.chartType || '-';
                          const chartData = (() => {
                            const d = scene?.chart_data || scene?.chartData;
                            if (d == null) return '-';
                            if (typeof d === 'string') return d;
                            try { return JSON.stringify(d, null, 2); } catch (_) { return String(d); }
                          })();
                          const isCurrentlyEditingChartType = isChartTypeEditing && chartTypeSceneIndex === currentSceneIndex;
                          const displayChartType = isCurrentlyEditingChartType ? pendingChartTypeValue : chartType;
                          const hasChartTypeChanged = isCurrentlyEditingChartType && pendingChartTypeValue !== chartType;
                          
                          const startEditingChartType = () => {
                            setPendingChartTypeValue(chartType || '');
                            setChartTypeSceneIndex(currentSceneIndex);
                            setIsChartTypeEditing(true);
                          };
                          
                          const cancelEditingChartType = () => {
                            setPendingChartTypeValue('');
                            setIsChartTypeEditing(false);
                            setChartTypeSceneIndex(null);
                          };
                          
                          const saveChartType = async () => {
                            try {
                              await regenerateChart(currentSceneIndex, pendingChartTypeValue);
                              setIsChartTypeEditing(false);
                              setChartTypeSceneIndex(null);
                              // State is already updated in regenerateChart, no need to force re-render
                            } catch (e) {
                              console.error('Failed to save chart type:', e);
                              const errorMessage = e?.message || 'Failed to regenerate chart';
                              alert(`Error: ${errorMessage}. Please try again.`);
                              // Keep editing mode open on error so user can retry
                            }
                          };
                          
                          // Get description for PLOTLY
                          const sceneDescription =
                            Array.isArray(scriptRows) && scriptRows[currentSceneIndex]
                              ? scriptRows[currentSceneIndex].description || ''
                              : '';
                          const isInlineEditing =
                            !isEditingScene &&
                            isDescriptionEditing &&
                            descriptionSceneIndex === currentSceneIndex;
                          const startInlineEditing = () => {
                            setPendingDescription(sceneDescription);
                            setDescriptionSceneIndex(currentSceneIndex);
                            setIsDescriptionEditing(true);
                          };
                          const cancelInlineEditing = () => {
                            setPendingDescription(sceneDescription);
                            setIsDescriptionEditing(false);
                            setDescriptionSceneIndex(null);
                          };
                          const saveInlineDescription = async () => {
                            try {
                              const scene =
                                Array.isArray(scriptRows) && scriptRows[currentSceneIndex]
                                  ? scriptRows[currentSceneIndex]
                                  : null;
                              const sceneNumber = (scene?.scene_number ?? (currentSceneIndex + 1)) || 0;
                              const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                              const nextDescription = pendingDescription || '';
                              const narrationText = scene?.narration || '';
                              const computedWordCount = computeWordCount(narrationText || nextDescription);
                              handleSceneUpdate(currentSceneIndex, 'description', nextDescription);
                              handleSceneUpdate(currentSceneIndex, 'word_count', computedWordCount);

                              if (modelUpper === 'SORA' || modelUpper === 'PLOTLY') {
                                try {
                                  await updateSceneGenImageFlag(currentSceneIndex, {
                                    descriptionOverride: nextDescription
                                  });
                                } catch (err) {
                                  console.warn('update-text description failed:', err);
                                }
                                setIsDescriptionEditing(false);
                                setDescriptionSceneIndex(null);
                              } else {
                                // Default to update-text flow for any other models
                                try {
                                  await updateSceneGenImageFlag(currentSceneIndex, {
                                    descriptionOverride: nextDescription
                                  });
                                } catch (err) {
                                  console.warn('description update failed:', err);
                                }
                                setIsDescriptionEditing(false);
                                setDescriptionSceneIndex(null);
                              }
                            } catch (_) {
                              /* noop */
                            }
                          };
                          
                          return (
                            <>
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <h4 className="text-lg font-semibold text-gray-800 mb-4">Chart</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="flex items-center justify-between mb-1">
                                    <div className="text-sm font-medium text-gray-700">Chart Type</div>
                                    {isCurrentlyEditingChartType ? (
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
                                          onClick={cancelEditingChartType}
                                          disabled={isRegeneratingChart}
                                        >
                                          Cancel
                                        </button>
                                        {hasChartTypeChanged && (
                                          <button
                                            type="button"
                                            disabled={isRegeneratingChart}
                                            className={`px-3 py-1.5 rounded-lg text-sm ${
                                              isRegeneratingChart
                                                ? 'bg-blue-400 text-white cursor-not-allowed'
                                                : 'bg-[#13008B] text-white hover:bg-blue-800'
                                            }`}
                                            onClick={saveChartType}
                                          >
                                            {isRegeneratingChart ? 'Saving...' : 'Save'}
                                          </button>
                                        )}
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                        onClick={startEditingChartType}
                                      >
                                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Edit
                                      </button>
                                    )}
                                  </div>
                                  {isCurrentlyEditingChartType ? (
                                    <select
                                      value={pendingChartTypeValue || ''}
                                      onChange={(e) => setPendingChartTypeValue(e.target.value)}
                                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                                    >
                                   <option value="">Select</option>
                      <option value="clustered_bar">Clustered Bar</option>
                      <option value="clustered_column">Clustered Column</option>
                      <option value="line">Line</option>
                      <option value="pie">Pie</option>
                      <option value="stacked_bar">Stacked Bar</option>
                      <option value="stacked_column">Staacked Column</option>
                      <option value="waterfall_bar">Waterfall Bar</option>
                      <option value="waterfall_column">Waterfall Column</option>
                      <option value="donut">Donut</option>
                                    </select>
                                  ) : (
                                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 whitespace-pre-wrap">{displayChartType || '-'}</div>
                                  )}
                                </div>
                                <div className="md:col-span-2">
                                  <ChartDataEditor
                                    chartType={chartType || ''}
                                    chartData={scene?.chart_data || scene?.chartData}
                                    onDataChange={(updatedData) => {
                                      // Update local state immediately
                                      handleSceneUpdate(currentSceneIndex, 'chart_data', updatedData);
                                    }}
                                    onSave={async (updatedData) => {
                                      try {
                                        // Update local state
                                        handleSceneUpdate(currentSceneIndex, 'chart_data', updatedData);
                                        // Call API to persist changes
                                        await updateSceneGenImageFlag(currentSceneIndex);
                                        // Show success message (optional)
                                        console.log('Chart data saved successfully');
                                      } catch (err) {
                                        console.error('Failed to save chart data:', err);
                                        alert('Failed to save chart data. Please try again.');
                                      }
                                    }}
                                  />
                                </div>
                              </div>
                            </div>
                            </>
                          );
                        }
                        // For PLOTLY, also show description section after chart editor
                        // Check if VEO3 model - show veo3_prompt_template instead of description
                        // Note: scene is already declared above at line 9523
                        const modelUpper = scene ? String(scene?.model || scene?.mode || '').toUpperCase() : '';
                        const isVEO3 = modelUpper === 'VEO3';
                        const isPlotlyForDescription = modelUpper === 'PLOTLY';
                        
                        // For VEO3: Show veo3_prompt_template fields (DESC TEMPLATE only - exclude description, mode, presenter_options)
                        if (isVEO3) {
                          const normalizeVeo3Template = (tpl) => {
                            if (!tpl) return {};
                            if (typeof tpl === 'string') {
                              try {
                                const parsed = JSON.parse(tpl);
                                if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) return parsed;
                              } catch (_) {
                                // Best-effort parse for non-strict JSON (e.g., newline separated key: value)
                                const map = {};
                                const pairs = tpl.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
                                pairs.forEach((line) => {
                                  const match = line.match(/^\s*"?([^":]+)"?\s*:\s*"?(.+?)"?\s*[,}]?$/);
                                  if (match) {
                                    map[match[1].trim()] = match[2].trim();
                                  }
                                });
                                if (Object.keys(map).length > 0) return map;
                                return {};
                              }
                            }
                            if (Array.isArray(tpl)) {
                              const collected = {};
                              tpl.forEach((item) => {
                                if (item && typeof item === 'object') {
                                  Object.entries(item).forEach(([k, v]) => {
                                    if (collected[k] === undefined) collected[k] = v;
                                  });
                                }
                              });
                              return collected;
                            }
                            return typeof tpl === 'object' ? tpl : {};
                          };
                          const veo3Template = normalizeVeo3Template(scene?.veo3_prompt_template);
                          const priorityOrder = ['subject', 'background', 'action', 'style', 'camera', 'preset', 'ambiance', 'composition', 'focus_and_lens', 'focus', 'lens', 'lighting'];
                          const formatTitle = (key) => {
                            const cleaned = key.replace(/_/g, ' ').trim();
                            if (!cleaned) return '';
                            return cleaned
                              .split(' ')
                              .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                              .join(' ');
                          };
                          const formatValue = (val) => {
                            if (val == null) return '';
                            if (typeof val === 'object') return JSON.stringify(val, null, 2);
                            return String(val);
                          };
                          // Filter out description, mode, presenter_options, and any other non-DESC-TEMPLATE fields
                          const excludedKeys = ['description', 'mode', 'presenter_options', 'presenterOptions', 'MODE', 'PRESENTER_OPTIONS'];
                          const allFields = Object.entries(veo3Template).filter(([key]) => {
                            const keyLower = key.toLowerCase();
                            return !excludedKeys.some(excluded => excluded.toLowerCase() === keyLower);
                          });
                          
                          // Sort fields: Subject, Background, Action first, then the rest
                          const templateFields = allFields.sort(([keyA], [keyB]) => {
                            const indexA = priorityOrder.indexOf(keyA.toLowerCase());
                            const indexB = priorityOrder.indexOf(keyB.toLowerCase());
                            
                            // If both are in priority order, sort by priority
                            if (indexA !== -1 && indexB !== -1) {
                              return indexA - indexB;
                            }
                            // If only A is in priority, A comes first
                            if (indexA !== -1) return -1;
                            // If only B is in priority, B comes first
                            if (indexB !== -1) return 1;
                            // If neither is in priority, maintain original order
                            return 0;
                          });
                          
                          if (isEditingSceneData) {
                            return (
                              <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative">
                                {isSavingSceneData && (
                                  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
                                    <div className="bg-white shadow-lg rounded-lg px-6 py-4 text-center space-y-3">
                                      <div className="w-16 h-16 mx-auto">
                                        <video
                                          src={LoadingAnimationVideo}
                                          autoPlay
                                          loop
                                          muted
                                          playsInline
                                          className="w-full h-full object-contain"
                                        />
                                      </div>
                                      <div className="text-sm font-semibold text-[#13008B]">Updating Scene Description</div>
                                      <p className="text-xs text-gray-500">Please wait...</p>
                                    </div>
                                  </div>
                                )}
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-lg font-semibold text-gray-800">DESC TEMPLATE</h4>
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={cancelSceneDataEdit}
                                      disabled={isSavingSceneData}
                                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={saveSceneData}
                                      disabled={isSavingSceneData}
                                      className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                      {isSavingSceneData ? (
                                        <>
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                          <span>Saving...</span>
                                        </>
                                      ) : (
                                        'Save'
                                      )}
                                    </button>
                                  </div>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  {templateFields.length > 0 ? (
                                    templateFields.map(([key, value]) => {
                                      const displayValue = typeof value === 'string' ? value : (typeof value === 'object' && value !== null ? JSON.stringify(value, null, 2) : String(value || ''));
                                      const title = key.replace(/_/g, ' ').split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
                                      const onChange = (val) => {
                                        const currentTemplate = {
                                          ...(scene?.veo3_prompt_template || {})
                                        };
                                        currentTemplate[key] = val;
                                        handleSceneUpdate(
                                          currentSceneIndex,
                                          'veo3_prompt_template',
                                          currentTemplate
                                        );
                                      };
                                      return (
                                        <div
                                          key={key}
                                          className="border border-gray-200 rounded-lg bg-white p-4 space-y-2 shadow-sm"
                                        >
                                          <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide flex items-center justify-between">
                                            {title}
                                          </h5>
                                          <textarea
                                            value={displayValue}
                                            onChange={(e) => onChange(e.target.value)}
                                            rows={3}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm text-gray-600 resize-none"
                                            disabled={isSavingSceneData}
                                            placeholder="Enter description"
                                          />
                                        </div>
                                      );
                                    })
                                  ) : (
                                    <div className="text-sm text-gray-500">No VEO3 prompt template fields available</div>
                                  )}
                                </div>
                              </div>
                            );
                          }
                          
                          return (
                            <div className="bg-gray-50 rounded-xl p-5 border border-gray-200 relative">
                              {isSavingSceneData && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
                                  <div className="bg-white shadow-lg rounded-lg px-6 py-4 text-center space-y-3">
                                    <div className="w-16 h-16 mx-auto">
                                      <video
                                        src={LoadingAnimationVideo}
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <div className="text-sm font-semibold text-[#13008B]">Updating Scene Description</div>
                                    <p className="text-xs text-gray-500">Please wait...</p>
                                  </div>
                                </div>
                              )}
                              <div className="flex items-center justify-between mb-4">
                                <h4 className="text-2xl font-semibold text-gray-800">Scene Description</h4>
                                {isEditingSceneData ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={cancelSceneDataEdit}
                                      disabled={isSavingSceneData}
                                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={saveSceneData}
                                      disabled={isSavingSceneData}
                                      className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    >
                                      {isSavingSceneData ? (
                                        <>
                                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                          <span>Saving...</span>
                                        </>
                                      ) : (
                                        'Save'
                                      )}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={beginSceneDataEdit}
                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                  >
                                    <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                    </svg>
                                    Edit
                                  </button>
                                )}
                              </div>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {templateFields.length > 0 ? (
                                  templateFields.map(([key, value]) => {
                                    const title = formatTitle(key);
                                    const displayValue = formatValue(value);
                                    return (
                                      <div
                                        key={key}
                                        className="border border-gray-200 rounded-xl bg-white p-4 space-y-2 shadow-sm"
                                      >
                                        <div className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                                          {title}
                                        </div>
                                        <div className="text-base text-gray-900 break-words whitespace-pre-line leading-relaxed">
                                          {displayValue || '-'}
                                        </div>
                                      </div>
                                    );
                                  })
                                ) : (
                                  <div className="text-sm text-gray-500">No VEO3 prompt template fields available</div>
                                )}
                              </div>
                            </div>
                          );
                        }
                        
                        // Default: Description for non-VEO3, non-PLOTLY, and non-SORA/ANCHOR scenes
                        // SORA/ANCHOR have opening_frame and closing_frame accordions, so skip description section
                        const defaultScene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                        const modelUpperForDefault = defaultScene ? String(defaultScene?.model || defaultScene?.mode || '').toUpperCase() : '';
                        const isPlotlyForDefault = modelUpperForDefault === 'PLOTLY';
                        const isSoraOrAnchorForDefault = modelUpperForDefault === 'SORA' || modelUpperForDefault === 'ANCHOR';
                        // Skip default description for PLOTLY, SORA, and ANCHOR
                        if (isPlotlyForDefault || isSoraOrAnchorForDefault) {
                          return null;
                        }
                        
                        const sceneDescription =
                          Array.isArray(scriptRows) && scriptRows[currentSceneIndex]
                            ? scriptRows[currentSceneIndex].description || ''
                            : '';
                        const isInlineEditing =
                          !isEditingScene &&
                          isDescriptionEditing &&
                          descriptionSceneIndex === currentSceneIndex;
                        const startInlineEditing = () => {
                          // Parse description into sections for editing
                          const sections = parseDescription(sceneDescription);
                          setEditableSections(sections);
                          setDescriptionSceneIndex(currentSceneIndex);
                          setIsDescriptionEditing(true);
                        };
                        const cancelInlineEditing = () => {
                          setEditableSections([]);
                          setIsDescriptionEditing(false);
                          setDescriptionSceneIndex(null);
                        };
                        const updateSection = (index, field, value) => {
                          setEditableSections(prev => {
                            const updated = [...prev];
                            if (updated[index]) {
                              if (field === 'title') {
                                updated[index] = { ...updated[index], title: value };
                              } else if (field === 'content') {
                                updated[index] = { ...updated[index], content: value };
                              }
                            }
                            return updated;
                          });
                        };
                        const addNewSection = () => {
                          setEditableSections(prev => [...prev, { type: 'section', title: '', content: '' }]);
                        };
                        const removeSection = (index) => {
                          setEditableSections(prev => prev.filter((_, i) => i !== index));
                        };
                        const saveInlineDescription = async () => {
                          setIsSavingDescription(true);
                          try {
                            const saveScene =
                              Array.isArray(scriptRows) && scriptRows[currentSceneIndex]
                                ? scriptRows[currentSceneIndex]
                                : null;
                            const sceneNumber = (saveScene?.scene_number ?? (currentSceneIndex + 1)) || 0;
                            const modelUpper = String(saveScene?.model || saveScene?.mode || '').toUpperCase();
                            // Merge sections back into description format (keeps ** marks)
                            const nextDescription = mergeDescriptionSections(editableSections);
                            const narrationText = saveScene?.narration || '';
                            const computedWordCount = computeWordCount(narrationText || nextDescription);
                            handleSceneUpdate(currentSceneIndex, 'description', nextDescription);
                            handleSceneUpdate(currentSceneIndex, 'word_count', computedWordCount);

                            if (modelUpper === 'VEO3') {
                              try {
                                const { session, user } = await buildSessionAndUserForScene();
                                const token = localStorage.getItem('token') || '';
                                const formattedUser = formatUserForVisual(user, token);
                                const formattedSession = formatSessionForVisual(
                                  session,
                                  session?.session_id,
                                  session?.user_id
                                );
                                const payload = {
                                  user: formattedUser,
                                  session: formattedSession,
                                  scene_number: Number(sceneNumber) || 0,
                                  custom_desc: nextDescription
                                };
                                
                                // Call custom-desc API
                                const customDescResp = await fetch(
                                  'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/custom-desc',
                                  {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(payload)
                                  }
                                );
                                const customDescText = await customDescResp.text();
                                let customDescData;
                                try {
                                  customDescData = JSON.parse(customDescText);
                                } catch (_) {
                                  customDescData = customDescText;
                                }
                                if (!customDescResp.ok) {
                                  throw new Error(`custom-desc failed: ${customDescResp.status} ${customDescText}`);
                                }

                                // Small delay to ensure backend has processed the update
                                await new Promise(resolve => setTimeout(resolve, 500));

                                // After custom-desc API succeeds, call user-session-data API
                                const sessionId = localStorage.getItem('session_id');
                                const userId = localStorage.getItem('token');
                                if (sessionId && userId) {
                                  const sessionResp = await fetch(
                                    'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data',
                                    {
                                      method: 'POST',
                                      headers: { 'Content-Type': 'application/json' },
                                      body: JSON.stringify({ user_id: userId, session_id: sessionId })
                                    }
                                  );
                                  const sessionText = await sessionResp.text();
                                  let sessionData;
                                  try {
                                    sessionData = JSON.parse(sessionText);
                                  } catch (_) {
                                    sessionData = sessionText;
                                  }
                                  if (sessionResp.ok && sessionData) {
                                    // Update scriptRows from session data
                                    const sd = sessionData?.session_data || sessionData?.session || {};
                                    const scripts = Array.isArray(sd?.scripts) ? sd.scripts : [];
                                    if (scripts.length > 0) {
                                      const currentScript = scripts[0];
                                      const airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];
                                      if (airesponse.length > 0) {
                                        // Find the scene with matching scene_number and update its description
                                        // Use the description we sent (nextDescription) as the source of truth
                                        // but also check session data for any other updates
                                        const updatedAiresponse = airesponse.map((scene) => {
                                          const sceneNum = scene?.scene_number ?? scene?.scene_no ?? scene?.sceneNo ?? scene?.scene;
                                          if (Number(sceneNum) === Number(sceneNumber)) {
                                            // Prioritize custom_desc from session, fallback to nextDescription we just sent
                                            const updatedDesc = scene?.custom_desc || scene?.desc || scene?.description || nextDescription;
                                            return {
                                              ...scene,
                                              description: updatedDesc,
                                              desc: updatedDesc,
                                              custom_desc: updatedDesc
                                            };
                                          }
                                          return scene;
                                        });
                                        
                                        const scriptContainer = { script: { airesponse: updatedAiresponse } };
                                        applyScriptContainer(scriptContainer);
                                        
                                        // Also update the local state directly after a small delay to ensure description is preserved
                                        // This ensures the description is updated even if applyScriptContainer normalization doesn't pick it up
                                        setTimeout(() => {
                                          setScriptRows((prevRows) => {
                                            if (!Array.isArray(prevRows)) return prevRows;
                                            return prevRows.map((row, idx) => {
                                              const rowSceneNum = row?.scene_number ?? (idx + 1);
                                              if (Number(rowSceneNum) === Number(sceneNumber)) {
                                                return {
                                                  ...row,
                                                  description: nextDescription,
                                                  desc: nextDescription
                                                };
                                              }
                                              return row;
                                            });
                                          });
                                        }, 100);
                                      }
                                    }
                                  }
                                }
                              } catch (err) {
                                console.warn('custom-desc update failed:', err);
                                alert(err?.message || 'Failed to save description. Please try again.');
                              } finally {
                                setIsSavingDescription(false);
                                // Close editing state after loading completes for VEO3
                                setIsDescriptionEditing(false);
                                setDescriptionSceneIndex(null);
                                setEditableSections([]);
                              }
                            } else if (modelUpper === 'ANCHOR' || modelUpper === 'SORA' || modelUpper === 'PLOTLY') {
                              // Use update-text API for ANCHOR, SORA, and PLOTLY
                              try {
                                await updateSceneGenImageFlag(currentSceneIndex, {
                                  descriptionOverride: nextDescription
                                });
                              } catch (err) {
                                console.warn('update-text description failed:', err);
                                alert('Failed to save description. Please try again.');
                              }
                            } else {
                              // Default to update-text flow for any other models
                              try {
                                await updateSceneGenImageFlag(currentSceneIndex, {
                                  descriptionOverride: nextDescription
                                });
                              } catch (err) {
                                console.warn('description update failed:', err);
                                alert('Failed to save description. Please try again.');
                              }
                            }
                            // Close editing state after API completes
                              setIsDescriptionEditing(false);
                              setDescriptionSceneIndex(null);
                            setEditableSections([]);
                          } catch (err) {
                            console.error('Error saving description:', err);
                            alert('Failed to save description. Please try again.');
                          } finally {
                            setIsSavingDescription(false);
                          }
                        };
                        if (isEditingScene) {
                          return (
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative">
                              {/* Loading Overlay */}
                              {isSavingDescription && (
                                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
                                  <div className="bg-white shadow-lg rounded-lg px-6 py-4 text-center space-y-3">
                                    <div className="w-16 h-16 mx-auto">
                                      <video
                                        src={LoadingAnimationVideo}
                                        autoPlay
                                        loop
                                        muted
                                        playsInline
                                        className="w-full h-full object-contain"
                                      />
                                    </div>
                                    <div className="text-sm font-semibold text-[#13008B]">Updating Description</div>
                                    <p className="text-xs text-gray-500">Please wait...</p>
                                  </div>
                                </div>
                              )}
                              <h4 className="text-lg font-semibold text-gray-800 mb-4">Description</h4>
                              {!isInlineEditing && (
                              <p className="mt-2 text-xs text-gray-500">Double-click the description to edit.</p>
                            )}
                              <textarea
                                value={sceneDescription}
                                onChange={(e) => handleSceneUpdate(currentSceneIndex, 'description', e.target.value)}
                                className={`w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent !font-medium ${isSavingDescription ? 'opacity-60' : ''}`}
                                rows={4}
                                placeholder="Enter scene description"
                                readOnly={isSavingDescription}
                              />
                            </div>
                          );
                        }
                        return (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative">
                            {/* Loading Overlay */}
                            {isSavingDescription && (
                              <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
                                <div className="bg-white shadow-lg rounded-lg px-6 py-4 text-center space-y-3">
                                  <div className="relative w-16 h-16 mx-auto">
                                    <div className="absolute inset-0 rounded-full border-4 border-[#D8D3FF]"></div>
                                    <div className="absolute inset-2 rounded-full overflow-hidden">
                                      <img 
                                        src={LogoImage} 
                                        alt="Logo" 
                                        className="w-full h-full object-contain animate-spin"
                                        style={{ animationDuration: '2s' }}
                                      />
                                    </div>
                                  </div>
                                  <div className="text-sm font-semibold text-[#13008B]">Updating Description</div>
                                  <p className="text-xs text-gray-500">Please wait...</p>
                                </div>
                              </div>
                            )}
                            <div className="flex items-center justify-between mb-3">
                              <h4 className="text-lg font-semibold text-gray-800">Description</h4>
                              {isInlineEditing ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={cancelInlineEditing}
                                    disabled={isSavingDescription}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                    onClick={saveInlineDescription}
                                    disabled={isSavingDescription}
                                  >
                                    {isSavingDescription ? (
                                      <>
                                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>Saving...</span>
                                      </>
                                    ) : (
                                      'Save'
                                    )}
                                  </button>
                                </div>
                              ) : (
                                <p className="text-xs text-gray-500">Double-click the description to edit.</p>
                              )}
                            </div>
                            {isInlineEditing ? (
                              <div className="space-y-4">
                                {editableSections.map((section, index) => {
                                  if (section.type === 'section') {
                                    return (
                                      <div key={index} className="border border-gray-300 rounded-lg p-4 bg-white space-y-3">
                                        <div>
                                          <label className="text-xs font-semibold text-gray-700 uppercase tracking-wide">Title</label>
                                        </div>
                                        <input
                                          type="text"
                                          value={section.title || ''}
                                          onChange={(e) => updateSection(index, 'title', e.target.value)}
                                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm font-semibold text-gray-800"
                                          placeholder="Enter title"
                                          disabled={isSavingDescription}
                                        />
                                        <div>
                                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide mb-2">Description</label>
                            <textarea
                                            value={section.content || ''}
                                            onChange={(e) => updateSection(index, 'content', e.target.value)}
                                            className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm text-gray-600 resize-none"
                                            rows={3}
                                            placeholder="Enter description"
                                            disabled={isSavingDescription}
                                          />
                                        </div>
                                      </div>
                                    );
                                  } else {
                                    return (
                                      <div key={index} className="border border-gray-300 rounded-lg p-4 bg-white space-y-3">
                                        <div>
                                          <label className="block text-xs font-semibold text-gray-700 uppercase tracking-wide">Text Content</label>
                                        </div>
                                        <textarea
                                          value={section.content || ''}
                                          onChange={(e) => updateSection(index, 'content', e.target.value)}
                                          className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm text-gray-600 resize-none"
                                          rows={2}
                                          placeholder="Enter text content"
                                          disabled={isSavingDescription}
                                        />
                                      </div>
                                    );
                                  }
                                })}
                              </div>
                            ) : (
                              <div
                                onDoubleClick={startInlineEditing}
                                className={`w-full px-4 py-3 rounded-lg border border-gray-200 bg-white text-gray-600 min-h-[100px] cursor-pointer ${isSavingDescription ? 'opacity-60' : ''}`}
                              >
                                {sceneDescription ? (
                                  formatDescription(sceneDescription) || (
                                    <div className="text-sm text-gray-600 whitespace-pre-wrap">{sceneDescription}</div>
                                  )
                                ) : (
                                  <p className="text-sm text-gray-400 italic">Double-click to add description</p>
                                )}
                              </div>
                            )}
                            
                          </div>
                        );
                  })()}
                    
                      {(() => {
                        const scene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                        if (!scene) return null;
                        const titleLower = String(scene?.scene_title || scene?.sceneTitle || '').trim().toLowerCase();
                        if (titleLower === 'summary') return null;
                        const sceneModelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                        if (!(sceneModelUpper === 'SORA' || sceneModelUpper === 'ANCHOR' || sceneModelUpper === 'PLOTLY')) return null;
                        const items = Array.isArray(scene?.text_to_be_included) ? scene.text_to_be_included : [];
                        const isCurrentlyEditing = isTextToBeIncludedEditing && textToBeIncludedSceneIndex === currentSceneIndex;
                        const displayItems = isCurrentlyEditing ? pendingTextToBeIncluded : items;
                        const startEditing = () => {
                          setPendingTextToBeIncluded(items.slice());
                          setTextToBeIncludedSceneIndex(currentSceneIndex);
                          setIsTextToBeIncludedEditing(true);
                        };
                        const cancelEditing = () => {
                          setPendingTextToBeIncluded([]);
                          setIsTextToBeIncludedEditing(false);
                          setTextToBeIncludedSceneIndex(null);
                        };
                        const saveEditing = async () => {
                          try {
                            // Update local state first
                            handleSceneUpdate(currentSceneIndex, 'text_to_be_included', pendingTextToBeIncluded);
                            // Update via API
                            await updateTextToBeIncluded(currentSceneIndex, pendingTextToBeIncluded);
                            setIsTextToBeIncludedEditing(false);
                            setTextToBeIncludedSceneIndex(null);
                          } catch (e) {
                            console.error('Failed to save text to be included:', e);
                            // Keep editing mode open on error so user can retry
                          }
                        };
                        return (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-4">
                            <div className="flex items-center justify-between mb-2">
                              <label className="block text-sm font-medium text-gray-700">Text To Be Included</label>
                              {isCurrentlyEditing ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
                                    onClick={cancelEditing}
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    disabled={isUpdatingText}
                                    className={`px-3 py-1.5 rounded-lg text-sm ${
                                      isUpdatingText
                                        ? 'bg-blue-400 text-white cursor-not-allowed'
                                        : 'bg-[#13008B] text-white hover:bg-blue-800'
                                    }`}
                                    onClick={saveEditing}
                                  >
                                    {isUpdatingText ? 'Saving...' : 'Save'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                  onClick={startEditing}
                                >
                                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                  </svg>
                                  Edit
                                </button>
                              )}
                            </div>
                            {isCurrentlyEditing ? (
                              <div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {displayItems.map((t, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white border border-gray-300 text-sm"
                                    >
                                      {t}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const copy = displayItems.slice();
                                          copy.splice(i, 1);
                                          setPendingTextToBeIncluded(copy);
                                        }}
                                        className="text-gray-500 hover:text-red-600"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    value={textIncludeInput}
                                    onChange={(e) => setTextIncludeInput(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        const val = (textIncludeInput || '').trim();
                                        if (!val) return;
                                        setPendingTextToBeIncluded([...displayItems, val]);
                                        setTextIncludeInput('');
                                      }
                                    }}
                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                                    placeholder="Type text and press Enter to add"
                                  />
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const val = (textIncludeInput || '').trim();
                                      if (!val) return;
                                      setPendingTextToBeIncluded([...displayItems, val]);
                                      setTextIncludeInput('');
                                    }}
                                    className="px-3 py-2 rounded-md bg-[#13008B] text-white text-sm"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            ) : (
                              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 whitespace-pre-wrap">
                                {items.length ? items.join(', ') : '-'}
                              </div>
                            )}
                          </div>
                        );
                      })()}

                      {/* Text To Be Included */}
                      {(() => { const r = scriptRows?.[currentSceneIndex]; const titleLower = String(r?.scene_title || r?.sceneTitle || '').trim().toLowerCase(); if (titleLower === 'summary') return null; const m = String(r?.model||r?.mode||'').toUpperCase(); if (m==='SORA' || m==='ANCHOR' || m==='VEO3' || m==='PLOTLY') return null; return (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          {(() => {
                            const r = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                            const items = Array.isArray(r?.text_to_be_included) ? r.text_to_be_included : [];
                            const isCurrentlyEditing = isTextToBeIncludedEditing && textToBeIncludedSceneIndex === currentSceneIndex;
                            const displayItems = isCurrentlyEditing ? pendingTextToBeIncluded : items;
                            const startEditing = () => {
                              setPendingTextToBeIncluded(items.slice());
                              setTextToBeIncludedSceneIndex(currentSceneIndex);
                              setIsTextToBeIncludedEditing(true);
                            };
                            const cancelEditing = () => {
                              setPendingTextToBeIncluded([]);
                              setIsTextToBeIncludedEditing(false);
                              setTextToBeIncludedSceneIndex(null);
                            };
                            const saveEditing = async () => {
                              try {
                                // Update local state first
                                handleSceneUpdate(currentSceneIndex, 'text_to_be_included', pendingTextToBeIncluded);
                                // Update via API
                                await updateTextToBeIncluded(currentSceneIndex, pendingTextToBeIncluded);
                                setIsTextToBeIncludedEditing(false);
                                setTextToBeIncludedSceneIndex(null);
                              } catch (e) {
                                console.error('Failed to save text to be included:', e);
                                // Keep editing mode open on error so user can retry
                              }
                            };
                            const removeAt = (idx) => {
                              const copy = displayItems.slice();
                              copy.splice(idx, 1);
                              setPendingTextToBeIncluded(copy);
                            };
                            const addItem = () => {
                              const val = (textIncludeInput || '').trim();
                              if (!val) return;
                              setPendingTextToBeIncluded([...displayItems, val]);
                              setTextIncludeInput('');
                            };
                            return (
                              <>
                                <div className="flex items-center justify-between mb-2">
                                  <h4 className="text-lg font-semibold text-gray-800">Text To Be Included</h4>
                                  {isCurrentlyEditing ? (
                                    <div className="flex items-center gap-2">
                                      <button
                                        type="button"
                                        className="px-3 py-1.5 rounded-lg border border-gray-300 text-sm text-gray-700 hover:bg-gray-100"
                                        onClick={cancelEditing}
                                      >
                                        Cancel
                                      </button>
                                      <button
                                        type="button"
                                        className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800"
                                        onClick={saveEditing}
                                      >
                                        Save
                                      </button>
                                    </div>
                                  ) : (
                                    <button
                                      type="button"
                                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                      onClick={startEditing}
                                    >
                                      <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                      </svg>
                                      Edit
                                    </button>
                                  )}
                                </div>
                                {isCurrentlyEditing ? (
                                  <div>
                                    <div className="flex flex-wrap gap-2 mb-2">
                                      {displayItems.map((t, i) => (
                                        <span key={i} className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white border border-gray-300 text-sm">
                                          {t}
                                          <button type="button" onClick={() => removeAt(i)} className="text-gray-500 hover:text-red-600">×</button>
                                        </span>
                                      ))}
                                    </div>
                                    <input
                                      type="text"
                                      value={textIncludeInput}
                                      onChange={(e) => setTextIncludeInput(e.target.value)}
                                      onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addItem(); } }}
                                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                                      placeholder="Type text and press Enter to add"
                                    />
                                    <div className="mt-2 flex justify-end">
                                      <button type="button" onClick={addItem} className="px-3 py-1.5 rounded-md bg-[#13008B] text-white text-sm">Add</button>
                                    </div>
                                  </div>
                                ) : (
                                  <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 whitespace-pre-wrap">
                                    {items.length ? items.join(', ') : '-'}
                                  </div>
                                )}
                              </>
                            );
                          })()}
                        </div>
                      );})()}

                                           {/* Video Type Selection */}
                      {(() => { const r = scriptRows?.[currentSceneIndex]; const titleLower = String(r?.scene_title || r?.sceneTitle || '').trim().toLowerCase(); if (titleLower === 'summary') return null; const m = String(r?.model||r?.mode||'').toUpperCase(); if (m==='SORA' || m==='ANCHOR' || m==='VEO3' || m==='PLOTLY') return null; return (
                       <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                         <h4 className="text-lg font-semibold text-gray-800 mb-4">
                           {(() => {
                             const sceneModelUpper = String(scriptRows?.[currentSceneIndex]?.model || scriptRows?.[currentSceneIndex]?.mode || '').toUpperCase();
                             if (sceneModelUpper === 'VEO3') {
                               return 'Avatar';
                             } else if (sceneModelUpper === 'ANCHOR') {
                               return 'ANCHOR';
                             }
                             return 'Video Type';
                           })()}
                         </h4>
                        {(() => {
                          let vt = '';
                          try {
                            const sid = (typeof window !== 'undefined' && localStorage.getItem('session_id')) || '';
                            vt = ((typeof window !== 'undefined' && localStorage.getItem(`video_type_value:${sid}`)) || selectedVideoType || '').toLowerCase();
                          } catch (_) { /* noop */ }
                          const sceneModelUpper = String(scriptRows?.[currentSceneIndex]?.model || scriptRows?.[currentSceneIndex]?.mode || '').toUpperCase();
                          const showAvatarOption = !(sceneModelUpper === 'VEO3' || sceneModelUpper === 'ANCHOR');
                          const showInfographicOption = sceneModelUpper !== 'SORA';
                          const showFinancialOption = sceneModelUpper !== 'PLOTLY';
                          return (
                            <div className="flex flex-wrap gap-3">
                              {showAvatarOption && (
                                <button
                                  type="button"
                                  disabled={!(sceneModelUpper === 'VEO3' || sceneModelUpper === 'ANCHOR')}
                                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                    (sceneModelUpper === 'VEO3' || sceneModelUpper === 'ANCHOR')
                                      ? 'bg-[#13008B] text-white'
                                      : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                  }`}
                                >
                                  {sceneModelUpper === 'ANCHOR' ? 'ANCHOR' : 'Avatar'}
                                </button>
                              )}
                              {showInfographicOption && (
                                <button
                                  type="button"
                                  disabled={sceneModelUpper !== 'SORA'}
                                  className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                    sceneModelUpper === 'SORA'
                                      ? 'bg-[#13008B] text-white'
                                      : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                  }`}
                                >
                                  Infographic
                                </button>
                              )}
                              {showFinancialOption && (
                                <button
                                  type="button"
                                  disabled={sceneModelUpper !== 'PLOTLY'}
                                  className={`px-4 py-2 rounded-full text-sm font-medium ${
                                    sceneModelUpper === 'PLOTLY' ? 'bg-[#13008B] text-white' : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                  }`}
                                  title={sceneModelUpper === 'PLOTLY' ? 'Current model' : 'Switch model from menu to enable'}
                                >
                                  Financial
                                </button>
                              )}
                            </div>
                          );
                        })()}
                        {isSwitchingModel && (
                          <p className="text-sm text-gray-500 mt-2">Switching model…</p>
                        )}
                      </div>
                      );})()}
                      {(() => { 
                        const scene = scriptRows?.[currentSceneIndex]; 
                        const m = String(scene?.model||scene?.mode||'').toUpperCase(); 
                        const isAvatarish = (m==='VEO3' || m==='ANCHOR'); 
                        if (!isAvatarish) return null;
                        
                        // Get avatar_urls from script/user session data
                        const getAvatarUrlsFromSession = () => {
                          try {
                            // Check session data for avatar_urls
                            const sessionId = localStorage.getItem('session_id');
                            const token = localStorage.getItem('token');
                            
                            // First priority: Try to get from script scene data
                            const currentScene = Array.isArray(scriptRows) ? scriptRows[currentSceneIndex] : null;
                            if (currentScene && Array.isArray(currentScene.avatar_urls) && currentScene.avatar_urls.length > 0) {
                              return currentScene.avatar_urls.filter(url => typeof url === 'string' && url.trim()).map(url => url.trim());
                            }
                            
                            // Fallback: Try to get from avatar field
                            if (currentScene && typeof currentScene.avatar === 'string' && currentScene.avatar.trim()) {
                              return [currentScene.avatar.trim()];
                            }
                            
                            // Last resort: Try to get from cached brand assets
                            if (sessionId && token) {
                              const cacheKey = `brand_assets_images:${token}`;
                              const cached = localStorage.getItem(cacheKey);
                              if (cached) {
                                const data = JSON.parse(cached);
                                return Array.isArray(data?.avatar_urls) ? data.avatar_urls : [];
                              }
                            }
                          } catch(_) {}
                          return [];
                        };
                        
                        // Combine all avatar sources (API + session + preset defaults)
                        // Keep original order - don't prioritize selected avatars
                        const sessionAvatarUrls = getAvatarUrlsFromSession();
                        // Create a Set to track seen URLs to avoid duplicates
                        const seenUrls = new Set();
                        const allAvatars = [];
                        
                        // Add avatars in original order, skipping duplicates
                        const addIfNotSeen = (url) => {
                          const trimmed = typeof url === 'string' ? url.trim() : url;
                          if (trimmed && !seenUrls.has(trimmed)) {
                            seenUrls.add(trimmed);
                            allAvatars.push(trimmed);
                          }
                        };
                        
                        // Add preset avatars first (original order)
                        presetAvatars.forEach(addIfNotSeen);
                        // Add brand assets avatars (original order)
                        brandAssetsAvatars.forEach(addIfNotSeen);
                        // Add session avatars last (but only if not already in list)
                        sessionAvatarUrls.forEach(addIfNotSeen);
                        
                        // Get the current scene's avatar (what's actually saved for this scene)
                        const sceneAvatar = scene?.avatar || (Array.isArray(scene?.avatar_urls) && scene.avatar_urls.length > 0 ? scene.avatar_urls[0] : null);
                        const normalizedSceneAvatar = sceneAvatar ? String(sceneAvatar).trim() : null;
                        
                        // Normalize selectedAvatar for comparison (trim whitespace)
                        const normalizedSelectedAvatar = selectedAvatar ? String(selectedAvatar).trim() : null;
                        
                        // Helper function to compare avatar URLs (normalized)
                        // Check against the scene's actual avatar, not just selectedAvatar state
                        const isAvatarSelected = (url) => {
                          if (!url) return false;
                          const normalizedUrl = String(url).trim();
                          // If selectedAvatar exists and matches, it's selected (user just clicked it)
                          if (normalizedSelectedAvatar && normalizedSelectedAvatar === normalizedUrl) {
                            return true;
                          }
                          // Otherwise, check if it matches the scene's saved avatar
                          if (normalizedSceneAvatar && normalizedSceneAvatar === normalizedUrl) {
                            return true;
                          }
                          return false;
                        };
                        
                        // Show save button when any avatar is selected (user clicked on one)
                        const shouldShowSaveButton = !!normalizedSelectedAvatar;
                        // Use selectedAvatar for saving
                        const avatarToSave = normalizedSelectedAvatar;
                        
                        return (
                       <>
                       <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                         <div className="flex items-center justify-between mb-4">
                           <h4 className="text-lg font-semibold text-gray-800">Select an Avatar</h4>
                           {shouldShowSaveButton && (
                             <button
                               type="button"
                               className="px-3 py-1.5 rounded-md bg-[#13008B] text-white text-xs font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                               disabled={isSavingAvatar || !avatarToSave}
                               onClick={async () => {
                                 try {
                                   if (!Array.isArray(scriptRows) || !scriptRows[currentSceneIndex] || !avatarToSave) return;
                                   setIsSavingAvatar(true);
                                   
                                   // Update local scriptRows state
                                   const rows = [...scriptRows];
                                   const scene = { ...rows[currentSceneIndex] };
                                   scene.avatar = avatarToSave;
                                   // Also update avatar_urls array for ANCHOR/VEO3
                                   if (Array.isArray(scene.avatar_urls)) {
                                     scene.avatar_urls = [avatarToSave];
                                   } else {
                                     scene.avatar_urls = [avatarToSave];
                                   }
                                   rows[currentSceneIndex] = scene;
                                   setScriptRows(rows);
                                   
                                   // Call API to save avatar
                                   await updateSceneGenImageFlag(currentSceneIndex, { avatarUrl: avatarToSave });
                                   // Check if the API call was successful (status 200)
                                   // The updateSceneGenImageFlag function will throw if not ok
                                   setIsSavingAvatar(false);
                                 } catch (err) {
                                   console.error('Failed to save avatar:', err);
                                   alert('Failed to save avatar. Please try again.');
                                   setIsSavingAvatar(false);
                                 }
                               }}
                             >
                               {isSavingAvatar ? (
                                 <>
                                   <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                   <span>Saving...</span>
                                 </>
                               ) : (
                                 'Save'
                               )}
                             </button>
                           )}
                         </div>
                         {isLoadingAvatars ? (
                           <div className="flex items-center justify-center py-8">
                             <div className="w-8 h-8 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                           </div>
                         ) : (
                           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-4">
                             {allAvatars.length === 0 ? (
                               <div className="col-span-full text-center py-8 text-gray-500">
                                 No avatars available. Click "Upload Avatar" to add one.
                               </div>
                             ) : (
                               allAvatars.map((avatarUrl, index) => {
                                 const trimmedUrl = typeof avatarUrl === 'string' ? avatarUrl.trim() : avatarUrl;
                                 const isSelected = isAvatarSelected(trimmedUrl);
                                 return (
                                 <button
                                   type="button"
                                   key={index}
                                  onClick={() => {
                                     try {
                                       // Only update selectedAvatar state, don't modify scriptRows or call API
                                       setSelectedAvatar(trimmedUrl);
                                     } catch (_) { /* noop */ }
                                   }}
                                   className={`w-20 h-20 rounded-lg border-2 overflow-hidden transition-colors ${
                                     isSelected ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-300 hover:border-[#13008B]'
                                   }`}
                                   title={`Avatar ${index + 1}`}
                                 >
                                   <img src={trimmedUrl} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                                 </button>
                               );
                               })
                             )}
                             <button
                               type="button"
                               onClick={() => setShowAvatarUploadPopup(true)}
                               className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#13008B] transition-colors"
                               title="Upload Avatar"
                             >
                               <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                               </svg>
                             </button>
                           </div>
                         )}
                      </div>
                      </>
                        );
                      })()}
                      {(() => {
                        const scene = Array.isArray(scriptRows) ? scriptRows[currentSceneIndex] : null;
                        const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                        const titleLower = String(scene?.scene_title || scene?.sceneTitle || '').trim().toLowerCase();
                        const isSummary = titleLower === 'summary';
                        // Show for summary scripts OR for ANCHOR/VEO3/SORA/PLOTLY models
                        if (!isSummary && modelUpper !== 'ANCHOR' && modelUpper !== 'VEO3' && modelUpper !== 'SORA' && modelUpper !== 'PLOTLY') return null;
                        const genVal = (typeof scene?.gen_image === 'boolean') ? scene.gen_image : false;
                        // In Script Editor, keep toggle fully visible even if not actively editing
                        // For summary scripts, don't show the toggle
                        const disabled = !isEditingScene;
                        const base = `inline-flex items-center gap-3 px-2 py-1 rounded-full transition-colors ${genVal ? 'bg-green-100' : 'bg-gray-100'}`;
                        const cls = disabled ? base : base;
                        const onToggle = async () => {
                          if (disabled) return;
                          const next = !genVal;
                          try { handleSceneUpdate(currentSceneIndex, 'gen_image', next); await updateSceneGenImageFlag(currentSceneIndex, { genImage: next }); } catch(_) {}
                        };
                        const refs = (() => {
                          const urls = [];
                          
                          // First try background_image array (primary source for background images)
                          if (Array.isArray(scene?.background_image) && scene.background_image.length > 0) {
                            scene.background_image.forEach(item => {
                              let url = '';
                              if (typeof item === 'string' && item.trim()) {
                                url = item.trim();
                              } else if (item && typeof item === 'object') {
                                // Try all possible URL fields
                                url = item?.imageurl || item?.imageUrl || item?.image_url || item?.url || item?.src || item?.link || item?.image || '';
                                if (url) url = url.trim();
                              }
                              if (url && typeof url === 'string' && url.length > 0 && !urls.includes(url)) {
                                urls.push(url);
                              }
                            });
                          }
                          
                          // Fallback to ref_image (only if background_image is empty)
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
                          
                          // Fallback to background field (only if still empty)
                          if (urls.length === 0 && typeof scene?.background === 'string' && scene.background.trim()) {
                            const trimmed = scene.background.trim();
                            if (!urls.includes(trimmed)) urls.push(trimmed);
                          }
                          
                          // Log for debugging
                          if (urls.length > 0) {
                            console.log('[Background Images] Extracted background images:', {
                              count: urls.length,
                              urls: urls,
                              background_image: scene?.background_image,
                              ref_image: scene?.ref_image
                            });
                          }
                          
                          return urls;
                        })();
                        return (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-gray-800">Select a Background Image</h4>
                              {!isSummary && (
                                <button type="button" onClick={onToggle} className={cls} title="Toggle Generate Image" disabled={disabled}>
                                  <span className="text-sm text-gray-800">{genVal ? 'True' : 'False'}</span>
                                  <span className={`relative inline-flex w-10 h-5 rounded-full ${genVal ? 'bg-green-500' : 'bg-gray-400'}`}>
                                    <span className={`absolute top-0.5 ${genVal ? 'right-0.5' : 'left-0.5'} w-4 h-4 bg-white rounded-full transition-all`} />
                                  </span>
                                </button>
                              )}
                            </div>
                            {(() => {
                              // Default behavior: show refs
                              return (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-4 mb-4">
                                  {refs.length === 0 ? (
                                    <p className="text-sm text-gray-500 col-span-4">No background images yet. Add one below.</p>
                                  ) : (
                                    refs.map((url, idx) => (
                                      <div key={idx} className={`group relative w-24 h-24 rounded-lg border-2 ${ (selectedRefImages || []).includes(url) ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-300' } overflow-visible transition-colors`} title={url} onClick={async (e) => {
                                        e.stopPropagation();
                                        try {
                                          const isSora = modelUpper === 'SORA';
                                          const isAnchor = modelUpper === 'ANCHOR';
                                          
                                          if (isSora) {
                                            // For SORA, allow up to 2 template selections
                                            const currentSelected = selectedRefImages || [];
                                            const exists = currentSelected.includes(url);
                                            let newSelected;
                                            if (exists) {
                                              newSelected = currentSelected.filter(u => u !== url);
                                            } else {
                                              const next = [...currentSelected, url];
                                              newSelected = next.length > 2 ? next.slice(-2) : next;
                                            }
                                            setSelectedRefImages(newSelected);
                                            if (Array.isArray(scriptRows) && scriptRows[currentSceneIndex]) {
                                              const rows = [...scriptRows]; const s = { ...rows[currentSceneIndex] };
                                              s.ref_image = newSelected;
                                              rows[currentSceneIndex] = s; setScriptRows(rows);
                                              try { 
                                                const backgroundImageArray = newSelected.map((u) => ({
                                                  image_url: u,
                                                  template_id: ''
                                                }));
                                                await updateSceneGenImageFlag(currentSceneIndex, { 
                                                  refImagesOverride: newSelected,
                                                  backgroundImageArrayOverride: backgroundImageArray.length > 0 ? backgroundImageArray : undefined
                                                }); 
                                              } catch(_) {}
                                            }
                                          } else {
                                            // For ANCHOR/VEO3/PLOTLY, allow up to 2 background images
                                            const currentSelected = selectedRefImages || [];
                                            const exists = currentSelected.includes(url);
                                            let newSelected;
                                            if (exists) {
                                              newSelected = currentSelected.filter(u => u !== url);
                                            } else {
                                              const next = [...currentSelected, url];
                                              newSelected = next.length > 2 ? next.slice(-2) : next;
                                            }
                                            setSelectedRefImages(newSelected);
                                            if (Array.isArray(scriptRows) && scriptRows[currentSceneIndex]) {
                                              const rows = [...scriptRows]; const s = { ...rows[currentSceneIndex] };
                                              // Store first image in background field for backward compatibility
                                              s.background = newSelected[0] || '';
                                              // Store all images in background_image array
                                              s.background_image = newSelected.length > 0 ? newSelected.map(u => ({
                                                template_id: '',
                                                image_url: u
                                              })) : [];
                                              rows[currentSceneIndex] = s; setScriptRows(rows);
                                              try {
                                                const backgroundImageArray = newSelected.map((u) => ({
                                                  image_url: u,
                                                  template_id: ''
                                                }));
                                                await updateSceneGenImageFlag(currentSceneIndex, { 
                                                  refImagesOverride: [],
                                                  backgroundImageArrayOverride: backgroundImageArray.length > 0 ? backgroundImageArray : undefined
                                                });
                                              } catch(_) {}
                                            }
                                          }
                                        } catch(_) {}
                                      }}>
                                        <img src={url} alt={`BG ${idx+1}`} className="w-full h-full object-cover" />
                                        <button className="pointer-events-auto absolute inset-0 m-auto w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity" title="View full size" onClick={(e)=>{ e.stopPropagation(); try { openLightbox(url);} catch(_){} }}>
                                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-4.553a2.121 2.121 0 10-3-3L12 7M9 14l-4.553 4.553a2.121 2.121 0 103 3L12 17" /></svg>
                                        </button>
                                      </div>
                                    ))
                                  )}
                                </div>
                              );
                            })()}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const token = localStorage.getItem('token');
                                  if (!token) { alert('Missing user'); return; }
                                  try {
                                    setAssetsTab('preset_templates');
                                    setShowAssetsModal(true);
                                    setIsLoadingTemplates(true);
                                    const cacheKey = `brand_assets_images:${token}`; const cached = localStorage.getItem(cacheKey);
                                    if (cached) {
                                      const data = JSON.parse(cached);
                                      const normalized = normalizeBrandAssetsResponse(data);
                                      setAssetsData(normalized);
                                    } else {
                                      setAssetsData({ logos: [], icons: [], uploaded_images: [], templates: [], documents_images: [] });
                                    }
                                  } catch(_) { setAssetsData({ logos: [], icons: [], uploaded_images: [], templates: [], documents_images: [] }); }
                                  // Note: isLoadingTemplates will be set to false by the useEffect that loads aspect ratio
                                }}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
                                title="Choose from templates"
                              >
                                <File className="w-4 h-4" /> Choose From Template
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                      {(() => {
                        // Presenter Options for avatar models (VEO3 / ANCHOR)
                        // Only show in contexts that explicitly enable it (Script Editor)
                        if (!enablePresenterOptions) return null;
                        const scene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                        const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                        // Show presenter options in Script Editor for avatar models only
                        if (modelUpper !== 'VEO3' && modelUpper !== 'ANCHOR') return null;
                        // Resolve current selection (prefer scene, fallback to saved guideline choice)
                        let current = (scene?.presenter_options && scene.presenter_options.option) || '';
                        try {
                          if (!current) {
                            const sid = (typeof window !== 'undefined' && localStorage.getItem('session_id')) || '';
                            const raw = (sid && localStorage.getItem(`presenter_option:${sid}`)) || localStorage.getItem('presenter_option');
                            if (raw) {
                              const obj = JSON.parse(raw);
                              if (obj && obj.option) current = obj.option;
                            }
                          }
                        } catch (_) { /* noop */ }
                        // Replace dropdown with Guidelines-like selector
                        const optionsList = Array.isArray(presenterPresets[modelUpper])
                          ? presenterPresets[modelUpper]
                          : [];
                        const selectedPreset =
                          optionsList.find(
                            (opt) =>
                              String(opt?.preset_id || opt?.option || '') ===
                              String(selectedPresenterPreset || '')
                          ) || null;
                        const savedPresenterLabel = scene?.presenter_options?.option || '';
                        const canSave =
                          presenterPresetDirty &&
                          !!selectedPresenterPreset &&
                          !isLoadingPresenterPresets;
                        return (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <div className="flex flex-wrap items-center justify-between gap-3">
                              <div>
                                <h4 className="text-lg font-semibold text-gray-800">Scene Settings</h4>
                                {/* Removed current preset label per request */}
                                {presenterPresetDirty && (
                                  <p className="text-xs text-amber-600">You have unsaved changes.</p>
                                )}
                              </div>
                              {canSave && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (!selectedPresenterPreset) return;
                                    setPendingPresenterPresetId(String(selectedPresenterPreset));
                                    setPendingPresenterPresetLabel(
                                      selectedPreset?.option || ''
                                    );
                                    setShowPresenterSaveConfirm(true);
                                  }}
                                  className="inline-flex items-center gap-2 rounded-lg bg-[#13008B] px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
                                >
                                  Save
                                </button>
                              )}
                            </div>
                            <div className="mt-3">
                              {isLoadingPresenterPresets ? (
                                <div className="flex items-center gap-2 text-sm text-gray-500">
                                  <span className="inline-flex h-4 w-4 animate-spin rounded-full border-2 border-[#13008B] border-t-transparent" />
                                  Loading presenter presets…
                                </div>
                              ) : optionsList.length === 0 ? (
                                <div className="rounded border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600">
                                  No presenter presets available for this configuration.
                                </div>
                              ) : (
                                <div className="grid grid-cols-5 gap-3 pb-2">
                                  {optionsList.map((po) => {
                                    const value =
                                      po?.preset_id != null
                                        ? String(po.preset_id)
                                        : String(po.option || '');
                                    const isSelected = String(selectedPresenterPreset || '') === value;
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
                                      <div key={value} className="relative">
                                        <button
                                          type="button"
                                          onClick={() => handlePresenterPresetChange(value)}
                                          className={`relative flex flex-col overflow-hidden rounded-lg border transition-shadow w-full ${
                                            isSelected
                                              ? 'border-[#13008B] ring-2 ring-[#13008B] shadow-lg'
                                              : 'border-gray-200 shadow-sm hover:border-[#13008B] hover:shadow'
                                          }`}
                                        >
                                          {isSelected && (
                                            <span className="absolute right-3 top-3 rounded-full bg-[#13008B] px-2 py-0.5 text-xs font-medium text-white z-10">
                                              Selected
                                            </span>
                                          )}
                                          <div className="flex-1 bg-black/5 aspect-video">
                                            {previewUrl ? (
                                              isVideo ? (
                                                <video
                                                  className="h-full w-full object-cover"
                                                  muted
                                                  playsInline
                                                  loop
                                                >
                                                  <source src={previewUrl} type="video/mp4" />
                                                </video>
                                              ) : isImage ? (
                                                <img
                                                  src={previewUrl}
                                                  alt={`${po.option} preview`}
                                                  className="h-full w-full object-cover"
                                                />
                                              ) : (
                                                <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
                                                  Preview available
                                                </div>
                                              )
                                            ) : (
                                              <div className="flex h-full w-full items-center justify-center bg-gray-100 text-sm text-gray-500">
                                                No preview available
                                              </div>
                                            )}
                                          </div>
                                          <div className="flex items-center px-3 py-2 text-left">
                                            <span className="text-sm font-semibold text-gray-800">
                                              {po.option}
                                            </span>
                                          </div>
                                        </button>
                                      </div>
                                    );
                                  })}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const scene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                                      const sceneDescription = scene?.description || scene?.scene_title || '';
                                      setCustomDescDescription(sceneDescription);
                                      setCustomDescTextarea('');
                                      setShowCustomDescModal(true);
                                    }}
                                    className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 bg-white hover:border-[#13008B] hover:bg-gray-50 transition-colors h-full"
                                    title="Custom Description"
                                  >
                                    <Upload className="w-8 h-8 text-gray-400 mb-1" />
                                    <span className="text-2xl font-semibold text-gray-400">+</span>
                                  </button>
                                </div>
                              )}
                            </div>
                            {presenterPresetsError && (
                              <div className="mt-2 rounded border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                                {presenterPresetsError}
                              </div>
                            )}
                          </div>
                        );
                      })()}
                     
                     {(() => {
                        const scene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                        if (!scene) return null;
                        const sceneModelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                        const isSora = sceneModelUpper === 'SORA';
                        const isAnchor = sceneModelUpper === 'ANCHOR';
                        const isPlotly = sceneModelUpper === 'PLOTLY';
                        const isVeo = sceneModelUpper === 'VEO3';
                        if (!(isSora || isAnchor || isPlotly || isVeo)) return null;
                        const colors = Array.isArray(scene?.colors)
                          ? scene.colors
                          : (typeof scene?.colors === 'string' && scene.colors.trim()
                            ? scene.colors.split(',').map((s) => s.trim()).filter(Boolean)
                            : []);
                        const fontSizeVal = Number(scene?.font_size ?? scene?.fontsize ?? scene?.fontSize ?? 16) || 16;
                        const fontStyleVal = scene?.font_style ?? scene?.fontStyle ?? '';
                        const showFontControls = true;
                        const fontOptions = (() => {
                          const opts = Array.isArray(combinedFontOptions) ? [...combinedFontOptions] : [];
                          if (fontStyleVal && !opts.includes(fontStyleVal)) opts.unshift(fontStyleVal);
                          return opts;
                        })();
                        const gridClass = showRichTextEditor
                          ? (showFontControls ? 'grid grid-cols-1 gap-4' : 'grid grid-cols-1 gap-4')
                          : (showFontControls ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'grid grid-cols-1 gap-4');
                        const canEditStyles = isEditingAdvancedStyles;
                        const nudgeFontSize = (delta) => {
                          if (!canEditStyles) return;
                          const current = Number.isFinite(Number(fontSizeVal)) ? Number(fontSizeVal) : 16;
                          const clamped = Math.min(150, Math.max(8, current + delta));
                          handleSceneUpdate(currentSceneIndex, 'font_size', clamped);
                        };
                        return (
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
                              <div className={`mt-3 rounded-lg border border-gray-200 bg-gray-50 transition-all duration-300 ${
                                showRichTextEditor ? 'flex flex-col md:flex-row gap-4' : ''
                              }`}>
                                <div className={`space-y-4 px-4 py-4 transition-all duration-300 ${
                                  showRichTextEditor ? 'w-full md:w-1/2' : 'w-full'
                                }`}>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-semibold text-gray-700">Style Controls</p>
                                  <div className="flex items-center gap-2">
                                    {!showRichTextEditor && (
                                      <button
                                        type="button"
                                        onClick={() => setShowRichTextEditor(true)}
                                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                      >
                                        Open Editor
                                      </button>
                                    )}
                                    {isEditingAdvancedStyles ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={saveAdvancedStyles}
                                          disabled={isSavingAdvancedStyles}
                                          className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white ${
                                            isSavingAdvancedStyles ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                          }`}
                                        >
                                          {isSavingAdvancedStyles ? 'Saving…' : 'Save'}
                                        </button>
                                        <button
                                          type="button"
                                          onClick={cancelAdvancedStylesEdit}
                                          disabled={isSavingAdvancedStyles}
                                          className="text-xs font-medium text-gray-600 hover:text-gray-900"
                                        >
                                          Cancel
                                        </button>
                                      </>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={beginAdvancedStylesEdit}
                                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                      >
                                        <CiPen className="w-3 h-3" />
                                        <span>Edit</span>
                                      </button>
                                    )}
                                  </div>
                                </div>
                                <div className={gridClass}>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Colors</label>
                                    <div className="flex flex-wrap gap-2">
                                      {(colors || []).map((c, i) => (
                                        <button
                                          key={`${c}-${i}`}
                                          type="button"
                                          disabled={!canEditStyles}
                                          onClick={() => {
                                            if (canEditStyles) {
                                              const next = colors.filter((_, idx) => idx !== i);
                                              handleSceneUpdate(currentSceneIndex, 'colors', next);
                                            }
                                          }}
                                          className={`w-7 h-7 rounded border ${canEditStyles ? 'border-gray-300' : 'border-gray-200 cursor-not-allowed opacity-60'}`}
                                          style={{ background: c }}
                                          title={canEditStyles ? `Remove ${c}` : c}
                                        />
                                      ))}
                                      {(!colors || colors.length === 0) && (
                                        <span className="text-sm text-gray-500">-</span>
                                      )}
                                    </div>
                                    {isEditingAdvancedStyles && (
                                      <div className="flex items-center gap-2 mt-2">
                                        <input
                                          type="text"
                                          placeholder="#000000"
                                          disabled={!canEditStyles}
                                          className={`flex-1 px-3 py-2 border rounded-lg ${canEditStyles ? 'border-gray-300' : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'}`}
                                          onKeyDown={(e) => {
                                            if (e.key === 'Enter') {
                                              const val = (e.currentTarget.value || '').trim();
                                              if (val) {
                                                const next = Array.from(new Set([...(colors || []), val]));
                                                handleSceneUpdate(currentSceneIndex, 'colors', next);
                                                e.currentTarget.value = '';
                                              }
                                            }
                                          }}
                                        />
                                        <span className="text-xs text-gray-500">Press Enter to add</span>
                                      </div>
                                    )}
                                  </div>
                                  {showFontControls && (
                                    <>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Font Size</label>
                                        <div className="flex flex-wrap items-center gap-3">
                                          <button
                                            type="button"
                                            onClick={() => nudgeFontSize(-1)}
                                            disabled={!canEditStyles}
                                            className={`h-9 w-9 rounded-full border text-lg font-semibold ${
                                              canEditStyles ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                          >
                                            −
                                          </button>
                                          <input
                                            type="range"
                                            min={8}
                                            max={72}
                                            step={1}
                                            value={fontSizeVal}
                                          onChange={(e) =>
                                            handleSceneUpdate(currentSceneIndex, 'font_size', Number(e.target.value))
                                          }
                                          className="flex-1"
                                          disabled={!canEditStyles}
                                          />
                                          <input
                                            type="number"
                                            min={8}
                                            max={150}
                                            step={1}
                                            value={fontSizeVal}
                                            onChange={(e) => {
                                              const next = Number(e.target.value);
                                              if (Number.isFinite(next)) {
                                                handleSceneUpdate(currentSceneIndex, 'font_size', next);
                                              }
                                            }}
                                            disabled={!canEditStyles}
                                            className={`w-20 rounded-md border px-2 py-1 text-sm ${
                                              canEditStyles ? 'border-gray-300' : 'border-gray-200 bg-gray-100 text-gray-500 cursor-not-allowed'
                                            }`}
                                          />
                                          <span className="inline-block text-sm text-gray-700">px</span>
                                          <button
                                            type="button"
                                            onClick={() => nudgeFontSize(1)}
                                            disabled={!canEditStyles}
                                            className={`h-9 w-9 rounded-full border text-lg font-semibold ${
                                              canEditStyles ? 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50' : 'border-gray-200 bg-gray-100 text-gray-400 cursor-not-allowed'
                                            }`}
                                          >
                                            +
                                          </button>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Font Style</label>
                                        <select
                                          value={fontStyleVal}
                                          onChange={(e) => handleSceneUpdate(currentSceneIndex, 'font_style', e.target.value)}
                                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent ${
                                            canEditStyles ? 'border-gray-300' : 'border-gray-200 bg-white text-gray-500 cursor-not-allowed'
                                          }`}
                                          disabled={!canEditStyles}
                                        >
                                          <option value="">Select font</option>
                                          {fontOptions.length > 0 ? (
                                            fontOptions.map((f) => (
                                              <option key={f} value={f} style={{ fontFamily: f }}>
                                                {f}
                                              </option>
                                            ))
                                          ) : (
                                            <option value="" disabled>
                                              No fonts found in Brand Identity
                                            </option>
                                          )}
                                        </select>
                                        {canEditStyles && (
                                          <input
                                            type="text"
                                            value={fontStyleVal}
                                            onChange={(e) => handleSceneUpdate(currentSceneIndex, 'font_style', e.target.value)}
                                            className="mt-2 w-full rounded-md border border-gray-300 px-3 py-2 text-sm"
                                            placeholder="Enter custom font name"
                                          />
                                        )}
                                      </div>
                                    </>
                                  )}
                                </div>
                                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Font Size</p>
                                    <p className="mt-1 text-sm text-gray-800">{fontSizeVal ? `${fontSizeVal}px` : '-'}</p>
                                  </div>
                                  <div className="rounded-lg border border-gray-200 bg-white px-3 py-2">
                                    <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Font Style</p>
                                    <p className="mt-1 text-sm text-gray-800 break-words">{fontStyleVal || '-'}</p>
                                  </div>
                                </div>
                                {/* Rich Text Editor Section */}
                                {showRichTextEditor && (
                                  <div className={`w-full md:w-1/2 px-4 py-4 space-y-4 transition-all duration-300 ${showRichTextEditor ? 'opacity-100' : 'opacity-0 hidden'}`}>
                                    <div className="flex items-center justify-between mb-3">
                                      <h5 className="text-sm font-semibold text-gray-800">Shape & Text Editor</h5>
                                      <button
                                        type="button"
                                        onClick={() => setShowRichTextEditor(false)}
                                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                      >
                                        Close Editor
                                      </button>
                                    </div>
                                      {/* Shape Selection */}
                                      <div>
                                        <label className="block text-xs font-semibold text-gray-700 mb-2">ADD SHAPE</label>
                                        <div className="grid grid-cols-5 gap-2">
                                          {['rectangle', 'circle', 'triangle', 'line', 'arrow', 'star'].map((shape) => (
                                            <button
                                              key={shape}
                                              type="button"
                                              onClick={() => setSelectedShape(shape)}
                                              className={`h-16 rounded-lg border-2 transition-all ${
                                                selectedShape === shape
                                                  ? 'border-[#13008B] bg-[#13008B] text-white'
                                                  : 'border-gray-200 bg-white hover:border-gray-300'
                                              }`}
                                            >
                                              {shape === 'rectangle' && <div className="w-8 h-8 mx-auto border-2 border-current" />}
                                              {shape === 'circle' && <div className="w-8 h-8 mx-auto rounded-full border-2 border-current" />}
                                              {shape === 'triangle' && (
                                                <div className="w-0 h-0 mx-auto border-l-[8px] border-r-[8px] border-b-[14px] border-l-transparent border-r-transparent border-b-current" />
                                              )}
                                              {shape === 'line' && <div className="w-8 h-0.5 mx-auto bg-current" />}
                                              {shape === 'arrow' && (
                                                <div className="mx-auto">
                                                  <div className="w-6 h-0.5 bg-current" />
                                                  <div className="w-2 h-2 border-t-2 border-r-2 border-current transform rotate-45 -mt-1 ml-4" />
                                                </div>
                                              )}
                                              {shape === 'star' && (
                                                <svg className="w-6 h-6 mx-auto" fill="currentColor" viewBox="0 0 24 24">
                                                  <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                                                </svg>
                                              )}
                                            </button>
                                          ))}
                                        </div>
                                      </div>
                                      {/* Rich Text Editor Toolbar */}
                                      <div className="bg-white rounded-lg border border-gray-200 p-2 shadow-sm">
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {/* Font Family */}
                                          <select
                                            value={textEditorFormat.fontFamily}
                                            onChange={(e) => setTextEditorFormat((prev) => ({ ...prev, fontFamily: e.target.value }))}
                                            className="px-2 py-1 text-xs border border-gray-300 rounded"
                                          >
                                            {combinedFontOptions.map((font) => (
                                              <option key={font} value={font} style={{ fontFamily: font }}>
                                                {font}
                                              </option>
                                            ))}
                                          </select>
                                          {/* Font Size */}
                                          <select
                                            value={textEditorFormat.fontSize}
                                            onChange={(e) => setTextEditorFormat((prev) => ({ ...prev, fontSize: Number(e.target.value) }))}
                                            className="px-2 py-1 text-xs border border-gray-300 rounded"
                                          >
                                            {[8, 10, 12, 14, 16, 18, 20, 24, 28, 32, 36, 48, 64, 72].map((size) => (
                                              <option key={size} value={size}>
                                                {size}
                                              </option>
                                            ))}
                                          </select>
                                          {/* Formatting Buttons */}
                                          <div className="flex items-center gap-1 border-l border-gray-300 pl-2">
                                            <button
                                              type="button"
                                              onClick={() => setTextEditorFormat((prev) => ({ ...prev, bold: !prev.bold }))}
                                              className={`px-2 py-1 rounded text-xs font-bold ${textEditorFormat.bold ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                                            >
                                              B
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setTextEditorFormat((prev) => ({ ...prev, italic: !prev.italic }))}
                                              className={`px-2 py-1 rounded text-xs italic ${textEditorFormat.italic ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                                            >
                                              I
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setTextEditorFormat((prev) => ({ ...prev, underline: !prev.underline }))}
                                              className={`px-2 py-1 rounded text-xs underline ${textEditorFormat.underline ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                                            >
                                              U
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setTextEditorFormat((prev) => ({ ...prev, strikethrough: !prev.strikethrough }))}
                                              className={`px-2 py-1 rounded text-xs line-through ${textEditorFormat.strikethrough ? 'bg-gray-200' : 'hover:bg-gray-100'}`}
                                            >
                                              S
                                            </button>
                                          </div>
                                          {/* Alignment */}
                                          <div className="flex items-center gap-1 border-l border-gray-300 pl-2">
                                            <button
                                              type="button"
                                              onClick={() => setTextEditorFormat((prev) => ({ ...prev, align: 'left' }))}
                                              className={`px-2 py-1 rounded ${textEditorFormat.align === 'left' ? 'bg-[#13008B] text-white' : 'hover:bg-gray-100'}`}
                                            >
                                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M3 6h18M3 12h12M3 18h18" />
                                              </svg>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setTextEditorFormat((prev) => ({ ...prev, align: 'center' }))}
                                              className={`px-2 py-1 rounded ${textEditorFormat.align === 'center' ? 'bg-[#13008B] text-white' : 'hover:bg-gray-100'}`}
                                            >
                                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M3 6h18M6 12h12M3 18h18" />
                                              </svg>
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => setTextEditorFormat((prev) => ({ ...prev, align: 'right' }))}
                                              className={`px-2 py-1 rounded ${textEditorFormat.align === 'right' ? 'bg-[#13008B] text-white' : 'hover:bg-gray-100'}`}
                                            >
                                              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                                <path d="M3 6h18M9 12h12M3 18h18" />
                                              </svg>
                                            </button>
                                          </div>
                                          {/* Color Picker */}
                                          <div className="flex items-center gap-1 border-l border-gray-300 pl-2">
                                            <input
                                              type="color"
                                              value={textEditorFormat.color}
                                              onChange={(e) => setTextEditorFormat((prev) => ({ ...prev, color: e.target.value }))}
                                              className="w-8 h-8 rounded border border-gray-300 cursor-pointer"
                                            />
                                          </div>
                                          {/* More & Delete */}
                                          <div className="flex items-center gap-1 border-l border-gray-300 pl-2 ml-auto">
                                            <button
                                              type="button"
                                              className="px-2 py-1 rounded text-xs hover:bg-gray-100"
                                            >
                                              More...
                                            </button>
                                            <button
                                              type="button"
                                              className="px-2 py-1 rounded text-xs bg-red-500 text-white hover:bg-red-600"
                                            >
                                              <Trash2 className="w-4 h-4" />
                                            </button>
                                          </div>
                                        </div>
                                      </div>
                                      {/* Text Editor Content Area */}
                                      <div className="bg-white rounded-lg border border-gray-200 p-4 min-h-[200px]">
                                        <textarea
                                          value={textEditorContent}
                                          onChange={(e) => setTextEditorContent(e.target.value)}
                                          placeholder="Enter your text here..."
                                          className="w-full min-h-[150px] resize-none border-none outline-none"
                                          style={{
                                            fontFamily: textEditorFormat.fontFamily,
                                            fontSize: `${textEditorFormat.fontSize}px`,
                                            fontWeight: textEditorFormat.bold ? 'bold' : 'normal',
                                            fontStyle: textEditorFormat.italic ? 'italic' : 'normal',
                                            textDecoration: textEditorFormat.underline
                                              ? 'underline'
                                              : textEditorFormat.strikethrough
                                              ? 'line-through'
                                              : 'none',
                                            textAlign: textEditorFormat.align,
                                            color: textEditorFormat.color
                                          }}
                                        />
                                    </div>
                                  </div>
                                )}
                                {isAnchor &&
                                  scene?.anchor_prompt_template &&
                                  typeof scene.anchor_prompt_template === 'object' &&
                                  Object.keys(scene.anchor_prompt_template).length > 0 && (
                                    <div className="rounded-lg border border-gray-200 bg-white p-4">
                                      <div className="mb-3 flex items-center justify-between">
                                        <h5 className="text-sm font-semibold text-gray-800">Scene Data</h5>
                                        <div className="flex items-center gap-2">
                                          {isEditingAnchorPrompt ? (
                                            <>
                                              <button
                                                type="button"
                                                onClick={saveAnchorPromptTemplate}
                                                disabled={isSavingAnchorPrompt}
                                                className={`inline-flex items-center gap-1 rounded-md px-3 py-1.5 text-xs font-semibold text-white ${
                                                  isSavingAnchorPrompt ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                                                }`}
                                              >
                                                {isSavingAnchorPrompt ? 'Saving…' : 'Save'}
                                              </button>
                                              <button
                                                type="button"
                                                onClick={cancelAnchorPromptEdit}
                                                disabled={isSavingAnchorPrompt}
                                                className="text-xs font-medium text-gray-600 hover:text-gray-900"
                                              >
                                                Cancel
                                              </button>
                                            </>
                                          ) : (
                                            <button
                                              type="button"
                                              onClick={beginAnchorPromptEdit}
                                              className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium border-gray-300 bg-white text-gray-700 hover:bg-gray-50"
                                            >
                                              <CiPen className="w-3 h-3" />
                                              <span>Edit</span>
                                            </button>
                                          )}
                                        </div>
                                      </div>
                                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                        {Object.entries(scene.anchor_prompt_template)
                                          .filter(([key]) => key !== 'anchor_positions' && key !== 'desc_template')
                                          .map(([key, value]) => {
                                            const isEditableField = true;
                                            const displayKey = key.replace(/_/g, ' ');
                                            const currentValue =
                                              typeof value === 'string' ? value : JSON.stringify(value ?? '', null, 2);
                                            const handleChange = (nextVal) => {
                                              const nextTemplate = {
                                                ...(scene.anchor_prompt_template || {}),
                                                [key]: nextVal
                                              };
                                              handleSceneUpdate(currentSceneIndex, 'anchor_prompt_template', nextTemplate);
                                            };
                                            return (
                                              <div
                                                key={key}
                                                className="rounded-md border border-gray-100 bg-gray-50 px-3 py-2"
                                              >
                                                <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                                  {displayKey}
                                                </p>
                                                {isEditingAnchorPrompt && isEditableField ? (
                                                  <textarea
                                                    value={currentValue}
                                                    onChange={(e) => handleChange(e.target.value)}
                                                    className="mt-1 w-full rounded-md border border-gray-300 px-2 py-1 text-sm text-gray-800 focus:ring-1 focus:ring-[#13008B] focus:border-[#13008B] bg-white"
                                                    rows={3}
                                                  />
                                                ) : (
                                                  <p className="mt-1 text-sm text-gray-800 break-words whitespace-pre-line">
                                                    {currentValue}
                                                  </p>
                                                )}
                                              </div>
                                            );
                                          })}
                                      </div>
                                    </div>
                                  )}
                                  {/* Animation Description Accordion */}
                                  {(() => {
                                    const scene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                                    const animationDesc = scene?.animation_desc || scene?.animationDesc || {};
                                    const hasAnimationDesc = animationDesc && typeof animationDesc === 'object' && Object.keys(animationDesc).length > 0;
                                    
                                    if (!hasAnimationDesc) return null;
                                    
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
                                          {animationDescAccordionOpen && (
                                            <div className="ml-2 flex items-center gap-2">
                                              {isEditingAnimationDesc ? (
                                                <>
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      setIsEditingAnimationDesc(false);
                                                      setEditedAnimationDesc({});
                                                    }}
                                                    disabled={isSavingFrameData}
                                                    className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                                                  >
                                                    Cancel
                                                  </button>
                                                  <button
                                                    type="button"
                                                    onClick={async () => {
                                                      try {
                                                        await saveFrameData('animation_desc', editedAnimationDesc);
                                                        setIsEditingAnimationDesc(false);
                                                      } catch (e) {
                                                        console.error('Failed to save animation description:', e);
                                                      }
                                                    }}
                                                    disabled={isSavingFrameData}
                                                    className="px-3 py-1.5 rounded-md bg-[#13008B] text-white text-xs font-medium hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                                  >
                                                    {isSavingFrameData ? (
                                                      <>
                                                        <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                                        <span>Saving...</span>
                                                      </>
                                                    ) : (
                                                      'Save'
                                                    )}
                                                  </button>
                                                </>
                                              ) : (
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    const animationData = scene?.animation_desc || scene?.animationDesc || {};
                                                    setEditedAnimationDesc(typeof animationData === 'object' && !Array.isArray(animationData) ? { ...animationData } : {});
                                                    setIsEditingAnimationDesc(true);
                                                  }}
                                                  className="px-3 py-1.5 rounded-md border border-gray-300 text-xs font-medium text-gray-700 hover:bg-gray-50"
                                                >
                                                  Edit
                                                </button>
                                  )}
                                </div>
                                          )}
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
                                              const currentData = isEditingAnimationDesc ? editedAnimationDesc : normalizeAnimationDescData(animationDesc);
                                              const formatTitle = (key) => {
                                                const cleaned = key.replace(/_/g, ' ').trim();
                                                if (!cleaned) return '';
                                                return cleaned
                                                  .split(' ')
                                                  .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
                                                  .join(' ');
                                              };
                                              const formatValue = (val) => {
                                                if (val == null) return '';
                                                if (typeof val === 'object') return JSON.stringify(val, null, 2);
                                                return String(val);
                                              };
                                              const animationDescFields = Object.entries(currentData);
                                              const priorityOrder = ['lighting', 'style_mood', 'transition_type', 'scene_description', 'subject_description', 'action_specification', 'content_modification', 'camera_specifications', 'geometric_preservation'];
                                              const sortedFields = animationDescFields.sort(([keyA], [keyB]) => {
                                                const indexA = priorityOrder.indexOf(keyA.toLowerCase());
                                                const indexB = priorityOrder.indexOf(keyB.toLowerCase());
                                                if (indexA !== -1 && indexB !== -1) return indexA - indexB;
                                                if (indexA !== -1) return -1;
                                                if (indexB !== -1) return 1;
                                                return 0;
                                              });
                                              
                                              return animationDescFields.length > 0 ? (
                                                <>
                                                  <div className="grid grid-cols-1 gap-4">
                                                    {sortedFields.map(([key, value]) => {
                                                      const title = formatTitle(key);
                                                      const displayValue = formatValue(value);
                                                      return (
                                                        <div
                                                          key={key}
                                                          className="border border-gray-200 rounded-lg bg-white p-4 space-y-2 shadow-sm"
                                                        >
                                                          <h5 className="text-sm font-bold text-gray-800 uppercase tracking-wide">
                                                            {title}
                                                          </h5>
                                                          {isEditingAnimationDesc ? (
                                                            <textarea
                                                              value={displayValue}
                                                              onChange={(e) => {
                                                                const newData = { ...editedAnimationDesc };
                                                                newData[key] = e.target.value;
                                                                setEditedAnimationDesc(newData);
                                                              }}
                                                              className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm text-gray-600 resize-none"
                                                              rows={3}
                                                              disabled={isSavingFrameData}
                                                            />
                                                          ) : (
                                                            <div className="px-3 py-2 rounded-lg border border-gray-200 bg-gray-50 text-sm text-gray-600 whitespace-pre-wrap min-h-[60px]">
                                                              {displayValue || '-'}
                                                            </div>
                                                          )}
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
                        );
                      })()}
                     
                   </div>
                 )}
               </div>
             )}

                         {/* Footer Buttons */}
             <div className="p-4 border-t border-gray-200 flex justify-between items-center">
               <div className="flex gap-2">
                 {showReorderTable ? (
                   <>
                     <button 
                       onClick={() => {
                         // Reset to original order
                         const originalScriptHash = localStorage.getItem(scopedKey('original_script_hash')) || localStorage.getItem('original_script_hash');
                         if (originalScriptHash) {
                           try {
                             const originalScript = JSON.parse(originalScriptHash);
                            const normalizedRows = normalizeScriptToRows(originalScript);
                            setScriptRows(normalizedRows.rows || []);
                            localStorage.removeItem(scopedKey('updated_script_structure'));
                            localStorage.removeItem('updated_script_structure');
                             setHasOrderChanged(false);
                           } catch (e) {
                             console.warn('Failed to reset script order:', e);
                           }
                         }
                       }}
                       className="px-4 py-2 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors text-sm"
                     >
                       🔄 Reset Order
                     </button>
                     
                     {!isEditingScene && hasOrderChanged && (
                       <button
                         onClick={() => setShowSaveConfirm(true)}
                         disabled={isSavingReorder}
                         className={`px-4 py-2 rounded-lg text-sm transition-colors text-white ${
                           isSavingReorder
                             ? 'bg-green-400 cursor-not-allowed'
                             : 'bg-green-600 hover:bg-green-700'
                         }`}
                       >
                         {isSavingReorder ? 'Saving…' : '💾 Save Order'}
                       </button>
                     )}
                   </>
                 ) : null}
               </div>

               <div className="flex gap-3 items-center">
                 {showReorderTable ? (
                   <button 
                     onClick={() => {
                       // Exit reorder; if unsaved changes, revert to original
                       if (hasOrderChanged) {
                         try {
                           const originalScriptHash = localStorage.getItem(scopedKey('original_script_hash')) || localStorage.getItem('original_script_hash');
                           if (originalScriptHash) {
                             const originalScript = JSON.parse(originalScriptHash);
                             const normalized = normalizeScriptToRows(originalScript);
                             setScriptRows(normalized.rows || []);
                           }
                         } catch (_) { /* noop */ }
                         setHasOrderChanged(false);
                       }
                       setShowReorderTable(false);
                     }}
                     className="px-6 py-2 bg-[#13008B] text-white rounded-lg hover:bg-blue-800 transition-colors"
                   >
                     Back
                   </button>
                 ) : (null)}
               </div>
             </div>
          </div>
        </div>
      )}

      {/* Confirm Chart Type Change Modal */}
      {showChartTypeConfirm && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40">
          <div className="bg-white w-[92%] max-w-sm rounded-lg shadow-xl p-5">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-lg font-semibold text-gray-900">Change Chart Type?</h3>
              <button onClick={()=>!isUpdatingChartType && setShowChartTypeConfirm(false)} disabled={isUpdatingChartType} className={`w-8 h-8 rounded-full ${isUpdatingChartType ? 'bg-gray-200 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200'}`}>✕</button>
            </div>
            <p className="text-sm text-gray-700 mb-4">This will update visuals to chart type "
{pendingChartType}". Continue?</p>
            <div className="flex items-center justify-end gap-2">
              <button onClick={()=>setShowChartTypeConfirm(false)} disabled={isUpdatingChartType} className="px-4 py-2 rounded-lg bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button
                onClick={async ()=>{
                  try {
                    setIsUpdatingChartType(true);
                    setIsApplyingChartType(true);
                    const sel = pendingChartType; if (!sel) { setShowChartTypeConfirm(false); return; }
                    const r = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                    const token = localStorage.getItem('token');
                    const sessionId = localStorage.getItem('session_id');
                    if (!token || !sessionId || !r) { setShowChartTypeConfirm(false); return; }
                    // Update local immediately
                    handleSceneUpdate(currentSceneIndex,'chart_type', sel);
                    // Load user/session
                    const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ user_id: token, session_id: sessionId }) });
                    const st = await sessionResp.text(); let sjson; try { sjson = JSON.parse(st); } catch(_) { sjson = st; }
                    const sd = (sjson?.session_data || sjson?.session || {});
                    const user = sjson?.user_data || sd?.user_data || sd?.user || {};
                    // Preserve ALL fields from session_data, including nested structures
                    const sessionForBody = sanitizeSessionSnapshot(sd, sessionId, token);
                    const sceneNumber = r?.scene_number ?? (currentSceneIndex + 1);
                    const visualBody = { user, session: sessionForBody, scene_number: sceneNumber, chart_type: sel };
                    // 1) Update scene visual for Plotly chart type change
                    await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-scene-visual', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(visualBody) });
                  } catch(err) {
                    console.warn('Chart type update failed:', err);
                  } finally {
                    setIsUpdatingChartType(false);
                    setIsApplyingChartType(false);
                    setShowChartTypeConfirm(false);
                    setPendingChartType('');
                  }
                }}
                disabled={isUpdatingChartType}
                className={`px-4 py-2 rounded-lg text-white ${isUpdatingChartType ? 'bg-[#9aa0d0] cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}
              >
                {isUpdatingChartType ? 'Regenerating…' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
      {isApplyingChartType && (
        <div className="fixed inset-0 z-[74] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl px-6 py-5 flex items-center gap-3">
            <div className="w-6 h-6">
              <video
                src={LoadingAnimationVideo}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
            <div className="text-sm font-medium text-gray-800">Applying chart type…</div>
          </div>
        </div>
      )}

      {/* Brand Assets Modal (logos, icons, uploaded_images, templates, voiceover) */}
      {showAssetsModal && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
          <div className="bg-white w-[96%] max-w-5xl max-h-[85vh] overflow-hidden rounded-lg shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[#13008B]">Choose an Asset</h3>
              <button onClick={() => setShowAssetsModal(false)} className="px-3 py-1.5 rounded-lg border text-sm">Close</button>
            </div>
            <div className="px-4 pt-3 border-b border-gray-100">
              <div className="flex items-center gap-3 flex-wrap">
                {[
                  { key: 'preset_templates', label: 'Preset Templates' },
                  { key: 'uploaded_templates', label: 'Uploaded Templates' },
                  { key: 'uploaded_images', label: 'Uploaded Images' },
                  { key: 'documents_images', label: 'Documents' },
                  { key: 'generated_images', label: 'Generated Images' }
                ].map(tab => (
                  <button
                    key={tab.key}
                    onClick={() => setAssetsTab(tab.key)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${assetsTab===tab.key ? 'bg-[#13008B] text-white border-[#13008B]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >{tab.label}</button>
                ))}
                {/* Selection actions shown below after choosing an image */}
              </div>
            </div>
            <input
              ref={assetsUploadInputRef}
              type="file"
              accept="image/*"
              className="hidden"
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
                  // Refresh assets
                  setIsAssetsLoading(true);
                  try {
                    // 1) GET images snapshot
                    const getResp1 = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`);
                    const getText1 = await getResp1.text();
                    let data1; try { data1 = JSON.parse(getText1); } catch(_) { data1 = getText1; }
                    const normalized1 = normalizeBrandAssetsResponse(data1);
                 
                    // 2) UPDATE assets (best-effort; echo back current snapshot)
                    const updateBody = {
                      user_id: token,
                      brand_identity: { logos: normalized1.logos, icons: normalized1.icons, templates: normalized1.templates },
                      uploaded_images: normalized1.uploaded_images,
                      documents_images: normalized1.documents_images
                    };
                    try {
                      await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/update', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateBody)
                      });
                    } catch (_) { /* noop */ }

                    // 3) GET images again to ensure UI reflects server canonical state
                    const getResp2 = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`);
                    const getText2 = await getResp2.text();
                    let data2; try { data2 = JSON.parse(getText2); } catch(_) { data2 = getText2; }
                    const normalized2 = normalizeBrandAssetsResponse(data2);
                    setAssetsData(normalized2);
                  } finally {
                    setIsAssetsLoading(false);
                  }
                } catch (err) {
                  console.error('Upload failed:', err);
                  alert('Failed to upload file.');
                } finally {
                  if (assetsUploadInputRef.current) assetsUploadInputRef.current.value = '';
                }
              }}
            />
            <div className="p-4 overflow-y-auto">
              {(isAssetsLoading || (['preset_templates', 'uploaded_templates'].includes(assetsTab) && isLoadingTemplates) || (assetsTab === 'generated_images' && isLoadingGeneratedImages)) ? (
                <div className="flex items-center justify-center py-16">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-10 h-10 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-600">
                      {assetsTab === 'generated_images' && isLoadingGeneratedImages ? 'Loading generated images...' 
                        : ['preset_templates', 'uploaded_templates'].includes(assetsTab) && isLoadingTemplates ? 'Loading templates by aspect ratio...' 
                        : 'Loading assets...'}
                    </span>
                  </div>
                </div>
              ) : (() => {
                const uploadTypeMap = {
                  preset_templates: 'template',
                  uploaded_templates: 'template',
                  uploaded_images: 'uploaded_images',
                  logos: 'logo',
                  icons: 'icon',
                  documents_images: 'document_image'
                };
                const currentUploadType = uploadTypeMap[assetsTab] || '';
                const isTemplateTab = ['preset_templates', 'uploaded_templates'].includes(assetsTab);
                const isImagesTab = ['uploaded_images', 'documents_images'].includes(assetsTab);
                const inferAspectFromUrl = (url = '') => {
                  try {
                    const lower = String(url).toLowerCase();
                    if (lower.includes('/16-9/') || lower.includes('16x9') || lower.includes('16-9')) return '16:9';
                    if (lower.includes('/9-16/') || lower.includes('9x16') || lower.includes('9-16')) return '9:16';
                  } catch (_) { /* noop */ }
                  return '';
                };
                const resolveEntryAspect = (entry) => {
                  if (!entry || typeof entry !== 'object') return '';
                  return (
                    entry.aspect_ratio ||
                    entry.aspectRatio ||
                    entry.ratio ||
                    entry.orientation ||
                    entry?.base_image?.aspect_ratio ||
                    entry?.base_image?.aspectRatio ||
                    inferAspectFromUrl(entry?.image_url || entry?.imageUrl || entry?.url || '')
                  );
                };
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
                
                // For summary scripts, show summary templates if available
                let summaryTemplateList = [];
                if (isTemplateTab && isSummarySceneActive && effectiveTemplateAspect) {
                  const normalizedAspect = normalizeTemplateAspectLabel(effectiveTemplateAspect);
                  const aspectTemplates = summaryTemplates[normalizedAspect];
                  const presetTemplates = Array.isArray(aspectTemplates?.preset_templates) ? aspectTemplates.preset_templates : [];
                  summaryTemplateList = presetTemplates.map((template, idx) => ({
                    id: template?.template_id || `summary-${idx}`,
                    imageUrl: template?.image_url || '',
                    templateId: template?.template_id || '',
                    aspect: normalizedAspect,
                    label: `Summary Template ${idx + 1}`,
                    isSummaryTemplate: true
                  })).filter(item => item.imageUrl);
                }
                
                // For images tab, show only images from uploaded templates filtered by current aspect ratio
                const extractUploadedTemplateImages = (templates, targetAspect) => {
                  const images = [];
                  if (!Array.isArray(templates)) return images;
                  const normalizedTarget = normalizeTemplateAspectLabel(targetAspect || '');
                  
                  const shouldIncludeTemplate = (tpl, groupAspect) => {
                    const tplAspect = normalizeTemplateAspectLabel(resolveEntryAspect(tpl));
                    const normalizedGroup = normalizeTemplateAspectLabel(groupAspect || '');
                    if (normalizedTarget && normalizedTarget !== 'Unspecified') {
                      if (tplAspect && tplAspect !== 'Unspecified') return tplAspect === normalizedTarget;
                      if (normalizedGroup && normalizedGroup !== 'Unspecified') return normalizedGroup === normalizedTarget;
                      // If we cannot determine an aspect, fall back to showing it
                      return true;
                    }
                    return true;
                  };
                  
                  templates.forEach((templateGroup) => {
                    if (templateGroup && typeof templateGroup === 'object') {
                      // Get aspect ratio from template group
                      const groupAspect = templateGroup.aspect_ratio || templateGroup.ratio || templateGroup.orientation || '';
                      
                      // Check for uploaded_templates array
                      const uploadedTemplates = Array.isArray(templateGroup.uploaded_templates) 
                        ? templateGroup.uploaded_templates 
                        : [];
                      
                      uploadedTemplates.forEach((uploadedTemplate) => {
                        if (!shouldIncludeTemplate(uploadedTemplate, groupAspect)) return;
                        
                        // Try multiple ways to extract image URL
                        let imageUrl = '';
                        
                        // Direct image_url
                        if (uploadedTemplate?.image_url) {
                          imageUrl = uploadedTemplate.image_url;
                        } else if (uploadedTemplate?.imageUrl) {
                          imageUrl = uploadedTemplate.imageUrl;
                        }
                        // From base_image
                        else if (uploadedTemplate?.base_image) {
                          if (typeof uploadedTemplate.base_image === 'string') {
                            imageUrl = uploadedTemplate.base_image;
                          } else if (uploadedTemplate.base_image?.image_url) {
                            imageUrl = uploadedTemplate.base_image.image_url;
                          } else if (uploadedTemplate.base_image?.imageUrl) {
                            imageUrl = uploadedTemplate.base_image.imageUrl;
                          } else if (uploadedTemplate.base_image?.url) {
                            imageUrl = uploadedTemplate.base_image.url;
                          }
                        }
                        // From baseImage (camelCase)
                        else if (uploadedTemplate?.baseImage) {
                          if (typeof uploadedTemplate.baseImage === 'string') {
                            imageUrl = uploadedTemplate.baseImage;
                          } else if (uploadedTemplate.baseImage?.image_url) {
                            imageUrl = uploadedTemplate.baseImage.image_url;
                          } else if (uploadedTemplate.baseImage?.imageUrl) {
                            imageUrl = uploadedTemplate.baseImage.imageUrl;
                          } else if (uploadedTemplate.baseImage?.url) {
                            imageUrl = uploadedTemplate.baseImage.url;
                          }
                        }
                        // Fallback to resolveTemplateAssetUrl
                        else {
                          imageUrl = resolveTemplateAssetUrl(uploadedTemplate);
                        }
                        
                        if (imageUrl && typeof imageUrl === 'string' && imageUrl.trim()) {
                          images.push({
                            image_url: imageUrl.trim(),
                            template_id: uploadedTemplate?.template_id || uploadedTemplate?.templateId || '',
                            aspect: resolveEntryAspect(uploadedTemplate) || normalizeTemplateAspectLabel(groupAspect) || inferAspectFromUrl(imageUrl)
                          });
                        }
                      });
                      
                      // Also check for uploaded_images in template group
                      const uploadedImages = Array.isArray(templateGroup.uploaded_images)
                        ? templateGroup.uploaded_images
                        : [];
                      
                      uploadedImages.forEach((img) => {
                        if (!shouldIncludeTemplate(img, groupAspect)) return;
                        if (typeof img === 'string' && img.trim()) {
                          images.push({
                            image_url: img.trim(),
                            template_id: img.template_id || '',
                            aspect: normalizeTemplateAspectLabel(groupAspect) || inferAspectFromUrl(img)
                          });
                        } else if (img && typeof img === 'object') {
                          const url = resolveTemplateAssetUrl(img);
                          if (url && typeof url === 'string' && url.trim()) {
                            images.push({
                              image_url: url.trim(),
                              template_id: img?.template_id || img?.templateId || '',
                              aspect: resolveEntryAspect(img) || normalizeTemplateAspectLabel(groupAspect) || inferAspectFromUrl(url)
                            });
                          }
                        }
                      });
                    }
                  });
                  return images;
                };

                const filterUploadedImagesByAspect = (images = [], targetAspect) => {
                  const out = [];
                  const normalizedTarget = normalizeTemplateAspectLabel(targetAspect || '');
                  (Array.isArray(images) ? images : []).forEach((img) => {
                    const aspect =
                      typeof img === 'string'
                        ? inferAspectFromUrl(img)
                        : resolveEntryAspect(img);
                    if (normalizedTarget && normalizedTarget !== 'Unspecified') {
                      if (!matchesAspectValue(aspect, normalizedTarget)) return;
                    }
                    if (typeof img === 'string' && img.trim()) {
                      out.push({
                        image_url: img.trim(),
                        template_id: img.template_id || '',
                        aspect: aspect || ''
                      });
                    } else if (img && typeof img === 'object') {
                      const url = resolveTemplateAssetUrl(img);
                      if (url && typeof url === 'string' && url.trim()) {
                        out.push({
                          image_url: url.trim(),
                          template_id: img?.template_id || img?.templateId || '',
                          aspect: aspect || ''
                        });
                      }
                    }
                  });
                  return out;
                };
                
                // Extract assets based on selected tab
                let list = [];
                const normalizedTargetAspect = normalizeTemplateAspectLabel(effectiveTemplateAspect);
                
                if (assetsTab === 'preset_templates' || assetsTab === 'uploaded_templates') {
                  // Extract templates by type from the templates structure
                  const extractedAssets = extractAssetsByType(assetsData.templates, assetsTab);
                  
                  // Filter by aspect ratio
                  let templateList = extractedAssets.filter(item => {
                    if (!normalizedTargetAspect || normalizedTargetAspect === 'Unspecified') return true;
                    return matchesAspectValue(item.aspect, normalizedTargetAspect);
                  });
                  
                // Fallback: if no templates for target aspect, show all
                  if (templateList.length === 0 && normalizedTargetAspect) {
                    templateList = extractedAssets;
                  }
                  
                  list = templateList;
                } else if (assetsTab === 'uploaded_images') {
                  // Extract uploaded_images from templates structure
                  const extractedAssets = extractAssetsByType(assetsData.templates, 'uploaded_images');
                  
                  // Also include flat uploaded_images array
                  const flatImages = Array.isArray(assetsData.uploaded_images) ? assetsData.uploaded_images : [];
                  
                  // Combine and filter by aspect
                  const allImages = [
                    ...extractedAssets,
                    ...flatImages.map((img, idx) => {
                      const url = typeof img === 'string' ? img : (img?.image_url || img?.url || '');
                      if (!url) return null;
                      return {
                        id: `uploaded-img-${idx}`,
                        imageUrl: url,
                        aspect: inferAspectFromUrl(url) || 'Unspecified',
                        label: 'Uploaded Image',
                        assetType: 'uploaded_images'
                      };
                    }).filter(Boolean)
                  ];
                  
                  list = allImages.filter(item => {
                    if (!normalizedTargetAspect || normalizedTargetAspect === 'Unspecified') return true;
                    return matchesAspectValue(item.aspect, normalizedTargetAspect);
                  });
                  
                  // Fallback: show all if filtered list is empty
                  if (list.length === 0 && normalizedTargetAspect) {
                    list = allImages;
                  }
                } else if (assetsTab === 'documents_images') {
                  // For flat arrays (documents_images)
                  const flatArray = Array.isArray(assetsData[assetsTab]) ? assetsData[assetsTab] : [];
                  list = flatArray.map((item, idx) => {
                    const url = typeof item === 'string' ? item : (item?.image_url || item?.url || '');
                    if (!url) return null;
                    return {
                      id: `${assetsTab}-${idx}`,
                      imageUrl: url,
                      aspect: inferAspectFromUrl(url) || 'Unspecified',
                      label: `${assetsTab.replace('_', ' ')} ${idx + 1}`,
                      assetType: assetsTab
                    };
                  }).filter(Boolean);
                } else if (assetsTab === 'generated_images') {
                  // For generated images, filter by aspect ratio
                  const generatedImages = generatedImagesData.generated_images || {};
                  const allGeneratedImages = [];
                  
                  // Collect all images from all aspect ratios
                  Object.entries(generatedImages).forEach(([aspectRatio, urls]) => {
                    if (Array.isArray(urls)) {
                      urls.forEach((url, idx) => {
                        if (typeof url === 'string' && url.trim()) {
                          allGeneratedImages.push({
                            id: `generated-${aspectRatio}-${idx}`,
                            imageUrl: url.trim(),
                            aspect: normalizeTemplateAspectLabel(aspectRatio) || 'Unspecified',
                            label: `Generated Image ${idx + 1}`,
                            assetType: 'generated_images'
                          });
                        }
                      });
                    }
                  });
                  
                  // Filter by target aspect ratio if specified
                  if (normalizedTargetAspect && normalizedTargetAspect !== 'Unspecified') {
                    list = allGeneratedImages.filter(item => {
                      return matchesAspectValue(item.aspect, normalizedTargetAspect);
                    });
                    // Fallback: show all if filtered list is empty
                    if (list.length === 0) {
                      list = allGeneratedImages;
                    }
                  } else {
                    list = allGeneratedImages;
                  }
                }
                const emptyMessage = list.length === 0 
                  ? `No ${assetsTab.replace('_', ' ')} found.`
                  : '';
                return (
                  <>
                    {isTemplateTab && isSummarySceneActive && isLoadingSummaryTemplates && (
                      <div className="flex items-center justify-center py-4 mb-4">
                        <div className="w-6 h-6 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                        <span className="ml-3 text-sm text-gray-600">Loading summary templates...</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {currentUploadType && !isSummarySceneActive && assetsTab !== 'documents_images' && assetsTab !== 'generated_images' && (
                        <button
                          type="button"
                          onClick={() => { 
                            setShowUploadPopup(true); 
                            // Set upload tab based on current assets tab
                            if (['preset_templates', 'uploaded_templates'].includes(assetsTab)) {
                              setUploadPopupTab('pptx');
                            } else {
                              setUploadPopupTab('image');
                            }
                          }}
                          className="rounded-lg border-2 border-dashed border-gray-300 h-28 flex items-center justify-center text-gray-500 hover:border-[#13008B] hover:text-[#13008B]"
                          title={`Upload ${['preset_templates', 'uploaded_templates'].includes(assetsTab) ? 'PPTX' : 'Image'}`}
                        >
                          <span className="text-2xl">+</span>
                        </button>
                      )}
                      {list.length === 0 && (
                        <div className="col-span-full text-sm text-gray-600">
                          {emptyMessage}
                        </div>
                      )}
                      {list.map((entry, idx) => {
                        const imageUrl = entry?.imageUrl || entry?.image_url || entry?.url || (typeof entry === 'string' ? entry : '');
                          if (!imageUrl) return null;
                        
                        // Use selectedTemplateUrls for all tabs to support multiple selections
                        const isSelected = selectedTemplateUrls.includes(imageUrl);
                        
                          const handleClick = () => {
                            // Check model type to determine selection limits
                            const currentScene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                            const modelUpper = String(currentScene?.model || currentScene?.mode || '').toUpperCase();
                            const isVEO3 = (modelUpper === 'VEO3' || modelUpper === 'ANCHOR');
                            const isSora = modelUpper === 'SORA';
                            
                            setSelectedTemplateUrls(prev => {
                              const exists = prev.includes(imageUrl);
                              if (exists) {
                                return prev.filter(u => u !== imageUrl);
                              }
                              // For summary scripts, only allow one template - replace previous selection
                              if (isSummarySceneActive) {
                                return [imageUrl];
                              }
                              // For all models, allow up to 2 selections
                              const next = [...prev, imageUrl];
                              if (next.length > 2) {
                                next.shift();
                              }
                              return next;
                            });
                          };
                        
                          return (
                            <div
                              key={entry.id || idx}
                              className={`rounded-lg border overflow-hidden group relative bg-white cursor-pointer ${isSelected ? 'ring-2 ring-[#13008B]' : ''}`}
                              onClick={handleClick}
                            title={entry.label || `${entry.aspect || 'Unspecified'} • ${assetsTab.replace('_', ' ')}`}
                            >
                            <img src={imageUrl} alt={entry.label || `${assetsTab}-${idx}`} className="w-full h-28 object-cover" />
                              <div className="p-2">
                              {isTemplateTab && (
                                <>
                                <span className="text-xs font-semibold text-gray-800 block">
                                  {normalizeTemplateAspectLabel(entry.aspect || '') || 'Unspecified'}
                                </span>
                                {entry.label && (
                                  <span className="text-[11px] text-gray-600 truncate block">{entry.label}</span>
                                )}
                                </>
                              )}
                              {!isTemplateTab && (
                                <span className="text-xs text-gray-700 truncate block" title={imageUrl}>
                                  {entry.label || `${assetsTab.replace('_', ' ')} ${idx + 1}`}
                              </span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                );
              })()}
              <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3">
                <button
                  disabled={selectedTemplateUrls.length === 0}
                  onClick={async () => {
                    try {
                      const rows = [...scriptRows];
                      const scene = { ...rows[currentSceneIndex] };
                      if (!scene || !Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) return;
                      const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                      const isSora = modelUpper === 'SORA';
                      const isVEO3 = (modelUpper === 'VEO3' || modelUpper === 'ANCHOR');
                      const isAnchor = modelUpper === 'ANCHOR';
                      const isPlotly = modelUpper === 'PLOTLY';
                      
                      // For Keep Default, use up to 2 selected images
                      const imagesToUse = selectedTemplateUrls.length > 0 ? selectedTemplateUrls.slice(0, 2) : [];
                      if (imagesToUse.length === 0) return;
                      
                      // Update scene with selected images - store in background_image, not ref_image
                        if (isAnchor || isPlotly || isVEO3) {
                        // For models that use background, use first image as background
                        scene.background = imagesToUse[0]; 
                        scene.background_image = imagesToUse[0];
                        // Don't store in ref_image - we'll send in background_image array
                        scene.ref_image = [];
                      } else {
                        // For all models, store in background_image, not ref_image
                        scene.ref_image = [];
                        scene.background_image = imagesToUse[0] || '';
                      }
                        rows[currentSceneIndex] = scene;
                        setScriptRows(rows);
                      setSelectedRefImages([]); // Clear ref images since we're using background_image
                        // Don't update ref map since we're not using ref_image
                      
                      // Call update-text API for Keep Default
                      try {
                        setIsApplyingKeepDefault(true);
                          
                        // Build background_image array for ALL tabs when selecting background images
                        // Format: [{template_id: "", image_url: "<url>"}]
                        const backgroundImageArray = imagesToUse.filter(Boolean).map((url) => {
                          const trimmedUrl = typeof url === 'string' ? url.trim() : '';
                          if (!trimmedUrl) return null;
                          return {
                            template_id: '',
                            image_url: trimmedUrl
                          };
                        }).filter(item => item !== null);

                          // Get avatar_url from selected avatar or scene
                          const currentAvatarUrl = scene?.avatar || selectedAvatar || '';

                          await updateSceneGenImageFlag(currentSceneIndex, {
                            genImage: false,
                            descriptionOverride: scene?.description ?? '',
                            refImagesOverride: [], // Don't send ref_image - send in background_image instead
                          backgroundImageArrayOverride: backgroundImageArray.length > 0 ? backgroundImageArray : undefined,
                            avatarUrl: currentAvatarUrl || undefined
                          });
                      } catch(_) { 
                        console.error('Failed to update scene with Keep Default:', _);
                      } finally {
                        setIsApplyingKeepDefault(false);
                      }
                      
                      // Keep Default: clear description and update gen_image to false in local state
                      try {
                        const r2 = [...rows];
                        if (r2[currentSceneIndex]) {
                          r2[currentSceneIndex] = { ...r2[currentSceneIndex], description: '', gen_image: false };
                          setScriptRows(r2);
                        }
                      } catch(_) {}
                      setShowAssetsModal(false);
                      setSelectedAssetUrl('');
                      setSelectedTemplateUrls([]);
                    } catch(_) { /* noop */ }
                  }}
                  className={`px-3 py-2 rounded-lg text-sm border ${
                    selectedTemplateUrls.length === 0
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                  }`}
                >Keep Default</button>
               
                {/* Generate button commented out for now */}
                {/* <button
                  disabled={selectedTemplateUrls.length === 0}
                  onClick={async () => {
                    try {
                      // For Generate, use up to 2 selected images
                      const multi = selectedTemplateUrls.length > 0 ? selectedTemplateUrls.slice(0, 2) : [];
                      if (multi.length === 0 || !Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) return;
                      const rows = [...scriptRows];
                      const scene = { ...rows[currentSceneIndex] };
                      const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                      const isVEO3 = (modelUpper === 'VEO3' || modelUpper === 'ANCHOR');
                      
                      // For all models, use up to 2 images
                        scene.ref_image = multi;
                      // For models that use background field, also set it
                      if (modelUpper === 'ANCHOR' || modelUpper === 'PLOTLY' || isVEO3) {
                        scene.background = multi[0]; 
                        scene.background_image = multi[0];
                      }
                      // For Generate button, set gen_image to true (we're generating new images with templates)
                      // Only Keep Default sets gen_image to false
                      if (['preset_templates', 'uploaded_templates'].includes(assetsTab)) {
                        scene.gen_image = true;
                      }
                      rows[currentSceneIndex] = scene;
                      setScriptRows(rows);
                      // Use all selected images (up to 2) for all models
                      setSelectedRefImages(multi);
                      if (scene.ref_image) updateRefMapForScene(scene.scene_number, scene.ref_image);
                      
                      // For Generate button, call update-scene-visual API for all tabs
                        try {
                          setIsEnhancing(true);
                          // Send all selected templates (up to 2) for all models
                          const templatesToSend = multi;
                          
                          // Send all selected images (up to 2) to update-scene-visual API for all tabs
                          if (templatesToSend.length > 0) {
                          await sendUpdateSceneVisualWithTemplates(
                            scene?.scene_number ?? (currentSceneIndex + 1),
                            templatesToSend
                          );
                          }
                          
                          // Build background_image array for image tabs to also send via updateSceneGenImageFlag
                          let backgroundImageArray = undefined;
                          if (['generated_images', 'uploaded_images', 'documents_images'].includes(assetsTab)) {
                            backgroundImageArray = templatesToSend.filter(Boolean).map((url) => {
                              const trimmedUrl = typeof url === 'string' ? url.trim() : '';
                              if (!trimmedUrl) return null;
                              return {
                                template_id: '',
                                image_url: trimmedUrl
                              };
                            }).filter(item => item !== null);
                          }
                          
                          // For Generate button, set gen_image to true (we're generating new images with templates)
                          await updateSceneGenImageFlag(currentSceneIndex, { 
                            genImage: true,
                            refImagesOverride: multi.filter(Boolean),
                            backgroundImageArrayOverride: backgroundImageArray && backgroundImageArray.length > 0 ? backgroundImageArray : undefined
                          });
                          // Refresh scriptRows to get updated data from server
                          const sessionId = localStorage.getItem('session_id');
                          const token = localStorage.getItem('token');
                          if (sessionId && token) {
                            const refreshResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
                            });
                            const refreshText = await refreshResp.text();
                            let refresh; try { refresh = JSON.parse(refreshText); } catch(_) { refresh = refreshText; }
                            if (refresh && typeof refresh === 'object') {
                              const sd2 = refresh?.session_data || refresh?.session || {};
                              const scripts = Array.isArray(sd2?.scripts) ? sd2.scripts : [];
                              const container = scripts[0]?.airesponse ? { script: scripts[0].airesponse } : { script: scripts };
                              const normalized = normalizeScriptToRows(container);
                              const newRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
                              setScriptRows(newRows);
                            }
                          }
                        } finally {
                          setIsEnhancing(false);
                        }
                        setSelectedAssetUrl('');
                        setSelectedTemplateUrls([]);
                        setShowAssetsModal(false);
                    } catch (error) {
                      console.error('Failed to generate scene with selected assets:', error);
                      alert('Failed to apply selected assets. Please try again.');
                      setIsEnhancing(false);
                    }
                  }}
                   className={`px-3 py-2 rounded-lg text-sm text-white ${
                    selectedTemplateUrls.length === 0
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-[#13008B] hover:bg-blue-800'
                   }`}
                >Generate</button> */}
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Upload Popup Modal */}
      {showUploadPopup && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50">
          <div className="bg-white w-[90%] max-w-md rounded-lg shadow-xl flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-[#13008B]">
                {uploadPopupTab === 'pptx' ? 'Upload PPTX' : 'Upload Image'}
              </h3>
              <button 
                onClick={() => {
                  setShowUploadPopup(false);
                  setUploadPopupTab('image');
                  if (assetImageUploadRef.current) assetImageUploadRef.current.value = '';
                  if (assetPptxUploadRef.current) assetPptxUploadRef.current.value = '';
                }} 
                className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
              >
                Close
              </button>
            </div>
            <div className="p-6">
              {uploadPopupTab === 'image' ? (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select Images</label>
                    <input
                      ref={assetImageUploadRef}
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={async (e) => {
                        try {
                          const files = Array.from(e.target.files || []);
                          if (!files.length) return;
                          await handleUploadBackgroundImages(files);
                          // Refresh assets data
                          const token = localStorage.getItem('token');
                          if (token) {
                            setIsAssetsLoading(true);
                            try {
                              const getResp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`);
                              const getText = await getResp.text();
                              let data; try { data = JSON.parse(getText); } catch(_) { data = {}; }
                              const normalized = normalizeBrandAssetsResponse(data);
                              setAssetsData(normalized);
                            } finally {
                              setIsAssetsLoading(false);
                            }
                          }
                          setShowUploadPopup(false);
                        } catch (err) {
                          console.error('Image upload failed:', err);
                        }
                      }}
                    />
                    <button
                      onClick={() => assetImageUploadRef.current?.click()}
                      disabled={isUploadingBackground}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#13008B] hover:text-[#13008B] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingBackground ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <Upload className="w-5 h-5" />
                          <span>Choose Images</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="convert-colors-image"
                      checked={convertColors}
                      onChange={(e) => setConvertColors(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="convert-colors-image" className="text-sm text-gray-700 cursor-pointer">
                      Convert Colors
                    </label>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Select PPTX File</label>
                    <input
                      ref={assetPptxUploadRef}
                      type="file"
                      accept=".pptx"
                      className="hidden"
                      onChange={async (e) => {
                        try {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          await handleUploadBackgroundPptx(file);
                          // Refresh assets data
                          const token = localStorage.getItem('token');
                          if (token) {
                            setIsAssetsLoading(true);
                            try {
                              const getResp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`);
                              const getText = await getResp.text();
                              let data; try { data = JSON.parse(getText); } catch(_) { data = {}; }
                              const normalized = normalizeBrandAssetsResponse(data);
                              setAssetsData(normalized);
                            } finally {
                              setIsAssetsLoading(false);
                            }
                          }
                          setShowUploadPopup(false);
                        } catch (err) {
                          console.error('PPTX upload failed:', err);
                        }
                      }}
                    />
                    <button
                      onClick={() => assetPptxUploadRef.current?.click()}
                      disabled={isUploadingBackground}
                      className="w-full px-4 py-3 border-2 border-dashed border-gray-300 rounded-lg hover:border-[#13008B] hover:text-[#13008B] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isUploadingBackground ? (
                        <>
                          <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                          <span>Uploading...</span>
                        </>
                      ) : (
                        <>
                          <File className="w-5 h-5" />
                          <span>Choose PPTX File</span>
                        </>
                      )}
                    </button>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="convert-colors-pptx"
                      checked={convertColors}
                      onChange={(e) => setConvertColors(e.target.checked)}
                      className="rounded"
                    />
                    <label htmlFor="convert-colors-pptx" className="text-sm text-gray-700 cursor-pointer">
                      Convert Colors
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {isEnhancing && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40">
          <div className="bg-white w-[90%] max-w-sm rounded-lg shadow-xl p-6 text-center">
            <div className="mx-auto mb-4 w-20 h-20">
              <video
                src={LoadingAnimationVideo}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Generating scene…</h4>
            <p className="mt-1 text-sm text-gray-600">Applying selected image to scene.</p>
          </div>
        </div>
      )}
      {isApplyingKeepDefault && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40">
          <div className="bg-white w-[90%] max-w-sm rounded-lg shadow-xl p-6 text-center">
            <div className="mx-auto mb-4 w-20 h-20">
              <video
                src={LoadingAnimationVideo}
                autoPlay
                loop
                muted
                playsInline
                className="w-full h-full object-contain"
              />
            </div>
            <h4 className="text-lg font-semibold text-gray-900">Applying changes…</h4>
            <p className="mt-1 text-sm text-gray-600">Updating scene with selected image.</p>
          </div>
        </div>
      )}
      {/* Regenerate Scene Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-[95%] max-w-lg rounded-lg shadow-xl p-5 relative">
            {isRegenerating && (
              <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10">
                <div className="w-8 h-8 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
              </div>
            )}
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[#13008B]">Regenerate Scene {scriptRows?.[currentSceneIndex]?.scene_number ?? (currentSceneIndex+1)}</h3>
              <button onClick={() => !isRegenerating && setShowRegenModal(false)} disabled={isRegenerating} className={`text-white w-8 h-8 transition-all duration-300 rounded-full ${isRegenerating ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#13008B] hover:text-[#13008B] hover:bg-[#e4e0ff]'}`}>✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Model Detected</label>
                <div className="px-3 py-2 rounded-lg border bg-gray-50 text-sm font-medium text-gray-800">
                  {regenModelLabel}
                </div>
                {regenModelUpper === 'SORA' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Suggestions load automatically for SORA scenes.
                  </p>
                )}
                {regenModelUpper === 'VEO3' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Presenter presets appear first. Select one to continue.
                  </p>
                )}
                {regenModelUpper === 'ANCHOR' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Anchor scenes require choosing a preset before suggestions.
                  </p>
                )}
                {regenModelUpper === 'PLOTLY' && (
                  <p className="text-xs text-gray-500 mt-1">
                    Provide chart details, then fetch suggestions.
                  </p>
                )}
              </div>
              {regenModelUpper === 'PLOTLY' && regenStep === 1 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
                    <select value={regenChartType} onChange={(e)=>setRegenChartType(e.target.value)} className="w-full p-2 border rounded">
                  <option value="">Select</option>
                      <option value="clustered_bar">Clustered Bar</option>
                      <option value="clustered_column">Clustered Column</option>
                      <option value="line">Line</option>
                      <option value="pie">Pie</option>
                      <option value="stacked_bar">Stacked Bar</option>
                      <option value="stacked_column">Staacked Column</option>
                      <option value="waterfall_bar">Waterfall Bar</option>
                      <option value="waterfall_column">Waterfall Column</option>
                      <option value="donut">Donut</option>
                    </select>
                  </div>
                  <div className="flex justify-end pt-1">
                    <button
                      disabled={isRegenerating || isLoadingRegenPresenter || isSuggestingRegen || !regenChartType}
                      onClick={() => continueRegenerateFlow('PLOTLY')}
                      className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                        isRegenerating || isLoadingRegenPresenter || isSuggestingRegen || !regenChartType
                          ? 'bg-[#9aa0d0] cursor-not-allowed'
                          : 'bg-[#13008B] hover:bg-blue-800'
                      }`}
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}
              {regenModelUpper === 'PLOTLY' && regenStep >= 2 && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
                    <div className="px-3 py-2 rounded-lg border bg-gray-50 text-sm font-medium text-gray-800">
                      {regenChartType || 'Not selected'}
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chart Data (JSON)</label>
                    <textarea value={regenChartData} onChange={(e)=>setRegenChartData(e.target.value)} rows={4} className="w-full p-2 border rounded" placeholder='{"labels":["A","B"],"values":[10,20]}' />
                  </div>
                  {regenDocSummary && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Document Summary</label>
                      <div className="max-h-40 overflow-auto p-3 border rounded bg-white text-sm text-gray-800 whitespace-pre-wrap">{regenDocSummary}</div>
                    </div>
                  )}
                </div>
              )}
              {isRegenPresenterSelectionPhase && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="block text-sm font-medium text-gray-700">Scene Settings</label>
                    {regenPresenterPresetId && (
                      <span className="text-xs text-gray-500">
                        Selected: {regenPresenterPresetLabel || 'Presenter'}
                      </span>
                    )}
                  </div>
                  {isLoadingRegenPresenter ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <span className="w-4 h-4 border-2 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                      Loading presenter options…
                    </div>
                  ) : (() => {
                    const avatarPresenterOptions = Array.isArray(presenterPresets[regenModelUpper])
                      ? presenterPresets[regenModelUpper]
                      : [];
                    if (avatarPresenterOptions.length === 0) {
                      return (
                        <div className="text-sm text-gray-600 border border-dashed border-gray-300 rounded-lg px-3 py-2">
                          No presenter options available for this configuration.
                        </div>
                      );
                    }
                    return (
                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        {avatarPresenterOptions.map((preset, idx) => {
                          const id = String(preset?.preset_id ?? '');
                          const selected = String(regenPresenterPresetId || '') === id;
                          const previewUrl = preset?.sample_video || '';
                          const inferPreviewType = (url) => {
                            if (!url || typeof url !== 'string') return '';
                            const clean = url.split('?')[0].toLowerCase();
                            const videoExts = ['.mp4', '.mov', '.m4v', '.webm', '.ogg', '.ogv'];
                            const imageExts = ['.png', '.jpg', '.jpeg', '.gif', '.bmp', '.svg', '.webp', '.avif'];
                            if (videoExts.some((ext) => clean.endsWith(ext))) return 'video';
                            if (imageExts.some((ext) => clean.endsWith(ext))) return 'image';
                            return '';
                          };
                          const resolvedType = inferPreviewType(previewUrl);
                          const isVideo = resolvedType === 'video';
                          const isImage = resolvedType === 'image';
                          return (
                            <button
                              key={id || idx}
                              type="button"
                              onClick={() => {
                                setRegenPresenterPresetId(id);
                                setRegenPresenterPresetLabel(preset?.option || '');
                                setRegenPresenterError('');
                              }}
                              className={`w-full text-left border rounded-lg px-3 py-3 transition-all ${
                                selected
                                  ? 'border-[#13008B] bg-[#f3f1ff] shadow-sm'
                                  : 'border-gray-200 bg-white hover:border-[#13008B]'
                              }`}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="w-20 h-12 rounded overflow-hidden bg-black/5 flex-shrink-0">
                                  {previewUrl ? (
                                    isVideo ? (
                                      <video
                                        className="w-full h-full object-cover"
                                        muted
                                        playsInline
                                        loop
                                      >
                                        <source src={previewUrl} type="video/mp4" />
                                      </video>
                                    ) : isImage ? (
                                      <img
                                        src={previewUrl}
                                        alt={`${preset?.option || 'Presenter'} preview`}
                                        className="w-full h-full object-cover"
                                      />
                                    ) : (
                                      <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-500">
                                        Preview
                                      </div>
                                    )
                                  ) : (
                                    <div className="w-full h-full flex items-center justify-center text-[10px] text-gray-400">
                                      No image
                                    </div>
                                  )}
                                </div>
                                <div className="flex-1">
                                  <p className="text-sm font-semibold text-gray-800">
                                    {preset?.option || 'Presenter'}
                                  </p>
                                </div>
                                {selected && <Check className="w-4 h-4 text-[#13008B]" />}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    );
                  })()}
                  {regenPresenterError && (
                    <div className="rounded bg-red-50 border border-red-200 px-3 py-2 text-sm text-red-600">
                      {regenPresenterError}
                    </div>
                  )}
                  <p className="text-xs text-gray-500">
                    Select a presenter preset to continue. You can preview samples where available.
                  </p>
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        if (!isRegenerating) setShowRegenModal(false);
                      }}
                      disabled={isRegenerating}
                      className={`px-4 py-2 rounded-lg text-sm font-medium ${
                        isRegenerating
                          ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRegenPresenterNext}
                      disabled={isRegenerating || !regenPresenterPresetId}
                      className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${
                        isRegenerating || !regenPresenterPresetId
                          ? 'bg-[#9aa0d0] cursor-not-allowed'
                          : 'bg-[#13008B] hover:bg-blue-800'
                      }`}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
              {showRegenSuggestionSection && (
              <div className="mt-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Suggestions</label>
                {isSuggestingRegen ? (
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <span className="w-4 h-4 border-2 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                    Fetching suggestions…
                  </div>
                ) : (
                  <div className="space-y-2 max-h-44 overflow-y-auto border rounded-md p-2">
                    {Array.isArray(regenSuggestions) && regenSuggestions.length > 0 ? (
                      regenSuggestions.map((sug, i) => (
                        <div key={i}>
                          <button
                            type="button"
                            onClick={() => { 
                              setRegenSelectedIdx(i); 
                              setRegenSceneContent((((sug?.title ? (sug.title+': ') : '') + (sug?.content || '')).trim())); 
                              setRegenQuery(''); // Clear manual description when suggestion is selected
                            }}
                            className={`relative w-full text-left p-2 rounded border hover:bg-gray-50 ${regenSelectedIdx===i?'border-[#13008B] ring-2 ring-[#cfcaf7]':''}`}
                            title="Click to select this suggestion"
                          >
                            {regenSelectedIdx===i && (
                              <span className="absolute top-1 right-1 text-[10px] px-2 py-0.5 rounded-full bg-[#13008B] text-white">Selected</span>
                            )}
                            <div className="text-xs font-medium text-gray-800">{sug?.title || 'Suggestion'}</div>
                            <div className="text-xs text-gray-600 whitespace-pre-wrap">{sug?.content || ''}</div>
                          </button>
                        </div>
                      ))
                    ) : (
                      <div className="text-xs text-gray-500">No suggestions available.</div>
                    )}
                  </div>
                )}
              </div>
              )}
              {showRegenSuggestionSection && (
                <div className="mt-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description <span className="text-xs text-gray-500 font-normal">(Optional - if you don't select a suggestion)</span>
                  </label>
                  <textarea
                    value={regenQuery}
                    onChange={(e) => {
                      setRegenQuery(e.target.value);
                      // Clear selected suggestion when user types manually
                      if (e.target.value.trim()) {
                        setRegenSelectedIdx(-1);
                        setRegenSceneContent('');
                      }
                    }}
                    placeholder="Enter your description or query for regenerating this scene..."
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent text-sm"
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    If you don't select a suggestion above, please enter a description here.
                  </p>
                </div>
              )}
              {showRegenSuggestionSection && (
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button onClick={()=>!isRegenerating && setShowRegenModal(false)} disabled={isRegenerating} className={`px-4 py-2 rounded-lg text-sm font-medium ${isRegenerating ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>Cancel</button>
                  <button onClick={handleRegenerateScene} disabled={isRegenerating} className={`px-4 py-2 rounded-lg text-sm font-medium ${isRegenerating ? 'bg-blue-300 cursor-not-allowed text-white' : 'bg-[#13008B] text-white hover:bg-blue-800'}`}>{isRegenerating ? 'Regenerating…' : 'Regenerate Scene'}</button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Generating Video Popup */}
      {isGeneratingVideo && (
        <div className="fixed  inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-gray-100 w-[100%] max-w-sm rounded-lg shadow-xl p-6 text-center">
            <div className="relative w-20 h-20 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-4 border-[#D8D3FF]"></div>
              <div className="absolute inset-2 rounded-full overflow-hidden">
                <img 
                  src={LogoImage} 
                  alt="Logo" 
                  className="w-full h-full object-contain animate-spin"
                  style={{ animationDuration: '2s' }}
                />
              </div>
            </div>
            <h4 className="text-lg font-semibold text-[#13008B]">Generating Video...</h4>
            <p className="mt-1 text-sm text-gray-600">This may take up to 5 minutes.</p>
            <p className="mt-2 text-sm font-medium text-gray-800">Time remaining: {formatSeconds(videoCountdown)}</p>
          </div>
        </div>
      )}
      {showShortGenPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-[90%] max-w-sm rounded-lg shadow-xl p-6 text-center">
            <div className="mx-auto mb-4 w-8 h-8 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
            <h4 className="text-lg font-semibold text-[#13008B]">Starting image generation…</h4>
            <p className="mt-1 text-sm text-gray-600">Redirecting to Images in a moment.</p>
          </div>
        </div>
      )}
      {showMissingAvatarPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-[90%] max-w-md rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold text-red-600">Missing Required Data</h4>
              <button
                onClick={() => {
                  setShowMissingAvatarPopup(false);
                  setMissingAvatarScenes([]);
                }}
                className="text-gray-400 hover:text-gray-600 transition-colors text-2xl leading-none"
                title="Close"
              >
                ×
              </button>
            </div>
            <p className="text-sm text-gray-700 mb-4">
              Please ensure all scenes below have required avatar before generating the video.
            </p>
            
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
              <p className="text-sm font-medium text-red-800 mb-2">Missing avatar in the following scenes:</p>
              <div className="flex flex-wrap gap-2">
                {missingAvatarScenes.map((sceneNum, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-red-100 text-red-800 border border-red-300"
                  >
                    Scene {sceneNum}
                  </span>
                ))}
              </div>
            </div>
            <div className="flex justify-end">
              <button
                onClick={() => {
                  setShowMissingAvatarPopup(false);
                  setMissingAvatarScenes([]);
                }}
                className="px-4 py-2 rounded-lg bg-[#13008B] text-white text-sm font-medium hover:bg-blue-800 transition-colors"
              >
                OK
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Short 5s popup for job-based generation */}
      {/* Inline Images view replaces chat when active */}
      {/* Global lightweight loaders for other actions */}
      {isGeneratingQuestionnaire && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white/95 max-w-sm w-[90%] rounded-lg shadow p-4 text-center">
            <div className="mx-auto mb-3 w-8 h-8 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
            <div className="text-sm font-medium text-gray-800">Generating Questionnaire…</div>
          </div>
        </div>
      )}
      {(isUpdatingText || isSavingReorder || isUploadingAvatar || isUploadingSceneImages) && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white/95 max-w-sm w-[90%] rounded-lg shadow p-4 text-center">
            <div className="mx-auto mb-3 w-8 h-8 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
            <div className="text-sm font-medium text-gray-800">
              {isUpdatingText && 'Saving changes…'}
              {isSavingReorder && 'Saving new order…'}
              {isUploadingAvatar && !isUpdatingText && !isSavingReorder && 'Uploading avatar…'}
              {isUploadingSceneImages && !isUpdatingText && !isSavingReorder && !isUploadingAvatar && 'Uploading images…'}
            </div>
          </div>
        </div>
      )}
      {/* Full-screen loader while switching reel/video type */}
      {isSwitchingModel && (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/40">
          <div className="bg-white/95 max-w-sm w-[90%] rounded-xl shadow-xl px-6 py-5 text-center">
            <div className="mx-auto mb-3 w-10 h-10 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
            <div className="text-base font-medium text-gray-800">
              {(() => {
                const vt = String(pendingModelType || selectedVideoType || '').toLowerCase();
                let label = pendingModelType || selectedVideoType || 'Video';
                if (vt.includes('avatar')) label = 'Avatar';
                else if (vt.includes('info')) label = 'Infographic';
                else if (vt.includes('financial')) label = 'Financial';
                else if (vt.includes('hybrid')) label = 'Hybrid';
                return `Loading ${label}`;
              })()}
              <span className="ml-1 thinking-dots"><span className="dot">.</span><span className="dot">.</span><span className="dot">.</span></span>
            </div>
          </div>
        </div>
      )}
      {/* Inject CSS for thinking dots animation */}
      <style>{thinkingDotsStyles}</style>
      
      {/* Main Content Area (hidden in Script Editor mode) */}
     {!scenesMode && (
     <div className="flex-1 flex flex-col overflow-hidden overflow-x-hidden">
        {!isChatLoading && chatHistory.length === 0 && uploadedFiles.length === 0 ? (
          // Welcome message when no chat history and no files
          <div className="flex-1 flex flex-col items-center justify-center px-4 lg:px-8 py-8 lg:py-16">
            <div className="text-center max-w-md mx-auto">
              {/* Upload Icon */}
              <div className="mb-6 lg:mb-8">
                <div className="w-16 h-16 lg:w-20 lg:h-20 mx-auto bg-gray-400 rounded-full flex items-center justify-center">
                  <Upload className="w-8 h-8 lg:w-10  text-white" />
                </div>
              </div>
              {/* Upload Text */}
              <p className="text-gray-500 text-base lg:text-lg mb-8 lg:mb-12">
                Talk to Me or Upload a Document to Generate a Video
              </p>
            </div>
          </div>
        ) : (
          // Chat messages display
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto overflow-x-hidden px-0 py-4 scrollbar-hide">
            <div className="w-full space-y-4">
            {/* Display chat messages or loading skeletons */}
            {isChatLoading ? (
              <div className="space-y-4">
                {[0,1,2,3].map((i) => {
                  const isUser = i % 2 === 0;
                  return (
                    <div
                      key={i}
                      className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      {/* Avatar skeleton */}
                      <div className="flex-shrink-0">
                        <div className={`w-8 h-8 rounded-full ${isUser ? 'bg-purple-200' : 'bg-gray-200'} animate-pulse`} />
                      </div>
                      {/* Bubble skeleton with proper width */}
                      <div
                        className={`w-full px-4 py-3 rounded-lg border animate-pulse ${
                          isUser ? 'bg-[#EDEBFF] border-[#D9D6FF]' : 'bg-white border-gray-200'
                        }`}
                      >
                        <div className="h-4 bg-gray-200 rounded w-5/6 mb-2"></div>
                        <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
            <>
            {chatHistory.map((message) => (
              <div
                key={message.id}
                className={`flex items-start gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
              >
                {/* Avatar */}
                <div className="flex-shrink-0">
                  {message.type === 'user' ? (
                    // User Avatar
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center">
                      {userProfile?.picture ? (
                        <img 
                          src={userProfile.picture} 
                          alt="User" 
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  ) : message.type === 'thinking' ? (
                    // AI Avatar (thinking state)
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  ) : (
                    // AI Avatar
                    <div className="w-8 h-8 rounded-full overflow-hidden bg-gradient-to-br from-green-400 to-green-600 flex items-center justify-center">
                      <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-6-3a2 2 0 11-4 0 2 2 0 014 0zm-2 4a5 5 0 00-4.546 2.916A5.986 5.986 0 0010 16a5.986 5.986 0 004.546-2.084A5 5 0 0010 11z" clipRule="evenodd" />
                      </svg>
                    </div>
                  )}
                </div>

                {/* Message Content */}
                <div className={(message.type === 'ai' || message.type === 'thinking') ? 'flex flex-col items-start gap-2 w-full' : 'flex items-end gap-2 w-full'}>
                  <div
                    className={`${(message.type === 'ai' || message.type === 'thinking') ? 'w-full' : 'ml-auto max-w-[70%]'} px-4 py-3 rounded-2xl ${
                      message.type === 'user'
                        ? 'chat-user-bubble'
                        : message.type === 'error'
                        ? 'bg-red-300 text-red-800'
                        : message.type === 'thinking'
                        ? 'chat-ai-plain'
                        : message.type === 'ai'
                        ? 'chat-message-ai'
                        : 'bg-gray-300 text-gray-800'
                    }`}
                  >
                    <div className="text-sm">
                      {message.type === 'thinking' ? (
                        <span className="flex items-center gap-1 text-gray-600">
                          Thinking
                          <span className="thinking-dots">
                            <span className="dot">.</span>
                            <span className="dot">.</span>
                            <span className="dot">.</span>
                          </span>
                        </span>
                      ) : message.type === 'user' && message.docMeta?.name ? (
                        <span className="flex items-center gap-2">
                          {getDocIconByName(message.docMeta.name)}
                          <span>{message.content}</span>
                        </span>
                      ) : message.type === 'ai' ? (
                        (() => {
                          try {
                            return formatAIResponse(message.content);
                          } catch (error) {
                            console.error('Error formatting AI response:', error);
                            return message.content;
                          }
                        })()
                      ) : (
                        message.content
                      )}
                    </div>
                    <p className="text-xs opacity-60 mt-1">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </p>
                    {/* Inline Chart Data preview for financial (PLOTLY) scenes */}
                    {message.type === 'ai' && message.script && (() => {
                      try {
                        const scenes = Array.isArray(message.script) ? message.script : (Array.isArray(message.script?.airesponse) ? message.script.airesponse : []);
                        const plotScene = (Array.isArray(scenes) ? scenes : []).find(s => String(s?.model || s?.mode || '').toUpperCase() === 'PLOTLY' && (s?.chart_data || s?.chartData));
                        if (!plotScene) return null;
                        let raw = plotScene.chart_data || plotScene.chartData;
                        if (typeof raw === 'string') { try { raw = JSON.parse(raw); } catch(_) { /* keep string */ } }
                        const renderTable = (headers, rows) => (
                          <div className="mt-3 w-full overflow-x-auto overflow-y-auto max-h-60 border border-gray-200 rounded-lg bg-white">
                            <table className="min-w-full text-sm">
                              <thead className="bg-gray-50 sticky top-0">
                                <tr>
                                  {headers.map((h, i) => (
                                    <th key={i} className="px-3 py-2 text-left font-semibold text-gray-700 border-b border-gray-200 whitespace-nowrap">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody>
                                {rows.map((r, ri) => (
                                  <tr key={ri} className={ri % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    {headers.map((h, hi) => (
                                      <td key={hi} className="px-3 py-2 border-b border-gray-100 text-gray-800 whitespace-nowrap">{r[h] ?? ''}</td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        );
                        if (!raw) return null;
                        // Case 1: Array of objects
                        if (Array.isArray(raw) && raw.every(it => it && typeof it === 'object' && !Array.isArray(it))) {
                          const headerSet = new Set();
                          raw.forEach(obj => Object.keys(obj).forEach(k => headerSet.add(k)));
                          const headers = Array.from(headerSet);
                          const rows = raw.map(obj => headers.reduce((acc, k) => { acc[k] = obj?.[k]; return acc; }, {}));
                          return renderTable(headers, rows);
                        }
                        // Case 2: Object with parallel arrays
                        if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
                          const keys = Object.keys(raw);
                          const arrays = keys.every(k => Array.isArray(raw[k]));
                          if (arrays) {
                            const maxLen = Math.max(0, ...keys.map(k => (Array.isArray(raw[k]) ? raw[k].length : 0)));
                            const headers = keys;
                            const rows = Array.from({ length: maxLen }, (_, i) => {
                              const row = {};
                              keys.forEach(k => { row[k] = Array.isArray(raw[k]) ? raw[k][i] : ''; });
                              return row;
                            });
                            return renderTable(headers, rows);
                          }
                          // Case 3: Generic object -> key/value table
                          const headers = ['Key', 'Value'];
                          const rows = Object.entries(raw).map(([k, v]) => ({ Key: k, Value: (typeof v === 'object' ? JSON.stringify(v) : v) }));
                          return renderTable(headers, rows);
                        }
                        // Fallback: single value
                        return renderTable(['Value'], [{ Value: String(raw) }]);
                      } catch (_) { return null; }
                    })()}
                  </div>
                  
                  {/* Actions row for AI messages: icons + buttons on one line */}
                  {message.type === 'ai' && (
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {/* Toolbar icons */}
                     

                      {/* Divider */}
                    

                      {/* Generate/Script buttons */}
                      {(() => {
                          const hasGenerated = !!message.script;
                          if (hasGenerated) {
                            return (

                              <button 
                                onClick={() => {
                                  if (imagesAvailable && typeof onGoToScenes === 'function') { onGoToScenes(); return; }
                                  triggerGenerateScenes();
                                }}
                                className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-lg transition-colors shadow-sm bg-white border-gray-200 hover:bg-gray-50 text-gray-900`}>
                                <div className="w-5 h-5 rounded-full bg-blue-700 flex items-center justify-center text-white text-[10px] font-bold">S</div>
                                <span className={`text-sm font-medium`}>{imagesAvailable ? 'Go to Storyboard' : 'Generate Storyboard'}</span>
                              </button>
                            );
                          } else {
                            return (
                              <button 
                                onClick={() => {
                                  if (window.startVideoGeneration) {
                                    window.startVideoGeneration();
                                  }
                                }}
                                disabled={isGeneratingQuestionnaire}
                                className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-lg transition-colors shadow-sm ${isGeneratingQuestionnaire ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'}`}>
                                {isGeneratingQuestionnaire ? (
                                  <div className="w-5 h-5 border-2 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                                ) : (
                                  <div className='w-6 h-6 bg-[#13008B] rounded-full flex items-center justify-center'>
                                    <CiPen className='text-white' />
                                  </div>
                                )}
                                <span className={`text-sm font-medium ${isGeneratingQuestionnaire ? 'text-gray-400' : 'text-gray-900'}`}>
                                  {isGeneratingQuestionnaire ? 'Generating Questionnaire...' : 'Generate Script'}
                                </span>
                              </button>
                            );
                          }
                        return null;
                      })()}

                      {message.script && (
                        <button 
                          onClick={() => { if (typeof onGoToScenes === 'function') { try { onGoToScenes(message.script); } catch(_){} } else { openScriptModal(message.script); } }} 
                          className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm">
                          <span className="text-sm font-medium text-gray-900">View Script</span>
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
            </>
            )}
            </div>
          </div>
        )}
      </div>
      )}

             {/* Chat Input or File Upload Display */}
       {!scenesMode && (
       <div className="bg-white border-gray-200 p-4 lg:p-1">
         <div className="max-w-8xl mx-auto">
           {uploadedFiles.length === 0 ? (
             // Show normal chat input when no files
             <div className="space-y-1">
               {/* Pre-created message buttons */}
              
               
               <div className="flex gap-2">
                 <div className="flex-1 relative">
                 <input
                   type="text"
                   ref={chatInputRef}
                   placeholder="Talk to me or upload the documents you want to summarize"
                   className="w-full px-3 py-2 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm leading-5"
                   value={inputMessage}
                   onChange={(e) => {
                     setInputMessage(e.target.value);
                   }}
                   onKeyDown={handleKeyPress}
                   disabled={isLoading}
                 />
                 <div className="absolute right-2 top-1/2 -translate-y-1/2 flex gap-1">
                   {/* Send Button */}
                   <button
                     onClick={handleSendMessage}
                     disabled={!inputMessage.trim() || isLoading}
                     className={`p-1.5 rounded-lg transition-colors ${
                       inputMessage.trim() && !isLoading
                         ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                         : 'text-gray-400 cursor-not-allowed'
                     }`}
                   >
                     <Send className="w-4 h-4" />
                   </button>
                   
                   {/* File Upload Button */}
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors"
                     title="Upload Documents (PDF, PPT, PPTX, DOC, DOCX, CSV, XLS, XLSX)"
                   >
                     <Paperclip className="w-4 h-4" />
                   </button>
                   
                   {/* Hidden file input */}
                   <input
                     ref={fileInputRef}
                     type="file"
                    multiple
                    accept=".pdf,.ppt,.pptx,.doc,.docx,.csv,.xls,.xlsx"
                     onChange={handleFileSelect}
                     className="hidden"
                   />
                   
                   {/* Other buttons */}
                   {/* <button  onClick={() => fileInputRef.current?.click()} className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 transition-colors">
                     <FileText className="w-4 h-4 lg:w-5 lg:h-5" />
                   </button>
                   <button className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 transition-colors">
                     <Camera className="w-4 h-4 lg:w-5 lg:h-5" />
                   </button> */}
                 </div>
               </div>
             </div>
           </div>
           ) : (
             // Show uploaded files display when files are present
             <div className="mt-3">
               <div className="flex items-center justify-between mb-3">
                 <h3 className="text-lg font-medium text-gray-900">Uploaded Documents</h3>
                 <button
                   onClick={() => {
                  setUploadedFiles([]);
                  const sid = localStorage.getItem('session_id');
                  if (sid) localStorage.removeItem(`is_doc_followup:${sid}`);
                  localStorage.removeItem('is_doc_followup');
                }}
                   className="px-3 py-1 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                 >
                   Clear All
                 </button>
               </div>
               
                               <div className="space-y-2">
                  {uploadedFiles.map((file, index) => (
                    <div key={index} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
                      {getFileIcon(file)}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                        <p className="text-xs text-gray-500">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                      </div>
                                             <div className="flex items-center gap-2">
                         {/* Remove Button */}
                         <button
                           onClick={() => removeFile(index)}
                           className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                         >
                           <X className="w-4 h-4" />
                         </button>
                       </div>
                    </div>
                  ))}
                </div>
                
                {/* Ready Status - Show when files are processed */}
                 {!isUploading && uploadedFiles.length > 0 && uploadedFiles.some(file => file.extractData) && (
                   <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                     <div className="flex items-center justify-center gap-2 text-green-700">
                       <div className="w-4 h-4 bg-green-600 rounded-full flex items-center justify-center">
                         <svg className="w-2.5 h-2.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                           <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                         </svg>
                       </div>
                       <span className="text-sm font-medium">Documents ready! Use the "Send All to Chat" button below to process with AI</span>
                     </div>
                   </div>
                 )}
                 {(isUploading || isSummarizing) && (
                  <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <div className="flex items-center justify-center gap-2 text-blue-700">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700"></div>
                      <span className="text-sm font-medium">{isUploading ? 'Processing documents...' : 'Generating a summary...'}</span>
                    </div>
                  </div>
                )}
                               {/* Upload More and Send Chat Buttons */}
                <div className="mt-4 flex justify-center gap-3">
                  <button 
                    onClick={() => {
                      // Re-open input so user can continue chatting/uploads
                      if (fileInputRef.current) {
                        fileInputRef.current.click();
                      }
                      // Ensure next chat is treated as doc-follow-up if documents were previously processed
                      {
                        const sid = localStorage.getItem('session_id');
                        const docFollow = sid ? localStorage.getItem(`is_doc_followup:${sid}`) : localStorage.getItem('is_doc_followup');
                        if (docFollow === 'true') {
                        // Keep the flag active for subsequent uploads
                        console.log('Documents previously processed, keeping is_doc_followup flag active');
                        }
                      }
                    }}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                    disabled={isUploading || isSummarizing}
                  >
                    <Paperclip className="w-4 h-4" />
                    Upload More Documents
                  </button>
                  
                  {/* Send Chat Button - Only show when files are processed */}
                  {uploadedFiles.some(file => file.extractData) && (
                    <button 
                      onClick={async () => {
                        setIsSummarizing(true);
                        await callSummaryAPIForAll();
                        // After sending to chat, switch back to chat input area view
                        setUploadedFiles([]);
                        // The is_doc_followup flag is already set in callSummaryAPIForAll
                        console.log('Summary sent. is_doc_followup flag is now TRUE');
                        setIsSummarizing(false);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                      title="Process all documents with AI"
                      disabled={isUploading || isSummarizing}
                    >
                      <Send className="w-4 h-4" />
                      Send All to Chat
                    </button>
                  )}
                </div>
             </div>
           )}
         </div>
       </div>
       )}

        {/* Upload Avatar Popup */}
        {showAvatarUploadPopup && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50">
            <div className="bg-white w-[90%] max-w-2xl rounded-lg shadow-xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-[#13008B]">Upload Avatar</h3>
                <button 
                  onClick={() => {
                    setShowAvatarUploadPopup(false);
                    setAvatarUploadFiles([]);
                  }}
                  className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
                >
                  Close
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto flex-1">
                {/* Upload Box */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Avatar Files
                  </label>
                  <input
                    ref={avatarUploadFileInputRef}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        setAvatarUploadFiles(prev => {
                          const newFiles = [...prev];
                          files.forEach(file => {
                            if (!newFiles.find(f => f.name === file.name && f.size === file.size)) {
                              newFiles.push(file);
                            }
                          });
                          return newFiles;
                        });
                      }
                      if (avatarUploadFileInputRef.current) {
                        avatarUploadFileInputRef.current.value = '';
                      }
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => avatarUploadFileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#13008B] hover:bg-gray-50 transition-colors"
                  >
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to select avatar files</p>
                      <p className="text-xs text-gray-500 mt-1">Supported: JPG, PNG, WEBP</p>
                    </div>
                  </button>
                </div>

                {/* File List */}
                {avatarUploadFiles.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected Files ({avatarUploadFiles.length})
                    </label>
                    <div className="space-y-2">
                      {avatarUploadFiles.map((file, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <div className="w-10 h-10 bg-gray-200 rounded flex items-center justify-center flex-shrink-0">
                              <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                              <p className="text-xs text-gray-500">{(file.size / 1024).toFixed(2)} KB</p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setAvatarUploadFiles(prev => prev.filter((_, i) => i !== index));
                            }}
                            className="ml-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                            title="Remove file"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAvatarUploadPopup(false);
                      setAvatarUploadFiles([]);
                    }}
                    className="px-4 py-2 rounded-lg border text-sm hover:bg-gray-50"
                    disabled={isUploadingAvatarFiles}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      try {
                        if (avatarUploadFiles.length === 0) {
                          alert('Please select at least one file to upload');
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
                        form.append('file_type', 'avatar');
                        avatarUploadFiles.forEach(file => {
                          form.append('files', file);
                        });
                        
                        const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/upload-file', {
                          method: 'POST',
                          body: form
                        });
                        
                        const text = await resp.text();
                        if (!resp.ok) {
                          throw new Error(`Upload failed: ${resp.status} ${text}`);
                        }
                        
                        // Re-call brand assets GET API
                        const getResp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`);
                        const getText = await getResp.text();
                        let data;
                        try { data = JSON.parse(getText); } catch(_) { data = getText; }
                        
                        if (getResp.ok && data && typeof data === 'object') {
                          const avatars = Array.isArray(data?.avatars) ? data.avatars : [];
                          setBrandAssetsAvatars(avatars);
                          // Update cache
                          try {
                            const cacheKey = `brand_assets_images:${token}`;
                            const cached = localStorage.getItem(cacheKey);
                            let cachedData = {};
                            if (cached) {
                              try { cachedData = JSON.parse(cached); } catch(_) {}
                            }
                            cachedData.avatars = avatars;
                            localStorage.setItem(cacheKey, JSON.stringify(cachedData));
                          } catch(_) {}
                        }
                        
                        // Close popup and reset
                        setShowAvatarUploadPopup(false);
                        setAvatarUploadFiles([]);
                        alert('Avatar uploaded successfully!');
                      } catch (err) {
                        console.error('Avatar upload failed:', err);
                        alert('Failed to upload avatar: ' + (err?.message || 'Unknown error'));
                      } finally {
                        setIsUploadingAvatarFiles(false);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isUploadingAvatarFiles || avatarUploadFiles.length === 0}
                  >
                    {isUploadingAvatarFiles ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        Uploading...
                      </span>
                    ) : (
                      'Upload Avatar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};

export default Chat;
