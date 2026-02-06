/**
 * Solana Actions Client
 * Direct implementation of the Solana Actions specification
 * https://solana.com/developers/guides/advanced/actions
 *
 * Replaces dependency on Dialect's API with direct protocol action endpoints
 */

import type {
  BlinkLinkAction,
  BlinkMetadata,
  BlinkParameter,
  BlinkTransaction,
} from '../types/index.js'

// Required headers for Solana Actions CORS compliance
const ACTIONS_HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
}

// User agent - use browser UA to avoid Cloudflare bot detection
const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

/**
 * Registry of known protocol action endpoints
 * These are direct protocol URLs that implement the Solana Actions spec
 */
export const PROTOCOL_ACTIONS = {
  // Jito - Staking
  jito: {
    stake: 'https://jito.network/staking',
    website: 'https://jito.network',
  },

  // Tensor - NFT Marketplace
  tensor: {
    buy: 'https://tensor.trade/api/actions/buy',
    list: 'https://tensor.trade/api/actions/list',
    website: 'https://tensor.trade',
  },

  // Magic Eden - NFT Marketplace
  magiceden: {
    buy: 'https://api-mainnet.magiceden.dev/v2/actions/buy',
    website: 'https://magiceden.io',
  },

  // Helio - Payments
  helio: {
    pay: 'https://api.hel.io/actions',
    website: 'https://hel.io',
  },

  // Streamflow - Token Vesting
  streamflow: {
    claim: 'https://blink.streamflow.finance/api/actions/claim',
    website: 'https://streamflow.finance',
  },

  // Sanctum - LST Staking
  sanctum: {
    stake: 'https://sanctum.so/api/actions/stake',
    website: 'https://sanctum.so',
  },

  // Squads - Multisig
  squads: {
    create: 'https://squads-actions-poc.vercel.app/api/actions/create',
    website: 'https://squads.so',
  },

  // SNS - Solana Name Service
  sns: {
    register: 'https://sns-actions.bonfida.com/api/register',
    website: 'https://sns.id',
  },

  // AllDomains - Domain Registration
  alldomains: {
    register: 'https://alldomains.id/api/actions/register',
    website: 'https://alldomains.id',
  },

  // Tiplink - Payments
  tiplink: {
    create: 'https://tiplink.io/api/actions/create',
    website: 'https://tiplink.io',
  },

  // Solscan - Explorer
  solscan: {
    track: 'https://action.solscan.io/api/actions/track',
    website: 'https://solscan.io',
  },

  // Famous Foxes - NFT
  famousfoxes: {
    mint: 'https://famousfoxes.com/api/actions/mint',
    website: 'https://famousfoxes.com',
  },
}

/**
 * List of trusted action hosts from the Dialect registry
 * Used for validation when executing arbitrary action URLs
 */
export const TRUSTED_HOSTS = [
  'jito.network',
  'jito.dial.to',
  'tensor.trade',
  'tensor.dial.to',
  'api-mainnet.magiceden.dev',
  'magiceden.dev',
  'sanctum.so',
  'sanctum.dial.to',
  'jup.ag',
  'jupiter.dial.to',
  'kamino.dial.to',
  'app.kamino.finance',
  'marginfi.dial.to',
  'app.drift.trade',
  'drift.dial.to',
  'blink.lulo.fi',
  'lulo.dial.to',
  'share.raydium.io',
  'raydium.dial.to',
  'orca.dial.to',
  'meteora.dial.to',
  'api.hel.io',
  'blink.hel.io',
  'blink.streamflow.finance',
  'sns-actions.bonfida.com',
  'action.sns.id',
  'alldomains.id',
  'tiplink.io',
  'action.solscan.io',
  'famousfoxes.com',
  'squads-actions-poc.vercel.app',
  'actions.dialect.to',
  'api.dial.to',
  'dial.to',
]

/**
 * Use curl for HTTP requests to bypass Cloudflare TLS fingerprinting
 * Node's native fetch gets blocked by Cloudflare on some dial.to endpoints
 */
