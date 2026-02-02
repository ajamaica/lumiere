import { Ionicons } from '@expo/vector-icons'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useState } from 'react'
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native'

import { Button, Text, TextInput } from '../components/ui'
import { DEFAULT_SESSION_KEY } from '../constants'
import { usePairing } from '../hooks/usePairing'
import { useServers } from '../hooks/useServers'
import { normalizeGatewayUrl } from '../services/discovery'
import { currentSessionKeyAtom, onboardingCompletedAtom, serverSessionsAtom } from '../store'
import { useTheme } from '../theme'

type ConnectionMode = 'pair' | 'token'

export function OnboardingScreen() {
  const { theme } = useTheme()
  const { addServer } = useServers()
  const [, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [, setServerSessions] = useAtom(serverSessionsAtom)
  const [, setOnboardingCompleted] = useAtom(onboardingCompletedAtom)

  const [mode, setMode] = useState<ConnectionMode>('pair')
  const [localUrl, setLocalUrl] = useState('')
  const [localToken, setLocalToken] = useState('')
  const [localClientId, setLocalClientId] = useState('lumiere-mobile')
  const [localSessionKey, setLocalSessionKey] = useState(DEFAULT_SESSION_KEY)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const {
    pairingState,
    pairingInfo,
    error: pairingError,
    issuedToken,
    startPairing,
    cancel,
  } = usePairing()

  const handleCompleteWithToken = useCallback(
    async (token: string) => {
      const url = normalizeGatewayUrl(localUrl.trim())

      const serverId = await addServer(
        {
          name: 'My Server',
          url,
          clientId: localClientId.trim(),
          providerType: 'molt',
        },
        token,
      )

      // Set session key from onboarding (persists to AsyncStorage)
      const sessionKey = localSessionKey.trim()

      // Store in both places:
      // 1. currentSessionKeyAtom - current active session key
      setCurrentSessionKey(sessionKey)

      // 2. serverSessionsAtom - track session key per server
      setServerSessions((prev) => ({
        ...prev,
        [serverId]: sessionKey,
      }))

      // Mark onboarding complete
      setOnboardingCompleted(true)
    },
    [
      localUrl,
      localClientId,
      localSessionKey,
      addServer,
      setCurrentSessionKey,
      setServerSessions,
      setOnboardingCompleted,
    ],
  )

  // When pairing succeeds and we get a token, complete onboarding (deferred to avoid synchronous setState in effect)
  useEffect(() => {
    if (pairingState === 'paired' && issuedToken) {
      const id = requestAnimationFrame(() => {
        handleCompleteWithToken(issuedToken)
      })
      return () => cancelAnimationFrame(id)
    }
  }, [pairingState, issuedToken, handleCompleteWithToken])

  const handleManualComplete = async () => {
    if (localUrl.trim() && localToken.trim()) {
      await handleCompleteWithToken(localToken.trim())
    }
  }

  const handleStartPairing = () => {
    if (!localUrl.trim()) return
    const url = normalizeGatewayUrl(localUrl.trim())
    startPairing(url)
  }

  const isManualValid = localUrl.trim().length > 0 && localToken.trim().length > 0
  const isPairValid = localUrl.trim().length > 0
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
      flexGrow: 1,
      padding: theme.spacing.xl,
      justifyContent: 'center',
    },
    header: {
      marginBottom: theme.spacing.xxl,
      alignItems: 'center',
    },
    logo: {
      width: 280,
      height: 120,
      marginBottom: theme.spacing.lg,
    },
    form: {
      marginBottom: theme.spacing.xxl,
    },
    modeToggle: {
      flexDirection: 'row',
      marginBottom: theme.spacing.lg,
      borderRadius: theme.borderRadius.md,
      overflow: 'hidden',
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    modeButton: {
      flex: 1,
      paddingVertical: theme.spacing.sm,
      alignItems: 'center',
    },
    modeButtonActive: {
      backgroundColor: theme.colors.primary,
    },
    advancedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    pairingStatus: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      gap: theme.spacing.md,
    },
    requestIdBox: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      alignItems: 'center',
      width: '100%',
    },
    requestId: {
      fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
      fontSize: 18,
      letterSpacing: 2,
    },
    hint: {
      marginTop: theme.spacing.sm,
    },
    errorBox: {
      backgroundColor: theme.colors.status.error + '15',
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
  })

  const renderPairingStatus = () => {
    if (pairingState === 'requesting') {
      return (
        <View style={styles.pairingStatus}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text color="secondary">Connecting to gateway...</Text>
        </View>
      )
    }

    if (pairingState === 'waiting' && pairingInfo) {
      return (
        <View style={styles.pairingStatus}>
          <ActivityIndicator size="small" color={theme.colors.primary} />
          <Text variant="heading3">Waiting for approval</Text>
          <View style={styles.requestIdBox}>
            <Text color="secondary" variant="caption">
              Request ID
            </Text>
            <Text style={styles.requestId}>{pairingInfo.requestId}</Text>
          </View>
          <Text color="secondary" variant="caption" center style={styles.hint}>
            On your server, run:
          </Text>
          <View style={styles.requestIdBox}>
            <Text style={[styles.requestId, { fontSize: 14 }]}>
              openclaw nodes approve {pairingInfo.requestId}
            </Text>
          </View>
          <Text color="secondary" variant="caption" center style={styles.hint}>
            The request expires in 5 minutes.
          </Text>
          <Button title="Cancel" variant="secondary" onPress={cancel} />
        </View>
      )
    }

    if (pairingState === 'error') {
      return (
        <View style={styles.pairingStatus}>
          <View style={styles.errorBox}>
            <Text color="error">{pairingError || 'Pairing failed'}</Text>
          </View>
          <Button title="Try Again" variant="secondary" onPress={cancel} />
        </View>
      )
    }

    return null
  }

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Image
              // eslint-disable-next-line @typescript-eslint/no-require-imports
              source={require('../../assets/logo.png')}
              style={styles.logo}
              resizeMode="contain"
            />
          </View>

          <View style={styles.form}>
            {/* Mode toggle */}
            <View style={styles.modeToggle}>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'pair' && styles.modeButtonActive]}
                onPress={() => {
                  setMode('pair')
                  cancel()
                }}
              >
                <Text color={mode === 'pair' ? 'inverse' : 'primary'} variant="label">
                  Pair Device
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modeButton, mode === 'token' && styles.modeButtonActive]}
                onPress={() => {
                  setMode('token')
                  cancel()
                }}
              >
                <Text color={mode === 'token' ? 'inverse' : 'primary'} variant="label">
                  Manual Token
                </Text>
              </TouchableOpacity>
            </View>

            <TextInput
              label="Gateway URL"
              value={localUrl}
              onChangeText={setLocalUrl}
              placeholder="192.168.1.5 or wss://gw.example.com"
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="url"
              hint="IP address or URL of your OpenClaw gateway"
              editable={!isPairing}
            />

            {mode === 'token' && (
              <TextInput
                label="Gateway Token"
                value={localToken}
                onChangeText={setLocalToken}
                placeholder="Your authentication token"
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
                hint="Your authentication token for the gateway"
              />
            )}

            {mode === 'pair' && renderPairingStatus()}

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
          </View>

          {mode === 'pair' && pairingState === 'unpaired' && (
            <Button
              title="Pair This Device"
              size="lg"
              onPress={handleStartPairing}
              disabled={!isPairValid}
            />
          )}

          {mode === 'token' && (
            <Button
              title="Get Started"
              size="lg"
              onPress={handleManualComplete}
              disabled={!isManualValid}
            />
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
