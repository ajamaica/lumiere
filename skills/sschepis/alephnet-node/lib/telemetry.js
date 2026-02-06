/**
 * Telemetry Module with Prometheus/OpenTelemetry Support
 *
 * Provides pluggable metrics collection and export:
 * - Prometheus exposition format
 * - OpenTelemetry metrics API compatibility
 * - Custom metric types (counter, gauge, histogram, summary)
 * - Automatic metric collection from profiler
 * - HTTP metrics endpoint
 */

const { EventEmitter } = require('events')
const http = require('http')

// ============================================================================
// METRIC TYPES
// ============================================================================

const MetricType = {
  COUNTER: 'counter',
  GAUGE: 'gauge',
  HISTOGRAM: 'histogram',
  SUMMARY: 'summary',
}

// ============================================================================
// BASE METRIC CLASS
// ============================================================================

/**
 * Base metric class
 */
class Metric {
  constructor(name, options = {}) {
    this.name = name
    this.help = options.help || ''
    this.labels = options.labels || []
    this.type = MetricType.COUNTER
    this.values = new Map() // labelKey -> value
  }

  /**
   * Get label key for a set of labels
   * @param {Object} labels - Label values
   * @returns {string}
   */
  getLabelKey(labels = {}) {
    if (this.labels.length === 0) return ''
    return this.labels.map((l) => labels[l] || '').join(',')
  }

  /**
   * Format labels for Prometheus exposition
   * @param {Object} labels - Label values
   * @returns {string}
   */
  formatLabels(labels = {}) {
    if (this.labels.length === 0) return ''
    const pairs = this.labels
      .filter((l) => labels[l] !== undefined)
      .map((l) => `${l}="${labels[l]}"`)
    return pairs.length > 0 ? `{${pairs.join(',')}}` : ''
  }

  /**
   * Export to Prometheus format
   * @returns {string}
   */
  toPrometheus() {
    throw new Error('toPrometheus must be implemented')
  }

  /**
   * Export to OpenTelemetry format
   * @returns {Object}
   */
  toOTLP() {
    throw new Error('toOTLP must be implemented')
  }

  /**
   * Reset metric
   */
  reset() {
    this.values.clear()
  }
}

// ============================================================================
// COUNTER
// ============================================================================

/**
 * Counter metric - monotonically increasing value
 */
class Counter extends Metric {
  constructor(name, options = {}) {
    super(name, options)
    this.type = MetricType.COUNTER
  }

  /**
   * Increment the counter
   * @param {number} value - Amount to increment (default 1)
   * @param {Object} labels - Label values
   */
  inc(value = 1, labels = {}) {
    if (value < 0) {
      throw new Error('Counter can only be incremented')
    }
    const key = this.getLabelKey(labels)
    const current = this.values.get(key) || { value: 0, labels }
    current.value += value
    this.values.set(key, current)
  }

  /**
   * Get current value
   * @param {Object} labels - Label values
   * @returns {number}
   */
  get(labels = {}) {
    const key = this.getLabelKey(labels)
    return (this.values.get(key) || { value: 0 }).value
  }

  toPrometheus() {
    const lines = []
    lines.push(`# HELP ${this.name} ${this.help}`)
    lines.push(`# TYPE ${this.name} counter`)

    for (const { value, labels } of this.values.values()) {
      const labelStr = this.formatLabels(labels)
      lines.push(`${this.name}${labelStr} ${value}`)
    }

    if (this.values.size === 0) {
      lines.push(`${this.name} 0`)
    }

    return lines.join('\n')
  }

  toOTLP() {
    const dataPoints = []
    for (const { value, labels } of this.values.values()) {
      dataPoints.push({
        attributes: Object.entries(labels).map(([k, v]) => ({
          key: k,
          value: { stringValue: String(v) },
        })),
        asInt: value,
        timeUnixNano: Date.now() * 1e6,
      })
    }

    return {
      name: this.name,
      description: this.help,
      sum: {
        dataPoints,
        aggregationTemporality: 2, // CUMULATIVE
        isMonotonic: true,
      },
    }
  }
}

