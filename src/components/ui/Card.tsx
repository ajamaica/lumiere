import React from 'react'
import { StyleSheet, View, ViewProps } from 'react-native'

import { useTheme } from '../../theme'

export interface CardProps extends ViewProps {
  bordered?: boolean
  padded?: boolean
}

export function Card({ bordered = true, padded = true, style, children, ...props }: CardProps) {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      ...(padded && { padding: theme.spacing.md }),
      ...(bordered && {
        borderWidth: 1,
        borderColor: theme.colors.border,
      }),
    },
  })

  return (
    <View style={[styles.card, style]} {...props}>
      {children}
    </View>
  )
}
