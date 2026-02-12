
import React, { useState, useEffect } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FaBars, FaPlus, FaSignOutAlt, FaWallet } from "react-icons/fa";
import { selectUser, selectIsAuthenticated, logoutUser } from '../redux/slices/userSlice';
import { selectVideoJob } from '../redux/slices/videoJobSlice';
import { useSidebar } from '../Contexts/SidebarContext';
import useBrandAssets from '../hooks/useBrandAssets';

const Topbar = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const videoJob = useSelector(selectVideoJob);
  const { sidebarOpen, toggleSidebar } = useSidebar();
  // Redux selectors
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Fallback to localStorage if Redux state isn't ready yet (for reload scenarios)
  const [localAuthState, setLocalAuthState] = useState(() => {
    try {
      const storedUser = localStorage.getItem('user');
      const storedToken = localStorage.getItem('token');
      const storedAuth = localStorage.getItem('isAuthenticated');
      return {
        user: storedUser ? JSON.parse(storedUser) : null,
        token: storedToken,
        isAuthenticated: storedAuth === 'true' && storedUser && storedToken
      };
    } catch (e) {
      return { user: null, token: null, isAuthenticated: false };
    }
  });

  // Use Redux state if available, otherwise fallback to localStorage
  const effectiveUser = user || localAuthState.user;
  const effectiveIsAuthenticated = isAuthenticated || localAuthState.isAuthenticated;

  // Brand profile state
  const { getBrandProfiles, activateBrandProfile } = useBrandAssets();
  const [profiles, setProfiles] = useState([]);
  const [selectedProfileId, setSelectedProfileId] = useState('');
  const [selectedIsActive, setSelectedIsActive] = useState(false);
  const [isLoadingProfiles, setIsLoadingProfiles] = useState(false);
  const [credits, setCredits] = useState(null);

  // Update local auth state when Redux state changes
  useEffect(() => {
    if (user && isAuthenticated) {
      setLocalAuthState({ user, token: localStorage.getItem('token'), isAuthenticated: true });
    }
  }, [user, isAuthenticated]);

  // Fetch credits
  useEffect(() => {
    const fetchCredits = async () => {
      try {
        const token = localStorage.getItem('token');
        if (!token || !effectiveUser?.email) return;

        const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/admin/users/list', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({})
        });

        if (response.ok) {
          const data = await response.json();
          const users = Array.isArray(data?.users) ? data.users : (Array.isArray(data) ? data : []);
          const currentUser = users.find(u => u.email === effectiveUser.email);
          if (currentUser && currentUser.credits_summary) {
            setCredits(currentUser.credits_summary);
          }
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      }
    };

    if (effectiveIsAuthenticated && effectiveUser) {
      fetchCredits();
    }
  }, [effectiveIsAuthenticated, effectiveUser?.email]);

  // Fetch profiles on mount
  useEffect(() => {
    const fetchProfiles = async () => {
      const userId = localStorage.getItem('token') || '';
      if (!userId || !effectiveIsAuthenticated) return;

      setIsLoadingProfiles(true);
      try {
        const plist = await getBrandProfiles(userId);
        plist.sort((a, b) => (b?.is_active ? 1 : 0) - (a?.is_active ? 1 : 0));
        setProfiles(plist);
        const active = plist.find(p => p.is_active);
        const initial = active ? (active.profile_id || active.id) : (plist[0]?.profile_id || plist[0]?.id || '');
        if (initial) {
          setSelectedProfileId(initial);
          setSelectedIsActive(!!active || !!plist.find(p => (p.profile_id || p.id) === initial)?.is_active);
        }
      } catch (error) {
        console.error('Failed to fetch brand profiles:', error);
      } finally {
        setIsLoadingProfiles(false);
      }
    };

    if (effectiveIsAuthenticated) {
      fetchProfiles();
    }
  }, [effectiveIsAuthenticated, getBrandProfiles]);

  const handleSelectProfile = async (profileId) => {
    if (!profileId) return;
    setSelectedProfileId(profileId);
    const meta = (profiles || []).find(p => (p.profile_id || p.id) === profileId);
    setSelectedIsActive(!!meta?.is_active);
  };

  const handleToggleActive = async () => {
    try {
      const userId = localStorage.getItem('token') || '';
      if (!userId || !selectedProfileId) return;
      if (selectedIsActive) return; // already active

      await activateBrandProfile({ userId, profileId: selectedProfileId });

      // Refresh profiles list
      const plist = await getBrandProfiles(userId);
      plist.sort((a, b) => (b?.is_active ? 1 : 0) - (a?.is_active ? 1 : 0));
      setProfiles(plist);

      const active = plist.find(p => p.is_active);
      const newSelected = active ? (active.profile_id || active.id) : selectedProfileId;
      setSelectedProfileId(newSelected);
      setSelectedIsActive(!!active || selectedIsActive);
    } catch (error) {
      console.error('Failed to activate profile:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await dispatch(logoutUser());
      navigate('/login');
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Get user initials
  const getInitials = (user) => {
    if (!user) return 'RR';

    // Prioritize display_name, then name, then combine first/last name
    const nameToUse = user.display_name || user.name || (user.first_name && user.last_name ? `${user.first_name} ${user.last_name}` : '');

    if (nameToUse) {
      const parts = nameToUse.trim().split(/\s+/);

      // 1 word: first 2 chars
      if (parts.length === 1) {
        return parts[0].slice(0, 2).toUpperCase();
      }
      // 2 words: initial of each (e.g. Harsh Nikharge -> HN)
      if (parts.length === 2) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}`.toUpperCase();
      }
      // 3 words: initial of all three
      if (parts.length === 3) {
        return `${parts[0].charAt(0)}${parts[1].charAt(0)}${parts[2].charAt(0)}`.toUpperCase();
      }
      // > 3 words: initial of first and last word
      if (parts.length > 3) {
        return `${parts[0].charAt(0)}${parts[parts.length - 1].charAt(0)}`.toUpperCase();
      }
    }

    // Fallback to email
    if (user.email) {
      return user.email.slice(0, 2).toUpperCase();
    }

    return 'RR';
  };

  // Don't show Topbar on login or onboarding pages
  if (location.pathname === '/login' || location.pathname === '/onboarding') {
    return null;
  }

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

        {/* Brand Profile List and Set Active */}
        {effectiveIsAuthenticated && effectiveUser && profiles.length > 0 && (
          <div className="hidden md:flex items-center gap-3 rounded-full border border-[#E4E1FF] bg-white px-3 py-1.5 shadow-sm">
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-600">Set as Active:</span>
              <button
                type="button"
                onClick={handleToggleActive}
                disabled={selectedIsActive || !selectedProfileId}
                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors ${selectedIsActive
                  ? 'bg-green-500'
                  : 'bg-gray-300'
                  } ${!selectedProfileId ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
                title={selectedIsActive ? 'Active' : 'Not Active'}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${selectedIsActive ? 'translate-x-4' : 'translate-x-0.5'
                  }`}></span>
              </button>
            </div>
            <div className="h-4 w-px bg-gray-300"></div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-gray-600 whitespace-nowrap">Profile:</label>
              {isLoadingProfiles ? (
                <span className="text-xs text-gray-500">Loading...</span>
              ) : (
                <select
                  value={selectedProfileId}
                  onChange={(e) => handleSelectProfile(e.target.value)}
                  className="border border-gray-300 rounded-md px-2 py-1 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-[#13008B] min-w-[120px]"
                >
                  {(profiles || []).map((p) => (
                    <option key={p.profile_id || p.id} value={p.profile_id || p.id}>
                      {p.profile_name || p.website_url || (p.profile_id || p.id)}{p.is_active ? ' (Active)' : ''}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        )}

        {effectiveIsAuthenticated && effectiveUser ? (
          <div className="flex items-center gap-3">
            <Link to="/profile" className="group inline-flex items-center gap-2 !no-underline hover:!no-underline">
              {credits && credits.credits_balance !== undefined && (
                <div className="hidden md:flex items-center gap-2 mr-2 bg-gradient-to-r from-blue-50 to-indigo-50 px-3 py-1.5 rounded-full border border-blue-100 shadow-sm">
                  <FaWallet className="text-[#13008B] w-3.5 h-3.5" />
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider">Credits</span>
                    <span className="text-sm font-bold text-[#13008B]">{credits.credits_balance.toLocaleString()}</span>
                  </div>
                </div>
              )}
              <div className="h-11 w-11 rounded-full bg-gradient-to-br from-[#FFB347] via-[#FFA13D] to-[#FF8A3D] p-[2px] transition group-hover:from-[#FFA13D] group-hover:to-[#FF6A3D]">
                <div className="flex h-full w-full items-center justify-center overflow-hidden rounded-full bg-white">
                  {effectiveUser.picture ? (
                    <img
                      src={effectiveUser.picture}
                      alt="Profile"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-[#F3F4F6] hover:bg-[#13008B] text-[#13008B] hover:text-[#fff] font-bold text-lg">
                      {getInitials(effectiveUser)}
                    </div>
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
