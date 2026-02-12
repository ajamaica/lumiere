import React, { useMemo } from 'react'
import { Pressable, ScrollView, Text, TextStyle, View, ViewStyle } from 'react-native'

import { openBrowser } from '../../services/intents'
import { useTheme } from '../../theme'
import { logger } from '../../utils/logger'

const chatLogger = logger.create('ChatMessage')

export function useMarkdownRules() {
  const { theme } = useTheme()

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
        node: { key: string; content: string },
        _children: unknown,
        _parent: unknown,
        styles: { fence: TextStyle },
      ) => (
        <ScrollView
          key={node.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            marginVertical: (styles.fence as Record<string, number>).marginVertical ?? 0,
          }}
        >
          <Text style={[styles.fence, { marginVertical: 0 }]} selectable={true}>
            {node.content}
          </Text>
        </ScrollView>
      ),
      code_block: (
        node: { key: string; content: string },
        _children: unknown,
        _parent: unknown,
        styles: { code_block: TextStyle },
      ) => (
        <ScrollView
          key={node.key}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={{
            marginVertical: (styles.code_block as Record<string, number>).marginVertical ?? 0,
          }}
        >
          <Text style={[styles.code_block, { marginVertical: 0 }]} selectable={true}>
            {node.content}
          </Text>
        </ScrollView>
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

  return { markdownRules, handleLinkPress }
}
