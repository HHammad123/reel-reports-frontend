import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Navigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import { selectUser } from '../redux/slices/userSlice'

const ADMIN_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net'
const STATUS_TABS = [
  { label: 'Validated', value: 'validated' },
  { label: 'Non-validated', value: 'not_validated' }
]

const AdminUsers = () => {
  const user = useSelector(selectUser)

  const isAdmin = useMemo(() => {
    const rawRole = (user?.role || user?.user_role || user?.type || user?.userType || '').toString().toLowerCase()
    return rawRole === 'admin'
  }, [user])

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentStatus, setCurrentStatus] = useState(STATUS_TABS[0].value)
  const [updatingId, setUpdatingId] = useState('')

  const resolveUserKey = (candidate, fallback) =>
    candidate?.id || candidate?._id || candidate?.user_id || candidate?.email || candidate?.username || fallback

  const fetchUsers = useCallback(
    async (statusValue, abortSignal) => {
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
          body: JSON.stringify({
            role: 'user',
            status: statusValue || 'validated'
          }),
          signal: abortSignal
        })

        if (!response.ok) {
          const message = await response.text()
          throw new Error(message || `Unable to load users (${response.status})`)
        }

        const data = await response.json()
        const list = Array.isArray(data?.users) ? data.users : (Array.isArray(data) ? data : [])
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
    fetchUsers(currentStatus, controller.signal)
    return () => controller.abort()
  }, [fetchUsers, isAdmin, currentStatus])

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  const handleRefresh = () => {
    fetchUsers(currentStatus, undefined)
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
    const cleanedCurrent = (userItem?.status || userItem?.validation_status || currentStatus || '').toString().toLowerCase()
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
      fetchUsers(currentStatus, undefined)
    } catch (err) {
      console.error('Failed to update user status:', err)
    } finally {
      setUpdatingId('')
    }
  }

  return (
    <div className="flex h-screen bg-[#E5E2FF] overflow-hidden">
      <Sidebar />
      <div className="w-full mx-[2rem] mt-[1rem] flex flex-col overflow-hidden min-h-0">
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
            <button
              type="button"
              onClick={handleRefresh}
              className="inline-flex items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-[#13008B] shadow-sm transition hover:bg-[#13008B]/10"
            >
              Refresh
            </button>
            </div>

          <div className="mt-6 flex-1 overflow-scroll">
            <div className="mb-5 flex flex-wrap items-center gap-3">
              {STATUS_TABS.map(tab => {
                const isActive = tab.value === currentStatus
                return (
                  <button
                    key={tab.value}
                    type="button"
                    onClick={() => setCurrentStatus(tab.value)}
                    className={`rounded-full outline-none border px-4 py-2 text-sm font-medium transition ${
                      isActive
                        ? 'border-[#13008B] bg-[#13008B]/10 text-[#13008B]'
                        : 'border-[#D8D3FF] text-[#4B3CC4] hover:border-[#13008B]/50'
                    }`}
                  >
                    {tab.label}
                  </button>
                )
              })}
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
                      const statusRaw = item?.status || item?.validation_status || currentStatus || '—'
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
                              className={`inline-flex items-center justify-center rounded-lg border px-3 py-2 text-sm font-semibold transition ${
                                isCurrentUpdating
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
    </div>
  )
}

export default AdminUsers
