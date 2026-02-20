import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge, Button, Card, ScreenHeader, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import {
  getClawHubSkillContent,
  getClawHubSkillDetail,
  searchClawHubSkills,
} from '../src/services/clawhub/api'
import { useMoltGateway } from '../src/services/molt'
import { ClawHubSkill, InstalledSkill } from '../src/services/molt/types'
import { useTheme } from '../src/theme'
import { useContentContainerStyle } from '../src/utils/device'
import { logger } from '../src/utils/logger'

const skillsLogger = logger.create('Skills')

type TabKey = 'installed' | 'clawhub'

export default function SkillsScreen() {
  const { theme } = useTheme()
  const contentContainerStyle = useContentContainerStyle()
  const router = useRouter()
  const { t } = useTranslation()
  const { getProviderConfig, currentServerId, currentServer } = useServers()
  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)
  const [activeTab, setActiveTab] = useState<TabKey>('installed')

  const [clawHubQuery, setClawHubQuery] = useState('')
  const [clawHubResults, setClawHubResults] = useState<ClawHubSkill[]>([])
  const [clawHubSearching, setClawHubSearching] = useState(false)
  const [clawHubSearched, setClawHubSearched] = useState(false)
  const [installingSkill, setInstallingSkill] = useState<string | null>(null)

  const [installedSkills, setInstalledSkills] = useState<InstalledSkill[]>([])
  const [installedLoading, setInstalledLoading] = useState(false)
  const [installedLoaded, setInstalledLoaded] = useState(false)

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  const [togglingSkill, setTogglingSkill] = useState<string | null>(null)

  const { connect, connected, sendAgentRequest, getSkillsStatus, enableSkill, disableSkill } =
    useMoltGateway({
      url: config?.url || '',
      token: config?.token || '',
    })

  useEffect(() => {
    if (config) {
      connect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  const fetchInstalledSkills = useCallback(async () => {
    setInstalledLoading(true)
    try {
      const response = await getSkillsStatus()
      setInstalledSkills(response.skills)
      setInstalledLoaded(true)
    } catch (err) {
      skillsLogger.logError('Failed to fetch installed skills', err)
    } finally {
      setInstalledLoading(false)
    }
  }, [getSkillsStatus])

  useEffect(() => {
    if (connected && !installedLoaded) {
      fetchInstalledSkills()
    }
  }, [connected, installedLoaded, fetchInstalledSkills])

  const handleToggleSkill = useCallback(
    async (skill: InstalledSkill) => {
      const name = skill.key ?? skill.name
      setTogglingSkill(name)
      try {
        if (skill.enabled) {
          await disableSkill(name)
        } else {
          await enableSkill(name)
        }
        await fetchInstalledSkills()
      } catch (err) {
        skillsLogger.logError('Failed to toggle skill', err)
        Alert.alert(t('common.error'), t('skills.installed.toggleError'))
      } finally {
        setTogglingSkill(null)
      }
    },
    [disableSkill, enableSkill, fetchInstalledSkills, t],
  )

  const handleClawHubSearch = async () => {
    if (!clawHubQuery.trim()) return

    setClawHubSearching(true)
    setClawHubSearched(false)
    try {
      const results = await searchClawHubSkills(clawHubQuery.trim())
      const initialResults = results.map((r) => ({
        slug: r.slug,
        name: r.name,
        description: r.description,
        content: r.content,
        author: r.author,
        installs: r.installs,
      }))
      setClawHubResults(initialResults)
      setClawHubSearched(true)

      // Enrich results with detail data (author, installs) in the background
      for (const skill of initialResults) {
        getClawHubSkillDetail(skill.slug)
          .then((detail) => {
            setClawHubResults((prev) =>
              prev.map((s) =>
                s.slug === skill.slug
                  ? {
                      ...s,
                      author: detail.owner?.displayName || detail.owner?.handle || s.author,
                      installs: detail.skill.stats?.installs ?? s.installs,
                    }
                  : s,
              ),
            )
          })
          .catch((err) => {
            skillsLogger.logError(`Failed to fetch detail for ${skill.slug}`, err)
          })
      }
    } catch (err) {
      skillsLogger.logError('ClawHub search failed', err)
      Alert.alert(t('common.error'), t('skills.clawHub.searchError'))
    } finally {
      setClawHubSearching(false)
    }
  }

  const handleInstallClawHubSkill = async (skill: ClawHubSkill) => {
    setInstallingSkill(skill.name)
    try {
      const content = await getClawHubSkillContent(skill.slug)
      const message = t('skills.clawHub.installMessage', {
        name: skill.name,
        description: skill.description,
        content,
      })
      await sendAgentRequest({
        message,
        idempotencyKey: `clawhub-install-${skill.slug}-${Date.now()}`,
      })
      Alert.alert(t('common.success'), t('skills.clawHub.installSuccess', { name: skill.name }))
    } catch (err) {
      skillsLogger.logError('Failed to install ClawHub skill', err)
      Alert.alert(t('common.error'), t('skills.clawHub.installError'))
    } finally {
      setInstallingSkill(null)
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    skillActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    searchRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      alignItems: 'center',
    },
    searchInput: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      color: theme.colors.text.primary,
      fontSize: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    clawHubMeta: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginTop: theme.spacing.xs,
    },
    skillHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.xs,
    },
    skillBadges: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
    },
    skillTriggers: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
    },
    triggerChip: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: 2,
    },
    tabs: {
      flexDirection: 'row',
      paddingHorizontal: theme.spacing.lg,
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md,
    },
    tab: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      backgroundColor: theme.colors.surface,
    },
    tabActive: {
      backgroundColor: theme.colors.primary,
    },
    tabText: {
      fontSize: 13,
      fontWeight: '600' as const,
      color: theme.colors.text.secondary,
    },
    tabTextActive: {
      color: theme.colors.text.inverse,
    },
  })

  if (currentServer?.providerType !== 'molt') {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('skills.title')} showBack />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <Text variant="heading2" style={{ marginBottom: theme.spacing.md }}>
            {t('skills.openClawOnly')}
          </Text>
          <Text color="secondary" center style={{ marginBottom: theme.spacing.xl }}>
            {t('skills.openClawOnlyDescription')}
          </Text>
          <Button title={t('home.goToSettings')} onPress={() => router.push('/settings')} />
        </View>
      </SafeAreaView>
    )
  }

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('skills.title')} showBack />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <Text variant="heading2" style={{ marginBottom: theme.spacing.md }}>
            {t('home.noServerConfigured')}
          </Text>
          <Text color="secondary" center style={{ marginBottom: theme.spacing.xl }}>
            {t('home.noServerMessage')}
          </Text>
          <Button title={t('home.goToSettings')} onPress={() => router.push('/settings')} />
        </View>
      </SafeAreaView>
    )
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'installed', label: t('skills.installed.title') },
    { key: 'clawhub', label: t('skills.clawHub.title') },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('skills.title')} subtitle={t('skills.subtitle')} showBack />

      <View style={styles.tabs}>
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tab, activeTab === tab.key && styles.tabActive]}
            onPress={() => setActiveTab(tab.key)}
          >
            <Text style={[styles.tabText, activeTab === tab.key && styles.tabTextActive]}>
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView contentContainerStyle={[styles.scrollContent, contentContainerStyle]}>
        {activeTab === 'installed' && (
          <>
            <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.md }}>
              {t('skills.installed.description')}
            </Text>

            {installedLoading && (
              <View style={{ alignItems: 'center', marginTop: theme.spacing.lg }}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            )}

            {installedLoaded && !installedLoading && installedSkills.length === 0 && (
              <Text color="secondary" center style={{ marginTop: theme.spacing.lg }}>
                {t('skills.installed.noSkills')}
              </Text>
            )}

            {installedSkills.map((skill) => (
              <Card key={skill.key ?? skill.name} style={{ marginTop: theme.spacing.md }}>
                <View style={styles.skillHeader}>
                  {skill.emoji && <Text variant="heading3">{skill.emoji}</Text>}
                  <Text variant="heading3">{skill.name}</Text>
                </View>
                {skill.description && (
                  <Text variant="bodySmall" color="secondary">
                    {skill.description}
                  </Text>
                )}
                <View style={styles.skillBadges}>
                  <Badge
                    label={
                      skill.enabled ? t('skills.installed.enabled') : t('skills.installed.disabled')
                    }
                    variant={skill.enabled ? 'success' : 'default'}
                  />
                  {skill.bundled && <Badge label={t('skills.installed.bundled')} variant="info" />}
                  {skill.source && <Badge label={skill.source} variant="primary" />}
                </View>
                {skill.triggers && skill.triggers.length > 0 && (
                  <View style={styles.skillTriggers}>
                    {skill.triggers.map((trigger) => (
                      <View key={trigger} style={styles.triggerChip}>
                        <Text variant="caption" color="tertiary">
                          {trigger}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}
                <Button
                  title={
                    togglingSkill === (skill.key ?? skill.name)
                      ? t('common.loading')
                      : skill.enabled
                        ? t('skills.installed.disable')
                        : t('skills.installed.enable')
                  }
                  variant={skill.enabled ? 'secondary' : 'primary'}
                  size="sm"
                  onPress={() => handleToggleSkill(skill)}
                  disabled={togglingSkill === (skill.key ?? skill.name)}
                  style={{ marginTop: theme.spacing.md, alignSelf: 'flex-start' }}
                />
              </Card>
            ))}

            {installedLoaded && (
              <Button
                title={t('skills.installed.refresh')}
                variant="secondary"
                size="sm"
                onPress={fetchInstalledSkills}
                style={{ marginTop: theme.spacing.md, alignSelf: 'flex-start' }}
              />
            )}
          </>
        )}

        {activeTab === 'clawhub' && (
          <>
            <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.md }}>
              {t('skills.clawHub.description')}
            </Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                placeholder={t('skills.clawHub.searchPlaceholder')}
                placeholderTextColor={theme.colors.text.secondary}
                value={clawHubQuery}
                onChangeText={setClawHubQuery}
                onSubmitEditing={handleClawHubSearch}
                returnKeyType="search"
                autoCapitalize="none"
              />
              <Button
                title={t('skills.clawHub.search')}
                onPress={handleClawHubSearch}
                disabled={clawHubSearching || !clawHubQuery.trim()}
              />
            </View>

            {clawHubSearching && (
              <View style={{ alignItems: 'center', marginTop: theme.spacing.lg }}>
                <ActivityIndicator color={theme.colors.primary} />
              </View>
            )}

            {clawHubSearched && !clawHubSearching && clawHubResults.length === 0 && (
              <Text color="secondary" center style={{ marginTop: theme.spacing.lg }}>
                {t('skills.clawHub.noResults')}
              </Text>
            )}

            {clawHubResults.map((skill) => (
              <Card key={skill.slug} style={{ marginTop: theme.spacing.md }}>
                <Text variant="heading3" style={{ marginBottom: theme.spacing.xs }}>
                  {skill.name}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {skill.description}
                </Text>
                <View style={styles.clawHubMeta}>
                  {skill.author && (
                    <Text variant="caption" color="tertiary">
                      {t('skills.clawHub.author')}: {skill.author}
                    </Text>
                  )}
                  {skill.installs != null && (
                    <Text variant="caption" color="tertiary">
                      {t('skills.clawHub.installs')}: {skill.installs}
                    </Text>
                  )}
                </View>
                <View style={styles.skillActions}>
                  <Button
                    title={
                      installingSkill === skill.name
                        ? t('common.loading')
                        : t('skills.clawHub.install')
                    }
                    size="sm"
                    onPress={() => handleInstallClawHubSkill(skill)}
                    disabled={installingSkill === skill.name}
                  />
                </View>
              </Card>
            ))}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
