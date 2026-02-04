import AsyncStorage from '@react-native-async-storage/async-storage'
import * as LocalAuthentication from 'expo-local-authentication'
import { useRouter } from 'expo-router'
import { useAtom, useSetAtom } from 'jotai'
import React from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet } from 'react-native'

import { Button, ScreenHeader, Section, SettingRow } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import {
  backgroundNotificationsEnabledAtom,
  biometricLockEnabledAtom,
  onboardingCompletedAtom,
} from '../src/store'
import { useTheme } from '../src/theme'
import { colorThemes } from '../src/theme/colors'

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode, colorTheme } = useTheme()
  const router = useRouter()
  const { currentServer, serversList } = useServers()
  const setOnboardingCompleted = useSetAtom(onboardingCompletedAtom)
  const [biometricLockEnabled, setBiometricLockEnabled] = useAtom(biometricLockEnabledAtom)
  const [backgroundNotificationsEnabled, setBackgroundNotificationsEnabled] = useAtom(
    backgroundNotificationsEnabledAtom,
  )

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const compatible = await LocalAuthentication.hasHardwareAsync()
      if (!compatible) {
        Alert.alert('Unavailable', 'Biometric authentication is not available on this device.')
        return
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync()
      if (!enrolled) {
        Alert.alert('Not Enrolled', 'No biometric credentials are enrolled on this device.')
        return
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to enable Face ID lock',
      })
      if (result.success) {
        setBiometricLockEnabled(true)
      }
    } else {
      setBiometricLockEnabled(false)
    }
  }

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
              'triggers',
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
          <SettingRow
            label="Colors"
            value={colorThemes[colorTheme].name}
            onPress={() => router.push('/colors')}
          />
        </Section>

        <Section title="Security">
          <SettingRow
            label="Require Face ID"
            switchValue={biometricLockEnabled}
            onSwitchChange={handleBiometricToggle}
          />
        </Section>

        <Section title="Notifications">
          <SettingRow
            label="Background Notifications"
            switchValue={backgroundNotificationsEnabled}
            onSwitchChange={setBackgroundNotificationsEnabled}
          />
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

        <Section title="Content">
          <SettingRow label="Favorites" onPress={() => router.push('/favorites')} />
          <SettingRow label="Triggers" onPress={() => router.push('/triggers')} />
        </Section>

        {currentServer?.providerType !== 'ollama' && currentServer?.providerType !== 'echo' && (
          <Section title="Control">
            <SettingRow label="Overview" onPress={() => router.push('/overview')} />
            <SettingRow label="Cron Jobs" onPress={() => router.push('/scheduler')} />
          </Section>
        )}

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
