import React, { useEffect } from 'react'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import { useTheme } from '../../theme'

const DOT_SIZE = 8
const DOT_COUNT = 3
const BOUNCE_HEIGHT = -6
const ANIMATION_DURATION = 300
const STAGGER_DELAY = 150

function Dot({ index }: { index: number }) {
  const { theme } = useTheme()
  const translateY = useSharedValue(0)
  const opacity = useSharedValue(0.4)

  useEffect(() => {
    const delay = index * STAGGER_DELAY
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(BOUNCE_HEIGHT, {
            duration: ANIMATION_DURATION,
            easing: Easing.out(Easing.ease),
          }),
          withTiming(0, { duration: ANIMATION_DURATION, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    )
    opacity.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1, { duration: ANIMATION_DURATION, easing: Easing.out(Easing.ease) }),
          withTiming(0.4, { duration: ANIMATION_DURATION, easing: Easing.in(Easing.ease) }),
        ),
        -1,
        false,
      ),
    )
  }, [index, translateY, opacity])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[styles.dot, { backgroundColor: theme.colors.text.secondary }, animatedStyle]}
    />
  )
}

export function ThinkingIndicator() {
  return (
    <View style={styles.container} accessibilityLabel="Agent is thinking" accessibilityRole="text">
      {Array.from({ length: DOT_COUNT }, (_, i) => (
        <Dot key={i} index={i} />
      ))}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingVertical: 8,
    paddingHorizontal: 4,
  },
  dot: {
    width: DOT_SIZE,
    height: DOT_SIZE,
    borderRadius: DOT_SIZE / 2,
  },
})
