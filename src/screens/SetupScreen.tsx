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

import { Button, Text, TextInput } from '../components/ui'
import { DEFAULT_SESSION_KEY } from '../constants'
import { useServers } from '../hooks/useServers'
import { currentSessionKeyAtom, onboardingCompletedAtom, serverSessionsAtom } from '../store'
import { useTheme } from '../theme'

export function SetupScreen() {
  const { theme } = useTheme()
  const { addServer } = useServers()
  const [, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [, setServerSessions] = useAtom(serverSessionsAtom)
  const [, setOnboardingCompleted] = useAtom(onboardingCompletedAtom)

  const [localUrl, setLocalUrl] = useState('')
  const [localToken, setLocalToken] = useState('')
  const [localClientId, setLocalClientId] = useState('lumiere-mobile')
  const [localSessionKey, setLocalSessionKey] = useState(DEFAULT_SESSION_KEY)
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
    echoLink: {
      alignItems: 'center',
      paddingVertical: theme.spacing.xl,
      marginTop: theme.spacing.lg,
    },
  })

  const handleComplete = async () => {
    if (localUrl.trim() && localToken.trim()) {
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
    }
  }

  const handleCreateEchoAgent = async () => {
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
  }

  const isValid = localUrl.trim().length > 0 && localToken.trim().length > 0

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
          Connect to your Molt Gateway to start chatting with your agents.
        </Text>

        <View style={styles.form}>
          <TextInput
            label="Gateway URL"
            value={localUrl}
            onChangeText={setLocalUrl}
            placeholder="https://your-gateway.example.com"
            autoCapitalize="none"
            autoCorrect={false}
            keyboardType="url"
            hint="The URL of your Molt Gateway server"
          />

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

        <Button title="Get Started" size="lg" onPress={handleComplete} disabled={!isValid} />

        <TouchableOpacity style={styles.echoLink} onPress={handleCreateEchoAgent}>
          <Text variant="bodySmall" color="secondary">
            Create demo Echo Agent
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