// ============================================================================
// GAUGE
// ============================================================================

/**
 * Gauge metric - value that can go up and down
 */
class Gauge extends Metric {
  constructor(name, options = {}) {
    super(name, options)
    this.type = MetricType.GAUGE
  }

  /**
   * Set gauge value
   * @param {number} value - New value
   * @param {Object} labels - Label values
   */
  set(value, labels = {}) {
    const key = this.getLabelKey(labels)
    this.values.set(key, { value, labels })
  }

  /**
   * Increment gauge
   * @param {number} value - Amount to increment
   * @param {Object} labels - Label values
   */
  inc(value = 1, labels = {}) {
    const current = this.get(labels)
    this.set(current + value, labels)
  }

  /**
   * Decrement gauge
   * @param {number} value - Amount to decrement
   * @param {Object} labels - Label values
   */
  dec(value = 1, labels = {}) {
    const current = this.get(labels)
    this.set(current - value, labels)
  }

  /**
   * Get current value
   * @param {Object} labels - Label values
   * @returns {number}
   */
  get(labels = {}) {
    const key = this.getLabelKey(labels)
    return (this.values.get(key) || { value: 0 }).value
  }

  /**
   * Set to current time
   * @param {Object} labels - Label values
   */
  setToCurrentTime(labels = {}) {
    this.set(Date.now() / 1000, labels)
  }

  toPrometheus() {
    const lines = []
    lines.push(`# HELP ${this.name} ${this.help}`)
    lines.push(`# TYPE ${this.name} gauge`)

    for (const { value, labels } of this.values.values()) {
      const labelStr = this.formatLabels(labels)
      lines.push(`${this.name}${labelStr} ${value}`)
    }

    if (this.values.size === 0) {
      lines.push(`${this.name} 0`)
    }

    return lines.join('\n')
  }

  toOTLP() {
    const dataPoints = []
    for (const { value, labels } of this.values.values()) {
      dataPoints.push({
        attributes: Object.entries(labels).map(([k, v]) => ({
          key: k,
          value: { stringValue: String(v) },
        })),
        asDouble: value,
        timeUnixNano: Date.now() * 1e6,
      })
    }

    return {
      name: this.name,
      description: this.help,
      gauge: { dataPoints },
    }
  }
}

// ============================================================================
// HISTOGRAM
// ============================================================================

/**
 * Histogram metric - distribution of values in buckets
 */
class Histogram extends Metric {
  constructor(name, options = {}) {
    super(name, options)
    this.type = MetricType.HISTOGRAM
    this.buckets = options.buckets || [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]
    this.buckets.sort((a, b) => a - b)
  }

  /**
   * Observe a value
   * @param {number} value - Value to observe
   * @param {Object} labels - Label values
   */
  observe(value, labels = {}) {
    const key = this.getLabelKey(labels)
    let entry = this.values.get(key)

    if (!entry) {
      entry = {
        labels,
        sum: 0,
        count: 0,
        buckets: new Map(),
      }
      for (const bucket of this.buckets) {
        entry.buckets.set(bucket, 0)
      }
      entry.buckets.set(Infinity, 0)
      this.values.set(key, entry)
    }

    entry.sum += value
    entry.count++

    for (const bucket of this.buckets) {
      if (value <= bucket) {
        entry.buckets.set(bucket, entry.buckets.get(bucket) + 1)
      }
    }
    entry.buckets.set(Infinity, entry.buckets.get(Infinity) + 1)
  }

  /**
   * Time a function and observe duration
   * @param {Function} fn - Function to time
   * @param {Object} labels - Label values
   * @returns {*} Function result
   */
  time(fn, labels = {}) {
    const start = process.hrtime.bigint()
    try {
      return fn()
    } finally {
      const end = process.hrtime.bigint()
      const duration = Number(end - start) / 1e9 // Convert to seconds
      this.observe(duration, labels)
    }
  }

