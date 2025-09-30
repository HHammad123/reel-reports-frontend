import React, { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import MicrosoftIcon from '../../asset/microsoft.png'
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import axios from 'axios';
import { getAuthToken, storeUserData, clearUserData } from './authHelper';
import toast, { Toaster } from 'react-hot-toast';
import { 
  loginUser, 
  handleOAuthCallback, 
  clearError, 
  selectUser, 
  selectToken, 
  selectIsAuthenticated, 
  selectUserLoading, 
  selectUserError 
} from '../../redux/slices/userSlice';

const AUTH_BASE = 'https://jsauth-dfbpgpdmgughg6aj.centralindia-01.azurewebsites.net';
const OAUTH_BASE = 'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net';

const LoginForm = ({activeTab,setActiveTab}) => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    
    // Redux selectors
    const user = useSelector(selectUser);
    const token = useSelector(selectToken);
    const isAuthenticated = useSelector(selectIsAuthenticated);
    const loading = useSelector(selectUserLoading);
    const error = useSelector(selectUserError);
    
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [validationErrors, setValidationErrors] = useState({});
  
    const validateForm = () => {
      const errors = {};
      
      if (!email.trim()) {
        errors.email = 'Email is required';
      } else if (!/\S+@\S+\.\S+/.test(email)) {
        errors.email = 'Please enter a valid email address';
      }
      
      if (!password.trim()) {
        errors.password = 'Password is required';
      } else if (password.length < 6) {
        errors.password = 'Password must be at least 6 characters long';
      }
      
      setValidationErrors(errors);
      return Object.keys(errors).length === 0;
    };
  
    const handleSubmit = async (e) => {
      e.preventDefault();
      dispatch(clearError());
      setValidationErrors({});
      
      if (!validateForm()) {
        toast.error('Please fix the validation errors');
        return;
      }
      
      console.log('Form submitted:', { email, password, type: activeTab });
      localStorage.setItem('auth', 'true');
      
      // Dispatch Redux action
      const result = await dispatch(loginUser({ email, password }));
      
      if (loginUser.fulfilled.match(result)) {
        toast.success('Login successful!');
        navigate('/');
      } else if (loginUser.rejected.match(result)) {
        // Error is already set in Redux state
        toast.error(result.payload || 'Login failed');
      }
    };

    // OAuth callback handling is now done in the dedicated OAuthCallback component
    // This useEffect has been removed as per the new frontend-only OAuth flow

   
  
    const getCallbackUrl = (provider) => {
      const publicUrl = process.env.PUBLIC_URL || '';
      const base = publicUrl.endsWith('/') ? publicUrl.slice(0, -1) : publicUrl;
      const origin = (typeof window !== 'undefined' && window.location && window.location.origin) ? window.location.origin : '';
      return `${origin}${base}/v1/auth/callback/${provider}`;
    };

    const handleGoogleLogin = async () => {
      try {
          const response = await axios.post(`${OAUTH_BASE}/v1/auth/init`, {
              provider: 'google',
              redirect_uri: getCallbackUrl('google')
          });
          
          if (response.data.auth_url) {
              window.location.href = response.data.auth_url;
          }
      } catch (error) {
          console.error('Google OAuth init failed:', error);
          toast.error('Failed to initiate Google login');
      }
  };
  
  const handleMicrosoftLogin = async () => {
      try {
          const response = await axios.post(`${OAUTH_BASE}/v1/auth/init`, {
              provider: 'microsoft',
              redirect_uri: getCallbackUrl('microsoft')
          });
          
          if (response.data.auth_url) {
              window.location.href = response.data.auth_url;
          }
      } catch (error) {
          console.error('Microsoft OAuth init failed:', error);
          toast.error('Failed to initiate Microsoft login');
      }
  };
  
  useEffect(() => {
    // If user is authenticated, redirect to home
    if (isAuthenticated && user) {
      navigate('/');
    }
  }, [isAuthenticated, user, navigate]);

  useEffect(() => {
    // Show error toast when error changes
    if (error) {
      toast.error(error);
    }
  }, [error]);
      
  
    return (
      <>
        <Toaster 
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#4ade80',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
        
        <div className="space-y-3 mb-6">
          <button
            onClick={handleGoogleLogin}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 py-3 px-4 border bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285f4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34a853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#fbbc05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#ea4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            <span className="text-gray-700 font-medium">
              {loading ? 'Initializing...' : 'Login Using Google'}
            </span>
          </button>

          <button
            onClick={handleMicrosoftLogin}
            disabled={loading}
            className={`w-full flex items-center justify-center gap-3 py-3 px-4 border bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            <img src={MicrosoftIcon} alt="microsoft" className='w-4 h-4' />
            <span className="text-gray-700 font-medium">
              {loading ? 'Initializing...' : 'Login Using Microsoft'}
            </span>
          </button>
        </div>
        
        {/* Error Display */}
        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-600 text-sm">{error}</p>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Enter Email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (validationErrors.email) {
                  setValidationErrors(prev => ({ ...prev, email: null }));
                }
              }}
              className={`w-full py-3 px-4 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                validationErrors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
              }`}
              required
            />
            {validationErrors.email && (
              <p className="mt-1 text-red-500 text-sm">{validationErrors.email}</p>
            )}
          </div>

          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="Enter Password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                if (validationErrors.password) {
                  setValidationErrors(prev => ({ ...prev, password: null }));
                }
              }}
              className={`w-full py-3 px-4 pr-12 bg-gray-50 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${
                validationErrors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
              }`}
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <FaEyeSlash /> : <FaEye />}
            </button>
            {validationErrors.password && (
              <p className="mt-1 text-red-500 text-sm">{validationErrors.password}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className={`w-full bg-[#13008B] hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors ${
              loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {loading ? 'Signing in...' : 'Submit'}
          </button>
        </form>

        {/* Footer */}
        <div className="text-center mt-6">
          <span className="text-gray-600">Don't have a Account, </span>
          <button
            onClick={() => setActiveTab('create')}
            className="text-blue-600 hover:text-blue-700 font-medium"
          >
            Create a Account
          </button>
        </div>
      </>
    )
}

export default LoginForm
