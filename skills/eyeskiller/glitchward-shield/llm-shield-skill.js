/**
 * LLM Shield Skill for OpenClaw
 *
 * Protects your OpenClaw assistant from prompt injection attacks.
 * LLM Shield validates all incoming messages before they're processed,
 * blocking malicious attempts to manipulate your AI.
 *
 * @author Glitchward (https://glitchward.com)
 * @license MIT
 * @version 1.0.0
 */

const SHIELD_API_URL = 'https://glitchward.com/api/shield/validate'

/**
 * LLM Shield Configuration
 * Get your free API token at: https://glitchward.com/shield/settings
 */
const config = {
  // Your Shield API token (required)
  apiToken: process.env.GLITCHWARD_SHIELD_TOKEN || '',

  // Block messages or just warn (default: block)
  mode: process.env.SHIELD_MODE || 'block', // "block" | "warn" | "log"

  // Minimum risk score to trigger action (0.0 - 1.0)
  riskThreshold: parseFloat(process.env.SHIELD_THRESHOLD) || 0.5,

  // Log all checks to console
  verbose: process.env.SHIELD_VERBOSE === 'true',
}

/**
 * Validates a message against LLM Shield
 * @param {string} message - The user message to validate
 * @returns {Promise<{safe: boolean, blocked: boolean, risk_score: number, threats: Array}>}
 */
async function validateMessage(message) {
  if (!config.apiToken) {
    console.warn(
      '[LLM Shield] No API token configured. Get one at https://glitchward.com/shield/settings',
    )
    return { safe: true, blocked: false, risk_score: 0, threats: [] }
  }

  try {
    const response = await fetch(SHIELD_API_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Shield-Token': config.apiToken,
      },
      body: JSON.stringify({
        messages: [{ role: 'user', content: message }],
        provider: 'openclaw',
        model: 'assistant',
      }),
    })

    if (!response.ok) {
      console.error(`[LLM Shield] API error: ${response.status}`)
      return { safe: true, blocked: false, risk_score: 0, threats: [], error: true }
    }

    const result = await response.json()

    if (config.verbose) {
      console.log('[LLM Shield] Check result:', {
        safe: result.safe,
        blocked: result.blocked,
        risk_score: result.risk_score,
        processing_time_ms: result.processing_time_ms,
      })
    }

    return {
      safe: result.safe,
      blocked: result.blocked,
      risk_score: result.risk_score || 0,
      threats: result.matches || [],
      processing_time_ms: result.processing_time_ms,
    }
  } catch (error) {
    console.error('[LLM Shield] Network error:', error.message)
    // Fail open - allow message if Shield is unreachable
    return { safe: true, blocked: false, risk_score: 0, threats: [], error: true }
  }
}

/**
 * Format threat information for display
 * @param {Array} threats - Array of detected threats
 * @returns {string} Formatted threat summary
 */
function formatThreats(threats) {
  if (!threats || threats.length === 0) return ''

  return threats
    .map((t) => {
      const severity = (t.severity || 'unknown').toUpperCase()
      const category = t.category || 'unknown'
      const desc = t.description || ''
      return `  - [${severity}] ${category}: ${desc}`
    })
    .join('\n')
}

/**
 * OpenClaw Skill Definition
 */
