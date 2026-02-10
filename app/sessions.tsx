import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, ScreenHeader, Section, SettingRow, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import { ProviderConfig, readSessionIndex, SessionIndexEntry } from '../src/services/providers'
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
  const { getProviderConfig, currentServerId } = useServers()
  const [currentSessionKey, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [, setClearMessagesTrigger] = useAtom(clearMessagesAtom)
  const [sessionAliases] = useAtom(sessionAliasesAtom)
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

  const handleResetSession = () => {
    Alert.alert(
      'Reset Session',
      'Are you sure you want to reset the current session? This will clear all message history.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Reset',
          style: 'destructive',
          onPress: async () => {
            try {
              // Only call server reset for Molt provider
              if (isMoltProvider) {
                await resetSession(currentSessionKey)
              }
              setClearMessagesTrigger((prev) => prev + 1)
              router.back()
            } catch (err) {
              sessionsLogger.logError('Failed to reset session', err)
            }
          },
        },
      ],
    )
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
  })

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Sessions" showClose />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <Text variant="heading2" style={{ marginBottom: theme.spacing.md }}>
            No Server Configured
          </Text>
          <Text color="secondary" center style={{ marginBottom: theme.spacing.xl }}>
            Please add a server in Settings to get started.
          </Text>
          <Button title="Go to Settings" onPress={() => router.push('/settings')} />
        </View>
      </SafeAreaView>
    )
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Sessions" showClose />
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Current session info at top */}
        <Section>
          <SettingRow
            icon="chatbubble-outline"
            label={formatSessionKey(currentSessionKey)}
            subtitle="Current session"
            onPress={() => handleEditSession(currentSessionKey)}
            showDivider={false}
          />
        </Section>

        <View style={styles.spacer} />

        {/* Actions group */}
        <Section title="Actions">
          <TouchableOpacity style={styles.actionButton} onPress={handleNewSession}>
            <Ionicons
              name="add-circle"
              size={22}
              color={theme.colors.primary}
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>New Session</Text>
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
            <Text style={styles.actionText}>Edit Session</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleResetSession}>
            <Ionicons
              name="refresh"
              size={22}
              color={theme.colors.primary}
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>Reset Current Session</Text>
          </TouchableOpacity>

          {ENABLE_WORKFLOW_MODE && (
            <TouchableOpacity style={styles.actionButton} onPress={() => router.push('/workflow')}>
              <Ionicons
                name={workflowEnabled ? 'folder-open' : 'folder-open-outline'}
                size={22}
                color={workflowEnabled ? theme.colors.primary : theme.colors.text.secondary}
                style={styles.actionIcon}
              />
              <Text style={styles.actionText}>Workflow Mode{workflowEnabled ? ' (On)' : ''}</Text>
            </TouchableOpacity>
          )}
        </Section>

        {/* Available sessions - shown for all providers */}
        <Section showDivider>
          {loading ? (
            <SettingRow icon="hourglass-outline" label="Loading sessions..." showDivider={false} />
          ) : sessions.length > 0 ? (
            sessions.map((session, index) => {
              const isActive = session.key === currentSessionKey
              return (
                <SettingRow
                  key={session.key}
                  icon={isActive ? 'checkmark-circle' : 'radio-button-off-outline'}
                  iconColor={isActive ? theme.colors.primary : undefined}
                  label={formatSessionKey(session.key)}
                  subtitle={
                    session.messageCount !== undefined
                      ? `${session.messageCount} messages`
                      : undefined
                  }
                  value={isActive ? 'Active' : undefined}
                  onPress={() => handleSelectSession(session.key)}
                  showDivider={index < sessions.length - 1}
                />
              )
            })
          ) : (
            <SettingRow
              icon="albums-outline"
              label="No sessions yet"
              subtitle="Send a message to start your first session"
              showDivider={false}
            />
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
