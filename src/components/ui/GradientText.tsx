import MaskedView from '@react-native-masked-view/masked-view'
import { LinearGradient } from 'expo-linear-gradient'
import React from 'react'
import { ColorValue, StyleSheet, Text, TextProps } from 'react-native'

import { useTheme } from '../../theme'

type GradientPreset = 'primary' | 'accent' | 'hero' | 'subtle'

export interface GradientTextProps extends TextProps {
  preset?: GradientPreset
  colors?: readonly [ColorValue, ColorValue, ...ColorValue[]]
  fontSize?: number
  fontWeight?: 'regular' | 'medium' | 'semibold' | 'bold'
}

export function GradientText({
  preset = 'hero',
  colors,
  fontSize,
  fontWeight = 'bold',
  style,
  children,
  ...props
}: GradientTextProps) {
  const { theme } = useTheme()

  const presetColors: Record<GradientPreset, [ColorValue, ColorValue, ...ColorValue[]]> = {
    primary: [theme.colors.primary, theme.colors.primaryLight],
    accent: ['#A855F7', theme.colors.primary], // Purple to primary
    hero: [theme.colors.primary, '#A855F7', '#EC4899'], // Primary to purple to pink
    subtle: [theme.colors.text.primary, theme.colors.primary],
  }

  const gradientColors = colors || presetColors[preset]

  const fontWeightMap = {
    regular: theme.typography.fontWeight.regular,
    medium: theme.typography.fontWeight.medium,
    semibold: theme.typography.fontWeight.semibold,
    bold: theme.typography.fontWeight.bold,
  }

  const textStyle = {
    fontSize: fontSize || theme.typography.fontSize.xxl,
    fontWeight: fontWeightMap[fontWeight],
  }

  // MaskedView approach for iOS/Android gradient text
  return (
    <MaskedView
      maskElement={
        <Text style={[textStyle, style]} {...props}>
          {children}
        </Text>
      }
    >
      <LinearGradient
        colors={gradientColors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.gradient}
      >
        <Text style={[textStyle, style, styles.invisible]} {...props}>
          {children}
        </Text>
      </LinearGradient>
    </MaskedView>
  )
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
  },
  invisible: {
    opacity: 0,
  },
})
