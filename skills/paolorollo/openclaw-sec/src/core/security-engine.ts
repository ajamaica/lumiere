import * as crypto from 'crypto'

import { CommandValidator } from '../modules/command-validator/validator'
import { ContentScanner } from '../modules/content-scanner/scanner'
import { PathValidator } from '../modules/path-validator/validator'
import { PromptInjectionDetector } from '../modules/prompt-injection/detector'
import { SecretDetector } from '../modules/secret-detector/detector'
import { URLValidator } from '../modules/url-validator/validator'
import { Action, Finding, SecurityConfig, Severity, ValidationResult } from '../types'
import { ActionEngine } from './action-engine'
import { AsyncQueue } from './async-queue'
import { DatabaseManager, SecurityEvent } from './database-manager'
import { SeverityScorer } from './severity-scorer'

/**
 * Validation metadata
 */
export interface ValidationMetadata {
  userId: string
  sessionId: string
  context?: Record<string, any>
}

/**
 * SecurityEngine is the main orchestrator that coordinates all detection modules,
 * severity scoring, action determination, and async writes.
 *
 * Architecture:
 * - Runs all 6 detection modules in parallel
 * - Aggregates findings with SeverityScorer
 * - Determines action with ActionEngine
 * - Returns results in ~20-50ms
 * - Queues DB writes and notifications asynchronously
 *
 * @example
 * ```typescript
 * const config = await ConfigManager.load('security-config.yaml');
 * const dbManager = new DatabaseManager('.openclaw-sec.db');
 * const engine = new SecurityEngine(config, dbManager);
 *
 * const result = await engine.validate('User input text', {
 *   userId: 'user-123',
 *   sessionId: 'session-456'
 * });
 *
 * console.log(result.severity); // SAFE, LOW, MEDIUM, HIGH, or CRITICAL
 * console.log(result.action); // allow, log, warn, block, or block_notify
 *
 * await engine.stop(); // Cleanup
 * ```
 */
export class SecurityEngine {
  private readonly config: SecurityConfig
  private readonly dbManager: DatabaseManager
  private readonly severityScorer: SeverityScorer
  private readonly actionEngine: ActionEngine
  private readonly writeQueue: AsyncQueue

  // Detection modules
  private readonly promptInjectionDetector: PromptInjectionDetector | null = null
  private readonly commandValidator: CommandValidator | null = null
  private readonly urlValidator: URLValidator | null = null
  private readonly pathValidator: PathValidator | null = null
  private readonly secretDetector: SecretDetector | null = null
  private readonly contentScanner: ContentScanner | null = null

  /**
   * Creates a new SecurityEngine instance
   *
   * @param config - Security configuration
   * @param dbManager - Database manager
   * @throws Error if config or dbManager is missing
   */
  constructor(config: SecurityConfig, dbManager?: DatabaseManager | null) {
    if (!config) {
      throw new Error('Configuration is required')
    }

    this.config = config
    this.dbManager = dbManager!
    this.severityScorer = new SeverityScorer()
    this.actionEngine = new ActionEngine(config, dbManager)

    // Initialize async write queue (skip DB writes if no dbManager)
    this.writeQueue = new AsyncQueue({
      batchSize: 50,
      flushInterval: 100,
      onBatch: async (events: SecurityEvent[]) => {
        if (!this.dbManager) return // Skip DB writes in NO_DB mode
        try {
          events.forEach((event) => {
            this.dbManager.insertEvent(event)
          })
        } catch (error) {
          console.error('Error writing security events to database:', error)
        }
      },
    })

    // Initialize enabled modules
    if (config.modules.prompt_injection?.enabled) {
      this.promptInjectionDetector = new PromptInjectionDetector(config.modules.prompt_injection)
    }
    if (config.modules.command_validator?.enabled) {
      this.commandValidator = new CommandValidator(config.modules.command_validator)
    }
    if (config.modules.url_validator?.enabled) {
      this.urlValidator = new URLValidator(config.modules.url_validator)
    }
    if (config.modules.path_validator?.enabled) {
      this.pathValidator = new PathValidator(config.modules.path_validator)
    }
    if (config.modules.secret_detector?.enabled) {
      this.secretDetector = new SecretDetector(config.modules.secret_detector)
    }
    if (config.modules.content_scanner?.enabled) {
      this.contentScanner = new ContentScanner(config.modules.content_scanner)
    }
  }

