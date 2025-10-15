import React, { useEffect, useRef, useState } from 'react';
import useBrandAssets from '../../hooks/useBrandAssets';
import { useSelector } from 'react-redux';
import { selectToken } from '../../redux/slices/userSlice';
import { useNavigate } from 'react-router-dom';

const sections = [
  {
    title: 'Brand Identity',
    items: [
      { label: 'Logo', action: 'Scrape' },
      { label: 'Color Palette and Balance', action: 'Scrape' },
      { label: 'Typography', action: 'Scrape' },
      { label: 'Font Size', action: 'Scrape' },
      { label: 'Spacing', action: 'Scrape' },
      { label: 'Tagline', action: 'Scrape' },
    ],
  },
  {
    title: 'Tone and Voice',
    items: [
      { label: 'Communication Style and Pace', action: 'Questionnaire' },
      { label: 'Context', action: 'Scrape' },
      { label: 'Brand Personality', action: 'Questionnaire' },
      { label: 'Example Headlines', action: 'None' },
    ],
  },
  {
    title: 'Look and Feel',
    items: [
      { label: 'Aesthetic Consistency', action: 'Questionnaire' },
      { label: 'Imagery - Brand Images', action: 'Scrape (do not save)' },
      { label: 'Iconography', action: 'Questionnaire' },
      { label: 'Graphic Elements', action: 'Questionnaire' },
      { label: 'Templates', action: 'Upload / Default' },
    ],
  },
];

const ActionPill = ({ action }) => {
  const color = action.includes('Scrape')
    ? 'bg-blue-50 text-blue-700 border-blue-200'
    : action.includes('Questionnaire')
      ? 'bg-amber-50 text-amber-700 border-amber-200'
      : 'bg-gray-50 text-gray-700 border-gray-200';
  return (
    <span className={`text-xs px-2 py-1 border rounded-full ${color}`}>{action}</span>
  );
};

