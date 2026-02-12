import { Ionicons } from '@expo/vector-icons'
import { FlashList, FlashListRef } from '@shopify/flash-list'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Keyboard, Text, TouchableOpacity, View } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import { ProviderConfig } from '../../services/providers'
import {
  createSessionKey,
  currentAgentIdAtom,
  currentSessionKeyAtom,
  parseSessionKey,
} from '../../store'
import { useTheme } from '../../theme'
import {
  useContentContainerStyle,
  useDeviceType,
  useFoldResponsiveValue,
  useFoldState,
} from '../../utils/device'
import { useReanimatedKeyboardAnimation } from '../../utils/keyboardAnimation'
import { AgentPicker } from './AgentPicker'
import { ChatInput } from './ChatInput'
import { ChatMessage, Message } from './ChatMessage'
import { createChatScreenStyles } from './ChatScreen.styles'
import { ConnectionStatusBar } from './ConnectionStatusBar'
import { useChatHistory } from './useChatHistory'

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
  const { t } = useTranslation()
  const router = useRouter()
  const [currentSessionKey, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [currentAgentId, setCurrentAgentId] = useAtom(currentAgentIdAtom)
  const [isAgentPickerOpen, setIsAgentPickerOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const isMoltProvider = providerConfig.type === 'molt'
  const flatListRef = useRef<FlashListRef<Message>>(null)
  const [showScrollButton, setShowScrollButton] = useState(false)
  const [isKeyboardVisible, setIsKeyboardVisible] = useState(false)

  // Device & layout
  const deviceType = useDeviceType()
  const foldState = useFoldState()
  const contentContainerStyle = useContentContainerStyle()
  const messageListPadding = useFoldResponsiveValue(
    theme.spacing.sm,
    theme.spacing.md,
    theme.spacing.sm,
  )

  const styles = useMemo(
    () => createChatScreenStyles(theme, deviceType, foldState, messageListPadding),
    [theme, deviceType, foldState, messageListPadding],
  )

  // Chat history, messages, and connection state
  const {
    connected,
    connecting,
    error,
    health,
    capabilities,
    retry,
    allMessages,
    isLoadingHistory,
    historyReady,
    setHistoryReady,
    handleSend,
    isAgentResponding,
    queueCount,
    isWorkflowActive,
    hasScrolledOnLoadRef,
    shouldAutoScrollRef,
    messages,
  } = useChatHistory({ providerConfig })

  // Keyboard animation
  const { height: keyboardHeight } = useReanimatedKeyboardAnimation()
  const inputHeight = useSharedValue(40)

  const handleInputLayout = useCallback(
    (e: { nativeEvent: { layout: { height: number } } }) => {
      // eslint-disable-next-line react-hooks/immutability -- Reanimated shared value
      inputHeight.value = e.nativeEvent.layout.height
    },
    [inputHeight],
  )

  const listContainerStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      flex: 1,
      marginBottom: -keyboardHeight.value + inputHeight.value,
    }
  })

  const inputContainerStyle = useAnimatedStyle(() => {
    'worklet'
    return {
      backgroundColor: 'transparent',
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      transform: [{ translateY: keyboardHeight.value - 20 }],
    }
  })

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

  // Navigation handlers
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

  const handleSelectAgent = useCallback(
    (agentId: string) => {
      setCurrentAgentId(agentId)
      const { sessionName } = parseSessionKey(currentSessionKey)
      setCurrentSessionKey(createSessionKey(agentId, sessionName))
    },
    [currentSessionKey, setCurrentAgentId, setCurrentSessionKey],
  )

  // Filter messages by search query
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
              if (!hasScrolledOnLoadRef.current && !isLoadingHistory && messages.length > 0) {
                flatListRef.current?.scrollToEnd({ animated: false })
                hasScrolledOnLoadRef.current = true
                requestAnimationFrame(() => {
                  setHistoryReady(true)
                })
                return
              }

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
              const threshold = layoutMeasurement.height * 0.3
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
          accessibilityRole="button"
          accessibilityLabel={t('accessibility.scrollToBottom')}
          accessibilityHint={t('accessibility.scrollToBottomHint')}
        >
          <Ionicons name="arrow-down" size={22} color={theme.colors.text.inverse} />
        </TouchableOpacity>
        <Animated.View style={inputContainerStyle} onLayout={handleInputLayout}>
          <ChatInput
            onSend={handleSend}
            onOpenSessionMenu={deviceType === 'phone' ? handleOpenSessionMenu : undefined}
            disabled={!connected}
            queueCount={queueCount}
            supportsImageAttachments={capabilities.imageAttachments}
            supportsFileAttachments={capabilities.fileAttachments}
            providerType={providerConfig.type}
          />
        </Animated.View>
      </View>
      <ConnectionStatusBar
        connecting={connecting}
        connected={connected}
        error={error}
        health={health}
        retry={retry}
        isAgentResponding={isAgentResponding}
        isMoltProvider={isMoltProvider}
        isWorkflowActive={isWorkflowActive}
        onOpenSettings={handleOpenSettings}
        onOpenAgentPicker={() => setIsAgentPickerOpen(true)}
        allMessages={allMessages}
        searchQuery={searchQuery}
        onSearchQueryChange={setSearchQuery}
      />
      {isMoltProvider && (
        <AgentPicker
          visible={isAgentPickerOpen}
          onClose={() => setIsAgentPickerOpen(false)}
          agents={health?.agents ?? {}}
          currentAgentId={currentAgentId}
          onSelectAgent={handleSelectAgent}
        />
      )}
    </SafeAreaView>
  )
}
