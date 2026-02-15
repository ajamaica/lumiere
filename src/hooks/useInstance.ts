import { useAtom } from 'jotai'
import { useCallback, useEffect, useRef, useState } from 'react'

import { mobileApi, MobileApiRequestError } from '../services/mobile/api'
import { instanceAtom } from '../store/mobileAtoms'
import type { Instance, InstanceResponse } from '../store/mobileTypes'
import { logger } from '../utils/logger'

const log = logger.create('useInstance')

const POLL_INTERVAL_MS = 10_000

function mapInstanceResponse(response: InstanceResponse): Instance {
  return {
    instanceId: response.instance_id,
    name: response.name,
    status: response.status,
    url: response.url,
    token: response.token,
  }
}

export interface UseInstanceResult {
  /** The current instance, or null if none exists */
  instance: Instance | null
  /** Whether an instance operation is in progress */
  loading: boolean
  /** Whether the instance is being polled for status changes */
  polling: boolean
  /** Last error from an instance operation */
  error: string | null
  /** Create a new instance (or get existing one) */
  createInstance: () => Promise<Instance>
  /** Refresh instance data from the backend */
  refreshInstance: () => Promise<void>
  /** Fetch all instances and update state with the first one */
  fetchInstances: () => Promise<void>
  /** Start polling for instance status until it becomes "running" or "error" */
  startPolling: () => void
  /** Stop polling */
  stopPolling: () => void
}

export function useInstance(): UseInstanceResult {
  const [instance, setInstance] = useAtom(instanceAtom)
  const [loading, setLoading] = useState(false)
  const [polling, setPolling] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollingRef.current) {
        clearInterval(pollingRef.current)
        pollingRef.current = null
      }
    }
  }, [])

  const createInstance = useCallback(async (): Promise<Instance> => {
    setLoading(true)
    setError(null)

    try {
      const response = await mobileApi.createInstance()
      const inst = mapInstanceResponse(response)
      setInstance(inst)
      log.info('Instance created', { instanceId: inst.instanceId, status: inst.status })
      return inst
    } catch (err) {
      const message =
        err instanceof MobileApiRequestError
          ? err.message
          : 'Failed to create instance. Please try again.'
      setError(message)
      log.logError('Instance creation failed', err)
      throw err
    } finally {
      setLoading(false)
    }
  }, [setInstance])

  const refreshInstance = useCallback(async () => {
    if (!instance) return

    try {
      const response = await mobileApi.getInstance(instance.instanceId)
      const updated = mapInstanceResponse(response)
      setInstance(updated)
      log.debug('Instance refreshed', { status: updated.status })
    } catch (err) {
      if (err instanceof MobileApiRequestError && err.isNotFound) {
        setInstance(null)
        log.info('Instance no longer exists')
        return
      }
      log.logError('Instance refresh failed', err)
    }
  }, [instance, setInstance])

  const fetchInstances = useCallback(async () => {
    setLoading(true)
    setError(null)

    try {
      const responses = await mobileApi.listInstances()
      if (responses.length > 0) {
        const inst = mapInstanceResponse(responses[0])
        setInstance(inst)
        log.debug('Instances fetched', { count: responses.length, status: inst.status })
      } else {
        setInstance(null)
        log.debug('No instances found')
      }
    } catch (err) {
      const message =
        err instanceof MobileApiRequestError ? err.message : 'Failed to fetch instances.'
      setError(message)
      log.logError('Instance fetch failed', err)
    } finally {
      setLoading(false)
    }
  }, [setInstance])

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current)
      pollingRef.current = null
    }
    setPolling(false)
  }, [])

  const startPolling = useCallback(() => {
    // Don't start another poll if one is running
    if (pollingRef.current) return

    setPolling(true)

    pollingRef.current = setInterval(async () => {
      try {
        if (!instance) {
          stopPolling()
          return
        }

        const response = await mobileApi.getInstance(instance.instanceId)
        const updated = mapInstanceResponse(response)
        setInstance(updated)

        // Stop polling once instance reaches a terminal status
        if (updated.status === 'running' || updated.status === 'error') {
          stopPolling()
          log.info('Polling complete', { status: updated.status })
        }
      } catch (err) {
        log.logError('Polling error', err)
        if (err instanceof MobileApiRequestError && err.isNotFound) {
          setInstance(null)
          stopPolling()
        }
      }
    }, POLL_INTERVAL_MS)
  }, [instance, setInstance, stopPolling])

  return {
    instance,
    loading,
    polling,
    error,
    createInstance,
    refreshInstance,
    fetchInstances,
    startPolling,
    stopPolling,
  }
}
