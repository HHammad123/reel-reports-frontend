import React from 'react'

const GeneratedScriptMessage = ({ message }) => {
  const openScriptModal = () => {
    try {
      const scriptText = typeof message.script === 'string' ? message.script : JSON.stringify(message.script, null, 2);
      const modal = document.getElementById('script-modal');
      const modalContent = document.getElementById('script-modal-content');
      if (modal && modalContent) {
        modalContent.textContent = scriptText;
        modal.classList.remove('hidden');
      } else {
        alert(scriptText);
      }
    } catch (e) { /* noop */ }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100 text-gray-800">
        <p className="text-sm">Your script is ready. You can view it or generate the video.</p>
        <p className="text-xs opacity-70 mt-1">{new Date(message.timestamp).toLocaleTimeString()}</p>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => {
            if (window.startVideoGeneration) {
              window.startVideoGeneration();
            }
          }} 
          className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          <span className="text-sm font-medium text-gray-900">Generate Video</span>
        </button>
        <button 
          onClick={openScriptModal} 
          className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          <span className="text-sm font-medium text-gray-900">View Script</span>
        </button>
      </div>
    </div>
  )
}

export default GeneratedScriptMessage