  /**
   * Time an async function
   * @param {Function} fn - Async function to time
   * @param {Object} labels - Label values
   * @returns {Promise<*>} Function result
   */
  async timeAsync(fn, labels = {}) {
    const start = process.hrtime.bigint()
    try {
      return await fn()
    } finally {
      const end = process.hrtime.bigint()
      const duration = Number(end - start) / 1e9
      this.observe(duration, labels)
    }
  }

  toPrometheus() {
    const lines = []
    lines.push(`# HELP ${this.name} ${this.help}`)
    lines.push(`# TYPE ${this.name} histogram`)

    for (const entry of this.values.values()) {
      const labelStr = this.formatLabels(entry.labels)
      const baseName = this.name

      // Bucket lines
      for (const bucket of this.buckets) {
        const bucketLabel = labelStr
          ? labelStr.slice(0, -1) + `,le="${bucket}"}`
          : `{le="${bucket}"}`
        lines.push(`${baseName}_bucket${bucketLabel} ${entry.buckets.get(bucket)}`)
      }

      // +Inf bucket
      const infLabel = labelStr ? labelStr.slice(0, -1) + `,le="+Inf"}` : `{le="+Inf"}`
      lines.push(`${baseName}_bucket${infLabel} ${entry.buckets.get(Infinity)}`)

      // Sum and count
      lines.push(`${baseName}_sum${labelStr} ${entry.sum}`)
      lines.push(`${baseName}_count${labelStr} ${entry.count}`)
    }

    return lines.join('\n')
  }

  toOTLP() {
    const dataPoints = []

    for (const entry of this.values.values()) {
      const bucketCounts = []
      let cumulative = 0

      for (const bucket of this.buckets) {
        cumulative += entry.buckets.get(bucket)
        bucketCounts.push(cumulative)
      }

      dataPoints.push({
        attributes: Object.entries(entry.labels).map(([k, v]) => ({
          key: k,
          value: { stringValue: String(v) },
        })),
        count: entry.count,
        sum: entry.sum,
        bucketCounts,
        explicitBounds: this.buckets,
        timeUnixNano: Date.now() * 1e6,
      })
    }

    return {
      name: this.name,
      description: this.help,
      histogram: {
        dataPoints,
        aggregationTemporality: 2, // CUMULATIVE
      },
    }
  }
}

// ============================================================================
// SUMMARY
// ============================================================================

/**
 * Summary metric - quantile distribution
 */
class Summary extends Metric {
  constructor(name, options = {}) {
    super(name, options)
    this.type = MetricType.SUMMARY
    this.quantiles = options.quantiles || [0.5, 0.9, 0.99]
    this.maxAge = options.maxAge || 600000 // 10 minutes
    this.ageBuckets = options.ageBuckets || 5
  }

  /**
   * Observe a value
   * @param {number} value - Value to observe
   * @param {Object} labels - Label values
   */
  observe(value, labels = {}) {
    const key = this.getLabelKey(labels)
    let entry = this.values.get(key)

    if (!entry) {
      entry = {
        labels,
        sum: 0,
        count: 0,
        samples: [],
      }
      this.values.set(key, entry)
    }

    entry.sum += value
    entry.count++
    entry.samples.push({ value, timestamp: Date.now() })

    // Age out old samples
    const cutoff = Date.now() - this.maxAge
    entry.samples = entry.samples.filter((s) => s.timestamp > cutoff)
  }

  /**
   * Calculate quantile value
   * @param {Array} samples - Sorted samples
   * @param {number} q - Quantile (0-1)
   * @returns {number}
   */
  calculateQuantile(samples, q) {
    if (samples.length === 0) return 0

    const sorted = samples.map((s) => s.value).sort((a, b) => a - b)
    const pos = q * (sorted.length - 1)
    const lower = Math.floor(pos)
    const upper = Math.ceil(pos)

    if (lower === upper) return sorted[lower]

    return sorted[lower] + (sorted[upper] - sorted[lower]) * (pos - lower)
  }

