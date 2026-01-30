import { useRouter } from 'expo-router'
import { useAtom } from 'jotai'
import React, { useEffect, useState } from 'react'
import { Alert, SafeAreaView, ScrollView, StyleSheet, View } from 'react-native'

import { Badge, Button, Card, ScreenHeader, Section, StatCard, Text } from '../src/components/ui'
import { useMoltGateway } from '../src/services/molt'
import { gatewayTokenAtom, gatewayUrlAtom } from '../src/store'
import { useTheme } from '../src/theme'

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
    [key: string]: any
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
  const [gatewayUrl] = useAtom(gatewayUrlAtom)
  const [gatewayToken] = useAtom(gatewayTokenAtom)
  const [schedulerStatus, setSchedulerStatus] = useState<SchedulerStatus | null>(null)
  const [cronJobs, setCronJobs] = useState<CronJob[]>([])
  const [loading, setLoading] = useState(true)

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
    url: gatewayUrl,
    token: gatewayToken,
  })

  useEffect(() => {
    connect()
  }, [])

  useEffect(() => {
    if (connected) {
      fetchSchedulerData()
    }
  }, [connected])

  const fetchSchedulerData = async () => {
    try {
      setLoading(true)
      const [statusData, jobsData] = await Promise.all([getSchedulerStatus(), listCronJobs()])

      if (statusData) {
        setSchedulerStatus(statusData as SchedulerStatus)
      }

      if (jobsData && (jobsData as any).jobs) {
        setCronJobs((jobsData as any).jobs)
      }
    } catch (err) {
      console.error('Failed to fetch scheduler data:', err)
    } finally {
      setLoading(false)
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
      console.error('Failed to toggle job:', err)
      Alert.alert('Error', 'Failed to toggle job')
    }
  }

  const handleRunJob = async (job: CronJob) => {
    try {
      await runCronJob(job.name)
      Alert.alert('Success', `Job "${job.name}" has been triggered`)
    } catch (err) {
      console.error('Failed to run job:', err)
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
            console.error('Failed to remove job:', err)
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
                  n/a {'\u2022'} next {formatDateTime(job.state?.nextRunAtMs ?? null)} {'\u2022'}{' '}
                  last {job.state?.lastRunAtMs ? formatDateTime(job.state.lastRunAtMs) : 'n/a'}
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
