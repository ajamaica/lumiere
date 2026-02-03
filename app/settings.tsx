import AsyncStorage from '@react-native-async-storage/async-storage'
import * as LocalAuthentication from 'expo-local-authentication'
import { useRouter } from 'expo-router'
import { useAtom, useSetAtom } from 'jotai'
import React from 'react'
import { Alert, Pressable, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'

import { Button, ScreenHeader, Section, SettingRow, Text } from '../src/components/ui'
import { useFeatureFlags } from '../src/hooks/useFeatureFlags'
import { useServers } from '../src/hooks/useServers'
import { biometricLockEnabledAtom, onboardingCompletedAtom } from '../src/store'
import { useTheme } from '../src/theme'
import { ColorThemeKey, colorThemes } from '../src/theme/colors'

const COLOR_THEME_KEYS: ColorThemeKey[] = [
  'default',
  'pink',
  'green',
  'red',
  'blue',
  'purple',
  'orange',
  'glass',
]

export default function SettingsScreen() {
  const { theme, themeMode, setThemeMode, colorTheme, setColorTheme } = useTheme()
  const router = useRouter()
  const { currentServer, serversList } = useServers()
  const { flags, setFlag } = useFeatureFlags()
  const setOnboardingCompleted = useSetAtom(onboardingCompletedAtom)
  const [biometricLockEnabled, setBiometricLockEnabled] = useAtom(biometricLockEnabledAtom)

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
            ])
            setOnboardingCompleted(false)
          },
        },
      ],
    )
  }

  const getSwatchColor = (key: ColorThemeKey): string => {
    const palette = colorThemes[key]
    return theme.isDark ? palette.dark.primary : palette.light.primary
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    colorThemeGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      paddingHorizontal: theme.spacing.lg,
      paddingVertical: theme.spacing.md,
    },
    colorThemeItem: {
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    colorSwatch: {
      width: 44,
      height: 44,
      borderRadius: 22,
      borderWidth: 3,
      borderColor: 'transparent',
    },
    colorSwatchSelected: {
      borderColor: theme.colors.text.primary,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Settings" showBack />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title="Appearance">
          <SettingRow label="Theme" value={getThemeLabel()} onPress={handleThemeToggle} />
        </Section>

        <Section title="Security">
          <SettingRow
            label="Require Face ID"
            switchValue={biometricLockEnabled}
            onSwitchChange={handleBiometricToggle}
          />
        </Section>

        <Section title="Color Theme">
          <View style={styles.colorThemeGrid}>
            {COLOR_THEME_KEYS.map((key) => (
              <Pressable key={key} style={styles.colorThemeItem} onPress={() => setColorTheme(key)}>
                <View
                  style={[
                    styles.colorSwatch,
                    { backgroundColor: getSwatchColor(key) },
                    colorTheme === key && styles.colorSwatchSelected,
                  ]}
                />
                <Text variant="caption" color={colorTheme === key ? 'primary' : 'secondary'}>
                  {colorThemes[key].name}
                </Text>
              </Pressable>
            ))}
          </View>
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
        </Section>

        {currentServer?.providerType !== 'ollama' && currentServer?.providerType !== 'echo' && (
          <Section title="Control">
            <SettingRow label="Overview" onPress={() => router.push('/overview')} />
            <SettingRow label="Cron Jobs" onPress={() => router.push('/scheduler')} />
          </Section>
        )}

        <Section title="Feature Flags">
          <SettingRow
            label="Ollama Provider"
            switchValue={flags.ollamaProvider}
            onSwitchChange={(value) => setFlag('ollamaProvider', value)}
          />
          <SettingRow
            label="Echo Server"
            switchValue={flags.echoProvider}
            onSwitchChange={(value) => setFlag('echoProvider', value)}
          />
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
