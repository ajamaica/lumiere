import { Ionicons } from '@expo/vector-icons'
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
import { SvgXml } from 'react-native-svg'

import {
  clientIdAtom,
  currentSessionKeyAtom,
  gatewayTokenAtom,
  gatewayUrlAtom,
  onboardingCompletedAtom,
} from '../store'
import { useTheme } from '../theme'

const logoSvg = `<svg viewBox="0 0 3000 1502.72" xmlns="http://www.w3.org/2000/svg">
  <defs>
    <style>
      .cls-1 { fill: #f2af4c; }
      .cls-2 { fill: #343434; }
      .cls-3 { fill: #f07b49; }
    </style>
  </defs>
  <g>
    <path class="cls-3" d="M1500.73,131.9c43.47,0,79.87,28.92,94.72,68.76,3.5,9.46,5.19,28.01,5.07,55.66-.2,36.78-.32,73.33-.36,109.63,0,36.3.06,72.86.18,109.69.08,27.61-1.65,46.14-5.19,55.6-14.91,39.84-51.31,68.64-94.84,68.64-43.53-.06-79.87-28.92-94.78-68.82-3.5-9.46-5.19-27.99-5.07-55.6.2-36.78.32-73.35.36-109.69.04-36.3-.02-72.84-.18-109.63-.08-27.61,1.65-46.16,5.19-55.66,14.91-39.78,51.37-68.64,94.9-68.58M1001.66,191.48c58.68.12,98.94,44.73,99.97,101.84.6,35.34.91,59.62.91,72.86-.04,13.2-.46,37.49-1.27,72.86-1.33,57.05-41.77,101.48-100.45,101.36-58.68-.18-98.94-44.79-99.97-101.9-.6-35.34-.89-59.62-.85-72.86.04-13.2.44-37.49,1.21-72.86,1.33-57.05,41.84-101.48,100.45-101.3"/>
    <g>
      <rect class="cls-2" x="1148.74" y="0" width="201.51" height="729.49" rx="97.92" ry="97.92" transform="translate(-.63 2.18) rotate(-.1)"/>
      <rect class="cls-2" x="1900.37" y="193.97" width="199.34" height="344.58" rx="94.11" ry="94.11" transform="translate(-.64 3.49) rotate(-.1)"/>
    </g>
    <rect class="cls-1" x="1386.07" y="264.57" width="729.61" height="201.03" rx="97.62" ry="97.62" transform="translate(1382.74 2115.32) rotate(-89.9)"/>
  </g>
  <g>
    <path class="cls-2" d="M57.84,1239.88H15.53l78.8-340.06h183.62l-78.03,340.06h41.93l-57.45,246.89H0l57.84-246.89ZM302.02,1239.88h-41.93c17.08-74.53,37.66-150.23,46.58-186.34h184.39l-38.43,186.34h42.31l-20.57,97.05c-9.32,41.93,39.98,31.06,47.36,11.26l24.84-108.31h-41.15l41.93-186.34h184.78l-42.7,186.34h41.93l-56.29,246.89h-184.78l1.94-9.7c-73.76,26.01-202.64,29.5-216.23-67.93-3.49-29.5,9.7-98.6,26.01-169.25h0ZM1383.15,1488.33h-183.23c19.41-82.69,42.31-169.64,58.23-253.11h-38.82c.39-3.88,1.16-7.76,1.94-12.03,2.33-12.42,2.72-21.74,1.55-27.95-2.72-20.57-32.61-12.42-41.15,0l-8.54,39.98h39.21l-58.62,253.11h-183.62c19.02-83.46,41.93-168.87,58.62-253.11h-39.98c.78-3.88,1.55-7.76,2.33-12.03,2.72-12.81,3.49-22.52,3.11-28.34l-.39.39c-5.82-20.19-31.44-12.03-40.37.39l-8.93,39.6h39.21l-58.62,253.11h-182.84l58.62-253.11h-39.21l42.31-184.39h183.23l-4.27,15.53c59.39-29.11,148.29-51.63,189.05,19.8,97.44-66.77,260.87-78.03,243.01,82.69-1.16,12.03-4.27,26.01-6.99,41.15l-5.43,25.23h38.43l-57.84,253.11ZM1475.93,1239.88h-40.76l33.77-150.23h185.17l-33.77,150.23h41.15l-54.74,246.89h-185.17l54.35-246.89ZM1701.86,899.82l-32.22,140.53h-191.77l32.22-140.53h191.77ZM1722.05,1270.94c3.11-13.2,7.38-24.84,11.26-37.27h-43.09c93.17-253.49,492.24-278.73,440.61,0h43.48c-.78,4.66-.78,9.32-1.94,14.36l-16.69,64.83h-256.99c-13.2,95.89,168.87,66.77,186.72,32.22h59.39l-28.34,110.64c-153.34,88.12-451.48,65.99-394.41-184.78h0ZM1997.28,1196.02c8.54-42.31-84.63-66.38-128.49,0,.39,0,128.49.39,128.49,0ZM2386.26,1233.67l-57.45,252.72h-182.07l57.84-252.72h-35.33l42.31-183.23h182.07l-5.43,20.96c51.24-26.01,87.34-26.01,140.53-16.3l-35.71,154.11h-48.14c-8.15-36.88-76.48-22.9-89.29,5.82l-4.66,18.63h35.33ZM2547.75,1270.94c3.11-13.2,7.38-24.84,11.26-37.27h-43.09c93.17-253.49,492.24-278.73,440.61,0h43.48c-.78,4.66-.78,9.32-1.94,14.36l-16.69,64.83h-256.99c-13.2,95.89,168.87,66.77,186.72,32.22h59.39l-28.34,110.64c-153.34,88.12-451.48,65.99-394.41-184.78h0ZM2822.98,1196.02c8.54-42.31-84.63-66.38-128.49,0,.39,0,128.49.39,128.49,0Z"/>
  </g>
</svg>`

