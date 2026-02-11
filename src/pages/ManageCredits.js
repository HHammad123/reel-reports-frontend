import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import { selectUser } from '../redux/slices/userSlice'
import { Wallet, TrendingDown, Coins, CreditCard, X } from 'lucide-react'
import loadingGif from '../asset/loadingv2.gif'

const ADMIN_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net'

const ManageCredits = () => {
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

  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] = useState(1)

  // Pricing & Selection State
  const [isPricingModalOpen, setIsPricingModalOpen] = useState(false)
  const [pricingForm, setPricingForm] = useState({
    veo3_per_video: 30,
    hailuo2_per_video: 45,
    nano_banana_per_image: 7,
    chart_animation_per_scene: 0,
    audio_per_generation: 0
  })
  const [selectedUserIds, setSelectedUserIds] = useState(new Set())
  const [isAllSelected, setIsAllSelected] = useState(false)
  const [updatingPricing, setUpdatingPricing] = useState(false)
  const [fetchingPricing, setFetchingPricing] = useState(false)
  const [pricingFetchUser, setPricingFetchUser] = useState(null)

  const toggleSelectAll = () => {
    setIsAllSelected(!isAllSelected)
    setSelectedUserIds(new Set()) // Clear individual selections when toggling global
  }

  const toggleUser = (id) => {
    if (isAllSelected) return // Disabled when global select is on
    const newSelected = new Set(selectedUserIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedUserIds(newSelected)
  }

  const handlePricingChange = (e) => {
    const { name, value } = e.target
    setPricingForm(prev => ({
      ...prev,
      [name]: parseFloat(value) || 0
    }))
  }

  const fetchUserPricing = async (userId) => {
    try {
      setFetchingPricing(true)
      const token = localStorage.getItem('token') || ''
      const response = await fetch(`${ADMIN_BASE}/v1/admin/api/admin/users/${encodeURIComponent(userId)}/pricing`, {
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })
      if (!response.ok) throw new Error('Failed to fetch pricing')
      const data = await response.json()
      if (data.pricing) {
        setPricingForm({
          veo3_per_video: data.pricing.veo3_per_video ?? 30,
          hailuo2_per_video: data.pricing.hailuo2_per_video ?? 45,
          nano_banana_per_image: data.pricing.nano_banana_per_image ?? 7,
          chart_animation_per_scene: data.pricing.chart_animation_per_scene ?? 0,
          audio_per_generation: data.pricing.audio_per_generation ?? 0
        })
        setPricingFetchUser(data.email || userId)
      }
    } catch (err) {
      console.error('Failed to fetch user pricing:', err)
    } finally {
      setFetchingPricing(false)
    }
  }

  const openPricingModal = () => {
    // If exactly one user selected, fetch their current pricing to pre-fill
    if (!isAllSelected && selectedUserIds.size === 1) {
      const userId = Array.from(selectedUserIds)[0]
      fetchUserPricing(userId)
    } else {
      // Reset to defaults for bulk/all updates
      setPricingForm({
        veo3_per_video: 30,
        hailuo2_per_video: 45,
        nano_banana_per_image: 7,
        chart_animation_per_scene: 0,
        audio_per_generation: 0
      })
      setPricingFetchUser(null)
    }
    setIsPricingModalOpen(true)
  }

  const handleUpdatePricingSubmit = async () => {
    if (!isAllSelected && selectedUserIds.size === 0) {
      alert('Please select at least one user or "Select All".')
      return
    }

    setUpdatingPricing(true)
    try {
      const token = localStorage.getItem('token') || ''
      const payload = {
        pricing: pricingForm,
        user_ids: isAllSelected ? [] : Array.from(selectedUserIds),
        apply_to_all: isAllSelected
      }

      const response = await fetch(`${ADMIN_BASE}/v1/admin/api/admin/users/pricing/update`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      })

      if (!response.ok) {
        const msg = await response.text()
        throw new Error(msg || 'Failed to update pricing')
      }

      // Alert removed as requested
      setIsPricingModalOpen(false)
      setSelectedUserIds(new Set())
      setIsAllSelected(false)
      fetchUsers(undefined) // Refresh list
    } catch (err) {
      console.error('Update pricing error:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setUpdatingPricing(false)
    }
  }

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
        const response = await fetch('https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net/v1/admin/users/list', {
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
        const usersData = Array.isArray(data?.users) ? data.users : (Array.isArray(data) ? data : [])

        setUsers(usersData)
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
  const [checkingAdmin, setCheckingAdmin] = useState(true)

  useEffect(() => {
    // Give Redux a moment to load, then check
    const timer = setTimeout(() => {
      setCheckingAdmin(false)
    }, 500)
    return () => clearTimeout(timer)
  }, [])

  // Pagination calculations
  const itemsPerPage = 50
  const totalPages = Math.ceil(users.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = users.slice(startIndex, endIndex)

  // Reset to page 1 when users change
  useEffect(() => {
    setCurrentPage(1)
  }, [users.length])

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
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-[#13008B]/30 border-t-[#13008B]"></div>
          </div>
        </div>
      </div>
    )
  }

  // Only redirect if we've checked and user is definitely not admin
  if (!isAdmin) {
    try {
      const storedUser = localStorage.getItem('user')
      if (storedUser) {
        const parsedUser = JSON.parse(storedUser)
        const localRole = (parsedUser?.role || parsedUser?.user_role || parsedUser?.type || parsedUser?.userType || '').toString().toLowerCase()
        if (localRole === 'admin') {
          // User is admin in localStorage, allow access
        } else {
          return <Navigate to="/" replace />
        }
      } else {
        return <Navigate to="/" replace />
      }
    } catch (e) {
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
                <h1 className="text-2xl font-semibold text-[#13008B] flex items-center gap-2">
                  <Wallet className="w-6 h-6" />
                  Manage Credits
                </h1>
                <p className="text-sm text-[#4B3CC4]">
                  View and manage user credit balances and consumption.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={openPricingModal}
                  className="inline-flex items-center justify-center rounded-lg border bg-[#13008B] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#13008B]/90"
                >
                  Update Pricing
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
                  No users found.
                </div>
              ) : (
                <>
                  {/* Results info */}
                  <div className="mb-4 flex items-center justify-between text-sm text-gray-600">
                    <div>
                      Showing <span className="font-semibold text-[#13008B]">{startIndex + 1}</span> to{' '}
                      <span className="font-semibold text-[#13008B]">{Math.min(endIndex, users.length)}</span> of{' '}
                      <span className="font-semibold text-[#13008B]">{users.length}</span> users
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
                            <th className="px-4 py-3 font-semibold whitespace-nowrap w-10">
                              <input
                                type="checkbox"
                                checked={isAllSelected}
                                onChange={toggleSelectAll}
                                className="h-4 w-4 rounded border-gray-300 text-[#13008B] focus:ring-[#13008B]"
                              />
                            </th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">User</th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">Role</th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <CreditCard className="w-3.5 h-3.5" />
                                Purchased
                              </div>
                            </th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <TrendingDown className="w-3.5 h-3.5" />
                                Consumed
                              </div>
                            </th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Wallet className="w-3.5 h-3.5" />
                                Balance
                              </div>
                            </th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap">
                              <div className="flex items-center gap-1">
                                <Coins className="w-3.5 h-3.5" />
                                Amount Spent
                              </div>
                            </th>
                            <th className="px-4 py-3 font-semibold whitespace-nowrap text-right">Pricing</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F0EDFF]">
                          {paginatedUsers.map((user, idx) => {
                            const credits = user.credits_summary || {}
                            const userId = user.id || user._id || user.user_id
                            const isSelected = isAllSelected || selectedUserIds.has(userId)

                            return (
                              <tr key={userId || idx} className="hover:bg-[#F8F6FF]">
                                <td className="px-4 py-3">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleUser(userId)}
                                    disabled={isAllSelected}
                                    className="h-4 w-4 rounded border-gray-300 text-[#13008B] focus:ring-[#13008B] disabled:opacity-50 disabled:cursor-not-allowed"
                                    title={isAllSelected ? "Deselect 'Select All' to select specific users" : "Select user"}
                                  />
                                </td>
                                <td className="px-4 py-3 text-gray-900">
                                  <div className="flex flex-col">
                                    <span className="font-semibold text-[#13008B]">{user.display_name || user.name || '—'}</span>
                                    <span className="text-xs text-gray-500">{user.email || '—'}</span>
                                  </div>
                                </td>
                                <td className="px-4 py-3 text-gray-700 capitalize">
                                  {user.role || user.user_role || 'User'}
                                </td>
                                <td className="px-4 py-3 text-gray-900 font-medium">
                                  {credits.credits_purchased?.toLocaleString() || 0}
                                </td>
                                <td className="px-4 py-3 text-gray-900 font-medium">
                                  {credits.credits_consumed?.toLocaleString() || 0}
                                </td>
                                <td className="px-4 py-3 font-bold text-[#13008B]">
                                  {credits.credits_balance?.toLocaleString() || 0}
                                </td>
                                <td className="px-4 py-3 text-gray-900 font-medium">
                                  ${credits.amount_spent?.toLocaleString() || 0}
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedUserIds(new Set([userId]))
                                      setIsAllSelected(false)
                                      fetchUserPricing(userId)
                                      setIsPricingModalOpen(true)
                                    }}
                                    className="inline-flex items-center rounded-lg border border-[#D8D3FF] px-3 py-1.5 text-xs font-semibold text-[#13008B] transition hover:bg-[#13008B]/10"
                                  >
                                    View / Edit
                                  </button>
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
                    <div className="mt-6 flex items-center justify-between border-t border-gray-200 pt-4">
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        <button
                          type="button"
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="inline-flex items-center justify-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Page numbers */}
                        {Array.from({ length: totalPages }, (_, i) => i + 1)
                          .filter((page) => {
                            // Show first page, last page, current page, and pages around current
                            return (
                              page === 1 ||
                              page === totalPages ||
                              (page >= currentPage - 2 && page <= currentPage + 2)
                            )
                          })
                          .map((page, i, arr) => (
                            <React.Fragment key={page}>
                              {i > 0 && arr[i - 1] !== page - 1 && (
                                <span className="px-2 text-gray-400">...</span>
                              )}
                              <button
                                type="button"
                                onClick={() => handlePageChange(page)}
                                className={`inline-flex h-8 w-8 items-center justify-center rounded-lg text-sm font-medium transition ${currentPage === page
                                  ? 'bg-[#13008B] text-white'
                                  : 'text-gray-700 hover:bg-gray-100'
                                  }`}
                              >
                                {page}
                              </button>
                            </React.Fragment>
                          ))}
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Pricing Modal */}
      {isPricingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {updatingPricing ? (
              <div className="flex flex-col items-center justify-center py-8">
                <img src={loadingGif} alt="Updating..." className="w-20 h-20 mb-4" />
                <p className="text-lg font-semibold text-[#13008B]">Updating Price...</p>
              </div>
            ) : fetchingPricing ? (
              <div className="flex flex-col items-center justify-center py-8">
                <div className="h-10 w-10 animate-spin rounded-full border-4 border-[#13008B]/30 border-t-[#13008B] mb-4"></div>
                <p className="text-sm font-medium text-[#13008B]">Loading current pricing...</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#13008B]">Update Pricing</h2>
                  <button
                    onClick={() => { setIsPricingModalOpen(false); setPricingFetchUser(null) }}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="mb-4 text-sm text-gray-600">
                  {pricingFetchUser
                    ? <>Current pricing for <span className="font-semibold text-[#13008B]">{pricingFetchUser}</span>. Edit and save.</>
                    : isAllSelected
                      ? "Updating pricing for ALL users."
                      : `Updating pricing for ${selectedUserIds.size} selected user${selectedUserIds.size !== 1 ? 's' : ''}.`
                  }
                </p>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  {[
                    { label: 'Veo3 Per Video', name: 'veo3_per_video' },
                    { label: 'Hailuo2 Per Video', name: 'hailuo2_per_video' },
                    { label: 'Nano Banana Per Image', name: 'nano_banana_per_image' },
                    { label: 'Chart Animation Per Scene', name: 'chart_animation_per_scene' },
                    { label: 'Audio Per Generation', name: 'audio_per_generation' },
                  ].map((field) => (
                    <div key={field.name}>
                      <label className="mb-1 block text-sm font-medium text-gray-700">
                        {field.label}
                      </label>
                      <input
                        type="number"
                        name={field.name}
                        value={pricingForm[field.name]}
                        onChange={handlePricingChange}
                        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-[#13008B] focus:outline-none focus:ring-1 focus:ring-[#13008B]"
                      />
                    </div>
                  ))}
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => { setIsPricingModalOpen(false); setPricingFetchUser(null) }}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleUpdatePricingSubmit}
                    disabled={updatingPricing}
                    className="flex-1 rounded-lg bg-[#13008B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#13008B]/90 disabled:opacity-70"
                  >
                    Update
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

export default ManageCredits
