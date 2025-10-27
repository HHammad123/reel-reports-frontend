import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import useBrandAssets from '../../hooks/useBrandAssets'

const Brandimages = () => {
  const fileInputRef = useRef(null)
  const { getBrandProfiles, getBrandProfileById, activateBrandProfile, getBrandAssetsByUserId, uploadBrandFiles, updateBrandAssets, updateBrandProfile, analyzeWebsite, createBrandProfile } = useBrandAssets()
  const [logos, setLogos] = useState([])
  const [icons, setIcons] = useState([])
  const [fonts, setFonts] = useState([])
  const [colors, setColors] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [targetType, setTargetType] = useState('logos') // 'logos' | 'icons'
  const [selectedFiles, setSelectedFiles] = useState([])
  const [previewUrls, setPreviewUrls] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  // Fonts modal state
  const [isFontsModalOpen, setIsFontsModalOpen] = useState(false)
  const [workingFonts, setWorkingFonts] = useState([])
  const [newFont, setNewFont] = useState('')
  const availableFonts = [
    'Arial','Helvetica','Times New Roman','Georgia','Verdana','Roboto','Open Sans','Lato','Montserrat','Poppins','Inter','Nunito','Source Sans Pro','Merriweather'
  ]
  const [selectedFontOption, setSelectedFontOption] = useState(availableFonts[0])
  const [isSavingFonts, setIsSavingFonts] = useState(false)
  const [fontsError, setFontsError] = useState('')
  // Colors modal state
  const [isColorsModalOpen, setIsColorsModalOpen] = useState(false)
  const [workingColors, setWorkingColors] = useState([])
  const [newColor, setNewColor] = useState('#4f46e5')
  const [isSavingColors, setIsSavingColors] = useState(false)
  const [colorsError, setColorsError] = useState('')
  // Website analyze modal
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [websiteError, setWebsiteError] = useState('')
  const [profileName, setProfileName] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  // Profiles and selected profile
  const [profiles, setProfiles] = useState([])
  const [selectedProfileId, setSelectedProfileId] = useState('')
  const [selectedIsActive, setSelectedIsActive] = useState(false)
  // Using canonical brand-assets by user (analysis object)
  const [tagline, setTagline] = useState('')
  const [spacing, setSpacing] = useState('')
  const [captionLocation, setCaptionLocation] = useState('')
  const [toneVoice, setToneVoice] = useState({ context: '', brand_personality: [], communication_style_pace: [] })
  const [lookFeel, setLookFeel] = useState({ iconography: [], graphic_elements: [], aesthetic_consistency: [] })
  const [templates, setTemplates] = useState([])
  const [voiceovers, setVoiceovers] = useState([])
  // Edit modals for Tone & Voice and Look & Feel
  const [isToneModalOpen, setIsToneModalOpen] = useState(false)
  const [isLookModalOpen, setIsLookModalOpen] = useState(false)
  const [workingTone, setWorkingTone] = useState({ context: '', brand_personality: [], communication_style_pace: [] })
  const [workingLook, setWorkingLook] = useState({ iconography: [], graphic_elements: [], aesthetic_consistency: [] })

  useEffect(() => {
    const userId = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : ''
    if (!userId) return
    ;(async () => {
      try {
        // 1) Load profiles and order with active first
        const plist = await getBrandProfiles(userId)
        plist.sort((a,b) => (b?.is_active?1:0) - (a?.is_active?1:0))
        setProfiles(plist)
        const initial = (plist[0]?.profile_id || plist[0]?.id || '')
        if (initial) {
          setSelectedProfileId(initial)
          setSelectedIsActive(!!plist[0]?.is_active)
          // 2) Load selected profile details
          const detail = await getBrandProfileById({ userId, profileId: initial })
          const a = detail || {}
          const bi = a.brand_identity || {}
          setTagline(bi.tagline || '')
          setSpacing(bi.spacing || '')
          setCaptionLocation(a?.caption_location || a?.brand_identity?.caption_location || '')
          setLogos(bi.logo || [])
          setIcons(bi.icon || bi.icons || [])
          setFonts(bi.fonts || [])
          setColors(bi.colors || [])
          const tv = a.tone_and_voice || {}
          setToneVoice({
            context: tv.context || '',
            brand_personality: Array.isArray(tv.brand_personality) ? tv.brand_personality : [],
            communication_style_pace: Array.isArray(tv.communication_style_pace) ? tv.communication_style_pace : []
          })
          const lf = a.look_and_feel || {}
          setLookFeel({
            iconography: Array.isArray(lf.iconography) ? lf.iconography : [],
            graphic_elements: Array.isArray(lf.graphic_elements) ? lf.graphic_elements : [],
            aesthetic_consistency: Array.isArray(lf.aesthetic_consistency) ? lf.aesthetic_consistency : []
          })
          const tpls = a?.template || a?.templates || []
          setTemplates(Array.isArray(tpls) ? tpls : [])
          const vos = a?.voiceover || []
          setVoiceovers(Array.isArray(vos) ? vos : [])
        }
      } catch(_) { /* noop */ }
    })()
  }, [])

  const handleSelectProfile = async (pid) => {
    try {
      setSelectedProfileId(pid)
      const userId = localStorage.getItem('token') || ''
      if (!userId || !pid) return
      const meta = (profiles || []).find(p => (p.profile_id || p.id) === pid)
      setSelectedIsActive(!!meta?.is_active)
      const a = await getBrandProfileById({ userId, profileId: pid })
      const bi = a?.brand_identity || {}
      setTagline(bi.tagline || '')
      setSpacing(bi.spacing || '')
      setCaptionLocation(a?.caption_location || a?.brand_identity?.caption_location || '')
      setLogos(bi.logo || [])
      setIcons(bi.icon || bi.icons || [])
      setFonts(bi.fonts || [])
      setColors(bi.colors || [])
      const tv = a?.tone_and_voice || {}
      setToneVoice({
        context: tv.context || '',
        brand_personality: Array.isArray(tv.brand_personality) ? tv.brand_personality : [],
        communication_style_pace: Array.isArray(tv.communication_style_pace) ? tv.communication_style_pace : []
      })
      const lf = a?.look_and_feel || {}
      setLookFeel({
        iconography: Array.isArray(lf.iconography) ? lf.iconography : [],
        graphic_elements: Array.isArray(lf.graphic_elements) ? lf.graphic_elements : [],
        aesthetic_consistency: Array.isArray(lf.aesthetic_consistency) ? lf.aesthetic_consistency : []
      })
      const tpls = a?.template || a?.templates || []
      setTemplates(Array.isArray(tpls) ? tpls : [])
      const vos = a?.voiceover || []
      setVoiceovers(Array.isArray(vos) ? vos : [])
    } catch(_) { /* noop */ }
  }

  const handleToggleActive = async () => {
    try {
      const userId = localStorage.getItem('token') || ''
      if (!userId || !selectedProfileId) return
      if (selectedIsActive) return // already active
      await activateBrandProfile({ userId, profileId: selectedProfileId })
      // Refresh profiles list and details
      const plist = await getBrandProfiles(userId)
      plist.sort((a,b) => (b?.is_active?1:0) - (a?.is_active?1:0))
      setProfiles(plist)
      const active = plist.find(p => p.is_active)
      const newSelected = active ? (active.profile_id || active.id) : selectedProfileId
      setSelectedProfileId(newSelected)
      setSelectedIsActive(!!active || selectedIsActive)
      const a = await getBrandProfileById({ userId, profileId: newSelected })
      const bi = a?.brand_identity || {}
      setTagline(bi.tagline || '')
      setSpacing(bi.spacing || '')
      setCaptionLocation(a?.caption_location || a?.brand_identity?.caption_location || '')
      setLogos(bi.logo || [])
      setIcons(bi.icon || bi.icons || [])
      setFonts(bi.fonts || [])
      setColors(bi.colors || [])
      const tv = a?.tone_and_voice || {}
      setToneVoice({
        context: tv.context || '',
        brand_personality: Array.isArray(tv.brand_personality) ? tv.brand_personality : [],
        communication_style_pace: Array.isArray(tv.communication_style_pace) ? tv.communication_style_pace : []
      })
      const lf = a?.look_and_feel || {}
      setLookFeel({
        iconography: Array.isArray(lf.iconography) ? lf.iconography : [],
        graphic_elements: Array.isArray(lf.graphic_elements) ? lf.graphic_elements : [],
        aesthetic_consistency: Array.isArray(lf.aesthetic_consistency) ? lf.aesthetic_consistency : []
      })
      const tpls = a?.template || a?.templates || []
      setTemplates(Array.isArray(tpls) ? tpls : [])
      const vos = a?.voiceover || []
      setVoiceovers(Array.isArray(vos) ? vos : [])
    } catch(_) { /* noop */ }
  }

  const openUploadModal = (type) => {
    setTargetType(type)
    setSelectedFiles([])
    try { (previewUrls || []).forEach(u => URL.revokeObjectURL(u)) } catch (_) {}
    setPreviewUrls([])
    setErrorMsg('')
    setIsModalOpen(true)
  }

  const onFilesPicked = (filesList) => {
    const arr = Array.from(filesList || [])
    if (arr.length === 0) return
    setSelectedFiles(arr)
    try {
      const urls = arr.map(f => URL.createObjectURL(f))
      setPreviewUrls(urls)
    } catch (_) { /* noop */ }
  }

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    const dt = e.dataTransfer;
    if (dt && dt.files) onFilesPicked(dt.files)
  }
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); }

  const saveFiles = async () => {
    try {
      if (!selectedFiles || selectedFiles.length === 0) return;
      setIsSaving(true); setErrorMsg('');
      const userId = localStorage.getItem('token') || '';
      const fileType = targetType === 'logos' ? 'logo' : 'icon';

      // 1) Upload files to brand assets storage
      const urls = await uploadBrandFiles({ userId, fileType, files: selectedFiles });

      // 2) GET details for current selected profile
      const pid = selectedProfileId;
      const cur = pid ? await getBrandProfileById({ userId, profileId: pid }) : null;
      const bi = cur?.brand_identity || {};
      const tv = cur?.tone_and_voice || {};
      const lf = cur?.look_and_feel || {};
      const templatesArr = cur?.template || cur?.templates || [];
      const voiceoverArr = cur?.voiceover || [];

      // 3) Merge uploaded URLs into the correct array for this profile
      const nextLogos = fileType === 'logo' ? Array.from(new Set([...(bi.logo || []), ...urls])) : (bi.logo || []);
      const nextIcons = fileType === 'icon' ? Array.from(new Set([...(bi.icon || bi.icons || []), ...urls])) : (bi.icon || bi.icons || []);

      // 4) Update selected profile
      if (pid) {
        await updateBrandProfile({
          userId,
          profileId: pid,
          payload: {
            brand_identity: {
              logo: nextLogos,
              icon: nextIcons,
              fonts: bi.fonts || [],
              colors: bi.colors || [],
              spacing: bi.spacing,
              tagline: bi.tagline,
            },
            tone_and_voice: tv,
            look_and_feel: lf,
            template: templatesArr,
            voiceover: voiceoverArr
          }
        });
      }

      // 5) GET the selected profile again to reflect canonical state
      if (pid) {
        const a = await getBrandProfileById({ userId, profileId: pid });
        const abi = a?.brand_identity || {};
        setLogos(abi.logo || []);
        setIcons(abi.icon || abi.icons || []);
        setFonts(abi.fonts || []);
        setColors(abi.colors || []);
      }

      setIsModalOpen(false);
      setSelectedFiles([]);
      try { (previewUrls || []).forEach(u => URL.revokeObjectURL(u)) } catch (_) {}
      setPreviewUrls([]);
    } catch (e) {
      setErrorMsg(e?.message || 'Failed to upload');
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-6 overflow-y-scroll h-[80vh]">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-[1.05rem] font-semibold text-gray-900">Brand Guidelines</h2>
        <div className="ml-auto flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Set as Active:</span>
            <button
              type="button"
              onClick={handleToggleActive}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${selectedIsActive ? 'bg-green-500' : 'bg-gray-300'}`}
              title={selectedIsActive ? 'Active' : 'Not Active'}
            >
              <span className={`inline-block h-5 w-5 transform rounded-full bg-white transition-transform ${selectedIsActive ? 'translate-x-5' : 'translate-x-1'}`}></span>
            </button>
          </div>
          <label className="text-sm text-gray-600">Profile:</label>
          <select
            value={selectedProfileId}
            onChange={(e) => handleSelectProfile(e.target.value)}
            className="border border-gray-300 rounded-md px-2 py-1 text-sm"
          >
            {(profiles || []).map((p) => (
              <option key={p.profile_id || p.id} value={p.profile_id || p.id}>
                {p.profile_name || p.website_url || (p.profile_id || p.id)}{p.is_active ? ' (Active)' : ''}
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          onClick={() => { setWebsiteUrl(''); setWebsiteError(''); setIsWebsiteModalOpen(true); }}
          className="px-3 py-2 rounded-md bg-[#13008B] text-white text-sm hover:bg-blue-800"
        >
          Add Website URL
        </button>
      </div>

      {/* Brand Images */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-gray-800 font-medium">Brand Images</p>
          <div>
            <button type="button" onClick={() => openUploadModal('logos')} className="px-4 py-2 rounded-md bg-[#13008B] text-white text-sm">Upload</button>
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="flex gap-6 flex-wrap">
            {(logos || []).length === 0 ? (
              <p className="text-sm text-gray-500">No logos added yet.</p>
            ) : (
              (logos || []).map((u, idx) => (
                <img key={idx} src={typeof u === 'string' ? u : (u?.url || '')} alt={`logo-${idx}`} className="h-24 w-32 object-contain rounded border" />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Fonts */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-gray-800 font-medium">Fonts</p>
          <p className="text-gray-900 font-semibold">{(fonts || []).length ? (Array.isArray(fonts) ? fonts.join(' | ') : String(fonts)) : '—'}</p>
        </div>
        <div className="px-5 pb-5">
          <button
            type="button"
            onClick={() => { setIsFontsModalOpen(true); setWorkingFonts(Array.isArray(fonts) ? [...fonts] : []); setNewFont(''); setFontsError(''); }}
            className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 text-left text-gray-600 hover:bg-gray-50"
          >
            <span>Add or Edit Fonts</span>
            <ChevronDown size={18} className="text-gray-400" />
          </button>
        </div>
      </section>

      {/* Brand Identity Details */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-gray-800 font-medium">Brand Identity</p>
        </div>
        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-700">
          <div>
            <div className="text-gray-500">Tagline</div>
            <div className="font-medium text-gray-900">{tagline || '—'}</div>
          </div>
          <div>
            <div className="text-gray-500">Spacing</div>
            <div className="font-medium text-gray-900">{String(spacing || '—')}</div>
          </div>
          <div className="md:col-span-2">
            <div className="text-gray-500">Caption Location</div>
            <div className="font-medium text-gray-900">{captionLocation ? JSON.stringify(captionLocation) : '—'}</div>
          </div>
        </div>
      </section>

      {/* Tone & Voice */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-gray-800 font-medium">Tone & Voice</p>
          <button
            type="button"
            onClick={() => {
              setWorkingTone({
                context: toneVoice.context || '',
                brand_personality: Array.isArray(toneVoice.brand_personality) ? toneVoice.brand_personality.map(x => ({ name: x.name || String(x.name || x.label || ''), percentage: Number(x.percentage || 0), label: x.label || '' })) : [],
                communication_style_pace: Array.isArray(toneVoice.communication_style_pace) ? toneVoice.communication_style_pace.map(x => ({ name: x.name || String(x.name || x.label || ''), percentage: Number(x.percentage || 0), label: x.label || '' })) : []
              });
              setIsToneModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-md text-sm border hover:bg-gray-50"
          >Edit</button>
        </div>
        <div className="px-5 pb-5 text-sm text-gray-700 space-y-3">
          <div>
            <div className="text-gray-500">Context</div>
            <div className="font-medium text-gray-900 whitespace-pre-wrap">{toneVoice.context || '—'}</div>
          </div>
          <div>
            <div className="text-gray-500">Brand Personality</div>
            <div className="flex flex-wrap gap-2">
              {(toneVoice.brand_personality || []).length ? toneVoice.brand_personality.map((p, i) => {
                const label = (p && typeof p === 'object') ? (p.label || p.name || p.percentage || JSON.stringify(p)) : p;
                return <span key={i} className="px-2 py-1 rounded-full border">{String(label)}</span>
              }) : '—'}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Communication Style Pace</div>
            <div className="flex flex-wrap gap-2">
              {(toneVoice.communication_style_pace || []).length ? toneVoice.communication_style_pace.map((p, i) => {
                const label = (p && typeof p === 'object') ? (p.label || p.name || p.percentage || JSON.stringify(p)) : p;
                return <span key={i} className="px-2 py-1 rounded-full border">{String(label)}</span>
              }) : '—'}
            </div>
          </div>
        </div>
      </section>

      {/* Look & Feel */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-gray-800 font-medium">Look & Feel</p>
          <button
            type="button"
            onClick={() => {
              setWorkingLook({
                iconography: Array.isArray(lookFeel.iconography) ? lookFeel.iconography.map(x => ({ name: x.name || String(x.name || x.label || ''), percentage: Number(x.percentage || 0), label: x.label || '' })) : [],
                graphic_elements: Array.isArray(lookFeel.graphic_elements) ? lookFeel.graphic_elements.map(x => ({ name: x.name || String(x.name || x.label || ''), percentage: Number(x.percentage || 0), label: x.label || '' })) : [],
                aesthetic_consistency: Array.isArray(lookFeel.aesthetic_consistency) ? lookFeel.aesthetic_consistency.map(x => ({ name: x.name || String(x.name || x.label || ''), percentage: Number(x.percentage || 0), label: x.label || '' })) : []
              });
              setIsLookModalOpen(true);
            }}
            className="px-3 py-1.5 rounded-md text-sm border hover:bg-gray-50"
          >Edit</button>
        </div>
        <div className="px-5 pb-5 grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-700">
          <div>
            <div className="text-gray-500">Iconography</div>
            <div className="flex flex-wrap gap-2 mt-1">
              {(lookFeel.iconography || []).length ? lookFeel.iconography.map((x, i) => {
                const label = (x && typeof x === 'object') ? (x.label || x.name || x.percentage || JSON.stringify(x)) : x;
                return <span key={i} className="px-2 py-1 rounded-full border">{String(label)}</span>
              }) : '—'}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Graphic Elements</div>
            <div className="flex flex-wrap gap-2 mt-1">
              {(lookFeel.graphic_elements || []).length ? lookFeel.graphic_elements.map((x, i) => {
                const label = (x && typeof x === 'object') ? (x.label || x.name || x.percentage || JSON.stringify(x)) : x;
                return <span key={i} className="px-2 py-1 rounded-full border">{String(label)}</span>
              }) : '—'}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Aesthetic Consistency</div>
            <div className="flex flex-wrap gap-2 mt-1">
              {(lookFeel.aesthetic_consistency || []).length ? lookFeel.aesthetic_consistency.map((x, i) => {
                const label = (x && typeof x === 'object') ? (x.label || x.name || x.percentage || JSON.stringify(x)) : x;
                return <span key={i} className="px-2 py-1 rounded-full border">{String(label)}</span>
              }) : '—'}
            </div>
          </div>
        </div>
      </section>

      {/* Tone & Voice Modal */}
      {isToneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[92%] max-w-2xl rounded-lg shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Edit Tone & Voice</h3>
              <button onClick={() => setIsToneModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Context</div>
                <textarea value={workingTone.context} onChange={e => setWorkingTone(prev => ({ ...prev, context: e.target.value }))} className="w-full border rounded-md px-3 py-2" rows={3} />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <div className="text-sm font-medium text-gray-800 mb-1">Brand Personality</div>
                  <div className="space-y-2">
                    {(workingTone.brand_personality || []).map((m, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-40 truncate text-xs text-gray-600" title={m.name}>{m.name}</span>
                        <input type="range" min={0} max={100} value={Number(m.percentage||0)} onChange={e => {
                          const v = Number(e.target.value);
                          setWorkingTone(prev => {
                            const arr = [...prev.brand_personality]; arr[i] = { ...arr[i], percentage: v };
                            return { ...prev, brand_personality: arr };
                          });
                        }} className="flex-1" />
                        <span className="w-10 text-xs text-gray-700">{Number(m.percentage||0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <div className="text-sm font-medium text-gray-800 mb-1">Communication Style Pace</div>
                  <div className="space-y-2">
                    {(workingTone.communication_style_pace || []).map((m, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-40 truncate text-xs text-gray-600" title={m.name}>{m.name}</span>
                        <input type="range" min={0} max={100} value={Number(m.percentage||0)} onChange={e => {
                          const v = Number(e.target.value);
                          setWorkingTone(prev => {
                            const arr = [...prev.communication_style_pace]; arr[i] = { ...arr[i], percentage: v };
                            return { ...prev, communication_style_pace: arr };
                          });
                        }} className="flex-1" />
                        <span className="w-10 text-xs text-gray-700">{Number(m.percentage||0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => setIsToneModalOpen(false)} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    const userId = localStorage.getItem('token') || '';
                    const pid = selectedProfileId;
                    if (!userId || !pid) return;
                    // 1) Get selected profile detail to preserve other fields
                    const detail = await getBrandProfileById({ userId, profileId: pid });
                    const bi = detail?.brand_identity || {};
                    const lf = detail?.look_and_feel || {};
                    const tpls = detail?.template || detail?.templates || [];
                    const vos = detail?.voiceover || [];
                    // 2) Build next tone payload from working state
                    const nextTone = {
                      context: workingTone.context || '',
                      brand_personality: (workingTone.brand_personality || []).map(x => ({ name: x.name, percentage: Number(x.percentage||0), label: x.label || '' })),
                      communication_style_pace: (workingTone.communication_style_pace || []).map(x => ({ name: x.name, percentage: Number(x.percentage||0), label: x.label || '' }))
                    };
                    // 3) Update profile
                    await updateBrandProfile({
                      userId,
                      profileId: pid,
                      payload: {
                        brand_identity: { logo: bi.logo || [], icon: bi.icon || bi.icons || [], fonts: bi.fonts || [], colors: bi.colors || [], spacing: bi.spacing, tagline: bi.tagline },
                        tone_and_voice: nextTone,
                        look_and_feel: lf,
                        template: tpls,
                        voiceover: vos
                      }
                    });
                    // 4) Refresh UI from detail
                    const refreshed = await getBrandProfileById({ userId, profileId: pid });
                    const tv = refreshed?.tone_and_voice || {};
                    setToneVoice({
                      context: tv.context || '',
                      brand_personality: Array.isArray(tv.brand_personality) ? tv.brand_personality : [],
                      communication_style_pace: Array.isArray(tv.communication_style_pace) ? tv.communication_style_pace : []
                    });
                    setIsToneModalOpen(false);
                  } catch (e) { /* noop */ }
                }}
                className="px-4 py-2 rounded-md text-white bg-[#13008B] hover:bg-blue-800"
              >Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Look & Feel Modal */}
      {isLookModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[92%] max-w-2xl rounded-lg shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Edit Look & Feel</h3>
              <button onClick={() => setIsLookModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-4">
              {['iconography','graphic_elements','aesthetic_consistency'].map(section => (
                <div key={section}>
                  <div className="text-sm font-medium text-gray-800 mb-1">{section.replace('_',' ')}</div>
                  <div className="space-y-2">
                    {(workingLook[section] || []).map((m, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <span className="w-40 truncate text-xs text-gray-600" title={m.name}>{m.name}</span>
                        <input type="range" min={0} max={100} value={Number(m.percentage||0)} onChange={e => {
                          const v = Number(e.target.value);
                          setWorkingLook(prev => {
                            const arr = [...prev[section]]; arr[i] = { ...arr[i], percentage: v };
                            return { ...prev, [section]: arr };
                          });
                        }} className="flex-1" />
                        <span className="w-10 text-xs text-gray-700">{Number(m.percentage||0)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => setIsLookModalOpen(false)} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    const userId = localStorage.getItem('token') || '';
                    const pid = selectedProfileId;
                    if (!userId || !pid) return;
                    // 1) Get selected profile detail
                    const detail = await getBrandProfileById({ userId, profileId: pid });
                    const bi = detail?.brand_identity || {};
                    const tv = detail?.tone_and_voice || {};
                    const tpls = detail?.template || detail?.templates || [];
                    const vos = detail?.voiceover || [];
                    // 2) Build next look payload from working state
                    const nextLook = {
                      iconography: (workingLook.iconography || []).map(x => ({ name: x.name, percentage: Number(x.percentage||0), label: x.label || '' })),
                      graphic_elements: (workingLook.graphic_elements || []).map(x => ({ name: x.name, percentage: Number(x.percentage||0), label: x.label || '' })),
                      aesthetic_consistency: (workingLook.aesthetic_consistency || []).map(x => ({ name: x.name, percentage: Number(x.percentage||0), label: x.label || '' }))
                    };
                    // 3) Update profile
                    await updateBrandProfile({
                      userId,
                      profileId: pid,
                      payload: {
                        brand_identity: { logo: bi.logo || [], icon: bi.icon || bi.icons || [], fonts: bi.fonts || [], colors: bi.colors || [], spacing: bi.spacing, tagline: bi.tagline },
                        tone_and_voice: tv,
                        look_and_feel: nextLook,
                        template: tpls,
                        voiceover: vos
                      }
                    });
                    // 4) Refresh UI from detail
                    const refreshed = await getBrandProfileById({ userId, profileId: pid });
                    const lf = refreshed?.look_and_feel || {};
                    setLookFeel({
                      iconography: Array.isArray(lf.iconography) ? lf.iconography : [],
                      graphic_elements: Array.isArray(lf.graphic_elements) ? lf.graphic_elements : [],
                      aesthetic_consistency: Array.isArray(lf.aesthetic_consistency) ? lf.aesthetic_consistency : []
                    });
                    setIsLookModalOpen(false);
                  } catch (e) { /* noop */ }
                }}
                className="px-4 py-2 rounded-md text-white bg-[#13008B] hover:bg-blue-800"
              >Save</button>
            </div>
          </div>
        </div>
      )}

      {/* Templates */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-gray-800 font-medium">Templates</p>
        </div>
        <div className="px-5 pb-5">
          {(templates || []).length === 0 ? (
            <p className="text-sm text-gray-500">No templates found.</p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
              {templates.map((u, idx) => {
                const url = (u && typeof u === 'object') ? (u.url || u.image || u.src || '') : u;
                return (
                  <div key={idx} className="border rounded-lg overflow-hidden bg-gray-50">
                    {url ? <img src={url} alt={`template-${idx}`} className="w-full h-28 object-cover" /> : <div className="p-4 text-xs text-gray-500 break-all">{JSON.stringify(u)}</div>}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* Voiceovers */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-gray-800 font-medium">Voiceovers</p>
        </div>
        <div className="px-5 pb-5 text-sm text-gray-700">
          {(voiceovers || []).length === 0 ? (
            <p className="text-sm text-gray-500">No voiceovers found.</p>
          ) : (
            <ul className="list-disc ml-5 space-y-1">
              {voiceovers.map((v, i) => {
                const s = (v && typeof v === 'object') ? (v.url || v.href || v.link || v.src || v.file || JSON.stringify(v)) : String(v || '')
                const href = typeof s === 'string' ? s : '';
                const label = (typeof s === 'string' ? s.split('/').pop() : '') || (v && v.name) || 'voiceover';
                return <li key={i}>{href ? <a href={href} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline">{label}</a> : <span className="break-all">{String(s)}</span>}</li>
              })}
            </ul>
          )}
        </div>
      </section>

      {/* Colors */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-gray-800 font-medium">Colors</p>
          <p className="text-gray-900 font-semibold">{(colors || []).length ? (Array.isArray(colors) ? colors.join(' | ') : String(colors)) : '—'}</p>
        </div>
        <div className="px-5 pb-5">
          {(colors || []).length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {colors.map((c, i) => (
                <div key={i} className="w-7 h-7 rounded-full border" style={{ background: c }} title={c} />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={() => { setIsColorsModalOpen(true); setWorkingColors(Array.isArray(colors) ? [...colors] : []); setNewColor('#4f46e5'); setColorsError(''); }}
            className="w-full flex items-center justify-between border border-gray-200 rounded-lg px-4 py-3 text-left text-gray-600 hover:bg-gray-50"
          >
            <span>Add or Edit Colors</span>
            <ChevronDown size={18} className="text-gray-400" />
          </button>
        </div>
      </section>

      {/* Icons */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-gray-800 font-medium">Icons</p>
          <div>
            <button type="button" onClick={() => openUploadModal('icons')} className="px-4 py-2 rounded-md bg-[#13008B] text-white text-sm">Upload</button>
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="flex items-center gap-6 flex-wrap text-gray-900">
            {(icons || []).length === 0 ? (
              <p className="text-sm text-gray-500">No icons added yet.</p>
            ) : (
              icons.map((u, idx) => (
                <img key={idx} src={typeof u === 'string' ? u : (u?.url || '')} alt={`icon-${idx}`} className="h-16 w-16 object-contain rounded border" />
              ))
            )}
          </div>
        </div>
      </section>

      {/* Upload Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[92%] max-w-xl rounded-lg shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Upload {targetType === 'logos' ? 'Brand Images' : 'Icons'}</h3>
              <button onClick={() => { setIsModalOpen(false); }} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-600"
            >
              <p className="mb-2">Drag & drop files here</p>
              <p className="text-sm mb-3">or</p>
              <input
                ref={fileInputRef}
                type="file"
                accept={targetType === 'icons' ? 'image/*' : 'image/*'}
                multiple
                className="hidden"
                onChange={(e) => onFilesPicked(e.target.files)}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
              >
                Browse files
              </button>
            </div>
            {/* Preview */}
            {previewUrls.length > 0 && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {previewUrls.map((u, i) => (
                  <div key={i} className="relative border rounded-lg overflow-hidden h-24">
                    <img src={u} alt={`preview-${i}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            {errorMsg && <div className="mt-3 text-sm text-red-600">{errorMsg}</div>}
            <div className="mt-5 flex items-center justify-end gap-2">
              <button onClick={() => setIsModalOpen(false)} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button onClick={saveFiles} disabled={isSaving || selectedFiles.length === 0} className={`px-4 py-2 rounded-md text-white ${isSaving || selectedFiles.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}>
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Fonts Modal */}
      {isFontsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[92%] max-w-xl rounded-lg shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Manage Fonts</h3>
              <button onClick={() => setIsFontsModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              {/* Select from common fonts */}
              <div className="flex gap-2">
                <select
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                  value={selectedFontOption}
                  onChange={(e) => setSelectedFontOption(e.target.value)}
                >
                  {availableFonts.map((f) => (
                    <option key={f} value={f}>{f}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setWorkingFonts(prev => Array.from(new Set([...(prev||[]), selectedFontOption])))}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                >Add</button>
              </div>
              {/* Or type a custom font */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Enter font name (e.g., Inter)"
                  value={newFont}
                  onChange={(e) => setNewFont(e.target.value)}
                  className="flex-1 border border-gray-300 rounded-md px-3 py-2"
                />
                <button
                  type="button"
                  onClick={() => { if (newFont.trim()) { setWorkingFonts(prev => Array.from(new Set([...(prev||[]), newFont.trim()]))); setNewFont(''); } }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                >Add</button>
              </div>
              {workingFonts && workingFonts.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {workingFonts.map((f, i) => (
                    <span key={i} className="px-2 py-1 rounded-full border text-sm flex items-center gap-2">
                      {f}
                      <button onClick={() => setWorkingFonts(prev => prev.filter(x => x !== f))} title="Remove" className="text-gray-500 hover:text-gray-800">✕</button>
                    </span>
                  ))}
                </div>
              )}
              {fontsError && <div className="text-sm text-red-600">{fontsError}</div>}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button onClick={() => setIsFontsModalOpen(false)} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
                <button
                  onClick={async () => {
                    try {
                      setIsSavingFonts(true); setFontsError('');
                      const userId = localStorage.getItem('token') || '';
                      const picks = Array.isArray(workingFonts) ? workingFonts.filter(Boolean).map(String) : [];
                      if (picks.length === 0) {
                        setFontsError('Please select at least one font to save.');
                      } else {
                        // Pull latest, merge, update, then refresh (match onboarding flow)
                        const pid = selectedProfileId;
                        const currentAll = pid ? await getBrandProfileById({ userId, profileId: pid }) : null;
                        const biAll = currentAll?.brand_identity || {};
                        const tvAll = currentAll?.tone_and_voice || {};
                        const lfAll = currentAll?.look_and_feel || {};
                        const templatesAll = currentAll?.template || currentAll?.templates || [];
                        const voiceoverAll = currentAll?.voiceover || [];
                        const existing = Array.isArray(biAll.fonts) ? biAll.fonts.map(String) : [];
                        const nextFonts = Array.from(new Set([ ...existing, ...picks ]));
                        if (pid) {
                          await updateBrandProfile({
                            userId,
                            profileId: pid,
                            payload: {
                              brand_identity: { logo: biAll.logo || [], icon: biAll.icon || biAll.icons || [], fonts: nextFonts, colors: biAll.colors || [], spacing: biAll.spacing, tagline: biAll.tagline },
                              tone_and_voice: tvAll,
                              look_and_feel: lfAll,
                              template: templatesAll,
                              voiceover: voiceoverAll
                            }
                          });
                        }
                        if (pid) {
                          const a = await getBrandProfileById({ userId, profileId: pid });
                          const bi = a?.brand_identity || {};
                          setFonts(bi.fonts || []);
                        }
                      }
                      setIsFontsModalOpen(false);
                    } catch (e) {
                      setFontsError(e?.message || 'Failed to save fonts');
                    } finally { setIsSavingFonts(false); }
                  }}
                  disabled={isSavingFonts}
                  className={`px-4 py-2 rounded-md text-white ${isSavingFonts ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}
                >{isSavingFonts ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Colors Modal */}
      {isColorsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[92%] max-w-xl rounded-lg shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Manage Colors</h3>
              <button onClick={() => setIsColorsModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <input type="color" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="w-10 h-10 border rounded" />
                <input type="text" value={newColor} onChange={(e) => setNewColor(e.target.value)} className="flex-1 border border-gray-300 rounded-md px-3 py-2" />
                <button
                  type="button"
                  onClick={() => { if (newColor && /^#?[0-9a-fA-F]{3,8}$/.test(newColor)) { const hex = newColor.startsWith('#') ? newColor : `#${newColor}`; setWorkingColors(prev => Array.from(new Set([...(prev||[]), hex]))); } }}
                  className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md"
                >Add</button>
              </div>
              {workingColors && workingColors.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {workingColors.map((c, i) => (
                    <span key={i} className="px-2 py-1 rounded-full border text-sm flex items-center gap-2">
                      <span className="inline-block w-3 h-3 rounded-full border" style={{ background: c }} />
                      {c}
                      <button onClick={() => setWorkingColors(prev => prev.filter(x => x !== c))} title="Remove" className="text-gray-500 hover:text-gray-800">✕</button>
                    </span>
                  ))}
                </div>
              )}
              {colorsError && <div className="text-sm text-red-600">{colorsError}</div>}
              <div className="flex items-center justify-end gap-2 pt-1">
                <button onClick={() => setIsColorsModalOpen(false)} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
                <button
                  onClick={async () => {
                    try {
                      setIsSavingColors(true); setColorsError('');
                      const userId = localStorage.getItem('token') || '';
                      const norm = (c) => {
                        if (!c) return '';
                        let x = String(c).trim();
                        if (!x.startsWith('#')) x = `#${x}`;
                        return x.toLowerCase();
                      };
                      const current = Array.isArray(colors) ? colors.map(norm) : [];
                      const toAdd = (workingColors || []).map(norm).filter(c => !!c && !current.includes(c));
                      if (toAdd.length === 0) {
                        setColorsError('No new colors to save.');
                      } else {
                        const pid = selectedProfileId;
                        const currentAll = pid ? await getBrandProfileById({ userId, profileId: pid }) : null;
                        const biAll = currentAll?.brand_identity || {};
                        const tvAll = currentAll?.tone_and_voice || {};
                        const lfAll = currentAll?.look_and_feel || {};
                        const templatesAll = currentAll?.template || currentAll?.templates || [];
                        const voiceoverAll = currentAll?.voiceover || [];
                        const nextColors = Array.from(new Set([...(biAll.colors || []), ...toAdd]));
                        if (pid) {
                          await updateBrandProfile({
                            userId,
                            profileId: pid,
                            payload: {
                              brand_identity: { logo: biAll.logo || [], icon: biAll.icon || biAll.icons || [], fonts: biAll.fonts || [], colors: nextColors, spacing: biAll.spacing, tagline: biAll.tagline },
                              tone_and_voice: tvAll,
                              look_and_feel: lfAll,
                              template: templatesAll,
                              voiceover: voiceoverAll
                            }
                          });
                        }
                        if (pid) {
                          const a = await getBrandProfileById({ userId, profileId: pid });
                          const bi = a?.brand_identity || {};
                          setColors(bi.colors || []);
                        }
                      }
                      setIsColorsModalOpen(false);
                    } catch (e) {
                      setColorsError(e?.message || 'Failed to save colors');
                    } finally { setIsSavingColors(false); }
                  }}
                  disabled={isSavingColors}
                  className={`px-4 py-2 rounded-md text-white ${isSavingColors ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}
                >{isSavingColors ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Choose the Captions Location */}
    

      {/* Website URL Modal */}
      {isWebsiteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[92%] max-w-md rounded-lg shadow-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Add Website URL</h3>
              <button onClick={() => setIsWebsiteModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="https://example.com"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              <input
                type="text"
                placeholder="Profile name (e.g., Apple Brand)"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              />
              {websiteError && <div className="text-sm text-red-600">{websiteError}</div>}
            </div>
            <div className="flex items-center justify-end gap-2 mt-4">
              <button onClick={() => setIsWebsiteModalOpen(false)} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200">Cancel</button>
              <button
                onClick={async () => {
                  try {
                    setWebsiteError(''); setIsAnalyzing(true);
                    const userId = localStorage.getItem('token') || '';
                    if (!userId) { setWebsiteError('Missing user session'); return; }
                    if (!websiteUrl || !websiteUrl.trim()) { setWebsiteError('Please enter a website URL'); return; }
                    if (!profileName || !profileName.trim()) { setWebsiteError('Please enter a profile name'); return; }
                    // 1) Create profile (backend normalizes URL)
                    const created = await createBrandProfile({ userId, website: websiteUrl.trim(), profileName: profileName.trim(), setAsActive: true });
                    const createdId = (created?.profile_id || created?.id || created?.profile?.id);
                    // 2) GET all profiles, set dropdown, select the created/active one
                    const plist = await getBrandProfiles(userId);
                    plist.sort((a,b) => (b?.is_active?1:0) - (a?.is_active?1:0));
                    setProfiles(plist);
                    const newSelected = createdId || (plist.find(p => p.is_active)?.profile_id || plist[0]?.profile_id || plist[0]?.id || '');
                    if (newSelected) setSelectedProfileId(newSelected);
                    // 3) GET details of the selected profile and populate UI
                    if (newSelected) {
                      const a = await getBrandProfileById({ userId, profileId: newSelected });
                      const bi = a?.brand_identity || {};
                      setTagline(bi.tagline || '');
                      setSpacing(bi.spacing || '');
                      setCaptionLocation(a?.caption_location || a?.brand_identity?.caption_location || '');
                      setLogos(bi.logo || []);
                      setIcons(bi.icon || bi.icons || []);
                      setFonts(bi.fonts || []);
                      setColors(bi.colors || []);
                      const tv = a?.tone_and_voice || {};
                      setToneVoice({
                        context: tv.context || '',
                        brand_personality: Array.isArray(tv.brand_personality) ? tv.brand_personality : [],
                        communication_style_pace: Array.isArray(tv.communication_style_pace) ? tv.communication_style_pace : []
                      });
                      const lf = a?.look_and_feel || {};
                      setLookFeel({
                        iconography: Array.isArray(lf.iconography) ? lf.iconography : [],
                        graphic_elements: Array.isArray(lf.graphic_elements) ? lf.graphic_elements : [],
                        aesthetic_consistency: Array.isArray(lf.aesthetic_consistency) ? lf.aesthetic_consistency : []
                      });
                      const tpls = a?.template || a?.templates || [];
                      setTemplates(Array.isArray(tpls) ? tpls : []);
                      const vos = a?.voiceover || [];
                      setVoiceovers(Array.isArray(vos) ? vos : []);
                    }
                    setIsWebsiteModalOpen(false);
                  } catch (e) {
                    setWebsiteError(e?.message || 'Failed to analyze website');
                  } finally { setIsAnalyzing(false); }
                }}
                disabled={isAnalyzing}
                className={`px-4 py-2 rounded-md text-white ${isAnalyzing ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}
              >
                {isAnalyzing ? 'Saving…' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Brandimages
