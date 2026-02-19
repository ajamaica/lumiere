import { Ionicons } from '@expo/vector-icons'
import React, { useCallback, useMemo, useState } from 'react'
import { Pressable, Text, TextStyle, View, ViewStyle } from 'react-native'

import { copyToClipboard, openBrowser } from '../../services/intents'
import { useTheme } from '../../theme'
import { logger } from '../../utils/logger'
import { createCodeBlockStyles } from './ChatMessage.styles'
import { SyntaxHighlightedCode } from './SyntaxHighlightedCode'

const chatLogger = logger.create('ChatMessage')

// Map common language identifiers to display labels
const languageLabels: Record<string, string> = {
  js: 'JavaScript',
  jsx: 'JSX',
  ts: 'TypeScript',
  tsx: 'TSX',
  py: 'Python',
  rb: 'Ruby',
  rs: 'Rust',
  go: 'Go',
  java: 'Java',
  kt: 'Kotlin',
  swift: 'Swift',
  cs: 'C#',
  cpp: 'C++',
  c: 'C',
  sh: 'Shell',
  bash: 'Bash',
  zsh: 'Zsh',
  html: 'HTML',
  css: 'CSS',
  scss: 'SCSS',
  json: 'JSON',
  yaml: 'YAML',
  yml: 'YAML',
  xml: 'XML',
  sql: 'SQL',
  md: 'Markdown',
  markdown: 'Markdown',
  php: 'PHP',
  dart: 'Dart',
  r: 'R',
  lua: 'Lua',
  vim: 'Vim',
  dockerfile: 'Dockerfile',
  graphql: 'GraphQL',
  toml: 'TOML',
  ini: 'INI',
  diff: 'Diff',
  plaintext: 'Text',
  text: 'Text',
  txt: 'Text',
}

function getLanguageLabel(sourceInfo?: string): string | null {
  if (!sourceInfo) return null
  const lang = sourceInfo.trim().toLowerCase()
  if (!lang) return null
  return languageLabels[lang] || lang.charAt(0).toUpperCase() + lang.slice(1)
}

function CodeBlockCopyButton({ content }: { content: string }) {
  const { theme } = useTheme()
  const [copied, setCopied] = useState(false)
  const codeStyles = useMemo(() => createCodeBlockStyles(theme), [theme])

  const handleCopy = useCallback(async () => {
    await copyToClipboard(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }, [content])

  return (
    <Pressable
      onPress={handleCopy}
      style={codeStyles.copyButton}
      accessibilityRole="button"
      accessibilityLabel={copied ? 'Copied' : 'Copy code'}
    >
      <Ionicons
        name={copied ? 'checkmark' : 'copy-outline'}
        size={14}
        color={theme.colors.text.tertiary}
      />
      <Text style={codeStyles.copyButtonText}>{copied ? 'Copied!' : 'Copy'}</Text>
    </Pressable>
  )
}

export function useMarkdownRules() {
  const { theme } = useTheme()
  const codeStyles = useMemo(() => createCodeBlockStyles(theme), [theme])

  const handleLinkPress = React.useCallback(
    async (url: string) => {
      chatLogger.debug('Link pressed', url)
      try {
        await openBrowser(url, theme.colors.primary)
      } catch (err) {
        chatLogger.logError('Failed to open URL', err)
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
        node: { key: string; content: string; sourceInfo?: string },
        _children: unknown,
        _parent: unknown,
        styles: { fence: TextStyle },
      ) => {
        const language = getLanguageLabel(node.sourceInfo)
        const content =
          typeof node.content === 'string' && node.content.endsWith('\n')
            ? node.content.slice(0, -1)
            : node.content
        return (
          <View
            key={node.key}
            style={[
              codeStyles.codeBlockContainer,
              {
                marginVertical: (styles.fence as Record<string, number>).marginVertical ?? 0,
              },
            ]}
          >
            <View style={codeStyles.codeBlockHeader}>
              <Text style={codeStyles.codeBlockLanguage}>{language || 'Code'}</Text>
              <CodeBlockCopyButton content={content} />
            </View>
            <SyntaxHighlightedCode code={content} language={node.sourceInfo} />
          </View>
        )
      },
      code_block: (
        node: { key: string; content: string },
        _children: unknown,
        _parent: unknown,
        styles: { code_block: TextStyle },
      ) => {
        const content =
          typeof node.content === 'string' && node.content.endsWith('\n')
            ? node.content.slice(0, -1)
            : node.content
        return (
          <View
            key={node.key}
            style={[
              codeStyles.codeBlockContainer,
              {
                marginVertical: (styles.code_block as Record<string, number>).marginVertical ?? 0,
              },
            ]}
          >
            <View style={codeStyles.codeBlockHeader}>
              <Text style={codeStyles.codeBlockLanguage}>Code</Text>
              <CodeBlockCopyButton content={content} />
            </View>
            <SyntaxHighlightedCode code={content} showLineNumbers={false} />
          </View>
        )
      },
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
          <Text
            key={node.key}
            style={styles.link}
            selectable={true}
            onPress={() => handleLinkPress(url)}
          >
            {children}
          </Text>
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
        <View key={node.key}>
          {React.Children.map(children, (child) =>
            typeof child === 'string' ? (
              <Text selectable={true} style={styles.list_item}>
                {child}
              </Text>
            ) : (
              child
            ),
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
    [handleLinkPress, codeStyles],
  )

  return { markdownRules, handleLinkPress }
}
