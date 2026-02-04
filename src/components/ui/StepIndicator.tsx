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
      height: 3,
      flex: 1,
      borderRadius: theme.borderRadius.full,
    },
  })

  return (
    <View style={styles.container}>
      {Array.from({ length: totalSteps }).map((_, index) => (
        <View
          key={index}
          style={[
            styles.dot,
            {
              backgroundColor:
                index <= currentStep ? theme.colors.primary : theme.colors.border,
            },
          ]}
        />
      ))}
    </View>
  )
}
