import { LinearGradient } from 'expo-linear-gradient'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, View } from 'react-native'
import Animated, {
  Easing,
  interpolate,
  SharedValue,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated'

import { GradientText, Text } from '../components/ui'
import { useTheme } from '../theme'

interface OnboardingIntroScreenProps {
  index: number
  scrollX: SharedValue<number>
  screenWidth: number
  titleKey: string
  descriptionKey: string
}

/** Floating gradient orb that drifts and pulses in the background */
function FloatingOrb({
  color,
  size,
  startX,
  startY,
  delay,
}: {
  color: string
  size: number
  startX: number
  startY: number
  delay: number
}) {
  const translateY = useSharedValue(0)
  const translateX = useSharedValue(0)
  const scale = useSharedValue(1)
  const opacity = useSharedValue(0)

  useEffect(() => {
    // Fade in
    opacity.value = withDelay(delay, withTiming(0.6, { duration: 1000 }))

    // Float vertically
    translateY.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(-20, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
          withTiming(20, { duration: 3000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    )

    // Drift horizontally
    translateX.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(15, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
          withTiming(-15, { duration: 4000, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    )

    // Pulse scale
    scale.value = withDelay(
      delay,
      withRepeat(
        withSequence(
          withTiming(1.2, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
          withTiming(0.8, { duration: 2500, easing: Easing.inOut(Easing.ease) }),
        ),
        -1,
        true,
      ),
    )
  }, [delay, opacity, scale, translateX, translateY])

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: translateX.value },
      { translateY: translateY.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }))

  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: startX,
          top: startY,
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        animatedStyle,
      ]}
    />
  )
}

export function OnboardingIntroScreen({
  index,
  scrollX,
  screenWidth,
  titleKey,
  descriptionKey,
}: OnboardingIntroScreenProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()

  const title = t(titleKey)
  const description = t(descriptionKey)

  // Split title to highlight key words with gradient
  const titleParts = title.split(',')
  const hasComma = titleParts.length > 1

  // Text slides with parallax depth effect
  const titleStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * screenWidth, index * screenWidth, (index + 1) * screenWidth]

    const translateX = interpolate(scrollX.value, inputRange, [
      screenWidth * 0.5,
      0,
      -screenWidth * 0.5,
    ])

    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0])

    return {
      transform: [{ translateX }],
      opacity,
    }
  })

  // Description enters with extra offset for staggered feel
  const descriptionStyle = useAnimatedStyle(() => {
    const inputRange = [(index - 1) * screenWidth, index * screenWidth, (index + 1) * screenWidth]

    const translateX = interpolate(scrollX.value, inputRange, [
      screenWidth * 0.7,
      0,
      -screenWidth * 0.7,
    ])

    const translateY = interpolate(scrollX.value, inputRange, [10, 0, 10])

    const opacity = interpolate(scrollX.value, inputRange, [0, 1, 0])

    return {
      transform: [{ translateX }, { translateY }],
      opacity,
    }
  })

  const styles = StyleSheet.create({
    page: {
      width: screenWidth,
      height: '100%',
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
    },
    orbContainer: {
      ...StyleSheet.absoluteFillObject,
      overflow: 'hidden',
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    textContent: {
      paddingHorizontal: theme.spacing.xl,
      alignItems: 'center',
      maxWidth: 480,
      width: '100%',
    },
    titleContainer: {
      marginBottom: theme.spacing.lg,
      alignItems: 'center',
    },
    title: {
      fontSize: theme.typography.fontSize.xxl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      lineHeight: theme.typography.fontSize.xxl * 1.2,
      textAlign: 'center',
    },
    description: {
      lineHeight: 24,
      fontSize: theme.typography.fontSize.base,
      textAlign: 'center',
    },
  })

  // Unique orb configurations per screen for visual variety
  const orbConfigs = [
    // Screen 1: Cyan-focused orbs
    [
      { color: 'rgba(34, 211, 238, 0.15)', size: 120, startX: -20, startY: 80, delay: 0 },
      {
        color: 'rgba(168, 85, 247, 0.12)',
        size: 80,
        startX: screenWidth - 100,
        startY: 200,
        delay: 500,
      },
      {
        color: 'rgba(34, 211, 238, 0.08)',
        size: 150,
        startX: screenWidth / 2 - 75,
        startY: 400,
        delay: 1000,
      },
    ],
    // Screen 2: Purple-focused orbs
    [
      {
        color: 'rgba(168, 85, 247, 0.15)',
        size: 100,
        startX: screenWidth - 80,
        startY: 60,
        delay: 200,
      },
      { color: 'rgba(236, 72, 153, 0.12)', size: 130, startX: -30, startY: 300, delay: 700 },
      {
        color: 'rgba(168, 85, 247, 0.08)',
        size: 90,
        startX: screenWidth / 3,
        startY: 450,
        delay: 400,
      },
    ],
    // Screen 3: Mixed orbs
    [
      {
        color: 'rgba(34, 211, 238, 0.12)',
        size: 110,
        startX: screenWidth - 120,
        startY: 120,
        delay: 300,
      },
      { color: 'rgba(168, 85, 247, 0.15)', size: 100, startX: 20, startY: 250, delay: 0 },
      {
        color: 'rgba(236, 72, 153, 0.10)',
        size: 140,
        startX: screenWidth / 2 - 70,
        startY: 380,
        delay: 600,
      },
    ],
  ]

  const orbs = orbConfigs[index] ?? orbConfigs[0]

  // Theme-aware gradient backgrounds
  const gradientColors = theme.isDark
    ? ([theme.colors.background, '#0A1628', 'rgba(34, 211, 238, 0.05)'] as const)
    : ([theme.colors.background, '#E0E9F2', 'rgba(34, 211, 238, 0.08)'] as const)

  return (
    <View style={styles.page}>
      {/* Background gradient */}
      <LinearGradient colors={gradientColors} locations={[0, 0.6, 1]} style={styles.gradient} />

      {/* Floating orbs */}
      <View style={styles.orbContainer}>
        {orbs.map((orb, i) => (
          <FloatingOrb key={i} {...orb} />
        ))}
      </View>

      <View style={styles.content}>
        <View style={styles.textContent}>
          {/* Animated title */}
          <Animated.View style={[styles.titleContainer, titleStyle]}>
            {hasComma ? (
              <>
                <Text style={styles.title}>{titleParts[0]},</Text>
                <GradientText
                  preset="hero"
                  fontSize={theme.typography.fontSize.xxl}
                  fontWeight="bold"
                >
                  {titleParts[1].trim()}
                </GradientText>
              </>
            ) : (
              <GradientText
                preset="accent"
                fontSize={theme.typography.fontSize.xxl}
                fontWeight="bold"
              >
                {title}
              </GradientText>
            )}
          </Animated.View>

          {/* Animated description */}
          <Animated.View style={descriptionStyle}>
            <Text variant="body" color="secondary" style={styles.description}>
              {description}
            </Text>
          </Animated.View>
        </View>
      </View>
    </View>
  )
}
