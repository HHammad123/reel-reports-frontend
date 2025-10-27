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
		},
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
		<div className='bg-white w-full h-full rounded-lg overflow-y-scroll p-[30px] scrollbar-hide '>
			<div className="flex flex-col md:flex-row items-end justify-between">
				{/* Left Section */}
				<div className="flex-1 text-left">
					<h1 className="text-2xl md:text-3xl font-bold text-gray-900 leading-snug">
						Start Generating Highly First Reel Report Today
					</h1>
					<p className="mt-2 text-gray-600 text-sm md:text-base">
						Premium Quality Faster Performance
					</p>

					<div className="mt-6 flex gap-4">
						<button onClick={handleStartGenerating} className="bg-[#13008B] text-white px-6 py-3 rounded-lg font-medium hover:bg-[#0F0070] transition">
							Start Generating
						</button>
					<button onClick={handleCompleteProfile} className="border border-[#13008B] text-[#13008B] px-6 py-3 rounded-lg font-medium hover:bg-[#F5F3FF] transition">
						Complete Profile
					</button>
					</div>
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
				<h3 className='text-[20px] font-semibold'>Start our video generation journey:</h3>
				<div className="flex gap-6 mt-2">
					{cards.map((card) => (
						<div
							key={card.id}
							className="w-48 h-48 bg-gray-100 rounded-lg shadow-sm flex flex-col items-center justify-center hover:shadow-md cursor-pointer transition"
						>
							{card.icon}
							<p className="mt-4 text-[#13008B] font-semibold text-lg">
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
	)
}

export default DashboardItems
