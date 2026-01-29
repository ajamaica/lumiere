import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useEffect, useState } from 'react'
import {
  Alert,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native'

import { useMoltGateway } from '../src/services/molt'
import { currentSessionKeyAtom, gatewayTokenAtom, gatewayUrlAtom } from '../src/store'
import { useTheme } from '../src/theme'

interface Session {
  key: string
  lastActivity?: number
  messageCount?: number
}

export default function SessionsScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const [gatewayUrl] = useAtom(gatewayUrlAtom)
  const [gatewayToken] = useAtom(gatewayTokenAtom)
  const [currentSessionKey, setCurrentSessionKey] = useAtom(currentSessionKeyAtom)
  const [sessions, setSessions] = useState<Session[]>([])
  const [loading, setLoading] = useState(true)

  const { connect, disconnect, listSessions, resetSession } = useMoltGateway({
    url: gatewayUrl,
    token: gatewayToken,
  })

  useEffect(() => {
    const loadSessions = async () => {
      await connect()
      try {
        const sessionData = await listSessions()
        if (sessionData && Array.isArray((sessionData as any).sessions)) {
          setSessions((sessionData as any).sessions)
        }
      } catch (err) {
        console.error('Failed to fetch sessions:', err)
      } finally {
        setLoading(false)
      }
    }

    loadSessions()
    return () => {
      disconnect()
    }
  }, [])

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

  const formatDate = (timestamp?: number) => {
    if (!timestamp) return ''
    const date = new Date(timestamp)
    return date.toLocaleString()
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.lg,
      paddingTop: theme.spacing.xl * 1.5,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    backButton: {
      marginRight: theme.spacing.md,
    },
    title: {
      fontSize: theme.typography.fontSize.xxl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.md,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    actionButton: {
      flexDirection: 'row',
      alignItems: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      marginBottom: theme.spacing.sm,
    },
    actionIcon: {
      marginRight: theme.spacing.md,
    },
    actionText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      flex: 1,
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
    sessionText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.primary,
      flex: 1,
    },
    sessionMeta: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: 2,
    },
    emptyText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
      textAlign: 'center',
      padding: theme.spacing.lg,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Sessions</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Actions</Text>

          <TouchableOpacity style={styles.actionButton} onPress={handleNewSession}>
            <Ionicons
              name="add-circle-outline"
              size={24}
              color={theme.colors.primary}
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>New Session</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton} onPress={handleResetSession}>
            <Ionicons
              name="refresh-outline"
              size={24}
              color={theme.colors.primary}
              style={styles.actionIcon}
            />
            <Text style={styles.actionText}>Reset Current Session</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Sessions</Text>
          {loading ? (
            <Text style={styles.emptyText}>Loading sessions...</Text>
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
                    <Text style={styles.sessionText}>
                      {formatSessionKey(session.key)}
                      {isActive && ' (Active)'}
                    </Text>
                    {session.messageCount !== undefined && (
                      <Text style={styles.sessionMeta}>{session.messageCount} messages</Text>
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
            <Text style={styles.emptyText}>No sessions available</Text>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
