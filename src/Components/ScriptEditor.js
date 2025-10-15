import React from 'react';
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
  return (
    <div className='bg-white rounded-lg shadow-sm flex-1 flex flex-col'>
      <div className='flex items-center justify-between p-4 border-b border-gray-200'>
        <h3 className='text-lg font-semibold text-[#13008B]'>{title}</h3>
        <div className='flex items-center gap-2'>
          <button onClick={onBack} className='px-3 py-1.5 rounded-lg border text-sm'>Back</button>
          <button onClick={onGenerateImages} className='px-3 py-1.5 rounded-lg bg-[#13008B] text-white text-sm hover:bg-blue-800'>Generate Images</button>
        </div>
      </div>
      <div className='flex-1 overflow-hidden'>
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

