import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, ViewProps } from 'react-native'

import { useTheme } from '../../theme'

export interface ScreenHeaderProps extends ViewProps {
  title: string
  subtitle?: string
  showBack?: boolean
  onBack?: () => void
  right?: React.ReactNode
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  onBack,
  right,
  style,
  ...props
}: ScreenHeaderProps) {
  const { theme } = useTheme()
  const router = useRouter()

  const handleBack = onBack || (() => router.back())

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.lg,
      paddingTop: theme.spacing.xl * 1.5,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      marginRight: theme.spacing.md,
    },
    content: {
      flex: 1,
    },
    title: {
      fontSize: theme.typography.fontSize.xxl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
  })

  return (
    <View style={[styles.header, style]} {...props}>
      {showBack && (
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
      )}
      <View style={styles.content}>
        <Text style={styles.title}>{title}</Text>
        {subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
      </View>
      {right}
    </View>
  )
}
