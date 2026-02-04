import { Ionicons } from '@expo/vector-icons'
import * as Clipboard from 'expo-clipboard'
import * as Linking from 'expo-linking'
import * as WebBrowser from 'expo-web-browser'
import { useAtom, useSetAtom } from 'jotai'
import React, { useCallback, useMemo, useState } from 'react'
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  TextStyle,
  TouchableOpacity,
  View,
  ViewStyle,
} from 'react-native'
import Markdown from 'react-native-markdown-display'

import {
  clearMessagesAtom,
  currentSessionKeyAtom,
  favoritesAtom,
  sessionAliasesAtom,
} from '../../store'
import { useTheme } from '../../theme'
import { ChatIntent, extractIntents, intentIcon, stripIntents } from '../../utils/chatIntents'

export interface MessageAttachment {
  uri: string
  base64?: string
  mimeType?: string
}

export interface Message {
  id: string
  text: string
  sender: 'user' | 'agent'
  timestamp: Date
  streaming?: boolean
  attachments?: MessageAttachment[]
}

interface ChatMessageProps {
  message: Message
}

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

export function ChatMessage({ message }: ChatMessageProps) {
  const { theme } = useTheme()
  const isUser = message.sender === 'user'
  const [copied, setCopied] = useState(false)
  const [intentCopied, setIntentCopied] = useState(false)
  const [favorites, setFavorites] = useAtom(favoritesAtom)
  const setCurrentSessionKey = useSetAtom(currentSessionKeyAtom)
  const setSessionAliases = useSetAtom(sessionAliasesAtom)
  const setClearMessages = useSetAtom(clearMessagesAtom)

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

  const styles = useMemo(() => createStyles(theme), [theme])
  const markdownStyles = useMemo(() => createMarkdownStyles(theme, isUser), [theme, isUser])

  const handleLinkPress = React.useCallback(
    async (url: string) => {
      console.log('Link pressed:', url)
      try {
        await WebBrowser.openBrowserAsync(url, {
          presentationStyle: WebBrowser.WebBrowserPresentationStyle.PAGE_SHEET,
          controlsColor: theme.colors.primary,
        })
      } catch (err) {
        console.error('Failed to open URL:', err)
      }
    },
    [theme.colors.primary],
  )

  const markdownRules = useMemo(
    () => ({
      text: (
        node: { key: string; content: string },
        _children: unknown,
        _parent: unknown,
        styles: { text: TextStyle },
      ) => (
        <Text key={node.key} style={styles.text} selectable={true}>
          {node.content}
        </Text>
      ),
      paragraph: (
        node: { key: string },
        children: React.ReactNode,
        _parent: unknown,
        styles: { paragraph: TextStyle },
      ) => (
        <Text key={node.key} style={styles.paragraph} selectable={true}>
          {children}
        </Text>
      ),
      strong: (
        node: { key: string },
        children: React.ReactNode,
        _parent: unknown,
        styles: { strong: TextStyle },
      ) => (
        <Text key={node.key} style={styles.strong} selectable={true}>
          {children}
        </Text>
      ),
      em: (
        node: { key: string },
        children: React.ReactNode,
        _parent: unknown,
        styles: { em: TextStyle },
      ) => (
        <Text key={node.key} style={styles.em} selectable={true}>
          {children}
        </Text>
      ),
      code_inline: (
        node: { key: string; content: string },
        _children: unknown,
        _parent: unknown,
        styles: { code_inline: TextStyle },
      ) => (
        <Text key={node.key} style={styles.code_inline} selectable={true}>
          {node.content}
        </Text>
      ),
      fence: (
        node: { key: string; content: string },
        _children: unknown,
        _parent: unknown,
        styles: { fence: TextStyle },
      ) => (
        <Text key={node.key} style={styles.fence} selectable={true}>
          {node.content}
        </Text>
      ),
      code_block: (
        node: { key: string; content: string },
        _children: unknown,
        _parent: unknown,
        styles: { code_block: TextStyle },
      ) => (
        <Text key={node.key} style={styles.code_block} selectable={true}>
          {node.content}
        </Text>
      ),
      heading1: (
        node: { key: string },
        children: React.ReactNode,
        _parent: unknown,
        styles: { heading1: TextStyle },
      ) => (
        <Text key={node.key} style={styles.heading1} selectable={true}>
          {children}
        </Text>
      ),
      heading2: (
        node: { key: string },
        children: React.ReactNode,
        _parent: unknown,
        styles: { heading2: TextStyle },
      ) => (
        <Text key={node.key} style={styles.heading2} selectable={true}>
          {children}
        </Text>
      ),
      heading3: (
        node: { key: string },
        children: React.ReactNode,
        _parent: unknown,
        styles: { heading3: TextStyle },
      ) => (
        <Text key={node.key} style={styles.heading3} selectable={true}>
          {children}
        </Text>
      ),
      link: (
        node: { key: string; attributes?: { href?: string } },
        children: React.ReactNode,
        _parent: unknown,
        styles: { link: TextStyle },
      ) => {
        const url = node.attributes?.href || ''
        return (
          <Pressable key={node.key} onPress={() => handleLinkPress(url)}>
            <Text style={styles.link} selectable={true}>
              {children}
            </Text>
          </Pressable>
        )
      },
      textgroup: (
        node: { key: string },
        children: React.ReactNode,
        _parent: unknown,
        styles: { textgroup: TextStyle },
      ) => (
        <Text key={node.key} style={styles.textgroup} selectable={true}>
          {children}
        </Text>
      ),
      list_item: (
        node: { key: string },
        children: React.ReactNode,
        _parent: unknown,
        styles: { list_item: ViewStyle },
      ) => (
        <View key={node.key} style={styles.list_item}>
          {React.Children.map(children, (child) =>
            typeof child === 'string' ? <Text selectable={true}>{child}</Text> : child,
          )}
        </View>
      ),
      blockquote: (
        node: { key: string },
        children: React.ReactNode,
        _parent: unknown,
        styles: { blockquote: ViewStyle },
      ) => (
        <View key={node.key} style={styles.blockquote}>
          {children}
        </View>
      ),
    }),
    [handleLinkPress],
  )

  const handleCopy = async () => {
    await Clipboard.setStringAsync(message.text)
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
        switch (intent.action) {
          case 'copyToClipboard': {
            const text = intent.params.text ?? ''
            await Clipboard.setStringAsync(text)
            setIntentCopied(true)
            setTimeout(() => setIntentCopied(false), 2000)
            break
          }
          case 'openSession': {
            const key = intent.params.key
            if (!key) break
            const label = intent.params.label
            if (label) {
              setSessionAliases((prev) => ({ ...prev, [key]: label }))
            }
            setCurrentSessionKey(key)
            setClearMessages((n) => n + 1)
            break
          }
          default:
            await Linking.openURL(intent.raw)
        }
      } catch (err) {
        console.error('Failed to execute intent:', err)
      }
    },
    [setCurrentSessionKey, setSessionAliases, setClearMessages],
  )

  // Strip intent URLs from displayed text, then linkify
  const processedText = useMemo(() => {
    const text = intents.length > 0 ? stripIntents(message.text) : message.text
    return linkifyText(text)
  }, [message.text, intents])

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.agentContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.agentBubble]}>
        {message.attachments && message.attachments.length > 0 && (
          <View style={styles.attachmentContainer}>
            {message.attachments.map((attachment, index) => (
              <Image
                key={index}
                source={{ uri: attachment.uri }}
                style={styles.attachmentImage}
                resizeMode="cover"
              />
            ))}
          </View>
        )}
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
        {message.streaming && (
          <Text style={styles.streamingIndicator} selectable={true}>
            ...
          </Text>
        )}
      </View>
      {!message.streaming && intents.length > 0 && (
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
      {!message.streaming && (
        <View style={styles.actionButtons}>
          {!isUser && (
            <TouchableOpacity style={styles.actionButton} onPress={handleCopy}>
              <Ionicons
                name={copied ? 'checkmark' : 'copy-outline'}
                size={18}
                color={theme.colors.text.secondary}
              />
            </TouchableOpacity>
          )}
          <TouchableOpacity style={styles.actionButton} onPress={handleToggleFavorite}>
            <Ionicons
              name={isFavorited ? 'heart' : 'heart-outline'}
              size={18}
              color={isFavorited ? theme.colors.primary : theme.colors.text.secondary}
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

interface Theme {
  colors: {
    background: string
    surface: string
    border: string
    text: { primary: string; secondary: string; tertiary: string; inverse: string }
    primary: string
    message: {
      user: string
      agent: string
      userText: string
      agentText: string
    }
    status: { success: string; error: string; warning: string }
  }
  spacing: { xs: number; sm: number; md: number; lg: number }
  borderRadius: { xs: number; sm: number; md: number; xxl: number }
  typography: {
    fontSize: { xs: number; sm: number; base: number; lg: number; xl: number }
    lineHeight: { normal: number }
    fontWeight: { medium: '500'; semibold: '600'; bold: '700' }
    fontFamily: { monospace: string }
  }
  isDark: boolean
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginVertical: theme.spacing.xs,
      marginHorizontal: theme.spacing.md,
    },
    userContainer: {
      alignItems: 'flex-end',
    },
    agentContainer: {
      alignItems: 'flex-start',
    },
    bubble: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.borderRadius.xxl,
    },
    userBubble: {
      maxWidth: '80%',
      backgroundColor: theme.colors.message.user,
      borderBottomRightRadius: theme.borderRadius.sm,
    },
    agentBubble: {
      width: '100%',
      backgroundColor: theme.colors.message.agent,
      borderBottomLeftRadius: theme.borderRadius.sm,
    },
    intentActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      marginTop: theme.spacing.sm,
      gap: theme.spacing.xs,
    },
    intentButton: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.xxl,
      borderWidth: 1,
      borderColor: theme.colors.primary,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    },
    intentButtonIcon: {
      marginRight: theme.spacing.xs,
    },
    intentButtonText: {
      color: theme.colors.primary,
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
    },
    actionButtons: {
      flexDirection: 'row',
      marginTop: theme.spacing.sm,
      marginLeft: theme.spacing.xs,
      gap: theme.spacing.xs,
    },
    actionButton: {
      padding: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
    },
    timestamp: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
      marginHorizontal: theme.spacing.xs,
    },
    streamingIndicator: {
      color: theme.colors.text.secondary,
      fontSize: theme.typography.fontSize.sm,
      marginTop: theme.spacing.xs,
    },
    attachmentContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.sm,
    },
    attachmentImage: {
      width: 200,
      height: 200,
      borderRadius: theme.borderRadius.md,
    },
  })

