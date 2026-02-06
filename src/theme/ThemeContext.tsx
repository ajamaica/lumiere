import * as SystemUI from 'expo-system-ui'
import { useAtom } from 'jotai'
import React, { createContext, ReactNode, useContext, useEffect, useMemo } from 'react'
import { useColorScheme } from 'react-native'

import { colorThemeAtom, themeModeAtom } from '../store'
import { ColorThemeKey } from './colors'
import { applyColorTheme, darkTheme, lightTheme, Theme, ThemeMode } from './themes'

interface ThemeContextType {
  theme: Theme
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  toggleTheme: () => void
  colorTheme: ColorThemeKey
  setColorTheme: (theme: ColorThemeKey) => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme()
  const [themeMode, setThemeMode] = useAtom(themeModeAtom)
  const [colorTheme, setColorThemeRaw] = useAtom(colorThemeAtom)

  const setColorTheme = (key: ColorThemeKey) => setColorThemeRaw(key)

  // Determine active theme based on mode and color theme
  const theme = useMemo<Theme>(() => {
    let baseTheme: Theme
    if (themeMode === 'system') {
      baseTheme = systemColorScheme === 'dark' ? darkTheme : lightTheme
    } else {
      baseTheme = themeMode === 'dark' ? darkTheme : lightTheme
    }
    return applyColorTheme(baseTheme, (colorTheme as ColorThemeKey) || 'default')
  }, [themeMode, systemColorScheme, colorTheme])

  // Update system UI colors
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background)
    // Set status bar style based on theme: dark icons for light theme, light icons for dark theme
    SystemUI.setStatusBarStyleAsync(theme.isDark ? 'light' : 'dark')
  }, [theme])

  const toggleTheme = () => {
    const newMode = theme.isDark ? 'light' : 'dark'
    setThemeMode(newMode)
  }

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeMode,
        setThemeMode,
        toggleTheme,
        colorTheme: (colorTheme as ColorThemeKey) || 'default',
        setColorTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext)
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider')
  }
  return context
}