async function curlFetch(
  url: string,
  options: {
    method?: string
    headers?: Record<string, string>
    body?: string
    timeout?: number
  } = {},
): Promise<{
  ok: boolean
  status: number
  text: () => Promise<string>
  json: () => Promise<unknown>
}> {
  const { execSync } = await import('child_process')

  const method = options.method || 'GET'
  const timeout = options.timeout || 30000

  // Build curl command
  const headerArgs = Object.entries(options.headers || {})
    .map(([k, v]) => `-H "${k}: ${v}"`)
    .join(' ')

  const bodyArg = options.body ? `-d '${options.body.replace(/'/g, "\\'")}'` : ''

  const cmd = `curl -s -w "\\n%{http_code}" --max-time ${Math.ceil(timeout / 1000)} -X ${method} ${headerArgs} ${bodyArg} "${url}"`

  try {
    const output = execSync(cmd, { encoding: 'utf-8', timeout })
    const lines = output.trim().split('\n')
    const statusCode = parseInt(lines.pop() || '0', 10)
    const responseBody = lines.join('\n')

    return {
      ok: statusCode >= 200 && statusCode < 300,
      status: statusCode,
      text: async () => responseBody,
      json: async () => JSON.parse(responseBody),
    }
  } catch (error) {
    throw new Error(`Curl request failed: ${(error as Error).message}`)
  }
}

/**
 * Solana Actions Client
 * Implements the Solana Actions specification for fetching and executing actions
 */
export class ActionsClient {
  private timeout: number
  private useCurl: boolean

  constructor(options: { timeout?: number; useCurl?: boolean } = {}) {
    this.timeout = options.timeout || 30000
    // Use curl by default to bypass Cloudflare TLS fingerprinting
    this.useCurl = options.useCurl ?? true
  }

  /**
   * Parse a blink/action URL to extract the actual action endpoint
   * Supports formats:
   * - solana-action:https://...
   * - blink:https://...
   * - https://dial.to/?action=...
   * - https://... (direct action URL)
   */
  parseActionUrl(url: string): string {
    // Handle solana-action: protocol
    if (url.startsWith('solana-action:')) {
      return url.slice(14)
    }

    // Handle blink: protocol (our internal format)
    if (url.startsWith('blink:')) {
      return url.slice(6)
    }

    // Handle dial.to interstitial URLs
    if (url.includes('dial.to') && url.includes('action=')) {
      const urlObj = new URL(url)
      const actionParam = urlObj.searchParams.get('action')
      if (actionParam) {
        return decodeURIComponent(actionParam)
      }
    }

    return url
  }

  /**
   * Check if a URL is from a trusted action host
   */
  isTrustedHost(url: string): boolean {
    try {
      const hostname = new URL(url).hostname
      return TRUSTED_HOSTS.some((host) => hostname === host || hostname.endsWith('.' + host))
    } catch {
      return false
    }
  }

