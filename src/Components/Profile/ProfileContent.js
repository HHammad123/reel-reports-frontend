import React from 'react'
import { useSelector } from 'react-redux'
import { selectUser, selectIsAuthenticated } from '../../redux/slices/userSlice'

const ProfileContent = ({userProfile}) => {
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
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center">
                  {displayUser.picture ? (
                    <img 
                      src={displayUser.picture} 
                      alt="Profile" 
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <img 
                      src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 100'%3E%3Ccircle cx='50' cy='50' r='40' fill='%23654321'/%3E%3Ccircle cx='40' cy='40' r='3' fill='%23000'/%3E%3Ccircle cx='60' cy='40' r='3' fill='%23000'/%3E%3Cpath d='M35 60 Q50 70 65 60' stroke='%23000' stroke-width='2' fill='none'/%3E%3C/svg%3E" 
                      alt="Default Avatar" 
                      className="w-8 h-8" 
                    />
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
