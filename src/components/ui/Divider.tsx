import React from 'react'
import { StyleSheet, View, ViewProps } from 'react-native'

import { useTheme } from '../../theme'

export interface DividerProps extends ViewProps {
  spacing?: 'none' | 'sm' | 'md' | 'lg'
}

export function Divider({ spacing = 'none', style, ...props }: DividerProps) {
  const { theme } = useTheme()

  const spacingMap = {
    none: 0,
    sm: theme.spacing.sm,
    md: theme.spacing.md,
    lg: theme.spacing.lg,
  }

  const styles = StyleSheet.create({
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.border,
      marginVertical: spacingMap[spacing],
    },
  })

  return <View style={[styles.divider, style]} {...props} />
}
