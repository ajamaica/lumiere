import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useAtom } from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus, View } from 'react-native'
import { KeyboardProvider } from 'react-native-keyboard-controller'

import { BiometricLockScreen } from '../src/components/BiometricLockScreen'
import { useDeepLinking } from '../src/hooks/useDeepLinking'
import { useNotifications } from '../src/hooks/useNotifications'
import { OnboardingFlow } from '../src/screens/OnboardingFlow'
import { biometricLockEnabledAtom, onboardingCompletedAtom } from '../src/store'
import { ThemeProvider, useTheme } from '../src/theme'

SplashScreen.preventAutoHideAsync()

function AppContent() {
  const { theme } = useTheme()
  const [onboardingCompleted] = useAtom(onboardingCompletedAtom)
  const [biometricLockEnabled] = useAtom(biometricLockEnabledAtom)
  const [isLocked, setIsLocked] = useState(() => biometricLockEnabled)
  const appState = useRef(AppState.currentState)
  useDeepLinking(biometricLockEnabled && isLocked)
  useNotifications()

  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  const handleUnlock = useCallback(() => {
    setIsLocked(false)
  }, [])

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (
        biometricLockEnabled &&
        appState.current === 'active' &&
        nextState.match(/inactive|background/)
      ) {
        setIsLocked(true)
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

  if (biometricLockEnabled && isLocked) {
    return (
      <View style={backgroundStyle}>
        <BiometricLockScreen onUnlock={handleUnlock} />
      </View>
    )
  }

  return (
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
