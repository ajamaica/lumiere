import React from 'react'
import { StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { useTheme } from '../theme'
import { SetupScreen } from './SetupScreen'

export function OnboardingFlow() {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    setupContainer: {
      flex: 1,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.setupContainer}>
        <SetupScreen />
      </View>
    </SafeAreaView>
  )
}
