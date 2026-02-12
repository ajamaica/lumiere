import { LinearGradient } from 'expo-linear-gradient'
import React, { useEffect } from 'react'
import { ColorValue, StyleSheet, ViewProps, ViewStyle } from 'react-native'
import Animated, {
  Easing,
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import { useReducedMotion } from '../../hooks/useReducedMotion'

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient)

type AnimationPreset = 'shimmer' | 'pulse' | 'wave' | 'breathe' | 'none'

export interface AnimatedGradientProps extends ViewProps {
  colors: readonly [ColorValue, ColorValue, ...ColorValue[]]
  animationPreset?: AnimationPreset
  duration?: number
  style?: ViewStyle
}

export function AnimatedGradient({
  colors,
  animationPreset = 'shimmer',
  duration = 3000,
  style,
  children,
  ...props
}: AnimatedGradientProps) {
  const reducedMotion = useReducedMotion()
  const progress = useSharedValue(0)
  const opacity = useSharedValue(1)

  useEffect(() => {
    if (animationPreset === 'none' || reducedMotion) return

    switch (animationPreset) {
      case 'shimmer':
        progress.value = withRepeat(
          withSequence(
            withTiming(1, { duration, easing: Easing.inOut(Easing.ease) }),
            withTiming(0, { duration, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        )
        break
      case 'pulse':
        opacity.value = withRepeat(
          withSequence(
            withTiming(0.7, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
            withTiming(1, { duration: duration / 2, easing: Easing.inOut(Easing.ease) }),
          ),
          -1,
          false,
        )
        break
      case 'wave':
        progress.value = withRepeat(withTiming(1, { duration, easing: Easing.linear }), -1, false)
        break
      case 'breathe':
        progress.value = withRepeat(
          withSequence(
            withTiming(1, { duration: duration * 0.4, easing: Easing.out(Easing.ease) }),
            withTiming(0.5, { duration: duration * 0.6, easing: Easing.in(Easing.ease) }),
          ),
          -1,
          false,
        )
        opacity.value = withRepeat(
          withSequence(
            withTiming(1, { duration: duration * 0.4, easing: Easing.out(Easing.ease) }),
            withTiming(0.8, { duration: duration * 0.6, easing: Easing.in(Easing.ease) }),
          ),
          -1,
          false,
        )
        break
    }
  }, [animationPreset, duration, progress, opacity, reducedMotion])

  const animatedStyle = useAnimatedStyle(() => {
    return {
      opacity: opacity.value,
      transform: [{ scale: animationPreset === 'breathe' ? 0.98 + progress.value * 0.02 : 1 }],
    }
  })

  // Animate gradient position for shimmer/wave effects
  const animatedProps = useAnimatedProps(() => {
    const startX = animationPreset === 'wave' ? progress.value : progress.value * 0.3
    const endX = animationPreset === 'wave' ? (progress.value + 0.5) % 1 : 1 - progress.value * 0.3
    return {
      start: { x: startX, y: 0 },
      end: { x: endX, y: 1 },
    }
  })

  return (
    <Animated.View style={[styles.container, animatedStyle, style]} {...props}>
      <AnimatedLinearGradient
        colors={colors}
        animatedProps={animatedProps}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </Animated.View>
  )
}

const styles = StyleSheet.create({
  container: {
    overflow: 'hidden',
  },
})
