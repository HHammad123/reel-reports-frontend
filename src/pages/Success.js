import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import { CheckCircle } from 'lucide-react'

const Success = () => {
  const navigate = useNavigate()

  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
      <Sidebar />
      <div className="flex-1 mx-[2rem] mt-[1rem] min-w-0">
        <Topbar />
        <div className='h-[77vh] my-2 flex items-center justify-center'>
            <div className="bg-white p-10 rounded-2xl shadow-lg text-center max-w-md w-full">
                <div className="flex justify-center mb-6">
                    <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center">
                        <CheckCircle size={48} className="text-green-600" />
                    </div>
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
                <p className="text-gray-600 mb-8">Thank you for your purchase. Your credits have been updated.</p>
                <button 
                    onClick={() => navigate('/')}
                    className="w-full py-3 bg-[#13008B] text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors"
                >
                    Back to Dashboard
                </button>
            </div>
        </div>
      </div>
    </div>
  )
}

export default Success
