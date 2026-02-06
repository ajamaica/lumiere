import { Ionicons } from '@expo/vector-icons'
import React from 'react'
import { StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native'

import { useTheme } from '../../theme'

type IconButtonVariant = 'filled' | 'ghost'
type IconButtonSize = 'sm' | 'md' | 'lg'

export interface IconButtonProps extends TouchableOpacityProps {
  icon: keyof typeof Ionicons.glyphMap
  variant?: IconButtonVariant
  size?: IconButtonSize
  color?: string
  /** Accessibility label describing the button's action */
  accessibilityLabel?: string
}

export function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  color,
  disabled,
  style,
  ...props
}: IconButtonProps) {
  const { theme } = useTheme()

  const sizeMap = {
    sm: { button: 32, icon: 18 },
    md: { button: 40, icon: 24 },
    lg: { button: 48, icon: 28 },
  }

  const s = sizeMap[size]
  const iconColor =
    color || (variant === 'filled' ? theme.colors.text.inverse : theme.colors.text.secondary)

  const styles = StyleSheet.create({
    button: {
      width: s.button,
      height: s.button,
      borderRadius: s.button / 2,
      alignItems: 'center',
      justifyContent: 'center',
      ...(variant === 'filled' && {
        backgroundColor: theme.colors.surface,
      }),
    },
  })

  return (
    <TouchableOpacity
      style={[styles.button, disabled && { opacity: 0.5 }, style]}
      disabled={disabled}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      {...props}
    >
      <Ionicons name={icon} size={s.icon} color={iconColor} />
    </TouchableOpacity>
  )
}
