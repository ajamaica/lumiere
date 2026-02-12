import { LinearGradient } from 'expo-linear-gradient'
import React, { useCallback, useEffect } from 'react'
import {
  ActivityIndicator,
  ColorValue,
  StyleSheet,
  Text,
  TouchableOpacity,
  TouchableOpacityProps,
} from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated'

import { useReducedMotion } from '../../hooks/useReducedMotion'
import { useTheme } from '../../theme'

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)
const AnimatedTouchableOpacity = Animated.createAnimatedComponent(TouchableOpacity)

type GradientPreset = 'primary' | 'accent' | 'success' | 'warning'
type ButtonSize = 'sm' | 'md' | 'lg'

export interface GradientButtonProps extends Omit<TouchableOpacityProps, 'children'> {
  title: string
  preset?: GradientPreset
  colors?: readonly [ColorValue, ColorValue, ...ColorValue[]]
  size?: ButtonSize
  loading?: boolean
  animated?: boolean
  icon?: React.ReactNode
}

export function GradientButton({
  title,
  preset = 'primary',
  colors,
  size = 'md',
  loading = false,
  animated = true,
  disabled,
  icon,
  style,
  ...props
}: GradientButtonProps) {
  const { theme } = useTheme()
  const reducedMotion = useReducedMotion()
  const shimmerProgress = useSharedValue(0)
  const scaleValue = useSharedValue(1)

  const presetColors: Record<GradientPreset, [ColorValue, ColorValue, ...ColorValue[]]> = {
    primary: ['#22D3EE', '#06B6D4', '#0891B2'],
    accent: ['#A855F7', '#7C3AED', '#6D28D9'],
    success: ['#10B981', '#059669', '#047857'],
    warning: ['#F59E0B', '#D97706', '#B45309'],
  }

  const gradientColors = colors || presetColors[preset]

  useEffect(() => {
    if (animated && !disabled && !loading && !reducedMotion) {
      shimmerProgress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 2000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      )
    }
  }, [animated, disabled, loading, reducedMotion, shimmerProgress])

  const animatedGradientStyle = useAnimatedStyle(() => ({
    opacity: 0.9 + shimmerProgress.value * 0.1,
  }))

  const animatedContainerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scaleValue.value }],
  }))

  const handlePressIn = useCallback(() => {
    if (reducedMotion) return
    scaleValue.value = withTiming(0.97, { duration: 100, easing: Easing.out(Easing.ease) }) // eslint-disable-line react-hooks/immutability
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

  const s = sizeStyles[size]

  const styles = StyleSheet.create({
    container: {
      borderRadius: theme.borderRadius.xxl,
      overflow: 'hidden',
      shadowColor: gradientColors[0],
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 6,
    },
    gradient: {
      paddingVertical: s.paddingVertical,
      paddingHorizontal: s.paddingHorizontal,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
    },
    text: {
      fontSize: s.fontSize,
      fontWeight: theme.typography.fontWeight.semibold,
      color: '#FFFFFF',
    },
  })

  return (
    <AnimatedTouchableOpacity
      style={[
        styles.container,
        (disabled || loading) && { opacity: 0.5 },
        animatedContainerStyle,
        style,
      ]}
      disabled={disabled || loading}
      activeOpacity={0.9}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      accessibilityRole="button"
      accessibilityLabel={title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      {...props}
    >
      <AnimatedLinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.gradient, animatedGradientStyle]}
      >
        {loading ? (
          <ActivityIndicator size="small" color="#FFFFFF" />
        ) : (
          <>
            {icon}
            <Text style={styles.text}>{title}</Text>
          </>
        )}
      </AnimatedLinearGradient>
    </AnimatedTouchableOpacity>
  )
}
