import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import OnboardingWizard from '../Components/Onboarding/OnboardingWizard';

const Onboarding = () => {
  const navigate = useNavigate();
  const [authed, setAuthed] = useState(true);

  useEffect(() => {
    const a = localStorage.getItem('auth');
    if (a === 'false') {
      setAuthed(false);
      navigate('/login');
    }
  }, [navigate]);

  if (!authed) return null;

  return (
    <div className='flex justify-center items-center min-h-screen bg-[#E5E2FF]'>
      <OnboardingWizard />
    </div>
  );
};

export default Onboarding;

