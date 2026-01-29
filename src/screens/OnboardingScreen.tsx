import { useAtom } from 'jotai'
import React, { useMemo,useState } from 'react'
import {
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

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

  const [localUrl, setLocalUrl] = useState(
    gatewayUrl || 'wss://ajamaica-standardpc.tail185e2.ts.net',
  )
  const [localToken, setLocalToken] = useState(
    gatewayToken || 'a4b48356b80d2e02bf40cf6a1cfdc1bbd0341db58b072325',
  )
  const [localClientId, setLocalClientId] = useState(clientId || 'lumiere-mobile')

  const styles = useMemo(() => createStyles(theme), [theme])

  const handleComplete = () => {
    if (localUrl.trim() && localToken.trim()) {
      setGatewayUrl(localUrl.trim())
      setGatewayToken(localToken.trim())
      setClientId(localClientId.trim())
      setCurrentSessionKey('agent:main:main')
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
            <Text style={styles.title}>Welcome to Lumiere</Text>
            <Text style={styles.subtitle}>Configure your AI gateway to get started</Text>
          </View>

          <View style={styles.form}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gateway URL</Text>
              <TextInput
                style={styles.input}
                value={localUrl}
                onChangeText={setLocalUrl}
                placeholder="https://your-gateway.example.com"
                placeholderTextColor={theme.colors.text.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
                keyboardType="url"
              />
              <Text style={styles.hint}>The URL of your Molt Gateway server</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Gateway Token</Text>
              <TextInput
                style={styles.input}
                value={localToken}
                onChangeText={setLocalToken}
                placeholder="Your authentication token"
                placeholderTextColor={theme.colors.text.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
                secureTextEntry
              />
              <Text style={styles.hint}>Your authentication token for the gateway</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Client ID</Text>
              <TextInput
                style={styles.input}
                value={localClientId}
                onChangeText={setLocalClientId}
                placeholder="lumiere-mobile"
                placeholderTextColor={theme.colors.text.tertiary}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <Text style={styles.hint}>Identifier for this device (default: lumiere-mobile)</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[styles.button, !isValid && styles.buttonDisabled]}
            onPress={handleComplete}
            disabled={!isValid}
          >
            <Text style={styles.buttonText}>Get Started</Text>
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const createStyles = (theme: any) =>
  StyleSheet.create({
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
    title: {
      fontSize: theme.typography.fontSize.xxxl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
    },
    form: {
      marginBottom: theme.spacing.xxl,
    },
    inputGroup: {
      marginBottom: theme.spacing.xl,
    },
    label: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.sm,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    hint: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
    button: {
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
      paddingVertical: theme.spacing.lg,
      alignItems: 'center',
    },
    buttonDisabled: {
      opacity: 0.5,
    },
    buttonText: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
    },
  })
