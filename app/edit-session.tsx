import { useLocalSearchParams, useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, ScreenHeader, Text, TextInput } from '../src/components/ui'
import { currentSessionKeyAtom, sessionAliasesAtom, sessionContextAtom } from '../src/store'
import { useTheme } from '../src/theme'
import { keyboardAvoidingBehavior } from '../src/utils/platform'
import { SYSTEM_MESSAGE_VARIABLES } from '../src/utils/systemMessageVariables'

export default function EditSessionScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { key } = useLocalSearchParams<{ key: string }>()
  const [sessionAliases, setSessionAliases] = useAtom(sessionAliasesAtom)
  const [currentSessionKey, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [sessionContextMap, setSessionContextMap] = useAtom(sessionContextAtom)

  const existingAlias = key ? sessionAliases[key] : undefined
  const defaultName = key ? key.split(':').pop() || key : ''
  const existingSystemMessage = key ? (sessionContextMap[key]?.systemMessage ?? '') : ''

  const [name, setName] = useState(existingAlias ?? defaultName)
  const [sessionKey, setSessionKey] = useState(key ?? '')
  const [systemMessage, setSystemMessage] = useState(existingSystemMessage)
  const systemMessageInputRef = useRef<RNTextInput>(null)
  const cursorPositionRef = useRef<number>(systemMessage.length)

  const insertVariable = useCallback(
    (variableName: string) => {
      const token = `{{${variableName}}}`
      const pos = cursorPositionRef.current
      const before = systemMessage.slice(0, pos)
      const after = systemMessage.slice(pos)
      const updated = before + token + after
      setSystemMessage(updated)
      cursorPositionRef.current = pos + token.length
      systemMessageInputRef.current?.focus()
    },
    [systemMessage],
  )

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

    // Update session context (system message)
    const newContextMap = { ...sessionContextMap }
    const trimmedSystemMessage = systemMessage.trim()
    if (trimmedSystemMessage) {
      // If the key changed, remove old context entry
      if (sessionKey !== key) {
        delete newContextMap[key]
      }
      newContextMap[sessionKey] = { systemMessage: trimmedSystemMessage }
    } else {
      // Remove context if system message is empty
      delete newContextMap[key]
      if (sessionKey !== key) {
        delete newContextMap[sessionKey]
      }
    }
    setSessionContextMap(newContextMap)

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
    variableChips: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
    },
    chip: {
      borderRadius: theme.borderRadius.xxl,
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.xs,
      borderWidth: 1,
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
      <KeyboardAvoidingView behavior={keyboardAvoidingBehavior} style={styles.keyboardView}>
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

          <View style={styles.formRow}>
            <TextInput
              ref={systemMessageInputRef}
              label={t('sessions.systemMessage')}
              hint={t('sessions.systemMessageHint')}
              value={systemMessage}
              onChangeText={setSystemMessage}
              onSelectionChange={(e) => {
                cursorPositionRef.current = e.nativeEvent.selection.end
              }}
              placeholder={t('sessions.systemMessagePlaceholder')}
              multiline
              numberOfLines={4}
              textAlignVertical="top"
              style={{ minHeight: 100 }}
              autoCapitalize="sentences"
              autoCorrect
            />
            <Text
              style={{
                fontSize: theme.typography.fontSize.sm,
                color: theme.colors.text.secondary,
                marginBottom: theme.spacing.xs,
              }}
            >
              {t('sessions.variablesLabel')}
            </Text>
            <View style={styles.variableChips}>
              {SYSTEM_MESSAGE_VARIABLES.map((v) => (
                <TouchableOpacity
                  key={v.name}
                  style={[
                    styles.chip,
                    {
                      backgroundColor: theme.colors.primary + '18',
                      borderColor: theme.colors.primary + '40',
                    },
                  ]}
                  onPress={() => insertVariable(v.name)}
                  accessibilityRole="button"
                  accessibilityLabel={t(v.labelKey)}
                >
                  <Text
                    style={{
                      fontSize: theme.typography.fontSize.xs,
                      color: theme.colors.primary,
                      fontFamily: theme.typography.fontFamily.monospace,
                      fontWeight: theme.typography.fontWeight.semibold,
                    }}
                  >
                    {`{{${v.name}}}`}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
