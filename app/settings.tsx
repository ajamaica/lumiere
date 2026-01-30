import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { useSetAtom } from 'jotai'
import React from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet } from 'react-native'

import { Button, ScreenHeader, Section, SettingRow } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { onboardingCompletedAtom } from '../src/store'
import { useTheme } from '../src/theme'

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme()
  const router = useRouter()
  const { currentServer, serversList } = useServers()
  const setOnboardingCompleted = useSetAtom(onboardingCompletedAtom)

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

  const handleThemeToggle = () => {
    const modes = ['light', 'dark', 'system'] as const
    const currentIndex = modes.indexOf(themeMode)
    const nextIndex = (currentIndex + 1) % modes.length
    setThemeMode(modes[nextIndex])
  }

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout? All servers and settings will be cleared.',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await AsyncStorage.multiRemove([
              'servers',
              'currentServerId',
              'serverSessions',
              'onboardingCompleted',
            ])
            setOnboardingCompleted(false)
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
      <ScreenHeader title="Settings" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title="Appearance">
          <SettingRow label="Theme" value={getThemeLabel()} onPress={handleThemeToggle} />
        </Section>

        <Section title="Servers">
          <SettingRow
            label="Current Server"
            value={currentServer?.name || 'None'}
            onPress={() => router.push('/servers')}
          />
          <SettingRow
            label="Total Servers"
            value={serversList.length.toString()}
            onPress={() => router.push('/servers')}
          />
        </Section>

        <Section title="Control">
          <SettingRow label="Overview" onPress={() => router.push('/overview')} />
          <SettingRow label="Cron Jobs" onPress={() => router.push('/scheduler')} />
        </Section>

        <Section title="Developer">
          <SettingRow label="Component Gallery" onPress={() => router.push('/gallery')} />
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