  toPrometheus() {
    const lines = []
    lines.push(`# HELP ${this.name} ${this.help}`)
    lines.push(`# TYPE ${this.name} summary`)

    for (const entry of this.values.values()) {
      const labelStr = this.formatLabels(entry.labels)

      // Quantile lines
      for (const q of this.quantiles) {
        const qValue = this.calculateQuantile(entry.samples, q)
        const qLabel = labelStr ? labelStr.slice(0, -1) + `,quantile="${q}"}` : `{quantile="${q}"}`
        lines.push(`${this.name}${qLabel} ${qValue}`)
      }

      // Sum and count
      lines.push(`${this.name}_sum${labelStr} ${entry.sum}`)
      lines.push(`${this.name}_count${labelStr} ${entry.count}`)
    }

    return lines.join('\n')
  }

  toOTLP() {
    const dataPoints = []

    for (const entry of this.values.values()) {
      const quantileValues = this.quantiles.map((q) => ({
        quantile: q,
        value: this.calculateQuantile(entry.samples, q),
      }))

      dataPoints.push({
        attributes: Object.entries(entry.labels).map(([k, v]) => ({
          key: k,
          value: { stringValue: String(v) },
        })),
        count: entry.count,
        sum: entry.sum,
        quantileValues,
        timeUnixNano: Date.now() * 1e6,
      })
    }

    return {
      name: this.name,
      description: this.help,
      summary: { dataPoints },
    }
  }
}

// ============================================================================
// METRIC REGISTRY
// ============================================================================

/**
 * MetricRegistry - manages all metrics
 */
class MetricRegistry extends EventEmitter {
  constructor(options = {}) {
    super()
    this.prefix = options.prefix || 'sentient_'
    this.metrics = new Map()
    this.defaultLabels = options.defaultLabels || {}
  }

  /**
   * Get prefixed metric name
   * @param {string} name - Metric name
   * @returns {string}
   */
  getFullName(name) {
    return this.prefix + name
  }

  /**
   * Create and register a counter
   * @param {string} name - Metric name
   * @param {Object} options - Metric options
   * @returns {Counter}
   */
  counter(name, options = {}) {
    const fullName = this.getFullName(name)
    if (this.metrics.has(fullName)) {
      return this.metrics.get(fullName)
    }

    const metric = new Counter(fullName, options)
    this.metrics.set(fullName, metric)
    return metric
  }

  /**
   * Create and register a gauge
   * @param {string} name - Metric name
   * @param {Object} options - Metric options
   * @returns {Gauge}
   */
  gauge(name, options = {}) {
    const fullName = this.getFullName(name)
    if (this.metrics.has(fullName)) {
      return this.metrics.get(fullName)
    }

    const metric = new Gauge(fullName, options)
    this.metrics.set(fullName, metric)
    return metric
  }

  /**
   * Create and register a histogram
   * @param {string} name - Metric name
   * @param {Object} options - Metric options
   * @returns {Histogram}
   */
  histogram(name, options = {}) {
    const fullName = this.getFullName(name)
    if (this.metrics.has(fullName)) {
      return this.metrics.get(fullName)
    }

    const metric = new Histogram(fullName, options)
    this.metrics.set(fullName, metric)
    return metric
  }

  /**
   * Create and register a summary
   * @param {string} name - Metric name
   * @param {Object} options - Metric options
   * @returns {Summary}
   */
  summary(name, options = {}) {
    const fullName = this.getFullName(name)
    if (this.metrics.has(fullName)) {
      return this.metrics.get(fullName)
    }

    const metric = new Summary(fullName, options)
    this.metrics.set(fullName, metric)
    return metric
  }

  /**
   * Get a metric by name
   * @param {string} name - Metric name
   * @returns {Metric}
   */
  get(name) {
    return this.metrics.get(this.getFullName(name))
  }

