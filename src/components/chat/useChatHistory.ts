import { useAtom, useAtomValue } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useActiveWebsite } from '../../hooks/useActiveWebsite'
import { useChatProvider } from '../../hooks/useChatProvider'
import { useMessageQueue } from '../../hooks/useMessageQueue'
import { ProviderConfig, readCachedHistory } from '../../services/providers'
import {
  clearMessagesAtom,
  currentSessionKeyAtom,
  pendingShareMediaAtom,
  pendingShareTextAtom,
  pendingTriggerMessageAtom,
  sessionContextAtom,
  showToolEventsInChatAtom,
} from '../../store'
import { logger } from '../../utils/logger'
import { resolveSystemMessageVariables } from '../../utils/systemMessageVariables'
import { Message } from './ChatMessage'

const chatHistoryLogger = logger.create('ChatHistory')

/** Raw history entry from the gateway — extends the base shape with tool result fields. */
interface RawHistoryMessage {
  role: string
  content: Array<{ type: string; text?: string }>
  timestamp: number
  toolName?: string
  toolCallId?: string
  isError?: boolean
  details?: Record<string, unknown>
}

/** Convert raw history messages into UI Message objects */
function historyToMessages(msgs: RawHistoryMessage[], showToolEvents: boolean): Message[] {
  return msgs
    .filter(
      (msg) =>
        msg.role === 'user' ||
        msg.role === 'assistant' ||
        (msg.role === 'toolResult' && showToolEvents),
    )
    .map((msg, index) => {
      if (msg.role === 'toolResult') {
        return {
          id: `history-tool-${msg.timestamp}-${index}`,
          type: 'tool_event' as const,
          toolName: msg.toolName || 'unknown',
          toolCallId: msg.toolCallId || `history-tc-${index}`,
          toolInput: msg.details,
          status: msg.isError ? 'error' : ('completed' as const),
          sender: 'agent' as const,
          timestamp: new Date(msg.timestamp),
          text: msg.toolName || 'unknown',
        }
      }

      const textContent = msg.content.find((c) => c.type === 'text')
      const text = textContent?.text || ''
      if (!text) return null
      return {
        id: `history-${msg.timestamp}-${index}`,
        text,
        sender: msg.role === 'user' ? 'user' : 'agent',
        timestamp: new Date(msg.timestamp),
      } as Message
    })
    .filter((msg): msg is Message => msg !== null)
}

interface UseChatHistoryOptions {
  providerConfig: ProviderConfig
}

