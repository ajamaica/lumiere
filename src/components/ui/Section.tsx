import React from 'react'
import { StyleSheet, Text, View, ViewProps } from 'react-native'

import { useTheme } from '../../theme'

export interface SectionProps extends ViewProps {
  title?: string
  right?: React.ReactNode
}

export function Section({ title, right, style, children, ...props }: SectionProps) {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    section: {
      marginBottom: theme.spacing.xl,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
  })

  return (
    <View style={[styles.section, style]} {...props}>
      {(title || right) && (
        <View style={styles.header}>
          {title && <Text style={styles.title}>{title}</Text>}
          {right}
        </View>
      )}
      {children}
    </View>
  )
}