export const skill = {
  name: 'llm-shield',
  version: '1.0.0',
  description: 'Protects against prompt injection attacks using Glitchward LLM Shield',
  author: 'Glitchward',
  homepage: 'https://glitchward.com/shield',

  /**
   * Configuration schema for OpenClaw
   */
  config: {
    apiToken: {
      type: 'string',
      required: true,
      secret: true,
      description: 'Your LLM Shield API token from glitchward.com/shield/settings',
    },
    mode: {
      type: 'string',
      default: 'block',
      options: ['block', 'warn', 'log'],
      description: 'How to handle detected threats: block, warn, or just log',
    },
    riskThreshold: {
      type: 'number',
      default: 0.5,
      min: 0,
      max: 1,
      description: 'Minimum risk score (0-1) to trigger action',
    },
  },

  /**
   * Hook: Runs before each message is processed
   * @param {Object} ctx - OpenClaw context
   * @returns {boolean} Whether to continue processing
   */
  async beforeMessage(ctx) {
    const message = ctx.message?.content || ctx.message

    if (!message || typeof message !== 'string') {
      return true // Continue - no message to check
    }

    const result = await validateMessage(message)

    // Always log if verbose
    if (config.verbose) {
      console.log(
        `[LLM Shield] Message checked: risk=${result.risk_score.toFixed(2)}, blocked=${result.blocked}`,
      )
    }

    // Check if we should take action
    const shouldAct = result.blocked || result.risk_score >= config.riskThreshold

    if (!shouldAct) {
      return true // Safe - continue processing
    }

    // Handle based on mode
    const threatSummary = formatThreats(result.threats)
    const riskPercent = Math.round(result.risk_score * 100)

    switch (config.mode) {
      case 'block':
        // Block the message entirely
        ctx.respond(`🛡️ **Message blocked by LLM Shield**

Your message was detected as a potential security threat.

**Risk Score:** ${riskPercent}%
**Detected Threats:**
${threatSummary || '  - Suspicious pattern detected'}

If you believe this is a mistake, please rephrase your request.

_Protected by [Glitchward LLM Shield](https://glitchward.com/shield)_`)
        return false // Stop processing

      case 'warn':
        // Warn but continue
        ctx.addSystemNote(
          `⚠️ LLM Shield Warning: This message has a ${riskPercent}% risk score. Detected: ${result.threats.map((t) => t.category).join(', ')}`,
        )
        return true // Continue with warning

      case 'log':
        // Just log, no user-facing action
        console.warn(`[LLM Shield] High-risk message detected (${riskPercent}%):`, threatSummary)
        return true // Continue silently

      default:
        return true
    }
  },

  /**
   * Slash command: /shield-status
   * Check Shield configuration and test connectivity
   */
  commands: {
    'shield-status': {
      description: 'Check LLM Shield status and configuration',
      async handler(ctx) {
        const hasToken = !!config.apiToken

        let status = `🛡️ **LLM Shield Status**\n\n`
        status += `**Token configured:** ${hasToken ? '✅ Yes' : '❌ No'}\n`
        status += `**Mode:** ${config.mode}\n`
        status += `**Risk threshold:** ${config.riskThreshold * 100}%\n`
        status += `**Verbose logging:** ${config.verbose ? 'On' : 'Off'}\n\n`

        if (hasToken) {
          // Test API connectivity
          const testResult = await validateMessage('test connection')
          if (testResult.error) {
            status += `**API Status:** ⚠️ Connection issue\n`
          } else {
            status += `**API Status:** ✅ Connected (${testResult.processing_time_ms}ms)\n`
          }
        } else {
          status += `\n⚠️ Get your free API token at: https://glitchward.com/shield/settings`
        }

        ctx.respond(status)
      },
    },

    'shield-test': {
      description: "Test a message against LLM Shield (doesn't execute)",
      args: '<message>',
      async handler(ctx, message) {
        if (!message) {
          ctx.respond('Usage: /shield-test <message to test>')
          return
        }

        const result = await validateMessage(message)
        const riskPercent = Math.round(result.risk_score * 100)
        const threatSummary = formatThreats(result.threats)

        let response = `🛡️ **LLM Shield Test Result**\n\n`
        response += `**Message:** "${message.substring(0, 100)}${message.length > 100 ? '...' : ''}"\n`
        response += `**Safe:** ${result.safe ? '✅ Yes' : '❌ No'}\n`
        response += `**Would block:** ${result.blocked ? 'Yes' : 'No'}\n`
        response += `**Risk Score:** ${riskPercent}%\n`

        if (result.threats && result.threats.length > 0) {
          response += `\n**Detected Threats:**\n${threatSummary}`
        }

        response += `\n\n_Processed in ${result.processing_time_ms}ms_`

        ctx.respond(response)
      },
    },
  },

  /**
   * Hook: Initialization
   */
  async onLoad(ctx) {
    if (!config.apiToken) {
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
      console.warn('  LLM Shield: No API token configured!')
      console.warn('  Your assistant is NOT protected from prompt injection.')
      console.warn('  Get your free token: https://glitchward.com/shield/settings')
      console.warn('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
    } else {
      console.log('🛡️ LLM Shield loaded - protecting against prompt injection attacks')
    }
  },
}

export default skill
