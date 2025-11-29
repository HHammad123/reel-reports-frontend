import React, { useEffect, useState, useCallback, useRef } from 'react';
import { ChevronDown, Pencil, RefreshCw, Upload } from 'lucide-react';
import ImageEditor from './ImageEditor';
import ImageEdit from '../../pages/ImageEdit';
import html2canvas from 'html2canvas';
import ChartEditorModal from './ChartEditorModal';
import useOverlayBackgroundRemoval from '../../hooks/useOverlayBackgroundRemoval';

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
  // VEO3 Avatar management
  const [showAvatarManager, setShowAvatarManager] = useState(false);
  const [managingAvatarSceneNumber, setManagingAvatarSceneNumber] = useState(null);
  const [avatarUrls, setAvatarUrls] = useState(['', '']); // Array of avatar URLs
  const [isUpdatingAvatars, setIsUpdatingAvatars] = useState(false);
  // Upload background state
  const [showUploadBackgroundPopup, setShowUploadBackgroundPopup] = useState(false);
  const [uploadedBackgroundFile, setUploadedBackgroundFile] = useState(null);
  const [uploadedBackgroundPreview, setUploadedBackgroundPreview] = useState(null);
  const [isUploadingBackground, setIsUploadingBackground] = useState(false);
  const [uploadingBackgroundSceneNumber, setUploadingBackgroundSceneNumber] = useState(null);
  const [uploadFrames, setUploadFrames] = useState(['background']); // For upload: ['opening'], ['closing'], ['background'], or combinations
  const [imageNaturalDims, setImageNaturalDims] = useState({});
  const [isSceneUpdating, setIsSceneUpdating] = useState(false);
  // Edit description/narration state
  const [editingField, setEditingField] = useState(null); // 'description' | 'narration' | null
  const [editedDescription, setEditedDescription] = useState('');
  const [editedNarration, setEditedNarration] = useState('');
  const [isSavingField, setIsSavingField] = useState(false);
  // Track if regenerate popup is for editing description
  const [isRegenerateForDescription, setIsRegenerateForDescription] = useState(false);
  const [showChartEditor, setShowChartEditor] = useState(false);
  const [chartEditorData, setChartEditorData] = useState(null);
  const [chartEditorLoading, setChartEditorLoading] = useState(false);
  const [chartEditorError, setChartEditorError] = useState('');
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
  const activeSceneNumber = selected?.sceneNumber || selected?.scene_number || 1;
  
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
  
  // State for active image tab (0 for Image 1/Avatar, 1 for Image 2/Image)
  const [activeImageTab, setActiveImageTab] = useState(0);
  // Cache-busting value for chart overlays - updates when scene changes to ensure fresh chart images
  const chartCacheBuster = React.useMemo(() => {
    return `${activeSceneNumber}_${Date.now()}`;
  }, [activeSceneNumber]);
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
        if (!updated.transitionPreset && transitionPresets[0]) {
          updated = { ...updated, transitionPreset: transitionPresets[0], transitionCustom: null };
          changed = true;
        }
        if (!updated.voiceOption) {
          updated = { ...updated, voiceOption: 'male' };
          changed = true;
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

const normalizeImageUrl = useCallback((url) => {
  if (!url || typeof url !== 'string') return ''
  return url.trim().split('?')[0].replace(/\/$/, '')
}, [])

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
    console.log(`⚠️ ${fieldName?.toUpperCase?.() || fieldName} | scene ${sceneNumber} | no sources provided`)
    return ''
  }

  for (const source of sources) {
    const rawValue = typeof source?.value === 'string' ? source.value : ''
    if (rawValue && rawValue.trim()) {
      console.log(
        `✅ ${fieldName?.toUpperCase?.() || fieldName} | scene ${sceneNumber} | path: ${source.path}`,
        rawValue
      )
      return rawValue.trim()
    }
  }

  console.log(
    `⚠️ ${fieldName?.toUpperCase?.() || fieldName} | scene ${sceneNumber} | no value found. Paths checked:`,
    sources.map((src) => src.path)
  )
  return ''
}

