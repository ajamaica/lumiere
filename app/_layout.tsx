import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useAtom } from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus, StyleSheet, View } from 'react-native'
import { KeyboardProvider } from 'react-native-keyboard-controller'

import { BiometricLockScreen } from '../src/components/BiometricLockScreen'
import { useDeepLinking } from '../src/hooks/useDeepLinking'
import { useNotifications } from '../src/hooks/useNotifications'
import { useQuickActions } from '../src/hooks/useQuickActions'
import { useWidgetSync } from '../src/hooks/useWidgetSync'
import { OnboardingFlow } from '../src/screens/OnboardingFlow'
import { biometricLockEnabledAtom, onboardingCompletedAtom } from '../src/store'
import { ThemeProvider, useTheme } from '../src/theme'

SplashScreen.preventAutoHideAsync()

function AppContent() {
  const { theme } = useTheme()
  const [onboardingCompleted] = useAtom(onboardingCompletedAtom)
  const [biometricLockEnabled] = useAtom(biometricLockEnabledAtom)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const appState = useRef(AppState.currentState)
  const isLocked = biometricLockEnabled && !isUnlocked
  useDeepLinking(isLocked)
  useNotifications()
  useQuickActions()
  useWidgetSync()

  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  const handleUnlock = useCallback(() => {
    setIsUnlocked(true)
  }, [])

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (
        biometricLockEnabled &&
        appState.current === 'active' &&
        nextState.match(/inactive|background/)
      ) {
        setIsUnlocked(false)
      }
      appState.current = nextState
    }

    const subscription = AppState.addEventListener('change', handleAppStateChange)
    return () => subscription.remove()
  }, [biometricLockEnabled])

  const backgroundStyle = { flex: 1, backgroundColor: theme.colors.background }

  if (!onboardingCompleted) {
    return (
      <View style={backgroundStyle}>
        <OnboardingFlow />
      </View>
    )
  }

  return (
    <View style={backgroundStyle}>
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen
          name="settings"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="servers"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="add-server"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="edit-server"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="sessions"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="edit-session"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="overview"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="scheduler"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="gallery"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="colors"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="favorites"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="triggers"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
        <Stack.Screen
          name="ollama-models"
          options={{
            presentation: 'modal',
            animation: 'slide_from_bottom',
            headerShown: false,
          }}
        />
      </Stack>
      {isLocked && (
        <View style={[StyleSheet.absoluteFill, backgroundStyle]}>
          <BiometricLockScreen onUnlock={handleUnlock} />
        </View>
      )}
    </View>
  )
}

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <ThemeProvider>
        <AppContent />
      </ThemeProvider>
    </KeyboardProvider>
  )
}
