import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge, Button, Card, ScreenHeader, Section, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import { GatewayLogEntry } from '../src/services/molt/types'
import { useTheme } from '../src/theme'
import { logger } from '../src/utils/logger'

const logsLogger = logger.create('GatewayLogs')

export default function GatewayLogsScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { getProviderConfig, currentServerId, currentServer } = useServers()
  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)

  const [logs, setLogs] = useState<GatewayLogEntry[]>([])
  const [filterLevel, setFilterLevel] = useState<'debug' | 'info' | 'warn' | 'error' | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  const { connected, connect, getLogs } = useMoltGateway({
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
      fetchLogs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  const fetchLogs = async () => {
    setLoading(true)
    try {
      const response = await getLogs({
        limit: 100,
        level: filterLevel ?? undefined,
      })
      if (response?.logs) {
        setLogs(response.logs)
      }
    } catch (err) {
      logsLogger.logError('Failed to fetch gateway logs', err)
    } finally {
      setLoading(false)
    }
  }

  const handleRefresh = async () => {
    await fetchLogs()
  }

  const handleFilterChange = (level: 'debug' | 'info' | 'warn' | 'error' | null) => {
    setFilterLevel(level)
  }

  useEffect(() => {
    if (connected) {
      fetchLogs()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterLevel])

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return theme.colors.status.error
      case 'warn':
        return theme.colors.status.warning
      case 'info':
        return theme.colors.primary
      case 'debug':
        return theme.colors.text.tertiary
      default:
        return theme.colors.text.secondary
    }
  }

  const getLevelVariant = (level: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (level) {
      case 'error':
        return 'error'
      case 'warn':
        return 'warning'
      case 'info':
        return 'success'
      default:
        return 'default'
    }
  }

  const formatTimestamp = (ts: number): string => {
    const date = new Date(ts)
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
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
    filterRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginBottom: theme.spacing.md,
    },
    filterChip: {
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    filterChipActive: {
      backgroundColor: theme.colors.primary + '20',
      borderColor: theme.colors.primary,
    },
    logEntry: {
      marginBottom: theme.spacing.sm,
    },
    logHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    logMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
  })

  if (currentServer?.providerType !== 'molt') {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('gatewayLogs.title')} showBack />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.xl,
          }}
        >
          <Text variant="heading2" style={{ marginBottom: theme.spacing.md }}>
            {t('skills.openClawOnly')}
          </Text>
          <Text color="secondary" center style={{ marginBottom: theme.spacing.xl }}>
            {t('gatewayLogs.openClawOnlyDescription')}
          </Text>
          <Button title={t('home.goToSettings')} onPress={() => router.push('/settings')} />
        </View>
      </SafeAreaView>
    )
  }

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('gatewayLogs.title')} showBack />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.xl,
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

  const filterLevels: Array<{ label: string; value: 'debug' | 'info' | 'warn' | 'error' | null }> =
    [
      { label: t('gatewayLogs.filterAll'), value: null },
      { label: 'Debug', value: 'debug' },
      { label: 'Info', value: 'info' },
      { label: 'Warn', value: 'warn' },
      { label: 'Error', value: 'error' },
    ]

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader title={t('gatewayLogs.title')} subtitle={t('gatewayLogs.subtitle')} showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section>
          <View style={styles.filterRow}>
            {filterLevels.map((level) => (
              <TouchableOpacity
                key={level.label}
                style={[styles.filterChip, filterLevel === level.value && styles.filterChipActive]}
                onPress={() => handleFilterChange(level.value)}
              >
                <Text
                  variant="caption"
                  style={{
                    color:
                      filterLevel === level.value
                        ? theme.colors.primary
                        : theme.colors.text.secondary,
                    fontWeight: theme.typography.fontWeight.semibold,
                  }}
                >
                  {level.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          <Button
            title={t('gatewayLogs.refresh')}
            variant="secondary"
            onPress={handleRefresh}
            loading={loading}
            icon={<Ionicons name="refresh-outline" size={18} color={theme.colors.text.primary} />}
          />
        </Section>

        <Section title={t('gatewayLogs.logsSection')}>
          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.lg }}>
            {t('gatewayLogs.logsDescription')}
          </Text>

          {logs.length === 0 ? (
            <Text color="secondary" center>
              {t('gatewayLogs.noLogs')}
            </Text>
          ) : (
            logs.map((entry, index) => (
              <Card key={`${entry.ts}-${index}`} style={styles.logEntry}>
                <View style={styles.logHeader}>
                  <Badge label={entry.level.toUpperCase()} variant={getLevelVariant(entry.level)} />
                  <Text variant="caption" color="tertiary">
                    {formatTimestamp(entry.ts)}
                  </Text>
                </View>
                <Text
                  variant="bodySmall"
                  style={{ color: getLevelColor(entry.level), marginTop: theme.spacing.xs }}
                >
                  {entry.message}
                </Text>
                {entry.source && (
                  <View style={styles.logMeta}>
                    <Badge label={entry.source} />
                  </View>
                )}
              </Card>
            ))
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
