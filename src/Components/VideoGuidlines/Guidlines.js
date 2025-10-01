import React, { useEffect, useRef, useState } from 'react'
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
  // Audio refs for hover-play of brand voices
  const brandVoiceAudioRefs = useRef({})
  const stopAllBrandVoice = () => {
    try {
      const map = brandVoiceAudioRefs.current || {}
      Object.keys(map).forEach(k => {
        const a = map[k];
        if (a) { try { a.pause(); a.currentTime = 0 } catch (_) {} }
      })
    } catch (_) { /* noop */ }
  }
  const playBrandVoice = (i, url) => {
    try {
      stopAllBrandVoice()
      let a = brandVoiceAudioRefs.current[i]
      if (!a || a.src !== url) {
        a = new Audio(url)
        brandVoiceAudioRefs.current[i] = a
      }
      a.currentTime = 0
      a.play().catch(() => {})
    } catch (_) { /* noop */ }
  }
  const stopBrandVoice = (i) => {
    try {
      const a = brandVoiceAudioRefs.current[i]
      if (a) { a.pause(); a.currentTime = 0 }
    } catch (_) { /* noop */ }
  }

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
      const getResp = await fetch(`https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/users/${encodeURIComponent(token)}/brand-assets`)
      const assets = await getResp.json().catch(() => ({}))
      const voices = Array.isArray(assets?.voiceovers) ? assets.voiceovers : (assets?.voices || [])
      setBrandVoices(voices)
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
        const resp = await fetch(`https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/users/${encodeURIComponent(token)}/brand-assets`)
        const assets = await resp.json().catch(() => ({}))
        const voices = Array.isArray(assets?.voiceovers)
          ? assets.voiceovers
          : (Array.isArray(assets?.voiceover)
            ? assets.voiceover
            : (assets?.voices || []))
        setBrandVoices(voices)
        const logos = Array.isArray(assets?.logos)
          ? assets.logos
          : (Array.isArray(assets?.logo)
            ? assets.logo
            : (Array.isArray(assets?.images)
              ? assets.images.filter(it => typeof it === 'string' && /\.(png|jpe?g|svg|webp)$/i.test(it))
              : []))
        setBrandLogos(logos)
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

  const [selectedGoal, setSelectedGoal] = useState("educate"); // Default to "Inform"
  const [selectedVideoType, setSelectedVideoType] = useState("tourism"); 
  const [otherText, setOtherText] = useState("");
  const videoType= [
    { id: "tourism", label: "Travel / Tourism" },
    { id: "technology", label: "Software and Technology" },
    { id: "sales", label: "Sales Pitch / Proposal" },
    { id: "marketing", label: "Marketing Pitch / Proposal" }
  ];
  const goals = [
    { id: "inform", label: "Inform" },
    { id: "promote", label: "Promote" },
    { id: "summarize", label: "Summarize" },
    { id: "educate", label: "Educate" },
    { id: "other", label: "Other (please specify)" }
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
  const [openAudio, setOpenAudio] = useState(false)

  // Function to close all accordions except the one being opened
  const handleAccordionToggle = (accordionName) => {
    setOpenPurpose(accordionName === 'purpose')
    setOpenContent(accordionName === 'content')
    setOpenStyle(accordionName === 'style')
    setOpenTechnical(accordionName === 'technical')
    setOpenAudio(accordionName === 'audio')
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
    { id: "inspiring", label: "Inspiring" },
    { id: "formal", label: "Formal" },
    { id: "other", label: "Other (please specify)" },
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
  const [brandLogos, setBrandLogos] = useState([]);
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
  const [descAspect, setDescAspect] = useState("");

  const optionsAspect = [
    { id: "16_9", label: "16:9 (Standard widescreen)" },
    { id: "1_1", label: "1:1 (Square, ideal for Instagram)" },
    { id: "9_16", label: "9:16 (Vertical, ideal for TikTok, Stories)" },
    { id: "4_5", label: "4:5 (Portrait, suitable for Instagram feeds)" },
    { id: "other", label: "Other (please specify)" },
  ];

  const handleSelectAspect = (id) => {
    setSelectedAspect(id);
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
  const { uploadBrandAssets, getBrandAssets } = useBrandAssets();
  const token = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : '';
  const [voiceFilesForUpload, setVoiceFilesForUpload] = useState([]);
  const [voiceSaveMsg, setVoiceSaveMsg] = useState('');
  const [isSavingBrandVoices, setIsSavingBrandVoices] = useState(false);

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
      if (s.selectedAspect) setSelectedAspect(s.selectedAspect);
      if (typeof s.otherAspectText === 'string') setOtherAspectText(s.otherAspectText);
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
        selectedDuration, descDuration, selectedFormat, otherFormatText, descFormat, selectedAspect, otherAspectText, descAspect,
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
    selectedDuration, descDuration, selectedFormat, otherFormatText, descFormat, selectedAspect, otherAspectText, descAspect,
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
                      {aud.id === "other" && selectedTone === "other" && (
                        <input
                          type="text"
                          value={otherTexttone}
                          onChange={(e) => setOtherTexttone(e.target.value)}
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
                          await uploadBrandAssets({ userId: token, files: { logos: [file] } });
                          const refreshed = await getBrandAssets(token);
                          const list = Array.isArray(refreshed?.logos) ? refreshed.logos : (Array.isArray(refreshed?.logo) ? refreshed.logo : []);
                          setBrandLogos(list);
                          const latest = list && list.length ? (typeof list[list.length-1] === 'string' ? list[list.length-1] : (list[list.length-1]?.url || '')) : '';
                          if (latest) setSelectedLogoUrl(latest);
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
              {optionsAspect.map((opt) => (
                <div key={opt.id} className="flex items-center gap-3">
                  <button
                    onClick={() => handleSelectAspect(opt.id)}
                    className={`w-6 h-6 rounded-md border flex items-center justify-center transition-colors
                  ${selectedAspect === opt.id
                        ? "bg-green-500 border-green-500"
                        : "bg-white border-gray-400"
                      }`}
                  >
                    {selectedAspect === opt.id && (
                      <FaCheck className="text-white text-sm" />
                    )}
                  </button>
                  <label
                    onClick={() => handleSelectAspect(opt.id)}
                    className="cursor-pointer"
                  >
                    {opt.label}
                  </label>

                  {opt.id === "other" && selectedAspect === "other" && (
                    <input
                      type="text"
                      value={otherAspectText}
                      onChange={(e) => setOtherAspectText(e.target.value)}
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
                       {Array.isArray(brandVoices) && brandVoices.length > 0 && brandVoices.map((v, i) => {
                         const url = typeof v === 'string' ? v : (v?.url || '');
                         const active = selectedVoiceFromLibrary === i;
                         return (
                           <div key={i} className="flex flex-col items-center gap-1">
                             <button
                               onMouseEnter={() => playBrandVoice(i, url)}
                               onMouseLeave={() => stopBrandVoice(i)}
                               onClick={() => setSelectedVoiceFromLibrary(i)}
                               className={`w-20 h-20 rounded-full flex items-center justify-center border transition-all ${active ? 'border-blue-600 ring-2 ring-blue-300 bg-blue-50' : 'border-gray-300 bg-white hover:bg-gray-50'}`}>
                               <FaMicrophone className={`${active ? 'text-blue-700' : 'text-gray-600'}`} />
                             </button>
                             <span className="text-xs text-gray-600">Voice {i+1}</span>
                           </div>
                         );
                       })}
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
            <button onClick={triggerFileUpload} className="w-16 h-16 rounded-full bg-gray-200 text-gray-600 hover:bg-gray-300 transition-all duration-200 flex items-center justify-center relative group" title="Upload new voice">
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
                  aspect_ratio: selectedAspect === 'other' ? otherAspectText : (selectedAspect || '')
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
              <button onClick={() => setIsVoiceModalOpen(false)} className="text-gray-500 hover:text-gray-700">✕</button>
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
                  multiple
                  className="hidden"
                  onChange={(e) => setVoiceFilesForUpload(Array.from(e.target.files || []))}
                />
                <button onClick={() => voiceModalFileInputRef.current && voiceModalFileInputRef.current.click()} className="px-3 py-2 rounded-md bg-gray-100 hover:bg-gray-200 text-sm">Choose Files</button>
                {voiceFilesForUpload && voiceFilesForUpload.length > 0 && (
                  <ul className="mt-2 text-xs text-gray-700 list-disc ml-5">
                    {voiceFilesForUpload.map((f, i) => (<li key={i}>{f.name}</li>))}
                  </ul>
                )}
              </div>
            )}
            <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={() => setIsVoiceModalOpen(false)} className="px-4 py-2 rounded-md bg-gray-100 hover:bg-gray-200" disabled={isSavingBrandVoices}>Cancel</button>
              <button
                onClick={async () => {
                  try {
                    setVoiceSaveMsg('');
                    setIsSavingBrandVoices(true);
                    const toMp3File = (blob, idx) => new File([blob], `recorded_${Date.now()}_${idx}.mp3`, { type: 'audio/mpeg' });
                    const filesFromBlobs = (pendingVoiceBlobs || []).map((b, i) => toMp3File(b, i));
                    const combined = [...(voiceFilesForUpload || []), ...filesFromBlobs];
                    if (combined.length === 0) { setVoiceSaveMsg('Please upload or record a voice first.'); return; }
                    await uploadBrandAssets({ userId: token, files: { voiceovers: combined } });
                    setVoiceFilesForUpload([]);
                    try { (pendingVoiceUrls || []).forEach(u => URL.revokeObjectURL(u)); } catch (_) {}
                    setPendingVoiceUrls([]); setPendingVoiceBlobs([]);
                    const refreshed = await getBrandAssets(token);
                    const list = Array.isArray(refreshed?.voiceovers) ? refreshed.voiceovers : (Array.isArray(refreshed?.voiceover) ? refreshed.voiceover : (refreshed?.voices || []));
                    setBrandVoices(list);
                    try {
                      const urls = list.map(v => (typeof v === 'string' ? v : (v?.url || ''))).filter(Boolean);
                      localStorage.setItem('brand_voiceover_urls', JSON.stringify(urls));
                    } catch (_) { /* noop */ }
                    setIsVoiceModalOpen(false);
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
