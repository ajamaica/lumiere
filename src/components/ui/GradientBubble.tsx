import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect } from 'react'
import { StyleSheet, ViewProps } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import { useTheme } from '../../theme'

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)

type BubbleVariant = 'user' | 'agent'

export interface GradientBubbleProps extends ViewProps {
  variant?: BubbleVariant
  animated?: boolean
  children: React.ReactNode
}

export function GradientBubble({
  variant = 'user',
  animated = true,
  style,
  children,
  ...props
}: GradientBubbleProps) {
  const { theme } = useTheme()
  const shimmerProgress = useSharedValue(0)
  const fadeIn = useSharedValue(0)

  // Entrance animation
  useEffect(() => {
    fadeIn.value = withTiming(1, { duration: 300, easing: Easing.out(Easing.ease) })
  }, [fadeIn])

  // Subtle shimmer animation for user bubbles
  useEffect(() => {
    if (animated && variant === 'user') {
      shimmerProgress.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(0, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        false,
      )
    }
  }, [animated, variant, shimmerProgress])

  const animatedContainerStyle = useAnimatedStyle(() => ({
    opacity: fadeIn.value,
    transform: [{ translateY: (1 - fadeIn.value) * 10 }, { scale: 0.95 + fadeIn.value * 0.05 }],
  }))

  const animatedGradientStyle = useAnimatedStyle(() => {
    return {
      opacity: 0.9 + shimmerProgress.value * 0.1,
    }
  })

  const isUser = variant === 'user'

  const userGradientColors = [
    theme.colors.primary,
    theme.colors.primaryDark,
    theme.colors.primaryDark,
  ] as const
  const agentGradientColors = [theme.colors.surface, theme.colors.surfaceVariant] as const

  const styles = StyleSheet.create({
    container: {
      borderRadius: theme.borderRadius.xxl,
      overflow: 'hidden',
    },
    userContainer: {
      borderBottomRightRadius: theme.borderRadius.sm,
    },
    agentContainer: {
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    gradient: {
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.sm + 2,
    },
  })

  if (isUser) {
    return (
      <Animated.View
        style={[styles.container, styles.userContainer, animatedContainerStyle, style]}
        {...props}
      >
        <AnimatedLinearGradient
          colors={userGradientColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[styles.gradient, animatedGradientStyle]}
        >
          {children}
        </AnimatedLinearGradient>
      </Animated.View>
    )
  }

  // Agent bubble with subtle border glow
  return (
    <Animated.View
      style={[styles.container, styles.agentContainer, animatedContainerStyle, style]}
      {...props}
    >
      <LinearGradient
        colors={agentGradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={styles.gradient}
      >
        {children}
      </LinearGradient>
    </Animated.View>
  )
}
