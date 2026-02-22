import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { MissionCard } from '../src/components/missions/MissionCard'
import { EmptyState, GradientButton, ScreenHeader, Text } from '../src/components/ui'
import { useMissionList } from '../src/hooks/useMissionList'
import { useServers } from '../src/hooks/useServers'
import { useTheme } from '../src/theme'
import { useContentContainerStyle } from '../src/utils/device'

type MissionFilter = 'all' | 'active' | 'archived'

export default function MissionsScreen() {
  const { theme } = useTheme()
  const contentContainerStyle = useContentContainerStyle()
  const router = useRouter()
  const { t } = useTranslation()
  const { currentServer } = useServers()
  const { missionList, setActiveMissionId } = useMissionList()
  const [filter, setFilter] = useState<MissionFilter>('all')

  const filteredMissions = useMemo(() => {
    switch (filter) {
      case 'active':
        return missionList.filter((m) => m.status !== 'archived')
      case 'archived':
        return missionList.filter((m) => m.status === 'archived')
      default:
        return missionList
    }
  }, [missionList, filter])

  const handleMissionPress = (missionId: string) => {
    setActiveMissionId(missionId)
    router.push('/mission-detail')
  }

  const filters: { key: MissionFilter; label: string }[] = [
    { key: 'all', label: t('missions.filterAll') },
    { key: 'active', label: t('missions.filterActive') },
    { key: 'archived', label: t('missions.filterArchived') },
  ]

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
    },
    filterRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.lg,
    },
    filterChip: {
      paddingVertical: theme.spacing.xs,
      paddingHorizontal: theme.spacing.md,
      borderRadius: theme.borderRadius.full,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.surface,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary,
      borderColor: theme.colors.primary,
    },
  })

  if (currentServer?.providerType !== 'opencraw') {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('missions.title')} showBack />
        <EmptyState
          icon="rocket-outline"
          title={t('missions.openClawOnly')}
          description={t('missions.openClawOnlyDescription')}
          action={{
            title: t('home.goToSettings'),
            onPress: () => router.push('/settings'),
          }}
          style={{ flex: 1 }}
        />
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('missions.title')} subtitle={t('missions.subtitle')} showBack />

      <ScrollView contentContainerStyle={[styles.scrollContent, contentContainerStyle]}>
        <GradientButton
          title={t('missions.createMission')}
          onPress={() => router.push('/create-mission')}
          icon={<Ionicons name="rocket" size={18} color={theme.colors.text.inverse} />}
          style={{ marginBottom: theme.spacing.lg }}
        />

        <View style={styles.filterRow}>
          {filters.map((f) => (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, filter === f.key && styles.filterChipActive]}
              onPress={() => setFilter(f.key)}
              accessibilityRole="button"
              accessibilityState={{ selected: filter === f.key }}
            >
              <Text
                variant="caption"
                style={{
                  color: filter === f.key ? theme.colors.text.inverse : theme.colors.text.secondary,
                  fontWeight: filter === f.key ? '600' : '400',
                }}
              >
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {filteredMissions.length === 0 ? (
          <EmptyState
            icon={filter === 'archived' ? 'archive-outline' : 'rocket-outline'}
            title={filter === 'archived' ? t('missions.emptyArchived') : t('missions.empty')}
            description={
              filter === 'archived'
                ? t('missions.emptyArchivedDescription')
                : t('missions.emptyDescription')
            }
          />
        ) : (
          filteredMissions.map((mission) => (
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
