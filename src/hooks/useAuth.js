import { useSelector, useDispatch } from 'react-redux';
import { 
  selectUser, 
  selectToken, 
  selectIsAuthenticated, 
  selectUserLoading, 
  selectUserError,
  loginUser,
  signupUser,
  logoutUser,
  handleOAuthCallback,
  clearError,
  checkAuthStatus
} from '../redux/slices/userSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  
  // Selectors
  const user = useSelector(selectUser);
  const token = useSelector(selectToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectUserLoading);
  const error = useSelector(selectUserError);

  // Actions
  const login = (credentials) => dispatch(loginUser(credentials));
  const signup = (userData) => dispatch(signupUser(userData));
  const logout = () => dispatch(logoutUser());
  const oauthCallback = (code, state) => dispatch(handleOAuthCallback({ code, state }));
  const clearAuthError = () => dispatch(clearError());
  const checkAuth = () => dispatch(checkAuthStatus());

  return {
    // State
    user,
    token,
    isAuthenticated,
    loading,
    error,
    
    // Actions
    login,
    signup,
    logout,
    oauthCallback,
    clearAuthError,
    checkAuth
  };
};

