import { Platform, StyleSheet } from 'react-native'

import type { ChatFontFamily, ChatFontSize } from '../../store'
import { Theme } from '../../theme'
import { webStyle } from '../../utils/platform'

/** Map chat font size preference to a pixel value */
const CHAT_FONT_SIZES: Record<ChatFontSize, number> = {
  small: 14,
  medium: 16,
  large: 20,
}

/** Map chat font family preference to a platform font name */
const CHAT_FONT_FAMILIES: Record<ChatFontFamily, string> = {
  system: 'System',
  serif: Platform.OS === 'ios' ? 'Georgia' : 'serif',
  monospace: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
}

export function getChatFontSize(size: ChatFontSize): number {
  return CHAT_FONT_SIZES[size]
}

export function getChatFontFamily(family: ChatFontFamily): string {
  return CHAT_FONT_FAMILIES[family]
}

export const createCodeBlockStyles = (theme: Theme) =>
  StyleSheet.create({
    codeBlockContainer: {
      borderRadius: theme.borderRadius.lg,
      overflow: 'hidden',
      backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.06)',
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    codeBlockHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs + 2,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.08)',
    },
    codeBlockLanguage: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.tertiary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    copyButton: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    },
    copyButtonText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      fontWeight: theme.typography.fontWeight.medium,
    },
    codeBlockScrollView: {
      flexGrow: 0,
    },
    codeContent: {
      padding: theme.spacing.md,
    },
    codeLine: {
      flexDirection: 'row',
    },
    lineNumber: {
      color: theme.colors.text.tertiary,
      textAlign: 'right',
      paddingRight: theme.spacing.md,
      opacity: 0.5,
    },
  })

export const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      marginVertical: theme.spacing.xs,
      marginHorizontal: theme.spacing.md,
      ...webStyle({ userSelect: 'text' as const }),
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
      maxWidth: '100%',
      backgroundColor: theme.colors.message.user,
      borderBottomRightRadius: theme.borderRadius.sm,
      ...webStyle({ userSelect: 'text' as const }),
    },
    userBubbleWrapper: {
      maxWidth: '100%',
      borderRadius: theme.borderRadius.xxl,
      borderBottomRightRadius: theme.borderRadius.sm,
      overflow: 'hidden',
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 8,
      elevation: 4,
      ...webStyle({ userSelect: 'text' as const }),
    },
    userGradientBubble: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 2,
      ...webStyle({ userSelect: 'text' as const }),
    },
    agentBubble: {
      width: '100%',
      backgroundColor: 'transparent',
      borderRadius: 0,
      paddingHorizontal: 0,
      ...webStyle({ userSelect: 'text' as const }),
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
    linkPreviews: {
      marginTop: theme.spacing.sm,
      gap: theme.spacing.xs,
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

export const createMarkdownStyles = (
  theme: Theme,
  isUser: boolean,
  chatFontSize: ChatFontSize = 'medium',
  chatFontFamily: ChatFontFamily = 'system',
) => {
  const textColor = isUser ? theme.colors.message.userText : theme.colors.message.agentText
  const fontSize = getChatFontSize(chatFontSize)
  const fontFamily = getChatFontFamily(chatFontFamily)
  const fontFamilyStyle = chatFontFamily !== 'system' ? { fontFamily } : {}

  return {
    body: {
      color: textColor,
      fontSize,
      lineHeight: fontSize * theme.typography.lineHeight.normal,
      flexShrink: 1,
      ...fontFamilyStyle,
      ...webStyle({ userSelect: 'text' as const }),
    },
    text: {
      color: textColor,
      ...fontFamilyStyle,
    },
    heading1: {
      color: textColor,
      fontSize: fontSize + 4,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      ...fontFamilyStyle,
    },
    heading2: {
      color: textColor,
      fontSize: fontSize + 2,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      ...fontFamilyStyle,
    },
    heading3: {
      color: textColor,
      fontSize,
      fontWeight: theme.typography.fontWeight.bold,
      marginTop: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
      ...fontFamilyStyle,
    },
    paragraph: {
      marginTop: 0,
      marginBottom: theme.spacing.sm,
      color: textColor,
      fontSize,
      lineHeight: fontSize * theme.typography.lineHeight.normal,
      ...fontFamilyStyle,
    },
    strong: {
      fontWeight: theme.typography.fontWeight.bold,
      color: textColor,
      ...fontFamilyStyle,
    },
    em: {
      fontStyle: 'italic' as const,
      color: textColor,
      ...fontFamilyStyle,
    },
    code_inline: {
      backgroundColor: isUser
        ? 'rgba(0, 0, 0, 0.15)'
        : theme.isDark
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(0, 0, 0, 0.1)',
      color: isUser ? textColor : theme.colors.text.primary,
      paddingHorizontal: theme.spacing.xs + 2,
      paddingVertical: 2,
      borderRadius: theme.borderRadius.sm,
      fontFamily: theme.typography.fontFamily.monospace,
      fontSize: theme.typography.fontSize.sm,
    },
    fence: {
      backgroundColor: 'transparent',
      color: isUser ? textColor : theme.colors.text.primary,
      padding: theme.spacing.md,
      borderRadius: 0,
      fontFamily: theme.typography.fontFamily.monospace,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
      marginVertical: theme.spacing.sm,
    },
    code_block: {
      backgroundColor: 'transparent',
      color: isUser ? textColor : theme.colors.text.primary,
      padding: theme.spacing.md,
      borderRadius: 0,
      fontFamily: theme.typography.fontFamily.monospace,
      fontSize: theme.typography.fontSize.sm,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.relaxed,
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
      marginTop: theme.spacing.xs,
      ...fontFamilyStyle,
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
      color: isUser && !theme.isDark ? theme.colors.text.inverse : theme.colors.primary,
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
