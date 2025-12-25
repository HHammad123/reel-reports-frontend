import React, { useCallback, useEffect, useMemo, useState } from 'react'
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
        const response = await fetch(`${ADMIN_BASE}/v1/users/user/${encodeURIComponent(userId)}/final-videos`, {
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

        const data = await response.json()
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
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch final videos:', err)
        setError(err.message || 'Failed to fetch final videos.')
      } finally {
        setLoading(false)
      }
    },
    [isAdmin, userId]
  )

  useEffect(() => {
    if (!isAdmin || !userId) return
    const controller = new AbortController()
    fetchVideos(controller.signal)
    return () => controller.abort()
  }, [isAdmin, userId]) // Removed fetchVideos from dependencies to prevent cancellation loop

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

  // Get all unique keys from videos to create table columns
  const getAllKeys = (videosArray) => {
    const keysSet = new Set()
    videosArray.forEach(video => {
      if (video && typeof video === 'object') {
        Object.keys(video).forEach(key => keysSet.add(key))
      }
    })
    return Array.from(keysSet).sort()
  }

  const tableKeys = videos.length > 0 ? getAllKeys(videos) : []

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
                  onClick={() => fetchVideos(undefined)}
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
                <div className="rounded-lg border border-gray-200 overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-[#F6F4FF]">
                        <tr>
                          {tableKeys.map((key) => (
                            <th key={key} className="px-6 py-3 text-left text-xs font-medium text-[#13008B] uppercase tracking-wider">
                              {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {videos.map((video, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            {tableKeys.map((key) => {
                              const value = video[key]
                              const isVideoUrl = typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')) && (value.match(/\.(mp4|webm|ogg|mov)$/i))
                              
                              return (
                                <td key={key} className="px-6 py-4 text-sm text-gray-700">
                                  {isVideoUrl ? (
                                    <div className="flex items-center gap-3">
                                      <video 
                                        src={value} 
                                        className="w-32 h-20 object-cover rounded border border-gray-200"
                                        controls
                                        preload="metadata"
                                      />
                                      <a href={value} target="_blank" rel="noopener noreferrer" className="text-[#13008B] hover:underline text-xs">
                                        View Full
                                      </a>
                                    </div>
                                  ) : (
                                    formatValue(value)
                                  )}
                                </td>
                              )
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
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

