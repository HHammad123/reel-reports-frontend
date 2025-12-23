import React, { useCallback, useEffect, useMemo, useState } from 'react'
import bg from "../../asset/bg-home.png"
import { FaChevronLeft, FaChevronRight, FaImages, FaPlay, FaPlayCircle, FaRegEdit, FaThLarge, FaUserFriends, FaVideo } from 'react-icons/fa'
import { useNavigate } from 'react-router-dom'
import { useSelector } from 'react-redux'
import { selectToken, selectUser } from '../../redux/slices/userSlice'

const DashboardItems = () => {
	const navigate = useNavigate();
	const token = useSelector(selectToken) || (typeof window !== 'undefined' ? localStorage.getItem('token') : '');
	const user = useSelector(selectUser);
  const [recentVideos, setRecentVideos] = useState([]);
  const [isLoadingRecent, setIsLoadingRecent] = useState(false);
  const [recentError, setRecentError] = useState('');
  const [carouselIndex, setCarouselIndex] = useState(0);
  const [showTrialOverModal, setShowTrialOverModal] = useState(false);
  const [viewportWidth, setViewportWidth] = useState(
    typeof window !== 'undefined' ? window.innerWidth : 1280
  );

  const handleCompleteProfile = useCallback(() => {
		navigate('/onboarding');
	}, [navigate]);

  const handleStartGenerating = useCallback(async () => {
    try {
      const userToken = token || localStorage.getItem('token') || '';
      if (!userToken) { navigate('/login'); return; }
      
      // Check user validation status - check both Redux and localStorage
      let userStatus = (user?.status || user?.validation_status || '').toString().toLowerCase();
      
      // Fallback to localStorage if not in Redux
      if (!userStatus || userStatus === '') {
        try {
          const storedUser = localStorage.getItem('user');
          if (storedUser) {
            const parsedUser = JSON.parse(storedUser);
            userStatus = (parsedUser?.status || parsedUser?.validation_status || '').toString().toLowerCase();
          }
        } catch (e) {
          console.warn('Error reading user from localStorage:', e);
        }
      }
      
      const normalizedStatus = userStatus === 'non_validated' ? 'not_validated' : userStatus;
      
      // Check if user is admin (also check localStorage)
      let checkIsAdmin = false;
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          const localRole = (parsedUser?.role || parsedUser?.user_role || parsedUser?.type || parsedUser?.userType || '').toString().toLowerCase();
          checkIsAdmin = localRole === 'admin';
        }
      } catch (e) {
        // ignore
      }
      
      // Only allow if status is 'validated' OR user is admin, otherwise show trial over modal
      if (normalizedStatus !== 'validated' && !checkIsAdmin) {
        console.log('Blocking dashboard access - Status:', normalizedStatus, 'IsAdmin:', checkIsAdmin);
        setShowTrialOverModal(true);
        return;
      }
      
      try { localStorage.setItem('is_creating_session', 'true'); } catch(_){}
      const resp = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/sessions/new', {
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
  }, [navigate, token, user]);

	useEffect(() => {
		if (typeof window === 'undefined') return;
		const handleResize = () => setViewportWidth(window.innerWidth);
		window.addEventListener('resize', handleResize);
		return () => window.removeEventListener('resize', handleResize);
	}, []);
	// Tutorial video commented out
	// const openTutorial = () => {
	//   try { localStorage.setItem('show_tutorial_video', 'true'); } catch(_) {}
	//   if (typeof window !== 'undefined' && typeof window.openTutorialVideo === 'function') {
	//     window.openTutorialVideo();
	//   }
	// };

	const handleStartBuildReel = useCallback(async () => {
		try {
			try { localStorage.setItem('is_creating_session', 'true'); } catch(_){}
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
			navigate(`/buildreel/${newId}`);
		} catch (e) {
			console.error('Failed to create build reel session:', e);
			alert('Unable to open Build Reel. Please try again.');
		}
	}, [navigate, token]);

	const cards = [
		{
			id: 0,
			icon: <FaPlayCircle className="text-[#13008B] w-12 h-12" />,
			label: "Generate Reel",
			onClick: handleStartGenerating,
		},
		{
			id: 1,
			icon: <FaThLarge className="text-[#13008B] w-12 h-12" />,
			label: "Build Reel",
			onClick: handleStartBuildReel,
			disabled: false,
		},
		{
			id: 2,
			link: "/media",
			icon: <FaImages className="text-[#13008B] w-12 h-12" />,
			label: "My Media",
		},
		{
			id: 3,
			link: "/brandguidelines",
			icon: <FaUserFriends className="text-[#13008B] w-12 h-12" />,
			label: "Update Brand Guidelines",
		},
		// Tutorial video card commented out
		// {
		// 	id: 4,
		// 	link: "#tutorial",
		// 	icon: <FaVideo className="text-[#13008B] w-12 h-12" />,
		// 	label: "Tutorial Video",
		// 	onClick: openTutorial,
		// },
	];
  useEffect(() => {
    const fetchRecent = async () => {
      try {
        setIsLoadingRecent(true); setRecentError('');
        const user_id = token || localStorage.getItem('token') || '';
        const session_id = localStorage.getItem('session_id') || '';
        const resp = await fetch('https://reelvideostest-gzdwbtagdraygcbh.canadacentral-01.azurewebsites.net/v1/users/videos', {
          method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_id, session_id })
        });
        const text = await resp.text();
        let json; try { json = JSON.parse(text); } catch (_) { json = text; }
        if (!resp.ok) throw new Error(`users/videos failed: ${resp.status} ${text}`);
        const content = json?.content || json || {};
        const videos = Array.isArray(content?.videos) ? content.videos : (Array.isArray(json?.videos) ? json.videos : []);
        const normalized = videos.map(v => ({
          id: v?.id || v?.video_id || v?.job_id || Math.random().toString(36).slice(2),
          url: v?.final_video_url || v?.result_url || '',
          created_at: v?.created_at || v?.updated_at || new Date().toISOString(),
          title: v?.title || v?.name || 'Video'
        }));
        normalized.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        setRecentVideos(normalized);
      } catch (e) {
        setRecentError(e?.message || 'Failed to load recent videos');
      } finally { setIsLoadingRecent(false); }
    };
    fetchRecent();
  }, [token]);
	return (
		<>
		<div className='bg-white w-full h-full rounded-lg overflow-y-scroll p-[30px] scrollbar-hide '>
			<div className="flex flex-col md:flex-row items-end justify-between">
				{/* Left Section */}
				<div className="flex-1 text-left">
					<h1 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug">
					Communication, brought to life, within branding guidelines and under your control
					</h1>
					<p className="mt-2 text-gray-600 text-sm md:text-base">
					Communicate and engage better and faster
					</p>

					
				</div>

				{/* Right Section - Most recent video */}
				<div className="flex-1 mt-8 md:mt-0 md:ml-8 flex justify-center relative bg-black rounded-lg overflow-hidden">
					{recentVideos[0]?.url ? (
						<video src={recentVideos[0].url} controls className="w-full md:w-[90%] h-full object-contain" onClick={() => navigate(`/result/${encodeURIComponent(recentVideos[0].id)}`)} />
					) : (
						<img
							src={bg}
							alt="Most recent video"
							className=" w-full md:w-[90%] object-cover rounded-lg"
						/>
					)}
					{!recentVideos[0]?.url && (
						<div className='bg-white/60 absolute top-1/2 w-10 h-10 rounded-full flex justify-center items-center'>
							<FaPlay />
						</div>
					)}
					{recentVideos[0]?.created_at && (
						<div className='bg-white/70 absolute top-3 left-3 px-2 py-0.5 rounded text-xs text-gray-700'>
							{new Date(recentVideos[0].created_at).toLocaleDateString()}
						</div>
					)}
				</div>
			</div>
			<div className='flex flex-col mt-5 justify-start items-start'>
				<h3 className='text-[20px] font-semibold'>Start your video generation journey:</h3>
				<div className="flex gap-6 mt-2">
					{cards.map((card) => (
						<div
							key={card.id}
							className={`w-48 h-48 bg-gray-100 rounded-lg shadow-sm flex flex-col items-center justify-center transition ${
								card.disabled 
									? 'opacity-60 cursor-not-allowed' 
									: 'hover:shadow-md cursor-pointer'
							}`}
							onClick={() => { 
								if (card.disabled) return;
								if (card.onClick) { card.onClick(); return; } 
								if (card.link) navigate(card.link); 
							}}
						>
							{card.icon}
							<p className={`mt-4 font-semibold text-center text-lg ${
								card.disabled 
									? 'text-gray-500' 
									: 'text-[#13008B]'
							}`}>
								{card.label}
							</p>
						</div>
					))}
				</div>
			</div>
			<div className='flex flex-col mt-5 justify-start items-start'>
				<h3 className='text-[20px] font-semibold'>Recently Created:</h3>

				{isLoadingRecent && (<div className="mt-2 text-sm text-gray-600">Loading…</div>)}
				{recentError && (<div className="mt-2 text-sm text-red-600">{recentError}</div>)}
				<div className="flex gap-6 mt-2 w-[70vw] overflow-x-auto flex-nowrap scrollbar-hide">
					{recentVideos.map((vid) => (
						<div key={vid.id} className="min-w-[220px] rounded-lg shadow-sm hover:shadow-md cursor-pointer transition relative bg-black">
							{vid.url ? (
								<video src={vid.url} className="w-full h-40 object-cover rounded-lg" controls muted />
							) : (
								<img src={bg} alt={vid.title} className="w-full h-40 object-cover rounded-lg opacity-70" />
							)}
							<div className='bg-white/70 absolute top-2 left-2 px-2 py-0.5 rounded text-xs text-gray-700'>
								{new Date(vid.created_at).toLocaleDateString()}
							</div>
							<div className='bg-white/60 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex justify-center items-center'>
								<FaPlay />
							</div>
						</div>
					))}
				</div>
			</div>

		</div>
		{/* Trial Over Modal */}
		{showTrialOverModal && (
			<div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm">
				<div className="bg-white rounded-lg shadow-2xl w-full max-w-md mx-4 relative">
					<button
						onClick={() => setShowTrialOverModal(false)}
						className="absolute top-4 right-4 w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 text-gray-600 hover:text-gray-800 flex items-center justify-center transition-colors"
						title="Close"
					>
						<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
					<div className="p-6 pt-8">
						<div className="text-center mb-6">
							<div className="mx-auto w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mb-4">
								<svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
								</svg>
							</div>
							<h3 className="text-xl font-semibold text-gray-900 mb-2">Free Trial Expired</h3>
							<p className="text-sm text-gray-600">
								Your free trial is over. Please contact support to continue using the service.
							</p>
						</div>
						<div className="flex justify-center">
							<button
								onClick={() => setShowTrialOverModal(false)}
								className="px-6 py-2.5 bg-[#13008B] text-white rounded-lg hover:bg-[#0f0068] transition-colors font-medium"
							>
								Close
							</button>
						</div>
					</div>
				</div>
			</div>
		)}
		</>
	)
}

export default DashboardItems
