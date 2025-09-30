import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import Guidlines from '../Components/VideoGuidlines/Guidlines'

const VideoGuidelines = () => {
  const navigate = useNavigate()
  useEffect(() => {
    if (localStorage.getItem('auth') === 'false') {
      navigate('/login')
    }
  }, [localStorage.getItem('auth')])


  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
      <Sidebar />
      <div className="w-full mx-[2rem] mt-[1rem]">
        <Topbar />
        <div className='h-[85vh] my-2 flex items-start justify-start'>
          <Guidlines />
        </div>
      </div>
    </div>
  )
}

export default VideoGuidelines
