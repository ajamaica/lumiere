import AsyncStorage from '@react-native-async-storage/async-storage'
import * as BackgroundFetch from 'expo-background-fetch'
import * as TaskManager from 'expo-task-manager'

import { getServerToken } from '../secureTokenStorage'
import { scheduleLocalNotification } from './notificationService'

export const BACKGROUND_NOTIFICATION_TASK = 'BACKGROUND_GATEWAY_CHECK'

const STORAGE_KEYS = {
  lastHealthStatus: 'bg_last_health_status',
  lastCronRunTimestamps: 'bg_last_cron_run_timestamps',
  notificationsEnabled: 'notificationsEnabled',
  servers: 'servers',
  currentServerId: 'currentServerId',
} as const

interface StoredServerConfig {
  id: string
  name: string
  url: string
  clientId?: string
}

interface CronJob {
  name: string
  enabled: boolean
  lastRun?: string
  schedule?: string
}

interface CronRunTimestamps {
  [jobName: string]: string
}

// Perform an HTTP-based health check against the gateway REST endpoint.
// Background tasks cannot use WebSockets, so we use a simple fetch.
async function checkGatewayHealth(
  serverUrl: string,
  token: string,
): Promise<{ healthy: boolean; status?: string }> {
  try {
    // Derive the HTTP URL from the WebSocket URL
    const httpUrl = serverUrl.replace(/^ws(s)?:\/\//, 'http$1://').replace(/\/ws\/?$/, '')
    const response = await fetch(`${httpUrl}/health`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) {
      return { healthy: false, status: `HTTP ${response.status}` }
    }

    const data = await response.json()
    const status = data.status || (response.ok ? 'healthy' : 'unknown')
    return { healthy: status === 'healthy', status }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return { healthy: false, status: message }
  }
}

// Check for recently completed cron jobs by querying the gateway HTTP API
async function checkCronJobs(serverUrl: string, token: string): Promise<CronJob[]> {
  try {
    const httpUrl = serverUrl.replace(/^ws(s)?:\/\//, 'http$1://').replace(/\/ws\/?$/, '')
    const response = await fetch(`${httpUrl}/api/cron/list`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (!response.ok) return []

    const data = await response.json()
    return Array.isArray(data) ? data : data.jobs || []
  } catch {
    return []
  }
}

// The main background task function
async function backgroundGatewayCheck(): Promise<BackgroundFetch.BackgroundFetchResult> {
  try {
    // Check if notifications are enabled
    const enabledStr = await AsyncStorage.getItem(STORAGE_KEYS.notificationsEnabled)
    if (enabledStr !== 'true') {
      return BackgroundFetch.BackgroundFetchResult.NoData
    }

    // Get current server configuration from AsyncStorage
    const serversStr = await AsyncStorage.getItem(STORAGE_KEYS.servers)
    const currentServerIdStr = await AsyncStorage.getItem(STORAGE_KEYS.currentServerId)

    if (!serversStr || !currentServerIdStr) {
      return BackgroundFetch.BackgroundFetchResult.NoData
    }

    const servers = JSON.parse(serversStr) as Record<string, StoredServerConfig>
    const currentServerId = JSON.parse(currentServerIdStr) as string

    if (!currentServerId || !servers[currentServerId]) {
      return BackgroundFetch.BackgroundFetchResult.NoData
    }

    const server = servers[currentServerId]
    const token = await getServerToken(server.id)

    if (!token) {
      return BackgroundFetch.BackgroundFetchResult.NoData
    }

    let hasNewData = false

    // 1. Check gateway health
    const healthResult = await checkGatewayHealth(server.url, token)
    const lastHealthStr = await AsyncStorage.getItem(STORAGE_KEYS.lastHealthStatus)
    const lastHealthy = lastHealthStr !== 'false' // Default to healthy if no previous state

    if (lastHealthy && !healthResult.healthy) {
      // Gateway went from healthy to unhealthy
      await scheduleLocalNotification(
        'Gateway Health Alert',
        `${server.name || 'Gateway'} is ${healthResult.status || 'unreachable'}. Check your server connection.`,
        'health',
        { serverId: server.id, status: healthResult.status },
      )
      hasNewData = true
    } else if (!lastHealthy && healthResult.healthy) {
      // Gateway recovered
      await scheduleLocalNotification(
        'Gateway Recovered',
        `${server.name || 'Gateway'} is back online and healthy.`,
        'health',
        { serverId: server.id, status: 'healthy' },
      )
      hasNewData = true
    }

    await AsyncStorage.setItem(STORAGE_KEYS.lastHealthStatus, String(healthResult.healthy))

    // 2. Check for completed cron jobs
    if (healthResult.healthy) {
      const cronJobs = await checkCronJobs(server.url, token)
      const lastTimestampsStr = await AsyncStorage.getItem(STORAGE_KEYS.lastCronRunTimestamps)
      const lastTimestamps: CronRunTimestamps = lastTimestampsStr
        ? JSON.parse(lastTimestampsStr)
        : {}
      const newTimestamps: CronRunTimestamps = {}

      for (const job of cronJobs) {
        if (job.lastRun) {
          newTimestamps[job.name] = job.lastRun

          // If there's a previous timestamp and it's different, the job has run
          if (lastTimestamps[job.name] && lastTimestamps[job.name] !== job.lastRun) {
            await scheduleLocalNotification(
              'Cron Job Completed',
              `"${job.name}" has finished running.`,
              'cron',
              { jobName: job.name, lastRun: job.lastRun },
            )
            hasNewData = true
          }
        }
      }

      await AsyncStorage.setItem(STORAGE_KEYS.lastCronRunTimestamps, JSON.stringify(newTimestamps))
    }

    return hasNewData
      ? BackgroundFetch.BackgroundFetchResult.NewData
      : BackgroundFetch.BackgroundFetchResult.NoData
  } catch (error) {
    console.error('Background gateway check failed:', error)
    return BackgroundFetch.BackgroundFetchResult.Failed
  }
}

// Define the background task — this must be called at module scope (top level)
TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async () => {
  return await backgroundGatewayCheck()
})

export async function registerBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK)
  if (isRegistered) return

  await BackgroundFetch.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK, {
    minimumInterval: 15 * 60, // 15 minutes (iOS minimum)
    stopOnTerminate: false,
    startOnBoot: true,
  })
}

export async function unregisterBackgroundTask(): Promise<void> {
  const isRegistered = await TaskManager.isTaskRegisteredAsync(BACKGROUND_NOTIFICATION_TASK)
  if (!isRegistered) return

  await BackgroundFetch.unregisterTaskAsync(BACKGROUND_NOTIFICATION_TASK)
}

export async function getBackgroundTaskStatus(): Promise<BackgroundFetch.BackgroundFetchStatus | null> {
  return await BackgroundFetch.getStatusAsync()
}
