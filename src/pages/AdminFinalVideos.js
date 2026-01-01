import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import { selectUser } from '../redux/slices/userSlice'

const ADMIN_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net'

const AdminFinalVideos = () => {
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
  const abortControllerRef = useRef(null)
  const isFetchingRef = useRef(false) // Track if fetch is in progress to prevent duplicate calls

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
        const apiPath = `${ADMIN_BASE}/v1/users/user/${encodeURIComponent(userId)}/final-videos`
        
        console.log('=== ADMIN FINAL VIDEOS: API FETCH ===')
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
          const message = await response.text()
          throw new Error(message || `Unable to load final videos (${response.status})`)
        }

        let data
        try {
          const responseText = await response.text()
          if (!responseText || responseText.trim() === '') {
            setVideos([])
            setError('')
            setLoading(false)
            isFetchingRef.current = false
            return
          }
          data = JSON.parse(responseText)
        } catch (parseError) {
          setVideos([])
          setError('')
          setLoading(false)
          isFetchingRef.current = false
          return
        }

        console.log('=== ADMIN FINAL VIDEOS: API RESPONSE ===')
        console.log('Full API Response:', data)

        // Handle different response structures
        let videosData = []
        if (Array.isArray(data)) {
          videosData = data
        } else if (Array.isArray(data?.videos)) {
          videosData = data.videos
        } else if (Array.isArray(data?.data)) {
          videosData = data.data
        } else if (Array.isArray(data?.final_videos)) {
          videosData = data.final_videos
        } else if (typeof data === 'object' && data !== null) {
          videosData = [data]
        }
        
        setVideos(videosData)
        setError('')
      } catch (err) {
        if (err.name === 'AbortError') {
          isFetchingRef.current = false
          return
        }
        console.error('Failed to fetch final videos:', err)
        setError(err.message || 'Failed to fetch final videos.')
      } finally {
        if (!abortSignal || !abortSignal.aborted) {
          setLoading(false)
        }
        isFetchingRef.current = false
      }
    },
    [isAdmin, userId]
  )

  useEffect(() => {
    if (!isAdmin || !userId) {
      setLoading(false)
      return
    }
    
    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    
    // Reset fetch flag to allow new request
    isFetchingRef.current = false
    
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    fetchVideos(controller.signal)
    
    return () => {
      // Only abort if this is still the current controller
      if (abortControllerRef.current === controller) {
        controller.abort()
        abortControllerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, userId])

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
                <h1 className="text-2xl font-semibold text-[#13008B]">Generated Final Videos</h1>
                <p className="text-sm text-[#4B3CC4]">
                  All final videos for user ID: {userId}
                </p>
              </div>
              <div className="flex gap-3">
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
                  No final videos found for this user.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {videos.map((video, idx) => {
                    // Find video URL from various possible fields
                    let videoUrl = null
                    
                    // Check if video is a string URL
                    if (typeof video === 'string' && (video.startsWith('http://') || video.startsWith('https://'))) {
                      videoUrl = video
                    } else if (video && typeof video === 'object') {
                      // Check various possible field names
                      videoUrl = video?.video_url || 
                                video?.videoUrl || 
                                video?.url || 
                                video?.src || 
                                video?.link ||
                                video?.video ||
                                video?.file_url ||
                                video?.fileUrl ||
                                video?.download_url ||
                                video?.downloadUrl ||
                                video?.final_video_url ||
                                video?.finalVideoUrl
                    }
                    
                    // Get other metadata
                    const videoId = video?.id || video?._id || video?.video_id || `video-${idx}`
                    const videoName = video?.name || video?.title || video?.filename || `Video ${idx + 1}`
                    const createdAt = video?.created_at || video?.createdAt || video?.created || video?.timestamp
                    
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
                                aspectRatio: '16/9',
                                maxHeight: '300px'
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
                          <div className="text-sm font-medium text-gray-900 truncate" title={videoName}>
                            {videoName}
                          </div>
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
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default AdminFinalVideos

