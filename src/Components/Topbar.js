
import React from 'react'
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FaPlus, FaSignOutAlt } from "react-icons/fa";
import { selectUser, selectIsAuthenticated, logoutUser } from '../redux/slices/userSlice';
import { selectVideoJob } from '../redux/slices/videoJobSlice';

const Topbar = () => {
     const [sidebarOpen, setSidebarOpen] = useState(false);
     const dispatch = useDispatch();
     const navigate = useNavigate();
     const videoJob = useSelector(selectVideoJob);
     // Redux selectors
     const user = useSelector(selectUser);
     const isAuthenticated = useSelector(selectIsAuthenticated);
     
     const handleLogout = async () => {
       try {
         await dispatch(logoutUser());
         navigate('/login');
       } catch (error) {
         console.error('Logout failed:', error);
       }
     };
     
     return (
       <div>
          {/* Header */}
           <div className="bg-white border-b border-gray-200 px-4 rounded-lg lg:px-8 py-4 h-[9vh] flex-shrink-0">
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
                 <h1 className="text-xl lg:text-xl font-semibold text-gray-900">Welcome to Reel Reports</h1>
               </div>
               <div className="flex items-center gap-3">
               {videoJob?.jobId && videoJob.status !== 'failed' && videoJob.status !== 'succeeded' && (
                 <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white border-gray-200 text-sm text-gray-700">
                   <span className="font-medium">Video:</span>
                   <span className={videoJob.status==='succeeded' ? 'text-green-700' : videoJob.status==='failed' ? 'text-red-700' : 'text-blue-700'}>
                     {videoJob.status || 'queued'} {typeof videoJob?.progress?.percent === 'number' ? `• ${videoJob.progress.percent}%` : ''}
                   </span>
                 </div>
               )}
               { isAuthenticated && user ?
                ( 
                 <div className="flex items-center gap-3">
                   <Link to="/profile">
                     <div className="w-10 h-10 lg:w-10 lg:h-10 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 flex items-center justify-center overflow-hidden">
                       {user.picture ? (
                         <img 
                           src={user.picture} 
                           alt="Profile" 
                           className="w-full h-full object-cover"
                         />
                       ) : (
                         <div className="w-8 h-8 lg:w-8 lg:h-8 rounded-full bg-cover bg-center" style={{backgroundImage: "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGNTkzMTYiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iI0ZGRkZGRiIvPgo8cGF0aCBkPSJNMTAgMzJDMTAgMjYuNDc3MiAxNC40NzcyIDIyIDE5IDIySDIxQzI1LjUyMjggMjIgMzAgMjYuNDc3MiAzMCAzMlYzNEgxMFYzMloiIGZpbGw9IiNGRkZGRkYiLz4KPC9zdmc+Cg==')"}}></div>
                       )}
                     </div>
                   </Link>
                   <button 
                     onClick={handleLogout}
                     className="flex items-center gap-2 px-3 py-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                     title="Logout"
                   >
                     <FaSignOutAlt className="w-4 h-4" />
                     <span className="hidden lg:inline">Logout</span>
                   </button>
                 </div>
                ) : (
                   <div className='flex items-center gap-3'>
                       <Link className='' to="/login">
                       <button className='bg-[#13008B] flex items-center justify-start gap-2 text-white px-4 py-2 rounded-lg'><FaPlus />Create an Account</button>
                     </Link>
                     <Link to="/login">
                       <button className='bg-[white] text-black px-4 py-2 rounded-lg'>Login</button>
                     </Link>
                   
                   </div>
                 )}
               </div>
             </div>
           </div>
       </div>
     )
}

export default Topbar;
