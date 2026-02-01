import { useAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'

import { AgentEvent, Attachment, ContentBlock } from '../services/molt'
import { messageQueueAtom } from '../store'

interface Message {
  id: string
  text: string
  sender: 'user' | 'agent'
  timestamp: Date
}

interface UseMessageQueueProps {
  sendAgentRequest: (
    params: {
      message: string
      content?: ContentBlock[]
      idempotencyKey: string
      agentId: string
      sessionKey: string
      attachments?: Attachment[]
    },
    onEvent: (event: AgentEvent) => void,
  ) => Promise<void>
  currentSessionKey: string
  agentId: string
  onMessageAdd: (message: Message) => void
  onAgentMessageUpdate: (text: string) => void
  onAgentMessageComplete: (message: Message) => void
  onSendStart?: () => void
}

export function useMessageQueue({
  sendAgentRequest,
  currentSessionKey,
  agentId,
  onMessageAdd,
  onAgentMessageUpdate,
  onAgentMessageComplete,
  onSendStart,
}: UseMessageQueueProps) {
  const [messageQueue, setMessageQueue] = useAtom(messageQueueAtom)
  const [attachmentQueue, setAttachmentQueue] = useState<
    { attachments?: Attachment[]; content?: ContentBlock[] }[]
  >([])
  const [isAgentResponding, setIsAgentResponding] = useState(false)

  const sendMessage = useCallback(
    async (
      text: string,
      opts?: { attachments?: Attachment[]; content?: ContentBlock[]; skipUserMessage?: boolean },
    ) => {
      if (!opts?.skipUserMessage) {
        const userMessage: Message = {
          id: `msg-${Date.now()}`,
          text,
          sender: 'user',
          timestamp: new Date(),
        }
        onMessageAdd(userMessage)
      }

      setIsAgentResponding(true)
      onAgentMessageUpdate('')
      onSendStart?.()

      let accumulatedText = ''

      try {
        await sendAgentRequest(
          {
            message: text,
            content: opts?.content,
            idempotencyKey: `msg-${Date.now()}-${Math.random()}`,
            agentId,
            sessionKey: currentSessionKey,
            attachments: opts?.attachments,
          },
          (event: AgentEvent) => {
            if (event.stream === 'assistant' && event.data.delta) {
              accumulatedText += event.data.delta
              onAgentMessageUpdate(accumulatedText)
            } else if (event.stream === 'lifecycle' && event.data.phase === 'end') {
              const agentMessage: Message = {
                id: `msg-${Date.now()}`,
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
        console.error('Failed to send message:', err)
        setIsAgentResponding(false)
        onAgentMessageUpdate('')
      }
    },
    [
      sendAgentRequest,
      currentSessionKey,
      agentId,
      onMessageAdd,
      onAgentMessageUpdate,
      onAgentMessageComplete,
      onSendStart,
    ],
  )

  const handleSend = useCallback(
    async (
      text: string,
      opts?: { attachments?: Attachment[]; content?: ContentBlock[]; skipUserMessage?: boolean },
    ) => {
      if (isAgentResponding) {
        // Add to queue if agent is currently responding
        setMessageQueue((prev) => [...prev, text])
        setAttachmentQueue((prev) => [
          ...prev,
          { attachments: opts?.attachments, content: opts?.content },
        ])
      } else {
        // Send immediately if agent is not responding
        await sendMessage(text, opts)
      }
    },
    [isAgentResponding, sendMessage, setMessageQueue],
  )

  // Process message queue when agent finishes responding
  useEffect(() => {
    if (!isAgentResponding && messageQueue.length > 0) {
      const nextMessage = messageQueue[0]
      const nextOpts = attachmentQueue[0]
      setMessageQueue((prev) => prev.slice(1))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAttachmentQueue((prev) => prev.slice(1))
      sendMessage(nextMessage, nextOpts)
    }
  }, [isAgentResponding, messageQueue, attachmentQueue, sendMessage, setMessageQueue])

  return {
    handleSend,
    isAgentResponding,
    queueCount: messageQueue.length,
  }
}
