import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useTheme } from '../../theme'
import { Theme } from '../../theme/themes'
import { Text } from '../ui'
import type { ToolEventMessage } from './chatMessageTypes'

const TOOL_ICONS: Record<string, string> = {
  // Web tools
  web_fetch: 'globe-outline',
  web_search: 'search-outline',
  // File system tools
  grep: 'search-outline',
  find: 'folder-open-outline',
  ls: 'folder-outline',
  file_read: 'document-text-outline',
  file_write: 'create-outline',
  apply_patch: 'git-merge-outline',
  // Execution tools
  exec: 'terminal-outline',
  code_execution: 'code-slash-outline',
  process: 'cog-outline',
  // Browser & UI tools
  browser: 'browsers-outline',
  canvas: 'easel-outline',
  // Infrastructure tools
  nodes: 'git-network-outline',
  cron: 'timer-outline',
  // Session tools
  sessions_list: 'list-outline',
  sessions_history: 'time-outline',
  sessions_send: 'send-outline',
  sessions_spawn: 'git-branch-outline',
  // Memory tools
  memory_search: 'library-outline',
  memory_get: 'bookmark-outline',
  // Legacy / generic
  search: 'search-outline',
}

const DEFAULT_ICON = 'build-outline'

/** Keys to look for in toolInput to display as a detail subtitle, in priority order per tool. */
const TOOL_DETAIL_KEYS: Record<string, string[]> = {
  web_fetch: ['url'],
  web_search: ['query'],
  grep: ['pattern', 'query'],
  find: ['pattern', 'glob', 'path'],
  ls: ['path'],
  exec: ['command', 'cmd'],
  code_execution: ['code', 'command'],
  file_read: ['path', 'file'],
  file_write: ['path', 'file'],
  apply_patch: ['path', 'file'],
  browser: ['action', 'url'],
  sessions_send: ['target', 'session'],
  sessions_spawn: ['target', 'agent'],
  memory_search: ['query'],
  memory_get: ['key', 'id'],
}

function getToolDetail(toolName: string, toolInput?: Record<string, unknown>): string | undefined {
  if (!toolInput) return undefined
  const keys = TOOL_DETAIL_KEYS[toolName]
  if (keys) {
    for (const key of keys) {
      const value = toolInput[key]
      if (typeof value === 'string' && value.length > 0) return value
    }
  }
  return undefined
}

interface ToolEventBubbleProps {
  message: ToolEventMessage
}

export function ToolEventBubble({ message }: ToolEventBubbleProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(theme), [theme])

  const iconName = TOOL_ICONS[message.toolName] ?? DEFAULT_ICON

  const description = t(`missions.toolEvents.${message.toolName}`, {
    defaultValue: t('missions.toolEvents.default', { toolName: message.toolName }),
    ...(message.toolInput ?? {}),
  })

  const detail = getToolDetail(message.toolName, message.toolInput)

  const isRunning = message.status === 'running'
  const isError = message.status === 'error'

  const statusColor = isError
    ? theme.colors.status.error
    : isRunning
      ? theme.colors.text.secondary
      : theme.colors.status.success

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityLabel={`${t('missions.toolEvent')}: ${description}`}
      accessibilityRole="text"
    >
      <Ionicons
        name={iconName as keyof typeof Ionicons.glyphMap}
        size={16}
        color={theme.colors.text.secondary}
      />
      <View style={styles.textContainer}>
        <Text variant="caption" style={styles.description} numberOfLines={1}>
          {description}
        </Text>
        {detail ? (
          <Text variant="caption" style={styles.detail} numberOfLines={1}>
            {detail}
          </Text>
        ) : null}
      </View>
      <View style={styles.statusContainer}>
        {isRunning ? (
          <ActivityIndicator size="small" color={theme.colors.text.secondary} />
        ) : (
          <Ionicons
            name={isError ? 'alert-circle' : 'checkmark-circle'}
            size={14}
            color={statusColor}
          />
        )}
      </View>
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      marginVertical: 2,
      gap: theme.spacing.sm,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
    },
    textContainer: {
      flex: 1,
    },
    description: {
      color: theme.colors.text.secondary,
    },
    detail: {
      color: theme.colors.text.secondary,
      opacity: 0.7,
      fontSize: 11,
    },
    statusContainer: {
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
