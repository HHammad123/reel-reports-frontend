import React from 'react'
import { useState, useEffect } from 'react';

const Typetabs = ({ onChangeVideoType }) => {
  const [activeTab, setActiveTab] = useState('Hybrid Reel');
     const videoTypes = [
       'Hybrid Reel',
    'Avatar Reel',
    'Infographics Reel', 
    'Financial Reel',
   
  ];

  // Map API video type to tab label
  const mapVideoTypeToLabel = (videoType) => {
    if (!videoType) return 'Hybrid Reel';
    const vt = String(videoType).toLowerCase().trim();
    if (vt === 'hybrid') return 'Hybrid Reel';
    if (vt === 'infographic' || vt === 'infographics' || vt === 'inforgraphic') return 'Infographics Reel';
    if (vt === 'financial') return 'Financial Reel';
    if (vt === 'avatar' || vt === 'avatars' || vt === 'avatar based') return 'Avatar Reel';
    return 'Hybrid Reel'; // Default fallback
  };

  // Load video type from session data on mount and when session changes
  useEffect(() => {
    const loadVideoTypeFromSession = async () => {
      try {
        const sessionId = localStorage.getItem('session_id');
        if (!sessionId) {
          // Check for force_typetab_hybrid flag
          const flag = localStorage.getItem('force_typetab_hybrid') === 'true';
          if (flag) {
            setActiveTab('Hybrid Reel');
            if (typeof onChangeVideoType === 'function') onChangeVideoType('Hybrid Reel');
            localStorage.removeItem('force_typetab_hybrid');
          }
          return;
        }

        const userId = localStorage.getItem('token');
        if (!userId) return;

        // Fetch session data to get video type
        const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: userId, session_id: sessionId })
        });

        if (resp.ok) {
          const text = await resp.text();
          let data;
          try {
            data = JSON.parse(text);
          } catch (_) {
            data = text;
          }

          const sessionData = data?.session_data || data || {};
          const videoType = sessionData?.videoType || localStorage.getItem(`video_type_value:${sessionId}`) || 'hybrid';
          const mappedLabel = mapVideoTypeToLabel(videoType);
          
          setActiveTab(mappedLabel);
          // Don't call onChangeVideoType here to avoid triggering session creation
        } else {
          // Fallback to localStorage if API fails
          const storedType = localStorage.getItem(`video_type_value:${sessionId}`);
          if (storedType) {
            const mappedLabel = mapVideoTypeToLabel(storedType);
            setActiveTab(mappedLabel);
          }
        }
      } catch (e) {
        console.warn('Failed to load video type from session:', e);
        // Fallback: check for force_typetab_hybrid flag
        try {
          const flag = localStorage.getItem('force_typetab_hybrid') === 'true';
          if (flag) {
            setActiveTab('Hybrid Reel');
            if (typeof onChangeVideoType === 'function') onChangeVideoType('Hybrid Reel');
            localStorage.removeItem('force_typetab_hybrid');
          }
        } catch (_) { /* noop */ }
      }
    };

    loadVideoTypeFromSession();

    // Listen for storage changes (when session_id changes)
    const handleStorageChange = (e) => {
      if (e.key === 'session_id' || e.key?.startsWith('video_type_value:')) {
        loadVideoTypeFromSession();
      }
    };

    // Listen for custom event when video type is updated
    const handleVideoTypeUpdate = () => {
      loadVideoTypeFromSession();
    };

    window.addEventListener('storage', handleStorageChange);
    window.addEventListener('videoTypeUpdated', handleVideoTypeUpdate);

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('videoTypeUpdated', handleVideoTypeUpdate);
    };
  }, [onChangeVideoType]);

  return (
    <div className=''>
      {/* Video Type Tabs */}
        <div className=" border-b border-gray-200 px-4 lg:px-6 py-1">
          <div className="flex gap-2 justify-between  overflow-x-auto scrollbar-hide">
            {videoTypes.map((type) => (
              <button
                key={type}
                onClick={() => {
                  setActiveTab(type);
                  if (typeof onChangeVideoType === 'function') {
                    onChangeVideoType(type);
                  }
                }}
                className={`px-4 lg:px-4 py-2 lg:py-2 rounded-lg whitespace-nowrap text-sm lg:text-[1rem] font-medium transition-colors ${
                  activeTab === type
                    ? 'bg-[#13008B] text-white'
                    : 'text-black hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
    </div>
  )
}

export default Typetabs;
