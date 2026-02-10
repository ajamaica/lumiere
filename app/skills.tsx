import { useRouter } from 'expo-router'
import { useSetAtom } from 'jotai'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ActivityIndicator, Alert, ScrollView, StyleSheet, TextInput, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge, Button, Card, ScreenHeader, Section, StatCard, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { getClawHubSkillContent, searchClawHubSkills } from '../src/services/clawhub/api'
import { useMoltGateway } from '../src/services/molt'
import { ClawHubSkill, Skill } from '../src/services/molt/types'
import { pendingTriggerMessageAtom } from '../src/store/atoms'
import { useTheme } from '../src/theme'
import { logger } from '../src/utils/logger'

const skillsLogger = logger.create('Skills')

export default function SkillsScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { getProviderConfig, currentServerId, currentServer } = useServers()
  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)

  const [skills, setSkills] = useState<Skill[]>([])
  const [showTeachForm, setShowTeachForm] = useState(false)
  const [newSkillName, setNewSkillName] = useState('')
  const [newSkillDescription, setNewSkillDescription] = useState('')
  const [newSkillContent, setNewSkillContent] = useState('')
  const [teaching, setTeaching] = useState(false)

  const [clawHubQuery, setClawHubQuery] = useState('')
  const [clawHubResults, setClawHubResults] = useState<ClawHubSkill[]>([])
  const [clawHubSearching, setClawHubSearching] = useState(false)
  const [clawHubSearched, setClawHubSearched] = useState(false)
  const [installingSkill, setInstallingSkill] = useState<string | null>(null)
  const setPendingTriggerMessage = useSetAtom(pendingTriggerMessageAtom)

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  const { connected, connect, listSkills, teachSkill, removeSkill } = useMoltGateway({
    url: config?.url || '',
    token: config?.token || '',
  })

  useEffect(() => {
    if (config) {
      connect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  useEffect(() => {
    if (connected) {
      fetchSkills()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  const fetchSkills = async () => {
    try {
      const result = await listSkills()
      if (result?.skills) {
        setSkills(result.skills)
      }
    } catch (err) {
      skillsLogger.logError('Failed to fetch skills', err)
    }
  }

  const handleRefresh = async () => {
    await fetchSkills()
  }

  const handleTeachSkill = async () => {
    if (!newSkillName.trim() || !newSkillDescription.trim() || !newSkillContent.trim()) {
      Alert.alert(t('common.error'), t('skills.fillAllFields'))
      return
    }

    setTeaching(true)
    try {
      await teachSkill({
        name: newSkillName.trim(),
        description: newSkillDescription.trim(),
        content: newSkillContent.trim(),
      })
      setNewSkillName('')
      setNewSkillDescription('')
      setNewSkillContent('')
      setShowTeachForm(false)
      await fetchSkills()
    } catch (err) {
      skillsLogger.logError('Failed to teach skill', err)
      Alert.alert(t('common.error'), t('skills.teachError'))
    } finally {
      setTeaching(false)
    }
  }

  const handleRemoveSkill = async (skill: Skill) => {
    Alert.alert(t('skills.removeSkill'), t('skills.removeConfirm', { name: skill.name }), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            await removeSkill(skill.name)
            await fetchSkills()
          } catch (err) {
            skillsLogger.logError('Failed to remove skill', err)
            Alert.alert(t('common.error'), t('skills.removeError'))
          }
        },
      },
    ])
  }

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
      setPendingTriggerMessage(message)
      router.dismissAll()
    } catch (err) {
      skillsLogger.logError('Failed to install ClawHub skill', err)
      Alert.alert(t('common.error'), t('skills.clawHub.installError'))
    } finally {
      setInstallingSkill(null)
    }
  }

  const formatDateTime = (timestamp: number): string => {
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    })
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    statsRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    formContainer: {
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    input: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      color: theme.colors.text.primary,
      fontSize: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    contentInput: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      color: theme.colors.text.primary,
      fontSize: 14,
      borderWidth: 1,
      borderColor: theme.colors.border,
      minHeight: 120,
      textAlignVertical: 'top',
    },
    formActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
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
        <Section>
          <View style={styles.statsRow}>
            <StatCard label={t('skills.totalSkills')} value={skills.length} style={{ flex: 1 }} />
          </View>

          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <Button title={t('common.retry')} variant="secondary" onPress={handleRefresh} />
            <Button
              title={showTeachForm ? t('common.cancel') : t('skills.teachNew')}
              onPress={() => setShowTeachForm(!showTeachForm)}
            />
          </View>
        </Section>

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

        {showTeachForm && (
          <Section title={t('skills.teachSkill')}>
            <View style={styles.formContainer}>
              <TextInput
                style={styles.input}
                placeholder={t('skills.namePlaceholder')}
                placeholderTextColor={theme.colors.text.secondary}
                value={newSkillName}
                onChangeText={setNewSkillName}
                autoCapitalize="none"
              />
              <TextInput
                style={styles.input}
                placeholder={t('skills.descriptionPlaceholder')}
                placeholderTextColor={theme.colors.text.secondary}
                value={newSkillDescription}
                onChangeText={setNewSkillDescription}
              />
              <TextInput
                style={styles.contentInput}
                placeholder={t('skills.contentPlaceholder')}
                placeholderTextColor={theme.colors.text.secondary}
                value={newSkillContent}
                onChangeText={setNewSkillContent}
                multiline
              />
              <View style={styles.formActions}>
                <Button
                  title={teaching ? t('common.loading') : t('skills.teach')}
                  onPress={handleTeachSkill}
                  disabled={teaching}
                />
              </View>
            </View>
          </Section>
        )}

        <Section title={t('skills.skillsList')}>
          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.lg }}>
            {t('skills.skillsListDescription')}
          </Text>

          {skills.length === 0 ? (
            <Text color="secondary" center>
              {t('skills.noSkills')}
            </Text>
          ) : (
            skills.map((skill) => (
              <Card key={skill.name} style={{ marginBottom: theme.spacing.md }}>
                <Text variant="heading3" style={{ marginBottom: theme.spacing.xs }}>
                  {skill.name}
                </Text>
                <Text variant="bodySmall" color="secondary">
                  {skill.description}
                </Text>
                <Text
                  variant="caption"
                  color="tertiary"
                  style={{ marginTop: theme.spacing.xs }}
                  numberOfLines={3}
                >
                  {skill.content}
                </Text>
                <Text variant="caption" color="tertiary" style={{ marginTop: theme.spacing.xs }}>
                  {t('skills.created')}: {formatDateTime(skill.createdAtMs)}
                </Text>
                <Text variant="caption" color="tertiary">
                  {t('skills.updated')}: {formatDateTime(skill.updatedAtMs)}
                </Text>

                <View style={styles.badgeRow}>
                  <Badge label={skill.name} />
                </View>

                <View style={styles.skillActions}>
                  <Button
                    title={t('common.delete')}
                    variant="danger"
                    size="sm"
                    onPress={() => handleRemoveSkill(skill)}
                  />
                </View>
              </Card>
            ))
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
