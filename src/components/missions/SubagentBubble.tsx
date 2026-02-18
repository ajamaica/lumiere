import { Ionicons } from '@expo/vector-icons'
import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import type { SubagentPersonality, SubtaskSubagent } from '../../store/missionTypes'
import { useTheme } from '../../theme'
import { Theme } from '../../theme/themes'
import { Text } from '../ui'

const PERSONALITY_ICONS: Record<SubagentPersonality, keyof typeof Ionicons.glyphMap> = {
  general: 'ellipse-outline',
  philosophical: 'book-outline',
  engineering: 'construct-outline',
  creative: 'color-palette-outline',
  scientific: 'flask-outline',
  critical: 'shield-outline',
  strategic: 'compass-outline',
}

interface SubagentBubbleProps {
  subagent: SubtaskSubagent
}

export function SubagentBubble({ subagent }: SubagentBubbleProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(theme), [theme])

  const isRunning = subagent.status === 'running'
  const isError = subagent.status === 'error'

  const statusColor = isError
    ? theme.colors.status.error
    : isRunning
      ? theme.colors.text.secondary
      : theme.colors.status.success

  const statusLabel = isRunning
    ? t('missions.subagents.running')
    : isError
      ? t('missions.subagents.error')
      : t('missions.subagents.completed')

  const personality = subagent.personality ?? 'general'
  const personalityIcon = PERSONALITY_ICONS[personality]
  const personalityLabel = t(`missions.subagents.personalities.${personality}`)

  return (
    <View style={styles.container} accessible accessibilityRole="text">
      <View style={styles.headerRow}>
        <Ionicons name="git-branch-outline" size={16} color={theme.colors.primary} />
        <Text variant="caption" style={styles.label}>
          {t('missions.subagents.label')}
        </Text>
        <View style={styles.personalityBadge}>
          <Ionicons name={personalityIcon} size={12} color={theme.colors.text.secondary} />
          <Text variant="caption" style={styles.personalityText}>
            {personalityLabel}
          </Text>
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
          <Text variant="caption" style={{ color: statusColor, marginLeft: 4 }}>
            {statusLabel}
          </Text>
        </View>
      </View>
      <Text variant="caption" style={styles.task} numberOfLines={2}>
        {subagent.task}
      </Text>
      {subagent.result && (
        <Text variant="caption" style={styles.result} numberOfLines={4}>
          {subagent.result}
        </Text>
      )}
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      marginVertical: 2,
      backgroundColor: theme.isDark ? 'rgba(100, 140, 255, 0.06)' : 'rgba(60, 100, 240, 0.04)',
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.isDark ? 'rgba(100, 140, 255, 0.12)' : 'rgba(60, 100, 240, 0.10)',
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginBottom: 4,
    },
    label: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    personalityBadge: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 3,
      backgroundColor: theme.isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: 6,
      paddingVertical: 2,
      flex: 1,
    },
    personalityText: {
      color: theme.colors.text.secondary,
      fontSize: 11,
    },
    statusContainer: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    task: {
      color: theme.colors.text.secondary,
    },
    result: {
      color: theme.colors.text.primary,
      marginTop: theme.spacing.xs,
      fontStyle: 'italic',
    },
  })
