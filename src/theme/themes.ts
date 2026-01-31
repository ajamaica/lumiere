import { Colors, ColorThemeKey, colorThemes, darkColors, lightColors } from './colors'
import { BorderRadius, borderRadius, Spacing, spacing } from './spacing'
import { Typography, typography } from './typography'

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

/**
 * Apply a color theme to a base theme, overriding primary and message user colors.
 */
export function applyColorTheme(baseTheme: Theme, colorThemeKey: ColorThemeKey): Theme {
  if (colorThemeKey === 'default') {
    return baseTheme
  }

  const palette = colorThemes[colorThemeKey]
  const variant = baseTheme.isDark ? palette.dark : palette.light

  return {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: variant.primary,
      primaryLight: variant.primaryLight,
      primaryDark: variant.primaryDark,
      message: {
        ...baseTheme.colors.message,
        user: variant.messageUser,
        userText: variant.messageUserText,
      },
    },
  }
}
