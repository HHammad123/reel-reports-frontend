import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ChevronDown, ChevronLeft, Plus, Mic, Play, Trash2, ZoomIn, Edit2, ImageIcon } from 'lucide-react'
import useBrandAssets from '../../hooks/useBrandAssets'
import CanvasImageEditor from '../ImageEdit/CanvasImageEditor'

const resolveTemplateImageUrl = (item) => {
  if (!item) return ''
  if (typeof item === 'string') return item
  if (typeof item === 'object') {
    if (item.image_url || item.imageUrl) return item.image_url || item.imageUrl
    if (item.url) return item.url
    if (item.src) return item.src
    const baseImage = item.base_image || item.baseImage
    if (typeof baseImage === 'string') return baseImage
    if (baseImage && typeof baseImage === 'object') {
      if (baseImage.image_url || baseImage.imageUrl) return baseImage.image_url || baseImage.imageUrl
      if (baseImage.url) return baseImage.url
      if (baseImage.src) return baseImage.src
    }
    const asset = item.asset || item.media
    if (asset && typeof asset === 'object') {
      if (asset.image_url || asset.imageUrl) return asset.image_url || asset.imageUrl
      if (asset.url) return asset.url
      if (asset.src) return asset.src
    }
  }
  return ''
}

const isPptFile = (file) => {
  if (!file) return false
  const name = (file.name || '').toLowerCase()
  const type = (file.type || '').toLowerCase()
  if (name.endsWith('.ppt') || name.endsWith('.pptx')) return true
  return type === 'application/vnd.ms-powerpoint' || type === 'application/vnd.openxmlformats-officedocument.presentationml.presentation'
}

const formatFileSize = (bytes) => {
  if (!bytes || Number.isNaN(bytes)) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let size = bytes
  let unitIdx = 0
  while (size >= 1024 && unitIdx < units.length - 1) {
    size /= 1024
    unitIdx += 1
  }
  const precision = size >= 10 || unitIdx === 0 ? 0 : 1
  return `${size.toFixed(precision)} ${units[unitIdx]}`
}

const normalizeTemplateEntry = (entry, label, meta = {}) => {
  if (!entry) return null
  const url = resolveTemplateImageUrl(entry)
  if (!url) return null
  if (typeof entry !== 'object') {
    return { url, label, template: null, overlayElements: [], textElements: [], meta, pairImageUrl: null }
  }
  const overlayElements = Array.isArray(entry.overlay_elements)
    ? entry.overlay_elements
    : (Array.isArray(entry.overlayElements)
      ? entry.overlayElements
      : (Array.isArray(entry.overlays) ? entry.overlays : []))
  const textElements = Array.isArray(entry.text_elements)
    ? entry.text_elements
    : (Array.isArray(entry.textElements)
      ? entry.textElements
      : (Array.isArray(entry.texts) ? entry.texts : []))
  const aspect = entry?.aspect_ratio || entry?.ratio || entry?.orientation || meta.aspect || ''
  
  // Extract pair_image URL if it exists
  let pairImageUrl = null
  
  // First check if pair_image is nested inside base_image (most common case)
  if (entry.base_image && typeof entry.base_image === 'object' && entry.base_image.pair_image) {
    const nestedPair = entry.base_image.pair_image
    if (typeof nestedPair === 'string') {
      pairImageUrl = nestedPair
    } else if (typeof nestedPair === 'object') {
      pairImageUrl = nestedPair.image_url || nestedPair.imageUrl || nestedPair.url || null
    }
  }
  
  // If not found, check at template root level
  if (!pairImageUrl) {
    const pairImage = entry.pair_image || entry.pairImage
    if (pairImage) {
      if (typeof pairImage === 'string') {
        pairImageUrl = pairImage
      } else if (typeof pairImage === 'object') {
        pairImageUrl = pairImage.image_url || pairImage.imageUrl || pairImage.url || null
      }
    }
  }
  
  // Debug logging for pair image extraction
  if (pairImageUrl) {
    console.log('✅ Pair image URL extracted:', pairImageUrl, 'for template:', label)
  } else if (entry.base_image?.pair_image || entry.pair_image || entry.pairImage) {
    console.warn('⚠️ Pair image data exists but URL not extracted for template:', label, 'Entry structure:', entry)
  }
  
  return {
    url,
    label,
    template: entry,
    overlayElements,
    textElements,
    meta: { ...meta, aspect },
    pairImageUrl
  }
}

const deriveTemplateImageUrl = (rawEntry, normalizedEntry) => {
  const candidates = [
    normalizedEntry?.url,
    resolveTemplateImageUrl(normalizedEntry?.template),
    resolveTemplateImageUrl(rawEntry),
    rawEntry?.base_image?.image_url,
    rawEntry?.base_image?.url,
    rawEntry?.baseImage?.image_url,
    rawEntry?.baseImage?.url,
    rawEntry?.image_url,
    rawEntry?.imageUrl,
    rawEntry?.url,
    rawEntry?.src
  ]
  const validUrl = candidates.find(url => typeof url === 'string' && url.trim())
  return validUrl ? validUrl.trim() : ''
}

const extractInlineImageData = (imageObj) => {
  if (!imageObj || typeof imageObj !== 'object') return ''
  const dataFields = [
    'data_url', 'dataUrl',
    'image_data', 'imageData',
    'image_base64', 'imageBase64',
    'base64', 'inline_data', 'inlineData'
  ]
  for (const field of dataFields) {
    const value = imageObj[field]
    if (typeof value === 'string' && value.trim()) {
      const trimmed = value.trim()
      if (trimmed.startsWith('data:')) return trimmed
      const base64Pattern = /^[A-Za-z0-9+/=\s]+$/
      if (base64Pattern.test(trimmed) && trimmed.replace(/\s+/g, '').length > 50) {
        return `data:image/png;base64,${trimmed.replace(/\s+/g, '')}`
      }
    }
  }
  return ''
}

const extractTemplateId = (entry) => {
  if (!entry || typeof entry !== 'object') return ''
  const template = entry.template || entry
  const rawId = template?.template_id || template?.templateId || template?.id || ''
  return typeof rawId === 'string' ? rawId.trim() : (rawId ? String(rawId) : '')
}

const collectPlacementTemplates = (tpls) => {
  const arr = Array.isArray(tpls) ? tpls : []
  const out = []
  arr.forEach((item, idx) => {
    if (item && typeof item === 'object' && (item.preset_templates || item.uploaded_templates)) {
      const aspect = item.aspect_ratio || item.ratio || item.orientation || ''
      const baseLabel = aspect ? aspect : `Template Group ${idx + 1}`
      if (Array.isArray(item.preset_templates)) {
        item.preset_templates.forEach((entry, i) => {
          const normalized = normalizeTemplateEntry(entry, `${baseLabel} Preset ${i + 1}`.trim(), {
            parentIndex: idx,
            entryIndex: i,
            groupType: 'preset',
            sourceKey: 'preset_templates'
          })
          if (normalized) out.push(normalized)
        })
      }
      if (Array.isArray(item.uploaded_templates)) {
        item.uploaded_templates.forEach((entry, i) => {
          const normalized = normalizeTemplateEntry(entry, `${baseLabel} Upload ${i + 1}`.trim(), {
            parentIndex: idx,
            entryIndex: i,
            groupType: 'uploaded',
            sourceKey: 'uploaded_templates'
          })
          if (normalized) out.push(normalized)
        })
      }
    } else {
      const normalized = normalizeTemplateEntry(item, `Template ${out.length + 1}`, {
        parentIndex: idx,
        entryIndex: null,
        groupType: 'direct'
      })
      if (normalized) out.push(normalized)
    }
  })
  return out
}