  /**
   * Remove a metric
   * @param {string} name - Metric name
   */
  remove(name) {
    this.metrics.delete(this.getFullName(name))
  }

  /**
   * Clear all metrics
   */
  clear() {
    this.metrics.clear()
  }

  /**
   * Export all metrics to Prometheus format
   * @returns {string}
   */
  toPrometheus() {
    const lines = []

    for (const metric of this.metrics.values()) {
      lines.push(metric.toPrometheus())
      lines.push('')
    }

    return lines.join('\n')
  }

  /**
   * Export all metrics to OpenTelemetry format
   * @returns {Object}
   */
  toOTLP() {
    const metrics = []

    for (const metric of this.metrics.values()) {
      metrics.push(metric.toOTLP())
    }

    return {
      resourceMetrics: [
        {
          resource: {
            attributes: Object.entries(this.defaultLabels).map(([k, v]) => ({
              key: k,
              value: { stringValue: String(v) },
            })),
          },
          scopeMetrics: [
            {
              scope: { name: 'sentient-observer' },
              metrics,
            },
          ],
        },
      ],
    }
  }

  /**
   * Get all metric names
   * @returns {Array<string>}
   */
  getMetricNames() {
    return Array.from(this.metrics.keys())
  }
}

// ============================================================================
// SENTIENT METRICS COLLECTOR
// ============================================================================

/**
 * SentientMetricsCollector
 *
 * Collects metrics from the Sentient Observer system.
 */
class SentientMetricsCollector {
  constructor(registry, options = {}) {
    this.registry = registry
    this.collectInterval = options.collectInterval || 5000
    this.timer = null

    // Register default metrics
    this.setupDefaultMetrics()
  }

  setupDefaultMetrics() {
    // Oscillator metrics
    this.ticksTotal = this.registry.counter('ticks_total', {
      help: 'Total number of oscillator ticks',
    })

    this.coherentTicksTotal = this.registry.counter('coherent_ticks_total', {
      help: 'Total number of coherent ticks',
    })

    this.tickDuration = this.registry.histogram('tick_duration_seconds', {
      help: 'Duration of tick cycles in seconds',
      buckets: [0.001, 0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1],
    })

    // SMF metrics
    this.coherence = this.registry.gauge('coherence', {
      help: 'Current coherence value',
    })

    this.entropy = this.registry.gauge('entropy', {
      help: 'Current entropy value',
    })

    this.temperature = this.registry.gauge('temperature', {
      help: 'Current thermal temperature',
    })

    this.orderParameter = this.registry.gauge('order_parameter', {
      help: 'Kuramoto order parameter',
    })

    // LLM metrics
    this.llmRequestsTotal = this.registry.counter('llm_requests_total', {
      help: 'Total LLM requests',
      labels: ['provider', 'status'],
    })

    this.llmRequestDuration = this.registry.histogram('llm_request_duration_seconds', {
      help: 'LLM request duration in seconds',
      labels: ['provider'],
      buckets: [0.1, 0.5, 1, 2, 5, 10, 30, 60],
    })

    this.llmTokensTotal = this.registry.counter('llm_tokens_total', {
      help: 'Total LLM tokens',
      labels: ['provider', 'type'],
    })

    // Memory metrics
    this.heapUsedBytes = this.registry.gauge('heap_used_bytes', {
      help: 'Node.js heap used in bytes',
    })

    this.heapTotalBytes = this.registry.gauge('heap_total_bytes', {
      help: 'Node.js heap total in bytes',
    })

    // Network metrics
    this.networkPeersConnected = this.registry.gauge('network_peers_connected', {
      help: 'Number of connected peers',
    })

    this.networkMessagesTotal = this.registry.counter('network_messages_total', {
      help: 'Total network messages',
      labels: ['direction', 'type'],
    })
  }

