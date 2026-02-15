import AsyncStorage from '@react-native-async-storage/async-storage'
import { useRouter } from 'expo-router'
import { useSetAtom } from 'jotai'
import React from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet } from 'react-native'

import { Button, ScreenHeader, Section, SettingRow } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { useNodePairing } from '../src/hooks/useNodePairing'
import { onboardingCompletedAtom } from '../src/store'
import { useTheme } from '../src/theme'

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode } = useTheme()
  const router = useRouter()
  const { currentServer, serversList } = useServers()
  const { requestPairing, isPaired, isLoading, pairingStatus } = useNodePairing()
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

  const handlePairAsNode = async () => {
    try {
      await requestPairing()
      Alert.alert(
        'Pairing Requested',
        'A pairing request has been sent to the gateway. Please approve it using:\n\nclawdbot nodes approve',
        [{ text: 'OK' }],
      )
    } catch (error) {
      Alert.alert(
        'Pairing Failed',
        error instanceof Error ? error.message : 'Failed to request pairing',
        [{ text: 'OK' }],
      )
    }
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

        <Section title="Node Pairing">
          <SettingRow
            label="Pairing Status"
            value={
              isPaired
                ? '✅ Paired'
                : pairingStatus?.status === 'pending'
                  ? '⏳ Pending'
                  : '❌ Not Paired'
            }
          />
          {!isPaired && (
            <Button
              title={isLoading ? 'Requesting...' : 'Pair as Node'}
              onPress={handlePairAsNode}
              disabled={isLoading || pairingStatus?.status === 'pending'}
              size="lg"
            />
          )}
        </Section>

        <Section title="Control">
          <SettingRow label="Overview" onPress={() => router.push('/overview')} />
          <SettingRow label="Cron Jobs" onPress={() => router.push('/scheduler')} />
          <SettingRow label="Canvas Viewer" onPress={() => router.push('/canvas')} />
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
