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
import { Button, Dropdown, Text, TextInput } from '../components/ui'
import { getAllProviderOptions } from '../config/providerOptions'
import { DEFAULT_SESSION_KEY } from '../constants'
import { useServers } from '../hooks/useServers'
import { ProviderType } from '../services/providers'
import { currentSessionKeyAtom, onboardingCompletedAtom, serverSessionsAtom } from '../store'
import { useTheme } from '../theme'

export function SetupScreen() {
  const { theme } = useTheme()
  const { addServer } = useServers()
  const [, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [, setServerSessions] = useAtom(serverSessionsAtom)
  const [, setOnboardingCompleted] = useAtom(onboardingCompletedAtom)

  const allOptions = getAllProviderOptions(theme.colors.text.primary)
  const providerOptionsList = isAppleAIAvailable()
    ? allOptions
    : allOptions.filter((o) => o.value !== 'apple')

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
    advancedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
  })

  const needsUrl = providerType === 'molt' || providerType === 'ollama' || providerType === 'claudie' || providerType === 'openai'
  const needsToken = providerType === 'molt' || providerType === 'claudie' || providerType === 'openai'

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
    } else if (providerType === 'claudie' && localUrl.trim() && localToken.trim()) {
      const serverId = await addServer(
        {
          name: 'My Claude',
          url: localUrl.trim(),
          providerType: 'claudie',
          model: localModel.trim() || undefined,
        },
        localToken.trim(),
      )

      const sessionKey = DEFAULT_SESSION_KEY
      setCurrentSessionKey(sessionKey)
      setServerSessions((prev) => ({
        ...prev,
        [serverId]: sessionKey,
      }))

      setOnboardingCompleted(true)
    } else if (providerType === 'openai' && localUrl.trim() && localToken.trim()) {
      const serverId = await addServer(
        {
          name: 'My OpenAI',
          url: localUrl.trim(),
          providerType: 'openai',
          model: localModel.trim() || undefined,
        },
        localToken.trim(),
      )

      const sessionKey = DEFAULT_SESSION_KEY
      setCurrentSessionKey(sessionKey)
      setServerSessions((prev) => ({
        ...prev,
        [serverId]: sessionKey,
      }))

      setOnboardingCompleted(true)
    } else if (providerType === 'echo') {
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
    } else if (providerType === 'apple') {
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
  }

  const isValid =
    providerType === 'molt' || providerType === 'claudie' || providerType === 'openai'
      ? localUrl.trim().length > 0 && localToken.trim().length > 0
      : providerType === 'ollama'
        ? localUrl.trim().length > 0
        : true

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
          <Dropdown
            label="Provider Type"
            options={providerOptionsList}
            value={providerType}
            onValueChange={setProviderType}
          />

          {needsUrl && (
            <TextInput
              label="URL"
              value={localUrl}
              onChangeText={setLocalUrl}
              placeholder={
                providerType === 'ollama'
                  ? 'http://localhost:11434'
                  : providerType === 'claudie'
                    ? 'https://api.anthropic.com'
                    : providerType === 'openai'
                      ? 'https://api.openai.com'
                      : 'https://your-gateway.example.com'
              }
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              hint={
                providerType === 'ollama'
                  ? 'The URL of your Ollama server'
                  : providerType === 'claudie'
                    ? 'The base URL of the Anthropic API'
                    : providerType === 'openai'
                      ? 'The base URL of the OpenAI API'
                      : 'The URL of your OpenClaw server'
              }
            />
          )}

          {needsToken && (
            <TextInput
              label={providerType === 'claudie' || providerType === 'openai' ? 'API Key' : 'Token'}
              value={localToken}
              onChangeText={setLocalToken}
              placeholder={
                providerType === 'claudie' || providerType === 'openai'
                  ? 'Your API key'
                  : 'Your authentication token'
              }
              autoCapitalize="none"
              autoCorrect={false}
              secureTextEntry
              hint={
                providerType === 'claudie'
                  ? 'Your Anthropic API key'
                  : providerType === 'openai'
                    ? 'Your OpenAI API key'
                    : 'Your authentication token for the gateway'
              }
            />
          )}

          {(providerType === 'ollama' || providerType === 'claudie' || providerType === 'openai') && (
            <TextInput
              label="Model"
              value={localModel}
              onChangeText={setLocalModel}
              placeholder={
                providerType === 'ollama'
                  ? 'llama3.2'
                  : providerType === 'claudie'
                    ? 'claude-sonnet-4-5-20250514'
                    : 'gpt-4o'
              }
              autoCapitalize="none"
              autoCorrect={false}
              hint={
                providerType === 'ollama'
                  ? 'Ollama model to use (default: llama3.2)'
                  : providerType === 'claudie'
                    ? 'Claude model to use (default: claude-sonnet-4-5)'
                    : 'OpenAI model to use (default: gpt-4o)'
              }
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
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
