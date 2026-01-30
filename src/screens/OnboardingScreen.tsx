import { Ionicons } from '@expo/vector-icons'
import { useAtom } from 'jotai'
import React, { useState } from 'react'
import {
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
import { useServers } from '../hooks/useServers'
import {
  currentSessionKeyAtom,
  onboardingCompletedAtom,
  serverSessionsAtom,
} from '../store'
import { useTheme } from '../theme'

export function OnboardingScreen() {
  const { theme } = useTheme()
  const { addServer, switchToServer } = useServers()
  const [, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [, setServerSessions] = useAtom(serverSessionsAtom)
  const [, setOnboardingCompleted] = useAtom(onboardingCompletedAtom)

  const [localUrl, setLocalUrl] = useState('')
  const [localToken, setLocalToken] = useState('')
  const [localClientId, setLocalClientId] = useState('lumiere-mobile')
  const [localSessionKey, setLocalSessionKey] = useState(DEFAULT_SESSION_KEY)
  const [showAdvanced, setShowAdvanced] = useState(false)

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
    advancedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
  })

  const handleComplete = () => {
    if (localUrl.trim() && localToken.trim()) {
      // Create new server
      const serverId = addServer({
        name: 'My Server',
        url: localUrl.trim(),
        token: localToken.trim(),
        clientId: localClientId.trim(),
      })

      // Set as current server (done automatically in addServer if first)
      switchToServer(serverId)

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
    }
  }

  const isValid = localUrl.trim().length > 0 && localToken.trim().length > 0

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
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
