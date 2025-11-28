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
      <div className="flex-1 mx-[2rem] mt-[1rem] min-w-0">
        <Topbar />
        <div className='h-[87vh] rounded-lg overflow-scroll scrollbar-hide my-2 flex items-start justify-start'>
          <BuildReelWizard />
        </div>
      </div>
    </div>
  );
}

export default BuildReel;
