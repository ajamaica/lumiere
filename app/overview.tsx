import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useEffect, useState } from 'react'
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { useMoltGateway } from '../src/services/molt'
import { currentSessionKeyAtom, gatewayTokenAtom, gatewayUrlAtom } from '../src/store'
import { useTheme } from '../src/theme'

export default function OverviewScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const [gatewayUrl] = useAtom(gatewayUrlAtom)
  const [gatewayToken] = useAtom(gatewayTokenAtom)
  const [currentSessionKey] = useAtom(currentSessionKeyAtom)
  const [password, setPassword] = useState('')
  const [uptime, setUptime] = useState(0)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [connectedAt, setConnectedAt] = useState<Date | null>(null)
  const [instanceCount, setInstanceCount] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)

  const { connected, connecting, error, snapshot, connect, refreshHealth, listSessions } =
    useMoltGateway({
      url: gatewayUrl,
      token: gatewayToken,
    })

  useEffect(() => {
    connect()
  }, [])

  // Update resource counts from snapshot
  useEffect(() => {
    if (snapshot) {
      console.log('Gateway snapshot data:', snapshot)
      // Get instances count from presence array
      if (snapshot.presence) {
        setInstanceCount(snapshot.presence.length)
      }
      // Get sessions count from health.sessions.count
      if (snapshot.health?.sessions?.count !== undefined) {
        setSessionCount(snapshot.health.sessions.count)
      }
    }
  }, [snapshot])

  // Fetch resource counts when connected (fallback if not in snapshot)
  useEffect(() => {
    const fetchResourceCounts = async () => {
      if (!connected) return

      try {
        // Fetch session count from API if not in snapshot
        if (!snapshot?.health?.sessions?.count) {
          const sessionsData = await listSessions()
          if (sessionsData && Array.isArray((sessionsData as any).sessions)) {
            setSessionCount((sessionsData as any).sessions.length)
          }
        }
      } catch (err) {
        console.error('Failed to fetch resource counts:', err)
      }
    }

    // Add a small delay to ensure WebSocket is fully ready
    const timer = setTimeout(fetchResourceCounts, 1000)
    return () => clearTimeout(timer)
  }, [connected, listSessions, snapshot])

  useEffect(() => {
    if (connected && !connectedAt) {
      setConnectedAt(new Date())
    } else if (!connected) {
      setConnectedAt(null)
      setUptime(0)
    }
  }, [connected])

  useEffect(() => {
    if (!connected || !connectedAt) return

    const interval = setInterval(() => {
      const now = Date.now()
      const elapsed = Math.floor((now - connectedAt.getTime()) / 1000)
      setUptime(elapsed)
    }, 1000)

    return () => clearInterval(interval)
  }, [connected, connectedAt])

  const handleConnect = async () => {
    try {
      await connect()
    } catch (err) {
      console.error('Failed to connect:', err)
    }
  }

  const handleRefresh = async () => {
    try {
      await refreshHealth()
      setLastRefresh(new Date())

      // Also refresh resource counts
      const sessionsData = await listSessions()
      if (sessionsData && Array.isArray((sessionsData as any).sessions)) {
        setSessionCount((sessionsData as any).sessions.length)
      }
    } catch (err) {
      console.error('Failed to refresh:', err)
    }
  }

  const formatUptime = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m`
    return `${Math.floor(seconds / 3600)}h`
  }

  const formatTimeSince = (date: Date | null): string => {
    if (!date) return 'Never'
    const seconds = Math.floor((Date.now() - date.getTime()) / 1000)
    if (seconds < 60) return 'Just now'
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`
    return `${Math.floor(seconds / 86400)}d ago`
  }

  const getStatusColor = () => {
    if (connected) return theme.colors.status.success
    if (error) return theme.colors.status.error
    if (connecting) return theme.colors.status.warning
    return theme.colors.text.secondary
  }

  const getStatusText = () => {
    if (connected) return 'Connected'
    if (error) return 'Error'
    if (connecting) return 'Connecting...'
    return 'Disconnected'
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
    card: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    fieldGroup: {
      marginBottom: theme.spacing.md,
    },
    fieldLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    fieldValue: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fontFamily.monospace,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    input: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fontFamily.monospace,
      padding: theme.spacing.sm,
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    buttonRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    button: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      padding: theme.spacing.md,
      backgroundColor: theme.colors.primary,
      borderRadius: theme.borderRadius.md,
    },
    buttonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.inverse,
      marginLeft: theme.spacing.xs,
    },
    statRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
    },
    statRowLast: {
      borderBottomWidth: 0,
    },
    statLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fontFamily.monospace,
    },
    infoText: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.md,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
    },
    statCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },
    statCardLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.xs,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statCardValue: {
      fontSize: theme.typography.fontSize.xxxl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    statCardDescription: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      lineHeight: theme.typography.fontSize.sm * theme.typography.lineHeight.normal,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <Text style={styles.title}>Overview</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gateway Access</Text>
          <View style={styles.card}>
            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>WebSocket URL</Text>
              <Text style={styles.fieldValue} numberOfLines={1} ellipsizeMode="middle">
                {gatewayUrl}
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Gateway Token</Text>
              <Text style={styles.fieldValue} numberOfLines={1} ellipsizeMode="middle">
                {gatewayToken}
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Password</Text>
              <TextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password (not functional)"
                placeholderTextColor={theme.colors.text.tertiary}
                secureTextEntry
              />
            </View>

            <View style={styles.fieldGroup}>
              <Text style={styles.fieldLabel}>Default Session Key</Text>
              <Text style={styles.fieldValue} numberOfLines={1} ellipsizeMode="middle">
                {currentSessionKey || 'Not set'}
              </Text>
            </View>

            <View style={styles.buttonRow}>
              <TouchableOpacity style={styles.button} onPress={handleConnect}>
                <Ionicons name="link-outline" size={20} color={theme.colors.text.inverse} />
                <Text style={styles.buttonText}>Connect</Text>
              </TouchableOpacity>

              <TouchableOpacity style={styles.button} onPress={handleRefresh}>
                <Ionicons name="refresh-outline" size={20} color={theme.colors.text.inverse} />
                <Text style={styles.buttonText}>Refresh</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Snapshot</Text>
          <View style={styles.card}>
            <View style={styles.statRow}>
              <Text style={styles.statLabel}>STATUS</Text>
              <Text style={[styles.statValue, { color: getStatusColor() }]}>
                {getStatusText()}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>UPTIME</Text>
              <Text style={styles.statValue}>
                {connected ? formatUptime(uptime) : 'n/a'}
              </Text>
            </View>

            <View style={styles.statRow}>
              <Text style={styles.statLabel}>TICK INTERVAL</Text>
              <Text style={styles.statValue}>
                {snapshot?.tickInterval ? `${snapshot.tickInterval}ms` : 'n/a'}
              </Text>
            </View>

            <View style={[styles.statRow, styles.statRowLast]}>
              <Text style={styles.statLabel}>LAST CHANNELS REFRESH</Text>
              <Text style={styles.statValue}>{formatTimeSince(lastRefresh)}</Text>
            </View>

            <Text style={styles.infoText}>
              Channel integrations provide real-time communication with various services. Use the
              Refresh button to update channel status information.
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Resources</Text>

          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>INSTANCES</Text>
            <Text style={styles.statCardValue}>{instanceCount}</Text>
            <Text style={styles.statCardDescription}>Presence beacons in the last 5 minutes.</Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>SESSIONS</Text>
            <Text style={styles.statCardValue}>{sessionCount}</Text>
            <Text style={styles.statCardDescription}>
              Recent session keys tracked by the gateway.
            </Text>
          </View>

          <View style={styles.statCard}>
            <Text style={styles.statCardLabel}>CRON</Text>
            <Text style={styles.statCardValue}>Enabled</Text>
            <Text style={styles.statCardDescription}>Next wake n/a</Text>
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
