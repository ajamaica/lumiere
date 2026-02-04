import * as LocalAuthentication from 'expo-local-authentication'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AppState, AppStateStatus, StyleSheet, Text, TouchableOpacity, View } from 'react-native'

import { useTheme } from '../theme'

interface BiometricLockScreenProps {
  onUnlock: () => void
}

export function BiometricLockScreen({ onUnlock }: BiometricLockScreenProps) {
  const { theme } = useTheme()
  const [error, setError] = useState<string | null>(null)
  const appState = useRef(AppState.currentState)

  const authenticate = useCallback(async () => {
    setError(null)
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage: 'Unlock Lumiere',
      disableDeviceFallback: false,
    })
    if (result.success) {
      onUnlock()
    } else if (result.error !== 'user_cancel' && result.error !== 'system_cancel') {
      setError('Authentication failed. Tap to try again.')
    }
  }, [onUnlock])

  useEffect(() => {
    let mounted = true
    const doInitialAuth = async () => {
      if (!mounted) return
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Unlock Lumiere',
        disableDeviceFallback: false,
      })
      if (!mounted) return
      if (result.success) {
        onUnlock()
      } else if (result.error !== 'user_cancel' && result.error !== 'system_cancel') {
        setError('Authentication failed. Tap to try again.')
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
    <View style={styles.container}>
      <Text style={styles.title}>
        {error ? 'Failed to authenticate' : 'Locked'}
      </Text>
      <Text style={styles.subtitle}>
        {error
          ? 'There was an issue with your authentication attempt.\nPlease try again.'
          : 'Authenticate to unlock Lumiere'}
      </Text>
      <TouchableOpacity style={styles.retryButton} onPress={authenticate} activeOpacity={0.7}>
        <Text style={styles.retryText}>{error ? 'Try Again' : 'Unlock'}</Text>
      </TouchableOpacity>
    </View>
  )
}