  /**
   * Update metrics from profiler
   * @param {Object} profiler - OscillatorProfiler instance
   */
  updateFromProfiler(profiler) {
    const report = profiler.getReport()

    // Update counters
    this.ticksTotal.inc(report.counters.ticks - (this._lastTicks || 0))
    this._lastTicks = report.counters.ticks

    this.coherentTicksTotal.inc(report.counters.coherentTicks - (this._lastCoherentTicks || 0))
    this._lastCoherentTicks = report.counters.coherentTicks

    // Update gauges
    this.coherence.set(report.gauges.coherence)
    this.entropy.set(report.gauges.entropy)
    this.temperature.set(report.gauges.temperature)
    this.orderParameter.set(report.gauges.orderParameter)
    this.heapUsedBytes.set(report.memory.heapUsed)
    this.heapTotalBytes.set(report.memory.heapTotal)
  }

  /**
   * Record an LLM request
   * @param {Object} info - Request info
   */
  recordLLMRequest(info) {
    const { provider, status, duration, promptTokens, completionTokens } = info

    this.llmRequestsTotal.inc(1, { provider, status })

    if (duration) {
      this.llmRequestDuration.observe(duration / 1000, { provider })
    }

    if (promptTokens) {
      this.llmTokensTotal.inc(promptTokens, { provider, type: 'prompt' })
    }

    if (completionTokens) {
      this.llmTokensTotal.inc(completionTokens, { provider, type: 'completion' })
    }
  }

  /**
   * Record a tick
   * @param {number} duration - Tick duration in ms
   */
  recordTick(duration) {
    this.ticksTotal.inc()
    this.tickDuration.observe(duration / 1000)
  }

  /**
   * Start automatic collection
   * @param {Object} profiler - OscillatorProfiler instance
   */
  startCollection(profiler) {
    this.timer = setInterval(() => {
      if (profiler) {
        this.updateFromProfiler(profiler)
      }
    }, this.collectInterval)
  }

  /**
   * Stop automatic collection
   */
  stopCollection() {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  }
}

// ============================================================================
// METRICS SERVER
// ============================================================================

/**
 * MetricsServer - HTTP server for exposing metrics
 */
class MetricsServer {
  constructor(registry, options = {}) {
    this.registry = registry
    this.port = options.port || 9090
    this.host = options.host || '0.0.0.0'
    this.path = options.path || '/metrics'
    this.server = null
  }

  /**
   * Start the metrics server
   * @returns {Promise<void>}
   */
  async start() {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        if (req.url === this.path && req.method === 'GET') {
          const accept = req.headers['accept'] || ''

          if (accept.includes('application/opentelemetry')) {
            // Return OTLP format
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify(this.registry.toOTLP()))
          } else {
            // Return Prometheus format
            res.writeHead(200, { 'Content-Type': 'text/plain; version=0.0.4' })
            res.end(this.registry.toPrometheus())
          }
        } else if (req.url === '/health') {
          res.writeHead(200)
          res.end('OK')
        } else {
          res.writeHead(404)
          res.end('Not Found')
        }
      })

      this.server.listen(this.port, this.host, () => {
        console.log(
          `[Telemetry] Metrics server listening on http://${this.host}:${this.port}${this.path}`,
        )
        resolve()
      })

      this.server.on('error', reject)
    })
  }

  /**
   * Stop the metrics server
   * @returns {Promise<void>}
   */
  async stop() {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(resolve)
        this.server = null
      } else {
        resolve()
      }
    })
  }
}

// ============================================================================
// GLOBAL INSTANCES
// ============================================================================

const globalRegistry = new MetricRegistry()
const globalCollector = new SentientMetricsCollector(globalRegistry)

// ============================================================================
// EXPORTS
// ============================================================================

module.exports = {
  // Metric types
  MetricType,

  // Metric classes
  Metric,
  Counter,
  Gauge,
  Histogram,
  Summary,

  // Registry
  MetricRegistry,

  // Collector
  SentientMetricsCollector,

  // Server
  MetricsServer,

  // Global instances
  globalRegistry,
  globalCollector,
}
