import React, { useEffect, useMemo } from 'react'
import { Animated, StyleSheet } from 'react-native'

import { useTheme } from '../../theme'

type StatusDotVariant = 'success' | 'error' | 'warning' | 'info' | 'neutral'

export interface StatusDotProps {
  variant?: StatusDotVariant
  pulse?: boolean
  size?: number
}

export function StatusDot({ variant = 'success', pulse = false, size = 10 }: StatusDotProps) {
  const { theme } = useTheme()
  const pulseAnim = useMemo(() => new Animated.Value(1), [])

  const colorMap: Record<StatusDotVariant, string> = {
    success: theme.colors.status.success,
    error: theme.colors.status.error,
    warning: theme.colors.status.warning,
    info: theme.colors.status.info,
    neutral: theme.colors.text.secondary,
  }

  useEffect(() => {
    if (pulse) {
      const animation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
        ]),
      )
      animation.start()
      return () => animation.stop()
    } else {
      Animated.timing(pulseAnim, {
        toValue: 1,
        duration: 200,
        useNativeDriver: true,
      }).start()
    }
  }, [pulse, pulseAnim])

  const styles = StyleSheet.create({
    dot: {
      width: size,
      height: size,
      borderRadius: size / 2,
      backgroundColor: colorMap[variant],
    },
  })

  return (
    <Animated.View
      style={[styles.dot, { opacity: pulseAnim }]}
      accessibilityRole="image"
      accessibilityLabel={`${variant} status${pulse ? ', active' : ''}`}
    />
  )
}
