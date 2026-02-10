import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  AppState,
  AppStateStatus,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { useTheme } from '../theme'

interface BiometricLockScreenProps {
  onUnlock: () => void
}

export function BiometricLockScreen({ onUnlock }: BiometricLockScreenProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const [error, setError] = useState<string | null>(null)
  const appState = useRef(AppState.currentState)

  const authenticate = useCallback(async () => {
    if (Platform.OS === 'web') {
      onUnlock()
      return
    }
    setError(null)
    const LocalAuthentication = await import('expo-local-authentication')
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: t('biometricLock.unlockPrompt'),
      disableDeviceFallback: false,
    })
    if (result.success) {
      onUnlock()
    } else if (result.error !== 'user_cancel' && result.error !== 'system_cancel') {
      setError(t('biometricLock.authFailed'))
    }
  }, [onUnlock, t])

  useEffect(() => {
    if (Platform.OS === 'web') {
      onUnlock()
      return
    }
    let mounted = true
    const doInitialAuth = async () => {
      if (!mounted) return
      const LocalAuthentication = await import('expo-local-authentication')
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('biometricLock.unlockPrompt'),
        disableDeviceFallback: false,
      })
      if (!mounted) return
      if (result.success) {
        onUnlock()
      } else if (result.error !== 'user_cancel' && result.error !== 'system_cancel') {
        setError(t('biometricLock.authFailed'))
      }
    }
    doInitialAuth()
    return () => {
      mounted = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const handleAppState = (nextState: AppStateStatus) => {
      if (nextState === 'active' && appState.current !== 'active') {
        authenticate()
      }
      appState.current = nextState
    }
    const subscription = AppState.addEventListener('change', handleAppState)
    return () => subscription.remove()
  }, [authenticate])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold as '700',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.md,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    retryButton: {
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      borderRadius: 12,
      backgroundColor: theme.colors.surface,
      alignSelf: 'stretch',
      alignItems: 'center',
    },
    retryText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
  })

  return (
    <View style={styles.container} accessible={false}>
      <Text style={styles.title} accessibilityRole="header">
        {error ? t('biometricLock.failed') : t('biometricLock.locked')}
      </Text>
      <Text style={styles.subtitle}>
        {error ? t('biometricLock.failedMessage') : t('biometricLock.authenticateToUnlock')}
      </Text>
      {error && (
        <Text accessibilityRole="alert" style={{ position: 'absolute', opacity: 0 }}>
          {t('biometricLock.authFailed')}
        </Text>
      )}
      <TouchableOpacity
        style={styles.retryButton}
        onPress={authenticate}
        activeOpacity={0.7}
        accessibilityRole="button"
        accessibilityLabel={error ? t('biometricLock.tryAgain') : t('biometricLock.unlock')}
      >
        <Text style={styles.retryText}>
          {error ? t('biometricLock.tryAgain') : t('biometricLock.unlock')}
        </Text>
      </TouchableOpacity>
    </View>
  )
}
