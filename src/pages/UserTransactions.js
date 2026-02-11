import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import { selectUser } from '../redux/slices/userSlice'
import { ArrowLeft, ChevronLeft, ChevronRight } from 'lucide-react'
import loadingGif from '../asset/loadingv2.gif'

const ADMIN_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net'

const UserTransactions = () => {
  const { userId } = useParams()
  const navigate = useNavigate()
  const user = useSelector(selectUser)

  // Check role
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

  const [transactions, setTransactions] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [page, setPage] = useState(1)
  const [hasMore, setHasMore] = useState(false) // Assuming API returns if there are more, or we check length
  const limit = 10

  const fetchTransactions = useCallback(async () => {
    if (!isAdmin || !userId) return
    setLoading(true)
    setError('')
    try {
      const token = localStorage.getItem('token') || ''
      const skip = (page - 1) * limit
      // Construct URL with query params
      const url = `${ADMIN_BASE}/v1/admin/api/admin/users/${userId}/transactions?limit=${limit}&skip=${skip}`

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      })

      if (!response.ok) {
        const message = await response.text()
        throw new Error(message || `Unable to load transactions (${response.status})`)
      }

      const data = await response.json()
      // Assuming response structure. Adjust if needed based on actual API.
      // Typical structures: { transactions: [], total: 100 } or just []
      const list = Array.isArray(data?.transactions) ? data.transactions : (Array.isArray(data) ? data : [])

      setTransactions(list)

      // Simple pagination logic: if we got full page, assume there might be more
      // Ideally API returns total count
      if (data.total !== undefined) {
        setHasMore(skip + list.length < data.total)
      } else {
        setHasMore(list.length === limit)
      }

    } catch (err) {
      console.error('Failed to fetch transactions:', err)
      setError(err.message || 'Failed to fetch transactions.')
    } finally {
      setLoading(false)
    }
  }, [isAdmin, userId, page, limit])

  useEffect(() => {
    fetchTransactions()
  }, [fetchTransactions])

  // Admin check effect
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
            <img src={loadingGif} alt="Loading..." className="h-16 w-16" />
          </div>
        </div>
      </div>
    )
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />
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
                <div className="flex items-center gap-2 mb-1">
                  <button onClick={() => navigate('/admin/transactions')} className="text-[#13008B] hover:bg-[#13008B]/10 p-1 rounded-full transition">
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <h1 className="text-2xl font-semibold text-[#13008B]">User Transactions</h1>
                </div>
                <p className="text-sm text-[#4B3CC4] ml-8">
                  Transaction history for user ID: {userId}
                </p>
              </div>
              <button
                type="button"
                onClick={fetchTransactions}
                className="inline-flex items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-[#13008B] shadow-sm transition hover:bg-[#13008B]/10"
              >
                Refresh
              </button>
            </div>

            <div className="mt-2 flex-1 overflow-scroll">
              {loading ? (
                <div className="flex h-full items-center justify-center">
                  <img src={loadingGif} alt="Loading..." className="h-16 w-16" />
                </div>
              ) : error ? (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                  {error}
                </div>
              ) : transactions.length === 0 ? (
                <div className="rounded-xl border border-[#E8E4FF] bg-[#F6F4FF] px-4 py-6 text-center text-sm text-[#4B3CC4]">
                  No transactions found for this user.
                </div>
              ) : (
                <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-2xl border border-[#E8E4FF] bg-white shadow-inner">
                  <div className="flex-1 overflow-x-auto overflow-y-auto pb-4 pr-1">
                    <table className="min-w-[1200px] w-full divide-y divide-[#E8E4FF] bg-white text-left text-sm text-gray-700">
                      <thead className="bg-[#F6F4FF] text-[#13008B] sticky top-0 z-10 shadow-sm shadow-[#E8E4FF]/40">
                        <tr>
                          <th className="px-4 py-3 font-semibold">ID</th>
                          <th className="px-4 py-3 font-semibold">Date</th>
                          <th className="px-4 py-3 font-semibold">Type</th>
                          <th className="px-4 py-3 font-semibold">Amount</th>
                          <th className="px-4 py-3 font-semibold">Credits Added</th>
                          <th className="px-4 py-3 font-semibold">Balance After</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F0EDFF]">
                        {transactions.map((tx, idx) => (
                          <tr key={tx.id || tx._id || idx} className="hover:bg-[#F8F6FF]">
                            <td className="px-4 py-3 text-xs text-gray-500 font-mono" title={tx.id}>
                              {tx.id ? `${tx.id.substring(0, 8)}...` : '—'}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              {tx.created_at ? new Date(tx.created_at).toLocaleString() : '—'}
                            </td>
                            <td className="px-4 py-3 capitalize">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${tx.type === 'purchase' ? 'bg-green-100 text-green-800' :
                                tx.type === 'usage' ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                {tx.type || '—'}
                              </span>
                            </td>

                            <td className="px-4 py-3 font-medium">
                              {tx.amount_usd !== undefined ? `$${tx.amount_usd}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-green-600 font-medium">
                              {tx.credits_added ? `+${tx.credits_added}` : '—'}
                            </td>
                            <td className="px-4 py-3 font-semibold text-[#13008B]">
                              {tx.balance_after !== undefined ? tx.balance_after : '—'}
                            </td>

                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Pagination Controls */}
            <div className="mt-4 flex items-center justify-between border-t border-gray-100 pt-4">
              <div className="text-sm text-gray-500">
                Page {page}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page === 1 || loading}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeft className="w-5 h-5 text-gray-600" />
                </button>
                <button
                  onClick={() => setPage(p => p + 1)}
                  disabled={!hasMore || loading}
                  className="p-2 rounded-lg border border-gray-200 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRight className="w-5 h-5 text-gray-600" />
                </button>
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}

export default UserTransactions
