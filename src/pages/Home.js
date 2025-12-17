import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import Sidebar from '../Components/Sidebar'
import Typetabs from '../Components/Typetabs'
import Topbar from '../Components/Topbar'
import Chat from '../Components/Chat'
import ImageList from '../Components/Scenes/ImageList'
import VideosList from '../Components/Scenes/VideosList'
import FinalVideo from '../Components/Scenes/FinalVideo'
import ErrorBoundary from '../Components/ErrorBoundary'
import ScriptEditor from '../Components/ScriptEditor'
import Guidlines from '../Components/VideoGuidlines/Guidlines'
import DynamicQuestion from '../Components/DynamicQuestion'
import { selectToken, selectIsAuthenticated, selectUser } from '../redux/slices/userSlice'
import { useNavigate, useParams } from 'react-router-dom'

const wrapAdditional = (value) => {
  if (value && typeof value === 'object' && Object.keys(value).length > 0) {
    return { additionalProp1: value }
  }
  return { additionalProp1: {} }
}

const toAdditionalArray = (items) => {
  if (!Array.isArray(items) || items.length === 0) return [wrapAdditional({})]
  return items.map(item => {
    if (item && typeof item === 'object') return wrapAdditional(item)
    if (item != null) return wrapAdditional({ value: item })
    return wrapAdditional({})
  })
}

const mapToStringArray = (arr) => {
  if (!Array.isArray(arr)) return []
  return arr
    .map(item => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        return (
          item.name ||
          item.title ||
          item.url ||
          item.id ||
          item.link ||
          JSON.stringify(item)
        )
      }
      return item != null ? String(item) : ''
    })
    .filter(Boolean)
}

const mapVoiceoversToObjects = (arr = []) => {
  if (!Array.isArray(arr)) return []
  return arr
    .map(item => {
      if (!item || typeof item !== 'object') return null
      const url = item.url || item.audio_url || item.file || item.link || ''
      const name = item.name || item.voiceover_name || item.title || ''
      if (!url) return null
      return {
        url,
        name,
        type: item.type || item.voiceover_type || '',
        created_at: item.created_at || item.uploaded_at || item.timestamp || new Date().toISOString()
      }
    })
    .filter(Boolean)
}

const normalizeBrandIdentity = (bi = {}) => ({
  logo: Array.isArray(bi.logo) ? bi.logo : Array.isArray(bi.logos) ? bi.logos : [],
  fonts: Array.isArray(bi.fonts) ? bi.fonts : [],
  icons: Array.isArray(bi.icon) ? bi.icon : Array.isArray(bi.icons) ? bi.icons : [],
  colors: Array.isArray(bi.colors) ? bi.colors : [],
  spacing: bi.spacing || bi.spacing_scale || '',
  tagline: bi.tagline || ''
})

const deriveLastUserQuery = (messages = []) => {
  if (!Array.isArray(messages)) return ''
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    const entry = messages[i]
    const candidate = entry?.userquery || entry?.user_query || entry?.query || ''
    if (typeof candidate === 'string' && candidate.trim()) {
      return candidate
    }
  }
  return ''
}
// Brand step removed; DynamicQuestion is the final step

