/**
 * Authentication Helper Functions
 * Import these functions in your React components to easily access user data
 */

// Get complete user data from localStorage
export const getUserData = () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  };
  
  // Get user data without sensitive information (for display purposes)
  export const getPublicUserData = () => {
    const user = getUserData();
    if (!user) return null;
    
    // Return user data without token and timestamp
    const { token, timestamp, ...publicData } = user;
    return publicData;
  };
  
  // Get specific user properties
  export const getUserEmail = () => {
    const user = getUserData();
    return user?.email || null;
  };
  
  export const getUserName = () => {
    const user = getUserData();
    return user?.name || null;
  };
  
  export const getUserProvider = () => {
    const user = getUserData();
    return user?.provider || null;
  };
  
  export const getUserPicture = () => {
    const user = getUserData();
    return user?.picture || null;
  };
  
  export const getUserId = () => {
    const user = getUserData();
    return user?.db_user_id || user?.sub || null;
  };
  
  export const getAuthToken = () => {
    const user = getUserData();
    return user?.token || null;
  };
  
  // Check if user is authenticated
  export const isAuthenticated = () => {
    const user = getUserData();
    return !!(user && user.token);
  };
  
  // Clear all user data (useful for logout)
  export const clearUserData = () => {
    localStorage.removeItem('user');
    localStorage.removeItem('oauth_state');
    localStorage.removeItem('oauth_provider');
  };
  
  // Store user data (called after successful authentication)
  export const storeUserData = (user, token) => {
    // Store complete user data in a single object
    const userData = {
      ...user,
      token: token,
      timestamp: new Date().toISOString()
    };
    localStorage.setItem('user', JSON.stringify(userData));
  };
  
  // Get user display name with fallback
  export const getDisplayName = () => {
    return getUserName() || getUserEmail() || 'User';
  };
  
  // Check if user has a profile picture
  export const hasProfilePicture = () => {
    const picture = getUserPicture();
    return picture && picture.trim() !== '';
  };
  
  // Get user initials for avatar fallback
  export const getUserInitials = () => {
    const name = getUserName();
    if (!name) return '?';
    
    const names = name.split(' ');
    if (names.length === 1) return name.charAt(0).toUpperCase();
    
    return (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase();
  };
  
  // Check if user authenticated with specific provider
  export const isProviderUser = (provider) => {
    return getUserProvider() === provider;
  };
  
  // Check if user is Google user
  export const isGoogleUser = () => isProviderUser('google');
  
  // Check if user is Microsoft user
  export const isMicrosoftUser = () => isProviderUser('microsoft');
  
  // Check if user data is fresh (within specified hours)
  export const isUserDataFresh = (hours = 24) => {
    const user = getUserData();
    if (!user || !user.timestamp) return false;
    
    const dataTime = new Date(user.timestamp);
    const now = new Date();
    const diffHours = (now - dataTime) / (1000 * 60 * 60);
    
    return diffHours < hours;
  };
  
  // Get user data age in hours
  export const getUserDataAge = () => {
    const user = getUserData();
    if (!user || !user.timestamp) return null;
    
    const dataTime = new Date(user.timestamp);
    const now = new Date();
    const diffHours = (now - dataTime) / (1000 * 60 * 60);
    
    return diffHours;
  }; 