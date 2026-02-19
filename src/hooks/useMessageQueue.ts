import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'

import { MessageAttachment } from '../components/chat/ChatMessage'
import type { Message } from '../components/chat/chatMessageTypes'
import { ChatProviderEvent, SendMessageParams as ProviderSendParams } from '../services/providers'
import {
  canvasActionQueueAtom,
  canvasContentAtom,
  canvasVisibleAtom,
  messageQueueAtom,
  showToolEventsInChatAtom,
} from '../store'
import { toProviderAttachments } from '../utils/attachments'
import { generateId } from '../utils/generateId'
import { logger } from '../utils/logger'

const queueLogger = logger.create('MessageQueue')

interface QueuedMessage {
  text: string
  attachments?: MessageAttachment[]
}

interface FailedMessage {
  text: string
  attachments?: MessageAttachment[]
  error: string
}

interface UseMessageQueueProps {
  sendMessage: (
    params: ProviderSendParams,
    onEvent: (event: ChatProviderEvent) => void,
  ) => Promise<void>
  currentSessionKey: string
  onMessageAdd: (message: Message) => void
  onAgentMessageUpdate: (text: string) => void
  onAgentMessageComplete: (message: Message) => void
  onSendStart?: () => void
  /** Optional async transform applied to the message text before sending to the provider.
   *  The original (untransformed) text is shown in the UI. */
  contextTransform?: (text: string) => Promise<string>
  /** Optional system message injected as hidden context with every provider call. */
  systemMessage?: string
}

