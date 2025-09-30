import React from 'react'
import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaImage, FaPlay, FaThLarge } from "react-icons/fa";
import { IoMdLogOut } from "react-icons/io";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logoutUser, selectUser, selectIsAuthenticated } from '../redux/slices/userSlice';
import LogoImage from "../asset/mainLogo.png"

const Sidebar = () => {
   const [sidebarOpen, setSidebarOpen] = useState(false);
   const location = useLocation();
   const navigate = useNavigate();
   const dispatch = useDispatch();
   
   // Redux selectors
   const user = useSelector(selectUser);
   const isAuthenticated = useSelector(selectIsAuthenticated);
   
   const { pathname } = location;
   const splitLocation = pathname.split("/");
   const activeClass = "w-full bg-[#13008B] bg-opacity-90 rounded-lg p-4 flex items-center gap-3 text-left hover:bg-opacity-100 transition-colors mb-4";
   const inactiveClass = "w-full bg-opacity-70 rounded-lg p-4 flex items-center gap-3 text-left hover:bg-opacity-90 transition-colors";
  // Sessions state for chat history
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState('');

  const fetchSessions = useCallback(async () => {
      try {
        setIsLoadingSessions(true);
        setSessionsError('');
        // Prefer token from localStorage, fallback to redux user id
        const token = localStorage.getItem('token') || user?.id || user?.user_id || '';
        if (!token) {
          setSessions([]);
          return;
        }
        const body = { user_id: token };
        const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/users/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const text = await resp.text();
        let data; try { data = JSON.parse(text); } catch (_) { data = text; }
        if (!resp.ok) throw new Error(`users/sessions failed: ${resp.status} ${text}`);
        const list = Array.isArray(data?.sessions) ? data.sessions : [];
        setSessions(list);
        try { localStorage.setItem('user_sessions', JSON.stringify(list)); } catch (_) { /* noop */ }
      } catch (e) {
        console.error('Failed to fetch sessions:', e);
        setSessionsError('Unable to load sessions.');
        // try cache
        try {
          const cached = localStorage.getItem('user_sessions');
          if (cached) setSessions(JSON.parse(cached));
        } catch (_) { /* noop */ }
      } finally {
        setIsLoadingSessions(false);
      }
    }, [user]);

  // Load sessions for this user on mount and refresh when titles update
  React.useEffect(() => {
    fetchSessions();
  }, [fetchSessions]);

  React.useEffect(() => {
    const onTitleUpdated = () => fetchSessions();
    window.addEventListener('session-title-updated', onTitleUpdated);
    return () => window.removeEventListener('session-title-updated', onTitleUpdated);
  }, [fetchSessions]);

  const createSessionAndNavigate = async () => {
    try {
      const token = localStorage.getItem('token') || user?.id || user?.user_id || '';
      if (!token) {
        alert('Please login to start a chat.');
        navigate('/login');
        return;
      }
      // Proactively clear any per-session image caches and script artifacts before creating a new session
      try {
        const prefixes = [
          'scene_ref_images',
          'last_generated_script',
          'updated_script_structure',
          'original_script_hash',
          'reordered_script_rows',
          'has_generated_script',
          'job_id', 'job_status', 'job_result'
        ];
        for (let i = localStorage.length - 1; i >= 0; i--) {
          const k = localStorage.key(i);
          if (!k) continue;
          if (prefixes.some(p => k === p || k.startsWith(p + ':'))) {
            localStorage.removeItem(k);
          }
        }
      } catch (_) { /* noop */ }
      const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/sessions/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: token })
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`sessions/new failed: ${resp.status} ${text}`);
      const newId = data?.session?.session_id || data?.session_id || data?.id;
      if (!newId) throw new Error('Session ID missing in response');
      try { localStorage.setItem('session_id', newId); } catch (_) { /* noop */ }
      navigate(`/chat/${newId}`);
    } catch (e) {
      console.error('Failed to create new session:', e);
      alert('Unable to start a new chat. Please try again.');
    }
  };

  const createSessionAndGoBuildReel = async () => {
    try {
      const token = localStorage.getItem('token') || user?.id || user?.user_id || '';
      if (!token) {
        alert('Please login to continue.');
        navigate('/login');
        return;
      }
      const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/sessions/new', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: token })
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`sessions/new failed: ${resp.status} ${text}`);
      const newId = data?.session?.session_id || data?.session_id || data?.id;
      if (!newId) throw new Error('Session ID missing in response');
      try { localStorage.setItem('session_id', newId); } catch (_) { /* noop */ }
      navigate(`/buildreel/${newId}`);
    } catch (e) {
      console.error('Failed to create build reel session:', e);
      alert('Unable to open Build Reel. Please try again.');
    }
  };

  const handleLogout = async () => {
    try {
      // Dispatch Redux logout action
      await dispatch(logoutUser());
      
      // Clear any remaining localStorage items
      localStorage.removeItem('session_id');
      localStorage.removeItem('chat_history');
      localStorage.removeItem('auth');
      
      // Navigate to login
      navigate('/login');
    } catch (error) {
      console.error('Error during logout:', error);
      // Still navigate to login even if logout fails
      navigate('/login');
    }
  };

  return (
    <div>
         {/* Sidebar */}
<div
  className={`fixed lg:static inset-y-0 left-0 z-30 w-72 text-white flex flex-col justify-between transform ${
    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
  } lg:translate-x-0 transition-transform duration-300 ease-in-out min-h-screen h-full`}
  style={{
    background: `linear-gradient(
      to bottom,
      #0118D8 0%,
      #7100e0 50%,
      #9e00dc 100%
    )`
  }}
>
  {/* Logo */}
  <div>
    <div className="p-6">
      <Link to="/" className="block">
        {/* <h1 className="text-2xl text-center font-bold cursor-pointer hover:opacity-90">Reel Reports</h1> */}
        <img src={LogoImage} alt="Logo"  />
      </Link>
    </div>

    {/* Main Navigation */}
    <div className="px-6 mb-8">
      <button
        onClick={createSessionAndNavigate}
        className={( splitLocation[1] === "chat") ? activeClass : inactiveClass}
      >
        <FaPlay className="w-5 h-5" />
        <span className="font-medium">Generate Reel</span>
      </button>
      <button
        onClick={createSessionAndGoBuildReel}
        className={( splitLocation[1] === "buildreel") ? activeClass : inactiveClass}
      >
        <FaThLarge className="w-5 h-5" />
        <span className="font-medium">Build Reel</span>
      </button>
      <button
        onClick={() => navigate('/media')}
        className="w-full bg-opacity-70 rounded-lg p-4 flex items-center gap-3 text-left hover:bg-opacity-90 transition-colors"
      >
        <FaImage className="w-5 h-5" />
        <span className="font-medium">My Media</span>
      </button>
    </div>
  </div>

  {/* Chat History */}
  <div className="flex flex-col h-full min-h-0">
    <div className="flex-1 px-6 scroll-y-invisible min-h-0">
      <div className="mb-4">
        <h2 className="text-sm uppercase tracking-wide text-purple-200 mb-4">CHATS HISTORY</h2>
        <div className="space-y-2">
          {isLoadingSessions && (
            <div className="text-xs text-purple-200">Loading…</div>
          )}
          {!isLoadingSessions && sessionsError && sessions.length === 0 && (
            <div className="text-xs text-red-200">{sessionsError}</div>
          )}
          {(!isLoadingSessions && sessions.length === 0 && !sessionsError) && (
            <div className="text-xs text-purple-200">No sessions yet</div>
          )}
          {sessions.map((s, index) => (
            <div
              key={s?.id || index}
              className="text-sm text-purple-100 hover:text-white cursor-pointer truncate"
              onClick={() => {
                const id = s?.id || s?.session_id || '';
                try { localStorage.setItem('session_id', id); } catch (_) { /* noop */ }
                if (!id) return;
                navigate(`/chat/${id}`);
              }}
              title={s?.title || 'New Chat'}
            >
              {s?.title || 'New Chat'}
            </div>
          ))}
        </div>
      </div>
    </div>

    {/* Logout */}
  <div className="p-6 mt-auto">
      <button onClick={handleLogout} className="w-full bg-[#13008B] bg-opacity-90 rounded-lg p-4 flex items-center gap-3 text-left hover:bg-opacity-100 transition-colors">
        <IoMdLogOut  className="w-5 h-5" />
        <span className="font-medium">Logout</span>
      </button>
    </div>
  </div>
</div>


    </div>
  )
}

export default Sidebar;