const OnboardingWizard = () => {
  const [step, setStep] = useState(1);
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [scrapeStatus, setScrapeStatus] = useState({}); // { key: 'idle'|'pending'|'done'|'error' }
  const { loading, error, analysis, setAnalysis, analyzeWebsite, uploadBrandAssets, uploadBrandFiles, updateBrandAssets, getBrandAssetsByUserId } = useBrandAssets();
  const reduxToken = useSelector(selectToken);
  const navigate = useNavigate();
  const [editable, setEditable] = useState(null);
  const [iconFiles, setIconFiles] = useState([]); // File[]
  const [brandImageFiles, setBrandImageFiles] = useState([]); // File[] (logos)
  const [templateFiles, setTemplateFiles] = useState([]); // File[] (templates)
  const iconInputRef = useRef(null);
  const brandImageInputRef = useRef(null);
  const templateInputRef = useRef(null);
  const [newColor, setNewColor] = useState('');
  const [newFont, setNewFont] = useState('');
  const [newLogoUrl, setNewLogoUrl] = useState('');
  const [newIconUrl, setNewIconUrl] = useState('');
  const [newTemplateUrl, setNewTemplateUrl] = useState('');
  const [saveStatus, setSaveStatus] = useState('idle'); // idle | saving | saved

  // Endpoint labels for sliders
  const getSliderEndpoints = (section, key, name) => {
    const n = String(name || '').toLowerCase();
    if (section === 'tone_and_voice' && key === 'communication_style_pace') {
      if (n.includes('tone')) return ['Friendly and energetic', 'Formal and professional'];
      if (n.includes('warm')) return ['Warm, personable', 'Reserved, impersonal'];
      if (n.includes('humor')) return ['Playful and witty', 'Serious and literal'];
      if (n.includes('pace')) return ['Slow and relaxed', 'Fast and high-energy'];
      if (n.includes('direct')) return ['Indirect, gentle', 'Direct, blunt'];
      return ['Less', 'More'];
    }
    if (section === 'tone_and_voice' && key === 'brand_personality') {
      if (n.includes('visual')) return ['Subtle and refined', 'Bold and striking'];
      if (n.includes('risk')) return ['Trustworthy and dependable', 'Adventurous and daring'];
      if (n.includes('emotional')) return ['Cheerful and friendly', 'Moody and reserved'];
      if (n.includes('accessibility')) return ['Accessible and friendly', 'Exclusive and luxurious'];
      if (n.includes('sociability')) return ['Community-oriented, inclusive', 'Independent, elite'];
      return ['Less', 'More'];
    }
    if (section === 'look_and_feel' && key === 'aesthetic_consistency') {
      if (n.includes('era')) return ['Modern and sleek', 'Classic and timeless'];
      if (n.includes('texture')) return ['Minimal, flat, matte', 'Textured, tactile, rich finishes'];
      if (n.includes('color')) return ['High-contrast, bold color blocking', 'Muted, tonal, restrained palettes'];
      if (n.includes('visual')) return ['Clean, airy, lots of white space', 'Busy, layered, richly detailed'];
      return ['Less', 'More'];
    }
    if (section === 'look_and_feel' && key === 'iconography') {
      if (n.includes('detail')) return ['Simple and symbolic', 'Detailed and artistic'];
      if (n.includes('realism')) return ['Abstract / geometric icons', 'Literal / illustrative icons'];
      if (n.includes('line')) return ['Thin, delicate line work', 'Thick, bold strokes'];
      if (n.includes('consistency')) return ['Highly consistent, uniform icon set', 'Eclectic, varied iconography with character'];
      return ['Less', 'More'];
    }
    if (section === 'look_and_feel' && key === 'graphic_elements') {
      if (n.includes('primary')) return ['Geometric shapes', 'Organic, flowing lines'];
      if (n.includes('pattern')) return ['Repetitive, structured patterns', 'Irregular, hand-crafted patterns'];
      if (n.includes('motion')) return ['Static, stable compositions', 'Dynamic, motion-oriented forms'];
      if (n.includes('edge')) return ['Sharp, angular edges', 'Soft, rounded, blobby edges'];
      return ['Less', 'More'];
    }
    return ['Less', 'More'];
  };

  const normalizeUrl = (u) => {
    if (!u) return '';
    try {
      return new URL(u.startsWith('http') ? u : `https://${u}`).toString();
    } catch (_) {
      return '';
    }
  };

  const handleContinue = async () => {
    const nu = normalizeUrl(websiteUrl);
    if (!nu) {
      alert('Please enter a valid website URL');
      return;
    }
    setWebsiteUrl(nu);
    // Use localStorage token as user_id
    const userId = reduxToken || (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
    if (!userId) {
      alert('Missing user session. Please log in again.');
      return;
    }
    try {
      await analyzeWebsite({ userId, website: nu });
      try { localStorage.setItem(`last_analyzed_website:${userId}`, nu); } catch (_) {}
      setStep(2);
    } catch (_) {
      // Error state is handled by hook; keep user on step 1
    }
  };

  const handleScrape = async (key) => {
    // Placeholder scrape: simulate async scrape without saving any user files
    setScrapeStatus((s) => ({ ...s, [key]: 'pending' }));
    try {
      await new Promise((res) => setTimeout(res, 1000));
      setScrapeStatus((s) => ({ ...s, [key]: 'done' }));
    } catch (e) {
      setScrapeStatus((s) => ({ ...s, [key]: 'error' }));
    }
  };

  // Load existing analysis and website to allow Back/Next navigation when already analyzed
  useEffect(() => {
    try {
      const userId = reduxToken || (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
      if (!userId) return;
      const saved = localStorage.getItem(`brand_assets_analysis:${userId}`);
      const savedUrl = localStorage.getItem(`last_analyzed_website:${userId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed && typeof parsed === 'object') {
          setAnalysis(parsed);
          if (savedUrl) setWebsiteUrl(savedUrl);
          setStep(2);
        }
      }
    } catch (_) { /* noop */ }
  }, [setAnalysis, reduxToken]);

  const onBack = () => {
    if (step > 1) setStep(step - 1);
  };
  const onNext = () => {
    if (step === 1) {
      handleContinue();
    } else if (step === 2) {
      navigate('/');
    }
  };

  const handleSave = async () => {
    try {
      setSaveStatus('saving');
      // Persist locally (already synced in effect, but force-save now)
      if (editable) {
        const userId = reduxToken || (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
        // Build payload for update API according to rules
        const chooseLabel = (section, key, name, pct) => {
          const [left, right] = getSliderEndpoints(section, key, name);
          return (Number(pct) > 50) ? right : left;
        };
        const mapMetrics = (section, key) =>
          (editable?.[section]?.[key] || []).map(m => ({
            name: m?.name,
            label: chooseLabel(section, key, m?.name || m?.label, m?.percentage),
            percentage: Number(m?.percentage) || 0
          }));
        const payload = {
          brand_identity: {
            fonts: editable?.brand_identity?.fonts || [],
            icon: editable?.brand_identity?.icon || editable?.brand_identity?.icons || [],
            colors: editable?.brand_identity?.colors || [],
            spacing: editable?.brand_identity?.spacing,
            tagline: editable?.brand_identity?.tagline,
            logo: editable?.brand_identity?.logo || []
          },
          tone_and_voice: {
            context: editable?.tone_and_voice?.context || '',
            brand_personality: mapMetrics('tone_and_voice','brand_personality'),
            communication_style_pace: mapMetrics('tone_and_voice','communication_style_pace')
          },
          look_and_feel: {
            iconography: mapMetrics('look_and_feel','iconography'),
            graphic_elements: mapMetrics('look_and_feel','graphic_elements'),
            aesthetic_consistency: mapMetrics('look_and_feel','aesthetic_consistency')
          },
          template: editable?.template || editable?.templates || [],
          voiceover: editable?.voiceover || []
        };
        await updateBrandAssets({ userId, payload });
        // Fetch latest canonical data from GET /v1/users/brand-assets/{user_id}
        const latest = await getBrandAssetsByUserId(userId);
        const applied = latest || payload;
        setAnalysis(applied);
        try { localStorage.setItem(`brand_assets_analysis:${userId}`, JSON.stringify(applied)); } catch (_) {}
        try { setEditable(JSON.parse(JSON.stringify(applied))); } catch (_) { setEditable(applied); }
      }
      // Optionally: extend here to POST/PATCH to backend if endpoint is available
      setTimeout(() => setSaveStatus('saved'), 300);
      setTimeout(() => setSaveStatus('idle'), 2000);
    } catch (_) {
      setSaveStatus('idle');
      alert('Failed to save changes');
    }
  };

  // Keep a local editable copy of analysis for sliders
  useEffect(() => {
    try {
      if (analysis) {
        // Deep clone to avoid mutating original object
        setEditable(JSON.parse(JSON.stringify(analysis)));
      }
    } catch (_) {
      setEditable(analysis || null);
    }
  }, [analysis]);

  // Normalize keys from backend: support legacy plural keys
  useEffect(() => {
    if (!editable) return;
    let changed = false;
    const next = { ...editable };
    // template vs templates
    if ((!next.template || next.template.length === 0) && Array.isArray(next.templates) && next.templates.length > 0) {
      next.template = next.templates.slice();
      changed = true;
    }
    // icon vs icons inside brand_identity
    if (next.brand_identity) {
      const bi = { ...next.brand_identity };
      if ((!bi.icon || bi.icon.length === 0) && Array.isArray(bi.icons) && bi.icons.length > 0) {
        bi.icon = bi.icons.slice();
        next.brand_identity = bi;
        changed = true;
      }
    }
    if (changed) setEditable(next);
  }, [editable]);

  // Persist editable to localStorage when it changes (avoid feeding back into analysis to prevent loops)
  useEffect(() => {
    if (!editable) return;
    try {
      const userId = reduxToken || (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
      if (userId) localStorage.setItem(`brand_assets_analysis:${userId}`, JSON.stringify(editable));
    } catch (_) {}
  }, [editable, reduxToken]);

  const updatePercentage = (section, key, idx, value) => {
    setEditable(prev => {
      if (!prev) return prev;
      const next = { ...prev, [section]: { ...(prev[section] || {}) } };
      const arr = Array.isArray(next[section][key]) ? [...next[section][key]] : [];
      const item = { ...(arr[idx] || {}) };
      item.percentage = Math.max(0, Math.min(100, Number(value) || 0));
      arr[idx] = item;
      next[section][key] = arr;
      return next;
    });
  };

  // Generic helpers to modify list fields inside editable state
  const addToArray = (path, value) => {
    if (!value) return;
    setEditable(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}));
      // path like ['brand_identity','colors']
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) {
        const k = path[i];
        obj[k] = obj[k] || {};
        obj = obj[k];
      }
      const leaf = path[path.length - 1];
      obj[leaf] = Array.isArray(obj[leaf]) ? obj[leaf] : [];
      if (!obj[leaf].includes(value)) obj[leaf].push(value);
      return next;
    });
  };
  const removeFromArray = (path, valueOrIndex) => {
    setEditable(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}));
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) {
        const k = path[i];
        obj[k] = obj[k] || {};
        obj = obj[k];
      }
      const leaf = path[path.length - 1];
      const arr = Array.isArray(obj[leaf]) ? obj[leaf] : [];
      if (typeof valueOrIndex === 'number') arr.splice(valueOrIndex, 1);
      else obj[leaf] = arr.filter(v => v !== valueOrIndex);
      obj[leaf] = [...arr];
      return next;
    });
  };
  const setField = (path, value) => {
    setEditable(prev => {
      const next = JSON.parse(JSON.stringify(prev || {}));
      let obj = next;
      for (let i = 0; i < path.length - 1; i++) {
        const k = path[i];
        obj[k] = obj[k] || {};
        obj = obj[k];
      }
      obj[path[path.length - 1]] = value;
      return next;
    });
  };

  const onPickIcons = (e) => {
    const files = Array.from(e.target.files || []);
    setIconFiles(files);
  };
  const onPickBrandImages = (e) => {
    const files = Array.from(e.target.files || []);
    setBrandImageFiles(files);
  };
  const onPickTemplates = (e) => {
    const files = Array.from(e.target.files || []);
    setTemplateFiles(files);
  };

  const handleUploadIcons = async () => {
    const userId = reduxToken || (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
    if (!userId) return alert('Missing user session. Please log in again.');
    if (!iconFiles.length) return;
    try {
      const urls = await uploadBrandFiles({ userId, fileType: 'icon', files: iconFiles });
      // 1) GET full brand assets
      const latest = await getBrandAssetsByUserId(userId);
      const current = latest || editable || {};
      const bi = current?.brand_identity || {};
      const tv = current?.tone_and_voice || {};
      const lf = current?.look_and_feel || {};
      const nextIcons = Array.from(new Set([...(bi.icon || bi.icons || []), ...urls]));
      // 2) UPDATE with full payload merging new icons
      await updateBrandAssets({
        userId,
        payload: {
          brand_identity: { fonts: bi.fonts || [], icon: nextIcons, colors: bi.colors || [], spacing: bi.spacing, tagline: bi.tagline, logo: bi.logo || [] },
          tone_and_voice: tv,
          look_and_feel: lf,
          template: current?.template || current?.templates || [],
          voiceover: current?.voiceover || []
        }
      });
      // 3) GET again to reflect canonical
      const after = await getBrandAssetsByUserId(userId);
      try { setEditable(JSON.parse(JSON.stringify(after || current))); } catch (_) { setEditable(after || current); }
      alert('Icons uploaded');
      setIconFiles([]);
      if (iconInputRef.current) iconInputRef.current.value = '';
    } catch (e) {
      alert('Failed to upload icons');
    }
  };

  const handleUploadBrandImages = async () => {
    const userId = reduxToken || (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
    if (!userId) return alert('Missing user session. Please log in again.');
    if (!brandImageFiles.length) return;
    try {
      const urls = await uploadBrandFiles({ userId, fileType: 'logo', files: brandImageFiles });
      const latest = await getBrandAssetsByUserId(userId);
      const current = latest || editable || {};
      const bi = current?.brand_identity || {};
      const tv = current?.tone_and_voice || {};
      const lf = current?.look_and_feel || {};
      const nextLogos = Array.from(new Set([...(bi.logo || []), ...urls]));
      await updateBrandAssets({
        userId,
        payload: {
          brand_identity: { fonts: bi.fonts || [], icon: (bi.icon || bi.icons || []), colors: bi.colors || [], spacing: bi.spacing, tagline: bi.tagline, logo: nextLogos },
          tone_and_voice: tv,
          look_and_feel: lf,
          template: current?.template || current?.templates || [],
          voiceover: current?.voiceover || []
        }
      });
      const after = await getBrandAssetsByUserId(userId);
      try { setEditable(JSON.parse(JSON.stringify(after || current))); } catch (_) { setEditable(after || current); }
      alert('Brand images uploaded');
      setBrandImageFiles([]);
      if (brandImageInputRef.current) brandImageInputRef.current.value = '';
    } catch (e) {
      alert('Failed to upload brand images');
    }
  };

  const handleUploadTemplates = async () => {
    const userId = reduxToken || (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
    if (!userId) return alert('Missing user session. Please log in again.');
    if (!templateFiles.length) return;
    try {
      const urls = await uploadBrandFiles({ userId, fileType: 'template', files: templateFiles });
      const latest = await getBrandAssetsByUserId(userId);
      const current = latest || editable || {};
      const bi = current?.brand_identity || {};
      const tv = current?.tone_and_voice || {};
      const lf = current?.look_and_feel || {};
      const nextTemplates = Array.from(new Set([...(current?.template || current?.templates || []), ...urls]));
      await updateBrandAssets({
        userId,
        payload: {
          brand_identity: { fonts: bi.fonts || [], icon: (bi.icon || bi.icons || []), colors: bi.colors || [], spacing: bi.spacing, tagline: bi.tagline, logo: bi.logo || [] },
          tone_and_voice: tv,
          look_and_feel: lf,
          template: nextTemplates,
          voiceover: current?.voiceover || []
        }
      });
      const after = await getBrandAssetsByUserId(userId);
      try { setEditable(JSON.parse(JSON.stringify(after || current))); } catch (_) { setEditable(after || current); }
      alert('Templates uploaded');
      setTemplateFiles([]);
      if (templateInputRef.current) templateInputRef.current.value = '';
    } catch (e) {
      alert('Failed to upload templates');
    }
  };

  if (step === 1) {
    return (
      <div className='w-full max-w-3xl bg-white rounded-2xl p-6 border border-[#ccc] space-y-6'>
        <div className='flex items-center justify-between'>
          <button
            onClick={onBack}
            disabled={step === 1}
            className={`px-4 py-2 rounded-lg border ${step === 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-gray-50'}`}
          >
            Back
          </button>
          <div className='text-sm text-gray-600'>Step {step} of 2</div>
          <button
            onClick={onNext}
            disabled={loading}
            className={`px-4 py-2 rounded-lg text-white ${loading ? 'bg-[#9aa0d0] cursor-not-allowed' : 'bg-[#13008B] hover:bg-[#0f0066]'}`}
          >
            {loading ? 'Analyzing…' : 'Next'}
          </button>
        </div>
        <h2 className='text-xl font-semibold mb-2'>Let’s start with your website</h2>
        <p className='text-gray-600 mb-6'>We’ll use this to discover your brand identity and content.</p>
        <div className='flex gap-3'>
          <input
            type='text'
            placeholder='e.g. https://example.com'
            value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)}
            className='flex-1 px-4 py-3 border rounded-lg bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500'
          />
          <button
            onClick={handleContinue}
            disabled={loading}
            className={`px-5 py-3 text-white rounded-lg ${loading ? 'bg-[#9aa0d0] cursor-not-allowed' : 'bg-[#13008B] hover:bg-[#0f0066]'}`}
          >
            Analyze
          </button>
        </div>
        {websiteUrl && (
          <p className='text-xs text-gray-500 mt-2'>Using: {normalizeUrl(websiteUrl) || websiteUrl}</p>
        )}
        {error && (
          <p className='text-xs text-red-600 mt-2'>Failed to analyze: {error}</p>
        )}
      </div>
    );
  }

  return (
    <div className='w-full max-w-5xl mx-auto grid grid-cols-1 gap-6'>
      <div className='bg-white rounded-2xl p-6 border border-[#ccc] space-y-5'>
        <div className='flex items-center justify-between'>
          <button
            onClick={onBack}
            className='px-4 py-2 rounded-lg border hover:bg-gray-50'
          >
            Back
          </button>
          <div className='text-sm text-gray-600'>Step {step} of 2</div>
          <button
            onClick={handleSave}
            className={`px-4 py-2 rounded-lg border ${saveStatus==='saving' ? 'opacity-60 cursor-wait' : 'hover:bg-gray-50'}`}
            disabled={saveStatus==='saving'}
          >
            {saveStatus==='saving' ? 'Saving…' : saveStatus==='saved' ? 'Saved' : 'Save'}
          </button>
        </div>
        <div className='flex justify-end'>
          <button onClick={onNext} className='px-4 py-2 rounded-lg text-white bg-[#13008B] hover:bg-[#0f0066]'>Next</button>
        </div>
        <div className='mb-3'>
          <h3 className='text-lg font-semibold'>Brand Assets Checklist</h3>
          <p className='text-xs text-gray-500'>Source: {websiteUrl}</p>
        </div>
        {editable && (
          <div className='mb-4 p-3 border rounded-lg bg-gray-50 space-y-4'>
            <div>
              <div className='text-sm font-semibold mb-2'>Brand Identity</div>
              <div className='space-y-3'>
                <div className='flex flex-col gap-2'>
                  <span className='text-xs text-gray-600'>Logos</span>
                  <div className='flex flex-wrap gap-2'>
                    {(editable?.brand_identity?.logo || []).map((url) => (
                      <img key={url} src={url} alt='logo' className='w-16 h-16 object-contain bg-white rounded border' />
                    ))}
                    {(!editable?.brand_identity?.logo || editable?.brand_identity?.logo.length === 0) && (
                      <span className='text-xs text-gray-400'>No logos found</span>
                    )}
                  </div>
                  <div className='mt-2 flex flex-col gap-2'>
                    <div className='text-xs text-gray-600'>Upload Logos</div>
                    <input ref={brandImageInputRef} type='file' accept='image/*' multiple onChange={onPickBrandImages} className='block w-full text-sm' />
                    {brandImageFiles.length > 0 && (
                      <div className='flex flex-wrap gap-2'>
                        {brandImageFiles.map((f, i) => (
                          <div key={`${f.name}-${i}`} className='w-16 h-16 rounded border bg-gray-50 flex items-center justify-center text-[10px] text-gray-600 overflow-hidden'>
                            <img src={URL.createObjectURL(f)} alt={f.name} className='w-full h-full object-cover' />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className='flex justify-end'>
                      <button onClick={handleUploadBrandImages} className='px-3 py-1.5 bg-[#13008B] text-white rounded hover:bg-[#0f0066] disabled:opacity-60' disabled={!brandImageFiles.length}>Upload Logos</button>
                    </div>
                  </div>
                </div>
                <div className='flex flex-col gap-2'>
                  <span className='text-xs text-gray-600'>Colors</span>
                  <div className='flex flex-wrap items-center gap-2'>
                    {(editable?.brand_identity?.colors || []).map((c, idx) => (
                      <button key={c+idx} title={c} onClick={() => removeFromArray(['brand_identity','colors'], c)} className='relative w-7 h-7 rounded-full border overflow-hidden'>
                        <span className='absolute -top-1 -right-1 text-[10px] bg-white rounded'>✕</span>
                        <div className='w-full h-full' style={{ backgroundColor: c }} />
                      </button>
                    ))}
                    {(!editable?.brand_identity?.colors || editable?.brand_identity?.colors.length === 0) && (
                      <span className='text-xs text-gray-400'>No colors found</span>
                    )}
                    <input value={newColor} onChange={(e)=>setNewColor(e.target.value)} placeholder='#RRGGBB' className='px-2 py-1 border rounded text-xs w-28' />
                    <button onClick={()=>{ addToArray(['brand_identity','colors'], newColor); setNewColor(''); }} className='text-xs px-2 py-1 border rounded hover:bg-gray-50'>Add</button>
                  </div>
                </div>
                <div className='flex flex-col gap-1'>
                  <span className='text-xs text-gray-600'>Fonts</span>
                  <div className='flex flex-wrap items-center gap-2'>
                    {(editable?.brand_identity?.fonts || []).map((f, idx) => (
                      <span key={f+idx} className='text-xs px-2 py-1 rounded-full border bg-white flex items-center gap-1'>
                        {f}
                        <button onClick={()=>removeFromArray(['brand_identity','fonts'], f)} className='text-gray-500 hover:text-red-600'>✕</button>
                      </span>
                    ))}
                    {(!editable?.brand_identity?.fonts || editable?.brand_identity?.fonts.length === 0) && (
                      <span className='text-xs text-gray-400'>No fonts found</span>
                    )}
                    <input value={newFont} onChange={(e)=>setNewFont(e.target.value)} placeholder='e.g. Montserrat' className='px-2 py-1 border rounded text-xs' />
                    <button onClick={()=>{ addToArray(['brand_identity','fonts'], newFont); setNewFont(''); }} className='text-xs px-2 py-1 border rounded hover:bg-gray-50'>Add</button>
                  </div>
                </div>
                <div className='grid grid-cols-2 gap-3'>
                  <div>
                    <div className='text-xs text-gray-600'>Spacing</div>
                    <input
                      type='number'
                      min={0}
                      value={editable?.brand_identity?.spacing ?? ''}
                      onChange={(e)=>setField(['brand_identity','spacing'], e.target.value)}
                      className='text-sm px-2 py-1 border rounded w-24'
                    />
                  </div>
                  <div>
                    <div className='text-xs text-gray-600'>Tagline</div>
                    <input
                      type='text'
                      value={editable?.brand_identity?.tagline || ''}
                      onChange={(e)=>setField(['brand_identity','tagline'], e.target.value)}
                      placeholder='Enter tagline'
                      className='text-sm px-2 py-1 border rounded w-full'
                    />
                  </div>
                </div>
                <div className='flex flex-col gap-1'>
                  <span className='text-xs text-gray-600'>Icons</span>
                  <div className='flex flex-wrap gap-2'>
                    {(editable?.brand_identity?.icons || []).map((url, idx) => (
                      <div key={url+idx} className='relative'>
                        <img src={url} alt='icon' className='w-10 h-10 object-contain bg-white rounded border' />
                        <button onClick={()=>removeFromArray(['brand_identity','icon'], url)} className='absolute -top-2 -right-2 text-[10px] bg-white rounded border px-1'>✕</button>
                      </div>
                    ))}
                    <input value={newIconUrl} onChange={(e)=>setNewIconUrl(e.target.value)} placeholder='Icon URL' className='px-2 py-1 border rounded text-xs w-40' />
                    <button onClick={()=>{ addToArray(['brand_identity','icon'], newIconUrl); setNewIconUrl(''); }} className='text-xs px-2 py-1 border rounded hover:bg-gray-50'>Add</button>
                    {(!editable?.brand_identity?.icons || editable?.brand_identity?.icons.length === 0) && (
                      <span className='text-xs text-gray-400'>No icons found</span>
                    )}
                  </div>
                  <div className='mt-2 flex flex-col gap-2'>
                    <div className='text-xs text-gray-600'>Upload Icons</div>
                    <input ref={iconInputRef} type='file' accept='image/*' multiple onChange={onPickIcons} className='block w-full text-sm' />
                    {iconFiles.length > 0 && (
                      <div className='flex flex-wrap gap-2'>
                        {iconFiles.map((f, i) => (
                          <div key={`${f.name}-${i}`} className='w-14 h-14 rounded border bg-gray-50 flex items-center justify-center text-[10px] text-gray-600 overflow-hidden'>
                            <img src={URL.createObjectURL(f)} alt={f.name} className='w-full h-full object-cover' />
                          </div>
                        ))}
                      </div>
                    )}
                    <div className='flex justify-end'>
                      <button onClick={handleUploadIcons} className='px-3 py-1.5 bg-[#13008B] text-white rounded hover:bg-[#0f0066] disabled:opacity-60' disabled={!iconFiles.length}>Upload Icons</button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className='text-sm font-semibold mb-2'>Tone and Voice</div>
              <div className='space-y-3'>
                <div>
                  <div className='text-xs text-gray-600 mb-2'>Communication Style & Pace</div>
                  <div className='space-y-3'>
                    {(editable?.tone_and_voice?.communication_style_pace || []).map((m, idx) => {
                      const [left, right] = getSliderEndpoints('tone_and_voice','communication_style_pace', m?.name || m?.label);
                      return (
                        <div key={`${m?.name}-${idx}`} className='bg-white border rounded p-2'>
                          <div className='flex items-center justify-end mb-1'>
                            <span className='text-xs text-gray-600'>{m?.percentage}%</span>
                          </div>
                          <div className='flex items-center gap-3'>
                            <span className='text-[10px] text-gray-600 w-32'>{left}</span>
                            <input
                              type='range'
                              min={0}
                              max={100}
                              value={Number(m?.percentage) || 0}
                              onChange={(e) => updatePercentage('tone_and_voice', 'communication_style_pace', idx, e.target.value)}
                              onInput={(e) => updatePercentage('tone_and_voice', 'communication_style_pace', idx, e.target.value)}
                              className='flex-1'
                              style={{ pointerEvents: 'auto' }}
                              step={1}
                            />
                            <span className='text-[10px] text-gray-600 w-32 text-right'>{right}</span>
                          </div>
                        </div>
                      );
                    })}
                    {(!editable?.tone_and_voice?.communication_style_pace || editable?.tone_and_voice?.communication_style_pace.length === 0) && (
                      <span className='text-xs text-gray-400'>No data</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className='text-xs text-gray-600 mb-1'>Context</div>
                  <textarea
                    value={editable?.tone_and_voice?.context || ''}
                    onChange={(e)=>setField(['tone_and_voice','context'], e.target.value)}
                    rows={3}
                    className='text-sm bg-white border rounded p-2 w-full'
                    placeholder='Enter context'
                  />
                </div>
                <div>
                  <div className='text-xs text-gray-600 mb-2'>Brand Personality</div>
                  <div className='space-y-3'>
                    {(editable?.tone_and_voice?.brand_personality || []).map((m, idx) => {
                      const [left, right] = getSliderEndpoints('tone_and_voice','brand_personality', m?.name || m?.label);
                      return (
                        <div key={`${m?.name}-${idx}`} className='bg-white border rounded p-2'>
                          <div className='flex items-center justify-end mb-1'>
                            <span className='text-xs text-gray-600'>{m?.percentage}%</span>
                          </div>
                          <div className='flex items-center gap-3'>
                            <span className='text-[10px] text-gray-600 w-32'>{left}</span>
                            <input
                              type='range'
                              min={0}
                              max={100}
                              value={Number(m?.percentage) || 0}
                              onChange={(e) => updatePercentage('tone_and_voice', 'brand_personality', idx, e.target.value)}
                              onInput={(e) => updatePercentage('tone_and_voice', 'brand_personality', idx, e.target.value)}
                              className='flex-1'
                              style={{ pointerEvents: 'auto' }}
                              step={1}
                            />
                            <span className='text-[10px] text-gray-600 w-32 text-right'>{right}</span>
                          </div>
                        </div>
                      );
                    })}
                    {(!editable?.tone_and_voice?.brand_personality || editable?.tone_and_voice?.brand_personality.length === 0) && (
                      <span className='text-xs text-gray-400'>No data</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className='text-sm font-semibold mb-2'>Look and Feel</div>
              <div className='space-y-3'>
                <div>
                  <div className='text-xs text-gray-600 mb-2'>Aesthetic Consistency</div>
                  <div className='space-y-3'>
                    {(editable?.look_and_feel?.aesthetic_consistency || []).map((m, idx) => {
                      const [left, right] = getSliderEndpoints('look_and_feel','aesthetic_consistency', m?.name || m?.label);
                      return (
                        <div key={`${m?.name}-${idx}`} className='bg-white border rounded p-2'>
                          <div className='flex items-center justify-end mb-1'>
                            <span className='text-xs text-gray-600'>{m?.percentage}%</span>
                          </div>
                          <div className='flex items-center gap-3'>
                            <span className='text-[10px] text-gray-600 w-32'>{left}</span>
                            <input
                              type='range'
                              min={0}
                              max={100}
                              value={Number(m?.percentage) || 0}
                              onChange={(e) => updatePercentage('look_and_feel', 'aesthetic_consistency', idx, e.target.value)}
                              onInput={(e) => updatePercentage('look_and_feel', 'aesthetic_consistency', idx, e.target.value)}
                              className='flex-1'
                              style={{ pointerEvents: 'auto' }}
                              step={1}
                            />
                            <span className='text-[10px] text-gray-600 w-32 text-right'>{right}</span>
                          </div>
                        </div>
                      );
                    })}
                    {(!editable?.look_and_feel?.aesthetic_consistency || editable?.look_and_feel?.aesthetic_consistency.length === 0) && (
                      <span className='text-xs text-gray-400'>No data</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className='text-xs text-gray-600 mb-2'>Iconography</div>
                  <div className='space-y-3'>
                    {(editable?.look_and_feel?.iconography || []).map((m, idx) => {
                      const [left, right] = getSliderEndpoints('look_and_feel','iconography', m?.name || m?.label);
                      return (
                        <div key={`${m?.name}-${idx}`} className='bg-white border rounded p-2'>
                          <div className='flex items-center justify-end mb-1'>
                            <span className='text-xs text-gray-600'>{m?.percentage}%</span>
                          </div>
                          <div className='flex items-center gap-3'>
                            <span className='text-[10px] text-gray-600 w-32'>{left}</span>
                            <input
                              type='range'
                              min={0}
                              max={100}
                              value={Number(m?.percentage) || 0}
                              onChange={(e) => updatePercentage('look_and_feel', 'iconography', idx, e.target.value)}
                              onInput={(e) => updatePercentage('look_and_feel', 'iconography', idx, e.target.value)}
                              className='flex-1'
                              style={{ pointerEvents: 'auto' }}
                              step={1}
                            />
                            <span className='text-[10px] text-gray-600 w-32 text-right'>{right}</span>
                          </div>
                        </div>
                      );
                    })}
                    {(!editable?.look_and_feel?.iconography || editable?.look_and_feel?.iconography.length === 0) && (
                      <span className='text-xs text-gray-400'>No data</span>
                    )}
                  </div>
                </div>
                <div>
                  <div className='text-xs text-gray-600 mb-2'>Graphic Elements</div>
                  <div className='space-y-3'>
                    {(editable?.look_and_feel?.graphic_elements || []).map((m, idx) => {
                      const [left, right] = getSliderEndpoints('look_and_feel','graphic_elements', m?.name || m?.label);
                      return (
                        <div key={`${m?.name}-${idx}`} className='bg-white border rounded p-2'>
                          <div className='flex items-center justify-end mb-1'>
                            <span className='text-xs text-gray-600'>{m?.percentage}%</span>
                          </div>
                          <div className='flex items-center gap-3'>
                            <span className='text-[10px] text-gray-600 w-32'>{left}</span>
                            <input
                              type='range'
                              min={0}
                              max={100}
                              value={Number(m?.percentage) || 0}
                              onChange={(e) => updatePercentage('look_and_feel', 'graphic_elements', idx, e.target.value)}
                              onInput={(e) => updatePercentage('look_and_feel', 'graphic_elements', idx, e.target.value)}
                              className='flex-1'
                              style={{ pointerEvents: 'auto' }}
                              step={1}
                            />
                            <span className='text-[10px] text-gray-600 w-32 text-right'>{right}</span>
                          </div>
                        </div>
                      );
                    })}
                    {(!editable?.look_and_feel?.graphic_elements || editable?.look_and_feel?.graphic_elements.length === 0) && (
                      <span className='text-xs text-gray-400'>No data</span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <div className='text-sm font-semibold mb-2'>Templates</div>
              <div className='flex items-center gap-2 mb-2'>
                <input value={newTemplateUrl} onChange={(e)=>setNewTemplateUrl(e.target.value)} placeholder='Template image URL' className='px-2 py-1 border rounded text-xs flex-1' />
                <button onClick={()=>{ addToArray(['template'], newTemplateUrl); setNewTemplateUrl(''); }} className='text-xs px-2 py-1 border rounded hover:bg-gray-50'>Add</button>
              </div>
              <div className='flex flex-col gap-2 mb-2'>
                <div className='text-xs text-gray-600'>Upload Template Images</div>
                <input ref={templateInputRef} type='file' accept='image/*' multiple onChange={onPickTemplates} className='block w-full text-sm' />
                {templateFiles.length > 0 && (
                  <div className='flex flex-wrap gap-2'>
                    {templateFiles.map((f, i) => (
                      <div key={`${f.name}-${i}`} className='w-20 h-20 rounded border bg-gray-50 flex items-center justify-center text-[10px] text-gray-600 overflow-hidden'>
                        <img src={URL.createObjectURL(f)} alt={f.name} className='w-full h-full object-cover' />
                      </div>
                    ))}
                  </div>
                )}
                <div className='flex justify-end'>
                  <button onClick={handleUploadTemplates} className='px-3 py-1.5 bg-[#13008B] text-white rounded hover:bg-[#0f0066] disabled:opacity-60' disabled={!templateFiles.length}>Upload Templates</button>
                </div>
              </div>
              <div className='grid grid-cols-3 sm:grid-cols-4 gap-2'>
                {(editable?.template || editable?.templates || []).map((t, idx) => (
                  <div key={t+idx} className='relative'>
                    <img src={t} alt='template' className='w-full h-20 object-cover rounded border bg-white' />
                    <button onClick={()=>removeFromArray(['template'], t)} className='absolute -top-2 -right-2 text-[10px] bg-white rounded border px-1'>✕</button>
                  </div>
                ))}
                {(!(editable?.template && editable?.template.length) && !(editable?.templates && editable?.templates.length)) && (
                  <span className='text-xs text-gray-400'>No templates found</span>
                )}
              </div>
            </div>

          </div>
        )}
    
      </div>

      {/* Removed bottom upload sections; uploads are now inline within sections */}
    </div>
  );
};

export default OnboardingWizard;
