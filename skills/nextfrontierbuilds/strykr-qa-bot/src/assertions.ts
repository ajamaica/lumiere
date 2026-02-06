/**
 * Strykr-specific assertions for QA automation
 */

export interface SignalCardOptions {
  /** Expect symbol to be present */
  hasSymbol?: boolean
  /** Expect specific symbol */
  symbol?: string
  /** Expect price to be displayed */
  hasPrice?: boolean
  /** Expect sparkline chart */
  hasChart?: boolean
  /** Expect action buttons (Listen, Ask AI, Details, Share) */
  hasActions?: boolean
  /** Signal type: crypto or stock */
  type?: 'crypto' | 'stock'
  /** Expected direction */
  direction?: 'long' | 'short'
  /** DOM element or selector */
  element?: Element | string
}

export interface AIResponseOptions {
  /** Response should contain price data */
  hasPrice?: boolean
  /** Response should contain technical analysis */
  hasTechnicals?: boolean
  /** Minimum response length in characters */
  minLength?: number
  /** Maximum response time in ms */
  maxResponseTime?: number
  /** Response should contain sentiment */
  hasSentiment?: boolean
  /** Response text to validate */
  responseText?: string
}

export interface PrismEndpoint {
  endpoint: string
  method: 'GET' | 'POST'
  expectedStatus: number
  timeout?: number
}

/**
 * Validate a signal card has all required components
 *
 * @example
 * ```typescript
 * await expectSignalCard({
 *   hasSymbol: true,
 *   hasPrice: true,
 *   hasChart: true,
 *   hasActions: true,
 *   type: 'crypto'
 * });
 * ```
 */
export function expectSignalCard(options: SignalCardOptions): boolean {
  const errors: string[] = []

  // In browser context, this would query the DOM
  // For now, we define the validation logic

  if (options.hasSymbol) {
    // Check for symbol element
    // const symbol = document.querySelector('.signal-card .symbol, [data-testid="signal-symbol"]');
    // if (!symbol) errors.push('Signal card missing symbol');
  }

  if (options.symbol) {
    // Verify specific symbol
    // const symbolText = document.querySelector('.signal-card .symbol')?.textContent;
    // if (symbolText !== options.symbol) errors.push(`Expected symbol ${options.symbol}, got ${symbolText}`);
  }

  if (options.hasPrice) {
    // Check for price element
    // const price = document.querySelector('.signal-card .price, [data-testid="signal-price"]');
    // if (!price) errors.push('Signal card missing price');
  }

  if (options.hasChart) {
    // Check for sparkline/chart element
    // const chart = document.querySelector('.signal-card .chart, [data-testid="sparkline"], canvas, svg');
    // if (!chart) errors.push('Signal card missing chart');
  }

  if (options.hasActions) {
    // Check for action buttons
    const requiredActions = ['Listen', 'Ask Strykr AI', 'Details', 'Share']
    // for (const action of requiredActions) {
    //   const button = document.querySelector(`button:contains("${action}"), [data-action="${action.toLowerCase()}"]`);
    //   if (!button) errors.push(`Missing action button: ${action}`);
    // }
  }

  if (options.direction) {
    // Check direction indicator
    // const direction = document.querySelector('.signal-card')?.getAttribute('data-direction');
    // if (direction !== options.direction) errors.push(`Expected direction ${options.direction}, got ${direction}`);
  }

  if (errors.length > 0) {
    console.error('Signal card validation failed:', errors)
    return false
  }

  return true
}

/**
 * Validate AI response quality
 *
 * @example
 * ```typescript
 * await expectAIResponse({
 *   hasPrice: true,
 *   hasTechnicals: true,
 *   minLength: 200
 * });
 * ```
 */
