import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
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
import { usePairing } from '../src/hooks/usePairing'
import { useServers } from '../src/hooks/useServers'
import { normalizeGatewayUrl } from '../src/services/discovery'
import { ProviderType } from '../src/services/providers'
import { useTheme } from '../src/theme'

type MoltAuthMode = 'pair' | 'token'

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
    (o) => o.value !== 'ollama' || flags.ollamaProvider,
  )

  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [token, setToken] = useState('')
  const [clientId, setClientId] = useState('lumiere-mobile')
  const [providerType, setProviderType] = useState<ProviderType>('molt')
  const [model, setModel] = useState('')
  const [moltAuthMode, setMoltAuthMode] = useState<MoltAuthMode>('pair')

  const {
    pairingState,
    pairingInfo,
    error: pairingError,
    issuedToken,
    startPairing,
    cancel,
  } = usePairing()

  const handleAddWithToken = useCallback(
    async (resolvedToken: string) => {
      const resolvedUrl =
        providerType === 'echo'
          ? 'echo://local'
          : providerType === 'molt'
            ? normalizeGatewayUrl(url.trim())
            : url.trim()

      await addServer(
        {
          name: name.trim() || 'New Server',
          url: resolvedUrl,
          clientId: clientId.trim() || 'lumiere-mobile',
          providerType,
          model: model.trim() || undefined,
        },
        resolvedToken,
      )

      router.back()
    },
    [url, name, clientId, providerType, model, addServer, router],
  )

  // When pairing succeeds, add the server (deferred to avoid synchronous setState in effect)
  useEffect(() => {
    if (pairingState === 'paired' && issuedToken) {
      const id = requestAnimationFrame(() => {
        handleAddWithToken(issuedToken)
      })
      return () => cancelAnimationFrame(id)
    }
  }, [pairingState, issuedToken, handleAddWithToken])

  const handleAdd = async () => {
    if (providerType !== 'echo' && !url.trim()) {
      Alert.alert('Error', 'URL is required')
      return
    }

    if (providerType === 'molt' && moltAuthMode === 'token' && !token.trim()) {
      Alert.alert('Error', 'Token is required for Molt Gateway')
      return
    }

    const effectiveToken =
      providerType === 'echo' ? 'echo-no-token' : token.trim() || 'ollama-no-token'

    await handleAddWithToken(effectiveToken)
  }

  const handleStartPairing = () => {
    if (!url.trim()) {
      Alert.alert('Error', 'URL is required')
      return
    }
    const wsUrl = normalizeGatewayUrl(url.trim())
    startPairing(wsUrl)
  }

  const isPairing = pairingState === 'requesting' || pairingState === 'waiting'

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
    modeToggle: {
      flexDirection: 'row',
      marginBottom: theme.spacing.md,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modeButton: {
      flex: 1,
      paddingVertical: theme.spacing.xs,
      alignItems: 'center',
    },
    modeButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    pairingStatus: {
      alignItems: 'center',
      paddingVertical: theme.spacing.md,
      gap: theme.spacing.sm,
    },
    requestIdBox: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      alignItems: 'center',
      width: '100%',
    },
    monoText: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 14,
      letterSpacing: 1,
    },
    errorBox: {
      backgroundColor: theme.colors.status.error + '15',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.sm,
      width: '100%',
    },
  })

  const renderPairingStatus = () => {
    if (pairingState === 'requesting') {
      return (
        <View style={styles.pairingStatus}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text color="secondary" variant="caption">
            Connecting...
          </Text>
        </View>
      )
    }

    if (pairingState === 'waiting' && pairingInfo) {
      return (
        <View style={styles.pairingStatus}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="label">Waiting for approval</Text>
          <View style={styles.requestIdBox}>
            <Text color="secondary" variant="caption">
              Approve on server:
            </Text>
            <Text style={styles.monoText}>openclaw nodes approve {pairingInfo.requestId}</Text>
          </View>
          <Button title="Cancel" variant="secondary" size="sm" onPress={cancel} />
        </View>
      )
    }

    if (pairingState === 'error') {
      return (
        <View style={styles.pairingStatus}>
          <View style={styles.errorBox}>
            <Text color="error" variant="caption">
              {pairingError || 'Pairing failed'}
            </Text>
          </View>
          <Button title="Retry" variant="secondary" size="sm" onPress={cancel} />
        </View>
      )
    }

    return null
  }

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
                    onPress={() => {
                      setProviderType(option.value)
                      cancel()
                    }}
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

          {providerType !== 'echo' && (
            <View style={styles.formRow}>
              <TextInput
                label="URL"
                value={url}
                onChangeText={setUrl}
                placeholder={
                  providerType === 'ollama'
                    ? 'http://localhost:11434'
                    : '192.168.1.5 or wss://gateway.example.com'
                }
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
                editable={!isPairing}
              />
            </View>
          )}

          {providerType === 'molt' && (
            <>
              {/* Pair / Token toggle */}
              <View style={styles.modeToggle}>
                <TouchableOpacity
                  style={[styles.modeButton, moltAuthMode === 'pair' && styles.modeButtonActive]}
                  onPress={() => {
                    setMoltAuthMode('pair')
                    cancel()
                  }}
                >
                  <Text color={moltAuthMode === 'pair' ? 'inverse' : 'primary'} variant="caption">
                    Pair Device
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.modeButton, moltAuthMode === 'token' && styles.modeButtonActive]}
                  onPress={() => {
                    setMoltAuthMode('token')
                    cancel()
                  }}
                >
                  <Text color={moltAuthMode === 'token' ? 'inverse' : 'primary'} variant="caption">
                    Manual Token
                  </Text>
                </TouchableOpacity>
              </View>

              {moltAuthMode === 'pair' && renderPairingStatus()}

              {moltAuthMode === 'token' && (
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
              )}

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
            {providerType === 'molt' && moltAuthMode === 'pair' && pairingState === 'unpaired' && (
              <Button title="Pair Device" onPress={handleStartPairing} style={{ flex: 1 }} />
            )}
            {(providerType !== 'molt' || moltAuthMode === 'token') && (
              <Button title="Add Server" onPress={handleAdd} style={{ flex: 1 }} />
            )}
            <Button
              title="Cancel"
              variant="secondary"
              onPress={() => {
                cancel()
                router.back()
              }}
              style={{ flex: 1 }}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
