import React, { useState, useRef, useCallback, useEffect } from 'react'

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

function ImageEdit({ onClose, isOpen = true }) {
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
        x: 100,
        y: 100,
        width: 200,
        height: 50,
        fontSize: 24,
        fontFamily: 'Arial',
        color: '#000000',
        fontWeight: 'normal',
        textAlign: 'left',
        textShadow: 'none',
        textGlow: 'none',
        wordArt: 'none'
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

  const handleAddShape = (type) => {
    const baseShape = {
      id: Date.now(),
      type,
      x: 120,
      y: 120,
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
    
    // Text Shadow
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
      setLayerStart({ x: layer.x, y: layer.y, width: layer.width * getImageScale().scaleX, height: layer.height })
    }
  }

  const handleMouseMove = useCallback((e) => {
    if (!isDragging && !isResizing && !isDraggingOverlay && !isResizingOverlay && !isDraggingShape && !isResizingShape) return

    const currentDragStart = isDraggingOverlay || isResizingOverlay ? overlayDragStart : dragStart
    const deltaX = e.clientX - currentDragStart.x
    const deltaY = e.clientY - currentDragStart.y
    const { scaleX, scaleY } = getImageScale()

    if (isDragging && selectedLayer) {
      const newX = layerStart.x + (deltaX / (getImageScale().scaleX || 1))
      const newY = layerStart.y + (deltaY / (getImageScale().scaleY || 1))
      
      const updatedLayers = textLayers.map(layer =>
        layer.id === selectedLayer.id ? { ...layer, x: newX, y: newY } : layer
      )
      setTextLayers(updatedLayers)
      setSelectedLayer({ ...selectedLayer, x: newX, y: newY })
    } else if (isResizing && selectedLayer) {
      const newWidth = Math.max(50, layerStart.width + (deltaX / (getImageScale().scaleX || 1)))
      const newHeight = Math.max(20, layerStart.height + (deltaY / (getImageScale().scaleY || 1)))
      
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
  }, [isDragging, isResizing, isDraggingOverlay, isResizingOverlay, dragStart, layerStart, selectedLayer, textLayers, overlayPosition, overlayScale, overlayDragStart, isDraggingShape, isResizingShape, selectedShape, shapeLayers])

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
      // Convert 0-1 normalized coords to NATURAL image pixels
      const x = element.bounding_box.x * originalWidth
      const y = element.bounding_box.y * originalHeight
      const width = element.bounding_box.width * originalWidth
      const height = element.bounding_box.height * originalHeight
      
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
      const bb = ov?.bounding_box || {}
      
      // Convert bounding box decimals to NATURAL pixels
      const posXNat = (bb.x || 0) * originalWidth
      const posYNat = (bb.y || 0) * originalHeight
      const targetWNat = (bb.width || 0) * originalWidth
      const targetHNat = (bb.height || 0) * originalHeight
      
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
          // Set initial position to top-left corner
          setOverlayPosition({ x: 10, y: 10 })
          setOverlayScale(1)
          
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
            newPosition: { x: 10, y: 10 },
            newScale: 1
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
        // Set initial position to top-left corner
        setOverlayPosition({ x: 10, y: 10 })
        setOverlayScale(1)
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

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="relative w-[90vw] h-[90vh] bg-white rounded-lg shadow-2xl overflow-hidden flex flex-col">
        {/* Close button */}
        {onClose && (
          <button
            onClick={onClose}
            className="absolute top-4 right-4 z-[100] w-10 h-10 flex items-center justify-center bg-white hover:bg-red-50 border-2 border-gray-300 hover:border-red-400 rounded-full transition-all shadow-lg hover:shadow-xl text-gray-700 hover:text-red-600 font-bold text-xl"
            title="Close"
          >
            ×
          </button>
        )}
        <div className="flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="bg-white border-b border-gray-200 px-8 py-4 flex items-center justify-between shadow-sm z-[100] relative">
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-6">
                <h1 className="text-xl font-semibold text-gray-800">Reel Report Image Editor</h1>
                <p className="text-sm text-gray-600">Image Text Editor</p>
              </div>
              <div className="flex items-center gap-4">
                <div className="text-sm text-gray-600">{textLayers.length} text layers</div>
                {onClose && (
                  <button
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-100 hover:bg-red-50 border border-gray-300 hover:border-red-400 rounded-lg text-sm font-medium text-gray-700 hover:text-red-600 transition-all"
                    title="Close Editor"
                  >
                    Close
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Main App Container */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Main Workspace */}
            <div className="flex flex-1 overflow-hidden">
              {/* Right Sidebar (Main Navigation for Flyouts) */}
              <div className="w-[60px] bg-white border-r border-gray-200 flex flex-col overflow-hidden shadow-sm relative min-h-screen">
                <div className="flex-1 overflow-y-auto p-4">
                  {/* Undo/Redo Controls */}
                  <div className="mb-2">
                    <div className="flex gap-1 justify-center p-1">
                  <button 
                    className={`w-8 h-8 p-0 flex items-center justify-center rounded-md transition-all hover:bg-purple-600 hover:text-white hover:-translate-y-0.5 ${historyIndex < 0 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    onClick={undo}
                    disabled={historyIndex < 0}
                    title="Undo (Ctrl+Z)"
                  >
                    <Icon name="undo" size={16} />
                  </button>
                  <button 
                    className={`w-8 h-8 p-0 flex items-center justify-center rounded-md transition-all hover:bg-purple-600 hover:text-white hover:-translate-y-0.5 ${historyIndex >= history.length - 1 ? 'opacity-40 cursor-not-allowed' : ''}`}
                    onClick={redo}
                    disabled={historyIndex >= history.length - 1}
                    title="Redo (Ctrl+Y)"
                  >
                    <Icon name="redo" size={16} />
                  </button>
                </div>
              </div>

              {/* Import Panel */}
              <div className="mb-6">
                <div className={`flex items-center justify-center p-4 cursor-pointer border-b border-gray-200 mb-2 transition-colors hover:bg-gray-100 ${activePanel === 'import' ? 'bg-purple-600' : ''}`} onClick={() => togglePanel('import')}>
                  <div className={`w-6 h-6 flex items-center justify-center transition-colors ${activePanel === 'import' ? 'text-white' : 'text-gray-600 hover:text-purple-600'}`}>
                    <Icon name="folder" />
                </div>
                </div>
              </div>

                  {/* Text Tools Panel */}
                  <div className="mb-6">
                    <div className={`flex items-center justify-center p-4 cursor-pointer border-b border-gray-200 mb-2 transition-colors hover:bg-gray-100 ${activePanel === 'text' ? 'bg-purple-600' : ''}`} onClick={() => togglePanel('text')}>
                      <div className={`w-6 h-6 flex items-center justify-center transition-colors ${activePanel === 'text' ? 'text-white' : 'text-gray-600 hover:text-purple-600'}`}>
                        <Icon name="edit" />
                      </div>
                    </div>
                  </div>

                  {/* Shapes Panel */}
                  <div className="mb-6">
                    <div className={`flex items-center justify-center p-4 cursor-pointer border-b border-gray-200 mb-2 transition-colors hover:bg-gray-100 ${activePanel === 'shapes' ? 'bg-purple-600' : ''}`} onClick={() => togglePanel('shapes')}>
                      <div className={`w-6 h-6 flex items-center justify-center transition-colors ${activePanel === 'shapes' ? 'text-white' : 'text-gray-600 hover:text-purple-600'}`}>
                        <Icon name="shape" />
                      </div>
                    </div>
                  </div>

                  {/* Overlay Images Panel */}
                  <div className="mb-6">
                    <div className={`flex items-center justify-center p-4 cursor-pointer border-b border-gray-200 mb-2 transition-colors hover:bg-gray-100 ${activePanel === 'overlay' ? 'bg-purple-600' : ''}`} onClick={() => togglePanel('overlay')}>
                      <div className={`w-6 h-6 flex items-center justify-center transition-colors ${activePanel === 'overlay' ? 'text-white' : 'text-gray-600 hover:text-purple-600'}`}>
                        <Icon name="image" />
                      </div>
                    </div>
                  </div>

                  {/* Image Editor Panel */}
                  <div className="mb-6">
                    <div className={`flex items-center justify-center p-4 cursor-pointer border-b border-gray-200 mb-2 transition-colors hover:bg-gray-100 ${activePanel === 'image-editor' ? 'bg-purple-600' : ''}`} onClick={() => togglePanel('image-editor')}>
                      <div className={`w-6 h-6 flex items-center justify-center transition-colors ${activePanel === 'image-editor' ? 'text-white' : 'text-gray-600 hover:text-purple-600'}`}>
                        <Icon name="crop" />
                      </div>
                    </div>
                  </div>

                  {/* Export & Actions Panel */}
                  <div className="mb-6">
                    <div className={`flex items-center justify-center p-4 cursor-pointer border-b border-gray-200 mb-2 transition-colors hover:bg-gray-100 ${activePanel === 'export' ? 'bg-purple-600' : ''}`} onClick={() => togglePanel('export')}>
                      <div className={`w-6 h-6 flex items-center justify-center transition-colors ${activePanel === 'export' ? 'text-white' : 'text-gray-600 hover:text-purple-600'}`}>
                        <Icon name="save" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Flyout Panel */}
            {activePanel && (
              <div className={`absolute top-0 left-[60px] w-[380px] h-full bg-gradient-to-b from-white to-gray-50 shadow-[0_0_30px_rgba(0,0,0,0.15)] z-10 flex flex-col ${activePanel ? 'translate-x-0' : 'translate-x-full'} transition-transform duration-300 border-l border-gray-200 overflow-hidden`}>
              <div className="p-8 pb-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-br from-white to-gray-50 relative">
                <h3 className="m-0 text-xl font-extrabold text-gray-800 uppercase tracking-wide">{activePanel.charAt(0).toUpperCase() + activePanel.slice(1)}</h3>
                <button className="absolute top-6 right-6 w-8 h-8 border-none bg-gray-200 text-gray-600 rounded-full cursor-pointer flex items-center justify-center transition-all text-base hover:bg-red-500 hover:text-white hover:scale-110" onClick={() => setActivePanel(null)}>×</button>
              </div>
              <div className="flex-1 p-8 overflow-y-auto flex flex-col gap-6">
                {activePanel === 'import' && (
                  <>
          <div className="mb-8 relative">
                      <label className="block mb-4 font-bold text-gray-800 text-sm uppercase tracking-wide relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-5 after:h-0.5 after:bg-gradient-to-r after:from-purple-600 after:to-purple-400 after:rounded">Load Image</label>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageLoad}
                        className="w-full p-2 px-4 border-2 border-gray-200 rounded-lg text-sm font-medium bg-gray-50 text-gray-700 transition-all shadow-sm focus:outline-none focus:border-purple-600 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] focus:-translate-y-0.5 hover:border-gray-300 hover:bg-gray-100 cursor-pointer"
                      />
                    </div>
                    <div className="mb-8 relative">
                      <label className="block mb-4 font-bold text-gray-800 text-sm uppercase tracking-wide relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-5 after:h-0.5 after:bg-gradient-to-r after:from-purple-600 after:to-purple-400 after:rounded">Or Enter Image URL</label>
                      <input
                        type="url"
                        placeholder="https://example.com/image.jpg"
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white text-gray-700 transition-all shadow-sm focus:outline-none focus:border-purple-600 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] focus:-translate-y-0.5 hover:border-gray-300 mb-2"
                      />
                      <button className="w-full px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center gap-2 no-underline whitespace-nowrap relative overflow-hidden min-h-[40px] tracking-wide bg-gradient-to-br from-purple-600 to-purple-400 text-white shadow-[0_4px_14px_0_rgba(124,58,237,0.3)] hover:bg-gradient-to-br hover:from-purple-700 hover:to-purple-600 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_0_rgba(124,58,237,0.4)] active:translate-y-0 active:shadow-[0_4px_14px_0_rgba(124,58,237,0.3)]" onClick={handleImageUrlLoad}>
                        Load Image
                      </button>
                    </div>
                    <div className="mb-8 relative">
                    <label className="block mb-4 font-bold text-gray-800 text-sm uppercase tracking-wide relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-5 after:h-0.5 after:bg-gradient-to-r after:from-purple-600 after:to-purple-400 after:rounded">Load from JSON</label>
                    <textarea
                      placeholder="Paste JSON data here (supports both old and new template format)..."
                      value={jsonInput}
                      onChange={(e) => setJsonInput(e.target.value)}
                      rows="6"
                      className="w-full p-4 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white text-gray-700 transition-all shadow-sm focus:outline-none focus:border-purple-600 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] focus:-translate-y-0.5 hover:border-gray-300 font-mono resize-y min-h-[120px] mb-2"
                    />
                    <button className="w-full px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center gap-2 no-underline whitespace-nowrap relative overflow-hidden min-h-[40px] tracking-wide bg-gradient-to-br from-purple-600 to-purple-400 text-white shadow-[0_4px_14px_0_rgba(124,58,237,0.3)] hover:bg-gradient-to-br hover:from-purple-700 hover:to-purple-600 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_0_rgba(124,58,237,0.4)] active:translate-y-0 active:shadow-[0_4px_14px_0_rgba(124,58,237,0.3)] mb-2" onClick={handleTemplateJsonLoad}>
                      Load Template JSON
                    </button>
                    <button className="w-full px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center gap-2 no-underline whitespace-nowrap relative overflow-hidden min-h-[40px] tracking-wide bg-white text-gray-700 border-2 border-gray-200 shadow-sm hover:bg-gray-50 hover:border-purple-600 hover:text-purple-600 hover:-translate-y-0.5 hover:shadow-md active:translate-y-0" onClick={handleJsonLoad}>
                      Load Old Format JSON
                    </button>
                  </div>
                  </>
                )}

                {activePanel === 'text' && (
                  <>
          <div className="mb-8 relative">
                      <label className="block mb-4 font-bold text-gray-800 text-sm uppercase tracking-wide relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-5 after:h-0.5 after:bg-gradient-to-r after:from-purple-600 after:to-purple-400 after:rounded">Add Text</label>
              <input
                type="text"
                        placeholder="Enter text..."
                        value={newText}
                        onChange={(e) => setNewText(e.target.value)}
                        className="w-full p-4 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white text-gray-700 transition-all shadow-sm focus:outline-none focus:border-purple-600 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] focus:-translate-y-0.5 hover:border-gray-300"
                      />
            </div>
          <div className="mb-8 relative">
                      <button className="w-full px-6 py-2 rounded-lg text-sm font-semibold cursor-pointer transition-all inline-flex items-center justify-center gap-2 no-underline whitespace-nowrap relative overflow-hidden min-h-[40px] tracking-wide bg-gradient-to-br from-purple-600 to-purple-400 text-white shadow-[0_4px_14px_0_rgba(124,58,237,0.3)] hover:bg-gradient-to-br hover:from-purple-700 hover:to-purple-600 hover:-translate-y-0.5 hover:shadow-[0_8px_25px_0_rgba(124,58,237,0.4)] active:translate-y-0 active:shadow-[0_4px_14px_0_rgba(124,58,237,0.3)]" onClick={handleAddText}>
                        Add Text
            </button>
          </div>
          {selectedLayer && (
            <>
              <div className="mb-8 relative">
                          <label className="block mb-4 font-bold text-gray-800 text-sm uppercase tracking-wide relative after:content-[''] after:absolute after:-bottom-1 after:left-0 after:w-5 after:h-0.5 after:bg-gradient-to-r after:from-purple-600 after:to-purple-400 after:rounded">Edit Selected Text</label>
                <input
                  type="text"
                  value={selectedLayer.text}
                  onChange={(e) => handleStyleChange('text', e.target.value)}
                            className="w-full p-4 border-2 border-gray-200 rounded-lg text-sm font-medium bg-white text-gray-700 transition-all shadow-sm focus:outline-none focus:border-purple-600 focus:shadow-[0_0_0_3px_rgba(124,58,237,0.1)] focus:-translate-y-0.5 hover:border-gray-300"
                />
              </div>

              <div className="control-group">
                <label>Font Family</label>
                <select
                  value={selectedLayer.fontFamily}
                  onChange={(e) => handleStyleChange('fontFamily', e.target.value)}
                  className="text-input font-dropdown"
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
                    className={`weight-btn ${selectedLayer.fontWeight === 'normal' ? 'active' : ''}`}
                    onClick={() => handleStyleChange('fontWeight', 'normal')}
                  >
                    Normal
                  </button>
                  <button
                    className={`weight-btn ${selectedLayer.fontWeight === 'bold' ? 'active' : ''}`}
                    onClick={() => handleStyleChange('fontWeight', 'bold')}
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
                        wordArt: 'none'
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
                        wordArt: 'none'
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
                        wordArt: 'none'
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
                      <div className="shape-buttons">
                        <button className="btn btn-secondary" onClick={() => handleAddShape('rectangle')}>
                          Rectangle
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleAddShape('circle')}>
                          Circle
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleAddShape('triangle')}>
                          Triangle
                        </button>
                        <button className="btn btn-secondary" onClick={() => handleAddShape('line')}>
                          Line
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
                    <div className="control-group">
                      <label>Or Enter Image URL</label>
                      <input
                        type="url"
                        placeholder="https://example.com/overlay.png"
                        value={overlayImageUrl}
                        onChange={(e) => setOverlayImageUrl(e.target.value)}
                        className="text-input"
                      />
                      <button className="btn btn-primary" onClick={handleOverlayImageUrlLoad}>
                        Load Overlay
                      </button>
                      <button className="btn btn-secondary" onClick={() => {
                        // Test with a simple image
                        setOverlayImageUrl('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjEwMCIgZmlsbD0iIzAwZmYwMCIvPjx0ZXh0IHg9IjUwIiB5PSI1NSIgZm9udC1mYW1pbHk9IkFyaWFsIiBmb250LXNpemU9IjE0IiBmaWxsPSJ3aGl0ZSIgdGV4dC1hbmNob3I9Im1pZGRsZSI+T1ZFUkxBWTx0ZXh0Pjwvc3ZnPg==')
                        handleOverlayImageUrlLoad()
                      }}>
                        Test Overlay
                      </button>
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
                    <button className="btn btn-secondary" onClick={() => {
                      const data = {
                        image_url: imageUrl,
                        text_layers: textLayers,
                        shape_layers: shapeLayers
                      }
                      navigator.clipboard.writeText(JSON.stringify(data, null, 2))
                      alert('JSON copied to clipboard!')
                    }}>
                      Copy JSON
            </button>
                  </div>
                )}
              </div>
              </div>
            )}
          </div>

          {/* Editor Section */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1 bg-white m-4 rounded-lg p-6 shadow-lg relative overflow-hidden flex items-center justify-center">
              {imageLoaded ? (
                <div className="relative border-2 border-gray-200 bg-gray-50 cursor-crosshair inline-block rounded-md overflow-hidden">
                  <img
                  ref={imageRef}
                  src={imageUrl}
                  alt="Loaded"
                  style={{ 
                    maxWidth: '100%', 
                    height: 'auto',
                    filter: applyFiltersToImage()
                  }}
                  onLoad={() => setImageLoaded(true)}
                />
                {isCropping && (
                  <div
                    className="absolute border-2 border-purple-600 bg-purple-600/10 cursor-move z-[1001] pointer-events-all"
                    style={{ left: cropArea.x, top: cropArea.y, width: cropArea.width, height: cropArea.height }}
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
                <div className="relative">
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
                      zIndex: 50
                    }

                    const innerStyle = {
                      width: '100%',
                      height: '100%',
                      pointerEvents: 'none'
                    }

                    if (shape.type === 'rectangle') {
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
                    }

                    return (
                      <div
                        key={shape.id}
                        className="absolute cursor-move select-none"
                        style={wrapperStyle}
                        onClick={() => handleShapeClick(shape)}
                        onMouseDown={(e) => handleShapeMouseDown(e, shape.id, 'drag')}
                      >
                        <div style={innerStyle} />
                        {selectedShape?.id === shape.id && (
                          <div
                            className="absolute w-3 h-3 bg-purple-600 border-2 border-white rounded-full cursor-nwse-resize -right-1.5 -bottom-1.5 z-10 shadow-sm"
                            onMouseDown={(e) => handleShapeMouseDown(e, shape.id, 'resize')}
                          />
                        )}
                      </div>
                    )
                  })}
                  {textLayers.map((layer) => {
                    return (
                      <div
  key={layer.id}
  className={`absolute cursor-move select-none p-0 m-0 border-2 transition-colors z-[2] rounded-sm ${selectedLayer?.id === layer.id ? 'border-purple-600 shadow-[0_0_0_1px_#7c3aed] bg-purple-600/10' : 'border-transparent'}`}
  style={{
    left: layer.x * getImageScale().scaleX,
    top: layer.y * getImageScale().scaleY,
    width: layer.width * getImageScale().scaleX,
    height: layer.height * getImageScale().scaleY,
    padding: '4px',
  }}
  onClick={() => handleLayerClick(layer)}
  onMouseDown={(e) => handleMouseDown(e, layer.id, 'drag')}
>
  {layer.overlayImage?.enabled && layer.overlayImage?.imageUrl ? (
    <img
      src={layer.overlayImage.imageUrl}
      alt="Overlay"
      style={{
        width: '100%',
        height: '100%',
        objectFit: layer.overlayImage.fitMode || 'contain',
        objectPosition: 'center',
        pointerEvents: 'none'
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
        textAlign: layer.textAlign,
        ...getTextEffectStyles(layer),
        ...getWordArtStyles(layer)
      }}
    >
      {layer.text}
    </div>
  )}
  {selectedLayer?.id === layer.id && (
    <div
      className="absolute w-3 h-3 bg-purple-600 border-2 border-white rounded-full cursor-nwse-resize -right-1.5 -bottom-1.5 z-10 shadow-sm"
      onMouseDown={(e) => handleMouseDown(e, layer.id, 'resize')}
    />
  )}
</div>
                    )
                  })}
      </div>
                
                {/* Overlay Image */}
                {overlayVisible && overlayImage && (
                  <div
                    className="pointer-events-auto"
                    style={{
                      position: 'absolute',
                      left: overlayPosition.x,
                      top: overlayPosition.y,
                      transform: `scale(${overlayScale})`,
                      transformOrigin: 'top left',
                      zIndex: 1000,
                      cursor: 'move'
                    }}
                    onMouseDown={(e) => handleOverlayMouseDown(e, 'drag')}
                  >
                    <img
                      src={overlayImageUrl}
                      alt="Overlay"
                      draggable="false"
                      style={{
                        width: overlayImage.width,
                        height: overlayImage.height,
                        display: 'block',
                        }}
                    />
                    <div
                      className="absolute bottom-0 right-0 w-5 h-5 bg-purple-600 cursor-nwse-resize rounded-bl-lg"
                      onMouseDown={(e) => handleOverlayMouseDown(e, 'resize')}
                    />
                    {isCropping && croppingTarget === 'overlay' && (
                      <div
                        className="absolute border-2 border-purple-600 bg-purple-600/10 cursor-move z-[1001] pointer-events-all"
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
                )}
              </div>
            ) : (
              <div className="text-center p-12 text-gray-500">
                <Icon name="image" size={48} />
                <h3 className="mb-4 text-purple-600 text-xl">Load an Image to Get Started</h3>
                <p className="text-sm">Enter an image URL above and click 'Load Image'</p>
              </div>
            )}
            </div>
          </div>

          {/* Hidden canvas for export */}
          <canvas ref={canvasRef} style={{ display: 'none' }} />
        </div>
      </div>
    </div>
  )
}

export default ImageEdit


