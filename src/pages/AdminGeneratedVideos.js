import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import { selectUser } from '../redux/slices/userSlice'
import { normalizeGeneratedBaseVideosResponse } from '../utils/generatedMediaUtils'

const ADMIN_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net'

const AdminGeneratedVideos = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const user = useSelector(selectUser)

  // Check role from Redux and localStorage (for reload scenarios)
  const isAdmin = useMemo(() => {
    let rawRole = (user?.role || user?.user_role || user?.type || user?.userType || '').toString().toLowerCase()
    
    if (!rawRole || rawRole === '') {
      try {
        const storedUser = localStorage.getItem('user')
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser)
          rawRole = (parsedUser?.role || parsedUser?.user_role || parsedUser?.type || parsedUser?.userType || '').toString().toLowerCase()
        }
      } catch (e) {
        console.warn('Error reading user from localStorage:', e)
      }
    }
    
    return rawRole === 'admin'
  }, [user])

  const [videos, setVideos] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9')
  const [baseVideosData, setBaseVideosData] = useState({}) // Store raw base_videos structure
  const abortControllerRef = useRef(null)
  const isFetchingRef = useRef(false) // Track if fetch is in progress to prevent duplicate calls

  // Helper to normalize aspect ratio values for comparison
  const normalizeAspectRatio = (ratio) => {
    if (!ratio) return null
    if (typeof ratio === 'number') {
      ratio = String(ratio)
    }
    if (typeof ratio !== 'string') return null
    
    const cleaned = ratio.replace(/\s+/g, '').replace(/_/g, ':')
    const match = cleaned.match(/(\d+(?:\.\d+)?)[:/xX](\d+(?:\.\d+)?)/)
    if (match) {
      const w = Number(match[1])
      const h = Number(match[2])
      if (w > 0 && h > 0) {
        if (w === 9 && h === 16) return '9:16'
        if (w === 16 && h === 9) return '16:9'
        return `${w}:${h}`
      }
    }
    const lower = cleaned.toLowerCase()
    if (lower === '9:16' || lower === '9x16' || lower === '9_16' || lower === '9/16') return '9:16'
    if (lower === '16:9' || lower === '16x9' || lower === '16_9' || lower === '16/9') return '16:9'
    return null
  }

  // Get sessions and videos for selected aspect ratio
  const sessionsForAspectRatio = useMemo(() => {
    if (!selectedAspectRatio || !baseVideosData[selectedAspectRatio]) return []
    
    const aspectRatioData = baseVideosData[selectedAspectRatio]
    if (typeof aspectRatioData !== 'object') return []
    
    // Convert to array of { sessionName, videos } objects
    return Object.entries(aspectRatioData).map(([sessionName, videos]) => ({
      sessionName,
      videos: Array.isArray(videos) ? videos : []
    })).filter(session => session.videos.length > 0)
  }, [selectedAspectRatio, baseVideosData])

  const fetchVideos = useCallback(
    async (abortSignal) => {
      if (!isAdmin || !userId) {
        setLoading(false)
        isFetchingRef.current = false
        return
      }
      
      // Prevent duplicate calls
      if (isFetchingRef.current) {
        return
      }
      
      isFetchingRef.current = true
      setLoading(true)
      setError('')
      try {
        const token = localStorage.getItem('token') || ''
        const apiPath = `${ADMIN_BASE}/v1/users/user/${encodeURIComponent(userId)}/generated-base-videos`
        
        console.log('=== ADMIN GENERATED VIDEOS: API FETCH ===')
        console.log('API Fetch Path:', apiPath)
        
        const response = await fetch(apiPath, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          ...(abortSignal ? { signal: abortSignal } : {})
        })

        if (!response.ok) {
          // If 404 or empty response, treat as no videos found
          if (response.status === 404) {
            setVideos([])
            setError('')
            setLoading(false)
            return
          }
          const message = await response.text()
          throw new Error(message || `Unable to load videos (${response.status})`)
        }

        let data
        try {
          const responseText = await response.text()
          if (!responseText || responseText.trim() === '') {
            setVideos([])
            setError('')
            setLoading(false)
            return
          }
          data = JSON.parse(responseText)
        } catch (parseError) {
          // If response is not valid JSON, treat as empty
          setVideos([])
          setError('')
          setLoading(false)
          return
        }

        console.log('=== ADMIN GENERATED VIDEOS: API RESPONSE ===')
        console.log('Full API Response:', data)
        console.log('Base Videos Structure:', data?.base_videos)
        
        // Normalize and sort the base_videos structure
        const normalized = normalizeGeneratedBaseVideosResponse(data);
        const baseVideos = normalized.base_videos || {};
        setBaseVideosData(baseVideos);
        
        // Log the structure for debugging
        console.log('=== ADMIN GENERATED VIDEOS: STRUCTURE BY ASPECT RATIO ===')
        Object.keys(baseVideos).forEach(aspectRatio => {
          const sessions = baseVideos[aspectRatio]
          if (typeof sessions === 'object') {
            console.log(`Aspect Ratio: ${aspectRatio}`)
            Object.entries(sessions).forEach(([sessionName, videos]) => {
              if (Array.isArray(videos)) {
                console.log(`  Session: ${sessionName} - ${videos.length} videos`)
              }
            })
          }
        })
        
        // Also create flat array for backward compatibility (using normalized data)
        let videosData = []
        if (baseVideos && typeof baseVideos === 'object') {
          Object.entries(baseVideos).forEach(([aspectRatio, sessions]) => {
            if (typeof sessions === 'object') {
              Object.entries(sessions).forEach(([sessionName, videos]) => {
                if (Array.isArray(videos)) {
                  videos.forEach((video, idx) => {
                    if (typeof video === 'string') {
                      videosData.push({ 
                        video_url: video, 
                        url: video,
                        aspect_ratio: aspectRatio,
                        session_name: sessionName,
                        video_id: `${aspectRatio}-${sessionName}-${idx}`
                      })
                    } else if (video && typeof video === 'object') {
                      videosData.push({ 
                        ...video, 
                        aspect_ratio: aspectRatio,
                        session_name: sessionName,
                        video_id: video.id || video.video_id || `${aspectRatio}-${sessionName}-${idx}`
                      })
                    }
                  })
                }
              })
            }
          })
        } else if (data?.generated_videos && typeof data.generated_videos === 'object') {
          Object.entries(data.generated_videos).forEach(([aspectRatio, videosList]) => {
            if (Array.isArray(videosList)) {
              videosList.forEach(video => {
                if (video && typeof video === 'object') {
                  videosData.push({ ...video, aspect_ratio: aspectRatio })
                } else if (typeof video === 'string') {
                  videosData.push({ video_url: video, aspect_ratio: aspectRatio })
                }
              })
            }
          })
        } else if (Array.isArray(data)) {
          videosData = data
        } else if (Array.isArray(data?.videos)) {
          videosData = data.videos
        } else if (Array.isArray(data?.data)) {
          videosData = data.data
        }
        
        setVideos(videosData)
        
        // Set default aspect ratio if available
        const availableAspectRatios = Object.keys(baseVideos).filter(key => {
          const sessions = baseVideos[key]
          return typeof sessions === 'object' && Object.values(sessions).some(videos => Array.isArray(videos) && videos.length > 0)
        })
        if (availableAspectRatios.length > 0 && !availableAspectRatios.includes(selectedAspectRatio)) {
          setSelectedAspectRatio(availableAspectRatios[0])
        }
        
        setError('') // Clear any previous errors if we got a successful response
      } catch (err) {
        if (err.name === 'AbortError') {
          // Don't update state if request was aborted
          isFetchingRef.current = false
          return
        }
        console.error('Failed to fetch videos:', err)
        setError(err.message || 'Failed to fetch videos.')
        setVideos([]) // Clear videos on error
      } finally {
        // Only update loading state if request wasn't aborted
        if (!abortSignal || !abortSignal.aborted) {
          setLoading(false)
        }
        isFetchingRef.current = false
      }
    },
    [isAdmin, userId]
  )

  // Fetch videos on mount and when userId changes
  useEffect(() => {
    if (!isAdmin || !userId) {
      setLoading(false)
      return
    }
    
    // Prevent duplicate calls
    if (isFetchingRef.current) {
      return
    }
    
    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    fetchVideos(controller.signal)
    
    return () => {
      // Only abort if this is the current controller
      if (abortControllerRef.current === controller) {
        controller.abort()
        abortControllerRef.current = null
      }
      // Don't reset isFetchingRef here - let it reset in the fetchVideos finally block
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, userId]) // Only depend on isAdmin and userId, not fetchVideos

  const [checkingAdmin, setCheckingAdmin] = useState(true)
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setCheckingAdmin(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  if (checkingAdmin) {
    return (
      <div className="flex h-screen bg-[#E5E2FF] overflow-hidden">
        <Sidebar />
        <div className="flex-1 mx-[2rem] mt-[1rem] flex flex-col overflow-hidden min-h-0 min-w-0">
          <Topbar />
          <div className="flex-1 my-2 overflow-hidden min-h-0 flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#13008B]/30 border-t-[#13008B]"></div>
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        const localRole = (parsedUser?.role || parsedUser?.user_role || parsedUser?.type || parsedUser?.userType || '').toString().toLowerCase()
        if (localRole !== 'admin') {
          return <Navigate to="/" replace />
        }
      } else {
        return <Navigate to="/" replace />
      }
    } catch (e) {
      return <Navigate to="/" replace />
    }
  }

  const formatValue = (value) => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      try {
        return new Date(value).toLocaleString()
      } catch (e) {
        return value
      }
    }
    if (typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://'))) {
      return (
        <a href={value} target="_blank" rel="noopener noreferrer" className="text-[#13008B] hover:underline">
          View Video
        </a>
      )
    }
    return String(value)
  }

  return (
    <div className="flex h-screen bg-[#E5E2FF] overflow-hidden">
      <Sidebar />
      <div className="flex-1 mx-[2rem] mt-[1rem] flex flex-col overflow-hidden min-h-0 min-w-0">
        <Topbar />

        <div className="flex-1 my-2 overflow-hidden min-h-0">
          <div className="flex h-full min-h-0 flex-col rounded-3xl bg-white/95 px-6 py-6 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h1 className="text-2xl font-semibold text-[#13008B]">Generated Videos</h1>
                <p className="text-sm text-[#4B3CC4]">
                  All generated base videos for user ID: {userId}
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Aspect Ratio:</label>
                  <select
                    value={selectedAspectRatio}
                    onChange={(e) => setSelectedAspectRatio(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#13008B] focus:border-[#13008B]"
                  >
                    {Object.keys(baseVideosData).length > 0 ? (
                      Object.keys(baseVideosData).map(aspectRatio => (
                        <option key={aspectRatio} value={aspectRatio}>{aspectRatio}</option>
                      ))
                    ) : (
                      <>
                        <option value="16:9">16:9</option>
                        <option value="9:16">9:16</option>
                      </>
                    )}
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/admin/logs')}
                  className="inline-flex items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-[#13008B] shadow-sm transition hover:bg-[#13008B]/10"
                >
                  Back to Logs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Abort any ongoing request
                    if (abortControllerRef.current) {
                      abortControllerRef.current.abort()
                      abortControllerRef.current = null
                    }
                    // Reset fetch flag to allow manual refresh
                    isFetchingRef.current = false
                    // Fetch fresh data without abort signal (manual refresh)
                    fetchVideos(undefined)
                  }}
                  className="inline-flex items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-[#13008B] shadow-sm transition hover:bg-[#13008B]/10"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#13008B]/30 border-t-[#13008B]"></div>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : videos.length === 0 ? (
                <div className="rounded-xl border border-[#E8E4FF] bg-[#F6F4FF] px-4 py-6 text-center text-sm text-[#4B3CC4]">
                  No generated videos found for this user.
                </div>
              ) : sessionsForAspectRatio.length === 0 ? (
                <div className="rounded-xl border border-[#E8E4FF] bg-[#F6F4FF] px-4 py-6 text-center text-sm text-[#4B3CC4]">
                  No videos found for aspect ratio {selectedAspectRatio}. Try selecting a different aspect ratio.
                </div>
              ) : (
                <div className="space-y-8">
                  {sessionsForAspectRatio.map((session, sessionIdx) => (
                    <div key={session.sessionName} className="space-y-4">
                      {/* Session Name Header */}
                      <div className="border-b border-gray-200 pb-2">
                        <h3 className="text-lg font-semibold text-[#13008B]">{session.sessionName}</h3>
                        <p className="text-sm text-gray-500">{session.videos.length} video{session.videos.length !== 1 ? 's' : ''}</p>
                      </div>
                      
                      {/* Videos Grid for this Session */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {session.videos.map((video, videoIdx) => {
                          // Handle both string URLs and object structures
                          const videoUrl = typeof video === 'string' 
                            ? video 
                            : (video?.video_url || video?.videoUrl || video?.url || video?.src || video?.link || video?.video || video?.file_url || video?.fileUrl || video?.download_url || video?.downloadUrl || video?.base_video_url || video?.baseVideoUrl || null)
                          
                          const videoId = typeof video === 'object' && video?.id 
                            ? video.id 
                            : `${selectedAspectRatio}-${session.sessionName}-${videoIdx}`
                          
                          const createdAt = typeof video === 'object' 
                            ? (video?.created_at || video?.createdAt || video?.created || video?.timestamp)
                            : null
                          
                          return (
                            <div 
                              key={videoId} 
                              className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                            >
                              {videoUrl ? (
                                <div className="relative group">
                                  <video 
                                    src={videoUrl} 
                                    className="w-full h-auto object-cover"
                                    style={{ 
                                      aspectRatio: selectedAspectRatio === '9:16' ? '9/16' : selectedAspectRatio === '1:1' ? '1/1' : '16/9',
                                      maxHeight: selectedAspectRatio === '9:16' ? '400px' : '300px'
                                    }}
                                    controls
                                    preload="metadata"
                                    onError={(e) => {
                                      e.target.style.display = 'none'
                                      const errorDiv = e.target.nextElementSibling
                                      if (errorDiv) errorDiv.style.display = 'flex'
                                    }}
                                  />
                                  <div 
                                    className="hidden absolute inset-0 bg-gray-100 items-center justify-center text-gray-500 text-sm"
                                    style={{ display: 'none' }}
                                  >
                                    Video failed to load
                                  </div>
                                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                                    <a 
                                      href={videoUrl} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="px-4 py-2 bg-white rounded-lg text-[#13008B] font-medium text-sm hover:bg-gray-50 transition-colors"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      View Full
                                    </a>
                                  </div>
                                </div>
                              ) : (
                                <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                                  No video URL
                                </div>
                              )}
                              <div className="p-3 space-y-1">
                                {createdAt && (
                                  <div className="text-xs text-gray-500">
                                    {formatValue(createdAt)}
                                  </div>
                                )}
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminGeneratedVideos

