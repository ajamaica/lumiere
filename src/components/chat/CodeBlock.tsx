import React, { useMemo } from 'react'
import { Platform, ScrollView, StyleSheet, Text, View } from 'react-native'
import SyntaxHighlighter from 'react-native-syntax-highlighter'
import { atomOneDark, atomOneLight } from 'react-syntax-highlighter/dist/esm/styles/hljs'

import { useTheme } from '../../theme'

interface CodeBlockProps {
  code: string
  language?: string
  isUser: boolean
}

export function CodeBlock({ code, language, isUser }: CodeBlockProps) {
  const { theme } = useTheme()

  const highlighterStyle = useMemo(
    () => (theme.isDark || isUser ? atomOneDark : atomOneLight),
    [theme.isDark, isUser],
  )

  const styles = useMemo(() => createStyles(theme, isUser), [theme, isUser])

  const trimmedCode = code.replace(/\n$/, '')

  return (
    <View style={styles.container}>
      {language ? (
        <View style={styles.languageBadge}>
          <Text style={styles.languageText}>{language}</Text>
        </View>
      ) : null}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.scrollView}>
        <SyntaxHighlighter
          language={language || 'text'}
          style={highlighterStyle}
          fontFamily={Platform.OS === 'ios' ? 'Menlo' : 'monospace'}
          fontSize={theme.typography.fontSize.sm}
          PreTag={View}
          CodeTag={View}
        >
          {trimmedCode}
        </SyntaxHighlighter>
      </ScrollView>
    </View>
  )
}

interface Theme {
  colors: {
    text: { primary: string; secondary: string }
    message: { userText: string; agentText: string }
  }
  spacing: { xs: number; sm: number; md: number }
  borderRadius: { sm: number; md: number }
  typography: {
    fontSize: { xs: number; sm: number }
    fontWeight: { medium: '500' }
  }
  isDark: boolean
}

const createStyles = (theme: Theme, isUser: boolean) =>
  StyleSheet.create({
    container: {
      borderRadius: theme.borderRadius.md,
      marginVertical: theme.spacing.sm,
      overflow: 'hidden',
      backgroundColor: isUser
        ? 'rgba(0, 0, 0, 0.2)'
        : theme.isDark
          ? 'rgba(0, 0, 0, 0.3)'
          : 'rgba(0, 0, 0, 0.05)',
    },
    languageBadge: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs / 2,
      backgroundColor: isUser
        ? 'rgba(0, 0, 0, 0.15)'
        : theme.isDark
          ? 'rgba(255, 255, 255, 0.08)'
          : 'rgba(0, 0, 0, 0.06)',
    },
    languageText: {
      fontSize: theme.typography.fontSize.xs,
      color: isUser
        ? 'rgba(255, 255, 255, 0.7)'
        : theme.isDark
          ? 'rgba(255, 255, 255, 0.5)'
          : 'rgba(0, 0, 0, 0.5)',
      fontWeight: theme.typography.fontWeight.medium,
    },
    scrollView: {
      padding: theme.spacing.md,
    },
  })
