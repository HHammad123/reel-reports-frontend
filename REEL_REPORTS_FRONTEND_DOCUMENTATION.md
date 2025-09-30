# Reel Reports Frontend – Full Code Documentation

_Generated automatically by static analysis of the uploaded repository._

**Files scanned:** 55 within `src/`


## Folder: `reelzip/src`


### File: `App.js`

- **Path:** `reelzip/src/App.js`  
- **Size:** 3505 bytes
- **Exports:** default: `App`; named: —
- **Components detected:** `App`
- **React hooks:** useEffect
- **Redux hooks:** useSelector
- **Router usage:** Route, Routes
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect }` from `react`
  - `{ Routes, Route }` from `react-router-dom`
  - `{ useSelector }` from `react-redux`
  - `{ selectIsAuthenticated, selectUser }` from `./redux/slices/userSlice`
  - `Home` from `./pages/Home`
  - `Login` from `./pages/Login`
  - `Main` from `./pages/Main`
  - `Profile` from `./pages/Profle`
  - `Dashboard` from `./pages/Dashboard`
  - `BrandGuidelines` from `./pages/BrandGuidelines`
  - `Scenesettings` from `./pages/Scenesettings`
  - `Subscription` from `./pages/Subscription`
  - `Result` from `./pages/Result`
  - `Details` from `./pages/Details`
  - `VideoGuidelines` from `./pages/VideoGuidelines`
  - `MyMedia` from `./pages/MyMedia`
  - `BuildReel` from `./pages/BuildReel`
  - `OAuthCallback2` from `./Components/OAuthCallback2`
  - `ProtectedRoute` from `./Components/ProtectedRoute`
  - `OAuthCallback` from `./Components/Login/OAuthCallback`

**Code preview (first 50 lines):**

```jsx

