import { Ionicons } from '@expo/vector-icons'
import * as DocumentPicker from 'expo-document-picker'
import { File as ExpoFile } from 'expo-file-system'
import { useRouter } from 'expo-router'
import React, { useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
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
import { getAllProviderOptions } from '../src/config/providerOptions'
import { useServers } from '../src/hooks/useServers'
import { ProviderType } from '../src/services/providers'
import { useTheme } from '../src/theme'

const VALID_PROVIDER_TYPES: ProviderType[] = [
  'molt',
  'ollama',
  'echo',
  'apple',
  'claude',
  'openai',
  'openrouter',
  'gemini-nano',
  'gemini',
  'emergent',
  'kimi',
]

export default function AddServerScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { addServer } = useServers()
  const providerOptions = getAllProviderOptions(theme.colors.text.primary)

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [clientId, setClientId] = useState('lumiere-mobile')
  const [providerType, setProviderType] = useState<ProviderType>('molt')
  const [model, setModel] = useState('')

  const handleImportJson = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      })

      if (result.canceled) return

      const asset = result.assets[0]
      const file = new ExpoFile(asset.uri)
      const content = await file.text()
      const data = JSON.parse(content)

      // Support both single server object and backup format with servers array
      const server = Array.isArray(data.servers) ? data.servers[0] : data

      if (!server || typeof server !== 'object') {
        Alert.alert(t('common.error'), t('addServer.importJsonInvalid'))
        return
      }

      if (server.name) setName(String(server.name))
      if (server.url) setUrl(String(server.url))
      if (server.clientId) setClientId(String(server.clientId))
      if (server.model) setModel(String(server.model))
      if (server.token || server.apiKey) setToken(String(server.token || server.apiKey))
      if (
        server.providerType &&
        VALID_PROVIDER_TYPES.includes(server.providerType as ProviderType)
      ) {
        setProviderType(server.providerType as ProviderType)
      }

      Alert.alert(t('common.success'), t('addServer.importJsonSuccess'))
    } catch {
      Alert.alert(t('common.error'), t('addServer.importJsonInvalid'))
    }
  }

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
    importJsonButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: theme.spacing.sm,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      borderStyle: 'dashed',
      marginBottom: theme.spacing.lg,
    },
    importJsonText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.primary,
      fontWeight: theme.typography.fontWeight.semibold as '600',
    },
    dividerContainer: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: theme.spacing.lg,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: theme.colors.border,
    },
    dividerText: {
      marginHorizontal: theme.spacing.md,
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.tertiary,
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
          <TouchableOpacity
            style={styles.importJsonButton}
            onPress={handleImportJson}
            activeOpacity={0.7}
          >
            <Ionicons name="document-text-outline" size={20} color={theme.colors.primary} />
            <Text style={styles.importJsonText}>{t('addServer.importJson')}</Text>
          </TouchableOpacity>

          <View style={styles.dividerContainer}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>{t('addServer.orFillManually')}</Text>
            <View style={styles.dividerLine} />
          </View>

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
              <OllamaModelPicker
                label="Model"
                value={model}
                onValueChange={setModel}
                ollamaUrl={url}
                placeholder="llama3.2"
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
                  placeholder="claude-sonnet-4-5"
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
                  placeholder="claude-sonnet-4-5"
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
