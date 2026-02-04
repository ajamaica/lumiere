import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import * as LocalAuthentication from 'expo-local-authentication'
import { useRouter } from 'expo-router'
import { useAtom, useSetAtom } from 'jotai'
import React from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, Text, View } from 'react-native'

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
              'biometricLockEnabled',
            ])
            setBiometricLockEnabled(false)
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
      paddingHorizontal: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    spacer: {
      height: theme.spacing.lg,
    },
    logoutSection: {
      marginTop: theme.spacing.xl,
    },
    footer: {
      marginTop: theme.spacing.xl,
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    footerText: {
      color: theme.colors.text.secondary,
      fontSize: 12,
      textAlign: 'center',
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Settings" showClose />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Server info at top - like Reeder+ section */}
        <Section>
          <SettingRow
            icon="server-outline"
            label={currentServer?.name || 'No Server'}
            subtitle={`${serversList.length} server${serversList.length !== 1 ? 's' : ''} configured`}
            onPress={() => router.push('/servers')}
            showDivider={false}
          />
        </Section>

        <View style={styles.spacer} />

        {/* Main settings group */}
        <Section showDivider>
          <SettingRow
            icon="settings-outline"
            label="General"
            onPress={handleThemeToggle}
            value={getThemeLabel()}
          />
          <SettingRow
            icon="color-palette-outline"
            label="Colors"
            value={colorThemes[colorTheme].name}
            onPress={() => router.push('/colors')}
          />
          <SettingRow
            icon="scan-outline"
            label="Face ID"
            switchValue={biometricLockEnabled}
            onSwitchChange={handleBiometricToggle}
          />
          <SettingRow
            icon="notifications-outline"
            label="Notifications"
            switchValue={backgroundNotificationsEnabled}
            onSwitchChange={setBackgroundNotificationsEnabled}
            showDivider={false}
          />
        </Section>

        {/* Content group */}
        <Section showDivider>
          <SettingRow
            icon="heart-outline"
            label="Favorites"
            onPress={() => router.push('/favorites')}
          />
          <SettingRow
            icon="flash-outline"
            label="Triggers"
            onPress={() => router.push('/triggers')}
            showDivider={false}
          />
        </Section>

        {/* Control group - only available for OpenClaw (Molt) servers */}
        {currentServer?.providerType === 'molt' && (
          <Section showDivider>
            <SettingRow
              icon="grid-outline"
              label="Overview"
              onPress={() => router.push('/overview')}
            />
            <SettingRow
              icon="time-outline"
              label="Cron Jobs"
              onPress={() => router.push('/scheduler')}
              showDivider={false}
            />
          </Section>
        )}

        {/* Developer */}
        {__DEV__ && (
          <Section showDivider>
            <SettingRow
              icon="construct-outline"
              label="Component Gallery"
              onPress={() => router.push('/gallery')}
              showDivider={false}
            />
          </Section>
        )}

        {/* Logout */}
        <View style={styles.logoutSection}>
          <Button title="Logout" variant="danger" size="lg" onPress={handleLogout} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {Constants.expoConfig?.name ?? 'Lumiere'}{' '}
            {Constants.expoConfig?.version ?? '1.0.0'} (
            {(Constants.expoConfig?.ios?.buildNumber ?? '1').slice(0, 5)})
          </Text>
          <Text style={styles.footerText}>With ♥ from Arturo, Mateo and Alonso</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
