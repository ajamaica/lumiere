import '../src/i18n'

import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, AppStateStatus, View } from 'react-native'
import { KeyboardProvider } from 'react-native-keyboard-controller'

import { BiometricLockScreen } from '../src/components/BiometricLockScreen'
import { ErrorBoundary } from '../src/components/ui'
import { useAppleShortcuts } from '../src/hooks/useAppleShortcuts'
import { useDeepLinking } from '../src/hooks/useDeepLinking'
import { useLanguage } from '../src/hooks/useLanguage'
import { useNotifications } from '../src/hooks/useNotifications'
import { useQuickActions } from '../src/hooks/useQuickActions'
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
  useAppleShortcuts()
  useLanguage() // Initialize language sync

  // Use modal presentation for all devices to ensure content is fully accessible
  const modalOptions = useMemo(
    () =>
      ({
        presentation: 'modal',
        animation: 'slide_from_bottom',
        headerShown: false,
      }) as const,
    [],
  )

  useEffect(() => {
    SplashScreen.hideAsync()
  }, [])

  const handleUnlock = useCallback(() => {
    setIsUnlocked(true)
  }, [])

  useEffect(() => {
    const handleAppStateChange = (nextState: AppStateStatus) => {
      if (biometricLockEnabled && nextState === 'background') {
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

  if (isLocked) {
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
      <Stack.Screen name="settings" options={modalOptions} />
      <Stack.Screen name="servers" options={modalOptions} />
      <Stack.Screen name="add-server" options={modalOptions} />
      <Stack.Screen name="edit-server" options={modalOptions} />
      <Stack.Screen name="sessions" options={modalOptions} />
      <Stack.Screen name="edit-session" options={modalOptions} />
      <Stack.Screen name="overview" options={modalOptions} />
      <Stack.Screen name="scheduler" options={modalOptions} />
      <Stack.Screen name="skills" options={modalOptions} />
      <Stack.Screen name="gallery" options={modalOptions} />
      <Stack.Screen name="colors" options={modalOptions} />
      <Stack.Screen name="favorites" options={modalOptions} />
      <Stack.Screen name="triggers" options={modalOptions} />
      <Stack.Screen name="ollama-models" options={modalOptions} />
      <Stack.Screen name="backup-servers" options={modalOptions} />
      <Stack.Screen name="restore-servers" options={modalOptions} />
      <Stack.Screen name="workflow" options={modalOptions} />
    </Stack>
  )
}

export default function RootLayout() {
  return (
    <KeyboardProvider>
      <ThemeProvider>
        <ErrorBoundary>
          <AppContent />
        </ErrorBoundary>
      </ThemeProvider>
    </KeyboardProvider>
  )
}
