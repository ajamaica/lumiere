import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, View, ViewProps } from 'react-native'

import { useTheme } from '../../theme'
import { Button, ButtonProps } from './Button'
import { Text } from './Text'

export interface EmptyStateProps extends ViewProps {
  /** Ionicons icon name displayed in the circle */
  icon: keyof typeof Ionicons.glyphMap
  /** Icon size (default: 36) */
  iconSize?: number
  /** Heading text */
  title: string
  /** Description text below the heading */
  description?: string
  /** Action button configuration */
  action?: {
    title: string
    onPress: () => void
    variant?: ButtonProps['variant']
  }
}

export function EmptyState({
  icon,
  iconSize = 36,
  title,
  description,
  action,
  style,
  ...props
}: EmptyStateProps) {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    container: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xxxl,
      paddingHorizontal: theme.spacing.xl,
    },
    iconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      marginBottom: theme.spacing.sm,
    },
    description: {
      marginBottom: theme.spacing.lg,
    },
  })

  return (
    <View
      style={[styles.container, style]}
      accessibilityRole="text"
      accessibilityLabel={description ? `${title}. ${description}` : title}
      {...props}
    >
      <View style={styles.iconCircle}>
        <Ionicons name={icon} size={iconSize} color={theme.colors.primary} />
      </View>
      <Text variant="heading3" center style={styles.title}>
        {title}
      </Text>
      {description && (
        <Text variant="body" color="secondary" center style={styles.description}>
          {description}
        </Text>
      )}
      {action && <Button title={action.title} onPress={action.onPress} variant={action.variant} />}
    </View>
  )
}
