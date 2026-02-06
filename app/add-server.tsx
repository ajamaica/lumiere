import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, Dropdown, ScreenHeader, Text, TextInput } from '../src/components/ui'
import { getAllProviderOptions } from '../src/config/providerOptions'
import { useServers } from '../src/hooks/useServers'
import { ProviderType } from '../src/services/providers'
import { useTheme } from '../src/theme'

export default function AddServerScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { addServer } = useServers()
  const providerOptions = getAllProviderOptions(theme.colors.text.primary)

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [clientId, setClientId] = useState('lumiere-mobile')
  const [providerType, setProviderType] = useState<ProviderType>('molt')
  const [model, setModel] = useState('')

  const needsUrl = providerType === 'molt' || providerType === 'ollama'
  const needsToken =
    providerType === 'molt' ||
    providerType === 'claude' ||
    providerType === 'openai' ||
    providerType === 'openrouter' ||
    providerType === 'emergent'

  const handleAdd = async () => {
    if (providerType === 'molt' && url.trim() && token.trim()) {
      await addServer(
        {
          name: name.trim() || 'My Server',
          url: url.trim(),
          clientId: clientId.trim() || 'lumiere-mobile',
          providerType: 'molt',
        },
        token.trim(),
      )
    } else if (providerType === 'ollama' && url.trim()) {
      await addServer(
        {
          name: name.trim() || 'My Ollama',
          url: url.trim(),
          providerType: 'ollama',
          model: model.trim() || undefined,
        },
        'ollama-no-token',
      )
    } else if (providerType === 'claude' && token.trim()) {
      await addServer(
        {
          name: name.trim() || 'My Claude',
          url: url.trim() || 'https://api.anthropic.com',
          providerType: 'claude',
          model: model.trim() || undefined,
        },
        token.trim(),
      )
    } else if (providerType === 'openai' && token.trim()) {
      await addServer(
        {
          name: name.trim() || 'My OpenAI',
          url: url.trim() || 'https://api.openai.com',
          providerType: 'openai',
          model: model.trim() || undefined,
        },
        token.trim(),
      )
    } else if (providerType === 'openrouter' && token.trim()) {
      await addServer(
        {
          name: name.trim() || 'My OpenRouter',
          url: url.trim() || 'https://openrouter.ai',
          providerType: 'openrouter',
          model: model.trim() || undefined,
        },
        token.trim(),
      )
    } else if (providerType === 'emergent' && token.trim()) {
      await addServer(
        {
          name: name.trim() || 'My Emergent',
          url: url.trim() || 'https://api.emergent.sh',
          providerType: 'emergent',
          model: model.trim() || undefined,
        },
        token.trim(),
      )
    } else if (providerType === 'echo') {
      await addServer(
        {
          name: name.trim() || 'Echo Agent',
          url: '',
          providerType: 'echo',
        },
        '',
      )
    } else if (providerType === 'apple') {
      await addServer(
        {
          name: name.trim() || 'Local AI',
          url: '',
          providerType: 'apple',
        },
        '',
      )
    } else if (providerType === 'gemini-nano') {
      await addServer(
        {
          name: name.trim() || 'Gemini Nano',
          url: '',
          providerType: 'gemini-nano',
        },
        '',
      )
    } else {
      // Validation failed
      if (needsUrl && !url.trim()) {
        Alert.alert('Error', 'URL is required')
        return
      }
      if (needsToken && !token.trim()) {
        Alert.alert(
          'Error',
          providerType === 'claude' || providerType === 'openai'
            ? 'API Key is required'
            : providerType === 'emergent'
              ? 'Universal Key is required'
              : 'Token is required',
        )
        return
      }
      return
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
      <ScreenHeader title="Add Server" showBack />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {providerOptions.length > 1 && (
            <View style={styles.formRow}>
              <Dropdown
                label="Provider Type"
                options={providerOptions}
                value={providerType}
                onValueChange={setProviderType}
              />
            </View>
          )}

          <View style={styles.formRow}>
            <TextInput
              label="Name"
              value={name}
              onChangeText={setName}
              placeholder={
                providerType === 'ollama'
                  ? 'My Ollama'
                  : providerType === 'echo'
                    ? 'My Echo Server'
                    : providerType === 'apple'
                      ? 'Apple Intelligence'
                      : providerType === 'gemini-nano'
                        ? 'Gemini Nano'
                        : providerType === 'claude'
                          ? 'My Claude'
                          : providerType === 'openai'
                            ? 'My OpenAI'
                            : providerType === 'openrouter'
                              ? 'My OpenRouter'
                              : providerType === 'emergent'
                                ? 'My Emergent'
                                : 'My Server'
              }
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {providerType === 'apple' && (
            <View style={styles.formRow}>
              <Text variant="caption" color="secondary">
                Uses Apple Foundation Models to run AI entirely on-device via CoreML. Requires iOS
                26+ with Apple Intelligence support.
              </Text>
            </View>
          )}

          {providerType === 'gemini-nano' && (
            <View style={styles.formRow}>
              <Text variant="caption" color="secondary">
                Uses Google Gemini Nano to run AI entirely on-device. Requires Android 14+ with
                Gemini Nano support.
              </Text>
            </View>
          )}

          {needsUrl && (
            <View style={styles.formRow}>
              <TextInput
                label="URL"
                value={url}
                onChangeText={setUrl}
                placeholder={
                  providerType === 'ollama' ? 'http://localhost:11434' : 'wss://gateway.example.com'
                }
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
            </View>
          )}

          {providerType === 'molt' && (
            <>
              <View style={styles.formRow}>
                <TextInput
                  label="Token"
                  value={token}
                  onChangeText={setToken}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  label="Client ID"
                  value={clientId}
                  onChangeText={setClientId}
                  placeholder="lumiere-mobile"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </>
          )}

          {providerType === 'ollama' && (
            <View style={styles.formRow}>
              <TextInput
                label="Model"
                value={model}
                onChangeText={setModel}
                placeholder="llama3.2"
                autoCapitalize="none"
                autoCorrect={false}
              />
            </View>
          )}

          {providerType === 'claude' && (
            <>
              <View style={styles.formRow}>
                <TextInput
                  label="API Key"
                  value={token}
                  onChangeText={setToken}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  label="Model"
                  value={model}
                  onChangeText={setModel}
                  placeholder="claude-3-5-sonnet-20241022"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </>
          )}

          {providerType === 'openai' && (
            <>
              <View style={styles.formRow}>
                <TextInput
                  label="API Key"
                  value={token}
                  onChangeText={setToken}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  label="Model"
                  value={model}
                  onChangeText={setModel}
                  placeholder="gpt-4o"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </>
          )}

          {providerType === 'emergent' && (
            <>
              <View style={styles.formRow}>
                <TextInput
                  label="Universal Key"
                  value={token}
                  onChangeText={setToken}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  label="Model"
                  value={model}
                  onChangeText={setModel}
                  placeholder="claude-3-5-sonnet-20241022"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </>
          )}

          {providerType === 'openrouter' && (
            <>
              <View style={styles.formRow}>
                <TextInput
                  label="API Key"
                  value={token}
                  onChangeText={setToken}
                  secureTextEntry
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
              <View style={styles.formRow}>
                <TextInput
                  label="Model"
                  value={model}
                  onChangeText={setModel}
                  placeholder="openai/gpt-4o"
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </>
          )}

          <View style={styles.buttonRow}>
            <Button title="Add Server" onPress={handleAdd} style={{ flex: 1 }} />
            <Button
              title="Cancel"
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
