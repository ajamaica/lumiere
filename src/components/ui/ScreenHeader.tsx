import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React from 'react'
import { StyleSheet, Text, TouchableOpacity, View, ViewProps } from 'react-native'

import { useTheme } from '../../theme'

export interface ScreenHeaderProps extends ViewProps {
  title: string
  subtitle?: string
  showBack?: boolean
  /** Show a close (X) button instead of a back arrow */
  showClose?: boolean
  onBack?: () => void
  right?: React.ReactNode
}

export function ScreenHeader({
  title,
  subtitle,
  showBack = false,
  showClose = false,
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
      borderBottomWidth: showClose ? 0 : 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      marginRight: theme.spacing.md,
    },
    closeButton: {
      width: 36,
      height: 36,
      borderRadius: 18,
      backgroundColor: theme.colors.surfaceVariant,
      alignItems: 'center',
      justifyContent: 'center',
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
      {showClose && (
        <TouchableOpacity onPress={handleBack} style={styles.closeButton}>
          <Ionicons name="close" size={20} color={theme.colors.text.secondary} />
        </TouchableOpacity>
      )}
      {showBack && !showClose && (
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
