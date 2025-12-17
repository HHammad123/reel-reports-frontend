import React from 'react'
import { useCallback, useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaImage, FaPlay, FaThLarge, FaUsers, FaUserPlus, FaBars } from "react-icons/fa";
import { IoMdLogOut } from "react-icons/io";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logoutUser, selectUser, selectIsAuthenticated } from '../redux/slices/userSlice';
import { useSidebar } from '../Contexts/SidebarContext';
import LogoImage from "../asset/mainLogo.png";
import { MoreVertical } from 'lucide-react';

const Sidebar = () => {
   const { sidebarOpen, setSidebarOpen } = useSidebar();
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
  
  // Menu and dialog states
  const [openMenuId, setOpenMenuId] = useState(null);
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [renameSessionId, setRenameSessionId] = useState(null);
  const [renameNewTitle, setRenameNewTitle] = useState('');
  const [isRenaming, setIsRenaming] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [deleteSessionId, setDeleteSessionId] = useState(null);
  const [showTrialOverModal, setShowTrialOverModal] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const menuRef = useRef(null);

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

  // Close menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpenMenuId(null);
      }
    };
    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  // Handle rename session
  const handleRenameSession = async () => {
    if (!renameSessionId || !renameNewTitle.trim()) {
      alert('Please enter a valid session name');
      return;
    }
    
    try {
      setIsRenaming(true);
      const token = localStorage.getItem('token') || user?.id || user?.user_id || '';
      if (!token) {
        alert('Please login to rename session.');
        return;
      }
      
      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/rename', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: renameSessionId,
          user_id: token,
          new_title: renameNewTitle.trim()
        })
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = text;
      }
      
      if (!response.ok) {
        throw new Error(`Rename failed: ${response.status} ${text}`);
      }
      
      // Refresh sessions list
      await fetchSessions();
      
      // Close dialog and reset state
      setShowRenameDialog(false);
      setRenameSessionId(null);
      setRenameNewTitle('');
      setOpenMenuId(null);
    } catch (error) {
      console.error('Failed to rename session:', error);
      alert('Failed to rename session. Please try again.');
    } finally {
      setIsRenaming(false);
    }
  };

  // Handle delete session
  const handleDeleteSession = async () => {
    if (!deleteSessionId) return;
    
    try {
      setIsDeleting(true);
      const token = localStorage.getItem('token') || user?.id || user?.user_id || '';
      if (!token) {
        alert('Please login to delete session.');
        return;
      }
      
      const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          session_id: deleteSessionId,
          user_id: token
        })
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (_) {
        data = text;
      }
      
      if (!response.ok) {
        throw new Error(`Delete failed: ${response.status} ${text}`);
      }
      
      // If deleted session is the current one, navigate away
      const currentSessionId = localStorage.getItem('session_id');
      if (deleteSessionId === currentSessionId) {
        localStorage.removeItem('session_id');
        navigate('/');
      }
      
      // Refresh sessions list
      await fetchSessions();
      
      // Close dialog and reset state
      setShowDeleteDialog(false);
      setDeleteSessionId(null);
      setOpenMenuId(null);
    } catch (error) {
      console.error('Failed to delete session:', error);
      alert('Failed to delete session. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  // Don't auto-close sidebar on pathname change since it's now always partially visible
  // React.useEffect(() => {
  //   setSidebarOpen(false);
  // }, [pathname]);

  const createSessionAndNavigate = async () => {
    try {
      try { localStorage.setItem('is_creating_session', 'true'); } catch(_){}
      const token = localStorage.getItem('token') || user?.id || user?.user_id || '';
      if (!token) {
        alert('Please login to start a chat.');
        navigate('/login');
        return;
      }
      
      // Check user validation status
      const userStatus = (user?.status || user?.validation_status || '').toString().toLowerCase();
      const normalizedStatus = userStatus === 'non_validated' ? 'not_validated' : userStatus;
      
      // If user is not validated and not admin, show trial over modal
      if (normalizedStatus !== 'validated' && !isAdmin) {
        setShowTrialOverModal(true);
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
        className={`relative flex h-full flex-col text-white transition-all duration-300 ease-in-out min-w-0 ${
          sidebarOpen ? 'w-72' : 'w-0'
        } overflow-hidden`}
        style={{
          background: `linear-gradient(
            to bottom,
            #0118D8 0%,
            #7100e0 50%,
            #9e00dc 100%
          )`
        }}
      >
        {/* Scrollable container for entire sidebar content */}
        <div className="flex h-full flex-col overflow-hidden">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center p-6 border-b border-white/10">
            <Link to="/" className="block">
              <img src={LogoImage} alt="Logo" />
            </Link>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 min-h-0 overflow-y-auto">
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
                  disabled
                  className="w-full mb-3 rounded-xl p-4 flex items-center gap-3 text-left text-sm font-medium text-white/50 transition-colors cursor-not-allowed opacity-60"
                >
                  <FaThLarge className="h-5 w-5" />
                  <span>Build Reel (Coming Soon)</span>
                </button>
                <button
                  onClick={() => navigate('/media')}
                  className={splitLocation[1] === 'media' ? activeClass : inactiveClass}
                >
                  <FaImage className="h-5 w-5" />
                  <span>My Media</span>
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

              {/* Chat History */}
              <div className="px-6 pb-4">
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
                      // Extract session ID from URL (e.g., /chat/{sessionId} or /buildreel/{sessionId})
                      const urlSessionId = pathname.split('/').length > 2 ? pathname.split('/')[2] : null;
                      // Also check localStorage as fallback
                      const localStorageSessionId = localStorage.getItem('session_id');
                      const isActive = id && (id === urlSessionId || id === localStorageSessionId);
                      const isMenuOpen = openMenuId === id;
                      
                      return (
                        <div
                          key={id || index}
                          className="relative group"
                        >
                          <div className={`w-full truncate rounded-lg px-3 py-2 text-left text-sm text-white transition flex items-center justify-between gap-2 ${
                            isActive 
                              ? 'bg-white/25 shadow-lg shadow-black/10 font-medium' 
                              : 'bg-white/10 hover:bg-white/20'
                          }`}>
                            <button
                              type="button"
                              className="flex-1 truncate text-left"
                              onClick={() => {
                                if (!id) return;
                                try { localStorage.setItem('session_id', id); } catch (_) { /* noop */ }
                                navigate(`/chat/${id}`);
                              }}
                              title={label}
                            >
                              {label}
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(isMenuOpen ? null : id);
                              }}
                              className="flex-shrink-0 p-1 rounded hover:bg-white/20 transition-colors"
                              title="More options"
                            >
                              <MoreVertical className="w-4 h-4" />
                            </button>
                          </div>
                          
                          {/* Dropdown Menu */}
                          {isMenuOpen && (
                            <div
                              ref={menuRef}
                              className="absolute right-0 top-full mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[120px] overflow-hidden"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setRenameSessionId(id);
                                  setRenameNewTitle(label);
                                  setShowRenameDialog(true);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                              >
                                Rename
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteSessionId(id);
                                  setShowDeleteDialog(true);
                                  setOpenMenuId(null);
                                }}
                                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 transition-colors"
                              >
                                Delete
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
            </div>
          </div>

          {/* Bottom section - Logout (fixed at bottom, outside scroll) */}
          <div className="flex-shrink-0 border-t border-white/10 p-6">
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

      {/* Rename Dialog */}
      {showRenameDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-4">Rename Session</h3>
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Session Name
                </label>
                <input
                  type="text"
                  value={renameNewTitle}
                  onChange={(e) => setRenameNewTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !isRenaming) {
                      handleRenameSession();
                    } else if (e.key === 'Escape') {
                      setShowRenameDialog(false);
                      setRenameSessionId(null);
                      setRenameNewTitle('');
                    }
                  }}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#13008B] focus:border-transparent"
                  placeholder="Enter session name"
                  autoFocus
                  disabled={isRenaming}
                />
              </div>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRenameDialog(false);
                    setRenameSessionId(null);
                    setRenameNewTitle('');
                  }}
                  disabled={isRenaming}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleRenameSession}
                  disabled={isRenaming || !renameNewTitle.trim()}
                  className="px-4 py-2 text-sm font-medium text-white bg-[#13008B] rounded-lg hover:bg-[#0f0068] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isRenaming ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Renaming...
                    </>
                  ) : (
                    'Rename'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4">
            <div className="p-6">
              <h3 className="text-xl font-semibold text-gray-800 mb-2">Delete Session</h3>
              <p className="text-sm text-gray-600 mb-6">
                Are you sure you want to delete this session? This action cannot be undone.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowDeleteDialog(false);
                    setDeleteSessionId(null);
                  }}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDeleteSession}
                  disabled={isDeleting}
                  className="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  {isDeleting ? (
                    <>
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Deleting...
                    </>
                  ) : (
                    'Delete'
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Trial Over Modal */}
      {showTrialOverModal && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 relative">
            {/* Close Button */}
            <button
              onClick={() => setShowTrialOverModal(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 flex items-center justify-center transition-colors"
              title="Close"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"></line>
                <line x1="6" y1="6" x2="18" y2="18"></line>
              </svg>
            </button>

            {/* Modal Content */}
            <div className="p-6 pt-8">
              <div className="text-center mb-6">
                <div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
                  <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Free Trial Expired</h3>
                <p className="text-sm text-gray-600">
                  Your free trial is over. Please contact support to continue using the service.
                </p>
              </div>

              {/* Action Button */}
              <div className="flex justify-center">
                <button
                  onClick={() => setShowTrialOverModal(false)}
                  className="px-6 py-2.5 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0068] transition-colors font-medium"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

export default Sidebar;
