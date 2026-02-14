import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, StyleSheet, View } from 'react-native'

import type { MissionSubtask } from '../../store/missionTypes'
import { useTheme } from '../../theme'
import { Text } from '../ui'

interface SubtaskTimelineProps {
  subtasks: MissionSubtask[]
}

export function SubtaskTimeline({ subtasks }: SubtaskTimelineProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()

  const getIcon = (status: MissionSubtask['status']): keyof typeof Ionicons.glyphMap => {
    switch (status) {
      case 'completed':
        return 'checkmark-circle'
      case 'in_progress':
        return 'ellipse'
      case 'error':
        return 'alert-circle'
      case 'idle':
        return 'pause-circle'
      case 'stopped':
        return 'stop-circle'
      case 'archived':
        return 'archive'
      default:
        return 'ellipse-outline'
    }
  }

  const getColor = (status: MissionSubtask['status']): string => {
    switch (status) {
      case 'completed':
        return theme.colors.status.success
      case 'in_progress':
        return theme.colors.primary
      case 'error':
        return theme.colors.status.error
      case 'idle':
        return theme.colors.status.warning
      case 'stopped':
      case 'archived':
        return theme.colors.text.tertiary
      default:
        return theme.colors.text.tertiary
    }
  }

  const styles = StyleSheet.create({
    container: {
      gap: 0,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    lineColumn: {
      width: 24,
      alignItems: 'center',
    },
    line: {
      width: 2,
      flex: 1,
      minHeight: 16,
    },
    content: {
      flex: 1,
      paddingLeft: theme.spacing.sm,
      paddingBottom: theme.spacing.md,
    },
    description: {
      marginTop: 2,
    },
    result: {
      marginTop: theme.spacing.xs,
    },
    subagentRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
      paddingVertical: 2,
      paddingHorizontal: theme.spacing.sm,
      backgroundColor: theme.isDark ? 'rgba(100, 140, 255, 0.06)' : 'rgba(60, 100, 240, 0.04)',
      borderRadius: theme.borderRadius.sm,
    },
    subagentTask: {
      flex: 1,
    },
  })

  return (
    <View style={styles.container}>
      {subtasks.map((subtask, index) => {
        const color = getColor(subtask.status)
        const isLast = index === subtasks.length - 1
        const subagents = subtask.subagents ?? []
        return (
          <View key={subtask.id} style={styles.row}>
            <View style={styles.lineColumn}>
              <Ionicons name={getIcon(subtask.status)} size={20} color={color} />
              {!isLast && <View style={[styles.line, { backgroundColor: theme.colors.border }]} />}
            </View>
            <View style={styles.content}>
              <Text
                variant="body"
                style={{
                  color:
                    subtask.status === 'completed'
                      ? theme.colors.text.secondary
                      : theme.colors.text.primary,
                }}
              >
                {subtask.title}
              </Text>
              {subtask.description && (
                <Text variant="caption" color="tertiary" style={styles.description}>
                  {subtask.description}
                </Text>
              )}
              {subtask.result && (
                <Text variant="caption" color="secondary" style={styles.result}>
                  {subtask.result}
                </Text>
              )}
              {subagents.map((sa) => (
                <View key={sa.runId} style={styles.subagentRow}>
                  <Ionicons name="git-branch-outline" size={12} color={theme.colors.primary} />
                  <Text
                    variant="caption"
                    numberOfLines={1}
                    style={[styles.subagentTask, { color: theme.colors.text.secondary }]}
                  >
                    {sa.task}
                  </Text>
                  {sa.status === 'running' ? (
                    <ActivityIndicator size="small" color={theme.colors.text.secondary} />
                  ) : (
                    <Ionicons
                      name={sa.status === 'error' ? 'alert-circle' : 'checkmark-circle'}
                      size={12}
                      color={
                        sa.status === 'error'
                          ? theme.colors.status.error
                          : theme.colors.status.success
                      }
                    />
                  )}
                  <Text
                    variant="caption"
                    style={{
                      color:
                        sa.status === 'running'
                          ? theme.colors.text.secondary
                          : sa.status === 'error'
                            ? theme.colors.status.error
                            : theme.colors.status.success,
                    }}
                  >
                    {sa.status === 'running'
                      ? t('missions.subagents.running')
                      : sa.status === 'error'
                        ? t('missions.subagents.error')
                        : t('missions.subagents.completed')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )
      })}
    </View>
  )
}
