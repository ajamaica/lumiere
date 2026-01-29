import { Colors,darkColors, lightColors } from './colors'
import { BorderRadius,borderRadius, Spacing, spacing } from './spacing'
import { Typography,typography } from './typography'

export interface Theme {
  colors: Colors
  typography: Typography
  spacing: Spacing
  borderRadius: BorderRadius
  isDark: boolean
}

export const lightTheme: Theme = {
  colors: lightColors,
  typography,
  spacing,
  borderRadius,
  isDark: false,
}

export const darkTheme: Theme = {
  colors: darkColors,
  typography,
  spacing,
  borderRadius,
  isDark: true,
}

export type ThemeMode = 'light' | 'dark' | 'system'
