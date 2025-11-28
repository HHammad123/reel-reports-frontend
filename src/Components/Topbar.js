
import React from 'react'
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FaBars, FaPlus, FaSignOutAlt } from "react-icons/fa";
import { selectUser, selectIsAuthenticated, logoutUser } from '../redux/slices/userSlice';
import { selectVideoJob } from '../redux/slices/videoJobSlice';
import { useSidebar } from '../Contexts/SidebarContext';

const Topbar = () => {
     const dispatch = useDispatch();
     const navigate = useNavigate();
     const videoJob = useSelector(selectVideoJob);
     const { sidebarOpen, toggleSidebar } = useSidebar();
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
       <header className="sticky  z-20 mb-2 flex items-center justify-between rounded-3xl border border-white/60 bg-white/90 px-4 py-4 shadow-[0_18px_45px_rgba(19,0,139,0.12)] backdrop-blur-lg transition-all lg:px-8">
         <div className="flex items-center gap-4">
           <button
             className="flex h-10 w-10 items-center justify-center rounded-full border border-[#E4E1FF] bg-white text-[#13008B] shadow-sm transition hover:border-[#c2bbff] hover:text-[#0F006B]"
             onClick={toggleSidebar}
             type="button"
             aria-label="Toggle navigation"
           >
             <FaBars className="h-4 w-4" />
           </button>
           <h1 className="text-lg font-semibold text-[#000000] lg:text-xl">Welcome to Reel Reports</h1>
         </div>

         <div className="flex items-center gap-3">
           {videoJob?.jobId && videoJob.status !== 'failed' && videoJob.status !== 'succeeded' && (
             <div className="hidden items-center gap-2 rounded-full border border-[#E4E1FF] bg-white px-3 py-1.5 text-sm text-gray-700 shadow-sm md:flex">
               <span className="font-medium text-[#13008B]">Video:</span>
               <span className={videoJob.status === 'succeeded' ? 'text-green-700' : videoJob.status === 'failed' ? 'text-red-700' : 'text-[#4B3CC4]'}>
                 {videoJob.status || 'queued'} {typeof videoJob?.progress?.percent === 'number' ? `• ${videoJob.progress.percent}%` : ''}
               </span>
             </div>
           )}

           {isAuthenticated && user ? (
             <div className="flex items-center gap-3">
               <Link to="/profile" className="group inline-flex items-center gap-2">
                 <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#FFB347] via-[#FFA13D] to-[#FF8A3D] p-[2px] transition group-hover:from-[#FFA13D] group-hover:to-[#FF6A3D]">
                   <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
                     {user.picture ? (
                       <img
                         src={user.picture}
                         alt="Profile"
                         className="h-full w-full object-cover"
                       />
                     ) : (
                       <div
                         className="h-full w-full bg-cover bg-center"
                         style={{
                           backgroundImage:
                             "url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMjAiIGN5PSIyMCIgcj0iMjAiIGZpbGw9IiNGNTkzMTYiLz4KPGNpcmNsZSBjeD0iMjAiIGN5PSIxNiIgcj0iNiIgZmlsbD0iI0ZGRkZGRiIvPgo8cGF0aCBkPSJNMTAgMzJDMTAgMjYuNDc3MiAxNC40NzcyIDIyIDE5IDIySDIxQzI1LjUyMjggMjIgMzAgMjYuNDc3MiAzMCAzMlYzNEgxMFYzMloiIGZpbGw9IiNGRkZGRkYiLz4KPC9zdmc+Cg==')"
                         }}
                       ></div>
                     )}
                   </div>
                 </div>
               </Link>
               <button
                 onClick={handleLogout}
                 className="flex items-center gap-2 rounded-xl border border-transparent bg-white px-3 py-2 text-sm font-medium text-[#080808] transition hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                 title="Logout"
                 type="button"
               >
                 <FaSignOutAlt className="h-4 w-4" />
                 <span className="hidden lg:inline">Logout</span>
               </button>
             </div>
           ) : (
             <div className="flex items-center gap-3">
               <Link to="/login">
                 <button className="flex items-center gap-2 rounded-xl bg-[#13008B] px-4 py-2 text-sm font-semibold text-white shadow-md transition hover:bg-[#0f006b]">
                   <FaPlus className="h-4 w-4" />
                   Create an Account
                 </button>
               </Link>
               <Link to="/login">
                 <button className="rounded-xl border border-[#D8D3FF] bg-white px-4 py-2 text-sm font-semibold text-[#000000] shadow-sm transition hover:border-[#13008B]/40 hover:text-[#0f006b]">
                   Login
                 </button>
               </Link>
             </div>
           )}
         </div>
       </header>
     )
}

export default Topbar;
