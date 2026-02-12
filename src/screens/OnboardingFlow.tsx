import React, { useCallback, useState } from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '../theme'
import { SetupScreen } from './SetupScreen'
import { WelcomeScreen } from './WelcomeScreen'

export function OnboardingFlow() {
  const { theme } = useTheme()
  const [showSetup, setShowSetup] = useState(false)

  const handleGetStarted = useCallback(() => {
    setShowSetup(true)
  }, [])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    setupContainer: {
      flex: 1,
    },
  })

  if (!showSetup) {
    return (
      <SafeAreaView style={styles.container}>
        <WelcomeScreen onGetStarted={handleGetStarted} />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.setupContainer}>
        <SetupScreen />
      </View>
    </SafeAreaView>
  )
}
