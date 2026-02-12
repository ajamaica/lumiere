import { Ionicons } from '@expo/vector-icons'
import React, { useCallback } from 'react'
import { StyleSheet, TouchableOpacity, TouchableOpacityProps } from 'react-native'
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
  const reducedMotion = useReducedMotion()
  const scaleValue = useSharedValue(1)

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }))

  const handlePressIn = useCallback(() => {
    if (reducedMotion) return
    scaleValue.value = withTiming(0.85, { duration: 100, easing: Easing.out(Easing.ease) }) // eslint-disable-line react-hooks/immutability
  }, [scaleValue, reducedMotion])

  const handlePressOut = useCallback(() => {
    if (reducedMotion) return
    scaleValue.value = withSpring(1, { damping: 12, stiffness: 400 }) // eslint-disable-line react-hooks/immutability
  }, [scaleValue, reducedMotion])

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
    <AnimatedTouchableOpacity
      style={[styles.button, disabled && { opacity: 0.5 }, animatedStyle, style]}
      disabled={disabled}
      activeOpacity={0.7}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityState={{ disabled: !!disabled }}
      {...props}
    >
      <Ionicons name={icon} size={s.icon} color={iconColor} />
    </AnimatedTouchableOpacity>
  )
}
