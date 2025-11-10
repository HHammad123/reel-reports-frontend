import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useDispatch } from 'react-redux';
import { setJob } from '../redux/slices/videoJobSlice';
import { Upload, Paperclip, FileText, Camera, Send, File, X, GripVertical, Check, Maximize2, RefreshCcw, ChevronLeft, ChevronRight, ChevronDown, Copy as CopyIcon, ThumbsUp, ThumbsDown, MoreHorizontal, Trash2 } from 'lucide-react';
import { FaChartBar, FaUser } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { CiPen } from 'react-icons/ci';
import { formatAIResponse } from '../utils/formatting';

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
  const normalized = trimmed.replace(/[xX]/g, ':').replace(/\s+/g, '');
  if (/^\d+:\d+$/.test(normalized)) return normalized;
  const lower = normalized.toLowerCase();
  if (lower.includes('portrait')) return '9:16';
  if (lower.includes('landscape')) return '16:9';
  return trimmed;
};

const flattenTemplateAssets = (templates = []) => {
  const normalized = [];

  const pushEntry = (entry, aspectHint, labelHint, keyHint) => {
    if (!entry) return;
    const templateObj =
      (entry.template && typeof entry.template === 'object' ? entry.template : entry);
    const imageUrl = resolveTemplateAssetUrl(templateObj);
    if (!imageUrl) return;
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

  templates.forEach((item, idx) => {
    if (!item) return;
    if (typeof item === 'string') {
      pushEntry(item, '', `Template ${idx + 1}`, `template-${idx}`);
      return;
    }
    const aspectHint = normalizeTemplateAspectLabel(
      item.aspect_ratio || item.ratio || item.orientation || ''
    );
    const nestedTemplates = [
      ...(Array.isArray(item.preset_templates) ? item.preset_templates : []),
      ...(Array.isArray(item.uploaded_templates) ? item.uploaded_templates : [])
    ];
    if (nestedTemplates.length > 0) {
      nestedTemplates.forEach((entry, entryIdx) => {
        pushEntry(entry, aspectHint, `${aspectHint} Template ${entryIdx + 1}`, `${idx}-${entryIdx}`);
      });
    } else {
      pushEntry(item, aspectHint, `Template ${idx + 1}`, `template-${idx}`);
    }
  });

  return normalized;
};

const Chat = ({ addUserChat, userChat, setuserChat, sendUserSessionData, chatHistory, setChatHistory, isChatLoading = false, onOpenImagesList, imagesAvailable = false, onGoToScenes, scenesMode = false, initialScenes = null, onBackToChat, enablePresenterOptions = false }) => {
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
  // Scenes Images overlay state
  const [showImagesOverlay, setShowImagesOverlay] = useState(false);
  const [imagesJobId, setImagesJobId] = useState('');
  const dispatch = useDispatch();
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
  // Presenter confirmation (ANCHOR model)
  const [showPresenterConfirm, setShowPresenterConfirm] = useState(false);
  const [pendingPresenterOption, setPendingPresenterOption] = useState('');
  const [isApplyingPresenter, setIsApplyingPresenter] = useState(false);
  const [advancedOptionsOpen, setAdvancedOptionsOpen] = useState(false);

  // Apply selected presenter option: update scene visual, then update text
  const applyPresenterOptionSelection = async (selOption) => {
    setIsApplyingPresenter(true);
    const token = localStorage.getItem('token');
    const sessionId = localStorage.getItem('session_id');
    if (!token || !sessionId) return;
    const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
    });
    const sessionText = await sessionResp.text();
    let sessionData; try { sessionData = JSON.parse(sessionText); } catch(_) { sessionData = sessionText; }
    const sd = (sessionData?.session_data || sessionData?.session || {});
    const user = sessionData?.user_data || sd?.user_data || sd?.user || {};
    const sessionForBody = {
      session_id: sd?.session_id || sessionId,
      user_id: sd?.user_id || token,
      title: sd?.title || '',
      video_duration: String(sd?.video_duration || sd?.videoduration || '60'),
      created_at: sd?.created_at || new Date().toISOString(),
      updated_at: sd?.updated_at || new Date().toISOString(),
      document_summary: Array.isArray(sd?.document_summary) ? sd.document_summary : [{ additionalProp1: {} }],
      messages: Array.isArray(sd?.messages) ? sd.messages : [{ additionalProp1: {} }],
      total_summary: Array.isArray(sd?.total_summary) ? sd.total_summary : (Array.isArray(sd?.totalsummary) ? sd.totalsummary : []),
      scripts: Array.isArray(sd?.scripts) ? sd.scripts : [''],
      videos: Array.isArray(sd?.videos) ? sd.videos : [{ additionalProp1: {} }],
      images: Array.isArray(sd?.images) ? sd.images : [''],
      final_link: sd?.final_link || '',
      videoType: sd?.videoType || sd?.video_type || '',
      brand_style_interpretation: sd?.brand_style_interpretation || { additionalProp1: {} },
      additionalProp1: sd?.additionalProp1 || {}
    };
    const cur = scriptRows[currentSceneIndex];
    const sceneNumber = cur?.scene_number ?? (currentSceneIndex + 1);
    const reqBody = { user, session: sessionForBody, scene_number: sceneNumber, presenter_options: { option: selOption } };
    await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-scene-visual', {
      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody)
    });
    setIsApplyingPresenter(false);
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
  const [switchChartType, setSwitchChartType] = useState('');
  const [switchChartData, setSwitchChartData] = useState('');
  const [showAddSceneModal, setShowAddSceneModal] = useState(false);
  const [insertSceneIndex, setInsertSceneIndex] = useState(null);
  const [sceneSuggestions, setSceneSuggestions] = useState([]);
  const [isSuggestingScenes, setIsSuggestingScenes] = useState(false);
  const [newSceneDescription, setNewSceneDescription] = useState('');
  const [newSceneVideoType, setNewSceneVideoType] = useState('Avatar Based');
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [addSceneStep, setAddSceneStep] = useState(1); // 1: pick model, 2: suggestions
  const [newSceneChartType, setNewSceneChartType] = useState('');
  const [newSceneChartData, setNewSceneChartData] = useState('');
  const [newSceneDocSummary, setNewSceneDocSummary] = useState('');
  const [isUploadingNewSceneDoc, setIsUploadingNewSceneDoc] = useState(false);
  const [newSceneContent, setNewSceneContent] = useState('');
  const [newSceneSelectedIdx, setNewSceneSelectedIdx] = useState(-1);
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
  const [regenModel, setRegenModel] = useState('VEO3'); // 'VEO3' | 'SORA' | 'PLOTLY'
  const [regenStep, setRegenStep] = useState(1); // 1: pick model, 2: suggestions
  const [regenChartType, setRegenChartType] = useState('');
  const [regenChartData, setRegenChartData] = useState('');
  const [regenDocSummary, setRegenDocSummary] = useState('');
  const [isUploadingRegenDoc, setIsUploadingRegenDoc] = useState(false);
  const [regenSceneContent, setRegenSceneContent] = useState('');
  const [regenSelectedIdx, setRegenSelectedIdx] = useState(-1);
  const [regenManualText, setRegenManualText] = useState('');
  // Snapshot current scene when entering edit to allow cancel revert
  const [editSnapshot, setEditSnapshot] = useState(null);
  useEffect(() => {
    try {
      if (isEditingScene && Array.isArray(scriptRows) && scriptRows[currentSceneIndex]) {
        const snap = JSON.parse(JSON.stringify(scriptRows[currentSceneIndex]));
        setEditSnapshot(snap);
      }
    } catch (_) { /* noop */ }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEditingScene, currentSceneIndex]);
  useEffect(() => {
    setAdvancedOptionsOpen(false);
  }, [currentSceneIndex]);
  // Chart type confirm (PLOTLY) state
  const [showChartTypeConfirm, setShowChartTypeConfirm] = useState(false);
  const [pendingChartType, setPendingChartType] = useState('');
  const [isUpdatingChartType, setIsUpdatingChartType] = useState(false);
  const [isApplyingChartType, setIsApplyingChartType] = useState(false);
  // Brand fonts from user brand identity (for font_style dropdown)
  const [brandFonts, setBrandFonts] = useState([]);

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

  // Helper: fetch suggestions for a given model_type and position
  const fetchSceneSuggestions = async (modelType, positionIdx, target = 'add') => {
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
      const sessionForBody = {
        session_id: sd?.session_id || sessionId,
        user_id: sd?.user_id || token,
        content: Array.isArray(sd?.content) ? sd.content : [],
        document_summary: Array.isArray(sd?.document_summary) ? sd.document_summary : [],
        video_duration: String(sd?.video_duration || sd?.videoduration || '60'),
        created_at: sd?.created_at || new Date().toISOString(),
        totalsummary: Array.isArray(sd?.totalsummary) ? sd.totalsummary : (Array.isArray(sd?.total_summary) ? sd.total_summary : []),
        messages: Array.isArray(sd?.messages) ? sd.messages : [],
        scripts: Array.isArray(sd?.scripts) ? sd.scripts : [],
        videos: Array.isArray(sd?.videos) ? sd.videos : [],
        images: Array.isArray(sd?.images) ? sd.images : [],
        final_link: sd?.final_link || '',
        videoType: sd?.videoType || sd?.video_type || '',
        brand_style_interpretation: sd?.brand_style_interpretation
      };
      const suggestBody = {
        session: sessionForBody,
        user,
        action: 'add',
        position: Math.max(0, Number(positionIdx) || 0),
        model_type: modelType,
        document_content: (modelType === 'PLOTLY')
          ? (addSceneStep ? (newSceneDocSummary || '') : (regenDocSummary || ''))
          : ''
      };
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
  // Only show 5 scene tabs at a time without scroll
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [refImageUrlInput, setRefImageUrlInput] = useState('');
  // Multiple selection of ref images by URL
  const [selectedRefImages, setSelectedRefImages] = useState([]);
  // Templates modal + state
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [brandTemplates, setBrandTemplates] = useState([]);
  const [useDefaultTemplate, setUseDefaultTemplate] = useState(true); // legacy (not used in new assets modal)
  // Generate toggle for assets modal (default: No Generate)
  const [isGenerate, setIsGenerate] = useState(false);
  // Removed template upload in assets picker per requirements
  // Brand assets modal state (logos, icons, uploaded_images, templates, voiceover)
  const [showAssetsModal, setShowAssetsModal] = useState(false);
  const [assetsData, setAssetsData] = useState({ logos: [], icons: [], uploaded_images: [], templates: [], documents_images: [] });
  const [assetsTab, setAssetsTab] = useState('templates');
  const [isAssetsLoading, setIsAssetsLoading] = useState(false);
  // Multi-select support for Templates in assets modal
  const [selectedTemplateUrls, setSelectedTemplateUrls] = useState([]);
  const [templateAspectFilter, setTemplateAspectFilter] = useState('All');
  const assetsUploadInputRef = useRef(null);
  const [pendingUploadType, setPendingUploadType] = useState('');
  // Selected asset in Choose Asset modal
  const [selectedAssetUrl, setSelectedAssetUrl] = useState('');
  const normalizedTemplateAssets = useMemo(
    () => flattenTemplateAssets(Array.isArray(assetsData.templates) ? assetsData.templates : []),
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
  const shouldFilterTemplatesByAspect = currentSceneModelUpper === 'SORA' || currentSceneModelUpper === 'PLOTLY';

  useEffect(() => {
    if (assetsTab !== 'templates') return;
    if (!shouldFilterTemplatesByAspect) {
      setTemplateAspectFilter('All');
      return;
    }
    if (templateAspectOptions.length === 0) {
      setTemplateAspectFilter('All');
      return;
    }
    setTemplateAspectFilter(prev => {
      if (prev === 'All' && templateAspectOptions.length > 1) return prev;
      if (templateAspectOptions.includes(prev)) return prev;
      return templateAspectOptions.length > 1 ? 'All' : templateAspectOptions[0];
    });
  }, [assetsTab, shouldFilterTemplatesByAspect, templateAspectOptions]);
  // Kebab menu inline component for header actions
  const KebabMenu = ({ canUndo, canRedo, onUndo, onRedo, onDelete, onRegenerate, onEdit, onSwitchAvatar, onSwitchInfographic, onSwitchFinancial, isDeleting, hasScenes, isSwitching }) => {
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
              <button onClick={() => { setOpen(false); onRegenerate(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                <RefreshCcw className="w-4 h-4 text-[#13008B]" />
                <span>Regenerate Scene</span>
              </button>
              <button onClick={() => { setOpen(false); onEdit && onEdit(); }} className="w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-gray-50">
                <CiPen className="w-4 h-4 text-[#13008B]" />
                <span>Edit Scenes</span>
              </button>
              <div className="my-1 h-px bg-gray-100" />
              <div className="px-3 py-1 text-[11px] uppercase tracking-wide text-gray-500">Switch Model</div>
              <button onClick={() => { setOpen(false); onSwitchAvatar && onSwitchAvatar(); }} disabled={isSwitching || !hasScenes} className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${(!hasScenes || isSwitching) ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                <span>Avatar Based</span>
              </button>
              <button onClick={() => { setOpen(false); onSwitchInfographic && onSwitchInfographic(); }} disabled={isSwitching || !hasScenes} className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${(!hasScenes || isSwitching) ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                <span>Infographic</span>
              </button>
              <button onClick={() => { setOpen(false); onSwitchFinancial && onSwitchFinancial(); }} disabled={isSwitching || !hasScenes} className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${(!hasScenes || isSwitching) ? 'text-gray-400 cursor-not-allowed' : 'hover:bg-gray-50'}`}>
                <span>Financial</span>
              </button>
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
  const defaultAvatars = [
    'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&h=150&fit=crop&crop=face',
    'https://images.unsplash.com/photo-1494790108755-2616b612b786?w=150&h=150&fit=crop&crop=face',
  ];
  const [avatarOptions, setAvatarOptions] = useState(defaultAvatars);
  const [selectedAvatar, setSelectedAvatar] = useState(null);
  const avatarFileInputRef = useRef(null);

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
              const val = refMap.get(sn) || [];
              const out = scene ? { ...scene } : {};
              // Only send a single canonical key
              out.ref_image = val;
              // Ensure no duplicate/synonym keys remain
              if ('ref_images' in out) delete out.ref_images;
              if ('reference_image' in out) delete out.reference_image;
              if ('reference_images' in out) delete out.reference_images;
              try { console.log('[refs] Applied to payload scene', sn, val); } catch (_) { /* noop */ }
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

  // New: Generate Scenes Images job flow
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
      const sessionForBody = {
        id: sd.session_id || sessionId,
        user_id: sd.user_id || token,
        created_at: sd.created_at || new Date().toISOString(),
        updated_at: sd.updated_at || new Date().toISOString(),
        content: Array.isArray(sd.content) ? sd.content : [],
        summarydocument: Array.isArray(sd.document_summary) ? sd.document_summary : [],
        videoduration: String(sd.video_duration ?? sd.videoduration ?? 60),
        totalsummary: Array.isArray(sd.total_summary) ? sd.total_summary : (Array.isArray(sd.totalsummary) ? sd.totalsummary : []),
        messages: Array.isArray(sd.messages) ? sd.messages : [],
        scripts: Array.isArray(sd.scripts) && sd.scripts.length > 0 ? [sd.scripts[0]] : [{ userquery: [], airesponse: [], version: 'v1', additionalProp1: {} }],
        videos: Array.isArray(sd.videos) ? sd.videos : [],
        additionalProp1: {}
      };
      // 3) Kick off images generation job (queue endpoint)
      const imgBody = {
        user_id: (user?.id || user?.user_id || localStorage.getItem('token') || ''),
        session_id: (localStorage.getItem('session_id') || sessionForBody?.session_id || '')
      };
      const imgResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/generate-images-queue', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(imgBody)
      });
      const imgText = await imgResp.text();
      let imgData; try { imgData = JSON.parse(imgText); } catch (_) { imgData = imgText; }
      if (!imgResp.ok) throw new Error(`generate-images-queue failed: ${imgResp.status} ${imgText}`);
      try { localStorage.setItem('images_generate_response', JSON.stringify(imgData)); } catch(_) {}

      // 4) Persist job id and show 5s popup before redirect
      const jobId = imgData?.job_id || imgData?.jobId || imgData?.id || (Array.isArray(imgData) && imgData[0]?.job_id);
      if (jobId) {
        try { localStorage.setItem('current_images_job_id', jobId); } catch (_) { /* noop */ }
        try { localStorage.setItem('images_generate_pending', 'true'); localStorage.setItem('images_generate_started_at', String(Date.now())); } catch(_){}
        setImagesJobId(jobId);
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
    useEffect(() => {
      let pollTimer = null;
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
              const r = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/job-status/${encodeURIComponent(id)}`);
              const tx = await r.text();
              let d; try { d = JSON.parse(tx); } catch(_) { d = {}; }
              const status = (d?.status || d?.job_status || '').toLowerCase();
              if (status === 'succeeded' || status === 'success' || status === 'completed') {
                clearInterval(pollTimer);
                pollTimer = null;
                // refresh session images
                await loadSessionImages();
                setIsLoading(false);
                try { localStorage.removeItem('images_generate_pending'); } catch(_){}
              }
            } catch(_) { /* keep polling */ }
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
            {isLoading && (<div className="text-sm text-gray-600">Loading images…</div>)}
            {error && (<div className="text-sm text-red-600 mb-2">{error}</div>)}
            <div className="grid grid-cols-1 gap-4">
              {rows.length === 0 && !isLoading && !error && (
                <div className="text-sm text-gray-600">No images available yet.</div>
              )}
              {rows.map((r, i) => (
                <div key={i} className="border rounded-xl p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-sm text-gray-500">Scene {r.scene_number}</div>
                      <div className="text-lg font-semibold flex items-center gap-3">
                        <span>{r.scene_title || 'Untitled'}</span>
                        {(() => {
                          const mu = String(r?.model || r?.mode || '').toUpperCase();
                          const vt = (mu === 'VEO3' || mu === 'ANCHOR') ? 'Avatar' : (mu === 'SORA' ? 'Infographic' : (mu === 'PLOTLY' ? 'Financial' : ''));
                          return vt ? (
                            <span className="text-sm font-normal text-gray-600">Video Type: <span className="px-2 py-0.5 text-xs rounded-full border bg-gray-50 text-gray-700 align-middle">{vt}</span></span>
                          ) : null;
                        })()}
                      </div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    {r.refs.length === 0 && (<div className="col-span-2 text-sm text-gray-500">No images for this scene.</div>)}
                    {r.refs.map((u, k) => (
                      <div key={k} className="w-full aspect-video rounded-lg border overflow-hidden bg-black">
                        <img src={u} alt={`scene-${r.scene_number}-${k}`} className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
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

      const toRow = (row, idx) => {
        const refs = normRefs(
          row?.ref_image ?? row?.reference_image ?? row?.ref_img ?? row?.ref_images ?? row?.reference_images
        );
        return {
          scene_number: row?.scene_number ?? row?.sceneNo ?? row?.scene_no ?? row?.no ?? (idx + 1),
          mode: row?.model ?? row?.mode_type ?? row?.video_mode ?? row?.mode ?? '',
          // Always preserve ref_image from API responses (e.g., from update-text API)
          ref_image: refs,
          folderLink: row?.folder_link ?? row?.folderLink ?? row?.folder ?? '',
          timeline: coalesce(row?.timeline, row?.time, row?.duration, row?.additional, row?.additional_info, row?.timestamp),
          scene_title: coalesce(row?.scene_title, row?.title, row?.scene, row?.content, row?.text),
          narration: coalesce(row?.narration, row?.voice_over_script, row?.voice_over, row?.voiceover, row?.voice),
          description: coalesce(row?.description, row?.desc, row?.scene_title, row?.title, row?.scene, row?.content, row?.text),
          gen_image: (typeof row?.gen_image === 'boolean') ? row.gen_image : undefined,
          additional: coalesce(row?.additional, row?.additional_info, row?.notes, row?.extra, row?.additionalInformation),
          // Chart-specific fields for Financial (PLOTLY) scenes
          chart_type: row?.chart_type ?? row?.chartType ?? '',
          chartType: row?.chartType ?? row?.chart_type ?? '',
          chart_data: row?.chart_data ?? row?.chartData ?? null,
          chartData: row?.chartData ?? row?.chart_data ?? null,
          // Styling and colors
          colors: Array.isArray(row?.colors) ? row.colors : [],
          font_size: (row?.font_size != null ? row.font_size : row?.fontSize),
          fontSize: (row?.fontSize != null ? row.fontSize : row?.font_size),
          font_style: row?.font_style ?? row?.fontStyle ?? '',
          fontStyle: row?.fontStyle ?? row?.font_style ?? '',
          text_to_be_included: Array.isArray(row?.text_to_be_included)
            ? row.text_to_be_included.filter(x => typeof x === 'string' && x.trim()).map(x => x.trim())
            : (typeof row?.text_to_include === 'string' && row.text_to_include.trim() ? [row.text_to_include.trim()] : [])
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

  // Keep avatar selection scoped to the current scene
  useEffect(() => {
    try {
      const scene = Array.isArray(scriptRows) ? scriptRows[currentSceneIndex] : null;
      const currentRef = Array.isArray(scene?.ref_image) && scene.ref_image.length > 0 ? (scene.ref_image[0] || null) : null;
      setSelectedAvatar(currentRef || null);
    } catch (_) { /* noop */ }
  }, [currentSceneIndex, scriptRows]);

  // Reset text input buffer when switching scenes
  useEffect(() => {
    try {
      const r = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
      const arr = Array.isArray(r?.text_to_be_included) ? r.text_to_be_included : [];
      setTextIncludeInput('');
    } catch (_) { setTextIncludeInput(''); }
  }, [currentSceneIndex, scriptRows]);

  const openScriptModal = (script) => {
    try {
      // Decide which script version to show: prefer the one with richer ref_images
      let scriptToShow = script;
      let normalizedIncoming = null;
      try { normalizedIncoming = normalizeScriptToRows(script); } catch (_) { normalizedIncoming = null; }
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
    if (scenesMode && initialScenes) {
      try { openScriptModal(initialScenes); } catch (_) { /* noop */ }
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
      const reqBody = { user: userPayload, session_id: sd?.session_id || sessionId };
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
      const reqBody = { user: userPayload, session_id: sd2?.session_id || sessionId };
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
    const content = (regenDocSummary && regenDocSummary.trim()) || (regenSceneContent && regenSceneContent.trim()) || regenQuery || '';
    if (!content) { alert('Please select a suggested scene or upload a document to provide scene content.'); return; }
    await regenerateSceneViaAPI(content);
  };

  // Open Regenerate modal first; suggestions load based on selected model
  const openRegenerateWithSuggestions = async () => {
    try {
      // Fresh start every time Regenerate flow opens
      setRegenStep(1);
      setRegenSuggestions([]);
      setRegenSelectedIdx(-1);
      setRegenSceneContent('');
      setRegenDocSummary('');
      setRegenChartType('');
      setRegenChartData('');
      setIsUploadingRegenDoc(false);
      setRegenManualText('');
      const sceneModel = String(scriptRows?.[currentSceneIndex]?.model || scriptRows?.[currentSceneIndex]?.mode || '').toUpperCase();
      setRegenModel(sceneModel || 'SORA');
      setShowRegenModal(true);
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

      const sessionForBody = {
        session_id: sd?.session_id || sessionId,
        user_id: sd?.user_id || token,
        content: Array.isArray(sd?.content) ? sd.content : [],
        document_summary: Array.isArray(sd?.document_summary) ? sd.document_summary : [{ additionalProp1: {} }],
        video_duration: String(sd?.video_duration || sd?.videoduration || '60'),
        created_at: sd?.created_at || new Date().toISOString(),
        totalsummary: Array.isArray(sd?.totalsummary) ? sd.totalsummary : (Array.isArray(sd?.total_summary) ? sd.total_summary : []),
        messages: Array.isArray(sd?.messages) ? sd.messages : [],
        scripts: Array.isArray(sd?.scripts) ? sd.scripts : [{ additionalProp1: {} }],
        videos: Array.isArray(sd?.videos) ? sd.videos : [],
        images: Array.isArray(sd?.images) ? sd.images : [],
        final_link: sd?.final_link || '',
        videoType: sd?.videoType || sd?.video_type || '',
        brand_style_interpretation: sd?.brand_style_interpretation,
        additionalProp1: sd?.additionalProp1 || {}
      };
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
      if (modelUpper === 'VEO3') {
        // For guidelines/regenerate flows, send empty presenter options
        body.presenter_options = {};
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
      const sessionForBody = {
        ...(sd || {}),
        session_id: sd?.session_id || sessionId,
        user_id: sd?.user_id || token,
        brand_style_interpretation: sd?.brand_style_interpretation,
      };
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
      setShowAddSceneModal(true);
    } catch (_) { /* noop */ }
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
    const session = {
      session_id: sd?.session_id || sessionId,
      user_id: sd?.user_id || token,
      content: Array.isArray(sd?.content) ? sd.content : [],
      document_summary: Array.isArray(sd?.document_summary) ? sd.document_summary : [{ additionalProp1: {} }],
      video_duration: String(sd?.video_duration || sd?.videoduration || '60'),
      created_at: sd?.created_at || new Date().toISOString(),
      totalsummary: Array.isArray(sd?.totalsummary) ? sd.totalsummary : (Array.isArray(sd?.total_summary) ? sd.total_summary : []),
      messages: Array.isArray(sd?.messages) ? sd.messages : [],
      scripts: Array.isArray(sd?.scripts) ? sd.scripts : [{ additionalProp1: {} }],
      videos: Array.isArray(sd?.videos) ? sd.videos : [],
      images: Array.isArray(sd?.images) ? sd.images : [],
      final_link: sd?.final_link || '',
      videoType: sd?.videoType || sd?.video_type || '',
      brand_style_interpretation: sd?.brand_style_interpretation,
      additionalProp1: sd?.additionalProp1 || {}
    };
    return { session, user };
  };

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
        newSceneVideoType === 'Avatar Based' ? 'VEO3'
        : newSceneVideoType === 'Infographic' ? 'SORA'
        : newSceneVideoType === 'Financial' ? 'PLOTLY'
        : String(scriptRows?.[currentSceneIndex]?.model || scriptRows?.[currentSceneIndex]?.mode || 'SORA');
      let body = {
        user,
        session,
        insert_position: idx,
        scene_content: (newSceneVideoType === 'Financial' && newSceneDocSummary) ? newSceneDocSummary : (sceneContent || ''),
        model_type: desiredModel
      };
      if (desiredModel === 'VEO3') {
        // For add-scene, keep presenter options empty in guidelines flow
        body.presenter_options = {};
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
    } catch (e) {
      console.error('Add scene failed:', e);
      alert('Failed to add scene. Please try again.');
    } finally {
      setIsAddingScene(false);
    }
  };

  const addSceneToRows = async () => {
    try {
      if (isAddingScene) return;
      const content = (newSceneDocSummary && newSceneDocSummary.trim()) || (newSceneContent && newSceneContent.trim()) || '';
      if (!content) { alert('Please select a suggested scene or upload a document to provide scene content.'); return; }
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
            session_id: sd?.session_id || sessionId || '',
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
          avatar_url: userPayload.avatar_url || userPayload.avatar || '',
          folder_url: userPayload.folder_url || '',
          brand_identity: wrapAdditional(normalizedBI),
          tone_and_voice: wrapAdditional(userPayload.tone_and_voice || {}),
          look_and_feel: wrapAdditional(userPayload.look_and_feel || {}),
          templates: mapToStringArray(userPayload.templates),
          voiceover: mapVoiceoverObjects(userPayload.voiceover)
        };
      }
      const additionalInstructions = {
        ai_questions: Array.isArray(aiQues) ? aiQues : [],
        guidelines: guidelines || null
      };

      const requestPayload = {
        user: normalizedUser || {
          id: token || '',
          email: '',
          display_name: '',
          created_at: new Date().toISOString(),
          avatar_url: '',
          folder_url: '',
          brand_identity: wrapAdditional({}),
          tone_and_voice: wrapAdditional({}),
          look_and_feel: wrapAdditional({}),
          templates: [],
          voiceover: []
        },
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
            session_id: sd.session_id || sessionId,
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
            session_id: sdAll.session_id || sessionId,
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
    setHasOrderChanged(true);
    
    // No persistence for edit changes here; save via dedicated actions
  };

  // Function to handle video type selection
  // Request model change: open confirmation dialog first
  const openModelChangeConfirm = (videoType) => {
    try {
      if (!Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) return;
      const scene = scriptRows[currentSceneIndex];
      const desiredModel = (videoType === 'Avatar Based') ? 'VEO3' : (videoType === 'Financial' ? 'PLOTLY' : 'SORA');
      const currentModel = (scene?.mode || scene?.model || '').toUpperCase();
      if (currentModel === desiredModel.toUpperCase()) return; // no-op if same
      setPendingModelType(videoType);
      // seed popup fields from current scene
      try {
        setSwitchAvatarUrl('');
        setSwitchChartType(scene?.chart_type || scene?.chartType || '');
        const cd = scene?.chart_data || scene?.chartData;
        setSwitchChartData(cd ? (typeof cd === 'string' ? cd : JSON.stringify(cd, null, 2)) : '');
      } catch(_) {}
      setShowModelConfirm(true);
    } catch (_) { /* noop */ }
  };

  // Confirmed: perform the API switch
  const handleVideoTypeSelect = async (videoType) => {
    try {
      if (isSwitchingModel) return;
      if (!Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) {
        console.warn('Cannot update video type: invalid scene index');
        return;
      }
      const scene = scriptRows[currentSceneIndex];
      const desiredModel = (videoType === 'Avatar Based') ? 'VEO3' : (videoType === 'Financial' ? 'PLOTLY' : 'SORA');
      const currentModel = scene?.mode || scene?.model || '';
      if ((currentModel || '').toUpperCase() === desiredModel.toUpperCase()) {
        setSelectedVideoType(videoType);
        return;
      }

      setIsSwitchingModel(true);
      // 1) Load session snapshot
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
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
            avatar_url: u?.avatar_url || '',
            folder_url: u?.folder_url || '',
            brand_identity: u?.brand_identity || {},
            tone_and_voice: u?.tone_and_voice || {},
            look_and_feel: u?.look_and_feel || {},
            templates: Array.isArray(u?.templates) ? u.templates : [],
            voiceover: Array.isArray(u?.voiceover) ? u.voiceover : [],
          };
        } catch (_) { userForBody = {}; }
      }
      const sessionForBody = {
        session_id: sessionId,
        user_id: token,
        title: sd.title ?? null,
        video_duration: sd.video_duration,
        created_at: sd.created_at,
        updated_at: sd.updated_at,
        document_summary: sd.document_summary,
        content: sd.content,
        total_summary: sd.total_summary,
        brand_style_interpretation: sd.brand_style_interpretation,
        messages: sd.messages,
        scripts: Array.isArray(sd.scripts) ? sd.scripts : undefined,
      };

      // 2) Build switch-model request body
      const requestBody = {
        user: userForBody,
        session: sessionForBody,
        scene_number: scene.scene_number,
        target_model: desiredModel,
      };
      // Optional fields per target model
      if (desiredModel === 'VEO3') {
        const avatarUrl = switchAvatarUrl || selectedAvatar || '';
        // Keep presenter options empty; include avatar_url only if provided
        requestBody.presenter_options = {};
        if (avatarUrl) requestBody.presenter_options.avatar_url = avatarUrl;
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
      const sessionForBody = {
        session_id: sd?.session_id || sessionId,
        user_id: sd?.user_id || token,
        content: Array.isArray(sd?.content) ? sd.content : [],
        document_summary: Array.isArray(sd?.document_summary) ? sd.document_summary : [{ additionalProp1: {} }],
        video_duration: String(sd?.video_duration || sd?.videoduration || '60'),
        created_at: sd?.created_at || new Date().toISOString(),
        totalsummary: Array.isArray(sd?.totalsummary) ? sd.totalsummary : (Array.isArray(sd?.total_summary) ? sd.total_summary : []),
        messages: Array.isArray(sd?.messages) ? sd.messages : [],
        scripts: Array.isArray(sd?.scripts) ? sd.scripts : [{ additionalProp1: {} }],
        videos: Array.isArray(sd?.videos) ? sd.videos : [],
        images: Array.isArray(sd?.images) ? sd.images : [],
        final_link: sd?.final_link || '',
        videoType: sd?.videoType || sd?.video_type || '',
        brand_style_interpretation: sd?.brand_style_interpretation,
        additionalProp1: sd?.additionalProp1 || {}
      };

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
      const airesponse = rows.map((r, idx) => ({
        scene_number: r?.scene_number,
        scene_title: r?.scene_title ?? '',
        model: r?.mode ?? r?.model ?? '',
        timeline: r?.timeline ?? '',
        narration: r?.narration ?? '',
        desc: r?.description ?? '',
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
        // Include avatar/background to avoid clearing when saving
        avatar: r?.avatar ?? '',
        background: r?.background ?? r?.background_image ?? '',
        background_image: r?.background_image ?? r?.background ?? '',
        // Include model-specific option blobs
        presenter_options: r?.presenter_options ?? undefined,
        anchor_options: r?.anchor_options ?? undefined,
        folderLink: r?.folderLink ?? r?.folder_link ?? '',
      }));

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
  const updateSceneGenImageFlag = async (sceneIdx, { genImage, descriptionOverride, refImagesOverride, backgroundOverride, backgroundImageOverride, avatarOverride } = {}) => {
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
      const sd = sessJson?.session_data || sessJson?.session || {};
      const user = sessJson?.user_data || sd?.user_data || sd?.user || {};
      const sessionForBody = {
        session_id: sd?.session_id || sessionId,
        user_id: sd?.user_id || token,
        content: Array.isArray(sd?.content) ? sd.content : [],
        document_summary: Array.isArray(sd?.document_summary) ? sd.document_summary : [{ additionalProp1: {} }],
        video_duration: String(sd?.video_duration || sd?.videoduration || '60'),
        created_at: sd?.created_at || new Date().toISOString(),
        totalsummary: Array.isArray(sd?.totalsummary) ? sd.totalsummary : (Array.isArray(sd?.total_summary) ? sd.total_summary : []),
        messages: Array.isArray(sd?.messages) ? sd.messages : [],
        scripts: Array.isArray(sd?.scripts) ? sd.scripts : [{ additionalProp1: {} }],
        videos: Array.isArray(sd?.videos) ? sd.videos : [],
        images: Array.isArray(sd?.images) ? sd.images : [],
        final_link: sd?.final_link || '',
        videoType: sd?.videoType || sd?.video_type || '',
        additionalProp1: sd?.additionalProp1 || {}
      };
      const originalUserquery = Array.isArray(sd?.scripts?.[0]?.userquery) ? sd.scripts[0].userquery : [];
      const scriptVersion = (Array.isArray(sd?.scripts) && sd.scripts[0]?.version) || sd?.version || 'v1';
      const rows = Array.isArray(scriptRows) ? scriptRows : [];
      const airesponse = rows.map((r, idx) => {
        const isTarget = idx === sceneIdx;
        return {
          scene_number: r?.scene_number,
          scene_title: r?.scene_title ?? '',
          model: r?.mode ?? r?.model ?? '',
          timeline: r?.timeline ?? '',
          narration: r?.narration ?? '',
          desc: isTarget && typeof descriptionOverride === 'string' ? descriptionOverride : (r?.description ?? ''),
          gen_image: (isTarget && typeof genImage === 'boolean') ? genImage : ((typeof r?.gen_image === 'boolean') ? r.gen_image : undefined),
          // Preserve visual/styling fields so they are not dropped
          chart_type: r?.chart_type ?? r?.chartType ?? '',
          chart_data: r?.chart_data ?? r?.chartData ?? undefined,
          colors: Array.isArray(r?.colors) ? r.colors : [],
          font_style: r?.font_style ?? r?.fontStyle ?? '',
          font_size: r?.font_size ?? r?.fontsize ?? r?.fontSize ?? '',
          text_to_be_included: Array.isArray(r?.text_to_be_included)
            ? r.text_to_be_included
            : (typeof r?.text_to_include === 'string' && r.text_to_include.trim() ? [r.text_to_include.trim()] : []),
          ref_image: filterImageUrls(
            isTarget && Array.isArray(refImagesOverride) && refImagesOverride.length > 0
              ? refImagesOverride
              : (Array.isArray(r?.ref_image) ? r.ref_image : (typeof r?.ref_image === 'string' && r.ref_image.trim() ? [r.ref_image] : []))
          ),
          // Include avatar/background (ANCHOR) if present/overridden
          avatar: isTarget ? (avatarOverride ?? r?.avatar ?? '') : (r?.avatar ?? ''),
          background: isTarget ? ((backgroundOverride ?? backgroundImageOverride) ?? r?.background ?? r?.background_image ?? '') : (r?.background ?? r?.background_image ?? ''),
          background_image: isTarget ? ((backgroundImageOverride ?? backgroundOverride) ?? r?.background_image ?? r?.background ?? '') : (r?.background_image ?? r?.background ?? ''),
          // Include model-specific option blobs
          presenter_options: r?.presenter_options ?? undefined,
          anchor_options: r?.anchor_options ?? undefined,
          folderLink: r?.folderLink ?? r?.folder_link ?? '',
        };
      });
      const requestBody = { user, session: sessionForBody, changed_script: { userquery: originalUserquery, airesponse, version: String(scriptVersion || 'v1') } };
      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-text', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody)
      });
      const txt = await resp.text(); let data; try { data = JSON.parse(txt); } catch(_) { data = txt; }
      if (!resp.ok) throw new Error(`scripts/update-text failed: ${resp.status} ${txt}`);
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

      // 2) Build the reordered script array from current UI rows
      const rows = Array.isArray(rowsOverride) ? rowsOverride : (Array.isArray(scriptRows) ? scriptRows : []);
      const orderedScriptArray = rows.map((r, idx) => {
        const fontSizeRaw = r?.font_size ?? r?.fontsize ?? r?.fontSize;
        const fontSizeNum = typeof fontSizeRaw === 'number'
          ? fontSizeRaw
          : Number.parseInt(String(fontSizeRaw || '').replace(/[^0-9]/g, ''), 10);
        return {
          scene_number: r?.scene_number ?? idx + 1,
          scene_title: r?.scene_title ?? '',
          model: r?.mode ?? r?.model ?? '',
          timeline: r?.timeline ?? '',
          narration: r?.narration ?? '',
          desc: r?.description ?? '',
          font_style: r?.font_style ?? r?.fontStyle ?? '',
          font_size: Number.isFinite(fontSizeNum) ? fontSizeNum : 0,
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
        };
      });

      // 3) Prepare reorder request body per required schema using session data
      const sd = (sessionDataResponse?.session_data || sessionDataResponse?.session || {});
      const sessionForBody = {
        ...(sd || {}),
        session_id: sd?.session_id || sessionId,
        user_id: sd?.user_id || token,
        brand_style_interpretation: sd?.brand_style_interpretation,
      };
      // Build exact user from session snapshot
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
      const sessionScripts = Array.isArray(sd?.scripts) ? sd.scripts : undefined;
      // Try to carry forward user's original query/preferences from the session
      const originalUserquery = Array.isArray(sessionScripts?.[0]?.userquery)
        ? sessionScripts[0].userquery
        : Array.isArray(sessionForBody?.userquery)
        ? sessionForBody.userquery
        : [];

      const reorderRequestBody = {
        session: sessionForBody,
        user: userForBody,
        reordered_script: {
          userquery: originalUserquery,
          airesponse: orderedScriptArray,
        },
      };
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

      // No chat message needed on reorder success; UI already updates
    } catch (e) {
      console.error('Failed to reorder script:', e);
      alert('Failed to reorder script. Please try again.');
    } finally {
      setIsSavingReorder(false);
    }
  };
  console.log(scriptRows)


  

  return (
    <div className='bg-white h-[79vh] flex justify-between flex-col rounded-lg mt-3 p-6'>
      {/* Add Scene Modal */}
      {showAddSceneModal && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white w-[95%] max-w-2xl rounded-lg shadow-xl p-6">
            <h3 className="text-lg font-semibold text-[#13008B]">Add New Scene</h3>
            <div className="mt-4 space-y-4">
              {/* Step 1: Model selection */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Video Type</label>
                <div className="flex gap-3 flex-wrap">
                  {['Avatar Based', 'Infographic', 'Financial'].map((type) => (
                    <button
                      key={type}
                      onClick={() => setNewSceneVideoType(type)}
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
              {newSceneVideoType === 'Financial' && addSceneStep === 2 && (
                <div className="space-y-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
                    <select value={newSceneChartType} onChange={(e)=>setNewSceneChartType(e.target.value)} className="w-full p-2 border rounded">
                      <option value="">Select</option>
                      <option value="bar">bar</option>
                      <option value="grouped_bar">grouped_bar</option>
                      <option value="stacked_bar">stacked_bar</option>
                      <option value="waterfall">waterfall</option>
                      <option value="line">line</option>
                      <option value="multi_line">multi_line</option>
                      <option value="area">area</option>
                      <option value="pie">pie</option>
                      <option value="donut">donut</option>
                      <option value="treemap">treemap</option>
                      <option value="scatter">scatter</option>
                      <option value="bubble">bubble</option>
                      <option value="heatmap">heatmap</option>
                      <option value="combo_bar_line">combo_bar_line</option>
                      <option value="funnel">funnel</option>
                      <option value="histogram">histogram</option>
                      <option value="box">box</option>
                      <option value="candlestick">candlestick</option>
                    </select>
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
                            session_id: sd.session_id || sessionId,
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
              {addSceneStep === 2 && (
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
              {addSceneStep === 2 && (!isSuggestingScenes && Array.isArray(sceneSuggestions) && sceneSuggestions.length > 0) && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                    <textarea
                      value={newSceneDescription}
                      onChange={(e) => setNewSceneDescription(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                      rows={4}
                      placeholder="Enter scene description"
                    />
                  </div>
                </>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowAddSceneModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              {addSceneStep === 1 && (
                <button
                  onClick={async () => {
                    const total = Array.isArray(scriptRows) ? scriptRows.length : 0;
                    const idx = (typeof insertSceneIndex === 'number' && insertSceneIndex >= 0 && insertSceneIndex <= total) ? insertSceneIndex : total;
                    const modelType = newSceneVideoType === 'Avatar Based' ? 'VEO3' : (newSceneVideoType === 'Financial' ? 'PLOTLY' : 'SORA');
                    await fetchSceneSuggestions(modelType, idx, 'add');
                    setAddSceneStep(2);
                  }}
                  className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#13008B] hover:bg-blue-800"
                >
                  Continue
                </button>
              )}
              {addSceneStep === 2 && (!isSuggestingScenes && Array.isArray(sceneSuggestions) && sceneSuggestions.length > 0) && (
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
      {/* Confirm Presenter Option (ANCHOR) Popup */}
      {showPresenterConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white w-[92%] max-w-md rounded-lg shadow-xl p-5">
            <h3 className="text-lg font-semibold text-[#13008B]">Apply Presenter Option?</h3>
            <div className="mt-3 text-sm text-gray-700">
              <p>Selected: {pendingPresenterOption || '-'}</p>
              <p>This will update the scene visuals. Continue?</p>
            </div>
            <div className="mt-5 flex justify-end gap-3">
              <button
                onClick={() => { setShowPresenterConfirm(false); setPendingPresenterOption(''); }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const sel = pendingPresenterOption;
                  setShowPresenterConfirm(false);
                  setPendingPresenterOption('');
                  try {
                    await applyPresenterOptionSelection(sel);
                    // reflect local state and persist selection
                    try {
                      const rows = [...(scriptRows||[])];
                      const sc = { ...rows[currentSceneIndex] };
                      sc.presenter_options = { option: sel };
                      rows[currentSceneIndex] = sc;
                      setScriptRows(rows);
                    } catch(_) {}
                    try {
                      const sid = (typeof window !== 'undefined' && localStorage.getItem('session_id')) || '';
                      const payload = { option: sel };
                      if (sid) localStorage.setItem(`presenter_option:${sid}`, JSON.stringify(payload));
                      else localStorage.setItem('presenter_option', JSON.stringify(payload));
                    } catch(_) {}
                  } catch(e) { /* noop */ }
                }}
                className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#13008B] hover:bg-[#0f0066]"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Presenter apply loader overlay */}
      {isApplyingPresenter && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/30">
          <div className="bg-white rounded-lg shadow-xl px-6 py-5 flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
            <div className="text-sm font-medium text-gray-800">Applying presenter option…</div>
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
      {showModelConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white w-[92%] max-w-md rounded-lg shadow-xl p-5">
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
                const targetModel = (pendingModelType === 'Avatar Based') ? 'VEO3' : (pendingModelType === 'Financial' ? 'PLOTLY' : 'SORA');
                return (
                  <div>
      {/* Top loading bar for scene deletion */}
      {isDeletingScene && (
        <div className="fixed top-0 left-0 right-0 z-[1000]">
          <div className="h-1 w-full bg-[#13008B] animate-pulse" />
          <div className="absolute right-3 top-2 flex items-center gap-2 px-3 py-1 rounded-full bg-white/90 shadow">
            <div className="w-4 h-4 border-2 border-[#13008B] border-t-transparent rounded-full animate-spin" />
            <span className="text-xs font-medium text-gray-700">Deleting scene…</span>
          </div>
        </div>
      )}
      {/* Center-screen loader while deleting scene (after confirm) */}
      {isDeletingScene && !showDeleteConfirm && (
        <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-black/20">
          <div className="bg-white rounded-lg shadow-xl px-6 py-5 flex items-center gap-3">
            <div className="w-6 h-6 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
            <div className="text-sm font-medium text-gray-800">Deleting scene…</div>
          </div>
        </div>
      )}
                    <p className="mb-1">Scene {scene?.scene_number || currentSceneIndex + 1}: {scene?.scene_title || '-'}</p>
                    <p className="mb-3">Current model: <span className="font-medium">{modelLabel(currentModel)}</span> → <span className="font-medium">{modelLabel(targetModel)}</span></p>
                    {/* Per-target controls */}
                    {enablePresenterOptions && pendingModelType === 'Avatar Based' && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-600 mb-1">Presenter Options</div>
                        <input value={switchAvatarUrl} onChange={(e)=>setSwitchAvatarUrl(e.target.value)} placeholder="Avatar URL (optional)" className="w-full px-3 py-2 border rounded" />
                      </div>
                    )}
                    {pendingModelType === 'Infographic' && (
                      <div className="mb-2 text-xs text-gray-600">After switching, pick a reference image in the editor or assets modal.</div>
                    )}
                    {pendingModelType === 'Financial' && (
                      <div className="mb-2">
                        <div className="text-xs text-gray-600 mb-1">Chart Type</div>
                        <select value={switchChartType} onChange={(e)=>setSwitchChartType(e.target.value)} className="w-full px-3 py-2 border rounded mb-2">
                          <option value="">Select</option>
                          <option value="pie">Pie</option>
                          <option value="bar">Bar</option>
                          <option value="line">Line</option>
                        </select>
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
                <h3 className="text-lg font-semibold text-[#13008B]">Generate Script</h3>
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
                    onSwitchAvatar={() => openModelChangeConfirm('Avatar Based')}
                    onSwitchInfographic={() => openModelChangeConfirm('Infographic')}
                    onSwitchFinancial={() => openModelChangeConfirm('Financial')}
                    isDeleting={isDeletingScene}
                    hasScenes={Array.isArray(scriptRows) && scriptRows.length > 0}
                    isSwitching={isSwitchingModel}
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
                      title={`Drag to reorder. Currently Scene ${index + 1}`}
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
                         Scene {index + 1}
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
                                 const vt = (mu === 'VEO3' || mu === 'ANCHOR') ? 'Avatar' : (mu === 'SORA' ? 'Infographic' : (mu === 'PLOTLY' ? 'Financial' : ''));
                                 return vt ? (
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
                                 const vt = (mu === 'VEO3' || mu === 'ANCHOR') ? 'Avatar' : (mu === 'SORA' ? 'Infographic' : (mu === 'PLOTLY' ? 'Financial' : ''));
                                 return vt ? (
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
                         <div className="md:col-span-2">
                           <label className="block text-sm font-medium text-gray-700 mb-2">Narration</label>
                           {isEditingScene ? (
                             <div className="flex gap-2">
                               <textarea
                                 value={Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex].narration || '' : ''}
                                 onChange={(e) => handleSceneUpdate(currentSceneIndex, 'narration', e.target.value)}
                                 className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                                 rows={3}
                                 placeholder="Enter narration text"
                               />
                               <button className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors" title="Refresh">
                                 <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                   <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                 </svg>
                               </button>
                             </div>
                           ) : (
                             <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800">
                               {Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? (scriptRows[currentSceneIndex].narration || '-') : '-'}
                             </div>
                           )}
                         </div>
                       </div>
                     </div>

                      {(() => {
                        const scene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                        const sceneModelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                        const isPlotly = sceneModelUpper === 'PLOTLY';
                        if (isPlotly) {
                          console.log(scene)
                          const chartType = scene?.chart_type || scene?.chartType || '-';
                          const chartData = (() => {
                            const d = scene?.chart_data || scene?.chartData;
                            if (d == null) return '-';
                            if (typeof d === 'string') return d;
                            try { return JSON.stringify(d, null, 2); } catch (_) { return String(d); }
                          })();
                          return (
                            <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                              <h4 className="text-lg font-semibold text-gray-800 mb-4">Chart</h4>
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                  <div className="text-sm font-medium text-gray-700 mb-1">Chart Type</div>
                                  {isEditingScene ? (
                                    <select
                                      value={chartType || ''}
                                      onChange={(e)=>{
                                        const sel = e.target.value;
                                        const prev = chartType || '';
                                        if (sel === prev) return;
                                        try { e.target.value = prev; } catch(_) {}
                                        setPendingChartType(sel);
                                        setShowChartTypeConfirm(true);
                                      }}
                                      className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                                    >
                                      <option value="">Select</option>
                                      <option value="bar">bar</option>
                                      <option value="grouped_bar">grouped_bar</option>
                                      <option value="stacked_bar">stacked_bar</option>
                                      <option value="waterfall">waterfall</option>
                                      <option value="line">line</option>
                                      <option value="multi_line">multi_line</option>
                                      <option value="area">area</option>
                                      <option value="pie">pie</option>
                                      <option value="donut">donut</option>
                                      <option value="treemap">treemap</option>
                                      <option value="scatter">scatter</option>
                                      <option value="bubble">bubble</option>
                                      <option value="heatmap">heatmap</option>
                                      <option value="combo_bar_line">combo_bar_line</option>
                                      <option value="funnel">funnel</option>
                                      <option value="histogram">histogram</option>
                                      <option value="box">box</option>
                                      <option value="candlestick">candlestick</option>
                                    </select>
                                  ) : (
                                    <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 whitespace-pre-wrap">{chartType || '-'}</div>
                                  )}
                                </div>
                                <div className="md:col-span-2">
                                  <div className="text-sm font-medium text-gray-700 mb-1">Chart Data</div>
                                  {(() => {
                                    let raw = scene?.chart_data || scene?.chartData;
                                    // If raw is a JSON string, try to parse
                                    if (typeof raw === 'string') {
                                      try { raw = JSON.parse(raw); } catch (_) { /* keep as string */ }
                                    }
                                    const renderTable = (headers, rows) => (
                                      <div className="w-full overflow-x-auto overflow-y-auto max-h-60 border border-gray-200 rounded-lg bg-white">
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
                                    try {
                                      if (!raw) return <div className="w-full px-3 py-2 text-gray-600 border border-gray-200 rounded-lg bg-white">-</div>;
                                      // Prefer series[x,y,z] table view
                                      const trySeriesTable = (obj) => {
                                        try {
                                          let series = obj?.series || (Array.isArray(obj) && obj[0]?.series) || null;
                                          if (!series) return null;
                                          // Normalize series to array of objects with optional name
                                          let seriesArr = [];
                                          if (Array.isArray(series)) {
                                            seriesArr = series;
                                          } else if (typeof series === 'object') {
                                            // Case: single series object with x/y/z/data arrays
                                            if (Array.isArray(series.x) || Array.isArray(series.y) || Array.isArray(series.z) || Array.isArray(series.data)) {
                                              seriesArr = [{ name: series.name || 'Series', ...series }];
                                            } else {
                                              // Map of name -> {y:[...], x?:[], data?:[]}
                                              seriesArr = Object.entries(series).map(([name, val]) => ({ name, ...(val||{}) }));
                                            }
                                          }
                                          if (!Array.isArray(seriesArr) || seriesArr.length === 0) return null;

                                          // Determine X axis
                                          let xArr = Array.isArray(obj?.x) ? obj.x : null;
                                          if (!xArr) {
                                            if (Array.isArray(seriesArr[0]?.x)) xArr = seriesArr[0].x;
                                            else if (Array.isArray(seriesArr[0]?.data)) {
                                              const pts = seriesArr[0].data;
                                              if (pts.length && typeof pts[0] === 'object' && 'x' in pts[0]) {
                                                xArr = pts.map(p => p?.x);
                                              }
                                            }
                                          }

                                          // Build headers: x + one column per series (y) and optional z per series
                                          const yHeaders = seriesArr.map(s => (s?.name || 'Series') + ' (y)');
                                          const zPresence = seriesArr.some(s => Array.isArray(s?.z) || (Array.isArray(s?.data) && s.data.length && typeof s.data[0]==='object' && 'z' in s.data[0]));
                                          const zHeaders = zPresence ? seriesArr.map(s => (s?.name || 'Series') + ' (z)') : [];
                                          const headers = ['x', ...yHeaders, ...zHeaders];

                                          const maxLen = Math.max(
                                            xArr ? xArr.length : 0,
                                            ...seriesArr.map(s => Array.isArray(s?.y) ? s.y.length : (Array.isArray(s?.data) ? s.data.length : 0))
                                          );
                                          if (maxLen === 0) return null;

                                          const rows = Array.from({ length: maxLen }, (_, i) => {
                                            const row = {};
                                            row['x'] = xArr ? xArr[i] : (Array.isArray(seriesArr[0]?.data) ? seriesArr[0].data[i]?.x : (Array.isArray(seriesArr[0]?.x) ? seriesArr[0].x[i] : ''));
                                            // y values per series
                                            seriesArr.forEach((s, si) => {
                                              let yv = '';
                                              if (Array.isArray(s?.y)) yv = s.y[i];
                                              else if (Array.isArray(s?.data)) yv = s.data[i]?.y;
                                              row[yHeaders[si]] = (yv ?? '');
                                            });
                                            if (zHeaders.length) {
                                              seriesArr.forEach((s, si) => {
                                                let zv = '';
                                                if (Array.isArray(s?.z)) zv = s.z[i];
                                                else if (Array.isArray(s?.data)) zv = s.data[i]?.z;
                                                row[zHeaders[si]] = (zv ?? '');
                                              });
                                            }
                                            return row;
                                          });

                                          return renderTable(headers, rows);
                                        } catch(_) { return null; }
                                      };
                                      const seriesView = trySeriesTable(raw);
                                      if (seriesView) return seriesView;
                                      // If no series object present, show placeholder
                                      return <div className="w-full px-3 py-2 text-gray-600 border border-gray-200 rounded-lg bg-white">No series data</div>;
                                    } catch (_) {
                                      return renderTable(['Value'], [{ Value: chartData }]);
                                    }
                                  })()}
                                </div>
                              </div>
                            </div>
                          );
                        }
                        // Default: Description for non-Financial (non-PLOTLY) scenes
                        return (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <h4 className="text-lg font-semibold text-gray-800 mb-4">Description</h4>
                            {isEditingScene ? (
                              <textarea
                                value={Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex].description || '' : ''}
                                onChange={(e) => handleSceneUpdate(currentSceneIndex, 'description', e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                                rows={4}
                                placeholder="Enter scene description"
                              />
                            ) : (
                              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 whitespace-pre-wrap">
                                {Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? (scriptRows[currentSceneIndex].description || '-') : '-'}
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
                        const showFontControls = isSora || isAnchor || isPlotly;
                        const fontOptions = (() => {
                          const opts = Array.isArray(brandFonts) ? [...brandFonts] : [];
                          if (fontStyleVal && !opts.includes(fontStyleVal)) opts.unshift(fontStyleVal);
                          return opts;
                        })();
                        const gridClass = showFontControls ? 'grid grid-cols-1 md:grid-cols-2 gap-4' : 'grid grid-cols-1 gap-4';
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
                              <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-4 py-4">
                                <div className={gridClass}>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">Colors</label>
                                    <div className="flex flex-wrap gap-2">
                                      {(colors || []).map((c, i) => (
                                        <button
                                          key={`${c}-${i}`}
                                          type="button"
                                          onClick={() => {
                                            if (isEditingScene) {
                                              const next = colors.filter((_, idx) => idx !== i);
                                              handleSceneUpdate(currentSceneIndex, 'colors', next);
                                            }
                                          }}
                                          className="w-7 h-7 rounded border border-gray-300"
                                          style={{ background: c }}
                                          title={isEditingScene ? `Remove ${c}` : c}
                                        />
                                      ))}
                                      {(!colors || colors.length === 0) && (
                                        <span className="text-sm text-gray-500">-</span>
                                      )}
                                    </div>
                                    {isEditingScene && (
                                      <div className="flex items-center gap-2 mt-2">
                                        <input
                                          type="text"
                                          placeholder="#000000"
                                          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
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
                                        <div className="flex items-center gap-3">
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
                                            disabled={!isEditingScene}
                                          />
                                          <span className="inline-block w-12 text-right text-sm text-gray-700">{fontSizeVal}px</span>
                                        </div>
                                      </div>
                                      <div>
                                        <label className="block text-sm font-medium text-gray-700 mb-2">Font Style</label>
                                        <select
                                          value={fontStyleVal}
                                          onChange={(e) => handleSceneUpdate(currentSceneIndex, 'font_style', e.target.value)}
                                          className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent ${
                                            isEditingScene ? 'border-gray-300' : 'border-gray-200 bg-white text-gray-800'
                                          }`}
                                          disabled={!isEditingScene}
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
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })()}
                      {(() => {
                        const scene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                        if (!scene) return null;
                        const sceneModelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                        if (!(sceneModelUpper === 'SORA' || sceneModelUpper === 'ANCHOR' || sceneModelUpper === 'PLOTLY')) return null;
                        const items = Array.isArray(scene?.text_to_be_included) ? scene.text_to_be_included : [];
                        return (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">Text To Be Included</label>
                            {isEditingScene ? (
                              <div>
                                <div className="flex flex-wrap gap-2 mb-2">
                                  {items.map((t, i) => (
                                    <span
                                      key={i}
                                      className="inline-flex items-center gap-2 px-2 py-1 rounded-full bg-white border border-gray-300 text-sm"
                                    >
                                      {t}
                                      <button
                                        type="button"
                                        onClick={() => {
                                          const copy = items.slice();
                                          copy.splice(i, 1);
                                          handleSceneUpdate(currentSceneIndex, 'text_to_be_included', copy);
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
                                        const next = [...items, val];
                                        handleSceneUpdate(currentSceneIndex, 'text_to_be_included', next);
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
                                      const next = [...items, val];
                                      handleSceneUpdate(currentSceneIndex, 'text_to_be_included', next);
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
                      {(() => { const r = scriptRows?.[currentSceneIndex]; const m = String(r?.model||r?.mode||'').toUpperCase(); if (m==='SORA' || m==='ANCHOR' || m==='VEO3' || m==='PLOTLY') return null; return (
                        <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                          <h4 className="text-lg font-semibold text-gray-800 mb-2">Text To Be Included</h4>
                        {(() => {
                          const r = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                          const items = Array.isArray(r?.text_to_be_included) ? r.text_to_be_included : [];
                          if (!isEditingScene) {
                            return (
                              <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800 whitespace-pre-wrap">
                                {items.length ? items.join(', ') : '-'}
                              </div>
                            );
                          }
                          const removeAt = (idx) => {
                            const copy = items.slice();
                            copy.splice(idx,1);
                            handleSceneUpdate(currentSceneIndex, 'text_to_be_included', copy);
                          };
                          const addItem = () => {
                            const val = (textIncludeInput || '').trim();
                            if (!val) return;
                            const next = [...items, val];
                            handleSceneUpdate(currentSceneIndex, 'text_to_be_included', next);
                            setTextIncludeInput('');
                          };
                          return (
                            <div>
                              <div className="flex flex-wrap gap-2 mb-2">
                                {items.map((t, i) => (
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
                          );
                        })()}
                      </div>
                      );})()}

                                           {/* Video Type Selection */}
                      {(() => { const r = scriptRows?.[currentSceneIndex]; const m = String(r?.model||r?.mode||'').toUpperCase(); if (m==='SORA' || m==='ANCHOR' || m==='VEO3' || m==='PLOTLY') return null; return (
                       <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                         <h4 className="text-lg font-semibold text-gray-800 mb-4">Video Type</h4>
                        {(() => {
                          let vt = '';
                          try {
                            const sid = (typeof window !== 'undefined' && localStorage.getItem('session_id')) || '';
                            vt = ((typeof window !== 'undefined' && localStorage.getItem(`video_type_value:${sid}`)) || selectedVideoType || '').toLowerCase();
                          } catch (_) { /* noop */ }
                          const sceneModelUpper = String(scriptRows?.[currentSceneIndex]?.model || scriptRows?.[currentSceneIndex]?.mode || '').toUpperCase();
                          return (
                            <div className="flex flex-wrap gap-3">
                              {/* Avatar */}
                              <button
                                type="button"
                                disabled={!(sceneModelUpper === 'VEO3' || sceneModelUpper === 'ANCHOR')}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                  (sceneModelUpper === 'VEO3' || sceneModelUpper === 'ANCHOR')
                                    ? 'bg-[#13008B] text-white'
                                    : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                }`}
                              >
                                Avatar
                              </button>
                              {/* Infographic */}
                              <button
                                type="button"
                                disabled={sceneModelUpper !== 'SORA'}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                  (sceneModelUpper === 'SORA')
                                    ? 'bg-[#13008B] text-white'
                                    : 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed'
                                }`}
                              >
                                Infographic
                              </button>
                              {/* Financial (selected when scene model is PLOTLY) */}
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
                            </div>
                          );
                        })()}
                        {isSwitchingModel && (
                          <p className="text-sm text-gray-500 mt-2">Switching model…</p>
                        )}
                      </div>
                      );})()}

                      {(() => {
                        // Presenter Options for VEO3
                        // Only show in contexts that explicitly enable it (Script Editor)
                        if (!enablePresenterOptions) return null;
                        const scene = Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex] : null;
                        const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                        // Show presenter options in Script Editor for VEO3 and ANCHOR models
                        if (modelUpper !== 'VEO3' && modelUpper !== 'ANCHOR') return null;
                        const presenterOptions = [
                          'Confident Entrance (Walk-in)',
                          'Direct Address (Step Forward)',
                          'Data Visualization (Gesture)',
                          'Walk and Talk (Tracking Shot)',
                          'Dynamic Interaction (Virtual Elements)',
                          'Seated at Desk (Explainer)',
                          'Podium Presentation (Keynote)',
                          'Whiteboard Explanation (Strategy)',
                          'Emphatic Close-up (Key Message)',
                          'anchor mode'
                        ];
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
                        const optionsList = [
                          { option: 'Confident Entrance (Walk-in)', sample_video: 'https://example.com/sample_confident_entry.mp4' },
                          { option: 'Direct Address (Step Forward)', sample_video: 'https://example.com/sample_step_forward.mp4' },
                          { option: 'Data Visualization (Gesture)', sample_video: 'https://example.com/sample_gesture_graphics.mp4' },
                          { option: 'Walk and Talk (Tracking Shot)', sample_video: 'https://example.com/sample_walk_across.mp4' },
                          { option: 'Dynamic Interaction (Virtual Elements)' },
                          { option: 'Seated at Desk (Explainer)' },
                          { option: 'Podium Presentation (Keynote)' },
                          { option: 'Whiteboard Explanation (Strategy)' },
                          { option: 'Emphatic Close-up (Key Message)' },
                          { option: 'anchor mode' }
                        ];
                        return (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                            <h4 className="text-lg font-semibold text-gray-800 mb-3">Presenter Options</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                              <div className="md:col-span-1 border border-gray-200 rounded-lg divide-y">
                                {optionsList.map((po, idx) => {
                                  const opt = po.option || String(po);
                                  const active = current === opt;
                                  return (
                                    <button key={idx} type="button" onClick={async () => {
                                      const sel = opt;
                                  try {
                                    const token = localStorage.getItem('token');
                                    const sessionId = localStorage.getItem('session_id');
                                    if (!token || !sessionId) return;
                                    const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                                      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
                                    });
                                    const sessionText = await sessionResp.text();
                                    let sessionData; try { sessionData = JSON.parse(sessionText); } catch(_) { sessionData = sessionText; }
                                    const sd = (sessionData?.session_data || sessionData?.session || {});
                                    const user = sessionData?.user_data || sd?.user_data || sd?.user || {};
                                    const sessionForBody = {
                                      session_id: sd?.session_id || sessionId,
                                      user_id: sd?.user_id || token,
                                      content: Array.isArray(sd?.content) ? sd.content : [],
                                      document_summary: Array.isArray(sd?.document_summary) ? sd.document_summary : [],
                                      video_duration: String(sd?.video_duration || sd?.videoduration || '60'),
                                      created_at: sd?.created_at || new Date().toISOString(),
                                      totalsummary: Array.isArray(sd?.totalsummary) ? sd.totalsummary : (Array.isArray(sd?.total_summary) ? sd.total_summary : []),
                                      messages: Array.isArray(sd?.messages) ? sd.messages : []
                                    };
                                    const sceneNumber = scene?.scene_number ?? (currentSceneIndex + 1);
                                    // Always show confirmation modal before applying presenter option
                                    setPendingPresenterOption(sel);
                                    setShowPresenterConfirm(true);
                                    return;
                                  } catch(err) { console.warn('Presenter update failed:', err); }
                                    }} className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${active ? 'bg-blue-50' : ''}`}>
                                      <div className="font-medium text-gray-900 text-sm">{opt}</div>
                                    </button>
                                  );
                                })}
                              </div>
                              <div className="md:col-span-2">
                                {!current && (
                                  <div className="text-sm text-gray-500">Select a presenter option to preview its sample.</div>
                                )}
                                {current && (() => {
                                  const cur = optionsList.find(po => (po.option||String(po))===current) || {};
                                  return (
                                    <div className="space-y-3">
                                      <div className="text-lg font-semibold text-gray-900">{current}</div>
                                      {cur.sample_video ? (
                                        <div className="aspect-video w-full bg-black/5 rounded-lg overflow-hidden border">
                                          <video controls className="w-full h-full"><source src={cur.sample_video} type="video/mp4" /></video>
                                        </div>
                                      ) : (
                                        <div className="text-sm text-gray-600">No sample available.</div>
                                      )}
                                      {current === 'anchor mode' && (
                                        <div className="mt-2 border-t pt-3">
                                          <div className="text-sm font-medium text-gray-800 mb-2">Anchor Settings</div>
                                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                            <div className="flex flex-col gap-1">
                                              <label className="text-xs text-gray-600">Size</label>
                                              <input value={scene?.anchor_options?.size||''} onChange={(e)=>{
                                                const rows=[...(scriptRows||[])]; const sc={...rows[currentSceneIndex]}; sc.anchor_options={...(sc.anchor_options||{}), size:e.target.value}; rows[currentSceneIndex]=sc; setScriptRows(rows);
                                              }} placeholder="e.g., small, medium, large or px" className="px-3 py-2 border rounded-lg" />
                                            </div>
                                            <div className="flex flex-col gap-1">
                                              <label className="text-xs text-gray-600">Position</label>
                                              <select value={scene?.anchor_options?.position||''} onChange={(e)=>{
                                                const rows=[...(scriptRows||[])]; const sc={...rows[currentSceneIndex]}; sc.anchor_options={...(sc.anchor_options||{}), position:e.target.value}; rows[currentSceneIndex]=sc; setScriptRows(rows);
                                              }} className="px-3 py-2 border rounded-lg">
                                                <option value="">Select position</option>
                                                <option value="topleft">Top Left</option>
                                                <option value="topcenter">Top Center</option>
                                                <option value="topright">Top Right</option>
                                                <option value="bottomleft">Bottom Left</option>
                                                <option value="bottomcenter">Bottom Center</option>
                                                <option value="bottomright">Bottom Right</option>
                                              </select>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  );
                                })()}
                              </div>
                            </div>
                          </div>
                        );
                      })()}

                     {(() => { const scene = scriptRows?.[currentSceneIndex]; const m = String(scene?.model||scene?.mode||'').toUpperCase(); const isAvatarish = (m==='VEO3' || m==='ANCHOR'); return isAvatarish; })() ? (
                       <>
                       <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                         <h4 className="text-lg font-semibold text-gray-800 mb-4">Select an Avatar</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-4">
                           {avatarOptions.map((avatarUrl, index) => (
                             <button
                               type="button"
                               key={index}
                               onClick={async () => {
                              try {
                                 setSelectedAvatar(avatarUrl);
                                 // Save avatar differently for ANCHOR vs VEO3
                                 if (Array.isArray(scriptRows) && scriptRows[currentSceneIndex]) {
                                   const rows = [...scriptRows];
                                   const scene = { ...rows[currentSceneIndex] };
                                   const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                                   if (modelUpper === 'ANCHOR') {
                                     scene.avatar = avatarUrl; // store avatar string in scene
                                     try { await updateSceneGenImageFlag(currentSceneIndex, { avatarOverride: avatarUrl }); } catch(_) {}
                                   } else {
                                     // legacy: store as ref_image for non-ANCHOR
                                     scene.ref_image = [avatarUrl];
                                     updateRefMapForScene(scene.scene_number, scene.ref_image);
                                   }
                                   rows[currentSceneIndex] = scene;
                                   setScriptRows(rows);
                                 }
                               } catch (_) { /* noop */ }
                             }}
                               className={`w-20 h-20 rounded-lg border-2 overflow-hidden transition-colors ${
                                 selectedAvatar === avatarUrl ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-300 hover:border-[#13008B]'
                               }`}
                               title={`Avatar ${index + 1}`}
                             >
                               <img src={avatarUrl} alt={`Avatar ${index + 1}`} className="w-full h-full object-cover" />
                             </button>
                           ))}
                           {/* Hidden input for avatar upload */}
                           <input
                             ref={avatarFileInputRef}
                             type="file"
                             accept="image/*"
                             className="hidden"
                             onChange={async (e) => {
                               try {
                                 const files = Array.from(e.target.files || []);
                                 if (files.length === 0) return;
                                 if (!Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) return;
                                 const current = scriptRows[currentSceneIndex];
                                 const folder = current?.folderLink || current?.folder_link || '';
                                 setIsUploadingAvatar(true);
                                 const urls = await uploadImagesToFolder([files[0]], folder);
                                 if (urls.length === 0) { alert('Upload failed. No image URL returned.'); return; }
                                 const url = urls[0];
                                 setAvatarOptions(prev => Array.from(new Set([...(prev || []), url])));
                                 setSelectedAvatar(url);
                                 // Apply uploaded avatar
                                 const rows = [...scriptRows];
                                 const scene = { ...rows[currentSceneIndex] };
                                 const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                                 if (modelUpper === 'ANCHOR') {
                                   scene.avatar = url;
                                   try { await updateSceneGenImageFlag(currentSceneIndex, { avatarOverride: url }); } catch(_) {}
                                 } else {
                                   scene.ref_image = [url];
                                   updateRefMapForScene(scene.scene_number, scene.ref_image);
                                 }
                                 rows[currentSceneIndex] = scene;
                                 setScriptRows(rows);
                               } catch (err) {
                                 console.error('Avatar upload failed:', err);
                                 alert('Failed to upload avatar. Please try again.');
                               } finally {
                                 setIsUploadingAvatar(false);
                                 if (avatarFileInputRef.current) avatarFileInputRef.current.value = '';
                               }
                             }}
                          />
                          <button
                            type="button"
                            onClick={() => avatarFileInputRef.current && avatarFileInputRef.current.click()}
                            className={`w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center cursor-pointer hover:border-[#13008B] transition-colors ${isUploadingAvatar ? 'opacity-60 cursor-not-allowed' : ''}`}
                            title="Upload avatar"
                            disabled={isUploadingAvatar}
                          >
                            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                         </div>
                      </div>

                      {(() => {
                        const scene = Array.isArray(scriptRows) ? scriptRows[currentSceneIndex] : null;
                        const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                        if (modelUpper !== 'ANCHOR') return null;
                        const genVal = (typeof scene?.gen_image === 'boolean') ? scene.gen_image : false;
                        // In Script Editor, keep toggle fully visible even if not actively editing
                        const disabled = !isEditingScene;
                        const base = `inline-flex items-center gap-3 px-2 py-1 rounded-full transition-colors ${genVal ? 'bg-green-100' : 'bg-gray-100'}`;
                        const cls = disabled ? base : base;
                        const onToggle = async () => {
                          if (disabled) return;
                          const next = !genVal;
                          try { handleSceneUpdate(currentSceneIndex, 'gen_image', next); await updateSceneGenImageFlag(currentSceneIndex, { genImage: next }); } catch(_) {}
                        };
                        const refs = (() => {
                          const r = scene?.ref_image;
                          if (Array.isArray(r)) return r;
                          if (typeof r === 'string' && r.trim()) return [r.trim()];
                          return [];
                        })();
                        return (
                          <div className="bg-gray-50 rounded-lg p-4 border border-gray-200 mt-4">
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-gray-800">Select a Background Image</h4>
                              <button type="button" onClick={onToggle} className={cls} title="Toggle Generate Image" disabled={disabled}>
                                <span className="text-sm text-gray-800">{genVal ? 'True' : 'False'}</span>
                                <span className={`relative inline-flex w-10 h-5 rounded-full ${genVal ? 'bg-green-500' : 'bg-gray-400'}`}>
                                  <span className={`absolute top-0.5 ${genVal ? 'right-0.5' : 'left-0.5'} w-4 h-4 bg-white rounded-full transition-all`} />
                                </span>
                              </button>
                            </div>
                            {(() => { const bg = scene?.background || scene?.background_image || ''; if (!bg) return null; return (
                              <div className="mb-3">
                                <div className="text-sm font-medium text-gray-700 mb-1">Selected Background</div>
                                <div className="w-28 h-28 border rounded-lg overflow-hidden">
                                  <img src={bg} alt="Selected background" className="w-full h-full object-cover" />
                                </div>
                              </div>
                            ); })()}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-4 mb-4">
                              {refs.length === 0 ? (
                                <p className="text-sm text-gray-500 col-span-4">No background images yet. Add one below.</p>
                              ) : (
                                refs.map((url, idx) => (
                                  <div key={idx} className={`group relative w-24 h-24 rounded-lg border-2 ${ (selectedRefImages || []).includes(url) ? 'border-green-500 ring-2 ring-green-300' : 'border-gray-300' } overflow-visible transition-colors`} title={url} onClick={async (e) => {
                                    e.stopPropagation();
                                    try {
                                      // For ANCHOR, background is a single string
                                      setSelectedRefImages([url]);
                                      if (Array.isArray(scriptRows) && scriptRows[currentSceneIndex]) {
                                        const rows = [...scriptRows]; const s = { ...rows[currentSceneIndex] };
                                        s.background = url; s.background_image = url;
                                        rows[currentSceneIndex] = s; setScriptRows(rows);
                                        try { await updateSceneGenImageFlag(currentSceneIndex, { backgroundOverride: url, backgroundImageOverride: url }); } catch(_) {}
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
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  const token = localStorage.getItem('token');
                                  if (!token) { alert('Missing user'); return; }
                                  try {
                                    setAssetsTab('templates'); setIsGenerate(false); setShowAssetsModal(true);
                                    const cacheKey = `brand_assets_images:${token}`; const cached = localStorage.getItem(cacheKey);
                                    if (cached) {
                                      const data = JSON.parse(cached);
                                      const logos = Array.isArray(data?.logos) ? data.logos : [];
                                      const icons = Array.isArray(data?.icons) ? data.icons : [];
                                      const uploaded_images = Array.isArray(data?.uploaded_images) ? data.uploaded_images : [];
                                      const templates = Array.isArray(data?.templates) ? data.templates : [];
                                      const documents_images = Array.isArray(data?.documents_images) ? data.documents_images : [];
                                      setAssetsData({ logos, icons, uploaded_images, templates, documents_images });
                                    } else {
                                      setAssetsData({ logos: [], icons: [], uploaded_images: [], templates: [], documents_images: [] });
                                    }
                                  } catch(_) { setAssetsData({ logos: [], icons: [], uploaded_images: [], templates: [], documents_images: [] }); }
                                  finally { setIsAssetsLoading(false); }
                                }}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
                                title="Choose from templates"
                              >
                                <File className="w-4 h-4" /> Choose From Template
                              </button>
                              <input ref={imageFileInputRef} type="file" accept="image/*" multiple className="hidden" onChange={async (e)=>{
                                try {
                                  const files = Array.from(e.target.files || []); if (!files.length) return;
                                  if (!Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) return;
                                  const current = scriptRows[currentSceneIndex]; const folder = current?.folderLink || current?.folder_link || '';
                                  setIsUploadingSceneImages(true);
                                  const urls = await uploadImagesToFolder(files, folder);
                                  if (!urls || urls.length===0) { alert('Upload failed. No image URLs returned.'); return; }
                                  const rows = [...scriptRows]; const s3 = { ...rows[currentSceneIndex] };
                                  const filtered = filterImageUrls(urls).slice(0,1); s3.background = filtered[0] || ''; s3.background_image = s3.background; rows[currentSceneIndex] = s3; setScriptRows(rows); setSelectedRefImages(filtered);
                                  try { await updateSceneGenImageFlag(currentSceneIndex, { backgroundOverride: s3.background, backgroundImageOverride: s3.background }); } catch(_) {}
                                } catch(err) { console.error('Background images upload failed:', err); alert('Failed to upload background images. Please try again.'); }
                                finally { setIsUploadingSceneImages(false); if (imageFileInputRef.current) imageFileInputRef.current.value=''; }
                              }} />
                              <button onClick={()=>{ if (imageFileInputRef.current) imageFileInputRef.current.click(); }} disabled={isUploadingSceneImages} className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium ${isUploadingSceneImages ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-900'}`}>
                                {isUploadingSceneImages ? (<span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />) : (<><Upload className="w-4 h-4" /><span>Upload</span></>)}
                              </button>
                            </div>
                          </div>
                        );
                      })()}
                       </>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                         {(() => {
                           const scene = Array.isArray(scriptRows) ? scriptRows[currentSceneIndex] : null;
                           const genVal = (typeof scene?.gen_image === 'boolean') ? scene.gen_image : false;
                           // In Script Editor, keep toggle fully visible even if not actively editing
                           const disabled = !isEditingScene;
                           const base = `inline-flex items-center gap-3 px-2 py-1 rounded-full transition-colors ${genVal ? 'bg-green-100' : 'bg-gray-100'}`;
                           const cls = disabled ? base : base;
                           const onToggle = async () => {
                             if (disabled) return;
                             const next = !genVal;
                             try {
                               handleSceneUpdate(currentSceneIndex, 'gen_image', next);
                               await updateSceneGenImageFlag(currentSceneIndex, { genImage: next });
                             } catch(_) { /* noop */ }
                           };
                          return (
                            <div className="flex items-center justify-between mb-4">
                              <h4 className="text-lg font-semibold text-gray-800">{String((scene?.model||scene?.mode||'')).toUpperCase()==='ANCHOR' ? 'Select a Background Image' : 'Select a Reference Image'}</h4>
                              <button type="button" onClick={onToggle} className={cls} title="Toggle Generate Image" disabled={disabled}>
                                <span className="text-sm text-gray-800">{genVal ? 'True' : 'False'}</span>
                                <span className={`relative inline-flex w-10 h-5 rounded-full ${genVal ? 'bg-green-500' : 'bg-gray-400'}`}>
                                  <span className={`absolute top-0.5 ${genVal ? 'right-0.5' : 'left-0.5'} w-4 h-4 bg-white rounded-full transition-all`} />
                                </span>
                              </button>
                            </div>
                          );
                        })()}
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-4 mb-4">
                           {(() => {
                             const scene = Array.isArray(scriptRows) ? scriptRows[currentSceneIndex] : null;
                             const refs = (() => {
                               const r = scene?.ref_image;
                               if (Array.isArray(r)) return r;
                               if (typeof r === 'string' && r.trim()) return [r.trim()];
                               return [];
                             })();
                             if (refs.length === 0) {
                               return <p className="text-sm text-gray-500 col-span-4">No reference images yet. Add one below.</p>;
                             }
                            return refs.map((url, idx) => (
                              <div
                                key={idx}
                                className={`group relative w-24 h-24 rounded-lg border-2 ${
                                  (selectedRefImages || []).includes(url)
                                    ? 'border-green-500 ring-2 ring-green-300'
                                    : 'border-gray-300'
                                } overflow-visible transition-colors`}
                                title={url}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  try {
                                    // Toggle selection, cap at 3
                                    setSelectedRefImages(prev => {
                                      const prevList = Array.isArray(prev) ? [...prev] : [];
                                      const i = prevList.indexOf(url);
                                      if (i >= 0) {
                                        prevList.splice(i, 1);
                                      } else {
                                        if (prevList.length >= 3) {
                                          alert('You can select up to 3 reference images.');
                                          return prevList;
                                        }
                                        prevList.push(url);
                                      }
                                      // Apply selection to current scene, overriding previous
                                      if (Array.isArray(scriptRows) && scriptRows[currentSceneIndex]) {
                                        const rows = [...scriptRows];
                                        const scene = { ...rows[currentSceneIndex] };
                                        scene.ref_image = prevList.slice(0, 3);
                                        rows[currentSceneIndex] = scene;
                                        setScriptRows(rows);
                                        updateRefMapForScene(scene.scene_number, scene.ref_image);
                                      }
                                      return prevList;
                                    });
                                  } catch (_) { /* noop */ }
                                }}
                              >
                                {/* Thumbnail (no auto-zoom on hover) */}
                                <img
                                  src={url}
                                  alt={`Ref ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />

                                {/* Center zoom icon (click to fullscreen) */}
                                <button
                                  className="pointer-events-auto absolute inset-0 m-auto w-9 h-9 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                                  style={{ width: '36px', height: '36px' }}
                                  title="Zoom"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setLightboxUrl(url);
                                    setIsImageLightboxOpen(true);
                                  }}
                                >
                                  <Maximize2 className="w-5 h-5" />
                                </button>

                                {/* Action buttons overlay */}
                                <div className="pointer-events-none absolute inset-0 flex items-start justify-between p-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  {/* Remove (left) */}
                                  <button
                                    className="pointer-events-auto w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
                                    title="Remove"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      try {
                                        if (!Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) return;
                                        const rows = [...scriptRows];
                                        const scene = { ...rows[currentSceneIndex] };
                                        const list = Array.isArray(scene.ref_image) ? [...scene.ref_image] : [];
                                        list.splice(idx, 1);
                                        scene.ref_image = list;
                                        rows[currentSceneIndex] = scene;
                                        setScriptRows(rows);
                                        // Remove from selected list if present
                                        setSelectedRefImages((prev) => (Array.isArray(prev) ? prev.filter((u) => u !== url) : []));
                                        updateRefMapForScene(scene.scene_number, scene.ref_image);
                                      } catch (_) { /* noop */ }
                                    }}
                                  >
                                    <X className="w-4 h-4" />
                                  </button>

                                  {/* Select (right) */}
                                  <button
                                    className={`pointer-events-auto w-6 h-6 rounded-full flex items-center justify-center ${'bg-green-600 text-white'}`}
                                    title={'Use this reference'}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      try {
                                        if (!Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) return;
                                        const rows = [...scriptRows];
                                        const scene = { ...rows[currentSceneIndex] };
                                        // Replace any existing ref images with the selected one
                                        scene.ref_image = [url];
                                        rows[currentSceneIndex] = scene;
                                        setScriptRows(rows);
                                        setSelectedRefImages([url]);
                                        updateRefMapForScene(scene.scene_number, scene.ref_image);
                                      } catch (_) { /* noop */ }
                                    }}
                                  >
                                    <Check className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            ));
                          })()}
                         </div>
                         <div className="flex items-center gap-2">
                           {/* Hidden file input for image upload */}
                           <input
                             ref={imageFileInputRef}
                             type="file"
                             accept="image/*"
                             multiple
                             className="hidden"
                             onChange={async (e) => {
                               try {
                                 const files = Array.from(e.target.files || []);
                                 if (!files.length) return;
                                 if (!Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) return;
                                 const current = scriptRows[currentSceneIndex];
                                 const folder = current?.folderLink || current?.folder_link || '';
                                 setIsUploadingSceneImages(true);
                                 const urls = await uploadImagesToFolder(files, folder);
                                 if (!urls || urls.length === 0) { alert('Upload failed. No image URLs returned.'); return; }
                                 const rows = [...scriptRows];
                                 const scene = { ...rows[currentSceneIndex] };
                                 const filtered = filterImageUrls(urls).slice(0, 3);
                                 scene.ref_image = filtered;
                                 rows[currentSceneIndex] = scene;
                                 setScriptRows(rows);
                                 setSelectedRefImages(filtered);
                                 updateRefMapForScene(scene.scene_number, scene.ref_image);
                               } catch (err) {
                                 console.error('Scene images upload failed:', err);
                                 alert('Failed to upload images. Please try again.');
                               } finally {
                                 setIsUploadingSceneImages(false);
                                 if (imageFileInputRef.current) imageFileInputRef.current.value = '';
                               }
                             }}
                          />
                          {/* Upload button removed per requirements */}
                          <button
                            onClick={() => {
                              const token = localStorage.getItem('token');
                              if (!token) { alert('Missing user'); return; }
                              setAssetsTab('templates');
                              setIsGenerate(false);
                              setShowAssetsModal(true);
                              // Load from cache only; ScriptEditor preloads and refreshes cache on mount
                              try {
                                const cacheKey = `brand_assets_images:${token}`;
                                const cached = localStorage.getItem(cacheKey);
                                if (cached) {
                                  const data = JSON.parse(cached);
                                  const logos = Array.isArray(data?.logos) ? data.logos : [];
                                  const icons = Array.isArray(data?.icons) ? data.icons : [];
                                  const uploaded_images = Array.isArray(data?.uploaded_images) ? data.uploaded_images : [];
                                  const templates = Array.isArray(data?.templates) ? data.templates : [];
                                  const documents_images = Array.isArray(data?.documents_images) ? data.documents_images : [];
                                  setAssetsData({ logos, icons, uploaded_images, templates, documents_images });
                                } else {
                                  // Empty state; prompt user to wait for preload
                                  setAssetsData({ logos: [], icons: [], uploaded_images: [], templates: [], documents_images: [] });
                                }
                              } catch(_) {
                                setAssetsData({ logos: [], icons: [], uploaded_images: [], templates: [], documents_images: [] });
                              } finally {
                                setIsAssetsLoading(false);
                              }
                            }}
                            className="flex items-center gap-2 px-3 py-2 rounded-lg border text-sm hover:bg-gray-50"
                            title="Choose from templates"
                          >
                            <File className="w-4 h-4" /> Choose From Template
                          </button>
                          {/* Upload Template button removed per requirements */}
                         </div>
                       </div>
                       
                     )}

                     {(() => {
                       // Anchor-specific options: size and position
                       const scene = scriptRows?.[currentSceneIndex];
                       const modelUpper = String(scene?.model||scene?.mode||'').toUpperCase();
                       if (modelUpper !== 'ANCHOR') return null;
                       const opts = (scene?.anchor_options && typeof scene.anchor_options==='object') ? scene.anchor_options : {};
                       const size = opts.size || '';
                       const position = opts.position || '';
                       const update = (patch) => {
                         const next = { ...(scene?.anchor_options||{}), ...patch };
                         handleSceneUpdate(currentSceneIndex, 'anchor_options', next);
                       };
                       return (
                         <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                           <h4 className="text-lg font-semibold text-gray-800 mb-4">Anchor Options</h4>
                           <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                               <label className="block text-sm font-medium text-gray-700 mb-2">Size</label>
                               <input
                                 type="text"
                                 value={size}
                                 onChange={(e) => update({ size: e.target.value })}
                                 disabled={!isEditingScene}
                                 placeholder="e.g., small, medium, large or px"
                                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                               />
                             </div>
                             <div>
                               <label className="block text-sm font-medium text-gray-700 mb-2">Position</label>
                               <select
                                 value={position}
                                 onChange={(e) => update({ position: e.target.value })}
                                 disabled={!isEditingScene}
                                 className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent disabled:bg-gray-100 disabled:text-gray-600"
                               >
                                 <option value="">Select position</option>
                                 <option value="topleft">Top Left</option>
                                 <option value="topcenter">Top Center</option>
                                 <option value="topright">Top Right</option>
                                 <option value="bottomleft">Bottom Left</option>
                                 <option value="bottomcenter">Bottom Center</option>
                                 <option value="bottomright">Bottom Right</option>
                               </select>
                             </div>
                           </div>
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
            <p className="text-sm text-gray-700 mb-4">This will update visuals to chart type “{pendingChartType}”. Continue?</p>
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
                    const sessionForBody = {
                      session_id: sd?.session_id || sessionId,
                      user_id: sd?.user_id || token,
                      title: sd?.title || '',
                      video_duration: String(sd?.video_duration || sd?.videoduration || '60'),
                      created_at: sd?.created_at || new Date().toISOString(),
                      updated_at: sd?.updated_at || new Date().toISOString(),
                      document_summary: Array.isArray(sd?.document_summary) ? sd.document_summary : [{ additionalProp1: {} }],
                      messages: Array.isArray(sd?.messages) ? sd.messages : [{ additionalProp1: {} }],
                      total_summary: Array.isArray(sd?.total_summary) ? sd.total_summary : (Array.isArray(sd?.totalsummary) ? sd.totalsummary : []),
                      scripts: Array.isArray(sd?.scripts) ? sd.scripts : [''],
                      videos: Array.isArray(sd?.videos) ? sd.videos : [{ additionalProp1: {} }],
                      images: Array.isArray(sd?.images) ? sd.images : [''],
                      final_link: sd?.final_link || '',
                      videoType: sd?.videoType || sd?.video_type || '',
                      brand_style_interpretation: sd?.brand_style_interpretation || { additionalProp1: {} },
                      additionalProp1: sd?.additionalProp1 || {}
                    };
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
            <div className="w-6 h-6 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
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
                {['templates','logos','icons','uploaded_images','documents_images'].map(tab => (
                  <button
                    key={tab}
                    onClick={() => setAssetsTab(tab)}
                    className={`px-3 py-1.5 rounded-full text-sm border ${assetsTab===tab ? 'bg-[#13008B] text-white border-[#13008B]' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >{tab.replace('_',' ')}</button>
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
                    const logos1 = Array.isArray(data1?.logos) ? data1.logos : [];
                    const icons1 = Array.isArray(data1?.icons) ? data1.icons : [];
                    const uploaded_images1 = Array.isArray(data1?.uploaded_images) ? data1.uploaded_images : [];
                    const templates1 = Array.isArray(data1?.templates) ? data1.templates : [];
                    const documents_images1 = Array.isArray(data1?.documents_images) ? data1.documents_images : [];

                    // 2) UPDATE assets (best-effort; echo back current snapshot)
                    const updateBody = {
                      user_id: token,
                      brand_identity: { logos: logos1, icons: icons1, templates: templates1 },
                      uploaded_images: uploaded_images1,
                      documents_images: documents_images1
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
                    const logos = Array.isArray(data2?.logos) ? data2.logos : [];
                    const icons = Array.isArray(data2?.icons) ? data2.icons : [];
                    const uploaded_images = Array.isArray(data2?.uploaded_images) ? data2.uploaded_images : [];
                    const templates = Array.isArray(data2?.templates) ? data2.templates : [];
                    const documents_images = Array.isArray(data2?.documents_images) ? data2.documents_images : [];
                    setAssetsData({ logos, icons, uploaded_images, templates, documents_images });
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
              {isAssetsLoading ? (
                <div className="flex items-center justify-center py-16">
                  <div className="w-10 h-10 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                </div>
              ) : (() => {
                const uploadTypeMap = {
                  templates: 'template',
                  logos: 'logo',
                  icons: 'icon',
                  uploaded_images: 'uploaded_images',
                  documents_images: '' // no upload for documents images per current API scope
                };
                const currentUploadType = uploadTypeMap[assetsTab] || '';
                const isTemplateTab = assetsTab === 'templates';
                const rawList = Array.isArray(assetsData[assetsTab]) ? assetsData[assetsTab] : [];
                const templateFilterOptions = templateAspectOptions.length > 1 ? ['All', ...templateAspectOptions] : templateAspectOptions;
                const showAspectFilterControls = isTemplateTab && shouldFilterTemplatesByAspect && templateFilterOptions.length > 0;
                const effectiveTemplateFilter = showAspectFilterControls
                  ? (templateAspectFilter && (templateAspectFilter === 'All' || templateAspectOptions.includes(templateAspectFilter))
                      ? templateAspectFilter
                      : (templateFilterOptions[0] || 'All'))
                  : '';
                const templateList = isTemplateTab
                  ? normalizedTemplateAssets.filter(item => {
                      if (!showAspectFilterControls || !effectiveTemplateFilter || effectiveTemplateFilter === 'All') return true;
                      const aspectLabel = item.aspect || 'Unspecified';
                      return aspectLabel === effectiveTemplateFilter;
                    })
                  : [];
                const list = isTemplateTab ? templateList : rawList;
                const emptyMessage = isTemplateTab
                  ? (normalizedTemplateAssets.length === 0 ? 'No templates found.' : 'No templates available for this aspect ratio.')
                  : 'No assets found.';
                return (
                  <>
                    {showAspectFilterControls && (
                      <div className="flex flex-wrap items-center gap-2 mb-4">
                        {templateFilterOptions.map(option => {
                          const isActive = option === effectiveTemplateFilter || (!effectiveTemplateFilter && option === templateFilterOptions[0]);
                          return (
                            <button
                              type="button"
                              key={option}
                              onClick={() => setTemplateAspectFilter(option)}
                              className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
                                isActive ? 'bg-[#13008B] text-white border-[#13008B]' : 'bg-white text-gray-700 border-gray-200 hover:border-[#13008B]'
                              }`}
                            >
                              {option === 'All' ? 'All' : option}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                      {currentUploadType && (
                        <button
                          type="button"
                          onClick={() => { setPendingUploadType(currentUploadType); assetsUploadInputRef.current && assetsUploadInputRef.current.click(); }}
                          className="rounded-lg border-2 border-dashed border-gray-300 h-28 flex items-center justify-center text-gray-500 hover:border-[#13008B] hover:text-[#13008B]"
                          title={`Upload ${currentUploadType.replace('_',' ')}`}
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
                        if (isTemplateTab) {
                          const imageUrl = entry?.imageUrl;
                          if (!imageUrl) return null;
                          const isSelected = selectedTemplateUrls.includes(imageUrl);
                          const handleClick = () => {
                            setSelectedTemplateUrls(prev => prev.includes(imageUrl) ? prev.filter(u => u !== imageUrl) : [...prev, imageUrl]);
                          };
                          return (
                            <div
                              key={entry.id || idx}
                              className={`rounded-lg border overflow-hidden group relative bg-white cursor-pointer ${isSelected ? 'ring-2 ring-[#13008B]' : ''}`}
                              onClick={handleClick}
                              title={`${entry.aspect || 'Unspecified'} • ${entry.label || 'Template'}`}
                            >
                              <img src={imageUrl} alt={entry.label || `template-${idx}`} className="w-full h-28 object-cover" />
                              <div className="p-2">
                                <span className="text-xs font-semibold text-gray-800 block">
                                  {entry.aspect || 'Unspecified'}
                                </span>
                                {entry.label && (
                                  <span className="text-[11px] text-gray-600 truncate block">{entry.label}</span>
                                )}
                              </div>
                            </div>
                          );
                        }
                        const url = entry;
                        const isSelected = selectedAssetUrl === url;
                        const handleClick = () => {
                          setSelectedAssetUrl(url);
                        };
                        return (
                          <div
                            key={idx}
                            className={`rounded-lg border overflow-hidden group relative bg-white cursor-pointer ${isSelected ? 'ring-2 ring-[#13008B]' : ''}`}
                            onClick={handleClick}
                            title={url}
                          >
                            <img src={url} alt={`${assetsTab}-${idx}`} className="w-full h-28 object-cover" />
                            <div className="p-2">
                              <span className="text-xs text-gray-700 truncate block" title={url}>
                                {assetsTab.replace('_',' ')} {idx+1}
                              </span>
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
                  disabled={assetsTab==='templates' ? (selectedTemplateUrls.length===0 && !selectedAssetUrl) : !selectedAssetUrl}
                  onClick={async () => {
                    try {
                      const chosen = assetsTab==='templates' ? (selectedTemplateUrls[0] || selectedAssetUrl) : selectedAssetUrl;
                      if (!chosen || !Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) return;
                      // Enforce only one template for Keep Default
                      if (assetsTab==='templates' && selectedTemplateUrls.length > 1) {
                        alert('For Keep Default, you can select only one template.');
                        return;
                      }
                      const rows = [...scriptRows];
                      const scene = { ...rows[currentSceneIndex] };
                      const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                      if (modelUpper === 'ANCHOR' || modelUpper === 'PLOTLY') {
                        scene.background = chosen; scene.background_image = chosen;
                      } else {
                        scene.ref_image = [chosen];
                      }
                      rows[currentSceneIndex] = scene;
                      setScriptRows(rows);
                      setSelectedRefImages([chosen]);
                      if (scene.ref_image) updateRefMapForScene(scene.scene_number, scene.ref_image);
                      // For Keep Default with Templates, persist via update-text setting gen_image=false and ref_image
                      if (assetsTab === 'templates') {
                        try {
                          await updateSceneGenImageFlag(currentSceneIndex, { genImage: false, descriptionOverride: scene?.description ?? '', refImagesOverride: [chosen] });
                        } catch(_) { /* noop */ }
                      }
                      // Keep Default: clear description
                      try {
                        const r2 = [...rows];
                        if (r2[currentSceneIndex]) {
                          r2[currentSceneIndex] = { ...r2[currentSceneIndex], description: '' };
                          setScriptRows(r2);
                        }
                      } catch(_) {}
                      setShowAssetsModal(false);
                      setSelectedAssetUrl('');
                      setSelectedTemplateUrls([]);
                    } catch(_) { /* noop */ }
                  }}
                  className={`px-3 py-2 rounded-lg text-sm border ${
                    (assetsTab==='templates' ? (selectedTemplateUrls.length===0 && !selectedAssetUrl) : !selectedAssetUrl)
                      ? 'bg-gray-50 text-gray-400 border-gray-200 cursor-not-allowed'
                      : 'bg-white text-gray-900 border-gray-300 hover:bg-gray-50'
                  }`}
                >Keep Default</button>
                <button
                  disabled={assetsTab==='templates' ? (selectedTemplateUrls.length===0 && !selectedAssetUrl) : !selectedAssetUrl}
                  onClick={async () => {
                    try {
                      const multi = assetsTab==='templates' ? (selectedTemplateUrls.length > 0 ? selectedTemplateUrls : (selectedAssetUrl ? [selectedAssetUrl] : [])) : (selectedAssetUrl ? [selectedAssetUrl] : []);
                      if (multi.length === 0 || !Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) return;
                      const rows = [...scriptRows];
                      const scene = { ...rows[currentSceneIndex] };
                      const modelUpper = String(scene?.model || scene?.mode || '').toUpperCase();
                      if (modelUpper === 'ANCHOR' || modelUpper === 'PLOTLY') {
                        // Background accepts a single image; use the first
                        const first = multi[0];
                        scene.background = first; scene.background_image = first;
                      } else {
                        // For SORA/infographics, allow multiple templates as ref images
                        scene.ref_image = multi;
                      }
                      rows[currentSceneIndex] = scene;
                      setScriptRows(rows);
                      setSelectedRefImages(multi);
                      if (scene.ref_image) updateRefMapForScene(scene.scene_number, scene.ref_image);
                      setShowAssetsModal(false);
                      setIsEnhancing(true);
                      const sessionId = localStorage.getItem('session_id');
                      const token = localStorage.getItem('token');
                      if (!sessionId || !token) throw new Error('Missing session or user');
                      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
                      });
                      const sessionText = await sessionResp.text();
                      let sessionData; try { sessionData = JSON.parse(sessionText); } catch(_) { sessionData = sessionText; }
                      if (!sessionResp.ok) throw new Error(`user-session/data failed: ${sessionResp.status} ${sessionText}`);
                      const sd = (sessionData?.session_data || sessionData?.session || {});
                      const user = sessionData?.user_data || sd?.user_data || sd?.user || {};
                      const sessionForBody = {
                        session_id: sd?.session_id || sessionId,
                        user_id: sd?.user_id || token,
                        content: Array.isArray(sd?.content) ? sd.content : [],
                        document_summary: Array.isArray(sd?.document_summary) ? sd.document_summary : [{ additionalProp1: {} }],
                        video_duration: String(sd?.video_duration || sd?.videoduration || '60'),
                        created_at: sd?.created_at || new Date().toISOString(),
                        totalsummary: Array.isArray(sd?.totalsummary) ? sd.totalsummary : (Array.isArray(sd?.total_summary) ? sd.total_summary : []),
                        messages: Array.isArray(sd?.messages) ? sd.messages : [],
                        scripts: Array.isArray(sd?.scripts) ? sd.scripts : [{ additionalProp1: {} }],
                        videos: Array.isArray(sd?.videos) ? sd.videos : [],
                        images: Array.isArray(sd?.images) ? sd.images : [],
                        final_link: sd?.final_link || '',
                        videoType: sd?.videoType || sd?.video_type || '',
                        brand_style_interpretation: sd?.brand_style_interpretation,
                        additionalProp1: sd?.additionalProp1 || {}
                      };
                      const sceneNumber = scene?.scene_number ?? (currentSceneIndex + 1);
                      const model = String(scene?.mode || scene?.model || '').toUpperCase();
                      let reqBody = { user, session: sessionForBody, scene_number: sceneNumber };
                      if (model === 'SORA') {
                        reqBody = { ...reqBody, image_links: multi };
                      } else if (model === 'VEO3') {
                        // For visual updates from assets, keep presenter options empty
                        reqBody = { ...reqBody, presenter_options: {} };
                      } else if (model === 'PLOTLY') {
                        const first = multi[0];
                        reqBody = { ...reqBody, chart_type: scene?.chart_type || scene?.chartType || '', background_image: first };
                      } else if (model === 'ANCHOR') {
                        const first = multi[0];
                        reqBody = { ...reqBody, background_image: first };
                      } else {
                        // Default to SORA-style image links if unknown
                        reqBody = { ...reqBody, image_links: multi };
                      }
                      await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-scene-visual', {
                        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(reqBody)
                      });
                      // After visual update, fetch latest session and send update-text with current script (index 0)
                      try {
                        const refreshResp2 = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
                        });
                        const refreshText2 = await refreshResp2.text();
                        let refresh2; try { refresh2 = JSON.parse(refreshText2); } catch(_) { refresh2 = refreshText2; }
                        if (refreshResp2.ok && refresh2 && typeof refresh2 === 'object') {
                          const sd3 = refresh2?.session_data || refresh2?.session || {};
                          const user3 = refresh2?.user_data || sd3?.user_data || sd3?.user || {};
                          const sessionForBody3 = {
                            session_id: sd3?.session_id || sessionId,
                            user_id: sd3?.user_id || token,
                            content: Array.isArray(sd3?.content) ? sd3.content : [],
                            document_summary: Array.isArray(sd3?.document_summary) ? sd3.document_summary : [{ additionalProp1: {} }],
                            video_duration: String(sd3?.video_duration || sd3?.videoduration || '60'),
                            created_at: sd3?.created_at || new Date().toISOString(),
                            totalsummary: Array.isArray(sd3?.totalsummary) ? sd3.totalsummary : (Array.isArray(sd3?.total_summary) ? sd3.total_summary : []),
                            messages: Array.isArray(sd3?.messages) ? sd3.messages : [],
                            scripts: Array.isArray(sd3?.scripts) ? sd3.scripts : [{ additionalProp1: {} }],
                            videos: Array.isArray(sd3?.videos) ? sd3.videos : [],
                            images: Array.isArray(sd3?.images) ? sd3.images : [],
                            final_link: sd3?.final_link || '',
                            videoType: sd3?.videoType || sd3?.video_type || '',
                            brand_style_interpretation: sd3?.brand_style_interpretation,
                            additionalProp1: sd3?.additionalProp1 || {}
                          };
                          const scriptsArr = Array.isArray(sd3?.scripts) ? sd3.scripts : [];
                          const currentScriptObj = scriptsArr[0] || {};
                          // Normalize script object to update-text "changed_script" shape
                          const changed_script = currentScriptObj?.airesponse && currentScriptObj?.userquery
                            ? { userquery: currentScriptObj.userquery, airesponse: currentScriptObj.airesponse, version: String(currentScriptObj.version || 'v1') }
                            : (currentScriptObj?.script
                              ? { userquery: (currentScriptObj.script?.userquery || []), airesponse: (currentScriptObj.script?.airesponse || []), version: String(currentScriptObj.script?.version || 'v1') }
                              : { userquery: [], airesponse: [], version: 'v1' });
                          const updateBody = { user: user3, session: sessionForBody3, changed_script };
                          await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/scripts/update-text', {
                            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(updateBody)
                          });
                        }
                      } catch(_) { /* noop */ }
                      // refresh
                      try {
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
                      } finally { setIsEnhancing(false); setSelectedAssetUrl(''); setSelectedTemplateUrls([]); }
                    } catch(_) { setIsEnhancing(false); /* noop */ }
                  }}
                   className={`px-3 py-2 rounded-lg text-sm text-white ${
                    (assetsTab==='templates' ? (selectedTemplateUrls.length===0 && !selectedAssetUrl) : !selectedAssetUrl)
                      ? 'bg-blue-300 cursor-not-allowed'
                      : 'bg-[#13008B] hover:bg-blue-800'
                   }`}
                >Generate</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {isEnhancing && (
        <div className="fixed inset-0 z-[75] flex items-center justify-center bg-black/40">
          <div className="bg-white w-[90%] max-w-sm rounded-lg shadow-xl p-6 text-center">
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
            <h4 className="text-lg font-semibold text-gray-900">Enhancing description…</h4>
            <p className="mt-1 text-sm text-gray-600">Applying selected image to scene.</p>
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
                <label className="block text-sm font-medium text-gray-700 mb-1">Video Type</label>
                <div className="flex items-center gap-4">
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="regen-model" checked={regenModel==='VEO3'} onChange={()=>setRegenModel('VEO3')} disabled={isRegenerating} />
                        <span>Avatar</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="regen-model" checked={regenModel==='SORA'} onChange={()=>setRegenModel('SORA')} disabled={isRegenerating} />
                        <span>Infographic</span>
                      </label>
                      <label className="inline-flex items-center gap-2 cursor-pointer">
                        <input type="radio" name="regen-model" checked={regenModel==='PLOTLY'} onChange={()=>setRegenModel('PLOTLY')} disabled={isRegenerating} />
                        <span>Financial</span>
                      </label>
                      {regenModel==='PLOTLY' && (
                        <div className="ml-4">
                          <label className="block text-sm font-medium text-gray-700 mb-1">Chart Type</label>
                          <select value={regenChartType} onChange={(e)=>setRegenChartType(e.target.value)} className="w-full p-2 border rounded">
                            <option value="">Select</option>
                            <option value="bar">bar</option>
                            <option value="grouped_bar">grouped_bar</option>
                            <option value="stacked_bar">stacked_bar</option>
                            <option value="waterfall">waterfall</option>
                            <option value="line">line</option>
                            <option value="multi_line">multi_line</option>
                            <option value="area">area</option>
                            <option value="pie">pie</option>
                            <option value="donut">donut</option>
                            <option value="treemap">treemap</option>
                            <option value="scatter">scatter</option>
                            <option value="bubble">bubble</option>
                            <option value="heatmap">heatmap</option>
                            <option value="combo_bar_line">combo_bar_line</option>
                            <option value="funnel">funnel</option>
                            <option value="histogram">histogram</option>
                            <option value="box">box</option>
                            <option value="candlestick">candlestick</option>
                          </select>
                          <div className="mt-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Chart Data (JSON)</label>
                            <textarea value={regenChartData} onChange={(e)=>setRegenChartData(e.target.value)} rows={4} className="w-full p-2 border rounded" placeholder='{"labels":["A","B"],"values":[10,20]}' />
                          </div>
                          {regenDocSummary && (
                            <div className="mt-2">
                              <label className="block text-sm font-medium text-gray-700 mb-1">Document Summary</label>
                              <div className="max-h-40 overflow-auto p-3 border rounded bg-white text-sm text-gray-800 whitespace-pre-wrap">{regenDocSummary}</div>
                            </div>
                          )}
                        </div>
                      )}
                </div>
              </div>
              {regenStep === 1 && (
                <div className="flex justify-end pt-1">
                  <button
                    onClick={async ()=>{ const total = Array.isArray(scriptRows) ? scriptRows.length : 0; const idx = Math.min(Math.max(0, currentSceneIndex), Math.max(0, total)); await fetchSceneSuggestions(regenModel || 'SORA', idx, 'regen'); setRegenStep(2); }}
                    className="px-4 py-2 rounded-lg text-sm font-medium text-white bg-[#13008B] hover:bg-blue-800"
                  >
                    Continue
                  </button>
                </div>
              )}
              {regenStep === 2 && (
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
                            onClick={() => { setRegenSelectedIdx(i); setRegenSceneContent((((sug?.title ? (sug.title+': ') : '') + (sug?.content || '')).trim())); }}
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
              {(regenDocSummary || regenSceneContent) && (
                <div className="mt-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Selected Scene Content</label>
                  <div className="max-h-40 overflow-auto p-3 border rounded bg-white text-sm text-gray-800 whitespace-pre-wrap">{regenDocSummary || regenSceneContent}</div>
                </div>
              )}
              
              {regenStep === 2 && (
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
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
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
              
               
               <div className="flex gap-2 lg:gap-3">
                 <div className="flex-1 relative mt-3">
                 <textarea
                   ref={chatInputRef}
                   rows={1}
                   placeholder="Talk to me or upload the documents you want to summarize"
                   className="w-full px-3 py-2 lg:py-3 pr-28 lg:pr-36 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none text-sm lg:text-base leading-5 resize-none overflow-hidden scrollbar-hide whitespace-pre-wrap break-words"
                   value={inputMessage}
                   onChange={(e) => {
                     setInputMessage(e.target.value);
                     try {
                       if (chatInputRef.current) {
                         chatInputRef.current.style.height = 'auto';
                         chatInputRef.current.style.height = chatInputRef.current.scrollHeight + 'px';
                       }
                     } catch (_) { /* noop */ }
                   }}
                   onKeyDown={handleKeyPress}
                   disabled={isLoading}
                 />
                 <div className="absolute right-2 lg:right-3 bottom-2 flex gap-1 lg:gap-2">
                   {/* Send Button */}
                   <button
                     onClick={handleSendMessage}
                     disabled={!inputMessage.trim() || isLoading}
                     className={`p-1.5 lg:p-2 rounded-lg transition-colors ${
                       inputMessage.trim() && !isLoading
                         ? 'text-purple-600 hover:text-purple-700 hover:bg-purple-50'
                         : 'text-gray-400 cursor-not-allowed'
                     }`}
                   >
                     <Send className="w-4 h-4 lg:w-5 lg:h-5" />
                   </button>
                   
                   {/* File Upload Button */}
                   <button 
                     onClick={() => fileInputRef.current?.click()}
                     className="p-1.5 lg:p-2 text-gray-400 hover:text-gray-600 transition-colors"
                  title="Upload Documents (PDF, PPT, PPTX, DOC, DOCX, CSV, XLS, XLSX)"
                   >
                     <Paperclip className="w-4 h-4 lg:w-5 lg:h-5" />
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
    </div>
  )
}

export default Chat;
