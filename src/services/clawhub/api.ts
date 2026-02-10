import { logger } from '../../utils/logger'

const clawHubLogger = logger.create('ClawHub')

const CLAWHUB_BASE_URL = 'https://clawhub.ai'
const FALLBACK_BASE_URL = 'https://onlycrabs.ai'

interface ClawHubSearchResult {
  score: number
  slug: string
  displayName: string
  summary: string | null
  version: string | null
  updatedAt: number
}

interface ClawHubSearchApiResponse {
  results: ClawHubSearchResult[]
}

interface ClawHubSkillDetailResponse {
  skill: {
    slug: string
    displayName: string
    summary?: string
    tags: Record<string, string>
    stats: { installs?: number }
    createdAt: number
    updatedAt: number
  }
  latestVersion: {
    version: string
    createdAt: number
    changelog: string
  } | null
  owner: {
    handle?: string | null
    displayName?: string | null
    image?: string | null
  } | null
}

export interface ClawHubSkillResult {
  slug: string
  name: string
  description: string
  content: string
  author?: string
  installs?: number
}

async function fetchWithFallback(path: string): Promise<Response> {
  try {
    const response = await fetch(`${CLAWHUB_BASE_URL}${path}`)
    if (response.ok) return response
    // If primary fails with server error, try fallback
    if (response.status >= 500) {
      clawHubLogger.warn(`Primary API returned ${response.status}, trying fallback`)
      return await fetch(`${FALLBACK_BASE_URL}${path}`)
    }
    return response
  } catch {
    clawHubLogger.warn('Primary API unreachable, trying fallback')
    return await fetch(`${FALLBACK_BASE_URL}${path}`)
  }
}

export async function searchClawHubSkills(query: string): Promise<ClawHubSkillResult[]> {
  const encodedQuery = encodeURIComponent(query)
  const response = await fetchWithFallback(`/api/v1/skills/search?q=${encodedQuery}&limit=20`)

  if (!response.ok) {
    throw new Error(`ClawHub search failed with status ${response.status}`)
  }

  const data = (await response.json()) as ClawHubSearchApiResponse

  return data.results.map((result) => ({
    slug: result.slug,
    name: result.displayName || result.slug,
    description: result.summary || '',
    content: '',
    author: undefined,
    installs: undefined,
  }))
}

export async function getClawHubSkillDetail(slug: string): Promise<ClawHubSkillDetailResponse> {
  const response = await fetchWithFallback(`/api/v1/skills/${encodeURIComponent(slug)}`)

  if (!response.ok) {
    throw new Error(`Failed to fetch skill details for "${slug}" (status ${response.status})`)
  }

  return (await response.json()) as ClawHubSkillDetailResponse
}

export async function getClawHubSkillContent(slug: string): Promise<string> {
  const response = await fetchWithFallback(
    `/api/v1/skills/${encodeURIComponent(slug)}/file?path=SKILL.md`,
  )

  if (!response.ok) {
    throw new Error(`Failed to fetch skill content for "${slug}" (status ${response.status})`)
  }

  return await response.text()
}