const createMarkdownStyles = (theme: Theme, isUser: boolean) => {
  const textColor = isUser ? theme.colors.message.userText : theme.colors.message.agentText

  return {
    body: {
      color: textColor,
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
    },
    text: {
      color: textColor,
    },
    heading1: {
      color: textColor,
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    heading2: {
      color: textColor,
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
    },
    heading3: {
      color: textColor,
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: theme.spacing.sm,
      color: textColor,
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
    },
    strong: {
      fontWeight: theme.typography.fontWeight.bold,
      color: textColor,
    },
    em: {
      fontStyle: 'italic' as const,
      color: textColor,
    },
    code_inline: {
      backgroundColor: isUser
        ? 'rgba(0, 0, 0, 0.15)'
        : theme.isDark
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.1)',
      color: textColor,
      paddingHorizontal: theme.spacing.xs,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.xs,
      fontFamily: 'Courier',
      fontSize: theme.typography.fontSize.sm,
    },
    fence: {
      backgroundColor: isUser
        ? 'rgba(0, 0, 0, 0.15)'
        : theme.isDark
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.1)',
      color: textColor,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      fontFamily: 'Courier',
      fontSize: theme.typography.fontSize.sm,
      marginVertical: theme.spacing.sm,
    },
    code_block: {
      backgroundColor: isUser
        ? 'rgba(0, 0, 0, 0.15)'
        : theme.isDark
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.1)',
      color: textColor,
      padding: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      fontFamily: 'Courier',
      fontSize: theme.typography.fontSize.sm,
      marginVertical: theme.spacing.sm,
    },
    blockquote: {
      backgroundColor: isUser
        ? 'rgba(0, 0, 0, 0.1)'
        : theme.isDark
          ? 'rgba(255, 255, 255, 0.05)'
          : 'rgba(0, 0, 0, 0.05)',
      borderLeftColor: textColor,
      borderLeftWidth: 3,
      paddingLeft: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      marginVertical: theme.spacing.sm,
    },
    bullet_list: {
      marginVertical: theme.spacing.xs,
    },
    ordered_list: {
      marginVertical: theme.spacing.xs,
    },
    list_item: {
      color: textColor,
      marginVertical: theme.spacing.xs / 2,
    },
    bullet_list_icon: {
      color: textColor,
      marginLeft: theme.spacing.xs,
      marginRight: theme.spacing.sm,
    },
    ordered_list_icon: {
      color: textColor,
      marginLeft: theme.spacing.xs,
      marginRight: theme.spacing.sm,
    },
    link: {
      color: isUser && !theme.isDark ? '#FFFFFF' : theme.colors.primary,
      textDecorationLine: 'underline' as const,
      fontWeight: theme.typography.fontWeight.medium,
    },
    hr: {
      backgroundColor: textColor,
      height: 1,
      opacity: 0.3,
      marginVertical: theme.spacing.md,
    },
    table: {
      borderWidth: 1,
      borderColor: textColor,
      borderRadius: theme.borderRadius.sm,
      marginVertical: theme.spacing.sm,
    },
    thead: {
      backgroundColor: isUser
        ? 'rgba(0, 0, 0, 0.1)'
        : theme.isDark
          ? 'rgba(255, 255, 255, 0.05)'
          : 'rgba(0, 0, 0, 0.05)',
    },
    tr: {
      borderBottomWidth: 1,
      borderColor: textColor,
      flexDirection: 'row' as const,
    },
    th: {
      flex: 1,
      padding: theme.spacing.sm,
      color: textColor,
      fontWeight: theme.typography.fontWeight.bold,
    },
    td: {
      flex: 1,
      padding: theme.spacing.sm,
      color: textColor,
    },
  }
}
