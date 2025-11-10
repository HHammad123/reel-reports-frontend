import React, { useEffect } from 'react';
import ErrorBoundary from './ErrorBoundary';
import Chat from './Chat';

// Lightweight dedicated Script editor section.
// Reuses the scenes editor from Chat with scenesMode enabled and hides chat input.
// Provides a clean header with Back and Generate Images actions.
const ScriptEditor = ({
  title = 'The Generated Script is:',
  initialScenes = null,
  onBack,
  onGenerateImages,
  // Passthrough props for Chat scenes editor
  addUserChat,
  userChat,
  setuserChat,
  sendUserSessionData,
  chatHistory,
  setChatHistory,
  imagesAvailable = false,
  onOpenImagesList,
}) => {
  // Preload brand-assets images on mount and cache in localStorage for reuse
  useEffect(() => {
    (async () => {
      try {
        const token = (typeof window !== 'undefined' && localStorage.getItem('token')) || '';
        if (!token) return;
        const cacheKey = `brand_assets_images:${token}`;
        // Always refresh on mount to keep it up to date
        const resp = await fetch(`https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/users/brand-assets/images/${encodeURIComponent(token)}`);
        const text = await resp.text();
        let data; try { data = JSON.parse(text); } catch(_) { data = text; }
        if (resp.ok && data && typeof data === 'object') {
          try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch(_) {}
        }
      } catch (_) { /* noop */ }
    })();
  }, []);
  return (
    <div className='bg-white rounded-lg shadow-sm flex-1 flex flex-col min-h-0 overflow-x-hidden'>
      <div className='flex-1 overflow-visible min-h-0'>
        <ErrorBoundary>
          <Chat
            addUserChat={addUserChat}
            userChat={userChat}
            setuserChat={setuserChat}
            sendUserSessionData={sendUserSessionData}
            chatHistory={chatHistory}
            setChatHistory={setChatHistory}
            isChatLoading={false}
            onOpenImagesList={onOpenImagesList}
            imagesAvailable={imagesAvailable}
            scenesMode={true}
            enablePresenterOptions={true}
            initialScenes={initialScenes}
            onBackToChat={onBack}
            key='script-editor'
          />
        </ErrorBoundary>
      </div>
    </div>
  );
};

export default ScriptEditor;
