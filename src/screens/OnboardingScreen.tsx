import AsyncStorage from '@react-native-async-storage/async-storage'
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
import { useServers } from '../hooks/useServers'
import { onboardingCompletedAtom, serverSessionsAtom } from '../store'
import { useTheme } from '../theme'

export function OnboardingScreen() {
  const { theme } = useTheme()
  const { addServer, switchToServer } = useServers()
  const [, setServerSessions] = useAtom(serverSessionsAtom)
  const [, setOnboardingCompleted] = useAtom(onboardingCompletedAtom)

  const [localUrl, setLocalUrl] = useState('')
  const [localToken, setLocalToken] = useState('')
  const [localClientId, setLocalClientId] = useState('lumiere-mobile')
  const [localSessionKey, setLocalSessionKey] = useState('agent:main:main')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const [isCompleting, setIsCompleting] = useState(false)

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

  const handleComplete = async () => {
    if (localUrl.trim() && localToken.trim()) {
      setIsCompleting(true)

      try {
        // Create new server
        const serverId = addServer({
          name: 'My Server',
          url: localUrl.trim(),
          token: localToken.trim(),
          clientId: localClientId.trim() || 'lumiere-mobile',
        })

        // Set as current server (done automatically in addServer if first)
        switchToServer(serverId)

        // Set initial session for this server with default fallback
        const sessionKey = localSessionKey.trim() || 'agent:main:main'

        // PROPER FIX: Directly persist to AsyncStorage and await completion
        // This ensures the session key is fully persisted before marking onboarding complete,
        // preventing the race condition where ChatScreen mounts before AsyncStorage writes finish.
        const existingSessions = await AsyncStorage.getItem('serverSessions')
        const sessions = existingSessions ? JSON.parse(existingSessions) : {}
        sessions[serverId] = sessionKey

        // Wait for AsyncStorage write to complete
        await AsyncStorage.setItem('serverSessions', JSON.stringify(sessions))

        // Update the Jotai atom (will read from AsyncStorage, so already in sync)
        setServerSessions(sessions)

        // Now safe to mark onboarding complete - session key is guaranteed to be persisted
        setOnboardingCompleted(true)
      } catch (error) {
        console.error('Error completing onboarding:', error)
        setIsCompleting(false)
      }
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
                  placeholder="agent:main:main"
                  autoCapitalize="none"
                  autoCorrect={false}
                  hint="Session key for chat conversations (default: agent:main:main)"
                />
              </>
            )}
          </View>

          <Button
            title={isCompleting ? 'Setting up...' : 'Get Started'}
            size="lg"
            onPress={handleComplete}
            disabled={!isValid || isCompleting}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}
