import React, { useState } from 'react';
import { Play, Image, LogOut, Upload, Paperclip, FileText, Camera } from 'lucide-react';
import Sidebar from '../Components/Sidebar';
import Chat from '../Components/Chat';
import Topbar from '../Components/Topbar';
import Typetabs from '../Components/Typetabs';

export default function Main() {
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const videoTypes = [
    'Informational Video',
    'Cinematic Video', 
    'Avatar Based Video',
    'Voice Over Video'
  ];

  const chatHistory = [
    'ALL About the Finance News',
    'Businesses in the World of...',
    'How Businesses Work in 20...'
  ];

  return (
    <div className="flex  bg-gray-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

     <Sidebar/>

      {/* Main Content */}
      <div className=" flex-1 overflow-hidden">
      <Topbar />
      <Typetabs/>
      <Chat/>
        {/* Header */}
        {/* <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                className="lg:hidden p-2 rounded-md hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                  <div className="w-full h-0.5 bg-gray-600"></div>
                  <div className="w-full h-0.5 bg-gray-600"></div>
                  <div className="w-full h-0.5 bg-gray-600"></div>
                </div>
              </button>
              <h1 className="text-xl lg:text-2xl font-semibold text-gray-900">Welcome to Reel Reports</h1>
            </div>
            <div className="flex items-center gap-3">
              <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm lg:text-base transition-colors">
                <span className="text-lg">+</span>
                <span className="hidden sm:inline">Create an Account</span>
                <span className="sm:hidden">Create</span>
              </button>
              <button className="text-gray-600 hover:text-gray-900 text-sm lg:text-base transition-colors">
                Login
              </button>
            </div>
          </div>
        </div> */}



        {/* Video Type Tabs */}
        {/* <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex gap-2 overflow-x-auto scrollbar-hide">
            {videoTypes.map((type) => (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`px-4 lg:px-6 py-2 lg:py-3 rounded-lg whitespace-nowrap text-sm lg:text-base font-medium transition-colors ${
                  activeTab === type
                    ? 'bg-purple-600 text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
           
        </div> */}
       
      </div>
    </div>
  );
}