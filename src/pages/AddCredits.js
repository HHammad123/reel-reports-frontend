import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import { selectUser } from '../redux/slices/userSlice'
import { Wallet, TrendingDown, Coins, CreditCard, X, PlusCircle, Check, Search } from 'lucide-react'
import loadingGif from '../asset/loadingv2.gif'

const ADMIN_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net'

const SUBSCRIPTION_PACKAGES = [
  { name: 'Starter', price: 30, credits: 1250, type: 'subscription' },
  { name: 'Professional', price: 75, credits: 3750, type: 'subscription', isTopPlan: true },
  { name: 'Business', price: 100, credits: 5250, type: 'subscription' }
]

const TOPUP_PACKAGES = [
  { name: 'Small Pack', price: 5, credits: 200, type: 'topup' },
  { name: 'Medium Pack', price: 10, credits: 400, type: 'topup', isTopPlan: true },
  { name: 'Large Pack', price: 20, credits: 850, type: 'topup' }
]

const SuccessModal = ({ isOpen, onClose, packageDetails, userCount }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] backdrop-blur-sm">
      <div className="bg-white rounded-2xl p-8 max-w-sm w-full mx-4 shadow-2xl transform transition-all animate-in fade-in zoom-in duration-300">
        <div className="flex flex-col items-center text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-6">
            <Check className="w-8 h-8 text-green-600" strokeWidth={3} />
          </div>
          <h3 className="text-2xl font-bold text-gray-900 mb-2">Success!</h3>
          <p className="text-gray-600 mb-6">
            Successfully added <span className="font-semibold text-gray-900">${packageDetails?.price} Package</span>
            <br />
            (<span className="text-[#13008B] font-bold">{packageDetails?.credits?.toLocaleString()} credits</span>)
            <br />
            to <span className="font-bold text-gray-900">{userCount}</span> user{userCount !== 1 ? 's' : ''}.
          </p>
          <button
            onClick={onClose}
            className="w-full py-3 bg-[#13008B] text-white rounded-xl font-semibold hover:bg-blue-800 transition-colors"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
};

