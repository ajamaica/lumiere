import { Ionicons } from '@expo/vector-icons'
import { useAtom } from 'jotai'
import React, { useState } from 'react'
import { KeyboardAvoidingView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { LumiereLogo } from '../components/illustrations/LumiereLogo'
import { Button, Text, TextInput } from '../components/ui'
import { DEFAULT_SESSION_KEY } from '../constants'
import { useServers } from '../hooks/useServers'
import { currentSessionKeyAtom, onboardingCompletedAtom, serverSessionsAtom } from '../store'
import { useTheme } from '../theme'
import { keyboardAvoidingBehavior } from '../utils/platform'

export function OnboardingScreen() {
  const { theme } = useTheme()
  const { addServer } = useServers()
  const [, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [, setServerSessions] = useAtom(serverSessionsAtom)
  const [, setOnboardingCompleted] = useAtom(onboardingCompletedAtom)

  const [localUrl, setLocalUrl] = useState('')
  const [localToken, setLocalToken] = useState('')
  const [localClientId, setLocalClientId] = useState('lumiere-mobile')
  const [localSessionKey, setLocalSessionKey] = useState(DEFAULT_SESSION_KEY)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: theme.spacing.xl,
      justifyContent: 'center',
    },
    header: {
      marginBottom: theme.spacing.xxl,
      alignItems: 'center',
    },
    form: {
      marginBottom: theme.spacing.xxl,
    },
    advancedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
  })

  const handleComplete = async () => {
    if (localUrl.trim() && localToken.trim()) {
      // Create new server
      const serverId = await addServer(
        {
          name: 'My Server',
          url: localUrl.trim(),
          clientId: localClientId.trim(),
          providerType: 'opencraw',
        },
        localToken.trim(),
      )

      // Set session key from onboarding (persists to AsyncStorage)
      const sessionKey = localSessionKey.trim()

      // Store in both places:
      // 1. currentSessionKeyAtom - current active session key
      setCurrentSessionKey(sessionKey)

      // 2. serverSessionsAtom - track session key per server
      setServerSessions((prev) => ({
        ...prev,
        [serverId]: sessionKey,
      }))

      // Mark onboarding complete
      setOnboardingCompleted(true)
    }
  }

  const isValid = localUrl.trim().length > 0 && localToken.trim().length > 0

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView behavior={keyboardAvoidingBehavior} style={styles.keyboardView}>
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <LumiereLogo width={280} height={120} />
          </View>

          <View style={styles.form}>
            <TextInput
              label="Gateway URL"
              value={localUrl}
              onChangeText={setLocalUrl}
              placeholder="https://your-gateway.example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              hint="The URL of your OpenClaw server"
            />

            <TextInput
              label="Gateway Token"
              value={localToken}
              onChangeText={setLocalToken}
              placeholder="Your authentication token"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              hint="Your authentication token for the gateway"
            />

            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
              accessibilityRole="button"
              accessibilityLabel="Advanced options"
              accessibilityState={{ expanded: showAdvanced }}
            >
              <Text variant="label" color="secondary">
                Advanced
              </Text>
              <Ionicons
                name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.text.secondary}
              />
            </TouchableOpacity>

            {showAdvanced && (
              <>
                <TextInput
                  label="Client ID"
                  value={localClientId}
                  onChangeText={setLocalClientId}
                  placeholder="lumiere-mobile"
                  autoCapitalize="none"
                  autoCorrect={false}
                  hint="Identifier for this device (default: lumiere-mobile)"
                />

                <TextInput
                  label="Default Session Key"
                  value={localSessionKey}
                  onChangeText={setLocalSessionKey}
                  placeholder={DEFAULT_SESSION_KEY}
                  autoCapitalize="none"
                  autoCorrect={false}
                  hint={`Session key for chat conversations (default: ${DEFAULT_SESSION_KEY})`}
                />
              </>
            )}
          </View>

          <Button title="Get Started" size="lg" onPress={handleComplete} disabled={!isValid} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