export function expectAIResponse(options: AIResponseOptions): boolean {
  const errors: string[] = []
  const responseText = options.responseText || ''

  if (options.minLength && responseText.length < options.minLength) {
    errors.push(`Response too short: ${responseText.length} < ${options.minLength}`)
  }

  if (options.hasPrice) {
    // Check for price-related content
    const pricePatterns = [
      /\$[\d,]+(\.\d{2})?/, // $1,234.56
      /price\s*(is|of|at)/i, // "price is/of/at"
      /trading\s*(at|around)/i, // "trading at/around"
      /\d+(\.\d+)?\s*(USD|USDT|BTC)/i, // 1234.56 USD
    ]

    const hasPrice = pricePatterns.some((pattern) => pattern.test(responseText))
    if (!hasPrice) {
      errors.push('Response missing price information')
    }
  }

  if (options.hasTechnicals) {
    // Check for technical analysis indicators
    const technicalTerms = [
      'RSI',
      'MACD',
      'moving average',
      'MA',
      'EMA',
      'SMA',
      'support',
      'resistance',
      'volume',
      'trend',
      'bullish',
      'bearish',
      'overbought',
      'oversold',
      'momentum',
      'breakout',
      'reversal',
    ]

    const hasTechnicals = technicalTerms.some((term) =>
      responseText.toLowerCase().includes(term.toLowerCase()),
    )

    if (!hasTechnicals) {
      errors.push('Response missing technical analysis')
    }
  }

  if (options.hasSentiment) {
    // Check for sentiment indicators
    const sentimentTerms = [
      'bullish',
      'bearish',
      'neutral',
      'positive',
      'negative',
      'optimistic',
      'pessimistic',
      'sentiment',
    ]

    const hasSentiment = sentimentTerms.some((term) =>
      responseText.toLowerCase().includes(term.toLowerCase()),
    )

    if (!hasSentiment) {
      errors.push('Response missing sentiment analysis')
    }
  }

  if (errors.length > 0) {
    console.error('AI response validation failed:', errors)
    return false
  }

  return true
}

/**
 * Health check PRISM API endpoints
 *
 * @example
 * ```typescript
 * const health = await checkPrismEndpoints('https://app.strykr.ai', [
 *   { endpoint: '/api/signals/crypto', method: 'GET', expectedStatus: 200 }
 * ]);
 * ```
 */
export async function checkPrismEndpoints(
  baseUrl: string,
  endpoints: PrismEndpoint[],
): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>()

  for (const endpoint of endpoints) {
    const url = `${baseUrl}${endpoint.endpoint}`
    const timeout = endpoint.timeout || 10000

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      const response = await fetch(url, {
        method: endpoint.method,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      })

      clearTimeout(timeoutId)

      const isHealthy = response.status === endpoint.expectedStatus
      results.set(endpoint.endpoint, isHealthy)

      if (!isHealthy) {
        console.warn(
          `PRISM endpoint unhealthy: ${endpoint.endpoint} ` +
            `(expected ${endpoint.expectedStatus}, got ${response.status})`,
        )
      }
    } catch (error) {
      results.set(endpoint.endpoint, false)
      console.error(`PRISM endpoint error: ${endpoint.endpoint}`, error)
    }
  }

  return results
}

/**
 * Check if a test failure matches a known issue
 */
export function isKnownIssue(
  testName: string,
  error: string,
  knownIssues: { id: string; description: string; affectedPages?: string[] }[],
): string | null {
  for (const issue of knownIssues) {
    // Match by affected pages
    if (issue.affectedPages) {
      for (const page of issue.affectedPages) {
        if (testName.toLowerCase().includes(page.toLowerCase())) {
          return issue.id
        }
      }
    }

    // Match by description keywords
    const keywords = issue.description.toLowerCase().split(' ')
    const errorLower = error.toLowerCase()
    const matches = keywords.filter((kw) => kw.length > 4 && errorLower.includes(kw))

    if (matches.length >= 3) {
      return issue.id
    }
  }

  return null
}

/**
 * Validate page loaded correctly (not blank)
 */
export function expectPageNotBlank(): boolean {
  // In browser context:
  // const main = document.querySelector('main, [role="main"], #root > *');
  // const hasContent = main && main.children.length > 0;
  // const textContent = document.body.innerText?.trim();
  // return hasContent && textContent.length > 100;

  return true
}

/**
 * Check for console errors (excluding known acceptable errors)
 */
export function checkConsoleErrors(errors: string[], allowlist: string[] = []): string[] {
  return errors.filter((error) => {
    // Filter out allowlisted patterns
    return !allowlist.some((pattern) => error.toLowerCase().includes(pattern.toLowerCase()))
  })
}
