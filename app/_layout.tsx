import { Stack } from 'expo-router'
import { useAtom } from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus } from 'react-native'
import { KeyboardProvider } from 'react-native-keyboard-controller'

import { BiometricLockScreen } from '../src/components/BiometricLockScreen'
import { useDeepLinking } from '../src/hooks/useDeepLinking'
import { OnboardingScreen } from '../src/screens/OnboardingScreen'
import { biometricLockEnabledAtom, onboardingCompletedAtom } from '../src/store'
import { ThemeProvider } from '../src/theme'

function AppContent() {
  const [onboardingCompleted] = useAtom(onboardingCompletedAtom)
  const [biometricLockEnabled] = useAtom(biometricLockEnabledAtom)
  const [isLocked, setIsLocked] = useState(() => biometricLockEnabled)
  const appState = useRef(AppState.currentState)
  useDeepLinking()

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

  if (!onboardingCompleted) {
    return <OnboardingScreen />
  }

  if (biometricLockEnabled && isLocked) {
    return <BiometricLockScreen onUnlock={handleUnlock} />
  }

  return (
    <Stack
      screenOptions={{
        headerShown: false,
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
        name="sessions"
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
        name="favorites"
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
