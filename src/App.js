
import React, { useEffect, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { useSelector } from 'react-redux';
import "./App.css"
import { selectIsAuthenticated, selectUser } from './redux/slices/userSlice';
import { SidebarProvider } from './Contexts/SidebarContext';
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
import Onboarding from './pages/Onboarding';
import VideoGuidelines from './pages/VideoGuidelines';
import MyMedia from './pages/MyMedia';
import BuildReel from './pages/BuildReel';
import ScenesImages from './pages/ScenesImages';
import PriceGuidelines from './pages/PriceGuidelines';
import OAuthCallback2 from './Components/OAuthCallback2';
import ProtectedRoute from './Components/ProtectedRoute';
import OAuthCallback from './Components/Login/OAuthCallback';
import AdminUsers from './pages/AdminUsers';
import AdminCreateUser from './pages/AdminCreateUser';
import VideoEditor from './pages/VideoEditor';
import VideoEditorPage from './pages/VideoEditorPage';
import FreeTrialOver from './pages/FreeTrialOver';


function App() {
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const user = useSelector(selectUser);

  // Check user validation status - check both Redux state and localStorage
  const userStatus = useMemo(() => {
    // First check Redux user object
    let status = user?.status || user?.validation_status || '';
    
    // Fallback to localStorage if not in Redux
    if (!status && isAuthenticated) {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          status = parsedUser?.status || parsedUser?.validation_status || '';
        }
      } catch (e) {
        console.warn('Error reading user from localStorage:', e);
      }
    }
    
    return status ? status.toString().toLowerCase() : '';
  }, [user, isAuthenticated]);

  const normalizedStatus = useMemo(() => {
    if (!userStatus) return '';
    return userStatus === 'non_validated' ? 'not_validated' : userStatus;
  }, [userStatus]);

  const rawRole = useMemo(() => {
    if (!user) {
      // Fallback to localStorage
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          return (parsedUser?.role || parsedUser?.user_role || parsedUser?.type || parsedUser?.userType || '').toString().toLowerCase();
        }
      } catch (e) {
        // ignore
      }
      return '';
    }
    return (user?.role || user?.user_role || user?.type || user?.userType || '').toString().toLowerCase();
  }, [user]);

  // Check if user is validated - only show chat if status is explicitly 'validated'
  // If status is 'not_validated' or 'non_validated', show FreeTrialOver
  // Role doesn't matter - only status matters
  const isValidated = useMemo(() => {
    if (!isAuthenticated) return false;
    if (!normalizedStatus) return false; // If no status, treat as not validated for safety
    const statusLower = normalizedStatus.toLowerCase();
    return statusLower === 'validated';
  }, [isAuthenticated, normalizedStatus]);

  // Debug authentication state
  useEffect(() => {
    console.log('App - Authentication state changed:', { 
      isAuthenticated, 
      user, 
      userStatus,
      normalizedStatus,
      isValidated,
      userStatusValue: user?.status,
      userValidationStatus: user?.validation_status
    });
  }, [isAuthenticated, user, userStatus, normalizedStatus, isValidated]);

  return (
    <div className="App">
      <SidebarProvider>
       <Routes>
         {/* Public routes */}
         <Route path="/login" element={<Login/>} />
         <Route path="/onboarding" element={<Onboarding/>}/>
   
       
    <Route path="/v1/auth/callback/:provider" element={<OAuthCallback />} />
         {/* test route */  }
         <Route path="/video-editor" element={<VideoEditorPage/>} />
         {/* Protected routes */}
         <Route path="/" element={
           <ProtectedRoute>
             <Dashboard />
           </ProtectedRoute>
         } />
         <Route path="/chat/:sessionId" element={
           <ProtectedRoute>
             {(() => {
               // Only check validation status - role doesn't matter
               // If status is 'validated', show chat; otherwise show FreeTrialOver
               if (isAuthenticated && isValidated) {
                 return <Home/>;
               }
               // If not validated (or status is missing), show FreeTrialOver
               return <FreeTrialOver />;
             })()}
           </ProtectedRoute>
         } />
         <Route path="/main" element={
           <ProtectedRoute>
            {/* sdgsd */}
             <Main />
           </ProtectedRoute>
         } />
         <Route path="/profile" element={
           <ProtectedRoute>
             <Profile />
           </ProtectedRoute>
         } />
         <Route path="/brandguidelines" element={
           <ProtectedRoute>
             <BrandGuidelines />
           </ProtectedRoute>
         } />
         <Route path="/videoguidelines" element={
           <ProtectedRoute>
             <VideoGuidelines />
           </ProtectedRoute>
         } />
         <Route path="/buildreel" element={
           <ProtectedRoute>
             <BuildReel />
           </ProtectedRoute>
         } />
         <Route path="/buildreel/:sessionId" element={
           <ProtectedRoute>
             <BuildReel />
           </ProtectedRoute>
         } />
         <Route path="/scenesettings" element={
           <ProtectedRoute>
             <Scenesettings />
           </ProtectedRoute>
         } />
         <Route path="/videoEditor" element={
           <ProtectedRoute>
             <VideoEditor />
           </ProtectedRoute>
         } />
         <Route path="/subscription" element={
           <ProtectedRoute>
             <Subscription />
           </ProtectedRoute>
         } />
         <Route path="/result" element={
           <ProtectedRoute>
             <Result />
           </ProtectedRoute>
         } />
         <Route path="/result/:videoId" element={
           <ProtectedRoute>
             <Result />
           </ProtectedRoute>
         } />
         <Route path="/media" element={
           <ProtectedRoute>
             <MyMedia />
           </ProtectedRoute>
         } />
         <Route path="/price-guidelines" element={
           <ProtectedRoute>
             <PriceGuidelines />
           </ProtectedRoute>
         } />
         <Route path="/scenes-images" element={
           <ProtectedRoute>
             <ScenesImages />
           </ProtectedRoute>
         } />
         <Route path="/admin/users" element={
           <ProtectedRoute>
             <AdminUsers />
           </ProtectedRoute>
         } />
         <Route path="/admin/users/create" element={
           <ProtectedRoute>
             <AdminCreateUser />
           </ProtectedRoute>
         } />
       </Routes>
      </SidebarProvider>
    </div>
  );
}

export default App;
