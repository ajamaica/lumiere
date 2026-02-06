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

  const needsUrl = providerType !== 'echo' && providerType !== 'apple'
  const needsToken =
    providerType === 'molt' || providerType === 'claude' || providerType === 'openai'

  const handleAdd = async () => {
    if (needsUrl && !url.trim()) {
      Alert.alert('Error', 'URL is required')
      return
    }

    if (needsToken && !token.trim()) {
      Alert.alert(
        'Error',
        providerType === 'claude' || providerType === 'openai'
          ? 'API Key is required'
          : 'Token is required',
      )
      return
    }

    let effectiveUrl = url.trim()
    let effectiveToken = token.trim()

    if (providerType === 'echo') {
      effectiveUrl = 'echo://local'
      effectiveToken = 'echo-no-token'
    } else if (providerType === 'apple') {
      effectiveUrl = 'apple://on-device'
      effectiveToken = 'apple-no-token'
    } else if (!effectiveToken) {
      effectiveToken = 'ollama-no-token'
    }

    await addServer(
      {
        name:
          name.trim() ||
          (providerType === 'apple'
            ? 'Apple Intelligence'
            : providerType === 'claude'
              ? 'Claude'
              : providerType === 'openai'
                ? 'OpenAI'
                : 'New Server'),
        url: effectiveUrl,
        clientId: clientId.trim() || 'lumiere-mobile',
        providerType,
        model: model.trim() || undefined,
      },
      effectiveToken,
    )

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
                      : providerType === 'claude'
                        ? 'My Claude'
                        : providerType === 'openai'
                          ? 'My OpenAI'
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

          {needsUrl && (
            <View style={styles.formRow}>
              <TextInput
                label="URL"
                value={url}
                onChangeText={setUrl}
                placeholder={
                  providerType === 'ollama'
                    ? 'http://localhost:11434'
                    : providerType === 'claude'
                      ? 'https://api.anthropic.com'
                      : providerType === 'openai'
                        ? 'https://api.openai.com'
                        : 'wss://gateway.example.com'
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
                  placeholder="claude-sonnet-4-5-20250514"
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