const Home = () => {
  const [userChat, setuserChat] = useState("")
  const [isDocFollowup, setIsDocFollowup] = useState(false)
  const [chatHistory, setChatHistory] = useState([]) // Chat history to preserve across steps
  const [currentStep, setCurrentStep] = useState(1) // 1: Chat, 2: Guidelines, 3: DynamicQuestion, 4: Scenes Images, 5: Videos, 6: ScriptEditor, 7: FinalVideo
  const [imagesJobId, setImagesJobId] = useState('');
  const [videosJobId, setVideosJobId] = useState('');
  const [mergeJobId, setMergeJobId] = useState('');
  const [showVideoPopup, setShowVideoPopup] = useState(false);
  const [showVideoTypeModal, setShowVideoTypeModal] = useState(false);
  const [isMerging, setIsMerging] = useState(false);
  const [hasImagesAvailable, setHasImagesAvailable] = useState(false);
  const [hasVideosAvailable, setHasVideosAvailable] = useState(false);
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false)
  const [questionnaireData, setQuestionnaireData] = useState(null)
  const [isChatLoading, setIsChatLoading] = useState(true)
  const [hasQuestionnaireAgent, setHasQuestionnaireAgent] = useState(false)
  const [latestQuestionnaireData, setLatestQuestionnaireData] = useState(null)
  const [showQuestionnaireOptions, setShowQuestionnaireOptions] = useState(false)
  const [scenesInitialData, setScenesInitialData] = useState(null)
  const [isCreatingSession, setIsCreatingSession] = useState(false)
  const [loadingVideoType, setLoadingVideoType] = useState(null) // Track which video type is being loaded

  // Redux selectors
  const token = useSelector(selectToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  const navigate = useNavigate();
  const { sessionId } = useParams();

  // Check user validation status
  const userStatus = (user?.status || user?.validation_status || '').toString().toLowerCase();
  const normalizedStatus = userStatus === 'non_validated' ? 'not_validated' : userStatus;
  const rawRole = (user?.role || user?.user_role || user?.type || user?.userType || '').toString().toLowerCase();
  const isAdmin = rawRole === 'admin';
  const isNonValidated = normalizedStatus === 'not_validated' || normalizedStatus === 'non_validated';

  // Map API session messages to chat UI format
  // Each message item represents a conversation turn with:
  // - m.userquery: string (user message)
  // - m.airesponse: object with .final_output (assistant message)
  const mapMessagesToChatHistory = (messages = []) => {
    try {
      // Normalize messages structure: sometimes it's nested or wrapped
      let msgs = messages;
      if (!Array.isArray(msgs)) return [];
      // If the first element is an array, unwrap it
      if (Array.isArray(msgs[0])) msgs = msgs[0];
      // If wrapped under an object key (e.g., { messages: [...] }), unwrap safely
      if (msgs.length === 0 && messages && typeof messages === 'object' && Array.isArray(messages.messages)) {
        msgs = messages.messages;
      }
      const out = [];
      let baseId = Date.now();
      for (const m of msgs) {
        const userQ = m?.userquery ?? m?.user_message ?? m?.query ?? '';
        // Skip questionnaire agent turns entirely
        if (typeof userQ === 'string' && userQ.trim().toLowerCase() === 'questionnaire agent') {
          continue;
        }

        const aiText = m?.airesponse?.final_output
          ?? m?.airesponse?.content
          ?? m?.assistant_message?.airesponse?.final_output
          ?? m?.assistant?.final_output
          ?? '';
        const tsUser = m?.user_timestamp || m?.timestamp || new Date().toISOString();
        const tsAi = m?.assistant_timestamp || m?.timestamp || new Date().toISOString();

        // If userquery is an object, treat as script turn → add only an AI script message (no auto-open)
        if (userQ && typeof userQ === 'object') {
          if (aiText && typeof aiText === 'object') {
            out.push({
              id: baseId++,
              type: 'ai',
              content: 'Your script is ready. You can view it or generate the video.',
              script: aiText,
              timestamp: tsAi
            });
          }
          continue;
        }

        const userText = userQ;
        if (userText) {
          out.push({ id: baseId++, type: 'user', content: userText, timestamp: tsUser });
        }
        if (aiText) {
          out.push({ id: baseId++, type: 'ai', content: aiText, timestamp: tsAi });
        }
      }
      return out;
    } catch (e) {
      console.error('Failed to map session messages:', e);
      return [];
    }
  };

  const addUserChat = async (chat) => {
    try {
      console.log('Adding user chat:', chat);
      const sessionId = localStorage.getItem('session_id');
      
      if (!sessionId || !token) {
        console.error('Missing session_id or token');
        return;
      }

      // Check if this should be a document follow-up chat
      const sidForFlag = localStorage.getItem('session_id') || sessionId || '';
      const isDocFollowupFromStorage = localStorage.getItem(sidForFlag ? `is_doc_followup:${sidForFlag}` : 'is_doc_followup') === 'true';
      const hasFirstMessageFlag = localStorage.getItem(sidForFlag ? `has_first_message:${sidForFlag}` : 'has_first_message') === 'true';
      
      let requestBody;

      // First message (hasn't been sent yet and not a doc follow-up): do NOT call user-session-data
      if (!hasSentFirstMessage && !hasFirstMessageFlag && !isDocFollowupFromStorage) {
        requestBody = {
          session: {
            session_id: sessionId,
            content: [],
            user_id: token,
            document_summary: [],
            videoduration: "60",
            created_at: new Date().toISOString(),
            totalsummary: [],
            messages: []
          },
          user_message: chat,
          enable_web_search: false,
          is_doc_followup: false
        };
      } else {
      // Follow-up messages: call user-session-data first and use its session_data
        try {
          console.log('Getting session data for follow-up message...');
          const sessionDataResponse = await sendUserSessionData();

          if (sessionDataResponse && sessionDataResponse.session_data) {
            const sessionData = sessionDataResponse.session_data;
            requestBody = {
              session: {
                session_id: sessionId,
                user_id: token,
                content: sessionData.content || [],
                document_summary: sessionData.document_summary || [],
                videoduration: (sessionData.video_duration?.toString?.() || "60"),
                created_at: sessionData.created_at || new Date().toISOString(),
                totalsummary: sessionData.total_summary || [],
                messages: sessionData.messages || []
              },
              user_message: chat,
              enable_web_search: !!isDocFollowupFromStorage,
              is_doc_followup: !!isDocFollowupFromStorage
            };
            console.log('Using session data for follow-up message:', requestBody);
          } else {
            console.warn('Session data not available, using fallback request body');
            requestBody = {
              session: {
                session_id: sessionId,
                content: [],
                user_id: token,
                document_summary: [],
                videoduration: "60",
                created_at: new Date().toISOString(),
                totalsummary: [],
                messages: []
              },
              user_message: chat,
              enable_web_search: !!isDocFollowupFromStorage,
              is_doc_followup: !!isDocFollowupFromStorage
            };
          }
        } catch (sessionError) {
          console.error('Error getting session data for follow-up:', sessionError);
          requestBody = {
            session: {
              session_id: sessionId,
              content: [],
              user_id: token,
              document_summary: [],
              videoduration: "60",
              created_at: new Date().toISOString(),
              totalsummary: [],
              messages: []
            },
            user_message: chat,
            enable_web_search: !!isDocFollowupFromStorage,
            is_doc_followup: !!isDocFollowupFromStorage
          };
        }
      }

      // Before sending, fetch user-session-data to determine videoType
      let videoType = 'hybrid';
      try {
        const usd = await sendUserSessionData();
        const sd = usd?.session_data || usd || {};
        videoType = sd?.videoType || localStorage.getItem(`video_type_value:${sessionId}`) || 'hybrid';
      } catch (_) { /* noop */ }

      const vt = String(videoType || '').toLowerCase();
      let chatEndpoint = 'hybrid_message';
      if (vt === 'infographic' || vt === 'infographics' || vt === 'inforgraphic') chatEndpoint = 'infographics_message';
      if (vt === 'financial') chatEndpoint = 'financial_message';
      if (vt === 'avatar based' || vt === 'avatar' || vt === 'avatars') chatEndpoint = 'Avatars_message';

      console.log('Sending chat request:', requestBody, 'videoType:', videoType, 'endpoint:', chatEndpoint);
      const response = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/chat/${chatEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const chatResponse = await response.json();
      console.log('Chat response received:', chatResponse);
      // Mark the session as having at least one message sent, regardless of doc follow-up
      if (!hasSentFirstMessage || !hasFirstMessageFlag) {
        setHasSentFirstMessage(true);
        try {
          const sid = localStorage.getItem('session_id') || sessionId || '';
          if (sid) localStorage.setItem(`has_first_message:${sid}`, 'true');
          else localStorage.setItem('has_first_message', 'true');
        } catch (_) { /* noop */ }
      }
      // For the very first non-doc message, attempt to set/update the session title once
      if (!hasFirstMessageFlag && !isDocFollowupFromStorage) {
        try { await maybeUpdateSessionTitle(sessionId); } catch (e) { /* noop */ }
      }
      
      // Reset the localStorage flag after sending a document follow-up chat
      if (isDocFollowupFromStorage) {
        console.log('Resetting is_doc_followup flag to FALSE after chat send.');
        const sid = localStorage.getItem('session_id') || sessionId || '';
        if (sid) localStorage.removeItem(`is_doc_followup:${sid}`); else localStorage.removeItem('is_doc_followup');
      }
      // Persist chat history per session after sending
      try {
        const sid = localStorage.getItem('session_id') || sessionId || '';
        if (sid) localStorage.setItem(`chat_history:${sid}`, JSON.stringify(chatHistory));
      } catch (_) { /* noop */ }
      return chatResponse;
    } catch (error) {
      console.error('Error adding user chat:', error);
      throw error;
    }
  }

  // Function to send user session data when chat length > 2
  const sendUserSessionData = async () => {
    try {
      console.log('Sending user session data...');
      
      const sessionId = localStorage.getItem('session_id');
      
      if (!sessionId || !token) {
        console.error('Missing session_id or token');
        return;
      }
      
      // Prepare the request body
      const requestBody = {
        user_id: token,
        session_id: sessionId
      };
      
      console.log('Sending user session data request:', requestBody);
      
      // Call the user session data API
      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const sessionDataResponse = await response.json();
      console.log('User session data sent successfully:', sessionDataResponse);

      try {
        const sd = sessionDataResponse?.session_data || {};
        const imgs = Array.isArray(sd?.images) ? sd.images : [];
        const vids = Array.isArray(sd?.videos) ? sd.videos : [];
        setHasImagesAvailable(imgs.length > 0);
        setHasVideosAvailable(vids.length > 0);
        try { localStorage.setItem('has_images_available', imgs.length > 0 ? 'true' : 'false'); } catch(_){}
        try { localStorage.setItem('has_videos_available', vids.length > 0 ? 'true' : 'false'); } catch(_){}
      } catch(_) { /* noop */ }

      return sessionDataResponse;
      
    } catch (error) {
      console.error('Error sending user session data:', error);
      throw error;
    }
  };

  // Fire sessions/title to generate/update a title (once per session unless forced)
  const maybeUpdateSessionTitle = async (sid) => {
    try {
      const sessionId = sid || localStorage.getItem('session_id');
      const userId = token || localStorage.getItem('token');
      if (!sessionId || !userId) return;
      const key = `session_title_updated:${sessionId}`;
      if (localStorage.getItem(key) === 'true') return;

      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/title', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ session_id: sessionId, user_id: userId })
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`sessions/title failed: ${resp.status} ${text}`);
      if (data && (data.title || data.updated)) {
        try { localStorage.setItem(key, 'true'); } catch (_) { /* noop */ }
        try { window.dispatchEvent(new CustomEvent('session-title-updated', { detail: { sessionId, title: data.title } })); } catch (_) { /* noop */ }
      }
    } catch (e) {
      console.warn('Unable to update session title:', e);
    }
  };

  // Auto-set video type to 'hybrid' for new sessions (no popup)
  useEffect(() => {
    (async () => {
      try {
        const sid = sessionId || localStorage.getItem('session_id');
        if (!sid) return;
        const key = `video_type_set:${sid}`;
        if (localStorage.getItem(key) === 'true') return;
        await updateVideoType('hybrid');
        try {
          localStorage.setItem(key, 'true');
          localStorage.setItem(`video_type_value:${sid}`, 'hybrid');
        } catch (_) { /* noop */ }
        setShowVideoTypeModal(false);
      } catch (_) { /* noop */ }
    })();
  }, [sessionId]);

  const updateVideoType = async (videoType) => {
    try {
      const userId = token || localStorage.getItem('token');
      const sid = sessionId || localStorage.getItem('session_id');
      if (!userId || !sid) return;
      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/video-type/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: userId, session_id: sid, videoType })
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`video-type/update failed: ${resp.status} ${text}`);
      try { localStorage.setItem(`video_type_set:${sid}`, 'true'); } catch (_) { /* noop */ }
      setShowVideoTypeModal(false);
      return data;
    } catch (e) {
      console.error('Failed updating video type', e);
      alert('Failed to set video type. Please try again.');
    }
  };

  // Function to start video generation flow
  const startVideoGeneration = async () => {
    try {
      console.log('Starting video generation flow...');
      // Notify listeners that questionnaire generation started
      try {
        window.dispatchEvent(new CustomEvent('questionnaire-generating', { detail: { isGenerating: true } }));
      } catch (e) { /* noop */ }
      // Mark questionnaire mode so Chat shows the two-button options when returning
      try {
        setHasQuestionnaireAgent(true);
        setShowQuestionnaireOptions(true);
        const sid = localStorage.getItem('session_id');
        if (sid) localStorage.setItem(`has_questionnaire_agent:${sid}`, 'true');
      } catch (_) { /* noop */ }
      
      const sessionId = localStorage.getItem('session_id');
      
      if (!sessionId || !token) {
        console.error('Missing session_id or token');
        return;
      }

      // Build a full session object for the request
      let requestBody;
      try {
        console.log('Fetching full session data before questionnaire generation...');
        const sessionDataResponse = await sendUserSessionData();
        if (sessionDataResponse && sessionDataResponse.session_data) {
          const sessionData = sessionDataResponse.session_data;
          requestBody = {
            session: {
              session_id: sessionId,
              user_id: token,
              content: sessionData.content || [],
              document_summary: sessionData.document_summary || [],
              videoduration: (sessionData.video_duration?.toString?.() || "60"),
              created_at: sessionData.created_at || new Date().toISOString(),
              totalsummary: sessionData.total_summary || [],
              messages: sessionData.messages || []
            }
          };
          console.log('Full session object prepared for questionnaire:', requestBody);
        } else {
          console.warn('Session data not available, using minimal session object');
          requestBody = {
            session: {
              session_id: sessionId,
              user_id: token,
              content: [],
              document_summary: [],
              videoduration: "60",
              created_at: new Date().toISOString(),
              totalsummary: [],
              messages: []
            }
          };
        }
      } catch (sessionError) {
        console.error('Error fetching session data, using fallback session object:', sessionError);
        requestBody = {
          session: {
            session_id: sessionId,
            user_id: token,
            content: [],
            document_summary: [],
            videoduration: "60",
            created_at: new Date().toISOString(),
            totalsummary: [],
            messages: []
          }
        };
      }

      // Determine video type to pick correct questionnaire generate endpoint
      let qVideoType = 'hybrid';
      let latestSessionData = null;
      try {
        const usd = await sendUserSessionData();
        const sd = usd?.session_data || usd || {};
        latestSessionData = sd;
        qVideoType = sd?.videoType || localStorage.getItem(`video_type_value:${sessionId}`) || 'hybrid';
      } catch (_) { /* noop */ }
      const qvt = String(qVideoType || '').toLowerCase();
      // Validation: ensure a videoType is selected before generating
      if (!qVideoType) {
        alert('Please select a video type before generating the questionnaire.');
        try { window.dispatchEvent(new CustomEvent('questionnaire-generating', { detail: { isGenerating: false } })); } catch (_) {}
        return;
      }
      // Always use questionnaire endpoints per video type
      let qEndpoint = 'scripts/hybrid/questionnaire/generate';
      if (qvt === 'infographic' || qvt === 'infographics' || qvt === 'inforgraphic') qEndpoint = 'scripts/infographic/questionnaire/generate';
      if (qvt === 'financial') qEndpoint = 'scripts/finanical/questionnaire/generate';
      if (qvt === 'avatar' || qvt === 'avatars' || qvt === 'avatar based') qEndpoint = 'scripts/avatar/questionnaire/generate';
      if (qvt === 'hybrid') qEndpoint = 'scripts/hybrid/questionnaire/generate';

      // Build payload per new schema: { user: {...}, session: {...} }
      let userMeta = {};
      try { userMeta = JSON.parse(localStorage.getItem('user') || '{}') || {}; } catch (_) { userMeta = {}; }
      const userIdForAssets = token || localStorage.getItem('token') || '';
      let brandAssets = {};
      try { brandAssets = JSON.parse(localStorage.getItem(`brand_assets_analysis:${userIdForAssets}`) || '{}') || {}; } catch (_) { brandAssets = {}; }
      const bi = brandAssets?.brand_identity || {};
      const tv = brandAssets?.tone_and_voice || {};
      const lf = brandAssets?.look_and_feel || {};
      const templatesArr = brandAssets?.template || brandAssets?.templates || [];
      const voiceoverArr = brandAssets?.voiceover || [];

      const normalizedBI = normalizeBrandIdentity(bi || {});
      const normalizedTone = {
        context: tv?.context || '',
        brand_personality: Array.isArray(tv?.brand_personality) ? tv.brand_personality : [],
        communication_style_pace: Array.isArray(tv?.communication_style_pace) ? tv.communication_style_pace : []
      };
      const normalizedLook = {
        iconography: Array.isArray(lf?.iconography) ? lf.iconography : [],
        graphic_elements: Array.isArray(lf?.graphic_elements) ? lf.graphic_elements : [],
        aesthetic_consistency: Array.isArray(lf?.aesthetic_consistency) ? lf.aesthetic_consistency : []
      };
      const templatesList = mapToStringArray(templatesArr);
      const voiceoverList = mapVoiceoversToObjects(voiceoverArr);

      const userPayload = {
        id: userMeta?.id || userIdForAssets || '',
        email: userMeta?.email || '',
        display_name: userMeta?.display_name || userMeta?.name || '',
        created_at: userMeta?.created_at || new Date().toISOString(),
        avatar_url: userMeta?.avatar_url || '',
        folder_url: brandAssets?.folder_url || '',
        brand_identity: wrapAdditional(normalizedBI),
        tone_and_voice: wrapAdditional(normalizedTone),
        look_and_feel: wrapAdditional(normalizedLook),
        templates: templatesList,
        voiceover: voiceoverList
      };

      const resolvedVideoDuration = latestSessionData?.video_duration != null
        ? String(latestSessionData.video_duration)
        : '60';
      const resolvedVideoTone = latestSessionData?.video_tone || latestSessionData?.videoTone || 'professional';
      const sessionPayload = {
        session_id: sessionId,
        user_id: token,
        title: latestSessionData?.title ?? '',
        video_duration: resolvedVideoDuration,
        created_at: latestSessionData?.created_at || new Date().toISOString(),
        updated_at: latestSessionData?.updated_at || new Date().toISOString(),
        document_summary: toAdditionalArray(latestSessionData?.document_summary),
        messages: toAdditionalArray(latestSessionData?.messages),
        total_summary: mapToStringArray(latestSessionData?.total_summary || latestSessionData?.totalsummary),
        scripts: mapToStringArray(latestSessionData?.scripts),
        videos: toAdditionalArray(latestSessionData?.videos),
        images: mapToStringArray(latestSessionData?.images),
        final_link: latestSessionData?.final_link || '',
        videoType: latestSessionData?.videoType || qVideoType || '',
        brand_style_interpretation: wrapAdditional(latestSessionData?.brand_style_interpretation || {}),
        additionalProp1: wrapAdditional({})
      };

      // Add presenter option from Guidelines if available and include in additional instructions
      let presenterOpt = null;
      try {
        const raw = (sessionId && localStorage.getItem(`presenter_option:${sessionId}`)) || localStorage.getItem('presenter_option');
        if (raw) presenterOpt = JSON.parse(raw);
      } catch (_) { /* noop */ }
      const additionalInstructionsPayload = {};
      const questionnairePayload = {
        user: userPayload,
        session: sessionPayload,
        video_length: Number(resolvedVideoDuration) || 60,
        video_tone: resolvedVideoTone,
        user_query: '',
        additional_instructions: ''
      };

      // Call the questionnaire generate API with new payload
      const response = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/${qEndpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(questionnairePayload)
      });
      
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const questionnaireResponse = await response.json();
      console.log('Questionnaire generated successfully:', questionnaireResponse);
      try {
        setQuestionnaireData(questionnaireResponse);
        setLatestQuestionnaireData(questionnaireResponse);
      } catch (e) {
        console.warn('Failed to store questionnaire data:', e);
      }
      
      // Move to step 2 (Guidelines)
      console.log('Setting currentStep to 2 (Guidelines)');
      setCurrentStep(2);
      
      return questionnaireResponse;
      
    } catch (error) {
      console.error('Error generating questionnaire:', error);
      // Still move to step 2 even if API fails
      console.log('Setting currentStep to 2 (Guidelines) - even after error');
      setCurrentStep(2);
    } finally {
      // Notify listeners that questionnaire generation finished
      try {
        window.dispatchEvent(new CustomEvent('questionnaire-generating', { detail: { isGenerating: false } }));
      } catch (e) { /* noop */ }
    }
  };

  // Generate final merged video from Home's Videos section
  const handleGenerateVideoMerge = async () => {
    try {
      const token = localStorage.getItem('token');
      const sessionId = localStorage.getItem('session_id');
      if (!token || !sessionId) { alert('Missing login or session. Please sign in again.'); return; }

      setIsMerging(true);
      setShowVideoPopup(false);

      // 1) Fetch session data
      const sessionResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
      });
      const sessionText = await sessionResp.text();
      let sessionData; try { sessionData = JSON.parse(sessionText); } catch (_) { sessionData = sessionText; }
      if (!sessionResp.ok) throw new Error(`user-session/data failed: ${sessionResp.status} ${sessionText}`);
      const sd = sessionData?.session_data || {};

      // 2) Build merge payload
      const sessionForBody = {
        id: sd.session_id || sessionId,
        user_id: token,
        title: sd.title || sd.session_title || 'My Video',
        videoduration: (sd.video_duration?.toString?.() || '60'),
        created_at: sd.created_at || new Date().toISOString(),
        updated_at: sd.updated_at || new Date().toISOString(),
        document_summary: sd.document_summary || sd.summarydocument || [],
        messages: sd.messages || [],
        content: sd.content || [],
        total_summary: sd.total_summary || [],
        scripts: Array.isArray(sd.scripts) ? sd.scripts : [],
        videos: sd.videos || [],
        images: sd.images || [],
      };

      const body = { session: sessionForBody };
      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/merge', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`videos/merge failed: ${resp.status} ${text}`);

      const jobId = data?.job_id || data?.jobId || data?.id;
      const statusUrl = data?.status_url || null;
      const status = data?.status || 'queued';
      if (jobId) {
        try { localStorage.setItem('current_video_job_id', jobId); } catch (_) { /* noop */ }
        try { if (statusUrl) localStorage.setItem('current_video_job_status_url', statusUrl); } catch (_) { /* noop */ }
        try { localStorage.setItem('current_video_job_type', 'merge'); } catch (_) { /* noop */ }
        try { localStorage.setItem('job_status', status); } catch (_) { /* legacy */ }
      }

      // Immediately redirect to /media to follow merge job polling
      setScenesInitialData(null);
      setIsMerging(false);
      try { window.location && (window.location.href = '/media'); } catch (_) { /* noop */ }
    } catch (e) {
      setIsMerging(false);
      setShowVideoPopup(false);
      alert(e?.message || 'Failed to start video merge');
    }
  };

  // Handle video type tab change: create new session, then set selected type
  const handleVideoTypeTabChange = async (label) => {
    try {
      setIsCreatingSession(true);
      // Set loading video type for display in loader
      setLoadingVideoType(label);
      try { localStorage.setItem('is_creating_session', 'true'); } catch(_){}
      const userId = token || localStorage.getItem('token');
      if (!userId) { 
        setLoadingVideoType(null);
        setIsCreatingSession(false);
        navigate('/login'); 
        return; 
      }
      // 1) Create a new session
      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/new', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId })
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`sessions/new failed: ${resp.status} ${text}`);
      const newId = data?.session?.session_id || data?.session_id || data?.id;
      if (!newId) throw new Error('Session ID missing in response');
      try { localStorage.setItem('session_id', newId); } catch (_) { /* noop */ }

      // 2) Map label to API videoType (fix mapping to match Typetabs labels)
      const map = {
        'Hybrid Reel': 'hybrid',
        'Infographics Reel': 'infographic',
        'Financial Reel': 'financial',
        'Avatar Reel': 'avatar',
        'Hybrid Video': 'hybrid', // Legacy support
        'Infographics Video': 'infographic', // Legacy support
        'Financial Video': 'financial', // Legacy support
        'Avatar Video': 'avatar' // Legacy support
      };
      const videoType = map[label] || 'hybrid';

      // 3) Update video type for new session
      try {
        await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/video-type/update', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userId, session_id: newId, videoType })
        });
        try {
          localStorage.setItem(`video_type_set:${newId}`, 'true');
          localStorage.setItem(`video_type_value:${newId}`, videoType);
        } catch (_) { /* noop */ }
      } catch (_) { /* noop */ }

      // 4) Navigate to new chat
      navigate(`/chat/${newId}`);
    } catch (e) {
      console.error('Failed changing video type:', e);
      alert('Unable to switch video type. Please try again.');
      setLoadingVideoType(null);
      setIsCreatingSession(false);
      try { localStorage.removeItem('is_creating_session'); } catch(_){}
    }
  };

  // Reflect creating flag from localStorage while loading or after navigation
  useEffect(() => {
    try {
      const flag = localStorage.getItem('is_creating_session') === 'true';
      setIsCreatingSession(flag);
      // Clear loading video type after session is loaded
      if (!flag && loadingVideoType) {
        setLoadingVideoType(null);
      }
    } catch(_){}
  }, [sessionId, loadingVideoType]);

  // Function to move from Guidelines to Questionnaire
  const goToNextStep = () => {
    console.log('Moving from Guidelines to Questionnaire...');
    setCurrentStep(3);
  };

  // Function to handle next step after questionnaire
  const handleQuestionnaireNext = (answers) => {
    console.log('Questionnaire completed with answers:', answers);
    // DynamicQuestion is the last step now; stay on step 3 or handle completion here.
  };

  // Function to go back to previous step
  const goToPreviousStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  // Function to go back to chat (step 1)
  const goToChat = () => {
    console.log('Going back to chat...');
    console.log('Setting currentStep to 1 (Chat)');
    setCurrentStep(1);
    // Chat history is preserved, don't clear it
    try {
      const sid = localStorage.getItem('session_id');
      const persisted = sid && localStorage.getItem(`has_questionnaire_agent:${sid}`) === 'true';
      setShowQuestionnaireOptions(!!hasQuestionnaireAgent || !!persisted);
    } catch (_) {
      setShowQuestionnaireOptions(!!hasQuestionnaireAgent);
    }
  };

  useEffect(() => {
    // Make functions available globally for the components
    window.startVideoGeneration = startVideoGeneration;
    window.goToNextStep = goToNextStep;
    window.goToChat = goToChat;
    // Allow components to append an AI message with script to the chat
    window.addAiMessageToChat = (scriptData) => {
      try {
        const aiMessage = {
          id: Date.now(),
          type: 'ai',
          content: 'Your script is ready. You can view it or generate the video.',
          script: scriptData,
          timestamp: new Date().toISOString()
        };
        setChatHistory(prev => {
          const next = [...prev, aiMessage];
          try { localStorage.setItem('chat_history', JSON.stringify(next)); } catch (_) { /* noop */ }
          return next;
        });
      } catch (e) { /* noop */ }
    };
    // Allow Chat component to flag next chat as doc follow-up
    window.markDocFollowup = () => {
      try {
        console.log('isDocFollowup will be set to TRUE' , isDocFollowup);
        setIsDocFollowup(true);
      } catch (e) { /* noop */ }
    };
    
    // Cleanup function
    return () => {
      delete window.startVideoGeneration;
      delete window.goToNextStep;
      delete window.goToChat;
      delete window.addAiMessageToChat;
      delete window.markDocFollowup;
    };
  }, [isAuthenticated, token]);

  // Load session data when sessionId in URL changes
  useEffect(() => {
    const loadSessionFromUrl = async () => {
      if (!sessionId) { setIsChatLoading(false); return; }
      try {
        setIsChatLoading(true);
        // Reset view to Chat by default on session change to avoid stale media views
        setCurrentStep(1);
        setImagesJobId('');
        setVideosJobId('');
        setShowVideoPopup(false);
        if (!token) {
          alert('You are not authenticated. Please login again.');
          navigate('/login');
          return;
        }
        // Persist for parts of the app that still read localStorage
        localStorage.setItem('session_id', sessionId);
        // Clean up any stale localStorage from other sessions
        try {
          const prefixes = [
            'last_generated_script',
            'updated_script_structure',
            'original_script_hash',
            'reordered_script_rows',
            'has_generated_script',
            'chat_history',
            'is_doc_followup',
            'last_opened_script_hash',
            'scene_ref_images',
            'job_id',
            'job_status',
            'job_result',
          ];
          for (let i = localStorage.length - 1; i >= 0; i--) {
            const k = localStorage.key(i);
            if (!k) continue;
            const match = prefixes.find(p => k === p || k.startsWith(p + ':'));
            if (match) {
              // remove keys that are not for the current session
              if (!k.endsWith(':' + sessionId) && k.includes(':')) localStorage.removeItem(k);
              // also remove legacy unscoped keys
              if (k === match) localStorage.removeItem(k);
            }
          }
        } catch (_) { /* noop */ }

        // Fetch session data
        const body = { user_id: token, session_id: sessionId };
        const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body)
        });
        if (!resp.ok) {
          const text = await resp.text();
          throw new Error(`Failed to load session: ${resp.status} ${text}`);
        }
        const data = await resp.json();
        const s = data?.session_data || {};
        // set availability flags
        try {
          const imgs = Array.isArray(s?.images) ? s.images : [];
          const vids = Array.isArray(s?.videos) ? s.videos : [];
          setHasImagesAvailable(imgs.length > 0);
          setHasVideosAvailable(vids.length > 0);
          localStorage.setItem('has_images_available', imgs.length > 0 ? 'true' : 'false');
          localStorage.setItem('has_videos_available', vids.length > 0 ? 'true' : 'false');
        } catch(_){}
        const msgs = Array.isArray(s?.messages) ? s.messages : [];
        // Detect presence of questionnaire agent and capture latest questionnaire content
        try {
          const qaTurns = msgs.filter(m => {
            const uq = m?.userquery ?? m?.user_message ?? m?.query;
            return typeof uq === 'string' && uq.trim().toLowerCase() === 'questionnaire agent';
          });
          setHasQuestionnaireAgent(qaTurns.length > 0);
          setShowQuestionnaireOptions(qaTurns.length > 0);
          if (qaTurns.length > 0) {
            const last = qaTurns[qaTurns.length - 1];
            const qaData = last?.airesponse?.final_output
              ?? last?.airesponse
              ?? last?.assistant_message?.airesponse?.final_output
              ?? null;
            setLatestQuestionnaireData(qaData || null);
          } else {
            setLatestQuestionnaireData(null);
          }
        } catch (_) { setHasQuestionnaireAgent(false); setLatestQuestionnaireData(null); setShowQuestionnaireOptions(false); }

        // Respect persisted flag in case backend messages don't include questionnaire agent yet
        try {
          const persisted = localStorage.getItem(`has_questionnaire_agent:${sessionId}`) === 'true';
          if (persisted) {
            setHasQuestionnaireAgent(true);
            setShowQuestionnaireOptions(true);
          }
        } catch (_) { /* noop */ }

        let history = mapMessagesToChatHistory(msgs);
        // Fallback: try session-scoped cached history if mapping produced nothing
        try {
          const sid = sessionId || localStorage.getItem('session_id');
          if (history.length === 0 && sid) {
            const cached = localStorage.getItem(`chat_history:${sid}`);
            if (cached) {
              const parsed = JSON.parse(cached);
              if (Array.isArray(parsed)) history = parsed;
            }
          }
        } catch (_) { /* noop */ }
        try {
          // If no script message is present in chat history yet, check session scripts
          const hasScriptMsg = history.some(m => !!m.script);
          if (!hasScriptMsg) {
            let scriptObj = null;
            // Prefer session_data.scripts if available
            if (Array.isArray(s?.scripts) && s.scripts.length > 0) {
              const first = s.scripts[0];
              if (Array.isArray(first?.airesponse)) {
                scriptObj = { script: first.airesponse };
              } else if (Array.isArray(first)) {
                scriptObj = { script: first };
              } else if (first && typeof first === 'object') {
                scriptObj = first;
              }
            }
            // Fallback to locally persisted script structure
            if (!scriptObj) {
              const sid = sessionId || localStorage.getItem('session_id');
              let raw = sid ? localStorage.getItem(`updated_script_structure:${sid}`) : null;
              if (!raw && sid) raw = localStorage.getItem(`last_generated_script:${sid}`);
              if (raw) {
                try { scriptObj = JSON.parse(raw); } catch (_) { scriptObj = null; }
              }
            }
            // If we found a script, append an AI message so UI stays in generated state
            if (scriptObj) {
              const now = new Date().toISOString();
              history = [
                ...history,
                {
                  id: Date.now(),
                  type: 'ai',
                  content: 'Your script is ready. You can view it or generate the video.',
                  script: scriptObj,
                  timestamp: now,
                },
              ];
              try {
                const sid = sessionId || localStorage.getItem('session_id');
                if (sid) {
                  localStorage.setItem(`last_generated_script:${sid}`, JSON.stringify(scriptObj));
                  localStorage.setItem(`has_generated_script:${sid}`, 'true');
                }
                // Clean legacy non-scoped keys
                localStorage.removeItem('last_generated_script');
                localStorage.removeItem('has_generated_script');
              } catch (_) { /* noop */ }
            }
          }
        } catch (_) { /* noop */ }

        // Validation: if session has videos -> show VideosList; else if has images -> show ImageList; else show Chat
        try {
          if (Array.isArray(s?.videos) && s.videos.length > 0) {
            const urls = [];
            s.videos.forEach(vobj => {
              const scenesArr = Array.isArray(vobj?.scenes) ? vobj.scenes : [];
              scenesArr.forEach(sc => {
                const v = sc?.blobLink?.video_link;
                if (typeof v === 'string' && v) urls.push(v);
              });
            });
            if (urls.length > 0) {
              try { localStorage.setItem('prefetched_video_urls', JSON.stringify(Array.from(new Set(urls)))); } catch(_){}
            }
            setVideosJobId(localStorage.getItem('current_video_job_id') || '');
            setCurrentStep(5);
            setIsChatLoading(false);
            return;
          }
        } catch(_) { /* noop */ }

        try {
          if (Array.isArray(s?.images) && s.images.length > 0) {
            try { localStorage.setItem('prefetched_images_urls', JSON.stringify(s.images)); } catch(_){}
            setImagesJobId(localStorage.getItem('current_images_job_id') || '');
            setCurrentStep(4);
            setIsChatLoading(false);
            return;
          }
        } catch(_) { /* noop */ }

        // No images/videos present → ensure Chat is shown
        setCurrentStep(1);
        setChatHistory(history);
        // Persist session-scoped chat history for reloads
        try {
          const sid = sessionId || localStorage.getItem('session_id');
          if (sid) localStorage.setItem(`chat_history:${sid}`, JSON.stringify(history));
        } catch (_) { /* noop */ }
        // Consider a first message sent if there's any user turn present
        setHasSentFirstMessage(history.some(h => h.type === 'user'));

        // No auto-opening of script modal on load
        // Clear video type loading state after session loads successfully
        try {
          localStorage.removeItem('is_creating_session');
          setIsCreatingSession(false);
          setLoadingVideoType(null);
        } catch (_) { /* noop */ }
      } catch (e) {
        console.error('Error loading session:', e);
        alert('Unable to load chat session. Starting over.');
        navigate('/');
        // Clear loading state on error
        try {
          localStorage.removeItem('is_creating_session');
          setIsCreatingSession(false);
          setLoadingVideoType(null);
        } catch (_) { /* noop */ }
      } finally {
        setIsChatLoading(false);
      }
    };
    loadSessionFromUrl();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId, token]);

  // Chat history is now preserved through all steps including step 4
  // useEffect(() => {
  //   if (currentStep === 4) {
  //     console.log('Reached step 4 (BrandArea) - clearing chat history');
  //     setChatHistory([]);
  //     setuserChat("");
  //   }
  // }, [currentStep]);
  
  return (
    <div className='flex h-screen bg-[#E5E2FF] relative'>
      {showVideoTypeModal && (
        <div className='absolute inset-0 z-50 flex items-center justify-center bg-black/50'>
          <div className='bg-white rounded-2xl p-6 w-full max-w-md shadow-lg'>
            <h3 className='text-lg font-semibold mb-4'>Select Video Type</h3>
            <p className='text-sm text-gray-600 mb-4'>Choose a format for this reel.</p>
            <div className='grid grid-cols-2 gap-3'>
              <button onClick={() => updateVideoType('hybrid')} className='px-3 py-2 border rounded-lg hover:bg-gray-50 text-left'>
                <div className='font-medium'>Hybrid</div>
                <div className='text-xs text-gray-500'>Mix of live/graphics</div>
              </button>
              <button disabled className='px-3 py-2 border rounded-lg text-left bg-gray-100 text-gray-400 cursor-not-allowed'>
                <div className='font-medium'>Avatar Based</div>
                <div className='text-xs text-gray-400'>AI avatar presenter (disabled)</div>
              </button>
              <button onClick={() => updateVideoType('infographic')} className='px-3 py-2 border rounded-lg hover:bg-gray-50 text-left'>
                <div className='font-medium'>Infographic</div>
                <div className='text-xs text-gray-500'>Data-driven visuals</div>
              </button>
              <button onClick={() => updateVideoType('financial')} className='px-3 py-2 border rounded-lg hover:bg-gray-50 text-left'>
                <div className='font-medium'>Financial</div>
                <div className='text-xs text-gray-500'>Markets and metrics</div>
              </button>
            </div>
            <div className='mt-4 flex justify-end'>
              <button
                onClick={async () => {
                  try {
                    await updateVideoType('hybrid');
                  } catch (_) {
                    // If API fails, still default locally to hybrid for the session
                    try {
                      const sid = sessionId || localStorage.getItem('session_id');
                      if (sid) localStorage.setItem(`video_type_set:${sid}`, 'true');
                      if (sid) localStorage.setItem(`video_type_value:${sid}`, 'hybrid');
                    } catch (_) { /* noop */ }
                    setShowVideoTypeModal(false);
                  }
                }}
                className='text-sm text-gray-600 hover:underline'
              >
                Skip for now
              </button>
            </div>
          </div>
        </div>
      )}
      <Sidebar/>
      <div className="flex-1 mx-[2rem] mt-[1rem] overflow-x-hidden min-w-0">
        {isNonValidated && !isAdmin ? (
          // Show trial ended message for non-validated users
          <div className="flex items-center justify-center h-[85vh]">
            <div className="text-center">
              <div className="mx-auto w-20 h-20 bg-red-100 rounded-full flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h2 className="text-3xl font-semibold text-gray-900 mb-3">Your Free Trial is Ended</h2>
              <p className="text-lg text-gray-600">
                Please contact support to continue using the service.
              </p>
            </div>
          </div>
        ) : (
          <>
            <Topbar/>
            <Typetabs onChangeVideoType={handleVideoTypeTabChange} />
            {/* Step-based component rendering */}
            <div className='overflow-y-auto overflow-x-hidden  mt-2 scrollbar-hide'>
          {/* Debug info - remove this later */}
          {/* <div className="mb-2 text-sm text-gray-500">Current Step: {currentStep} | Chat Messages: {chatHistory.length}</div> */}
         {/* <Typetabs /> */}
          {currentStep === 1 && (
            <>
            
              <ErrorBoundary>
                <Chat
                  addUserChat={addUserChat} 
                  userChat={userChat} 
                  setuserChat={setuserChat} 
                  sendUserSessionData={sendUserSessionData}
                  chatHistory={chatHistory}
                  setChatHistory={setChatHistory}
                  isChatLoading={isChatLoading}
                  showQuestionnaireOptions={showQuestionnaireOptions}
                  onGoToQuestionnaire={() => {
                    if (latestQuestionnaireData) {
                      try { setQuestionnaireData(latestQuestionnaireData); } catch (_) { /* noop */ }
                    }
                    setCurrentStep(3);
                  }}
                  onRegenerateScene={() => {
                    try { window.startVideoGeneration && window.startVideoGeneration(); } catch (_) { /* noop */ }
                  }}
                  onOpenImagesList={async (jobId) => { try { setImagesJobId(jobId || ''); await sendUserSessionData(); } catch(_){}; setCurrentStep(4); }}
                  imagesAvailable={hasImagesAvailable}
                  onGoToScenes={(scriptContainer) => { setScenesInitialData(scriptContainer || null); setCurrentStep(6); }}
                  isSwitchingVideoType={isCreatingSession}
                  loadingVideoType={loadingVideoType}
                  key="chat-component"
                />
              </ErrorBoundary>
            </>
          )}
          {currentStep === 6 && (
            <ScriptEditor
              title="The Generated Script is:"
              initialScenes={scenesInitialData}
              onBack={() => { setCurrentStep(1); setScenesInitialData(null); }}
              onGenerateImages={async () => { try { await sendUserSessionData(); } catch(_){} setCurrentStep(4); }}
              // passthrough
              addUserChat={addUserChat}
              userChat={userChat}
              setuserChat={setuserChat}
              sendUserSessionData={sendUserSessionData}
              chatHistory={chatHistory}
              setChatHistory={setChatHistory}
              imagesAvailable={hasImagesAvailable}
              onOpenImagesList={async (jobId) => { try { setImagesJobId(jobId || ''); await sendUserSessionData(); } catch(_){}; setCurrentStep(4); }}
            />
          )}
          {currentStep === 2 && (
            <div>
              <Guidlines />
            </div>
          )}
          {currentStep === 3 && (
            <div>
              <DynamicQuestion 
                questionsData={questionnaireData}
                onNextStep={handleQuestionnaireNext}
                onPreviousStep={goToPreviousStep}
              />
            </div>
          )}
          {currentStep === 4 && (
            <div className='bg-white rounded-lg'>
              <ImageList
                jobId={imagesJobId}
                hasVideos={hasVideosAvailable}
                onGoToVideos={() => setCurrentStep(5)}
                onClose={async () => {
                  try {
                    const sessionDataResponse = await sendUserSessionData();
                    const s = sessionDataResponse?.session_data || {};
                    const msgs = Array.isArray(s?.messages) ? s.messages : [];
                    // Map messages to chat history
                    let history = mapMessagesToChatHistory(msgs);
                    // If no script message present in chat history yet, check session scripts
                    try {
                      const hasScriptMsg = history.some(m => !!m.script);
                      if (!hasScriptMsg) {
                        let scriptObj = null;
                        if (Array.isArray(s?.scripts) && s.scripts.length > 0) {
                          const first = s.scripts[0];
                          if (Array.isArray(first?.airesponse)) {
                            scriptObj = { script: first.airesponse };
                          } else if (Array.isArray(first)) {
                            scriptObj = { script: first };
                          } else if (first && typeof first === 'object') {
                            scriptObj = first;
                          }
                        }
                        if (!scriptObj) {
                          const sid = localStorage.getItem('session_id');
                          let raw = sid ? localStorage.getItem(`updated_script_structure:${sid}`) : null;
                          if (!raw && sid) raw = localStorage.getItem(`last_generated_script:${sid}`);
                          if (raw) {
                            try { scriptObj = JSON.parse(raw); } catch (_) { scriptObj = null; }
                          }
                        }
                        if (scriptObj) {
                          const now = new Date().toISOString();
                          history = [
                            ...history,
                            { id: Date.now(), type: 'ai', content: 'Your script is ready. You can view it or generate the video.', script: scriptObj, timestamp: now },
                          ];
                          try {
                            const sid = localStorage.getItem('session_id');
                            if (sid) {
                              localStorage.setItem(`last_generated_script:${sid}`, JSON.stringify(scriptObj));
                              localStorage.setItem(`has_generated_script:${sid}`, 'true');
                            }
                          } catch (_) { /* noop */ }
                        }
                      }
                    } catch (_) { /* noop */ }
                    setChatHistory(history);
                    setHasSentFirstMessage(history.some(h => h.type === 'user'));
                  } catch(_) { /* noop */ }
                  setCurrentStep(1);
                }}
                onGenerateVideos={async (images = []) => {
                  try {
                    const sessionId = localStorage.getItem('session_id');
                    const token = localStorage.getItem('token');
                    if (!sessionId || !token) { alert('Login expired'); return; }
                    const sessResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, session_id: sessionId })
                    });
                    const sessText = await sessResp.text();
                    let sessData; try { sessData = JSON.parse(sessText); } catch (_) { sessData = sessText; }
                    if (!sessResp.ok) throw new Error(`user-session/data failed: ${sessResp.status} ${sessText}`);
                    const sd = sessData?.session_data || {};
                    const sessionForBody = {
                      id: sd.session_id || sessionId,
                      user_id: token,
                      title: sd.title || '',
                      // API expects a string duration per latest sample; ensure it's not a literal placeholder
                      video_duration: String(sd.video_duration ?? 60),
                      created_at: sd.created_at || new Date().toISOString(),
                      updated_at: sd.updated_at || new Date().toISOString(),
                      document_summary: sd.document_summary || [],
                      messages: Array.isArray(sd.messages) ? sd.messages : [],
                      total_summary: sd.total_summary || [],
                      scripts: [
                        {
                          userquery: Array.isArray(sd?.scripts?.[0]?.userquery) ? sd.scripts[0].userquery : [],
                          airesponse: Array.isArray(sd?.scripts?.[0]?.airesponse) ? sd.scripts[0].airesponse : [],
                          version: sd?.scripts?.[0]?.version || 'v1'
                        }
                      ],
                      videos: sd.videos || [],
                      // Use images exactly as provided by user-session/data; do not coerce to URL strings
                      images: Array.isArray(sd.images) ? sd.images : (sd.images || [])
                    };
                    const body = { session: sessionForBody };
                    const genResp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/videos/generate-from-session', {
                      method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body)
                    });
                    const genText = await genResp.text();
                    let genData; try { genData = JSON.parse(genText); } catch (_) { genData = genText; }
                    if (!genResp.ok) throw new Error(`videos/generate-from-session failed: ${genResp.status} ${genText}`);
                    const jobId = genData?.job_id || genData?.jobId || genData?.id;
                    if (jobId) {
                      try { localStorage.setItem('current_video_job_id', jobId); } catch (_) {}
                      setVideosJobId(jobId);
                    }
                    setShowVideoPopup(true);
                    setTimeout(() => { setShowVideoPopup(false); setCurrentStep(5); }, 5000);
                  } catch (e) {
                    alert(e?.message || 'Failed to start video generation');
                  }
                }}
              />
            </div>
          )}
          {currentStep === 5 && (
            <div className='bg-white rounded-lg my-2'>
              <VideosList 
                jobId={videosJobId} 
                onClose={async () => { try { await sendUserSessionData(); } catch(_){} setCurrentStep(4); }}
                onGenerateFinalReel={(jobId) => {
                  const mergeJobIdToUse = jobId || localStorage.getItem('current_merge_job_id') || '';
                  setMergeJobId(mergeJobIdToUse);
                  setCurrentStep(7); // Navigate to final video section
                }}
              />
            </div>
          )}
          {currentStep === 7 && (
            <div className='bg-white rounded-lg'>
              <FinalVideo 
                jobId={mergeJobId || localStorage.getItem('current_merge_job_id') || ''} 
                onClose={() => setCurrentStep(5)} 
              />
            </div>
          )}
            </div>
          </>
        )}
      </div>
      {showVideoPopup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-white w-[100%] max-w-sm rounded-lg shadow-xl p-6 text-center">
            <div className="mx-auto mb-4 w-10 h-10 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
            <h4 className="text-lg font-semibold text-gray-900">{isMerging ? 'Merging video…' : 'Generating Video…'}</h4>
            <p className="mt-1 text-sm text-gray-600">{isMerging ? 'Redirecting to Media…' : 'Redirecting to Videos list…'}</p>
          </div>
        </div>
      )}
    </div>
  )
}

export default Home
