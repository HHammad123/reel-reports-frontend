import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, Circle, ArrowLeft } from 'lucide-react';

const DynamicQuestion = ({ onNextStep, onPreviousStep, questionsData }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOption, setSelectedOption] = useState({});
  const [otherInputs, setOtherInputs] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasGeneratedScript, setHasGeneratedScript] = useState(() => {
    try {
      return (
        localStorage.getItem('has_generated_script') === 'true' ||
        !!localStorage.getItem('last_generated_script')
      );
    } catch (_) { return false; }
  });


  useEffect(() => {
    // Initialize from parent-provided data only; do not call API here
    try {
      setIsLoading(true);
      setError(null);
      // Sync generated script flag from storage in case user navigated away and back
      try {
        const had = (
          localStorage.getItem('has_generated_script') === 'true' ||
          !!localStorage.getItem('last_generated_script')
        );
        if (had) setHasGeneratedScript(true);
      } catch (_) { /* noop */ }
      const data = questionsData || {};
      const rawQuestions = data?.questions || data?.questionnaire || data?.items || [];
      const normalized = rawQuestions.map((q, index) => {
        const optionsArray = Array.isArray(q?.options) ? q.options : [];
        return {
          id: q?.id ?? index + 1,
          question: q?.question || q?.text || '',
          type: optionsArray.length > 0 ? 'multiple_choice' : 'text',
          options: optionsArray.map(opt =>
            typeof opt === 'string' ? opt : (opt?.text ?? String(opt))
          ),
          required: q?.required ?? true
        };
      });
      setQuestions(normalized);
      setIsLoading(false);
    } catch (err) {
      console.error('Error initializing questions:', err);
      setError(err.message || 'Failed to initialize questions');
      setIsLoading(false);
    }
  }, [questionsData]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleGoToLast = () => {
    if (questions.length > 0) {
      setCurrentQuestionIndex(questions.length - 1);
    }
  };

  const handleSubmit = () => {
    // Build array of { question, answer } with answer always as text
    const answersArray = questions.map(q => ({
      question: q.question,
      answer: answers[q.id] || ''
    }));
    console.log('Questionnaire answers:', answersArray);
    try { localStorage.setItem('dynamic_answers', JSON.stringify(answersArray)); } catch (_) { /* noop */ }
    if (onNextStep) {
      onNextStep(answersArray);
    }
  };


  const handleGenerateScript = async () => {
     try {
       const sessionId = localStorage.getItem('session_id');
       const token = localStorage.getItem('token');
       // Try to resolve a real user id (prefer user meta over token fallback)
       let userMetaLocal = {};
       try { userMetaLocal = JSON.parse(localStorage.getItem('user') || '{}') || {}; } catch (_) {}
       const storedUserId = localStorage.getItem('user_id');
       const effectiveUserId = userMetaLocal?.id || storedUserId || token || '';
       const guidelinesRaw = localStorage.getItem('guidelines_payload');
       const guidelines = guidelinesRaw ? JSON.parse(guidelinesRaw) : null;
 
       const aiQues = questions.map(q => ({ question: q.question, answer: answers[q.id] || '' }));
 
       const additonalprop1 = {
         ai_ques: aiQues,
         ...(guidelines ? {
           purpose_and_audience: guidelines.purpose_and_audience,
           content_focus_and_emphasis: guidelines.content_focus_and_emphasis,
           style_and_visual_pref: guidelines.style_and_visual_pref,
           technical_and_formal_constraints: guidelines.technical_and_formal_constraints,
           audio_and_effects: guidelines.audio_and_effects
         } : {})
       };
 
       const questionnaire_context = [{ additonalprop1 }];
 
       // Fetch current session data from API (do not create a new object)
       let sessionPayload = undefined;
       try {
         const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
           method: 'POST',
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ user_id: effectiveUserId, session_id: sessionId })
         });
         if (resp.ok) {
           const sessionDataResponse = await resp.json();
           const sd = sessionDataResponse?.session_data || {};
           // Prefer passing through the session object mostly as-is; ensure ids present
           sessionPayload = {
             ...(typeof sd === 'object' ? sd : {}),
             session_id: sd.session_id || sessionId || '',
             user_id: sd.user_id || effectiveUserId || ''
           };
         } else {
           console.warn('Failed to load session data; status:', resp.status);
         }
       } catch (e) {
         console.error('Error fetching current session data:', e);
       }

      // Derive video type from latest session data or localStorage
      let qVideoType = 'hybrid';
      try {
        const sd = sessionPayload || {};
        qVideoType = sd?.videoType || sd?.video_type || localStorage.getItem(`video_type_value:${sessionId}`) || 'hybrid';
      } catch (_) { /* noop */ }
      const qvt = String(qVideoType || '').toLowerCase();
      const scriptEndpoint = (qvt === 'infographic' || qvt === 'infographics' || qvt === 'inforgraphic')
        ? 'scripts/infographic/generate'
        : 'scripts/hybrid/generate';

      // Build full payload with user + session + questionnaire context
      let userMeta = {};
      try { userMeta = JSON.parse(localStorage.getItem('user') || '{}') || {}; } catch (_) { userMeta = {}; }
      let brandAssets = {};
      try {
        const userId = token || '';
        brandAssets = JSON.parse(localStorage.getItem(`brand_assets_analysis:${userId}`) || localStorage.getItem('brand_assets_analysis') || '{}') || {};
      } catch (_) { brandAssets = {}; }
      const bi = brandAssets?.brand_identity || {};
      const tv = brandAssets?.tone_and_voice || {};
      const lf = brandAssets?.look_and_feel || {};
      const templatesArr = brandAssets?.template || brandAssets?.templates || [];
      const voiceoverArr = brandAssets?.voiceover || brandAssets?.voiceovers || [];

      const userPayload = {
        id: userMeta?.id || effectiveUserId || '',
        email: userMeta?.email || '',
        display_name: userMeta?.display_name || userMeta?.name || '',
        created_at: userMeta?.created_at || new Date().toISOString(),
        avatar_url: userMeta?.avatar_url || '',
        folder_url: brandAssets?.folder_url || '',
        brand_identity: {
          logo: bi?.logo || [],
          fonts: bi?.fonts || [],
          icons: bi?.icon || bi?.icons || [],
          colors: bi?.colors || [],
          spacing: bi?.spacing,
          tagline: bi?.tagline
        },
        tone_and_voice: {
          context: tv?.context || '',
          brand_personality: tv?.brand_personality || [],
          communication_style_pace: tv?.communication_style_pace || []
        },
        look_and_feel: {
          iconography: lf?.iconography || [],
          graphic_elements: lf?.graphic_elements || [],
          aesthetic_consistency: lf?.aesthetic_consistency || []
        },
        templates: templatesArr,
        voiceover: voiceoverArr
      };

      const fullPayload = {
        user: userPayload,
        session: (sessionPayload || {}),
        video_length: Number((sessionPayload && sessionPayload.video_duration) ? sessionPayload.video_duration : 60),
        video_tone: (sessionPayload && sessionPayload.video_tone) ? sessionPayload.video_tone : 'professional',
        questionnaire_context,
        is_followup: false,
        user_query: ''
      };

      console.log('Generate Script request:', scriptEndpoint, fullPayload);
      setIsGenerating(true);
      setProgress(0);
      try {
        const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/${scriptEndpoint}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(fullPayload)
        });
        if (!resp.ok || !resp.body) {
          throw new Error(`HTTP error! status: ${resp.status}`);
        }

        // Stream the response and update progress
        const contentLengthHeader = resp.headers.get('Content-Length') || resp.headers.get('content-length');
        const total = contentLengthHeader ? parseInt(contentLengthHeader, 10) : undefined;
        const reader = resp.body.getReader();
        let received = 0;
        let textSoFar = '';
        const decoder = new TextDecoder();

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          if (value) {
            received += value.length;
            if (total && total > 0) {
              setProgress(Math.min(99, Math.floor((received / total) * 100)));
            } else {
              setProgress(prev => Math.min(95, prev + 1));
            }
            textSoFar += decoder.decode(value, { stream: true });
          }
        }
        // flush decoder
        textSoFar += decoder.decode();

        let data;
        try {
          data = JSON.parse(textSoFar);
        } catch (_) {
          data = textSoFar;
        }
        setProgress(100);
        console.log('Generated script response:', data);
        try { localStorage.setItem('last_generated_script', JSON.stringify(data)); } catch (_) { /* noop */ }
        try { localStorage.setItem('has_generated_script', 'true'); } catch (_) { /* noop */ }
        setHasGeneratedScript(true);
       try { window.addAiMessageToChat && window.addAiMessageToChat(data); } catch (_) { /* noop */ }
        try { window.dispatchEvent(new CustomEvent('script-generated', { detail: data })); } catch (_) { /* noop */ }
        try {
          window.goToChat && window.goToChat();
          // Auto-open the script modal once chat is visible
          setTimeout(() => {
            try {
              const modal = document.getElementById('script-modal');
              const content = document.getElementById('script-modal-content');
              if (modal && content) {
                content.textContent = typeof data === 'string' ? data : JSON.stringify(data, null, 2);
                modal.classList.remove('hidden');
              }
            } catch (_) { /* noop */ }
          }, 150);
        } catch (_) { /* noop */ }
       } finally {
         setIsGenerating(false);
        setTimeout(() => setProgress(0), 600);
       }
     } catch (e) {
       console.error('Error generating script payload:', e);
       setIsGenerating(false);
       setProgress(0);
     }
   };

  const renderQuestion = (question) => {
    switch (question.type) {
      case 'text':
        return (
          <textarea
            value={answers[question.id] || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            placeholder="Type your answer here..."
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent resize-none"
            rows={4}
          />
        );
      case 'multiple_choice':
        // Ensure an "Other" choice is always present
        const hasOther = (question.options || []).some(opt => {
          const label = typeof opt === 'string' ? opt : (opt?.text ?? '');
          return label.trim().toLowerCase() === 'other';
        });
        const displayedOptions = [
          ...question.options,
          ...(hasOther ? [] : [{ id: '__other__', text: 'Other' }])
        ];

        return (
          <div className="space-y-3">
            {displayedOptions.map((option, index) => {
              const optionLabel = typeof option === 'string' ? option : (option?.text ?? String(option));
              const optionValue = typeof option === 'string' ? option : (option?.id ?? optionLabel);
              const isOther = optionLabel.trim().toLowerCase() === 'other' || optionValue === '__other__';
              const selected = selectedOption[question.id] === (isOther ? '__other__' : optionValue);

              return (
                <div key={index} className="flex flex-col gap-2">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input
                      type="radio"
                      name={`question-${question.id}`}
                      value={isOther ? '__other__' : optionValue}
                      checked={selected}
                      onChange={(e) => {
                        const value = e.target.value;
                        setSelectedOption(prev => ({ ...prev, [question.id]: value }));
                        if (value === '__other__') {
                          const currentOther = otherInputs[question.id] ?? '';
                          setAnswers(prev => ({ ...prev, [question.id]: currentOther }));
                        } else {
                          setAnswers(prev => ({ ...prev, [question.id]: optionLabel }));
                        }
                      }}
                      className="w-4 h-4 text-purple-600 border-gray-300 focus:ring-purple-500"
                    />
                    <span className="text-gray-700">{optionLabel}</span>
                  </label>
                  {isOther && selected && (
                    <input
                      type="text"
                      value={otherInputs[question.id] ?? ''}
                      onChange={(e) => {
                        const text = e.target.value;
                        setOtherInputs(prev => ({ ...prev, [question.id]: text }));
                        setAnswers(prev => ({ ...prev, [question.id]: text }));
                      }}
                      placeholder="Please specify..."
                      className="ml-7 w-[80%] p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                    />
                  )}
                </div>
              );
            })}
          </div>
        );
      default:
        return null;
    }
  };

  // Voice-related features removed from DynamicQuestion; handled in Guidelines step

  if (isLoading) {
    return (
      <div className="bg-white h-full w-full rounded-lg p-[20px] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white h-full w-full rounded-lg p-[20px] flex items-center justify-center">
        <div className="text-center text-red-600">
          <p>Error loading questions: {error}</p>
        </div>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  // All questions are optional; allow proceeding without answer
  const canProceed = true;

  return (
    <div className="bg-white h-full w-full rounded-lg p-[20px] overflow-y-auto">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Step 2: Dynamic Questionnaire</h2>
          <p className="text-gray-600">Please answer the following questions to help us create your video</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-600">
              Question {currentQuestionIndex + 1} of {questions.length}
            </span>
            <span className="text-sm text-gray-600">
              {Math.round(((currentQuestionIndex + 1) / questions.length) * 100)}% Complete
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-purple-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestionIndex + 1) / questions.length) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Question */}
        <div className="bg-gray-50 rounded-lg p-6 mb-8">
          <div className="mb-4">
            <span className="inline-block bg-purple-100 text-purple-800 text-sm font-medium px-3 py-1 rounded-full mb-3">
              Question {currentQuestionIndex + 1}
            </span>
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              {currentQuestion.question}
            </h3>
          </div>
          
          {renderQuestion(currentQuestion)}

          {/* Voice-over tools moved to Guidelines step */}
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <button
            onClick={onPreviousStep}
            className="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-300 transition-colors flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Guidelines
          </button>

          <div className="flex gap-3">
            <button
              onClick={handleGoToLast}
              disabled={questions.length === 0 || isLastQuestion}
              className={`px-6 py-3 rounded-lg font-medium transition-colors ${
                (questions.length === 0 || isLastQuestion)
                  ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
              }`}
            >
              Go to Last
            </button>
            {!isLastQuestion ? (
              <button
                onClick={handleNext}
                disabled={!canProceed}
                className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                  canProceed
                    ? 'bg-purple-600 text-white hover:bg-purple-700'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <>
                
                
                  <button
                    onClick={handleGenerateScript}
                    disabled={isGenerating}
                    className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center gap-2 ${
                      isGenerating ? 'bg-[#cc96ff] text-white cursor-not-allowed' : 'bg-[#9333ea] text-white hover:bg-[#37125a]'
                    }`}
                  >
                    {isGenerating ? (
                      <>
                        <span className="inline-block w-4 h-4 border-2 border-white/80 border-t-transparent rounded-full animate-spin" />
                        Generating...
                      </>
                    ) : 'Generate Script'}
                  </button>
                  
              
              </>
            )}
          </div>
        </div>

        {/* <div className='flex justify-center items-center'>
        {(isGenerating || progress > 0) && (
                    <div className="flex flex-col items-end gap-1 w-48">
                      <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                        <div
                          className="bg-[#9333ea] h-2 rounded-full transition-all duration-200"
                          style={{ width: `${Math.max(5, Math.min(progress, 100))}%` }}
                        />
                      </div>
                      <span className="text-sm text-gray-600">{progress}%</span>
                    </div>
                  )}
        </div> */}

        {/* Question Navigation Dots */}
        <div className="flex justify-center mt-8">
          <div className="flex space-x-2">
            {questions.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentQuestionIndex(index)}
                className={`w-3 h-3 rounded-full transition-colors ${
                  index === currentQuestionIndex
                    ? 'bg-purple-600'
                    : index < currentQuestionIndex
                    ? 'bg-green-500'
                    : 'bg-gray-300'
                }`}
              >
                {index < currentQuestionIndex ? (
                  <CheckCircle className="w-3 h-3 text-white" />
                ) : (
                  <Circle className="w-3 h-3" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {isGenerating && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/30">
          <div className="bg-white/95 max-w-sm w-[90%] rounded-lg shadow p-4 text-center">
            <div className="mx-auto mb-3 w-8 h-8 border-4 border-[#13008B] border-t-transparent rounded-full animate-spin" />
            <div className="text-sm font-medium text-gray-800">Generating Script…</div>
            {progress > 0 && (
              <div className="mt-3">
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div className="bg-[#9333ea] h-2 rounded-full transition-all duration-200" style={{ width: `${Math.max(5, Math.min(progress, 100))}%` }} />
                </div>
                <div className="text-xs text-gray-600 mt-1">{progress}%</div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default DynamicQuestion;
