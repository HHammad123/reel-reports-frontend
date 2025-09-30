// Custom hook for Brand Assets API
import { useCallback, useState } from 'react';

const API_BASE = 'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1';

export default function useBrandAssets() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assets, setAssets] = useState(null);

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

  const uploadBrandAssets = useCallback(async (params) => {
    // params: { userId, fonts, colors, caption_location, files: { logos, icons, voiceovers } }
    const { userId, fonts = [], colors = [], caption_location, files = {} } = params || {};
    if (!userId) throw new Error('userId is required');
    const form = new FormData();
    form.append('user_id', userId);
    try {
      if (Array.isArray(fonts)) fonts.filter(Boolean).forEach(f => form.append('font', f));
      if (Array.isArray(colors)) colors.filter(Boolean).forEach(c => form.append('color', c));
      if (caption_location) form.append('caption_location', typeof caption_location === 'string' ? caption_location : JSON.stringify(caption_location));
      const { logos = [], icons = [], voiceovers = [] } = files;
      logos.filter(Boolean).forEach(file => form.append('logos', file));
      icons.filter(Boolean).forEach(file => form.append('icons', file));
      voiceovers.filter(Boolean).forEach(file => form.append('voiceovers', file));
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

  const reset = useCallback(() => { setAssets(null); setError(''); setLoading(false); }, []);

  return { loading, error, assets, setAssets, uploadBrandAssets, getBrandAssets, reset };
}

