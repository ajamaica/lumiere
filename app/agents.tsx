import { Ionicons } from '@expo/vector-icons'
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

import { Badge, Button, Card, ScreenHeader, Section, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import {
  AgentConfig,
  AgentIdentity,
  AgentInfo,
  ConfigGetResponse,
} from '../src/services/molt/types'
import { useTheme } from '../src/theme'
import { logger } from '../src/utils/logger'

const agentsLogger = logger.create('Agents')

type ViewMode = 'dashboard' | 'detail' | 'create'

function resolveModel(model: AgentConfig['model']): string {
  if (!model) return 'Default'
  if (typeof model === 'string') return model
  return model.primary ?? 'Default'
}

export default function AgentsScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { getProviderConfig, currentServerId, currentServer } = useServers()
  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)

  const [viewMode, setViewMode] = useState<ViewMode>('dashboard')
  const [agents, setAgents] = useState<AgentInfo[]>([])
  const [selectedAgent, setSelectedAgent] = useState<string | null>(null)
  const [serverConfigData, setServerConfigData] = useState<ConfigGetResponse | null>(null)
  const [loading, setLoading] = useState(false)

  // Create agent form state
  const [newAgentName, setNewAgentName] = useState('')
  const [newAgentWorkspace, setNewAgentWorkspace] = useState('')
  const [newAgentModel, setNewAgentModel] = useState('')
  const [newAgentEmoji, setNewAgentEmoji] = useState('')
  const [creating, setCreating] = useState(false)

  // Detail edit state
  const [editingName, setEditingName] = useState(false)
  const [nameValue, setNameValue] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  const { connected, connect, getServerConfig, patchServerConfig, health } = useMoltGateway({
    url: config?.url || '',
    token: config?.token || '',
  })

  useEffect(() => {
    if (config) {
      connect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  const fetchAgents = useCallback(async () => {
    setLoading(true)
    try {
      const configResponse = await getServerConfig()
      setServerConfigData(configResponse)

      const agentsList: AgentInfo[] = []
      const agentsMap = configResponse?.config?.agents?.list

      if (agentsMap && typeof agentsMap === 'object') {
        for (const [id, agentConfig] of Object.entries(agentsMap)) {
          const identity = (agentConfig as AgentConfig)?.identity
          const model = resolveModel((agentConfig as AgentConfig)?.model)

          // Check health status for this agent
          const agentHealth = health?.agents?.[id]

          agentsList.push({
            id,
            model,
            workspace: (agentConfig as AgentConfig)?.workspace,
            thinking: (agentConfig as AgentConfig)?.thinking,
            timeout: (agentConfig as AgentConfig)?.timeout,
            identity: identity as AgentIdentity | undefined,
            sessionCount: 0,
            isStreaming: false,
            activeTools: agentHealth?.available ? [] : undefined,
          })
        }
      }

      // If no agents found in config, add at least the main agent
      if (agentsList.length === 0) {
        agentsList.push({
          id: 'main',
          model: 'Default',
          identity: { name: 'Main', emoji: undefined },
        })
      }

      setAgents(agentsList)
    } catch (err) {
      agentsLogger.logError('Failed to fetch agents', err)
    } finally {
      setLoading(false)
    }
  }, [getServerConfig, health])

  useEffect(() => {
    if (connected) {
      fetchAgents()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  const handleSelectAgent = (agentId: string) => {
    setSelectedAgent(agentId)
    const agent = agents.find((a) => a.id === agentId)
    setNameValue(agent?.identity?.name ?? agentId)
    setViewMode('detail')
  }

  const handleBack = () => {
    if (viewMode === 'detail' || viewMode === 'create') {
      setViewMode('dashboard')
      setSelectedAgent(null)
      setShowDeleteConfirm(false)
      setEditingName(false)
    }
  }

  const handleCreateAgent = async () => {
    if (!newAgentName.trim() || !newAgentWorkspace.trim()) {
      Alert.alert(t('common.error'), t('agentManagement.errors.nameWorkspaceRequired'))
      return
    }

    setCreating(true)
    try {
      const configResponse = await getServerConfig()
      const currentConfig = configResponse.config
      const agentId = newAgentName
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64)

      // Build the patch
      const agentPatch: Record<string, unknown> = {
        workspace: newAgentWorkspace.trim(),
      }
      if (newAgentModel.trim()) {
        agentPatch.model = newAgentModel.trim()
      }
      if (newAgentEmoji.trim()) {
        agentPatch.identity = { emoji: newAgentEmoji.trim(), name: newAgentName.trim() }
      } else {
        agentPatch.identity = { name: newAgentName.trim() }
      }

      const updatedAgentsList = {
        ...(currentConfig?.agents?.list || {}),
        [agentId]: agentPatch,
      }

      const patch = {
        agents: {
          ...currentConfig?.agents,
          list: updatedAgentsList,
        },
      }

      await patchServerConfig({
        patch: JSON.stringify(patch),
        baseHash: configResponse.hash,
      })

      Alert.alert(t('common.success'), t('agentManagement.createSuccess', { name: newAgentName }))
      setNewAgentName('')
      setNewAgentWorkspace('')
      setNewAgentModel('')
      setNewAgentEmoji('')
      setViewMode('dashboard')

      // Refresh agents after server restart
      setTimeout(() => fetchAgents(), 2000)
    } catch (err) {
      agentsLogger.logError('Failed to create agent', err)
      Alert.alert(t('common.error'), t('agentManagement.createError'))
    } finally {
      setCreating(false)
    }
  }

  const handleSaveName = async () => {
    if (!selectedAgent || !serverConfigData) return
    setSavingName(true)
    try {
      const configResponse = await getServerConfig()
      const currentConfig = configResponse.config
      const currentAgent = currentConfig?.agents?.list?.[selectedAgent] || {}

      const updatedAgent = {
        ...currentAgent,
        identity: {
          ...(currentAgent as AgentConfig).identity,
          name: nameValue.trim(),
        },
      }

      const updatedAgentsList = {
        ...(currentConfig?.agents?.list || {}),
        [selectedAgent]: updatedAgent,
      }

      const patch = {
        agents: {
          ...currentConfig?.agents,
          list: updatedAgentsList,
        },
      }

      await patchServerConfig({
        patch: JSON.stringify(patch),
        baseHash: configResponse.hash,
      })

      setEditingName(false)
      setTimeout(() => fetchAgents(), 2000)
    } catch (err) {
      agentsLogger.logError('Failed to save name', err)
      Alert.alert(t('common.error'), t('agentManagement.saveError'))
    } finally {
      setSavingName(false)
    }
  }

  const handleDeleteAgent = async () => {
    if (!selectedAgent || selectedAgent === 'main') return
    setDeleting(true)
    try {
      const configResponse = await getServerConfig()
      const currentConfig = configResponse.config
      const updatedAgentsList = { ...(currentConfig?.agents?.list || {}) }
      delete updatedAgentsList[selectedAgent]

      const patch = {
        agents: {
          ...currentConfig?.agents,
          list: updatedAgentsList,
        },
      }

      await patchServerConfig({
        patch: JSON.stringify(patch),
        baseHash: configResponse.hash,
      })

      Alert.alert(t('common.success'), t('agentManagement.deleteSuccess'))
      setViewMode('dashboard')
      setSelectedAgent(null)
      setShowDeleteConfirm(false)
      setTimeout(() => fetchAgents(), 2000)
    } catch (err) {
      agentsLogger.logError('Failed to delete agent', err)
      Alert.alert(t('common.error'), t('agentManagement.deleteError'))
    } finally {
      setDeleting(false)
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
    agentGrid: {
      gap: theme.spacing.md,
    },
    agentTile: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.md,
    },
    agentAvatar: {
      width: 48,
      height: 48,
      borderRadius: 24,
      backgroundColor: theme.colors.surface,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderColor: theme.colors.border,
    },
    agentAvatarActive: {
      borderColor: theme.colors.status.success,
    },
    agentInfo: {
      flex: 1,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    formField: {
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
    nameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    detailRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    detailRowLast: {
      borderBottomWidth: 0,
    },
    dangerZone: {
      marginTop: theme.spacing.xl,
      paddingTop: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.status.error + '33',
    },
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.md,
    },
  })

  // Guard: Molt only
  if (currentServer?.providerType !== 'molt') {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('agentManagement.title')} showBack />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <Text variant="heading2" style={{ marginBottom: theme.spacing.md }}>
            {t('agentManagement.openClawOnly')}
          </Text>
          <Text color="secondary" center style={{ marginBottom: theme.spacing.xl }}>
            {t('agentManagement.openClawOnlyDescription')}
          </Text>
          <Button title={t('home.goToSettings')} onPress={() => router.push('/settings')} />
        </View>
      </SafeAreaView>
    )
  }

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('agentManagement.title')} showBack />
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

  // ─── Create Agent View ──────────────────────────────────────────────────────
  if (viewMode === 'create') {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('agentManagement.createAgent')} showBack onBack={handleBack} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          <Section>
            <View style={styles.formField}>
              <Text variant="sectionTitle" style={{ marginBottom: theme.spacing.xs }}>
                {t('agentManagement.agentName')} *
              </Text>
              <TextInput
                style={styles.input}
                value={newAgentName}
                onChangeText={setNewAgentName}
                placeholder={t('agentManagement.agentNamePlaceholder')}
                placeholderTextColor={theme.colors.text.secondary}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formField}>
              <Text variant="sectionTitle" style={{ marginBottom: theme.spacing.xs }}>
                {t('agentManagement.workspace')} *
              </Text>
              <TextInput
                style={styles.input}
                value={newAgentWorkspace}
                onChangeText={setNewAgentWorkspace}
                placeholder={t('agentManagement.workspacePlaceholder')}
                placeholderTextColor={theme.colors.text.secondary}
                autoCapitalize="none"
              />
              <Text variant="caption" color="tertiary" style={{ marginTop: theme.spacing.xs }}>
                {t('agentManagement.workspaceHint')}
              </Text>
            </View>

            <View style={styles.formField}>
              <Text variant="sectionTitle" style={{ marginBottom: theme.spacing.xs }}>
                {t('agentManagement.model')}
              </Text>
              <TextInput
                style={styles.input}
                value={newAgentModel}
                onChangeText={setNewAgentModel}
                placeholder={t('agentManagement.modelPlaceholder')}
                placeholderTextColor={theme.colors.text.secondary}
                autoCapitalize="none"
              />
            </View>

            <View style={styles.formField}>
              <Text variant="sectionTitle" style={{ marginBottom: theme.spacing.xs }}>
                {t('agentManagement.emoji')}
              </Text>
              <TextInput
                style={[styles.input, { width: 80 }]}
                value={newAgentEmoji}
                onChangeText={(text) => setNewAgentEmoji(text.slice(0, 4))}
                placeholder="🤖"
                placeholderTextColor={theme.colors.text.secondary}
                maxLength={4}
              />
            </View>

            <View
              style={{ flexDirection: 'row', gap: theme.spacing.sm, marginTop: theme.spacing.md }}
            >
              <Button
                title={t('common.cancel')}
                variant="secondary"
                onPress={handleBack}
                style={{ flex: 1 }}
              />
              <Button
                title={t('agentManagement.createAgent')}
                onPress={handleCreateAgent}
                loading={creating}
                disabled={!newAgentName.trim() || !newAgentWorkspace.trim() || creating}
                style={{ flex: 1 }}
              />
            </View>
          </Section>
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ─── Agent Detail View ──────────────────────────────────────────────────────
  if (viewMode === 'detail' && selectedAgent) {
    const agent = agents.find((a) => a.id === selectedAgent)
    if (!agent) {
      setViewMode('dashboard')
      return null
    }

    const agentHealth = health?.agents?.[selectedAgent]
    const statusColor = agentHealth?.available
      ? theme.colors.status.success
      : theme.colors.text.secondary

    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('agentManagement.agentDetail')} showBack onBack={handleBack} />
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Profile */}
          <Section title={t('agentManagement.profile')}>
            <Card>
              <View style={{ alignItems: 'center', marginBottom: theme.spacing.lg }}>
                <View
                  style={[
                    styles.agentAvatar,
                    {
                      width: 72,
                      height: 72,
                      borderRadius: 36,
                      borderColor: statusColor,
                    },
                  ]}
                >
                  <Text style={{ fontSize: 32 }}>{agent.identity?.emoji || '🤖'}</Text>
                </View>

                {editingName ? (
                  <View style={[styles.nameRow, { marginTop: theme.spacing.md }]}>
                    <TextInput
                      style={[styles.input, { flex: 1 }]}
                      value={nameValue}
                      onChangeText={setNameValue}
                      autoFocus
                      onSubmitEditing={handleSaveName}
                    />
                    <TouchableOpacity onPress={handleSaveName} disabled={savingName}>
                      <Ionicons
                        name="checkmark-circle"
                        size={28}
                        color={theme.colors.status.success}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingName(false)}>
                      <Ionicons name="close-circle" size={28} color={theme.colors.text.secondary} />
                    </TouchableOpacity>
                  </View>
                ) : (
                  <TouchableOpacity
                    onPress={() => setEditingName(true)}
                    style={[styles.nameRow, { marginTop: theme.spacing.md }]}
                  >
                    <Text variant="heading2">{agent.identity?.name || agent.id}</Text>
                    <Ionicons name="pencil-outline" size={16} color={theme.colors.text.secondary} />
                  </TouchableOpacity>
                )}

                <Text variant="caption" color="tertiary" style={{ marginTop: theme.spacing.xs }}>
                  ID: {agent.id}
                </Text>
              </View>
            </Card>
          </Section>

          {/* Configuration */}
          <Section title={t('agentManagement.configuration')}>
            <Card>
              <View style={styles.detailRow}>
                <Text variant="sectionTitle">{t('agentManagement.model')}</Text>
                <Text variant="mono" color="secondary">
                  {agent.model || 'Default'}
                </Text>
              </View>
              {agent.thinking && (
                <View style={styles.detailRow}>
                  <Text variant="sectionTitle">{t('agentManagement.thinking')}</Text>
                  <Badge label={agent.thinking} />
                </View>
              )}
              {agent.timeout != null && (
                <View style={styles.detailRow}>
                  <Text variant="sectionTitle">{t('agentManagement.timeout')}</Text>
                  <Text variant="mono" color="secondary">
                    {agent.timeout}ms
                  </Text>
                </View>
              )}
              <View style={[styles.detailRow, styles.detailRowLast]}>
                <Text variant="sectionTitle">{t('agentManagement.status')}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                  <View style={[styles.statusDot, { backgroundColor: statusColor }]} />
                  <Text color="secondary">
                    {agentHealth?.available ? t('agents.available') : t('agents.unavailable')}
                  </Text>
                </View>
              </View>
            </Card>
          </Section>

          {/* Workspace */}
          {agent.workspace && (
            <Section title={t('agentManagement.workspace')}>
              <Card>
                <Text variant="mono" color="secondary">
                  {agent.workspace}
                </Text>
              </Card>
            </Section>
          )}

          {/* Danger Zone */}
          {selectedAgent !== 'main' && (
            <View style={styles.dangerZone}>
              <Text
                variant="sectionTitle"
                style={{
                  color: theme.colors.status.error,
                  marginBottom: theme.spacing.md,
                }}
              >
                {t('agentManagement.dangerZone')}
              </Text>
              {showDeleteConfirm ? (
                <Card
                  style={{
                    borderWidth: 1,
                    borderColor: theme.colors.status.error + '55',
                  }}
                >
                  <Text style={{ marginBottom: theme.spacing.md }}>
                    {t('agentManagement.deleteConfirm', { name: agent.identity?.name || agent.id })}
                  </Text>
                  <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
                    <Button
                      title={t('common.cancel')}
                      variant="secondary"
                      onPress={() => setShowDeleteConfirm(false)}
                      style={{ flex: 1 }}
                    />
                    <Button
                      title={t('common.delete')}
                      variant="danger"
                      onPress={handleDeleteAgent}
                      loading={deleting}
                      style={{ flex: 1 }}
                    />
                  </View>
                </Card>
              ) : (
                <Button
                  title={t('agentManagement.deleteAgent')}
                  variant="danger"
                  onPress={() => setShowDeleteConfirm(true)}
                />
              )}
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    )
  }

  // ─── Dashboard View ─────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t('agentManagement.title')}
        subtitle={t('agentManagement.subtitle')}
        showBack
      />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.headerRow}>
          <Text variant="bodySmall" color="secondary">
            {t('agentManagement.agentCount', { count: agents.length })}
          </Text>
          <View style={{ flexDirection: 'row', gap: theme.spacing.sm }}>
            <TouchableOpacity onPress={fetchAgents} disabled={loading}>
              <Ionicons
                name="refresh-outline"
                size={20}
                color={loading ? theme.colors.text.tertiary : theme.colors.primary}
              />
            </TouchableOpacity>
            <TouchableOpacity onPress={() => setViewMode('create')}>
              <Ionicons name="add-circle-outline" size={20} color={theme.colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {loading && agents.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: theme.spacing.xxl }}>
            <ActivityIndicator color={theme.colors.primary} />
            <Text color="secondary" style={{ marginTop: theme.spacing.md }}>
              {t('agentManagement.loading')}
            </Text>
          </View>
        ) : agents.length === 0 ? (
          <View style={{ alignItems: 'center', marginTop: theme.spacing.xxl }}>
            <Ionicons name="people-outline" size={48} color={theme.colors.text.tertiary} />
            <Text color="secondary" center style={{ marginTop: theme.spacing.md }}>
              {t('agentManagement.noAgents')}
            </Text>
          </View>
        ) : (
          <View style={styles.agentGrid}>
            {agents.map((agent) => {
              const agentHealth = health?.agents?.[agent.id]
              const isAvailable = agentHealth?.available ?? true

              return (
                <TouchableOpacity key={agent.id} onPress={() => handleSelectAgent(agent.id)}>
                  <Card>
                    <View style={styles.agentTile}>
                      <View style={[styles.agentAvatar, isAvailable && styles.agentAvatarActive]}>
                        <Text style={{ fontSize: 24 }}>{agent.identity?.emoji || '🤖'}</Text>
                      </View>

                      <View style={styles.agentInfo}>
                        <Text variant="heading3">{agent.identity?.name || agent.id}</Text>
                        <Text variant="caption" color="tertiary">
                          {agent.model || 'Default'}
                        </Text>
                        {agent.thinking && (
                          <Badge label={`thinking: ${agent.thinking}`} variant="info" />
                        )}
                      </View>

                      <View
                        style={[
                          styles.statusDot,
                          {
                            backgroundColor: isAvailable
                              ? theme.colors.status.success
                              : theme.colors.text.secondary,
                          },
                        ]}
                      />
                    </View>
                  </Card>
                </TouchableOpacity>
              )
            })}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