export function useMessageQueue({
  sendMessage: providerSendMessage,
  currentSessionKey,
  onMessageAdd,
  onAgentMessageUpdate,
  onAgentMessageComplete,
  onSendStart,
  contextTransform,
  systemMessage,
}: UseMessageQueueProps) {
  const [messageQueue, setMessageQueue] = useAtom(messageQueueAtom)
  const [isAgentResponding, setIsAgentResponding] = useState(false)
  const [failedMessage, setFailedMessage] = useState<FailedMessage | null>(null)
  const showToolEvents = useAtomValue(showToolEventsInChatAtom)
  const setCanvasContent = useSetAtom(canvasContentAtom)
  const setCanvasVisible = useSetAtom(canvasVisibleAtom)
  const setCanvasActionQueue = useSetAtom(canvasActionQueueAtom)
  const showToolEventsRef = useRef(showToolEvents)
  useEffect(() => {
    showToolEventsRef.current = showToolEvents
  }, [showToolEvents])

  const sendMessage = useCallback(
    async (text: string, attachments?: MessageAttachment[]) => {
      const userMessage: Message = {
        id: generateId('msg'),
        text,
        sender: 'user',
        timestamp: new Date(),
        attachments,
      }

      onMessageAdd(userMessage)
      setIsAgentResponding(true)
      setFailedMessage(null)
      onAgentMessageUpdate('')
      onSendStart?.()

      let accumulatedText = ''

      // Convert MessageAttachments to the provider-agnostic format
      const providerAttachments = attachments?.length
        ? await toProviderAttachments(attachments)
        : undefined

      try {
        const messageForProvider = contextTransform ? await contextTransform(text) : text

        await providerSendMessage(
          {
            message: messageForProvider,
            sessionKey: currentSessionKey,
            attachments: providerAttachments,
            systemMessage: systemMessage || undefined,
          },
          (event: ChatProviderEvent) => {
            if (event.type === 'delta' && event.delta) {
              accumulatedText += event.delta
              onAgentMessageUpdate(accumulatedText)
            } else if (event.type === 'lifecycle' && event.phase === 'start') {
              if (showToolEventsRef.current) {
                onMessageAdd({
                  id: generateId('lc'),
                  type: 'lifecycle_event',
                  phase: 'start',
                  sender: 'agent',
                  timestamp: new Date(),
                  text: 'start',
                })
              }
            } else if (event.type === 'lifecycle' && event.phase === 'end') {
              const agentMessage: Message = {
                id: generateId('msg'),
                text: accumulatedText,
                sender: 'agent',
                timestamp: new Date(),
              }
              onAgentMessageComplete(agentMessage)
              setIsAgentResponding(false)
              accumulatedText = ''

              if (showToolEventsRef.current) {
                onMessageAdd({
                  id: generateId('lc'),
                  type: 'lifecycle_event',
                  phase: 'end',
                  sender: 'agent',
                  timestamp: new Date(),
                  text: 'end',
                })
              }
            } else if (event.type === 'tool_event') {
              const toolName = event.toolName || 'unknown'

              // Extract canvas content from canvas tool events
              if (toolName === 'canvas' && event.toolInput) {
                const action = (event.toolInput.action as string) || 'present'
                const actionId = event.toolCallId || generateId('canvas')

                switch (action) {
                  case 'present': {
                    const html = event.toolInput.html as string | undefined
                    const url = event.toolInput.url as string | undefined
                    if (html && typeof html === 'string') {
                      setCanvasContent({
                        html,
                        source: 'html',
                        title: (event.toolInput.title as string) || undefined,
                        updatedAt: Date.now(),
                      })
                    } else if (url && typeof url === 'string') {
                      setCanvasContent({
                        url,
                        source: 'url',
                        title: (event.toolInput.title as string) || undefined,
                        updatedAt: Date.now(),
                      })
                    }
                    if (event.toolStatus === 'completed') {
                      setCanvasVisible(true)
                    }
                    break
                  }
                  case 'navigate': {
                    const url = event.toolInput.url as string | undefined
                    if (url && typeof url === 'string') {
                      setCanvasActionQueue((prev) => [
                        ...prev,
                        { id: actionId, type: 'navigate', url, queuedAt: Date.now() },
                      ])
                      setCanvasVisible(true)
                    }
                    break
                  }
                  case 'eval': {
                    const script = event.toolInput.script as string | undefined
                    if (script && typeof script === 'string') {
                      setCanvasActionQueue((prev) => [
                        ...prev,
                        { id: actionId, type: 'eval', script, queuedAt: Date.now() },
                      ])
                      setCanvasVisible(true)
                    }
                    break
                  }
                  case 'snapshot': {
                    setCanvasActionQueue((prev) => [
                      ...prev,
                      { id: actionId, type: 'snapshot', queuedAt: Date.now() },
                    ])
                    break
                  }
                }
              }

              if (showToolEventsRef.current) {
                const toolCallId = event.toolCallId || generateId('tc')
                onMessageAdd({
                  id: generateId('tool'),
                  type: 'tool_event',
                  toolName,
                  toolCallId,
                  toolInput: event.toolInput,
                  status: event.toolStatus || 'running',
                  sender: 'agent',
                  timestamp: new Date(),
                  text: toolName,
                })
              }
            }
          },
        )
      } catch (err) {
        queueLogger.logError('Failed to send message', err)
        setIsAgentResponding(false)
        onAgentMessageUpdate('')
        // Store the failed message so the user can retry
        setFailedMessage({
          text,
          attachments,
          error: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    },
    [
      providerSendMessage,
      currentSessionKey,
      onMessageAdd,
      onAgentMessageUpdate,
      onAgentMessageComplete,
      onSendStart,
      contextTransform,
      systemMessage,
      setCanvasContent,
      setCanvasVisible,
      setCanvasActionQueue,
    ],
  )

  const retryFailedMessage = useCallback(() => {
    if (!failedMessage) return
    const { text, attachments } = failedMessage
    setFailedMessage(null)
    sendMessage(text, attachments)
  }, [failedMessage, sendMessage])

  const dismissFailedMessage = useCallback(() => {
    setFailedMessage(null)
  }, [])

  const handleSend = useCallback(
    async (text: string, attachments?: MessageAttachment[]) => {
      if (isAgentResponding) {
        // Add to queue if agent is currently responding
        setMessageQueue((prev) => [...prev, JSON.stringify({ text, attachments } as QueuedMessage)])
      } else {
        // Send immediately if agent is not responding
        await sendMessage(text, attachments)
      }
    },
    [isAgentResponding, sendMessage, setMessageQueue],
  )

  // Process message queue when agent finishes responding
  useEffect(() => {
    if (!isAgentResponding && messageQueue.length > 0) {
      const nextRaw = messageQueue[0]
      setMessageQueue((prev) => prev.slice(1))
      try {
        const queued: QueuedMessage = JSON.parse(nextRaw)
        // eslint-disable-next-line react-hooks/set-state-in-effect
        sendMessage(queued.text, queued.attachments)
      } catch {
        // Fallback for plain text queue items (backwards compat)
        sendMessage(nextRaw)
      }
    }
  }, [isAgentResponding, messageQueue, sendMessage, setMessageQueue])

  return {
    handleSend,
    isAgentResponding,
    queueCount: messageQueue.length,
    failedMessage,
    retryFailedMessage,
    dismissFailedMessage,
  }
}
