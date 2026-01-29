import React, { useMemo } from 'react'
import { StyleSheet, Text, View } from 'react-native'
import Markdown from 'react-native-markdown-display'

import { useTheme } from '../../theme'

export interface Message {
  id: string
  text: string
  sender: 'user' | 'agent'
  timestamp: Date
  streaming?: boolean
}

interface ChatMessageProps {
  message: Message
}

export function ChatMessage({ message }: ChatMessageProps) {
  const { theme } = useTheme()
  const isUser = message.sender === 'user'

  const styles = useMemo(() => createStyles(theme), [theme])
  const markdownStyles = useMemo(
    () => createMarkdownStyles(theme, isUser),
    [theme, isUser],
  )

  return (
    <View style={[styles.container, isUser ? styles.userContainer : styles.agentContainer]}>
      <View style={[styles.bubble, isUser ? styles.userBubble : styles.agentBubble]}>
        <Markdown style={markdownStyles}>{message.text}</Markdown>
        {message.streaming && <Text style={styles.streamingIndicator}>...</Text>}
      </View>
      <Text style={styles.timestamp}>
        {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </Text>
    </View>
  )
}

const createStyles = (theme: any) =>
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
      maxWidth: '80%',
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 2,
      borderRadius: theme.borderRadius.xxl,
    },
    userBubble: {
      backgroundColor: theme.colors.message.user,
      borderBottomRightRadius: theme.borderRadius.sm,
    },
    agentBubble: {
      backgroundColor: theme.colors.message.agent,
      borderBottomLeftRadius: theme.borderRadius.sm,
    },
    text: {
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
    },
    userText: {
      color: theme.colors.message.userText,
    },
    agentText: {
      color: theme.colors.message.agentText,
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
  })

const createMarkdownStyles = (theme: any, isUser: boolean) => {
  const textColor = isUser ? theme.colors.message.userText : theme.colors.message.agentText
  const backgroundColor = isUser ? theme.colors.message.user : theme.colors.message.agent

  return {
    body: {
      color: textColor,
      fontSize: theme.typography.fontSize.base,
      lineHeight: theme.typography.fontSize.base * theme.typography.lineHeight.normal,
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
      fontStyle: 'italic',
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
      color: textColor,
      textDecorationLine: 'underline',
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
      flexDirection: 'row',
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
