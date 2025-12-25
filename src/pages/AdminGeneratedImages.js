import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react'
import { useSelector } from 'react-redux'
import { Navigate, useParams, useNavigate } from 'react-router-dom'
import Sidebar from '../Components/Sidebar'
import Topbar from '../Components/Topbar'
import { selectUser } from '../redux/slices/userSlice'

const ADMIN_BASE = 'https://coreappservicerr-aseahgexgke8f0a4.canadacentral-01.azurewebsites.net'

const AdminGeneratedImages = () => {
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

  const [images, setImages] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedAspectRatio, setSelectedAspectRatio] = useState('16:9')
  const abortControllerRef = useRef(null)

  // Helper to normalize aspect ratio values for comparison
  const normalizeAspectRatio = (ratio) => {
    if (!ratio) return null
    // Handle number types (convert to string)
    if (typeof ratio === 'number') {
      ratio = String(ratio)
    }
    if (typeof ratio !== 'string') return null
    
    // Normalize common separators: space, underscore, "x", "/", ":"
    const cleaned = ratio.replace(/\s+/g, '').replace(/_/g, ':')
    const match = cleaned.match(/(\d+(?:\.\d+)?)[:/xX](\d+(?:\.\d+)?)/)
    if (match) {
      const w = Number(match[1])
      const h = Number(match[2])
      if (w > 0 && h > 0) {
        // Normalize to standard format - check which is larger
        if (w === 9 && h === 16) return '9:16'
        if (w === 16 && h === 9) return '16:9'
        // Handle reversed or different formats
        if (w === 16 && h === 9) return '16:9'
        if (w === 9 && h === 16) return '9:16'
        return `${w}:${h}`
      }
    }
    const lower = cleaned.toLowerCase()
    if (lower === '9:16' || lower === '9x16' || lower === '9_16' || lower === '9/16') return '9:16'
    if (lower === '16:9' || lower === '16x9' || lower === '16_9' || lower === '16/9') return '16:9'
    return null
  }

  // Filter images based on selected aspect ratio
  const filteredImages = useMemo(() => {
    if (!selectedAspectRatio || selectedAspectRatio === 'all') return images
    
    return images.filter(img => {
      if (!img || typeof img !== 'object') return false
      
      // Check various possible field names for aspect ratio
      const aspectRatio = img?.aspect_ratio || 
                         img?.aspectRatio || 
                         img?.aspect_ratio_value ||
                         img?.ratio ||
                         img?.size ||
                         img?.dimensions?.aspect_ratio
      
      const normalized = normalizeAspectRatio(aspectRatio)
      return normalized === selectedAspectRatio
    })
  }, [images, selectedAspectRatio])

  // Fetch images function that can be called manually (for refresh)
  const fetchImages = useCallback(
    async (abortSignal) => {
      if (!isAdmin || !userId) {
        setLoading(false)
        return
      }
      setLoading(true)
      setError('')
      try {
        const token = localStorage.getItem('token') || ''
        const response = await fetch(`${ADMIN_BASE}/v1/users/user/${encodeURIComponent(userId)}/generated-media`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          ...(abortSignal ? { signal: abortSignal } : {})
        })

        if (!response.ok) {
          // If 404 or empty response, treat as no media found
          if (response.status === 404) {
            setImages([])
            setError('')
            setLoading(false)
            return
          }
          const message = await response.text()
          throw new Error(message || `Unable to load images (${response.status})`)
        }

        let data
        try {
          const responseText = await response.text()
          if (!responseText || responseText.trim() === '') {
            setImages([])
            setError('')
            setLoading(false)
            return
          }
          data = JSON.parse(responseText)
        } catch (parseError) {
          // If response is not valid JSON, treat as empty
          setImages([])
          setError('')
          setLoading(false)
          return
        }
        // Handle different response structures
        let imagesData = []
        if (Array.isArray(data)) {
          imagesData = data
        } else if (data?.generated_images && typeof data.generated_images === 'object') {
          // If data has generated_images object with aspect ratio keys
          // Flatten all images and add aspect ratio to each
          Object.entries(data.generated_images).forEach(([aspectRatio, images]) => {
            if (Array.isArray(images)) {
              images.forEach(img => {
                if (img && typeof img === 'object') {
                  imagesData.push({ ...img, aspect_ratio: aspectRatio })
                } else {
                  imagesData.push({ image: img, aspect_ratio: aspectRatio })
                }
              })
            }
          })
        } else if (Array.isArray(data?.images)) {
          imagesData = data.images
        } else if (Array.isArray(data?.data)) {
          imagesData = data.data
        } else if (Array.isArray(data?.media)) {
          imagesData = data.media
        } else if (data === null || data === undefined) {
          imagesData = []
        } else if (typeof data === 'object' && data !== null) {
          // Only add as single item if it has meaningful data
          if (Object.keys(data).length > 0) {
            imagesData = [data]
          } else {
            imagesData = []
          }
        }
        
        setImages(imagesData)
        setError('') // Clear any previous errors if we got a successful response
      } catch (err) {
        if (err.name === 'AbortError') {
          // Don't update state if request was aborted
          return
        }
        console.error('Failed to fetch images:', err)
        setError(err.message || 'Failed to fetch images.')
      } finally {
        // Only update loading state if request wasn't aborted
        if (!abortSignal || !abortSignal.aborted) {
          setLoading(false)
        }
      }
    },
    [isAdmin, userId]
  )

  // Fetch images on mount and when userId changes
  useEffect(() => {
    if (!isAdmin || !userId) {
      setLoading(false)
      return
    }
    
    // Abort any previous request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
    }
    
    const controller = new AbortController()
    abortControllerRef.current = controller
    
    fetchImages(controller.signal)
    
    return () => {
      if (abortControllerRef.current === controller) {
        controller.abort()
        abortControllerRef.current = null
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin, userId]) // Only depend on isAdmin and userId, not fetchImages

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
          View Image
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
                <h1 className="text-2xl font-semibold text-[#13008B]">Generated Images</h1>
                <p className="text-sm text-[#4B3CC4]">
                  All generated images for user ID: {userId}
                </p>
              </div>
              <div className="flex gap-3 items-center">
                <div className="flex items-center gap-2">
                  <label className="text-sm font-medium text-gray-700">Aspect Ratio:</label>
                  <select
                    value={selectedAspectRatio}
                    onChange={(e) => setSelectedAspectRatio(e.target.value)}
                    className="border border-gray-300 rounded-lg px-3 py-2 text-sm font-medium text-gray-700 bg-white focus:outline-none focus:ring-2 focus:ring-[#13008B] focus:border-[#13008B]"
                  >
                    <option value="16:9">16:9</option>
                    <option value="9:16">9:16</option>
                  </select>
                </div>
                <button
                  type="button"
                  onClick={() => navigate('/admin/logs')}
                  className="inline-flex items-center justify-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold text-[#13008B] shadow-sm transition hover:bg-[#13008B]/10"
                >
                  Back to Logs
                </button>
                <button
                  type="button"
                  onClick={() => {
                    // Abort any ongoing request
                    if (abortControllerRef.current) {
                      abortControllerRef.current.abort()
                      abortControllerRef.current = null
                    }
                    // Fetch fresh data without abort signal (manual refresh)
                    fetchImages(undefined)
                  }}
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
              ) : images.length === 0 ? (
                <div className="rounded-xl border border-[#E8E4FF] bg-[#F6F4FF] px-4 py-6 text-center text-sm text-[#4B3CC4]">
                  No generated images found for this user.
                </div>
              ) : filteredImages.length === 0 ? (
                <div className="rounded-xl border border-[#E8E4FF] bg-[#F6F4FF] px-4 py-6 text-center text-sm text-[#4B3CC4]">
                  No images found for aspect ratio {selectedAspectRatio}. Try selecting a different aspect ratio.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {filteredImages.map((img, idx) => {
                    // Find image URL from various possible fields
                    const imageUrl = img?.image_url || 
                                   img?.imageUrl || 
                                   img?.url || 
                                   img?.src || 
                                   img?.link ||
                                   img?.image ||
                                   (typeof img === 'string' && (img.startsWith('http://') || img.startsWith('https://')) ? img : null)
                    
                    // Get other metadata
                    const imageId = img?.id || img?._id || img?.image_id || `image-${idx}`
                    const createdAt = img?.created_at || img?.createdAt || img?.created || img?.timestamp
                    const aspectRatio = img?.aspect_ratio || img?.aspectRatio || selectedAspectRatio
                    
                    return (
                      <div 
                        key={imageId} 
                        className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                      >
                        {imageUrl ? (
                          <div className="relative group">
                            <img 
                              src={imageUrl} 
                              alt={`Generated image ${idx + 1}`}
                              className="w-full h-auto object-cover"
                              style={{ 
                                aspectRatio: aspectRatio === '9:16' ? '9/16' : '16/9',
                                maxHeight: aspectRatio === '9:16' ? '400px' : '300px'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none'
                                const errorDiv = e.target.nextElementSibling
                                if (errorDiv) errorDiv.style.display = 'flex'
                              }}
                            />
                            <div 
                              className="hidden absolute inset-0 bg-gray-100 items-center justify-center text-gray-500 text-sm"
                              style={{ display: 'none' }}
                            >
                              Image failed to load
                            </div>
                            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center opacity-0 group-hover:opacity-100">
                              <a 
                                href={imageUrl} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="px-4 py-2 bg-white rounded-lg text-[#13008B] font-medium text-sm hover:bg-gray-50 transition-colors"
                                onClick={(e) => e.stopPropagation()}
                              >
                                View Full
                              </a>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-48 bg-gray-100 flex items-center justify-center text-gray-400 text-sm">
                            No image URL
                          </div>
                        )}
                        <div className="p-3 space-y-1">
                          {createdAt && (
                            <div className="text-xs text-gray-500">
                              {formatValue(createdAt)}
                            </div>
                          )}
                          {aspectRatio && (
                            <div className="text-xs text-gray-600 font-medium">
                              Aspect Ratio: {aspectRatio}
                            </div>
                          )}
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

export default AdminGeneratedImages

