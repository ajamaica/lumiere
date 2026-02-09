import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { ColorValue, StyleSheet, View, ViewProps } from 'react-native'

import { useTheme } from '../../theme'

type GradientPreset = 'dark' | 'subtle' | 'accent' | 'radial'

export interface GradientBackgroundProps extends ViewProps {
  preset?: GradientPreset
  colors?: readonly [ColorValue, ColorValue, ...ColorValue[]]
}

export function GradientBackground({
  preset = 'dark',
  colors,
  style,
  children,
  ...props
}: GradientBackgroundProps) {
  const { theme } = useTheme()

  const presetConfigs: Record<
    GradientPreset,
    {
      colors: [ColorValue, ColorValue, ...ColorValue[]]
      locations?: [number, number, ...number[]]
    }
  > = {
    dark: {
      colors: [theme.colors.background, '#0A1628', '#0F1D32'],
      locations: [0, 0.5, 1],
    },
    subtle: {
      colors: [theme.colors.background, theme.colors.surface],
      locations: [0, 1],
    },
    accent: {
      colors: ['rgba(34, 211, 238, 0.1)', theme.colors.background, 'rgba(168, 85, 247, 0.05)'],
      locations: [0, 0.5, 1],
    },
    radial: {
      colors: ['rgba(34, 211, 238, 0.15)', theme.colors.background],
      locations: [0, 0.7],
    },
  }

  const config = presetConfigs[preset]
  const gradientColors = colors || config.colors

  return (
    <View style={[styles.container, style]} {...props}>
      <LinearGradient
        colors={gradientColors}
        locations={config.locations}
        start={{ x: 0, y: 0 }}
        end={{ x: 0, y: 1 }}
        style={StyleSheet.absoluteFill}
      />
      {children}
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
})
