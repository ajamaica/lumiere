import React from 'react'
import { StyleSheet, Text, View, ViewProps } from 'react-native'

import { useTheme } from '../../theme'

export interface SectionProps extends ViewProps {
  title?: string
  right?: React.ReactNode
  /** Show a divider line at the bottom of the section */
  showDivider?: boolean
}

export function Section({
  title,
  right,
  showDivider = false,
  style,
  children,
  ...props
}: SectionProps) {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    section: {
      marginBottom: theme.spacing.md,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    title: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    divider: {
      height: StyleSheet.hairlineWidth,
      backgroundColor: theme.colors.divider,
      marginTop: theme.spacing.md,
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
      {showDivider && <View style={styles.divider} />}
    </View>
  )
}
