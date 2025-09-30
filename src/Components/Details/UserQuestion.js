import React, { useEffect, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { FaImage, FaPlus, FaTrash, FaChevronDown, FaEyeDropper, FaMicrophone, FaStop } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

const UserQuestion = () => {
  const [logoFiles, setLogoFiles] = useState([]) // [{file, preview, id}]
  const [brandImages, setBrandImages] = useState([]) // [{file, preview, id}]
  const [selectedFonts, setSelectedFonts] = useState([]) // multi-select
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false)
  const [selectedColors, setSelectedColors] = useState([])
  const [customColors, setCustomColors] = useState([])
  const [currentColor, setCurrentColor] = useState('#4f46e5')
  const fileInputRef = useRef(null)
  const brandFileInputRef = useRef(null)
  const colorInputRef = useRef(null)

  // Voice recording state
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudios, setRecordedAudios] = useState([]) // [{id, url, blob}]

  const navigate = useNavigate()

  const fontOptions = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Verdana',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins'
  ]

  // Palette similar to screenshot (rows across grays, warm/cool tones)
  const presetColors = [
    '#000000','#4B5563','#6B7280','#9CA3AF','#D1D5DB','#E5E7EB','#F3F4F6','#FFFFFF',
    '#B91C1C','#DC2626','#EF4444','#F59E0B','#FBBF24','#FDE047','#84CC16','#22C55E','#06B6D4','#3B82F6','#2563EB','#8B5CF6','#EC4899',
    '#FCA5A5','#FCD34D','#A7F3D0','#A5F3FC','#93C5FD','#A5B4FC','#FBCFE8','#E5E7EB','#FECACA','#FDE68A','#D1FAE5','#BAE6FD','#BFDBFE','#DDD6FE','#F5D0FE',
    '#991B1B','#B45309','#92400E','#166534','#065F46','#0E7490','#1D4ED8','#3730A3','#6D28D9','#831843'
  ]

  const handleLogoChange = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => {
        setLogoFiles(prev => [...prev, { file, preview: reader.result, id: Date.now() + Math.random() }])
      }
      reader.readAsDataURL(file)
    })
  }

  const handleBrandImageChange = (e) => {
    const files = Array.from(e.target.files)
    files.forEach(file => {
      const reader = new FileReader()
      reader.onload = () => {
        setBrandImages(prev => [...prev, { file, preview: reader.result, id: Date.now() + Math.random() }])
      }
      reader.readAsDataURL(file)
    })
  }

  const removeBrandImage = (id) => {
    setBrandImages(prev => prev.filter(img => img.id !== id))
  }

  const handleLogoUpload = () => {
    if (logoFiles.length > 0) {
      console.log('Uploading logos:', logoFiles)
    }
  }

  const handleBrandImagesUpload = () => {
    if (brandImages.length > 0) {
      console.log('Uploading brand images:', brandImages)
    }
  }

  const handleLogoClick = () => {
    fileInputRef.current?.click()
  }

  const handleBrandImagesClick = () => {
    brandFileInputRef.current?.click()
  }

  const toggleFontSelect = (font) => {
    setSelectedFonts(prev => prev.includes(font) ? prev.filter(f => f !== font) : [...prev, font])
  }

  const handleNextStep = () => {
    console.log('Moving to next step with:', { logoFiles, brandImages, selectedFonts, selectedColors })
  }

  const toggleColor = (hex) => {
    setSelectedColors((prev) => prev.includes(hex) ? prev.filter(c => c !== hex) : [...prev, hex])
  }

  const addCurrentColor = () => {
    if (!currentColor) return
    setCustomColors((prev) => prev.includes(currentColor) ? prev : [...prev, currentColor])
    setSelectedColors((prev) => prev.includes(currentColor) ? prev : [...prev, currentColor])
  }

  const openColorPicker = () => {
    colorInputRef.current?.click()
  }

  const handlePickCustomColor = (e) => {
    const hex = e.target.value
    if (!hex) return
    setCustomColors((prev) => prev.includes(hex) ? prev : [...prev, hex])
    setSelectedColors((prev) => prev.includes(hex) ? prev : [...prev, hex])
  }

  const handleSubmit = () => {
    try {
      const urls = recordedAudios.map(a => a.url).filter(Boolean)
      localStorage.setItem('onboarding_voice_urls', JSON.stringify(urls))
    } catch (_) { /* noop */ }
    // Also save to Brand Assets per requirement
    saveBrandAssets().finally(() => navigate("/"))
  }

  const [isSavingAssets, setIsSavingAssets] = useState(false)
  // Helper: compress image to stay under size (approx) and reasonable dimensions
  const compressImage = async (file, { maxKB = 1024, maxDim = 1200, qualitySteps = [0.8, 0.6, 0.5, 0.4] } = {}) => {
    try {
      // If already small, return original
      if (file.size <= maxKB * 1024) return file
      const img = document.createElement('img')
      const url = URL.createObjectURL(file)
      await new Promise((res, rej) => { img.onload = () => res(); img.onerror = rej; img.src = url })
      const canvas = document.createElement('canvas')
      let { width, height } = img
      const scale = Math.min(1, maxDim / Math.max(width, height))
      width = Math.floor(width * scale)
      height = Math.floor(height * scale)
      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      URL.revokeObjectURL(url)
      for (const q of qualitySteps) {
        const blob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', q))
        if (!blob) continue
        if (blob.size <= maxKB * 1024) {
          return new File([blob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
        }
      }
      // Return best-effort last blob if available
      const lastBlob = await new Promise(res => canvas.toBlob(res, 'image/jpeg', qualitySteps[qualitySteps.length - 1]))
      if (lastBlob) return new File([lastBlob], file.name.replace(/\.[^.]+$/, '') + '.jpg', { type: 'image/jpeg' })
      return file
    } catch (_) {
      return file
    }
  }
  const saveBrandAssets = async () => {
    try {
      setIsSavingAssets(true)
      const userId = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : ''
      if (!userId) return
      const form = new FormData()
      form.append('user_id', userId)
      // Append arrays of strings
      try { (selectedFonts || []).forEach(f => form.append('font', String(f))) } catch (_) { /* noop */ }
      try { (selectedColors || []).forEach(c => form.append('color', String(c))) } catch (_) { /* noop */ }
      // Append images as files (compressed if needed) to avoid large base64 parts
      try {
        for (const img of (logoFiles || [])) {
          const file = await compressImage(img?.file)
          form.append('logos', file)
        }
      } catch (_) { /* noop */ }
      try {
        for (const img of (brandImages || [])) {
          const file = await compressImage(img?.file)
          form.append('icons', file)
        }
      } catch (_) { /* noop */ }
      // Append recorded audio blobs as files
      try {
        for (const a of (recordedAudios || [])) {
          if (a?.blob) {
            const name = `recording_${Math.floor(a.id)}.webm`
            form.append('voiceovers', new File([a.blob], name, { type: a.blob.type || 'audio/webm' }))
          }
        }
      } catch (_) { /* noop */ }

      await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/users/brand-assets', {
        method: 'POST',
        body: form,
      })
    } catch (e) {
      console.error('Failed saving brand assets:', e)
    } finally {
      setIsSavingAssets(false)
    }
  }

  // Clean up object URL on unmount
  useEffect(() => {
    return () => {
      try { recordedAudios.forEach(a => a?.url && URL.revokeObjectURL(a.url)) } catch (_) { /* noop */ }
    }
  }, [recordedAudios])

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : ''
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      mediaRecorderRef.current = mr
      recordedChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data) }
      mr.onstop = () => {
        try {
          const blob = new Blob(recordedChunksRef.current, { type: mime || 'audio/webm' })
          const url = URL.createObjectURL(blob)
          const item = { id: Date.now() + Math.random(), url, blob }
          setRecordedAudios(prev => [...prev, item])
        } catch (_) { /* noop */ }
        setIsRecording(false)
        try { stream.getTracks().forEach(t => t.stop()) } catch (_) { /* noop */ }
      }
      mr.start()
      setIsRecording(true)
    } catch (e) {
      console.error('Mic access error', e)
      alert('Unable to access microphone. Please check permissions.')
    }
  }

  const stopRecording = () => {
    try { if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop() } catch (_) { /* noop */ }
  }

  return (
    <div className='min-w-[600px] rounded-2xl h-[85vh] bg-white border-[1px] p-[20px] border-[#ccc] overflow-y-auto scrollbar-hide'>
        <div className='flex justify-start items-start mb-6'>
            <h2 className='text-[20px] text-black'>
                User Details
            </h2>
        </div>

        {/* Logo Upload Section */}
        <div className='w-full mb-6'>
          <h3 className='text-[16px] font-medium text-gray-800 mb-3'>Company Logo</h3>
          
          <div className='w-full'>
            {/* Drag & Drop Area */}
            <div 
              onClick={handleLogoClick}
              className='w-full h-32 border-2 border-dashed border-[#E5E2FF] rounded-lg  flex flex-col items-center justify-center cursor-pointer hover:border-[#E5E2FF] hover:bg-[#E5E2FF] transition-colors'
            >
              {/* Static drop area instructions */}
              <div className='mb-2'>
                <FaImage className='w-10 h-10'/>
              </div>
              <div className='text-center'>
                <p className=' font-medium'>Drop the images here</p>
                <p className='text-gray-500 text-sm mt-1'>Supports: JPG, JPEG2000, PNG</p>
              </div>
            </div>

            {/* Logo previews below */}
            {logoFiles.length > 0 && (
              <div className='mt-3 flex gap-2 flex-wrap'>
                {logoFiles.map(img => (
                  <div key={img.id} className='relative'>
                    <img src={img.preview} alt='Logo preview' className='w-20 h-20 object-cover rounded border' />
                    <button
                      onClick={() => setLogoFiles(prev => prev.filter(x => x.id !== img.id))}
                      className='absolute top-0 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600'
                    >
                      <FaTrash className='w-3 h-3' />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* File Info and Upload Button */}
            {logoFiles.length > 0 && (
              <div className='mt-4 flex items-center justify-between'>
                <div className='text-sm text-gray-600'>
                  <p>Selected: {logoFiles.length} image(s)</p>
                  <p>Total Size: {(logoFiles.reduce((acc, img) => acc + img.file.size, 0) / 1024).toFixed(2)} KB</p>
                </div>
                <button
                  onClick={handleLogoUpload}
                  className='px-6 py-2 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0066] transition-colors'
                >
                  Upload Logos
                </button>
              </div>
            )}
          </div>

          {/* Hidden File Input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleLogoChange}
            className="hidden"
          />
        </div>

        {/* Brand Images Upload Section */}
        <div className='w-full mb-6'>
          <h3 className='text-[16px] font-medium text-gray-800 mb-3'>Brand Images</h3>
          
          <div className='w-full'>
            {/* Drag & Drop Area for Brand Images */}
            <div 
              onClick={handleBrandImagesClick}
              className='w-full h-32 border-2 border-dashed border-[#E5E2FF] rounded-lg flex flex-col items-center justify-center cursor-pointer hover:border-[#E5E2FF] hover:bg-[#E5E2FF] transition-colors'
            >
              <div className='mb-2'>
                <FaImage className='w-10 h-10'/>
              </div>
              <div className='text-center'>
                <p className='font-medium'>Drop the images here</p>
                <p className='text-gray-500 text-sm mt-1'>Supports: JPG, JPEG2000, PNG</p>
              </div>
            </div>

            {/* Brand image previews below */}
            {brandImages.length > 0 && (
              <div className='mt-3 flex gap-2 flex-wrap'>
                {brandImages.map((img) => (
                  <div key={img.id} className='relative'>
                    <img src={img.preview} alt='Brand image preview' className='w-20 h-20 object-cover rounded border' />
                    <button
                      onClick={() => removeBrandImage(img.id)}
                      className='absolute top-0 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center hover:bg-red-600'
                    >
                      <FaTrash className='w-3 h-3' />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* File Info and Upload Button for Brand Images */}
            {brandImages.length > 0 && (
              <div className='mt-4 flex items-center justify-between'>
                <div className='text-sm text-gray-600'>
                  <p>Selected: {brandImages.length} image(s)</p>
                  <p>Total Size: {(brandImages.reduce((acc, img) => acc + img.file.size, 0) / 1024).toFixed(2)} KB</p>
                </div>
                <button
                  onClick={handleBrandImagesUpload}
                  className='px-6 py-2 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0066] transition-colors'
                >
                  Upload Brand Images
                </button>
              </div>
            )}
          </div>

          {/* Hidden File Input for Brand Images */}
          <input
            ref={brandFileInputRef}
            type="file"
            accept="image/*"
            multiple
            onChange={handleBrandImageChange}
            className="hidden"
          />
        </div>

        {/* Font Selection Section */}
        <div className='w-full mb-6'>
          <h3 className='text-[16px] font-medium text-gray-800 mb-3'>What is Your Font Style?</h3>
          
          <div className='w-full'>
            {/* Font Dropdown */}
            <div className='relative'>
              <div 
                onClick={() => setIsFontDropdownOpen(!isFontDropdownOpen)}
                className='w-full p-3 border border-gray-300 rounded-lg bg-white cursor-pointer flex items-center justify-between hover:border-gray-400 transition-colors'
              >
                <span className={selectedFonts.length ? 'text-gray-900' : 'text-gray-500'}>
                  {selectedFonts.length ? selectedFonts.join(', ') : 'Choose Fonts'}
                </span>
                <FaChevronDown className={`text-gray-400 transition-transform ${isFontDropdownOpen ? 'rotate-180' : ''}`} />
              </div>
              
              {/* Dropdown Options */}
              {isFontDropdownOpen && (
                <div className='absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-lg z-10 max-h-48 overflow-y-auto'>
                  {fontOptions.map((font) => {
                    const active = selectedFonts.includes(font)
                    return (
                      <div
                        key={font}
                        onClick={() => toggleFontSelect(font)}
                        className={`px-3 py-2 hover:bg-gray-100 cursor-pointer transition-colors flex items-center justify-between ${active ? 'bg-gray-50' : ''}`}
                      >
                        <span>{font}</span>
                        <span className={`text-xs ${active ? 'text-blue-600' : 'text-gray-400'}`}>{active ? 'Selected' : 'Select'}</span>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Next Step Button */}
            <button
              onClick={handleNextStep}
              className='w-full mt-4 px-6 py-3 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0066] transition-colors font-medium'
            >
              Add Fonts
            </button>
          </div>
        </div>

        {/* Voice Over Record Section */}
        <div className='w-full mb-6'>
          <h3 className='text-[16px] font-medium text-gray-800 mb-3'>Record a Voice-over</h3>
          <div className='w-full border border-gray-200 rounded-lg p-4 bg-white'>
            <div className='flex items-center gap-3'>
              {!isRecording ? (
                <button onClick={startRecording} className='px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-lg text-sm font-medium border border-gray-300 flex items-center gap-2'>
                  <FaMicrophone className='w-4 h-4' /> Start Recording
                </button>
              ) : (
                <button onClick={stopRecording} className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium flex items-center gap-2'>
                  <FaStop className='w-4 h-4' /> Stop
                </button>
              )}
              {recordedAudios.length > 0 && (
                <span className='text-sm text-green-700'>Recorded! You can preview below and it will be included on submit.</span>
              )}
            </div>
            {recordedAudios.length > 0 && (
              <div className='mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3'>
                {recordedAudios.map((a, idx) => (
                  <div key={a.id} className='p-2 border rounded-lg'>
                    <div className='flex items-center justify-between mb-1'>
                      <span className='text-sm font-medium'>Recording {idx + 1}</span>
                      <button
                        onClick={() => {
                          try { a.url && URL.revokeObjectURL(a.url) } catch (_) {}
                          setRecordedAudios(prev => prev.filter(x => x.id !== a.id))
                        }}
                        className='text-xs text-red-600 hover:underline'
                      >Remove</button>
                    </div>
                    <audio src={a.url} controls className='w-full' />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Color Selection Section */}
        <div className='w-full mb-6'>
          <h3 className='text-[16px] font-medium text-gray-800 mb-3'>Choose Brand Colors</h3>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6 items-start'>
            {/* Left: Color picker with preview and add */}
            <div className='flex flex-col gap-3'>
              <HexColorPicker color={currentColor} onChange={setCurrentColor} />
              <div className='flex items-center gap-3'>
                <div className='h-8 w-8 rounded-full border' style={{ backgroundColor: currentColor }} />
                <input
                  value={currentColor}
                  onChange={(e) => setCurrentColor(e.target.value)}
                  className='px-3 py-2 border rounded-lg w-40'
                />
                <button
                  type='button'
                  onClick={addCurrentColor}
                  className='px-4 py-2 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0066] transition-colors'
                >
                  Add Color
                </button>
              </div>
            </div>

            {/* Right: Preset and custom colors grid */}
            <div>
              <div className='w-full border border-gray-200 rounded-xl p-4 mb-4'>
                <div className='grid grid-cols-8 gap-2'>
                  {[...presetColors, ...customColors].map((color) => {
                    const isSelected = selectedColors.includes(color)
                    return (
                      <button
                        key={color}
                        onClick={() => toggleColor(color)}
                        className={`w-8 h-8 rounded-full border-2 ${isSelected ? 'border-blue-500 ring-2 ring-blue-300' : 'border-gray-300'} flex items-center justify-center transition-all duration-150`}
                        style={{ backgroundColor: color }}
                        title={color}
                      >
                        {isSelected && <span className='text-white text-xs'>✓</span>}
                      </button>
                    )
                  })}
                </div>
              </div>

              <div className='flex items-center gap-3'>
                <p className='text-gray-700 font-medium'>CUSTOM</p>
                <button
                  onClick={openColorPicker}
                  className='w-8 h-8 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors'
                  title='Pick color'
                >
                  <FaEyeDropper className='w-4 h-4' />
                </button>
                <input ref={colorInputRef} type='color' onChange={handlePickCustomColor} className='hidden' />
              </div>
            </div>
          </div>
        </div>

        <div className='flex justify-end items-center'>
          <button
            onClick={handleSubmit}
            className={`px-6 py-3 text-white rounded-lg transition-colors font-medium ${isSavingAssets ? 'bg-[#9aa0d0] cursor-not-allowed' : 'bg-[#13008B] hover:bg-[#0f0066]'}`}
            disabled={isSavingAssets}
          >
            {isSavingAssets ? 'Saving…' : 'Submit'}
          </button>
        </div>
    </div>
  )
}

export default UserQuestion
