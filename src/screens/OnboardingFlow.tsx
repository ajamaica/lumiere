import React, { useRef, useState } from 'react'
import { Dimensions, FlatList, StyleSheet, View, ViewToken } from 'react-native'
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

const { width: SCREEN_WIDTH } = Dimensions.get('window')

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
  const flatListRef = useRef<FlatList>(null)

  const totalSteps = INTRO_STEPS.length + 1 // 3 intro + 1 setup

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    slideContainer: {
      width: SCREEN_WIDTH,
    },
  })

  const handleNext = () => {
    if (currentStep < INTRO_STEPS.length - 1) {
      flatListRef.current?.scrollToIndex({ index: currentStep + 1, animated: true })
    } else {
      setCurrentStep(INTRO_STEPS.length) // Move to setup
    }
  }

  const handleSkip = () => {
    setCurrentStep(INTRO_STEPS.length) // Jump to setup
  }

  const onViewableItemsChanged = useRef(
    ({ viewableItems }: { viewableItems: ViewToken<(typeof INTRO_STEPS)[number]>[] }) => {
      if (viewableItems.length > 0 && viewableItems[0].index !== null) {
        setCurrentStep(viewableItems[0].index)
      }
    },
  ).current

  const viewabilityConfig = useRef({
    itemVisiblePercentThreshold: 50,
  }).current

  if (currentStep < INTRO_STEPS.length) {
    return (
      <SafeAreaView style={styles.container}>
        <StepIndicator currentStep={currentStep} totalSteps={totalSteps} />
        <FlatList
          ref={flatListRef}
          data={INTRO_STEPS}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          keyExtractor={(_, index) => index.toString()}
          onViewableItemsChanged={onViewableItemsChanged}
          viewabilityConfig={viewabilityConfig}
          renderItem={({ item, index }) => (
            <View style={styles.slideContainer}>
              <OnboardingIntroScreen
                step={index}
                totalSteps={totalSteps}
                title={item.title}
                description={item.description}
                Illustration={item.illustration}
                onNext={handleNext}
                onSkip={handleSkip}
              />
            </View>
          )}
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
