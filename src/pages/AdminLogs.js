import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import { selectUser } from '../redux/slices/userSlice'
import { MoreVertical, Search } from 'lucide-react'
import loadingGif from '../asset/loadingv2.gif'

const ADMIN_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net'

const AdminLogs = () => {
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

  const [logs, setLogs] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const [searchQuery, setSearchQuery] = useState('')
  const [openDropdownId, setOpenDropdownId] = useState(null)
  const dropdownRefs = useRef({})

  const fetchLogs = useCallback(
    async (abortSignal) => {
      if (!isAdmin) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const token = localStorage.getItem('token') || ''
        const response = await fetch(`${ADMIN_BASE}/v1/admin/api/admin/users/generation-stats/all`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          signal: abortSignal
        })

        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || `Unable to load logs (${response.status})`)
        }

        const data = await response.json()
        // Handle different response structures
        let logsData = []
        if (Array.isArray(data)) {
          logsData = data
        } else if (Array.isArray(data?.logs)) {
          logsData = data.logs
        } else if (Array.isArray(data?.data)) {
          logsData = data.data
        } else if (Array.isArray(data?.users)) {
          logsData = data.users
        } else if (typeof data === 'object' && data !== null) {
          // If it's a single object, wrap it in an array
          logsData = [data]
        }

        setLogs(logsData)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch logs:', err)
        setError(err.message || 'Failed to fetch logs.')
      } finally {
        setLoading(false)
      }
    },
    [isAdmin]
  )

  useEffect(() => {
    if (!isAdmin) return
    const controller = new AbortController()
    fetchLogs(controller.signal)
    return () => controller.abort()
  }, [fetchLogs, isAdmin])

  // Don't redirect immediately - wait a bit for Redux state to load
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  useEffect(() => {
    // Give Redux a moment to load, then check
    const timer = setTimeout(() => {
      setCheckingAdmin(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // Search filter
  const filteredLogs = useMemo(() => {
    if (!searchQuery) return logs
    const lowerQuery = searchQuery.toLowerCase()
    return logs.filter(log =>
      (log?.email || log?.user_email || '').toLowerCase().includes(lowerQuery) ||
      (log?.display_name || log?.name || '').toLowerCase().includes(lowerQuery) ||
      (log?.user_id || log?.id || log?._id || '').toString().toLowerCase().includes(lowerQuery)
    )
  }, [logs, searchQuery])

  // Pagination calculations
  const itemsPerPage = 50
  const totalPages = Math.ceil(filteredLogs.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedLogs = filteredLogs.slice(startIndex, endIndex)

  // Reset to page 1 when logs or search query change
  useEffect(() => {
    setCurrentPage(1)
  }, [logs.length, searchQuery])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      const clickedOutside = Object.values(dropdownRefs.current).every(ref =>
        ref && !ref.contains(event.target)
      )
      if (clickedOutside) {
        setOpenDropdownId(null)
      }
    }
    if (openDropdownId) {
      document.addEventListener('mousedown', handleClickOutside)
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [openDropdownId])

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages) {
      setCurrentPage(newPage)
      // Scroll to top of table
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  // Show loading while checking admin status
  if (checkingAdmin) {
    return (
      <div className="flex h-screen bg-[#E5E2FF] overflow-hidden">
        <Sidebar />
        <div className="flex-1 mx-[2rem] mt-[1rem] flex flex-col overflow-hidden min-h-0 min-w-0">
          <Topbar />
          <div className="flex-1 my-2 overflow-hidden min-h-0 flex items-center justify-center">
            <div className="flex flex-col items-center justify-center">
              <img src={loadingGif} alt="Loading..." className="h-16 w-16" />
              <p className="mt-4 text-[#13008B] font-medium animate-pulse">Checking access...</p>
            </div>
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

  const handleRefresh = () => {
    fetchLogs(undefined)
  }

  // Helper function to format values for display (simple values only, no objects)
  const formatValue = (value) => {
    if (value === null || value === undefined) return '—'
    if (typeof value === 'boolean') return value ? 'Yes' : 'No'
    if (typeof value === 'object' || Array.isArray(value)) {
      return null // Return null for objects/arrays to hide them
    }
    if (typeof value === 'string' && value.match(/^\d{4}-\d{2}-\d{2}/)) {
      // Looks like a date string
      try {
        return new Date(value).toLocaleString()
      } catch (e) {
        return value
      }
    }
    return String(value)
  }

  // Check if a log has any complex data (objects/arrays)
  const hasComplexData = (log) => {
    return Object.values(log || {}).some(val =>
      (typeof val === 'object' && val !== null) || Array.isArray(val)
    )
  }

  const handleViewSummary = (log) => {
    const userId = log?.user_id || log?.id || log?._id
    if (userId) {
      navigate(`/admin/logs/${userId}`)
      setOpenDropdownId(null)
    }
  }

  const handleViewGeneratedImages = (log) => {
    const userId = log?.user_id || log?.id || log?._id
    if (userId) {
      navigate(`/admin/logs/${userId}/images`)
      setOpenDropdownId(null)
    }
  }

  const handleViewGeneratedVideos = (log) => {
    const userId = log?.user_id || log?.id || log?._id
    if (userId) {
      navigate(`/admin/logs/${userId}/videos`)
      setOpenDropdownId(null)
    }
  }

  const handleViewFinalVideos = (log) => {
    const userId = log?.user_id || log?.id || log?._id
    if (userId) {
      navigate(`/admin/logs/${userId}/final-videos`)
      setOpenDropdownId(null)
    }
  }

  // Get all unique keys from logs to create table columns
  const getAllKeys = (logsArray) => {
    const keysSet = new Set()
    logsArray.forEach(log => {
      if (log && typeof log === 'object') {
        Object.keys(log).forEach(key => keysSet.add(key))
      }
    })
    return Array.from(keysSet).sort()
  }

  // Filter out keys that are always objects/arrays, or get simple keys only
  const getSimpleKeys = (logsArray) => {
    const keysSet = new Set()
    logsArray.forEach(log => {
      if (log && typeof log === 'object') {
        Object.keys(log).forEach(key => {
          const value = log[key]
          // Only include simple values (not objects/arrays)
          if (value !== null && value !== undefined && typeof value !== 'object' && !Array.isArray(value)) {
            keysSet.add(key)
          }
        })
      }
    })
    return Array.from(keysSet).sort()
  }

  const tableKeys = logs.length > 0 ? getSimpleKeys(logs) : []

  // Common column labels mapping
  const columnLabels = {
    user_id: 'User ID',
    user_email: 'Email',
    email: 'Email',
    display_name: 'Name',
    name: 'Name',
    username: 'Username',
    total_generations: 'Total Generations',
    total_videos: 'Total Videos',
    total_sessions: 'Total Sessions',
    created_at: 'Created At',
    updated_at: 'Updated At',
    last_generation: 'Last Generation',
    status: 'Status',
    role: 'Role',
    validation_status: 'Validation Status',
    id: 'ID',
    _id: 'ID'
  }

  const getColumnLabel = (key) => {
    return columnLabels[key] || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
  }

  return (
    <div className="flex h-screen bg-[#E5E2FF] overflow-hidden">
      <Sidebar />
      <div className="flex-1 mx-[2rem] mt-[1rem] flex flex-col overflow-hidden min-h-0 min-w-0">
        <Topbar />

        <div className="flex-1 my-2 overflow-hidden min-h-0">
          <div className="flex h-full min-h-0 flex-col rounded-3xl bg-white/95 px-6 py-6 shadow-xl backdrop-blur">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-2xl font-semibold text-[#13008B]">User Generation Logs</h1>
                <p className="text-sm text-[#4B3CC4]">
                  View all user generation statistics and activity logs.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by email, name or ID..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 pr-4 py-2 rounded-lg border border-gray-200 text-sm focus:outline-none focus:border-[#13008B] w-64"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleRefresh}
                  className="inline-flex items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-[#13008B] shadow-sm transition hover:bg-[#13008B]/10"
                >
                  Refresh
                </button>
              </div>
            </div>

            <div className="mt-6 flex-1 overflow-scroll">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="flex flex-col items-center justify-center">
                    <img src={loadingGif} alt="Loading..." className="h-16 w-16" />
                    <p className="mt-4 text-[#13008B] font-medium animate-pulse">Loading logs...</p>
                  </div>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : logs.length === 0 ? (
                <div className="rounded-xl border border-[#E8E4FF] bg-[#F6F4FF] px-4 py-6 text-center text-sm text-[#4B3CC4]">
                  No logs found. Generation statistics will appear here once users start generating content.
                </div>
              ) : (
                <>
                  {/* Results info */}
                  <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
                    <div>
                      Showing <span className="font-semibold text-[#13008B]">{startIndex + 1}</span> to{' '}
                      <span className="font-semibold text-[#13008B]">{Math.min(endIndex, logs.length)}</span> of{' '}
                      <span className="font-semibold text-[#13008B]">{logs.length}</span> results
                    </div>
                    <div className="text-gray-500">
                      Page <span className="font-semibold text-[#13008B]">{currentPage}</span> of{' '}
                      <span className="font-semibold text-[#13008B]">{totalPages}</span>
                    </div>
                  </div>

                  <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#E8E4FF] bg-white shadow-inner">
                    <div className="flex-1 overflow-x-auto overflow-y-auto pb-4 pr-1">
                      <table className="min-w-full w-full divide-y divide-[#E8E4FF] bg-white text-left text-sm text-gray-700">
                        <thead className="bg-[#F6F4FF] text-[#13008B] sticky top-0 z-10 shadow-sm shadow-[#E8E4FF]/40">
                          <tr>
                            {tableKeys.map((key) => (
                              <th key={key} className="px-4 py-3 font-semibold whitespace-nowrap">
                                {getColumnLabel(key)}
                              </th>
                            ))}
                            <th className="px-4 py-3 font-semibold text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0EDFF]">
                          {paginatedLogs.map((log, idx) => {
                            const hasComplex = hasComplexData(log)
                            return (
                              <tr key={log?.id || log?._id || log?.user_id || idx} className="hover:bg-[#F8F6FF]">
                                {tableKeys.map((key) => {
                                  const value = log[key]
                                  const formattedValue = formatValue(value)

                                  return (
                                    <td key={key} className="px-4 py-3 text-gray-900">
                                      {formattedValue !== null ? (
                                        <span className={key === 'email' || key === 'user_email' ? 'text-[#13008B] font-medium' : ''}>
                                          {formattedValue}
                                        </span>
                                      ) : (
                                        <span className="text-gray-400">—</span>
                                      )}
                                    </td>
                                  )
                                })}
                                <td className="px-4 py-3 text-right">
                                  <div
                                    className="relative inline-block"
                                    ref={(el) => {
                                      const logId = log?.user_id || log?.id || log?._id || idx
                                      if (el) dropdownRefs.current[logId] = el
                                    }}
                                  >
                                    <button
                                      type="button"
                                      onClick={() => {
                                        const logId = log?.user_id || log?.id || log?._id || idx
                                        setOpenDropdownId(openDropdownId === logId ? null : logId)
                                      }}
                                      className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-3 py-1.5 text-sm font-semibold text-gray-700 transition hover:bg-gray-50"
                                    >
                                      <MoreVertical className="w-4 h-4" />
                                    </button>
                                    {openDropdownId === (log?.user_id || log?.id || log?._id || idx) && (
                                      <div className="absolute right-0 mt-1 z-50 bg-white rounded-lg shadow-lg border border-gray-200 min-w-[200px] overflow-hidden">
                                        <button
                                          type="button"
                                          onClick={() => handleViewSummary(log)}
                                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                          View Summary
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleViewGeneratedImages(log)}
                                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                          Generated Images
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleViewGeneratedVideos(log)}
                                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                          Generated Videos
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => handleViewFinalVideos(log)}
                                          className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 transition-colors"
                                        >
                                          Generated Final Videos
                                        </button>
                                      </div>
                                    )}
                                  </div>
                                </td>
                              </tr>
                            )
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Pagination Controls */}
                  {totalPages > 1 && (
                    <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                      <div className="text-sm text-gray-500">
                        Page {currentPage} of {totalPages}
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Previous</span>
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Next</span>
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  )
}

export default AdminLogs