export function useChatHistory({ providerConfig }: UseChatHistoryOptions) {
  const [messages, setMessages] = useState<Message[]>([])
  const [currentAgentMessage, setCurrentAgentMessage] = useState<string>('')
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [historyReady, setHistoryReady] = useState(false)
  const [currentSessionKey] = useAtom(currentSessionKeyAtom)
  const [clearMessagesTrigger] = useAtom(clearMessagesAtom)
  const [pendingTriggerMessage, setPendingTriggerMessage] = useAtom(pendingTriggerMessageAtom)
  const [pendingShareText, setPendingShareText] = useAtom(pendingShareTextAtom)
  const [pendingShareMedia] = useAtom(pendingShareMediaAtom)
  const [sessionContextMap] = useAtom(sessionContextAtom)
  const showToolEvents = useAtomValue(showToolEventsInChatAtom)

  const hasCacheRef = useRef(false)
  const hasScrolledOnLoadRef = useRef(false)
  const shouldAutoScrollRef = useRef(true)
  const loadChatHistoryRef = useRef<() => Promise<void>>(() => Promise.resolve())

  const {
    connected,
    connecting,
    awaitingApproval,
    error,
    health,
    capabilities,
    retry,
    sendMessage,
    getChatHistory,
  } = useChatProvider(providerConfig)

  const activeWebsite = useActiveWebsite()

  const sessionSystemMessage = sessionContextMap[currentSessionKey]?.systemMessage

  // Combine the user-configured system message with the active website context,
  // then resolve any {{variable}} placeholders to their current runtime values.
  const effectiveSystemMessage = useMemo(() => {
    const parts: string[] = []
    if (sessionSystemMessage) parts.push(sessionSystemMessage)
    if (activeWebsite) parts.push(`The user is currently browsing: ${activeWebsite}`)
    if (parts.length === 0) return undefined
    return resolveSystemMessageVariables(parts.join('\n\n'))
  }, [sessionSystemMessage, activeWebsite])

  const { handleSend, isAgentResponding, queueCount } = useMessageQueue({
    sendMessage,
    currentSessionKey,
    onMessageAdd: (message) =>
      setMessages((prev) => {
        if (message.type === 'tool_event' && message.toolCallId) {
          const idx = prev.findIndex(
            (m) => m.type === 'tool_event' && m.toolCallId === message.toolCallId,
          )
          if (idx >= 0) {
            const updated = [...prev]
            updated[idx] = message
            return updated
          }
        }
        return [...prev, message]
      }),
    onAgentMessageUpdate: (text) => setCurrentAgentMessage(text),
    onAgentMessageComplete: (message) => {
      setMessages((prev) => [...prev, message])
      setCurrentAgentMessage('')
      // Reload history after the agent finishes so that tool events
      // (which the server only exposes via chat.history, not as real-time
      // WebSocket events) are picked up and displayed inline.
      if (showToolEvents) {
        loadChatHistoryRef.current()
      }
    },
    onSendStart: () => {
      shouldAutoScrollRef.current = true
    },
    systemMessage: effectiveSystemMessage,
  })

  // Detect server switches and clear stale messages
  const prevServerIdRef = useRef(providerConfig.serverId)
  useEffect(() => {
    if (prevServerIdRef.current !== providerConfig.serverId) {
      prevServerIdRef.current = providerConfig.serverId
      hasCacheRef.current = false
      hasScrolledOnLoadRef.current = false
      shouldAutoScrollRef.current = true
      setMessages([])
      setCurrentAgentMessage('')
      setIsLoadingHistory(true)
    }
  }, [providerConfig.serverId])

  // Detect session switches and clear stale messages so old messages
  // from the previous session don't flash before the new history loads.
  const prevSessionKeyRef = useRef(currentSessionKey)
  useEffect(() => {
    if (prevSessionKeyRef.current !== currentSessionKey) {
      prevSessionKeyRef.current = currentSessionKey
      hasCacheRef.current = false
      hasScrolledOnLoadRef.current = false
      shouldAutoScrollRef.current = true
      setMessages([])
      setCurrentAgentMessage('')
      setIsLoadingHistory(true)
      setHistoryReady(false)
    }
  }, [currentSessionKey])

  // Pre-populate from local cache before the provider connects.
  useEffect(() => {
    let cancelled = false
    readCachedHistory(providerConfig.serverId, currentSessionKey, 100).then((cached) => {
      if (cancelled || cached.length === 0) return
      const cachedMessages = historyToMessages(cached as RawHistoryMessage[], showToolEvents)
      if (cachedMessages.length > 0) {
        hasCacheRef.current = true
        setMessages(cachedMessages)
        setIsLoadingHistory(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [providerConfig.serverId, currentSessionKey, showToolEvents])

  // Load chat history on mount or server switch.
  const loadChatHistory = useCallback(async () => {
    const hadCache = hasCacheRef.current

    if (!hadCache) {
      hasScrolledOnLoadRef.current = false
      setIsLoadingHistory(true)
    }

    try {
      const historyResponse = await getChatHistory(currentSessionKey, 100)
      chatHistoryLogger.info('Chat history loaded', historyResponse)

      if (historyResponse?.messages && Array.isArray(historyResponse.messages)) {
        const historyMessages = historyToMessages(
          historyResponse.messages as RawHistoryMessage[],
          showToolEvents,
        )
        setMessages(historyMessages)
        chatHistoryLogger.info(`Loaded ${historyMessages.length} messages from history`)
      } else {
        setMessages([])
      }
    } catch (err) {
      chatHistoryLogger.logError('Failed to load chat history', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [getChatHistory, currentSessionKey, showToolEvents])

  useEffect(() => {
    loadChatHistoryRef.current = loadChatHistory
  }, [loadChatHistory])

  useEffect(() => {
    if (connected) {
      loadChatHistory()
    }
  }, [connected, loadChatHistory])

  // Clear messages when reset session is triggered
  useEffect(() => {
    if (clearMessagesTrigger > 0 && connected) {
      hasCacheRef.current = false
      setMessages([])
      setCurrentAgentMessage('')
      hasScrolledOnLoadRef.current = false
      loadChatHistory()
    }
  }, [clearMessagesTrigger, connected, loadChatHistory])

  // Keep a ref to handleSend so the trigger timer isn't reset every time
  const handleSendRef = useRef(handleSend)
  useEffect(() => {
    handleSendRef.current = handleSend
  }, [handleSend])

  // Auto-send pending trigger message once connected and history has loaded
  useEffect(() => {
    if (connected && !isLoadingHistory && pendingTriggerMessage) {
      const timer = setTimeout(() => {
        handleSendRef.current(pendingTriggerMessage)
        setPendingTriggerMessage(null)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [connected, isLoadingHistory, pendingTriggerMessage, setPendingTriggerMessage])

  // Auto-send text-only content shared from other apps via the share extension.
  // When media files are present, ChatInput stages them as attachments so the
  // user can add a message before sending.
  useEffect(() => {
    if (
      connected &&
      !isLoadingHistory &&
      pendingShareText !== null &&
      (!pendingShareMedia || pendingShareMedia.length === 0)
    ) {
      const timer = setTimeout(() => {
        const text = pendingShareText || ''
        if (text) {
          handleSendRef.current(text)
        }
        setPendingShareText(null)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [connected, isLoadingHistory, pendingShareText, setPendingShareText, pendingShareMedia])

  // Reveal list immediately when there are no history messages
  useEffect(() => {
    if (!isLoadingHistory && messages.length === 0) {
      setHistoryReady(true)
    }
  }, [isLoadingHistory, messages.length])

  // Build the full message list including the streaming agent message
  const allMessages: Message[] = [
    ...messages,
    ...(currentAgentMessage
      ? [
          {
            id: 'streaming',
            text: currentAgentMessage,
            sender: 'agent' as const,
            timestamp: new Date(),
            streaming: true,
          },
        ]
      : []),
  ]

  return {
    // Connection state (pass-through from useChatProvider)
    connected,
    connecting,
    awaitingApproval,
    error,
    health,
    capabilities,
    retry,

    // Message state
    messages,
    allMessages,
    isLoadingHistory,
    historyReady,
    setHistoryReady,

    // Messaging
    handleSend,
    isAgentResponding,
    queueCount,

    // Scroll tracking refs
    hasScrolledOnLoadRef,
    shouldAutoScrollRef,
  }
}
