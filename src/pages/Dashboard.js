import React from 'react'
import Sidebar from '../Components/Sidebar'
import Typetabs from '../Components/Typetabs'
import Topbar from '../Components/Topbar'
import Chat from '../Components/Chat'
import { Link } from 'react-router-dom'
import DashboardItems from '../Components/Home/DashboardItems'

const Dashboard = () => {
  return (
    <div className='flex h-screen bg-[#E5E2FF] overflow-x-hidden'>
      <Sidebar />
      <div className="w-full mx-[2rem] mt-[1rem]">
        <Topbar />
        <div className='h-[85vh] my-2 flex items-start justify-start'>
          <DashboardItems />
        </div>
      </div>
    </div>
  )
}

export default Dashboard