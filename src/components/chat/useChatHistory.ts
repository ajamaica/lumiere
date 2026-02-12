import { useAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'

import { useActiveWebsite } from '../../hooks/useActiveWebsite'
import { useAutoLabel } from '../../hooks/useAutoLabel'
import { useChatProvider } from '../../hooks/useChatProvider'
import { useMessageQueue } from '../../hooks/useMessageQueue'
import { useWorkflowContext } from '../../hooks/useWorkflowContext'
import { ProviderConfig, readCachedHistory } from '../../services/providers'
import {
  clearMessagesAtom,
  currentSessionKeyAtom,
  pendingShareMediaAtom,
  pendingShareTextAtom,
  pendingTriggerMessageAtom,
  sessionContextAtom,
} from '../../store'
import { compressImageToJpeg } from '../../utils/compressImage'
import { logger } from '../../utils/logger'
import { Message, MessageAttachment } from './ChatMessage'

const chatHistoryLogger = logger.create('ChatHistory')

/** Convert raw history messages into UI Message objects */
function historyToMessages(
  msgs: { role: string; content: Array<{ type: string; text?: string }>; timestamp: number }[],
): Message[] {
  return msgs
    .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
    .map((msg, index) => {
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
  const [pendingShareMedia, setPendingShareMedia] = useAtom(pendingShareMediaAtom)
  const [sessionContextMap] = useAtom(sessionContextAtom)

  const hasCacheRef = useRef(false)
  const hasScrolledOnLoadRef = useRef(false)
  const shouldAutoScrollRef = useRef(true)

  const { tryGenerateLabel } = useAutoLabel(currentSessionKey)

  const { connected, connecting, error, health, capabilities, retry, sendMessage, getChatHistory } =
    useChatProvider(providerConfig)

  const { isActive: isWorkflowActive, prependContext } = useWorkflowContext()

  const activeWebsite = useActiveWebsite()

  const sessionSystemMessage = sessionContextMap[currentSessionKey]?.systemMessage

  // Combine the user-configured system message with the active website context
  const effectiveSystemMessage = useMemo(() => {
    const parts: string[] = []
    if (sessionSystemMessage) parts.push(sessionSystemMessage)
    if (activeWebsite) parts.push(`The user is currently browsing: ${activeWebsite}`)
    return parts.length > 0 ? parts.join('\n\n') : undefined
  }, [sessionSystemMessage, activeWebsite])

  const { handleSend, isAgentResponding, queueCount } = useMessageQueue({
    sendMessage,
    currentSessionKey,
    onMessageAdd: (message) => setMessages((prev) => [...prev, message]),
    onAgentMessageUpdate: (text) => setCurrentAgentMessage(text),
    onAgentMessageComplete: (message) => {
      setMessages((prev) => [...prev, message])
      setCurrentAgentMessage('')
    },
    onSendStart: () => {
      shouldAutoScrollRef.current = true
    },
    contextTransform: isWorkflowActive ? prependContext : undefined,
    systemMessage: effectiveSystemMessage,
  })

  // Auto-label: generate a session label after the first user–agent exchange
  useEffect(() => {
    if (messages.length === 2 && messages[0].sender === 'user' && messages[1].sender === 'agent') {
      tryGenerateLabel(messages[0].text)
    }
  }, [messages, tryGenerateLabel])

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

  // Pre-populate from local cache before the provider connects.
  useEffect(() => {
    let cancelled = false
    readCachedHistory(providerConfig.serverId, currentSessionKey, 100).then((cached) => {
      if (cancelled || cached.length === 0) return
      const cachedMessages = historyToMessages(cached)
      if (cachedMessages.length > 0) {
        hasCacheRef.current = true
        setMessages(cachedMessages)
        setIsLoadingHistory(false)
      }
    })
    return () => {
      cancelled = true
    }
  }, [providerConfig.serverId, currentSessionKey])

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
        const historyMessages = historyToMessages(historyResponse.messages)
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
  }, [getChatHistory, currentSessionKey])

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

  // Auto-send content shared from other apps via the share extension
  useEffect(() => {
    if (connected && !isLoadingHistory && pendingShareText !== null) {
      const timer = setTimeout(async () => {
        let attachments: MessageAttachment[] | undefined
        if (pendingShareMedia && pendingShareMedia.length > 0) {
          const converted: MessageAttachment[] = []
          for (const media of pendingShareMedia) {
            if (media.mimeType.startsWith('image/')) {
              try {
                const compressed = await compressImageToJpeg(media.uri)
                converted.push({
                  type: 'image',
                  uri: compressed.uri,
                  base64: compressed.base64,
                  mimeType: compressed.mimeType,
                  name: media.fileName,
                })
              } catch {
                // Fall back to uncompressed URI if compression fails
                converted.push({
                  type: 'image',
                  uri: media.uri,
                  mimeType: media.mimeType,
                  name: media.fileName,
                })
              }
            } else if (media.mimeType.startsWith('video/')) {
              converted.push({
                type: 'video',
                uri: media.uri,
                mimeType: media.mimeType,
                name: media.fileName,
              })
            } else {
              converted.push({
                type: 'file',
                uri: media.uri,
                mimeType: media.mimeType,
                name: media.fileName,
              })
            }
          }
          if (converted.length > 0) {
            attachments = converted
          }
          setPendingShareMedia(null)
        }
        const text = pendingShareText || ''
        if (text || attachments) {
          handleSendRef.current(text, attachments)
        }
        setPendingShareText(null)
      }, 150)
      return () => clearTimeout(timer)
    }
  }, [
    connected,
    isLoadingHistory,
    pendingShareText,
    setPendingShareText,
    pendingShareMedia,
    setPendingShareMedia,
  ])

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

    // Workflow
    isWorkflowActive,

    // Scroll tracking refs
    hasScrolledOnLoadRef,
    shouldAutoScrollRef,
  }
}
