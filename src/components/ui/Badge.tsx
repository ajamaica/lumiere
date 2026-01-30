import React from 'react'
import { StyleSheet, Text, View, ViewProps } from 'react-native'

import { useTheme } from '../../theme'

type BadgeVariant = 'default' | 'primary' | 'success' | 'error' | 'warning' | 'info'

export interface BadgeProps extends ViewProps {
  label: string
  variant?: BadgeVariant
}

export function Badge({ label, variant = 'default', style, ...props }: BadgeProps) {
  const { theme } = useTheme()

  const colorMap: Record<BadgeVariant, { bg: string; text: string }> = {
    default: {
      bg: theme.colors.background,
      text: theme.colors.text.secondary,
    },
    primary: {
      bg: theme.colors.primary + '20',
      text: theme.colors.primary,
    },
    success: {
      bg: theme.colors.status.success + '20',
      text: theme.colors.status.success,
    },
    error: {
      bg: theme.colors.status.error + '20',
      text: theme.colors.status.error,
    },
    warning: {
      bg: theme.colors.status.warning + '20',
      text: theme.colors.status.warning,
    },
    info: {
      bg: theme.colors.status.info + '20',
      text: theme.colors.status.info,
    },
  }

  const colors = colorMap[variant]

  const styles = StyleSheet.create({
    badge: {
      backgroundColor: colors.bg,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderWidth: 1,
      borderColor: colors.text + '30',
      alignSelf: 'flex-start',
    },
    text: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: colors.text,
      fontFamily: theme.typography.fontFamily.monospace,
    },
  })

  return (
    <View style={[styles.badge, style]} {...props}>
      <Text style={styles.text}>{label}</Text>
    </View>
  )
}
