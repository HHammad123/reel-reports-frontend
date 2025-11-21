import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react'
import { FaTimes } from 'react-icons/fa'

// Minimal icon set (inline SVG) for consistent, clean UI
const Icon = ({ name, size = 18 }) => {
  const commonProps = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' }
  switch (name) {
    case 'folder':
      return (
        <svg {...commonProps}>
          <path d="M3 7h5l2 2h11v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2Z" />
          <path d="M3 7V5a2 2 0 0 1 2-2h3l2 2h7a2 2 0 0 1 2 2" />
        </svg>
      )
    case 'edit':
      return (
        <svg {...commonProps}>
          <path d="M12 20h9" />
          <path d="M16.5 3.5a2.121 2.121 0 1 1 3 3L7 19l-4 1 1-4Z" />
        </svg>
      )
    case 'sparkles':
      return (
        <svg {...commonProps}>
          <path d="M12 3l1.5 3.5L17 8l-3.5 1.5L12 13l-1.5-3.5L7 8l3.5-1.5L12 3Z" />
          <path d="M19 13l.75 1.75L21.5 15.5l-1.75.75L19 18l-.75-1.75L16.5 15.5l1.75-.75L19 13Z" />
          <path d="M5 13l.75 1.75L7.5 15.5l-1.75.75L5 18l-.75-1.75L2.5 15.5l1.75-.75L5 13Z" />
        </svg>
      )
    case 'image':
      return (
        <svg {...commonProps}>
          <rect x="3" y="5" width="18" height="14" rx="2" />
          <circle cx="8.5" cy="10" r="1.5" />
          <path d="M21 15l-5-5-4 4-2-2-5 5" />
        </svg>
      )
    case 'save':
      return (
        <svg {...commonProps}>
          <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2Z" />
          <path d="M17 21v-8H7v8" />
          <path d="M7 3v5h8" />
        </svg>
      )
    case 'crop':
      return (
        <svg {...commonProps}>
          <path d="M6 2v14a2 2 0 0 0 2 2h14" />
          <path d="M18 22V8a2 2 0 0 0-2-2H2" />
          <path d="M10 6h4v4" />
          <path d="M6 10h4v4" />
        </svg>
      )
    case 'shape':
      return (
        <svg {...commonProps}>
          <rect x="3" y="3" width="7" height="7" />
          <circle cx="17" cy="8" r="4" />
          <path d="M4 18h16l-8-8Z" />
        </svg>
      )
    case 'undo':
      return (
        <svg {...commonProps}>
          <path d="M3 7v6h6" />
          <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13" />
        </svg>
      )
    case 'redo':
      return (
        <svg {...commonProps}>
          <path d="M21 7v6h-6" />
          <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13" />
        </svg>
      )
    case 'trash':
      return (
        <svg {...commonProps}>
          <path d="M3 6h18" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
        </svg>
      )
    default:
      return <div>?</div>
  }
}

const BOUNDING_BOX_NORMALIZED_THRESHOLD = 1.05

const ensureNumber = (value) => {
  const num = Number(value)
  return Number.isFinite(num) ? num : 0
}

const clampPercentValue = (value) => Math.max(0, Math.min(100, ensureNumber(value)))

const convertBoundingBoxToPercent = (bb = {}, dims = {}) => {
  const baseWidth = Math.max(1, Number(dims?.width) || 0)
  const baseHeight = Math.max(1, Number(dims?.height) || 0)
  const values = ['x', 'y', 'width', 'height'].map((key) => Math.abs(ensureNumber(bb?.[key])))
  const maxVal = values.length > 0 ? Math.max(...values) : 0
  const isNormalized = maxVal > 0 && maxVal <= BOUNDING_BOX_NORMALIZED_THRESHOLD
  const toPercentX = (val) =>
    isNormalized ? ensureNumber(val) * 100 : (ensureNumber(val) / baseWidth) * 100
  const toPercentY = (val) =>
    isNormalized ? ensureNumber(val) * 100 : (ensureNumber(val) / baseHeight) * 100
  return {
    x: toPercentX(bb?.x),
    y: toPercentY(bb?.y),
    width: toPercentX(bb?.width),
    height: toPercentY(bb?.height),
    isNormalized
  }
}

