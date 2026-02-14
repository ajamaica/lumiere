import { useAtom, useAtomValue } from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'

import { MessageAttachment } from '../components/chat/ChatMessage'
import type { Message } from '../components/chat/chatMessageTypes'
import { ChatProviderEvent, SendMessageParams as ProviderSendParams } from '../services/providers'
import type { ReceivedFileAttachment } from '../services/providers/types'
import { messageQueueAtom, showToolEventsInChatAtom } from '../store'
import { toProviderAttachments } from '../utils/attachments'
import { isImageMimeType, saveReceivedFile } from '../utils/fileTransfer'
import { generateId } from '../utils/generateId'
import { logger } from '../utils/logger'

const queueLogger = logger.create('MessageQueue')

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
  const showToolEvents = useAtomValue(showToolEventsInChatAtom)
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
      onAgentMessageUpdate('')
      onSendStart?.()

      let accumulatedText = ''
      const receivedFiles: ReceivedFileAttachment[] = []

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
            } else if (event.type === 'file_attachment' && event.fileAttachments) {
              receivedFiles.push(...event.fileAttachments)
            } else if (event.type === 'lifecycle' && event.phase === 'end') {
              // Save received files then build the final agent message
              const finalize = async () => {
                try {
                  let agentAttachments: MessageAttachment[] | undefined
                  if (receivedFiles.length > 0) {
                    const saved: MessageAttachment[] = []
                    for (const file of receivedFiles) {
                      try {
                        const uri = saveReceivedFile(file)
                        saved.push({
                          type: isImageMimeType(file.mimeType)
                            ? ('image' as const)
                            : ('file' as const),
                          uri,
                          mimeType: file.mimeType,
                          name: file.fileName,
                        })
                      } catch (err) {
                        queueLogger.logError(`Failed to save file: ${file.fileName}`, err)
                      }
                    }
                    if (saved.length > 0) {
                      agentAttachments = saved
                    }
                  }

                  const agentMessage: Message = {
                    id: generateId('msg'),
                    text: accumulatedText,
                    sender: 'agent',
                    timestamp: new Date(),
                    attachments: agentAttachments,
                  }
                  onAgentMessageComplete(agentMessage)
                } catch (err) {
                  queueLogger.logError('Failed to finalize agent message', err)
                } finally {
                  setIsAgentResponding(false)
                  accumulatedText = ''
                  receivedFiles.length = 0
                }
              }
              finalize()
            } else if (event.type === 'tool_event' && event.toolName && showToolEventsRef.current) {
              onMessageAdd({
                id: generateId('tool'),
                type: 'tool_event',
                toolName: event.toolName,
                toolCallId: event.toolCallId || '',
                toolInput: event.toolInput,
                status: event.toolStatus || 'running',
                sender: 'agent',
                timestamp: new Date(),
                text: event.toolName,
              })
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
      contextTransform,
      systemMessage,
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
