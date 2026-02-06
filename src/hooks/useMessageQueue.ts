import * as FileSystem from 'expo-file-system'
import { useAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'

import { MessageAttachment } from '../components/chat/ChatMessage'
import {
  ChatProviderEvent,
  ProviderAttachment,
  SendMessageParams as ProviderSendParams,
} from '../services/providers'
import { messageQueueAtom } from '../store'
import { generateId } from '../utils/generateId'
import { logger } from '../utils/logger'

const queueLogger = logger.create('MessageQueue')

interface Message {
  id: string
  text: string
  sender: 'user' | 'agent'
  timestamp: Date
  attachments?: MessageAttachment[]
}

interface QueuedMessage {
  text: string
  attachments?: MessageAttachment[]
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
}

export function useMessageQueue({
  sendMessage: providerSendMessage,
  currentSessionKey,
  onMessageAdd,
  onAgentMessageUpdate,
  onAgentMessageComplete,
  onSendStart,
}: UseMessageQueueProps) {
  const [messageQueue, setMessageQueue] = useAtom(messageQueueAtom)
  const [isAgentResponding, setIsAgentResponding] = useState(false)

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
      onAgentMessageUpdate('')
      onSendStart?.()

      let accumulatedText = ''

      // Convert MessageAttachments to provider attachments
      // Include image attachments (base64) and file/document attachments (read from URI)
      let providerAttachments: ProviderAttachment[] | undefined
      if (attachments?.length) {
        const converted: ProviderAttachment[] = []
        for (const a of attachments) {
          if (a.type === 'image' && a.base64) {
            converted.push({
              type: 'image' as const,
              data: a.base64,
              mimeType: a.mimeType,
            })
          } else if (a.type === 'file' && a.uri) {
            try {
              const base64 = await FileSystem.readAsStringAsync(a.uri, {
                encoding: FileSystem.EncodingType.Base64,
              })
              converted.push({
                type: 'document' as const,
                data: base64,
                mimeType: a.mimeType || 'application/octet-stream',
                name: a.name,
              })
            } catch (err) {
              queueLogger.logError('Failed to read file as base64', err)
            }
          }
        }
        if (converted.length > 0) {
          providerAttachments = converted
        }
      }

      try {
        await providerSendMessage(
          {
            message: text,
            sessionKey: currentSessionKey,
            attachments: providerAttachments,
          },
          (event: ChatProviderEvent) => {
            if (event.type === 'delta' && event.delta) {
              accumulatedText += event.delta
              onAgentMessageUpdate(accumulatedText)
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
            }
          },
        )
      } catch (err) {
        queueLogger.logError('Failed to send message', err)
        setIsAgentResponding(false)
        onAgentMessageUpdate('')
      }
    },
    [
      providerSendMessage,
      currentSessionKey,
      onMessageAdd,
      onAgentMessageUpdate,
      onAgentMessageComplete,
      onSendStart,
    ],
  )

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
  }
}
