import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import type { MissionSubtask } from '../../store/missionTypes'
import { useTheme } from '../../theme'
import { Text } from '../ui'

interface SubtaskTimelineProps {
  subtasks: MissionSubtask[]
}

export function SubtaskTimeline({ subtasks }: SubtaskTimelineProps) {
  const { theme } = useTheme()

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
  })

  return (
    <View style={styles.container}>
      {subtasks.map((subtask, index) => {
        const color = getColor(subtask.status)
        const isLast = index === subtasks.length - 1
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
            </View>
          </View>
        )
      })}
    </View>
  )
}
