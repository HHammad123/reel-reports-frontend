import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import { selectUser } from '../redux/slices/userSlice'

const ADMIN_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net'

const AdminUserStats = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const user = useSelector(selectUser)

  // Check role from Redux and localStorage (for reload scenarios)
  const isAdmin = useMemo(() => {
    // First check Redux user
    let rawRole = (user?.role || user?.user_role || user?.type || user?.userType || '').toString().toLowerCase()
    
    // Fallback to localStorage if not in Redux
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
    
    const adminStatus = rawRole === 'admin'
    return adminStatus
  }, [user])

  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fetchUserStats = useCallback(
    async (abortSignal) => {
      if (!isAdmin || !userId) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const token = localStorage.getItem('token') || ''
        const response = await fetch(`${ADMIN_BASE}/v1/admin/api/admin/users/${encodeURIComponent(userId)}/generation-stats`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          signal: abortSignal
        })

        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || `Unable to load user stats (${response.status})`)
        }

        const data = await response.json()
        setStats(data)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch user stats:', err)
        setError(err.message || 'Failed to fetch user stats.')
      } finally {
        setLoading(false)
      }
    },
    [isAdmin, userId]
  )

  useEffect(() => {
    if (!isAdmin) return
    const controller = new AbortController()
    fetchUserStats(controller.signal)
    return () => controller.abort()
  }, [fetchUserStats, isAdmin])

  // Don't redirect immediately - wait a bit for Redux state to load
  const [checkingAdmin, setCheckingAdmin] = useState(true)
  
  useEffect(() => {
    // Give Redux a moment to load, then check
    const timer = setTimeout(() => {
      setCheckingAdmin(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // Helper function to format values for display
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

  // Helper to check if object has stats structure (e.g., {model: {failed: X, success: Y}})
  const isStatsObject = (obj) => {
    if (!obj || typeof obj !== 'object' || Array.isArray(obj)) return false
    const entries = Object.entries(obj)
    if (entries.length === 0) return false
    
    // Check if all values are objects with numeric properties (like failed, success)
    const allValuesAreStatsObjects = entries.every(([_, value]) => {
      if (typeof value !== 'object' || value === null || Array.isArray(value)) return false
      const valueEntries = Object.entries(value)
      if (valueEntries.length === 0) return false
      // Check if all nested values are numbers (stats like failed, success)
      return valueEntries.every(([_, v]) => typeof v === 'number')
    })
    
    return allValuesAreStatsObjects
  }

  // Calculate analytics from stats data
  const analytics = useMemo(() => {
    if (!stats || typeof stats !== 'object') {
      return {
        totalImages: 0,
        totalVideos: 0,
        totalBaseVideos: 0,
        totalFinalVideos: 0,
        imageSuccess: 0,
        imageFailed: 0,
        videoSuccess: 0,
        videoFailed: 0,
        baseVideoSuccess: 0,
        baseVideoFailed: 0,
        finalVideoSuccess: 0,
        finalVideoFailed: 0
      }
    }

    let analyticsData = {
      totalImages: 0,
      totalVideos: 0,
      totalBaseVideos: 0,
      totalFinalVideos: 0,
      imageSuccess: 0,
      imageFailed: 0,
      videoSuccess: 0,
      videoFailed: 0,
      baseVideoSuccess: 0,
      baseVideoFailed: 0,
      finalVideoSuccess: 0,
      finalVideoFailed: 0
    }

    // Helper to extract numbers from stats objects
    const extractStats = (obj, prefix = '') => {
      if (!obj || typeof obj !== 'object') return
      
      Object.entries(obj).forEach(([key, value]) => {
        const lowerKey = key.toLowerCase()
        
        // Direct count fields
        if (lowerKey === 'generated_images_count' || lowerKey === 'images_count' || lowerKey === 'total_images') {
          if (typeof value === 'number') analyticsData.totalImages = value
        }
        if (lowerKey === 'generated_videos_count' || lowerKey === 'videos_count' || lowerKey === 'total_videos') {
          if (typeof value === 'number') analyticsData.totalVideos = value
        }
        if (lowerKey === 'base_videos_count' || lowerKey === 'generated_base_videos_count') {
          if (typeof value === 'number') analyticsData.totalBaseVideos = value
        }
        if (lowerKey === 'final_videos_count' || lowerKey === 'generated_final_videos_count') {
          if (typeof value === 'number') analyticsData.totalFinalVideos = value
        }
        
        // Check for image-related stats
        if (lowerKey.includes('image') || prefix.includes('image')) {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            if (typeof value.success === 'number') analyticsData.imageSuccess += value.success
            if (typeof value.failed === 'number') analyticsData.imageFailed += value.failed
            if (typeof value.total === 'number') analyticsData.totalImages += value.total
            if (typeof value.count === 'number') analyticsData.totalImages += value.count
            // If it's an object with numeric values, sum them
            const numericValues = Object.values(value).filter(v => typeof v === 'number')
            if (numericValues.length > 0 && !value.success && !value.failed) {
              analyticsData.totalImages += numericValues.reduce((a, b) => a + b, 0)
            }
          } else if (typeof value === 'number') {
            analyticsData.totalImages += value
          } else if (Array.isArray(value)) {
            analyticsData.totalImages += value.length
          }
        }
        
        // Check for base video-related stats
        if ((lowerKey.includes('base') && lowerKey.includes('video')) || prefix.includes('base_video')) {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            if (typeof value.success === 'number') analyticsData.baseVideoSuccess += value.success
            if (typeof value.failed === 'number') analyticsData.baseVideoFailed += value.failed
            if (typeof value.total === 'number') analyticsData.totalBaseVideos += value.total
            if (typeof value.count === 'number') analyticsData.totalBaseVideos += value.count
            const numericValues = Object.values(value).filter(v => typeof v === 'number')
            if (numericValues.length > 0 && !value.success && !value.failed) {
              analyticsData.totalBaseVideos += numericValues.reduce((a, b) => a + b, 0)
            }
          } else if (typeof value === 'number') {
            analyticsData.totalBaseVideos += value
          } else if (Array.isArray(value)) {
            analyticsData.totalBaseVideos += value.length
          }
        }
        
        // Check for final video-related stats
        if ((lowerKey.includes('final') && lowerKey.includes('video')) || prefix.includes('final_video')) {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            if (typeof value.success === 'number') analyticsData.finalVideoSuccess += value.success
            if (typeof value.failed === 'number') analyticsData.finalVideoFailed += value.failed
            if (typeof value.total === 'number') analyticsData.totalFinalVideos += value.total
            if (typeof value.count === 'number') analyticsData.totalFinalVideos += value.count
            const numericValues = Object.values(value).filter(v => typeof v === 'number')
            if (numericValues.length > 0 && !value.success && !value.failed) {
              analyticsData.totalFinalVideos += numericValues.reduce((a, b) => a + b, 0)
            }
          } else if (typeof value === 'number') {
            analyticsData.totalFinalVideos += value
          } else if (Array.isArray(value)) {
            analyticsData.totalFinalVideos += value.length
          }
        }
        
        // Check for general video stats
        if (lowerKey.includes('video') && !lowerKey.includes('base') && !lowerKey.includes('final')) {
          if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
            if (typeof value.success === 'number') analyticsData.videoSuccess += value.success
            if (typeof value.failed === 'number') analyticsData.videoFailed += value.failed
            if (typeof value.total === 'number') analyticsData.totalVideos += value.total
            if (typeof value.count === 'number') analyticsData.totalVideos += value.count
            const numericValues = Object.values(value).filter(v => typeof v === 'number')
            if (numericValues.length > 0 && !value.success && !value.failed) {
              analyticsData.totalVideos += numericValues.reduce((a, b) => a + b, 0)
            }
          } else if (typeof value === 'number') {
            analyticsData.totalVideos += value
          } else if (Array.isArray(value)) {
            analyticsData.totalVideos += value.length
          }
        }
        
        // Recursively check nested objects
        if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
          extractStats(value, `${prefix}_${key}`)
        }
      })
    }

    extractStats(stats)
    
    // Calculate totals
    analyticsData.totalVideos = analyticsData.totalVideos || analyticsData.totalBaseVideos + analyticsData.totalFinalVideos
    analyticsData.videoSuccess = analyticsData.videoSuccess || analyticsData.baseVideoSuccess + analyticsData.finalVideoSuccess
    analyticsData.videoFailed = analyticsData.videoFailed || analyticsData.baseVideoFailed + analyticsData.finalVideoFailed

    return analyticsData
  }, [stats])

  // Helper to render nested data as tables
  const renderNestedData = (data, title, depth = 0) => {
    if (!data) return null
    if (depth > 3) return <div className="text-gray-500 italic">Data too deeply nested</div>

    if (Array.isArray(data)) {
      if (data.length === 0) return <div className="text-gray-500 italic">No {title} found</div>
      
      // Check if array contains objects
      if (data.length > 0 && typeof data[0] === 'object' && data[0] !== null) {
        const keys = Object.keys(data[0])
        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  {keys.map((key) => (
                    <th key={key} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((item, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    {keys.map((key) => {
                      const value = item[key]
                      const isNested = (typeof value === 'object' && value !== null) || Array.isArray(value)
                      
                      return (
                        <td key={key} className="px-4 py-3 text-sm text-gray-600">
                          {isNested ? renderNestedData(value, key, depth + 1) : formatValue(value)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      } else {
        // Simple array
        return (
          <div className="space-y-1">
            {data.map((item, idx) => (
              <div key={idx} className="px-3 py-2 bg-gray-50 rounded border border-gray-200">
                {formatValue(item)}
              </div>
            ))}
          </div>
        )
      }
    }

    if (typeof data === 'object' && data !== null) {
      // Check if this is a stats object (e.g., {model: {failed: X, success: Y}})
      if (isStatsObject(data)) {
        // Render as a table with Model, Failed, Success columns
        const rows = Object.entries(data).map(([model, stats]) => ({
          model,
          ...(typeof stats === 'object' && stats !== null ? stats : { value: stats })
        }))
        
        const statKeys = new Set()
        rows.forEach(row => {
          Object.keys(row).forEach(key => {
            if (key !== 'model') statKeys.add(key)
          })
        })
        const statColumns = Array.from(statKeys)

        return (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                    Model/Type
                  </th>
                  {statColumns.map((col) => (
                    <th key={col} className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">
                      {col.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {row.model.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    {statColumns.map((col) => (
                      <td key={col} className="px-4 py-3 text-sm text-gray-600">
                        {formatValue(row[col])}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }

      // Regular object - render as key-value table, but recursively handle nested objects
      return (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 border border-gray-300 rounded-lg">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Key</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Value</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(data).map(([key, value]) => {
                const isNested = (typeof value === 'object' && value !== null) || Array.isArray(value)
                
                return (
                  <tr key={key} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm font-medium text-gray-900">
                      {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {isNested ? (
                        <div className="mt-2">
                          {renderNestedData(value, key, depth + 1)}
                        </div>
                      ) : (
                        formatValue(value)
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )
    }

    return formatValue(data)
  }

  // Show loading while checking admin status
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

  // Only redirect if we've checked and user is definitely not admin
  if (!isAdmin) {
    // Double-check localStorage before redirecting
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        const localRole = (parsedUser?.role || parsedUser?.user_role || parsedUser?.type || parsedUser?.userType || '').toString().toLowerCase()
        if (localRole === 'admin') {
          // User is admin in localStorage, allow access (isAdmin will update when Redux loads)
          // Continue rendering
        } else {
          // Not admin, redirect
          return <Navigate to="/" replace />
        }
      } else {
        // No user data at all, redirect
        return <Navigate to="/" replace />
      }
    } catch (e) {
      // Error checking localStorage, redirect to be safe
      return <Navigate to="/" replace />
    }
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
                <h1 className="text-2xl font-semibold text-[#13008B]">User Generation Statistics</h1>
                <p className="text-sm text-[#4B3CC4]">
                  Detailed statistics for user ID: {userId}
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
                  onClick={() => fetchUserStats(undefined)}
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
              ) : !stats ? (
                <div className="rounded-xl border border-[#E8E4FF] bg-[#F6F4FF] px-4 py-6 text-center text-sm text-[#4B3CC4]">
                  No statistics found for this user.
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Analytics Section */}
                  <div className="rounded-lg border border-gray-200 overflow-hidden bg-gradient-to-br from-[#F6F4FF] to-white">
                    <div className="bg-[#13008B] px-6 py-4 border-b border-gray-200">
                      <h2 className="text-xl font-bold text-white">Analytics Dashboard</h2>
                      <p className="text-sm text-white/80 mt-1">Overview of generated media statistics</p>
                    </div>
                    <div className="p-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Images Card */}
                        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-600">Generated Images</h3>
                            <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                              <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                              </svg>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-3xl font-bold text-[#13008B]">{analytics.totalImages}</div>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-green-600 font-medium">
                                ✓ {analytics.imageSuccess} Success
                              </span>
                              {analytics.imageFailed > 0 && (
                                <span className="text-red-600 font-medium">
                                  ✗ {analytics.imageFailed} Failed
                                </span>
                              )}
                            </div>
                            {analytics.totalImages > 0 && (
                              <div className="text-xs text-gray-500">
                                Success Rate: {Math.round((analytics.imageSuccess / analytics.totalImages) * 100)}%
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Final Videos Card */}
                        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-600">Final Videos</h3>
                            <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center">
                              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-3xl font-bold text-[#13008B]">{analytics.totalFinalVideos}</div>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-green-600 font-medium">
                                ✓ {analytics.finalVideoSuccess} Success
                              </span>
                              {analytics.finalVideoFailed > 0 && (
                                <span className="text-red-600 font-medium">
                                  ✗ {analytics.finalVideoFailed} Failed
                                </span>
                              )}
                            </div>
                            {analytics.totalFinalVideos > 0 && (
                              <div className="text-xs text-gray-500">
                                Success Rate: {Math.round((analytics.finalVideoSuccess / analytics.totalFinalVideos) * 100)}%
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Total Videos Card */}
                        <div className="bg-white rounded-lg border border-gray-200 p-5 shadow-sm hover:shadow-md transition-shadow">
                          <div className="flex items-center justify-between mb-3">
                            <h3 className="text-sm font-medium text-gray-600">Total Videos</h3>
                            <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <svg className="w-6 h-6 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
                              </svg>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <div className="text-3xl font-bold text-[#13008B]">{analytics.totalVideos}</div>
                            <div className="flex items-center gap-4 text-xs">
                              <span className="text-green-600 font-medium">
                                ✓ {analytics.videoSuccess} Success
                              </span>
                              {analytics.videoFailed > 0 && (
                                <span className="text-red-600 font-medium">
                                  ✗ {analytics.videoFailed} Failed
                                </span>
                              )}
                            </div>
                            {analytics.totalVideos > 0 && (
                              <div className="text-xs text-gray-500">
                                Success Rate: {Math.round((analytics.videoSuccess / analytics.totalVideos) * 100)}%
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Summary Row */}
                      <div className="mt-6 pt-6 border-t border-gray-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg p-4 border border-blue-200">
                            <div className="text-sm font-medium text-blue-900 mb-1">Total Media Generated</div>
                            <div className="text-2xl font-bold text-blue-700">
                              {analytics.totalImages + analytics.totalVideos}
                            </div>
                            <div className="text-xs text-blue-700 mt-1">
                              {analytics.totalImages} images + {analytics.totalVideos} videos
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-green-50 to-green-100 rounded-lg p-4 border border-green-200">
                            <div className="text-sm font-medium text-green-900 mb-1">Total Successful</div>
                            <div className="text-2xl font-bold text-green-700">
                              {analytics.imageSuccess + analytics.videoSuccess}
                            </div>
                            <div className="text-xs text-green-700 mt-1">
                              {analytics.imageSuccess} images + {analytics.videoSuccess} videos
                            </div>
                          </div>
                          <div className="bg-gradient-to-r from-red-50 to-red-100 rounded-lg p-4 border border-red-200">
                            <div className="text-sm font-medium text-red-900 mb-1">Total Failed</div>
                            <div className="text-2xl font-bold text-red-700">
                              {analytics.imageFailed + analytics.videoFailed}
                            </div>
                            <div className="text-xs text-red-700 mt-1">
                              {analytics.imageFailed} images + {analytics.videoFailed} videos
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Main Statistics Table */}
                  <div className="rounded-lg border border-gray-200 overflow-hidden">
                    <div className="bg-[#F6F4FF] px-6 py-4 border-b border-gray-200">
                      <h2 className="text-lg font-semibold text-[#13008B]">Overview</h2>
                    </div>
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Field</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-700 uppercase tracking-wider">Value</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {Object.entries(stats).map(([key, value]) => {
                            // Skip nested objects/arrays - they'll be shown in separate sections
                            const isComplex = (typeof value === 'object' && value !== null) || Array.isArray(value)
                            
                            if (isComplex) return null
                            
                            return (
                              <tr key={key} className="hover:bg-gray-50">
                                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                  {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                                </td>
                                <td className="px-6 py-4 text-sm text-gray-700">
                                  {formatValue(value)}
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Nested Data Sections */}
                  {Object.entries(stats).map(([key, value]) => {
                    const isComplex = (typeof value === 'object' && value !== null) || Array.isArray(value)
                    
                    if (!isComplex) return null
                    
                    return (
                      <div key={key} className="rounded-lg border border-gray-200 overflow-hidden">
                        <div className="bg-[#F6F4FF] px-6 py-4 border-b border-gray-200">
                          <h2 className="text-lg font-semibold text-[#13008B]">
                            {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          </h2>
                        </div>
                        <div className="p-6">
                          {renderNestedData(value, key)}
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

export default AdminUserStats

