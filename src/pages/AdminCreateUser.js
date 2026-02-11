import React, { useMemo, useState } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import { selectUser } from '../redux/slices/userSlice'

const ADMIN_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net'

const AdminCreateUser = () => {
  const user = useSelector(selectUser)

  const isAdmin = useMemo(() => {
    const rawRole = (user?.role || user?.user_role || user?.type || user?.userType || '').toString().toLowerCase()
    return rawRole === 'admin'
  }, [user])

  const navigate = useNavigate()

  const [form, setForm] = useState({
    display_name: '',
    email: '',
    password: '',
    role: 'user',
    status: 'validated'
  })
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')

  if (!isAdmin) {
    return <Navigate to="/" replace />
  }

  const handleChange = (event) => {
    const { name, value } = event.target
    setForm(prev => ({ ...prev, [name]: value }))
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setSubmitting(true)
    setSuccess('')
    setError('')
    try {
      if (!form.display_name.trim() || !form.email.trim() || !form.password.trim()) {
        throw new Error('Name, email, and password are required.')
      }
      const token = localStorage.getItem('token') || ''
      const payload = {
        display_name: form.display_name.trim(),
        email: form.email.trim(),
        password: form.password,
        role: form.role,
        status: form.status
      }
      const response = await fetch(`${ADMIN_BASE}/v1/admin/users/create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(payload)
      })
      if (!response.ok) {
        const data = await response.json().catch(() => null)
        throw new Error(data?.detail || `Unable to create user (${response.status})`)
      }
      setSuccess('User account created successfully.')
      setForm({
        display_name: '',
        email: '',
        password: '',
        role: 'user',
        status: 'validated'
      })
      // Navigate back to admin users page after short delay
      setTimeout(() => navigate('/admin/users'), 1500)
    } catch (err) {
      console.error('Failed to create user:', err)
      setError(err.message || 'Failed to create user.')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="flex h-screen bg-[#E5E2FF] overflow-hidden">
      <Sidebar />
      <div className="flex-1 mx-[2rem] mt-[1rem] flex flex-col overflow-hidden min-w-0">
        <Topbar />

        <div className="flex-1 my-2 overflow-auto rounded-3xl bg-white/95 px-6 py-6 shadow-xl backdrop-blur">
          <div>
            <h1 className="text-2xl font-semibold text-[#13008B]">Create New User</h1>
            <p className="text-sm text-[#4B3CC4]">Provision a new account for your organization.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#13008B]" htmlFor="display_name">
                  Full Name
                </label>
                <input
                  id="display_name"
                  name="display_name"
                  value={form.display_name}
                  onChange={handleChange}
                  type="text"
                  placeholder="Jane Doe"
                  className="rounded-lg border border-[#D8D3FF] bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#13008B] focus:outline-none focus:ring-2 focus:ring-[#13008B]/40"
                  disabled={submitting}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#13008B]" htmlFor="email">
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  type="email"
                  placeholder="user@example.com"
                  className="rounded-lg border border-[#D8D3FF] bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#13008B] focus:outline-none focus:ring-2 focus:ring-[#13008B]/40"
                  disabled={submitting}
                  required
                />
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#13008B]" htmlFor="password">
                  Temporary Password
                </label>
                <input
                  id="password"
                  name="password"
                  value={form.password}
                  onChange={handleChange}
                  type="password"
                  placeholder="At least 8 characters"
                  className="rounded-lg border border-[#D8D3FF] bg-white px-4 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:border-[#13008B] focus:outline-none focus:ring-2 focus:ring-[#13008B]/40"
                  disabled={submitting}
                  required
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#13008B]" htmlFor="role">
                  Role
                </label>
                <select
                  id="role"
                  name="role"
                  value={form.role}
                  onChange={handleChange}
                  className="rounded-lg border border-[#D8D3FF] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#13008B] focus:outline-none focus:ring-2 focus:ring-[#13008B]/40"
                  disabled={submitting}
                >
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>

            <div className="grid gap-5 md:grid-cols-2">
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-[#13008B]" htmlFor="status">
                  Status
                </label>
                <select
                  id="status"
                  name="status"
                  value={form.status}
                  onChange={handleChange}
                  className="rounded-lg border border-[#D8D3FF] bg-white px-4 py-2 text-sm text-gray-800 focus:border-[#13008B] focus:outline-none focus:ring-2 focus:ring-[#13008B]/40"
                  disabled={submitting}
                >
                  <option value="validated">Validated</option>
                  <option value="not_validated">Not Validated</option>
                </select>
              </div>
            </div>

            {error && (
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
                {error}
              </div>
            )}

            {success && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {success}
              </div>
            )}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => {
                  setForm({
                    display_name: '',
                    email: '',
                    password: '',
                    role: 'user',
                    status: 'validated'
                  })
                  setError('')
                  setSuccess('')
                }}
                className="rounded-lg border border-[#13008B]/30 px-4 py-2 text-sm font-medium text-[#13008B] hover:bg-[#13008B]/10"
                disabled={submitting}
              >
                Reset
              </button>
              <button
                type="submit"
                className={`inline-flex items-center justify-center rounded-lg px-4 py-2 text-sm font-semibold text-white shadow ${submitting ? 'cursor-not-allowed bg-[#9C95FF]' : 'bg-[#13008B] hover:bg-[#0f006b]'
                  }`}
                disabled={submitting}
              >
                {submitting ? 'Creating…' : 'Create User'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

export default AdminCreateUser
