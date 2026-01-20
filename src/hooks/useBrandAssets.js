// Custom hook for Brand Assets API
import { useCallback, useState } from 'react';

const API_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1';

export default function useBrandAssets() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assets, setAssets] = useState(null);
  const [analysis, setAnalysis] = useState(null);

  const getBrandAssets = useCallback(async (userId) => {
    if (!userId) return null;
    setLoading(true); setError('');
    try {
      const resp = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/brand-assets`);
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(`GET brand-assets failed: ${resp.status}`);
      setAssets(data);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to load brand assets');
      return null;
    } finally { setLoading(false); }
  }, []);

  // GET /v1/users/brand-assets/{user_id}
  const getBrandAssetsByUserId = useCallback(async (userId) => {
    if (!userId) return null;
    setLoading(true); setError('');
    try {
      const resp = await fetch(`${API_BASE}/users/brand-assets/${encodeURIComponent(userId)}`);
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(`GET brand-assets by id failed: ${resp.status}`);
      setAnalysis(data);
      try { localStorage.setItem(`brand_assets_analysis:${userId}`, JSON.stringify(data)); } catch (_) { }
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to load brand assets');
      return null;
    } finally { setLoading(false); }
  }, []);

  // GET /v1/users/brand-assets/profiles/{user_id}
  const getBrandProfiles = useCallback(async (userId) => {
    if (!userId) return [];
    setLoading(true); setError('');
    try {
      const resp = await fetch(`${API_BASE}/users/brand-assets/profiles/${encodeURIComponent(userId)}`);
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`GET profiles failed: ${resp.status} ${text}`);
      const profiles = Array.isArray(data?.profiles) ? data.profiles : (Array.isArray(data) ? data : []);
      return profiles;
    } catch (e) {
      setError(e?.message || 'Failed to load profiles');
      return [];
    } finally { setLoading(false); }
  }, []);

  // GET /v1/users/brand-assets/profiles/{user_id}/{profile_id}
  const getBrandProfileById = useCallback(async ({ userId, profileId }) => {
    if (!userId || !profileId) return null;
    setLoading(true); setError('');
    try {
      const url = `${API_BASE}/users/brand-assets/profiles/${encodeURIComponent(userId)}/${encodeURIComponent(profileId)}`;
      const resp = await fetch(url);
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`GET profile detail failed: ${resp.status} ${text}`);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to load profile');
      return null;
    } finally { setLoading(false); }
  }, []);

  // POST /v1/users/brand-assets/profiles/{user_id}/{profile_id}/activate
  const activateBrandProfile = useCallback(async ({ userId, profileId }) => {
    if (!userId || !profileId) throw new Error('userId and profileId are required');
    setLoading(true); setError('');
    try {
      const url = `${API_BASE}/users/brand-assets/profiles/${encodeURIComponent(userId)}/${encodeURIComponent(profileId)}/activate`;
      const resp = await fetch(url, { method: 'POST' });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`activate failed: ${resp.status} ${text}`);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to activate profile');
      throw e;
    } finally { setLoading(false); }
  }, []);

  // DELETE /v1/users/brand-assets/profiles/{user_id}/{profile_id}
  const deleteBrandProfile = useCallback(async ({ userId, profileId }) => {
    if (!userId || !profileId) throw new Error('userId and profileId are required');
    setLoading(true); setError('');
    try {
      const url = `${API_BASE}/users/brand-assets/profiles/${encodeURIComponent(userId)}/${encodeURIComponent(profileId)}`;
      const resp = await fetch(url, { method: 'DELETE' });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`delete profile failed: ${resp.status} ${text}`);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to delete profile');
      throw e;
    } finally { setLoading(false); }
  }, []);

  const uploadBrandAssets = useCallback(async (params) => {
    // params: { userId, fonts, colors, caption_location, files: { logos, icons, voiceovers, templates } }
    const { userId, fonts = [], colors = [], caption_location, files = {} } = params || {};
    if (!userId) throw new Error('userId is required');
    const form = new FormData();
    form.append('user_id', userId);
    try {
      if (Array.isArray(fonts)) fonts.filter(Boolean).forEach(f => form.append('font', f));
      if (Array.isArray(colors)) colors.filter(Boolean).forEach(c => form.append('color', c));
      if (caption_location) form.append('caption_location', typeof caption_location === 'string' ? caption_location : JSON.stringify(caption_location));
      const { logos = [], icons = [], voiceovers = [], templates = [], template = [] } = files;
      logos.filter(Boolean).forEach(file => form.append('logos', file));
      icons.filter(Boolean).forEach(file => form.append('icons', file));
      voiceovers.filter(Boolean).forEach(file => form.append('voiceovers', file));
      // Prefer new singular key 'template' if provided, fallback to 'templates'
      const tFiles = (template && template.length ? template : templates) || [];
      tFiles.filter(Boolean).forEach(file => form.append('template', file));
    } catch (_) { /* ignore */ }

    setLoading(true); setError('');
    try {
      const resp = await fetch(`${API_BASE}/users/brand-assets`, { method: 'POST', body: form });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch { data = text; }
      if (!resp.ok) throw new Error(`POST brand-assets failed: ${resp.status} ${text}`);
      // Refresh assets after successful upload
      await getBrandAssets(userId);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to upload brand assets');
      throw e;
    } finally { setLoading(false); }
  }, [getBrandAssets]);

  const updateBrandAssets = useCallback(async ({ userId, payload }) => {
    if (!userId) throw new Error('userId is required');
    setLoading(true); setError('');
    try {
      const resp = await fetch(`${API_BASE}/users/brand-assets/update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, ...(payload || {}) })
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(`update failed: ${resp.status}`);
      setAnalysis(data);
      try { localStorage.setItem(`brand_assets_analysis:${userId}`, JSON.stringify(data)); } catch (_) { }
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to update brand assets');
      throw e;
    } finally { setLoading(false); }
  }, []);
  // PUT /v1/users/brand-assets/profiles/{user_id}/{profile_id}
  const updateBrandProfile = useCallback(async ({ userId, profileId, payload }) => {
    if (!userId) throw new Error('userId is required');
    if (!profileId) throw new Error('profileId is required');
    setLoading(true); setError('');
    try {
      const url = `${API_BASE}/users/brand-assets/profiles/${encodeURIComponent(userId)}/${encodeURIComponent(profileId)}`;
      const body = JSON.stringify({ user_id: userId, profile_id: profileId, ...(payload || {}) });
      const resp = await fetch(url, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = { raw: text }; }
      if (!resp.ok) {
        console.error('[updateBrandProfile] PUT failed', { status: resp.status, url, body, response: text });
        throw new Error(`profiles update failed: ${resp.status} ${text}`);
      }
      setAnalysis(data);
      try { localStorage.setItem(`brand_assets_analysis:${userId}`, JSON.stringify(data)); } catch (_) { }
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to update brand profile');
      throw e;
    } finally { setLoading(false); }
  }, []);
  const analyzeWebsite = useCallback(async ({ userId, website }) => {
    if (!userId || !website) throw new Error('userId and website are required');
    // Ensure website starts with http(s)
    const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    const form = new FormData();
    form.append('user_id', userId);
    form.append('website_url', url);
    setLoading(true); setError('');
    try {
      const resp = await fetch(`${API_BASE}/users/brand-assets/analyze-website`, {
        method: 'POST',
        body: form
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(`analyze-website failed: ${resp.status}`);
      setAnalysis(data);
      try { localStorage.setItem(`brand_assets_analysis:${userId}`, JSON.stringify(data)); } catch (_) { }
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to analyze website');
      throw e;
    } finally { setLoading(false); }
  }, []);

  // POST /v1/users/brand-assets/profiles/create with FormData
  const createBrandProfile = useCallback(async ({ userId, website, profileName, setAsActive = true }) => {
    if (!userId || !website || !profileName) throw new Error('userId, website, and profileName are required');
    const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    const form = new FormData();
    form.append('user_id', userId);
    form.append('website_url', url);
    form.append('profile_name', profileName);
    form.append('set_as_active', String(!!setAsActive));
    setLoading(true); setError('');
    try {
      const resp = await fetch(`${API_BASE}/users/brand-assets/profiles/create`, { method: 'POST', body: form });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(`profiles/create failed: ${resp.status}`);
      setAnalysis(data);
      try { localStorage.setItem(`brand_assets_analysis:${userId}`, JSON.stringify(data)); } catch (_) { }
      try { localStorage.setItem(`last_analyzed_website:${userId}`, url); } catch (_) { }
      try { localStorage.setItem(`last_profile_name:${userId}`, profileName); } catch (_) { }
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to create brand profile');
      throw e;
    } finally { setLoading(false); }
  }, []);

  // POST /v1/users/brand-assets/profiles/create-queue with FormData
  const createBrandProfileQueue = useCallback(async ({ userId, website, profileName, setAsActive = true }) => {
    if (!userId || !website || !profileName) throw new Error('userId, website, and profileName are required');
    const url = /^https?:\/\//i.test(website) ? website : `https://${website}`;
    const form = new FormData();
    form.append('user_id', userId);
    form.append('website_url', url);
    form.append('profile_name', profileName);
    form.append('set_as_active', String(!!setAsActive));
    setLoading(true); setError('');
    try {
      const resp = await fetch(`${API_BASE}/users/brand-assets/profiles/create-queue`, { method: 'POST', body: form });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(`profiles/create-queue failed: ${resp.status}`);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to create brand profile queue');
      throw e;
    } finally { setLoading(false); }
  }, []);

  // GET /v1/users/brand-assets/profiles/job-status/{job_id}
  const getJobStatus = useCallback(async ({ userId, jobId }) => {
    if (!userId || !jobId) throw new Error('userId and jobId are required');
    try {
      const url = `${API_BASE}/users/brand-assets/profiles/job-status/${encodeURIComponent(jobId)}?user_id=${encodeURIComponent(userId)}`;
      const resp = await fetch(url, {
        method: 'GET'
      });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(`job-status failed: ${resp.status}`);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to get job status');
      throw e;
    }
  }, []);

  const reset = useCallback(() => { setAssets(null); setError(''); setLoading(false); }, []);

  // POST /v1/users/brand-assets/upload-file with FormData
  const uploadBrandFiles = useCallback(async ({ userId, fileType, files = [] }) => {
    if (!userId) throw new Error('userId is required');
    if (!fileType) throw new Error('fileType is required');
    const form = new FormData();
    form.append('user_id', userId);
    form.append('file_type', fileType); // logo | icon | template
    try { files.filter(Boolean).forEach(f => form.append('files', f)); } catch (_) { }
    setLoading(true); setError('');
    try {
      const resp = await fetch(`${API_BASE}/users/brand-assets/upload-file`, { method: 'POST', body: form });
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(`upload-file failed: ${resp.status}`);
      // Accept either array or single url under various keys
      let urls = [];
      if (Array.isArray(data)) urls = data;
      else if (Array.isArray(data?.image_url)) urls = data.image_url;
      else if (typeof data?.image_url === 'string') urls = [data.image_url];
      else if (Array.isArray(data?.urls)) urls = data.urls;
      return urls;
    } catch (e) {
      setError(e?.message || 'Failed to upload files');
      throw e;
    } finally { setLoading(false); }
  }, []);

  const uploadTemplatesPptx = useCallback(async ({ userId, profileId, file, convertColors = false }) => {
    if (!userId) throw new Error('userId is required');
    if (!profileId) throw new Error('profileId is required');
    if (!file) throw new Error('pptx file is required');
    const form = new FormData();
    form.append('pptx_file', file);
    form.append('convert_colors', convertColors ? 'true' : 'false');
    setLoading(true); setError('');
    try {
      const url = `${API_BASE}/users/brand-assets/profiles/${encodeURIComponent(userId)}/${encodeURIComponent(profileId)}/upload-pptx`;
      const resp = await fetch(url, { method: 'POST', body: form });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`upload pptx failed: ${resp.status} ${text}`);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to upload PowerPoint');
      throw e;
    } finally { setLoading(false); }
  }, []);

  const uploadProfileTemplateImages = useCallback(async ({ userId, profileId, aspectRatio, files = [], convertColors = false }) => {
    if (!userId) throw new Error('userId is required');
    if (!profileId) throw new Error('profileId is required');
    if (!files || files.length === 0) throw new Error('At least one image is required');
    const form = new FormData();
    // aspect_ratio is optional - only add if provided
    if (aspectRatio) {
      form.append('aspect_ratio', aspectRatio);
    }
    form.append('convert_colors', convertColors ? 'true' : 'false');
    files.filter(Boolean).forEach(file => form.append('images', file));
    setLoading(true); setError('');
    try {
      const url = `${API_BASE}/users/brand-assets/profiles/${encodeURIComponent(userId)}/${encodeURIComponent(profileId)}/upload-images`;
      const resp = await fetch(url, { method: 'POST', body: form });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`upload-images failed: ${resp.status} ${text}`);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to upload template images');
      throw e;
    } finally { setLoading(false); }
  }, []);

  const uploadVoiceover = useCallback(async ({ userId, profileId, name, type, file }) => {
    if (!userId) throw new Error('userId is required');
    if (!profileId) throw new Error('profileId is required');
    if (!name) throw new Error('name is required');
    if (!type) throw new Error('type is required');
    if (!file) throw new Error('file is required');
    setLoading(true); setError('');
    try {
      const form = new FormData();
      form.append('user_id', userId);
      form.append('profile_id', profileId);
      form.append('name', name);
      form.append('type', type);
      form.append('file', file);

      const resp = await fetch(`${API_BASE}/users/brand-assets/upload-voiceover`, {
        method: 'POST',
        body: form
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`upload-voiceover failed: ${resp.status} ${text}`);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to upload voiceover');
      throw e;
    } finally { setLoading(false); }
  }, []);

  const updateTemplateElements = useCallback(async ({ userId, profileId, templates }) => {
    if (!userId) throw new Error('userId is required');
    if (!profileId) throw new Error('profileId is required');
    if (!templates || templates.length === 0) throw new Error('At least one template is required');
    setLoading(true); setError('');
    try {
      const resp = await fetch(`${API_BASE}/users/brand-assets/profiles/update-template-elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          profile_id: profileId,
          templates: templates || []
        })
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`update-template-elements failed: ${resp.status} ${text}`);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to update template elements');
      throw e;
    } finally { setLoading(false); }
  }, []);

  const getTemplateById = useCallback(async ({ userId, profileId, templateId }) => {
    if (!userId) throw new Error('userId is required');
    if (!profileId) throw new Error('profileId is required');
    if (!templateId) throw new Error('templateId is required');
    setLoading(true); setError('');
    try {
      const url = `${API_BASE}/users/brand-assets/profiles/${encodeURIComponent(userId)}/${encodeURIComponent(profileId)}/templates/${encodeURIComponent(templateId)}`;
      const resp = await fetch(url, { method: 'GET' });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`get-template failed: ${resp.status} ${text}`);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to fetch template');
      throw e;
    } finally { setLoading(false); }
  }, []);

  const replaceTemplateImage = useCallback(async ({ userId, profileId, templateId, file, fileName }) => {
    if (!userId) throw new Error('userId is required');
    if (!profileId) throw new Error('profileId is required');
    if (!templateId) throw new Error('templateId is required');
    if (!file) throw new Error('file is required');
    const form = new FormData();
    const uploadName = fileName || file?.name || 'edited-image.png';
    try {
      form.append('file', file, uploadName);
    } catch (_) {
      form.append('file', file);
    }
    setLoading(true); setError('');
    try {
      const url = `${API_BASE}/users/brand-assets/profiles/${encodeURIComponent(userId)}/${encodeURIComponent(profileId)}/templates/${encodeURIComponent(templateId)}/replace-image`;
      const resp = await fetch(url, { method: 'POST', body: form });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`replace-image failed: ${resp.status} ${text}`);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to replace template image');
      throw e;
    } finally { setLoading(false); }
  }, []);

  // POST /v1/users/brand-assets/profiles/{user_id}/{profile_id}/regenerate-templates
  const regenerateTemplates = useCallback(async ({ userId, profileId }) => {
    if (!userId) throw new Error('userId is required');
    if (!profileId) throw new Error('profileId is required');
    setLoading(true); setError('');
    try {
      const url = `${API_BASE}/users/brand-assets/profiles/${encodeURIComponent(userId)}/${encodeURIComponent(profileId)}/regenerate-templates`;
      const resp = await fetch(url, { method: 'POST' });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`regenerate-templates failed: ${resp.status} ${text}`);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to regenerate templates');
      throw e;
    } finally { setLoading(false); }
  }, []);

  // POST /v1/users/brand-assets/profiles/delete-template-elements
  const deleteTemplateElements = useCallback(async ({ userId, profileId, templateIds, aspectRatio }) => {
    if (!userId) throw new Error('userId is required');
    if (!profileId) throw new Error('profileId is required');
    if (!templateIds || !Array.isArray(templateIds) || templateIds.length === 0) {
      throw new Error('At least one template ID is required');
    }
    if (!aspectRatio) throw new Error('aspect_ratio is required');
    setLoading(true); setError('');
    try {
      // Try the exact endpoint as specified by user
      // API expects templates array with template_id and aspect_ratio
      const url = `${API_BASE}/users/brand-assets/profiles/delete-template-elements`;

      // Build templates array with template_id and aspect_ratio
      const templates = templateIds.map(templateId => ({
        template_id: templateId,
        aspect_ratio: aspectRatio
      }));

      let resp = await fetch(url, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: userId,
          profile_id: profileId,
          templates: templates,
          aspect_ratio: aspectRatio
        })
      });

      // If DELETE fails with 405, try POST
      if (!resp.ok && resp.status === 405) {
        resp = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userId,
            profile_id: profileId,
            templates: templates,
            aspect_ratio: aspectRatio
          })
        });
      }
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`delete-template-elements failed: ${resp.status} ${text}`);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to delete template elements');
      throw e;
    } finally { setLoading(false); }
  }, []);

  // DELETE /v1/users/brand-assets/profiles/{user_id}/{profile_id}/voiceovers/{voiceover_id}
  const deleteVoiceover = useCallback(async ({ userId, profileId, voiceoverId }) => {
    if (!userId || !profileId || !voiceoverId) throw new Error('userId, profileId, and voiceoverId are required');
    setLoading(true); setError('');
    try {
      const url = `${API_BASE}/users/brand-assets/profiles/${encodeURIComponent(userId)}/${encodeURIComponent(profileId)}/voiceovers/${encodeURIComponent(voiceoverId)}`;
      const resp = await fetch(url, { method: 'DELETE' });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`delete voiceover failed: ${resp.status} ${text}`);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to delete voiceover');
      throw e;
    } finally { setLoading(false); }
  }, []);

  return { loading, error, assets, analysis, setAssets, setAnalysis, uploadBrandAssets, uploadBrandFiles, uploadTemplatesPptx, uploadProfileTemplateImages, uploadVoiceover, updateTemplateElements, getBrandAssets, getBrandAssetsByUserId, getBrandProfiles, getBrandProfileById, activateBrandProfile, deleteBrandProfile, analyzeWebsite, createBrandProfile, createBrandProfileQueue, getJobStatus, updateBrandAssets, updateBrandProfile, getTemplateById, replaceTemplateImage, regenerateTemplates, deleteTemplateElements, deleteVoiceover, reset };
}
