import React, { useState } from 'react'
import { SafeAreaView, StyleSheet, View } from 'react-native'

import { StepIndicator } from '../components/ui/StepIndicator'
import { useTheme } from '../theme'

import { OnboardingIntroScreen } from './OnboardingIntroScreen'
import { SetupScreen } from './SetupScreen'

const INTRO_STEPS = [
  {
    title: 'Managing your Agents is easier than ever',
    description:
      'Lumiere gives you a beautiful mobile interface to interact with your AI agents on the go. Monitor conversations, send messages, and stay connected from anywhere.',
  },
  {
    title: 'Full control with powerful features',
    description:
      'Manage multiple servers, switch between sessions, schedule tasks with cron jobs, and get real-time notifications. Everything you need to stay in command.',
  },
  {
    title: 'Highly configurable for custom needs',
    description:
      'Connect to Molt Gateway, Ollama, or Echo providers. Customize themes, set up deep link triggers, and tailor the experience to fit your workflow.',
  },
]

export function OnboardingFlow() {
  const { theme } = useTheme()
  const [currentStep, setCurrentStep] = useState(0)

  const totalSteps = INTRO_STEPS.length + 1 // 3 intro + 1 setup

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
  })

  const handleNext = () => {
    setCurrentStep((prev) => prev + 1)
  }

  const handleSkip = () => {
    setCurrentStep(INTRO_STEPS.length) // Jump to setup
  }

  if (currentStep < INTRO_STEPS.length) {
    return (
      <SafeAreaView style={styles.container}>
        <OnboardingIntroScreen
          step={currentStep}
          totalSteps={totalSteps}
          title={INTRO_STEPS[currentStep].title}
          description={INTRO_STEPS[currentStep].description}
          onNext={handleNext}
          onSkip={handleSkip}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
        <SetupScreen />
      </View>
    </SafeAreaView>
  )
}
