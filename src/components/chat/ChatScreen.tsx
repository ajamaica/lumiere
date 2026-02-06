import { Ionicons } from '@expo/vector-icons'
import { FlashList, FlashListRef } from '@shopify/flash-list'
import { GlassView, isLiquidGlassAvailable } from 'expo-glass-effect'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  Keyboard,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { useReanimatedKeyboardAnimation } from 'react-native-keyboard-controller'
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useChatProvider } from '../../hooks/useChatProvider'
import { useMessageQueue } from '../../hooks/useMessageQueue'
import { ProviderConfig, readCachedHistory } from '../../services/providers'
import { clearMessagesAtom, currentSessionKeyAtom, pendingTriggerMessageAtom } from '../../store'
import { useTheme } from '../../theme'
import {
  useContentContainerStyle,
  useDeviceType,
  useFoldResponsiveValue,
  useFoldState,
} from '../../utils/device'
import { ChatInput } from './ChatInput'
import { ChatMessage, Message } from './ChatMessage'

interface ChatScreenProps {
  providerConfig: ProviderConfig
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
export function ChatScreen({ providerConfig }: ChatScreenProps) {
  const { theme } = useTheme()
  const router = useRouter()
  const glassAvailable = isLiquidGlassAvailable()
  const [messages, setMessages] = useState<Message[]>([])
  const [currentAgentMessage, setCurrentAgentMessage] = useState<string>('')
  const [currentSessionKey] = useAtom(currentSessionKeyAtom)
  const [clearMessagesTrigger] = useAtom(clearMessagesAtom)
  const [pendingTriggerMessage, setPendingTriggerMessage] = useAtom(pendingTriggerMessageAtom)
  const flatListRef = useRef<FlashListRef<Message>>(null)
  const shouldAutoScrollRef = useRef(true)
  const hasScrolledOnLoadRef = useRef(false)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)
  const [isLoadingHistory, setIsLoadingHistory] = useState(true)
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const searchInputRef = useRef<TextInput>(null)

  // Foldable device support
  const deviceType = useDeviceType()
  const foldState = useFoldState()
  const contentContainerStyle = useContentContainerStyle()

  // Responsive values for foldable devices
  const messageListPadding = useFoldResponsiveValue(
    theme.spacing.sm, // folded (narrow screen)
    theme.spacing.md, // unfolded (wider screen)
    theme.spacing.sm, // half-folded
  )

