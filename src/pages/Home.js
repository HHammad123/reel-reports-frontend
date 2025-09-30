import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import Sidebar from '../Components/Sidebar'
import Typetabs from '../Components/Typetabs'
import Topbar from '../Components/Topbar'
import Chat from '../Components/Chat'
import ErrorBoundary from '../Components/ErrorBoundary'
import Guidlines from '../Components/VideoGuidlines/Guidlines'
import DynamicQuestion from '../Components/DynamicQuestion'
import { selectToken, selectIsAuthenticated } from '../redux/slices/userSlice'
import { useNavigate, useParams } from 'react-router-dom'
// Brand step removed; DynamicQuestion is the final step

const Home = () => {
  const [userChat, setuserChat] = useState("")
  const [isDocFollowup, setIsDocFollowup] = useState(false)
  const [chatHistory, setChatHistory] = useState([]) // Chat history to preserve across steps
  const [currentStep, setCurrentStep] = useState(1) // 1: Chat, 2: Guidelines, 3: DynamicQuestion
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false)
  const [questionnaireData, setQuestionnaireData] = useState(null)
  const [isChatLoading, setIsChatLoading] = useState(true)
  const [hasQuestionnaireAgent, setHasQuestionnaireAgent] = useState(false)
  const [latestQuestionnaireData, setLatestQuestionnaireData] = useState(null)
  const [showQuestionnaireOptions, setShowQuestionnaireOptions] = useState(false)

  // Redux selectors
  const token = useSelector(selectToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const navigate = useNavigate();
  const { sessionId } = useParams();

  // Map API session messages to chat UI format
  // Each message item represents a conversation turn with:
  // - m.userquery: string (user message)
  // - m.airesponse: object with .final_output (assistant message)
  const mapMessagesToChatHistory = (messages = []) => {
    try {
      if (!Array.isArray(messages)) return [];
      const out = [];
      let baseId = Date.now();
      for (const m of messages) {
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

      // First message (hasn't been sent yet and not a doc follow-up): do NOT call user-session/data
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
        // Follow-up messages: call user-session/data first and use its session_data
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

      console.log('Sending chat request:', requestBody);
      const response = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/chat/message', {
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
      const response = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data', {
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

      const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/sessions/title', {
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

      // Call the questionnaire generate API with full session object
      const response = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/questionnaire/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
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
        const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/user-session/data', {
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

        setChatHistory(history);
        // Consider a first message sent if there's any user turn present
        setHasSentFirstMessage(history.some(h => h.type === 'user'));

        // No auto-opening of script modal on load
      } catch (e) {
        console.error('Error loading session:', e);
        alert('Unable to load chat session. Starting over.');
        navigate('/');
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
    <div className='flex h-screen bg-[#E5E2FF]'>
      <Sidebar/>
      <div className="w-full mx-[2rem] mt-[1rem]">
        <Topbar/>
        {/* Step-based component rendering */}
        <div className='overflow-y-auto h-[85vh] mt-2 scrollbar-hide'>
          {/* Debug info - remove this later */}
          {/* <div className="mb-2 text-sm text-gray-500">Current Step: {currentStep} | Chat Messages: {chatHistory.length}</div> */}
         <Typetabs />
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
                  key="chat-component"
                />
              </ErrorBoundary>
            </>
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
          {/* Step 4 (BrandArea) removed */}
        </div>
      </div>
    </div>
  )
}

export default Home
