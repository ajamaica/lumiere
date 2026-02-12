import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, TouchableOpacity, View } from 'react-native'

import type { Mission } from '../../store/missionTypes'
import { useTheme } from '../../theme'
import { Text } from '../ui'
import { MissionStatusBadge } from './MissionStatusBadge'

interface MissionCardProps {
  mission: Mission
  onPress: () => void
}

function formatTimeAgo(
  ts: number,
  t: (key: string, opts?: Record<string, string>) => string,
): string {
  const diff = Date.now() - ts
  const minutes = Math.floor(diff / 60_000)
  if (minutes < 1) return t('missions.justNow')
  if (minutes < 60) return t('missions.minutesAgo', { count: String(minutes) })
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return t('missions.hoursAgo', { count: String(hours) })
  const days = Math.floor(hours / 24)
  return t('missions.daysAgo', { count: String(days) })
}

export function MissionCard({ mission, onPress }: MissionCardProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()

  const completedCount = mission.subtasks.filter((s) => s.status === 'completed').length
  const totalCount = mission.subtasks.length
  const progressPct = totalCount > 0 ? completedCount / totalCount : 0

  const timeAgo = useMemo(() => formatTimeAgo(mission.createdAt, t), [mission.createdAt, t])

  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: theme.spacing.sm,
    },
    titleWrap: {
      flex: 1,
      marginRight: theme.spacing.sm,
    },
    progressRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    progressBar: {
      flex: 1,
      height: 4,
      backgroundColor: theme.colors.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: 4,
      backgroundColor: theme.colors.primary,
      borderRadius: 2,
      width: `${progressPct * 100}%`,
    },
    footer: {
      marginTop: theme.spacing.sm,
    },
  })

  return (
    <TouchableOpacity
      style={styles.card}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
    >
      <View style={styles.header}>
        <View style={styles.titleWrap}>
          <Text variant="heading3" numberOfLines={2} style={{ color: theme.colors.text.primary }}>
            {mission.title}
          </Text>
        </View>
        <MissionStatusBadge status={mission.status} />
      </View>

      <Text variant="bodySmall" color="secondary" numberOfLines={2}>
        {mission.prompt}
      </Text>

      <Text
        variant="caption"
        color="tertiary"
        numberOfLines={1}
        style={{ marginTop: theme.spacing.xs, fontFamily: 'monospace', fontSize: 11 }}
      >
        {mission.sessionKey}
      </Text>

      {totalCount > 0 && (
        <View style={styles.progressRow}>
          <View style={styles.progressBar}>
            <View style={styles.progressFill} />
          </View>
          <Text variant="caption" color="secondary">
            {t('missions.progress', {
              completed: String(completedCount),
              total: String(totalCount),
            })}
          </Text>
        </View>
      )}

      <View style={styles.footer}>
        <Text variant="caption" color="tertiary">
          {timeAgo}
        </Text>
      </View>
    </TouchableOpacity>
  )
}
