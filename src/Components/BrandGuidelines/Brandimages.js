import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import useBrandAssets from '../../hooks/useBrandAssets'

const Brandimages = () => {
  const fileInputRef = useRef(null)
  const { getBrandAssets, uploadBrandAssets } = useBrandAssets()
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

  useEffect(() => {
    const userId = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : ''
    if (!userId) return
    ;(async () => {
      const data = await getBrandAssets(userId)
      const a = data || {}
      const logosArr = a.logos || a.logo || []
      const iconsArr = a.icons || []
      const fontsArr = a.fonts || a.font || []
      const colorsArr = a.colors || a.color || []
      setLogos(logosArr)
      setIcons(iconsArr)
      setFonts(fontsArr)
      setColors(colorsArr)
    })()
  }, [])

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
      const files = targetType === 'logos' ? { logos: selectedFiles } : { icons: selectedFiles };
      await uploadBrandAssets({ userId, files });
      // Refresh list
      const data = await getBrandAssets(userId);
      const a = data || {};
      setLogos(a.logos || a.logo || []);
      setIcons(a.icons || []);
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
      <h2 className="text-[1.05rem] font-semibold text-gray-900">Brand Guidelines</h2>

      {/* Brand Images (logos) */}
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
                      // Only send fonts that are new compared to what's already saved
                      const current = Array.isArray(fonts) ? fonts : (fonts ? [fonts] : []);
                      const toAdd = (workingFonts || []).filter(f => !current.includes(f));
                      if (toAdd.length === 0) {
                        setFontsError('No new fonts to save.');
                      } else {
                        await uploadBrandAssets({ userId, fonts: toAdd });
                      }
                      const data = await getBrandAssets(userId);
                      const a = data || {};
                      setFonts(a.fonts || a.font || []);
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
                        await uploadBrandAssets({ userId, colors: toAdd });
                      }
                      const data = await getBrandAssets(userId);
                      const a = data || {};
                      setColors(a.colors || a.color || []);
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
      <div className="space-y-3">
        <p className="text-gray-800 font-medium">Choose the Captions Location</p>
        <div className="relative rounded-xl overflow-hidden border border-gray-200 w-full max-w-[860px]">
          <img
            src="https://images.unsplash.com/photo-1580894732444-8ecded7900cd?q=80&w=1600&auto=format&fit=crop"
            alt="preview"
            className="w-full h-[360px] object-cover"
          />
          <button
            type="button"
            className="absolute top-5 left-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-white shadow flex items-center justify-center"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            className="absolute bottom-5 left-1/2 -translate-x-1/2 h-9 w-9 rounded-full bg-white shadow flex items-center justify-center"
          >
            <Plus size={18} />
          </button>
          <button
            type="button"
            className="absolute bottom-5 right-5 h-9 w-9 rounded-full bg-white shadow flex items-center justify-center"
          >
            <Plus size={18} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default Brandimages
