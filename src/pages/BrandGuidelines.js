import React, { useEffect } from 'react';
import { Play, Image, LogOut, User, Zap, Settings, Crown } from 'lucide-react';
import Sidebar from '../Components/Sidebar';
import Topbar from '../Components/Topbar';
import ProfileSidebar from '../Components/Profile/ProfileSidebar';
import ProfileContent from '../Components/Profile/ProfileContent';
import { useNavigate } from 'react-router-dom';
import BrandArea from '../Components/BrandGuidelines/BrandArea';

const BrandGuidelines = () => {
  const navigate = useNavigate()
  useEffect(()=>{
    if(localStorage.getItem('auth') === 'false'){
      navigate('/login')
    }
  },[localStorage.getItem('auth')])
  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
    <Sidebar/>
    <div className="flex-1 mx-[2rem] mt-[1rem] min-w-0">
      <Topbar/>
    <div className='h-[77vh] my-2 flex items-start justify-start'>
    <ProfileSidebar />
    <BrandArea />
    </div>
    </div>
  </div>
  )
}

export default BrandGuidelines