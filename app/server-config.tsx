import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Switch,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge, Button, Card, ScreenHeader, Section, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { useOpenCrawGateway } from '../src/services/opencraw'
import {
  AgentDefaults,
  ChannelConfig,
  ServerConfig,
  ToolsConfig,
} from '../src/services/opencraw/types'
import { useTheme } from '../src/theme'
import { useContentContainerStyle } from '../src/utils/device'
import { logger } from '../src/utils/logger'

const configLogger = logger.create('ServerConfig')

type TabKey = 'agent-defaults' | 'tools-memory' | 'channels'

// ─── Option Constants ─────────────────────────────────────────────────────────

const THINKING_LEVELS = ['off', 'low', 'medium', 'high', 'xhigh'] as const
const VERBOSE_MODES = ['off', 'on', 'full'] as const
const ELEVATED_MODES = ['off', 'on', 'ask', 'full'] as const
const TOOL_PROFILES = ['default', 'minimal', 'full', 'custom'] as const
const MEMORY_BACKENDS = ['none', 'local', 'sqlite'] as const
const COMPACTION_MODES = ['off', 'auto', 'aggressive'] as const

const CHANNEL_LABELS: Record<string, string> = {
  telegram: 'Telegram',
  discord: 'Discord',
  slack: 'Slack',
  whatsapp: 'WhatsApp',
  matrix: 'Matrix',
  irc: 'IRC',
  email: 'Email',
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function setPath(
  obj: Record<string, unknown>,
  path: string,
  value: unknown,
): Record<string, unknown> {
  const keys = path.split('.')
  const result = { ...obj }
  let current: Record<string, unknown> = result
  for (let i = 0; i < keys.length - 1; i++) {
    const key = keys[i]
    current[key] = { ...(current[key] as Record<string, unknown>) }
    current = current[key] as Record<string, unknown>
  }
  current[keys[keys.length - 1]] = value
  return result
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function SettingsRow({
  label,
  hint,
  children,
  theme,
}: {
  label: string
  hint?: string
  children: React.ReactNode
  theme: ReturnType<typeof useTheme>['theme']
}) {
  return (
    <View style={{ marginBottom: theme.spacing.md }}>
      <Text variant="sectionTitle" style={{ marginBottom: theme.spacing.xs }}>
        {label}
      </Text>
      {hint && (
        <Text variant="caption" color="tertiary" style={{ marginBottom: theme.spacing.xs }}>
          {hint}
        </Text>
      )}
      {children}
    </View>
  )
}

function SettingsToggle({
  label,
  value,
  onValueChange,
  theme,
}: {
  label: string
  value: boolean
  onValueChange: (val: boolean) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  return (
    <View
      style={{
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: theme.spacing.sm,
      }}
    >
      <Text>{label}</Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: theme.colors.border, true: theme.colors.primary + '80' }}
        thumbColor={value ? theme.colors.primary : theme.colors.surface}
      />
    </View>
  )
}

function OptionPicker({
  options,
  value,
  onChange,
  theme,
}: {
  options: readonly string[]
  value: string | undefined
  onChange: (val: string) => void
  theme: ReturnType<typeof useTheme>['theme']
}) {
  return (
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: theme.spacing.xs }}>
      {options.map((opt) => (
        <TouchableOpacity
          key={opt}
          onPress={() => onChange(opt)}
          style={{
            paddingHorizontal: theme.spacing.md,
            paddingVertical: theme.spacing.xs,
            borderRadius: theme.borderRadius.sm,
            backgroundColor: value === opt ? theme.colors.primary : theme.colors.surface,
            borderWidth: 1,
            borderColor: value === opt ? theme.colors.primary : theme.colors.border,
          }}
        >
          <Text
            variant="bodySmall"
            style={{ color: value === opt ? theme.colors.text.inverse : theme.colors.text.primary }}
          >
            {opt}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  )
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ServerConfigScreen() {
  const { theme } = useTheme()
  const contentContainerStyle = useContentContainerStyle()
  const router = useRouter()
  const { t } = useTranslation()
  const { getProviderConfig, currentServerId, currentServer } = useServers()
  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)

  const [activeTab, setActiveTab] = useState<TabKey>('agent-defaults')
  const [originalConfig, setOriginalConfig] = useState<ServerConfig | null>(null)
  const [editedConfig, setEditedConfig] = useState<ServerConfig | null>(null)
  const [baseHash, setBaseHash] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  const { connected, connect, getServerConfig, patchServerConfig } = useOpenCrawGateway({
    url: config?.url || '',
    token: config?.token || '',
  })

  useEffect(() => {
    if (config) {
      connect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  const fetchConfig = useCallback(async () => {
    setLoading(true)
    try {
      const response = await getServerConfig()
      setOriginalConfig(response.config)
      setEditedConfig(JSON.parse(JSON.stringify(response.config)))
      setBaseHash(response.hash)
    } catch (err) {
      configLogger.logError('Failed to fetch config', err)
      Alert.alert(t('common.error'), t('serverConfig.fetchError'))
    } finally {
      setLoading(false)
    }
  }, [getServerConfig, t])

  useEffect(() => {
    if (connected) {
      fetchConfig()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  const isDirty = () => {
    return JSON.stringify(originalConfig) !== JSON.stringify(editedConfig)
  }

  const updateConfig = (path: string, value: unknown) => {
    if (!editedConfig) return
    setEditedConfig(setPath(editedConfig as Record<string, unknown>, path, value) as ServerConfig)
  }

  const handleSave = async () => {
    if (!editedConfig || !isDirty()) return
    setSaving(true)
    try {
      const patch = {} as Record<string, unknown>

      // Build minimal patch comparing original vs edited
      if (
        JSON.stringify(originalConfig?.agents?.defaults) !==
        JSON.stringify(editedConfig?.agents?.defaults)
      ) {
        if (!patch.agents) patch.agents = {}
        ;(patch.agents as Record<string, unknown>).defaults = editedConfig.agents?.defaults
      }
      if (JSON.stringify(originalConfig?.tools) !== JSON.stringify(editedConfig?.tools)) {
        patch.tools = editedConfig.tools
      }
      if (JSON.stringify(originalConfig?.channels) !== JSON.stringify(editedConfig?.channels)) {
        patch.channels = editedConfig.channels
      }

      await patchServerConfig({
        patch: JSON.stringify(patch),
        baseHash,
      })

      Alert.alert(t('common.success'), t('serverConfig.saveSuccess'))

      // Refresh after server restart
      setTimeout(() => fetchConfig(), 2000)
    } catch (err) {
      configLogger.logError('Failed to save config', err)
      Alert.alert(t('common.error'), t('serverConfig.saveError'))
    } finally {
      setSaving(false)
    }
  }

  const handleDiscard = () => {
    setEditedConfig(JSON.parse(JSON.stringify(originalConfig)))
  }

  const defaults: AgentDefaults = (editedConfig?.agents?.defaults as AgentDefaults) || {}
  const tools: ToolsConfig = (editedConfig?.tools as ToolsConfig) || {}
  const channels: Record<string, ChannelConfig> =
    (editedConfig?.channels as Record<string, ChannelConfig>) || {}

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
      paddingBottom: theme.spacing.xxxl,
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
      fontWeight: '600',
      color: theme.colors.text.secondary,
    },
    tabTextActive: {
      color: theme.colors.text.inverse,
    },
    saveBar: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      padding: theme.spacing.lg,
      borderTopWidth: 1,
      borderTopColor: theme.colors.border,
      backgroundColor: theme.colors.background,
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
  })

  // Guard: OpenCraw only
  if (currentServer?.providerType !== 'opencraw') {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('serverConfig.title')} showBack />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <Text variant="heading2" style={{ marginBottom: theme.spacing.md }}>
            {t('serverConfig.openClawOnly')}
          </Text>
          <Text color="secondary" center style={{ marginBottom: theme.spacing.xl }}>
            {t('serverConfig.openClawOnlyDescription')}
          </Text>
          <Button title={t('home.goToSettings')} onPress={() => router.push('/settings')} />
        </View>
      </SafeAreaView>
    )
  }

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('serverConfig.title')} showBack />
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

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('serverConfig.title')} showBack />
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
          <ActivityIndicator color={theme.colors.primary} />
          <Text color="secondary" style={{ marginTop: theme.spacing.md }}>
            {t('serverConfig.loadingConfig')}
          </Text>
        </View>
      </SafeAreaView>
    )
  }

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'agent-defaults', label: t('serverConfig.tabs.agentDefaults') },
    { key: 'tools-memory', label: t('serverConfig.tabs.toolsMemory') },
    { key: 'channels', label: t('serverConfig.tabs.channels') },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t('serverConfig.title')}
        subtitle={t('serverConfig.subtitle')}
        showBack
      />

      {/* Tab bar */}
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
        {/* Agent Defaults Tab */}
        {activeTab === 'agent-defaults' && (
          <>
            <Section title={t('serverConfig.agentDefaults.section')}>
              <Card>
                <SettingsRow label={t('serverConfig.agentDefaults.model')} theme={theme}>
                  <TextInput
                    style={styles.input}
                    value={defaults.model || ''}
                    onChangeText={(val) => updateConfig('agents.defaults.model', val)}
                    placeholder="claude-sonnet-4-5"
                    placeholderTextColor={theme.colors.text.secondary}
                    autoCapitalize="none"
                  />
                </SettingsRow>

                <SettingsRow label={t('serverConfig.agentDefaults.thinking')} theme={theme}>
                  <OptionPicker
                    options={THINKING_LEVELS}
                    value={defaults.thinking}
                    onChange={(val) => updateConfig('agents.defaults.thinking', val)}
                    theme={theme}
                  />
                </SettingsRow>

                <SettingsRow label={t('serverConfig.agentDefaults.verbose')} theme={theme}>
                  <OptionPicker
                    options={VERBOSE_MODES}
                    value={defaults.verbose}
                    onChange={(val) => updateConfig('agents.defaults.verbose', val)}
                    theme={theme}
                  />
                </SettingsRow>

                <SettingsRow label={t('serverConfig.agentDefaults.elevated')} theme={theme}>
                  <OptionPicker
                    options={ELEVATED_MODES}
                    value={defaults.elevated}
                    onChange={(val) => updateConfig('agents.defaults.elevated', val)}
                    theme={theme}
                  />
                </SettingsRow>

                <SettingsRow label={t('serverConfig.agentDefaults.compaction')} theme={theme}>
                  <OptionPicker
                    options={COMPACTION_MODES}
                    value={defaults.compaction}
                    onChange={(val) => updateConfig('agents.defaults.compaction', val)}
                    theme={theme}
                  />
                </SettingsRow>
              </Card>
            </Section>

            <Section title={t('serverConfig.agentDefaults.resources')}>
              <Card>
                <SettingsRow label={t('serverConfig.agentDefaults.maxTokens')} theme={theme}>
                  <TextInput
                    style={styles.input}
                    value={defaults.maxTokens != null ? String(defaults.maxTokens) : ''}
                    onChangeText={(val) =>
                      updateConfig('agents.defaults.maxTokens', val ? Number(val) : undefined)
                    }
                    placeholder="200000"
                    placeholderTextColor={theme.colors.text.secondary}
                    keyboardType="numeric"
                  />
                </SettingsRow>

                <SettingsRow label={t('serverConfig.agentDefaults.timeout')} theme={theme}>
                  <TextInput
                    style={styles.input}
                    value={defaults.timeout != null ? String(defaults.timeout) : ''}
                    onChangeText={(val) =>
                      updateConfig('agents.defaults.timeout', val ? Number(val) : undefined)
                    }
                    placeholder="300000"
                    placeholderTextColor={theme.colors.text.secondary}
                    keyboardType="numeric"
                  />
                </SettingsRow>

                <SettingsRow label={t('serverConfig.agentDefaults.concurrency')} theme={theme}>
                  <TextInput
                    style={styles.input}
                    value={defaults.concurrency != null ? String(defaults.concurrency) : ''}
                    onChangeText={(val) =>
                      updateConfig('agents.defaults.concurrency', val ? Number(val) : undefined)
                    }
                    placeholder="1"
                    placeholderTextColor={theme.colors.text.secondary}
                    keyboardType="numeric"
                  />
                </SettingsRow>
              </Card>
            </Section>
          </>
        )}

        {/* Tools & Memory Tab */}
        {activeTab === 'tools-memory' && (
          <>
            <Section title={t('serverConfig.toolsMemory.toolsSection')}>
              <Card>
                <SettingsRow label={t('serverConfig.toolsMemory.profile')} theme={theme}>
                  <OptionPicker
                    options={TOOL_PROFILES}
                    value={tools.profile}
                    onChange={(val) => updateConfig('tools.profile', val)}
                    theme={theme}
                  />
                </SettingsRow>

                <SettingsToggle
                  label={t('serverConfig.toolsMemory.webSearch')}
                  value={tools.webSearch ?? true}
                  onValueChange={(val) => updateConfig('tools.webSearch', val)}
                  theme={theme}
                />

                <SettingsToggle
                  label={t('serverConfig.toolsMemory.webFetch')}
                  value={tools.webFetch ?? true}
                  onValueChange={(val) => updateConfig('tools.webFetch', val)}
                  theme={theme}
                />

                <SettingsToggle
                  label={t('serverConfig.toolsMemory.codeExecution')}
                  value={tools.codeExecution ?? true}
                  onValueChange={(val) => updateConfig('tools.codeExecution', val)}
                  theme={theme}
                />

                <SettingsRow label={t('serverConfig.toolsMemory.elevatedAccess')} theme={theme}>
                  <OptionPicker
                    options={ELEVATED_MODES}
                    value={tools.elevated}
                    onChange={(val) => updateConfig('tools.elevated', val)}
                    theme={theme}
                  />
                </SettingsRow>
              </Card>
            </Section>

            <Section title={t('serverConfig.toolsMemory.memorySection')}>
              <Card>
                <SettingsRow label={t('serverConfig.toolsMemory.backend')} theme={theme}>
                  <OptionPicker
                    options={MEMORY_BACKENDS}
                    value={tools.memoryBackend}
                    onChange={(val) => updateConfig('tools.memoryBackend', val)}
                    theme={theme}
                  />
                </SettingsRow>

                <SettingsToggle
                  label={t('serverConfig.toolsMemory.citations')}
                  value={tools.citations ?? false}
                  onValueChange={(val) => updateConfig('tools.citations', val)}
                  theme={theme}
                />

                <SettingsToggle
                  label={t('serverConfig.toolsMemory.memorySearch')}
                  value={tools.memorySearch ?? false}
                  onValueChange={(val) => updateConfig('tools.memorySearch', val)}
                  theme={theme}
                />
              </Card>
            </Section>
          </>
        )}

        {/* Channels Tab */}
        {activeTab === 'channels' && (
          <Section title={t('serverConfig.channels.section')}>
            {Object.keys(channels).length === 0 ? (
              <Text color="secondary" center style={{ marginTop: theme.spacing.lg }}>
                {t('serverConfig.channels.noChannels')}
              </Text>
            ) : (
              Object.entries(channels).map(([channelKey, channelConfig]) => (
                <Card key={channelKey} style={{ marginBottom: theme.spacing.md }}>
                  <View
                    style={{
                      flexDirection: 'row',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: theme.spacing.sm,
                    }}
                  >
                    <Text variant="heading3">{CHANNEL_LABELS[channelKey] || channelKey}</Text>
                    <Badge
                      label={
                        channelConfig?.enabled
                          ? t('common.active')
                          : t('serverConfig.channels.disabled')
                      }
                      variant={channelConfig?.enabled ? 'success' : 'error'}
                    />
                  </View>

                  <SettingsToggle
                    label={t('serverConfig.channels.enabled')}
                    value={channelConfig?.enabled ?? false}
                    onValueChange={(val) => updateConfig(`channels.${channelKey}.enabled`, val)}
                    theme={theme}
                  />

                  {channelConfig?.dmPolicy && (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingVertical: theme.spacing.xs,
                      }}
                    >
                      <Text variant="bodySmall" color="secondary">
                        {t('serverConfig.channels.dmPolicy')}
                      </Text>
                      <Text variant="bodySmall">{channelConfig.dmPolicy}</Text>
                    </View>
                  )}

                  {channelConfig?.groupPolicy && (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingVertical: theme.spacing.xs,
                      }}
                    >
                      <Text variant="bodySmall" color="secondary">
                        {t('serverConfig.channels.groupPolicy')}
                      </Text>
                      <Text variant="bodySmall">{channelConfig.groupPolicy}</Text>
                    </View>
                  )}

                  {channelConfig?.historyLimit != null && (
                    <View
                      style={{
                        flexDirection: 'row',
                        justifyContent: 'space-between',
                        paddingVertical: theme.spacing.xs,
                      }}
                    >
                      <Text variant="bodySmall" color="secondary">
                        {t('serverConfig.channels.historyLimit')}
                      </Text>
                      <Text variant="bodySmall">{channelConfig.historyLimit}</Text>
                    </View>
                  )}
                </Card>
              ))
            )}
          </Section>
        )}
      </ScrollView>

      {/* Save bar */}
      {isDirty() && (
        <View style={styles.saveBar}>
          <Button
            title={t('serverConfig.discard')}
            variant="secondary"
            onPress={handleDiscard}
            style={{ flex: 1 }}
          />
          <Button
            title={t('serverConfig.saveAndRestart')}
            onPress={handleSave}
            loading={saving}
            style={{ flex: 1 }}
          />
        </View>
      )}
    </SafeAreaView>
  )
}
