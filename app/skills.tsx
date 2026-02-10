import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, Card, ScreenHeader, Section, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { getClawHubSkillContent, searchClawHubSkills } from '../src/services/clawhub/api'
import { useMoltGateway } from '../src/services/molt'
import { ClawHubSkill } from '../src/services/molt/types'
import { useTheme } from '../src/theme'
import { logger } from '../src/utils/logger'

const skillsLogger = logger.create('Skills')

export default function SkillsScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { getProviderConfig, currentServerId, currentServer } = useServers()
  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)

  const [clawHubQuery, setClawHubQuery] = useState('')
  const [clawHubResults, setClawHubResults] = useState<ClawHubSkill[]>([])
  const [clawHubSearching, setClawHubSearching] = useState(false)
  const [clawHubSearched, setClawHubSearched] = useState(false)
  const [installingSkill, setInstallingSkill] = useState<string | null>(null)

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  const { connect, sendAgentRequest } = useMoltGateway({
    url: config?.url || '',
    token: config?.token || '',
  })

  useEffect(() => {
    if (config) {
      connect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  const handleClawHubSearch = async () => {
    if (!clawHubQuery.trim()) return

    setClawHubSearching(true)
    setClawHubSearched(false)
    try {
      const results = await searchClawHubSkills(clawHubQuery.trim())
      setClawHubResults(
        results.map((r) => ({
          slug: r.slug,
          name: r.name,
          description: r.description,
          content: r.content,
        })),
      )
      setClawHubSearched(true)
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

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('skills.title')} subtitle={t('skills.subtitle')} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title={t('skills.clawHub.title')}>
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
            <Card key={skill.name} style={{ marginTop: theme.spacing.md }}>
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
        </Section>

      </ScrollView>
    </SafeAreaView>
  )
}
