import React, { useState } from 'react';
import { FaChartPie, FaUserTie, FaCoins, FaCheck } from 'react-icons/fa';

const AddSceneDropdown = ({ onAdd, hasScripts, className = "" }) => {
  const [aspectRatio, setAspectRatio] = useState('16:9');
  const [videoType, setVideoType] = useState('Infographic');

  return (
    <div className={`absolute top-full right-50 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100 z-50 p-4 flex flex-col gap-4 ${className}`}>
      {/* Aspect Ratio Section - Only show if NO scripts exist */}
      {!hasScripts && (
        <div>
          <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Aspect Ratio</h3>
          <div className="flex gap-3">
            <button
              onClick={() => setAspectRatio('9:16')}
              className={`flex-1 p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${aspectRatio === '9:16' ? 'border-[#13008B] bg-blue-50 text-[#13008B]' : 'border-gray-100 hover:border-gray-200 text-gray-500'
                }`}
            >
              <div className="w-6 h-10 border-2 border-current rounded-sm"></div>
              <span className="text-xs font-bold">9:16</span>
            </button>
            <button
              onClick={() => setAspectRatio('16:9')}
              className={`flex-1 p-3 rounded-lg border-2 flex flex-col items-center gap-2 transition-all ${aspectRatio === '16:9' ? 'border-[#13008B] bg-blue-50 text-[#13008B]' : 'border-gray-100 hover:border-gray-200 text-gray-500'
                }`}
            >
              <div className="w-10 h-6 border-2 border-current rounded-sm"></div>
              <span className="text-xs font-bold">16:9</span>
            </button>
          </div>
        </div>
      )}

      {/* Video Type Section */}
      <div>
        <h3 className="text-xs font-bold text-gray-400 mb-3 uppercase tracking-wider">Video Type</h3>
        <div className="flex flex-col gap-2">
          {[
            { id: 'Infographic', icon: FaChartPie, label: 'Infographic' },
            { id: 'Avatar', icon: FaUserTie, label: 'Avatar' },
            { id: 'Financial Scene', icon: FaCoins, label: 'Financial Scene' }
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
    </div>
  );
};

export default AddSceneDropdown;