  const styles = useMemo(
    () => createStyles(theme, glassAvailable, deviceType, foldState, messageListPadding),
    [theme, glassAvailable, deviceType, foldState, messageListPadding],
  )

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
      backgroundColor: 'transparent',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      transform: [
        {
          translateY: keyboardHeight.value - 20,
        },
      ],
    }
  })

  // Pulse animation for status dot using Reanimated
  const pulseOpacity = useSharedValue(1)
  const pulseStyle = useAnimatedStyle(() => ({
    opacity: pulseOpacity.value,
  }))

  // Search bar expand/collapse animation
  const searchProgress = useSharedValue(0)

  // Keep transform on the outer wrapper so the GlassView is never inside an
  // animated-opacity ancestor (iOS rasterises the subtree and breaks the blur).
  const searchBarTransformStyle = useAnimatedStyle(() => ({
    transform: [{ scaleX: interpolate(searchProgress.value, [0, 1], [0.7, 1]) }],
  }))

  // Fade the *content* inside the GlassView instead.
  const searchBarContentStyle = useAnimatedStyle(() => ({
    opacity: searchProgress.value,
  }))

  const statusBubbleAnimatedStyle = useAnimatedStyle(() => ({
    opacity: 1 - searchProgress.value,
    transform: [{ scale: interpolate(searchProgress.value, [0, 1], [1, 0.85]) }],
  }))

  // Track whether we pre-populated from local cache so we can skip the loader
  const hasCacheRef = useRef(false)

  const { connected, connecting, error, capabilities, retry, sendMessage, getChatHistory } =
    useChatProvider(providerConfig)

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
  })

  // Convert raw history messages into UI Message objects
  const historyToMessages = useCallback(
    (
      msgs: { role: string; content: Array<{ type: string; text?: string }>; timestamp: number }[],
    ): Message[] => {
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
    },
    [],
  )

  // Pre-populate from local cache before the provider connects.
  // This lets us show cached messages instantly and skip the loading spinner.
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
  }, [providerConfig.serverId, currentSessionKey, historyToMessages])

  // Load chat history on mount
  const loadChatHistory = useCallback(async () => {
    const hadCache = hasCacheRef.current

    // When we already have cached messages on screen, skip the loader and
    // refresh silently in the background. Otherwise show the loading state.
    if (!hadCache) {
      setMessages([])
      setCurrentAgentMessage('')
      hasScrolledOnLoadRef.current = false
      setHistoryReady(false)
      setIsLoadingHistory(true)
    }

    try {
      const historyResponse = await getChatHistory(currentSessionKey, 100)
      console.log('Chat history:', historyResponse)

      if (historyResponse?.messages && Array.isArray(historyResponse.messages)) {
        const historyMessages = historyToMessages(historyResponse.messages)
        setMessages(historyMessages)
        console.log(`Loaded ${historyMessages.length} messages from history`)
      }
    } catch (err) {
      console.error('Failed to load chat history:', err)
    } finally {
      setIsLoadingHistory(false)
    }
  }, [getChatHistory, currentSessionKey, historyToMessages])

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
      hasCacheRef.current = false
      setMessages([])
      setCurrentAgentMessage('')
      hasScrolledOnLoadRef.current = false
      loadChatHistory()
    }
  }, [clearMessagesTrigger, connected, loadChatHistory])

  // Keep a ref to handleSend so the trigger timer isn't reset every time
  // handleSend's identity changes (which happens on every render because the
  // inline callbacks passed to useMessageQueue create new references).
  const handleSendRef = useRef(handleSend)
  useEffect(() => {
    handleSendRef.current = handleSend
  }, [handleSend])

  // Auto-send pending trigger message once connected and history has loaded
  useEffect(() => {
    if (connected && !isLoadingHistory && pendingTriggerMessage) {
      // Small delay so the UI settles before firing the message
      const timer = setTimeout(() => {
        handleSendRef.current(pendingTriggerMessage)
        setPendingTriggerMessage(null)
      }, 600)
      return () => clearTimeout(timer)
    }
  }, [connected, isLoadingHistory, pendingTriggerMessage, setPendingTriggerMessage])

  // Scroll to bottom after history finishes loading to show latest messages.
  // The list stays hidden (opacity 0) until this scroll completes so the user
  // never sees the conversation flash from the top before jumping to the bottom.
  const [historyReady, setHistoryReady] = useState(false)

  useEffect(() => {
    if (!isLoadingHistory && messages.length > 0 && !hasScrolledOnLoadRef.current) {
      // Use a longer timeout to ensure FlashList has rendered all history items
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: false })
        // Mark as scrolled *after* the initial jump so onContentSizeChange
        // doesn't trigger an animated scroll during history load
        hasScrolledOnLoadRef.current = true
        // Reveal the list now that we're scrolled to the bottom
        setHistoryReady(true)
      }, 400)
    }
  }, [isLoadingHistory, messages.length])

  // When there are no history messages, reveal immediately
  useEffect(() => {
    if (!isLoadingHistory && messages.length === 0) {
      setHistoryReady(true)
    }
  }, [isLoadingHistory, messages.length])

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
    if (providerConfig.type === 'ollama') {
      router.push('/ollama-models')
    } else {
      router.push('/sessions')
    }
  }

  const handleOpenSettings = () => {
    router.push('/settings')
  }

  const handleToggleSearch = () => {
    if (isSearchOpen) {
      searchProgress.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) })
      setSearchQuery('')
      setIsSearchOpen(false)
    } else {
      setIsSearchOpen(true)
      searchProgress.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
      setTimeout(() => searchInputRef.current?.focus(), 150)
    }
  }

  const handleCloseSearch = () => {
    searchProgress.value = withTiming(0, { duration: 250, easing: Easing.out(Easing.ease) })
    setSearchQuery('')
    setTimeout(() => setIsSearchOpen(false), 200)
  }

  const renderConnectionStatus = () => {
    // Hide settings button on tablets/foldables since it's in the sidebar
    const showSettingsButton = deviceType === 'phone'

    const StatusBubbleContainer = glassAvailable ? GlassView : View
    const statusBubbleProps = glassAvailable
      ? { style: styles.statusBubble, glassEffectStyle: 'regular' as const }
      : { style: [styles.statusBubble, styles.statusBubbleFallback] }

    const SettingsButtonContainer = glassAvailable ? GlassView : View
    const settingsButtonProps = glassAvailable
      ? { style: styles.settingsButton, glassEffectStyle: 'regular' as const }
      : { style: [styles.settingsButton, styles.settingsButtonFallback] }

    if (connecting) {
      return (
        <View style={styles.statusBarContainer}>
          <StatusBubbleContainer {...statusBubbleProps}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
            <Text style={styles.statusText}>Connecting...</Text>
          </StatusBubbleContainer>
          {showSettingsButton && (
            <TouchableOpacity onPress={handleOpenSettings} activeOpacity={0.7}>
              <SettingsButtonContainer {...settingsButtonProps}>
                <Ionicons name="settings-outline" size={24} color={theme.colors.text.secondary} />
              </SettingsButtonContainer>
            </TouchableOpacity>
          )}
        </View>
      )
    }

    if (error) {
      const errorBubbleProps = glassAvailable
        ? { style: styles.statusBubble, glassEffectStyle: 'regular' as const }
        : { style: [styles.statusBubble, styles.statusBubbleFallback, styles.errorBubble] }
      return (
        <View style={styles.statusBarContainer}>
          <StatusBubbleContainer {...errorBubbleProps}>
            <Text style={styles.errorText} numberOfLines={1}>
              Connection failed: {error}
            </Text>
            <TouchableOpacity onPress={retry} style={styles.retryButton}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </StatusBubbleContainer>
          {showSettingsButton && (
            <TouchableOpacity onPress={handleOpenSettings} activeOpacity={0.7}>
              <SettingsButtonContainer {...settingsButtonProps}>
                <Ionicons name="settings-outline" size={24} color={theme.colors.text.secondary} />
              </SettingsButtonContainer>
            </TouchableOpacity>
          )}
        </View>
      )
    }

    if (connected) {
      const SearchBarContainer = glassAvailable ? GlassView : View
      const searchBarProps = glassAvailable
        ? { style: styles.searchBar, glassEffectStyle: 'regular' as const }
        : { style: [styles.searchBar, styles.searchBarFallback] }

      return (
        <View style={styles.statusBarContainer}>
          {/* Status bubble layer - fades out when search opens */}
          <Animated.View
            style={[styles.statusRow, statusBubbleAnimatedStyle]}
            pointerEvents={isSearchOpen ? 'none' : 'auto'}
          >
            <StatusBubbleContainer {...statusBubbleProps}>
              <Animated.View style={[styles.connectedDot, pulseStyle]} />
              <Text style={styles.connectedText}>Health</Text>
              <Text style={styles.statusOk}>OK</Text>
            </StatusBubbleContainer>
            <View style={styles.statusActions}>
              <TouchableOpacity onPress={handleToggleSearch} activeOpacity={0.7}>
                <SettingsButtonContainer {...settingsButtonProps}>
                  <Ionicons name="search" size={22} color={theme.colors.text.secondary} />
                </SettingsButtonContainer>
              </TouchableOpacity>
              {showSettingsButton && (
                <TouchableOpacity onPress={handleOpenSettings} activeOpacity={0.7}>
                  <SettingsButtonContainer {...settingsButtonProps}>
                    <Ionicons name="settings-outline" size={24} color={theme.colors.text.secondary} />
                  </SettingsButtonContainer>
                </TouchableOpacity>
              )}
            </View>
          </Animated.View>

          {/* Search bar layer - expands in when search opens */}
          {isSearchOpen && (
            <Animated.View style={[styles.searchBarWrapper, searchBarTransformStyle]}>
              <SearchBarContainer {...searchBarProps}>
                <Animated.View style={[styles.searchBarContent, searchBarContentStyle]}>
                  <Ionicons name="search" size={18} color={theme.colors.text.secondary} />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    placeholder="Search messages..."
                    placeholderTextColor={theme.colors.text.tertiary}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    autoCorrect={false}
                    returnKeyType="search"
                  />
                  {searchQuery.length > 0 && (
                    <Text style={styles.searchCount}>
                      {
                        allMessages.filter((m) =>
                          m.text.toLowerCase().includes(searchQuery.toLowerCase()),
                        ).length
                      }
                    </Text>
                  )}
                  <TouchableOpacity onPress={handleCloseSearch} hitSlop={8}>
                    <Ionicons name="close-circle" size={20} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                </Animated.View>
              </SearchBarContainer>
            </Animated.View>
          )}
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

  const filteredMessages = searchQuery
    ? allMessages.filter((m) => m.text.toLowerCase().includes(searchQuery.toLowerCase()))
    : allMessages

  return (
    <SafeAreaView style={styles.container} edges={['left', 'right']}>
      <View style={{ flex: 1 }}>
        {!historyReady && (
          <View style={styles.emptyContainer}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
            <Text style={styles.loadingText}>Loading conversation...</Text>
          </View>
        )}
        <Animated.View style={[listContainerStyle, { opacity: historyReady ? 1 : 0 }]}>
          <FlashList
            ref={flatListRef}
            data={filteredMessages}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <ChatMessage message={item} />}
            contentContainerStyle={[styles.messageList, contentContainerStyle]}
            keyboardDismissMode="interactive"
            onContentSizeChange={() => {
              if (
                shouldAutoScrollRef.current &&
                !isLoadingHistory &&
                hasScrolledOnLoadRef.current
              ) {
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
              isLoadingHistory ? (
                <View style={styles.emptyContainer}>
                  <ActivityIndicator size="large" color={theme.colors.primary} />
                  <Text style={styles.loadingText}>Loading conversation...</Text>
                </View>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? 'No matching messages'
                      : 'Start a conversation with the AI agent'}
                  </Text>
                </View>
              )
            }
          />
        </Animated.View>
        <TouchableOpacity
          style={[
            styles.scrollToBottomButton,
            {
              opacity: showScrollButton && !isKeyboardVisible ? 1 : 0,
              pointerEvents:
                showScrollButton && !isKeyboardVisible ? ('auto' as const) : ('none' as const),
            },
          ]}
          onPress={() => {
            flatListRef.current?.scrollToEnd({ animated: true })
            setShowScrollButton(false)
          }}
        >
          <Ionicons name="arrow-down" size={22} color={theme.colors.text.inverse} />
        </TouchableOpacity>
        <Animated.View style={inputContainerStyle} onLayout={handleInputLayout}>
          <ChatInput
            onSend={handleSend}
            onOpenSessionMenu={handleOpenSessionMenu}
            disabled={!connected}
            queueCount={queueCount}
            supportsImageAttachments={capabilities.imageAttachments}
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
    fontWeight: { semibold: '600' }
  }
  isDark: boolean
}

const createStyles = (
  theme: Theme,
  _glassAvailable: boolean,
  deviceType: 'phone' | 'tablet' | 'foldable',
  foldState: 'folded' | 'unfolded' | 'half-folded',
  messageListPadding: number,
) => {
  // Adjust status bar position for foldable devices in half-folded state
  const statusBarTop = deviceType === 'foldable' && foldState === 'half-folded' ? 40 : 50

  // Adjust left position on tablets/foldables to appear next to toggle button
  const statusBarLeft = deviceType !== 'phone' ? 70 : 0

  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    statusBarContainer: {
      position: 'absolute',
      top: statusBarTop,
      left: statusBarLeft,
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
      paddingHorizontal: theme.spacing.md + 2,
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.borderRadius.xxl,
      alignSelf: 'flex-start',
      marginRight: theme.spacing.md,
      flexShrink: 1,
      overflow: 'hidden',
    },
    statusBubbleFallback: {
      backgroundColor: theme.colors.surface,
    },
    settingsButton: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      flexShrink: 0,
      overflow: 'hidden',
    },
    settingsButtonFallback: {
      backgroundColor: theme.colors.surface,
    },
    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      flex: 1,
    },
    statusActions: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    searchBarWrapper: {
      position: 'absolute',
      left: theme.spacing.lg,
      right: theme.spacing.lg,
      transformOrigin: 'right center',
    },
    searchBar: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.xxl,
      overflow: 'hidden',
    },
    searchBarContent: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
    },
    searchBarFallback: {
      backgroundColor: theme.colors.surface,
    },
    searchInput: {
      flex: 1,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
      marginLeft: theme.spacing.md,
      marginRight: theme.spacing.md,
      paddingVertical: 4,
    },
    searchCount: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      marginRight: theme.spacing.sm,
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
      paddingTop: deviceType === 'foldable' && foldState === 'half-folded' ? 100 : 110,
      paddingBottom: 60, // Room for input
      paddingHorizontal: messageListPadding,
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
    loadingText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginTop: theme.spacing.md,
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
}
