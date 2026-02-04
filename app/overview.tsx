import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import {
  SafeAreaView,
  ScrollView,
  StyleSheet,
  TextInput as RNTextInput,
  TouchableOpacity,
  View,
} from 'react-native'

import { Button, Card, ScreenHeader, Section, StatCard, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import { useTheme } from '../src/theme'

export default function OverviewScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { getProviderConfig, currentServerId } = useServers()
  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)

  const [password, setPassword] = useState('')
  const [uptime, setUptime] = useState(0)
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null)
  const [connectedAt, setConnectedAt] = useState<Date | null>(null)
  const [instanceCount, setInstanceCount] = useState(0)
  const [sessionCount, setSessionCount] = useState(0)
  const [showSecrets, setShowSecrets] = useState(false)

  const { connected, connecting, error, snapshot, connect, refreshHealth, listSessions } =
    useMoltGateway({
      url: config?.url || '',
      token: config?.token || '',
    })

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  useEffect(() => {
    if (config) {
      connect()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [config])

  useEffect(() => {
    if (snapshot) {
      if (snapshot.presence) {
        setInstanceCount(snapshot.presence.length)
      }
      if (snapshot.health?.sessions?.count !== undefined) {
        setSessionCount(snapshot.health.sessions.count)
      }
    }
  }, [snapshot])

  useEffect(() => {
    const fetchResourceCounts = async () => {
      if (!connected) return

      try {
        if (!snapshot?.health?.sessions?.count) {
          const sessionsData = (await listSessions()) as { sessions?: unknown[] }
          if (sessionsData?.sessions && Array.isArray(sessionsData.sessions)) {
            setSessionCount(sessionsData.sessions.length)
          }
        }
      } catch (err) {
        console.error('Failed to fetch resource counts:', err)
      }
    }

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      const sessionsData = (await listSessions()) as { sessions?: unknown[] }
      if (sessionsData?.sessions && Array.isArray(sessionsData.sessions)) {
        setSessionCount(sessionsData.sessions.length)
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

  const maskSecret = (value: string) => {
    if (showSecrets || !value) return value
    return '\u2022'.repeat(Math.min(value.length, 32))
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    fieldGroup: {
      marginBottom: theme.spacing.md,
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
    statValue: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
      fontFamily: theme.typography.fontFamily.monospace,
    },
    resourceGap: {
      marginBottom: theme.spacing.md,
    },
  })

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Overview" showBack />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.xl,
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

  const { url: gatewayUrl, token: gatewayToken } = config

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title="Overview" showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section
          title="Gateway Access"
          right={
            <TouchableOpacity onPress={() => setShowSecrets(!showSecrets)}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs }}>
                <Ionicons
                  name={showSecrets ? 'eye-off-outline' : 'eye-outline'}
                  size={16}
                  color={theme.colors.primary}
                />
                <Text
                  variant="caption"
                  style={{
                    color: theme.colors.primary,
                    fontWeight: theme.typography.fontWeight.semibold,
                  }}
                >
                  {showSecrets ? 'Hide' : 'Show'}
                </Text>
              </View>
            </TouchableOpacity>
          }
        >
          <Card>
            <View style={styles.fieldGroup}>
              <Text variant="sectionTitle" style={{ marginBottom: theme.spacing.xs }}>
                WebSocket URL
              </Text>
              <Text style={styles.fieldValue} numberOfLines={1} ellipsizeMode="middle">
                {maskSecret(gatewayUrl)}
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text variant="sectionTitle" style={{ marginBottom: theme.spacing.xs }}>
                Gateway Token
              </Text>
              <Text style={styles.fieldValue} numberOfLines={1} ellipsizeMode="middle">
                {maskSecret(gatewayToken)}
              </Text>
            </View>

            <View style={styles.fieldGroup}>
              <Text variant="sectionTitle" style={{ marginBottom: theme.spacing.xs }}>
                Password
              </Text>
              <RNTextInput
                style={styles.input}
                value={password}
                onChangeText={setPassword}
                placeholder="Enter password (not functional)"
                placeholderTextColor={theme.colors.text.tertiary}
                secureTextEntry={!showSecrets}
              />
            </View>

            <View style={styles.buttonRow}>
              <Button
                title="Connect"
                style={{ flex: 1 }}
                onPress={handleConnect}
                icon={<Ionicons name="link-outline" size={20} color={theme.colors.text.inverse} />}
              />
              <Button
                title="Refresh"
                style={{ flex: 1 }}
                onPress={handleRefresh}
                icon={
                  <Ionicons name="refresh-outline" size={20} color={theme.colors.text.inverse} />
                }
              />
            </View>
          </Card>
        </Section>

        <Section title="Snapshot">
          <Card>
            <View style={styles.statRow}>
              <Text variant="sectionTitle">STATUS</Text>
              <Text style={[styles.statValue, { color: getStatusColor() }]}>{getStatusText()}</Text>
            </View>

            <View style={styles.statRow}>
              <Text variant="sectionTitle">UPTIME</Text>
              <Text style={styles.statValue}>{connected ? formatUptime(uptime) : 'n/a'}</Text>
            </View>

            <View style={styles.statRow}>
              <Text variant="sectionTitle">TICK INTERVAL</Text>
              <Text style={styles.statValue}>
                {snapshot?.tickInterval ? `${snapshot.tickInterval}ms` : 'n/a'}
              </Text>
            </View>

            <View style={[styles.statRow, styles.statRowLast]}>
              <Text variant="sectionTitle">LAST REFRESH</Text>
              <Text style={styles.statValue}>{formatTimeSince(lastRefresh)}</Text>
            </View>

            <Text variant="bodySmall" color="secondary" style={{ marginTop: theme.spacing.md }}>
              Channel integrations provide real-time communication with various services. Use the
              Refresh button to update channel status information.
            </Text>
          </Card>
        </Section>

        <Section title="Resources">
          <StatCard
            label="INSTANCES"
            value={instanceCount}
            description="Presence beacons in the last 5 minutes."
            style={styles.resourceGap}
          />
          <StatCard
            label="SESSIONS"
            value={sessionCount}
            description="Recent session keys tracked by the gateway."
            style={styles.resourceGap}
          />
          <StatCard label="CRON" value="Enabled" description="Next wake n/a" />
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
