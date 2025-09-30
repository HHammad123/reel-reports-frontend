import React, { useEffect, useState, useRef } from 'react'
import { formatAIResponse } from '../utils/formatting';

// A focused chat-like renderer for the 4-step post-generation flow.
// It consumes existing APIs and app state via globals/localStorage and posts AI messages.

const GeneratedChatFlow = () => {
  const [messages, setMessages] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const scroller = useRef(null);

  const appendAi = (content, extras = {}) => {
    setMessages(prev => [...prev, { id: Date.now(), type: 'ai', content, timestamp: new Date().toISOString(), ...extras }]);
  };

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const run = async () => {
      setIsBusy(true);
      try {
        // Step 1: Confirm script generated
        const script = JSON.parse(localStorage.getItem('last_generated_script') || 'null');
        if (script) {
          appendAi('Your script is ready. You can view it or generate the video.', { script });
        }

        // Step 2: Show guidelines summary if available
        const guidelines = JSON.parse(localStorage.getItem('guidelines_payload') || 'null');
        if (guidelines) {
          appendAi('Loaded your video guidelines for reference.');
        }

        // Step 3: Include dynamic answers summary
        const dyn = JSON.parse(localStorage.getItem('dynamic_answers') || 'null');
        if (dyn && Array.isArray(dyn)) {
          appendAi('Captured your questionnaire responses.');
        }

        // Step 4: Provide next actions
        appendAi('Use the buttons below to proceed.');
      } finally {
        setIsBusy(false);
      }
    };
    run();
  }, []);

  return (
    <div className='bg-white h-full w-full rounded-lg p-[20px] overflow-y-auto'>
      <div ref={scroller} className='space-y-3 max-h-[70vh] overflow-y-auto'>
        {messages.map(m => (
          <div key={m.id} className='flex items-start gap-3'>
            <div className='max-w-xl px-4 py-2 rounded-lg bg-gray-100 text-gray-800'>
              <div className='text-sm'>{formatAIResponse(m.content)}</div>
              <p className='text-xs opacity-70 mt-1'>{new Date(m.timestamp).toLocaleTimeString()}</p>
              {m.script && (
                <div className='mt-2 flex gap-2'>
                  <button
                    onClick={() => { if (window.startVideoGeneration) window.startVideoGeneration(); }}
                    className='px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50'>Generate Reel</button>
                  <button
                    onClick={() => {
                      const modal = document.getElementById('script-modal');
                      const modalContent = document.getElementById('script-modal-content');
                      if (modal && modalContent) {
                        modalContent.textContent = typeof m.script === 'string' ? m.script : JSON.stringify(m.script, null, 2);
                        modal.classList.remove('hidden');
                      }
                    }}
                    className='px-3 py-2 text-sm bg-white border border-gray-200 rounded-lg hover:bg-gray-50'>View Script</button>
                </div>
              )}
            </div>
          </div>
        ))}
        {isBusy && <div className='text-sm text-gray-400'>Preparing...</div>}
      </div>
    </div>
  )
}

export default GeneratedChatFlow


