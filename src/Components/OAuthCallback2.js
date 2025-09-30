import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { handleOAuthCallback } from '../redux/slices/userSlice';
import toast from 'react-hot-toast';

const OAuthCallback = () => {
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const [isProcessing, setIsProcessing] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Determine which provider from the URL path
    const pathParts = location.pathname.split('/');
    const provider = pathParts[pathParts.length - 1]; // 'google' or 'microsoft'
    
    console.log('OAuth callback for provider:', provider);
    console.log('Full callback URL:', window.location.href);
    console.log('URL search params:', Object.fromEntries(searchParams.entries()));
    
    // Check if we're on the backend URL (this shouldn't happen with proper setup)
    if (window.location.hostname !== window.location.origin.split('//')[1].split(':')[0]) {
      console.warn('OAuth callback received on unexpected domain. This indicates a backend configuration issue.');
      console.warn('Expected frontend domain, but received:', window.location.hostname);
    }
    
    // Extract the code parameter from the URL
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    if (error) {
      console.error('OAuth error:', error);
      setError(`OAuth error: ${error}`);
      setIsProcessing(false);
      return;
    }

    if (!code) {
      console.error('No authorization code received');
      console.error('Available search params:', Array.from(searchParams.keys()));
      setError('No authorization code received');
      setIsProcessing(false);
      return;
    }

    console.log('Authorization code received:', code.substring(0, 10) + '...');
    console.log('State parameter:', state);

    // Process the OAuth callback
    processOAuthCallback(code, state, provider);
  }, [searchParams, location, dispatch, navigate]);

  const processOAuthCallback = async (code, state, provider) => {
    try {
      console.log(`Processing ${provider} OAuth callback with code:`, code);
      
      // Make API call to backend's callback endpoint
      const result = await dispatch(handleOAuthCallback({ 
        code, 
        state, 
        provider 
      }));

      if (handleOAuthCallback.fulfilled.match(result)) {
        console.log('OAuth authentication successful:', result.payload);
        toast.success(`${provider.charAt(0).toUpperCase() + provider.slice(1)} login successful!`);
        
        // Redirect to home page
        navigate('/', { replace: true });
      } else {
        console.error('OAuth authentication failed:', result.payload);
        setError(result.payload || 'OAuth authentication failed');
        setIsProcessing(false);
      }
    } catch (error) {
      console.error('Error processing OAuth callback:', error);
      setError('Failed to process OAuth callback');
      setIsProcessing(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-md w-full space-y-8 p-6">
          <div className="text-center">
            <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100">
              <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 className="mt-6 text-3xl font-bold text-gray-900">Authentication Failed</h2>
            <p className="mt-2 text-sm text-gray-600">{error}</p>
            <div className="mt-6">
              <button
                onClick={() => navigate('/login')}
                className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Return to Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-6">
        <div className="text-center">
          <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
          <h2 className="mt-6 text-3xl font-bold text-gray-900">Processing...</h2>
          <p className="mt-2 text-sm text-gray-600">
            Please wait while we complete your authentication.
          </p>
        </div>
      </div>
    </div>
  );
};

export default OAuthCallback;