import React, { useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';
import "./App.css"
import { selectIsAuthenticated, selectUser } from './redux/slices/userSlice';
import Home from './pages/Home';
import Login from './pages/Login';
import Main from './pages/Main';

import Profile from './pages/Profle';
import Dashboard from './pages/Dashboard';
import BrandGuidelines from './pages/BrandGuidelines';
import Scenesettings from './pages/Scenesettings';
import Subscription from './pages/Subscription';
import Result from './pages/Result';
import Details from './pages/Details';
import VideoGuidelines from './pages/VideoGuidelines';
import MyMedia from './pages/MyMedia';
import BuildReel from './pages/BuildReel';
import OAuthCallback2 from './Components/OAuthCallback2';
import ProtectedRoute from './Components/ProtectedRoute';
import OAuthCallback from './Components/Login/OAuthCallback';

function App() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  // Debug authentication state
  useEffect(() => {
    console.log('App - Authentication state changed:', { isAuthenticated, user });
  }, [isAuthenticated, user]);

  return (
    <div className="App">
       <Routes>
         {/* Public routes */}
         <Route path="/login" element={<Login/>} />
         <Route path="/onboarding" element={<Details/>}/>
   
       
    <Route path="/v1/auth/callback/:provider" element={<OAuthCallback />} />
         
         {/* Protected routes */}
         <Route path="/" element={
           <ProtectedRoute>
             <Dashboard />
           </ProtectedRoute>
         } />
         <Route path="/chat/:sessionId" element={
```


### File: `App.test.js`

- **Path:** `reelzip/src/App.test.js`  
- **Size:** 246 bytes
- **Exports:** default: `None`; named: —
- **Imports:**
  - `{ render, screen }` from `@testing-library/react`
  - `App` from `./App`

**Code preview (first 50 lines):**

```jsx
import { render, screen } from '@testing-library/react';
import App from './App';

test('renders learn react link', () => {
  render(<App />);
  const linkElement = screen.getByText(/learn react/i);
  expect(linkElement).toBeInTheDocument();
});
```


### File: `index.js`

- **Path:** `reelzip/src/index.js`  
- **Size:** 1208 bytes
- **Exports:** default: `None`; named: —
- **Router usage:** Route
- **Environment vars referenced:** PUBLIC_URL
- **Imports:**
  - `React` from `react`
  - `ReactDOM` from `react-dom/client`
  - `App` from `./App`
  - `reportWebVitals` from `./reportWebVitals`
  - `{ BrowserRouter }` from `react-router-dom`
  - `{ Provider }` from `react-redux`
  - `{ PersistGate }` from `redux-persist/integration/react`
  - `store, { persistor }` from `./redux/store`

**Code preview (first 50 lines):**

```jsx
import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { PersistGate } from 'redux-persist/integration/react';
import store, { persistor } from './redux/store';

const root = ReactDOM.createRoot(document.getElementById('root'));
// Compute a robust basename for BrowserRouter (root deployment)
const computeBaseName = () => {
  const envBase = process.env.PUBLIC_URL;
  if (envBase && typeof envBase === 'string' && envBase.trim()) return envBase;
  return '/';
};
const BASENAME = computeBaseName();
root.render(
  <React.StrictMode>
    <Provider store={store}>
      <PersistGate loading={null} persistor={persistor}>
        <BrowserRouter basename={BASENAME}>
          <App />
        </BrowserRouter>
      </PersistGate>
    </Provider>
  </React.StrictMode>
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
reportWebVitals();
```


### File: `reportWebVitals.js`

- **Path:** `reelzip/src/reportWebVitals.js`  
- **Size:** 362 bytes
- **Exports:** default: `reportWebVitals`; named: —

**Code preview (first 50 lines):**

```jsx
const reportWebVitals = onPerfEntry => {
  if (onPerfEntry && onPerfEntry instanceof Function) {
    import('web-vitals').then(({ getCLS, getFID, getFCP, getLCP, getTTFB }) => {
      getCLS(onPerfEntry);
      getFID(onPerfEntry);
      getFCP(onPerfEntry);
      getLCP(onPerfEntry);
      getTTFB(onPerfEntry);
    });
  }
};

export default reportWebVitals;
```


### File: `setupTests.js`

- **Path:** `reelzip/src/setupTests.js`  
- **Size:** 241 bytes
- **Exports:** default: `None`; named: —

**Code preview (first 50 lines):**

```jsx
// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
```


## Folder: `reelzip/src/Components`


### File: `Chat.js`

- **Path:** `reelzip/src/Components/Chat.js`  
- **Size:** 195454 bytes
- **Exports:** default: `Chat`; named: —
- **React hooks:** useCallback, useEffect, useRef, useState
- **Redux hooks:** useDispatch
- **Router usage:** Link
- **HTTP libs:** fetch
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useState, useRef, useEffect }` from `react`
  - `{ useDispatch }` from `react-redux`
  - `{ setJob }` from `../redux/slices/videoJobSlice`
  - `{ Upload, Paperclip, FileText, Camera, Send, File, X, GripVertical, Check, Maximize2, RefreshCcw, ChevronLeft, ChevronRight, Copy as CopyIcon, ThumbsUp, ThumbsDown, MoreHorizontal, Trash2 }` from `lucide-react`
  - `{ FaChartBar, FaUser }` from `react-icons/fa`
  - `{ Link }` from `react-router-dom`
  - `{ CiPen }` from `react-icons/ci`
  - `{ formatAIResponse }` from `../utils/formatting`

**Code preview (first 50 lines):**

```jsx
import React, { useState, useRef, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { setJob } from '../redux/slices/videoJobSlice';
import { Upload, Paperclip, FileText, Camera, Send, File, X, GripVertical, Check, Maximize2, RefreshCcw, ChevronLeft, ChevronRight, Copy as CopyIcon, ThumbsUp, ThumbsDown, MoreHorizontal, Trash2 } from 'lucide-react';
import { FaChartBar, FaUser } from 'react-icons/fa';
import { Link } from 'react-router-dom';
import { CiPen } from 'react-icons/ci';
import { formatAIResponse } from '../utils/formatting';

const Chat = ({ addUserChat, userChat, setuserChat, sendUserSessionData, chatHistory, setChatHistory, isChatLoading = false }) => {
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [thinkingMessageId, setThinkingMessageId] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isSubmittingSummary, setIsSubmittingSummary] = useState(false);
  const [isSummarizing, setIsSummarizing] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isGeneratingScript, setIsGeneratingScript] = useState(false);
  const [isGeneratingQuestionnaire, setIsGeneratingQuestionnaire] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [showShortGenPopup, setShowShortGenPopup] = useState(false);
  const dispatch = useDispatch();
  const [videoCountdown, setVideoCountdown] = useState(0);
  const fileInputRef = useRef(null);
  const chatInputRef = useRef(null);
  const messagesContainerRef = useRef(null);
  const [showScriptModal, setShowScriptModal] = useState(false);
  const [scriptRows, setScriptRows] = useState([]);
  const [expandedRows, setExpandedRows] = useState({});
  const [draggedRowIndex, setDraggedRowIndex] = useState(null);
  const [dragOverRowIndex, setDragOverRowIndex] = useState(null);
  // New: drag state for scene tabs
  const [draggedTabIndex, setDraggedTabIndex] = useState(null);
  const [dragOverTabIndex, setDragOverTabIndex] = useState(null);
  const [hasOrderChanged, setHasOrderChanged] = useState(false);

  // Move scene left/right utilities for tab controls
  const moveSceneLeft = (index) => {
    try {
      if (!Array.isArray(scriptRows) || index <= 0) return;
      const newOrder = [...scriptRows];
      const tmp = newOrder[index - 1];
      newOrder[index - 1] = newOrder[index];
      newOrder[index] = tmp;
      setScriptRows(newOrder);
      setHasOrderChanged(true);
      setCurrentSceneIndex(index - 1);
    } catch (_) { /* noop */ }
  };
```


### File: `DynamicQuestion.js`

- **Path:** `reelzip/src/Components/DynamicQuestion.js`  
- **Size:** 20382 bytes
- **Exports:** default: `DynamicQuestion`; named: —
- **React hooks:** useEffect, useState
- **HTTP libs:** fetch
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useState, useEffect }` from `react`
  - `{ ArrowRight, CheckCircle, Circle, ArrowLeft }` from `lucide-react`

**Code preview (first 50 lines):**

```jsx
import React, { useState, useEffect } from 'react';
import { ArrowRight, CheckCircle, Circle, ArrowLeft } from 'lucide-react';

const DynamicQuestion = ({ onNextStep, onPreviousStep, questionsData }) => {
  const [questions, setQuestions] = useState([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [selectedOption, setSelectedOption] = useState({});
  const [otherInputs, setOtherInputs] = useState({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [progress, setProgress] = useState(0);
  const [hasGeneratedScript, setHasGeneratedScript] = useState(() => {
    try {
      return (
        localStorage.getItem('has_generated_script') === 'true' ||
        !!localStorage.getItem('last_generated_script')
      );
    } catch (_) { return false; }
  });


  useEffect(() => {
    // Initialize from parent-provided data only; do not call API here
    try {
      setIsLoading(true);
      setError(null);
      // Sync generated script flag from storage in case user navigated away and back
      try {
        const had = (
          localStorage.getItem('has_generated_script') === 'true' ||
          !!localStorage.getItem('last_generated_script')
        );
        if (had) setHasGeneratedScript(true);
      } catch (_) { /* noop */ }
      const data = questionsData || {};
      const rawQuestions = data?.questions || data?.questionnaire || data?.items || [];
      const normalized = rawQuestions.map((q, index) => {
        const optionsArray = Array.isArray(q?.options) ? q.options : [];
        return {
          id: q?.id ?? index + 1,
          question: q?.question || q?.text || '',
          type: optionsArray.length > 0 ? 'multiple_choice' : 'text',
          options: optionsArray.map(opt =>
            typeof opt === 'string' ? opt : (opt?.text ?? String(opt))
          ),
          required: q?.required ?? true
        };
      });
```


### File: `ErrorBoundary.js`

- **Path:** `reelzip/src/Components/ErrorBoundary.js`  
- **Size:** 1779 bytes
- **Exports:** default: `ErrorBoundary`; named: —
- **Styling:** Tailwind classes detected
- **Environment vars referenced:** NODE_ENV
- **Imports:**
  - `React` from `react`

**Code preview (first 50 lines):**

```jsx
import React from 'react';

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    // Update state so the next render will show the fallback UI.
    return { hasError: true };
  }

  componentDidCatch(error, errorInfo) {
    // You can also log the error to an error reporting service
    console.error('Error caught by boundary:', error, errorInfo);
    this.setState({
      error: error,
      errorInfo: errorInfo
    });
  }

  render() {
    if (this.state.hasError) {
      // You can render any custom fallback UI
      return (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
          <h2 className="text-lg font-semibold text-red-800 mb-2">Something went wrong</h2>
          <p className="text-red-600 mb-4">
            An error occurred in the Chat component. Please try refreshing the page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Refresh Page
          </button>
          {process.env.NODE_ENV === 'development' && this.state.error && (
            <details className="mt-4 text-sm text-red-700">
              <summary>Error Details (Development)</summary>
              <pre className="mt-2 p-2 bg-red-100 rounded overflow-auto">
                {this.state.error.toString()}
                {this.state.errorInfo && this.state.errorInfo.componentStack}
              </pre>
            </details>
          )}
        </div>
      );
    }

```


### File: `GeneratedChatFlow.js`

- **Path:** `reelzip/src/Components/GeneratedChatFlow.js`  
- **Size:** 3602 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useEffect, useRef, useState
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect, useState, useRef }` from `react`
  - `{ formatAIResponse }` from `../utils/formatting`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect, useState, useRef } from 'react'
import { formatAIResponse } from '../utils/formatting';

// A focused chat-like renderer for the 4-step post-generation flow.
// It consumes existing APIs and app state via globals/localStorage and posts AI messages.

const GeneratedChatFlow = () => {
  const [messages, setMessages] = useState([]);
  const [isBusy, setIsBusy] = useState(false);
  const scroller = useRef(null);

  const appendAi = (content, extras = {}) => {
    setMessages(prev => [...prev, { id: Date.now(), type: 'ai', content, timestamp: new Date().toISOString(), ...extras }]);
  };

  useEffect(() => {
    if (scroller.current) scroller.current.scrollTop = scroller.current.scrollHeight;
  }, [messages]);

  useEffect(() => {
    const run = async () => {
      setIsBusy(true);
      try {
        // Step 1: Confirm script generated
        const script = JSON.parse(localStorage.getItem('last_generated_script') || 'null');
        if (script) {
          appendAi('Your script is ready. You can view it or generate the video.', { script });
        }

        // Step 2: Show guidelines summary if available
        const guidelines = JSON.parse(localStorage.getItem('guidelines_payload') || 'null');
        if (guidelines) {
          appendAi('Loaded your video guidelines for reference.');
        }

        // Step 3: Include dynamic answers summary
        const dyn = JSON.parse(localStorage.getItem('dynamic_answers') || 'null');
        if (dyn && Array.isArray(dyn)) {
          appendAi('Captured your questionnaire responses.');
        }

        // Step 4: Provide next actions
        appendAi('Use the buttons below to proceed.');
      } finally {
        setIsBusy(false);
      }
    };
    run();
  }, []);

```


### File: `GeneratedScriptMessage.js`

- **Path:** `reelzip/src/Components/GeneratedScriptMessage.js`  
- **Size:** 1856 bytes
- **Exports:** default: `None`; named: —
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React` from `react`

**Code preview (first 50 lines):**

```jsx
import React from 'react'

const GeneratedScriptMessage = ({ message }) => {
  const openScriptModal = () => {
    try {
      const scriptText = typeof message.script === 'string' ? message.script : JSON.stringify(message.script, null, 2);
      const modal = document.getElementById('script-modal');
      const modalContent = document.getElementById('script-modal-content');
      if (modal && modalContent) {
        modalContent.textContent = scriptText;
        modal.classList.remove('hidden');
      } else {
        alert(scriptText);
      }
    } catch (e) { /* noop */ }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="max-w-xs lg:max-w-md px-4 py-2 rounded-lg bg-gray-100 text-gray-800">
        <p className="text-sm">Your script is ready. You can view it or generate the video.</p>
        <p className="text-xs opacity-70 mt-1">{new Date(message.timestamp).toLocaleTimeString()}</p>
      </div>
      <div className="flex gap-2">
        <button 
          onClick={() => {
            if (window.startVideoGeneration) {
              window.startVideoGeneration();
            }
          }} 
          className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          <span className="text-sm font-medium text-gray-900">Generate Video</span>
        </button>
        <button 
          onClick={openScriptModal} 
          className="flex items-center justify-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
        >
          <span className="text-sm font-medium text-gray-900">View Script</span>
        </button>
      </div>
    </div>
  )
}

export default GeneratedScriptMessage


```


### File: `OAuthCallback2.js`

- **Path:** `reelzip/src/Components/OAuthCallback2.js`  
- **Size:** 5152 bytes
- **Exports:** default: `OAuthCallback`; named: —
- **React hooks:** useEffect, useState
- **Redux hooks:** useDispatch
- **Router usage:** useLocation, useNavigate
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect, useState }` from `react`
  - `{ useNavigate, useSearchParams, useLocation }` from `react-router-dom`
  - `{ useDispatch }` from `react-redux`
  - `{ handleOAuthCallback }` from `../redux/slices/userSlice`
  - `toast` from `react-hot-toast`

**Code preview (first 50 lines):**

```jsx
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
```


### File: `ProtectedRoute.js`

- **Path:** `reelzip/src/Components/ProtectedRoute.js`  
- **Size:** 1176 bytes
- **Exports:** default: `ProtectedRoute`; named: —
- **React hooks:** useEffect
- **Redux hooks:** useDispatch, useSelector
- **Router usage:** Route, useLocation
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect }` from `react`
  - `{ Navigate, useLocation }` from `react-router-dom`
  - `{ useSelector, useDispatch }` from `react-redux`
  - `{ selectIsAuthenticated, selectUserLoading }` from `../redux/slices/userSlice`
  - `{ restoreAuthState }` from `../redux/slices/userSlice`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { selectIsAuthenticated, selectUserLoading } from '../redux/slices/userSlice';
import { restoreAuthState } from '../redux/slices/userSlice';

const ProtectedRoute = ({ children }) => {
  const dispatch = useDispatch();
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const loading = useSelector(selectUserLoading);
  const location = useLocation();

  // Restore authentication state from localStorage on component mount
  useEffect(() => {
    if (!isAuthenticated && !loading) {
      dispatch(restoreAuthState());
    }
  }, [dispatch, isAuthenticated, loading]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600"></div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirect to login page with the return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
```


### File: `Sidebar.js`

- **Path:** `reelzip/src/Components/Sidebar.js`  
- **Size:** 10142 bytes
- **Exports:** default: `Sidebar`; named: —
- **React hooks:** useCallback, useEffect, useState
- **Redux hooks:** useDispatch, useSelector
- **Router usage:** Link, useLocation, useNavigate
- **HTTP libs:** fetch
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React` from `react`
  - `{ useCallback, useState }` from `react`
  - `{ useDispatch, useSelector }` from `react-redux`
  - `{ FaImage, FaPlay, FaThLarge }` from `react-icons/fa`
  - `{ IoMdLogOut }` from `react-icons/io`
  - `{ Link, useLocation, useNavigate }` from `react-router-dom`
  - `{ logoutUser, selectUser, selectIsAuthenticated }` from `../redux/slices/userSlice`
  - `LogoImage` from `../asset/mainLogo.png`

**Code preview (first 50 lines):**

```jsx
import React from 'react'
import { useCallback, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FaImage, FaPlay, FaThLarge } from "react-icons/fa";
import { IoMdLogOut } from "react-icons/io";
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { logoutUser, selectUser, selectIsAuthenticated } from '../redux/slices/userSlice';
import LogoImage from "../asset/mainLogo.png"

const Sidebar = () => {
   const [sidebarOpen, setSidebarOpen] = useState(false);
   const location = useLocation();
   const navigate = useNavigate();
   const dispatch = useDispatch();
   
   // Redux selectors
   const user = useSelector(selectUser);
   const isAuthenticated = useSelector(selectIsAuthenticated);
   
   const { pathname } = location;
   const splitLocation = pathname.split("/");
   const activeClass = "w-full bg-[#13008B] bg-opacity-90 rounded-lg p-4 flex items-center gap-3 text-left hover:bg-opacity-100 transition-colors mb-4";
   const inactiveClass = "w-full bg-opacity-70 rounded-lg p-4 flex items-center gap-3 text-left hover:bg-opacity-90 transition-colors";
  // Sessions state for chat history
  const [sessions, setSessions] = useState([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);
  const [sessionsError, setSessionsError] = useState('');

  const fetchSessions = useCallback(async () => {
      try {
        setIsLoadingSessions(true);
        setSessionsError('');
        // Prefer token from localStorage, fallback to redux user id
        const token = localStorage.getItem('token') || user?.id || user?.user_id || '';
        if (!token) {
          setSessions([]);
          return;
        }
        const body = { user_id: token };
        const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/users/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        });
        const text = await resp.text();
        let data; try { data = JSON.parse(text); } catch (_) { data = text; }
        if (!resp.ok) throw new Error(`users/sessions failed: ${resp.status} ${text}`);
        const list = Array.isArray(data?.sessions) ? data.sessions : [];
        setSessions(list);
        try { localStorage.setItem('user_sessions', JSON.stringify(list)); } catch (_) { /* noop */ }
```


### File: `Topbar.js`

- **Path:** `reelzip/src/Components/Topbar.js`  
- **Size:** 5022 bytes
- **Exports:** default: `Topbar`; named: —
- **React hooks:** useState
- **Redux hooks:** useDispatch, useSelector
- **Router usage:** Link, useNavigate
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React` from `react`
  - `{ useState }` from `react`
  - `{ Link, useNavigate }` from `react-router-dom`
  - `{ useSelector, useDispatch }` from `react-redux`
  - `{ FaPlus, FaSignOutAlt }` from `react-icons/fa`
  - `{ selectUser, selectIsAuthenticated, logoutUser }` from `../redux/slices/userSlice`
  - `{ selectVideoJob }` from `../redux/slices/videoJobSlice`

**Code preview (first 50 lines):**

```jsx

import React from 'react'
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FaPlus, FaSignOutAlt } from "react-icons/fa";
import { selectUser, selectIsAuthenticated, logoutUser } from '../redux/slices/userSlice';
import { selectVideoJob } from '../redux/slices/videoJobSlice';

const Topbar = () => {
     const [sidebarOpen, setSidebarOpen] = useState(false);
     const dispatch = useDispatch();
     const navigate = useNavigate();
     const videoJob = useSelector(selectVideoJob);
     // Redux selectors
     const user = useSelector(selectUser);
     const isAuthenticated = useSelector(selectIsAuthenticated);
     
     const handleLogout = async () => {
       try {
         await dispatch(logoutUser());
         navigate('/login');
       } catch (error) {
         console.error('Logout failed:', error);
       }
     };
     
     return (
       <div>
          {/* Header */}
           <div className="bg-white border-b border-gray-200 px-4 rounded-lg lg:px-8 py-4 h-[9vh] flex-shrink-0">
             <div className="flex items-center justify-between">
               <div className="flex items-center gap-4">
                 <button 
                   className="lg:hidden p-2 rounded-md hover:bg-gray-100"
                   onClick={() => setSidebarOpen(true)}
                 >
                   <div className="w-6 h-6 flex flex-col justify-center space-y-1">
                     <div className="w-full h-0.5 bg-gray-600"></div>
                     <div className="w-full h-0.5 bg-gray-600"></div>
                     <div className="w-full h-0.5 bg-gray-600"></div>
                   </div>
                 </button>
                 <h1 className="text-xl lg:text-xl font-semibold text-gray-900">Welcome to Reel Reports</h1>
               </div>
               <div className="flex items-center gap-3">
               {videoJob?.jobId && videoJob.status !== 'failed' && videoJob.status !== 'succeeded' && (
                 <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full border bg-white border-gray-200 text-sm text-gray-700">
                   <span className="font-medium">Video:</span>
                   <span className={videoJob.status==='succeeded' ? 'text-green-700' : videoJob.status==='failed' ? 'text-red-700' : 'text-blue-700'}>
```


### File: `Typetabs.js`

- **Path:** `reelzip/src/Components/Typetabs.js`  
- **Size:** 1150 bytes
- **Exports:** default: `Typetabs`; named: —
- **React hooks:** useState
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React` from `react`
  - `{ useState }` from `react`

**Code preview (first 50 lines):**

```jsx
import React from 'react'
import { useState } from 'react';

const Typetabs = () => {
  const [activeTab, setActiveTab] = useState('Hybrid Video');
     const videoTypes = [
       'Hybrid Video',
    'Avatar Video',
    'Infographics Video', 
    'Financial Video',
   
  ];

  return (
    <div className=''>
      {/* Video Type Tabs */}
        <div className=" border-b border-gray-200 px-4 lg:px-6 py-2">
          <div className="flex gap-2 justify-between  overflow-x-auto scrollbar-hide">
            {videoTypes.map((type) => (
              <button
                key={type}
                onClick={() => setActiveTab(type)}
                className={`px-4 lg:px-4 py-2 lg:py-2 rounded-lg whitespace-nowrap text-sm lg:text-[1rem] font-medium transition-colors ${
                  activeTab === type
                    ? 'bg-[#13008B] text-white'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                }`}
              >
                {type}
              </button>
            ))}
          </div>
        </div>
    </div>
  )
}

export default Typetabs;
```


## Folder: `reelzip/src/Components/BrandAssets`


### File: `BrandAssetsDisplay.jsx`

- **Path:** `reelzip/src/Components/BrandAssets/BrandAssetsDisplay.jsx`  
- **Size:** 2977 bytes
- **Exports:** default: `BrandAssetsDisplay`; named: —
- **Components detected:** `BrandAssetsDisplay`, `BrandAssetsDisplay`
  - Props signature for `BrandAssetsDisplay`: { userId, autoLoad = true }
  - Props signature for `BrandAssetsDisplay`: { userId, autoLoad = true }
- **React hooks:** useEffect
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect }` from `react`
  - `useBrandAssets` from `../../hooks/useBrandAssets`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect } from 'react';
import useBrandAssets from '../../hooks/useBrandAssets';

export default function BrandAssetsDisplay({ userId, autoLoad = true }) {
  const { assets, loading, error, getBrandAssets } = useBrandAssets();

  useEffect(() => { if (autoLoad && userId) getBrandAssets(userId); }, [autoLoad, userId]);

  const logos = assets?.logos || [];
  const icons = assets?.icons || [];
  const voices = assets?.voiceovers || assets?.voiceover || assets?.voices || [];
  const fonts = assets?.fonts || [];
  const colors = assets?.colors || [];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="font-semibold">Your Brand Assets</h4>
        <button onClick={() => userId && getBrandAssets(userId)} className="text-sm px-3 py-1.5 rounded bg-gray-100 hover:bg-gray-200">Refresh</button>
      </div>
      {loading && <div className="text-sm text-gray-600">Loading…</div>}
      {error && <div className="text-sm text-red-600">{error}</div>}

      {(voices && voices.length > 0) && (
        <div>
          <h5 className="font-medium mb-2">Voiceovers</h5>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {voices.map((v, i) => (
              <div key={i} className="p-2 border rounded-lg flex items-center gap-3">
                <audio src={typeof v === 'string' ? v : (v.url || '')} controls className="flex-1" />
              </div>
            ))}
          </div>
        </div>
      )}

      {(logos && logos.length > 0) && (
        <div>
          <h5 className="font-medium mb-2">Logos</h5>
          <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
            {logos.map((u, i) => (
              <img key={i} src={typeof u === 'string' ? u : (u.url || '')} alt={`logo-${i}`} className="w-full h-16 object-contain border rounded" />
            ))}
          </div>
        </div>
      )}

      {(icons && icons.length > 0) && (
        <div>
          <h5 className="font-medium mb-2">Icons</h5>
```


### File: `BrandAssetsForm.jsx`

- **Path:** `reelzip/src/Components/BrandAssets/BrandAssetsForm.jsx`  
- **Size:** 3919 bytes
- **Exports:** default: `BrandAssetsForm`; named: —
- **Components detected:** `BrandAssetsForm`, `BrandAssetsForm`
  - Props signature for `BrandAssetsForm`: { userId, showSections = { logos: true, icons: true, voiceovers: true } }
  - Props signature for `BrandAssetsForm`: { userId, showSections = { logos: true, icons: true, voiceovers: true } }
- **React hooks:** useMemo, useState
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useMemo, useState }` from `react`
  - `useBrandAssets` from `../../hooks/useBrandAssets`
  - `FileUpload` from `./FileUpload`

**Code preview (first 50 lines):**

```jsx
import React, { useMemo, useState } from 'react';
import useBrandAssets from '../../hooks/useBrandAssets';
import FileUpload from './FileUpload';

export default function BrandAssetsForm({ userId, showSections = { logos: true, icons: true, voiceovers: true } }) {
  const { loading, error, uploadBrandAssets } = useBrandAssets();
  const [fonts, setFonts] = useState('');
  const [colors, setColors] = useState('');
  const [captionLocation, setCaptionLocation] = useState('');
  const [logoFiles, setLogoFiles] = useState([]);
  const [iconFiles, setIconFiles] = useState([]);
  const [voiceFiles, setVoiceFiles] = useState([]);
  const [message, setMessage] = useState('');

  const fontList = useMemo(() => fonts.split(',').map(s => s.trim()).filter(Boolean), [fonts]);
  const colorList = useMemo(() => colors.split(',').map(s => s.trim()).filter(Boolean), [colors]);

  const onSubmit = async (e) => {
    e.preventDefault(); setMessage('');
    try {
      const files = { logos: logoFiles, icons: iconFiles, voiceovers: voiceFiles };
      const payload = { userId, fonts: fontList, colors: colorList };
      if (captionLocation) {
        try { payload.caption_location = JSON.parse(captionLocation); }
        catch { payload.caption_location = captionLocation; }
      }
      payload.files = files;
      await uploadBrandAssets(payload);
      setMessage('Uploaded successfully');
      // Clear file selections but keep text inputs
      setLogoFiles([]); setIconFiles([]); setVoiceFiles([]);
    } catch (e2) {
      setMessage(e2?.message || 'Upload failed');
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium mb-1">Fonts (comma separated)</label>
          <input value={fonts} onChange={(e) => setFonts(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="Poppins, Inter" />
        </div>
        <div>
          <label className="block text-sm font-medium mb-1">Colors (comma separated)</label>
          <input value={colors} onChange={(e) => setColors(e.target.value)} className="w-full border rounded px-3 py-2" placeholder="#000000, #FFFFFF" />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">Caption Location (JSON)</label>
```


### File: `FileUpload.jsx`

- **Path:** `reelzip/src/Components/BrandAssets/FileUpload.jsx`  
- **Size:** 3100 bytes
- **Exports:** default: `FileUpload`; named: —
- **Components detected:** `FileUpload`, `FileUpload`
  - Props signature for `FileUpload`: {
  label = 'Upload Files', accept = '*/*', multiple = true, maxSizeMB = 50, fileTypes = [], onFilesChange, }
  - Props signature for `FileUpload`: {
  label = 'Upload Files', accept = '*/*', multiple = true, maxSizeMB = 50, fileTypes = [], onFilesChange, }
- **React hooks:** useEffect, useRef, useState
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect, useRef, useState }` from `react`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect, useRef, useState } from 'react';

export default function FileUpload({
  label = 'Upload Files',
  accept = '*/*',
  multiple = true,
  maxSizeMB = 50,
  fileTypes = [],
  onFilesChange,
}) {
  const [files, setFiles] = useState([]);
  const [errors, setErrors] = useState([]);
  const inputRef = useRef(null);

  const validate = (file) => {
    const errs = [];
    if (fileTypes.length > 0 && !fileTypes.some(t => (file.type || '').includes(t) || (file.name || '').toLowerCase().endsWith(t))) {
      errs.push(`Unsupported type: ${file.type || file.name}`);
    }
    const maxBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxBytes) errs.push(`File too large: ${(file.size/1024/1024).toFixed(1)}MB > ${maxSizeMB}MB`);
    return errs;
  };

  const addFiles = (list) => {
    const arr = Array.from(list || []);
    const next = [...files];
    const errs = [];
    arr.forEach(f => {
      const e = validate(f);
      if (e.length === 0) next.push(f); else errs.push(...e);
    });
    setFiles(next);
    setErrors(errs);
  };

  const onInputChange = (e) => addFiles(e.target.files);
  const onDrop = (e) => { e.preventDefault(); addFiles(e.dataTransfer.files); };
  const onDragOver = (e) => e.preventDefault();

  useEffect(() => { if (onFilesChange) onFilesChange(files); }, [files]);

  return (
    <div>
      <div
        onDrop={onDrop}
        onDragOver={onDragOver}
        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors"
      >
        <p className="text-sm text-gray-700 mb-2">{label}</p>
```


## Folder: `reelzip/src/Components/BrandGuidelines`


### File: `BrandArea.js`

- **Path:** `reelzip/src/Components/BrandGuidelines/BrandArea.js`  
- **Size:** 309 bytes
- **Exports:** default: `None`; named: —
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React` from `react`
  - `Brandimages` from `./Brandimages`

**Code preview (first 50 lines):**

```jsx
import React from 'react'
import Brandimages from './Brandimages'

const BrandArea = () => {
  return (
    <div className='w-full h-full'>
    <div className=" flex">

    <div className="w-full h-[85vh] rounded-lg p-8 bg-white">
     <Brandimages />
    </div>
 </div>
</div>
  )
}

export default BrandArea
```


### File: `Brandimages.js`

- **Path:** `reelzip/src/Components/BrandGuidelines/Brandimages.js`  
- **Size:** 20435 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useEffect, useRef, useState
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect, useRef, useState }` from `react`
  - `{ ChevronDown, Plus }` from `lucide-react`
  - `useBrandAssets` from `../../hooks/useBrandAssets`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect, useRef, useState } from 'react'
import { ChevronDown, Plus } from 'lucide-react'
import useBrandAssets from '../../hooks/useBrandAssets'

const Brandimages = () => {
  const fileInputRef = useRef(null)
  const { getBrandAssets, uploadBrandAssets } = useBrandAssets()
  const [logos, setLogos] = useState([])
  const [icons, setIcons] = useState([])
  const [fonts, setFonts] = useState([])
  const [colors, setColors] = useState([])
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [targetType, setTargetType] = useState('logos') // 'logos' | 'icons'
  const [selectedFiles, setSelectedFiles] = useState([])
  const [previewUrls, setPreviewUrls] = useState([])
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  // Fonts modal state
  const [isFontsModalOpen, setIsFontsModalOpen] = useState(false)
  const [workingFonts, setWorkingFonts] = useState([])
  const [newFont, setNewFont] = useState('')
  const availableFonts = [
    'Arial','Helvetica','Times New Roman','Georgia','Verdana','Roboto','Open Sans','Lato','Montserrat','Poppins','Inter','Nunito','Source Sans Pro','Merriweather'
  ]
  const [selectedFontOption, setSelectedFontOption] = useState(availableFonts[0])
  const [isSavingFonts, setIsSavingFonts] = useState(false)
  const [fontsError, setFontsError] = useState('')
  // Colors modal state
  const [isColorsModalOpen, setIsColorsModalOpen] = useState(false)
  const [workingColors, setWorkingColors] = useState([])
  const [newColor, setNewColor] = useState('#4f46e5')
  const [isSavingColors, setIsSavingColors] = useState(false)
  const [colorsError, setColorsError] = useState('')

  useEffect(() => {
    const userId = (typeof window !== 'undefined' && localStorage.getItem('token')) ? localStorage.getItem('token') : ''
    if (!userId) return
    ;(async () => {
      const data = await getBrandAssets(userId)
      const a = data || {}
      const logosArr = a.logos || a.logo || []
      const iconsArr = a.icons || []
      const fontsArr = a.fonts || a.font || []
      const colorsArr = a.colors || a.color || []
      setLogos(logosArr)
      setIcons(iconsArr)
      setFonts(fontsArr)
      setColors(colorsArr)
    })()
  }, [])
```


## Folder: `reelzip/src/Components/BuildReel`


### File: `BuildReelWizard.js`

- **Path:** `reelzip/src/Components/BuildReel/BuildReelWizard.js`  
- **Size:** 72204 bytes
- **Exports:** default: `BuildReelWizard`; named: —
- **React hooks:** useEffect, useMemo, useRef, useState
- **Router usage:** Link
- **HTTP libs:** fetch
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useMemo, useState, useRef, useEffect }` from `react`
  - `{ FaPlus, FaAngleRight, FaEyeDropper }` from `react-icons/fa`
  - `{ HexColorPicker }` from `react-colorful`
  - `useBrandAssets` from `../../hooks/useBrandAssets`
  - `{ toast }` from `react-hot-toast`

**Code preview (first 50 lines):**

```jsx
import React, { useMemo, useState, useRef, useEffect } from 'react';
import { FaPlus, FaAngleRight, FaEyeDropper } from 'react-icons/fa';
import { HexColorPicker } from 'react-colorful';
import useBrandAssets from '../../hooks/useBrandAssets';
import { toast } from 'react-hot-toast';

// Module-scope helpers so both StepOne (generate) and StepTwo can use them
const getPerSceneDurationGlobal = (type) => (String(type).toLowerCase() === 'avatar based' ? 8 : 10);
const computeTimelineForIndex = (arr, idx) => {
  try {
    const rows = Array.isArray(arr) ? arr : [];
    let start = 0;
    for (let i = 0; i < idx; i++) start += getPerSceneDurationGlobal(rows[i]?.type || '');
    const end = start + getPerSceneDurationGlobal(rows[idx]?.type || '');
    return `${start} - ${end} seconds`;
  } catch (_) { return '0 - 10 seconds'; }
};

const StepOne = ({ values, onChange, onNext, onSetUserQuery, onCreateScenes }) => {
  const industries = useMemo(() => [], []);

  // Accordion open states
  const [open, setOpen] = useState({
    basics: false,
    purpose: true,
    style: false,
    audio: false,
    technical: false,
    content: false,
  });

  // Ensure only one accordion is open at a time
  const openSection = (key) => {
    setOpen({ basics: false, purpose: false, style: false, audio: false, technical: false, content: false, [key]: true });
  };

  // User Query fields
  const [videoTitle, setVideoTitle] = useState('');
  const [videoDesc, setVideoDesc] = useState('');
  const [tone, setTone] = useState('professional');
  const [audience, setAudience] = useState('Investors');
  const [goal, setGoal] = useState('Promote');
  // Font styles as multi-select
  const [fontStyles, setFontStyles] = useState(['Poppins']);
  // Color palette state (Guidelines-style)
  const [selectedColors, setSelectedColors] = useState(new Set());
  const [customColors, setCustomColors] = useState([]);
  const [currentColor, setCurrentColor] = useState('#279CF5');
  const colorInputRef = useRef(null);
  const [logoAnswer, setLogoAnswer] = useState('No');
```


## Folder: `reelzip/src/Components/Details`


### File: `UserQuestion.js`

- **Path:** `reelzip/src/Components/Details/UserQuestion.js`  
- **Size:** 22830 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useEffect, useRef, useState
- **Router usage:** useNavigate
- **HTTP libs:** fetch
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect, useRef, useState }` from `react`
  - `{ HexColorPicker }` from `react-colorful`
  - `{ FaImage, FaPlus, FaTrash, FaChevronDown, FaEyeDropper, FaMicrophone, FaStop }` from `react-icons/fa`
  - `{ useNavigate }` from `react-router-dom`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect, useRef, useState } from 'react'
import { HexColorPicker } from 'react-colorful'
import { FaImage, FaPlus, FaTrash, FaChevronDown, FaEyeDropper, FaMicrophone, FaStop } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'

const UserQuestion = () => {
  const [logoFiles, setLogoFiles] = useState([]) // [{file, preview, id}]
  const [brandImages, setBrandImages] = useState([]) // [{file, preview, id}]
  const [selectedFonts, setSelectedFonts] = useState([]) // multi-select
  const [isFontDropdownOpen, setIsFontDropdownOpen] = useState(false)
  const [selectedColors, setSelectedColors] = useState([])
  const [customColors, setCustomColors] = useState([])
  const [currentColor, setCurrentColor] = useState('#4f46e5')
  const fileInputRef = useRef(null)
  const brandFileInputRef = useRef(null)
  const colorInputRef = useRef(null)

  // Voice recording state
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const [isRecording, setIsRecording] = useState(false)
  const [recordedAudios, setRecordedAudios] = useState([]) // [{id, url, blob}]

  const navigate = useNavigate()

  const fontOptions = [
    'Arial',
    'Helvetica',
    'Times New Roman',
    'Georgia',
    'Verdana',
    'Roboto',
    'Open Sans',
    'Lato',
    'Montserrat',
    'Poppins'
  ]

  // Palette similar to screenshot (rows across grays, warm/cool tones)
  const presetColors = [
    '#000000','#4B5563','#6B7280','#9CA3AF','#D1D5DB','#E5E7EB','#F3F4F6','#FFFFFF',
    '#B91C1C','#DC2626','#EF4444','#F59E0B','#FBBF24','#FDE047','#84CC16','#22C55E','#06B6D4','#3B82F6','#2563EB','#8B5CF6','#EC4899',
    '#FCA5A5','#FCD34D','#A7F3D0','#A5F3FC','#93C5FD','#A5B4FC','#FBCFE8','#E5E7EB','#FECACA','#FDE68A','#D1FAE5','#BAE6FD','#BFDBFE','#DDD6FE','#F5D0FE',
    '#991B1B','#B45309','#92400E','#166534','#065F46','#0E7490','#1D4ED8','#3730A3','#6D28D9','#831843'
  ]

  const handleLogoChange = (e) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
```


## Folder: `reelzip/src/Components/Home`


### File: `DashboardItems.js`

- **Path:** `reelzip/src/Components/Home/DashboardItems.js`  
- **Size:** 7387 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useCallback, useEffect, useState
- **Redux hooks:** useSelector
- **Router usage:** useNavigate
- **HTTP libs:** fetch
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useCallback, useEffect, useState }` from `react`
  - `bg` from `../../asset/bg-home.png`
  - `{ FaImages, FaPlay, FaPlayCircle, FaUserFriends }` from `react-icons/fa`
  - `{ useNavigate }` from `react-router-dom`
  - `{ useSelector }` from `react-redux`
  - `{ selectToken }` from `../../redux/slices/userSlice`

**Code preview (first 50 lines):**

```jsx
import React, { useCallback, useEffect, useState } from 'react'
import bg from "../../asset/bg-home.png"
import { FaImages, FaPlay, FaPlayCircle, FaUserFriends } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectToken } from '../../redux/slices/userSlice'

const DashboardItems = () => {
	const navigate = useNavigate();
	const token = useSelector(selectToken) || (typeof window !== 'undefined' ? localStorage.getItem('token') : '');
  const [recentVideos, setRecentVideos] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [recentError, setRecentError] = useState('');

  const handleCompleteProfile = useCallback(() => {
		navigate('/onboarding');
	}, [navigate]);

  const handleStartGenerating = useCallback(async () => {
    try {
      const userToken = token || localStorage.getItem('token') || '';
      if (!userToken) { navigate('/login'); return; }
      const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/sessions/new', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: userToken })
      });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch (_) { data = text; }
      if (!resp.ok) throw new Error(`sessions/new failed: ${resp.status} ${text}`);
      const newId = data?.session?.session_id || data?.session_id || data?.id;
      if (!newId) throw new Error('Session ID missing in response');
      try { localStorage.setItem('session_id', newId); } catch (_) { /* noop */ }
      navigate(`/chat/${newId}`);
    } catch (e) {
      console.error('Failed to create new session:', e);
      alert('Unable to start a new chat. Please try again.');
    }
  }, [navigate, token]);
	const cards = [
		
		{
			id: 2,
			link: "/media",
			icon: <FaImages className="text-[#13008B] w-12 h-12" />,
			label: "My Media",
		},
		{
			id: 3,
			link: "/profile",
			icon: <FaUserFriends className="text-[#13008B] w-12 h-12" />,
			label: "My Profile",
```


## Folder: `reelzip/src/Components/Login`


### File: `authHelper.js`

- **Path:** `reelzip/src/Components/Login/authHelper.js`  
- **Size:** 3769 bytes
- **Exports:** default: `None`; named: —

**Code preview (first 50 lines):**

```jsx
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
```


### File: `LoginForm.js`

- **Path:** `reelzip/src/Components/Login/LoginForm.js`  
- **Size:** 10569 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useEffect, useState
- **Redux hooks:** useDispatch, useSelector
- **Router usage:** useNavigate
- **HTTP libs:** axios
- **Styling:** Tailwind classes detected
- **Environment vars referenced:** PUBLIC_URL
- **Imports:**
  - `React, { useEffect, useState }` from `react`
  - `{ useNavigate }` from `react-router-dom`
  - `{ useDispatch, useSelector }` from `react-redux`
  - `MicrosoftIcon` from `../../asset/microsoft.png`
  - `{ FaEye, FaEyeSlash }` from `react-icons/fa`
  - `axios` from `axios`
  - `{ getAuthToken, storeUserData, clearUserData }` from `./authHelper`
  - `toast, { Toaster }` from `react-hot-toast`

**Code preview (first 50 lines):**

```jsx
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
```


### File: `OAuthCallback.js`

- **Path:** `reelzip/src/Components/Login/OAuthCallback.js`  
- **Size:** 2808 bytes
- **Exports:** default: `OAuthCallback`; named: —
- **React hooks:** useEffect
- **Redux hooks:** useDispatch
- **Router usage:** useNavigate, useParams
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect }` from `react`
  - `{ useNavigate, useParams }` from `react-router-dom`
  - `{ useDispatch }` from `react-redux`
  - `{ setUser }` from `../../redux/slices/userSlice`
  - `toast` from `react-hot-toast`

**Code preview (first 50 lines):**

```jsx
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
                    
                    // Clean URL and redirect
                    window.history.replaceState({}, document.title, '/');
                    navigate('/');
                } else {
                    toast.error('OAuth login failed - missing credentials');
                    navigate('/login');
                }
            } catch (e) {
```


### File: `SignupForm.js`

- **Path:** `reelzip/src/Components/Login/SignupForm.js`  
- **Size:** 13092 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useState
- **Redux hooks:** useDispatch, useSelector
- **Router usage:** Link, useNavigate
- **HTTP libs:** axios
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useState }` from `react`
  - `{ useNavigate }` from `react-router-dom`
  - `{ useDispatch, useSelector }` from `react-redux`
  - `MicrosoftIcon` from `../../asset/microsoft.png`
  - `axios` from `axios`
  - `{ FaEye, FaEyeSlash }` from `react-icons/fa`
  - `toast, { Toaster }` from `react-hot-toast`

**Code preview (first 50 lines):**

```jsx
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

const AUTH_BASE = 'https://auth-js-g3hnh7gbc4c5fje4.uaenorth-01.azurewebsites.net';
const OAUTH_BASE = 'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net';

const SignupForm = ({activeTab,setActiveTab}) => {
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
```


## Folder: `reelzip/src/Components/Profile`


### File: `ProfileContent.js`

- **Path:** `reelzip/src/Components/Profile/ProfileContent.js`  
- **Size:** 5154 bytes
- **Exports:** default: `None`; named: —
- **Redux hooks:** useSelector
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React` from `react`
  - `{ useSelector }` from `react-redux`
  - `{ selectUser, selectIsAuthenticated }` from `../../redux/slices/userSlice`

**Code preview (first 50 lines):**

```jsx
import React from 'react'
import { useSelector } from 'react-redux'
import { selectUser, selectIsAuthenticated } from '../../redux/slices/userSlice'

const ProfileContent = ({userProfile}) => {
  // Redux selectors
  const user = useSelector(selectUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  // Use user data from Redux if available, otherwise fall back to userProfile prop
  const displayUser = user || userProfile || {};

  if (!isAuthenticated || !user) {
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
```


### File: `ProfileSidebar.js`

- **Path:** `reelzip/src/Components/Profile/ProfileSidebar.js`  
- **Size:** 2438 bytes
- **Exports:** default: `None`; named: —
- **Router usage:** Link, useLocation
- **Styling:** Tailwind classes detected
- **Imports:**
  - `{ Crown, LogOut, Settings, User, Zap }` from `lucide-react`
  - `React` from `react`
  - `{ Link, useLocation }` from `react-router-dom`

**Code preview (first 50 lines):**

```jsx
import { Crown, LogOut, Settings, User, Zap } from 'lucide-react'
import React from 'react'
import { Link, useLocation } from 'react-router-dom';

const ProfileSidebar = () => {
  const location = useLocation();
  const { pathname } = location;
  const splitLocation = pathname.split("/");
  const activeClass = "w-full bg-purple-800 text-white rounded-lg p-4 flex items-center gap-3 text-left font-medium";
  const inactiveClass = "w-full hover:bg-purple-300 rounded-lg p-4 flex items-center gap-3 text-left font-medium text-gray-700 transition-colors";
  return (
    <div>
        <div className="w-80  p-6">
          <div className="space-y-3">
          <Link to="/profile">
            <button className={(splitLocation[1] === "profile") ? activeClass : inactiveClass}>
              <User className="w-5 h-5" />
              <span>My Profile</span>
            </button> 
            </Link>
            <Link to="/brandguidelines">
         <button className={(splitLocation[1] === "brandguidelines") ? activeClass : inactiveClass}>
              <Zap className="w-5 h-5" />
              <span>Brand Guidelines</span>
            </button>
            </Link>
            
           <Link to="/scenesettings">
           <button className={(splitLocation[1] === "scenesettings") ? activeClass : inactiveClass}>
              <Settings className="w-5 h-5" />
              <span>Scenes Settings</span>
            </button>
            </Link>
            
            <Link to="/subscription">
            <button className={(splitLocation[1] === "subscription") ? activeClass : inactiveClass}>
              <Crown className="w-5 h-5" />
              <span>Subscription</span>
            </button>
            </Link>
            
           <Link to="#">
           <button className="w-full hover:bg-purple-300 rounded-lg p-4 flex items-center gap-3 text-left font-medium text-gray-700 transition-colors">
              <Settings className="w-5 h-5" />
              <span>Settings</span>
            </button>
           </Link>
            
           <Link to={"#"}>
           <button className="w-full hover:bg-purple-300 rounded-lg p-4 flex items-center gap-3 text-left font-medium text-gray-700 transition-colors">
```


## Folder: `reelzip/src/Components/Result`


### File: `Resultarea.js`

- **Path:** `reelzip/src/Components/Result/Resultarea.js`  
- **Size:** 3509 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useState
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useState }` from `react`
  - `{ FaPlay }` from `react-icons/fa`

**Code preview (first 50 lines):**

```jsx
import React, { useState } from 'react'
import { FaPlay } from 'react-icons/fa'

const Resultarea = ({resultvideo}) => {
  const [notes, setNotes] = useState('')
  const [description, setDescription] = useState('Lorem Ipsum has been the industry\'s standard dummy text ever since the 1750s, when an unknown printer took a galley of type and scrambled it to make a type specimen book.')
  const [videoSrc, setVideoSrc] = useState(resultvideo || '')
  const [aspect, setAspect] = useState('16 / 9')


  return (
    <div className="rounded-lg p-6 bg-white">
      <div className="flex gap-6">
        {/* Left: Video + description */}
        <div className="flex-1">
          <h3 className="text-[18px] font-semibold text-gray-900">See Your Final Video</h3>

          <div className="mt-4 rounded-xl border-4 border-blue-400 overflow-hidden">
            <div className="relative flex justify-center items-center bg-black">
              <video
                className="w-full object-contain"
                style={{ aspectRatio: aspect }}
                controls
                playsInline
                onLoadedMetadata={(e) => {
                  try {
                    const v = e.currentTarget;
                    const w = v.videoWidth || 0;
                    const h = v.videoHeight || 0;
                    if (w > 0 && h > 0) setAspect(`${w} / ${h}`);
                  } catch (_) { /* noop */ }
                }}
              >
                {videoSrc && <source src={videoSrc} type="video/mp4" />}
                Your browser does not support the video tag.
              </video>
            </div>
          </div>

          <div className="mt-4 relative">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full h-24 bg-gray-100 rounded-lg p-4 pr-28 text-sm text-gray-800 resize-none focus:outline-none"
            />
            <button className="absolute right-3 bottom-0 -translate-y-1/2 rounded-full bg-[#13008B] text-white px-6 py-2">Edit</button>
          </div>
        </div>

        {/* Right: Actions */}
```


### File: `Scencearea.js`

- **Path:** `reelzip/src/Components/Result/Scencearea.js`  
- **Size:** 8065 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useEffect, useState
- **Router usage:** Link
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useState, useEffect }` from `react`
  - `{ MoreVertical }` from `lucide-react`
  - `{ FaPlay }` from `react-icons/fa`

**Code preview (first 50 lines):**

```jsx
import React, { useState, useEffect } from 'react'
import { MoreVertical } from 'lucide-react'
import { FaPlay } from 'react-icons/fa'
// Horizontal scroller with 4 cards visible; extra cards scroll horizontally

const SCENES = [
  {
    id: 1,
    label: 'Scene 1',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 2,
    label: 'Scene 2',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 3,
    label: 'Scene 3',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 4,
    label: 'Scene 4',
    image:
      'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 5,
    label: 'Scene 5',
    image:
      'https://images.unsplash.com/photo-1529078155058-5d716f45d604?q=80&w=1600&auto=format&fit=crop'
  }
]

const Scencearea = ({scenes}) => {
  const [menuFor, setMenuFor] = useState(null) // slide index
  const closeMenu = () => setMenuFor(null)
  const [transitionMenuFor, setTransitionMenuFor] = useState(null) // between index
  console.log('scenes', scenes);
  const scenevideos = scenes?.map((scene) => scene?.blobLink?.videoLink);
  console.log('scenevideos', scenevideos);
  const [aspectRatios, setAspectRatios] = useState({});
  const [hoverIndex, setHoverIndex] = useState(null);
  const [editingIndex, setEditingIndex] = useState(null);
  const [editValue, setEditValue] = useState('');

```


## Folder: `reelzip/src/Components/Scence`


### File: `Settingsarea.js`

- **Path:** `reelzip/src/Components/Scence/Settingsarea.js`  
- **Size:** 2867 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useState
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useState }` from `react`
  - `{ Check }` from `lucide-react`

**Code preview (first 50 lines):**

```jsx
import React, { useState } from 'react'
import { Check } from 'lucide-react'

const OPTIONS = [
  {
    id: 'man-moving',
    title: 'Man Moving and Talking',
    image:
      'https://images.unsplash.com/photo-1580894732444-8ecded7900cd?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 'man-board',
    title: 'Man Talking in Front of Board',
    image:
      'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?q=80&w=1600&auto=format&fit=crop'
  },
  {
    id: 'content-table',
    title: 'Content Table',
    image:
      'https://images.unsplash.com/photo-1529078155058-5d716f45d604?q=80&w=1600&auto=format&fit=crop'
  }
]

const Settingsarea = () => {
  const [selectedIds, setSelectedIds] = useState(new Set())

  const toggle = (id) => {
    const next = new Set(selectedIds)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedIds(next)
  }

  return (
    <div className='w-full h-full'>
      <div className="w-full h-[85vh] rounded-lg p-8 bg-white">
       
          <h3 className="text-gray-900 font-semibold">Choose Your Guidelines Videos</h3>
          <p className="text-gray-600 mt-1">How do you want the Video Look and Feel</p>

          <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-8">
            {OPTIONS.map((opt) => {
              const isSelected = selectedIds.has(opt.id)
              return (
                <div key={opt.id} className="">
                  <button
                    type="button"
                    onClick={() => toggle(opt.id)}
                    className="relative block w-full overflow-hidden rounded-lg focus:outline-none"
```


## Folder: `reelzip/src/Components/Subscription`


### File: `SubArea.js`

- **Path:** `reelzip/src/Components/Subscription/SubArea.js`  
- **Size:** 4981 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useState
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useState }` from `react`

**Code preview (first 50 lines):**

```jsx
import React, { useState } from "react"

const SubArea = () => {
    const [billingCycle, setBillingCycle] = useState('yearly')

    const tabBase = "w-[270px] h-[50px] text-[20px] rounded-full text-sm font-medium"
    const tabActive = "bg-[#13008B] text-white"
    const tabInactive = "bg-gray-100 text-gray-700"

    const Feature = ({ children }) => (
        <div className="flex items-start gap-2 text-sm text-black">
            <span className="mt-0.5 h-5 w-5 rounded-full bg-green-500 text-white flex items-center justify-center text-xs">✓</span>
            <span>{children}</span>
        </div>
    )

    const PlanCards = ({ variant }) => (
        <>
            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Free card */}
                <div className="rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-[30px] text-gray-900">Free Forever</h3>
                    <p className="text-[20px] text-gray-600">Best for Beginners</p>
                    <button className="mt-4 w-full border-[1px] border-[#ccc] hover:bg-gray-100 text-gray-800 rounded-md py-2 text-sm">Create an Account</button>
                    <p className="mt-4 text-[16px] text-black text-center">Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown</p>
                    <div className="mt-6 space-y-5">
                        <p className="text-[20px] font-medium text-gray-800">Things Included:</p>
                        <div className="space-y-3">
                            <Feature>Lorem ipsum has</Feature>
                            <Feature>Lorem ipsum has been to</Feature>
                            <Feature>Lorem ipsum has been</Feature>
                            <Feature>Lorem ipsum has been the industry's</Feature>
                        </div>
                    </div>
                </div>

                {/* Pro card */}
                <div className="rounded-2xl border border-gray-200 p-6">
                    <h3 className="font-semibold text-[30px] text-gray-900">Pro</h3>
                    <p className="text-[20px] text-gray-600">Best For New Businesses</p>
                    <button className="mt-4 w-full border-[1px] border-[#ccc] hover:bg-gray-100 text-gray-800 rounded-md py-2 text-sm">{variant === 'monthly' ? 'Start Monthly Trial' : 'Start Your Free Trial'}</button>
                    <p className="mt-4 text-[16px] text-black text-center">Lorem Ipsum has been the industry's standard dummy text ever since the 1500s, when an unknown</p>
                    <div className="mt-6 space-y-5">
                        <p className="text-[20px] font-medium text-gray-800">Things Included:</p>
                        <div className="space-y-3">
                            <Feature>Lorem ipsum has</Feature>
                            <Feature>Lorem ipsum has been to</Feature>
                            <Feature>Lorem ipsum has been</Feature>
                            <Feature>Lorem ipsum has been the industry's</Feature>
                        </div>
```


## Folder: `reelzip/src/Components/VideoGuidlines`


### File: `Guidlines.js`

- **Path:** `reelzip/src/Components/VideoGuidlines/Guidlines.js`  
- **Size:** 74464 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useEffect, useRef, useState
- **Redux hooks:** useDispatch, useSelector
- **Router usage:** Link
- **HTTP libs:** fetch
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect, useRef, useState }` from `react`
  - `{ useDispatch, useSelector }` from `react-redux`
  - `{ selectGuidelinesForm, setGuidelinesState }` from `../../redux/slices/guidelinesSlice`
  - `{ Link }` from `react-router-dom`
  - `useBrandAssets` from `../../hooks/useBrandAssets`
  - `FileUpload` from `../BrandAssets/FileUpload`
  - `BrandAssetsDisplay` from `../BrandAssets/BrandAssetsDisplay`
  - `{ FaChevronDown, FaTimes, FaPlus, FaEyeDropper, FaMicrophone, FaUpload, FaAngleDown, FaCheck, FaAngleUp }` from `react-icons/fa`
  - `{ HexColorPicker }` from `react-colorful`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect, useRef, useState } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import { selectGuidelinesForm, setGuidelinesState } from '../../redux/slices/guidelinesSlice'
import { Link } from 'react-router-dom'
import useBrandAssets from '../../hooks/useBrandAssets'
import FileUpload from '../BrandAssets/FileUpload'
import BrandAssetsDisplay from '../BrandAssets/BrandAssetsDisplay'
import { FaChevronDown, FaTimes, FaPlus, FaEyeDropper, FaMicrophone, FaUpload, FaAngleDown, FaCheck, FaAngleUp } from 'react-icons/fa'
import { HexColorPicker } from 'react-colorful'

const Guidlines = () => {
  const dispatch = useDispatch()
  const savedForm = useSelector(selectGuidelinesForm)
  const [goal, setGoal] = useState(true)
  const [showBrand, setShowBrand] = useState(false)
  const [isFontOpen, setIsFontOpen] = useState(false)
  const [selectedFonts, setSelectedFonts] = useState([])
  const [selectedColors, setSelectedColors] = useState(new Set())
  const [customColors, setCustomColors] = useState([])
  const [currentColor, setCurrentColor] = useState('#4f46e5')
  const [addvoice, setAddvoice] = useState(false)
  // Brand voices fetched from API
  const [brandVoices, setBrandVoices] = useState([])
  // Staged voice blobs before saving to Brand Assets
  const [pendingVoiceBlobs, setPendingVoiceBlobs] = useState([])
  const [pendingVoiceUrls, setPendingVoiceUrls] = useState([])
  const [isVoiceUploading, setIsVoiceUploading] = useState(false)
  // Recording
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const [isRecording, setIsRecording] = useState(false)
  const audioPreviewRef = useRef(null)
  // Local simple voices for selectable mic icons (optional)
  const [voices, setVoices] = useState([
    { id: 1, name: 'Voice 1', isSelected: false },
    { id: 2, name: 'Voice 2', isSelected: false },
    { id: 3, name: 'Voice 3', isSelected: false }
  ])
  const [selectedVoice, setSelectedVoice] = useState(null)
  const [selectedVoiceFromLibrary, setSelectedVoiceFromLibrary] = useState(null)
  const fileInputRef = useRef(null)
  const voiceModalFileInputRef = useRef(null)
  const colorInputRef = useRef(null)
  const avatarInputRef = useRef(null)
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false)
  // Audio refs for hover-play of brand voices
  const brandVoiceAudioRefs = useRef({})
  const stopAllBrandVoice = () => {
    try {
      const map = brandVoiceAudioRefs.current || {}
```


## Folder: `reelzip/src/hooks`


### File: `useAuth.js`

- **Path:** `reelzip/src/hooks/useAuth.js`  
- **Size:** 1218 bytes
- **Exports:** default: `None`; named: —
- **Redux hooks:** useDispatch, useSelector
- **Imports:**
  - `{ useSelector, useDispatch }` from `react-redux`

**Code preview (first 50 lines):**

```jsx
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
```


### File: `useBrandAssets.js`

- **Path:** `reelzip/src/hooks/useBrandAssets.js`  
- **Size:** 2760 bytes
- **Exports:** default: `useBrandAssets`; named: —
- **Components detected:** `useBrandAssets`
- **React hooks:** useCallback, useState
- **HTTP libs:** fetch
- **Imports:**
  - `{ useCallback, useState }` from `react`

**Code preview (first 50 lines):**

```jsx
// Custom hook for Brand Assets API
import { useCallback, useState } from 'react';

const API_BASE = 'https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1';

export default function useBrandAssets() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [assets, setAssets] = useState(null);

  const getBrandAssets = useCallback(async (userId) => {
    if (!userId) return null;
    setLoading(true); setError('');
    try {
      const resp = await fetch(`${API_BASE}/users/${encodeURIComponent(userId)}/brand-assets`);
      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) throw new Error(`GET brand-assets failed: ${resp.status}`);
      setAssets(data);
      return data;
    } catch (e) {
      setError(e?.message || 'Failed to load brand assets');
      return null;
    } finally { setLoading(false); }
  }, []);

  const uploadBrandAssets = useCallback(async (params) => {
    // params: { userId, fonts, colors, caption_location, files: { logos, icons, voiceovers } }
    const { userId, fonts = [], colors = [], caption_location, files = {} } = params || {};
    if (!userId) throw new Error('userId is required');
    const form = new FormData();
    form.append('user_id', userId);
    try {
      if (Array.isArray(fonts)) fonts.filter(Boolean).forEach(f => form.append('font', f));
      if (Array.isArray(colors)) colors.filter(Boolean).forEach(c => form.append('color', c));
      if (caption_location) form.append('caption_location', typeof caption_location === 'string' ? caption_location : JSON.stringify(caption_location));
      const { logos = [], icons = [], voiceovers = [] } = files;
      logos.filter(Boolean).forEach(file => form.append('logos', file));
      icons.filter(Boolean).forEach(file => form.append('icons', file));
      voiceovers.filter(Boolean).forEach(file => form.append('voiceovers', file));
    } catch (_) { /* ignore */ }

    setLoading(true); setError('');
    try {
      const resp = await fetch(`${API_BASE}/users/brand-assets`, { method: 'POST', body: form });
      const text = await resp.text();
      let data; try { data = JSON.parse(text); } catch { data = text; }
      if (!resp.ok) throw new Error(`POST brand-assets failed: ${resp.status} ${text}`);
      // Refresh assets after successful upload
      await getBrandAssets(userId);
      return data;
```


### File: `useScriptGeneratedFlag.js`

- **Path:** `reelzip/src/hooks/useScriptGeneratedFlag.js`  
- **Size:** 800 bytes
- **Exports:** default: `useScriptGeneratedFlag`; named: —
- **Components detected:** `useScriptGeneratedFlag`
- **React hooks:** useEffect, useState
- **Imports:**
  - `{ useEffect, useState }` from `react`

**Code preview (first 50 lines):**

```jsx
import { useEffect, useState } from 'react'

export default function useScriptGeneratedFlag() {
  const getInitial = () => {
    try {
      return (
        localStorage.getItem('has_generated_script') === 'true' ||
        !!localStorage.getItem('last_generated_script')
      );
    } catch {
      return false;
    }
  };

  const [hasGenerated, setHasGenerated] = useState(getInitial);

  useEffect(() => {
    const onStorage = (e) => {
      if (!e || !e.key) return;
      if (e.key === 'has_generated_script' || e.key === 'last_generated_script') {
        setHasGenerated(getInitial());
      }
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return hasGenerated;
}


```


## Folder: `reelzip/src/pages`


### File: `BrandGuidelines.js`

- **Path:** `reelzip/src/pages/BrandGuidelines.js`  
- **Size:** 974 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useEffect
- **Router usage:** useNavigate
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect }` from `react`
  - `{ Play, Image, LogOut, User, Zap, Settings, Crown }` from `lucide-react`
  - `Sidebar` from `../Components/Sidebar`
  - `Topbar` from `../Components/Topbar`
  - `ProfileSidebar` from `../Components/Profile/ProfileSidebar`
  - `ProfileContent` from `../Components/Profile/ProfileContent`
  - `{ useNavigate }` from `react-router-dom`
  - `BrandArea` from `../Components/BrandGuidelines/BrandArea`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect } from 'react';
import { Play, Image, LogOut, User, Zap, Settings, Crown } from 'lucide-react';
import Sidebar from '../Components/Sidebar';
import Topbar from '../Components/Topbar';
import ProfileSidebar from '../Components/Profile/ProfileSidebar';
import ProfileContent from '../Components/Profile/ProfileContent';
import { useNavigate } from 'react-router-dom';
import BrandArea from '../Components/BrandGuidelines/BrandArea';

const BrandGuidelines = () => {
  const navigate = useNavigate()
  useEffect(()=>{
    if(localStorage.getItem('auth') === 'false'){
      navigate('/login')
    }
  },[localStorage.getItem('auth')])
  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
    <Sidebar/>
    <div className="w-full mx-[2rem] mt-[1rem]">
      <Topbar/>
    <div className='h-[77vh] my-2 flex items-start justify-start'>
    <ProfileSidebar />
    <BrandArea />
    </div>
    </div>
  </div>
  )
}

export default BrandGuidelines
```


### File: `BuildReel.js`

- **Path:** `reelzip/src/pages/BuildReel.js`  
- **Size:** 1078 bytes
- **Exports:** default: `BuildReel`; named: —
- **React hooks:** useEffect
- **Router usage:** useNavigate, useParams
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect }` from `react`
  - `{ useNavigate, useParams }` from `react-router-dom`
  - `Sidebar` from `../Components/Sidebar`
  - `Topbar` from `../Components/Topbar`
  - `BuildReelWizard` from `../Components/BuildReel/BuildReelWizard`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Sidebar from '../Components/Sidebar';
import Topbar from '../Components/Topbar';
import BuildReelWizard from '../Components/BuildReel/BuildReelWizard';

const BuildReel = () => {
  const navigate = useNavigate();
  const { sessionId } = useParams();
  useEffect(() => {
    if (localStorage.getItem('auth') === 'false') {
      navigate('/login');
    }
  }, [navigate]);

  useEffect(() => {
    // When loaded with /buildreel/:sessionId, persist the session id for API calls
    try {
      if (sessionId) localStorage.setItem('session_id', sessionId);
    } catch (_) { /* noop */ }
  }, [sessionId]);

  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
      <Sidebar />
      <div className="w-full mx-[2rem] mt-[1rem]">
        <Topbar />
        <div className='h-[87vh] rounded-lg overflow-scroll scrollbar-hide my-2 flex items-start justify-start'>
          <BuildReelWizard />
        </div>
      </div>
    </div>
  );
}

export default BuildReel;
```


### File: `Dashboard.js`

- **Path:** `reelzip/src/pages/Dashboard.js`  
- **Size:** 662 bytes
- **Exports:** default: `None`; named: —
- **Router usage:** Link
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React` from `react`
  - `Sidebar` from `../Components/Sidebar`
  - `Typetabs` from `../Components/Typetabs`
  - `Topbar` from `../Components/Topbar`
  - `Chat` from `../Components/Chat`
  - `{ Link }` from `react-router-dom`
  - `DashboardItems` from `../Components/Home/DashboardItems`

**Code preview (first 50 lines):**

```jsx
import React from 'react'
import Sidebar from '../Components/Sidebar'
import Typetabs from '../Components/Typetabs'
import Topbar from '../Components/Topbar'
import Chat from '../Components/Chat'
import { Link } from 'react-router-dom'
import DashboardItems from '../Components/Home/DashboardItems'

const Dashboard = () => {
  return (
    <div className='flex h-screen bg-[#E5E2FF] overflow-x-hidden'>
      <Sidebar />
      <div className="w-full mx-[2rem] mt-[1rem]">
        <Topbar />
        <div className='h-[85vh] my-2 flex items-start justify-start'>
          <DashboardItems />
        </div>
      </div>
    </div>
  )
}

export default Dashboard
```


### File: `Details.js`

- **Path:** `reelzip/src/pages/Details.js`  
- **Size:** 635 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useEffect
- **Router usage:** useNavigate
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect }` from `react`
  - `Topbar` from `../Components/Topbar`
  - `Sidebar` from `../Components/Sidebar`
  - `{ useNavigate }` from `react-router-dom`
  - `UserQuestion` from `../Components/Details/UserQuestion`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect } from 'react'
import Topbar from '../Components/Topbar'
import Sidebar from '../Components/Sidebar'
import { useNavigate } from 'react-router-dom'
import UserQuestion from '../Components/Details/UserQuestion'

const Details = () => {
    const navigate = useNavigate()
    useEffect(() => {
      if (localStorage.getItem('auth') === 'false') {
        navigate('/login')
      }
    }, [localStorage.getItem('auth')])
  return (
    <div className='flex justify-center items-center h-screen bg-[#E5E2FF] scrollbar-hidden'>
        <UserQuestion/>
    </div>
  )
}

export default Details
```


### File: `Home.js`

- **Path:** `reelzip/src/pages/Home.js`  
- **Size:** 27534 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useEffect, useState
- **Redux hooks:** useSelector
- **Router usage:** useNavigate, useParams
- **HTTP libs:** fetch
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect, useMemo, useState }` from `react`
  - `{ useSelector }` from `react-redux`
  - `Sidebar` from `../Components/Sidebar`
  - `Typetabs` from `../Components/Typetabs`
  - `Topbar` from `../Components/Topbar`
  - `Chat` from `../Components/Chat`
  - `ErrorBoundary` from `../Components/ErrorBoundary`
  - `Guidlines` from `../Components/VideoGuidlines/Guidlines`
  - `DynamicQuestion` from `../Components/DynamicQuestion`
  - `{ selectToken, selectIsAuthenticated }` from `../redux/slices/userSlice`
  - `{ useNavigate, useParams }` from `react-router-dom`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import Sidebar from '../Components/Sidebar'
import Typetabs from '../Components/Typetabs'
import Topbar from '../Components/Topbar'
import Chat from '../Components/Chat'
import ErrorBoundary from '../Components/ErrorBoundary'
import Guidlines from '../Components/VideoGuidlines/Guidlines'
import DynamicQuestion from '../Components/DynamicQuestion'
import { selectToken, selectIsAuthenticated } from '../redux/slices/userSlice'
import { useNavigate, useParams } from 'react-router-dom'
// Brand step removed; DynamicQuestion is the final step

const Home = () => {
  const [userChat, setuserChat] = useState("")
  const [isDocFollowup, setIsDocFollowup] = useState(false)
  const [chatHistory, setChatHistory] = useState([]) // Chat history to preserve across steps
  const [currentStep, setCurrentStep] = useState(1) // 1: Chat, 2: Guidelines, 3: DynamicQuestion
  const [hasSentFirstMessage, setHasSentFirstMessage] = useState(false)
  const [questionnaireData, setQuestionnaireData] = useState(null)
  const [isChatLoading, setIsChatLoading] = useState(true)
  const [hasQuestionnaireAgent, setHasQuestionnaireAgent] = useState(false)
  const [latestQuestionnaireData, setLatestQuestionnaireData] = useState(null)
  const [showQuestionnaireOptions, setShowQuestionnaireOptions] = useState(false)

  // Redux selectors
  const token = useSelector(selectToken);
  const isAuthenticated = useSelector(selectIsAuthenticated);

  const navigate = useNavigate();
  const { sessionId } = useParams();

  // Map API session messages to chat UI format
  // Each message item represents a conversation turn with:
  // - m.userquery: string (user message)
  // - m.airesponse: object with .final_output (assistant message)
  const mapMessagesToChatHistory = (messages = []) => {
    try {
      if (!Array.isArray(messages)) return [];
      const out = [];
      let baseId = Date.now();
      for (const m of messages) {
        const userQ = m?.userquery ?? m?.user_message ?? m?.query ?? '';
        // Skip questionnaire agent turns entirely
        if (typeof userQ === 'string' && userQ.trim().toLowerCase() === 'questionnaire agent') {
          continue;
        }

        const aiText = m?.airesponse?.final_output
          ?? m?.airesponse?.content
```


### File: `Login.js`

- **Path:** `reelzip/src/pages/Login.js`  
- **Size:** 3519 bytes
- **Exports:** default: `Login`; named: —
- **React hooks:** useEffect, useState
- **Redux hooks:** useSelector
- **Router usage:** useNavigate
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useState, useEffect }` from `react`
  - `{ useSelector }` from `react-redux`
  - `{ useNavigate }` from `react-router-dom`
  - `{ selectIsAuthenticated }` from `../redux/slices/userSlice`
  - `LoginForm` from `../Components/Login/LoginForm`
  - `SignupForm` from `../Components/Login/SignupForm`

**Code preview (first 50 lines):**

```jsx
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
```


### File: `Main.js`

- **Path:** `reelzip/src/pages/Main.js`  
- **Size:** 3447 bytes
- **Exports:** default: `Main`; named: —
- **Components detected:** `Main`, `Main`
- **React hooks:** useState
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useState }` from `react`
  - `{ Play, Image, LogOut, Upload, Paperclip, FileText, Camera }` from `lucide-react`
  - `Sidebar` from `../Components/Sidebar`
  - `Chat` from `../Components/Chat`
  - `Topbar` from `../Components/Topbar`
  - `Typetabs` from `../Components/Typetabs`

**Code preview (first 50 lines):**

```jsx
import React, { useState } from 'react';
import { Play, Image, LogOut, Upload, Paperclip, FileText, Camera } from 'lucide-react';
import Sidebar from '../Components/Sidebar';
import Chat from '../Components/Chat';
import Topbar from '../Components/Topbar';
import Typetabs from '../Components/Typetabs';

export default function Main() {
  
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const videoTypes = [
    'Informational Video',
    'Cinematic Video', 
    'Avatar Based Video',
    'Voice Over Video'
  ];

  const chatHistory = [
    'ALL About the Finance News',
    'Businesses in the World of...',
    'How Businesses Work in 20...'
  ];

  return (
    <div className="flex  bg-gray-100">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

     <Sidebar/>

      {/* Main Content */}
      <div className=" flex-1 overflow-hidden">
      <Topbar />
      <Typetabs/>
      <Chat/>
        {/* Header */}
        {/* <div className="bg-white border-b border-gray-200 px-4 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <button 
                className="lg:hidden p-2 rounded-md hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <div className="w-6 h-6 flex flex-col justify-center space-y-1">
```


### File: `MyMedia.js`

- **Path:** `reelzip/src/pages/MyMedia.js`  
- **Size:** 10694 bytes
- **Exports:** default: `MyMedia`; named: —
- **React hooks:** useEffect, useMemo, useState
- **Redux hooks:** useDispatch, useSelector
- **Router usage:** useNavigate
- **HTTP libs:** fetch
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect, useMemo, useState }` from `react`
  - `{ useNavigate }` from `react-router-dom`
  - `{ useSelector, useDispatch }` from `react-redux`
  - `Sidebar` from `../Components/Sidebar`
  - `Topbar` from `../Components/Topbar`
  - `{ SlidersHorizontal }` from `lucide-react`
  - `{ selectVideoJob, updateJobStatus, setJob }` from `../redux/slices/videoJobSlice`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import Sidebar from '../Components/Sidebar';
import Topbar from '../Components/Topbar';
import { SlidersHorizontal } from 'lucide-react';
import { selectVideoJob, updateJobStatus, setJob } from '../redux/slices/videoJobSlice';

// Section expects an array of items: { id, url, created_at }

const Section = ({ title, items, onItemClick }) => {
  return (
    <div className="mb-10">
      <h2 className="text-2xl font-semibold text-gray-900 mb-4">{title}</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-5">
        {items.map((item, i) => (
          <div key={i} className="relative group cursor-pointer" onClick={() => onItemClick && onItemClick(item)}>
            <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm bg-black">
              {item?.thumb ? (
                <img src={item.thumb} alt={item.id || `media-${i}`} className="w-full h-40 object-cover" />
              ) : (
                <div className="w-full h-40 flex items-center justify-center text-white/70 text-sm">No preview</div>
              )}
            </div>
            <div className="absolute inset-0 rounded-xl ring-2 ring-transparent group-hover:ring-blue-500 pointer-events-none"></div>
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="w-10 h-10 rounded-full bg-white/70 flex items-center justify-center">
                <div className="w-0 h-0 border-l-[10px] border-l-black border-t-[6px] border-t-transparent border-b-[6px] border-b-transparent ml-1"></div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

const MyMedia = () => {
  const [sortMode, setSortMode] = useState('timeline');
  const videoJob = useSelector(selectVideoJob);
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const [library, setLibrary] = useState({ today: [], week: [], month: [], year: [] });
  const [isLoadingLib, setIsLoadingLib] = useState(false);
  const [libError, setLibError] = useState('');

  // Initialize Redux job from localStorage if user hit this page via redirect
  useEffect(() => {
    try {
      if (!videoJob?.jobId) {
```


### File: `Profle.js`

- **Path:** `reelzip/src/pages/Profle.js`  
- **Size:** 1036 bytes
- **Exports:** default: `Profile`; named: —
- **React hooks:** useEffect
- **Router usage:** useNavigate
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect }` from `react`
  - `{ Play, Image, LogOut, User, Zap, Settings, Crown }` from `lucide-react`
  - `Sidebar` from `../Components/Sidebar`
  - `Topbar` from `../Components/Topbar`
  - `ProfileSidebar` from `../Components/Profile/ProfileSidebar`
  - `ProfileContent` from `../Components/Profile/ProfileContent`
  - `{ useNavigate }` from `react-router-dom`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect } from 'react';
import { Play, Image, LogOut, User, Zap, Settings, Crown } from 'lucide-react';
import Sidebar from '../Components/Sidebar';
import Topbar from '../Components/Topbar';
import ProfileSidebar from '../Components/Profile/ProfileSidebar';
import ProfileContent from '../Components/Profile/ProfileContent';
import { useNavigate } from 'react-router-dom';

const Profile= () => {
  const navigate = useNavigate()
  const userProfile = localStorage.getItem('user');
  console.log(userProfile)
  useEffect(()=>{
    if(localStorage.getItem('auth') === 'false'){
      navigate('/login')
    }
  },[localStorage.getItem('auth')])
  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
    <Sidebar/>
    <div className="w-full mx-[2rem] mt-[1rem]">
      <Topbar/>
    <div className='h-[77vh] my-2 flex items-start justify-start'>
    <ProfileSidebar />
    <ProfileContent userProfile={userProfile} />
    </div>
    </div>
  </div>
  );
};

export default Profile;
```


### File: `Result.js`

- **Path:** `reelzip/src/pages/Result.js`  
- **Size:** 13223 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useEffect, useState
- **Redux hooks:** useDispatch
- **Router usage:** useNavigate, useParams
- **HTTP libs:** fetch
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect, useState }` from `react`
  - `{ useNavigate, useParams }` from `react-router-dom`
  - `{ useDispatch }` from `react-redux`
  - `{ setJob }` from `../redux/slices/videoJobSlice`
  - `Sidebar` from `../Components/Sidebar`
  - `Topbar` from `../Components/Topbar`
  - `Resultarea` from `../Components/Result/Resultarea`
  - `Scencearea` from `../Components/Result/Scencearea`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useDispatch } from 'react-redux'
import { setJob } from '../redux/slices/videoJobSlice'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import Resultarea from '../Components/Result/Resultarea'
import Scencearea from '../Components/Result/Scencearea'

const Result = () => {
  const navigate = useNavigate()
  useEffect(() => {
    if (localStorage.getItem('auth') === 'false') {
      navigate('/login')
    }
  }, [localStorage.getItem('auth')])

  const { videoId } = useParams();
  const dispatch = useDispatch();
  const [resultvideo, setResultVideo] = useState('');
  const [scenes, setScenes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  // Transitions UI state
  const [showTransModal, setShowTransModal] = useState(false);
  const [transRows, setTransRows] = useState([]); // one entry per consecutive pair
  const [showShortPopup, setShowShortPopup] = useState(false);

  useEffect(() => {
    const fetchVideo = async () => {
      try {
        setIsLoading(true); setError('');
        const token = localStorage.getItem('token') || '';
        if (videoId) {
          const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/users/videos/get', {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id: token, video_id: videoId })
          });
          const text = await resp.text();
          let data; try { data = JSON.parse(text); } catch (_) { data = text; }
          if (!resp.ok) throw new Error(`users/videos/get failed: ${resp.status} ${text}`);
          const v = data?.video || {};
          setResultVideo(v?.final_video_url || v?.result_url || '');
          setScenes(Array.isArray(v?.scenes) ? v.scenes : []);
          return;
        }
        // Fallback to local storage legacy
        const jobResult = localStorage.getItem('job_result');
        if (jobResult) {
          const jobResultData = JSON.parse(jobResult);
          setResultVideo(jobResultData?.result_url || '');
```


### File: `Scenesettings.js`

- **Path:** `reelzip/src/pages/Scenesettings.js`  
- **Size:** 866 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useEffect
- **Router usage:** useNavigate
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect }` from `react`
  - `{ useNavigate }` from `react-router-dom`
  - `Sidebar` from `../Components/Sidebar`
  - `Topbar` from `../Components/Topbar`
  - `ProfileSidebar` from `../Components/Profile/ProfileSidebar`
  - `Settingsarea` from `../Components/Scence/Settingsarea`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import ProfileSidebar from '../Components/Profile/ProfileSidebar'
import Settingsarea from '../Components/Scence/Settingsarea'

const Scenesettings = () => {
    const navigate = useNavigate()
    useEffect(()=>{
      if(localStorage.getItem('auth') === 'false'){
        navigate('/login')
      }
    },[localStorage.getItem('auth')])

  return (
     <div className='flex h-screen bg-[#E5E2FF]'>
    <Sidebar/>
    <div className="w-full mx-[2rem] mt-[1rem]">
      <Topbar/>
    <div className='h-[77vh] my-2 flex items-start justify-start'>
    <ProfileSidebar />
    <Settingsarea />
    </div>
    </div>
  </div>
  )
}

export default Scenesettings


```


### File: `Subscription.js`

- **Path:** `reelzip/src/pages/Subscription.js`  
- **Size:** 877 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useEffect
- **Router usage:** useNavigate
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect }` from `react`
  - `{ useNavigate }` from `react-router-dom`
  - `Sidebar` from `../Components/Sidebar`
  - `Topbar` from `../Components/Topbar`
  - `ProfileSidebar` from `../Components/Profile/ProfileSidebar`
  - `SubArea` from `../Components/Subscription/SubArea`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import ProfileSidebar from '../Components/Profile/ProfileSidebar'
import SubArea from '../Components/Subscription/SubArea'

const Subscription = () => {
  const navigate = useNavigate()
  useEffect(() => {
    if (localStorage.getItem('auth') === 'false') {
      navigate('/login')
    }
  }, [localStorage.getItem('auth')])

  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
      <Sidebar/>
      <div className="w-full mx-[2rem] mt-[1rem]">
        <Topbar/>
        <div className='h-[77vh] my-2 flex items-start justify-start'>
          <ProfileSidebar />
           <SubArea/>
        </div>
      </div>
    </div>
  )
}

export default Subscription


```


### File: `VideoGuidelines.js`

- **Path:** `reelzip/src/pages/VideoGuidelines.js`  
- **Size:** 794 bytes
- **Exports:** default: `None`; named: —
- **React hooks:** useEffect
- **Router usage:** useNavigate
- **Styling:** Tailwind classes detected
- **Imports:**
  - `React, { useEffect }` from `react`
  - `{ useNavigate }` from `react-router-dom`
  - `Sidebar` from `../Components/Sidebar`
  - `Topbar` from `../Components/Topbar`
  - `Guidlines` from `../Components/VideoGuidlines/Guidlines`

**Code preview (first 50 lines):**

```jsx
import React, { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import Guidlines from '../Components/VideoGuidlines/Guidlines'

const VideoGuidelines = () => {
  const navigate = useNavigate()
  useEffect(() => {
    if (localStorage.getItem('auth') === 'false') {
      navigate('/login')
    }
  }, [localStorage.getItem('auth')])


  return (
    <div className='flex h-screen bg-[#E5E2FF]'>
      <Sidebar />
      <div className="w-full mx-[2rem] mt-[1rem]">
        <Topbar />
        <div className='h-[85vh] my-2 flex items-start justify-start'>
          <Guidlines />
        </div>
      </div>
    </div>
  )
}

export default VideoGuidelines
```


## Folder: `reelzip/src/redux`


### File: `store.js`

- **Path:** `reelzip/src/redux/store.js`  
- **Size:** 980 bytes
- **Exports:** default: `store`; named: —
- **Imports:**
  - `{ configureStore }` from `@reduxjs/toolkit`
  - `{ persistStore, persistReducer }` from `redux-persist`
  - `storage` from `redux-persist/lib/storage`
  - `userReducer` from `./slices/userSlice`
  - `guidelinesReducer` from `./slices/guidelinesSlice`
  - `videoJobReducer` from `./slices/videoJobSlice`

**Code preview (first 50 lines):**

```jsx
import { configureStore } from '@reduxjs/toolkit';
import { persistStore, persistReducer } from 'redux-persist';
import storage from 'redux-persist/lib/storage';
import userReducer from './slices/userSlice';
import guidelinesReducer from './slices/guidelinesSlice';
import videoJobReducer from './slices/videoJobSlice';

// Configure persistence for user slice
const persistConfig = {
  key: 'root',
  storage,
  whitelist: ['user'], // Only persist user state
};

const persistedUserReducer = persistReducer(persistConfig, userReducer);

export const store = configureStore({
  reducer: {
    user: persistedUserReducer,
    guidelines: guidelinesReducer, // in-memory only
    videoJob: videoJobReducer, // in-memory only
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: ['persist/PERSIST', 'persist/REHYDRATE'],
      },
    }),
});

export const persistor = persistStore(store);

export default store;
```


## Folder: `reelzip/src/redux/slices`


### File: `guidelinesSlice.js`

- **Path:** `reelzip/src/redux/slices/guidelinesSlice.js`  
- **Size:** 857 bytes
- **Exports:** default: `None`; named: —
- **Imports:**
  - `{ createSlice }` from `@reduxjs/toolkit`

**Code preview (first 50 lines):**

```jsx
import { createSlice } from '@reduxjs/toolkit';

// This slice holds the in-memory Guidelines form state so navigating
// between steps does not reset selections. It is NOT persisted.

const initialState = {
  form: null,
};

const guidelinesSlice = createSlice({
  name: 'guidelines',
  initialState,
  reducers: {
    setGuidelinesState(state, action) {
      state.form = action.payload || null;
    },
    mergeGuidelinesState(state, action) {
      const patch = action.payload || {};
      state.form = { ...(state.form || {}), ...patch };
    },
    clearGuidelinesState(state) {
      state.form = null;
    },
  },
});

export const { setGuidelinesState, mergeGuidelinesState, clearGuidelinesState } = guidelinesSlice.actions;
export const selectGuidelinesForm = (state) => state.guidelines?.form || null;

export default guidelinesSlice.reducer;

```


### File: `userSlice.js`

- **Path:** `reelzip/src/redux/slices/userSlice.js`  
- **Size:** 11180 bytes
- **Exports:** default: `None`; named: —
- **HTTP libs:** axios
- **Imports:**
  - `{ createSlice, createAsyncThunk }` from `@reduxjs/toolkit`
  - `axios` from `axios`

**Code preview (first 50 lines):**

```jsx
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';

const AUTH_BASE = 'https://auth-js-g3hnh7gbc4c5fje4.uaenorth-01.azurewebsites.net';

// Helper function to save auth data to localStorage
const saveAuthToStorage = (user, token) => {
  try {
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    localStorage.setItem('isAuthenticated', 'true');
  } catch (error) {
    console.error('Error saving auth data to localStorage:', error);
  }
};

// Helper function to clear auth data from localStorage
const clearAuthFromStorage = () => {
  try {
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    localStorage.removeItem('isAuthenticated');
  } catch (error) {
    console.error('Error clearing auth data from localStorage:', error);
  }
};

// Helper function to get auth data from localStorage
const getAuthFromStorage = () => {
  try {
    const user = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    const isAuthenticated = localStorage.getItem('isAuthenticated');
    
    if (user && token && isAuthenticated === 'true') {
      return {
        user: JSON.parse(user),
        token: token,
        isAuthenticated: true
      };
    }
    return null;
  } catch (error) {
    console.error('Error getting auth data from localStorage:', error);
    return null;
  }
};

// Async thunk for login
export const loginUser = createAsyncThunk(
```


### File: `videoJobSlice.js`

- **Path:** `reelzip/src/redux/slices/videoJobSlice.js`  
- **Size:** 1289 bytes
- **Exports:** default: `None`; named: —
- **Imports:**
  - `{ createSlice }` from `@reduxjs/toolkit`

**Code preview (first 50 lines):**

```jsx
import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  jobId: null,
  status: null,
  progress: null,
  resultUrl: null,
  lastUpdated: null,
  error: null,
  statusUrl: null,
};

const videoJobSlice = createSlice({
  name: 'videoJob',
  initialState,
  reducers: {
    setJob(state, action) {
      const { jobId, status=null, progress=null, statusUrl=null } = action.payload || {};
      state.jobId = jobId;
      state.status = status;
      state.progress = progress;
      state.resultUrl = null;
      state.error = null;
      state.statusUrl = statusUrl;
      state.lastUpdated = new Date().toISOString();
    },
    updateJobStatus(state, action) {
      const { status, progress, resultUrl, error } = action.payload || {};
      if (status) state.status = status;
      if (progress !== undefined) state.progress = progress;
      if (resultUrl !== undefined) state.resultUrl = resultUrl;
      if (error !== undefined) state.error = error;
      state.lastUpdated = new Date().toISOString();
    },
    clearJob(state) { Object.assign(state, initialState); },
  },
});

export const { setJob, updateJobStatus, clearJob } = videoJobSlice.actions;
export const selectVideoJob = (state) => state.videoJob || initialState;
export default videoJobSlice.reducer;
```


## Folder: `reelzip/src/utils`


### File: `formatting.js`

- **Path:** `reelzip/src/utils/formatting.js`  
- **Size:** 4962 bytes
- **Exports:** default: `None`; named: —
- **Styling:** Tailwind classes detected

**Code preview (first 50 lines):**

```jsx
// Utility functions for formatting AI responses and other content

// Function to format AI response content with proper formatting
export const formatAIResponse = (content) => {
  if (!content || typeof content !== 'string') return content;
  // Normalize common duplication artifacts like repeated all-caps titles
  try {
    // Collapse patterns like "VIDEO BLUEPRINTVIDEO BLUEPRINT" to a single occurrence
    content = content.replace(/(\b[A-Z][A-Z ]{2,}\b)\1/g, '$1');
  } catch (_) { /* noop */ }

  // Split content into lines for processing
  const lines = content.split('\n');
  
  return (
    <div className="ai-message-content">
      {lines.map((line, index) => {
        // Handle bullet points and numbered lists
        if (line.trim().match(/^[\-\*•]\s/)) {
          return (
            <div key={index} className="ai-bullet-point">
              <span className="ai-bullet-point bullet">•</span>
              <span className="ai-bullet-point content">{formatLine(line.replace(/^[\-\*•]\s/, ''))}</span>
            </div>
          );
        }
        
        // Handle numbered lists
        if (line.trim().match(/^\d+\.\s/)) {
          const number = line.match(/^(\d+)\.\s/)[1];
          const text = line.replace(/^\d+\.\s/, '');
          return (
            <div key={index} className="ai-numbered-list">
              <span className="ai-numbered-list number">{number}.</span>
              <span className="ai-numbered-list content">{formatLine(text)}</span>
            </div>
          );
        }
        
        // Handle empty lines
        if (line.trim() === '') {
          return <div key={index} className="ai-empty-line"></div>;
        }
        
        // Handle headers (lines that end with colon and are short)
        if (line.trim().match(/^[A-Z][^:]*:$/) && line.trim().length < 50) {
          return (
            <div key={index} className="ai-header">
              {line.trim().replace(':', '')}
            </div>
```
