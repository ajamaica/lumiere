import React from 'react'
import { StyleSheet, View } from 'react-native'

import { Button, StepIndicator, Text } from '../components/ui'
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

  const styles = StyleSheet.create({
    container: {
      flex: 1,
    },
    content: {
      flex: 1,
    },
    illustrationContainer: {
      alignItems: 'center',
      marginBottom: theme.spacing.xxxl,
    },
    textContent: {
      paddingHorizontal: theme.spacing.xl,
    },
    title: {
      marginBottom: theme.spacing.lg,
    },
    description: {
      lineHeight: 24,
    },
    footer: {
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.md,
    },
    skipButton: {
      alignSelf: 'center',
      paddingVertical: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
  })

  return (
    <View style={styles.container}>
      <StepIndicator currentStep={step} totalSteps={totalSteps} />

      <View style={styles.content}>
        <View style={styles.illustrationContainer}>
          <Illustration />
        </View>

        <View style={styles.textContent}>
          <Text variant="heading1" style={styles.title}>
            {title}
          </Text>

          <Text variant="body" color="secondary" style={styles.description}>
            {description}
          </Text>
        </View>
      </View>

      <View style={styles.footer}>
        <Button title="Next" size="lg" onPress={onNext} />
        <Button
          title="Skip"
          size="sm"
          variant="ghost"
          onPress={onSkip}
          style={styles.skipButton}
        />
      </View>
    </View>
  )
}
