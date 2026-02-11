"use client"

import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { selectIsAuthenticated } from '../redux/slices/userSlice';
import LoginForm from '../Components/Login/LoginForm';
import SignupForm from '../Components/Login/SignupForm';

const Login = () => {
  const [activeTab, setActiveTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    password: ''
  });

  const navigate = useNavigate();
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Redirect to home if already authenticated
  useEffect(() => {
    if (isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted:', { email, password, type: activeTab });
  };

  const handleGoogleLogin = () => {
    console.log('Google login clicked');
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

  // If already authenticated, show loading while redirecting
  if (isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-200 via-purple-100 to-purple-300 flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-md">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Reel Reports</h1>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-3 mb-8">
          <button
            onClick={() => setActiveTab('login')}
            className={`flex-1 py-3 px-4 text-[0.8rem] rounded-md font-medium transition-colors ${activeTab === 'login'
                ? 'bg-[#5A49FF] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            LOGIN
          </button>
          <button
            onClick={() => setActiveTab('create')}
            className={`flex-1 py-3 px-4 text-[0.8rem] rounded-md font-medium transition-colors ${activeTab === 'create'
                ? 'bg-[#5A49FF] text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
          >
            CREATE AN ACCOUNT
          </button>
        </div>

        {activeTab === 'login' &&
          <LoginForm activeTab={activeTab} setActiveTab={setActiveTab} />
        }

        {activeTab === 'create' &&
          <SignupForm activeTab={activeTab} setActiveTab={setActiveTab} />
        }
      </div>
    </div>
  );
};

export default Login;