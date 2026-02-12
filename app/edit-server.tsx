import { Ionicons } from '@expo/vector-icons'
import { useLocalSearchParams, useRouter } from 'expo-router'
import React, { useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import {
  Button,
  Dropdown,
  OllamaModelPicker,
  ScreenHeader,
  Text,
  TextInput,
} from '../src/components/ui'
import { getBasicProviderOptions } from '../src/config/providerOptions'
import { useClaudeModels } from '../src/hooks/useClaudeModels'
import { useServers } from '../src/hooks/useServers'
import { ProviderType } from '../src/services/providers'
import { useTheme } from '../src/theme'
import { keyboardAvoidingBehavior } from '../src/utils/platform'

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

  const {
    models: claudeModels,
    loading: claudeModelsLoading,
    error: claudeModelsError,
    refetch: refetchClaudeModels,
  } = useClaudeModels(
    providerType === 'claude' ? id : undefined,
    providerType === 'claude' ? url || undefined : undefined,
  )

  const handleSave = async () => {
    if (!id) return

    if (providerType === 'molt' && !url.trim()) {
      Alert.alert('Error', 'URL is required')
      return
    }

    if (providerType === 'ollama' && !url.trim()) {
      Alert.alert('Error', 'URL is required')
      return
    }

    if (providerType === 'openai-compatible' && !url.trim()) {
      Alert.alert('Error', 'URL is required')
      return
    }

    let effectiveUrl = url.trim()
    if (providerType === 'echo') {
      effectiveUrl = ''
    } else if (providerType === 'apple') {
      effectiveUrl = ''
    } else if (providerType === 'gemini-nano') {
      effectiveUrl = ''
    } else if (providerType === 'claude') {
      effectiveUrl = effectiveUrl || 'https://api.anthropic.com'
    } else if (providerType === 'openai') {
      effectiveUrl = effectiveUrl || 'https://api.openai.com'
    } else if (providerType === 'openrouter') {
      effectiveUrl = effectiveUrl || 'https://openrouter.ai'
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
    fieldLabel: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold as '600',
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    modelPickerLoading: {
      flexDirection: 'row',
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
    },
    modelList: {
      gap: theme.spacing.sm,
    },
    modelItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
    },
    activeModel: {
      backgroundColor: theme.colors.primary + '20',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
    modelInfo: {
      flex: 1,
    },
    retryLink: {
      marginTop: theme.spacing.xs,
      paddingVertical: theme.spacing.xs,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Edit Server" showBack />
      <KeyboardAvoidingView behavior={keyboardAvoidingBehavior} style={styles.keyboardView}>
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
                    ? 'Echo Agent'
                    : providerType === 'apple'
                      ? 'Local AI'
                      : providerType === 'gemini-nano'
                        ? 'Gemini Nano'
                        : providerType === 'claude'
                          ? 'My Claude'
                          : providerType === 'openai'
                            ? 'My OpenAI'
                            : providerType === 'openai-compatible'
                              ? 'My OpenAI Compatible'
                              : providerType === 'openrouter'
                                ? 'My OpenRouter'
                                : 'My Server'
              }
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {(providerType === 'molt' ||
            providerType === 'ollama' ||
            providerType === 'openai-compatible') && (
            <View style={styles.formRow}>
              <TextInput
                label="URL"
                value={url}
                onChangeText={setUrl}
                placeholder={
                  providerType === 'ollama'
                    ? 'http://localhost:11434'
                    : providerType === 'openai-compatible'
                      ? 'https://api.example.com'
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
              <OllamaModelPicker
                label="Model"
                value={model}
                onValueChange={setModel}
                ollamaUrl={url}
                placeholder="llama3.2"
              />
            </View>
          )}

          {(providerType === 'claude' ||
            providerType === 'openai' ||
            providerType === 'openai-compatible' ||
            providerType === 'openrouter') && (
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

              {providerType === 'claude' ? (
                <View style={styles.formRow}>
                  <Text style={styles.fieldLabel}>Model</Text>
                  {claudeModelsLoading ? (
                    <View style={styles.modelPickerLoading}>
                      <ActivityIndicator size="small" color={theme.colors.primary} />
                      <Text color="secondary" style={{ marginLeft: theme.spacing.sm }}>
                        Loading models...
                      </Text>
                    </View>
                  ) : claudeModelsError ? (
                    <View>
                      <TextInput
                        value={model}
                        onChangeText={setModel}
                        placeholder="claude-sonnet-4-5"
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      <TouchableOpacity onPress={refetchClaudeModels} style={styles.retryLink}>
                        <Text variant="caption" color="secondary">
                          {claudeModelsError} Tap to retry.
                        </Text>
                      </TouchableOpacity>
                    </View>
                  ) : claudeModels.length > 0 ? (
                    <View style={styles.modelList}>
                      {claudeModels.map((m) => {
                        const isActive = m.id === model
                        return (
                          <TouchableOpacity
                            key={m.id}
                            style={[styles.modelItem, isActive && styles.activeModel]}
                            onPress={() => setModel(m.id)}
                          >
                            <View style={styles.modelInfo}>
                              <Text variant="body">{m.display_name}</Text>
                              <Text variant="caption">{m.id}</Text>
                            </View>
                            <Ionicons
                              name={isActive ? 'checkmark-circle' : 'chevron-forward'}
                              size={20}
                              color={isActive ? theme.colors.primary : theme.colors.text.tertiary}
                            />
                          </TouchableOpacity>
                        )
                      })}
                    </View>
                  ) : (
                    <TextInput
                      value={model}
                      onChangeText={setModel}
                      placeholder="claude-sonnet-4-5"
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                  )}
                </View>
              ) : (
                <View style={styles.formRow}>
                  <TextInput
                    label="Model"
                    value={model}
                    onChangeText={setModel}
                    placeholder={
                      providerType === 'openai' || providerType === 'openai-compatible'
                        ? 'gpt-4o'
                        : providerType === 'openrouter'
                          ? 'openai/gpt-4o'
                          : 'claude-sonnet-4-5'
                    }
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                </View>
              )}
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