const AddCredits = () => {
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
  const [searchQuery, setSearchQuery] = useState('')

  // Add Credits & Selection State
  const [isAddCreditsModalOpen, setIsAddCreditsModalOpen] = useState(false)
  const [selectedPackage, setSelectedPackage] = useState(null)
  const [selectedUserIds, setSelectedUserIds] = useState(new Set())
  const [isAllSelected, setIsAllSelected] = useState(false)
  const [addingCredits, setAddingCredits] = useState(false)
  const [successModalData, setSuccessModalData] = useState({ isOpen: false, packageDetails: null, userCount: 0 })

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

  const handleAddCreditsSubmit = async () => {
    if (!isAllSelected && selectedUserIds.size === 0) {
      alert('Please select at least one user or "Select All".')
      return
    }

    if (!selectedPackage) {
      alert('Please select a credit package.')
      return
    }

    setAddingCredits(true)
    try {
      const token = localStorage.getItem('token') || ''

      // Determine target users
      let targetUserIds = []
      if (isAllSelected) {
        targetUserIds = users.map(u => u.id || u._id || u.user_id)
      } else {
        targetUserIds = Array.from(selectedUserIds)
      }

      // Process requests in parallel
      const promises = targetUserIds.map(userId =>
        fetch(`${ADMIN_BASE}/v1/admin/api/admin/users/${userId}/credits/add`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({
            amount_added: selectedPackage.price.toString(),
            note: `Admin Added - $${selectedPackage.price} Package (${selectedPackage.credits.toLocaleString()} credits)`
          })
        }).then(async res => {
          if (!res.ok) {
            const text = await res.text().catch(() => 'Unknown error')
            throw new Error(`User ${userId}: ${text}`)
          }
          return res.json()
        })
      )

      await Promise.all(promises)

      setIsAddCreditsModalOpen(false)
      setSelectedUserIds(new Set())
      setIsAllSelected(false)
      fetchUsers(undefined) // Refresh list

      setSuccessModalData({
        isOpen: true,
        packageDetails: selectedPackage,
        userCount: targetUserIds.length
      })
      setSelectedPackage(null)

    } catch (err) {
      console.error('Add credits error:', err)
      alert(`Error: ${err.message}`)
    } finally {
      setAddingCredits(false)
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

  // Search filter
  const filteredUsers = useMemo(() => {
    if (!searchQuery) return users
    const lowerQuery = searchQuery.toLowerCase()
    return users.filter(user =>
      (user?.email || '').toLowerCase().includes(lowerQuery) ||
      (user?.display_name || user?.name || '').toLowerCase().includes(lowerQuery) ||
      (user?.id || user?._id || user?.user_id || '').toString().toLowerCase().includes(lowerQuery)
    )
  }, [users, searchQuery])

  // Pagination calculations
  const itemsPerPage = 50
  const totalPages = Math.ceil(filteredUsers.length / itemsPerPage)
  const startIndex = (currentPage - 1) * itemsPerPage
  const endIndex = startIndex + itemsPerPage
  const paginatedUsers = filteredUsers.slice(startIndex, endIndex)

  // Reset to page 1 when users or search query change
  useEffect(() => {
    setCurrentPage(1)
  }, [users.length, searchQuery])

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
                  <PlusCircle className="w-6 h-6" />
                  Add Credits
                </h1>
                <p className="text-sm text-[#4B3CC4]">
                  Add credits to user accounts manually.
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
                  onClick={() => setIsAddCreditsModalOpen(true)}
                  className="inline-flex items-center justify-center rounded-lg border bg-[#13008B] px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-[#13008B]/90"
                >
                  Add Credits
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
                  <div className="flex flex-col items-center justify-center">
                    <img src={loadingGif} alt="Loading..." className="h-16 w-16" />
                    <p className="mt-4 text-[#13008B] font-medium animate-pulse">Loading users...</p>
                  </div>
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
                          onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                          disabled={currentPage === 1}
                          className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <span className="sr-only">Previous</span>
                          <svg className="w-5 h-5 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
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

      {/* Add Credits Modal */}
      {isAddCreditsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
            {addingCredits ? (
              <div className="flex flex-col items-center justify-center py-8">
                <img src={loadingGif} alt="Adding..." className="w-20 h-20 mb-4" />
                <p className="text-lg font-semibold text-[#13008B]">Adding Credits...</p>
              </div>
            ) : (
              <>
                <div className="mb-4 flex items-center justify-between">
                  <h2 className="text-xl font-bold text-[#13008B]">Add Credits</h2>
                  <button
                    onClick={() => setIsAddCreditsModalOpen(false)}
                    className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                <p className="mb-4 text-sm text-gray-600">
                  {isAllSelected
                    ? "Adding credits to ALL users."
                    : `Adding credits to ${selectedUserIds.size} selected user${selectedUserIds.size !== 1 ? 's' : ''}.`
                  }
                </p>

                <div className="space-y-4 max-h-[60vh] overflow-y-auto pr-2">
                  <p className="block text-sm font-medium text-gray-700">Select Credit Package</p>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Subscription Plans</p>
                    {SUBSCRIPTION_PACKAGES.map((pkg) => (
                      <div
                        key={`${pkg.type}-${pkg.price}`}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${selectedPackage?.price === pkg.price
                          ? 'border-[#13008B] bg-blue-50 ring-1 ring-[#13008B]'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-gray-500">{pkg.name}</span>
                          <span className="text-lg font-bold text-[#13008B]">${pkg.price}</span>
                          <span className="text-xs text-gray-500 font-medium">Subscription plan</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-[#E5E2FF] p-1.5 rounded-lg text-[#13008B]">
                            <Coins size={18} />
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-bold text-gray-900">{pkg.credits.toLocaleString()}</span>
                            <span className="text-xs text-gray-500 font-medium">credits</span>
                          </div>
                          {pkg.isTopPlan && (
                            <span className="ml-2 rounded-full bg-[#E5E2FF] px-2 py-0.5 text-[10px] font-semibold text-[#13008B]">
                              Top Plan
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Top Up Packs</p>
                    {TOPUP_PACKAGES.map((pkg) => (
                      <div
                        key={`${pkg.type}-${pkg.price}`}
                        onClick={() => setSelectedPackage(pkg)}
                        className={`flex items-center justify-between p-4 rounded-xl border cursor-pointer transition-all ${selectedPackage?.price === pkg.price
                          ? 'border-[#13008B] bg-blue-50 ring-1 ring-[#13008B]'
                          : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                          }`}
                      >
                        <div className="flex flex-col">
                          <span className="text-xs font-semibold text-gray-500">{pkg.name}</span>
                          <span className="text-lg font-bold text-[#13008B]">${pkg.price}</span>
                          <span className="text-xs text-gray-500 font-medium">One-time payment</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="bg-[#E5E2FF] p-1.5 rounded-lg text-[#13008B]">
                            <Coins size={18} />
                          </div>
                          <div className="flex flex-col items-end">
                            <span className="text-lg font-bold text-gray-900">{pkg.credits.toLocaleString()}</span>
                            <span className="text-xs text-gray-500 font-medium">credits</span>
                          </div>
                          {pkg.isTopPlan && (
                            <span className="ml-2 rounded-full bg-[#E5E2FF] px-2 py-0.5 text-[10px] font-semibold text-[#13008B]">
                              Top Plan
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setIsAddCreditsModalOpen(false)}
                    className="flex-1 rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-semibold text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddCreditsSubmit}
                    disabled={addingCredits}
                    className="flex-1 rounded-lg bg-[#13008B] px-4 py-2 text-sm font-semibold text-white hover:bg-[#13008B]/90 disabled:opacity-70"
                  >
                    Confirm Add
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Success Modal */}
      <SuccessModal
        isOpen={successModalData.isOpen}
        onClose={() => setSuccessModalData({ ...successModalData, isOpen: false })}
        packageDetails={successModalData.packageDetails}
        userCount={successModalData.userCount}
      />
    </div>
  )
}

export default AddCredits
