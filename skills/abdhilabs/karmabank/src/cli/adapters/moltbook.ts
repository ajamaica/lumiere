/**
 * Moltbook Adapter
 *
 * Minimal adapter for fetching agent profile data from Moltbook.
 * Used by CLI commands.
 */

import axios, { AxiosInstance } from 'axios'

/**
 * Moltbook profile interface (matches actual API response)
 */
export interface MoltbookProfile {
  id: string
  name: string
  description: string
  created_at: string // ISO date string
  last_active: string | null
  karma: number
  metadata: Record<string, unknown>
  is_claimed: boolean
  claimed_at: string
  owner_id: string
  owner: {
    xHandle: string
    xName: string
    xAvatar: string
    xBio: string
    xFollowerCount: number
    xFollowingCount: number
    xVerified: boolean
  }
  stats: {
    posts: number
    comments: number
    subscriptions: number
  }
}

/**
 * Moltbook API client configuration
 */
export interface MoltbookConfig {
  apiKey: string
  baseUrl?: string
  timeout?: number
}

const DEFAULT_CONFIG: Partial<MoltbookConfig> = {
  baseUrl: 'https://www.moltbook.com/api/v1',
  timeout: 10000,
}

/**
 * Create Moltbook API client
 */
export function createMoltbookClient(config: MoltbookConfig): AxiosInstance {
  const merged = { ...DEFAULT_CONFIG, ...config }
  return axios.create({
    baseURL: merged.baseUrl,
    timeout: merged.timeout,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${merged.apiKey}`,
    },
  })
}

/**
 * Fetch Moltbook profile by agent name
 */
export async function getMoltbookProfile(
  moltbookName: string,
  apiKey?: string,
): Promise<MoltbookProfile> {
  const key = apiKey || process.env.MOLTBOOK_API_KEY

  if (!key) {
    throw new Error('Missing Moltbook API key. Set MOLTBOOK_API_KEY env or pass --api-key')
  }

  const client = createMoltbookClient({ apiKey: key })
  const response = await client.get(`/agents/profile?name=${encodeURIComponent(moltbookName)}`)

  return response.data as MoltbookProfile
}

/**
 * Get current authenticated agent's profile
 */
export async function getMyProfile(apiKey?: string): Promise<MoltbookProfile> {
  const key = apiKey || process.env.MOLTBOOK_API_KEY

  if (!key) {
    throw new Error('Missing Moltbook API key')
  }

  const client = createMoltbookClient({ apiKey: key })
  const response = await client.get('/agents/me')

  return response.data as MoltbookProfile
}
