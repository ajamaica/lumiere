import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { agentConfig } from '../../config/gateway.config'
import { AgentEvent, useMoltGateway } from '../../services/molt'
import { currentSessionKeyAtom } from '../../store'
import { useTheme } from '../../theme'
import { ChatInput } from './ChatInput'
import { ChatMessage, Message } from './ChatMessage'

interface ChatScreenProps {
  gatewayUrl: string
  gatewayToken: string
}

export function ChatScreen({ gatewayUrl, gatewayToken }: ChatScreenProps) {
  const { theme, themeMode, setThemeMode } = useTheme()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [currentAgentMessage, setCurrentAgentMessage] = useState<string>('')
  const [isAgentResponding, setIsAgentResponding] = useState(false)
  const [currentSessionKey, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const flatListRef = useRef<FlatList>(null)

  const styles = useMemo(() => createStyles(theme), [theme])

  const {
    connected,
    connecting,
    error,
    connect,
    disconnect,
    sendAgentRequest,
    getChatHistory,
    resetSession,
  } = useMoltGateway({
    url: gatewayUrl,
    token: gatewayToken,
  })

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory(currentSessionKey, 100)
      console.log('Chat history:', history)

      if (history && Array.isArray((history as any).messages)) {
        const historyMessages = (history as any).messages
          .filter((msg: any) => msg.role === 'user' || msg.role === 'assistant')
          .map((msg: any, index: number) => {
            const textContent = msg.content.find((c: any) => c.type === 'text')
            const text = textContent?.text || ''

            // Skip empty messages
            if (!text) return null

            return {
              id: `history-${msg.timestamp}-${index}`,
              text,
              sender: msg.role === 'user' ? 'user' : 'agent',
              timestamp: new Date(msg.timestamp),
            } as Message
          })
          .filter((msg: Message | null) => msg !== null)

        setMessages(historyMessages)
        console.log(`Loaded ${historyMessages.length} messages from history`)
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
    }
  }

  useEffect(() => {
    connect()
    return () => {
      disconnect()
    }
  }, [])

  useEffect(() => {
    if (connected) {
      // Small delay to ensure WebSocket is fully ready
      setTimeout(() => {
        loadChatHistory()
      }, 500)
    }
  }, [connected, loadChatHistory])

  const handleSend = async (text: string) => {
    const userMessage: Message = {
      id: `msg-${Date.now()}`,
      text,
      sender: 'user',
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setIsAgentResponding(true)
    setCurrentAgentMessage('')

    let accumulatedText = ''

    try {
      await sendAgentRequest(
        {
          message: text,
          idempotencyKey: `msg-${Date.now()}-${Math.random()}`,
          agentId: agentConfig.defaultAgentId,
          sessionKey: currentSessionKey,
        },
        (event: AgentEvent) => {
          console.log('Agent event:', event)

          if (event.stream === 'assistant' && event.data.delta) {
            accumulatedText += event.data.delta
            setCurrentAgentMessage(accumulatedText)
          } else if (event.stream === 'lifecycle' && event.data.phase === 'end') {
            const agentMessage: Message = {
              id: `msg-${Date.now()}`,
              text: accumulatedText,
              sender: 'agent',
              timestamp: new Date(),
            }
            setMessages((prev) => [...prev, agentMessage])
            setCurrentAgentMessage('')
            setIsAgentResponding(false)
            accumulatedText = ''
          }
        },
      )
    } catch (err) {
      console.error('Failed to send message:', err)
      setIsAgentResponding(false)
      setCurrentAgentMessage('')
    }
  }

  const handleResetSession = async () => {
    try {
      // Reset the current session on the server (clears history but keeps session key)
      await resetSession(currentSessionKey)
      console.log('Session reset successfully')

      // Clear local state
      setMessages([])
      setCurrentAgentMessage('')
      setIsAgentResponding(false)
    } catch (err) {
      console.error('Failed to reset session:', err)
      // Still clear local state even if server reset fails
      setMessages([])
      setCurrentAgentMessage('')
      setIsAgentResponding(false)
    }
  }

  const handleNewSession = () => {
    // Create a new session with a new session key
    const newSessionKey = `agent:main:${Date.now()}`
    setCurrentSessionKey(newSessionKey)
    console.log('Created new session:', newSessionKey)

    // Clear local state
    setMessages([])
    setCurrentAgentMessage('')
    setIsAgentResponding(false)
  }

  const handleOpenSessionMenu = () => {
    router.push('/sessions')
  }

  const handleThemeToggle = () => {
    const modes = ['light', 'dark', 'system'] as const
    const currentIndex = modes.indexOf(themeMode)
    const nextIndex = (currentIndex + 1) % modes.length
    setThemeMode(modes[nextIndex])
  }

  const getThemeIcon = () => {
    switch (themeMode) {
      case 'light':
        return 'sunny'
      case 'dark':
        return 'moon'
      case 'system':
        return 'phone-portrait'
      default:
        return 'sunny'
    }
  }

  const renderConnectionStatus = () => {
    if (connecting) {
      return (
        <View style={styles.statusBar}>
          <View style={styles.statusContent}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.statusText}>Connecting...</Text>
          </View>
          <TouchableOpacity onPress={handleThemeToggle} style={styles.themeButton}>
            <Ionicons name={getThemeIcon()} size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )
    }

    if (error) {
      return (
        <View style={[styles.statusBar, styles.errorBar]}>
          <View style={styles.statusContent}>
            <Text style={styles.errorText}>Connection failed: {error}</Text>
            <TouchableOpacity onPress={connect} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleThemeToggle} style={styles.themeButton}>
            <Ionicons name={getThemeIcon()} size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )
    }

    if (connected) {
      return (
        <View style={[styles.statusBar, styles.connectedBar]}>
          <View style={styles.statusContent}>
            <View style={styles.connectedDot} />
            <Text style={styles.connectedText}>Connected</Text>
          </View>
          <TouchableOpacity onPress={handleThemeToggle} style={styles.themeButton}>
            <Ionicons name={getThemeIcon()} size={20} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )
    }

    return null
  }

  const allMessages = [
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

  return (
    <SafeAreaView style={styles.container}>
      {renderConnectionStatus()}
      <FlatList
        ref={flatListRef}
        data={allMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatMessage message={item} />}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Start a conversation with the AI agent</Text>
          </View>
        }
      />
      <ChatInput
        onSend={handleSend}
        onOpenSessionMenu={handleOpenSessionMenu}
        disabled={!connected || isAgentResponding}
      />
    </SafeAreaView>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    statusBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: theme.colors.surface,
    },
    statusContent: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    themeButton: {
      padding: theme.spacing.xs,
      marginLeft: theme.spacing.md,
    },
    connectedBar: {
      backgroundColor: 'transparent',
    },
    errorBar: {
      backgroundColor: theme.isDark ? '#3A1B1B' : '#FFEBEE',
    },
    statusText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      marginLeft: theme.spacing.sm,
    },
    connectedText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.status.success,
      marginLeft: theme.spacing.sm,
    },
    connectedDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
      backgroundColor: theme.colors.status.success,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.status.error,
      flex: 1,
    },
    retryButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs + 2,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.sm,
    },
    retryText: {
      color: theme.colors.text.inverse,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    messageList: {
      paddingVertical: theme.spacing.sm,
    },
    emptyContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
  })
