import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, ScreenHeader, Section, SettingRow, Text } from '../src/components/ui'
import { DEFAULT_SESSION_KEY } from '../src/constants'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import {
  deleteSessionData,
  ProviderConfig,
  readSessionIndex,
  SessionIndexEntry,
} from '../src/services/providers'
import { ENABLE_WORKFLOW_MODE } from '../src/services/workflow'
import {
  clearMessagesAtom,
  currentSessionKeyAtom,
  sessionAliasesAtom,
  workflowConfigAtom,
} from '../src/store'
import { useTheme } from '../src/theme'
import { logger } from '../src/utils/logger'

const sessionsLogger = logger.create('Sessions')

interface Session {
  key: string
  lastActivity?: number
  messageCount?: number
}

export default function SessionsScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { getProviderConfig, currentServerId } = useServers()
  const [currentSessionKey, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [, setClearMessagesTrigger] = useAtom(clearMessagesAtom)
  const [sessionAliases, setSessionAliases] = useAtom(sessionAliasesAtom)
  const [workflowConfigs] = useAtom(workflowConfigAtom)
  const workflowEnabled = workflowConfigs[currentSessionKey]?.enabled ?? false
  const [config, setConfig] = useState<ProviderConfig | null>(null)

  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  // Molt provider uses server-side sessions via WebSocket gateway
  const isMoltProvider = config?.type === 'molt'

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  const { connected, connect, disconnect, listSessions, resetSession } = useMoltGateway({
    url: config?.url || '',
    token: config?.token || '',
  })

  useEffect(() => {
    if (config && isMoltProvider) {
      connect()
    } else if (config) {
      // For non-Molt providers, load sessions from the local index
      setLoading(false)
    }
    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, isMoltProvider])

  // Load sessions from Molt gateway (server-side sessions)
  const loadMoltSessions = useCallback(async () => {
    if (!connected || !isMoltProvider) return

    try {
      const sessionData = (await listSessions()) as { sessions?: Session[] }
      if (sessionData?.sessions && Array.isArray(sessionData.sessions)) {
        setSessions(sessionData.sessions)
      }
    } catch (err) {
      sessionsLogger.logError('Failed to fetch sessions', err)
    } finally {
      setLoading(false)
    }
  }, [connected, listSessions, isMoltProvider])

  // Load sessions from local session index (for non-Molt providers)
  const loadLocalSessions = useCallback(async () => {
    if (!config || isMoltProvider) return

    try {
      const entries: SessionIndexEntry[] = await readSessionIndex(config.serverId)
      const localSessions: Session[] = entries.map((entry) => ({
        key: entry.key,
        messageCount: entry.messageCount,
        lastActivity: entry.lastActivity,
      }))
      setSessions(localSessions)
    } catch (err) {
      sessionsLogger.logError('Failed to load local sessions', err)
    } finally {
      setLoading(false)
    }
  }, [config, isMoltProvider])

  useEffect(() => {
    if (isMoltProvider) {
      loadMoltSessions()
    } else {
      loadLocalSessions()
    }
  }, [loadMoltSessions, loadLocalSessions, isMoltProvider])

  const handleNewSession = () => {
    const newSessionKey = `agent:main:${Date.now()}`
    setCurrentSessionKey(newSessionKey)
    router.back()
  }

  const handleResetSession = (sessionKey: string) => {
    Alert.alert(t('sessions.resetConfirmTitle'), t('sessions.resetConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('sessions.reset'),
        style: 'destructive',
        onPress: async () => {
          try {
            // Only call server reset for Molt provider
            if (isMoltProvider) {
              await resetSession(sessionKey)
            }
            if (sessionKey === currentSessionKey) {
              setClearMessagesTrigger((prev) => prev + 1)
            }
          } catch (err) {
            sessionsLogger.logError('Failed to reset session', err)
          }
        },
      },
    ])
  }

  const handleDeleteSession = (sessionKey: string) => {
    Alert.alert(t('sessions.deleteConfirmTitle'), t('sessions.deleteConfirmMessage'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'),
        style: 'destructive',
        onPress: async () => {
          try {
            // For Molt, reset on the server side first
            if (isMoltProvider) {
              await resetSession(sessionKey)
            }

            // Delete local cache and session index entry
            await deleteSessionData(config?.serverId, sessionKey)

            // Remove alias if any
            const newAliases = { ...sessionAliases }
            delete newAliases[sessionKey]
            setSessionAliases(newAliases)

            // If deleting the current session, switch to default
            if (sessionKey === currentSessionKey) {
              setCurrentSessionKey(DEFAULT_SESSION_KEY)
              setClearMessagesTrigger((prev) => prev + 1)
            }

            // Refresh session list
            setSessions((prev) => prev.filter((s) => s.key !== sessionKey))
          } catch (err) {
            sessionsLogger.logError('Failed to delete session', err)
          }
        },
      },
    ])
  }

  const handleSelectSession = (sessionKey: string) => {
    setCurrentSessionKey(sessionKey)
    router.back()
  }

  const formatSessionKey = (key: string) => {
    if (sessionAliases[key]) return sessionAliases[key]
    const parts = key.split(':')
    return parts[parts.length - 1] || key
  }

  const handleEditSession = (sessionKey: string) => {
    router.push({ pathname: '/edit-session', params: { key: sessionKey } })
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
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    actionIcon: {
      marginRight: theme.spacing.sm,
    },
    actionText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
      flex: 1,
      fontWeight: theme.typography.fontWeight.medium,
    },
    sessionRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    sessionContent: {
      flex: 1,
    },
    sessionActions: {
      flexDirection: 'row',
      gap: theme.spacing.xs,
    },
    sessionActionButton: {
      padding: theme.spacing.xs,
    },
  })

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('sessions.title')} showClose />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <Text variant="heading2" style={{ marginBottom: theme.spacing.md }}>
            {t('sessions.noServerConfigured')}
          </Text>
          <Text color="secondary" center style={{ marginBottom: theme.spacing.xl }}>
            {t('sessions.noServerMessage')}
          </Text>
          <Button title={t('sessions.goToSettings')} onPress={() => router.push('/settings')} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('sessions.title')} showClose />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Current session info at top */}
        <Section>
          <SettingRow
            icon="chatbubble-outline"
            label={formatSessionKey(currentSessionKey)}
            subtitle={t('sessions.currentSession')}
            onPress={() => handleEditSession(currentSessionKey)}
            showDivider={false}
          />
        </Section>

        <View style={styles.spacer} />

        {/* Actions group */}
        <Section title={t('sessions.actions')}>
          <TouchableOpacity style={styles.actionButton} onPress={handleNewSession}>
            <Ionicons
              name="add-circle"
              size={22}
              color={theme.colors.primary}
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>{t('sessions.newSession')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleEditSession(currentSessionKey)}
          >
            <Ionicons
              name="create"
              size={22}
              color={theme.colors.primary}
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>{t('sessions.editSession')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => handleResetSession(currentSessionKey)}
          >
            <Ionicons
              name="refresh"
              size={22}
              color={theme.colors.primary}
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>{t('sessions.resetSession')}</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, { borderColor: '#EF4444' + '30' }]}
            onPress={() => handleDeleteSession(currentSessionKey)}
          >
            <Ionicons name="trash" size={22} color="#EF4444" style={styles.actionIcon} />
            <Text style={[styles.actionText, { color: '#EF4444' }]}>
              {t('sessions.deleteSession')}
            </Text>
          </TouchableOpacity>

          {ENABLE_WORKFLOW_MODE && (
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/workflow')}>
              <Ionicons
                name={workflowEnabled ? 'folder-open' : 'folder-open-outline'}
                size={22}
                color={workflowEnabled ? theme.colors.primary : theme.colors.text.secondary}
                style={styles.actionIcon}
              />
              <Text style={styles.actionText}>
                {t('settings.workflowMode')}
                {workflowEnabled ? ' (On)' : ''}
              </Text>
            </TouchableOpacity>
          )}
        </Section>

        {/* Available sessions */}
        <Section title={t('sessions.availableSessions')} showDivider>
          {loading ? (
            <SettingRow
              icon="hourglass-outline"
              label={t('sessions.loadingSessions')}
              showDivider={false}
            />
          ) : sessions.length > 0 ? (
            sessions.map((session, index) => {
              const isActive = session.key === currentSessionKey
              return (
                <View key={session.key} style={styles.sessionRow}>
                  <View style={styles.sessionContent}>
                    <SettingRow
                      icon={isActive ? 'checkmark-circle' : 'radio-button-off-outline'}
                      iconColor={isActive ? theme.colors.primary : undefined}
                      label={formatSessionKey(session.key)}
                      subtitle={
                        session.messageCount !== undefined
                          ? t('sessions.messagesCount', { count: session.messageCount })
                          : undefined
                      }
                      value={isActive ? t('common.active') : undefined}
                      onPress={() => handleSelectSession(session.key)}
                      showDivider={index < sessions.length - 1}
                    />
                  </View>
                  <View style={styles.sessionActions}>
                    <TouchableOpacity
                      style={styles.sessionActionButton}
                      onPress={() => handleEditSession(session.key)}
                      accessibilityLabel={t('sessions.editSession')}
                    >
                      <Ionicons name="create-outline" size={18} color={theme.colors.primary} />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sessionActionButton}
                      onPress={() => handleResetSession(session.key)}
                      accessibilityLabel={t('sessions.resetSession')}
                    >
                      <Ionicons
                        name="refresh-outline"
                        size={18}
                        color={theme.colors.text.secondary}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.sessionActionButton}
                      onPress={() => handleDeleteSession(session.key)}
                      accessibilityLabel={t('sessions.deleteSession')}
                    >
                      <Ionicons name="trash-outline" size={18} color="#EF4444" />
                    </TouchableOpacity>
                  </View>
                </View>
              )
            })
          ) : (
            <SettingRow
              icon="albums-outline"
              label={t('sessions.noSessions')}
              subtitle={t('sessions.noSessionsMessage')}
              showDivider={false}
            />
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