const normalizeSliderKey = (name = '') => {
  return String(name || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

const SLIDER_DEFINITIONS = {
  tone: { left: 'Friendly and energetic', right: 'Formal and professional' },
  warmth: { left: 'Warm, personable', right: 'Reserved, impersonal' },
  humor: { left: 'Playful and witty', right: 'Serious and literal' },
  pace_delivery: { left: 'Slow and relaxed', right: 'Fast and high-energy' },
  pace: { left: 'Slow and relaxed', right: 'Fast and high-energy' },
  directness: { left: 'Indirect, gentle', right: 'Direct, blunt' },
  visual_boldness: { left: 'Subtle and refined', right: 'Bold and striking' },
  risk_profile: { left: 'Trustworthy and dependable', right: 'Adventurous and daring' },
  emotional_character: { left: 'Cheerful and friendly', right: 'Moody and reserved' },
  accessibility: { left: 'Accessible and friendly', right: 'Exclusive and luxurious' },
  sociability: { left: 'Community-oriented, inclusive', right: 'Independent, elite' },
  overall_era_feel: { left: 'Modern and sleek', right: 'Classic and timeless' },
  texture_finish: { left: 'Minimal, flat, matte', right: 'Textured, tactile, rich finishes' },
  color_treatment: { left: 'High-contrast, bold color blocking', right: 'Muted, tonal, restrained palettes' },
  visual_density: { left: 'Clean, airy, lots of white space', right: 'Busy, layered, richly detailed' },
  level_of_detail: { left: 'Simple and symbolic', right: 'Detailed and artistic' },
  realism_vs_abstraction: { left: 'Abstract / geometric icons', right: 'Literal / illustrative icons' },
  line_quality: { left: 'Thin, delicate line work', right: 'Thick, bold strokes' },
  consistency_vs_variance: { left: 'Highly consistent, uniform icon set', right: 'Eclectic, varied iconography with character' },
  primary_motifs: { left: 'Geometric shapes', right: 'Organic, flowing lines' },
  patterns: { left: 'Repetitive, structured patterns', right: 'Irregular, hand-crafted patterns' },
  motion_dynamism: { left: 'Static, stable compositions', right: 'Dynamic, motion-oriented forms' },
  edge_treatment: { left: 'Sharp, angular edges', right: 'Soft, rounded, blobby edges' }
}

const SLIDER_STEPS = [-2, -1, 0, 1, 2]

const formatStepLabel = (value) => (value > 0 ? `+${value}` : `${value}`)

const formatSliderDisplayName = (name = '') => {
  if (!name) return ''
  return String(name)
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
    .trim()
}

const percentToStepValue = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return 0
  const step = Math.round((num - 50) / 25)
  return Math.max(-2, Math.min(2, step))
}

const stepToPercentValue = (step) => {
  const num = Number(step)
  if (Number.isNaN(num)) return 50
  const percent = 50 + num * 25
  return Math.max(0, Math.min(100, percent))
}

const describeSliderSelection = (name, percentValue) => {
  const meta = SLIDER_DEFINITIONS[normalizeSliderKey(name)]
  const step = percentToStepValue(percentValue)
  if (step === 0) return 'Balanced'
  const baseLabel = step > 0 ? (meta?.right || 'More') : (meta?.left || 'Less')
  return Math.abs(step) === 2 ? baseLabel : `${baseLabel} (moderate)`
}

const normalizeDescriptorText = (value = '') =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

const inferStepFromLabel = (name = '', label = '') => {
  const normalizedLabel = normalizeDescriptorText(label)
  if (!normalizedLabel) return null
  if (normalizedLabel.includes('balanced')) return 0
  const meta = SLIDER_DEFINITIONS[normalizeSliderKey(name)] || {}
  const leftKey = normalizeDescriptorText(meta.left || '')
  const rightKey = normalizeDescriptorText(meta.right || '')
  const matchesLeft = leftKey && normalizedLabel.includes(leftKey)
  const matchesRight = rightKey && normalizedLabel.includes(rightKey)
  if (matchesLeft && !matchesRight) return -2
  if (matchesRight && !matchesLeft) return 2
  return null
}

const getStepValueForEntry = (entry = {}) => {
  const inferred = inferStepFromLabel(entry.name, entry.label)
  if (typeof inferred === 'number') return inferred
  return percentToStepValue(entry.percentage)
}

const clampPercent = (value) => {
  const num = Number(value)
  if (Number.isNaN(num)) return 50
  return Math.max(0, Math.min(100, num))
}

const formatSliderEntry = (entry) => {
  if (!entry || typeof entry !== 'object') {
    const name = entry ? String(entry) : ''
    const percentage = 50
    return {
      name,
      percentage,
      label: describeSliderSelection(name, percentage)
    }
  }
  const name = entry.name || entry.label || ''
  const hasPercent =
    Object.prototype.hasOwnProperty.call(entry, 'percentage') &&
    entry.percentage !== null &&
    entry.percentage !== undefined &&
    !Number.isNaN(Number(entry.percentage))
  let percentage = hasPercent ? clampPercent(entry.percentage) : undefined
  let label = entry.label || ''
  const inferredStep = inferStepFromLabel(name, label)
  if (!hasPercent && typeof inferredStep === 'number') {
    percentage = stepToPercentValue(inferredStep)
  }
  if (percentage === undefined) {
    percentage = 50
  }
  if (!label) {
    label = describeSliderSelection(name, percentage)
  }
  return {
    ...entry,
    name,
    percentage,
    label
  }
}

const hydrateSliderList = (list) => {
  return Array.isArray(list) ? list.map(formatSliderEntry) : []
}

const hydrateToneVoiceState = (data = {}) => ({
  context: data.context || '',
  brand_personality: hydrateSliderList(data.brand_personality),
  communication_style_pace: hydrateSliderList(data.communication_style_pace)
})

const hydrateLookFeelState = (data = {}) => ({
  iconography: hydrateSliderList(data.iconography),
  graphic_elements: hydrateSliderList(data.graphic_elements),
  aesthetic_consistency: hydrateSliderList(data.aesthetic_consistency)
})

const extractBoxesFromTemplate = (template) => {
  if (!template || typeof template !== 'object') return []
  const textElements = Array.isArray(template.text_elements)
    ? template.text_elements
    : (Array.isArray(template.textElements) ? template.textElements : [])
  const overlayElements = Array.isArray(template.overlay_elements)
    ? template.overlay_elements
    : (Array.isArray(template.overlayElements) ? template.overlayElements : [])

  const boxes = []
  textElements.forEach((el, index) => {
    const bounding = el?.bounding_box || {}
    const posX = (bounding.x ?? el?.offset?.x ?? 0) * 100
    const posY = (bounding.y ?? el?.offset?.y ?? 0) * 100
    const width = (bounding.width ?? 0) * 100
    const height = (bounding.height ?? 0) * 100
    boxes.push({
      id: `text_${index}_${Date.now()}`,
      type: el?.type || 'headline',
      position: {
        x: parseFloat(posX.toFixed(2)),
        y: parseFloat(posY.toFixed(2)),
        width: parseFloat(width.toFixed(2)),
        height: parseFloat(height.toFixed(2))
      },
      style: {
        font_size: el?.fontSize || el?.style?.font_size || el?.font_size || 24
      }
    })
  })

  overlayElements.forEach((el, index) => {
    const bounding = el?.bounding_box || {}
    const posX = (bounding.x ?? el?.offset?.x ?? 0) * 100
    const posY = (bounding.y ?? el?.offset?.y ?? 0) * 100
    const width = (bounding.width ?? 0) * 100
    const height = (bounding.height ?? 0) * 100
    boxes.push({
      id: `overlay_${index}_${Date.now()}`,
      type: 'overlay',
      position: {
        x: parseFloat(posX.toFixed(2)),
        y: parseFloat(posY.toFixed(2)),
        width: parseFloat(width.toFixed(2)),
        height: parseFloat(height.toFixed(2))
      },
      style: {
        font_size: 16
      }
    })
  })

  return boxes
}

const clonePlacementBoxes = (boxes = []) => {
  return boxes.map((box) => ({
    ...box,
    position: { ...(box.position || {}) },
    style: { ...(box.style || {}) }
  }))
}

const PLACEMENT_TYPE_OPTIONS = [
  { value: 'headline', label: 'Headline', detail: '36px' },
  { value: 'label', label: 'Label', detail: '26px' },
  { value: 'phrase', label: 'Phrase', detail: '18px' },
  { value: 'overlay', label: 'Graphic', detail: 'Overlay' }
]

const fileToDataUrl = (file) => {
  return new Promise((resolve, reject) => {
    try {
      const reader = new FileReader()
      reader.onload = () => resolve(reader.result)
      reader.onerror = () => reject(reader.error || new Error('Failed to read file'))
      reader.readAsDataURL(file)
    } catch (err) {
      reject(err)
    }
  })
}

const VOICEOVER_TONES = [
  { id: 'professional', label: 'Professional', description: 'Polished and confident delivery.' },
  { id: 'humorous', label: 'Humourous', description: 'Light-hearted with playful energy.' },
  { id: 'storytelling', label: 'Storytelling', description: 'Narrative and immersive tone.' },
  { id: 'casual', label: 'Casual', description: 'Conversational and relaxed.' }
]

const VOICEOVER_TONE_SCRIPTS = {
  professional: 'Welcome to our brand. Together, we will explore the excellence and innovation that define everything we do.',
  humorous: 'Great news! We have crafted a brand experience so delightful you may even giggle—on purpose!',
  storytelling: 'Once upon a time, we set out to build something remarkable. This is the story of how that idea became reality.',
  casual: 'Hey there! We are excited you are here. Let us take a moment to chat about what makes our brand your perfect match.'
}

const VOICEOVER_FLOW_STEPS = [
  { id: 'name', label: 'Voice Name' },
  ...VOICEOVER_TONES.map(tone => ({ id: tone.id, label: tone.label })),
  { id: 'complete', label: 'Done' }
]

const Brandimages = () => {
  const fileInputRef = useRef(null)
  const { getBrandProfiles, getBrandProfileById, activateBrandProfile, deleteBrandProfile, getBrandAssetsByUserId, uploadBrandFiles, uploadTemplatesPptx, uploadProfileTemplateImages, uploadVoiceover, updateTemplateElements, updateBrandAssets, updateBrandProfile, analyzeWebsite, createBrandProfile, createBrandProfileQueue, getJobStatus, regenerateTemplates, getTemplateById, replaceTemplateImage, deleteTemplateElements } = useBrandAssets()
  const [logos, setLogos] = useState([])
  const [icons, setIcons] = useState([])
  const [fonts, setFonts] = useState([])
  const [colors, setColors] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [targetType, setTargetType] = useState('logos') // 'logos' | 'icons' | 'templates'
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
  const [draggedColorIndex, setDraggedColorIndex] = useState(null)
  const [isRegeneratingTemplates, setIsRegeneratingTemplates] = useState(false)
  // Generated Assets state
  const [generatedAssets, setGeneratedAssets] = useState({
    generated_images: {},
    generated_videos: {}
  })
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9')
  const [isLoadingGeneratedAssets, setIsLoadingGeneratedAssets] = useState(false)
  const [generatedAssetsError, setGeneratedAssetsError] = useState('')
  const [isLoadingTemplateDetails, setIsLoadingTemplateDetails] = useState(false)
  // Sync states for base/pair image
  const [syncEnabled, setSyncEnabled] = useState(true)
  const [activeImageFormat, setActiveImageFormat] = useState('base') // 'base' or 'pair'
  const [pairImageBoxes, setPairImageBoxes] = useState([])
  // Website analyze modal
  const [isWebsiteModalOpen, setIsWebsiteModalOpen] = useState(false)
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [websiteError, setWebsiteError] = useState('')
  const [profileName, setProfileName] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [isPollingJob, setIsPollingJob] = useState(false)
  const [jobStatus, setJobStatus] = useState('')
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
  const [selectedTemplateAspect, setSelectedTemplateAspect] = useState('')
  const [templateUploadAspect, setTemplateUploadAspect] = useState('')
  const [voiceovers, setVoiceovers] = useState([])
  const [templatePreview, setTemplatePreview] = useState({ url: '', title: '' })
  const [templateUploadMode, setTemplateUploadMode] = useState('image') // 'image' | 'ppt'
  const [convertColors, setConvertColors] = useState(true)
  const [placementTemplates, setPlacementTemplates] = useState([])
  const [placementSelectedIndex, setPlacementSelectedIndex] = useState(0)
  const [isPlacementOverlayOpen, setIsPlacementOverlayOpen] = useState(false)
  const [placementBoxes, setPlacementBoxesState] = useState([])
  const [placementIsDrawing, setPlacementIsDrawing] = useState(false)
  const [placementStartPos, setPlacementStartPos] = useState({ x: 0, y: 0 })
  const [placementCurrentBox, setPlacementCurrentBox] = useState(null)
  const [placementSelectedType, setPlacementSelectedType] = useState('headline')
  const [placementIsDragging, setPlacementIsDragging] = useState(false)
  const [placementDraggedBoxId, setPlacementDraggedBoxId] = useState(null)
  const [placementDragOffset, setPlacementDragOffset] = useState({ x: 0, y: 0 })
  const [placementIsResizing, setPlacementIsResizing] = useState(false)
  const [placementResizeHandle, setPlacementResizeHandle] = useState(null)
  const [placementResizeBoxId, setPlacementResizeBoxId] = useState(null)
  const [placementResizeStartBox, setPlacementResizeStartBox] = useState(null)
  const [placementSelectedBoxId, setPlacementSelectedBoxId] = useState(null)
  const [placementCopiedBox, setPlacementCopiedBox] = useState(null)
  const [placementCursorStyle, setPlacementCursorStyle] = useState('crosshair')
  const [placementImageMetrics, setPlacementImageMetrics] = useState({ width: 0, height: 0 })
  const [isPlacementSaving, setIsPlacementSaving] = useState(false)
  const [placementError, setPlacementError] = useState('')
  const placementCanvasRef = useRef(null)
  const placementImageRef = useRef(null)
  const placementContainerRef = useRef(null)
  const placementCanvasWrapperRef = useRef(null)
  const placementBoxesMapRef = useRef({})
  // Refs for pair image
  const pairCanvasRef = useRef(null)
  const pairImageRef = useRef(null)
  const pairContainerRef = useRef(null)
  const pairCanvasWrapperRef = useRef(null)
  const [pairImageMetrics, setPairImageMetrics] = useState({ width: 0, height: 0 })
  const [pairCursorStyle, setPairCursorStyle] = useState('crosshair')
  const [placementPendingOpen, setPlacementPendingOpen] = useState(false)
  const [isPlacementPromptOpen, setIsPlacementPromptOpen] = useState(false)
  // Voiceover upload/record state
  const [voiceTab, setVoiceTab] = useState('upload') // 'upload' | 'record'
  const mediaRecorderRef = useRef(null)
  const [isRecording, setIsRecording] = useState(false)
  const [recordBlobUrl, setRecordBlobUrl] = useState('')
  const recStreamRef = useRef(null)
  // Record flow state
  const [voiceoverBaseName, setVoiceoverBaseName] = useState('')
  const [voiceWizardStep, setVoiceWizardStep] = useState('name') // name | tone ids | complete

  const updateTemplatesState = useCallback((tpls) => {
    const arr = Array.isArray(tpls) ? tpls : []
    setTemplates(arr)
    const aspectValues = arr
      .filter(item => item && typeof item === 'object')
      .map(item => item.aspect_ratio || item.ratio || item.orientation || '')
      .filter(Boolean)
    setSelectedTemplateAspect(prev => {
      if (prev && aspectValues.includes(prev)) return prev
      return aspectValues.length ? aspectValues[0] : ''
    })
  }, [setSelectedTemplateAspect, setTemplates])

  const syncStateFromProfile = useCallback((profile) => {
    if (!profile || typeof profile !== 'object') return
    const bi = profile.brand_identity || {}
    setTagline(bi.tagline || '')
    setSpacing(bi.spacing || '')
    setCaptionLocation(profile?.caption_location || profile?.brand_identity?.caption_location || '')
    setLogos(bi.logo || [])
    setIcons(bi.icon || bi.icons || [])
    setFonts(bi.fonts || [])
    setColors(bi.colors || [])
    const tv = profile.tone_and_voice || {}
    setToneVoice(hydrateToneVoiceState(tv))
    const lf = profile.look_and_feel || {}
    setLookFeel(hydrateLookFeelState(lf))
    const tpls = profile.template || profile.templates || []
    updateTemplatesState(tpls)
    const vos = profile.voiceover || []
    setVoiceovers(Array.isArray(vos) ? vos : [])
  }, [setCaptionLocation, setColors, setFonts, setIcons, setLogos, setSpacing, setTagline, setToneVoice, setLookFeel, updateTemplatesState, setVoiceovers])
  const [generatedContent, setGeneratedContent] = useState('')
  const [isSavingVoiceover, setIsSavingVoiceover] = useState(false)
  const currentVoiceStepIndex = useMemo(() => {
    const idx = VOICEOVER_FLOW_STEPS.findIndex(step => step.id === voiceWizardStep)
    return idx >= 0 ? idx : 0
  }, [voiceWizardStep])
  const currentVoiceTone = useMemo(() => {
    if (voiceWizardStep === 'name' || voiceWizardStep === 'complete') return null
    const index = VOICEOVER_TONES.findIndex(t => t.id === voiceWizardStep)
    return index >= 0 ? VOICEOVER_TONES[index] : null
  }, [voiceWizardStep])

  useEffect(() => {
    if (currentVoiceTone && !generatedContent) {
      setGeneratedContent(VOICEOVER_TONE_SCRIPTS[currentVoiceTone.id] || '')
    }
  }, [currentVoiceTone, generatedContent])
  // Edit modals for Tone & Voice and Look & Feel
  const [isToneModalOpen, setIsToneModalOpen] = useState(false)
  const [isLookModalOpen, setIsLookModalOpen] = useState(false)
  const [workingTone, setWorkingTone] = useState({ context: '', brand_personality: [], communication_style_pace: [] })
  const [workingLook, setWorkingLook] = useState({ iconography: [], graphic_elements: [], aesthetic_consistency: [] })
  // Delete confirmation modal state
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false)
  const [deleteConfirmData, setDeleteConfirmData] = useState(null)
  const [isDeleting, setIsDeleting] = useState(false)
  // Delete profile confirmation modal state
  const [isDeleteProfileConfirmOpen, setIsDeleteProfileConfirmOpen] = useState(false)
  const [deleteProfileConfirmData, setDeleteProfileConfirmData] = useState(null)
  const [isDeletingProfile, setIsDeletingProfile] = useState(false)
  // Image editor state
  const [imageEditorOpen, setImageEditorOpen] = useState(false)
  const [imageEditorSrc, setImageEditorSrc] = useState('')
  const [imageEditorCallback, setImageEditorCallback] = useState(null)
  const [imageEditorTemplateLabel, setImageEditorTemplateLabel] = useState('')
  const [imageEditorTemplateId, setImageEditorTemplateId] = useState('')
  const [imageEditorAspect, setImageEditorAspect] = useState('')
  const [isPreparingImageEditor, setIsPreparingImageEditor] = useState(false)
  const [isSavingImageEditor, setIsSavingImageEditor] = useState(false)
  const activePlacement = placementTemplates.length
    ? placementTemplates[Math.min(placementSelectedIndex, placementTemplates.length - 1)]
    : null

  const resetVoiceoverFlow = useCallback(() => {
    try {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
        mediaRecorderRef.current.stop()
      }
    } catch (_) { /* noop */ }
    try {
      (recStreamRef.current?.getTracks() || []).forEach(track => track.stop())
    } catch (_) { /* noop */ }
    if (recordBlobUrl) {
      try { URL.revokeObjectURL(recordBlobUrl) } catch (_) { /* noop */ }
    }
    try { (previewUrls || []).forEach(url => { try { URL.revokeObjectURL(url) } catch (_) { /* noop */ } }) } catch (_) { /* noop */ }
    setIsRecording(false)
    setVoiceWizardStep('name')
    setVoiceoverBaseName('')
    setGeneratedContent('')
    setRecordBlobUrl('')
    setSelectedFiles([])
    setPreviewUrls([])
    setErrorMsg('')
    setIsSavingVoiceover(false)
  }, [previewUrls, recordBlobUrl])

  const handleVoiceoverSave = useCallback(async () => {
    const userId = localStorage.getItem('token') || ''
    const profileId = selectedProfileId
    const tone = currentVoiceTone

    if (!tone) {
      setErrorMsg('No tone selected for recording.')
      return
    }
    if (!userId || !profileId) {
      setErrorMsg('Missing user or profile information.')
      return
    }
    if (!selectedFiles.length) {
      setErrorMsg('Please record this tone before saving.')
      return
    }

    const rawBaseName = typeof voiceoverBaseName === 'string' ? voiceoverBaseName : ''
    const baseName = (rawBaseName || 'Brand Voice').trim()

    setIsSavingVoiceover(true)
    try {
      // Send MP3 file directly to upload-voiceover API
      await uploadVoiceover({
        userId,
        profileId,
        name: baseName,
        type: tone.id, // Use the actual tone ID (professional, humorous, storytelling, casual)
        file: selectedFiles[0]
      })

      const refreshed = await getBrandProfileById({ userId, profileId })
      const updatedVoiceovers = refreshed?.voiceover || []
      setVoiceovers(Array.isArray(updatedVoiceovers) ? updatedVoiceovers : [])

      // Prepare for next tone or completion
      const currentIndex = VOICEOVER_TONES.findIndex(t => t.id === tone.id)
      const nextTone = VOICEOVER_TONES[currentIndex + 1]

      setSelectedFiles([])
      setPreviewUrls([])
      if (recordBlobUrl) { try { URL.revokeObjectURL(recordBlobUrl) } catch (_) {} }
      setRecordBlobUrl('')

      if (nextTone) {
        setVoiceWizardStep(nextTone.id)
        setGeneratedContent(VOICEOVER_TONE_SCRIPTS[nextTone.id] || '')
      } else {
        setVoiceWizardStep('complete')
      }

      setErrorMsg('')
    } catch (err) {
      setErrorMsg(err?.message || 'Failed to save voiceover')
    } finally {
      setIsSavingVoiceover(false)
    }
  }, [currentVoiceTone, voiceoverBaseName, selectedFiles, uploadVoiceover, selectedProfileId, getBrandProfileById, recordBlobUrl])

  useEffect(() => {
    if (!isModalOpen || voiceWizardStep !== 'complete') return
    const timer = setTimeout(() => {
      resetVoiceoverFlow()
      setIsModalOpen(false)
    }, 1500)
    return () => clearTimeout(timer)
  }, [isModalOpen, voiceWizardStep, resetVoiceoverFlow])

  // Ensure pair image URL is always extracted from template structure if missing
  const activePlacementWithPair = useMemo(() => {
    if (!activePlacement) return null
    
    // If pairImageUrl already exists, return as is
    if (activePlacement.pairImageUrl) return activePlacement
    
    // Try to extract pair image from template structure
    let pairImageUrl = null
    const template = activePlacement.template
    
    if (template?.base_image?.pair_image) {
      const pairImage = template.base_image.pair_image
      if (typeof pairImage === 'string') {
        pairImageUrl = pairImage
      } else if (typeof pairImage === 'object') {
        pairImageUrl = pairImage.image_url || pairImage.imageUrl || pairImage.url || null
      }
    }
    
    // If still not found, check at template root level
    if (!pairImageUrl && (template?.pair_image || template?.pairImage)) {
      const pairImage = template.pair_image || template.pairImage
      if (typeof pairImage === 'string') {
        pairImageUrl = pairImage
      } else if (typeof pairImage === 'object') {
        pairImageUrl = pairImage.image_url || pairImage.imageUrl || pairImage.url || null
      }
    }
    
    // Return activePlacement with pairImageUrl if found
    if (pairImageUrl) {
      return { ...activePlacement, pairImageUrl }
    }
    
    return activePlacement
  }, [activePlacement])

  const resetPlacementEditor = () => {
    placementBoxesMapRef.current = {}
    setPlacementBoxesState([])
    setPairImageBoxes([])
    setPlacementIsDrawing(false)
    setPlacementStartPos({ x: 0, y: 0 })
    setPlacementCurrentBox(null)
    setPlacementIsDragging(false)
    setPlacementDraggedBoxId(null)
    setPlacementDragOffset({ x: 0, y: 0 })
    setPlacementIsResizing(false)
    setPlacementResizeHandle(null)
    setPlacementResizeBoxId(null)
    setPlacementResizeStartBox(null)
    setPlacementSelectedBoxId(null)
    setPlacementCopiedBox(null)
    setPlacementCursorStyle('crosshair')
    setPlacementSelectedType('headline')
    setPlacementImageMetrics({ width: 0, height: 0 })
    setPlacementError('')
    setActiveImageFormat('base')
    setSyncEnabled(true)
    try {
      if (placementCanvasWrapperRef.current) {
        placementCanvasWrapperRef.current.style.width = ''
        placementCanvasWrapperRef.current.style.height = ''
      }
    } catch (_) { /* noop */ }
  }

  const handleImageEdit = useCallback(({ imageUrl, label = '', onSave }) => {
    console.log('========================================')
    console.log('=== HANDLE IMAGE EDIT CALLED ===')
    console.log('========================================')
    console.log('Image URL:', imageUrl)
    console.log('Template Label:', label)
    
    const cleanUrl = typeof imageUrl === 'string' ? imageUrl.trim() : ''
    
    if (!cleanUrl) {
      console.error('❌ Empty or invalid image URL')
      alert('Cannot edit: Image URL is empty or invalid')
      return
    }
    
    console.log('✅ Opening image editor with URL:', cleanUrl)
    
    setImageEditorSrc(cleanUrl)
    setImageEditorTemplateLabel(label)
    setImageEditorCallback(() => (typeof onSave === 'function' ? onSave : null))
    setImageEditorOpen(true)
  }, [])

  const fetchTemplateBaseImageUrl = useCallback(async (templateEntry) => {
    if (!templateEntry || !templateEntry.template) return ''
    const templateId = templateEntry.template.template_id || templateEntry.template.templateId || templateEntry.template.id
    if (!templateId) return ''
    const userId = localStorage.getItem('token') || ''
    const profileId = selectedProfileId
    if (!userId || !profileId) {
      console.warn('Missing user or profile information when fetching template image URL')
      return ''
    }
    try {
      const apiResponse = await getTemplateById({
        userId,
        profileId,
        templateId
      })
      const templateDetails = (apiResponse?.template && typeof apiResponse.template === 'object')
        ? apiResponse.template
        : ((apiResponse?.data && typeof apiResponse.data === 'object')
          ? apiResponse.data
          : apiResponse)
      if (!templateDetails || typeof templateDetails !== 'object') {
        console.warn('Template details response invalid for image edit', apiResponse)
        return ''
      }
      const baseImage = templateDetails.base_image || templateDetails.baseImage
      const inlineDataUrl = extractInlineImageData(baseImage || templateDetails)
      if (inlineDataUrl) return inlineDataUrl
      const baseImageUrl = resolveTemplateImageUrl(baseImage)
      const directUrl = resolveTemplateImageUrl(templateDetails)
      const finalUrl = baseImageUrl || directUrl || ''
      if (!finalUrl) {
        console.warn('No usable image URL returned from template API response', templateDetails)
      }
      return finalUrl
    } catch (error) {
      console.error('Failed to fetch template details for image editing', error)
      return ''
    }
  }, [getTemplateById, selectedProfileId])

  const fetchImageAsDataUrl = useCallback(async (url) => {
    if (!url) return ''
    if (/^data:/i.test(url)) return url
    if (typeof window === 'undefined') return ''
    try {
      const resp = await fetch('/image-proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url })
      })
      if (!resp.ok) {
        const errorPayload = await resp.json().catch(() => ({}))
        const message = errorPayload?.error || `Image proxy request failed with status ${resp.status}`
        throw new Error(message)
      }
      const payload = await resp.json()
      if (!payload?.dataUrl || typeof payload.dataUrl !== 'string') {
        throw new Error('Image proxy did not return a valid data URL')
      }
      return payload.dataUrl
    } catch (error) {
      console.error('Failed to fetch image via proxy', error)
      throw error
    }
  }, [])

  const openImageEditorForEntry = useCallback(async ({ templateEntry, fallbackUrl = '', label = '', onSave }) => {
    const templateId = extractTemplateId(templateEntry)
    if (!templateId) {
      console.warn('Template ID missing while opening image editor', templateEntry)
    }
    setImageEditorTemplateId(templateId)
    const derivedLabel = label || templateEntry?.label || templateEntry?.template?.label || ''
    setImageEditorTemplateLabel(derivedLabel)
    const aspect = templateEntry?.meta?.aspect || templateEntry?.template?.aspect_ratio || ''
    setImageEditorAspect(aspect || '')
    setIsPreparingImageEditor(true)
    try {
      let editorUrl = fallbackUrl || ''
      if (templateEntry?.template) {
        const fetchedUrl = await fetchTemplateBaseImageUrl(templateEntry)
        if (fetchedUrl) editorUrl = fetchedUrl
      }
      if (!editorUrl) {
        throw new Error('Template image URL is missing.')
      }
      const dataUrl = await fetchImageAsDataUrl(editorUrl)
      handleImageEdit({ imageUrl: dataUrl, label: derivedLabel, onSave })
    } catch (error) {
      console.error('Unable to open image editor', error)
      alert(error?.message || 'Failed to load template image for editing.')
      setImageEditorTemplateId('')
      setImageEditorTemplateLabel('')
      setImageEditorAspect('')
    } finally {
      setIsPreparingImageEditor(false)
    }
  }, [fetchImageAsDataUrl, fetchTemplateBaseImageUrl, handleImageEdit])

  const handleImageEditorSave = useCallback(async ({ file, dataUrl, blob, fileName }) => {
    const userId = localStorage.getItem('token') || ''
    if (!userId) {
      throw new Error('Unable to identify user. Please sign in again.')
    }
    if (!selectedProfileId) {
      throw new Error('Please select a brand profile before saving.')
    }
    if (!imageEditorTemplateId) {
      throw new Error('Template information not available for this edit.')
    }
    if (!file) {
      throw new Error('Edited image file is missing. Please try saving again.')
    }
    try {
      setIsSavingImageEditor(true)
      await replaceTemplateImage({
        userId,
        profileId: selectedProfileId,
        templateId: imageEditorTemplateId,
        file,
        fileName
      })
      try {
        await getBrandAssetsByUserId(userId)
      } catch (refreshError) {
        console.warn('Failed to refresh brand assets after image update', refreshError)
      }
      try {
        const refreshedProfile = await getBrandProfileById({ userId, profileId: selectedProfileId })
        syncStateFromProfile(refreshedProfile)
      } catch (profileRefreshError) {
        console.warn('Failed to refresh profile after image update', profileRefreshError)
      }
      if (imageEditorCallback) {
        try {
          await imageEditorCallback({ file, dataUrl, blob, fileName })
        } catch (callbackError) {
          console.warn('Image editor callback error', callbackError)
        }
      }
      setImageEditorOpen(false)
      setImageEditorSrc('')
      setImageEditorCallback(null)
      setImageEditorTemplateLabel('')
      setImageEditorTemplateId('')
      setImageEditorAspect('')
    } catch (error) {
      console.error('Failed to replace template image', error)
      const message = error?.message || 'Failed to save edited image.'
      throw new Error(message)
    } finally {
      setIsSavingImageEditor(false)
    }
  }, [getBrandAssetsByUserId, getBrandProfileById, imageEditorCallback, imageEditorTemplateId, replaceTemplateImage, selectedProfileId, syncStateFromProfile])

  // Sync helper functions for base/pair images
  const mapPositionToOtherFormat = (position) => {
    // Positions are percentages, so they map directly between formats
    return {
      x: position.x,
      y: position.y,
      width: position.width,
      height: position.height
    }
  }

  const createSyncedBox = useCallback((sourceBox, sourceFormat) => {
    if (!syncEnabled) return
    
    const targetFormat = sourceFormat === 'base' ? 'pair' : 'base'
    const targetBoxes = targetFormat === 'base' ? placementBoxes : pairImageBoxes
    const setTargetBoxes = targetFormat === 'base' ? setPlacementBoxesState : setPairImageBoxes
    
    const mappedPosition = mapPositionToOtherFormat(sourceBox.position)
    const syncedBoxId = `${sourceBox.id}_${targetFormat}`
    
    const syncedBox = {
      ...sourceBox,
      id: syncedBoxId,
      position: mappedPosition,
      synced_with: sourceBox.id
    }
    
    // Update source box to reference the synced box
    if (sourceFormat === 'base') {
      setPlacementBoxesState(prev => prev.map(box => 
        box.id === sourceBox.id ? { ...box, synced_with: syncedBoxId } : box
      ))
    } else {
      setPairImageBoxes(prev => prev.map(box => 
        box.id === sourceBox.id ? { ...box, synced_with: syncedBoxId } : box
      ))
    }
    
    // Add to target format
    setTargetBoxes(prev => [...prev, syncedBox])
  }, [syncEnabled, placementBoxes, pairImageBoxes])

  const syncBoxToOtherFormat = useCallback((boxId, updatedBox, sourceFormat) => {
    if (!syncEnabled || !updatedBox.synced_with) return
    
    const targetFormat = sourceFormat === 'base' ? 'pair' : 'base'
    const setTargetBoxes = targetFormat === 'base' ? setPlacementBoxesState : setPairImageBoxes
    
    const mappedPosition = mapPositionToOtherFormat(updatedBox.position)
    const syncedBoxId = updatedBox.synced_with
    
    setTargetBoxes(prev => prev.map(box => {
      if (box.id === syncedBoxId) {
        return {
          ...box,
          position: mappedPosition,
          style: { ...updatedBox.style }
        }
      }
      return box
    }))
  }, [syncEnabled, setPlacementBoxesState])

  const updatePlacementBoxes = useCallback((valueOrUpdater) => {
    setPlacementBoxesState((prev) => {
      const next = typeof valueOrUpdater === 'function' ? valueOrUpdater(prev) : valueOrUpdater
      const normalized = Array.isArray(next) ? next : []
      const cloned = clonePlacementBoxes(normalized)
      placementBoxesMapRef.current[placementSelectedIndex] = cloned
      return cloned
    })
  }, [placementSelectedIndex])

  const applyPptPlacementTemplates = (tpls, previousUrls = []) => {
    const all = collectPlacementTemplates(tpls).filter(entry =>
      entry.template && entry.overlayElements.length === 0 && entry.textElements.length === 0
    )
    
    // Log template data to verify pair images are extracted
    console.log('📦 PPTX Templates collected:', all.length)
    console.log('📦 Raw templates structure:', tpls)
    
    // Enhanced pair image extraction for PPTX templates
    const enhancedAll = all.map((entry, idx) => {
      console.log(`Template ${idx + 1}:`, {
        label: entry.label,
        url: entry.url,
        pairImageUrl: entry.pairImageUrl,
        hasBaseImage: !!entry.template?.base_image,
        hasPairImage: !!entry.template?.base_image?.pair_image,
        templateStructure: entry.template
      })
      
      // If pair image URL is missing, try comprehensive extraction
      if (!entry.pairImageUrl) {
        let extractedPairUrl = null
        const template = entry.template
        
        // Method 1: Check base_image.pair_image (most common)
        if (template?.base_image?.pair_image) {
          const pairImage = template.base_image.pair_image
          if (typeof pairImage === 'string') {
            extractedPairUrl = pairImage
          } else if (typeof pairImage === 'object') {
            extractedPairUrl = pairImage.image_url || pairImage.imageUrl || pairImage.url || pairImage.src || null
          }
        }
        
        // Method 2: Check at template root level
        if (!extractedPairUrl && (template?.pair_image || template?.pairImage)) {
          const pairImage = template.pair_image || template.pairImage
          if (typeof pairImage === 'string') {
            extractedPairUrl = pairImage
          } else if (typeof pairImage === 'object') {
            extractedPairUrl = pairImage.image_url || pairImage.imageUrl || pairImage.url || pairImage.src || null
          }
        }
        
        // Method 3: Deep search in template structure
        if (!extractedPairUrl) {
          const deepSearch = (obj, depth = 0, maxDepth = 5) => {
            if (depth > maxDepth || !obj || typeof obj !== 'object') return null
            const urlProps = ['image_url', 'imageUrl', 'url', 'src', 'href', 'link']
            for (const prop of urlProps) {
              if (obj[prop] && typeof obj[prop] === 'string' && obj[prop].trim() !== '' && obj[prop] !== entry.url) {
                return obj[prop].trim()
              }
            }
            for (const key in obj) {
              if (key.toLowerCase().includes('pair') && typeof obj[key] === 'object') {
                const found = deepSearch(obj[key], depth + 1, maxDepth)
                if (found) return found
              }
            }
            return null
          }
          extractedPairUrl = deepSearch(template)
        }
        
        if (extractedPairUrl) {
          entry.pairImageUrl = extractedPairUrl
          console.log(`✅ Extracted pair image URL for template ${idx + 1}:`, extractedPairUrl)
        } else {
          console.warn(`⚠️ No pair image found for template ${idx + 1}:`, entry.label)
        }
      }
      
      return entry
    })
    
    const prevSet = new Set((previousUrls || []).filter(Boolean))
    const fresh = prevSet.size ? enhancedAll.filter(item => !prevSet.has(item.url)) : enhancedAll
    setPlacementTemplates(fresh)
    setPlacementSelectedIndex(0)
    setTemplatePreview({ url: '', title: '' })
    setIsPlacementOverlayOpen(false)
    setPlacementPendingOpen(false)
    setIsPlacementPromptOpen(enhancedAll.length > 0)
    resetPlacementEditor()
    setPlacementError('')
  }

  const resetPlacementState = () => {
    setPlacementTemplates([])
    setPlacementSelectedIndex(0)
    setIsPlacementOverlayOpen(false)
    setTemplatePreview({ url: '', title: '' })
    setPlacementPendingOpen(false)
    setIsPlacementPromptOpen(false)
    resetPlacementEditor()
  }

  const openTemplateEditor = (normalizedEntry) => {
    if (!normalizedEntry || !normalizedEntry.template) return
    setPlacementTemplates([normalizedEntry])
    setPlacementSelectedIndex(0)
    setTemplatePreview({ url: '', title: '' })
    resetPlacementEditor()
    setPlacementError('')
    setPlacementPendingOpen(false)
    setIsPlacementPromptOpen(false)
    setIsPlacementOverlayOpen(true)
  }

  const updatePlacementImageMetrics = () => {
    try {
      const img = placementImageRef.current
      const canvas = placementCanvasRef.current
      const wrapper = placementCanvasWrapperRef.current
      if (!img || !canvas || !wrapper) return
      const imgRect = img.getBoundingClientRect()
      const displayWidth = imgRect.width
      const displayHeight = imgRect.height
      const logicalWidth = Math.max(Math.round(displayWidth), 1)
      const logicalHeight = Math.max(Math.round(displayHeight), 1)
      const wrapperStyle = wrapper.style
      wrapperStyle.width = `${displayWidth}px`
      wrapperStyle.height = `${displayHeight}px`
      const canvasStyle = canvas.style
      canvasStyle.width = `${displayWidth}px`
      canvasStyle.height = `${displayHeight}px`
      canvas.width = logicalWidth
      canvas.height = logicalHeight
      setPlacementImageMetrics({ width: displayWidth, height: displayHeight })
    } catch (_) { /* noop */ }
  }

  const updatePairImageMetrics = () => {
    try {
      const img = pairImageRef.current
      const canvas = pairCanvasRef.current
      const wrapper = pairCanvasWrapperRef.current
      if (!img || !canvas || !wrapper) return
      const imgRect = img.getBoundingClientRect()
      const displayWidth = imgRect.width
      const displayHeight = imgRect.height
      const logicalWidth = Math.max(Math.round(displayWidth), 1)
      const logicalHeight = Math.max(Math.round(displayHeight), 1)
      const wrapperStyle = wrapper.style
      wrapperStyle.width = `${displayWidth}px`
      wrapperStyle.height = `${displayHeight}px`
      const canvasStyle = canvas.style
      canvasStyle.width = `${displayWidth}px`
      canvasStyle.height = `${displayHeight}px`
      canvas.width = logicalWidth
      canvas.height = logicalHeight
      setPairImageMetrics({ width: displayWidth, height: displayHeight })
    } catch (_) { /* noop */ }
  }

  useEffect(() => {
    const currentMap = placementBoxesMapRef.current
    const nextMap = {}
    placementTemplates.forEach((entry, idx) => {
      if (currentMap[idx]) {
        nextMap[idx] = currentMap[idx]
      } else if (entry?.template) {
        // Extract boxes from base image
        const baseBoxes = clonePlacementBoxes(extractBoxesFromTemplate(entry.template))
        console.log(`📦 Template ${idx}: Extracted ${baseBoxes.length} boxes from base image`)
        console.log(`📦 Template ${idx}: Text elements:`, entry.template.text_elements?.length || 0)
        console.log(`📦 Template ${idx}: Overlay elements:`, entry.template.overlay_elements?.length || 0)
        
        // Extract boxes from pair image if it exists
        let pairBoxes = []
        if (entry.template.base_image?.pair_image) {
          const pairImageData = entry.template.base_image.pair_image
          pairBoxes = clonePlacementBoxes(extractBoxesFromTemplate(pairImageData))
          console.log(`📦 Template ${idx}: Extracted ${pairBoxes.length} boxes from pair image`)
        }
        
        // If both have boxes, create sync links
        if (baseBoxes.length > 0 && pairBoxes.length > 0 && baseBoxes.length === pairBoxes.length) {
          // Link the boxes together
          baseBoxes.forEach((box, i) => {
            const pairBox = pairBoxes[i]
            if (pairBox) {
              box.synced_with = pairBox.id
              pairBox.synced_with = box.id
            }
          })
          console.log(`📦 Template ${idx}: Linked ${baseBoxes.length} boxes between base and pair`)
        } else if (baseBoxes.length > 0 && entry.pairImageUrl) {
          // If only base has boxes and pair image exists, they will be synced later
          console.log(`📦 Template ${idx}: Base has ${baseBoxes.length} boxes, will sync to pair image`)
        }
        
        nextMap[idx] = { baseBoxes, pairBoxes }
      } else {
        nextMap[idx] = { baseBoxes: [], pairBoxes: [] }
      }
    })
    placementBoxesMapRef.current = nextMap
  }, [placementTemplates])

  useEffect(() => {
    if (!placementTemplates.length) {
      setIsPlacementPromptOpen(false)
      setPlacementPendingOpen(false)
    }
  }, [placementTemplates])

  useEffect(() => {
    if (isPlacementOverlayOpen) {
      setIsPlacementPromptOpen(false)
    }
  }, [isPlacementOverlayOpen])

  useEffect(() => {
    if (!placementPendingOpen) return
    if (!placementTemplates.length) return
    setIsPlacementOverlayOpen(true)
    setPlacementPendingOpen(false)
  }, [placementPendingOpen, placementTemplates])

  useEffect(() => {
    if (!isPlacementOverlayOpen || !activePlacementWithPair) return
    
    // Log active placement details when overlay opens
    console.log('🎯 Placement Overlay Opened:', {
      label: activePlacementWithPair.label,
      url: activePlacementWithPair.url,
      pairImageUrl: activePlacementWithPair.pairImageUrl,
      hasPairImage: !!activePlacementWithPair.pairImageUrl,
      templateStructure: activePlacementWithPair.template
    })
    
    const idx = placementSelectedIndex
    const map = placementBoxesMapRef.current
    if (idx === undefined || idx === null) return
    
    // Initialize base image boxes
    if (!map[idx]) {
      const extracted = activePlacementWithPair.template
        ? clonePlacementBoxes(extractBoxesFromTemplate(activePlacementWithPair.template))
        : []
      console.log('📦 Extracted boxes from template:', extracted.length, 'boxes')
      console.log('📦 Boxes details:', extracted)
      map[idx] = { baseBoxes: extracted, pairBoxes: [] }
    }
    
    // Handle legacy format (single array) vs new format (object with baseBoxes and pairBoxes)
    let baseBoxes, pairBoxes
    if (map[idx] && typeof map[idx] === 'object' && map[idx].baseBoxes) {
      baseBoxes = clonePlacementBoxes(map[idx].baseBoxes || [])
      pairBoxes = clonePlacementBoxes(map[idx].pairBoxes || [])
    } else if (Array.isArray(map[idx])) {
      // Legacy format - single array
      baseBoxes = clonePlacementBoxes(map[idx])
      pairBoxes = []
    } else {
      baseBoxes = []
      pairBoxes = []
    }
    
    // Set base image boxes
    setPlacementBoxesState(baseBoxes)
    
    // If pair image exists and we don't have pair boxes yet, auto-sync from base boxes
    if (activePlacementWithPair.pairImageUrl && pairBoxes.length === 0 && baseBoxes.length > 0 && syncEnabled) {
      // Create synced boxes for pair image
      const syncedPairBoxes = baseBoxes.map((box) => {
        const syncedBoxId = `${box.id}_pair`
        return {
          ...box,
          id: syncedBoxId,
          position: mapPositionToOtherFormat(box.position),
          synced_with: box.id
        }
      })
      
      // Update base boxes with synced_with references
      const updatedBaseBoxes = baseBoxes.map((box, index) => ({
        ...box,
        synced_with: syncedPairBoxes[index]?.id || null
      }))
      
      setPlacementBoxesState(updatedBaseBoxes)
      setPairImageBoxes(syncedPairBoxes)
      
      // Update map to include pair boxes
      map[idx] = { baseBoxes: updatedBaseBoxes, pairBoxes: syncedPairBoxes }
    } else {
      // Use existing pair boxes if available
      setPairImageBoxes(pairBoxes)
    }
    
    setPlacementSelectedBoxId(null)
    setPlacementCopiedBox(null)
    setPlacementCurrentBox(null)
    setPlacementIsDrawing(false)
    setTimeout(updatePlacementImageMetrics, 0)
  }, [isPlacementOverlayOpen, placementSelectedIndex, activePlacementWithPair, syncEnabled])

  useEffect(() => {
    if (!isPlacementOverlayOpen) return
    updatePlacementImageMetrics()
    const handleResize = () => updatePlacementImageMetrics()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isPlacementOverlayOpen, activePlacement])

  useEffect(() => {
    if (!isPlacementOverlayOpen) return
    setTimeout(updatePlacementImageMetrics, 0)
  }, [isPlacementOverlayOpen, placementSelectedIndex, placementTemplates])

  useEffect(() => {
    if (!isPlacementOverlayOpen || !activePlacementWithPair?.pairImageUrl) return
    const handleResize = () => updatePairImageMetrics()
    window.addEventListener('resize', handleResize)
    setTimeout(updatePairImageMetrics, 0)
    return () => window.removeEventListener('resize', handleResize)
  }, [isPlacementOverlayOpen, activePlacementWithPair, placementSelectedIndex, placementTemplates])

  useEffect(() => {
    if (!isPlacementOverlayOpen) return
    const canvas = placementCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const colorMap = {
      headline: '#FF6B6B',
      label: '#4ECDC4',
      phrase: '#FFE66D',
      overlay: '#9B59B6'
    }
    placementBoxes.forEach((box) => {
      const x = placementPercentToPixel(box.position.x, true)
      const y = placementPercentToPixel(box.position.y, false)
      const width = placementPercentToPixel(box.position.width, true)
      const height = placementPercentToPixel(box.position.height, false)
      const color = colorMap[box.type] || '#4B5563'
      const isActive = placementSelectedBoxId === box.id || (placementIsDragging && placementDraggedBoxId === box.id) || (placementIsResizing && placementResizeBoxId === box.id)
      ctx.strokeStyle = color
      ctx.lineWidth = isActive ? 3 : 2
      ctx.strokeRect(x, y, width, height)
      if (isActive) {
        ctx.fillStyle = `${color}33`
        ctx.fillRect(x, y, width, height)
      }
      if (isActive || (!placementIsDrawing && !placementIsDragging && !placementIsResizing)) {
        const handleSize = 8
        ctx.fillStyle = color
        const handles = [
          [x, y],
          [x + width, y],
          [x, y + height],
          [x + width, y + height],
          [x + width / 2, y],
          [x + width / 2, y + height],
          [x, y + height / 2],
          [x + width, y + height / 2]
        ]
        handles.forEach(([hx, hy]) => {
          ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize)
        })
      }
      ctx.fillStyle = color
      ctx.font = '12px Inter'
      ctx.fillText(`${box.type} (${box.style.font_size}px)${isActive ? ' • selected' : ''}`, x + 5, y + 15)
    })
    if (placementCurrentBox && placementIsDrawing) {
      ctx.strokeStyle = colorMap[placementSelectedType] || '#4B5563'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(placementCurrentBox.x, placementCurrentBox.y, placementCurrentBox.width, placementCurrentBox.height)
      ctx.setLineDash([])
    }
  }, [isPlacementOverlayOpen, placementBoxes, placementCurrentBox, placementIsDrawing, placementSelectedType, placementIsDragging, placementDraggedBoxId, placementIsResizing, placementResizeBoxId, placementSelectedBoxId])

  // Draw boxes on pair canvas
  useEffect(() => {
    if (!isPlacementOverlayOpen || !activePlacementWithPair?.pairImageUrl) return
    const canvas = pairCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    const colorMap = {
      headline: '#FF6B6B',
      label: '#4ECDC4',
      phrase: '#FFE66D',
      overlay: '#9B59B6'
    }
    
    const pairPercentToPixel = (percent, isWidth) => {
      const base = isWidth ? pairImageMetrics.width : pairImageMetrics.height
      if (!base) return 0
      return (percent / 100) * base
    }
    
    pairImageBoxes.forEach((box) => {
      const x = pairPercentToPixel(box.position.x, true)
      const y = pairPercentToPixel(box.position.y, false)
      const width = pairPercentToPixel(box.position.width, true)
      const height = pairPercentToPixel(box.position.height, false)
      const color = colorMap[box.type] || '#4B5563'
      const isActive = activeImageFormat === 'pair' && (placementSelectedBoxId === box.id || (placementIsDragging && placementDraggedBoxId === box.id) || (placementIsResizing && placementResizeBoxId === box.id))
      ctx.strokeStyle = color
      ctx.lineWidth = isActive ? 3 : 2
      ctx.strokeRect(x, y, width, height)
      if (isActive) {
        ctx.fillStyle = `${color}33`
        ctx.fillRect(x, y, width, height)
      }
      if (isActive || (activeImageFormat === 'pair' && !placementIsDrawing && !placementIsDragging && !placementIsResizing)) {
        const handleSize = 8
        ctx.fillStyle = color
        const handles = [
          [x, y],
          [x + width, y],
          [x, y + height],
          [x + width, y + height],
          [x + width / 2, y],
          [x + width / 2, y + height],
          [x, y + height / 2],
          [x + width, y + height / 2]
        ]
        handles.forEach(([hx, hy]) => {
          ctx.fillRect(hx - handleSize / 2, hy - handleSize / 2, handleSize, handleSize)
        })
      }
      ctx.fillStyle = color
      ctx.font = '12px Inter'
      ctx.fillText(`${box.type} (${box.style.font_size}px)${isActive ? ' • selected' : ''}`, x + 5, y + 15)
    })
    if (placementCurrentBox && placementIsDrawing && activeImageFormat === 'pair') {
      ctx.strokeStyle = colorMap[placementSelectedType] || '#4B5563'
      ctx.lineWidth = 2
      ctx.setLineDash([5, 5])
      ctx.strokeRect(placementCurrentBox.x, placementCurrentBox.y, placementCurrentBox.width, placementCurrentBox.height)
      ctx.setLineDash([])
    }
  }, [isPlacementOverlayOpen, pairImageBoxes, placementCurrentBox, placementIsDrawing, placementSelectedType, placementIsDragging, placementDraggedBoxId, placementIsResizing, placementResizeBoxId, placementSelectedBoxId, activeImageFormat, activePlacementWithPair?.pairImageUrl, pairImageMetrics])

  const placementGetMousePos = (e) => {
    const canvasRect = placementCanvasRef.current?.getBoundingClientRect()
    const metrics = placementImageMetrics
    if (!canvasRect || !metrics.width || !metrics.height) return { x: 0, y: 0 }
    const x = Math.min(Math.max(e.clientX - canvasRect.left, 0), metrics.width)
    const y = Math.min(Math.max(e.clientY - canvasRect.top, 0), metrics.height)
    return { x, y }
  }

  const pairGetMousePos = (e) => {
    const canvasRect = pairCanvasRef.current?.getBoundingClientRect()
    const metrics = pairImageMetrics
    if (!canvasRect || !metrics.width || !metrics.height) return { x: 0, y: 0 }
    const x = Math.min(Math.max(e.clientX - canvasRect.left, 0), metrics.width)
    const y = Math.min(Math.max(e.clientY - canvasRect.top, 0), metrics.height)
    return { x, y }
  }

  const placementPercentToPixel = (percent, isWidth) => {
    const base = isWidth ? placementImageMetrics.width : placementImageMetrics.height
    if (!base) return 0
    return (percent / 100) * base
  }

  const placementPixelToPercent = (pixel, isWidth) => {
    const base = isWidth ? placementImageMetrics.width : placementImageMetrics.height
    if (!base) return 0
    return Math.min(Math.max((pixel / base) * 100, 0), 100)
  }

  const placementGetResizeHandle = (pos, box) => {
    const x = placementPercentToPixel(box.position.x, true)
    const y = placementPercentToPixel(box.position.y, false)
    const width = placementPercentToPixel(box.position.width, true)
    const height = placementPercentToPixel(box.position.height, false)
    const handleSize = 10
    if (Math.abs(pos.x - x) < handleSize && Math.abs(pos.y - y) < handleSize) return 'nw'
    if (Math.abs(pos.x - (x + width)) < handleSize && Math.abs(pos.y - y) < handleSize) return 'ne'
    if (Math.abs(pos.x - x) < handleSize && Math.abs(pos.y - (y + height)) < handleSize) return 'sw'
    if (Math.abs(pos.x - (x + width)) < handleSize && Math.abs(pos.y - (y + height)) < handleSize) return 'se'
    if (Math.abs(pos.y - y) < handleSize && pos.x > x + handleSize && pos.x < x + width - handleSize) return 'n'
    if (Math.abs(pos.y - (y + height)) < handleSize && pos.x > x + handleSize && pos.x < x + width - handleSize) return 's'
    if (Math.abs(pos.x - x) < handleSize && pos.y > y + handleSize && pos.y < y + height - handleSize) return 'w'
    if (Math.abs(pos.x - (x + width)) < handleSize && pos.y > y + handleSize && pos.y < y + height - handleSize) return 'e'
    return null
  }

  const placementIsInsideBox = (pos, box) => {
    const x = placementPercentToPixel(box.position.x, true)
    const y = placementPercentToPixel(box.position.y, false)
    const width = placementPercentToPixel(box.position.width, true)
    const height = placementPercentToPixel(box.position.height, false)
    return pos.x >= x && pos.x <= x + width && pos.y >= y && pos.y <= y + height
  }

  const placementIsOnBoxEdge = (pos, box) => {
    const x = placementPercentToPixel(box.position.x, true)
    const y = placementPercentToPixel(box.position.y, false)
    const width = placementPercentToPixel(box.position.width, true)
    const height = placementPercentToPixel(box.position.height, false)
    const edgeThreshold = 15
    const inside = pos.x >= x && pos.x <= x + width && pos.y >= y && pos.y <= y + height
    if (!inside) return false
    const nearLeft = pos.x >= x && pos.x <= x + edgeThreshold
    const nearRight = pos.x >= x + width - edgeThreshold && pos.x <= x + width
    const nearTop = pos.y >= y && pos.y <= y + edgeThreshold
    const nearBottom = pos.y >= y + height - edgeThreshold && pos.y <= y + height
    return nearLeft || nearRight || nearTop || nearBottom
  }

  const handlePlacementMouseDown = (e, format = 'base') => {
    // Switch active format
    if (format !== activeImageFormat) {
      setActiveImageFormat(format)
    }
    
    const pos = format === 'base' ? placementGetMousePos(e) : pairGetMousePos(e)
    const boundsW = format === 'base' ? placementImageMetrics.width : pairImageMetrics.width
    const boundsH = format === 'base' ? placementImageMetrics.height : pairImageMetrics.height
    const boxes = format === 'base' ? placementBoxes : pairImageBoxes
    if (!boundsW || !boundsH) return
    if (pos.x < 0 || pos.x > boundsW || pos.y < 0 || pos.y > boundsH) return
    for (const box of boxes) {
      if (!placementIsInsideBox(pos, box)) continue
      const handle = placementGetResizeHandle(pos, box)
      if (handle) {
        setPlacementIsResizing(true)
        setPlacementResizeHandle(handle)
        setPlacementResizeBoxId(box.id)
        setPlacementSelectedBoxId(box.id)
        setPlacementResizeStartBox({
          x: placementPercentToPixel(box.position.x, true),
          y: placementPercentToPixel(box.position.y, false),
          width: placementPercentToPixel(box.position.width, true),
          height: placementPercentToPixel(box.position.height, false),
          startMouseX: pos.x,
          startMouseY: pos.y
        })
        return
      }
      if (placementIsOnBoxEdge(pos, box)) {
        if (placementSelectedBoxId === box.id) {
          setPlacementSelectedBoxId(null)
          return
        }
        setPlacementIsDragging(true)
        setPlacementDraggedBoxId(box.id)
        setPlacementSelectedBoxId(box.id)
        const boxX = placementPercentToPixel(box.position.x, true)
        const boxY = placementPercentToPixel(box.position.y, false)
        setPlacementDragOffset({ x: pos.x - boxX, y: pos.y - boxY })
        return
      }
    }
    setPlacementIsDrawing(true)
    const startX = Math.min(Math.max(pos.x, 0), boundsW)
    const startY = Math.min(Math.max(pos.y, 0), boundsH)
    setPlacementStartPos({ x: startX, y: startY })
    setPlacementCurrentBox({ x: startX, y: startY, width: 0, height: 0 })
  }

  const handlePlacementMouseMove = (e) => {
    const pos = placementGetMousePos(e)
    const boundsW = placementImageMetrics.width
    const boundsH = placementImageMetrics.height
    if (!boundsW || !boundsH) return
    if (placementIsDrawing) {
      const clampedX = Math.min(Math.max(pos.x, 0), boundsW)
      const clampedY = Math.min(Math.max(pos.y, 0), boundsH)
      setPlacementCurrentBox({
        x: Math.min(placementStartPos.x, clampedX),
        y: Math.min(placementStartPos.y, clampedY),
        width: Math.abs(clampedX - placementStartPos.x),
        height: Math.abs(clampedY - placementStartPos.y)
      })
      return
    }
    if (placementIsDragging && placementDraggedBoxId) {
      const boxes = activeImageFormat === 'base' ? placementBoxes : pairImageBoxes
      const draggedBox = boxes.find(b => b.id === placementDraggedBoxId)
      if (!draggedBox) return
      const boxWidthPx = draggedBox ? placementPercentToPixel(draggedBox.position.width, true) : 0
      const boxHeightPx = draggedBox ? placementPercentToPixel(draggedBox.position.height, false) : 0
      const maxX = Math.max(boundsW - boxWidthPx, 0)
      const maxY = Math.max(boundsH - boxHeightPx, 0)
      const newX = Math.min(Math.max(pos.x - placementDragOffset.x, 0), maxX)
      const newY = Math.min(Math.max(pos.y - placementDragOffset.y, 0), maxY)
      
      let updatedBox = null
      const updateBoxes = (prev) => prev.map(box => {
        if (box.id === placementDraggedBoxId) {
          const updated = {
            ...box,
            position: {
              ...box.position,
              x: parseFloat(placementPixelToPercent(newX, true).toFixed(2)),
              y: parseFloat(placementPixelToPercent(newY, false).toFixed(2))
            }
          }
          updatedBox = updated
          return updated
        }
        return box
      })
      
      if (activeImageFormat === 'base') {
        setPlacementBoxesState(updateBoxes)
      } else {
        setPairImageBoxes(updateBoxes)
      }
      
      // Sync to other format if enabled
      if (updatedBox && syncEnabled && activePlacementWithPair?.pairImageUrl) {
        syncBoxToOtherFormat(placementDraggedBoxId, updatedBox, activeImageFormat)
      }
      return
    }
    if (placementIsResizing && placementResizeBoxId && placementResizeStartBox) {
      const deltaX = pos.x - placementResizeStartBox.startMouseX
      const deltaY = pos.y - placementResizeStartBox.startMouseY
      let newX = placementResizeStartBox.x
      let newY = placementResizeStartBox.y
      let newWidth = placementResizeStartBox.width
      let newHeight = placementResizeStartBox.height
      const canvas = placementCanvasRef.current
      const maxWidth = boundsW
      const maxHeight = boundsH
      switch (placementResizeHandle) {
        case 'nw':
          newX += deltaX
          newY += deltaY
          newWidth -= deltaX
          newHeight -= deltaY
          break
        case 'ne':
          newY += deltaY
          newWidth += deltaX
          newHeight -= deltaY
          break
        case 'sw':
          newX += deltaX
          newWidth -= deltaX
          newHeight += deltaY
          break
        case 'se':
          newWidth += deltaX
          newHeight += deltaY
          break
        case 'n':
          newY += deltaY
          newHeight -= deltaY
          break
        case 's':
          newHeight += deltaY
          break
        case 'w':
          newX += deltaX
          newWidth -= deltaX
          break
        case 'e':
          newWidth += deltaX
          break
        default:
          break
      }
      const minSize = 20
      newX = Math.min(Math.max(newX, 0), maxWidth - minSize)
      newY = Math.min(Math.max(newY, 0), maxHeight - minSize)
      newWidth = Math.max(Math.min(newWidth, maxWidth - newX), minSize)
      newHeight = Math.max(Math.min(newHeight, maxHeight - newY), minSize)
      
      let updatedBox = null
      const updateBoxes = (prev) => prev.map(box => {
        if (box.id === placementResizeBoxId) {
          const updated = {
            ...box,
            position: {
              x: parseFloat(placementPixelToPercent(newX, true).toFixed(2)),
              y: parseFloat(placementPixelToPercent(newY, false).toFixed(2)),
              width: parseFloat(placementPixelToPercent(newWidth, true).toFixed(2)),
              height: parseFloat(placementPixelToPercent(newHeight, false).toFixed(2))
            }
          }
          updatedBox = updated
          return updated
        }
        return box
      })
      
      if (activeImageFormat === 'base') {
        setPlacementBoxesState(updateBoxes)
      } else {
        setPairImageBoxes(updateBoxes)
      }
      
      // Sync to other format if enabled
      if (updatedBox && syncEnabled && activePlacement?.pairImageUrl) {
        syncBoxToOtherFormat(placementResizeBoxId, updatedBox, activeImageFormat)
      }
    }
  }

  const handlePlacementMouseUp = () => {
    const boundsW = placementImageMetrics.width
    const boundsH = placementImageMetrics.height
    if (!boundsW || !boundsH) {
      setPlacementIsDrawing(false)
      setPlacementCurrentBox(null)
      return
    }
    if (placementIsDragging) {
      setPlacementIsDragging(false)
      setPlacementDraggedBoxId(null)
      setPlacementDragOffset({ x: 0, y: 0 })
      return
    }
    if (placementIsResizing) {
      setPlacementIsResizing(false)
      setPlacementResizeHandle(null)
      setPlacementResizeBoxId(null)
      setPlacementResizeStartBox(null)
      return
    }
    if (!placementIsDrawing || !placementCurrentBox || placementCurrentBox.width < 5 || placementCurrentBox.height < 5) {
      setPlacementIsDrawing(false)
      setPlacementCurrentBox(null)
      return
    }
    const maxWidth = boundsW
    const maxHeight = boundsH
    const boundedX = Math.max(Math.min(placementCurrentBox.x, maxWidth - 20), 0)
    const boundedY = Math.max(Math.min(placementCurrentBox.y, maxHeight - 20), 0)
    const boundedWidth = Math.max(Math.min(placementCurrentBox.width, maxWidth - boundedX), 20)
    const boundedHeight = Math.max(Math.min(placementCurrentBox.height, maxHeight - boundedY), 20)
    const newBox = {
      id: `box_${Date.now()}`,
      type: placementSelectedType,
      position: {
        x: parseFloat(placementPixelToPercent(boundedX, true).toFixed(2)),
        y: parseFloat(placementPixelToPercent(boundedY, false).toFixed(2)),
        width: parseFloat(placementPixelToPercent(boundedWidth, true).toFixed(2)),
        height: parseFloat(placementPixelToPercent(boundedHeight, false).toFixed(2))
      },
      style: {
        font_size:
          placementSelectedType === 'headline'
            ? 36
            : placementSelectedType === 'label'
              ? 26
              : placementSelectedType === 'phrase'
                ? 18
                : 14
      },
      synced_with: null
    }
    
    // Add box to active format
    if (activeImageFormat === 'base') {
      setPlacementBoxesState(prev => [...prev, newBox])
    } else {
      setPairImageBoxes(prev => [...prev, newBox])
    }
    
    // Sync to other format if enabled
    if (syncEnabled && activePlacement?.pairImageUrl) {
      createSyncedBox(newBox, activeImageFormat)
    }
    
    setPlacementSelectedBoxId(newBox.id)
    setPlacementIsDrawing(false)
    setPlacementCurrentBox(null)
  }

  const handlePlacementMouseHover = (e) => {
    if (placementIsDrawing || placementIsDragging || placementIsResizing) return
    const pos = placementGetMousePos(e)
    for (const box of placementBoxes) {
      if (!placementIsInsideBox(pos, box)) continue
      const handle = placementGetResizeHandle(pos, box)
      if (handle) {
        const cursorMap = {
          nw: 'nw-resize',
          ne: 'ne-resize',
          sw: 'sw-resize',
          se: 'se-resize',
          n: 'n-resize',
          s: 's-resize',
          e: 'e-resize',
          w: 'w-resize'
        }
        setPlacementCursorStyle(cursorMap[handle] || 'crosshair')
        return
      }
      if (placementIsOnBoxEdge(pos, box)) {
        setPlacementCursorStyle('move')
        return
      }
    }
    setPlacementCursorStyle('crosshair')
  }
  const deletePlacementBox = (id) => {
    updatePlacementBoxes(prev => prev.filter(box => box.id !== id))
    if (placementSelectedBoxId === id) setPlacementSelectedBoxId(null)
    if (placementCopiedBox?.id === id) setPlacementCopiedBox(null)
  }

  const buildPlacementPayload = (boxesSource = placementBoxes) => {
    const safeBoxes = Array.isArray(boxesSource) ? boxesSource : []
    const textBoxes = safeBoxes.filter(box => box.type !== 'overlay')
    const overlayBoxes = safeBoxes.filter(box => box.type === 'overlay')
    const toBounding = (box) => ({
      x: parseFloat((box.position.x / 100).toFixed(4)),
      y: parseFloat((box.position.y / 100).toFixed(4)),
      width: parseFloat((box.position.width / 100).toFixed(4)),
      height: parseFloat((box.position.height / 100).toFixed(4))
    })
    const textElements = textBoxes.map(box => {
      const bounding_box = toBounding(box)
      return {
        type: box.type,
        text: '',
        bounding_box,
        offset: { x: bounding_box.x, y: bounding_box.y },
        fontSize: box.style.font_size,
        fontFamily: '',
        fontWeight: '',
        fill: '',
        textStyle: '',
        letterSpacing: 0,
        lineHeight: 0,
        textOpacity: 0,
        textGradient: { enabled: false, type: '', colors: [], angle: 0 },
        textTexture: { enabled: false, image_path: '' },
        effects: {
          textShadow: { enabled: false, offsetX: 0, offsetY: 0, blur: 0, color: '' }
        },
        layout: { alignment: '', rotation: 0, zIndex: 0, anchor_point: '' }
      }
    })
    const overlayElements = overlayBoxes.map(box => {
      const bounding_box = toBounding(box)
      return {
        bounding_box,
        offset: { x: bounding_box.x, y: bounding_box.y },
        overlay_image: {
          enabled: false,
          image_url: '',
          image_dimensions: { width: 0, height: 0 },
          scaling: { enabled: false, scale_x: 0, scale_y: 0, fit_mode: '' },
          position: { x: 0, y: 0 }
        },
        layout: { alignment: '', rotation: 0, zIndex: 0, anchor_point: '' }
      }
    })
    return { textElements, overlayElements }
  }

  const handlePlacementSave = async () => {
    try {
      setPlacementError('')
      if (!placementTemplates.length) {
        setPlacementError('No templates available for placement.')
        return
      }
      const missingTemplate = placementTemplates.find(entry => !entry?.template)
      if (missingTemplate) {
        setPlacementError('Some templates are missing base data required for placement.')
        return
      }
      if (!selectedProfileId) {
        setPlacementError('Please select a brand profile before saving.')
        return
      }
      const userId = localStorage.getItem('token') || ''
      if (!userId) {
        setPlacementError('Missing user session.')
        return
      }
      setIsPlacementSaving(true)
      const activeIdx = placementSelectedIndex ?? 0
      // Save both base and pair boxes for the active template
      placementBoxesMapRef.current[activeIdx] = {
        baseBoxes: clonePlacementBoxes(placementBoxes),
        pairBoxes: clonePlacementBoxes(pairImageBoxes)
      }
      const placementResults = placementTemplates.map((entry, idx) => {
        // Get boxes for this template (base and pair)
        let baseBoxes, pairBoxes
        if (idx === activeIdx) {
          baseBoxes = placementBoxes
          pairBoxes = pairImageBoxes
        } else {
          const savedBoxes = placementBoxesMapRef.current[idx]
          if (savedBoxes && typeof savedBoxes === 'object' && savedBoxes.baseBoxes) {
            baseBoxes = savedBoxes.baseBoxes || []
            pairBoxes = savedBoxes.pairBoxes || []
          } else {
            // Legacy format - single array of boxes
            baseBoxes = Array.isArray(savedBoxes) ? savedBoxes : []
            pairBoxes = []
          }
        }
        
        const { textElements, overlayElements } = buildPlacementPayload(baseBoxes)
        
        // Build base_image structure with pair_image nested inside if pair exists
        let baseImageData = entry.template?.base_image || {}
        
        // If there's a pair image URL and pair boxes, include pair image data
        if (entry.pairImageUrl && pairBoxes.length > 0) {
          const pairPayload = buildPlacementPayload(pairBoxes)
          baseImageData = {
            ...baseImageData,
            pair_image: {
              ...(baseImageData.pair_image || {}),
              text_elements: pairPayload.textElements,
              overlay_elements: pairPayload.overlayElements
            }
          }
        }
        
        return {
          entry,
          textElements,
          overlayElements,
          updatedTemplate: {
            ...entry.template,
            base_image: baseImageData,
            text_elements: textElements,
            overlay_elements: overlayElements
          }
        }
      })
      const updateTypes = new Set()
      placementResults.forEach(({ entry }) => {
        const meta = entry.meta || {}
        const derivedType = meta.groupType === 'preset'
          ? 'preset_templates'
          : (meta.groupType === 'uploaded'
            ? 'uploaded_templates'
            : (meta.sourceKey || 'uploaded_templates'))
        updateTypes.add(derivedType)
      })
      if (updateTypes.size > 1) {
        throw new Error('Templates span multiple update categories. Please save each group separately.')
      }
      const [updateType = 'uploaded_templates'] = Array.from(updateTypes)
      
      // Check if we have metadata - if not, we're editing a template fetched directly from API
      const hasMetadata = placementResults.some(({ entry }) => {
        const meta = entry.meta || {}
        return meta.parentIndex !== undefined && meta.parentIndex !== null
      })
      
      let updatedTemplates = null
      
      if (hasMetadata) {
        // Traditional flow: updating templates in the profile structure
        updatedTemplates = JSON.parse(JSON.stringify(templates || []))
      placementResults.forEach(({ entry, updatedTemplate }) => {
        const meta = entry.meta || {}
        const parentIdx = meta.parentIndex
        if (parentIdx === undefined || parentIdx === null || !updatedTemplates[parentIdx]) {
            console.warn('Unable to locate template in profile payload, skipping local update')
            return
        }
        if (meta.groupType === 'preset' || meta.groupType === 'uploaded') {
          const sourceKey = meta.sourceKey || (meta.groupType === 'preset' ? 'preset_templates' : 'uploaded_templates')
          if (Array.isArray(updatedTemplates[parentIdx][sourceKey]) && meta.entryIndex !== undefined && meta.entryIndex !== null) {
            updatedTemplates[parentIdx][sourceKey][meta.entryIndex] = updatedTemplate
          } else {
              console.warn('Template structure mismatch while saving placement, skipping')
          }
        } else if (meta.groupType === 'direct') {
          updatedTemplates[parentIdx] = updatedTemplate
        } else if (meta.sourceKey && Array.isArray(updatedTemplates[parentIdx][meta.sourceKey]) && meta.entryIndex !== undefined && meta.entryIndex !== null) {
          updatedTemplates[parentIdx][meta.sourceKey][meta.entryIndex] = updatedTemplate
        } else {
          updatedTemplates[parentIdx] = updatedTemplate
        }
      })
      }
      // Download option removed - no longer downloading JSON file on save
      
      // Only update brand profile if we have local template structure to update
      if (hasMetadata && updatedTemplates) {
      const currentProfile = await getBrandProfileById({ userId, profileId: selectedProfileId })
      const bi = currentProfile?.brand_identity || {}
      const tv = currentProfile?.tone_and_voice || {}
      const lf = currentProfile?.look_and_feel || {}
      const vos = currentProfile?.voiceover || []
      await updateBrandProfile({
        userId,
        profileId: selectedProfileId,
        payload: {
          brand_identity: {
            logo: bi.logo || [],
            icon: bi.icon || bi.icons || [],
            fonts: bi.fonts || [],
            colors: bi.colors || [],
            spacing: bi.spacing,
            tagline: bi.tagline
          },
          tone_and_voice: tv,
          look_and_feel: lf,
          template: updatedTemplates,
          voiceover: vos
        }
      })
      }
      // Prepare templates for API call with template_id, base_image, text_elements, overlay_elements
      const templatesForApi = []
      
      // Process each template and check for pair_image template_id
      for (const result of placementResults) {
        const template = result.updatedTemplate
        const baseTemplateId = template.template_id || template.templateId || template.id
        
        // Add the main template
        templatesForApi.push({
          template_id: baseTemplateId,
          base_image: template.base_image,
          text_elements: template.text_elements || [],
          overlay_elements: template.overlay_elements || []
        })
        
        // Check if there's a pair_image with template_id
        const pairImageTemplateId = template.base_image?.pair_image?.template_id
        
        if (pairImageTemplateId) {
          console.log(`Found pair template ID: ${pairImageTemplateId} for base template: ${baseTemplateId}`)
          
          try {
            // Fetch the pair template
            const pairTemplateData = await getTemplateById({
              userId,
              profileId: selectedProfileId,
              templateId: pairImageTemplateId
            })
            
            console.log('Fetched pair template data:', pairTemplateData)
            
            // Extract the actual template object from the response
            const pairTemplate = pairTemplateData?.template || pairTemplateData
            
            // Use the same placement data (text_elements and overlay_elements) for the pair template
            templatesForApi.push({
              template_id: pairImageTemplateId,
              base_image: pairTemplate.base_image || {},
              text_elements: template.text_elements || [], // Same placement as base
              overlay_elements: template.overlay_elements || [] // Same placement as base
            })
            
            console.log(`Added pair template ${pairImageTemplateId} with same placement data`)
          } catch (pairError) {
            console.warn(`Failed to fetch pair template ${pairImageTemplateId}:`, pairError)
            // Continue with just the base template if pair fetch fails
          }
        }
      }
      
      const updatePayload = {
        userId,
        profileId: selectedProfileId,
        templates: templatesForApi
      }
      
      console.log('Final update payload with both templates:', updatePayload)
      
      try {
        await updateTemplateElements(updatePayload)
        // If we successfully updated via API and have local templates, update state
        if (updatedTemplates) {
          setTemplates(updatedTemplates)
        }
        resetPlacementState()
      } catch (apiError) {
        console.error('[Placement] update-template-elements failed', apiError)
        throw new Error(apiError?.message || 'Failed to sync template elements with server.')
      }
    } catch (error) {
      setPlacementError(error?.message || 'Failed to save placement.')
    } finally {
      setIsPlacementSaving(false)
    }
  }

  useEffect(() => {
    if (!isPlacementOverlayOpen) return
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'c' && placementSelectedBoxId) {
        e.preventDefault()
        const boxToCopy = placementBoxes.find(box => box.id === placementSelectedBoxId)
        if (boxToCopy) setPlacementCopiedBox(boxToCopy)
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'v' && placementCopiedBox) {
        e.preventDefault()
        const newBox = {
          ...placementCopiedBox,
          id: `box_${Date.now()}`,
          position: {
            x: parseFloat(Math.min(placementCopiedBox.position.x + 5, 95).toFixed(2)),
            y: parseFloat(Math.min(placementCopiedBox.position.y + 5, 95).toFixed(2)),
            width: placementCopiedBox.position.width,
            height: placementCopiedBox.position.height
          }
        }
        updatePlacementBoxes(prev => [...prev, newBox])
        setPlacementSelectedBoxId(newBox.id)
      }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (placementSelectedBoxId) {
          updatePlacementBoxes(prev => prev.filter(box => box.id !== placementSelectedBoxId))
          setPlacementSelectedBoxId(null)
        }
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [isPlacementOverlayOpen, placementBoxes, placementSelectedBoxId, placementCopiedBox, updatePlacementBoxes])

  const structuredTemplates = useMemo(() => {
    return (templates || []).map((item, index) => {
      if (item && typeof item === 'object' && (item.aspect_ratio || item.ratio || item.orientation || item.preset_templates || item.uploaded_templates)) {
        const aspect = item.aspect_ratio || item.ratio || item.orientation || ''
        return { item, index, aspect }
      }
      return null
    }).filter(Boolean)
  }, [templates])

  const templateAspectOptions = useMemo(() => {
    const seen = new Set()
    const options = []
    structuredTemplates.forEach(entry => {
      const value = entry.aspect || ''
      if (value && !seen.has(value)) {
        seen.add(value)
        options.push({ value, label: value })
      }
    })
    return options
  }, [structuredTemplates])

  const selectedTemplateGroup = useMemo(() => {
    if (!selectedTemplateAspect) return null
    return structuredTemplates.find(entry => entry.aspect === selectedTemplateAspect) || null
  }, [structuredTemplates, selectedTemplateAspect])

  const hasStructuredTemplates = templateAspectOptions.length > 0
  const presetTemplates = Array.isArray(selectedTemplateGroup?.item?.preset_templates) ? selectedTemplateGroup.item.preset_templates : []
  const uploadedTemplates = Array.isArray(selectedTemplateGroup?.item?.uploaded_templates) ? selectedTemplateGroup.item.uploaded_templates : []
  const rawUploadedTemplateImages = Array.isArray(selectedTemplateGroup?.item?.uploaded_images) ? selectedTemplateGroup.item.uploaded_images : []

  const getUploadedImageUrl = useCallback((entry) => {
    return (
      resolveTemplateImageUrl(entry) ||
      resolveTemplateImageUrl(entry?.base_image) ||
      entry?.base_image?.image_url ||
      entry?.base_image?.url ||
      entry?.image_url ||
      entry?.url ||
      ''
    )
  }, [])

  const normalizeUploadedImages = useCallback(
    (entries = []) => {
      if (!Array.isArray(entries)) return []
      return entries
        .map((entry, idx) => {
          const url = getUploadedImageUrl(entry)
          if (!url) return null
          return { url, entry, idx }
        })
        .filter(Boolean)
    },
    [getUploadedImageUrl]
  )

  const uploadedTemplateImages = useMemo(
    () => normalizeUploadedImages(rawUploadedTemplateImages),
    [normalizeUploadedImages, rawUploadedTemplateImages]
  )

  const fallbackUploadedImages = useMemo(() => {
    if (hasStructuredTemplates) return []
    const aggregated = []
    ;(templates || []).forEach(item => {
      if (item && typeof item === 'object') {
        aggregated.push(...normalizeUploadedImages(item.uploaded_images || []))
      }
    })
    return aggregated
  }, [hasStructuredTemplates, normalizeUploadedImages, templates])

  const handleOpenTemplatePreview = (entry, label) => {
    if (!entry) return
    if (entry.url && entry.label !== undefined) {
      setTemplatePreview({ url: entry.url, title: entry.label || label || '' })
      return
    }
    const url = resolveTemplateImageUrl(entry)
    if (url) setTemplatePreview({ url, title: label || '' })
  }

  const handleCloseTemplatePreview = () => setTemplatePreview({ url: '', title: '' })

  const handleDeleteTemplate = (templateEntry, label) => {
    if (!templateEntry || !templateEntry.template) return
    
    const userId = localStorage.getItem('token') || ''
    const pid = selectedProfileId
    
    if (!userId || !pid) {
      alert('Missing user or profile information')
      return
    }
    
    // Get template_id from the template object
    const templateId = templateEntry.template.template_id || templateEntry.template.templateId || templateEntry.template.id
    
    if (!templateId) {
      alert('Template ID not found')
      return
    }
    
    // Get aspect_ratio from template entry or selected template aspect
    const aspectRatio = templateEntry.meta?.aspect || 
                        templateEntry.template?.aspect_ratio || 
                        templateEntry.template?.ratio || 
                        templateEntry.template?.orientation || 
                        selectedTemplateAspect || 
                        ''
    
    if (!aspectRatio) {
      alert('Aspect ratio is required for deletion. Please select a template aspect ratio first.')
      return
    }
    
    // Open confirmation modal
    setDeleteConfirmData({
      templateEntry,
      label,
      templateId,
      aspectRatio,
      userId,
      profileId: pid
    })
    setIsDeleteConfirmOpen(true)
  }

  const confirmDeleteTemplate = async () => {
    if (!deleteConfirmData) return
    
    const { templateId, aspectRatio, userId, profileId } = deleteConfirmData
    
    setIsDeleting(true)
    try {
      // Call delete API
      await deleteTemplateElements({
        userId,
        profileId,
        templateIds: [templateId],
        aspectRatio
      })
      
      // Refresh the brand profile to get updated templates
      const refreshed = await getBrandProfileById({ userId, profileId })
      const abi = refreshed?.brand_identity || {}
      setLogos(abi.logo || [])
      setIcons(abi.icon || abi.icons || [])
      setFonts(abi.fonts || [])
      setColors(abi.colors || [])
      const tpls = refreshed?.template || refreshed?.templates || []
      updateTemplatesState(tpls)
      const vos = refreshed?.voiceover || []
      setVoiceovers(Array.isArray(vos) ? vos : [])
      
      // Close modal
      setIsDeleteConfirmOpen(false)
      setDeleteConfirmData(null)
    } catch (error) {
      console.error('Failed to delete template:', error)
      alert(error?.message || 'Failed to delete template')
    } finally {
      setIsDeleting(false)
    }
  }

  const confirmDeleteProfile = async () => {
    if (!deleteProfileConfirmData) return
    
    const { userId, profileId } = deleteProfileConfirmData
    
    setIsDeletingProfile(true)
    try {
      // Call delete API
      await deleteBrandProfile({ userId, profileId })
      
      // Refresh profiles list
      const tokenUserId = localStorage.getItem('token') || ''
      if (tokenUserId) {
        const plist = await getBrandProfiles(tokenUserId)
        plist.sort((a,b) => (b?.is_active?1:0) - (a?.is_active?1:0))
        setProfiles(plist)
        
        // Select the first profile (or active one if available)
        const newSelected = plist.find(p => p.is_active)?.profile_id || plist.find(p => p.is_active)?.id || plist[0]?.profile_id || plist[0]?.id || ''
        if (newSelected) {
          setSelectedProfileId(newSelected)
          setSelectedIsActive(!!plist.find(p => (p.profile_id || p.id) === newSelected)?.is_active)
          
          // Load the selected profile details
          const a = await getBrandProfileById({ userId: tokenUserId, profileId: newSelected })
          const bi = a?.brand_identity || {}
          setTagline(bi.tagline || '')
          setSpacing(bi.spacing || '')
          setCaptionLocation(a?.caption_location || a?.brand_identity?.caption_location || '')
          setLogos(bi.logo || [])
          setIcons(bi.icon || bi.icons || [])
          setFonts(bi.fonts || [])
          setColors(bi.colors || [])
          const tv = a?.tone_and_voice || {}
          setToneVoice(hydrateToneVoiceState(tv))
          const lf = a?.look_and_feel || {}
          setLookFeel(hydrateLookFeelState(lf))
          const tpls = a?.template || a?.templates || []
          updateTemplatesState(tpls)
          const vos = a?.voiceover || []
          setVoiceovers(Array.isArray(vos) ? vos : [])
        } else {
          // No profiles left, reset state
          setSelectedProfileId('')
          setSelectedIsActive(false)
          setTagline('')
          setSpacing('')
          setCaptionLocation('')
          setLogos([])
          setIcons([])
          setFonts([])
          setColors([])
          setToneVoice({ context: '', brand_personality: [], communication_style_pace: [] })
          setLookFeel({ iconography: [], graphic_elements: [], aesthetic_consistency: [] })
          setTemplates([])
          setVoiceovers([])
        }
      }
      
      // Close modal
      setIsDeleteProfileConfirmOpen(false)
      setDeleteProfileConfirmData(null)
    } catch (error) {
      console.error('Failed to delete profile:', error)
      alert(error?.message || 'Failed to delete profile')
    } finally {
      setIsDeletingProfile(false)
    }
  }

  const handleEditTemplate = async (templateEntry, label) => {
    if (!templateEntry || !templateEntry.template) return
    
    const userId = localStorage.getItem('token') || ''
    const pid = selectedProfileId
    
    if (!userId || !pid) {
      alert('Missing user or profile information')
      return
    }
    
    // Get template_id from the template object
    const templateId = templateEntry.template.template_id || templateEntry.template.templateId || templateEntry.template.id
    
    console.log('=== EDIT TEMPLATE CLICKED ===')
    console.log('Template ID being edited:', templateId)
    console.log('Label:', label)
    console.log('Template Entry:', templateEntry)
    
    if (!templateId) {
      alert('Template ID not found')
      return
    }
    
    try {
      // Show loading overlay
      setIsLoadingTemplateDetails(true)
      
      // Call API to get template details
      console.log('=== FETCHING TEMPLATE DETAILS FROM API ===')
      console.log('API Endpoint: /v1/users/brand-assets/profiles/{user_id}/{profile_id}/templates/{template_id}')
      console.log('Request Parameters:', {
        userId,
        profileId: pid,
        templateId
      })
      
      const apiResponse = await getTemplateById({
        userId,
        profileId: pid,
        templateId
      })
      
      console.log('=== API RESPONSE RECEIVED ===')
      console.log('Full API Response:', apiResponse)
      console.log('API Response Type:', typeof apiResponse)
      console.log('API Response Keys:', apiResponse ? Object.keys(apiResponse) : 'No keys')
      console.log('API Response (JSON):', JSON.stringify(apiResponse, null, 2))
      
      // Validate API response
      if (!apiResponse) {
        throw new Error('API returned empty or null response')
      }
      
      if (typeof apiResponse !== 'object') {
        throw new Error(`API returned invalid response type: ${typeof apiResponse}. Expected object.`)
      }
      
      // Extract template data from response (API wraps it in a 'template' property)
      let templateDetails = apiResponse
      if (apiResponse.template && typeof apiResponse.template === 'object') {
        templateDetails = apiResponse.template
        console.log('✅ Extracted template from response.template')
      } else if (apiResponse.data && typeof apiResponse.data === 'object') {
        templateDetails = apiResponse.data
        console.log('✅ Extracted template from response.data')
      }
      
      // Log specific fields from the template
      console.log('=== TEMPLATE DATA ===')
      console.log('Template ID:', templateDetails.template_id || templateDetails.templateId || templateDetails.id)
      console.log('Base Image:', templateDetails.base_image)
      console.log('Base Image URL:', templateDetails.base_image?.image_url)
      console.log('Pair Image:', templateDetails.base_image?.pair_image)
      console.log('Pair Image URL:', templateDetails.base_image?.pair_image?.image_url)
      console.log('Text Elements:', templateDetails.text_elements)
      console.log('Text Elements Count:', templateDetails.text_elements?.length || 0)
      console.log('Overlay Elements:', templateDetails.overlay_elements)
      console.log('Overlay Elements Count:', templateDetails.overlay_elements?.length || 0)
      
      // Deep search function to find image URL in any nested structure
      const deepSearchImageUrl = (obj, depth = 0, maxDepth = 5) => {
        if (depth > maxDepth || !obj || typeof obj !== 'object') return null
        
        // Check common URL property names
        const urlProps = ['image_url', 'imageUrl', 'url', 'src', 'href', 'link', 'file', 'path']
        for (const prop of urlProps) {
          if (obj[prop] && typeof obj[prop] === 'string' && obj[prop].trim() !== '') {
            const url = obj[prop].trim()
            // Check if it looks like a URL (starts with http/https or is a data URL)
            if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:') || url.startsWith('blob:')) {
              return url
            }
          }
        }
        
        // Recursively search nested objects
        for (const key in obj) {
          if (obj.hasOwnProperty(key) && typeof obj[key] === 'object' && obj[key] !== null) {
            const found = deepSearchImageUrl(obj[key], depth + 1, maxDepth)
            if (found) return found
          }
        }
        
        return null
      }
      
      // Check if we can extract URL before normalization
      let extractedUrl = resolveTemplateImageUrl(templateDetails)
      console.log('Extracted URL from resolveTemplateImageUrl:', extractedUrl)
      
      // If URL extraction failed, try deep search
      if (!extractedUrl || extractedUrl === '') {
        console.log('⚠️ URL extraction failed, trying deep search...')
        
        // Try deep search through entire response
        const deepSearchUrl = deepSearchImageUrl(templateDetails)
        console.log('Deep search result:', deepSearchUrl)
        
        // Also try specific known paths
        let fallbackUrl = ''
        
        // Try base_image paths
        if (templateDetails?.base_image) {
          if (typeof templateDetails.base_image === 'string') {
            fallbackUrl = templateDetails.base_image
            console.log('Found URL in base_image (string):', fallbackUrl)
          } else if (typeof templateDetails.base_image === 'object') {
            // Try all possible property names
            fallbackUrl = templateDetails.base_image.image_url || 
                         templateDetails.base_image.imageUrl || 
                         templateDetails.base_image.url || 
                         templateDetails.base_image.src || 
                         templateDetails.base_image.href ||
                         templateDetails.base_image.link ||
                         templateDetails.base_image.file ||
                         templateDetails.base_image.path ||
                         ''
            if (fallbackUrl) {
              console.log('Found URL in base_image (object):', fallbackUrl)
            } else {
              // Try nested search in base_image
              const nestedUrl = deepSearchImageUrl(templateDetails.base_image)
              if (nestedUrl) {
                fallbackUrl = nestedUrl
                console.log('Found URL in base_image (nested):', fallbackUrl)
              }
            }
          }
        }
        
        // If still not found, try root level
        if (!fallbackUrl) {
          fallbackUrl = templateDetails.image_url || 
                       templateDetails.imageUrl || 
                       templateDetails.url || 
                       templateDetails.src ||
                       templateDetails.href ||
                       templateDetails.link ||
                       templateDetails.file ||
                       templateDetails.path ||
                       ''
          if (fallbackUrl) {
            console.log('Found URL at root level:', fallbackUrl)
          }
        }
        
        // Use deep search result if found
        if (!fallbackUrl && deepSearchUrl) {
          fallbackUrl = deepSearchUrl
          console.log('Using deep search URL:', fallbackUrl)
        }
        
        // Final check - if still no URL, log everything for debugging
        if (!fallbackUrl || fallbackUrl === '') {
          console.error('❌ Could not extract image URL from API response')
          console.error('Full response structure:', JSON.stringify(templateDetails, null, 2))
          console.error('Available keys in response:', Object.keys(templateDetails || {}))
          console.error('base_image structure:', templateDetails?.base_image)
          console.error('base_image type:', typeof templateDetails?.base_image)
          if (templateDetails?.base_image && typeof templateDetails.base_image === 'object') {
            console.error('base_image keys:', Object.keys(templateDetails.base_image))
            console.error('base_image values:', templateDetails.base_image)
          }
          throw new Error('Template does not have a valid image URL in the API response. Please check console for details.')
        }
        
        // Ensure the URL is properly structured in the response
        // This ensures normalizeTemplateEntry can find it
        if (!templateDetails.base_image) {
          templateDetails.base_image = { image_url: fallbackUrl }
          console.log('✅ Created base_image structure with URL:', fallbackUrl)
        } else if (typeof templateDetails.base_image === 'object') {
          // Add image_url if it doesn't exist in any form
          if (!templateDetails.base_image.image_url && 
              !templateDetails.base_image.imageUrl && 
              !templateDetails.base_image.url && 
              !templateDetails.base_image.src &&
              !templateDetails.base_image.href &&
              !templateDetails.base_image.link) {
            templateDetails.base_image.image_url = fallbackUrl
            console.log('✅ Added image_url to existing base_image structure:', fallbackUrl)
          } else {
            // URL already exists, but ensure we use the found one
            templateDetails.base_image.image_url = fallbackUrl
            console.log('✅ Updated base_image.image_url with found URL:', fallbackUrl)
          }
        } else if (typeof templateDetails.base_image === 'string') {
          // Convert string to object structure
          templateDetails.base_image = { image_url: templateDetails.base_image || fallbackUrl }
          console.log('✅ Converted base_image string to object structure:', templateDetails.base_image.image_url)
        }
        
        // Verify URL can now be extracted
        extractedUrl = resolveTemplateImageUrl(templateDetails)
        console.log('✅ Verified URL extraction after fallback:', extractedUrl)
        
        // If still can't extract, use the fallback URL directly
        if (!extractedUrl || extractedUrl === '') {
          console.warn('⚠️ resolveTemplateImageUrl still failed, using fallback URL directly')
          extractedUrl = fallbackUrl
          // Ensure it's in the structure
          if (!templateDetails.base_image) {
            templateDetails.base_image = { image_url: fallbackUrl }
          } else if (typeof templateDetails.base_image === 'object') {
            templateDetails.base_image.image_url = fallbackUrl
          }
        }
      }
      
      // Get aspect ratio from metadata or template
      const aspectRatio = apiResponse.metadata?.aspect_ratio || 
                         templateDetails?.aspect_ratio || 
                         templateDetails?.ratio || 
                         templateDetails?.orientation || 
                         templateEntry.meta?.aspect || 
                         ''
      
      
      // Normalize the API response using normalizeTemplateEntry
      let normalizedEntry = normalizeTemplateEntry(templateDetails, label, {
        aspect: aspectRatio
      })
      
      // If normalization failed but we have a URL, create normalized entry manually
      if (!normalizedEntry && extractedUrl) {
        console.warn('⚠️ normalizeTemplateEntry failed, creating normalized entry manually')
        const overlayElements = Array.isArray(templateDetails.overlay_elements)
          ? templateDetails.overlay_elements
          : (Array.isArray(templateDetails.overlayElements) ? templateDetails.overlayElements : [])
        const textElements = Array.isArray(templateDetails.text_elements)
          ? templateDetails.text_elements
          : (Array.isArray(templateDetails.textElements) ? templateDetails.textElements : [])
        
        // Extract pair image URL from base_image.pair_image.image_url
        let pairImageUrl = null
        if (templateDetails.base_image?.pair_image) {
          const nestedPair = templateDetails.base_image.pair_image
          if (typeof nestedPair === 'string') {
            pairImageUrl = nestedPair
          } else if (typeof nestedPair === 'object') {
            pairImageUrl = nestedPair.image_url || nestedPair.imageUrl || nestedPair.url || null
          }
        }
        
        console.log('Pair Image URL extracted:', pairImageUrl)
        
        normalizedEntry = {
          url: extractedUrl,
          label: label,
          template: templateDetails,
          overlayElements: overlayElements,
          textElements: textElements,
          meta: {
            aspect: aspectRatio
          },
          pairImageUrl: pairImageUrl
        }
        console.log('✅ Created normalized entry manually:', normalizedEntry)
      }
      
      if (!normalizedEntry) {
        console.error('❌ Normalization failed after URL extraction')
        console.error('Template Details:', templateDetails)
        console.error('Extracted URL:', extractedUrl || 'Not found')
        throw new Error('Failed to normalize template data from API response. Please check console for details.')
      }
      
      console.log('=== NORMALIZED ENTRY ===')
      console.log('Normalized Entry:', normalizedEntry)
      console.log('Normalized Entry (JSON):', JSON.stringify(normalizedEntry, null, 2))
      console.log('Base Image URL:', normalizedEntry.url)
      console.log('Pair Image URL:', normalizedEntry.pairImageUrl)
      
      // Close loading overlay
      setIsLoadingTemplateDetails(false)
      
      // Reset placement state first
      resetPlacementEditor()
      setPlacementError('')
      setTemplatePreview({ url: '', title: '' })
      setIsPlacementPromptOpen(false)
      setPlacementPendingOpen(false)
      
      // Set templates and open editor after a short delay to ensure loading overlay is gone
      setTimeout(() => {
        setPlacementTemplates([normalizedEntry])
        setPlacementSelectedIndex(0)
        
        // Open overlay after another short delay to ensure templates state is updated
        setTimeout(() => {
          setIsPlacementOverlayOpen(true)
          console.log('Successfully opened placement overlay with API data')
        }, 50)
      }, 150)
      
    } catch (error) {
      console.error('Failed to load template details:', error)
      setIsLoadingTemplateDetails(false)
      alert(error?.message || 'Failed to load template details')
    }
  }

  const renderTemplateGrid = (items, keyPrefix, emptyLabel, labelPrefix = 'Template', meta = {}) => {
    if (!Array.isArray(items) || items.length === 0) {
      return <p className="text-xs text-gray-500">{emptyLabel}</p>
    }
    // For 16:9 templates, use fewer columns (bigger boxes) to cover all 3 options properly
    const is16x9 = selectedTemplateAspect === '16:9' || selectedTemplateAspect === '16-9'
    const gridCols = is16x9 
      ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4' 
      : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4'
    return (
      <div className={`grid ${gridCols}`}>
        {items.map((item, idx) => {
          const label = `${labelPrefix} ${idx + 1}`
          const normalized = normalizeTemplateEntry(item, label, {
            parentIndex: meta.groupType === 'direct' ? idx : meta.parentIndex,
            entryIndex: meta.groupType === 'direct' ? null : idx,
            groupType: meta.groupType || 'direct',
            sourceKey: meta.sourceKey || null
          })
          const previewUrl = deriveTemplateImageUrl(item, normalized)
          return (
            <div key={`${keyPrefix}-${idx}`} className="relative group">
              <button
                type="button"
                onClick={() => handleOpenTemplatePreview(normalized || item, label)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleOpenTemplatePreview(normalized || item, label)
                  }
                }}
                className="w-full border rounded-lg overflow-hidden bg-gray-50 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[#13008B]/40 focus:border-[#13008B]"
              >
                {previewUrl
                  ? <img src={previewUrl} alt={`${keyPrefix}-${idx}`} className="w-full h-auto" />
                  : <div className="p-4 text-xs text-gray-500 break-all">{JSON.stringify(item)}</div>}
              </button>
              {previewUrl && (
                <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="pointer-events-auto flex flex-col gap-2">
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); handleOpenTemplatePreview(normalized || item, label) }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#13008B] shadow hover:bg-white"
                      title="Zoom"
                    >
                      <ZoomIn size={16} />
                    </button>
                      <button
                        type="button"
                      onClick={(e) => { 
                        e.stopPropagation();
                        console.log('Edit clicked - item:', item);
                        console.log('Edit clicked - derived previewUrl:', previewUrl);
                         openImageEditorForEntry({
                           templateEntry: normalized || item,
                           fallbackUrl: previewUrl,
                           label
                         })
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-green-600 shadow hover:bg-green-50"
                      title="Edit image"
                    >
                      <ImageIcon size={16} />
                    </button>
                    {normalized?.template && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleEditTemplate(normalized, label) }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#13008B] shadow hover:bg-white"
                        title="Edit placement"
                      >
                        <Edit2 size={16} />
                      </button>
                    )}
                    {normalized?.template && (normalized.template.template_id || normalized.template.templateId || normalized.template.id) && (
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(normalized, label) }}
                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 shadow hover:bg-red-50"
                        title="Delete template"
                      >
                        <Trash2 size={16} />
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>
          )
        })}
      </div>
    )
  }

  const isTemplateTarget = targetType === 'templates'
  const isTemplatePptMode = isTemplateTarget && templateUploadMode === 'ppt'
  const dropzoneAccept = isTemplateTarget
    ? (isTemplatePptMode
      ? '.ppt,.pptx,application/vnd.ms-powerpoint,application/vnd.openxmlformats-officedocument.presentationml.presentation'
      : 'image/*')
    : 'image/*'
  const dropzoneMultiple = !(isTemplateTarget && isTemplatePptMode)
  const dropzoneTitle = isTemplateTarget
    ? (isTemplatePptMode ? 'Drag & drop a PowerPoint file here' : 'Drag & drop template images here')
    : 'Drag & drop files here'
  const dropzoneSubtitle = isTemplateTarget
    ? (isTemplatePptMode ? "We'll extract each slide into individual templates." : 'Supports PNG, JPG, and WEBP images.')
    : 'Supports common image formats.'
  const dropzoneButtonLabel = isTemplateTarget
    ? (isTemplatePptMode ? 'Browse PPT / PPTX' : 'Browse images')
    : 'Browse files'

  const handleTemplateModeChange = (mode) => {
    if (templateUploadMode === mode) return
    setTemplateUploadMode(mode)
    try { (previewUrls || []).forEach(u => URL.revokeObjectURL(u)) } catch (_) {}
    setPreviewUrls([])
    setSelectedFiles([])
    setErrorMsg('')
    setPlacementTemplates([])
    setPlacementSelectedIndex(0)
    if (mode === 'image') {
      const defaultAspect = selectedTemplateAspect || '16:9'
      setTemplateUploadAspect(defaultAspect)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

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
          setToneVoice(hydrateToneVoiceState(tv))
          const lf = a.look_and_feel || {}
          setLookFeel(hydrateLookFeelState(lf))
          const tpls = a?.template || a?.templates || []
          updateTemplatesState(tpls)
          const vos = a?.voiceover || []
          setVoiceovers(Array.isArray(vos) ? vos : [])
        }
      } catch(_) { /* noop */ }
    })()
  }, [])

  // Fetch generated assets
  useEffect(() => {
    const fetchGeneratedAssets = async () => {
      const userId = localStorage.getItem('token') || ''
      if (!userId) return

      setIsLoadingGeneratedAssets(true)
      setGeneratedAssetsError('')
      
      try {
        const apiBase = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net'
        const resp = await fetch(`${apiBase}/v1/users/user/${encodeURIComponent(userId)}/generated-media`, {
          method: 'GET',
          headers: { 'Content-Type': 'application/json' }
        })
        
        const text = await resp.text()
        let json
        try {
          json = JSON.parse(text)
        } catch (_) {
          json = text
        }
        
        if (!resp.ok) {
          throw new Error(`generated-media failed: ${resp.status} ${text}`)
        }

        const generatedImages = json?.generated_images || {}
        const generatedVideos = json?.generated_videos || {}

        setGeneratedAssets({
          generated_images: generatedImages,
          generated_videos: generatedVideos
        })

        // Set default aspect ratio if available
        const availableRatios = Object.keys(generatedImages).concat(Object.keys(generatedVideos))
        if (availableRatios.length > 0 && !availableRatios.includes(selectedAspectRatio)) {
          if (availableRatios.includes('16:9')) {
            setSelectedAspectRatio('16:9')
          } else if (availableRatios.includes('9:16')) {
            setSelectedAspectRatio('9:16')
          } else {
            setSelectedAspectRatio(availableRatios[0])
          }
        }
      } catch (e) {
        setGeneratedAssetsError(e?.message || 'Failed to load generated assets')
        console.error('Error fetching generated assets:', e)
      } finally {
        setIsLoadingGeneratedAssets(false)
      }
    }

    fetchGeneratedAssets()
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
      setToneVoice(hydrateToneVoiceState(tv))
      const lf = a?.look_and_feel || {}
      setLookFeel(hydrateLookFeelState(lf))
      const tpls = a?.template || a?.templates || []
      updateTemplatesState(tpls)
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
    setToneVoice(hydrateToneVoiceState(tv))
    const lf = a?.look_and_feel || {}
    setLookFeel(hydrateLookFeelState(lf))
      const tpls = a?.template || a?.templates || []
      updateTemplatesState(tpls)
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
    if (type === 'templates') {
      setTemplateUploadMode('image')
      setPlacementTemplates([])
      setPlacementSelectedIndex(0)
      const defaultAspect = selectedTemplateAspect || '16:9'
      setTemplateUploadAspect(defaultAspect)
    }
    if (fileInputRef.current) fileInputRef.current.value = ''
    if (type === 'voiceovers') {
      resetVoiceoverFlow()
    }
    setIsModalOpen(true)
  }

  const onFilesPicked = (filesList) => {
    const filesArray = Array.from(filesList || [])
    if (filesArray.length === 0) return
    setErrorMsg('')
    const isTemplate = targetType === 'templates'
    const isPptMode = isTemplate && templateUploadMode === 'ppt'
    if (isTemplate && isPptMode) {
      const pptFile = filesArray.find(f => isPptFile(f))
      if (!pptFile) {
        setErrorMsg('Please select a PPT or PPTX file.')
        if (fileInputRef.current) fileInputRef.current.value = ''
        return
      }
      setSelectedFiles([pptFile])
      try { (previewUrls || []).forEach(u => URL.revokeObjectURL(u)) } catch (_) {}
      setPreviewUrls([])
      return
    }
    const nextFiles = filesArray
    setSelectedFiles(nextFiles)
    try { (previewUrls || []).forEach(u => URL.revokeObjectURL(u)) } catch (_) {}
    try {
      const urls = nextFiles.map(f => URL.createObjectURL(f))
      setPreviewUrls(urls)
    } catch (_) {
      setPreviewUrls([])
    }
  }

  const handleDrop = (e) => {
    e.preventDefault(); e.stopPropagation();
    const dt = e.dataTransfer;
    if (dt && dt.files) onFilesPicked(dt.files)
  }
  const handleDragOver = (e) => { e.preventDefault(); e.stopPropagation(); }

  // Generate voiceover content based on tonality
  const saveFiles = async () => {
    try {
      if (!selectedFiles || selectedFiles.length === 0) return;
      setIsSaving(true); setErrorMsg('');
      const userId = localStorage.getItem('token') || '';
      const pid = selectedProfileId;

      if (!userId) {
        setErrorMsg('Missing user session.');
        return;
      }

      if (targetType === 'templates') {
        if (!pid) {
          setErrorMsg('Please select a brand profile before uploading.');
          return;
        }
        if (templateUploadMode === 'ppt') {
          // Store previous template URLs before upload
          const previousTemplateUrls = collectPlacementTemplates(templates).map(item => item.url);
          const pptFile = selectedFiles[0];
          await uploadTemplatesPptx({ userId, profileId: pid, file: pptFile, convertColors });
          const refreshed = await getBrandProfileById({ userId, profileId: pid });
          const abi = refreshed?.brand_identity || {};
          setLogos(abi.logo || []);
          setIcons(abi.icon || abi.icons || []);
          setFonts(abi.fonts || []);
          setColors(abi.colors || []);
          const tpls = refreshed?.template || refreshed?.templates || [];
          updateTemplatesState(tpls);
          applyPptPlacementTemplates(tpls, previousTemplateUrls);
          const vos = refreshed?.voiceover || [];
          setVoiceovers(Array.isArray(vos) ? vos : []);
          setIsModalOpen(false);
          setSelectedFiles([]);
          if (fileInputRef.current) fileInputRef.current.value = '';
          try { (previewUrls || []).forEach(u => URL.revokeObjectURL(u)) } catch (_) {}
          setPreviewUrls([]);
          return;
        }
        // Aspect ratio is optional for image uploads
        let aspectRatio = null;
        const aspectInput = (templateUploadAspect || '').trim();
        if (aspectInput) {
        const normalizedAspect = aspectInput.replace(/[xX/]/g, ':').replace(/\s+/g, '');
        const aspectMatch = normalizedAspect.match(/^(\d+):(\d+)$/);
          if (aspectMatch) {
            aspectRatio = `${aspectMatch[1]}:${aspectMatch[2]}`;
          }
        }
        
        // Store previous template URLs to identify new ones
        const previousTemplateUrls = templates
          .flatMap(t => {
            if (t && typeof t === 'object') {
              const preset = t.preset_templates || []
              const uploaded = t.uploaded_templates || []
              return [...preset, ...uploaded]
            }
            return [t]
          })
          .map(entry => {
            const url = resolveTemplateImageUrl(entry)
            return url
          })
          .filter(Boolean)
        
        await uploadProfileTemplateImages({
          userId,
          profileId: pid,
          aspectRatio: aspectRatio || undefined, // Only pass if provided
          files: selectedFiles,
          convertColors
        });
        const refreshed = await getBrandProfileById({ userId, profileId: pid });
        const abi = refreshed?.brand_identity || {};
        setLogos(abi.logo || []);
        setIcons(abi.icon || abi.icons || []);
        setFonts(abi.fonts || []);
        setColors(abi.colors || []);
        const tpls = refreshed?.template || refreshed?.templates || [];
        updateTemplatesState(tpls);
        
        // Use the same placement flow as PPTX - show "Place Now" popup
        applyPptPlacementTemplates(tpls, previousTemplateUrls);
        
        const vos = refreshed?.voiceover || [];
        setVoiceovers(Array.isArray(vos) ? vos : []);
        if (aspectRatio) {
        setSelectedTemplateAspect(aspectRatio);
        setTemplateUploadAspect(aspectRatio);
        }
        setIsModalOpen(false);
        setSelectedFiles([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        try { (previewUrls || []).forEach(u => URL.revokeObjectURL(u)) } catch (_) {}
        setPreviewUrls([]);
        return;
      }

      const fileType = targetType === 'logos' ? 'logo' : (targetType === 'icons' ? 'icon' : 'voiceover');

      // 1) Upload files (voiceovers handled via upload-voiceover endpoint)
      let filesToSend = selectedFiles;
      if (fileType === 'voiceover') {
        filesToSend = selectedFiles.map((f, idx) => {
          const originalName = f.name || `voiceover_${idx}.mp3`;
          const fileName = originalName.replace(/\.[^.]+$/, '.mp3');
          return new File([f], fileName, { type: 'audio/mpeg' });
        });

        if (!pid) {
          setErrorMsg('Please select a brand profile before uploading voiceovers.');
          return;
        }

        // Send MP3 files directly to upload-voiceover API (one at a time)
        for (let idx = 0; idx < filesToSend.length; idx++) {
          const file = filesToSend[idx];
          const originalName = selectedFiles[idx]?.name || `Voiceover ${idx + 1}`;
          const name = originalName.replace(/\.[^.]+$/, '');
          await uploadVoiceover({
            userId,
            profileId: pid,
            name,
            type: 'ai-generated',
            file
          });
        }

        const refreshedProfile = await getBrandProfileById({ userId, profileId: pid });
        const refreshedVoiceovers = refreshedProfile?.voiceover || [];
        setVoiceovers(Array.isArray(refreshedVoiceovers) ? refreshedVoiceovers : []);

        if (targetType === 'voiceovers') resetVoiceoverFlow();
        setIsModalOpen(false);
        setSelectedFiles([]);
        try { (previewUrls || []).forEach(u => URL.revokeObjectURL(u)) } catch (_) {}
        setPreviewUrls([]);
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      const urls = await uploadBrandFiles({ userId, fileType, files: filesToSend });

      // 2) GET details for current selected profile
      const cur = pid ? await getBrandProfileById({ userId, profileId: pid }) : null;
      const bi = cur?.brand_identity || {};
      const tv = cur?.tone_and_voice || {};
      const lf = cur?.look_and_feel || {};
      const templatesArr = cur?.template || cur?.templates || [];

      // 3) Merge uploaded URLs into the correct array for this profile
      const voiceoverArr = cur?.voiceover || [];
      const nextLogos = fileType === 'logo' ? Array.from(new Set([...(bi.logo || []), ...urls])) : (bi.logo || []);
      const nextIcons = fileType === 'icon' ? Array.from(new Set([...(bi.icon || bi.icons || []), ...urls])) : (bi.icon || bi.icons || []);
      const nextTemplates = fileType === 'template' ? Array.from(new Set([...(Array.isArray(templatesArr) ? templatesArr : []), ...urls])) : (Array.isArray(templatesArr) ? templatesArr : []);
      const nextVoiceovers = Array.isArray(voiceoverArr) ? voiceoverArr : [];

      // 4) Update selected profile
      if (pid) {
        await updateBrandProfile({
          userId,
          profileId: pid,
          payload: {
            brand_identity: {
              logo: nextLogos,
              icon: nextIcons,
              icons: nextIcons,
              fonts: bi.fonts || [],
              colors: bi.colors || [],
              spacing: bi.spacing,
              tagline: bi.tagline,
            },
            tone_and_voice: tv,
            look_and_feel: lf,
            template: nextTemplates,
            voiceover: nextVoiceovers
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
        const tpls = a?.template || a?.templates || [];
        updateTemplatesState(tpls);
        resetPlacementState();
        const vos = a?.voiceover || [];
        setVoiceovers(Array.isArray(vos) ? vos : []);
      }

      if (targetType === 'voiceovers') resetVoiceoverFlow();
      setIsModalOpen(false);
      setSelectedFiles([]);
      try { (previewUrls || []).forEach(u => URL.revokeObjectURL(u)) } catch (_) {}
      setPreviewUrls([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
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
          {!selectedIsActive && selectedProfileId && (
            <button
              type="button"
              onClick={() => {
                const selectedProfile = profiles.find(p => (p.profile_id || p.id) === selectedProfileId);
                if (selectedProfile) {
                  setDeleteProfileConfirmData({
                    profileId: selectedProfileId,
                    profileName: selectedProfile.profile_name || selectedProfile.website_url || 'this profile',
                    userId: localStorage.getItem('token') || ''
                  });
                  setIsDeleteProfileConfirmOpen(true);
                }
              }}
              className="px-3 py-1.5 rounded-md bg-red-600 text-white text-sm hover:bg-red-700 flex items-center gap-1"
              title="Delete profile"
            >
              <Trash2 size={14} />
              Delete
            </button>
          )}
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

      {/* Brand Identity Details */}
    

      {/* Tone & Voice */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-gray-800 font-medium">Tone & Voice</p>
          <button
            type="button"
            onClick={() => {
              setWorkingTone(hydrateToneVoiceState(toneVoice));
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
                const name = (p && typeof p === 'object') ? p.name : ''
                const percentage = (p && typeof p === 'object') ? p.percentage : 50
                const label = (p && typeof p === 'object') ? (p.label || describeSliderSelection(name, percentage)) : describeSliderSelection(name, percentage)
                const formattedName = name ? name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : ''
                return (
                  <span key={i} className="px-2 py-1 rounded-full border">
                    {formattedName ? (
                      <><span className="font-semibold">{formattedName}</span>: {label}</>
                    ) : (
                      String(label || formattedName)
                    )}
                  </span>
                )
              }) : '—'}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Communication Style Pace</div>
            <div className="flex flex-wrap gap-2">
              {(toneVoice.communication_style_pace || []).length ? toneVoice.communication_style_pace.map((p, i) => {
                const name = (p && typeof p === 'object') ? p.name : '';
                const percentage = (p && typeof p === 'object') ? p.percentage : 50;
                const label = (p && typeof p === 'object') ? (p.label || describeSliderSelection(name, percentage)) : describeSliderSelection(name, percentage);
                const formattedName = name ? name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
                return (
                  <span key={i} className="px-2 py-1 rounded-full border">
                    {formattedName && label ? (
                      <><span className="font-semibold">{formattedName}</span>: {label}</>
                    ) : (
                      String(formattedName || label)
                    )}
                  </span>
                );
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
              setWorkingLook(hydrateLookFeelState(lookFeel));
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
                const name = (x && typeof x === 'object') ? x.name : ''
                const percentage = (x && typeof x === 'object') ? x.percentage : 50
                const label = (x && typeof x === 'object') ? (x.label || describeSliderSelection(name, percentage)) : describeSliderSelection(name, percentage)
                const formattedName = name ? name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : ''
                return (
                  <span key={i} className="px-2 py-1 rounded-full border">
                    {formattedName ? (
                      <><span className="font-semibold">{formattedName}</span>: {label}</>
                    ) : (
                      String(label || formattedName)
                    )}
                  </span>
                )
              }) : '—'}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Graphic Elements</div>
            <div className="flex flex-wrap gap-2 mt-1">
              {(lookFeel.graphic_elements || []).length ? lookFeel.graphic_elements.map((x, i) => {
                const name = (x && typeof x === 'object') ? x.name : '';
                const percentage = (x && typeof x === 'object') ? x.percentage : 50;
                const label = (x && typeof x === 'object') ? (x.label || describeSliderSelection(name, percentage)) : describeSliderSelection(name, percentage);
                const formattedName = name ? name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
                return (
                  <span key={i} className="px-2 py-1 rounded-full border">
                    {formattedName && label ? (
                      <><span className="font-semibold">{formattedName}</span>: {label}</>
                    ) : (
                      String(formattedName || label)
                    )}
                  </span>
                );
              }) : '—'}
            </div>
          </div>
          <div>
            <div className="text-gray-500">Aesthetic Consistency</div>
            <div className="flex flex-wrap gap-2 mt-1">
              {(lookFeel.aesthetic_consistency || []).length ? lookFeel.aesthetic_consistency.map((x, i) => {
                const name = (x && typeof x === 'object') ? x.name : '';
                const percentage = (x && typeof x === 'object') ? x.percentage : 50;
                const label = (x && typeof x === 'object') ? (x.label || describeSliderSelection(name, percentage)) : describeSliderSelection(name, percentage);
                const formattedName = name ? name.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) : '';
                return (
                  <span key={i} className="px-2 py-1 rounded-full border">
                    {formattedName && label ? (
                      <><span className="font-semibold">{formattedName}</span>: {label}</>
                    ) : (
                      String(formattedName || label)
                    )}
                  </span>
                );
              }) : '—'}
            </div>
          </div>
        </div>
      </section>

      {/* Generated Assets */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-gray-800 font-medium">Generated Assets</p>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600">Aspect Ratio:</label>
            <select
              value={selectedAspectRatio}
              onChange={(e) => setSelectedAspectRatio(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-1.5 text-sm"
            >
              <option value="9:16">9:16</option>
              <option value="16:9">16:9</option>
            </select>
          </div>
        </div>
        <div className="px-5 pb-5">
          {isLoadingGeneratedAssets ? (
            <div className="text-sm text-gray-500 py-4">Loading generated assets...</div>
          ) : generatedAssetsError ? (
            <div className="text-sm text-red-600 py-4">{generatedAssetsError}</div>
          ) : (
            (() => {
              const images = Array.isArray(generatedAssets.generated_images?.[selectedAspectRatio])
                ? generatedAssets.generated_images[selectedAspectRatio]
                : []
              
              if (images.length === 0) {
                return <p className="text-sm text-gray-500">No images for {selectedAspectRatio} aspect ratio.</p>
              }
              
              return (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((url, idx) => (
                    <div key={idx} className="relative group">
                      <img
                        src={url}
                        alt={`Generated image ${idx + 1}`}
                        className="w-full h-auto object-contain rounded border border-gray-200"
                        onError={(e) => {
                          e.target.style.display = 'none'
                        }}
                      />
                    </div>
                  ))}
                </div>
              )
            })()
          )}
        </div>
      </section>

      {/* Tone & Voice Modal */}
      {isToneModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white w-full max-w-4xl md:w-[60vw] max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Edit Tone & Voice</h3>
              <button onClick={() => setIsToneModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-sm text-gray-600 mb-1">Context</div>
                <textarea value={workingTone.context} onChange={e => setWorkingTone(prev => ({ ...prev, context: e.target.value }))} className="w-full border rounded-md px-3 py-2" rows={3} />
              </div>
              <div className="space-y-6">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-sm font-medium text-gray-800 mb-3">Brand Personality</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(workingTone.brand_personality || []).map((m, i) => {
                      const stepValue = getStepValueForEntry(m)
                      const selectionLabel = m.label || describeSliderSelection(m.name, m.percentage)
                      const displayName = formatSliderDisplayName(m.name)
                      return (
                        <div key={i} className="space-y-2 bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                          <div className="flex items-start gap-3">
                            <span className="w-40 truncate text-xs text-gray-600 pt-2" title={m.name}>{displayName}</span>
                            <div className="flex-1">
                              <div className="flex justify-between text-[11px] text-gray-400 px-1 pb-1">
                                {SLIDER_STEPS.map(step => (
                                  <span
                                    key={`${m.name}-step-${step}`}
                                    className={`${stepValue === step ? 'text-[#13008B] font-semibold' : 'text-gray-400'}`}
                                  >
                                    {formatStepLabel(step)}
                                  </span>
                                ))}
                              </div>
                              <input
                                type="range"
                                min={-2}
                                max={2}
                                step={1}
                                value={stepValue}
                                onChange={e => {
                                  const step = Number(e.target.value)
                                  const percent = stepToPercentValue(step)
                                  const label = describeSliderSelection(m.name, percent)
                                  setWorkingTone(prev => {
                                    const arr = [...(prev.brand_personality || [])]
                                    arr[i] = { ...arr[i], percentage: percent, label }
                                    return { ...prev, brand_personality: arr }
                                  })
                                }}
                                className="w-full accent-[#13008B]"
                              />
                            </div>
                          </div>
                          <div className="text-xs text-gray-700 text-right">{selectionLabel}</div>
                        </div>
                      )
                    })}
                  </div>
                </div>
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-sm font-medium text-gray-800 mb-3">Communication Style Pace</div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {(workingTone.communication_style_pace || []).map((m, i) => {
                      const stepValue = getStepValueForEntry(m)
                      const selectionLabel = m.label || describeSliderSelection(m.name, m.percentage)
                      const displayName = formatSliderDisplayName(m.name)
                      return (
                        <div key={i} className="space-y-2 bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                          <div className="flex items-start gap-3">
                            <span className="w-40 truncate text-xs text-gray-600 pt-2" title={m.name}>{displayName}</span>
                            <div className="flex-1">
                              <div className="flex justify-between text-[11px] text-gray-400 px-1 pb-1">
                                {SLIDER_STEPS.map(step => (
                                  <span
                                    key={`${m.name}-step-${step}`}
                                    className={`${stepValue === step ? 'text-[#13008B] font-semibold' : 'text-gray-400'}`}
                                  >
                                    {formatStepLabel(step)}
                                  </span>
                                ))}
                              </div>
                              <input
                                type="range"
                                min={-2}
                                max={2}
                                step={1}
                                value={stepValue}
                                onChange={e => {
                                  const step = Number(e.target.value)
                                  const percent = stepToPercentValue(step)
                                  const label = describeSliderSelection(m.name, percent)
                                  setWorkingTone(prev => {
                                    const arr = [...(prev.communication_style_pace || [])]
                                    arr[i] = { ...arr[i], percentage: percent, label }
                                    return { ...prev, communication_style_pace: arr }
                                  })
                                }}
                                className="w-full accent-[#13008B]"
                              />
                            </div>
                          </div>
                          <div className="text-xs text-gray-700 text-right">{selectionLabel}</div>
                        </div>
                      )
                    })}
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
                      brand_personality: (workingTone.brand_personality || []).map(x => {
                        const percent = clampPercent(x.percentage)
                        return { name: x.name, percentage: percent, label: describeSliderSelection(x.name, percent) }
                      }),
                      communication_style_pace: (workingTone.communication_style_pace || []).map(x => {
                        const percent = clampPercent(x.percentage)
                        return { name: x.name, percentage: percent, label: describeSliderSelection(x.name, percent) }
                      })
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
                    setToneVoice(hydrateToneVoiceState(tv));
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
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
          <div className="bg-white w-full max-w-5xl md:w-[60vw] max-h-[85vh] overflow-y-auto rounded-2xl shadow-xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Edit Look & Feel</h3>
              <button onClick={() => setIsLookModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            <div className="space-y-4">
              {['iconography','graphic_elements','aesthetic_consistency'].map(section => (
                <div key={section} className="bg-gray-50 rounded-xl p-4 border border-gray-100">
                  <div className="text-sm font-semibold text-gray-800 mb-1 capitalize">{section.replace('_',' ')}</div>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {(workingLook[section] || []).map((m, i) => {
                      const stepValue = getStepValueForEntry(m)
                      const selectionLabel = m.label || describeSliderSelection(m.name, m.percentage)
                      const displayName = formatSliderDisplayName(m.name)
                      return (
                        <div key={i} className="space-y-2 bg-white rounded-lg border border-gray-100 p-3 shadow-sm">
                          <div className="flex items-start gap-3">
                            <span className="w-40 truncate text-xs text-gray-600 pt-2" title={m.name}>{displayName}</span>
                            <div className="flex-1">
                              <div className="flex justify-between text-[11px] text-gray-400 px-1 pb-1">
                                {SLIDER_STEPS.map(step => (
                                  <span
                                    key={`${section}-${m.name}-step-${step}`}
                                    className={`${stepValue === step ? 'text-[#13008B] font-semibold' : 'text-gray-400'}`}
                                  >
                                    {formatStepLabel(step)}
                                  </span>
                                ))}
                              </div>
                              <input
                                type="range"
                                min={-2}
                                max={2}
                                step={1}
                                value={stepValue}
                                onChange={e => {
                                  const step = Number(e.target.value)
                                  const percent = stepToPercentValue(step)
                                  const label = describeSliderSelection(m.name, percent)
                                  setWorkingLook(prev => {
                                    const arr = [...(prev[section] || [])]
                                    arr[i] = { ...arr[i], percentage: percent, label }
                                    return { ...prev, [section]: arr }
                                  })
                                }}
                                className="w-full accent-[#13008B]"
                              />
                            </div>
                          </div>
                          <div className="text-xs text-gray-700 text-right">{selectionLabel}</div>
                        </div>
                      )
                    })}
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
                      iconography: (workingLook.iconography || []).map(x => {
                        const percent = clampPercent(x.percentage)
                        return { name: x.name, percentage: percent, label: describeSliderSelection(x.name, percent) }
                      }),
                      graphic_elements: (workingLook.graphic_elements || []).map(x => {
                        const percent = clampPercent(x.percentage)
                        return { name: x.name, percentage: percent, label: describeSliderSelection(x.name, percent) }
                      }),
                      aesthetic_consistency: (workingLook.aesthetic_consistency || []).map(x => {
                        const percent = clampPercent(x.percentage)
                        return { name: x.name, percentage: percent, label: describeSliderSelection(x.name, percent) }
                      })
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
                    setLookFeel(hydrateLookFeelState(lf));
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
          <div>
            <button type="button" onClick={() => openUploadModal('templates')} className="px-4 py-2 rounded-md bg-[#13008B] text-white text-sm">Upload</button>
          </div>
        </div>
        <div className="px-5 pb-5">
          {(!templates || templates.length === 0) ? (
            <p className="text-sm text-gray-500">No templates found.</p>
          ) : hasStructuredTemplates ? (
            <div className="space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-gray-700">Aspect Ratio</p>
                  <p className="text-xs text-gray-500">Choose which template set to view.</p>
                </div>
                <select
                  value={selectedTemplateAspect || (templateAspectOptions[0]?.value || '')}
                  onChange={(e) => setSelectedTemplateAspect(e.target.value)}
                  className="w-full sm:w-auto rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#13008B] focus:outline-none focus:ring-2 focus:ring-[#13008B]/30 bg-white"
                >
                  {templateAspectOptions.map(opt => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>
              {selectedTemplateGroup ? (
                <div className="space-y-6">
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Preset Templates</p>
                    {renderTemplateGrid(
                      presetTemplates,
                      `preset-${selectedTemplateAspect || templateAspectOptions[0]?.value || 'preset'}`,
                      'No preset templates yet.',
                      'Preset Template',
                      {
                        groupType: 'preset',
                        parentIndex: selectedTemplateGroup?.index ?? -1,
                        sourceKey: 'preset_templates'
                      }
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Templates</p>
                    {renderTemplateGrid(
                      uploadedTemplates,
                      `uploaded-${selectedTemplateAspect || templateAspectOptions[0]?.value || 'uploaded'}`,
                      'No uploaded templates yet.',
                      'Uploaded Template',
                      {
                        groupType: 'uploaded',
                        parentIndex: selectedTemplateGroup?.index ?? -1,
                        sourceKey: 'uploaded_templates'
                      }
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Images</p>
                    {uploadedTemplateImages.length > 0 ? (
                      <div className={`grid ${selectedTemplateAspect === '16:9' || selectedTemplateAspect === '16-9' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'} gap-4`}>
                        {uploadedTemplateImages.map((img, idx) => {
                          const label = `Uploaded Image ${idx + 1}`
                          const normalized = normalizeTemplateEntry(img.entry, label, {
                            parentIndex: selectedTemplateGroup?.index,
                            entryIndex: idx,
                            groupType: 'uploaded',
                            sourceKey: 'uploaded_images'
                          })
                          const canEdit = !!normalized?.template
                          const previewUrl = deriveTemplateImageUrl(img.entry, normalized) || img.url || ''
                          return (
                            <div key={`uploaded-image-${idx}`} className="relative group">
                            <button
                              type="button"
                                onClick={() => handleOpenTemplatePreview(normalized || img.entry, label)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' || e.key === ' ') {
                                    e.preventDefault()
                                    handleOpenTemplatePreview(normalized || img.entry, label)
                                  }
                                }}
                                className="w-full border rounded-lg overflow-hidden bg-gray-50 cursor-zoom-in focus:outline-none focus:ring-2 focus:ring-[#13008B]/40 focus:border-[#13008B]"
                              >
                                {previewUrl
                                  ? <img src={previewUrl} alt={label} className="w-full h-32 object-cover" />
                                  : <div className="p-4 text-xs text-gray-500 break-all">{JSON.stringify(img.entry)}</div>}
                            </button>
                              {previewUrl && (
                                <div className="pointer-events-none absolute inset-0 flex items-start justify-end p-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <div className="pointer-events-auto flex flex-col gap-2">
                                    <button
                                      type="button"
                                      onClick={(e) => { e.stopPropagation(); handleOpenTemplatePreview(normalized || img.entry, label) }}
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#13008B] shadow hover:bg-white"
                                      title="Zoom"
                                    >
                                      <ZoomIn size={16} />
                                    </button>
                                    <button
                                      type="button"
                                      onClick={(e) => { 
                                        e.stopPropagation();
                                        console.log('Edit clicked - img.entry:', img.entry);
                                        console.log('Edit clicked - derived previewUrl:', previewUrl);
                                         openImageEditorForEntry({
                                           templateEntry: normalized || img.entry,
                                           fallbackUrl: previewUrl,
                                           label
                                         })
                                      }}
                                      className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-green-600 shadow hover:bg-green-50"
                                      title="Edit image"
                                    >
                                      <ImageIcon size={16} />
                                    </button>
                                    {canEdit && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleEditTemplate(normalized, label) }}
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-[#13008B] shadow hover:bg-white"
                                        title="Edit placement"
                                      >
                                        <Edit2 size={16} />
                                      </button>
                                    )}
                                    {normalized?.template && (normalized.template.template_id || normalized.template.templateId || normalized.template.id) && (
                                      <button
                                        type="button"
                                        onClick={(e) => { e.stopPropagation(); handleDeleteTemplate(normalized, label) }}
                                        className="flex h-8 w-8 items-center justify-center rounded-full bg-white/90 text-red-600 shadow hover:bg-red-50"
                                        title="Delete image"
                                      >
                                        <Trash2 size={16} />
                                      </button>
                                    )}
                          </div>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No uploaded images yet for this aspect ratio.</p>
                    )}
                  </div>
                </div>
              ) : (
                <p className="text-sm text-gray-500">No templates available for the selected aspect ratio.</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {renderTemplateGrid(templates, 'template', 'No templates available yet.', 'Template', { groupType: 'direct' })}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">Uploaded Images</p>
                {fallbackUploadedImages.length > 0 ? (
                  <div className={`grid ${selectedTemplateAspect === '16:9' || selectedTemplateAspect === '16-9' ? 'grid-cols-1 sm:grid-cols-2 md:grid-cols-3' : 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4'} gap-4`}>
                    {fallbackUploadedImages.map((img, idx) => (
                      <div key={`fallback-uploaded-${idx}`} className="relative overflow-hidden rounded-lg border border-gray-200 bg-white group">
                        <button
                          type="button"
                          onClick={() => handleOpenTemplatePreview(img.entry, `Uploaded Image ${idx + 1}`)}
                          className="w-full focus:outline-none focus:ring-2 focus:ring-[#13008B]/40"
                        >
                          <img src={img.url} alt={`uploaded-image-${idx + 1}`} className="w-full h-32 object-cover" />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-gray-500">No uploaded images found.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>

      {isPlacementPromptOpen && placementTemplates.length > 0 && !isPlacementOverlayOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 px-4 py-8">
          <div className="w-full max-w-lg rounded-2xl border border-[#D8D3FF] bg-white shadow-2xl">
            <div className="flex items-start justify-between border-b border-[#E8E4FF] px-6 py-4">
              <div>
                <h3 className="text-lg font-semibold text-[#13008B]">New PPT templates are ready for text placement</h3>
                <p className="mt-1 text-sm text-[#372E8C]">Review the extracted slides and choose the best position for your copy.</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPlacementPromptOpen(false)
                  resetPlacementState()
                }}
                className="text-[#6255CC] transition hover:text-[#13008B]"
                aria-label="Dismiss placement prompt"
              >
                X
              </button>
            </div>
            <div className="px-6 py-5">
              <div className="rounded-xl border border-[#E8E4FF] bg-[#F6F4FF] px-4 py-3 text-sm text-[#4B3CC4]">
                We extracted {placementTemplates.length} template{placementTemplates.length > 1 ? 's' : ''} from your PPTX file. Place your text now or do it later.
              </div>
              <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
                <button
                  type="button"
                  onClick={() => {
                    setIsPlacementPromptOpen(false)
                    resetPlacementState()
                  }}
                  className="rounded-lg border border-[#13008B]/40 px-4 py-2 text-sm font-medium text-[#13008B] hover:bg-[#13008B]/10"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setPlacementSelectedIndex(0)
                    setPlacementError('')
                    setIsPlacementPromptOpen(false)
                    setPlacementPendingOpen(true)
                  }}
                  className="rounded-lg bg-[#13008B] px-4 py-2 text-sm font-semibold text-white shadow transition hover:bg-[#0f006b]"
                >
                  Place Now
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Voiceovers */}
      <section className="rounded-xl border border-gray-200 bg-white">
        <div className="flex items-center justify-between px-5 py-4">
          <p className="text-gray-800 font-medium">Voiceovers</p>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => { setVoiceTab('upload'); openUploadModal('voiceovers'); }} className="px-4 py-2 rounded-md bg-[#13008B] text-white text-sm hover:bg-[#0f006b] transition-colors">Upload</button>
            <button type="button" onClick={() => { setVoiceTab('record'); openUploadModal('voiceovers'); }} className="px-4 py-2 rounded-md bg-[#13008B] text-white text-sm hover:bg-[#0f006b] transition-colors">Record</button>
          </div>
        </div>
        <div className="px-5 pb-5">
          <div className="flex flex-wrap gap-2">
            {(() => {
              // Extract names from voiceover objects
              const allNames = (voiceovers || []).map(v => {
                if (typeof v === 'string') return v;
                if (typeof v === 'object' && v !== null) {
                  return v.name || v.voiceover_name || v.title || '';
                }
                return '';
              }).filter(Boolean);
              
              // Get unique names only
              const uniqueNames = Array.from(new Set(allNames));
              
              return uniqueNames.length === 0 ? (
                <p className="text-sm text-gray-500">No voiceovers added yet.</p>
              ) : (
                uniqueNames.map((name, idx) => (
                  <span key={idx} className="px-3 py-1.5 rounded-full border border-gray-300 bg-gray-50 text-sm text-gray-700">
                    {name}
                  </span>
                ))
              );
            })()}
            </div>
        </div>
      </section>

      {isPlacementOverlayOpen && placementTemplates.length > 0 && activePlacementWithPair && (
        <div className="fixed inset-0 z-50 flex w-full h-full bg-white">
          <div className="flex h-full w-full flex-col overflow-y-auto px-6 py-6 sm:px-12 sm:py-10 gap-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={resetPlacementState}
                  className="flex h-9 w-9 items-center justify-center rounded-full border border-[#13008B]/40 bg-[#13008B]/10 text-[#13008B] hover:bg-[#13008B]/20"
                  aria-label="Go back"
                >
                  <ChevronLeft size={18} />
                </button>
                <h3 className="text-lg font-semibold text-[#13008B]">Choose a Position</h3>
              </div>
              <button
                type="button"
                onClick={resetPlacementState}
                className="text-sm font-medium text-[#6255CC] hover:text-[#13008B]"
              >
                Skip for now
              </button>
            </div>
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2 justify-between">
              <div className="flex flex-wrap items-center gap-2">
                {PLACEMENT_TYPE_OPTIONS.map((opt) => {
                  const isActive = placementSelectedType === opt.value
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setPlacementSelectedType(opt.value)}
                      className={`flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium transition-all ${
                        isActive ? 'border-[#13008B] bg-[#13008B]/10 text-[#13008B]' : 'border-[#D1CCFF] text-[#4B3CC4] hover:border-[#13008B]/50'
                      }`}
                    >
                      <span>{opt.label}</span>
                      <span className="text-[10px] uppercase tracking-wide text-[#6F64E9]">{opt.detail}</span>
                    </button>
                  )
                })}
              </div>
                {activePlacementWithPair.pairImageUrl && (
                  <label className="flex items-center gap-2 text-xs font-medium text-[#13008B] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={syncEnabled}
                      onChange={(e) => setSyncEnabled(e.target.checked)}
                      className="w-4 h-4 text-[#13008B] border-[#D1CCFF] rounded focus:ring-[#13008B]"
                    />
                    <span>Sync Between Images</span>
                  </label>
                )}
              </div>
              <div className="space-y-4">
                {activePlacementWithPair.pairImageUrl && (
                  <div className="text-center">
                    <p className="text-xs font-medium text-[#6F64E9] mb-2">Base Image & Pair Image</p>
                  </div>
                )}
                <div className={`flex ${activePlacementWithPair.pairImageUrl ? 'gap-4' : ''} items-start justify-center`}>
              <div
                ref={placementContainerRef}
                    className={`relative inline-flex rounded-3xl border ${activeImageFormat === 'base' ? 'border-[#FF6B6B] ring-2 ring-[#FF6B6B]/30' : 'border-[#E4E1FF]'} bg-white shadow-xl overflow-hidden`}
              >
                <div ref={placementCanvasWrapperRef} className="relative">
                  <div className="absolute left-4 top-4 z-10 rounded-full bg-white/95 px-4 py-1 text-xs font-semibold text-[#13008B] shadow">
                        {activePlacementWithPair.pairImageUrl ? `Base Image ${activeImageFormat === 'base' ? '(Active)' : ''}` : activePlacementWithPair.label}
                  </div>
                  <img
                    ref={placementImageRef}
                        src={activePlacementWithPair.url}
                        alt={activePlacementWithPair.label}
                    className="max-h-[420px] object-contain bg-[#F7F5FF]"
                    onLoad={updatePlacementImageMetrics}
                  />
                  <canvas
                    ref={placementCanvasRef}
                    onMouseDown={handlePlacementMouseDown}
                    onMouseMove={(e) => {
                      handlePlacementMouseHover(e)
                      handlePlacementMouseMove(e)
                    }}
                    onMouseUp={handlePlacementMouseUp}
                    onMouseLeave={handlePlacementMouseUp}
                    style={{ cursor: placementCursorStyle, position: 'absolute', top: 0, left: 0 }}
                  />
                    </div>
                  </div>
                  {activePlacementWithPair.pairImageUrl && (
                    <div
                      ref={pairContainerRef}
                      className={`relative inline-flex rounded-3xl border ${activeImageFormat === 'pair' ? 'border-[#4ECDC4] ring-2 ring-[#4ECDC4]/30' : 'border-[#E4E1FF]'} bg-white shadow-xl overflow-hidden`}
                    >
                      <div ref={pairCanvasWrapperRef} className="relative">
                        <div className="absolute left-4 top-4 z-10 rounded-full bg-white/95 px-4 py-1 text-xs font-semibold text-[#13008B] shadow">
                          Pair Image {activeImageFormat === 'pair' && '(Active)'}
                        </div>
                        <img
                          ref={pairImageRef}
                          src={activePlacementWithPair.pairImageUrl}
                          alt={`${activePlacementWithPair.label} - Pair`}
                          className="max-h-[420px] object-contain bg-[#F7F5FF]"
                          onLoad={updatePairImageMetrics}
                        />
                        <canvas
                          ref={pairCanvasRef}
                          onMouseDown={(e) => handlePlacementMouseDown(e, 'pair')}
                          onMouseMove={(e) => {
                            handlePlacementMouseHover(e)
                            handlePlacementMouseMove(e)
                          }}
                          onMouseUp={handlePlacementMouseUp}
                          onMouseLeave={handlePlacementMouseUp}
                          style={{ cursor: pairCursorStyle, position: 'absolute', top: 0, left: 0 }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-[#E4E1FF] bg-white/95 p-4 shadow-inner">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-semibold text-[#13008B]">
                    Elements (Base: {placementBoxes.length}{activePlacementWithPair?.pairImageUrl ? ` | Pair: ${pairImageBoxes.length}` : ''})
                  </h4>
                  <button
                    type="button"
                    onClick={() => {
                      setPlacementBoxesState([])
                      setPairImageBoxes([])
                      setPlacementSelectedBoxId(null)
                      setPlacementCopiedBox(null)
                    }}
                    className="text-xs font-medium text-[#6255CC] hover:text-[#13008B] disabled:text-gray-300"
                    disabled={placementBoxes.length === 0 && pairImageBoxes.length === 0}
                  >
                    Clear All
                  </button>
                </div>
                <div className="mt-3 max-h-56 space-y-2 overflow-y-auto pr-1">
                  {placementBoxes.length === 0 && pairImageBoxes.length === 0 ? (
                    <p className="text-xs text-[#6F64E9]">Draw text or overlay areas on the image to define placement.</p>
                  ) : (
                    <>
                      {placementBoxes.length > 0 && (
                        <div className="space-y-2">
                          <p className="text-[10px] font-semibold text-[#FF6B6B] uppercase tracking-wide">Base Image</p>
                          {placementBoxes.map((box) => {
                            const isActive = activeImageFormat === 'base' && placementSelectedBoxId === box.id
                      return (
                        <div
                          key={box.id}
                          className={`rounded-xl border px-3 py-2 text-xs transition ${
                            isActive ? 'border-[#3B4EFD] bg-[#F1F0FF]' : 'border-[#E4E1FF] bg-white hover:border-[#3B4EFD]/50'
                          }`}
                        >
                          <button
                            type="button"
                                  onClick={() => {
                                    setActiveImageFormat('base')
                                    setPlacementSelectedBoxId(box.id)
                                  }}
                            className="w-full text-left"
                          >
                            <div className="flex items-center justify-between">
                                    <span className="font-semibold text-[#13008B] capitalize">{box.type}{box.synced_with ? ' ↔️' : ''}</span>
                              <span className="text-[10px] text-[#6F64E9]">{box.style.font_size}px</span>
                            </div>
                            <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[#4B3CC4]">
                              <span>X: {box.position.x.toFixed(1)}%</span>
                              <span>Y: {box.position.y.toFixed(1)}%</span>
                              <span>W: {box.position.width.toFixed(1)}%</span>
                              <span>H: {box.position.height.toFixed(1)}%</span>
                            </div>
                          </button>
                          <div className="mt-2 flex justify-end">
                            <button
                              type="button"
                              onClick={() => deletePlacementBox(box.id)}
                              className="flex items-center gap-1 rounded-full border border-red-100 px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50"
                            >
                              <Trash2 size={12} /> Remove
                            </button>
                          </div>
                        </div>
                      )
                          })}
                        </div>
                      )}
                      {pairImageBoxes.length > 0 && activePlacementWithPair?.pairImageUrl && (
                        <div className="space-y-2 mt-4">
                          <p className="text-[10px] font-semibold text-[#4ECDC4] uppercase tracking-wide">Pair Image</p>
                          {pairImageBoxes.map((box) => {
                            const isActive = activeImageFormat === 'pair' && placementSelectedBoxId === box.id
                            return (
                              <div
                                key={box.id}
                                className={`rounded-xl border px-3 py-2 text-xs transition ${
                                  isActive ? 'border-[#3B4EFD] bg-[#F1F0FF]' : 'border-[#E4E1FF] bg-white hover:border-[#3B4EFD]/50'
                                }`}
                              >
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveImageFormat('pair')
                                    setPlacementSelectedBoxId(box.id)
                                  }}
                                  className="w-full text-left"
                                >
                                  <div className="flex items-center justify-between">
                                    <span className="font-semibold text-[#13008B] capitalize">{box.type}{box.synced_with ? ' ↔️' : ''}</span>
                                    <span className="text-[10px] text-[#6F64E9]">{box.style.font_size}px</span>
                </div>
                                  <div className="mt-1 flex flex-wrap gap-2 text-[10px] text-[#4B3CC4]">
                                    <span>X: {box.position.x.toFixed(1)}%</span>
                                    <span>Y: {box.position.y.toFixed(1)}%</span>
                                    <span>W: {box.position.width.toFixed(1)}%</span>
                                    <span>H: {box.position.height.toFixed(1)}%</span>
                                  </div>
                                </button>
                                <div className="mt-2 flex justify-end">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setPairImageBoxes(prev => prev.filter(b => b.id !== box.id))
                                      // Also delete synced box from base if exists
                                      if (box.synced_with && syncEnabled) {
                                        setPlacementBoxesState(prev => prev.filter(b => b.id !== box.synced_with))
                                      }
                                    }}
                                    className="flex items-center gap-1 rounded-full border border-red-100 px-2 py-1 text-[10px] font-medium text-red-500 hover:bg-red-50"
                                  >
                                    <Trash2 size={12} /> Remove
                                  </button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
            {placementTemplates.length > 1 && (
              <div className="flex flex-wrap items-center gap-4 pb-1">
                {placementTemplates.map((tpl, idx) => {
                  const isActive = idx === placementSelectedIndex
                  return (
                    <button
                      key={`${tpl.url}-${idx}`}
                      type="button"
                      onClick={() => setPlacementSelectedIndex(idx)}
                      className={`flex-shrink-0 flex w-full max-w-[13rem] flex-col items-center rounded-2xl border bg-white p-2 shadow-sm transition-all ${
                        isActive
                          ? 'border-[#3B4EFD] ring-2 ring-[#3B4EFD]/30'
                          : 'border-[#E1DEFF] hover:border-[#3B4EFD]/40'
                      }`}
                    >
                      {tpl.pairImageUrl ? (
                        <div className="flex gap-1 h-32 w-full max-w-[13rem] overflow-hidden rounded-xl bg-[#F7F5FF]">
                          <div className="flex-1 flex items-center justify-center">
                            <img
                              src={tpl.url}
                              alt={`${tpl.label} - Base`}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                          <div className="flex-1 flex items-center justify-center border-l border-[#E4E1FF]">
                            <img
                              src={tpl.pairImageUrl}
                              alt={`${tpl.label} - Pair`}
                              className="max-h-full max-w-full object-contain"
                            />
                          </div>
                        </div>
                      ) : (
                      <div className="flex h-32 w-full max-w-[13rem] items-center justify-center overflow-hidden rounded-xl bg-[#F7F5FF]">
                        <img
                          src={tpl.url}
                          alt={tpl.label}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                      )}
                      <p className="mt-2 px-2 text-center text-xs font-medium text-[#4B3CC4]" title={tpl.label}>
                        {tpl.label}
                      </p>
                    </button>
                  )
                })}
              </div>
            )}
            {placementError && (
              <p className="text-xs font-medium text-red-500">{placementError}</p>
            )}
            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
              <button
                type="button"
                onClick={resetPlacementState}
                className="rounded-lg border border-[#D6D0FF] px-4 py-2 text-sm font-medium text-[#4B3CC4] hover:bg-[#ECE9FF]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePlacementSave}
                disabled={placementBoxes.length === 0 || isPlacementSaving}
                className={`inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white shadow ${
                  placementBoxes.length === 0 || isPlacementSaving
                    ? 'bg-[#B7B1FF] cursor-not-allowed'
                    : 'bg-[#13008B] hover:bg-[#0f006b]'
                }`}
              >
                {isPlacementSaving && <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />}
                {isPlacementSaving ? 'Saving…' : 'Save Placement'}
              </button>
            </div>
          </div>
        </div>
      )}

      {templatePreview.url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={handleCloseTemplatePreview}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] w-full flex flex-col items-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between w-full mb-3">
              <p className="text-white text-sm font-medium">
                {templatePreview.title || 'Template Preview'}
              </p>
              <button
                type="button"
                onClick={handleCloseTemplatePreview}
                className="text-white/80 hover:text-white text-lg leading-none"
                aria-label="Close preview"
              >
                ✕
              </button>
            </div>
            <div className="w-full flex-1 flex items-center justify-center overflow-hidden rounded-lg bg-black">
              <img
                src={templatePreview.url}
                alt={templatePreview.title || 'Template preview'}
                className="max-h-[85vh] max-w-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Colors */}
    

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
              <h3 className="text-lg font-semibold text-gray-900">
                {targetType === 'logos' ? 'Upload Brand Images' : 
                 targetType === 'icons' ? 'Upload Icons' : 
                 targetType === 'templates' ? 'Upload Templates' : 
                 voiceTab === 'upload' ? 'Upload Voiceover' : 'Record Voiceover'}
              </h3>
              <button onClick={() => { if (targetType === 'voiceovers') resetVoiceoverFlow(); setIsModalOpen(false); }} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            {targetType === 'voiceovers' ? (
              <div>
                {voiceTab === 'upload' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-tight text-gray-500 overflow-x-auto pb-2">
                      {VOICEOVER_FLOW_STEPS.map((step, idx) => {
                        const isActive = voiceWizardStep === step.id
                        const isCompleted = idx < currentVoiceStepIndex
                        return (
                          <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] flex-shrink-0 ${
                                isActive
                                  ? 'border-[#13008B] bg-[#13008B] text-white'
                                  : isCompleted
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : 'border-gray-300 text-gray-500'
                              }`}
                            >
                              {idx + 1}
                  </div>
                            <span className={`${isActive ? 'text-[#13008B]' : isCompleted ? 'text-green-600' : 'text-gray-500'} hidden sm:inline`}>{step.label}</span>
                            {idx < VOICEOVER_FLOW_STEPS.length - 1 && (
                              <div className="w-4 sm:w-6 h-px bg-gray-300 mx-1"></div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {voiceWizardStep === 'name' && (
                      <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800">Name Your Voice</h4>
                          <p className="text-xs text-gray-500 mt-1">We will use this name for all four tone variations.</p>
                        </div>
                        <input
                          type="text"
                          value={voiceoverBaseName}
                          onChange={(e) => setVoiceoverBaseName(e.target.value)}
                          placeholder="e.g., Brand Ambassador Voice"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B]/30"
                        />
                        <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => {
                              const rawBaseName = typeof voiceoverBaseName === 'string' ? voiceoverBaseName : ''
                              const cleanedName = rawBaseName.trim()
                              if (!cleanedName) {
                                setErrorMsg('Please provide a voice name before continuing.')
                                return
                              }
                              setErrorMsg('')
                              setVoiceoverBaseName(cleanedName)
                              const firstTone = VOICEOVER_TONES[0]
                              setVoiceWizardStep(firstTone.id)
                              setGeneratedContent(VOICEOVER_TONE_SCRIPTS[firstTone.id] || '')
                              setRecordBlobUrl('')
                              setSelectedFiles([])
                              setPreviewUrls([])
                            }}
                            className="px-4 py-2 rounded-md bg-[#13008B] text-white text-sm hover:bg-[#0f006b]"
                          >
                            Continue
                            </button>
                        </div>
                      </div>
                    )}

                    {currentVoiceTone && (
                      <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800">Upload – {currentVoiceTone.label}</h4>
                            <p className="text-xs text-gray-500 mt-1">{currentVoiceTone.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setVoiceWizardStep('name')
                              setGeneratedContent('')
                              setRecordBlobUrl('')
                              setSelectedFiles([])
                              setPreviewUrls([])
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Edit Name
                          </button>
                        </div>
                        <div onDrop={handleDrop} onDragOver={handleDragOver} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-600">
                          <p className="mb-2">Drag & drop audio file here</p>
                          <p className="text-sm mb-3">or</p>
                          <input ref={fileInputRef} type="file" accept={'audio/*'} className="hidden" onChange={(e) => onFilesPicked(e.target.files)} />
                          <button type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md">Browse audio</button>
                        </div>
                        {selectedFiles.length > 0 && (
                          <div className="space-y-2">
                            <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                              <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-[#13008B] to-[#0f006b] flex items-center justify-center">
                                <Mic className="w-5 h-5 text-white" strokeWidth={2.5} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-800 truncate">{selectedFiles[0]?.name || 'Audio File'}</p>
                                <p className="text-xs text-gray-500 mt-1">{currentVoiceTone.label}</p>
                              </div>
                            </div>
                            <div className="flex items-center justify-end">
                        <button
                          type="button"
                                onClick={() => {
                                  setSelectedFiles([])
                                  setPreviewUrls([])
                                  if (fileInputRef.current) fileInputRef.current.value = ''
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Remove
                        </button>
                            </div>
                          </div>
                        )}
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedFiles([])
                              setPreviewUrls([])
                              setVoiceWizardStep('name')
                              setGeneratedContent('')
                              if (fileInputRef.current) fileInputRef.current.value = ''
                            }}
                            className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={handleVoiceoverSave}
                            disabled={isSavingVoiceover || !selectedFiles.length}
                            className={`px-4 py-2 rounded-md text-sm text-white ${isSavingVoiceover || !selectedFiles.length ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#13008B] hover:bg-[#0f006b]'}`}
                          >
                            {isSavingVoiceover ? 'Saving…' : 'Save Tone'}
                          </button>
                        </div>
                      </div>
                    )}

                    {voiceWizardStep === 'complete' && (
                      <div className="border border-green-200 bg-green-50 rounded-lg p-4 text-center space-y-2">
                        <div className="text-green-600 text-lg font-semibold">All Voiceovers Saved!</div>
                        <p className="text-xs text-green-700">Thanks for uploading each tone. We will close this window in a moment.</p>
                      </div>
                    )}
                  </div>
                )}
                {voiceTab === 'record' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between gap-1 text-[10px] font-semibold uppercase tracking-tight text-gray-500 overflow-x-auto pb-2">
                      {VOICEOVER_FLOW_STEPS.map((step, idx) => {
                        const isActive = voiceWizardStep === step.id
                        const isCompleted = idx < currentVoiceStepIndex
                        return (
                          <div key={step.id} className="flex items-center gap-1 flex-shrink-0">
                            <div
                              className={`flex h-5 w-5 items-center justify-center rounded-full border text-[10px] flex-shrink-0 ${
                                isActive
                                  ? 'border-[#13008B] bg-[#13008B] text-white'
                                  : isCompleted
                                    ? 'border-green-500 bg-green-500 text-white'
                                    : 'border-gray-300 text-gray-500'
                              }`}
                            >
                              {idx + 1}
                            </div>
                            <span className={`${isActive ? 'text-[#13008B]' : isCompleted ? 'text-green-600' : 'text-gray-500'} hidden sm:inline`}>{step.label}</span>
                            {idx < VOICEOVER_FLOW_STEPS.length - 1 && (
                              <div className="w-4 sm:w-6 h-px bg-gray-300 mx-1"></div>
                            )}
                          </div>
                        )
                      })}
                    </div>

                    {voiceWizardStep === 'name' && (
                      <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                        <div>
                          <h4 className="text-sm font-semibold text-gray-800">Name Your Voice</h4>
                          <p className="text-xs text-gray-500 mt-1">We will use this name for all four tone variations.</p>
                        </div>
                        <input
                          type="text"
                          value={voiceoverBaseName}
                          onChange={(e) => setVoiceoverBaseName(e.target.value)}
                          placeholder="e.g., Brand Ambassador Voice"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#13008B] focus:ring-2 focus:ring-[#13008B]/30"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              const rawBaseName = typeof voiceoverBaseName === 'string' ? voiceoverBaseName : ''
                              const cleanedName = rawBaseName.trim()
                              if (!cleanedName) {
                                setErrorMsg('Please provide a voice name before continuing.')
                                return
                              }
                              setErrorMsg('')
                              setVoiceoverBaseName(cleanedName)
                              const firstTone = VOICEOVER_TONES[0]
                              setVoiceWizardStep(firstTone.id)
                              setGeneratedContent(VOICEOVER_TONE_SCRIPTS[firstTone.id] || '')
                              setRecordBlobUrl('')
                              setSelectedFiles([])
                              setPreviewUrls([])
                            }}
                            className="px-4 py-2 rounded-md bg-[#13008B] text-white text-sm hover:bg-[#0f006b]"
                          >
                            Continue
                        </button>
                        </div>
                      </div>
                    )}

                    {currentVoiceTone && (
                      <div className="border border-gray-200 rounded-lg p-4 space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-semibold text-gray-800">Record – {currentVoiceTone.label}</h4>
                            <p className="text-xs text-gray-500 mt-1">{currentVoiceTone.description}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setVoiceWizardStep('name')
                              setGeneratedContent('')
                              setRecordBlobUrl('')
                              setSelectedFiles([])
                              setPreviewUrls([])
                            }}
                            className="text-xs text-gray-500 hover:text-gray-700"
                          >
                            Edit Name
                          </button>
                        </div>
                        <div className="bg-gray-50 rounded-lg p-4 text-sm text-gray-700 leading-relaxed">
                          {generatedContent || VOICEOVER_TONE_SCRIPTS[currentVoiceTone.id] || 'Please read this sample content for your voiceover recording.'}
                        </div>
                        <div className="flex flex-col gap-3">
                          <button
                            type="button"
                            className={`px-4 py-2 rounded-md text-sm font-medium ${
                              isRecording
                                ? 'bg-red-600 text-white hover:bg-red-700'
                                : 'bg-[#13008B] text-white hover:bg-[#0f006b]'
                            }`}
                            onClick={async () => {
                              try {
                                if (!isRecording) {
                                  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                                    setErrorMsg('Recording not supported in this browser.')
                                    return
                                  }
                                  const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
                                  recStreamRef.current = stream
                                  const preferredTypes = ['audio/mpeg', 'audio/mp4', 'audio/webm']
                                  let mimeType = ''
                                  if (window.MediaRecorder && MediaRecorder.isTypeSupported) {
                                    mimeType = preferredTypes.find(type => MediaRecorder.isTypeSupported(type)) || ''
                                  }
                                  const mr = new MediaRecorder(stream, mimeType ? { mimeType } : undefined)
                                  mediaRecorderRef.current = mr
                                  const chunks = []
                                  mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data) }
                                  mr.onstop = () => {
                                    try {
                                      const blob = new Blob(chunks, { type: mimeType || 'audio/webm' })
                                      const mp3Blob = blob.type === 'audio/mpeg' ? blob : new Blob([blob], { type: 'audio/mpeg' })
                                      const url = URL.createObjectURL(mp3Blob)
                                      if (recordBlobUrl) { try { URL.revokeObjectURL(recordBlobUrl) } catch (_) {} }
                                      setRecordBlobUrl(url)
                                      const baseNameForFile = typeof voiceoverBaseName === 'string' ? voiceoverBaseName : ''
                                      const sanitizedName = `${(baseNameForFile || 'voiceover').trim().toLowerCase().replace(/\s+/g, '_')}_${currentVoiceTone.id}`
                                      const file = new File([mp3Blob], `${sanitizedName}.mp3`, { type: 'audio/mpeg' })
                                      setSelectedFiles([file])
                                      setPreviewUrls([url])
                                      setErrorMsg('')
                                    } catch (_) { /* noop */ }
                                  }
                                  mr.start()
                                  setIsRecording(true)
                                } else {
                                  const mr = mediaRecorderRef.current
                                  if (mr && mr.state !== 'inactive') mr.stop()
                                  try { (recStreamRef.current?.getTracks() || []).forEach(t => t.stop()) } catch (_) { /* noop */ }
                                  setIsRecording(false)
                                }
                              } catch (err) {
                                setErrorMsg('Failed to access microphone. Please check permissions.')
                              }
                            }}
                          >
                            {isRecording ? '⏹ Stop Recording' : '🎤 Start Recording'}
                          </button>
                          {recordBlobUrl && selectedFiles.length > 0 && (
                            <div className="space-y-2">
                              <div className="flex items-center gap-3 p-3 border border-gray-200 rounded-lg bg-gray-50">
                                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-gradient-to-br from-[#13008B] to-[#0f006b] flex items-center justify-center">
                                  <Mic className="w-5 h-5 text-white" strokeWidth={2.5} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-gray-800 truncate">{selectedFiles[0]?.name || 'Recording'}</p>
                                  <p className="text-xs text-gray-500 mt-1">{currentVoiceTone.label}</p>
                                </div>
                              </div>
                              <div className="flex items-center justify-end">
                              <button
                                type="button"
                                onClick={() => {
                                    if (recordBlobUrl) { try { URL.revokeObjectURL(recordBlobUrl) } catch (_) {} }
                                    setRecordBlobUrl('')
                                    setSelectedFiles([])
                                    setPreviewUrls([])
                                }}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Re-record
                              </button>
                              </div>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            type="button"
                            onClick={() => {
                              setRecordBlobUrl('')
                              setSelectedFiles([])
                              setPreviewUrls([])
                              setVoiceWizardStep('name')
                              setGeneratedContent('')
                            }}
                            className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm"
                          >
                            Back
                          </button>
                          <button
                            type="button"
                            onClick={handleVoiceoverSave}
                            disabled={isSavingVoiceover || !selectedFiles.length || isRecording}
                            className={`px-4 py-2 rounded-md text-sm text-white ${isSavingVoiceover || !selectedFiles.length || isRecording ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#13008B] hover:bg-[#0f006b]'}`}
                          >
                            {isSavingVoiceover ? 'Saving…' : 'Save Tone'}
                          </button>
                        </div>
                      </div>
                    )}

                    {voiceWizardStep === 'complete' && (
                      <div className="border border-green-200 bg-green-50 rounded-lg p-4 text-center space-y-2">
                        <div className="text-green-600 text-lg font-semibold">All Voiceovers Saved!</div>
                        <p className="text-xs text-green-700">Thanks for recording each tone. We will close this window in a moment.</p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              <div>
                {isTemplateTarget && (
                  <div className="mb-4 space-y-3">
                    <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleTemplateModeChange('image')}
                      className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                        templateUploadMode === 'image'
                          ? 'border-[#13008B] bg-[#13008B]/10 text-[#13008B]'
                          : 'border-gray-200 text-gray-600 hover:border-[#13008B]/40 hover:text-[#13008B]'
                      }`}
                    >
                      Upload Images
                    </button>
                    <button
                      type="button"
                      onClick={() => handleTemplateModeChange('ppt')}
                      className={`px-3 py-2 rounded-md border text-sm transition-colors ${
                        templateUploadMode === 'ppt'
                          ? 'border-[#13008B] bg-[#13008B]/10 text-[#13008B]'
                          : 'border-gray-200 text-gray-600 hover:border-[#13008B]/40 hover:text-[#13008B]'
                      }`}
                    >
                      Upload PPT
                    </button>
                    </div>
                    <div className="flex items-center justify-between px-1">
                      <label className="text-sm font-medium text-gray-700">
                        Convert Colors
                      </label>
                      <button
                        type="button"
                        onClick={() => setConvertColors(!convertColors)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-[#13008B] focus:ring-offset-2 ${
                          convertColors ? 'bg-[#13008B]' : 'bg-gray-300'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                            convertColors ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                )}
                <div onDrop={handleDrop} onDragOver={handleDragOver} className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center text-gray-600">
                  <p className="mb-2">{dropzoneTitle}</p>
                  <p className="text-sm mb-3">{dropzoneSubtitle}</p>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept={dropzoneAccept}
                    multiple={dropzoneMultiple}
                    className="hidden"
                    onChange={(e) => {
                      onFilesPicked(e.target.files);
                      if (fileInputRef.current) fileInputRef.current.value = '';
                    }}
                  />
                  <button type="button" onClick={() => fileInputRef.current && fileInputRef.current.click()} className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-md">
                    {dropzoneButtonLabel}
                  </button>
                </div>
              </div>
            )}
            {isTemplateTarget && isTemplatePptMode && selectedFiles.length > 0 && (
              <div className="mt-4 flex items-center justify-between rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-sm text-blue-900">
                <div className="mr-3">
                  <p className="font-medium">{selectedFiles[0].name}</p>
                  <p className="text-xs opacity-80">{formatFileSize(selectedFiles[0].size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedFiles([]);
                    if (fileInputRef.current) fileInputRef.current.value = '';
                    try { (previewUrls || []).forEach(u => URL.revokeObjectURL(u)) } catch (_) {}
                    setPreviewUrls([]);
                    setErrorMsg('');
                  }}
                  className="inline-flex items-center gap-1 text-xs font-medium text-blue-800 hover:text-blue-900"
                >
                  <Trash2 size={14} />
                  Remove
                </button>
              </div>
            )}
            {/* Preview */}
            {previewUrls.length > 0 && targetType !== 'voiceovers' && !isTemplatePptMode && (
              <div className="mt-4 grid grid-cols-3 gap-3">
                {previewUrls.map((u, i) => (
                  <div key={i} className="relative border rounded-lg overflow-hidden h-24">
                    <img src={u} alt={`preview-${i}`} className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
            {errorMsg && targetType !== 'voiceovers' && <div className="mt-3 text-sm text-red-600">{errorMsg}</div>}
            {targetType !== 'voiceovers' && (
            <div className="mt-5 flex items-center justify-end gap-2">
                <button
                  onClick={() => {
                    setIsModalOpen(false)
                  }}
                  className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200"
                >Cancel</button>
                <button
                  onClick={saveFiles}
                  disabled={isSaving || selectedFiles.length === 0}
                  className={`px-4 py-2 rounded-md text-white ${isSaving || selectedFiles.length === 0 ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}
                >
                {isSaving ? 'Saving…' : 'Save'}
              </button>
            </div>
            )}
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
                <div className="space-y-2">
                  <p className="text-xs text-gray-500">Drag to reorder, click × to remove</p>
                  <div className="space-y-2">
                  {workingColors.map((c, i) => (
                      <div
                        key={i}
                        draggable
                        onDragStart={(e) => {
                          setDraggedColorIndex(i);
                          e.dataTransfer.effectAllowed = 'move';
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.dataTransfer.dropEffect = 'move';
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggedColorIndex !== null && draggedColorIndex !== i) {
                            const newColors = [...workingColors];
                            const [removed] = newColors.splice(draggedColorIndex, 1);
                            newColors.splice(i, 0, removed);
                            setWorkingColors(newColors);
                          }
                          setDraggedColorIndex(null);
                        }}
                        onDragEnd={() => setDraggedColorIndex(null)}
                        className={`px-3 py-2 rounded-lg border text-sm flex items-center gap-3 cursor-move hover:bg-gray-50 transition-colors ${draggedColorIndex === i ? 'opacity-50 border-blue-500' : 'border-gray-300'}`}
                      >
                        <span className="text-gray-400 cursor-move">☰</span>
                        <span className="inline-block w-6 h-6 rounded border" style={{ background: c }} />
                        <span className="flex-1 font-mono">{c}</span>
                        <button onClick={() => setWorkingColors(prev => prev.filter((_, idx) => idx !== i))} title="Remove" className="text-gray-500 hover:text-red-600 transition-colors">✕</button>
                      </div>
                    ))}
                  </div>
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
                      const pid = selectedProfileId;
                      
                      if (!userId || !pid) {
                        setColorsError('Missing user or profile information');
                        return;
                      }

                      // Normalize colors
                      const norm = (c) => {
                        if (!c) return '';
                        let x = String(c).trim();
                        if (!x.startsWith('#')) x = `#${x}`;
                        return x.toLowerCase();
                      };
                      
                      const normalizedColors = (workingColors || []).map(norm).filter(c => !!c);
                      
                      // Get current profile data
                      const currentAll = await getBrandProfileById({ userId, profileId: pid });
                        const biAll = currentAll?.brand_identity || {};
                        const tvAll = currentAll?.tone_and_voice || {};
                        const lfAll = currentAll?.look_and_feel || {};
                        const templatesAll = currentAll?.template || currentAll?.templates || [];
                        const voiceoverAll = currentAll?.voiceover || [];
                      
                      // Update brand profile with new colors
                          await updateBrandProfile({
                            userId,
                            profileId: pid,
                            payload: {
                          brand_identity: { 
                            logo: biAll.logo || [], 
                            icon: biAll.icon || biAll.icons || [], 
                            fonts: biAll.fonts || [], 
                            colors: normalizedColors, 
                            spacing: biAll.spacing, 
                            tagline: biAll.tagline 
                          },
                              tone_and_voice: tvAll,
                              look_and_feel: lfAll,
                              template: templatesAll,
                              voiceover: voiceoverAll
                            }
                          });
                      
                      // Regenerate templates after updating colors
                      setIsRegeneratingTemplates(true);
                      try {
                        await regenerateTemplates({ userId, profileId: pid });
                        
                        // Fetch updated profile data after regeneration
                        const updated = await getBrandProfileById({ userId, profileId: pid });
                        const bi = updated?.brand_identity || {};
                        const tv = updated?.tone_and_voice || {};
                        const lf = updated?.look_and_feel || {};
                        
                        // Update all brand assets
                        setLogos(bi.logo || []);
                        setIcons(bi.icon || bi.icons || []);
                        setFonts(bi.fonts || []);
                          setColors(bi.colors || []);
                        setTagline(bi.tagline || '');
                        setSpacing(bi.spacing || '');
                        
                        // Update tone and voice
                        setToneVoice(hydrateToneVoiceState(tv));
                        
                        // Update look and feel
                        setLookFeel(hydrateLookFeelState(lf));
                        
                        // Update templates with regenerated ones
                        const tpls = updated?.template || updated?.templates || [];
                        updateTemplatesState(tpls);
                        
                        // Update voiceovers
                        const vos = updated?.voiceover || [];
                        setVoiceovers(Array.isArray(vos) ? vos : []);
                        
                      } catch (e) {
                        console.error('Failed to regenerate templates:', e);
                        setColorsError('Colors updated but template regeneration failed. Please try again.');
                        // Still refresh colors even if regeneration failed
                        const updated = await getBrandProfileById({ userId, profileId: pid });
                        const bi = updated?.brand_identity || {};
                        setColors(bi.colors || []);
                      } finally {
                        setIsRegeneratingTemplates(false);
                      }
                      
                      setIsColorsModalOpen(false);
                    } catch (e) {
                      setColorsError(e?.message || 'Failed to save colors');
                    } finally { 
                      setIsSavingColors(false);
                    }
                  }}
                  disabled={isSavingColors}
                  className={`px-4 py-2 rounded-md text-white ${isSavingColors ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}
                >{isSavingColors ? 'Saving…' : 'Save'}</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Regenerating Templates Loading Overlay */}
      {isRegeneratingTemplates && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600"></div>
              <h3 className="text-xl font-semibold text-gray-900">Regenerating Templates</h3>
              <p className="text-sm text-gray-600 text-center">
                Please wait while we regenerate your templates with the updated colors...
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Loading Template Details Overlay */}
      {isLoadingTemplateDetails && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md mx-4">
            <div className="flex flex-col items-center gap-4">
              <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-blue-600"></div>
              <h3 className="text-xl font-semibold text-gray-900">Loading Template</h3>
              <p className="text-sm text-gray-600 text-center">
                Please wait while we load the template details...
              </p>
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
              <button 
                onClick={() => {
                  if (!isPollingJob) {
                    setIsWebsiteModalOpen(false);
                    setWebsiteUrl('');
                    setProfileName('');
                    setWebsiteError('');
                    setJobStatus('');
                  }
                }} 
                className="text-gray-500 hover:text-gray-700"
                disabled={isPollingJob}
              >
                ✕
              </button>
            </div>
            {isPollingJob ? (
              <div className="space-y-4 py-6">
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#13008B]"></div>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="h-8 w-8 rounded-full bg-[#13008B]/10"></div>
                    </div>
                  </div>
                  <div className="text-center">
                    <h4 className="text-lg font-semibold text-gray-900 mb-1">Creating Profile</h4>
                    <p className="text-sm text-gray-600"></p>
                    <p className="text-xs text-gray-500 mt-2">This may take a few moments. Please don't close this window.</p>
                  </div>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#13008B] h-2 rounded-full animate-pulse" style={{ width: '60%' }}></div>
                </div>
              </div>
            ) : (
              <>
                <div className="space-y-3">
                  <input
                    type="text"
                    placeholder="https://example.com"
                    value={websiteUrl}
                    onChange={(e) => setWebsiteUrl(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    disabled={isAnalyzing}
                  />
                  <input
                    type="text"
                    placeholder="Profile name (e.g., Apple Brand)"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                    disabled={isAnalyzing}
                  />
                  {websiteError && <div className="text-sm text-red-600">{websiteError}</div>}
                </div>
                <div className="flex items-center justify-end gap-2 mt-4">
                  <button 
                    onClick={() => {
                      setIsWebsiteModalOpen(false);
                      setWebsiteUrl('');
                      setProfileName('');
                      setWebsiteError('');
                      setJobStatus('');
                    }} 
                    className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200"
                    disabled={isAnalyzing}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                  try {
                    setWebsiteError(''); setIsAnalyzing(true);
                    const userId = localStorage.getItem('token') || '';
                    if (!userId) { setWebsiteError('Missing user session'); return; }
                    if (!websiteUrl || !websiteUrl.trim()) { setWebsiteError('Please enter a website URL'); return; }
                    if (!profileName || !profileName.trim()) { setWebsiteError('Please enter a profile name'); return; }
                    
                    // 1) Create profile queue and get job_id
                    const queueResponse = await createBrandProfileQueue({ 
                      userId, 
                      website: websiteUrl.trim(), 
                      profileName: profileName.trim(), 
                      setAsActive: true 
                    });
                    
                    const jobId = queueResponse?.job_id || queueResponse?.jobId || queueResponse?.id;
                    if (!jobId) {
                      throw new Error('Failed to get job ID from queue response');
                    }
                    
                    // 2) Poll job status until it's "Successfully"
                    setIsPollingJob(true);
                    setJobStatus('Processing...');
                    
                    let jobComplete = false;
                    let pollAttempts = 0;
                    const maxPollAttempts = 120; // 10 minutes max (5 seconds * 120)
                    const pollInterval = 5000; // 5 seconds
                    
                    while (!jobComplete && pollAttempts < maxPollAttempts) {
                      await new Promise(resolve => setTimeout(resolve, pollInterval));
                      
                      try {
                        const statusResponse = await getJobStatus({ userId, jobId });
                        const status = statusResponse?.status || statusResponse?.job_status || '';
                        
                        if (status.toLowerCase() === 'succeeded' || status.toLowerCase() === 'succeed' || status.toLowerCase() === 'success' || status.toLowerCase() === 'successfully') {
                          jobComplete = true;
                          setJobStatus('Completed!');
                        } else if (status.toLowerCase().includes('fail') || status.toLowerCase().includes('error')) {
                          throw new Error(statusResponse?.message || 'Job failed');
                        } else {
                          setJobStatus(`Processing... (${status})`);
                        }
                      } catch (pollError) {
                        // If it's a 404 or similar, the job might not exist yet, continue polling
                        if (pollAttempts < 10) {
                          pollAttempts++;
                          continue;
                        }
                        throw pollError;
                      }
                      
                      pollAttempts++;
                    }
                    
                    if (!jobComplete) {
                      throw new Error('Job timed out. Please check the profile status manually.');
                    }
                    
                    setIsPollingJob(false);
                    
                    // 3) GET all profiles, set dropdown, select the active one
                    const plist = await getBrandProfiles(userId);
                    plist.sort((a,b) => (b?.is_active?1:0) - (a?.is_active?1:0));
                    setProfiles(plist);
                    const newSelected = plist.find(p => p.is_active)?.profile_id || plist.find(p => p.is_active)?.id || plist[0]?.profile_id || plist[0]?.id || '';
                    if (newSelected) setSelectedProfileId(newSelected);
                    
                    // 4) GET details of the selected profile and populate UI
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
                      setToneVoice(hydrateToneVoiceState(tv));
                      const lf = a?.look_and_feel || {};
                      setLookFeel(hydrateLookFeelState(lf));
                      const tpls = a?.template || a?.templates || [];
                      updateTemplatesState(tpls);
                      const vos = a?.voiceover || [];
                      setVoiceovers(Array.isArray(vos) ? vos : []);
                    }
                    
                    setIsWebsiteModalOpen(false);
                    setWebsiteUrl('');
                    setProfileName('');
                    setJobStatus('');
                  } catch (e) {
                    setWebsiteError(e?.message || 'Failed to create profile');
                    setIsPollingJob(false);
                    setJobStatus('');
                  } finally { 
                    setIsAnalyzing(false);
                  }
                }}
                disabled={isAnalyzing || isPollingJob}
                className={`px-4 py-2 rounded-md text-white ${isAnalyzing || isPollingJob ? 'bg-gray-300 cursor-not-allowed' : 'bg-[#13008B] hover:bg-blue-800'}`}
              >
                {isPollingJob ? 'Processing…' : isAnalyzing ? 'Saving…' : 'Save'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {isDeleteConfirmOpen && deleteConfirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[92%] max-w-md rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Template</h3>
              <button
                onClick={() => {
                  setIsDeleteConfirmOpen(false)
                  setDeleteConfirmData(null)
                }}
                className="text-gray-500 hover:text-gray-700"
                disabled={isDeleting}
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <span className="font-semibold">"{deleteConfirmData.label}"</span>?
              </p>
              <p className="text-xs text-red-600 font-medium">
                This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setIsDeleteConfirmOpen(false)
                  setDeleteConfirmData(null)
                }}
                disabled={isDeleting}
                className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteTemplate}
                disabled={isDeleting}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeleting && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                )}
                {isDeleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Profile Confirmation Modal */}
      {isDeleteProfileConfirmOpen && deleteProfileConfirmData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[92%] max-w-md rounded-lg shadow-xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Delete Profile</h3>
              <button
                onClick={() => {
                  setIsDeleteProfileConfirmOpen(false)
                  setDeleteProfileConfirmData(null)
                }}
                className="text-gray-500 hover:text-gray-700"
                disabled={isDeletingProfile}
              >
                ✕
              </button>
            </div>
            <div className="space-y-4">
              <p className="text-sm text-gray-700">
                Are you sure you want to delete <span className="font-semibold">"{deleteProfileConfirmData.profileName}"</span>?
              </p>
              <p className="text-xs text-red-600 font-medium">
                This action cannot be undone. All brand guidelines, templates, and assets associated with this profile will be permanently deleted.
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setIsDeleteProfileConfirmOpen(false)
                  setDeleteProfileConfirmData(null)
                }}
                disabled={isDeletingProfile}
                className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteProfile}
                disabled={isDeletingProfile}
                className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isDeletingProfile && (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/60 border-t-transparent" />
                )}
                {isDeletingProfile ? 'Deleting...' : 'Delete Profile'}
              </button>
            </div>
          </div>
        </div>
      )}

      {isPreparingImageEditor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-lg flex items-center gap-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#13008B]/30 border-t-[#13008B]" />
            Preparing image editor…
          </div>
        </div>
      )}

      {/* Image Editor Modal */}
      {isSavingImageEditor && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30 px-4">
          <div className="rounded-xl bg-white px-5 py-3 text-sm font-semibold text-gray-700 shadow-lg flex items-center gap-3">
            <span className="h-4 w-4 animate-spin rounded-full border-2 border-[#13008B]/30 border-t-[#13008B]" />
            Saving edited image…
          </div>
        </div>
      )}

      {/* Image Editor Modal */}
      <CanvasImageEditor
        imageUrl={imageEditorSrc}
        isOpen={imageEditorOpen}
        templateName={imageEditorTemplateLabel}
        templateAspect={imageEditorAspect}
        onSave={handleImageEditorSave}
        onClose={() => {
          setImageEditorOpen(false)
          setImageEditorSrc('')
          setImageEditorCallback(null)
          setImageEditorTemplateLabel('')
          setImageEditorTemplateId('')
          setImageEditorAspect('')
          setIsSavingImageEditor(false)
        }}
      />
    </div>
  )
}

export default Brandimages
