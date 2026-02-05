import { Ionicons } from '@expo/vector-icons'
import AsyncStorage from '@react-native-async-storage/async-storage'
import Constants from 'expo-constants'
import * as LocalAuthentication from 'expo-local-authentication'
import { useRouter } from 'expo-router'
import { useAtom, useSetAtom } from 'jotai'
import React from 'react'
import { useTranslation } from 'react-i18next'
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { Button, ScreenHeader, Section, SettingRow } from '../src/components/ui'
import { useLanguage } from '../src/hooks/useLanguage'
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
  const { t } = useTranslation()
  const { currentLanguage, currentLanguageName, setLanguage, supportedLanguages } = useLanguage()
  const { currentServer, currentServerId, serversList, switchToServer } = useServers()
  const setOnboardingCompleted = useSetAtom(onboardingCompletedAtom)
  const [biometricLockEnabled, setBiometricLockEnabled] = useAtom(biometricLockEnabledAtom)
  const [backgroundNotificationsEnabled, setBackgroundNotificationsEnabled] = useAtom(
    backgroundNotificationsEnabledAtom,
  )

  const handleBiometricToggle = async (value: boolean) => {
    if (value) {
      const compatible = await LocalAuthentication.hasHardwareAsync()
      if (!compatible) {
        Alert.alert(
          t('settings.biometric.unavailable'),
          t('settings.biometric.unavailableMessage'),
        )
        return
      }
      const enrolled = await LocalAuthentication.isEnrolledAsync()
      if (!enrolled) {
        Alert.alert(t('settings.biometric.notEnrolled'), t('settings.biometric.notEnrolledMessage'))
        return
      }
      const result = await LocalAuthentication.authenticateAsync({
        promptMessage: t('settings.biometric.enablePrompt'),
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
        return t('settings.theme.light')
      case 'dark':
        return t('settings.theme.dark')
      case 'system':
        return t('settings.theme.system')
      default:
        return t('settings.theme.system')
    }
  }

  const handleThemeToggle = () => {
    const modes = ['light', 'dark', 'system'] as const
    const currentIndex = modes.indexOf(themeMode)
    const nextIndex = (currentIndex + 1) % modes.length
    setThemeMode(modes[nextIndex])
  }

  const handleLanguageToggle = () => {
    const currentIndex = supportedLanguages.indexOf(currentLanguage)
    const nextIndex = (currentIndex + 1) % supportedLanguages.length
    setLanguage(supportedLanguages[nextIndex])
  }

  const handleLogout = () => {
    Alert.alert(t('settings.logoutConfirmTitle'), t('settings.logoutConfirmMessage'), [
      {
        text: t('common.cancel'),
        style: 'cancel',
      },
      {
        text: t('settings.logout'),
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
    ])
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
      <ScreenHeader title={t('settings.title')} showClose />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Server list */}
        <Section
          title={t('settings.servers')}
          right={
            <TouchableOpacity onPress={() => router.push('/add-server')}>
              <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          }
        >
          {serversList.map((server, index) => {
            const isActive = server.id === currentServerId
            return (
              <View
                key={server.id}
                style={
                  isActive
                    ? {
                        backgroundColor: theme.colors.primary + '14',
                        borderRadius: theme.borderRadius.md,
                        marginHorizontal: -theme.spacing.sm,
                        paddingHorizontal: theme.spacing.sm,
                      }
                    : undefined
                }
              >
                <SettingRow
                  icon="server-outline"
                  iconColor={isActive ? theme.colors.primary : undefined}
                  label={server.name}
                  subtitle={server.url}
                  value={isActive ? 'Active' : undefined}
                  onPress={() => {
                    if (isActive) {
                      router.push(`/edit-server?id=${server.id}`)
                    } else {
                      switchToServer(server.id)
                    }
                  }}
                  showDivider={index < serversList.length - 1}
                />
              </View>
            )
          })}
          {serversList.length === 0 && (
            <SettingRow
              icon="server-outline"
              label={t('settings.noServersConfigured')}
              onPress={() => router.push('/add-server')}
              showDivider={false}
            />
          )}
        </Section>

        <View style={styles.spacer} />

        {/* Main settings group */}
        <Section showDivider>
          <SettingRow
            icon="settings-outline"
            label={t('settings.general')}
            onPress={handleThemeToggle}
            value={getThemeLabel()}
          />
          <SettingRow
            icon="color-palette-outline"
            label={t('settings.colors')}
            value={colorThemes[colorTheme].name}
            onPress={() => router.push('/colors')}
          />
          <SettingRow
            icon="scan-outline"
            label={t('settings.faceId')}
            switchValue={biometricLockEnabled}
            onSwitchChange={handleBiometricToggle}
          />
          <SettingRow
            icon="notifications-outline"
            label={t('settings.notifications')}
            switchValue={backgroundNotificationsEnabled}
            onSwitchChange={setBackgroundNotificationsEnabled}
          />
          <SettingRow
            icon="language-outline"
            label={t('settings.language')}
            value={currentLanguageName}
            onPress={handleLanguageToggle}
            showDivider={false}
          />
        </Section>

        {/* Content group */}
        <Section showDivider>
          <SettingRow
            icon="heart-outline"
            label={t('settings.favorites')}
            onPress={() => router.push('/favorites')}
          />
          <SettingRow
            icon="flash-outline"
            label={t('settings.triggers')}
            onPress={() => router.push('/triggers')}
            showDivider={false}
          />
        </Section>

        {/* Control group - only available for OpenClaw (Molt) servers */}
        {currentServer?.providerType === 'molt' && (
          <Section showDivider>
            <SettingRow
              icon="grid-outline"
              label={t('settings.overview')}
              onPress={() => router.push('/overview')}
            />
            <SettingRow
              icon="time-outline"
              label={t('settings.cronJobs')}
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
              label={t('settings.componentGallery')}
              onPress={() => router.push('/gallery')}
              showDivider={false}
            />
          </Section>
        )}

        {/* Logout */}
        <View style={styles.logoutSection}>
          <Button title={t('settings.logout')} variant="danger" size="lg" onPress={handleLogout} />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            {Constants.expoConfig?.name ?? 'Lumiere'} {Constants.expoConfig?.version ?? '1.0.0'} (
            {(Constants.expoConfig?.ios?.buildNumber ?? '1').slice(0, 5)})
          </Text>
          <Text style={styles.footerText}>With ♥ from Arturo, Mateo and Alonso</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
