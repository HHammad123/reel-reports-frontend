import React from 'react'
import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaImage, FaPlay, FaThLarge, FaDollarSign, FaUsers, FaUserPlus } from "react-icons/fa";
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
   const baseNavClass = "w-full mb-3 rounded-xl p-4 flex items-center gap-3 text-left text-sm font-medium text-white transition-colors focus:outline-none focus:ring-2 focus:ring-white/50";
   const activeClass = `${baseNavClass}  bg-white/25 shadow-lg shadow-black/10`;
   const inactiveClass = `${baseNavClass}  hover:bg-white/20`;
   const rawRole = (user?.role || user?.user_role || user?.type || user?.userType || '').toString().toLowerCase();
   const isAdmin = rawRole === 'admin'; 
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
        const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/v1/users/sessions', {
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
    if (typeof window === 'undefined') return;
    const toggleSidebar = () => setSidebarOpen(prev => !prev);
    const closeSidebar = () => setSidebarOpen(false);
    window.addEventListener('sidebar-toggle', toggleSidebar);
    window.addEventListener('sidebar-close', closeSidebar);
    return () => {
      window.removeEventListener('sidebar-toggle', toggleSidebar);
      window.removeEventListener('sidebar-close', closeSidebar);
    };
  }, []);

  React.useEffect(() => {
    if (typeof window === 'undefined') return;
    const onTitleUpdated = () => fetchSessions();
    window.addEventListener('session-title-updated', onTitleUpdated);
    return () => window.removeEventListener('session-title-updated', onTitleUpdated);
  }, [fetchSessions]);

  React.useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  const createSessionAndNavigate = async () => {
    try {
      try { localStorage.setItem('is_creating_session', 'true'); } catch(_){}
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
      // Hint Typetabs to show Hybrid by default on entry
      try { localStorage.setItem('force_typetab_hybrid', 'true'); } catch(_){}
      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/new', {
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
      setSidebarOpen(false);
    } catch (e) {
      console.error('Failed to create new session:', e);
      alert('Unable to start a new chat. Please try again.');
    }
  };

  const createSessionAndGoBuildReel = async () => {
    try {
      try { localStorage.setItem('is_creating_session', 'true'); } catch(_){}
      const token = localStorage.getItem('token') || user?.id || user?.user_id || '';
      if (!token) {
        alert('Please login to continue.');
        navigate('/login');
        return;
      }
      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/new', {
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
      setSidebarOpen(false);
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
    <>
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 flex h-full min-h-screen w-72 transform flex-col justify-between text-white transition-transform duration-300 ease-in-out lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
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
              <img src={LogoImage} alt="Logo" />
            </Link>
          </div>

          {/* Main Navigation */}
          <div className="mb-2 px-6">
            <button
              onClick={createSessionAndNavigate}
              className={splitLocation[1] === 'chat' ? activeClass : inactiveClass}
            >
              <FaPlay className="h-5 w-5" />
              <span>Generate Reel</span>
            </button>
            <button
              onClick={createSessionAndGoBuildReel}
              className={splitLocation[1] === 'buildreel' ? activeClass : inactiveClass}
            >
              <FaThLarge className="h-5 w-5" />
              <span>Build Reel</span>
            </button>
            <button
              onClick={() => navigate('/media')}
              className={splitLocation[1] === 'media' ? activeClass : inactiveClass}
            >
              <FaImage className="h-5 w-5" />
              <span>My Media</span>
            </button>
            <button
              onClick={() => navigate('/price-guidelines')}
              className={splitLocation[1] === 'price-guidelines' ? activeClass : inactiveClass}
            >
              <FaDollarSign className="h-5 w-5" />
              <span>Price Guidelines</span>
            </button>

            {isAdmin && (
              <div className="mt-8">
                <p className="mb-3 text-xs uppercase tracking-wide text-white/70">Admin</p>
                <button
                  onClick={() => navigate('/admin/users')}
                  className={
                    pathname.startsWith('/admin/users') && !pathname.includes('/create')
                      ? activeClass
                      : inactiveClass
                  }
                >
                  <FaUsers className="h-5 w-5" />
                  <span>All Users</span>
                </button>
                <button
                  onClick={() => navigate('/admin/users/create')}
                  className={pathname === '/admin/users/create' ? activeClass : inactiveClass}
                >
                  <FaUserPlus className="h-5 w-5" />
                  <span>Create User</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Chat History */}
        <div className="flex min-h-0 flex-col">
          <div className="scroll-y-invisible min-h-0 flex-1 px-6">
            <div className="mb-5">
              <h2 className="mb-3 text-sm uppercase tracking-wide text-white/70">Chats History</h2>
              <div className="space-y-2">
                {isLoadingSessions && <div className="text-xs text-purple-100/80">Loading…</div>}
                {!isLoadingSessions && sessionsError && sessions.length === 0 && (
                  <div className="text-xs text-red-100">{sessionsError}</div>
                )}
                {!isLoadingSessions && sessions.length === 0 && !sessionsError && (
                  <div className="text-xs text-purple-100/80">No sessions yet</div>
                )}
                {sessions.map((s, index) => {
                  const id = s?.id || s?.session_id || '';
                  const label = s?.title || 'New Chat';
                  return (
                    <button
                      key={id || index}
                      type="button"
                      className="w-full truncate rounded-lg bg-white/10 px-3 py-2 text-left text-sm text-white transition hover:bg-white/20"
                      onClick={() => {
                        if (!id) return;
                        try { localStorage.setItem('session_id', id); } catch (_) { /* noop */ }
                        navigate(`/chat/${id}`);
                        setSidebarOpen(false);
                      }}
                      title={label}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Logout */}
          <div className="mt-auto p-6">
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-3 rounded-xl bg-white/15 px-4 py-3 text-left text-sm font-medium transition hover:bg-white/25"
            >
              <IoMdLogOut className="h-5 w-5" />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-20 bg-[#0a0333]/60 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
    </>
  )
}

export default Sidebar;
