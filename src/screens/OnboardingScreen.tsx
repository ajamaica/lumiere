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
import {
  clientIdAtom,
  currentSessionKeyAtom,
  gatewayTokenAtom,
  gatewayUrlAtom,
  onboardingCompletedAtom,
} from '../store'
import { useTheme } from '../theme'

export function OnboardingScreen() {
  const { theme } = useTheme()
  const [gatewayUrl, setGatewayUrl] = useAtom(gatewayUrlAtom)
  const [gatewayToken, setGatewayToken] = useAtom(gatewayTokenAtom)
  const [clientId, setClientId] = useAtom(clientIdAtom)
  const [, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [, setOnboardingCompleted] = useAtom(onboardingCompletedAtom)

  const [localUrl, setLocalUrl] = useState(gatewayUrl)
  const [localToken, setLocalToken] = useState(gatewayToken)
  const [localClientId, setLocalClientId] = useState(clientId || 'lumiere-mobile')
  const [localSessionKey, setLocalSessionKey] = useState('agent:main:main')
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
      setGatewayUrl(localUrl.trim())
      setGatewayToken(localToken.trim())
      setClientId(localClientId.trim())
      setCurrentSessionKey(localSessionKey.trim())
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
                  placeholder="agent:main:main"
                  autoCapitalize="none"
                  autoCorrect={false}
                  hint="Session key for chat conversations (default: agent:main:main)"
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
