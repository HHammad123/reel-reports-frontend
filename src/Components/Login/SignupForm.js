import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import MicrosoftIcon from '../../asset/microsoft.png'
import axios from 'axios';
import { FaEye, FaEyeSlash } from 'react-icons/fa'
import toast, { Toaster } from 'react-hot-toast';
import {
  signupUser,
  clearError,
  selectUserLoading,
  selectUserError
} from '../../redux/slices/userSlice';

const OAUTH_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net';

const SignupForm = ({ activeTab, setActiveTab }) => {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // Redux selectors
  const loading = useSelector(selectUserLoading);
  const error = useSelector(selectUserError);

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const validateForm = () => {
    const errors = {};

    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    }

    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }

    if (!formData.phone.trim()) {
      errors.phone = 'Phone number is required';
    } else if (!/^\+?[\d\s\-\(\)]{10,}$/.test(formData.phone)) {
      errors.phone = 'Please enter a valid phone number';
    }

    if (!formData.password.trim()) {
      errors.password = 'Password is required';
    } else if (formData.password.length < 6) {
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

    console.log('Form submitted:', formData);
    localStorage.setItem('auth', 'true');

    // Dispatch Redux action - new API returns token directly on register
    const result = await dispatch(signupUser({
      name: formData.name,
      email: formData.email,
      password: formData.password
    }));

    if (signupUser.fulfilled.match(result)) {
      toast.success('Account created successfully!');
      navigate('/onboarding');
    } else if (signupUser.rejected.match(result)) {
      toast.error(result.payload || 'Signup failed');
    }
  };

  const handleGoogleSignup = async () => {
    try {
      console.log('Initiating Google OAuth signup...');
      try { localStorage.setItem('post_oauth_redirect', '/onboarding'); } catch (_) { }

      // Step 2: Frontend calls /v1/auth/init to get OAuth URL
      const response = await axios.post(`${OAUTH_BASE}/v1/auth/init`, {
        provider: 'google',
        redirect_uri: window.location.origin + '/signup',
        action: 'signup'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('OAuth init response:', response.data);

      if (response.data.auth_url) {
        // Step 3: User redirects to Google, authorizes
        console.log('Redirecting to Google OAuth:', response.data.auth_url);
        window.location.href = response.data.auth_url;
      } else {
        throw new Error('No auth URL received from OAuth init');
      }
    } catch (error) {
      console.error('Google OAuth signup init failed:', error);
      toast.error('Failed to initiate Google signup. Please try again.');
    }
  };

  const handleMicrosoftSignup = async () => {
    try {
      console.log('Initiating Microsoft OAuth signup...');
      try { localStorage.setItem('post_oauth_redirect', '/onboarding'); } catch (_) { }

      // Step 2: Frontend calls /v1/auth/init to get OAuth URL
      const response = await axios.post(`${OAUTH_BASE}/v1/auth/init`, {
        provider: 'microsoft',
        redirect_uri: window.location.origin + '/signup',
        action: 'signup'
      }, {
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      });

      console.log('OAuth init response:', response.data);

      if (response.data.auth_url) {
        // Step 3: User redirects to Microsoft, authorizes
        console.log('Redirecting to Microsoft OAuth:', response.data.auth_url);
        window.location.href = response.data.auth_url;
      } else {
        throw new Error('No auth URL received from OAuth init');
      }
    } catch (error) {
      console.error('Microsoft OAuth signup init failed:', error);
      toast.error('Failed to initiate Microsoft signup. Please try again.');
    }
  };

  const handleGithubLogin = () => {
    console.log('GitHub login clicked');
  };

  const handleInputChangeCreate = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmitcreate = () => {
    console.log('Form submitted:', formData);
    // Handle form submission here
  };

  const handleSocialLogin = (provider) => {
    console.log(`Login with ${provider}`);
    // Handle social login here
  };

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
          onClick={handleGoogleSignup}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-3 py-3 px-4 border bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          <span className="text-gray-700 font-medium">
            {loading ? 'Initializing...' : 'Signup Using Google'}
          </span>
        </button>

        <button
          onClick={handleMicrosoftSignup}
          disabled={loading}
          className={`w-full flex items-center justify-center gap-3 py-3 px-4 border bg-gray-100 hover:bg-gray-200 rounded-xl transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
        >
          <img src={MicrosoftIcon} alt="microsoft" className='w-4 h-4' />
          <span className="text-gray-700 font-medium">
            {loading ? 'Initializing...' : 'Signup Using Microsoft'}
          </span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-red-600 text-sm">{error}</p>
        </div>
      )}

      {/* Registration Form */}
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <input
              type="text"
              name="name"
              placeholder="Enter Name"
              value={formData.name}
              onChange={(e) => {
                handleInputChangeCreate(e);
                if (validationErrors.name) {
                  setValidationErrors(prev => ({ ...prev, name: null }));
                }
              }}
              className={`w-full py-3 px-4 bg-gray-50 border text-[1rem] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${validationErrors.name ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
                }`}
            />
            {validationErrors.name && (
              <p className="mt-1 text-red-500 text-sm">{validationErrors.name}</p>
            )}
          </div>

          <div>
            <input
              type="email"
              name="email"
              placeholder="Enter Email"
              value={formData.email}
              onChange={(e) => {
                handleInputChangeCreate(e);
                if (validationErrors.email) {
                  setValidationErrors(prev => ({ ...prev, email: null }));
                }
              }}
              className={`w-full py-3 px-4 bg-gray-50 border text-[1rem] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${validationErrors.email ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
                }`}
            />
            {validationErrors.email && (
              <p className="mt-1 text-red-500 text-sm">{validationErrors.email}</p>
            )}
          </div>
        </div>

        <div>
          <input
            type="tel"
            name="phone"
            placeholder="Enter Phone Number"
            value={formData.phone}
            onChange={(e) => {
              handleInputChangeCreate(e);
              if (validationErrors.phone) {
                setValidationErrors(prev => ({ ...prev, phone: null }));
              }
            }}
            className={`w-full py-3 px-4 bg-gray-50 border text-[1rem] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${validationErrors.phone ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
              }`}
          />
          {validationErrors.phone && (
            <p className="mt-1 text-red-500 text-sm">{validationErrors.phone}</p>
          )}
        </div>

        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            name="password"
            placeholder="Enter Password"
            value={formData.password}
            onChange={(e) => {
              handleInputChangeCreate(e);
              if (validationErrors.password) {
                setValidationErrors(prev => ({ ...prev, password: null }));
              }
            }}
            className={`w-full py-3 px-4 pr-12 bg-gray-50 border text-[1rem] rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 ${validationErrors.password ? 'border-red-300 focus:ring-red-500' : 'border-gray-200'
              }`}
          />
          <button
            type="button"
            onClick={() => setShowPassword(p => !p)}
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
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className={`w-full bg-[#13008B] hover:bg-blue-700 text-white font-medium py-3 px-4 rounded-lg transition-colors ${loading ? 'opacity-50 cursor-not-allowed' : ''
            }`}
        >
          {loading ? 'Creating Account...' : 'Submit'}
        </button>
      </div>

      {/* Login Link */}
      <div className="text-center mt-6">
        <span className="text-gray-600">Already have a account, </span>
        <button
          onClick={() => setActiveTab('login')}
          className="text-blue-600 hover:text-blue-700 font-medium"
        >
          Login
        </button>
      </div>
    </>
  )
}

export default SignupForm
