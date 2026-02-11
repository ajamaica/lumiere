import '../src/i18n'

import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, AppStateStatus, Platform, View } from 'react-native'

import { BiometricLockScreen } from '../src/components/BiometricLockScreen'
import { PasswordLockScreen } from '../src/components/PasswordLockScreen'
import { ErrorBoundary } from '../src/components/ui'
import { useAppleShortcuts } from '../src/hooks/useAppleShortcuts'
import { useDeepLinking } from '../src/hooks/useDeepLinking'
import { useLanguage } from '../src/hooks/useLanguage'
import { useNotifications } from '../src/hooks/useNotifications'
import { useQuickActions } from '../src/hooks/useQuickActions'
import { useShareExtension } from '../src/hooks/useShareIntent'
import { OnboardingFlow } from '../src/screens/OnboardingFlow'
import { isPasswordConfigured } from '../src/services/webCrypto'
import {
  biometricLockEnabledAtom,
  getSessionCryptoKey,
  getStore,
  hasSessionCryptoKey,
  hydrateSecureServers,
  onboardingCompletedAtom,
  setSessionCryptoKey,
} from '../src/store'
import { ThemeProvider, useTheme } from '../src/theme'
import { KeyboardProvider } from '../src/utils/KeyboardProvider'

SplashScreen.preventAutoHideAsync()

// Load Ionicons font on web via CSS @font-face.
// The font file lives in public/fonts/ and is copied to dist/fonts/ during export.
// This avoids the broken bundled path through pnpm's node_modules that Cloudflare Pages can't serve.
if (Platform.OS === 'web' && typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @font-face {
      font-family: 'Ionicons';
      src: url('/fonts/Ionicons.ttf') format('truetype');
      font-display: swap;
    }
  `
  document.head.appendChild(style)
}

function AppContent() {
  const { theme } = useTheme()
  const [onboardingCompleted] = useAtom(onboardingCompletedAtom)
  const [biometricLockEnabled] = useAtom(biometricLockEnabledAtom)
  const [isUnlocked, setIsUnlocked] = useState(false)
  const appState = useRef(AppState.currentState)
  const isLocked = biometricLockEnabled && !isUnlocked
  useDeepLinking(isLocked, onboardingCompleted)
  useNotifications()
  useQuickActions()
  useAppleShortcuts()
  useShareExtension()
  useLanguage() // Initialize language sync

  // Web password lock state — only used on web
  const [webPasswordUnlocked, setWebPasswordUnlocked] = useState(() => {
    if (Platform.OS !== 'web') return true
    return hasSessionCryptoKey()
  })

  // On mount, try to restore CryptoKey from sessionStorage (survives page reload)
  useEffect(() => {
    if (Platform.OS !== 'web' || webPasswordUnlocked) return
    let cancelled = false
    const restore = async () => {
      const key = await getSessionCryptoKey()
      if (cancelled) return
      if (key) {
        await hydrateSecureServers(getStore(), key)
        setWebPasswordUnlocked(true)
      }
    }
    restore()
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handlePasswordUnlock = useCallback(async (key: CryptoKey) => {
    await setSessionCryptoKey(key)
    await hydrateSecureServers(getStore(), key)
    setWebPasswordUnlocked(true)
  }, [])

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

  // 1. Onboarding must complete first (server setup, etc.)
  if (!onboardingCompleted) {
    return (
      <View style={backgroundStyle}>
        <OnboardingFlow />
      </View>
    )
  }

  // 2. Web password lock — shown after setup when a password has been
  //    configured previously OR when this is the first session after
  //    onboarding (password not yet created).
  const needsWebPasswordLock =
    Platform.OS === 'web' &&
    !webPasswordUnlocked &&
    (isPasswordConfigured() || !hasSessionCryptoKey())
  if (needsWebPasswordLock) {
    return (
      <View style={backgroundStyle}>
        <PasswordLockScreen onUnlock={handlePasswordUnlock} />
      </View>
    )
  }

  // 3. Biometric lock (native only)
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
