import React, { useEffect, useState, useCallback } from 'react';
import { Play, Image, LogOut, User, Zap, Settings, Crown } from 'lucide-react';
import Sidebar from '../Components/Sidebar';
import Topbar from '../Components/Topbar';
import ProfileSidebar from '../Components/Profile/ProfileSidebar';
import ProfileContent from '../Components/Profile/ProfileContent';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectUser, selectIsAuthenticated } from '../redux/slices/userSlice';
import loadingGif from '../asset/loadingv2.gif';

const API_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1';

const Profile = () => {
  const navigate = useNavigate();
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUserProfile = useCallback(async () => {
    try {
      setLoading(true);
      setError('');

      // Get user_id from token or user object
      const userId = localStorage.getItem('token') || user?.id || user?.user_id || '';

      if (!userId) {
        throw new Error('User ID not found');
      }

      const token = localStorage.getItem('token') || '';
      const response = await fetch(`${API_BASE}/admin/users/${encodeURIComponent(userId)}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to fetch user profile: ${response.status} ${errorText}`);
      }

      const data = await response.json();
      // Handle different response structures
      const profileData = data?.user || data?.data || data;
      setUserProfile(profileData);

      // Also update localStorage for consistency
      try {
        localStorage.setItem('user', JSON.stringify(profileData));
      } catch (e) {
        console.warn('Failed to update localStorage:', e);
      }
    } catch (err) {
      console.error('Error fetching user profile:', err);
      setError(err.message || 'Failed to load user profile');
      // Fallback to localStorage if API fails
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          setUserProfile(JSON.parse(storedUser));
        }
      } catch (e) {
        // ignore
      }
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (localStorage.getItem('auth') === 'false') {
      navigate('/login');
      return;
    }

    // Check authentication from Redux or localStorage
    const localAuth = localStorage.getItem('isAuthenticated') === 'true';
    const token = localStorage.getItem('token');

    // If authenticated (Redux or localStorage) and have token, fetch profile
    if ((isAuthenticated || localAuth) && token) {
      fetchUserProfile();
    } else if (!token) {
      // No token means not logged in
      navigate('/login');
    }
  }, [isAuthenticated, navigate, fetchUserProfile]);

  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
      <Sidebar />
      <div className="flex-1 mx-[2rem] mt-[1rem] min-w-0">
        <Topbar />
        <div className='h-[77vh] my-2 flex items-start justify-start'>
          <ProfileSidebar />
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center h-[77vh] bg-white">
              <img src={loadingGif} alt="Loading..." className="w-16 h-16" />
              <p className="text-[#13008B] mt-2 animate-pulse font-medium">Loading Profile...</p>
            </div>
          ) : error ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <p className="text-red-600 mb-2">Error: {error}</p>
                <button
                  onClick={fetchUserProfile}
                  className="px-4 py-2 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0068] transition-colors"
                >
                  Retry
                </button>
              </div>
            </div>
          ) : (
            <ProfileContent userProfile={userProfile ? JSON.stringify(userProfile) : null} />
          )}
        </div>
      </div>
    </div>
  );
};

export default Profile;