  /**
   * GET action metadata from an action URL
   * Returns information about the action (title, description, available actions)
   */
  async getAction(actionUrl: string): Promise<BlinkMetadata> {
    const url = this.parseActionUrl(actionUrl)

    const headers = {
      ...ACTIONS_HEADERS,
      'User-Agent': USER_AGENT,
    }

    try {
      let response: {
        ok: boolean
        status: number
        text: () => Promise<string>
        json: () => Promise<unknown>
      }

      if (this.useCurl) {
        response = await curlFetch(url, { method: 'GET', headers, timeout: this.timeout })
      } else {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const fetchResponse = await fetch(url, {
          method: 'GET',
          headers,
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        response = {
          ok: fetchResponse.ok,
          status: fetchResponse.status,
          text: () => fetchResponse.text(),
          json: () => fetchResponse.json(),
        }
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new ActionError(
          `Failed to fetch action: ${response.status}`,
          response.status,
          errorText,
        )
      }

      const data = (await response.json()) as BlinkMetadata
      return data
    } catch (error) {
      if (error instanceof ActionError) throw error
      throw new ActionError(
        `Failed to fetch action: ${(error as Error).message}`,
        500,
        (error as Error).message,
      )
    }
  }

  /**
   * POST to action URL with user's wallet account
   * Returns a transaction to sign
   */
  async postAction(
    actionUrl: string,
    account: string,
    params?: Record<string, string | number>,
  ): Promise<BlinkTransaction> {
    let url = this.parseActionUrl(actionUrl)

    // Add parameters to URL if provided
    if (params && Object.keys(params).length > 0) {
      const urlObj = new URL(url)
      Object.entries(params).forEach(([key, value]) => {
        urlObj.searchParams.set(key, String(value))
      })
      url = urlObj.toString()
    }

    const headers = {
      ...ACTIONS_HEADERS,
      'User-Agent': USER_AGENT,
    }
    const body = JSON.stringify({ account, type: 'transaction' })

    try {
      let response: {
        ok: boolean
        status: number
        text: () => Promise<string>
        json: () => Promise<unknown>
      }

      if (this.useCurl) {
        response = await curlFetch(url, { method: 'POST', headers, body, timeout: this.timeout })
      } else {
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), this.timeout)

        const fetchResponse = await fetch(url, {
          method: 'POST',
          headers,
          body,
          signal: controller.signal,
        })
        clearTimeout(timeoutId)

        response = {
          ok: fetchResponse.ok,
          status: fetchResponse.status,
          text: () => fetchResponse.text(),
          json: () => fetchResponse.json(),
        }
      }

      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error')
        throw new ActionError(
          `Failed to post action: ${response.status}`,
          response.status,
          errorText,
        )
      }

      const data = (await response.json()) as BlinkTransaction
      return data
    } catch (error) {
      if (error instanceof ActionError) throw error
      throw new ActionError(
        `Failed to post action: ${(error as Error).message}`,
        500,
        (error as Error).message,
      )
    }
  }

  /**
   * Inspect an action URL - get metadata and list all available actions
   */
  async inspect(actionUrl: string): Promise<{
    url: string
    trusted: boolean
    metadata: BlinkMetadata
    actions: Array<{
      label: string
      href: string
      parameters?: BlinkParameter[]
    }>
  }> {
    const url = this.parseActionUrl(actionUrl)
    const trusted = this.isTrustedHost(url)
    const metadata = await this.getAction(url)

    const actions: Array<{
      label: string
      href: string
      parameters?: BlinkParameter[]
    }> = []

    // Add main action if no linked actions
    if (metadata.label && !metadata.links?.actions?.length) {
      actions.push({
        label: metadata.label,
        href: url,
      })
    }

    // Add linked actions
    if (metadata.links?.actions) {
      for (const action of metadata.links.actions) {
        const href = action.href.startsWith('http')
          ? action.href
          : `${new URL(url).origin}${action.href}`

        actions.push({
          label: action.label,
          href,
          parameters: action.parameters,
        })
      }
    }

    return {
      url,
      trusted,
      metadata,
      actions,
    }
  }

  /**
   * Build an action URL with parameters
   */
  buildActionUrl(baseUrl: string, params: Record<string, string | number>): string {
    const url = new URL(this.parseActionUrl(baseUrl))
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, String(value))
    })
    return url.toString()
  }

  /**
   * Get action URLs for a known protocol
   */
  getProtocolActions(
    protocol: keyof typeof PROTOCOL_ACTIONS,
  ): (typeof PROTOCOL_ACTIONS)[keyof typeof PROTOCOL_ACTIONS] | undefined {
    return PROTOCOL_ACTIONS[protocol]
  }
}

/**
 * Action-specific error class
 */
export class ActionError extends Error {
  public readonly statusCode: number
  public readonly details: string

  constructor(message: string, statusCode: number, details: string) {
    super(message)
    this.name = 'ActionError'
    this.statusCode = statusCode
    this.details = details
  }

  toJSON() {
    return {
      error: this.message,
      code: this.statusCode,
      details: this.details,
    }
  }
}

/**
 * Create an ActionsClient instance
 */
export function createActionsClient(options?: { timeout?: number }): ActionsClient {
  return new ActionsClient(options)
}

/**
 * Convenience function to get action metadata
 */
export async function getAction(url: string): Promise<BlinkMetadata> {
  const client = createActionsClient()
  return client.getAction(url)
}

/**
 * Convenience function to post action and get transaction
 */
export async function postAction(
  url: string,
  account: string,
  params?: Record<string, string | number>,
): Promise<BlinkTransaction> {
  const client = createActionsClient()
  return client.postAction(url, account, params)
}

export default ActionsClient
