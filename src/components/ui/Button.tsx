import React, { useCallback } from 'react'
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useTheme } from '../../theme'

const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity)

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
  const reducedMotion = useReducedMotion()
  const scaleValue = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }))

  const handlePressIn = useCallback(() => {
    if (reducedMotion) return
    scaleValue.value = withTiming(0.95, { duration: 100, easing: Easing.out(Easing.ease) }) // eslint-disable-line react-hooks/immutability
  }, [scaleValue, reducedMotion])

  const handlePressOut = useCallback(() => {
    if (reducedMotion) return
    scaleValue.value = withSpring(1, { damping: 12, stiffness: 400 }) // eslint-disable-line react-hooks/immutability
  }, [scaleValue, reducedMotion])

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
      borderRadius: theme.borderRadius.xxl,
    },
    secondary: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.xxl,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    danger: {
      backgroundColor: theme.colors.status.error,
      borderRadius: theme.borderRadius.xxl,
    },
    ghost: {
      backgroundColor: 'transparent',
      borderRadius: theme.borderRadius.xxl,
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
    <AnimatedTouchableOpacity
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
        animatedStyle,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.7}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
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
    </AnimatedTouchableOpacity>
  )
}
