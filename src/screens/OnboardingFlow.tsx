import React, { useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  AgentIllustration,
  ConfigIllustration,
  FeaturesIllustration,
} from '../components/illustrations'
import { StepIndicator } from '../components/ui/StepIndicator'
import { useTheme } from '../theme'
import { OnboardingIntroScreen } from './OnboardingIntroScreen'
import { SetupScreen } from './SetupScreen'

const INTRO_STEPS = [
  {
    title: 'Your AI agents, always at your fingertips',
    description:
      'Chat with your agents on the go with a beautiful mobile interface. Monitor conversations, send messages, and stay connected from anywhere.',
    illustration: AgentIllustration,
  },
  {
    title: 'Full control with powerful features',
    description:
      'Manage multiple servers and switch between sessions instantly. Schedule tasks with cron jobs, get real-time notifications, and stay in command of your workflow.',
    illustration: FeaturesIllustration,
  },
  {
    title: 'Fully customizable to fit your needs',
    description:
      'Connect to OpenClaw, Ollama, Echo, and more. Personalize themes, configure custom triggers, and tailor every detail to match your workflow.',
    illustration: ConfigIllustration,
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
          Illustration={INTRO_STEPS[currentStep].illustration}
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
