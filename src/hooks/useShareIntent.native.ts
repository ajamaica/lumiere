import { useShareIntent } from 'expo-share-intent'
import { useSetAtom } from 'jotai'
import { useEffect } from 'react'

import { pendingShareTextAtom } from '../store'

/**
 * Listens for incoming share intents (text, URLs, images shared from other apps)
 * and stores the shared content in pendingShareTextAtom for ChatInput to consume.
 *
 * Call this once in the root layout after onboarding / biometric gates.
 */
export function useShareExtension() {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent()
  const setPendingShareText = useSetAtom(pendingShareTextAtom)

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

    resetShareIntent()
  }, [hasShareIntent, shareIntent, resetShareIntent, setPendingShareText])
}
