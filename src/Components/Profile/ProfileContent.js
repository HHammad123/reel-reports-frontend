import React from 'react'
import { useSelector } from 'react-redux'
import { selectUser, selectIsAuthenticated } from '../../redux/slices/userSlice'

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
        <div className="w-full h-[85vh] rounded-lg p-8 bg-white">
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
