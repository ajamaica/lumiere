import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Button, ScreenHeader, Section, SettingRow, Text } from '../src/components/ui'
import { DEFAULT_SESSION_KEY } from '../src/constants'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import { ProviderConfig } from '../src/services/providers'
import { clearMessagesAtom, currentSessionKeyAtom, sessionAliasesAtom } from '../src/store'
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
  const [config, setConfig] = useState<ProviderConfig | null>(null)

  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  // Only molt provider supports server-side sessions
  const supportsServerSessions = config?.type === 'molt'

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
    // Only connect to gateway if provider supports server sessions
    if (config && supportsServerSessions) {
      connect()
    } else if (config) {
      // For providers without server sessions, mark loading as done immediately
      setLoading(false)
    }
    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config, supportsServerSessions])

  const loadSessions = useCallback(async () => {
    // Only load sessions for providers that support server-side sessions
    if (!connected || !supportsServerSessions) return

    try {
      const sessionData = (await listSessions()) as { sessions?: Session[] }
      if (sessionData?.sessions && Array.isArray(sessionData.sessions)) {
        setSessions(sessionData.sessions)

        // If current session is the default and sessions exist, use the most recent one
        if (currentSessionKey === DEFAULT_SESSION_KEY && sessionData.sessions.length > 0) {
          const sortedSessions = [...sessionData.sessions].sort(
            (a, b) => (b.lastActivity || 0) - (a.lastActivity || 0),
          )
          setCurrentSessionKey(sortedSessions[0].key)
        }
      }
    } catch (err) {
      sessionsLogger.logError('Failed to fetch sessions', err)
    } finally {
      setLoading(false)
    }
  }, [connected, listSessions, supportsServerSessions, currentSessionKey, setCurrentSessionKey])

  useEffect(() => {
    loadSessions()
  }, [loadSessions])

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
              // Only call server reset for providers that support server sessions
              if (supportsServerSessions) {
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
        </Section>

        {/* Available sessions group - only shown for providers with server sessions */}
        {supportsServerSessions && (
          <Section showDivider>
            {loading ? (
              <SettingRow
                icon="hourglass-outline"
                label="Loading sessions..."
                showDivider={false}
              />
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
              <SettingRow icon="albums-outline" label="No sessions available" showDivider={false} />
            )}
          </Section>
        )}
      </ScrollView>
    </SafeAreaView>
  )
}
