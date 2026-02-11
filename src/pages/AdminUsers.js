import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import { selectUser } from '../redux/slices/userSlice'

const ADMIN_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net'

const AdminUsers = () => {
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
    console.log('AdminUsers - Role check:', { rawRole, adminStatus, user, hasLocalStorage: !!localStorage.getItem('user') })
    return adminStatus
  }, [user])

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterRole, setFilterRole] = useState('')
  const [updatingId, setUpdatingId] = useState('')

  // Create User modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState('')
  const [createSuccess, setCreateSuccess] = useState(null)
  const [newUser, setNewUser] = useState({
    email: '',
    password: '',
    display_name: '',
    role: 'user',
    status: 'validated'
  })

  const resolveUserKey = (candidate, fallback) =>
    candidate?.id || candidate?._id || candidate?.user_id || candidate?.email || candidate?.username || fallback

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
        const body = {}
        if (filterStatus) body.status = filterStatus
        if (filterRole) body.role = filterRole
        const response = await fetch(`${ADMIN_BASE}/v1/admin/users/list`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify(body),
          signal: abortSignal
        })

        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || `Unable to load users (${response.status})`)
        }

        const data = await response.json()
        const allUsers = Array.isArray(data?.users) ? data.users : (Array.isArray(data) ? data : [])
        setUsers(allUsers)
      } catch (err) {
        if (err.name === 'AbortError') return
        console.error('Failed to fetch users:', err)
        setError(err.message || 'Failed to fetch users.')
      } finally {
        setLoading(false)
      }
    },
    [isAdmin, filterStatus, filterRole]
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

  const handleRefresh = () => {
    fetchUsers(undefined)
  }

  const handleCreateUser = async (e) => {
    e.preventDefault()
    setCreateError('')
    setCreateSuccess(null)
    setCreating(true)
    try {
      const token = localStorage.getItem('token') || ''
      const response = await fetch(`${ADMIN_BASE}/v1/admin/users/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(newUser)
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.detail || `Failed to create user (${response.status})`)
      }
      const data = await response.json()
      setCreateSuccess(data)
      fetchUsers(undefined)
    } catch (err) {
      setCreateError(err.message || 'Failed to create user')
    } finally {
      setCreating(false)
    }
  }

  const resetCreateModal = () => {
    setShowCreateModal(false)
    setCreateError('')
    setCreateSuccess(null)
    setNewUser({ email: '', password: '', display_name: '', role: 'user', status: 'validated' })
  }

  const handleToggleStatus = async (userItem, actionKeyOverride, explicitStatus) => {
    if (!userItem) return
    const recordId = userItem?.id || userItem?._id || userItem?.user_id
    const email = userItem?.email || userItem?.username
    const actionKey = actionKeyOverride || resolveUserKey(userItem, email)
    if (!recordId) {
      console.warn('AdminUsers: missing user_id for status toggle', userItem)
      return
    }
    const cleanedCurrent = (userItem?.status || userItem?.validation_status || '').toString().toLowerCase()
    const normalizedCurrent = cleanedCurrent === 'non_validated' ? 'not_validated' : cleanedCurrent
    const normalizedExplicit = (explicitStatus || '').toString().toLowerCase()
    const nextStatus =
      normalizedExplicit && normalizedExplicit.length
        ? normalizedExplicit
        : normalizedCurrent === 'validated'
          ? 'not_validated'
          : 'validated'
    try {
      setUpdatingId(actionKey)
      const token = localStorage.getItem('token') || ''
      const response = await fetch(`${ADMIN_BASE}/v1/admin/users/${encodeURIComponent(recordId)}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          status: nextStatus
        })
      })
      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Unable to update status (${response.status})`)
      }
      setUsers(prev =>
        prev.map(existing => {
          const existingKey = resolveUserKey(existing, '')
          if (existingKey === actionKey || existingKey === recordId || existingKey === email) {
            return {
              ...existing,
              status: nextStatus,
              validation_status: nextStatus
            }
          }
          return existing
        })
      )
      fetchUsers(undefined)
    } catch (err) {
      console.error('Failed to update user status:', err)
    } finally {
      setUpdatingId('')
    }
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
                <h1 className="text-2xl font-semibold text-[#13008B]">All Users</h1>
                <p className="text-sm text-[#4B3CC4]">
                  Manage every account connected to Reel Reports.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center justify-center rounded-lg border border-[#13008B] bg-[#13008B] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#13008B]/90"
                >
                  + Create User
                </button>
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
              <div className="mb-5 flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-[#13008B]">Status:</label>
                  <select
                    value={filterStatus}
                    onChange={e => setFilterStatus(e.target.value)}
                    className="rounded-lg border border-[#D8D3FF] bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#13008B] focus:outline-none focus:ring-2 focus:ring-[#13008B]/20"
                  >
                    <option value="">All</option>
                    <option value="validated">Validated</option>
                    <option value="not_validated">Not Validated</option>
                  </select>
                </div>
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-[#13008B]">Role:</label>
                  <select
                    value={filterRole}
                    onChange={e => setFilterRole(e.target.value)}
                    className="rounded-lg border border-[#D8D3FF] bg-white px-3 py-2 text-sm text-gray-800 focus:border-[#13008B] focus:outline-none focus:ring-2 focus:ring-[#13008B]/20"
                  >
                    <option value="">All</option>
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#13008B]/30 border-t-[#13008B]"></div>
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : users.length === 0 ? (
                <div className="rounded-xl border border-[#E8E4FF] bg-[#F6F4FF] px-4 py-6 text-center text-sm text-[#4B3CC4]">
                  No users found yet. Once new members join, they will appear in this list.
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
                        {users.map((item, idx) => {
                          const name = item?.display_name || item?.name || item?.full_name || '—'
                          const email = item?.email || item?.username || '—'
                          const role = (item?.role || item?.user_role || item?.type || '').toString() || '—'
                          const statusRaw = item?.status || item?.validation_status || '—'
                          const status = typeof statusRaw === 'string' ? statusRaw.replace(/_/g, ' ') : statusRaw
                          const created = item?.created_at || item?.createdAt || item?.created || ''
                          const createdLabel = created ? new Date(created).toLocaleString() : '—'
                          return (
                            <tr key={item?.id || item?._id || idx} className="hover:bg-[#F8F6FF]">
                              <td className="px-4 py-3 font-medium text-gray-900">{name}</td>
                              <td className="px-4 py-3">{email}</td>
                              <td className="px-4 py-3 capitalize">{role || 'user'}</td>
                              <td className="px-4 py-3 capitalize">{status}</td>
                              <td className="px-4 py-3 text-sm text-gray-500">{createdLabel}</td>
                              <td className="px-4 py-3 text-right">
                                {(() => {
                                  const statusKey = typeof statusRaw === 'string' ? statusRaw.toLowerCase() : ''
                                  const normalizedKey = statusKey === 'non_validated' ? 'not_validated' : statusKey
                                  const isValidated = normalizedKey === 'validated'
                                  const targetStatus = isValidated ? 'not_validated' : 'validated'
                                  const targetLabel = isValidated ? 'Mark as Non-validated' : 'Mark as Validated'
                                  const actionKey = item?.id || item?._id || item?.user_id || item?.email || item?.username || String(idx)
                                  const isCurrentUpdating = updatingId === actionKey
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => handleToggleStatus(item, actionKey, targetStatus)}
                                      disabled={Boolean(updatingId) && updatingId !== actionKey}
                                      className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition ${isCurrentUpdating
                                        ? 'cursor-wait border-[#D8D3FF] bg-[#D8D3FF]/40 text-[#13008B]'
                                        : isValidated
                                          ? 'border-[#FFB4C8] bg-white text-[#E11D48] hover:bg-[#FFE4ED]'
                                          : 'border-[#34D399] bg-white text-[#059669] hover:bg-[#ECFDF5]'
                                        }`}
                                    >
                                      {isCurrentUpdating ? 'Updating…' : targetLabel}
                                    </button>
                                  )
                                })()}
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
          </div>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-xl font-semibold text-[#13008B]">Create New User</h2>
              <button onClick={resetCreateModal} className="text-gray-400 hover:text-gray-600 text-xl leading-none">&times;</button>
            </div>

            {createSuccess ? (
              <div className="space-y-4">
                <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-700">
                  <p className="font-semibold mb-2">User created successfully!</p>
                  <p><span className="font-medium">Email:</span> {createSuccess.credentials?.email}</p>
                  <p><span className="font-medium">Password:</span> {createSuccess.credentials?.password}</p>
                  <p className="mt-2 text-xs text-green-600">Share these credentials with the user.</p>
                </div>
                <button
                  type="button"
                  onClick={resetCreateModal}
                  className="w-full rounded-lg bg-[#13008B] py-2.5 text-sm font-semibold text-white transition hover:bg-[#13008B]/90"
                >
                  Done
                </button>
              </div>
            ) : (
              <form onSubmit={handleCreateUser} className="space-y-4">
                {createError && (
                  <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
                    {createError}
                  </div>
                )}
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Display Name</label>
                  <input
                    type="text"
                    required
                    value={newUser.display_name}
                    onChange={e => setNewUser(prev => ({ ...prev, display_name: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#13008B] focus:outline-none focus:ring-2 focus:ring-[#13008B]/20"
                    placeholder="John Doe"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Email</label>
                  <input
                    type="email"
                    required
                    value={newUser.email}
                    onChange={e => setNewUser(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#13008B] focus:outline-none focus:ring-2 focus:ring-[#13008B]/20"
                    placeholder="user@example.com"
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Password</label>
                  <input
                    type="text"
                    required
                    minLength={6}
                    value={newUser.password}
                    onChange={e => setNewUser(prev => ({ ...prev, password: e.target.value }))}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#13008B] focus:outline-none focus:ring-2 focus:ring-[#13008B]/20"
                    placeholder="securePassword123"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Role</label>
                    <select
                      value={newUser.role}
                      onChange={e => setNewUser(prev => ({ ...prev, role: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#13008B] focus:outline-none focus:ring-2 focus:ring-[#13008B]/20"
                    >
                      <option value="user">User</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-medium text-gray-700">Status</label>
                    <select
                      value={newUser.status}
                      onChange={e => setNewUser(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm focus:border-[#13008B] focus:outline-none focus:ring-2 focus:ring-[#13008B]/20"
                    >
                      <option value="validated">Validated</option>
                      <option value="not_validated">Not Validated</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={resetCreateModal}
                    className="flex-1 rounded-lg border border-gray-200 py-2.5 text-sm font-semibold text-gray-600 transition hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className={`flex-1 rounded-lg bg-[#13008B] py-2.5 text-sm font-semibold text-white transition hover:bg-[#13008B]/90 ${creating ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    {creating ? 'Creating...' : 'Create User'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminUsers
