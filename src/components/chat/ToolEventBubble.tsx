import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import { useTheme } from '../../theme'
import { Theme } from '../../theme/themes'
import { Text } from '../ui'
import type { ToolEventMessage } from './chatMessageTypes'

const TOOL_ICONS: Record<string, string> = {
  web_fetch: 'globe-outline',
  code_execution: 'code-slash-outline',
  file_read: 'document-text-outline',
  file_write: 'create-outline',
  search: 'search-outline',
}

const DEFAULT_ICON = 'build-outline'

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
      <Text variant="caption" style={styles.description} numberOfLines={1}>
        {description}
      </Text>
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
    description: {
      flex: 1,
      color: theme.colors.text.secondary,
    },
    statusContainer: {
      width: 20,
      height: 20,
      alignItems: 'center',
      justifyContent: 'center',
    },
  })
