import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, ScreenHeader, Text, TextInput } from '../src/components/ui'
import { currentSessionKeyAtom, sessionAliasesAtom } from '../src/store'
import { useTheme } from '../src/theme'

export default function EditSessionScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { key } = useLocalSearchParams<{ key: string }>()
  const [sessionAliases, setSessionAliases] = useAtom(sessionAliasesAtom)
  const [currentSessionKey, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)

  const existingAlias = key ? sessionAliases[key] : undefined
  const defaultName = key ? key.split(':').pop() || key : ''

  const [name, setName] = useState(existingAlias ?? defaultName)
  const [sessionKey, setSessionKey] = useState(key ?? '')

  if (!key) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScreenHeader title={t('sessions.editSession')} showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text color="secondary">{t('sessions.sessionNotFound')}</Text>
        </View>
      </SafeAreaView>
    )
  }

  const handleSave = () => {
    const trimmedName = name.trim()

    if (!sessionKey.trim()) {
      Alert.alert(t('common.error'), t('sessions.sessionKeyRequired'))
      return
    }

    // Update aliases
    const newAliases = { ...sessionAliases }
    if (trimmedName && trimmedName !== defaultName) {
      // If the key changed, remove old alias
      if (sessionKey !== key) {
        delete newAliases[key]
      }
      newAliases[sessionKey] = trimmedName
    } else {
      // Remove alias if name matches default
      delete newAliases[key]
    }
    setSessionAliases(newAliases)

    // If the key changed and this was the active session, update it
    if (sessionKey !== key && currentSessionKey === key) {
      setCurrentSessionKey(sessionKey)
    }

    router.back()
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    formRow: {
      marginBottom: theme.spacing.md,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('sessions.editSession')} showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.formRow}>
            <TextInput
              label={t('sessions.displayName')}
              value={name}
              onChangeText={setName}
              placeholder="My Chat Session"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.formRow}>
            <TextInput
              label={t('sessions.sessionKey')}
              value={sessionKey}
              onChangeText={setSessionKey}
              placeholder="agent:main:session-name"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.buttonRow}>
            <Button title={t('common.save')} onPress={handleSave} style={{ flex: 1 }} />
            <Button
              title={t('common.cancel')}
              variant="secondary"
              onPress={() => router.back()}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
