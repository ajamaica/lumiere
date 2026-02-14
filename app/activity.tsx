import { Ionicons } from '@expo/vector-icons'
import { useRouter } from 'expo-router'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { ScrollView, StyleSheet, TouchableOpacity, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge, Button, Card, ScreenHeader, Section, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import { AgentEvent } from '../src/services/molt/types'
import { useTheme } from '../src/theme'

type StreamFilter = 'all' | 'lifecycle' | 'tool' | 'assistant'

const MAX_EVENTS = 200

interface ActivityEntry {
  id: string
  event: AgentEvent
}

export default function ActivityScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { t } = useTranslation()
  const { getProviderConfig, currentServerId, currentServer } = useServers()
  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)

  const [events, setEvents] = useState<ActivityEntry[]>([])
  const [filter, setFilter] = useState<StreamFilter>('all')
  const [paused, setPaused] = useState(false)
  const pausedRef = useRef(false)
  const eventIdRef = useRef(0)
  const scrollViewRef = useRef<ScrollView>(null)

  useEffect(() => {
    pausedRef.current = paused
  }, [paused])

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  const {
    client,
    connected,
    connecting,
    error: connectionError,
    connect,
    disconnect,
  } = useMoltGateway({
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

  // Subscribe to agent events
  useEffect(() => {
    if (!client || !connected) return

    const unsubscribe = client.onAgentEvent((event: AgentEvent) => {
      if (pausedRef.current) return

      const entry: ActivityEntry = {
        id: `evt-${++eventIdRef.current}`,
        event,
      }

      setEvents((prev) => {
        const next = [entry, ...prev]
        return next.length > MAX_EVENTS ? next.slice(0, MAX_EVENTS) : next
      })
    })

    return unsubscribe
  }, [client, connected])

  const handleClear = useCallback(() => {
    setEvents([])
  }, [])

  const handleTogglePause = useCallback(() => {
    setPaused((prev) => !prev)
  }, [])

  const filteredEvents = filter === 'all' ? events : events.filter((e) => e.event.stream === filter)

  const formatTimestamp = (ts: number): string => {
    const date = new Date(ts)
    return date.toLocaleString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  }

  const getStreamBadgeVariant = (
    stream: AgentEvent['stream'],
  ): 'success' | 'error' | 'warning' | 'default' => {
    switch (stream) {
      case 'lifecycle':
        return 'warning'
      case 'tool':
        return 'success'
      case 'assistant':
        return 'default'
      default:
        return 'default'
    }
  }

  const getToolStatusVariant = (status?: string): 'success' | 'error' | 'warning' | 'default' => {
    switch (status) {
      case 'completed':
        return 'success'
      case 'error':
        return 'error'
      case 'running':
        return 'warning'
      default:
        return 'default'
    }
  }

  const getEventSummary = (event: AgentEvent): string => {
    const { stream, data } = event

    switch (stream) {
      case 'lifecycle': {
        if (data.phase === 'start') return t('activity.events.agentStarted')
        if (data.phase === 'end') return t('activity.events.agentFinished')
        return t('activity.events.lifecycle')
      }
      case 'tool': {
        const toolName = data.toolName || t('activity.events.unknownTool')
        const status = data.toolStatus || 'running'
        if (status === 'running') return t('activity.events.toolRunning', { toolName })
        if (status === 'completed') return t('activity.events.toolCompleted', { toolName })
        if (status === 'error') return t('activity.events.toolError', { toolName })
        return t('activity.events.toolRunning', { toolName })
      }
      case 'assistant': {
        const delta = data.delta || data.text || ''
        if (!delta) return t('activity.events.assistantTyping')
        const preview = delta.length > 80 ? delta.slice(0, 80) + '...' : delta
        return preview
      }
      default:
        return stream
    }
  }

  const getEventIcon = (event: AgentEvent): keyof typeof Ionicons.glyphMap => {
    switch (event.stream) {
      case 'lifecycle':
        return event.data.phase === 'start' ? 'play-circle-outline' : 'stop-circle-outline'
      case 'tool':
        return 'construct-outline'
      case 'assistant':
        return 'chatbubble-outline'
      default:
        return 'ellipse-outline'
    }
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    controlRow: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginBottom: theme.spacing.md,
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
    eventCard: {
      marginBottom: theme.spacing.sm,
    },
    eventHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: theme.spacing.xs,
    },
    eventHeaderLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
      flex: 1,
    },
    eventMeta: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.xs,
    },
    pausedBanner: {
      backgroundColor: theme.colors.status.warning + '20',
      borderRadius: theme.borderRadius.sm,
      padding: theme.spacing.sm,
      marginBottom: theme.spacing.md,
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.sm,
    },
    statusDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    liveIndicator: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
  })

  if (currentServer?.providerType !== 'molt') {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('activity.title')} showBack />
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
            {t('activity.openClawOnlyDescription')}
          </Text>
          <Button title={t('home.goToSettings')} onPress={() => router.push('/settings')} />
        </View>
      </SafeAreaView>
    )
  }

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title={t('activity.title')} showBack />
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

  const filters: Array<{ label: string; value: StreamFilter }> = [
    { label: t('activity.filterAll'), value: 'all' },
    { label: t('activity.filterLifecycle'), value: 'lifecycle' },
    { label: t('activity.filterTools'), value: 'tool' },
    { label: t('activity.filterAssistant'), value: 'assistant' },
  ]

  return (
    <SafeAreaView style={styles.container}>
      <ScreenHeader
        title={t('activity.title')}
        subtitle={t('activity.subtitle')}
        showBack
        right={
          <View style={styles.liveIndicator}>
            <View
              style={[
                styles.statusDot,
                {
                  backgroundColor: connected
                    ? paused
                      ? theme.colors.status.warning
                      : theme.colors.status.success
                    : theme.colors.status.error,
                },
              ]}
            />
          </View>
        }
      />

      <ScrollView ref={scrollViewRef} contentContainerStyle={styles.scrollContent}>
        <Section>
          {/* Filter chips */}
          <View style={styles.filterRow}>
            {filters.map((f) => (
              <TouchableOpacity
                key={f.value}
                style={[styles.filterChip, filter === f.value && styles.filterChipActive]}
                onPress={() => setFilter(f.value)}
              >
                <Text
                  variant="caption"
                  style={{
                    color: filter === f.value ? theme.colors.primary : theme.colors.text.secondary,
                    fontWeight: theme.typography.fontWeight.semibold,
                  }}
                >
                  {f.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Controls */}
          <View style={styles.controlRow}>
            <Button
              title={paused ? t('activity.resume') : t('activity.pause')}
              variant="secondary"
              onPress={handleTogglePause}
              icon={
                <Ionicons
                  name={paused ? 'play-outline' : 'pause-outline'}
                  size={18}
                  color={theme.colors.text.primary}
                />
              }
            />
            <Button
              title={t('activity.clear')}
              variant="secondary"
              onPress={handleClear}
              icon={<Ionicons name="trash-outline" size={18} color={theme.colors.text.primary} />}
            />
          </View>
        </Section>

        {/* Paused banner */}
        {paused && (
          <View style={styles.pausedBanner}>
            <Ionicons name="pause-circle-outline" size={18} color={theme.colors.status.warning} />
            <Text variant="bodySmall" style={{ color: theme.colors.status.warning }}>
              {t('activity.pausedMessage')}
            </Text>
          </View>
        )}

        {/* Event list */}
        <Section title={t('activity.eventsSection')} subtitle={t('activity.eventsDescription')}>
          {connectionError && (
            <Card style={{ marginBottom: theme.spacing.md }}>
              <Text variant="bodySmall" style={{ color: theme.colors.status.error }}>
                {t('activity.connectionError')}: {connectionError}
              </Text>
            </Card>
          )}

          {connecting && !connected && events.length === 0 && (
            <Text color="secondary" center>
              {t('activity.connecting')}
            </Text>
          )}

          {filteredEvents.length === 0 ? (
            !connecting && !connectionError ? (
              <Text color="secondary" center>
                {t('activity.noEvents')}
              </Text>
            ) : null
          ) : (
            filteredEvents.map((entry) => (
              <Card key={entry.id} style={styles.eventCard}>
                <View style={styles.eventHeader}>
                  <View style={styles.eventHeaderLeft}>
                    <Ionicons
                      name={getEventIcon(entry.event)}
                      size={16}
                      color={theme.colors.text.secondary}
                    />
                    <Badge
                      label={entry.event.stream.toUpperCase()}
                      variant={getStreamBadgeVariant(entry.event.stream)}
                    />
                  </View>
                  <Text variant="caption" color="tertiary">
                    {formatTimestamp(entry.event.ts)}
                  </Text>
                </View>

                <Text variant="bodySmall" style={{ marginTop: theme.spacing.xs }} numberOfLines={3}>
                  {getEventSummary(entry.event)}
                </Text>

                {/* Tool-specific metadata */}
                {entry.event.stream === 'tool' && (
                  <View style={styles.eventMeta}>
                    {entry.event.data.toolStatus && (
                      <Badge
                        label={entry.event.data.toolStatus}
                        variant={getToolStatusVariant(entry.event.data.toolStatus)}
                      />
                    )}
                    {entry.event.data.toolCallId && (
                      <Badge label={entry.event.data.toolCallId.slice(0, 8)} />
                    )}
                  </View>
                )}

                {/* Lifecycle phase */}
                {entry.event.stream === 'lifecycle' && entry.event.data.phase && (
                  <View style={styles.eventMeta}>
                    <Badge
                      label={entry.event.data.phase}
                      variant={entry.event.data.phase === 'start' ? 'success' : 'default'}
                    />
                  </View>
                )}

                {/* Session badge */}
                <View style={styles.eventMeta}>
                  <Badge label={`${t('activity.session')}: ${entry.event.sessionKey}`} />
                </View>
              </Card>
            ))
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
