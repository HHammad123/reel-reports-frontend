import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setJob } from '../redux/slices/videoJobSlice';
import { Upload, Paperclip, FileText, Camera, Send, File, X, GripVertical, Check, Maximize2, RefreshCcw, ChevronLeft, ChevronRight, Copy as CopyIcon, ThumbsUp, ThumbsDown, MoreHorizontal, Trash2 } from 'lucide-react';
import { FaChartBar, FaUser } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { CiPen } from 'react-icons/ci';
import { formatAIResponse } from '../utils/formatting';

const Chat = ({ addUserChat, userChat, setuserChat, sendUserSessionData, chatHistory, setChatHistory, isChatLoading = false }) => {
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
  const [showShortGenPopup, setShowShortGenPopup] = useState(false);
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
  const [showAddSceneModal, setShowAddSceneModal] = useState(false);
  const [insertSceneIndex, setInsertSceneIndex] = useState(null);
  const [newSceneDescription, setNewSceneDescription] = useState('');
  const [newSceneVideoType, setNewSceneVideoType] = useState('Avatar Based');
  const [isAddingScene, setIsAddingScene] = useState(false);
  const [isSavingReorder, setIsSavingReorder] = useState(false);
  const [isDeletingScene, setIsDeletingScene] = useState(false);
  // Script history controls (undo/redo)
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  // Regenerate modal state
  const [showRegenModal, setShowRegenModal] = useState(false);
  const [regenQuery, setRegenQuery] = useState('');
  const [regenModel, setRegenModel] = useState('VEO3'); // 'VEO3' | 'SORA'
  // Only show 5 scene tabs at a time without scroll
  const [visibleStartIndex, setVisibleStartIndex] = useState(0);
  const [refImageUrlInput, setRefImageUrlInput] = useState('');
  // Multiple selection of ref images by URL
  const [selectedRefImages, setSelectedRefImages] = useState([]);
  // Lightbox for zooming a reference image fullscreen
  const [isImageLightboxOpen, setIsImageLightboxOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState('');
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
        if (sn != null && Array.isArray(map[sn])) {
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
    const endpoint = 'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/images/upload';
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

      const sessionResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/sessions/get', {
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

      const videoResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/videos/generate', {
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
        const jobsBase = 'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1';
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

  // New: Job-based video generation starter with 5s popup then redirect
  const generateVideoJobAndRedirect = React.useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const sessionId = localStorage.getItem('session_id');
      if (!token || !sessionId) throw new Error('Missing user token or session_id');

      // Build SAME request as earlier legacy flow
      const sessionResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/sessions/get', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId })
      });
      if (!sessionResp.ok) {
        const text = await sessionResp.text();
        throw new Error(`sessions/get failed: ${sessionResp.status} ${text}`);
      }
      const sessionData = await sessionResp.json();
      const videoGenRequest = (() => {
        try {
          const req = JSON.parse(JSON.stringify(sessionData));
          const rows = Array.isArray(scriptRows) ? scriptRows : [];
          const refMap = new Map();
          for (const r of rows) {
            const sn = r?.scene_number; if (sn == null) continue;
            const imgs = Array.isArray(r?.ref_image) ? r.ref_image.filter(Boolean) : [];
            refMap.set(sn, imgs.slice(0, 3));
          }
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
          const setRefsOnScene = (scene, indexHint) => {
            try {
              const sn = scene?.scene_number ?? (typeof indexHint === 'number' ? indexHint + 1 : undefined);
              if (sn == null || !refMap.has(sn)) return scene;
              const out = { ...(scene || {}) };
              out.ref_image = refMap.get(sn) || [];
              if ('ref_images' in out) delete out.ref_images;
              if ('reference_image' in out) delete out.reference_image;
              if ('reference_images' in out) delete out.reference_images;
              return out;
            } catch (_) { return scene; }
          };
          const looksLikeScene = (obj) => obj && typeof obj === 'object' && !Array.isArray(obj) && (
            'scene_number' in obj || 'scene_title' in obj || 'narration' in obj || 'desc' in obj || 'description' in obj
          );
          const applyToScenesArray = (arr) => {
            if (!Array.isArray(arr)) return false;
            for (let i = 0; i < arr.length; i++) { const sc = arr[i]; if (looksLikeScene(sc)) arr[i] = setRefsOnScene(sc, i); }
            return true;
          };
          const visit = (node) => {
            if (!node) return; if (Array.isArray(node)) { applyToScenesArray(node); node.forEach(visit); return; }
            if (typeof node === 'object') { Object.values(node).forEach(v => { if (Array.isArray(v)) applyToScenesArray(v); visit(v); }); }
          };
          const candidates = [req?.session_data?.scripts, req?.session?.scripts, req?.scripts].filter(Boolean);
          let applied = false;
          for (const scriptsArr of candidates) {
            if (Array.isArray(scriptsArr) && scriptsArr.length > 0) {
              const first = scriptsArr[0];
              if (Array.isArray(first?.airesponse)) { applyToScenesArray(first.airesponse); applied = true; }
              else if (Array.isArray(first)) { applyToScenesArray(first); applied = true; }
            }
          }
          if (!applied) {
            if (Array.isArray(req?.airesponse)) applyToScenesArray(req.airesponse);
            if (Array.isArray(req?.assistant_message?.airesponse)) applyToScenesArray(req.assistant_message.airesponse);
          }
          return req;
        } catch (_) { return sessionData; }
      })();

      const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/videos/generate', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(videoGenRequest)
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`videos/generate failed: ${resp.status} ${text}`);
      const jobId = data?.job_id || data?.jobId || data?.id;
      const statusUrl = data?.status_url || null;
      const status = data?.status || 'queued';
      if (jobId) {
        try { localStorage.setItem('current_video_job_id', jobId); } catch (_) { /* noop */ }
        try { dispatch(setJob({ jobId, status, statusUrl })); } catch (_) { /* noop */ }
      }
      // Show 5s popup then redirect to media page
      setShowShortGenPopup(true);
      setTimeout(() => {
        setShowShortGenPopup(false);
        try { window.location && (window.location.href = '/media'); } catch (_) { /* noop */ }
      }, 5000);
    } catch (e) {
      console.error('Failed to start video generation job:', e);
      alert('Failed to start video generation. Please try again.');
    }
  }, []);

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
      
      // Open modal
      try { openScriptModal(data); } catch (_) { /* noop */ }
    };
    window.addEventListener('script-generated', onScriptGenerated);
    return () => window.removeEventListener('script-generated', onScriptGenerated);
  }, [setChatHistory]);

  // Auto-open the last generated script after reload so users don't have to regenerate
  useEffect(() => {
    try {
      if (isChatLoading) return;
      // Prefer updated structure if present
      let raw = localStorage.getItem(scopedKey('updated_script_structure'));
      if (!raw) raw = localStorage.getItem(scopedKey('last_generated_script'));
      if (!raw) return;
      let script;
      try { script = JSON.parse(raw); } catch (_) { script = null; }
      if (!script) return;
      const hash = JSON.stringify(script);
      const sid = localStorage.getItem('session_id') || 'default';
      const key = `last_opened_script_hash:${sid}`;
      const prev = localStorage.getItem(key);
      if (prev !== hash) {
        try {
          openScriptModal(script);
        } finally {
          try { localStorage.setItem(key, hash); } catch (_) { /* noop */ }
        }
      }
    } catch (_) { /* noop */ }
  }, [isChatLoading, chatHistory]);

  const normalizeScriptToRows = (script) => {
    try {
      // Gate whether to keep ref images coming from the script itself.
      // Only allow auto ref images if the current session has a document summary.
      let allowScriptRefImages = false;
      try {
        const sid = localStorage.getItem('session_id');
        if (sid) allowScriptRefImages = (localStorage.getItem(`has_doc_summary:${sid}`) === 'true');
      } catch (_) { /* noop */ }

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
          // Keep script-provided ref images only if allowed; user-added refs are managed in state later
          ref_image: allowScriptRefImages ? refs : [],
          folderLink: row?.folder_link ?? row?.folderLink ?? row?.folder ?? '',
          timeline: coalesce(row?.timeline, row?.time, row?.duration, row?.additional, row?.additional_info, row?.timestamp),
          scene_title: coalesce(row?.scene_title, row?.title, row?.scene, row?.content, row?.text),
          narration: coalesce(row?.narration, row?.voice_over_script, row?.voice_over, row?.voiceover, row?.voice),
          description: coalesce(row?.description, row?.desc, row?.scene_title, row?.title, row?.scene, row?.content, row?.text),
          additional: coalesce(row?.additional, row?.additional_info, row?.notes, row?.extra, row?.additionalInformation)
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
      if (!sessionId) return;
      const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/undo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId })
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
      if (!sessionId) return;
      const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/redo', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId })
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
    try {
      if (!Array.isArray(scriptRows) || scriptRows.length === 0) return;
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) throw new Error('Missing session_id or token');

      // Load session snapshot for request body
      const sessionReqBody = { user_id: token, session_id: sessionId };
      const sessionResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionReqBody)
      });
      if (!sessionResp.ok) {
        const text = await sessionResp.text();
        throw new Error(`user-session/data failed: ${sessionResp.status} ${text}`);
      }
      const sessionDataResponse = await sessionResp.json();
      const sd = sessionDataResponse?.session_data || {};
      const sessionForBody = {
        session_id: sessionId,
        user_id: token,
        content: sd.content,
        document_summary: sd.document_summary,
        videoduration: sd.video_duration?.toString?.(),
        created_at: sd.created_at,
        totalsummary: sd.total_summary,
        messages: sd.messages,
        scripts: Array.isArray(sd.scripts) ? sd.scripts : undefined,
        videos: sd.videos,
      };

      const cur = scriptRows[currentSceneIndex];
      const sceneNumber = cur?.scene_number ?? (currentSceneIndex + 1);
      const body = {
        session: sessionForBody,
        scene_number: sceneNumber,
        user_query: regenQuery || '',
        model: regenModel,
      };

      const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/regenerate-scene', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`scripts/regenerate-scene failed: ${resp.status} ${text}`);

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
    }
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

      // Load session snapshot for request body parity
      const sessionReqBody = { user_id: token, session_id: sessionId };
      const sessionResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionReqBody)
      });
      if (!sessionResp.ok) {
        const text = await sessionResp.text();
        throw new Error(`user-session/data failed: ${sessionResp.status} ${text}`);
      }
      const sessionDataResponse = await sessionResp.json();
      const sd = sessionDataResponse?.session_data || {};
      const sessionForBody = {
        session_id: sessionId,
        user_id: token,
        content: sd.content,
        document_summary: sd.document_summary,
        videoduration: sd.video_duration?.toString?.(),
        created_at: sd.created_at,
        totalsummary: sd.total_summary,
        messages: sd.messages,
        scripts: Array.isArray(sd.scripts) ? sd.scripts : undefined,
      };

      // Current scene number
      const cur = scriptRows[currentSceneIndex];
      const sceneNumber = cur?.scene_number ?? (currentSceneIndex + 1);

      const body = { session: sessionForBody, scene_number: sceneNumber };
      const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/delete-scene', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`scripts/delete-scene failed: ${resp.status} ${text}`);

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
      setInsertSceneIndex(typeof index === 'number' ? index : (Array.isArray(scriptRows) ? scriptRows.length : 0));
      setNewSceneDescription('');
      setNewSceneVideoType(selectedVideoType || 'Avatar Based');
      setShowAddSceneModal(true);
    } catch (_) { /* noop */ }
  };

  const addSceneToRows = async () => {
    try {
      if (isAddingScene) return;
      if (!newSceneDescription || !newSceneDescription.trim()) {
        alert('Please enter a description for the new scene.');
        return;
      }
      const sessionId = localStorage.getItem('session_id');
      const token = localStorage.getItem('token');
      if (!sessionId || !token) throw new Error('Missing session_id or token');

      setIsAddingScene(true);
      // 1) Fetch session snapshot
      const sessionReqBody = { user_id: token, session_id: sessionId };
      const sessResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionReqBody)
      });
      if (!sessResp.ok) {
        const t = await sessResp.text();
        throw new Error(`user-session/data failed: ${sessResp.status} ${t}`);
      }
      const sessionDataResponse = await sessResp.json();
      const sd = sessionDataResponse?.session_data || {};
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
        messages: sd.messages,
        scripts: Array.isArray(sd.scripts) ? sd.scripts : undefined,
      };

      // 2) Build add-scene request per newsceneadditionip.json
      const desiredModel = newSceneVideoType === 'Avatar Based' ? 'VEO3' : 'SORA';
      const total = Array.isArray(scriptRows) ? scriptRows.length : 0;
      const idx = (typeof insertSceneIndex === 'number' && insertSceneIndex >= 0 && insertSceneIndex <= total) ? insertSceneIndex : total;
      // Backend expects a 0-based position (after this index). Between scene 2 and 3 -> 2.
      const insertPosition = idx;
      const requestBody = {
        session: sessionForBody,
        insert_position: insertPosition,
        model_type: desiredModel,
        scene_content: newSceneDescription,
      };
      console.log('scripts/add-scene request body:', requestBody);

      // 3) Call add-scene API
      const addResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/add-scene', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(requestBody)
      });
      const addText = await addResp.text();
      let addData; try { addData = JSON.parse(addText); } catch (_) { addData = addText; }
      if (!addResp.ok) throw new Error(`scripts/add-scene failed: ${addResp.status} ${addText}`);
      console.log('scripts/add-scene response:', addData);

      // 4) Update UI with response (reorderescriptop-style)
      const container = addData?.reordered_script ?? addData;
      try {
        localStorage.setItem(scopedKey('updated_script_structure'), JSON.stringify(container));
        localStorage.setItem(scopedKey('original_script_hash'), JSON.stringify(container));
        const normalized = normalizeScriptToRows(container);
        const newRows = Array.isArray(normalized?.rows) ? normalized.rows : [];
        setScriptRows(newRows);
        // Select inserted position (best-effort)
        const selIndex = Math.min(Math.max(0, idx), Math.max(0, newRows.length - 1));
        setCurrentSceneIndex(selIndex);
        setHasOrderChanged(false);
        // Enable undo after a successful structural change
        setCanUndo(true); setCanRedo(false);
        // Update last script in chat history and localStorage reference for next opens
        try {
          setChatHistory(prev => {
            const copy = [...prev];
            for (let i = copy.length - 1; i >= 0; i--) {
              if (copy[i]?.script) { copy[i] = { ...copy[i], script: container }; break; }
            }
            try {
              localStorage.setItem(scopedKey('last_generated_script'), JSON.stringify(container));
              localStorage.removeItem('last_generated_script');
            } catch (_) { /* noop */ }
            return copy;
          });
        } catch (_) { /* noop */ }
      } catch (_) { /* noop */ }

      setShowAddSceneModal(false);
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

      // Build additonalprop1
      const additonalprop1 = {
        ai_ques: Array.isArray(aiQues) ? aiQues : [],
        ...(guidelines ? {
          purpose_and_audience: guidelines.purpose_and_audience,
          content_focus_and_emphasis: guidelines.content_focus_and_emphasis,
          style_and_visual_pref: guidelines.style_and_visual_pref,
          technical_and_formal_constraints: guidelines.technical_and_formal_constraints,
          audio_and_effects: guidelines.audio_and_effects
        } : {})
      };
      const questionnaire_context = [{ additonalprop1 }];

      // Pull latest user message from current chat history
      let lastUserMessage = '';
      try {
        const last = [...(chatHistory || [])].reverse().find(m => m?.type === 'user' && typeof m?.content === 'string');
        if (last) lastUserMessage = last.content;
      } catch (_) { /* noop */ }

      // Fetch current session data (do not fabricate)
      let sessionPayload = {};
      try {
        const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: token, session_id: sessionId })
        });
        if (resp.ok) {
          const sessionDataResponse = await resp.json();
          const sd = sessionDataResponse?.session_data || {};
          sessionPayload = {
            session_id: sessionId || '',
            user_id: token || '',
            content: sd.content,
            document_summary: sd.document_summary,
            videoduration: sd.video_duration?.toString?.(),
            created_at: sd.created_at,
            totalsummary: sd.total_summary,
            messages: sd.messages
          };
        }
      } catch (_) { /* noop */ }

      const requestPayload = {
        session: sessionPayload,
        video_length: 60,
        video_tone: 'professional',
        questionnaire_context,
        is_followup: false,
        user_query: lastUserMessage
      };

      const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/generate', {
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
      'application/msword' // doc
    ];

    const validFiles = files.filter(file => {
      if (allowedTypes.includes(file.type)) {
        return true;
      } else {
        alert(`File ${file.name} is not a supported format. Please upload only PDF, PPT, PPTX, DOC, or DOCX files.`);
        return false;
      }
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
    if (file.type.includes('pdf')) {
      return <FileText className="w-5 h-5 text-red-500" />;
    } else if (file.type.includes('powerpoint') || file.type.includes('presentation')) {
      return <FileText className="w-5 h-5 text-orange-500" />;
    } else if (file.type.includes('word') || file.type.includes('document')) {
      return <FileText className="w-5 h-5 text-blue-500" />;
    }
    return <File className="w-5 h-5 text-gray-500" />;
  };

  // Icon helper for messages created from summary (docMeta)
  const getDocIconByName = (name) => {
    const lower = (name || '').toLowerCase();
    if (lower.endsWith('.pdf')) return <FileText className="w-5 h-5 text-red-500" />;
    if (lower.endsWith('.ppt') || lower.endsWith('.pptx')) return <FileText className="w-5 h-5 text-orange-500" />;
    if (lower.endsWith('.doc') || lower.endsWith('.docx')) return <FileText className="w-5 h-5 text-blue-500" />;
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

      // Process each file sequentially
      for (const file of files) {
        try {
          // Call extract API
          const extractFormData = new FormData();
          extractFormData.append('files', file);
          extractFormData.append('user_id', token);
          extractFormData.append('session_id', sessionId);

          console.log('Calling extract API for file:', file.name);
          const extractResponse = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/documents/extract', {
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
            
            // Log each document object
            extractData.documents.forEach((doc, index) => {
              console.log(`Document ${index + 1}:`, doc);
              if (doc.additionalProp1) {
                console.log(`Document ${index + 1} additionalProp1:`, doc.additionalProp1);
              }
            });
          } else {
            console.log('No documents array found in response or invalid structure');
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
        const documentsFromExtract = Array.isArray(file.extractData?.documents)
          ? file.extractData.documents
          : [];

        const requestBody = {
          session: {
            session_id: sessionId,
            user_id: token,
            content: [],
            document_summary: [],
            videoduration: "60",
            created_at: new Date().toISOString(),
            totalsummary: [],
            messages: []
          },
          documents: documentsFromExtract
        };
  
        console.log('Calling summary API for file:', file.name);
        console.log('Summary API Request Body:', requestBody);
        
        const summaryResponse = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/documents/summary', {
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
              const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/sessions/title', {
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

        // Collect documents arrays from all files that have extractData
        const combinedDocuments = uploadedFiles
          .filter(f => f.extractData && Array.isArray(f.extractData.documents))
          .flatMap(f => f.extractData.documents);

        if (combinedDocuments.length === 0) {
          console.warn('No extracted documents available to send.');
          return;
        }

        const requestBody = {
          session: {
            session_id: sessionId,
            user_id: token,
            content: [],
            document_summary: [],
            videoduration: "60",
            created_at: new Date().toISOString(),
            totalsummary: [],
            messages: []
          },
          documents: combinedDocuments
        };

        console.log('Calling summary API for ALL files. Request Body:', requestBody);

        const summaryResponse = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/documents/summary', {
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
              const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/sessions/title', {
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
      const desiredModel = videoType === 'Avatar Based' ? 'VEO3' : 'SORA';
      const currentModel = (scene?.mode || scene?.model || '').toUpperCase();
      if (currentModel === desiredModel.toUpperCase()) return; // no-op if same
      setPendingModelType(videoType);
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
      const desiredModel = videoType === 'Avatar Based' ? 'VEO3' : 'SORA';
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
      const sessionResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionReqBody)
      });
      if (!sessionResp.ok) {
        const text = await sessionResp.text();
        throw new Error(`user-session/data failed: ${sessionResp.status} ${text}`);
      }
      const sessionDataResponse = await sessionResp.json();
      const sd = sessionDataResponse?.session_data || {};
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
        messages: sd.messages,
        scripts: Array.isArray(sd.scripts) ? sd.scripts : undefined,
      };

      // 2) Build switch-model request body
      const requestBody = {
        scene_number: scene.scene_number,
        target_model: desiredModel,
        session: sessionForBody,
      };
      console.log('scripts/switch-model request body:', requestBody);

      // 3) Call switch-model API
      const switchResp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/switch-model', {
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
        'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data',
        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sessionReqBody) }
      );
      if (!sessionResp.ok) {
        const text = await sessionResp.text();
        throw new Error(`user-session/data failed: ${sessionResp.status} ${text}`);
      }
      const sessionDataResponse = await sessionResp.json();
      const sd = sessionDataResponse?.session_data || {};
      const sessionForBody = {
        session_id: sessionId,
        user_id: token,
        content: sd.content,
        document_summary: sd.document_summary,
        videoduration: sd.video_duration?.toString?.(),
        created_at: sd.created_at,
        totalsummary: sd.total_summary,
        messages: sd.messages,
        scripts: Array.isArray(sd.scripts) ? sd.scripts : undefined,
      };

      const originalUserquery = Array.isArray(sd?.scripts?.[0]?.userquery) ? sd.scripts[0].userquery : [];

      // 2) Build changed_script.airesponse from current UI rows (preserve scene_number)
      const rows = Array.isArray(scriptRows) ? scriptRows : [];
      const airesponse = rows.map((r, idx) => ({
        scene_number: r?.scene_number,
        scene_title: r?.scene_title ?? '',
        model: r?.mode ?? r?.model ?? '',
        timeline: r?.timeline ?? '',
        narration: r?.narration ?? '',
        desc: r?.description ?? '',
        ref_image: filterImageUrls(
          Array.isArray(r?.ref_image)
            ? r.ref_image
            : (typeof r?.ref_image === 'string' && r.ref_image.trim())
            ? [r.ref_image]
            : []
        ),
        folderLink: r?.folderLink ?? r?.folder_link ?? '',
      }));

      const requestBody = {
        session: sessionForBody,
        changed_script: {
          userquery: originalUserquery,
          airesponse,
        },
      };
      console.log('scripts/update-text request body:', requestBody);

      // 3) Call update-text API
      const updateResp = await fetch(
        'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/update-text',
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
        'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data',
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
      const orderedScriptArray = rows.map((r, idx) => ({
        scene_number: r?.scene_number ?? idx + 1,
        scene_title: r?.scene_title ?? '',
        model: r?.mode ?? r?.model ?? '',
        timeline: r?.timeline ?? '',
        narration: r?.narration ?? '',
        desc: r?.description ?? '',
        ref_image: filterImageUrls(
          Array.isArray(r?.ref_image)
            ? r.ref_image
            : (typeof r?.ref_image === 'string' && r.ref_image.trim())
            ? [r.ref_image]
            : []
        ),
        folderLink: r?.folderLink ?? r?.folder_link ?? '',
      }));

      // 3) Prepare reorder request body per required schema using session data
      const sd = sessionDataResponse?.session_data || {};
      const sessionForBody = {
        session_id: sessionId,
        user_id: token,
        content: sd.content,
        document_summary: sd.document_summary,
        videoduration: sd.video_duration?.toString?.(),
        created_at: sd.created_at,
        totalsummary: sd.total_summary,
        messages: sd.messages,
        // pass through scripts if present from session_data for parity
        scripts: Array.isArray(sd.scripts) ? sd.scripts : undefined,
      };
      const sessionScripts = Array.isArray(sd?.scripts) ? sd.scripts : undefined;
      // Try to carry forward user's original query/preferences from the session
      const originalUserquery = Array.isArray(sessionScripts?.[0]?.userquery)
        ? sessionScripts[0].userquery
        : Array.isArray(sessionForBody?.userquery)
        ? sessionForBody.userquery
        : [];

      const reorderRequestBody = {
        session: sessionForBody,
        reordered_script: {
          userquery: originalUserquery,
          airesponse: orderedScriptArray,
        },
      };
      console.log('scripts/reorder request body:', reorderRequestBody);

      // 4) Call reorder API
      const reorderResp = await fetch(
        'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/scripts/reorder',
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
              <div className="text-sm text-gray-600">
                {(() => {
                  try {
                    const idx = typeof insertSceneIndex === 'number' ? insertSceneIndex : 0;
                    const prevNo = idx > 0 ? (scriptRows?.[idx-1]?.scene_number ?? idx) : 0;
                    const nextNo = scriptRows?.[idx]?.scene_number ?? (idx+1);
                    return (
                      <span>
                        Insert after Scene <span className="font-medium">{prevNo}</span> (before Scene <span className="font-medium">{nextNo}</span>)
                      </span>
                    );
                  } catch (_) {
                    return null;
                  }
                })()}
              </div>
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Video Type</label>
                <div className="flex gap-3">
                  {['Avatar Based', 'Infographic'].map((type) => (
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
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={() => setShowAddSceneModal(false)}
                className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200"
              >
                Cancel
              </button>
              <button
                onClick={addSceneToRows}
                disabled={isAddingScene}
                className={`px-4 py-2 rounded-lg text-sm font-medium text-white ${isAddingScene ? 'bg-[#9aa0d0] cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}
              >
                {isAddingScene ? 'Adding…' : 'Add Scene'}
              </button>
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
      {/* Confirm Model Change Popup */}
      {showModelConfirm && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/50">
          <div className="bg-white w-[92%] max-w-md rounded-lg shadow-xl p-5">
            <h3 className="text-lg font-semibold text-[#13008B]">Change Video Type?</h3>
            <div className="mt-3 text-sm text-gray-700">
              {(() => {
                const scene = Array.isArray(scriptRows) ? scriptRows[currentSceneIndex] : null;
                const currentModel = (scene?.mode || scene?.model || '').toUpperCase();
                const target = pendingModelType === 'Avatar Based' ? 'VEO3' : 'SORA';
                return (
                  <div>
                    <p className="mb-1">Scene {scene?.scene_number || currentSceneIndex + 1}: {scene?.scene_title || '-'}</p>
                    <p className="mb-1">Current model: <span className="font-medium">{currentModel || 'Unknown'}</span></p>
                    <p>Switch to: <span className="font-medium">{target}</span></p>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-[95%] max-w-6xl max-h-[85vh] overflow-hidden rounded-lg shadow-xl flex flex-col">
                         {/* Header */}
             <div className="flex items-center justify-between p-4 border-b border-gray-200">
               <h3 className="text-lg font-semibold text-[#13008B]">The Generated Script is:</h3>
               <div className="flex items-center gap-2">
                 {/* Undo / Redo */}
                 <button
                   onClick={handleUndoScript}
                   disabled={!canUndo}
                   className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium border ${!canUndo ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'}`}
                   title="Undo last change"
                 >
                   <RefreshCcw className="w-3 h-3 rotate-180" /> Undo
                 </button>
                 <button
                   onClick={handleRedoScript}
                   disabled={!canRedo}
                   className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg text-sm font-medium border ${!canRedo ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 hover:bg-gray-50 text-gray-900'}`}
                   title="Redo"
                 >
                   <RefreshCcw className="w-3 h-3" /> Redo
                 </button>
                 {/* Delete Scene */}
                <button
                  onClick={handleDeleteScene}
                  disabled={isDeletingScene || !Array.isArray(scriptRows) || scriptRows.length === 0}
                  className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium border transition-colors ${(!Array.isArray(scriptRows) || scriptRows.length === 0 || isDeletingScene) ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border-gray-200 hover:bg-red-50 text-red-700'}`}
                  title="Delete current scene"
                >
                  {isDeletingScene ? (
                    <span className="w-4 h-4 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  {isDeletingScene ? 'Deleting…' : 'Delete'}
                </button>
                 {/* Generate Video shortcut in header */}
                 <button
                   onClick={triggerVideoGenerationFromSession}
                   disabled={isGeneratingVideo}
                   className={`hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${isGeneratingVideo ? 'bg-gray-100 border border-gray-200 text-gray-400 cursor-not-allowed' : 'bg-white border border-gray-200 hover:bg-gray-50 text-gray-900'}`}
                   title="Generate video from this script"
                 >
                   {isGeneratingVideo ? (
                     <div className="w-4 h-4 border-2 border-[#13008B] border-t-transparent rounded-full animate-spin" />
                   ) : (
                     <div className="w-4 h-4 rounded-full bg-blue-700 flex items-center justify-center">
                       <div className="w-0 h-0 border-l-[5px] border-l-white border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent ml-0.5"></div>
                     </div>
                   )}
                 <span>{isGeneratingVideo ? 'Generating…' : 'Generate Reel'}</span>
                </button>
                {/* Regenerate current scene */}
                <button
                  onClick={() => setShowRegenModal(true)}
                  className={`hidden sm:inline-flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors bg-white border border-gray-200 hover:bg-gray-50 text-gray-900`}
                  title="Regenerate current scene"
                >
                  <RefreshCcw className="w-4 h-4" />
                  <span>Regenerate</span>
                </button>
                <button onClick={() => {
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
                 }} className="text-white w-8 h-8 hover:text-[#13008B] hover:bg-[#e4e0ff] transition-all duration-300 bg-[#13008B] rounded-full">✕</button>
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
                    className={`w-8 h-8 rounded-full flex items-center justify-center border ${visibleStartIndex <= 0 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'}`}
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
                          className={`w-6 h-6 rounded-full flex items-center justify-center border ${index === 0 ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'}`}
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
                          className="w-6 h-6 rounded-full bg-black text-white flex items-center justify-center"
                        >
                          +
                        </button>
                        <button
                          onClick={() => moveSceneRight(index)}
                          disabled={!Array.isArray(scriptRows) || index >= scriptRows.length - 1}
                          title={index >= (Array.isArray(scriptRows) ? scriptRows.length - 1 : 0) ? 'Cannot move further right' : `Move Scene ${index + 1} right`}
                          className={`w-6 h-6 rounded-full flex items-center justify-center border ${index >= (Array.isArray(scriptRows) ? scriptRows.length - 1 : 0) ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'}`}
                        >
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      </div>
                       <button
                         onClick={() => setCurrentSceneIndex(index)}
                         className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
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
                    className={`w-8 h-8 rounded-full flex items-center justify-center border ${ (visibleStartIndex ?? 0) >= (Array.isArray(scriptRows) ? Math.max(0, scriptRows.length - 5) : 0) ? 'bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-800 hover:bg-gray-100 border-gray-300'}`}
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
               <div className="p-6 max-h-[60vh] overflow-y-auto">
                 {Array.isArray(scriptRows) && scriptRows[currentSceneIndex] && (
                   <div className="space-y-6">
                     {/* Scene Details Section */}
                     <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                       <h4 className="text-lg font-semibold text-gray-800 mb-4">Scene Details</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                         <div>
                           <label className="block text-sm font-medium text-gray-700 mb-2">Scene Title</label>
                           {isEditingScene ? (
                             <input
                               type="text"
                               value={Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? scriptRows[currentSceneIndex].scene_title || '' : ''}
                               disabled
                               className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-gray-100 text-gray-600"
                             />
                           ) : (
                             <div className="w-full px-3 py-2 border border-gray-200 rounded-lg bg-white text-gray-800">
                               {Array.isArray(scriptRows) && scriptRows[currentSceneIndex] ? (scriptRows[currentSceneIndex].scene_title || '-') : '-'}
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

                     {/* Description Section */}
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

                                           {/* Video Type Selection */}
                      <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">Video Type</h4>
                        
                        <div className="flex flex-wrap gap-3">
                          {['Avatar Based', 'Infographic'].map((type) => (
                            <button
                              key={type}
                              onClick={() => openModelChangeConfirm(type)}
                              disabled={isSwitchingModel}
                              className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                                selectedVideoType === type
                                  ? 'bg-[#13008B] text-white'
                                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                              } ${isSwitchingModel ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              {isSwitchingModel && selectedVideoType !== type ? '...' : type}
                            </button>
                          ))}
                          {['Commercial', 'Corporate'].map((type) => (
                            <button
                              key={type}
                              disabled
                              className="px-4 py-2 rounded-full text-sm font-medium bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed"
                              title="Coming soon"
                            >
                              {type}
                            </button>
                          ))}
                        </div>
                        {isSwitchingModel && (
                          <p className="text-sm text-gray-500 mt-2">Switching model…</p>
                        )}
                      </div>

                     {selectedVideoType === 'Avatar Based' ? (
                       <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                         <h4 className="text-lg font-semibold text-gray-800 mb-4">Select an Avatar</h4>
                         <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-8 gap-4">
                           {avatarOptions.map((avatarUrl, index) => (
                             <button
                               type="button"
                               key={index}
                               onClick={() => {
                              try {
                                 setSelectedAvatar(avatarUrl);
                                 // Set this avatar as the sole ref_image for current scene (veo3/avatar based)
                                 if (Array.isArray(scriptRows) && scriptRows[currentSceneIndex]) {
                                   const rows = [...scriptRows];
                                   const scene = { ...rows[currentSceneIndex] };
                                   scene.ref_image = [avatarUrl];
                                   rows[currentSceneIndex] = scene;
                                   setScriptRows(rows);
                                   updateRefMapForScene(scene.scene_number, scene.ref_image);
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
                                 // Apply uploaded avatar as scene ref_image
                                 const rows = [...scriptRows];
                                 const scene = { ...rows[currentSceneIndex] };
                                 scene.ref_image = [url];
                                 rows[currentSceneIndex] = scene;
                                 setScriptRows(rows);
                                 updateRefMapForScene(scene.scene_number, scene.ref_image);
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
                     ) : (
                       <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                         <h4 className="text-lg font-semibold text-gray-800 mb-4">Select a Reference Image</h4>
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
                          <button
                            onClick={() => imageFileInputRef.current && imageFileInputRef.current.click()}
                            className={`flex items-center gap-2 px-3 py-2 rounded-lg bg-[#13008B] text-white hover:bg-blue-800 text-sm ${isUploadingSceneImages ? 'opacity-60 cursor-not-allowed' : ''}`}
                            title="Upload image(s)"
                            disabled={isUploadingSceneImages}
                          >
                            <Upload className="w-4 h-4" /> Upload
                          </button>
                           <button
                             onClick={async () => {
                               try {
                                 setFolderPickerError('');
                                 if (!Array.isArray(scriptRows) || !scriptRows[currentSceneIndex]) return;
                                 const current = scriptRows[currentSceneIndex];
                                 const folder = current?.folderLink || current?.folder_link || '';
                                 if (!folder || typeof folder !== 'string') {
                                  // proceed with user_id fallback inside uploadImagesToFolder
                                   return;
                                 }
                                 setIsFolderPickerOpen(true);
                                 setIsLoadingFolderImages(true);

                                 const payload = { folder_url: folder };
                                 const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/folders/images', {
                                   method: 'POST',
                                   headers: { 'Content-Type': 'application/json' },
                                   body: JSON.stringify(payload),
                                 });
                                 const text = await resp.text();
                                 let data; try { data = JSON.parse(text); } catch (_) { data = text; }
                                 if (!resp.ok) {
                                   throw new Error(`folders/images failed: ${resp.status} ${text}`);
                                 }

                                 const imageUrls = Array.isArray(data?.image_urls) ? data.image_urls : [];
                                 const filtered = filterImageUrls(imageUrls);
                                 const unique = Array.from(new Set(filtered));
                                 setFolderImageCandidates(unique);
                                 setSelectedFolderImages([]);
                               } catch (e) {
                                 console.error('Failed to load folder images:', e);
                                 setFolderPickerError('Failed to load images for this folder. Please try again.');
                                 setFolderImageCandidates([]);
                               } finally {
                                 setIsLoadingFolderImages(false);
                               }
                             }}
                             className="flex items-center gap-2 px-3 py-2 rounded-lg bg-gray-100 text-gray-800 hover:bg-gray-200 text-sm border border-gray-300"
                             title="Pick from folder images"
                           >
                             <RefreshCcw className="w-4 h-4" /> Replace
                           </button>
                         </div>
                       </div>
                     )}
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
                     
                     {hasOrderChanged && (
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
                 ) : (
                   <>
                     {/* Export Button */}
                    
                   </>
                 )}
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
                 ) : (
                   <>
                     {/* Edit controls moved here from header */}
                     {isEditingScene ? (
                       <div className="flex items-center gap-2">
                         <button
                           onClick={saveEditedScriptText}
                           disabled={isUpdatingText}
                           className={`px-4 py-2 rounded-lg text-sm font-medium text-white transition-colors ${isUpdatingText ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                         >
                           {isUpdatingText ? 'Saving…' : '💾 Save Changes'}
                         </button>
                         <button
                           onClick={() => setIsEditingScene(false)}
                           disabled={isUpdatingText}
                           className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${isUpdatingText ? 'bg-gray-200 cursor-not-allowed text-gray-500' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                         >
                           ✖ Cancel
                         </button>
                       </div>
                     ) : (
                       <button
                         onClick={() => setIsEditingScene(true)}
                         className="px-4 py-2 rounded-lg text-sm font-medium bg-[#13008B] text-white hover:opacity-90 transition-colors"
                         title="Edit current scene"
                       >
                         ✏️ Edit
                       </button>
                     )}

                     {hasOrderChanged && (
                       <button
                         onClick={() => saveReorderedScript && saveReorderedScript(Array.isArray(scriptRows) ? [...scriptRows] : [])}
                         disabled={isSavingReorder}
                         className={`px-6 py-2 rounded-lg transition-colors text-white ${
                           isSavingReorder ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'
                         }`}
                         title="Save new scene order"
                       >
                         {isSavingReorder ? 'Saving…' : 'Save'}
                       </button>
                     )}
                   </>
                 )}
               </div>
             </div>
          </div>
        </div>
      )}
      {/* Regenerate Scene Modal */}
      {showRegenModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-[95%] max-w-lg rounded-lg shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-[#13008B]">Regenerate Scene {scriptRows?.[currentSceneIndex]?.scene_number ?? (currentSceneIndex+1)}</h3>
              <button onClick={() => setShowRegenModal(false)} className="text-white w-8 h-8 hover:text-[#13008B] hover:bg-[#e4e0ff] transition-all duration-300 bg-[#13008B] rounded-full">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">User Query (optional)</label>
                <textarea value={regenQuery} onChange={(e)=>setRegenQuery(e.target.value)} rows={3} className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" placeholder="Describe how you want to change this scene..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Scene Type</label>
                <div className="flex items-center gap-4">
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="regen-model" checked={regenModel==='VEO3'} onChange={()=>setRegenModel('VEO3')} />
                    <span>Avatar</span>
                  </label>
                  <label className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="regen-model" checked={regenModel==='SORA'} onChange={()=>setRegenModel('SORA')} />
                    <span>Infographic </span>
                  </label>
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <button onClick={()=>setShowRegenModal(false)} className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-100 text-gray-700 hover:bg-gray-200">Cancel</button>
                <button onClick={handleRegenerateScene} className="px-4 py-2 rounded-lg text-sm font-medium bg-[#13008B] text-white hover:bg-blue-800">Save</button>
              </div>
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
      {/* Short 5s popup for job-based generation */}
      {showShortGenPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-[100%] max-w-sm rounded-lg shadow-xl p-6 text-center">
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <h4 className="text-lg font-semibold text-gray-900">Generating Video…</h4>
            <p className="mt-1 text-sm text-gray-600">You’ll be redirected to My Media shortly.</p>
          </div>
        </div>
      )}
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
      
      {/* Main Content Area */}
     <div className="flex-1 flex flex-col overflow-hidden">
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
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto px-0 py-4 scrollbar-hide">
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
                  </div>
                  
                  {/* Actions row for AI messages: icons + buttons on one line */}
                  {message.type === 'ai' && (
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {/* Toolbar icons */}
                      <button onClick={() => copyMessageText(message.content)} className="text-gray-500 hover:text-gray-800 transition-colors" title="Copy">
                        <CopyIcon className="w-4 h-4" />
                      </button>
                      <button className="text-gray-500 hover:text-gray-800 transition-colors" title="Like">
                        <ThumbsUp className="w-4 h-4" />
                      </button>
                      <button className="text-gray-500 hover:text-gray-800 transition-colors" title="Dislike">
                        <ThumbsDown className="w-4 h-4" />
                      </button>
                      <button className="text-gray-500 hover:text-gray-800 transition-colors" title="Regenerate">
                        <RefreshCcw className="w-4 h-4" />
                      </button>
                      <button className="text-gray-500 hover:text-gray-800 transition-colors" title="More">
                        <MoreHorizontal className="w-4 h-4" />
                      </button>

                      {/* Divider */}
                      <span className="hidden sm:inline-block w-px h-5 bg-gray-200 mx-1" />

                      {/* Generate/Script buttons */}
                      {(() => {
                          const hasGenerated = !!message.script;
                          if (hasGenerated) {
                            return (

                              <button 
                                onClick={generateVideoJobAndRedirect}
                                className={`flex items-center justify-center gap-2 px-3 py-2 border rounded-lg transition-colors shadow-sm bg-white border-gray-200 hover:bg-gray-50 text-gray-900`}>
                                <div className="w-5 h-5 rounded-full bg-blue-700 flex items-center justify-center">
                                  <div className="w-0 h-0 border-l-[6px] border-l-white border-t-[4px] border-t-transparent border-b-[4px] border-b-transparent ml-0.5"></div>
                                </div>
                                <span className={`text-sm font-medium`}>Generate Reel</span>
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
                          onClick={() => openScriptModal(message.script)} 
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

             {/* Chat Input or File Upload Display */}
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
                   placeholder="Hi! Tell Me How We Can Maximize Your Video Generation?"
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
                     title="Upload Documents (PDF, PPT, PPTX, DOC, DOCX)"
                   >
                     <Paperclip className="w-4 h-4 lg:w-5 lg:h-5" />
                   </button>
                   
                   {/* Hidden file input */}
                   <input
                     ref={fileInputRef}
                     type="file"
                     multiple
                     accept=".pdf,.ppt,.pptx,.doc,.docx"
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
    </div>
  )
}

export default Chat;
