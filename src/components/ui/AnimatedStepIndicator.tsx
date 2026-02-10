import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, { interpolate, SharedValue, useAnimatedStyle } from 'react-native-reanimated'

import { useTheme } from '../../theme'

interface AnimatedStepIndicatorProps {
  scrollX: SharedValue<number>
  totalSteps: number
  screenWidth: number
}

/**
 * Step indicator that smoothly interpolates progress based on scroll position.
 * Each dot smoothly fills as the user swipes between pages.
 */
export function AnimatedStepIndicator({
  scrollX,
  totalSteps,
  screenWidth,
}: AnimatedStepIndicatorProps) {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
    },
    dot: {
      height: 4,
      flex: 1,
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
      backgroundColor: theme.colors.border,
    },
    gradient: {
      height: '100%',
      borderRadius: theme.borderRadius.full,
    },
  })

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel="Onboarding progress"
    >
      {Array.from({ length: totalSteps }).map((_, dotIndex) => (
        <AnimatedDot
          key={dotIndex}
          dotIndex={dotIndex}
          scrollX={scrollX}
          screenWidth={screenWidth}
          dotStyle={styles.dot}
          gradientStyle={styles.gradient}
        />
      ))}
    </View>
  )
}

function AnimatedDot({
  dotIndex,
  scrollX,
  screenWidth,
  dotStyle,
  gradientStyle,
}: {
  dotIndex: number
  scrollX: SharedValue<number>
  screenWidth: number
  dotStyle: object
  gradientStyle: object
}) {
  // Each dot fills up as we approach/pass its corresponding page
  const fillStyle = useAnimatedStyle(() => {
    const scrollPage = scrollX.value / screenWidth

    // Dot is fully filled once we're on or past its page
    // Partially fills as we scroll toward it
    const fill = interpolate(scrollPage, [dotIndex - 1, dotIndex], [0, 100], 'clamp')

    return {
      width: `${fill}%` as `${number}%`,
    }
  })

  return (
    <View style={dotStyle}>
      <Animated.View style={fillStyle}>
        <LinearGradient
          colors={['#22D3EE', '#A855F7']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={gradientStyle}
        />
      </Animated.View>
    </View>
  )
}
