import { useAtom } from 'jotai'
import { useCallback, useEffect, useState } from 'react'

import { AgentEvent } from '../services/molt'
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
      idempotencyKey: string
      agentId: string
      sessionKey: string
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
  const [isAgentResponding, setIsAgentResponding] = useState(false)

  const sendMessage = useCallback(
    async (text: string) => {
      const userMessage: Message = {
        id: `msg-${Date.now()}`,
        text,
        sender: 'user',
        timestamp: new Date(),
      }

      onMessageAdd(userMessage)
      setIsAgentResponding(true)
      onAgentMessageUpdate('')
      onSendStart?.()

      let accumulatedText = ''

      try {
        await sendAgentRequest(
          {
            message: text,
            idempotencyKey: `msg-${Date.now()}-${Math.random()}`,
            agentId,
            sessionKey: currentSessionKey,
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
    [sendAgentRequest, currentSessionKey, agentId, onMessageAdd, onAgentMessageUpdate, onAgentMessageComplete, onSendStart],
  )

  const handleSend = useCallback(
    async (text: string) => {
      if (isAgentResponding) {
        // Add to queue if agent is currently responding
        setMessageQueue((prev) => [...prev, text])
      } else {
        // Send immediately if agent is not responding
        await sendMessage(text)
      }
    },
    [isAgentResponding, sendMessage, setMessageQueue],
  )

  // Process message queue when agent finishes responding
  useEffect(() => {
    if (!isAgentResponding && messageQueue.length > 0) {
      const nextMessage = messageQueue[0]
      setMessageQueue((prev) => prev.slice(1))
      sendMessage(nextMessage)
    }
  }, [isAgentResponding, messageQueue, sendMessage, setMessageQueue])

  return {
    handleSend,
    isAgentResponding,
    queueCount: messageQueue.length,
  }
}
