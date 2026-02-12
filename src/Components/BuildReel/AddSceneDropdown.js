import React, { useState, useEffect } from 'react';
import { FaChartPie, FaUserTie, FaCoins, FaCheck, FaCharts } from 'react-icons/fa';
import LoadingAnimationGif from '../../asset/loadingv2.gif';
import { PiPresentationChartBold } from "react-icons/pi";
import { FaPhotoVideo } from "react-icons/fa";

const AddSceneDropdown = ({ onAdd, hasScripts, className = "" }) => {
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [isLoading, setIsLoading] = useState(true);
  const [hasExistingScripts, setHasExistingScripts] = useState(false);

  useEffect(() => {
    const checkSessionScripts = async () => {
      try {
        if (typeof window === 'undefined') {
          setIsLoading(false);
          return;
        }

        const sessionId = localStorage.getItem('session_id');
        const token = localStorage.getItem('token');

        if (!sessionId || !token) {
          setIsLoading(false);
          return;
        }

        const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/user-session-data', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user_id: token, session_id: sessionId })
        });

        if (response.ok) {
          const data = await response.json();
          const sessionData = data?.session_data || data?.session || {};
          const scripts = Array.isArray(sessionData.scripts) ? sessionData.scripts : [];
          setHasExistingScripts(scripts.length > 0);
        }
      } catch (error) {
        console.error('Failed to check session scripts:', error);
      } finally {
        setIsLoading(false);
      }
    };

    checkSessionScripts();
  }, []);

  const handleAspectRatioChange = (ratio) => {
    setAspectRatio(ratio);
  };
  const [videoType, setVideoType] = useState('Infographic');

  return (
    <div className={`absolute top-full right-50 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 p-4 flex flex-col gap-4 ${className}`}>
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-8 min-h-[200px]">
          <img src={LoadingAnimationGif} alt="Loading..." className="w-16 h-16 object-contain mb-2" />
          <p className="text-xs text-gray-400 font-medium animate-pulse">Please wait...</p>
        </div>
      ) : (
        <>
          {/* Aspect Ratio Section - Only show if NO scripts exist */}
          {!hasExistingScripts && (
            <div>
              <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Aspect Ratio</h3>
              <div className="flex gap-3">
                <button
                  onClick={() => handleAspectRatioChange('9:16')}
                  className={`relative flex-1 p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${aspectRatio === '9:16' ? 'border-[#13008B] bg-blue-50 text-[#13008B] ring-2 ring-[#13008B]/30' : 'border-gray-100 hover:border-gray-200 text-gray-500'
                    }`}
                >
                  <div className="w-6 h-10 border-2 border-current rounded-sm"></div>
                  <span className="text-xs font-bold">9:16</span>
                  {aspectRatio === '9:16' && (
                    <FaCheck className="absolute top-2 right-2 text-[#13008B]" />
                  )}
                </button>
                <button
                  onClick={() => handleAspectRatioChange('16:9')}
                  className={`relative flex-1 p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${aspectRatio === '16:9' ? 'border-[#13008B] bg-blue-50 text-[#13008B] ring-2 ring-[#13008B]/30' : 'border-gray-100 hover:border-gray-200 text-gray-500'
                    }`}
                >
                  <div className="w-10 h-6 border-2 border-current rounded-sm"></div>
                  <span className="text-xs font-bold">16:9</span>
                  {aspectRatio === '16:9' && (
                    <FaCheck className="absolute top-2 right-2 text-[#13008B]" />
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Video Type Section */}
          <div>
            <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Video Type</h3>
            <div className="flex flex-col gap-2">
              {[
                { id: 'Infographic', icon: FaPhotoVideo, label: 'Infographic' },
                { id: 'Avatar', icon: FaUserTie, label: 'Avatar' },
                { id: 'Financial Scene', icon: PiPresentationChartBold, label: 'Financial Scene' }
              ].map((type) => (
                <button
                  key={type.id}
                  onClick={() => setVideoType(type.id)}
                  className={`flex items-center gap-3 p-3 rounded-lg transition-all w-full text-left ${videoType === type.id ? 'bg-[#13008B] text-white shadow-md' : 'bg-gray-50 text-gray-600 hover:bg-gray-100'
                    }`}
                >
                  <type.icon className={videoType === type.id ? 'text-white' : 'text-gray-400'} />
                  <span className="text-sm font-medium">{type.label}</span>
                  {videoType === type.id && <FaCheck className="ml-auto text-xs" />}
                </button>
              ))}
            </div>
          </div>

          <button
            onClick={() => onAdd({ aspectRatio, videoType })}
            className="w-full py-3 bg-[#13008B] text-white rounded-lg font-bold hover:bg-[#0e006b] transition-colors mt-2 shadow-lg shadow-blue-900/20"
          >
            Create Scene
          </button>
        </>
      )}
    </div>
  );
};

export default AddSceneDropdown;
