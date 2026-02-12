import { useShareIntent } from 'expo-share-intent'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'

import type { PendingShareMedia } from '../store'
import { pendingShareMediaAtom, pendingShareTextAtom } from '../store'

/**
 * Listens for incoming share intents (text, URLs, images shared from other apps)
 * and stores the shared content in pending atoms for ChatScreen to consume.
 *
 * Call this once in the root layout after onboarding / biometric gates.
 */
export function useShareExtension() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent()
  const setPendingShareText = useSetAtom(pendingShareTextAtom)
  const setPendingShareMedia = useSetAtom(pendingShareMediaAtom)

  useEffect(() => {
    if (!hasShareIntent || !shareIntent) return

    // Build shared text from available fields
    const parts: string[] = []

    if (shareIntent.text) {
      parts.push(shareIntent.text)
    }

    // Append URL if it wasn't already included in the text
    if (shareIntent.webUrl && !shareIntent.text?.includes(shareIntent.webUrl)) {
      parts.push(shareIntent.webUrl)
    }

    const sharedText = parts.join('\n').trim()
    if (sharedText) {
      setPendingShareText(sharedText)
    }

    // Extract shared files (images, videos, etc.)
    if (shareIntent.files && shareIntent.files.length > 0) {
      const media: PendingShareMedia[] = shareIntent.files
        .filter((file) => !!file.path)
        .map((file) => ({
          uri: file.path,
          mimeType: file.mimeType || 'application/octet-stream',
          fileName: file.fileName || undefined,
        }))
      if (media.length > 0) {
        setPendingShareMedia(media)
        // If there's no text but there are files, set empty text to trigger the send flow
        if (!sharedText) {
          setPendingShareText('')
        }
      }
    }

    resetShareIntent()
  }, [hasShareIntent, shareIntent, resetShareIntent, setPendingShareText, setPendingShareMedia])
}
