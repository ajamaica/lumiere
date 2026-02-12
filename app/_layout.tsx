import '../src/i18n'

import { Stack } from 'expo-router'
import * as SplashScreen from 'expo-splash-screen'
import { useAtom } from 'jotai'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AppState, AppStateStatus, View } from 'react-native'

import { BiometricLockScreen } from '../src/components/BiometricLockScreen'
import { PasswordLockScreen } from '../src/components/PasswordLockScreen'
import { ErrorBoundary } from '../src/components/ui'
import { useAndroidShortcuts } from '../src/hooks/useAndroidShortcuts'
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
  secureStoreHydratedAtom,
  setSessionCryptoKey,
} from '../src/store'
import { ThemeProvider, useTheme } from '../src/theme'
import { KeyboardProvider } from '../src/utils/KeyboardProvider'
import { isWeb } from '../src/utils/platform'

SplashScreen.preventAutoHideAsync()

// Load Ionicons font on web via CSS @font-face.
// The font file lives in public/fonts/ and is copied to dist/fonts/ during export.
// This avoids the broken bundled path through pnpm's node_modules that Cloudflare Pages can't serve.
if (isWeb && typeof document !== 'undefined') {
  const style = document.createElement('style')
  style.textContent = `
    @font-face {
      font-family: 'Ionicons';
      src: url('/fonts/Ionicons.ttf') format('truetype');
      font-display: swap;
    }
  `
  document.head.appendChild(style)

  // Chrome extension — slim scrollbars and popup sizing.
  const params = new URLSearchParams(window.location.search)
  const extensionMode = params.get('mode') // 'popup' | 'sidebar' | null

  if (extensionMode) {
    const extensionStyle = document.createElement('style')
    extensionStyle.textContent = `
      /* Thin, unobtrusive scrollbars for the extension */
      ::-webkit-scrollbar {
        width: 4px;
        height: 4px;
      }
      ::-webkit-scrollbar-track {
        background: transparent;
      }
      ::-webkit-scrollbar-thumb {
        background: rgba(128, 128, 128, 0.3);
        border-radius: 4px;
      }
      ::-webkit-scrollbar-thumb:hover {
        background: rgba(128, 128, 128, 0.5);
      }
      /* Firefox */
      * {
        scrollbar-width: thin;
        scrollbar-color: rgba(128, 128, 128, 0.3) transparent;
      }
    `
    document.head.appendChild(extensionStyle)
  }

  // Popup mode — fixed dimensions so the popup renders at a mobile-app-like size.
  if (extensionMode === 'popup') {
    const popupStyle = document.createElement('style')
    popupStyle.textContent = `
      html, body, #root {
        width: 400px;
        height: 600px;
        overflow: hidden;
      }
    `
    document.head.appendChild(popupStyle)
  }
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
  useAndroidShortcuts()
  useShareExtension()
  useLanguage() // Initialize language sync

  // Web password lock state — only used on web
  const [webPasswordUnlocked, setWebPasswordUnlocked] = useState(() => {
    if (!isWeb) return true
    return hasSessionCryptoKey()
  })
  // Track whether encrypted data has been loaded into the atom.
  // On native this is always true (not used); on web it becomes true
  // after hydrateSecureServers completes.
  const [secureHydrated] = useAtom(secureStoreHydratedAtom)

  // On mount, hydrate secure servers from encrypted localStorage when a
  // session key is available.  This covers page reloads where the key
  // survives in sessionStorage but the in-memory atom resets to {}.
  useEffect(() => {
    if (!isWeb) return
    let cancelled = false
    const restore = async () => {
      const key = await getSessionCryptoKey()
      if (cancelled) return
      if (!key) {
        // The sync check (hasSessionCryptoKey) found a value but the
        // async import failed — the stored JWK is corrupt or invalid.
        // Fall back to the password lock screen so the user can recover.
        setWebPasswordUnlocked(false)
        return
      }
      try {
        await hydrateSecureServers(getStore(), key)
      } catch {
        // Decryption / storage errors are non-fatal.
      }
      if (!cancelled) setWebPasswordUnlocked(true)
    }
    restore()
    return () => {
      cancelled = true
    }
  }, [])

  const handlePasswordUnlock = useCallback(async (key: CryptoKey) => {
    try {
      await setSessionCryptoKey(key)
      await hydrateSecureServers(getStore(), key)
    } catch {
      // Hydration may fail on first setup (no encrypted data yet) — that's OK.
    }
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
    isWeb && !webPasswordUnlocked && (isPasswordConfigured() || !hasSessionCryptoKey())
  if (needsWebPasswordLock) {
    return (
      <View style={backgroundStyle}>
        <PasswordLockScreen onUnlock={handlePasswordUnlock} />
      </View>
    )
  }

  // 3. Wait for encrypted data to hydrate before rendering the app.
  //    Without this, useServers mounts with an empty atom and the
  //    auto-persist effect can overwrite localStorage with {}.
  if (isWeb && !secureHydrated) {
    return <View style={backgroundStyle} />
  }

  // 4. Biometric lock (native only)
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
      <Stack.Screen name="missions" options={modalOptions} />
      <Stack.Screen name="create-mission" options={modalOptions} />
      <Stack.Screen name="mission-detail" options={modalOptions} />
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