export function OnboardingScreen() {
  const { theme } = useTheme()
  const [gatewayUrl, setGatewayUrl] = useAtom(gatewayUrlAtom)
  const [gatewayToken, setGatewayToken] = useAtom(gatewayTokenAtom)
  const [clientId, setClientId] = useAtom(clientIdAtom)
  const [, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [, setOnboardingCompleted] = useAtom(onboardingCompletedAtom)

  const [localUrl, setLocalUrl] = useState(
    gatewayUrl
  )
  const [localToken, setLocalToken] = useState(
    gatewayToken
  )
  const [localClientId, setLocalClientId] = useState(clientId || 'lumiere-mobile')
  const [localSessionKey, setLocalSessionKey] = useState('agent:main:main')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const styles = useMemo(() => createStyles(theme), [theme])

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
            <SvgXml xml={logoSvg} width="280" height="120" />
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

            <TouchableOpacity
              style={styles.advancedToggle}
              onPress={() => setShowAdvanced(!showAdvanced)}
            >
              <Text style={styles.advancedToggleText}>Advanced</Text>
              <Ionicons
                name={showAdvanced ? 'chevron-up' : 'chevron-down'}
                size={20}
                color={theme.colors.text.secondary}
              />
            </TouchableOpacity>

            {showAdvanced && (
              <>
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

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Default Session Key</Text>
                  <TextInput
                    style={styles.input}
                    value={localSessionKey}
                    onChangeText={setLocalSessionKey}
                    placeholder="agent:main:main"
                    placeholderTextColor={theme.colors.text.tertiary}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Text style={styles.hint}>Session key for chat conversations (default: agent:main:main)</Text>
                </View>
              </>
            )}
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
    logo: {
      width: 280,
      height: 120,
      marginBottom: theme.spacing.lg,
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
    advancedToggle: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    advancedToggleText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
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
