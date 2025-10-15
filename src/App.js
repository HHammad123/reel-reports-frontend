
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
import Onboarding from './pages/Onboarding';
import VideoGuidelines from './pages/VideoGuidelines';
import MyMedia from './pages/MyMedia';
import BuildReel from './pages/BuildReel';
import ScenesImages from './pages/ScenesImages';
import PriceGuidelines from './pages/PriceGuidelines';
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
         <Route path="/onboarding" element={<Onboarding/>}/>
   
       
    <Route path="/v1/auth/callback/:provider" element={<OAuthCallback />} />
         
         {/* Protected routes */}
         <Route path="/" element={
           <ProtectedRoute>
             <Dashboard />
           </ProtectedRoute>
         } />
         <Route path="/chat/:sessionId" element={
           <ProtectedRoute>
             <Home/>
           </ProtectedRoute>
         } />
         <Route path="/main" element={
           <ProtectedRoute>
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
       </Routes>
    </div>
  );
}

export default App;
