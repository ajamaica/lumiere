import { useCallback, useEffect, useState } from 'react'

import { API_CONFIG } from '../constants'
import { getServerToken } from '../services/secureTokenStorage'
import { logger } from '../utils/logger'

const claudeModelsLogger = logger.create('ClaudeModels')

export interface ClaudeModel {
  id: string
  display_name: string
  created_at: string
  type: string
}

interface UseClaudeModelsResult {
  models: ClaudeModel[]
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useClaudeModels(
  serverId: string | undefined,
  baseUrl?: string,
): UseClaudeModelsResult {
  const [models, setModels] = useState<ClaudeModel[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchModels = useCallback(async () => {
    if (!serverId) return

    setLoading(true)
    setError(null)

    try {
      const apiKey = await getServerToken(serverId)
      if (!apiKey) {
        setError('No API key found. Save your API key first.')
        return
      }

      const host = (baseUrl || 'https://api.anthropic.com').replace(/\/+$/, '')
      const response = await fetch(`${host}/v1/models`, {
        method: 'GET',
        headers: {
          'x-api-key': apiKey,
          'anthropic-version': API_CONFIG.ANTHROPIC_VERSION,
        },
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`)
      }

      const data = await response.json()
      if (data.data && Array.isArray(data.data)) {
        const sortedModels = data.data.sort(
          (a: ClaudeModel, b: ClaudeModel) =>
            new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        setModels(sortedModels)
      }
    } catch (err) {
      claudeModelsLogger.logError('Failed to fetch Claude models', err)
      setError('Could not fetch models. Check your API key.')
    } finally {
      setLoading(false)
    }
  }, [serverId, baseUrl])

  useEffect(() => {
    fetchModels()
  }, [fetchModels])

  return { models, loading, error, refetch: fetchModels }
}
