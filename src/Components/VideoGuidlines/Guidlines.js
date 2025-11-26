import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectGuidelinesForm, setGuidelinesState } from '../../redux/slices/guidelinesSlice'
import { Link } from 'react-router-dom'
import useBrandAssets from '../../hooks/useBrandAssets'
import FileUpload from '../BrandAssets/FileUpload'
import BrandAssetsDisplay from '../BrandAssets/BrandAssetsDisplay'
import { FaChevronDown, FaTimes, FaPlus, FaEyeDropper, FaMicrophone, FaUpload, FaAngleDown, FaCheck, FaAngleUp } from 'react-icons/fa'
import { HexColorPicker } from 'react-colorful'

const Guidlines = () => {
  const dispatch = useDispatch()
  const savedForm = useSelector(selectGuidelinesForm)
  const [goal, setGoal] = useState(true)
  const [brandLogos, setBrandLogos] = useState([]);
  const [showBrand, setShowBrand] = useState(false)
  const [isFontOpen, setIsFontOpen] = useState(false)
  const [selectedFonts, setSelectedFonts] = useState([])
  const [selectedColors, setSelectedColors] = useState(new Set())
  const [customColors, setCustomColors] = useState([])
  const [currentColor, setCurrentColor] = useState('#4f46e5')
  const [addvoice, setAddvoice] = useState(false)
  // Brand voices fetched from API
  const [brandVoices, setBrandVoices] = useState([])
  // Staged voice blobs before saving to Brand Assets
  const [pendingVoiceBlobs, setPendingVoiceBlobs] = useState([])
  const [pendingVoiceUrls, setPendingVoiceUrls] = useState([])
  const [isVoiceUploading, setIsVoiceUploading] = useState(false)
  // Recording
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const [isRecording, setIsRecording] = useState(false)
  const audioPreviewRef = useRef(null)
  // Local simple voices for selectable mic icons (optional)
  const [voices, setVoices] = useState([
    { id: 1, name: 'Voice 1', isSelected: false },
    { id: 2, name: 'Voice 2', isSelected: false },
    { id: 3, name: 'Voice 3', isSelected: false }
  ])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [selectedVoiceFromLibrary, setSelectedVoiceFromLibrary] = useState(null)
  const fileInputRef = useRef(null)
  const voiceModalFileInputRef = useRef(null)
  const colorInputRef = useRef(null)
  const avatarInputRef = useRef(null)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)

  const extractBrandVoiceName = useCallback((voice, index) => {
    if (!voice) return `Voice ${index + 1}`
    if (typeof voice === 'object' && voice !== null) {
      const candidates = [
        voice.name,
        voice.voiceover_name,
        voice.voice_name,
        voice.voiceName,
        voice.title,
        voice.display_name,
        voice.label
      ]
      const match = candidates.find(value => typeof value === 'string' && value.trim())
      if (match) return match.trim()
    }
    return `Voice ${index + 1}`
  }, [])

  // If brand assets are present later, auto-enable related toggles
  useEffect(() => {
    try {
      if (Array.isArray(brandLogos) && brandLogos.length > 0) {
        if (selectedLogo !== 'yes') setSelectedLogo('yes')
        if (!selectedLogoUrl) {
          const first = brandLogos[0]
          const url = typeof first === 'string' ? first : (first?.url || first?.image_url || first?.imageUrl || first?.src || '')
          if (url) setSelectedLogoUrl(url)
        }
      }
      if (Array.isArray(selectedFonts) && selectedFonts.length > 0 && selectedFont !== 'yes') {
        setSelectedFont('yes')
      }
      if (selectedColors instanceof Set && selectedColors.size > 0 && selectedColor !== 'yes') {
        setSelectedColor('yes')
      }
    } catch (_) { /* noop */ }
  }, [brandLogos, selectedFonts, selectedColors])

  // Presenter options (for Avatar/Hybrid video types)
  const PRESENTER_OPTIONS = [
    { option: 'Confident Entrance (Walk-in)', user_description: 'The [Presenter] enters confidently from the side, walks to the center, and pauses, ready to address the audience against a [background].', prompt_template: 'Generate a cinematic 4K Veo 3 shot of [Presenter] in professional attire walking confidently from the left, stopping center-frame against a [background]. The presenter should make natural eye contact with the camera, have a controlled, authoritative pace, and be lit by soft, professional studio lighting. Ensure realistic motion and a balanced composition.', prompt_sample: 'Generate a cinematic 4K Veo 3 shot of a woman with dark hair in a sharp navy blue suit walking confidently from the left, stopping center-frame against a bright, minimalist office lobby with a large window and green plants. She makes natural eye contact with the camera, her pace controlled and authoritative. The scene is lit by soft, diffused studio lighting that creates a professional, flattering look. Realistic motion physics and a perfectly balanced medium shot composition.', sample_video: 'https://example.com/sample_confident_entry.mp4' },
    { option: 'Direct Address (Step Forward)', user_description: "The [Presenter] takes a deliberate step toward the camera, creating a sense of direct engagement, and begins speaking to the viewer from a [background].", prompt_template: 'Create a Veo 3 cinematic medium shot of [Presenter] in a [background] taking one confident step forward. The camera should subtly move with them, enhancing the feeling of direct address. Maintain sharp focus on the [Presenter]\'s face, shallow depth of field, warm, inviting lighting, and lifelike, engaging body language.', prompt_sample: 'Create a Veo 3 cinematic medium shot of a male presenter in a light grey turtleneck and blazer, set against a modern studio with warm wooden panels and soft ambient light. He takes one confident step forward, and the camera subtly pushes in with him, creating a strong sense of direct engagement. His face is in sharp focus, with a shallow depth of field blurring the background. The lighting is warm and inviting, highlighting his engaging body language.', sample_video: 'https://example.com/sample_step_forward.mp4' },
    { option: 'Data Visualization (Gesture)', user_description: 'The [Presenter] stands mid-frame within a [background], gesturing clearly and naturally toward on-screen graphics (e.g., charts, text) that will be added later.', prompt_template: 'Generate a professional 4K Veo 3 scene. [Presenter] stands in a [background], gesturing decisively toward an empty space (for future graphics). Their body language must be clear, gaze direction must follow the gesture, and hand articulation must be precise. Use clean, even lighting and cinematic realism.', prompt_sample: 'Generate a professional 4K Veo 3 scene. A female data scientist in a crisp white shirt stands in a clean, futuristic white studio background. She gestures decisively with an open palm toward the empty space to her right, as if presenting a growth chart. Her gaze follows the gesture, and her hand articulation is precise. The shot uses clean, even, high-key lighting and cinematic realism.', sample_video: 'https://example.com/sample_gesture_graphics.mp4' },
    { option: 'Walk and Talk (Tracking Shot)', user_description: 'A smooth tracking shot follows the [Presenter] as they walk across the [background], explaining a concept with natural gestures and articulation.', prompt_template: 'Generate a 4K Veo 3 smooth tracking shot (stabilized gimbal or dolly feel) following [Presenter] walking left-to-right across a [background]. The [Presenter] should look mostly at the camera while walking and talking, using expressive hand gestures. Ensure natural motion, crisp lighting, and synchronized lip movement for narration.', prompt_sample: 'Generate a 4K Veo 3 smooth tracking shot with a stabilized gimbal feel, following an architect in a casual-smart outfit as he walks left-to-right through a bright, open-plan modern office space with glass partitions. He looks directly at the camera, talking and using expressive hand gestures. The motion is natural, the lighting is crisp and airy, and his lip movements are perfectly synchronized for narration.', sample_video: 'https://example.com/sample_walk_across.mp4' },
    { option: 'Dynamic Interaction (Virtual Elements)', user_description: 'The [Presenter] stands in a [background] and dynamically interacts with virtual 3D objects or data visualizations that appear around them, as if manipulating them.', prompt_template: 'Create a high-tech cinematic Veo 3 render of [Presenter] in a [background], dynamically engaging with virtual 3D elements (e.g., rotating a model, swiping through data). Ensure natural interaction timing, accurate eye-tracking on the virtual objects, and immersive lighting that realistically reflects off the [Presenter]. Seamless, futuristic motion realism is key.', prompt_sample: 'Create a high-tech cinematic Veo 3 render of a tech CEO on a dark, sleek holographic interface stage. She dynamically engages with a floating 3D model of a new product, rotating it with her hands. Her eye-tracking is accurate, and the blue light from the hologram realistically reflects on her face and clothes. The motion is seamless and futuristic.', sample_video: 'https://example.com/sample_virtual_interact.mp4' },
    { option: 'Seated at Desk (Explainer)', user_description: 'The [Presenter] is seated at a professional desk in a [background], speaking directly to the camera in a clear, informative manner.', prompt_template: 'Generate a 4K Veo 3 medium shot of [Presenter] seated at a modern, clean desk in a [background] (e.g., office, studio). The [Presenter] should be leaning slightly forward, speaking engagingly to the camera. Use professional 3-point lighting, sharp focus, and a clean, uncluttered composition.', prompt_sample: 'Generate a 4K Veo 3 medium shot of a friendly financial advisor seated at a modern oak desk in a tasteful home office with a blurred bookshelf and a plant. He is leaning slightly forward, speaking engagingly to the camera. The shot uses professional 3-point lighting (soft key, fill, and a subtle hair light) for a polished, trustworthy look. The composition is clean, with sharp focus on the presenter.', sample_video: 'https://example.com/sample_seated_desk.mp4' },
    { option: 'Podium Presentation (Keynote)', user_description: 'The [Presenter] stands confidently behind a podium in a [background] (e.g., stage, conference room), delivering a formal presentation.', prompt_template: 'Create a professional Veo 3 medium-long shot of [Presenter] standing behind a sleek podium against a [background] (e.g., large screen, stage curtains). The [Presenter] should exhibit authoritative posture, use purposeful hand gestures, and deliver a convincing speech. Lighting should be dramatic but clear, simulating a stage environment.', prompt_sample: 'Create a professional Veo 3 medium-long shot of a CEO in a dark suit standing behind a sleek, modern podium. The background is a large, softly lit stage with a massive blue presentation screen. The presenter has an authoritative posture and uses purposeful hand gestures. The lighting simulates a professional stage environment, with a strong, flattering spotlight on the presenter and dramatic, colored uplighting in the background.', sample_video: 'https://example.com/sample_podium_keynote.mp4' },
    { option: 'Whiteboard Explanation (Strategy)', user_description: 'The [Presenter] stands next to a whiteboard or glassboard in a [background], writing or drawing to illustrate a point for the viewer.', prompt_template: 'Generate a 4K Veo 3 wide shot of [Presenter] standing beside a whiteboard/glassboard in a [background] (e.g., meeting room, innovation lab). The [Presenter] should be actively writing or drawing a diagram, turning occasionally to explain to the camera. Ensure the motion of writing is realistic and the presenter\'s focus is divided naturally between the board and the viewer.', prompt_sample: 'Generate a 4K Veo 3 wide shot of a project manager in a collared shirt standing beside a large glassboard in a bright, collaborative meeting room. She is actively drawing a flowchart with a black marker, turning every few seconds to explain a point directly to the camera. The motion of her writing is fluid and realistic. The room is filled with natural light from large windows.', sample_video: 'https://example.com/sample_whiteboard.mp4' },
    { option: 'Emphatic Close-up (Key Message)', user_description: "The shot tightens to a close-up on the [Presenter]'s face as they deliver a critical message with conviction and sincerity, set in a [background].", prompt_template: "Create a tight cinematic Veo 3 close-up shot of [Presenter] in a [background]. The focus is entirely on their facial expression, which should convey sincerity and conviction. The background should be softly blurred (deep bokeh). Use soft, flattering key lighting to highlight their expression. This shot is for delivering a key takeaway.", prompt_sample: 'Create a tight cinematic Veo 3 close-up shot (from the shoulders up) of a senior executive in a softly lit studio. The focus is razor-sharp on her eyes, conveying deep sincerity and conviction. The background is extremely blurred, with beautiful, deep bokeh. A soft, flattering key light is used, creating gentle shadows and highlighting her focused expression. This shot is for a powerful key takeaway.', sample_video: 'https://example.com/sample_close_up.mp4' },
    { option: 'anchor mode', size: '', position: 'bottomleft' }
  ];
  const [selectedPresenter, setSelectedPresenter] = useState(null);
  const [isPresenterVisible, setIsPresenterVisible] = useState(false);
  const [anchorSize, setAnchorSize] = useState('');
  const [anchorPosition, setAnchorPosition] = useState('bottomleft');
  useEffect(() => {
    try {
      const sid = (typeof window !== 'undefined' && localStorage.getItem('session_id')) || '';
      // Hide presenter options entirely in Guidelines for all video types
      const visible = false;
      setIsPresenterVisible(visible);
      // restore selection if any
      const saved = sid ? localStorage.getItem(`presenter_option:${sid}`) : null;
      if (saved) {
        const obj = JSON.parse(saved);
        setSelectedPresenter(obj);
        if (obj && obj.option === 'anchor mode') {
          if (obj.size) setAnchorSize(obj.size);
          if (obj.position) setAnchorPosition(obj.position);
        }
      }
    } catch (_) { /* noop */ }
  }, []);
  const handlePresenterSelect = (opt) => {
    setSelectedPresenter(opt);
    try {
      const sid = (typeof window !== 'undefined' && localStorage.getItem('session_id')) || '';
      const payload = opt && opt.option === 'anchor mode' ? { ...opt, size: (anchorSize || ''), position: (anchorPosition || 'bottomleft') } : opt;
      if (sid) localStorage.setItem(`presenter_option:${sid}`, JSON.stringify(payload));
      else localStorage.setItem('presenter_option', JSON.stringify(payload));
    } catch (_) { /* noop */ }
  };
  useEffect(() => {
    try {
      if (!selectedPresenter || selectedPresenter.option !== 'anchor mode') return;
      const sid = (typeof window !== 'undefined' && localStorage.getItem('session_id')) || '';
      const payload = { ...selectedPresenter, size: anchorSize, position: anchorPosition };
      if (sid) localStorage.setItem(`presenter_option:${sid}`, JSON.stringify(payload));
      else localStorage.setItem('presenter_option', JSON.stringify(payload));
    } catch (_) { /* noop */ }
  }, [anchorSize, anchorPosition]);

  const fontOptions = [
    // System/web-safe
    'Arial', 'Helvetica', 'Times New Roman', 'Georgia', 'Verdana', 'Tahoma', 'Trebuchet MS', 'Courier New', 'Lucida Sans', 'Garamond', 'Palatino', 'Segoe UI',
    // Popular Google fonts
    'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Inter', 'Nunito', 'Nunito Sans', 'Source Sans Pro', 'Merriweather', 'Playfair Display', 'Raleway', 'Oswald', 'Ubuntu', 'PT Sans', 'Noto Sans', 'Fira Sans', 'Rubik', 'Mulish', 'Josefin Sans', 'Work Sans', 'Karla', 'Quicksand', 'Barlow', 'Heebo', 'Hind', 'Manrope', 'IBM Plex Sans', 'IBM Plex Serif', 'Archivo', 'Catamaran', 'Exo 2', 'Zilla Slab', 'DM Sans', 'DM Serif Display', 'Cabin', 'Titillium Web', 'Bebas Neue', 'Anton', 'Inconsolata', 'Space Mono'
  ]

  const presetColors = [
    '#000000', '#333333', '#666666', '#999999', '#CCCCCC', '#E5E5E5', '#F2F2F2', '#FFFFFF',
    '#FF0000', '#FF7F00', '#FFFF00', '#7FFF00', '#00FF00', '#00FF7F', '#00FFFF', '#007FFF',
    '#0000FF', '#7F00FF', '#FF00FF', '#FF007F', '#FFC0CB', '#FFA500', '#FFD700', '#DA70D6',
    '#F08080', '#DC143C', '#8B0000', '#A52A2A', '#800000', '#B8860B', '#8B4513', '#D2691E',
    '#006400', '#228B22', '#2E8B57', '#3CB371', '#20B2AA', '#008B8B', '#4682B4', '#1E90FF',
    '#4169E1', '#00008B', '#4B0082', '#483D8B', '#6A5ACD', '#8A2BE2', '#9400D3', '#C71585',
    '#708090', '#778899', '#B0C4DE', '#ADD8E6', '#87CEEB', '#87CEFA', '#B0E0E6', '#AFEEEE'
  ]

  const handleVoice = (voiceId) => {
    setSelectedVoice(voiceId)
    setVoices(prev => prev.map(voice => ({
      ...voice,
      isSelected: voice.id === voiceId
    })))
  }

  const supportsMime = (type) => {
    try { return window.MediaRecorder && MediaRecorder.isTypeSupported(type) }
    catch { return false }
  }
  const convertBlobToMp4 = async (blob) => {
    try {
      if (blob && blob.type === 'audio/mp4') return blob
      if (!supportsMime('audio/mp4')) return blob
      const el = document.createElement('audio')
      el.src = URL.createObjectURL(blob)
      await el.play().catch(() => {})
      await new Promise(res => { el.onloadedmetadata = () => res() })
      const stream = el.captureStream ? el.captureStream() : (el.mozCaptureStream ? el.mozCaptureStream() : null)
      if (!stream) return blob
      const rec = new MediaRecorder(stream, { mimeType: 'audio/mp4' })
      const chunks = []
      return await new Promise(resolve => {
        rec.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunks.push(e.data) }
        rec.onstop = () => { try { el.pause() } catch {} ; const out = new Blob(chunks, { type: 'audio/mp4' }); resolve(out.size>0?out:blob) }
        rec.start();
        el.onended = () => { try { rec.stop() } catch {} }
        setTimeout(() => { if (rec.state === 'recording') { try { rec.stop() } catch {} } }, 15000)
      })
    } catch { return blob }
  }
  const handleVoiceUpload = async (event) => {
    const files = Array.from(event.target.files || [])
    if (files.length === 0) return
    const conv = []
    for (const f of files) {
      const blob = new Blob([await f.arrayBuffer()], { type: f.type || 'audio/*' })
      const mp4 = await convertBlobToMp4(blob)
      conv.push(mp4)
    }
    if (conv.length) {
      setPendingVoiceBlobs(prev => [...prev, ...conv])
      const urls = conv.map(b => URL.createObjectURL(b))
      setPendingVoiceUrls(prev => [...prev, ...urls])
      if (audioPreviewRef.current && urls[0]) audioPreviewRef.current.src = urls[0]
    }
  }

  const triggerFileUpload = () => {
    fileInputRef.current?.click()
  }
  
  const triggerAvatarUpload = () => {
    avatarInputRef.current?.click()
  }
  
  const handleAvatarUpload = (event) => {
    const file = event.target.files[0]
    if (file) {
      setUploadedAvatar(URL.createObjectURL(file))
      console.log('Avatar file uploaded:', file)
    }
  }

  // Legacy voice-only upload kept for recording flow; renamed to avoid name clash with hook
  const uploadBrandVoicesLegacy = async (voiceBlobs) => {
    const token = localStorage.getItem('token')
    if (!token || !Array.isArray(voiceBlobs) || voiceBlobs.length === 0) return
    setIsVoiceUploading(true)
    try {
      const form = new FormData()
      form.append('user_id', token)
      const toMp3File = (blob, idx) => new File([blob], `voice_${Date.now()}_${idx}.mp3`, { type: 'audio/mpeg' })
      voiceBlobs.forEach((b, i) => {
        const file = toMp3File(b, i)
        form.append('voiceovers', file)
      })
      const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/users/brand-assets', { method: 'POST', body: form })
      if (!resp.ok) throw new Error(`brand-assets upload failed: ${resp.status}`)
      const getResp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/${encodeURIComponent(token)}`)
      const assets = await getResp.json().catch(() => ({}))
      const voices = Array.isArray(assets?.voiceovers) ? assets.voiceovers : (assets?.voices || [])
      setBrandVoices(voices)
      // Prefill fonts and colors from brand assets
      try {
        const bi = assets?.brand_identity || {}
        const fonts = Array.isArray(bi?.fonts) ? bi.fonts : (Array.isArray(assets?.fonts) ? assets.fonts : [])
        const colors = Array.isArray(bi?.colors) ? bi.colors : (Array.isArray(assets?.colors) ? assets.colors : [])
        if (fonts.length) setSelectedFonts(fonts)
        if (colors.length) setSelectedColors(new Set(colors))
      } catch (_) { /* noop */ }
      try { (pendingVoiceUrls || []).forEach(u => URL.revokeObjectURL(u)) } catch {}
      setPendingVoiceBlobs([])
      setPendingVoiceUrls([])
    } catch (e) {
      console.error(e)
      alert('Failed to save voice-over to Brand Assets.')
    } finally {
      setIsVoiceUploading(false)
    }
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      const mime = supportsMime('audio/mp4') ? 'audio/mp4' : (supportsMime('audio/webm') ? 'audio/webm' : '')
      const mr = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined)
      mediaRecorderRef.current = mr
      recordedChunksRef.current = []
      mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) recordedChunksRef.current.push(e.data) }
      mr.onstop = async () => {
        try {
          const raw = new Blob(recordedChunksRef.current, { type: mime || 'audio/webm' })
          const mp4 = await convertBlobToMp4(raw)
          setPendingVoiceBlobs(prev => [...prev, mp4])
          const url = URL.createObjectURL(mp4)
          setPendingVoiceUrls(prev => [...prev, url])
          if (audioPreviewRef.current) audioPreviewRef.current.src = url
        } catch (e) { console.error(e) }
        setIsRecording(false)
        stream.getTracks().forEach(t => t.stop())
      }
      mr.start()
      setIsRecording(true)
    } catch (e) {
      console.error(e)
      alert('Unable to access microphone.')
    }
  }
  const stopRecording = () => {
    try { if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') mediaRecorderRef.current.stop() } catch {}
  }

  // Load brand assets on mount
  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) return
    ;(async () => {
      try {
        const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/${encodeURIComponent(token)}`)
        const assets = await resp.json().catch(() => ({}))
        const voices = Array.isArray(assets?.voiceovers)
          ? assets.voiceovers
          : (Array.isArray(assets?.voiceover)
            ? assets.voiceover
            : (assets?.voices || []))
        setBrandVoices(voices)
        const logos = Array.isArray(assets?.brand_identity?.logo)
          ? assets.brand_identity.logo
          : (Array.isArray(assets?.logos)
            ? assets.logos
            : (Array.isArray(assets?.logo)
              ? assets.logo
              : (Array.isArray(assets?.images)
                ? assets.images.filter(it => typeof it === 'string' && /\.(png|jpe?g|svg|webp)$/i.test(it))
                : [])))
        setBrandLogos(logos)
        // Prefill fonts and colors
        try {
          const bi = assets?.brand_identity || {}
          const fonts = Array.isArray(bi?.fonts) ? bi.fonts : (Array.isArray(assets?.fonts) ? assets.fonts : [])
          const colors = Array.isArray(bi?.colors) ? bi.colors : (Array.isArray(assets?.colors) ? assets.colors : [])
          if (fonts.length) {
            setSelectedFonts(fonts)
            // Auto-enable Font styles when brand fonts exist
            setSelectedFont((prev) => (prev === 'yes' ? prev : 'yes'))
          }
          if (colors.length) {
            setSelectedColors(new Set(colors))
            // Auto-enable Specific color schemes when brand colors exist
            setSelectedColor((prev) => (prev === 'yes' ? prev : 'yes'))
          }
          // Auto-enable Logo inclusion and preselect first logo when brand logos exist
          if (Array.isArray(logos) && logos.length > 0) {
            setSelectedLogo((prev) => (prev === 'yes' ? prev : 'yes'))
            const first = logos[0]
            const url = typeof first === 'string' ? first : (first?.url || first?.image_url || first?.imageUrl || first?.src || '')
            if (url) setSelectedLogoUrl(url)
          }
        } catch (_) { /* noop */ }
        try {
          const urls = voices.map(v => (typeof v === 'string' ? v : (v?.url || ''))).filter(Boolean)
          localStorage.setItem('brand_voiceover_urls', JSON.stringify(urls))
        } catch (_) { /* noop */ }
      } catch {}
    })()
  }, [])

  const handleSelectFont = (font) => {
    if (!selectedFonts.includes(font)) {
      setSelectedFonts([...selectedFonts, font])
    }
    setIsFontOpen(false)
  }

  const removeFont = (font) => {
    setSelectedFonts(selectedFonts.filter((f) => f !== font))
  }

  const toggleColor = (hex) => {
    const next = new Set(selectedColors)
    if (next.has(hex)) {
      next.delete(hex)
    } else {
      next.add(hex)
    }
    setSelectedColors(next)
  }

  const addCurrentColor = () => {
    setCustomColors((prev) => (prev.includes(currentColor) ? prev : [...prev, currentColor]))
    setSelectedColors((prev) => new Set(prev).add(currentColor))
  }

  const openColorPicker = () => {
    colorInputRef.current?.click()
  }

  const handlePickCustomColor = (e) => {
    const newColor = e.target.value
    setCurrentColor(newColor)
    if (!presetColors.includes(newColor) && !customColors.includes(newColor)) {
      setCustomColors(prev => [...prev, newColor])
      setSelectedColors(prev => new Set(prev).add(newColor))
    }
  }

  const [selectedGoal, setSelectedGoal] = useState("Pitch development"); // Default to first option
  const [selectedVideoType, setSelectedVideoType] = useState("tourism"); 
  const [otherText, setOtherText] = useState("");
  const videoType= [
    { id: "tourism", label: "Travel / Tourism" },
    { id: "technology", label: "Software and Technology" },
    { id: "sales", label: "Sales Pitch / Proposal" },
    { id: "marketing", label: "Marketing Pitch / Proposal" }
  ];
  const goals = [
    { id: "Pitch development", label: "Pitch development" },
    { id: "Marketing videos", label: "Marketing videos" },
    { id: "Internal communications", label: "Internal communications" },
    { id: "Report summaries", label: "Report summaries" },
    { id: "Training materials", label: "Training materials" },
    { id: "Knowledge management", label: "Knowledge management" },
    { id: "Financial summary", label: "Financial summary" },
  ];
  const handleSelect = (goalId) => {
    setSelectedGoal(goalId);
    if (goalId !== "other") {
      setOtherText("");
    }
  };
  const handleVideoTypeSelect = (goalId) => {
    setSelectedVideoType(goalId);
   
  };
  const [isOpen, setIsOpen] = useState(false);
  // Top-level section dropdowns
  const [openPurpose, setOpenPurpose] = useState(true)
  const [openContent, setOpenContent] = useState(false)
  const [openStyle, setOpenStyle] = useState(false)
  const [openTechnical, setOpenTechnical] = useState(false)
  const [openPresenter, setOpenPresenter] = useState(false)
  const [openAudio, setOpenAudio] = useState(false)

  // Function to close all accordions except the one being opened
  const handleAccordionToggle = (accordionName) => {
    setOpenPurpose(accordionName === 'purpose')
    setOpenContent(accordionName === 'content')
    setOpenStyle(accordionName === 'style')
    setOpenTechnical(accordionName === 'technical')
    setOpenAudio(accordionName === 'audio')
    setOpenPresenter(accordionName === 'presenter')
  }
  const [selectedAudience, setSelectedAudience] = useState("general"); // Default to "General public"
  const [otherTextaud, setOtherTextaud] = useState("");

  const Audience = [
    { id: "colleagues", label: "Colleagues" },
    { id: "clients", label: "Clients" },
    { id: "investors", label: "Investors" },
    { id: "students", label: "Students" },
    { id: "general", label: "General public" },
    { id: "other", label: "Other (please specify)" },
  ];

  const handleSelectAudience = (id) => {
    setSelectedAudience(id);
    if (id !== "other") setOtherTextaud("");
  };

  // tone

  const [isOpentone, setIsOpentone] = useState(false);
  const [selectedTone, setSelectedTone] = useState("professional"); // Default to "General public"
  const [otherTexttone, setOtherTexttone] = useState("");

  const Tone = [
    { id: "professional", label: "Professional" },
    { id: "casual", label: "Casual" },
    { id: "humorous", label: "Humorous" },
    { id: "storytelling", label: "Storytelling" },


  ];

  const handleSelecttone = (id) => {
    setSelectedTone(id);
    if (id !== "other") setOtherTexttone("");
  };

  // 

  const [isOpen1, setIsOpen1] = useState(false);
  const [selectedOption, setSelectedOption] = useState("no"); // Default to "No"
  const [descEmphasize, setDescEmphasize] = useState("");


  const options = [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ];

  const handleSelect1 = (id) => {
    setSelectedOption(id);
  };

  // 

  const [isOpenShareable, setIsOpenShareable] = useState(false);
  const [selectedShareable, setSelectedShareable] = useState("no"); // Default to "No"
  const [descShareable, setDescShareable] = useState("");

  const optionsShareable = [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ];

  const handleSelectShareable = (id) => {
    setSelectedShareable(id);
  };

  // 
  const [isOpenAppear, setIsOpenAppear] = useState(false);
  const [selectedAppear, setSelectedAppear] = useState("no"); // Default to "No"
  const [descAppear, setDescAppear] = useState("");

  const optionsAppear = [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ];

  const handleSelectAppear = (id) => {
    setSelectedAppear(id);
  };


  // Style and Visual Preferences


  // 

  const [isOpenLogo, setIsOpenLogo] = useState(false);
  const [selectedLogo, setSelectedLogo] = useState("no"); // Default to "No"

  const [selectedLogoUrl, setSelectedLogoUrl] = useState('');
  const [logoSelectMode, setLogoSelectMode] = useState('assets'); // 'assets' | 'upload'
  const [isLogoUploading, setIsLogoUploading] = useState(false);
  const logoFileInputRef = useRef(null);

  const optionsLogo = [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ];

  // 

  const [isOpenColor, setIsOpenColor] = useState(false);
  const [selectedColor, setSelectedColor] = useState("no"); // Default to "No"

  const optionsColor = [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ];

  // 

  const [isOpenFont, setIsOpenFont] = useState(false);
  const [selectedFont, setSelectedFont] = useState("no"); // Default to "No"

  const optionsFont = [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ];

  // 
  const [isOpenGraphics, setIsOpenGraphics] = useState(false);
  const [selectedGraphicsOption, setSelectedGraphicsOption] = useState("no"); // Default to "No"
  const [uploadedImage, setUploadedImage] = useState(null);
  const [descGraphics, setDescGraphics] = useState("");

  const optionsGraphics = [
    { id: "yes", label: "Yes (please upload / select from brand guidelines)" },
    { id: "no", label: "No" },
  ];

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUploadedImage(URL.createObjectURL(file)); // Preview
    }
  };

  const removeImage = () => {
    setUploadedImage(null);
  };

  // 
  const [isOpenCTA, setIsOpenCTA] = useState(false);
  const [selectedCTA, setSelectedCTA] = useState("no"); // Default to "No"
  const [descCTA, setDescCTA] = useState("");

  const optionsCTA = [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ];

  const handleSelectCTA = (id) => {
    setSelectedCTA(id);
  };

  // 
  const [isOpenSummary, setIsOpenSummary] = useState(false);
  const [selectedSummary, setSelectedSummary] = useState("no"); // Default to "No"
  const [descSummary, setDescSummary] = useState("");
  
  // Avatar state variables
  const [selectedAvatar, setSelectedAvatar] = useState("no"); // Default to "No"
  const [selectedAvatarFromLibrary, setSelectedAvatarFromLibrary] = useState(null);
  const [uploadedAvatar, setUploadedAvatar] = useState(null);
  const [descAvatar, setDescAvatar] = useState("");

  const optionsSummary = [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ];

  const handleSelectSummary = (id) => {
    setSelectedSummary(id);
  };

  //Technical and Format Constraints

  const [isOpenDuration, setIsOpenDuration] = useState(false);
  const [selectedDuration, setSelectedDuration] = useState("upto1"); // Default to "2-3 minutes"
  const [descDuration, setDescDuration] = useState("");

  const optionsDuration = [
    { id: "upto1", label: "Up to 1 minute" },
    { id: "1to2", label: "1-2 minutes" },
    { id: "2to3", label: "2-3 minutes" },
    { id: "3to5", label: "3-5 minutes" },
    { id: "longer5", label: "Longer than 5 minutes" },
  ];

  const handleSelectDuration = (id) => {
    setSelectedDuration(id);
  };

  // 

  const [isOpenFormat, setIsOpenFormat] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState("mp4"); // Default to "MP4"
  const [otherFormatText, setOtherFormatText] = useState("");
  const [descFormat, setDescFormat] = useState("");

  const optionsFormat = [
    { id: "mp4", label: "MP4" },
    { id: "mov", label: "MOV" },
    { id: "link", label: "Embedded video link" },
    { id: "other", label: "Other (please specify)" },
  ];

  const handleSelectFormat = (id) => {
    setSelectedFormat(id);
  };

  // 

  const [isOpenAspect, setIsOpenAspect] = useState(false);
  const [selectedAspect, setSelectedAspect] = useState("16_9"); // Default to "16:9 (Standard widescreen)"
  const [otherAspectText, setOtherAspectText] = useState("");
  const [customAspectWidth, setCustomAspectWidth] = useState("");
  const [customAspectHeight, setCustomAspectHeight] = useState("");
  const [descAspect, setDescAspect] = useState("");

  const optionsAspect = [
    { id: "16_9", label: "16:9 (Standard widescreen)" },
    { id: "9_16", label: "9:16 (Vertical, ideal for TikTok, Reels, Stories)" },
    { id: "custom", label: "Custom aspect ratio" },
  ];

  const handleSelectAspect = (id) => {
    if (id === 'custom') {
      setSelectedAspect('custom');
      if (customAspectWidth && customAspectHeight) {
        setOtherAspectText(`${customAspectWidth}:${customAspectHeight}`);
      } else {
        setOtherAspectText('');
      }
    } else {
      setSelectedAspect(id);
      setOtherAspectText('');
    }
  };

  // Audio and Effects

  // 

  const [isOpenMusic, setIsOpenMusic] = useState(false);
  const [selectedMusic, setSelectedMusic] = useState("no"); // Default to "No"
  const [uploadedMusic, setUploadedMusic] = useState(null);
  const [descMusic, setDescMusic] = useState("");

  const optionsMusic = [
    { id: "yes", label: "Yes (please specify)" },
    { id: "no", label: "No" },
  ];

  const handleSelectMusic = (id) => {
    setSelectedMusic(id);
    if (id === "no") {
      setUploadedMusic(null); // reset file if "No"
    }
  };

  const handleMusicUpload = (e) => {
    if (e.target.files.length > 0) {
      setUploadedMusic(e.target.files[0]);
    }
  };

  // 

  const [isOpenVoice, setIsOpenVoice] = useState(false);
  const [selectedVoice2, setSelectedVoice2] = useState("no"); // Default to "No"
  const [descVoice, setDescVoice] = useState("");

  // Brand assets integration (voice save button flow)
  const { uploadBrandAssets, getBrandAssets, uploadBrandFiles, updateBrandAssets, getBrandAssetsByUserId } = useBrandAssets();
  const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';
  const [voiceFilesForUpload, setVoiceFilesForUpload] = useState([]);
  const [voiceSaveMsg, setVoiceSaveMsg] = useState('');
  const [isSavingBrandVoices, setIsSavingBrandVoices] = useState(false);

  // Filter voiceovers by selected tone when Audio and Voice is "yes"
  const uniqueBrandVoiceOptions = useMemo(() => {
    // Filter by selected tone when Audio and Voice is "yes"
    let source = Array.isArray(brandVoices) ? brandVoices : []
    
    // If Audio and Voice is selected as "yes", filter by tone type
    if (selectedVoice2 === 'yes' && selectedTone) {
      source = source.filter(voice => {
        // Check if voice has a type field that matches selectedTone
        const voiceType = voice?.type || voice?.tone || voice?.voice_type || ''
        return voiceType.toLowerCase() === selectedTone.toLowerCase()
      })
    }
    
    const seen = new Map()
    return source.reduce((acc, voice, index) => {
      const name = extractBrandVoiceName(voice, index)
      const key = name.trim().toLowerCase()
      if (!seen.has(key)) {
        seen.set(key, true)
        acc.push({ name, index, originalVoice: voice })
      }
      return acc
    }, [])
  }, [brandVoices, extractBrandVoiceName, selectedVoice2, selectedTone])

  const optionsVoice = [
    { id: "yes", label: "Yes" },
    { id: "no", label: "No" },
  ];

  const handleSelectVoice = (id) => {
    setSelectedVoice2(id);
    setIsOpenVoice(true); // open when clicked
  };

  const toggleOpenVoice = () => setIsOpenVoice(!isOpenVoice);

  // 

  const [isOpenTone, setIsOpenTone] = useState(false);
  const [selectedTone1, setSelectedTone1] = useState("vo3"); // Default to "VO3 options"

  const optionsTone = [
    { id: "vo3", label: "VO3 options" },
    { id: "custom", label: "Custom" },
  ];

  const handleSelectTone = (id) => {
    setSelectedTone1(id);
    setIsOpenTone(true);
  };

  const toggleOpenTone = () => setIsOpenTone(!isOpenTone);

  // Recording helper: sample script based on selected tone/style
  const getRecordingSample = () => {
    const tone = selectedTone;
    if (tone === 'other' && otherTexttone) {
      return `Sample (${otherTexttone}): Hi there, let me walk you through the highlights.`;
    }
    switch (tone) {
      case 'professional':
        return 'Sample (Professional): Hello, and welcome. Let’s review the key points.';
      case 'casual':
        return 'Sample (Casual): Hey! Super excited to show you what we’ve got.';
      case 'humorous':
        return 'Sample (Humorous): Alright, buckle up—this will be fun and informative!';
      case 'inspiring':
        return 'Sample (Inspiring): Together, we can achieve more—let’s dive in.';
      case 'formal':
        return 'Sample (Formal): Good day. This presentation outlines the essential details.';
      default:
        return 'Sample: Hi there, let me walk you through the highlights.';
    }
  };

  // Voice modal tab: 'record' or 'upload'
  const [voiceModalTab, setVoiceModalTab] = useState('record');
  const [elapsedSec, setElapsedSec] = useState(0);
  const [voiceName, setVoiceName] = useState('');

  useEffect(() => {
    let t;
    if (isRecording) {
      setElapsedSec(0);
      t = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    }
    return () => { if (t) clearInterval(t); };
  }, [isRecording]);

  // 
  const [isOpenFeatures, setIsOpenFeatures] = useState(false);
  const [selectedFeature, setSelectedFeature] = useState("no"); // Default to "No"
  const [descFeatures, setDescFeatures] = useState("");

  const optionsFeatures = [
    { id: "animations", label: "Animations" },
    { id: "transitions", label: "Transitions" },
    { id: "both", label: "Both" },
    { id: "no", label: "No" },
  ];

  const handleSelectFeature = (id) => {
    setSelectedFeature(id);
    setIsOpenFeatures(true);
  };

  const toggleOpenFeatures = () => setIsOpenFeatures(!isOpenFeatures);

  // Hydrate from Redux (in-memory) once after all states are declared
  const hydratedRef = useRef(false)
  useEffect(() => {
    try {
      if (hydratedRef.current) return;
      if (!savedForm || typeof savedForm !== 'object') return;
      hydratedRef.current = true;
      const s = savedForm;
      // Purpose & audience
      if (s.selectedVideoType) setSelectedVideoType(s.selectedVideoType);
      if (s.selectedGoal) setSelectedGoal(s.selectedGoal);
      if (typeof s.otherText === 'string') setOtherText(s.otherText);
      if (s.selectedAudience) setSelectedAudience(s.selectedAudience);
      if (typeof s.otherTextaud === 'string') setOtherTextaud(s.otherTextaud);
      if (s.selectedTone) setSelectedTone(s.selectedTone);
      if (typeof s.otherTexttone === 'string') setOtherTexttone(s.otherTexttone);
      // Content focus
      if (s.selectedOption) setSelectedOption(s.selectedOption);
      if (typeof s.descEmphasize === 'string') setDescEmphasize(s.descEmphasize);
      if (s.selectedShareable) setSelectedShareable(s.selectedShareable);
      if (typeof s.descShareable === 'string') setDescShareable(s.descShareable);
      // Styles & visuals
      if (s.selectedLogo) setSelectedLogo(s.selectedLogo);
      if (s.selectedColor) setSelectedColor(s.selectedColor);
      if (Array.isArray(s.selectedFonts)) setSelectedFonts(s.selectedFonts);
      if (Array.isArray(s.customColors)) setCustomColors(s.customColors);
      if (Array.isArray(s.selectedColors)) setSelectedColors(new Set(s.selectedColors));
      if (typeof s.currentColor === 'string') setCurrentColor(s.currentColor);
      if (s.selectedFont) setSelectedFont(s.selectedFont);
      if (s.selectedGraphicsOption) setSelectedGraphicsOption(s.selectedGraphicsOption);
      if (s.selectedCTA) setSelectedCTA(s.selectedCTA);
      if (typeof s.descCTA === 'string') setDescCTA(s.descCTA);
      if (s.selectedSummary) setSelectedSummary(s.selectedSummary);
      if (typeof s.descSummary === 'string') setDescSummary(s.descSummary);
      // Avatar
      if (s.selectedAvatar) setSelectedAvatar(s.selectedAvatar);
      if (typeof s.selectedAvatarFromLibrary === 'number' || s.selectedAvatarFromLibrary === null) setSelectedAvatarFromLibrary(s.selectedAvatarFromLibrary);
      if (typeof s.uploadedAvatar === 'string') setUploadedAvatar(s.uploadedAvatar);
      if (typeof s.descAvatar === 'string') setDescAvatar(s.descAvatar);
      // Technical
      if (s.selectedDuration) setSelectedDuration(s.selectedDuration);
      if (typeof s.descDuration === 'string') setDescDuration(s.descDuration);
      if (s.selectedFormat) setSelectedFormat(s.selectedFormat);
      if (typeof s.otherFormatText === 'string') setOtherFormatText(s.otherFormatText);
      if (typeof s.descFormat === 'string') setDescFormat(s.descFormat);
      if (s.selectedAspect) setSelectedAspect(s.selectedAspect === 'other' ? 'custom' : s.selectedAspect);
      if (typeof s.otherAspectText === 'string') {
        setOtherAspectText(s.otherAspectText);
        const match = s.otherAspectText.match(/(\d+)\s*[:xX\/]\s*(\d+)/);
        if (match) {
          setCustomAspectWidth(match[1]);
          setCustomAspectHeight(match[2]);
        }
      }
      if (typeof s.customAspectWidth === 'string') setCustomAspectWidth(s.customAspectWidth);
      if (typeof s.customAspectHeight === 'string') setCustomAspectHeight(s.customAspectHeight);
      if (typeof s.descAspect === 'string') setDescAspect(s.descAspect);
      // Audio & effects
      if (s.selectedMusic) setSelectedMusic(s.selectedMusic);
      if (typeof s.descMusic === 'string') setDescMusic(s.descMusic);
      if (s.selectedVoice2) setSelectedVoice2(s.selectedVoice2);
      if (typeof s.selectedVoiceFromLibrary === 'number' || s.selectedVoiceFromLibrary === null) setSelectedVoiceFromLibrary(s.selectedVoiceFromLibrary);
      if (typeof s.descVoice === 'string') setDescVoice(s.descVoice);
      if (s.selectedFeature) setSelectedFeature(s.selectedFeature);
      if (typeof s.descFeatures === 'string') setDescFeatures(s.descFeatures);
    } catch (_) { /* noop */ }
  }, [savedForm])

  // Save to Redux when any field changes
  useEffect(() => {
    try {
      const state = {
        selectedVideoType,selectedGoal, otherText, selectedAudience, otherTextaud, selectedTone, otherTexttone,
        selectedOption, descEmphasize, selectedShareable, descShareable,
        selectedLogo, selectedColor, selectedFonts, selectedColors: Array.from(selectedColors || []), customColors, currentColor,
        selectedFont, selectedGraphicsOption, selectedCTA, descCTA, selectedSummary, descSummary,
        selectedAvatar, selectedAvatarFromLibrary, uploadedAvatar, descAvatar,
        selectedDuration, descDuration, selectedFormat, otherFormatText, descFormat, selectedAspect, otherAspectText, customAspectWidth, customAspectHeight, descAspect,
        selectedMusic, descMusic, selectedVoice2, selectedVoiceFromLibrary, descVoice, selectedFeature, descFeatures,
      };
      dispatch(setGuidelinesState(state));
    } catch (_) { /* noop */ }
  }, [
    dispatch,
    selectedVideoType,selectedGoal, otherText, selectedAudience, otherTextaud, selectedTone, otherTexttone,
    selectedOption, descEmphasize, selectedShareable, descShareable,
    selectedLogo, selectedColor, selectedFonts, selectedColors, customColors, currentColor,
    selectedFont, selectedGraphicsOption, selectedCTA, descCTA, selectedSummary, descSummary,
    selectedAvatar, selectedAvatarFromLibrary, uploadedAvatar, descAvatar,
    selectedDuration, descDuration, selectedFormat, otherFormatText, descFormat, selectedAspect, otherAspectText, customAspectWidth, customAspectHeight, descAspect,
    selectedMusic, descMusic, selectedVoice2, selectedVoiceFromLibrary, descVoice, selectedFeature, descFeatures,
  ])

  return (
    <div className='bg-white h-[100vh] w-full rounded-lg p-[20px] overflow-y-scroll scrollbar-hide'>
             <div className='flex justify-between items-center'>
         <div className='flex flex-col justify-start items-start gap-2'>
           <h2 className='text-[25px]'>Video Guidelines</h2>
           <p className='text-[15px] text-gray-500'>Fill in all the Mandatory details</p>
         </div>
         <button 
           onClick={() => {
             if (window.goToChat) {
               window.goToChat();
             }
           }}
           className='px-6 py-2 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0066] transition-colors'
         >
           Back to Chat
         </button>
       </div>
      {/* purpose */}
      <div>
        <div className='flex flex-col justify-start items-start gap-2'>
         
        </div>
                 <div
           onClick={() => handleAccordionToggle('purpose')}
           className="w-full cursor-pointer mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between"
         >
          <span className="text-[18px] text-gray-600">Purpose and Audience</span>
          {openPurpose ? <FaAngleUp /> : <FaAngleDown />}
        </div>
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${openPurpose ? "max-h-[2000px] mt-4 opacity-100" : "max-h-0 opacity-0"}`}
        >
           
          <div  className="w-full flex-col bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
            <div className="flex justify-between items-center">
              <span className="text-[18px] text-gray-600">Goal of the video</span>
            </div>
            <div className="mt-5">
              <div className="flex flex-col gap-3">
                {goals.map((g) => (
                  <div key={g.id} className="flex items-center gap-3">
                    <button
                      onClick={() => handleSelect(g.id)}
                      className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
              ${selectedGoal === g.id
                        ? "bg-green-500 border-green-500"
                        : "bg-white border-gray-400"
                      }`}
                    >
                      {selectedGoal === g.id && (
                        <FaCheck className="text-white text-sm" />
                      )}
                    </button>
                    <label
                      onClick={() => handleSelect(g.id)}
                      className="cursor-pointer"
                    >
                      {g.label}
                    </label>
                    {g.id === "other" && selectedGoal === "other" && (
                      <input
                        type="text"
                        value={otherText}
                        onChange={(e) => setOtherText(e.target.value)}
                        placeholder="Please specify"
                        className="border-b border-gray-400 outline-none ml-2"
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div  className="w-full flex-col mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
            <div className="flex justify-between items-center">
              <span className="text-[18px] text-gray-600">Audience</span>
            </div>
            <div className="mt-5">
              <div className="flex justify-start items-start gap-2 bg-white">
                <div className="flex flex-col gap-3">
                  {Audience.map((aud) => (
                    <div key={aud.id} className="flex items-center gap-3">
                      <button
                        onClick={() => handleSelectAudience(aud.id)}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                    ${selectedAudience === aud.id
                          ? "bg-green-500 border-green-500"
                          : "bg-white border-gray-400"
                        }`}
                      >
                        {selectedAudience === aud.id && (
                          <FaCheck className="text-white text-sm" />
                        )}
                      </button>
                      <label
                        onClick={() => handleSelectAudience(aud.id)}
                        className="cursor-pointer"
                      >
                        {aud.label}
                      </label>
                      {aud.id === "other" && selectedAudience === "other" && (
                        <input
                          type="text"
                          value={otherTextaud}
                          onChange={(e) => setOtherTextaud(e.target.value)}
                          placeholder="Please specify"
                          className="border-b border-gray-400 outline-none ml-2"
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
          <div  className="w-full flex-col mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
            <div className="flex justify-between items-center">
              <span className="text-[18px] text-gray-600">Tone or Style</span>
            </div>
            <div className="mt-5">
              <div className="flex justify-start items-start gap-2 bg-white">
                <div className="flex flex-col gap-3">
                  {Tone.map((aud) => (
                    <div key={aud.id} className="flex items-center gap-3">
                      <button
                        onClick={() => handleSelecttone(aud.id)}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                    ${selectedTone === aud.id
                          ? "bg-green-500 border-green-500"
                          : "bg-white border-gray-400"
                        }`}
                      >
                        {selectedTone === aud.id && (
                          <FaCheck className="text-white text-sm" />
                        )}
                      </button>
                      <label
                        onClick={() => handleSelecttone(aud.id)}
                        className="cursor-pointer"
                      >
                        {aud.label}
                      </label>
                      
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content Focus and Emphasis */}

     

      {/* Style and Visual Preferences */}

      <div>
       
                 <div
           onClick={() => handleAccordionToggle('style')}
           className="w-full cursor-pointer mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between"
         >
          <span className="text-[18px] text-gray-600">Style and Visual Preferences</span>
          {openStyle ? <FaAngleUp /> : <FaAngleDown />}
        </div>

        <div
          className={`transition-all duration-500 ease-in-out ${openStyle ? "max-h-[2000px] mt-4 opacity-100 overflow-visible" : "max-h-0 opacity-0 overflow-hidden"}`}
        >
          <div  className="w-full flex-col bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
            <span className="text-[18px] text-gray-600 mb-3">Logo inclusion</span>
            <div className="flex flex-col gap-3">
              {optionsLogo.map((opt) => (
                <div key={opt.id} className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedLogo(opt.id)}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                  ${selectedLogo === opt.id
                        ? "bg-green-500 border-green-500"
                        : "bg-white border-gray-400"
                      }`}
                  >
                    {selectedLogo === opt.id && (
                      <FaCheck className="text-white text-sm" />
                    )}
                  </button>
                  <label
                    onClick={() => setSelectedLogo(opt.id)}
                    className="cursor-pointer"
                  >
                    {opt.label}
                  </label>
                </div>
              ))}
              {selectedLogo === 'yes' && (
                <div className="mt-2 border rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <button onClick={() => setLogoSelectMode('assets')} className={`px-3 py-1.5 rounded-md text-sm ${logoSelectMode==='assets' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>From Brand Assets</button>
                    <button onClick={() => setLogoSelectMode('upload')} className={`px-3 py-1.5 rounded-md text-sm ${logoSelectMode==='upload' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'}`}>Upload Image</button>
                  </div>
                  {logoSelectMode === 'assets' ? (
                    <div>
                      {Array.isArray(brandLogos) && brandLogos.length > 0 ? (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                          {brandLogos.map((u, i) => {
                            const url = typeof u === 'string' ? u : (u?.url || '');
                            if (!url) return null;
                            const active = selectedLogoUrl === url;
                            return (
                              <button key={i} onClick={() => setSelectedLogoUrl(url)} className={`border rounded-lg p-2 flex items-center justify-center bg-white hover:bg-gray-50 ${active ? 'border-blue-600 ring-2 ring-blue-200' : 'border-gray-200'}`}>
                                <img src={url} alt={`Logo ${i+1}`} className="max-h-16 object-contain" />
                              </button>
                            )
                          })}
                        </div>
                      ) : (
                        <p className="text-sm text-gray-600">No logos found in Brand Assets.</p>
                      )}
                    </div>
                  ) : (
                    <div>
                      <input ref={logoFileInputRef} type="file" accept="image/*" className="hidden" onChange={async (e) => {
                        const file = e.target.files && e.target.files[0];
                        if (!file) return;
                        try {
                          setIsLogoUploading(true);
                          // 1) Upload via upload-file
                          await uploadBrandFiles({ userId: token, fileType: 'logo', files: [file] });
                          // 2) GET full latest brand assets
                          const latest = await getBrandAssetsByUserId(token);
                          const current = latest || {};
                          const bi = current?.brand_identity || {};
                          const logosNow = Array.isArray(bi.logo) ? bi.logo : (Array.isArray(current?.logos) ? current.logos : (Array.isArray(current?.logo) ? current.logo : []));
                          // 3) UPDATE full assets payload, ensuring logo includes any new URLs from GET
                          const payload = {
                            brand_identity: {
                              fonts: bi.fonts || [],
                              icon: bi.icon || bi.icons || [],
                              colors: bi.colors || [],
                              spacing: bi.spacing,
                              tagline: bi.tagline,
                              logo: logosNow || []
                            },
                            tone_and_voice: current?.tone_and_voice || {},
                            look_and_feel: current?.look_and_feel || {},
                            template: current?.template || current?.templates || [],
                            voiceover: current?.voiceover || current?.voiceovers || []
                          };
                          await updateBrandAssets({ userId: token, payload });
                          // 4) GET again and refresh UI list
                          const finalAssets = await getBrandAssetsByUserId(token);
                          const finalLogos = Array.isArray(finalAssets?.brand_identity?.logo)
                            ? finalAssets.brand_identity.logo
                            : (Array.isArray(finalAssets?.logos)
                              ? finalAssets.logos
                              : (Array.isArray(finalAssets?.logo) ? finalAssets.logo : []));
                          setBrandLogos(finalLogos);
                          const lastSel = finalLogos && finalLogos.length ? (typeof finalLogos[finalLogos.length-1] === 'string' ? finalLogos[finalLogos.length-1] : (finalLogos[finalLogos.length-1]?.url || '')) : '';
                          if (lastSel) setSelectedLogoUrl(lastSel);
                        } catch (_) { /* noop */ }
                        finally { setIsLogoUploading(false); e.target.value=''; }
                      }} />
                      <button onClick={() => logoFileInputRef.current && logoFileInputRef.current.click()} className={`px-3 py-2 rounded-md text-sm ${isLogoUploading ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-gray-100 hover:bg-gray-200 text-gray-800'}`} disabled={isLogoUploading}>
                        <span className="inline-flex items-center gap-2">
                          {isLogoUploading && (<span className="inline-block w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />)}
                          {isLogoUploading ? 'Uploading…' : 'Choose Image'}
                        </span>
                      </button>
                      {selectedLogoUrl && (
                        <div className="mt-3">
                          <p className="text-xs text-gray-600 mb-1">Selected logo preview</p>
                          <div className="border rounded-lg p-2 inline-flex bg-white">
                            <img src={selectedLogoUrl} alt="Selected logo" className="h-16 object-contain" />
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="w-full flex-col mt-0 bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
            <span className="text-[18px] text-gray-600 mb-3">Would you like captions or subtitles included</span>
            <div className="flex justify-start items-start gap-2 bg-white">
              <div className="flex flex-col gap-3">
                {optionsShareable.map((opt) => (
                  <div key={opt.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSelectShareable(opt.id)}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                    ${selectedShareable === opt.id
                          ? "bg-green-500 border-green-500"
                          : "bg-white border-gray-400"
                        }`}
                      >
                        {selectedShareable === opt.id && (
                          <FaCheck className="text-white text-sm" />
                        )}
                      </button>
                      <label
                        onClick={() => handleSelectShareable(opt.id)}
                        className="cursor-pointer"
                      >
                        {opt.label}
                      </label>
                    </div>
                    
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div  className="w-full flex-col mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
            <span className="text-[18px] text-gray-600 mb-3">Specific color schemes</span>
            <div className="flex flex-col gap-3">
              {optionsColor.map((opt) => (
                <div key={opt.id} className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedColor(opt.id)}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                  ${selectedColor === opt.id
                        ? "bg-green-500 border-green-500"
                        : "bg-white border-gray-400"
                      }`}
                  >
                    {selectedColor === opt.id && (
                      <FaCheck className="text-white text-sm" />
                    )}
                  </button>
                  <label
                    onClick={() => setSelectedColor(opt.id)}
                    className="cursor-pointer"
                  >
                    {opt.label}
                  </label>
                </div>
              ))}
              {selectedColor === 'yes' && (
                <div className="mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="flex flex-col gap-3">
                      <HexColorPicker color={currentColor} onChange={setCurrentColor} />
                      <div className="flex items-center gap-3">
                        <div
                          className="h-8 w-8 rounded-full border"
                          style={{ backgroundColor: currentColor }}
                        />
                        <input
                          value={currentColor}
                          onChange={(e) => setCurrentColor(e.target.value)}
                          className="px-3 py-2 border rounded-lg w-40"
                        />
                        <button
                          type="button"
                          onClick={addCurrentColor}
                          className="px-4 py-2 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0066] transition-colors"
                        >
                          Add Color
                        </button>
                      </div>
                    </div>
                    <div>
                      <div className="w-full border border-gray-200 rounded-xl p-4 mb-4">
                        <div className="grid grid-cols-8 gap-2">
                          {[...presetColors, ...customColors].map((color) => {
                            const isSelected = selectedColors.has(color);
                            return (
                              <button
                                key={color}
                                onClick={() => toggleColor(color)}
                                className={`w-8 h-8 rounded-full border-2 ${isSelected
                                  ? "border-blue-500 ring-2 ring-blue-300"
                                  : "border-gray-300"
                                  } flex items-center justify-center transition-all duration-150`}
                                style={{ backgroundColor: color }}
                                title={color}
                              >
                                {isSelected && (
                                  <span className="text-white text-xs">✓</span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <p className="text-gray-700 font-medium">CUSTOM</p>
                        <button
                          onClick={openColorPicker}
                          className="w-8 h-8 rounded-full bg-gray-100 border border-gray-300 flex items-center justify-center text-gray-600 hover:bg-gray-200 transition-colors"
                          title="Pick color"
                        >
                          <FaEyeDropper className="w-4 h-4" />
                        </button>
                        <input
                          ref={colorInputRef}
                          type="color"
                          onChange={handlePickCustomColor}
                          className="hidden"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div  className="w-full flex-col mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
            <span className="text-[18px] text-gray-600 mb-3">Font styles</span>
            <div className="flex flex-col gap-3">
              {optionsFont.map((opt) => (
                <div key={opt.id} className="flex items-center gap-3">
                  <button
                    onClick={() => setSelectedFont(opt.id)}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                  ${selectedFont === opt.id
                        ? "bg-green-500 border-green-500"
                        : "bg-white border-gray-400"
                      }`}
                  >
                    {selectedFont === opt.id && (
                      <FaCheck className="text-white text-sm" />
                    )}
                  </button>
                  <label
                    onClick={() => setSelectedFont(opt.id)}
                    className="cursor-pointer"
                  >
                    {opt.label}
                  </label>
                </div>
              ))}
              {selectedFont === 'yes' && (
                <div className="mt-3 w-full">
                  <div className="relative z-40">
                    <button
                      type="button"
                      onClick={() => setIsFontOpen((o) => !o)}
                      className="w-full h-12 border border-gray-300 rounded-lg px-3 flex items-center justify-between bg-white"
                    >
                      <div className="flex flex-wrap gap-2">
                        {selectedFonts.length === 0 && (
                          <span className="text-gray-400">Select fonts</span>
                        )}
                        {selectedFonts.map((font) => (
                          <span
                            key={font}
                            className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-sm inline-flex items-center gap-2"
                          >
                            {font}
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                removeFont(font);
                              }}
                              className="hover:text-red-500"
                            >
                              <FaTimes className="w-3 h-3" />
                            </button>
                          </span>
                        ))}
                      </div>
                      <FaChevronDown className="text-gray-400" />
                    </button>

                    {isFontOpen && (
                      <div className="absolute z-50 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {fontOptions.map((font) => (
                          <button
                            key={font}
                            type="button"
                            onClick={() => handleSelectFont(font)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                            style={{ fontFamily: font }}
                          >
                            {font}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          
         
        
           
           {/* Avatar Question */}
          
        </div>
      </div>

      {/* Presenter Options (Avatar/Hybrid) */}
      {isPresenterVisible && (
        <>
        <div
          onClick={() => handleAccordionToggle('presenter')}
          className="w-full cursor-pointer mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between"
        >
          <span className="text-[18px] text-gray-600">Presenter Options</span>
          {openPresenter ? <FaAngleUp /> : <FaAngleDown />}
        </div>
        <div className={`transition-all duration-500 ease-in-out overflow-hidden ${openPresenter ? 'max-h-[2000px] mt-4 opacity-100' : 'max-h-0 opacity-0'}`}>
        <div className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="md:col-span-1 border border-gray-200 rounded-lg divide-y">
              {PRESENTER_OPTIONS.map((opt, idx) => {
                const active = selectedPresenter && selectedPresenter.option === opt.option;
                return (
                  <button key={idx} type="button" onClick={() => handlePresenterSelect(opt)} className={`w-full text-left px-3 py-2 hover:bg-gray-50 ${active ? 'bg-blue-50' : ''}`}>
                    <div className="font-medium text-gray-900 text-sm">{opt.option}</div>
                  </button>
                );
              })}
            </div>
            <div className="md:col-span-2">
              {!selectedPresenter && (
                <div className="text-sm text-gray-500">Select a presenter option to preview its sample.</div>
              )}
              {selectedPresenter && (
                <div className="space-y-3">
                  <div className="text-lg font-semibold text-gray-900">{selectedPresenter.option}</div>
                  {selectedPresenter.sample_video ? (
                    <div className="aspect-video w-full bg-black/5 rounded-lg overflow-hidden border">
                      <video controls className="w-full h-full">
                        <source src={selectedPresenter.sample_video} type="video/mp4" />
                      </video>
                    </div>
                  ) : (
                    <div className="text-sm text-gray-600">No sample available.</div>
                  )}
                  {selectedPresenter.sample_video && (
                    <div>
                      <a className="text-blue-600 text-sm hover:underline" href={selectedPresenter.sample_video} target="_blank" rel="noreferrer">Open sample in new tab</a>
                    </div>
                  )}
                  {selectedPresenter.option === 'anchor mode' && (
                    <div className="mt-2 border-t pt-3">
                      <div className="text-sm font-medium text-gray-800 mb-2">Anchor Settings</div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-600">Size</label>
                          <input value={anchorSize} onChange={(e)=>setAnchorSize(e.target.value)} placeholder="e.g., small, medium, large or px" className="px-3 py-2 border rounded-lg" />
                        </div>
                        <div className="flex flex-col gap-1">
                          <label className="text-xs text-gray-600">Position</label>
                          <select value={anchorPosition} onChange={(e)=>setAnchorPosition(e.target.value)} className="px-3 py-2 border rounded-lg">
                            <option value="topleft">Top Left</option>
                            <option value="topcenter">Top Center</option>
                            <option value="topright">Top Right</option>
                            <option value="bottomcenter">Bottom Center</option>
                            <option value="bottomleft">Bottom Left</option>
                            <option value="bottomright">Bottom Right</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        </div>
        </>
      )}

      {/* Technical and Format Constraints */}

      <div>
       
                 <div
           onClick={() => handleAccordionToggle('technical')}
           className="w-full cursor-pointer mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between"
         >
          <span className="text-[18px] text-gray-600">Technical and Format Constraints</span>
          {openTechnical ? <FaAngleUp /> : <FaAngleDown />}
        </div>
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${openTechnical ? "max-h-[2000px] mt-4 opacity-100" : "max-h-0 opacity-0"}`}
        >
          <div  className="w-full flex-col bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
            <span className="text-[18px] text-gray-600 mb-3">What is the preferred duration of the final video?</span>
            <div className="flex flex-col gap-3">
              {optionsDuration.map((opt) => (
                <div key={opt.id} className="flex items-center gap-3">
                  <button
                    onClick={() => handleSelectDuration(opt.id)}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                  ${selectedDuration === opt.id
                        ? "bg-green-500 border-green-500"
                        : "bg-white border-gray-400"
                      }`}
                  >
                    {selectedDuration === opt.id && (
                      <FaCheck className="text-white text-sm" />
                    )}
                  </button>
                  <label
                    onClick={() => handleSelectDuration(opt.id)}
                    className="cursor-pointer"
                  >
                    {opt.label}
                  </label>
                </div>
              ))}
            </div>
          </div>
          <div  className="w-full flex-col mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
            <span className="text-[18px] text-gray-600 mb-3">In which format should the final video be delivered?</span>
            <div className="flex flex-col gap-3">
              {optionsFormat.map((opt) => (
                <div key={opt.id} className="flex items-center gap-3">
                  <button
                    onClick={() => handleSelectFormat(opt.id)}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                  ${selectedFormat === opt.id
                        ? "bg-green-500 border-green-500"
                        : "bg-white border-gray-400"
                      }`}
                  >
                    {selectedFormat === opt.id && (
                      <FaCheck className="text-white text-sm" />
                    )}
                  </button>
                  <label
                    onClick={() => handleSelectFormat(opt.id)}
                    className="cursor-pointer"
                  >
                    {opt.label}
                  </label>
                  {opt.id === "other" && selectedFormat === "other" && (
                    <input
                      type="text"
                      value={otherFormatText}
                      onChange={(e) => setOtherFormatText(e.target.value)}
                      placeholder="Please specify"
                      className="border-b border-gray-400 outline-none ml-2"
                    />
                  )}
                </div>
              ))}
            </div>
          </div>
          <div  className="w-full flex-col mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
            <span className="text-[18px] text-gray-600 mb-3">What aspect ratio should the video be published in?</span>
            <div className="flex flex-col gap-3">
              {optionsAspect.map((opt) => {
                const isSelected = selectedAspect === opt.id;
                return (
                  <div key={opt.id} className="flex flex-col gap-2">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleSelectAspect(opt.id)}
                        className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                          ${isSelected ? "bg-green-500 border-green-500" : "bg-white border-gray-400"}`}
                      >
                        {isSelected && <FaCheck className="text-white text-sm" />}
                      </button>
                      <label
                        onClick={() => handleSelectAspect(opt.id)}
                        className="cursor-pointer"
                      >
                        {opt.label}
                      </label>
                    </div>
                    {opt.id === "custom" && isSelected && (
                      <div className="ml-9 flex items-center gap-3 flex-wrap">
                        <div className="flex items-center gap-2">
                          <input
                            type="number"
                            min="1"
                            value={customAspectWidth}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^\d]/g, '');
                              setCustomAspectWidth(val);
                              setOtherAspectText(val && customAspectHeight ? `${val}:${customAspectHeight}` : '');
                            }}
                            placeholder="Width"
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                          />
                          <span className="text-sm text-gray-500">:</span>
                          <input
                            type="number"
                            min="1"
                            value={customAspectHeight}
                            onChange={(e) => {
                              const val = e.target.value.replace(/[^\d]/g, '');
                              setCustomAspectHeight(val);
                              setOtherAspectText(customAspectWidth && val ? `${customAspectWidth}:${val}` : '');
                            }}
                            placeholder="Height"
                            className="w-24 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                          />
                        </div>
                        <p className="text-xs text-gray-500">Enter numerical values (e.g., 4 and 5 for 4:5)</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Audio and Effects */}

      <div>
       
                 <div
           onClick={() => handleAccordionToggle('audio')}
           className="w-full cursor-pointer mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex items-center justify-between"
         >
          <span className="text-[18px] text-gray-600">Audio and Effects</span>
          {openAudio ? <FaAngleUp /> : <FaAngleDown />}
        </div>
        <div
          className={`transition-all duration-500 ease-in-out overflow-hidden ${openAudio ? "max-h-[2000px] mt-4 opacity-100" : "max-h-0 opacity-0"}`}
        >
          
                     <div className="w-full flex-col mt-0 bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
             <span className="text-[18px] text-gray-600 mb-3">Would you like to add voice narration or voice-over?</span>
             <div className="flex flex-col gap-3">
               {optionsVoice.map((opt) => (
                 <div
                   key={opt.id}
                   className="flex items-center gap-3 cursor-pointer"
                   onClick={() => handleSelectVoice(opt.id)}
                 >
                   <button
                     className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                   ${selectedVoice2 === opt.id
                         ? "bg-green-500 border-green-500"
                         : "bg-white border-gray-400"
                       }`}
                   >
                     {selectedVoice2 === opt.id && (
                       <FaCheck className="text-white text-sm" />
                     )}
                   </button>
                   <label>{opt.label}</label>
                 </div>
               ))}
               
               {/* Voice Selection Options - Show when user selects Yes */}
               {selectedVoice2 === 'yes' && (
                 <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                   <h4 className="text-[16px] font-medium text-gray-700 mb-3">Select Your Preferred Voice</h4>
                   {/* Default voices, circular */}
                   {/* <div className="mb-4">
                     <p className="text-sm text-gray-600 mb-2">Choose a default voice:</p>
                     <div className="flex flex-wrap gap-4">
                       {voices.map((v) => {
                         const active = selectedVoice === v.id;
                         return (
                           <button key={v.id} onClick={() => handleVoice(v.id)} className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all ${active ? 'border-blue-600 ring-2 ring-blue-300 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
                             <FaMicrophone className={`${active ? 'text-blue-700' : 'text-gray-600'}`} />
                           </button>
                         );
                       })}
                     </div>
                   </div> */}
                   {/* Brand voices, circular + add */}
                   <div className="mb-2">
                    <p className="text-sm text-gray-600 mb-2">Choose from your files:</p>
                    <div className="flex flex-wrap gap-4 items-start">
                      {uniqueBrandVoiceOptions.length > 0 ? (
                        uniqueBrandVoiceOptions.map(({ name, index }) => {
                          const active = selectedVoiceFromLibrary === index
                          return (
                            <div key={`${name}-${index}`} className="flex flex-col items-center gap-1">
                              <button
                                onClick={() => setSelectedVoiceFromLibrary(index)}
                                className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all ${
                                  active
                                    ? 'border-blue-600 ring-2 ring-blue-300 bg-blue-50'
                                    : 'border-gray-300 bg-white hover:bg-gray-50'
                                }`}
                                title={name}
                              >
                                <span className={`text-xs font-medium px-2 text-center truncate max-w-full ${
                                  active ? 'text-blue-700' : 'text-gray-600'
                                }`}>
                                  {name.length > 10 ? name.substring(0, 8) + '...' : name}
                                </span>
                              </button>
                              <span className="text-xs text-gray-600 text-center max-w-[80px] truncate">{name}</span>
                            </div>
                          )
                        })
                      ) : (
                        <span className="text-xs text-gray-500">No saved voices found for {selectedTone} tone.</span>
                      )}
                      <div className="flex flex-col items-center gap-1">
                         <button onClick={() => setIsVoiceModalOpen(true)} className="w-20 h-20 rounded-full flex items-center justify-center border border-dashed border-gray-400 text-gray-500 hover:bg-gray-50" title="Add voice">
                           <FaPlus className="w-6 h-6" />
                         </button>
                         <span className="text-xs text-gray-600">Add</span>
                       </div>
                     </div>
                   </div>
                  
                     {/* Voice Description Input */}
                     
                     {/* Pending voice previews + Save */}
                     {(pendingVoiceUrls && pendingVoiceUrls.length > 0) && (
                       <div className="mt-3">
                         <p className="text-sm text-gray-600 mb-1">Pending voice-overs (not saved):</p>
                         <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                           {pendingVoiceUrls.map((u, i) => (
                             <div key={i} className="p-2 border rounded-lg flex items-center gap-3">
                               <audio src={u} controls className="flex-1" />
                             </div>
                           ))}
                         </div>
                         <button
                           onClick={() => uploadBrandVoicesLegacy(pendingVoiceBlobs)}
                           disabled={isVoiceUploading || pendingVoiceBlobs.length === 0}
                           className={`mt-3 px-4 py-2 rounded-lg text-sm font-medium ${
                             (isVoiceUploading || pendingVoiceBlobs.length === 0) ? 'bg-gray-200 text-gray-500 cursor-not-allowed' : 'bg-green-600 text-white hover:bg-green-700'
                           }`}
                        >
                          <span className="inline-flex items-center gap-2">
                            {isVoiceUploading && (
                              <span className="inline-block w-4 h-4 border-2 border-white/70 border-t-white rounded-full animate-spin" />
                            )}
                            {isVoiceUploading ? 'Saving…' : 'Save to Brand Assets'}
                          </span>
                        </button>
                       </div>
                     )}
                  </div>
            
              )}
             </div>
           </div>
                     
          {/* <div className="w-full flex-col mt-4 bg-white border border-gray-200 rounded-xl px-4 py-3 flex">
            <span className="text-[18px] text-gray-600 mb-3">Would you like to add any special features?</span>
            <div className="flex flex-col gap-3">
              {optionsFeatures.map((opt) => (
                <div
                  key={opt.id}
                  className="flex items-center gap-3 cursor-pointer"
                  onClick={() => handleSelectFeature(opt.id)}
                >
                  <button
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                  ${selectedFeature === opt.id
                        ? "bg-green-500 border-green-500"
                        : "bg-white border-gray-400"
                      }`}
                  >
                    {selectedFeature === opt.id && (
                      <FaCheck className="text-white text-sm" />
                    )}
                  </button>
                  <label>{opt.label}</label>
                </div>
              ))}
            </div>
          </div> */}
        </div>
      </div>

      {/* Styles and Colors (commented out per request) */}
    


      {/* Voice Selection Section */}
     

     

      {/* Smooth Transition Wrapper */}
      <div
        className={`transition-all duration-500 ease-in-out overflow-hidden ${addvoice ? "max-h-[1000px] mt-4 opacity-100" : "max-h-0 opacity-0"
          }`}
      >
        <div className="w-full border border-gray-200 rounded-xl p-6">
          <h3 className="text-[18px] font-medium text-gray-800 mb-4">Choose a Voice</h3>

          <div className="flex items-center gap-4 mb-6">
            
            {voices.map((voice) => (
              <button
                key={voice.id}
                onClick={() => handleVoice(voice.id)}
                className={`w-16 h-16 rounded-full flex items-center justify-center transition-all duration-200 ${voice.isSelected
                  ? "bg-[#13008B] text-white ring-4 ring-blue-200"
                  : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                  }`}
                title={voice.name}
              >
                <FaMicrophone className="w-6 h-6" />
              </button>
            ))}
            <button onClick={() => setIsVoiceModalOpen(true)} className="w-16 h-16 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all duration-200 flex items-center justify-center relative group" title="Upload new voice">
              <FaPlus className="w-6 h-6" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 bg-black rounded-full flex items-center justify-center">
                <FaUpload className="w-3 h-3 text-white" />
              </div>
            </button>

            
                         <input
               ref={fileInputRef}
               type="file"
               accept="audio/*,.mp3,.wav,.m4a,.aac"
               onChange={handleVoiceUpload}
               className="hidden"
             />
             
             {/* Hidden avatar file input */}
             <input
               ref={avatarInputRef}
               type="file"
               accept="image/*,.jpg,.jpeg,.png,.svg"
               onChange={handleAvatarUpload}
               className="hidden"
             />
          </div>

     
          {selectedVoice && (
            <div className="bg-gray-50 rounded-lg p-4">
              <p className="text-sm text-gray-600 mb-2">Selected Voice:</p>
              <p className="font-medium text-gray-800">
                {voices.find((v) => v.id === selectedVoice)?.name}
              </p>
            </div>
          )}

          <div className="mt-4 text-sm text-gray-500">
            <p>Supported formats: MP3, WAV, M4A, AAC</p>
            <p>Maximum file size: 10MB</p>
          </div>
        </div>
      </div>

       {/* Next Step Button */}
       <div className="w-full mt-8 flex justify-center">
        <button 
          onClick={() => {
            try {
              // Resolve selected voice URL only if user explicitly selected a voice
              let selectedVoiceUrl = '';
              try {
                const list = Array.isArray(brandVoices) ? brandVoices : [];
                if (
                  selectedVoice2 === 'yes' &&
                  list.length > 0 &&
                  selectedVoiceFromLibrary !== null &&
                  selectedVoiceFromLibrary !== undefined
                ) {
                  const v = list[selectedVoiceFromLibrary];
                  selectedVoiceUrl = typeof v === 'string' ? v : (v?.url || '');
                }
              } catch (_) { /* noop */ }
              const aspectValue = (() => {
                if (selectedAspect === 'custom' || selectedAspect === 'other') {
                  if (customAspectWidth && customAspectHeight) return `${customAspectWidth}:${customAspectHeight}`;
                  return otherAspectText || '';
                }
                return selectedAspect || '';
              })();
              const payload = {
                purpose_and_audience: {
                  // Add selected video type into purpose_and_audience
                  type_of_video: selectedVideoType || '',
                  goal_of_video: selectedGoal === 'other' ? otherText : (goals.find(g => g.id === selectedGoal)?.label || ''),
                  audience: selectedAudience === 'other' ? otherTextaud : (Audience.find(a => a.id === selectedAudience)?.label || ''),
                  tone: selectedTone === 'other' ? otherTexttone : (Tone.find(t => t.id === selectedTone)?.label || '')
                },
                content_focus_and_emphasis: [
                  {
                    question: 'Are there specific topics or sections to emphasize?',
                    option: (options.find(o => o.id === selectedOption)?.label || ''),
                    desc: descEmphasize
                  },
                  {
                    question: 'Would you like captions or subtitles included?',
                    option: (optionsShareable.find(o => o.id === selectedShareable)?.label || ''),
                    desc: descShareable
                  }
                ],
                 style_and_visual_pref: {
                   logo_inclusion: selectedLogo === 'yes'
                     ? [{ answer: 'Yes', imageLink: (selectedLogoUrl || '') }]
                     : (selectedLogo === 'no' ? [{ answer: 'No', imageLink: '' }] : []),
                   color_pallete: selectedColor === 'yes' ? Array.from(selectedColors) : [],
                   font_style: selectedFont === 'yes' ? selectedFonts : [],
                   images: [
                     {
                       question: 'Do you want to include specific images, icons, or graphics?',
                       option: (optionsGraphics.find(o => o.id === selectedGraphicsOption)?.label || ''),
                       guidelines: []
                     }
                   ],
                   call_to_action: selectedCTA ? [{ question: 'Would you like to include a call-to-action or contact info?', answer: (optionsCTA.find(o => o.id === selectedCTA)?.label || ''), desc: descCTA }] : [],
                   summary_scene: selectedSummary ? [{ question: 'Would you like to have a summary scene with key highlights?', answer: (optionsSummary.find(o => o.id === selectedSummary)?.label || ''), desc: descSummary }] : [],
                   avatar: selectedAvatar === 'yes' ? {
                     question: 'Do you want an avatar?',
                     answer: 'Yes',
                     selected_avatar: selectedAvatarFromLibrary ? [
                       'Business Professional', 'Creative Designer', 'Tech Expert', 'Friendly Host',
                       'Academic Speaker', 'Industry Leader', 'Youth Influencer', 'Cultural Representative'
                     ][parseInt(selectedAvatarFromLibrary.replace('avatar', '')) - 1] || '' : '',
                     custom_avatar: uploadedAvatar ? 'Custom avatar uploaded' : '',
                     description: descAvatar
                   } : {
                     question: 'Do you want an avatar?',
                     answer: 'No'
                   }
                },
               technical_and_formal_constraints: {
                  video_length: selectedDuration || '',
                  video_format: selectedFormat === 'other' ? otherFormatText : (selectedFormat || ''),
                  aspect_ratio: aspectValue
                },
                                 audio_and_effects: [
                  {
                    question: 'Do you have preferred music or sound effects?',
                    answer: (optionsMusic.find(o => o.id === selectedMusic)?.label || ''),
                    desc: descMusic
                  },
                  (() => {
                    const wantsVoice = (selectedVoice2 === 'yes');
                    // Derive a simple preferred name only if explicitly selected from library
                    let preferredName;
                    if (wantsVoice && typeof selectedVoiceFromLibrary === 'number') {
                      const names = ['Sarah', 'Michael', 'Emma', 'David', 'Sophie', 'Alex'];
                      preferredName = names[selectedVoiceFromLibrary] || '';
                    }
                    return {
                      question: 'Would you like to add voice narration and voice-over',
                      answer: wantsVoice ? 'Yes' : 'No',
                      preferred_voice_name: wantsVoice ? (preferredName || '') : '',
                      voice_link: wantsVoice ? (selectedVoiceUrl || '') : '',
                      desc: descVoice
                    };
                  })(),
                  {
                    question: 'Would you like to add my special features?',
                    answer: selectedFeature || ''
                  }
                ]
              };
              console.log('Guidelines payload:', payload);
              try {
                localStorage.setItem('guidelines_payload', JSON.stringify(payload));
              } catch (e2) { /* noop */ }
            } catch (e) { /* noop */ }
            if (window.goToNextStep) {
              window.goToNextStep();
            }
          }}
          className='px-6 py-2 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0066] transition-colors'
        >
          Next
        </button>
      </div>

      {/* Voice Add Modal */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white w-[96%] max-w-4xl rounded-xl shadow-2xl p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-gray-900">Add Voice</h3>
              <button onClick={() => {
                setIsVoiceModalOpen(false);
                setVoiceName('');
                setVoiceFilesForUpload([]);
                setPendingVoiceBlobs([]);
                setPendingVoiceUrls([]);
              }} className="text-gray-500 hover:text-gray-700">✕</button>
            </div>
            
            {/* Name Input */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Voice Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={voiceName}
                onChange={(e) => setVoiceName(e.target.value)}
                placeholder="Enter voice name"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            {/* Tabs */}
            <div className="flex items-center gap-2 mb-4">
              <button
                onClick={() => setVoiceModalTab('record')}
                className={`${voiceModalTab==='record' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} px-3 py-1.5 rounded-md text-sm`}
              >Record</button>
              <button
                onClick={() => setVoiceModalTab('upload')}
                className={`${voiceModalTab==='upload' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-800'} px-3 py-1.5 rounded-md text-sm`}
              >Upload</button>
            </div>

            {/* Record view */}
            {voiceModalTab === 'record' && (
              <div>
                {/* Tone sample at top */}
                <div className="mb-4 text-base text-gray-800 bg-gray-50 border border-gray-200 rounded px-4 py-3">
                  {getRecordingSample()}
                </div>
                <div className="border rounded-xl p-6 flex flex-col gap-4">
                  <div className="flex items-center justify-between flex-wrap gap-3">
                    <p className="text-sm text-gray-700 font-medium">Record Voice</p>
                    <div className="flex items-center gap-3">
                      {isRecording && (
                        <div className="flex items-center gap-2 text-red-600 font-medium">
                          <span className="inline-block w-2 h-2 bg-red-600 rounded-full animate-pulse" />
                          Recording…
                        </div>
                      )}
                      <div className="text-xs text-gray-600 tabular-nums">
                        {String(Math.floor(elapsedSec / 60)).padStart(2, '0')}:{String(elapsedSec % 60).padStart(2, '0')}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-center">
                    {!isRecording ? (
                      <button onClick={startRecording} className="w-20 h-20 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center shadow-md transition-colors">
                        <FaMicrophone className="w-7 h-7" />
                      </button>
                    ) : (
                      <button onClick={stopRecording} className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 text-white flex items-center justify-center shadow-md transition-colors">
                        <FaMicrophone className="w-7 h-7" />
                      </button>
                    )}
                  </div>

                  {/* Simple animated level bars for visual feedback */}
                  <div className="flex items-end justify-center gap-1 h-8">
                    {[0,1,2,3,4].map((i) => (
                      <span key={i} className={`w-1.5 bg-green-500 rounded-sm animate-pulse`} style={{height: `${6 + i*6}px`, animationDelay: `${i*120}ms`}} />
                    ))}
                  </div>

                  {pendingVoiceUrls && pendingVoiceUrls.length > 0 && (
                    <div className="mt-2">
                      <audio ref={audioPreviewRef} src={pendingVoiceUrls[pendingVoiceUrls.length-1]} controls className="w-full" />
                      <div className="mt-2 flex items-center gap-2">
                        <button onClick={() => { setPendingVoiceBlobs([]); setPendingVoiceUrls([]); }} className="px-3 py-1.5 rounded-md text-sm bg-gray-100 hover:bg-gray-200 text-gray-800">Re-record</button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Upload view */}
            {voiceModalTab === 'upload' && (
              <div className="border rounded-lg p-4">
                <p className="text-sm text-gray-700 font-medium mb-2">Upload Voice File</p>
                <input
                  ref={voiceModalFileInputRef}
                  type="file"
                  accept="audio/*"
                  className="hidden"
                  onChange={(e) => {
                    const files = Array.from(e.target.files || []);
                    setVoiceFilesForUpload(files.length > 0 ? [files[0]] : []);
                  }}
                />
                <button onClick={() => voiceModalFileInputRef.current && voiceModalFileInputRef.current.click()} className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm">Choose File</button>
                {voiceFilesForUpload && voiceFilesForUpload.length > 0 && (
                  <div className="mt-2 text-xs text-gray-700">
                    <p className="font-medium">Selected file:</p>
                    <p className="text-gray-600">{voiceFilesForUpload[0].name}</p>
                  </div>
                )}
              </div>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => {
                  setIsVoiceModalOpen(false);
                  setVoiceName('');
                  setVoiceFilesForUpload([]);
                  setPendingVoiceBlobs([]);
                  setPendingVoiceUrls([]);
                }} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200" disabled={isSavingBrandVoices}>Cancel</button>
              <button
                onClick={async () => {
                  try {
                    setVoiceSaveMsg('');
                    setIsSavingBrandVoices(true);
                    
                    // Validate name
                    if (!voiceName || !voiceName.trim()) {
                      setVoiceSaveMsg('Please enter a voice name.');
                      return;
                    }
                    
                    // Get the file to upload
                    let fileToUpload = null;
                    
                    if (voiceModalTab === 'record') {
                      // Use recorded voice
                      if (!pendingVoiceBlobs || pendingVoiceBlobs.length === 0) {
                        setVoiceSaveMsg('Please record a voice first.');
                        return;
                      }
                      const toMp3File = (blob) => new File([blob], `recorded_${Date.now()}.mp3`, { type: 'audio/mpeg' });
                      fileToUpload = toMp3File(pendingVoiceBlobs[pendingVoiceBlobs.length - 1]);
                    } else {
                      // Use uploaded file
                      if (!voiceFilesForUpload || voiceFilesForUpload.length === 0) {
                        setVoiceSaveMsg('Please upload a voice file first.');
                        return;
                      }
                      fileToUpload = voiceFilesForUpload[0];
                    }
                    
                    // Get the tone type for the API (professional, casual, humorous, storytelling)
                    // Use selectedTone, defaulting to 'professional' if not set or if 'other'
                    const toneType = (selectedTone && selectedTone !== 'other') 
                      ? selectedTone.toLowerCase() 
                      : 'professional';
                    
                    // Upload to the new API endpoint
                    const form = new FormData();
                    form.append('user_id', token);
                    form.append('name', voiceName.trim());
                    form.append('type', toneType); // Use tone (professional, casual, humorous, storytelling)
                    form.append('file', fileToUpload);
                    
                    const uploadResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/upload-voiceover', {
                      method: 'POST',
                      body: form
                    });
                    
                    if (!uploadResp.ok) {
                      const errorText = await uploadResp.text().catch(() => '');
                      throw new Error(`Upload failed: ${uploadResp.status} ${errorText}`);
                    }
                    
                    // Call get brand assets API to refresh the list (using same format as initial load)
                    const getResp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/${encodeURIComponent(token)}`);
                    if (!getResp.ok) {
                      throw new Error(`Failed to fetch brand assets: ${getResp.status}`);
                    }
                    
                    const assets = await getResp.json().catch(() => ({}));
                    // Parse voiceovers using the same logic as initial load
                    const voices = Array.isArray(assets?.voiceovers)
                      ? assets.voiceovers
                      : (Array.isArray(assets?.voiceover)
                        ? assets.voiceover
                        : (assets?.voices || []));
                    
                    // Update brand voices state - this will trigger uniqueBrandVoiceOptions to recalculate
                    // and the UI will automatically show the updated voiceover list
                    setBrandVoices(voices);
                    
                    // Update localStorage to match initial load behavior
                    try {
                      const urls = voices.map(v => (typeof v === 'string' ? v : (v?.url || ''))).filter(Boolean);
                      localStorage.setItem('brand_voiceover_urls', JSON.stringify(urls));
                    } catch (_) { /* noop */ }
                    
                    // The uniqueBrandVoiceOptions useMemo will automatically recalculate when brandVoices changes
                    // This ensures the newly uploaded voiceover appears in the list immediately
                    
                    // Reset form
                    setVoiceName('');
                    setVoiceFilesForUpload([]);
                    try { (pendingVoiceUrls || []).forEach(u => URL.revokeObjectURL(u)); } catch (_) {}
                    setPendingVoiceUrls([]);
                    setPendingVoiceBlobs([]);
                    setVoiceSaveMsg('Voice uploaded successfully!');
                    
                    // Close modal after a brief delay to show success message
                    // The voiceover list will automatically update and show the new voiceover
                    setTimeout(() => {
                      setIsVoiceModalOpen(false);
                      setVoiceSaveMsg('');
                    }, 1500);
                  } catch (e) {
                    setVoiceSaveMsg(e?.message || 'Failed to save');
                  } finally {
                    setIsSavingBrandVoices(false);
                  }
                }}
                disabled={isSavingBrandVoices}
                className={`px-4 py-2 rounded-md text-white ${isSavingBrandVoices ? 'bg-green-400 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
              >Save to Brand Assets</button>
            </div>
            <div className="flex items-center gap-2 mt-2 min-h-[1.25rem]">
              {isSavingBrandVoices && (
                <span className="inline-block w-4 h-4 border-2 border-gray-300 border-t-gray-700 rounded-full animate-spin" />
              )}
              {voiceSaveMsg && (<div className="text-sm text-gray-700">{voiceSaveMsg}</div>)}
            </div>
          </div>
        </div>
      )}

    </div>
  )
}

export default Guidlines
