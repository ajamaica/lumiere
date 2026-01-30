import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Animated,
  FlatList,
  Keyboard,
  SafeAreaView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { agentConfig } from '../../config/gateway.config'
import { useMoltGateway } from '../../services/molt'
import { useMessageQueue } from '../../hooks/useMessageQueue'
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
  const [currentSessionKey, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const flatListRef = useRef<FlatList>(null)
  const shouldAutoScrollRef = useRef(true)
  const hasScrolledOnLoadRef = useRef(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const pulseAnim = useRef(new Animated.Value(1)).current

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

  const { handleSend, isAgentResponding, queueCount } = useMessageQueue({
    sendAgentRequest,
    currentSessionKey,
    agentId: agentConfig.defaultAgentId,
    onMessageAdd: (message) => setMessages((prev) => [...prev, message]),
    onAgentMessageUpdate: (text) => setCurrentAgentMessage(text),
    onAgentMessageComplete: (message) => {
      setMessages((prev) => [...prev, message])
      setCurrentAgentMessage('')
    },
    onSendStart: () => {
      shouldAutoScrollRef.current = true
    },
  })

  // Load chat history on mount
  const loadChatHistory = useCallback(async () => {
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
  }, [getChatHistory, currentSessionKey])

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

  // Scroll to bottom on initial load when messages are first populated
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledOnLoadRef.current) {
      hasScrolledOnLoadRef.current = true
      // Use a longer timeout to ensure FlatList has rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false })
      }, 300)
    }
  }, [messages.length])

  // Scroll to bottom when keyboard opens
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    })

    return () => {
      keyboardDidShowListener.remove()
    }
  }, [])

  // Pulse animation for status dot when agent is responding
  useEffect(() => {
    if (isAgentResponding) {
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      )
      pulse.start()
      return () => pulse.stop()
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [isAgentResponding, pulseAnim])

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

  const handleOpenSettings = () => {
    router.push('/settings')
  }

  const renderConnectionStatus = () => {
    if (connecting) {
      return (
        <View style={styles.statusBarContainer}>
          <View style={styles.statusBubble}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.statusText}>Connecting...</Text>
          </View>
          <TouchableOpacity onPress={handleOpenSettings} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )
    }

    if (error) {
      return (
        <View style={styles.statusBarContainer}>
          <View style={[styles.statusBubble, styles.errorBubble]}>
            <Text style={styles.errorText}>Connection failed: {error}</Text>
            <TouchableOpacity onPress={connect} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity onPress={handleOpenSettings} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.text.secondary} />
          </TouchableOpacity>
        </View>
      )
    }

    if (connected) {
      return (
        <View style={styles.statusBarContainer}>
          <View style={styles.statusBubble}>
            <Animated.View style={[styles.connectedDot, { opacity: pulseAnim }]} />
            <Text style={styles.connectedText}>Health</Text>
            <Text style={styles.statusOk}>OK</Text>
          </View>
          <TouchableOpacity onPress={handleOpenSettings} style={styles.settingsButton}>
            <Ionicons name="settings-outline" size={24} color={theme.colors.text.secondary} />
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
      <FlatList
        ref={flatListRef}
        data={allMessages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <ChatMessage message={item} />}
        contentContainerStyle={styles.messageList}
        style={{ flex: 1 }}
        keyboardDismissMode="interactive"
        onContentSizeChange={() => {
          if (shouldAutoScrollRef.current) {
            flatListRef.current?.scrollToEnd({ animated: true })
          }
        }}
        onScroll={(event) => {
          const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
          const threshold = layoutMeasurement.height * 0.3 // 30% of screen height
          const isNearBottom = contentOffset.y + layoutMeasurement.height >= contentSize.height - threshold
          shouldAutoScrollRef.current = isNearBottom
          setShowScrollButton(!isNearBottom)
        }}
        scrollEventThrottle={16}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>Start a conversation with the AI agent</Text>
          </View>
        }
      />
      <TouchableOpacity
        style={[styles.scrollToBottomButton, { opacity: showScrollButton ? 1 : 0 }]}
        onPress={() => {
          flatListRef.current?.scrollToEnd({ animated: true })
          setShowScrollButton(false)
        }}
        pointerEvents={showScrollButton ? 'auto' : 'none'}
      >
        <Ionicons name="chevron-down" size={24} color={theme.colors.text.inverse} />
      </TouchableOpacity>
      <ChatInput
        onSend={handleSend}
        onOpenSessionMenu={handleOpenSessionMenu}
        disabled={!connected}
        queueCount={queueCount}
      />
      {renderConnectionStatus()}
    </SafeAreaView>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    statusBarContainer: {
      position: 'absolute',
      top: 50,
      left: 0,
      right: 0,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      backgroundColor: 'transparent',
      zIndex: 1000,
    },
    statusBubble: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: theme.colors.surface,
      paddingHorizontal: theme.spacing.md + 2,
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.borderRadius.xxl,
      alignSelf: 'flex-start',
      marginRight: theme.spacing.md,
    },
    settingsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
    },
    errorBubble: {
      backgroundColor: theme.isDark ? '#3A1B1B' : '#FFEBEE',
    },
    statusText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      marginLeft: theme.spacing.sm,
    },
    connectedText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing.sm,
    },
    statusOk: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing.xs,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    connectedDot: {
      width: 10,
      height: 10,
      borderRadius: 5,
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
      marginLeft: theme.spacing.sm,
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
    scrollToBottomButton: {
      position: 'absolute',
      bottom: 100,
      left: '50%',
      marginLeft: -24,
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.primary,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.25,
      shadowRadius: 3.84,
      elevation: 5,
      zIndex: 1000,
    },
  })
