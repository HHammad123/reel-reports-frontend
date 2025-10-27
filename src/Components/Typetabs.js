import React from 'react'
import { useState } from 'react';

const Typetabs = ({ onChangeVideoType }) => {
  const [activeTab, setActiveTab] = useState('Hybrid Video');
     const videoTypes = [
       'Hybrid Video',
    'Avatar Video',
    'Infographics Video', 
    'Financial Video',
   
  ];

  // Ensure Hybrid is selected when coming from sidebar's Generate Reel
  React.useEffect(() => {
    try {
      const flag = localStorage.getItem('force_typetab_hybrid') === 'true';
      if (flag) {
        setActiveTab('Hybrid Video');
        if (typeof onChangeVideoType === 'function') onChangeVideoType('Hybrid Video');
        localStorage.removeItem('force_typetab_hybrid');
      }
    } catch (_) { /* noop */ }
  }, [onChangeVideoType]);

  return (
    <div className=''>
      {/* Video Type Tabs */}
        <div className=" border-b border-gray-200 px-4 lg:px-6 py-2">
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
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
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
