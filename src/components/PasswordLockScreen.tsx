import React, { useCallback, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'

import { isPasswordConfigured, setupPassword, verifyPassword } from '../services/webCrypto'
import { useTheme } from '../theme'

interface PasswordLockScreenProps {
  onUnlock: (key: CryptoKey) => void
}

export function PasswordLockScreen({ onUnlock }: PasswordLockScreenProps) {
  const { theme } = useTheme()
  const { t } = useTranslation()
  const isReturning = isPasswordConfigured()

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = useCallback(async () => {
    setError(null)

    if (!password) {
      setError(t('passwordLock.errors.required'))
      return
    }

    if (!isReturning) {
      if (password.length < 6) {
        setError(t('passwordLock.errors.tooShort'))
        return
      }
      if (password !== confirmPassword) {
        setError(t('passwordLock.errors.mismatch'))
        return
      }
    }

    setLoading(true)
    try {
      if (isReturning) {
        const key = await verifyPassword(password)
        if (key) {
          onUnlock(key)
        } else {
          setError(t('passwordLock.errors.incorrect'))
        }
      } else {
        const key = await setupPassword(password)
        onUnlock(key)
      }
    } catch {
      setError(t('passwordLock.errors.generic'))
    } finally {
      setLoading(false)
    }
  }, [password, confirmPassword, isReturning, onUnlock, t])

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
      justifyContent: 'center',
      alignItems: 'center',
      padding: theme.spacing.xl,
    },
    card: {
      width: '100%',
      maxWidth: 400,
      padding: theme.spacing.xl,
    },
    icon: {
      fontSize: 48,
      textAlign: 'center',
      marginBottom: theme.spacing.lg,
    },
    title: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold as '700',
      color: theme.colors.text.primary,
      textAlign: 'center',
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      marginBottom: theme.spacing.xl,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      borderWidth: 1,
      borderColor: error ? theme.colors.status.error : theme.colors.border,
      marginBottom: theme.spacing.lg,
    },
    errorText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.status.error,
      textAlign: 'center',
      marginBottom: theme.spacing.md,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.xxl,
      paddingVertical: theme.spacing.md,
      paddingHorizontal: theme.spacing.xl,
      alignItems: 'center',
      opacity: loading ? 0.5 : 1,
    },
    buttonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
  })

  return (
    <View style={styles.container} accessible={false}>
      <View style={styles.card}>
        <Text style={styles.icon}>{'🔒'}</Text>
        <Text style={styles.title} accessibilityRole="header">
          {isReturning ? t('passwordLock.titleReturning') : t('passwordLock.titleSetup')}
        </Text>
        <Text style={styles.subtitle}>
          {isReturning ? t('passwordLock.subtitleReturning') : t('passwordLock.subtitleSetup')}
        </Text>

        <Text style={styles.label}>{t('passwordLock.passwordLabel')}</Text>
        <TextInput
          style={styles.input}
          value={password}
          onChangeText={setPassword}
          placeholder={t('passwordLock.passwordPlaceholder')}
          placeholderTextColor={theme.colors.text.tertiary}
          secureTextEntry
          autoFocus
          editable={!loading}
          onSubmitEditing={isReturning ? handleSubmit : undefined}
          accessibilityLabel={t('passwordLock.passwordLabel')}
        />

        {!isReturning && (
          <>
            <Text style={styles.label}>{t('passwordLock.confirmLabel')}</Text>
            <TextInput
              style={styles.input}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              placeholder={t('passwordLock.confirmPlaceholder')}
              placeholderTextColor={theme.colors.text.tertiary}
              secureTextEntry
              editable={!loading}
              onSubmitEditing={handleSubmit}
              accessibilityLabel={t('passwordLock.confirmLabel')}
            />
          </>
        )}

        {error && (
          <Text style={styles.errorText} accessibilityRole="alert">
            {error}
          </Text>
        )}

        <TouchableOpacity
          style={styles.button}
          onPress={handleSubmit}
          disabled={loading}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel={
            isReturning ? t('passwordLock.unlockButton') : t('passwordLock.createButton')
          }
        >
          <Text style={styles.buttonText}>
            {loading
              ? t('common.loading')
              : isReturning
                ? t('passwordLock.unlockButton')
                : t('passwordLock.createButton')}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  )
}
