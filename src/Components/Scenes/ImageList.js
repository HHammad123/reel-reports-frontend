import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronDown, Pencil, RefreshCw, Upload, File as FileIcon, X } from 'lucide-react';
import ImageEditor from './ImageEditor';
import ImageEdit from '../../pages/ImageEdit';
import html2canvas from 'html2canvas';
import ChartEditorModal from './ChartEditorModal';
import useOverlayBackgroundRemoval from '../../hooks/useOverlayBackgroundRemoval';
import Loader from '../Loader';
import { normalizeGeneratedMediaResponse } from '../../utils/generatedMediaUtils';
import { useProgressLoader } from '../../hooks/useProgressLoader';

// Preset Voice Options
const PRESET_VOICE_OPTIONS = {
  "male": [
    { "key": "american_male", "name": "Max - eLearning & Documentary", "url": "https://elevenlabs.io/app/voice-library?voiceId=Gfpl8Yo74Is0W6cPUWWT" },
    { "key": "british_male", "name": "William - Premium British Narrator", "url": "https://elevenlabs.io/app/voice-library?voiceId=NmpxQl3ZUbfh8HgoNCGM" },
    { "key": "arabic_male", "name": "Radwan - Soft narrative & conversational", "url": "https://elevenlabs.io/app/voice-library?voiceId=8KVwlbLHGvmAEpy5b8PM" },
    { "key": "african_american_male", "name": "Tyre G - Perfect for narrations & social media", "url": "https://elevenlabs.io/app/voice-library?voiceId=YjlcD3XHztjJEo2wNszv" },
    { "key": "german_male", "name": "Thomas Fischer - Authentic German", "url": "https://elevenlabs.io/app/voice-library?voiceId=oIrReGAWJuGKVf4DxEt8" },
    { "key": "chinese_male", "name": "Victor Lau", "url": "https://elevenlabs.io/app/voice-library?voiceId=8xsdoepm9GrzPPzYsiLP" },
    { "key": "french_male", "name": "English with French Accent Narration", "url": "https://elevenlabs.io/app/voice-library?voiceId=sa2z6gEuOalzawBHvrCV" },
    { "key": "indian_male", "name": "Thoughtsalot - Authentic Executive Authority", "url": "https://elevenlabs.io/app/voice-library?voiceId=gad8DmXGyu7hwftX9JqI" },
    { "key": "italian_male", "name": "Antonio - English with Subtle Italian Acc", "url": "https://elevenlabs.io/app/voice-library?voiceId=iLVmqjzCGGvqtMCk6vVQ" },
    { "key": "russian_male", "name": "Nik Ivanov", "url": "https://elevenlabs.io/app/voice-library?voiceId=3faLw6tqzw5w1UZMFTgL" }
  ],
  "female": [
    { "key": "american_female", "name": "Michalia Schwartz", "url": "https://elevenlabs.io/app/voice-library?voiceId=acCWxmzPBgXdHwA63uzP" },
    { "key": "british_female", "name": "Victoria - Senior British Female Actress", "url": "https://elevenlabs.io/app/voice-library?voiceId=IZnNrZQBS9lhLjXgYVT8" },
    { "key": "arabic_female", "name": "Salma - Conversational Expressive Voice", "url": "https://elevenlabs.io/app/voice-library?voiceId=aCChyB4P5WEomwRsOKRh" },
    { "key": "african_american_female", "name": "Misha - Podcast Host & Storytelling", "url": "https://elevenlabs.io/app/voice-library?voiceId=DXX4Q5Bh1vqK8CciYVPf" },
    { "key": "german_female", "name": "Ellen", "url": "https://elevenlabs.io/app/voice-library?voiceId=BIvP0GN1cAtSRTxNHnWS" },
    { "key": "chinese_female", "name": "Stacy - Sweet", "url": "https://elevenlabs.io/app/voice-library?voiceId=jGf6Nvwr7qkFPrcLThmD" },
    { "key": "french_female", "name": "Marina viva muse", "url": "https://elevenlabs.io/app/voice-library?voiceId=1hIScOW98xkqE5ttC10C" },
    { "key": "indian_female", "name": "Monika Sogam", "url": "https://elevenlabs.io/app/voice-library?voiceId=7xOqQceOZC5dhvkaqKtD" },
    { "key": "italian_female", "name": "Ginevra - Soothing Italian Hue", "url": "https://elevenlabs.io/app/voice-library?voiceId=75MqelvgFq5upx0r44WK" },
    { "key": "russian_female", "name": "Nadya", "url": "https://elevenlabs.io/app/voice-library?voiceId=GCPLhb1XrVwcoKUJYcvz" }
  ]
};

// Helper functions for asset modal (from Chat.js)
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

// Helper function to parse description into sections (title/description format)
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

// Helper function to truncate text to max words
const truncateText = (text, maxWords = 9) => {
  if (!text || typeof text !== 'string') return text;
  const words = text.trim().split(/\s+/);
  if (words.length <= maxWords) return text;
  return words.slice(0, maxWords).join(' ') + '...';
};

// Helper function to format description for display (hides ** marks, shows bold titles)
const formatDescription = (description, truncate = false) => {
  const sections = parseDescription(description);

  // If no sections found, return original (truncated if needed)
  if (sections.length === 0) {
    const displayText = truncate ? truncateText(description) : description;
    return <div className="text-sm text-gray-600 whitespace-pre-wrap">{displayText}</div>;
  }

  // Render formatted sections - each title and description in separate divs, one below another
  return (
    <div className="space-y-4">
      {sections.map((section, index) => {
        if (section.type === 'section') {
          const displayContent = truncate ? truncateText(section.content) : section.content;
          return (
            <div key={index} className="border-b border-gray-200 pb-3 last:border-b-0 last:pb-0">
              <div className="text-sm font-bold text-gray-800 mb-2">
                {section.title}
              </div>
              <div className="text-sm text-gray-600 whitespace-pre-wrap leading-relaxed pl-0">
                {displayContent}
              </div>
            </div>
          );
        } else {
          const displayContent = truncate ? truncateText(section.content) : section.content;
          return (
            <div key={index} className="text-sm text-gray-600 whitespace-pre-wrap">{displayContent}</div>
          );
        }
      })}
    </div>
  );
};

const normalizeAspectRatioValue = (ratio, fallback = '16:9') => {
  if (!ratio || typeof ratio !== 'string') return fallback;
  // Normalize common separators: space, underscore, "x", "/", ":"
  const cleaned = ratio.replace(/\s+/g, '').replace(/_/g, ':');
  const match = cleaned.match(/(\d+(?:\.\d+)?)[:/xX](\d+(?:\.\d+)?)/);
  if (match) {
    const w = Number(match[1]);
    const h = Number(match[2]);
    if (w > 0 && h > 0) return `${w}:${h}`;
  }
  const lower = cleaned.toLowerCase();
  if (lower === '9:16' || lower === '9x16') return '9:16';
  if (lower === '16:9' || lower === '16x9') return '16:9';
  return fallback;
};

const aspectRatioToCss = (ratio) => {
  const normalized = normalizeAspectRatioValue(ratio);
  const [w, h] = normalized.split(':').map(Number);
  if (w > 0 && h > 0) return `${w} / ${h}`;
  return '16 / 9';
};

const ImageList = ({ jobId, onClose, onGenerateVideos, hasVideos = false, onGoToVideos }) => {
  const getOverlayBackgroundRemovedUrl = useOverlayBackgroundRemoval(245);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState({
    index: 0,
    imageUrl: '',
    images: [],
    title: '',
    sceneNumber: '',
    description: '',
    narration: '',
    textToBeIncluded: '',
    prompts: { opening_frame: {}, closing_frame: {} },
    imageDimensions: null,
    textElements: [],
    imageVersionData: null,
    imageFrames: [],
    isEditable: false
  });
  const [isPreparingDownloads, setIsPreparingDownloads] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isPolling, setIsPolling] = useState(false); // Track if we're polling job-status
  const [error, setError] = useState('');
  const [showEditor, setShowEditor] = useState(false);
  const [editorData, setEditorData] = useState(null);
  const [showPromptsAccordion, setShowPromptsAccordion] = useState(false);
  const [showImageEdit, setShowImageEdit] = useState(false);
  const [editingImageFrame, setEditingImageFrame] = useState(null); // Store the frame being edited
  const [editingSceneNumber, setEditingSceneNumber] = useState(null); // Store scene number for the image being edited
  const [editingImageIndex, setEditingImageIndex] = useState(null); // Store image index (0 for Image 1, 1 for Image 2)
  const [showRegeneratePopup, setShowRegeneratePopup] = useState(false);
  const [regenerateUserQuery, setRegenerateUserQuery] = useState('');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const [regeneratingSceneNumber, setRegeneratingSceneNumber] = useState(null);
  // New regenerate options
  const [regenerateFrames, setRegenerateFrames] = useState(['opening', 'closing']); // For SORA: ['opening'], ['closing'], or both
  const [regenerateSaveAsNewVersion, setRegenerateSaveAsNewVersion] = useState(false);
  // Reference image upload for regenerate
  const [regenerateReferenceFile, setRegenerateReferenceFile] = useState([]);
  const [regenerateReferencePreview, setRegenerateReferencePreview] = useState([]);
  // VEO3 Avatar management
  const [showAvatarManager, setShowAvatarManager] = useState(false);
  const [managingAvatarSceneNumber, setManagingAvatarSceneNumber] = useState(null);
  const [avatarUrls, setAvatarUrls] = useState(['', '']); // Array of avatar URLs
  const [isUpdatingAvatars, setIsUpdatingAvatars] = useState(false);
  const [brandAssetsAvatars, setBrandAssetsAvatars] = useState([]);
  const [isLoadingAvatars, setIsLoadingAvatars] = useState(false);
  const [showAvatarUploadPopup, setShowAvatarUploadPopup] = useState(false);
  const [avatarUploadFiles, setAvatarUploadFiles] = useState([]);
  const [isUploadingAvatarFiles, setIsUploadingAvatarFiles] = useState(false);
  const [avatarName, setAvatarName] = useState('');
  const [showRegenerateAvatarPopup, setShowRegenerateAvatarPopup] = useState(false);
  const [regeneratingAvatarSceneNumber, setRegeneratingAvatarSceneNumber] = useState(null);
  const [regenerateAvatarUserQuery, setRegenerateAvatarUserQuery] = useState('');
  const [regenerateAvatarSaveAsNew, setRegenerateAvatarSaveAsNew] = useState(false);
  const [regenerateAvatarName, setRegenerateAvatarName] = useState('');
  const [isGeneratingAvatar, setIsGeneratingAvatar] = useState(false);
  const avatarUploadFileInputRef = useRef(null);
  // Upload background state
  const [showUploadBackgroundPopup, setShowUploadBackgroundPopup] = useState(false);
  const [uploadedBackgroundFile, setUploadedBackgroundFile] = useState(null);
  const [uploadedBackgroundPreview, setUploadedBackgroundPreview] = useState(null);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [uploadingBackgroundSceneNumber, setUploadingBackgroundSceneNumber] = useState(null);
  const [uploadFrames, setUploadFrames] = useState(['background']); // For upload: ['opening'], ['closing'], ['background'], or combinations
  // User query popup state for generate from reference
  const [showUserQueryPopup, setShowUserQueryPopup] = useState(false);
  const [userQuery, setUserQuery] = useState('');
  const [isGeneratingFromReference, setIsGeneratingFromReference] = useState(false);

  // Asset modal state (for background selection)
  const [assetsData, setAssetsData] = useState({ logos: [], icons: [], uploaded_images: [], templates: [], documents_images: [] });
  const [assetsTab, setAssetsTab] = useState('preset_templates');
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  const [selectedAssetUrl, setSelectedAssetUrl] = useState('');
  const [selectedTemplateUrls, setSelectedTemplateUrls] = useState([]);
  const [showUploadPopup, setShowUploadPopup] = useState(false);
  const [uploadPopupTab, setUploadPopupTab] = useState('image');
  const assetsUploadInputRef = useRef(null);
  const assetImageUploadRef = useRef(null);
  const assetPptxUploadRef = useRef(null);
  const [pendingUploadType, setPendingUploadType] = useState('uploaded_image');
  const [convertColors, setConvertColors] = useState(true);
  const [generatedImagesData, setGeneratedImagesData] = useState({ generated_images: {} });
  const [isLoadingGeneratedImages, setIsLoadingGeneratedImages] = useState(false);
  const [imageNaturalDims, setImageNaturalDims] = useState({});
  const [isSceneUpdating, setIsSceneUpdating] = useState(false);
  // Edit description/narration state
  const [editingField, setEditingField] = useState(null); // 'description' | 'narration' | null
  const [editedDescription, setEditedDescription] = useState('');
  const [editedNarration, setEditedNarration] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);
  const [isSavingAnimationDesc, setIsSavingAnimationDesc] = useState(false);
  const [isEditingAnimationDesc, setIsEditingAnimationDesc] = useState({}); // { sceneNumber: true/false }
  const [editableAnimationDesc, setEditableAnimationDesc] = useState({}); // { sceneNumber: { lighting: '', ... } }
  // Track if regenerate popup is for editing description
  const [isRegenerateForDescription, setIsRegenerateForDescription] = useState(false);
  // Description editing state (for new UI)
  const [isDescriptionEditing, setIsDescriptionEditing] = useState(false);
  const [descriptionSceneIndex, setDescriptionSceneIndex] = useState(null);
  const [editableSections, setEditableSections] = useState([]);
  const [isSavingDescription, setIsSavingDescription] = useState(false);
  // VEO3 prompt template editing state
  const [isEditingVeo3Template, setIsEditingVeo3Template] = useState(false);
  const [editableVeo3Template, setEditableVeo3Template] = useState({});
  const [isSavingVeo3Template, setIsSavingVeo3Template] = useState(false);
  const [showChartEditor, setShowChartEditor] = useState(false);
  const [chartEditorData, setChartEditorData] = useState(null);
  const [chartEditorLoading, setChartEditorLoading] = useState(false);
  const [chartEditorError, setChartEditorError] = useState('');

  const handleSaveNarration = async () => {
    if (!selected) return;
    setIsSavingField(true);
    try {
      const user_id = localStorage.getItem('token');
      const session_id = localStorage.getItem('session_id');
      const scene_number = selected?.sceneNumber || selected?.scene_number || 1;

      if (!user_id || !session_id) {
        throw new Error('Missing user_id or session_id');
      }

      const sessionDataResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, session_id })
      });

      const sessionDataText = await sessionDataResp.text();
      let sessionData;
      try {
        sessionData = JSON.parse(sessionDataText);
      } catch {
        sessionData = sessionDataText;
      }

      if (!sessionDataResp.ok) {
        throw new Error(`Failed to fetch session data: ${sessionDataResp.status} ${JSON.stringify(sessionData)}`);
      }

      const fullSessionData = sessionData?.session_data || sessionData?.session || {};
      const fullUserData = sessionData?.user_data || sessionData?.user || {};

      let normalizedSession = {};
      if (fullSessionData && Object.keys(fullSessionData).length > 0) {
        normalizedSession = { ...fullSessionData };
        if (normalizedSession.id && !normalizedSession.session_id) {
          normalizedSession.session_id = normalizedSession.id;
          delete normalizedSession.id;
        }
        if (!normalizedSession.session_id) {
          normalizedSession.session_id = session_id;
        }
      } else {
        normalizedSession = {
          session_id: session_id,
          user_id: user_id,
          title: '',
          video_duration: '60',
          created_at: '',
          updated_at: '',
          document_summary: [],
          messages: [],
          total_summary: [],
          scripts: [],
          videos: [],
          images: [],
          final_link: {},
          videoType: '',
          brand_style_interpretation: {},
          ...sessionAssets
        };
      }

      const session = normalizedSession;

      const user = fullUserData && Object.keys(fullUserData).length > 0
        ? fullUserData
        : {
          id: user_id,
          email: '',
          display_name: '',
          created_at: '',
          avatar_url: '',
          folder_url: '',
          brand_identity: {},
          tone_and_voice: {},
          look_and_feel: {},
          templates: [],
          voiceover: Array.isArray(brandAssets?.voiceover) ? brandAssets.voiceover : []
        };

      const nextNarration = (editedNarration || '').trim();

      const payload = {
        user,
        session,
        scene_number: Number(scene_number),
        field_name: 'narration',
        new_value: nextNarration
      };

      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-scene-field', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch {
        data = text;
      }

      if (!response.ok) {
        throw new Error(`Update failed: ${response.status} ${JSON.stringify(data)}`);
      }

      setSelected(prev => {
        if (!prev) return prev;
        return { ...prev, narration: nextNarration };
      });

      setRows(prevRows => prevRows.map(row => {
        const rowSceneNumber = row?.scene_number || row?.sceneNumber;
        if (String(rowSceneNumber) === String(scene_number)) {
          return { ...row, narration: nextNarration };
        }
        return row;
      }));

      setEditingField(null);
      setEditedNarration('');
      setError('');
    } catch (error) {
      console.error('Failed to update narration:', error);
      setError('Failed to update narration: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsSavingField(false);
    }
  };
  // State for session assets (logo and voiceover)
  const [sessionAssets, setSessionAssets] = useState({ logo_url: '', voice_url: '', voice_urls: {} });
  // State for brand assets
  const [brandAssets, setBrandAssets] = useState(null);
  // State for scripts data (to access when scene is selected)
  const [scriptsData, setScriptsData] = useState([]);
  // State for script tone (for matching voiceovers)
  const [scriptTone, setScriptTone] = useState('');
  // State for transition presets
  const [transitionPresets, setTransitionPresets] = useState([]);
  // State for scene-specific advanced options
  const [sceneAdvancedOptions, setSceneAdvancedOptions] = useState({}); // { sceneNumber: { logoNeeded: false, voiceUrl: '', voiceOption: 'male', transitionPreset: null, transitionCustom: null, transitionCustomPreset: null, customDescription: '', customPreservationNotes: {}, subtitleSceneOnly: false, rememberCustomPreset: false, customPresetName: '' } }
  // Global subtitles toggle (applies to all scenes)
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(true);
  // State for accordion visibility
  const [showAdvancedOptions, setShowAdvancedOptions] = useState({}); // { sceneNumber: { assets: false, transitions: false } }
  // State for "Design your own" tabs
  const [designYourOwnTab, setDesignYourOwnTab] = useState({}); // { sceneNumber: 'describe' | 'fill' }
  // State for hovered preset info button
  const [hoveredPresetInfo, setHoveredPresetInfo] = useState({}); // { sceneNumber: presetName }
  // State for video generation progress overlay
  const [videoGenProgress, setVideoGenProgress] = useState({
    visible: false,
    percent: 0,
    status: '',
    step: '',
    jobId: null,
    message: ''
  });
  const [showVideoRedirectPopup, setShowVideoRedirectPopup] = useState(false);
  const [videoRedirectCountdown, setVideoRedirectCountdown] = useState(5);
  const [pendingVideoJobId, setPendingVideoJobId] = useState(null);
  const [questionnaireAspectRatio, setQuestionnaireAspectRatio] = useState('');
  const cssAspectRatio = React.useMemo(
    () => aspectRatioToCss(questionnaireAspectRatio),
    [questionnaireAspectRatio]
  );
  const isPortrait9x16 = React.useMemo(
    () => normalizeAspectRatioValue(questionnaireAspectRatio || '16:9') === '9:16',
    [questionnaireAspectRatio]
  );

  // Progress bars for loaders using useProgressLoader hook
  const generatingStoryboardProgress = useProgressLoader(isLoading && isPolling, 95, 60000);
  const regeneratingProgress = useProgressLoader(isRegenerating, 95, 45000);
  const generatingFromReferenceProgress = useProgressLoader(isGeneratingFromReference, 95, 45000);
  const uploadingBackgroundProgress = useProgressLoader(isUploadingBackground, 95, 30000);
  const uploadingAvatarFilesProgress = useProgressLoader(isUploadingAvatarFiles, 95, 25000);
  const savingFieldProgress = useProgressLoader(isSavingField, 95, 10000);
  const savingVeo3TemplateProgress = useProgressLoader(isSavingVeo3Template, 95, 15000);
  const sceneUpdatingProgress = useProgressLoader(isSceneUpdating, 95, 15000);
  const savingAnimationDescProgress = useProgressLoader(isSavingAnimationDesc, 95, 15000);
  const savingDescriptionProgress = useProgressLoader(isSavingDescription, 95, 10000);
  const activeSceneNumber = selected?.sceneNumber || selected?.scene_number || 1;

  // Preset avatars (same as Chat.js)
  const presetAvatars = React.useMemo(
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

  // Human names for preset avatars (same as Chat.js)
  const presetAvatarNames = React.useMemo(
    () => ({
      'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/1.png': 'Noor',
      'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/2.png': 'Manal',
      'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/3.png': 'Natasha',
      'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/4.png': 'Dawood',
      'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/5.png': 'Rajveer',
      'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/6.png': 'Nada',
      'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/7.png': 'Samir'
    }),
    []
  );

  // Browser-based image storage (workaround for server temp folder)
  // Maps fileName -> Blob
  const imageStorageRef = useRef(new Map());
  const selectedModel = String(selected?.model || selected?.mode || '').toUpperCase();
  const isAnchorModel = selectedModel === 'ANCHOR';

  // Helper functions for model detection and frame management
  const getSceneModel = useCallback((sceneNumber) => {
    const scene = rows.find(r => (r.scene_number || r.sceneNumber) === sceneNumber);
    const model = String(scene?.model || scene?.mode || '').toUpperCase();
    // If model is not found, try to use the currently selected scene's model as fallback
    if (!model && selected && (selected.sceneNumber === sceneNumber || selected.scene_number === sceneNumber)) {
      return String(selected?.model || selected?.mode || 'SORA').toUpperCase();
    }
    // Default to SORA if still not found
    return model || 'SORA';
  }, [rows, selected]);

  const isVEO3Model = useCallback((model) => model === 'VEO3', []);
  const isSORAModel = useCallback((model) => model === 'SORA', []);
  const isANCHORModel = useCallback((model) => model === 'ANCHOR', []);

  const getFramesForModel = useCallback((model) => {
    if (isSORAModel(model)) {
      return { hasOpening: true, hasClosing: true, hasBackground: false };
    } else if (isVEO3Model(model) || isANCHORModel(model)) {
      return { hasOpening: false, hasClosing: false, hasBackground: true };
    }
    return { hasOpening: false, hasClosing: false, hasBackground: false };
  }, [isSORAModel, isVEO3Model, isANCHORModel]);

  const dedupeImages = useCallback((arr = []) => {
    const seen = new Set();
    const out = [];
    arr.forEach((url) => {
      const clean = typeof url === 'string' ? url.trim() : '';
      if (!clean) return;
      if (seen.has(clean)) return;
      seen.add(clean);
      out.push(clean);
    });
    return out;
  }, []);

  // Temporarily hide text overlays while capturing DOM so text is not baked into frames.
  const hideTextOverlaysForCapture = useCallback(() => {
    const selectors = [
      '[data-text-overlay]',
      '.text-overlay',
      '.overlay-text',
      '[data-role="text"]',
      '[data-type="text"]',
      '.text-element',
      '[data-overlay-type="text"]'
    ];
    const affected = [];
    try {
      selectors.forEach((sel) => {
        document.querySelectorAll(sel).forEach((el) => {
          if (!el || affected.some(([target]) => target === el)) return;
          const prevVisibility = el.style.visibility;
          affected.push([el, prevVisibility]);
          el.style.visibility = 'hidden';
        });
      });
    } catch (err) {
      console.warn('Failed to hide text overlays for capture', err);
    }
    return () => {
      affected.forEach(([el, prev]) => {
        if (!el) return;
        el.style.visibility = prev || '';
      });
    };
  }, []);

  // Temporarily hide chart elements (only chart overlays) so they are not baked into captures.
  const hideChartOverlaysForCapture = useCallback(() => {
    const affected = [];
    try {
      const candidates = Array.from(
        document.querySelectorAll(
          [
            '[data-chart-overlay="true"]',
            '[data-overlay-id="chart_overlay"]',
            '[data-overlay-label="Chart"]',
            '[data-overlay-model="PLOTLY"]',
            'img[alt="overlay"][src*="chart"]'
          ].join(',')
        )
      );
      candidates.forEach((el) => {
        if (!el || affected.some(([target]) => target === el)) return;
        const prevVisibility = el.style.visibility;
        affected.push([el, prevVisibility]);
        el.style.visibility = 'hidden';
      });
    } catch (err) {
      console.warn('Failed to hide chart overlays for capture', err);
    }
    return () => {
      affected.forEach(([el, prev]) => {
        if (!el) return;
        el.style.visibility = prev || '';
      });
    };
  }, []);

  // State for active image tab (0 for Image 1/Avatar, 1 for Image 2/Image)
  const [activeImageTab, setActiveImageTab] = useState(0);
  // Cache-busting state for chart overlays - bump when scene or chart data changes
  const [chartVersion, setChartVersion] = useState(0);

  // normalizeImageUrl - moved before getOrderedRefs to fix initialization order
  const normalizeImageUrl = useCallback((url) => {
    if (!url || typeof url !== 'string') return ''
    return url.trim().split('?')[0].replace(/\/$/, '')
  }, [])

  // getOrderedRefs - moved before useEffect that uses it to fix initialization order
  const getOrderedRefs = useCallback((row) => {
    const modelUpper = String(row?.model || '').toUpperCase()

    // ALWAYS prioritize imageFrames from current version
    const frames = Array.isArray(row?.imageFrames) ? row.imageFrames : []

    // For SORA, VEO3, ANCHOR: Extract from imageFrames (current version)
    if (modelUpper === 'SORA' || modelUpper === 'VEO3' || modelUpper === 'ANCHOR') {
      if (frames.length > 0) {
        const imageUrls = frames
          .map((frame) => {
            const base = frame?.base_image || frame?.baseImage || {}
            return base?.image_url || base?.imageUrl || base?.imageurl || base?.url || base?.src || ''
          })
          .filter(Boolean)

        if (imageUrls.length > 0) {
          // For ANCHOR: ensure we have two items for two tabs
          if (modelUpper === 'ANCHOR') {
            if (imageUrls.length === 1) {
              return [...imageUrls, imageUrls[0]]
            }
            return imageUrls.slice(0, 2)
          }
          // For SORA/VEO3: return all images from current version
          return imageUrls
        }
      }
      // If no frames, return empty (don't fallback to old refs)
      return []
    }

    // For PLOTLY: use frames from current version
    if (modelUpper === 'PLOTLY') {
      if (!frames.length) return []
      const frameEntries = frames
        .map((frame) => {
          const base = frame?.base_image || frame?.baseImage || {}
          const url =
            base?.image_url ||
            base?.imageUrl ||
            base?.imageurl ||
            base?.url ||
            base?.src ||
            frame?.image_url ||
            frame?.imageUrl ||
            frame?.url ||
            ''
          const normalizedUrl = normalizeImageUrl(url)
          if (!normalizedUrl) return null
          const textEls = Array.isArray(frame?.text_elements)
            ? frame.text_elements
            : Array.isArray(frame?.textElements)
              ? frame.textElements
              : []
          const hasText = textEls.some((el) => {
            const txt = typeof el?.text === 'string' ? el.text.trim() : ''
            return txt.length > 0
          })
          return { url, normalizedUrl, hasText }
        })
        .filter(Boolean)
      if (!frameEntries.length) return []
      const noText = []
      const withText = []
      frameEntries.forEach(({ url, hasText }) => {
        if (hasText) {
          withText.push(url)
        } else {
          noText.push(url)
        }
      })
      // Return only from current version frames (no fallback to old refs)
      const ordered = [...noText, ...withText]
      return ordered.length > 0 ? ordered : []
    }

    // For any other model, return empty (no fallback to old refs)
    return []
  }, [normalizeImageUrl])

  // Helper function to get the latest version key from imageVersionData (e.g., v1, v2, v3 -> returns highest)
  // Moved before getAvatarUrlsFromImageVersion and getAvatarUrlSet to fix initialization order
  const getLatestVersionKey = (imageVersionData) => {
    if (!imageVersionData || typeof imageVersionData !== 'object' || Array.isArray(imageVersionData)) {
      return 'v1';
    }

    // Get all version keys (v1, v2, v3, etc.)
    const versionKeys = Object.keys(imageVersionData).filter(key =>
      /^v\d+$/.test(key) && imageVersionData[key] && typeof imageVersionData[key] === 'object'
    );

    if (versionKeys.length === 0) {
      return 'v1';
    }

    // Sort by version number (extract number from v1, v2, etc.) and return the highest
    const sorted = versionKeys.sort((a, b) => {
      const numA = parseInt(a.replace('v', '')) || 0;
      const numB = parseInt(b.replace('v', '')) || 0;
      return numB - numA; // Descending order
    });

    return sorted[0] || 'v1';
  };

  // Helper function to extract avatar URLs from latest version of image object
  // Moved before useEffect that uses it to fix initialization order
  const getAvatarUrlsFromImageVersion = (imageVersionData, currentVersion, model) => {
    const modelUpper = String(model || '').toUpperCase();
    const isVEO3 = modelUpper === 'VEO3' || modelUpper === 'ANCHOR';

    if (!isVEO3 || !imageVersionData) {
      return [];
    }

    // Extract avatar URLs from session data images structure (same as list area)
    // Structure: it.images[current_version].avatar_urls
    if (typeof imageVersionData === 'object' && !Array.isArray(imageVersionData)) {
      // Get the latest version key (always use latest version)
      const versionKey = getLatestVersionKey(imageVersionData);

      // Get the version object (same as: imagesContainer[versionKey] in list area)
      const versionObj = imageVersionData[versionKey] || {};

      // Extract avatar_urls from current version (same as: verObj?.avatar_urls in list area)
      let avatarUrls = versionObj?.avatar_urls;

      // If not found in version object, check root level (fallback)
      if (!avatarUrls || !Array.isArray(avatarUrls) || avatarUrls.length === 0) {
        avatarUrls = imageVersionData?.avatar_urls;
      }

      if (Array.isArray(avatarUrls) && avatarUrls.length > 0) {
        // Map avatar URLs exactly as done in list area (lines 2117-2129)
        const extracted = avatarUrls.map((av) => {
          if (typeof av === 'string') return av.trim();
          return (
            av?.imageurl ||
            av?.imageUrl ||
            av?.image_url ||
            av?.url ||
            av?.src ||
            av?.link ||
            av?.avatar_url ||
            ''
          );
        }).filter(url => url && typeof url === 'string' && url.trim());

        return extracted;
      }
    }

    return [];
  }

  // normalizeSimpleUrl - moved before getAvatarUrlSet to fix initialization order
  const normalizeSimpleUrl = useCallback((url) => (typeof url === 'string' ? url.trim() : ''), [])

  // getAvatarUrlSet - moved before useEffect that uses it to fix initialization order
  const getAvatarUrlSet = useCallback(
    (row) => {
      const avatarUrls = [];

      // Priority 1: Get from row.avatar_urls
      if (Array.isArray(row?.avatar_urls)) {
        avatarUrls.push(...row.avatar_urls);
      }

      // Priority 2: Extract from versioned structure (imageVersionData[current_version].avatar_urls)
      if (row?.imageVersionData && typeof row.imageVersionData === 'object') {
        let imagesContainer = row.imageVersionData;

        // Check if imageVersionData has the images container structure (it.images)
        if (row.imageVersionData.images && typeof row.imageVersionData.images === 'object' && !Array.isArray(row.imageVersionData.images)) {
          imagesContainer = row.imageVersionData.images;
        }

        // Get latest version key (always use latest version)
        const versionKey = getLatestVersionKey(imagesContainer);

        // Get version object
        const verObj = imagesContainer[versionKey] || {};

        // Extract avatar_urls from version object
        const versionAvatars = verObj?.avatar_urls;

        if (Array.isArray(versionAvatars) && versionAvatars.length > 0) {
          avatarUrls.push(...versionAvatars);
        }
      }

      // Normalize and deduplicate all avatar URLs
      const normalizedUrls = avatarUrls
        .map((entry) => {
          if (typeof entry === 'string') return normalizeSimpleUrl(entry);
          return normalizeSimpleUrl(
            entry?.imageurl ||
            entry?.imageUrl ||
            entry?.image_url ||
            entry?.url ||
            entry?.src ||
            entry?.link ||
            entry?.avatar_url ||
            ''
          );
        })
        .filter(Boolean);

      return new Set(normalizedUrls);
    },
    [normalizeSimpleUrl]
  )

  // Handle tab switching for VEO3 + 9:16 aspect ratio
  React.useEffect(() => {
    if (!selected || !selected.model) return;

    const selectedModel = String(selected.model || selected.mode || '').toUpperCase();
    const isVeoScene = selectedModel === 'VEO3';
    const isVeo3Portrait = isVeoScene && isPortrait9x16;

    if (!isVeo3Portrait) return;

    // Get current row to check for avatar and image
    const currentRow = rows.find(r =>
      (r?.scene_number || r?.sceneNumber) === (selected?.sceneNumber || selected?.scene_number)
    ) || rows[selected.index];

    if (!currentRow) return;

    // Get avatar URLs
    const avatarUrls = getAvatarUrlsFromImageVersion(
      currentRow?.imageVersionData,
      currentRow?.imageVersionData ? getLatestVersionKey(currentRow.imageVersionData) : 'v1',
      selectedModel
    );
    const hasAvatar = avatarUrls.length > 0 || (Array.isArray(currentRow?.avatar_urls) && currentRow.avatar_urls.length > 0);

    // Get image refs (non-avatar images)
    const orderedRefs = getOrderedRefs(currentRow);
    const avatarSet = getAvatarUrlSet(currentRow);
    const nonAvatarImages = orderedRefs.filter(url => {
      const normalized = normalizeSimpleUrl(url);
      return normalized && !avatarSet.has(normalized);
    });
    const hasImage = nonAvatarImages.length > 0;

    // Set active tab based on what's available
    if (hasAvatar && activeImageTab !== 1) {
      setActiveImageTab(1);
    } else if (!hasAvatar && hasImage && activeImageTab !== 0) {
      setActiveImageTab(0);
    }
  }, [selected, rows, isPortrait9x16, activeImageTab, getOrderedRefs, getAvatarUrlSet, normalizeSimpleUrl, getAvatarUrlsFromImageVersion]);
  const chartCacheBuster = React.useMemo(() => {
    return `${activeSceneNumber}_${chartVersion}_${Date.now()}`;
  }, [activeSceneNumber, chartVersion]);
  const redirectIntervalRef = React.useRef(null);
  const sceneUpdateTimeoutRef = useRef(null);

  useEffect(() => {
    if (!rows.length || !transitionPresets.length) return;
    setSceneAdvancedOptions((prev) => {
      let changed = false;
      const next = { ...prev };
      rows.forEach((row, idx) => {
        const sceneNumber = row?.scene_number || row?.sceneNumber || idx + 1;
        const existing = next[sceneNumber] || {};
        let updated = existing;
        // Removed default preset selection - no preset should be selected by default
        if (!updated.voiceOption) {
          updated = { ...updated, voiceOption: PRESET_VOICE_OPTIONS.male[0]?.key || 'american_male' };
          changed = true;
        } else if (updated.voiceOption === 'male' || updated.voiceOption === 'female') {
          // Convert old format to new key format
          const gender = updated.voiceOption;
          updated = { ...updated, voiceOption: PRESET_VOICE_OPTIONS[gender]?.[0]?.key || (gender === 'male' ? 'american_male' : 'american_female') };
          changed = true;
        } else {
          // Validate that the voiceOption key exists in preset voices
          const isValidKey = PRESET_VOICE_OPTIONS.male.some(v => v.key === updated.voiceOption) ||
            PRESET_VOICE_OPTIONS.female.some(v => v.key === updated.voiceOption);
          if (!isValidKey) {
            // Invalid key, reset to default male voice
            updated = { ...updated, voiceOption: PRESET_VOICE_OPTIONS.male[0]?.key || 'american_male' };
            changed = true;
          }
        }
        if (updated !== existing) {
          next[sceneNumber] = updated;
        }
      });
      return changed ? next : prev;
    });
  }, [rows, transitionPresets]);

  const startVideoRedirectFlow = React.useCallback(
    (jobId) => {
      if (!jobId) return;
      try {
        localStorage.setItem('current_video_job_id', jobId);
      } catch (err) {
      }
      setPendingVideoJobId(jobId);
      setVideoRedirectCountdown(5);
      setShowVideoRedirectPopup(true);
      setVideoGenProgress({
        visible: false,
        percent: 0,
        status: '',
        step: '',
        jobId,
        message: ''
      });
      if (redirectIntervalRef.current) {
        clearInterval(redirectIntervalRef.current);
      }
      redirectIntervalRef.current = setInterval(() => {
        setVideoRedirectCountdown((prev) => {
          if (prev <= 1) {
            if (redirectIntervalRef.current) {
              clearInterval(redirectIntervalRef.current);
              redirectIntervalRef.current = null;
            }
            setShowVideoRedirectPopup(false);
            setVideoGenProgress({
              visible: false,
              percent: 0,
              status: '',
              step: '',
              jobId: null,
              message: ''
            });
            if (typeof onGoToVideos === 'function') {
              onGoToVideos(jobId);
            } else if (typeof onGenerateVideos === 'function') {
              onGenerateVideos(jobId);
            }
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    },
    [onGoToVideos, onGenerateVideos]
  );

  const getVideoProgressLabel = React.useCallback(() => {
    if (!videoGenProgress.visible && !isPreparingDownloads) return 'Generate Videos';
    switch (videoGenProgress.step) {
      case 'saving_images':
        return 'Saving images...';
      case 'uploading_frames':
        return 'Uploading frames...';
      case 'queueing':
        return 'Submitting job...';
      case 'queued':
        return 'Queued...';
      case 'regenerating_videos':
        return `Generating videos... ${Math.min(100, Math.max(0, Math.round(videoGenProgress.percent)))}%`;
      case 'completed':
        return 'Finalizing...';
      case 'error':
        return 'Generation failed';
      default:
        return videoGenProgress.percent > 0
          ? `Generating videos... ${Math.min(100, Math.max(0, Math.round(videoGenProgress.percent)))}%`
          : 'Processing...';
    }
  }, [videoGenProgress, isPreparingDownloads]);

  const handleInlineEditorClose = React.useCallback(() => {
    setShowImageEdit(false);
    setEditingImageFrame(null);
    setEditingSceneNumber(null);
    setEditingImageIndex(null);
  }, []);

  const getImageUrlFromEntry = (entry) => {
    if (!entry) return ''
    if (typeof entry === 'string') return entry.trim()
    if (typeof entry === 'object') {
      const candidate =
        entry?.image_url ||
        entry?.imageUrl ||
        entry?.imageurl ||
        entry?.url ||
        entry?.src ||
        entry?.link ||
        ''
      return typeof candidate === 'string' ? candidate.trim() : ''
    }
    return ''
  }

  const getSelectedImageEntry = (images, index = 0) => {
    if (!Array.isArray(images)) return null
    const entry = images[index]
    if (!entry) return null
    if (typeof entry === 'string') {
      const trimmed = entry.trim()
      return trimmed ? { image_url: trimmed } : null
    }
    return entry
  }

  const getSelectedImageUrl = (images, index = 0) => {
    const entry = getSelectedImageEntry(images, index)
    return entry?.image_url || ''
  }

  const pickFieldWithPath = (fieldName, sceneNumber, sources = []) => {
    if (!Array.isArray(sources) || sources.length === 0) {
      return ''
    }

    for (const source of sources) {
      const rawValue = typeof source?.value === 'string' ? source.value : ''
      if (rawValue && rawValue.trim()) {
        return rawValue.trim()
      }
    }

    return ''
  }

  const getSceneImages = useCallback(
    (row) => {
      const modelUpper = String(row?.model || '').toUpperCase()
      const isVEO3 = modelUpper === 'VEO3'

      // ALWAYS get images from current version (via getOrderedRefs which uses imageFrames)
      const ordered = getOrderedRefs(row)
      const imageRefs = ordered.length > 0 ? ordered : []

      // For VEO3 only: combine images and avatar_urls from current version
      if (isVEO3) {
        // ALWAYS extract avatar_urls from current version
        let avatarUrls = []

        // Priority 1: Extract from imageVersionData latest version
        if (row?.imageVersionData && typeof row.imageVersionData === 'object') {
          const imgContainer = row.imageVersionData
          const vKey = getLatestVersionKey(imgContainer)
          const vObj = imgContainer[vKey] || {}
          const versionAvatars = vObj?.avatar_urls

          if (Array.isArray(versionAvatars) && versionAvatars.length > 0) {
            avatarUrls = versionAvatars.map((av) => {
              if (typeof av === 'string') return av.trim()
              return (
                av?.imageurl ||
                av?.imageUrl ||
                av?.image_url ||
                av?.url ||
                av?.src ||
                av?.link ||
                av?.avatar_url ||
                ''
              )
            }).filter(url => url && typeof url === 'string' && url.trim())
          }
        }

        // Priority 2: Extract from row.avatar_urls (should already be from current version)
        if (avatarUrls.length === 0 && Array.isArray(row?.avatar_urls)) {
          avatarUrls = row.avatar_urls.map((av) => {
            if (typeof av === 'string') return av.trim()
            return (
              av?.imageurl ||
              av?.imageUrl ||
              av?.image_url ||
              av?.url ||
              av?.src ||
              av?.link ||
              av?.avatar_url ||
              ''
            )
          }).filter(url => url && typeof url === 'string' && url.trim())
        }

        // For VEO3 with 9:16 aspect ratio: show only avatar if available, else only one background image
        if (isPortrait9x16) {
          // If avatar exists, return only first avatar
          if (avatarUrls.length > 0) {
            return [avatarUrls[0]].filter(Boolean)
          }
          // Else, return only first background image (from imageRefs)
          if (imageRefs.length > 0) {
            return [imageRefs[0]].filter(Boolean)
          }
          // Fallback: return empty array
          return []
        }

        // For VEO3 with other aspect ratios: combine images and avatar_urls from current version, removing duplicates
        const combined = [...new Set([...imageRefs, ...avatarUrls])].filter(Boolean)
        return combined // Return all combined images for VEO3
      }

      // For non-VEO3 models, return only images from current version (max 2)
      return imageRefs.slice(0, 2)
    },
    [getOrderedRefs, isPortrait9x16]
  )

  const getVeo3ImageTabImages = useCallback(
    (row) => {
      const orderedRefs = getOrderedRefs(row)
      const candidateSources = [
        ...(Array.isArray(row?.refs) ? row.refs : []),
        ...orderedRefs
      ]
      const uniqueCandidates = []
      const seen = new Set()
      candidateSources.forEach((candidate) => {
        const normalized = normalizeSimpleUrl(candidate)
        if (normalized && !seen.has(normalized)) {
          uniqueCandidates.push(candidate)
          seen.add(normalized)
        }
      })
      const avatarSet = getAvatarUrlSet(row)
      const nonAvatar = uniqueCandidates.filter((url) => !avatarSet.has(normalizeSimpleUrl(url)))
      if (nonAvatar.length > 0) return [nonAvatar[0]]
      return []
    },
    [getOrderedRefs, getAvatarUrlSet, normalizeSimpleUrl]
  )

  const getAnchorAvatarImages = useCallback(
    (row) => {
      // Get avatar URLs from row's imageVersionData
      // Always use latest version for ANCHOR
      const latestVersion = row?.imageVersionData ? getLatestVersionKey(row.imageVersionData) : 'v1';
      const avatarUrls = getAvatarUrlsFromImageVersion(row?.imageVersionData, latestVersion, 'ANCHOR');

      // Also check row.avatar_urls as fallback
      if ((!avatarUrls || avatarUrls.length === 0) && Array.isArray(row?.avatar_urls)) {
        return row.avatar_urls
          .map((av) => {
            if (typeof av === 'string') return av.trim();
            return (
              av?.imageurl ||
              av?.imageUrl ||
              av?.image_url ||
              av?.url ||
              av?.src ||
              av?.link ||
              av?.avatar_url ||
              ''
            );
          })
          .filter(url => url && typeof url === 'string' && url.trim());
      }

      return avatarUrls || [];
    },
    [getAvatarUrlsFromImageVersion]
  )

  const getPrimaryImage = useCallback((row) => {
    const ordered = getOrderedRefs(row)
    return ordered[0] || ''
  }, [getOrderedRefs])

  const findFrameForImage = useCallback(
    (frames = [], imageUrl, imageIndex = 0) => {
      if (Array.isArray(frames) && frames[imageIndex]) {
        return frames[imageIndex]
      }
      const target = normalizeImageUrl(imageUrl)
      if (!target) return frames[0] || null
      return (
        frames.find((frame) => {
          const base = frame?.base_image || frame?.baseImage || {}
          const candidates = [
            base?.image_url,
            base?.imageUrl,
            base?.imageurl,
            base?.url,
            base?.src,
            frame?.image_url,
            frame?.imageUrl,
            frame?.imageurl,
            frame?.url,
            frame?.src
          ]
          return candidates.some((candidate) => normalizeImageUrl(candidate) === target)
        }) || frames[0] || null
      )
    },
    [normalizeImageUrl]
  )

  const buildImageEntries = (rawImages = [], frames = []) => {
    if (!Array.isArray(rawImages)) return []
    const frameList = Array.isArray(frames) ? frames : []
    return rawImages
      .map((item, index) => {
        const url = getImageUrlFromEntry(item)
        if (!url) return null
        const frame = frameList.length ? findFrameForImage(frameList, url, index) : null
        if (item && typeof item === 'object') {
          return { ...item, image_url: url, frame }
        }
        return { image_url: url, frame }
      })
      .filter(Boolean)
  }

  // Function to fetch brand assets
  const fetchBrandAssets = React.useCallback(async () => {
    try {
      const user_id = localStorage.getItem('token');
      if (!user_id) {
        return;
      }

      const apiUrl = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/${encodeURIComponent(user_id)}`;

      const brandAssetsResp = await fetch(apiUrl);

      const brandAssetsText = await brandAssetsResp.text();

      let brandAssetsData;
      try {
        brandAssetsData = JSON.parse(brandAssetsText);
      } catch (parseError) {
        brandAssetsData = null;
      }

      if (brandAssetsResp.ok && brandAssetsData) {
        setBrandAssets(brandAssetsData);
      }
    } catch (error) {
    }
  }, []);

  // State to store videos data from session
  const [videosData, setVideosData] = useState([]);

  // Auto-select logo and voiceover based on videos array or session assets API response
  useEffect(() => {
    if (!sessionAssets) return;

    // Get all scene numbers from rows
    const sceneNumbers = rows.map(row => row?.scene_number || row?.sceneNumber).filter(Boolean);
    if (sceneNumbers.length === 0) return;

    // Normalize URL for comparison (remove query params, trailing slashes, etc.)
    const normalizeUrl = (url) => {
      if (!url || typeof url !== 'string') return '';
      try {
        const u = new URL(url);
        return u.origin + u.pathname;
      } catch {
        return url.trim().split('?')[0].replace(/\/$/, '');
      }
    };

    // Set logo needed based on brand_identity.logo[0] from brand assets (not sessionAssets.logo_url)
    // Logo Needed is now always available for user to select Yes/No
    // We don't auto-set logoNeeded based on sessionAssets anymore

    // Check voiceover: First check videos array, then fallback to session assets
    const hasVideos = Array.isArray(videosData) && videosData.length > 0;

    if (hasVideos && brandAssets) {
      // If videos array has videos, check voiceover from videos and match with brand assets
      const brandVoiceovers = Array.isArray(brandAssets.voiceover)
        ? brandAssets.voiceover
        : Array.isArray(brandAssets.voiceovers)
          ? brandAssets.voiceovers
          : [];

      setSceneAdvancedOptions(prev => {
        const updated = { ...prev };
        let hasChanges = false;

        sceneNumbers.forEach(sceneNum => {
          // Find video for this scene
          const sceneVideo = videosData.find(v => {
            const videoSceneNum = v?.scene_number || v?.sceneNumber || v?.scene;
            return String(videoSceneNum) === String(sceneNum);
          });

          if (sceneVideo) {
            // Extract voiceover from video
            const videoVoiceover = sceneVideo?.voiceover ||
              sceneVideo?.voiceover_url ||
              sceneVideo?.voice_url ||
              sceneVideo?.narration_url ||
              '';

            if (videoVoiceover && typeof videoVoiceover === 'string') {
              const normalizedVideoVoice = normalizeUrl(videoVoiceover);

              // Find matching voiceover in brand assets
              const matchingVoiceover = brandVoiceovers.find(vo => {
                const voUrl = typeof vo === 'string' ? vo : (vo?.url || vo?.link || '');
                if (!voUrl) return false;
                const normalizedVoUrl = normalizeUrl(voUrl);
                return normalizedVoUrl === normalizedVideoVoice;
              });

              if (matchingVoiceover) {
                const matchedUrl = typeof matchingVoiceover === 'string'
                  ? matchingVoiceover
                  : (matchingVoiceover?.url || matchingVoiceover?.link || '');

                const currentOptions = updated[sceneNum] || {};
                if (currentOptions.voiceUrl !== matchedUrl) {
                  updated[sceneNum] = {
                    ...currentOptions,
                    voiceUrl: matchedUrl,
                    voiceOption: matchingVoiceover?.name || matchingVoiceover?.type || 'custom'
                  };
                  hasChanges = true;
                }
              }
            }
          }
        });

        return hasChanges ? updated : prev;
      });
    } else if (!hasVideos) {
      // If videos array is empty, use session assets API response
      const sessionVoiceUrl = sessionAssets.voice_url || (sessionAssets.voice_urls && Object.values(sessionAssets.voice_urls)[0]);

      if (sessionVoiceUrl) {
        const normalizedSessionVoice = normalizeUrl(sessionVoiceUrl);

        // Get brand voiceovers if available - these are the options shown in advanced options
        let matchingVoiceover = null;
        let matchedUrl = null;

        if (brandAssets) {
          const brandVoiceovers = Array.isArray(brandAssets.voiceover)
            ? brandAssets.voiceover
            : Array.isArray(brandAssets.voiceovers)
              ? brandAssets.voiceovers
              : [];

          // Find matching voiceover - compare with options that are shown in advanced options
          matchingVoiceover = brandVoiceovers.find(vo => {
            const voUrl = typeof vo === 'string' ? vo : (vo?.url || vo?.link || '');
            if (!voUrl) return false;
            const normalizedVoUrl = normalizeUrl(voUrl);
            return normalizedVoUrl === normalizedSessionVoice || voUrl === sessionVoiceUrl;
          });

          // Only set voiceUrl if a match is found with a displayed voiceover option
          if (matchingVoiceover) {
            matchedUrl = typeof matchingVoiceover === 'string'
              ? matchingVoiceover
              : (matchingVoiceover?.url || matchingVoiceover?.link || '');
          }
        }

        // Set voiceUrl for all scenes only if there's a match with a displayed voiceover option
        if (matchedUrl) {
          setSceneAdvancedOptions(prev => {
            const updated = { ...prev };
            let hasChanges = false;

            sceneNumbers.forEach(sceneNum => {
              const currentOptions = updated[sceneNum] || {};
              if (currentOptions.voiceUrl !== matchedUrl) {
                updated[sceneNum] = {
                  ...currentOptions,
                  voiceUrl: matchedUrl,
                  voiceOption: matchingVoiceover?.name || matchingVoiceover?.type || 'custom'
                };
                hasChanges = true;
              }
            });

            return hasChanges ? updated : prev;
          });
        }
      }
    }
  }, [sessionAssets, brandAssets, rows, videosData]);

  // Helper: Get profile_id from brand assets
  const getProfileId = React.useCallback(async (userId) => {
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
  }, []);

  // Handle image upload to brand assets
  const handleUploadImages = React.useCallback(async (files) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Missing user. Please log in again.');
        return;
      }

      setIsUploadingBackground(true);
      setError('');
      const profileId = await getProfileId(token);
      if (!profileId) {
        alert('Failed to get profile ID. Please try again.');
        setIsUploadingBackground(false);
        return;
      }

      const form = new FormData();
      files.forEach(file => form.append('images', file));
      form.append('convert_colors', String(convertColors));

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
      // Reload assets
      const url = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`;
      const resp2 = await fetch(url);
      const text2 = await resp2.text();
      let data2; try { data2 = JSON.parse(text2); } catch (_) { data2 = {}; }
      const normalized = normalizeBrandAssetsResponse(data2);
      setAssetsData(normalized);
      if (assetImageUploadRef.current) assetImageUploadRef.current.value = '';
    } catch (err) {
      console.error('Image upload failed:', err);
      setError(`Failed to upload images: ${err.message || 'Please try again.'}`);
      alert(`Failed to upload images: ${err.message || 'Please try again.'}`);
    } finally {
      setIsUploadingBackground(false);
    }
  }, [convertColors, getProfileId]);

  // Handle PPTX upload to brand assets
  const handleUploadPptx = React.useCallback(async (file) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        alert('Missing user. Please log in again.');
        return;
      }

      setIsUploadingBackground(true);
      setError('');
      const profileId = await getProfileId(token);
      if (!profileId) {
        alert('Failed to get profile ID. Please try again.');
        setIsUploadingBackground(false);
        return;
      }

      const form = new FormData();
      form.append('pptx_file', file);
      form.append('convert_colors', String(convertColors));

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
      // Reload assets
      const url = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`;
      const resp2 = await fetch(url);
      const text2 = await resp2.text();
      let data2; try { data2 = JSON.parse(text2); } catch (_) { data2 = {}; }
      const normalized = normalizeBrandAssetsResponse(data2);
      setAssetsData(normalized);
      if (assetPptxUploadRef.current) assetPptxUploadRef.current.value = '';
    } catch (err) {
      console.error('PPTX upload failed:', err);
      setError(`Failed to upload PPTX: ${err.message || 'Please try again.'}`);
      alert(`Failed to upload PPTX: ${err.message || 'Please try again.'}`);
    } finally {
      setIsUploadingBackground(false);
    }
  }, [convertColors, getProfileId]);

  // Load assets when upload background popup opens
  useEffect(() => {
    if (!showUploadBackgroundPopup) return;
    let cancelled = false;
    setIsAssetsLoading(true);
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          if (!cancelled) setIsAssetsLoading(false);
          return;
        }
        const url = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`;
        const resp = await fetch(url);
        const text = await resp.text();
        let data; try { data = JSON.parse(text); } catch (_) { data = {}; }
        if (cancelled) return;
        const normalized = normalizeBrandAssetsResponse(data);
        if (!cancelled) setAssetsData(normalized);
      } catch (err) {
        console.error('Failed to load assets:', err);
      } finally {
        if (!cancelled) setIsAssetsLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showUploadBackgroundPopup]);

  // Load generated images when generated_images tab is selected
  useEffect(() => {
    if (!showUploadBackgroundPopup || assetsTab !== 'generated_images') {
      setIsLoadingGeneratedImages(false);
      return;
    }
    let cancelled = false;
    setIsLoadingGeneratedImages(true);
    (async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token) {
          if (!cancelled) setIsLoadingGeneratedImages(false);
          return;
        }
        const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/user/${encodeURIComponent(token)}/generated-media`);
        const text = await resp.text();
        let data; try { data = JSON.parse(text); } catch (_) { data = null; }
        if (cancelled) return;
        if (!cancelled && data && typeof data === 'object') {
          const normalized = normalizeGeneratedMediaResponse(data);
          setGeneratedImagesData(normalized);
        }
      } catch (err) {
        console.error('Failed to load generated images:', err);
      } finally {
        if (!cancelled) setIsLoadingGeneratedImages(false);
      }
    })();
    return () => { cancelled = true; };
  }, [showUploadBackgroundPopup, assetsTab]);

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    const mapSessionImages = (imagesRoot, veo3ScriptScenesByNumber = {}, allScriptScenesByNumber = {}) => {
      let mapped = [];
      const usedSceneNumbers = new Set();
      const collectUrls = (node) => {
        const urls = [];
        const uniqPush = (v) => {
          if (typeof v === 'string') {
            const t = v.trim();
            if (t && !urls.includes(t)) urls.push(t);
          }
        };
        const gatherFromArray = (arr) => {
          if (!Array.isArray(arr)) return;
          arr.forEach((imgObj) => {
            if (!imgObj) return;
            if (typeof imgObj === 'string') {
              uniqPush(imgObj);
              return;
            }
            const base = imgObj?.base_image || imgObj?.baseImage;
            uniqPush(
              base?.image_url ||
              base?.imageUrl ||
              base?.imageurl ||
              base?.url ||
              base?.src ||
              base?.link
            );
            uniqPush(
              imgObj?.image_url ||
              imgObj?.imageUrl ||
              imgObj?.imageurl ||
              imgObj?.url ||
              imgObj?.src ||
              imgObj?.link
            );
          });
        };
        gatherFromArray(node?.v1?.images);
        gatherFromArray(node?.v1?.image);
        gatherFromArray(node?.image?.v1?.images);
        gatherFromArray(node?.images?.v1?.images);
        gatherFromArray(node?.images);
        gatherFromArray(node?.image);
        // Only gather from avatar_urls (not background_image)
        gatherFromArray(node?.avatar_urls);
        gatherFromArray(node?.avatars);
        const base = node?.base_image || node?.baseImage;
        uniqPush(
          base?.image_url ||
          base?.imageUrl ||
          base?.imageurl ||
          base?.url ||
          base?.src ||
          base?.link
        );
        return urls;
      };

      const normalizePromptFields = (raw = {}) => {
        const getFirstString = (obj, keys = []) => {
          for (const k of keys) {
            const v = obj?.[k];
            if (typeof v === 'string' && v.trim()) return v.trim();
          }
          return '';
        };
        return {
          final_prompt: getFirstString(raw, ['final_prompt', 'finalPrompt', 'prompt', 'final']),
          image_summary: getFirstString(raw, ['image_summary', 'imageSummary', 'summary']),
          main_subject_details: getFirstString(raw, ['main_subject_details', 'mainSubjectDetails', 'main_subject', 'subject_details', 'subject']),
          pose_or_action: getFirstString(raw, ['pose_or_action', 'poseOrAction', 'pose', 'action']),
          secondary_elements: getFirstString(raw, ['secondary_elements', 'secondaryElements', 'secondaries', 'secondary']),
          lighting_and_atmosphere: getFirstString(raw, ['lighting_and_atmosphere', 'lightingAndAtmosphere', 'lighting', 'atmosphere', 'mood']),
          framing_and_composition: getFirstString(raw, ['framing_and_composition', 'framingAndComposition', 'framing', 'composition']),
          technical_enhancers: getFirstString(raw, ['technical_enhancers', 'technicalEnhancers', 'technical', 'enhancers'])
        };
      };
      const pushRow = (num, title, refs, meta = {}) => {
        const clean = Array.from(new Set((refs || []).filter(Boolean)));
        if (clean.length > 0) {
          mapped.push({ scene_number: num, scene_title: title || 'Untitled', refs: clean, ...meta });
          if (num !== undefined && num !== null) {
            usedSceneNumbers.add(num);
          }
        }
      };
      if (!imagesRoot) return mapped;
      // Handle object shape: { current_version: 'v1', v1: { images: [ { base_image: { image_url } } ] } }
      if (typeof imagesRoot === 'object' && !Array.isArray(imagesRoot)) {
        try {
          const version = getLatestVersionKey(imagesRoot);
          const vObj = imagesRoot[version] || {};
          const arr = Array.isArray(vObj?.images) ? vObj.images : [];
          if (arr.length > 0) {
            const refs = arr
              .map((it) => (it?.base_image?.image_url || it?.base_image?.imageUrl || it?.image_url || it?.url || ''))
              .filter(Boolean);
            const primary = arr[0] || {};
            const baseImage = primary?.base_image || primary?.baseImage || {};
            const imageDimensions =
              baseImage?.image_dimensions ||
              baseImage?.imageDimensions ||
              primary?.image_dimensions ||
              primary?.imageDimensions ||
              null;
            const textElements = Array.isArray(primary?.text_elements)
              ? primary.text_elements
              : Array.isArray(primary?.textElements)
                ? primary.textElements
                : [];
            // Get description and narration from script data only
            const sceneNumberForRoot = imagesRoot?.scene_number || 1;
            const scriptSceneForRoot =
              allScriptScenesByNumber && allScriptScenesByNumber[sceneNumberForRoot]
                ? allScriptScenesByNumber[sceneNumberForRoot]
                : null;
            const scriptIndexForRoot2 =
              typeof scriptSceneForRoot?.__aiIndex === 'number'
                ? scriptSceneForRoot.__aiIndex
                : Math.max(0, Number(sceneNumberForRoot) - 1);
            const scriptBasePathRoot2 = `scripts[0].airesponse[${scriptIndexForRoot2}]`;
            const descriptionForRoot = pickFieldWithPath('description', sceneNumberForRoot, [
              {
                value: scriptSceneForRoot?.desc,
                path: `${scriptBasePathRoot2}.desc`
              },
              {
                value: scriptSceneForRoot?.description,
                path: `${scriptBasePathRoot2}.description`
              },
              {
                value: scriptSceneForRoot?.scene_description,
                path: `${scriptBasePathRoot2}.scene_description`
              }
            ]);
            const narrationForRoot = pickFieldWithPath('narration', sceneNumberForRoot, [
              {
                value: scriptSceneForRoot?.narration,
                path: `${scriptBasePathRoot2}.narration`
              }
            ]);

            // Extract veo3_prompt_template from script scene data
            const modelUpperRoot = String(imagesRoot?.model || imagesRoot?.mode || '').toUpperCase();
            const isVEO3Root = modelUpperRoot === 'VEO3' || modelUpperRoot === 'ANCHOR';
            const veo3PromptTemplateRoot = scriptSceneForRoot?.veo3_prompt_template ||
              scriptSceneForRoot?.veo3PromptTemplate ||
              scriptSceneForRoot?.veo3_prompt ||
              scriptSceneForRoot?.veo3Prompt ||
              imagesRoot?.veo3_prompt_template ||
              imagesRoot?.veo3PromptTemplate ||
              imagesRoot?.veo3_prompt ||
              imagesRoot?.veo3Prompt ||
              null;

            pushRow(1, imagesRoot?.scene_title || 'Images', refs, {
              description: descriptionForRoot,
              narration: narrationForRoot,
              textToBeIncluded: imagesRoot?.text_to_be_included || '',
              imageDimensions,
              textElements,
              imageVersionData: imagesRoot,
              imageFrames: arr,
              isEditable: true,
              // Store veo3_prompt_template for VEO3 models
              ...(isVEO3Root && veo3PromptTemplateRoot ? { veo3_prompt_template: veo3PromptTemplateRoot } : {}),
              prompts: {
                opening_frame: normalizePromptFields(vObj?.opening_frame || vObj?.prompts?.opening_frame || imagesRoot?.opening_frame || imagesRoot?.prompts?.opening_frame || {}),
                closing_frame: normalizePromptFields(vObj?.closing_frame || vObj?.prompts?.closing_frame || imagesRoot?.closing_frame || imagesRoot?.prompts?.closing_frame || {})
              }
            });
            return mapped;
          }
        } catch (_) { }
      }
      if (Array.isArray(imagesRoot)) {
        if (imagesRoot.every(it => typeof it === 'string')) {
          pushRow('-', 'Images', imagesRoot);
        } else {
          imagesRoot.forEach((it, idx) => {
            // Shape: { images: { current_version: 'v1', v1: { images: [ { base_image, text_elements } ] }, ... } }
            if (it && typeof it === 'object' && it.images && typeof it.images === 'object' && !Array.isArray(it.images)) {
              const imagesContainer = it.images;
              const versionKey = getLatestVersionKey(imagesContainer);
              const verObj = imagesContainer[versionKey] || {};
              const arr = Array.isArray(verObj?.images) ? verObj.images : [];
              if (arr.length > 0) {
                const refs = arr
                  .map((img) => (img?.base_image?.image_url || img?.base_image?.imageUrl || img?.image_url || img?.url || ''))
                  .filter(Boolean);
                const primary = arr[0] || {};
                const baseImage = primary?.base_image || primary?.baseImage || {};
                const imageDimensions =
                  baseImage?.image_dimensions ||
                  baseImage?.imageDimensions ||
                  primary?.image_dimensions ||
                  primary?.imageDimensions ||
                  null;
                const textElements = Array.isArray(primary?.text_elements)
                  ? primary.text_elements
                  : Array.isArray(primary?.textElements)
                    ? primary.textElements
                    : [];
                // For VEO3/SORA models, prioritize base_image URLs from image arrays
                // Only use avatar_urls as fallback when no image arrays exist
                const modelUpper = String(it?.model || it?.mode || '').toUpperCase();
                const isVEO3 = (modelUpper === 'VEO3' || modelUpper === 'ANCHOR');
                const isSora = modelUpper === 'SORA';
                const sceneNumber = it?.scene_number || idx + 1;


                let finalRefs = refs;
                let avatarUrlsForMeta = []; // Store avatar_urls for VEO3

                // Only use avatar_urls if we have no valid refs from image arrays
                if ((isVEO3 || isSora) && veo3ScriptScenesByNumber && veo3ScriptScenesByNumber[sceneNumber]) {
                  const scene = veo3ScriptScenesByNumber[sceneNumber];

                  // Get background_image URLs to exclude them
                  const backgroundImageUrls = new Set();
                  if (Array.isArray(scene?.background_image)) {
                    scene.background_image.forEach((bg) => {
                      if (bg && typeof bg === 'object') {
                        const url = bg?.imageurl || bg?.imageUrl || bg?.image_url || bg?.url || bg?.src || bg?.link || '';
                        if (url && typeof url === 'string') backgroundImageUrls.add(url.trim());
                      } else if (typeof bg === 'string' && bg.trim()) {
                        backgroundImageUrls.add(bg.trim());
                      }
                    });
                  }

                  // Filter out any background_image URLs from collected refs
                  const filteredRefs = refs.filter(url => {
                    const trimmed = typeof url === 'string' ? url.trim() : '';
                    return trimmed && !backgroundImageUrls.has(trimmed);
                  });


                  // Extract avatar_urls for VEO3 (always, not just as fallback)
                  if (isVEO3) {
                    avatarUrlsForMeta = Array.isArray(scene?.avatar_urls)
                      ? scene.avatar_urls.map((av) => {
                        if (typeof av === 'string') return av.trim();
                        return (
                          av?.imageurl ||
                          av?.imageUrl ||
                          av?.image_url ||
                          av?.url ||
                          av?.src ||
                          av?.link ||
                          av?.avatar_url ||
                          ''
                        );
                      }).filter(url => url && typeof url === 'string' && url.trim())
                      : [];
                  }

                  // PRIORITY: Use base_image URLs from image arrays if available
                  if (filteredRefs.length > 0) {
                    finalRefs = filteredRefs;
                  } else {
                    // FALLBACK: Only use avatar_urls if no image arrays exist
                    const avatarUrls = Array.isArray(scene?.avatar_urls)
                      ? scene.avatar_urls.map((av) => {
                        if (typeof av === 'string') return av.trim();
                        return (
                          av?.imageurl ||
                          av?.imageUrl ||
                          av?.image_url ||
                          av?.url ||
                          av?.src ||
                          av?.link ||
                          av?.avatar_url ||
                          ''
                        );
                      }).filter(url => url && typeof url === 'string' && url.trim())
                      : [];

                    if (avatarUrls.length > 0) {
                      finalRefs = avatarUrls;
                    }
                  }
                }

                // Get description and narration from script data only
                const sceneNumberForIt = it?.scene_number ?? (idx + 1);
                const scriptSceneForIt =
                  allScriptScenesByNumber && allScriptScenesByNumber[sceneNumberForIt]
                    ? allScriptScenesByNumber[sceneNumberForIt]
                    : null;
                const scriptIndexForIt =
                  typeof scriptSceneForIt?.__aiIndex === 'number'
                    ? scriptSceneForIt.__aiIndex
                    : Math.max(0, Number(sceneNumberForIt) - 1);
                const scriptBasePathForIt = `scripts[0].airesponse[${scriptIndexForIt}]`;
                const descriptionForIt = pickFieldWithPath('description', sceneNumberForIt, [
                  {
                    value: scriptSceneForIt?.desc,
                    path: `${scriptBasePathForIt}.desc`
                  },
                  {
                    value: scriptSceneForIt?.description,
                    path: `${scriptBasePathForIt}.description`
                  },
                  {
                    value: scriptSceneForIt?.scene_description,
                    path: `${scriptBasePathForIt}.scene_description`
                  }
                ]);
                const narrationForIt = pickFieldWithPath('narration', sceneNumberForIt, [
                  {
                    value: scriptSceneForIt?.narration,
                    path: `${scriptBasePathForIt}.narration`
                  }
                ]);

                // Extract veo3_prompt_template from script scene data
                const veo3PromptTemplate = scriptSceneForIt?.veo3_prompt_template ||
                  scriptSceneForIt?.veo3PromptTemplate ||
                  scriptSceneForIt?.veo3_prompt ||
                  scriptSceneForIt?.veo3Prompt ||
                  it?.veo3_prompt_template ||
                  it?.veo3PromptTemplate ||
                  it?.veo3_prompt ||
                  it?.veo3Prompt ||
                  null;

                const meta = {
                  description: descriptionForIt,
                  narration: narrationForIt,
                  textToBeIncluded: it?.text_to_be_included || it?.textToBeIncluded || it?.include_text || '',
                  model: modelUpper,
                  imageDimensions,
                  textElements,
                  imageVersionData: imagesContainer,
                  imageFrames: arr,
                  isEditable: true,
                  // Store avatar_urls in metadata for VEO3 only
                  ...(isVEO3 && avatarUrlsForMeta.length > 0 ? { avatar_urls: avatarUrlsForMeta } : {}),
                  // Store veo3_prompt_template for VEO3 models
                  ...(isVEO3 && veo3PromptTemplate ? { veo3_prompt_template: veo3PromptTemplate } : {}),
                  prompts: {
                    opening_frame: normalizePromptFields(
                      verObj?.opening_frame ||
                      verObj?.prompts?.opening_frame ||
                      it?.opening_frame ||
                      it?.prompts?.opening_frame ||
                      {}
                    ),
                    closing_frame: normalizePromptFields(
                      verObj?.closing_frame ||
                      verObj?.prompts?.closing_frame ||
                      it?.closing_frame ||
                      it?.prompts?.closing_frame ||
                      {}
                    )
                  }
                };
                pushRow(it?.scene_number ?? (idx + 1), it?.scene_title || it?.title, finalRefs, meta);
                return;
              }
            }

            if (Array.isArray(it?.scenes)) {
              it.scenes.forEach((sc, j) => {
                const refs = [
                  ...collectUrls(sc)
                ];
                if (sc?.image_url) refs.push(sc.image_url);
                if (sc?.image_1_url) refs.push(sc.image_1_url);
                if (sc?.image_2_url) refs.push(sc.image_2_url);
                if (Array.isArray(sc?.refs)) refs.push(...sc.refs);
                if (Array.isArray(sc?.urls)) refs.push(...sc.urls);
                // Get description and narration from script data only
                const sceneNumberForSc = sc?.scene_number ?? (j + 1);
                const scriptSceneForSc =
                  allScriptScenesByNumber && allScriptScenesByNumber[sceneNumberForSc]
                    ? allScriptScenesByNumber[sceneNumberForSc]
                    : null;
                const scriptIndexForSc =
                  typeof scriptSceneForSc?.__aiIndex === 'number'
                    ? scriptSceneForSc.__aiIndex
                    : Math.max(0, Number(sceneNumberForSc) - 1);
                const scriptBasePathForSc = `scripts[0].airesponse[${scriptIndexForSc}]`;
                const descriptionForSc = pickFieldWithPath('description', sceneNumberForSc, [
                  {
                    value: scriptSceneForSc?.desc,
                    path: `${scriptBasePathForSc}.desc`
                  },
                  {
                    value: scriptSceneForSc?.description,
                    path: `${scriptBasePathForSc}.description`
                  },
                  {
                    value: scriptSceneForSc?.scene_description,
                    path: `${scriptBasePathForSc}.scene_description`
                  }
                ]);
                const narrationForSc = pickFieldWithPath('narration', sceneNumberForSc, [
                  {
                    value: scriptSceneForSc?.narration,
                    path: `${scriptBasePathForSc}.narration`
                  }
                ]);

                // Extract veo3_prompt_template from script scene data
                const modelUpperSc = String(sc?.model || sc?.mode || '').toUpperCase();
                const isVEO3Sc = modelUpperSc === 'VEO3' || modelUpperSc === 'ANCHOR';
                const veo3PromptTemplateSc = scriptSceneForSc?.veo3_prompt_template ||
                  scriptSceneForSc?.veo3PromptTemplate ||
                  scriptSceneForSc?.veo3_prompt ||
                  scriptSceneForSc?.veo3Prompt ||
                  sc?.veo3_prompt_template ||
                  sc?.veo3PromptTemplate ||
                  sc?.veo3_prompt ||
                  sc?.veo3Prompt ||
                  null;

                const meta = {
                  description: descriptionForSc,
                  narration: narrationForSc,
                  textToBeIncluded: sc?.text_to_be_included || sc?.textToBeIncluded || sc?.include_text || '',
                  model: modelUpperSc,
                  // Store veo3_prompt_template for VEO3 models
                  ...(isVEO3Sc && veo3PromptTemplateSc ? { veo3_prompt_template: veo3PromptTemplateSc } : {}),
                  prompts: {
                    opening_frame: normalizePromptFields(sc?.v1?.opening_frame || sc?.v1?.prompts?.opening_frame || sc?.opening_frame || sc?.prompts?.opening_frame || {}),
                    closing_frame: normalizePromptFields(sc?.v1?.closing_frame || sc?.v1?.prompts?.closing_frame || sc?.closing_frame || sc?.prompts?.closing_frame || {})
                  }
                };
                pushRow(sc?.scene_number ?? (j + 1), sc?.scene_title || sc?.title, refs, meta);
              });
            } else {
              // For SORA: check if images object exists and extract from base_image
              const modelCheck = String(it?.model || it?.mode || '').toUpperCase();
              const isSoraFallback = modelCheck === 'SORA';

              let refs = [];
              if (isSoraFallback && it?.images && typeof it.images === 'object' && !Array.isArray(it.images)) {
                const versionKey = getLatestVersionKey(it.images);
                const verObj = it.images[versionKey] || {};
                const arr = Array.isArray(verObj?.images) ? verObj.images : [];
                refs = arr
                  .map((frame) => frame?.base_image?.image_url || frame?.base_image?.imageUrl || '')
                  .filter(Boolean);
              } else {
                refs = [...collectUrls(it)];
                if (it?.image_url) refs.push(it.image_url);
                if (it?.image_1_url) refs.push(it.image_1_url);
                if (it?.image_2_url) refs.push(it.image_2_url);
                if (Array.isArray(it?.refs)) refs.push(...it.refs);
                if (Array.isArray(it?.urls)) refs.push(...it.urls);
                if (typeof it === 'string') refs.push(it);
              }

              // Get description and narration from script data only
              const sceneNumberForIt2 = it?.scene_number ?? (idx + 1);
              const scriptSceneForIt2 =
                allScriptScenesByNumber && allScriptScenesByNumber[sceneNumberForIt2]
                  ? allScriptScenesByNumber[sceneNumberForIt2]
                  : null;
              const scriptIndexForIt2 =
                typeof scriptSceneForIt2?.__aiIndex === 'number'
                  ? scriptSceneForIt2.__aiIndex
                  : Math.max(0, Number(sceneNumberForIt2) - 1);
              const scriptBasePathForIt2 = `scripts[0].airesponse[${scriptIndexForIt2}]`;
              const descriptionForIt2 = pickFieldWithPath('description', sceneNumberForIt2, [
                {
                  value: scriptSceneForIt2?.desc,
                  path: `${scriptBasePathForIt2}.desc`
                },
                {
                  value: scriptSceneForIt2?.description,
                  path: `${scriptBasePathForIt2}.description`
                },
                {
                  value: scriptSceneForIt2?.scene_description,
                  path: `${scriptBasePathForIt2}.scene_description`
                }
              ]);
              const narrationForIt2 = pickFieldWithPath('narration', sceneNumberForIt2, [
                {
                  value: scriptSceneForIt2?.narration,
                  path: `${scriptBasePathForIt2}.narration`
                }
              ]);

              // Extract veo3_prompt_template from script scene data
              const modelUpperIt2 = String(it?.model || it?.mode || '').toUpperCase();
              const isVEO3It2 = modelUpperIt2 === 'VEO3' || modelUpperIt2 === 'ANCHOR';
              const veo3PromptTemplateIt2 = scriptSceneForIt2?.veo3_prompt_template ||
                scriptSceneForIt2?.veo3PromptTemplate ||
                scriptSceneForIt2?.veo3_prompt ||
                scriptSceneForIt2?.veo3Prompt ||
                it?.veo3_prompt_template ||
                it?.veo3PromptTemplate ||
                it?.veo3_prompt ||
                it?.veo3Prompt ||
                null;

              const meta = {
                description: descriptionForIt2,
                narration: narrationForIt2,
                textToBeIncluded: it?.text_to_be_included || it?.textToBeIncluded || it?.include_text || '',
                model: modelUpperIt2,
                // Store veo3_prompt_template for VEO3 models
                ...(isVEO3It2 && veo3PromptTemplateIt2 ? { veo3_prompt_template: veo3PromptTemplateIt2 } : {}),
                prompts: {
                  opening_frame: normalizePromptFields(it?.v1?.opening_frame || it?.v1?.prompts?.opening_frame || it?.opening_frame || it?.prompts?.opening_frame || {}),
                  closing_frame: normalizePromptFields(it?.v1?.closing_frame || it?.v1?.prompts?.closing_frame || it?.closing_frame || it?.prompts?.closing_frame || {})
                }
              };
              pushRow(it?.scene_number ?? (idx + 1), it?.scene_title || it?.title, refs, meta);
            }
          });
        }
      } else if (Array.isArray(imagesRoot?.scenes)) {
        imagesRoot.scenes.forEach((sc, j) => {
          const refs = [
            ...collectUrls(sc)
          ];
          if (sc?.image_url) refs.push(sc.image_url);
          if (sc?.image_1_url) refs.push(sc.image_1_url);
          if (sc?.image_2_url) refs.push(sc.image_2_url);
          if (Array.isArray(sc?.refs)) refs.push(...sc.refs);
          if (Array.isArray(sc?.urls)) refs.push(...sc.urls);
          // Get description and narration from script data only
          const sceneNumberForSc2 = sc?.scene_number ?? (j + 1);
          const scriptSceneForSc2 =
            allScriptScenesByNumber && allScriptScenesByNumber[sceneNumberForSc2]
              ? allScriptScenesByNumber[sceneNumberForSc2]
              : null;
          const scriptIndexForSc2 =
            typeof scriptSceneForSc2?.__aiIndex === 'number'
              ? scriptSceneForSc2.__aiIndex
              : Math.max(0, Number(sceneNumberForSc2) - 1);
          const scriptBasePathForSc2 = `scripts[0].airesponse[${scriptIndexForSc2}]`;
          const descriptionForSc2 = pickFieldWithPath('description', sceneNumberForSc2, [
            {
              value: scriptSceneForSc2?.desc,
              path: `${scriptBasePathForSc2}.desc`
            },
            {
              value: scriptSceneForSc2?.description,
              path: `${scriptBasePathForSc2}.description`
            },
            {
              value: scriptSceneForSc2?.scene_description,
              path: `${scriptBasePathForSc2}.scene_description`
            }
          ]);
          const narrationForSc2 = pickFieldWithPath('narration', sceneNumberForSc2, [
            {
              value: scriptSceneForSc2?.narration,
              path: `${scriptBasePathForSc2}.narration`
            }
          ]);

          // Extract veo3_prompt_template from script scene data
          const modelUpperSc2 = String(sc?.model || sc?.mode || '').toUpperCase();
          const isVEO3Sc2 = modelUpperSc2 === 'VEO3' || modelUpperSc2 === 'ANCHOR';
          const veo3PromptTemplateSc2 = scriptSceneForSc2?.veo3_prompt_template ||
            scriptSceneForSc2?.veo3PromptTemplate ||
            scriptSceneForSc2?.veo3_prompt ||
            scriptSceneForSc2?.veo3Prompt ||
            sc?.veo3_prompt_template ||
            sc?.veo3PromptTemplate ||
            sc?.veo3_prompt ||
            sc?.veo3Prompt ||
            null;

          const meta = {
            description: descriptionForSc2,
            narration: narrationForSc2,
            textToBeIncluded: sc?.text_to_be_included || sc?.textToBeIncluded || sc?.include_text || '',
            model: modelUpperSc2,
            // Store veo3_prompt_template for VEO3 models
            ...(isVEO3Sc2 && veo3PromptTemplateSc2 ? { veo3_prompt_template: veo3PromptTemplateSc2 } : {}),
            prompts: {
              opening_frame: normalizePromptFields(sc?.v1?.opening_frame || sc?.v1?.prompts?.opening_frame || sc?.opening_frame || sc?.prompts?.opening_frame || {}),
              closing_frame: normalizePromptFields(sc?.v1?.closing_frame || sc?.v1?.prompts?.closing_frame || sc?.closing_frame || sc?.prompts?.closing_frame || {})
            }
          };
          pushRow(sc?.scene_number ?? (j + 1), sc?.scene_title || sc?.title, refs, meta);
        });
      }
      // Add any remaining VEO3 script scenes (with avatar_urls) that don't have image arrays yet
      // Only use avatar_urls, exclude background_image
      if (veo3ScriptScenesByNumber && typeof veo3ScriptScenesByNumber === 'object') {
        Object.entries(veo3ScriptScenesByNumber).forEach(([key, scene]) => {
          if (!scene || typeof scene !== 'object') return;
          const num =
            scene?.scene_number ||
            scene?.scene_no ||
            scene?.sceneNo ||
            scene?.scene ||
            (Number.isFinite(Number(key)) ? Number(key) : undefined);
          if (num == null || usedSceneNumbers.has(num)) return;

          // Get background_image URLs to exclude them
          const backgroundImageUrls = new Set();
          if (Array.isArray(scene?.background_image)) {
            scene.background_image.forEach((bg) => {
              if (bg && typeof bg === 'object') {
                const url = bg?.imageurl || bg?.imageUrl || bg?.image_url || bg?.url || bg?.src || bg?.link || '';
                if (url && typeof url === 'string') backgroundImageUrls.add(url.trim());
              } else if (typeof bg === 'string' && bg.trim()) {
                backgroundImageUrls.add(bg.trim());
              }
            });
          }

          // Collect URLs and filter out background_image
          const collectedUrls = collectUrls(scene).filter(url => {
            const trimmed = typeof url === 'string' ? url.trim() : '';
            return trimmed && !backgroundImageUrls.has(trimmed);
          });

          // Get avatar_urls
          const avatarUrls = Array.isArray(scene?.avatar_urls)
            ? scene.avatar_urls.map((av) => {
              if (typeof av === 'string') return av.trim();
              return (
                av?.imageurl ||
                av?.imageUrl ||
                av?.image_url ||
                av?.url ||
                av?.src ||
                av?.link ||
                av?.avatar_url ||
                ''
              );
            }).filter(url => url && typeof url === 'string' && url.trim())
            : [];

          // For VEO3: store avatar_urls separately in metadata, combine with collectedUrls in refs
          // For other models: combine as before
          const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
          const isVEO3 = modelUpper === 'VEO3' || modelUpper === 'ANCHOR';
          const refs = [...new Set([...collectedUrls, ...avatarUrls])].filter(Boolean);
          // Extract veo3_prompt_template from scene data
          const veo3PromptTemplate = scene?.veo3_prompt_template ||
            scene?.veo3PromptTemplate ||
            scene?.veo3_prompt ||
            scene?.veo3Prompt ||
            null;

          const meta = {
            description: scene?.desc || scene?.description || scene?.scene_description || '',
            narration: scene?.narration || scene?.voiceover || '',
            textToBeIncluded: scene?.text_to_be_included || scene?.textToBeIncluded || scene?.include_text || '',
            model: modelUpper,
            // Store avatar_urls in metadata for VEO3 only
            ...(isVEO3 && avatarUrls.length > 0 ? { avatar_urls: avatarUrls } : {}),
            // Store veo3_prompt_template for VEO3 models
            ...(isVEO3 && veo3PromptTemplate ? { veo3_prompt_template: veo3PromptTemplate } : {}),
            prompts: {
              opening_frame: normalizePromptFields(
                scene?.v1?.opening_frame ||
                scene?.v1?.prompts?.opening_frame ||
                scene?.opening_frame ||
                scene?.prompts?.opening_frame ||
                {}
              ),
              closing_frame: normalizePromptFields(
                scene?.v1?.closing_frame ||
                scene?.v1?.prompts?.closing_frame ||
                scene?.closing_frame ||
                scene?.prompts?.closing_frame ||
                {}
              )
            },
            isEditable: false
          };
          pushRow(num, scene?.scene_title || scene?.title, refs, meta);
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
        const sresp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id, session_id })
        });
        const stext = await sresp.text();
        let sdata; try { sdata = JSON.parse(stext); } catch (_) { sdata = stext; }
        if (!sresp.ok) throw new Error(`user-session/data failed: ${sresp.status} ${stext}`);

        // For VEO3: Check scripts data for avatar_urls (for scenes that may not yet have image arrays)
        const sessionData = sdata?.session_data || sdata?.session || {};

        // Extract videos array from session data
        const videos = Array.isArray(sessionData?.videos) ? sessionData.videos : [];
        setVideosData(videos);

        const scripts = Array.isArray(sessionData?.scripts) && sessionData.scripts.length > 0 ? sessionData.scripts : [];
        setScriptsData(scripts); // Store scripts data for console logging
        // scripts[0] has the latest version (e.g., v9) - use index 0 for latest script
        const currentScript = scripts[0] || null;
        const airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];

        // Extract tone from script for matching voiceovers
        // Path: userquery[0].additonalprop1.purpose_and_audience.tone
        const userQueryArr = Array.isArray(currentScript?.userquery) ? currentScript.userquery : [];
        const firstUserQuery = userQueryArr[0] || {};

        // Check additonalprop1 path first (BuildReel path)
        const additonalprop1 = firstUserQuery?.additonalprop1 || firstUserQuery?.additionalprop1 || {};
        const purposeAndAudienceFromAddProp = additonalprop1?.purpose_and_audience || additonalprop1?.purposeAndAudience || {};

        // Fallback to guidelines path (legacy)
        const guidelines = firstUserQuery?.guidelines || {};
        const purposeAndAudienceFromGuidelines = guidelines?.purpose_and_audience || guidelines?.purposeAndAudience ||
          firstUserQuery?.purpose_and_audience || firstUserQuery?.purposeAndAudience || {};

        // Prioritize additonalprop1, fallback to guidelines
        const purposeAndAudience = purposeAndAudienceFromAddProp?.tone
          ? purposeAndAudienceFromAddProp
          : purposeAndAudienceFromGuidelines;

        const tone = (purposeAndAudience?.tone || '').toLowerCase().trim();

        if (tone) {
          setScriptTone(tone);
        }

        // Extract voice_link from session data for auto-selection
        // Path: userquery[0].additonalprop1.audio_and_effects[0].voice_link
        const audioAndEffects = Array.isArray(additonalprop1?.audio_and_effects)
          ? additonalprop1.audio_and_effects
          : Array.isArray(additonalprop1?.audioAndEffects)
            ? additonalprop1.audioAndEffects
            : [];
        const firstAudioEffect = audioAndEffects[0] || {};
        const sessionVoiceLink = firstAudioEffect?.voice_link || firstAudioEffect?.voiceLink || '';

        // Store session voice_link for matching with brand assets
        if (sessionVoiceLink) {
          try { localStorage.setItem('session_voice_link', sessionVoiceLink); } catch (_) { }
        }
        // Index ALL script scenes from airesponse by scene number for description/narration
        // Also index VEO3 scenes separately for avatar_urls
        const allScriptScenesByNumber = {}; // For all scenes (description/narration)
        const veo3ScriptScenesByNumber = {}; // For VEO3 scenes (avatar_urls)
        airesponse.forEach((scene, index) => {
          if (!scene || typeof scene !== 'object') return;
          const model = String(scene?.model || scene?.mode || '').toUpperCase();
          const sceneNumber =
            scene?.scene_number ||
            scene?.scene_no ||
            scene?.sceneNo ||
            scene?.scene ||
            index + 1;

          // Index ALL scenes for description/narration
          allScriptScenesByNumber[sceneNumber] = {
            ...scene,
            scene_number: sceneNumber,
            model,
            __aiIndex: Math.max(0, Number(sceneNumber) - 1)
          };

          // Also index VEO3/ANCHOR scenes separately for avatar_urls
          const isVEO3 = model === 'VEO3' || model === 'ANCHOR';
          if (isVEO3) {
            veo3ScriptScenesByNumber[sceneNumber] = {
              ...scene,
              scene_number: sceneNumber,
              model,
              __aiIndex: Math.max(0, Number(sceneNumber) - 1)
            };
          }
        });

        const sessionImages = mapSessionImages(sdata?.session_data?.images, veo3ScriptScenesByNumber, allScriptScenesByNumber);
        if (!cancelled && sessionImages.length > 0) {
          setRows(sessionImages);
          const initialImages = getSceneImages(sessionImages[0]);
          const first = getPrimaryImage(sessionImages[0]);
          const model0 = String(sessionImages[0]?.model || sessionImages[0]?.mode || '').toUpperCase();
          const firstScene = sessionImages[0];

          // Get latest version from images object (always use latest)
          const imageVersionData = firstScene?.imageVersionData || null;
          const imagesCurrentVersion = imageVersionData ? getLatestVersionKey(imageVersionData) : 'v1';

          // Console log current version in images object and scripts array

          // Get avatar URLs from latest version of image object for VEO3 scenes
          const avatarUrlsFromVersion = getAvatarUrlsFromImageVersion(
            imageVersionData,
            imagesCurrentVersion,
            model0
          );
          const finalAvatarUrls = avatarUrlsFromVersion.length > 0
            ? avatarUrlsFromVersion
            : (Array.isArray(firstScene?.avatar_urls) ? firstScene.avatar_urls : []);

          setSelected({
            index: 0,
            imageUrl: first,
            images: buildImageEntries(initialImages, firstScene?.imageFrames),
            title: firstScene?.scene_title || 'Untitled',
            sceneNumber: firstScene?.scene_number ?? '',
            description: firstScene?.description || '',
            narration: firstScene?.narration || '',
            textToBeIncluded: firstScene?.textToBeIncluded || '',
            model: model0,
            prompts: firstScene?.prompts || { opening_frame: {}, closing_frame: {} },
            imageDimensions: firstScene?.imageDimensions || firstScene?.image_dimensions || null,
            textElements: Array.isArray(firstScene?.textElements) ? firstScene.textElements : [],
            overlayElements: Array.isArray(firstScene?.overlayElements) ? firstScene.overlayElements : [],
            imageVersionData: imageVersionData,
            imageFrames: Array.isArray(firstScene?.imageFrames) ? firstScene.imageFrames : [],
            avatar_urls: finalAvatarUrls,
            current_version: imagesCurrentVersion,
            isEditable: !!firstScene?.isEditable,
            veo3_prompt_template: firstScene?.veo3_prompt_template ||
              firstScene?.veo3PromptTemplate ||
              firstScene?.veo3_prompt ||
              firstScene?.veo3Prompt ||
              ''
          });

          // Call APIs for VEO3/SORA/ANCHOR models if images exist
          if (!cancelled) {
            try {
              const hasRelevantModel = sessionImages.some(row => {
                const model = String(row?.model || '').toUpperCase();
                return model === 'VEO3' || model === 'SORA' || model === 'ANCHOR';
              });

              if (hasRelevantModel) {
                // Call session assets API
                const sessionAssetsUrl = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/session-assets/${encodeURIComponent(session_id)}?user_id=${encodeURIComponent(user_id)}`;

                const assetsResp = await fetch(sessionAssetsUrl);
                const assetsText = await assetsResp.text();
                let assetsData;
                try {
                  assetsData = JSON.parse(assetsText);
                } catch (_) {
                  assetsData = { logo_url: '', voice_url: '', voice_urls: {} };
                }
                if (assetsResp.ok && assetsData) {
                  setSessionAssets({
                    logo_url: assetsData.logo_url || '',
                    voice_url: assetsData.voice_url || '', // Handle singular voice_url from API
                    voice_urls: assetsData.voice_urls || {}
                  });
                }

                // Call brand assets API
                await fetchBrandAssets();

                // Call transition presets API
                const presetsResp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/transition-presets/${encodeURIComponent(user_id)}`);
                const presetsText = await presetsResp.text();
                let presetsData;
                try {
                  presetsData = JSON.parse(presetsText);
                } catch (_) {
                  presetsData = [];
                }
                // Normalise possible API shapes to an array of presets.
                // Handle various API response structures:
                // - [{ name: "...", ... }] - direct array
                // - { presets: [...] } - nested presets
                // - { data: [...] } - nested data
                // - { transition_presets: { presets: [...], custom: [...] } } - nested with custom
                // - { transition_presets: [...] } - nested array
                let presetsArray = [];

                if (Array.isArray(presetsData)) {
                  // Direct array
                  presetsArray = presetsData;
                } else if (presetsData && typeof presetsData === 'object') {
                  // Check for transition_presets wrapper
                  const transitionPresetsWrapper = presetsData.transition_presets;

                  if (Array.isArray(transitionPresetsWrapper)) {
                    // transition_presets is an array
                    presetsArray = transitionPresetsWrapper;
                  } else if (transitionPresetsWrapper && typeof transitionPresetsWrapper === 'object') {
                    // transition_presets is an object with nested arrays
                    const nestedPresets = Array.isArray(transitionPresetsWrapper.presets) ? transitionPresetsWrapper.presets : [];
                    const nestedCustom = Array.isArray(transitionPresetsWrapper.custom) ? transitionPresetsWrapper.custom : [];
                    presetsArray = [...nestedPresets, ...nestedCustom];
                  } else if (Array.isArray(presetsData.presets)) {
                    // Direct presets array
                    presetsArray = presetsData.presets;
                  } else if (Array.isArray(presetsData.data)) {
                    // Direct data array
                    presetsArray = presetsData.data;
                  } else if (Array.isArray(presetsData.custom)) {
                    // Direct custom array
                    presetsArray = presetsData.custom;
                  }
                }

                // Filter to ensure each preset has a name property
                const validPresets = presetsArray.filter(preset => preset && (preset.name || preset.preset_name));

                if (presetsResp.ok && validPresets.length > 0) {
                  setTransitionPresets(validPresets);
                } else {
                }
              }
            } catch (apiError) {
            }
          }
        }
        // If we have a jobId and either no session images yet or we expect generation, poll job API until done
        const pendingFlag = localStorage.getItem('images_generate_pending') === 'true';
        const shouldPollJob = !!(jobId || localStorage.getItem('current_images_job_id')) && pendingFlag;

        // If no job to poll, stop here
        if (!shouldPollJob) {
          setIsLoading(false);
          setIsPolling(false);
          return;
        }

        const id = jobId || localStorage.getItem('current_images_job_id');
        if (!id) {
          setIsLoading(false);
          setIsPolling(false);
          return;
        }

        // Ensure loader is visible while polling job-status API
        setIsLoading(true);
        setIsPolling(true);

        const poll = async () => {
          try {
            const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/job-status/${encodeURIComponent(id)}`);
            const text = await resp.text();
            let data; try { data = JSON.parse(text); } catch (_) { data = text; }
            if (!resp.ok) throw new Error(`job-status failed: ${resp.status} ${text}`);
            const status = String(data?.status || data?.job_status || '').toLowerCase();
            if (status === 'succeeded' || status === 'success' || status === 'completed') {
              try { localStorage.removeItem('images_generate_pending'); } catch (_) { }
              // Reload session images now that job is done
              try {
                const sr = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id, session_id })
                });
                const st = await sr.text();
                let sd; try { sd = JSON.parse(st); } catch (_) { sd = {}; }
                // Extract VEO3 script scenes (avatar_urls) from scripts
                const sessionData = sd?.session_data || sd?.session || {};

                // Extract videos array from session data
                const videos = Array.isArray(sessionData?.videos) ? sessionData.videos : [];
                setVideosData(videos);

                const scripts = Array.isArray(sessionData?.scripts) && sessionData.scripts.length > 0 ? sessionData.scripts : [];
                setScriptsData(scripts); // Store scripts data for console logging
                // scripts[0] has the latest version (e.g., v9) - use index 0 for latest script
                const currentScript = scripts[0] || null;
                const airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];

                // Extract tone from script for matching voiceovers
                // Path: userquery[0].additonalprop1.purpose_and_audience.tone
                const userQueryArr = Array.isArray(currentScript?.userquery) ? currentScript.userquery : [];
                const firstUserQuery = userQueryArr[0] || {};

                // Check additonalprop1 path first (BuildReel path)
                const additonalprop1 = firstUserQuery?.additonalprop1 || firstUserQuery?.additionalprop1 || {};
                const purposeAndAudienceFromAddProp = additonalprop1?.purpose_and_audience || additonalprop1?.purposeAndAudience || {};

                // Fallback to guidelines path (legacy)
                const guidelines = firstUserQuery?.guidelines || {};
                const purposeAndAudienceFromGuidelines = guidelines?.purpose_and_audience || guidelines?.purposeAndAudience ||
                  firstUserQuery?.purpose_and_audience || firstUserQuery?.purposeAndAudience || {};

                // Prioritize additonalprop1, fallback to guidelines
                const purposeAndAudience = purposeAndAudienceFromAddProp?.tone
                  ? purposeAndAudienceFromAddProp
                  : purposeAndAudienceFromGuidelines;

                const tone = (purposeAndAudience?.tone || '').toLowerCase().trim();

                if (tone) {
                  setScriptTone(tone);
                }

                // Index ALL script scenes from airesponse by scene number for description/narration
                // Also index VEO3 scenes separately for avatar_urls
                const allScriptScenesByNumber = {}; // For all scenes (description/narration)
                const veo3ScriptScenesByNumber = {}; // For VEO3 scenes (avatar_urls)
                airesponse.forEach((scene, index) => {
                  if (!scene || typeof scene !== 'object') return;
                  const model = String(scene?.model || scene?.mode || '').toUpperCase();
                  const sceneNumber =
                    scene?.scene_number ||
                    scene?.scene_no ||
                    scene?.sceneNo ||
                    scene?.scene ||
                    index + 1;

                  // Index ALL scenes for description/narration
                  allScriptScenesByNumber[sceneNumber] = {
                    ...scene,
                    scene_number: sceneNumber,
                    model,
                    __aiIndex: Math.max(0, Number(sceneNumber) - 1)
                  };

                  // Also index VEO3/ANCHOR scenes separately for avatar_urls
                  const isVEO3 = model === 'VEO3' || model === 'ANCHOR';
                  if (isVEO3) {
                    veo3ScriptScenesByNumber[sceneNumber] = {
                      ...scene,
                      scene_number: sceneNumber,
                      model,
                      __aiIndex: Math.max(0, Number(sceneNumber) - 1)
                    };
                  }
                });

                const sessionImages = mapSessionImages(sd?.session_data?.images || sd?.session?.images, veo3ScriptScenesByNumber, allScriptScenesByNumber);
                if (!cancelled) {
                  setRows(sessionImages);
                  if (sessionImages.length > 0) {
                    const imgs = getSceneImages(sessionImages[0]);
                    const first = imgs[0] || '';
                    const model0 = String(sessionImages[0]?.model || '').toUpperCase();
                    const firstScene = sessionImages[0];

                    // Get latest version from images object (always use latest)
                    const imageVersionData = firstScene?.imageVersionData || null;
                    const imagesCurrentVersion = imageVersionData ? getLatestVersionKey(imageVersionData) : 'v1';

                    // Console log current version in images object and scripts array

                    // Get avatar URLs from latest version of image object for VEO3 scenes
                    const avatarUrlsFromVersion2 = getAvatarUrlsFromImageVersion(
                      imageVersionData,
                      imagesCurrentVersion,
                      model0
                    );
                    const finalAvatarUrls2 = avatarUrlsFromVersion2.length > 0
                      ? avatarUrlsFromVersion2
                      : (Array.isArray(firstScene?.avatar_urls) ? firstScene.avatar_urls : []);

                    setSelected({
                      index: 0,
                      imageUrl: first,
                      images: buildImageEntries(imgs, firstScene?.imageFrames),
                      title: firstScene?.scene_title || 'Untitled',
                      sceneNumber: firstScene?.scene_number ?? '',
                      description: firstScene?.description || '',
                      narration: firstScene?.narration || '',
                      textToBeIncluded: firstScene?.textToBeIncluded || '',
                      model: model0,
                      prompts: firstScene?.prompts || { opening_frame: {}, closing_frame: {} },
                      imageDimensions: firstScene?.imageDimensions || firstScene?.image_dimensions || null,
                      textElements: Array.isArray(firstScene?.textElements) ? firstScene.textElements : [],
                      overlayElements: Array.isArray(firstScene?.overlayElements) ? firstScene.overlayElements : [],
                      imageVersionData: imageVersionData,
                      imageFrames: Array.isArray(firstScene?.imageFrames) ? firstScene.imageFrames : [],
                      avatar_urls: finalAvatarUrls2,
                      current_version: imagesCurrentVersion,
                      isEditable: !!firstScene?.isEditable,
                      veo3_prompt_template: firstScene?.veo3_prompt_template ||
                        firstScene?.veo3PromptTemplate ||
                        firstScene?.veo3_prompt ||
                        firstScene?.veo3Prompt ||
                        ''
                    });
                  }
                }
              } catch (_) { /* ignore */ }

              // Call APIs for VEO3/SORA/ANCHOR models after successful image creation
              if (!cancelled) {
                try {
                  // Check if any scene uses VEO3, SORA, or ANCHOR
                  const hasRelevantModel = sessionImages?.some(row => {
                    const model = String(row?.model || '').toUpperCase();
                    return model === 'VEO3' || model === 'SORA' || model === 'ANCHOR';
                  });

                  if (hasRelevantModel) {
                    // Call session assets API
                    const sessionAssetsUrl = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/session-assets/${encodeURIComponent(session_id)}?user_id=${encodeURIComponent(user_id)}`;

                    const assetsResp = await fetch(sessionAssetsUrl);
                    const assetsText = await assetsResp.text();
                    let assetsData;
                    try {
                      assetsData = JSON.parse(assetsText);
                    } catch (_) {
                      assetsData = { logo_url: '', voice_urls: {} };
                    }
                    if (assetsResp.ok && assetsData) {
                      setSessionAssets({
                        logo_url: assetsData.logo_url || '',
                        voice_url: assetsData.voice_url || '', // Handle singular voice_url from API
                        voice_urls: assetsData.voice_urls || {}
                      });
                    }

                    // Call brand assets API
                    await fetchBrandAssets();

                    // Call transition presets API
                    const presetsResp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/transition-presets/${encodeURIComponent(user_id)}`);
                    const presetsText = await presetsResp.text();
                    let presetsData;
                    try {
                      presetsData = JSON.parse(presetsText);
                    } catch (_) {
                      presetsData = [];
                    }
                    // Normalise possible API shapes to an array of presets.
                    // Handle various API response structures:
                    // - [{ name: "...", ... }] - direct array
                    // - { presets: [...] } - nested presets
                    // - { data: [...] } - nested data
                    // - { transition_presets: { presets: [...], custom: [...] } } - nested with custom
                    // - { transition_presets: [...] } - nested array
                    let presetsArray = [];

                    if (Array.isArray(presetsData)) {
                      // Direct array
                      presetsArray = presetsData;
                    } else if (presetsData && typeof presetsData === 'object') {
                      // Check for transition_presets wrapper
                      const transitionPresetsWrapper = presetsData.transition_presets;

                      if (Array.isArray(transitionPresetsWrapper)) {
                        // transition_presets is an array
                        presetsArray = transitionPresetsWrapper;
                      } else if (transitionPresetsWrapper && typeof transitionPresetsWrapper === 'object') {
                        // transition_presets is an object with nested arrays
                        const nestedPresets = Array.isArray(transitionPresetsWrapper.presets) ? transitionPresetsWrapper.presets : [];
                        const nestedCustom = Array.isArray(transitionPresetsWrapper.custom) ? transitionPresetsWrapper.custom : [];
                        presetsArray = [...nestedPresets, ...nestedCustom];
                      } else if (Array.isArray(presetsData.presets)) {
                        // Direct presets array
                        presetsArray = presetsData.presets;
                      } else if (Array.isArray(presetsData.data)) {
                        // Direct data array
                        presetsArray = presetsData.data;
                      } else if (Array.isArray(presetsData.custom)) {
                        // Direct custom array
                        presetsArray = presetsData.custom;
                      }
                    }

                    // Filter to ensure each preset has a name property
                    const validPresets = presetsArray.filter(preset => preset && (preset.name || preset.preset_name));

                    if (presetsResp.ok && validPresets.length > 0) {
                      setTransitionPresets(validPresets);
                    } else {
                    }
                  }
                } catch (apiError) {
                }
              }
              // Job completed successfully, hide loader
              if (!cancelled) {
                setIsLoading(false);
                setIsPolling(false);
              }
            } else if (!cancelled) {
              // Job still in progress, keep polling and loader visible
              setIsLoading(true);
              setIsPolling(true);
              timeoutId = setTimeout(poll, 3000);
            }
          } catch (e) {
            if (!cancelled) {
              setError(e?.message || 'Failed to load images');
              setIsLoading(false);
              setIsPolling(false);
            }
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

  // Call session-assets API on mount (especially for BuildReel flow)
  useEffect(() => {
    const fetchSessionAssets = async () => {
      try {
        const session_id = localStorage.getItem('session_id');
        const user_id = localStorage.getItem('token');
        if (!session_id || !user_id) return;

        const sessionAssetsUrl = `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/session-assets/${encodeURIComponent(session_id)}?user_id=${encodeURIComponent(user_id)}`;

        const assetsResp = await fetch(sessionAssetsUrl);
        const assetsText = await assetsResp.text();
        let assetsData;
        try {
          assetsData = JSON.parse(assetsText);
        } catch (_) {
          assetsData = { logo_url: '', voice_url: '', voice_urls: {} };
        }
        if (assetsResp.ok && assetsData) {
          setSessionAssets({
            logo_url: assetsData.logo_url || '',
            voice_url: assetsData.voice_url || '',
            voice_urls: assetsData.voice_urls || {}
          });
        }
      } catch (error) {
        console.error('Failed to fetch session assets:', error);
      }
    };

    fetchSessionAssets();
  }, []); // Run once on mount

  useEffect(() => {
    return () => {
      if (redirectIntervalRef.current) {
        clearInterval(redirectIntervalRef.current);
        redirectIntervalRef.current = null;
      }
      if (sceneUpdateTimeoutRef.current) {
        clearTimeout(sceneUpdateTimeoutRef.current);
        sceneUpdateTimeoutRef.current = null;
      }
    };
  }, []);

  // Load brand assets avatars when avatar manager opens
  React.useEffect(() => {
    if (!showAvatarManager) return;

    const loadAvatars = async () => {
      try {
        setIsLoadingAvatars(true);
        const token = localStorage.getItem('token');
        if (!token) {
          setIsLoadingAvatars(false);
          return;
        }

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
      } catch (err) {
        console.error('Failed to load avatars:', err);
      } finally {
        setIsLoadingAvatars(false);
      }
    };

    loadAvatars();
  }, [showAvatarManager]);

  // Expose load function for refresh - recreate the load logic without cancellation
  const refreshLoad = React.useCallback(async (sceneNumberToSelect = null) => {
    try {
      setIsLoading(true);
      setIsPolling(false); // Refresh doesn't poll, it just loads data
      setError('');
      const session_id = localStorage.getItem('session_id');
      const user_id = localStorage.getItem('token');
      if (!session_id || !user_id) { setError('Missing session or user'); setIsLoading(false); return; }

      const sresp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id, session_id })
      });
      const stext = await sresp.text();
      let sdata; try { sdata = JSON.parse(stext); } catch (_) { sdata = stext; }
      if (!sresp.ok) throw new Error(`user-session/data failed: ${sresp.status} ${stext}`);

      // For VEO3: Check scripts data for avatar_urls (for scenes that may not yet have image arrays)
      const sessionData = sdata?.session_data || sdata?.session || {};

      // Extract videos array from session data
      const videos = Array.isArray(sessionData?.videos) ? sessionData.videos : [];
      setVideosData(videos);

      const scripts = Array.isArray(sessionData?.scripts) && sessionData.scripts.length > 0 ? sessionData.scripts : [];
      // scripts[0] has the latest version (e.g., v9) - use index 0 for latest script
      const currentScript = scripts[0] || null;
      const airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];

      // Index ALL script scenes from airesponse by scene number for description/narration
      // Also index VEO3 scenes separately for avatar_urls
      const allScriptScenesByNumber = {};
      const veo3ScriptScenesByNumber = {};
      airesponse.forEach((scene, index) => {
        if (!scene || typeof scene !== 'object') return;
        const model = String(scene?.model || scene?.mode || '').toUpperCase();
        const sceneNumber =
          scene?.scene_number ||
          scene?.scene_no ||
          scene?.sceneNo ||
          scene?.scene ||
          index + 1;
        allScriptScenesByNumber[sceneNumber] = {
          ...scene,
          scene_number: sceneNumber,
          model,
          __aiIndex: Math.max(0, Number(sceneNumber) - 1)
        };
        const isVEO3 = model === 'VEO3' || model === 'ANCHOR';
        if (isVEO3) {
          veo3ScriptScenesByNumber[sceneNumber] = {
            ...scene,
            scene_number: sceneNumber,
            model,
            __aiIndex: Math.max(0, Number(sceneNumber) - 1)
          };
        }
      });

      const mapSessionImages = (imagesRoot, veo3ScriptScenesByNumber = {}, allScriptScenesByNumber = {}) => {
        let mapped = [];
        const usedSceneNumbers = new Set();
        // Store the first avatar URL found from any VEO3 scene to use for all VEO3 scenes
        let globalAvatarUrl = null;
        const collectUrls = (node) => {
          const urls = [];
          const uniqPush = (v) => {
            if (typeof v === 'string') {
              const t = v.trim();
              if (t && !urls.includes(t)) urls.push(t);
            }
          };
          const gatherFromArray = (arr) => {
            if (!Array.isArray(arr)) return;
            arr.forEach((imgObj) => {
              if (!imgObj) return;
              if (typeof imgObj === 'string') {
                uniqPush(imgObj);
                return;
              }
              const base = imgObj?.base_image || imgObj?.baseImage;
              uniqPush(
                base?.image_url ||
                base?.imageUrl ||
                base?.imageurl ||
                base?.url ||
                base?.src ||
                base?.link
              );
              uniqPush(
                imgObj?.image_url ||
                imgObj?.imageUrl ||
                imgObj?.imageurl ||
                imgObj?.url ||
                imgObj?.src ||
                imgObj?.link
              );
            });
          };
          gatherFromArray(node?.v1?.images);
          gatherFromArray(node?.v1?.image);
          gatherFromArray(node?.image?.v1?.images);
          gatherFromArray(node?.images?.v1?.images);
          gatherFromArray(node?.images);
          gatherFromArray(node?.image);
          // Only gather from avatar_urls (not background_image)
          gatherFromArray(node?.avatar_urls);
          gatherFromArray(node?.avatars);
          const base = node?.base_image || node?.baseImage;
          uniqPush(
            base?.image_url ||
            base?.imageUrl ||
            base?.imageurl ||
            base?.url ||
            base?.src ||
            base?.link
          );
          return urls;
        };

        const normalizePromptFields = (raw = {}) => {
          const getFirstString = (obj, keys = []) => {
            for (const k of keys) {
              const v = obj?.[k];
              if (typeof v === 'string' && v.trim()) return v.trim();
            }
            return '';
          };
          return {
            final_prompt: getFirstString(raw, ['final_prompt', 'finalPrompt', 'prompt', 'final']),
            image_summary: getFirstString(raw, ['image_summary', 'imageSummary', 'summary']),
            main_subject_details: getFirstString(raw, ['main_subject_details', 'mainSubjectDetails', 'main_subject', 'subject_details', 'subject']),
            pose_or_action: getFirstString(raw, ['pose_or_action', 'poseOrAction', 'pose', 'action']),
            secondary_elements: getFirstString(raw, ['secondary_elements', 'secondaryElements', 'secondaries', 'secondary']),
            lighting_and_atmosphere: getFirstString(raw, ['lighting_and_atmosphere', 'lightingAndAtmosphere', 'lighting', 'atmosphere', 'mood']),
            framing_and_composition: getFirstString(raw, ['framing_and_composition', 'framingAndComposition', 'framing', 'composition']),
            technical_enhancers: getFirstString(raw, ['technical_enhancers', 'technicalEnhancers', 'technical', 'enhancers'])
          };
        };
        const pushRow = (num, title, refs, meta = {}) => {
          const clean = Array.from(new Set((refs || []).filter(Boolean)));
          if (clean.length > 0) {
            mapped.push({ scene_number: num, scene_title: title || 'Untitled', refs: clean, ...meta });
            if (num !== undefined && num !== null) {
              usedSceneNumbers.add(num);
            }
          }
        };
        if (!imagesRoot) return mapped;
        // Handle object shape: { current_version: 'v1', v1: { images: [ { base_image: { image_url } } ] } }
        if (typeof imagesRoot === 'object' && !Array.isArray(imagesRoot)) {
          try {
            const version = getLatestVersionKey(imagesRoot);
            const vObj = imagesRoot[version] || {};
            const arr = Array.isArray(vObj?.images) ? vObj.images : [];
            if (arr.length > 0) {
              const modelUpper = String(imagesRoot?.model || imagesRoot?.mode || '').toUpperCase();
              const isSora = modelUpper === 'SORA';
              const refs = arr
                .map((it) => {
                  const url = isSora
                    ? (it?.base_image?.image_url || it?.base_image?.imageUrl || '')
                    : (it?.base_image?.image_url || it?.base_image?.imageUrl || it?.image_url || it?.url || '');
                  return url;
                })
                .filter(Boolean);
              const primary = arr[0] || {};
              const baseImage = primary?.base_image || primary?.baseImage || {};
              const imageDimensions =
                baseImage?.image_dimensions ||
                baseImage?.imageDimensions ||
                primary?.image_dimensions ||
                primary?.imageDimensions ||
                null;
              // Extract text elements from current version
              const textElements = Array.isArray(primary?.text_elements)
                ? primary.text_elements
                : Array.isArray(primary?.textElements)
                  ? primary.textElements
                  : [];

              // Extract overlay elements (charts) from current version
              const overlayElements = Array.isArray(primary?.overlay_elements)
                ? primary.overlay_elements
                : Array.isArray(primary?.overlayElements)
                  ? primary.overlayElements
                  : [];

              // Get description and narration from script data only
              const sceneNumberForImagesRoot = imagesRoot?.scene_number || 1;
              const scriptScene =
                allScriptScenesByNumber && allScriptScenesByNumber[sceneNumberForImagesRoot]
                  ? allScriptScenesByNumber[sceneNumberForImagesRoot]
                  : null;
              const scriptIndexForRoot =
                typeof scriptScene?.__aiIndex === 'number'
                  ? scriptScene.__aiIndex
                  : Math.max(0, Number(sceneNumberForImagesRoot) - 1);
              const scriptBasePathRoot = `scripts[0].airesponse[${scriptIndexForRoot}]`;
              const description = pickFieldWithPath('description', sceneNumberForImagesRoot, [
                {
                  value: scriptScene?.desc,
                  path: `${scriptBasePathRoot}.desc`
                },
                {
                  value: scriptScene?.description,
                  path: `${scriptBasePathRoot}.description`
                },
                {
                  value: scriptScene?.scene_description,
                  path: `${scriptBasePathRoot}.scene_description`
                }
              ]);
              const narration = pickFieldWithPath('narration', sceneNumberForImagesRoot, [
                {
                  value: scriptScene?.narration,
                  path: `${scriptBasePathRoot}.narration`
                }
              ]);


              pushRow(1, imagesRoot?.scene_title || 'Images', refs, {
                description,
                narration,
                textToBeIncluded: imagesRoot?.text_to_be_included || '',
                imageDimensions,
                textElements,
                overlayElements,
                imageVersionData: imagesRoot,
                imageFrames: arr,
                isEditable: true,
                model: modelUpper,
                prompts: normalizePromptFields(vObj?.prompts || imagesRoot?.prompts || {}),
                current_version: version
              });
            }
          } catch (e) {
          }
        } else if (Array.isArray(imagesRoot)) {
          imagesRoot.forEach((it, idx) => {
            // For VEO3: Use avatar_urls from scripts if available
            // Only use avatar_urls, exclude background_image
            const modelUpper = String(it?.model || it?.mode || '').toUpperCase();
            const isVEO3 = modelUpper === 'VEO3' || modelUpper === 'ANCHOR';
            const sceneNumber = it?.scene_number || idx + 1;

            // For SORA: strictly use images array -> base_image.image_url with associated text/overlay
            if (modelUpper === 'SORA' && it?.images && typeof it.images === 'object' && !Array.isArray(it.images)) {
              const imagesContainer = it.images;
              const versionKey = getLatestVersionKey(imagesContainer);
              const verObj = imagesContainer[versionKey] || {};
              const arr = Array.isArray(verObj?.images) ? verObj.images : [];

              if (arr.length > 0) {
                const soraRefs = arr
                  .map((frame) => frame?.base_image?.image_url || frame?.base_image?.imageUrl || '')
                  .filter(Boolean);
                const primary = arr[0] || {};
                const baseImage = primary?.base_image || primary?.baseImage || {};
                const imageDimensions =
                  baseImage?.image_dimensions ||
                  baseImage?.imageDimensions ||
                  primary?.image_dimensions ||
                  primary?.imageDimensions ||
                  null;

                // Extract text elements from current version
                const textElements = Array.isArray(primary?.text_elements)
                  ? primary.text_elements
                  : Array.isArray(primary?.textElements)
                    ? primary.textElements
                    : [];

                // Extract overlay elements (charts) from current version
                const overlayElements = Array.isArray(primary?.overlay_elements)
                  ? primary.overlay_elements
                  : Array.isArray(primary?.overlayElements)
                    ? primary.overlayElements
                    : [];

                // Get description and narration from LATEST script's airesponse (scripts[0].airesponse[sceneNumber])
                // Only use script data, no fallback to image data
                const scriptScene =
                  allScriptScenesByNumber && allScriptScenesByNumber[sceneNumber]
                    ? allScriptScenesByNumber[sceneNumber]
                    : null;
                const scriptIndexForScene =
                  typeof scriptScene?.__aiIndex === 'number'
                    ? scriptScene.__aiIndex
                    : Math.max(0, Number(sceneNumber) - 1);
                const scriptBasePathScene = `scripts[0].airesponse[${scriptIndexForScene}]`;
                const description = pickFieldWithPath('description', sceneNumber, [
                  {
                    value: scriptScene?.desc,
                    path: `${scriptBasePathScene}.desc`
                  },
                  {
                    value: scriptScene?.description,
                    path: `${scriptBasePathScene}.description`
                  },
                  {
                    value: scriptScene?.scene_description,
                    path: `${scriptBasePathScene}.scene_description`
                  }
                ]);
                const narration = pickFieldWithPath('narration', sceneNumber, [
                  {
                    value: scriptScene?.narration,
                    path: `${scriptBasePathScene}.narration`
                  }
                ]);


                pushRow(it?.scene_number ?? (idx + 1), it?.scene_title || it?.title, soraRefs, {
                  description,
                  narration,
                  textToBeIncluded: it?.text_to_be_included || '',
                  imageDimensions,
                  textElements,
                  overlayElements,
                  imageVersionData: imagesContainer,
                  imageFrames: arr,
                  isEditable: true,
                  model: modelUpper,
                  prompts: normalizePromptFields(verObj?.prompts || it?.prompts || {}),
                  current_version: versionKey
                });
                return;
              }
            }

            // For VEO3/ANCHOR: Check if it has versioned structure like SORA
            let refs = [];
            let avatarUrlsForMeta = []; // Store avatar_urls for VEO3
            let hasVersionedImages = false;

            if (isVEO3 && it?.images && typeof it.images === 'object' && !Array.isArray(it.images)) {
              // VEO3 with versioned structure
              const imagesContainer = it.images;
              const versionKey = getLatestVersionKey(imagesContainer);
              const verObj = imagesContainer[versionKey] || {};
              const arr = Array.isArray(verObj?.images) ? verObj.images : [];

              // Explicitly check and log avatar_urls
              const versionAvatars = verObj?.avatar_urls;

              if (arr.length > 0) {
                // Extract images from current_version using base_image.image_url
                refs = arr
                  .map((frame) => frame?.base_image?.image_url || frame?.base_image?.imageUrl || '')
                  .filter(Boolean);
                hasVersionedImages = true;
              }

              if (Array.isArray(versionAvatars) && versionAvatars.length > 0) {
                avatarUrlsForMeta = versionAvatars.map((av) => {
                  if (typeof av === 'string') return av.trim();
                  return (
                    av?.imageurl ||
                    av?.imageUrl ||
                    av?.image_url ||
                    av?.url ||
                    av?.src ||
                    av?.link ||
                    av?.avatar_url ||
                    ''
                  );
                }).filter(url => url && typeof url === 'string' && url.trim());

                // Store the first avatar URL found to use for all VEO3 scenes
                if (avatarUrlsForMeta.length > 0 && !globalAvatarUrl) {
                  globalAvatarUrl = avatarUrlsForMeta[0];
                }
              }
            }

            // Fallback to collectUrls if no versioned structure
            if (!hasVersionedImages) {
              refs = collectUrls(it);
            }

            if (isVEO3 && veo3ScriptScenesByNumber && veo3ScriptScenesByNumber[sceneNumber]) {
              const scene = veo3ScriptScenesByNumber[sceneNumber];

              // Get background_image URLs to exclude them
              const backgroundImageUrls = new Set();
              if (Array.isArray(scene?.background_image)) {
                scene.background_image.forEach((bg) => {
                  if (bg && typeof bg === 'object') {
                    const url = bg?.imageurl || bg?.imageUrl || bg?.image_url || bg?.url || bg?.src || bg?.link || '';
                    if (url && typeof url === 'string') backgroundImageUrls.add(url.trim());
                  } else if (typeof bg === 'string' && bg.trim()) {
                    backgroundImageUrls.add(bg.trim());
                  }
                });
              }

              // Filter out background_image URLs from collected refs
              const filteredRefs = refs.filter(url => {
                const trimmed = typeof url === 'string' ? url.trim() : '';
                return trimmed && !backgroundImageUrls.has(trimmed);
              });

              // Extract avatar_urls for VEO3 from script ONLY if not already extracted from versioned structure
              if (avatarUrlsForMeta.length === 0) {
                avatarUrlsForMeta = Array.isArray(scene?.avatar_urls)
                  ? scene.avatar_urls.map((av) => {
                    if (typeof av === 'string') return av.trim();
                    return (
                      av?.imageurl ||
                      av?.imageUrl ||
                      av?.image_url ||
                      av?.url ||
                      av?.src ||
                      av?.link ||
                      av?.avatar_url ||
                      ''
                    );
                  }).filter(url => url && typeof url === 'string' && url.trim())
                  : [];

                // Store the first avatar URL found to use for all VEO3 scenes
                if (avatarUrlsForMeta.length > 0 && !globalAvatarUrl) {
                  globalAvatarUrl = avatarUrlsForMeta[0];
                }
              }

              // ALWAYS apply global avatar to all VEO3 scenes (use the same avatar for all scenes)
              // If we have a global avatar, use it for ALL scenes regardless of what was found
              if (globalAvatarUrl) {
                avatarUrlsForMeta = [globalAvatarUrl];
              }

              // PRIORITY: Use base_image URLs from image arrays if available
              if (filteredRefs.length > 0) {
                refs = filteredRefs;
              } else {
                // FALLBACK: Only use avatar_urls if no image arrays exist
                if (avatarUrlsForMeta.length > 0) {
                  // If no filtered refs, use only avatar_urls
                  refs = avatarUrlsForMeta;
                }
              }

              // Final summary for VEO3 scene
            }

            if (refs.length > 0) {
              // Check if this is a versioned structure
              let versionData = it;
              let currentVersionKey = 'v1';
              let overlayElements = [];

              if (it?.images && typeof it.images === 'object' && !Array.isArray(it.images)) {
                currentVersionKey = getLatestVersionKey(it.images);
                versionData = it.images[currentVersionKey] || it;
              }

              const baseImage = versionData?.base_image || versionData?.baseImage || it?.base_image || it?.baseImage || {};
              const imageDimensions =
                baseImage?.image_dimensions ||
                baseImage?.imageDimensions ||
                versionData?.image_dimensions ||
                versionData?.imageDimensions ||
                it?.image_dimensions ||
                it?.imageDimensions ||
                null;

              // Extract text elements from current version
              const textElements = Array.isArray(versionData?.text_elements)
                ? versionData.text_elements
                : Array.isArray(versionData?.textElements)
                  ? versionData.textElements
                  : Array.isArray(it?.text_elements)
                    ? it.text_elements
                    : Array.isArray(it?.textElements)
                      ? it.textElements
                      : [];

              // Extract overlay elements (charts) from current version
              overlayElements = Array.isArray(versionData?.overlay_elements)
                ? versionData.overlay_elements
                : Array.isArray(versionData?.overlayElements)
                  ? versionData.overlayElements
                  : Array.isArray(it?.overlay_elements)
                    ? it.overlay_elements
                    : Array.isArray(it?.overlayElements)
                      ? it.overlayElements
                      : [];

              // Get updated avatar_urls from current version (VEO3/ANCHOR)
              if (isVEO3) {
                // PRIORITY: Extract from current_version first
                let versionAvatars = versionData?.avatar_urls;

                // If versioned structure exists, extract from it
                if (it?.images && typeof it.images === 'object' && !Array.isArray(it.images)) {
                  const imgContainer = it.images;
                  const vKey = getLatestVersionKey(imgContainer);
                  const vObj = imgContainer[vKey] || {};
                  versionAvatars = vObj?.avatar_urls || versionAvatars;

                }

                // Fallback to root level
                if (!versionAvatars || !Array.isArray(versionAvatars) || versionAvatars.length === 0) {
                  versionAvatars = it?.avatar_urls;
                }

                if (Array.isArray(versionAvatars) && versionAvatars.length > 0) {
                  avatarUrlsForMeta = versionAvatars.map((av) => {
                    if (typeof av === 'string') return av.trim();
                    return (
                      av?.imageurl ||
                      av?.imageUrl ||
                      av?.image_url ||
                      av?.url ||
                      av?.src ||
                      av?.link ||
                      av?.avatar_url ||
                      ''
                    );
                  }).filter(url => url && typeof url === 'string' && url.trim());
                }
              }

              // Get description and narration from LATEST script's airesponse (scripts[0].airesponse[sceneNumber])
              // Only use script data, no fallback to image data
              const scriptScene =
                allScriptScenesByNumber && allScriptScenesByNumber[sceneNumber]
                  ? allScriptScenesByNumber[sceneNumber]
                  : null;
              const scriptIndexForVeo =
                typeof scriptScene?.__aiIndex === 'number'
                  ? scriptScene.__aiIndex
                  : Math.max(0, Number(sceneNumber) - 1);
              const scriptBasePathVeo = `scripts[0].airesponse[${scriptIndexForVeo}]`;
              const description = pickFieldWithPath('description', sceneNumber, [
                {
                  value: scriptScene?.desc,
                  path: `${scriptBasePathVeo}.desc`
                },
                {
                  value: scriptScene?.description,
                  path: `${scriptBasePathVeo}.description`
                },
                {
                  value: scriptScene?.scene_description,
                  path: `${scriptBasePathVeo}.scene_description`
                }
              ]);
              const narration = pickFieldWithPath('narration', sceneNumber, [
                {
                  value: scriptScene?.narration,
                  path: `${scriptBasePathVeo}.narration`
                }
              ]);


              // For VEO3: ALWAYS use global avatar if available, otherwise use scene-specific avatar
              const finalAvatarUrls = (isVEO3 && globalAvatarUrl) ? [globalAvatarUrl] : (isVEO3 && avatarUrlsForMeta.length > 0 ? avatarUrlsForMeta : []);

              // Extract imageFrames properly for versioned structures
              let imageFramesArray = [];
              let imageVersionDataForRow = it?.images || it;

              if (it?.images && typeof it.images === 'object' && !Array.isArray(it.images)) {
                // Versioned structure: extract frames from latest version
                const imgContainer = it.images;
                const vKey = getLatestVersionKey(imgContainer);
                const vObj = imgContainer[vKey] || {};
                imageFramesArray = Array.isArray(vObj?.images) ? vObj.images : [];
                imageVersionDataForRow = imgContainer;
              } else if (Array.isArray(it?.images)) {
                // Array structure: use directly
                imageFramesArray = it.images;
              } else {
                // Fallback: wrap in array
                imageFramesArray = [it];
              }

              pushRow(it?.scene_number ?? (idx + 1), it?.scene_title || it?.title, refs, {
                description,
                narration,
                textToBeIncluded: it?.text_to_be_included || '',
                imageDimensions,
                textElements,
                overlayElements,
                imageVersionData: imageVersionDataForRow,
                imageFrames: imageFramesArray,
                isEditable: true,
                model: modelUpper,
                // Store avatar_urls in metadata for VEO3 only - use global avatar if available
                ...(isVEO3 && finalAvatarUrls.length > 0 ? { avatar_urls: finalAvatarUrls } : {}),
                prompts: normalizePromptFields(versionData?.prompts || it?.prompts || {}),
                current_version: currentVersionKey
              });
            }
          });
        }

        // Add any remaining VEO3 script scenes (with avatar_urls) that don't have image arrays yet
        // Only use avatar_urls, exclude background_image
        if (veo3ScriptScenesByNumber && typeof veo3ScriptScenesByNumber === 'object') {
          Object.entries(veo3ScriptScenesByNumber).forEach(([key, scene]) => {
            if (!scene || typeof scene !== 'object') return;
            const num =
              scene?.scene_number ||
              scene?.scene_no ||
              scene?.sceneNo ||
              scene?.scene ||
              (Number.isFinite(Number(key)) ? Number(key) : undefined);
            if (num == null || usedSceneNumbers.has(num)) return;

            // Get background_image URLs to exclude them
            const backgroundImageUrls = new Set();
            if (Array.isArray(scene?.background_image)) {
              scene.background_image.forEach((bg) => {
                if (bg && typeof bg === 'object') {
                  const url = bg?.imageurl || bg?.imageUrl || bg?.image_url || bg?.url || bg?.src || bg?.link || '';
                  if (url && typeof url === 'string') backgroundImageUrls.add(url.trim());
                } else if (typeof bg === 'string' && bg.trim()) {
                  backgroundImageUrls.add(bg.trim());
                }
              });
            }

            // Collect URLs and filter out background_image
            const collectedUrls = collectUrls(scene).filter(url => {
              const trimmed = typeof url === 'string' ? url.trim() : '';
              return trimmed && !backgroundImageUrls.has(trimmed);
            });

            // Get avatar_urls
            let avatarUrls = Array.isArray(scene?.avatar_urls)
              ? scene.avatar_urls.map((av) => {
                if (typeof av === 'string') return av.trim();
                return (
                  av?.imageurl ||
                  av?.imageUrl ||
                  av?.image_url ||
                  av?.url ||
                  av?.src ||
                  av?.link ||
                  av?.avatar_url ||
                  ''
                );
              }).filter(url => url && typeof url === 'string' && url.trim())
              : [];

            // Store the first avatar URL found to use for all VEO3 scenes
            if (avatarUrls.length > 0 && !globalAvatarUrl) {
              globalAvatarUrl = avatarUrls[0];
            }

            // ALWAYS apply global avatar to all VEO3 scenes (use the same avatar for all scenes)
            // If we have a global avatar, use it for ALL scenes regardless of what was found
            if (globalAvatarUrl) {
              avatarUrls = [globalAvatarUrl];
            }

            // For VEO3: store avatar_urls separately in metadata, combine with collectedUrls in refs
            // For other models: combine as before
            const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
            const isVEO3 = modelUpper === 'VEO3' || modelUpper === 'ANCHOR';
            const refs = isVEO3
              ? [...new Set([...collectedUrls, ...avatarUrls])].filter(Boolean)
              : [...new Set([...collectedUrls, ...avatarUrls])].filter(Boolean);
            const meta = {
              description: scene?.desc || scene?.description || scene?.scene_description || '',
              narration: scene?.narration || '',
              textToBeIncluded: scene?.text_to_be_included || '',
              imageDimensions: null,
              textElements: [],
              imageVersionData: null,
              imageFrames: [],
              isEditable: false,
              model: modelUpper,
              // Store avatar_urls in metadata for VEO3 only
              ...(isVEO3 && avatarUrls.length > 0 ? { avatar_urls: avatarUrls } : {}),
              prompts: normalizePromptFields(scene?.prompts || {})
            };
            pushRow(num, scene?.scene_title || scene?.title, refs, meta);
          });
        }

        // Final pass: Apply global avatar to all VEO3 scenes to ensure consistency
        if (globalAvatarUrl) {
          mapped = mapped.map((row) => {
            const modelUpper = String(row?.model || '').toUpperCase();
            const isVEO3 = modelUpper === 'VEO3' || modelUpper === 'ANCHOR';
            if (isVEO3) {
              return {
                ...row,
                avatar_urls: [globalAvatarUrl]
              };
            }
            return row;
          });
        }

        return mapped;
      };

      const sessionImages = mapSessionImages(sdata?.session_data?.images, veo3ScriptScenesByNumber, allScriptScenesByNumber);
      if (sessionImages.length > 0) {
        setRows(sessionImages);

        // Find the scene to select - use provided sceneNumberToSelect, or fallback to first scene
        let sceneToSelect = sessionImages[0];
        let sceneIndex = 0;

        if (sceneNumberToSelect !== null && sceneNumberToSelect !== undefined) {
          const foundIndex = sessionImages.findIndex(
            (row) => (row?.scene_number || row?.sceneNumber) === sceneNumberToSelect
          );
          if (foundIndex >= 0) {
            sceneToSelect = sessionImages[foundIndex];
            sceneIndex = foundIndex;
          }
        }

        const initialImages = getSceneImages(sceneToSelect);
        const first = initialImages[0] || '';
        const model0 = String(sceneToSelect?.model || '').toUpperCase();
        const imgs = initialImages;

        // Get latest version from images object
        const imageVersionData = sceneToSelect?.imageVersionData || null;
        const imagesCurrentVersion = imageVersionData ? getLatestVersionKey(imageVersionData) : 'v1';


        // Get avatar URLs from latest version of image object for VEO3 scenes
        const avatarUrlsFromVersion3 = getAvatarUrlsFromImageVersion(
          imageVersionData,
          imagesCurrentVersion,
          model0
        );
        const finalAvatarUrls3 = avatarUrlsFromVersion3.length > 0
          ? avatarUrlsFromVersion3
          : (Array.isArray(sceneToSelect?.avatar_urls) ? sceneToSelect.avatar_urls : []);

        setSelected({
          index: sceneIndex,
          imageUrl: first,
          images: buildImageEntries(imgs, sceneToSelect?.imageFrames),
          title: sceneToSelect?.scene_title || 'Untitled',
          sceneNumber: sceneToSelect?.scene_number ?? '',
          description: sceneToSelect?.description || '',
          narration: sceneToSelect?.narration || '',
          textToBeIncluded: sceneToSelect?.textToBeIncluded || '',
          model: model0,
          prompts: sceneToSelect?.prompts || { opening_frame: {}, closing_frame: {} },
          imageDimensions: sceneToSelect?.imageDimensions || sceneToSelect?.image_dimensions || null,
          textElements: Array.isArray(sceneToSelect?.textElements) ? sceneToSelect.textElements : [],
          overlayElements: Array.isArray(sceneToSelect?.overlayElements) ? sceneToSelect.overlayElements : [],
          imageVersionData: imageVersionData,
          imageFrames: Array.isArray(sceneToSelect?.imageFrames) ? sceneToSelect.imageFrames : [],
          avatar_urls: finalAvatarUrls3,
          current_version: imagesCurrentVersion,
          isEditable: !!sceneToSelect?.isEditable,
          veo3_prompt_template: sceneToSelect?.veo3_prompt_template ||
            sceneToSelect?.veo3PromptTemplate ||
            sceneToSelect?.veo3_prompt ||
            sceneToSelect?.veo3Prompt ||
            ''
        });
      }
      setIsLoading(false);
      setIsPolling(false);
    } catch (e) {
      setError(e?.message || 'Failed to refresh images');
      setIsLoading(false);
      setIsPolling(false);
    }
  }, []);

  const handleEditChartsClick = React.useCallback(async () => {
    if (!selected) return;
    const sceneNumber = selected?.sceneNumber || selected?.scene_number;
    const sessionId = localStorage.getItem('session_id');
    const userId = localStorage.getItem('token');
    if (!sessionId || !sceneNumber || !userId) {
      setChartEditorError('Missing session, scene number, or user id.');
      return;
    }
    setChartEditorError('');
    setChartEditorLoading(true);
    try {
      const resp = await fetch(
        `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/chart-preset/${encodeURIComponent(
          sessionId
        )}/${encodeURIComponent(sceneNumber)}?user_id=${encodeURIComponent(userId)}`
      );
      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(text || 'Failed to load chart config');
      }
      const payload = await resp.json();
      const presetPayload = payload?.chart_preset || payload;
      const normalizedScene = Array.isArray(presetPayload) ? presetPayload[0] : presetPayload;
      if (!normalizedScene) {
        throw new Error('Chart preset response was empty');
      }
      const chartType = normalizedScene.chart_type || normalizedScene.chartType || selected?.chart_type;
      let chartData =
        normalizedScene.chart_data || normalizedScene.chartData || selected?.chart_data || {};
      if (typeof chartData === 'string') {
        try {
          chartData = JSON.parse(chartData);
        } catch {
          chartData = {};
        }
      }
      const enrichedScene = {
        ...normalizedScene,
        scene_number: normalizedScene.scene_number ?? sceneNumber,
        chart_title:
          normalizedScene.chart_title || normalizedScene.scene_title || selected?.scene_title,
        chart_type: chartType,
        chart_data: chartData
      };
      setChartEditorData(enrichedScene);
      setShowChartEditor(true);
    } catch (err) {
      setChartEditorError(err?.message || 'Unable to open chart editor');
    } finally {
      setChartEditorLoading(false);
    }
  }, [selected]);

  // Get raw aspect ratio from script/session data (exact value for API payloads)
  const getSessionAspectRatioRaw = React.useCallback(async () => {
    try {
      const session_id = localStorage.getItem('session_id');
      const user_id = localStorage.getItem('token');
      if (!session_id || !user_id) return '16:9';

      const sresp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id, session_id })
      });
      const stext = await sresp.text();
      let sdata;
      try {
        sdata = JSON.parse(stext);
      } catch (_) {
        sdata = stext;
      }

      const sessionData = sdata?.session_data || sdata?.session || {};
      const scripts = Array.isArray(sessionData?.scripts) && sessionData.scripts.length > 0 ? sessionData.scripts : [];
      // scripts[0] has the latest version (e.g., v9) - use index 0 for latest script
      const currentScript = scripts[0] || null;

      // Helper to safely extract a trimmed string
      const pickString = (val) => (typeof val === 'string' && val.trim() ? val.trim() : '');

      // 1) Prefer aspect_ratio from scripts[current].current_version.userquery[].guidelines.technical_and_formal_constraints
      let fromGuidelines = '';
      if (currentScript && typeof currentScript === 'object') {
        const currentVersionKey = currentScript.current_version || currentScript.currentVersion;
        const currentVersionObj =
          (typeof currentVersionKey === 'string' && currentScript[currentVersionKey]) ||
          currentScript;
        const userQueryArr =
          (Array.isArray(currentVersionObj?.userquery) && currentVersionObj.userquery) ||
          (Array.isArray(currentVersionObj?.user_query) && currentVersionObj.user_query) ||
          [];
        const firstUserQuery = userQueryArr[0] || {};
        const guidelines = firstUserQuery?.guidelines || firstUserQuery?.guideLines || {};
        const tech = guidelines.technical_and_formal_constraints ||
          guidelines.technicalAndFormalConstraints ||
          guidelines.technical_constraints ||
          guidelines.technicalConstraints ||
          {};
        fromGuidelines =
          pickString(tech.aspect_ratio) ||
          pickString(tech.aspectRatio);
      }

      if (fromGuidelines) {
        return fromGuidelines;
      }

      // 2) Fallback to script-level / session-level aspect_ratio fields
      const aspectRatio =
        pickString(currentScript?.aspect_ratio) ||
        pickString(currentScript?.aspectRatio) ||
        pickString(sessionData?.aspect_ratio) ||
        pickString(sessionData?.aspectRatio) ||
        '16:9';

      return aspectRatio;
    } catch (_) {
      return '16:9';
    }
  }, []);

  // Normalized aspect ratio for UI rendering (CSS aspect-ratio etc.)
  const getAspectRatio = React.useCallback(async () => {
    try {
      const raw = await getSessionAspectRatioRaw();
      return normalizeAspectRatioValue(raw);
    } catch (_) {
      return normalizeAspectRatioValue('16:9');
    }
  }, [getSessionAspectRatioRaw]);

  // Cache aspect ratio from questionnaire for consistent rendering
  useEffect(() => {
    let active = true;
    (async () => {
      const ratio = await getAspectRatio();
      if (active) {
        setQuestionnaireAspectRatio(normalizeAspectRatioValue(ratio));
      }
    })();
    return () => {
      active = false;
    };
  }, [getAspectRatio]);

  // Handle regenerate image with popup
  const handleRegenerateClick = useCallback(async (sceneNumber) => {
    // Reset all regenerate states to ensure clean state
    setIsRegenerating(false);
    setError(''); // Clear any previous errors
    setRegeneratingSceneNumber(sceneNumber);
    setIsRegenerateForDescription(false); // Mark that this is for regenerate (not edit description)

    // Get the original user query from the script
    let originalUserQuery = '';
    if (Array.isArray(scriptsData) && scriptsData.length > 0) {
      const currentScript = scriptsData[0] || null;
      const userQueryArr = Array.isArray(currentScript?.userquery) ? currentScript.userquery : [];
      const firstUserQuery = userQueryArr[0] || {};

      // Try to extract query text from various possible fields
      if (typeof firstUserQuery === 'string') {
        originalUserQuery = firstUserQuery;
      } else if (typeof firstUserQuery === 'object') {
        originalUserQuery = firstUserQuery?.query ||
          firstUserQuery?.text ||
          firstUserQuery?.user_query ||
          firstUserQuery?.userQuery ||
          '';
      }
    }

    // Pre-populate with original user query
    setRegenerateUserQuery(originalUserQuery);

    // Get the model for this scene
    const model = getSceneModel(sceneNumber);

    // Set default frames based on model
    if (isVEO3Model(model)) {
      setRegenerateFrames(['background']); // VEO3 always use background
    } else if (isANCHORModel(model)) {
      setRegenerateFrames(['opening', 'closing']); // ANCHOR uses opening and closing
    } else {
      // For all other models (SORA, PLOTLY, etc.): default to both frames
      setRegenerateFrames(['opening', 'closing']);
    }

    // Reset save as new version to false
    setRegenerateSaveAsNewVersion(false);

    // Reset reference image upload state
    setRegenerateReferenceFile([]);
    setRegenerateReferencePreview([]);

    setShowRegeneratePopup(true);
  }, [getSceneModel, isSORAModel, isVEO3Model, isANCHORModel, scriptsData]);

  // Handle regenerate API call
  const handleGenerateImage = React.useCallback(async () => {
    try {
      setIsRegenerating(true);
      setError('');
      const session_id = localStorage.getItem('session_id');
      const user_id = localStorage.getItem('token');

      if (!session_id || !user_id) {
        setError('Missing session or user');
        setIsRegenerating(false);
        return;
      }

      if (!regeneratingSceneNumber) {
        setError('Missing scene number');
        setIsRegenerating(false);
        return;
      }

      // Get the model for the current scene
      const model = getSceneModel(regeneratingSceneNumber);
      if (!model) {
        setError('Unable to determine scene model');
        setIsRegenerating(false);
        return;
      }

      // Use the aspect ratio from session
      const aspectRatio = await getAspectRatio();

      // Determine frames to regenerate based on model
      let framesToRegenerate = [];
      if (isVEO3Model(model)) {
        // VEO3: always regenerate background only
        framesToRegenerate = ['background'];
      } else {
        // For ANCHOR, SORA, PLOTLY, and other models: use selected frames (opening, closing, or both)
        framesToRegenerate = regenerateFrames.length > 0 ? regenerateFrames : ['opening', 'closing'];
      }

      // Get the original user query from the script as fallback
      let originalUserQuery = '';
      if (Array.isArray(scriptsData) && scriptsData.length > 0) {
        const currentScript = scriptsData[0] || null;
        const userQueryArr = Array.isArray(currentScript?.userquery) ? currentScript.userquery : [];
        const firstUserQuery = userQueryArr[0] || {};

        // Try to extract query text from various possible fields
        if (typeof firstUserQuery === 'string') {
          originalUserQuery = firstUserQuery;
        } else if (typeof firstUserQuery === 'object') {
          originalUserQuery = firstUserQuery?.query ||
            firstUserQuery?.text ||
            firstUserQuery?.user_query ||
            firstUserQuery?.userQuery ||
            '';
        }
      }

      // Use user-entered query if available, otherwise fallback to original query
      const finalUserQuery = regenerateUserQuery.trim() || originalUserQuery.trim();

      // Check if reference images are uploaded
      if (regenerateReferenceFile && regenerateReferenceFile.length > 0) {
        // Flow 1: Generate from reference image(s)
        // Step 1: Upload all reference images to get URLs
        const uploadPromises = regenerateReferenceFile.map(async (file) => {
          const base64Image = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => {
              const base64 = reader.result.split(',')[1]; // Remove data:image/...;base64, prefix
              resolve(base64);
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          // Step 2: Upload to /v1/bf_remove/upload to get blob URL
          const uploadResponse = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/bf_remove/upload', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ base64_image: base64Image })
          });

          const uploadText = await uploadResponse.text();
          let uploadData;
          try {
            uploadData = JSON.parse(uploadText);
          } catch (_) {
            uploadData = uploadText;
          }

          if (!uploadResponse.ok) {
            throw new Error(`Failed to upload reference image: ${uploadResponse.status} ${uploadText}`);
          }

          const imageUrl = uploadData?.image_url || uploadData?.imageUrl || uploadData?.url;
          if (!imageUrl) {
            throw new Error('No image URL returned from upload');
          }

          return imageUrl;
        });

        // Upload all images and get their URLs
        const referenceImageUrls = await Promise.all(uploadPromises);

        // Use the first two image URLs for the API call (API accepts reference_image_urls as array)
        const referenceImageUrlsArray = referenceImageUrls.slice(0, 2);

        // Step 3: Call generate-from-reference API
        const payload = {
          user_id: user_id,
          session_id: session_id,
          scene_number: regeneratingSceneNumber,
          model: model,
          reference_image_urls: referenceImageUrlsArray,
          user_query: finalUserQuery,
          frames_to_regenerate: framesToRegenerate,
          aspect_ratio: aspectRatio
        };

        const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/api/image-editing/generate-from-reference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = text;
        }

        if (!response.ok) {
          throw new Error(`Generate from reference failed: ${response.status} ${text}`);
        }

        // Handle successful response
        // Store scene number before resetting state
        const sceneNumberToRefresh = regeneratingSceneNumber;

        // Close popup and reset all states
        setShowRegeneratePopup(false);
        setRegenerateUserQuery('');
        setRegeneratingSceneNumber(null);
        setIsRegenerateForDescription(false);
        setIsRegenerating(false);
        setRegenerateReferenceFile([]);
        setRegenerateReferencePreview([]);

        // Reset regenerate options to defaults
        setRegenerateFrames(['opening', 'closing']);
        setRegenerateSaveAsNewVersion(false);

        // Refresh images by calling user session data API instead of reloading
        // Pass the scene number to maintain selection
        await refreshLoad(sceneNumberToRefresh);
      } else {
        // Flow 2: Regular regenerate (no reference image)
        // Build request payload
        const payload = {
          user_id: user_id,
          session_id: session_id,
          scene_number: regeneratingSceneNumber,
          model: model,
          action: 'regenerate',
          user_query: finalUserQuery,
          frames_to_regenerate: framesToRegenerate,
          save_as_new_version: regenerateSaveAsNewVersion,
          aspect_ratio: aspectRatio
        };

        // Call regenerate API endpoint
        const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/api/image-editing/regenerate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        });

        const text = await response.text();
        let data;
        try {
          data = JSON.parse(text);
        } catch (_) {
          data = text;
        }

        if (!response.ok) {
          throw new Error(`Regenerate failed: ${response.status} ${text}`);
        }

        // Handle successful response
        if (data && data.success) {

          // Store scene number before resetting state
          const sceneNumberToRefresh = regeneratingSceneNumber;

          // Close popup and reset all states
          setShowRegeneratePopup(false);
          setRegenerateUserQuery('');
          setRegeneratingSceneNumber(null);
          setIsRegenerateForDescription(false);
          setIsRegenerating(false);

          // Reset regenerate options to defaults
          setRegenerateFrames(['opening', 'closing']);
          setRegenerateSaveAsNewVersion(false);

          // Refresh images by calling user session data API instead of reloading
          // Pass the scene number to maintain selection
          await refreshLoad(sceneNumberToRefresh);
        } else {
          throw new Error('Regenerate API did not return success');
        }
      }
    } catch (e) {
      setError(e?.message || 'Failed to regenerate image');
      setIsRegenerating(false);
      setIsLoading(false);
    }
  }, [
    regenerateUserQuery,
    regeneratingSceneNumber,
    regenerateFrames,
    regenerateSaveAsNewVersion,
    regenerateReferenceFile,
    getSceneModel,
    isSORAModel,
    isVEO3Model,
    isANCHORModel,
    getAspectRatio,
    refreshLoad,
    scriptsData
  ]);

  const handleGenerateAvatar = React.useCallback(async () => {
    try {
      setIsGeneratingAvatar(true);
      setError('');
      const session_id = localStorage.getItem('session_id');
      const user_id = localStorage.getItem('token');

      if (!session_id || !user_id) {
        setError('Missing session or user');
        setIsGeneratingAvatar(false);
        return;
      }

      if (!regeneratingAvatarSceneNumber) {
        setError('Missing scene number');
        setIsGeneratingAvatar(false);
        return;
      }

      const model = getSceneModel(regeneratingAvatarSceneNumber);
      if (!model) {
        setError('Unable to determine scene model');
        setIsGeneratingAvatar(false);
        return;
      }

      const sceneRow =
        rows.find(
          (r) =>
            (r.scene_number || r.sceneNumber) === regeneratingAvatarSceneNumber
        ) || null;

      if (!sceneRow) {
        setError('Scene not found');
        setIsGeneratingAvatar(false);
        return;
      }

      const modelUpper = String(model || '').toUpperCase();
      let avatarCandidates = [];

      if (modelUpper === 'ANCHOR') {
        avatarCandidates = getAnchorAvatarImages(sceneRow) || [];
      } else {
        if (sceneRow.imageVersionData && typeof sceneRow.imageVersionData === 'object') {
          const latestVersion = getLatestVersionKey(sceneRow.imageVersionData);
          const fromVersion = getAvatarUrlsFromImageVersion(
            sceneRow.imageVersionData,
            latestVersion,
            modelUpper
          );
          if (Array.isArray(fromVersion) && fromVersion.length > 0) {
            avatarCandidates = fromVersion;
          }
        }

        if ((!avatarCandidates || avatarCandidates.length === 0) && Array.isArray(sceneRow.avatar_urls)) {
          const mapped = sceneRow.avatar_urls
            .map((av) => {
              if (typeof av === 'string') return av.trim();
              return (
                av?.imageurl ||
                av?.imageUrl ||
                av?.image_url ||
                av?.url ||
                av?.src ||
                av?.link ||
                av?.avatar_url ||
                ''
              );
            })
            .filter((url) => url && typeof url === 'string' && url.trim());
          avatarCandidates = mapped;
        }
      }

      const avatarUrl =
        Array.isArray(avatarCandidates) && avatarCandidates.length > 0
          ? String(avatarCandidates[0]).trim()
          : '';

      if (!avatarUrl) {
        setError('No avatar found for this scene');
        setIsGeneratingAvatar(false);
        return;
      }

      let originalUserQuery = '';
      if (Array.isArray(scriptsData) && scriptsData.length > 0) {
        const currentScript = scriptsData[0] || null;
        const userQueryArr = Array.isArray(currentScript?.userquery)
          ? currentScript.userquery
          : [];
        const firstUserQuery = userQueryArr[0] || {};

        if (typeof firstUserQuery === 'string') {
          originalUserQuery = firstUserQuery;
        } else if (typeof firstUserQuery === 'object') {
          originalUserQuery =
            firstUserQuery?.query ||
            firstUserQuery?.text ||
            firstUserQuery?.user_query ||
            firstUserQuery?.userQuery ||
            '';
        }
      }

      const finalUserQuery =
        regenerateAvatarUserQuery.trim() || originalUserQuery.trim();

      if (!finalUserQuery) {
        setError('Please enter how you want the avatar to be regenerated');
        setIsGeneratingAvatar(false);
        return;
      }

      const payload = {
        session_id,
        user_id,
        scene_number: regeneratingAvatarSceneNumber,
        model,
        user_query: finalUserQuery,
        avatar_url: avatarUrl
      };

      if (regenerateAvatarSaveAsNew && regenerateAvatarName.trim()) {
        payload.save_as_new_avatar = true;
        payload.new_avatar_name = regenerateAvatarName.trim();
      }

      const response = await fetch(
        'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/api/image-editing/generate-avatar',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }
      );

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = text;
      }

      if (!response.ok) {
        throw new Error(`Generate avatar failed: ${response.status} ${text}`);
      }

      if (regenerateAvatarSaveAsNew && regenerateAvatarName.trim()) {
        const generatedAvatarUrl =
          (data &&
            (data.generated_avatar_url ||
              data.generatedAvatarUrl ||
              data.avatar_url ||
              data.avatarUrl)) ||
          '';

        if (!generatedAvatarUrl || typeof generatedAvatarUrl !== 'string') {
          throw new Error('No generated avatar URL returned from API');
        }

        const downloadResp = await fetch(generatedAvatarUrl);
        if (!downloadResp.ok) {
          throw new Error(`Failed to download generated avatar: ${downloadResp.status}`);
        }
        const avatarBlob = await downloadResp.blob();

        const form = new FormData();
        form.append('user_id', user_id);
        form.append('name', regenerateAvatarName.trim());
        form.append('file', avatarBlob, 'generated-avatar.png');

        const uploadResp = await fetch(
          'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/upload-avatar',
          {
            method: 'POST',
            body: form
          }
        );

        const uploadText = await uploadResp.text();
        if (!uploadResp.ok) {
          throw new Error(`Avatar upload failed: ${uploadResp.status} ${uploadText}`);
        }

        const token = user_id;
        const getResp = await fetch(
          `https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/avatars/${encodeURIComponent(
            token
          )}`
        );
        const getText = await getResp.text();
        let avatarsData;
        try {
          avatarsData = JSON.parse(getText);
        } catch (_) {
          avatarsData = getText;
        }

        if (getResp.ok && avatarsData && typeof avatarsData === 'object') {
          const avatarsObject = avatarsData?.avatars || {};
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
          try {
            const cacheKey = `brand_assets_images:${token}`;
            const cached = localStorage.getItem(cacheKey);
            let cachedData = {};
            if (cached) {
              try {
                cachedData = JSON.parse(cached);
              } catch (_) { }
            }
            cachedData.avatars = avatarObjects;
            cachedData.avatar_urls = avatarObjects.map((a) => a.url);
            localStorage.setItem(cacheKey, JSON.stringify(cachedData));
          } catch (_) { }
        }
      }

      const sceneNumberToRefresh = regeneratingAvatarSceneNumber;

      setShowRegenerateAvatarPopup(false);
      setRegenerateAvatarUserQuery('');
      setRegeneratingAvatarSceneNumber(null);
      setRegenerateAvatarSaveAsNew(false);
      setRegenerateAvatarName('');
      setIsGeneratingAvatar(false);

      if (refreshLoad) {
        await refreshLoad(sceneNumberToRefresh);
      }
    } catch (e) {
      setError(e?.message || 'Failed to generate avatar');
      setIsGeneratingAvatar(false);
      setIsLoading(false);
    }
  }, [
    regeneratingAvatarSceneNumber,
    regenerateAvatarUserQuery,
    regenerateAvatarSaveAsNew,
    regenerateAvatarName,
    getSceneModel,
    rows,
    getAnchorAvatarImages,
    getAvatarUrlsFromImageVersion,
    refreshLoad,
    scriptsData
  ]);


  // Handle VEO3 avatar management API call
  const handleUpdateVEO3Avatars = React.useCallback(async () => {
    try {
      setIsUpdatingAvatars(true);
      setError('');
      const session_id = localStorage.getItem('session_id');
      const user_id = localStorage.getItem('token');

      if (!session_id || !user_id) {
        setError('Missing session or user');
        setIsUpdatingAvatars(false);
        return;
      }

      if (!managingAvatarSceneNumber) {
        setError('Missing scene number');
        setIsUpdatingAvatars(false);
        return;
      }

      // Filter out empty avatar URLs
      const validAvatarUrls = avatarUrls.filter(url => url && url.trim() !== '');

      if (validAvatarUrls.length === 0) {
        setError('Please provide at least one valid avatar URL');
        setIsUpdatingAvatars(false);
        return;
      }

      // Build request payload
      const payload = {
        user_id: user_id,
        session_id: session_id,
        scene_number: managingAvatarSceneNumber,
        avatar_urls: validAvatarUrls
      };

      // Call VEO3 avatars API endpoint
      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/api/image-editing/veo3-avatars', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = text;
      }

      if (!response.ok) {
        throw new Error(`Avatar update failed: ${response.status} ${text}`);
      }

      // Handle successful response
      if (data && data.success) {
        // Store scene number before resetting state
        const sceneNumberToRefresh = managingAvatarSceneNumber;

        // Close popup
        setShowAvatarManager(false);
        setManagingAvatarSceneNumber(null);
        setAvatarUrls(['', '']);

        // Refresh images by calling user session data API instead of reloading
        // Pass the scene number to maintain selection
        await refreshLoad(sceneNumberToRefresh);
      } else {
        throw new Error('Avatar update API did not return success');
      }
    } catch (e) {
      setError(e?.message || 'Failed to update avatars');
      setIsUpdatingAvatars(false);
      setIsLoading(false);
    }
  }, [managingAvatarSceneNumber, avatarUrls, refreshLoad]);

  // Handle upload background API call
  const handleUploadBackground = React.useCallback(async () => {
    try {
      setIsUploadingBackground(true);
      setError('');
      const session_id = localStorage.getItem('session_id');
      const user_id = localStorage.getItem('token');

      if (!session_id || !user_id) {
        setError('Missing session or user');
        setIsUploadingBackground(false);
        return;
      }

      if (!uploadingBackgroundSceneNumber) {
        setError('Missing scene number');
        setIsUploadingBackground(false);
        return;
      }

      if (!uploadedBackgroundFile) {
        setError('Please select an image to upload');
        setIsUploadingBackground(false);
        return;
      }

      // Get the model for the current scene (defaults to SORA if not found)
      const model = getSceneModel(uploadingBackgroundSceneNumber) || 'SORA';
      const aspectRatio = await getAspectRatio();

      // Step 1: Convert image to base64
      const base64Image = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
          const base64 = reader.result.split(',')[1]; // Remove data:image/...;base64, prefix
          resolve(base64);
        };
        reader.onerror = reject;
        reader.readAsDataURL(uploadedBackgroundFile);
      });

      // Step 2: Upload to /v1/bf_remove/upload to get blob URL
      const uploadResponse = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/bf_remove/upload', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ base64_image: base64Image })
      });

      const uploadText = await uploadResponse.text();
      let uploadData;
      try {
        uploadData = JSON.parse(uploadText);
      } catch (_) {
        uploadData = uploadText;
      }

      if (!uploadResponse.ok) {
        throw new Error(`Failed to upload image: ${uploadResponse.status} ${uploadText}`);
      }

      const uploadImageUrl = uploadData?.image_url || uploadData?.imageUrl || uploadData?.url;
      if (!uploadImageUrl) {
        throw new Error('No image URL returned from upload');
      }

      // Determine frames to upload based on model
      let framesToUpload = [];
      if (isVEO3Model(model)) {
        // VEO3: always use background only (no options)
        framesToUpload = ['background'];
      } else {
        // For ANCHOR, SORA, PLOTLY, and others: use selected frames (opening, closing, or both)
        framesToUpload = uploadFrames.length > 0 ? uploadFrames : ['opening', 'closing'];
      }

      // Step 3: Call regenerate API with JSON body
      const payload = {
        user_id: user_id,
        session_id: session_id,
        scene_number: uploadingBackgroundSceneNumber,
        model: model,
        action: 'upload',
        upload_image_url: uploadImageUrl,
        frames_to_regenerate: framesToUpload,
        save_as_new_version: false,
        aspect_ratio: aspectRatio
      };

      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/api/image-editing/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = text;
      }

      if (!response.ok) {
        throw new Error(`Upload background failed: ${response.status} ${text}`);
      }

      // Handle successful upload
      // Store scene number before resetting state
      const sceneNumberToRefresh = uploadingBackgroundSceneNumber;

      // Close popup immediately
      setShowUploadBackgroundPopup(false);
      setUploadedBackgroundFile(null);
      setUploadedBackgroundPreview(null);
      setUploadingBackgroundSceneNumber(null);

      // Refresh images by calling user session data API instead of reloading
      // Pass the scene number to maintain selection
      await refreshLoad(sceneNumberToRefresh);
    } catch (e) {
      setError(e?.message || 'Failed to upload background');
    } finally {
      // Loader turns off only after everything is complete (including refreshLoad + image display)
      setIsUploadingBackground(false);
      setIsLoading(false);
    }
  }, [uploadedBackgroundFile, uploadingBackgroundSceneNumber, uploadFrames, getSceneModel, getAspectRatio, isVEO3Model, refreshLoad]);

  // Handle background selection from assets (when user selects an image from asset modal)
  const handleSaveBackgroundFromAsset = React.useCallback(async (imageUrl) => {
    if (!imageUrl || !uploadingBackgroundSceneNumber) return;

    try {
      setIsUploadingBackground(true);
      setError('');
      const session_id = localStorage.getItem('session_id');
      const user_id = localStorage.getItem('token');

      if (!session_id || !user_id) {
        setError('Missing session or user');
        setIsUploadingBackground(false);
        return;
      }

      const model = getSceneModel(uploadingBackgroundSceneNumber);
      if (!model) {
        setError('Unable to determine scene model');
        setIsUploadingBackground(false);
        return;
      }

      const aspectRatio = await getAspectRatio();
      const isVEO3 = isVEO3Model(model);

      // Determine frames to upload - use selected frames, or default based on model
      let framesToUpload = [];
      if (isVEO3) {
        // For VEO3, always use background
        framesToUpload = ['background'];
      } else {
        // For other models, use selected frames (opening, closing, or both)
        framesToUpload = uploadFrames.length > 0 ? uploadFrames : ['opening', 'closing'];
      }

      // Call regenerate API with selected image URL
      const payload = {
        user_id: user_id,
        session_id: session_id,
        scene_number: uploadingBackgroundSceneNumber,
        model: model,
        action: 'upload',
        upload_image_url: imageUrl,
        frames_to_regenerate: framesToUpload,
        save_as_new_version: false,
        aspect_ratio: aspectRatio
      };

      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/api/image-editing/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = text;
      }

      if (!response.ok) {
        throw new Error(`Upload background failed: ${response.status} ${text}`);
      }

      // Handle successful upload
      const sceneNumberToRefresh = uploadingBackgroundSceneNumber;

      // Close popup immediately
      setShowUploadBackgroundPopup(false);
      setSelectedAssetUrl('');
      setSelectedTemplateUrls([]);
      setUploadingBackgroundSceneNumber(null);
      setUploadFrames(['background']);

      // Refresh images
      await refreshLoad(sceneNumberToRefresh);
    } catch (e) {
      setError(e?.message || 'Failed to upload background');
    } finally {
      setIsUploadingBackground(false);
      setIsLoading(false);
    }
  }, [uploadingBackgroundSceneNumber, uploadFrames, getSceneModel, getAspectRatio, isVEO3Model, refreshLoad]);

  // Handle generate from reference API call
  const handleGenerateFromReference = React.useCallback(async (imageUrl, query) => {
    if (!imageUrl || !query || !uploadingBackgroundSceneNumber) return;

    try {
      setIsGeneratingFromReference(true);
      setError('');
      const session_id = localStorage.getItem('session_id');
      const user_id = localStorage.getItem('token');

      if (!session_id || !user_id) {
        setError('Missing session or user');
        setIsGeneratingFromReference(false);
        return;
      }

      const model = getSceneModel(uploadingBackgroundSceneNumber);
      if (!model) {
        setError('Unable to determine scene model');
        setIsGeneratingFromReference(false);
        return;
      }

      const aspectRatio = await getAspectRatio();
      const isVEO3 = isVEO3Model(model);

      // Determine frames to regenerate - use selected frames, or default based on model
      let framesToRegenerate = [];
      if (isVEO3) {
        // For VEO3, always use background
        framesToRegenerate = ['background'];
      } else {
        // For other models, use selected frames (opening, closing, or both)
        framesToRegenerate = uploadFrames.length > 0 ? uploadFrames : ['opening', 'closing'];
      }

      // Call generate-from-reference API
      const payload = {
        user_id: user_id,
        session_id: session_id,
        scene_number: uploadingBackgroundSceneNumber,
        model: model,
        reference_image_url: imageUrl,
        user_query: query.trim(),
        frames_to_regenerate: framesToRegenerate,
        aspect_ratio: aspectRatio
      };

      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/api/image-editing/generate-from-reference', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = text;
      }

      if (!response.ok) {
        throw new Error(`Generate from reference failed: ${response.status} ${text}`);
      }

      // Handle successful generation
      const sceneNumberToRefresh = uploadingBackgroundSceneNumber;

      // Close popups
      setShowUserQueryPopup(false);
      setShowUploadBackgroundPopup(false);
      setSelectedAssetUrl('');
      setSelectedTemplateUrls([]);
      setUploadingBackgroundSceneNumber(null);
      setUploadFrames(['background']);
      setUserQuery('');

      // Refresh images
      await refreshLoad(sceneNumberToRefresh);
    } catch (e) {
      setError(e?.message || 'Failed to generate from reference');
    } finally {
      setIsGeneratingFromReference(false);
      setIsLoading(false);
    }
  }, [uploadingBackgroundSceneNumber, uploadFrames, getSceneModel, getAspectRatio, isVEO3Model, refreshLoad]);

  // Reset active image tab when scene changes
  useEffect(() => {
    setActiveImageTab(0);
  }, [selected?.sceneNumber, selected?.scene_number, selected?.index]);

  const loadImageElement = (src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
      img.src = src;
    });
  };

  const drawTextElementsOnCanvas = (ctx, textElements = [], width = 0, height = 0, baseWidth = width, baseHeight = height) => {
    textElements.forEach((el) => {
      if (!el || typeof el !== 'object') return;
      const bb = el.bounding_box || {};
      const maxVal = Math.max(
        Math.abs(bb.x || 0),
        Math.abs(bb.y || 0),
        Math.abs(bb.width || 0),
        Math.abs(bb.height || 0)
      );
      const isNormalized = maxVal <= 2; // values are in 0-1 range
      const scaleX = baseWidth ? width / baseWidth : 1;
      const scaleY = baseHeight ? height / baseHeight : 1;
      const toX = (v) => {
        if (!Number.isFinite(v)) return 0;
        return isNormalized ? v * width : v * scaleX;
      };
      const toY = (v) => {
        if (!Number.isFinite(v)) return 0;
        return isNormalized ? v * height : v * scaleY;
      };
      const toL = (v, total, scale) => {
        if (!Number.isFinite(v)) return undefined;
        return isNormalized ? v * total : v * scale;
      };
      const x = toX(bb.x);
      const y = toY(bb.y);
      const boxW = toL(bb.width, width, scaleX);
      const boxH = toL(bb.height, height, scaleY);

      let fontSize = Number.isFinite(el.fontSize) ? Number(el.fontSize) : 16;
      // If font size is normalized (0-2 range), scale it by canvas height to match on-screen sizing
      if (fontSize > 0 && fontSize <= 2) {
        fontSize = fontSize * height;
      }
      if (!isNormalized) {
        // Scale pixel font sizes to the render size if coordinates were pixel-based
        fontSize = fontSize * scaleY;
      }
      const fontFamily = el.fontFamily || 'sans-serif';
      const fontWeight = el.fontWeight || 'normal';
      const lineHeight = Number.isFinite(el.lineHeight) ? el.lineHeight : 1.2;
      const opacity = typeof el.textOpacity === 'number' ? el.textOpacity : 1;
      const color = el.fill || '#ffffff';
      const align = el.textAlign || el.align || el?.layout?.text_align || 'left';
      const anchor = el?.layout?.anchor_point || 'top_left';
      const shadow = el.effects?.textShadow || {};

      ctx.save();
      ctx.globalAlpha = opacity;
      ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
      ctx.fillStyle = color;
      ctx.textBaseline = 'top';
      if (['center', 'right', 'left', 'start', 'end'].includes(align)) {
        ctx.textAlign = align;
      } else {
        ctx.textAlign = 'left';
      }
      if (shadow && shadow.enabled) {
        ctx.shadowColor = shadow.color || 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = shadow.blur || 0;
        ctx.shadowOffsetX = shadow.offsetX || 0;
        ctx.shadowOffsetY = shadow.offsetY || 0;
      } else {
        ctx.shadowColor = 'transparent';
        ctx.shadowBlur = 0;
        ctx.shadowOffsetX = 0;
        ctx.shadowOffsetY = 0;
      }

      const lines = String(el.text || '').split('\n');
      const measured = lines.map((line) => ctx.measureText(line).width);
      const maxLineWidth = measured.length ? Math.max(...measured) : 0;
      const blockHeight = (lines.length || 1) * fontSize * lineHeight;
      let drawX = x;
      let drawY = y;
      if (anchor === 'center') {
        const refW = boxW || maxLineWidth;
        const refH = boxH || blockHeight;
        drawX = x - refW / 2;
        drawY = y - refH / 2;
      }
      lines.forEach((line, idx) => {
        const offsetY = drawY + idx * fontSize * lineHeight;
        ctx.fillText(line, drawX, offsetY, boxW || undefined);
      });
      ctx.restore();
    });
  };

  const drawOverlayElementsOnCanvas = async (ctx, overlayElements = [], width = 0, height = 0, baseWidth = width, baseHeight = height) => {
    for (const overlay of overlayElements) {
      if (!overlay || typeof overlay !== 'object') continue;
      const bb = overlay.bounding_box || {};
      const rotationDeg =
        typeof overlay?.rotation === 'number'
          ? overlay.rotation
          : typeof overlay?.layout?.rotation === 'number'
            ? overlay.layout.rotation
            : 0;
      const overlayUrl =
        overlay?.image_url ||
        overlay?.imageUrl ||
        overlay?.url ||
        overlay?.src ||
        overlay?.link ||
        '';
      if (!overlayUrl) continue;
      try {
        const overlayImg = await loadImageElement(overlayUrl);
        const asAbsolute = Math.max(
          Math.abs(bb.x || 0),
          Math.abs(bb.y || 0),
          Math.abs(bb.width || 0),
          Math.abs(bb.height || 0)
        ) > 2;
        const scaleX = baseWidth ? width / baseWidth : 1;
        const scaleY = baseHeight ? height / baseHeight : 1;
        const ow = Number.isFinite(bb.width)
          ? (asAbsolute ? bb.width * scaleX : bb.width * width)
          : (overlayImg.naturalWidth || overlayImg.width);
        const oh = Number.isFinite(bb.height)
          ? (asAbsolute ? bb.height * scaleY : bb.height * height)
          : (overlayImg.naturalHeight || overlayImg.height);
        const ox = Number.isFinite(bb.x) ? (asAbsolute ? bb.x * scaleX : bb.x * width) : 0;
        const oy = Number.isFinite(bb.y) ? (asAbsolute ? bb.y * scaleY : bb.y * height) : 0;
        if (rotationDeg) {
          const cx = ox + ow / 2;
          const cy = oy + oh / 2;
          ctx.save();
          ctx.translate(cx, cy);
          ctx.rotate((rotationDeg * Math.PI) / 180);
          ctx.drawImage(overlayImg, -ow / 2, -oh / 2, ow, oh);
          ctx.restore();
        } else {
          ctx.drawImage(overlayImg, ox, oy, ow, oh);
        }
      } catch (_) {
        // Skip overlay on failure, continue with the rest
      }
    }
  };

  const mergeFrameToDataUrl = React.useCallback(
    async (frame, fallbackDimensions = null, options = {}) => {
      const { includeOverlays = true, includeText = true } = options;
      if (!frame) return null;
      const base = frame?.base_image || frame?.baseImage || {};
      const imgUrl =
        base?.image_url ||
        base?.imageUrl ||
        base?.url ||
        frame?.image_url ||
        frame?.imageUrl ||
        frame?.url ||
        (typeof frame === 'string' ? frame : '');
      if (!imgUrl) return null;

      const imgEl = await loadImageElement(imgUrl);
      const baseDims = base?.image_dimensions || base?.imageDimensions || fallbackDimensions || {};
      // Prefer the explicit image_dimensions from the backend so the canvas
      // size matches the original render exactly (width/height in pixels).
      const baseWidth =
        (Number(baseDims?.width) || 0) > 0
          ? Number(baseDims.width)
          : imgEl.naturalWidth || imgEl.width || 1280;
      const baseHeight =
        (Number(baseDims?.height) || 0) > 0
          ? Number(baseDims.height)
          : imgEl.naturalHeight || imgEl.height || 720;
      const width = baseWidth;
      const height = baseHeight;

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(imgEl, 0, 0, width, height);

      const textEls = Array.isArray(frame?.text_elements)
        ? frame.text_elements
        : Array.isArray(frame?.textElements)
          ? frame.textElements
          : [];
      const overlayEls = Array.isArray(frame?.overlay_elements)
        ? frame.overlay_elements
        : Array.isArray(frame?.overlayElements)
          ? frame.overlayElements
          : [];

      if (includeText && textEls.length > 0) {
        drawTextElementsOnCanvas(ctx, textEls, width, height, baseWidth || width, baseHeight || height);
      }
      if (includeOverlays && overlayEls.length > 0) {
        await drawOverlayElementsOnCanvas(
          ctx,
          overlayEls,
          width,
          height,
          baseWidth || width,
          baseHeight || height
        );
      }

      return canvas.toDataURL('image/png');
    },
    []
  );

  // Download helper for a single frame (base image + text + overlays)
  const downloadFrameImage = React.useCallback(
    async ({
      sceneNumber,
      imageIndex,
      imageUrl
    }) => {
      try {
        const row = rows.find(
          (r, idx) =>
            (r?.scene_number || idx + 1) === sceneNumber
        );
        if (!row) return;

        const frames = Array.isArray(row.imageFrames)
          ? row.imageFrames
          : [];
        const fallbackDims =
          row?.imageDimensions || row?.image_dimensions || null;

        let frame = null;
        if (frames.length > 0) {
          frame =
            findFrameForImage(frames, imageUrl, imageIndex) ||
            frames[imageIndex] ||
            frames[0] ||
            null;
        }

        let dataUrl = null;
        if (frame) {
          dataUrl = await mergeFrameToDataUrl(frame, fallbackDims, {
            includeOverlays: true
          });
        } else {
          // Fallback: just render the raw image using image_dimensions when available
          const imgEl = await loadImageElement(imageUrl);
          const baseDims = fallbackDims || {};
          const width =
            (Number(baseDims?.width) || 0) > 0
              ? Number(baseDims.width)
              : imgEl.naturalWidth || imgEl.width || 1280;
          const height =
            (Number(baseDims?.height) || 0) > 0
              ? Number(baseDims.height)
              : imgEl.naturalHeight || imgEl.height || 720;
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(imgEl, 0, 0, width, height);
          dataUrl = canvas.toDataURL('image/png');
        }

        if (!dataUrl) return;

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `scene-${sceneNumber}-image-${imageIndex + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
      }
    },
    [rows, findFrameForImage, mergeFrameToDataUrl]
  );

  // Prefer exporting exactly what the user sees on screen by snapshotting
  // the DOM container for the active image (base + text + overlays).
  const exportVisibleImageFromDom = React.useCallback(
    async ({ sceneNumber, imageIndex }) => {
      try {
        const dataUrl = await captureSceneImageWithHtml2Canvas(sceneNumber, imageIndex);
        if (!dataUrl) return;

        const link = document.createElement('a');
        link.href = dataUrl;
        link.download = `scene-${sceneNumber}-image-${imageIndex + 1}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } catch (err) {
      }
    },
    []
  );

  const handleFrameEditComplete = useCallback(
    ({ sceneNumber, imageIndex, textElements = [], overlayElements = [] }) => {
      setIsSceneUpdating(true);

      // Helper function to identify chart overlays
      const isChartOverlay = (overlay) => {
        if (!overlay || typeof overlay !== 'object') return false;
        return overlay?.element_id === 'chart_overlay' ||
          overlay?.label_name === 'Chart' ||
          overlay?.type === 'chart' ||
          overlay?.isChartOverlay === true ||
          (overlay?.overlay_image?.image_url && overlay?.overlay_image?.image_url.includes('chart'));
      };

      setRows((prevRows) =>
        prevRows.map((row) => {
          const rowSceneNumber = row?.scene_number ?? row?.sceneNumber;
          if (rowSceneNumber !== sceneNumber) return row;
          const updatedRow = { ...row };
          // Check both model and mode fields (some rows use mode instead of model)
          const modelUpper = String(row?.model || row?.mode || '').toUpperCase();
          const isPlotly = modelUpper === 'PLOTLY';

          if (Array.isArray(row.imageFrames)) {
            if (isPlotly) {
              // For PLOTLY: Only sync chart overlays between images
              // Separate chart overlays from other overlays
              const chartOverlays = overlayElements.filter(isChartOverlay);

              updatedRow.imageFrames = row.imageFrames.map((frame, idx) => {
                if (idx === imageIndex) {
                  // For the edited image: update with all text and overlay elements
                  return {
                    ...frame,
                    text_elements: textElements,
                    overlay_elements: overlayElements
                  };
                } else {
                  // For the other image: keep existing text and non-chart overlays, update chart overlays
                  const existingTextElements = Array.isArray(frame?.text_elements) ? frame.text_elements :
                    Array.isArray(frame?.textElements) ? frame.textElements : [];
                  const existingOverlayElements = Array.isArray(frame?.overlay_elements) ? frame.overlay_elements :
                    Array.isArray(frame?.overlayElements) ? frame.overlayElements : [];
                  const existingNonChartOverlays = existingOverlayElements.filter(ov => !isChartOverlay(ov));
                  const mergedOverlays = [...existingNonChartOverlays, ...chartOverlays];

                  return {
                    ...frame,
                    text_elements: existingTextElements, // Keep existing text elements
                    overlay_elements: mergedOverlays // Merge: keep non-chart, replace chart
                  };
                }
              });
            } else {
              // For other models: apply only to the specific frame being edited
              updatedRow.imageFrames = row.imageFrames.map((frame, idx) => {
                if (idx !== imageIndex) return frame;
                return {
                  ...frame,
                  text_elements: textElements,
                  overlay_elements: overlayElements
                };
              });
            }
          }
          updatedRow.textElements = textElements;
          return updatedRow;
        })
      );

      setSelected((prev) => {
        if (!prev) return prev;
        const rowSceneNumber = prev?.sceneNumber || prev?.scene_number;
        if (rowSceneNumber !== sceneNumber) return prev;
        const next = { ...prev };
        // Check both model and mode fields (some rows use mode instead of model)
        const modelUpper = String(prev?.model || prev?.mode || '').toUpperCase();
        const isPlotly = modelUpper === 'PLOTLY';

        next.textElements = textElements;
        if (Array.isArray(prev.imageFrames)) {
          if (isPlotly) {
            // For PLOTLY: Only sync chart overlays between images
            const chartOverlays = overlayElements.filter(isChartOverlay);

            next.imageFrames = prev.imageFrames.map((frame, idx) => {
              if (idx === imageIndex) {
                // For the edited image: update with all text and overlay elements
                return {
                  ...frame,
                  text_elements: textElements,
                  overlay_elements: overlayElements
                };
              } else {
                // For the other image: keep existing text and non-chart overlays, update chart overlays
                const existingTextElements = Array.isArray(frame?.text_elements) ? frame.text_elements :
                  Array.isArray(frame?.textElements) ? frame.textElements : [];
                const existingOverlayElements = Array.isArray(frame?.overlay_elements) ? frame.overlay_elements :
                  Array.isArray(frame?.overlayElements) ? frame.overlayElements : [];
                const existingNonChartOverlays = existingOverlayElements.filter(ov => !isChartOverlay(ov));
                const mergedOverlays = [...existingNonChartOverlays, ...chartOverlays];

                return {
                  ...frame,
                  text_elements: existingTextElements, // Keep existing text elements
                  overlay_elements: mergedOverlays // Merge: keep non-chart, replace chart
                };
              }
            });
          } else {
            // For other models: apply only to the specific frame being edited
            next.imageFrames = prev.imageFrames.map((frame, idx) =>
              idx === imageIndex
                ? {
                  ...frame,
                  text_elements: textElements,
                  overlay_elements: overlayElements
                }
                : frame
            );
          }
        }
        return next;
      });

      if (sceneUpdateTimeoutRef.current) {
        clearTimeout(sceneUpdateTimeoutRef.current);
      }
      sceneUpdateTimeoutRef.current = setTimeout(() => {
        setIsSceneUpdating(false);
      }, 1500);
    },
    [sceneUpdateTimeoutRef]
  );

  const dataUrlToBlob = React.useCallback(async (dataUrl) => {
    const res = await fetch(dataUrl);
    return await res.blob();
  }, []);


  // Shared helper: capture the on-screen image (base + overlays + text) for a
  // given scene/image index using consistent html2canvas settings.
  async function captureSceneImageWithHtml2Canvas(sceneNumber, imageIndex) {
    const selector = `[data-image-container][data-scene-number="${sceneNumber}"][data-image-index="${imageIndex}"]`;
    let node = document.querySelector(selector);
    if (!node) {
      const altSelectors = [
        `[data-scene-number="${sceneNumber}"][data-image-index="${imageIndex}"]`,
        `[d ata="${sceneNumber}"][data-image="${imageIndex}"]`,
      ];
      for (const altSelector of altSelectors) {
        const altNode = document.querySelector(altSelector);
        if (altNode) {
          node = altNode;
          break;
        }
      }
      if (!node) {
        return null;
      }
    }

    try {
      const canvas = await html2canvas(node, {
        useCORS: true,
        logging: false,
        backgroundColor: null,
        // Use device pixel ratio or 1 to keep file size under API limits.
        scale: window.devicePixelRatio || 1,
        allowTaint: false,
        removeContainer: false
      });
      const dataUrl = canvas.toDataURL('image/png');
      return dataUrl;
    } catch (err) {
      console.error(`❌ html2canvas error for Scene ${sceneNumber}, Image ${imageIndex + 1}:`, err);
      return null;
    }
  }

  const blobToDataUrl = React.useCallback((blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }, []);

  const mergeAndDownloadAllImages = React.useCallback(async (options = {}) => {
    const { includeText = true, includeOverlays = true } = options;
    let failed = 0;
    let saved = 0;

    try {
      // CRITICAL: Verify storage ref is valid at the START of the function
      if (!imageStorageRef.current) {
        console.warn('⚠️ Storage ref is null at start, initializing...');
        imageStorageRef.current = new Map();
      }
      if (!(imageStorageRef.current instanceof Map)) {
        console.warn('⚠️ Storage ref is not a Map at start, re-initializing...');
        imageStorageRef.current = new Map();
      }

      if (rows.length === 0) {
        return failed;
      }

      // Iterate through ALL rows (scenes)
      for (let sceneIndex = 0; sceneIndex < rows.length; sceneIndex++) {
        const row = rows[sceneIndex];
        const sceneNumber = row?.scene_number || (sceneIndex + 1);
        const modelUpper = String(row?.model || '').toUpperCase();
        const isVeo3 = modelUpper === 'VEO3';
        const isAnchor = modelUpper === 'ANCHOR';
        const isPlotly = modelUpper === 'PLOTLY';
        const anchorImagesCombined = isAnchor
          ? dedupeImages([
            ...(getAnchorAvatarImages(row) || []),
            ...(getSceneImages(row) || [])
          ])
          : [];
        const sceneImages = isVeo3 ? getVeo3ImageTabImages(row) : (isAnchor ? anchorImagesCombined : getSceneImages(row));
        const images = sceneImages || [];
        const frames = Array.isArray(row?.imageFrames) ? row.imageFrames : [];
        const fallbackDims = row?.imageDimensions || row?.image_dimensions || null;

        // Process each image in this scene
        for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
          const imageUrl = images[imageIndex];

          if (!imageUrl) {
            continue;
          }

          try {
            let dataUrl = null;

            // CRITICAL: For ALL non-Plotly images, we MUST switch to that scene + image tab
            // and capture the LIVE DOM using html2canvas, exactly as Export does.
            // When includeText is false, we still capture DOM for overlays but hide text temporarily.
            const shouldUseDomCapture = !isPlotly && includeOverlays;
            if (shouldUseDomCapture) {

              // 1) Switch to this scene
              const currentSceneNumber = selected?.sceneNumber || selected?.scene_number;
              if (String(currentSceneNumber) !== String(sceneNumber)) {
                const targetRow = rows.find((r, idx) => (r?.scene_number || idx + 1) === sceneNumber);
                if (targetRow) {
                  const targetModelUpper = String(targetRow?.model || '').toUpperCase();
                  const targetIsVeo3 = targetModelUpper === 'VEO3';
                  const targetIsAnchor = targetModelUpper === 'ANCHOR';
                  const imgs = targetIsVeo3 ? getVeo3ImageTabImages(targetRow) : (targetIsAnchor ? getAnchorAvatarImages(targetRow) : getSceneImages(targetRow));
                  const imageEntries = buildImageEntries(imgs, targetRow?.imageFrames);
                  const firstImg = imgs[0] || '';
                  // Get avatar URLs from current version of image object for VEO3 scenes
                  const latestVersionForTarget = targetRow?.imageVersionData ? getLatestVersionKey(targetRow.imageVersionData) : 'v1';
                  const avatarUrlsFromVersion4 = getAvatarUrlsFromImageVersion(
                    targetRow?.imageVersionData || null,
                    latestVersionForTarget,
                    modelUpper
                  );
                  const finalAvatarUrls4 = avatarUrlsFromVersion4.length > 0
                    ? avatarUrlsFromVersion4
                    : (Array.isArray(targetRow?.avatar_urls) ? targetRow.avatar_urls : []);

                  setSelected({
                    index: sceneIndex,
                    imageUrl: firstImg,
                    images: imageEntries,
                    title: targetRow.scene_title || 'Untitled',
                    sceneNumber: targetRow.scene_number,
                    description: targetRow?.description || '',
                    narration: targetRow?.narration || '',
                    textToBeIncluded: targetRow?.textToBeIncluded || '',
                    model: modelUpper,
                    prompts: targetRow?.prompts || { opening_frame: {}, closing_frame: {} },
                    imageDimensions: targetRow?.imageDimensions || null,
                    textElements: Array.isArray(targetRow?.textElements) ? targetRow.textElements : [],
                    overlayElements: Array.isArray(targetRow?.overlayElements) ? targetRow.overlayElements : [],
                    imageVersionData: targetRow?.imageVersionData || null,
                    imageFrames: Array.isArray(targetRow?.imageFrames) ? targetRow.imageFrames : [],
                    avatar_urls: finalAvatarUrls4,
                    current_version: latestVersionForTarget,
                    isEditable: !!targetRow?.isEditable
                  });
                  // Wait for React to render this scene
                  await new Promise(resolve => setTimeout(resolve, 400));
                }
              }

              // 2) Switch to the correct image tab (0 for Image 1, 1 for Image 2)
              if (activeImageTab !== imageIndex) {
                setActiveImageTab(imageIndex);
                // Wait for React to render this tab's DOM container
                await new Promise(resolve => setTimeout(resolve, 400));
              }

              // 3) Now capture the DOM with html2canvas (same as Export)
              let restoreText = null;
              let restoreCharts = null;
              try {
                // Always hide charts during capture; hide text when we must exclude it.
                restoreCharts = hideChartOverlaysForCapture();
                if (!includeText) {
                  restoreText = hideTextOverlaysForCapture();
                }
                dataUrl = await captureSceneImageWithHtml2Canvas(sceneNumber, imageIndex);
              } catch (html2canvasError) {
                console.error(`❌ html2canvas error for Scene ${sceneNumber}, Image ${imageIndex + 1}:`, html2canvasError);
                dataUrl = null; // Will use fallback
              } finally {
                if (typeof restoreText === 'function') {
                  try { restoreText(); } catch (restErr) { console.warn('Restore text visibility failed', restErr); }
                }
                if (typeof restoreCharts === 'function') {
                  try { restoreCharts(); } catch (restErr) { console.warn('Restore chart visibility failed', restErr); }
                }
              }
            }

            // 2) If DOM snapshot was not used or failed, fall back to frame-based rendering.
            if (!dataUrl) {
              // Find the corresponding frame for this image (if any)
              let frame = null;
              if (frames.length > 0) {
                frame =
                  findFrameForImage(frames, imageUrl, imageIndex) ||
                  frames[imageIndex] ||
                  frames[0] ||
                  null;
              }

              if (frame) {
                // Use frame data + base image dimensions to build the canvas at the correct size.
                // For PLOTLY, do NOT bake overlay images into the saved frame; overlays stay visual-only.
                try {
                  dataUrl = await mergeFrameToDataUrl(frame, fallbackDims, {
                    includeOverlays: includeOverlays && !isPlotly,
                    includeText
                  });
                } catch (frameError) {
                  console.error(`❌ Frame-based rendering failed for Scene ${sceneNumber}, Image ${imageIndex + 1}:`, frameError);
                  dataUrl = null; // Will try raw image fallback
                }
              } else {
                // Final fallback: load the raw image and render it to a canvas sized
                // according to image_dimensions when available.
                try {
                  const imgEl = await loadImageElement(imageUrl);
                  const baseDims = fallbackDims || {};
                  const width =
                    (Number(baseDims?.width) || 0) > 0
                      ? Number(baseDims.width)
                      : imgEl.naturalWidth || imgEl.width || 1280;
                  const height =
                    (Number(baseDims?.height) || 0) > 0
                      ? Number(baseDims.height)
                      : imgEl.naturalHeight || imgEl.height || 720;

                  const canvas = document.createElement('canvas');
                  canvas.width = width;
                  canvas.height = height;
                  const ctx = canvas.getContext('2d');
                  ctx.drawImage(imgEl, 0, 0, width, height);

                  dataUrl = canvas.toDataURL('image/png');
                } catch (rawError) {
                  console.error(`❌ Raw image fallback failed for Scene ${sceneNumber}, Image ${imageIndex + 1}:`, rawError);
                  dataUrl = null;
                }
              }
            }

            if (!dataUrl) {
              failed += 1;
              continue;
            }

            // Convert data URL to blob
            let blob;
            try {
              blob = await dataUrlToBlob(dataUrl);
              if (!blob || !(blob instanceof Blob)) {
                console.error(`   ✗ ERROR: Failed to convert data URL to blob`);
                failed += 1;
                continue;
              }
            } catch (blobError) {
              console.error(`   ✗ ERROR: Exception converting to blob:`, blobError);
              failed += 1;
              continue;
            }

            // Generate filename
            const fileName = `scene-${sceneNumber}-image-${imageIndex + 1}.png`;

            // WORKAROUND: Store image in browser memory instead of server temp folder
            // This bypasses the /api/save-temp-image endpoint that's not working

            try {

              // CRITICAL: Verify storage ref exists and is valid BEFORE using it
              if (!imageStorageRef.current) {
                console.warn(`   ⚠️ Storage ref was null, initializing new Map...`);
                imageStorageRef.current = new Map();
              }
              if (!(imageStorageRef.current instanceof Map)) {
                console.warn(`   ⚠️ Storage ref was not a Map, re-initializing...`);
                imageStorageRef.current = new Map();
              }

              // Verify blob is valid
              if (!blob || !(blob instanceof Blob)) {
                console.error(`   ✗ ERROR: Invalid blob! blob=${blob}, type=${typeof blob}`);
                failed += 1;
                continue;
              }

              // Store the blob in memory using a Map
              imageStorageRef.current.set(fileName, blob);
              // Immediately verify it was stored (use a different variable to avoid confusion)
              const verifyBlob = imageStorageRef.current.get(fileName);

              if (!verifyBlob) {
                console.error(`   ✗ ERROR: Image NOT found in storage after setting!`);
                console.error(`   Storage size: ${imageStorageRef.current.size}, keys:`, Array.from(imageStorageRef.current.keys()));
                console.error(`   Attempted to save: ${fileName}`);
                failed += 1;
                continue;
              }

              saved += 1;
            } catch (error) {
              console.error(`❌ Scene ${sceneNumber}, Image ${imageIndex + 1}: Failed to save`, error);
              console.error(`   Error details:`, error?.message);
              console.error(`   Stack:`, error?.stack);
              failed += 1;
            }

            // Small delay between images
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (error) {
            console.error(`❌ Outer catch block - Scene ${sceneNumber}, Image ${imageIndex + 1}:`, error);
            console.error(`   Error message:`, error?.message);
            console.error(`   Error stack:`, error?.stack);
            failed += 1;
          }
        }
      }

      // Save process complete

      // No alerts - just console logs for background processing
    } catch (error) {
      console.error('❌ Error in mergeAndDownloadAllImages:', error);
      // No alert - error will be handled by parent function
      throw error;
    }

    return failed;
  }, [
    rows,
    selected,
    activeImageTab,
    imageStorageRef,
    getSceneImages,
    getVeo3ImageTabImages,
    getAnchorAvatarImages,
    getAvatarUrlsFromImageVersion,
    buildImageEntries,
    findFrameForImage,
    mergeFrameToDataUrl,
    dataUrlToBlob,
    loadImageElement,
    setSelected,
    setActiveImageTab
  ]);

  // Function to call save-all-frames API with temp folder images
  const callSaveAllFramesAPI = React.useCallback(async () => {
    try {
      const userId = localStorage.getItem('token');
      const sessionId = localStorage.getItem('session_id');

      if (!userId || !sessionId) {
        throw new Error('Missing user_id or session_id');
      }

      // Build frame metadata based on rows
      const frameMetadata = [];
      let fileIndex = 0;
      const fileMap = {}; // Map scene-image to file index
      const sceneImagesByIndex = [];
      const sceneMetaByScene = new Map(); // scene_number -> metadata (for ANCHOR binaries)

      for (let sceneIndex = 0; sceneIndex < rows.length; sceneIndex++) {
        const row = rows[sceneIndex];
        const sceneNumber = row?.scene_number || (sceneIndex + 1);
        const model = row?.model || 'VEO3';
        const modelUpper = String(model).toUpperCase();
        const isVeo3 = modelUpper === 'VEO3';
        const isAnchor = modelUpper === 'ANCHOR';
        const veo3ImageRefs = isVeo3 ? getVeo3ImageTabImages(row) : [];
        const anchorAvatarImages = isAnchor ? getAnchorAvatarImages(row) : [];
        const anchorImagesCombined = isAnchor
          ? dedupeImages([
            ...(anchorAvatarImages || []),
            ...(getSceneImages(row) || [])
          ])
          : [];
        const images = isVeo3 ? veo3ImageRefs : (isAnchor ? anchorImagesCombined : getSceneImages(row));
        sceneImagesByIndex[sceneIndex] = images;

        const sceneMetadata = {
          scene_number: sceneNumber,
          model: modelUpper
        };

        // Map images to file indices
        for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
          const fileName = `scene-${sceneNumber}-image-${imageIndex + 1}.png`;
          const fileKey = `file_${fileIndex}`;
          fileMap[fileName] = fileKey;

          if (isAnchor) {
            // For ANCHOR, backend expects opening_frame / closing_frame only.
            if (imageIndex === 0) {
              sceneMetadata.opening_frame = fileKey;
            }
            // If we only have one image, use it for both opening and closing.
            if (imageIndex === 1 || (images.length === 1 && imageIndex === 0)) {
              sceneMetadata.closing_frame = fileKey;
            }
          } else if (isVeo3) {
            // For VEO3, keep using background_frame.
            if (!sceneMetadata.background_frame) {
              sceneMetadata.background_frame = fileKey;
            }
          } else if (images.length === 1) {
            // Non-VEO3 single image scene - use background_frame
            sceneMetadata.background_frame = fileKey;
          } else {
            // Non-VEO3 multiple images - use opening_frame and closing_frame
            if (imageIndex === 0) {
              sceneMetadata.opening_frame = fileKey;
            }
            if (imageIndex === 1) {
              sceneMetadata.closing_frame = fileKey;
            }
          }

          fileIndex++;
        }

        frameMetadata.push(sceneMetadata);
        sceneMetaByScene.set(sceneNumber, sceneMetadata);
      }


      // Create FormData
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('session_id', sessionId);

      // WORKAROUND: Read images from browser memory instead of server temp folder
      const imageFiles = [];

      // Verify storage ref is valid before proceeding
      if (!imageStorageRef.current) {
        console.error('❌ ERROR: imageStorageRef.current is null! Re-initializing...');
        imageStorageRef.current = new Map();
      }
      if (!(imageStorageRef.current instanceof Map)) {
        console.error('❌ ERROR: imageStorageRef.current is not a Map! Re-initializing...');
        imageStorageRef.current = new Map();
      }

      const storageSize = imageStorageRef.current.size;

      if (storageSize === 0) {
        console.error('❌ ERROR: Storage is EMPTY! No images were saved in Step 1.');
        console.error('   This means mergeAndDownloadAllImages() did not save any images.');
        console.error('   Please check Step 1 logs to see why images failed to save.');
        throw new Error('No images found in browser memory storage. Images were not saved in Step 1.');
      }

      const storageKeys = Array.from(imageStorageRef.current.keys());

      for (let sceneIndex = 0; sceneIndex < rows.length; sceneIndex++) {
        const row = rows[sceneIndex];
        const sceneNumber = row?.scene_number || (sceneIndex + 1);
        const modelUpper = String(row?.model || '').toUpperCase();
        const isVeo3 = modelUpper === 'VEO3';
        const isAnchor = modelUpper === 'ANCHOR';
        const veo3ImageRefs = isVeo3 ? getVeo3ImageTabImages(row) : [];
        const anchorAvatarImages = isAnchor ? getAnchorAvatarImages(row) : [];
        const anchorImagesCombined = isAnchor
          ? dedupeImages([
            ...(anchorAvatarImages || []),
            ...(getSceneImages(row) || [])
          ])
          : [];
        const images = sceneImagesByIndex[sceneIndex] || (isVeo3 ? veo3ImageRefs : (isAnchor ? anchorImagesCombined : getSceneImages(row)));

        for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
          const fileName = `scene-${sceneNumber}-image-${imageIndex + 1}.png`;
          const fileKey = fileMap[fileName];

          // Looking for file in storage

          // Get image from browser memory storage
          try {
            let blob = imageStorageRef.current.get(fileName);

            if (!blob) {
              console.warn(`⚠️ Image not found in storage: ${fileName}`);
              // Try to find any matching file
              const allKeys = Array.from(imageStorageRef.current.keys());
              const matchingKey = allKeys.find(key => key.includes(`scene-${sceneNumber}`) && key.includes(`image-${imageIndex + 1}`));
              if (matchingKey) {
                const altBlob = imageStorageRef.current.get(matchingKey);
                if (altBlob) {
                  // Use the alternative blob with the expected fileName
                  imageStorageRef.current.set(fileName, altBlob);
                  imageStorageRef.current.delete(matchingKey);
                  blob = imageStorageRef.current.get(fileName);
                  if (!blob) {
                    console.error(`   ✗ Failed to correct storage for ${fileName}`);
                    continue;
                  }
                } else {
                  console.error(`   ✗ Alternative key ${matchingKey} also has no blob`);
                  continue;
                }
              } else {
                console.error(`   ✗ No matching key found for ${fileName}`);
                continue;
              }
            } else {
              // Found image in storage
            }

            // If we reach here, we have a valid blob
            if (!blob) {
              continue;
            }

            // Create File object from blob
            // IMPORTANT: Use window.File to avoid conflict with lucide-react File import
            try {
              // Use window.File to get the native browser File constructor
              // (lucide-react File import was renamed to FileIcon to avoid shadowing)
              const file = new window.File([blob], fileName, { type: 'image/png' });

              // Verify file was created
              if (!file || file.size !== blob.size) {
                console.error(`   ✗ ERROR: Failed to create File object for ${fileName}`);
                // Fallback: use Blob directly with filename
                formData.append('frames', blob, fileName);
                imageFiles.push(fileName);
                continue;
              }

              // Add to FormData with file key
              formData.append('frames', file);
              imageFiles.push(fileName);

            } catch (fileError) {
              console.error(`   ✗ ERROR: Failed to create File from blob for ${fileName}:`, fileError);
              console.error(`   Error details:`, fileError?.message);
              // Fallback: try using Blob directly with filename
              try {
                formData.append('frames', blob, fileName);
                imageFiles.push(fileName);
              } catch (blobError) {
                console.error(`   ✗ ERROR: Failed to add blob directly:`, blobError);
                continue;
              }
            }

          } catch (error) {
            console.error(`   ✗ ERROR: Exception processing ${fileName}:`, error);
          }
        }
      }

      if (imageFiles.length === 0) {
        console.error('❌ ERROR: No images were added to FormData!');
        console.error(`   Expected images based on metadata: ${frameMetadata.length} scene(s)`);
        console.error(`   Storage size: ${imageStorageRef.current?.size || 0}`);
        console.error(`   Storage keys:`, Array.from(imageStorageRef.current?.keys() || []));
        throw new Error('No images found in browser memory storage. Check console for details.');
      }

      // Images collected in memory; frame metadata prepared

      // Attach frame metadata (including any ANCHOR mappings) after it has been fully populated.
      formData.append('frame_metadata', JSON.stringify(frameMetadata));

      // Call API
      const apiUrl = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/api/image-editing/save-all-frames';
      const apiResponse = await fetch(apiUrl, {
        method: 'POST',
        body: formData,
      });

      const responseText = await apiResponse.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      if (!apiResponse.ok) {
        console.error('❌ save-all-frames API failed:', apiResponse.status, responseData);
        throw new Error(`API request failed: ${apiResponse.status} ${JSON.stringify(responseData)}`);
      }

      // WORKAROUND: Clear images from browser memory instead of deleting from server
      for (const fileName of imageFiles) {
        try {
          if (imageStorageRef.current.has(fileName)) {
            imageStorageRef.current.delete(fileName);
          }
        } catch (error) {
        }
      }

      return { success: true, response: responseData };

    } catch (error) {
      console.error('❌ Error in callSaveAllFramesAPI:', error);
      console.error('   Error message:', error?.message);
      console.error('   Error stack:', error?.stack);
      throw error;
    }
  }, [rows, imageStorageRef, getSceneImages, getVeo3ImageTabImages, getAnchorAvatarImages, getOrderedRefs, blobToDataUrl]);

  // Function to call /v1/videos/regenerate after save-all-frames succeeds
  // NOTE: Disabled per request; kept for reference.
  // eslint-disable-next-line no-unused-vars
  const callVideosRegenerateAPI = React.useCallback(async () => {
    try {
      const session_id = localStorage.getItem('session_id');
      const user_id = localStorage.getItem('token');

      if (!session_id || !user_id) {
        return;
      }

      // Use the raw aspect ratio from session data for the video generation API
      let aspectRatio = await getSessionAspectRatioRaw();
      // Map underscore formats from scripts to colon formats expected by backend
      if (aspectRatio === '9_16') aspectRatio = '9:16';
      else if (aspectRatio === '16_9') aspectRatio = '16:9';
      const subtitlesFlag = !!subtitlesEnabled;

      // Determine if any scene has logo enabled
      const anyLogoNeeded =
        !!sessionAssets.logo_url &&
        Object.values(sceneAdvancedOptions || {}).some(
          (opts) => opts && opts.logoNeeded
        );

      const scenesPayload = rows.map((row, index) => {
        const sceneNumber = row?.scene_number || index + 1;
        const modelUpper = String(row?.model || '').toUpperCase() || 'VEO3';
        const isVEO3 = modelUpper === 'VEO3';

        const sceneOptions = sceneAdvancedOptions[sceneNumber] || {
          logoNeeded: false,
          voiceUrl: '',
          voiceOption: PRESET_VOICE_OPTIONS.male[0]?.key || 'american_male',
          transitionPreset: null,
          transitionCustom: null,
          transitionCustomPreset: null,
          customDescription: '',
          customPreservationNotes: {
            lighting: '',
            style_mood: '',
            transition_type: '',
            scene_description: '',
            subject_description: '',
            action_specification: '',
            content_modification: '',
            camera_specifications: '',
            geometric_preservation: '',
          },
          subtitleSceneOnly: false,
          rememberCustomPreset: false,
          customPresetName: '',
        };

        let logoUrl = '';
        if (sceneOptions.logoNeeded && sessionAssets.logo_url) {
          logoUrl = sessionAssets.logo_url;
        } else if (!sceneOptions.logoNeeded && anyLogoNeeded) {
          logoUrl = '';
        }

        let voiceover = null;
        let voiceOption = '';
        const voiceoverUrl = sceneOptions.voiceUrl || '';

        // Handle voiceover for all model types (including VEO3)
        if (voiceoverUrl) {
          // If voice URL is selected, use it as voiceover string
          if (typeof voiceoverUrl === 'object') {
            // Extract voiceurl from object, or use url as fallback
            const extractedUrl = voiceoverUrl.voiceurl || voiceoverUrl.url || '';
            voiceover = extractedUrl || null;
          } else {
            // Just use the string URL directly
            voiceover = voiceoverUrl;
          }
          // When voiceover URL is selected, voiceOption should be empty/null
          voiceOption = '';
        } else {
          // If no voice URL selected, voiceover is null and voiceOption is sent as string
          voiceover = null;
          if (!isVEO3) {
            voiceOption = sceneOptions.voiceOption || '';
            if (!voiceOption || voiceOption.trim() === '') {
              voiceOption = PRESET_VOICE_OPTIONS.male[0]?.key || 'american_male';
            } else if (voiceOption === 'male' || voiceOption === 'female') {
              // Convert old format to new key format
              const gender = voiceOption;
              voiceOption = PRESET_VOICE_OPTIONS[gender]?.[0]?.key || (gender === 'male' ? 'american_male' : 'american_female');
            }
          } else {
            // For VEO3, if no voice URL, still set a default voiceOption
            voiceOption = sceneOptions.voiceOption || PRESET_VOICE_OPTIONS.male[0]?.key || 'american_male';
            if (voiceOption === 'male' || voiceOption === 'female') {
              // Convert old format to new key format
              const gender = voiceOption;
              voiceOption = PRESET_VOICE_OPTIONS[gender]?.[0]?.key || (gender === 'male' ? 'american_male' : 'american_female');
            }
          }
        }

        const scenePayload = {
          scene_number: sceneNumber,
          model: modelUpper,
          logo_url: logoUrl,
        };

        if (!isVEO3) {
          const transitions = [];
          const isSoraAnchorPlotly =
            modelUpper === 'SORA' ||
            modelUpper === 'ANCHOR' ||
            modelUpper === 'PLOTLY';

          if (isSoraAnchorPlotly) {
            const hasPreset = !!sceneOptions.transitionPreset;
            const isPreset = hasPreset && sceneOptions.transitionCustom !== 'custom';

            // Always check for animation_desc in the row for ALL scenes (except VEO3)
            // Get animation_desc from the row (preferred) or fallback to customPreservationNotes
            let animationDescData = {};

            // Try to get animation_desc from imageVersionData structure
            if (row?.imageVersionData) {
              const imageVersionData = row.imageVersionData;
              const versionKey = getLatestVersionKey(imageVersionData);
              const verObj = imageVersionData[versionKey] || {};
              animationDescData = verObj?.animation_desc || {};
            }

            // Fallback to direct animation_desc field
            if (Object.keys(animationDescData).length === 0) {
              animationDescData = row?.animation_desc || {};
            }

            // Final fallback to customPreservationNotes
            if (Object.keys(animationDescData).length === 0) {
              animationDescData = sceneOptions.customPreservationNotes || {};
            }

            if (isPreset) {
              // If preset is selected, use preset
              const preset = sceneOptions.transitionPreset;
              transitions.push({
                is_preset: true,
                savepreset: !!sceneOptions.rememberCustomPreset,
                savecustom: false,
                parameters: {
                  name: preset?.name || '',
                  preservation_notes: preset?.preservation_notes || {},
                  prompt_description: preset?.prompt_description || preset?.promptDescription || ''
                },
                custom_name: sceneOptions.rememberCustomPreset ? (sceneOptions.customPresetName || '') : ''
              });
            } else {
              // For ALL non-VEO3 scenes, always send transition with animation_desc (even if empty)
              // Build preservation_notes from animation_desc
              const notes = {
                camera_specifications: animationDescData.camera_specifications || '',
                subject_description: animationDescData.subject_description || '',
                action_specification: animationDescData.action_specification || '',
                scene_description: animationDescData.scene_description || '',
                lighting: animationDescData.lighting || '',
                style_mood: animationDescData.style_mood || '',
                geometric_preservation: animationDescData.geometric_preservation || '',
                transition_type: animationDescData.transition_type || '',
                content_modification: animationDescData.content_modification || ''
              };

              // Build prompt_description by concatenating all non-empty preservation_notes values
              // Format: camera_specifications, subject_description, action_specification, scene_description, lighting, style_mood, geometric_preservation, transition_type, content_modification
              const promptParts = [];
              if (notes.camera_specifications && notes.camera_specifications.trim()) {
                promptParts.push(notes.camera_specifications.trim());
              }
              if (notes.subject_description && notes.subject_description.trim()) {
                promptParts.push(notes.subject_description.trim());
              }
              if (notes.action_specification && notes.action_specification.trim()) {
                promptParts.push(notes.action_specification.trim());
              }
              if (notes.scene_description && notes.scene_description.trim()) {
                promptParts.push(notes.scene_description.trim());
              }
              if (notes.lighting && notes.lighting.trim()) {
                promptParts.push(notes.lighting.trim());
              }
              if (notes.style_mood && notes.style_mood.trim()) {
                promptParts.push(notes.style_mood.trim());
              }
              if (notes.geometric_preservation && notes.geometric_preservation.trim()) {
                promptParts.push(notes.geometric_preservation.trim());
              }
              if (notes.transition_type && notes.transition_type.trim()) {
                promptParts.push(notes.transition_type.trim());
              }
              if (notes.content_modification && notes.content_modification.trim()) {
                promptParts.push(notes.content_modification.trim());
              }

              // Join with ". " (period and space) as shown in the example
              const promptDescription = promptParts.join('. ').trim();

              // savecustom is true if "Save this preset" checkbox is selected
              const savecustom = !!sceneOptions.rememberCustomPreset;
              const customName = savecustom ? (sceneOptions.customPresetName || '') : '';

              // Always push transition for all non-VEO3 scenes, using animation_desc as preservation_notes
              // is_preset is always true for all non-VEO3 scenes
              transitions.push({
                is_preset: true,
                parameters: {
                  name: '',
                  preservation_notes: notes,
                  prompt_description: promptDescription
                },
                userQuery: '',
                savecustom: savecustom,
                custom_name: customName
              });
            }
          }

          scenePayload.voiceover = voiceover;
          scenePayload.voiceoption = voiceOption;
          scenePayload.transitions = transitions;
        } else {
          // For VEO3, also send voiceover if voice URL is selected
          scenePayload.voiceover = voiceover;
          scenePayload.voiceoption = voiceOption;
        }

        return scenePayload;
      });

      const body = {
        session_id,
        user_id,
        aspect_ratio: aspectRatio,
        subtitles: subtitlesFlag,
        scenes: scenesPayload,
      };

      // Call generate-videos-queue API
      const apiUrl = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/generate-videos-queue';
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = responseText;
      }

      if (!response.ok) {
        console.error('❌ generate-videos-queue API failed:', response.status, responseData);
        throw new Error(`generate-videos-queue failed: ${response.status} ${JSON.stringify(responseData)}`);
      }

      // Extract job ID from response
      const jobId = responseData?.job_id || responseData?.jobId || responseData?.id || null;

      if (jobId) {
        return jobId;
      } else {
        console.warn('⚠️ No job ID in response:', responseData);
        return null;
      }
    } catch (error) {
      setVideoGenProgress((prev) => ({
        ...prev,
        visible: true,
        status: 'error',
        step: 'error',
        message: error?.message || 'Failed to queue video generation',
      }));
      throw error;
    }
  }, [rows, sceneAdvancedOptions, sessionAssets, subtitlesEnabled, getSessionAspectRatioRaw, transitionPresets]);

  const handleGenerateVideosClick = React.useCallback(async (e) => {
    // Prevent any default behavior and navigation
    if (e) {
      if (typeof e.preventDefault === 'function') {
        e.preventDefault();
      }
      if (typeof e.stopPropagation === 'function') {
        e.stopPropagation();
      }
      if (typeof e.stopImmediatePropagation === 'function') {
        e.stopImmediatePropagation();
      }
    }

    // Prevent any form submission or navigation
    if (e && e.target && e.target.form) {
      e.target.form.onsubmit = (formE) => {
        if (formE && typeof formE.preventDefault === 'function') {
          formE.preventDefault();
        }
        return false;
      };
    }

    if (isPreparingDownloads) {
      return false;
    }


    setIsPreparingDownloads(true);
    setVideoGenProgress({
      visible: true,
      percent: 20,
      status: 'saving',
      step: 'saving_images',
      jobId: null,
      message: ''
    });

    // Run everything in background - no alerts, no interruptions
    (async () => {
      try {
        // CLEANUP: Clear browser memory storage before starting to ensure fresh start
        // Verify and initialize storage ref
        if (!imageStorageRef.current) {
          console.warn('   ⚠️ Storage ref was null, initializing new Map...');
          imageStorageRef.current = new Map();
        }
        if (!(imageStorageRef.current instanceof Map)) {
          console.warn('   ⚠️ Storage ref was not a Map, re-initializing...');
          imageStorageRef.current = new Map();
        }

        const storageSizeBefore = imageStorageRef.current.size;
        const storageKeysBefore = storageSizeBefore > 0 ? Array.from(imageStorageRef.current.keys()) : [];

        // Clear all existing images from storage
        imageStorageRef.current.clear();

        const storageSizeAfter = imageStorageRef.current.size;

        // Verify storage is ready
        if (!imageStorageRef.current || !(imageStorageRef.current instanceof Map)) {
          console.error('   ❌ ERROR: Storage ref is invalid after cleanup!');
          imageStorageRef.current = new Map();
        }

        // Step 1: Save images to browser memory
        setVideoGenProgress((prev) => ({
          ...prev,
          visible: true,
          percent: 20,
          status: 'saving',
          step: 'saving_images',
          message: 'Saving images to memory...'
        }));

        let failedDownloads = 0;
        try {
          // Save frames without text baked in, but keep overlay images.
          failedDownloads = await mergeAndDownloadAllImages({ includeText: false, includeOverlays: true });

          if (failedDownloads > 0) {
            console.warn(`⚠️ ${failedDownloads} image(s) failed to save`);
            setError(`Some images could not be saved (${failedDownloads} failed).`);
          }
        } catch (step1Error) {
          console.error('❌ Step 1 failed with error:', step1Error);
          console.error('   Error message:', step1Error?.message);
          console.error('   Error stack:', step1Error?.stack);
          // Check if any images were saved despite the error
          const savedCount = imageStorageRef.current?.size || 0;
          if (savedCount === 0) {
            // No images saved, we should stop here
            setError('Failed to save images to memory: ' + (step1Error?.message || 'Unknown error'));
            setVideoGenProgress((prev) => ({
              ...prev,
              visible: true,
              status: 'error',
              step: 'error',
              message: 'Failed to save images: ' + (step1Error?.message || 'Unknown error')
            }));
            throw step1Error;
          }
          // Some images were saved, continue with what we have
        }

        // Wait a bit to ensure all saves are complete
        await new Promise(resolve => setTimeout(resolve, 500));

        // CRITICAL: Verify storage ref still exists and is valid
        if (!imageStorageRef.current) {
          console.error('❌ CRITICAL ERROR: imageStorageRef.current is null after Step 1!');
          imageStorageRef.current = new Map();
        }
        if (!(imageStorageRef.current instanceof Map)) {
          console.error('❌ CRITICAL ERROR: imageStorageRef.current is not a Map after Step 1!');
          imageStorageRef.current = new Map();
        }

        // Verify images were actually saved to storage
        const imagesInStorage = imageStorageRef.current.size;
        const storageKeys = Array.from(imageStorageRef.current.keys());

        if (imagesInStorage === 0) {
          console.error('\n❌ ========== CRITICAL ERROR ==========');
          console.error('   No images found in storage after Step 1!');
          console.error('   This means Step 1 did not save any images to browser memory.');
          console.error('\n   Possible reasons:');
          console.error('   1. html2canvas capture failed for all images');
          console.error('   2. Frame-based rendering failed for all images');
          console.error('   3. Raw image fallback failed for all images');
          console.error('   4. Blob conversion failed');
          console.error('   5. Storage save failed');
          console.error('\n   Please check the Step 1 console logs above to see:');
          console.error('   - How many images were processed');
          console.error('   - How many were successfully saved');
          console.error('   - Any errors during html2canvas capture');
          console.error('   - Any errors during blob conversion');
          console.error('   - Any errors during storage save');
          console.error('==========================================\n');

          setError('Failed to save images to memory. Please check console for details.');
          setVideoGenProgress((prev) => ({
            ...prev,
            visible: true,
            status: 'error',
            step: 'error',
            message: 'No images were saved. Please check console logs.'
          }));
          throw new Error('No images found in browser memory storage after Step 1. Check console for details.');
        }

        // Step 2: Call save-all-frames API (ALWAYS call this, even if Step 1 had errors)

        // Verify the function exists
        if (typeof callSaveAllFramesAPI !== 'function') {
          console.error('❌ callSaveAllFramesAPI is not a function!', typeof callSaveAllFramesAPI);
          throw new Error('callSaveAllFramesAPI function not available');
        }

        setVideoGenProgress((prev) => ({
          ...prev,
          visible: true,
          percent: 40,
          status: 'uploading',
          step: 'uploading_frames',
          message: 'Uploading frames to server...'
        }));

        try {
          const saveAllFramesResult = await callSaveAllFramesAPI();
          setVideoGenProgress((prev) => ({
            ...prev,
            visible: true,
            percent: 40,
            status: 'uploading',
            step: 'uploading_frames',
            message: 'Frames uploaded successfully'
          }));
        } catch (step2Error) {
          console.error('❌ Step 2 (save-all-frames) failed:', step2Error);
          setError('Failed to upload frames to server: ' + (step2Error?.message || 'Unknown error'));
          setVideoGenProgress((prev) => ({
            ...prev,
            visible: true,
            status: 'error',
            step: 'error',
            message: step2Error?.message || 'Failed to upload frames'
          }));
          // Don't continue to Step 3 if Step 2 failed
          throw step2Error;
        }

        // Step 3: Call generate-videos-queue API
        setVideoGenProgress((prev) => ({
          ...prev,
          visible: true,
          percent: 60,
          status: 'queueing',
          step: 'queueing',
          message: 'Queueing video generation...'
        }));

        try {
          const jobId = await callVideosRegenerateAPI();

          if (jobId) {
            setVideoGenProgress((prev) => ({
              ...prev,
              visible: true,
              percent: 100,
              status: 'queued',
              step: 'queued',
              jobId: jobId,
              message: `Video generation queued (Job ID: ${jobId})`
            }));

            // Start video redirect flow with job ID
            startVideoRedirectFlow(jobId);
          } else {
            console.warn('⚠️ Job queued but no job ID returned');
            setVideoGenProgress((prev) => ({
              ...prev,
              visible: true,
              percent: 60,
              status: 'queued',
              step: 'queued',
              message: 'Job queued but no job ID returned'
            }));
          }
        } catch (step3Error) {
          console.error('❌ Step 3 (generate-videos-queue) failed:', step3Error);
          setError('Failed to queue video generation: ' + (step3Error?.message || 'Unknown error'));
          setVideoGenProgress((prev) => ({
            ...prev,
            visible: true,
            status: 'error',
            step: 'error',
            message: step3Error?.message || 'Failed to queue video generation'
          }));
          throw step3Error;
        }

      } catch (e) {
        setError(e?.message || 'Failed to save images');
        setVideoGenProgress((prev) => ({
          ...prev,
          visible: true,
          percent: prev.percent || 0,
          status: 'error',
          step: 'error',
          message: e?.message || 'Failed to save images'
        }));
        // No alert - just set error state
      } finally {
        // Reset progress after a short delay
        setTimeout(() => {
          setVideoGenProgress({
            visible: false,
            percent: 0,
            status: '',
            step: '',
            jobId: null,
            message: ''
          });
        }, 1000);
        setIsPreparingDownloads(false);
      }
    })();

    // Prevent any navigation or reload
    return false;
  }, [isPreparingDownloads, mergeAndDownloadAllImages, callSaveAllFramesAPI, callVideosRegenerateAPI, startVideoRedirectFlow]);

  // Track natural dimensions of loaded images to align overlays more precisely
  const handleNaturalSize = React.useCallback((url, imgEl) => {
    if (!url || !imgEl) return;
    setImageNaturalDims((prev) => {
      if (prev[url]) return prev;
      const w = imgEl.naturalWidth || imgEl.width;
      const h = imgEl.naturalHeight || imgEl.height;
      if (!w || !h) return prev;
      return { ...prev, [url]: { width: w, height: h } };
    });
  }, []);

  // Convert bounding_box values to percentages for on-screen overlay rendering
  const computeBoxPercents = (bb = {}, dims = {}) => {
    const baseW = Number(dims?.width) || 1;
    const baseH = Number(dims?.height) || 1;
    const vals = [
      Math.abs(Number(bb.x) || 0),
      Math.abs(Number(bb.y) || 0),
      Math.abs(Number(bb.width) || 0),
      Math.abs(Number(bb.height) || 0)
    ];
    const maxVal = Math.max(...vals);
    const isNormalized = maxVal > 0 && maxVal <= 1.05;
    const toPctX = (v) => {
      const num = Number(v);
      if (!Number.isFinite(num)) return 0;
      return isNormalized ? num * 100 : (num / baseW) * 100;
    };
    const toPctY = (v) => {
      const num = Number(v);
      if (!Number.isFinite(num)) return 0;
      return isNormalized ? num * 100 : (num / baseH) * 100;
    };
    const leftPct = toPctX(bb.x);
    const topPct = toPctY(bb.y);
    const widthPct = Number.isFinite(bb.width) ? toPctX(bb.width) : null;
    const heightPct = Number.isFinite(bb.height) ? toPctY(bb.height) : null;
    return { leftPct, topPct, widthPct, heightPct, mode: isNormalized ? 'normalized' : 'absolute' };
  };

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-lg relative">
      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-spin {
          animation: spin 1.5s linear infinite;
        }
      `}</style>
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-[#000]">Storyboard</h3>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={async (e) => {
              if (e) {
                if (typeof e.preventDefault === 'function') e.preventDefault();
                if (typeof e.stopPropagation === 'function') e.stopPropagation();
                if (typeof e.stopImmediatePropagation === 'function') e.stopImmediatePropagation();
              }
              await handleGenerateVideosClick(e);
              return false;
            }}
            onMouseDown={(e) => {
              if (e && typeof e.preventDefault === 'function') {
                e.preventDefault();
              }
            }}
            disabled={isPreparingDownloads || videoGenProgress.visible}
            className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {getVideoProgressLabel()}
          </button>
          {hasVideos && (
            <button
              onClick={() => { if (typeof onGoToVideos === 'function') onGoToVideos(); }}
              className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800"
            >
              Go to Videos
            </button>
          )}
          {onClose && (<button onClick={onClose} className="px-3 py-1.5 rounded-lg border text-sm">Back to Chat</button>)}
        </div>
      </div>

      {videoGenProgress.visible && (
        <Loader
          fullScreen
          zIndex="z-40"
          overlayBg="bg-white/90 backdrop-blur-sm"
          title={
            videoGenProgress.step === 'saving_images' ? 'Saving images to workspace' :
              videoGenProgress.step === 'uploading_frames' ? 'Uploading frames' :
                videoGenProgress.step === 'queueing' ? 'Submitting video job' :
                  videoGenProgress.step === 'queued' ? 'Waiting for job to start' :
                    videoGenProgress.step === 'regenerating_videos' ? 'Generating videos' :
                      videoGenProgress.step === 'completed' ? 'Finalizing' :
                        'Processing'
          }
          description={videoGenProgress.message || 'This may take a moment. Please keep this tab open.'}
          progress={videoGenProgress.percent > 0 ? videoGenProgress.percent : null}
        />
      )}

      {showVideoRedirectPopup && (
        <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-black/40">
          <div className="bg-white shadow-2xl rounded-2xl px-6 py-8 max-w-md w-full text-center">
            <h4 className="text-lg font-semibold text-[#13008B]">Video generation started</h4>
            <p className="text-sm text-gray-600 mt-2">
              Redirecting to Video List in {Math.max(0, videoRedirectCountdown)}s…
            </p>
            {pendingVideoJobId && (
              <p className="text-xs text-gray-500 mt-3">Job ID: {pendingVideoJobId}</p>
            )}
          </div>
        </div>
      )}

      {isLoading && isPolling && (
        <>
          <div className="absolute inset-0 z-30 bg-white" />
          <Loader
            fullScreen
            zIndex="z-40"
            overlayBg="bg-black/40 backdrop-blur-sm"
            title="Generating Storyboard"
            description="This may take a few moments. Please keep this tab open while we finish."
            progress={generatingStoryboardProgress > 0 ? generatingStoryboardProgress : null}
          />
        </>
      )}

      <div className="p-4 space-y-4 overflow-y-auto overflow-x-hidden">

        {/* {error && (<div className="text-sm text-red-600 mb-2">{error}</div>)} */}

        {/* Only show selected image details when not polling */}
        {selected?.imageUrl && (!isPolling || rows.length > 0) && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 h-[520px] overflow-y-auto scrollbar-hide">


            <div className="flex items-center justify-between mb-2">
              <div>
                {selectedModel === 'PLOTLY' && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleEditChartsClick();
                    }}
                    disabled={chartEditorLoading}
                    className={`px-3 py-1.5 rounded-lg border border-[#13008B] text-[#13008B] bg-white hover:bg-blue-50 transition-colors flex items-center gap-2 ${chartEditorLoading ? 'opacity-60 cursor-not-allowed' : ''
                      }`}
                    title="Edit Charts"
                  >
                    <Pencil className="w-4 h-4" />
                    <span className="text-sm font-medium">
                      {chartEditorLoading ? 'Loading…' : 'Edit Charts'}
                    </span>
                  </button>
                )}
              </div>
              <div className="flex gap-2">
                {selected?.isEditable && (
                  <>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const sceneNum = selected?.sceneNumber || selected?.scene_number || 1;
                        handleRegenerateClick(sceneNum);
                      }}
                      className="bg-[#13008B] hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                      title="Regenerate Image"
                    >
                      <RefreshCw className="w-4 h-4" />
                      <span className="text-sm font-medium">Regenerate</span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        const sceneNum = selected?.sceneNumber || selected?.scene_number || 1;
                        // Get the model for this scene to set default frames
                        const model = getSceneModel(sceneNum);
                        const modelUpper = String(model || '').toUpperCase();
                        if (isVEO3Model(model)) {
                          setUploadFrames(['background']); // VEO3 default to background (no options shown)
                        } else if (isANCHORModel(model)) {
                          setUploadFrames(['opening', 'closing']); // ANCHOR default to opening and closing
                        } else {
                          // SORA, PLOTLY, and others default to opening and closing
                          setUploadFrames(['opening', 'closing']);
                        }
                        setUploadingBackgroundSceneNumber(sceneNum);
                        setUploadedBackgroundFile(null);
                        setUploadedBackgroundPreview(null);
                        setError('');
                        setShowUploadBackgroundPopup(true);
                      }}
                      className="bg-[#13008B] hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                      title="Upload Background"
                    >
                      <Upload className="w-4 h-4" />
                      <span className="text-sm font-medium">Upload Background</span>
                    </button>

                    {isVEO3Model(selectedModel) && (
                      <>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const sceneNum = selected?.sceneNumber || selected?.scene_number || 1;
                            setAvatarUrls(['', '']);
                            setManagingAvatarSceneNumber(sceneNum);
                            setError('');
                            setShowAvatarManager(true);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                          title="Manage Avatars"
                        >
                          <Pencil className="w-4 h-4" />
                          <span className="text-sm font-medium">Manage Avatars</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            const sceneNum = selected?.sceneNumber || selected?.scene_number || 1;
                            setRegeneratingAvatarSceneNumber(sceneNum);
                            setRegenerateAvatarUserQuery('');
                            setRegenerateAvatarSaveAsNew(false);
                            setRegenerateAvatarName('');
                            setError('');
                            setShowRegenerateAvatarPopup(true);
                          }}
                          className="bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2"
                          title="Regenerate Avatar"
                        >
                          <RefreshCw className="w-4 h-4" />
                          <span className="text-sm font-medium">Regenerate Avatar</span>
                        </button>
                      </>
                    )}
                  </>
                )}
              </div>
            </div>
            {chartEditorError && selectedModel === 'PLOTLY' && (
              <p className="text-xs text-red-600 mb-2">{chartEditorError}</p>
            )}

            {/* Title - below Edit Charts/Regenerate buttons */}
            <h2 className="text-xl font-semibold text-gray-900 mb-4">
              {selected?.title || selected?.scene_title || 'Untitled Scene'}
            </h2>

            {/* Top Section: Images - Show only avatar if second image is missing */}
            {(() => {
              // Helper function to validate URL
              const isValidImageUrl = (url) => {
                if (!url || typeof url !== 'string') return false;
                const trimmed = url.trim();
                if (!trimmed) return false;
                // Check if it's a valid URL format (http/https/data/blob)
                try {
                  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return true;
                  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                    new URL(trimmed); // Will throw if invalid
                    return true;
                  }
                  // Relative URLs are also valid
                  if (trimmed.startsWith('/') || trimmed.startsWith('./')) return true;
                  return false;
                } catch {
                  return false;
                }
              };

              // Get images from selected.images array, fallback to imageUrl, then to refs if available
              const getImg1 = () => {
                const firstSelectedUrl = getSelectedImageUrl(selected.images, 0);
                const currentRow = rows.find(r =>
                  (r?.scene_number || r?.sceneNumber) === (selected?.sceneNumber || selected?.scene_number)
                ) || rows[selected.index];
                const isAvatarModel = selectedModel === 'VEO3';

                if (selectedModel === 'ANCHOR') {
                  // For ANCHOR, getImg1 should return the background image (NOT the avatar)
                  // The background comes from image_url in the image section, avatar comes from avatar_urls or overlay_elements

                  if (currentRow) {
                    const avatarSet = getAvatarUrlSet(currentRow);

                    // Also build a set of overlay URLs to exclude (avatars are often in overlay_elements)
                    const overlayUrlSet = new Set();
                    const frames = Array.isArray(currentRow?.imageFrames) ? currentRow.imageFrames : [];
                    const selectedFrames = Array.isArray(selected?.imageFrames) ? selected.imageFrames : [];
                    const allFrames = [...frames, ...selectedFrames];

                    allFrames.forEach((frame) => {
                      const overlayEls = Array.isArray(frame?.overlay_elements) ? frame.overlay_elements :
                        Array.isArray(frame?.overlayElements) ? frame.overlayElements : [];
                      overlayEls.forEach((overlay) => {
                        const overlayUrl = overlay?.image_url || overlay?.imageUrl || overlay?.url ||
                          overlay?.file_url || overlay?.fileUrl || overlay?.src || '';
                        if (overlayUrl && typeof overlayUrl === 'string') {
                          const normalized = normalizeSimpleUrl(overlayUrl.trim());
                          if (normalized) {
                            overlayUrlSet.add(normalized);
                          }
                        }
                      });
                    });

                    // Combined exclusion set (avatars + overlays)
                    const exclusionSet = new Set([...avatarSet, ...overlayUrlSet]);

                    // Priority 1: Check selected.images array and filter out avatars/overlays
                    if (Array.isArray(selected?.images) && selected.images.length > 0) {
                      for (const img of selected.images) {
                        const imgUrl = typeof img === 'string'
                          ? img.trim()
                          : (img?.image_url || img?.imageUrl || img?.url || '').trim();

                        if (imgUrl && isValidImageUrl(imgUrl)) {
                          const normalized = normalizeSimpleUrl(imgUrl);
                          // Only return if it's NOT an avatar or overlay
                          if (normalized && !exclusionSet.has(normalized)) {
                            return imgUrl;
                          }
                        }
                      }
                    }

                    // Priority 2: Check selected.imageUrl (if not an avatar/overlay)
                    if (selected?.imageUrl && typeof selected.imageUrl === 'string') {
                      const imgUrl = selected.imageUrl.trim();
                      if (isValidImageUrl(imgUrl)) {
                        const normalized = normalizeSimpleUrl(imgUrl);
                        if (normalized && !exclusionSet.has(normalized)) {
                          return imgUrl;
                        }
                      }
                    }

                    // Priority 3: Get background from frames' base_image (exclude avatars and overlays)
                    if (frames.length > 0) {
                      // Check all frames to find a non-avatar, non-overlay background
                      for (const frame of frames) {
                        const baseImage = frame?.base_image || frame?.baseImage || {};
                        const backgroundUrl = baseImage?.image_url || baseImage?.imageUrl || baseImage?.imageurl || baseImage?.url || baseImage?.src || '';

                        if (backgroundUrl && typeof backgroundUrl === 'string' && backgroundUrl.trim() && isValidImageUrl(backgroundUrl.trim())) {
                          const normalized = normalizeSimpleUrl(backgroundUrl.trim());
                          // Only return if it's NOT an avatar or overlay
                          if (normalized && !exclusionSet.has(normalized)) {
                            return backgroundUrl.trim();
                          }
                        }
                      }
                    }

                    // Priority 4: Get from selected.imageFrames
                    if (selectedFrames.length > 0) {
                      for (const frame of selectedFrames) {
                        const baseImage = frame?.base_image || frame?.baseImage || {};
                        const backgroundUrl = baseImage?.image_url || baseImage?.imageUrl || baseImage?.imageurl || baseImage?.url || baseImage?.src || '';

                        if (backgroundUrl && typeof backgroundUrl === 'string' && backgroundUrl.trim() && isValidImageUrl(backgroundUrl.trim())) {
                          const normalized = normalizeSimpleUrl(backgroundUrl.trim());
                          if (normalized && !exclusionSet.has(normalized)) {
                            return backgroundUrl.trim();
                          }
                        }
                      }
                    }

                    // Priority 5: Get ordered refs and filter out avatars/overlays
                    const orderedRefs = getOrderedRefs(currentRow);
                    if (orderedRefs.length > 0) {
                      const nonAvatar = orderedRefs.filter((url) => {
                        const normalized = normalizeSimpleUrl(url);
                        return normalized && !exclusionSet.has(normalized) && isValidImageUrl(normalized);
                      });

                      if (nonAvatar.length > 0) {
                        return nonAvatar[0];
                      }
                    }

                    // Priority 6: Check currentRow.refs and filter out avatars/overlays
                    if (Array.isArray(currentRow?.refs) && currentRow.refs.length > 0) {
                      for (const ref of currentRow.refs) {
                        const refUrl = typeof ref === 'string' ? ref.trim() : (ref?.image_url || ref?.url || '').trim();
                        if (refUrl && isValidImageUrl(refUrl)) {
                          const normalized = normalizeSimpleUrl(refUrl);
                          if (normalized && !exclusionSet.has(normalized)) {
                            return refUrl;
                          }
                        }
                      }
                    }
                  }

                  // Fallback: try firstSelectedUrl if it's not an avatar/overlay
                  if (firstSelectedUrl && isValidImageUrl(firstSelectedUrl)) {
                    const avatarSet = currentRow ? getAvatarUrlSet(currentRow) : new Set();
                    const normalized = normalizeSimpleUrl(firstSelectedUrl);
                    if (normalized && !avatarSet.has(normalized)) {
                      return firstSelectedUrl;
                    }
                  }

                  // Return empty if no background image found
                  return '';
                } else if (isAvatarModel) {
                  // For VEO3 Avatar tab, extract avatar URL from version object in session data images
                  // EXACT same extraction as list area (lines 2101-2112):
                  // it.images -> imagesContainer -> imagesContainer[current_version] -> verObj -> verObj.avatar_urls

                  // Priority 1: Extract directly from version object avatar_urls (EXACT same as list area)
                  // imageVersionData = it?.images || it (line 2340)
                  let imagesContainer = null;

                  if (selected?.imageVersionData && typeof selected.imageVersionData === 'object') {
                    // Check if imageVersionData is it.images (images container) or it (scene object)
                    if (selected.imageVersionData.images && typeof selected.imageVersionData.images === 'object' && !Array.isArray(selected.imageVersionData.images)) {
                      // imageVersionData is it (scene object), extract it.images
                      imagesContainer = selected.imageVersionData.images;
                    } else if (selected.imageVersionData.current_version || selected.imageVersionData.v1 || selected.imageVersionData.v2) {
                      // imageVersionData is already it.images (images container)
                      imagesContainer = selected.imageVersionData;
                    }

                    if (imagesContainer) {
                      // Get latest version key (always use latest version)
                      const versionKey = getLatestVersionKey(imagesContainer);

                      // Get version object (same as list area line 2105: imagesContainer[versionKey])
                      const verObj = imagesContainer[versionKey] || {};

                      // Extract avatar_urls from version object (EXACT same as list area line 2112: verObj?.avatar_urls)
                      const versionAvatars = verObj?.avatar_urls;

                      if (Array.isArray(versionAvatars) && versionAvatars.length > 0) {
                        // Map avatar URLs (EXACT same as list area lines 2123-2135)
                        const avatarUrls = versionAvatars.map((av) => {
                          if (typeof av === 'string') return av.trim();
                          return (
                            av?.imageurl ||
                            av?.imageUrl ||
                            av?.image_url ||
                            av?.url ||
                            av?.src ||
                            av?.link ||
                            av?.avatar_url ||
                            ''
                          );
                        }).filter(url => url && typeof url === 'string' && url.trim());

                        if (avatarUrls.length > 0) {
                          const url = avatarUrls[0];
                          // Double-check: ensure this URL is actually an avatar (not a regular image)
                          const avatarSet = currentRow ? getAvatarUrlSet(currentRow) : new Set();
                          const normalized = normalizeSimpleUrl(url);
                          if (normalized && avatarSet.has(normalized) && isValidImageUrl(url)) {
                            return url;
                          }
                        }
                      }
                    }
                  }

                  // Priority 2: Try to get from currentRow's imageVersionData (same structure as list area uses)
                  // This is the EXACT same extraction: it.images[current_version].avatar_urls
                  if (currentRow && currentRow.imageVersionData && typeof currentRow.imageVersionData === 'object') {
                    let imagesContainer = currentRow.imageVersionData;

                    // Check if imageVersionData has the images container structure (it.images)
                    if (currentRow.imageVersionData.images && typeof currentRow.imageVersionData.images === 'object' && !Array.isArray(currentRow.imageVersionData.images)) {
                      imagesContainer = currentRow.imageVersionData.images;
                    }

                    // Get latest version key (always use latest version)
                    const versionKey = getLatestVersionKey(imagesContainer);

                    // Get version object (same as: imagesContainer[versionKey] in list area)
                    const verObj = imagesContainer[versionKey] || {};

                    // Extract avatar_urls from version object (EXACT same as list area line 2112)
                    const versionAvatars = verObj?.avatar_urls;

                    if (Array.isArray(versionAvatars) && versionAvatars.length > 0) {
                      // Map avatar URLs (EXACT same as list area lines 2123-2135)
                      const avatarUrls = versionAvatars.map((av) => {
                        if (typeof av === 'string') return av.trim();
                        return (
                          av?.imageurl ||
                          av?.imageUrl ||
                          av?.image_url ||
                          av?.url ||
                          av?.src ||
                          av?.link ||
                          av?.avatar_url ||
                          ''
                        );
                      }).filter(url => url && typeof url === 'string' && url.trim());

                      if (avatarUrls.length > 0) {
                        const url = avatarUrls[0];
                        // Double-check: ensure this URL is actually an avatar (not a regular image)
                        const avatarSet = getAvatarUrlSet(currentRow);
                        const normalized = normalizeSimpleUrl(url);
                        if (normalized && avatarSet.has(normalized) && isValidImageUrl(url)) {
                          return url;
                        }
                      }
                    }
                  }

                  // Priority 3: Use helper function as fallback
                  const latestVersionForSelected = selected?.imageVersionData ? getLatestVersionKey(selected.imageVersionData) : 'v1';
                  const avatarUrlsFromSelected = getAvatarUrlsFromImageVersion(
                    selected?.imageVersionData || null,
                    latestVersionForSelected,
                    selectedModel
                  );
                  if (avatarUrlsFromSelected.length > 0) {
                    const url = avatarUrlsFromSelected[0];
                    // Double-check: ensure this URL is actually an avatar (not a regular image)
                    const avatarSet = currentRow ? getAvatarUrlSet(currentRow) : new Set();
                    const normalized = normalizeSimpleUrl(url);
                    if (normalized && avatarSet.has(normalized) && isValidImageUrl(url)) {
                      return url;
                    }
                  }

                  // Priority 4: Use selected.avatar_urls (should already be from latest version)
                  if (selected && Array.isArray(selected.avatar_urls) && selected.avatar_urls.length > 0) {
                    const avatarUrl = selected.avatar_urls[0];
                    const url =
                      typeof avatarUrl === 'string'
                        ? avatarUrl.trim()
                        : (
                          avatarUrl?.imageurl ||
                          avatarUrl?.imageUrl ||
                          avatarUrl?.image_url ||
                          avatarUrl?.url ||
                          avatarUrl?.src ||
                          avatarUrl?.link ||
                          ''
                        ).trim();
                    // Double-check: ensure this URL is actually an avatar (not a regular image)
                    const avatarSet = currentRow ? getAvatarUrlSet(currentRow) : new Set();
                    const normalized = normalizeSimpleUrl(url);
                    if (normalized && avatarSet.has(normalized) && isValidImageUrl(url)) {
                      return url;
                    }
                  }

                  // For VEO3 Avatar tab, don't fall through to other image sources - return empty if no avatar found
                  return '';
                }

                // Priority 1: selected.images array
                if (firstSelectedUrl && isValidImageUrl(firstSelectedUrl)) return firstSelectedUrl;

                // Priority 2: selected.imageUrl
                if (selected.imageUrl && typeof selected.imageUrl === 'string') {
                  const url = selected.imageUrl.trim();
                  if (isValidImageUrl(url)) return url;
                }

                // Priority 3: Get from rows data (where avatar_urls are stored)
                if (currentRow && Array.isArray(currentRow.refs) && currentRow.refs[0]) {
                  const url = typeof currentRow.refs[0] === 'string' ? currentRow.refs[0].trim() : '';
                  if (isValidImageUrl(url)) return url;
                }

                // Priority 4: Try to get from any row if index doesn't match
                if (rows.length > 0) {
                  const firstRow = rows[0];
                  if (firstRow && Array.isArray(firstRow.refs) && firstRow.refs[0]) {
                    const url = typeof firstRow.refs[0] === 'string' ? firstRow.refs[0].trim() : '';
                    if (isValidImageUrl(url)) return url;
                  }
                }

                return '';
              };
              const getImg2 = () => {
                const secondSelectedUrl = getSelectedImageUrl(selected.images, 1);
                const currentRow = rows.find(r =>
                  (r?.scene_number || r?.sceneNumber) === (selected?.sceneNumber || selected?.scene_number)
                ) || rows[selected.index];
                const isVeo3Model = selectedModel === 'VEO3';
                const isAnchorModel = selectedModel === 'ANCHOR';

                // For ANCHOR, getImg2 should return the avatar image
                if (isAnchorModel) {
                  // Priority 1: Get avatar from selected.images (they are objects with image_url property)
                  if (selected?.imageVersionData && typeof selected.imageVersionData === 'object') {
                    let imagesContainer = null;

                    if (selected.imageVersionData.images && typeof selected.imageVersionData.images === 'object' && !Array.isArray(selected.imageVersionData.images)) {
                      imagesContainer = selected.imageVersionData.images;
                    } else if (selected.imageVersionData.current_version || selected.imageVersionData.v1 || selected.imageVersionData.v2) {
                      imagesContainer = selected.imageVersionData;
                    }

                    if (imagesContainer) {
                      const versionKey = getLatestVersionKey(imagesContainer);
                      const verObj = imagesContainer[versionKey] || {};
                      const versionAvatars = verObj?.avatar_urls;

                      if (Array.isArray(versionAvatars) && versionAvatars.length > 0) {
                        const avatarUrls = versionAvatars.map((av) => {
                          if (typeof av === 'string') return av.trim();
                          return (
                            av?.imageurl ||
                            av?.imageUrl ||
                            av?.image_url ||
                            av?.url ||
                            av?.src ||
                            av?.link ||
                            av?.avatar_url ||
                            ''
                          );
                        }).filter(url => url && typeof url === 'string' && url.trim());

                        if (avatarUrls.length > 0) {
                          const url = avatarUrls[0];
                          const avatarSet = currentRow ? getAvatarUrlSet(currentRow) : new Set();
                          const normalized = normalizeSimpleUrl(url);
                          if (normalized && avatarSet.has(normalized) && isValidImageUrl(url)) {
                            return url;
                          }
                        }
                      }
                    }
                  }

                  // Priority 2: Try to get from currentRow's imageVersionData
                  if (currentRow && currentRow.imageVersionData && typeof currentRow.imageVersionData === 'object') {
                    let imagesContainer = currentRow.imageVersionData;

                    if (currentRow.imageVersionData.images && typeof currentRow.imageVersionData.images === 'object' && !Array.isArray(currentRow.imageVersionData.images)) {
                      imagesContainer = currentRow.imageVersionData.images;
                    }

                    const versionKey = getLatestVersionKey(imagesContainer);
                    const verObj = imagesContainer[versionKey] || {};
                    const versionAvatars = verObj?.avatar_urls;

                    if (Array.isArray(versionAvatars) && versionAvatars.length > 0) {
                      const avatarUrls = versionAvatars.map((av) => {
                        if (typeof av === 'string') return av.trim();
                        return (
                          av?.imageurl ||
                          av?.imageUrl ||
                          av?.image_url ||
                          av?.url ||
                          av?.src ||
                          av?.link ||
                          av?.avatar_url ||
                          ''
                        );
                      }).filter(url => url && typeof url === 'string' && url.trim());

                      if (avatarUrls.length > 0) {
                        const url = avatarUrls[0];
                        const avatarSet = getAvatarUrlSet(currentRow);
                        const normalized = normalizeSimpleUrl(url);
                        if (normalized && avatarSet.has(normalized) && isValidImageUrl(url)) {
                          return url;
                        }
                      }
                    }
                  }

                  // Priority 3: Use helper function as fallback
                  const latestVersionForSelected = selected?.imageVersionData ? getLatestVersionKey(selected.imageVersionData) : 'v1';
                  const avatarUrlsFromSelected = getAvatarUrlsFromImageVersion(
                    selected?.imageVersionData || null,
                    latestVersionForSelected,
                    selectedModel
                  );
                  if (avatarUrlsFromSelected.length > 0) {
                    const url = avatarUrlsFromSelected[0];
                    const avatarSet = currentRow ? getAvatarUrlSet(currentRow) : new Set();
                    const normalized = normalizeSimpleUrl(url);
                    if (normalized && avatarSet.has(normalized) && isValidImageUrl(url)) {
                      return url;
                    }
                  }

                  // Priority 4: Use selected.avatar_urls
                  if (selected && Array.isArray(selected.avatar_urls) && selected.avatar_urls.length > 0) {
                    const avatarUrl = selected.avatar_urls[0];
                    const url =
                      typeof avatarUrl === 'string'
                        ? avatarUrl.trim()
                        : (
                          avatarUrl?.imageurl ||
                          avatarUrl?.imageUrl ||
                          avatarUrl?.image_url ||
                          avatarUrl?.url ||
                          avatarUrl?.src ||
                          avatarUrl?.link ||
                          ''
                        ).trim();
                    const avatarSet = currentRow ? getAvatarUrlSet(currentRow) : new Set();
                    const normalized = normalizeSimpleUrl(url);
                    if (normalized && avatarSet.has(normalized) && isValidImageUrl(url)) {
                      return url;
                    }
                  }

                  // Fallback: return secondSelectedUrl if it's an avatar
                  if (secondSelectedUrl && isValidImageUrl(secondSelectedUrl)) {
                    const avatarSet = currentRow ? getAvatarUrlSet(currentRow) : new Set();
                    const normalized = normalizeSimpleUrl(secondSelectedUrl);
                    if (normalized && avatarSet.has(normalized)) {
                      return secondSelectedUrl;
                    }
                  }

                  return '';
                }

                if (isVeo3Model) {
                  // For VEO3 Image tab, get the actual image (non-avatar)
                  // Use similar logic to getVeo3ImageTabImages: get ordered refs, filter out avatars
                  if (currentRow) {
                    // Get ordered refs from current version
                    const orderedRefs = getOrderedRefs(currentRow);

                    // Extract URLs from selected.images (they are objects with image_url property)
                    const selectedImageUrls = Array.isArray(selected?.images)
                      ? selected.images.map(img => {
                        if (typeof img === 'string') return img.trim();
                        return (img?.image_url || img?.imageUrl || img?.url || '').trim();
                      }).filter(Boolean)
                      : [];

                    // Combine with row.refs and orderedRefs (all should be URLs)
                    const candidateSources = [
                      ...(Array.isArray(currentRow?.refs) ? currentRow.refs.map(r => typeof r === 'string' ? r : (r?.image_url || r?.url || '')).filter(Boolean) : []),
                      ...orderedRefs,
                      ...selectedImageUrls
                    ];

                    // Remove duplicates using normalizeSimpleUrl for consistency
                    const uniqueCandidates = [];
                    const seen = new Set();
                    candidateSources.forEach((candidate) => {
                      const normalized = normalizeSimpleUrl(candidate);
                      if (normalized && !seen.has(normalized)) {
                        uniqueCandidates.push(normalized);
                        seen.add(normalized);
                      }
                    });

                    // Get avatar URL set to filter them out (uses normalizeSimpleUrl internally)
                    const avatarSet = getAvatarUrlSet(currentRow);

                    // Filter out avatars - get only non-avatar images
                    const nonAvatar = uniqueCandidates.filter((url) => {
                      const normalized = normalizeSimpleUrl(url);
                      return normalized && !avatarSet.has(normalized) && isValidImageUrl(normalized);
                    });

                    if (nonAvatar.length > 0) {
                      return nonAvatar[0];
                    }
                  }

                  // Fallback: try secondSelectedUrl if it's not an avatar
                  if (secondSelectedUrl && isValidImageUrl(secondSelectedUrl)) {
                    const avatarSet = currentRow ? getAvatarUrlSet(currentRow) : new Set();
                    const normalized = normalizeSimpleUrl(secondSelectedUrl);
                    if (normalized && !avatarSet.has(normalized)) {
                      return secondSelectedUrl;
                    }
                  }

                  // Return empty if no non-avatar image found
                  return '';
                }

                if (secondSelectedUrl && isValidImageUrl(secondSelectedUrl)) return secondSelectedUrl;

                if (currentRow && Array.isArray(currentRow.refs) && currentRow.refs[1]) {
                  const url = typeof currentRow.refs[1] === 'string' ? currentRow.refs[1].trim() : '';
                  if (isValidImageUrl(url)) return url;
                }
                return '';
              };
              const img1 = getImg1();
              const img2 = getImg2();
              const isDualImageModel = selectedModel === 'VEO3' || selectedModel === 'ANCHOR';
              const isVeoScene = selectedModel === 'VEO3';
              const primaryImg = isVeoScene ? img2 : img1;
              const secondaryImg = isVeoScene ? img1 : img2;
              const primaryLabel = isVeoScene ? 'Image' : 'Image 1';
              const secondaryLabel = isVeoScene ? 'Avatar' : 'Image 2';
              const primaryFrameIndex = isVeoScene ? 1 : 0;
              const secondaryFrameIndex = isVeoScene ? 0 : 1;

              // Get latest version for cache-busting avatar images
              const currentVersion = selected?.imageVersionData ? getLatestVersionKey(selected.imageVersionData) : (selected?.current_version || 'v1');
              const avatarCacheKey = isVeoScene && secondaryImg ? `${activeSceneNumber}_${currentVersion}_${secondaryImg}` : null;

              // For VEO3 with 9:16 aspect ratio: show only one tab (Avatar if available, else Image)
              const isVeo3Portrait = isVeoScene && isPortrait9x16;
              const hasAvatar = secondaryImg && secondaryImg.trim();
              const hasImage = primaryImg && primaryImg.trim();

              // For VEO3 + 9:16: determine which tab to show
              let showTabs = false;
              let showAvatarTab = false;
              let showImageTab = false;

              if (isVeo3Portrait) {
                // For 9:16 VEO3: show Avatar tab if avatar exists, else show Image tab
                if (hasAvatar) {
                  showTabs = true;
                  showAvatarTab = true;
                  showImageTab = false;
                } else if (hasImage) {
                  showTabs = true;
                  showAvatarTab = false;
                  showImageTab = true;
                } else {
                  showTabs = false;
                }
              } else {
                // For other cases: Dual-image models (VEO3/ANCHOR) show tabs only if both images are available
                // Other models just need a second image
                const hasSecondImage = isDualImageModel
                  ? (primaryImg && primaryImg.trim() && secondaryImg && secondaryImg.trim())
                  : (secondaryImg && secondaryImg.trim());
                showTabs = hasSecondImage;
                showAvatarTab = hasSecondImage;
                showImageTab = hasSecondImage;
              }


              return (
                <div className="mb-4">
                  {/* Tabs - show based on model and aspect ratio */}
                  {showTabs && (
                    <div className="flex gap-2 mb-4 border-b border-gray-200">
                      {showImageTab && (
                        <button
                          type="button"
                          onClick={() => setActiveImageTab(0)}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${activeImageTab === 0
                            ? 'text-[#13008B] border-b-2 border-[#13008B]'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                          {primaryLabel}
                        </button>
                      )}
                      {showAvatarTab && (
                        <button
                          type="button"
                          onClick={() => setActiveImageTab(1)}
                          className={`px-4 py-2 text-sm font-medium transition-colors ${activeImageTab === 1
                            ? 'text-[#13008B] border-b-2 border-[#13008B]'
                            : 'text-gray-600 hover:text-gray-900'
                            }`}
                        >
                          {secondaryLabel}
                        </button>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-4">
                    {/* Show Image 1 when: tab 0 is active OR no tabs are shown */}
                    {primaryImg && typeof primaryImg === 'string' && primaryImg.trim() && (activeImageTab === 0 || !showTabs) ? (
                      <div
                        key="image-1"
                        className="w-full bg-black rounded-lg overflow-hidden relative flex items-center justify-center group"
                        data-image-container
                        data-scene-number={activeSceneNumber}
                        data-image-index="0"
                        data-image-url={primaryImg}
                        style={{
                          aspectRatio: cssAspectRatio,
                          ...(isPortrait9x16
                            ? { width: '500px', maxWidth: '500px', height: '100%' }
                            : { width: 'min(100%, 860px)', maxWidth: '860px', height: '100%' })
                        }}
                      >
                        {(() => {
                          const frames = Array.isArray(selected.imageFrames) ? selected.imageFrames : [];
                          const frameForImg1 = findFrameForImage(frames, primaryImg, primaryFrameIndex);
                          const fallbackFrame1 = frameForImg1 || (frames.length > 0 ? frames[primaryFrameIndex] || frames[0] : null);

                          // For ANCHOR models, use the frame's base_image URL directly (not primaryImg which might be avatar)
                          let displayImgUrl = primaryImg;
                          if (selectedModel === 'ANCHOR' && fallbackFrame1) {
                            const baseImage = fallbackFrame1?.base_image || fallbackFrame1?.baseImage || {};
                            const frameBackgroundUrl = baseImage?.image_url || baseImage?.imageUrl || baseImage?.imageurl || baseImage?.url || baseImage?.src || '';
                            if (frameBackgroundUrl && typeof frameBackgroundUrl === 'string' && frameBackgroundUrl.trim()) {
                              // Verify it's not an avatar
                              const currentRow = rows.find(r =>
                                (r?.scene_number || r?.sceneNumber) === (selected?.sceneNumber || selected?.scene_number)
                              ) || rows[selected.index];
                              if (currentRow) {
                                const avatarSet = getAvatarUrlSet(currentRow);
                                const normalized = normalizeSimpleUrl(frameBackgroundUrl.trim());
                                if (normalized && !avatarSet.has(normalized)) {
                                  displayImgUrl = frameBackgroundUrl.trim();
                                }
                              } else {
                                displayImgUrl = frameBackgroundUrl.trim();
                              }
                            }
                          }
                          // Get text elements from the matched frame, fallback to selected.textElements
                          const textElsFromFrame1 = fallbackFrame1 ? (
                            Array.isArray(fallbackFrame1?.text_elements)
                              ? fallbackFrame1.text_elements
                              : Array.isArray(fallbackFrame1?.textElements)
                                ? fallbackFrame1.textElements
                                : []
                          ) : [];
                          // Fallback to selected level text elements
                          const fallbackText1 = Array.isArray(selected?.textElements)
                            ? selected.textElements
                            : Array.isArray(selected?.text_elements)
                              ? selected.text_elements
                              : [];
                          const effectiveTextEls1 = textElsFromFrame1.length > 0 ? textElsFromFrame1 : fallbackText1;
                          const overlayEls1 = fallbackFrame1 ? (
                            Array.isArray(fallbackFrame1?.overlay_elements)
                              ? fallbackFrame1.overlay_elements
                              : Array.isArray(fallbackFrame1?.overlayElements)
                                ? fallbackFrame1.overlayElements
                                : []
                          ) : [];
                          const frameDims1 =
                            fallbackFrame1?.base_image?.image_dimensions ||
                            fallbackFrame1?.base_image?.imageDimensions ||
                            imageNaturalDims[displayImgUrl] ||
                            imageNaturalDims[primaryImg] ||
                            selected?.imageDimensions ||
                            (frames[0]?.base_image?.image_dimensions || frames[0]?.base_image?.imageDimensions) ||
                            { width: 1280, height: 720 };
                          return (
                            <>
                              {/* Regenerate button - top right above image */}
                              {selected?.isEditable && (
                                <></>
                              )}
                              {displayImgUrl && typeof displayImgUrl === 'string' && displayImgUrl.trim() ? (
                                <img
                                  src={displayImgUrl}
                                  alt={`scene-${selected.sceneNumber}-primary`}
                                  className="w-full h-full object-contain"
                                  height={frameDims1?.height || undefined}
                                  crossOrigin={displayImgUrl.startsWith('http') && !displayImgUrl.includes(window.location.hostname) ? "anonymous" : undefined}
                                  onLoad={(e) => {
                                    handleNaturalSize(displayImgUrl, e.target);
                                  }}
                                  onError={(e) => {
                                    const errorImg = e.target;
                                    const failedUrl = errorImg.src;

                                    // Try multiple fallback strategies
                                    const currentRow = rows[selected.index];
                                    const fallbackUrls = [];

                                    // Strategy 1: Try other refs from current row
                                    if (currentRow && Array.isArray(currentRow.refs)) {
                                      currentRow.refs.forEach((ref, idx) => {
                                        if (ref && typeof ref === 'string' && ref.trim() && ref !== failedUrl) {
                                          fallbackUrls.push(ref.trim());
                                        }
                                      });
                                    }

                                    // Strategy 2: Try selected.images
                                    if (Array.isArray(selected.images)) {
                                      selected.images.forEach((img) => {
                                        const fallbackUrl = getImageUrlFromEntry(img);
                                        if (fallbackUrl && fallbackUrl !== failedUrl && !fallbackUrls.includes(fallbackUrl)) {
                                          fallbackUrls.push(fallbackUrl);
                                        }
                                      });
                                    }

                                    // Strategy 3: Try selected.imageUrl
                                    if (selected.imageUrl && typeof selected.imageUrl === 'string' && selected.imageUrl.trim() && selected.imageUrl !== failedUrl && !fallbackUrls.includes(selected.imageUrl.trim())) {
                                      fallbackUrls.push(selected.imageUrl.trim());
                                    }

                                    // Try the first available fallback
                                    if (fallbackUrls.length > 0) {
                                      const nextUrl = fallbackUrls[0];
                                      // Remove crossOrigin to avoid CORS issues on retry
                                      errorImg.crossOrigin = null;
                                      errorImg.src = nextUrl;
                                    } else {
                                      // Show error state
                                      errorImg.style.display = 'none';
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white text-sm">
                                  <div className="text-center">
                                    <p>No image available</p>
                                    <p className="text-xs mt-2 opacity-75">Scene {selected?.sceneNumber || selected?.scene_number || 1}</p>
                                  </div>
                                </div>
                              )}
                              {/* Edit button on hover - slides in from right (hidden for VEO3 with gen_image=false) */}
                              {(() => {
                                // If this scene is not editable (e.g., fallback background/avatar image only), hide edit/export
                                if (!selected?.isEditable) {
                                  return null;
                                }
                                // Check if this is VEO3 model with gen_image=false
                                const modelUpper = String(selected?.model || '').toUpperCase();
                                const isVEO3 = (modelUpper === 'VEO3' || modelUpper === 'ANCHOR');
                                const imageVersionData = selected?.imageVersionData || {};
                                const versionKey = getLatestVersionKey(imageVersionData);
                                const verObj = imageVersionData[versionKey] || {};
                                const genImage = verObj?.gen_image !== false; // Default to true if not specified

                                // Hide edit/export buttons for VEO3 with gen_image=false
                                if (isVEO3 && !genImage) {
                                  return null;
                                }

                                const sceneNo = selected?.sceneNumber || selected?.scene_number || 1;

                                return (
                                  <div className="absolute right-0 top-[50px] -translate-y-1/2 translate-x-full group-hover:translate-x-0 transition-transform duration-300 flex flex-col gap-1 z-10">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Get the frame data for this specific image (Image 1)
                                        const frame = frameForImg1 || fallbackFrame1;
                                        // Always set frameData, even if frame is null (for PLOTLY and other scenes)
                                        const frameData = {
                                          base_image: frame?.base_image || frame?.baseImage || {
                                            image_url: primaryImg || displayImgUrl || '',
                                            image_dimensions: selected?.imageDimensions || frameDims1 || {}
                                          },
                                          text_elements: frame ? (
                                            Array.isArray(frame?.text_elements) ? frame.text_elements :
                                              Array.isArray(frame?.textElements) ? frame.textElements : []
                                          ) : effectiveTextEls1 || [],
                                          overlay_elements: frame ? (
                                            Array.isArray(frame?.overlay_elements) ? frame.overlay_elements :
                                              Array.isArray(frame?.overlayElements) ? frame.overlayElements : []
                                          ) : overlayEls1 || [],
                                          model: selectedModel
                                        };
                                        setEditingImageFrame(frameData);
                                        setEditingSceneNumber(sceneNo);
                                        setEditingImageIndex(primaryFrameIndex); // Track actual image index
                                        setShowImageEdit(true);
                                      }}
                                      className="bg-[#13008B] text-white p-2 rounded-l-lg hover:bg-[#0f0068] flex items-center justify-center"
                                      title="Edit Image"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    {/* <button
                                      type="button"
                                      onClick={() => {
                                        if (!primaryImg) return;
                                        exportVisibleImageFromDom({
                                          sceneNumber: sceneNo,
                                          imageIndex: 0
                                        });
                                      }}
                                      className="bg-white text-[#13008B] p-2 rounded-l-lg border border-[#13008B] hover:bg-blue-50 flex items-center justify-center"
                                      title="Export Image"
                                    >
                                      ⬇
                                    </button> */}
                                  </div>
                                );
                              })()}
                              {/* Render all elements (text + overlays) in proper layer order */}
                              {(() => {
                                // Combine text and overlay elements with their layer information
                                const allElements = [];

                                // Add text elements with type and index for sorting
                                if (Array.isArray(effectiveTextEls1) && effectiveTextEls1.length > 0) {
                                  effectiveTextEls1.forEach((el, idx) => {
                                    if (el && typeof el === 'object') {
                                      // Prioritize layout.zIndex - use it if it exists (even if 0), otherwise fallback
                                      const zIndex = typeof el.layout?.zIndex === 'number'
                                        ? el.layout.zIndex
                                        : (typeof el.z_index === 'number' ? el.z_index : (typeof el.zIndex === 'number' ? el.zIndex : (idx + 1)));
                                      allElements.push({
                                        type: 'text',
                                        element: el,
                                        index: idx,
                                        zIndex: zIndex
                                      });
                                    }
                                  });
                                }

                                // Add overlay elements with type and index for sorting
                                if (Array.isArray(overlayEls1) && overlayEls1.length > 0) {
                                  overlayEls1.forEach((ov, idx) => {
                                    if (ov && typeof ov === 'object') {
                                      // Prioritize layout.zIndex - use it if it exists (even if 0), otherwise fallback
                                      const zIndex = typeof ov.layout?.zIndex === 'number'
                                        ? ov.layout.zIndex
                                        : (typeof ov.z_index === 'number' ? ov.z_index : (typeof ov.zIndex === 'number' ? ov.zIndex : (100 + idx + 1)));
                                      allElements.push({
                                        type: 'overlay',
                                        element: ov,
                                        index: idx,
                                        zIndex: zIndex
                                      });
                                    }
                                  });
                                }

                                // Sort by z-index to maintain proper layer order
                                allElements.sort((a, b) => {
                                  // If both have explicit z-index, use that
                                  if (a.zIndex !== undefined && b.zIndex !== undefined) {
                                    return a.zIndex - b.zIndex;
                                  }
                                  // Otherwise, maintain original order: text first, then overlays
                                  if (a.type !== b.type) {
                                    return a.type === 'text' ? -1 : 1;
                                  }
                                  return a.index - b.index;
                                });

                                if (allElements.length === 0) return null;

                                return (
                                  <div className="absolute inset-0 pointer-events-none">
                                    {allElements.map((item, globalIdx) => {
                                      if (item.type === 'text') {
                                        const el = item.element;
                                        const { leftPct, topPct, widthPct, heightPct, mode } = computeBoxPercents(
                                          el.bounding_box || {},
                                          frameDims1 || selected?.imageDimensions || {}
                                        );
                                        const zIndex = item;
                                        const fontSizeBase = Number.isFinite(el.fontSize) ? Number(el.fontSize) : 16;
                                        const fontSize =
                                          fontSizeBase > 0 && fontSizeBase <= 2 && mode === 'normalized'
                                            ? fontSizeBase * (Number((frameDims1 || selected?.imageDimensions)?.height) || 1)
                                            : fontSizeBase;
                                        const color = el.fill || '#ffffff';
                                        const fontFamily = el.fontFamily || 'sans-serif';
                                        const fontWeight = el.fontWeight || 'normal';
                                        const lineHeight = el.lineHeight || 1.2;
                                        const opacity = typeof el.textOpacity === 'number' ? el.textOpacity : 1;
                                        const shadow = el.effects?.textShadow;
                                        const textShadow =
                                          shadow && shadow.enabled
                                            ? `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur || 0}px ${shadow.color || 'rgba(0,0,0,0.5)'}`
                                            : undefined;
                                        const anchor = el.layout?.anchor_point || 'top_left';

                                        // Text alignment (support multiple field names)
                                        const textAlign = el.textAlign || el.align || el?.layout?.text_align || el?.layout?.alignment || 'left';

                                        // Additional text properties
                                        const fontStyle = el.fontStyle || 'normal';
                                        const textDecoration = el.textDecoration || 'none';
                                        const letterSpacing = el.letterSpacing ? `${el.letterSpacing}px` : 'normal';
                                        const backgroundColor = el.backgroundColor || 'transparent';
                                        const padding = backgroundColor && backgroundColor !== 'transparent' ? '2px 4px' : '0';
                                        const borderRadius = backgroundColor && backgroundColor !== 'transparent' ? '2px' : '0';

                                        // Text Glow effect
                                        const textGlow = el.textGlow || 'none';
                                        let glowFilter = 'none';
                                        switch (textGlow) {
                                          case 'subtle':
                                            glowFilter = 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))';
                                            break;
                                          case 'medium':
                                            glowFilter = 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 12px rgba(124, 58, 237, 0.6))';
                                            break;
                                          case 'strong':
                                            glowFilter = 'drop-shadow(0 0 12px rgba(255, 255, 255, 1)) drop-shadow(0 0 16px rgba(124, 58, 237, 0.8))';
                                            break;
                                          case 'neon':
                                            glowFilter = 'drop-shadow(0 0 10px rgba(255, 255, 255, 1)) drop-shadow(0 0 20px rgba(124, 58, 237, 1)) drop-shadow(0 0 30px rgba(124, 58, 237, 0.8))';
                                            break;
                                          default:
                                            glowFilter = 'none';
                                        }

                                        // Word Art styles
                                        const wordArt = el.wordArt || 'none';
                                        let wordArtStyles = {};
                                        switch (wordArt) {
                                          case 'gradient':
                                            wordArtStyles.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                                            wordArtStyles.WebkitBackgroundClip = 'text';
                                            wordArtStyles.WebkitTextFillColor = 'transparent';
                                            break;
                                          case 'outline':
                                            wordArtStyles.WebkitTextStroke = `2px ${color}`;
                                            wordArtStyles.color = 'transparent';
                                            break;
                                          case '3d':
                                            wordArtStyles.textShadow = '1px 1px 0 rgba(255, 255, 255, 0.5), -1px -1px 0 rgba(0, 0, 0, 0.3), 2px 2px 4px rgba(0, 0, 0, 0.5)';
                                            break;
                                          case 'metallic':
                                            wordArtStyles.background = 'linear-gradient(180deg, #ffffff 0%, #333333 50%, #ffffff 100%)';
                                            wordArtStyles.WebkitBackgroundClip = 'text';
                                            wordArtStyles.WebkitTextFillColor = 'transparent';
                                            break;
                                          case 'gradient-rainbow':
                                            wordArtStyles.background = 'linear-gradient(90deg, #ff0000 0%, #ff7f00 16.66%, #ffff00 33.33%, #00ff00 50%, #0000ff 66.66%, #4b0082 83.33%, #9400d3 100%)';
                                            wordArtStyles.WebkitBackgroundClip = 'text';
                                            wordArtStyles.WebkitTextFillColor = 'transparent';
                                            break;
                                          default:
                                            wordArtStyles = {};
                                        }

                                        const boxStyle = {
                                          position: 'absolute',
                                          left: `${leftPct}%`,
                                          top: `${topPct}%`,
                                          width: widthPct != null ? `${widthPct}%` : 'auto',
                                          height: heightPct != null ? `${heightPct}%` : 'auto',
                                          pointerEvents: 'none',
                                          zIndex: item.zIndex
                                        };
                                        const textStyle = {
                                          color,
                                          fontFamily,
                                          fontWeight,
                                          fontSize,
                                          fontStyle,
                                          textDecoration,
                                          textAlign: ['left', 'center', 'right', 'start', 'end', 'justify'].includes(textAlign) ? textAlign : 'left',
                                          lineHeight,
                                          letterSpacing,
                                          opacity,
                                          backgroundColor,
                                          padding,
                                          borderRadius,
                                          textShadow,
                                          filter: glowFilter !== 'none' ? glowFilter : undefined,
                                          ...wordArtStyles,
                                          whiteSpace: 'pre-wrap'
                                        };
                                        return (
                                          <div
                                            key={`text-1-${item.index}`}
                                            style={boxStyle}
                                            className="pointer-events-none"
                                            data-text-overlay="true"
                                          >
                                            <div style={textStyle}>{el.text || ''}</div>
                                          </div>
                                        );
                                      } else if (item.type === 'overlay') {
                                        const ov = item.element;
                                        const { leftPct, topPct, widthPct, heightPct } = computeBoxPercents(
                                          ov.bounding_box || {},
                                          frameDims1 || selected?.imageDimensions || {}
                                        );
                                        // Check for file_url (for shapes) first, then overlay_image.image_url, then other fields
                                        let overlayUrl =
                                          ov?.file_url ||
                                          ov?.fileUrl ||
                                          ov?.overlay_image?.image_url ||
                                          ov?.overlay_image?.imageUrl ||
                                          ov?.image_url ||
                                          ov?.imageUrl ||
                                          ov?.url ||
                                          ov?.src ||
                                          ov?.link ||
                                          '';
                                        if (!overlayUrl) return null;

                                        const rotationDeg1 =
                                          typeof ov?.rotation === 'number'
                                            ? ov.rotation
                                            : typeof ov?.layout?.rotation === 'number'
                                              ? ov.layout.rotation
                                              : 0;
                                        const isChartOverlay = ov?.element_id === 'chart_overlay' ||
                                          ov?.label_name === 'Chart' ||
                                          overlayUrl.includes('chart') ||
                                          (selectedModel === 'PLOTLY' && overlayUrl);

                                        if (isChartOverlay) {
                                          const separator = overlayUrl.includes('?') ? '&' : '?';
                                          overlayUrl = `${overlayUrl}${separator}_cb=${chartCacheBuster}`;
                                        }

                                        // Check if background was already removed (saved flag)
                                        // If background_removed is true, use the URL directly (it's already processed)
                                        // Otherwise, apply background removal for ANCHOR models
                                        const isBackgroundRemoved = ov?.background_removed === true;
                                        const displayUrl = (isAnchorModel && !isBackgroundRemoved)
                                          ? getOverlayBackgroundRemovedUrl(overlayUrl)
                                          : overlayUrl;

                                        const opacity = typeof ov.opacity === 'number' ? ov.opacity : 1;
                                        return (
                                          <img
                                            key={`overlay-1-${item.index}-${overlayUrl}`}
                                            src={displayUrl}
                                            alt="overlay"
                                            className="absolute"
                                            crossOrigin="anonymous"
                                            data-chart-overlay={isChartOverlay ? 'true' : 'false'}
                                            data-overlay-id={ov?.element_id || ''}
                                            data-overlay-label={ov?.label_name || ''}
                                            data-overlay-model={ov?.model || ''}
                                            style={{
                                              left: `${leftPct}%`,
                                              top: `${topPct}%`,
                                              width: widthPct != null ? `${widthPct}%` : 'auto',
                                              height: heightPct != null ? `${heightPct}%` : 'auto',
                                              opacity,
                                              zIndex: item.zIndex,
                                              transform: rotationDeg1 ? `rotate(${rotationDeg1}deg)` : undefined,
                                              transformOrigin: rotationDeg1 ? 'center center' : undefined
                                            }}
                                          />
                                        );
                                      }
                                      return null;
                                    })}
                                  </div>
                                );
                              })()}
                            </>
                          );
                        })()}
                      </div>
                    ) : null}

                    {/* Show Image 2 (Avatar) only when: tab 1 is active AND avatar exists */}
                    {showAvatarTab && secondaryImg && typeof secondaryImg === 'string' && secondaryImg.trim() && activeImageTab === 1 ? (
                      <div
                        key="image-2"
                        className="w-full bg-black rounded-lg overflow-hidden relative flex items-center justify-center group"
                        data-image-container
                        data-scene-number={activeSceneNumber}
                        data-image-index="1"
                        data-image-url={secondaryImg}
                        style={{
                          aspectRatio: cssAspectRatio,
                          ...(isPortrait9x16
                            ? { width: '500px', maxWidth: '500px', height: '100%' }
                            : { width: 'min(100%, 860px)', maxWidth: '860px', height: '100%' })
                        }}
                      >
                        {(() => {
                          const frames = Array.isArray(selected.imageFrames) ? selected.imageFrames : [];
                          const frameForImg2 = findFrameForImage(frames, secondaryImg, secondaryFrameIndex);
                          const fallbackFrame2 =
                            frameForImg2 || (frames.length > 1 ? frames[secondaryFrameIndex] || frames[0] : frames.length > 0 ? frames[0] : null);

                          // For ANCHOR models, Image 2 should show base_image as background (same as Image 1)
                          let displayImgUrl2 = secondaryImg;
                          if (selectedModel === 'ANCHOR' && fallbackFrame2) {
                            const baseImage = fallbackFrame2?.base_image || fallbackFrame2?.baseImage || {};
                            const frameBackgroundUrl = baseImage?.image_url || baseImage?.imageUrl || baseImage?.imageurl || baseImage?.url || baseImage?.src || '';
                            if (frameBackgroundUrl && typeof frameBackgroundUrl === 'string' && frameBackgroundUrl.trim()) {
                              // Verify it's not an avatar
                              const currentRow = rows.find(r =>
                                (r?.scene_number || r?.sceneNumber) === (selected?.sceneNumber || selected?.scene_number)
                              ) || rows[selected.index];
                              if (currentRow) {
                                const avatarSet = getAvatarUrlSet(currentRow);
                                const normalized = normalizeSimpleUrl(frameBackgroundUrl.trim());
                                if (normalized && !avatarSet.has(normalized)) {
                                  displayImgUrl2 = frameBackgroundUrl.trim();
                                }
                              } else {
                                displayImgUrl2 = frameBackgroundUrl.trim();
                              }
                            }
                          }

                          // Get text elements from the matched frame, fallback to selected.textElements
                          const textElsFromFrame2 = fallbackFrame2 ? (
                            Array.isArray(fallbackFrame2?.text_elements)
                              ? fallbackFrame2.text_elements
                              : Array.isArray(fallbackFrame2?.textElements)
                                ? fallbackFrame2.textElements
                                : []
                          ) : [];
                          // Fallback to selected level text elements
                          const fallbackText2 = Array.isArray(selected?.textElements)
                            ? selected.textElements
                            : Array.isArray(selected?.text_elements)
                              ? selected.text_elements
                              : [];
                          const effectiveTextEls2 = textElsFromFrame2.length > 0 ? textElsFromFrame2 : fallbackText2;

                          // Get overlay elements from the matched frame/image object (for ANCHOR models, use frameForImg2 specifically)
                          // Prioritize frameForImg2 (the exact match) over fallbackFrame2
                          const frameForOverlays2 = frameForImg2 || fallbackFrame2;
                          let overlayEls2 = frameForOverlays2 ? (
                            Array.isArray(frameForOverlays2?.overlay_elements)
                              ? frameForOverlays2.overlay_elements
                              : Array.isArray(frameForOverlays2?.overlayElements)
                                ? frameForOverlays2.overlayElements
                                : []
                          ) : [];

                          // Fallback to selected level overlay elements if frame doesn't have any
                          if (overlayEls2.length === 0) {
                            overlayEls2 = Array.isArray(selected?.overlayElements)
                              ? selected.overlayElements
                              : Array.isArray(selected?.overlay_elements)
                                ? selected.overlay_elements
                                : [];
                          }

                          // For ANCHOR models, if secondaryImg (avatar) exists and is different from background, add it as overlay
                          // Only add avatar if it's not already in overlay elements
                          if (selectedModel === 'ANCHOR' && secondaryImg && typeof secondaryImg === 'string' && secondaryImg.trim() && displayImgUrl2 !== secondaryImg.trim()) {
                            const currentRow = rows.find(r =>
                              (r?.scene_number || r?.sceneNumber) === (selected?.sceneNumber || selected?.scene_number)
                            ) || rows[selected.index];
                            if (currentRow) {
                              const avatarSet = getAvatarUrlSet(currentRow);
                              const normalized = normalizeSimpleUrl(secondaryImg.trim());
                              if (normalized && avatarSet.has(normalized)) {
                                // Check if avatar is already in overlay elements
                                const avatarAlreadyInOverlays = overlayEls2.some(ov => {
                                  const ovUrl = ov?.overlay_image?.image_url || ov?.file_url || ov?.fileUrl || ov?.image_url || ov?.url || '';
                                  return normalizeSimpleUrl(ovUrl) === normalized;
                                });

                                if (!avatarAlreadyInOverlays) {
                                  // Add avatar as overlay element
                                  overlayEls2 = [...overlayEls2, {
                                    overlay_image: {
                                      image_url: secondaryImg.trim()
                                    },
                                    bounding_box: frameForOverlays2?.overlay_elements?.[0]?.bounding_box || frameForOverlays2?.overlayElements?.[0]?.bounding_box || {},
                                    layout: frameForOverlays2?.overlay_elements?.[0]?.layout || frameForOverlays2?.overlayElements?.[0]?.layout || {}
                                  }];
                                }
                              }
                            }
                          }

                          const frameDims2 =
                            fallbackFrame2?.base_image?.image_dimensions ||
                            fallbackFrame2?.base_image?.imageDimensions ||
                            imageNaturalDims[displayImgUrl2] ||
                            imageNaturalDims[secondaryImg] ||
                            selected?.imageDimensions ||
                            (frames[0]?.base_image?.image_dimensions || frames[0]?.base_image?.imageDimensions) ||
                            { width: 1280, height: 720 };
                          return (
                            <>
                              {/* Regenerate button - top right above image */}
                              {selected?.isEditable && (
                                <></>
                              )}
                              {displayImgUrl2 && typeof displayImgUrl2 === 'string' && displayImgUrl2.trim() ? (
                                <img
                                  src={(() => {
                                    // For VEO3, add cache-busting for avatar images
                                    if (isVeoScene && secondaryImg && displayImgUrl2 === secondaryImg) {
                                      const separator = displayImgUrl2.includes('?') ? '&' : '?';
                                      const cacheBuster = `${separator}_cb=${activeSceneNumber}_${currentVersion}`;
                                      return `${displayImgUrl2}${cacheBuster}`;
                                    }
                                    return displayImgUrl2;
                                  })()}
                                  alt={`scene-${selected.sceneNumber}-secondary`}
                                  className="w-full h-full object-contain"
                                  height={frameDims2?.height || undefined}
                                  crossOrigin={displayImgUrl2.startsWith('http') && !displayImgUrl2.includes(window.location.hostname) ? "anonymous" : undefined}
                                  onLoad={(e) => {
                                    handleNaturalSize(displayImgUrl2, e.target);
                                  }}
                                  key={selectedModel === 'ANCHOR' ? `anchor-bg-${activeSceneNumber}-${displayImgUrl2}` : (avatarCacheKey || `avatar-${activeSceneNumber}-${secondaryImg}`)}
                                  onError={(e) => {
                                    const errorImg = e.target;
                                    const failedUrl = errorImg.src;

                                    // Try multiple fallback strategies
                                    const currentRow = rows[selected.index];
                                    const fallbackUrls = [];

                                    // Strategy 1: Try other refs from current row (especially index 1)
                                    if (currentRow && Array.isArray(currentRow.refs)) {
                                      currentRow.refs.forEach((ref, idx) => {
                                        if (ref && typeof ref === 'string' && ref.trim() && ref !== failedUrl) {
                                          fallbackUrls.push(ref.trim());
                                        }
                                      });
                                    }

                                    // Strategy 2: Try selected.images[1] or other indices
                                    if (Array.isArray(selected.images)) {
                                      selected.images.forEach((img) => {
                                        const fallbackUrl = getImageUrlFromEntry(img);
                                        if (fallbackUrl && fallbackUrl !== failedUrl && !fallbackUrls.includes(fallbackUrl)) {
                                          fallbackUrls.push(fallbackUrl);
                                        }
                                      });
                                    }

                                    // Try the first available fallback
                                    if (fallbackUrls.length > 0) {
                                      const nextUrl = fallbackUrls[0];
                                      // Remove crossOrigin to avoid CORS issues on retry
                                      errorImg.crossOrigin = null;
                                      errorImg.src = nextUrl;
                                    } else {
                                      // Show error state
                                      errorImg.style.display = 'none';
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-white text-sm">
                                  <div className="text-center">
                                    <p>No image available</p>
                                    <p className="text-xs mt-2 opacity-75">Scene {selected?.sceneNumber || selected?.scene_number || 1} - Image 2</p>
                                  </div>
                                </div>
                              )}
                              {/* Edit button on hover - slides in from right (hidden for VEO3 with gen_image=false) */}
                              {(() => {
                                // If this scene is not editable (e.g., fallback background/avatar image only), hide edit/export
                                if (!selected?.isEditable) {
                                  return null;
                                }
                                // Check if this is VEO3 model with gen_image=false
                                const modelUpper = String(selected?.model || '').toUpperCase();
                                const isVEO3 = (modelUpper === 'VEO3' || modelUpper === 'ANCHOR');
                                const imageVersionData = selected?.imageVersionData || {};
                                const versionKey = getLatestVersionKey(imageVersionData);
                                const verObj = imageVersionData[versionKey] || {};
                                const genImage = verObj?.gen_image !== false; // Default to true if not specified

                                // Hide edit/export buttons for VEO3 with gen_image=false
                                if (isVEO3 && !genImage) {
                                  return null;
                                }

                                const sceneNo = selected?.sceneNumber || selected?.scene_number || 1;

                                return (
                                  <div className="absolute right-0 top-[50px] -translate-y-1/2 translate-x-full group-hover:translate-x-0 transition-transform duration-300 flex flex-col gap-1 z-10">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        // Get the frame data for this specific image (Image 2)
                                        const frame = frameForImg2;
                                        if (frame) {
                                          // Build the JSON structure with base_image, text_elements, and overlay_elements
                                          const frameData = {
                                            base_image: frame?.base_image || frame?.baseImage || {
                                              image_url: secondaryImg,
                                              image_dimensions: selected?.imageDimensions || {}
                                            },
                                            text_elements: Array.isArray(frame?.text_elements) ? frame.text_elements :
                                              Array.isArray(frame?.textElements) ? frame.textElements : [],
                                            overlay_elements: Array.isArray(frame?.overlay_elements) ? frame.overlay_elements : [],
                                            model: selectedModel
                                          };
                                          setEditingImageFrame(frameData);
                                          setEditingSceneNumber(sceneNo);
                                          setEditingImageIndex(secondaryFrameIndex); // Track actual image index
                                          setShowImageEdit(true);
                                        }
                                      }}
                                      className="bg-[#13008B] text-white p-2 rounded-l-lg hover:bg-[#0f0068] flex items-center justify-center"
                                      title="Edit Image"
                                    >
                                      <Pencil className="w-4 h-4" />
                                    </button>
                                    {/* <button
                                      type="button"
                                      onClick={() => {
                                        if (!secondaryImg) return;
                                        exportVisibleImageFromDom({
                                          sceneNumber: sceneNo,
                                          imageIndex: 1
                                        });
                                      }}
                                      className="bg-white text-[#13008B] p-2 rounded-l-lg border border-[#13008B] hover:bg-blue-50 flex items-center justify-center"
                                      title="Export Image"
                                    >
                                      ⬇
                                    </button> */}
                                  </div>
                                );
                              })()}
                              {/* Render all elements (text + overlays) in proper layer order */}
                              {(() => {
                                // Combine text and overlay elements with their layer information
                                const allElements = [];

                                // Add text elements with type and index for sorting
                                if (Array.isArray(effectiveTextEls2) && effectiveTextEls2.length > 0) {
                                  effectiveTextEls2.forEach((el, idx) => {
                                    if (el && typeof el === 'object') {
                                      // Prioritize layout.zIndex - use it if it exists (even if 0), otherwise fallback
                                      const zIndex = typeof el.layout?.zIndex === 'number'
                                        ? el.layout.zIndex
                                        : (typeof el.z_index === 'number' ? el.z_index : (typeof el.zIndex === 'number' ? el.zIndex : (idx + 1)));
                                      allElements.push({
                                        type: 'text',
                                        element: el,
                                        index: idx,
                                        zIndex: zIndex
                                      });
                                    }
                                  });
                                }

                                // Add overlay elements with type and index for sorting
                                if (Array.isArray(overlayEls2) && overlayEls2.length > 0) {
                                  overlayEls2.forEach((ov, idx) => {
                                    if (ov && typeof ov === 'object') {
                                      // Prioritize layout.zIndex - use it if it exists (even if 0), otherwise fallback
                                      const zIndex = typeof ov.layout?.zIndex === 'number'
                                        ? ov.layout.zIndex
                                        : (typeof ov.z_index === 'number' ? ov.z_index : (typeof ov.zIndex === 'number' ? ov.zIndex : (100 + idx + 1)));
                                      allElements.push({
                                        type: 'overlay',
                                        element: ov,
                                        index: idx,
                                        zIndex: zIndex
                                      });
                                    }
                                  });
                                }

                                // Sort by z-index to maintain proper layer order
                                allElements.sort((a, b) => {
                                  // If both have explicit z-index, use that
                                  if (a.zIndex !== undefined && b.zIndex !== undefined) {
                                    return a.zIndex - b.zIndex;
                                  }
                                  // Otherwise, maintain original order: text first, then overlays
                                  if (a.type !== b.type) {
                                    return a.type === 'text' ? -1 : 1;
                                  }
                                  return a.index - b.index;
                                });

                                if (allElements.length === 0) return null;

                                return (
                                  <div className="absolute inset-0 pointer-events-none">
                                    {allElements.map((item, globalIdx) => {
                                      if (item.type === 'text') {
                                        const el = item.element;
                                        const { leftPct, topPct, widthPct, heightPct, mode } = computeBoxPercents(
                                          el.bounding_box || {},
                                          frameDims2 || selected?.imageDimensions || {}
                                        );
                                        const fontSizeBase = Number.isFinite(el.fontSize) ? Number(el.fontSize) : 16;
                                        const fontSize =
                                          fontSizeBase > 0 && fontSizeBase <= 2 && mode === 'normalized'
                                            ? fontSizeBase * (Number((frameDims2 || selected?.imageDimensions)?.height) || 1)
                                            : fontSizeBase;
                                        const color = el.fill || '#ffffff';
                                        const fontFamily = el.fontFamily || 'sans-serif';
                                        const fontWeight = el.fontWeight || 'normal';
                                        const lineHeight = el.lineHeight || 1.2;
                                        const opacity = typeof el.textOpacity === 'number' ? el.textOpacity : 1;
                                        const shadow = el.effects?.textShadow;
                                        const textShadow =
                                          shadow && shadow.enabled
                                            ? `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur || 0}px ${shadow.color || 'rgba(0,0,0,0.5)'}`
                                            : undefined;
                                        const anchor = el.layout?.anchor_point || 'top_left';

                                        // Text alignment (support multiple field names)
                                        const textAlign = el.textAlign || el.align || el?.layout?.text_align || el?.layout?.alignment || 'left';

                                        // Additional text properties
                                        const fontStyle = el.fontStyle || 'normal';
                                        const textDecoration = el.textDecoration || 'none';
                                        const letterSpacing = el.letterSpacing ? `${el.letterSpacing}px` : 'normal';
                                        const backgroundColor = el.backgroundColor || 'transparent';
                                        const padding = backgroundColor && backgroundColor !== 'transparent' ? '2px 4px' : '0';
                                        const borderRadius = backgroundColor && backgroundColor !== 'transparent' ? '2px' : '0';

                                        // Text Glow effect
                                        const textGlow = el.textGlow || 'none';
                                        let glowFilter = 'none';
                                        switch (textGlow) {
                                          case 'subtle':
                                            glowFilter = 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))';
                                            break;
                                          case 'medium':
                                            glowFilter = 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 12px rgba(124, 58, 237, 0.6))';
                                            break;
                                          case 'strong':
                                            glowFilter = 'drop-shadow(0 0 12px rgba(255, 255, 255, 1)) drop-shadow(0 0 16px rgba(124, 58, 237, 0.8))';
                                            break;
                                          case 'neon':
                                            glowFilter = 'drop-shadow(0 0 10px rgba(255, 255, 255, 1)) drop-shadow(0 0 20px rgba(124, 58, 237, 1)) drop-shadow(0 0 30px rgba(124, 58, 237, 0.8))';
                                            break;
                                          default:
                                            glowFilter = 'none';
                                        }

                                        // Word Art styles
                                        const wordArt = el.wordArt || 'none';
                                        let wordArtStyles = {};
                                        switch (wordArt) {
                                          case 'gradient':
                                            wordArtStyles.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
                                            wordArtStyles.WebkitBackgroundClip = 'text';
                                            wordArtStyles.WebkitTextFillColor = 'transparent';
                                            break;
                                          case 'outline':
                                            wordArtStyles.WebkitTextStroke = `2px ${color}`;
                                            wordArtStyles.color = 'transparent';
                                            break;
                                          case '3d':
                                            wordArtStyles.textShadow = '1px 1px 0 rgba(255, 255, 255, 0.5), -1px -1px 0 rgba(0, 0, 0, 0.3), 2px 2px 4px rgba(0, 0, 0, 0.5)';
                                            break;
                                          case 'metallic':
                                            wordArtStyles.background = 'linear-gradient(180deg, #ffffff 0%, #333333 50%, #ffffff 100%)';
                                            wordArtStyles.WebkitBackgroundClip = 'text';
                                            wordArtStyles.WebkitTextFillColor = 'transparent';
                                            break;
                                          case 'gradient-rainbow':
                                            wordArtStyles.background = 'linear-gradient(90deg, #ff0000 0%, #ff7f00 16.66%, #ffff00 33.33%, #00ff00 50%, #0000ff 66.66%, #4b0082 83.33%, #9400d3 100%)';
                                            wordArtStyles.WebkitBackgroundClip = 'text';
                                            wordArtStyles.WebkitTextFillColor = 'transparent';
                                            break;
                                          default:
                                            wordArtStyles = {};
                                        }

                                        const boxStyle = {
                                          position: 'absolute',
                                          left: `${leftPct}%`,
                                          top: `${topPct}%`,
                                          width: widthPct != null ? `${widthPct}%` : 'auto',
                                          height: heightPct != null ? `${heightPct}%` : 'auto',
                                          pointerEvents: 'none',
                                          zIndex: item.zIndex
                                        };
                                        const textStyle = {
                                          color,
                                          fontFamily,
                                          fontWeight,
                                          fontSize,
                                          fontStyle,
                                          textDecoration,
                                          textAlign: ['left', 'center', 'right', 'start', 'end', 'justify'].includes(textAlign) ? textAlign : 'left',
                                          lineHeight,
                                          letterSpacing,
                                          opacity,
                                          backgroundColor,
                                          padding,
                                          borderRadius,
                                          textShadow,
                                          filter: glowFilter !== 'none' ? glowFilter : undefined,
                                          ...wordArtStyles,
                                          whiteSpace: 'pre-wrap'
                                        };
                                        return (
                                          <div
                                            key={`text-2-${item.index}`}
                                            style={boxStyle}
                                            className="pointer-events-none"
                                            data-text-overlay="true"
                                          >
                                            <div style={textStyle}>{el.text || ''}</div>
                                          </div>
                                        );
                                      } else if (item.type === 'overlay') {
                                        const ov = item.element;
                                        const { leftPct, topPct, widthPct, heightPct } = computeBoxPercents(
                                          ov.bounding_box || {},
                                          frameDims2 || selected?.imageDimensions || {}
                                        );
                                        // Check for file_url (for shapes) first, then overlay_image.image_url, then other fields
                                        let overlayUrl =
                                          ov?.file_url ||
                                          ov?.fileUrl ||
                                          ov?.overlay_image?.image_url ||
                                          ov?.overlay_image?.imageUrl ||
                                          ov?.image_url ||
                                          ov?.imageUrl ||
                                          ov?.url ||
                                          ov?.src ||
                                          ov?.link ||
                                          '';
                                        if (!overlayUrl) return null;

                                        const rotationDeg2 =
                                          typeof ov?.rotation === 'number'
                                            ? ov.rotation
                                            : typeof ov?.layout?.rotation === 'number'
                                              ? ov.layout.rotation
                                              : 0;
                                        const isChartOverlay = ov?.element_id === 'chart_overlay' ||
                                          ov?.label_name === 'Chart' ||
                                          overlayUrl.includes('chart') ||
                                          (selectedModel === 'PLOTLY' && overlayUrl);

                                        if (isChartOverlay) {
                                          const separator = overlayUrl.includes('?') ? '&' : '?';
                                          overlayUrl = `${overlayUrl}${separator}_cb=${chartCacheBuster}`;
                                        }

                                        // Check if background was already removed (saved flag)
                                        // If background_removed is true, use the URL directly (it's already processed)
                                        // Otherwise, apply background removal for ANCHOR models
                                        const isBackgroundRemoved = ov?.background_removed === true;
                                        const displayUrl = (isAnchorModel && !isBackgroundRemoved)
                                          ? getOverlayBackgroundRemovedUrl(overlayUrl)
                                          : overlayUrl;

                                        const opacity = typeof ov.opacity === 'number' ? ov.opacity : 1;
                                        return (
                                          <img
                                            key={`overlay-2-${item.index}-${overlayUrl}`}
                                            src={displayUrl}
                                            alt="overlay"
                                            className="absolute"
                                            crossOrigin="anonymous"
                                            data-chart-overlay={isChartOverlay ? 'true' : 'false'}
                                            data-overlay-id={ov?.element_id || ''}
                                            data-overlay-label={ov?.label_name || ''}
                                            data-overlay-model={ov?.model || ''}
                                            style={{
                                              left: `${leftPct}%`,
                                              top: `${topPct}%`,
                                              width: widthPct != null ? `${widthPct}%` : 'auto',
                                              height: heightPct != null ? `${heightPct}%` : 'auto',
                                              opacity,
                                              zIndex: item.zIndex,
                                              transform: rotationDeg2 ? `rotate(${rotationDeg2}deg)` : undefined,
                                              transformOrigin: rotationDeg2 ? 'center center' : undefined
                                            }}
                                          />
                                        );
                                      }
                                      return null;
                                    })}
                                  </div>
                                );
                              })()}
                            </>
                          );
                        })()}
                      </div>
                    ) : null}
                  </div>
                </div>
              );
            })()}

            {/* Title, Description, Narration stacked vertically */}
            <div className="space-y-3">

              <div>
                {/* Labels removed - both VEO3 and non-VEO3 now have their own headers in the UI */}
                {(() => {
                  const modelUpper = String(selected?.model || '').toUpperCase();
                  const isVEO3 = modelUpper === 'VEO3';

                  if (isVEO3) {
                    // For VEO3, show formatted Scene Description display (read-only) with all veo3_prompt_template data
                    const sceneNumber = selected?.sceneNumber || selected?.scene_number;

                    // First check selected state
                    let veo3PromptTemplate = selected?.veo3_prompt_template ||
                      selected?.veo3PromptTemplate ||
                      selected?.veo3_prompt ||
                      selected?.veo3Prompt ||
                      null;

                    // If not found, check rows
                    if (!veo3PromptTemplate) {
                      const matchingRow = rows.find(row =>
                        String(row?.scene_number || row?.sceneNumber) === String(sceneNumber)
                      );
                      veo3PromptTemplate = matchingRow?.veo3_prompt_template ||
                        matchingRow?.veo3PromptTemplate ||
                        matchingRow?.veo3_prompt ||
                        matchingRow?.veo3Prompt ||
                        null;
                    }

                    // If still not found, check scriptsData directly
                    if (!veo3PromptTemplate && Array.isArray(scriptsData) && scriptsData.length > 0) {
                      const currentScript = scriptsData[0] || null;
                      const airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];
                      const scriptScene = airesponse.find((scene, idx) => {
                        const sceneNum = scene?.scene_number || scene?.scene_no || scene?.sceneNo || (idx + 1);
                        return String(sceneNum) === String(sceneNumber);
                      });

                      if (scriptScene) {
                        veo3PromptTemplate = scriptScene?.veo3_prompt_template ||
                          scriptScene?.veo3PromptTemplate ||
                          scriptScene?.veo3_prompt ||
                          scriptScene?.veo3Prompt ||
                          null;
                      }
                    }

                    // Format the veo3_prompt_template object for display as key-value pairs
                    const getTemplateFields = (template) => {
                      if (!template) return [];

                      // If it's a string, try to parse it as JSON
                      if (typeof template === 'string') {
                        try {
                          const parsed = JSON.parse(template);
                          if (typeof parsed === 'object' && parsed !== null) {
                            return Object.entries(parsed);
                          }
                          return [['content', template]];
                        } catch {
                          return [['content', template]];
                        }
                      }

                      // If it's an object, return entries
                      if (typeof template === 'object' && template !== null) {
                        return Object.entries(template);
                      }

                      return [];
                    };

                    const templateFields = getTemplateFields(veo3PromptTemplate);
                    const currentSceneIndex = selected?.index ?? 0;
                    const isEditing = isEditingVeo3Template && descriptionSceneIndex === currentSceneIndex;

                    const startEditingVeo3Template = () => {
                      // Initialize editable template with current values
                      const templateObj = veo3PromptTemplate || {};
                      setEditableVeo3Template(typeof templateObj === 'string' ? JSON.parse(templateObj) : { ...templateObj });
                      setIsEditingVeo3Template(true);
                      setDescriptionSceneIndex(currentSceneIndex);
                    };

                    const cancelEditingVeo3Template = () => {
                      setIsEditingVeo3Template(false);
                      setDescriptionSceneIndex(null);
                      setEditableVeo3Template({});
                    };

                    const updateVeo3TemplateField = (key, value) => {
                      setEditableVeo3Template(prev => ({
                        ...prev,
                        [key]: value
                      }));
                    };

                    const saveVeo3Template = async () => {
                      setIsSavingVeo3Template(true);
                      try {
                        const user_id = localStorage.getItem('token');
                        const session_id = localStorage.getItem('session_id');
                        const scene_number = selected?.sceneNumber || selected?.scene_number || 1;

                        if (!user_id || !session_id) {
                          throw new Error('Missing user_id or session_id');
                        }

                        // First, fetch the complete user session data
                        const sessionDataResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ user_id, session_id })
                        });

                        const sessionDataText = await sessionDataResp.text();
                        let sessionData;
                        try {
                          sessionData = JSON.parse(sessionDataText);
                        } catch {
                          sessionData = sessionDataText;
                        }

                        if (!sessionDataResp.ok) {
                          throw new Error(`Failed to fetch session data: ${sessionDataResp.status} ${JSON.stringify(sessionData)}`);
                        }

                        // Extract the complete session and user objects from the response
                        const fullSessionData = sessionData?.session_data || sessionData?.session || {};
                        const fullUserData = sessionData?.user_data || sessionData?.user || {};

                        // Normalize session object: ensure session_id exists (convert id to session_id if needed)
                        let normalizedSession = {};
                        if (fullSessionData && Object.keys(fullSessionData).length > 0) {
                          normalizedSession = { ...fullSessionData };
                          // If session has 'id' but no 'session_id', use 'id' as 'session_id'
                          if (normalizedSession.id && !normalizedSession.session_id) {
                            normalizedSession.session_id = normalizedSession.id;
                            delete normalizedSession.id;
                          }
                          // Ensure session_id is set
                          if (!normalizedSession.session_id) {
                            normalizedSession.session_id = session_id;
                          }
                        } else {
                          // Fallback to minimal session object
                          normalizedSession = {
                            session_id: session_id,
                            user_id: user_id,
                            title: '',
                            video_duration: '60',
                            created_at: '',
                            updated_at: '',
                            document_summary: [],
                            messages: [],
                            total_summary: [],
                            scripts: [],
                            videos: [],
                            images: [],
                            final_link: {},
                            videoType: '',
                            brand_style_interpretation: {},
                            ...sessionAssets
                          };
                        }

                        const session = normalizedSession;

                        // Use the complete user object, or fallback to minimal if not available
                        const user = fullUserData && Object.keys(fullUserData).length > 0
                          ? fullUserData
                          : {
                            id: user_id,
                            email: '',
                            display_name: '',
                            created_at: '',
                            avatar_url: '',
                            folder_url: '',
                            brand_identity: {},
                            tone_and_voice: {},
                            look_and_feel: {},
                            templates: [],
                            voiceover: Array.isArray(brandAssets?.voiceover) ? brandAssets.voiceover : []
                          };

                        // For VEO3 model, new_value should be an object, for other models it should be a string
                        const modelUpper = String(selected?.model || '').toUpperCase();
                        const isVEO3 = modelUpper === 'VEO3';

                        const payload = {
                          user,
                          session,
                          scene_number: Number(scene_number),
                          field_name: 'veo3_prompt_template',
                          new_value: isVEO3 ? editableVeo3Template : JSON.stringify(editableVeo3Template)
                        };

                        const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-scene-field', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload)
                        });

                        const text = await response.text();
                        let data;
                        try {
                          data = JSON.parse(text);
                        } catch {
                          data = text;
                        }

                        if (!response.ok) {
                          throw new Error(`Update failed: ${response.status} ${JSON.stringify(data)}`);
                        }

                        // Update local state
                        setSelected(prev => ({ ...prev, veo3_prompt_template: editableVeo3Template }));
                        setRows(prevRows => prevRows.map(row => {
                          const rowSceneNumber = row?.scene_number || row?.sceneNumber;
                          if (String(rowSceneNumber) === String(scene_number)) {
                            return { ...row, veo3_prompt_template: editableVeo3Template };
                          }
                          return row;
                        }));

                        // Refresh the data (loader remains visible during this)
                        await refreshLoad(scene_number);

                        // Only reset state after everything is complete
                        setIsEditingVeo3Template(false);
                        setDescriptionSceneIndex(null);
                        setEditableVeo3Template({});
                        setError('');
                      } catch (error) {
                        setError('Failed to update VEO3 template: ' + (error?.message || 'Unknown error'));
                        console.error('Error saving VEO3 template:', error);
                      } finally {
                        // Hide loader only after everything is complete (including refreshLoad)
                        setIsSavingVeo3Template(false);
                      }
                    };

                    return (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative w-full">
                        {/* Loading Overlay - Shows until update-scene-field API completes */}
                        {isSavingVeo3Template && (
                          <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm rounded-lg pointer-events-auto">
                            <Loader
                              videoSize="w-16 h-16"
                              title="Updating Scene Field"
                              description="Please wait while we save your changes..."
                              containerClass="!max-w-xs !p-4"
                              progress={savingVeo3TemplateProgress > 0 ? savingVeo3TemplateProgress : null}
                            />
                          </div>
                        )}
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-800">Scene Description</h4>
                          {isEditing ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                onClick={cancelEditingVeo3Template}
                                disabled={isSavingVeo3Template}
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={saveVeo3Template}
                                disabled={isSavingVeo3Template}
                                className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-xs hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                              >
                                {isSavingVeo3Template ? (
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
                              onClick={startEditingVeo3Template}
                              className="text-xs text-[#13008B] hover:text-[#0F0069] font-medium flex items-center gap-1"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              Edit
                            </button>
                          )}
                        </div>
                        {isEditing ? (
                          <div className="w-full">
                            {Object.keys(editableVeo3Template).length > 0 ? (
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {Object.entries(editableVeo3Template).map(([key, value]) => {
                                  const displayValue = typeof value === 'string'
                                    ? value
                                    : (typeof value === 'object' && value !== null
                                      ? JSON.stringify(value, null, 2)
                                      : String(value || ''));

                                  // Format key: replace underscores with spaces and capitalize
                                  const formattedKey = key
                                    .replace(/_/g, ' ')
                                    .split(' ')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                    .join(' ')
                                    .toUpperCase();

                                  return (
                                    <div key={key} className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2 space-y-2">
                                      <label className="text-xs font-semibold uppercase tracking-wide text-gray-600">
                                        {formattedKey}
                                      </label>
                                      <textarea
                                        value={displayValue}
                                        onChange={(e) => {
                                          const newValue = e.target.value;
                                          // Try to parse as JSON if it looks like JSON, otherwise keep as string
                                          try {
                                            const parsed = JSON.parse(newValue);
                                            updateVeo3TemplateField(key, parsed);
                                          } catch {
                                            updateVeo3TemplateField(key, newValue);
                                          }
                                        }}
                                        className="w-full px-3 py-2 rounded-lg border border-gray-300 focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B] text-sm text-gray-800 bg-white resize-none"
                                        rows={typeof value === 'object' && value !== null ? 6 : 3}
                                        placeholder={`Enter ${formattedKey.toLowerCase()}`}
                                        disabled={isSavingVeo3Template}
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="w-full border border-gray-200 rounded-lg bg-white px-4 py-3 text-sm text-gray-400 italic text-center">
                                No fields available to edit
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="w-full">
                            {templateFields.length > 0 ? (
                              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                                {templateFields.map(([key, value]) => {
                                  const displayValue = typeof value === 'string'
                                    ? value
                                    : (typeof value === 'object' && value !== null
                                      ? JSON.stringify(value, null, 2)
                                      : String(value || ''));

                                  const formattedKey = key
                                    .replace(/_/g, ' ')
                                    .split(' ')
                                    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                                    .join(' ')
                                    .toUpperCase();

                                  return (
                                    <div
                                      key={key}
                                      className="rounded-md border border-blue-100 bg-blue-50 px-3 py-2"
                                    >
                                      <p className="text-xs font-semibold uppercase tracking-wide text-gray-600 mb-1">
                                        {formattedKey}
                                      </p>
                                      <div className="text-sm text-gray-800 whitespace-pre-wrap">
                                        {displayValue ? truncateText(displayValue) : <span className="text-gray-400 italic">-</span>}
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <div className="w-full border border-gray-200 rounded-lg bg-white px-4 py-3 text-sm text-gray-400 italic">
                                No scene description available
                              </div>
                            )}
                          </div>
                        )}

                        <div className="mt-4 border border-[#D8DFFF] rounded-lg p-3 bg-white">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-xs font-medium text-gray-600">Narration</label>
                            {editingField === 'narration' ? (
                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingField(null);
                                    setEditedNarration('');
                                  }}
                                  disabled={isSavingField}
                                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  Cancel
                                </button>
                                <button
                                  type="button"
                                  onClick={handleSaveNarration}
                                  disabled={isSavingField}
                                  className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-xs hover:bg-[#0F0069] disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                  {isSavingField ? 'Saving...' : 'Save'}
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingField('narration');
                                  setEditedNarration(selected?.narration || '');
                                }}
                                className="text-xs text-[#13008B] hover:text-[#0F0069] font-medium flex items-center gap-1"
                              >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                </svg>
                                Edit
                              </button>
                            )}
                          </div>
                          {editingField === 'narration' ? (
                            <textarea
                              className="w-full h-24 border border-[#D8DFFF] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#13008B]"
                              value={editedNarration}
                              onChange={(e) => setEditedNarration(e.target.value)}
                            />
                          ) : (
                            <input
                              type="text"
                              className="w-full border border-[#D8DFFF] bg-white rounded-lg px-3 py-2 text-sm text-gray-700 min-h-[40px]"
                              readOnly
                              value={truncateText(selected?.narration || '', 16)}
                            />
                          )}
                        </div>
                      </div>
                    );
                  }

                  // For non-VEO3 models, check if it's SORA, PLOTLY, or ANCHOR
                  const isSoraPlotlyAnchor = modelUpper === 'SORA' || modelUpper === 'PLOTLY' || modelUpper === 'ANCHOR';

                  // For SORA, PLOTLY, and ANCHOR, show transition section instead of description
                  if (isSoraPlotlyAnchor) {
                    // Return transition section directly (without accordion)
                    const sceneNumber = selected?.sceneNumber || selected?.scene_number || 1;
                    const sceneOptions = sceneAdvancedOptions[sceneNumber] || {
                      logoNeeded: false,
                      voiceUrl: '',
                      voiceOption: PRESET_VOICE_OPTIONS.male[0]?.key || 'american_male',
                      transitionPreset: null,
                      transitionCustom: null,
                      customDescription: '',
                      customPreservationNotes: {
                        lighting: '',
                        style_mood: '',
                        transition_type: '',
                        scene_description: '',
                        subject_description: '',
                        action_specification: '',
                        content_modification: '',
                        camera_specifications: '',
                        geometric_preservation: ''
                      },
                      subtitleSceneOnly: false,
                      rememberCustomPreset: false,
                      customPresetName: ''
                    };

                    const customNotes = sceneOptions.customPreservationNotes || {};
                    const hasCustomDesignInput =
                      (sceneOptions.customDescription || '').trim().length > 0 ||
                      Object.values(customNotes).some(v => (v || '').trim().length > 0);

                    const isCustomPresetMode = !!sceneOptions.rememberCustomPreset;
                    const designYourOwnTabValue = designYourOwnTab[sceneNumber] || 'describe';

                    const updateSceneOption = (key, value) => {
                      setSceneAdvancedOptions(prev => ({
                        ...prev,
                        [sceneNumber]: {
                          ...prev[sceneNumber],
                          [key]: value
                        }
                      }));
                    };

                    const toggleAdvancedOptions = (section) => {
                      setShowAdvancedOptions(prev => ({
                        ...prev,
                        [sceneNumber]: {
                          ...prev[sceneNumber],
                          [section]: !prev[sceneNumber]?.[section]
                        }
                      }));
                    };

                    const isEditing = isEditingAnimationDesc[sceneNumber] || false;
                    const editableData = editableAnimationDesc[sceneNumber] || {};

                    const startEditingAnimationDesc = () => {
                      // Get current animation_desc data
                      const currentRow = rows.find((r) => (r?.scene_number || r?.sceneNumber) === sceneNumber);
                      let animationDesc = {};
                      if (currentRow?.imageVersionData) {
                        const imageVersionData = currentRow.imageVersionData;
                        const versionKey = getLatestVersionKey(imageVersionData);
                        const verObj = imageVersionData[versionKey] || {};
                        animationDesc = verObj?.animation_desc || {};
                      }
                      if (Object.keys(animationDesc).length === 0 && selected?.imageVersionData) {
                        const imageVersionData = selected.imageVersionData;
                        const versionKey = getLatestVersionKey(imageVersionData);
                        const verObj = imageVersionData[versionKey] || {};
                        animationDesc = verObj?.animation_desc || {};
                      }
                      if (Object.keys(animationDesc).length === 0) {
                        animationDesc = currentRow?.animation_desc || selected?.animation_desc || sceneOptions.customPreservationNotes || {};
                      }

                      // Initialize editable data with current values
                      setEditableAnimationDesc(prev => ({
                        ...prev,
                        [sceneNumber]: { ...animationDesc }
                      }));
                      setIsEditingAnimationDesc(prev => ({
                        ...prev,
                        [sceneNumber]: true
                      }));
                    };

                    const cancelEditingAnimationDesc = () => {
                      setIsEditingAnimationDesc(prev => {
                        const updated = { ...prev };
                        delete updated[sceneNumber];
                        return updated;
                      });
                      setEditableAnimationDesc(prev => {
                        const updated = { ...prev };
                        delete updated[sceneNumber];
                        return updated;
                      });
                    };

                    const updateEditableAnimationDesc = (key, value) => {
                      setEditableAnimationDesc(prev => ({
                        ...prev,
                        [sceneNumber]: {
                          ...(prev[sceneNumber] || {}),
                          [key]: value
                        }
                      }));
                    };

                    const saveAnimationDesc = async () => {
                      setIsSavingAnimationDesc(true);
                      try {
                        const user_id = localStorage.getItem('token');
                        const session_id = localStorage.getItem('session_id');
                        const scene_number = sceneNumber;

                        if (!user_id || !session_id) {
                          throw new Error('Missing user_id or session_id');
                        }

                        // Get current editable data
                        const animationDescData = editableData || {};

                        // First, fetch the complete user session data
                        const sessionDataResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ user_id, session_id })
                        });

                        const sessionDataText = await sessionDataResp.text();
                        let sessionData;
                        try {
                          sessionData = JSON.parse(sessionDataText);
                        } catch {
                          sessionData = sessionDataText;
                        }

                        if (!sessionDataResp.ok) {
                          throw new Error(`Failed to fetch session data: ${sessionDataResp.status} ${JSON.stringify(sessionData)}`);
                        }

                        // Extract the complete session and user objects from the response
                        const fullSessionData = sessionData?.session_data || sessionData?.session || {};
                        const fullUserData = sessionData?.user_data || sessionData?.user || {};

                        // Normalize session object: ensure session_id exists (convert id to session_id if needed)
                        let normalizedSession = {};
                        if (fullSessionData && Object.keys(fullSessionData).length > 0) {
                          normalizedSession = { ...fullSessionData };
                          // If session has 'id' but no 'session_id', use 'id' as 'session_id'
                          if (normalizedSession.id && !normalizedSession.session_id) {
                            normalizedSession.session_id = normalizedSession.id;
                            delete normalizedSession.id;
                          }
                          // Ensure session_id is set
                          if (!normalizedSession.session_id) {
                            normalizedSession.session_id = session_id;
                          }
                        } else {
                          // Fallback to minimal session object
                          normalizedSession = {
                            session_id: session_id,
                            user_id: user_id,
                            title: '',
                            video_duration: '60',
                            created_at: '',
                            updated_at: '',
                            document_summary: [],
                            messages: [],
                            total_summary: [],
                            scripts: [],
                            videos: [],
                            images: [],
                            final_link: {},
                            videoType: '',
                            brand_style_interpretation: {},
                            ...sessionAssets
                          };
                        }

                        const session = normalizedSession;

                        // Use the complete user object, or fallback to minimal if not available
                        const user = fullUserData && Object.keys(fullUserData).length > 0
                          ? fullUserData
                          : {
                            id: user_id,
                            email: '',
                            display_name: '',
                            created_at: '',
                            avatar_url: '',
                            folder_url: '',
                            brand_identity: {},
                            tone_and_voice: {},
                            look_and_feel: {},
                            templates: [],
                            voiceover: Array.isArray(brandAssets?.voiceover) ? brandAssets.voiceover : []
                          };

                        const payload = {
                          user,
                          session,
                          scene_number: Number(scene_number),
                          field_name: 'animation_desc',
                          new_value: animationDescData
                        };

                        const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-scene-field', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify(payload)
                        });

                        const text = await response.text();
                        let data;
                        try {
                          data = JSON.parse(text);
                        } catch {
                          data = text;
                        }

                        if (!response.ok) {
                          throw new Error(`Update failed: ${response.status} ${JSON.stringify(data)}`);
                        }

                        // Declare updatedAnimationDesc at function scope so it's accessible throughout
                        let updatedAnimationDesc = animationDescData; // Fallback to what we saved

                        // Fetch updated user session data to get the updated animation_desc
                        const updatedSessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ user_id, session_id })
                        });

                        const updatedSessionText = await updatedSessionResp.text();
                        let updatedSessionData;
                        try {
                          updatedSessionData = JSON.parse(updatedSessionText);
                        } catch {
                          updatedSessionData = updatedSessionText;
                        }

                        if (!updatedSessionResp.ok) {
                          console.warn('⚠️ Failed to fetch updated session data, using saved data:', updatedSessionResp.status);
                        } else {
                          // Extract updated animation_desc from the response
                          const updatedSession = updatedSessionData?.session_data || updatedSessionData?.session || {};
                          const updatedScripts = Array.isArray(updatedSession?.scripts) ? updatedSession.scripts : [];
                          const latestScript = updatedScripts[0] || {};
                          const updatedAiresponse = Array.isArray(latestScript?.airesponse) ? latestScript.airesponse : [];

                          // Find the scene with matching scene_number
                          for (const scene of updatedAiresponse) {
                            if (!scene || typeof scene !== 'object') continue;
                            const sceneNum = scene?.scene_number || scene?.scene_no || scene?.sceneNo || scene?.scene;
                            if (String(sceneNum) === String(scene_number)) {
                              updatedAnimationDesc = scene?.animation_desc || animationDescData;
                              break;
                            }
                          }

                          // Update local state with the updated animation_desc from API
                          setRows(prevRows => prevRows.map(row => {
                            const rowSceneNumber = row?.scene_number || row?.sceneNumber;
                            if (String(rowSceneNumber) === String(scene_number)) {
                              // Update animation_desc in the row
                              const updatedRow = { ...row, animation_desc: updatedAnimationDesc };

                              // Also update in imageVersionData - create it if it doesn't exist
                              if (updatedRow.imageVersionData) {
                                const versionKey = getLatestVersionKey(updatedRow.imageVersionData);
                                if (versionKey) {
                                  updatedRow.imageVersionData = {
                                    ...updatedRow.imageVersionData,
                                    [versionKey]: {
                                      ...(updatedRow.imageVersionData[versionKey] || {}),
                                      animation_desc: updatedAnimationDesc
                                    }
                                  };
                                } else {
                                  // If no version key found, create v1 with animation_desc
                                  updatedRow.imageVersionData = {
                                    ...updatedRow.imageVersionData,
                                    v1: {
                                      ...(updatedRow.imageVersionData.v1 || {}),
                                      animation_desc: updatedAnimationDesc
                                    }
                                  };
                                }
                              } else {
                                // Create imageVersionData if it doesn't exist
                                updatedRow.imageVersionData = {
                                  v1: {
                                    animation_desc: updatedAnimationDesc
                                  }
                                };
                              }

                              return updatedRow;
                            }
                            return row;
                          }));

                          // Also update selected if it matches
                          if (selected && (selected?.sceneNumber || selected?.scene_number) === scene_number) {
                            const updatedSelected = { ...selected, animation_desc: updatedAnimationDesc };

                            // Also update in imageVersionData - create it if it doesn't exist
                            if (updatedSelected.imageVersionData) {
                              const versionKey = getLatestVersionKey(updatedSelected.imageVersionData);
                              if (versionKey) {
                                updatedSelected.imageVersionData = {
                                  ...updatedSelected.imageVersionData,
                                  [versionKey]: {
                                    ...(updatedSelected.imageVersionData[versionKey] || {}),
                                    animation_desc: updatedAnimationDesc
                                  }
                                };
                              } else {
                                // If no version key found, create v1 with animation_desc
                                updatedSelected.imageVersionData = {
                                  ...updatedSelected.imageVersionData,
                                  v1: {
                                    ...(updatedSelected.imageVersionData.v1 || {}),
                                    animation_desc: updatedAnimationDesc
                                  }
                                };
                              }
                            } else {
                              // Create imageVersionData if it doesn't exist
                              updatedSelected.imageVersionData = {
                                v1: {
                                  animation_desc: updatedAnimationDesc
                                }
                              };
                            }

                            setSelected(updatedSelected);
                          }

                          // Update scene options with the updated data
                          updateSceneOption('customPreservationNotes', updatedAnimationDesc);
                        }

                        // Refresh the data to ensure everything is in sync
                        await refreshLoad(scene_number);

                        // After refreshLoad, ensure the updated animation_desc is preserved in the rows
                        // because refreshLoad might reload from API and animation_desc might not be in images structure
                        // Always use the updatedAnimationDesc we got from the API, don't check if it's empty
                        setRows(prevRows => prevRows.map(row => {
                          const rowSceneNumber = row?.scene_number || row?.sceneNumber;
                          if (String(rowSceneNumber) === String(scene_number)) {
                            // Always set animation_desc to the updated value from API
                            const updatedRow = { ...row, animation_desc: updatedAnimationDesc };

                            // Also ensure it's in imageVersionData structure - create if needed
                            if (updatedRow.imageVersionData) {
                              const versionKey = getLatestVersionKey(updatedRow.imageVersionData);
                              const targetVersion = versionKey || 'v1';
                              updatedRow.imageVersionData = {
                                ...updatedRow.imageVersionData,
                                [targetVersion]: {
                                  ...(updatedRow.imageVersionData[targetVersion] || {}),
                                  animation_desc: updatedAnimationDesc
                                }
                              };
                            } else {
                              // Create imageVersionData if it doesn't exist
                              updatedRow.imageVersionData = {
                                v1: {
                                  animation_desc: updatedAnimationDesc
                                }
                              };
                            }

                            return updatedRow;
                          }
                          return row;
                        }));

                        // Also update selected if it matches
                        if (selected && (selected?.sceneNumber || selected?.scene_number) === scene_number) {
                          // Always set animation_desc to the updated value from API
                          const updatedSelected = { ...selected, animation_desc: updatedAnimationDesc };

                          // Also ensure it's in imageVersionData structure - create if needed
                          if (updatedSelected.imageVersionData) {
                            const versionKey = getLatestVersionKey(updatedSelected.imageVersionData);
                            const targetVersion = versionKey || 'v1';
                            updatedSelected.imageVersionData = {
                              ...updatedSelected.imageVersionData,
                              [targetVersion]: {
                                ...(updatedSelected.imageVersionData[targetVersion] || {}),
                                animation_desc: updatedAnimationDesc
                              }
                            };
                          } else {
                            // Create imageVersionData if it doesn't exist
                            updatedSelected.imageVersionData = {
                              v1: {
                                animation_desc: updatedAnimationDesc
                              }
                            };
                          }

                          setSelected(updatedSelected);
                        }

                        // Exit edit mode
                        setIsEditingAnimationDesc(prev => {
                          const updated = { ...prev };
                          delete updated[scene_number];
                          return updated;
                        });
                        setEditableAnimationDesc(prev => {
                          const updated = { ...prev };
                          delete updated[scene_number];
                          return updated;
                        });

                        setError('');
                      } catch (error) {
                        setError('Failed to save animation description: ' + (error?.message || 'Unknown error'));
                        console.error('Error saving animation description:', error);
                      } finally {
                        setIsSavingAnimationDesc(false);
                      }
                    };

                    return (
                      <div className="bg-[#F5F7FF] rounded-lg p-4 border border-[#D8DFFF] relative w-full">
                        <h4 className="text-sm font-semibold text-gray-800 mb-3">Transitions</h4>
                        <div className="space-y-3">
                          <div className="border border-[#D8DFFF] rounded-lg p-3 bg-[#F5F7FF] relative">
                            {/* Loading Overlay - Shows until update-scene-field API completes */}
                            {isSavingAnimationDesc && (
                              <div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-white/95 backdrop-blur-sm rounded-lg pointer-events-auto">
                                <Loader
                                  videoSize="w-16 h-16"
                                  title="Saving Animation Description"
                                  description="Please wait while we save your changes..."
                                  containerClass="!max-w-xs !p-4"
                                  progress={savingAnimationDescProgress > 0 ? savingAnimationDescProgress : null}
                                />
                              </div>
                            )}
                            <div className="mb-3 flex items-center justify-between">
                              <span className="text-sm font-semibold text-[#13008B]">Design Your Own</span>
                              {isEditing ? (
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={cancelEditingAnimationDesc}
                                    disabled={isSavingAnimationDesc}
                                    className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    type="button"
                                    onClick={saveAnimationDesc}
                                    disabled={isSavingAnimationDesc}
                                    className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-xs hover:bg-[#0f0069] disabled:opacity-50 disabled:cursor-not-allowed"
                                  >
                                    {isSavingAnimationDesc ? 'Saving...' : 'Save'}
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={startEditingAnimationDesc}
                                  className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-1"
                                >
                                  <Pencil className="w-3 h-3" />
                                  Edit
                                </button>
                              )}
                            </div>
                            {(() => {
                              // Get animation_desc from the scene data (from images object)
                              const currentRow = rows.find((r) => (r?.scene_number || r?.sceneNumber) === sceneNumber);

                              // Try to get animation_desc from imageVersionData structure
                              let animationDesc = {};
                              if (currentRow?.imageVersionData) {
                                const imageVersionData = currentRow.imageVersionData;
                                const versionKey = getLatestVersionKey(imageVersionData);
                                const verObj = imageVersionData[versionKey] || {};
                                animationDesc = verObj?.animation_desc || {};
                              }

                              // Also check selected object
                              if (Object.keys(animationDesc).length === 0 && selected?.imageVersionData) {
                                const imageVersionData = selected.imageVersionData;
                                const versionKey = getLatestVersionKey(imageVersionData);
                                const verObj = imageVersionData[versionKey] || {};
                                animationDesc = verObj?.animation_desc || {};
                              }

                              // Fallback to row or selected directly
                              if (Object.keys(animationDesc).length === 0) {
                                animationDesc = currentRow?.animation_desc || selected?.animation_desc || {};
                              }

                              // Check if animation_desc has actual content (not just empty strings)
                              const hasAnimationDescContent = animationDesc && typeof animationDesc === 'object' &&
                                Object.keys(animationDesc).length > 0 &&
                                Object.values(animationDesc).some(v => v && String(v).trim().length > 0);

                              // Use animation_desc if it has content, otherwise use customPreservationNotes
                              // But if we're editing, always use editableData
                              const displayNotes = isEditing
                                ? editableData
                                : (hasAnimationDescContent ? animationDesc : (sceneOptions.customPreservationNotes || {}));

                              return (
                                <div className="grid grid-cols-2 gap-3">
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">Subject Description</label>
                                    {isEditing ? (
                                      <textarea
                                        value={displayNotes?.subject_description || ''}
                                        onChange={(e) => {
                                          updateEditableAnimationDesc('subject_description', e.target.value);
                                        }}
                                        placeholder="e.g., Two complete graphic compositions with all geometric shapes, colors, and layout elements"
                                        className="w-full h-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none bg-white"
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        value={truncateText(displayNotes?.subject_description || '', 4)}
                                        disabled
                                        className="w-full h-10 border rounded-lg px-3 py-2 text-sm bg-white text-gray-700 cursor-default"
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">Scene Description</label>
                                    {isEditing ? (
                                      <textarea
                                        value={displayNotes?.scene_description || ''}
                                        onChange={(e) => {
                                          updateEditableAnimationDesc('scene_description', e.target.value);
                                        }}
                                        placeholder="e.g., Flat graphic layouts displayed in sequence"
                                        className="w-full h-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none bg-white"
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        value={truncateText(displayNotes?.scene_description || '', 4)}
                                        disabled
                                        className="w-full h-10 border rounded-lg px-3 py-2 text-sm bg-white text-gray-700 cursor-default"
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">Action Specification</label>
                                    {isEditing ? (
                                      <textarea
                                        value={displayNotes?.action_specification || ''}
                                        onChange={(e) => {
                                          updateEditableAnimationDesc('action_specification', e.target.value);
                                        }}
                                        placeholder="e.g., Instant cut transition between static compositions"
                                        className="w-full h-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none bg-white"
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        value={truncateText(displayNotes?.action_specification || '', 4)}
                                        disabled
                                        className="w-full h-10 border rounded-lg px-3 py-2 text-sm bg-white text-gray-700 cursor-default"
                                      />
                                    )}
                                  </div>
                                  <div>
                                    <label className="text-sm font-medium text-gray-700 mb-1 block">Content Modification</label>
                                    {isEditing ? (
                                      <textarea
                                        value={displayNotes?.content_modification || ''}
                                        onChange={(e) => {
                                          updateEditableAnimationDesc('content_modification', e.target.value);
                                        }}
                                        placeholder="e.g., No morphing or content generation - pure camera movement and instant cut only"
                                        className="w-full h-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none bg-white"
                                      />
                                    ) : (
                                      <input
                                        type="text"
                                        value={truncateText(displayNotes?.content_modification || '', 4)}
                                        disabled
                                        className="w-full h-10 border rounded-lg px-3 py-2 text-sm bg-white text-gray-700 cursor-default"
                                      />
                                    )}
                                  </div>
                                </div>
                              );
                            })()}

                            <div className="mt-4 border-t border-gray-200 pt-3 space-y-2">
                              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={sceneOptions.rememberCustomPreset || false}
                                  onChange={(e) => updateSceneOption('rememberCustomPreset', e.target.checked)}
                                  className="w-4 h-4 text-[#13008B]"
                                />
                                <span>Save this preset</span>
                              </label>
                              {sceneOptions.rememberCustomPreset && (
                                <div className="mt-1">
                                  <label className="text-xs font-medium text-gray-700 mb-1 block">Preset Name</label>
                                  <input
                                    type="text"
                                    value={sceneOptions.customPresetName || ''}
                                    onChange={(e) => updateSceneOption('customPresetName', e.target.value)}
                                    placeholder="Enter a name for this preset"
                                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B]"
                                  />
                                </div>
                              )}
                            </div>
                            <div className="mt-4 border-t border-gray-200 pt-3">
                              <div className="flex items-center justify-between mb-1">
                                <label className="text-sm font-medium text-gray-700">Narration</label>
                                {editingField === 'narration' ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      onClick={() => {
                                        setEditingField(null);
                                        setEditedNarration('');
                                      }}
                                      disabled={isSavingField}
                                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={handleSaveNarration}
                                      disabled={isSavingField}
                                      className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-xs hover:bg-[#0F0069] disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      {isSavingField ? 'Saving...' : 'Save'}
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingField('narration');
                                      setEditedNarration(selected?.narration || '');
                                    }}
                                    className="text-xs text-[#13008B] hover:text-[#0F0069] font-medium flex items-center gap-1"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    Edit
                                  </button>
                                )}
                              </div>
                              {editingField === 'narration' ? (
                                <textarea
                                  className="w-full h-24 border border-[#D8DFFF] rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#13008B]"
                                  value={editedNarration}
                                  onChange={(e) => setEditedNarration(e.target.value)}
                                />
                              ) : (
                                <input
                                  type="text"
                                  className="w-full border border-[#D8DFFF] bg-white rounded-lg px-3 py-2 text-sm text-gray-700"
                                  readOnly
                                  value={truncateText(selected?.narration || '', 12)}
                                />
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  }

                  // For non-VEO3, non-SORA/PLOTLY/ANCHOR models, show new formatted description UI
                  const sceneDescription = selected?.description || '';
                  const currentSceneIndex = selected?.index ?? 0;
                  const isInlineEditing = isDescriptionEditing && descriptionSceneIndex === currentSceneIndex;

                  const startInlineEditing = () => {
                    const sections = parseDescription(sceneDescription);
                    setEditableSections(sections.length > 0 ? sections : [{ type: 'text', content: sceneDescription }]);
                    setIsDescriptionEditing(true);
                    setDescriptionSceneIndex(currentSceneIndex);
                  };

                  const cancelInlineEditing = () => {
                    setIsDescriptionEditing(false);
                    setDescriptionSceneIndex(null);
                    setEditableSections([]);
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

                  const saveInlineDescription = async () => {
                    setIsSavingDescription(true);
                    try {
                      const sceneNumber = selected?.sceneNumber || selected?.scene_number || 1;
                      const modelUpper = String(selected?.model || selected?.mode || '').toUpperCase();
                      // Merge sections back into description format (keeps ** marks)
                      const nextDescription = mergeDescriptionSections(editableSections);

                      // Update local state first
                      setSelected(prev => ({ ...prev, description: nextDescription }));
                      setRows(prevRows => prevRows.map(row => {
                        const rowSceneNumber = row?.scene_number || row?.sceneNumber;
                        if (String(rowSceneNumber) === String(sceneNumber)) {
                          return { ...row, description: nextDescription };
                        }
                        return row;
                      }));

                      // Call update-text API
                      try {
                        const sessionId = localStorage.getItem('session_id');
                        const token = localStorage.getItem('token');
                        if (!sessionId || !token) throw new Error('Missing session_id or token');

                        // Load session snapshot
                        const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
                        });
                        const sessText = await sessionResp.text();
                        let sessJson; try { sessJson = JSON.parse(sessText); } catch (_) { sessJson = {}; }
                        if (!sessionResp.ok) throw new Error(`user-session/data failed: ${sessionResp.status} ${sessText}`);
                        const rawSession = sessJson?.session_data || sessJson?.session || {};
                        const sessionForBody = { ...rawSession, session_id: sessionId, user_id: token };
                        const rawUser = sessJson?.user_data || rawSession?.user_data || rawSession?.user || {};
                        const user = { ...rawUser, id: token, user_id: token };

                        const scriptsSource = Array.isArray(sessionForBody?.scripts) ? sessionForBody.scripts : [];
                        const primaryScript = scriptsSource[0] || {};
                        const originalUserquery = Array.isArray(primaryScript?.userquery) ? primaryScript.userquery : [];
                        const scriptVersion = primaryScript?.version || sessionForBody?.version || 'v1';
                        const airesponseSource = Array.isArray(primaryScript?.airesponse)
                          ? primaryScript.airesponse.map((item) => (item && typeof item === 'object' ? { ...item } : item))
                          : [];

                        // Update the specific scene's description
                        const airesponse = airesponseSource.map((scene, idx) => {
                          if (!scene || typeof scene !== 'object') return scene;
                          const sceneNumberInArray =
                            scene?.scene_number ??
                            scene?.scene_no ??
                            scene?.sceneNo ??
                            scene?.scene ??
                            (idx + 1);
                          if (Number(sceneNumberInArray) === Number(sceneNumber)) {
                            return { ...scene, desc: nextDescription, description: nextDescription };
                          }
                          return { ...scene };
                        });

                        const requestBody = {
                          user,
                          session: sessionForBody,
                          changed_script: {
                            userquery: originalUserquery,
                            airesponse: airesponse,
                            version: String(scriptVersion || 'v1')
                          }
                        };

                        const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-text', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody)
                        });
                        const txt = await resp.text(); let data; try { data = JSON.parse(txt); } catch (_) { data = txt; }
                        if (!resp.ok || resp.status !== 200) throw new Error(`scripts/update-text failed: ${resp.status} ${txt}`);

                        // Refresh the data
                        await refreshLoad(sceneNumber);
                      } catch (err) {
                        console.warn('update-text description failed:', err);
                        alert('Failed to save description. Please try again.');
                      }

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

                  return (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 relative w-full">
                      {/* Loading Overlay */}
                      {isSavingDescription && (
                        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm rounded-lg">
                          <Loader
                            videoSize="w-16 h-16"
                            title="Updating Description"
                            description="Please wait..."
                            containerClass="!max-w-xs !p-4"
                            progress={savingDescriptionProgress > 0 ? savingDescriptionProgress : null}
                          />
                        </div>
                      )}
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-gray-800">Description</h4>
                        {isInlineEditing ? (
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              onClick={cancelInlineEditing}
                              disabled={isSavingDescription}
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={saveInlineDescription}
                              disabled={isSavingDescription}
                              className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-xs hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                          <button
                            type="button"
                            onClick={startInlineEditing}
                            className="text-xs text-[#13008B] hover:text-[#0F0069] font-medium flex items-center gap-1"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                              <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                            </svg>
                            Edit
                          </button>
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
                          className={`w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 min-h-[100px] cursor-pointer ${isSavingDescription ? 'opacity-60' : ''}`}
                        >
                          {sceneDescription ? (
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">
                              {truncateText(sceneDescription)}
                            </p>
                          ) : (
                            <p className="text-sm text-gray-400 italic">Double-click to add description</p>
                          )}
                        </div>
                      )}
                      <div className="mt-4 border rounded-lg px-3 py-2 bg-white">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-xs font-medium text-gray-600">Narration</label>
                          {editingField === 'narration' ? (
                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingField(null);
                                  setEditedNarration('');
                                }}
                                disabled={isSavingField}
                                className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Cancel
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveNarration}
                                disabled={isSavingField}
                                className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-xs hover:bg-[#0F0069] disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                {isSavingField ? 'Saving...' : 'Save'}
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setEditingField('narration');
                                setEditedNarration(selected?.narration || '');
                              }}
                              className="text-xs text-[#13008B] hover:text-[#0F0069] font-medium flex items-center gap-1"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                              </svg>
                              Edit
                            </button>
                          )}
                        </div>
                        {editingField === 'narration' ? (
                          <textarea
                            className="w-full h-24 border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#13008B]"
                            value={editedNarration}
                            onChange={(e) => setEditedNarration(e.target.value)}
                          />
                        ) : (
                          <input
                            type="text"
                            className="w-full border border-gray-200 bg-white rounded-lg px-3 py-2 text-sm text-gray-700"
                            readOnly
                            value={truncateText(selected?.narration || '', 16)}
                          />
                        )}
                      </div>
                    </div>
                  );
                })()}
              </div>

            </div>
            {(() => {
              const modelUpper = String(selected?.model || '').toUpperCase();
              const isVEO3 = modelUpper === 'VEO3';
              const isSoraPlotlyAnchor = modelUpper === 'SORA' || modelUpper === 'PLOTLY' || modelUpper === 'ANCHOR';
              const sceneNumber = selected?.sceneNumber || selected?.scene_number || 1;

              const sceneOptions = sceneAdvancedOptions[sceneNumber] || {
                logoNeeded: false,
                voiceUrl: '',
                voiceOption: PRESET_VOICE_OPTIONS.male[0]?.key || 'american_male', // Default to first male voice key
                transitionPreset: null,
                transitionCustom: null,
                customDescription: '',
                customPreservationNotes: {
                  lighting: '',
                  style_mood: '',
                  transition_type: '',
                  scene_description: '',
                  subject_description: '',
                  action_specification: '',
                  content_modification: '',
                  camera_specifications: '',
                  geometric_preservation: ''
                },
                subtitleSceneOnly: false,
                rememberCustomPreset: false,
                customPresetName: ''
              };

              // Get logo from brand_identity.logo[0] from brand assets
              const brandIdentityLogo = brandAssets?.brand_identity?.logo?.[0]
                || brandAssets?.brandIdentity?.logo?.[0]
                || brandAssets?.brand_identity?.logo?.[0]?.url
                || brandAssets?.brand_identity?.logo?.[0]?.link
                || '';
              const hasLogoAsset = !!brandIdentityLogo;
              const hasVoiceAssets = Object.keys(sessionAssets.voice_urls || {}).length > 0;

              const customNotes = sceneOptions.customPreservationNotes || {};
              const hasCustomDesignInput =
                (sceneOptions.customDescription || '').trim().length > 0 ||
                Object.values(customNotes).some(v => (v || '').trim().length > 0);

              const isCustomPresetMode = !!sceneOptions.rememberCustomPreset;

              const toggleAdvancedOptions = (section) => {
                setShowAdvancedOptions(prev => ({
                  ...prev,
                  [sceneNumber]: {
                    ...prev[sceneNumber],
                    [section]: !prev[sceneNumber]?.[section]
                  }
                }));
              };

              const updateSceneOption = (key, value) => {
                setSceneAdvancedOptions(prev => ({
                  ...prev,
                  [sceneNumber]: {
                    ...prev[sceneNumber],
                    [key]: value
                  }
                }));
              };

              const isAssetsOpen = showAdvancedOptions[sceneNumber]?.assets || false;
              const isTransitionsOpen = showAdvancedOptions[sceneNumber]?.transitions || false;
              const isTransitionAdvancedOpen = showAdvancedOptions[sceneNumber]?.transitionAdvanced || false;

              return (
                <div className="mt-4 space-y-3">
                  {/* Main Advanced Options Accordion */}
                  <div>
                    <button
                      type="button"
                      onClick={() => toggleAdvancedOptions('main')}
                      className="flex w-full items-center justify-between rounded-lg border border-[#D8D3FF] bg-white px-4 py-3 text-sm font-semibold text-[#13008B] shadow-sm transition hover:bg-[#F6F4FF]"
                    >
                      <span>Advanced Options</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedOptions[sceneNumber]?.main ? 'rotate-180' : ''}`} />
                    </button>

                    {showAdvancedOptions[sceneNumber]?.main && (
                      <div className="mt-3 space-y-3">
                        {/* Description Section - Only for SORA, PLOTLY, and ANCHOR */}
                        {(() => {
                          const modelUpper = String(selected?.model || '').toUpperCase();
                          const isSoraPlotlyAnchor = modelUpper === 'SORA' || modelUpper === 'PLOTLY' || modelUpper === 'ANCHOR';

                          if (!isSoraPlotlyAnchor) return null;

                          const sceneDescription = selected?.description || '';
                          const currentSceneIndex = selected?.index ?? 0;
                          const isInlineEditing = isDescriptionEditing && descriptionSceneIndex === currentSceneIndex;

                          const startInlineEditing = () => {
                            const sections = parseDescription(sceneDescription);
                            setEditableSections(sections.length > 0 ? sections : [{ type: 'text', content: sceneDescription }]);
                            setIsDescriptionEditing(true);
                            setDescriptionSceneIndex(currentSceneIndex);
                          };

                          const cancelInlineEditing = () => {
                            setIsDescriptionEditing(false);
                            setDescriptionSceneIndex(null);
                            setEditableSections([]);
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

                          const saveInlineDescription = async () => {
                            setIsSavingDescription(true);
                            try {
                              const sceneNumber = selected?.sceneNumber || selected?.scene_number || 1;
                              const modelUpper = String(selected?.model || selected?.mode || '').toUpperCase();
                              const nextDescription = mergeDescriptionSections(editableSections);

                              setSelected(prev => ({ ...prev, description: nextDescription }));
                              setRows(prevRows => prevRows.map(row => {
                                const rowSceneNumber = row?.scene_number || row?.sceneNumber;
                                if (String(rowSceneNumber) === String(sceneNumber)) {
                                  return { ...row, description: nextDescription };
                                }
                                return row;
                              }));

                              try {
                                const sessionId = localStorage.getItem('session_id');
                                const token = localStorage.getItem('token');
                                if (!sessionId || !token) throw new Error('Missing session_id or token');

                                const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
                                });
                                const sessText = await sessionResp.text();
                                let sessJson; try { sessJson = JSON.parse(sessText); } catch (_) { sessJson = {}; }
                                if (!sessionResp.ok) throw new Error(`user-session/data failed: ${sessionResp.status} ${sessText}`);
                                const rawSession = sessJson?.session_data || sessJson?.session || {};
                                const sessionForBody = { ...rawSession, session_id: sessionId, user_id: token };
                                const rawUser = sessJson?.user_data || rawSession?.user_data || rawSession?.user || {};
                                const user = { ...rawUser, id: token, user_id: token };

                                const scriptsSource = Array.isArray(sessionForBody?.scripts) ? sessionForBody.scripts : [];
                                const primaryScript = scriptsSource[0] || {};
                                const originalUserquery = Array.isArray(primaryScript?.userquery) ? primaryScript.userquery : [];
                                const scriptVersion = primaryScript?.version || sessionForBody?.version || 'v1';
                                const airesponseSource = Array.isArray(primaryScript?.airesponse)
                                  ? primaryScript.airesponse.map((item) => (item && typeof item === 'object' ? { ...item } : item))
                                  : [];

                                const airesponse = airesponseSource.map((scene, idx) => {
                                  if (!scene || typeof scene !== 'object') return scene;
                                  const sceneNumberInArray =
                                    scene?.scene_number ??
                                    scene?.scene_no ??
                                    scene?.sceneNo ??
                                    scene?.scene ??
                                    (idx + 1);
                                  if (Number(sceneNumberInArray) === Number(sceneNumber)) {
                                    return { ...scene, desc: nextDescription, description: nextDescription };
                                  }
                                  return { ...scene };
                                });

                                const requestBody = {
                                  user,
                                  session: sessionForBody,
                                  changed_script: {
                                    userquery: originalUserquery,
                                    airesponse: airesponse,
                                    version: String(scriptVersion || 'v1')
                                  }
                                };

                                const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-text', {
                                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody)
                                });
                                const txt = await resp.text(); let data; try { data = JSON.parse(txt); } catch (_) { data = txt; }
                                if (!resp.ok || resp.status !== 200) throw new Error(`scripts/update-text failed: ${resp.status} ${txt}`);

                                await refreshLoad(sceneNumber);
                              } catch (err) {
                                console.warn('update-text description failed:', err);
                                alert('Failed to save description. Please try again.');
                              }

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

                          return (
                            <div className="border rounded-lg p-4 bg-white">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-gray-800">Description</h4>
                                {isInlineEditing ? (
                                  <div className="flex items-center gap-2">
                                    <button
                                      type="button"
                                      className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                      onClick={cancelInlineEditing}
                                      disabled={isSavingDescription}
                                    >
                                      Cancel
                                    </button>
                                    <button
                                      type="button"
                                      onClick={saveInlineDescription}
                                      disabled={isSavingDescription}
                                      className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-xs hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
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
                                  <button
                                    type="button"
                                    onClick={startInlineEditing}
                                    className="text-xs text-[#13008B] hover:text-[#0F0069] font-medium flex items-center gap-1"
                                  >
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                                    </svg>
                                    Edit
                                  </button>
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
                                  className={`w-full px-3 py-2 rounded-lg border border-gray-200 bg-white text-gray-600 min-h-[100px] cursor-pointer ${isSavingDescription ? 'opacity-60' : ''}`}
                                >
                                  {sceneDescription ? (
                                    <p className="text-sm text-gray-600 whitespace-pre-wrap">
                                      {truncateText(sceneDescription)}
                                    </p>
                                  ) : (
                                    <p className="text-sm text-gray-400 italic">Double-click to add description</p>
                                  )}
                                </div>
                              )}
                            </div>
                          );
                        })()}

                        {/* Logo and Voiceover Section */}
                        <div className="border rounded-lg p-4 bg-white">
                          <button
                            type="button"
                            onClick={() => toggleAdvancedOptions('assets')}
                            className="flex w-full items-center justify-between text-base font-medium text-gray-800 mb-2"
                          >
                            <span>Logo & Voiceover</span>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isAssetsOpen ? 'rotate-180' : ''}`} />
                          </button>

                          {isAssetsOpen && (
                            <div className="space-y-4 mt-3">
                              {/* Logo Needed Radio */}
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Logo Needed</label>
                                <div className="flex gap-4">
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`logo-${sceneNumber}`}
                                      checked={sceneOptions.logoNeeded === true}
                                      onChange={() => updateSceneOption('logoNeeded', true)}
                                      className="w-4 h-4 text-[#13008B]"
                                    />
                                    <span className="text-sm text-gray-700">Yes</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`logo-${sceneNumber}`}
                                      checked={sceneOptions.logoNeeded === false}
                                      onChange={() => updateSceneOption('logoNeeded', false)}
                                      className="w-4 h-4 text-[#13008B]"
                                    />
                                    <span className="text-sm text-gray-700">No</span>
                                  </label>
                                </div>
                                {sceneOptions.logoNeeded && (() => {
                                  // Get logo from brand_identity.logo[0] from brand assets
                                  const brandIdentityLogo = brandAssets?.brand_identity?.logo?.[0]
                                    || brandAssets?.brandIdentity?.logo?.[0]
                                    || brandAssets?.brand_identity?.logo?.[0]?.url
                                    || brandAssets?.brand_identity?.logo?.[0]?.link
                                    || '';

                                  const logoUrl = brandIdentityLogo || '';

                                  if (logoUrl) {
                                    return (
                                      <div className="mt-2">
                                        <img
                                          src={logoUrl}
                                          alt="Logo preview"
                                          style={{ width: '200px', height: '100px', objectFit: 'contain' }}
                                          className="border border-gray-300 rounded"
                                        />
                                      </div>
                                    );
                                  }
                                  return null;
                                })()}
                              </div>

                              {/* Voice URL Selection */}
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <label className="text-sm font-medium text-gray-700">Voice URL</label>
                                  {sceneOptions.voiceUrl && (
                                    <button
                                      type="button"
                                      onClick={() => {
                                        updateSceneOption('voiceUrl', '');
                                        updateSceneOption('voiceOption', '');
                                      }}
                                      className="text-xs text-red-600 hover:text-red-700 underline"
                                      title="Clear Voice URL to enable Voice Option"
                                    >
                                      Clear
                                    </button>
                                  )}
                                </div>
                                <div className="space-y-2">
                                  {(() => {
                                    // Get all voiceovers from brand assets
                                    const brandVoiceovers = [];

                                    if (brandAssets && Array.isArray(brandAssets.voiceover)) {
                                      brandVoiceovers.push(...brandAssets.voiceover);
                                    } else if (brandAssets && Array.isArray(brandAssets.voiceovers)) {
                                      brandVoiceovers.push(...brandAssets.voiceovers);
                                    }

                                    // Normalize URL for comparison
                                    const normalizeUrl = (url) => {
                                      if (!url || typeof url !== 'string') return '';
                                      try {
                                        const u = new URL(url);
                                        return u.origin + u.pathname;
                                      } catch {
                                        return url.trim().split('?')[0].replace(/\/$/, '');
                                      }
                                    };

                                    // Get session voice_url to match with brand voiceovers
                                    // Priority: 1) session_voice_link from additonalprop1, 2) sessionAssets.voice_url
                                    let sessionVoiceUrl = null;
                                    try {
                                      const sessionVoiceLink = localStorage.getItem('session_voice_link');
                                      if (sessionVoiceLink) {
                                        sessionVoiceUrl = sessionVoiceLink;
                                      }
                                    } catch (_) { }

                                    if (!sessionVoiceUrl) {
                                      sessionVoiceUrl = sessionAssets.voice_url || (sessionAssets.voice_urls && Object.values(sessionAssets.voice_urls)[0]);
                                    }

                                    const normalizedSessionVoice = sessionVoiceUrl ? normalizeUrl(sessionVoiceUrl) : '';

                                    // Find voiceover that matches session voice_url or session_voice_link
                                    let matchedBrandVoiceover = null;
                                    if (normalizedSessionVoice && brandVoiceovers.length > 0) {
                                      matchedBrandVoiceover = brandVoiceovers.find(vo => {
                                        if (!vo || typeof vo !== 'object') return false;
                                        const voUrl = vo.url || vo.link || '';
                                        if (!voUrl) return false;
                                        const normalizedVoUrl = normalizeUrl(voUrl);
                                        return normalizedVoUrl === normalizedSessionVoice || voUrl === sessionVoiceUrl;
                                      });
                                    }

                                    // Filter voiceovers that match the tone
                                    const matchingVoiceovers = [];

                                    if (scriptTone && brandVoiceovers.length > 0) {
                                      const tone = String(scriptTone || '').toLowerCase().trim();
                                      brandVoiceovers.forEach(vo => {
                                        if (!vo || typeof vo !== 'object') return;
                                        const voType = String(vo.type || '').toLowerCase().trim();

                                        // Match tone exactly (e.g., "professional" tone shows only "professional" type voices)
                                        if (voType === tone) {
                                          matchingVoiceovers.push(vo);
                                        }
                                      });
                                    } else if (!scriptTone && brandVoiceovers.length > 0) {
                                      // If no scriptTone, show all brand voiceovers
                                      matchingVoiceovers.push(...brandVoiceovers);
                                    }

                                    const hasSessionVoices = Object.keys(sessionAssets.voice_urls || {}).length > 0;
                                    const hasMatchingVoices = matchingVoiceovers.length > 0;
                                    const sessionVoicesCount = hasSessionVoices ? Object.keys(sessionAssets.voice_urls).length : 0;

                                    return (
                                      <>
                                        {/* Circular Button Style Voiceover Selection */}
                                        <div className="flex flex-wrap gap-4">
                                          {/* Brand Asset Voiceovers (filtered by tone) */}
                                          {matchingVoiceovers.map((vo, idx) => {
                                            const voUrl = vo.url || vo.link || '';
                                            const currentVoiceUrl = sceneOptions.voiceUrl || '';

                                            // Also check session_voice_link for auto-selection
                                            let sessionVoiceLink = '';
                                            try {
                                              sessionVoiceLink = localStorage.getItem('session_voice_link') || '';
                                            } catch (_) { }

                                            const normalizedVoUrl = voUrl ? normalizeUrl(voUrl) : '';
                                            const normalizedCurrentUrl = currentVoiceUrl ? normalizeUrl(currentVoiceUrl) : '';
                                            const normalizedSessionVoiceLink = sessionVoiceLink ? normalizeUrl(sessionVoiceLink) : '';

                                            // Voice is selected if it matches currentVoiceUrl OR session_voice_link
                                            const isSelected = voUrl && (
                                              (currentVoiceUrl && (normalizedVoUrl === normalizedCurrentUrl || voUrl === currentVoiceUrl)) ||
                                              (sessionVoiceLink && (normalizedVoUrl === normalizedSessionVoiceLink || voUrl === sessionVoiceLink))
                                            );

                                            return (
                                              <div key={`brand-match-${idx}`} className="flex flex-col items-center">
                                                <button
                                                  type="button"
                                                  onClick={() => {
                                                    updateSceneOption('voiceUrl', voUrl);
                                                    updateSceneOption('voiceOption', vo.name || vo.type || 'custom');
                                                  }}
                                                  className={`w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all ${isSelected
                                                    ? 'bg-[#4A90E2] text-white border-4 border-[#4A90E2] shadow-lg scale-105'
                                                    : 'bg-white text-[#4A90E2] border-2 border-[#4A90E2] hover:bg-blue-50 hover:scale-105'
                                                    }`}
                                                  title={`${vo.name || 'Unnamed'} (Brand Asset - ${vo.type})`}
                                                >
                                                  {/* Microphone Icon */}
                                                  <svg
                                                    width="24"
                                                    height="24"
                                                    viewBox="0 0 24 24"
                                                    fill="none"
                                                    stroke="currentColor"
                                                    strokeWidth="2"
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                  >
                                                    <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                                    <line x1="12" y1="19" x2="12" y2="22" />
                                                    <line x1="8" y1="22" x2="16" y2="22" />
                                                  </svg>
                                                </button>
                                                <span className="text-xs text-gray-700 mt-1.5 text-center font-medium">
                                                  {vo.name || vo.type}
                                                </span>
                                              </div>
                                            );
                                          })}

                                          {/* Session Asset Voiceovers */}
                                          {hasSessionVoices && (
                                            <>
                                              {Object.entries(sessionAssets.voice_urls).map(([key, url]) => (
                                                <div key={key} className="flex flex-col items-center">
                                                  <button
                                                    type="button"
                                                    onClick={() => {
                                                      updateSceneOption('voiceUrl', url);
                                                      updateSceneOption('voiceOption', key);
                                                    }}
                                                    className={`w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all ${sceneOptions.voiceUrl === url
                                                      ? 'bg-[#4A90E2] text-white border-4 border-[#4A90E2] shadow-lg scale-105'
                                                      : 'bg-white text-[#4A90E2] border-2 border-[#4A90E2] hover:bg-blue-50 hover:scale-105'
                                                      }`}
                                                    title={`${key} (Session Asset)`}
                                                  >
                                                    {/* Microphone Icon */}
                                                    <svg
                                                      width="24"
                                                      height="24"
                                                      viewBox="0 0 24 24"
                                                      fill="none"
                                                      stroke="currentColor"
                                                      strokeWidth="2"
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                    >
                                                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
                                                      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                                                      <line x1="12" y1="19" x2="12" y2="22" />
                                                      <line x1="8" y1="22" x2="16" y2="22" />
                                                    </svg>
                                                  </button>
                                                  <span className="text-xs text-gray-700 mt-1.5 text-center font-medium">
                                                    {key}
                                                  </span>
                                                </div>
                                              ))}
                                            </>
                                          )}
                                        </div>


                                        {/* Info message if no voiceovers available */}
                                        {!hasMatchingVoices && !hasSessionVoices && (
                                          <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
                                            <p className="text-xs text-amber-800">
                                              {scriptTone
                                                ? `⚠️ No voiceovers found matching tone "${scriptTone}"`
                                                : '⚠️ No voiceovers available'}
                                            </p>
                                          </div>
                                        )}
                                      </>
                                    );
                                  })()}
                                </div>
                              </div>

                              {/* Voice Option - Preset Voices */}
                              <div>
                                <label className={`text-sm font-medium mb-2 block ${sceneOptions.voiceUrl ? 'text-gray-400' : 'text-gray-700'
                                  }`}>
                                  Voice Option
                                  {sceneOptions.voiceUrl && (
                                    <span className="ml-2 text-xs text-gray-500">(Disabled when Voice URL is selected)</span>
                                  )}
                                </label>
                                {(() => {
                                  // Disable voice option if voiceUrl is selected
                                  const isVoiceUrlSelected = !!sceneOptions.voiceUrl;

                                  if (isVoiceUrlSelected) {
                                    return (
                                      <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                        <p className="text-sm text-gray-500 text-center">
                                          Voice Option is disabled because a Voice URL has been selected. Clear the Voice URL to enable preset voice options.
                                        </p>
                                      </div>
                                    );
                                  }

                                  const currentKey = sceneOptions.voiceOption || '';
                                  let selectedGender = 'male';

                                  // Determine current gender based on selected voice key
                                  if (PRESET_VOICE_OPTIONS.female.some(v => v.key === currentKey)) {
                                    selectedGender = 'female';
                                  } else if (PRESET_VOICE_OPTIONS.male.some(v => v.key === currentKey)) {
                                    selectedGender = 'male';
                                  } else {
                                    // Default to male if no valid key or old format
                                    selectedGender = 'male';
                                  }

                                  return (
                                    <>
                                      {/* Gender Selection */}
                                      <div className="flex gap-4 mb-3">
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="radio"
                                            name={`voiceGender-${sceneNumber}`}
                                            checked={selectedGender === 'female'}
                                            onChange={() => {
                                              // When switching to female, select first female voice if current is male
                                              if (selectedGender === 'male' && PRESET_VOICE_OPTIONS.female.length > 0) {
                                                updateSceneOption('voiceOption', PRESET_VOICE_OPTIONS.female[0].key);
                                              }
                                            }}
                                            className="w-4 h-4 text-[#13008B]"
                                          />
                                          <span className="text-sm text-gray-700">Female</span>
                                        </label>
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="radio"
                                            name={`voiceGender-${sceneNumber}`}
                                            checked={selectedGender === 'male'}
                                            onChange={() => {
                                              // When switching to male, select first male voice if current is female
                                              if (selectedGender === 'female' && PRESET_VOICE_OPTIONS.male.length > 0) {
                                                updateSceneOption('voiceOption', PRESET_VOICE_OPTIONS.male[0].key);
                                              }
                                            }}
                                            className="w-4 h-4 text-[#13008B]"
                                          />
                                          <span className="text-sm text-gray-700">Male</span>
                                        </label>
                                      </div>

                                      {/* Preset Voice List - 3 columns */}
                                      <div className="grid grid-cols-3 gap-2">
                                        {PRESET_VOICE_OPTIONS[selectedGender].map((voice) => {
                                          const isSelected = sceneOptions.voiceOption === voice.key;
                                          return (
                                            <button
                                              key={voice.key}
                                              type="button"
                                              onClick={() => updateSceneOption('voiceOption', voice.key)}
                                              className={`text-left px-3 py-2 rounded-lg border transition-all ${isSelected
                                                ? 'bg-[#13008B] text-white border-[#13008B]'
                                                : 'bg-white text-gray-700 border-gray-300 hover:border-[#13008B] hover:bg-[#F6F4FF]'
                                                }`}
                                            >
                                              <span className="text-sm font-medium">{voice.name}</span>
                                            </button>
                                          );
                                        })}
                                      </div>
                                    </>
                                  );
                                })()}
                              </div>

                            </div>
                          )}
                        </div>

                        {/* Subtitles Section (global toggle) */}
                        <div className="border rounded-lg p-4 bg-white">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={subtitlesEnabled}
                              onChange={(e) => setSubtitlesEnabled(e.target.checked)}
                              className="w-4 h-4 text-[#13008B]"
                            />
                            <span className="text-sm font-medium text-gray-800">
                              Include subtitles for all scenes
                            </span>
                          </label>
                          <p className="mt-1 text-xs text-gray-500">
                            Toggling this in any scene will turn subtitles on or off for every scene.
                          </p>
                        </div>

                        {/* Transitions Section - Hidden for SORA, PLOTLY, and ANCHOR (shown directly in place of description) */}
                        {modelUpper !== 'VEO3' && !isSoraPlotlyAnchor && (
                          <div className="border rounded-lg p-4 bg-white">
                            <button
                              type="button"
                              onClick={() => toggleAdvancedOptions('transitions')}
                              className="flex w-full items-center justify-between text-base font-medium text-gray-800 mb-2"
                            >
                              <span>Transitions</span>
                              <ChevronDown className={`h-4 w-4 transition-transform ${isTransitionsOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isTransitionsOpen && (
                              <div className="mt-3 space-y-3">
                                {/* Design Your Own Section - First */}
                                <div className="border border-grey-200 rounded-lg p-3 bg-gray-50">
                                  <label className="text-sm font-medium text-gray-700 mb-3 block">Design Your Own</label>
                                  {(() => {
                                    // Get animation_desc from the scene data (from images object)
                                    const currentRow = rows.find((r) => (r?.scene_number || r?.sceneNumber) === sceneNumber);

                                    // Try to get animation_desc from imageVersionData structure
                                    let animationDesc = {};
                                    if (currentRow?.imageVersionData) {
                                      const imageVersionData = currentRow.imageVersionData;
                                      const versionKey = getLatestVersionKey(imageVersionData);
                                      const verObj = imageVersionData[versionKey] || {};
                                      animationDesc = verObj?.animation_desc || {};
                                    }

                                    // Also check selected object
                                    if (Object.keys(animationDesc).length === 0 && selected?.imageVersionData) {
                                      const imageVersionData = selected.imageVersionData;
                                      const versionKey = getLatestVersionKey(imageVersionData);
                                      const verObj = imageVersionData[versionKey] || {};
                                      animationDesc = verObj?.animation_desc || {};
                                    }

                                    // Fallback to row or selected directly
                                    if (Object.keys(animationDesc).length === 0) {
                                      animationDesc = currentRow?.animation_desc || selected?.animation_desc || {};
                                    }

                                    // Use animation_desc if available and has content, otherwise use customPreservationNotes
                                    const hasAnimationDesc = animationDesc && typeof animationDesc === 'object' && Object.keys(animationDesc).length > 0;
                                    const currentNotes = hasAnimationDesc ? animationDesc : (sceneOptions.customPreservationNotes || {});

                                    return (
                                      <div className="space-y-3">
                                        <div>
                                          <label className="text-sm font-medium text-gray-700 mb-1 block">Lighting</label>
                                          <input
                                            type="text"
                                            value={currentNotes?.lighting || ''}
                                            onChange={(e) => {
                                              updateSceneOption('customPreservationNotes', {
                                                ...sceneOptions.customPreservationNotes,
                                                lighting: e.target.value
                                              });
                                              // Clear preset selection when user starts typing
                                              if (e.target.value.trim().length > 0) {
                                                updateSceneOption('transitionPreset', null);
                                                updateSceneOption('transitionCustom', 'custom');
                                              }
                                            }}
                                            placeholder="e.g., Clean minimal lighting, flat graphic style"
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B]"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-gray-700 mb-1 block">Style/Mood</label>
                                          <input
                                            type="text"
                                            value={currentNotes?.style_mood || ''}
                                            onChange={(e) => updateSceneOption('customPreservationNotes', {
                                              ...sceneOptions.customPreservationNotes,
                                              style_mood: e.target.value
                                            })}
                                            placeholder="e.g., Professional presentation mood"
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B]"
                                          />
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                          <div>
                                            <label className="text-sm font-medium text-gray-700 mb-1 block">Subject Description</label>
                                            <textarea
                                              value={currentNotes?.subject_description || ''}
                                              onChange={(e) => updateSceneOption('customPreservationNotes', {
                                                ...sceneOptions.customPreservationNotes,
                                                subject_description: e.target.value
                                              })}
                                              placeholder="e.g., Two complete graphic compositions with all geometric shapes, colors, and layout elements"
                                              className="w-full h-12 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none bg-white"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium text-gray-700 mb-1 block">Scene Description</label>
                                            <textarea
                                              value={currentNotes?.scene_description || ''}
                                              onChange={(e) => updateSceneOption('customPreservationNotes', {
                                                ...sceneOptions.customPreservationNotes,
                                                scene_description: e.target.value
                                              })}
                                              placeholder="e.g., Flat graphic layouts displayed in sequence"
                                              className="w-full h-12 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none bg-white"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium text-gray-700 mb-1 block">Action Specification</label>
                                            <textarea
                                              value={currentNotes?.action_specification || ''}
                                              onChange={(e) => updateSceneOption('customPreservationNotes', {
                                                ...sceneOptions.customPreservationNotes,
                                                action_specification: e.target.value
                                              })}
                                              placeholder="e.g., Instant cut transition between static compositions"
                                              className="w-full h-12 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none bg-white"
                                            />
                                          </div>
                                          <div>
                                            <label className="text-sm font-medium text-gray-700 mb-1 block">Content Modification</label>
                                            <textarea
                                              value={currentNotes?.content_modification || ''}
                                              onChange={(e) => updateSceneOption('customPreservationNotes', {
                                                ...sceneOptions.customPreservationNotes,
                                                content_modification: e.target.value
                                              })}
                                              placeholder="e.g., No morphing or content generation - pure camera movement and instant cut only"
                                              className="w-full h-12 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none bg-white"
                                            />
                                          </div>
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-gray-700 mb-1 block">Transition Type</label>
                                          <input
                                            type="text"
                                            value={currentNotes?.transition_type || ''}
                                            onChange={(e) => updateSceneOption('customPreservationNotes', {
                                              ...sceneOptions.customPreservationNotes,
                                              transition_type: e.target.value
                                            })}
                                            placeholder="e.g., Whole-frame instant cut"
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B]"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-gray-700 mb-1 block">Camera Specifications</label>
                                          <input
                                            type="text"
                                            value={currentNotes?.camera_specifications || ''}
                                            onChange={(e) => updateSceneOption('customPreservationNotes', {
                                              ...sceneOptions.customPreservationNotes,
                                              camera_specifications: e.target.value
                                            })}
                                            placeholder="e.g., Static camera with subtle slow push-in"
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B]"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-gray-700 mb-1 block">Geometric Preservation</label>
                                          <textarea
                                            value={currentNotes?.geometric_preservation || ''}
                                            onChange={(e) => updateSceneOption('customPreservationNotes', {
                                              ...sceneOptions.customPreservationNotes,
                                              geometric_preservation: e.target.value
                                            })}
                                            placeholder="e.g., All elements locked, frozen, preserved in exact positions"
                                            className="w-full h-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none"
                                          />
                                        </div>
                                      </div>
                                    );
                                  })()}

                                  {/* Save this preset */}
                                  <div className="mt-4 border-t border-gray-200 pt-3 space-y-2">
                                    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                      <input
                                        type="checkbox"
                                        checked={sceneOptions.rememberCustomPreset || false}
                                        onChange={(e) => updateSceneOption('rememberCustomPreset', e.target.checked)}
                                        className="w-4 h-4 text-[#13008B]"
                                      />
                                      <span>Save this preset</span>
                                    </label>
                                    {sceneOptions.rememberCustomPreset && (
                                      <div className="mt-1">
                                        <label className="text-xs font-medium text-gray-700 mb-1 block">Preset Name</label>
                                        <input
                                          type="text"
                                          value={sceneOptions.customPresetName || ''}
                                          onChange={(e) => updateSceneOption('customPresetName', e.target.value)}
                                          placeholder="Enter a name for this preset"
                                          className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B]"
                                        />
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>
                        )}

                        {/* Transition Advanced Accordion - SORA only */}
                        {modelUpper === 'SORA' && (
                          <div className="border rounded-lg p-4 bg-white">
                            <button
                              type="button"
                              onClick={() => toggleAdvancedOptions('transitionAdvanced')}
                              className="flex w-full items-center justify-between text-base font-medium text-gray-800 mb-2"
                            >
                              <span>Transition Advanced</span>
                              <ChevronDown className={`h-4 w-4 transition-transform ${isTransitionAdvancedOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {isTransitionAdvancedOpen && (
                              <div className="mt-3 space-y-3">
                                {/* Select a Preset Section */}
                                <div className={`border rounded-lg p-3 bg-gray-50 ${isCustomPresetMode ? 'opacity-50 pointer-events-none' : ''}`}>
                                  <label className="text-sm font-medium text-gray-700 mb-3 block">Select a Preset</label>
                                  {transitionPresets.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                      {transitionPresets.map((preset, idx) => {
                                        const presetName = preset?.name || '';
                                        if (!presetName) {
                                          return null;
                                        }
                                        const isSelected = sceneOptions.transitionPreset?.name === presetName;
                                        const isHovered = hoveredPresetInfo[sceneNumber] === presetName;
                                        const hasPreservationNotes = preset?.preservation_notes && typeof preset.preservation_notes === 'object';

                                        return (
                                          <div
                                            key={idx}
                                            className="relative"
                                          >
                                            <button
                                              type="button"
                                              onClick={() => {
                                                updateSceneOption('transitionPreset', preset);
                                                updateSceneOption('transitionCustom', null);
                                              }}
                                              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${isSelected
                                                ? 'bg-[#13008B] text-white shadow-md'
                                                : 'bg-white text-gray-700 border border-gray-300 hover:border-[#13008B] hover:bg-[#F6F4FF]'
                                                }`}
                                            >
                                              <span>{presetName}</span>
                                              {hasPreservationNotes && (
                                                <div
                                                  className="relative"
                                                  onMouseEnter={() => {
                                                    setHoveredPresetInfo(prev => ({
                                                      ...prev,
                                                      [sceneNumber]: presetName
                                                    }));
                                                  }}
                                                  onMouseLeave={() => {
                                                    setHoveredPresetInfo(prev => {
                                                      const updated = { ...prev };
                                                      delete updated[sceneNumber];
                                                      return updated;
                                                    });
                                                  }}
                                                >
                                                  <button
                                                    type="button"
                                                    className="w-5 h-5 rounded-full bg-gray-400 hover:bg-gray-500 text-white text-xs font-semibold flex items-center justify-center transition-colors"
                                                    onClick={(e) => {
                                                      e.stopPropagation();
                                                    }}
                                                  >
                                                    i
                                                  </button>
                                                  {isHovered && (
                                                    <div className="absolute left-0 top-full mt-2 z-50 w-80 bg-white border border-gray-200 rounded-lg shadow-2xl p-4 text-xs text-left space-y-2">
                                                      <div className="font-semibold text-gray-800 mb-2">Preservation Notes:</div>
                                                      <div><strong>Lighting:</strong> <span className="text-gray-700">{preset.preservation_notes.lighting || 'N/A'}</span></div>
                                                      <div><strong>Style/Mood:</strong> <span className="text-gray-700">{preset.preservation_notes.style_mood || 'N/A'}</span></div>
                                                      <div><strong>Scene Description:</strong> <span className="text-gray-700">{preset.preservation_notes.scene_description || 'N/A'}</span></div>
                                                      <div><strong>Subject Description:</strong> <span className="text-gray-700">{preset.preservation_notes.subject_description || 'N/A'}</span></div>
                                                      <div><strong>Action Specification:</strong> <span className="text-gray-700">{preset.preservation_notes.action_specification || 'N/A'}</span></div>
                                                      <div><strong>Transition Type:</strong> <span className="text-gray-700">{preset.preservation_notes.transition_type || 'N/A'}</span></div>
                                                      <div><strong>Content Modification:</strong> <span className="text-gray-700">{preset.preservation_notes.content_modification || 'N/A'}</span></div>
                                                      <div><strong>Camera Specifications:</strong> <span className="text-gray-700">{preset.preservation_notes.camera_specifications || 'N/A'}</span></div>
                                                      <div><strong>Geometric Preservation:</strong> <span className="text-gray-700">{preset.preservation_notes.geometric_preservation || 'N/A'}</span></div>
                                                    </div>
                                                  )}
                                                </div>
                                              )}
                                            </button>
                                          </div>
                                        );
                                      }).filter(Boolean)}
                                    </div>
                                  ) : (
                                    <div className="text-sm text-gray-500 p-2 border rounded-lg bg-gray-50">
                                      No presets available. Loading...
                                    </div>
                                  )}
                                </div>

                                {/* Advanced Options Section */}
                                {(() => {
                                  // Get animation_desc from the scene data (same pattern as Design Your Own)
                                  const currentRow = rows.find((r) => (r?.scene_number || r?.sceneNumber) === sceneNumber);

                                  // Try to get animation_desc from imageVersionData structure
                                  let animationDesc = {};
                                  if (currentRow?.imageVersionData) {
                                    const imageVersionData = currentRow.imageVersionData;
                                    const versionKey = getLatestVersionKey(imageVersionData);
                                    const verObj = imageVersionData[versionKey] || {};
                                    animationDesc = verObj?.animation_desc || {};
                                  }

                                  // Also check selected object
                                  if (Object.keys(animationDesc).length === 0 && selected?.imageVersionData) {
                                    const imageVersionData = selected.imageVersionData;
                                    const versionKey = getLatestVersionKey(imageVersionData);
                                    const verObj = imageVersionData[versionKey] || {};
                                    animationDesc = verObj?.animation_desc || {};
                                  }

                                  // Fallback to row or selected directly
                                  if (Object.keys(animationDesc).length === 0) {
                                    animationDesc = currentRow?.animation_desc || selected?.animation_desc || {};
                                  }

                                  // Use animation_desc if available and has content, otherwise use customPreservationNotes
                                  const hasAnimationDesc = animationDesc && typeof animationDesc === 'object' && Object.keys(animationDesc).length > 0;
                                  const currentNotes = hasAnimationDesc ? animationDesc : (sceneOptions.customPreservationNotes || {});

                                  // Get editing state (using same state management as Design Your Own)
                                  const isEditing = isEditingAnimationDesc[sceneNumber] || false;
                                  const editableData = editableAnimationDesc[sceneNumber] || {};

                                  // Use editableData when editing, otherwise use currentNotes
                                  const displayNotes = isEditing
                                    ? editableData
                                    : currentNotes;

                                  // Update function for editable data
                                  const updateEditableAnimationDesc = (key, value) => {
                                    setEditableAnimationDesc(prev => ({
                                      ...prev,
                                      [sceneNumber]: {
                                        ...(prev[sceneNumber] || {}),
                                        [key]: value
                                      }
                                    }));
                                  };

                                  // Start editing function
                                  const startEditingAnimationDesc = () => {
                                    // Get current animation_desc data
                                    const currentRow = rows.find((r) => (r?.scene_number || r?.sceneNumber) === sceneNumber);
                                    let animationDescData = {};
                                    if (currentRow?.imageVersionData) {
                                      const imageVersionData = currentRow.imageVersionData;
                                      const versionKey = getLatestVersionKey(imageVersionData);
                                      const verObj = imageVersionData[versionKey] || {};
                                      animationDescData = verObj?.animation_desc || {};
                                    }
                                    if (Object.keys(animationDescData).length === 0 && selected?.imageVersionData) {
                                      const imageVersionData = selected.imageVersionData;
                                      const versionKey = getLatestVersionKey(imageVersionData);
                                      const verObj = imageVersionData[versionKey] || {};
                                      animationDescData = verObj?.animation_desc || {};
                                    }
                                    if (Object.keys(animationDescData).length === 0) {
                                      animationDescData = currentRow?.animation_desc || selected?.animation_desc || sceneOptions.customPreservationNotes || {};
                                    }

                                    // Initialize editable data with current values
                                    setEditableAnimationDesc(prev => ({
                                      ...prev,
                                      [sceneNumber]: { ...animationDescData }
                                    }));
                                    setIsEditingAnimationDesc(prev => ({
                                      ...prev,
                                      [sceneNumber]: true
                                    }));
                                  };

                                  // Cancel editing function
                                  const cancelEditingAnimationDesc = () => {
                                    setIsEditingAnimationDesc(prev => {
                                      const updated = { ...prev };
                                      delete updated[sceneNumber];
                                      return updated;
                                    });
                                    setEditableAnimationDesc(prev => {
                                      const updated = { ...prev };
                                      delete updated[sceneNumber];
                                      return updated;
                                    });
                                  };

                                  // Save editing function
                                  const saveAnimationDesc = async () => {
                                    setIsSavingAnimationDesc(true);
                                    try {
                                      const editableDataToSave = editableAnimationDesc[sceneNumber] || {};
                                      const sessionId = localStorage.getItem('session_id');
                                      const userId = localStorage.getItem('token');

                                      if (!sessionId || !sceneNumber || !userId) {
                                        throw new Error('Missing required information');
                                      }

                                      // Prepare the request body
                                      const requestBody = {
                                        session_id: sessionId,
                                        scene_number: sceneNumber,
                                        animation_desc: editableDataToSave
                                      };

                                      const response = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/${userId}/scenes/${sceneNumber}/update-scene-field`, {
                                        method: 'POST',
                                        headers: {
                                          'Content-Type': 'application/json',
                                        },
                                        body: JSON.stringify(requestBody)
                                      });

                                      if (!response.ok) {
                                        const errorText = await response.text();
                                        throw new Error(`Failed to save: ${response.status} ${errorText}`);
                                      }

                                      // Exit editing mode
                                      setIsEditingAnimationDesc(prev => {
                                        const updated = { ...prev };
                                        delete updated[sceneNumber];
                                        return updated;
                                      });

                                      // Refresh the scene data
                                      if (refreshLoad) {
                                        await refreshLoad(sceneNumber);
                                      }
                                    } catch (error) {
                                      console.error('Error saving animation_desc:', error);
                                      alert('Failed to save changes: ' + (error?.message || 'Unknown error'));
                                    } finally {
                                      setIsSavingAnimationDesc(false);
                                    }
                                  };

                                  return (
                                    <div className="mt-4 space-y-3">
                                      {/* Header with Edit Button */}
                                      <div className="mb-3 flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-700">Advanced Options</span>
                                        {isEditing ? (
                                          <div className="flex items-center gap-2">
                                            <button
                                              type="button"
                                              onClick={cancelEditingAnimationDesc}
                                              disabled={isSavingAnimationDesc}
                                              className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              Cancel
                                            </button>
                                            <button
                                              type="button"
                                              onClick={saveAnimationDesc}
                                              disabled={isSavingAnimationDesc}
                                              className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-xs hover:bg-[#0f0069] disabled:opacity-50 disabled:cursor-not-allowed"
                                            >
                                              {isSavingAnimationDesc ? 'Saving...' : 'Save'}
                                            </button>
                                          </div>
                                        ) : (
                                          <button
                                            type="button"
                                            onClick={startEditingAnimationDesc}
                                            className="px-3 py-1.5 rounded-lg border border-gray-300 text-xs text-gray-700 hover:bg-gray-100 flex items-center gap-1"
                                          >
                                            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                            </svg>
                                            Edit
                                          </button>
                                        )}
                                      </div>

                                      <div className="space-y-3">
                                        <div>
                                          <label className="text-sm font-medium text-gray-700 mb-1 block">Lighting</label>
                                          <input
                                            type="text"
                                            value={displayNotes?.lighting || ''}
                                            onChange={(e) => {
                                              if (isEditing) {
                                                updateEditableAnimationDesc('lighting', e.target.value);
                                              } else {
                                                updateSceneOption('customPreservationNotes', {
                                                  ...sceneOptions.customPreservationNotes,
                                                  lighting: e.target.value
                                                });
                                                if (e.target.value.trim().length > 0) {
                                                  updateSceneOption('transitionPreset', null);
                                                  updateSceneOption('transitionCustom', 'custom');
                                                }
                                              }
                                            }}
                                            disabled={!isEditing}
                                            placeholder="e.g., Soft studio top-left light"
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-gray-700 mb-1 block">Style/Mood</label>
                                          <input
                                            type="text"
                                            value={displayNotes?.style_mood || ''}
                                            onChange={(e) => {
                                              if (isEditing) {
                                                updateEditableAnimationDesc('style_mood', e.target.value);
                                              } else {
                                                updateSceneOption('customPreservationNotes', {
                                                  ...sceneOptions.customPreservationNotes,
                                                  style_mood: e.target.value
                                                });
                                              }
                                            }}
                                            disabled={!isEditing}
                                            placeholder="e.g., Professional presentation mood"
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-gray-700 mb-1 block">Transition Type</label>
                                          <input
                                            type="text"
                                            value={displayNotes?.transition_type || ''}
                                            onChange={(e) => {
                                              if (isEditing) {
                                                updateEditableAnimationDesc('transition_type', e.target.value);
                                              } else {
                                                updateSceneOption('customPreservationNotes', {
                                                  ...sceneOptions.customPreservationNotes,
                                                  transition_type: e.target.value
                                                });
                                              }
                                            }}
                                            disabled={!isEditing}
                                            placeholder="e.g., Whole-frame instant cut"
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-gray-700 mb-1 block">Geometric Preservation</label>
                                          <textarea
                                            value={displayNotes?.geometric_preservation || ''}
                                            onChange={(e) => {
                                              if (isEditing) {
                                                updateEditableAnimationDesc('geometric_preservation', e.target.value);
                                              } else {
                                                updateSceneOption('customPreservationNotes', {
                                                  ...sceneOptions.customPreservationNotes,
                                                  geometric_preservation: e.target.value
                                                });
                                              }
                                            }}
                                            disabled={!isEditing}
                                            placeholder="e.g., All elements locked, frozen, preserved in exact positions"
                                            className="w-full h-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none disabled:bg-gray-100 disabled:cursor-not-allowed"
                                          />
                                        </div>
                                        <div>
                                          <label className="text-sm font-medium text-gray-700 mb-1 block">Camera Specifications</label>
                                          <input
                                            type="text"
                                            value={displayNotes?.camera_specifications || ''}
                                            onChange={(e) => {
                                              if (isEditing) {
                                                updateEditableAnimationDesc('camera_specifications', e.target.value);
                                              } else {
                                                updateSceneOption('customPreservationNotes', {
                                                  ...sceneOptions.customPreservationNotes,
                                                  camera_specifications: e.target.value
                                                });
                                              }
                                            }}
                                            disabled={!isEditing}
                                            placeholder="e.g., Static camera with subtle slow push-in"
                                            className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] disabled:bg-gray-100 disabled:cursor-not-allowed"
                                          />
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })()}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* Only show content when not polling (job completed or no job running) */}
        {(!isPolling || rows.length > 0) && (
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="text-base font-semibold mb-3">Scene By Scene</div>
            <div className="flex gap-4 overflow-x-auto overflow-y-hidden scrollbar-hide">
              {rows.length === 0 && !isLoading && !error && (
                <div className="text-sm text-gray-600">No images available yet.</div>
              )}
              {rows.map((r, i) => {
                const modelUpper = String(r?.model || '').toUpperCase();
                const orderedSceneImages = getSceneImages(r);
                const first = orderedSceneImages[0];
                const second = orderedSceneImages[1];
                return (
                  <div
                    key={i}
                    className={`min-w-[300px] w-[300px] max-w-full cursor-pointer`}
                    onClick={() => {
                      const refsArray = r.refs || [];
                      const imgs = orderedSceneImages;
                      const imageEntries = buildImageEntries(imgs, r?.imageFrames);

                      // Get latest version from images object
                      const imageVersionData = r?.imageVersionData || null;
                      const imagesCurrentVersion = imageVersionData ? getLatestVersionKey(imageVersionData) : 'v1';


                      // Get avatar URLs from latest version of image object for VEO3 scenes
                      const avatarUrlsFromVersion5 = getAvatarUrlsFromImageVersion(
                        imageVersionData,
                        imagesCurrentVersion,
                        modelUpper
                      );
                      const finalAvatarUrls5 = avatarUrlsFromVersion5.length > 0
                        ? avatarUrlsFromVersion5
                        : (Array.isArray(r?.avatar_urls) ? r.avatar_urls : []);

                      setSelected({
                        index: i,
                        imageUrl: first || '',
                        images: imageEntries,
                        title: r.scene_title || 'Untitled',
                        sceneNumber: r.scene_number,
                        description: r?.description || '',
                        narration: r?.narration || '',
                        textToBeIncluded: r?.textToBeIncluded || '',
                        model: modelUpper,
                        prompts: r?.prompts || { opening_frame: {}, closing_frame: {} },
                        imageDimensions: r?.imageDimensions || null,
                        textElements: Array.isArray(r?.textElements) ? r.textElements : [],
                        overlayElements: Array.isArray(r?.overlayElements) ? r.overlayElements : [],
                        imageVersionData: imageVersionData,
                        imageFrames: Array.isArray(r?.imageFrames) ? r.imageFrames : [],
                        avatar_urls: finalAvatarUrls5,
                        current_version: imagesCurrentVersion,
                        isEditable: !!r?.isEditable
                      });
                    }}
                  >
                    <div className={`rounded-xl border overflow-hidden ${selected.index === i ? 'ring-2 ring-[#13008B]' : ''}`}>
                      {(() => {
                        const hasSecond = second && second.trim();
                        const gridCols = hasSecond ? 'grid-cols-2' : 'grid-cols-1';
                        return (
                          <div
                            className={`grid ${gridCols} gap-0 w-full bg-black`}
                            style={{
                              aspectRatio: cssAspectRatio,
                              ...(isPortrait9x16
                                ? { height: '268px' }
                                : {})
                            }}
                          >
                            {first && (
                              <div className="w-full h-full bg-black flex items-center justify-center">
                                <img src={first} alt={`scene-${r.scene_number}-1`} className="max-w-full max-h-full object-contain" height={r?.imageDimensions?.height || r?.image_dimensions?.height || undefined} />
                              </div>
                            )}
                            {hasSecond && (
                              <div className="w-full h-full bg-black flex items-center justify-center">
                                <img src={second} alt={`scene-${r.scene_number}-2`} className="max-w-full max-h-full object-contain" height={r?.imageDimensions?.height || r?.image_dimensions?.height || undefined} />
                              </div>
                            )}
                          </div>
                        );
                      })()}
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
        )}
      </div>

      {
        isSceneUpdating && (
          <div className="px-4 pb-4">
            <div className="flex items-center justify-center gap-3 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg py-2 shadow-sm">
              <span className="w-4 h-4 border-2 border-[#13008B] border-t-transparent rounded-full animate-spin" />
              <span>Applying changes…</span>
            </div>
          </div>
        )
      }

      {
        showEditor && (
          <ImageEditor
            data={editorData}
            onClose={() => {
              setShowEditor(false);
              setEditorData(null);
            }}
          />
        )
      }

      {
        showImageEdit && (
          <ImageEdit
            isOpen={showImageEdit}
            onClose={handleInlineEditorClose}
            onFrameEditComplete={handleFrameEditComplete}
            frameData={editingImageFrame}
            sceneNumber={editingSceneNumber}
            imageIndex={editingImageIndex}
            aspectRatioCss={cssAspectRatio}
          />
        )
      }
      {
        showChartEditor && chartEditorData && (
          <ChartEditorModal
            isOpen={showChartEditor}
            sceneData={chartEditorData}
            onClose={() => {
              setShowChartEditor(false);
              setChartEditorData(null);
            }}
            onSave={async ({ sceneNumber, overlayElements, chartImageUrl }) => {
              // Update rows and selected scene in-place so chart changes appear immediately
              const targetSceneNumber =
                sceneNumber ||
                chartEditorData?.scene_number ||
                chartEditorData?.sceneNumber ||
                selected?.sceneNumber ||
                selected?.scene_number ||
                null;

              if (!targetSceneNumber) return;

              setRows((prevRows) =>
                prevRows.map((row) => {
                  const rowSceneNum = row?.scene_number || row?.sceneNumber;
                  if (String(rowSceneNum) !== String(targetSceneNumber)) return row;

                  const updatedRow = { ...row };

                  if (Array.isArray(updatedRow.imageFrames)) {
                    updatedRow.imageFrames = updatedRow.imageFrames.map((frame) => ({
                      ...frame,
                      overlay_elements: Array.isArray(overlayElements)
                        ? overlayElements
                        : frame?.overlay_elements || frame?.overlayElements || []
                    }));
                  }

                  if (Array.isArray(overlayElements)) {
                    updatedRow.overlay_elements = overlayElements;
                  }

                  return updatedRow;
                })
              );

              setSelected((prev) => {
                if (!prev) return prev;
                const prevSceneNum = prev.sceneNumber || prev.scene_number;
                if (String(prevSceneNum) !== String(targetSceneNumber)) return prev;

                const updated = { ...prev };
                if (Array.isArray(updated.imageFrames)) {
                  updated.imageFrames = updated.imageFrames.map((frame) => ({
                    ...frame,
                    overlay_elements: Array.isArray(overlayElements)
                      ? overlayElements
                      : frame?.overlay_elements || frame?.overlayElements || []
                  }));
                }
                if (Array.isArray(overlayElements)) {
                  updated.overlayElements = overlayElements;
                }
                return updated;
              });
              // Bump chart version to force re-render of chart overlays with new image URL
              setChartVersion((v) => v + 1);

              // Close the modal
              setShowChartEditor(false);
              setChartEditorData(null);

              // Refresh the scene data to show the updated chart
              if (refreshLoad) {
                await refreshLoad(targetSceneNumber);
              }
            }}
          />
        )
      }

      {/* Regenerate Image Popup */}
      {
        showRegeneratePopup && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 relative max-h-[90vh] overflow-hidden flex flex-col">
              {/* Close Button - Circle at top right */}
              <button
                onClick={() => {
                  if (!isRegenerating) {
                    setShowRegeneratePopup(false);
                    setRegenerateUserQuery('');
                    setRegeneratingSceneNumber(null);
                    setIsRegenerateForDescription(false);
                    setIsRegenerating(false);
                    setError('');
                    setRegenerateReferenceFile([]);
                    setRegenerateReferencePreview([]);
                  }
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 flex items-center justify-center transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Close"
                disabled={isRegenerating}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              {/* Popup Content */}
              <div className="flex-1 p-6 overflow-y-auto relative">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 pr-10">
                  {isRegenerateForDescription ? 'Edit Description' : 'Regenerate Image'}
                </h3>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe how you want the image to be regenerated
                  </label>
                  <textarea
                    value={regenerateUserQuery}
                    onChange={(e) => setRegenerateUserQuery(e.target.value)}
                    placeholder="e.g., Make it more cinematic with dramatic sunset lighting..."
                    className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13008B] focus:border-transparent resize-none"
                    disabled={isRegenerating}
                  />
                </div>

                {/* Reference Image Upload (Optional) */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Upload Reference Images (Optional)
                  </label>
                  <p className="text-xs text-gray-500 mb-3">
                    If you upload reference images, the system will generate new images based on your reference images and description.
                  </p>
                  {regenerateReferencePreview.length === 0 ? (
                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-[#13008B] transition-colors">
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files || []);
                          if (files.length > 0) {
                            setRegenerateReferenceFile(files);
                            const previews = [];
                            let loadedCount = 0;
                            files.forEach((file) => {
                              const reader = new FileReader();
                              reader.onload = (event) => {
                                previews.push(event.target?.result);
                                loadedCount++;
                                if (loadedCount === files.length) {
                                  setRegenerateReferencePreview(previews);
                                }
                              };
                              reader.readAsDataURL(file);
                            });
                          }
                        }}
                        disabled={isRegenerating}
                        className="hidden"
                        id="regenerate-reference-upload"
                      />
                      <label
                        htmlFor="regenerate-reference-upload"
                        className={`cursor-pointer flex flex-col items-center gap-2 ${isRegenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <svg className="w-12 h-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                        </svg>
                        <span className="text-sm text-gray-600">
                          Click to upload or drag and drop
                        </span>
                        <span className="text-xs text-gray-500">
                          PNG, JPG, GIF up to 10MB (Multiple images allowed)
                        </span>
                      </label>
                    </div>
                  ) : (
                    <div className="grid grid-cols-2 gap-4">
                      {regenerateReferencePreview.map((preview, index) => (
                        <div key={index} className="relative border border-gray-300 rounded-lg p-4">
                          <img
                            src={preview}
                            alt={`Reference preview ${index + 1}`}
                            className="w-full h-48 object-contain rounded"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const newFiles = regenerateReferenceFile.filter((_, i) => i !== index);
                              const newPreviews = regenerateReferencePreview.filter((_, i) => i !== index);
                              setRegenerateReferenceFile(newFiles);
                              setRegenerateReferencePreview(newPreviews);
                              if (newFiles.length === 0) {
                                const input = document.getElementById('regenerate-reference-upload');
                                if (input) input.value = '';
                              }
                            }}
                            disabled={isRegenerating}
                            className="absolute top-2 right-2 w-8 h-8 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors flex items-center justify-center disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Remove reference image"
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                              <line x1="18" y1="6" x2="6" y2="18"></line>
                              <line x1="6" y1="6" x2="18" y2="18"></line>
                            </svg>
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Frame Selection - Show for all models except VEO3 */}
                {regeneratingSceneNumber && (() => {
                  const model = getSceneModel(regeneratingSceneNumber);
                  const modelUpper = String(model || '').toUpperCase();
                  const isVEO3 = modelUpper === 'VEO3';

                  // Show frame selection for all models except VEO3 (which uses background)
                  // ANCHOR and other models use opening/closing frames
                  if (!isVEO3) {
                    return (
                      <div className="mb-6">
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Frames to Regenerate
                        </label>
                        <div className="flex gap-4">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={regenerateFrames.includes('opening')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setRegenerateFrames(prev => [...new Set([...prev, 'opening'])]);
                                } else {
                                  setRegenerateFrames(prev => prev.filter(f => f !== 'opening'));
                                }
                              }}
                              disabled={isRegenerating}
                              className="w-4 h-4 text-[#13008B] border-gray-300 rounded focus:ring-[#13008B]"
                            />
                            <span className="text-sm text-gray-700">Opening Frame</span>
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={regenerateFrames.includes('closing')}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setRegenerateFrames(prev => [...new Set([...prev, 'closing'])]);
                                } else {
                                  setRegenerateFrames(prev => prev.filter(f => f !== 'closing'));
                                }
                              }}
                              disabled={isRegenerating}
                              className="w-4 h-4 text-[#13008B] border-gray-300 rounded focus:ring-[#13008B]"
                            />
                            <span className="text-sm text-gray-700">Closing Frame</span>
                          </label>
                        </div>
                        {regenerateFrames.length === 0 && (
                          <p className="text-xs text-red-600 mt-1">Please select at least one frame</p>
                        )}
                      </div>
                    );
                  }
                  return null;
                })()}

                {/* Save as New Version */}
                <div className="mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regenerateSaveAsNewVersion}
                      onChange={(e) => setRegenerateSaveAsNewVersion(e.target.checked)}
                      disabled={isRegenerating}
                      className="w-4 h-4 text-[#13008B] border-gray-300 rounded focus:ring-[#13008B]"
                    />
                    <span className="text-sm font-medium text-gray-700">Save as new version</span>
                  </label>
                  <p className="text-xs text-gray-500 ml-6 mt-1">
                    {regenerateSaveAsNewVersion
                      ? 'Will create a new version (e.g., v2, v3)'
                      : 'Will overwrite the current version'}
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                  </div>
                )}

                {/* Loading Overlay */}
                {isRegenerating && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-20 px-6 text-center">
                    <Loader
                      videoSize="w-16 h-16"
                      title="Regenerating Storyboard"
                      description="Please wait while we create your new image..."
                      containerClass="!max-w-sm"
                      progress={regeneratingProgress > 0 ? regeneratingProgress : null}
                    />
                  </div>
                )}

                {/* Generate Button - Bottom Right */}
                <div className="flex justify-end">
                  <button
                    onClick={handleGenerateImage}
                    disabled={(() => {
                      if (isRegenerating) return true;
                      // Allow submission if either user query OR reference image is provided
                      const hasQuery = regenerateUserQuery.trim().length > 0;
                      const hasReferenceImage = regenerateReferenceFile.length > 0;
                      if (!hasQuery && !hasReferenceImage) return true;
                      // For non-VEO3 models, require at least one frame selected
                      // VEO3 uses background, ANCHOR and others use opening/closing frames
                      if (regeneratingSceneNumber) {
                        const model = getSceneModel(regeneratingSceneNumber);
                        const modelUpper = String(model || '').toUpperCase();
                        const isVEO3 = modelUpper === 'VEO3';
                        if (!isVEO3 && regenerateFrames.length === 0) return true;
                      }
                      return false;
                    })()}
                    className="px-6 py-2.5 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0068] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isRegenerating ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      'Generate Image'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {
        showRegenerateAvatarPopup && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 relative max-h-[90vh] overflow-hidden flex flex-col">
              <button
                onClick={() => {
                  if (!isGeneratingAvatar) {
                    setShowRegenerateAvatarPopup(false);
                    setRegenerateAvatarUserQuery('');
                    setRegeneratingAvatarSceneNumber(null);
                    setRegenerateAvatarSaveAsNew(false);
                    setRegenerateAvatarName('');
                    setError('');
                  }
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 flex items-center justify-center transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Close"
                disabled={isGeneratingAvatar}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              <div className="flex-1 p-6 overflow-y-auto relative">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 pr-10">Regenerate Avatar</h3>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Describe how you want the avatar to be regenerated
                  </label>
                  <textarea
                    value={regenerateAvatarUserQuery}
                    onChange={(e) => setRegenerateAvatarUserQuery(e.target.value)}
                    placeholder="e.g., Make the avatar more professional with a neutral background..."
                    className="w-full h-32 px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13008B] focus:border-transparent resize-none"
                    disabled={isGeneratingAvatar}
                  />
                </div>

                <div className="mb-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={regenerateAvatarSaveAsNew}
                      onChange={(e) => setRegenerateAvatarSaveAsNew(e.target.checked)}
                      disabled={isGeneratingAvatar}
                      className="w-4 h-4 text-[#13008B] border-gray-300 rounded focus:ring-[#13008B]"
                    />
                    <span className="text-sm font-medium text-gray-700">Save as new avatar</span>
                  </label>
                  {regenerateAvatarSaveAsNew && (
                    <div className="mt-3">
                      <input
                        type="text"
                        value={regenerateAvatarName}
                        onChange={(e) => setRegenerateAvatarName(e.target.value)}
                        placeholder="Enter new avatar name"
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                        disabled={isGeneratingAvatar}
                      />
                    </div>
                  )}
                </div>

                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                  </div>
                )}

                {isGeneratingAvatar && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-20 px-6 text-center">
                    <Loader
                      videoSize="w-16 h-16"
                      title="Regenerating Avatar"
                      description="Please wait while we create your new avatar..."
                      containerClass="!max-w-sm"
                    />
                  </div>
                )}

                <div className="flex justify-end">
                  <button
                    onClick={handleGenerateAvatar}
                    disabled={(() => {
                      if (isGeneratingAvatar) return true;
                      const hasQuery = regenerateAvatarUserQuery.trim().length > 0;
                      if (!hasQuery) return true;
                      if (regenerateAvatarSaveAsNew && !regenerateAvatarName.trim()) return true;
                      return false;
                    })()}
                    className="px-6 py-2.5 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0068] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isGeneratingAvatar ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Generating...
                      </>
                    ) : (
                      'Generate Avatar'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Avatar Manager Popup (VEO3 only) */}
      {
        showAvatarManager && (
          <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm" style={{ zIndex: 9999 }}>
            <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 relative max-h-[90vh] overflow-hidden flex flex-col">
              {/* Close Button */}
              <button
                type="button"
                onClick={() => {
                  if (!isUpdatingAvatars) {
                    setShowAvatarManager(false);
                    setManagingAvatarSceneNumber(null);
                    setAvatarUrls(['', '']);
                    setError('');
                  }
                }}
                className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 flex items-center justify-center transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
                title="Close"
                disabled={isUpdatingAvatars}
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18"></line>
                  <line x1="6" y1="6" x2="18" y2="18"></line>
                </svg>
              </button>

              {/* Popup Content */}
              <div className="flex-1 p-6 overflow-y-auto relative">
                <h3 className="text-xl font-semibold text-gray-800 mb-4 pr-10">Manage VEO3 Avatars</h3>
                <p className="text-sm text-gray-600 mb-6">
                  Select one avatar from the gallery below.
                </p>

                {/* Avatar Selection Gallery */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Available Avatars
                  </label>
                  {isLoadingAvatars ? (
                    <div className="flex items-center justify-center py-8">
                      <div className="w-8 h-8 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                    </div>
                  ) : (
                    <>
                      {(() => {
                        // Helper to normalize avatar to object format {name, url}
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

                        // Combine preset and brand assets avatars, removing duplicates
                        const seenUrls = new Set();
                        const allAvatars = [];

                        const addIfNotSeen = (avatar) => {
                          const normalized = normalizeAvatar(avatar);
                          if (normalized && normalized.url && !seenUrls.has(normalized.url)) {
                            seenUrls.add(normalized.url);
                            allAvatars.push(normalized);
                          }
                        };

                        // Add preset avatars first
                        presetAvatars.forEach(addIfNotSeen);
                        // Add brand assets avatars
                        brandAssetsAvatars.forEach(addIfNotSeen);

                        return (
                          <div className="grid grid-cols-3 gap-4">
                            {allAvatars.map((avatarObj, index) => {
                              const avatarUrl = avatarObj.url;
                              const avatarName = avatarObj.name || `Avatar ${index + 1}`;
                              const normalizedAvatarUrl = normalizeImageUrl(avatarUrl);
                              const isSelected = avatarUrls.some(url => normalizeImageUrl(url) === normalizedAvatarUrl);

                              return (
                                <div
                                  key={`avatar-${index}-${avatarUrl}`}
                                  onClick={() => {
                                    if (isUpdatingAvatars) return;
                                    if (isSelected) {
                                      setAvatarUrls([]);
                                    } else {
                                      setAvatarUrls([avatarUrl]);
                                    }
                                  }}
                                  className={`relative cursor-pointer rounded-lg overflow-hidden transition-all border-2 ${isSelected
                                    ? 'border-[#13008B] shadow-lg'
                                    : 'border-gray-200 hover:border-gray-400'
                                    } ${isUpdatingAvatars ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                  <div className="bg-white p-2">
                                    <img
                                      src={avatarUrl}
                                      alt={avatarName}
                                      className="w-full h-32 object-contain"
                                    />
                                  </div>
                                  <div className="bg-gray-50 px-2 py-1 text-center border-t border-gray-200">
                                    <p className="text-xs text-gray-600">{avatarName}</p>
                                  </div>
                                  {isSelected && (
                                    <div className="absolute top-2 right-2 bg-[#13008B] text-white rounded-full w-7 h-7 flex items-center justify-center shadow-lg">
                                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                                        <polyline points="20 6 9 17 4 12"></polyline>
                                      </svg>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                            {/* Upload Avatar Button */}
                            <div
                              onClick={() => {
                                if (!isUpdatingAvatars) {
                                  setShowAvatarUploadPopup(true);
                                }
                              }}
                              className={`relative cursor-pointer rounded-lg overflow-hidden transition-all border-2 border-dashed ${isUpdatingAvatars ? 'opacity-50 cursor-not-allowed border-gray-200' : 'border-gray-300 hover:border-[#13008B]'
                                }`}
                            >
                              <div className="bg-gray-50 p-2 flex flex-col items-center justify-center h-32">
                                <Upload className="w-8 h-8 text-gray-400 mb-2" />
                                <p className="text-xs text-gray-600 text-center">Upload Avatar</p>
                              </div>
                            </div>
                          </div>
                        );
                      })()}
                      <p className="text-xs text-gray-500 mt-3">
                        {avatarUrls.length > 0 ? '1 avatar selected' : 'No avatar selected'}
                      </p>
                    </>
                  )}
                </div>

                {/* Error Message */}
                {error && (
                  <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                    {error}
                  </div>
                )}

                {/* Loading Overlay */}
                {isUpdatingAvatars && (
                  <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-20 px-6 text-center">
                    <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                      <div className="relative w-16 h-16">
                        <svg className="w-16 h-16" viewBox="0 0 100 100">
                          <circle cx="50" cy="50" r="45" stroke="#E5E7EB" strokeWidth="8" fill="none" />
                          <circle
                            cx="50"
                            cy="50"
                            r="45"
                            stroke="#13008B"
                            strokeWidth="8"
                            fill="none"
                            strokeLinecap="round"
                            strokeDasharray="283"
                            strokeDashoffset="70"
                            className="animate-spin"
                            style={{
                              transformOrigin: '50% 50%',
                              animation: 'spin 1.5s linear infinite'
                            }}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-3 h-3 bg-[#13008B] rounded-full" />
                        </div>
                      </div>
                      <p className="text-lg font-semibold text-[#13008B]">Updating Avatars...</p>
                      <p className="text-sm text-gray-600">Please wait while we update your avatars...</p>
                    </div>
                  </div>
                )}

                {/* Update Button */}
                <div className="flex justify-end">
                  <button
                    onClick={handleUpdateVEO3Avatars}
                    disabled={isUpdatingAvatars || avatarUrls.filter(u => u.trim()).length === 0}
                    className="px-6 py-2.5 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0068] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isUpdatingAvatars ? (
                      <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        Updating...
                      </>
                    ) : (
                      'Update Avatars'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* Upload Avatar Popup */}
      {
        showAvatarUploadPopup && (
          <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50">
            <div className="bg-white w-[90%] max-w-2xl rounded-lg shadow-xl flex flex-col max-h-[90vh]">
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-[#13008B]">Upload Avatar</h3>
                <button
                  onClick={() => {
                    setShowAvatarUploadPopup(false);
                    setAvatarUploadFiles([]);
                  }}
                  className="px-3 py-1.5 rounded-lg border text-sm hover:bg-gray-50"
                  disabled={isUploadingAvatarFiles}
                >
                  Close
                </button>
              </div>

              <div className="p-6 overflow-y-auto flex-1">
                {/* Avatar Name Input */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Avatar Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={avatarName}
                    onChange={(e) => setAvatarName(e.target.value)}
                    placeholder="Enter avatar name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                    disabled={isUploadingAvatarFiles}
                  />
                </div>

                {/* Upload Box */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select Avatar File
                  </label>
                  <input
                    ref={avatarUploadFileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const files = Array.from(e.target.files || []);
                      if (files.length > 0) {
                        setAvatarUploadFiles([files[0]]);
                      }
                      if (avatarUploadFileInputRef.current) {
                        avatarUploadFileInputRef.current.value = '';
                      }
                    }}
                    disabled={isUploadingAvatarFiles}
                  />
                  <button
                    type="button"
                    onClick={() => avatarUploadFileInputRef.current?.click()}
                    className="w-full h-32 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center cursor-pointer hover:border-[#13008B] hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isUploadingAvatarFiles}
                  >
                    <div className="text-center">
                      <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                      <p className="text-sm text-gray-600">Click to select avatar file</p>
                      <p className="text-xs text-gray-500 mt-1">Supported: JPG, PNG, WEBP</p>
                    </div>
                  </button>
                </div>

                {/* File List */}
                {avatarUploadFiles.length > 0 && (
                  <div className="mb-6">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Selected File
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
                              setAvatarUploadFiles([]);
                            }}
                            className="ml-3 p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors flex-shrink-0"
                            title="Remove file"
                            disabled={isUploadingAvatarFiles}
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
                      setAvatarName('');
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

                        // Create FormData request body
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

                        // Re-call brand assets GET API to refresh the list
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
                          // Update cache (store both objects and URLs for backward compatibility)
                          try {
                            const cacheKey = `brand_assets_images:${token}`;
                            const cached = localStorage.getItem(cacheKey);
                            let cachedData = {};
                            if (cached) {
                              try { cachedData = JSON.parse(cached); } catch (_) { }
                            }
                            cachedData.avatars = avatarObjects;
                            cachedData.avatar_urls = avatarObjects.map(a => a.url); // Keep URLs for backward compatibility
                            localStorage.setItem(cacheKey, JSON.stringify(cachedData));
                          } catch (_) { }
                        }

                        // Close popup and reset
                        setShowAvatarUploadPopup(false);
                        setAvatarUploadFiles([]);
                        setAvatarName('');
                        alert('Avatar uploaded successfully!');
                      } catch (err) {
                        console.error('Avatar upload failed:', err);
                        alert('Failed to upload avatar: ' + (err?.message || 'Unknown error'));
                      } finally {
                        setIsUploadingAvatarFiles(false);
                      }
                    }}
                    className="px-4 py-2 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isUploadingAvatarFiles || avatarUploadFiles.length === 0 || !avatarName || !avatarName.trim()}
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
        )
      }

      {/* Upload Background Popup - Asset Selection Modal */}
      {
        showUploadBackgroundPopup && (
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/50">
            <div className="bg-white w-[96%] max-w-5xl max-h-[85vh] overflow-hidden rounded-lg shadow-xl flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-[#13008B]">Choose Background Image</h3>
                <div className="flex items-center gap-4">
                  {/* Convert Colors Toggle */}
                  <label className="flex items-center gap-2 cursor-pointer">
                    <span className="text-sm text-gray-700">Convert Colors:</span>
                    <input
                      type="checkbox"
                      checked={convertColors}
                      onChange={(e) => setConvertColors(e.target.checked)}
                      disabled={isUploadingBackground}
                      className="w-4 h-4 text-[#13008B] border-gray-300 rounded focus:ring-[#13008B]"
                    />
                    <span className="text-sm text-gray-600">{convertColors ? 'On' : 'Off'}</span>
                  </label>
                  <button
                    onClick={() => {
                      if (!isUploadingBackground) {
                        setShowUploadBackgroundPopup(false);
                        setSelectedAssetUrl('');
                        setSelectedTemplateUrls([]);
                        setUploadingBackgroundSceneNumber(null);
                        setUploadFrames(['background']);
                        setAssetsTab('preset_templates'); // Reset to default tab
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border text-sm"
                    disabled={isUploadingBackground}
                  >
                    Close
                  </button>
                </div>
              </div>

              {/* Frame Selection at Top - Always show opening and closing frame checkboxes */}
              {uploadingBackgroundSceneNumber && (
                <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Frames to Upload
                  </label>
                  <div className="flex gap-4">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uploadFrames.includes('opening')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUploadFrames(prev => [...new Set([...prev, 'opening'])]);
                          } else {
                            setUploadFrames(prev => prev.filter(f => f !== 'opening'));
                          }
                        }}
                        disabled={isUploadingBackground}
                        className="w-4 h-4 text-[#13008B] border-gray-300 rounded focus:ring-[#13008B]"
                      />
                      <span className="text-sm text-gray-700">Opening Frame</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={uploadFrames.includes('closing')}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setUploadFrames(prev => [...new Set([...prev, 'closing'])]);
                          } else {
                            setUploadFrames(prev => prev.filter(f => f !== 'closing'));
                          }
                        }}
                        disabled={isUploadingBackground}
                        className="w-4 h-4 text-[#13008B] border-gray-300 rounded focus:ring-[#13008B]"
                      />
                      <span className="text-sm text-gray-700">Closing Frame</span>
                    </label>
                  </div>
                </div>
              )}

              {/* Asset Tabs */}
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
                      className={`px-3 py-1.5 rounded-full text-sm border ${assetsTab === tab.key ? 'bg-[#13008B] text-white border-[#13008B]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >{tab.label}</button>
                  ))}
                </div>
              </div>

              {/* Asset Grid Content */}
              <div className="p-4 overflow-y-auto flex-1">
                {(isAssetsLoading || (assetsTab === 'generated_images' && isLoadingGeneratedImages)) ? (
                  <div className="flex items-center justify-center py-16">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                      <span className="text-sm text-gray-600">
                        {assetsTab === 'generated_images' && isLoadingGeneratedImages ? 'Loading generated images...'
                          : 'Loading assets...'}
                      </span>
                    </div>
                  </div>
                ) : (() => {
                  // Extract assets based on selected tab
                  // Always start with empty array to prevent accumulation
                  let list = [];

                  const inferAspectFromUrl = (url = '') => {
                    try {
                      const lower = String(url).toLowerCase();
                      if (lower.includes('/16-9/') || lower.includes('16x9') || lower.includes('16-9')) return '16:9';
                      if (lower.includes('/9-16/') || lower.includes('9x16') || lower.includes('9-16')) return '9:16';
                    } catch (_) { /* noop */ }
                    return '';
                  };

                  const matchesAspectValue = (value, target) => {
                    if (!target) return true;
                    const normalizedTarget = normalizeTemplateAspectLabel(target);
                    const normalizedValue = normalizeTemplateAspectLabel(
                      typeof value === 'string' ? value : ''
                    );
                    if (!normalizedTarget || normalizedTarget === 'Unspecified') return true;
                    if (!normalizedValue || normalizedValue === 'Unspecified') return true;
                    return normalizedValue === normalizedTarget;
                  };

                  // Extract assets based on selected tab - each tab gets its own isolated list
                  if (assetsTab === 'preset_templates') {
                    // Only show preset templates
                    const extracted = extractAssetsByType(assetsData.templates, 'preset_templates');
                    list = extracted.filter(item => (item?.assetType || '') === 'preset_templates');
                  } else if (assetsTab === 'uploaded_templates') {
                    // Only show uploaded templates
                    const extracted = extractAssetsByType(assetsData.templates, 'uploaded_templates');
                    list = extracted.filter(item => (item?.assetType || '') === 'uploaded_templates');
                  } else if (assetsTab === 'uploaded_images') {
                    // Show uploaded images from both flat array and templates structure
                    const flatImages = Array.isArray(assetsData.uploaded_images) ? assetsData.uploaded_images : [];
                    const templateImages = extractAssetsByType(assetsData.templates, 'uploaded_images');

                    // Filter template images to ensure they're actually uploaded_images type
                    const filteredTemplateImages = templateImages.filter(item => (item?.assetType || '') === 'uploaded_images');

                    // Combine both sources
                    const allImages = [
                      ...filteredTemplateImages,
                      ...flatImages.map((img, idx) => {
                        const url = typeof img === 'string' ? img : (img?.image_url || img?.url || '');
                        if (!url) return null;
                        return {
                          id: `uploaded-img-flat-${idx}`,
                          imageUrl: url,
                          aspect: inferAspectFromUrl(url) || 'Unspecified',
                          label: 'Uploaded Image',
                          assetType: 'uploaded_images',
                          raw: img
                        };
                      }).filter(Boolean)
                    ];

                    // Remove duplicates based on imageUrl and ensure assetType matches
                    const seenUrls = new Set();
                    list = allImages.filter(item => {
                      const url = item?.imageUrl || item?.image_url || '';
                      if (!url || seenUrls.has(url)) return false;
                      if ((item?.assetType || '') !== 'uploaded_images') return false;
                      seenUrls.add(url);
                      return true;
                    });
                  } else if (assetsTab === 'documents_images') {
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
                    // Ensure all items match the tab
                    list = list.filter(item => (item?.assetType || '') === 'documents_images');
                  } else if (assetsTab === 'generated_images') {
                    const generatedImages = generatedImagesData.generated_images || {};
                    const allGeneratedImages = [];

                    // Handle both old format (aspectRatio -> array) and new format (aspectRatio -> session -> array)
                    Object.entries(generatedImages).forEach(([aspectRatio, value]) => {
                      const normalizedAspect = normalizeTemplateAspectLabel(aspectRatio) || 'Unspecified';

                      // Check if value is an array (old format)
                      if (Array.isArray(value)) {
                        value.forEach((url, idx) => {
                          if (typeof url === 'string' && url.trim()) {
                            allGeneratedImages.push({
                              id: `generated-${aspectRatio}-${idx}`,
                              imageUrl: url.trim(),
                              aspect: normalizedAspect,
                              sessionId: '',
                              label: `Generated Image ${idx + 1}`,
                              assetType: 'generated_images'
                            });
                          }
                        });
                      }
                      // Check if value is an object with session IDs (new format)
                      else if (value && typeof value === 'object' && !Array.isArray(value)) {
                        Object.entries(value).forEach(([sessionId, sessionUrls]) => {
                          if (Array.isArray(sessionUrls)) {
                            sessionUrls.forEach((url, idx) => {
                              if (typeof url === 'string' && url.trim()) {
                                allGeneratedImages.push({
                                  id: `generated-${aspectRatio}-${sessionId}-${idx}`,
                                  imageUrl: url.trim(),
                                  aspect: normalizedAspect,
                                  sessionId: sessionId || '',
                                  label: `Generated Image ${idx + 1}`,
                                  assetType: 'generated_images'
                                });
                              }
                            });
                          }
                        });
                      }
                    });

                    list = allGeneratedImages.filter(item => (item?.assetType || '') === 'generated_images');
                  }

                  // Filter images by aspect ratio when uploading background
                  if (uploadingBackgroundSceneNumber && questionnaireAspectRatio) {
                    const targetAspectRatio = normalizeTemplateAspectLabel(questionnaireAspectRatio);
                    // Only filter if we have a valid aspect ratio (not 'Unspecified')
                    if (targetAspectRatio && targetAspectRatio !== 'Unspecified') {
                      list = list.filter(entry => {
                        const entryAspect = entry?.aspect || inferAspectFromUrl(entry?.imageUrl || entry?.image_url || '');
                        return matchesAspectValue(entryAspect, targetAspectRatio);
                      });
                    }
                  }

                  // Final filter to ensure all items match the current tab
                  const finalList = list.filter(item => {
                    const itemAssetType = item?.assetType || '';
                    return itemAssetType === assetsTab;
                  });

                  // For generated_images, group by session and aspect ratio
                  if (assetsTab === 'generated_images' && finalList.length > 0) {
                    // Group images by session ID and aspect ratio
                    const groupedBySession = {};
                    finalList.forEach(entry => {
                      const sessionId = entry.sessionId || 'default';
                      const aspect = entry.aspect || 'Unspecified';

                      if (!groupedBySession[sessionId]) {
                        groupedBySession[sessionId] = {};
                      }
                      if (!groupedBySession[sessionId][aspect]) {
                        groupedBySession[sessionId][aspect] = [];
                      }
                      groupedBySession[sessionId][aspect].push(entry);
                    });

                    return (
                      <div className="space-y-6" key={assetsTab}>
                        {Object.entries(groupedBySession).map(([sessionId, aspectGroups]) => (
                          <div key={sessionId} className="space-y-4">
                            {/* Session Header */}
                            <div className="border-b border-gray-200 pb-2">
                              <h4 className="text-sm font-semibold text-gray-800">
                                {sessionId && sessionId !== 'default' ? `Session: ${sessionId}` : 'Generated Images'}
                              </h4>
                            </div>

                            {/* Aspect Ratio Groups */}
                            {Object.entries(aspectGroups).map(([aspect, images]) => (
                              <div key={`${sessionId}-${aspect}`} className="space-y-2">
                                {/* Aspect Ratio Header */}
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-medium text-gray-600 bg-gray-100 px-2 py-1 rounded">
                                    {aspect}
                                  </span>
                                  <span className="text-xs text-gray-500">
                                    ({images.length} {images.length === 1 ? 'image' : 'images'})
                                  </span>
                                </div>

                                {/* Images Grid */}
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                  {images.map((entry, idx) => {
                                    const imageUrl = entry?.imageUrl || entry?.image_url || entry?.url || (typeof entry === 'string' ? entry : '');
                                    if (!imageUrl) return null;

                                    const isSelected = selectedTemplateUrls.includes(imageUrl) || selectedAssetUrl === imageUrl;

                                    const handleClick = () => {
                                      if (isSelected) {
                                        setSelectedTemplateUrls([]);
                                        setSelectedAssetUrl('');
                                      } else {
                                        setSelectedTemplateUrls([imageUrl]);
                                        setSelectedAssetUrl(imageUrl);
                                      }
                                    };

                                    return (
                                      <div
                                        key={entry.id || idx}
                                        className={`rounded-lg border overflow-hidden group relative bg-white cursor-pointer ${isSelected ? 'ring-2 ring-[#13008B]' : ''}`}
                                        onClick={handleClick}
                                        title={entry.label || `${entry.aspect || 'Unspecified'} • Generated Image`}
                                      >
                                        <img
                                          src={imageUrl}
                                          alt={entry.label || `Generated Image ${idx + 1}`}
                                          className="w-full h-28 object-cover"
                                          height={entry?.raw?.base_image?.image_dimensions?.height || entry?.raw?.base_image?.imageDimensions?.height || entry?.raw?.image_dimensions?.height || entry?.raw?.imageDimensions?.height || undefined}
                                        />
                                        <div className="p-2">
                                          <span className="text-xs text-gray-700 truncate block" title={imageUrl}>
                                            {entry.label || `Generated Image ${idx + 1}`}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))}
                      </div>
                    );
                  }

                  return (
                    <>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4" key={assetsTab}>
                        {/* Upload Box - Show for uploaded_templates and uploaded_images tabs */}
                        {(assetsTab === 'uploaded_templates' || assetsTab === 'uploaded_images') && (
                          <div
                            className="rounded-lg border-2 border-dashed border-gray-300 bg-gray-50 hover:border-[#13008B] hover:bg-gray-100 cursor-pointer transition-all flex flex-col items-center justify-center min-h-[140px]"
                            onClick={() => {
                              if (isUploadingBackground) return;
                              if (assetsTab === 'uploaded_templates' && assetPptxUploadRef.current) {
                                assetPptxUploadRef.current.click();
                              } else if (assetsTab === 'uploaded_images' && assetImageUploadRef.current) {
                                assetImageUploadRef.current.click();
                              }
                            }}
                          >
                            <div className="flex flex-col items-center gap-2 p-4 text-center">
                              <Upload className="w-8 h-8 text-gray-400" />
                              <span className="text-sm font-medium text-gray-700">
                                {assetsTab === 'uploaded_templates' ? 'Upload PDF' : 'Upload Image'}
                              </span>
                              <span className="text-xs text-gray-500">
                                Click to {assetsTab === 'uploaded_templates' ? 'upload PDF' : 'upload image'}
                              </span>
                            </div>
                          </div>
                        )}
                        {finalList.length === 0 && (
                          <div className="col-span-full text-center py-8 text-sm text-gray-600">
                            No asset found
                          </div>
                        )}
                        {finalList.map((entry, idx) => {
                          const imageUrl = entry?.imageUrl || entry?.image_url || entry?.url || (typeof entry === 'string' ? entry : '');
                          if (!imageUrl) return null;

                          const isSelected = selectedTemplateUrls.includes(imageUrl) || selectedAssetUrl === imageUrl;

                          const handleClick = () => {
                            // For background selection, only allow single selection
                            if (isSelected) {
                              setSelectedTemplateUrls([]);
                              setSelectedAssetUrl('');
                            } else {
                              setSelectedTemplateUrls([imageUrl]);
                              setSelectedAssetUrl(imageUrl);
                            }
                          };

                          return (
                            <div
                              key={entry.id || idx}
                              className={`rounded-lg border overflow-hidden group relative bg-white cursor-pointer ${isSelected ? 'ring-2 ring-[#13008B]' : ''}`}
                              onClick={handleClick}
                              title={entry.label || `${entry.aspect || 'Unspecified'} • ${assetsTab.replace('_', ' ')}`}
                            >
                              <img
                                src={imageUrl}
                                alt={entry.label || `${assetsTab}-${idx}`}
                                className="w-full h-28 object-cover"
                                height={entry?.raw?.base_image?.image_dimensions?.height || entry?.raw?.base_image?.imageDimensions?.height || entry?.raw?.image_dimensions?.height || entry?.raw?.imageDimensions?.height || undefined}
                              />
                              <div className="p-2">
                                <span className="text-xs text-gray-700 truncate block" title={imageUrl}>
                                  {entry.label || `${assetsTab.replace('_', ' ')} ${idx + 1}`}
                                </span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Hidden File Inputs */}
              <input
                type="file"
                ref={assetImageUploadRef}
                accept="image/*"
                multiple
                style={{ display: 'none' }}
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length > 0) {
                    handleUploadImages(files);
                  }
                }}
              />
              <input
                type="file"
                ref={assetPptxUploadRef}
                accept=".pdf,.pptx"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    handleUploadPptx(file);
                  }
                }}
              />

              {/* Keep Default and Generate Buttons */}
              <div className="mt-4 flex items-center justify-end gap-2 border-t pt-3 px-4 pb-4">
                <button
                  disabled={selectedTemplateUrls.length === 0 || isUploadingBackground || (uploadingBackgroundSceneNumber && uploadFrames.length === 0)}
                  onClick={async () => {
                    // Keep Default - call upload API with selected image (same as old Save)
                    if (selectedTemplateUrls.length === 0) return;
                    const imageUrl = selectedTemplateUrls[0];
                    await handleSaveBackgroundFromAsset(imageUrl);
                  }}
                  className={`px-3 py-2 rounded-lg text-sm text-white ${selectedTemplateUrls.length === 0 || isUploadingBackground || (uploadingBackgroundSceneNumber && uploadFrames.length === 0)
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-[#13008B] hover:bg-blue-800'
                    }`}
                >
                  {isUploadingBackground ? 'Saving...' : 'Keep Default'}
                </button>
                <button
                  disabled={selectedTemplateUrls.length === 0 || isUploadingBackground || isGeneratingFromReference || (uploadingBackgroundSceneNumber && uploadFrames.length === 0)}
                  onClick={() => {
                    // Generate - open user query popup
                    if (selectedTemplateUrls.length === 0) return;
                    setShowUserQueryPopup(true);
                    setUserQuery('');
                  }}
                  className={`px-3 py-2 rounded-lg text-sm text-white ${selectedTemplateUrls.length === 0 || isUploadingBackground || isGeneratingFromReference || (uploadingBackgroundSceneNumber && uploadFrames.length === 0)
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                    }`}
                >
                  Generate
                </button>
              </div>

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Loading Overlay */}
              {isUploadingBackground && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-20 px-6 text-center">
                  <Loader
                    videoSize="w-16 h-16"
                    title="Uploading Background..."
                    description="Please wait while we upload your background image..."
                    containerClass="!max-w-xs"
                    progress={uploadingBackgroundProgress > 0 ? uploadingBackgroundProgress : null}
                  />
                </div>
              )}
            </div>
          </div>
        )
      }

      {/* User Query Popup for Generate from Reference */}
      {
        showUserQueryPopup && (
          <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50">
            <div className="bg-white w-[96%] max-w-2xl max-h-[85vh] overflow-hidden rounded-lg shadow-xl flex flex-col">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b border-gray-200">
                <h3 className="text-lg font-semibold text-[#13008B]">Enter Your Query</h3>
                <button
                  onClick={() => {
                    if (!isGeneratingFromReference) {
                      setShowUserQueryPopup(false);
                      setUserQuery('');
                    }
                  }}
                  className="px-3 py-1.5 rounded-lg border text-sm"
                  disabled={isGeneratingFromReference}
                >
                  Close
                </button>
              </div>

              {/* Content */}
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Describe what you want to generate from the reference image:
                    </label>
                    <textarea
                      value={userQuery}
                      onChange={(e) => setUserQuery(e.target.value)}
                      placeholder="Enter your query here... (e.g., 'Make it more vibrant', 'Add sunset colors', 'Change to night scene')"
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-[#13008B] resize-none"
                      rows={6}
                      disabled={isGeneratingFromReference}
                    />
                  </div>
                  {error && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                      {error}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Buttons */}
              <div className="flex items-center justify-end gap-2 border-t pt-3 px-4 pb-4">
                <button
                  onClick={() => {
                    if (!isGeneratingFromReference) {
                      setShowUserQueryPopup(false);
                      setUserQuery('');
                    }
                  }}
                  disabled={isGeneratingFromReference}
                  className="px-4 py-2 rounded-lg text-sm border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  disabled={!userQuery.trim() || isGeneratingFromReference || selectedTemplateUrls.length === 0}
                  onClick={async () => {
                    if (selectedTemplateUrls.length === 0 || !userQuery.trim()) return;
                    const imageUrl = selectedTemplateUrls[0];
                    await handleGenerateFromReference(imageUrl, userQuery);
                  }}
                  className={`px-4 py-2 rounded-lg text-sm text-white ${!userQuery.trim() || isGeneratingFromReference || selectedTemplateUrls.length === 0
                    ? 'bg-blue-300 cursor-not-allowed'
                    : 'bg-green-600 hover:bg-green-700'
                    }`}
                >
                  {isGeneratingFromReference ? 'Generating...' : 'Save'}
                </button>
              </div>

              {/* Loading Overlay */}
              {isGeneratingFromReference && (
                <div className="absolute inset-0 bg-white/90 backdrop-blur-sm rounded-lg flex items-center justify-center z-20 px-6 text-center">
                  <div className="flex flex-col items-center gap-4 w-full max-w-sm">
                    <div className="relative w-16 h-16">
                      <svg className="w-16 h-16" viewBox="0 0 100 100">
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke="#E5E7EB"
                          strokeWidth="8"
                          fill="none"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="45"
                          stroke="#13008B"
                          strokeWidth="8"
                          fill="none"
                          strokeLinecap="round"
                          strokeDasharray="283"
                          strokeDashoffset="70"
                          className="animate-spin"
                          style={{
                            transformOrigin: '50% 50%',
                            animation: 'spin 1.5s linear infinite'
                          }}
                        />
                      </svg>
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="w-3 h-3 bg-[#13008B] rounded-full" />
                      </div>
                    </div>
                    <p className="text-lg font-semibold text-[#13008B]">Generating from Reference...</p>
                    <p className="text-sm text-gray-600">Please wait while we generate your image...</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      }

    </div >
  );
};

export default ImageList;
