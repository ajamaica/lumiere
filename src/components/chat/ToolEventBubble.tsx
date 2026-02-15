import { Ionicons } from '@expo/vector-icons'
import { useAtomValue, useSetAtom } from 'jotai'
import React, { useCallback, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  LayoutAnimation,
  Platform,
  StyleSheet,
  TouchableOpacity,
  UIManager,
  View,
} from 'react-native'

import { canvasContentAtom, canvasVisibleAtom } from '../../store'
import { useTheme } from '../../theme'
import { Theme } from '../../theme/themes'
import { Text } from '../ui'
import type { ToolEventMessage } from './chatMessageTypes'

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true)
}

const TOOL_ICONS: Record<string, string> = {
  // Web tools
  web_fetch: 'globe-outline',
  web_search: 'search-outline',
  // File system tools
  read: 'document-text-outline',
  write: 'create-outline',
  edit: 'pencil-outline',
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
  gateway: 'server-outline',
  // Session tools
  sessions_list: 'list-outline',
  sessions_history: 'time-outline',
  sessions_send: 'send-outline',
  sessions_spawn: 'git-branch-outline',
  agents_list: 'people-outline',
  session_status: 'analytics-outline',
  // Memory tools
  memory_search: 'library-outline',
  memory_get: 'bookmark-outline',
  // Messaging & media tools
  message: 'chatbubble-outline',
  image: 'image-outline',
  tts: 'volume-high-outline',
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
  read: ['path', 'file'],
  write: ['path', 'file'],
  edit: ['path', 'file'],
  file_read: ['path', 'file'],
  file_write: ['path', 'file'],
  apply_patch: ['path', 'file'],
  browser: ['action', 'url'],
  canvas: ['action', 'title'],
  sessions_send: ['target', 'session'],
  sessions_spawn: ['target', 'agent'],
  agents_list: ['filter'],
  memory_search: ['query'],
  memory_get: ['key', 'id'],
  message: ['target', 'channel', 'text'],
  image: ['url', 'path'],
  tts: ['text'],
  gateway: ['action'],
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

/** Truncate long string values in tool input for display. */
function truncateValue(value: unknown, maxLen = 200): unknown {
  if (typeof value === 'string' && value.length > maxLen) {
    return value.slice(0, maxLen) + '…'
  }
  if (Array.isArray(value)) {
    return value.map((v) => truncateValue(v, maxLen))
  }
  if (value && typeof value === 'object') {
    const truncated: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(value)) {
      truncated[k] = truncateValue(v, maxLen)
    }
    return truncated
  }
  return value
}

interface ToolEventBubbleProps {
  message: ToolEventMessage
}

export function ToolEventBubble({ message }: ToolEventBubbleProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(theme), [theme])
  const canvasContent = useAtomValue(canvasContentAtom)
  const setCanvasVisible = useSetAtom(canvasVisibleAtom)
  const [expanded, setExpanded] = useState(false)

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

  const isCanvas = message.toolName === 'canvas'
  const canvasHasContent = isCanvas && canvasContent !== null
  const hasInput = message.toolInput && Object.keys(message.toolInput).length > 0

  const handlePress = useCallback(() => {
    if (canvasHasContent) {
      setCanvasVisible(true)
    } else if (hasInput) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut)
      setExpanded((prev) => !prev)
    }
  }, [canvasHasContent, setCanvasVisible, hasInput])

  const formattedInput = useMemo(() => {
    if (!expanded || !message.toolInput) return null
    try {
      return JSON.stringify(truncateValue(message.toolInput), null, 2)
    } catch {
      return null
    }
  }, [expanded, message.toolInput])

  return (
    <TouchableOpacity
      style={[
        styles.container,
        canvasHasContent && styles.canvasContainer,
        expanded && styles.expandedContainer,
      ]}
      onPress={handlePress}
      activeOpacity={hasInput || canvasHasContent ? 0.7 : 1}
      accessible={true}
      accessibilityLabel={`${t('missions.toolEvent')}: ${description}${canvasHasContent ? `. ${t('canvas.tapToOpen')}` : ''}`}
      accessibilityRole={hasInput || canvasHasContent ? 'button' : 'text'}
    >
      <View style={styles.headerRow}>
        <Ionicons
          name={iconName as keyof typeof Ionicons.glyphMap}
          size={16}
          color={isCanvas && canvasHasContent ? theme.colors.primary : theme.colors.text.secondary}
        />
        <View style={styles.textContainer}>
          <Text variant="caption" style={styles.description} numberOfLines={1}>
            {description}
          </Text>
          {detail && !expanded ? (
            <Text variant="caption" style={styles.detail} numberOfLines={1}>
              {detail}
            </Text>
          ) : null}
        </View>
        {canvasHasContent && (
          <Ionicons name="open-outline" size={14} color={theme.colors.primary} />
        )}
        {hasInput && !canvasHasContent && (
          <Ionicons
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={14}
            color={theme.colors.text.secondary}
          />
        )}
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
      {expanded && formattedInput && (
        <View style={styles.inputContainer}>
          <Text style={styles.inputText}>{formattedInput}</Text>
        </View>
      )}
    </TouchableOpacity>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      marginVertical: 2,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.04)' : 'rgba(0, 0, 0, 0.03)',
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.05)',
    },
    expandedContainer: {
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.06)' : 'rgba(0, 0, 0, 0.04)',
    },
    canvasContainer: {
      borderColor: theme.isDark ? `${theme.colors.primary}33` : `${theme.colors.primary}22`,
      backgroundColor: theme.isDark ? `${theme.colors.primary}0D` : `${theme.colors.primary}08`,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
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
    inputContainer: {
      marginTop: theme.spacing.xs,
      padding: theme.spacing.sm,
      backgroundColor: theme.isDark ? 'rgba(0, 0, 0, 0.3)' : 'rgba(0, 0, 0, 0.05)',
      borderRadius: theme.borderRadius.sm,
    },
    inputText: {
      fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
      fontSize: 11,
      color: theme.colors.text.secondary,
      lineHeight: 16,
    },
  })
