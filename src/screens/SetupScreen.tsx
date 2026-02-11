import { Ionicons } from '@expo/vector-icons'
import { LinearGradient } from 'expo-linear-gradient'
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
import { Dropdown, GradientButton, Text, TextInput } from '../components/ui'
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
    container: {
      flex: 1,
    },
    gradient: {
      ...StyleSheet.absoluteFillObject,
    },
    keyboardView: {
      flex: 1,
    },
    scrollContent: {
      flexGrow: 1,
      padding: theme.spacing.xl,
      justifyContent: 'center',
      maxWidth: 480,
      width: '100%',
      alignSelf: 'center',
    },
    headerSection: {
      marginBottom: theme.spacing.xxl,
    },
    titleRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      alignItems: 'baseline',
      marginBottom: theme.spacing.sm,
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
      paddingHorizontal: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    primaryButton: {
      shadowColor: theme.colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.3,
      shadowRadius: 8,
      elevation: 8,
    },
  })

  const needsUrl =
    providerType === 'molt' || providerType === 'ollama' || providerType === 'openai-compatible'
  const needsToken =
    providerType === 'molt' ||
    providerType === 'claude' ||
    providerType === 'openai' ||
    providerType === 'openai-compatible' ||
    providerType === 'openrouter' ||
    providerType === 'gemini'

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
    } else if (providerType === 'claude' && localToken.trim()) {
      const serverId = await addServer(
        {
          name: 'My Claude',
          url: localUrl.trim() || 'https://api.anthropic.com',
          providerType: 'claude',
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
    } else if (providerType === 'openai' && localToken.trim()) {
      const serverId = await addServer(
        {
          name: 'My OpenAI',
          url: localUrl.trim() || 'https://api.openai.com',
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
    } else if (providerType === 'openai-compatible' && localUrl.trim() && localToken.trim()) {
      const serverId = await addServer(
        {
          name: 'My OpenAI Compatible',
          url: localUrl.trim(),
          providerType: 'openai-compatible',
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
    } else if (providerType === 'openrouter' && localToken.trim()) {
      const serverId = await addServer(
        {
          name: 'My OpenRouter',
          url: localUrl.trim() || 'https://openrouter.ai',
          providerType: 'openrouter',
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
    } else if (providerType === 'gemini' && localToken.trim()) {
      const serverId = await addServer(
        {
          name: 'My Gemini',
          url: localUrl.trim() || 'https://generativelanguage.googleapis.com',
          providerType: 'gemini',
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
    } else if (providerType === 'gemini-nano') {
      const serverId = await addServer(
        {
          name: 'Gemini Nano',
          url: '',
          providerType: 'gemini-nano',
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
    providerType === 'molt' || providerType === 'openai-compatible'
      ? localUrl.trim().length > 0 && localToken.trim().length > 0
      : providerType === 'claude' ||
          providerType === 'openai' ||
          providerType === 'openrouter' ||
          providerType === 'gemini'
        ? localToken.trim().length > 0
        : providerType === 'ollama'
          ? localUrl.trim().length > 0
          : true

  // Theme-aware gradient background (purple-tinted for setup)
  const gradientColors = theme.isDark
    ? ([theme.colors.background, '#0A1628', 'rgba(168, 85, 247, 0.03)'] as const)
    : ([theme.colors.background, '#E5E0F2', 'rgba(168, 85, 247, 0.06)'] as const)

  return (
    <View style={styles.container}>
      {/* Background gradient */}
      <LinearGradient colors={gradientColors} locations={[0, 0.7, 1]} style={styles.gradient} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.headerSection}>
            <View style={styles.titleRow}>
              <Text variant="heading1">Connect to </Text>
              <Text variant="heading1" style={{ color: theme.colors.primary }}>
                your AI
              </Text>
            </View>
            <Text variant="body" color="secondary">
              Choose a provider and connect to start chatting with your agents.
            </Text>
          </View>

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
                    : providerType === 'openai-compatible'
                      ? 'https://api.example.com'
                      : 'https://your-gateway.example.com'
                }
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                hint={
                  providerType === 'ollama'
                    ? 'The URL of your Ollama server'
                    : providerType === 'openai-compatible'
                      ? 'The base URL of your OpenAI-compatible API'
                      : 'The URL of your OpenClaw server'
                }
              />
            )}

            {needsToken && (
              <TextInput
                label={
                  providerType === 'claude' ||
                  providerType === 'openai' ||
                  providerType === 'openai-compatible' ||
                  providerType === 'openrouter' ||
                  providerType === 'gemini'
                    ? 'API Key'
                    : 'Token'
                }
                value={localToken}
                onChangeText={setLocalToken}
                placeholder={
                  providerType === 'claude' ||
                  providerType === 'openai' ||
                  providerType === 'openai-compatible' ||
                  providerType === 'openrouter' ||
                  providerType === 'gemini'
                    ? 'Your API key'
                    : 'Your authentication token'
                }
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                hint={
                  providerType === 'claude'
                    ? 'Your Anthropic API key'
                    : providerType === 'openai'
                      ? 'Your OpenAI API key'
                      : providerType === 'openai-compatible'
                        ? 'Your API key for the OpenAI-compatible service'
                        : providerType === 'openrouter'
                          ? 'Your OpenRouter API key'
                          : providerType === 'gemini'
                            ? 'Your Google AI API key'
                            : 'Your authentication token for the gateway'
                }
              />
            )}

            {(providerType === 'ollama' ||
              providerType === 'claude' ||
              providerType === 'openai' ||
              providerType === 'openai-compatible' ||
              providerType === 'openrouter' ||
              providerType === 'gemini') && (
              <TextInput
                label="Model"
                value={localModel}
                onChangeText={setLocalModel}
                placeholder={
                  providerType === 'ollama'
                    ? 'llama3.2'
                    : providerType === 'claude'
                      ? 'claude-sonnet-4-5'
                      : providerType === 'openai' || providerType === 'openai-compatible'
                        ? 'gpt-4o'
                        : providerType === 'gemini'
                          ? 'gemini-2.0-flash'
                          : 'openai/gpt-4o'
                }
                autoCapitalize="none"
                autoCorrect={false}
                hint={
                  providerType === 'ollama'
                    ? 'Ollama model to use (default: llama3.2)'
                    : providerType === 'claude'
                      ? 'Claude model to use (default: claude-sonnet-4-5)'
                      : providerType === 'openai'
                        ? 'OpenAI model to use (default: gpt-4o)'
                        : providerType === 'openai-compatible'
                          ? 'Model to use (default: gpt-4o)'
                          : providerType === 'gemini'
                            ? 'Gemini model to use (default: gemini-2.0-flash)'
                            : 'OpenRouter model to use (default: openai/gpt-4o)'
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
                    Advanced Options
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

          <GradientButton
            title="Get Started"
            size="lg"
            onPress={handleComplete}
            disabled={!isValid}
            animated={true}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  )
}
