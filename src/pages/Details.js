import React, { useEffect } from 'react'
import Topbar from '../Components/Topbar'
import Sidebar from '../Components/Sidebar'
import { useNavigate } from 'react-router-dom'
import UserQuestion from '../Components/Details/UserQuestion'

const Details = () => {
    const navigate = useNavigate()
    useEffect(() => {
      if (localStorage.getItem('auth') === 'false') {
        navigate('/login')
      }
    }, [localStorage.getItem('auth')])
  return (
    <div className='flex justify-center items-center h-screen bg-[#E5E2FF] scrollbar-hidden'>
        <UserQuestion/>
    </div>
  )
}

export default Details