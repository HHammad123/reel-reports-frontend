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
    case 'imageCut':
      return (
        <svg {...commonProps}>
          <path d="M21 15V5a2 2 0 0 0-2-2H9" />
          <path d="M3 9v10a2 2 0 0 0 2 2h10" />
          <path d="M3 3l18 18" />
          <path d="M14 14l-4 4h6a2 2 0 0 0 2-2v-2z" />
          <path d="M10 10L6 6H8a2 2 0 0 1 2 2z" />
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
    case 'more':
      return (
        <svg {...commonProps}>
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      )
    case 'close':
      return (
        <svg {...commonProps}>
          <path d="M6 6l12 12" />
          <path d="M6 18L18 6" />
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
    case 'layers':
      return (
        <svg {...commonProps}>
          <polygon points="12 2 2 7 12 12 22 7 12 2" />
          <polyline points="2 17 12 22 22 17" />
          <polyline points="2 12 12 17 22 12" />
        </svg>
      )
    case 'type':
      return (
        <svg {...commonProps}>
          <polyline points="4 7 4 4 20 4 20 7" />
          <line x1="9" y1="20" x2="15" y2="20" />
          <line x1="12" y1="4" x2="12" y2="20" />
        </svg>
      )
    case 'chevronUp':
      return (
        <svg {...commonProps}>
          <polyline points="18 15 12 9 6 15" />
        </svg>
      )
    case 'chevronDown':
      return (
        <svg {...commonProps}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      )
    case 'eye':
      return (
        <svg {...commonProps}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      )
    case 'eyeOff':
      return (
        <svg {...commonProps}>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
          <line x1="1" y1="1" x2="23" y2="23" />
        </svg>
      )
    default:
      return <div>?</div>
  }
}

// TEXT PRESETS CONFIGURATION - Canva-style font combinations
const TEXT_PRESETS = [
  {
    id: 'quick-win',
    name: 'Quick Win',
    preview: {
      line1: { text: 'quick', fontSize: 32, fontFamily: 'Georgia', fontWeight: 'normal', fontStyle: 'italic', color: '#000000' },
      line2: { text: 'WIN', fontSize: 48, fontFamily: 'Arial', fontWeight: 'bold', color: '#2563eb', letterSpacing: '8px' }
    },
    config: {
      fontSize: 48,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      color: '#2563eb',
      textAlign: 'center',
      textShadow: 'drop'
    }
  },
  {
    id: 'team-sync',
    name: 'Team Sync',
    preview: {
      line1: { text: '><', fontSize: 36, fontFamily: 'Arial', fontWeight: 'bold', color: '#475569' },
      line2: { text: 'team', fontSize: 28, fontFamily: 'Georgia', fontWeight: 'normal', color: '#475569' },
      line3: { text: 'sync', fontSize: 32, fontFamily: 'Georgia', fontWeight: 'bold', color: '#475569' }
    },
    config: {
      fontSize: 32,
      fontFamily: 'Georgia',
      fontWeight: 'bold',
      color: '#475569',
      textAlign: 'center'
    }
  },
  {
    id: 'tech-stack',
    name: 'Tech Stack',
    preview: {
      line1: { text: 'TECH', fontSize: 42, fontFamily: 'Arial', fontWeight: 'bold', color: '#64748b', letterSpacing: '2px', transform: 'skewX(-5deg)' },
      line2: { text: 'STACK', fontSize: 36, fontFamily: 'Georgia', fontWeight: 'normal', fontStyle: 'italic', color: '#1e293b' }
    },
    config: {
      fontSize: 42,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      color: '#64748b',
      textAlign: 'left'
    }
  },
  {
    id: 'big-strategy',
    name: 'Big Strategy',
    preview: {
      line1: { text: 'BIG', fontSize: 44, fontFamily: 'Arial', fontWeight: 'bold', color: '#3b82f6', letterSpacing: '6px', textStroke: '2px #3b82f6', textFill: 'transparent' },
      line2: { text: 'strategy', fontSize: 38, fontFamily: 'Georgia', fontWeight: 'normal', fontStyle: 'italic', color: '#4f46e5' }
    },
    config: {
      fontSize: 44,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      color: '#3b82f6',
      textAlign: 'center',
      wordArt: 'outline'
    }
  },
  {
    id: 'modern-minimal',
    name: 'Modern Minimal',
    preview: {
      line1: { text: 'MODERN', fontSize: 36, fontFamily: 'Helvetica', fontWeight: '300', color: '#000000', letterSpacing: '12px' },
      line2: { text: 'design', fontSize: 24, fontFamily: 'Georgia', fontWeight: 'normal', fontStyle: 'italic', color: '#666666' }
    },
    config: {
      fontSize: 36,
      fontFamily: 'Helvetica',
      fontWeight: '300',
      color: '#000000',
      textAlign: 'center'
    }
  },
  {
    id: 'bold-impact',
    name: 'Bold Impact',
    preview: {
      line1: { text: 'BOLD', fontSize: 52, fontFamily: 'Impact', fontWeight: 'bold', color: '#dc2626', letterSpacing: '4px' },
      line2: { text: 'MESSAGE', fontSize: 28, fontFamily: 'Arial', fontWeight: 'normal', color: '#991b1b' }
    },
    config: {
      fontSize: 52,
      fontFamily: 'Impact',
      fontWeight: 'bold',
      color: '#dc2626',
      textAlign: 'center',
      textShadow: 'hard'
    }
  },
  {
    id: 'elegant-script',
    name: 'Elegant Script',
    preview: {
      line1: { text: 'Elegant', fontSize: 42, fontFamily: 'Georgia', fontWeight: 'normal', fontStyle: 'italic', color: '#8b5cf6' },
      line2: { text: 'DESIGN', fontSize: 24, fontFamily: 'Arial', fontWeight: '300', color: '#6d28d9', letterSpacing: '8px' }
    },
    config: {
      fontSize: 42,
      fontFamily: 'Georgia',
      fontWeight: 'normal',
      fontStyle: 'italic',
      color: '#8b5cf6',
      textAlign: 'center'
    }
  },
  {
    id: 'retro-vibe',
    name: 'Retro Vibe',
    preview: {
      line1: { text: 'RETRO', fontSize: 46, fontFamily: 'Courier New', fontWeight: 'bold', color: '#f59e0b', textShadow: '3px 3px 0px #dc2626' },
      line2: { text: 'style', fontSize: 32, fontFamily: 'Courier New', fontWeight: 'normal', fontStyle: 'italic', color: '#ea580c' }
    },
    config: {
      fontSize: 46,
      fontFamily: 'Courier New',
      fontWeight: 'bold',
      color: '#f59e0b',
      textAlign: 'center',
      textShadow: 'hard'
    }
  },
  {
    id: 'gradient-pop',
    name: 'Gradient Pop',
    preview: {
      line1: { text: 'GRADIENT', fontSize: 40, fontFamily: 'Arial', fontWeight: 'bold', color: '#ec4899', letterSpacing: '4px' },
      line2: { text: 'effect', fontSize: 28, fontFamily: 'Georgia', fontWeight: 'normal', fontStyle: 'italic', color: '#8b5cf6' }
    },
    config: {
      fontSize: 40,
      fontFamily: 'Arial',
      fontWeight: 'bold',
      color: '#ec4899',
      textAlign: 'center',
      textGlow: 'soft'
    }
  },
  {
    id: 'corporate-clean',
    name: 'Corporate Clean',
    preview: {
      line1: { text: 'PROFESSIONAL', fontSize: 34, fontFamily: 'Helvetica', fontWeight: 'bold', color: '#1f2937', letterSpacing: '3px' },
      line2: { text: 'Business', fontSize: 26, fontFamily: 'Times New Roman', fontWeight: 'normal', color: '#4b5563' }
    },
    config: {
      fontSize: 34,
      fontFamily: 'Helvetica',
      fontWeight: 'bold',
      color: '#1f2937',
      textAlign: 'left'
    }
  }
];

// Preset Preview Component
const PresetPreview = ({ preset, onClick }) => {
  const { preview } = preset
  const previewLines = Object.values(preview)
  
  return (
    <div 
      className="preset-card"
      onClick={() => onClick(preset)}
      style={{
        cursor: 'pointer',
        padding: '20px',
        backgroundColor: '#f8f9fa',
        borderRadius: '12px',
        border: '2px solid #e2e8f0',
        transition: 'all 0.3s ease',
        minHeight: '140px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '4px',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = '#7c3aed'
        e.currentTarget.style.backgroundColor = '#faf5ff'
        e.currentTarget.style.transform = 'translateY(-4px)'
        e.currentTarget.style.boxShadow = '0 8px 16px rgba(124, 58, 237, 0.2)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = '#e2e8f0'
        e.currentTarget.style.backgroundColor = '#f8f9fa'
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = 'none'
      }}
    >
      {previewLines.map((line, index) => (
        <div
          key={index}
          style={{
            fontSize: `${(line.fontSize || 24) * 0.6}px`,
            fontFamily: line.fontFamily || 'Arial',
            fontWeight: line.fontWeight || 'normal',
            fontStyle: line.fontStyle || 'normal',
            color: line.color || '#000000',
            letterSpacing: line.letterSpacing || 'normal',
            textShadow: line.textShadow || 'none',
            transform: line.transform || 'none',
            WebkitTextStroke: line.textStroke && line.textFill === 'transparent' ? line.textStroke : 'none',
            WebkitTextFillColor: line.textFill || 'currentColor',
            lineHeight: 1.2,
            whiteSpace: 'nowrap'
          }}
        >
          {line.text}
        </div>
      ))}
      
      {/* Hover overlay */}
      <div 
        style={{
          position: 'absolute',
          bottom: '8px',
          right: '8px',
          fontSize: '10px',
          fontWeight: '600',
          color: '#7c3aed',
          backgroundColor: 'white',
          padding: '4px 8px',
          borderRadius: '4px',
          opacity: 0,
          transition: 'opacity 0.2s'
        }}
        className="preset-label"
      >
        Click to apply
      </div>
    </div>
  )
}

const BOUNDING_BOX_NORMALIZED_THRESHOLD = 1.05
const BF_REMOVE_BASE =
  'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/bf_remove'
const BF_REMOVE_UPLOAD_ENDPOINT = `${BF_REMOVE_BASE}/upload`
const BF_REMOVE_REMOVE_BG_ENDPOINT = `${BF_REMOVE_BASE}/remove-bg`

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

