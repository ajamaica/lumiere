import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, TouchableOpacityProps } from 'react-native'

import { useTheme } from '../../theme'

export interface ActionRowProps extends TouchableOpacityProps {
  icon: keyof typeof Ionicons.glyphMap
  label: string
  iconColor?: string
}

export function ActionRow({ icon, label, iconColor, style, ...props }: ActionRowProps) {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    icon: {
      marginRight: theme.spacing.md,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      flex: 1,
    },
  })

  return (
    <TouchableOpacity
      style={[styles.row, style]}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={label}
      {...props}
    >
      <Ionicons
        name={icon}
        size={24}
        color={iconColor || theme.colors.primary}
        style={styles.icon}
      />
      <Text style={styles.label}>{label}</Text>
    </TouchableOpacity>
  )
}
