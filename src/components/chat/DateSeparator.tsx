import React, { useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'

import { useTheme } from '../../theme'
import { Theme } from '../../theme/themes'
import { Text } from '../ui'
import type { DateSeparatorItem } from './chatMessageTypes'

interface DateSeparatorProps {
  item: DateSeparatorItem
}

function formatDateLabel(date: Date, t: (key: string) => string): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const target = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const diffDays = Math.round((today.getTime() - target.getTime()) / (1000 * 60 * 60 * 24))

  if (diffDays === 0) return t('chat.dateToday')
  if (diffDays === 1) return t('chat.dateYesterday')

  return date.toLocaleDateString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

export function DateSeparator({ item }: DateSeparatorProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const styles = useMemo(() => createStyles(theme), [theme])
  const label = formatDateLabel(item.date, t)

  return (
    <View
      style={styles.container}
      accessible={true}
      accessibilityRole="text"
      accessibilityLabel={label}
    >
      <View style={styles.line} />
      <View style={styles.labelContainer}>
        <Text variant="caption" style={styles.label}>
          {label}
        </Text>
      </View>
      <View style={styles.line} />
    </View>
  )
}

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.sm,
    },
    line: {
      flex: 1,
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
    },
    labelContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.full,
      backgroundColor: theme.isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.03)',
    },
    label: {
      color: theme.colors.text.tertiary,
      fontSize: 11,
      fontWeight: '500',
    },
  })
