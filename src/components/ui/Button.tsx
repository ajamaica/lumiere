import React from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native'

import { useTheme } from '../../theme'

type ButtonVariant = 'primary' | 'secondary' | 'danger' | 'ghost'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface ButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  title: string
  variant?: ButtonVariant
  size?: ButtonSize
  loading?: boolean
  icon?: React.ReactNode
}

export function Button({
  title,
  variant = 'primary',
  size = 'md',
  loading = false,
  disabled,
  icon,
  style,
  ...props
}: ButtonProps) {
  const { theme } = useTheme()

  const sizeStyles = {
    sm: {
      paddingVertical: theme.spacing.sm,
      paddingHorizontal: theme.spacing.md,
      fontSize: theme.typography.fontSize.sm,
    },
    md: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.lg,
      fontSize: theme.typography.fontSize.base,
    },
    lg: {
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
      fontSize: theme.typography.fontSize.lg,
    },
  }

  const variantStyles = StyleSheet.create({
    primary: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
    },
    secondary: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    danger: {
      backgroundColor: theme.colors.status.error,
      borderRadius: theme.borderRadius.md,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderRadius: theme.borderRadius.md,
    },
  })

  const textColorMap: Record<ButtonVariant, string> = {
    primary: theme.colors.text.inverse,
    secondary: theme.colors.text.primary,
    danger: theme.colors.text.inverse,
    ghost: theme.colors.primary,
  }

  const s = sizeStyles[size]

  return (
    <TouchableOpacity
      style={[
        variantStyles[variant],
        {
          paddingVertical: s.paddingVertical,
          paddingHorizontal: s.paddingHorizontal,
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'center',
          gap: theme.spacing.sm,
        },
        (disabled || loading) && { opacity: 0.5 },
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      {...props}
    >
      {loading ? (
        <ActivityIndicator size="small" color={textColorMap[variant]} />
      ) : (
        <>
          {icon}
          <Text
            style={{
              fontSize: s.fontSize,
              fontWeight: theme.typography.fontWeight.semibold,
              color: textColorMap[variant],
            }}
          >
            {title}
          </Text>
        </>
      )}
    </TouchableOpacity>
  )
}
