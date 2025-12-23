import React, { useEffect, useState } from 'react'
import Sidebar from '../Components/Sidebar'
import Typetabs from '../Components/Typetabs'
import Topbar from '../Components/Topbar'
import Chat from '../Components/Chat'
import { Link } from 'react-router-dom'
import DashboardItems from '../Components/Home/DashboardItems'
import { PixoImage } from './ImageEdit'

const Dashboard = () => {
  const [showTutorial, setShowTutorial] = useState(false);
  // Tutorial video commented out
  // useEffect(() => {
  //   try {
  //     const val = localStorage.getItem('show_tutorial_video');
  //     // default true when not set
  //     const shouldShow = (val === null) ? true : (val !== 'false');
  //     if (shouldShow) setShowTutorial(true);
  //   } catch(_) { setShowTutorial(true); }
  //   // expose opener for nested components
  //   try {
  //     window.openTutorialVideo = () => { try { localStorage.setItem('show_tutorial_video', 'true'); } catch(_) {}; setShowTutorial(true); };
  //   } catch(_) {}
  // }, []);
  // const handleDontShowAgain = () => {
  //   try { localStorage.setItem('show_tutorial_video', 'false'); } catch(_) {}
  //   setShowTutorial(false);
  // };
  // const handleSkipNow = () => { setShowTutorial(false); };
  return (
    <div className='flex h-screen bg-[#E5E2FF] overflow-x-hidden'>
      <Sidebar />
      
      <div className="flex-1 mx-[2rem] mt-[1rem] min-w-0">
        <Topbar />
        <div className='h-[85vh] my-2 flex items-start justify-start'>
          {/* <PixoImage src={src} onChange={onChange} /> */}
          <DashboardItems />
        </div>
      </div>
      {/* Tutorial video commented out */}
      {/* {showTutorial && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50">
          <div className="bg-white w-[96%] max-w-3xl rounded-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Quick Tutorial</h3>
              <button onClick={handleSkipNow} className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 text-gray-700">✕</button>
            </div>
            <div className="p-4">
              <div className="aspect-video w-full bg-black/5 rounded-lg overflow-hidden border">
                <video controls autoPlay className="w-full h-full">
                  <source src="/tutorial.mp4" type="video/mp4" />
                </video>
              </div>
              <div className="mt-4 flex items-center justify-end gap-2">
                <button onClick={handleSkipNow} className="px-4 py-2 rounded-lg border bg-white text-gray-900 hover:bg-gray-50">Skip for now</button>
                <button onClick={handleDontShowAgain} className="px-4 py-2 rounded-lg bg-[#13008B] text-white hover:bg-blue-800">Don't show again</button>
              </div>
            </div>
          </div>
        </div>
      )} */}
    </div>
  )
}

export default Dashboard
