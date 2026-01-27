import React from 'react'
import { useSelector } from 'react-redux'
import { selectUser, selectIsAuthenticated } from '../../redux/slices/userSlice'
import { Wallet, TrendingDown, Coins } from 'lucide-react'

const ProfileContent = ({ userProfile }) => {
  // Redux selectors
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Check localStorage as fallback for authentication
  const [localAuthState, setLocalAuthState] = React.useState(() => {
    try {
      const storedAuth = localStorage.getItem('isAuthenticated');
      const storedUser = localStorage.getItem('user');
      return {
        isAuthenticated: storedAuth === 'true',
        user: storedUser ? JSON.parse(storedUser) : null
      };
    } catch (e) {
      return { isAuthenticated: false, user: null };
    }
  });

  // Use user data from Redux if available, otherwise fall back to userProfile prop or localStorage
  let parsedProfile = userProfile;
  if (!user && userProfile && typeof userProfile === 'string') {
    try {
      parsedProfile = JSON.parse(userProfile);
    } catch (_) {
      parsedProfile = {};
    }
  }

  // Check if we have any user data (Redux, prop, or localStorage)
  const displayUser = user || parsedProfile || localAuthState.user || {};
  const roleLabel = (displayUser.role || displayUser.user_role || displayUser.type || displayUser.account_type || 'User').toString();

  // Check authentication - use Redux if available, otherwise check localStorage
  const effectiveIsAuthenticated = isAuthenticated || localAuthState.isAuthenticated;
  const hasUserData = user || parsedProfile || localAuthState.user;

  const [credits, setCredits] = React.useState(null);

  React.useEffect(() => {
    const fetchCredits = async () => {
      try {
        const token = localStorage.getItem('token');
        const email = displayUser.email;

        if (!token || !email) return;

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
          const currentUser = users.find(u => u.email === email);

          if (currentUser && currentUser.credits_summary) {
            setCredits(currentUser.credits_summary);
          }
        }
      } catch (error) {
        console.error('Failed to fetch credits:', error);
      }
    };

    fetchCredits();
  }, [displayUser.email]);

  // Helper function to get initials
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

  // Only show login message if truly not authenticated AND no user data
  if (!effectiveIsAuthenticated && !hasUserData) {
    return (
      <div className='w-full h-full flex items-center justify-center'>
        <div className="text-center">
          <div className="text-xl text-gray-600 mb-4">Please log in to view your profile</div>
          <div className="text-gray-500">You need to be authenticated to access this page</div>
        </div>
      </div>
    );
  }

  return (
    <div className='w-full h-full'>
      <div className="flex">
        {/* Profile Content */}
        <div className="w-full h-[85vh] overflow-y-scroll  rounded-lg p-8 bg-white">
          {/* Header */}
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Profile</h2>
            <p className="text-gray-600">Manage your account settings and preferences</p>
          </div>

          {/* User Profile Section */}
          <div className="max-w-2xl">
            <h3 className="text-xl font-semibold text-gray-800 mb-8">User Profile</h3>

            {/* Profile Information */}
            <div className="space-y-6">
              {/* Name */}
              <div className="flex justify-between items-center py-4 border-b border-gray-200">
                <span className="text-lg font-medium text-gray-700">Name</span>
                <span className="text-lg font-semibold text-gray-900">
                  {displayUser.display_name || displayUser.name || 'Not provided'}
                </span>
              </div>

              {/* Email */}
              <div className="flex justify-between items-center py-4 border-b border-gray-200">
                <span className="text-lg font-medium text-gray-700">Email</span>
                <span className="text-lg font-semibold text-gray-900">
                  {displayUser.email || 'Not provided'}
                </span>
              </div>

              {/* Avatar */}
              <div className="flex justify-between items-center py-4 border-b border-gray-200">
                <span className="text-lg font-medium text-gray-700">Avatar</span>
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center overflow-hidden">
                  {displayUser.picture ? (
                    <img
                      src={displayUser.picture}
                      alt="Profile"
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <div className="flex w-full h-full items-center justify-center bg-[#F3F4F6] text-[#13008B] font-bold text-lg">
                      {getInitials(displayUser)}
                    </div>
                  )}
                </div>
              </div>

              {/* User ID */}
              <div className="flex justify-between items-center py-4 border-b border-gray-200">
                <span className="text-lg font-medium text-gray-700">User ID</span>
                <span className="text-lg font-semibold text-gray-900">
                  {displayUser.id || displayUser.user_id || 'Not provided'}
                </span>
              </div>

              {/* Role */}
              <div className="flex justify-between items-center py-4 border-b border-gray-200">
                <span className="text-lg font-medium text-gray-700">Role</span>
                <span className="text-lg font-semibold text-gray-900 capitalize">
                  {roleLabel || 'User'}
                </span>
              </div>

              {/* Account Type */}
              <div className="flex justify-between items-center py-4 border-b border-gray-200">
                <span className="text-lg font-medium text-gray-700">Account Type</span>
                <span className="text-lg font-semibold text-gray-900">
                  {displayUser.type || displayUser.account_type || 'Standard'}
                </span>
              </div>

              {/* Company */}
              <div className="flex justify-between items-center py-4 border-b border-gray-200">
                <span className="text-lg font-medium text-gray-700">Company</span>
                <span className="text-lg font-semibold text-gray-900">
                  {displayUser.company || displayUser.organization || 'Not provided'}
                </span>
              </div>

              {/* Credits Summary */}
              {credits && (
                <div className="mt-8">
                  <h4 className="text-xl font-bold text-gray-800 mb-5 flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[#13008B]" />
                    Credits Overview
                  </h4>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Main Balance Card */}
                    <div className="col-span-1 md:col-span-2 bg-gradient-to-r from-[#13008B] to-[#4B3CC4] rounded-2xl p-6 text-white shadow-lg relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-white opacity-5 rounded-full -mr-10 -mt-10"></div>
                      <div className="absolute bottom-0 left-0 w-24 h-24 bg-white opacity-5 rounded-full -ml-10 -mb-10"></div>

                      <div className="relative z-10">
                        <div className="text-blue-100 text-sm font-medium mb-1">Available Balance</div>
                        <div className="flex items-baseline gap-2">
                          <span className="text-4xl font-bold">{credits.credits_balance?.toLocaleString() || 0}</span>
                          <span className="text-blue-200 text-sm">credits</span>
                        </div>
                        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between text-sm text-blue-100">
                          <span>Total Purchased: {credits.credits_purchased?.toLocaleString() || 0}</span>
                          <button className="bg-white/20 hover:bg-white/30 transition-colors px-3 py-1 rounded-lg text-xs font-semibold text-white">
                            Buy More
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Stats Cards */}
                    <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-orange-50 flex items-center justify-center">
                        <TrendingDown className="w-5 h-5 text-orange-500" />
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Consumed</div>
                        <div className="text-lg font-bold text-gray-900">{credits.credits_consumed?.toLocaleString() || 0}</div>
                      </div>
                    </div>

                    <div className="bg-white border border-gray-100 p-4 rounded-xl shadow-sm flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center">
                        <Coins className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <div className="text-gray-500 text-xs font-medium uppercase tracking-wide">Amount Spent</div>
                        <div className="text-lg font-bold text-gray-900">${credits.amount_spent?.toLocaleString() || 0}</div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Edit Profile Button */}
            <div className="mt-8">
              <button className="bg-purple-600 hover:bg-purple-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors">
                Edit Profile
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ProfileContent
