import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import { selectUser } from '../redux/slices/userSlice'
import { Search } from 'lucide-react'
import loadingGif from '../asset/loadingv2.gif'

const ADMIN_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net'

const TransactionHistory = () => {
  const user = useSelector(selectUser)
  const navigate = useNavigate()

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

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 10

  // Filter users based on search query
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    const lowerQuery = searchQuery.toLowerCase()
    return users.filter(user =>
      (user?.email || '').toLowerCase().includes(lowerQuery) ||
      (user?.display_name || user?.name || '').toLowerCase().includes(lowerQuery)
    )
  }, [users, searchQuery])

  // Pagination
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const paginatedUsers = filteredUsers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  useEffect(() => {
    setCurrentPage(1)
  }, [searchQuery])

  const fetchUsers = useCallback(
    async (abortSignal) => {
      if (!isAdmin) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const token = localStorage.getItem('token') || ''
        const response = await fetch(`${ADMIN_BASE}/v1/admin/users/list`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({}),
          signal: abortSignal
        })

        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || `Unable to load users (${response.status})`)
        }

        const data = await response.json()
        const allUsers = Array.isArray(data?.users) ? data.users : (Array.isArray(data) ? data : [])
        // Filter to only show users where role is 'user', 'admin', or null/undefined
        const list = allUsers.filter(user => {
          const userRole = (user?.role || user?.user_role || user?.type || user?.userType || '').toString().toLowerCase()
          return userRole === 'user' || userRole === 'admin' || userRole === '' || !userRole
        })
        setUsers(list)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch users:', err)
        setError(err.message || 'Failed to fetch users.')
      } finally {
        setLoading(false)
      }
    },
    [isAdmin]
  )

  useEffect(() => {
    if (!isAdmin) return
    const controller = new AbortController()
    fetchUsers(controller.signal)
    return () => controller.abort()
  }, [fetchUsers, isAdmin])

  // Don't redirect immediately - wait a bit for Redux state to load
  // Check both Redux and localStorage before redirecting
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  useEffect(() => {
    // Give Redux a moment to load, then check
    const timer = setTimeout(() => {
      setCheckingAdmin(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // Show loading while checking admin status
  if (checkingAdmin) {
    return (
      <div className="flex h-screen bg-[#E5E2FF] overflow-hidden">
        <Sidebar />
        <div className="flex-1 mx-[2rem] mt-[1rem] flex flex-col overflow-hidden min-h-0 min-w-0">
          <Topbar />
          <div className="flex-1 my-2 overflow-hidden min-h-0 flex items-center justify-center">
            <img src={loadingGif} alt="Loading..." className="h-16 w-16" />
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
    fetchUsers(undefined)
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
                <h1 className="text-2xl font-semibold text-[#13008B]">Transaction History</h1>
                <p className="text-sm text-[#4B3CC4]">
                  View transaction history for all users.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by email..."
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
                  <img src={loadingGif} alt="Loading..." className="h-16 w-16" />
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : users.length === 0 ? (
                <div className="rounded-xl border border-[#E8E4FF] bg-[#F6F4FF] px-4 py-6 text-center text-sm text-[#4B3CC4]">
                  No users found.
                </div>
              ) : (
                <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#E8E4FF] bg-white shadow-inner">
                  <div className="flex-1 overflow-x-auto overflow-y-auto pb-4 pr-1">
                    <table className="min-w-[720px] w-full divide-y divide-[#E8E4FF] bg-white text-left text-sm text-gray-700">
                      <thead className="bg-[#F6F4FF] text-[#13008B] sticky top-0 z-10 shadow-sm shadow-[#E8E4FF]/40">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Name</th>
                          <th className="px-4 py-3 font-semibold">Email</th>
                          <th className="px-4 py-3 font-semibold">Role</th>
                          <th className="px-4 py-3 font-semibold">Status</th>
                          <th className="px-4 py-3 font-semibold">Created</th>
                          <th className="px-4 py-3 font-semibold text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0EDFF]">
                        {paginatedUsers.map((item, idx) => {
                          const name = item?.display_name || item?.name || item?.full_name || '—'
                          const email = item?.email || item?.username || '—'
                          const role = (item?.role || item?.user_role || item?.type || '').toString() || '—'
                          const statusRaw = item?.status || item?.validation_status || '—'
                          const status = typeof statusRaw === 'string' ? statusRaw.replace(/_/g, ' ') : statusRaw
                          const created = item?.created_at || item?.createdAt || item?.created || ''
                          const createdLabel = created ? new Date(created).toLocaleString() : '—'
                          const userId = item?.id || item?._id || item?.user_id

                          return (
                            <tr key={userId || idx} className="hover:bg-[#F8F6FF]">
                              <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                              <td className="px-4 py-3">{email}</td>
                              <td className="px-4 py-3 capitalize">{role || 'user'}</td>
                              <td className="px-4 py-3 capitalize">{status}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{createdLabel}</td>
                              <td className="px-4 py-3 text-right">
                                <button
                                  type="button"
                                  onClick={() => navigate(`/admin/transactions/${userId}`)}
                                  className="inline-flex items-center justify-center rounded-lg border border-[#13008B] bg-white px-3 py-2 text-sm font-semibold text-[#13008B] transition hover:bg-[#13008B]/10"
                                >
                                  View Transactions
                                </button>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="text-sm text-gray-500">
                  Page {currentPage} of {totalPages}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <span className="sr-only">Previous</span>
                    <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                  </button>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
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
          </div>
        </div>
      </div>
    </div>
  )
}

export default TransactionHistory
