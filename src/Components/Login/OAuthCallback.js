import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import { setUser } from '../../redux/slices/userSlice';
import toast from 'react-hot-toast';

const OAuthCallback = () => {
    const navigate = useNavigate();
    const dispatch = useDispatch();
    const { provider } = useParams();
    
    useEffect(() => {
        const completeOAuth = () => {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                const token = urlParams.get('token');
                const userId = urlParams.get('user_id');
                const email = urlParams.get('email');
                const displayName = urlParams.get('display_name');
                
                if (userId && (token || email)) {
                    // Use user_id as our app token (back-end APIs expect user_id)
                    const appToken = userId;
                    const user = {
                        id: userId,
                        email: email || '',
                        display_name: displayName || email || ''
                    };

                    // Persist: app token and user; store raw JWT separately if present
                    localStorage.setItem('token', appToken);
                    if (token) {
                      try { localStorage.setItem('auth_jwt', token); } catch (_) { /* noop */ }
                    }
                    localStorage.setItem('user', JSON.stringify(user));
                    localStorage.setItem('isAuthenticated', 'true');

                    // Update Redux store
                    dispatch(setUser({ user, token: appToken }));
                    
                    toast.success(`Successfully logged in with ${provider}!`);
                    
                    // Decide post-auth redirect
                    let target = '/';
                    try {
                      const preferred = localStorage.getItem('post_oauth_redirect');
                      if (preferred) {
                        target = preferred;
                        localStorage.removeItem('post_oauth_redirect');
                      }
                    } catch (_) {}
                    // Clean URL and redirect
                    window.history.replaceState({}, document.title, target);
                    navigate(target);
                } else {
                    toast.error('OAuth login failed - missing credentials');
                    navigate('/login');
                }
            } catch (e) {
                console.error('OAuth completion error:', e);
                toast.error('OAuth login failed');
                navigate('/login');
            }
        };
        
        completeOAuth();
    }, [dispatch, navigate, provider]);
    
    return (
        <div className="flex items-center justify-center min-h-screen">
            <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4">Completing login...</p>
            </div>
        </div>
    );
};

export default OAuthCallback;
