import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useState } from 'react'
import { Alert, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, Dropdown, ScreenHeader, Text, TextInput } from '../src/components/ui'
import { getBasicProviderOptions } from '../src/config/providerOptions'
import { useServers } from '../src/hooks/useServers'
import { ProviderType } from '../src/services/providers'
import { useTheme } from '../src/theme'

export default function EditServerScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { id } = useLocalSearchParams<{ id: string }>()
  const { servers, updateServer, removeServer } = useServers()
  const providerOptions = getBasicProviderOptions(theme.colors.text.primary)

  const server = id ? servers[id] : null

  const [name, setName] = useState(server?.name ?? '')
  const [url, setUrl] = useState(server?.url ?? '')
  const [token, setToken] = useState('')
  const [clientId, setClientId] = useState(server?.clientId || 'lumiere-mobile')
  const [providerType, setProviderType] = useState<ProviderType>(server?.providerType || 'molt')
  const [model, setModel] = useState(server?.model ?? '')

  const handleSave = async () => {
    if (!id) return

    const needsUrlRequired =
      providerType !== 'echo' &&
      providerType !== 'apple' &&
      providerType !== 'claude' &&
      providerType !== 'openai'
    if (needsUrlRequired && !url.trim()) {
      Alert.alert('Error', 'URL is required')
      return
    }

    let effectiveUrl = url.trim()
    if (providerType === 'echo') {
      effectiveUrl = 'echo://local'
    } else if (providerType === 'apple') {
      effectiveUrl = 'apple://on-device'
    } else if (providerType === 'claude' && !effectiveUrl) {
      effectiveUrl = 'https://api.anthropic.com'
    } else if (providerType === 'openai' && !effectiveUrl) {
      effectiveUrl = 'https://api.openai.com'
    }

    await updateServer(
      id,
      {
        name: name.trim(),
        url: effectiveUrl,
        clientId: clientId.trim(),
        providerType,
        model: model.trim() || undefined,
      },
      token.trim() || undefined,
    )

    router.back()
  }

  const handleDelete = () => {
    if (!id || !server) return

    Alert.alert('Delete Server', `Are you sure you want to delete "${server.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await removeServer(id)
          router.back()
        },
      },
    ])
  }

  if (!server) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: theme.colors.background }}>
        <ScreenHeader title="Edit Server" showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <Text color="secondary">Server not found</Text>
        </View>
      </SafeAreaView>
    )
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
      <ScreenHeader title="Edit Server" showBack />
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
                disabled
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

          {providerType !== 'echo' &&
            providerType !== 'apple' &&
            providerType !== 'claude' &&
            providerType !== 'openai' && (
              <View style={styles.formRow}>
                <TextInput
                  label="URL"
                  value={url}
                  onChangeText={setUrl}
                  placeholder={
                    providerType === 'ollama'
                      ? 'http://localhost:11434'
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
                  label="Token (leave blank to keep current)"
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

          {(providerType === 'claude' || providerType === 'openai') && (
            <>
              <View style={styles.formRow}>
                <TextInput
                  label="API Key (leave blank to keep current)"
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
                  placeholder={providerType === 'openai' ? 'gpt-4o' : 'claude-sonnet-4-5-20250514'}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
              </View>
            </>
          )}

          <View style={styles.buttonRow}>
            <Button title="Save" onPress={handleSave} style={{ flex: 1 }} />
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => router.back()}
              style={{ flex: 1 }}
            />
          </View>

          <Button
            title="Delete Server"
            variant="danger"
            onPress={handleDelete}
            style={{ marginTop: theme.spacing.xl }}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
