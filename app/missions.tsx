import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { MissionCard } from '../src/components/missions/MissionCard'
import { Button, GradientButton, ScreenHeader, Text } from '../src/components/ui'
import { useMissions } from '../src/hooks/useMissions'
import { useServers } from '../src/hooks/useServers'
import { useTheme } from '../src/theme'

export default function MissionsScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { currentServer } = useServers()
  const { missionList, setActiveMissionId } = useMissions()

  const handleMissionPress = (missionId: string) => {
    setActiveMissionId(missionId)
    router.push('/mission-detail')
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: theme.spacing.xxxl,
      paddingHorizontal: theme.spacing.xl,
    },
    emptyIconCircle: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: theme.colors.primary + '15',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: theme.spacing.lg,
    },
  })

  if (currentServer?.providerType !== 'molt') {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('missions.title')} showBack />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <Text variant="heading2" style={{ marginBottom: theme.spacing.md }}>
            {t('missions.openClawOnly')}
          </Text>
          <Text color="secondary" center style={{ marginBottom: theme.spacing.xl }}>
            {t('missions.openClawOnlyDescription')}
          </Text>
          <Button title={t('home.goToSettings')} onPress={() => router.push('/settings')} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('missions.title')} subtitle={t('missions.subtitle')} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <GradientButton
          title={t('missions.createMission')}
          onPress={() => router.push('/create-mission')}
          icon={<Ionicons name="rocket" size={18} color="#FFFFFF" />}
          style={{ marginBottom: theme.spacing.lg }}
        />

        {missionList.length === 0 ? (
          <View style={styles.emptyState}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="rocket-outline" size={36} color={theme.colors.primary} />
            </View>
            <Text
              variant="heading3"
              center
              style={{ marginBottom: theme.spacing.sm, color: theme.colors.text.primary }}
            >
              {t('missions.empty')}
            </Text>
            <Text variant="body" color="secondary" center>
              {t('missions.emptyDescription')}
            </Text>
          </View>
        ) : (
          missionList.map((mission) => (
            <MissionCard
              key={mission.id}
              mission={mission}
              onPress={() => handleMissionPress(mission.id)}
            />
          ))
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
