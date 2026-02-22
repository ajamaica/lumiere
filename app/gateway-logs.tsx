import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge, Button, Card, ScreenHeader, Section, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { useOpenCrawGateway } from '../src/services/opencraw'
import { GatewayLogEntry } from '../src/services/opencraw/types'
import { useTheme } from '../src/theme'
import { useContentContainerStyle } from '../src/utils/device'
import { logger } from '../src/utils/logger'

const logsLogger = logger.create('GatewayLogs')

/**
 * Extract log entries from a gateway response payload.
 * Handles multiple response shapes: { logs: [...] }, { entries: [...] },
 * { items: [...] }, { data: [...] }, { lines: [...] }, or a bare array.
 */
function isValidLogEntry(value: unknown): value is GatewayLogEntry {
  if (typeof value !== 'object' || value === null) return false
  const obj = value as Record<string, unknown>
  return (
    typeof obj.level === 'string' && typeof obj.message === 'string' && typeof obj.ts === 'number'
  )
}

/**
 * Try to convert a tslog-style raw log line into a GatewayLogEntry.
 * tslog lines have: { "0": "{subsystem}", "1": "message", "_meta": { logLevelName, date, ... }, "time": "ISO" }
 */
function parseTslogEntry(obj: Record<string, unknown>): GatewayLogEntry | null {
  const meta = obj._meta as Record<string, unknown> | undefined
  if (!meta) return null

  const levelName = meta.logLevelName
  if (typeof levelName !== 'string') return null

  const level = levelName.toLowerCase() as GatewayLogEntry['level']
  const message = typeof obj['1'] === 'string' ? obj['1'] : ''
  if (!message) return null

  const dateStr = (meta.date as string) || (obj.time as string)
  const ts = dateStr ? new Date(dateStr).getTime() : 0
  if (!ts || isNaN(ts)) return null

  // Extract source from field "0" (often JSON like '{"subsystem":"agent/embedded"}')
  let source: string | undefined
  if (typeof obj['0'] === 'string') {
    try {
      const parsed = JSON.parse(obj['0'])
      source = parsed.subsystem || undefined
    } catch {
      source = obj['0'] || undefined
    }
  }

  return { ts, level, message, source, meta: meta as Record<string, unknown> }
}

function extractLogs(response: unknown): GatewayLogEntry[] {
  if (!response) return []

  let raw: unknown[] | undefined

  if (Array.isArray(response)) {
    raw = response
  } else if (typeof response === 'object') {
    const obj = response as Record<string, unknown>
    const candidate = obj.logs ?? obj.entries ?? obj.items ?? obj.data ?? obj.lines
    if (Array.isArray(candidate)) {
      raw = candidate
    }
  }

  if (!raw) return []

  const entries: GatewayLogEntry[] = []
  for (const item of raw) {
    // If the item is already a valid GatewayLogEntry, use it directly
    if (isValidLogEntry(item)) {
      entries.push(item)
      continue
    }

    // If the item is a JSON string, try to parse it
    let parsed: unknown = item
    if (typeof item === 'string') {
      try {
        parsed = JSON.parse(item)
      } catch {
        continue
      }
    }

    // Check if the parsed result is a valid log entry
    if (isValidLogEntry(parsed)) {
      entries.push(parsed)
      continue
    }

    // Try to convert from tslog format
    if (typeof parsed === 'object' && parsed !== null) {
      const converted = parseTslogEntry(parsed as Record<string, unknown>)
      if (converted) {
        entries.push(converted)
      }
    }
  }

  return entries
}

export default function GatewayLogsScreen() {
  const { theme } = useTheme()
  const contentContainerStyle = useContentContainerStyle()
  const router = useRouter()
  const { t } = useTranslation()
  const { getProviderConfig, currentServerId, currentServer } = useServers()
  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)

  const [logs, setLogs] = useState<GatewayLogEntry[]>([])
  const [filterLevel, setFilterLevel] = useState<'debug' | 'info' | 'warn' | 'error' | null>(null)
  const [loading, setLoading] = useState(false)
  const [fetchError, setFetchError] = useState<string | null>(null)

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  const {
    connected,
    connecting,
    error: connectionError,
    connect,
    disconnect,
    getLogs,
  } = useOpenCrawGateway({
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

  const fetchLogs = useCallback(async () => {
    if (!connected) return
    setLoading(true)
    setFetchError(null)
    try {
      const response = await getLogs({
        limit: 500,
        maxBytes: 250_000,
      })
      logsLogger.info('getLogs raw response', { response })
      const entries = extractLogs(response)
      setLogs(entries)
      if (entries.length === 0) {
        logsLogger.info('getLogs returned 0 entries — raw payload keys:', {
          keys: response ? Object.keys(response as object) : 'null/undefined',
          response,
        })
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      setFetchError(message)
      logsLogger.logError('Failed to fetch gateway logs', err)
    } finally {
      setLoading(false)
    }
  }, [connected, getLogs])

  useEffect(() => {
    if (connected) {
      fetchLogs()
    }
  }, [connected, fetchLogs])

  const handleRefresh = async () => {
    await fetchLogs()
  }

  const handleFilterChange = (level: 'debug' | 'info' | 'warn' | 'error' | null) => {
    setFilterLevel(level)
  }

  const filteredLogs = filterLevel ? logs.filter((entry) => entry.level === filterLevel) : logs

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

  if (currentServer?.providerType !== 'opencraw') {
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

      <ScrollView contentContainerStyle={[styles.scrollContent, contentContainerStyle]}>
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

          {(connectionError || fetchError) && (
            <Card style={{ marginBottom: theme.spacing.md }}>
              <Text variant="bodySmall" style={{ color: theme.colors.status.error }}>
                {connectionError
                  ? `${t('gatewayLogs.connectionError')}: ${connectionError}`
                  : `${t('gatewayLogs.fetchError')}: ${fetchError}`}
              </Text>
            </Card>
          )}

          {connecting && !connected && logs.length === 0 && (
            <Text color="secondary" center>
              {t('gatewayLogs.connecting')}
            </Text>
          )}

          {filteredLogs.length === 0 ? (
            !connecting && !connectionError && !fetchError ? (
              <Text color="secondary" center>
                {t('gatewayLogs.noLogs')}
              </Text>
            ) : null
          ) : (
            filteredLogs.map((entry, index) => (
              <Card key={`${entry.ts}-${index}`} style={styles.logEntry}>
                <View style={styles.logHeader}>
                  <Badge
                    label={(entry.level ?? 'info').toUpperCase()}
                    variant={getLevelVariant(entry.level ?? 'info')}
                  />
                  <Text variant="caption" color="tertiary">
                    {formatTimestamp(entry.ts)}
                  </Text>
                </View>
                <Text
                  variant="bodySmall"
                  style={{
                    color: getLevelColor(entry.level ?? 'info'),
                    marginTop: theme.spacing.xs,
                  }}
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
