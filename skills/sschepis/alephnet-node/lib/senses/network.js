/**
 * Network Sense - Connectivity Awareness
 *
 * Awareness of external connections:
 * - LLM connection status
 * - API latency
 * - Token usage tracking
 */

const { Sense } = require('./base')

class NetworkSense extends Sense {
  constructor(options = {}) {
    super({ name: 'network', ...options })
    this.refreshRate = 10000 // 10 seconds

    // LLM tracking
    this.llmUrl = options.llmUrl || 'http://localhost:1234/v1'
    this.llmConnected = false
    this.llmModel = null
    this.lastCallTime = null
    this.lastLatency = 0
    this.callsThisSession = 0
    this.tokensIn = 0
    this.tokensOut = 0
    this.lastError = null
  }

  /**
   * Record a successful LLM call
   */
  recordCall(latencyMs, tokensIn = 0, tokensOut = 0) {
    this.llmConnected = true
    this.lastCallTime = Date.now()
    this.lastLatency = latencyMs
    this.callsThisSession++
    this.tokensIn += tokensIn
    this.tokensOut += tokensOut
    this.lastError = null
  }

  /**
   * Record an LLM error
   */
  recordError(error) {
    this.lastError = error
    this.llmConnected = false
  }

  /**
   * Update LLM connection info
   */
  setLLMInfo(url, model, connected) {
    this.llmUrl = url
    this.llmModel = model
    this.llmConnected = connected
  }

  /**
   * Check if we can reach a URL (simple connectivity test)
   */
  async checkReachable(url) {
    try {
      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 3000)

      const start = Date.now()
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
      })
      clearTimeout(timeout)

      return {
        reachable: response.ok,
        latencyMs: Date.now() - start,
      }
    } catch (e) {
      return { reachable: false, latencyMs: 0 }
    }
  }

  async read() {
    // Check LLM reachability if not recently called
    let llmReachable = this.llmConnected
    let llmLatency = this.lastLatency

    if (!this.lastCallTime || Date.now() - this.lastCallTime > 60000) {
      // Haven't called in a minute, check connectivity
      try {
        const modelsUrl = `${this.llmUrl}/models`
        const check = await this.checkReachable(modelsUrl)
        llmReachable = check.reachable
        llmLatency = check.latencyMs
      } catch (e) {
        llmReachable = false
      }
    }

    return {
      llm: {
        connected: llmReachable,
        url: this.llmUrl,
        model: this.llmModel,
        latencyMs: llmLatency,
        lastCall: this.lastCallTime ? new Date(this.lastCallTime).toISOString() : null,
        callsThisSession: this.callsThisSession,
        tokensIn: this.tokensIn,
        tokensOut: this.tokensOut,
        error: this.lastError,
      },
    }
  }

  measureDeviation(reading) {
    let deviation = 0

    // Connection lost is very notable
    if (!reading.llm.connected) deviation += 0.8

    // High latency is notable
    if (reading.llm.latencyMs > 500) deviation += 0.3
    if (reading.llm.latencyMs > 1000) deviation += 0.2

    return Math.min(1, deviation)
  }

  getAnomalies(reading) {
    const anomalies = []

    if (!reading.llm.connected) {
      anomalies.push({
        sense: 'network',
        type: 'llm_disconnected',
        message: `LLM not reachable at ${reading.llm.url}`,
        salience: 0.9,
      })
    }

    if (reading.llm.error) {
      anomalies.push({
        sense: 'network',
        type: 'llm_error',
        message: `LLM error: ${reading.llm.error}`,
        salience: 0.8,
      })
    }

    if (reading.llm.latencyMs > 2000) {
      anomalies.push({
        sense: 'network',
        type: 'high_latency',
        message: `LLM latency ${reading.llm.latencyMs}ms`,
        salience: 0.6,
      })
    }

    return anomalies
  }

  formatForPrompt(senseData) {
    const r = senseData.reading
    if (!r) return 'Network: [unavailable]'

    const formatTokens = (n) => {
      if (n < 1000) return `${n}`
      if (n < 1000000) return `${(n / 1000).toFixed(1)}k`
      return `${(n / 1000000).toFixed(1)}M`
    }

    const llmStatus = r.llm.connected ? '✓' : '✗'
    const latency = r.llm.latencyMs > 0 ? `${r.llm.latencyMs}ms` : ''
    const calls = r.llm.callsThisSession
    const tokens = formatTokens(r.llm.tokensIn + r.llm.tokensOut)

    let result = `**Network**: LLM ${llmStatus}`
    if (latency) result += ` ${latency}`
    if (calls > 0) result += ` | ${calls} calls, ${tokens} tokens`

    return result
  }
}

module.exports = { NetworkSense }
