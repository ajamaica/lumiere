import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useCallback, useEffect, useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'

import { ActionRow, Button, ScreenHeader, Section, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import { clearMessagesAtom, currentSessionKeyAtom } from '../src/store'
import { useTheme } from '../src/theme'

interface Session {
  key: string
  lastActivity?: number
  messageCount?: number
}

export default function SessionsScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { getProviderConfig } = useServers()
  const [currentSessionKey, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [, setClearMessagesTrigger] = useAtom(clearMessagesAtom)
  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)

  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig])

  const { connected, connect, disconnect, listSessions, resetSession } = useMoltGateway({
    url: config?.url || '',
    token: config?.token || '',
  })

  useEffect(() => {
    if (config) {
      connect()
    }
    return () => {
      disconnect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  const loadSessions = useCallback(async () => {
    if (!connected) return

    try {
      const sessionData = (await listSessions()) as { sessions?: Session[] }
      if (sessionData?.sessions && Array.isArray(sessionData.sessions)) {
        setSessions(sessionData.sessions)
      }
    } catch (err) {
      console.error('Failed to fetch sessions:', err)
    } finally {
      setLoading(false)
    }
  }, [connected, listSessions])

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
              await resetSession(currentSessionKey)
              // Trigger message clearing in ChatScreen
              setClearMessagesTrigger((prev) => prev + 1)
              router.back()
            } catch (err) {
              console.error('Failed to reset session:', err)
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
    const parts = key.split(':')
    return parts[parts.length - 1] || key
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    sessionItem: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    activeSession: {
      backgroundColor: theme.colors.primary + '20',
      borderWidth: 1,
      borderColor: theme.colors.primary,
    },
  })

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Sessions" showBack />
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
      <ScreenHeader title="Sessions" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section title="Actions">
          <ActionRow icon="add-circle-outline" label="New Session" onPress={handleNewSession} />
          <ActionRow
            icon="refresh-outline"
            label="Reset Current Session"
            onPress={handleResetSession}
          />
        </Section>

        <Section title="Available Sessions">
          {loading ? (
            <Text color="secondary" center>
              Loading sessions...
            </Text>
          ) : sessions.length > 0 ? (
            sessions.map((session) => {
              const isActive = session.key === currentSessionKey
              return (
                <TouchableOpacity
                  key={session.key}
                  style={[styles.sessionItem, isActive && styles.activeSession]}
                  onPress={() => handleSelectSession(session.key)}
                >
                  <View style={{ flex: 1 }}>
                    <Text variant="body">
                      {formatSessionKey(session.key)}
                      {isActive && ' (Active)'}
                    </Text>
                    {session.messageCount !== undefined && (
                      <Text variant="caption">{session.messageCount} messages</Text>
                    )}
                  </View>
                  <Ionicons
                    name={isActive ? 'checkmark-circle' : 'chevron-forward'}
                    size={20}
                    color={isActive ? theme.colors.primary : theme.colors.text.tertiary}
                  />
                </TouchableOpacity>
              )
            })
          ) : (
            <Text color="secondary" center>
              No sessions available
            </Text>
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
