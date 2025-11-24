import { useCallback, useRef, useState } from 'react'
import { removeSolidBackground } from '../utils/removeSolidBackground'

const globalCache = new Map()

const useOverlayBackgroundRemoval = (threshold = 245) => {
  const [processedMap, setProcessedMap] = useState({})
  const processingRef = useRef(new Set())

  const getOverlayUrl = useCallback(
    (url) => {
      if (!url) return ''
      if (globalCache.has(url)) return globalCache.get(url)
      if (processedMap[url]) return processedMap[url]

      if (!processingRef.current.has(url)) {
        processingRef.current.add(url)
        removeSolidBackground(url, { threshold })
          .then((result) => {
            const finalUrl = result || url
            globalCache.set(url, finalUrl)
            setProcessedMap((prev) => {
              if (prev[url] === finalUrl) return prev
              return { ...prev, [url]: finalUrl }
            })
          })
          .catch(() => {
            globalCache.set(url, url)
            setProcessedMap((prev) => {
              if (prev[url] === url) return prev
              return { ...prev, [url]: url }
            })
          })
          .finally(() => {
            processingRef.current.delete(url)
          })
      }
      return url
    },
    [processedMap, threshold]
  )

  return getOverlayUrl
}

export default useOverlayBackgroundRemoval