  /**
   * Validate input text against all security modules
   *
   * @param text - Input text to validate
   * @param metadata - Validation metadata (userId, sessionId, etc.)
   * @returns ValidationResult with severity, action, and findings
   * @throws Error if metadata is invalid
   */
  async validate(text: string, metadata: ValidationMetadata): Promise<ValidationResult> {
    // Validate metadata
    if (!metadata.userId || metadata.userId.trim().length === 0) {
      throw new Error('User ID is required in validation metadata')
    }

    if (!metadata.sessionId || metadata.sessionId.trim().length === 0) {
      throw new Error('Session ID is required in validation metadata')
    }

    // Check if security is enabled
    if (!this.config.enabled) {
      return this.createSafeResult(text)
    }

    // Run all detection modules in parallel
    const detectionPromises: Promise<Finding[]>[] = []

    if (this.promptInjectionDetector) {
      detectionPromises.push(this.promptInjectionDetector.scan(text).catch(() => []))
    }

    if (this.commandValidator) {
      detectionPromises.push(this.commandValidator.validate(text).catch(() => []))
    }

    if (this.urlValidator) {
      detectionPromises.push(this.urlValidator.validate(text).catch(() => []))
    }

    if (this.pathValidator) {
      detectionPromises.push(this.pathValidator.validate(text).catch(() => []))
    }

    if (this.secretDetector) {
      detectionPromises.push(this.secretDetector.scan(text).catch(() => []))
    }

    if (this.contentScanner) {
      detectionPromises.push(this.contentScanner.scan(text).catch(() => []))
    }

    // Wait for all modules to complete
    const results = await Promise.all(detectionPromises)

    // Aggregate all findings
    const allFindings: Finding[] = results.flat()

    // Calculate severity
    const severityResult = this.severityScorer.calculateSeverity(allFindings)

    // Determine action
    const actionResult = await this.actionEngine.determineAction(
      severityResult.severity,
      metadata.userId,
    )

    // Generate fingerprint
    const fingerprint = this.generateFingerprint(text)

    // Create validation result
    const result: ValidationResult = {
      severity: severityResult.severity,
      action: actionResult.action,
      findings: allFindings,
      fingerprint,
      timestamp: new Date(),
      normalizedText: this.normalizeText(text),
      recommendations: this.generateRecommendations(allFindings, actionResult.action),
    }

    // Queue async database write
    this.queueDatabaseWrite(result, metadata)

    return result
  }

  /**
   * Stop the security engine and flush pending writes
   */
  async stop(): Promise<void> {
    await this.writeQueue.flush()
    this.writeQueue.stop()
  }

  /**
   * Create a safe result for clean input
   * @private
   */
  private createSafeResult(text: string): ValidationResult {
    return {
      severity: Severity.SAFE,
      action: Action.ALLOW,
      findings: [],
      fingerprint: this.generateFingerprint(text),
      timestamp: new Date(),
      normalizedText: this.normalizeText(text),
      recommendations: [],
    }
  }

  /**
   * Generate a fingerprint for the input text
   * @private
   */
  private generateFingerprint(text: string): string {
    const normalized = this.normalizeText(text)
    return crypto.createHash('sha256').update(normalized).digest('hex').substring(0, 16)
  }

  /**
   * Normalize text for fingerprinting
   * @private
   */
  private normalizeText(text: string): string {
    return text.toLowerCase().replace(/\s+/g, ' ').trim()
  }

  /**
   * Generate actionable recommendations based on findings
   * @private
   */
  private generateRecommendations(findings: Finding[], action: Action): string[] {
    const recommendations: string[] = []

    if (findings.length === 0) {
      return recommendations
    }

    // Group findings by module
    const moduleGroups = new Map<string, Finding[]>()
    findings.forEach((finding) => {
      const existing = moduleGroups.get(finding.module) || []
      existing.push(finding)
      moduleGroups.set(finding.module, existing)
    })

    // Generate recommendations per module
    moduleGroups.forEach((moduleFindings, module) => {
      switch (module) {
        case 'prompt_injection':
          recommendations.push('Review input for potential prompt injection attempts')
          recommendations.push('Consider implementing input sanitization')
          break
        case 'command_validator':
          recommendations.push('Validate and sanitize any system commands')
          recommendations.push('Use parameterized commands instead of string concatenation')
          break
        case 'url_validator':
          recommendations.push('Validate and whitelist allowed URL patterns')
          recommendations.push('Implement URL parsing and domain verification')
          break
        case 'path_validator':
          recommendations.push('Validate file paths against allowed directories')
          recommendations.push('Use path normalization to prevent traversal attacks')
          break
        case 'secret_detector':
          recommendations.push('Remove any exposed secrets or credentials')
          recommendations.push('Rotate compromised credentials immediately')
          break
        case 'content_scanner':
          recommendations.push('Review content for policy violations')
          recommendations.push('Implement content filtering or moderation')
          break
      }
    })

    // Add action-specific recommendations
    if (action === Action.BLOCK || action === Action.BLOCK_NOTIFY) {
      recommendations.push('This request has been blocked due to security concerns')
      recommendations.push('Contact security team if you believe this is a false positive')
    }

    // Deduplicate recommendations
    return Array.from(new Set(recommendations))
  }

  /**
   * Queue database write for async processing
   * @private
   */
  private queueDatabaseWrite(result: ValidationResult, metadata: ValidationMetadata): void {
    try {
      const normalizedText = result.normalizedText || '-'
      const event: SecurityEvent = {
        event_type: 'validation',
        severity: result.severity,
        action_taken: result.action,
        user_id: metadata.userId,
        session_id: metadata.sessionId,
        input_text: normalizedText,
        patterns_matched: JSON.stringify(
          result.findings.map((f) => ({
            module: f.module,
            patternId: f.pattern.id,
            severity: f.severity,
          })),
        ),
        fingerprint: result.fingerprint,
        module: result.findings.length > 0 ? result.findings[0].module : 'none',
        metadata: JSON.stringify({
          findingCount: result.findings.length,
          modulesConcerned: Array.from(new Set(result.findings.map((f) => f.module))),
          context: metadata.context,
        }),
      }

      this.writeQueue.enqueue(event)
    } catch (error) {
      console.error('Error queuing database write:', error)
    }
  }
}
