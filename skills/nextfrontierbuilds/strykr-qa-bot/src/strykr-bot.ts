/**
 * StrykrQABot - Strykr-specific QA automation
 * Extends web-qa-bot with Strykr-specific functionality
 */

import {
  AIResponseOptions,
  checkPrismEndpoints,
  expectAIResponse,
  expectSignalCard,
  PrismEndpoint,
  SignalCardOptions,
} from './assertions'

export interface StrykrConfig {
  baseUrl: string
  browser?: {
    headless?: boolean
    timeout?: number
    screenshotDir?: string
    consoleCapture?: boolean
  }
  prismEndpoints?: PrismEndpoint[]
  knownIssuesFile?: string
}

export interface TestResult {
  name: string
  status: 'pass' | 'fail' | 'skip' | 'known-issue'
  duration: number
  error?: string
  screenshot?: string
  knownIssue?: string
}

export interface SuiteResult {
  name: string
  tests: TestResult[]
  passed: number
  failed: number
  skipped: number
  knownIssues: number
  duration: number
}

/**
 * StrykrQABot - Main class for Strykr QA automation
 */
export class StrykrQABot {
  private config: StrykrConfig
  private results: SuiteResult[] = []

  constructor(config: StrykrConfig) {
    this.config = {
      baseUrl: config.baseUrl || 'https://app.strykr.ai',
      browser: {
        headless: config.browser?.headless ?? false,
        timeout: config.browser?.timeout ?? 30000,
        screenshotDir: config.browser?.screenshotDir ?? './screenshots',
        consoleCapture: config.browser?.consoleCapture ?? true,
        ...config.browser,
      },
      prismEndpoints: config.prismEndpoints || [],
      knownIssuesFile: config.knownIssuesFile || './config/known-issues.yaml',
    }
  }

  /**
   * Run a test suite
   */
  async runSuite(suitePath: string): Promise<SuiteResult> {
    console.log(`Running suite: ${suitePath}`)

    // In real implementation, this would:
    // 1. Load the YAML suite
    // 2. Initialize browser via web-qa-bot
    // 3. Execute each test
    // 4. Capture screenshots
    // 5. Return results

    const result: SuiteResult = {
      name: suitePath,
      tests: [],
      passed: 0,
      failed: 0,
      skipped: 0,
      knownIssues: 0,
      duration: 0,
    }

    this.results.push(result)
    return result
  }

  /**
   * Run all configured test suites
   */
  async runAll(): Promise<SuiteResult[]> {
    const suites = [
      'homepage.yaml',
      'crypto-signals.yaml',
      'stock-signals.yaml',
      'news.yaml',
      'events.yaml',
      'ai-chat.yaml',
    ]

    for (const suite of suites) {
      await this.runSuite(`./test-suites/${suite}`)
    }

    return this.results
  }

  /**
   * Check signal card has required components
   */
  async expectSignalCard(options: SignalCardOptions): Promise<boolean> {
    return expectSignalCard(options)
  }

  /**
   * Validate AI response quality
   */
  async expectAIResponse(options: AIResponseOptions): Promise<boolean> {
    return expectAIResponse(options)
  }

  /**
   * Health check PRISM API endpoints
   */
  async checkPrismEndpoints(): Promise<Map<string, boolean>> {
    return checkPrismEndpoints(this.config.baseUrl, this.config.prismEndpoints || [])
  }

  /**
   * Generate markdown report
   */
  generateReport(): string {
    let report = `# Strykr QA Report\n\n`
    report += `**Base URL:** ${this.config.baseUrl}\n`
    report += `**Generated:** ${new Date().toISOString()}\n\n`

    let totalPassed = 0
    let totalFailed = 0
    let totalSkipped = 0
    let totalKnown = 0

    for (const suite of this.results) {
      report += `## ${suite.name}\n\n`
      report += `| Test | Status | Duration |\n`
      report += `|------|--------|----------|\n`

      for (const test of suite.tests) {
        const statusIcon = this.getStatusIcon(test.status)
        report += `| ${test.name} | ${statusIcon} ${test.status} | ${test.duration}ms |\n`
      }

      report += `\n`
      totalPassed += suite.passed
      totalFailed += suite.failed
      totalSkipped += suite.skipped
      totalKnown += suite.knownIssues
    }

    report += `## Summary\n\n`
    report += `- **Passed:** ${totalPassed}\n`
    report += `- **Failed:** ${totalFailed}\n`
    report += `- **Skipped:** ${totalSkipped}\n`
    report += `- **Known Issues:** ${totalKnown}\n`

    return report
  }

  private getStatusIcon(status: string): string {
    switch (status) {
      case 'pass':
        return '✅'
      case 'fail':
        return '❌'
      case 'skip':
        return '⏭️'
      case 'known-issue':
        return '⚠️'
      default:
        return '❓'
    }
  }
}
