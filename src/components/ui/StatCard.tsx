import React from 'react'
import { StyleSheet, Text, View, ViewProps } from 'react-native'

import { useTheme } from '../../theme'

export interface StatCardProps extends ViewProps {
  label: string
  value: string | number
  description?: string
  valueColor?: string
}

export function StatCard({
  label,
  value,
  description,
  valueColor,
  style,
  ...props
}: StatCardProps) {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    label: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    value: {
      fontSize: theme.typography.fontSize.xxxl,
      fontWeight: theme.typography.fontWeight.bold,
      color: valueColor || theme.colors.text.primary,
      marginBottom: description ? theme.spacing.xs : 0,
    },
    description: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
    },
  })

  return (
    <View
      style={[styles.card, style]}
      accessible={true}
      accessibilityLabel={`${label}: ${value}${description ? `, ${description}` : ''}`}
      {...props}
    >
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
      {description && <Text style={styles.description}>{description}</Text>}
    </View>
  )
}
