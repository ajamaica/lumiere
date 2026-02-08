import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { StyleSheet, View } from 'react-native'

import { useTheme } from '../../theme'

interface StepIndicatorProps {
  currentStep: number
  totalSteps: number
}

export function StepIndicator({ currentStep, totalSteps }: StepIndicatorProps) {
  const { theme } = useTheme()

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      paddingVertical: theme.spacing.lg,
      paddingHorizontal: theme.spacing.xl,
    },
    dot: {
      height: 4,
      flex: 1,
      borderRadius: theme.borderRadius.full,
      overflow: 'hidden',
    },
    inactiveDot: {
      backgroundColor: theme.colors.border,
    },
    gradient: {
      flex: 1,
      height: '100%',
    },
  })

  return (
    <View
      style={styles.container}
      accessibilityRole="progressbar"
      accessibilityLabel={`Step ${currentStep + 1} of ${totalSteps}`}
      accessibilityValue={{ min: 1, max: totalSteps, now: currentStep + 1 }}
    >
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View key={index} style={[styles.dot, index > currentStep && styles.inactiveDot]}>
          {index <= currentStep && (
            <LinearGradient
              colors={['#22D3EE', '#A855F7']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.gradient}
            />
          )}
        </View>
      ))}
    </View>
  )
}
