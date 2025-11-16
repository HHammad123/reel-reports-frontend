import React, { useEffect, useState } from 'react';
import { ChevronDown, Pencil } from 'lucide-react';
import ImageEditor from './ImageEditor';
import ImageEdit from '../../pages/ImageEdit';

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
        // Also gather from background_image / avatar_urls style arrays if present
        gatherFromArray(node?.background_image);
        gatherFromArray(node?.backgroundImages);
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
              // For VEO3 model, swap refs with background_image URLs from scripts if available
              const modelUpper = String(it?.model || it?.mode || '').toUpperCase();
              const isVEO3 = (modelUpper === 'VEO3' || modelUpper === 'ANCHOR');
              const sceneNumber = it?.scene_number || idx + 1;
                let finalRefs = refs;
                if (isVEO3 && veo3ScriptScenesByNumber && veo3ScriptScenesByNumber[sceneNumber]) {
                  const scene = veo3ScriptScenesByNumber[sceneNumber];
                  const extraRefs = [
                    ...collectUrls(scene),
                    ...(Array.isArray(scene?.background_image)
                      ? scene.background_image.map(
                          (bg) =>
                            bg?.imageurl ||
                            bg?.imageUrl ||
                            bg?.image_url ||
                            bg?.url ||
                            bg?.src ||
                            bg?.link
                        )
                      : []),
                    ...(Array.isArray(scene?.avatar_urls)
                      ? scene.avatar_urls.map((av) => {
                          if (typeof av === 'string') return av;
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
                      : [])
                  ].filter(Boolean);
                  if (extraRefs.length > 0) {
                    finalRefs = extraRefs;
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
              const refs = [
                ...collectUrls(it)
              ];
              if (it?.image_url) refs.push(it.image_url);
              if (it?.image_1_url) refs.push(it.image_1_url);
              if (it?.image_2_url) refs.push(it.image_2_url);
              if (Array.isArray(it?.refs)) refs.push(...it.refs);
              if (Array.isArray(it?.urls)) refs.push(...it.urls);
              if (typeof it === 'string') refs.push(it);
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
      // Add any remaining VEO3 script scenes (with background_image/avatar_urls) that don't have image arrays yet
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
          const refs = [
            ...collectUrls(scene),
            ...(Array.isArray(scene?.background_image)
              ? scene.background_image.map(
                  (bg) =>
                    bg?.imageurl ||
                    bg?.imageUrl ||
                    bg?.image_url ||
                    bg?.url ||
                    bg?.src ||
                    bg?.link
                )
              : []),
            ...(Array.isArray(scene?.avatar_urls)
              ? scene.avatar_urls.map((av) => {
                  if (typeof av === 'string') return av;
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
              : [])
          ].filter(Boolean);
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
        
        // For VEO3: Check scripts data for background_image / avatar_urls (for scenes that may not yet have image arrays)
        const sessionData = sdata?.session_data || sdata?.session || {};
        const scripts = Array.isArray(sessionData?.scripts) && sessionData.scripts.length > 0 ? sessionData.scripts : [];
        const currentScript = scripts[0] || null;
        const airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];
        // Index VEO3 script scenes by scene number so we can use background_image/avatar_urls for scenes missing image arrays
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
                    // Extract VEO3 script scenes (background_image / avatar_urls) from scripts
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
      
      // For VEO3: Check scripts data for background_image / avatar_urls (for scenes that may not yet have image arrays)
      const sessionData = sdata?.session_data || sdata?.session || {};
      const scripts = Array.isArray(sessionData?.scripts) && sessionData.scripts.length > 0 ? sessionData.scripts : [];
      const currentScript = scripts[0] || null;
      const airesponse = Array.isArray(currentScript?.airesponse) ? currentScript.airesponse : [];
      
      // Index VEO3 script scenes by scene number so we can use background_image/avatar_urls for scenes missing image arrays
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
          gatherFromArray(node?.background_image);
          gatherFromArray(node?.backgroundImages);
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
                prompts: normalizePromptFields(imagesRoot?.prompts || {})
              });
            }
          } catch (e) {
            console.error('Error mapping single object:', e);
          }
        } else if (Array.isArray(imagesRoot)) {
          imagesRoot.forEach((it, idx) => {
            // For VEO3: Use background_image/avatar_urls from scripts if available
            const modelUpper = String(it?.model || it?.mode || '').toUpperCase();
            const isVEO3 = modelUpper === 'VEO3' || modelUpper === 'ANCHOR';
            const sceneNumber = it?.scene_number || idx + 1;
            
            let refs = collectUrls(it);
            if (isVEO3 && veo3ScriptScenesByNumber && veo3ScriptScenesByNumber[sceneNumber]) {
              const scene = veo3ScriptScenesByNumber[sceneNumber];
              const extraRefs = [
                ...collectUrls(scene),
                ...(Array.isArray(scene?.background_image)
                  ? scene.background_image.map(
                      (bg) =>
                        bg?.imageurl ||
                        bg?.imageUrl ||
                        bg?.image_url ||
                        bg?.url ||
                        bg?.src ||
                        bg?.link
                    )
                  : []),
                ...(Array.isArray(scene?.avatar_urls)
                  ? scene.avatar_urls.map((av) => {
                      if (typeof av === 'string') return av;
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
                  : [])
              ].filter(Boolean);
              if (extraRefs.length > 0) {
                refs = extraRefs;
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

        // Add any remaining VEO3 script scenes (with background_image/avatar_urls) that don't have image arrays yet
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
            const refs = [
              ...collectUrls(scene),
              ...(Array.isArray(scene?.background_image)
                ? scene.background_image.map(
                    (bg) =>
                      bg?.imageurl ||
                      bg?.imageUrl ||
                      bg?.image_url ||
                      bg?.url ||
                      bg?.src ||
                      bg?.link
                  )
                : []),
              ...(Array.isArray(scene?.avatar_urls)
                ? scene.avatar_urls.map((av) => {
                    if (typeof av === 'string') return av;
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
                : [])
            ].filter(Boolean);
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

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-lg relative">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-[#13008B]">Scenes • Images</h3>
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
              onClick={() => {
                try {
                  if (typeof onGenerateVideos === 'function') {
                    const images = rows.flatMap(r => Array.isArray(r?.refs) ? r.refs : []);
                    onGenerateVideos(images);
                  }
                } catch (_) { /* noop */ }
              }}
              className="px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800"
            >
              Generate Videos
            </button>
          )}
          {onClose && (<button onClick={onClose} className="px-3 py-1.5 rounded-lg border text-sm">Back to Chat</button>)}
        </div>
      </div>

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
            {/* Top Section: Two Images Side by Side */}
            <div className="grid grid-cols-2 gap-4 mb-4">
              {/* Image 1 */}
              <div
                className="w-full bg-black rounded-lg overflow-hidden relative flex items-center justify-center group"
                style={{
                  aspectRatio: selected?.imageDimensions?.width && selected?.imageDimensions?.height
                    ? `${selected.imageDimensions.width} / ${selected.imageDimensions.height}`
                    : '16 / 9',
                  minHeight: '200px'
                }}
              >
                  {(() => {
                    const img1 = (Array.isArray(selected.images) && selected.images[0]) ? selected.images[0] : selected.imageUrl;
                    if (!img1) {
                      return (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          No Image
                        </div>
                      );
                    }
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
                    // Get text elements from the matched frame, not from selected.textElements
                    const textElsForImg1 = frameForImg1 ? (
                      Array.isArray(frameForImg1?.text_elements)
                        ? frameForImg1.text_elements
                        : Array.isArray(frameForImg1?.textElements)
                        ? frameForImg1.textElements
                        : []
                    ) : [];
                    return (
                      <>
                        <img
                          src={img1}
                          alt={`scene-${selected.sceneNumber}-1`}
                          className="w-full h-full object-contain"
                        />
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
                        {Array.isArray(textElsForImg1) && textElsForImg1.length > 0 && (
                          <div className="absolute inset-0 pointer-events-none">
                            {textElsForImg1.map((el, idx) => {
                              if (!el || typeof el !== 'object') return null;
                              const bb = el.bounding_box || {};
                              const x = typeof bb.x === 'number' ? bb.x : 0;
                              const y = typeof bb.y === 'number' ? bb.y : 0;
                              const width = typeof bb.width === 'number' ? bb.width : 0;
                              const height = typeof bb.height === 'number' ? bb.height : 0;
                              const fontSize = Number.isFinite(el.fontSize) ? el.fontSize : 16;
                              const color = el.fill || '#ffffff';
                              const fontFamily = el.fontFamily || 'sans-serif';
                              const fontWeight = el.fontWeight || 'normal';
                              const lineHeight = el.lineHeight || 1.2;
                              const opacity = typeof el.textOpacity === 'number' ? el.textOpacity : 1;
                              const shadow = el.effects?.textShadow;
                              const textShadow =
                                shadow && shadow.enabled
                                  ? `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur || 0}px ${
                                      shadow.color || 'rgba(0,0,0,0.5)'
                                    }`
                                  : undefined;
                              const anchor = el.layout?.anchor_point || 'top_left';
                              const style = {
                                position: 'absolute',
                                left: `${x * 100}%`,
                                top: `${y * 100}%`,
                                width: width ? `${width * 100}%` : 'auto',
                                height: height ? `${height * 100}%` : 'auto',
                                transform: anchor === 'center' ? 'translate(-50%, -50%)' : 'none',
                                color,
                                fontFamily,
                                fontWeight,
                                fontSize,
                                lineHeight,
                                opacity,
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
                      </>
                    );
                  })()}
              </div>

              {/* Image 2 */}
              <div
                className="w-full bg-black rounded-lg overflow-hidden relative flex items-center justify-center group"
                style={{
                  aspectRatio: selected?.imageDimensions?.width && selected?.imageDimensions?.height
                    ? `${selected.imageDimensions.width} / ${selected.imageDimensions.height}`
                    : '16 / 9',
                  minHeight: '200px'
                }}
              >
                  {(() => {
                    const img2 = Array.isArray(selected.images) ? selected.images[1] : '';
                    if (!img2) {
                      return (
                        <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">
                          No Image
                        </div>
                      );
                    }
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
                    // Get text elements from the matched frame only
                    const textElsForImg2 = frameForImg2 ? (
                      Array.isArray(frameForImg2?.text_elements)
                        ? frameForImg2.text_elements
                        : Array.isArray(frameForImg2?.textElements)
                        ? frameForImg2.textElements
                        : []
                    ) : [];
                    return (
                      <>
                        <img
                          src={img2}
                          alt={`scene-${selected.sceneNumber}-2`}
                          className="w-full h-full object-contain"
                        />
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
                        {Array.isArray(textElsForImg2) && textElsForImg2.length > 0 && (
                          <div className="absolute inset-0 pointer-events-none">
                            {textElsForImg2.map((el, idx) => {
                              if (!el || typeof el !== 'object') return null;
                              const bb = el.bounding_box || {};
                              const x = typeof bb.x === 'number' ? bb.x : 0;
                              const y = typeof bb.y === 'number' ? bb.y : 0;
                              const width = typeof bb.width === 'number' ? bb.width : 0;
                              const height = typeof bb.height === 'number' ? bb.height : 0;
                              const fontSize = Number.isFinite(el.fontSize) ? el.fontSize : 16;
                              const color = el.fill || '#ffffff';
                              const fontFamily = el.fontFamily || 'sans-serif';
                              const fontWeight = el.fontWeight || 'normal';
                              const lineHeight = el.lineHeight || 1.2;
                              const opacity = typeof el.textOpacity === 'number' ? el.textOpacity : 1;
                              const shadow = el.effects?.textShadow;
                              const textShadow =
                                shadow && shadow.enabled
                                  ? `${shadow.offsetX || 0}px ${shadow.offsetY || 0}px ${shadow.blur || 0}px ${
                                      shadow.color || 'rgba(0,0,0,0.5)'
                                    }`
                                  : undefined;
                              const anchor = el.layout?.anchor_point || 'top_left';
                              const style = {
                                position: 'absolute',
                                left: `${x * 100}%`,
                                top: `${y * 100}%`,
                                width: width ? `${width * 100}%` : 'auto',
                                height: height ? `${height * 100}%` : 'auto',
                                transform: anchor === 'center' ? 'translate(-50%, -50%)' : 'none',
                                color,
                                fontFamily,
                                fontWeight,
                                fontSize,
                                lineHeight,
                                opacity,
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
                      </>
                    );
                  })()}
              </div>
            </div>

            {/* Bottom Section: Two Columns - Left: Scene Title/Text/Size/Additional Info, Right: Description/Narration */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Left Column */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Scene Title</label>
                  <input type="text" readOnly className="w-full border rounded-lg px-3 py-2 text-sm" value={selected?.title || (selected?.sceneNumber ? `Scene ${selected.sceneNumber}` : '')} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Text to be Included</label>
                  <textarea className="w-full h-32 border rounded-lg px-3 py-2 text-sm" readOnly value={selected?.textToBeIncluded || ''} />
                </div>
                {selected?.imageDimensions?.width && selected?.imageDimensions?.height ? (
                  <div>
                    <label className="text-sm text-gray-600">Image Size</label>
                    <input type="text" readOnly className="w-full border rounded-lg px-3 py-2 text-sm" value={`${selected.imageDimensions.width} x ${selected.imageDimensions.height}`} />
                  </div>
                ) : null}
                
                {/* Additional Information Accordion */}
               
              </div>

              {/* Right Column */}
              <div className="space-y-3">
                <div>
                  <label className="text-sm text-gray-600">Description</label>
                  <textarea className="w-full h-32 border rounded-lg px-3 py-2 text-sm" readOnly value={selected?.description || ''} />
                </div>
                <div>
                  <label className="text-sm text-gray-600">Narration</label>
                  <textarea className="w-full h-32 border rounded-lg px-3 py-2 text-sm" readOnly value={selected?.narration || ''} />
                </div>
              </div>
            </div>
             {(() => {
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
                    const imgs = modelUpper === 'PLOTLY' ? [first] : (r.refs || []).slice(0, 2);
                    setSelected({
                      index: i,
                      imageUrl: first || '',
                      images: imgs,
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
                        {first ? (
                          <img src={first} alt={`scene-${r.scene_number}-1`} className="max-h-full max-w-full object-contain" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
                        )}
                      </div>
                    ) : (
                      <div
                        className="grid grid-cols-2 gap-0 w-full bg-black aspect-[16/9]"
                      >
                        <div className="w-full h-full bg-black flex items-center justify-center">
                          {first ? (
                            <img src={first} alt={`scene-${r.scene_number}-1`} className="max-w-full max-h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
                          )}
                        </div>
                        <div className="w-full h-full bg-black flex items-center justify-center">
                          {second ? (
                            <img src={second} alt={`scene-${r.scene_number}-2`} className="max-w-full max-h-full object-contain" />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-gray-400 text-sm">No Image</div>
                          )}
                        </div>
                      </div>
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
    </div>
  );
};

export default ImageList;
