import { useRouter } from 'expo-router'
import React, { useEffect, useState } from 'react'
import { Alert, ScrollView, StyleSheet, View } from 'react-native'
import { SafeAreaView } from 'react-native-safe-area-context'

import { Badge, Button, Card, ScreenHeader, Section, StatCard, Text } from '../src/components/ui'
import { useServers } from '../src/hooks/useServers'
import { useMoltGateway } from '../src/services/molt'
import { useTheme } from '../src/theme'
import { logger } from '../src/utils/logger'

const schedulerLogger = logger.create('Scheduler')

interface SchedulerStatus {
  enabled: boolean
  jobs: number
  nextWakeAtMs: number | null
  storePath?: string
}

interface CronJob {
  id: string
  name: string
  enabled: boolean
  agentId: string
  sessionTarget: string
  wakeMode: string
  schedule?: {
    cron?: string
  }
  payload?: {
    system?: string
    [key: string]: unknown
  }
  state?: {
    nextRunAtMs?: number
    lastRunAtMs?: number
    tags?: string[]
  }
  createdAtMs: number
  updatedAtMs: number
}

export default function SchedulerScreen() {
  const { theme } = useTheme()
  const router = useRouter()
  const { getProviderConfig, currentServerId, currentServer } = useServers()
  const [config, setConfig] = useState<{ url: string; token: string } | null>(null)

  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null)
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])

  useEffect(() => {
    const loadConfig = async () => {
      const providerConfig = await getProviderConfig()
      setConfig(providerConfig)
    }
    loadConfig()
  }, [getProviderConfig, currentServerId])

  const {
    connected,
    connect,
    getSchedulerStatus,
    listCronJobs,
    disableCronJob,
    enableCronJob,
    runCronJob,
    removeCronJob,
  } = useMoltGateway({
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
      fetchSchedulerData()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected])

  const fetchSchedulerData = async () => {
    try {
      const [statusData, jobsData] = await Promise.all([getSchedulerStatus(), listCronJobs()])

      if (statusData) {
        setSchedulerStatus(statusData as SchedulerStatus)
      }

      const jobsResponse = jobsData as { jobs?: CronJob[] }
      if (jobsResponse?.jobs) {
        setCronJobs(jobsResponse.jobs)
      }
    } catch (err) {
      schedulerLogger.logError('Failed to fetch scheduler data', err)
    }
  }

  const handleRefresh = async () => {
    await fetchSchedulerData()
  }

  const handleToggleJob = async (job: CronJob) => {
    try {
      if (job.enabled) {
        await disableCronJob(job.name)
      } else {
        await enableCronJob(job.name)
      }
      await fetchSchedulerData()
    } catch (err) {
      schedulerLogger.logError('Failed to toggle job', err)
      Alert.alert('Error', 'Failed to toggle job')
    }
  }

  const handleRunJob = async (job: CronJob) => {
    try {
      await runCronJob(job.name)
      Alert.alert('Success', `Job "${job.name}" has been triggered`)
    } catch (err) {
      schedulerLogger.logError('Failed to run job', err)
      Alert.alert('Error', 'Failed to run job')
    }
  }

  const handleRemoveJob = async (job: CronJob) => {
    Alert.alert('Remove Job', `Are you sure you want to remove the job "${job.name}"?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Remove',
        style: 'destructive',
        onPress: async () => {
          try {
            await removeCronJob(job.name)
            await fetchSchedulerData()
          } catch (err) {
            schedulerLogger.logError('Failed to remove job', err)
            Alert.alert('Error', 'Failed to remove job')
          }
        },
      },
    ])
  }

  const formatDateTime = (timestamp: number | null): string => {
    if (!timestamp) return 'n/a'
    const date = new Date(timestamp)
    return date.toLocaleString('en-US', {
      month: 'numeric',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    })
  }

  const getRelativeTime = (timestamp: number | null): string => {
    if (!timestamp) return ''
    const now = Date.now()
    const diff = Math.abs(timestamp - now)
    const seconds = Math.floor(diff / 1000)

    if (seconds < 60) return '(just now)'
    if (seconds < 3600) return `(in ${Math.floor(seconds / 60)}m)`
    if (seconds < 86400) return `(in ${Math.floor(seconds / 3600)}h)`
    return `(in ${Math.floor(seconds / 86400)}d)`
  }

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    statsRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    jobActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    badgeRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
    },
  })

  if (currentServer?.providerType !== 'molt') {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Scheduler" showBack />
        <View
          style={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            padding: theme.spacing.lg,
          }}
        >
          <Text variant="heading2" style={{ marginBottom: theme.spacing.md }}>
            OpenClaw Only
          </Text>
          <Text color="secondary" center style={{ marginBottom: theme.spacing.xl }}>
            Cron Jobs are only available for OpenClaw servers.
          </Text>
          <Button title="Go to Settings" onPress={() => router.push('/settings')} />
        </View>
      </SafeAreaView>
    )
  }

  if (!config) {
    return (
      <SafeAreaView style={styles.container}>
        <ScreenHeader title="Scheduler" showBack />
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
      <ScreenHeader title="Scheduler" subtitle="Gateway-owned cron scheduler status." showBack />

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <Section>
          <View style={styles.statsRow}>
            <StatCard
              label="ENABLED"
              value={schedulerStatus?.enabled ? 'Yes' : 'No'}
              style={{ flex: 1 }}
            />
            <StatCard label="JOBS" value={schedulerStatus?.jobs ?? 0} style={{ flex: 1 }} />
          </View>

          <StatCard
            label="NEXT WAKE"
            value={formatDateTime(schedulerStatus?.nextWakeAtMs ?? null)}
            description={getRelativeTime(schedulerStatus?.nextWakeAtMs ?? null)}
            style={{ marginBottom: theme.spacing.md }}
          />

          <Button title="Refresh" variant="secondary" onPress={handleRefresh} />
        </Section>

        <Section title="Jobs">
          <Text variant="bodySmall" color="secondary" style={{ marginBottom: theme.spacing.lg }}>
            All scheduled jobs stored in the gateway.
          </Text>

          {cronJobs.length === 0 ? (
            <Text color="secondary" center>
              No cron jobs configured
            </Text>
          ) : (
            cronJobs.map((job) => (
              <Card key={job.id} style={{ marginBottom: theme.spacing.md }}>
                <Text variant="heading3" style={{ marginBottom: theme.spacing.xs }}>
                  {job.name}
                </Text>
                {job.schedule?.cron && (
                  <Text variant="mono" color="secondary">
                    Cron {job.schedule.cron}
                  </Text>
                )}
                {job.payload?.system && (
                  <Text variant="bodySmall" color="secondary">
                    System: {job.payload.system}
                  </Text>
                )}
                <Text variant="bodySmall" color="secondary">
                  Agent: {job.agentId}
                </Text>
                <Text variant="caption" color="tertiary" style={{ marginTop: theme.spacing.xs }}>
                  Next: {formatDateTime(job.state?.nextRunAtMs ?? null)}
                </Text>
                <Text variant="caption" color="tertiary">
                  Last: {job.state?.lastRunAtMs ? formatDateTime(job.state.lastRunAtMs) : 'n/a'}
                </Text>

                <View style={styles.badgeRow}>
                  {job.enabled && <Badge label="enabled" variant="success" />}
                  <Badge label={job.agentId} />
                  <Badge label={job.wakeMode} />
                  {job.state?.tags?.map((tag) => (
                    <Badge key={tag} label={tag} />
                  ))}
                </View>

                <View style={styles.jobActions}>
                  <Button
                    title={job.enabled ? 'Disable' : 'Enable'}
                    variant="secondary"
                    size="sm"
                    onPress={() => handleToggleJob(job)}
                  />
                  <Button
                    title="Run"
                    variant="secondary"
                    size="sm"
                    onPress={() => handleRunJob(job)}
                  />
                  <Button
                    title="Remove"
                    variant="danger"
                    size="sm"
                    onPress={() => handleRemoveJob(job)}
                  />
                </View>
              </Card>
            ))
          )}
        </Section>
      </ScrollView>
    </SafeAreaView>
  )
}
