import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import { selectUser } from '../redux/slices/userSlice'

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
  const abortControllerRef = useRef(null)

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

  // Filter videos based on selected aspect ratio
  const filteredVideos = useMemo(() => {
    if (!selectedAspectRatio || selectedAspectRatio === 'all') return videos
    
    return videos.filter(video => {
      if (!video || typeof video !== 'object') return false
      
      const aspectRatio = video?.aspect_ratio || 
                         video?.aspectRatio || 
                         video?.aspect_ratio_value ||
                         video?.ratio ||
                         video?.size ||
                         video?.dimensions?.aspect_ratio
      
      const normalized = normalizeAspectRatio(aspectRatio)
      return normalized === selectedAspectRatio
    })
  }, [videos, selectedAspectRatio])

  const fetchVideos = useCallback(
    async (abortSignal) => {
      if (!isAdmin || !userId) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const token = localStorage.getItem('token') || ''
        const response = await fetch(`${ADMIN_BASE}/v1/users/user/${encodeURIComponent(userId)}/generated-base-videos`, {
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

        // Handle different response structures
        let videosData = []
        
        // Log the response for debugging
        console.log('Generated base videos API response:', data)
        
        if (Array.isArray(data)) {
          videosData = data
        } else if (data?.generated_videos && typeof data.generated_videos === 'object') {
          // If data has generated_videos object with aspect ratio keys
          Object.entries(data.generated_videos).forEach(([aspectRatio, videosList]) => {
            if (Array.isArray(videosList)) {
              videosList.forEach(video => {
                if (video && typeof video === 'object') {
                  videosData.push({ ...video, aspect_ratio: aspectRatio })
                } else if (typeof video === 'string') {
                  // If video is just a URL string
                  videosData.push({ video_url: video, aspect_ratio: aspectRatio })
                }
              })
            } else if (typeof videosList === 'string') {
              // If videosList is a single URL string
              videosData.push({ video_url: videosList, aspect_ratio: aspectRatio })
            }
          })
        } else if (data?.base_videos && typeof data.base_videos === 'object') {
          // Handle base_videos object structure
          Object.entries(data.base_videos).forEach(([aspectRatio, videosList]) => {
            if (Array.isArray(videosList)) {
              videosList.forEach(video => {
                if (video && typeof video === 'object') {
                  videosData.push({ ...video, aspect_ratio: aspectRatio })
                } else if (typeof video === 'string') {
                  videosData.push({ video_url: video, aspect_ratio: aspectRatio })
                }
              })
            } else if (typeof videosList === 'string') {
              videosData.push({ video_url: videosList, aspect_ratio: aspectRatio })
            }
          })
        } else if (Array.isArray(data?.videos)) {
          videosData = data.videos
        } else if (Array.isArray(data?.data)) {
          videosData = data.data
        } else if (Array.isArray(data?.base_videos)) {
          videosData = data.base_videos
        } else if (data === null || data === undefined) {
          videosData = []
        } else if (typeof data === 'object' && data !== null) {
          // Check if it's a single video object
          if (data.video_url || data.url || data.video || data.src || data.link) {
            videosData = [data]
          } else if (Object.keys(data).length > 0) {
            // Try to extract videos from object properties
            Object.values(data).forEach(value => {
              if (Array.isArray(value)) {
                videosData.push(...value)
              } else if (value && typeof value === 'object' && (value.video_url || value.url || value.video)) {
                videosData.push(value)
              }
            })
          }
        }
        
        console.log('Processed videos data:', videosData)
        setVideos(videosData)
        setError('') // Clear any previous errors if we got a successful response
      } catch (err) {
        if (err.name === 'AbortError') {
          // Don't update state if request was aborted
          console.log('Video fetch was aborted')
          return
        }
        console.error('Failed to fetch videos:', err)
        console.error('Error details:', {
          name: err.name,
          message: err.message,
          stack: err.stack
        })
        setError(err.message || 'Failed to fetch videos.')
        setVideos([]) // Clear videos on error
      } finally {
        // Only update loading state if request wasn't aborted
        if (!abortSignal || !abortSignal.aborted) {
          setLoading(false)
        }
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
    
    console.log('Fetching generated base videos for userId:', userId)
    
    // Abort any previous request
    if (abortControllerRef.current) {
      console.log('Aborting previous video fetch request')
      abortControllerRef.current.abort()
    }
    
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    fetchVideos(controller.signal).catch(err => {
      if (err.name !== 'AbortError') {
        console.error('Error in fetchVideos:', err)
      }
    })
    
    return () => {
      if (abortControllerRef.current === controller) {
        console.log('Cleaning up video fetch on unmount/change')
        controller.abort()
        abortControllerRef.current = null
      }
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
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
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
              ) : filteredVideos.length === 0 ? (
                <div className="rounded-xl border border-[#E8E4FF] bg-[#F6F4FF] px-4 py-6 text-center text-sm text-[#4B3CC4]">
                  No videos found for aspect ratio {selectedAspectRatio}. Try selecting a different aspect ratio.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredVideos.map((video, idx) => {
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
                                video?.base_video_url ||
                                video?.baseVideoUrl
                    }
                    
                    // Get other metadata
                    const videoId = video?.id || video?._id || video?.video_id || `video-${idx}`
                    const createdAt = video?.created_at || video?.createdAt || video?.created || video?.timestamp
                    const aspectRatio = video?.aspect_ratio || video?.aspectRatio || selectedAspectRatio
                    
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
                                aspectRatio: aspectRatio === '9:16' ? '9/16' : '16/9',
                                maxHeight: aspectRatio === '9:16' ? '400px' : '300px'
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
                          {aspectRatio && (
                            <div className="text-xs text-gray-600 font-medium">
                              Aspect Ratio: {aspectRatio}
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

export default AdminGeneratedVideos

