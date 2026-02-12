import { useAtom } from 'jotai'
import { useCallback, useRef } from 'react'

import {
  generateResponse,
  isAvailable,
} from '../../modules/apple-intelligence/src/AppleIntelligence'
import { sessionAliasesAtom } from '../store'
import { logger } from '../utils/logger'

const autoLabelLogger = logger.create('AutoLabel')

/**
 * Hook that automatically generates a session label using Apple Intelligence
 * after the first agent response. Uses the user's first message to derive
 * a short, descriptive label for the session.
 *
 * Only triggers once per session and only when Apple Intelligence is available.
 */
export function useAutoLabel(currentSessionKey: string) {
  const [sessionAliases, setSessionAliases] = useAtom(sessionAliasesAtom)
  const attemptedRef = useRef<Set<string>>(new Set())

  const tryGenerateLabel = useCallback(
    async (firstUserMessage: string) => {
      // Only attempt once per session key
      if (attemptedRef.current.has(currentSessionKey)) return
      attemptedRef.current.add(currentSessionKey)

      // Skip if the session already has a custom alias
      if (sessionAliases[currentSessionKey]) return

      // Check if Apple Intelligence is available on this device
      if (!isAvailable()) {
        autoLabelLogger.info('Apple Intelligence not available, skipping auto-label')
        return
      }

      try {
        const systemPrompt =
          'You are a helpful assistant that generates very short labels. ' +
          'Given a user message, respond with ONLY a short label (3-6 words) ' +
          'that summarizes the topic. No quotes, no punctuation at the end, no explanation.'

        const messages = JSON.stringify([{ role: 'user', content: firstUserMessage }])

        const label = await generateResponse(systemPrompt, messages)
        const trimmedLabel = label.trim()

        if (trimmedLabel) {
          setSessionAliases((prev) => ({
            ...prev,
            [currentSessionKey]: trimmedLabel,
          }))
          autoLabelLogger.info(`Auto-labeled session: "${trimmedLabel}"`)
        }
      } catch (err) {
        autoLabelLogger.logError('Failed to generate auto-label', err)
      }
    },
    [currentSessionKey, sessionAliases, setSessionAliases],
  )

  return { tryGenerateLabel }
}
