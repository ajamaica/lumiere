import { Ionicons } from '@expo/vector-icons'
import { FlashList } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ActivityIndicator, Keyboard, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { agentConfig } from '../../config/gateway.config'
import { useMessageQueue } from '../../hooks/useMessageQueue'
import { Attachment, useMoltGateway } from '../../services/molt'
import { clearMessagesAtom, currentSessionKeyAtom } from '../../store'
import { useTheme } from '../../theme'
import { ChatInput } from './ChatInput'
import { ChatMessage, Message, MessageAttachment } from './ChatMessage'

interface ChatScreenProps {
  gatewayUrl: string
  gatewayToken: string
}

/**
 * ChatScreen Component
 *
 * SESSION KEY ARCHITECTURE:
 *
 * Session keys are stored per-server in the serverSessionsAtom.
 * The currentSessionKeyAtom is a derived atom that looks up the session
 * key for the current server, returning a default value ('agent:main:main')
 * if none exists. This ensures a valid session key is always available.
 */
export function ChatScreen({ gatewayUrl, gatewayToken }: ChatScreenProps) {
  const { theme } = useTheme()
  const router = useRouter()
  const [messages, setMessages] = useState<Message[]>([])
  const [currentAgentMessage, setCurrentAgentMessage] = useState<string>('')
  const [currentSessionKey] = useAtom(currentSessionKeyAtom)
  const [clearMessagesTrigger] = useAtom(clearMessagesAtom)
  const flatListRef = useRef<FlashList<Message>>(null)
  const shouldAutoScrollRef = useRef(true)
  const hasScrolledOnLoadRef = useRef(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  const styles = useMemo(() => createStyles(theme), [theme])

  // Track keyboard position in real-time for smooth interactive dismissal
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation()

  // Track the chat input container height so the list margin adjusts dynamically
  const inputHeight = useSharedValue(40)
  const handleInputLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      inputHeight.value = e.nativeEvent.layout.height
    },
    [inputHeight],
  )

  // Animated style for resizing the list when keyboard opens
  const listContainerStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      flex: 1,
      marginBottom: -keyboardHeight.value + inputHeight.value,
    }
  })

  // Animated style for moving the input with keyboard
  // Position absolutely at bottom, moving up with keyboard height
  const inputContainerStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      transform: [
        {
          translateY: keyboardHeight.value === 0 ? keyboardHeight.value - 20 : keyboardHeight.value,
        },
      ],
    }
  })

  // Pulse animation for status dot using Reanimated
  const pulseOpacity = useSharedValue(1)
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }))

  const { connected, connecting, error, connect, disconnect, sendAgentRequest, getChatHistory } =
    useMoltGateway({
      url: gatewayUrl,
      token: gatewayToken,
    })

  const { handleSend: handleSendText, isAgentResponding, queueCount } = useMessageQueue({
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

  const handleSend = useCallback(
    (text: string, attachments?: MessageAttachment[]) => {
      if (attachments && attachments.length > 0) {
        // Convert UI attachments to Molt protocol attachments with base64 data
        const moltAttachments: Attachment[] = attachments
          .filter((a) => a.base64)
          .map((a) => ({
            type: 'image' as const,
            data: a.base64!,
            mimeType: a.mimeType || 'image/jpeg',
          }))

        // Add user message with image previews to the local message list
        const userMessage: Message = {
          id: `msg-${Date.now()}`,
          text: text || '',
          sender: 'user',
          timestamp: new Date(),
          attachments,
        }
        setMessages((prev) => [...prev, userMessage])
        shouldAutoScrollRef.current = true

        // Send text + attachments through the queue to the agent
        // skipUserMessage=true since we already added the user message above with image previews
        handleSendText(
          text || 'Attached image(s)',
          moltAttachments.length > 0 ? moltAttachments : undefined,
          true,
        )
      } else {
        handleSendText(text)
      }
    },
    [handleSendText],
  )

  // Load chat history on mount
  const loadChatHistory = useCallback(async () => {
    try {
      const history = await getChatHistory(currentSessionKey, 100)
      console.log('Chat history:', history)

      interface HistoryMessage {
        role: string
        content: Array<{ type: string; text?: string }>
        timestamp: number
      }
      interface HistoryResponse {
        messages?: HistoryMessage[]
      }

      const historyResponse = history as HistoryResponse
      if (historyResponse?.messages && Array.isArray(historyResponse.messages)) {
        const historyMessages = historyResponse.messages
          .filter((msg) => msg.role === 'user' || msg.role === 'assistant')
          .map((msg, index: number) => {
            const textContent = msg.content.find((c) => c.type === 'text')
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (connected) {
      // Small delay to ensure WebSocket is fully ready
      setTimeout(() => {
        loadChatHistory()
      }, 500)
    }
  }, [connected, loadChatHistory])

  // Clear messages when reset session is triggered
  useEffect(() => {
    if (clearMessagesTrigger > 0 && connected) {
      setMessages([])
      setCurrentAgentMessage('')
      hasScrolledOnLoadRef.current = false
      loadChatHistory()
    }
  }, [clearMessagesTrigger, connected, loadChatHistory])

  // Scroll to bottom on initial load when messages are first populated
  useEffect(() => {
    if (messages.length > 0 && !hasScrolledOnLoadRef.current) {
      hasScrolledOnLoadRef.current = true
      // Use a longer timeout to ensure FlashList has rendered
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false })
      }, 300)
    }
  }, [messages.length])

  // Track keyboard visibility and scroll to bottom when keyboard opens
  useEffect(() => {
    const keyboardDidShowListener = Keyboard.addListener('keyboardDidShow', () => {
      setIsKeyboardVisible(true)
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true })
      }, 100)
    })

    const keyboardDidHideListener = Keyboard.addListener('keyboardDidHide', () => {
      setIsKeyboardVisible(false)
    })

    return () => {
      keyboardDidShowListener.remove()
      keyboardDidHideListener.remove()
    }
  }, [])

  // Pulse animation for status dot when agent is responding
  useEffect(() => {
    if (isAgentResponding) {
      pulseOpacity.value = withRepeat(
        withSequence(
          withTiming(0.3, { duration: 800, easing: Easing.inOut(Easing.ease) }),
          withTiming(1, { duration: 800, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      )
    } else {
      pulseOpacity.value = withTiming(1, { duration: 200 })
    }
  }, [isAgentResponding, pulseOpacity])

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
            <Animated.View style={[styles.connectedDot, pulseStyle]} />
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
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={{ flex: 1 }}>
        <Animated.View style={listContainerStyle}>
          <FlashList
            ref={flatListRef}
            data={allMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ChatMessage message={item} />}
            estimatedItemSize={100}
            contentContainerStyle={styles.messageList}
            keyboardDismissMode="interactive"
            onContentSizeChange={() => {
              if (shouldAutoScrollRef.current) {
                flatListRef.current?.scrollToEnd({ animated: true })
              }
            }}
            onScroll={(event) => {
              const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
              const threshold = layoutMeasurement.height * 0.3 // 30% of screen height
              const isNearBottom =
                contentOffset.y + layoutMeasurement.height >= contentSize.height - threshold
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
        </Animated.View>
        <TouchableOpacity
          style={[
            styles.scrollToBottomButton,
            { opacity: showScrollButton && !isKeyboardVisible ? 1 : 0 },
          ]}
          onPress={() => {
            flatListRef.current?.scrollToEnd({ animated: true })
            setShowScrollButton(false)
          }}
          pointerEvents={showScrollButton && !isKeyboardVisible ? 'auto' : 'none'}
        >
          <Ionicons name="arrow-down" size={22} color={theme.colors.text.inverse} />
        </TouchableOpacity>
        <Animated.View style={inputContainerStyle} onLayout={handleInputLayout}>
          <ChatInput
            onSend={handleSend}
            onOpenSessionMenu={handleOpenSessionMenu}
            disabled={!connected}
            queueCount={queueCount}
          />
        </Animated.View>
      </View>
      {renderConnectionStatus()}
    </SafeAreaView>
  )
}

interface Theme {
  colors: {
    background: string
    surface: string
    border: string
    text: { primary: string; secondary: string; tertiary: string; inverse: string }
    primary: string
    status: { success: string; error: string; warning: string }
  }
  spacing: { xs: number; sm: number; md: number; lg: number; xl: number }
  borderRadius: { sm: number; md: number; xxl: number }
  typography: {
    fontSize: { xs: number; sm: number; base: number }
    fontWeight: { semibold: string }
  }
  isDark: boolean
}

const createStyles = (theme: Theme) =>
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
      paddingTop: 110,
      paddingBottom: 60, // Room for input
      paddingHorizontal: theme.spacing.sm,
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
      bottom: 150,
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
