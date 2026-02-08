import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { StyleSheet, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

import { Button, GradientButton, GradientText, StepIndicator, Text } from '../components/ui'
import { useTheme } from '../theme'

interface OnboardingIntroScreenProps {
  step: number
  totalSteps: number
  title: string
  description: string
  Illustration: React.ComponentType
  onNext: () => void
  onSkip: () => void
}

export function OnboardingIntroScreen({
  step,
  totalSteps,
  title,
  description,
  Illustration,
  onNext,
  onSkip,
}: OnboardingIntroScreenProps) {
  const { theme } = useTheme()
  const insets = useSafeAreaInsets()

  // Split title to highlight key words with gradient
  const titleParts = title.split(',')
  const hasComma = titleParts.length > 1

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
    },
    content: {
      flex: 1,
      paddingTop: insets.top,
    },
    illustrationContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xl,
      position: 'relative',
    },
    illustrationGlow: {
      position: 'absolute',
      top: '20%',
      left: '10%',
      right: '10%',
      bottom: '20%',
      borderRadius: 200,
      opacity: 0.3,
    },
    textContent: {
      paddingHorizontal: theme.spacing.xl,
    },
    titleContainer: {
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.fontSize.xxl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      lineHeight: theme.typography.fontSize.xxl * 1.2,
    },
    description: {
      lineHeight: 24,
      fontSize: theme.typography.fontSize.base,
    },
    footer: {
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: Math.max(insets.bottom, theme.spacing.xl),
      gap: theme.spacing.md,
    },
    primaryButton: {
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  })

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient
        colors={[theme.colors.background, '#0A1628', 'rgba(34, 211, 238, 0.05)']}
        locations={[0, 0.6, 1]}
        style={styles.gradient}
      />

      <StepIndicator currentStep={step} totalSteps={totalSteps} />

      <View style={styles.content}>
        <View style={styles.illustrationContainer}>
          {/* Subtle glow behind illustration */}
          <LinearGradient
            colors={['rgba(34, 211, 238, 0.2)', 'transparent']}
            style={styles.illustrationGlow}
            start={{ x: 0.5, y: 0 }}
            end={{ x: 0.5, y: 1 }}
          />
          <Illustration />
        </View>

        <View style={styles.textContent}>
          <View style={styles.titleContainer}>
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
          </View>

          <Text variant="body" color="secondary" style={styles.description}>
            {description}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <GradientButton title="Continue" size="lg" onPress={onNext} animated={true} />
        <Button title="Skip" size="lg" variant="ghost" onPress={onSkip} />
      </View>
    </View>
  )
}