function ImageEdit({ onClose, isOpen = true, frameData = null, sceneNumber = null, imageIndex = null, onRefresh = null, aspectRatioCss = '16 / 9' }) {
  const [isSaving, setIsSaving] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  // State management
  const [imageUrl, setImageUrl] = useState('')
  const [imageLoaded, setImageLoaded] = useState(false)
  const [textLayers, setTextLayers] = useState([])
  const [selectedLayer, setSelectedLayer] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [layerStart, setLayerStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [jsonInput, setJsonInput] = useState('')
  const [imageScale, setImageScale] = useState(1)
  const [overlayImageFile, setOverlayImageFile] = useState(null)
  const [overlayImageUrl, setOverlayImageUrl] = useState('')
  const [overlayImage, setOverlayImage] = useState(null)
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 })
  const [overlayScale, setOverlayScale] = useState(1)
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false)
  const [isResizingOverlay, setIsResizingOverlay] = useState(false)
  const [overlayDragStart, setOverlayDragStart] = useState({ x: 0, y: 0 })
  const [overlaySizeStart, setOverlaySizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [activePanel, setActivePanel] = useState(null)
  const [shapeLayers, setShapeLayers] = useState([])
  const [selectedShape, setSelectedShape] = useState(null)
  const [isDraggingShape, setIsDraggingShape] = useState(false)
  const [isResizingShape, setIsResizingShape] = useState(false)
  const [isToolbarOpen, setIsToolbarOpen] = useState(false)
  const [hoveredTextLayerId, setHoveredTextLayerId] = useState(null)
  const [hoverToolbarPosition, setHoverToolbarPosition] = useState({ x: 0, y: 0 })
  const [isHoveringToolbar, setIsHoveringToolbar] = useState(false)
  const [hoveredShapeId, setHoveredShapeId] = useState(null)
  const [hoveredOverlay, setHoveredOverlay] = useState(false)
  const hoverTimeoutRef = useRef(null)
  const isHoveringToolbarRef = useRef(false)
  const shapeHoverTimeoutRef = useRef(null)
  const overlayHoverTimeoutRef = useRef(null)
  const normalizedAspectRatio = useMemo(
    () => (aspectRatioCss && typeof aspectRatioCss === 'string' ? aspectRatioCss : '16 / 9'),
    [aspectRatioCss]
  )
  const editorCanvasStyle = useMemo(() => ({
    aspectRatio: normalizedAspectRatio,
    width: 'min(100%, 860px)',
    maxWidth: '860px',
    maxHeight: '72vh',
    minHeight: '200px'
  }), [normalizedAspectRatio])

  // Sync ref with state
  useEffect(() => {
    isHoveringToolbarRef.current = isHoveringToolbar
  }, [isHoveringToolbar])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current)
      }
      if (shapeHoverTimeoutRef.current) {
        clearTimeout(shapeHoverTimeoutRef.current)
      }
      if (overlayHoverTimeoutRef.current) {
        clearTimeout(overlayHoverTimeoutRef.current)
      }
    }
  }, [])

  // Image editing state
  const [imageFilters, setImageFilters] = useState({
    brightness: 100,
    contrast: 100,
    saturation: 100,
    hue: 0,
    blur: 0,
    sepia: 0,
    grayscale: 0
  })
  const [cropArea, setCropArea] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0
  })
  const [isCropping, setIsCropping] = useState(false)
  const [originalImageUrl, setOriginalImageUrl] = useState('')
  const [activeFilterPreset, setActiveFilterPreset] = useState('none')
  const [activeEffectPreset, setActiveEffectPreset] = useState('none')
  const [croppingTarget, setCroppingTarget] = useState('base')
  const [cropDragMode, setCropDragMode] = useState(null) // 'move' | 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'

  // Undo/Redo system
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [isUndoRedo, setIsUndoRedo] = useState(false)
  const [overlayChangeStart, setOverlayChangeStart] = useState(null)

  // Filter presets
  const filterPresets = {
    'none': { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sepia: 0, grayscale: 0 },
    'fresco': { brightness: 105, contrast: 95, saturation: 85, hue: 5, blur: 0, sepia: 15, grayscale: 0 },
    'belvedere': { brightness: 102, contrast: 105, saturation: 75, hue: -5, blur: 0, sepia: 0, grayscale: 20 },
    'vintage': { brightness: 95, contrast: 110, saturation: 70, hue: 0, blur: 0, sepia: 40, grayscale: 0 },
    'bw': { brightness: 105, contrast: 110, saturation: 0, hue: 0, blur: 0, sepia: 0, grayscale: 100 },
    'bright': { brightness: 130, contrast: 95, saturation: 110, hue: 0, blur: 0, sepia: 0, grayscale: 0 },
    'dramatic': { brightness: 85, contrast: 130, saturation: 90, hue: 0, blur: 0, sepia: 0, grayscale: 0 },
    'warm': { brightness: 105, contrast: 105, saturation: 110, hue: 15, blur: 0, sepia: 0, grayscale: 0 },
    'cool': { brightness: 105, contrast: 105, saturation: 110, hue: -15, blur: 0, sepia: 0, grayscale: 0 }
  }

  const effectPresets = {
    'none': { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 0, sepia: 0, grayscale: 0 },
    'shadows': { brightness: 90, contrast: 120, saturation: 100, hue: 0, blur: 0, sepia: 0, grayscale: 0 },
    'duotone': { brightness: 105, contrast: 115, saturation: 50, hue: 25, blur: 0, sepia: 30, grayscale: 60 },
    'blur': { brightness: 100, contrast: 100, saturation: 100, hue: 0, blur: 3, sepia: 0, grayscale: 0 },
    'glow': { brightness: 115, contrast: 90, saturation: 110, hue: 0, blur: 2, sepia: 0, grayscale: 0 }
  }

  // Refs
  const canvasRef = useRef(null)
  const imageRef = useRef(null)
  const getDisplayDimensions = useCallback(() => {
    const img = imageRef.current
    if (!img) return { width: 1, height: 1 }
    const width = img.clientWidth || img.width || img.naturalWidth || 1
    const height = img.clientHeight || img.height || img.naturalHeight || 1
    return { width, height }
  }, [])
  const percentToDisplayPx = useCallback((value, axis = 'x') => {
    const { width, height } = getDisplayDimensions()
    const size = axis === 'y' ? height : width
    return (clampPercentValue(value) / 100) * size
  }, [getDisplayDimensions])
  const pxDeltaToPercent = useCallback((deltaPx, axis = 'x') => {
    const { width, height } = getDisplayDimensions()
    const size = axis === 'y' ? height : width
    if (!size) return 0
    return (deltaPx / size) * 100
  }, [getDisplayDimensions])
  // Helper to get current image scale (display px per natural px)
  const getImageScale = useCallback(() => {
    const img = imageRef.current
    if (!img || !img.naturalWidth || !img.naturalHeight) return { scaleX: 1, scaleY: 1 }
    const scaleX = img.width / img.naturalWidth
    const scaleY = img.height / img.naturalHeight
    return { scaleX, scaleY }
  }, [])

  // Undo/Redo functions
  const saveToHistory = useCallback((action, data) => {
    if (isUndoRedo) return
    
    const newHistoryItem = {
      action,
      data,
      timestamp: Date.now()
    }
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(newHistoryItem)
      // Limit history to 50 items
      if (newHistory.length > 50) {
        newHistory.shift()
        return newHistory
      }
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [isUndoRedo, historyIndex])

  const undo = useCallback(() => {
    if (historyIndex < 0) return
    
    setIsUndoRedo(true)
    const currentState = history[historyIndex]
    
    switch (currentState.action) {
      case 'image_load':
        setImageUrl(currentState.data.previousUrl || '')
        setImageLoaded(!!currentState.data.previousUrl)
        break
      case 'text_add':
        setTextLayers(currentState.data.previousLayers)
        setSelectedLayer(currentState.data.previousSelected)
        break
      case 'text_edit':
        setTextLayers(currentState.data.previousLayers)
        setSelectedLayer(currentState.data.previousSelected)
        break
      case 'text_delete':
        setTextLayers(currentState.data.previousLayers)
        setSelectedLayer(currentState.data.previousSelected)
        break
      case 'overlay_add':
        setOverlayVisible(currentState.data.previousVisible)
        setOverlayImageUrl(currentState.data.previousUrl || '')
        setOverlayImage(currentState.data.previousImage)
        setOverlayPosition(currentState.data.previousPosition)
        setOverlayScale(currentState.data.previousScale)
        break
      case 'overlay_edit':
        setOverlayPosition(currentState.data.previousPosition)
        setOverlayScale(currentState.data.previousScale)
        break
      case 'shape_add':
      case 'shape_edit':
      case 'shape_delete':
        setShapeLayers(currentState.data.previousLayers || [])
        setSelectedShape(currentState.data.previousSelected || null)
        break
      case 'filter_change':
        setImageFilters(currentState.data.previousFilters)
        setActiveFilterPreset(currentState.data.previousPreset)
        setActiveEffectPreset(currentState.data.previousEffect)
        break
      case 'crop_apply':
        if (currentState.data.target === 'base') {
          setImageUrl(currentState.data.previousUrl)
        } else {
          setOverlayImageUrl(currentState.data.previousUrl)
          setOverlayImage(currentState.data.previousImage)
        }
        break
    }
    
    setHistoryIndex(prev => prev - 1)
    setTimeout(() => setIsUndoRedo(false), 100)
  }, [history, historyIndex])

  const redo = useCallback(() => {
    if (historyIndex >= history.length - 1) return
    
    setIsUndoRedo(true)
    const nextState = history[historyIndex + 1]
    
    switch (nextState.action) {
      case 'image_load':
        setImageUrl(nextState.data.newUrl)
        setImageLoaded(!!nextState.data.newUrl)
        break
      case 'text_add':
        setTextLayers(nextState.data.newLayers)
        setSelectedLayer(nextState.data.newSelected)
        break
      case 'text_edit':
        setTextLayers(nextState.data.newLayers)
        setSelectedLayer(nextState.data.newSelected)
        break
      case 'text_delete':
        setTextLayers(nextState.data.newLayers)
        setSelectedLayer(nextState.data.newSelected)
        break
      case 'overlay_add':
        setOverlayVisible(nextState.data.newVisible)
        setOverlayImageUrl(nextState.data.newUrl)
        setOverlayImage(nextState.data.newImage)
        setOverlayPosition(nextState.data.newPosition)
        setOverlayScale(nextState.data.newScale)
        break
      case 'overlay_edit':
        setOverlayPosition(nextState.data.newPosition)
        setOverlayScale(nextState.data.newScale)
        break
      case 'shape_add':
      case 'shape_edit':
      case 'shape_delete':
        setShapeLayers(nextState.data.newLayers || [])
        setSelectedShape(nextState.data.newSelected || null)
        break
      case 'filter_change':
        setImageFilters(nextState.data.newFilters)
        setActiveFilterPreset(nextState.data.newPreset)
        setActiveEffectPreset(nextState.data.newEffect)
        break
      case 'crop_apply':
        if (nextState.data.target === 'base') {
          setImageUrl(nextState.data.newUrl)
        } else {
          setOverlayImageUrl(nextState.data.newUrl)
          setOverlayImage(nextState.data.newImage)
        }
        break
    }
    
    setHistoryIndex(prev => prev + 1)
    setTimeout(() => setIsUndoRedo(false), 100)
  }, [history, historyIndex])

  // Font options
  const fonts = [
    'Arial', 'Helvetica', 'Times New Roman', 'Courier New', 'Verdana',
    'Georgia', 'Palatino', 'Garamond', 'Bookman', 'Comic Sans MS',
    'Trebuchet MS', 'Arial Black', 'Impact', 'Roboto', 'Open Sans',
    'Lato', 'Montserrat', 'Source Sans Pro', 'Roboto Condensed',
    'Poppins', 'Playfair Display', 'Merriweather', 'Raleway', 'Ubuntu',
    'Oswald', 'Roboto Slab', 'Dancing Script', 'Pacifico', 'Lobster',
    'Bebas Neue', 'Anton', 'Cinzel', 'Playfair', 'Quicksand',
    'Nunito', 'Rubik', 'Karla', 'Archivo', 'Fira Sans', 'Space Grotesk'
  ]

  // Panel widths
  const panelWidths = {
    import: '320px',
    text: '360px',
    effects: '420px',
    fonts: '320px',
    overlay: '400px',
    export: '300px',
  }

  // Image loading
  const handleImageLoad = (e) => {
    const file = e.target.files[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (event) => {
        const previousUrl = imageUrl
        setImageUrl(event.target.result)
        setImageLoaded(true)
        
        // Save to history
        saveToHistory('image_load', {
          previousUrl,
          newUrl: event.target.result
        })
      }
      reader.readAsDataURL(file)
    }
  }

  const handleImageUrlLoad = () => {
    if (imageUrl) {
      const previousUrl = imageUrl
      setImageLoaded(true)
      
      // Save to history
      saveToHistory('image_load', {
        previousUrl,
        newUrl: imageUrl
      })
    }
  }

  // Image editing functions
  const handleFilterChange = (filterName, value) => {
    const previousFilters = { ...imageFilters }
    const previousPreset = activeFilterPreset
    const previousEffect = activeEffectPreset
    
    setImageFilters(prev => ({
      ...prev,
      [filterName]: value
    }))
    
    // Save to history
    saveToHistory('filter_change', {
      previousFilters,
      previousPreset,
      previousEffect,
      newFilters: { ...imageFilters, [filterName]: value },
      newPreset: activeFilterPreset,
      newEffect: activeEffectPreset
    })
  }

  const applyFiltersToImage = () => {
    const filterString = `
      brightness(${imageFilters.brightness}%) 
      contrast(${imageFilters.contrast}%) 
      saturate(${imageFilters.saturation}%) 
      hue-rotate(${imageFilters.hue}deg) 
      blur(${imageFilters.blur}px) 
      sepia(${imageFilters.sepia}%) 
      grayscale(${imageFilters.grayscale}%)
    `.replace(/\s+/g, ' ').trim()
    
    return filterString
  }

  // Crop dragging on window while active
  useEffect(() => {
    const onMove = (e) => {
      if (!isCropping || !dragStart || !cropDragMode) return
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      const start = layerStart
      let nx = start.x
      let ny = start.y
      let nw = start.width
      let nh = start.height
      const minSize = 20
      switch (cropDragMode) {
        case 'move':
          nx = start.x + dx
          ny = start.y + dy
          break
        case 'n':
          ny = start.y + dy
          nh = start.height - dy
          break
        case 's':
          nh = start.height + dy
          break
        case 'w':
          nx = start.x + dx
          nw = start.width - dx
          break
        case 'e':
          nw = start.width + dx
          break
        case 'nw':
          nx = start.x + dx
          ny = start.y + dy
          nw = start.width - dx
          nh = start.height - dy
          break
        case 'ne':
          ny = start.y + dy
          nw = start.width + dx
          nh = start.height - dy
          break
        case 'sw':
          nx = start.x + dx
          nw = start.width - dx
          nh = start.height + dy
          break
        case 'se':
          nw = start.width + dx
          nh = start.height + dy
          break
      }
      nw = Math.max(minSize, nw)
      nh = Math.max(minSize, nh)
      setCropArea({ x: nx, y: ny, width: nw, height: nh })
    }
    const onUp = () => {
      if (!isCropping) return
      setCropDragMode(null)
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isCropping, dragStart, cropDragMode, layerStart])

  const resetFilters = () => {
    setImageFilters({
      brightness: 100,
      contrast: 100,
      saturation: 100,
      hue: 0,
      blur: 0,
      sepia: 0,
      grayscale: 0
    })
  }

  const applyFilterPreset = (presetName) => {
    if (filterPresets[presetName]) {
      setImageFilters(filterPresets[presetName])
      setActiveFilterPreset(presetName)
    }
  }

  const applyEffectPreset = (presetName) => {
    if (effectPresets[presetName]) {
      setImageFilters(effectPresets[presetName])
      setActiveEffectPreset(presetName)
    }
  }

  // Crop dragging handler
  useEffect(() => {
    const onMove = (e) => {
      if (!isCropping || !dragStart || !cropDragMode) return
      const dx = e.clientX - dragStart.x
      const dy = e.clientY - dragStart.y
      const start = layerStart
      let nx = start.x
      let ny = start.y
      let nw = start.width
      let nh = start.height
      const minSize = 20
      
      switch (cropDragMode) {
        case 'move':
          nx = start.x + dx
          ny = start.y + dy
          break
        case 'n':
          ny = start.y + dy
          nh = start.height - dy
          if (nh < minSize) { ny = start.y; nh = minSize }
          break
        case 's':
          nh = start.height + dy
          if (nh < minSize) nh = minSize
          break
        case 'w':
          nx = start.x + dx
          nw = start.width - dx
          if (nw < minSize) { nx = start.x; nw = minSize }
          break
        case 'e':
          nw = start.width + dx
          if (nw < minSize) nw = minSize
          break
        case 'nw':
          nx = start.x + dx
          ny = start.y + dy
          nw = start.width - dx
          nh = start.height - dy
          if (nw < minSize) { nx = start.x; nw = minSize }
          if (nh < minSize) { ny = start.y; nh = minSize }
          break
        case 'ne':
          ny = start.y + dy
          nw = start.width + dx
          nh = start.height - dy
          if (nw < minSize) nw = minSize
          if (nh < minSize) { ny = start.y; nh = minSize }
          break
        case 'sw':
          nx = start.x + dx
          nw = start.width - dx
          nh = start.height + dy
          if (nw < minSize) { nx = start.x; nw = minSize }
          if (nh < minSize) nh = minSize
          break
        case 'se':
          nw = start.width + dx
          nh = start.height + dy
          if (nw < minSize) nw = minSize
          if (nh < minSize) nh = minSize
          break
      }
      
      setCropArea({ x: nx, y: ny, width: nw, height: nh })
    }
    
    const onUp = () => {
      if (!isCropping) return
      setCropDragMode(null)
    }
    
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
    
    return () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
    }
  }, [isCropping, dragStart, cropDragMode, layerStart])

  const startCropping = () => {
    if (!imageLoaded && !overlayVisible) return
    
    setIsCropping(true)
    setOriginalImageUrl(imageUrl)
    
    // Initialize crop area based on target
    if (croppingTarget === 'overlay' && overlayVisible) {
      // Start with overlay image bounds
      const imgWidth = overlayImage?.width || 200
      const imgHeight = overlayImage?.height || 200
      setCropArea({ 
        x: overlayPosition.x, 
        y: overlayPosition.y, 
        width: Math.min(imgWidth, 200), 
        height: Math.min(imgHeight, 200) 
      })
    } else {
      // Base image crop
      setCropArea({ x: 50, y: 50, width: 200, height: 150 })
    }
  }

  const applyCrop = () => {
    try {
      if (croppingTarget === 'overlay' && overlayImage) {
        const previousUrl = overlayImageUrl
        const previousImage = overlayImage
        
        const canvas = document.createElement('canvas')
        const scale = overlayScale || 1
        const sx = Math.max(0, (cropArea.x - overlayPosition.x)) / scale
        const sy = Math.max(0, (cropArea.y - overlayPosition.y)) / scale
        const sw = Math.max(1, cropArea.width / scale)
        const sh = Math.max(1, cropArea.height / scale)
        canvas.width = sw
        canvas.height = sh
        const ctx = canvas.getContext('2d')
        ctx.drawImage(overlayImage, sx, sy, sw, sh, 0, 0, sw, sh)
        const croppedUrl = canvas.toDataURL('image/png')
        const img = new Image()
        img.onload = () => {
          setOverlayImage(img)
          setOverlayImageUrl(croppedUrl)
          setOverlayPosition({ x: cropArea.x, y: cropArea.y })
          setOverlayScale(1)
          setIsCropping(false)
          
          // Save to history
          saveToHistory('crop_apply', {
            target: 'overlay',
            previousUrl,
            previousImage,
            newUrl: croppedUrl,
            newImage: img
          })
        }
        img.src = croppedUrl
        return
      }

      // Base image crop
      const previousUrl = imageUrl
      const baseImg = imageRef.current
      if (!baseImg) return setIsCropping(false)
      const naturalRatio = baseImg.naturalWidth / baseImg.clientWidth
      const canvas = document.createElement('canvas')
      const sx = Math.max(0, cropArea.x) * naturalRatio
      const sy = Math.max(0, cropArea.y) * naturalRatio
      const sw = Math.max(1, cropArea.width) * naturalRatio
      const sh = Math.max(1, cropArea.height) * naturalRatio
      canvas.width = sw
      canvas.height = sh
      const ctx = canvas.getContext('2d')
      ctx.drawImage(baseImg, sx, sy, sw, sh, 0, 0, sw, sh)
      const newUrl = canvas.toDataURL('image/png')
      setImageUrl(newUrl)
      setIsCropping(false)
      
      // Save to history
      saveToHistory('crop_apply', {
        target: 'base',
        previousUrl,
        newUrl
      })
    } catch (e) {
      console.error('Crop failed', e)
      setIsCropping(false)
    }
  }

  const cancelCrop = () => {
    setIsCropping(false)
    setImageUrl(originalImageUrl)
  }

  // Text layer management
  const handleAddText = () => {
    if (newText.trim()) {
      const previousLayers = [...textLayers]
      const previousSelected = selectedLayer
      
      const newLayer = {
        id: Date.now(),
        text: newText,
        x: 10,
        y: 10,
        width: 30,
        height: 10,
        fontSize: 24,
        fontFamily: 'Arial',
        color: '#000000',
        fontWeight: 'normal',
        textAlign: 'left',
        textShadow: 'none',
        textGlow: 'none',
        wordArt: 'none',
        backgroundColor: '',
        fontStyle: 'normal',
        textDecoration: 'none'
      }
      
      const newLayers = [...textLayers, newLayer]
      setTextLayers(newLayers)
      setNewText('')
      
      // Save to history
      saveToHistory('text_add', {
        previousLayers,
        previousSelected,
        newLayers,
        newSelected: newLayer
      })
    }
  }

  const [newText, setNewText] = useState('')

  const handleLayerClick = (layer) => {
    setSelectedLayer(layer)
    setSelectedShape(null)
    // Don't auto-open text panel on click - only show hover toolbar
    // User can click "More Options" in hover toolbar to open main panel
  }

  const handleStyleChange = (property, value) => {
    if (selectedLayer) {
      const previousLayers = [...textLayers]
      const previousSelected = selectedLayer
      
      const updatedLayers = textLayers.map(layer =>
        layer.id === selectedLayer.id ? { ...layer, [property]: value } : layer
      )
      const newSelected = { ...selectedLayer, [property]: value }
      
      setTextLayers(updatedLayers)
      setSelectedLayer(newSelected)
      
      // Save to history
      saveToHistory('text_edit', {
        previousLayers,
        previousSelected,
        newLayers: updatedLayers,
        newSelected
      })
    }
  }

  const applyHeadingStyle = (type) => {
    if (!selectedLayer) return
    const styles = {
      h1: { fontSize: 64, fontWeight: 'bold', color: '#000000' },
      h2: { fontSize: 48, fontWeight: 'bold', color: '#333333' },
      h3: { fontSize: 36, fontWeight: 'bold', color: '#666666' },
      subheading: { fontSize: 24, fontWeight: 'normal', color: '#888888' },
      body: { fontSize: 16, fontWeight: 'normal', color: '#000000' }
    }
    const style = styles[type]
    if (style) {
      handleStyleChange('fontSize', style.fontSize)
      handleStyleChange('fontWeight', style.fontWeight)
      handleStyleChange('color', style.color)
    }
  }

  const applyTextEffect = (property, value) => {
    handleStyleChange(property, value)
  }

  const renderOverlayImage = () => {
    if (!overlayVisible || !overlayImage) return null
    const overlayLeftPct = clampPercentValue(pxDeltaToPercent(overlayPosition.x, 'x'))
    const overlayTopPct = clampPercentValue(pxDeltaToPercent(overlayPosition.y, 'y'))
    const overlayWidthPct = clampPercentValue(pxDeltaToPercent((overlayImage.width || 0) * overlayScale, 'x'))
    const overlayHeightPct = clampPercentValue(pxDeltaToPercent((overlayImage.height || 0) * overlayScale, 'y'))
    return (
      <div
        className="absolute z-[1000] cursor-move"
        style={{
          left: `${overlayLeftPct}%`,
          top: `${overlayTopPct}%`,
          width: `${overlayWidthPct}%`,
          height: `${overlayHeightPct}%`,
          transformOrigin: 'top left'
        }}
        onMouseDown={(e) => handleOverlayMouseDown(e, 'drag')}
        onMouseEnter={() => {
          if (overlayHoverTimeoutRef.current) {
            clearTimeout(overlayHoverTimeoutRef.current)
          }
          setHoveredOverlay(true)
        }}
        onMouseLeave={() => {
          overlayHoverTimeoutRef.current = setTimeout(() => {
            setHoveredOverlay(false)
            overlayHoverTimeoutRef.current = null
          }, 200)
        }}
      >
        <img
          src={overlayImageUrl}
          alt="Overlay"
          draggable="false"
          style={{
            width: '100%',
            height: '100%',
            display: 'block',
          }}
        />
        {hoveredOverlay && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleOverlayRemove()
              setHoveredOverlay(false)
            }}
            className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg z-20 transition-all"
            title="Delete Overlay"
            onMouseEnter={() => {
              if (overlayHoverTimeoutRef.current) {
                clearTimeout(overlayHoverTimeoutRef.current)
                overlayHoverTimeoutRef.current = null
              }
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <path d="M3 6h18"/>
              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
            </svg>
          </button>
        )}
        <div
          className="absolute bottom-0 right-0 w-5 h-5 bg-purple-600 cursor-nwse-resize rounded-bl-lg"
          onMouseDown={(e) => handleOverlayMouseDown(e, 'resize')}
        />
        {isCropping && croppingTarget === 'overlay' && (
          <div
            className="absolute border-2 border-dashed border-purple-600 bg-purple-100"
            style={{ 
              left: cropArea.x - overlayPosition.x, 
              top: cropArea.y - overlayPosition.y, 
              width: cropArea.width, 
              height: cropArea.height 
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              const rect = e.currentTarget.getBoundingClientRect()
              const x = e.clientX - rect.left
              const y = e.clientY - rect.top
              const edge = 8
              let mode = 'move'
              if (y < edge && x < edge) mode = 'nw'
              else if (y < edge && x > rect.width - edge) mode = 'ne'
              else if (y > rect.height - edge && x < edge) mode = 'sw'
              else if (y > rect.height - edge && x > rect.width - edge) mode = 'se'
              else if (y < edge) mode = 'n'
              else if (y > rect.height - edge) mode = 's'
              else if (x < edge) mode = 'w'
              else if (x > rect.width - edge) mode = 'e'
              setCropDragMode(mode)
              setDragStart({ x: e.clientX, y: e.clientY })
              setLayerStart({ x: cropArea.x, y: cropArea.y, width: cropArea.width, height: cropArea.height })
            }}
          />
        )}
      </div>
    )
  }

  const handleAddShape = (type) => {
    // Center new shape in the image area if possible
    let centerX = 120
    let centerY = 120
    try {
      const canvasEl = document.querySelector('[data-image-editor-canvas]')
      if (canvasEl) {
        const rect = canvasEl.getBoundingClientRect()
        centerX = rect.width / 2
        centerY = rect.height / 2
      }
    } catch (_) { /* noop */ }

    const baseShape = {
      id: Date.now(),
      type,
      x: centerX - 100,
      y: centerY - 100,
      width: 200,
      height: 200,
      fill: '#7c3aed',
      borderColor: '#000000',
      borderWidth: 2,
      borderStyle: 'solid',
      borderRadius: 12,
      rotation: 0,
      opacity: 1
    }

    switch (type) {
      case 'circle':
        baseShape.width = 180
        baseShape.height = 180
        baseShape.borderRadius = 9999
        break
      case 'triangle':
        baseShape.width = 220
        baseShape.height = 200
        baseShape.borderRadius = 0
        break
      case 'line':
        baseShape.width = 260
        baseShape.height = 8
        baseShape.fill = '#000000'
        baseShape.borderColor = '#000000'
        baseShape.borderWidth = 8
        baseShape.borderStyle = 'solid'
        baseShape.borderRadius = 0
        break
      case 'curve':
        baseShape.width = 260
        baseShape.height = 40
        baseShape.fill = 'transparent'
        baseShape.borderColor = '#000000'
        baseShape.borderWidth = 4
        baseShape.borderStyle = 'solid'
        baseShape.borderRadius = 9999
        baseShape.isCurve = true
        break
      case 'square':
        baseShape.width = 180
        baseShape.height = 180
        baseShape.borderRadius = 0
        break
      default:
        break
    }

    const previousLayers = [...shapeLayers]
    const previousSelected = selectedShape
    const newLayers = [...shapeLayers, baseShape]

    setShapeLayers(newLayers)
    setSelectedShape(baseShape)
    setSelectedLayer(null)

    saveToHistory('shape_add', {
      previousLayers,
      previousSelected,
      newLayers,
      newSelected: baseShape
    })
  }

  const handleShapeStyleChange = (property, value) => {
    if (!selectedShape) return

    const previousLayers = [...shapeLayers]
    const previousSelected = selectedShape

    const updatedLayers = shapeLayers.map(shape =>
      shape.id === selectedShape.id ? { ...shape, [property]: value } : shape
    )
    const newSelected = { ...selectedShape, [property]: value }

    setShapeLayers(updatedLayers)
    setSelectedShape(newSelected)

    saveToHistory('shape_edit', {
      previousLayers,
      previousSelected,
      newLayers: updatedLayers,
      newSelected
    })
  }

  const handleShapeDelete = () => {
    if (!selectedShape) return

    const previousLayers = [...shapeLayers]
    const previousSelected = selectedShape
    const updatedLayers = shapeLayers.filter(shape => shape.id !== selectedShape.id)

    setShapeLayers(updatedLayers)
    setSelectedShape(null)

    saveToHistory('shape_delete', {
      previousLayers,
      previousSelected,
      newLayers: updatedLayers,
      newSelected: null
    })
  }

  const handleShapeClick = (shape) => {
    setSelectedShape(shape)
    setSelectedLayer(null)
  }

  const handleShapeMouseDown = (e, shapeId, action) => {
    e.preventDefault()
    e.stopPropagation()

    const shape = shapeLayers.find(s => s.id === shapeId)
    if (!shape) return

    setSelectedShape(shape)
    setSelectedLayer(null)

    if (action === 'drag') {
      setIsDraggingShape(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setLayerStart({ x: shape.x, y: shape.y, width: shape.width, height: shape.height })
    } else if (action === 'resize') {
      setIsResizingShape(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setLayerStart({ x: shape.x, y: shape.y, width: shape.width, height: shape.height })
    }
  }

  const getTextEffectStyles = (layer) => {
    let styles = {}
    
    // Text Shadow - use shadowProperties if available (from frame data), otherwise use preset
    if (layer.shadowProperties) {
      const sp = layer.shadowProperties;
      styles.textShadow = `${sp.offsetX}px ${sp.offsetY}px ${sp.blur}px ${sp.color}`;
    } else {
      switch(layer.textShadow) {
        case 'drop':
          styles.textShadow = '2px 2px 4px rgba(0, 0, 0, 0.5)'
          break
        case 'soft':
          styles.textShadow = '0 2px 8px rgba(0, 0, 0, 0.3)'
          break
        case 'hard':
          styles.textShadow = '2px 2px 0 rgba(0, 0, 0, 0.8)'
          break
        case 'multiple':
          styles.textShadow = '1px 1px 0 rgba(255, 255, 255, 0.8), -1px -1px 0 rgba(0, 0, 0, 0.8)'
          break
        default:
          styles.textShadow = 'none'
      }
    }
    
    // Text Glow
    switch(layer.textGlow) {
      case 'subtle':
        styles.filter = 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))'
        break
      case 'medium':
        styles.filter = 'drop-shadow(0 0 8px rgba(255, 255, 255, 0.8)) drop-shadow(0 0 12px rgba(124, 58, 237, 0.6))'
        break
      case 'strong':
        styles.filter = 'drop-shadow(0 0 12px rgba(255, 255, 255, 1)) drop-shadow(0 0 16px rgba(124, 58, 237, 0.8))'
        break
      case 'neon':
        styles.filter = 'drop-shadow(0 0 10px rgba(255, 255, 255, 1)) drop-shadow(0 0 20px rgba(124, 58, 237, 1)) drop-shadow(0 0 30px rgba(124, 58, 237, 0.8))'
        break
      default:
        styles.filter = 'none'
    }
    
    return styles
  }

  const getWordArtStyles = (layer) => {
    let baseStyles = {}
    
    switch(layer.wordArt) {
      case 'gradient':
        baseStyles.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
        baseStyles.webkitBackgroundClip = 'text'
        baseStyles.webkitTextFillColor = 'transparent'
        break
      case 'outline':
        baseStyles.webkitTextStroke = '2px ' + layer.color
        baseStyles.color = 'transparent'
        break
      case '3d':
        baseStyles.textShadow = '1px 1px 0 rgba(255, 255, 255, 0.5), -1px -1px 0 rgba(0, 0, 0, 0.3), 2px 2px 4px rgba(0, 0, 0, 0.5)'
        break
      case 'metallic':
        baseStyles.background = 'linear-gradient(180deg, #ffffff 0%, #333333 50%, #ffffff 100%)'
        baseStyles.webkitBackgroundClip = 'text'
        baseStyles.webkitTextFillColor = 'transparent'
        break
      case 'gradient-rainbow':
        baseStyles.background = 'linear-gradient(90deg, #ff0000 0%, #ff7f00 16.66%, #ffff00 33.33%, #00ff00 50%, #0000ff 66.66%, #4b0082 83.33%, #9400d3 100%)'
        baseStyles.webkitBackgroundClip = 'text'
        baseStyles.webkitTextFillColor = 'transparent'
        break
    }
    
    return baseStyles
  }

  // Mouse event handlers
  const handleMouseDown = (e, layerId, action) => {
    e.preventDefault()
    e.stopPropagation()
    
    const layer = textLayers.find(l => l.id === layerId)
    if (!layer) return

    setSelectedLayer(layer)
    
    if (action === 'drag') {
      setIsDragging(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setLayerStart({ x: layer.x, y: layer.y })
    } else if (action === 'resize') {
      setIsResizing(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setLayerStart({ x: layer.x, y: layer.y, width: layer.width, height: layer.height })
    }
  }

  const handleMouseMove = useCallback((e) => {
    if (!isDragging && !isResizing && !isDraggingOverlay && !isResizingOverlay && !isDraggingShape && !isResizingShape) return

    const currentDragStart = isDraggingOverlay || isResizingOverlay ? overlayDragStart : dragStart
    const deltaX = e.clientX - currentDragStart.x
    const deltaY = e.clientY - currentDragStart.y
    const { scaleX, scaleY } = getImageScale()
    const deltaXPct = pxDeltaToPercent(deltaX, 'x')
    const deltaYPct = pxDeltaToPercent(deltaY, 'y')

    if (isDragging && selectedLayer) {
      const tentativeX = layerStart.x + deltaXPct
      const tentativeY = layerStart.y + deltaYPct
      const newX = clampPercentValue(Math.max(0, Math.min(100 - selectedLayer.width, tentativeX)))
      const newY = clampPercentValue(Math.max(0, Math.min(100 - selectedLayer.height, tentativeY)))
      const updatedLayers = textLayers.map(layer =>
        layer.id === selectedLayer.id ? { ...layer, x: newX, y: newY } : layer
      )
      setTextLayers(updatedLayers)
      setSelectedLayer({ ...selectedLayer, x: newX, y: newY })
    } else if (isResizing && selectedLayer) {
      const minWidthPct = Math.max(pxDeltaToPercent(50, 'x'), 1)
      const minHeightPct = Math.max(pxDeltaToPercent(20, 'y'), 1)
      const tentativeWidth = layerStart.width + deltaXPct
      const tentativeHeight = layerStart.height + deltaYPct
      const newWidth = clampPercentValue(Math.max(minWidthPct, Math.min(100 - layerStart.x, tentativeWidth)))
      const newHeight = clampPercentValue(Math.max(minHeightPct, Math.min(100 - layerStart.y, tentativeHeight)))
      const updatedLayers = textLayers.map(layer =>
        layer.id === selectedLayer.id ? { ...layer, width: newWidth, height: newHeight } : layer
      )
      setTextLayers(updatedLayers)
      setSelectedLayer({ ...selectedLayer, width: newWidth, height: newHeight })
    } else if (isDraggingShape && selectedShape) {
      const newX = layerStart.x + (deltaX / (scaleX || 1))
      const newY = layerStart.y + (deltaY / (scaleY || 1))

      const updatedShapes = shapeLayers.map(shape =>
        shape.id === selectedShape.id ? { ...shape, x: newX, y: newY } : shape
      )
      setShapeLayers(updatedShapes)
      setSelectedShape({ ...selectedShape, x: newX, y: newY })
    } else if (isResizingShape && selectedShape) {
      const newWidth = Math.max(20, layerStart.width + (deltaX / (scaleX || 1)))
      const newHeight = Math.max(20, layerStart.height + (deltaY / (scaleY || 1)))

      const updatedShapes = shapeLayers.map(shape =>
        shape.id === selectedShape.id ? { ...shape, width: newWidth, height: newHeight } : shape
      )
      setShapeLayers(updatedShapes)
      setSelectedShape({ ...selectedShape, width: newWidth, height: newHeight })
    } else if (isDraggingOverlay) {
      const newX = overlayPosition.x + (deltaX * 0.15)
      const newY = overlayPosition.y + (deltaY * 0.15)
      setOverlayPosition({ x: newX, y: newY })
      
      // Save overlay change start if not already set
      if (!overlayChangeStart) {
        setOverlayChangeStart({
          previousPosition: overlayPosition,
          previousScale: overlayScale
        })
      }
    } else if (isResizingOverlay) {
      const newScale = Math.max(0.1, overlayScale + (deltaX / 600))
      setOverlayScale(newScale)
      
      // Save overlay change start if not already set
      if (!overlayChangeStart) {
        setOverlayChangeStart({
          previousPosition: overlayPosition,
          previousScale: overlayScale
        })
      }
    }
  }, [isDragging, isResizing, isDraggingOverlay, isResizingOverlay, dragStart, layerStart, selectedLayer, textLayers, overlayPosition, overlayScale, overlayDragStart, isDraggingShape, isResizingShape, selectedShape, shapeLayers, pxDeltaToPercent])

  const handleOverlayMouseDown = (e, action) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (action === 'drag') {
      setIsDraggingOverlay(true)
      setOverlayDragStart({ x: e.clientX, y: e.clientY })
    } else if (action === 'resize') {
      setIsResizingOverlay(true)
      setOverlayDragStart({ x: e.clientX, y: e.clientY })
    }
  }

  const handleMouseUp = useCallback(() => {
    setIsDragging(false)
    setIsResizing(false)
    setIsDraggingShape(false)
    setIsResizingShape(false)
    setIsDraggingOverlay(false)
    setIsResizingOverlay(false)
    
    // Save overlay changes to history if they occurred
    if (overlayChangeStart && (isDraggingOverlay || isResizingOverlay)) {
      saveToHistory('overlay_edit', {
        previousPosition: overlayChangeStart.previousPosition,
        previousScale: overlayChangeStart.previousScale,
        newPosition: overlayPosition,
        newScale: overlayScale
      })
      setOverlayChangeStart(null)
    }
  }, [isDraggingOverlay, isResizingOverlay, overlayChangeStart, overlayPosition, overlayScale, saveToHistory])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  // JSON handling
  const handleJsonLoad = () => {
    try {
      const data = JSON.parse(jsonInput)
      if (data.image_url) {
        setImageUrl(data.image_url)
        setImageLoaded(true)
      }
      if (data.text_layers) {
        setTextLayers(data.text_layers)
      }
      if (data.shape_layers) {
        setShapeLayers(data.shape_layers)
      }
    } catch (error) {
      alert('Invalid JSON format')
    }
  }

  // Template JSON Import (NEW - for loading template format)
  // Template JSON Import (UPDATED - Fixed font size scaling)
const handleTemplateJsonLoad = () => {
  try {
    const data = JSON.parse(jsonInput)
    
    // Check if it's the new template format
    if (data.base_image && data.text_elements) {
      // Load base image
      if (data.base_image.image_url) {
        setImageUrl(data.base_image.image_url)
        setImageLoaded(true)
      }
      
      // Convert text_elements to textLayers format
      if (data.text_elements && Array.isArray(data.text_elements)) {
        // Wait for image to load to get dimensions
        const img = new Image()
        img.onload = () => {
  // Set image first
  setImageUrl(data.base_image.image_url)
  setImageLoaded(true)
  
  // Wait for image to actually render in DOM to get displayed dimensions
  const waitForRender = () => {
    const imgEl = imageRef.current
    if (!imgEl || !imgEl.width || !imgEl.height) {
      requestAnimationFrame(waitForRender)
      return
    }
    
    // Get dimensions
    const originalWidth = data.base_image.image_dimensions.width
    const originalHeight = data.base_image.image_dimensions.height
    const displayWidth = imgEl.width
    const displayHeight = imgEl.height
    
    console.log('Original:', originalWidth, 'x', originalHeight)
    console.log('Display:', displayWidth, 'x', displayHeight)
    
    const convertedLayers = data.text_elements.map((element, index) => {
      const bbPercent = convertBoundingBoxToPercent(element.bounding_box || {}, {
        width: originalWidth,
        height: originalHeight
      })
      const { x, y, width, height } = bbPercent
      
      return {
        id: Date.now() + index,
        text: element.text,
        x: x,
        y: y,
        width: width,
        height: height,
        fontSize: element.fontSize || 24,
        fontFamily: element.fontFamily || 'Arial',
        color: element.fill || '#000000',
        fontWeight: element.fontWeight || 'normal',
        textAlign: element.layout?.alignment || 'center',
        textShadow: element.effects?.textShadow?.enabled ? 'drop' : 'none',
        textGlow: 'none',
        wordArt: 'none',
        overlayImage: element.overlay_image?.enabled ? {
          enabled: true,
          imageUrl: element.overlay_image.image_url || '',
          fitMode: element.overlay_image.scaling?.fit_mode || 'contain'
        } : null
      }
    })
    
    setTextLayers(convertedLayers)
    if (data.shape_layers) {
      setShapeLayers(data.shape_layers)
    }
    
    // Handle overlay_elements
    if (data.overlay_elements && Array.isArray(data.overlay_elements) && data.overlay_elements.length > 0) {
      const ov = data.overlay_elements[0]
      const bbPercent = convertBoundingBoxToPercent(ov?.bounding_box || {}, {
        width: originalWidth,
        height: originalHeight
      })
      const posXNat = (bbPercent.x / 100) * originalWidth
      const posYNat = (bbPercent.y / 100) * originalHeight
      const targetWNat = (bbPercent.width / 100) * originalWidth
      const targetHNat = (bbPercent.height / 100) * originalHeight
      
      const ovUrl = ov?.overlay_image?.image_url
      if (ovUrl) {
        const oImg = new Image()
        oImg.onload = () => {
          setOverlayImage(oImg)
          setOverlayImageUrl(ovUrl)
          setOverlayVisible(true)
          
          // Convert to display coordinates
          const displayScaleX = displayWidth / originalWidth
          const displayScaleY = displayHeight / originalHeight
          const posXDisp = posXNat * displayScaleX
          const posYDisp = posYNat * displayScaleY
          setOverlayPosition({ x: posXDisp, y: posYDisp })
          
          // Calculate overlay scale to fit target dimensions
          const targetWDisp = targetWNat * displayScaleX
          const targetHDisp = targetHNat * displayScaleY
          const scaleX = targetWDisp > 0 ? (targetWDisp / oImg.width) : 1
          const scaleY = targetHDisp > 0 ? (targetHDisp / oImg.height) : 1
          const fitScale = Math.min(scaleX, scaleY)
          setOverlayScale(fitScale || 1)
        }
        oImg.onerror = () => {
          console.error('Failed to load overlay image from template')
        }
        oImg.src = ovUrl
      }
    }
    
    alert(`Template loaded! ${convertedLayers.length} text layers added.`)
  }
  
  // Start waiting for render
  requestAnimationFrame(waitForRender)
}
        img.onerror = () => {
          alert('Failed to load image from template')
        }
        img.src = data.base_image.image_url
      }
    } else {
      // Old format fallback
      if (data.image_url) {
        setImageUrl(data.image_url)
        setImageLoaded(true)
      }
      if (data.text_layers) {
        setTextLayers(data.text_layers)
      }
    }
  } catch (error) {
    alert('Invalid JSON format: ' + error.message)
    console.error('Template load error:', error)
  }
}
  // Export functionality
  const handleExport = async () => {
    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d')
      
      if (!imageRef.current) {
        alert('Please load an image first')
        return
      }

      canvas.width = imageRef.current.naturalWidth
      canvas.height = imageRef.current.naturalHeight
      
      // Draw main image
      ctx.drawImage(imageRef.current, 0, 0)
      
        // Draw overlay image if present
      if (overlayVisible && overlayImage) {
        const scaleX = overlayScale * (imageRef.current.naturalWidth / imageRef.current.width)
        const scaleY = overlayScale * (imageRef.current.naturalHeight / imageRef.current.height)
        const overlayX = overlayPosition.x * (imageRef.current.naturalWidth / imageRef.current.width)
        const overlayY = overlayPosition.y * (imageRef.current.naturalHeight / imageRef.current.height)
        
        ctx.save()
        ctx.translate(overlayX, overlayY)
        ctx.scale(scaleX, scaleY)
        ctx.drawImage(overlayImage, 0, 0)
        ctx.restore()
      }
      
      const ratioX = imageRef.current.naturalWidth / imageRef.current.width
      const ratioY = imageRef.current.naturalHeight / imageRef.current.height

      const drawRoundedRectPath = (ctx, width, height, radius) => {
        const r = Math.min(radius, width / 2, height / 2)
        ctx.beginPath()
        ctx.moveTo(-width / 2 + r, -height / 2)
        ctx.lineTo(width / 2 - r, -height / 2)
        ctx.quadraticCurveTo(width / 2, -height / 2, width / 2, -height / 2 + r)
        ctx.lineTo(width / 2, height / 2 - r)
        ctx.quadraticCurveTo(width / 2, height / 2, width / 2 - r, height / 2)
        ctx.lineTo(-width / 2 + r, height / 2)
        ctx.quadraticCurveTo(-width / 2, height / 2, -width / 2, height / 2 - r)
        ctx.lineTo(-width / 2, -height / 2 + r)
        ctx.quadraticCurveTo(-width / 2, -height / 2, -width / 2 + r, -height / 2)
        ctx.closePath()
      }

      // Draw shape layers
      shapeLayers.forEach(shape => {
        ctx.save()

        const width = shape.width * ratioX
        const computedHeight = shape.type === 'line' ? Math.max(shape.borderWidth || 1, shape.height || 1) : shape.height
        const height = computedHeight * ratioY
        const centerX = (shape.x * ratioX) + (width / 2)
        const centerY = (shape.y * ratioY) + (height / 2)
        const rotation = ((shape.rotation || 0) * Math.PI) / 180
        const opacity = shape.opacity ?? 1
        const stroke = (shape.borderWidth || 0) * ((ratioX + ratioY) / 2)

        ctx.translate(centerX, centerY)
        ctx.rotate(rotation)
        ctx.globalAlpha = opacity

        const fillColor = shape.fill || 'transparent'
        const strokeColor = shape.borderColor || '#000000'

        if (shape.type === 'rectangle' || shape.type === 'circle') {
          if (shape.type === 'circle') {
            const radius = Math.min(width, height) / 2
            ctx.beginPath()
            ctx.arc(0, 0, radius, 0, Math.PI * 2)
            ctx.closePath()
          } else {
            drawRoundedRectPath(ctx, width, height, (shape.borderRadius || 0) * ((ratioX + ratioY) / 2))
          }

          if (fillColor !== 'transparent') {
            ctx.fillStyle = fillColor
            ctx.fill()
          }

          if (stroke > 0) {
            ctx.strokeStyle = strokeColor
            ctx.lineWidth = stroke
            ctx.stroke()
          }
        } else if (shape.type === 'triangle') {
          ctx.beginPath()
          ctx.moveTo(0, -height / 2)
          ctx.lineTo(-width / 2, height / 2)
          ctx.lineTo(width / 2, height / 2)
          ctx.closePath()

          if (fillColor !== 'transparent') {
            ctx.fillStyle = fillColor
            ctx.fill()
          }

          if (stroke > 0) {
            ctx.strokeStyle = strokeColor
            ctx.lineWidth = stroke
            ctx.stroke()
          }
        } else if (shape.type === 'line') {
          ctx.beginPath()
          ctx.moveTo(- (shape.width * ratioX) / 2, 0)
          ctx.lineTo((shape.width * ratioX) / 2, 0)
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = (shape.borderWidth || 2) * ((ratioX + ratioY) / 2)
          ctx.stroke()
        }

        ctx.restore()
      })

      // Draw text layers
      textLayers.forEach(layer => {
        ctx.font = `${layer.fontWeight} ${layer.fontSize}px ${layer.fontFamily}`
        ctx.fillStyle = layer.color
        ctx.textAlign = layer.textAlign
        
        const x = layer.x
        const y = layer.y
        
        ctx.fillText(layer.text, x, y)
      })

        const link = document.createElement('a')
        link.download = 'edited-image.png'
      link.href = canvas.toDataURL()
        link.click()
    } catch (error) {
      alert('Failed to export image. This might be a CORS issue.')
      console.error('Export error:', error)
    }
  }

  // Panel toggle
  const togglePanel = (panelName) => {
    console.log('Clicking panel:', panelName)
    setActivePanel(panelName)
  }

  // Overlay image handling
  const handleOverlayImageUpload = (e) => {
    const file = e.target.files[0]
    if (file) {
      setOverlayImageFile(file)
      const reader = new FileReader()
      reader.onload = (event) => {
        const previousVisible = overlayVisible
        const previousUrl = overlayImageUrl
        const previousImage = overlayImage
        const previousPosition = overlayPosition
        const previousScale = overlayScale
        
        setOverlayImageUrl(event.target.result)
        const img = new Image()
        img.onload = () => {
          console.log('Overlay image loaded:', img.width, 'x', img.height)
          setOverlayImage(img)
          setOverlayVisible(true)
          // Start smaller and near the top-left; user can drag afterwards
          const initialPos = { x: 20, y: 20 }
          const initialScale = 0.3
          setOverlayPosition(initialPos)
          setOverlayScale(initialScale)
          
          // Save to history
          saveToHistory('overlay_add', {
            previousVisible,
            previousUrl,
            previousImage,
            previousPosition,
            previousScale,
            newVisible: true,
            newUrl: event.target.result,
            newImage: img,
            newPosition: initialPos,
            newScale: initialScale
          })
        }
        img.onerror = () => {
          console.error('Failed to load overlay image')
          alert('Failed to load overlay image')
        }
        img.src = event.target.result
      }
      reader.readAsDataURL(file)
    }
  }

  const handleOverlayImageUrlLoad = () => {
    if (overlayImageUrl) {
      const img = new Image()
      img.onload = () => {
        console.log('Overlay image loaded from URL:', img.width, 'x', img.height)
        setOverlayImage(img)
        setOverlayVisible(true)
        // Start smaller and near the top-left; user can drag afterwards
        setOverlayPosition({ x: 20, y: 20 })
        setOverlayScale(0.3)
      }
      img.onerror = () => {
        console.error('Failed to load overlay image from URL')
        alert('Failed to load overlay image from URL')
      }
      img.src = overlayImageUrl
    }
  }

  const handleOverlayRemove = () => {
    setOverlayImage(null)
    setOverlayImageUrl('')
    setOverlayImageFile(null)
    setOverlayVisible(false)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        if (e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          undo()
        } else if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) {
          e.preventDefault()
          redo()
        }
      }
    }

    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // Auto-load frame data when popup opens
  useEffect(() => {
    if (isOpen && frameData) {
      try {
        const data = frameData;
        
        // Load base image
        if (data.base_image?.image_url) {
          setImageUrl(data.base_image.image_url);
          
          const img = new Image();
          img.onload = () => {
            setImageUrl(data.base_image.image_url);
            setImageLoaded(true);
            
            const waitForRender = () => {
              const imgEl = imageRef.current;
              if (!imgEl || !imgEl.width || !imgEl.height) {
                requestAnimationFrame(waitForRender);
                return;
              }
              
              const originalWidth = data.base_image?.image_dimensions?.width || img.naturalWidth;
              const originalHeight = data.base_image?.image_dimensions?.height || img.naturalHeight;
              const naturalDims = {
                width: originalWidth || imgEl?.naturalWidth || imgEl?.width || 1,
                height: originalHeight || imgEl?.naturalHeight || imgEl?.height || 1
              };
              
              // Convert text_elements to textLayers
              const textElements = Array.isArray(data.text_elements) ? data.text_elements : [];
              
              if (textElements.length > 0) {
                const convertedLayers = textElements.map((element, index) => {
                  const bbPercent = convertBoundingBoxToPercent(element.bounding_box || {}, naturalDims);
                  const { x, y, width, height } = bbPercent;
                  
                  const shadow = element.effects?.textShadow;
                  let textShadowValue = 'none';
                  if (shadow && shadow.enabled) {
                    textShadowValue = 'drop';
                  }
                  
                  return {
                    id: Date.now() + index,
                    text: element.text || '',
                    x: x,
                    y: y,
                    width: width,
                    height: height,
                    fontSize: element.fontSize || 24,
                    fontFamily: element.fontFamily || 'Arial',
                    color: element.fill || '#000000',
                    fontWeight: element.fontWeight || 'normal',
                    textAlign: element.layout?.alignment || 'center',
                    textShadow: textShadowValue,
                    textGlow: 'none',
                    wordArt: 'none',
                    shadowProperties: shadow && shadow.enabled ? {
                      offsetX: shadow.offsetX || 2,
                      offsetY: shadow.offsetY || 2,
                      blur: shadow.blur || 4,
                      color: shadow.color || 'rgba(0, 0, 0, 0.5)'
                    } : null
                  };
                });
                setTextLayers(convertedLayers);
              }
              
              // Handle overlay_elements
              if (data.overlay_elements && Array.isArray(data.overlay_elements) && data.overlay_elements.length > 0) {
                const ov = data.overlay_elements[0];
                const bbPercent = convertBoundingBoxToPercent(ov?.bounding_box || {}, naturalDims);
                const posXNat = (bbPercent.x / 100) * originalWidth;
                const posYNat = (bbPercent.y / 100) * originalHeight;
                const targetWNat = (bbPercent.width / 100) * originalWidth;
                const targetHNat = (bbPercent.height / 100) * originalHeight;
                
                const ovUrl = ov?.overlay_image?.image_url;
                if (ovUrl) {
                  const oImg = new Image();
                  oImg.onload = () => {
                    setOverlayImage(oImg);
                    setOverlayImageUrl(ovUrl);
                    setOverlayVisible(true);
                    
                    const displayWidth = imgEl.width;
                    const displayHeight = imgEl.height;
                    const displayScaleX = displayWidth / originalWidth;
                    const displayScaleY = displayHeight / originalHeight;
                    const posXDisp = posXNat * displayScaleX;
                    const posYDisp = posYNat * displayScaleY;
                    setOverlayPosition({ x: posXDisp, y: posYDisp });
                    
                    const targetWDisp = targetWNat * displayScaleX;
                    const targetHDisp = targetHNat * displayScaleY;
                    const scaleX = targetWDisp > 0 ? (targetWDisp / oImg.width) : 1;
                    const scaleY = targetHDisp > 0 ? (targetHDisp / oImg.height) : 1;
                    const fitScale = Math.min(scaleX, scaleY);
                    setOverlayScale(fitScale || 1);
                  };
                  oImg.onerror = () => {
                    console.error('Failed to load overlay image');
                  };
                  oImg.src = ovUrl;
                }
              }
            };
            requestAnimationFrame(waitForRender);
          };
          img.onerror = () => {
            console.error('Failed to load image');
          };
          img.src = data.base_image.image_url;
        }
      } catch (error) {
        console.error('Failed to load frame data:', error);
      }
    } else if (!isOpen) {
      // Reset when closing
      setTextLayers([]);
      setImageUrl('');
      setImageLoaded(false);
      setSelectedLayer(null);
    }
  }, [isOpen, frameData]);

  // Convert textLayers back to text_elements format for API
  const convertTextLayersToElements = () => {
    if (!imageRef.current || textLayers.length === 0) return [];
    
    return textLayers.map((layer) => {
      const toNormalized = (value) => Math.max(0, Math.min(1, ensureNumber(value) / 100))
      const x = toNormalized(layer.x)
      const y = toNormalized(layer.y)
      const width = toNormalized(layer.width)
      const height = toNormalized(layer.height)
      
      // Reconstruct text element structure
      const textElement = {
        fill: layer.color,
        text: layer.text,
        type: 'headline',
        layout: {
          zIndex: 1,
          rotation: 0,
          alignment: layer.textAlign,
          anchor_point: 'center'
        },
        offset: {
          x: x,
          y: y
        },
        effects: {
          textShadow: layer.shadowProperties ? {
            blur: layer.shadowProperties.blur || 4,
            color: layer.shadowProperties.color || 'rgba(0, 0, 0, 0.5)',
            enabled: true,
            offsetX: layer.shadowProperties.offsetX || 2,
            offsetY: layer.shadowProperties.offsetY || 2
          } : {
            enabled: false
          }
        },
        fontSize: layer.fontSize,
        textStyle: layer.fontWeight === 'bold' ? 'bold' : 'normal',
        element_id: null,
        fontFamily: layer.fontFamily,
        fontWeight: layer.fontWeight,
        lineHeight: 1.2,
        textOpacity: 1,
        textTexture: {
          enabled: false,
          image_path: ''
        },
        bounding_box: {
          x,
          y,
          width,
          height
        },
        textGradient: {
          type: 'linear',
          angle: 0,
          colors: [],
          enabled: false
        },
        letterSpacing: 1,
        overlay_image: {
          enabled: false,
          scaling: {
            enabled: false,
            scale_x: 1,
            scale_y: 1,
            fit_mode: 'contain'
          },
          position: {
            x: 0,
            y: 0
          },
          image_url: '',
          image_dimensions: {
            width: 0,
            height: 0
          }
        }
      };
      
      return textElement;
    });
  };

  // Handle save changes
  const handleSaveChanges = async () => {
    try {
      setIsSaving(true);
      
      const sessionId = localStorage.getItem('session_id');
      const userId = localStorage.getItem('token');
      
      if (!sessionId || !userId) {
        alert('Missing session ID or user ID');
        setIsSaving(false);
        return;
      }
      
      if (!sceneNumber || imageIndex === null) {
        alert('Missing scene number or image index');
        setIsSaving(false);
        return;
      }
      
      // Convert textLayers to text_elements format
      const textElements = convertTextLayersToElements();
      
      // Convert overlay to overlay_elements format (if present)
      let overlayElements = [];
      if (overlayVisible && overlayImage && imageRef.current) {
        const imgEl = imageRef.current;
        const originalWidth = frameData?.base_image?.image_dimensions?.width || imgEl.naturalWidth;
        const originalHeight = frameData?.base_image?.image_dimensions?.height || imgEl.naturalHeight;
        const displayWidth = imgEl.width;
        const displayHeight = imgEl.height;
        const scaleX = displayWidth / originalWidth;
        const scaleY = displayHeight / originalHeight;
        
        // Convert display position back to natural pixel position, then to normalized
        const naturalX = overlayPosition.x / scaleX;
        const naturalY = overlayPosition.y / scaleY;
        const naturalWidth = (overlayImage.width * overlayScale) / scaleX;
        const naturalHeight = (overlayImage.height * overlayScale) / scaleY;
        
        overlayElements = [
          {
            bounding_box: {
              x: originalWidth > 0 ? naturalX / originalWidth : 0,
              y: originalHeight > 0 ? naturalY / originalHeight : 0,
              width: originalWidth > 0 ? naturalWidth / originalWidth : 0,
              height: originalHeight > 0 ? naturalHeight / originalHeight : 0
            },
            overlay_image: {
              image_url: overlayImageUrl,
              image_dimensions: {
                width: overlayImage.width,
                height: overlayImage.height
              }
            }
          }
        ];
      }
      
      // Build request body
      const requestBody = {
        session_id: sessionId,
        user_id: userId,
        updates: [
          {
            image_index: imageIndex,
            scene_number: sceneNumber,
            text_elements: textElements,
            overlay_elements: overlayElements
          }
        ]
      };
      
      // Make PUT request to API
      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/api/image-editing/elements', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (_) {
        responseData = responseText;
      }
      
      if (!response.ok) {
        throw new Error(`API request failed: ${response.status} ${responseText}`);
      }
      
      // ✅ NEW: Save edited image to temp folder
      try {
        console.log('💾 Saving edited image to temp folder...');
        await saveImageToTempFolder();
      } catch (tempSaveError) {
        console.warn('⚠️ Failed to save to temp folder (continuing with API save):', tempSaveError);
        // Don't block the main save flow if temp save fails
      }
      
      // Show success popup with updating message
      setShowSuccessPopup(true);
      setIsRefreshing(true);
      
      // Reload the window after a short delay to show the success message
      setTimeout(() => {
        setShowSuccessPopup(false);
        setIsRefreshing(false);
        window.location.reload();
      }, 1500);
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save changes: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  // ✅ NEW: Function to save the edited image (with overlays and text) to temp folder
  const saveImageToTempFolder = async () => {
    try {
      // Find the container with the edited image (includes image + text layers + overlays)
      const imageContainer = document.querySelector('[data-image-editor-canvas]');
      
      if (!imageContainer) {
        console.warn('⚠️ Image editor canvas not found for temp save');
        return;
      }

      console.log('📸 Capturing edited image from editor canvas...');
      
      // Dynamically import html2canvas (since it might not be in this component's imports)
      const html2canvas = (await import('html2canvas')).default;
      
      // Capture the container with html2canvas
      const canvas = await html2canvas(imageContainer, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 2
      });

      // Convert to blob
      const blob = await new Promise((resolve) => canvas.toBlob(resolve, 'image/png'));
      
      // Generate filename
      const fileName = `scene-${sceneNumber}-image-${Number(imageIndex) + 1}.png`;
      
      console.log(`📝 Uploading to temp folder: ${fileName}`);
      
      // Create FormData
      const formData = new FormData();
      formData.append('image', new File([blob], fileName, { type: 'image/png' }));
      formData.append('fileName', fileName);
      formData.append('sceneNumber', sceneNumber);
      formData.append('imageIndex', imageIndex);
      
      // Upload to backend
      const saveResponse = await fetch('/api/save-temp-image', {
        method: 'POST',
        body: formData,
      });
      
      if (saveResponse.ok) {
        const result = await saveResponse.json();
        console.log(`✅ Saved to temp folder: ${result.path || fileName}`);
      } else {
        console.warn(`⚠️ Temp save failed with status ${saveResponse.status}`);
      }
    } catch (error) {
      console.error('❌ Error saving to temp folder:', error);
      throw error;
    }
  };

  if (!isOpen) return null;

  const outerClasses = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50';
  const innerClasses = 'relative max-w-9xl h-[98vh] rounded-lg bg-white shadow-2xl overflow-hidden flex flex-col';
  const workspaceBaseClasses = 'flex-1 relative overflow-hidden flex items-center justify-center transition-all duration-300';
  const workspaceChromeClasses = `bg-white m-4 rounded-lg p-6 shadow-lg ${isToolbarOpen ? 'mt-2' : 'mt-4'}`;
  const workspaceContainerClasses = `${workspaceBaseClasses} ${workspaceChromeClasses}`.trim();
  const canvasWrapperBase = 'relative cursor-crosshair overflow-hidden';
  const canvasWrapperClasses = `${canvasWrapperBase} inline-block border-2 border-gray-200 bg-gray-50 rounded-md`;
  const bodyWrapperClasses = 'flex flex-col flex-1 min-h-0 overflow-hidden';
  const headerContainerClasses = 'header flex-shrink-0 w-full';
  const headerPanelClasses = '';
  const toolbarContainerClasses = 'bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2 flex-wrap flex-shrink-0';
  const mainContainerClasses = 'flex flex-1 overflow-hidden relative min-h-0';

  return (
    <>
      {/* Success Popup */}
      {showSuccessPopup && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl p-8 max-w-md w-full mx-4 transform transition-all">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-800 mb-2">
                {isRefreshing ? 'Updating Changes...' : 'Changes Done!'}
              </h3>
              <p className="text-gray-600 mb-4">
                {isRefreshing 
                  ? 'Your changes have been saved and the page is being refreshed.' 
                  : 'Your changes have been successfully saved.'}
              </p>
              <div className="w-8 h-1 bg-[#13008B] rounded-full animate-pulse"></div>
              {isRefreshing && (
                <div className="mt-4 flex items-center justify-center">
                  <div className="w-5 h-5 border-2 border-[#13008B] border-t-transparent rounded-full animate-spin"></div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

    <div className={outerClasses}>
      <div className={innerClasses}>
        <div className={bodyWrapperClasses}>
      {/* Header */}
      <div className={headerContainerClasses}>
        <div className={headerPanelClasses}>
        <div className="flex items-center w-full justify-between">
          <div className="header-left flex items-center gap-3">
            <h1 className="header-title">Storyboard Editor</h1>
            {/* Close X button next to title */}
            
          </div>
          <div className="header-right flex items-center gap-4">
            <button
              onClick={() => setIsToolbarOpen(!isToolbarOpen)}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm font-semibold rounded-lg transition-all border border-gray-300 flex items-center gap-2"
              title="Open Tool"
            >
              <Icon name="edit" size={16} />
              Open Tool
            </button>
            <button
              onClick={handleSaveChanges}
              disabled={isSaving}
              className="px-6 py-2 bg-[#13008B] hover:bg-[#0f0068] text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              title="Save Changes"
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Icon name="save" size={16} />
                  Save Changes
                </>
              )}
            </button>
            {onClose && (
              <button
                onClick={onClose}
                className="ml-2 w-8 h-8 flex items-center justify-center bg-gray-100 hover:bg-red-50 border border-gray-300 hover:border-red-400 rounded-full transition-all text-gray-600 hover:text-red-600 font-bold text-lg leading-none"
                title="Close"
              >
                <FaTimes
                  size={20}
                  className="text-gray-600 hover:text-red-600"
                />
              </button>
            )}
          </div>
        </div>
        </div>
      </div>

      {/* Top Toolbar */}
      {isToolbarOpen && imageLoaded && (
          <div className={toolbarContainerClasses}>
              {/* Undo/Redo Controls */}
              <div className="flex gap-1">
                <button 
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${historyIndex < 0 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-purple-600 hover:text-white text-gray-600'}`}
                  onClick={undo}
                  disabled={historyIndex < 0}
                  title="Undo (Ctrl+Z)"
                >
                  <Icon name="undo" size={16} />
                </button>
                <button 
                  className={`w-8 h-8 flex items-center justify-center rounded-md transition-all ${historyIndex >= history.length - 1 ? 'opacity-40 cursor-not-allowed' : 'hover:bg-purple-600 hover:text-white text-gray-600'}`}
                  onClick={redo}
                  disabled={historyIndex >= history.length - 1}
                  title="Redo (Ctrl+Y)"
                >
                  <Icon name="redo" size={16} />
                </button>
              </div>

              {/* Divider */}
              <div className="w-px h-6 bg-gray-300 mx-1"></div>

              {/* Text Tools Panel */}
              <button
                className={`w-10 h-10 flex items-center justify-center rounded-md transition-all ${activePanel === 'text' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                onClick={() => togglePanel('text')}
                title="Text Tools"
              >
                <Icon name="edit" size={18} />
              </button>

              {/* Shapes Panel */}
              <div className="relative group">
                <button
                  className={`w-10 h-10 flex items-center justify-center rounded-md transition-all ${activePanel === 'shapes' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                  onClick={() => togglePanel('shapes')}
                  title="Shapes"
                >
                  <Icon name="shape" size={18} />
                </button>
                {/* Hover preview with basic shapes (clickable) */}
                <div className="pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity z-50">
                  <div className="pointer-events-auto bg-white border border-gray-200 rounded-md shadow-lg p-2 flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleAddShape('rectangle')}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100"
                      title="Add Rectangle"
                    >
                      <div className="w-5 h-3 bg-purple-500 rounded-sm" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddShape('circle')}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100"
                      title="Add Circle"
                    >
                      <div className="w-5 h-5 bg-purple-500 rounded-full" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAddShape('curve')}
                      className="w-7 h-7 flex items-center justify-center rounded-md hover:bg-gray-100"
                      title="Add Curve Line"
                    >
                      <div
                        className="w-5 h-3"
                        style={{
                          borderBottom: '3px solid #7c3aed',
                          borderRadius: '9999px'
                        }}
                      />
                    </button>
                  </div>
                </div>
              </div>

              {/* Overlay Images Panel */}
              <button
                className={`w-10 h-10 flex items-center justify-center rounded-md transition-all ${activePanel === 'overlay' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                onClick={() => togglePanel('overlay')}
                title="Overlay Images"
              >
                <Icon name="image" size={18} />
              </button>

              {/* Image Editor Panel */}
              <button
                className={`w-10 h-10 flex items-center justify-center rounded-md transition-all ${activePanel === 'image-editor' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                onClick={() => togglePanel('image-editor')}
                title="Image Editor"
              >
                <Icon name="crop" size={18} />
              </button>

              {/* Export & Actions Panel */}
              <button
                className={`w-10 h-10 flex items-center justify-center rounded-md transition-all ${activePanel === 'export' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                onClick={() => togglePanel('export')}
                title="Export"
              >
                <Icon name="save" size={18} />
              </button>
          </div>
      )}

      {/* Main App Container */}
      <div className={mainContainerClasses}>
        {/* Main Workspace */}
        <div className="flex flex-1 overflow-y-auto min-h-0">

          {/* Editor Section */}
          <div className="flex-1 overflow-auto flex flex-col overflow-y-auto min-h-0">
            <div className={workspaceContainerClasses}>
              {imageLoaded ? (
                <div 
                  className={canvasWrapperClasses}
                  data-image-editor-canvas
                  style={editorCanvasStyle}
                >
                  <img
                    ref={imageRef}
                    src={imageUrl}
                    alt="Loaded"
                    style={{ 
                      width: '100%',
                      height: '100%',
                      objectFit: 'contain',
                      filter: applyFiltersToImage()
                    }}
                    onLoad={() => setImageLoaded(true)}
                  />
                  {isCropping && (
                    <div
                      className="absolute border-2 border-dashed border-purple-600 bg-purple-100 cursor-move z-[1001]"
                      style={{ 
                        left: cropArea.x, 
                        top: cropArea.y, 
                        width: cropArea.width, 
                        height: cropArea.height 
                      }}
                      onMouseDown={(e) => {
                        e.stopPropagation()
                        const rect = e.currentTarget.getBoundingClientRect()
                        const x = e.clientX - rect.left
                        const y = e.clientY - rect.top
                        const edge = 8
                        let mode = 'move'
                        if (y < edge && x < edge) mode = 'nw'
                        else if (y < edge && x > rect.width - edge) mode = 'ne'
                        else if (y > rect.height - edge && x < edge) mode = 'sw'
                        else if (y > rect.height - edge && x > rect.width - edge) mode = 'se'
                        else if (y < edge) mode = 'n'
                        else if (y > rect.height - edge) mode = 's'
                        else if (x < edge) mode = 'w'
                        else if (x > rect.width - edge) mode = 'e'
                        setCropDragMode(mode)
                        setDragStart({ x: e.clientX, y: e.clientY })
                        setLayerStart({ x: cropArea.x, y: cropArea.y, width: cropArea.width, height: cropArea.height })
                      }}
                    />
                  )}
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    {shapeLayers.map((shape) => {
                      const { scaleX, scaleY } = getImageScale()
                      const widthPx = Math.max(shape.width * scaleX, 1)
                      const baseHeight = shape.type === 'line' ? Math.max(shape.borderWidth || 1, shape.height || 1) : shape.height
                      const heightPx = Math.max(baseHeight * scaleY, 1)

                      const wrapperStyle = {
                        position: 'absolute',
                        left: shape.x * scaleX,
                        top: shape.y * scaleY,
                        width: widthPx,
                        height: heightPx,
                        cursor: 'move',
                        border: selectedShape?.id === shape.id ? '2px solid #7c3aed' : '2px solid transparent',
                        boxSizing: 'border-box',
                        transform: `rotate(${shape.rotation || 0}deg)`,
                        transformOrigin: 'center center',
                        opacity: shape.opacity ?? 1,
                        zIndex: 50,
                        pointerEvents: 'auto'
                      }

                      const innerStyle = {
                        width: '100%',
                        height: '100%',
                        pointerEvents: 'none'
                      }

                      if (shape.type === 'rectangle' || shape.type === 'square') {
                        innerStyle.backgroundColor = shape.fill
                        innerStyle.border = `${shape.borderWidth || 0}px ${shape.borderStyle || 'solid'} ${shape.borderColor || 'transparent'}`
                        innerStyle.borderRadius = `${shape.borderRadius || 0}px`
                      } else if (shape.type === 'circle') {
                        innerStyle.backgroundColor = shape.fill
                        innerStyle.border = `${shape.borderWidth || 0}px ${shape.borderStyle || 'solid'} ${shape.borderColor || 'transparent'}`
                        innerStyle.borderRadius = '50%'
                      } else if (shape.type === 'triangle') {
                        innerStyle.backgroundColor = shape.fill
                        innerStyle.border = 'none'
                        innerStyle.clipPath = 'polygon(50% 0%, 0% 100%, 100% 100%)'
                        innerStyle.backgroundImage = `linear-gradient(${shape.fill}, ${shape.fill})`
                        if (shape.borderWidth) {
                          innerStyle.boxShadow = `0 0 0 ${shape.borderWidth}px ${shape.borderColor || 'transparent'}`
                        }
                      } else if (shape.type === 'line') {
                        wrapperStyle.height = Math.max((shape.borderWidth || baseHeight) * scaleY, 1)
                        innerStyle.height = '100%'
                        innerStyle.backgroundColor = shape.borderColor || shape.fill || '#000000'
                        innerStyle.border = 'none'
                      } else if (shape.type === 'curve') {
                        wrapperStyle.height = heightPx
                        innerStyle.height = '100%'
                        innerStyle.backgroundColor = 'transparent'
                        innerStyle.borderRadius = `${shape.borderRadius || 9999}px`
                        innerStyle.border = `${shape.borderWidth || 4}px ${shape.borderStyle || 'solid'} ${shape.borderColor || '#000000'}`
                      }

                      return (
                        <div
                          key={shape.id}
                          className={`${selectedShape?.id === shape.id ? 'selected' : ''}`}
                          style={wrapperStyle}
                          onClick={() => handleShapeClick(shape)}
                          onMouseDown={(e) => handleShapeMouseDown(e, shape.id, 'drag')}
                          onMouseEnter={() => {
                            if (shapeHoverTimeoutRef.current) {
                              clearTimeout(shapeHoverTimeoutRef.current)
                            }
                            setHoveredShapeId(shape.id)
                          }}
                          onMouseLeave={() => {
                            shapeHoverTimeoutRef.current = setTimeout(() => {
                              setHoveredShapeId(null)
                              shapeHoverTimeoutRef.current = null
                            }, 200)
                          }}
                        >
                          <div style={innerStyle} />
                          {selectedShape?.id === shape.id && (
                            <div
                              className="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-600 border-2 border-white rounded-full cursor-nwse-resize z-10 shadow-sm"
                              onMouseDown={(e) => handleShapeMouseDown(e, shape.id, 'resize')}
                            />
                          )}
                          {hoveredShapeId === shape.id && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedShape(shape)
                                const previousLayers = [...shapeLayers]
                                const previousSelected = shape
                                const updatedLayers = shapeLayers.filter(s => s.id !== shape.id)
                                setShapeLayers(updatedLayers)
                                setSelectedShape(null)
                                setHoveredShapeId(null)
                                saveToHistory('shape_delete', {
                                  previousLayers,
                                  previousSelected,
                                  newLayers: updatedLayers,
                                  newSelected: null
                                })
                              }}
                              className="absolute -top-2 -right-2 w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg z-20 transition-all"
                              title="Delete Shape"
                              onMouseEnter={() => {
                                if (shapeHoverTimeoutRef.current) {
                                  clearTimeout(shapeHoverTimeoutRef.current)
                                  shapeHoverTimeoutRef.current = null
                                }
                              }}
                            >
                              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M3 6h18"/>
                                <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                                <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                              </svg>
                            </button>
                          )}
                        </div>
                      )
                    })}
                    {textLayers.map((layer) => {
                      const leftPx = percentToDisplayPx(layer.x, 'x')
                      const topPx = percentToDisplayPx(layer.y, 'y')
                      const widthPx = percentToDisplayPx(layer.width, 'x')
                      const heightPx = percentToDisplayPx(layer.height, 'y')
                      return (
                        <div
                          key={layer.id}
                          className={`absolute cursor-move p-1 ${selectedLayer?.id === layer.id ? 'border-2 border-purple-600 bg-purple-100' : 'border-2 border-transparent'}`}
                          style={{
                            left: `${clampPercentValue(layer.x)}%`,
                            top: `${clampPercentValue(layer.y)}%`,
                            width: `${clampPercentValue(layer.width)}%`,
                            height: `${clampPercentValue(layer.height)}%`,
                            pointerEvents: 'auto'
                          }}
                          onClick={() => handleLayerClick(layer)}
                          onMouseDown={(e) => handleMouseDown(e, layer.id, 'drag')}
                          onMouseEnter={(e) => {
                            // Clear any pending hide timeout
                            if (hoverTimeoutRef.current) {
                              clearTimeout(hoverTimeoutRef.current)
                              hoverTimeoutRef.current = null
                            }
                            setHoveredTextLayerId(layer.id)
                            setIsHoveringToolbar(false)
                            const rect = e.currentTarget.getBoundingClientRect()
                            const editorSection = e.currentTarget.closest('.editor-section')
                            const toolbarHeight = 48 // approx toolbar height in px
                            if (editorSection) {
                              const containerRect = editorSection.getBoundingClientRect()
                              const relativeTop = rect.top - containerRect.top
                              const isNearTop = relativeTop < toolbarHeight + 8
                              setHoverToolbarPosition({
                                x: rect.left - containerRect.left + rect.width / 2,
                                y: isNearTop
                                  ? relativeTop + rect.height + 10
                                  : relativeTop - 10
                              })
                            } else {
                              const isNearTop = topPx < toolbarHeight + 8
                              setHoverToolbarPosition({
                                x: leftPx + widthPx / 2,
                                y: isNearTop ? topPx + heightPx + 10 : topPx - 10
                              })
                            }
                          }}
                          onMouseLeave={() => {
                            // Only hide if not hovering over toolbar
                            if (!isHoveringToolbarRef.current) {
                              hoverTimeoutRef.current = setTimeout(() => {
                                // Double check that we're still not hovering
                                if (!isHoveringToolbarRef.current) {
                                  setHoveredTextLayerId(null)
                                }
                                hoverTimeoutRef.current = null
                              }, 300) // 300ms delay before hiding
                            }
                          }}
                        >
                          {layer.overlayImage?.enabled && layer.overlayImage?.imageUrl ? (
                            <img
                              src={layer.overlayImage.imageUrl}
                              alt="Overlay"
                              className="w-full h-full pointer-events-none"
                              style={{
                                objectFit: layer.overlayImage.fitMode || 'contain',
                                objectPosition: 'center'
                              }}
                              onError={(e) => {
                                console.error('Failed to load overlay image:', layer.overlayImage.imageUrl)
                              }}
                            />
                          ) : (
                            <div
                              style={{
                                fontSize: layer.fontSize,
                                fontFamily: layer.fontFamily,
                                color: layer.color,
                                fontWeight: layer.fontWeight,
                                fontStyle: layer.fontStyle || 'normal',
                                textDecoration: layer.textDecoration || 'none',
                                textAlign: layer.textAlign,
                                backgroundColor: layer.backgroundColor || 'transparent',
                                padding: layer.backgroundColor ? '2px 4px' : '0',
                                borderRadius: layer.backgroundColor ? '2px' : '0',
                                ...getTextEffectStyles(layer),
                                ...getWordArtStyles(layer)
                              }}
                            >
                              {layer.text}
                            </div>
                          )}
                          {selectedLayer?.id === layer.id && (
                            <div
                              className="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-600 border-2 border-white rounded-full cursor-nwse-resize z-10 shadow-sm"
                              onMouseDown={(e) => handleMouseDown(e, layer.id, 'resize')}
                            />
                          )}
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Overlay Image */}
                  {renderOverlayImage()}

                  {/* Hover Text Toolbar */}
                  {hoveredTextLayerId && (() => {
                    const hoveredLayer = textLayers.find(layer => layer.id === hoveredTextLayerId)
                    if (!hoveredLayer) return null
                    
                    return (
                      <div
                        className="absolute z-50 bg-white rounded-lg shadow-2xl border border-gray-200 p-2 flex items-center gap-2"
                        style={{
                          left: hoverToolbarPosition.x,
                          top: hoverToolbarPosition.y,
                          transform: 'translate(-50%, -100%)',
                          pointerEvents: 'auto'
                        }}
                        onMouseEnter={() => {
                          // Clear any pending hide timeout
                          if (hoverTimeoutRef.current) {
                            clearTimeout(hoverTimeoutRef.current)
                            hoverTimeoutRef.current = null
                          }
                          setIsHoveringToolbar(true)
                          setHoveredTextLayerId(hoveredTextLayerId)
                        }}
                        onMouseLeave={() => {
                          setIsHoveringToolbar(false)
                          // Delay hiding to allow moving back to text
                          hoverTimeoutRef.current = setTimeout(() => {
                            // Double check that we're still not hovering
                            if (!isHoveringToolbarRef.current) {
                              setHoveredTextLayerId(null)
                            }
                            hoverTimeoutRef.current = null
                          }, 300) // 300ms delay before hiding
                        }}
                      >
                        {/* Font Family */}
                        <div className="relative">
                          <select
                            value={hoveredLayer.fontFamily}
                            onChange={(e) => {
                              // Update the hovered layer directly
                              const updatedLayers = textLayers.map(layer =>
                                layer.id === hoveredLayer.id ? { ...layer, fontFamily: e.target.value } : layer
                              )
                              setTextLayers(updatedLayers)
                              if (selectedLayer?.id === hoveredLayer.id) {
                                setSelectedLayer({ ...selectedLayer, fontFamily: e.target.value })
                              }
                            }}
                            className="px-3 py-1.5 pr-8 text-sm border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none cursor-pointer min-w-[140px]"
                            style={{ fontFamily: hoveredLayer.fontFamily }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            {fonts.map(font => (
                              <option key={font} value={font} style={{ fontFamily: font, backgroundColor: '#ffffff', color: '#111827' }}>
                                {font}
                              </option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                        </div>

                        {/* Font Size */}
                        <div className="relative">
                          <select
                            value={hoveredLayer.fontSize}
                            onChange={(e) => {
                              // Update the hovered layer directly
                              const size = parseInt(e.target.value) || 8
                              const updatedLayers = textLayers.map(layer =>
                                layer.id === hoveredLayer.id ? { ...layer, fontSize: size } : layer
                              )
                              setTextLayers(updatedLayers)
                              if (selectedLayer?.id === hoveredLayer.id) {
                                setSelectedLayer({ ...selectedLayer, fontSize: size })
                              }
                            }}
                            className="px-3 py-1.5 pr-8 text-sm border border-gray-300 rounded-md bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none cursor-pointer min-w-[70px]"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {Array.from({ length: 20 }, (_, i) => (i + 8) * 2).map(size => (
                              <option key={size} value={size} style={{ backgroundColor: '#ffffff', color: '#111827' }}>{size}</option>
                            ))}
                          </select>
                          <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-600">
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                        </div>

                        {/* Text Style Buttons */}
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Update the hovered layer directly
                              const isBold = hoveredLayer.fontWeight === '700' || hoveredLayer.fontWeight === 700 || hoveredLayer.fontWeight === 'bold'
                              const newWeight = isBold ? '400' : '700'
                              const updatedLayers = textLayers.map(layer =>
                                layer.id === hoveredLayer.id ? { ...layer, fontWeight: newWeight } : layer
                              )
                              setTextLayers(updatedLayers)
                              if (selectedLayer?.id === hoveredLayer.id) {
                                setSelectedLayer({ ...selectedLayer, fontWeight: newWeight })
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded text-sm font-bold transition-all ${
                              (hoveredLayer.fontWeight === '700' || hoveredLayer.fontWeight === 700 || hoveredLayer.fontWeight === 'bold')
                                ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            title="Bold"
                          >
                            B
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Update the hovered layer directly
                              const newStyle = hoveredLayer.fontStyle === 'italic' ? 'normal' : 'italic'
                              const updatedLayers = textLayers.map(layer =>
                                layer.id === hoveredLayer.id ? { ...layer, fontStyle: newStyle } : layer
                              )
                              setTextLayers(updatedLayers)
                              if (selectedLayer?.id === hoveredLayer.id) {
                                setSelectedLayer({ ...selectedLayer, fontStyle: newStyle })
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded text-sm italic transition-all ${
                              hoveredLayer.fontStyle === 'italic' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            title="Italic"
                          >
                            I
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Update the hovered layer directly
                              const newDecoration = hoveredLayer.textDecoration === 'underline' ? 'none' : 'underline'
                              const updatedLayers = textLayers.map(layer =>
                                layer.id === hoveredLayer.id ? { ...layer, textDecoration: newDecoration } : layer
                              )
                              setTextLayers(updatedLayers)
                              if (selectedLayer?.id === hoveredLayer.id) {
                                setSelectedLayer({ ...selectedLayer, textDecoration: newDecoration })
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded text-sm underline transition-all ${
                              hoveredLayer.textDecoration === 'underline' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            title="Underline"
                          >
                            U
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Update the hovered layer directly
                              const newDecoration = hoveredLayer.textDecoration === 'line-through' ? 'none' : 'line-through'
                              const updatedLayers = textLayers.map(layer =>
                                layer.id === hoveredLayer.id ? { ...layer, textDecoration: newDecoration } : layer
                              )
                              setTextLayers(updatedLayers)
                              if (selectedLayer?.id === hoveredLayer.id) {
                                setSelectedLayer({ ...selectedLayer, textDecoration: newDecoration })
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded text-sm line-through transition-all ${
                              hoveredLayer.textDecoration === 'line-through' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                            }`}
                            title="Strikethrough"
                          >
                            S
                          </button>
                        </div>

                        {/* Divider */}
                        <div className="w-px h-6 bg-gray-300"></div>

                        {/* Text Alignment Buttons */}
                        <div className="flex gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Update the hovered layer directly
                              const updatedLayers = textLayers.map(layer =>
                                layer.id === hoveredLayer.id ? { ...layer, textAlign: 'left' } : layer
                              )
                              setTextLayers(updatedLayers)
                              if (selectedLayer?.id === hoveredLayer.id) {
                                setSelectedLayer({ ...selectedLayer, textAlign: 'left' })
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded transition-all ${
                              hoveredLayer.textAlign === 'left'
                                ? 'bg-purple-600 border border-purple-600' : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            title="Align Left"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={hoveredLayer.textAlign === 'left' ? 'text-white' : 'text-gray-700'}>
                              <line x1="3" y1="6" x2="21" y2="6"/>
                              <line x1="3" y1="12" x2="15" y2="12"/>
                              <line x1="3" y1="18" x2="21" y2="18"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Update the hovered layer directly
                              const updatedLayers = textLayers.map(layer =>
                                layer.id === hoveredLayer.id ? { ...layer, textAlign: 'center' } : layer
                              )
                              setTextLayers(updatedLayers)
                              if (selectedLayer?.id === hoveredLayer.id) {
                                setSelectedLayer({ ...selectedLayer, textAlign: 'center' })
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded transition-all ${
                              hoveredLayer.textAlign === 'center'
                                ? 'bg-purple-600 border border-purple-600' : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            title="Align Center"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={hoveredLayer.textAlign === 'center' ? 'text-white' : 'text-gray-700'}>
                              <line x1="3" y1="6" x2="21" y2="6"/>
                              <line x1="9" y1="12" x2="15" y2="12"/>
                              <line x1="3" y1="18" x2="21" y2="18"/>
                            </svg>
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              // Update the hovered layer directly
                              const updatedLayers = textLayers.map(layer =>
                                layer.id === hoveredLayer.id ? { ...layer, textAlign: 'right' } : layer
                              )
                              setTextLayers(updatedLayers)
                              if (selectedLayer?.id === hoveredLayer.id) {
                                setSelectedLayer({ ...selectedLayer, textAlign: 'right' })
                              }
                            }}
                            className={`px-2.5 py-1.5 rounded transition-all ${
                              hoveredLayer.textAlign === 'right'
                                ? 'bg-purple-600 border border-purple-600' : 'bg-gray-200 hover:bg-gray-300'
                            }`}
                            title="Align Right"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={hoveredLayer.textAlign === 'right' ? 'text-white' : 'text-gray-700'}>
                              <line x1="3" y1="6" x2="21" y2="6"/>
                              <line x1="9" y1="12" x2="21" y2="12"/>
                              <line x1="3" y1="18" x2="21" y2="18"/>
                            </svg>
                          </button>
                        </div>

                    

                        

                        {/* Text Color */}
                        <div className="w-px h-6 bg-gray-300"></div>
                        <input
                          type="color"
                          value={hoveredLayer.color}
                          onChange={(e) => {
                            // Update the hovered layer directly
                            const updatedLayers = textLayers.map(layer =>
                              layer.id === hoveredLayer.id ? { ...layer, color: e.target.value } : layer
                            )
                            setTextLayers(updatedLayers)
                            if (selectedLayer?.id === hoveredLayer.id) {
                              setSelectedLayer({ ...selectedLayer, color: e.target.value })
                            }
                          }}
                          className="w-8 h-8 border border-gray-300 rounded cursor-pointer"
                          onClick={(e) => e.stopPropagation()}
                          style={{
                            WebkitAppearance: 'none',
                            MozAppearance: 'none',
                            appearance: 'none',
                            border: '1px solid #d1d5db',
                            borderRadius: '6px'
                          }}
                          title="Text Color"
                        />

                        {/* Divider */}
                        <div className="w-px h-6 bg-gray-300"></div>

                        {/* More Options Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            // Select the hovered layer and open the main text editor panel
                            setSelectedLayer(hoveredLayer)
                            setActivePanel('text')
                            setHoveredTextLayerId(null)
                          }}
                          className="px-2.5 py-1.5 text-xs bg-gray-200 hover:bg-gray-300 text-gray-700 rounded transition-colors flex items-center gap-1"
                          title="More Options"
                        >
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <circle cx="12" cy="12" r="1"/>
                            <circle cx="19" cy="12" r="1"/>
                            <circle cx="5" cy="12" r="1"/>
                          </svg>
                          More
                        </button>

                        {/* Divider */}
                        <div className="w-px h-6 bg-gray-300"></div>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            const previousLayers = [...textLayers]
                            const previousSelected = selectedLayer
                            
                            const updatedLayers = textLayers.filter(layer => layer.id !== hoveredTextLayerId)
                            setTextLayers(updatedLayers)
                            setSelectedLayer(null)
                            setHoveredTextLayerId(null)
                            
                            saveToHistory('text_delete', {
                              previousLayers,
                              previousSelected,
                              newLayers: updatedLayers,
                              newSelected: null
                            })
                          }}
                          className="px-2 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white rounded transition-colors flex items-center gap-1"
                          title="Delete Text"
                        >
                          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18"/>
                            <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                          </svg>
                        </button>
                      </div>
                    )
                  })()}
                </div>
              ) : (
                <div className="text-center py-10 text-gray-500">
                  <Icon name="image" size={48} />
                  <h3 className="mt-4 mb-2 text-purple-600 text-xl">Load an Image to Get Started</h3>
                  <p className="text-sm">Enter an image URL above and click 'Load Image'</p>
                </div>
              )}
            </div>
          </div>

          {/* Flyout Panel */}
          {activePanel && (
            <div className={`absolute top-0 right-0 w-96 h-full bg-gradient-to-b from-white to-gray-50 shadow-2xl z-10 flex flex-col transform transition-transform duration-400 ease-out border-l border-gray-200 ${activePanel ? 'translate-x-0' : 'translate-x-full'}`}>
              <div className="px-8 pt-8 pb-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-br from-white to-gray-50 relative">
                <h3 className="m-0 text-xl font-extrabold text-gray-800 uppercase tracking-wide">{activePanel.charAt(0).toUpperCase() + activePanel.slice(1)}</h3>
                <button 
                  className="absolute top-6 right-6 w-8 h-8 border-none bg-gray-200 text-gray-600 rounded-full cursor-pointer flex items-center justify-center transition-all text-base hover:bg-red-500 hover:text-white hover:scale-110" 
                  onClick={() => setActivePanel(null)}
                >
                  <FaTimes size={16} />
                </button>
              </div>
              <div className="flex-1 px-8 py-8 overflow-y-auto flex flex-col gap-6">
                {activePanel === 'text' && (
                  <>
          <div className="control-group">
                      <label>Add Text</label>
              <input
                type="text"
                        placeholder="Enter text..."
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        className="text-input"
                      />
            </div>
          <div className="control-group">
                      <button className="btn btn-primary" onClick={handleAddText}>
                        Add Text
            </button>
          </div>
          {selectedLayer && (
            <>
              <div className="control-group">
                          <label>Edit Selected Text</label>
                <input
                  type="text"
                  value={selectedLayer.text}
                  onChange={(e) => handleStyleChange('text', e.target.value)}
                            className="text-input"
                />
              </div>

              <div className="control-group">
                <label>Font Family</label>
                <select
                  value={selectedLayer.fontFamily}
                  onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                  className="text-input "
                  style={{ fontFamily: selectedLayer.fontFamily }}
                >
                  {fonts.map(font => (
                    <option key={font} value={font} style={{ fontFamily: font }}>
                      {font}
                    </option>
                  ))}
                </select>
              </div>

              <div className="control-group">
                <label>Font Size: {selectedLayer.fontSize}px</label>
                <input
                  type="range"
                  min="8"
                  max="200"
                  value={selectedLayer.fontSize}
                  onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value))}
                  className="font-size-slider"
                />
                <div className="font-size-inputs">
                  <input
                    type="number"
                    min="8"
                    max="200"
                    value={selectedLayer.fontSize}
                    onChange={(e) => handleStyleChange('fontSize', parseInt(e.target.value))}
                    className="font-size-number"
                  />
                </div>
              </div>

              <div className="control-group">
                <label>Font Weight</label>
                <div className="font-weight-buttons">
                  <button
                    className={`weight-btn ${(selectedLayer.fontWeight === '100' || selectedLayer.fontWeight === 100 || selectedLayer.fontWeight === 'thin') ? 'active' : ''}`}
                    onClick={() => handleStyleChange('fontWeight', '100')}
                    style={{ fontWeight: 100 }}
                  >
                    Thin
                  </button>
                  <button
                    className={`weight-btn ${(selectedLayer.fontWeight === '500' || selectedLayer.fontWeight === 500 || selectedLayer.fontWeight === 'medium') ? 'active' : ''}`}
                    onClick={() => handleStyleChange('fontWeight', '500')}
                    style={{ fontWeight: 500 }}
                  >
                    Medium
                  </button>
                  <button
                    className={`weight-btn ${(selectedLayer.fontWeight === '400' || selectedLayer.fontWeight === 400 || selectedLayer.fontWeight === 'normal') ? 'active' : ''}`}
                    onClick={() => handleStyleChange('fontWeight', '400')}
                    style={{ fontWeight: 400 }}
                  >
                    Normal
                  </button>
                  <button
                    className={`weight-btn ${(selectedLayer.fontWeight === '800' || selectedLayer.fontWeight === 800 || selectedLayer.fontWeight === 'extrabold') ? 'active' : ''}`}
                    onClick={() => handleStyleChange('fontWeight', '800')}
                    style={{ fontWeight: 800 }}
                  >
                    Extrabold
                  </button>
                  <button
                    className={`weight-btn ${(selectedLayer.fontWeight === '700' || selectedLayer.fontWeight === 700 || selectedLayer.fontWeight === 'bold') ? 'active' : ''}`}
                    onClick={() => handleStyleChange('fontWeight', '700')}
                    style={{ fontWeight: 700 }}
                  >
                    Bold
                  </button>
                </div>
              </div>

              <div className="control-group">
                          <label>Text Color</label>
                  <input
                    type="color"
                    value={selectedLayer.color}
                    onChange={(e) => handleStyleChange('color', e.target.value)}
                            className="color-input"
                  />
                </div>

              <div className="control-group">
                <label>Text Alignment</label>
                <div className="alignment-buttons">
                  <button
                    className={`align-btn ${selectedLayer.textAlign === 'left' ? 'active' : ''}`}
                    onClick={() => handleStyleChange('textAlign', 'left')}
                    title="Align Left"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <line x1="3" y1="12" x2="15" y2="12"/>
                      <line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                  </button>
                  <button
                    className={`align-btn ${selectedLayer.textAlign === 'center' ? 'active' : ''}`}
                    onClick={() => handleStyleChange('textAlign', 'center')}
                    title="Align Center"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <line x1="9" y1="12" x2="15" y2="12"/>
                      <line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                  </button>
                  <button
                    className={`align-btn ${selectedLayer.textAlign === 'right' ? 'active' : ''}`}
                    onClick={() => handleStyleChange('textAlign', 'right')}
                    title="Align Right"
                  >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <line x1="9" y1="12" x2="21" y2="12"/>
                      <line x1="3" y1="18" x2="21" y2="18"/>
                    </svg>
                  </button>
                </div>
              </div>

              <div className="control-group">
                <label>Default text styles</label>
                <div className="text-style-presets">
                  <div 
                    className="text-style-card"
                    onClick={() => {
                      const newLayer = {
                        id: Date.now(),
                        text: 'Add a heading',
                        x: 100,
                        y: 100,
                        width: 300,
                        height: 80,
                        fontSize: 48,
                        fontFamily: 'Arial',
                        color: '#000000',
                        fontWeight: 'bold',
                        textAlign: 'left',
                        textShadow: 'none',
                        textGlow: 'none',
                        wordArt: 'none',
                        backgroundColor: '',
                        fontStyle: 'normal',
                        textDecoration: 'none'
                      }
                      setTextLayers([...textLayers, newLayer])
                      setSelectedLayer(newLayer)
                    }}
                  >
                    <div className="text-style-preview heading-style">
                      Add a heading
                    </div>
                  </div>
                  
                  <div 
                    className="text-style-card"
                    onClick={() => {
                      const newLayer = {
                        id: Date.now(),
                        text: 'Add a subheading',
                        x: 100,
                        y: 200,
                        width: 300,
                        height: 60,
                        fontSize: 32,
                        fontFamily: 'Arial',
                        color: '#000000',
                        fontWeight: 'bold',
                        textAlign: 'left',
                        textShadow: 'none',
                        textGlow: 'none',
                        wordArt: 'none',
                        backgroundColor: '',
                        fontStyle: 'normal',
                        textDecoration: 'none'
                      }
                      setTextLayers([...textLayers, newLayer])
                      setSelectedLayer(newLayer)
                    }}
                  >
                    <div className="text-style-preview subheading-style">
                      Add a subheading
                    </div>
                  </div>
                  
                  <div 
                    className="text-style-card"
                    onClick={() => {
                      const newLayer = {
                        id: Date.now(),
                        text: 'Add a little bit of body text',
                        x: 100,
                        y: 300,
                        width: 300,
                        height: 40,
                        fontSize: 16,
                        fontFamily: 'Arial',
                        color: '#000000',
                        fontWeight: 'normal',
                        textAlign: 'left',
                        textShadow: 'none',
                        textGlow: 'none',
                        wordArt: 'none',
                        backgroundColor: '',
                        fontStyle: 'normal',
                        textDecoration: 'none'
                      }
                      setTextLayers([...textLayers, newLayer])
                      setSelectedLayer(newLayer)
                    }}
                  >
                    <div className="text-style-preview body-style">
                      Add a little bit of body text
                    </div>
                  </div>
                </div>
              </div>

                        <div className="control-group">
                          <label>Text Shadow</label>
                          <select
                            value={selectedLayer.textShadow || 'none'}
                            onChange={(e) => handleStyleChange('textShadow', e.target.value)}
                            className="text-input"
                          >
                            <option value="none">None</option>
                            <option value="drop">Drop Shadow</option>
                            <option value="soft">Soft Shadow</option>
                            <option value="hard">Hard Shadow</option>
                            <option value="multiple">Multiple Shadows</option>
                          </select>
                        </div>

                        <div className="control-group">
                          <label>Text Glow</label>
                          <select
                            value={selectedLayer.textGlow || 'none'}
                            onChange={(e) => handleStyleChange('textGlow', e.target.value)}
                            className="text-input"
                          >
                            <option value="none">None</option>
                            <option value="subtle">Subtle Glow</option>
                            <option value="medium">Medium Glow</option>
                            <option value="strong">Strong Glow</option>
                            <option value="neon">Neon Glow</option>
                          </select>
                        </div>

                        <div className="control-group">
                          <label>Word Art Styles</label>
                          <select
                            value={selectedLayer.wordArt || 'none'}
                            onChange={(e) => handleStyleChange('wordArt', e.target.value)}
                            className="text-input"
                          >
                            <option value="none">None</option>
                            <option value="gradient">Gradient Fill</option>
                            <option value="outline">Outline</option>
                            <option value="3d">3D Effect</option>
                            <option value="metallic">Metallic</option>
                            <option value="gradient-rainbow">Rainbow Gradient</option>
                          </select>
                        </div>
                        
                        <div className="control-group">
                          <button 
                            className="btn btn-danger" 
                            onClick={() => {
                              const previousLayers = [...textLayers]
                              const previousSelected = selectedLayer
                              
                              const updatedLayers = textLayers.filter(layer => layer.id !== selectedLayer.id)
                              setTextLayers(updatedLayers)
                              setSelectedLayer(null)
                              
                              // Save to history
                              saveToHistory('text_delete', {
                                previousLayers,
                                previousSelected,
                                newLayers: updatedLayers,
                                newSelected: null
                              })
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            Delete Selected Text
                          </button>
                        </div>
                      </>
                    )}
                    </>
                  )}
                  

                {activePanel === 'shapes' && (
                  <>
                    <div className="control-group">
                      <label>Add Shape</label>
                      <div className="shape-buttons flex flex-wrap gap-2">
                        <button
                          className="btn btn-secondary w-10 h-10 flex items-center justify-center rounded-md"
                          onClick={() => handleAddShape('rectangle')}
                          title="Rectangle"
                        >
                          <div className="w-6 h-4 bg-purple-500 rounded-sm" />
                        </button>
                        <button
                          className="btn btn-secondary w-10 h-10 flex items-center justify-center rounded-md"
                          onClick={() => handleAddShape('square')}
                          title="Square"
                        >
                          <div className="w-5 h-5 bg-purple-500 rounded-sm" />
                        </button>
                        <button
                          className="btn btn-secondary w-10 h-10 flex items-center justify-center rounded-md"
                          onClick={() => handleAddShape('circle')}
                          title="Circle"
                        >
                          <div className="w-6 h-6 bg-purple-500 rounded-full" />
                        </button>
                        <button
                          className="btn btn-secondary w-10 h-10 flex items-center justify-center rounded-md"
                          onClick={() => handleAddShape('triangle')}
                          title="Triangle"
                        >
                          <div
                            className="w-0 h-0"
                            style={{
                              borderLeft: '8px solid transparent',
                              borderRight: '8px solid transparent',
                              borderBottom: '14px solid #7c3aed'
                            }}
                          />
                        </button>
                        <button
                          className="btn btn-secondary w-10 h-10 flex items-center justify-center rounded-md"
                          onClick={() => handleAddShape('line')}
                          title="Line"
                        >
                          <div className="w-6 h-0.5 bg-purple-500" />
                        </button>
                        <button
                          className="btn btn-secondary w-10 h-10 flex items-center justify-center rounded-md"
                          onClick={() => handleAddShape('curve')}
                          title="Curve Line"
                        >
                          <div
                            className="w-6 h-4"
                            style={{
                              borderBottom: '3px solid #7c3aed',
                              borderRadius: '9999px'
                            }}
                          />
                        </button>
                      </div>
                    </div>

                    {selectedShape && (
                      <>
                        <div className="control-group">
                          <label>Shape Type</label>
                          <div className="selected-shape-type">{selectedShape.type}</div>
                        </div>

                        {selectedShape.type !== 'line' && (
                          <div className="control-group">
                            <label>Fill Color</label>
                            <input
                              type="color"
                              value={selectedShape.fill || '#ffffff'}
                              onChange={(e) => handleShapeStyleChange('fill', e.target.value)}
                              className="color-input"
                            />
                          </div>
                        )}

                        <div className="control-group">
                          <label>Border Color</label>
                          <input
                            type="color"
                            value={selectedShape.borderColor || '#000000'}
                            onChange={(e) => handleShapeStyleChange('borderColor', e.target.value)}
                            className="color-input"
                          />
                        </div>

                        <div className="control-group">
                          <label>Border Width: {selectedShape.borderWidth || 0}px</label>
                          <input
                            type="range"
                            min="0"
                            max="40"
                            value={selectedShape.borderWidth || 0}
                            onChange={(e) => handleShapeStyleChange('borderWidth', parseInt(e.target.value))}
                            className="text-input"
                          />
                        </div>

                        {selectedShape.type === 'rectangle' && (
                          <div className="control-group">
                            <label>Corner Radius: {selectedShape.borderRadius || 0}px</label>
                            <input
                              type="range"
                              min="0"
                              max={Math.min(selectedShape.width / 2, selectedShape.height / 2)}
                              value={selectedShape.borderRadius || 0}
                              onChange={(e) => handleShapeStyleChange('borderRadius', parseInt(e.target.value))}
                              className="text-input"
                            />
                          </div>
                        )}

                        <div className="control-group">
                          <label>Opacity: {Math.round((selectedShape.opacity ?? 1) * 100)}%</label>
                          <input
                            type="range"
                            min="0.1"
                            max="1"
                            step="0.05"
                            value={selectedShape.opacity ?? 1}
                            onChange={(e) => handleShapeStyleChange('opacity', parseFloat(e.target.value))}
                            className="text-input"
                          />
                        </div>

                        <div className="control-group">
                          <label>Rotation: {selectedShape.rotation || 0}°</label>
                          <input
                            type="range"
                            min="0"
                            max="360"
                            value={selectedShape.rotation || 0}
                            onChange={(e) => handleShapeStyleChange('rotation', parseInt(e.target.value))}
                            className="text-input"
                          />
                        </div>

                        <div className="control-group">
                          <label>Size</label>
                          <div className="size-inputs">
                            <input
                              type="number"
                              min="10"
                              value={Math.round(selectedShape.width)}
                              onChange={(e) => handleShapeStyleChange('width', Math.max(10, parseInt(e.target.value) || 10))}
                              className="text-input"
                            />
                            <span>x</span>
                            <input
                              type="number"
                              min="10"
                              value={Math.round(selectedShape.height)}
                              onChange={(e) => handleShapeStyleChange('height', Math.max(10, parseInt(e.target.value) || 10))}
                              className="text-input"
                            />
                          </div>
                        </div>

                        <div className="control-group">
                          <button className="btn btn-danger" onClick={handleShapeDelete}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            Delete Shape
                          </button>
                        </div>
                      </>
                    )}
                  </>
                )}


                {activePanel === 'overlay' && (
                  <>
                    <div className="control-group">
                      <label>Upload Overlay Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleOverlayImageUpload}
                        className="file-input"
                      />
                    </div>
                    {overlayVisible && overlayImage && (
                      <>
              <div className="control-group">
              <label>Overlay Scale</label>
                      <input
                        type="range"
                min="0.1"
                max="3"
                step="0.1"
                value={overlayScale}
                onChange={(e) => setOverlayScale(parseFloat(e.target.value))}
                className="text-input"
              />
              <span>{Math.round(overlayScale * 100)}%</span>
                </div>
                        <div className="overlay-actions">
                          <button className="btn btn-secondary" onClick={handleOverlayRemove}>
                            Remove Overlay
                          </button>
              </div>
                      </>
                    )}
                    </>
                  )}
                  
                {activePanel === 'image-editor' && (
                  <>
                    <div className="control-group">
                      <label>Filter Presets</label>
                      <div className="preset-filters">
                        <button 
                          className={`preset-btn ${activeFilterPreset === 'none' ? 'active' : ''}`}
                          onClick={() => applyFilterPreset('none')}
                        >
                          None
                        </button>
                        <button 
                          className={`preset-btn ${activeFilterPreset === 'fresco' ? 'active' : ''}`}
                          onClick={() => applyFilterPreset('fresco')}
                        >
                          Fresco
                        </button>
                        <button 
                          className={`preset-btn ${activeFilterPreset === 'belvedere' ? 'active' : ''}`}
                          onClick={() => applyFilterPreset('belvedere')}
                        >
                          Belvedere
                        </button>
                        <button 
                          className={`preset-btn ${activeFilterPreset === 'vintage' ? 'active' : ''}`}
                          onClick={() => applyFilterPreset('vintage')}
                        >
                          Vintage
                        </button>
                        <button 
                          className={`preset-btn ${activeFilterPreset === 'bw' ? 'active' : ''}`}
                          onClick={() => applyFilterPreset('bw')}
                        >
                          BW
                        </button>
                        <button 
                          className={`preset-btn ${activeFilterPreset === 'bright' ? 'active' : ''}`}
                          onClick={() => applyFilterPreset('bright')}
                        >
                          Bright
                        </button>
                        <button 
                          className={`preset-btn ${activeFilterPreset === 'dramatic' ? 'active' : ''}`}
                          onClick={() => applyFilterPreset('dramatic')}
                        >
                          Dramatic
                        </button>
                      </div>
                    </div>

                    <div className="control-group">
                      <label>fx Effects</label>
                      <div className="preset-filters">
                        <button 
                          className={`preset-btn ${activeEffectPreset === 'none' ? 'active' : ''}`}
                          onClick={() => applyEffectPreset('none')}
                        >
                          None
                        </button>
                        <button 
                          className={`preset-btn ${activeEffectPreset === 'shadows' ? 'active' : ''}`}
                          onClick={() => applyEffectPreset('shadows')}
                        >
                          Shadows
                        </button>
                        <button 
                          className={`preset-btn ${activeEffectPreset === 'duotone' ? 'active' : ''}`}
                          onClick={() => applyEffectPreset('duotone')}
                        >
                          Duotone
                        </button>
                        <button 
                          className={`preset-btn ${activeEffectPreset === 'blur' ? 'active' : ''}`}
                          onClick={() => applyEffectPreset('blur')}
                        >
                          Blur
                        </button>
                        <button 
                          className={`preset-btn ${activeEffectPreset === 'glow' ? 'active' : ''}`}
                          onClick={() => applyEffectPreset('glow')}
                        >
                          Glow
                        </button>
                      </div>
                    </div>

                    <div className="control-group">
                      <label>Advanced Filters</label>
                      
                      <div className="filter-control">
                        <label>Brightness: {imageFilters.brightness}%</label>
                    <input
                          type="range"
                          min="0"
                          max="200"
                          value={imageFilters.brightness}
                          onChange={(e) => handleFilterChange('brightness', parseInt(e.target.value))}
                          className="text-input"
                        />
                      </div>

                      <div className="filter-control">
                        <label>Contrast: {imageFilters.contrast}%</label>
                      <input
                          type="range"
                          min="0"
                          max="200"
                          value={imageFilters.contrast}
                          onChange={(e) => handleFilterChange('contrast', parseInt(e.target.value))}
                          className="text-input"
                        />
                      </div>

                      <div className="filter-control">
                        <label>Saturation: {imageFilters.saturation}%</label>
                      <input
                        type="range"
                          min="0"
                          max="200"
                          value={imageFilters.saturation}
                          onChange={(e) => handleFilterChange('saturation', parseInt(e.target.value))}
                          className="text-input"
                        />
              </div>

                      <div className="filter-control">
                        <label>Hue: {imageFilters.hue}Â°</label>
                  <input
                          type="range"
                          min="-180"
                          max="180"
                          value={imageFilters.hue}
                          onChange={(e) => handleFilterChange('hue', parseInt(e.target.value))}
                          className="text-input"
                        />
                      </div>

                      <div className="filter-control">
                        <label>Blur: {imageFilters.blur}px</label>
                  <input
                    type="range"
                    min="0"
                          max="10"
                          step="0.1"
                          value={imageFilters.blur}
                          onChange={(e) => handleFilterChange('blur', parseFloat(e.target.value))}
                          className="text-input"
                        />
                      </div>

                      <div className="filter-control">
                        <label>Sepia: {imageFilters.sepia}%</label>
                  <input
                    type="range"
                          min="0"
                          max="100"
                          value={imageFilters.sepia}
                          onChange={(e) => handleFilterChange('sepia', parseInt(e.target.value))}
                          className="text-input"
                        />
                      </div>

                      <div className="filter-control">
                        <label>Grayscale: {imageFilters.grayscale}%</label>
                  <input
                    type="range"
                          min="0"
                          max="100"
                          value={imageFilters.grayscale}
                          onChange={(e) => handleFilterChange('grayscale', parseInt(e.target.value))}
                          className="text-input"
                  />
                </div>
              </div>

                    <div className="control-group">
                      <label>Crop Target</label>
                      <select
                        value={croppingTarget}
                        onChange={(e) => setCroppingTarget(e.target.value)}
                        className="text-input"
                        disabled={isCropping}
                      >
                        <option value="base">Base Image</option>
                        <option value="overlay">Overlay Image</option>
                      </select>
                    </div>

                    <div className="control-group">
                      <label>Crop Image</label>
                      <div className="action-buttons">
                        <button 
                          className={`btn ${!isCropping ? 'btn-primary' : 'btn-secondary'}`} 
                          onClick={startCropping}
                          disabled={isCropping || (croppingTarget === 'overlay' && !overlayVisible)}
                        >
                          Start Crop
                        </button>
                        {isCropping && (
                          <>
                            <button className="btn btn-success" onClick={applyCrop}>
                              Apply Crop
                            </button>
                            <button className="btn btn-secondary" onClick={cancelCrop}>
                              Cancel
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="control-group">
                      <button className="btn btn-outline" onClick={resetFilters}>
                        Reset All Filters
                      </button>
                    </div>
            </>
          )}

                {activePanel === 'export' && (
          <div className="action-buttons">
                    <button className="btn btn-primary" onClick={handleExport}>
                      Export Image
                    </button>
                    {/* <button className="btn btn-secondary" onClick={() => {
                      const data = {
                        image_url: imageUrl,
                        text_layers: textLayers,
                        shape_layers: shapeLayers
                      }
                      navigator.clipboard.writeText(JSON.stringify(data, null, 2))
                      alert('JSON copied to clipboard!')
                    }}>
                      Copy JSON
            </button> */}
                  </div>
                )}
              </div>
            </div>
          )}
          </div>
        </div>

      {/* Hidden canvas for export */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
    </>
  )
}

export default ImageEdit