// Helper function to extract avatar URLs from current version of image object
const getAvatarUrlsFromImageVersion = (imageVersionData, currentVersion, model) => {
  const modelUpper = String(model || '').toUpperCase();
  const isVEO3 = modelUpper === 'VEO3' || modelUpper === 'ANCHOR';
  
  if (!isVEO3 || !imageVersionData) {
    return [];
  }
  
  // Extract avatar URLs from session data images structure (same as list area)
  // Structure: it.images[current_version].avatar_urls
  if (typeof imageVersionData === 'object' && !Array.isArray(imageVersionData)) {
    // Get the current version key
    const versionKey = currentVersion || imageVersionData?.current_version || imageVersionData?.currentVersion || 'v1';
    
    // Get the version object (same as: imagesContainer[versionKey] in list area)
    const versionObj = imageVersionData[versionKey] || imageVersionData.v1 || {};
    
    console.log(`🔍 getAvatarUrlsFromImageVersion: versionKey=${versionKey}`);
    console.log(`🔍 Version object keys:`, Object.keys(versionObj));
    
    // Extract avatar_urls from current version (same as: verObj?.avatar_urls in list area)
    let avatarUrls = versionObj?.avatar_urls;
    
    console.log(`🔍 Avatar URLs from version object (${versionKey}):`, avatarUrls);
    
    // If not found in version object, check root level (fallback)
    if (!avatarUrls || !Array.isArray(avatarUrls) || avatarUrls.length === 0) {
      avatarUrls = imageVersionData?.avatar_urls;
      console.log(`🔍 Avatar URLs from root level (fallback):`, avatarUrls);
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
      
      console.log(`✅ Extracted avatar URLs from session data images:`, extracted);
      return extracted;
    }
  }
  
  console.log(`❌ No avatar URLs found in imageVersionData from session data`);
  return [];
}

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
        
        // Priority 1: Extract from imageVersionData current_version
        if (row?.imageVersionData && typeof row.imageVersionData === 'object') {
          const imgContainer = row.imageVersionData
          const vKey = imgContainer.current_version || imgContainer.currentVersion || 'v1'
          const vObj = imgContainer[vKey] || imgContainer.v1 || {}
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
        
        // Combine images and avatar_urls from current version, removing duplicates
        const combined = [...new Set([...imageRefs, ...avatarUrls])].filter(Boolean)
        return combined // Return all combined images for VEO3
      }
      
      // For non-VEO3 models, return only images from current version (max 2)
      return imageRefs.slice(0, 2)
    },
    [getOrderedRefs]
  )

  const normalizeSimpleUrl = useCallback((url) => (typeof url === 'string' ? url.trim() : ''), [])

  const getAvatarUrlSet = useCallback(
    (row) => {
      return new Set(
        (Array.isArray(row?.avatar_urls) ? row.avatar_urls : [])
          .map((entry) => {
            if (typeof entry === 'string') return normalizeSimpleUrl(entry)
            return normalizeSimpleUrl(
              entry?.imageurl ||
                entry?.imageUrl ||
                entry?.image_url ||
                entry?.url ||
                entry?.src ||
                entry?.link ||
                entry?.avatar_url ||
                ''
            )
          })
          .filter(Boolean)
      )
    },
    [normalizeSimpleUrl]
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
      } else {
      }
    } catch (error) {
    }
  }, []);

  // Auto-select logo and voiceover based on session assets API response
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
    
    // Set logo needed based on whether logo_url exists
    const sessionLogoUrl = sessionAssets.logo_url;
    const hasLogo = sessionLogoUrl && typeof sessionLogoUrl === 'string' && sessionLogoUrl.trim().length > 0;
    
    setSceneAdvancedOptions(prev => {
      const updated = { ...prev };
      let hasChanges = false;
      
      sceneNumbers.forEach(sceneNum => {
        const currentOptions = updated[sceneNum] || {};
        // Only update if the value is different to avoid unnecessary re-renders
        if (currentOptions.logoNeeded !== hasLogo) {
          updated[sceneNum] = {
            ...currentOptions,
            logoNeeded: hasLogo
          };
          hasChanges = true;
        }
      });
      
      return hasChanges ? updated : prev;
    });
    
    // Check voiceover match (requires brandAssets)
    if (brandAssets) {
      const sessionVoiceUrl = sessionAssets.voice_url || (sessionAssets.voice_urls && Object.values(sessionAssets.voice_urls)[0]);
      if (sessionVoiceUrl) {
        const normalizedSessionVoice = normalizeUrl(sessionVoiceUrl);
        
        // Get brand voiceovers
        const brandVoiceovers = Array.isArray(brandAssets.voiceover) 
          ? brandAssets.voiceover 
          : Array.isArray(brandAssets.voiceovers) 
          ? brandAssets.voiceovers 
          : [];
        
        // Find matching voiceover
        const matchingVoiceover = brandVoiceovers.find(vo => {
          const voUrl = typeof vo === 'string' ? vo : (vo?.url || vo?.link || '');
          if (!voUrl) return false;
          const normalizedVoUrl = normalizeUrl(voUrl);
          return normalizedVoUrl === normalizedSessionVoice;
        });
        
        // If match found, set voiceUrl for all scenes
        if (matchingVoiceover) {
          const matchedUrl = typeof matchingVoiceover === 'string' 
            ? matchingVoiceover 
            : (matchingVoiceover?.url || matchingVoiceover?.link || '');
          
          if (matchedUrl) {
            setSceneAdvancedOptions(prev => {
              const updated = { ...prev };
              sceneNumbers.forEach(sceneNum => {
                updated[sceneNum] = {
                  ...(updated[sceneNum] || {}),
                  voiceUrl: matchedUrl,
                  voiceOption: matchingVoiceover?.name || matchingVoiceover?.type || 'custom'
                };
              });
              return updated;
            });
          }
        }
      }
    }
  }, [sessionAssets, brandAssets, rows]);

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
          const version = imagesRoot.current_version || 'v1';
          const vObj = imagesRoot[version] || imagesRoot.v1 || {};
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
	            pushRow(1, imagesRoot?.scene_title || 'Images', refs, {
	              description: descriptionForRoot,
	              narration: narrationForRoot,
              textToBeIncluded: imagesRoot?.text_to_be_included || '',
              imageDimensions,
              textElements,
              imageVersionData: imagesRoot,
              imageFrames: arr,
              isEditable: true,
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
              const versionKey = imagesContainer.current_version || imagesContainer.currentVersion || 'v1';
              const verObj = imagesContainer[versionKey] || imagesContainer.v1 || {};
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
                const meta = {
                  description: descriptionForSc,
                  narration: narrationForSc,
                  textToBeIncluded: sc?.text_to_be_included || sc?.textToBeIncluded || sc?.include_text || '',
                  model: sc?.model || sc?.mode || '',
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
                const versionKey = it.images.current_version || it.images.currentVersion || 'v1';
                const verObj = it.images[versionKey] || it.images.v1 || {};
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
              
              const meta = {
                description: descriptionForIt2,
                narration: narrationForIt2,
                textToBeIncluded: it?.text_to_be_included || it?.textToBeIncluded || it?.include_text || '',
                model: it?.model || it?.mode || '',
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
          const meta = {
            description: descriptionForSc2,
            narration: narrationForSc2,
            textToBeIncluded: sc?.text_to_be_included || sc?.textToBeIncluded || sc?.include_text || '',
            model: sc?.model || sc?.mode || '',
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
          const meta = {
            description: scene?.desc || scene?.description || scene?.scene_description || '',
            narration: scene?.narration || scene?.voiceover || '',
            textToBeIncluded: scene?.text_to_be_included || scene?.textToBeIncluded || scene?.include_text || '',
            model: modelUpper,
            // Store avatar_urls in metadata for VEO3 only
            ...(isVEO3 && avatarUrls.length > 0 ? { avatar_urls: avatarUrls } : {}),
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
        const scripts = Array.isArray(sessionData?.scripts) && sessionData.scripts.length > 0 ? sessionData.scripts : [];
        setScriptsData(scripts); // Store scripts data for console logging
        // scripts[0] has the latest version (e.g., v9) - use index 0 for latest script
        const currentScript = scripts[0] || null;
        const airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];
        
        // Extract tone from script for matching voiceovers
        // Path: userquery[0].guidelines.purpose_and_audience.tone
        const userQueryArr = Array.isArray(currentScript?.userquery) ? currentScript.userquery : [];
        const firstUserQuery = userQueryArr[0] || {};
        
        // Check both paths: direct and under guidelines
        const guidelines = firstUserQuery?.guidelines || {};
        
        const purposeAndAudience = guidelines?.purpose_and_audience || guidelines?.purposeAndAudience || 
                                   firstUserQuery?.purpose_and_audience || firstUserQuery?.purposeAndAudience || {};
        
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
        
        const sessionImages = mapSessionImages(sdata?.session_data?.images, veo3ScriptScenesByNumber, allScriptScenesByNumber);
        if (!cancelled && sessionImages.length > 0) {
          setRows(sessionImages);
          const initialImages = getSceneImages(sessionImages[0]);
          const first = getPrimaryImage(sessionImages[0]);
          const model0 = String(sessionImages[0]?.model || sessionImages[0]?.mode || '').toUpperCase();
          const firstScene = sessionImages[0];
          
          // Get current version from images object
          const imageVersionData = firstScene?.imageVersionData || null;
          const imagesCurrentVersion = imageVersionData?.current_version || imageVersionData?.currentVersion || firstScene?.current_version || 'v1';
          
          // Console log current version in images object and scripts array
          console.log('═══════════════════════════════════════════════════════════');
          console.log(`🎯 INITIAL SCENE SELECTED: Scene ${firstScene?.scene_number || 1}`);
          console.log('═══════════════════════════════════════════════════════════');
          console.log(`📦 CURRENT_VERSION in images object:`, imagesCurrentVersion);
          console.log(`📋 Images Object (imageVersionData):`, imageVersionData);
          if (imageVersionData && imagesCurrentVersion) {
            const versionObj = imageVersionData[imagesCurrentVersion] || imageVersionData.v1 || {};
            console.log(`📋 Version Object (${imagesCurrentVersion}):`, JSON.stringify(versionObj, null, 2));
          }
          console.log(`📜 Scripts Array:`, scripts);
          if (scripts && scripts.length > 0) {
            scripts.forEach((script, idx) => {
              const scriptVersion = script?.current_version || script?.currentVersion || 'v1';
              console.log(`📜 Script ${idx + 1} - Current Version:`, scriptVersion);
              if (scriptVersion && script[scriptVersion]) {
                console.log(`📜 Script ${idx + 1} - Version Object (${scriptVersion}):`, JSON.stringify(script[scriptVersion], null, 2));
              }
            });
          }
          console.log('═══════════════════════════════════════════════════════════');
          
          // Get avatar URLs from current version of image object for VEO3 scenes
          const avatarUrlsFromVersion = getAvatarUrlsFromImageVersion(
            imageVersionData,
            firstScene?.current_version || 'v1',
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
            current_version: firstScene?.current_version || 'v1',
            isEditable: !!firstScene?.isEditable
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
                const assetsResp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/session-assets/${encodeURIComponent(session_id)}?user_id=${encodeURIComponent(user_id)}`);
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
                // Examples:
                // - [{ name: "...", preservation_notes: {...} }, ...]
                // - { presets: [...] }
                // - { data: [...] }
                // - { transition_presets: { presets: [...], custom: [...] } }
                const presetsRoot = (presetsData && presetsData.transition_presets) || presetsData || [];
                let presetsArray = [];
                if (Array.isArray(presetsRoot)) {
                  presetsArray = presetsRoot;
                } else if (presetsRoot && Array.isArray(presetsRoot.presets)) {
                  presetsArray = presetsRoot.presets;
                } else if (presetsRoot && Array.isArray(presetsRoot.data)) {
                  presetsArray = presetsRoot.data;
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
                    const scripts = Array.isArray(sessionData?.scripts) && sessionData.scripts.length > 0 ? sessionData.scripts : [];
                    setScriptsData(scripts); // Store scripts data for console logging
                    // scripts[0] has the latest version (e.g., v9) - use index 0 for latest script
                    const currentScript = scripts[0] || null;
                    const airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];
                
                // Extract tone from script for matching voiceovers
                // Path: userquery[0].guidelines.purpose_and_audience.tone
                const userQueryArr = Array.isArray(currentScript?.userquery) ? currentScript.userquery : [];
                const firstUserQuery = userQueryArr[0] || {};
                
                // Check both paths: direct and under guidelines
                const guidelines = firstUserQuery?.guidelines || {};
                
                const purposeAndAudience = guidelines?.purpose_and_audience || guidelines?.purposeAndAudience || 
                                   firstUserQuery?.purpose_and_audience || firstUserQuery?.purposeAndAudience || {};
                
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
                        
                        // Get current version from images object
                        const imageVersionData = firstScene?.imageVersionData || null;
                        const imagesCurrentVersion = imageVersionData?.current_version || imageVersionData?.currentVersion || firstScene?.current_version || 'v1';
                        
                        // Console log current version in images object and scripts array
                        console.log('═══════════════════════════════════════════════════════════');
                        console.log(`🎯 SCENE SELECTED (After Polling): Scene ${firstScene?.scene_number || 1}`);
                        console.log('═══════════════════════════════════════════════════════════');
                        console.log(`📦 CURRENT_VERSION in images object:`, imagesCurrentVersion);
                        console.log(`📋 Images Object (imageVersionData):`, imageVersionData);
                        if (imageVersionData && imagesCurrentVersion) {
                          const versionObj = imageVersionData[imagesCurrentVersion] || imageVersionData.v1 || {};
                          console.log(`📋 Version Object (${imagesCurrentVersion}):`, JSON.stringify(versionObj, null, 2));
                        }
                        console.log(`📜 Scripts Array:`, scripts);
                        if (scripts && scripts.length > 0) {
                          scripts.forEach((script, idx) => {
                            const scriptVersion = script?.current_version || script?.currentVersion || 'v1';
                            console.log(`📜 Script ${idx + 1} - Current Version:`, scriptVersion);
                            if (scriptVersion && script[scriptVersion]) {
                              console.log(`📜 Script ${idx + 1} - Version Object (${scriptVersion}):`, JSON.stringify(script[scriptVersion], null, 2));
                            }
                          });
                        }
                        console.log('═══════════════════════════════════════════════════════════');
                        
                      // Get avatar URLs from current version of image object for VEO3 scenes
                      const avatarUrlsFromVersion2 = getAvatarUrlsFromImageVersion(
                        imageVersionData,
                        firstScene?.current_version || 'v1',
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
                          current_version: firstScene?.current_version || 'v1',
                          isEditable: !!firstScene?.isEditable
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
                    const assetsResp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/session-assets/${encodeURIComponent(session_id)}?user_id=${encodeURIComponent(user_id)}`);
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
                    const presetsRoot = (presetsData && presetsData.transition_presets) || presetsData || [];
                    let presetsArray = [];
                    if (Array.isArray(presetsRoot)) {
                      presetsArray = presetsRoot;
                    } else if (presetsRoot && Array.isArray(presetsRoot.presets)) {
                      presetsArray = presetsRoot.presets;
                    } else if (presetsRoot && Array.isArray(presetsRoot.data)) {
                      presetsArray = presetsRoot.data;
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

  // Expose load function for refresh - recreate the load logic without cancellation
  const refreshLoad = React.useCallback(async () => {
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
            const version = imagesRoot.current_version || 'v1';
            const vObj = imagesRoot[version] || imagesRoot.v1 || {};
            const arr = Array.isArray(vObj?.images) ? vObj.images : [];
            if (arr.length > 0) {
                const modelUpper = String(imagesRoot?.model || imagesRoot?.mode || '').toUpperCase();
                const isSora = modelUpper === 'SORA';
                console.log(`📦 CURRENT_VERSION for single object:`, version);
                console.log(`📋 VERSION OBJECT (${version}) for single object:`, JSON.stringify(vObj, null, 2));
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
              const versionKey = imagesContainer.current_version || imagesContainer.currentVersion || 'v1';
              const verObj = imagesContainer[versionKey] || imagesContainer.v1 || {};
              const arr = Array.isArray(verObj?.images) ? verObj.images : [];
              
              console.log(`📌 CURRENT_VERSION:`, versionKey);
              console.log(`📋 VERSION OBJECT (${versionKey}):`, verObj);
              
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
              const versionKey = imagesContainer.current_version || imagesContainer.currentVersion || 'v1';
              const verObj = imagesContainer[versionKey] || imagesContainer.v1 || {};
              const arr = Array.isArray(verObj?.images) ? verObj.images : [];
              
              console.log(`📌 CURRENT_VERSION:`, versionKey);
              console.log(`📋 VERSION OBJECT (${versionKey}):`, verObj);
              
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
                currentVersionKey = it.images.current_version || it.images.currentVersion || 'v1';
                versionData = it.images[currentVersionKey] || it.images.v1 || it;
                
                console.log(`📌 CURRENT_VERSION:`, currentVersionKey);
                console.log(`📋 VERSION OBJECT (${currentVersionKey}):`, versionData);
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
                  const vKey = imgContainer.current_version || imgContainer.currentVersion || 'v1';
                  const vObj = imgContainer[vKey] || imgContainer.v1 || {};
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
              
              pushRow(it?.scene_number ?? (idx + 1), it?.scene_title || it?.title, refs, {
                description,
                narration,
                textToBeIncluded: it?.text_to_be_included || '',
                imageDimensions,
                textElements,
                overlayElements,
                imageVersionData: it?.images || it,
                imageFrames: Array.isArray(it?.images) ? it.images : [it],
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
        const initialImages = getSceneImages(sessionImages[0]);
        const first = initialImages[0] || '';
        const model0 = String(sessionImages[0]?.model || '').toUpperCase();
        const imgs = initialImages;
        const firstScene = sessionImages[0];
        
        // Get current version from images object
        const imageVersionData = firstScene?.imageVersionData || null;
        const imagesCurrentVersion = imageVersionData?.current_version || imageVersionData?.currentVersion || firstScene?.current_version || 'v1';
        
        // Console log current version in images object and scripts array
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`🎯 SCENE SELECTED (Refresh Load): Scene ${firstScene?.scene_number || 1}`);
        console.log('═══════════════════════════════════════════════════════════');
        console.log(`📦 CURRENT_VERSION in images object:`, imagesCurrentVersion);
        console.log(`📋 Images Object (imageVersionData):`, imageVersionData);
        if (imageVersionData && imagesCurrentVersion) {
          const versionObj = imageVersionData[imagesCurrentVersion] || imageVersionData.v1 || {};
          console.log(`📋 Version Object (${imagesCurrentVersion}):`, JSON.stringify(versionObj, null, 2));
        }
        console.log(`📜 Scripts Array:`, scriptsData);
        if (scriptsData && scriptsData.length > 0) {
          scriptsData.forEach((script, idx) => {
            const scriptVersion = script?.current_version || script?.currentVersion || 'v1';
            console.log(`📜 Script ${idx + 1} - Current Version:`, scriptVersion);
            if (scriptVersion && script[scriptVersion]) {
              console.log(`📜 Script ${idx + 1} - Version Object (${scriptVersion}):`, JSON.stringify(script[scriptVersion], null, 2));
            }
          });
        }
        console.log('═══════════════════════════════════════════════════════════');
        
        // Get avatar URLs from current version of image object for VEO3 scenes
        const avatarUrlsFromVersion3 = getAvatarUrlsFromImageVersion(
          imageVersionData,
          firstScene?.current_version || 'v1',
          model0
        );
        const finalAvatarUrls3 = avatarUrlsFromVersion3.length > 0 
          ? avatarUrlsFromVersion3 
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
          avatar_urls: finalAvatarUrls3,
          current_version: firstScene?.current_version || 'v1',
          isEditable: !!firstScene?.isEditable
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
    setRegeneratingSceneNumber(sceneNumber);
    setRegenerateUserQuery('');
    setError(''); // Clear any previous errors
    setIsRegenerateForDescription(false); // Mark that this is for regenerate (not edit description)
    
    // Get the model for this scene
    const model = getSceneModel(sceneNumber);
    
    // Set default frames based on model
    if (isVEO3Model(model) || isANCHORModel(model)) {
      setRegenerateFrames(['background']); // VEO3/ANCHOR always use background
    } else {
      // For all other models (SORA, PLOTLY, etc.): default to both frames
      setRegenerateFrames(['opening', 'closing']);
    }
    
    // Reset save as new version to false
    setRegenerateSaveAsNewVersion(false);
    
    setShowRegeneratePopup(true);
  }, [getSceneModel, isSORAModel, isVEO3Model, isANCHORModel]);

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
      if (isVEO3Model(model) || isANCHORModel(model)) {
        // VEO3/ANCHOR: always regenerate background only
        framesToRegenerate = ['background'];
      } else {
        // For all other models (SORA, PLOTLY, etc.): use selected frames (opening, closing, or both)
        framesToRegenerate = regenerateFrames.length > 0 ? regenerateFrames : ['opening', 'closing'];
      }

      // Build request payload
      const payload = {
        user_id: user_id,
        session_id: session_id,
        scene_number: regeneratingSceneNumber,
        model: model,
        action: 'regenerate',
        user_query: regenerateUserQuery.trim(),
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
        
        // Close popup
        setShowRegeneratePopup(false);
        setRegenerateUserQuery('');
        setRegeneratingSceneNumber(null);
        setIsRegenerateForDescription(false);
        // Reset regenerate options to defaults
        setRegenerateFrames(['opening', 'closing']);
        setRegenerateSaveAsNewVersion(false);
        
        // Reload the page after regenerate API completes
        window.location.reload();
      } else {
        throw new Error('Regenerate API did not return success');
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
    getSceneModel, 
    isSORAModel, 
    isVEO3Model, 
    isANCHORModel, 
    getAspectRatio, 
    refreshLoad
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
        // Close popup
        setShowAvatarManager(false);
        setManagingAvatarSceneNumber(null);
        setAvatarUrls(['', '']);
        
        // Reload the page after VEO3 avatar URL API completes
        window.location.reload();
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
        // SORA, ANCHOR, PLOTLY, and others: use selected frames (opening, closing, or both)
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
      // Close popup immediately
      setShowUploadBackgroundPopup(false);
      setUploadedBackgroundFile(null);
      setUploadedBackgroundPreview(null);
      setUploadingBackgroundSceneNumber(null);
      
      // Reload the page after upload API completes
      window.location.reload();
    } catch (e) {
      setError(e?.message || 'Failed to upload background');
    } finally {
      // Loader turns off only after everything is complete (including refreshLoad + image display)
      setIsUploadingBackground(false);
      setIsLoading(false);
    }
  }, [uploadedBackgroundFile, uploadingBackgroundSceneNumber, uploadFrames, getSceneModel, getAspectRatio, isVEO3Model]);

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
        ctx.drawImage(overlayImg, ox, oy, ow, oh);
      } catch (_) {
        // Skip overlay on failure, continue with the rest
      }
    }
  };

  const mergeFrameToDataUrl = React.useCallback(
    async (frame, fallbackDimensions = null, options = {}) => {
      const { includeOverlays = true } = options;
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

      if (textEls.length > 0) {
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
          // Fallback: just render the raw image at its natural size
          const imgEl = await loadImageElement(imageUrl);
          const width = imgEl.naturalWidth || imgEl.width || 1280;
          const height = imgEl.naturalHeight || imgEl.height || 720;
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
      setRows((prevRows) =>
        prevRows.map((row) => {
          const rowSceneNumber = row?.scene_number ?? row?.sceneNumber;
          if (rowSceneNumber !== sceneNumber) return row;
          const updatedRow = { ...row };
          if (Array.isArray(row.imageFrames)) {
            updatedRow.imageFrames = row.imageFrames.map((frame, idx) => {
              if (idx !== imageIndex) return frame;
              return {
                ...frame,
                text_elements: textElements,
                overlay_elements: overlayElements
              };
            });
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
        next.textElements = textElements;
        if (Array.isArray(prev.imageFrames)) {
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
    const node = document.querySelector(selector);
    if (!node) {
      return null;
    }
    try {
      const canvas = await html2canvas(node, {
        useCORS: true,
        logging: false,
        backgroundColor: null,
        // Use device pixel ratio or 1 to keep file size under API limits.
        scale: window.devicePixelRatio || 1
      });
      return canvas.toDataURL('image/png');
    } catch (err) {
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

  const mergeAndDownloadAllImages = React.useCallback(async () => {
    let failed = 0;
    let saved = 0;

    try {
      if (rows.length === 0) {
        return failed;
      }

      // Iterate through ALL rows (scenes)
      for (let sceneIndex = 0; sceneIndex < rows.length; sceneIndex++) {
        const row = rows[sceneIndex];
        const sceneNumber = row?.scene_number || (sceneIndex + 1);
        const modelUpper = String(row?.model || '').toUpperCase();
        const isVeo3 = modelUpper === 'VEO3';
        const isPlotly = modelUpper === 'PLOTLY';
        const sceneImages = isVeo3 ? getVeo3ImageTabImages(row) : getSceneImages(row);
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
            if (!isPlotly) {
              
              // 1) Switch to this scene
              const currentSceneNumber = selected?.sceneNumber || selected?.scene_number;
              if (String(currentSceneNumber) !== String(sceneNumber)) {
                const targetRow = rows.find((r, idx) => (r?.scene_number || idx + 1) === sceneNumber);
                if (targetRow) {
                  const imgs = isVeo3 ? getVeo3ImageTabImages(targetRow) : getSceneImages(targetRow);
                  const imageEntries = buildImageEntries(imgs, targetRow?.imageFrames);
                  const firstImg = imgs[0] || '';
                  // Get avatar URLs from current version of image object for VEO3 scenes
                  const avatarUrlsFromVersion4 = getAvatarUrlsFromImageVersion(
                    targetRow?.imageVersionData || null,
                    targetRow?.current_version || 'v1',
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
                    current_version: targetRow?.current_version || 'v1',
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
              dataUrl = await captureSceneImageWithHtml2Canvas(sceneNumber, imageIndex);
              if (dataUrl) {
              } else {
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
              dataUrl = await mergeFrameToDataUrl(frame, fallbackDims, {
                  includeOverlays: !isPlotly
              });
            } else {
                // Fallback: load the raw image and render it to a canvas sized
                // according to image_dimensions when available.
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
            }

            if (!dataUrl) {
              failed += 1;
              continue;
            }

            // Convert data URL to blob
            const blob = await dataUrlToBlob(dataUrl);
            if (!blob) {
              failed += 1;
              continue;
            }

            // Generate filename
            const fileName = `scene-${sceneNumber}-image-${imageIndex + 1}.png`;

            // WORKAROUND: Store image in browser memory instead of server temp folder
            // This bypasses the /api/save-temp-image endpoint that's not working

            try {
              // Store the blob in memory using a Map
              imageStorageRef.current.set(fileName, blob);
              saved += 1;
            } catch (error) {
              failed += 1;
            }

            // Small delay between images
            await new Promise((resolve) => setTimeout(resolve, 200));
          } catch (error) {
            failed += 1;
          }
        }
      }

      // No alerts - just console logs for background processing
    } catch (error) {
      // No alert - error will be handled by parent function
      throw error;
    }

    return failed;
  }, [rows, getSceneImages, getVeo3ImageTabImages, findFrameForImage, mergeFrameToDataUrl, dataUrlToBlob]);

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
        const images = isVeo3 ? veo3ImageRefs : getSceneImages(row);
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
      
      for (let sceneIndex = 0; sceneIndex < rows.length; sceneIndex++) {
        const row = rows[sceneIndex];
        const sceneNumber = row?.scene_number || (sceneIndex + 1);
        const modelUpper = String(row?.model || '').toUpperCase();
        const isVeo3 = modelUpper === 'VEO3';
        const isAnchor = modelUpper === 'ANCHOR';
        const veo3ImageRefs = isVeo3 ? getVeo3ImageTabImages(row) : [];
        const images = sceneImagesByIndex[sceneIndex] || (isVeo3 ? veo3ImageRefs : getSceneImages(row));
        
        for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
          const fileName = `scene-${sceneNumber}-image-${imageIndex + 1}.png`;
          const fileKey = fileMap[fileName];
          
          // Get image from browser memory storage
          try {
            const blob = imageStorageRef.current.get(fileName);
            
            if (!blob) {
              continue;
            }

            // Optional: log data URL for debugging only (do not send as image_binary)
            const base64Url = await blobToDataUrl(blob);
             
            const file = new File([blob], fileName, { type: 'image/png' });
             
            // Add to FormData with file key
            formData.append('frames', file);
            imageFiles.push(fileName);
            
          } catch (error) {
          }
        }
      }
      
      if (imageFiles.length === 0) {
        throw new Error('No images found in temp folder');
      }

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
      throw error;
    }
  }, [rows, getSceneImages, getVeo3ImageTabImages, getOrderedRefs, blobToDataUrl]);

  // Function to call /v1/videos/regenerate after save-all-frames succeeds
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
          voiceOption: 'male',
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
        if (!isVEO3) {
          if (voiceoverUrl) {
            if (typeof voiceoverUrl === 'object') {
              voiceover = voiceoverUrl;
            } else {
              voiceover = {
                name: sceneOptions.voiceOption || '',
                type: 'audio',
                url: voiceoverUrl,
                created_at: new Date().toISOString()
              };
            }
          } else {
            voiceOption = sceneOptions.voiceOption || '';
            if (!voiceOption || voiceOption.trim() === '') {
              voiceOption = 'male';
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

            const useCustom =
              !isPreset &&
              (sceneOptions.transitionCustom === 'custom' ||
                (sceneOptions.customDescription || '').trim().length > 0 ||
                Object.values(sceneOptions.customPreservationNotes || {}).some(
                  (v) => (v || '').trim().length > 0
                ));

            if (isPreset) {
              const preset = sceneOptions.transitionPreset;
              transitions.push({
                is_preset: true,
                parameters: {
                  name: preset?.name || '',
                  preservation_notes: preset?.preservation_notes || {},
                  prompt_description: preset?.prompt_description || preset?.promptDescription || ''
                }
              });
            } else if (useCustom) {
              const selectedCustomPreset = sceneOptions.transitionCustomPreset || null;
              const customNotes = selectedCustomPreset?.preservation_notes || sceneOptions.customPreservationNotes || {};
              const notes = {
                camera_specifications: customNotes.camera_specifications || customNotes.cameraSpecifications || '',
                subject_description: customNotes.subject_description || '',
                action_specification: customNotes.action_specification || '',
                scene_description: customNotes.scene_description || '',
                lighting: customNotes.lighting || '',
                style_mood: customNotes.style_mood || '',
                geometric_preservation: customNotes.geometric_preservation || '',
                transition_type: customNotes.transition_type || '',
                content_modification: customNotes.content_modification || '',
              };

              const userQuery = selectedCustomPreset ? '' : (sceneOptions.customDescription || '');
              const savecustom = !selectedCustomPreset && !!sceneOptions.rememberCustomPreset;
              const customName = savecustom ? (sceneOptions.customPresetName || '') : '';
              const name = selectedCustomPreset?.name || sceneOptions.customPresetName || 'Custom Transition';
              const promptDescription =
                selectedCustomPreset?.prompt_description ||
                selectedCustomPreset?.promptDescription ||
                userQuery;

              transitions.push({
                is_preset: false,
                userQuery,
                parameters: {
                  name,
                  preservation_notes: notes,
                  prompt_description: promptDescription,
                },
                savecustom,
                custom_name: customName,
              });
            } else if (transitionPresets.length > 0) {
              const firstPreset = transitionPresets[0];
              transitions.push({
                is_preset: true,
                parameters: {
                  name: firstPreset?.name || firstPreset?.preset_name || '',
                  preservation_notes: firstPreset?.preservation_notes || {},
                  prompt_description: firstPreset?.prompt_description || firstPreset?.promptDescription || ''
                }
              });
            }
          }

          scenePayload.voiceover = voiceover;
          scenePayload.voiceoption = voiceOption;
          scenePayload.transitions = transitions;
        } else {
          scenePayload.voiceover = null;
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
        throw new Error(`generate-videos-queue failed: ${response.status} ${JSON.stringify(responseData)}`);
      }


      // Extract job ID from response
      const jobId = responseData?.job_id || responseData?.jobId || responseData?.id || null;

      if (jobId) {
        return jobId;
      } else {
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
      percent: 5,
      status: 'saving',
      step: 'saving_images',
      jobId: null,
      message: ''
    });
    
    // Run everything in background - no alerts, no interruptions
    (async () => {
      try {
        // Step 1: Save images to temp folder
        setVideoGenProgress((prev) => ({
          ...prev,
          visible: true,
          percent: 10,
          status: 'saving',
          step: 'saving_images',
          message: ''
        }));
        const failedDownloads = await mergeAndDownloadAllImages();
        
        if (failedDownloads > 0) {
          setError('Some images could not be saved to temp folder.');
        } else {
        }
        
        // Wait a bit to ensure all saves are complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 2: Call save-all-frames API
        try {
          await callSaveAllFramesAPI();
          setVideoGenProgress((prev) => ({
            ...prev,
            visible: true,
            percent: Math.max(prev.percent, 40),
            status: 'uploading',
            step: 'uploading_frames',
            message: ''
          }));

          // Step 3: Call generate-videos-queue API
          setVideoGenProgress((prev) => ({
            ...prev,
            visible: true,
            percent: Math.max(prev.percent, 50),
            status: 'queueing',
            step: 'queueing',
            message: ''
          }));

          const jobId = await callVideosRegenerateAPI();
          
          if (jobId) {
            setVideoGenProgress((prev) => ({
              ...prev,
              visible: true,
              percent: Math.max(prev.percent, 60),
              status: 'queued',
              step: 'queued',
              jobId: jobId,
              message: ''
            }));

            // Start video redirect flow with job ID
            startVideoRedirectFlow(jobId);
          } else {
            setVideoGenProgress((prev) => ({
              ...prev,
              visible: true,
              percent: Math.max(prev.percent, 60),
              status: 'queued',
              step: 'queued',
              message: 'Job queued but no job ID returned'
            }));
          }

        } catch (apiError) {
          setError('API upload failed: ' + apiError.message);
          setVideoGenProgress((prev) => ({
            ...prev,
            visible: true,
            status: 'error',
            step: 'error',
            message: apiError?.message || 'Failed to queue video generation'
          }));
          // No alert - just set error state
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
        <div className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-white/90 backdrop-blur-sm">
          <div className="bg-white shadow-2xl rounded-2xl px-8 py-10 max-w-md w-full text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20" viewBox="0 0 100 100">
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
                    strokeDashoffset={`${283 - (283 * Math.min(videoGenProgress.percent, 100)) / 100}`}
                    style={{ transformOrigin: '50% 50%', transform: 'rotate(-90deg)' }}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center text-xl font-semibold text-[#13008B]">
                  {Math.min(100, Math.max(0, Math.round(videoGenProgress.percent)))}%
                </div>
              </div>
              <div>
                <p className="text-lg font-semibold text-gray-900">
                  {videoGenProgress.step === 'saving_images' && 'Saving images to workspace'}
                  {videoGenProgress.step === 'uploading_frames' && 'Uploading frames'}
                  {videoGenProgress.step === 'queueing' && 'Submitting video job'}
                  {videoGenProgress.step === 'queued' && 'Waiting for job to start'}
                  {videoGenProgress.step === 'regenerating_videos' && 'Generating videos'}
                  {videoGenProgress.step === 'completed' && 'Finalizing'}
                  {(!videoGenProgress.step || videoGenProgress.step === '') && 'Processing'}
                </p>
                {videoGenProgress.message ? (
                  <p className="text-sm text-gray-600 mt-2">{videoGenProgress.message}</p>
                ) : (
                  <p className="text-sm text-gray-600 mt-2">This may take a moment. Please keep this tab open.</p>
                )}
              </div>
            </div>
          </div>
        </div>
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
          <style>{`
            @keyframes spin-svg {
              from { transform: rotate(0deg); }
              to { transform: rotate(360deg); }
            }
            .spinner-circle {
              animation: spin-svg 1.5s linear infinite;
            }
          `}</style>
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8 flex flex-col items-center text-center space-y-4">
              <div className="relative w-20 h-20">
                <svg className="w-20 h-20" viewBox="0 0 100 100">
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
                    className="spinner-circle"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-3 h-3 bg-[#13008B] rounded-full animate-bounce" />
                </div>
              </div>
              <div className="space-y-2">
                <p className="text-lg font-semibold text-[#13008B]">Generating your images…</p>
                <p className="text-sm text-gray-600">
                  This may take a few moments. Please keep this tab open while we finish.
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      <div className="p-4 space-y-4 overflow-y-auto overflow-x-hidden">
      
        {/* {error && (<div className="text-sm text-red-600 mb-2">{error}</div>)} */}

        {/* Only show selected image details when not polling */}
        {selected?.imageUrl && (!isPolling || rows.length > 0) && (
          <div className="bg-white border rounded-xl p-4 h-[520px] overflow-y-auto scrollbar-hide">
          

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
                        } else {
                          // SORA, ANCHOR, PLOTLY, and others default to opening and closing
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
                    
                    {/* Avatar Management Button (VEO3 only) */}
                    {isVEO3Model(selectedModel) && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          const sceneNum = selected?.sceneNumber || selected?.scene_number || 1;
                          // Start with no avatar selected - user must select one
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
                  if (firstSelectedUrl && isValidImageUrl(firstSelectedUrl)) return firstSelectedUrl;
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
                      // Get version key (same as list area line 2104)
                      const versionKey = imagesContainer.current_version || imagesContainer.currentVersion || selected?.current_version || 'v1';
                      
                      // Get version object (same as list area line 2105: imagesContainer[versionKey])
                      const verObj = imagesContainer[versionKey] || imagesContainer.v1 || {};
                      
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
                          if (url && isValidImageUrl(url)) {
                            console.log('✅ Avatar tab: Using avatar URL from version object avatar_urls:', url);
                            return url;
                          }
                        }
                      }
                    }
                  }
                  
                  // Priority 2: Try to get from currentRow's imageVersionData (same structure as list area uses)
                  // This is the EXACT same extraction: it.images[current_version].avatar_urls
                  if (currentRow && currentRow.imageVersionData && typeof currentRow.imageVersionData === 'object') {
                    console.log('🔍 Checking currentRow.imageVersionData:', currentRow.imageVersionData);
                    
                    let imagesContainer = currentRow.imageVersionData;
                    
                    // Check if imageVersionData has the images container structure (it.images)
                    if (currentRow.imageVersionData.images && typeof currentRow.imageVersionData.images === 'object' && !Array.isArray(currentRow.imageVersionData.images)) {
                      imagesContainer = currentRow.imageVersionData.images;
                      console.log('🔍 Found images container in row imageVersionData.images');
                    }
                    
                    // Get current version key (same as list area)
                    const versionKey = imagesContainer?.current_version || imagesContainer?.currentVersion || currentRow?.current_version || 'v1';
                    console.log('🔍 Row versionKey:', versionKey);
                    
                    // Get version object (same as: imagesContainer[versionKey] in list area)
                    const verObj = imagesContainer[versionKey] || imagesContainer.v1 || {};
                    console.log('🔍 Row version object:', verObj);
                    console.log('🔍 Row version object keys:', Object.keys(verObj));
                    
                    // Extract avatar_urls from version object (EXACT same as list area line 2112)
                    const versionAvatars = verObj?.avatar_urls;
                    console.log('🔍 Row avatar_urls from version object:', versionAvatars);
                    
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
                      
                      console.log('🔍 Row mapped avatar URLs:', avatarUrls);
                      
                      if (avatarUrls.length > 0) {
                        const url = avatarUrls[0];
                        if (url && isValidImageUrl(url)) {
                          console.log('✅ Avatar tab: Using avatar URL from row version object avatar_urls:', url);
                          return url;
                        }
                      }
                    }
                  }
                  
                  // Priority 3: Use helper function as fallback
                  const avatarUrlsFromSelected = getAvatarUrlsFromImageVersion(
                    selected?.imageVersionData || null,
                    selected?.current_version || 'v1',
                    selectedModel
                  );
                  if (avatarUrlsFromSelected.length > 0) {
                    const url = avatarUrlsFromSelected[0];
                    if (url && isValidImageUrl(url)) {
                      console.log('✅ Avatar tab: Using avatar URL from helper function:', url);
                      return url;
                    }
                  }
                  
                  // Priority 4: Use selected.avatar_urls (should already be from current version)
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
                    if (url && isValidImageUrl(url)) {
                      console.log('⚠️ Avatar tab: Using avatar URL from selected.avatar_urls (fallback):', url);
                      return url;
                    }
                  }
                  
                  // For VEO3 Avatar tab, don't fall through to other image sources - return empty if no avatar found
                  console.log('❌ Avatar tab: No avatar URL found in session data images');
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
                const currentRow = rows[selected.index];
                const isAvatarModel = selectedModel === 'VEO3';

                if (selectedModel === 'ANCHOR') {
                  return secondSelectedUrl && isValidImageUrl(secondSelectedUrl) ? secondSelectedUrl : '';
                }

                if (isAvatarModel) {
                  if (currentRow && Array.isArray(currentRow.refs) && currentRow.refs.length > 0) {
                    const refUrl = typeof currentRow.refs[0] === 'string' ? currentRow.refs[0].trim() : '';
                    if (refUrl && isValidImageUrl(refUrl)) return refUrl;
                  }
                  if (secondSelectedUrl && isValidImageUrl(secondSelectedUrl)) return secondSelectedUrl;
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
              
              // Dual-image models (VEO3/ANCHOR) show tabs only if both images are available
              // Other models just need a second image
              const hasSecondImage = isDualImageModel
                ? (primaryImg && primaryImg.trim() && secondaryImg && secondaryImg.trim())
                : (secondaryImg && secondaryImg.trim());
              
              
              return (
                  <div className="mb-4">
                    {/* Tabs - only show if there are 2 images */}
                    {hasSecondImage && (
                      <div className="flex gap-2 mb-4 border-b border-gray-200">
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
                      </div>
                    )}
                    
                    <div className="grid grid-cols-1 gap-4">
                  {/* Show Image 1 when: tab 0 is active OR no second image exists */}
                  {primaryImg && typeof primaryImg === 'string' && primaryImg.trim() && (activeImageTab === 0 || !hasSecondImage) ? (
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
                          ? { width: '500px', height: '100%' }
                          : { width: '100%', height: '100%' })
                      }}
                    >
                      {(() => {
                    const frames = Array.isArray(selected.imageFrames) ? selected.imageFrames : [];
                    const frameForImg1 = findFrameForImage(frames, primaryImg, primaryFrameIndex);
                    const fallbackFrame1 = frameForImg1 || (frames.length > 0 ? frames[primaryFrameIndex] || frames[0] : null);
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
                        {primaryImg && typeof primaryImg === 'string' && primaryImg.trim() ? (
                          <img
                            src={primaryImg}
                            alt={`scene-${selected.sceneNumber}-primary`}
                            className="w-full h-full object-contain"
                            crossOrigin={primaryImg.startsWith('http') && !primaryImg.includes(window.location.hostname) ? "anonymous" : undefined}
                            onLoad={(e) => {
                              handleNaturalSize(primaryImg, e.target);
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
                          const versionKey = imageVersionData.current_version || imageVersionData.currentVersion || 'v1';
                          const verObj = imageVersionData[versionKey] || imageVersionData.v1 || {};
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
                                const frame = frameForImg1;
                                if (frame) {
                                  // Build the JSON structure with base_image, text_elements, and overlay_elements
                                  const frameData = {
                                    base_image: frame?.base_image || frame?.baseImage || {
                                      image_url: primaryImg,
                                      image_dimensions: selected?.imageDimensions || {}
                                    },
                                    text_elements: Array.isArray(frame?.text_elements) ? frame.text_elements : 
                                                   Array.isArray(frame?.textElements) ? frame.textElements : [],
                                    overlay_elements: Array.isArray(frame?.overlay_elements) ? frame.overlay_elements : [],
                                    model: selectedModel
                                  };
                                  setEditingImageFrame(frameData);
                                          setEditingSceneNumber(sceneNo);
                                  setEditingImageIndex(primaryFrameIndex); // Track actual image index
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
                                allElements.push({
                                  type: 'text',
                                  element: el,
                                  index: idx,
                                  zIndex: el.z_index || el.zIndex || (idx + 1) // Text elements start at z-index 1
                                });
                              }
                            });
                          }
                          
                          // Add overlay elements with type and index for sorting
                          if (Array.isArray(overlayEls1) && overlayEls1.length > 0) {
                            overlayEls1.forEach((ov, idx) => {
                              if (ov && typeof ov === 'object') {
                                allElements.push({
                                  type: 'overlay',
                                  element: ov,
                                  index: idx,
                                  zIndex: ov.z_index || ov.zIndex || (100 + idx + 1) // Overlays start at z-index 101
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
                                  const fontSizeBase = Number.isFinite(el.fontSize) ? Number(el.fontSize) : 16;
                                  const fontSize =
                                    fontSizeBase > 0 && fontSizeBase <= 2 && mode === 'normalized'
                                      ? fontSizeBase * (Number((frameDims1 || selected?.imageDimensions)?.height) || 1)
                                      : fontSizeBase;
                                  const color = el.fill || '#ffffff';
                                  const fontFamily = el.fontFamily || 'sans-serif';
                                  const fontWeight = el.fontWeight || 'normal';
                                  const lineHeight = el.lineHeight || 1.2;
                                  const shadow = el.effects?.textShadow;
                                  const textShadow =
                                    shadow && shadow.enabled
                                      ? `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur || 0}px ${shadow.color || 'rgba(0,0,0,0.5)'}`
                                      : undefined;
                                  const anchor = el.layout?.anchor_point || 'top_left';
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
                                    lineHeight,
                                    textShadow,
                                    whiteSpace: 'pre-wrap'
                                  };
                                  return (
                                    <div key={`text-1-${item.index}`} style={boxStyle} className="pointer-events-none">
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
                                  
                                  const isChartOverlay = ov?.element_id === 'chart_overlay' || 
                                                        ov?.label_name === 'Chart' ||
                                                        overlayUrl.includes('chart') ||
                                                        (selectedModel === 'PLOTLY' && overlayUrl);
                                  
                                  if (isChartOverlay) {
                                    const separator = overlayUrl.includes('?') ? '&' : '?';
                                    overlayUrl = `${overlayUrl}${separator}_cb=${chartCacheBuster}`;
                                  }

                                  const displayUrl = isAnchorModel
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
                                      style={{
                                        left: `${leftPct}%`,
                                        top: `${topPct}%`,
                                        width: widthPct != null ? `${widthPct}%` : 'auto',
                                        height: heightPct != null ? `${heightPct}%` : 'auto',
                                        opacity,
                                        zIndex: item.zIndex
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

                  {/* Show Image 2 only when: tab 1 is active AND second image exists */}
                  {hasSecondImage && secondaryImg && typeof secondaryImg === 'string' && secondaryImg.trim() && activeImageTab === 1 ? (
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
                          ? { width: '500px', height: '100%' }
                          : { width: '100%', height: '100%' })
                      }}
                    >
                      {(() => {
                    const frames = Array.isArray(selected.imageFrames) ? selected.imageFrames : [];
                    const frameForImg2 = findFrameForImage(frames, secondaryImg, secondaryFrameIndex);
                    const fallbackFrame2 =
                      frameForImg2 || (frames.length > 1 ? frames[secondaryFrameIndex] || frames[0] : frames.length > 0 ? frames[0] : null);
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
                    const overlayEls2 = fallbackFrame2 ? (
                      Array.isArray(fallbackFrame2?.overlay_elements)
                        ? fallbackFrame2.overlay_elements
                        : Array.isArray(fallbackFrame2?.overlayElements)
                        ? fallbackFrame2.overlayElements
                        : []
                    ) : [];
                    const frameDims2 =
                      fallbackFrame2?.base_image?.image_dimensions ||
                      fallbackFrame2?.base_image?.imageDimensions ||
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
                        {secondaryImg && typeof secondaryImg === 'string' && secondaryImg.trim() ? (
                          <img
                            src={secondaryImg}
                            alt={`scene-${selected.sceneNumber}-secondary`}
                            className="w-full h-full object-contain"
                            crossOrigin={secondaryImg.startsWith('http') && !secondaryImg.includes(window.location.hostname) ? "anonymous" : undefined}
                            onLoad={(e) => {
                              handleNaturalSize(secondaryImg, e.target);
                            }}
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
                          const versionKey = imageVersionData.current_version || imageVersionData.currentVersion || 'v1';
                          const verObj = imageVersionData[versionKey] || imageVersionData.v1 || {};
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
                                allElements.push({
                                  type: 'text',
                                  element: el,
                                  index: idx,
                                  zIndex: el.z_index || el.zIndex || (idx + 1) // Text elements start at z-index 1
                                });
                              }
                            });
                          }
                          
                          // Add overlay elements with type and index for sorting
                          if (Array.isArray(overlayEls2) && overlayEls2.length > 0) {
                            overlayEls2.forEach((ov, idx) => {
                              if (ov && typeof ov === 'object') {
                                allElements.push({
                                  type: 'overlay',
                                  element: ov,
                                  index: idx,
                                  zIndex: ov.z_index || ov.zIndex || (100 + idx + 1) // Overlays start at z-index 101
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
                                  const shadow = el.effects?.textShadow;
                                  const textShadow =
                                    shadow && shadow.enabled
                                      ? `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur || 0}px ${shadow.color || 'rgba(0,0,0,0.5)'}`
                                      : undefined;
                                  const anchor = el.layout?.anchor_point || 'top_left';
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
                                    lineHeight,
                                    textShadow,
                                    whiteSpace: 'pre-wrap'
                                  };
                                  return (
                                    <div key={`text-2-${item.index}`} style={boxStyle} className="pointer-events-none">
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
                                  
                                  const isChartOverlay = ov?.element_id === 'chart_overlay' || 
                                                        ov?.label_name === 'Chart' ||
                                                        overlayUrl.includes('chart') ||
                                                        (selectedModel === 'PLOTLY' && overlayUrl);
                                  
                                  if (isChartOverlay) {
                                    const separator = overlayUrl.includes('?') ? '&' : '?';
                                    overlayUrl = `${overlayUrl}${separator}_cb=${chartCacheBuster}`;
                                  }

                                  const displayUrl = isAnchorModel
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
                                      style={{
                                        left: `${leftPct}%`,
                                        top: `${topPct}%`,
                                        width: widthPct != null ? `${widthPct}%` : 'auto',
                                        height: heightPct != null ? `${heightPct}%` : 'auto',
                                        opacity,
                                        zIndex: item.zIndex
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
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-gray-600">Description</label>
                  {(() => {
                    const modelUpper = String(selected?.model || '').toUpperCase();
                    const isVEO3 = modelUpper === 'VEO3';
                    
                    // For non-VEO3 models, show popup button; for VEO3, show inline edit
                    if (!isVEO3) {
                      return (
                        <button
                          type="button"
                          onClick={() => {
                            const sceneNumber = selected?.sceneNumber || selected?.scene_number || 1;
                            setRegeneratingSceneNumber(sceneNumber);
                            setRegenerateUserQuery('');
                            setError('');
                            setIsRegenerateForDescription(true); // Mark that this is for editing description
                            
                            // Get the model for this scene
                            const model = getSceneModel(sceneNumber);
                            
                            // Set default frames based on model
                            if (isVEO3Model(model) || isANCHORModel(model)) {
                              setRegenerateFrames(['background']); // VEO3/ANCHOR always use background
                            } else {
                              // For all other models: default to both frames
                              setRegenerateFrames(['opening', 'closing']);
                            }
                            
                            setShowRegeneratePopup(true);
                          }}
                          className="text-xs text-[#13008B] hover:text-[#0F0069] font-medium flex items-center gap-1"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                          </svg>
                          Edit
                        </button>
                      );
                    }
                    
                    // For VEO3, use inline edit
                    return editingField !== 'description' ? (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingField('description');
                          setEditedDescription(selected?.description || '');
                        }}
                        className="text-xs text-[#13008B] hover:text-[#0F0069] font-medium flex items-center gap-1"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                      </button>
                    ) : null;
                  })()}
                  {(() => {
                    const modelUpper = String(selected?.model || '').toUpperCase();
                    const isVEO3 = modelUpper === 'VEO3';
                    // Only show inline edit controls for VEO3
                    return isVEO3 && editingField === 'description' ? (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingField(null);
                          setEditedDescription('');
                        }}
                        disabled={isSavingField}
                        className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                        setIsSavingField(true);
                        try {
                          const user_id = localStorage.getItem('token');
                          const session_id = localStorage.getItem('session_id');
                          const scene_number = selected?.sceneNumber || selected?.scene_number || 1;
                          
                          if (!user_id || !session_id) {
                            throw new Error('Missing user_id or session_id');
                          }
                          
                          // Construct minimal user and session objects
                          const user = {
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
                          
                          const session = {
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
                          
                          const payload = {
                            user,
                            session,
                            scene_number: Number(scene_number),
                            field_name: 'desc',
                            new_value: editedDescription.trim()
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
                          setSelected(prev => ({ ...prev, description: editedDescription.trim() }));
                          setRows(prevRows => prevRows.map(row => {
                            const rowSceneNumber = row?.scene_number || row?.sceneNumber;
                            if (String(rowSceneNumber) === String(scene_number)) {
                              return { ...row, description: editedDescription.trim() };
                            }
                            return row;
                          }));
                          
                          setEditingField(null);
                          setError('');
                        } catch (error) {
                          setError('Failed to update description: ' + (error?.message || 'Unknown error'));
                        } finally {
                          setIsSavingField(false);
                        }
                      }}
                      disabled={isSavingField}
                      className="text-xs bg-[#13008B] text-white px-3 py-1 rounded hover:bg-[#0F0069] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isSavingField ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Save
                        </>
                      )}
                      </button>
                    </div>
                    ) : null;
                  })()}
                </div>
                <textarea
                  className={`w-full h-32 border rounded-lg px-3 py-2 text-sm ${(() => {
                    const modelUpper = String(selected?.model || '').toUpperCase();
                    const isVEO3 = modelUpper === 'VEO3';
                    return isVEO3 && editingField === 'description' ? 'bg-white border-[#13008B] focus:ring-2 focus:ring-[#13008B]' : 'bg-gray-50';
                  })()}`}
                  readOnly={(() => {
                    const modelUpper = String(selected?.model || '').toUpperCase();
                    const isVEO3 = modelUpper === 'VEO3';
                    return !(isVEO3 && editingField === 'description');
                  })()}
                  value={(() => {
                    const modelUpper = String(selected?.model || '').toUpperCase();
                    const isVEO3 = modelUpper === 'VEO3';
                    return isVEO3 && editingField === 'description' ? editedDescription : (selected?.description || '');
                  })()}
                  onChange={(e) => {
                    const modelUpper = String(selected?.model || '').toUpperCase();
                    const isVEO3 = modelUpper === 'VEO3';
                    if (isVEO3 && editingField === 'description') {
                      setEditedDescription(e.target.value);
                    }
                  }}
                />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm text-gray-600">Narration</label>
                  {editingField !== 'narration' ? (
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
                  ) : (
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEditingField(null);
                          setEditedNarration('');
                        }}
                        disabled={isSavingField}
                        className="text-xs text-gray-600 hover:text-gray-800 px-2 py-1 rounded disabled:opacity-50"
                      >
                        Cancel
                      </button>
                      <button
                        type="button"
                        onClick={async () => {
                        setIsSavingField(true);
                        try {
                          const user_id = localStorage.getItem('token');
                          const session_id = localStorage.getItem('session_id');
                          const scene_number = selected?.sceneNumber || selected?.scene_number || 1;
                          
                          if (!user_id || !session_id) {
                            throw new Error('Missing user_id or session_id');
                          }
                          
                          // Construct minimal user and session objects
                          const user = {
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
                          
                          const session = {
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
                          
                          const payload = {
                            user,
                            session,
                            scene_number: Number(scene_number),
                            field_name: 'narration',
                            new_value: editedNarration.trim()
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
                          setSelected(prev => ({ ...prev, narration: editedNarration.trim() }));
                          setRows(prevRows => prevRows.map(row => {
                            const rowSceneNumber = row?.scene_number || row?.sceneNumber;
                            if (String(rowSceneNumber) === String(scene_number)) {
                              return { ...row, narration: editedNarration.trim() };
                            }
                            return row;
                          }));
                          
                          setEditingField(null);
                          setError('');
                        } catch (error) {
                          setError('Failed to update narration: ' + (error?.message || 'Unknown error'));
                        } finally {
                          setIsSavingField(false);
                        }
                      }}
                      disabled={isSavingField}
                      className="text-xs bg-[#13008B] text-white px-3 py-1 rounded hover:bg-[#0F0069] disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                    >
                      {isSavingField ? (
                        <>
                          <span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="20 6 9 17 4 12"></polyline>
                          </svg>
                          Save
                        </>
                      )}
                      </button>
                    </div>
                  )}
                </div>
                <textarea
                  className={`w-full h-32 border rounded-lg px-3 py-2 text-sm ${editingField === 'narration' ? 'bg-white border-[#13008B] focus:ring-2 focus:ring-[#13008B]' : 'bg-gray-50'}`}
                  readOnly={editingField !== 'narration'}
                  value={editingField === 'narration' ? editedNarration : (selected?.narration || '')}
                  onChange={(e) => editingField === 'narration' && setEditedNarration(e.target.value)}
                />
              </div>
            </div>
             {/* {(() => {
              const prompts = selected?.prompts || {};
              const opening = prompts.opening_frame || {};
              const closing = prompts.closing_frame || {};
              const hasAny = (obj) => Object.values(obj || {}).some(v => typeof v === 'string' && v.trim());
              const fields = [
                ['final_prompt', 'Final Prompt'],
                ['image_summary', 'Image Summary'],
                ['main_subject_details', 'Main Subject Details'],
                ['pose_or_action', 'Pose or Action'],
                ['secondary_elements', 'Secondary Elements'],
                ['lighting_and_atmosphere', 'Lighting & Atmosphere'],
                ['framing_and_composition', 'Framing & Composition'],
                ['technical_enhancers', 'Technical Enhancers']
              ];
              if (!hasAny(opening) && !hasAny(closing)) return null;
              return (
                <div className="mt-4">
                  <button
                    type="button"
                    onClick={() => setShowPromptsAccordion((prev) => !prev)}
                    className="flex w-full items-center justify-between rounded-lg border border-[#D8D3FF] bg-white px-4 py-3 text-sm font-semibold text-[#13008B] shadow-sm transition hover:bg-[#F6F4FF]"
                  >
                    <span>Additional Information</span>
                    <ChevronDown className={`h-4 w-4 transition-transform ${showPromptsAccordion ? 'rotate-180' : ''}`} />
                  </button>
                  {showPromptsAccordion && (
                    <div className="mt-3 grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {hasAny(opening) && (
                        <div className="border rounded-lg p-4 bg-white">
                          <div className="text-base font-medium mb-2">Prompts — Opening Frame</div>
                          <dl className="space-y-1">
                            {fields.map(([key,label]) => {
                              const val = opening?.[key];
                              if (!val || !String(val).trim()) return null;
                              return (
                                <div key={`open-${key}`}>
                                  <dt className="text-[11px] uppercase text-gray-500">{label}</dt>
                                  <dd className="text-sm text-gray-800 whitespace-pre-wrap">{val}</dd>
                                </div>
                              );
                            })}
                          </dl>
                        </div>
                      )}
                      {hasAny(closing) && (
                        <div className="border rounded-lg p-4 bg-white">
                          <div className="text-base font-medium mb-2">Prompts — Closing Frame</div>
                          <dl className="space-y-1">
                            {fields.map(([key,label]) => {
                              const val = closing?.[key];
                              if (!val || !String(val).trim()) return null;
                              return (
                                <div key={`close-${key}`}>
                                  <dt className="text-[11px] uppercase text-gray-500">{label}</dt>
                                  <dd className="text-sm text-gray-800 whitespace-pre-wrap">{val}</dd>
                                </div>
                              );
                            })}
                          </dl>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()} */}
            
            {/* Advanced Options Accordion - Show for all models (VEO3 only shows logo and voiceover) */}
            {(() => {
              const modelUpper = String(selected?.model || '').toUpperCase();
              const isVEO3 = modelUpper === 'VEO3';
              const sceneNumber = selected?.sceneNumber || selected?.scene_number || 1;
              
              const sceneOptions = sceneAdvancedOptions[sceneNumber] || {
                logoNeeded: false,
                voiceUrl: '',
                voiceOption: 'male', // Default to "male"
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

              const hasLogoAsset = !!sessionAssets.logo_url;
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
                                      checked={hasLogoAsset && sceneOptions.logoNeeded === true}
                                      onChange={() => updateSceneOption('logoNeeded', true)}
                                      disabled={!hasLogoAsset}
                                      className="w-4 h-4 text-[#13008B]"
                                    />
                                    <span className="text-sm text-gray-700">Yes</span>
                                  </label>
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`logo-${sceneNumber}`}
                                      checked={!hasLogoAsset || sceneOptions.logoNeeded === false}
                                      onChange={() => updateSceneOption('logoNeeded', false)}
                                      className="w-4 h-4 text-[#13008B]"
                                    />
                                    <span className="text-sm text-gray-700">No</span>
                                  </label>
                                </div>
                                {sceneOptions.logoNeeded && sessionAssets.logo_url && (
                                  <div className="mt-2">
                                    <img 
                                      src={sessionAssets.logo_url} 
                                      alt="Logo preview" 
                                      style={{ width: '200px', height: '100px', objectFit: 'contain' }}
                                      className="border border-gray-300 rounded"
                                    />
                                  </div>
                                )}
                              </div>
                              
                              {/* Voice URL Selection */}
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Voice URL</label>
                                <div className="space-y-2">
                                  {(() => {
                                    // Get all voiceovers from brand assets
                                    const brandVoiceovers = [];
                                    
                                    if (brandAssets && Array.isArray(brandAssets.voiceover)) {
                                      brandVoiceovers.push(...brandAssets.voiceover);
                                    }
                                    
                                    // Filter voiceovers that match the tone
                                    const matchingVoiceovers = [];
                                    
                                    if (scriptTone && brandVoiceovers.length > 0) {
                                      brandVoiceovers.forEach(vo => {
                                        if (!vo || typeof vo !== 'object') return;
                                        const voType = String(vo.type || '').toLowerCase().trim();
                                        const tone = String(scriptTone || '').toLowerCase().trim();
                                        
                                        if (voType === tone) {
                                          matchingVoiceovers.push(vo);
                                        }
                                      });
                                      if (matchingVoiceovers.length === 0) {
                                      }
                                    } else if (!scriptTone) {
                                    }
                                    
                                    const hasSessionVoices = Object.keys(sessionAssets.voice_urls || {}).length > 0;
                                    const hasMatchingVoices = matchingVoiceovers.length > 0;
                                    const sessionVoicesCount = hasSessionVoices ? Object.keys(sessionAssets.voice_urls).length : 0;
                                    
                                    return (
                                      <>
                                        {/* Circular Button Style Voiceover Selection */}
                                        <div className="flex flex-wrap gap-4">
                                          {/* Brand Asset Voiceovers (filtered by tone) */}
                                          {matchingVoiceovers.map((vo, idx) => (
                                            <div key={`brand-match-${idx}`} className="flex flex-col items-center">
                                              <button
                                                type="button"
                                                onClick={() => {
                                                  updateSceneOption('voiceUrl', vo.url);
                                                  updateSceneOption('voiceOption', vo.name || vo.type || 'custom');
                                                }}
                                                className={`w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all ${
                                                  sceneOptions.voiceUrl === vo.url
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
                                                  <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                                                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                                  <line x1="12" y1="19" x2="12" y2="22"/>
                                                  <line x1="8" y1="22" x2="16" y2="22"/>
                                                </svg>
                                              </button>
                                              <span className="text-xs text-gray-700 mt-1.5 text-center font-medium">
                                                {vo.name || vo.type}
                                              </span>
                                            </div>
                                          ))}
                                          
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
                                                    className={`w-16 h-16 rounded-full flex flex-col items-center justify-center transition-all ${
                                                      sceneOptions.voiceUrl === url
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
                                                      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/>
                                                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                                                      <line x1="12" y1="19" x2="12" y2="22"/>
                                                      <line x1="8" y1="22" x2="16" y2="22"/>
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
                              
                              {/* Voice Option (Female / Male) - always visible */}
                                <div>
                                  <label className="text-sm font-medium text-gray-700 mb-2 block">Voice Option</label>
                                  <div className="flex gap-4">
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`voiceOption-${sceneNumber}`}
                                        checked={sceneOptions.voiceOption === 'female'}
                                        onChange={() => updateSceneOption('voiceOption', 'female')}
                                        className="w-4 h-4 text-[#13008B]"
                                      />
                                      <span className="text-sm text-gray-700">Female</span>
                                    </label>
                                    <label className="flex items-center gap-2 cursor-pointer">
                                      <input
                                        type="radio"
                                        name={`voiceOption-${sceneNumber}`}
                                        checked={sceneOptions.voiceOption === 'male' || !sceneOptions.voiceOption || sceneOptions.voiceOption === ''}
                                        onChange={() => updateSceneOption('voiceOption', 'male')}
                                        className="w-4 h-4 text-[#13008B]"
                                      />
                                      <span className="text-sm text-gray-700">Male</span>
                                    </label>
                                  </div>
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
                        
                        {/* Transitions Section */}
                        {modelUpper !== 'VEO3' && (
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
                                {/* Preset Tabs */}
                                <div className={`border rounded-lg p-3 bg-gray-50 ${isCustomPresetMode ? 'opacity-50 pointer-events-none' : ''}`}>
                                  <label className="text-sm font-medium text-gray-700 mb-3 block">Select Preset</label>
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
                                                      <div><strong>Transition Type:</strong> <span className="text-gray-700">{preset.preservation_notes.transition_type || 'N/A'}</span></div>
                                                      <div><strong>Scene Description:</strong> <span className="text-gray-700">{preset.preservation_notes.scene_description || 'N/A'}</span></div>
                                                      <div><strong>Subject Description:</strong> <span className="text-gray-700">{preset.preservation_notes.subject_description || 'N/A'}</span></div>
                                                      <div><strong>Action Specification:</strong> <span className="text-gray-700">{preset.preservation_notes.action_specification || 'N/A'}</span></div>
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
                                
                                {/* Design Your Own Accordion */}
                                <div className="border rounded-lg p-3 bg-gray-50">
                                  <button
                                    type="button"
                                    onClick={() => toggleAdvancedOptions('designYourOwn')}
                                    className="flex w-full items-center justify-between text-sm font-medium text-gray-700 mb-2"
                                  >
                                    <span>Design Your Own</span>
                                    <ChevronDown className={`h-4 w-4 transition-transform ${showAdvancedOptions[sceneNumber]?.designYourOwn ? 'rotate-180' : ''}`} />
                                  </button>
                                  {showAdvancedOptions[sceneNumber]?.designYourOwn && (
                                    <div className="mt-3 space-y-3">
                                      {/* Tabs */}
                                      <div className="flex border-b border-gray-200">
                                        <button
                                          type="button"
                                          onClick={() => setDesignYourOwnTab(prev => ({ ...prev, [sceneNumber]: 'describe' }))}
                                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${(designYourOwnTab[sceneNumber] || 'describe') === 'describe'
                                              ? 'border-[#13008B] text-[#13008B]'
                                              : 'border-transparent text-gray-500 hover:text-gray-700'
                                          }`}
                                        >
                                          Describe it
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setDesignYourOwnTab(prev => ({ ...prev, [sceneNumber]: 'fill' }))}
                                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${designYourOwnTab[sceneNumber] === 'fill'
                                              ? 'border-[#13008B] text-[#13008B]'
                                              : 'border-transparent text-gray-500 hover:text-gray-700'
                                          }`}
                                        >
                                          Fill the points
                                        </button>
                                      </div>
                                      
                                      {/* Tab Content */}
                                      <div className="mt-3">
                                        {/* Describe it Tab */}
                                        {(designYourOwnTab[sceneNumber] || 'describe') === 'describe' && (
                                          <div>
                                            <label className="text-sm font-medium text-gray-700 mb-2 block">Describe Your Transition</label>
                                            <textarea
                                              value={sceneOptions.customDescription || ''}
                                              onChange={(e) => updateSceneOption('customDescription', e.target.value)}
                                              placeholder="Describe how you want the transition to work..."
                                              className="w-full h-32 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none"
                                            />
                                          </div>
                                        )}
                                        
                                        {/* Fill the points Tab */}
                                        {designYourOwnTab[sceneNumber] === 'fill' && (
                                          <div className="space-y-3">
                                            <div>
                                              <label className="text-sm font-medium text-gray-700 mb-1 block">Lighting</label>
                                              <input
                                                type="text"
                                                value={sceneOptions.customPreservationNotes?.lighting || ''}
                                                onChange={(e) => updateSceneOption('customPreservationNotes', {
                                                  ...sceneOptions.customPreservationNotes,
                                                  lighting: e.target.value
                                                })}
                                                placeholder="e.g., Clean minimal lighting, flat graphic style"
                                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B]"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-700 mb-1 block">Style/Mood</label>
                                              <input
                                                type="text"
                                                value={sceneOptions.customPreservationNotes?.style_mood || ''}
                                                onChange={(e) => updateSceneOption('customPreservationNotes', {
                                                  ...sceneOptions.customPreservationNotes,
                                                  style_mood: e.target.value
                                                })}
                                                placeholder="e.g., Professional presentation mood"
                                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B]"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-700 mb-1 block">Transition Type</label>
                                              <input
                                                type="text"
                                                value={sceneOptions.customPreservationNotes?.transition_type || ''}
                                                onChange={(e) => updateSceneOption('customPreservationNotes', {
                                                  ...sceneOptions.customPreservationNotes,
                                                  transition_type: e.target.value
                                                })}
                                                placeholder="e.g., Whole-frame instant cut"
                                                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B]"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-700 mb-1 block">Scene Description</label>
                                              <textarea
                                                value={sceneOptions.customPreservationNotes?.scene_description || ''}
                                                onChange={(e) => updateSceneOption('customPreservationNotes', {
                                                  ...sceneOptions.customPreservationNotes,
                                                  scene_description: e.target.value
                                                })}
                                                placeholder="e.g., Flat graphic layouts displayed in sequence"
                                                className="w-full h-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-700 mb-1 block">Subject Description</label>
                                              <textarea
                                                value={sceneOptions.customPreservationNotes?.subject_description || ''}
                                                onChange={(e) => updateSceneOption('customPreservationNotes', {
                                                  ...sceneOptions.customPreservationNotes,
                                                  subject_description: e.target.value
                                                })}
                                                placeholder="e.g., Two complete graphic compositions with all geometric shapes, colors, and layout elements"
                                                className="w-full h-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-700 mb-1 block">Action Specification</label>
                                              <textarea
                                                value={sceneOptions.customPreservationNotes?.action_specification || ''}
                                                onChange={(e) => updateSceneOption('customPreservationNotes', {
                                                  ...sceneOptions.customPreservationNotes,
                                                  action_specification: e.target.value
                                                })}
                                                placeholder="e.g., Instant cut transition between static compositions"
                                                className="w-full h-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-700 mb-1 block">Content Modification</label>
                                              <textarea
                                                value={sceneOptions.customPreservationNotes?.content_modification || ''}
                                                onChange={(e) => updateSceneOption('customPreservationNotes', {
                                                  ...sceneOptions.customPreservationNotes,
                                                  content_modification: e.target.value
                                                })}
                                                placeholder="e.g., No morphing or content generation - pure camera movement and instant cut only"
                                                className="w-full h-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none"
                                              />
                                            </div>
                                            <div>
                                              <label className="text-sm font-medium text-gray-700 mb-1 block">Camera Specifications</label>
                                              <input
                                                type="text"
                                                value={sceneOptions.customPreservationNotes?.camera_specifications || ''}
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
                                                value={sceneOptions.customPreservationNotes?.geometric_preservation || ''}
                                                onChange={(e) => updateSceneOption('customPreservationNotes', {
                                                  ...sceneOptions.customPreservationNotes,
                                                  geometric_preservation: e.target.value
                                                })}
                                                placeholder="e.g., All elements locked, frozen, preserved in exact positions"
                                                className="w-full h-20 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#13008B] resize-none"
                                              />
                                            </div>
                                          </div>
                                        )}

                                        {/* Remember custom design as preset */}
                                        {hasCustomDesignInput && (
                                          <div className="mt-4 border-t border-gray-200 pt-3 space-y-2">
                                            <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                                              <input
                                                type="checkbox"
                                                checked={sceneOptions.rememberCustomPreset || false}
                                                onChange={(e) => updateSceneOption('rememberCustomPreset', e.target.checked)}
                                                className="w-4 h-4 text-[#13008B]"
                                              />
                                              <span>Remember this design as a preset</span>
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
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
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
          <div className="bg-white border rounded-xl p-4">
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
                    
                    // Get current version from images object
                    const imageVersionData = r?.imageVersionData || null;
                    const imagesCurrentVersion = imageVersionData?.current_version || imageVersionData?.currentVersion || r?.current_version || 'v1';
                    
                    // Console log current version in images object and scripts array
                    console.log('═══════════════════════════════════════════════════════════');
                    console.log(`🎯 SCENE SELECTED: Scene ${r.scene_number || r.sceneNumber || i + 1}`);
                    console.log('═══════════════════════════════════════════════════════════');
                    console.log(`📦 CURRENT_VERSION in images object:`, imagesCurrentVersion);
                    console.log(`📋 Images Object (imageVersionData):`, imageVersionData);
                    if (imageVersionData && imagesCurrentVersion) {
                      const versionObj = imageVersionData[imagesCurrentVersion] || imageVersionData.v1 || {};
                      console.log(`📋 Version Object (${imagesCurrentVersion}):`, JSON.stringify(versionObj, null, 2));
                    }
                    console.log(`📜 Scripts Array:`, scriptsData);
                    if (scriptsData && scriptsData.length > 0) {
                      scriptsData.forEach((script, idx) => {
                        const scriptVersion = script?.current_version || script?.currentVersion || 'v1';
                        console.log(`📜 Script ${idx + 1} - Current Version:`, scriptVersion);
                        if (scriptVersion && script[scriptVersion]) {
                          console.log(`📜 Script ${idx + 1} - Version Object (${scriptVersion}):`, JSON.stringify(script[scriptVersion], null, 2));
                        }
                      });
                    }
                    console.log('═══════════════════════════════════════════════════════════');
                    
                    // Get avatar URLs from current version of image object for VEO3 scenes
                    const avatarUrlsFromVersion5 = getAvatarUrlsFromImageVersion(
                      imageVersionData,
                      r?.current_version || 'v1',
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
                      current_version: r?.current_version || 'v1',
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
                              <img src={first} alt={`scene-${r.scene_number}-1`} className="max-w-full max-h-full object-contain" />
                            </div>
                          )}
                          {hasSecond && (
                            <div className="w-full h-full bg-black flex items-center justify-center">
                              <img src={second} alt={`scene-${r.scene_number}-2`} className="max-w-full max-h-full object-contain" />
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

      {isSceneUpdating && (
        <div className="px-4 pb-4">
          <div className="flex items-center justify-center gap-3 text-sm text-gray-600 bg-white border border-gray-200 rounded-lg py-2 shadow-sm">
            <span className="w-4 h-4 border-2 border-[#13008B] border-t-transparent rounded-full animate-spin" />
            <span>Applying changes…</span>
          </div>
        </div>
      )}

      {showEditor && (
        <ImageEditor
          data={editorData}
          onClose={() => {
            setShowEditor(false);
            setEditorData(null);
          }}
        />
      )}

      {showImageEdit && (
        <ImageEdit
          isOpen={showImageEdit}
          onClose={handleInlineEditorClose}
          onFrameEditComplete={handleFrameEditComplete}
          frameData={editingImageFrame}
          sceneNumber={editingSceneNumber}
          imageIndex={editingImageIndex}
          aspectRatioCss={cssAspectRatio}
        />
      )}
      {showChartEditor && chartEditorData && (
        <ChartEditorModal
          isOpen={showChartEditor}
          sceneData={chartEditorData}
          onClose={() => {
            setShowChartEditor(false);
            setChartEditorData(null);
          }}
        />
      )}

      {/* Regenerate Image Popup */}
      {showRegeneratePopup && (
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

              {/* Frame Selection - Show for all models except VEO3/ANCHOR */}
              {regeneratingSceneNumber && (() => {
                const model = getSceneModel(regeneratingSceneNumber);
                const modelUpper = String(model || '').toUpperCase();
                const isVEO3 = modelUpper === 'VEO3';
                const isANCHOR = modelUpper === 'ANCHOR';
                
                // Show frame selection for all models except VEO3/ANCHOR (which use background)
                if (!isVEO3 && !isANCHOR) {
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
                    <p className="text-lg font-semibold text-[#13008B]">Regenerating Image...</p>
                    <p className="text-sm text-gray-600">Please wait while we create your new image...</p>
                  </div>
                </div>
              )}

              {/* Generate Button - Bottom Right */}
              <div className="flex justify-end">
                <button
                  onClick={handleGenerateImage}
                  disabled={(() => {
                    if (isRegenerating || !regenerateUserQuery.trim()) return true;
                    // For non-VEO3/ANCHOR models, require at least one frame selected
                    if (regeneratingSceneNumber) {
                      const model = getSceneModel(regeneratingSceneNumber);
                      const modelUpper = String(model || '').toUpperCase();
                      const isVEO3 = modelUpper === 'VEO3';
                      const isANCHOR = modelUpper === 'ANCHOR';
                      if (!isVEO3 && !isANCHOR && regenerateFrames.length === 0) return true;
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
      )}

      {/* Avatar Manager Popup (VEO3 only) */}
      {showAvatarManager && (
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
                <div className="grid grid-cols-3 gap-4">
                  {[
                    { id: 'avatar_1', url: 'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/1.png', name: 'Avatar 1' },
                    { id: 'avatar_2', url: 'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/2.png', name: 'Avatar 2' },
                    { id: 'avatar_3', url: 'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/3.png', name: 'Avatar 3' },
                    { id: 'avatar_4', url: 'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/4.png', name: 'Avatar 4' },
                    { id: 'avatar_5', url: 'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/5.png', name: 'Avatar 5' },
                    { id: 'avatar_6', url: 'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/6.png', name: 'Avatar 6' },
                    { id: 'avatar_7', url: 'https://brandassetmain2.blob.core.windows.net/defaulttemplates/default_avatars/7.png', name: 'Avatar 7' }
                  ].map((avatar) => {
                    // Normalize both URLs for exact matching
                    const normalizedAvatarUrl = normalizeImageUrl(avatar.url);
                    const isSelected = avatarUrls.some(url => normalizeImageUrl(url) === normalizedAvatarUrl);
                    return (
                      <div
                        key={avatar.id}
                        onClick={() => {
                          if (isUpdatingAvatars) return;
                          if (isSelected) {
                            // Deselect
                            setAvatarUrls([]);
                          } else {
                            // Select only one (replace previous selection)
                            setAvatarUrls([avatar.url]);
                          }
                        }}
                        className={`relative cursor-pointer rounded-lg overflow-hidden transition-all border-2 ${
                          isSelected 
                            ? 'border-[#13008B] shadow-lg' 
                            : 'border-gray-200 hover:border-gray-400'
                        } ${isUpdatingAvatars ? 'opacity-50 cursor-not-allowed' : ''}`}
                      >
                        <div className="bg-white p-2">
                          <img 
                            src={avatar.url} 
                            alt={avatar.name}
                            className="w-full h-32 object-contain"
                          />
                        </div>
                        <div className="bg-gray-50 px-2 py-1 text-center border-t border-gray-200">
                          <p className="text-xs text-gray-600">{avatar.name}</p>
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
                </div>
                <p className="text-xs text-gray-500 mt-3">
                  {avatarUrls.length > 0 ? '1 avatar selected' : 'No avatar selected'}
                </p>
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
      )}

      {/* Upload Background Popup */}
      {showUploadBackgroundPopup && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm" style={{ zIndex: 9999 }}>
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 relative max-h-[90vh] overflow-hidden flex flex-col">
            {/* Close Button - Circle at top right */}
            <button
              onClick={() => {
                if (!isUploadingBackground) {
                  setShowUploadBackgroundPopup(false);
                  setUploadedBackgroundFile(null);
                  setUploadedBackgroundPreview(null);
                  setUploadingBackgroundSceneNumber(null);
                  setUploadFrames(['background']); // Reset to default
                }
              }}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 flex items-center justify-center transition-colors z-10 disabled:opacity-50 disabled:cursor-not-allowed"
              title="Close"
              disabled={isUploadingBackground}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Popup Content */}
            <div className="flex-1 p-6 overflow-y-auto relative">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 pr-10">Upload Background</h3>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select background image to upload
                </label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setUploadedBackgroundFile(file);
                      // Create preview
                      const reader = new FileReader();
                      reader.onloadend = () => {
                        setUploadedBackgroundPreview(reader.result);
                      };
                      reader.readAsDataURL(file);
                    }
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                  disabled={isUploadingBackground}
                />
                {uploadedBackgroundPreview && (
                  <div className="mt-4">
                    <p className="text-sm font-medium text-gray-700 mb-2">Preview:</p>
                    <img
                      src={uploadedBackgroundPreview}
                      alt="Background preview"
                      className="max-w-full max-h-64 rounded-lg border border-gray-300"
                    />
                  </div>
                )}
              </div>

              {/* Frame Selection - Show for SORA, ANCHOR, PLOTLY scenes (not for VEO3) */}
              {uploadingBackgroundSceneNumber && (() => {
                const model = getSceneModel(uploadingBackgroundSceneNumber);
                const modelUpper = String(model || '').toUpperCase();
                const isVEO3 = isVEO3Model(model);
                
                // Only show frame selection for SORA, ANCHOR, PLOTLY (not VEO3)
                if (!isVEO3) {
                  return (
                    <div className="mb-6">
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
                      {uploadFrames.length === 0 && (
                        <p className="text-xs text-red-600 mt-1">Please select at least one frame</p>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Loading Overlay */}
              {isUploadingBackground && (
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
                    <p className="text-lg font-semibold text-[#13008B]">Uploading Background...</p>
                    <p className="text-sm text-gray-600">Please wait while we upload your background image...</p>
                  </div>
                </div>
              )}

              {/* Save Button - Bottom Right */}
              <div className="flex justify-end">
                <button
                  onClick={handleUploadBackground}
                  disabled={isUploadingBackground || !uploadedBackgroundFile || uploadFrames.length === 0}
                  className="px-6 py-2.5 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0068] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isUploadingBackground ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      Uploading...
                    </>
                  ) : (
                    'Save'
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

export default ImageList;