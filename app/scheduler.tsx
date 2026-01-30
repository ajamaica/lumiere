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
      const [statusData, jobsData] = await Promise.all([
        getSchedulerStatus(),
        listCronJobs(),
      ])

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
    Alert.alert(
      'Remove Job',
      `Are you sure you want to remove the job "${job.name}"?`,
      [
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
      ],
    )
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
    headerContent: {
      flex: 1,
    },
    title: {
      fontSize: theme.typography.fontSize.xxl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    subtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
    scrollContent: {
      padding: theme.spacing.lg,
    },
    section: {
      marginBottom: theme.spacing.xl,
    },
    statsRow: {
      flexDirection: 'row',
      gap: theme.spacing.md,
      marginBottom: theme.spacing.md,
    },
    statCard: {
      flex: 1,
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    statLabel: {
      fontSize: theme.typography.fontSize.xs,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.sm,
      textTransform: 'uppercase',
      letterSpacing: 0.5,
    },
    statValue: {
      fontSize: theme.typography.fontSize.xxxl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    statValueLarge: {
      fontSize: theme.typography.fontSize.xl,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
    },
    statTime: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginTop: theme.spacing.xs,
    },
    refreshButton: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.md,
      borderWidth: 1,
      borderColor: theme.colors.border,
      alignSelf: 'flex-start',
    },
    refreshButtonText: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    sectionTitle: {
      fontSize: theme.typography.fontSize.base,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    sectionSubtitle: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.lg,
    },
    jobCard: {
      backgroundColor: theme.colors.surface,
      borderRadius: theme.borderRadius.md,
      padding: theme.spacing.lg,
      borderWidth: 1,
      borderColor: theme.colors.border,
      marginBottom: theme.spacing.md,
    },
    jobHeader: {
      marginBottom: theme.spacing.md,
    },
    jobName: {
      fontSize: theme.typography.fontSize.lg,
      fontWeight: theme.typography.fontWeight.bold,
      color: theme.colors.text.primary,
      marginBottom: theme.spacing.xs,
    },
    jobInfo: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.xs,
      fontFamily: theme.typography.fontFamily.monospace,
    },
    jobMeta: {
      fontSize: theme.typography.fontSize.sm,
      color: theme.colors.text.secondary,
      marginBottom: theme.spacing.xs,
    },
    jobTiming: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.tertiary,
      marginTop: theme.spacing.xs,
    },
    jobTags: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: theme.spacing.xs,
      marginTop: theme.spacing.sm,
    },
    tag: {
      backgroundColor: theme.colors.background,
      borderRadius: theme.borderRadius.sm,
      paddingHorizontal: theme.spacing.sm,
      paddingVertical: theme.spacing.xs,
      borderWidth: 1,
      borderColor: theme.colors.border,
    },
    tagText: {
      fontSize: theme.typography.fontSize.xs,
      color: theme.colors.text.secondary,
      fontFamily: theme.typography.fontFamily.monospace,
    },
    jobActions: {
      flexDirection: 'row',
      gap: theme.spacing.sm,
      marginTop: theme.spacing.md,
    },
    actionButton: {
      paddingHorizontal: theme.spacing.md,
      paddingVertical: theme.spacing.sm,
      borderRadius: theme.borderRadius.sm,
      borderWidth: 1,
      borderColor: theme.colors.border,
      backgroundColor: theme.colors.background,
    },
    actionButtonDanger: {
      borderColor: theme.colors.status.error,
    },
    actionButtonText: {
      fontSize: theme.typography.fontSize.sm,
      fontWeight: theme.typography.fontWeight.semibold,
      color: theme.colors.text.primary,
    },
    actionButtonTextDanger: {
      color: theme.colors.status.error,
    },
    emptyState: {
      padding: theme.spacing.xl,
      alignItems: 'center',
    },
    emptyStateText: {
      fontSize: theme.typography.fontSize.base,
      color: theme.colors.text.secondary,
    },
  })

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.colors.text.primary} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Scheduler</Text>
          <Text style={styles.subtitle}>Gateway-owned cron scheduler status.</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.section}>
          <View style={styles.statsRow}>
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>ENABLED</Text>
              <Text style={styles.statValue}>
                {schedulerStatus?.enabled ? 'Yes' : 'No'}
              </Text>
            </View>

            <View style={styles.statCard}>
              <Text style={styles.statLabel}>JOBS</Text>
              <Text style={styles.statValue}>{schedulerStatus?.jobs ?? 0}</Text>
            </View>
          </View>

          <View style={[styles.statCard, { marginBottom: theme.spacing.md }]}>
            <Text style={styles.statLabel}>NEXT WAKE</Text>
            <Text style={styles.statValueLarge}>
              {formatDateTime(schedulerStatus?.nextWakeAtMs ?? null)}
            </Text>
            <Text style={styles.statTime}>
              {getRelativeTime(schedulerStatus?.nextWakeAtMs ?? null)}
            </Text>
          </View>

          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <Text style={styles.refreshButtonText}>Refresh</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jobs</Text>
          <Text style={styles.sectionSubtitle}>
            All scheduled jobs stored in the gateway.
          </Text>

          {cronJobs.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>No cron jobs configured</Text>
            </View>
          ) : (
            cronJobs.map((job) => (
              <View key={job.id} style={styles.jobCard}>
                <View style={styles.jobHeader}>
                  <Text style={styles.jobName}>{job.name}</Text>
                  {job.schedule?.cron && (
                    <Text style={styles.jobInfo}>Cron {job.schedule.cron}</Text>
                  )}
                  {job.payload?.system && (
                    <Text style={styles.jobMeta}>System: {job.payload.system}</Text>
                  )}
                  <Text style={styles.jobMeta}>Agent: {job.agentId}</Text>
                  <Text style={styles.jobTiming}>
                    n/a • next {formatDateTime(job.state?.nextRunAtMs ?? null)} • last{' '}
                    {job.state?.lastRunAtMs ? formatDateTime(job.state.lastRunAtMs) : 'n/a'}
                  </Text>
                </View>

                <View style={styles.jobTags}>
                  {job.enabled && (
                    <View style={styles.tag}>
                      <Text style={styles.tagText}>enabled</Text>
                    </View>
                  )}
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{job.agentId}</Text>
                  </View>
                  <View style={styles.tag}>
                    <Text style={styles.tagText}>{job.wakeMode}</Text>
                  </View>
                  {job.state?.tags?.map((tag) => (
                    <View key={tag} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>

                <View style={styles.jobActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => handleToggleJob(job)}
                  >
                    <Text style={styles.actionButtonText}>
                      {job.enabled ? 'Disable' : 'Enable'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton} onPress={() => handleRunJob(job)}>
                    <Text style={styles.actionButtonText}>Run</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.actionButton}>
                    <Text style={styles.actionButtonText}>Runs</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.actionButtonDanger]}
                    onPress={() => handleRemoveJob(job)}
                  >
                    <Text style={[styles.actionButtonText, styles.actionButtonTextDanger]}>
                      Remove
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            ))
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  )
}