function ImageEdit({ onClose, isOpen = true, frameData = null, sceneNumber = null, imageIndex = null, onFrameEditComplete = null, aspectRatioCss = '16 / 9' }) {
  const [isSaving, setIsSaving] = useState(false);
  const [isApplyingCrop, setIsApplyingCrop] = useState(false);
  const [showSuccessPopup, setShowSuccessPopup] = useState(false);
  // State management
  const [imageUrl, setImageUrl] = useState('')
  const [imageLoaded, setImageLoaded] = useState(false)
  const [textLayers, setTextLayers] = useState([])
  const [selectedLayer, setSelectedLayer] = useState(null)
  const [editingTextLayerId, setEditingTextLayerId] = useState(null) // Track which text layer is being edited inline
  const [isDragging, setIsDragging] = useState(false)
  const [isResizing, setIsResizing] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const [layerStart, setLayerStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [dragThresholdMet, setDragThresholdMet] = useState(false) // Track if drag threshold is met
  const [jsonInput, setJsonInput] = useState('')
  const [imageScale, setImageScale] = useState(1)
  const [overlayImageFile, setOverlayImageFile] = useState(null)
  const [overlayImageUrl, setOverlayImageUrl] = useState('')
  const [overlayImage, setOverlayImage] = useState(null)
  const [overlayPosition, setOverlayPosition] = useState({ x: 0, y: 0 })
  const [overlaySize, setOverlaySize] = useState({ width: 200, height: 200 })
  const [overlayScale, setOverlayScale] = useState(1) // Keep for backward compatibility during transition
  const [overlayVisible, setOverlayVisible] = useState(false)
  const [isDraggingOverlay, setIsDraggingOverlay] = useState(false)
  const [isResizingOverlay, setIsResizingOverlay] = useState(false)
  const [overlayResizeMode, setOverlayResizeMode] = useState(null) // 'nw'|'n'|'ne'|'e'|'se'|'s'|'sw'|'w'
  const [overlayDragStart, setOverlayDragStart] = useState({ x: 0, y: 0 })
  const [overlaySizeStart, setOverlaySizeStart] = useState({ x: 0, y: 0, width: 0, height: 0 })
  const [overlayBackgroundRemoved, setOverlayBackgroundRemoved] = useState(false)
  const [isRemovingBackground, setIsRemovingBackground] = useState(false)
  const [isOverlayUploading, setIsOverlayUploading] = useState(false)
  const [overlaySelected, setOverlaySelected] = useState(false)
  const [overlayOriginalBeforeBgRemoval, setOverlayOriginalBeforeBgRemoval] = useState(null)
  // Overlay layer background removal tracking
  const [overlayLayerBackgroundRemoved, setOverlayLayerBackgroundRemoved] = useState(new Map()) // Map<layerId, boolean>
  const [overlayLayerOriginalBeforeBgRemoval, setOverlayLayerOriginalBeforeBgRemoval] = useState(new Map()) // Map<layerId, {imageUrl, image}>
  const [isRemovingOverlayLayerBackground, setIsRemovingOverlayLayerBackground] = useState(false)
  const resetOverlayBackgroundState = useCallback(() => {
    setOverlayBackgroundRemoved(false)
    setOverlayOriginalBeforeBgRemoval(null)
  }, [])
  const getProcessedOverlaySrc = useCallback(
    async (src) => {
      if (!src) return ''
      return src
    },
    []
  )

  const [activePanel, setActivePanel] = useState(null)
  const [layerOrder, setLayerOrder] = useState([]) // Unified layer ordering: [{type: 'text'|'shape', id: number, visible: boolean}]
  const [shapeLayers, setShapeLayers] = useState([])
  const [selectedShape, setSelectedShape] = useState(null)
  const [isDraggingShape, setIsDraggingShape] = useState(false)
  const [isResizingShape, setIsResizingShape] = useState(false)
  const [defaultShapeColor, setDefaultShapeColor] = useState('#7c3aed')
  
  // Multiple overlay layers support (for anchor and other models)
  const [overlayLayers, setOverlayLayers] = useState([])
  const [selectedOverlayLayer, setSelectedOverlayLayer] = useState(null)
  const [isToolbarOpen, setIsToolbarOpen] = useState(true)
  const [hoveredTextLayerId, setHoveredTextLayerId] = useState(null)
  const [hoverToolbarPosition, setHoverToolbarPosition] = useState({ x: 0, y: 0 })
  const [isHoveringToolbar, setIsHoveringToolbar] = useState(false)
  const [hoveredShapeId, setHoveredShapeId] = useState(null)
  const [hoveredOverlay, setHoveredOverlay] = useState(false)
  const [hoveredOverlayLayerId, setHoveredOverlayLayerId] = useState(null)
  const [isDraggingOverlayLayer, setIsDraggingOverlayLayer] = useState(false)
  const [isResizingOverlayLayer, setIsResizingOverlayLayer] = useState(false)
  const [selectedOverlayLayerResizeMode, setSelectedOverlayLayerResizeMode] = useState(null)
  const hoverTimeoutRef = useRef(null)
  const isHoveringToolbarRef = useRef(false)
  const shapeHoverTimeoutRef = useRef(null)
  const overlayHoverTimeoutRef = useRef(null)
  const hoverToolbarRef = useRef(null)
  const hoverToolbarPositionRef = useRef({ x: 0, y: 0 })
  const normalizedAspectRatio = useMemo(
    () => (aspectRatioCss && typeof aspectRatioCss === 'string' ? aspectRatioCss : '16 / 9'),
    [aspectRatioCss]
  )
  const editorCanvasStyle = useMemo(() => {
    // Check if this is a 9:16 (portrait) aspect ratio
    const isPortrait9x16 = normalizedAspectRatio === '9 / 16' || normalizedAspectRatio === '9:16' || normalizedAspectRatio === '9/16';
    
    if (isPortrait9x16) {
      // For 9:16 images, match the image container size from ImageList (500px width)
      // Let the aspect ratio determine the height naturally without maxHeight constraint
      // This ensures the full image is visible and not cut off
      return {
        aspectRatio: normalizedAspectRatio,
        width: '500px',
        maxWidth: '500px',
        height: 'auto',
        minHeight: '200px'
        // Removed maxHeight to allow full image height
      };
    }
    
    // For other aspect ratios, use the original sizing
    return {
    aspectRatio: normalizedAspectRatio,
    width: 'min(100%, 860px)',
    maxWidth: '860px',
    maxHeight: '72vh',
    minHeight: '200px'
    };
  }, [normalizedAspectRatio])

  // Sync ref with state
  useEffect(() => {
    isHoveringToolbarRef.current = isHoveringToolbar
  }, [isHoveringToolbar])

  // Sync hover toolbar position ref
  useEffect(() => {
    hoverToolbarPositionRef.current = hoverToolbarPosition
  }, [hoverToolbarPosition])

  // Constrain hover toolbar position to stay within image bounds
  useEffect(() => {
    if (!hoveredTextLayerId || !hoverToolbarRef.current) return
    
    // Use requestAnimationFrame to ensure DOM is updated
    requestAnimationFrame(() => {
      const toolbar = hoverToolbarRef.current
      if (!toolbar) return
      
      const canvasEl = toolbar.closest('[data-image-editor-canvas]')
      if (!canvasEl) return
      
      const toolbarRect = toolbar.getBoundingClientRect()
      const canvasRect = canvasEl.getBoundingClientRect()
      const padding = 10
      
      // Get current position from ref to avoid dependency loop
      let { x, y } = hoverToolbarPositionRef.current
      let needsAdjustment = false
      
      // Check horizontal bounds (toolbar is centered, so check half width on each side)
      const toolbarHalfWidth = toolbarRect.width / 2
      if (x - toolbarHalfWidth < padding) {
        x = toolbarHalfWidth + padding
        needsAdjustment = true
      } else if (x + toolbarHalfWidth > canvasRect.width - padding) {
        x = canvasRect.width - toolbarHalfWidth - padding
        needsAdjustment = true
      }
      
      // Check vertical bounds (toolbar is above, so check full height)
      const toolbarHeight = toolbarRect.height
      if (y - toolbarHeight < padding) {
        y = toolbarHeight + padding
        needsAdjustment = true
      } else if (y > canvasRect.height - padding) {
        y = canvasRect.height - padding
        needsAdjustment = true
      }
      
      if (needsAdjustment) {
        setHoverToolbarPosition({ x, y })
      }
    })
  }, [hoveredTextLayerId]) // Only run when toolbar appears, not on position change

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
  const [cropShape, setCropShape] = useState('square') // 'square' | 'circle'

  const toggleCropShape = useCallback(() => {
    setCropShape(prev => (prev === 'square' ? 'circle' : 'square'))
  }, [])

  const applyCropShapeConstraints = useCallback((area, mode = null) => {
    if (!area) return area
    if (cropShape !== 'circle') return area

    const size = Math.max(20, Math.min(area.width, area.height))
    const centerX = area.x + area.width / 2
    const centerY = area.y + area.height / 2
    const touchesWest = mode?.includes?.('w')
    const touchesEast = mode?.includes?.('e')
    const touchesNorth = mode?.includes?.('n')
    const touchesSouth = mode?.includes?.('s')

    let x
    let y

    if (mode && mode !== 'move') {
      if (touchesWest && !touchesEast) {
        x = area.x + (area.width - size)
      } else if (touchesEast && !touchesWest) {
        x = area.x
      } else {
        x = centerX - size / 2
      }

      if (touchesNorth && !touchesSouth) {
        y = area.y + (area.height - size)
      } else if (touchesSouth && !touchesNorth) {
        y = area.y
      } else {
        y = centerY - size / 2
      }
    } else {
      x = centerX - size / 2
      y = centerY - size / 2
    }

    x = Math.max(0, x)
    y = Math.max(0, y)

    return {
      ...area,
      x,
      y,
      width: size,
      height: size
    }
  }, [cropShape])

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
      setCropArea(applyCropShapeConstraints({ x: nx, y: ny, width: nw, height: nh }, cropDragMode))
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
  }, [isCropping, dragStart, cropDragMode, layerStart, applyCropShapeConstraints])

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

  const clampOverlayCropArea = useCallback(
    (rect) => {
      const { scaleX, scaleY } = getImageScale()
      
      // Handle overlay layer crop
      if (croppingTarget === 'overlay-layer' && selectedOverlayLayer && imageRef.current) {
        const overlayLayer = selectedOverlayLayer
        const displayWidth = (overlayLayer.width || 0) * scaleX
        const displayHeight = (overlayLayer.height || 0) * scaleY

        if (!displayWidth || !displayHeight) {
          return rect
        }

        const minX = (overlayLayer.x || 0) * scaleX
        const minY = (overlayLayer.y || 0) * scaleY
        const maxX = minX + displayWidth
        const maxY = minY + displayHeight
        const minSelection = 20

        const width = Math.min(Math.max(rect.width, minSelection), displayWidth)
        const height = Math.min(Math.max(rect.height, minSelection), displayHeight)

        let x = rect.x
        let y = rect.y
        if (x < minX) x = minX
        if (y < minY) y = minY
        if (x + width > maxX) x = maxX - width
        if (y + height > maxY) y = maxY - height

        return { x, y, width, height }
      }
      
      // Handle main overlay crop
      if (
        croppingTarget !== 'overlay' ||
        !overlayVisible ||
        !overlayImage ||
        !imageRef.current
      ) {
        return rect
      }

      const displayWidth = (overlaySize?.width || (overlayImage.width * overlayScale) || 0) * scaleX
      const displayHeight = (overlaySize?.height || (overlayImage.height * overlayScale) || 0) * scaleY

      if (!displayWidth || !displayHeight) {
        return rect
      }

      const minX = (overlayPosition.x || 0) * scaleX
      const minY = (overlayPosition.y || 0) * scaleY
      const maxX = minX + displayWidth
      const maxY = minY + displayHeight
      const minSelection = 20

      const width = Math.min(Math.max(rect.width, minSelection), displayWidth)
      const height = Math.min(Math.max(rect.height, minSelection), displayHeight)

      let x = rect.x
      let y = rect.y
      if (x < minX) x = minX
      if (y < minY) y = minY
      if (x + width > maxX) x = maxX - width
      if (y + height > maxY) y = maxY - height

      return { x, y, width, height }
    },
    [croppingTarget, overlayVisible, overlayImage, overlaySize, overlayScale, overlayPosition, selectedOverlayLayer, getImageScale]
  )

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
      
      const nextCrop = clampOverlayCropArea({ x: nx, y: ny, width: nw, height: nh })
      setCropArea(applyCropShapeConstraints(nextCrop, cropDragMode))
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
  }, [isCropping, dragStart, cropDragMode, layerStart, clampOverlayCropArea, applyCropShapeConstraints])

  useEffect(() => {
    if (!isCropping) return
    setCropArea(prev => applyCropShapeConstraints(prev))
  }, [cropShape, isCropping, applyCropShapeConstraints])

  const startCropping = (target = croppingTarget) => {
    if (!imageLoaded && !overlayVisible && !selectedOverlayLayer) return

    setCroppingTarget(target)
    setIsCropping(true)
    setOriginalImageUrl(imageUrl)
    if (target === 'overlay') {
      setOverlaySelected(true)
    } else {
      setOverlaySelected(false)
    }
    
    // Initialize crop area based on target
    if (target === 'overlay-layer' && selectedOverlayLayer && imageRef.current) {
      // Crop for overlay layer
      const imgEl = imageRef.current
      const { scaleX, scaleY } = getImageScale()
      const overlayLayer = selectedOverlayLayer
      const overlayWidth = overlayLayer.width || 200
      const overlayHeight = overlayLayer.height || 200
      setCropArea(applyCropShapeConstraints({
        x: overlayLayer.x * scaleX,
        y: overlayLayer.y * scaleY,
        width: Math.max(overlayWidth * scaleX, 20),
        height: Math.max(overlayHeight * scaleY, 20)
      }))
    } else if (target === 'overlay' && overlayVisible && imageRef.current) {
      // Convert overlay position and size from natural coordinates to display coordinates
      const imgEl = imageRef.current
      const scaleX = imgEl.naturalWidth > 0 ? imgEl.width / imgEl.naturalWidth : 1
      const scaleY = imgEl.naturalHeight > 0 ? imgEl.height / imgEl.naturalHeight : 1
      const overlayWidth = overlaySize?.width || (overlayImage?.width * overlayScale || 200)
      const overlayHeight = overlaySize?.height || (overlayImage?.height * overlayScale || 200)
      setCropArea(applyCropShapeConstraints({
        x: overlayPosition.x * scaleX,
        y: overlayPosition.y * scaleY,
        width: Math.max(overlayWidth * scaleX, 20),
        height: Math.max(overlayHeight * scaleY, 20)
      }))
    } else if (imageRef.current) {
      // Base image crop - initialize to center of image with reasonable size
      const imgEl = imageRef.current
      const imgWidth = imgEl.width || imgEl.clientWidth || 400
      const imgHeight = imgEl.height || imgEl.clientHeight || 300
      const cropWidth = Math.max(200, imgWidth * 0.6)
      const cropHeight = Math.max(150, imgHeight * 0.6)
      const cropX = (imgWidth - cropWidth) / 2
      const cropY = (imgHeight - cropHeight) / 2
      setCropArea(applyCropShapeConstraints({ 
        x: Math.max(0, cropX), 
        y: Math.max(0, cropY), 
        width: cropWidth, 
        height: cropHeight 
      }))
    } else {
      // Fallback
      setCropArea(applyCropShapeConstraints({ x: 50, y: 50, width: 200, height: 150 }))
    }
  }

  const createCircularCanvas = (sourceCanvas) => {
    if (!sourceCanvas) return sourceCanvas
    const diameter = Math.min(sourceCanvas.width, sourceCanvas.height)
    const canvas = document.createElement('canvas')
    canvas.width = sourceCanvas.width
    canvas.height = sourceCanvas.height
    const ctx = canvas.getContext('2d')
    ctx.save()
    ctx.beginPath()
    ctx.arc(sourceCanvas.width / 2, sourceCanvas.height / 2, diameter / 2, 0, Math.PI * 2)
    ctx.closePath()
    ctx.clip()
    ctx.drawImage(sourceCanvas, 0, 0)
    ctx.restore()
    return canvas
  }

  const extractBase64Payload = (dataUrl = '') => {
    if (!dataUrl) return ''
    const parts = dataUrl.split(',')
    return parts.length > 1 ? parts[1] : parts[0]
  }

  const uploadCroppedOverlayLayer = useCallback(async (base64Src, layerId) => {
    if (!base64Src) return null
    try {
      setIsOverlayUploading(true)
      const payload = {
        base64_image: extractBase64Payload(base64Src)
      }
      const response = await fetch(BF_REMOVE_UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const responseText = await response.text()
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch (_) {
        responseData = null
      }

      if (!response.ok) {
        throw new Error(`bf_remove upload failed: ${response.status} ${responseText}`)
      }

      const replacementUrl =
        responseData?.image_url ||
        responseData?.url ||
        responseData?.link ||
        responseData?.data?.image_url ||
        responseData?.data?.url ||
        responseData?.data?.link ||
        responseData?.result?.image_url ||
        responseData?.result?.url ||
        responseData?.result?.link

      return replacementUrl || null
    } catch (error) {
      console.error('Failed to upload cropped overlay layer:', error)
      return null
    } finally {
      setIsOverlayUploading(false)
    }
  }, [])

  const uploadCroppedOverlay = useCallback(async (base64Src) => {
    if (!base64Src) return
    try {
      setIsOverlayUploading(true)
      const payload = {
        base64_image: extractBase64Payload(base64Src)
      }
      const response = await fetch(BF_REMOVE_UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      })

      const responseText = await response.text()
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch (_) {
        responseData = null
      }

      if (!response.ok) {
        throw new Error(`bf_remove upload failed: ${response.status} ${responseText}`)
      }

      const replacementUrl =
        responseData?.image_url ||
        responseData?.url ||
        responseData?.link ||
        responseData?.data?.image_url ||
        responseData?.data?.url ||
        responseData?.data?.link ||
        responseData?.result?.image_url ||
        responseData?.result?.url ||
        responseData?.result?.link

      if (replacementUrl) {
        await new Promise((resolve, reject) => {
          const img = new Image()
          img.crossOrigin = 'anonymous'
          img.onload = () => {
            setOverlayImage(img)
            setOverlayImageUrl(replacementUrl)
            resolve()
          }
          img.onerror = (err) => {
            console.error('Failed to load overlay image from bf_remove response', err)
            reject(err)
          }
          img.src = replacementUrl
        })
      } else {
        console.warn('bf_remove response missing url/link field', responseData)
      }
    } catch (error) {
      console.error('Failed to upload cropped overlay:', error)
    } finally {
      setIsOverlayUploading(false)
    }
  }, [])

  const applyCrop = async () => {
    setIsApplyingCrop(true)
    try {
      // Handle overlay layer crop
      if (croppingTarget === 'overlay-layer' && selectedOverlayLayer && imageRef.current) {
        const overlayLayer = selectedOverlayLayer
        const previousUrl = overlayLayer.imageUrl || overlayLayer.fileUrl
        const previousWidth = overlayLayer.width
        const previousHeight = overlayLayer.height
        const previousX = overlayLayer.x
        const previousY = overlayLayer.y
        
        // Get image scale factors
        const { scaleX, scaleY } = getImageScale()
        
        // Calculate overlay layer display size
        const overlayDisplayWidth = Math.max(overlayLayer.width * scaleX, 1)
        const overlayDisplayHeight = Math.max(overlayLayer.height * scaleY, 1)
        
        // Calculate overlay layer display position
        const overlayDisplayX = overlayLayer.x * scaleX
        const overlayDisplayY = overlayLayer.y * scaleY
        
        // Calculate crop box position relative to overlay layer in display coordinates
        const cropBoxLeft = cropArea.x - overlayDisplayX
        const cropBoxTop = cropArea.y - overlayDisplayY
        const cropBoxWidth = cropArea.width
        const cropBoxHeight = cropArea.height
        
        // Clamp crop box to overlay layer bounds
        const clampedLeft = Math.max(0, Math.min(cropBoxLeft, overlayDisplayWidth))
        const clampedTop = Math.max(0, Math.min(cropBoxTop, overlayDisplayHeight))
        const clampedRight = Math.min(overlayDisplayWidth, clampedLeft + cropBoxWidth)
        const clampedBottom = Math.min(overlayDisplayHeight, clampedTop + cropBoxHeight)
        const clampedWidth = clampedRight - clampedLeft
        const clampedHeight = clampedBottom - clampedTop
        
        // Load the overlay layer image
        const overlayImg = new Image()
        overlayImg.crossOrigin = 'anonymous'
        
        await new Promise((resolve, reject) => {
          overlayImg.onload = () => {
            // Convert clamped display coordinates to natural overlay image coordinates
            const overlayNaturalWidth = overlayImg.width
            const overlayNaturalHeight = overlayImg.height
            const overlayDisplayToNaturalX = overlayNaturalWidth / overlayDisplayWidth
            const overlayDisplayToNaturalY = overlayNaturalHeight / overlayDisplayHeight
            
            // Calculate source coordinates in the original overlay image
            const sx = clampedLeft * overlayDisplayToNaturalX
            const sy = clampedTop * overlayDisplayToNaturalY
            const sw = clampedWidth * overlayDisplayToNaturalX
            const sh = clampedHeight * overlayDisplayToNaturalY
            
            // Ensure we don't go outside the image bounds
            const finalSx = Math.max(0, Math.min(sx, overlayNaturalWidth - 1))
            const finalSy = Math.max(0, Math.min(sy, overlayNaturalHeight - 1))
            const finalSw = Math.max(1, Math.min(sw, overlayNaturalWidth - finalSx))
            const finalSh = Math.max(1, Math.min(sh, overlayNaturalHeight - finalSy))
            
            // Create canvas with exact crop dimensions
            const canvas = document.createElement('canvas')
            canvas.width = finalSw
            canvas.height = finalSh
            const ctx = canvas.getContext('2d')
            
            // Draw the exact cropped region from the overlay image
            ctx.drawImage(overlayImg, finalSx, finalSy, finalSw, finalSh, 0, 0, finalSw, finalSh)
            
            const targetCanvas = cropShape === 'circle' ? createCircularCanvas(canvas) : canvas
            const base64DataUrl = targetCanvas.toDataURL('image/png')
            
            // Upload cropped image
            uploadCroppedOverlayLayer(base64DataUrl, overlayLayer.id).then((newUrl) => {
              if (newUrl) {
                // Update overlay layer with cropped image
                const newWidth = finalSw
                const newHeight = finalSh
                const newX = overlayLayer.x + (finalSx / overlayDisplayToNaturalX)
                const newY = overlayLayer.y + (finalSy / overlayDisplayToNaturalY)
                
                setOverlayLayers(prev => prev.map(ol => 
                  ol.id === overlayLayer.id 
                    ? { ...ol, imageUrl: newUrl, fileUrl: newUrl, width: newWidth, height: newHeight, x: newX, y: newY, image: null }
                    : ol
                ))
                
                setSelectedOverlayLayer(prev => prev?.id === overlayLayer.id 
                  ? { ...prev, imageUrl: newUrl, fileUrl: newUrl, width: newWidth, height: newHeight, x: newX, y: newY, image: null }
                  : prev
                )
                
                // Reset background removal state for this layer
                setOverlayLayerBackgroundRemoved(prev => {
                  const newMap = new Map(prev)
                  newMap.delete(overlayLayer.id)
                  return newMap
                })
                
                setIsCropping(false)
                resolve()
              } else {
                reject(new Error('Failed to upload cropped overlay layer'))
              }
            }).catch(reject)
          }
          overlayImg.onerror = reject
          overlayImg.src = overlayLayer.imageUrl || overlayLayer.fileUrl
        })
        
        return
      }
      
      if (croppingTarget === 'overlay' && overlayImage && imageRef.current) {
        const previousUrl = overlayImageUrl
        const previousImage = overlayImage
        const previousSize = overlaySize
        
        // Get image scale factors
        const imgEl = imageRef.current
        const { scaleX, scaleY } = getImageScale()
        
        // Calculate overlay display size
        const overlayWidth = overlaySize?.width || (overlayImage.width * overlayScale)
        const overlayHeight = overlaySize?.height || (overlayImage.height * overlayScale)
        const overlayDisplayWidth = Math.max(overlayWidth * scaleX, 1)
        const overlayDisplayHeight = Math.max(overlayHeight * scaleY, 1)
        
        // Calculate overlay display position
        const overlayDisplayX = overlayPosition.x * scaleX
        const overlayDisplayY = overlayPosition.y * scaleY
        
        // Calculate crop box position relative to overlay in display coordinates
        const cropBoxLeft = cropArea.x - overlayDisplayX
        const cropBoxTop = cropArea.y - overlayDisplayY
        const cropBoxWidth = cropArea.width
        const cropBoxHeight = cropArea.height
        
        // Clamp crop box to overlay bounds
        const clampedLeft = Math.max(0, Math.min(cropBoxLeft, overlayDisplayWidth))
        const clampedTop = Math.max(0, Math.min(cropBoxTop, overlayDisplayHeight))
        const clampedRight = Math.min(overlayDisplayWidth, clampedLeft + cropBoxWidth)
        const clampedBottom = Math.min(overlayDisplayHeight, clampedTop + cropBoxHeight)
        const clampedWidth = clampedRight - clampedLeft
        const clampedHeight = clampedBottom - clampedTop
        
        // Convert clamped display coordinates to natural overlay image coordinates
        // The overlay image's natural size vs its display size
        const overlayNaturalWidth = overlayImage.width
        const overlayNaturalHeight = overlayImage.height
        const overlayDisplayToNaturalX = overlayNaturalWidth / overlayDisplayWidth
        const overlayDisplayToNaturalY = overlayNaturalHeight / overlayDisplayHeight
        
        // Calculate source coordinates in the original overlay image
        const sx = clampedLeft * overlayDisplayToNaturalX
        const sy = clampedTop * overlayDisplayToNaturalY
        const sw = clampedWidth * overlayDisplayToNaturalX
        const sh = clampedHeight * overlayDisplayToNaturalY
        
        // Ensure we don't go outside the image bounds
        const finalSx = Math.max(0, Math.min(sx, overlayNaturalWidth - 1))
        const finalSy = Math.max(0, Math.min(sy, overlayNaturalHeight - 1))
        const finalSw = Math.max(1, Math.min(sw, overlayNaturalWidth - finalSx))
        const finalSh = Math.max(1, Math.min(sh, overlayNaturalHeight - finalSy))
        
        // Create canvas with exact crop dimensions
        const canvas = document.createElement('canvas')
        canvas.width = finalSw
        canvas.height = finalSh
        const ctx = canvas.getContext('2d')
        
        // Draw the exact cropped region from the overlay image
        ctx.drawImage(overlayImage, finalSx, finalSy, finalSw, finalSh, 0, 0, finalSw, finalSh)

        const targetCanvas = cropShape === 'circle' ? createCircularCanvas(canvas) : canvas
        const base64DataUrl = targetCanvas.toDataURL('image/png')
        const processedSrc = await getProcessedOverlaySrc(base64DataUrl)

        const previousVisible = overlayVisible
        const previousPosition = overlayPosition
        const previousScale = overlayScale

        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          // Preserve selection position by offsetting the existing origin
          const newPosition = {
            x: (overlayPosition?.x || 0) + finalSx,
            y: (overlayPosition?.y || 0) + finalSy
          }
          const newSize = { width: finalSw, height: finalSh }
          const newScale = 1 // natural size already matches the cropped image
          
          setOverlayImage(img)
          setOverlayVisible(true)
          setOverlayPosition(newPosition)
          setOverlayScale(newScale)
          setOverlaySize(newSize)
          setOverlayImageUrl(processedSrc)
          resetOverlayBackgroundState()
          setIsCropping(false)
          
          // Save to history
          saveToHistory('crop_apply', {
            target: 'overlay',
            previousUrl,
            previousImage,
            previousVisible,
            previousPosition,
            previousScale,
            previousSize,
            newUrl: processedSrc,
            newImage: img,
            newPosition,
            newScale,
            newSize
          })

          uploadCroppedOverlay(processedSrc)
        }
        img.onerror = () => {
          console.error('Failed to load cropped overlay image')
          alert('Failed to load cropped overlay image')
          setIsCropping(false)
        }
        img.src = processedSrc
        
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
      const targetCanvas = cropShape === 'circle' ? createCircularCanvas(canvas) : canvas
      const newUrl = targetCanvas.toDataURL('image/png')
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
    } finally {
      setIsApplyingCrop(false)
      setIsCropping(false)
    }
  }

  const cancelCrop = () => {
    setIsCropping(false)
    setImageUrl(originalImageUrl)
  }

  // Unified Layer Management - Sync layerOrder with text/shape/overlay layers
  useEffect(() => {
    // Build unified layer order if it's empty or doesn't match current layers
    const currentIds = new Set([
      ...textLayers.map(l => `text-${l.id}`),
      ...shapeLayers.map(s => `shape-${s.id}`),
      ...overlayLayers.map(o => `overlay-${o.id}`)
    ])
    
    const orderIds = new Set(layerOrder.map(l => `${l.type}-${l.id}`))
    
    // Check if sync is needed
    if (currentIds.size !== orderIds.size || ![...currentIds].every(id => orderIds.has(id))) {
      // Rebuild layer order preserving existing order where possible
      const newOrder = []
      
      // Add existing layers that are still present
      layerOrder.forEach(item => {
        const key = `${item.type}-${item.id}`
        if (currentIds.has(key)) {
          newOrder.push(item)
          currentIds.delete(key)
        }
      })
      
      // Add new layers at the end
      textLayers.forEach(layer => {
        const key = `text-${layer.id}`
        if (currentIds.has(key)) {
          newOrder.push({ type: 'text', id: layer.id, visible: true })
        }
      })
      
      shapeLayers.forEach(shape => {
        const key = `shape-${shape.id}`
        if (currentIds.has(key)) {
          newOrder.push({ type: 'shape', id: shape.id, visible: true })
        }
      })
      
      overlayLayers.forEach(overlay => {
        const key = `overlay-${overlay.id}`
        if (currentIds.has(key)) {
          newOrder.push({ type: 'overlay', id: overlay.id, visible: true })
        }
      })
      
      setLayerOrder(newOrder)
    }
  }, [textLayers, shapeLayers, overlayLayers, layerOrder])

  // Get all layers in render order
  const getAllLayers = useMemo(() => {
    return layerOrder.map((item, index) => {
      if (item.type === 'text') {
        const layer = textLayers.find(l => l.id === item.id)
        return layer ? { ...layer, type: 'text', visible: item.visible, zIndex: 50 + index } : null
      } else if (item.type === 'shape') {
        const shape = shapeLayers.find(s => s.id === item.id)
        return shape ? { ...shape, type: 'shape', visible: item.visible, zIndex: 50 + index } : null
      } else if (item.type === 'overlay') {
        const overlay = overlayLayers.find(o => o.id === item.id)
        return overlay ? { ...overlay, type: 'overlay', visible: item.visible, zIndex: 50 + index } : null
      }
      return null
    }).filter(Boolean)
  }, [layerOrder, textLayers, shapeLayers, overlayLayers])

  // Unified layer ordering functions
  const moveLayerUp = (type, id) => {
    const index = layerOrder.findIndex(l => l.type === type && l.id === id)
    if (index < layerOrder.length - 1) {
      const newOrder = [...layerOrder]
      const temp = newOrder[index]
      newOrder[index] = newOrder[index + 1]
      newOrder[index + 1] = temp
      setLayerOrder(newOrder)
    }
  }

  const moveLayerDown = (type, id) => {
    const index = layerOrder.findIndex(l => l.type === type && l.id === id)
    if (index > 0) {
      const newOrder = [...layerOrder]
      const temp = newOrder[index]
      newOrder[index] = newOrder[index - 1]
      newOrder[index - 1] = temp
      setLayerOrder(newOrder)
    }
  }

  const moveLayerToTop = (type, id) => {
    const item = layerOrder.find(l => l.type === type && l.id === id)
    if (item) {
      const newOrder = layerOrder.filter(l => !(l.type === type && l.id === id))
      newOrder.push(item)
      setLayerOrder(newOrder)
    }
  }

  const moveLayerToBottom = (type, id) => {
    const item = layerOrder.find(l => l.type === type && l.id === id)
    if (item) {
      const newOrder = layerOrder.filter(l => !(l.type === type && l.id === id))
      newOrder.unshift(item)
      setLayerOrder(newOrder)
    }
  }

  const toggleLayerVisibility = (type, id) => {
    const newOrder = layerOrder.map(l =>
      l.type === type && l.id === id ? { ...l, visible: !l.visible } : l
    )
    setLayerOrder(newOrder)
  }

  const deleteLayer = (type, id) => {
    if (type === 'text') {
      const newLayers = textLayers.filter(l => l.id !== id)
      setTextLayers(newLayers)
      if (selectedLayer?.id === id) setSelectedLayer(null)
    } else if (type === 'shape') {
      const newShapes = shapeLayers.filter(s => s.id !== id)
      setShapeLayers(newShapes)
      if (selectedShape?.id === id) setSelectedShape(null)
    } else if (type === 'overlay') {
      const newOverlays = overlayLayers.filter(o => o.id !== id)
      setOverlayLayers(newOverlays)
      if (selectedOverlayLayer?.id === id) setSelectedOverlayLayer(null)
    }
    // layerOrder will auto-sync via useEffect
  }

  const selectLayer = (type, id) => {
    if (type === 'text') {
      const layer = textLayers.find(l => l.id === id)
      if (layer) {
        setSelectedLayer(layer)
        setSelectedShape(null)
        setSelectedOverlayLayer(null)
        setActivePanel('text')
      }
    } else if (type === 'shape') {
      const shape = shapeLayers.find(s => s.id === id)
      if (shape) {
        setSelectedShape(shape)
        setSelectedLayer(null)
        setSelectedOverlayLayer(null)
        setActivePanel('shapes')
      }
    } else if (type === 'overlay') {
      const overlay = overlayLayers.find(o => o.id === id)
      if (overlay) {
        setSelectedOverlayLayer(overlay)
        setSelectedLayer(null)
        setSelectedShape(null)
      }
    }
  }

  // Layer ordering functions
  const bringLayerForward = () => {
    if (!selectedLayer) return
    const currentIndex = textLayers.findIndex(l => l.id === selectedLayer.id)
    if (currentIndex < textLayers.length - 1) {
      const newLayers = [...textLayers]
      const temp = newLayers[currentIndex]
      newLayers[currentIndex] = newLayers[currentIndex + 1]
      newLayers[currentIndex + 1] = temp
      setTextLayers(newLayers)
    }
  }

  const sendLayerBackward = () => {
    if (!selectedLayer) return
    const currentIndex = textLayers.findIndex(l => l.id === selectedLayer.id)
    if (currentIndex > 0) {
      const newLayers = [...textLayers]
      const temp = newLayers[currentIndex]
      newLayers[currentIndex] = newLayers[currentIndex - 1]
      newLayers[currentIndex - 1] = temp
      setTextLayers(newLayers)
    }
  }

  const bringLayerToFront = () => {
    if (!selectedLayer) return
    const newLayers = textLayers.filter(l => l.id !== selectedLayer.id)
    newLayers.push(selectedLayer)
    setTextLayers(newLayers)
  }

  const sendLayerToBack = () => {
    if (!selectedLayer) return
    const newLayers = textLayers.filter(l => l.id !== selectedLayer.id)
    newLayers.unshift(selectedLayer)
    setTextLayers(newLayers)
  }

  // Shape ordering functions
  const bringShapeForward = () => {
    if (!selectedShape) return
    const currentIndex = shapeLayers.findIndex(s => s.id === selectedShape.id)
    if (currentIndex < shapeLayers.length - 1) {
      const newShapes = [...shapeLayers]
      const temp = newShapes[currentIndex]
      newShapes[currentIndex] = newShapes[currentIndex + 1]
      newShapes[currentIndex + 1] = temp
      setShapeLayers(newShapes)
    }
  }

  const sendShapeBackward = () => {
    if (!selectedShape) return
    const currentIndex = shapeLayers.findIndex(s => s.id === selectedShape.id)
    if (currentIndex > 0) {
      const newShapes = [...shapeLayers]
      const temp = newShapes[currentIndex]
      newShapes[currentIndex] = newShapes[currentIndex - 1]
      newShapes[currentIndex - 1] = temp
      setShapeLayers(newShapes)
    }
  }

  const bringShapeToFront = () => {
    if (!selectedShape) return
    const newShapes = shapeLayers.filter(s => s.id !== selectedShape.id)
    newShapes.push(selectedShape)
    setShapeLayers(newShapes)
  }

  const sendShapeToBack = () => {
    if (!selectedShape) return
    const newShapes = shapeLayers.filter(s => s.id !== selectedShape.id)
    newShapes.unshift(selectedShape)
    setShapeLayers(newShapes)
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

  // Apply text preset function
  const applyTextPreset = (preset) => {
    const previousLayers = [...textLayers]
    const previousSelected = selectedLayer
    
    // Create MULTIPLE text layers - one for each line in the preview
    // Position them tightly together with auto-sized boxes
    const previewLines = Object.values(preset.preview)
    const newLayers = []
    const baseTimestamp = Date.now()
    const groupId = `preset-${baseTimestamp}` // Unique group ID for this preset
    const baseX = 10
    let yOffset = 10
    
    // Canvas dimensions for percentage calculations
    const baseCanvasWidth = 1280
    const baseCanvasHeight = 720
    
    previewLines.forEach((line, index) => {
      const fontSize = line.fontSize || 24
      
      // Calculate text width more accurately based on font properties
      // Account for bold text (wider), italic (slightly wider), letter spacing
      let charWidth = fontSize * 0.55 // Base character width
      
      // Adjust for font weight
      if (line.fontWeight === 'bold' || line.fontWeight === '700' || line.fontWeight === '800') {
        charWidth *= 1.15
      }
      
      // Adjust for italic
      if (line.fontStyle === 'italic') {
        charWidth *= 1.05
      }
      
      // Parse letter spacing
      const letterSpacingPx = line.letterSpacing && line.letterSpacing !== 'normal' ? 
        (typeof line.letterSpacing === 'string' && line.letterSpacing.includes('px') ? 
          parseFloat(line.letterSpacing) : 
          parseFloat(line.letterSpacing) || 0
        ) : 0
      
      // Calculate total width: (chars * charWidth) + letter spacing
      const estimatedWidth = (line.text.length * charWidth) + (line.text.length * letterSpacingPx * 0.08)
      
      // Convert pixel width to percentage
      const textWidth = Math.max((estimatedWidth / baseCanvasWidth) * 100, 8) // Min 8%
      
      // Height as percentage of canvas
      const textHeight = Math.max(((fontSize * 1.3) / baseCanvasHeight) * 100, 3) // Min 3%
      
      const newLayer = {
        id: baseTimestamp + index,
        text: line.text,
        x: baseX,
        y: yOffset,
        width: textWidth,
        height: textHeight,
        fontSize: fontSize,
        fontFamily: line.fontFamily || 'Arial',
        color: line.color || '#000000',
        fontWeight: line.fontWeight || 'normal',
        fontStyle: line.fontStyle || 'normal',
        textAlign: preset.config.textAlign || 'center',
        textShadow: line.textShadow || preset.config.textShadow || 'none',
        textGlow: preset.config.textGlow || 'none',
        wordArt: preset.config.wordArt || 'none',
        backgroundColor: '',
        textDecoration: 'none',
        letterSpacing: line.letterSpacing || 'normal',
        groupId: groupId // Add group ID for synchronized movement
      }
      
      newLayers.push(newLayer)
      // Increment Y position for next line - tight spacing
      yOffset += ((fontSize * 1.05) / baseCanvasHeight) * 100
    })
    
    const updatedLayers = [...textLayers, ...newLayers]
    setTextLayers(updatedLayers)
    // Select the first layer of the preset
    setSelectedLayer(newLayers[0])
    
    // Save to history
    saveToHistory('text_add', {
      previousLayers,
      previousSelected,
      newLayers: updatedLayers,
      newSelected: newLayers[0]
    })
  }

  const [newText, setNewText] = useState('')

  const handleLayerClick = (layer) => {
    // Toggle selection: if clicking on already selected layer, keep it selected
    // If clicking on new layer, select it
    if (selectedLayer?.id !== layer.id) {
    setSelectedLayer(layer)
    setSelectedShape(null)
    }
    // Don't auto-open text panel on click - user can manually open it from toolbar
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

  // Render all overlay layers
  const renderAllOverlayLayers = () => {
    const { scaleX, scaleY } = getImageScale()
    const overlays = []
    
    // Render all overlays from overlayLayers array
    overlayLayers.forEach((overlayLayer) => {
      if (!overlayLayer.image && !overlayLayer.imageUrl) return
      
      // Get z-index from layer order
      const layerOrderIndex = layerOrder.findIndex(l => l.type === 'overlay' && l.id === overlayLayer.id)
      const layerData = layerOrder.find(l => l.type === 'overlay' && l.id === overlayLayer.id)
      const isVisible = layerData?.visible !== false
      
      if (!isVisible) return // Hide if visibility is off
      
      const widthPx = Math.max(overlayLayer.width * scaleX, 1)
      const heightPx = Math.max(overlayLayer.height * scaleY, 1)
      const isSelected = selectedOverlayLayer?.id === overlayLayer.id
      
      overlays.push(
        <div
          key={`overlay-layer-${overlayLayer.id}`}
          data-overlay-layer={overlayLayer.id}
          className="absolute"
          style={{
            position: 'absolute',
            left: overlayLayer.x * scaleX,
            top: overlayLayer.y * scaleY,
            width: widthPx,
            height: heightPx,
            transformOrigin: 'top left',
            border: isSelected ? '2px solid #7c3aed' : '2px solid transparent',
            boxSizing: 'border-box',
            cursor: 'move',
            zIndex: 50 + layerOrderIndex // Use layer order for z-index
          }}
          onClick={(e) => {
            e.stopPropagation()
            setSelectedOverlayLayer(overlayLayer)
            setSelectedLayer(null)
            setSelectedShape(null)
          }}
          onMouseDown={(e) => {
            // Only allow dragging from the overlay itself, not from buttons
            if (e.target === e.currentTarget || e.target.tagName === 'IMG') {
              e.stopPropagation()
              setSelectedOverlayLayer(overlayLayer)
              setSelectedLayer(null)
              setSelectedShape(null)
              handleOverlayLayerMouseDown(e, overlayLayer.id, 'drag')
            }
          }}
          onMouseEnter={() => {
            if (overlayHoverTimeoutRef.current) {
              clearTimeout(overlayHoverTimeoutRef.current)
            }
            setHoveredOverlay(true)
            setHoveredOverlayLayerId(overlayLayer.id)
          }}
          onMouseLeave={() => {
            overlayHoverTimeoutRef.current = setTimeout(() => {
              setHoveredOverlay(false)
              setHoveredOverlayLayerId(null)
              overlayHoverTimeoutRef.current = null
            }, 200)
          }}
        >
          <img
            src={overlayLayer.imageUrl || overlayLayer.fileUrl}
            alt={`Overlay ${overlayLayer.id}`}
            draggable="false"
            style={{
              width: '100%',
              height: '100%',
              display: 'block',
              objectFit: 'fill',
              pointerEvents: 'none'
            }}
          />
          {/* Action buttons - top-right */}
          {(hoveredOverlayLayerId === overlayLayer.id || isSelected) && (
            <div className="absolute -top-2 right-2 z-20 flex gap-1">
              {/* Crop button */}
              {!isCropping && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedOverlayLayer(overlayLayer)
                    setSelectedLayer(null)
                    setSelectedShape(null)
                    startCropping('overlay-layer')
                    setHoveredOverlayLayerId(null)
                  }}
                  className="w-6 h-6 bg-white/90 border border-purple-500 text-purple-600 rounded-full flex items-center justify-center shadow-md hover:bg-purple-50 transition"
                  title="Crop Overlay Layer"
                  onMouseEnter={() => {
                    if (overlayHoverTimeoutRef.current) {
                      clearTimeout(overlayHoverTimeoutRef.current)
                      overlayHoverTimeoutRef.current = null
                    }
                  }}
                >
                  <Icon name="crop" size={12} />
                </button>
              )}
              {/* Remove background button */}
              {!isCropping && (
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    setSelectedOverlayLayer(overlayLayer)
                    setSelectedLayer(null)
                    setSelectedShape(null)
                    const isBgRemoved = overlayLayerBackgroundRemoved.get(overlayLayer.id)
                    if (isBgRemoved) {
                      undoOverlayLayerBackground()
                    } else {
                      removeOverlayLayerBackground()
                    }
                    setHoveredOverlayLayerId(null)
                  }}
                  disabled={isRemovingOverlayLayerBackground}
                  className={`w-6 h-6 rounded-full flex items-center justify-center shadow-md transition ${
                    isRemovingOverlayLayerBackground
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : overlayLayerBackgroundRemoved.get(overlayLayer.id)
                        ? 'bg-white/90 border border-gray-500 text-gray-700 hover:bg-gray-50'
                        : 'bg-white/90 border border-rose-500 text-rose-600 hover:bg-rose-50'
                  }`}
                  title={overlayLayerBackgroundRemoved.get(overlayLayer.id) ? 'Restore Background' : 'Remove Background'}
                  onMouseEnter={() => {
                    if (overlayHoverTimeoutRef.current) {
                      clearTimeout(overlayHoverTimeoutRef.current)
                      overlayHoverTimeoutRef.current = null
                    }
                  }}
                >
                  {isRemovingOverlayLayerBackground ? (
                    <span className="inline-block w-3 h-3 border-2 border-current border-t-transparent rounded-full animate-spin" />
                  ) : overlayLayerBackgroundRemoved.get(overlayLayer.id) ? (
                    <Icon name="undo" size={12} />
                  ) : (
                    <Icon name="imageCut" size={12} />
                  )}
                </button>
              )}
              {/* Delete button */}
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setSelectedOverlayLayer(overlayLayer)
                  handleOverlayLayerDelete()
                  setHoveredOverlayLayerId(null)
                }}
                className="w-6 h-6 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-lg transition-all"
                title="Delete Overlay Layer"
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
            </div>
          )}
          {/* Crop controls when cropping this overlay layer */}
          {/* Resize handle - bottom-right (like shapes) */}
          {isSelected && (
            <div
              className="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-600 border-2 border-white rounded-full cursor-nwse-resize z-10 shadow-sm"
              onMouseDown={(e) => {
                e.stopPropagation()
                handleOverlayLayerMouseDown(e, overlayLayer.id, 'resize', 'se')
              }}
              title="Resize overlay"
            />
          )}
        </div>
      )
    })
    
    // Render crop area for overlay layers
    if (isCropping && croppingTarget === 'overlay-layer' && selectedOverlayLayer && imageRef.current) {
      const { scaleX, scaleY } = getImageScale()
      const overlayLayer = selectedOverlayLayer
      const overlayDisplayX = overlayLayer.x * scaleX
      const overlayDisplayY = overlayLayer.y * scaleY
      const overlayWidth = Math.max(overlayLayer.width * scaleX, 1)
      const overlayHeight = Math.max(overlayLayer.height * scaleY, 1)
      const rawLeft = cropArea.x - overlayDisplayX
      const rawTop = cropArea.y - overlayDisplayY
      const selectionLeft = Math.min(Math.max(0, rawLeft), overlayWidth)
      const selectionTop = Math.min(Math.max(0, rawTop), overlayHeight)
      const selectionWidth = Math.max(
        20,
        Math.min(cropArea.width, overlayWidth - selectionLeft)
      )
      const selectionHeight = Math.max(
        20,
        Math.min(cropArea.height, overlayHeight - selectionTop)
      )
      const rightWidth = Math.max(0, overlayWidth - (selectionLeft + selectionWidth))
      const bottomHeight = Math.max(0, overlayHeight - (selectionTop + selectionHeight))
      const controlsTop = Math.max(selectionTop - 32, 0)
      const controlsLeft = selectionLeft
      
      overlays.push(
        <div
          key="overlay-layer-crop-area"
          className="absolute pointer-events-none z-[1100]"
          style={{
            left: overlayDisplayX,
            top: overlayDisplayY,
            width: overlayWidth,
            height: overlayHeight
          }}
        >
          <div className="absolute inset-0">
            <div
              className="absolute"
              style={{
                left: 0,
                top: 0,
                width: overlayWidth,
                height: selectionTop,
                backgroundColor: 'rgba(0, 0, 0, 0.85)'
              }}
            />
            <div
              className="absolute"
              style={{
                left: 0,
                top: selectionTop,
                width: selectionLeft,
                height: selectionHeight,
                backgroundColor: 'rgba(0, 0, 0, 0.85)'
              }}
            />
            <div
              className="absolute"
              style={{
                left: selectionLeft + selectionWidth,
                top: selectionTop,
                width: rightWidth,
                height: selectionHeight,
                backgroundColor: 'rgba(0, 0, 0, 0.85)'
              }}
            />
            <div
              className="absolute"
              style={{
                left: 0,
                top: selectionTop + selectionHeight,
                width: overlayWidth,
                height: bottomHeight,
                backgroundColor: 'rgba(0, 0, 0, 0.85)'
              }}
            />
          </div>
          <div
            className="absolute border-2 border-solid border-white shadow-[0_0_0_2px_rgba(147,51,234,0.8)] z-[1101]"
            style={{
              left: selectionLeft,
              top: selectionTop,
              width: selectionWidth,
              height: selectionHeight,
              borderRadius: cropShape === 'circle' ? '9999px' : '0px',
              backgroundColor: 'transparent',
              pointerEvents: 'auto',
              cursor: 'move'
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
              setLayerStart({
                x: cropArea.x,
                y: cropArea.y,
                width: cropArea.width,
                height: cropArea.height
              })
            }}
          />
          <div
            className="absolute flex gap-2 pointer-events-auto z-[1102]"
            style={{
              left: controlsLeft,
              top: controlsTop
            }}
          >
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                cancelCrop()
              }}
              className="w-7 h-7 bg-gray-100 border border-gray-300 text-gray-600 rounded-full flex items-center justify-center shadow-md hover:bg-gray-200 transition"
              title="Cancel Crop"
            >
              <Icon name="close" size={12} />
            </button>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation()
                applyCrop()
              }}
              className="w-7 h-7 bg-white/90 border border-gray-300 text-gray-600 rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition"
              title="Apply Crop"
            >
              <span role="img" aria-label="Apply crop">💾</span>
            </button>
          </div>
          {/* Corner handles */}
          <div
            className="absolute w-4 h-4 bg-white border-2 border-purple-600 rounded-sm cursor-nwse-resize z-[1102] shadow-lg pointer-events-auto"
            style={{
              left: selectionLeft - 8,
              top: selectionTop - 8
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              setCropDragMode('nw')
              setDragStart({ x: e.clientX, y: e.clientY })
              setLayerStart({
                x: cropArea.x,
                y: cropArea.y,
                width: cropArea.width,
                height: cropArea.height
              })
            }}
          />
          <div
            className="absolute w-4 h-4 bg-white border-2 border-purple-600 rounded-sm cursor-nesw-resize z-[1102] shadow-lg pointer-events-auto"
            style={{
              left: selectionLeft + selectionWidth - 8,
              top: selectionTop - 8
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              setCropDragMode('ne')
              setDragStart({ x: e.clientX, y: e.clientY })
              setLayerStart({
                x: cropArea.x,
                y: cropArea.y,
                width: cropArea.width,
                height: cropArea.height
              })
            }}
          />
          <div
            className="absolute w-4 h-4 bg-white border-2 border-purple-600 rounded-sm cursor-nesw-resize z-[1102] shadow-lg pointer-events-auto"
            style={{
              left: selectionLeft - 8,
              top: selectionTop + selectionHeight - 8
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              setCropDragMode('sw')
              setDragStart({ x: e.clientX, y: e.clientY })
              setLayerStart({
                x: cropArea.x,
                y: cropArea.y,
                width: cropArea.width,
                height: cropArea.height
              })
            }}
          />
          <div
            className="absolute w-4 h-4 bg-white border-2 border-purple-600 rounded-sm cursor-nwse-resize z-[1102] shadow-lg pointer-events-auto"
            style={{
              left: selectionLeft + selectionWidth - 8,
              top: selectionTop + selectionHeight - 8
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              setCropDragMode('se')
              setDragStart({ x: e.clientX, y: e.clientY })
              setLayerStart({
                x: cropArea.x,
                y: cropArea.y,
                width: cropArea.width,
                height: cropArea.height
              })
            }}
          />
          {/* Side handles */}
          <div
            className="absolute w-8 h-2 bg-white border-2 border-purple-600 rounded-sm cursor-ns-resize z-[1102] shadow-lg pointer-events-auto"
            style={{
              left: selectionLeft + selectionWidth / 2 - 16,
              top: selectionTop - 4
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              setCropDragMode('n')
              setDragStart({ x: e.clientX, y: e.clientY })
              setLayerStart({
                x: cropArea.x,
                y: cropArea.y,
                width: cropArea.width,
                height: cropArea.height
              })
            }}
          />
          <div
            className="absolute w-8 h-2 bg-white border-2 border-purple-600 rounded-sm cursor-ns-resize z-[1102] shadow-lg pointer-events-auto"
            style={{
              left: selectionLeft + selectionWidth / 2 - 16,
              top: selectionTop + selectionHeight - 4
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              setCropDragMode('s')
              setDragStart({ x: e.clientX, y: e.clientY })
              setLayerStart({
                x: cropArea.x,
                y: cropArea.y,
                width: cropArea.width,
                height: cropArea.height
              })
            }}
          />
          <div
            className="absolute w-2 h-8 bg-white border-2 border-purple-600 rounded-sm cursor-ew-resize z-[1102] shadow-lg pointer-events-auto"
            style={{
              left: selectionLeft - 4,
              top: selectionTop + selectionHeight / 2 - 16
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              setCropDragMode('w')
              setDragStart({ x: e.clientX, y: e.clientY })
              setLayerStart({
                x: cropArea.x,
                y: cropArea.y,
                width: cropArea.width,
                height: cropArea.height
              })
            }}
          />
          <div
            className="absolute w-2 h-8 bg-white border-2 border-purple-600 rounded-sm cursor-ew-resize z-[1102] shadow-lg pointer-events-auto"
            style={{
              left: selectionLeft + selectionWidth - 4,
              top: selectionTop + selectionHeight / 2 - 16
            }}
            onMouseDown={(e) => {
              e.stopPropagation()
              setCropDragMode('e')
              setDragStart({ x: e.clientX, y: e.clientY })
              setLayerStart({
                x: cropArea.x,
                y: cropArea.y,
                width: cropArea.width,
                height: cropArea.height
              })
            }}
          />
        </div>
      )
    }
    
    // Also render the main overlay image if it exists and is not already in overlayLayers
    if (overlayVisible && overlayImage) {
      const isInLayers = overlayLayers.some(ol => ol.imageUrl === overlayImageUrl)
      if (!isInLayers) {
    const overlayWidth = overlaySize?.width || (overlayImage.width * overlayScale)
    const overlayHeight = overlaySize?.height || (overlayImage.height * overlayScale)
    const widthPx = Math.max(overlayWidth * scaleX, 1)
    const heightPx = Math.max(overlayHeight * scaleY, 1)
    
        overlays.push(
      <div
            key="main-overlay"
        className="absolute z-5 cursor-move"
        style={{
          position: 'absolute',
          left: overlayPosition.x * scaleX,
          top: overlayPosition.y * scaleY,
          width: widthPx,
          height: heightPx,
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
            display: 'block'
          }}
        />
        {(isOverlayUploading || isRemovingBackground || (isApplyingCrop && croppingTarget === 'overlay')) && (
          <div className="absolute inset-0 bg-white/60 backdrop-blur-[1px] flex items-center justify-center z-20 pointer-events-none">
            <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        {hoveredOverlay && (
          <div className="absolute -top-2 right-2 z-10 flex gap-2">
            {!isCropping && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  startCropping('overlay')
                  setHoveredOverlay(false)
                }}
                className="w-7 h-7 bg-white/90 border border-purple-500 text-purple-600 rounded-full flex items-center justify-center shadow-md hover:bg-purple-50 transition"
                title="Crop Overlay"
                onMouseEnter={() => {
                  if (overlayHoverTimeoutRef.current) {
                    clearTimeout(overlayHoverTimeoutRef.current)
                    overlayHoverTimeoutRef.current = null
                  }
                }}
              >
                <Icon name="crop" size={12} />
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleOverlayRemove()
                setHoveredOverlay(false)
              }}
              className="w-7 h-7 bg-red-600 hover:bg-red-700 text-white rounded-full flex items-center justify-center shadow-md transition"
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
            <button
              type="button"
              onClick={handleOverlayOptionsToggle}
              className="w-7 h-7 bg-white/90 border border-gray-300 text-gray-600 rounded-full flex items-center justify-center shadow-md hover:bg-gray-100 transition"
              title="Overlay Options"
              onMouseEnter={() => {
                if (overlayHoverTimeoutRef.current) {
                  clearTimeout(overlayHoverTimeoutRef.current)
                  overlayHoverTimeoutRef.current = null
                }
              }}
            >
              <Icon name="more" size={12} />
            </button>
          </div>
        )}
        {/* Four corner resize handles */}
        <div
          className="absolute -top-1 -left-1 w-3 h-3 bg-purple-600 border-2 border-white rounded-full cursor-nwse-resize z-10 shadow-sm"
          onMouseDown={(e) => {
            e.stopPropagation()
            handleOverlayMouseDown(e, 'resize', 'nw')
          }}
          title="Resize from top-left"
        />
        <div
          className="absolute -top-1 -right-1 w-3 h-3 bg-purple-600 border-2 border-white rounded-full cursor-nesw-resize z-10 shadow-sm"
          onMouseDown={(e) => {
            e.stopPropagation()
            handleOverlayMouseDown(e, 'resize', 'ne')
          }}
          title="Resize from top-right"
        />
        <div
          className="absolute -bottom-1 -left-1 w-3 h-3 bg-purple-600 border-2 border-white rounded-full cursor-nesw-resize z-10 shadow-sm"
          onMouseDown={(e) => {
            e.stopPropagation()
            handleOverlayMouseDown(e, 'resize', 'sw')
          }}
          title="Resize from bottom-left"
        />
        <div
          className="absolute -bottom-1 -right-1 w-3 h-3 bg-purple-600 border-2 border-white rounded-full cursor-nwse-resize z-10 shadow-sm"
          onMouseDown={(e) => {
            e.stopPropagation()
            handleOverlayMouseDown(e, 'resize', 'se')
          }}
          title="Resize from bottom-right"
        />
        {isCropping && croppingTarget === 'overlay' && imageRef.current && (() => {
          const { scaleX, scaleY } = getImageScale()
          const overlayDisplayX = overlayPosition.x * scaleX
          const overlayDisplayY = overlayPosition.y * scaleY
          const overlayWidth = Math.max(1, widthPx)
          const overlayHeight = Math.max(1, heightPx)
          const rawLeft = cropArea.x - overlayDisplayX
          const rawTop = cropArea.y - overlayDisplayY
          const selectionLeft = Math.min(Math.max(0, rawLeft), overlayWidth)
          const selectionTop = Math.min(Math.max(0, rawTop), overlayHeight)
          const selectionWidth = Math.max(
            20,
            Math.min(cropArea.width, overlayWidth - selectionLeft)
          )
          const selectionHeight = Math.max(
            20,
            Math.min(cropArea.height, overlayHeight - selectionTop)
          )
          const rightWidth = Math.max(0, overlayWidth - (selectionLeft + selectionWidth))
          const bottomHeight = Math.max(0, overlayHeight - (selectionTop + selectionHeight))
          const controlsTop = Math.max(selectionTop - 32, 0)
          const controlsLeft = selectionLeft
          return (
            <>
              <div className="absolute inset-0 pointer-events-none z-[1100]">
                <div
                  className="absolute"
                  style={{
                    left: 0,
                    top: 0,
                    width: overlayWidth,
                    height: selectionTop,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)'
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    left: 0,
                    top: selectionTop,
                    width: selectionLeft,
                    height: selectionHeight,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)'
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    left: selectionLeft + selectionWidth,
                    top: selectionTop,
                    width: rightWidth,
                    height: selectionHeight,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)'
                  }}
                />
                <div
                  className="absolute"
                  style={{
                    left: 0,
                    top: selectionTop + selectionHeight,
                    width: overlayWidth,
                    height: bottomHeight,
                    backgroundColor: 'rgba(0, 0, 0, 0.85)'
                  }}
                />
              </div>
              <div
                className="absolute border-2 border-solid border-white shadow-[0_0_0_2px_rgba(147,51,234,0.8)] z-[1101]"
                style={{
                  left: selectionLeft,
                  top: selectionTop,
                  width: selectionWidth,
                  height: selectionHeight,
                  borderRadius: cropShape === 'circle' ? '9999px' : '0px',
                  backgroundColor: 'transparent',
                  pointerEvents: 'auto',
                  cursor: 'move'
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
                  setLayerStart({
                    x: cropArea.x,
                    y: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height
                  })
                }}
              />
              {/* Corner handles for overlay crop */}
              <div
                className="absolute w-4 h-4 bg-white border-2 border-purple-600 rounded-sm cursor-nwse-resize z-[1102] shadow-lg"
                style={{
                  left: selectionLeft - 8,
                  top: selectionTop - 8
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  setCropDragMode('nw')
                  setDragStart({ x: e.clientX, y: e.clientY })
                  setLayerStart({
                    x: cropArea.x,
                    y: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height
                  })
                }}
              />
              <div
                className="absolute w-4 h-4 bg-white border-2 border-purple-600 rounded-sm cursor-nesw-resize z-[1102] shadow-lg"
                style={{
                  left: selectionLeft + selectionWidth - 8,
                  top: selectionTop - 8
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  setCropDragMode('ne')
                  setDragStart({ x: e.clientX, y: e.clientY })
                  setLayerStart({
                    x: cropArea.x,
                    y: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height
                  })
                }}
              />
              <div
                className="absolute w-4 h-4 bg-white border-2 border-purple-600 rounded-sm cursor-nesw-resize z-[1102] shadow-lg"
                style={{
                  left: selectionLeft - 8,
                  top: selectionTop + selectionHeight - 8
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  setCropDragMode('sw')
                  setDragStart({ x: e.clientX, y: e.clientY })
                  setLayerStart({
                    x: cropArea.x,
                    y: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height
                  })
                }}
              />
              <div
                className="absolute w-4 h-4 bg-white border-2 border-purple-600 rounded-sm cursor-nwse-resize z-[1102] shadow-lg"
                style={{
                  left: selectionLeft + selectionWidth - 8,
                  top: selectionTop + selectionHeight - 8
                }}
                onMouseDown={(e) => {
                  e.stopPropagation()
                  setCropDragMode('se')
                  setDragStart({ x: e.clientX, y: e.clientY })
                  setLayerStart({
                    x: cropArea.x,
                    y: cropArea.y,
                    width: cropArea.width,
                    height: cropArea.height
                  })
                }}
              />
              <div
                className="absolute flex gap-2 pointer-events-auto z-[1102]"
                style={{
                  left: controlsLeft,
                  top: controlsTop
                }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    cancelCrop()
                    setHoveredOverlay(false)
                  }}
                  className="w-7 h-7 bg-gray-100 border border-gray-300 text-gray-600 rounded-full flex items-center justify-center shadow-md hover:bg-gray-200 transition"
                  title="Cancel Overlay Crop"
                >
                  <Icon name="close" size={12} />
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    applyCrop()
                    setHoveredOverlay(false)
                  }}
                  className="w-7 h-7 bg-white/90 border border-gray-300 text-gray-600 rounded-full flex items-center justify-center shadow-md hover:bg-gray-50 transition"
                  title="Save Overlay Crop"
                >
                  <span role="img" aria-label="Save overlay crop">
                    💾
                  </span>
                </button>
              </div>
            </>
          )
        })()}
      </div>
    )
      }
    }
    
    return <>{overlays}</>
  }

  // Convert shape to PNG
  const convertShapeToPNG = async (shape) => {
    try {
      // Create a canvas for the shape
      const padding = Math.max(shape.borderWidth || 0, 10) // Add padding for borders
      const canvas = document.createElement('canvas')
      canvas.width = shape.width + (padding * 2)
      canvas.height = shape.height + (padding * 2)
      const ctx = canvas.getContext('2d')

      // Enable high DPI rendering
      const dpr = window.devicePixelRatio || 1
      canvas.width = (shape.width + (padding * 2)) * dpr
      canvas.height = (shape.height + (padding * 2)) * dpr
      ctx.scale(dpr, dpr)

      // Translate to center (accounting for padding)
      ctx.translate(padding, padding)

      // Apply rotation if needed
      if (shape.rotation) {
        ctx.translate(shape.width / 2, shape.height / 2)
        ctx.rotate((shape.rotation * Math.PI) / 180)
        ctx.translate(-shape.width / 2, -shape.height / 2)
      }

      // Set opacity
      ctx.globalAlpha = shape.opacity ?? 1

      const fillColor = shape.fill || 'transparent'
      const strokeColor = shape.borderColor || '#000000'
      const strokeWidth = shape.borderWidth || 0

      // Draw shape based on type
      if (shape.type === 'rectangle' || shape.type === 'square') {
        const borderRadius = shape.borderRadius || 0
        if (borderRadius > 0) {
          const r = Math.min(borderRadius, shape.width / 2, shape.height / 2)
          ctx.beginPath()
          ctx.moveTo(r, 0)
          ctx.lineTo(shape.width - r, 0)
          ctx.quadraticCurveTo(shape.width, 0, shape.width, r)
          ctx.lineTo(shape.width, shape.height - r)
          ctx.quadraticCurveTo(shape.width, shape.height, shape.width - r, shape.height)
          ctx.lineTo(r, shape.height)
          ctx.quadraticCurveTo(0, shape.height, 0, shape.height - r)
          ctx.lineTo(0, r)
          ctx.quadraticCurveTo(0, 0, r, 0)
          ctx.closePath()
        } else {
          ctx.rect(0, 0, shape.width, shape.height)
        }

        if (fillColor !== 'transparent') {
          ctx.fillStyle = fillColor
          ctx.fill()
        }

        if (strokeWidth > 0) {
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = strokeWidth
          ctx.stroke()
        }
      } else if (shape.type === 'circle') {
        const radius = Math.min(shape.width, shape.height) / 2
        ctx.beginPath()
        ctx.arc(shape.width / 2, shape.height / 2, radius, 0, Math.PI * 2)
        ctx.closePath()

        if (fillColor !== 'transparent') {
          ctx.fillStyle = fillColor
          ctx.fill()
        }

        if (strokeWidth > 0) {
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = strokeWidth
          ctx.stroke()
        }
      } else if (shape.type === 'triangle') {
        ctx.beginPath()
        ctx.moveTo(shape.width / 2, 0)
        ctx.lineTo(0, shape.height)
        ctx.lineTo(shape.width, shape.height)
        ctx.closePath()

        if (fillColor !== 'transparent') {
          ctx.fillStyle = fillColor
          ctx.fill()
        }

        if (strokeWidth > 0) {
          ctx.strokeStyle = strokeColor
          ctx.lineWidth = strokeWidth
          ctx.stroke()
        }
      } else if (shape.type === 'line') {
        ctx.beginPath()
        ctx.moveTo(0, shape.height / 2)
        ctx.lineTo(shape.width, shape.height / 2)
        ctx.strokeStyle = strokeColor
        ctx.lineWidth = strokeWidth || 2
        ctx.stroke()
      }

      // Convert canvas to blob
      return new Promise((resolve, reject) => {
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob)
          } else {
            reject(new Error('Failed to convert shape to blob'))
          }
        }, 'image/png')
      })
    } catch (error) {
      console.error('Error converting shape to PNG:', error)
      throw error
    }
  }

  // Upload shape PNG to server
  const uploadShapePNG = async (blob, shapeId) => {
    try {
      const sessionId = localStorage.getItem('session_id')
      if (!sessionId) {
        throw new Error('Missing session ID')
      }

      const formData = new FormData()
      formData.append('session_id', sessionId)
      formData.append('file', blob, `shape-${shapeId}.png`)

      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/api/upload-file', {
        method: 'POST',
        body: formData
      })

      const responseText = await response.text()
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch (_) {
        responseData = responseText
      }

      if (!response.ok) {
        throw new Error(`Upload failed: ${response.status} ${responseText}`)
      }

      // Extract file_url from response
      const fileUrl = responseData?.file_url || 
                     responseData?.url || 
                     responseData?.image_url ||
                     responseData?.data?.file_url ||
                     responseData?.data?.url ||
                     responseData?.data?.image_url

      if (!fileUrl) {
        throw new Error('Upload API did not return file_url')
      }

      return fileUrl
    } catch (error) {
      console.error('Error uploading shape PNG:', error)
      throw error
    }
  }

  const handleAddShape = async (type) => {
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
      fill: defaultShapeColor,
      borderColor: '#000000',
      borderWidth: 2,
      borderStyle: 'solid',
      borderRadius: 12,
      rotation: 0,
      opacity: 1,
      fileUrl: null, // Will be set after upload
      isUploading: true // Track upload state
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
        baseShape.fill = defaultShapeColor
        baseShape.borderColor = defaultShapeColor
        baseShape.borderWidth = 8
        baseShape.borderStyle = 'solid'
        baseShape.borderRadius = 0
        break
      case 'curve':
        baseShape.width = 260
        baseShape.height = 40
        baseShape.fill = 'transparent'
        baseShape.borderColor = defaultShapeColor
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

    // Convert shape to PNG and upload
    try {
      const blob = await convertShapeToPNG(baseShape)
      const fileUrl = await uploadShapePNG(blob, baseShape.id)
      
      // Update shape with file URL
      const updatedShape = { ...baseShape, fileUrl, isUploading: false }
      const updatedLayers = newLayers.map(s => s.id === baseShape.id ? updatedShape : s)
      setShapeLayers(updatedLayers)
      setSelectedShape(updatedShape)
      
      console.log('✅ Shape uploaded successfully:', fileUrl)
    } catch (error) {
      console.error('❌ Failed to upload shape:', error)
      // Remove isUploading flag even on error
      const updatedShape = { ...baseShape, isUploading: false }
      const updatedLayers = newLayers.map(s => s.id === baseShape.id ? updatedShape : s)
      setShapeLayers(updatedLayers)
      alert('Failed to upload shape. Please try again.')
    }

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

    // Also remove from layerOrder if it exists
    setLayerOrder(prev => prev.filter(item => !(item.type === 'shape' && item.id === selectedShape.id)))

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
      setDragThresholdMet(false) // Reset threshold
      setDragStart({ x: e.clientX, y: e.clientY })
      
      // Store initial position for the clicked layer
      // If layer has a groupId, store all grouped layers' positions
      if (layer.groupId) {
        const groupedLayers = textLayers.filter(l => l.groupId === layer.groupId)
        setLayerStart({ 
          x: layer.x, 
          y: layer.y,
          groupedLayers: groupedLayers.map(l => ({ id: l.id, x: l.x, y: l.y }))
        })
      } else {
      setLayerStart({ x: layer.x, y: layer.y })
      }
    } else if (action === 'resize') {
      setIsResizing(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setLayerStart({ x: layer.x, y: layer.y, width: layer.width, height: layer.height })
    }
  }

  const handleMouseMove = useCallback((e) => {
    // Check if mouse button is actually pressed
    if (e.buttons === 0) {
      // Mouse button is not pressed, reset all drag states
      if (isDragging || isResizing || isDraggingOverlay || isResizingOverlay || isDraggingShape || isResizingShape || isDraggingOverlayLayer || isResizingOverlayLayer) {
        setIsDragging(false)
        setIsResizing(false)
        setIsDraggingOverlay(false)
        setIsResizingOverlay(false)
        setIsDraggingShape(false)
        setIsResizingShape(false)
        setIsDraggingOverlayLayer(false)
        setIsResizingOverlayLayer(false)
        setOverlayResizeMode(null)
        setSelectedOverlayLayerResizeMode(null)
      }
      return
    }
    
    if (!isDragging && !isResizing && !isDraggingOverlay && !isResizingOverlay && !isDraggingShape && !isResizingShape && !isDraggingOverlayLayer && !isResizingOverlayLayer) return

    const currentDragStart = isDraggingOverlay || isResizingOverlay ? overlayDragStart : dragStart
    const deltaX = e.clientX - currentDragStart.x
    const deltaY = e.clientY - currentDragStart.y
    
    // Drag threshold: only start dragging if mouse moved more than 5px
    const DRAG_THRESHOLD = 5
    if (isDragging && !dragThresholdMet) {
      const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
      if (distance > DRAG_THRESHOLD) {
        setDragThresholdMet(true)
      } else {
        return // Don't move until threshold is met
      }
    }
    
    const { scaleX, scaleY } = getImageScale()
    const deltaXPct = pxDeltaToPercent(deltaX, 'x')
    const deltaYPct = pxDeltaToPercent(deltaY, 'y')

    if (isDragging && selectedLayer && dragThresholdMet) {
      const tentativeX = layerStart.x + deltaXPct
      const tentativeY = layerStart.y + deltaYPct
      const newX = clampPercentValue(Math.max(0, Math.min(100 - selectedLayer.width, tentativeX)))
      const newY = clampPercentValue(Math.max(0, Math.min(100 - selectedLayer.height, tentativeY)))
      
      // If layer is grouped, move all layers in the group together
      let updatedLayers
      if (selectedLayer.groupId && layerStart.groupedLayers) {
        // Calculate the delta from the clicked layer's start position
        const deltaFromStart = { x: deltaXPct, y: deltaYPct }
        
        updatedLayers = textLayers.map(layer => {
          if (layer.groupId === selectedLayer.groupId) {
            // Find this layer's original position
            const originalPos = layerStart.groupedLayers.find(l => l.id === layer.id)
            if (originalPos) {
              const newLayerX = clampPercentValue(Math.max(0, Math.min(100 - layer.width, originalPos.x + deltaFromStart.x)))
              const newLayerY = clampPercentValue(Math.max(0, Math.min(100 - layer.height, originalPos.y + deltaFromStart.y)))
              return { ...layer, x: newLayerX, y: newLayerY }
            }
          }
          return layer
        })
      } else {
        // Single layer movement (no group)
        updatedLayers = textLayers.map(layer =>
        layer.id === selectedLayer.id ? { ...layer, x: newX, y: newY } : layer
      )
      }
      
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
      // Get original image dimensions for boundary constraints
      const imgEl = imageRef.current
      const originalWidth = frameData?.base_image?.image_dimensions?.width || imgEl?.naturalWidth || 1
      const originalHeight = frameData?.base_image?.image_dimensions?.height || imgEl?.naturalHeight || 1
      
      let newX = layerStart.x + (deltaX / (scaleX || 1))
      let newY = layerStart.y + (deltaY / (scaleY || 1))
      
      // Clamp position to keep shape within image bounds
      const currentWidth = selectedShape.width || layerStart.width
      const currentHeight = selectedShape.height || layerStart.height
      newX = Math.max(0, Math.min(newX, originalWidth - currentWidth))
      newY = Math.max(0, Math.min(newY, originalHeight - currentHeight))

      const updatedShapes = shapeLayers.map(shape =>
        shape.id === selectedShape.id ? { ...shape, x: newX, y: newY } : shape
      )
      setShapeLayers(updatedShapes)
      setSelectedShape({ ...selectedShape, x: newX, y: newY })
    } else if (isResizingShape && selectedShape) {
      // Get original image dimensions for boundary constraints
      const imgEl = imageRef.current
      const originalWidth = frameData?.base_image?.image_dimensions?.width || imgEl?.naturalWidth || 1
      const originalHeight = frameData?.base_image?.image_dimensions?.height || imgEl?.naturalHeight || 1
      
      let newWidth = Math.max(20, layerStart.width + (deltaX / (scaleX || 1)))
      let newHeight = Math.max(20, layerStart.height + (deltaY / (scaleY || 1)))
      
      // Clamp size to keep shape within image bounds
      const maxWidth = originalWidth - layerStart.x
      const maxHeight = originalHeight - layerStart.y
      newWidth = Math.min(newWidth, maxWidth)
      newHeight = Math.min(newHeight, maxHeight)

      const updatedShapes = shapeLayers.map(shape =>
        shape.id === selectedShape.id ? { ...shape, width: newWidth, height: newHeight } : shape
      )
      setShapeLayers(updatedShapes)
      setSelectedShape({ ...selectedShape, width: newWidth, height: newHeight })
    } else if (isDraggingOverlay) {
      // Use same movement logic as shapes
      const newX = layerStart.x + (deltaX / (scaleX || 1))
      const newY = layerStart.y + (deltaY / (scaleY || 1))
      setOverlayPosition({ x: newX, y: newY })
      
      // Save overlay change start if not already set
      if (!overlayChangeStart) {
        setOverlayChangeStart({
          previousPosition: overlayPosition,
          previousScale: overlayScale
        })
      }
    } else if (isDraggingOverlayLayer && selectedOverlayLayer) {
      // Drag overlay layer
      const newX = layerStart.x + (deltaX / (scaleX || 1))
      const newY = layerStart.y + (deltaY / (scaleY || 1))
      
      const updatedLayers = overlayLayers.map(overlay =>
        overlay.id === selectedOverlayLayer.id ? { ...overlay, x: newX, y: newY } : overlay
      )
      setOverlayLayers(updatedLayers)
      setSelectedOverlayLayer({ ...selectedOverlayLayer, x: newX, y: newY })
    } else if (isResizingOverlayLayer && selectedOverlayLayer && selectedOverlayLayerResizeMode) {
      // Resize overlay layer
      const { scaleX, scaleY } = getImageScale()
      const deltaXNat = deltaX / (scaleX || 1)
      const deltaYNat = deltaY / (scaleY || 1)
      
      let newX = layerStart.x
      let newY = layerStart.y
      let newWidth = layerStart.width
      let newHeight = layerStart.height
      const minSize = 20
      
      switch (selectedOverlayLayerResizeMode) {
        case 'nw': // Top-left corner
          newX = layerStart.x + deltaXNat
          newY = layerStart.y + deltaYNat
          newWidth = layerStart.width - deltaXNat
          newHeight = layerStart.height - deltaYNat
          if (newWidth < minSize) { newX = layerStart.x; newWidth = minSize }
          if (newHeight < minSize) { newY = layerStart.y; newHeight = minSize }
          break
        case 'ne': // Top-right corner
          newY = layerStart.y + deltaYNat
          newWidth = layerStart.width + deltaXNat
          newHeight = layerStart.height - deltaYNat
          if (newWidth < minSize) newWidth = minSize
          if (newHeight < minSize) { newY = layerStart.y; newHeight = minSize }
          break
        case 'sw': // Bottom-left corner
          newX = layerStart.x + deltaXNat
          newWidth = layerStart.width - deltaXNat
          newHeight = layerStart.height + deltaYNat
          if (newWidth < minSize) { newX = layerStart.x; newWidth = minSize }
          if (newHeight < minSize) newHeight = minSize
          break
        case 'se': // Bottom-right corner
          newWidth = layerStart.width + deltaXNat
          newHeight = layerStart.height + deltaYNat
          if (newWidth < minSize) newWidth = minSize
          if (newHeight < minSize) newHeight = minSize
          break
      }
      
      const updatedLayers = overlayLayers.map(overlay =>
        overlay.id === selectedOverlayLayer.id ? { ...overlay, x: newX, y: newY, width: newWidth, height: newHeight } : overlay
      )
      setOverlayLayers(updatedLayers)
      setSelectedOverlayLayer({ ...selectedOverlayLayer, x: newX, y: newY, width: newWidth, height: newHeight })
    } else if (isResizingOverlay && overlayResizeMode) {
      // Corner-based resize logic similar to crop
      const { scaleX, scaleY } = getImageScale()
      const deltaXNat = deltaX / (scaleX || 1)
      const deltaYNat = deltaY / (scaleY || 1)
      
      let newX = layerStart.x
      let newY = layerStart.y
      let newWidth = layerStart.width
      let newHeight = layerStart.height
      const minSize = 20
      
      switch (overlayResizeMode) {
        case 'nw': // Top-left corner
          newX = layerStart.x + deltaXNat
          newY = layerStart.y + deltaYNat
          newWidth = layerStart.width - deltaXNat
          newHeight = layerStart.height - deltaYNat
          if (newWidth < minSize) { newX = layerStart.x; newWidth = minSize }
          if (newHeight < minSize) { newY = layerStart.y; newHeight = minSize }
          break
        case 'ne': // Top-right corner
          newY = layerStart.y + deltaYNat
          newWidth = layerStart.width + deltaXNat
          newHeight = layerStart.height - deltaYNat
          if (newWidth < minSize) newWidth = minSize
          if (newHeight < minSize) { newY = layerStart.y; newHeight = minSize }
          break
        case 'sw': // Bottom-left corner
          newX = layerStart.x + deltaXNat
          newWidth = layerStart.width - deltaXNat
          newHeight = layerStart.height + deltaYNat
          if (newWidth < minSize) { newX = layerStart.x; newWidth = minSize }
          if (newHeight < minSize) newHeight = minSize
          break
        case 'se': // Bottom-right corner
          newWidth = layerStart.width + deltaXNat
          newHeight = layerStart.height + deltaYNat
          if (newWidth < minSize) newWidth = minSize
          if (newHeight < minSize) newHeight = minSize
          break
        case 'n': // Top edge
          newY = layerStart.y + deltaYNat
          newHeight = layerStart.height - deltaYNat
          if (newHeight < minSize) { newY = layerStart.y; newHeight = minSize }
          break
        case 's': // Bottom edge
          newHeight = layerStart.height + deltaYNat
          if (newHeight < minSize) newHeight = minSize
          break
        case 'w': // Left edge
          newX = layerStart.x + deltaXNat
          newWidth = layerStart.width - deltaXNat
          if (newWidth < minSize) { newX = layerStart.x; newWidth = minSize }
          break
        case 'e': // Right edge
          newWidth = layerStart.width + deltaXNat
          if (newWidth < minSize) newWidth = minSize
          break
      }
      
      setOverlayPosition({ x: newX, y: newY })
      setOverlaySize({ width: newWidth, height: newHeight })
      
      // Update scale for backward compatibility
      if (overlayImage) {
        const newScaleX = overlayImage.width > 0 ? newWidth / overlayImage.width : overlayScale
        const newScaleY = overlayImage.height > 0 ? newHeight / overlayImage.height : overlayScale
        setOverlayScale(Math.min(newScaleX, newScaleY))
      }
      
      // Save overlay change start if not already set
      if (!overlayChangeStart) {
        setOverlayChangeStart({
          previousPosition: overlayPosition,
          previousScale: overlayScale
        })
      }
    }
  }, [isDragging, isResizing, isDraggingOverlay, isResizingOverlay, overlayResizeMode, dragStart, layerStart, selectedLayer, textLayers, overlayPosition, overlayScale, overlaySize, overlayDragStart, overlayImage, isDraggingShape, isResizingShape, selectedShape, shapeLayers, pxDeltaToPercent, getImageScale, dragThresholdMet, frameData, isDraggingOverlayLayer, isResizingOverlayLayer, selectedOverlayLayer, overlayLayers, selectedOverlayLayerResizeMode, overlayChangeStart])

  const handleOverlayMouseDown = (e, action, resizeMode = null) => {
    e.preventDefault()
    e.stopPropagation()
    
    if (!overlayImage) return
    setOverlaySelected(true)
    
    // Calculate current size
    const currentWidth = overlaySize?.width || (overlayImage.width * overlayScale)
    const currentHeight = overlaySize?.height || (overlayImage.height * overlayScale)
    
    if (action === 'drag') {
      setIsDraggingOverlay(true)
      setOverlayDragStart({ x: e.clientX, y: e.clientY })
      setLayerStart({ x: overlayPosition.x, y: overlayPosition.y, width: currentWidth, height: currentHeight })
    } else if (action === 'resize') {
      setIsResizingOverlay(true)
      setOverlayResizeMode(resizeMode || 'se') // Default to bottom-right if no mode specified
      setOverlayDragStart({ x: e.clientX, y: e.clientY })
      setLayerStart({ x: overlayPosition.x, y: overlayPosition.y, width: currentWidth, height: currentHeight })
    }
  }

  // Handle mouse down for overlay layers (from overlay_elements)
  const handleOverlayLayerMouseDown = (e, overlayLayerId, action, resizeMode = null) => {
    e.preventDefault()
    e.stopPropagation()
    
    const overlayLayer = overlayLayers.find(ol => ol.id === overlayLayerId)
    if (!overlayLayer) return
    
    setSelectedOverlayLayer(overlayLayer)
    setSelectedLayer(null)
    setSelectedShape(null)
    
    if (action === 'drag') {
      setIsDraggingOverlayLayer(true)
      setDragStart({ x: e.clientX, y: e.clientY })
      setLayerStart({ x: overlayLayer.x, y: overlayLayer.y, width: overlayLayer.width, height: overlayLayer.height })
    } else if (action === 'resize') {
      setIsResizingOverlayLayer(true)
      setSelectedOverlayLayerResizeMode(resizeMode || 'se')
      setDragStart({ x: e.clientX, y: e.clientY })
      setLayerStart({ x: overlayLayer.x, y: overlayLayer.y, width: overlayLayer.width, height: overlayLayer.height })
    }
  }

  const handleOverlayOptionsToggle = (event) => {
    event.stopPropagation()
    setActivePanel((prev) => (prev === 'overlay' ? null : 'overlay'))
  }

  const handleMouseUp = useCallback((e) => {
    // Reset all drag states immediately
    setIsDragging(false)
    setIsResizing(false)
    setIsDraggingShape(false)
    setIsResizingShape(false)
    setIsDraggingOverlay(false)
    setIsResizingOverlay(false)
    setIsDraggingOverlayLayer(false)
    setIsResizingOverlayLayer(false)
    setOverlayResizeMode(null)
    setSelectedOverlayLayerResizeMode(null)
    setDragThresholdMet(false) // Reset drag threshold
    
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
    
    // Handle overlay_elements - load ALL overlays, not just the first one
    if (data.overlay_elements && Array.isArray(data.overlay_elements) && data.overlay_elements.length > 0) {
      const loadedOverlays = []
      
      // Load all overlay_elements
      data.overlay_elements.forEach((ov, index) => {
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
          const overlayLayer = {
            id: Date.now() + index,
            imageUrl: ovUrl,
            x: posXNat,
            y: posYNat,
            width: targetWNat,
            height: targetHNat,
            image: null, // Will be loaded asynchronously
            fileUrl: ovUrl // Store the file URL
          }
          loadedOverlays.push(overlayLayer)
          
          // Load image asynchronously
        const oImg = new Image()
        oImg.onload = () => {
            overlayLayer.image = oImg
            setOverlayLayers(prev => {
              const updated = [...prev]
              const existingIndex = updated.findIndex(ol => ol.id === overlayLayer.id)
              if (existingIndex >= 0) {
                updated[existingIndex] = { ...overlayLayer, image: oImg }
              } else {
                updated.push({ ...overlayLayer, image: oImg })
              }
              return updated
            })
        }
        oImg.onerror = () => {
            console.error(`Failed to load overlay image ${index} from template`)
        }
        oImg.src = ovUrl
      }
      })
      
      setOverlayLayers(loadedOverlays)
      
      // Clear main overlayImage when loading overlay_elements to prevent duplication
      setOverlayImage(null)
      setOverlayImageUrl('')
      setOverlayVisible(false)
      
      // Don't set main overlayImage when loading overlay_elements - use overlayLayers only
      // This prevents duplication. Only set overlayImage for true backward compatibility
      // (when there's a single overlay_image field but no overlay_elements array)
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
        // Overlay position and size are already in natural pixel coordinates (like shapes)
        const overlayX = overlayPosition.x
        const overlayY = overlayPosition.y
        const overlayWidth = overlaySize?.width || (overlayImage.width * overlayScale)
        const overlayHeight = overlaySize?.height || (overlayImage.height * overlayScale)
        
        ctx.save()
        ctx.drawImage(overlayImage, overlayX, overlayY, overlayWidth, overlayHeight)
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
      reader.onload = async (event) => {
        const previousVisible = overlayVisible
        const previousUrl = overlayImageUrl
        const previousImage = overlayImage
        const previousPosition = overlayPosition
        const previousScale = overlayScale

        const rawResult = event.target.result
        const processedSrc = await getProcessedOverlaySrc(rawResult)
        setOverlayImageUrl(processedSrc)
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          console.log('Overlay image loaded:', img.width, 'x', img.height)
          setOverlayImage(img)
          setOverlayVisible(true)
          // Start smaller and near the top-left; user can drag afterwards
          const initialPos = { x: 20, y: 20 }
          const initialScale = 0.3
          const initialWidth = img.width * initialScale
          const initialHeight = img.height * initialScale
          setOverlayPosition(initialPos)
          setOverlayScale(initialScale)
          setOverlaySize({ width: initialWidth, height: initialHeight })
          resetOverlayBackgroundState()
          
          // Save to history
          saveToHistory('overlay_add', {
            previousVisible,
            previousUrl,
            previousImage,
            previousPosition,
            previousScale,
            newVisible: true,
            newUrl: processedSrc,
            newImage: img,
            newPosition: initialPos,
            newScale: initialScale
          })
        }
        img.onerror = () => {
          console.error('Failed to load overlay image')
          alert('Failed to load overlay image')
        }
        img.src = processedSrc
      }
      reader.readAsDataURL(file)
    }
  }

  const handleOverlayImageUrlLoad = () => {
    if (overlayImageUrl) {
      const loadOverlayFromUrl = async () => {
        const processedSrc = await getProcessedOverlaySrc(overlayImageUrl)
        const img = new Image()
        img.crossOrigin = 'anonymous'
        img.onload = () => {
          console.log('Overlay image loaded from URL:', img.width, 'x', img.height)
          setOverlayImage(img)
          setOverlayVisible(true)
          const initialScale = 0.3
          setOverlayPosition({ x: 20, y: 20 })
          setOverlayScale(initialScale)
          setOverlaySize({ width: img.width * initialScale, height: img.height * initialScale })
          resetOverlayBackgroundState()
        }
        img.onerror = () => {
          console.error('Failed to load overlay image from URL')
          alert('Failed to load overlay image from URL')
        }
        setOverlayImageUrl(processedSrc)
        img.src = processedSrc
      }
      loadOverlayFromUrl()
    }
  }

  const handleOverlayRemove = () => {
    setOverlayImage(null)
    setOverlayImageUrl('')
    setOverlayImageFile(null)
    setOverlayVisible(false)
    setOverlaySize({ width: 200, height: 200 })
    resetOverlayBackgroundState()
    setIsOverlayUploading(false)
    setOverlaySelected(false)
  }

  // Delete selected overlay layer
  const handleOverlayLayerDelete = () => {
    if (!selectedOverlayLayer) return

    const previousLayers = [...overlayLayers]
    const previousSelected = selectedOverlayLayer
    const updatedLayers = overlayLayers.filter(overlay => overlay.id !== selectedOverlayLayer.id)

    setOverlayLayers(updatedLayers)
    setSelectedOverlayLayer(null)

    // Also remove from layerOrder if it exists
    setLayerOrder(prev => prev.filter(item => !(item.type === 'overlay' && item.id === selectedOverlayLayer.id)))

    saveToHistory('overlay_delete', {
      previousLayers,
      previousSelected,
      newLayers: updatedLayers,
      newSelected: null
    })
  }

  // Remove background from overlay via API
  const removeOverlayBackground = async () => {
    if (!overlayVisible || !overlayImageUrl) {
      console.warn('Missing overlay image or URL')
      alert('Please upload an overlay image first')
      return
    }
    
    setIsRemovingBackground(true)
    
    try {
      const previousOverlaySnapshot = {
        image: overlayImage,
        url: overlayImageUrl
      }

      const response = await fetch(BF_REMOVE_REMOVE_BG_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image_url: overlayImageUrl })
      })

      const responseText = await response.text()
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch (_) {
        responseData = null
      }

      if (!response.ok) {
        throw new Error(`remove-bg request failed: ${response.status} ${responseText}`)
      }

      const processedUrl =
        responseData?.image_url ||
        responseData?.url ||
        responseData?.data?.image_url ||
        responseData?.data?.url ||
        responseData?.result?.image_url ||
        responseData?.result?.url

      if (!processedUrl) {
        throw new Error('remove-bg response missing image_url')
      }

      await new Promise((resolve, reject) => {
        const processedImg = new Image()
        processedImg.crossOrigin = 'anonymous'
        processedImg.onload = () => {
          setOverlayImage(processedImg)
          setOverlayImageUrl(processedUrl)
          setOverlayBackgroundRemoved(true)
          setOverlayOriginalBeforeBgRemoval(previousOverlaySnapshot)
          
          // Save to history
          saveToHistory('overlay_background_remove', {
            previousUrl: overlayImageUrl,
            previousImage: overlayImage,
            newUrl: processedUrl,
            newImage: processedImg
          })
          resolve()
        }
        processedImg.onerror = (err) => reject(err)
        processedImg.src = processedUrl
      })
    } catch (error) {
      console.error('Background removal failed:', error)
      alert('Failed to remove background: ' + (error?.message || 'Unknown error'))
    } finally {
      setIsRemovingBackground(false)
    }
  }

  const undoOverlayBackground = () => {
    if (!overlayOriginalBeforeBgRemoval) return
    const { image, url } = overlayOriginalBeforeBgRemoval
    if (image) {
      setOverlayImage(image)
    }
    if (url) {
      setOverlayImageUrl(url)
    }
    setOverlayBackgroundRemoved(false)
    setOverlayOriginalBeforeBgRemoval(null)
  }

  // Remove background from overlay layer via API
  const removeOverlayLayerBackground = async () => {
    if (!selectedOverlayLayer || (!selectedOverlayLayer.imageUrl && !selectedOverlayLayer.fileUrl)) {
      console.warn('Missing overlay layer image or URL')
      alert('Please select an overlay layer with an image first')
      return
    }
    
    const overlayUrl = selectedOverlayLayer.imageUrl || selectedOverlayLayer.fileUrl
    setIsRemovingOverlayLayerBackground(true)
    
    try {
      const previousUrl = overlayUrl
      const previousImage = selectedOverlayLayer.image

      const response = await fetch(BF_REMOVE_REMOVE_BG_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ image_url: overlayUrl })
      })

      const responseText = await response.text()
      let responseData
      try {
        responseData = JSON.parse(responseText)
      } catch (_) {
        responseData = null
      }

      if (!response.ok) {
        throw new Error(`remove-bg request failed: ${response.status} ${responseText}`)
      }

      const processedUrl =
        responseData?.image_url ||
        responseData?.url ||
        responseData?.data?.image_url ||
        responseData?.data?.url ||
        responseData?.result?.image_url ||
        responseData?.result?.url

      if (!processedUrl) {
        throw new Error('remove-bg response missing image_url')
      }

      await new Promise((resolve, reject) => {
        const processedImg = new Image()
        processedImg.crossOrigin = 'anonymous'
        processedImg.onload = () => {
          // Update overlay layer with processed image
          setOverlayLayers(prev => prev.map(ol => 
            ol.id === selectedOverlayLayer.id 
              ? { ...ol, imageUrl: processedUrl, fileUrl: processedUrl, image: processedImg }
              : ol
          ))
          
          setSelectedOverlayLayer(prev => prev?.id === selectedOverlayLayer.id 
            ? { ...prev, imageUrl: processedUrl, fileUrl: processedUrl, image: processedImg }
            : prev
          )
          
          // Track background removal state
          setOverlayLayerBackgroundRemoved(prev => {
            const newMap = new Map(prev)
            newMap.set(selectedOverlayLayer.id, true)
            return newMap
          })
          
          setOverlayLayerOriginalBeforeBgRemoval(prev => {
            const newMap = new Map(prev)
            newMap.set(selectedOverlayLayer.id, { imageUrl: previousUrl, image: previousImage })
            return newMap
          })
          
          resolve()
        }
        processedImg.onerror = (err) => reject(err)
        processedImg.src = processedUrl
      })
    } catch (error) {
      console.error('Background removal failed for overlay layer:', error)
      alert('Failed to remove background: ' + (error?.message || 'Unknown error'))
    } finally {
      setIsRemovingOverlayLayerBackground(false)
    }
  }

  const undoOverlayLayerBackground = () => {
    if (!selectedOverlayLayer) return
    const original = overlayLayerOriginalBeforeBgRemoval.get(selectedOverlayLayer.id)
    if (!original) return
    
    const { imageUrl, image } = original
    
    setOverlayLayers(prev => prev.map(ol => 
      ol.id === selectedOverlayLayer.id 
        ? { ...ol, imageUrl: imageUrl, fileUrl: imageUrl, image: image }
        : ol
    ))
    
    setSelectedOverlayLayer(prev => prev?.id === selectedOverlayLayer.id 
      ? { ...prev, imageUrl: imageUrl, fileUrl: imageUrl, image: image }
      : prev
    )
    
    setOverlayLayerBackgroundRemoved(prev => {
      const newMap = new Map(prev)
      newMap.delete(selectedOverlayLayer.id)
      return newMap
    })
    
    setOverlayLayerOriginalBeforeBgRemoval(prev => {
      const newMap = new Map(prev)
      newMap.delete(selectedOverlayLayer.id)
      return newMap
    })
  }

  // Get model type from frameData
  const modelType = frameData?.model ? String(frameData.model).toUpperCase() : ''
  const isAnchorModel = modelType === 'ANCHOR'
  
  // Debug log for model type
  useEffect(() => {
    if (overlayVisible && overlayImage) {
      console.log('Overlay panel debug:', {
        modelType,
        isAnchorModel,
        overlayVisible,
        hasOverlayImage: !!overlayImage,
        overlayImageUrl: !!overlayImageUrl
      })
    }
  }, [overlayVisible, overlayImage, modelType, isAnchorModel, overlayImageUrl])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Delete key support for shapes and overlay layers
      if ((e.key === 'Delete' || e.key === 'Backspace') && !e.ctrlKey && !e.metaKey) {
        // Check if we're not typing in an input field
        const target = e.target
        if (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA' && !target.isContentEditable) {
          if (selectedShape) {
            e.preventDefault()
            handleShapeDelete()
          } else if (selectedOverlayLayer) {
            e.preventDefault()
            handleOverlayLayerDelete()
          }
        }
      }
      
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
  }, [undo, redo, selectedShape, selectedOverlayLayer, handleShapeDelete, handleOverlayLayerDelete])

  // Auto-load frame data when popup opens
  useEffect(() => {
    if (isOpen && frameData) {
      try {
        const data = frameData;
        
        // Log the loaded JSON data
        console.log('📥 Image JSON loaded:', JSON.stringify(frameData, null, 2));
        
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
              const textLayersWithZIndex = [];
              
              if (textElements.length > 0) {
                const convertedLayers = textElements.map((element, index) => {
                  const bbPercent = convertBoundingBoxToPercent(element.bounding_box || {}, naturalDims);
                  const { x, y, width, height } = bbPercent;
                  
                  const shadow = element.effects?.textShadow;
                  let textShadowValue = 'none';
                  if (shadow && shadow.enabled) {
                    textShadowValue = 'drop';
                  }
                  
                  // Get z-index from layout.zIndex
                  const zIndex = typeof element.layout?.zIndex === 'number' 
                    ? element.layout.zIndex 
                    : (typeof element.z_index === 'number' ? element.z_index : (typeof element.zIndex === 'number' ? element.zIndex : (index + 1)));
                  
                  const layer = {
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
                  
                  textLayersWithZIndex.push({ layer, zIndex, type: 'text' });
                  return layer;
                });
                setTextLayers(convertedLayers);
              }
              
              // Handle overlay_elements - separate shapes from regular overlays
              // Clear existing layers first to prevent duplicates
              setOverlayLayers([])
              setSelectedOverlayLayer(null)
              setShapeLayers([])
              
              const loadedShapes = []
              const loadedOverlays = []
              const allLayersWithZIndex = [...textLayersWithZIndex]
              
              if (data.overlay_elements && Array.isArray(data.overlay_elements) && data.overlay_elements.length > 0) {
                // Load all overlay_elements - distinguish shapes from regular overlays
                data.overlay_elements.forEach((ov, index) => {
                const bbPercent = convertBoundingBoxToPercent(ov?.bounding_box || {}, naturalDims);
                const posXNat = (bbPercent.x / 100) * originalWidth;
                const posYNat = (bbPercent.y / 100) * originalHeight;
                const targetWNat = (bbPercent.width / 100) * originalWidth;
                const targetHNat = (bbPercent.height / 100) * originalHeight;
                
                  // Get z-index from layout.zIndex
                  const zIndex = typeof ov.layout?.zIndex === 'number' 
                    ? ov.layout.zIndex 
                    : (typeof ov.z_index === 'number' ? ov.z_index : (typeof ov.zIndex === 'number' ? ov.zIndex : (100 + index + 1)));
                  
                  // Check if this is a shape (has file_url directly on the element) or regular overlay
                  // Shapes are saved with file_url directly on overlay_element, not in overlay_image
                  const hasFileUrl = !!(ov?.file_url || ov?.fileUrl);
                  const ovUrl = hasFileUrl ? (ov?.file_url || ov?.fileUrl) : (ov?.overlay_image?.image_url);
                  
                if (ovUrl) {
                    // Check if this is a shape by looking for file_url directly on the element
                    const isShape = hasFileUrl;
                    
                    if (isShape) {
                      // This is a shape - load as shapeLayer
                      // Generate unique ID using timestamp and index
                      const shapeId = Date.now() + index + 10000 + Math.random() * 1000;
                      const shape = {
                        id: shapeId,
                        type: 'rectangle', // Default type, could be enhanced to detect from image
                        x: posXNat,
                        y: posYNat,
                        width: targetWNat,
                        height: targetHNat,
                        fill: '#000000',
                        borderColor: '#000000',
                        borderWidth: 2,
                        borderStyle: 'solid',
                        borderRadius: 0,
                        rotation: 0,
                        opacity: 1,
                        fileUrl: ovUrl // Store the file URL
                      }
                      loadedShapes.push(shape)
                      allLayersWithZIndex.push({ layer: shape, zIndex, type: 'shape' })
                    } else {
                      // This is a regular overlay image
                      const overlayLayer = {
                        id: Date.now() + index,
                        imageUrl: ovUrl,
                        x: posXNat,
                        y: posYNat,
                        width: targetWNat,
                        height: targetHNat,
                        image: null, // Will be loaded asynchronously
                        fileUrl: ovUrl // Store the file URL
                      }
                      loadedOverlays.push(overlayLayer)
                      allLayersWithZIndex.push({ layer: overlayLayer, zIndex, type: 'overlay' })
                      
                      // Load image asynchronously
                    const oImg = new Image();
                    oImg.crossOrigin = 'anonymous';
                    oImg.onload = () => {
                        // Update the overlay layer with the loaded image
                        setOverlayLayers(prev => {
                          // Find the overlay by matching the fileUrl/imageUrl to avoid duplicates
                          const existingIndex = prev.findIndex(ol => 
                            ol.id === overlayLayer.id || 
                            (ol.fileUrl === overlayLayer.fileUrl && ol.imageUrl === overlayLayer.imageUrl)
                          )
                          if (existingIndex >= 0) {
                            const updated = [...prev]
                            updated[existingIndex] = { ...updated[existingIndex], image: oImg }
                            return updated
                          }
                          // If not found, don't add it (overlay layers were cleared/reloaded)
                          return prev
                        })
                    };
                    oImg.onerror = () => {
                        console.error(`Failed to load overlay image ${index}`);
                    };
                    oImg.src = ovUrl;
                    }
                  }
                });
                
                // Set shape layers
                if (loadedShapes.length > 0) {
                  setShapeLayers(loadedShapes)
                }
                
                // Set overlay layers only once with all loaded overlays
                if (loadedOverlays.length > 0) {
                  setOverlayLayers(loadedOverlays)
                }
                
                // Clear main overlayImage when loading overlay_elements to prevent duplication
                setOverlayImage(null)
                setOverlayImageUrl('')
                setOverlayVisible(false)
              }
              
              // Build layerOrder from all layers sorted by z-index
              if (allLayersWithZIndex.length > 0) {
                // Sort by z-index
                allLayersWithZIndex.sort((a, b) => {
                  if (a.zIndex !== undefined && b.zIndex !== undefined) {
                    return a.zIndex - b.zIndex;
                  }
                  // If z-index is the same or missing, maintain type order: text, shape, overlay
                  const typeOrder = { text: 0, shape: 1, overlay: 2 };
                  const orderA = typeOrder[a.type] ?? 999;
                  const orderB = typeOrder[b.type] ?? 999;
                  if (orderA !== orderB) {
                    return orderA - orderB;
                  }
                  return 0;
                });
                
                // Build layerOrder array
                const newLayerOrder = allLayersWithZIndex.map(({ layer, type }) => ({
                  type: type,
                  id: layer.id,
                  visible: true
                }));
                
                setLayerOrder(newLayerOrder);
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
      setOverlayLayers([]);
      setSelectedOverlayLayer(null);
      setImageUrl('');
      setImageLoaded(false);
      setSelectedLayer(null);
    }
  }, [isOpen, frameData, resetOverlayBackgroundState]);

  // Convert textLayers back to text_elements format for API
  const convertTextLayersToElements = () => {
    if (!imageRef.current || textLayers.length === 0) return [];
    
    // Get original image dimensions for proper coordinate conversion
    const imgEl = imageRef.current;
    const originalWidth = frameData?.base_image?.image_dimensions?.width || imgEl?.naturalWidth || 1;
    const originalHeight = frameData?.base_image?.image_dimensions?.height || imgEl?.naturalHeight || 1;
    
    // Sort text layers by their position in layerOrder to preserve z-order
    const sortedTextLayers = [...textLayers].sort((a, b) => {
      const indexA = layerOrder.findIndex(l => l.type === 'text' && l.id === a.id);
      const indexB = layerOrder.findIndex(l => l.type === 'text' && l.id === b.id);
      // If not found in layerOrder, put at end
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
    
    return sortedTextLayers.map((layer) => {
      // Convert percentages (0-100) to normalized coordinates (0-1)
      // This ensures consistency regardless of display size
      const toNormalized = (value) => {
        const percent = ensureNumber(value);
        return Math.max(0, Math.min(1, percent / 100));
      };
      const x = toNormalized(layer.x);
      const y = toNormalized(layer.y);
      const width = toNormalized(layer.width);
      const height = toNormalized(layer.height);
      
      // Get z-index from absolute position in layerOrder (unified for all layer types)
      const layerOrderIndex = layerOrder.findIndex(l => l.type === 'text' && l.id === layer.id);
      const zIndex = layerOrderIndex >= 0 ? layerOrderIndex + 1 : textLayers.length + 1;
      
      // Reconstruct text element structure
      const textElement = {
        fill: layer.color,
        text: layer.text,
        type: 'headline',
        layout: {
          zIndex: zIndex,
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

  // Helper function to convert image URL to blob
  const imageUrlToBlob = async (url) => {
    try {
      // If it's a data URL (base64), convert directly
      if (url.startsWith('data:')) {
        const response = await fetch(url);
        return await response.blob();
      }
      // If it's a regular URL, fetch it
      const response = await fetch(url, { mode: 'cors' });
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }
      return await response.blob();
    } catch (error) {
      console.error('Error converting image to blob:', error);
      throw error;
    }
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
      
      // Convert textLayers to text_elements format (already sorted by layerOrder)
      const textElements = convertTextLayersToElements();
      
      // Convert overlay to overlay_elements format (if present)
      let overlayElements = [];
      let finalOverlayUrl = overlayImageUrl;
      
        const imgEl = imageRef.current;
      const originalWidth = frameData?.base_image?.image_dimensions?.width || imgEl?.naturalWidth || 1;
      const originalHeight = frameData?.base_image?.image_dimensions?.height || imgEl?.naturalHeight || 1;
      
      // Build a map of overlay layers by ID for quick lookup
      const overlayLayersMap = new Map();
      overlayLayers.forEach(ol => {
        if (ol.fileUrl) {
          overlayLayersMap.set(ol.id, ol);
        }
      });
      
      // Build a map of shapes by ID for quick lookup
      const shapeLayersMap = new Map();
      shapeLayers.forEach(shape => {
        if (shape.fileUrl) {
          shapeLayersMap.set(shape.id, shape);
        }
      });
      
      // Process overlay layers and main overlay first (before shapes, to maintain backward compatibility)
      // Add ALL overlay layers to overlay_elements (from overlayLayers array)
      for (const overlayLayer of overlayLayers) {
        if (!overlayLayer.fileUrl) {
          console.warn(`Skipping overlay layer ${overlayLayer.id} - no file URL available`);
          continue;
        }
        
        // Overlay position and size are in natural pixel coordinates
        const naturalX = overlayLayer.x;
        const naturalY = overlayLayer.y;
        const naturalWidth = overlayLayer.width;
        const naturalHeight = overlayLayer.height;
        const imageWidth = overlayLayer.image?.width || naturalWidth;
        const imageHeight = overlayLayer.image?.height || naturalHeight;
        
        // Get z-index from absolute position in layerOrder (unified for all layer types)
        const layerOrderIndex = layerOrder.findIndex(l => l.type === 'overlay' && l.id === overlayLayer.id);
        const zIndex = layerOrderIndex >= 0 ? layerOrderIndex + 1 : 1000;
        
        overlayElements.push({
          bounding_box: {
            x: originalWidth > 0 ? naturalX / originalWidth : 0,
            y: originalHeight > 0 ? naturalY / originalHeight : 0,
            width: originalWidth > 0 ? naturalWidth / originalWidth : 0,
            height: originalHeight > 0 ? naturalHeight / originalHeight : 0
          },
          overlay_image: {
            image_url: overlayLayer.fileUrl, // Use the stored file URL
            image_dimensions: {
              width: imageWidth,
              height: imageHeight
            }
          },
          layout: {
            zIndex: zIndex,
            rotation: 0,
            alignment: 'center',
            anchor_point: 'center'
          }
        });
      }
      
      // Also add the main overlay image if it exists and is not already in overlayLayers
      // (for backward compatibility with the single overlay system)
      if (overlayVisible && overlayImage && imageRef.current) {
        // Check if this overlay is already in overlayLayers
        const isAlreadyInLayers = overlayLayers.some(ol => ol.imageUrl === overlayImageUrl);
        
        if (!isAlreadyInLayers) {
          // Upload overlay image first if available
          try {
            // Convert overlay image to blob
            const overlayBlob = await imageUrlToBlob(overlayImageUrl);
            
            // Create FormData for upload
            const formData = new FormData();
            formData.append('session_id', sessionId);
            formData.append('file', overlayBlob, 'overlay-image.png'); // Use appropriate filename
            
            // Upload overlay image
            const uploadResponse = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/api/upload-file', {
              method: 'POST',
              body: formData
            });
            
            const uploadResponseText = await uploadResponse.text();
            let uploadResponseData;
            try {
              uploadResponseData = JSON.parse(uploadResponseText);
            } catch (_) {
              uploadResponseData = uploadResponseText;
            }
            
            if (!uploadResponse.ok) {
              throw new Error(`Upload failed: ${uploadResponse.status} ${uploadResponseText}`);
            }
            
            // Extract URL from response
            finalOverlayUrl = uploadResponseData?.url || 
                             uploadResponseData?.image_url || 
                             uploadResponseData?.file_url ||
                             uploadResponseData?.data?.url ||
                             uploadResponseData?.data?.image_url ||
                             uploadResponseData?.data?.file_url ||
                             overlayImageUrl; // Fallback to original URL
            
            if (!finalOverlayUrl || finalOverlayUrl === overlayImageUrl) {
              console.warn('Upload API did not return a new URL, using original URL');
            }
          } catch (uploadError) {
            console.error('Failed to upload overlay image:', uploadError);
            // Continue with original URL if upload fails
            alert('Warning: Failed to upload overlay image. Using original URL.');
          }
        
        // Overlay position and size are already in natural pixel coordinates (like shapes)
        const naturalX = overlayPosition.x;
        const naturalY = overlayPosition.y;
        const naturalWidth = overlaySize?.width || (overlayImage.width * overlayScale);
        const naturalHeight = overlaySize?.height || (overlayImage.height * overlayScale);
        
          overlayElements.push({
            bounding_box: {
              x: originalWidth > 0 ? naturalX / originalWidth : 0,
              y: originalHeight > 0 ? naturalY / originalHeight : 0,
              width: originalWidth > 0 ? naturalWidth / originalWidth : 0,
              height: originalHeight > 0 ? naturalHeight / originalHeight : 0
            },
            overlay_image: {
              image_url: finalOverlayUrl, // Use the uploaded URL
              image_dimensions: {
                width: overlayImage.width,
                height: overlayImage.height
              }
            },
            layout: {
              zIndex: 1000, // Default z-index for main overlay (not in layerOrder)
              rotation: 0,
              alignment: 'center',
              anchor_point: 'center'
            }
          });
        }
      }
      
      // Add shapes to overlay_elements in the order specified by layerOrder
      // This ensures shapes that should be behind text are processed first
      for (const layerItem of layerOrder) {
        if (layerItem.type === 'shape') {
          const shape = shapeLayersMap.get(layerItem.id);
          if (!shape || !shape.fileUrl) {
            console.warn(`Skipping shape ${layerItem.id} - not found or no file URL available`);
            continue;
          }
          
          // Shape position and size are in natural pixel coordinates
          const naturalX = shape.x;
          const naturalY = shape.y;
          const naturalWidth = shape.width;
          const naturalHeight = shape.type === 'line' ? Math.max(shape.borderWidth || 1, shape.height || 1) : shape.height;
          
          // Get z-index from absolute position in layerOrder (unified for all layer types)
          const layerOrderIndex = layerOrder.findIndex(l => l.type === 'shape' && l.id === shape.id);
          const zIndex = layerOrderIndex >= 0 ? layerOrderIndex + 1 : 1000;
          
          overlayElements.push({
            bounding_box: {
              x: originalWidth > 0 ? naturalX / originalWidth : 0,
              y: originalHeight > 0 ? naturalY / originalHeight : 0,
              width: originalWidth > 0 ? naturalWidth / originalWidth : 0,
              height: originalHeight > 0 ? naturalHeight / originalHeight : 0
            },
            overlay_image: {
              image_url: shape.fileUrl, // Use the uploaded file URL
              image_dimensions: {
                width: naturalWidth,
                height: naturalHeight
              }
            },
            layout: {
              zIndex: zIndex,
              rotation: 0,
              alignment: 'center',
              anchor_point: 'center'
            }
          });
        }
      }
      
      // Also add any shapes that might not be in layerOrder (backward compatibility)
      for (const shape of shapeLayers) {
        // Skip if already added via layerOrder
        if (overlayElements.some(el => {
          const shapeInOrder = layerOrder.find(l => l.type === 'shape' && l.id === shape.id);
          return shapeInOrder;
        })) {
          continue;
        }
        
        // Skip shapes that don't have a file URL (upload failed or still uploading)
        if (!shape.fileUrl) {
          console.warn(`Skipping shape ${shape.id} - no file URL available`);
          continue;
        }
        
        // Shape position and size are in natural pixel coordinates
        const naturalX = shape.x;
        const naturalY = shape.y;
        const naturalWidth = shape.width;
        const naturalHeight = shape.type === 'line' ? Math.max(shape.borderWidth || 1, shape.height || 1) : shape.height;
        
        overlayElements.push({
          bounding_box: {
            x: originalWidth > 0 ? naturalX / originalWidth : 0,
            y: originalHeight > 0 ? naturalY / originalHeight : 0,
            width: originalWidth > 0 ? naturalWidth / originalWidth : 0,
            height: originalHeight > 0 ? naturalHeight / originalHeight : 0
          },
          overlay_image: {
            image_url: shape.fileUrl, // Use the uploaded file URL
            image_dimensions: {
              width: naturalWidth,
              height: naturalHeight
            }
          },
          layout: {
            zIndex: 1000, // Default z-index for shapes not in layerOrder
            rotation: 0,
            alignment: 'center',
            anchor_point: 'center'
          }
        });
      }
      
      console.log(`📊 Total overlay_elements to save: ${overlayElements.length}`, overlayElements);
      
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
      
      // Log the full update JSON structure
      console.log('📤 Update JSON being sent:', JSON.stringify(requestBody, null, 2));
      console.log('📋 Text elements:', JSON.stringify(textElements, null, 2));
      console.log('📋 Overlay elements:', JSON.stringify(overlayElements, null, 2));
      
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
      
      if (typeof onFrameEditComplete === 'function') {
        onFrameEditComplete({
          sceneNumber,
          imageIndex,
          textElements,
          overlayElements
        });
      }

      setShowSuccessPopup(true);
      setTimeout(() => setShowSuccessPopup(false), 1200);
      onClose?.();
      return;
    } catch (error) {
      console.error('Failed to save changes:', error);
      alert('Failed to save changes: ' + (error?.message || 'Unknown error'));
    } finally {
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  const outerClasses = 'fixed inset-0 z-50 flex items-center justify-center bg-black/50';
  const innerClasses = 'relative w-[90vw] h-[90vh] rounded-lg bg-white shadow-2xl overflow-hidden flex flex-col';
  // For 9:16 images, allow overflow to show full height and align from top
  const isPortrait9x16 = normalizedAspectRatio === '9 / 16' || normalizedAspectRatio === '9:16' || normalizedAspectRatio === '9/16';
  const workspaceBaseClasses = isPortrait9x16 
    ? 'flex-1 relative overflow-auto flex items-start justify-center transition-all duration-300'
    : 'flex-1 relative overflow-hidden flex items-center justify-center transition-all duration-300';
  const workspaceChromeClasses = `bg-white m-4 rounded-lg p-6 shadow-lg ${isToolbarOpen ? 'mt-2' : 'mt-4'}`;
  const workspaceContainerClasses = `${workspaceBaseClasses} ${workspaceChromeClasses}`.trim();
  const canvasWrapperBase = 'relative cursor-crosshair overflow-hidden';
  const canvasWrapperClasses = `${canvasWrapperBase} inline-block border-2 border-gray-200 bg-gray-50 rounded-md`;
  const bodyWrapperClasses = 'flex flex-col flex-1 min-h-0 overflow-hidden';
  const headerContainerClasses = 'header flex-shrink-0 w-full';
  const headerPanelClasses = '';
  const toolbarContainerClasses = 'bg-gray-50 border-b border-gray-200 px-4 py-3 flex items-center gap-2 flex-wrap flex-shrink-0 relative z-40';
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
                Changes Done!
              </h3>
              <p className="text-gray-600 mb-4">
                Your changes have been successfully saved.
              </p>
              <div className="w-8 h-1 bg-[#13008B] rounded-full animate-pulse"></div>
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
            <h1 className="header-title text-gray-700 font-semibold">Storyboard Image</h1>
          </div>
          <div className="header-right flex items-center gap-3 flex-wrap justify-end">
            <button
              type="button"
              onClick={toggleCropShape}
              disabled={!isCropping}
              className={`px-3 py-2 text-sm font-semibold rounded-lg border transition-all flex items-center gap-2 ${
                isCropping
                  ? 'border-purple-600 text-purple-700 hover:bg-purple-50'
                  : 'border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100'
              }`}
              title={isCropping ? 'Toggle between square and circle crop' : 'Start a crop to change the shape'}
            >
              <span
                className={`inline-flex items-center justify-center w-4 h-4 border-2 ${
                  cropShape === 'circle' ? 'rounded-full' : 'rounded-sm'
                } ${isCropping ? 'border-current' : 'border-gray-400'}`}
              />
              {cropShape === 'circle' ? 'Circle Crop' : 'Square Crop'}
            </button>
            <button
              type="button"
              onClick={overlayBackgroundRemoved ? undoOverlayBackground : removeOverlayBackground}
              disabled={
                !overlaySelected ||
                !overlayVisible ||
                !overlayImageUrl ||
                isRemovingBackground ||
                (overlayBackgroundRemoved && !overlayOriginalBeforeBgRemoval)
              }
              className={`px-3 py-2 text-sm font-semibold rounded-lg border transition-all flex items-center gap-2 ${
                overlaySelected && overlayVisible && overlayImageUrl && !isRemovingBackground
                  ? overlayBackgroundRemoved
                    ? 'border-gray-500 text-gray-700 hover:bg-gray-100'
                    : 'border-rose-500 text-rose-600 hover:bg-rose-50'
                  : 'border-gray-300 text-gray-400 cursor-not-allowed bg-gray-100'
              }`}
              title={
                overlaySelected && overlayVisible && overlayImageUrl
                  ? isRemovingBackground
                    ? 'Processing background change...'
                    : overlayBackgroundRemoved
                      ? 'Restore original overlay background'
                      : 'Remove overlay background'
                  : 'Select an overlay image to modify background and select it'
              }
            >
              {isRemovingBackground ? (
                <span className="inline-block w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : overlayBackgroundRemoved ? (
                <Icon name="undo" size={16} />
              ) : (
                <Icon name="imageCut" size={16} />
              )}
              {overlayBackgroundRemoved ? 'Undo BG' : 'Remove BG'}
            </button>
            {!isCropping && (
              <button
                onClick={handleSaveChanges}
                disabled={isSaving}
                className="px-4 py-2 bg-[#13008B] hover:bg-[#0f0068] text-white text-sm font-semibold rounded-lg transition-all shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                title="Save image"
              >
                {isSaving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Icon name="save" size={16} />
                    Save Image
                  </>
                )}
              </button>
            )}
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

      {/* Top Toolbar - Show main toolbar or text toolbar */}
      {isToolbarOpen && imageLoaded && (
        <>
          {/* Main Toolbar - Hide when text layer is selected */}
          {!selectedLayer && (
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
                onClick={() => setActivePanel('overlay')}
                title="Overlay Images"
              >
                <Icon name="image" size={18} />
              </button>

              {/* Layers Panel */}
              <button
                className={`w-10 h-10 flex items-center justify-center rounded-md transition-all ${activePanel === 'layers' ? 'bg-purple-600 text-white' : 'text-gray-600 hover:bg-gray-200'}`}
                onClick={() => togglePanel('layers')}
                title="Layers"
              >
                <Icon name="layers" size={18} />
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

          {/* Text Toolbar - Replace main toolbar when text layer is selected */}
              {selectedLayer && (() => {
                // Get the latest layer from textLayers to ensure we have the most up-to-date data
                const currentLayer = textLayers.find(layer => layer.id === selectedLayer.id) || selectedLayer
                if (!currentLayer) return null
                
                return (
              <div className={toolbarContainerClasses}>
                    {/* Font Family */}
                    <div className="relative">
                      <select
                        value={currentLayer?.fontFamily || selectedLayer?.fontFamily || 'Arial'}
                        onChange={(e) => {
                          const newFontFamily = e.target.value
                          const previousLayers = [...textLayers]
                          const previousSelected = selectedLayer
                          
                          const updatedLayers = textLayers.map(layer =>
                            layer.id === selectedLayer.id ? { ...layer, fontFamily: newFontFamily } : layer
                          )
                          const newSelected = { ...selectedLayer, fontFamily: newFontFamily }
                          
                          setTextLayers(updatedLayers)
                          setSelectedLayer(newSelected)
                          
                          // Save to history
                          saveToHistory('text_edit', {
                            previousLayers,
                            previousSelected,
                            newLayers: updatedLayers,
                            newSelected
                          })
                        }}
                        className="px-2 py-1 pr-7 text-xs border border-gray-300 rounded-md bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none cursor-pointer min-w-[120px]"
                        style={{ fontFamily: currentLayer?.fontFamily || selectedLayer?.fontFamily || 'Arial' }}
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
                        value={currentLayer?.fontSize || selectedLayer?.fontSize || 16}
                        onChange={(e) => {
                          const size = parseInt(e.target.value) || 8
                          const previousLayers = [...textLayers]
                          const previousSelected = selectedLayer
                          
                          const updatedLayers = textLayers.map(layer =>
                            layer.id === selectedLayer.id ? { ...layer, fontSize: size } : layer
                          )
                          const newSelected = { ...selectedLayer, fontSize: size }
                          
                          setTextLayers(updatedLayers)
                          setSelectedLayer(newSelected)
                          
                          // Save to history
                          saveToHistory('text_edit', {
                            previousLayers,
                            previousSelected,
                            newLayers: updatedLayers,
                            newSelected
                          })
                        }}
                        className="px-2 py-1 pr-7 text-xs border border-gray-300 rounded-md bg-gray-100 text-gray-900 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-purple-500 appearance-none cursor-pointer min-w-[60px]"
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
                          const isBold = currentLayer.fontWeight === '700' || currentLayer.fontWeight === 700 || currentLayer.fontWeight === 'bold'
                          const newWeight = isBold ? '400' : '700'
                          const updatedLayers = textLayers.map(layer =>
                            layer.id === selectedLayer.id ? { ...layer, fontWeight: newWeight } : layer
                          )
                          setTextLayers(updatedLayers)
                          setSelectedLayer({ ...selectedLayer, fontWeight: newWeight })
                        }}
                        className={`px-2 py-1 rounded text-xs font-bold transition-all ${
                          (currentLayer.fontWeight === '700' || currentLayer.fontWeight === 700 || currentLayer.fontWeight === 'bold')
                            ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title="Bold"
                      >
                        B
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const newStyle = currentLayer.fontStyle === 'italic' ? 'normal' : 'italic'
                          const updatedLayers = textLayers.map(layer =>
                            layer.id === selectedLayer.id ? { ...layer, fontStyle: newStyle } : layer
                          )
                          setTextLayers(updatedLayers)
                          setSelectedLayer({ ...selectedLayer, fontStyle: newStyle })
                        }}
                        className={`px-2 py-1 rounded text-xs italic transition-all ${
                          currentLayer.fontStyle === 'italic' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title="Italic"
                      >
                        I
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const newDecoration = currentLayer.textDecoration === 'underline' ? 'none' : 'underline'
                          const updatedLayers = textLayers.map(layer =>
                            layer.id === selectedLayer.id ? { ...layer, textDecoration: newDecoration } : layer
                          )
                          setTextLayers(updatedLayers)
                          setSelectedLayer({ ...selectedLayer, textDecoration: newDecoration })
                        }}
                        className={`px-2 py-1 rounded text-xs underline transition-all ${
                          currentLayer.textDecoration === 'underline' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title="Underline"
                      >
                        U
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const newDecoration = currentLayer.textDecoration === 'line-through' ? 'none' : 'line-through'
                          const updatedLayers = textLayers.map(layer =>
                            layer.id === selectedLayer.id ? { ...layer, textDecoration: newDecoration } : layer
                          )
                          setTextLayers(updatedLayers)
                          setSelectedLayer({ ...selectedLayer, textDecoration: newDecoration })
                        }}
                        className={`px-2 py-1 rounded text-xs line-through transition-all ${
                          currentLayer.textDecoration === 'line-through' ? 'bg-purple-600 text-white' : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                        }`}
                        title="Strikethrough"
                      >
                        S
                      </button>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-5 bg-gray-300"></div>

                    {/* Text Alignment Buttons */}
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const updatedLayers = textLayers.map(layer =>
                            layer.id === selectedLayer.id ? { ...layer, textAlign: 'left' } : layer
                          )
                          setTextLayers(updatedLayers)
                          setSelectedLayer({ ...selectedLayer, textAlign: 'left' })
                        }}
                        className={`px-2 py-1 rounded transition-all ${
                          currentLayer.textAlign === 'left'
                            ? 'bg-purple-600 border border-purple-600' : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                        title="Align Left"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={currentLayer.textAlign === 'left' ? 'text-white' : 'text-gray-700'}>
                          <line x1="3" y1="6" x2="21" y2="6"/>
                          <line x1="3" y1="12" x2="15" y2="12"/>
                          <line x1="3" y1="18" x2="21" y2="18"/>
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const updatedLayers = textLayers.map(layer =>
                            layer.id === selectedLayer.id ? { ...layer, textAlign: 'center' } : layer
                          )
                          setTextLayers(updatedLayers)
                          setSelectedLayer({ ...selectedLayer, textAlign: 'center' })
                        }}
                        className={`px-2 py-1 rounded transition-all ${
                          currentLayer.textAlign === 'center'
                            ? 'bg-purple-600 border border-purple-600' : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                        title="Align Center"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={currentLayer.textAlign === 'center' ? 'text-white' : 'text-gray-700'}>
                          <line x1="3" y1="6" x2="21" y2="6"/>
                          <line x1="9" y1="12" x2="15" y2="12"/>
                          <line x1="3" y1="18" x2="21" y2="18"/>
                        </svg>
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          const updatedLayers = textLayers.map(layer =>
                            layer.id === selectedLayer.id ? { ...layer, textAlign: 'right' } : layer
                          )
                          setTextLayers(updatedLayers)
                          setSelectedLayer({ ...selectedLayer, textAlign: 'right' })
                        }}
                        className={`px-2 py-1 rounded transition-all ${
                          currentLayer.textAlign === 'right'
                            ? 'bg-purple-600 border border-purple-600' : 'bg-gray-200 hover:bg-gray-300'
                        }`}
                        title="Align Right"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={currentLayer.textAlign === 'right' ? 'text-white' : 'text-gray-700'}>
                          <line x1="3" y1="6" x2="21" y2="6"/>
                          <line x1="9" y1="12" x2="21" y2="12"/>
                          <line x1="3" y1="18" x2="21" y2="18"/>
                        </svg>
                      </button>
                    </div>

                    {/* Divider */}
                    <div className="w-px h-5 bg-gray-300"></div>

                    {/* Text Color */}
                    <input
                      type="color"
                      value={currentLayer.color || selectedLayer.color}
                      onChange={(e) => {
                        const newColor = e.target.value
                        const updatedLayers = textLayers.map(layer =>
                          layer.id === selectedLayer.id ? { ...layer, color: newColor } : layer
                        )
                        setTextLayers(updatedLayers)
                        setSelectedLayer({ ...selectedLayer, color: newColor })
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
                    <div className="w-px h-5 bg-gray-300"></div>

                    {/* More Options Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        setActivePanel('text')
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
                    <div className="w-px h-5 bg-gray-300"></div>

                    {/* Delete Button */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        const previousLayers = [...textLayers]
                        const previousSelected = selectedLayer
                        
                        const updatedLayers = textLayers.filter(layer => layer.id !== selectedLayer.id)
                        setTextLayers(updatedLayers)
                        setSelectedLayer(null)
                        
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
        </>
      )}

      {/* Main App Container */}
      <div className={mainContainerClasses}>
        {/* Main Workspace */}
        <div className="flex flex-1 overflow-y-auto min-h-0">

          {/* Editor Section */}
          <div className="flex-1 overflow-auto flex flex-col overflow-y-auto min-h-0">
            <div
              className={workspaceContainerClasses}
              onClick={(e) => {
                // Deselect text layer when clicking outside (on the canvas/workspace area)
                // Check if click is on a layer element (text, shape, or overlay layer)
                const isClickingOnLayer = e.target.closest('[data-text-layer]') || 
                                         e.target.closest('[data-shape-layer]') ||
                                         e.target.closest('[data-overlay-layer]')
                
                // Check if clicking on the base image (not an overlay image)
                const isBaseImage = e.target.tagName === 'IMG' && e.target.closest('[data-image-editor-canvas]')
                
                // Only deselect if clicking on the workspace container itself or the base image (not on any layer)
                if (!isClickingOnLayer && (e.target === e.currentTarget || isBaseImage)) {
                  setSelectedLayer(null)
                  setSelectedShape(null)
                  setSelectedOverlayLayer(null)
                  setOverlaySelected(false)
                  setEditingTextLayerId(null) // Stop editing when clicking outside
                }
              }}
              onMouseDown={(e) => {
                if (e.defaultPrevented) return
                // Don't deselect on mousedown if clicking on a layer element
                const isClickingOnLayer = e.target.closest('[data-text-layer]') || 
                                         e.target.closest('[data-shape-layer]') ||
                                         e.target.closest('[data-overlay-layer]')
                if (!isClickingOnLayer) {
                  setOverlaySelected(false)
                }
              }}
            >
              {/* Wrapper for toolbar and canvas to ensure column layout */}
              <div className="flex flex-col items-center w-full">
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
                  {isCropping && croppingTarget === 'base' && (
                    <>
                      <div
                        className="absolute border-2 border-solid border-white cursor-move z-[1001] shadow-[0_0_0_2px_rgba(147,51,234,0.8)]"
                        style={{ 
                          left: cropArea.x, 
                          top: cropArea.y, 
                          width: cropArea.width, 
                          height: cropArea.height,
                          backgroundColor: 'transparent',
                          borderRadius: cropShape === 'circle' ? '9999px' : '0px'
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
                      {/* Corner handles */}
                      <div
                        className="absolute w-4 h-4 bg-white border-2 border-purple-600 rounded-sm cursor-nwse-resize z-[1002] shadow-lg"
                        style={{
                          left: cropArea.x - 8,
                          top: cropArea.y - 8
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setCropDragMode('nw')
                          setDragStart({ x: e.clientX, y: e.clientY })
                          setLayerStart({ x: cropArea.x, y: cropArea.y, width: cropArea.width, height: cropArea.height })
                        }}
                      />
                      <div
                        className="absolute w-4 h-4 bg-white border-2 border-purple-600 rounded-sm cursor-nesw-resize z-[1002] shadow-lg"
                        style={{
                          left: cropArea.x + cropArea.width - 8,
                          top: cropArea.y - 8
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setCropDragMode('ne')
                          setDragStart({ x: e.clientX, y: e.clientY })
                          setLayerStart({ x: cropArea.x, y: cropArea.y, width: cropArea.width, height: cropArea.height })
                        }}
                      />
                      <div
                        className="absolute w-4 h-4 bg-white border-2 border-purple-600 rounded-sm cursor-nesw-resize z-[1002] shadow-lg"
                        style={{
                          left: cropArea.x - 8,
                          top: cropArea.y + cropArea.height - 8
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setCropDragMode('sw')
                          setDragStart({ x: e.clientX, y: e.clientY })
                          setLayerStart({ x: cropArea.x, y: cropArea.y, width: cropArea.width, height: cropArea.height })
                        }}
                      />
                      <div
                        className="absolute w-4 h-4 bg-white border-2 border-purple-600 rounded-sm cursor-nwse-resize z-[1002] shadow-lg pointer-events-auto"
                        style={{
                          left: cropArea.x + cropArea.width - 8,
                          top: cropArea.y + cropArea.height - 8
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setCropDragMode('se')
                          setDragStart({ x: e.clientX, y: e.clientY })
                          setLayerStart({ x: cropArea.x, y: cropArea.y, width: cropArea.width, height: cropArea.height })
                        }}
                      />
                      {/* Side handles */}
                      <div
                        className="absolute w-8 h-2 bg-white border-2 border-purple-600 rounded-sm cursor-ns-resize z-[1002] shadow-lg pointer-events-auto"
                        style={{
                          left: cropArea.x + cropArea.width / 2 - 16,
                          top: cropArea.y - 4
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setCropDragMode('n')
                          setDragStart({ x: e.clientX, y: e.clientY })
                          setLayerStart({ x: cropArea.x, y: cropArea.y, width: cropArea.width, height: cropArea.height })
                        }}
                      />
                      <div
                        className="absolute w-8 h-2 bg-white border-2 border-purple-600 rounded-sm cursor-ns-resize z-[1002] shadow-lg pointer-events-auto"
                        style={{
                          left: cropArea.x + cropArea.width / 2 - 16,
                          top: cropArea.y + cropArea.height - 4
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setCropDragMode('s')
                          setDragStart({ x: e.clientX, y: e.clientY })
                          setLayerStart({ x: cropArea.x, y: cropArea.y, width: cropArea.width, height: cropArea.height })
                        }}
                      />
                      <div
                        className="absolute w-2 h-8 bg-white border-2 border-purple-600 rounded-sm cursor-ew-resize z-[1002] shadow-lg pointer-events-auto"
                        style={{
                          left: cropArea.x - 4,
                          top: cropArea.y + cropArea.height / 2 - 16
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setCropDragMode('w')
                          setDragStart({ x: e.clientX, y: e.clientY })
                          setLayerStart({ x: cropArea.x, y: cropArea.y, width: cropArea.width, height: cropArea.height })
                        }}
                      />
                      <div
                        className="absolute w-2 h-8 bg-white border-2 border-purple-600 rounded-sm cursor-ew-resize z-[1002] shadow-lg pointer-events-auto"
                        style={{
                          left: cropArea.x + cropArea.width - 4,
                          top: cropArea.y + cropArea.height / 2 - 16
                        }}
                        onMouseDown={(e) => {
                          e.stopPropagation()
                          setCropDragMode('e')
                          setDragStart({ x: e.clientX, y: e.clientY })
                          setLayerStart({ x: cropArea.x, y: cropArea.y, width: cropArea.width, height: cropArea.height })
                        }}
                      />
                    </>
                  )}
                  <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                    {shapeLayers.map((shape) => {
                      // Get z-index from layer order
                      const layerOrderIndex = layerOrder.findIndex(l => l.type === 'shape' && l.id === shape.id)
                      const layerData = layerOrder.find(l => l.type === 'shape' && l.id === shape.id)
                      const isVisible = layerData?.visible !== false
                      
                      if (!isVisible) return null // Hide if visibility is off
                      
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
                        zIndex: 50 + layerOrderIndex, // Use layer order for z-index
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
                          data-shape-layer={shape.id}
                          className={`${selectedShape?.id === shape.id ? 'selected' : ''}`}
                          style={wrapperStyle}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleShapeClick(shape)
                          }}
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
                      // Get z-index from layer order
                      const layerOrderIndex = layerOrder.findIndex(l => l.type === 'text' && l.id === layer.id)
                      const layerData = layerOrder.find(l => l.type === 'text' && l.id === layer.id)
                      const isVisible = layerData?.visible !== false
                      
                      if (!isVisible) return null // Hide if visibility is off
                      
                      const leftPx = percentToDisplayPx(layer.x, 'x')
                      const topPx = percentToDisplayPx(layer.y, 'y')
                      const widthPx = percentToDisplayPx(layer.width, 'x')
                      const heightPx = percentToDisplayPx(layer.height, 'y')
                      
                      // Check if this layer is part of a selected group
                      const isSelected = selectedLayer?.id === layer.id
                      const isInSelectedGroup = selectedLayer?.groupId && layer.groupId === selectedLayer.groupId && layer.id !== selectedLayer.id
                      
                      return (
                        <div
                          key={layer.id}
                          data-text-layer={layer.id}
                          className={`absolute cursor-move p-1 ${
                            isSelected 
                              ? 'border-2 border-purple-600 bg-transparent' 
                              : isInSelectedGroup 
                                ? 'border-2 border-purple-400 bg-transparent' 
                                : 'border-2 border-transparent'
                          }`}
                          style={{
                            left: `${clampPercentValue(layer.x)}%`,
                            top: `${clampPercentValue(layer.y)}%`,
                            width: `${clampPercentValue(layer.width)}%`,
                            height: `${clampPercentValue(layer.height)}%`,
                            zIndex: 50 + layerOrderIndex, // Use layer order for z-index
                            pointerEvents: 'auto'
                          }}
                          onClick={(e) => {
                            e.stopPropagation()
                            handleLayerClick(layer)
                            // If clicking on already selected layer, start editing
                            if (selectedLayer?.id === layer.id && !editingTextLayerId) {
                              setEditingTextLayerId(layer.id)
                            }
                          }}
                          onDoubleClick={(e) => {
                            e.stopPropagation()
                            handleLayerClick(layer)
                            setEditingTextLayerId(layer.id)
                          }}
                          onMouseDown={(e) => {
                            // Don't start drag if we're about to edit
                            if (editingTextLayerId === layer.id) {
                              e.stopPropagation()
                              return
                            }
                            handleMouseDown(e, layer.id, 'drag')
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
                          ) : editingTextLayerId === layer.id ? (
                            <input
                              type="text"
                              value={layer.text}
                              onChange={(e) => {
                                const newText = e.target.value
                                const updatedLayers = textLayers.map(l =>
                                  l.id === layer.id ? { ...l, text: newText } : l
                                )
                                setTextLayers(updatedLayers)
                                if (selectedLayer?.id === layer.id) {
                                  setSelectedLayer({ ...selectedLayer, text: newText })
                                }
                              }}
                              onBlur={() => {
                                setEditingTextLayerId(null)
                              }}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                  e.preventDefault()
                                  setEditingTextLayerId(null)
                                }
                                if (e.key === 'Escape') {
                                  e.preventDefault()
                                  setEditingTextLayerId(null)
                                }
                                e.stopPropagation()
                              }}
                              autoFocus
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
                                border: '2px solid #7c3aed',
                                outline: 'none',
                                width: '100%',
                                height: '100%',
                                ...getTextEffectStyles(layer),
                                ...getWordArtStyles(layer)
                              }}
                              className="pointer-events-auto"
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
                          {/* Group indicator badge */}
                          {layer.groupId && (
                            <div
                              className="absolute -top-1 -left-1 w-5 h-5 bg-blue-500 border-2 border-white rounded-full flex items-center justify-center z-10 shadow-sm"
                              title="Grouped text - moves together"
                            >
                              <svg width="10" height="10" viewBox="0 0 24 24" fill="white" stroke="none">
                                <circle cx="8" cy="8" r="2"/>
                                <circle cx="16" cy="8" r="2"/>
                                <circle cx="8" cy="16" r="2"/>
                                <circle cx="16" cy="16" r="2"/>
                              </svg>
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  
                  {/* Overlay Image */}
                  {renderAllOverlayLayers()}
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
          </div>

          {/* Left Flyout Panel - Layers */}
          {activePanel === 'layers' && (
            <div className="absolute top-0 left-0 w-96 h-full bg-gradient-to-b from-white to-gray-50 shadow-2xl z-10 flex flex-col transform transition-transform duration-400 ease-out border-r border-gray-200">
              <div className="px-8 pt-8 pb-6 border-b border-gray-200 flex justify-between items-center bg-gradient-to-br from-white to-gray-50 relative">
                <h3 className="m-0 text-xl font-extrabold text-gray-800 uppercase tracking-wide">Layers</h3>
                <button 
                  className="absolute top-6 right-6 w-8 h-8 border-none bg-gray-200 text-gray-600 rounded-full cursor-pointer flex items-center justify-center transition-all text-base hover:bg-red-500 hover:text-white hover:scale-110" 
                  onClick={() => setActivePanel(null)}
                >
                  <FaTimes size={16} />
                </button>
              </div>
              <div className="flex-1 px-8 py-8 overflow-y-auto flex flex-col gap-6">
                {/* Layers Panel Content */}
                <div className="control-group">
                  <label className="text-lg font-bold text-gray-800 mb-4 block">
                    ALL LAYERS
                    <span className="block w-16 h-0.5 bg-purple-600 mt-1"></span>
                  </label>
                  
                  {getAllLayers.length === 0 ? (
                    <p className="text-sm text-gray-500 text-center py-8">
                      No layers yet. Add text, shapes, or overlays to see them here.
                    </p>
                  ) : (
                    <div className="space-y-2">
                      {getAllLayers.slice().reverse().map((layer, index) => {
                        const actualIndex = getAllLayers.length - 1 - index
                        const orderNumber = index + 1 // Order from top (1 = topmost layer)
                        const isSelected = (layer.type === 'text' && selectedLayer?.id === layer.id) || 
                                         (layer.type === 'shape' && selectedShape?.id === layer.id) ||
                                         (layer.type === 'overlay' && selectedOverlayLayer?.id === layer.id)
                        const layerName = layer.type === 'text' 
                          ? layer.text.substring(0, 20) + (layer.text.length > 20 ? '...' : '')
                          : layer.type === 'overlay'
                          ? `Overlay Image ${orderNumber}`
                          : `${layer.type.charAt(0).toUpperCase() + layer.type.slice(1)}`
                        
                        return (
                          <div
                            key={`${layer.type}-${layer.id}`}
                            className={`p-3 rounded-lg border-2 transition-all cursor-pointer ${
                              isSelected 
                                ? 'bg-purple-100 border-purple-600' 
                                : 'bg-white border-gray-200 hover:border-purple-300 hover:bg-purple-50'
                            }`}
                            onClick={() => selectLayer(layer.type, layer.id)}
                          >
                            <div className="flex items-center gap-2">
                              {/* Layer Type Icon */}
                              <div className="flex-shrink-0">
                                <Icon 
                                  name={layer.type === 'text' ? 'type' : layer.type === 'overlay' ? 'image' : 'shape'} 
                                  size={16} 
                                />
                              </div>
                              
                              {/* Layer Name */}
                              <div className="flex-1 min-w-0">
                                <div className="text-sm font-medium text-gray-800 truncate">
                                  {layerName}
                                </div>
                                <div className="text-xs text-gray-500">
                                  {layer.type === 'text' ? `Text Layer` : 
                                   layer.type === 'overlay' ? `Overlay` : 
                                   `Shape: ${layer.type}`}
                                </div>
                              </div>
                              
                              {/* Layer Controls */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                {/* Visibility Toggle */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    toggleLayerVisibility(layer.type, layer.id)
                                  }}
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-white transition-colors"
                                  title={layer.visible !== false ? 'Hide' : 'Show'}
                                >
                                  <Icon name={layer.visible !== false ? 'eye' : 'eyeOff'} size={14} />
                                </button>
                                
                                {/* Move Up */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    moveLayerUp(layer.type, layer.id)
                                  }}
                                  disabled={actualIndex === getAllLayers.length - 1}
                                  className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                                    actualIndex === getAllLayers.length - 1 
                                      ? 'text-gray-300 cursor-not-allowed' 
                                      : 'hover:bg-white text-gray-700'
                                  }`}
                                  title="Move Up"
                                >
                                  <Icon name="chevronUp" size={14} />
                                </button>
                                
                                {/* Move Down */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    moveLayerDown(layer.type, layer.id)
                                  }}
                                  disabled={actualIndex === 0}
                                  className={`w-6 h-6 flex items-center justify-center rounded transition-colors ${
                                    actualIndex === 0 
                                      ? 'text-gray-300 cursor-not-allowed' 
                                      : 'hover:bg-white text-gray-700'
                                  }`}
                                  title="Move Down"
                                >
                                  <Icon name="chevronDown" size={14} />
                                </button>
                                
                                {/* Delete */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation()
                                    deleteLayer(layer.type, layer.id)
                                  }}
                                  className="w-6 h-6 flex items-center justify-center rounded hover:bg-red-100 text-red-600 transition-colors"
                                  title="Delete"
                                >
                                  <Icon name="trash" size={14} />
                                </button>
                              </div>
                            </div>
                            
                            {/* Quick Actions Row */}
                            <div className="mt-2 flex gap-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveLayerToTop(layer.type, layer.id)
                                }}
                                className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                title="To Front"
                              >
                                To Front
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  moveLayerToBottom(layer.type, layer.id)
                                }}
                                className="flex-1 px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
                                title="To Back"
                              >
                                To Back
                              </button>
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                  
                  <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                    <p className="text-xs text-blue-800">
                      💡 <strong>Tip:</strong> Layers at the top appear in front. Drag items up/down to reorder across all types (text, shapes, overlays).
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Right Flyout Panel - Other Panels */}
          {activePanel && activePanel !== 'layers' && (
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

              {/* Layer Ordering Controls */}
              <div className="control-group">
                <label style={{ marginBottom: '0.5rem', display: 'block' }}>Layer Order</label>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                  <button
                    onClick={bringLayerToFront}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                    title="Bring to Front"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="5" y="11" width="14" height="10" rx="2"/>
                      <path d="M9 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4"/>
                    </svg>
                    To Front
                  </button>
                  <button
                    onClick={bringLayerForward}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                    title="Bring Forward"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="18 15 12 9 6 15"/>
                    </svg>
                    Forward
                  </button>
                  <button
                    onClick={sendLayerBackward}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                    title="Send Backward"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <polyline points="6 9 12 15 18 9"/>
                    </svg>
                    Backward
                  </button>
                  <button
                    onClick={sendLayerToBack}
                    className="btn btn-secondary"
                    style={{ fontSize: '0.75rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                    title="Send to Back"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <rect x="9" y="3" width="14" height="10" rx="2"/>
                      <path d="M15 13v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/>
                    </svg>
                    To Back
                  </button>
                </div>
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

                    {/* NEW: Text Presets Section - Canva-style (Always visible) */}
                    <div className="control-group" style={{ marginTop: '2rem' }}>
                      <label style={{ 
                        fontSize: '1.125rem', 
                        fontWeight: 'bold', 
                        color: '#1f2937',
                        marginBottom: '1rem',
                        display: 'block'
                      }}>
                        TEXT PRESETS
                        <span style={{
                          display: 'block',
                          width: '4rem',
                          height: '2px',
                          backgroundColor: '#7c3aed',
                          marginTop: '0.25rem'
                        }}></span>
                      </label>
                      
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '1rem'
                      }}>
                        {TEXT_PRESETS.map((preset) => (
                          <PresetPreview key={preset.id} preset={preset} onClick={applyTextPreset} />
                        ))}
                      </div>
                      
                      <p style={{
                        fontSize: '0.75rem',
                        color: '#6b7280',
                        marginTop: '1rem',
                        textAlign: 'center'
                      }}>
                        Click any preset to add it to your canvas
                      </p>
                    </div>
                    </>
                  )}
                  

                {activePanel === 'shapes' && (
                  <>
                    <div className="control-group">
                      <label className="text-lg font-bold text-gray-800 mb-2 block">
                        ADD SHAPE
                        <span className="block w-16 h-0.5 bg-purple-600 mt-1"></span>
                      </label>
                      
                      {/* Default Shape Color Picker */}
                      {/* <div className="mb-4">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Default Shape Color</label>
                        <div className="flex items-center gap-3">
                          <input
                            type="color"
                            value={defaultShapeColor}
                            onChange={(e) => setDefaultShapeColor(e.target.value)}
                            className="w-12 h-12 rounded-lg border-2 border-gray-300 cursor-pointer"
                            title="Change default shape color"
                          />
                          <span className="text-sm text-gray-600">{defaultShapeColor}</span>
                        </div>
                      </div> */}
                      
                      <div className="shape-buttons grid grid-cols-5 gap-3">
                        <button
                          className="group relative w-14 h-14 flex items-center justify-center rounded-xl border-2 transition-all duration-200 shadow-sm hover:shadow-md"
                          style={{
                            borderColor: '#d1d5db',
                            backgroundColor: '#f9fafb'
                          }}
                          onClick={() => handleAddShape('rectangle')}
                          title="Rectangle"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = defaultShapeColor
                            e.currentTarget.style.backgroundColor = defaultShapeColor + '20'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#d1d5db'
                            e.currentTarget.style.backgroundColor = '#f9fafb'
                          }}
                        >
                          <div 
                            className="w-8 h-6 rounded-sm transition-colors duration-200" 
                            style={{ backgroundColor: defaultShapeColor }}
                          />
                        </button>
                        <button
                          className="group relative w-14 h-14 flex items-center justify-center rounded-xl border-2 transition-all duration-200 shadow-sm hover:shadow-md"
                          style={{
                            borderColor: '#d1d5db',
                            backgroundColor: '#f9fafb'
                          }}
                          onClick={() => handleAddShape('square')}
                          title="Square"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = defaultShapeColor
                            e.currentTarget.style.backgroundColor = defaultShapeColor + '20'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#d1d5db'
                            e.currentTarget.style.backgroundColor = '#f9fafb'
                          }}
                        >
                          <div 
                            className="w-6 h-6 rounded-sm transition-colors duration-200" 
                            style={{ backgroundColor: defaultShapeColor }}
                          />
                        </button>
                        <button
                          className="group relative w-14 h-14 flex items-center justify-center rounded-xl border-2 transition-all duration-200 shadow-sm hover:shadow-md"
                          style={{
                            borderColor: '#d1d5db',
                            backgroundColor: '#f9fafb'
                          }}
                          onClick={() => handleAddShape('circle')}
                          title="Circle"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = defaultShapeColor
                            e.currentTarget.style.backgroundColor = defaultShapeColor + '20'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#d1d5db'
                            e.currentTarget.style.backgroundColor = '#f9fafb'
                          }}
                        >
                          <div 
                            className="w-7 h-7 rounded-full transition-colors duration-200" 
                            style={{ backgroundColor: defaultShapeColor }}
                          />
                        </button>
                        <button
                          className="group relative w-14 h-14 flex items-center justify-center rounded-xl border-2 transition-all duration-200 shadow-sm hover:shadow-md"
                          style={{
                            borderColor: '#d1d5db',
                            backgroundColor: '#f9fafb'
                          }}
                          onClick={() => handleAddShape('line')}
                          title="Line"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = defaultShapeColor
                            e.currentTarget.style.backgroundColor = defaultShapeColor + '20'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#d1d5db'
                            e.currentTarget.style.backgroundColor = '#f9fafb'
                          }}
                        >
                          <div 
                            className="w-8 h-1 transition-colors duration-200" 
                            style={{ backgroundColor: defaultShapeColor }}
                          />
                        </button>
                        <button
                          className="group relative w-14 h-14 flex items-center justify-center rounded-xl border-2 transition-all duration-200 shadow-sm hover:shadow-md"
                          style={{
                            borderColor: '#d1d5db',
                            backgroundColor: '#f9fafb'
                          }}
                          onClick={() => handleAddShape('curve')}
                          title="Curved Line"
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = defaultShapeColor
                            e.currentTarget.style.backgroundColor = defaultShapeColor + '20'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#d1d5db'
                            e.currentTarget.style.backgroundColor = '#f9fafb'
                          }}
                        >
                          <svg width="32" height="16" viewBox="0 0 32 16" className="transition-colors duration-200">
                            <path 
                              d="M 4 12 Q 16 4, 28 12" 
                              fill="none" 
                              stroke={defaultShapeColor} 
                              strokeWidth="3" 
                              strokeLinecap="round"
                            />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {selectedShape && (
                      <>
                        {/* <div className="control-group">
                          <label>Shape Type</label>
                          <div className="selected-shape-type">{selectedShape.type}</div>
                        </div> */}

                        {/* Layer Ordering Controls for Shapes */}
                        <div className="control-group">
                          <label style={{ marginBottom: '0.5rem', display: 'block' }}>Layer Order</label>
                          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem' }}>
                            <button
                              onClick={bringShapeToFront}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                              title="Bring to Front"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="5" y="11" width="14" height="10" rx="2"/>
                                <path d="M9 11V7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-4"/>
                              </svg>
                              To Front
                            </button>
                            <button
                              onClick={bringShapeForward}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                              title="Bring Forward"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="18 15 12 9 6 15"/>
                              </svg>
                              Forward
                            </button>
                            <button
                              onClick={sendShapeBackward}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                              title="Send Backward"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <polyline points="6 9 12 15 18 9"/>
                              </svg>
                              Backward
                            </button>
                            <button
                              onClick={sendShapeToBack}
                              className="btn btn-secondary"
                              style={{ fontSize: '0.75rem', padding: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem' }}
                              title="Send to Back"
                            >
                              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <rect x="9" y="3" width="14" height="10" rx="2"/>
                                <path d="M15 13v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h4"/>
                              </svg>
                              To Back
                            </button>
                          </div>
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
                          <button 
                            className="btn btn-danger" 
                            onClick={handleShapeDelete}
                            style={{ 
                              width: '100%', 
                              display: 'flex', 
                              alignItems: 'center', 
                              justifyContent: 'center',
                              gap: '0.5rem',
                              fontWeight: '600'
                            }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            Delete Shape
                          </button>
                          <p style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '0.5rem', textAlign: 'center' }}>
                            Or press <kbd style={{ padding: '0.125rem 0.375rem', background: '#f3f4f6', border: '1px solid #d1d5db', borderRadius: '0.25rem', fontSize: '0.75rem' }}>Delete</kbd> key
                          </p>
                        </div>
                      </>
                    )}
                  </>
                )}


                {activePanel === 'overlay' && (
                  <>
                    <div className="control-group">
                      <label className="text-lg font-bold text-gray-800 mb-4 block">
                        OVERLAY IMAGE
                        <span className="block w-16 h-0.5 bg-purple-600 mt-1"></span>
                      </label>
                      
                      {/* Beautiful Upload Box with + Icon */}
                      <div 
                        className="relative"
                        onClick={() => document.getElementById('overlay-file-input').click()}
                      >
                        <div
                          style={{
                            border: '2px dashed #d1d5db',
                            borderRadius: '16px',
                            padding: '2rem',
                            backgroundColor: '#f9fafb',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            minHeight: '180px',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '1rem',
                            position: 'relative',
                            overflow: 'hidden'
                          }}
                          onMouseEnter={(e) => {
                            e.currentTarget.style.borderColor = '#7c3aed'
                            e.currentTarget.style.backgroundColor = '#faf5ff'
                            e.currentTarget.style.transform = 'translateY(-2px)'
                            e.currentTarget.style.boxShadow = '0 8px 16px rgba(124, 58, 237, 0.15)'
                          }}
                          onMouseLeave={(e) => {
                            e.currentTarget.style.borderColor = '#d1d5db'
                            e.currentTarget.style.backgroundColor = '#f9fafb'
                            e.currentTarget.style.transform = 'translateY(0)'
                            e.currentTarget.style.boxShadow = 'none'
                          }}
                        >
                          {/* Large + Icon */}
                          <div style={{
                            width: '64px',
                            height: '64px',
                            borderRadius: '50%',
                            backgroundColor: '#7c3aed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)'
                          }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round">
                              <line x1="12" y1="5" x2="12" y2="19" />
                              <line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                          </div>
                          
                          {/* Upload Text */}
                          <div style={{ textAlign: 'center' }}>
                            <h4 style={{ 
                              fontSize: '1rem', 
                              fontWeight: '600', 
                              color: '#1f2937',
                              marginBottom: '0.25rem'
                            }}>
                              Add Overlay Image
                            </h4>
                            <p style={{ 
                              fontSize: '0.875rem', 
                              color: '#6b7280'
                            }}>
                              Click to browse or drag & drop
                            </p>
                            <p style={{ 
                              fontSize: '0.75rem', 
                              color: '#9ca3af',
                              marginTop: '0.5rem'
                            }}>
                              PNG, JPG, WEBP up to 10MB
                            </p>
                          </div>
                          
                          {/* Hidden File Input */}
                      <input
                            id="overlay-file-input"
                        type="file"
                        accept="image/*"
                        onChange={handleOverlayImageUpload}
                            style={{ display: 'none' }}
                          />
                        </div>
                      </div>
                      
                      {overlayImageUrl && !overlayVisible && (
                        <button 
                          onClick={() => setOverlayVisible(true)}
                          className="btn btn-primary"
                          style={{ marginTop: '1rem', width: '100%' }}
                        >
                          Show Overlay on Canvas
                        </button>
                      )}
                      
                      {/* Delete button for selected overlay layer */}
                      {selectedOverlayLayer && (
                        <div className="control-group" style={{ marginTop: '1rem' }}>
                          <button 
                            className="btn btn-danger" 
                            onClick={handleOverlayLayerDelete}
                            style={{ width: '100%' }}
                          >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ marginRight: '0.5rem', display: 'inline-block' }}>
                              <path d="M3 6h18"/>
                              <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                              <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                            </svg>
                            Delete Overlay Layer
                          </button>
                        </div>
                      )}
                    </div>
                    {overlayVisible && overlayImage && (
                      <>
                        <div className="control-group">
                          <label>Size</label>
                          <div className="size-inputs">
                            <input
                              type="number"
                              min="10"
                              value={Math.round(overlaySize?.width || (overlayImage.width * overlayScale) || 200)}
                              onChange={(e) => {
                                const newWidth = Math.max(10, parseInt(e.target.value) || 10)
                                setOverlaySize({ 
                                  width: newWidth, 
                                  height: overlaySize?.height || (overlayImage.height * overlayScale) || 200 
                                })
                                // Update scale for backward compatibility
                                if (overlayImage && overlayImage.width > 0) {
                                  setOverlayScale(newWidth / overlayImage.width)
                                }
                              }}
                              className="text-input"
                            />
                            <span>x</span>
                            <input
                              type="number"
                              min="10"
                              value={Math.round(overlaySize?.height || (overlayImage.height * overlayScale) || 200)}
                              onChange={(e) => {
                                const newHeight = Math.max(10, parseInt(e.target.value) || 10)
                                setOverlaySize({ 
                                  width: overlaySize?.width || (overlayImage.width * overlayScale) || 200,
                                  height: newHeight 
                                })
                                // Update scale for backward compatibility
                                if (overlayImage && overlayImage.height > 0) {
                                  setOverlayScale(newHeight / overlayImage.height)
                                }
                              }}
                              className="text-input"
                            />
                          </div>
                        </div>
                        {isAnchorModel && (
                          <div className="control-group">
                            <label className="flex items-center cursor-pointer">
                              <input
                                type="checkbox"
                                checked={overlayBackgroundRemoved}
                                onChange={(e) => {
                                  console.log('Checkbox changed', e.target.checked, { isAnchorModel, overlayVisible, overlayImage: !!overlayImage })
                                  if (e.target.checked) {
                                    removeOverlayBackground()
                                  } else {
                                    // If unchecking, we'd need to restore original, but for now just reset state
                                    setOverlayBackgroundRemoved(false)
                                  }
                                }}
                                disabled={isRemovingBackground}
                                className="mr-2 w-4 h-4"
                              />
                              <span>Remove Background</span>
                              {isRemovingBackground && (
                                <span className="ml-2 text-sm text-gray-500 flex items-center">
                                  <span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin mr-1"></span>
                                  Processing...
                                </span>
                              )}
                            </label>
                          </div>
                        )}
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
                      <label>Crop Shape</label>
                      <div className="action-buttons">
                        <button
                          className={`btn btn-secondary ${isCropping ? '' : 'opacity-60 cursor-not-allowed'}`}
                          onClick={toggleCropShape}
                          type="button"
                          disabled={!isCropping}
                          title={isCropping ? 'Toggle crop shape' : 'Start crop to enable shape toggle'}
                        >
                          {cropShape === 'circle' ? 'Circle Crop' : 'Square Crop'}
                        </button>
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
    
    {/* Styles for text presets */}
    <style jsx>{`
      .preset-card:hover .preset-label {
        opacity: 1 !important;
      }
    `}</style>
    </>
  )
}

export default ImageEdit