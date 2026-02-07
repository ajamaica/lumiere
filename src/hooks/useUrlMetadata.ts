import { useEffect, useRef, useState } from 'react'

import { extractUrls, fetchUrlMetadata, UrlMetadata } from '../utils/urlMetadata'

/**
 * Hook that extracts URLs from message text and fetches their Open Graph metadata.
 * Only fetches for non-streaming agent messages. Results are cached per URL.
 */
export function useUrlMetadata(text: string, isStreaming: boolean, isUser: boolean) {
  const [metadata, setMetadata] = useState<UrlMetadata[]>([])
  const fetchedUrlsRef = useRef<Set<string>>(new Set())

  useEffect(() => {
    // Don't fetch for user messages or while streaming
    if (isUser || isStreaming) return

    const urls = extractUrls(text)
    if (urls.length === 0) return

    // Only fetch URLs we haven't fetched yet
    const newUrls = urls.filter((u) => !fetchedUrlsRef.current.has(u))
    if (newUrls.length === 0) return

    let cancelled = false

    // Mark URLs as fetched immediately to avoid duplicate requests
    for (const url of newUrls) {
      fetchedUrlsRef.current.add(url)
    }

    const fetchAll = async () => {
      const results = await Promise.all(newUrls.map((url) => fetchUrlMetadata(url)))
      if (!cancelled) {
        setMetadata((prev) => [...prev, ...results.filter((r) => r.title)])
      }
    }

    fetchAll()

    return () => {
      cancelled = true
    }
  }, [text, isStreaming, isUser])

  return { metadata }
}
