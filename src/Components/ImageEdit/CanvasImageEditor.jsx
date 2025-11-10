import React, { useState, useRef, useCallback, useEffect } from 'react'
import { X, Move, Crop, ZoomIn, ZoomOut, RotateCw, Save, Undo, Redo, FlipHorizontal, FlipVertical, Maximize2 } from 'lucide-react'

const CanvasImageEditor = ({ imageUrl, isOpen, onClose, onSave, templateName, templateAspect }) => {
  console.log('🎨 CanvasImageEditor component rendered/re-rendered')
  console.log('Props received:', { 
    imageUrl: imageUrl ? imageUrl.substring(0, 100) + '...' : 'null/undefined',
    isOpen, 
    hasOnClose: !!onClose, 
    hasOnSave: !!onSave,
    templateName,
    templateAspect
  })
  
  // Canvas and image refs
  const canvasRef = useRef(null)
  const containerRef = useRef(null)
  const imageRef = useRef(null)
  
  // Image state
  const [image, setImage] = useState(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageError, setImageError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  
  // Transform state
  const [scale, setScale] = useState(1)
  const [stretchX, setStretchX] = useState(1)
  const [stretchY, setStretchY] = useState(1)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [rotation, setRotation] = useState(0)
  const [flipHorizontal, setFlipHorizontal] = useState(false)
  const [flipVertical, setFlipVertical] = useState(false)
  
  // Canvas dimensions based on image aspect ratio
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 450 })
  
  // Interaction state
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [positionStart, setPositionStart] = useState({ x: 0, y: 0 })
  
  // Crop state
  const [isCropping, setIsCropping] = useState(false)
  const [cropArea, setCropArea] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [cropDragMode, setCropDragMode] = useState(null)
  const [cropStart, setCropStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  
  // Tool state
  const [activeTool, setActiveTool] = useState('move')
  
  // History for undo/redo
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [hasPositionedInitial, setHasPositionedInitial] = useState(false)

  const parseAspectValue = useCallback(() => {
    if (typeof templateAspect === 'string' && templateAspect.trim()) {
      const normalized = templateAspect.trim().replace(/[xX]/g, ':').replace(/\s+/g, '')
      const match = normalized.match(/^(\d+(?:\.\d+)?):(\d+(?:\.\d+)?)$/)
      if (match) {
        const w = parseFloat(match[1])
        const h = parseFloat(match[2])
        if (w > 0 && h > 0) return w / h
      }
    }
    if (image && image.width && image.height) {
      return image.width / image.height
    }
    return 16 / 9
  }, [templateAspect, image])

  const computeCanvasSize = useCallback(() => {
    const ratio = parseAspectValue()
    const maxWidth = Math.min(window.innerWidth * 0.7, 1100)
    const maxHeight = Math.min(window.innerHeight * 0.75, 750)
    let width = maxWidth
    let height = width / ratio
    if (height > maxHeight) {
      height = maxHeight
      width = height * ratio
    }
    return { width: Math.round(Math.max(width, 50)), height: Math.round(Math.max(height, 50)) }
  }, [parseAspectValue])

  useEffect(() => {
    if (!isOpen) return
    const handleResize = () => {
      setCanvasSize(prev => {
        const next = computeCanvasSize()
        if (prev.width === next.width && prev.height === next.height) return prev
        return next
      })
    }
    handleResize()
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [isOpen, computeCanvasSize])

  useEffect(() => {
    if (isOpen) {
      setHasPositionedInitial(false)
    }
  }, [isOpen, canvasSize.width, canvasSize.height])

  useEffect(() => {
    if (!isOpen) return
    setScale(1)
    setStretchX(1)
    setStretchY(1)
    setRotation(0)
    setFlipHorizontal(false)
    setFlipVertical(false)
    setPosition({ x: 0, y: 0 })
    setHasPositionedInitial(false)
  }, [isOpen, imageUrl])

  // Save to history function
  const centerImage = useCallback((options = {}) => {
    const targetImage = options.image || image
    if (!targetImage) return
    const nextScale = options.scale ?? scale
    const nextStretchX = options.stretchX ?? stretchX
    const nextStretchY = options.stretchY ?? stretchY
    const displayWidth = targetImage.width * nextScale * nextStretchX
    const displayHeight = targetImage.height * nextScale * nextStretchY
    const newPosition = {
      x: (canvasSize.width - displayWidth) / 2,
      y: (canvasSize.height - displayHeight) / 2
    }
    setPosition(newPosition)
    return newPosition
  }, [image, scale, stretchX, stretchY, canvasSize])

  const saveToHistory = useCallback((override = {}) => {
    const state = {
      scale: override.scale ?? scale,
      stretchX: override.stretchX ?? stretchX,
      stretchY: override.stretchY ?? stretchY,
      position: override.position ? { ...override.position } : { ...position },
      rotation: override.rotation ?? rotation,
      flipHorizontal: override.flipHorizontal ?? flipHorizontal,
      flipVertical: override.flipVertical ?? flipVertical,
      timestamp: Date.now()
    }
    
    setHistory(prev => {
      const newHistory = prev.slice(0, historyIndex + 1)
      newHistory.push(state)
      if (newHistory.length > 50) newHistory.shift()
      return newHistory
    })
    setHistoryIndex(prev => Math.min(prev + 1, 49))
  }, [scale, stretchX, stretchY, position, rotation, flipHorizontal, flipVertical, historyIndex])

  const resetTransforms = useCallback(() => {
    const targetImage = imageRef.current || image
    setScale(1)
    setStretchX(1)
    setStretchY(1)
    setRotation(0)
    setFlipHorizontal(false)
    setFlipVertical(false)
    const newPos = centerImage({ scale: 1, stretchX: 1, stretchY: 1, image: targetImage })
    setHasPositionedInitial(true)
    saveToHistory({
      scale: 1,
      stretchX: 1,
      stretchY: 1,
      rotation: 0,
      flipHorizontal: false,
      flipVertical: false,
      position: newPos || { x: 0, y: 0 }
    })
  }, [centerImage, image, saveToHistory])

  const handleStretchChange = useCallback((axis, percentValue) => {
    if (!imageLoaded) return
    const normalized = Math.max(0.5, Math.min(2, percentValue / 100))
    const nextStretchX = axis === 'x' ? normalized : stretchX
    const nextStretchY = axis === 'y' ? normalized : stretchY
    if (axis === 'x') {
      setStretchX(normalized)
    } else {
      setStretchY(normalized)
    }
    const newPos = centerImage({ stretchX: nextStretchX, stretchY: nextStretchY })
    if (newPos) setPosition(newPos)
    saveToHistory({
      stretchX: nextStretchX,
      stretchY: nextStretchY,
      position: newPos || position
    })
  }, [imageLoaded, stretchX, stretchY, centerImage, saveToHistory, position])

  // Load image when component opens
  useEffect(() => {
    console.log('=== CANVAS EDITOR: useEffect triggered ===')
    console.log('isOpen:', isOpen)
    console.log('imageUrl:', imageUrl ? imageUrl.substring(0, 150) + '...' : 'null/undefined')
    
    if (!isOpen) {
      console.log('Editor not open, skipping load')
      return
    }
    
    if (!imageUrl || imageUrl.trim() === '') {
      console.error('❌ No image URL provided')
      setImageError('No image URL provided')
      setIsLoading(false)
      setImageLoaded(false)
      return
    }
    
    console.log('=== CANVAS EDITOR: Starting image load ===')
    console.log('URL length:', imageUrl.length)
    console.log('URL type:', 
      imageUrl.startsWith('data:image') ? 'Data URL (image)' :
      imageUrl.startsWith('data:') ? 'Data URL (other)' :
      imageUrl.startsWith('blob:') ? 'Blob URL' :
      imageUrl.startsWith('http://') ? 'HTTP URL' :
      imageUrl.startsWith('https://') ? 'HTTPS URL' :
      imageUrl.startsWith('/') ? 'Relative URL' :
      'Unknown'
    )
    
    setIsLoading(true)
    setImageError(null)
    setImageLoaded(false)
    
    const loadImage = () => {
      console.log('Creating new Image object...')
      const img = new Image()
      
      // For data URLs and blob URLs, no crossOrigin needed
      if (!imageUrl.startsWith('data:') && !imageUrl.startsWith('blob:')) {
        console.log('Setting crossOrigin for external URL')
        img.crossOrigin = 'anonymous'
      } else {
        console.log('Data/Blob URL detected, no crossOrigin needed')
      }
      
      img.onload = () => {
        console.log('✅✅✅ Image onload fired!')
        console.log('Image dimensions:', img.width, 'x', img.height)
        console.log('Image naturalWidth:', img.naturalWidth)
        console.log('Image naturalHeight:', img.naturalHeight)
        
        setImage(img)
        imageRef.current = img
        setIsLoading(false)
        setImageError(null)
        setImageLoaded(true)
      }
      
      img.onerror = (error) => {
        console.error('❌❌❌ Image onerror fired!')
        console.error('Error object:', error)
        console.error('Image src that failed:', img.src ? img.src.substring(0, 150) : 'no src')
        setImageError('Failed to load image. The image URL may be invalid or inaccessible.')
        setIsLoading(false)
        setImageLoaded(false)
      }
      
      console.log('Setting image src...')
      try {
        img.src = imageUrl
        console.log('Image src set successfully')
        console.log('Image complete:', img.complete)
        console.log('Image naturalWidth:', img.naturalWidth)
        
        // For some browsers, if image is cached, onload might not fire
        // Check if it's already loaded
        if (img.complete && img.naturalWidth > 0) {
          console.log('⚡ Image already loaded from cache!')
          img.onload()
        }
      } catch (error) {
        console.error('❌ Error setting image src:', error)
        setImageError('Invalid image URL: ' + error.message)
        setIsLoading(false)
      }
    }
    
    // Add a small delay to ensure state updates are processed
    setTimeout(() => {
      loadImage()
    }, 100)
  }, [isOpen, imageUrl])

  // Draw canvas whenever state changes
  useEffect(() => {
    if (imageLoaded && image && canvasRef.current) {
      drawCanvas()
    }
  }, [imageLoaded, image, scale, position, rotation, flipHorizontal, flipVertical, isCropping, cropArea, canvasSize])

  useEffect(() => {
    if (!imageLoaded || !image || hasPositionedInitial) return
    centerImage()
    setHasPositionedInitial(true)
  }, [imageLoaded, image, centerImage, hasPositionedInitial])

  const drawCanvas = () => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    
    if (!canvas || !ctx || !image) return

    canvas.width = canvasSize.width
    canvas.height = canvasSize.height

    // Fill with white background
    ctx.fillStyle = '#FFFFFF'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    
    ctx.save()
    
    const displayWidth = image.width * scale * stretchX
    const displayHeight = image.height * scale * stretchY
    const centerX = position.x + displayWidth / 2
    const centerY = position.y + displayHeight / 2
    
    ctx.translate(centerX, centerY)
    ctx.rotate((rotation * Math.PI) / 180)
    
    const scaleX = (flipHorizontal ? -1 : 1) * scale * stretchX
    const scaleY = (flipVertical ? -1 : 1) * scale * stretchY
    ctx.scale(scaleX, scaleY)
    
    ctx.translate(-image.width / 2, -image.height / 2)
    ctx.drawImage(image, 0, 0, image.width, image.height)
    
    if (!isCropping) {
      ctx.strokeStyle = 'rgba(99, 102, 241, 0.9)'
      ctx.lineWidth = 2
      ctx.setLineDash([10, 6])
      ctx.strokeRect(0, 0, image.width, image.height)
      ctx.setLineDash([])
    }
    
    ctx.restore()
    
    if (isCropping) {
      drawCropOverlay(ctx)
    }
  }

  const drawCropOverlay = (ctx) => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Darken area outside crop
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)'
    ctx.fillRect(0, 0, canvas.width, cropArea.y)
    ctx.fillRect(0, cropArea.y + cropArea.height, canvas.width, canvas.height - (cropArea.y + cropArea.height))
    ctx.fillRect(0, cropArea.y, cropArea.x, cropArea.height)
    ctx.fillRect(cropArea.x + cropArea.width, cropArea.y, canvas.width - (cropArea.x + cropArea.width), cropArea.height)
    
    // Draw crop box border
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 2
    ctx.strokeRect(cropArea.x, cropArea.y, cropArea.width, cropArea.height)
    
    // Draw corner handles
    const handleSize = 10
    const handles = [
      { x: cropArea.x, y: cropArea.y },
      { x: cropArea.x + cropArea.width, y: cropArea.y },
      { x: cropArea.x, y: cropArea.y + cropArea.height },
      { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height },
    ]
    
    ctx.fillStyle = '#3b82f6'
    handles.forEach(handle => {
      ctx.fillRect(handle.x - handleSize / 2, handle.y - handleSize / 2, handleSize, handleSize)
    })
  }

  const undo = () => {
    if (historyIndex <= 0) return
    const prevState = history[historyIndex - 1]
    setScale(prevState.scale)
     setStretchX(prevState.stretchX || 1)
     setStretchY(prevState.stretchY || 1)
    setPosition(prevState.position)
    setRotation(prevState.rotation)
    setFlipHorizontal(prevState.flipHorizontal || false)
    setFlipVertical(prevState.flipVertical || false)
    setHistoryIndex(historyIndex - 1)
  }

  const redo = () => {
    if (historyIndex >= history.length - 1) return
    const nextState = history[historyIndex + 1]
    setScale(nextState.scale)
     setStretchX(nextState.stretchX || 1)
     setStretchY(nextState.stretchY || 1)
    setPosition(nextState.position)
    setRotation(nextState.rotation)
    setFlipHorizontal(nextState.flipHorizontal || false)
    setFlipVertical(nextState.flipVertical || false)
    setHistoryIndex(historyIndex + 1)
  }

  // Mouse event handlers
  const handleMouseDown = (e) => {
    if (!imageLoaded) return
    
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top

    if (isCropping) {
      const handleSize = 10
      const handles = {
        nw: { x: cropArea.x, y: cropArea.y },
        ne: { x: cropArea.x + cropArea.width, y: cropArea.y },
        sw: { x: cropArea.x, y: cropArea.y + cropArea.height },
        se: { x: cropArea.x + cropArea.width, y: cropArea.y + cropArea.height },
      }
      
      let mode = null
      for (const [key, handle] of Object.entries(handles)) {
        if (Math.abs(x - handle.x) < handleSize && Math.abs(y - handle.y) < handleSize) {
          mode = key
          break
        }
      }
      
      if (!mode && x >= cropArea.x && x <= cropArea.x + cropArea.width &&
          y >= cropArea.y && y <= cropArea.y + cropArea.height) {
        mode = 'move'
      }
      
      if (mode) {
        setCropDragMode(mode)
        setDragStart({ x, y })
        setCropStart({ ...cropArea })
      }
    } else if (activeTool === 'move') {
      setIsDragging(true)
      setDragStart({ x, y })
      setPositionStart({ ...position })
    }
  }

  const handleMouseMove = useCallback((e) => {
    if (!isDragging && !cropDragMode) return

    const rect = canvasRef.current?.getBoundingClientRect()
    if (!rect) return
    
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    const dx = x - dragStart.x
    const dy = y - dragStart.y

    if (isDragging) {
      setPosition({
        x: positionStart.x + dx,
        y: positionStart.y + dy
      })
    } else if (cropDragMode) {
      const minSize = 50
      let newCrop = { ...cropStart }
      
      switch (cropDragMode) {
        case 'move':
          newCrop.x = cropStart.x + dx
          newCrop.y = cropStart.y + dy
          break
        case 'nw':
          newCrop.x = cropStart.x + dx
          newCrop.y = cropStart.y + dy
          newCrop.width = cropStart.width - dx
          newCrop.height = cropStart.height - dy
          break
        case 'ne':
          newCrop.y = cropStart.y + dy
          newCrop.width = cropStart.width + dx
          newCrop.height = cropStart.height - dy
          break
        case 'sw':
          newCrop.x = cropStart.x + dx
          newCrop.width = cropStart.width - dx
          newCrop.height = cropStart.height + dy
          break
        case 'se':
          newCrop.width = cropStart.width + dx
          newCrop.height = cropStart.height + dy
          break
        default:
          break
      }
      
      if (newCrop.width < minSize) {
        newCrop.width = minSize
        if (cropDragMode.includes('w')) newCrop.x = cropStart.x + cropStart.width - minSize
      }
      if (newCrop.height < minSize) {
        newCrop.height = minSize
        if (cropDragMode.includes('n')) newCrop.y = cropStart.y + cropStart.height - minSize
      }
      
      setCropArea(newCrop)
    }
  }, [isDragging, cropDragMode, dragStart, positionStart, cropStart])

  const handleMouseUp = useCallback(() => {
    if (isDragging) {
      saveToHistory({ position: { ...position } })
    }
    setIsDragging(false)
    setCropDragMode(null)
  }, [isDragging, position, saveToHistory])

  useEffect(() => {
    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }
  }, [handleMouseMove, handleMouseUp])

  const handleWheel = (e) => {
    e.preventDefault()
    const delta = e.deltaY > 0 ? 0.9 : 1.1
    const newScale = Math.max(0.1, Math.min(5, scale * delta))
    setScale(newScale)
    saveToHistory({ scale: newScale })
  }

  const handleZoomIn = () => {
    setScale(prev => {
      const next = Math.min(5, prev * 1.2)
      saveToHistory({ scale: next })
      return next
    })
  }

  const handleZoomOut = () => {
    setScale(prev => {
      const next = Math.max(0.1, prev / 1.2)
      saveToHistory({ scale: next })
      return next
    })
  }

  const handleRotate = () => {
    setRotation(prev => {
      const next = (prev + 90) % 360
      saveToHistory({ rotation: next })
      return next
    })
  }

  const handleFlipHorizontal = () => {
    setFlipHorizontal(prev => {
      const next = !prev
      saveToHistory({ flipHorizontal: next })
      return next
    })
  }

  const handleFlipVertical = () => {
    setFlipVertical(prev => {
      const next = !prev
      saveToHistory({ flipVertical: next })
      return next
    })
  }

  const handleStartCrop = () => {
    if (!canvasRef.current) return
    
    setIsCropping(true)
    setActiveTool('crop')
    
    const canvas = canvasRef.current
    const width = Math.min(400, canvas.width * 0.8)
    const height = Math.min(300, canvas.height * 0.8)
    setCropArea({
      x: (canvas.width - width) / 2,
      y: (canvas.height - height) / 2,
      width,
      height
    })
  }

  const handleApplyCrop = () => {
    if (!canvasRef.current || !image) return
    if (cropArea.width <= 1 || cropArea.height <= 1) {
      alert('Please draw a crop area first.')
      return
    }
    
    try {
      const canvas = canvasRef.current
      const ctx = canvas.getContext('2d', { willReadFrequently: true })
      
      const imageData = ctx.getImageData(
        cropArea.x, 
        cropArea.y, 
        cropArea.width, 
        cropArea.height
      )
      
      const croppedCanvas = document.createElement('canvas')
      croppedCanvas.width = cropArea.width
      croppedCanvas.height = cropArea.height
      const croppedCtx = croppedCanvas.getContext('2d')
      
      croppedCtx.fillStyle = '#FFFFFF'
      croppedCtx.fillRect(0, 0, croppedCanvas.width, croppedCanvas.height)
      croppedCtx.putImageData(imageData, 0, 0)
      
      const dataUrl = croppedCanvas.toDataURL('image/png')
      
      const croppedImage = new Image()
      croppedImage.onload = () => {
        setImage(croppedImage)
        imageRef.current = croppedImage
        setIsCropping(false)
        setActiveTool('move')
        setScale(1)
        setStretchX(1)
        setStretchY(1)
        setRotation(0)
        setFlipHorizontal(false)
        setFlipVertical(false)
        setHasPositionedInitial(false)
        setTimeout(() => saveToHistory(), 100)
      }
      
      croppedImage.onerror = (error) => {
        console.error('Failed to load cropped image:', error)
        alert('Failed to apply crop. Please try again.')
        setIsCropping(false)
        setActiveTool('move')
      }
      
      croppedImage.src = dataUrl
      
    } catch (error) {
      console.error('Crop failed:', error)
      alert('Failed to crop image. Error: ' + error.message)
      setIsCropping(false)
      setActiveTool('move')
    }
  }

  const handleCancelCrop = () => {
    setIsCropping(false)
    setActiveTool('move')
  }

  const handleSave = useCallback(async () => {
    if (!canvasRef.current || !image) return
    try {
      setIsSaving(true)
      const canvas = canvasRef.current
      const blob = await new Promise((resolve, reject) => {
        canvas.toBlob((result) => {
          if (result) {
            resolve(result)
          } else {
            reject(new Error('Failed to generate image data.'))
          }
        }, 'image/png', 0.95)
      })
      const dataUrl = canvas.toDataURL('image/png', 0.95)
      const baseName = templateName
        ? templateName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
        : 'edited-image'
      const fileName = `${baseName || 'edited-image'}-${Date.now()}.png`
      let fileForUpload
      if (typeof File === 'function') {
        fileForUpload = new File([blob], fileName, { type: 'image/png' })
      } else {
        fileForUpload = blob
        try {
          fileForUpload.name = fileName
          fileForUpload.type = fileForUpload.type || 'image/png'
        } catch (_) {
          // ignore
        }
      }
      if (onSave) {
        await onSave({
          file: fileForUpload,
          dataUrl,
          blob,
          width: canvas.width,
          height: canvas.height,
          fileName
        })
      }
    } catch (error) {
      console.error('❌ Save failed:', error)
      const message = error?.message || 'Failed to save image.'
      alert(message)
    } finally {
      setIsSaving(false)
    }
  }, [image, onSave, templateName])

  const handleClose = () => {
    setImage(null)
    setImageLoaded(false)
    setImageError(null)
    setIsLoading(false)
    setIsSaving(false)
    setScale(1)
    setStretchX(1)
    setStretchY(1)
    setPosition({ x: 0, y: 0 })
    setRotation(0)
    setFlipHorizontal(false)
    setFlipVertical(false)
    setIsCropping(false)
    setActiveTool('move')
    setHistory([])
    setHistoryIndex(-1)
    setIsDragging(false)
    setCropDragMode(null)
    setCanvasSize({ width: 800, height: 600 })
    
    if (onClose) {
      onClose()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4">
      <div className="relative w-full h-full max-w-7xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 bg-white rounded-lg px-6 py-4 shadow-lg">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">Image Editor</h2>
            <p className="text-sm text-gray-600">Edit, crop, and transform your image</p>
            {templateName && (
              <p className="text-sm text-gray-500 mt-1">
                Editing template: <span className="font-medium text-gray-700">{templateName}</span>
              </p>
            )}
            {imageLoaded && (
              <p className="text-xs text-gray-500 mt-1">
                Canvas: {canvasSize.width} × {canvasSize.height}px 
                {image && ` • Aspect Ratio: ${(image.width / image.height).toFixed(2)} ${
                  image.width / image.height > 1.7 ? '(16:9)' : 
                  image.width / image.height > 1.3 ? '(4:3)' : 
                  image.width / image.height < 0.6 ? '(9:16)' : 
                  image.width / image.height < 0.8 ? '(3:4)' : 
                  '(1:1)'
                }`}
                <span className="ml-2 text-green-600 font-medium">• Ready to edit</span>
              </p>
            )}
          </div>
          <button
            onClick={handleClose}
            className="p-2 rounded-full hover:bg-gray-100 transition-colors"
            title="Close"
          >
            <X size={24} className="text-gray-600" />
          </button>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex gap-4 overflow-hidden min-h-0">
          {/* Toolbar */}
          <div className="bg-white rounded-lg p-4 shadow-lg flex flex-col gap-3 w-64 overflow-y-auto">
            <h3 className="text-lg font-semibold text-gray-800 mb-2">Tools</h3>
            
            {/* Undo/Redo */}
            <div className="flex gap-2">
              <button
                onClick={undo}
                disabled={historyIndex <= 0}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors"
                title="Undo"
              >
                <Undo size={18} />
                <span className="text-sm">Undo</span>
              </button>
              <button
                onClick={redo}
                disabled={historyIndex >= history.length - 1}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 disabled:bg-gray-50 disabled:text-gray-400 rounded-lg transition-colors"
                title="Redo"
              >
                <Redo size={18} />
                <span className="text-sm">Redo</span>
              </button>
            </div>

            <div className="border-t border-gray-200 my-2" />

            {/* Move Tool */}
            <button
              onClick={() => { setActiveTool('move'); setIsCropping(false); }}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                activeTool === 'move' ? 'bg-blue-500 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <Move size={20} />
              <span className="font-medium">Move</span>
            </button>

            {/* Crop Tool */}
            {!isCropping ? (
              <button
                onClick={handleStartCrop}
                className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
              >
                <Crop size={20} />
                <span className="font-medium">Crop</span>
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  onClick={handleApplyCrop}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-green-500 hover:bg-green-600 text-white rounded-lg transition-colors"
                >
                  <Crop size={20} />
                  <span className="font-medium">Apply Crop</span>
                </button>
                <button
                  onClick={handleCancelCrop}
                  className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                >
                  Cancel
                </button>
              </div>
            )}

            <div className="border-t border-gray-200 my-2" />

            {/* Zoom Controls */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Zoom: {Math.round(scale * 100)}%</label>
              <div className="flex gap-2">
                <button
                  onClick={handleZoomOut}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Zoom Out"
                >
                  <ZoomOut size={18} />
                </button>
                <button
                  onClick={handleZoomIn}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  title="Zoom In"
                >
                  <ZoomIn size={18} />
                </button>
              </div>
              <input
                type="range"
                min="10"
                max="500"
                value={scale * 100}
                onChange={(e) => {
                  setScale(parseInt(e.target.value) / 100)
                }}
                onMouseUp={saveToHistory}
                className="w-full"
              />
            </div>

            <div className="border-t border-gray-200 my-2" />

            {/* Rotate */}
            <button
              onClick={handleRotate}
              className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-700 transition-colors"
            >
              <RotateCw size={20} />
              <span className="font-medium">Rotate 90°</span>
            </button>

            <div className="border-t border-gray-200 my-2" />

            {/* Transform Controls */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Transform</label>
              <button
                onClick={handleFlipHorizontal}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  flipHorizontal ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <FlipHorizontal size={20} />
                <span className="font-medium">Flip Horizontal</span>
              </button>
              <button
                onClick={handleFlipVertical}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-colors ${
                  flipVertical ? 'bg-blue-100 text-blue-700 border-2 border-blue-500' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
                }`}
              >
                <FlipVertical size={20} />
                <span className="font-medium">Flip Vertical</span>
              </button>
            </div>

            <div className="border-t border-gray-200 my-2" />

            {/* Scale Width/Height */}
            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Image Width ({Math.round(stretchX * 100)}%)</label>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={Math.round(stretchX * 100)}
                  onChange={(e) => handleStretchChange('x', Number(e.target.value))}
                  className="w-full"
                  disabled={!imageLoaded}
                />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Image Height ({Math.round(stretchY * 100)}%)</label>
                <input
                  type="range"
                  min="50"
                  max="200"
                  value={Math.round(stretchY * 100)}
                  onChange={(e) => handleStretchChange('y', Number(e.target.value))}
                  className="w-full"
                  disabled={!imageLoaded}
                />
              </div>
            </div>

            <div className="border-t border-gray-200 my-2" />

            <div className="space-y-2">
              <label className="text-sm font-medium text-gray-700">Quick Actions</label>
              <button
                onClick={() => {
                  const pos = centerImage()
                  if (pos) saveToHistory({ position: pos })
                }}
                disabled={!imageLoaded}
                className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg ${
                  imageLoaded ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                } transition-colors`}
              >
                <Maximize2 size={18} />
                <span>Center Image</span>
              </button>
              <button
                onClick={resetTransforms}
                disabled={!imageLoaded}
                className={`w-full flex items-center gap-2 px-4 py-3 rounded-lg ${
                  imageLoaded ? 'bg-gray-100 hover:bg-gray-200 text-gray-700' : 'bg-gray-50 text-gray-400 cursor-not-allowed'
                } transition-colors`}
              >
                <RotateCw size={18} />
                <span>Reset Transform</span>
              </button>
            </div>

            <div className="border-t border-gray-200 my-2" />

            {/* Save Button */}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className={`flex items-center justify-center gap-2 px-4 py-3 rounded-lg font-semibold shadow-md transition-colors ${
                isSaving
                  ? 'bg-blue-400 cursor-not-allowed text-white'
                  : 'bg-blue-600 hover:bg-blue-700 text-white'
              }`}
            >
              {isSaving ? (
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : (
                <Save size={20} />
              )}
              <span>{isSaving ? 'Saving…' : 'Save Image'}</span>
            </button>
          </div>

          {/* Canvas Area */}
          <div 
            ref={containerRef}
            className="flex-1 bg-gray-600 rounded-lg overflow-hidden relative flex items-center justify-center min-h-0"
          >
            {isLoading && (
              <div className="flex flex-col items-center justify-center h-full text-white p-8">
                <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-white mb-4"></div>
                <p className="text-lg mb-4">Loading image...</p>
                <div className="bg-gray-800 rounded-lg p-4 max-w-2xl">
                  <p className="text-xs text-gray-400 mb-2">Debug Info:</p>
                  <p className="text-xs text-white break-all">
                    {imageUrl ? `URL: ${imageUrl.substring(0, 100)}...` : 'No URL'}
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    Check browser console (F12) for detailed logs
                  </p>
                </div>
              </div>
            )}
            
            {imageError && (
              <div className="flex flex-col items-center justify-center h-full text-white p-8">
                <div className="bg-red-500 rounded-full p-4 mb-4">
                  <X size={32} />
                </div>
                <p className="text-lg font-semibold mb-2">Failed to Load Image</p>
                <p className="text-sm text-gray-300 text-center max-w-md mb-4">{imageError}</p>
                
                <div className="flex gap-3">
                  <button
                    onClick={handleClose}
                    className="px-6 py-2 bg-white text-gray-900 rounded-lg hover:bg-gray-100 transition-colors font-semibold"
                  >
                    Close Editor
                  </button>
                </div>
              </div>
            )}
            
            {imageLoaded && !isLoading && !imageError && (
              <canvas
                ref={canvasRef}
                onMouseDown={handleMouseDown}
                onWheel={handleWheel}
                className="shadow-2xl bg-white"
                style={{ 
                  cursor: isCropping ? 'crosshair' : 'move',
                  maxWidth: '100%',
                  maxHeight: '100%',
                  width: `${canvasSize.width}px`,
                  height: `${canvasSize.height}px`
                }}
              />
            )}
          </div>
        </div>
        {isSaving && (
          <div className="absolute inset-0 z-40 flex items-center justify-center">
            <div className="rounded-lg bg-white px-4 py-3 text-sm font-medium text-gray-700 shadow-lg flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-blue-500 border-t-transparent" />
              Saving image…
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default CanvasImageEditor
