import { Ionicons } from '@expo/vector-icons'
import { useAtom } from 'jotai'
import React, { useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

import { isAvailable as isAppleAIAvailable } from '../../modules/apple-intelligence'
import { Button, Text, TextInput } from '../components/ui'
import { DEFAULT_SESSION_KEY } from '../constants'
import { useServers } from '../hooks/useServers'
import { ProviderType } from '../services/providers'
import { currentSessionKeyAtom, onboardingCompletedAtom, serverSessionsAtom } from '../store'
import { useTheme } from '../theme'

const PROVIDER_OPTIONS: { value: ProviderType; label: string }[] = [
  { value: 'molt', label: 'OpenClaw' },
  { value: 'ollama', label: 'Ollama' },
]

export function SetupScreen() {
  const { theme } = useTheme()
  const { addServer } = useServers()
  const [, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [, setServerSessions] = useAtom(serverSessionsAtom)
  const [, setOnboardingCompleted] = useAtom(onboardingCompletedAtom)

  const [providerType, setProviderType] = useState<ProviderType>('molt')
  const [localUrl, setLocalUrl] = useState('')
  const [localToken, setLocalToken] = useState('')
  const [localClientId, setLocalClientId] = useState('lumiere-mobile')
  const [localSessionKey, setLocalSessionKey] = useState(DEFAULT_SESSION_KEY)
  const [localModel, setLocalModel] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const styles = StyleSheet.create({
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: theme.spacing.xl,
      justifyContent: 'center',
    },
    form: {
      marginBottom: theme.spacing.xxl,
    },
    providerPicker: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    providerOption: {
      flex: 1,
      paddingVertical: theme.spacing.sm + 2,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignItems: 'center',
    },
    providerOptionActive: {
      borderColor: theme.colors.primary,
      backgroundColor: theme.isDark ? 'rgba(99,102,241,0.15)' : 'rgba(99,102,241,0.08)',
    },
    providerOptionText: {
      fontSize: 14,
      color: theme.colors.text.secondary,
    },
    providerOptionTextActive: {
      color: theme.colors.primary,
      fontWeight: '600',
    },
    advancedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    echoLink: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      marginTop: theme.spacing.lg,
    },
  })

  const handleComplete = async () => {
    if (providerType === 'molt' && localUrl.trim() && localToken.trim()) {
      const serverId = await addServer(
        {
          name: 'My Server',
          url: localUrl.trim(),
          clientId: localClientId.trim(),
          providerType: 'molt',
        },
        localToken.trim(),
      )

      const sessionKey = localSessionKey.trim()
      setCurrentSessionKey(sessionKey)
      setServerSessions((prev) => ({
        ...prev,
        [serverId]: sessionKey,
      }))

      setOnboardingCompleted(true)
    } else if (providerType === 'ollama' && localUrl.trim()) {
      const serverId = await addServer(
        {
          name: 'My Ollama',
          url: localUrl.trim(),
          providerType: 'ollama',
          model: localModel.trim() || undefined,
        },
        'ollama-no-token',
      )

      const sessionKey = DEFAULT_SESSION_KEY
      setCurrentSessionKey(sessionKey)
      setServerSessions((prev) => ({
        ...prev,
        [serverId]: sessionKey,
      }))

      setOnboardingCompleted(true)
    }
  }

  const handleCreateEchoAgent = async () => {
    const serverId = await addServer(
      {
        name: 'Echo Agent',
        url: '',
        providerType: 'echo',
      },
      '',
    )

    const sessionKey = DEFAULT_SESSION_KEY
    setCurrentSessionKey(sessionKey)
    setServerSessions((prev) => ({
      ...prev,
      [serverId]: sessionKey,
    }))

    setOnboardingCompleted(true)
  }

  const handleCreateLocalAI = async () => {
    const serverId = await addServer(
      {
        name: 'Local AI',
        url: '',
        providerType: 'apple',
      },
      '',
    )

    const sessionKey = DEFAULT_SESSION_KEY
    setCurrentSessionKey(sessionKey)
    setServerSessions((prev) => ({
      ...prev,
      [serverId]: sessionKey,
    }))

    setOnboardingCompleted(true)
  }

  const isValid =
    providerType === 'molt'
      ? localUrl.trim().length > 0 && localToken.trim().length > 0
      : localUrl.trim().length > 0

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.keyboardView}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <Text variant="heading1" style={{ marginBottom: theme.spacing.sm }}>
          Setup your server
        </Text>
        <Text variant="body" color="secondary" style={{ marginBottom: theme.spacing.xxl }}>
          Choose a provider and connect to start chatting with your agents.
        </Text>

        <View style={styles.form}>
          <View style={styles.providerPicker}>
            {PROVIDER_OPTIONS.map((option) => (
              <TouchableOpacity
                key={option.value}
                style={[
                  styles.providerOption,
                  providerType === option.value && styles.providerOptionActive,
                ]}
                onPress={() => setProviderType(option.value)}
              >
                <Text
                  style={[
                    styles.providerOptionText,
                    providerType === option.value && styles.providerOptionTextActive,
                  ]}
                >
                  {option.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <TextInput
            label="URL"
            value={localUrl}
            onChangeText={setLocalUrl}
            placeholder={
              providerType === 'ollama'
                ? 'http://localhost:11434'
                : 'https://your-gateway.example.com'
            }
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            hint={
              providerType === 'ollama'
                ? 'The URL of your Ollama server'
                : 'The URL of your OpenClaw server'
            }
          />

          {providerType === 'molt' && (
            <TextInput
              label="Token"
              value={localToken}
              onChangeText={setLocalToken}
              placeholder="Your authentication token"
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              hint="Your authentication token for the gateway"
            />
          )}

          {providerType === 'ollama' && (
            <TextInput
              label="Model"
              value={localModel}
              onChangeText={setLocalModel}
              placeholder="llama3.2"
              autoCapitalize="none"
              autoCorrect={false}
              hint="Ollama model to use (default: llama3.2)"
            />
          )}

          {providerType === 'molt' && (
            <>
              <TouchableOpacity
                style={styles.advancedToggle}
                onPress={() => setShowAdvanced(!showAdvanced)}
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
            </>
          )}
        </View>

        <Button title="Get Started" size="lg" onPress={handleComplete} disabled={!isValid} />

        {isAppleAIAvailable() && (
          <TouchableOpacity style={styles.echoLink} onPress={handleCreateLocalAI}>
            <Text variant="bodySmall" color="secondary">
              Create a Local AI server
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity style={styles.echoLink} onPress={handleCreateEchoAgent}>
          <Text variant="bodySmall" color="secondary">
            Create demo Echo Agent
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
