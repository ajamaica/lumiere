import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
import { useAtom, useSetAtom } from 'jotai'
import React, { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Image, Text, TouchableOpacity, View } from 'react-native'
import Markdown from 'react-native-markdown-display'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useSpeech } from '../../hooks/useSpeech'
import { useUrlMetadata } from '../../hooks/useUrlMetadata'
import { copyToClipboard, executeIntent } from '../../services/intents'
import {
  clearMessagesAtom,
  currentSessionKeyAtom,
  favoritesAtom,
  sessionAliasesAtom,
} from '../../store'
import { useTheme } from '../../theme'
import { ChatIntent, extractIntents, intentIcon, stripIntents } from '../../utils/chatIntents'
import { logger } from '../../utils/logger'
import { processXmlTags } from '../../utils/xmlTagProcessor'
import { createMarkdownStyles, createStyles } from './ChatMessage.styles'
import type { Message, MessageAttachment, TextMessage } from './chatMessageTypes'
import { LinkPreview } from './LinkPreview'
import { ToolEventBubble } from './ToolEventBubble'
import { useMarkdownRules } from './useMarkdownRules'

export type { Message, MessageAttachment, TextMessage }

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)

const chatLogger = logger.create('ChatMessage')

// Convert plain URLs to markdown links
const linkifyText = (text: string): string => {
  // First, protect existing markdown links by temporarily replacing them
  const markdownLinkRegex = /\[([^\]]+)\]\(([^)]+)\)/g
  const placeholders: string[] = []
  let placeholderIndex = 0

  // Replace markdown links with placeholders
  let protectedText = text.replace(markdownLinkRegex, (match) => {
    const placeholder = `__MDLINK_${placeholderIndex}__`
    placeholders[placeholderIndex] = match
    placeholderIndex++
    return placeholder
  })

  // Now linkify plain URLs
  const urlRegex = /(https?:\/\/[^\s<]+[^<.,:;"')\]\s])/g
  protectedText = protectedText.replace(urlRegex, (url) => `[${url}](${url})`)

  // Restore markdown links
  placeholders.forEach((original, index) => {
    protectedText = protectedText.replace(`__MDLINK_${index}__`, original)
  })

  return protectedText
}

export function ChatMessage({ message }: { message: Message }) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const reducedMotion = useReducedMotion()
  const isUser = message.sender === 'user'
  // Narrow union: ToolEventMessage never reaches ChatMessage, but TS needs help
  const isTextMsg = message.type !== 'tool_event'
  const streaming = isTextMsg ? message.streaming : false
  const attachments = isTextMsg ? message.attachments : undefined
  const [copied, setCopied] = useState(false)
  const [intentCopied, setIntentCopied] = useState(false)
  const [favorites, setFavorites] = useAtom(favoritesAtom)
  const setCurrentSessionKey = useSetAtom(currentSessionKeyAtom)
  const setSessionAliases = useSetAtom(sessionAliasesAtom)
  const setClearMessages = useSetAtom(clearMessagesAtom)

  const { status: speechStatus, speak, stop: stopSpeech } = useSpeech()

  // Animation values
  const fadeIn = useSharedValue(0)
  const shimmerProgress = useSharedValue(0)

  // Entrance animation
  useEffect(() => {
    if (reducedMotion) {
      fadeIn.value = 1
      return
    }
    fadeIn.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })

    // Subtle shimmer for user bubbles
    if (isUser) {
      shimmerProgress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      )
    }
  }, [fadeIn, shimmerProgress, isUser, reducedMotion])

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ translateY: (1 - fadeIn.value) * 8 }],
  }))

  const animatedGradientStyle = useAnimatedStyle(() => ({
    opacity: 0.95 + shimmerProgress.value * 0.05,
  }))

  const isFavorited = useMemo(
    () => favorites.some((f) => f.id === message.id),
    [favorites, message.id],
  )

  const handleToggleFavorite = useCallback(() => {
    if (isFavorited) {
      setFavorites(favorites.filter((f) => f.id !== message.id))
    } else {
      setFavorites([
        ...favorites,
        {
          id: message.id,
          text: message.text,
          sender: message.sender,
          savedAt: Date.now(),
        },
      ])
    }
  }, [isFavorited, favorites, setFavorites, message])

  const isSpeaking = speechStatus === 'speaking'

  const handleSpeechToggle = useCallback(() => {
    if (isSpeaking) {
      stopSpeech()
    } else {
      speak(processXmlTags(message.text))
    }
  }, [isSpeaking, stopSpeech, speak, message.text])

  const styles = useMemo(() => createStyles(theme), [theme])
  const markdownStyles = useMemo(() => createMarkdownStyles(theme, isUser), [theme, isUser])
  const { markdownRules, handleLinkPress } = useMarkdownRules()

  const handleCopy = async () => {
    await copyToClipboard(processXmlTags(message.text))
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  // Extract intents from the message (agent messages only)
  const intents = useMemo(
    () => (!isUser ? extractIntents(message.text) : []),
    [isUser, message.text],
  )

  const handleIntentPress = useCallback(
    async (intent: ChatIntent) => {
      try {
        const confirmed = await executeIntent(intent, {
          setSessionAlias: (key, label) => setSessionAliases((prev) => ({ ...prev, [key]: label })),
          switchSession: (key) => setCurrentSessionKey(key),
          clearMessages: () => setClearMessages((n) => n + 1),
        })
        if (confirmed) {
          setIntentCopied(true)
          setTimeout(() => setIntentCopied(false), 2000)
        }
      } catch (err) {
        chatLogger.logError('Failed to execute intent', err)
      }
    },
    [setCurrentSessionKey, setSessionAliases, setClearMessages],
  )

  // Strip XML tags, intent URLs from displayed text, then linkify
  const processedText = useMemo(() => {
    let text = processXmlTags(message.text)
    text = intents.length > 0 ? stripIntents(text) : text
    return linkifyText(text)
  }, [message.text, intents])

  // Fetch URL embed previews for agent messages
  const { metadata: urlPreviews } = useUrlMetadata(message.text, !!streaming, isUser)

  const renderAttachments = () => {
    if (!attachments || attachments.length === 0) return null
    return (
      <View style={styles.attachmentContainer}>
        {attachments.map((attachment: MessageAttachment, index: number) => (
          <Image
            key={index}
            source={{ uri: attachment.uri }}
            style={styles.attachmentImage}
            resizeMode="cover"
            accessibilityLabel={t('accessibility.attachmentLabel', { index: index + 1 })}
            accessibilityRole="image"
          />
        ))}
      </View>
    )
  }

  const renderMarkdown = () => (
    <Markdown
      style={markdownStyles}
      onLinkPress={(url: string) => {
        handleLinkPress(url)
        return false
      }}
      mergeStyle={true}
      rules={markdownRules}
    >
      {processedText}
    </Markdown>
  )

  // User bubble with gradient
  const renderUserBubble = () => (
    <Animated.View style={[styles.userBubbleWrapper, animatedContainerStyle]}>
      <AnimatedLinearGradient
        colors={[theme.colors.primary, theme.colors.primaryDark, theme.colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.userGradientBubble, animatedGradientStyle]}
      >
        {renderAttachments()}
        {renderMarkdown()}
      </AnimatedLinearGradient>
    </Animated.View>
  )

  // Agent bubble with subtle gradient border
  const renderAgentBubble = () => (
    <Animated.View style={[styles.bubble, styles.agentBubble, animatedContainerStyle]}>
      {renderAttachments()}
      {renderMarkdown()}
      {streaming && (
        <Text style={styles.streamingIndicator} selectable={true}>
          ...
        </Text>
      )}
      {urlPreviews.length > 0 && (
        <View style={styles.linkPreviews}>
          {urlPreviews.map((meta) => (
            <LinkPreview key={meta.url} metadata={meta} />
          ))}
        </View>
      )}
    </Animated.View>
  )

  // Render tool event messages with the compact ToolEventBubble
  if (message.type === 'tool_event') {
    return <ToolEventBubble message={message} />
  }

  return (
    <View
      style={[styles.container, isUser ? styles.userContainer : styles.agentContainer]}
      accessible={true}
      accessibilityLabel={`${isUser ? t('accessibility.messageFromYou') : t('accessibility.messageFromAssistant')}: ${message.text.substring(0, 200)}${message.text.length > 200 ? '...' : ''}`}
      accessibilityRole="text"
      accessibilityLiveRegion={!isUser ? 'polite' : 'none'}
    >
      {isUser ? renderUserBubble() : renderAgentBubble()}
      {!streaming && intents.length > 0 && (
        <View style={styles.intentActions}>
          {intents.map((intent, index) => {
            const isCopyIntent = intent.action === 'copyToClipboard'
            const showCheck = isCopyIntent && intentCopied
            return (
              <TouchableOpacity
                key={index}
                style={styles.intentButton}
                onPress={() => handleIntentPress(intent)}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel={showCheck ? t('accessibility.copied') : intent.label}
              >
                <Ionicons
                  name={(showCheck ? 'checkmark' : intentIcon(intent.action)) as any}
                  size={16}
                  color={theme.colors.primary}
                  style={styles.intentButtonIcon}
                />
                <Text style={styles.intentButtonText}>{showCheck ? 'Copied!' : intent.label}</Text>
              </TouchableOpacity>
            )
          })}
        </View>
      )}
      {!streaming && (
        <View style={styles.actionButtons}>
          {!isUser && (
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleCopy}
              accessibilityRole="button"
              accessibilityLabel={
                copied ? t('accessibility.copied') : t('accessibility.copyMessage')
              }
            >
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={18}
                color={theme.colors.text.secondary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleToggleFavorite}
            accessibilityRole="button"
            accessibilityLabel={
              isFavorited
                ? t('accessibility.removeFromFavorites')
                : t('accessibility.addToFavorites')
            }
            accessibilityState={{ selected: isFavorited }}
          >
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorited ? theme.colors.primary : theme.colors.text.secondary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={handleSpeechToggle}
            accessibilityRole="button"
            accessibilityLabel={
              isSpeaking ? t('accessibility.stopSpeaking') : t('accessibility.speakMessage')
            }
          >
            <Ionicons
              name={isSpeaking ? 'pause-circle-outline' : 'play-circle-outline'}
              size={18}
              color={isSpeaking ? theme.colors.primary : theme.colors.text.secondary}
            />
          </TouchableOpacity>
        </View>
      )}
      <Text style={styles.timestamp} selectable={true}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  )
}
