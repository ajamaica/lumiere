import React, { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native'
import Animated, { useAnimatedScrollHandler, useSharedValue } from 'react-native-reanimated'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  AgentIllustration,
  ConfigIllustration,
  FeaturesIllustration,
} from '../components/illustrations'
import { Button, GradientButton } from '../components/ui'
import { AnimatedStepIndicator } from '../components/ui/AnimatedStepIndicator'
import { StepIndicator } from '../components/ui/StepIndicator'
import { useTheme } from '../theme'
import { OnboardingIntroScreen } from './OnboardingIntroScreen'
import { SetupScreen } from './SetupScreen'

const AnimatedScrollView = Animated.createAnimatedComponent(ScrollView)

const ILLUSTRATIONS = [AgentIllustration, FeaturesIllustration, ConfigIllustration]
const STEP_KEYS = ['step1', 'step2', 'step3'] as const

export function OnboardingFlow() {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const { width } = useWindowDimensions()
  const scrollX = useSharedValue(0)
  const scrollViewRef = useRef<ScrollView>(null)
  const [showSetup, setShowSetup] = useState(false)
  const [currentPage, setCurrentPage] = useState(0)

  const totalSteps = ILLUSTRATIONS.length + 1 // 3 intro + 1 setup

  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollX.value = event.contentOffset.x
    },
  })

  const handleNext = useCallback(() => {
    if (currentPage < ILLUSTRATIONS.length - 1) {
      const nextPage = currentPage + 1
      scrollViewRef.current?.scrollTo({ x: nextPage * width, animated: true })
      setCurrentPage(nextPage)
    } else {
      setShowSetup(true)
    }
  }, [currentPage, width])

  const handleSkip = useCallback(() => {
    setShowSetup(true)
  }, [])

  const handleMomentumScrollEnd = useCallback(
    (event: { nativeEvent: { contentOffset: { x: number } } }) => {
      const page = Math.round(event.nativeEvent.contentOffset.x / width)
      setCurrentPage(page)
    },
    [width],
  )

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    setupContainer: {
      flex: 1,
    },
    footer: {
      paddingHorizontal: theme.spacing.xl,
      paddingBottom: theme.spacing.xl,
      gap: theme.spacing.md,
    },
  })

  if (showSetup) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.setupContainer}>
          <StepIndicator currentStep={ILLUSTRATIONS.length} totalSteps={totalSteps} />
          <SetupScreen />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={{ flex: 1 }}>
        <AnimatedStepIndicator scrollX={scrollX} totalSteps={totalSteps} screenWidth={width} />

        <AnimatedScrollView
          ref={scrollViewRef}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          bounces={false}
          style={{ flex: 1 }}
          contentContainerStyle={{ height: '100%' }}
        >
          {STEP_KEYS.map((stepKey, index) => (
            <OnboardingIntroScreen
              key={stepKey}
              index={index}
              scrollX={scrollX}
              screenWidth={width}
              titleKey={`onboarding.${stepKey}.title`}
              descriptionKey={`onboarding.${stepKey}.description`}
              Illustration={ILLUSTRATIONS[index]}
            />
          ))}
        </AnimatedScrollView>

        <View style={styles.footer}>
          <GradientButton
            title={t('onboarding.continue')}
            size="lg"
            onPress={handleNext}
            animated={true}
          />
          <Button title={t('common.skip')} size="lg" variant="ghost" onPress={handleSkip} />
        </View>
      </View>
    </SafeAreaView>
  )
}
