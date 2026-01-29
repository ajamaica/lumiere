import React, { createContext, useContext, useEffect, ReactNode, useMemo } from 'react'
import { useColorScheme } from 'react-native'
import { useAtom } from 'jotai'
import * as SystemUI from 'expo-system-ui'
import { lightTheme, darkTheme, Theme, ThemeMode } from './themes'
import { themeModeAtom } from '../store'

interface ThemeContextType {
  theme: Theme
  themeMode: ThemeMode
  setThemeMode: (mode: ThemeMode) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemColorScheme = useColorScheme()
  const [themeMode, setThemeMode] = useAtom(themeModeAtom)

  // Determine active theme based on mode
  const theme = useMemo<Theme>(() => {
    if (themeMode === 'system') {
      return systemColorScheme === 'dark' ? darkTheme : lightTheme
    }
    return themeMode === 'dark' ? darkTheme : lightTheme
  }, [themeMode, systemColorScheme])

  // Update system UI colors
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background)
  }, [theme])

  const toggleTheme = () => {
    const newMode = theme.isDark ? 'light' : 'dark'
    setThemeMode(newMode)
  }

  return (
    <ThemeContext.Provider value={{ theme, themeMode, setThemeMode, toggleTheme }}>
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
