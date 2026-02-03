import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

import { Button, ScreenHeader, Text, TextInput } from '../src/components/ui'
import { useFeatureFlags } from '../src/hooks/useFeatureFlags'
import { useServers } from '../src/hooks/useServers'
import { ProviderType } from '../src/services/providers'
import { useTheme } from '../src/theme'

const ALL_PROVIDER_OPTIONS: { value: ProviderType; label: string }[] = [
  { value: 'molt', label: 'Molt Gateway' },
  { value: 'ollama', label: 'Ollama' },
  { value: 'echo', label: 'Echo Server' },
]

export default function AddServerScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { addServer } = useServers()
  const { flags } = useFeatureFlags()

  const providerOptions = ALL_PROVIDER_OPTIONS.filter(
    (o) =>
      (o.value !== 'ollama' || flags.ollamaProvider) && (o.value !== 'echo' || flags.echoProvider),
  )

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [clientId, setClientId] = useState('lumiere-mobile')
  const [providerType, setProviderType] = useState<ProviderType>('molt')
  const [model, setModel] = useState('')

  const handleAdd = async () => {
    if (!url.trim()) {
      Alert.alert('Error', 'URL is required')
      return
    }

    if (providerType === 'molt' && !token.trim()) {
      Alert.alert('Error', 'Token is required for Molt Gateway')
      return
    }

    // Echo provider doesn't need a token or URL validation beyond non-empty
    const effectiveToken =
      providerType === 'echo' ? 'echo-no-token' : token.trim() || 'ollama-no-token'

    await addServer(
      {
        name: name.trim() || 'New Server',
        url: url.trim(),
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
    providerPicker: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
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
              <Text variant="caption" color="secondary" style={{ marginBottom: 4 }}>
                Provider Type
              </Text>
              <View style={styles.providerPicker}>
                {providerOptions.map((option) => (
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
                    : 'My Server'
              }
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.formRow}>
            <TextInput
              label="URL"
              value={url}
              onChangeText={setUrl}
              placeholder={
                providerType === 'ollama'
                  ? 'http://localhost:11434'
                  : providerType === 'echo'
                    ? 'echo://local'
                    : 'wss://gateway.example.com'
              }
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
            />
          </View>

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
