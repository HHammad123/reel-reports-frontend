import React, { useEffect, useState } from 'react';
import { ChevronDown, Pencil, RefreshCw } from 'lucide-react';
import ImageEditor from './ImageEditor';
import ImageEdit from '../../pages/ImageEdit';
import html2canvas from 'html2canvas';

const ImageList = ({ jobId, onClose, onGenerateVideos, hasVideos = false, onGoToVideos }) => {
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
  const [imageNaturalDims, setImageNaturalDims] = useState({});
  // State for session assets (logo and voiceover)
  const [sessionAssets, setSessionAssets] = useState({ logo_url: '', voice_urls: {} });
  // State for transition presets
  const [transitionPresets, setTransitionPresets] = useState([]);
  // State for scene-specific advanced options
  const [sceneAdvancedOptions, setSceneAdvancedOptions] = useState({}); // { sceneNumber: { logoNeeded: false, voiceUrl: '', voiceOption: '', transitionPreset: null, transitionCustom: null, transitionCustomPreset: null, customDescription: '', customPreservationNotes: {}, subtitleSceneOnly: false, rememberCustomPreset: false, customPresetName: '' } }
  // Global subtitles toggle (applies to all scenes)
  const [subtitlesEnabled, setSubtitlesEnabled] = useState(false);
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
  const redirectIntervalRef = React.useRef(null);

  const startVideoRedirectFlow = React.useCallback(
    (jobId) => {
      if (!jobId) return;
      try {
        localStorage.setItem('current_video_job_id', jobId);
      } catch (err) {
        console.warn('Unable to persist video job id:', err);
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

  useEffect(() => {
    let cancelled = false;
    let timeoutId = null;

    const mapSessionImages = (imagesRoot, veo3ScriptScenesByNumber = {}) => {
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
          final_prompt: getFirstString(raw, ['final_prompt','finalPrompt','prompt','final']),
          image_summary: getFirstString(raw, ['image_summary','imageSummary','summary']),
          main_subject_details: getFirstString(raw, ['main_subject_details','mainSubjectDetails','main_subject','subject_details','subject']),
          pose_or_action: getFirstString(raw, ['pose_or_action','poseOrAction','pose','action']),
          secondary_elements: getFirstString(raw, ['secondary_elements','secondaryElements','secondaries','secondary']),
          lighting_and_atmosphere: getFirstString(raw, ['lighting_and_atmosphere','lightingAndAtmosphere','lighting','atmosphere','mood']),
          framing_and_composition: getFirstString(raw, ['framing_and_composition','framingAndComposition','framing','composition']),
          technical_enhancers: getFirstString(raw, ['technical_enhancers','technicalEnhancers','technical','enhancers'])
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
	            pushRow(1, imagesRoot?.scene_title || 'Images', refs, {
	              description: imagesRoot?.description || imagesRoot?.scene_description || '',
	              narration: imagesRoot?.narration || '',
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
        } catch(_){}
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
              
              console.log('🎬 IMAGE SOURCE DEBUG - Scene:', sceneNumber);
              console.log('  Model:', modelUpper);
              console.log('  Initial refs (from images.base_image):', refs);
              
                let finalRefs = refs;
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
                  
                  console.log('  Filtered refs (images without background_image):', filteredRefs);
                  
                  // PRIORITY: Use base_image URLs from image arrays if available
                  if (filteredRefs.length > 0) {
                    finalRefs = filteredRefs;
                    console.log('  ✅ FINAL refs used (from images.base_image):', finalRefs);
                    console.log('  Source: images.base_image (prioritized)');
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
                    
                    console.log('  Avatar URLs (from scripts - fallback only):', avatarUrls);
                    
                    if (avatarUrls.length > 0) {
                      finalRefs = avatarUrls;
                      console.log('  ✅ FINAL refs used (from avatar_urls - fallback):', finalRefs);
                      console.log('  Source: avatar_urls (fallback)');
                    } else {
                      console.log('  ✅ FINAL refs used (original):', finalRefs);
                      console.log('  Source: original refs');
                    }
                  }
                }
                
                const meta = {
                  description: it?.desc || it?.description || it?.scene_description || '',
                  narration: it?.narration || it?.voiceover || '',
                  textToBeIncluded: it?.text_to_be_included || it?.textToBeIncluded || it?.include_text || '',
                  model: modelUpper,
                  imageDimensions,
                  textElements,
                  imageVersionData: imagesContainer,
                  imageFrames: arr,
                  isEditable: true,
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
                const meta = {
                  description: sc?.desc || sc?.description || sc?.scene_description || '',
                  narration: sc?.narration || sc?.voiceover || '',
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
                console.log('🔄 SORA FALLBACK: Extracting from images object');
                const versionKey = it.images.current_version || it.images.currentVersion || 'v1';
                const verObj = it.images[versionKey] || it.images.v1 || {};
                const arr = Array.isArray(verObj?.images) ? verObj.images : [];
                refs = arr
                  .map((frame) => frame?.base_image?.image_url || frame?.base_image?.imageUrl || '')
                  .filter(Boolean);
                console.log('  Extracted SORA refs from images.base_image:', refs);
              } else {
                refs = [...collectUrls(it)];
              if (it?.image_url) refs.push(it.image_url);
              if (it?.image_1_url) refs.push(it.image_1_url);
              if (it?.image_2_url) refs.push(it.image_2_url);
              if (Array.isArray(it?.refs)) refs.push(...it.refs);
              if (Array.isArray(it?.urls)) refs.push(...it.urls);
              if (typeof it === 'string') refs.push(it);
              }
              
              const meta = {
                description: it?.desc || it?.description || it?.scene_description || '',
                narration: it?.narration || it?.voiceover || '',
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
          const meta = {
            description: sc?.desc || sc?.description || sc?.scene_description || '',
            narration: sc?.narration || sc?.voiceover || '',
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
          
          // Combine, removing duplicates and background_image URLs
          const refs = [...new Set([...collectedUrls, ...avatarUrls])].filter(Boolean);
          const meta = {
            description: scene?.desc || scene?.description || scene?.scene_description || '',
            narration: scene?.narration || scene?.voiceover || '',
            textToBeIncluded: scene?.text_to_be_included || scene?.textToBeIncluded || scene?.include_text || '',
            model: scene?.model || scene?.mode || '',
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
        const currentScript = scripts[0] || null;
        const airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];
        // Index VEO3 script scenes by scene number so we can use avatar_urls for scenes missing image arrays
        const veo3ScriptScenesByNumber = {};
        airesponse.forEach((scene, index) => {
          if (!scene || typeof scene !== 'object') return;
          const model = String(scene?.model || scene?.mode || '').toUpperCase();
          const isVEO3 = model === 'VEO3' || model === 'ANCHOR';
          if (!isVEO3) return;
          const sceneNumber =
            scene?.scene_number ||
            scene?.scene_no ||
            scene?.sceneNo ||
            scene?.scene ||
            index + 1;
          veo3ScriptScenesByNumber[sceneNumber] = {
            ...scene,
            scene_number: sceneNumber,
            model
          };
        });
        
        const sessionImages = mapSessionImages(sdata?.session_data?.images, veo3ScriptScenesByNumber);
        if (!cancelled && sessionImages.length > 0) {
          setRows(sessionImages);
          const refs0 = Array.isArray(sessionImages[0]?.refs) ? sessionImages[0].refs : [];
          const first = refs0[0] || '';
          setSelected({
            index: 0,
            imageUrl: first,
            images: refs0.slice(0, 2),
            title: sessionImages[0]?.scene_title || 'Untitled',
            sceneNumber: sessionImages[0]?.scene_number ?? '',
            description: sessionImages[0]?.description || '',
            narration: sessionImages[0]?.narration || '',
            textToBeIncluded: sessionImages[0]?.textToBeIncluded || '',
            prompts: sessionImages[0]?.prompts || { opening_frame: {}, closing_frame: {} },
            imageDimensions: sessionImages[0]?.imageDimensions || sessionImages[0]?.image_dimensions || null,
            textElements: Array.isArray(sessionImages[0]?.textElements) ? sessionImages[0].textElements : [],
            imageVersionData: sessionImages[0]?.imageVersionData || null,
            imageFrames: Array.isArray(sessionImages[0]?.imageFrames) ? sessionImages[0].imageFrames : [],
            isEditable: !!sessionImages[0]?.isEditable
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
                  assetsData = { logo_url: '', voice_urls: {} };
                }
                if (assetsResp.ok && assetsData) {
                  setSessionAssets({
                    logo_url: assetsData.logo_url || '',
                    voice_urls: assetsData.voice_urls || {}
                  });
                  console.log('✅ Session assets loaded:', assetsData);
                }
                
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
                  console.log('✅ Transition presets loaded:', validPresets.length, 'presets');
                  console.log('📋 Presets names:', validPresets.map(p => p.name || p.preset_name));
                } else {
                  console.warn('⚠️ No valid presets found. Response:', presetsData);
                  console.warn('⚠️ Presets array:', presetsArray);
                }
              }
            } catch (apiError) {
              console.error('❌ Error loading session assets or presets:', apiError);
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
              try { localStorage.removeItem('images_generate_pending'); } catch(_){}
              // Reload session images now that job is done
              try {
                const sr = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id, session_id })
                });
                const st = await sr.text();
                let sd; try { sd = JSON.parse(st); } catch(_) { sd = {}; }
                    // Extract VEO3 script scenes (avatar_urls) from scripts
                    const sessionData = sd?.session_data || sd?.session || {};
                    const scripts = Array.isArray(sessionData?.scripts) && sessionData.scripts.length > 0 ? sessionData.scripts : [];
                    const currentScript = scripts[0] || null;
                    const airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];
                    const veo3ScriptScenesByNumber = {};
                    airesponse.forEach((scene, index) => {
                      if (!scene || typeof scene !== 'object') return;
                      const model = String(scene?.model || scene?.mode || '').toUpperCase();
                      const isVEO3 = model === 'VEO3' || model === 'ANCHOR';
                      if (!isVEO3) return;
                      const sceneNumber =
                        scene?.scene_number ||
                        scene?.scene_no ||
                        scene?.sceneNo ||
                        scene?.scene ||
                        index + 1;
                      veo3ScriptScenesByNumber[sceneNumber] = {
                        ...scene,
                        scene_number: sceneNumber,
                        model
                      };
                    });
                    
                    const sessionImages = mapSessionImages(sd?.session_data?.images || sd?.session?.images, veo3ScriptScenesByNumber);
                    if (!cancelled) {
                      setRows(sessionImages);
                      if (sessionImages.length > 0) {
                        const refs0 = Array.isArray(sessionImages[0]?.refs) ? sessionImages[0].refs : [];
                        const first = refs0[0] || '';
                        const model0 = String(sessionImages[0]?.model || '').toUpperCase();
                        const imgs = model0 === 'PLOTLY' ? [first] : refs0.slice(0,2);
                        setSelected({
                          index: 0,
                          imageUrl: first,
                          images: imgs,
                          title: sessionImages[0]?.scene_title || 'Untitled',
                          sceneNumber: sessionImages[0]?.scene_number ?? '',
                          description: sessionImages[0]?.description || '',
                          narration: sessionImages[0]?.narration || '',
                          textToBeIncluded: sessionImages[0]?.textToBeIncluded || '',
                          model: model0,
                          prompts: sessionImages[0]?.prompts || { opening_frame: {}, closing_frame: {} },
                          imageDimensions: sessionImages[0]?.imageDimensions || sessionImages[0]?.image_dimensions || null,
                          textElements: Array.isArray(sessionImages[0]?.textElements) ? sessionImages[0].textElements : [],
                          imageVersionData: sessionImages[0]?.imageVersionData || null,
                          imageFrames: Array.isArray(sessionImages[0]?.imageFrames) ? sessionImages[0].imageFrames : [],
                          isEditable: !!sessionImages[0]?.isEditable
                        });
                  }
                }
              } catch(_) { /* ignore */ }
              
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
                      console.log('✅ Session assets loaded:', assetsData);
                    }
                    
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
                      console.log('✅ Transition presets loaded:', validPresets.length, 'presets');
                      console.log('📋 Presets names:', validPresets.map(p => p.name || p.preset_name));
                    } else {
                      console.warn('⚠️ No valid presets found. Response:', presetsData);
                      console.warn('⚠️ Presets array:', presetsArray);
                    }
                  }
                } catch (apiError) {
                  console.error('❌ Error loading session assets or presets:', apiError);
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
      const currentScript = scripts[0] || null;
      const airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];
      
      // Index VEO3 script scenes by scene number so we can use avatar_urls for scenes missing image arrays
      const veo3ScriptScenesByNumber = {};
      airesponse.forEach((scene, index) => {
        if (!scene || typeof scene !== 'object') return;
        const model = String(scene?.model || scene?.mode || '').toUpperCase();
        const isVEO3 = model === 'VEO3' || model === 'ANCHOR';
        if (!isVEO3) return;
        const sceneNumber =
          scene?.scene_number ||
          scene?.scene_no ||
          scene?.sceneNo ||
          scene?.scene ||
          index + 1;
        veo3ScriptScenesByNumber[sceneNumber] = {
          ...scene,
          scene_number: sceneNumber,
          model
        };
      });
      
      const mapSessionImages = (imagesRoot, veo3ScriptScenesByNumber = {}) => {
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
            final_prompt: getFirstString(raw, ['final_prompt','finalPrompt','prompt','final']),
            image_summary: getFirstString(raw, ['image_summary','imageSummary','summary']),
            main_subject_details: getFirstString(raw, ['main_subject_details','mainSubjectDetails','main_subject','subject_details','subject']),
            pose_or_action: getFirstString(raw, ['pose_or_action','poseOrAction','pose','action']),
            secondary_elements: getFirstString(raw, ['secondary_elements','secondaryElements','secondaries','secondary']),
            lighting_and_atmosphere: getFirstString(raw, ['lighting_and_atmosphere','lightingAndAtmosphere','lighting','atmosphere','mood']),
            framing_and_composition: getFirstString(raw, ['framing_and_composition','framingAndComposition','framing','composition']),
            technical_enhancers: getFirstString(raw, ['technical_enhancers','technicalEnhancers','technical','enhancers'])
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
                console.log('📦 EXTRACTING IMAGES FROM images.v1.images array');
                console.log('  Model:', modelUpper);
                console.log('  Images array:', arr);
              const refs = arr
                  .map((it) => {
                    const url = isSora
                      ? (it?.base_image?.image_url || it?.base_image?.imageUrl || '')
                      : (it?.base_image?.image_url || it?.base_image?.imageUrl || it?.image_url || it?.url || '');
                    console.log('    Extracted URL from base_image:', url);
                    return url;
                  })
                .filter(Boolean);
                console.log('  Extracted refs:', refs);
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
              pushRow(1, imagesRoot?.scene_title || 'Images', refs, {
                description: imagesRoot?.description || imagesRoot?.scene_description || '',
                narration: imagesRoot?.narration || '',
                textToBeIncluded: imagesRoot?.text_to_be_included || '',
                imageDimensions,
                textElements,
                imageVersionData: imagesRoot,
                imageFrames: arr,
                isEditable: true,
                model: modelUpper,
                prompts: normalizePromptFields(imagesRoot?.prompts || {})
              });
            }
          } catch (e) {
            console.error('Error mapping single object:', e);
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
                const textElements = Array.isArray(primary?.text_elements)
                  ? primary.text_elements
                  : Array.isArray(primary?.textElements)
                  ? primary.textElements
                  : [];
                pushRow(it?.scene_number ?? (idx + 1), it?.scene_title || it?.title, soraRefs, {
                  description: it?.description || it?.scene_description || '',
                  narration: it?.narration || '',
                  textToBeIncluded: it?.text_to_be_included || '',
                  imageDimensions,
                  textElements,
                  imageVersionData: imagesContainer,
                  imageFrames: arr,
                  isEditable: true,
                  model: modelUpper,
                  prompts: normalizePromptFields(verObj?.prompts || it?.prompts || {})
                });
                return;
              }
            }
            
            let refs = collectUrls(it);
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
              
              // PRIORITY: Use base_image URLs from image arrays if available
              if (filteredRefs.length > 0) {
                refs = filteredRefs;
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
                  // If no filtered refs, use only avatar_urls
                  refs = avatarUrls;
                }
              }
            }
            
            if (refs.length > 0) {
              const baseImage = it?.base_image || it?.baseImage || {};
              const imageDimensions =
                baseImage?.image_dimensions ||
                baseImage?.imageDimensions ||
                it?.image_dimensions ||
                it?.imageDimensions ||
                null;
              const textElements = Array.isArray(it?.text_elements)
                ? it.text_elements
                : Array.isArray(it?.textElements)
                ? it.textElements
                : [];
              pushRow(it?.scene_number ?? (idx + 1), it?.scene_title || it?.title, refs, {
                description: it?.description || it?.scene_description || '',
                narration: it?.narration || '',
                textToBeIncluded: it?.text_to_be_included || '',
                imageDimensions,
                textElements,
                imageVersionData: it,
                imageFrames: Array.isArray(it?.images) ? it.images : [it],
                isEditable: true,
                prompts: normalizePromptFields(it?.prompts || {})
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
            
            // Combine, removing duplicates and background_image URLs
            const refs = [...new Set([...collectedUrls, ...avatarUrls])].filter(Boolean);
            const meta = {
              description: scene?.description || scene?.scene_description || '',
              narration: scene?.narration || '',
              textToBeIncluded: scene?.text_to_be_included || '',
              imageDimensions: null,
              textElements: [],
              imageVersionData: null,
              imageFrames: [],
              isEditable: false,
              prompts: normalizePromptFields(scene?.prompts || {})
            };
            pushRow(num, scene?.scene_title || scene?.title, refs, meta);
          });
        }
        return mapped;
      };
      
      const sessionImages = mapSessionImages(sdata?.session_data?.images, veo3ScriptScenesByNumber);
      if (sessionImages.length > 0) {
        setRows(sessionImages);
        const refs0 = Array.isArray(sessionImages[0]?.refs) ? sessionImages[0].refs : [];
        const first = refs0[0] || '';
        const model0 = String(sessionImages[0]?.model || '').toUpperCase();
        const imgs = model0 === 'PLOTLY' ? [first] : refs0.slice(0,2);
        setSelected({
          index: 0,
          imageUrl: first,
          images: imgs,
          title: sessionImages[0]?.scene_title || 'Untitled',
          sceneNumber: sessionImages[0]?.scene_number ?? '',
          description: sessionImages[0]?.description || '',
          narration: sessionImages[0]?.narration || '',
          textToBeIncluded: sessionImages[0]?.textToBeIncluded || '',
          model: model0,
          prompts: sessionImages[0]?.prompts || { opening_frame: {}, closing_frame: {} },
          imageDimensions: sessionImages[0]?.imageDimensions || sessionImages[0]?.image_dimensions || null,
          textElements: Array.isArray(sessionImages[0]?.textElements) ? sessionImages[0].textElements : [],
          imageVersionData: sessionImages[0]?.imageVersionData || null,
          imageFrames: Array.isArray(sessionImages[0]?.imageFrames) ? sessionImages[0].imageFrames : [],
          isEditable: !!sessionImages[0]?.isEditable
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

  // Handle regenerate image with popup
  const handleRegenerateClick = (sceneNumber) => {
    setRegeneratingSceneNumber(sceneNumber);
    setRegenerateUserQuery('');
    setError(''); // Clear any previous errors
    setShowRegeneratePopup(true);
  };

  // Get aspect ratio from script data
  const getAspectRatio = React.useCallback(async () => {
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
      const currentScript = scripts[0] || null;
      
      // Get aspect ratio from script
      const aspectRatio = currentScript?.aspect_ratio || 
                         currentScript?.aspectRatio || 
                         sessionData?.aspect_ratio || 
                         sessionData?.aspectRatio || 
                         '16:9';
      
      return aspectRatio;
    } catch (_) {
      return '16:9';
    }
  }, []);

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

      const aspectRatio = await getAspectRatio();

      // Call regenerate API endpoint
      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/api/image-editing/regenerate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'regenerate',
          aspect_ratio: aspectRatio,
          frames_to_regenerate: ['opening', 'closing'],
          model: 'SORA',
          save_as_new_version: false,
          scene_number: regeneratingSceneNumber,
          session_id: session_id,
          user_id: user_id,
          user_query: regenerateUserQuery.trim()
        })
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

      // Close popup and refresh the image list after regeneration
      setShowRegeneratePopup(false);
      setRegenerateUserQuery('');
      setRegeneratingSceneNumber(null);
      await refreshLoad();
    } catch (e) {
      setError(e?.message || 'Failed to regenerate image');
    } finally {
      setIsRegenerating(false);
    }
  }, [regenerateUserQuery, regeneratingSceneNumber, refreshLoad]);

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
    async (frame, fallbackDimensions = null) => {
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
      const baseWidth = Number(baseDims?.width) ? Number(baseDims.width) : (imgEl.naturalWidth || imgEl.width || 0);
      const baseHeight = Number(baseDims?.height) ? Number(baseDims.height) : (imgEl.naturalHeight || imgEl.height || 0);
      const width = imgEl.naturalWidth || imgEl.width || baseWidth || 1280;
      const height = imgEl.naturalHeight || imgEl.height || baseHeight || 720;

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
      if (overlayEls.length > 0) {
        await drawOverlayElementsOnCanvas(ctx, overlayEls, width, height, baseWidth || width, baseHeight || height);
      }

      return canvas.toDataURL('image/png');
    },
    []
  );

  const dataUrlToBlob = React.useCallback(async (dataUrl) => {
    const res = await fetch(dataUrl);
    return await res.blob();
  }, []);

  const mergeAndDownloadAllImages = React.useCallback(async () => {
    let failed = 0;
    let saved = 0;
  
    try {
      console.log('🎬 Starting image save process using html2canvas...');
      console.log(`📊 Total scenes: ${rows.length}`);
      
      if (rows.length === 0) {
        console.warn('⚠️ No scenes found - nothing to save');
        return failed;
      }

      // Iterate through ALL rows (scenes)
      for (let sceneIndex = 0; sceneIndex < rows.length; sceneIndex++) {
        const row = rows[sceneIndex];
        const sceneNumber = row?.scene_number || (sceneIndex + 1);
        const modelUpper = String(row?.model || '').toUpperCase();
        const refs = row?.refs || [];
        const images = modelUpper === 'PLOTLY' ? [refs[0]] : refs.slice(0, 2);

        console.log(`\n🎬 Processing Scene ${sceneNumber} (${images.length} images)...`);

        // First, select this scene to render it in the Reel Reports Image Editor section
        console.log(`📍 Selecting scene ${sceneNumber} for rendering...`);
        const imgs = modelUpper === 'PLOTLY' ? [refs[0]] : refs.slice(0, 2);
        setSelected({
          index: sceneIndex,
          imageUrl: refs[0] || '',
          images: imgs,
          title: row.scene_title || 'Untitled',
          sceneNumber: row.scene_number,
          description: row?.description || '',
          narration: row?.narration || '',
          textToBeIncluded: row?.textToBeIncluded || '',
          model: modelUpper,
          prompts: row?.prompts || { opening_frame: {}, closing_frame: {} },
          imageDimensions: row?.imageDimensions || null,
          textElements: Array.isArray(row?.textElements) ? row.textElements : [],
          imageVersionData: row?.imageVersionData || null,
          imageFrames: Array.isArray(row?.imageFrames) ? row.imageFrames : [],
          isEditable: !!row?.isEditable
        });
        
        // Wait for DOM to update and images to render with text/overlays
        console.log(`⏳ Waiting for DOM to render scene ${sceneNumber}...`);
        await new Promise(resolve => setTimeout(resolve, 800));

        // Process each image in this scene by capturing from DOM
        for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
          const imageUrl = images[imageIndex];
          
          if (!imageUrl) {
            console.warn(`⚠️ Scene ${sceneNumber}, Image ${imageIndex + 1}: No URL, skipping`);
            continue;
          }
          
          try {
            console.log(`📷 Scene ${sceneNumber}, Image ${imageIndex + 1}: Capturing from DOM...`);
            
            // Find the image container in the Reel Reports Image Editor section
            // Use data-scene-number and data-image-index attributes to target the correct container
            const selector = `[data-image-container][data-scene-number="${sceneNumber}"][data-image-index="${imageIndex}"]`;
            const container = document.querySelector(selector);
            
            if (!container) {
              console.warn(`⚠️ Scene ${sceneNumber}, Image ${imageIndex + 1}: Container not found in DOM (${selector})`);
              console.log('🔍 Available containers:', document.querySelectorAll('[data-image-container]').length);
            failed += 1;
            continue;
          }
            
            console.log(`📸 Scene ${sceneNumber}, Image ${imageIndex + 1}: Capturing with html2canvas...`);
            
            // Capture the container with html2canvas (includes image + text + overlays with exact positioning)
            const canvas = await html2canvas(container, {
              useCORS: true,
              allowTaint: true,
              backgroundColor: null,
              scale: 2,  // High quality (2x resolution)
              logging: false,  // Disable html2canvas internal logging
              windowWidth: container.scrollWidth,
              windowHeight: container.scrollHeight
            });
            
            // Convert canvas to blob
            const blob = await new Promise((resolve) => {
              canvas.toBlob((blob) => {
                resolve(blob);
              }, 'image/png', 1.0);
            });
            
            if (!blob) {
              console.warn(`⚠️ Scene ${sceneNumber}, Image ${imageIndex + 1}: Failed to create blob`);
          failed += 1;
              continue;
            }
            
            // Generate filename
            const fileName = `scene-${sceneNumber}-image-${imageIndex + 1}.png`;
            
            // Save to temp folder via backend API (NO browser download)
            const file = new File([blob], fileName, { type: 'image/png' });
            const formData = new FormData();
            formData.append('image', file);
            formData.append('fileName', fileName);
            formData.append('sceneNumber', sceneNumber);
            formData.append('imageIndex', imageIndex);

            console.log(`📤 Scene ${sceneNumber}, Image ${imageIndex + 1}: Uploading to temp folder...`);
            const saveResponse = await fetch('/api/save-temp-image', {
              method: 'POST',
              body: formData,
            });

            if (saveResponse.ok) {
              console.log(`✅ Scene ${sceneNumber}, Image ${imageIndex + 1}: Saved successfully with html2canvas`);
              saved += 1;
            } else {
              const errorText = await saveResponse.text();
              console.error(`❌ Scene ${sceneNumber}, Image ${imageIndex + 1}: Save failed (${saveResponse.status}): ${errorText}`);
              failed += 1;
            }
            
            // Small delay between images
            await new Promise(resolve => setTimeout(resolve, 200));
            
          } catch (error) {
            console.error(`❌ Scene ${sceneNumber}, Image ${imageIndex + 1}: Error -`, error);
            failed += 1;
          }
        }
      }

      console.log(`\n✅ Save process complete! Saved: ${saved}, Failed: ${failed}`);
      
      // No alerts - just console logs for background processing
      if (saved > 0) {
        console.log(`✅ Successfully saved ${saved} image(s) to temp folder`);
      } else if (failed > 0) {
        console.warn(`⚠️ Failed to save ${failed} image(s). Check console for details.`);
      }
    } catch (error) {
      console.error('❌ Fatal error in mergeAndDownloadAllImages:', error);
      // No alert - error will be handled by parent function
      throw error;
    }
  
    return failed;
  }, [rows, setSelected]);

  // Function to call save-all-frames API with temp folder images
  const callSaveAllFramesAPI = React.useCallback(async () => {
    try {
      console.log('📡 Step 2: Preparing API call to save-all-frames...');
      
      const userId = localStorage.getItem('token');
      const sessionId = localStorage.getItem('session_id');
      
      if (!userId || !sessionId) {
        throw new Error('Missing user_id or session_id');
      }
      
      // Build frame metadata based on rows
      const frameMetadata = [];
      let fileIndex = 0;
      const fileMap = {}; // Map scene-image to file index
      
      for (let sceneIndex = 0; sceneIndex < rows.length; sceneIndex++) {
        const row = rows[sceneIndex];
        const sceneNumber = row?.scene_number || (sceneIndex + 1);
        const model = row?.model || 'VEO3';
        const modelUpper = String(model).toUpperCase();
        const refs = row?.refs || [];
        const images = modelUpper === 'PLOTLY' ? [refs[0]] : refs.slice(0, 2);
        
        const sceneMetadata = {
          scene_number: sceneNumber,
          model: modelUpper
        };
        
        // Map images to file indices
        for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
          const fileName = `scene-${sceneNumber}-image-${imageIndex + 1}.png`;
          const fileKey = `file_${fileIndex}`;
          fileMap[fileName] = fileKey;
          
          if (images.length === 1) {
            // Single image scene - use background_frame
            sceneMetadata.background_frame = fileKey;
          } else {
            // Multiple images - use opening_frame and closing_frame
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
      }
      
      console.log('📋 Frame metadata:', JSON.stringify(frameMetadata, null, 2));
      console.log('🗺️ File map:', fileMap);
      
      // Create FormData
      const formData = new FormData();
      formData.append('user_id', userId);
      formData.append('session_id', sessionId);
      formData.append('frame_metadata', JSON.stringify(frameMetadata));
      
      // Read all images from temp folder and add to FormData
      console.log('📂 Reading images from temp folder...');
      const imageFiles = [];
      
      for (let sceneIndex = 0; sceneIndex < rows.length; sceneIndex++) {
        const row = rows[sceneIndex];
        const sceneNumber = row?.scene_number || (sceneIndex + 1);
        const modelUpper = String(row?.model || '').toUpperCase();
        const refs = row?.refs || [];
        const images = modelUpper === 'PLOTLY' ? [refs[0]] : refs.slice(0, 2);
        
        for (let imageIndex = 0; imageIndex < images.length; imageIndex++) {
          const fileName = `scene-${sceneNumber}-image-${imageIndex + 1}.png`;
          const fileKey = fileMap[fileName];
          
          // Fetch image from temp folder
          try {
            const imageUrl = `/temp/edited-images/${fileName}`;
            const response = await fetch(imageUrl);
            
            if (!response.ok) {
              console.warn(`⚠️ Could not fetch ${fileName} from temp folder`);
              continue;
            }
            
            const blob = await response.blob();
            const file = new File([blob], fileName, { type: 'image/png' });
            
            // Add to FormData with file key
            formData.append('frames', file);
            imageFiles.push(fileName);
            
            console.log(`✅ Added ${fileName} as ${fileKey}`);
          } catch (error) {
            console.error(`❌ Error reading ${fileName}:`, error);
          }
        }
      }
      
      if (imageFiles.length === 0) {
        throw new Error('No images found in temp folder');
      }
      
      console.log(`📤 Uploading ${imageFiles.length} images to API...`);
      
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
      
      console.log('✅ API call successful:', responseData);
      
      // Delete all images from temp folder
      console.log('🗑️ Deleting images from temp folder...');
      for (const fileName of imageFiles) {
        try {
          const deleteResponse = await fetch(`/api/delete-temp-image?fileName=${encodeURIComponent(fileName)}`, {
            method: 'DELETE',
          });
          
          if (deleteResponse.ok) {
            console.log(`✅ Deleted ${fileName}`);
          } else {
            console.warn(`⚠️ Could not delete ${fileName}`);
          }
        } catch (error) {
          console.warn(`⚠️ Error deleting ${fileName}:`, error);
        }
      }
      
      console.log('✅ All temp images deleted');
      return { success: true, response: responseData };
      
    } catch (error) {
      console.error('❌ Error in callSaveAllFramesAPI:', error);
      throw error;
    }
  }, [rows]);

  
  // Function to call /v1/videos/regenerate after save-all-frames succeeds
  const callVideosRegenerateAPI = React.useCallback(async () => {
    try {
      const session_id = localStorage.getItem('session_id');
      const user_id = localStorage.getItem('token');

      if (!session_id || !user_id) {
        console.warn('⚠️ Missing session or user for videos/regenerate');
        return;
      }

      const aspectRatio = await getAspectRatio();
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

        const sceneOptions = sceneAdvancedOptions[sceneNumber] || {
          logoNeeded: false,
          voiceUrl: '',
          voiceOption: '',
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

      const logoUrl =
        sceneOptions.logoNeeded && sessionAssets.logo_url
          ? sessionAssets.logo_url
          : '';

        // Build voiceover object - should be object with name, type, url, created_at or null
        let voiceover = null;
        const voiceoverUrl = sceneOptions.voiceUrl || null;
        if (voiceoverUrl) {
          // Find the voice entry from sessionAssets.voice_urls
          const voiceEntries = Object.entries(sessionAssets.voice_urls || {});
          const matched = voiceEntries.find(([, url]) => url === voiceoverUrl);
          if (matched) {
            const [name, url] = matched;
            voiceover = {
              name: name || '',
              type: 'audio',
              url: url || voiceoverUrl,
              created_at: new Date().toISOString() // Use current timestamp if not available
            };
          } else {
            // Fallback: create object from URL
            voiceover = {
              name: sceneOptions.voiceOption || '',
              type: 'audio',
              url: voiceoverUrl,
              created_at: new Date().toISOString()
            };
          }
        }

        // Voice option string only when no explicit voice URL is selected
        const voiceOption = sceneOptions.voiceUrl ? '' : (sceneOptions.voiceOption || '');

        // Default prompt template (mainly relevant for VEO3)
        const veo3PromptTemplate =
          (row && typeof row.veo3_prompt_template === 'object'
            ? row.veo3_prompt_template
            : {
                style: '',
                action: '',
                camera: '',
                subject: '',
                ambiance: '',
                background: '',
                composition: '',
                focus_and_lens: '',
              }) || {};

        // Build transitions (mainly for SORA/ANCHOR/PLOTLY)
        // transitions must always be an array
        let transitions = [];
        const isSoraAnchorPlotly =
          modelUpper === 'SORA' ||
          modelUpper === 'ANCHOR' ||
          modelUpper === 'PLOTLY';

        if (isSoraAnchorPlotly) {
          const hasPreset = !!sceneOptions.transitionPreset;
          // is_preset: true if preset is selected (not custom), false if custom/design your own
          const isPreset = hasPreset && sceneOptions.transitionCustom !== 'custom';

          // Check if custom/design your own is selected
          const useCustom =
            !isPreset &&
            (sceneOptions.transitionCustom === 'custom' ||
              (sceneOptions.customDescription || '').trim().length > 0 ||
              Object.values(sceneOptions.customPreservationNotes || {}).some(
                (v) => (v || '').trim().length > 0
              ));

          if (isPreset) {
            // Use preset object as-is
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
            // Custom/Design your own or library custom template
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
          }
        }

        // Ensure transitions is always an array (required field)
        const scenePayload = {
          scene_number: sceneNumber,
          model: modelUpper,
          logo_url: logoUrl,
          voiceover: voiceover, // Object with name, type, url, created_at or null
          voiceoption: voiceOption, // String like "male" or "female"
          transitions: transitions, // Always an array (can be empty)
        };
        
        return scenePayload;
      });

      const body = {
        session_id,
        user_id,
        aspect_ratio: aspectRatio,
        subtitles: subtitlesFlag,
        scenes: scenesPayload,
      };

      setVideoGenProgress((prev) => ({
        ...prev,
        visible: true,
        step: 'queueing',
        status: 'queueing',
        percent: Math.max(prev.percent, 50),
        message: ''
      }));

      console.log('📡 Calling /v1/generate-videos-queue with body:', JSON.stringify(body, null, 2));

      const resp = await fetch(
        'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/generate-videos-queue',
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
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
        console.error(
          '❌ /v1/generate-videos-queue failed:',
          resp.status,
          text
        );
        throw new Error(`generate-videos-queue API failed: ${resp.status} ${text}`);
      }

      console.log('✅ /v1/generate-videos-queue success:', data);
      console.log('📋 Full queue response:', JSON.stringify(data, null, 2));
      
      // Extract job_id from response - check multiple possible fields
      const jobId = data?.job_id || data?.jobId || data?.id || data?.data?.job_id || null;
      
      if (!jobId) {
        console.error('❌ No job_id in generate-videos-queue response. Full response:', JSON.stringify(data, null, 2));
        throw new Error('No job_id received from generate-videos-queue API');
      }
      
      // Ensure jobId is a string
      const jobIdString = String(jobId).trim();
      if (!jobIdString || jobIdString === 'null' || jobIdString === 'undefined') {
        console.error('❌ Invalid job_id:', jobId);
        throw new Error('Invalid job_id received from regenerate API');
      }
      
      console.log('📋 Job ID received (validated):', jobIdString);

      setVideoGenProgress((prev) => ({
        ...prev,
        step: 'queued',
        status: 'queued',
        percent: Math.max(prev.percent, 60),
        jobId: jobIdString,
        message: 'Video job queued successfully'
      }));

      return jobIdString;
    } catch (error) {
      setVideoGenProgress((prev) => ({
        ...prev,
        visible: true,
        status: 'error',
        step: 'error',
        message: error?.message || 'Failed to queue video generation',
      }));
      console.error('❌ Error in callVideosRegenerateAPI:', error);
      throw error;
    }
  }, [rows, sceneAdvancedOptions, sessionAssets, subtitlesEnabled, getAspectRatio]);
  

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
      console.log('⚠️ Already processing, please wait...');
      return false;
    }
    
    console.log('🎬 Generate Videos button clicked - Starting background process...');
    
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
        console.log('📦 Step 1: Saving all images to temp folder...');
        const failedDownloads = await mergeAndDownloadAllImages();
        
        if (failedDownloads > 0) {
          console.warn(`⚠️ Some images failed to save: ${failedDownloads}`);
          setError('Some images could not be saved to temp folder.');
        } else {
          console.log('✅ All images saved successfully');
        }
        
        // Wait a bit to ensure all saves are complete
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // Step 2: Call save-all-frames API
        console.log('📦 Step 2: Calling save-all-frames API...');
        try {
          await callSaveAllFramesAPI();
          console.log('✅ save-all-frames API completed successfully');
          console.log('✅ All temp images deleted');
          setVideoGenProgress((prev) => ({
            ...prev,
            visible: true,
            percent: Math.max(prev.percent, 40),
            status: 'uploading',
            step: 'uploading_frames',
            message: ''
          }));

          // Step 3: Call videos/regenerate API with updated frames
          console.log('📡 Step 3: Calling /v1/videos/regenerate...');
          const newJobId = await callVideosRegenerateAPI();
          if (newJobId) {
            startVideoRedirectFlow(newJobId);
          }

          console.log(
            '✅ Process completed successfully - all images saved, uploaded, and regeneration triggered'
          );
          // No alert - just console log
        } catch (apiError) {
          console.error('❌ Error in save-all-frames or regenerate API:', apiError);
          setError('API upload failed: ' + apiError.message);
          // No alert - just set error state
        }
        
      } catch (e) {
        console.error('❌ Error in handleGenerateVideosClick:', e);
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
        console.log('🏁 Process complete, re-enabling button');
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
  }, [isPreparingDownloads, mergeAndDownloadAllImages, callSaveAllFramesAPI, callVideosRegenerateAPI, rows, startVideoRedirectFlow]);

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
        <h3 className="text-lg font-semibold text-[#13008B]">Storyboard Images</h3>
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
        <div className="absolute inset-0 z-30 flex flex-col items-center justify-center bg-white backdrop-blur-sm">
          <style>{`
            @keyframes spin-svg {
              from {
                transform: rotate(0deg);
              }
              to {
                transform: rotate(360deg);
              }
            }
            .spinner-circle {
              animation: spin-svg 1.5s linear infinite;
            }
          `}</style>
          <div className="flex flex-col items-center justify-center space-y-4">
            {/* Circle Loader */}
            <div className="relative w-20 h-20">
              <svg className="w-20 h-20" viewBox="0 0 100 100">
                {/* Background circle */}
                <circle
                  cx="50"
                  cy="50"
                  r="45"
                  stroke="#E5E7EB"
                  strokeWidth="8"
                  fill="none"
                />
                {/* Animated circle */}
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
                  style={{
                    transformOrigin: '50% 50%',
                  }}
                />
              </svg>
              {/* Inner dot */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-3 h-3 bg-[#13008B] rounded-full" />
              </div>
            </div>
            {/* Loading Text */}
            <div className="text-center space-y-1">
              <p className="text-lg font-semibold text-[#13008B]">Generating Images</p>
              <p className="text-sm text-gray-600">Please wait while we create your storyboard...</p>
            </div>
          </div>
        </div>
      )}

      <div className="p-4 space-y-4 overflow-y-auto overflow-x-hidden">
      
        {error && (<div className="text-sm text-red-600 mb-2">{error}</div>)}

        {/* Only show selected image details when not polling */}
        {selected?.imageUrl && (!isPolling || rows.length > 0) && (
          <div className="bg-white border rounded-xl p-4 h-[600px] overflow-y-auto scrollbar-hide">

          <div className='flex justify-end items-center mb-2'>
          {selected?.isEditable && (
            <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const sceneNum = selected?.sceneNumber || selected?.scene_number || 1;
                              handleRegenerateClick(sceneNum);
                            }}
                            className=" bg-[#13008B] hover:bg-blue-800 text-white px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 "
                            title="Regenerate Image"
                          >
                            <RefreshCw className="w-4 h-4" />
                            <span className="text-sm font-medium">Regenerate</span>
                          </button> 
          )}
          </div>
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
                // Priority 1: selected.images array
                if (Array.isArray(selected.images) && selected.images[0] && typeof selected.images[0] === 'string') {
                  const url = selected.images[0].trim();
                  if (isValidImageUrl(url)) return url;
                }
                // Priority 2: selected.imageUrl
                if (selected.imageUrl && typeof selected.imageUrl === 'string') {
                  const url = selected.imageUrl.trim();
                  if (isValidImageUrl(url)) return url;
                }
                // Priority 3: Get from rows data (where avatar_urls are stored)
                const currentRow = rows[selected.index];
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
                // Priority 1: selected.images array
                if (Array.isArray(selected.images) && selected.images[1] && typeof selected.images[1] === 'string') {
                  const url = selected.images[1].trim();
                  if (isValidImageUrl(url)) return url;
                }
                // Priority 2: Get from rows data (where avatar_urls are stored)
                const currentRow = rows[selected.index];
                if (currentRow && Array.isArray(currentRow.refs) && currentRow.refs[1]) {
                  const url = typeof currentRow.refs[1] === 'string' ? currentRow.refs[1].trim() : '';
                  if (isValidImageUrl(url)) return url;
                }
                return '';
              };
              const img1 = getImg1();
              const img2 = getImg2();
              const hasSecondImage = img2 && img2.trim();
              
              // Debug log to see what images are being used
              console.log('🖼️ Displaying Images:', {
                sceneNumber: selected?.sceneNumber,
                selectedIndex: selected.index,
                img1: img1 || '(empty)',
                img1Valid: img1 ? isValidImageUrl(img1) : false,
                img2: img2 || '(empty)',
                img2Valid: img2 ? isValidImageUrl(img2) : false,
                selectedImages: selected.images,
                selectedImageUrl: selected.imageUrl,
                hasSecondImage,
                currentRowRefs: rows[selected.index]?.refs || 'N/A',
                allRowsCount: rows.length,
                warning: !img1 ? '⚠️ No valid image URL found for Image 1' : (img1 && !isValidImageUrl(img1) ? '⚠️ Image 1 URL format is invalid' : '✅ Image 1 URL is valid')
              });
              
              return (
                  <div className="grid grid-cols-1 gap-4 mb-4">
                  {/* Image 1 */}
                  {(img1 && typeof img1 === 'string' && img1.trim()) ? (
                    <div
                      className="w-full bg-black rounded-lg overflow-hidden relative flex items-center justify-center group"
                      data-image-container
                      data-scene-number={selected?.sceneNumber || selected?.scene_number || 1}
                      data-image-index="0"
                      style={{
                        aspectRatio: selected?.imageDimensions?.width && selected?.imageDimensions?.height
                          ? `${selected.imageDimensions.width} / ${selected.imageDimensions.height}`
                          : '16 / 9',
                        minHeight: '200px'
                      }}
                    >
                      {(() => {
                    const frames = Array.isArray(selected.imageFrames) ? selected.imageFrames : [];
                    // Find the frame that matches img1 URL
                    const frameForImg1 = frames.find((frame) => {
                      const base = frame?.base_image || frame?.baseImage || {};
                      const frameUrl =
                        base.image_url ||
                        base.imageUrl ||
                        base.url ||
                        frame.image_url ||
                        frame.imageUrl ||
                        frame.url ||
                        '';
                      // Normalize URLs for comparison (remove trailing slashes, query params, etc.)
                      const normalizeUrl = (url) => {
                        if (!url || typeof url !== 'string') return '';
                        return url.trim().split('?')[0].replace(/\/$/, '');
                      };
                      return frameUrl && normalizeUrl(frameUrl) === normalizeUrl(img1);
                    }) || (frames.length > 0 ? frames[0] : null);
                    const fallbackFrame1 = frameForImg1 || (frames.length > 0 ? frames[0] : null);
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
                      selected?.imageDimensions ||
                      fallbackFrame1?.base_image?.image_dimensions ||
                      fallbackFrame1?.base_image?.imageDimensions ||
                      imageNaturalDims[img1] ||
                      (frames[0]?.base_image?.image_dimensions || frames[0]?.base_image?.imageDimensions) ||
                      { width: 1280, height: 720 };
                    return (
                      <>
                        {/* Regenerate button - top right above image */}
                        {selected?.isEditable && (
                         <></>
                        )}
                        {img1 && typeof img1 === 'string' && img1.trim() ? (
                          <img
                            src={img1}
                            alt={`scene-${selected.sceneNumber}-1`}
                            className="w-full h-full object-contain"
                            crossOrigin={img1.startsWith('http') && !img1.includes(window.location.hostname) ? "anonymous" : undefined}
                            onLoad={(e) => {
                              handleNaturalSize(img1, e.target);
                              console.log('✅ Image 1 loaded successfully:', img1);
                            }}
                            onError={(e) => {
                              const errorImg = e.target;
                              const failedUrl = errorImg.src;
                              console.error('❌ Image 1 failed to load:', {
                                attemptedUrl: failedUrl,
                                originalImg1: img1,
                                errorType: errorImg.naturalWidth === 0 ? 'Invalid/Empty Image' : 'Load Error',
                                naturalWidth: errorImg.naturalWidth,
                                naturalHeight: errorImg.naturalHeight,
                                complete: errorImg.complete,
                                currentSrc: errorImg.currentSrc
                              });
                              
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
                                  if (img && typeof img === 'string' && img.trim() && img !== failedUrl && !fallbackUrls.includes(img.trim())) {
                                    fallbackUrls.push(img.trim());
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
                                console.log('🔄 Trying fallback URL:', nextUrl);
                                // Remove crossOrigin to avoid CORS issues on retry
                                errorImg.crossOrigin = null;
                                errorImg.src = nextUrl;
                              } else {
                                console.error('❌ No fallback URLs available. All image sources exhausted.');
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
                          // If this scene is not editable (e.g., fallback background/avatar image only), hide edit
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
                          
                          // Hide edit button for VEO3 with gen_image=false
                          if (isVEO3 && !genImage) {
                            return null;
                          }
                          
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                // Get the frame data for this specific image (Image 1)
                                const frame = frameForImg1;
                                if (frame) {
                                  // Build the JSON structure with base_image, text_elements, and overlay_elements
                                  const frameData = {
                                    base_image: frame?.base_image || frame?.baseImage || {
                                      image_url: img1,
                                      image_dimensions: selected?.imageDimensions || {}
                                    },
                                    text_elements: Array.isArray(frame?.text_elements) ? frame.text_elements : 
                                                   Array.isArray(frame?.textElements) ? frame.textElements : [],
                                    overlay_elements: Array.isArray(frame?.overlay_elements) ? frame.overlay_elements : []
                                  };
                                  setEditingImageFrame(frameData);
                                  setEditingSceneNumber(selected?.sceneNumber || selected?.scene_number || 1);
                                  setEditingImageIndex(0); // Image 1 is index 0
                                  setShowImageEdit(true);
                                }
                              }}
                              className="absolute right-0 top-[20px] -translate-y-1/2 translate-x-full group-hover:translate-x-0 transition-transform duration-300 bg-[#13008B] text-white p-2 rounded-l-lg hover:bg-[#0f0068] z-10"
                              title="Edit Image"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          );
                        })()}
                        {Array.isArray(effectiveTextEls1) && effectiveTextEls1.length > 0 && (
                          <div className="absolute inset-0 pointer-events-none">
                            {effectiveTextEls1.map((el, idx) => {
                              if (!el || typeof el !== 'object') return null;
                              const { leftPct, topPct, widthPct, heightPct, mode } = computeBoxPercents(el.bounding_box || {}, frameDims1 || selected?.imageDimensions || {});
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
                              const style = {
                                position: 'absolute',
                                left: `${leftPct}%`,
                                top: `${topPct}%`,
                                width: widthPct != null ? `${widthPct}%` : 'auto',
                                height: heightPct != null ? `${heightPct}%` : 'auto',
                                transform: anchor === 'center' ? 'translate(-50%, -50%)' : 'none',
                                color,
                                fontFamily,
                                fontWeight,
                                fontSize,
                                lineHeight,
                                textShadow,
                                whiteSpace: 'pre-wrap'
                              };
                              return <div key={idx} style={style}>{el.text || ''}</div>;
                            })}
                                </div>
                        )}
                        {Array.isArray(overlayEls1) && overlayEls1.length > 0 && (
                          <div className="absolute inset-0 pointer-events-none">
                            {overlayEls1.map((ov, idx) => {
                              if (!ov || typeof ov !== 'object') return null;
                              const { leftPct, topPct, widthPct, heightPct } = computeBoxPercents(ov.bounding_box || {}, frameDims1 || selected?.imageDimensions || {});
                              const overlayUrl =
                                ov?.overlay_image?.image_url ||
                                ov?.overlay_image?.imageUrl ||
                                ov?.image_url ||
                                ov?.imageUrl ||
                                ov?.url ||
                                ov?.src ||
                                ov?.link ||
                                '';
                              if (!overlayUrl) return null;
                              const opacity = typeof ov.opacity === 'number' ? ov.opacity : 1;
                              return (
                                <img
                                  key={idx}
                                  src={overlayUrl}
                                  alt="overlay"
                                  className="absolute"
                                  crossOrigin="anonymous"
                                  style={{
                                    left: `${leftPct}%`,
                                    top: `${topPct}%`,
                                    width: widthPct != null ? `${widthPct}%` : 'auto',
                                    height: heightPct != null ? `${heightPct}%` : 'auto',
                                    opacity,
                                    transform: ov?.layout?.anchor_point === 'center' ? 'translate(-50%, -50%)' : 'none'
                                  }}
                                />
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                      })()}
                    </div>
                  ) : (
                    <div className="w-full bg-black rounded-lg overflow-hidden relative flex items-center justify-center" style={{ aspectRatio: '16 / 9', minHeight: '200px' }}>
                      <div className="text-center text-white text-sm">
                        <p>No image available</p>
                        <p className="text-xs mt-2 opacity-75">Scene {selected?.sceneNumber || selected?.scene_number || 1}</p>
                        <p className="text-xs mt-1 opacity-50">Check console for details</p>
                      </div>
                    </div>
                  )}

                  {/* Image 2 - Only show if it exists */}
                  {(hasSecondImage && img2 && typeof img2 === 'string' && img2.trim()) ? (
                    <div
                      className="w-full bg-black rounded-lg overflow-hidden relative flex items-center justify-center group"
                      data-image-container
                      data-scene-number={selected?.sceneNumber || selected?.scene_number || 1}
                      data-image-index="1"
                      style={{
                        aspectRatio: selected?.imageDimensions?.width && selected?.imageDimensions?.height
                          ? `${selected.imageDimensions.width} / ${selected.imageDimensions.height}`
                          : '16 / 9',
                        minHeight: '200px'
                      }}
                    >
                      {(() => {
                    const frames = Array.isArray(selected.imageFrames) ? selected.imageFrames : [];
                    // Find the frame that matches img2 URL
                    const frameForImg2 = frames.find((frame) => {
                      const base = frame?.base_image || frame?.baseImage || {};
                      const frameUrl =
                        base.image_url ||
                        base.imageUrl ||
                        base.url ||
                        frame.image_url ||
                        frame.imageUrl ||
                        frame.url ||
                        '';
                      // Normalize URLs for comparison (remove trailing slashes, query params, etc.)
                      const normalizeUrl = (url) => {
                        if (!url || typeof url !== 'string') return '';
                        return url.trim().split('?')[0].replace(/\/$/, '');
                      };
                      return frameUrl && normalizeUrl(frameUrl) === normalizeUrl(img2);
                    }) || null;
                    const fallbackFrame2 = frameForImg2 || (frames.length > 1 ? frames[1] : frames.length > 0 ? frames[0] : null);
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
                      selected?.imageDimensions ||
                      fallbackFrame2?.base_image?.image_dimensions ||
                      fallbackFrame2?.base_image?.imageDimensions ||
                      imageNaturalDims[img2] ||
                      (frames[0]?.base_image?.image_dimensions || frames[0]?.base_image?.imageDimensions) ||
                      { width: 1280, height: 720 };
                    return (
                      <>
                        {/* Regenerate button - top right above image */}
                        {selected?.isEditable && (
                         <></>
                        )}
                        {img2 && typeof img2 === 'string' && img2.trim() ? (
                          <img
                            src={img2}
                            alt={`scene-${selected.sceneNumber}-2`}
                            className="w-full h-full object-contain"
                            crossOrigin={img2.startsWith('http') && !img2.includes(window.location.hostname) ? "anonymous" : undefined}
                            onLoad={(e) => {
                              handleNaturalSize(img2, e.target);
                              console.log('✅ Image 2 loaded successfully:', img2);
                            }}
                            onError={(e) => {
                              const errorImg = e.target;
                              const failedUrl = errorImg.src;
                              console.error('❌ Image 2 failed to load:', {
                                attemptedUrl: failedUrl,
                                originalImg2: img2,
                                errorType: errorImg.naturalWidth === 0 ? 'Invalid/Empty Image' : 'Load Error',
                                naturalWidth: errorImg.naturalWidth,
                                naturalHeight: errorImg.naturalHeight,
                                complete: errorImg.complete,
                                currentSrc: errorImg.currentSrc
                              });
                              
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
                                  if (img && typeof img === 'string' && img.trim() && img !== failedUrl && !fallbackUrls.includes(img.trim())) {
                                    fallbackUrls.push(img.trim());
                                  }
                                });
                              }
                              
                              // Try the first available fallback
                              if (fallbackUrls.length > 0) {
                                const nextUrl = fallbackUrls[0];
                                console.log('🔄 Trying fallback URL for Image 2:', nextUrl);
                                // Remove crossOrigin to avoid CORS issues on retry
                                errorImg.crossOrigin = null;
                                errorImg.src = nextUrl;
                              } else {
                                console.error('❌ No fallback URLs available for Image 2. All image sources exhausted.');
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
                          // If this scene is not editable (e.g., fallback background/avatar image only), hide edit
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
                          
                          // Hide edit button for VEO3 with gen_image=false
                          if (isVEO3 && !genImage) {
                            return null;
                          }
                          
                          return (
                            <button
                              type="button"
                              onClick={() => {
                                // Get the frame data for this specific image (Image 2)
                                const frame = frameForImg2;
                                if (frame) {
                                  // Build the JSON structure with base_image, text_elements, and overlay_elements
                                  const frameData = {
                                    base_image: frame?.base_image || frame?.baseImage || {
                                      image_url: img2,
                                      image_dimensions: selected?.imageDimensions || {}
                                    },
                                    text_elements: Array.isArray(frame?.text_elements) ? frame.text_elements : 
                                                   Array.isArray(frame?.textElements) ? frame.textElements : [],
                                    overlay_elements: Array.isArray(frame?.overlay_elements) ? frame.overlay_elements : []
                                  };
                                  setEditingImageFrame(frameData);
                                  setEditingSceneNumber(selected?.sceneNumber || selected?.scene_number || 1);
                                  setEditingImageIndex(1); // Image 2 is index 1
                                  setShowImageEdit(true);
                                }
                              }}
                              className="absolute right-0 top-[20px] -translate-y-1/2 translate-x-full group-hover:translate-x-0 transition-transform duration-300 bg-[#13008B] text-white p-2 rounded-l-lg hover:bg-[#0f0068] z-10"
                              title="Edit Image"
                            >
                              <Pencil className="w-4 h-4" />
                            </button>
                          );
                        })()}
                        {Array.isArray(effectiveTextEls2) && effectiveTextEls2.length > 0 && (
                          <div className="absolute inset-0 pointer-events-none">
                            {effectiveTextEls2.map((el, idx) => {
                              if (!el || typeof el !== 'object') return null;
                              const { leftPct, topPct, widthPct, heightPct, mode } = computeBoxPercents(el.bounding_box || {}, frameDims2 || selected?.imageDimensions || {});
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
                              const style = {
                                position: 'absolute',
                                left: `${leftPct}%`,
                                top: `${topPct}%`,
                                width: widthPct != null ? `${widthPct}%` : 'auto',
                                height: heightPct != null ? `${heightPct}%` : 'auto',
                                transform: anchor === 'center' ? 'translate(-50%, -50%)' : 'none',
                                color,
                                fontFamily,
                                fontWeight,
                                fontSize,
                                lineHeight,
                                textShadow,
                                whiteSpace: 'pre-wrap'
                              };
                              return (
                                <div key={idx} style={style}>
                                  {el.text || ''}
                                </div>
                              );
                            })}
                          </div>
                        )}
                        {Array.isArray(overlayEls2) && overlayEls2.length > 0 && (
                          <div className="absolute inset-0 pointer-events-none">
                            {overlayEls2.map((ov, idx) => {
                              if (!ov || typeof ov !== 'object') return null;
                              const { leftPct, topPct, widthPct, heightPct } = computeBoxPercents(ov.bounding_box || {}, frameDims2 || selected?.imageDimensions || {});
                              const overlayUrl =
                                ov?.overlay_image?.image_url ||
                                ov?.overlay_image?.imageUrl ||
                                ov?.image_url ||
                                ov?.imageUrl ||
                                ov?.url ||
                                ov?.src ||
                                ov?.link ||
                                '';
                              if (!overlayUrl) return null;
                              const opacity = typeof ov.opacity === 'number' ? ov.opacity : 1;
                              return (
                                <img
                                  key={idx}
                                  src={overlayUrl}
                                  alt="overlay"
                                  className="absolute"
                                  crossOrigin="anonymous"
                                  style={{
                                    left: `${leftPct}%`,
                                    top: `${topPct}%`,
                                    width: widthPct != null ? `${widthPct}%` : 'auto',
                                    height: heightPct != null ? `${heightPct}%` : 'auto',
                                    opacity,
                                    transform: ov?.layout?.anchor_point === 'center' ? 'translate(-50%, -50%)' : 'none'
                                  }}
                                />
                              );
                            })}
                          </div>
                        )}
                      </>
                    );
                      })()}
                    </div>
                  ) : null}
                </div>
              );
            })()}

            {/* Title, Description, Narration stacked vertically */}
            <div className="space-y-3">
              <div>
                <input
                  type="text"
                  readOnly
                  className="w-full border rounded-lg px-3 py-2 text-sm"
                  value={selected?.title || (selected?.sceneNumber ? `Scene ${selected.sceneNumber}` : '')}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Description</label>
                <textarea
                  className="w-full h-32 border rounded-lg px-3 py-2 text-sm"
                  readOnly
                  value={selected?.description || ''}
                />
              </div>
              <div>
                <label className="text-sm text-gray-600">Narration</label>
                <textarea
                  className="w-full h-32 border rounded-lg px-3 py-2 text-sm"
                  readOnly
                  value={selected?.narration || ''}
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
            
            {/* Advanced Options Accordion - For VEO3/SORA/ANCHOR models */}
            {(() => {
              const modelUpper = String(selected?.model || '').toUpperCase();
              const isRelevantModel = modelUpper === 'VEO3' || modelUpper === 'SORA' || modelUpper === 'ANCHOR';
              const sceneNumber = selected?.sceneNumber || selected?.scene_number || 1;
              
              if (!isRelevantModel) return null;
              
              const sceneOptions = sceneAdvancedOptions[sceneNumber] || {
                logoNeeded: false,
                voiceUrl: '',
                voiceOption: '',
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
                                  <div className="mt-2 text-xs text-gray-500">
                                    Logo URL: {sessionAssets.logo_url}
                                  </div>
                                )}
                              </div>
                              
                              {/* Voice URL Selection */}
                              <div>
                                <label className="text-sm font-medium text-gray-700 mb-2 block">Voice URL</label>
                                <div className="space-y-2">
                                  {Object.keys(sessionAssets.voice_urls || {}).length > 0 ? (
                                    Object.entries(sessionAssets.voice_urls).map(([key, url]) => (
                                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                                        <input
                                          type="radio"
                                          name={`voice-${sceneNumber}`}
                                          checked={sceneOptions.voiceUrl === url}
                                          onChange={() => {
                                            updateSceneOption('voiceUrl', url);
                                            // Keep voiceOption as the key (could be "male", "female", etc.)
                                            updateSceneOption('voiceOption', key);
                                          }}
                                          disabled={!hasVoiceAssets}
                                          className="w-4 h-4 text-[#13008B]"
                                        />
                                        <span className="text-sm text-gray-700">{key}: {url}</span>
                                      </label>
                                    ))
                                  ) : (
                                    <p className="text-xs text-gray-500">No voice URLs available</p>
                                  )}
                                  <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                      type="radio"
                                      name={`voice-${sceneNumber}`}
                                      checked={!hasVoiceAssets || sceneOptions.voiceUrl === ''}
                                      onChange={() => {
                                        updateSceneOption('voiceUrl', '');
                                        updateSceneOption('voiceOption', '');
                                      }}
                                      className="w-4 h-4 text-[#13008B]"
                                    />
                                    <span className="text-sm text-gray-700">None</span>
                                  </label>
                                </div>
                              </div>
                              
                              {/* Voice Option (Female / Male) - only when no specific voice URL selected */}
                              {!sceneOptions.voiceUrl && (
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
                                        checked={sceneOptions.voiceOption === 'male'}
                                        onChange={() => updateSceneOption('voiceOption', 'male')}
                                        className="w-4 h-4 text-[#13008B]"
                                      />
                                      <span className="text-sm text-gray-700">Male</span>
                                    </label>
                                  </div>
                                </div>
                              )}
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
                        {(modelUpper === 'SORA' || modelUpper === 'ANCHOR') && (
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
                                          console.warn('⚠️ Preset missing name:', preset);
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
                                              className={`relative flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                                                isSelected
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
                                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                            (designYourOwnTab[sceneNumber] || 'describe') === 'describe'
                                              ? 'border-[#13008B] text-[#13008B]'
                                              : 'border-transparent text-gray-500 hover:text-gray-700'
                                          }`}
                                        >
                                          Describe it
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setDesignYourOwnTab(prev => ({ ...prev, [sceneNumber]: 'fill' }))}
                                          className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                            designYourOwnTab[sceneNumber] === 'fill'
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
              const first = (r.refs || [])[0];
              const second = (r.refs || [])[1];
              return (
                <div
                  key={i}
                  className={`min-w-[300px] w-[300px] max-w-full cursor-pointer`}
                  onClick={() => {
                    const refsArray = r.refs || [];
                    const imgs = modelUpper === 'PLOTLY' ? [first] : refsArray.slice(0, 2);
                    console.log('🎯 Scene Selected:', {
                      sceneNumber: r.scene_number,
                      refs: refsArray,
                      first,
                      second: refsArray[1],
                      imgs,
                      model: modelUpper
                    });
                    setSelected({
                      index: i,
                      imageUrl: first || '',
                      images: imgs.filter(Boolean), // Filter out any empty values
                      title: r.scene_title || 'Untitled',
                      sceneNumber: r.scene_number,
                      description: r?.description || '',
                      narration: r?.narration || '',
                      textToBeIncluded: r?.textToBeIncluded || '',
                      model: modelUpper,
                      prompts: r?.prompts || { opening_frame: {}, closing_frame: {} },
                      imageDimensions: r?.imageDimensions || null,
                      textElements: Array.isArray(r?.textElements) ? r.textElements : [],
                      imageVersionData: r?.imageVersionData || null,
                      imageFrames: Array.isArray(r?.imageFrames) ? r.imageFrames : [],
                      isEditable: !!r?.isEditable
                    });
                  }}
                >
                  <div className={`rounded-xl border overflow-hidden ${selected.index === i ? 'ring-2 ring-[#13008B]' : ''}`}>
                    {modelUpper === 'PLOTLY' ? (
                      <div
                        className="w-full bg-black flex items-center justify-center aspect-[16/9]"
                      >
                        {first && (
                          <img src={first} alt={`scene-${r.scene_number}-1`} className="max-h-full max-w-full object-contain" />
                        )}
                      </div>
                    ) : (
                      (() => {
                        const hasSecond = second && second.trim();
                        const gridCols = hasSecond ? 'grid-cols-2' : 'grid-cols-1';
                        return (
                          <div className={`grid ${gridCols} gap-0 w-full bg-black aspect-[16/9]`}>
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
                      })()
                    )}
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
          onClose={() => {
            setShowImageEdit(false);
            setEditingImageFrame(null);
            setEditingSceneNumber(null);
            setEditingImageIndex(null);
          }}
          onRefresh={refreshLoad}
          frameData={editingImageFrame}
          sceneNumber={editingSceneNumber}
          imageIndex={editingImageIndex}
        />
      )}

      {/* Regenerate Image Popup */}
      {showRegeneratePopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-2xl mx-4 relative">
            {/* Close Button - Circle at top right */}
            <button
              onClick={() => {
                if (!isRegenerating) {
                  setShowRegeneratePopup(false);
                  setRegenerateUserQuery('');
                  setRegeneratingSceneNumber(null);
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
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4 pr-10">Regenerate Image</h3>
              
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

              {/* Error Message */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
                  {error}
                </div>
              )}

              {/* Loading Overlay */}
              {isRegenerating && (
                <div className="absolute inset-0 bg-white bg-opacity-90 rounded-lg flex items-center justify-center z-20">
                  <div className="flex flex-col items-center gap-4">
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
                  disabled={isRegenerating || !regenerateUserQuery.trim()}
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
    </div>
  );
};

export default ImageList;
