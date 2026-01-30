import { useRouter } from 'expo-router'
import { useSetAtom } from 'jotai'
import React from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet } from 'react-native'

import { Button, ScreenHeader, Section, SettingRow } from '../../src/components/ui'
import {
  clientIdAtom,
  currentSessionKeyAtom,
  gatewayTokenAtom,
  gatewayUrlAtom,
  onboardingCompletedAtom,
} from '../../src/store'
import { useTheme } from '../../src/theme'

export default function SettingsScreen() {
  const { theme, themeMode } = useTheme()
  const router = useRouter()
  const setOnboardingCompleted = useSetAtom(onboardingCompletedAtom)
  const setGatewayUrl = useSetAtom(gatewayUrlAtom)
  const setGatewayToken = useSetAtom(gatewayTokenAtom)
  const setClientId = useSetAtom(clientIdAtom)
  const setCurrentSessionKey = useSetAtom(currentSessionKeyAtom)

  const getThemeLabel = () => {
    switch (themeMode) {
      case 'light':
        return 'Light'
      case 'dark':
        return 'Dark'
      case 'system':
        return 'System'
      default:
        return 'System'
    }
  }

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? You will need to reconfigure your gateway settings.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: () => {
            setOnboardingCompleted(false)
            setGatewayUrl('')
            setGatewayToken('')
            setClientId('lumiere-mobile')
            setCurrentSessionKey('')
          },
        },
      ],
    )
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Settings" />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title="Appearance">
          <SettingRow label="Theme" value={getThemeLabel()} />
        </Section>

        <Section title="Control">
          <SettingRow label="Overview" onPress={() => router.push('/overview')} />
          <SettingRow label="Cron Jobs" onPress={() => router.push('/scheduler')} />
        </Section>

        <Section title="About">
          <SettingRow label="Version" value="1.0.0" />
        </Section>

        <Section title="Account">
          <Button title="Logout" variant="danger" size="lg" onPress={handleLogout} />
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
