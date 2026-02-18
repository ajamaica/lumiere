import { useCallback, useEffect, useRef, useState } from 'react'
import { Platform } from 'react-native'

import type { Message } from '../components/chat/chatMessageTypes'
import { ProviderType } from '../services/providers/types'
import { logger } from '../utils/logger'

const suggestionsLogger = logger.create('ResponseSuggestions')

const SUGGESTION_SYSTEM_PROMPT = `You are helping a user decide how to reply in a conversation. Based on the conversation so far, suggest exactly 3 short, distinct response options the user could send next. Each suggestion must be a complete sentence under 15 words. Return ONLY a JSON array of 3 strings, no other text. Example: ["Sure, tell me more.", "That's interesting, can you elaborate?", "I have a different idea."]`

export interface ResponseSuggestion {
  id: string
  text: string
}

interface UseResponseSuggestionsOptions {
  messages: Message[]
  isAgentResponding: boolean
  providerType: ProviderType
  enabled: boolean
}

interface UseResponseSuggestionsResult {
  suggestions: ResponseSuggestion[]
  isGenerating: boolean
  dismiss: () => void
}

/**
 * Generates response suggestions using Apple Intelligence after the agent
 * finishes a message. Only active when the provider is Apple Intelligence
 * on iOS.
 */
export function useResponseSuggestions({
  messages,
  isAgentResponding,
  providerType,
  enabled,
}: UseResponseSuggestionsOptions): UseResponseSuggestionsResult {
  const [suggestions, setSuggestions] = useState<ResponseSuggestion[]>([])
  const [isGenerating, setIsGenerating] = useState(false)
  const cleanupRef = useRef<(() => void) | null>(null)
  const lastProcessedMessageIdRef = useRef<string | null>(null)

  const isAppleProvider = providerType === 'apple' && Platform.OS === 'ios'
  const isActive = enabled && isAppleProvider

  const dismiss = useCallback(() => {
    setSuggestions([])
  }, [])

  // Cancel any in-flight generation on unmount
  useEffect(() => {
    return () => {
      if (cleanupRef.current) {
        cleanupRef.current()
        cleanupRef.current = null
      }
    }
  }, [])

  // Clear suggestions when user sends a new message or agent starts responding
  useEffect(() => {
    if (isAgentResponding) {
      setSuggestions([])
    }
  }, [isAgentResponding])

  // Generate suggestions when the agent finishes responding
  useEffect(() => {
    if (!isActive || isAgentResponding || messages.length === 0) return

    const lastMessage = messages[messages.length - 1]
    if (!lastMessage || lastMessage.sender !== 'agent') return
    if (lastMessage.type === 'tool_event' || lastMessage.type === 'lifecycle_event') return
    if (lastProcessedMessageIdRef.current === lastMessage.id) return

    lastProcessedMessageIdRef.current = lastMessage.id

    // Build conversation context from the last few messages
    const recentMessages = messages
      .filter((m) => m.type === undefined || m.type === 'text')
      .slice(-6)
      .map((m) => ({
        role: m.sender === 'user' ? 'user' : 'assistant',
        content: m.text,
      }))

    if (recentMessages.length === 0) return

    let cancelled = false
    setIsGenerating(true)

    const generate = async () => {
      try {
        // Dynamic import to avoid loading the module on non-iOS platforms
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const appleIntelligence = require('../../modules/apple-intelligence')

        if (!appleIntelligence.isAvailable()) {
          setIsGenerating(false)
          return
        }

        const messagesJson = JSON.stringify(recentMessages)
        const response = await appleIntelligence.generateResponse(
          SUGGESTION_SYSTEM_PROMPT,
          messagesJson,
        )

        if (cancelled) return

        // Parse the JSON array from the response
        const parsed = parseSuggestions(response)
        if (parsed.length > 0) {
          setSuggestions(
            parsed.map((text, i) => ({
              id: `suggestion-${lastMessage.id}-${i}`,
              text,
            })),
          )
        }
      } catch (err) {
        suggestionsLogger.logError('Failed to generate suggestions', err)
      } finally {
        if (!cancelled) {
          setIsGenerating(false)
        }
      }
    }

    generate()

    cleanupRef.current = () => {
      cancelled = true
    }

    return () => {
      cancelled = true
      cleanupRef.current = null
    }
  }, [isActive, isAgentResponding, messages])

  return { suggestions, isGenerating, dismiss }
}

/**
 * Attempts to extract a JSON string array from the model response.
 * Falls back to splitting by newlines if JSON parsing fails.
 */
function parseSuggestions(response: string): string[] {
  try {
    // Try to extract JSON array from the response
    const jsonMatch = response.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed)) {
        return parsed
          .filter((item): item is string => typeof item === 'string')
          .map((s) => s.trim())
          .filter((s) => s.length > 0)
          .slice(0, 3)
      }
    }
  } catch {
    // JSON parsing failed, try line-based fallback
  }

  // Fallback: split by newlines, strip numbering
  const lines = response
    .split('\n')
    .map((line) => line.replace(/^\d+[.)]\s*/, '').trim())
    .filter((line) => line.length > 0 && line.length < 100)
    .slice(0, 3)

  return lines
}
